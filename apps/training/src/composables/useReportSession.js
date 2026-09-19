// 影像报告书写训练 —— 会话状态（书写 → 自评对照 / 三段草稿 / 三级提示配额 / 回合）
//
// 契约依据：PRD §5.4.1（字段规则）、§5.2.3（提示配额）、§5.2.4–5.2.5（自评与回合）、§5.10（持久化）。
// 本期无服务端，草稿落 localStorage；接服务端时把 read/write 换成接口即可。
//
// ⚠️ **阶段模型已按 2026-09-19 批注调整**：原 PRD §5.2 的"五阶段 T0 阅片 → T1 检查技术 →
// T2 影像所见 → T3 诊断意见 → T4 对照自评"改为 **两态**——「书写报告」与「对照自评」。
// 批注原话：「我觉得 0 到 3 没必要分 4 个阶段，直接写就行。」三段报告同时可写，不再逐段推进；
// 阅片笔记从"T0 阶段"降为影像区下方的**可选草稿区**。自评对照仍保留为收口动作（不可跳过）。
// 相应地 §5.4.1 规则 2「空段不可推进阶段」落为「**提交时必须三段非空**」。
//
// 不变的三条铁律：
//   · 提示配额按「**段 × 回合**」发放：L1 不限 / L2 每段 3 次 / L3 每段 1 次；重写不重置，新回合才重置
//   · 自评**先在、对照后出**：自评未提交不渲染金标准对照（§5.2.4 / §5.8）
//   · 自评**不参与任何计算**，只作学情信号（§5.2.4）

import { computed, reactive, watch } from 'vue'
import { SEGMENTS, R1_ITEMS, DEFAULT_QUOTA, HINT_COOLDOWN_MS, hintFor } from '@ai-sp/shared/imaging'
import { evaluateCoverage } from '@/views/report-writing/coverage'

const SESSION_KEY = 'report_writing_session_v1'
const STATS_KEY = 'report_writing_stats_v1'

/** 条目分值索引（自评合计用） */
const R1_SCORE_OF = Object.fromEntries(R1_ITEMS.map(i => [i.code, i.score]))

/** 三段合集字数上限（PRD §5.4.1 单例合计 ≤ 5000 字） */
const TOTAL_LIMIT = 5000

/** 两态：书写报告 → 对照自评 */
export const PHASES = [
  { key: 'write', name: '书写报告' },
  { key: 'review', name: '对照自评' }
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
  return { technique: '', findings: '', impression: '' }
}

function emptyQuota() {
  const out = {}
  SEGMENTS.forEach(s => { out[s.key] = { l2: DEFAULT_QUOTA.l2, l3: DEFAULT_QUOTA.l3 } })
  return out
}

export function readPracticeStats() {
  return readJson(STATS_KEY, {})
}

/**
 * 一个样本的一次训练会话。
 * @param {string} caseId
 * @param {object} sample 题库样本（含序列、脱敏信息、能力位、可评分）
 */
