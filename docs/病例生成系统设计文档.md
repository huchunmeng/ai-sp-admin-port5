# 病例生成系统设计文档

> 版本: v2.0 | 日期: 2026-05-28 | 提示词版本: v0.6

---

## 一、系统总览

AI-SP 病例生成系统按模块化流水线设计，将一份完整病例拆分为 5 个生成模块 + 1 个前端组装模块，通过 AI API 调用 + 前端本地计算协同完成。

```
┌──────────────────────────────────────────────────────────┐
│                    CaseEditor.vue                        │
│                                                          │
│  Phase 0: basic    ──→  API 调用 (串行，上游依赖)         │
│  Phase 1: scoreSheet ─→  前端本地生成 (无API)             │
│  Phase 2: reception ─┐                                  │
│  Phase 2: analysis  ─├─→ 三路并发 API 调用 (依赖basic)    │
│  Phase 2: humanity  ─┘                                  │
│  Phase 3: meta     ──→  前端组装 (无API，静默)            │
└──────────────────────────────────────────────────────────┘
```

| Phase | 模块 | 执行方式 | 输入 | 输出文件 |
|-------|------|---------|------|---------|
| 0 | basic（基础信息） | API 串行 | 专业+病种+难度参数 | `{id}-basic.json` |
| 1 | scoreSheet（评分表） | **前端本地** | basic 数据 | 内嵌在 basic.json |
| 2 | reception（接诊剧本） | API 并发 | basic JSON + 专业配置 + 阶段参数 | `{id}-reception.json` |
| 2 | analysis（病例分析） | API 并发 | basic JSON + 难度分级 + 步骤映射 | `{id}-analysis.json` |
| 2 | humanity（人文沟通） | API 并发 | basic JSON + 专业场景映射 + 阶段参数 | `{id}-humanity.json` |
| 3 | meta（元信息） | **前端组装** | 所有前序模块输出 | 内嵌在 basic.json |

---

## 二、提示词体系设计

### 2.1 提示词文件组织

```
services/ai-generator/
├── package.json
├── src/
│   ├── index.js              ← 统一导出入口
│   ├── prompt-loader.js      ← 提示词加载 + 占位符填充引擎（350行）
│   └── llm-client.js         ← LLM API 调用 + JSON修复 + 重试（72行）
└── prompts/
    ├── 01-basic/
    │   ├── 0101-prompt.txt   ← 主提示词模板（~380行，最复杂）
    │   ├── 0102-config.json  ← 14专业 × 7阶段配置参数池（945行）
    │   └── examples/         ← 专业匹配示例JSON（按需加载）
    │       └── internal_medicine.json
    ├── 02-reception/
    │   └── 0201-prompt.txt   ← 接诊剧本提示词（~295行）
    ├── 03-analysis/
    │   └── 0301-prompt.txt   ← 病例分析提示词（~170行）
    ├── 04-humanity/
    │   └── 0401-prompt.txt   ← 人文沟通提示词（~280行）
    └── 05-meta/
        └── 0501-prompt.txt   ← 元数据提示词（~120行，参考用，meta已改为前端组装）
```

### 2.2 提示词设计原则

每个模块的提示词遵循统一结构：

```
[角色定位] → [任务目标] → [输入数据] → [生成规则] → [输出格式] → [示例参考] → [执行指令] → [系统配置约束]
```

**关键设计要点：**

1. **`{{mustache}}` 占位符注入**：所有动态参数（专业名、病种、难度、职业池、诱因池、阶段参数等）通过 `{{placeholder}}` 语法由 `prompt-loader.js` 在调用前填充，避免每次修改提示词主体。

2. **Schema 强制约束**：每个模块输出均有对应的 JSON 结构约束内嵌在提示词中，确保生成结果结构一致。

3. **Few-shot 示例库**（v0.6 新增）：`fillBasicPrompt` 自动从 `examples/` 目录按专业标识（configKey）加载匹配的示例 JSON，注入到提示词中作为参考。若无匹配示例，则跳过示例块。当前已创建 `internal_medicine.json` 作为模板。

