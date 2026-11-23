import { ref, computed, watch } from 'vue'
import { evaluateLabCase, LAB_DEMO_RUNS } from '@ai-sp/shared/lab'

const KEY = 'lab_report_session_v1'

function readStore() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') } catch (e) { return {} }
}
function writeStore(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)) } catch (e) { /* 忽略配额错误 */ }
}

/**
 * 列表页用：各报告的练习次数、最近得分。
 * 先铺演示成绩（11-23 批注：报告里做演示数据，要有分数），再用本机真实记录覆盖——
 * 次数按累计算（演示的历史次数 + 本机练的次数），得分以本机最近一次为准。
 */
export function readLabStats() {
  const store = readStore()
  const out = {}
  LAB_DEMO_RUNS.forEach(d => {
    out[d.key] = { attempts: d.attempts, score: d.score, lastAt: d.lastAt, demo: true }
  })
  Object.keys(store).forEach(id => {
    const s = store[id] || {}
    const base = out[id] && out[id].demo ? out[id].attempts : 0
    out[id] = {
      attempts: base + (s.attempts || 0),
      score: s.score != null ? s.score : (out[id] ? out[id].score : null),
      lastAt: s.lastAt || (out[id] ? out[id].lastAt : ''),
      demo: !(s.attempts > 0)
    }
  })
  return out
}

/** 工作台用：这份报告上一次练习的成绩（本机记录优先，其次演示成绩） */
export function lastLabRun(report) {
  if (!report) return null
  const key = report.id
  const local = readStore()[key]
  if (local && local.attempts > 0 && local.score != null) {
    return {
      key, demo: false, attempts: local.attempts, score: local.score,
      lastAt: local.lastAt || '', result: local.draft ? evaluateLabCase(report, local.draft) : null
    }
  }
  return LAB_DEMO_RUNS.find(d => d.key === key) || null
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
