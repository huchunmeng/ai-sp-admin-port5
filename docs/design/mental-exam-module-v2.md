# 精神检查功能模块 — 完整设计方案

> 版本: v2.0 | 日期: 2026-07-09 | 状态: Phase 1 已完成

---

## 背景

精神检查(MSE)是精神科考核的核心环节。与病史采集不同，精神检查的 SP 是**患者本人**且行为由疾病驱动——思维散漫、妄想、幻觉、情感平淡等病理特征天然违背标准 SP 的"问什么答什么"规则。

前一版设计(v1.0, 2026-06-11)已完成架构设计但暂停实施，原因是：
1. 精神科病例生成受阻（AI 对精神科不熟练）
2. 用户决定先聚焦测试

### Phase 1 完成后当前现状

| 已完成 | 待实施 |
|--------|--------|
| 共享常量 `mentalExam` 全量注册 + STATION_TO_SESSION_KEY | MSEPanel.vue 维度追踪面板 |
| 评分分析器 L1-L5 剖面已完成 | 情绪引擎 B类SP 适配 |
| SP-API 评分表模板映射 + mental-exam 模式处理 | 病例编辑器 `atypical_dialogue` Tab |
| B类SP提示词 `0602-sp-atypical.txt` | app-training/exam 端支持 |
| `MentalExam.vue` 精神检查对话页面 | BUILTIN_STATIONS 精神检查站 |
| 训练端路由 + 考站流程映射 + StationLoading预配置 | |

---

## 总体策略：四阶段渐进实施

```
Phase 1 (核心MVP) ✅  → 训练端对话功能跑通（无MSE面板，无B类情绪引擎）
Phase 2 (MSE面板)     → 维度追踪面板 + 覆盖可视化
Phase 3 (B类情绪)     → 情绪引擎适配 + B类SP行为规则生效
Phase 4 (完善)        → 三端补齐 + 病例编辑器 + BUILTIN_STATIONS
```

**关键决策**：Phase 1 先复用现有的标准 SP 对话体系（0601 提示词 + 基础情绪引擎），让精神检查对话能跑起来。B类SP行为规则在 Phase 3 才接入。这样可以快速验证整个数据通道。

---

## Phase 1: 核心 MVP ✅（已完成）

### 1.1 B类SP 提示词

**文件**: `services/ai-generator/prompts/06-aisp/0602-sp-atypical.txt`

提示词采用**参数化模板**——疾病类型参数在 configure 时由 prompt-builder.js 注入，同一份提示词服务于分裂症/躁狂/抑郁三种类型。

与 0601 的差异：
- **删除**："问什么答什么"、"单一信息原则"、"被攻击后生气" → 替换为疾病驱动的回答模式
- **新增**：离题概率/语量系数/妄想系统/幻觉干扰/情感平淡/自知力规则
- **保留**：禁止病历文书腔、禁止承认是AI、禁止说出诊断、听不懂医学黑话

模板变量（由 prompt-builder.js 注入）：`{{tangentiality}}` `{{verbosity}}` `{{affective_blunting}}` `{{irritability}}` `{{delusional_core_belief}}` `{{delusional_triggers}}` `{{hallucination_type}}` `{{hallucination_interference}}` `{{insight_level}}`

### 1.2 MentalExam.vue 页面

**文件**: `apps/training/src/views/mental-exam/MentalExam.vue`

以 `HistoryTaking.vue`（772行）为模板复制改造，而非通过 props 复用。理由：
- 差异点足够多（TopBar标题、对话配置参数、syncMessagesToSession key、endStage 逻辑、MSE面板插槽）
- HistoryTaking.vue 本身已有大量业务逻辑耦合，强行通过 props 区分代价更高

关键差异：
- TopBar `station-name`: `"接诊病人站 · 精神检查"`
- `aisp.configure()`: `mode: 'mental-exam'`，传入 `atypicalConfig`
- `syncMessagesToSession()`: 写 `mentalExam` key
- `endStage()`: stationId 写 `mentalExam`
- `communicationTarget` 固定为 `patient`（精神检查必须是患者本人）
- SP 不主动说话，等待学生开口（不同于病史采集的开场白）

### 1.3 路由注册

**文件**: `apps/training/src/router/index.js`
```js
{ path: 'mental-exam', name: 'mentalExam', component: () => import('@/views/mental-exam/MentalExam.vue') }
```

### 1.4 考站流程映射

**文件**: `apps/training/src/composables/useStationFlow.js`
```js
// STATION_ROUTE_MAP
'精神检查站': { route: 'mentalExam', label: '精神检查' },
// PROJECT_ROUTE_MAP
'精神检查': { route: 'mentalExam' },
```

### 1.5 共享常量

**文件**: `packages/shared/src/station-constants.js` — `STATION_TO_SESSION_KEY` 新增：
```js
mentalExam: 'mentalExam',
```

### 1.6 StationSelect / StationLoading

**文件**: `apps/training/src/views/StationSelect.vue` — 精神检查站直接跳转 `stationLoading`（无需场景选择弹窗）

**文件**: `apps/training/src/views/StationLoading.vue` — 预配置增加 `mentalExam` 分支：
- 从 `meta.atypical_dialogue` 提取精神状态描述构建 symptomPool
- `mode: 'mental-exam'` + `atypicalConfig` 传给后端

### 1.7 SP-API 后端