4. **阶段差异化指令**（v0.6 核心升级）：每个模块的提示词按三个培训阶段提供完整差异化参数表：
   - **院校教育（U1/U2）**：面向医学生，场景/评分/对话数大幅精简
   - **住院医师（R1/R2/R3）**：面向住院医师，各子级逐渐升级鉴别/决策要求
   - **专科培训（F1/F2）**：面向专科医师，要求亚专科深度和独立决断

5. **系统配置约束节**（v0.6 新增）：每个提示词末尾有从 `0102-config.json` 动态注入的硬性数值范围（对话组数、场景数、心理阶段数等），与前置的阶段差异化指令表形成双保险。

### 2.3 各模块提示词详解

#### 模块 01 — 基础数据（basic）

**角色**：资深临床医学教育专家和病历撰写专家

**文件**：`0101-prompt.txt`（模板） + `0102-config.json`（配置）

**核心输出**：完整的标准化住院病历 JSON（含 46 个字段），包括：
- 人口学信息（patient_info、admission_info）
- 病史（chief_complaint、present_illness、past_history、personal_history、family_history）
- 查体/辅查（physical_exam、lab_tests、imaging）
- 诊断/治疗（diagnosis、treatment_plan）
- 评分表（score_sheet，50 项 × 7 大类）
- 专业扩展字段（extra_fields，如急诊的 triage_level）

**防同质化机制**：
- 姓名从年代常见名随机选取（`{{name_seed_hint}}`）
- 职业从专业匹配的职业池随机选取（`{{occupation_pool}}`）
- 诱因从诱因池随机选取（`{{trigger_pool}}`）
- 症状持续时间在允许范围内浮动（`{{time_fluctuation}}`）

**专业特殊规则**：31 个专业各有独立的查体模板和必填扩展字段，提示词中硬编码了各专业的生成约束（如急诊必须包含 arrival_mode/triage_level/GCS）。

**示例注入**：`fillBasicPrompt` 从 `examples/{configKey}.json` 加载专业匹配示例；若无匹配文件，整个示例块被移除。

#### 模块 02 — 接诊剧本（reception）

**角色**：住培结业考核命题专家

**文件**：`0201-prompt.txt`

**阶段差异化参数表**（v0.6 升级）：

```
院校教育（U1/U2）：
  对话组数: 20-35 | 评分项: 8-15/5-10 | 问诊: 聚焦主诉+现病史+基本既往史
  SP情绪: 平稳合作 | 沟通: 基础自我介绍+通俗语言
  查体卡片: 仅关键阳性体征+1-2个阴性体征

住院医师（R1/R2/R3）：
  对话组数: 40-60 | 评分项: 15-25/10-15 | 问诊: 全系统覆盖
  R2+: 不典型表现深入追问 | R3+: 危重症鉴别
  SP情绪: R2+焦虑/紧张 | 沟通: R2+鉴别解释, R3+危重症告知

专科培训（F1/F2）：
  对话组数: 40-60 | 评分项: 18-28/12-18 | 问诊: 亚专科深度+不典型鉴别
  F2: 不确定条件下临床推理 | SP情绪: 多层次递进
  沟通: F1=MDT协作, F2=循证决策+带教
```

**三层结构设计**：
```
基础层（所有专业通用）
  ├─ 标准问诊流程（主诉→现病史→既往史→个人史→家族史→系统回顾）
  ├─ 标准查体项目
  └─ 通用评分维度
      │
      ▼
专业层（specialty_config 注入）
  ├─ 内科：心肺听诊深度
  ├─ 外科：专科特殊检查（Murphy征、麦氏点压痛等）
  ├─ 精神科：精神检查替代躯体查体
  └─ ...（31个专业各有配置）
      │
      ▼
触发层（trigger_keywords 匹配）
  ├─ "癌" → 告知坏消息流程
  ├─ "移植" → 器官移植相关沟通
  └─ ...
```

**qa_script 键名强制规范**（v0.6 新增）：

