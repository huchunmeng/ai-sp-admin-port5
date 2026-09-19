// 影像报告书写训练 —— 会话状态（书写报告 → 评分与对照 / 四段草稿 / AI伴学对话 / AI 评分）
//
// 契约依据：PRD §5.4.1（字段规则）· §5.2.5（回合）· §5.10（持久化）· §5.7（提示引擎）· §5.9（评分引擎）。
// 本期无服务端：草稿与对话落 localStorage；AI伴学与评分都走 `useAIChat` → `/api/llm`。
//
// 已按 2026-09-19 评审批注调整（与最初封版的 PRD 不一致，需回写）：
//   1. 阶段：五阶段 T0–T4 → **两态**「书写报告 → 评分与对照」
//   2. **取消逐条自评**；「完成一例」= 提交报告
//   3. **取消要素自检面板**
//   4. **报告四段式**（补「一般信息」段 —— 原三段没有地方写 R1 维度一的 13 分）
//   5. 提示改为 **AI伴学对话**：学员自由提问，模型依据金标准与训练要求作答，**只引导不给答案**；
//      原「三级提示阶梯 + 配额 + 冷却」整块去掉（不再需要按段发放配额）
//   6. 提交报告后**自动发起 LLM 内容评分**（按要点集逐要点判定）

import { computed, reactive, watch } from 'vue'
import { SEGMENTS } from '@ai-sp/shared/imaging'
import { useReportCompanion } from './useReportCompanion'
import { useReportScoring } from './useReportScoring'

const SESSION_KEY = 'report_writing_session_v1'
const STATS_KEY = 'report_writing_stats_v1'

/** 四段合集字数上限（各段上限之和的兜底值） */
const TOTAL_LIMIT = 7000

/** 两态：书写报告 → 评分与对照 */
export const PHASES = [
  { key: 'write', name: '书写报告' },
  { key: 'review', name: '评分与对照' }
]

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch (e) { return fallback }
}

function writeJson(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)) } catch (e) { /* 隐私模式等，忽略 */ }
}

function emptyDraft() {
  // 四段：一般信息 / 检查技术 / 影像所见 / 诊断意见
  return { general: '', technique: '', findings: '', impression: '' }
}

export function readPracticeStats() {
  return readJson(STATS_KEY, {})
}

/**
 * 一个样本的一次训练会话。
 * @param {string} caseId
 * @param {object} sample 题库样本（含影像序列、脱敏信息、能力位、可评分、金标准）
 */
