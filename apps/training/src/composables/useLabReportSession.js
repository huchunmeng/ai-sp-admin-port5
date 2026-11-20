import { ref, computed, watch } from 'vue'
import { evaluateLabCase } from '@ai-sp/shared/lab'

const KEY = 'lab_report_session_v1'

function readStore() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') } catch (e) { return {} }
}
function writeStore(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)) } catch (e) { /* 忽略配额错误 */ }
}

/** 列表页用：各病例的练习次数、最近得分 */
export function readLabStats() {
  const store = readStore()
  const out = {}
  Object.keys(store).forEach(id => {
    const s = store[id] || {}
    out[id] = { attempts: s.attempts || 0, score: s.score != null ? s.score : null, lastAt: s.lastAt || '' }
  })
  return out
}

export function useLabReportSession(caseItem) {
  const id = caseItem.id
  const own = readStore()[id] || {}

  const text = ref(own.draft || '')
  const scoring = ref(null)
  const scoringRunning = ref(false)
  const submittedAt = ref('')

  watch(text, v => {
    const s = readStore()
    s[id] = { ...(s[id] || {}), draft: v }
    writeStore(s)
  })

  const canSubmit = computed(() => text.value.trim().length >= 30)

  function submit() {
    if (!canSubmit.value || scoringRunning.value) return Promise.resolve(null)
    scoringRunning.value = true
    scoring.value = null
    return new Promise(resolve => {
      setTimeout(() => {
        const result = evaluateLabCase(caseItem, text.value)
        scoring.value = result
        scoringRunning.value = false
        submittedAt.value = new Date().toLocaleString('zh-CN', { hour12: false })

        const s = readStore()
        const prev = s[id] || {}
        s[id] = {
          ...prev,
          draft: text.value,
          attempts: (prev.attempts || 0) + 1,
          score: result.total,
          lastAt: submittedAt.value
        }
        writeStore(s)
        resolve(result)
      }, 900)
    })
  }

  function reset() {
    text.value = ''
    scoring.value = null
    submittedAt.value = ''
  }

  return { text, scoring, scoringRunning, submittedAt, canSubmit, submit, reset }
}
