// ═══════════════════════════════════════════════════════════════
// 反思脑 POC Worker
// 管线: 对话 → 事件提取 (LLM) → 规则更新 (确定性) → 新 Cognitive Model
// ═══════════════════════════════════════════════════════════════

import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { applyEvents, applyEventRound, verifyDeterminism } from './event-mapping.js'
import { getReflectionPersona } from './personality-prompts.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

// 反思脑使用更强的模型
const REFLECTION_MODEL = process.env.REFLECTION_MODEL || 'qwen-plus'
const REFLECTION_PROMPT_PATH = join(__dirname, 'reflection-brain-prompt.txt')

// POC 专用 LLM 调用（分类任务用低温度，避免方差）
const LLM_API_KEY = () => process.env.LLM_API_KEY || ''
const LLM_API_URL = () => process.env.LLM_API_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'

async function callClassificationLLM(messages, system, model) {
  const llmMessages = system
    ? [{ role: 'system', content: system }, ...messages]
    : messages

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 180000)

  try {
    const resp = await fetch(LLM_API_URL(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LLM_API_KEY()}`
      },
      body: JSON.stringify({
        model,
        messages: llmMessages,
        temperature: 0.3,    // 分类任务用低温度
        max_tokens: 2000,
        enable_thinking: false,
      }),
      signal: controller.signal
    })
    clearTimeout(timeout)

    if (!resp.ok) throw new Error(`LLM API error ${resp.status}`)
    const result = await resp.json()
    return {
      content: result.choices?.[0]?.message?.content || '',
      model
    }
  } catch (e) {
    clearTimeout(timeout)
    throw e
  }
}

let _promptCache = null
function getReflectionPrompt() {
  if (!_promptCache) {
    _promptCache = readFileSync(REFLECTION_PROMPT_PATH, 'utf-8')
  }
  return _promptCache
}

/**
 * 将对话轮次格式化为反思脑输入
 * @param {Array} dialogue — [{round, role: 'student'|'sp', content}]
 * @returns {string}
 */
function formatDialogueForReflection(dialogue) {
  return dialogue
    .map(r => `[Round ${r.round}] ${r.role === 'student' ? '学生' : 'SP'}: ${r.content}`)
    .join('\n')
}

/**
 * 从 CM 构建结构化上下文（只含事实，不含解释性状态）
 *
 * ⚠️ 不给 LLM: trust, anxiety, stuck_count, attitude
 * ✅ 可以给: concern.primary, unresolved_goals, discussed_topics
 *
 * @param {object} cm — 当前 Cognitive Model
 * @returns {string}
 */
export function buildStructuredContext(cm) {
  const facts = []

  if (cm.concern?.primary) {
    facts.push(`SP当前主要担忧: "${cm.concern.primary}"`)
  }

  if (cm.unresolved_goals?.length > 0) {
    const goals = cm.unresolved_goals.slice(0, 10) // 防过长
    facts.push(`SP已提出但未解答的疑问:\n${goals.map(g => `  - ${g}`).join('\n')}`)
  }

  if (cm.discussed_topics?.length > 0) {
    facts.push(`已讨论过的话题: ${cm.discussed_topics.join(', ')}`)
  }

  return facts.join('\n\n')
}

/**
 * 增量事件提取: 只判本轮对话事件（生产模式）
 *
 * 与 extractEvents 的区别:
 *   - 只发本轮对话 + 结构化事实，不发全量历史
 *   - 输入 CM 提供上下文（只取事实字段）
 *   - 输出单轮事件，历史锁定不可重分类
 *
 * @param {object} cm — 当前 Cognitive Model（用于结构化上下文）
 * @param {Array} roundDialogue — 本轮对话 [{round, role, content}]
 * @param {object} options
 *   { model?: string, retries?: number, personality?: string, role?: string }
 * @returns {Promise<{success: boolean, events?: string[], rawOutput?: string, error?: string}>}
 */
export async function extractRoundEvents(cm, roundDialogue, options = {}) {
  const model = options.model || REFLECTION_MODEL
  const retries = options.retries ?? 2
  const context = buildStructuredContext(cm)

  const dialogueText = formatDialogueForReflection(roundDialogue)
  let systemPrompt = getReflectionPrompt()

  // 注入性格提示词 —— 影响反思脑对事件的分类解读
  const personality = options.personality
  if (personality && personality !== 'default') {
    const personaPrompt = getReflectionPersona(personality, options.role || 'patient')
    if (personaPrompt) {
      systemPrompt += '\n\n## 你的性格\n' + personaPrompt
    }
  }

  let userMessage
  if (context) {
    userMessage = `已知信息（仅作为上下文参考，不要重新分析）:\n${context}\n\n本轮对话:\n${dialogueText}\n\n只输出本轮的事件 JSON。`
  } else {
    userMessage = `分析以下对话，输出本轮触发的事件：\n\n${dialogueText}\n\n只输出 JSON，不要输出任何其他内容。`
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await callClassificationLLM(
        [{ role: 'user', content: userMessage }],
        systemPrompt,
        model
      )

      const parsed = parseReflectionOutput(result.content)
      if (parsed.success) {
        // 增量模式: 只取单轮事件
        const singleRound = parsed.rounds[0]
        if (!singleRound) {
          return { success: false, error: 'No round in output', rawOutput: result.content }
        }
        return {
          success: true,
          events: singleRound.events,
          round: singleRound.round,
          rawOutput: result.content,
          model: result.model,
        }
      }

      if (attempt === retries) {
        return {
          success: false,
          error: `Parse failed after ${retries + 1} attempts: ${parsed.error}`,
          rawOutput: result.content,
        }
      }
      userMessage += `\n\n上一次输出格式错误：${parsed.error}\n请严格按照要求的 JSON 格式重新输出。只输出本轮事件。`

    } catch (e) {
      if (attempt === retries) {
        return { success: false, error: `LLM call failed: ${e.message}` }
      }
    }
  }
}

/**
 * 解析反思脑 LLM 输出
 * @param {string} rawContent — LLM 返回的原始 JSON 文本
 * @returns {{ success: boolean, rounds?: Array, error?: string }}
 */
function parseReflectionOutput(rawContent) {
  try {
    // 清理可能包裹的 markdown 代码块
    let json = rawContent.trim()
    if (json.startsWith('```')) {
      json = json.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '')
    }
    const parsed = JSON.parse(json)
    if (!parsed.rounds || !Array.isArray(parsed.rounds)) {
      return { success: false, error: 'Missing "rounds" array in output' }
    }
    // 验证每轮事件
    for (const r of parsed.rounds) {
      if (typeof r.round !== 'number') {
        return { success: false, error: `Invalid round number: ${r.round}` }
      }
      if (!Array.isArray(r.events)) {
        return { success: false, error: `Invalid events for round ${r.round}` }
      }
      // 过滤掉空字符串
      r.events = r.events.filter(e => e && e.trim())
    }
    return { success: true, rounds: parsed.rounds }
  } catch (e) {
    return { success: false, error: `JSON parse error: ${e.message}` }
  }
}