export function useReportSession(caseId, sample) {
  const saved = readJson(SESSION_KEY, {})[caseId] || {}

  const state = reactive({
    phase: saved.phase === 'review' ? 'review' : 'write',
    roundIndex: saved.roundIndex || 1,
    viewNotes: saved.viewNotes || '',
    draft: { ...emptyDraft(), ...(saved.draft || {}) },
    hints: saved.hints || [],
    /** 每段各自的剩余配额 `{ technique: {l2,l3}, ... }` */
    quota: { ...emptyQuota(), ...(saved.quota || {}) },
    /** 每段各级别上次请求时刻：`'段:级别' → 毫秒`，用于 10 秒同级冷却 */
    cooling: saved.cooling || {},
    /** 当前要问提示的段（与"阶段"无关，由用户自己选） */
    activeSegment: saved.activeSegment || 'findings',
    /** 同回合内已提交过自评则不再重复提交（幂等契约 §5.2.4） */
    selfSubmitted: !!saved.selfSubmitted,
    marks: saved.marks || {}
  })

  // 兼容旧会话（老版本按阶段存 quota/l2Remaining），缺失的段补齐
  SEGMENTS.forEach(s => {
    if (!state.quota[s.key] || typeof state.quota[s.key].l2 !== 'number') {
      state.quota[s.key] = { l2: DEFAULT_QUOTA.l2, l3: DEFAULT_QUOTA.l3 }
    }
  })

  function persist() {
    const all = readJson(SESSION_KEY, {})
    all[caseId] = {
      phase: state.phase,
      roundIndex: state.roundIndex,
      viewNotes: state.viewNotes,
      draft: { ...state.draft },
      hints: state.hints,
      quota: JSON.parse(JSON.stringify(state.quota)),
      cooling: { ...state.cooling },
      activeSegment: state.activeSegment,
      selfSubmitted: state.selfSubmitted,
      marks: { ...state.marks }
    }
    writeJson(SESSION_KEY, all)
  }

  watch(state, persist, { deep: true })

  const inReview = computed(() => state.phase === 'review')

  /** 三段（含字数上限与是否已填） */
  const segments = computed(() => SEGMENTS.map(s => ({
    ...s,
    value: state.draft[s.key] || '',
    filled: String(state.draft[s.key] || '').trim().length > 0
  })))

  const totalChars = computed(() => SEGMENTS.reduce((a, s) => a + String(state.draft[s.key] || '').length, 0))
  const totalOver = computed(() => totalChars.value > TOTAL_LIMIT)

  /** 提交前提：三段都非空（原"空段不可推进阶段"落为此处） */
  const missingSegments = computed(() => segments.value.filter(s => !s.filled).map(s => s.name))
  const canSubmit = computed(() => missingSegments.value.length === 0)
  const submitBlockReason = computed(() =>
    canSubmit.value ? '' : `${missingSegments.value.join('、')}段还没写，三段都写完才能提交报告`)

  /** 要素覆盖清单（仅训练侧下发；考核侧不下发，§5.8） */
  const coverage = computed(() => evaluateCoverage(state.draft.findings, sample))

  const usedHintCount = computed(() => state.hints.length)

  /** 同级冷却剩余秒数（按段 + 级别；以受理时刻起算） */
  function coolingLeft(level) {
    if (level === 'L1') return 0
    const at = state.cooling[`${state.activeSegment}:${level}`] || 0
    const left = at + HINT_COOLDOWN_MS - Date.now()
    return left > 0 ? Math.ceil(left / 1000) : 0
  }

  /** 当前段的配额余量 */
  function quotaLeft(level) {
    if (level === 'L1') return Infinity
    const q = state.quota[state.activeSegment] || { l2: 0, l3: 0 }
    return level === 'L2' ? q.l2 : q.l3
  }

  function setActiveSegment(key) {
    if (SEGMENTS.some(s => s.key === key)) state.activeSegment = key
  }

  /**
   * 请求一条提示。照 PRD §5.7.2 的「受理即原子预扣」：先校验配额与冷却 → 扣减 → 写冷却，
   * 全部在同一同步块内完成，不留"先校验后扣减"的空窗。本期无模型调用，故不涉及回滚。
   * @returns {{ok: boolean, reason?: string, hint?: object}}
   */
  function requestHint(level) {
    const seg = state.activeSegment
    if (!SEGMENTS.some(s => s.key === seg)) return { ok: false, reason: '请先选择要问提示的段落' }
    if (level !== 'L1') {
      const left = coolingLeft(level)
      if (left > 0) return { ok: false, reason: `同级提示冷却中，请 ${left} 秒后再试` }
      const q = state.quota[seg]
      const field = level === 'L2' ? 'l2' : 'l3'
      if (q[field] <= 0) {
        return { ok: false, reason: level === 'L2'
          ? '本段指向提示已用完，先自己写写看'
          : '本段要点提示已用完，先自己写写看' }
      }
      q[field] -= 1
      state.cooling[`${seg}:${level}`] = Date.now()
    }
    // 影像所见段用"第一个缺失要素"作指向对象；其余段取该段要素表首项
    const pending = seg === 'findings'
      ? (coverage.value.find(c => c.mark === 'miss') || coverage.value[0])
      : null
    const h = hintFor(seg, level, pending && pending.key)
    const item = {
      ...h,
      time: new Date().toTimeString().slice(0, 8),
      quotaLeft: { l2: state.quota[seg].l2, l3: state.quota[seg].l3 }
    }
    state.hints.push(item)
    return { ok: true, hint: item }
  }

  /** 提交报告 → 进入自评对照（收口动作，不可跳过） */
  function toReview() {
    if (!canSubmit.value) return { ok: false, reason: submitBlockReason.value }
    state.phase = 'review'
    return { ok: true }
  }

  /** 重写：回到书写态继续改 —— **不新建回合**、配额不重置、文本保留（§5.2.5） */
  function backToWrite() {
    state.phase = 'write'
    state.selfSubmitted = false
    state.marks = {}
  }

  /** 重练：新回合 —— roundIndex+1，清空文本、提示配额重置，上一轮记录保留可回看（§5.2.5） */
  function restartRound() {
    state.roundIndex += 1
    state.phase = 'write'
    state.draft = emptyDraft()
    state.viewNotes = ''
    state.hints = []
    state.quota = emptyQuota()
    state.cooling = {}
    state.selfSubmitted = false
    state.marks = {}
  }

  /**
   * 提交自评。幂等：同一回合重复提交直接返回既有结果、**不重复计数**（§5.2.4 幂等契约）。
   */
  function submitSelfReview() {
    if (state.selfSubmitted) return { alreadySubmitted: true }
    state.selfSubmitted = true
    const stats = readPracticeStats()
    const prev = stats[caseId] || { completedRounds: 0, lastSelfReviewScore: null, lastPracticedAt: null }
    const selfTotal = selfReviewTotal()
    stats[caseId] = {
      completedRounds: (prev.completedRounds || 0) + 1,
      lastSelfReviewScore: selfTotal.normalized,
      lastPracticedAt: nowStamp()
    }
    writeJson(STATS_KEY, stats)
    return { alreadySubmitted: false, stats: stats[caseId] }
  }

  /** 自评合计：按"写了"的条目分值合计，不可评条目整体不纳入；分母 = 该样本可评分（§5.2.4） */
  function selfReviewTotal() {
    const pool = (sample && sample.scoreableMax) || 100
    const lost = new Set(((sample && sample.lost) || []).map(l => l.code))
    let raw = 0
    Object.entries(state.marks).forEach(([code, mark]) => {
      if (mark !== 'wrote' || lost.has(code)) return
      raw += R1_SCORE_OF[code] || 0
    })
    return { raw, pool, normalized: pool ? Math.round((raw / pool) * 100) : 0 }
  }

  const selfSubmitted = computed(() => state.selfSubmitted)

  /** 完成一例 = 提交自评（§5.2.5 训练终态） */
  const roundComplete = computed(() => state.selfSubmitted)

  return {
    state, inReview, phases: PHASES,
    segments, coverage, totalChars, totalOver, TOTAL_LIMIT,
    canSubmit, missingSegments, submitBlockReason,
    usedHintCount, quotaLeft, coolingLeft, requestHint, setActiveSegment,
    toReview, backToWrite, restartRound,
    submitSelfReview, selfSubmitted, selfReviewTotal, roundComplete
  }
}

function nowStamp() {
  const d = new Date()
  const p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}
