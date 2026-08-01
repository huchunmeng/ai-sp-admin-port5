# AI-SP 临床思维模拟训练 — 架构与导航设计文档

> 版本：v1.0 | 日期：2026-08-01
>
> 本文档描述临床思维模拟训练（flow mode / 多站流程模式）的完整架构设计。包括：整体架构、布局集成、顶部导航、考站流转、数据模型、视图集成模式。
> 文档目标是：交给AI coding助手后，可直接根据本文档构建和复现临床思维模拟训练的完整框架。
>
> 相关文档：
> - `DESIGN_02_左侧信息面板.md` — 左侧面板系统（PatientInfoPanel / FloatInfoPanel / StationRecordPanel）
> - `DESIGN_03_AI智能体.md` — AI伴学 + 专家点评智能体

---

## 目录

1. [概念定义](#1-概念定义)
2. [整体架构](#2-整体架构)
3. [数据模型](#3-数据模型)
4. [TrainingLayout — 布局容器](#4-traininglayout--布局容器)
5. [TrainingTopBar — 顶部导航栏](#5-trainingtopbar--顶部导航栏)
6. [useStationFlow — 考站流转引擎](#6-usestationflow--考站流转引擎)
7. [视图集成模式](#7-视图集成模式)
8. [考站内模块流转（steps）](#8-考站内模块流转steps)
9. [数据保存与持久化](#9-数据保存与持久化)
10. [文件清单与依赖关系](#10-文件清单与依赖关系)
11. [设计决策记录](#11-设计决策记录)

---

## 1. 概念定义

### 1.1 两种训练模式

| 维度 | 单考站模式 | 临床思维模拟训练（flow mode） |
|------|-----------|--------------------------|
| **触发条件** | `store.stationFlow?.stations?.length <= 1` | `store.stationFlow?.stations?.length > 1` |
| **考站数量** | 1个 | 通常6个（病史采集→体格检查→辅助检查→诊断→治疗计划→病历书写） |
| **顶部导航** | 模块级 steps（病史采集/辅助检查/诊断等） | 考站级 flowSteps（紧凑双行样式） |
| **标题** | 考站名称（如"诊断"） | "临床思维模拟训练" |
| **左侧面板** | 无操作记录Tab | 增加4个操作记录Tab（辅检/诊断/治疗/病历） |
| **右侧抽屉** | AICompanionDrawer 存在 | AICompanionDrawer 存在 |
| **数据存储** | `trainingSession[stationKey]` | `trainingSession` 包含所有6站数据，跨站持久化 |
| **导航** | 模块间前进/后退（steps） | 考站间点击跳转（flowSteps）+ 模块内 steps |

### 1.2 判断式

```typescript
// 在所有视图中使用
const flowSteps = computed(() => {
  const stations = store.stationFlow?.stations
  if (!stations?.length || stations.length <= 1) return null
  return stations.map(s => ({ ...s, label: s.name }))
})
```

```typescript
// FloatInfoPanel 中的判断
const isFlowMode = computed(() => (store.stationFlow?.stations?.length || 0) > 1)
```

```typescript
// AICompanionDrawer 中的判断（传入 AI 智能体）
const isFlowMode = (store.stationFlow?.stations?.length || 0) > 1
```

---

## 2. 整体架构

### 2.1 组件树

```
TrainingLayout.vue
├── <header> (仅非考站路由显示 — 首页/病例列表/病例详情)
│   ├── 系统名称
│   ├── 机构/用户信息
│   └── 退出登录
├── <breadcrumb-bar> (仅非考站路由显示)
├── <router-view>
│   └── 考站视图 (HistoryTaking / Diagnosis / AncillaryTests / ...)
│       ├── TrainingTopBar          ← 顶部导航（各视图自己渲染）
│       │   ├── stationName / home-link
│       │   ├── flowSteps (考站级)  ← flow mode 专用
│       │   ├── steps (模块级)       ← 单考站 mode
│       │   ├── timer
│       │   └── end-btn
│       ├── 左侧面板 (仅 Diagnosis / AncillaryTests / TreatmentPlan / MedicalRecord)
│       │   ├── panel-tabs
│       │   │   ├── info (患者信息)    ← PatientInfoPanel
│       │   │   ├── notes (笔记)
│       │   │   ├── history (接诊记录)
│       │   │   ├── ancillaryTests (flow-only)
│       │   │   ├── diagnosis (flow-only)
│       │   │   ├── treatmentPlan (flow-only)
│       │   │   └── medicalRecord (flow-only)
│       │   └── panel-content
│       ├── 主内容区 (body-area)
│       └── FloatInfoPanel (仅 HistoryTaking / PhysicalExam / MentalExam / HumanisticComm)
│           └── PatientInfoPanel + notes slot + flow tabs
├── AICompanionDrawer (所有考站路由)
│   ├── Tab: AI伴学 → useAICompanion
│   └── Tab: 专家点评 → useExpertAgent
└── BottomActionBar (由 shared 包管理，全局注入)
```

### 2.2 两类视图的左侧面板方案

| 视图类型 | 视图列表 | 左侧面板方式 |
|---------|---------|------------|
| **固定面板型** | Diagnosis, AncillaryTests, TreatmentPlan, MedicalRecord, PreliminaryDiag | 内联 `.left-panel` 固定占 35% 宽度 |
| **浮动面板型** | HistoryTaking, PhysicalExam, MentalExam, HumanisticComm | `FloatInfoPanel` 圆形按钮 + 展开浮层 |

> **设计原因**：对话类考站（病史采集/体格检查/精神检查/人文沟通）是全屏对话界面，无固定侧栏空间，只能使用浮动面板。选择/文本输入类考站有左侧面板空间。

### 2.3 信息流

```
┌─────────────────────────────────────────────────────────────┐
│  store.trainingSession  (Pinia, localStorage持久化)          │
│  ┌─────────────┬──────────────┬─────────────┬─────────────┐ │
│  │historyTaking│ physicalExam │ancillaryTests│ diagnosis   │ │
│  │  .messages  │ .examHistory │  .results   │ .preliminary│ │
│  │  .notes     │ .messages    │             │ .differential││
│  ├─────────────┼──────────────┼─────────────┼─────────────┤ │
│  │treatmentPlan│ medicalRecord│             │             │ │
│  │  .content   │ (string)     │             │             │ │
│  └─────────────┴──────────────┴─────────────┴─────────────┘ │
└────────────┬───────────────┬───────────────┬────────────────┘
             │               │               │
    ┌────────▼─────┐  ┌──────▼──────┐  ┌─────▼──────────┐
    │useOperationLog│  │useExpertContext│ │AICompanionDrawer│
    │(UI操作记录面板)│  │(AI智能体上下文)│  │(双Tab智能体UI)  │
    └──────────────┘  └─────────────┘  └────────────────┘
```

---

## 3. 数据模型

### 3.1 Store 核心状态

```typescript
// apps/training/src/stores/training.js — 关键字段
interface TrainingStoreState {
  // 病例数据
  currentCase: CaseObject | null          // 当前加载的病例完整对象
  currentFlowIndex: number                // 当前考站索引（0-based）

  // 考站流配置
  stationFlow: StationFlow | null         // flow mode 考站定义
  stationScheme: StationSchemeItem[] | null // 备选方案

  // 训练会话数据（所有考站提交的数据，跨站持久化）
  trainingSession: TrainingSession        // 扁平 key-value，key 为 sessionKey

  // 训练记录
  trainingVersion: '1.0' | '2.0' | 'full-flow'

  // 评分相关
  sessions: TrainingRecord[]
  sessionEpoch: number

  // 国际化
  lang: 'zh' | 'en'

  // 应用版本
  appVersion: '1.0' | '2.0'
}
```

### 3.2 StationFlow — 考站流定义

```typescript
interface StationFlow {
  stations: FlowStation[]
  currentIndex: number
}

interface FlowStation {
  name: string                    // 中文考站名称，如"接诊病人站"
  duration: number                // 时长（分钟）
  projects: string[]              // 该站包含的模块，如 ["病史采集", "体格检查"]
  routeName?: string              // 运行时注入的路由名
  routeLabel?: string             // 运行时注入的显示标签
  scoreTables?: ScoreTableRef[]   // 关联的评分表
}

interface ScoreTableRef {
  templateCode: string
  bindProjects: string[]
}
```

### 3.3 TrainingSession

```typescript
// 扁平对象，每个 key 存储一个考站的运行时数据
// key 来源：STATION_TO_SESSION_KEY (from @ai-sp/shared)
interface TrainingSession {
  // 对话类考站
  historyTaking?: DialogStationData
  physicalExam?: PhysicalExamStationData
  mentalExam?: DialogStationData
  humanisticComm?: DialogStationData

  // 选择类考站
  ancillaryTests?: AncillaryTestsData
  diagnosis?: DiagnosisStationData
  preliminaryDiag?: DiagnosisStationData

  // 文本输入类考站
  caseAnalysis?: CaseAnalysisData
  medicalRecord?: string | { content: string }     // 纯文本或包装对象
  treatmentPlan?: TreatmentPlanData

  // 其他字段
  [key: string]: unknown
}

interface DialogStationData {
  messages: Message[]
  notes?: string
  markedCount?: number
}

interface PhysicalExamStationData {
  messages: Message[]
  examHistory?: ExamRecord[]
}

interface AncillaryTestsData {
  results: AncillaryTestResult[]    // ★ 新版LLM格式，直接包含检查项目
  submittedAt?: string
  duration?: number
}

interface AncillaryTestResult {
  name: string
  category?: string
  categoryLabel?: string
  result?: string
  source?: string
  viewed?: boolean
}

interface DiagnosisStationData {
  preliminary?: string
  differential?: string
  basis?: string
  differentialDetails?: Array<{ name: string; evidence: string }>
}

interface CaseAnalysisData {
  questions: string[]
  answers: string[]
}

interface TreatmentPlanData {
  content: string
}

interface Message {
  role: 'user' | 'sp' | 'system'
  content: string
}

interface ExamRecord {
  original: string
  lower: string
}
```

### 3.4 CaseObject — 病例数据

```typescript
interface CaseObject {
  id: string | number
  caseId?: string
  title?: string
  disease?: string
  specialty?: string
  difficulty?: string
  chiefComplaint?: string
  symptoms?: string[]
  patient?: {
    name?: string
    sex?: string        // '男' | '女'
    gender?: string     // 部分视图使用 gender
    age?: string | number
    avatar?: string
    idleVideo?: string
    pregnancy?: string
    occupation?: string
  }
  basic?: CaseBasicData   // 从 JSON 加载的原始数据
  // ... 其他扩展字段
}
```

### 3.5 CaseBasicData — 病例 JSON 文件结构

```typescript
// 存储于 apps/admin/public/data/cases/{caseId}-basic.json
interface CaseBasicData {
  case_id: string
  specialty: string
  category: string
  disease: string
  difficulty: string            // 如 "R1"
  teaching_phase?: string       // 如 "住院医师"
  version: string
  symptoms: string[]
  patient_info: {
    name: string
    age: string                 // 如 "56岁"
    sex: '0' | '1'             // '0'=女 '1'=男（中国医疗标准）
    occupation?: string
    education?: string
    pregnancy?: string
  }
  chief_complaint: string
  present_illness?: string
  past_history?: string
  physical_exam?: {
    vital_signs: string         // 如 "T 39.2℃，P 112次/分，R 22次/分，BP 90/60 mmHg，SpO2 98%"
  }
  diagnosis?: {
    preliminary?: string
    differential?: string[]
    basis?: string[]
  }
  treatment_plan?: string
  // ... 更多字段
}
```

---

## 4. TrainingLayout — 布局容器

### 4.1 文件

**`apps/training/src/layouts/TrainingLayout.vue`**

### 4.2 职责

1. 渲染全局 header（仅非考站路由时显示：首页/病例列表/病例详情）
2. 渲染面包屑导航（仅非考站路由时显示）
3. 提供 `<router-view>` 渲染考站视图
4. 挂载 `AICompanionDrawer`（仅考站路由时显示）
5. 通过 `@ai-sp/shared` 的 `bottomBar` 管理底部浮动按钮

### 4.3 考站路由判断

```typescript
const stationRoutes = [
  'historyTaking', 'physicalExam', 'ancillaryTests', 'diagnosis',
  'treatmentPlan', 'medicalRecord', 'caseAnalysis', 'humanisticComm', 'mentalExam'
]

const isStationRoute = computed(() => stationRoutes.includes(route.name))
```

### 4.4 关键代码

```typescript
// 底部按钮管理
import { review, requirement, bottomBar, createDefaultActions, resolveAppUrls } from '@ai-sp/shared'

const actions = createDefaultActions(route, {
  reviewAction: () => { review.toggle(route.name) },
  requirementAction: () => { requirement.toggle(route.name) },
  btns: [
    { label: '管理端', url: urls.admin, name: 'ai-sp-admin', style: { background: '#4A90E2', color: '#fff' } },
  ]
})

onMounted(() => {
  bottomBar.render(actions)
  review.setViewName(route.name || '')
})
```

### 4.5 模板结构

```html
<div class="training-container">
  <!-- header: 仅 isStationRoute === false 时显示 -->
  <header class="app-header" v-if="!isStationRoute">...</header>

  <!-- 面包屑: 仅 isStationRoute === false 时显示 -->
  <div class="breadcrumb-bar" v-if="crumbs.length && !isStationRoute">...</div>

  <!-- 考站视图 -->
  <router-view v-slot="{ Component }">
    <transition name="fade">
      <component :is="Component" />
    </transition>
  </router-view>

  <!-- AI抽屉: 仅考站路由时显示 -->
  <AICompanionDrawer v-if="isStationRoute" />
</div>
```

---

## 5. TrainingTopBar — 顶部导航栏

### 5.1 文件

**`apps/training/src/components/TrainingTopBar.vue`**

### 5.2 两种导航模式

TrainingTopBar 通过 props 区分两种导航模式：

| Props | 单考站模式 | Flow 模式 |
|-------|----------|----------|
| `steps` | `[{ label, route }]` | — |
| `stepIndex` | 当前模块索引 | — |
| `flowSteps` | — | `[{ name, label, ... }]` |
| `flowStepIndex` | — | 当前考站索引 |
| `stationName` | 考站名称 | "临床思维模拟训练" |
| `hideStepNumber` | false | true |

### 5.3 模板结构

```html
<div class="training-topbar">
  <!-- 左侧：home图标 + 考站名称 + 语言切换 -->
  <div class="station-left">
    <span class="home-link" @click="..."><i class="fa-solid fa-house"></i></span>
    <span class="station-name">{{ stationName }}</span>
    <button v-if="showLangToggle" class="lang-toggle-btn" @click="...">
      <i class="fa-solid fa-language"></i> {{ langLabel }}
    </button>
  </div>

  <!-- Flow 模式：考站级导航（紧凑样式） -->
  <div v-if="flowSteps && flowSteps.length > 0" class="progress-bar-wrap flow-nav">
    <div class="progress-steps">
      <template v-for="(step, si) in flowSteps" :key="si">
        <div class="progress-step"
          :class="{ active: flowStepIndex === si, clickable: flowStepIndex !== si, 'no-dot': true }"
          @click="$emit('flow-step-click', si, step)">
          <span class="step-label">{{ step.label }}</span>
        </div>
        <div v-if="si < flowSteps.length - 1" class="progress-line"></div>
      </template>
    </div>
  </div>

  <!-- 单考站模式：模块级导航（带序号圆点） -->
  <div v-else-if="steps && steps.length > 0" class="progress-bar-wrap">
    <div class="progress-steps">
      <template v-for="(step, si) in steps" :key="si">
        <div class="progress-step"
          :class="{ active: stepIndex === si, done: stepIndex > si, clickable: canClickStep(si) }"
          @click="$emit('step-click', si)">
          <span v-if="!hideStepNumber" class="step-dot">
            <i v-if="stepIndex > si" class="fa-solid fa-check"></i>
            <span v-else>{{ si + 1 }}</span>
          </span>
          <span class="step-label">{{ step.label }}</span>
        </div>
        <div v-if="si < steps.length - 1" class="progress-line" :class="{ done: stepIndex > si }"></div>
      </template>
    </div>
  </div>

  <!-- 无步骤时使用 slot -->
  <div v-else class="topbar-center"><slot name="center"></slot></div>

  <!-- 右侧：计时器 + 结束按钮 -->
  <div class="topbar-right">
    <span class="timer" :class="timerClass">{{ formattedTime }}</span>
    <button class="end-btn" :class="{ 'next-btn': endIcon === 'fa-arrow-right' }" @click="$emit('end')">
      <i :class="'fa-solid ' + endIcon"></i> {{ endLabel }}
    </button>
  </div>
</div>
```

### 5.4 Props 完整列表

```typescript
interface TrainingTopBarProps {
  stationName: string           // 必填，顶部标题
  steps: StepItem[]             // 单考站模式的步骤列表
  stepIndex: number             // 当前步骤索引
  formattedTime: string         // 已格式化的计时器显示
  endLabel: string              // 结束按钮文字，默认 '结束训练'
  endIcon: string               // 结束按钮图标，默认 'fa-right-from-bracket'
  allowBack: boolean            // 是否允许后退，默认 false
  timerClass: string            // 计时器样式类
  showLangToggle: boolean       // 是否显示语言切换
  langLabel: string             // 语言标签文字
  hideStepNumber: boolean       // 是否隐藏步骤序号
  allowAdvance: boolean         // 是否允许前进，默认 true
  flowSteps: FlowStepItem[] | null  // flow 模式的考站列表
  flowStepIndex: number         // 当前考站索引
}

interface StepItem {
  label: string
  route: string
}
```

### 5.5 Events

| Event | 参数 | 说明 |
|-------|------|------|
| `step-click` | `(index: number)` | 单考站模式：点击步骤 |
| `flow-step-click` | `(index: number, step: FlowStation)` | Flow模式：点击考站 |
| `end` | — | 点击结束/下一站按钮 |
| `toggle-lang` | — | 点击语言切换按钮 |

---

## 6. useStationFlow — 考站流转引擎

### 6.1 文件

**`apps/training/src/composables/useStationFlow.js`**

### 6.2 导出映射表

```typescript
// 考站名称 → 路由名称
const STATION_ROUTE_MAP: Record<string, { route: string; label: string }> = {
  '接诊病人站':   { route: 'historyTaking',  label: '接诊病人' },
  '接诊和沟通站': { route: 'historyTaking',  label: '接诊和沟通' },
  '病史采集站':   { route: 'historyTaking',  label: '病史采集' },
  '体格检查站':   { route: 'physicalExam',   label: '体格检查' },
  '临床思维站':   { route: 'caseAnalysis',   label: '临床思维' },
  '交流沟通站':   { route: 'humanisticComm', label: '交流沟通' },
  '病历书写站':   { route: 'medicalRecord',  label: '病历书写' },
  '精神检查站':   { route: 'mentalExam',     label: '精神检查' },
}

// 模块（项目）名称 → 路由名称
const PROJECT_ROUTE_MAP: Record<string, { route: string }> = {
  '病史采集': { route: 'historyTaking' },
  '体格检查': { route: 'physicalExam' },
  '辅助检查': { route: 'ancillaryTests' },
  '初步诊断': { route: 'diagnosis' },
  '诊断':     { route: 'diagnosis' },
  '治疗计划': { route: 'treatmentPlan' },
  '病历书写': { route: 'medicalRecord' },
  '病例分析': { route: 'caseAnalysis' },
  '人文沟通': { route: 'humanisticComm' },
  '精神检查': { route: 'mentalExam' },
}

// 考核项目名称 → station target（评分分发用）
const PROJECT_TO_STATION_TARGET: Record<string, string> = {
  '病史采集': 'historyTaking',
  '体格检查': 'physicalExam',
  '辅助检查': 'ancillaryTests',
  '初步诊断': 'diagnosis',
  '诊断':     'diagnosis',
  '治疗计划': 'treatmentPlan',
  '病历书写': 'medicalRecord',
  '病例分析': 'caseAnalysis',
  '人文沟通': 'humanisticComm',
  '交流沟通站': 'humanisticComm',
  '精神检查': 'mentalExam',
}
```

### 6.3 resolveNextInFlow — 计算下一步

```typescript
/**
 * 根据当前考站流配置，计算给定路由的下一步目标。
 * 在 computed 中调用，禁止修改 store 状态。
 *
 * @returns { stationName, nextRoute, nextLabel, isLast, advanceToStation }
 */
function resolveNextInFlow(
  store: TrainingStore,
  currentRouteName: string
): FlowContext {
  const stations = store.stationScheme || store.stationFlow?.stations || []
  const stationIdx = store.currentFlowIndex ?? 0
  const cur = stations[stationIdx]

  if (!cur?.projects || cur.projects.length === 0) {
    return { stationName: cur?.name || '', nextRoute: null, nextLabel: '', isLast: true, advanceToStation: -1 }
  }

  const projects = cur.projects
  const localIdx = projects.findIndex(p => PROJECT_ROUTE_MAP[p]?.route === currentRouteName)

  if (localIdx >= 0 && localIdx < projects.length - 1) {
    // 当前考站还有下一个模块
    const next = projects[localIdx + 1]
    return {
      stationName: cur.name || '',
      nextRoute: PROJECT_ROUTE_MAP[next]?.route,
      nextLabel: next,
      isLast: false,
      advanceToStation: -1,
    }
  }

  // 当前考站最后一个模块，检查是否有下一个考站
  if (stationIdx + 1 < stations.length) {
    const nextStation = stations[stationIdx + 1]
    const firstProject = nextStation.projects?.[0] || nextStation.name
    return {
      stationName: cur.name || '',
      nextRoute: PROJECT_ROUTE_MAP[firstProject]?.route,
      nextLabel: firstProject,
      isLast: false,
      advanceToStation: stationIdx + 1,
    }
  }

  return { stationName: cur.name || '', nextRoute: null, nextLabel: '', isLast: true, advanceToStation: -1 }
}
```

### 6.4 useStationFlow — 考站流加载

```typescript
function useStationFlow() {
  // 应用考站配置（注入 routeName, routeLabel, scoreTables）
  function applyStations(stationList: FlowStation[]) { ... }

  // 根据专业加载考站方案
  function loadStations(specialty: string) {
    // 1. 优先从 MAJOR_STATIONS 查找
    // 2. 没有则使用 DEFAULT_MAJOR ('内科') 的方案
  }

  return { applyStations, loadStations }
}
```

---

## 7. 视图集成模式

### 7.1 每个考站视图的标准结构

```typescript
// ═══ 每个考站视图都遵循以下模式 ═══

// ── 1. 数据加载 ──
const { caseData, loadCase } = useCaseLoader()

// ── 2. 病例数据计算 ──
const c = computed(() => {
  const basic = caseData.value.basic
  if (!basic) {
    // fallback: 使用 store.currentCase 中的缓存数据
    const mc = store.currentCase || {}
    return { patient: { name, gender, age, ... }, chiefComplaint, vitals: {}, ... }
  }
  // 正常路径: 从 basic JSON 解析
  const pi = basic.patient_info || {}
  return {
    patient: { name, gender: parseSex(pi.sex), age, avatar, ... },
    chiefComplaint: basic.chief_complaint,
    vitals: parseVitals(basic.physical_exam?.vital_signs),
    ...
  }
})

// ── 3. Steps（模块级导航） ──
const stationProjects = computed(() => {
  if (store.stationFlow?.stations && store.currentFlowIndex != null) {
    const st = store.stationFlow.stations[store.currentFlowIndex]
    return st?.projects || [st?.name].filter(Boolean)
  }
  return []
})

const steps = computed(() => {
  // 优先从 stationFlow 当前考站获取项目列表
  if (stationProjects.value.length > 0) {
    return stationProjects.value.map(p => {
      const mapped = PROJECT_ROUTE_MAP[p]
      return { label: p, route: mapped?.route || 'diagnosis' }
    })
  }
  // 备选: stationScheme
  if (store.stationScheme?.length) { ... }
  // 兜底: 单模块
  return [{ label: '诊断', route: 'diagnosis' }]
})

const stepIndex = computed(() => steps.value.findIndex(s => s.route === route.name))

// ── 4. Flow steps（考站级导航） ──
const flowSteps = computed(() => {
  const stations = store.stationFlow?.stations
  if (!stations?.length || stations.length <= 1) return null
  return stations.map(s => ({ ...s, label: s.name }))
})

const flowStepIndex = computed(() => store.currentFlowIndex ?? 0)

// ── 5. 标题 ──
const topBarTitle = computed(() => {
  if (flowSteps.value) return lang.value === 'zh' ? '临床思维模拟训练' : 'Clin. Thinking Simulation'
  return flowCtx.value.stationName || (lang.value === 'zh' ? '诊断' : 'Diagnosis')
})

// ── 6. 考站切换处理 ──
function onFlowStepClick(idx, step) {
  if (idx === flowStepIndex.value) return
  forwardNav.value = true
  store.currentFlowIndex = idx
  if (store.stationFlow) store.stationFlow.currentIndex = idx

  // ★ 切换前先保存当前考站数据到 trainingSession
  store.trainingSession = store.trainingSession || {}
  store.trainingSession[currentSessionKey] = { /* 当前页面的所有数据 */ }
  store.saveTrainingSession()

  // 跳转到目标考站
  router.replace({ name: step.routeName, query: { caseId: store.currentCase?.id || '' } })
}

// ── 7. 操作记录（仅面板型视图） ──
const logEntries = computed(() => buildOperationLog(store.trainingSession))
function getEntry(key: string) { return logEntries.value.find(e => e.key === key) }

// ── 8. 流转上下文 ──
const flowCtx = computed(() => resolveNextInFlow(store, route.name))
```

### 7.2 模板中的 TrainingTopBar 调用

```html
<TrainingTopBar
  :station-name="topBarTitle"
  :steps="steps"
  :step-index="stepIndex"
  :flow-steps="flowSteps"
  :flow-step-index="flowStepIndex"
  :formatted-time="formattedTime"
  :end-label="flowCtx.isLast ? '结束训练' : '下一站'"
  :end-icon="flowCtx.isLast ? 'fa-right-from-bracket' : 'fa-arrow-right'"
  :show-lang-toggle="true"
  :lang-label="lang === 'zh' ? 'EN' : '中'"
  @end="handleEndSession"
  @step-click="onStepClick"
  @flow-step-click="onFlowStepClick"
  @toggle-lang="toggleLang"
/>
```

---

## 8. 考站内模块流转（steps）

### 8.1 概念

Flow mode 下存在两级导航：

- **考站级** (`flowSteps`)：在 TrainingTopBar 中以紧凑样式显示，一个考站包含多个模块
- **模块级** (`steps`)：在一个考站内，不同的 tab/页面代表不同模块

例如：`接诊病人站` 包含 `[病史采集, 体格检查]` 两个模块，学员在同一考站内在两个模块间切换。

### 8.2 Steps 计算逻辑

```
stationFlow.stations[currentFlowIndex].projects
  → 通过 PROJECT_ROUTE_MAP 映射到 { label, route }
  → steps
  → stepIndex = steps.findIndex(s => s.route === route.name)
```

### 8.3 模块切换流程

```
用户点击 step → onStepClick(index)
  → router.push({ name: steps[index].route, query: { caseId } })
  → 新视图加载，stepIndex 自动更新
  → TrainingTopBar 高亮切换
```

### 8.4 跨考站导航流程

```
用户点击 flow step → onFlowStepClick(index, step)
  → 保存当前考站数据到 trainingSession
  → saveTrainingSession()
  → store.currentFlowIndex = index
  → router.replace({ name: step.routeName, query: { caseId } })
  → 新考站视图加载
```

---

## 9. 数据保存与持久化

### 9.1 自动保存

每个考站视图在以下时机保存数据到 `trainingSession`：

1. **切换考站时**（`onFlowStepClick`）：保存当前站所有数据
2. **切换模块时**（`onStepClick`）：部分视图也保存
3. **定时自动保存**：通过 `store.saveTrainingSession()` 推送到服务端

### 9.2 持久化层

```typescript
// store 中的 watch
watch(trainingSession, (val) => {
  localStorage.setItem('training-session', JSON.stringify(val))
}, { deep: true })

// saveTrainingSession —— 推送到服务端
async function saveTrainingSession() {
  await fetch('/api/training/session-save', {
    method: 'POST',
    body: JSON.stringify(trainingSession.value),
    headers: { 'Content-Type': 'application/json' }
  })
}
```

### 9.3 STATION_TO_SESSION_KEY 映射

```typescript
// 来自 @ai-sp/shared
const STATION_TO_SESSION_KEY = {
  historyTaking: 'historyTaking',
  physicalExam: 'physicalExam',
  mentalExam: 'mentalExam',
  humanisticComm: 'humanisticComm',
  // ancillaryTests 和 diagnosis 由 useExpertContext 补充
  caseAnalysis: 'caseAnalysis',
  medicalRecord: 'medicalRecord',
  treatmentPlan: 'treatmentPlan',
  preliminaryDiag: 'preliminaryDiag',
}
```

---

## 10. 文件清单与依赖关系

### 10.1 文件清单

```
apps/training/src/
├── layouts/
│   └── TrainingLayout.vue              ← 布局容器，挂载 AICompanionDrawer
├── components/
│   ├── TrainingTopBar.vue              ← 顶部导航栏（两种模式）
│   ├── PatientInfoPanel.vue            ← 患者信息共享组件
│   ├── FloatInfoPanel.vue              ← 浮动信息面板（对话类考站用）
│   ├── StationRecordPanel.vue          ← 操作记录渲染组件
│   └── AICompanionDrawer.vue           ← AI伴学+专家点评抽屉
├── composables/
│   ├── useStationFlow.js               ← 考站流转引擎 + 映射表
│   ├── useOperationLog.js              ← 操作记录提取器
│   ├── useExpertContext.js             ← AI活动感知层
│   ├── useExpertAgent.js               ← 专家点评智能体
│   ├── useAICompanion.js               ← AI伴学智能体
│   ├── useAIChat.js                    ← LLM调用封装
│   ├── useCaseLoader.js                ← 病例JSON加载器
│   └── useUtils.js                     ← parseVitals等工具函数
├── stores/
│   └── training.js                     ← Pinia store（trainingSession等）
└── views/
    ├── diagnosis/Diagnosis.vue         ← 诊断页（固定面板型）
    ├── ancillary-tests/AncillaryTests.vue ← 辅检页（固定面板型）
    ├── treatment-plan/TreatmentPlan.vue   ← 治疗页（固定面板型）
    ├── medical-record/MedicalRecord.vue   ← 病历页（固定面板型）
    ├── history-taking/HistoryTaking.vue   ← 病史采集（浮动面板型）
    ├── physical-exam/PhysicalExam.vue     ← 体格检查（浮动面板型）
    ├── mental-exam/MentalExam.vue         ← 精神检查（浮动面板型）
    └── humanistic-comm/HumanisticComm.vue ← 人文沟通（浮动面板型）

packages/shared/src/
├── index.js                            ← 评审引擎 + BottomActionBar + 共用导出
└── station-constants.js                ← 考站常量（STATION_TO_SESSION_KEY等）
```

### 10.2 依赖图

```
TrainingLayout.vue
  ├── AICompanionDrawer.vue
  │     ├── useAICompanion.js ──→ useExpertContext.js ──→ @ai-sp/shared
  │     └── useExpertAgent.js ──→ useExpertContext.js ──→ @ai-sp/shared
  │
  └── [各考站视图]
        ├── TrainingTopBar.vue
        ├── PatientInfoPanel.vue
        ├── StationRecordPanel.vue ──→ useOperationLog.js
        ├── FloatInfoPanel.vue
        │     ├── PatientInfoPanel.vue
        │     └── useOperationLog.js
        └── useStationFlow.js ──→ @ai-sp/shared
```

---

## 11. 设计决策记录

### 决策1：为什么两级导航（考站级 + 模块级）？

临床思维模拟训练模拟真实诊疗流程：接诊→查体→辅检→诊断→治疗→病历。每个阶段是一个考站，考站内可能包含多个子模块（如接诊病人站包含病史采集+体格检查）。两级导航清晰反映这种层次结构。

### 决策2：为什么 flow mode 的标题统一为"临床思维模拟训练"？

多个考站名称（接诊病人站/体格检查站/诊断站…）放在标题栏会让学员困惑当前处于哪个模式。统一标题明确告知学员处于"模拟训练"场景，考站位置通过 flowSteps 高亮指示。

### 决策3：为什么考站切换需要先保存数据？

训练数据需要在跨考站时保持完整。如果切换时丢失当前站数据，后续的 AI 点评和成绩报告将不完整。保存发生在切换动作中，无需学员手动保存。

### 决策4：为什么面板型和浮动型使用不同方案？

对话类考站是全屏对话界面（聊天窗口通常占满主区域），没有固定侧栏的空间。浮动面板由圆形按钮触发，打开后覆盖在对话上方，不影响对话布局。

### 决策5：为什么 trainingSession 是扁平结构而非嵌套？

扁平 key-value 方便增量更新（每个考站独立读写）、方便持久化到 localStorage、方便 AI 智能体的 Data Extractor 遍历。嵌套结构会让部分更新需要 deep clone 整个对象。

### 决策6：为什么 steps 从 stationFlow.stations[currentFlowIndex].projects 获取？

同一个视图（如 Diagnosis.vue）在单考站和 flow 模式下的步骤列表不同。单考站模式只有一个"诊断"步骤，flow 模式下该考站可能包含"辅助检查→初步诊断→诊断"三个模块。动态获取 ensures 的 steps 始终正确。

---

## 附录A：新增考站检查清单

当需要新增一个考站时，需要修改以下位置：

1. `@ai-sp/shared` 的 `station-constants.js`：添加 ID→Label、session key 映射
2. `useStationFlow.js`：在 `STATION_ROUTE_MAP`、`PROJECT_ROUTE_MAP` 中添加映射
3. `TrainingLayout.vue`：在 `stationRoutes` 数组中添加路由名
4. `useExpertContext.js`：在 `STATION_CATEGORY` 中添加分类，必要时编写 Extractor
5. `useOperationLog.js`：在 `STATION_ORDER` 和 `EXTRACTORS` 中添加考站
6. 创建 vue 视图文件
7. 添加路由配置
8. 在 `AICompanionDrawer.vue` 的 `stationQuestionMap` 和 `expertQuestionMap` 中添加初始推荐问题

## 附录B：flow mode 启动流程

```
1. 用户在病例详情页点击"临床思维模拟训练"
2. store 中设置 stationFlow = { stations: [...6个考站], currentIndex: 0 }
3. 获取第一个考站的第一个模块路由：stationFlow.stations[0].projects[0] → route
4. router.push({ name: route, query: { caseId } })
5. 视图 onMounted: loadCase(caseId) → 解析 basic JSON → c computed 就绪
6. 视图计算 flowSteps, steps, stepIndex, topBarTitle
7. TrainingTopBar 渲染 flow 模式导航
8. 左侧面板显示 flow-only tabs（如果有）
9. 学员在不同考站间点击切换，每次切换先保存 trainingSession
```