/**
 * 从对话中提取事件（Layer 1: LLM 分类）
 *
 * @param {Array} dialogue — [{round, role, content}]
 * @param {object} options
 *   { model?: string, retries?: number }
 * @returns {Promise<{success: boolean, rounds?: Array, rawOutput?: string, error?: string}>}
 */
async function extractEvents(dialogue, options = {}) {
  const model = options.model || REFLECTION_MODEL
  const retries = options.retries ?? 2

  const dialogueText = formatDialogueForReflection(dialogue)
  const systemPrompt = getReflectionPrompt()

  const userMessage = `分析以下对话，输出每轮触发的事件：

${dialogueText}

只输出 JSON，不要输出任何其他内容。`

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await callClassificationLLM(
        [{ role: 'user', content: userMessage }],
        systemPrompt,
        model
      )

      const parsed = parseReflectionOutput(result.content)
      if (parsed.success) {
        return {
          success: true,
          rounds: parsed.rounds,
          rawOutput: result.content,
          model: result.model,
        }
      }

      // 解析失败，记录但继续重试
      if (attempt === retries) {
        return {
          success: false,
          error: `Parse failed after ${retries + 1} attempts: ${parsed.error}`,
          rawOutput: result.content,
          rawOutputPreview: result.content?.slice(0, 300),
        }
      }
      // 重试：在 user message 后面追加错误提示
      userMessage += `\n\n上一次输出格式错误：${parsed.error}\n请严格按照要求的 JSON 格式重新输出。`

    } catch (e) {
      if (attempt === retries) {
        return { success: false, error: `LLM call failed: ${e.message}` }
      }
    }
  }
}

/**
 * 完整的反思脑管线: 事件提取 + 状态更新（批量/回放模式）
 *
 * @param {object} currentCM — 当前 Cognitive Model
 * @param {Array} dialogue — 对话历史 [{round, role, content}]
 * @param {object} options
 *   { model?, personality?, retries? }
 * @returns {Promise<object>}
 */