```
✅ 唯一正确格式:
  {"doctor": "医生提问内容", "patient": "患者回答内容"}
  {"doctor": "医生提问内容", "patient": "患者回答内容", "note": "观察要点"}

❌ 严禁使用（AI常见漂移变体）:
  {"examiner": ..., "patient": ...}
  {"question": ..., "answer": ...}
  {"doctor": ..., "sp": ...}
  {"physician": ..., "examinee": ...}
```

**沟通对象推断**：`communication_target` 支持 `patient` / `family` 两种模式，由专业和场景自动决定（如儿科默认为 family）。

**信息点覆盖清单**（9 大类，必须全部覆盖）：
1. 开场：自我介绍 + 确认患者姓名 + 确认年龄
2. 主诉：开放式提问 → 逐项追问细节
3. 现病史：起病时间/诱因/主要症状细节/伴随症状/阴性症状/诊疗经过/一般情况
4. 既往史：慢性病/传染病/手术/外伤/输血/过敏
5. 个人史：吸烟/饮酒/职业/婚育/疫区/吸毒/性接触
6. 家族史：父母健康/遗传病史
7. 系统回顾：神经/呼吸/循环/消化/泌尿/血液
8. 预防接种史
9. 人文收尾：回应担忧/总结病情/说明下一步

#### 模块 03 — 病例分析（analysis）

**角色**：临床思维考站命题专家

**文件**：`0301-prompt.txt`

**阶段差异化参数表**（v0.6 升级）：

```
院校教育（U1/U2）：
  步骤: U1=2步, U2=3步 | 评分粒度: 粗(5-10分/项)
  参考答案: 要点形式 | supplementary: U1较详细引导, U2适度减少
  考核: 典型表现识别(U1), 初步鉴别(U2)

住院医师（R1/R2/R3）：
  步骤: R1=3步, R2=4步, R3=5步 | 评分粒度: 中(3-5分/项)
  参考答案: 完整段落, R2+逐条推理, R3+多方案比较
  supplementary: R1基本线索, R2减少提示, R3仅提供检查数据
  考核: R1=诊断依据+基础治疗, R2=系统鉴别+检查策略, R3=病情演变+复杂决策

专科培训（F1/F2）：
  步骤: F1=5步, F2=6步 | 评分粒度: 细(2-3分/项)
  参考答案: 深度段落, F1=MDT视角, F2=循证+文献支撑
  supplementary: F1仅关键检查, F2无额外提示
  考核: F1=疑难诊治+MDT, F2=不确定条件下独立决断+带教
```

**分步递呈设计**：模拟真实临床诊疗时序，每步包含：
```
呈现信息 → 问题 → 参考答案 → 评分标准
```

**步骤数与难度映射**：
| 难度 | 步骤数 | 递呈内容 |
|------|--------|---------|
| U1 | 2步 | 诊断+鉴别 → 治疗 |
| U2 | 3步 | 诊断+鉴别 → 诊断依据+辅查判读 → 治疗 |
| R1 | 3步 | 同U2，问题深度提升 |
| R2 | 4步 | + 进一步检查策略 |
| R3 | 5步 | + 病情变化应对 |
| F1 | 5步 | 同R3，亚专科深度 |
| F2 | 6步 | + 不确定条件决策 |

**双版本输出**：
- `examiner_version`：考官版，含完整参考答案 + 评分标准 + supplementary_info
- `candidate_version`：考生版，仅含呈现信息 + 问题

#### 模块 04 — 人文沟通（humanity）

**角色**：人文沟通考站命题专家

**文件**：`0401-prompt.txt`

**阶段差异化参数表**（v0.6 升级）：

```
院校教育（U1/U2）：
  场景: U1=1-2个, U2=1-2个 | 心理阶段: 1-2个 | 轮次: 6-12轮
  SP提问: 1-2个(基础, 无质疑) | 考核: 同理心+通俗语言+礼貌
  SP情绪: 平稳合作

住院医师（R1/R2/R3）：
  场景: 2-3个 | 心理阶段: 2-3个 | 轮次: 10-16轮
  SP提问: 2-4个(R2+≥1个质疑/压力) | 考核: 共情+复杂信息表达+风险沟通+共识达成
  SP情绪: R2+焦虑/恐惧/否认递进

专科培训（F1/F2）：
  场景: 2-4个 | 心理阶段: 3-4个 | 轮次: 12-20轮
  SP提问: 3-5个(≥1个强烈质疑, F2=≥2次情绪转折)
  考核: 不确定沟通+循证决策告知+MDT协作+带教
  SP情绪: 多层级递进(否认→愤怒→恐惧→接受)
```

