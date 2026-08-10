// ═══════════════════════════════════════════════════════════════
// 统一重复检测 — 合并 index.js isRepeat + emotion-engine.js detectRepetition
// 单一模块，消除双轨实现的阈值和逻辑差异
// ═══════════════════════════════════════════════════════════════

const SHORT_TEXT_THRESHOLD = 0.50 // 短文本(<12字) 3-gram Jaccard 阈值
const NORMAL_THRESHOLD = 0.55    // 正常文本 3-gram Jaccard 阈值
const SHORT_TEXT_LEN = 12

/**
 * 计算两个字符串的 3-gram Jaccard 相似度
 */
function trigramJaccard(a, b) {
  if (a.length < 3 || b.length < 3) return 0
  const aGrams = new Set()
  const bGrams = new Set()
  for (let i = 0; i < a.length - 2; i++) aGrams.add(a.substring(i, i + 3))
  for (let i = 0; i < b.length - 2; i++) bGrams.add(b.substring(i, i + 3))
  if (aGrams.size === 0 || bGrams.size === 0) return 0
  let overlap = 0
  for (const g of aGrams) { if (bGrams.has(g)) overlap++ }
  return overlap / Math.min(aGrams.size, bGrams.size)
}

/**
 * 检测新文本是否与近期回复重复
 * @param {string} newText - 待检测的新文本
 * @param {string[]} allTimeReplies - 全局历史回复（精确匹配）
 * @param {string[]} recentReplies - 近期回复（3-gram模糊匹配，最多10条）
 * @returns {boolean}
 */

/**
 * 检测学生是否在重复追问同一个问题（字符级 Jaccard）
 * @param {string} newText - 本轮学生输入
 * @param {Array} allMessages - 完整对话 [{role, content}]
 * @returns {object|null} { prevMsg, similarity } 或 null
 */
export function detectStudentRepeat(newText, allMessages = []) {
  const trimmed = newText
  const recentStudentMsgs = []
  for (let i = allMessages.length - 1; i >= 0 && recentStudentMsgs.length < 5; i--) {
    if (allMessages[i].role === 'user') recentStudentMsgs.unshift(allMessages[i].content)
  }
  for (const prev of recentStudentMsgs) {
    // 跳过当前消息自身（allMessages 在调用前已 push 当前输入，否则会把"新问题"误判成重复追问）
    if (prev === trimmed) continue
    const prevWords = new Set(prev.replace(/[？?！!，,。.、\s]+/g, '').split(''))
    const newWords = new Set(trimmed.replace(/[？?！!，,。.、\s]+/g, '').split(''))
    if (prevWords.size < 3 || newWords.size < 3) continue
    let overlap = 0
    for (const w of newWords) { if (prevWords.has(w)) overlap++ }
    const similarity = overlap / Math.max(prevWords.size, newWords.size)
    if (similarity > 0.55) {
      return { prevMsg: prev.slice(0, 40), similarity: similarity.toFixed(2) }
    }
  }
  return null
}

export function detectRepeat(newText, allTimeReplies = [], recentReplies = []) {
  if (!newText) return false

  // 精确匹配：与历史任一回复完全相同
  if (allTimeReplies.includes(newText)) return true

  // 短文本(<12字符)：降低阈值
  if (newText.length < SHORT_TEXT_LEN) {
    for (const reply of recentReplies) {
      if (reply.length < 4) continue
      if (trigramJaccard(newText, reply) > SHORT_TEXT_THRESHOLD) return true
    }
    return false
  }

  // 正常文本
  for (const reply of recentReplies) {
    if (reply.length < 4) continue
    if (trigramJaccard(newText, reply) > NORMAL_THRESHOLD) return true
  }
  return false
}

// ═══════════════════════════════════════════════════════════════
// 反问踢回检测 — SP 对学生具体追问却回以"纯反问/踢回"（零信息量）
// 仅用于服务端兜底：弱模型违反"具体问题必须直接回答"规则时的最后一道闸
// 注意：B 触发词场景（学生说"你继续说"等）反问踢回是合法行为，由调用方排除
// ═══════════════════════════════════════════════════════════════