**文件**: `services/sp-api/src/index.js` — configure 路由：
- `mode === 'mental-exam'` → 强制 `role: 'patient'`
- 从文件系统读取 `meta.json` 中的 `atypical_dialogue` 注入 `finalConfig.atypicalConfig`

**文件**: `services/sp-api/src/prompt-builder.js`：
- `config.mode === 'mental-exam'` → 加载 `0602-sp-atypical.txt`
- 注入所有 B类参数模板变量，非精神检查模式用默认值填充

---

## Phase 2: MSE 维度追踪面板（待实施）

### 2.1 创建 MSEPanel.vue

**新文件**: `apps/training/src/views/mental-exam/MSEPanel.vue`

7维度覆盖状态展示：
- 一般表现（Appearance & Behavior）
- 言语（Speech）
- 思维（Thought）— 形式 + 内容
- 情感（Affect/Mood）
- 感知觉（Perception）
- 认知（Cognition）
- 自知力（Insight）

每个维度显示：状态图标（✅/⬜）、已识别标签、实时覆盖率百分比。

数据来源：sp-api 每轮返回的 `mse_coverage` 字段。

### 2.2 MentalExam.vue 集成

在 FloatInfoPanel 右侧增加 MSEPanel：
```html
<MSEPanel :coverage="mseCoverage" :lang="lang" />
```

### 2.3 SP-API MSE 追踪

**修改文件**: `services/sp-api/src/index.js` — `processMessage`

每轮对话后利用 LLM 判断学生提问覆盖了哪些 MSE 维度：
```json
{
  "mse_coverage": {
    "appearance": { "covered": true, "tags": ["接触被动"] },
    "speech": { "covered": true, "tags": ["语速慢"] },
    "thought_form": { "covered": false, "tags": [] },
    "thought_content": { "covered": true, "tags": ["被害妄想"] },
    "affect": { "covered": false, "tags": [] },
    "perception": { "covered": false, "tags": [] },
    "cognition": { "covered": false, "tags": [] },
    "insight": { "covered": true, "tags": ["自知力缺失"] }
  }
}
```

---

## Phase 3: B类SP情绪引擎（待实施）

### 3.1 情绪引擎 B类适配

**修改文件**: `services/sp-api/src/index.js` — 情绪引擎/状态机部分

核心差异（来自 v1.0 设计文档）：
- **情感平淡**（affective_blunting）：所有情绪响应幅度 × (1 - 系数)
- **妄想触碰**：fearful↑↑ + angry↑（恐惧驱动防御，非标准愤怒）
- **易激惹**（mania）：anger 快速上升 + 快速回落
- **终止机制**：标准终止阈值不适用 → B类专用终止（完全缄默 / 妄想激化）

### 3.2 0602 提示词精调

基于实际测试结果迭代 B类SP行为规则的参数权重。

---

## Phase 4: 完善（待实施）

### 4.1 病例编辑器

**修改文件**: `apps/admin/src/views/case-editor/CaseEditor.vue` + **新建** `MentalExamEditor.vue`

- 新增 "精神检查" Tab
- 编辑器内容：`atypical_dialogue` 所有字段的 GUI 编辑
- 包括：行为参数滑块（tangentiality/verbosity/affective_blunting/irritability/hallucination_interference）、妄想系统配置、幻觉特征配置、MSE各维度状态

### 4.2 考试端 + App训练端

- 考试端 `Dialogue.vue` 支持 `mental-exam` 模式配置
- `apps/app-training/` 路由和组件同步训练端

---

## 数据流

```
病例 meta.json (atypical_dialogue 块)
  → useCaseLoader.loadCase() 加载 meta
  → StationLoading: preconfigureSession({ mode: 'mental-exam', atypicalConfig })
  → POST /api/sp/configure → sp-api 读 meta 文件系统 → 加载 0602 提示词 + 注入 B类参数
  → MentalExam.vue 渲染
  → 学生发消息 → POST /api/sp/message
  → processMessage: 使用 B类规则处理 LLM 输出
  → 返回 { text, emotion, mse_coverage, ... }
  → MentalExam.vue 更新 messages + MSEPanel 更新覆盖状态
  → endStage: 写入 trainingSession.mentalExam
  → ScoreReport: score-analyzer 已支持 mental_exam 剖面（L1-L5 五层分析）
```

---

## 文件修改清单（Phase 1 已完成）

| 文件 | 操作 | 说明 |
|------|------|------|
| `services/ai-generator/prompts/06-aisp/0602-sp-atypical.txt` | **新建** | B类SP提示词 |
| `apps/training/src/views/mental-exam/MentalExam.vue` | **新建** | 精神检查对话主页面 |
| `apps/training/src/router/index.js` | 修改 | 新增 `mental-exam` 路由 |
| `apps/training/src/composables/useStationFlow.js` | 修改 | STATION_ROUTE_MAP + PROJECT_ROUTE_MAP |
| `packages/shared/src/station-constants.js` | 修改 | STATION_TO_SESSION_KEY 补 mentalExam |
| `apps/training/src/views/StationLoading.vue` | 修改 | 预配置增加 mentalExam 分支 |
| `apps/training/src/views/StationSelect.vue` | 修改 | 选择逻辑支持精神检查站 |
| `services/sp-api/src/index.js` | 修改 | configure: mental-exam 模式处理 |
| `services/sp-api/src/prompt-builder.js` | 修改 | 加载 0602 + B类参数注入 |