**三层场景模型**：
```
第一层：通用基础场景（按需选用）
  B01 接诊开场与信任建立
  B02 病情初步解释
  B03 诊断告知（简化版）
  B04 下一步计划说明

第二层：专业特色场景（1-2个，由 specialty 决定）
  内科 → S-IM-01 慢病管理 / S-IM-02 恶性肿瘤告知
  外科 → S-SG-01 术前谈话 + S-SG-02 术后交代
  急诊 → S-EM-01 紧急病情告知
  儿科 → S-PD-01/02 向家长交代
  ...（16种专业场景映射）

第三层：触发专项场景（关键词匹配，12个触发规则）
  T01 恶性肿瘤完整告知（诊断含"癌/肉瘤/白血病"）
  T03 临终沟通（诊断含"终末期/安宁疗护"）
  T10 传染病报告与隐私告知（诊断含"结核/HIV"）
  T11 用药依从性沟通（病史含"停药/依从性差"）
  ...（共12条触发规则）
```

**场景去重规则**（v0.6 强化）：
1. 专业场景/触发场景已覆盖的信息 → 跳过相应基础场景
2. 触发场景优先级 > 专业场景 > 基础场景
3. 场景按 `core` / `recommended` / `optional` 标注优先级
4. core 场景必须最详尽（心理递进完整、对话轮次最多）

**每个场景含三部分**：
- **SP 材料**（sp_materials）：角色描述 + 开场白 + 心理阶段数组 + 对话脚本
- **考官材料**（examiner_materials）：临床上下文 + qa_pairs + 追问提示 + 评分表
- **考生材料**（candidate_materials）：临床情景 + 任务 + 参考资料 + 时间限制

**评分维度聚焦**（沟通能力，不考医学知识）：
| 维度 | 分值 | 说明 |
|------|------|------|
| 共情与情绪回应 | 20-30分 | 识别并回应情绪、表达理解与支持 |
| 信息组织与通俗表达 | 20-30分 | 复杂信息通俗化、逻辑清晰 |
| 共识达成与决策引导 | 15-25分 | 引导患者参与决策、达成共识 |
| 语言与非语言沟通 | 10-15分 | 语言得体、肢体语言恰当 |
| 整体结构完整性 | 10-15分 | 开场-主体-收尾完整 |

#### 模块 05 — 元数据（meta）

**状态**：已改为前端组装（v0.5），不再调用 AI API。`0501-prompt.txt` 和 `fillMetaPrompt` 保留为参考。

**Meta 结构**：
```json
{
  "case_id": "...",
  "version": "v1.0",
  "pre_generation": { "specialty", "disease", "difficulty", "training_phase" },
  "generation_trace": { "basic_info", "encounter", "case_analysis", "communication" },
  "ai_services": {
    "ai_sp": { "sp_play_rules", "physical_exam_result_templates" },
    "ai_scoring": { "ai_scoring_rules", "diagnosis_scoring_rules" }
  },
  "review": { "status", "reviewed_by", "reviewed_at", "comments" },
  "deployment": { "is_published", "published_at" },
  "key_timeline": [...]
}
```

---

## 三、数据流转与模块间关联

### 3.1 数据依赖图

