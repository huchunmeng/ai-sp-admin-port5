// 影像报告书写训练 —— 会话状态（书写报告 → 评分与对照 / 四段草稿 / AI伴学对话 / AI 评分）
//
// 契约依据：PRD §5.4.1（字段规则）· §5.2.5（回合）· §5.10（持久化）· §5.7（提示引擎）· §5.9（评分引擎）。
import { MOCK_PRACTICE_RECORDS } from '@/data/mockPracticeRecords.js'

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

import { computed, reactive, ref, watch } from 'vue'
import { SEGMENTS, WRITABLE_SEGMENTS } from '@ai-sp/shared/imaging'
import { useReportCompanion } from './useReportCompanion'
import { useReportScoring } from '@ai-sp/shared/imaging-ui'

const SESSION_KEY = 'report_writing_session_v1'
const STATS_KEY = 'report_writing_stats_v1'
const RECORDS_KEY = 'report_writing_records_v1'
const SEED_FLAG_KEY = 'report_writing_records_seeded_v1'
/** 演示数据版本号：改了 mockPracticeRecords.js 就把它 +1，老浏览器下次进入会自动换成新版 */
const MOCK_SEED_VERSION = 'demo-4'

/** 学员可写三段合计上限（500 + 3000 + 3000） */
const TOTAL_LIMIT = 6500

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
  // 学员写三段：临床目的与检查方法 / 影像所见 / 诊断意见（第一段患者临床信息由系统给出）
  return { purpose: '', findings: '', impression: '' }
}

export function readPracticeStats() {
  return readJson(STATS_KEY, {})
}

/**
 * 逐回合训练记录（训练记录页与成绩报告弹窗的数据源）。
 * 每条 = 一次「提交报告」，含报告快照与评分结果；评分未回来时 `status: 'pending'`。
 * @returns {Array<{id,caseId,title,bodyPart,modality,level,round,submittedAt,status,score,scoreableMax} & object>}
 */
/**
 * 读训练记录。
 * 空的时候**播种一条演示记录**（只播一次，清空后不再回填）——
 * 本期无服务端、记录只在 localStorage，换台机器记录页就是空的，没法演示「成绩报告」。
 * 演示记录带 `mock: true`，列表里会标「演示数据」。
 */
export function readPracticeRecords() {
  const list = readJson(RECORDS_KEY, [])
  const arr = Array.isArray(list) ? list : []
  const seen = readJson(SEED_FLAG_KEY, '')

  // ① 有**真实**记录：以学员自己的为准，演示数据不插手
  if (arr.some(r => !r.mock)) return arr

  // ② 只有演示记录（或没有）：版本一致就照旧，版本变了就整体换成新版演示数据
  //    —— 之前用布尔标记"只播种一次"，导致演示数据更新后老浏览器永远看不到新版
  if (seen === MOCK_SEED_VERSION) return arr   // 版本已是最新：列表空着就空着（尊重「清空」）
  writeJson(SEED_FLAG_KEY, MOCK_SEED_VERSION)
  writeJson(RECORDS_KEY, MOCK_PRACTICE_RECORDS)
  return MOCK_PRACTICE_RECORDS.slice()
}

/** 手动把演示记录再装回来（空态里的「载入演示记录」按钮用） */
export function loadMockRecords() {
  writeJson(RECORDS_KEY, MOCK_PRACTICE_RECORDS)
  return MOCK_PRACTICE_RECORDS.slice()
}

export function readPracticeRecord(id) {
  return readPracticeRecords().find(r => r.id === id) || null
}

function upsertPracticeRecord(patch) {
  const list = readPracticeRecords()
  const i = list.findIndex(r => r.id === patch.id)
  if (i >= 0) list[i] = { ...list[i], ...patch }
  else list.unshift(patch)
  writeJson(RECORDS_KEY, list)
  return patch
}

export function clearPracticeRecords() {
  writeJson(RECORDS_KEY, [])
}

/**
 * **练习考**（考核侧 A 路）交卷后落一条练习记录。
 *
 * 为什么要有它：练习考原先只把成绩写进考试会话（`__practice__`），出分即散 ——
 * 「练习记录」列表里看不到，考完就找不回来了。这里写的是**与训练工作台同一份记录**
 * （同一个 localStorage key），所以练习考的成绩报告以后还能回看；`source: 'exam'` 用于
 * 列表里区分「练习考」与「训练」，列表对这类记录**不给报告对照**（红线 R1）。
 *
 * 正式考核**不进**这里：它的成绩在考核服务与「成绩管理」里。
 */
