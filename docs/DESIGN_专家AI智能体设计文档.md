# AI-SP 智能体设计文档

> 版本：v2.1 | 日期：2026-07-30
>
> 本文档描述两个AI智能体的完整设计：**专家点评智能体** 和 **AI伴学智能体**。
> 文档目标是：交给AI coding助手后，可直接根据本文档构建和复现两个智能体的全部功能。
>
> 代码示例全部使用 TypeScript，包含完整的类型定义和接口声明。

---

## 目录

1. [双智能体概览](#1-双智能体概览)
2. [共享类型定义](#2-共享类型定义)
3. [共享基础设施](#3-共享基础设施)
4. [专家点评智能体](#4-专家点评智能体)
5. [AI伴学智能体](#5-ai伴学智能体)
6. [前端集成](#6-前端集成)
7. [文件清单与依赖关系](#7-文件清单与依赖关系)
8. [配置与扩展](#8-配置与扩展)
9. [设计决策记录](#9-设计决策记录)

---

## 1. 双智能体概览

### 1.1 定位与差异

系统中有两个AI智能体，共用同一个抽屉UI（`AICompanionDrawer.vue`），分属两个Tab：

| 维度 | 专家点评智能体 | AI伴学智能体 |
|------|-------------|------------|
| **Tab名称** | 专家点评 | AI伴学 |
| **人设** | 真实临床专家（如滕皋军院士），有姓名、职称、头像 | 虚拟教学助手，无具体身份 |
| **核心能力** | 点评学员操作表现，指出不足和改进方向 | 答疑解惑、引导思考、讲解知识 |
| **知识来源** | 专家编撰的 `expertKB`（病例专属知识库） | 通用医学知识 + 病例基本信息 |
| **活动感知用途** | 收集操作记录 → 作为点评对象 | 了解学员进度 → 给出针对性引导和举例 |
| **能否点评学员** | **能，这是核心功能** | **不能，明确禁止评判学员表现** |
| **语气风格** | 权威、评判性、第一人称"我" | 支持性、引导性、苏格拉底式反问 |
| **推荐问题方向** | 追问不足、改进建议 | 探索知识、深入理解 |
| **配置文件** | `/data/cases/{caseId}-expert.json` | 无额外配置，使用病例基本信息 |
| **文件** | `useExpertAgent.ts` | `useAICompanion.ts` |

### 1.2 共享与分治

```
┌─────────────────────────────────────────────────────────┐
│                    共享基础设施                           │
│  useAIChat.ts          ← LLM HTTP调用（两个智能体共用）     │
│  useExpertContext.ts   ← 活动感知 + Data Extractors（共用） │
│  AICompanionDrawer.vue ← UI层（两个Tab共用一个组件）        │
└─────────────────────────────────────────────────────────┘
          │                              │
          ▼                              ▼
┌──────────────────┐          ┌──────────────────┐
│ useExpertAgent.ts│          │ useAICompanion.ts │
│  专家点评智能体    │          │  AI伴学智能体      │
│  (五层流水线)     │          │  (五层流水线)      │
└──────────────────┘          └──────────────────┘
```

两个智能体各自独立实现五层流水线（架构模式相同，每层内容不同）。共享层提供LLM调用、活动感知和UI框架。

---

## 2. 共享类型定义

本章定义全文所有模块共用的 TypeScript 类型。后续各章代码直接引用这些类型。

### 2.1 LLM 通信类型

```typescript
interface LLMMessage {
  role: 'user' | 'assistant'
  content: string
}

interface LLMOptions {
  temperature?: number
  maxTokens?: number
  timeout?: number
  model?: string
}

interface LLMResult {
  ok: boolean
  content: string
}

interface LLMRequest {
  messages: LLMMessage[]
  system: string
  temperature: number
  max_tokens: number
  model?: string
}

interface LLMResponse {
  ok: boolean
  content?: string
  error?: string
}
```

### 2.2 考站与消息类型

```typescript
type StationCategory = 'dialog' | 'selection' | 'text-input' | 'special'

type StationId =
  | 'historyTaking'
  | 'physicalExam'
  | 'mentalExam'
  | 'humanisticComm'
  | 'ancillaryTests'
  | 'diagnosis'
  | 'preliminaryDiag'
  | 'caseAnalysis'
  | 'medicalRecord'
  | 'treatmentPlan'

interface Message {
  role: 'user' | 'sp' | 'system'
  content: string
}

interface ExamRecord {
  original: string
  lower: string
}

interface Selection {
  name: string
  [key: string]: unknown
}

interface Result {
  viewed: boolean
  [key: string]: unknown
}
```

### 2.3 TrainingSession 类型

由各考站运行时写入，是扁平的 key-value 对象：

```typescript
interface TrainingSession {
  // 对话类考站
  historyTaking?:   DialogStationData
  mentalExam?:      DialogStationData
  humanisticComm?:  DialogStationData

  // 体格检查（特殊对话类）
  physicalExam?: PhysicalExamStationData

  // 选择类考站
  ancillaryTests?:  AncillaryTestsData | DiagnosisStationData
  diagnosis?:       DiagnosisStationData
  preliminaryDiag?: DiagnosisStationData

  // 文本输入类考站
  caseAnalysis?:    CaseAnalysisData
  medicalRecord?:   string                // 纯文本
  treatmentPlan?:   TreatmentPlanData

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
  selections: Selection[]
  results?: Result[]
}

interface DiagnosisStationData {
  preliminary?: string
  differential?: string
  basis?: string
  final?: string
  icdCode?: string
}

interface CaseAnalysisData {
  questions: string[]
  answers: string[]
}

interface TreatmentPlanData {
  content: string
}
```

### 2.4 活动感知类型

```typescript
interface StationSnapshot {
  hasActivity: boolean
  category: StationCategory
  stationLabel: string
  summary: string | null
  detail: string | null
}

interface ActivityContext {
  currentStation: {
    id: string
    label: string
    category: StationCategory
  }
  stationSnapshots: Record<string, StationSnapshot>
  global: {
    stationsWithActivity: string[]
    stationsWithoutActivity: string[]
    recentActivityStation: string | null
    totalVisited: number
    hasAnyActivity: boolean
  }
}
```

### 2.5 病例与专家配置类型

```typescript
interface CaseInfo {
  name: string
  age: string | number
  gender: string
  chiefComplaint: string
  disease: string
  specialty: string
}

interface ExpertData {
  expertName: string
  expertTitle: string
  expertAvatar: string
  expertTags: string[]
  expertKB: string
  reviewTitle: string
}
```

### 2.6 意图类型（专家智能体）

```typescript
type ExpertIntent =
  | 'review_request'
  | 'knowledge_question'
  | 'procedural_guidance'
  | 'comparison_request'
  | 'cross_station_review'
  | 'casual_chat'

interface ExpertIntentResult {
  primaryIntent: ExpertIntent
  allIntents: Array<{ intent: ExpertIntent; score: number; confidence: number }>
  confidence: number
  hasStationRef: boolean
  needsLLMFallback: boolean
}
```

### 2.7 意图类型（AI伴学智能体）

```typescript
type CompanionIntent =
  | 'concept_explanation'
  | 'procedural_guidance'
  | 'differential_help'
  | 'case_understanding'
  | 'casual_chat'

interface CompanionIntentResult {
  primaryIntent: CompanionIntent
  allIntents: Array<{ intent: CompanionIntent; score: number; confidence: number }>
  confidence: number
  isReviewRequest: boolean
  needsLLMFallback: boolean
}
```

### 2.8 回复策略类型

```typescript
interface ResponseStrategy {
  temperature: number
  maxTokens: number
}
```

### 2.9 智能体返回类型

```typescript
interface AgentResponse {
  text: string
  followUps: string[]
  intent: ExpertIntent | CompanionIntent
}

// 专家智能体特有
interface ExpertAgentResponse extends AgentResponse {
  intent: ExpertIntent
}

// AI伴学智能体特有
interface CompanionAgentResponse extends AgentResponse {
  intent: CompanionIntent
  isReviewRequest: boolean
}
```

### 2.10 UI消息类型

```typescript
interface UIMessage {
  type: 'user' | 'ai'
  text: string
  html?: string
  followUps?: string[]
}
```

---

## 3. 共享基础设施

### 3.1 useAIChat.ts — LLM调用封装

纯HTTP封装，与业务完全无关。两个智能体各自实例化使用。

**文件：`apps/training/src/composables/useAIChat.ts`**

```typescript
import { ref, type Ref } from 'vue'

interface UseAIChatReturn {
  sendMessage: (
    messages: LLMMessage[],
    systemPrompt: string,
    opts?: LLMOptions
  ) => Promise<LLMResult>
  loading: Ref<boolean>
  error: Ref<string | null>
}

export function useAIChat(): UseAIChatReturn {
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function sendMessage(
    messages: LLMMessage[],
    systemPrompt: string,
    opts: LLMOptions = {}
  ): Promise<LLMResult> {
    loading.value = true
    error.value = null

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), opts.timeout || 30000)

      const resp = await fetch('/api/llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages,
          system: systemPrompt,
          temperature: opts.temperature ?? 0.7,
          max_tokens: opts.maxTokens ?? 2000,
          model: opts.model || undefined,
        } satisfies LLMRequest),
        signal: controller.signal,
      })
      clearTimeout(timeout)

      const json: LLMResponse = await resp.json()
      if (!json.ok) {
        error.value = json.error || 'LLM request failed'
        return { ok: false, content: '抱歉，AI服务暂时不可用，请稍后再试。' }
      }
      return { ok: true, content: json.content! }
    } catch (e: unknown) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        error.value = '请求超时，请重试'
        return { ok: false, content: '抱歉，请求超时，请稍后再试。' }
      }
      error.value = e instanceof Error ? e.message : '未知错误'
      return { ok: false, content: '抱歉，网络异常，请稍后再试。' }
    } finally {
      loading.value = false
    }
  }

  return { sendMessage, loading, error }
}
```

**LLM HTTP接口契约（`POST /api/llm`）：**

```
请求：
{
  "messages": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ],
  "system": "完整的system prompt字符串",
  "temperature": 0.5,
  "max_tokens": 3000,
  "model": "deepseek-v4-pro"     // 可选
}

成功响应：
{ "ok": true, "content": "LLM回复文本" }

错误响应：
{ "ok": false, "error": "错误描述" }
```

### 3.2 useExpertContext.ts — 活动感知层（两个智能体共用）

这是第一层（活动感知层），两个智能体都依赖它获取学员在各考站的操作摘要。

**文件：`apps/training/src/composables/useExpertContext.ts`**

**依赖：** `@ai-sp/shared` 中的 `STATION_TO_SESSION_KEY` 和 `STATION_ID_TO_LABEL`

#### 3.2.1 考站分类体系

```typescript
const STATION_CATEGORY: Record<string, StationCategory> = {
  historyTaking:  'dialog',
  physicalExam:   'dialog',
  mentalExam:     'dialog',
  humanisticComm: 'dialog',
  ancillaryTests: 'selection',
  diagnosis:      'selection',
  preliminaryDiag:'selection',
  caseAnalysis:   'text-input',
  medicalRecord:  'text-input',
  treatmentPlan:  'text-input',
}
```

#### 3.2.2 路由名→Session Key 映射

```typescript
import { STATION_TO_SESSION_KEY } from '@ai-sp/shared'

// 补充 STATION_TO_SESSION_KEY 缺失的映射
const ROUTE_TO_SESSION_KEY: Record<string, string> = {
  ...STATION_TO_SESSION_KEY,
  ancillaryTests: 'ancillaryTests',
  diagnosis: 'diagnosis',
}
```

#### 3.2.3 Data Extractor 实现

每个Extractor输入：`trainingSession[sessionKey]`（单个考站的原始数据），输出：`StationSnapshot | null`

**Extractor 1 — 对话类考站（病史采集/精神检查/人文沟通）：**

```typescript
function extractDialogStation(sessionData: DialogStationData | undefined): StationSnapshot | null {
  const messages = sessionData?.messages || []
  const notes = sessionData?.notes || ''
  const markedCount = sessionData?.markedCount || 0
  if (messages.length === 0) return null

  const userMsgs = messages.filter(m => m.role === 'user')
  const spMsgs = messages.filter(m => m.role === 'sp')
  const parts: string[] = [`共${messages.length}轮对话（学员发言${userMsgs.length}条）`]

  if (markedCount > 0) parts.push(`学员标记了${markedCount}条重要信息作为笔记`)
  if (notes) parts.push(`学员笔记：${notes.slice(0, 200)}`)

  const last5 = messages.slice(-5)
  const topics = last5
    .filter(m => m.role === 'user')
    .map(m => m.content?.slice(0, 40))
    .filter(Boolean)
  if (topics.length > 0) parts.push(`最近话题：${topics.join(' | ')}`)

  return {
    hasActivity: true,
    summary: parts.join('。'),
    detail: messages.filter(m => m.role === 'user').slice(-5)
      .map(m => `学员：${m.content}`).join('\n'),
    category: 'dialog',
    stationLabel: '',
  }
}
```

**Extractor 2 — 体格检查（特殊对话类）：**

```typescript
function extractPhysicalExam(
  sessionData: PhysicalExamStationData | undefined
): StationSnapshot | null {
  const messages = sessionData?.messages || []
  const examHistory = sessionData?.examHistory || []
  if (messages.length === 0 && examHistory.length === 0) return null

  const parts: string[] = []
  if (examHistory.length > 0) {
    const operations = examHistory.slice(-15)
      .map(e => e.original || e.lower).filter(Boolean)
    parts.push(`共${examHistory.length}次体检操作`)
    if (operations.length > 0) parts.push(`最近操作：${operations.join(' → ')}`)
  }
  if (messages.length > 0) {
    parts.push(`${messages.length}条系统反馈消息`)
  }

  return {
    hasActivity: true,
    summary: parts.join('。'),
    detail: messages.slice(-5).map(m => `系统：${m.content?.slice(0, 100)}`).join('\n'),
    category: 'dialog',
    stationLabel: '',
  }
}
```

**Extractor 3 — 选择类考站（辅助检查/诊断/初步诊断）：**

```typescript
function extractSelectionStation(
  sessionData: AncillaryTestsData | DiagnosisStationData | undefined
): StationSnapshot | null {
  if (!sessionData) return null

  // 辅助检查站：检测 selections 数组
  if ('selections' in sessionData && Array.isArray(sessionData.selections)) {
    const selected = sessionData.selections
    if (selected.length === 0) return null
    const names = selected.map(s => s.name).filter(Boolean)
    const results = ('results' in sessionData
      ? (sessionData as AncillaryTestsData).results?.filter(r => r.viewed)
      : []) || []
    const parts = [`选择了${selected.length}项辅助检查：${names.join('、')}`]
    if (results.length > 0) parts.push(`已查看${results.length}项检查结果`)
    return {
      hasActivity: true,
      summary: parts.join('。'),
      detail: names.join('\n'),
      category: 'selection',
      stationLabel: '',
    }
  }

  // 诊断站/初步诊断站：检测诊断字段
  const diag = sessionData as DiagnosisStationData
  const { preliminary, differential, basis, final, icdCode } = diag

  if (!preliminary && !differential && !basis && !final) return null

  const parts: string[] = []
  if (preliminary) parts.push(`初步诊断：${preliminary}`)
  if (differential) parts.push(`鉴别诊断：${differential}`)
  if (basis) parts.push(`诊断依据：${basis.slice(0, 300)}`)
  if (final) parts.push(`最终诊断：${final}${icdCode ? `（ICD：${icdCode}）` : ''}`)

  return {
    hasActivity: true,
    summary: parts.join('；'),
    detail: parts.join('\n'),
    category: 'selection',
    stationLabel: '',
  }
}
```

**Extractor 4 — 文本输入类考站（临床思维/病历书写/治疗计划）：**

```typescript
function extractTextInputStation(
  sessionData: CaseAnalysisData | string | TreatmentPlanData | undefined
): StationSnapshot | null {
  if (!sessionData) return null

  // 临床思维站：{ questions, answers }
  if (typeof sessionData === 'object' && 'answers' in sessionData && 'questions' in sessionData) {
    const ca = sessionData as CaseAnalysisData
    const answered = ca.answers.filter(Boolean).length
    if (answered === 0) return null
    const parts: string[] = [`共${ca.questions.length}道病例分析题，已作答${answered}题`]
    ca.answers.forEach((ans, i) => {
      if (ans) parts.push(`第${i + 1}题答案：${ans.slice(0, 150)}`)
    })
    return {
      hasActivity: true,
      summary: parts[0],
      detail: parts.join('\n'),
      category: 'text-input',
      stationLabel: '',
    }
  }

  // 病历书写站：纯文本字符串
  if (typeof sessionData === 'string') {
    const text = sessionData.trim()
    if (!text) return null
    return {
      hasActivity: true,
      summary: `已撰写病历，共${text.length}字`,
      detail: text.slice(0, 500),
      category: 'text-input',
      stationLabel: '',
    }
  }

  // 治疗计划站：{ content }
  if (typeof sessionData === 'object' && 'content' in sessionData) {
    const tp = sessionData as TreatmentPlanData
    return {
      hasActivity: true,
      summary: `已制定治疗计划，共${tp.content.length}字`,
      detail: tp.content.slice(0, 500),
      category: 'text-input',
      stationLabel: '',
    }
  }

  return null
}
```

#### 3.2.4 主入口：buildActivityContext

```typescript
import { STATION_ID_TO_LABEL, getStationLabel } from '@ai-sp/shared'

export function buildActivityContext(
  routeName: string,
  trainingSession: TrainingSession
): ActivityContext {
  const currentStationId = routeName || ''
  const currentStationLabel = STATION_ID_TO_LABEL[currentStationId] || currentStationId
  const currentCategory = getStationCategory(currentStationId)

  const stationSnapshots: Record<string, StationSnapshot> = {}
  const stationsWithActivity: string[] = []
  let recentActivityStation: string | null = null

  const allKeys = trainingSession ? Object.keys(trainingSession) : []

  for (const key of allKeys) {
    const sessionData = trainingSession[key]
    if (!sessionData || typeof sessionData !== 'object') continue

    const stationId = findStationIdBySessionKey(key)
    if (!stationId) continue

    const category = getStationCategory(stationId)
    let snapshot: StationSnapshot | null = null

    if (stationId === 'physicalExam') {
      snapshot = extractPhysicalExam(sessionData as PhysicalExamStationData)
    } else if (category === 'dialog') {
      snapshot = extractDialogStation(sessionData as DialogStationData)
    } else if (category === 'selection') {
      snapshot = extractSelectionStation(sessionData as AncillaryTestsData | DiagnosisStationData)
    } else if (category === 'text-input') {
      snapshot = extractTextInputStation(sessionData as CaseAnalysisData | string | TreatmentPlanData)
    }

    if (snapshot) {
      snapshot.category = category
      snapshot.stationLabel = STATION_ID_TO_LABEL[stationId] || stationId
      stationSnapshots[stationId] = snapshot
      stationsWithActivity.push(stationId)
      recentActivityStation = stationId
    }
  }

  // 标记所有无活动的考站
  const stationsWithoutActivity: string[] = []
  for (const [stationId, category] of Object.entries(STATION_CATEGORY)) {
    if (!stationSnapshots[stationId]) {
      stationSnapshots[stationId] = {
        hasActivity: false,
        category,
        stationLabel: STATION_ID_TO_LABEL[stationId] || stationId,
        summary: null,
        detail: null,
      }
      stationsWithoutActivity.push(stationId)
    }
  }

  return {
    currentStation: { id: currentStationId, label: currentStationLabel, category: currentCategory },
    stationSnapshots,
    global: {
      stationsWithActivity,
      stationsWithoutActivity,
      recentActivityStation,
      totalVisited: stationsWithActivity.length,
      hasAnyActivity: stationsWithActivity.length > 0,
    },
  }
}

// sessionKey → stationId 反向查找
function findStationIdBySessionKey(sessionKey: string): string | null {
  for (const [stationId, key] of Object.entries(ROUTE_TO_SESSION_KEY)) {
    if (key === sessionKey) return stationId
  }
  if (STATION_CATEGORY[sessionKey]) return sessionKey
  if (sessionKey === 'humanisticComm') return 'humanisticComm'
  if (sessionKey === 'preliminaryDiag') return 'preliminaryDiag'
  if (sessionKey === 'caseAnalysis') return 'caseAnalysis'
  return null
}

export function getStationCategory(stationId: string): StationCategory {
  return STATION_CATEGORY[stationId] || 'special'
}
```

---

## 4. 专家点评智能体

### 4.1 概述

**文件：`apps/training/src/composables/useExpertAgent.ts`**

**依赖：** `useExpertContext.ts`, `useAIChat.ts`, `@ai-sp/shared`

**导出接口：**

```typescript
interface UseExpertAgentReturn {
  askExpert: (
    expertData: ExpertData,
    caseInfo: CaseInfo | null,
    stationLabel: string,
    routeName: string,
    trainingSession: TrainingSession,
    messages: UIMessage[],
    question: string
  ) => Promise<ExpertAgentResponse | null>
  expertAiLoading: Ref<boolean>
  buildActivityContext: typeof buildActivityContext
  classifyIntent: (userMessage: string) => ExpertIntentResult
  getStationLabel: (routeName: string) => string
}

export function useExpertAgent(): UseExpertAgentReturn { ... }
```

### 4.2 专家配置数据模型

**文件位置：`apps/admin/public/data/cases/{caseId}-expert.json`**

```json
{
  "caseId": "IM-20260721-YQWH",
  "expertEnabled": true,
  "expertName": "滕皋军 院士",
  "expertTitle": "东南大学附属中大医院 · 介入与血管外科",
  "expertAvatar": "/images/expert-photo.webp",
  "expertTags": ["中国科学院院士", "介入放射学", "肝癌MDT"],
  "reviewTitle": "乙肝相关肝癌的综合评估与个体化治疗决策",
  "expertKB": "原发性肝细胞癌（HCC）是全球第六大常见恶性肿瘤…"
}
```

| 字段 | 类型 | 必填 | 用途 |
|------|------|------|------|
| `caseId` | `string` | 是 | 关联病例 |
| `expertEnabled` | `boolean` | 是 | 功能开关 |
| `expertName` | `string` | 是 | 注入Prompt角色段 |
| `expertTitle` | `string` | 是 | 注入Prompt角色段 |
| `expertAvatar` | `string` | 否 | UI头像 |
| `expertTags` | `string[]` | 否 | UI标签 |
| `reviewTitle` | `string` | 否 | 展示用标题 |
| `expertKB` | `string` | 是 | 专家知识库全文，注入Prompt数据段 |

### 4.3 第二层：意图识别 — classifyIntent

#### 意图体系（6种）

| 意图ID | 用户示例 | 需要的上下文 |
|--------|---------|------------|
| `review_request` | "点评我的问诊"、"哪里不足" | 学员操作记录 |
| `knowledge_question` | "Graves病诊断标准"、"为什么用PTU" | 病例信息 + 知识库 |
| `procedural_guidance` | "下一步该做什么"、"应该查什么" | 病例 + 考站类型 |
| `comparison_request` | "PTU和MMI有什么区别" | 知识库 |
| `cross_station_review` | "整体评价"、"全流程点评" | 全部考站操作记录 |
| `casual_chat` | "你好"、"谢谢" | 无 |

#### 关键词表

```typescript
const INTENT_KEYWORDS: Record<ExpertIntent, string[]> = {
  review_request: [
    '点评', '评价', '怎么样', '不足', '打分', '问题在哪', '哪里不好',
    '有什么问题', '表现如何', '做的怎么样', '请评价', '帮我看看',
    '有什么改进', '哪里需要改进', '做得好不好', '对不对', '正确吗',
  ],
  knowledge_question: [
    '是什么', '为什么', '机制', '诊断标准', '治疗原则', '指南',
    '如何诊断', '怎么治疗', '用什么药', '剂量', '禁忌', '适应症',
    '鉴别', '病因', '病理', '预后', '并发症', '定义', '概念',
    '分型', '分期', '分级', '临床特点', '流行病学',
  ],
  procedural_guidance: [
    '下一步', '接下来', '应该做什么', '还应该', '还需要', '怎么做',
    '如何操作', '步骤', '流程', '顺序', '先做', '后做',
    '该查什么', '该问什么', '还需要查',
  ],
  comparison_request: [
    '对比', '区别', 'vs', '比较', '有什么不同', '怎么区分',
    '哪个更好', '优缺点', '异同',
  ],
  cross_station_review: [
    '整体', '综合', '全过程', '总体', '全流程', '从头',
    '总结', '总评', '全程', '全部', '所有考站',
  ],
  casual_chat: [
    '你好', '谢谢', '再见', '感谢', '辛苦了', '早上好', '下午好',
    '晚上好', 'hello', 'hi', '你是谁',
  ],
}
```

#### 分类算法

```typescript
function classifyIntent(userMessage: string): ExpertIntentResult {
  const q = userMessage || ''
  const lower = q.toLowerCase()
  const results: Array<{ intent: ExpertIntent; score: number; confidence: number }> = []

  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
    let score = 0
    for (const kw of keywords as string[]) {
      if (lower.includes(kw)) score += 1
    }
    if (score > 0) {
      results.push({ intent: intent as ExpertIntent, score, confidence: Math.min(score / 3, 1.0) })
    }
  }

  results.sort((a, b) => b.score - a.score)

  const stationNames = [
    '问诊', '接诊', '体格检查', '查体', '辅助检查', '诊断',
    '治疗', '病历', '沟通', '精神检查', '临床思维',
  ]
  const hasStationRef = stationNames.some(n => lower.includes(n))

  return {
    primaryIntent: results.length > 0 ? results[0].intent : 'knowledge_question',
    allIntents: results,
    confidence: results.length > 0 ? results[0].confidence : 0.5,
    hasStationRef,
    needsLLMFallback: results.length === 0 || (results.length > 0 && results[0].confidence < 0.4),
  }
}
```

### 4.4 第三层：上下文组装 — buildExpertSystemPrompt

三段式Prompt模板，每段有独立构建函数。

#### 段1：角色段

```typescript
function buildSegmentRole(expertData: ExpertData, stationLabel: string): string {
  const name = expertData?.expertName || '临床专家'
  const title = expertData?.expertTitle || ''
  return `你是${name}（${title}），一位顶级临床专家。你正在${stationLabel}考站为医学学员进行教学点评和答疑。以第一人称"我"自称，语言专业、亲和、具体。`
}
```

#### 段2：数据段（按意图选择数据源）

```typescript
function buildSegmentData(
  ctx: ActivityContext,
  intent: ExpertIntentResult,
  caseInfo: CaseInfo | null,
  expertData: ExpertData
): string {
  const parts: string[] = []

  // 病例信息（所有意图都注入）
  if (caseInfo) {
    parts.push(`当前病例：${caseInfo.name}，${caseInfo.gender || ''}，${caseInfo.age || ''}岁`)
    if (caseInfo.chiefComplaint) parts.push(`主诉：${caseInfo.chiefComplaint}`)
    if (caseInfo.disease) parts.push(`疾病：${caseInfo.disease}`)
    if (caseInfo.specialty) parts.push(`科室：${caseInfo.specialty}`)
  }

  // 知识库（所有意图都注入，这是专家的知识来源）
  if (expertData?.expertKB) {
    parts.push(`以下是你的领域知识库，请基于此内容进行点评和回答：\n${expertData.expertKB}`)
  }

  const { primaryIntent } = intent
  const hasActivity = ctx.global.hasAnyActivity

  // 按意图选择注入操作数据
  if (primaryIntent === 'review_request' && hasActivity) {
    const targetIds = ctx.global.stationsWithActivity
    if (targetIds.length > 0) {
      parts.push('学员操作记录：')
      for (const sid of targetIds) {
        const snap = ctx.stationSnapshots[sid]
        if (snap?.hasActivity) {
          parts.push(`【${snap.stationLabel}】${snap.summary}`)
          if (snap.detail) parts.push(snap.detail)
        }
      }
    }
  } else if (primaryIntent === 'cross_station_review' && hasActivity) {
    const visited = ctx.global.stationsWithActivity
    parts.push(`学员已完成${visited.length}个考站的训练：${visited.map(sid => ctx.stationSnapshots[sid]?.stationLabel || sid).join('、')}`)
    parts.push('各站操作摘要：')
    for (const sid of visited) {
      const snap = ctx.stationSnapshots[sid]
      if (snap?.hasActivity) {
        parts.push(`【${snap.stationLabel}】${snap.summary}`)
        if (snap.detail) parts.push(snap.detail)
      }
    }
  } else if (primaryIntent === 'knowledge_question' && hasActivity) {
    const recent = ctx.global.recentActivityStation
    if (recent) {
      const snap = ctx.stationSnapshots[recent]
      parts.push(`学员最近在${snap.stationLabel}的操作（可用于举例）：${snap.summary}`)
    }
  }

  return parts.join('\n')
}
```

#### 段3：指令段（按意图+活动状态分叉）

```typescript
function buildSegmentInstruction(ctx: ActivityContext, intent: ExpertIntentResult): string {
  const { primaryIntent } = intent
  const hasActivity = ctx.global.hasAnyActivity

  if (primaryIntent === 'review_request') {
    if (!hasActivity) {
      return '重要：该学员目前尚未进行任何考站操作训练。如果学员请你点评表现或改进操作，你必须礼貌地告知：目前还没有操作记录可供点评，建议先去完成对应的考站训练。然后主动询问学员想了解病例的哪些方面，可以基于知识库进行知识讲解。禁止假装看到任何不存在的操作记录。'
    }
    return '请从以下三个方面进行针对性点评：1) 表现分析——学员操作的亮点与不足（必须引用上文操作记录中的具体内容）；2) 知识点讲解——结合该病例的关键临床知识点；3) 改进建议——给出具体、可操作的改进方法。'
  }

  if (primaryIntent === 'cross_station_review') {
    if (!hasActivity) return '该学员尚未完成任何考站训练，无法进行综合点评。请引导学员先去训练。'
    const count = ctx.global.stationsWithActivity.length
    return `学员已完成了${count}个考站的训练。请综合所有考站的表现进行整体点评，评价从问诊到诊断到治疗的思维连续性和逻辑一致性。按"总体评价→各站分评→思维链分析→改进方向"的结构展开。`
  }

  if (primaryIntent === 'knowledge_question') {
    if (hasActivity) {
      return '请进行知识讲解，可以结合学员已做的操作举例说明知识点，使讲解更具体。'
    }
    return '请进行纯粹的知识讲解，可以结合病例内容举例，但不要点评学员操作（学员还没有操作记录）。'
  }

  if (primaryIntent === 'procedural_guidance') {
    return '请给出明确的、步骤化的操作指导，告诉学员在当前阶段应该做什么、以什么顺序做、每步的注意事项。'
  }

  if (primaryIntent === 'comparison_request') {
    return '请以对照或对比的方式回答，列出关键差异点和判断依据。'
  }

  return '请以亲和、专业的语气回答。'
}
```

#### 完整 Prompt 组装

```typescript
export function buildExpertSystemPrompt(
  expertData: ExpertData,
  caseInfo: CaseInfo | null,
  stationLabel: string,
  ctx: ActivityContext,
  intent: ExpertIntentResult
): string {
  const segmentRole = buildSegmentRole(expertData, stationLabel)
  const segmentData = buildSegmentData(ctx, intent, caseInfo, expertData)
  const segmentInstruction = buildSegmentInstruction(ctx, intent)

  const parts: string[] = [segmentRole]
  if (segmentData) parts.push(segmentData)
  parts.push(segmentInstruction)

  // 追加 follow-up 指令
  parts.push('在回复末尾，用<!--SUGGESTIONS-->标记后附一个JSON数组，包含3个学员可能感兴趣的后续问题。格式：<!--SUGGESTIONS-->["问题1","问题2","问题3"]')

  return parts.join('\n\n')
}
```

### 4.5 第四层：回复策略 — selectResponseStrategy

```typescript
function selectResponseStrategy(intent: ExpertIntentResult, ctx: ActivityContext): ResponseStrategy {
  const { primaryIntent } = intent
  const hasActivity = ctx.global.hasAnyActivity

  if (primaryIntent === 'review_request') {
    return hasActivity
      ? { temperature: 0.5, maxTokens: 3000 }
      : { temperature: 0.7, maxTokens: 1000 }
  }
  if (primaryIntent === 'cross_station_review') {
    return { temperature: 0.5, maxTokens: 4000 }
  }
  if (primaryIntent === 'knowledge_question') {
    return { temperature: 0.7, maxTokens: 2000 }
  }
  if (primaryIntent === 'procedural_guidance') {
    return { temperature: 0.3, maxTokens: 2500 }
  }
  if (primaryIntent === 'comparison_request') {
    return { temperature: 0.5, maxTokens: 3000 }
  }
  return { temperature: 0.7, maxTokens: 1500 }
}
```

### 4.6 第五层：智能推荐

#### 通道1：解析 LLM 推荐

```typescript
function parseSuggestions(text: string): string[] | null {
  const match = text.match(/<!--SUGGESTIONS-->\s*(\[.+?\])/s)
  if (!match) return null
  try {
    const arr: unknown = JSON.parse(match[1])
    if (Array.isArray(arr) && arr.length > 0) {
      return arr.filter((q): q is string => typeof q === 'string' && q.trim().length > 0).slice(0, 3)
    }
  } catch { /* ignore */ }
  return null
}
```

#### 通道2：模板填充兜底

```typescript
function generateTemplateFollowUps(userQuestion: string, ctx: ActivityContext): string[] {
  const stationLabel = ctx.currentStation.label
  const q = userQuestion || ''

  if (q.includes('点评') || q.includes('改进') || q.includes('不足')) {
    return [
      '能再详细说说我的不足之处吗？',
      '有哪些立即可操作的改进建议？',
      `我在${stationLabel}中还有哪些需要注意的地方？`,
    ]
  }

  if (q.includes('知识') || q.includes('诊断') || q.includes('治疗') || q.includes('机制')) {
    return [
      '这个知识点在实际临床中如何应用？',
      '能否结合指南再深入讲一下？',
      '有没有相关的典型案例可以分享？',
    ]
  }

  return [
    `这个病例在${stationLabel}中的核心要点是什么？`,
    '有哪些容易忽略的细节？',
    '还有什么需要特别注意的？',
  ]
}
```

#### 获取推荐问题 + 清理回复

```typescript
function getFollowUps(responseText: string, userQuestion: string, ctx: ActivityContext): string[] {
  const parsed = parseSuggestions(responseText)
  if (parsed) return parsed
  return generateTemplateFollowUps(userQuestion, ctx)
}

function cleanResponseText(text: string): string {
  return text.replace(/<!--SUGGESTIONS-->\s*\[.+?\]\s*$/s, '').trim()
}
```

### 4.7 主入口编排

```typescript
export function useExpertAgent(): UseExpertAgentReturn {
  const { sendMessage: sendExpertMessage, loading: expertAiLoading } = useAIChat()

  async function askExpert(
    expertData: ExpertData,
    caseInfo: CaseInfo | null,
    stationLabel: string,
    routeName: string,
    trainingSession: TrainingSession,
    messages: UIMessage[],
    question: string
  ): Promise<ExpertAgentResponse | null> {
    if (!question || expertAiLoading.value) return null

    // Layer 1: 活动感知
    const ctx = buildActivityContext(routeName, trainingSession)

    // Layer 2: 意图识别
    const intent = classifyIntent(question)

    // Layer 3: 上下文组装
    const systemPrompt = buildExpertSystemPrompt(expertData, caseInfo, stationLabel, ctx, intent)

    // Layer 4: 回复策略
    const strategy = selectResponseStrategy(intent, ctx)

    // 调用LLM
    const llmMessages: LLMMessage[] = messages.map(m => ({
      role: m.type === 'user' ? 'user' : 'assistant',
      content: m.text,
    }))

    const result = await sendExpertMessage(llmMessages, systemPrompt, {
      temperature: strategy.temperature,
      maxTokens: strategy.maxTokens,
    })

    const rawText = result?.content || ''
    const cleanText = cleanResponseText(rawText)

    // Layer 5: 智能推荐
    const followUps = getFollowUps(rawText, question, ctx)

    return {
      text: cleanText,
      followUps,
      intent: intent.primaryIntent as ExpertIntent,
    }
  }

  return {
    askExpert,
    expertAiLoading,
    buildActivityContext,
    classifyIntent,
    getStationLabel,
  }
}
```

---

## 5. AI伴学智能体

### 5.1 概述

**文件：`apps/training/src/composables/useAICompanion.ts`**（需新建）

**依赖：** `useExpertContext.ts`, `useAIChat.ts`, `@ai-sp/shared`

**导出接口：**

```typescript
interface UseAICompanionReturn {
  askCompanion: (
    caseInfo: CaseInfo | null,
    stationLabel: string,
    routeName: string,
    trainingSession: TrainingSession,
    messages: UIMessage[],
    question: string
  ) => Promise<CompanionAgentResponse | null>
  companionLoading: Ref<boolean>
}

export function useAICompanion(): UseAICompanionReturn { ... }
```

### 5.2 与专家智能体的核心差异

| 维度 | 专家 | AI伴学 |
|------|------|--------|
| 角色 | 真实专家，第一人称"我" | 教学助手，无具体身份 |
| 知识来源 | expertKB（病例专属知识库） | 通用医学知识 + 病例信息 |
| 能否点评 | **能** | **不能，明确禁止** |
| 点评请求处理 | 执行点评 | 引导去专家点评Tab |
| 意图体系 | 6种（含review/cross_station） | 5种（无review/cross_station） |
| 推荐问题方向 | 追问不足、改进建议 | 探索知识、深入理解 |
| 语气 | 权威评判 | 鼓励引导 |

### 5.3 第二层：意图识别

#### 意图体系（5种，无点评类意图）

| 意图ID | 用户示例 | 说明 |
|--------|---------|------|
| `concept_explanation` | "Graves病是什么"、"这个机制怎么理解" | 知识讲解 |
| `procedural_guidance` | "下一步做什么"、"应该查什么" | 操作引导 |
| `differential_help` | "怎么鉴别A和B"、"可能是什么病" | 鉴别诊断辅助 |
| `case_understanding` | "这个病例的关键点"、"主诉提示什么" | 病例理解 |
| `casual_chat` | "你好"、"谢谢" | 闲聊 |

#### 关键词表

```typescript
const COMPANION_INTENT_KEYWORDS: Record<CompanionIntent | 'review_keywords', string[]> = {
  concept_explanation: [
    '是什么', '为什么', '机制', '诊断标准', '治疗原则', '指南',
    '如何诊断', '怎么治疗', '用什么药', '剂量', '禁忌', '适应症',
    '鉴别', '病因', '病理', '预后', '并发症', '定义', '概念',
    '分型', '分期', '分级', '临床特点', '流行病学', '解释',
    '什么意思', '不理解', '讲一下', '说明一下',
  ],
  procedural_guidance: [
    '下一步', '接下来', '应该做什么', '还应该', '还需要', '怎么做',
    '如何操作', '步骤', '流程', '顺序', '先做', '后做',
    '该查什么', '该问什么', '还需要查', '接下来呢',
  ],
  differential_help: [
    '鉴别', '对比', '区别', '怎么区分', '可能是什么病',
    '考虑哪些疾病', '诊断思路', '排除', 'vs', '比较',
  ],
  case_understanding: [
    '关键点', '重点', '要点', '核心', '注意什么',
    '有什么线索', '提示什么', '这个病例', '分析一下',
    '怎么理解', '思路', '从哪入手',
  ],
  casual_chat: [
    '你好', '谢谢', '再见', '感谢', '辛苦了',
    '早上好', '下午好', '晚上好', 'hello', 'hi', '你是谁',
  ],
  // 点评类关键词 —— 检测到后引导去专家Tab（非意图，仅用于检测）
  review_keywords: [
    '点评', '评价', '怎么样', '不足', '打分', '问题在哪',
    '哪里不好', '表现如何', '做的怎么样', '请评价', '帮我看看',
    '有什么改进', '哪里需要改进', '做得好不好', '对不对', '正确吗',
    '整体', '综合', '全流程', '总评',
  ],
}
```

#### 分类算法（含点评检测）

```typescript
function classifyCompanionIntent(userMessage: string): CompanionIntentResult {
  const q = userMessage || ''
  const lower = q.toLowerCase()
  const results: Array<{ intent: CompanionIntent; score: number; confidence: number }> = []

  // 先检测是否为点评请求 → 特殊处理
  let isReviewRequest = false
  for (const kw of COMPANION_INTENT_KEYWORDS.review_keywords) {
    if (lower.includes(kw)) { isReviewRequest = true; break }
  }

  for (const [intent, keywords] of Object.entries(COMPANION_INTENT_KEYWORDS)) {
    if (intent === 'review_keywords') continue // 跳过，只用于检测
    let score = 0
    for (const kw of keywords as string[]) {
      if (lower.includes(kw)) score += 1
    }
    if (score > 0) {
      results.push({ intent: intent as CompanionIntent, score, confidence: Math.min(score / 3, 1.0) })
    }
  }

  results.sort((a, b) => b.score - a.score)

  return {
    primaryIntent: results.length > 0 ? results[0].intent : 'concept_explanation',
    allIntents: results,
    confidence: results.length > 0 ? results[0].confidence : 0.5,
    isReviewRequest,
    needsLLMFallback: results.length === 0 || results[0].confidence < 0.4,
  }
}
```

### 5.4 第三层：上下文组装

#### 段1：角色段

```typescript
function buildCompanionRole(stationLabel: string): string {
  return `你是一位临床教学助手，正在帮助医学学员进行${stationLabel}考站的临床思维训练。你不是临床专家，不对学员的表现做评判性点评。你的角色是引导学员自己思考、解答知识疑问、提供学习建议。以温和、鼓励的语气回答。当学员有疑问时，优先用反问引导他自己找到答案。`
}
```

#### 段2：数据段

```typescript
function buildCompanionData(
  ctx: ActivityContext,
  intent: CompanionIntentResult,
  caseInfo: CaseInfo | null
): string {
  const parts: string[] = []

  // 病例信息
  if (caseInfo) {
    parts.push(`当前病例：${caseInfo.name}，${caseInfo.gender || ''}，${caseInfo.age || ''}岁`)
    if (caseInfo.chiefComplaint) parts.push(`主诉：${caseInfo.chiefComplaint}`)
    if (caseInfo.disease) parts.push(`疾病：${caseInfo.disease}`)
    if (caseInfo.specialty) parts.push(`科室：${caseInfo.specialty}`)
  }

  // 简要活动上下文（用于举例，不用于点评）
  const hasActivity = ctx.global.hasAnyActivity
  if (hasActivity) {
    const visited = ctx.global.stationsWithActivity
    parts.push(`学员已完成${visited.length}个考站的训练：${visited.map(sid => ctx.stationSnapshots[sid]?.stationLabel || sid).join('、')}`)
    const current = ctx.stationSnapshots[ctx.currentStation.id]
    if (current?.hasActivity) {
      parts.push(`当前考站操作摘要：${current.summary}`)
    }
  } else {
    parts.push('学员尚未开始操作训练。')
  }

  return parts.join('\n')
}
```

#### 段3：指令段

```typescript
function buildCompanionInstruction(ctx: ActivityContext, intent: CompanionIntentResult): string {
  const { primaryIntent, isReviewRequest } = intent

  // 点评请求 → 明确拒绝并引导
  if (isReviewRequest) {
    return '重要：学员似乎在请求点评或评价他的表现。你必须礼貌地说明：作为AI伴学助手，你不做表现评判和点评。建议学员切换到"专家点评"Tab获取专家的专业点评。然后主动引导学员提出知识性问题，你可以帮他理解病例、讲解知识点、梳理诊疗思路。'
  }

  switch (primaryIntent) {
    case 'concept_explanation':
      return '请进行清晰的知识讲解，可结合当前病例的具体情况举例，使讲解更贴近实际。用学员能理解的语言，避免过度堆砌专业术语。讲解完核心概念后，可以追问一个引导性问题帮助学员巩固理解。'

    case 'procedural_guidance':
      return '请给出步骤化的操作指导。注意以引导式提问的方式呈现，如"你可以考虑…你觉得下一步应该关注什么？"而非直接命令。告诉学员在当前阶段应该关注什么、以什么顺序做、每步的注意事项。'

    case 'differential_help':
      return '请帮助学员梳理鉴别诊断思路。不要直接给出最终答案，而是引导他自己列出可能的疾病，逐一比较支持点和不支持点。可以用表格或对照的方式呈现。'

    case 'case_understanding':
      return '请帮助学员从病例信息中提炼关键线索。用提问的方式引导他注意到可能忽略的细节，帮助他构建从症状→体征→辅助检查→诊断的完整思维链。'

    case 'casual_chat':
      return '请以亲和、鼓励的语气回应。如果是初次对话，可以简单介绍自己并引导学员提出学习相关的问题。'

    default:
      return '请以温和、鼓励的语气回答学员的问题，帮助他学习和思考。'
  }
}
```

#### 完整 Prompt 组装

```typescript
export function buildCompanionSystemPrompt(
  caseInfo: CaseInfo | null,
  stationLabel: string,
  ctx: ActivityContext,
  intent: CompanionIntentResult
): string {
  const segmentRole = buildCompanionRole(stationLabel)
  const segmentData = buildCompanionData(ctx, intent, caseInfo)
  const segmentInstruction = buildCompanionInstruction(ctx, intent)

  const parts: string[] = [segmentRole]
  if (segmentData) parts.push(segmentData)
  parts.push(segmentInstruction)

  // 通用约束
  parts.push('重要约束：1) 你不对学员的操作表现做评判性点评（不评价好坏对错）。2) 如果学员要求点评他的表现，礼貌引导他去"专家点评"Tab。3) 你的定位是教学辅助，帮助学员自己思考和成长。')

  // Follow-up 指令
  parts.push('在回复末尾，用<!--SUGGESTIONS-->标记后附一个JSON数组，包含3个学员可能感兴趣的后续问题。格式：<!--SUGGESTIONS-->["问题1","问题2","问题3"]')

  return parts.join('\n\n')
}
```

### 5.5 第四层：回复策略

```typescript
function selectCompanionStrategy(intent: CompanionIntentResult): ResponseStrategy {
  const { primaryIntent } = intent

  switch (primaryIntent) {
    case 'concept_explanation':
      return { temperature: 0.7, maxTokens: 2000 }
    case 'procedural_guidance':
      return { temperature: 0.5, maxTokens: 1500 }
    case 'differential_help':
      return { temperature: 0.5, maxTokens: 2000 }
    case 'case_understanding':
      return { temperature: 0.7, maxTokens: 1500 }
    case 'casual_chat':
      return { temperature: 0.7, maxTokens: 1000 }
    default:
      return { temperature: 0.7, maxTokens: 1500 }
  }
}
```

### 5.6 第五层：智能推荐

AI伴学的推荐问题方向与专家不同——探索引导型而非追问不足型。

```typescript
function parseCompanionSuggestions(text: string): string[] | null {
  // 与专家智能体完全相同的解析逻辑
  const match = text.match(/<!--SUGGESTIONS-->\s*(\[.+?\])/s)
  if (!match) return null
  try {
    const arr: unknown = JSON.parse(match[1])
    if (Array.isArray(arr) && arr.length > 0) {
      return arr.filter((q): q is string => typeof q === 'string' && q.trim().length > 0).slice(0, 3)
    }
  } catch { /* ignore */ }
  return null
}

function generateCompanionFollowUps(userQuestion: string, ctx: ActivityContext): string[] {
  const stationLabel = ctx.currentStation.label
  const q = userQuestion || ''

  if (q.includes('鉴别') || q.includes('诊断') || q.includes('区别')) {
    return [
      '还需要与哪些疾病进行鉴别？',
      '最重要的鉴别点是什么？',
      '如果诊断不确定，下一步应该做什么？',
    ]
  }

  if (q.includes('治疗') || q.includes('方案') || q.includes('用药')) {
    return [
      '这个治疗方案有哪些潜在风险？',
      '一线治疗无效时应该如何调整？',
      '治疗过程中需要监测哪些指标？',
    ]
  }

  if (q.includes('检查') || q.includes('辅检') || q.includes('化验')) {
    return [
      '这些检查结果应该如何解读？',
      '还有哪些检查可以帮助明确诊断？',
      '检查的选择依据是什么？',
    ]
  }

  // 通用模板（探索引导型）
  return [
    `这个病例在${stationLabel}中有哪些关键要点？`,
    '能否结合临床指南再深入讲一下？',
    '还有哪些容易忽略的细节需要关注？',
  ]
}

function getCompanionFollowUps(responseText: string, userQuestion: string, ctx: ActivityContext): string[] {
  const parsed = parseCompanionSuggestions(responseText)
  if (parsed) return parsed
  return generateCompanionFollowUps(userQuestion, ctx)
}

function cleanCompanionResponseText(text: string): string {
  return text.replace(/<!--SUGGESTIONS-->\s*\[.+?\]\s*$/s, '').trim()
}
```

### 5.7 主入口编排

```typescript
export function useAICompanion(): UseAICompanionReturn {
  const { sendMessage, loading: companionLoading } = useAIChat()

  async function askCompanion(
    caseInfo: CaseInfo | null,
    stationLabel: string,
    routeName: string,
    trainingSession: TrainingSession,
    messages: UIMessage[],
    question: string
  ): Promise<CompanionAgentResponse | null> {
    if (!question || companionLoading.value) return null

    // Layer 1: 活动感知（复用 useExpertContext）
    const ctx = buildActivityContext(routeName, trainingSession)

    // Layer 2: 意图识别
    const intent = classifyCompanionIntent(question)

    // Layer 3: 上下文组装
    const systemPrompt = buildCompanionSystemPrompt(caseInfo, stationLabel, ctx, intent)

    // Layer 4: 回复策略
    const strategy = selectCompanionStrategy(intent)

    // 调用LLM
    const llmMessages: LLMMessage[] = messages.map(m => ({
      role: m.type === 'user' ? 'user' : 'assistant',
      content: m.text,
    }))

    const result = await sendMessage(llmMessages, systemPrompt, {
      temperature: strategy.temperature,
      maxTokens: strategy.maxTokens,
    })

    const rawText = result?.content || ''
    const cleanText = cleanCompanionResponseText(rawText)

    // Layer 5: 智能推荐
    const followUps = getCompanionFollowUps(rawText, question, ctx)

    return {
      text: cleanText,
      followUps,
      intent: intent.primaryIntent,
      isReviewRequest: intent.isReviewRequest,
    }
  }

  return { askCompanion, companionLoading }
}
```

---

## 6. 前端集成

### 6.1 组件：AICompanionDrawer.vue

**文件：`apps/training/src/components/AICompanionDrawer.vue`**

组件职责：
1. 渲染双Tab UI（AI伴学 + 专家点评）
2. 管理两个独立的消息列表状态
3. 加载专家配置数据
4. 提供各考站的初始推荐问题
5. 调用对应的智能体并处理返回结果

#### 关键状态

```typescript
// ── 共享 ──
const open = ref(false)
const activeTab = ref<'qa' | 'commentary'>('qa')
const route = useRoute()
const store = useTrainingStore()
const stationLabel = computed(() => getStationLabel(route.name as string) || '')

// ── AI伴学 ──
const { askCompanion, companionLoading: aiLoading } = useAICompanion()
const qaInput = ref('')
const qaMessages = ref<UIMessage[]>([
  { type: 'ai', text: '你好！我是AI伴学助手，可以针对当前病例和考站为你解答。请随时提问。' },
])
const suggestedQuestions = computed(() => stationQuestionMap[route.name as string] || defaultQuestions)

// ── 专家点评 ──
const { askExpert, expertAiLoading } = useExpertAgent()
const expertData = ref<ExpertData | null>(null)
const expertLoading = ref(false)
const expertMessages = ref<UIMessage[]>([])
const expertInput = ref('')
const expertSuggestedQuestions = computed(() =>
  expertQuestionMap[route.name as string] || defaultExpertQuestions
)
```

#### 病例信息提取

```typescript
const { getCached } = useCaseLoader()

function getCaseInfo(): CaseInfo | null {
  const c = store.currentCase || getCached(store.currentCase?.caseId || store.currentCase?.id)
  if (!c) return null
  const basic = c.basic || c
  const p = basic.patient || basic
  return {
    name: p.name || '',
    age: p.age || '',
    gender: p.gender || (basic.gender || ''),
    chiefComplaint: basic.chiefComplaint || c.chiefComplaint || '',
    disease: basic.disease || c.disease || '',
    specialty: basic.specialty || c.specialty || '',
  }
}
```

#### 初始推荐问题配置

**AI伴学（按考站）：**

```typescript
const stationQuestionMap: Record<string, string[]> = {
  historyTaking: [
    '接下来应该问哪些问题？',
    '哪些关键病史信息不能遗漏？',
    '如何根据已有信息缩小鉴别诊断范围？',
    '这个症状的可能病因有哪些？',
  ],
  physicalExam: [
    '应该重点检查哪些体征？',
    '这些体征的临床意义是什么？',
    '如何通过体格检查进一步鉴别诊断？',
  ],
  ancillaryTests: [
    '需要安排哪些辅助检查？',
    '这些检查项目的选择依据是什么？',
    '如何解读这些检查结果？',
  ],
  diagnosis: [
    '最可能的诊断是什么？',
    '需要与哪些疾病进行鉴别？',
    '诊断依据有哪些？',
  ],
  treatmentPlan: [
    '该病例的治疗原则是什么？',
    '有哪些可选的治疗方案？',
    '如何制定个体化的治疗计划？',
  ],
  medicalRecord: [
    '病历书写的要点有哪些？',
    '如何规范书写入院记录？',
  ],
  caseAnalysis: [
    '这个病例的临床特点是什么？',
    '诊断思路应该如何展开？',
    '有哪些需要特别注意的陷阱？',
  ],
  humanisticComm: [
    '如何与患者进行有效沟通？',
    '沟通中需要注意哪些人文关怀要点？',
  ],
  mentalExam: [
    '精神检查的要点有哪些？',
    '如何评估患者的精神状态？',
  ],
}

const defaultQuestions: string[] = [
  '这个病例的关键点是什么？',
  '我应该从哪些方面入手？',
  '有哪些容易遗漏的地方？',
]
```

**专家点评（按考站）：**

```typescript
const expertQuestionMap: Record<string, string[]> = {
  historyTaking: [
    '请对我的问诊过程进行综合点评',
    '我的问诊思路有什么需要改进的地方？',
    '这个病例的病史采集要点是什么？',
  ],
  physicalExam: [
    '请对我的体格检查进行综合点评',
    '我的查体过程有哪些遗漏？',
    '这个病例的查体重点是什么？',
  ],
  ancillaryTests: [
    '请对我的辅助检查选择进行综合点评',
    '我选择的检查项目是否合理？',
    '这个病例的辅助检查策略是什么？',
  ],
  diagnosis: [
    '请对我的诊断过程进行综合点评',
    '我的诊断和鉴别诊断是否完善？',
    '这个病例的诊断思路应该如何展开？',
  ],
  preliminaryDiag: [
    '请对我的初步诊断进行综合点评',
    '我的诊断和鉴别诊断是否完善？',
    '这个病例的诊断思路应该如何展开？',
  ],
  treatmentPlan: [
    '请对我的治疗方案进行综合点评',
    '我的治疗计划是否合理完善？',
    '这个病例的治疗要点是什么？',
  ],
  medicalRecord: [
    '请对我的病历书写进行综合点评',
    '我的病历有哪些需要完善的地方？',
    '规范病历书写的要点是什么？',
  ],
  caseAnalysis: [
    '请对我的病例分析进行综合点评',
    '我的诊断思路有什么问题？',
    '这个病例的鉴别诊断要点是什么？',
  ],
  humanisticComm: [
    '请对我的沟通表现进行综合点评',
    '我在人文关怀方面有哪些不足？',
    '这个病例的医患沟通要点是什么？',
  ],
  mentalExam: [
    '请对我的精神检查进行综合点评',
    '我的精神检查有什么遗漏？',
    '这个病例的精神检查要点是什么？',
  ],
}

const defaultExpertQuestions: string[] = [
  '请对我的操作进行综合点评',
  '在这个病例中我有哪些不足？',
  '这个病例的核心临床要点是什么？',
]
```

#### 专家配置加载

```typescript
async function loadExpertData(): Promise<void> {
  if (expertData.value || expertLoading.value) return
  expertLoading.value = true
  try {
    const caseData = store.currentCase || getCached(store.currentCase?.caseId || store.currentCase?.id)
    const caseId = caseData?.caseId || store.currentCase?.case_id || store.currentCase?.id
    if (!caseId) { expertLoading.value = false; return }

    // 1. 尝试缓存
    if (caseData?.expert) {
      expertData.value = caseData.expert as ExpertData
      expertLoading.value = false
      return
    }

    // 2. Fetch 专家配置文件
    const resp = await fetch(`/data/cases/${caseId}-expert.json`)
    if (resp.ok) {
      const json = await resp.json()
      if (json.expertEnabled || json.enabled) {
        expertData.value = {
          expertName: json.expertName || '',
          expertTitle: json.expertTitle || '',
          expertAvatar: json.expertAvatar || '',
          expertTags: json.expertTags || [],
          expertKB: json.expertKB || '',
          reviewTitle: json.reviewTitle || '',
        }
      }
    }
  } catch { /* no expert data */ }
  expertLoading.value = false
}

// Tab切换时加载专家数据
watch(() => activeTab.value, (tab) => {
  if (tab === 'commentary') loadExpertData()
})
```

#### 消息发送

**AI伴学发送（使用 useAICompanion 五层流水线）：**

```typescript
function renderMsgText(text: string): string {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/^|$/g, '<p>')
    .replace(/<p><\/p>/g, '')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(?:^|\n)#{1,3}\s*(.+?)(?:\n|$)/g, (_, title: string) =>
      `<h4 style="font-weight:600;margin:14px 0 6px;color:#1f2937;">${title}</h4>`)
}

async function askQuestion(q?: string): Promise<void> {
  const question = typeof q === 'string' ? q : qaInput.value.trim()
  if (!question || aiLoading.value) return

  qaMessages.value.push({ type: 'user', text: question })
  qaInput.value = ''
  scrollToBottom()

  const response = await askCompanion(
    getCaseInfo(),
    stationLabel.value,
    route.name as string,
    store.trainingSession,
    qaMessages.value,
    question,
  )

  if (response) {
    qaMessages.value.push({
      type: 'ai',
      text: response.text,
      html: renderMsgText(response.text),
      followUps: response.followUps,
    })
  }
  scrollToBottom()
}
```

**专家点评发送：**

```typescript
async function askExpertQuestion(q?: string): Promise<void> {
  const question = typeof q === 'string' ? q : expertInput.value.trim()
  if (!question || expertAiLoading.value || !expertData.value) return

  expertMessages.value.push({ type: 'user', text: question })
  expertInput.value = ''
  scrollExpertToBottom()

  const response = await askExpert(
    expertData.value,
    getCaseInfo(),
    stationLabel.value,
    route.name as string,
    store.trainingSession,
    expertMessages.value,
    question,
  )

  if (response) {
    expertMessages.value.push({
      type: 'ai',
      text: response.text,
      html: renderMsgText(response.text),
      followUps: response.followUps,
    })
  }
  scrollExpertToBottom()
}
```

#### 模板结构要点

```html
<!-- 双Tab切换 -->
<div class="panel-tab" :class="{ active: activeTab === 'qa' }" @click="activeTab = 'qa'">
  AI伴学
</div>
<div class="panel-tab" :class="{ active: activeTab === 'commentary' }" @click="activeTab = 'commentary'">
  专家点评
</div>

<!-- AI伴学Tab -->
<div v-show="activeTab === 'qa'">
  <!-- 消息列表（开场白带推荐问题chips） -->
  <div class="qa-messages">
    <div v-for="(msg, i) in qaMessages" :class="['qa-msg', msg.type]">
      <span v-if="msg.type === 'ai'" class="qa-msg-avatar">🤖</span>
      <div class="qa-msg-content">
        <div class="qa-msg-bubble" v-html="msg.html || msg.text"></div>
        <!-- 最后一条AI消息下方显示 follow-up chips -->
        <div v-if="msg.type === 'ai' && msg.followUps?.length && i === qaMessages.length - 1"
             class="followup-chips">
          <button v-for="fq in msg.followUps" :key="fq" class="followup-chip"
                  @click="askQuestion(fq)">{{ fq }}</button>
        </div>
      </div>
    </div>
    <div v-if="aiLoading" class="qa-msg ai typing">
      <span class="qa-msg-avatar">🤖</span>
      <div class="qa-msg-bubble"><span class="typing-dots"><i></i><i></i><i></i></span></div>
    </div>
  </div>
  <!-- 输入框 -->
  <div class="qa-input-row">
    <input v-model="qaInput" @keydown.enter="askQuestion()" :disabled="aiLoading" />
    <button @click="askQuestion()" :disabled="aiLoading">发送</button>
  </div>
</div>

<!-- 专家点评Tab -->
<div v-show="activeTab === 'commentary'">
  <!-- 无专家配置 → 空状态 -->
  <div v-if="!expertData && !expertLoading" class="expert-empty">
    <p>该病例暂无专家点评</p>
  </div>
  <!-- 加载中 -->
  <div v-if="expertLoading" class="loading">...</div>
  <!-- 有专家配置 → 完整界面 -->
  <div v-else-if="expertData">
    <!-- 专家信息卡片 -->
    <div class="expert-profile">
      <img v-if="expertData.expertAvatar" :src="expertData.expertAvatar" />
      <i v-else class="fa-solid fa-user-tie"></i>
      <div class="expert-name">{{ expertData.expertName }}</div>
      <div class="expert-dept">{{ expertData.expertTitle }}</div>
      <span v-for="tag in expertData.expertTags" :key="tag" class="expert-tag">{{ tag }}</span>
    </div>
    <!-- 对话区 -->
    <div class="expert-chat">
      <!-- 初始推荐问题（无消息时显示） -->
      <div v-if="expertMessages.length === 0" class="suggested-qs">
        <button v-for="q in expertSuggestedQuestions" :key="q"
                @click="askExpertQuestion(q)">{{ q }}</button>
      </div>
      <!-- 消息列表（带专家头像） -->
      <div class="expert-chat-messages">
        <div v-for="(msg, i) in expertMessages" :key="i" :class="['qa-msg', msg.type]">
          <div v-if="msg.type === 'ai'" class="qa-msg-avatar">
            <img v-if="expertData.expertAvatar" :src="expertData.expertAvatar" />
            <i v-else class="fa-solid fa-user-tie"></i>
          </div>
          <div class="qa-msg-content">
            <div class="qa-msg-bubble" v-html="msg.html || msg.text"></div>
            <div v-if="msg.type === 'ai' && msg.followUps?.length && i === expertMessages.length - 1"
                 class="followup-chips">
              <button v-for="fq in msg.followUps" :key="fq" class="followup-chip"
                      @click="askExpertQuestion(fq)">{{ fq }}</button>
            </div>
          </div>
        </div>
        <div v-if="expertAiLoading" class="qa-msg ai typing">...</div>
      </div>
      <!-- 输入框 -->
      <div class="qa-input-row">
        <input v-model="expertInput" @keydown.enter="askExpertQuestion()" :disabled="expertAiLoading" />
        <button @click="askExpertQuestion()" :disabled="expertAiLoading">发送</button>
      </div>
    </div>
  </div>
</div>
```

---

## 7. 文件清单与依赖关系

### 7.1 需要创建/修改的文件

```
apps/training/src/composables/
├── useAIChat.ts             ← [已存在] LLM调用封装，迁移为TS
├── useExpertContext.ts      ← [已存在] 活动感知层，迁移为TS
├── useExpertAgent.ts        ← [已存在] 专家点评智能体，迁移为TS
└── useAICompanion.ts        ← [新建] AI伴学智能体（五层流水线）

apps/training/src/components/
└── AICompanionDrawer.vue    ← [修改] 接入 useAICompanion，替换内联逻辑

apps/admin/public/data/cases/
├── {caseId}-expert.json     ← [已存在] 专家配置文件（管理端编辑）
└── ...

packages/shared/src/
└── station-constants.ts     ← [已存在] 考站常量
```

### 7.2 依赖图

```
useAIChat.ts (无依赖)
     │
     ├──→ useExpertAgent.ts
     │         │
     │         └──→ useExpertContext.ts ──→ @ai-sp/shared
     │
     ├──→ useAICompanion.ts
     │         │
     │         └──→ useExpertContext.ts ──→ @ai-sp/shared
     │
     └──→ AICompanionDrawer.vue
               │
               ├──→ useExpertAgent.ts
               ├──→ useAICompanion.ts
               └──→ useCaseLoader.ts
```

### 7.3 AI伴学实现要点

当前AI伴学的逻辑（`buildSystemPrompt` + `askQuestion`）全部内联在 `AICompanionDrawer.vue` 中。实现时：

1. 创建 `useAICompanion.ts`，将 Prompt 组装和策略逻辑移入
2. 在 `AICompanionDrawer.vue` 中引入 `useAICompanion`
3. 将 `askQuestion()` 中的 `buildSystemPrompt()` + `sendMessage()` 替换为 `askCompanion()`
4. AI伴学消息也加入 `followUps` 支持
5. 保持 `qaMessages` 和 `expertMessages` 两个独立消息列表不变

---

## 8. 配置与扩展

### 8.1 新增考站

1. **`@ai-sp/shared`**：在 `station-constants.ts` 中添加 ID→Label 映射和 session key 映射
2. **`useExpertContext.ts`**：在 `STATION_CATEGORY` 中添加分类；如属新类别，编写Extractor
3. **`useExpertAgent.ts`**：如新考站需特殊指令，在 `buildSegmentInstruction` 中分支
4. **`useAICompanion.ts`**：同上
5. **`AICompanionDrawer.vue`**：在 `stationQuestionMap` 和 `expertQuestionMap` 中添加初始推荐问题

### 8.2 新增意图类型

1. 在对应智能体的 `INTENT_KEYWORDS` 中添加关键词和类型定义
2. 在 `buildSegmentInstruction` 中添加指令模板
3. 在 `selectResponseStrategy` 中添加策略配置
4. 在 `buildSegmentData` 中添加数据注入逻辑
5. 在 `generateTemplateFollowUps` 中添加兜底模板

### 8.3 专家配置扩展

如需支持不同专家角色，只需为每个病例编写不同的 `{caseId}-expert.json`。角色段Prompt会自动从 `expertName` 和 `expertTitle` 字段生成。类型已定义在 `ExpertData` 接口中。

### 8.4 调试开关

```typescript
if (import.meta.env.DEV) {
  console.log('[Agent] Layer 1 - ActivityContext:', ctx)
  console.log('[Agent] Layer 2 - Intent:', intent)
  console.log('[Agent] Layer 3 - SystemPrompt:', systemPrompt)
  console.log('[Agent] Layer 4 - Strategy:', strategy)
  console.log('[Agent] Layer 5 - FollowUps:', followUps)
}
```

### 8.5 性能注意事项

- `expertKB` 知识库建议 3000-5000 字以内
- 消息历史控制在最近 10 轮以内
- Extractor摘要 200 字以内，detail 500 字以内
- LLM超时 30 秒，点评/知识问答通常 5-15 秒完成

---

## 9. 设计决策记录

### 决策1：为什么用自然语言摘要而非原始JSON？

LLM对自然语言理解远优于JSON。摘要浓缩信息密度、节省token。不同考站异构数据通过摘要统一接口。

### 决策2：为什么意图识别规则优先？

培训场景语义空间有限，关键词覆盖>80%。规则识别零延迟零成本，LLM分类需额外API调用。

### 决策3：为什么两个智能体分开实现而非合一？

两个智能体的人设、知识来源、意图体系、指令逻辑完全不同。强合一会导致大量的if-else分支，代码难以维护。分离后各自独立演进，架构模式相同但内容独立。

### 决策4：为什么活动感知层共享？

活动感知是纯数据转换层，没有智能体特定的逻辑。两个智能体都需要知道学员做了什么，只是用途不同（专家用来点评，伴学用来引导）。共享避免重复实现11个Extractor。

### 决策5：为什么用 `<!--SUGGESTIONS-->` 标记而非独立API调用？

零额外延迟，LLM在生成回复时已理解上下文。解析失败有模板兜底。HTML注释不影响正常展示。

### 决策6：为什么三段式Prompt？

角色/数据/指令独立组装，修改一段不影响其他。未来支持多专家角色时只需替换角色段。便于A/B测试不同指令。

### 决策7：为什么无操作时必须明确禁止点评？

LLM默认"有求必应"，无数据也会编造。明确否定指令比正面引导更有效。医学教育对准确性要求极高。

### 决策8：AI伴学为什么需要检测点评请求？

学员可能分不清两个Tab的职责边界，在AI伴学Tab请求点评。AI伴学必须能识别并引导用户去正确的Tab，而非越界点评。

### 决策9：为什么使用 TypeScript？

两个智能体包含复杂的类型结构（考站分类、意图体系、多态 TrainingSession 等）。接口定义作为团队契约文档，类型系统防止数据提取器和Prompt组装间的不匹配。且项目规划 Phase D 迁移 TS，智能体层先行。

---

## 附录A：两个智能体意图体系对照

| 专家点评智能体 | AI伴学智能体 | 说明 |
|-------------|-----------|------|
| `review_request` | ❌ (引导去专家Tab) | 点评是专家专属 |
| `cross_station_review` | ❌ (引导去专家Tab) | 跨站点评是专家专属 |
| `knowledge_question` | `concept_explanation` | 相似但语气不同 |
| `procedural_guidance` | `procedural_guidance` | 相似但专家更权威 |
| `comparison_request` | `differential_help` | 伴学偏向教学对比 |
| `casual_chat` | `casual_chat` | 相同 |
| ❌ | `case_understanding` | 伴学特有，帮助理解病例 |

## 附录B：完整类型清单速查

| 类型 | 定义位置 | 用途 |
|------|---------|------|
| `LLMMessage` | 共享类型 | LLM消息格式 |
| `LLMOptions` | 共享类型 | LLM调用参数 |
| `LLMResult` | 共享类型 | LLM返回结果 |
| `StationCategory` | 共享类型 | 考站分类字面量 |
| `StationId` | 共享类型 | 考站ID联合类型 |
| `Message` | 共享类型 | 对话消息 |
| `TrainingSession` | 共享类型 | 训练数据根类型 |
| `DialogStationData` | 共享类型 | 对话类考站数据 |
| `AncillaryTestsData` | 共享类型 | 辅助检查数据 |
| `DiagnosisStationData` | 共享类型 | 诊断考站数据 |
| `StationSnapshot` | 共享类型 | 考站摘要快照 |
| `ActivityContext` | 共享类型 | 活动感知上下文 |
| `CaseInfo` | 共享类型 | 病例信息 |
| `ExpertData` | 共享类型 | 专家配置 |
| `ExpertIntent` | 共享类型 | 专家意图字面量 |
| `ExpertIntentResult` | 共享类型 | 专家意图识别结果 |
| `CompanionIntent` | 共享类型 | 伴学意图字面量 |
| `CompanionIntentResult` | 共享类型 | 伴学意图识别结果 |
| `ResponseStrategy` | 共享类型 | 回复策略 |
| `AgentResponse` | 共享类型 | 智能体返回基类 |
| `ExpertAgentResponse` | 共享类型 | 专家智能体返回 |
| `CompanionAgentResponse` | 共享类型 | 伴学智能体返回 |
| `UIMessage` | 共享类型 | UI消息格式 |