```
                    ┌─────────────┐
                    │  病例参数    │
                    │ (专业/病种/   │
                    │  难度/阶段)  │
                    └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐
                    │   Phase 0   │
                    │   basic    │ ← API 调用（串行）
                    │            │ ← 注入: 专业示例JSON + 防同质化参数
                    └──┬──┬──┬───┘
                       │  │  │
          ┌────────────┘  │  └────────────┐
          ▼               ▼               ▼
   ┌──────────┐   ┌──────────┐    ┌──────────┐
   │reception │   │ analysis │    │ humanity │  ← 三路并发 API
   │(接诊剧本) │   │(病例分析) │    │(人文沟通) │
   │          │   │          │    │          │
   │注入:     │   │注入:     │    │注入:     │
   │qa范围    │   │步骤数    │    │场景范围   │
   │SP情绪    │   │培训阶段  │    │心理阶段   │
   │评分范围  │   │          │    │轮次/提问  │
   └────┬─────┘   └────┬─────┘    └────┬─────┘
        │               │               │
        └───────────────┼───────────────┘
                        │
                        ▼
                 ┌─────────────┐
                 │    meta     │  ← 前端组装
                 │  (元信息)    │     无API调用
                 └─────────────┘
```

### 3.2 跨模块字段关联

basic 模块的 `specialty` 使用中文（如"急诊科"），reception/analysis/humanity 模块使用英文标识（如 `emergency_medicine`）。`prompt-loader.js` 中维护完整的中英文对照表（32 专业 × 2 套映射），由 AI 在生成时自动转换。

### 3.3 文件存储约定

生成的 4 个文件存储在 `apps/admin/public/data/cases/`：
```
{case_id}-basic.json       ← 含 score_sheet + meta 字段
{case_id}-reception.json
{case_id}-analysis.json
{case_id}-humanity.json
```

前端加载时通过 `case_id` 前缀匹配读取所有关联文件（`shared.js:loadCaseDataFromFiles`）。

---

## 四、前端组装优化（2026-05-27）

### 4.1 动机

原有架构将 scoreSheet 和 meta 也作为独立的 AI API 调用步骤，存在两个问题：
1. **成本浪费**：scoreSheet 每次额外消耗约 3000 tokens，meta 约 14000 tokens
2. **不稳定性**：AI 生成的评分表 key_point 经常与病例实际内容脱节

### 4.2 改造方案

| 步骤 | 原方案 | 新方案 |
|------|--------|--------|
| scoreSheet | API 生成 50 项评分 | 前端 `generateV1ScoreSheet(basicData)` 从 25 项固定模板 + 病例数据填充 |
| meta | API 汇总全部前序输出 | 前端 `buildMetaInfo(basicData, previousResults)` 从其他模块提取数据 |

**Token 节省**：单次生成从 ~53,000 tokens 降至 ~39,000 tokens（约节省 26%）。

### 4.3 前端生成器架构

```
score-sheet-generator.js (726行)
├── 评分表生成
│   ├── HISTORY_SHEET_TEMPLATE   ← 25项固定模板（7大类/100分）
│   ├── generateV1ScoreSheet()    ← 模板 + enrichKeyPoint(病例数据)
│   └── enrichKeyPoint()          ← 为4个病例关联项追加【病例】标注
│
├── 2.0 架构（预留）
│   ├── extractScoringPoints()    ← 从 basic 提取评分点（6领域）
│   ├── mapPointsToStations()     ← 按考站方案分配评分点
│   └── normalizeScores()         ← 分数归一化
│
└── 元信息组装
    ├── buildMetaInfo()           ← 主入口
    ├── extractSPKnows()          ← SP 认知边界推断
    ├── extractSPEmotion()        ← 情绪递进提取
    ├── extractHistoryRules()     ← 问诊评分规则（含关键词推断）
    ├── extractPhysicalRules()    ← 查体评分规则
    ├── extractCommunicationRules() ← 沟通评分规则
    ├── extractDiagnosisRules()   ← 诊断评分规则
    └── extractPETemplates()      ← 查体模板（两层回退）
```

### 4.4 Meta 结构

```json
{
  "case_id": "...",
  "version": "v1.0",
  "pre_generation": { "specialty", "disease", "difficulty", "training_phase" },
  "generation_trace": { "basic_info", "encounter", "case_analysis", "communication" },
  "ai_services": {
    "ai_sp": {
      "sp_play_rules": { "knowledge_boundary", "emotion_progression", "vague_response_templates", "refuse_to_answer" },
      "physical_exam_result_templates": [...]
    },
    "ai_scoring": {
      "ai_scoring_rules": { "history_rules", "physical_rules", "communication_rules", "deduction_rules" },
      "diagnosis_scoring_rules": { "primary_diagnosis", "diagnosis_basis", "differential_diagnosis" }
    }
  },
  "review": { "status", "reviewed_by", "reviewed_at", "comments" },
  "deployment": { "is_published", "published_at" },
  "key_timeline": [...]
}
```

