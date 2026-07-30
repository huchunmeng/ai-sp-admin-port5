# AI-SP 智能体设计文档

> 版本：v2.0 | 日期：2026-07-30
>
> 本文档描述两个AI智能体的完整设计：**专家点评智能体** 和 **AI伴学智能体**。
> 文档目标是：交给AI coding助手后，可直接根据本文档构建和复现两个智能体的全部功能。

---

## 目录

1. [双智能体概览](#1-双智能体概览)
2. [共享基础设施](#2-共享基础设施)
3. [专家点评智能体](#3-专家点评智能体)
4. [AI伴学智能体](#4-ai伴学智能体)
5. [前端集成](#5-前端集成)
6. [文件清单与依赖关系](#6-文件清单与依赖关系)
7. [配置与扩展](#7-配置与扩展)
8. [设计决策记录](#8-设计决策记录)

---

## 1. 双智能体概览

### 1.1 定位与差异

系统中有两个AI智能体，共用同一个抽屉UI（`AICompanionDrawer.vue`），分属两个Tab：

| 维度 | 专家点评智能体 | AI伴学智能体 |
|------|-------------|------------|
| **Tab名称** | 专家点评 | 智能问答 |
| **人设** | 真实临床专家（如滕皋军院士），有姓名、职称、头像 | 虚拟教学助手，无具体身份 |
| **核心能力** | 点评学员操作表现，指出不足和改进方向 | 答疑解惑、引导思考、讲解知识 |
| **知识来源** | 专家编撰的 `expertKB`（病例专属知识库） | 通用医学知识 + 病例基本信息 |
| **活动感知用途** | 收集操作记录 → 作为点评对象 | 了解学员进度 → 给出针对性引导和举例 |
| **能否点评学员** | **能，这是核心功能** | **不能，明确禁止评判学员表现** |
| **语气风格** | 权威、评判性、第一人称"我" | 支持性、引导性、苏格拉底式反问 |
| **推荐问题方向** | 追问不足、改进建议 | 探索知识、深入理解 |
| **配置文件** | `/data/cases/{caseId}-expert.json` | 无额外配置，使用病例基本信息 |

### 1.2 共享与分治

```
┌─────────────────────────────────────────────────────────┐
│                    共享基础设施                           │
│  useAIChat.js          ← LLM HTTP调用（两个智能体共用）     │
│  useExpertContext.js   ← 活动感知 + Data Extractors（共用） │
│  AICompanionDrawer.vue ← UI层（两个Tab共用一个组件）        │
└─────────────────────────────────────────────────────────┘
          │                              │
          ▼                              ▼
┌──────────────────┐          ┌──────────────────┐
│ useExpertAgent.js│          │ useAICompanion.js │
│  专家点评智能体    │          │  AI伴学智能体      │
│  (五层流水线)     │          │  (五层流水线)      │
└──────────────────┘          └──────────────────┘
```

两个智能体各自独立实现五层流水线（架构模式相同，每层内容不同）。共享层提供LLM调用、活动感知和UI框架。

---

## 2. 共享基础设施

### 2.1 useAIChat.js — LLM调用封装

纯HTTP封装，与业务完全无关。两个智能体各自实例化使用。

**文件：`apps/training/src/composables/useAIChat.js`**

```javascript
import { ref } from 'vue'

export function useAIChat() {
  const loading = ref(false)
  const error = ref(null)

  async function sendMessage(messages, systemPrompt, opts = {}) {
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
          model: opts.model || undefined
        }),
        signal: controller.signal
      })
      clearTimeout(timeout)

      const json = await resp.json()
      if (!json.ok) {
        error.value = json.error || 'LLM request failed'
        return { ok: false, content: '抱歉，AI服务暂时不可用，请稍后再试。' }
      }
      return { ok: true, content: json.content }
    } catch (e) {
      if (e.name === 'AbortError') {
        error.value = '请求超时，请重试'
        return { ok: false, content: '抱歉，请求超时，请稍后再试。' }
      }
      error.value = e.message
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

### 2.2 useExpertContext.js — 活动感知层（两个智能体共用）

这是第一层（活动感知层），两个智能体都依赖它获取学员在各考站的操作摘要。

**文件：`apps/training/src/composables/useExpertContext.js`**

**依赖：** `@ai-sp/shared` 中的 `STATION_TO_SESSION_KEY` 和 `STATION_ID_TO_LABEL`

#### 2.2.1 考站分类体系

```javascript
const STATION_CATEGORY = {
  historyTaking: 'dialog',
  physicalExam: 'dialog',
  mentalExam: 'dialog',
  humanisticComm: 'dialog',
  ancillaryTests: 'selection',
  diagnosis: 'selection',
  preliminaryDiag: 'selection',
  caseAnalysis: 'text-input',
  medicalRecord: 'text-input',
  treatmentPlan: 'text-input',
}
```

#### 2.2.2 路由名→Session Key 映射

```javascript
import { STATION_TO_SESSION_KEY } from '@ai-sp/shared'

// 补充 STATION_TO_SESSION_KEY 缺失的映射
const ROUTE_TO_SESSION_KEY = {
  ...STATION_TO_SESSION_KEY,
  ancillaryTests: 'ancillaryTests',
  diagnosis: 'diagnosis',
}
```

#### 2.2.3 Data Extractor 实现

每个Extractor输入：`trainingSession[sessionKey]`（单个考站的原始数据），输出：`{ hasActivity: boolean, summary: string, detail: string } | null`

**Extractor 1 — 对话类考站（病史采集/精神检查/人文沟通）：**

```javascript
function extractDialogStation(sessionData) {
  const messages = sessionData?.messages || []
  const notes = sessionData?.notes || ''
  const markedCount = sessionData?.markedCount || 0
  if (messages.length === 0) return null

  const userMsgs = messages.filter(m => m.role === 'user')
  const spMsgs = messages.filter(m => m.role === 'sp')
  const parts = [`共${messages.length}轮对话（学员发言${userMsgs.length}条）`]

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
  }
}
```

**Extractor 2 — 体格检查（特殊对话类）：**

```javascript
function extractPhysicalExam(sessionData) {
  const messages = sessionData?.messages || []
  const examHistory = sessionData?.examHistory || []
  if (messages.length === 0 && examHistory.length === 0) return null

  const parts = []
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
  }
}
```

**Extractor 3 — 选择类考站（辅助检查/诊断/初步诊断）：**

```javascript
function extractSelectionStation(sessionData) {
  if (!sessionData) return null

  // 辅助检查站：检测 selections 数组
  if (sessionData.selections && Array.isArray(sessionData.selections)) {
    const selected = sessionData.selections
    if (selected.length === 0) return null
    const names = selected.map(s => s.name).filter(Boolean)
    const results = sessionData.results?.filter(r => r.viewed) || []
    const parts = [`选择了${selected.length}项辅助检查：${names.join('、')}`]
    if (results.length > 0) parts.push(`已查看${results.length}项检查结果`)
    return { hasActivity: true, summary: parts.join('。'), detail: names.join('\n') }
  }

  // 诊断站/初步诊断站：检测诊断字段
  const preliminary = sessionData.preliminary || ''
  const differential = sessionData.differential || ''
  const basis = sessionData.basis || ''
  const final = sessionData.final || ''
  const icdCode = sessionData.icdCode || ''

  if (!preliminary && !differential && !basis && !final) return null

  const parts = []
  if (preliminary) parts.push(`初步诊断：${preliminary}`)
  if (differential) parts.push(`鉴别诊断：${differential}`)
  if (basis) parts.push(`诊断依据：${basis.slice(0, 300)}`)
  if (final) parts.push(`最终诊断：${final}${icdCode ? `（ICD：${icdCode}）` : ''}`)

  return { hasActivity: true, summary: parts.join('；'), detail: parts.join('\n') }
}
```

**Extractor 4 — 文本输入类考站（临床思维/病历书写/治疗计划）：**

```javascript
function extractTextInputStation(sessionData) {
  if (!sessionData) return null

  // 临床思维站：{ questions, answers }
  if (sessionData.answers && sessionData.questions) {
    const answered = sessionData.answers.filter(Boolean).length
    if (answered === 0) return null
    const parts = [`共${sessionData.questions.length}道病例分析题，已作答${answered}题`]
    sessionData.answers.forEach((ans, i) => {
      if (ans) parts.push(`第${i + 1}题答案：${ans.slice(0, 150)}`)
    })
    return { hasActivity: true, summary: parts[0], detail: parts.join('\n') }
  }

  // 病历书写站：纯文本字符串
  if (typeof sessionData === 'string') {
    const text = sessionData.trim()
    if (!text) return null
    return { hasActivity: true, summary: `已撰写病历，共${text.length}字`, detail: text.slice(0, 500) }
  }

  // 治疗计划站：{ content }
  if (sessionData.content) {
    return { hasActivity: true, summary: `已制定治疗计划，共${sessionData.content.length}字`, detail: sessionData.content.slice(0, 500) }
  }

  return null
}
```

#### 2.2.4 主入口：buildActivityContext

```javascript
export function buildActivityContext(routeName, trainingSession) {
  const currentStationId = routeName || ''
  const currentStationLabel = STATION_ID_TO_LABEL[currentStationId] || currentStationId
  const currentCategory = getStationCategory(currentStationId)

  const stationSnapshots = {}
  const stationsWithActivity = []
  let recentActivityStation = null

  const allKeys = trainingSession ? Object.keys(trainingSession) : []

  for (const key of allKeys) {
    const sessionData = trainingSession[key]
    if (!sessionData || typeof sessionData !== 'object') continue

    const stationId = findStationIdBySessionKey(key)
    if (!stationId) continue

    const category = getStationCategory(stationId)
    let snapshot = null

    if (stationId === 'physicalExam') {
      snapshot = extractPhysicalExam(sessionData)
    } else if (category === 'dialog') {
      snapshot = extractDialogStation(sessionData)
    } else if (category === 'selection') {
      snapshot = extractSelectionStation(sessionData)
    } else if (category === 'text-input') {
      snapshot = extractTextInputStation(sessionData)
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
  const stationsWithoutActivity = []
  for (const [stationId, category] of Object.entries(STATION_CATEGORY)) {
    if (!stationSnapshots[stationId]) {
      stationSnapshots[stationId] = {
        hasActivity: false, category,
        stationLabel: STATION_ID_TO_LABEL[stationId] || stationId,
        summary: null, detail: null,
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
function findStationIdBySessionKey(sessionKey) {
  for (const [stationId, key] of Object.entries(ROUTE_TO_SESSION_KEY)) {
    if (key === sessionKey) return stationId
  }
  if (STATION_CATEGORY[sessionKey]) return sessionKey
  if (sessionKey === 'humanisticComm') return 'humanisticComm'
  if (sessionKey === 'preliminaryDiag') return 'preliminaryDiag'
  if (sessionKey === 'caseAnalysis') return 'caseAnalysis'
  return null
}

export function getStationCategory(stationId) {
  return STATION_CATEGORY[stationId] || 'special'
}
```

#### 2.2.5 数据模型：ActivityContext

```typescript
interface ActivityContext {
  currentStation: {
    id: string           // 路由名，如 'historyTaking'
    label: string        // 中文名，如 '接诊病人站'
    category: string     // 'dialog' | 'selection' | 'text-input' | 'special'
  }
  stationSnapshots: {
    [stationId: string]: {
      hasActivity: boolean
      category: string
      stationLabel: string
      summary: string | null   // 自然语言摘要
      detail: string | null    // 详细数据（截断后）
    }
  }
  global: {
    stationsWithActivity: string[]
    stationsWithoutActivity: string[]
    recentActivityStation: string | null
    totalVisited: number
    hasAnyActivity: boolean
  }
}
```

#### 2.2.6 数据模型：trainingSession

```typescript
// trainingSession 由各考站运行时写入，是扁平的 key-value 对象
interface TrainingSession {
  // 对话类
  historyTaking?:     { messages: Message[], notes?: string, markedCount?: number }
  mentalExam?:        { messages: Message[], notes?: string, markedCount?: number }
  humanisticComm?:    { messages: Message[], notes?: string, markedCount?: number }

  // 体格检查（特殊对话类）
  physicalExam?:      { messages: Message[], examHistory?: ExamRecord[] }

  // 选择类
  ancillaryTests?:    { selections: Selection[], results?: Result[] }
                      // 或诊断类字段：
                      // { preliminary?: string, differential?: string, basis?: string, final?: string, icdCode?: string }
  diagnosis?:         { preliminary?: string, differential?: string, basis?: string, final?: string, icdCode?: string }
  preliminaryDiag?:   { preliminary?: string, differential?: string, basis?: string, final?: string, icdCode?: string }

  // 文本输入类
  caseAnalysis?:      { questions: string[], answers: string[] }
  medicalRecord?:     string              // 纯文本
  treatmentPlan?:     { content: string }
}

interface Message {
  role: 'user' | 'sp' | 'system'
  content: string
}
```

---

## 3. 专家点评智能体

### 3.1 概述

**文件：`apps/training/src/composables/useExpertAgent.js`**

**依赖：** `useExpertContext.js`, `useAIChat.js`, `@ai-sp/shared`

**导出接口：**

```javascript
export function useExpertAgent() {
  return {
    askExpert,            // 主入口 — 完整五层编排
    expertAiLoading,      // 加载状态 ref
    buildActivityContext, // 暴露第一层（供调试/AI伴学复用）
    classifyIntent,       // 暴露第二层（供调试）
    getStationLabel,      // 工具函数
  }
}
```

### 3.2 专家配置数据模型

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
| `caseId` | string | 是 | 关联病例 |
| `expertEnabled` | boolean | 是 | 功能开关 |
| `expertName` | string | 是 | 注入Prompt角色段 |
| `expertTitle` | string | 是 | 注入Prompt角色段 |
| `expertAvatar` | string | 否 | UI头像 |
| `expertTags` | string[] | 否 | UI标签 |
| `reviewTitle` | string | 否 | 展示用标题 |
| `expertKB` | string | 是 | 专家知识库全文，注入Prompt数据段 |

### 3.3 第二层：意图识别 — classifyIntent

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

```javascript
const INTENT_KEYWORDS = {
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

```javascript
function classifyIntent(userMessage) {
  const q = userMessage || ''
  const lower = q.toLowerCase()
  const results = []

  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
    let score = 0
    for (const kw of keywords) {
      if (lower.includes(kw)) score += 1
    }
    if (score > 0) {
      results.push({ intent, score, confidence: Math.min(score / 3, 1.0) })
    }
  }

  results.sort((a, b) => b.score - a.score)

  const stationNames = ['问诊', '接诊', '体格检查', '查体', '辅助检查', '诊断', '治疗', '病历', '沟通', '精神检查', '临床思维']
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

### 3.4 第三层：上下文组装 — buildExpertSystemPrompt

三段式Prompt模板，每段有独立构建函数。

#### 段1：角色段

```javascript
function buildSegmentRole(expertData, stationLabel) {
  const name = expertData?.expertName || '临床专家'
  const title = expertData?.expertTitle || ''
  return `你是${name}（${title}），一位顶级临床专家。你正在${stationLabel}考站为医学学员进行教学点评和答疑。以第一人称"我"自称，语言专业、亲和、具体。`
}
```

#### 段2：数据段（按意图选择数据源）

```javascript
function buildSegmentData(ctx, intent, caseInfo, expertData) {
  const parts = []

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

```javascript
function buildSegmentInstruction(ctx, intent) {
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

```javascript
export function buildExpertSystemPrompt(expertData, caseInfo, stationLabel, ctx, intent) {
  const segmentRole = buildSegmentRole(expertData, stationLabel)
  const segmentData = buildSegmentData(ctx, intent, caseInfo, expertData)
  const segmentInstruction = buildSegmentInstruction(ctx, intent)

  const parts = [segmentRole]
  if (segmentData) parts.push(segmentData)
  parts.push(segmentInstruction)

  // 追加 follow-up 指令
  parts.push('在回复末尾，用<!--SUGGESTIONS-->标记后附一个JSON数组，包含3个学员可能感兴趣的后续问题。格式：<!--SUGGESTIONS-->["问题1","问题2","问题3"]')

  return parts.join('\n\n')
}
```

### 3.5 第四层：回复策略 — selectResponseStrategy

```javascript
function selectResponseStrategy(intent, ctx) {
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

### 3.6 第五层：智能推荐

#### 通道1：解析 LLM 推荐

```javascript
function parseSuggestions(text) {
  const match = text.match(/<!--SUGGESTIONS-->\s*(\[.+?\])/s)
  if (!match) return null
  try {
    const arr = JSON.parse(match[1])
    if (Array.isArray(arr) && arr.length > 0) {
      return arr.filter(q => typeof q === 'string' && q.trim()).slice(0, 3)
    }
  } catch { /* ignore */ }
  return null
}
```

#### 通道2：模板填充兜底

```javascript
function generateTemplateFollowUps(userQuestion, ctx) {
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

```javascript
function getFollowUps(responseText, userQuestion, ctx) {
  const parsed = parseSuggestions(responseText)
  if (parsed) return parsed
  return generateTemplateFollowUps(userQuestion, ctx)
}

function cleanResponseText(text) {
  return text.replace(/<!--SUGGESTIONS-->\s*\[.+?\]\s*$/s, '').trim()
}
```

### 3.7 主入口编排

```javascript
export function useExpertAgent() {
  const { sendMessage: sendExpertMessage, loading: expertAiLoading } = useAIChat()

  async function askExpert(expertData, caseInfo, stationLabel, routeName,
                           trainingSession, messages, question) {
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
    const llmMessages = messages.map(m => ({
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
      intent: intent.primaryIntent,
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

## 4. AI伴学智能体

### 4.1 概述

**文件：`apps/training/src/composables/useAICompanion.js`**（需新建）

**依赖：** `useExpertContext.js`, `useAIChat.js`, `@ai-sp/shared`

**导出接口：**

```javascript
export function useAICompanion() {
  return {
    askCompanion,          // 主入口 — 完整五层编排
    companionLoading,      // 加载状态 ref
  }
}
```

### 4.2 与专家智能体的核心差异

| 维度 | 专家 | AI伴学 |
|------|------|--------|
| 角色 | 真实专家，第一人称"我" | 教学助手，无具体身份 |
| 知识来源 | expertKB（病例专属知识库） | 通用医学知识 + 病例信息 |
| 能否点评 | **能** | **不能，明确禁止** |
| 点评请求处理 | 执行点评 | 引导去专家点评Tab |
| 意图体系 | 6种（含review/cross_station） | 5种（无review/cross_station） |
| 推荐问题方向 | 追问不足、改进建议 | 探索知识、深入理解 |
| 语气 | 权威评判 | 鼓励引导 |

### 4.3 第二层：意图识别

#### 意图体系（5种，无点评类意图）

| 意图ID | 用户示例 | 说明 |
|--------|---------|------|
| `concept_explanation` | "Graves病是什么"、"这个机制怎么理解" | 知识讲解 |
| `procedural_guidance` | "下一步做什么"、"应该查什么" | 操作引导 |
| `differential_help` | "怎么鉴别A和B"、"可能是什么病" | 鉴别诊断辅助 |
| `case_understanding` | "这个病例的关键点"、"主诉提示什么" | 病例理解 |
| `casual_chat` | "你好"、"谢谢" | 闲聊 |

#### 关键词表

```javascript
const COMPANION_INTENT_KEYWORDS = {
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
  // 点评类关键词 —— 检测到后引导去专家Tab
  review_keywords: [
    '点评', '评价', '怎么样', '不足', '打分', '问题在哪',
    '哪里不好', '表现如何', '做的怎么样', '请评价', '帮我看看',
    '有什么改进', '哪里需要改进', '做得好不好', '对不对', '正确吗',
    '整体', '综合', '全流程', '总评',
  ],
}
```

#### 分类算法（含点评检测）

```javascript
function classifyCompanionIntent(userMessage) {
  const q = userMessage || ''
  const lower = q.toLowerCase()
  const results = []

  // 先检测是否为点评请求 → 特殊处理
  let isReviewRequest = false
  for (const kw of COMPANION_INTENT_KEYWORDS.review_keywords) {
    if (lower.includes(kw)) { isReviewRequest = true; break }
  }

  for (const [intent, keywords] of Object.entries(COMPANION_INTENT_KEYWORDS)) {
    if (intent === 'review_keywords') continue // 跳过，只用于检测
    let score = 0
    for (const kw of keywords) {
      if (lower.includes(kw)) score += 1
    }
    if (score > 0) {
      results.push({ intent, score, confidence: Math.min(score / 3, 1.0) })
    }
  }

  results.sort((a, b) => b.score - a.score)

  return {
    primaryIntent: results.length > 0 ? results[0].intent : 'concept_explanation',
    allIntents: results,
    confidence: results.length > 0 ? results[0].confidence : 0.5,
    isReviewRequest,  // 标记：用户是否在请求点评
    needsLLMFallback: results.length === 0 || results[0].confidence < 0.4,
  }
}
```

### 4.4 第三层：上下文组装

#### 段1：角色段

```javascript
function buildCompanionRole(stationLabel) {
  return `你是一位临床教学助手，正在帮助医学学员进行${stationLabel}考站的临床思维训练。你不是临床专家，不对学员的表现做评判性点评。你的角色是引导学员自己思考、解答知识疑问、提供学习建议。以温和、鼓励的语气回答。当学员有疑问时，优先用反问引导他自己找到答案。`
}
```

#### 段2：数据段

```javascript
function buildCompanionData(ctx, intent, caseInfo) {
  const parts = []

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

```javascript
function buildCompanionInstruction(ctx, intent) {
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

```javascript
export function buildCompanionSystemPrompt(caseInfo, stationLabel, ctx, intent) {
  const segmentRole = buildCompanionRole(stationLabel)
  const segmentData = buildCompanionData(ctx, intent, caseInfo)
  const segmentInstruction = buildCompanionInstruction(ctx, intent)

  const parts = [segmentRole]
  if (segmentData) parts.push(segmentData)
  parts.push(segmentInstruction)

  // 通用约束
  parts.push('重要约束：1) 你不对学员的操作表现做评判性点评（不评价好坏对错）。2) 如果学员要求点评他的表现，礼貌引导他去"专家点评"Tab。3) 你的定位是教学辅助，帮助学员自己思考和成长。')

  // Follow-up 指令
  parts.push('在回复末尾，用<!--SUGGESTIONS-->标记后附一个JSON数组，包含3个学员可能感兴趣的后续问题。格式：<!--SUGGESTIONS-->["问题1","问题2","问题3"]')

  return parts.join('\n\n')
}
```

### 4.5 第四层：回复策略

```javascript
function selectCompanionStrategy(intent) {
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

### 4.6 第五层：智能推荐

AI伴学的推荐问题方向与专家不同——探索引导型而非追问不足型。

```javascript
function parseCompanionSuggestions(text) {
  // 与专家智能体完全相同的解析逻辑
  const match = text.match(/<!--SUGGESTIONS-->\s*(\[.+?\])/s)
  if (!match) return null
  try {
    const arr = JSON.parse(match[1])
    if (Array.isArray(arr) && arr.length > 0) {
      return arr.filter(q => typeof q === 'string' && q.trim()).slice(0, 3)
    }
  } catch { /* ignore */ }
  return null
}

function generateCompanionFollowUps(userQuestion, ctx) {
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

function getCompanionFollowUps(responseText, userQuestion, ctx) {
  const parsed = parseCompanionSuggestions(responseText)
  if (parsed) return parsed
  return generateCompanionFollowUps(userQuestion, ctx)
}

function cleanCompanionResponseText(text) {
  return text.replace(/<!--SUGGESTIONS-->\s*\[.+?\]\s*$/s, '').trim()
}
```

### 4.7 主入口编排

```javascript
export function useAICompanion() {
  const { sendMessage, loading: companionLoading } = useAIChat()

  async function askCompanion(caseInfo, stationLabel, routeName,
                              trainingSession, messages, question) {
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
    const llmMessages = messages.map(m => ({
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
    }
  }

  return { askCompanion, companionLoading }
}
```

---

## 5. 前端集成

### 5.1 组件：AICompanionDrawer.vue

**文件：`apps/training/src/components/AICompanionDrawer.vue`**

组件职责：
1. 渲染双Tab UI（智能问答 + 专家点评）
2. 管理两个独立的消息列表状态
3. 加载专家配置数据
4. 提供各考站的初始推荐问题
5. 调用对应的智能体并处理返回结果

#### 关键状态

```javascript
// ── 共享 ──
const open = ref(false)
const activeTab = ref('qa')          // 'qa' | 'commentary'
const route = useRoute()
const store = useTrainingStore()
const stationLabel = computed(() => getStationLabel(route.name) || '')

// ── AI伴学 ──
const { sendMessage, loading: aiLoading } = useAIChat()
const qaInput = ref('')
const qaMessages = ref([...])
const suggestedQuestions = computed(() => stationQuestionMap[route.name] || defaultQuestions)

// ── 专家点评 ──
const { askExpert, expertAiLoading } = useExpertAgent()
const expertData = ref(null)
const expertLoading = ref(false)
const expertMessages = ref([])
const expertInput = ref('')
const expertSuggestedQuestions = computed(() => expertQuestionMap[route.name] || defaultExpertQuestions)
```

#### 病例信息提取

```javascript
function getCaseInfo() {
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

```javascript
const stationQuestionMap = {
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

const defaultQuestions = [
  '这个病例的关键点是什么？',
  '我应该从哪些方面入手？',
  '有哪些容易遗漏的地方？',
]
```

**专家点评（按考站）：**

```javascript
const expertQuestionMap = {
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
    '我的精神检查有并什么遗漏？',
    '这个病例的精神检查要点是什么？',
  ],
}
```

#### 专家配置加载

```javascript
async function loadExpertData() {
  if (expertData.value || expertLoading.value) return
  expertLoading.value = true
  try {
    const caseData = store.currentCase || getCached(store.currentCase?.caseId || store.currentCase?.id)
    const caseId = caseData?.caseId || store.currentCase?.case_id || store.currentCase?.id
    if (!caseId) { expertLoading.value = false; return }

    // 1. 尝试缓存
    if (caseData?.expert) {
      expertData.value = caseData.expert
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
          reviewTitle: json.reviewTitle || ''
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

**AI伴学发送：**

```javascript
async function askQuestion(q) {
  const question = typeof q === 'string' ? q : qaInput.value.trim()
  if (!question || aiLoading.value) return

  qaMessages.value.push({ type: 'user', text: question })
  qaInput.value = ''
  scrollToBottom()

  const systemPrompt = buildCompanionSystemPrompt(
    getCaseInfo(), stationLabel.value, buildActivityContext(route.name, store.trainingSession),
    classifyCompanionIntent(question)
  )

  const llmMessages = qaMessages.value.map(m => ({
    role: m.type === 'user' ? 'user' : 'assistant',
    content: m.text
  }))

  const result = await sendMessage(llmMessages, systemPrompt)
  qaMessages.value.push({ type: 'ai', text: result.content })
  scrollToBottom()
}
```

> **注意**：以上是当前AI伴学的简化实现。重构为五层流水线后，应改为调用 `askCompanion()`，与专家智能体的调用模式一致。

**专家点评发送：**

```javascript
async function askExpertQuestion(q) {
  const question = typeof q === 'string' ? q : expertInput.value.trim()
  if (!question || expertAiLoading.value || !expertData.value) return

  expertMessages.value.push({ type: 'user', text: question })
  if (typeof q === 'string') expertInput.value = ''
  else expertInput.value = ''
  scrollExpertToBottom()

  const response = await askExpert(
    expertData.value,
    getCaseInfo(),
    stationLabel.value,
    route.name,
    store.trainingSession,
    expertMessages.value,
    question
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
  智能问答
</div>
<div class="panel-tab" :class="{ active: activeTab === 'commentary' }" @click="activeTab = 'commentary'">
  专家点评
</div>

<!-- AI伴学Tab -->
<div v-show="activeTab === 'qa'">
  <!-- 初始推荐问题 chips -->
  <div class="suggested-qs">
    <button v-for="q in suggestedQuestions" @click="askQuestion(q)">{{ q }}</button>
  </div>
  <!-- 消息列表 -->
  <div class="qa-messages">
    <div v-for="(msg, i) in qaMessages" :class="['qa-msg', msg.type]">
      <span v-if="msg.type === 'ai'">🤖 </span>{{ msg.text }}
    </div>
    <div v-if="aiLoading" class="qa-msg ai typing">...</div>
  </div>
  <!-- 输入框 -->
  <div class="qa-input-row">
    <input v-model="qaInput" @keydown.enter="askQuestion()" />
    <button @click="askQuestion()">发送</button>
  </div>
</div>

<!-- 专家点评Tab -->
<div v-show="activeTab === 'commentary'">
  <!-- 无专家配置 → 空状态 -->
  <div v-if="!expertData" class="expert-empty">...</div>
  <!-- 有专家配置 → 完整界面 -->
  <div v-else>
    <!-- 专家信息卡片 -->
    <div class="expert-profile">
      <img :src="expertData.expertAvatar" />
      <div class="expert-name">{{ expertData.expertName }}</div>
      <div class="expert-dept">{{ expertData.expertTitle }}</div>
      <span v-for="tag in expertData.expertTags">{{ tag }}</span>
    </div>
    <!-- 对话区 -->
    <div class="expert-chat">
      <!-- 初始推荐问题（无消息时显示） -->
      <div v-if="expertMessages.length === 0" class="suggested-qs">
        <button v-for="q in expertSuggestedQuestions" @click="askExpertQuestion(q)">{{ q }}</button>
      </div>
      <!-- 消息列表（带专家头像） -->
      <div class="expert-chat-messages">
        <div v-for="(msg, i) in expertMessages">
          <div v-if="msg.type === 'ai'" class="qa-msg-avatar">
            <img :src="expertData.expertAvatar" />
          </div>
          <div class="qa-msg-bubble" v-html="msg.html || msg.text"></div>
          <!-- 最后一条AI消息下方显示 follow-up chips -->
          <div v-if="msg.type === 'ai' && msg.followUps?.length && i === expertMessages.length - 1"
               class="followup-chips">
            <button v-for="fq in msg.followUps" @click="askExpertQuestion(fq)">{{ fq }}</button>
          </div>
        </div>
        <div v-if="expertAiLoading" class="qa-msg ai typing">...</div>
      </div>
      <!-- 输入框 -->
      <div class="qa-input-row">
        <input v-model="expertInput" @keydown.enter="askExpertQuestion()" />
        <button @click="askExpertQuestion()">发送</button>
      </div>
    </div>
  </div>
</div>
```

---

## 6. 文件清单与依赖关系

### 6.1 需要创建/修改的文件

```
apps/training/src/composables/
├── useAIChat.js           ← [已存在] LLM调用封装，无需修改
├── useExpertContext.js    ← [已存在] 活动感知层，无需修改
├── useExpertAgent.js      ← [已存在] 专家点评智能体，无需修改
└── useAICompanion.js      ← [新建] AI伴学智能体（五层流水线）

apps/training/src/components/
└── AICompanionDrawer.vue  ← [修改] 接入 useAICompanion，替换内联逻辑

apps/admin/public/data/cases/
├── {caseId}-expert.json   ← [已存在] 专家配置文件（管理端编辑）
└── ...

packages/shared/src/
└── station-constants.js   ← [已存在] 考站常量，无需修改
```

### 6.2 依赖图

```
useAIChat.js (无依赖)
     │
     ├──→ useExpertAgent.js
     │         │
     │         └──→ useExpertContext.js ──→ @ai-sp/shared
     │
     ├──→ useAICompanion.js
     │         │
     │         └──→ useExpertContext.js ──→ @ai-sp/shared
     │
     └──→ AICompanionDrawer.vue
               │
               ├──→ useExpertAgent.js
               ├──→ useAICompanion.js (重构后)
               ├──→ useAIChat.js (重构前，仅AI伴学使用)
               └──→ useCaseLoader.js
```

### 6.3 AI伴学重构要点

当前AI伴学的逻辑（`buildSystemPrompt` + `askQuestion`）全部内联在 `AICompanionDrawer.vue` 中。重构时：

1. 创建 `useAICompanion.js`，将 Prompt 组装和策略逻辑移入
2. 在 `AICompanionDrawer.vue` 中引入 `useAICompanion`
3. 将 `askQuestion()` 中的 `buildSystemPrompt()` + `sendMessage()` 替换为 `askCompanion()`
4. AI伴学消息也加入 `followUps` 支持（当前没有）
5. 保持 `qaMessages` 和 `expertMessages` 两个独立消息列表不变

---

## 7. 配置与扩展

### 7.1 新增考站

1. **`@ai-sp/shared`**：在 `station-constants.js` 中添加 ID→Label 映射和 session key 映射
2. **`useExpertContext.js`**：在 `STATION_CATEGORY` 中添加分类；如属新类别，编写Extractor
3. **`useExpertAgent.js`**：如新考站需特殊指令，在 `buildSegmentInstruction` 中分支
4. **`useAICompanion.js`**：同上
5. **`AICompanionDrawer.vue`**：在 `stationQuestionMap` 和 `expertQuestionMap` 中添加初始推荐问题

### 7.2 新增意图类型

1. 在对应智能体的 `INTENT_KEYWORDS` 中添加关键词
2. 在 `buildSegmentInstruction` 中添加指令模板
3. 在 `selectResponseStrategy` 中添加策略配置
4. 在 `buildSegmentData` 中添加数据注入逻辑
5. 在 `generateTemplateFollowUps` 中添加兜底模板

### 7.3 专家配置扩展

如需支持不同专家角色（当前统一为滕皋军院士），只需为每个病例编写不同的 `{caseId}-expert.json`。角色段Prompt会自动从 `expertName` 和 `expertTitle` 字段生成。专家头像从 `expertAvatar` 字段加载。

### 7.4 调试开关

```javascript
if (import.meta.env.DEV) {
  console.log('[Agent] Layer 1 - ActivityContext:', ctx)
  console.log('[Agent] Layer 2 - Intent:', intent)
  console.log('[Agent] Layer 3 - SystemPrompt:', systemPrompt)
  console.log('[Agent] Layer 4 - Strategy:', strategy)
  console.log('[Agent] Layer 5 - FollowUps:', followUps)
}
```

### 7.5 性能注意事项

- `expertKB` 知识库建议 3000-5000 字以内
- 消息历史控制在最近 10 轮以内
- Extractor摘要 200 字以内，detail 500 字以内
- LLM超时 30 秒，点评/知识问答通常 5-15 秒完成

---

## 8. 设计决策记录

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

---

## 附录：两个智能体意图体系对照

| 专家点评智能体 | AI伴学智能体 | 说明 |
|-------------|-----------|------|
| `review_request` | ❌ (引导去专家Tab) | 点评是专家专属 |
| `cross_station_review` | ❌ (引导去专家Tab) | 跨站点评是专家专属 |
| `knowledge_question` | `concept_explanation` | 相似但语气不同 |
| `procedural_guidance` | `procedural_guidance` | 相似但专家更权威 |
| `comparison_request` | `differential_help` | 伴学偏向教学对比 |
| `casual_chat` | `casual_chat` | 相同 |
| ❌ | `case_understanding` | 伴学特有，帮助理解病例 |