export function useReportSession(caseId, sample) {
  const saved = readJson(SESSION_KEY, {})[caseId] || {}
  const companion = useReportCompanion()
  const scorer = useReportScoring()

  const state = reactive({
    phase: saved.phase === 'review' ? 'review' : 'write',
    roundIndex: saved.roundIndex || 1,
    viewNotes: saved.viewNotes || '',
    draft: { ...emptyDraft(), ...(saved.draft || {}) },
    /** AI伴学对话流水 `[{ role:'user'|'ai', text, blocked? }]` */
    chat: saved.chat || [],
    /** 学员当前在写哪一段（决定 AI伴学的问题上下文） */
    activeSegment: saved.activeSegment || 'findings',
    chatLoading: false,
    /** AI 评分状态：idle / running / done / failed */
    scoringStatus: saved.scoringResult ? 'done' : 'idle',
    scoringResult: saved.scoringResult || null,
    scoringError: '',
    scoringAttempts: saved.scoringAttempts || 0,
    /** 申诉登记（本期只落数据，不做复核流程 —— PRD §5.9.3） */
    appeal: saved.appeal || null
  })

  function persist() {
    const all = readJson(SESSION_KEY, {})
    all[caseId] = {
      phase: state.phase,
      roundIndex: state.roundIndex,
      viewNotes: state.viewNotes,
      draft: { ...state.draft },
      chat: state.chat,
      activeSegment: state.activeSegment,
      scoringResult: state.scoringResult,
      scoringAttempts: state.scoringAttempts,
      appeal: state.appeal
    }
    writeJson(SESSION_KEY, all)
  }

  watch(state, persist, { deep: true })

  const inReview = computed(() => state.phase === 'review')

  const segments = computed(() => SEGMENTS.map(s => ({
    ...s,
    value: state.draft[s.key] || '',
    filled: String(state.draft[s.key] || '').trim().length > 0
  })))

  const totalChars = computed(() => SEGMENTS.reduce((a, s) => a + String(state.draft[s.key] || '').length, 0))
  const totalOver = computed(() => totalChars.value > TOTAL_LIMIT)

  /** 提交前提：四段都非空 */
  const missingSegments = computed(() => segments.value.filter(s => !s.filled).map(s => s.name))
  const canSubmit = computed(() => missingSegments.value.length === 0)
  const submitBlockReason = computed(() =>
    canSubmit.value ? '' : `${missingSegments.value.join('、')}还没写`)

  function setActiveSegment(key) {
    if (SEGMENTS.some(s => s.key === key)) state.activeSegment = key
  }

  /** 问 AI伴学一句（对话式；模型只引导，不给答案；出站过红线） */
  async function askCompanion(question) {
    const q = String(question || '').trim()
    if (!q || state.chatLoading) return { ok: false }
    state.chat.push({ role: 'user', text: q })
    state.chatLoading = true
    try {
      const res = await companion.ask({
        sample,
        reportText: { ...state.draft },
        segment: state.activeSegment,
        question: q,
        history: state.chat.slice(-7, -1)
      })
      state.chat.push({ role: 'ai', text: res.text, blocked: !!res.blocked })
      return res
    } finally {
      state.chatLoading = false
    }
  }

  /** 提交报告 → 进入评分与对照，并**立即发起评分** */
  async function toReview() {
    if (!canSubmit.value) return { ok: false, reason: submitBlockReason.value }
    state.phase = 'review'
    const stats = readPracticeStats()
    const prev = stats[caseId] || { completedRounds: 0, lastPracticedAt: null }
    stats[caseId] = {
      completedRounds: (prev.completedRounds || 0) + 1,
      lastPracticedAt: nowStamp()
    }
    writeJson(STATS_KEY, stats)
    runScoring()   // 不 await：UI 先切页展示"AI 评阅中"
    return { ok: true }
  }

  /** 运行（或重跑）评分。失败不阻塞学员：对照参考始终可用，只是没有分数 */
  async function runScoring() {
    if (state.scoringStatus === 'running') return { ok: false, reason: '评分正在进行中' }
    state.scoringStatus = 'running'
    state.scoringError = ''
    state.scoringAttempts += 1
    const res = await scorer.score({ sample, reportText: { ...state.draft } })
    if (res.ok) {
      state.scoringResult = res.result
      state.scoringStatus = 'done'
    } else {
      state.scoringResult = null
      state.scoringStatus = 'failed'
      state.scoringError = res.reason || '评分失败'
    }
    return res
  }

  /** 申诉登记（本期只落数据 —— PRD §5.9.3） */
  function fileAppeal(reason) {
    const text = String(reason || '').trim()
    if (!text) return { ok: false, reason: '请填写申诉原因' }
    if (text.length > 200) return { ok: false, reason: '申诉原因不超过 200 字' }
    state.appeal = { filedAt: nowStamp(), reason: text, score: state.scoringResult ? state.scoringResult.rawTotal : null }
    return { ok: true }
  }

  /** 重写：回到书写态继续改 —— 不新建回合、文本与对话保留 */
  function backToWrite() {
    state.phase = 'write'
  }

  /** 重练：新回合 —— roundIndex+1，清空文本、对话与评分 */
  function restartRound() {
    state.roundIndex += 1
    state.phase = 'write'
    state.draft = emptyDraft()
    state.viewNotes = ''
    state.chat = []
    state.scoringStatus = 'idle'
    state.scoringResult = null
    state.scoringError = ''
    state.scoringAttempts = 0
    state.appeal = null
  }

  const scoring = computed(() => ({
    status: state.scoringStatus,
    result: state.scoringResult,
    error: state.scoringError,
    attempts: state.scoringAttempts,
    appeal: state.appeal
  }))

  return {
    state, inReview, phases: PHASES,
    segments, totalChars, totalOver, TOTAL_LIMIT,
    canSubmit, missingSegments, submitBlockReason,
    askCompanion, setActiveSegment,
    toReview, backToWrite, restartRound,
    scoring, scoringRunning: computed(() => state.scoringStatus === 'running'),
    runScoring, fileAppeal
  }
}

function nowStamp() {
  const d = new Date()
  const p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}