---

## 五、评分表体系

### 5.1 v1.0 评分表（线上在用）

**固定模板结构**（25 项，100 分，7 大类）：

| 类别 | 项数 | 分值 | 示例项 |
|------|------|------|--------|
| 一般项目 | 2 | 10 | 自我介绍、建立信任关系 |
| 现病史 | 11 | 55 | 主诉起病、诱因、主要症状(3子项)、症状特点、伴随症状(2子项)、诊疗经过、一般状况 |
| 既往史 | 4 | 10 | 躯体疾病史、精神疾病史、过敏用药史、手术外伤输血史 |
| 个人史 | 1 | 5 | 吸烟饮酒婚育职业 |
| 家族史 | 1 | 5 | 家族遗传病史 |
| 问诊技巧 | 3 | 15 | 条理逻辑、语言恰当、人文关怀 |
| 医患沟通 | 3 | 15 | 态度专业、总结反馈、耐心答疑 |

**数据格式**：
```json
{
  "id": 1,
  "category": "一般项目",
  "item": "检查者自我介绍",
  "group_score": 5,
  "key_point": "自我介绍完整规范",
  "score": 2,
  "rules": "完整介绍姓名 (1.0 分)+ 职务 / 职责 (1.0 分)"
}
```

**UI 展示**：ScoreSheet.vue 中 category 和 item 列相同值自动合并单元格（rowspan），支持在线编辑 key_point/score/rules。

### 5.2 v2.0 考站评分（设计中）

与 1.0 的差异：
- 1.0 → 问诊评分表，病例属性，AI 生成
- 2.0 → 考站评分表，考站配置中上传文件 + 病例评分点提取

待考站配置有数据后接上。

---

## 六、难度体系（七级）

| 代码 | 阶段 | 目标学员 | 病例特征 | 接诊对话 | 分析步数 | 沟通场景 |
|------|------|---------|---------|---------|---------|---------|
| U1 | 见习 | 本科医学生 | 单一系统典型表现，无鉴别 | 20-30组 | 2步 | 1-2个 |
| U2 | 实习 | 本科医学生 | 高频病种，1个鉴别 | 25-35组 | 3步 | 1-2个 |
| R1 | 住培一年级 | 住院医师 | 常见病，1-2个鉴别 | 40-50组 | 3步 | 2-3个 |
| R2 | 住培二年级 | 住院医师 | 可不典型/合并症，2-3鉴别 | 45-55组 | 4步 | 2-3个 |
| R3 | 住培三年级 | 住院医师 | 多系统/危重症/罕见病 | 45-60组 | 5步 | 2-3个 |
| F1 | 专培进阶 | 专科医师 | 亚专科疑难病，MDT | 45-60组 | 5步 | 2-4个 |
| F2 | 独立专家 | 专科医师 | 诊断不明/治疗矛盾 | 50-60组 | 6步 | 2-4个 |

**占位符约定**：
- `{{difficulty}}` → 七级值（U1/R1等）
- `{{training_phase}}` → 阶段名称（本科教学/住院医师/专科培训）
- `{{qa_script_count_range}}` → 接诊对话组数范围（从 config 动态注入）
- `{{scene_count_range}}` → 沟通场景数范围（从 config 动态注入）
- `{{psychological_stages_range}}` → 心理阶段数范围（从 config 动态注入）
- `{{steps_count}}` → 分析步骤数（从 stepsMap 计算）

旧三档（低/中/高/L1/L2/L3）已全系统移除。

---

## 七、prompt-loader.js 引擎

### 7.1 架构