export async function runReflectionCycle(currentCM, dialogue, options = {}) {
  // ── Layer 1: 事件提取 (LLM) ──
  const extraction = await extractEvents(dialogue, {
    model: options.model,
    retries: options.retries,
  })

  if (!extraction.success) {
    return {
      success: false,
      error: extraction.error,
      stage: 'extraction',
    }
  }

  // ── Layer 2: 状态更新 (规则引擎) ──
  const result = applyEvents(currentCM, extraction.rounds, {
    personality: options.personality,
  })

  return {
    success: true,
    extraction: {
      model: extraction.model,
      rounds: extraction.rounds,
    },
    cognitiveModel: {
      before: { ...currentCM },
      after: result.finalCM,
      deltas: result.deltas,
      concern_migrated: result.concern_migrated,
    },
  }
}

/**
 * 增量反思脑管线: 事件提取 + 状态更新（生产模式）
 *
 * 只发本轮对话，CM 原地更新，历史事件锁定。
 *
 * @param {object} cm — 当前 CM（会被原地修改）
 * @param {Array} roundDialogue — 本轮对话 [{round, role, content}]
 * @param {object} options
 *   { model?, personality?, retries?, role? }
 * @returns {Promise<object>}
 */
export async function runReflectionIncremental(cm, roundDialogue, options = {}) {
  // ── Layer 1: 事件提取 (LLM, 增量) ──
  const extraction = await extractRoundEvents(cm, roundDialogue, {
    model: options.model,
    retries: options.retries,
    personality: options.personality,
    role: options.role,
  })

  if (!extraction.success) {
    return {
      success: false,
      error: extraction.error,
      stage: 'extraction',
    }
  }

  // ── Layer 2: 状态更新 (规则引擎, 单轮) ──
  const result = applyEventRound(cm, extraction.events, options.personality || 'default')

  return {
    success: true,
    extraction: {
      model: extraction.model,
      round: extraction.round,
      events: extraction.events,
      rawOutput: extraction.rawOutput,
    },
    cognitiveModel: {
      after: result.cm_after,
      delta: result.delta,
      concern_migrated: result.concern_migrated,
    },
  }
}

/**
 * 多轮运行验证: 同一对话跑多次，统计事件提取一致率
 *
 * @param {object} currentCM — 初始 Cognitive Model
 * @param {Array} dialogue — 对话历史
 * @param {number} runs — 重复次数
 * @param {object} options
 * @returns {Promise<object>}
 */
export async function validateConsistency(currentCM, dialogue, runs = 10, options = {}) {
  const allResults = []
  for (let i = 0; i < runs; i++) {
    const result = await runReflectionCycle(currentCM, dialogue, options)
    allResults.push(result)
  }

  // 统计事件提取一致率
  const extractionResults = allResults
    .filter(r => r.success)
    .map(r => JSON.stringify(r.extraction.rounds))

  const uniqueExtractions = new Set(extractionResults)
  // 找到最多的提取结果（众数）
  const counts = {}
  for (const e of extractionResults) {
    counts[e] = (counts[e] || 0) + 1
  }
  const maxCount = Math.max(...Object.values(counts))
  const consensusExtraction = Object.keys(counts).find(k => counts[k] === maxCount)

  const extractionConsistency = maxCount / runs

  // 统计最终 CM 方差（基于事件提取差异）
  const finalCMs = allResults
    .filter(r => r.success)
    .map(r => JSON.stringify(r.cognitiveModel.after))

  const uniqueCMs = new Set(finalCMs)
  const cmConsistency = uniqueCMs.size === 1 ? 1.0 : (1 / uniqueCMs.size)

  return {
    runs,
    successfulExtractions: extractionResults.length,
    extractionConsistency: Math.round(extractionConsistency * 1000) / 1000,
    uniqueExtractionPatterns: uniqueExtractions.size,
    consensusExtraction: consensusExtraction ? JSON.parse(consensusExtraction) : null,
    cmConsistency: Math.round(cmConsistency * 1000) / 1000,
    uniqueCMs: uniqueCMs.size,
    allResults: allResults.map(r => ({
      success: r.success,
      extraction: r.success ? r.extraction.rounds : null,
      finalCM: r.success ? r.cognitiveModel.after : null,
      error: r.error,
      rawOutputPreview: r.rawOutputPreview || null,
    })),
  }
}

export { extractEvents, verifyDeterminism }
