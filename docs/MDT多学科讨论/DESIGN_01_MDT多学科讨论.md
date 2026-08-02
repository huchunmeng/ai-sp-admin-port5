# MDT 多学科讨论模块设计文档

> 版本：v1.0 | 日期：2026-08-03
>
> **目标读者**：开发工程师 + AI 助手（AI 助手解读本文档后在真实项目中复现功能）
> **技术栈**：Vue 3 SFC（`<script setup>`）+ Pinia + useAIChat（复用现有共享层）
>
> 本文档描述 **MDT 多学科讨论** 训练模块的完整设计：产品流程、学生角色机制、数据模型、AI 实现路径（阶梯演进）、UI 设计、文件清单。文档目标是：交给 AI coding 助手后，可直接根据本文档构建 MDT 模块。
>
> 相关文档（位于 `docs/临床思维模拟训练/`）：
> - `DESIGN_01_架构与导航.md` — flow mode 架构、TrainingSession、useStationFlow
> - `DESIGN_03_AI智能体.md` — 五层流水线模式（活动感知→意图→上下文→策略→推荐）
> - `DESIGN_05_辅助检查模块.md` — LLM 自由输入 + 报告双模展示（技术栈参考）

---

## 目录

1. [概念定义](#1-概念定义)
2. [产品流程设计](#2-产品流程设计)
3. [学生角色机制](#3-学生角色机制)
4. [整体架构](#4-整体架构)
5. [数据模型](#5-数据模型)
6. [技术实现：阶段1 脚本模板驱动](#6-技术实现阶段1-脚本模板驱动)
7. [技术实现：阶段2 单智能体多角色](#7-技术实现阶段2-单智能体多角色)
8. [技术实现：阶段3 多智能体编排（预留）](#8-技术实现阶段3-多智能体编排预留)
9. [UI 设计](#9-ui-设计)
10. [文件清单与依赖关系](#10-文件清单与依赖关系)
11. [配置与扩展](#11-配置与扩展)
12. [设计决策记录](#12-设计决策记录)

附录：
- [附录A：三种学生角色行为矩阵](#附录a三种学生角色行为矩阵)
- [附录B：MDT 病例模板示例](#附录bmdt-病例模板示例)

---

## 1. 概念定义

### 1.1 什么是 MDT

MDT（Multi-Disciplinary Team，多学科团队）指多个学科专业人员围绕一个患者的诊疗决策展开协作讨论。真实场景中由主持人（主诊医师）组织，各学科专家（外科/肿瘤科/影像科/病理科…）从本专业角度发表意见，就分歧点讨论权衡，最终形成统一决策。

本模块将这一过程**模拟为可交互的训练场景**：AI 扮演主持人与各学科专家，学员扮演可选角色（观察者 / 住院医师 / 主诊医师）参与讨论。

### 1.2 模块定位

| 维度 | 定位 |
|------|------|
| **性质** | 训练模块，**非考核站**。弱化硬评分，强化过程反馈 |
| **独立性** | 独立模块：独立路由、独立数据（`useMDTData.js`）、独立讨论引擎，不依赖 flow mode 考站流 |
| **与双智能体的关系** | 业务独立；技术栈复用（`useAIChat`、活动感知、五层流水线模式） |
| **与全流程评分配置的关系** | 完全解耦。MDT 不接入 `DESIGN_04` 的评分方案体系 |
| **产品入口** | 训练端首页功能卡片 → `mdtCaseList`（病例列表）→ `mdtDiscussion`（讨论页），与 flow mode、自适应学习等并列 |

### 1.3 独立功能的入口与呈现

MDT 多学科讨论是一个**完全独立的新功能**：不依赖 flow mode 考站流，不进考站流转引擎，有自己的病例列表页、讨论页、数据文件与面包屑导航。它与 flow mode（临床思维模拟训练）在导航上是**并列关系**，而非其子模块。

```
训练端首页 (HomeView)
  └─ 功能入口卡片「MDT多学科讨论」
       └─ MDT病例列表 (mdtCaseList)          ← 独立功能首页
            ├─ 点击病例卡片
            │    └─ MDT讨论页 (mdtDiscussion) ← 独立讨论引擎 + 角色选择
            └─ (可选) 经真实SP病例详情进入 MDT 讨论（CaseDetail 的 MDT 按钮）
```

| 入口/呈现 | 现状 | 说明 |
|-----------|------|------|
| 首页入口卡片 | ✅ 已有（HomeView `entry-mdt`） | 点击进入 `mdtCaseList` |
| 列表页（功能首页） | ✅ 已有（MDTCaseList.vue） | 独立 hero 横幅 + 筛选 + 病例网格 |
| 面包屑 | ✅ 已有（TrainingLayout） | "MDT病例列表" / "MDT讨论" |
| 管理端预览 | ✅ 已有（admin `new-features/MDTDiscussion.vue`） | 展示训练端形态，不承担配置编辑 |
| 路由 | ✅ 已有（`mdtCaseList` / `mdtDiscussion`） | 挂在 TrainingLayout 下，但业务独立 |

### 1.4 当前实现状态

| 文件 | 状态 | 说明 |
|------|------|------|
| `apps/admin/src/views/raw-records/` | ✅ 阶段1 | 原始病历素材库（导入原文保存，供 SP/MDT 制作引用） |
| `apps/admin/src/views/mdt-case-manage/` | ✅ 阶段1 | MDT 病例管理（列表 + 编辑器，三种来源） |
| `apps/admin/public/data/mdt-cases/` | ✅ 阶段1 | 6 个种子 MDT 病例 `{id}-mdt.json`（自包含 patientInfo + knowledgeBase + 剧本） |
| `apps/training/src/views/MDTCaseList.vue` | ✅ 阶段1 | 从管理端索引加载，点击直接进 `mdtDiscussion` |
| `apps/training/src/views/MDTDiscussion.vue` | ✅ 阶段1 | 数据驱动 + 准备面板选角色 + Learner-paced 讨论流 + 插话 LLM |
| `apps/training/src/composables/useMDTData.js` | ✅ 阶段1 | 加载层（loadMDTCases / loadMDTCase / disciplineIcon） |
| `apps/admin/src/views/new-features/MDTDiscussion.vue` | ✅ 预览页 | 管理端对训练端形态的预览，不承担配置编辑 |

**本文档定义的目标形态**：阶段1（脚本驱动）已落地；阶段2 讨论由 AI 编排器（`useMDTDirector`）动态推进；阶段3 多智能体编排（预留）。

---

## 2. 产品流程设计

### 2.1 流程骨架：5 阶段

MDT 训练固定 5 个阶段，与真实 MDT 会议流程对应。每阶段有明确的**教学锚点**（学员应该学到什么）和**学生交互点**（学员在该阶段做什么）。

| 阶段 | 内容 | 教学锚点 | 学生交互点 |
|------|------|---------|-----------|
| 0 病例汇报 | 主持人汇报病史、查体、辅检、病理，提出核心议题 | 学会提炼病例关键信息、抓住决策要点 | 观察者：听；住院医师：被点名补充分诊；主诊：主持汇报并组织 |
| 1 影像/检查解读 | 影像专家解读 CT/病理关键发现 | 学会"影像征象→诊断"的推理链 | 全部角色：CT 标注任务 |
| 2 学科意见与综合讨论 | 各学科依次发言 + 制造分歧交锋 | **学会识别学科视角差异与权衡**（MDT 核心价值） | 观察者：自由提问；住院医师：被点名谈观点；主诊：追问分歧 |
| 3 方案决策 | 各专家给方案，学员独立制定方案，对比 MDT 决策 | 学会从多方案中做综合决策 | 全部角色：投票 + 独立制定方案 |
| 4 总结决策 | MDT 最终决策 + 文献依据 + 随访计划 | 学会循证依据与方案落地 | 全部角色：反思总结 + 成长画像 |

> **阶段可配置**：上表 5 阶段是**默认骨架**。病例 JSON 的 `stages` 数组可覆盖（如 4 阶段不设影像解读、3 阶段仅汇报/讨论/决策），任务也按 `key` 自由组合——病例不共享固定流程，各病例按其讨论主题差异化编排。

### 2.2 学习者掌控节奏（Learner-paced）

> **设计原则**：MDT 是模拟功能，本质是**教学训练工具**。流程骨架遵循真实会议，但**节奏推动权交给学员**——学员决定何时提问、何时深挖、何时把话轮交回主持人继续推动。系统不自动推进学员回合，避免学员沦为被动观看者。

**话轮控制模型：**

```
主持人推进议程 → 到达话轮节点 → 暂停 → 进入学员回合
                                              ↓
学员回合（学员掌控，不自动结束）
   ├─ 输入发言 → 专家回应 → 回到学员回合
   ├─ 触发任务卡片（诊断/标注/方案）→ 反馈 → 回到学员回合
   └─ 点击「继续讨论」→ 话轮交回主持人 → 主持人推进下一段议程
```

- 学员发言/提问后，专家回应完**不自动继续**，等待学员决定下一步
- 「继续讨论」按钮在学员回合常驻，点击即把推进权交回主持人
- 三种角色共享此原则；差异仅在发言义务（住院医师被点名）与决策权（主诊医师拍板）

**为什么学员掌控节奏：**
- 训练目标是让学员**主动思考**：决定何时深挖某个点、何时前进
- 真实会议中学员是被动的；教学场景必须反转，否则学员只是观众
- 避免"专家一直播、学员只能看"的失控节奏

### 2.3 分歧制造原则（阶段2 的设计要点）

> **MDT 独有的训练价值 = 让学员经历"单一学科视角有局限、多学科协作产出更优决策"。**

因此**每个 MDT 病例必须预置至少一个"学科间分歧点"**，让学员经历"分歧 → 权衡 → 收敛"的完整认知过程：

```
例：肺癌 IIB 期（T1cN1M0）
  ┌─ 外科主张：先行手术切除 + 术后辅助       ┐
  ├─ 肿瘤科主张：先行新辅助化疗±免疫再评估     ├→ 分歧
  └─ 病理科补充：PD-L1/NGS 结果影响方案选择    ┘
        ↓
  主持人归纳分歧点 → 学员权衡（投票/发表观点）
        ↓
  收敛：MDT 最终决策（手术时机 + 辅助方案）
```

病例数据中的 `disciplinePerspectives`（已有）即分歧的内容来源，`decision`（新增）即收敛结果。

### 2.4 训练定位下的反馈

不考核 → **弱化硬评分**，使用两条轻反馈：

1. **过程性反馈**：专家对学员每次发言/任务的即时点评。
   - 默认**引导性**为主（"你注意到了分叶征，很好，但纵隔淋巴结肿大的分期意义你考虑过吗？"）
   - 学员难度越高，越偏向**专家式点评**（指不足、给改进方向）
2. **成长画像**：训练结束展示，但维度数据**来自学员真实行为**，而非静态编造。

成长画像维度（详见 [2.4](#24-成长画像维度)）。

### 2.5 成长画像维度

| 维度 | 数据来源 | 阶段1实现 | 阶段2起实现 |
|------|---------|----------|------------|
| 诊断判断力 | 阶段0 诊断任务 vs MDT 决策 | 规则比对 | 规则比对 |
| 影像识读能力 | 阶段1 标注命中率 | 规则比对（命中 expected） | 规则比对 |
| 方案一致性 | 阶段3 学员方案 vs MDT 决策 | 规则比对（关键词） | LLM 评估 |
| 批判性思维 | 阶段2 学员发言（质疑/补充） | 无（仅统计发言次数） | LLM 评估 |
| 循证决策能力 | 阶段3 方案是否引用指南/文献 | 无（提示性反馈） | LLM 评估 |
| 反思深度 | 阶段4 反思内容 | 无（仅记录） | LLM 评估 |

> 阶段1 只保证前 3 个可算的维度，其余维度显示"待 AI 评估"或引导性提示；阶段2 起全部由 LLM 评估。

---

## 3. 学生角色机制

### 3.1 核心决策：进入训练前选择

**学生角色由学员在进入训练前手动选择，不按难度自动映射。**

原因（用户拍板）：
- MDT 训练的价值在于让学员**主动尝试不同角色**，自动映射限制了学员选择自由
- 同一年级学员能力差异大，手动选择更贴合个人训练目标
- 同一病例可通过不同角色反复训练，对比不同角色的决策责任差异

### 3.2 三种角色定义

| 角色 | 定位 | 发言义务 | 决策权 | 交互密度 | 反馈语气 |
|------|------|---------|--------|---------|---------|
| **观察者** | 旁听学习 | 无（可自由提问） | 无 | 低 | 引导性 |
| **住院医师** | 轮转参会 | 有（被主持人点名发言） | 无 | 中 | 引导性为主 |
| **主诊医师** | 发起并主导 | 全程主导 | 有（最终拍板） | 高 | 偏向专家式点评 |

三者在同一个 `MDTDiscussion.vue` 内由 `studentRole` 驱动，差异集中在三处：

1. **主持人开场白**不同：
   - 观察者："请学员旁听本次讨论，可随时提出疑问，专家会解答。"
   - 住院医师："请住院医师先说说出你对这个病例的初步印象。"
   - 主诊医师："您作为主诊医师，请先汇报病例，并组织本次讨论。"
2. **发言触发**不同：
   - 观察者：无强制发言点，输入框随时可插话
   - 住院医师：每阶段开场被点名发言 → 专家引导性反馈 → 继续议程
   - 主诊医师：由学员发起每个讨论环节，专家响应学员的引导
3. **决策权**不同：
   - 主诊医师在阶段3 需要自己拍板方案，主持人引导专家补充分歧后收敛；其余角色由主持人直接给出 MDT 决策。

### 3.3 选择交互

```
MDT病例列表 (mdtCaseList)
  └─ 点击病例卡片
      └─ MDT讨论页 (mdtDiscussion)
           ├─ 【准备面板】：病例概要 + 角色选择 + 训练说明
           ├─ 选择角色 → 点击"开始MDT讨论"
           └─ 进入正式讨论流（5阶段 + 该角色交互模式）
```

准备面板（首次进入或换病例时显示）：
- 左上：病例概要（患者/主诉/参与学科/核心议题）
- 中部：三张角色卡片（名称 / 定位 / 发言义务 / 决策权 / 适合人群），默认推荐"住院医师"
- 底部：训练说明（"你将在 AI 主持的 MDT 会议中扮演该角色，AI 专家会根据你的角色调整互动方式"）
- 按钮：开始 MDT 讨论

### 3.4 会话恢复

- 角色选择写入 `trainingSession.mdt.studentRole`
- 若 `trainingSession.mdt` 已有进行中的会话（`currentStage > 0` 且未 `completedAt`），再次进入时提供"继续训练 / 重新开始"，继续训练保留进度

---

## 4. 整体架构

### 4.1 组件树

```
MDTCaseList.vue                          ← 病例列表（已有）
  └─ 点击 → mdtDiscussion
MDTDiscussion.vue                        ← 讨论页（改造）
  ├─ 准备面板（角色选择）                    ← 新增
  ├─ 讨论区（三栏：病例信息 / 对话流 / 参与者）
  ├─ 任务卡片（诊断/影像标注/投票/方案/反思）
  ├─ 成长画像弹窗
  └─ useMDTDirector.js                   ← 阶段2 新增：MDT 编排器
       ├─ useAIChat.js                   ← 复用（LLM 封装）
       ├─ roleConfig                     ← 角色配置（代码常量）
       └─ buildMDTSystemPrompt           ← 三段式 Prompt 组装
useMDTData.js                            ← 扩展：剧本 + 任务 + 决策 + 反馈
trainingSession.mdt                      ← Pinia 持久化
```

### 4.2 信息流

```
┌───────────────────────────────────────────────────────────┐
│  store.trainingSession.mdt   (Pinia, localStorage 持久化)   │
│  { caseId, mdtId, studentRole, messages[], tasks{},       │
│    currentStage, startedAt, completedAt }                 │
└──────────────┬────────────────────────────────────────────┘
               │
      ┌────────▼─────────┐        ┌─────────────────┐
      │ MDTDiscussion.vue │───▶───│ useMDTDirector   │
      │ (UI: 讨论流/任务)  │       │ (编排器: 推进/发言/反馈) │
      └────────┬─────────┘        └────────┬────────┘
               │                           │
               ▼                           ▼
      useMDTData.js               useAIChat.js (复用)
      (病例剧本数据)                  (LLM 调用)
```

### 4.3 复用与新增

| 层 | 复用（现有） | 新增（本模块） |
|----|------------|--------------|
| LLM 通信 | `useAIChat.js` | — |
| 病例加载 | `/data/mdt-cases/{id}-mdt.json`（训练端 `serve-admin-data` 中间件，MDT 自包含 patientInfo） | 管理端 `rawRecordsApi` / `mdtCasesPersist` / 训练端 `mdt-cases-index` 插件 |
| 难度标签 | `@ai-sp/shared`（getDifficultyLabel / getCaseLevel） | — |
| 讨论引擎 | — | `useMDTDirector.js` |
| 病例数据 | `useMDTData.js` 加载层（loadMDTCases / loadMDTCase） | 管理端 `views/mdt-case-manage/` 编辑器 |
| 会话存储 | `trainingSession`（`saveSessionStage('mdt', ...)`） | — |

---

## 5. 数据模型

### 5.1 MDTCase — 病例剧本数据（管理端 `{id}-mdt.json` 文件）

MDT 病例在**管理端独立管理**，存储为 `apps/admin/public/data/mdt-cases/{id}-mdt.json`，**自包含 `patientInfo` 摘要与知识库**（训练端左侧面板直接渲染，不再经 `useCaseLoader` 关联真实 SP 病例）。训练端通过 `GET /api/mdt-cases` 加载索引、`/data/mdt-cases/{id}-mdt.json` 拉取完整数据。

```typescript
interface MDTCase {
  // ── 基础信息 ──
  id: string                      // 如 'MDT-20260701-C4K7'
  caseId: string                  // 关联来源 SP 病例（sourceType==='raw' 时关联素材库病历）
  sourceType: 'ai' | 'raw' | 'manual'   // 来源：系统内自建 / 基于原始病历 / 作者手动输入
  sourceRecordId?: string         // sourceType==='raw' 时引用素材库病历 id
  stages?: string[]               // 讨论阶段标签（覆盖默认5段；缺省 ['病例汇报','影像解读','综合讨论','方案决策','总结']）
  // ── 病例摘要（自包含）──
  patientInfo: {
    name: string
    gender: '男' | '女'
    age: number
    chiefComplaint: string        // 主诉
    presentIllness: string        // 现病史
    physicalExam: string          // 体格检查
    vitals: string                // 生命体征
    labTests: string              // 实验室检查
    imagingText: string           // 影像检查
    pastHistory: string           // 既往史
    familyHistory: string         // 家族史
  }
  disciplines: string[]           // 参与学科，如 ['心内科','心外科','肾内科']
  objective: string               // 本次 MDT 核心议题
  keyQuestions: string[]          // 讨论问题列表
  // ── 展示字段 ──
  teachingPhase: string           // 难度标签（展示用，不驱动角色）
  levelLabel: string              // 基础病例 / 高阶病例 / 疑难病例
  filterKey: string               // 列表筛选键（cardio / respiratory / neuro / ...）
  source: string                  // 来源：院士精讲 / 金牌导师 / 国家级质控中心
  // ── 知识库 ──
  knowledgeBase: {
    disciplinePerspectives: Array<{ dept: string; view: string }>  // 各学科观点（分歧来源）
    clinicalKeyPoints: string     // 临床要点
    references: string[]
  }
  // ── 剧本 ──
  agenda: MDTScriptEntry[]        // 讨论剧本（阶段1 用它驱动，逐条播放）
  tasks: MDTTaskDef[]             // 学生任务定义（通用任务模型，按 key 自由组合）
  decision: string                // MDT 最终决策
  followUp: string                // 随访计划
  referencesList: string[]        // 参考文献（阶段4 展示）
  roleScripts: MDTRoleScripts     // 三种角色的开场白/点名模板
}

interface MDTScriptEntry {
  phase: number                   // 所属阶段（对齐 stages 下标，从 0 开始）
  speaker: string                 // 'host'（主持人）或学科名，如 '呼吸科' / '影像科'
  text: string                    // 发言内容
  nextTask?: string               // 发言后暂停并弹出的任务卡片 key（可选，引用 tasks[].key）
}

interface MDTTaskDef {
  key: string                     // 唯一标识，agenda.nextTask 引用它
  type: 'text' | 'choice' | 'exhibit'   // 通用任务类型：文字作答 / 选择作答 / 影像标注
  label: string                   // 任务标题（如：初步诊断印象）
  assess?: 'diagnosis' | 'imaging' | 'plan'  // 能力画像维度；缺省不纳入画像
  prompt: string                  // 任务说明
  // text 特有
  rows?: number                   // textarea 行数
  placeholder?: string            // 占位提示（换行用 \n）
  // choice 特有
  options?: string[]              // 选项
  correct?: string[]              // 正确答案（能力画像比对用）
  multi?: boolean                 // 是否多选（默认单选）
  // exhibit 特有
  image?: { title: string; modality: string; expected: string[] }  // 标注期望病灶
  // 任务级反馈（阶段1 展示；阶段2 起由 LLM 生成）
  feedback?: MDTTaskFeedback
}

interface MDTTaskFeedback {
  hits: Array<{ icon: string; point: string }>    // 命中（学员答对/答到位时展示）
  misses: Array<{ icon: string; point: string }>  // 遗漏（未覆盖的角度）
}

interface MDTRoleScripts {
  observer:  { opening: string; interruptHint: string }
  resident:  { opening: string; callOut: string[] }     // callOut: 每阶段点名语
  attending: { opening: string; promptTemplates: string[] } // 学生发起讨论的引导语
}
```

### 5.2 trainingSession.mdt — 运行时会话数据

新增到 `store.trainingSession` 的一个 key：

```typescript
interface MDTSession {
  mdtId: string
  caseId: string                  // 关联真实 SP 病例
  studentRole: 'observer' | 'resident' | 'attending'
  startedAt: string
  completedAt?: string
  currentStage: number            // 对齐 stages 下标
  messages: MDTMessage[]          // 完整讨论流（含任务卡片占位）
  tasks: Record<string, any>      // 按任务 key 存作答：text→string / choice→string|string[] / exhibit→markers[]
  selectedChoices?: Record<string, string[]>  // choice 多选暂存
  submitted?: Record<string, boolean>          // 已完成任务 key
  pendingTask?: string            // 中断时待完成任务 key
}

interface MDTMessage {
  type: 'expert' | 'student' | 'system' | 'task-card'
  sender?: string                 // 专家名
  speaker?: 'host' | 'onco' | 'radio' | 'path' | ...  // 发言人标识（驱动头像）
  text: string
  taskKey?: string                // type === 'task-card' 时
  cardMeta?: string               // 任务卡摘要（已提交显示摘要）
  cardDone?: boolean
}
```

### 5.3 ROLE_CONFIG — 角色配置（代码常量，非病例数据）

```javascript
// apps/training/src/composables/roleConfig.js
const ROLE_CONFIG = {
  observer: {
    key: 'observer', label: '观察者',
    duty: '无发言义务', decision: false, feedbackMode: 'gentle',
    desc: '适合初次接触 MDT 或低年资学员，旁听专家讨论，随时可提问',
  },
  resident: {
    key: 'resident', label: '住院医师',
    duty: '被点名发言', decision: false, feedbackMode: 'gentle',
    desc: '模拟真实 MDT 中轮转住院医师，被主持人点名谈观点，专家引导反馈',
  },
  attending: {
    key: 'attending', label: '主诊医师',
    duty: '主导讨论并拍板', decision: true, feedbackMode: 'expert',
    desc: '模拟发起 MDT 的主诊医师，负责组织讨论并做出最终决策',
  },
}
```

---

## 6. 技术实现：阶段1 脚本模板驱动

> **目标**：把硬编码 `chatItems` 变为数据驱动，先跑通完整训练流程。这是立即可用的阶段，约 1 周。

### 6.1 改动点

| 文件 | 改动 |
|------|------|
| 管理端 `views/mdt-case-manage/` | **新建**：MDT 病例管理（列表 + 编辑器，三种来源：系统内自建 / 基于原始病历 / 作者手动输入；任务表单为通用任务模型 text/choice/exhibit + 任务级反馈） |
| 管理端 `views/raw-records/` | **新建**：原始病历素材库（导入原文保存，供 SP/MDT 制作引用） |
| 管理端 `vite.config.js` | **扩展**：`rawRecordsApi()` + `mdtCasesPersist()` 插件（读写 `public/data/`，带 CORS） |
| 管理端 `public/data/mdt-cases/` | 6 个种子 MDT 病例 `{id}-mdt.json`（自包含 patientInfo + knowledgeBase + 剧本 + 通用任务，病例间 stages/tasks 差异化） |
| `useMDTData.js` | 改为**加载层**：删内置病例，`loadMDTCases()` → `GET /api/mdt-cases` 索引、`loadMDTCase(id)` → `GET /data/mdt-cases/{id}-mdt.json` |
| `roleConfig.js` | **新建**：三种学生角色配置常量（DESIGN_01 5.3） |
| `MDTDiscussion.vue` | 数据驱动：准备面板选角色 → Learner-paced 讨论流（agenda 逐条播 + 「继续讨论」交回主持权）→ **通用任务弹窗**（按 tasks[].type 渲染 text/choice/exhibit）→ 插话 LLM 回应 → 能力画像按 assess 聚合 → 会话恢复 |
| `MDTCaseList.vue` | 从索引加载病例，点击卡片直接携带 `mdtId` 进入 `mdtDiscussion` |
| 训练端 `vite.config.js` | **扩展**：`mdt-cases-index` 插件（`GET /api/mdt-cases` 实时扫描管理端 mdt-cases 目录） |
| `stores/training.js` | 复用现有 `saveSessionStage('mdt', data)`，无改动 |

### 6.2 讨论流加载

```javascript
// MDTDiscussion.vue — 阶段1 数据驱动（Learner-paced）
const caseData = ref(null)
async function load() {
  caseData.value = await loadMDTCase(route.query.mdtId || route.params.caseId)
  // 已保存会话则 restoreSession（恢复 messages / agendaIndex / pendingTask）
}

// 逐条播放 agenda（开场白 → 各阶段发言），遇 nextTask 暂停进入学员回合
async function playAgenda() {
  while (agendaIndex < caseData.value.agenda.length) {
    const entry = caseData.value.agenda[agendaIndex++]
    currentStage = entry.phase
    await playExpert(entry.speaker, entry.text)   // 打字节奏 + 正在发言指示
    if (entry.nextTask) {                          // 暂停：任务卡片弹出
      pendingTask = entry.nextTask
      return
    }
  }
  finishDiscussion()                               // 播完 → 决策/随访/参考文献 + 结束
}
// 「继续讨论」按钮：完成任务后交回主持权恢复播放（Learner-paced 核心）
```

### 6.3 学员插话 — 唯一的 AI 调用点

学员在输入框发言时，调一次 LLM，让"当前发言专家"回应（带该学科视角）：

```javascript
async function sendMessage() {
  const text = chatInput.value.trim()
  if (!text) return
  chatItems.value.push({ type: 'student', text })
  chatInput.value = ''
  isTyping.value = true

  const result = await useAIChat().sendMessage(
    [{ role: 'user', content: text }],
    buildInterruptSystemPrompt(caseData.value, currentSpeaker.value, roleConfig.value),
    { temperature: 0.6, maxTokens: 800 },
  )
  isTyping.value = false
  chatItems.value.push({ type: 'expert', speaker: currentSpeaker.value, text: result.content })
  nextTick(() => scrollToBottom())
}
```

`buildInterruptSystemPrompt` 三段式（阶段1 简版）：

```
[角色段] 你是{当前专家}（{学科}主任医师），正在主持一场 MDT 会议。
[数据段] 当前病例：{主诉/核心议题}
         你的学科观点：{disciplinePerspectives 中该学科的 view}
         学员身份：{studentRole 描述}
[指令段] 学员刚说了：{学员发言}
         请从你的学科视角回应学员。训练定位，以引导性为主：先肯定可取之处，
         再指出需补充的角度，最后反问一个引导性问题。回复 150 字以内。
```

### 6.4 会话持久化

```javascript
// stores/training.js — 新增 mdt 会话读写
function initMDTSession({ mdtId, caseId, studentRole }) {
  trainingSession.value.mdt = {
    mdtId, caseId, studentRole,
    startedAt: new Date().toISOString(),
    currentStage: 0,
    messages: [], tasks: {},
  }
  saveTrainingSession()
}
```

任务提交时写入 `trainingSession.mdt.tasks[type]`，与消息流保持同步。

### 6.5 阶段1 的能力画像

按任务 `assess` 维度聚合可规则比对的分数（与任务组合解耦，病例自由编排）：

| 维度 | assess | 规则 |
|------|--------|------|
| 诊断判断力 | `diagnosis` | text 任务：命中 hits/misses 的比值；choice 任务：选中 `correct` 的正确率 |
| 影像识读能力 | `imaging` | exhibit 任务：标注数 与 `image.expected` 匹配（命中数/总数） |
| 方案一致性 | `plan` | text 任务：命中 hits/misses 的比值；choice 任务：选中 `correct` 的正确率 |

- 同一 assess 维度可关联多个任务，得分取各任务命中比的平均
- 无标准答案的任务（如反思）与无 assess 的任务不计数；已作答但全无规则比对 → "已作答，规则比对后待AI点评"
- 批判性思维 / 循证决策 / 反思深度始终追加 3 行显示"待 AI 评估（阶段2 接入）"，不硬编码数值

---

## 7. 技术实现：阶段2 单智能体多角色

> **目标**：从"播剧本"升级为"真讨论"。主持人 Agent（`useMDTDirector`）按议程动态推进，学员插话被当前发言人实时响应。**这是核心投入阶段。**

### 7.1 useMDTDirector — MDT 编排器

**文件：`apps/training/src/composables/useMDTDirector.js`**

复用 `DESIGN_03` 的五层流水线模式，针对 MDT 场景定制：

```
Layer 1 活动感知  → 读 trainingSession.mdt（学员已完成任务 / 最新发言 / 当前阶段）
Layer 2 意图识别  → 学员插话分类（MDT 插话意图体系）
Layer 3 上下文组装 → 三段式 Prompt（角色段 / 数据段 / 指令段）
Layer 4 回复策略  → 按角色与意图选择 temperature / maxTokens
Layer 5 智能推荐  → 给学员推荐追问 / 引导下一步
```

**导出接口：**

```javascript
interface UseMDTDirectorReturn {
  advanceStage: () => void          // 推进阶段：播放下一个发言
  onStudentInterrupt: (msg) => void // 学员插话 → 当前发言人回应
  onTaskSubmit: (type, value) => void // 任务提交 → 反馈 + 推进
  directorLoading: Ref<boolean>
}
```

### 7.2 主持人推进逻辑（Director）

```
advanceStage():
  1. currentStage++ (0→4)
  2. 读 caseData.agenda 中该阶段条目，逐条播放（每条间隔，显示"正在发言"）
  3. 阶段开头按 studentRole 注入：
     - resident → 主持人点名"请住院医师先说说…"
     - attending → 主持人提示"请主诊医师发起本环节"
  4. 该阶段议程播完后 → 触发对应任务卡片（entry.nextTask）
  5. 记录 stage 完成状态到 trainingSession.mdt

onStudentInterrupt(msg):
  1. 意图识别（见 7.3）
  2. 当前发言人组装 Prompt → 调用 LLM → 回复学员
  3. 回到议程（不打断流程主体）
```

### 7.3 MDT 插话意图体系

| 意图 | 学员示例 | 处理 |
|------|---------|------|
| `question` | "新辅助治疗的标准方案是什么？" | 当前发言人讲解 |
| `challenge` | "如果新辅助后肿瘤进展，会不会错过手术窗口？" | 当前发言人回应（**批判性思维训练点**） |
| `supplement` | "我补充一点，PD-L1 高表达应该考虑免疫" | 当前发言人肯定并展开 |
| `clarification` | "您说的 N1 分期具体指什么？" | 当前发言人澄清 |
| `casual` | "谢谢"、"好的" | 简短回应，回归议程 |

关键词表 + 分类算法与 `DESIGN_03` 的 `classifyIntent` 同构，落到 `useMDTDirector` 内部。

### 7.4 角色差异化 Prompt

**角色段**（每个专家一次配置）：

```
你是{专家姓名}，{机构}·{学科}主任医师，具有{资深/权威}的{学科}临床经验。
你在 MDT 会议中代表{学科}发言，以第一人称"我"自称。
```

**数据段**（MDT 特有注入）：

```
当前病例：{患者}/{主诉}
核心议题：{keyQuestions}
你的学科观点：{disciplinePerspectives 中该学科的 view}
其他学科观点（供你回应）：{其余学科的 view 摘要}
学员身份：{studentRole}（观察者/住院医师/主诊医师）
学员最新行为：{trainingSession.mdt.tasks 摘要 + 最近发言}
已发生的讨论：{最近 3-5 条消息摘要}
```

**指令段**（按意图 + 学员角色分叉）：

```
当前阶段：{phase}
学员刚说：{msg}
请从{学科}视角回应。要点：
1. 引用你的学科观点作为依据；
2. 如与其他学科存在分歧，明确说明你的立场和理由；
3. 反馈语气：学员为{观察者/住院医师} → 引导性为主（先肯定→指角度→反问）；
   学员为主诊医师 → 可更直接点评并给出专业建议；
4. 回复 200 字以内，自然口语化，像真人专家在会议中说话。
```

> **关键**：数据段注入"其他学科观点"是为了让 LLM 扮演的专家**有对象可回应**，避免各专家自说自话、观点趋同。

### 7.5 分歧收敛（阶段2 简版）

阶段2 各学科发言完毕后，主持人 Agent 执行收敛：

```
主持人：综合各位意见，目前分歧集中在：「{disciplinePerspectives 中观点相反的两科}」。
       我们进入讨论环节，{studentRole 引导语}。
```

分歧点从 `disciplinePerspectives` 中预置（观点冲突的学科对），主持人 LLM 归纳后转给学员权衡（投票 / 发表观点）。

### 7.6 回复策略

```javascript
function selectMDTStrategy(intent, studentRole, phase) {
  const map = {
    question:      { temperature: 0.6, maxTokens: 900 },
    challenge:     { temperature: 0.5, maxTokens: 1100 },  // 批判性回应
    supplement:    { temperature: 0.6, maxTokens: 800 },
    clarification: { temperature: 0.5, maxTokens: 600 },
    casual:        { temperature: 0.7, maxTokens: 200 },
  }
  return map[intent]
}
```

### 7.7 阶段2 成长画像

阶段1 的规则维度保留；批判性思维 / 循证 / 反思改为 LLM 评估：

```
[评估 prompt] 基于学员的 {发言记录 / 方案 / 反思}，按以下维度打分（0-100）并给一句评价：
批判性思维（是否提出有价值的质疑/补充）、循证意识（是否引用指南/文献）、反思深度。
输出 JSON。
```

---

## 8. 技术实现：阶段3 多智能体编排（预留）

> **目标**：让各专家真正独立思考、产生更真实的观点交锋。按需升级，不阻塞阶段2。

### 8.1 演进原则：先抽象端口，后替换实现

阶段2 的 `useMDTDirector` 在封装时遵守：**"调度"与"专家生成"分离**。

- 专家发言从「Director 内联调一次 LLM」抽象为「可注入的专家端口」：

```javascript
// 端口抽象（阶段2 已按此封装，阶段3 直接替换实现）
const expertPorts = {
  onco:  { systemPrompt: buildOncoPrompt,  call: (msgs, opts) => llm(msgs, opts) },
  radio: { systemPrompt: buildRadioPrompt, call: (msgs, opts) => llm(msgs, opts) },
  path:  { systemPrompt: buildPathPrompt,  call: (msgs, opts) => llm(msgs, opts) },
}
```

阶段3 升级时，`call` 替换为独立 LLM 调用 + 各专家独立知识库（病例专属专家配置，参考 `DESIGN_03` 的 `{caseId}-expert.json` 机制）。

### 8.2 分歧收敛机制（阶段3）

```
1. 各专家端口并行/串行独立发言
2. 主持人端口聚合所有输出 → 识别观点分歧点
3. 对分歧点发起"二次讨论"（相关专家再次发言，针对对方观点回应）
4. 主持人归纳收敛 → 形成 MDT 决策草案
5. 学员（决策角色）确认或修正 → 最终决策
```

### 8.3 成本权衡

| 维度 | 阶段2 单智能体多角色 | 阶段3 多智能体 |
|------|--------------------|---------------|
| 每轮 LLM 调用 | 1 次（串行） | 3~6 次（可并行） |
| 观点独立性 | 中（同模型，靠数据段锚点） | 高（独立上下文） |
| 分歧真实感 | 中 | 高 |
| 实现复杂度 | 低 | 高（需处理冲突收敛） |

---

## 9. UI 设计

### 9.1 准备面板（角色选择）

布局：

```
┌───────────────────────────────────────────────────────────┐
│  MDT多学科讨论 · 病例概要                                    │
│  患者：张德明 男 58岁 · 呼吸内科 · 参与学科：肿瘤/影像/病理    │
│  核心议题：明确诊断方向，制定初始治疗策略                      │
│  ─────────────────────────────────────────────────────     │
│  [观察者]      [住院医师]      [主诊医师]     ← 三张角色卡片    │
│   旁听学习       被点名发言       主导并拍板                   │
│  ─────────────────────────────────────────────────────     │
│  训练说明：你将在 AI 主持的 MDT 会议中扮演所选角色，            │
│  AI 专家会根据你的角色调整互动方式。                          │
│                          [ 开始 MDT 讨论 ]                   │
└───────────────────────────────────────────────────────────┘
```

角色卡片选中态高亮；点击"开始"后角色写入 `trainingSession.mdt.studentRole` 并进入讨论区。

### 9.2 讨论区（三栏，复用现有布局）

| 栏 | 内容 |
|----|------|
| 左栏 | 病例信息分页（基本信息 / 病史资料 / 检查报告 / MDT议题）——已有，病例数据从 mdt 文件自包含的 `patientInfo` 渲染 |
| 中栏 | 讨论流 + 输入栏——已有，改为数据驱动 + 角色差异 |
| 右栏 | 参与者名单——已有，标注当前发言专家 + 学员角色标识 |

**角色差异的 UI 表现：**
- 主持人点名发言：对话流中出现高亮"点名卡片"（"主持人：请住院医师先说初步诊断"），输入框 placeholder 变为"请发表你的观点..."
- 主诊医师拍板：阶段3 学员方案提交后，弹窗"确认最终方案"按钮（仅 attending 角色显示）
- 学员角色标识：右栏学员行显示"👁 观察者 / 🩺 住院医师 / 🎯 主诊医师"

**话轮控制 UI（Learner-paced）：**
- 专家发言播放/生成中：输入框短暂禁用（placeholder"专家正在发言…"），播完立即回到学员回合
- 学员回合：输入框可用；学员发言后专家回应，**不自动推进**
- 「继续讨论」按钮：学员回合底部常驻，点击把话轮交回主持人继续推进
- 住院医师被点名：点名提示卡片 + 输入框高亮，可"这次跳过"

### 9.3 任务卡片

**通用任务模型**：3 种类型（text 文字作答 / choice 选择作答 / exhibit 影像标注），`agenda.nextTask` 引用任务 `key`，病例按需自由组合，不再固定 5 连：

- 卡片定义来自 `caseData.tasks`（key / type / label / prompt / options / correct / image.expected）
- 一个通用弹窗按 `type` 渲染：text→textarea（rows/placeholder）、choice→单选/多选（multi）、exhibit→图像标注区（最多3处）
- 提交后写入 `trainingSession.mdt.tasks[taskKey]`，卡片显示摘要（如"已提交方案：... 前60字"）
- 阶段1：提交后播放 `tasks[].feedback` 任务级反馈（hits/misses）；阶段2：提交后触发 LLM 过程反馈
- 允许跳过（skip），跳过不产生反馈

### 9.4 成长画像弹窗

- 阶段1：显示可规则计算的维度（诊断/影像/方案），其余维度显示"待AI评估"
- 阶段2：全部维度显示，来自真实行为 + LLM 评估
- 每维度：得分（0-100）+ 一句评价

---

## 10. 文件清单与依赖关系

### 10.1 文件清单

```
apps/admin/src/
├── views/raw-records/            ← 新建：原始病历素材库
│   ├── RawRecordList.vue         ← 素材库表格（导入/查看/编辑/删除）
│   └── RawRecordEditor.vue       ← 导入/编辑（元数据 + 原文）
├── views/mdt-case-manage/        ← 新建：MDT 病例管理
│   ├── MDTCaseList.vue           ← MDT 病例表格（新增选三种来源）
│   ├── MDTEditor.vue             ← 编辑器主入口（Tab 分区 + 来源选择）
│   ├── MDTBasicForm.vue          ← patientInfo / disciplines / objective / teachingPhase
│   ├── MDTKnowledgeForm.vue      ← keyQuestions + knowledgeBase
│   ├── MDTScriptForm.vue         ← stages 阶段 + agenda 列表 + tasks 列表（通用任务模型，key/type/assess/options/correct/feedback）
│   ├── MDTDecisionForm.vue       ← decision / followUp / referencesList（任务级反馈已并入 MDTScriptForm）
│   └── MDTRoleScriptForm.vue     ← roleScripts 三角色话术
├── vite.config.js                ← 扩展：rawRecordsApi + mdtCasesPersist 插件
└── public/data/
    ├── raw-records/              ← 素材库原文 {id}.json
    └── mdt-cases/                ← MDT 病例 {id}-mdt.json（6 个种子）

apps/training/src/
├── composables/
│   ├── useMDTDirector.js        ← 阶段2 新建：MDT 编排器（五层流水线）
│   ├── useMDTData.js            ← 改造：加载层（loadMDTCases / loadMDTCase / disciplineIcon）
│   ├── roleConfig.js            ← 新建：三种学生角色配置常量
│   └── useAIChat.js             ← 复用（现有）
├── views/
│   ├── MDTCaseList.vue          ← 改造：从索引加载，点击直接进 mdtDiscussion
│   └── MDTDiscussion.vue        ← 改造：数据驱动 + 准备面板 + Learner-paced 讨论流
├── stores/
│   └── training.js              ← 复用（saveSessionStage 已有）
├── vite.config.js               ← 扩展：mdt-cases-index 插件
└── router/index.js              ← 已有（mdtCaseList / mdtDiscussion 已挂载）
```

### 10.2 依赖图

```
MDTDiscussion.vue
  ├── useMDTDirector.js ──→ useAIChat.js ──→ (/api/llm)
  │         │
  │         └──→ roleConfig.js
  ├── useMDTData.js  ──→ (/api/mdt-cases 索引 + /data/mdt-cases/{id}-mdt.json)
  ├── usePatientImage.js  ──→ (患者头像匹配)
  └── stores/training.js  ──→ (trainingSession.mdt)
```

---

## 11. 配置与扩展

### 11.1 新增一个 MDT 病例

在管理端「病例管理 → MDT病例管理」新建病例（选择来源：系统内自建 / 基于原始病历 / 作者手动输入），保存后写入 `apps/admin/public/data/mdt-cases/{id}-mdt.json`（参考 [附录B](#附录bmdt-病例模板示例)）：

1. **基础信息**：`id` / `caseId`（关联来源）/ `sourceType` / `patientInfo`（自包含摘要）/ 学科 / 难度标签
2. **讨论内容**：`keyQuestions`（核心议题）、`knowledgeBase.disciplinePerspectives`（各学科观点，**必须含至少一对观点冲突**）
3. **阶段**：`stages`（可覆盖默认5段，按议题精简，如决策型病例 3 段）
4. **剧本**：`agenda`（阶段发言条目 + `nextTask` 触发点，引用任务 key）
5. **任务**：`tasks`（通用任务模型：text / choice / exhibit，按 key 自由组合，每个任务带 `assess` + `feedback`）
6. **收敛结果**：`decision`（最终决策）、`followUp`（随访）、`referencesList`（文献）
7. **角色话术**：`roleScripts`（三种角色开场白/点名语）

### 11.2 调试开关

```javascript
if (import.meta.env.DEV) {
  console.log('[MDT] case:', caseData.value?.id)
  console.log('[MDT] role:', studentRole.value)
  console.log('[MDT] stage:', currentStage.value)
  console.log('[MDT] Director prompt:', lastSystemPrompt.value)  // 阶段2
}
```

### 11.3 性能注意事项

- 单轮 LLM 回复控制在 200 字以内（阶段2），避免打断讨论节奏
- `trainingSession.mdt.messages` 超 100 条时，向 Director 只注入最近 5 条摘要
- 专家发言逐条播放时加 800ms 间隔 + "正在发言"指示器，模拟真人节奏

---

## 12. 设计决策记录

### 决策1：为什么学生角色由学员进入训练前手动选择，而非按难度自动映射？

MDT 训练的价值在于让学员**主动尝试不同角色**、对比不同角色的决策责任差异。按难度自动映射会限制学员选择自由；且同一年级学员能力差异大，手动选择更贴合个人训练目标。同一病例可用不同角色反复训练。这是产品负责人拍板的方向。

### 决策2：为什么定位为训练模块并弱化硬评分？

MDT 的教学价值在"经历多学科权衡的过程"，而非"得到一个分数"。硬评分会诱导学员应试化，削弱对分歧权衡的思考。训练定位下采用过程性反馈 + 真实行为画像。

### 决策3：为什么反馈以引导性为主、难度越高越偏向专家式点评？

训练场景下，引导性反馈保护学员的表达意愿（敢说），避免过早评判打击参与感；高难度学员（主诊医师角色）已具备基础，可承受更直接的专家式点评，训练效果更好。这是产品负责人拍板的方向。

### 决策4：为什么走阶梯演进（脚本模板 → 单智能体多角色 → 多智能体）？

三个阶段每步独立可用、可随时停止深化：
- 阶段1 立即可用（数据驱动 + 插话 LLM 回应），零风险
- 阶段2 核心投入（真讨论），复用 `DESIGN_03` 五层流水线模式
- 阶段3 按需升级（真交锋），阶段2 已预留端口抽象，不返工

### 决策5：为什么阶段2 用"单智能体多角色"而非直接"多智能体"？

MDT 教学场景语义空间有限（固定病例、固定学科），单智能体通过"数据段注入其他学科观点 + 角色 prompt 锚点"已能达到可用的差异化效果，而每轮 LLM 调用仅 1 次。多智能体成本高 3~6 倍且需设计冲突收敛，作为可选升级而非起点。

### 决策6：为什么每个病例必须预置学科分歧？

MDT 独有的训练价值 = 让学员经历"单一学科视角有局限、多学科协作产出更优决策"。无分歧的 MDT 只是多科轮流念稿，失去教学意义。分歧是剧本设计的第一要求。

### 决策7：为什么复用五层流水线模式？

`DESIGN_03` 已验证的模式（活动感知 → 意图 → 上下文 → 策略 → 推荐）与 MDT 编排高度同构：都需要感知学员行为、识别学员意图、组装上下文、选策略、给推荐。复用降低心智成本，未来多智能体升级也沿用。

### 决策8：为什么 mdt 会话持久化到 `trainingSession.mdt`？

沿用现有"扁平 key-value + localStorage 持久化"约定（`DESIGN_01` 决策5），支持断点续训、跨页面恢复、以及未来让 AI 点评读到的学员行为。独立 key 保证与 flow mode 考站数据互不干扰。

### 决策9：为什么病例剧本数据放前端 `useMDTData.js`？

当前 MDT 病例少（5 个）且以训练演示为主，前端常量最快。未来病例增多或需要管理端配置时，迁移到 `apps/admin/public/data/mdt/{mdtId}.json`（参考真实 SP 病例的 `{caseId}-basic.json` 机制），前端只改加载方式，模型结构不变。

### 决策10：为什么节奏推动权交给学员（Learner-paced）？

MDT 本质是教学训练工具，不是纯模拟观看。学员在真实会议中是"被主持人掌控的参与者"，若模拟照搬，学员会沦为观众、无法主动思考。将节奏推动权交给学员（话轮控制 + 「继续讨论」按钮），让学员自己决定何时提问、何时深挖、何时前进——比被动接收更符合训练目标，也与"学员是学习主体"的产品定位一致。

---

## 附录A：三种学生角色行为矩阵

| 行为 | 观察者 | 住院医师 | 主诊医师 |
|------|-------|---------|---------|
| 开场白 | 旁听，随时提问 | 被点名先说初步印象 | 主持汇报 + 组织讨论 |
| 阶段0 汇报 | 听 | 补充分诊 | 主导汇报 |
| 阶段1 影像标注 | ✅ | ✅ | ✅ |
| 阶段2 发言触发 | 随时提问（学员掌控话轮） | 被点名发言 + 随时提问（学员掌控话轮） | 主导追问（学员掌控话轮） |
| 阶段2 专家反馈 | 引导性 | 引导性 | 专家式点评 |
| 阶段3 投票 | ✅ | ✅ | ✅ |
| 阶段3 独立方案 | ✅ | ✅ | ✅ |
| 阶段3 最终拍板 | 主持人给决策 | 主持人给决策 | **学员拍板** |
| 阶段4 反思 | ✅ | ✅ | ✅ |
| 输入框 placeholder | "输入你的疑问..." | "请发表你的观点..." | "请组织讨论/追问..." |
| 决策权 | 无 | 无 | 有 |

## 附录B：MDT 病例模板示例

以肺癌病例为例（`apps/admin/public/data/mdt-cases/MDT-20260710-K9P3-mdt.json` 完整形态，作者手动输入）：

```json
{
  "id": "MDT-20260710-K9P3",
  "caseId": "RESP-20260710-K9P3",
  "sourceType": "manual",
  "sourceRecordId": "",
  "patientInfo": {
    "name": "张德明", "gender": "男", "age": 58,
    "chiefComplaint": "咳嗽、痰中带血2周，加重伴胸闷3天",
    "presentIllness": "患者2周前无明显诱因出现咳嗽，伴痰中带血，近3天加重伴胸闷、气短。近2月体重下降约5kg。",
    "physicalExam": "生命体征平稳。双肺呼吸音清，浅表淋巴结未触及肿大。",
    "vitals": "T 36.8℃ / P 78 / R 18 / BP 132/82mmHg",
    "labTests": "血常规正常。CEA 18ng/ml。肝肾功能正常。",
    "imagingText": "胸部CT：右肺上叶2.8×2.3cm分叶状结节，伴毛刺征及空泡征，纵隔4R组淋巴结肿大（1.2cm）。",
    "pastHistory": "吸烟30年，20支/日。", "familyHistory": "否认肿瘤家族史。"
  },
  "disciplines": ["肿瘤科", "影像科", "病理科"],
  "objective": "明确临床分期、制定初始治疗策略（手术 vs 新辅助）",
  "teachingPhase": "R2", "levelLabel": "高阶病例", "filterKey": "oncology", "source": "院士精讲",
  "keyQuestions": [
    "临床分期如何确定？还需补充哪些检查？",
    "初始治疗策略：先行手术 vs 先行新辅助治疗？",
    "若行新辅助，最佳方案是什么？如何评估疗效？",
    "术后辅助治疗如何决策？"
  ],
  "knowledgeBase": {
    "disciplinePerspectives": [
      { "dept": "肿瘤科", "view": "T1cN1M0(IIB)建议先行新辅助化疗±免疫再评估手术，CheckMate 816 显示 pCR 24%" },
      { "dept": "影像科", "view": "右肺上叶2.8×2.3cm分叶+毛刺+空泡征，纵隔4R淋巴结1.2cm，高度提示肺腺癌" },
      { "dept": "病理科", "view": "腺癌中分化，TTF-1+/Napsin A+，PD-L1 TPS=60%，NGS 待回报" }
    ],
    "clinicalKeyPoints": "N2淋巴结定性是手术决策关键；新辅助方案选择依据PD-L1/驱动基因状态。",
    "references": ["CheckMate 816", "KEYNOTE-671", "CSCO NSCLC指南2025版"]
  },
  "stages": ["病例汇报", "影像解读", "综合讨论", "方案决策", "总结"],
  "agenda": [
    { "phase": 0, "speaker": "host", "text": "各位专家，今天讨论58岁男性张德明…核心议题：明确诊断方向，制定初始治疗策略。", "nextTask": "diag01" },
    { "phase": 1, "speaker": "影像科", "text": "CT示右肺上叶2.8×2.3cm结节，分叶+毛刺+空泡征…请学员先标注异常征象。", "nextTask": "ct01" },
    { "phase": 2, "speaker": "host", "text": "现在进入综合讨论，围绕四个问题展开。" },
    { "phase": 2, "speaker": "肿瘤科", "text": "我倾向于先行新辅助治疗。CheckMate 816 显示新辅助化疗+免疫 pCR 达24%，可争取降期后再手术。" },
    { "phase": 2, "speaker": "病理科", "text": "补充两点：PD-L1 TPS=60%提示免疫可能获益；NGS驱动基因结果对辅助靶向决策至关重要。" },
    { "phase": 3, "speaker": "host", "text": "请学员先选择你认同的初始治疗方向。", "nextTask": "strategy01" },
    { "phase": 3, "speaker": "host", "text": "现在展示 MDT 最终决策，请对照分析差异。", "nextTask": "plan01" },
    { "phase": 4, "speaker": "host", "text": "本次讨论结束，请写下你的反思。", "nextTask": "reflect01" }
  ],
  "tasks": [
    { "key": "diag01", "type": "text", "label": "初步诊断印象", "assess": "diagnosis",
      "prompt": "写出初步诊断及依据、鉴别诊断、想进一步了解的信息", "rows": 5,
      "placeholder": "1. 诊断及依据\n2. 鉴别诊断\n3. 想进一步了解的信息",
      "feedback": { "hits": [{ "icon": "✓", "point": "方向正确：识别出肺占位恶性可能" }],
        "misses": [{ "icon": "✗", "point": "遗漏：纵隔淋巴结N分期意义未展开" }] } },
    { "key": "ct01", "type": "exhibit", "label": "胸部CT征象标注", "assess": "imaging",
      "prompt": "在CT图像上标注异常征象（最多3处）",
      "image": { "title": "胸部CT·肺窗", "modality": "CT", "expected": ["右肺上叶结节", "纵隔4R淋巴结", "空泡征"] },
      "feedback": { "hits": [{ "icon": "✓", "point": "右肺上叶结节" }],
        "misses": [{ "icon": "✗", "point": "纵隔4R淋巴结" }, { "icon": "✗", "point": "空泡征" }] } },
    { "key": "strategy01", "type": "choice", "label": "初始治疗方向", "assess": "plan",
      "prompt": "综合肿瘤科与病理科意见，你倾向哪种初始治疗策略？",
      "options": ["先行新辅助+再评估手术", "先行手术+术后辅助", "立体定向放疗"],
      "correct": ["先行新辅助+再评估手术"],
      "feedback": { "hits": [{ "icon": "✓", "point": "IIB期建议新辅助化疗±免疫，争取降期后手术" }],
        "misses": [{ "icon": "✗", "point": "需说明新辅助方案依据PD-L1/驱动基因状态" }] } },
    { "key": "plan01", "type": "text", "label": "初始治疗方案", "assess": "plan",
      "prompt": "独立制定完整的初始治疗方案（诊断/分期/策略/用药/随访）", "rows": 6,
      "placeholder": "1. 诊断结论\n2. 治疗策略\n3. 具体方案\n4. 随访计划",
      "feedback": { "hits": [{ "icon": "✓", "point": "外科方案方向正确" }],
        "misses": [{ "icon": "✗", "point": "遗漏：基因检测指导辅助治疗" }] } },
    { "key": "reflect01", "type": "text", "label": "反思总结",
      "prompt": "写下收获、认知改变、遗留困惑", "rows": 4,
      "placeholder": "1. 学到了什么\n2. 哪些认知被改变\n3. 遗留困惑",
      "feedback": { "hits": [], "misses": [] } }
  ],
  "decision": "行VATS右肺上叶切除+纵隔淋巴结清扫，术后根据病理及基因检测决定辅助方案（EGFR/ALK阳性→靶向；PD-L1≥50%→免疫；其余→含铂双药4周期）",
  "followUp": "术后3周胸外科+肿瘤科联合门诊复查，术后2年内每3-6月复查，5年后每年一次",
  "referencesList": ["CheckMate 816", "KEYNOTE-671", "CSCO NSCLC指南2025版"],
  "roleScripts": {
    "observer": { "opening": "各位专家，今天讨论58岁男性右肺上叶占位病例。请学员旁听全程讨论，可随时提问。", "interruptHint": "输入你的疑问..." },
    "resident": { "opening": "请住院医师先说说你对这个病例的初步印象和诊断思路。", "callOut": ["请住院医师说说你的看法", "住院医师，你如何权衡手术与新辅助这两个方案？"] },
    "attending": { "opening": "您作为主诊医师，请先汇报病例要点并组织本次讨论。", "promptTemplates": ["你如何评价肿瘤专家的新辅助建议？", "请你梳理一下目前的共识与分歧"] }
  }
}
```