```
prompt-loader.js (350行)
├── 配置层
│   ├── PROMPT_MAP          ← 5模块文件路径映射
│   ├── loadConfig()         ← 0102-config.json 缓存加载
│   └── loadPrompt(name)     ← 提示词模板缓存加载
│
├── 数据映射层
│   ├── CN_TO_CONFIG_KEY     ← 中文专业→config键名（32条）
│   ├── CN_TO_EN             ← 中文专业→英文标识（32条）
│   ├── SPECIALTY_ABBR       ← 中文专业→缩写（32条）
│   └── LEVEL_TO_PHASE       ← 难度→阶段名称（7条）
│
├── 阶段配置引擎
│   └── getPhaseConfig()     ← 合并 specialty_config + _phase_configs
│       返回 12 个参数（v0.6 从 8 个扩展到 12 个）
│
├── 填充函数
│   ├── fillBasicPrompt()    ← 基础信息填充 + 示例JSON加载
│   ├── fillReceptionPrompt() ← 接诊剧本填充 + 阶段参数注入
│   ├── fillAnalysisPrompt()  ← 病例分析填充 + 步骤数映射
│   ├── fillHumanityPrompt()  ← 人文沟通填充 + 阶段参数注入
│   └── fillMetaPrompt()     ← 元数据填充（参考用）
│
└── 优化函数
    ├── fillOptimizePrompt()  ← 模块内容优化提示词生成
    └── generateCaseId()      ← 病例ID生成
```

### 7.2 getPhaseConfig 返回参数（v0.6 完整列表）

| 参数 | 类型 | 优先级链 | 用途 |
|------|------|---------|------|
| `station_duration` | number | specConfig > phaseConfig > 15 | 考站时长（分钟） |
| `task_requirements` | string | specConfig > phaseConfig > 默认值 | 考生任务描述 |
| `physical_exam_focus` | string | specConfig > '' | 查体侧重点 |
| `history_item_count_range` | [min, max] | phaseConfig > specConfig > [15,25] | 问诊评分项数 |
| `exam_item_count_range` | [min, max] | phaseConfig > specConfig > [10,15] | 查体评分项数 |
| `communication_focus` | string | specConfig > phaseConfig > '' | 沟通能力聚焦 |
| `sp_role` | string | specConfig > 'patient' | SP扮演角色（patient/family） |
| `qa_script_count_range` | [min, max] | phaseConfig > [20,60] | 接诊对话组数（v0.6新增） |
| `scene_count_range` | [min, max] | phaseConfig > [1,4] | 沟通场景数（v0.6新增） |
| `psychological_stages_range` | [min, max] | phaseConfig > [1,4] | 心理递进阶段数（v0.6新增） |
| `dialogue_turns_range` | [min, max] | phaseConfig > [6,20] | 每场景对话轮次（v0.6新增） |
| `sp_emotion_complexity` | string | phaseConfig > '' | SP情绪复杂度描述（v0.6新增） |
| `sp_initiative_questions_range` | [min, max] | phaseConfig > [1,5] | SP主动提问数（v0.6新增） |

### 7.3 示例 JSON 加载机制（v0.6 新增）

```javascript
// fillBasicPrompt 中的逻辑
const exampleDir = path.join(PROMPTS_DIR, '01-basic', 'examples')
const exampleFile = path.join(exampleDir, `${configKey}.json`)
try {
  const exampleContent = fs.readFileSync(exampleFile, 'utf-8')
  JSON.parse(exampleContent) // 校验JSON有效性
  // 注入示例到提示词
} catch (_) {
  // 该专业暂无示例文件 → 移除示例块
}
```

示例文件按 `{configKey}.json` 命名（如 `internal_medicine.json`、`surgery.json`），放在 `prompts/01-basic/examples/` 目录下。当前已创建 `internal_medicine.json`（内科/高血压/R1），其他专业可后续补充。

---

## 八、llm-client.js 引擎

```
llm-client.js (72行)
├── repairJSON()      ← JSON修复（去除markdown标记、补全括号、去除尾逗号）
├── callLLMOnce()     ← 单次API调用（180s超时、Bearer认证、temperature=0.7）
└── callLLM()         ← 带重试的主入口（最多retry 2次，失败时将错误注入prompt重试）
```

