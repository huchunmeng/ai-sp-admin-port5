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