const KICKBACK_PATTERNS = [
  /您问吧/, /你问吧/, /问我吧/, /问具体点/,
  /想问哪方面/, /问哪方面/, /从哪说起/,
  /您继续问/, /你继续问/,
  /您想知道什么/, /你想知道什么/,
  /^您[，,]?说[。!！]?$/, /^嗯[，,]?您说[。!！]?$/,
]

/**
 * 检测 SP 回复是否为纯反问踢回（把问题踢回给医生，不提供任何信息）
 * @param {string} text - SP 的回复文本
 * @returns {boolean}
 */
export function detectKickback(text) {
  if (!text) return false
  return KICKBACK_PATTERNS.some(p => p.test(text))
}

// ═══════════════════════════════════════════════════════════════
// 简短事实回答豁免 — 学生对近义问题反复追问时，SP 重复给出同一简短事实
// （"没有痰""四天前""不发烧"）是正常病人行为，不应触发重复重试/兜底降级
// 否则会像复读一样把 LLM 的正常回答降级成无信息量的语气词
// ═══════════════════════════════════════════════════════════════

const SHORT_FACT_MAX_LEN = 8
const PURE_TONE_WORDS = /^(嗯+|哦+|啊+|呃+|额+|唔+)$/

/**
 * 判断是否为"简短事实回答"（如"没有痰""四天前""不疼"）
 * 排除纯语气词（嗯/哦/啊）和反问踢回句
 * @param {string} text - SP 的回复文本
 * @returns {boolean}
 */
export function isShortFactAnswer(text) {
  if (!text) return false
  const t = text.replace(/[。！!？?\s，,、：:；;…~"“”'‘']+/g, '')
  if (t.length === 0 || t.length > SHORT_FACT_MAX_LEN) return false
  if (PURE_TONE_WORDS.test(t)) return false
  if (detectKickback(text)) return false
  return true
}

// ═══════════════════════════════════════════════════════════════
// 情绪回避检测 — SP 对学生具体病史追问却只用纯情绪话搪塞
// （"我现在很难受……""让我安静一下"），不含任何病史信息
// 仅当回复整体很短（≤12字）且命中情绪回避模式才算，避免误伤
// 带具体信息的长句（"我现在很难受，喘不上气"）不算回避
// ═══════════════════════════════════════════════════════════════

const EMOTIONAL_AVOID_PATTERNS = [
  '我现在很难受', '我好难受', '我很难受', '让我安静', '我不想说',
  '我不想说话', '心里难受', '说不出话', '缓一缓', '难受得',
  '不想谈', '现在不想', '你先别问', '别问了', '让我静一静',
]
const EMOTIONAL_AVOID_MAX_LEN = 10

/**
 * 判断 SP 回复是否为纯情绪回避（短情绪话，无病史信息）
 * @param {string} text - SP 的回复文本
 * @returns {boolean}
 */
export function isEmotionalAvoidReply(text) {
  if (!text) return false
  const t = text.replace(/[。！!？?\s，,、：:；;…~"“”'‘']+/g, '')
  if (t.length === 0 || t.length > EMOTIONAL_AVOID_MAX_LEN) return false
  return EMOTIONAL_AVOID_PATTERNS.some(p => text.includes(p))
}

// 纯语气词回复（"嗯。""哦。""啊"等）— 无任何信息量，属劣质输出
export function isToneOnlyReply(text) {
  if (!text) return true
  const t = text.replace(/[。！!？?\s，,、：:；;…~"“”'‘']+/g, '')
  if (t.length === 0) return true
  return PURE_TONE_WORDS.test(t)
}

// SP 复读学生问题（输出与学生消息几乎重合，如"有没有咳痰呢？"→"有没有咳痰呢？"）— 劣质
export function isEchoOfStudent(spReply, studentMsg) {
  if (!spReply || !studentMsg) return false
  const q = studentMsg.replace(/[？?！!，,。.、\s]+/g, '')
  const r = spReply.replace(/[？?！!，,。.、\s]+/g, '')
  if (!q || !r || q.length < 3) return false
  if (r.includes(q) && r.length <= q.length + 4) return true
  return false
}