export function addExamPracticeRecord({ sample, draft, result, error = '' }) {
  const s = sample || {}
  const caseId = s.id || ''
  if (!caseId) return null

  // 轮次沿用该病例已有记录数（练习考也算一轮练习）
  const prevRounds = readPracticeRecords().filter(r => r.caseId === caseId).length
  const stats = readPracticeStats()
  stats[caseId] = { completedRounds: prevRounds + 1, lastPracticedAt: nowStamp() }
  writeJson(STATS_KEY, stats)

  return upsertPracticeRecord({
    id: `${caseId}-exam-${Date.now()}`,
    caseId,
    title: s.title || caseId,
    bodyPart: s.bodyPart || '',
    modality: s.modality || '',
    level: s.level || '',
    round: prevRounds + 1,
    submittedAt: nowStamp(),
    status: result ? 'done' : 'failed',
    score: result ? result.rawTotal : null,
    scoreableMax: result ? result.scoreableMax : null,
    result: result || null,
    error: result ? '' : error,
    draft: { ...(draft || {}) },
    source: 'exam'
  })
}

/**
 * 同一病例的会话**全局只建一份**。
 * 工作台与成绩报告是两个路由、两个组件实例；若各自 `useReportSession`，
 * 提交时在工作台实例上发起的评分结果永远传不到成绩页（成绩页停在"尚未评分"）。
 * 这里按 caseId 缓存实例，两页共享同一份响应式状态；样本对象用 ref 持有，
 * 后进入的页面可用更完整的样本对象覆盖它。
 */
const SESSIONS = new Map()

/**
 * 一个样本的一次训练会话。
 * @param {string} caseId
 * @param {object} sample 题库样本（含影像序列、脱敏信息、能力位、可评分、金标准）
 */
export function useReportSession(caseId, sample) {
  const cached = SESSIONS.get(caseId)
  if (cached) {
    if (sample) cached.sampleRef.value = sample
    return cached.api
  }
  const sampleRef = ref(sample)
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

  const segments = computed(() => WRITABLE_SEGMENTS.map(s => ({
    ...s,
    value: state.draft[s.key] || '',
    filled: String(state.draft[s.key] || '').trim().length > 0
  })))

  const totalChars = computed(() => WRITABLE_SEGMENTS.reduce((a, s) => a + String(state.draft[s.key] || '').length, 0))
  const totalOver = computed(() => totalChars.value > TOTAL_LIMIT)

  /** 提交前提：四段都非空 */
  const missingSegments = computed(() => segments.value.filter(s => !s.filled).map(s => s.name))
  const canSubmit = computed(() => missingSegments.value.length === 0)
  const submitBlockReason = computed(() =>
    canSubmit.value ? '' : `${missingSegments.value.join('、')}还没写`)

  function setActiveSegment(key) {
    if (WRITABLE_SEGMENTS.some(s => s.key === key)) state.activeSegment = key
  }

  /** 问 AI伴学一句（对话式；模型只引导，不给答案；出站过红线） */
  async function askCompanion(question) {
    const q = String(question || '').trim()
    if (!q || state.chatLoading) return { ok: false }
    state.chat.push({ role: 'user', text: q })
    state.chatLoading = true
    try {
      const res = await companion.ask({
        sample: sampleRef.value,
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

  /** 提交报告 → 进入评分与对照，并**立即发起评分**；同时落一条训练记录 */
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

    const s = sampleRef.value || {}
    const rec = upsertPracticeRecord({
      id: `${caseId}-${Date.now()}`,
      caseId,
      title: s.title || caseId,
      bodyPart: s.bodyPart || '',
      modality: s.modality || '',
      level: s.level || '',
      round: state.roundIndex,
      submittedAt: nowStamp(),
      status: 'pending',
      score: null,
      scoreableMax: null,
      result: null,
      draft: { ...state.draft }
    })

    // 不 await：UI 先展示"AI 评阅中"；评分回来后把结果补进这条记录
    runScoring().then(() => {
      const r = state.scoringResult
      upsertPracticeRecord({
        id: rec.id,
        status: r ? 'done' : 'failed',
        score: r ? r.rawTotal : null,
        scoreableMax: r ? r.scoreableMax : null,
        result: r,
        error: r ? '' : state.scoringError
      })
    })
    return { ok: true, recordId: rec.id }
  }

  /** 运行（或重跑）评分。失败不阻塞学员：对照参考始终可用，只是没有分数 */
  async function runScoring() {
    if (state.scoringStatus === 'running') return { ok: false, reason: '评分正在进行中' }
    state.scoringStatus = 'running'
    state.scoringError = ''
    state.scoringAttempts += 1
    const res = await scorer.score({ sample: sampleRef.value, reportText: { ...state.draft } })
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

  const api = {
    state, inReview, phases: PHASES,
    segments, totalChars, totalOver, TOTAL_LIMIT,
    canSubmit, missingSegments, submitBlockReason,
    askCompanion, setActiveSegment,
    toReview, backToWrite, restartRound,
    scoring, scoringRunning: computed(() => state.scoringStatus === 'running'),
    runScoring, fileAppeal
  }
  SESSIONS.set(caseId, { api, sampleRef })
  return api
}

function nowStamp() {
  const d = new Date()
  const p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}
