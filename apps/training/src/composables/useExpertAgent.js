// 专家智能体 — 主入口 (五层流水线)
// 活动感知 → 意图识别 → 上下文组装 → 回复策略 → 智能推荐

import { ref } from 'vue'
import { buildActivityContext } from './useExpertContext.js'
import { useAIChat } from './useAIChat.js'
import { getStationLabel } from '@ai-sp/shared'

// ── 意图定义 ──
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

  // 检查是否有明确的考站名称
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

// ── 上下文组装：三段式 Prompt ──

function buildSegmentRole(expertData, stationLabel) {
  const name = expertData?.expertName || '临床专家'
  const title = expertData?.expertTitle || ''
  return `你是${name}（${title}），一位顶级临床专家。你正在${stationLabel}考站为医学学员进行教学点评和答疑。以第一人称"我"自称，语言专业、亲和、具体。`
}

function buildSegmentData(ctx, intent, caseInfo, expertData) {
  const parts = []

  // 病例信息
  if (caseInfo) {
    parts.push(`当前病例：${caseInfo.name}，${caseInfo.gender || ''}，${caseInfo.age || ''}岁`)
    if (caseInfo.chiefComplaint) parts.push(`主诉：${caseInfo.chiefComplaint}`)
    if (caseInfo.disease) parts.push(`疾病：${caseInfo.disease}`)
    if (caseInfo.specialty) parts.push(`科室：${caseInfo.specialty}`)
  }

  // 知识库
  if (expertData?.expertKB) {
    parts.push(`以下是你的领域知识库，请基于此内容进行点评和回答：\n${expertData.expertKB}`)
  }

  const { primaryIntent } = intent
  const hasActivity = ctx.global.hasAnyActivity

  // 按意图选择数据注入
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
    // 知识问题：给简要操作上下文，帮助举例
    const recent = ctx.global.recentActivityStation
    if (recent) {
      const snap = ctx.stationSnapshots[recent]
      parts.push(`学员最近在${snap.stationLabel}的操作（可用于举例）：${snap.summary}`)
    }
  }

  return parts.join('\n')
}

function buildSegmentInstruction(ctx, intent) {
  const { primaryIntent } = intent
  const hasActivity = ctx.global.hasAnyActivity

  if (primaryIntent === 'review_request') {
    if (!hasActivity) {
      return '重要：该学员目前尚未进行任何考站操作训练。如果学员请你点评表现或改进操作，你必须礼貌地告知：目前还没有操作记录可供点评，建议先去完成对应的考站训练。然后主动询问学员想了解病例的哪些方面，可以基于知识库进行知识讲解。禁止假装看到任何不存在的操作记录。'
    }
    return '请从以下三个方面进行针对性点评：1) 表现分析——学员操作的亮点与不足（必须引用上文操作记录中的具体内容）；2) 知识点讲解——结合该病例的关键临床知识点；3) 改进建议——给出现体、可操作的改进方法。'
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

  // casual_chat / fallback
  return '请以亲和、专业的语气回答。'
}

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

// ── 回复策略 ──

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

function generateTemplateFollowUps(userQuestion, ctx) {
  const stationLabel = ctx.currentStation.label
  const hasActivity = ctx.global.hasAnyActivity
  const q = userQuestion || ''

  // 根据提问类型选择不同模板方向
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

  // 通用模板
  const templates = [
    `这个病例在${stationLabel}中的核心要点是什么？`,
    '有哪些容易忽略的细节？',
    '还有什么需要特别注意的？',
  ]
  if (hasActivity) {
    templates[0] = `我在${stationLabel}中的操作有哪些可以改进的地方？`
  }
  return templates
}

function getFollowUps(responseText, userQuestion, ctx) {
  // 优先从 LLM 回复中解析
  const parsed = parseSuggestions(responseText)
  if (parsed) return parsed

  // 回退到模板填充
  return generateTemplateFollowUps(userQuestion, ctx)
}

// 清理回复文本中的 SUGGESTIONS 标记
function cleanResponseText(text) {
  return text.replace(/<!--SUGGESTIONS-->\s*\[.+?\]\s*$/s, '').trim()
}

// ── 主入口 hook ──

export function useExpertAgent() {
  const { sendMessage: sendExpertMessage, loading: expertAiLoading } = useAIChat()

  async function askExpert(expertData, caseInfo, stationLabel, routeName, trainingSession, messages, question) {
    if (!question || expertAiLoading.value) return null

    // Layer 1: 活动感知
    const ctx = buildActivityContext(routeName, trainingSession)

    // Layer 2: 意图识别
    const intent = classifyIntent(question)

    // Layer 3: 上下文组装
    const systemPrompt = buildExpertSystemPrompt(expertData, caseInfo, stationLabel, ctx, intent)

    // Layer 4: 回复策略
    const strategy = selectResponseStrategy(intent, ctx)

    // Call LLM
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
