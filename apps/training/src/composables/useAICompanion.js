// AI伴学智能体 — 主入口 (五层流水线)
// 活动感知 → 意图识别 → 上下文组装 → 回复策略 → 智能推荐

import { ref } from 'vue'
import { buildActivityContext } from './useExpertContext.js'
import { useAIChat } from './useAIChat.js'
import { getStationLabel } from '@ai-sp/shared'

// ── 意图定义 ──
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
  // 点评类关键词 — 检测后引导去专家Tab
  review_keywords: [
    '点评', '评价', '怎么样', '不足', '打分', '问题在哪',
    '哪里不好', '表现如何', '做的怎么样', '请评价', '帮我看看',
    '有什么改进', '哪里需要改进', '做得好不好', '对不对', '正确吗',
    '整体', '综合', '全流程', '总评',
  ],
}

function classifyCompanionIntent(userMessage) {
  const q = userMessage || ''
  const lower = q.toLowerCase()
  const results = []

  // 点评请求检测
  let isReviewRequest = false
  for (const kw of COMPANION_INTENT_KEYWORDS.review_keywords) {
    if (lower.includes(kw)) { isReviewRequest = true; break }
  }

  for (const [intent, keywords] of Object.entries(COMPANION_INTENT_KEYWORDS)) {
    if (intent === 'review_keywords') continue
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
    isReviewRequest,
    needsLLMFallback: results.length === 0 || results[0].confidence < 0.4,
  }
}

// ── 上下文组装：三段式 Prompt ──

function buildCompanionRole(stationLabel) {
  return `你是一位临床教学助手，正在帮助医学学员进行${stationLabel}考站的临床思维训练。你不是临床专家，不对学员的表现做评判性点评。你的角色是引导学员自己思考、解答知识疑问、提供学习建议。以温和、鼓励的语气回答。当学员有疑问时，优先用反问引导他自己找到答案。`
}

function buildCompanionData(ctx, intent, caseInfo) {
  const parts = []

  if (caseInfo) {
    parts.push(`当前病例：${caseInfo.name}，${caseInfo.gender || ''}，${caseInfo.age || ''}岁`)
    if (caseInfo.chiefComplaint) parts.push(`主诉：${caseInfo.chiefComplaint}`)
    if (caseInfo.disease) parts.push(`疾病：${caseInfo.disease}`)
    if (caseInfo.specialty) parts.push(`科室：${caseInfo.specialty}`)
  }

  const hasActivity = ctx.global.hasAnyActivity
  if (hasActivity) {
    const visited = ctx.global.stationsWithActivity
    parts.push(`学员已完成${visited.length}个考站的训练：${visited.map(sid => ctx.stationSnapshots[sid]?.stationLabel || sid).join('、')}`)
    parts.push('各站操作记录：')
    for (const sid of visited) {
      const snap = ctx.stationSnapshots[sid]
      if (snap?.hasActivity) {
        parts.push(`【${snap.stationLabel}】${snap.summary}`)
        if (snap.detail) parts.push(snap.detail)
      }
    }
  } else {
    parts.push('学员尚未开始操作训练。')
  }

  return parts.join('\n')
}

function buildCompanionInstruction(ctx, intent) {
  const { primaryIntent, isReviewRequest } = intent

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

export function buildCompanionSystemPrompt(caseInfo, stationLabel, ctx, intent) {
  const segmentRole = buildCompanionRole(stationLabel)
  const segmentData = buildCompanionData(ctx, intent, caseInfo)
  const segmentInstruction = buildCompanionInstruction(ctx, intent)

  const parts = [segmentRole]
  if (segmentData) parts.push(segmentData)
  parts.push(segmentInstruction)

  parts.push('重要约束：1) 你不对学员的操作表现做评判性点评（不评价好坏对错）。2) 如果学员要求点评他的表现，礼貌引导他去"专家点评"Tab。3) 你的定位是教学辅助，帮助学员自己思考和成长。')

  parts.push('在回复末尾，用<!--SUGGESTIONS-->标记后附一个JSON数组，包含3个学员可能感兴趣的后续问题。格式：<!--SUGGESTIONS-->["问题1","问题2","问题3"]')

  return parts.join('\n\n')
}

// ── 回复策略 ──

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

// ── 智能推荐：LLM生成 + 模板填充双通道 ──

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

  return [
    `这个病例在${stationLabel}中有哪些关键要点？`,
    '能否结合临床指南再深入讲一下？',
    '还有哪些容易忽略的细节需要关注？',
  ]
}

function getFollowUps(responseText, userQuestion, ctx) {
  const parsed = parseSuggestions(responseText)
  if (parsed) return parsed
  return generateCompanionFollowUps(userQuestion, ctx)
}

function cleanResponseText(text) {
  return text.replace(/<!--SUGGESTIONS-->\s*\[.+?\]\s*$/s, '').trim()
}

// ── 主入口 hook ──

export function useAICompanion() {
  const { sendMessage, loading: companionLoading } = useAIChat()

  async function askCompanion(caseInfo, stationLabel, routeName, trainingSession, messages, question) {
    if (!question || companionLoading.value) return null

    // Layer 1: 活动感知
    const ctx = buildActivityContext(routeName, trainingSession)

    // Layer 2: 意图识别
    const intent = classifyCompanionIntent(question)

    // Layer 3: 上下文组装
    const systemPrompt = buildCompanionSystemPrompt(caseInfo, stationLabel, ctx, intent)

    // Layer 4: 回复策略
    const strategy = selectCompanionStrategy(intent)

    // Call LLM
    const llmMessages = messages.map(m => ({
      role: m.type === 'user' ? 'user' : 'assistant',
      content: m.text,
    }))

    const result = await sendMessage(llmMessages, systemPrompt, {
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
      isReviewRequest: intent.isReviewRequest,
    }
  }

  return {
    askCompanion,
    companionLoading,
    buildActivityContext,
    classifyCompanionIntent,
    getStationLabel,
  }
}
