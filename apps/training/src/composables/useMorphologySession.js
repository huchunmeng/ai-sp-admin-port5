import { ref, watch } from 'vue'
import { scoreMorphSet } from '@ai-sp/shared/lab'

const KEY = 'lab_morph_session_v1'

function readStore() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') } catch (e) { return {} }
}
function writeStore(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)) } catch (e) { /* 忽略配额错误 */ }
}

/** 列表页用：各题库的练习次数、最近得分、最高分 */
export function readMorphStats() {
  const store = readStore()
  const out = {}
  Object.keys(store).forEach(id => {
    const s = store[id] || {}
    out[id] = {
      attempts: s.attempts || 0,
      score: s.score != null ? s.score : null,
      best: s.best != null ? s.best : null,
      lastAt: s.lastAt || ''
    }
  })
  return out
}

export function useMorphologySession(set) {
  const id = set.id
  const own = readStore()[id] || {}

  const answers = ref(own.draft && typeof own.draft === 'object' ? { ...own.draft } : {})
  const result = ref(null)
  const submittedAt = ref('')

  watch(answers, v => {
    const s = readStore()
    s[id] = { ...(s[id] || {}), draft: v }
    writeStore(s)
  }, { deep: true })

  function pick(qid, key) {
    answers.value = { ...answers.value, [qid]: [key] }
  }

  function isSelected(qid, key) {
    return (answers.value[qid] || []).includes(key)
  }

  function submit() {
    const r = scoreMorphSet(set, answers.value)
    result.value = r
    submittedAt.value = new Date().toLocaleString('zh-CN', { hour12: false })

    const s = readStore()
    const prev = s[id] || {}
    s[id] = {
      ...prev,
      draft: answers.value,
      attempts: (prev.attempts || 0) + 1,
      score: r.total,
      best: prev.best != null ? Math.max(prev.best, r.total) : r.total,
      lastAt: submittedAt.value
    }
    writeStore(s)
    return r
  }

  function reset() {
    answers.value = {}
    result.value = null
    submittedAt.value = ''
  }

  return { answers, result, submittedAt, pick, isSelected, submit, reset }
}