**API 调用参数**：
- `model`: 由 CaseEditor.vue 传入（当前 deepseek-v4-pro）
- `temperature`: 0.7
- `max_tokens`: 64000
- `system`: "你是一名资深临床医学教育专家。请严格按照要求输出JSON，不要包含任何解释性文字或Markdown标记。"

---

## 九、Token 用量

| 模块 | 输入 tokens | 输出 tokens | 小计 |
|------|------------|------------|------|
| basic | ~12,000 | ~1,500 | ~13,500 |
| **scoreSheet** | **0** | **0** | **0 (前端)** |
| reception | ~5,000 | ~2,000 | ~7,000 |
| analysis | ~5,500 | ~3,000 | ~8,500 |
| humanity | ~6,500 | ~3,500 | ~10,000 |
| **meta** | **0** | **0** | **0 (前端)** |
| **合计** | **~29,000** | **~10,000** | **~39,000** |

> 按 DeepSeek v4 Pro 计费，单次全套生成约 ¥0.08 ~ ¥0.12。

---

## 十、版本变更记录

### v0.6 (2026-05-28) — 提示词阶段差异化升级

**核心变更**：

| 类别 | 变更 | 涉及文件 |
|------|------|---------|
| Reception 阶段化 | 三段完整指令表（U/住院/专培）替代 3 行简要描述 | `0201-prompt.txt` |
| Humanity 阶段化 | 三段完整指令表 + 质量要求数值阶段化 + 场景去重强化 | `0401-prompt.txt` |
| Analysis 阶段化 | 角色描述替换为三段指令表，覆盖深度/步骤/评分/参考策略 | `0301-prompt.txt` |
| Config 参数扩展 | 七级各新增 6 个阶段参数字段（qa_script/scene/psychological/dialogue/sp_emotion/sp_initiative） | `0102-config.json` |
| Config 代码接驳 | `getPhaseConfig` 返回 12 参数（原 8 个）；`fillReceptionPrompt`/`fillHumanityPrompt` 注入新变量 | `prompt-loader.js` |
| 系统配置约束节 | 提示词末尾添加动态注入的数值范围（双保险） | `0201-prompt.txt`, `0401-prompt.txt` |
| 键名强制规范 | qa_script 键名唯一约束 + 禁止变体列表 | `0201-prompt.txt` |
| Example JSON 机制 | `fillBasicPrompt` 按专业加载示例；创建 `internal_medicine.json` | `prompt-loader.js`, `examples/` |
| `{{uploaded_document}}` 泄漏修复 | 参数生成模式下填入默认值 | `prompt-loader.js` |

### v0.5 (2026-05-27) — scoreSheet + meta 前端化

- scoreSheet 从 API 调用改为前端模板生成（节省 ~3000 tokens/次）
- meta 从 API 调用改为前端组装（节省 ~14000 tokens/次）
- 提示词文件从设计文档目录迁移到 `services/ai-generator/prompts/`
- 创建 `prompt-loader.js`（占位符填充引擎）
- 创建 `llm-client.js`（LLM API 封装 + JSON 修复）
- 旧三档难度体系（L1/L2/L3）全系统移除，统一为七级体系

### v0.4 — 初版提示词体系

- 5 模块提示词初版完成
- 0102-config.json 14 专业配置
- 分步递呈设计（analysis）
- 三层场景模型（humanity）

---

## 十一、当前待完善项

| 优先级 | 问题 | 说明 |
|--------|------|------|
| 中 | 补充更多专业示例 JSON | 当前仅有 `internal_medicine.json`，其他 30 个专业可陆续补充 |
| 中 | `fillOptimizePrompt` 接入阶段参数 | 优化提示词目前仅有通用的 OPTIMIZE_RULES，未注入阶段差异化数值 |
| 低 | 全流程端到端测试 | 七个难度各跑一遍真实 API 生成流程，检查医学一致性和 JSON 合规性 |
| 低 | Analysis 提示词也接入 config 参数 | 当前 analysis 未使用 `getPhaseConfig`，步骤数之外无阶段参数注入 |
| 低 | Meta 模块 `0501-prompt.txt` 标记为废弃 | meta 已改为前端组装，提示词文件可保留为参考文档但应加注释说明 |
