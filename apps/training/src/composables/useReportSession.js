// 影像报告书写训练 —— 会话状态机（阶段 T0–T4 / 三段草稿 / 三级提示配额 / 回合）
//
// 契约依据：PRD §5.2（流程）、§5.2.3（提示配额）、§5.2.4–5.2.5（自评与回合）、§5.4.1（字段规则）、
// §5.10（草稿与持久化）。本期无服务端，草稿落 localStorage；接服务端时把 read/write 换成接口即可。
//
// 铁律（照 PRD 实现，别"优化"掉）：
//   · 训练侧 **空段不可推进阶段**（§5.4.1 规则 2）；考核侧才允许空段按 0 分计
//   · 提示配额按「**段 × 回合**」发放：L1 不限 / L2 每段 3 次 / L3 每段 1 次；**重写不重置**，新回合才重置
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

export const STAGES = [
  { key: 'T0', name: 'T0 阅片', segment: null, hintTip: 'T0 是阅片笔记阶段，不写报告，故不提供提示' },
  { key: 'T1', name: 'T1 检查技术', segment: 'technique' },
  { key: 'T2', name: 'T2 影像所见', segment: 'findings' },
  { key: 'T3', name: 'T3 诊断意见', segment: 'impression' },
  { key: 'T4', name: 'T4 对照自评', segment: null, hintTip: 'T4 已进入自评对照，提示通道关闭' }
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

export function readPracticeStats() {
  return readJson(STATS_KEY, {})
}

function emptyQuota() {
  return { l2Remaining: DEFAULT_QUOTA.l2, l3Remaining: DEFAULT_QUOTA.l3 }
}

/**
 * 一个样本的一次训练会话。
 * @param {string} caseId
 * @param {object} sample 题库样本（含三视图帧数、脱敏信息、能力位、能力位落空条目）
 */
export function useReportSession(caseId, sample) {
  const saved = readJson(SESSION_KEY, {})[caseId] || {}

  const state = reactive({
    stageIndex: typeof saved.stageIndex === 'number' ? saved.stageIndex : 0,
    roundIndex: saved.roundIndex || 1,
    viewNotes: saved.viewNotes || '',
    draft: { ...emptyDraft(), ...(saved.draft || {}) },
    hints: saved.hints || [],
    quota: { ...emptyQuota(), ...(saved.quota || {}) },
    /** 每段各自的上次请求时刻（毫秒），用于 10 秒同级冷却 */
    cooling: saved.cooling || {},
    /** 同回合内已提交过自评则不再重复提交（幂等契约 §5.2.4） */
    selfSubmitted: !!saved.selfSubmitted,
    marks: saved.marks || {}
  })

  function persist() {
    const all = readJson(SESSION_KEY, {})
    all[caseId] = {
      stageIndex: state.stageIndex,
      roundIndex: state.roundIndex,
      viewNotes: state.viewNotes,
      draft: { ...state.draft },
      hints: state.hints,
      quota: { ...state.quota },
      cooling: { ...state.cooling },
      selfSubmitted: state.selfSubmitted,
      marks: { ...state.marks }
    }
    writeJson(SESSION_KEY, all)
  }

  watch(state, persist, { deep: true })

  const stage = computed(() => STAGES[state.stageIndex])
  const segment = computed(() => stage.value.segment)

  /** 该段的字数上限与当前长度（PRD §5.4.1，前端 maxlength 硬限、不静默截断） */
  const segments = computed(() => SEGMENTS.map(s => ({
    ...s,
    value: state.draft[s.key] || '',
    filled: String(state.draft[s.key] || '').trim().length > 0
  })))

  const totalChars = computed(() => SEGMENTS.reduce((a, s) => a + String(state.draft[s.key] || '').length, 0))
  const totalOver = computed(() => totalChars.value > TOTAL_LIMIT)

  /** 训练侧：该段非空才可推进（T0 无段要求） */
  const canAdvance = computed(() => {
    const s = segment.value
    if (!s) return true
    return String(state.draft[s] || '').trim().length > 0
  })

  const blockReason = computed(() => {
    if (canAdvance.value) return ''
    const name = SEGMENTS.find(s => s.key === segment.value)?.name || ''
    return `${name}段不能为空，填写后才能进入下一阶段`
  })

  /** 要素覆盖清单（训练侧下发；考核侧不下发，§5.8） */
  const coverage = computed(() => evaluateCoverage(state.draft.findings, sample))

  const usedHintCount = computed(() => state.hints.length)

  /** 同级冷却剩余秒数（按段 + 级别；以受理时刻起算） */
  function coolingLeft(level) {
    const seg = segment.value
    if (!seg || level === 'L1') return 0
    const at = state.cooling[`${seg}:${level}`] || 0
    const left = at + HINT_COOLDOWN_MS - Date.now()
    return left > 0 ? Math.ceil(left / 1000) : 0
  }

  /** 配额是否还有余量（决定按钮是否置灰） */
  function quotaLeft(level) {
    if (level === 'L1') return Infinity
    if (level === 'L2') return state.quota.l2Remaining
    return state.quota.l3Remaining
  }

  /**
   * 请求一条提示。照 PRD §5.7.2 的「受理即原子预扣」：先校验配额与冷却 → 扣减 → 写冷却，
   * 全部在同一同步块内完成，不留"先校验后扣减"的空窗。本期无模型调用，故不涉及回滚。
   * @returns {{ok: boolean, reason?: string, hint?: object}}
   */
  function requestHint(level) {
    const seg = segment.value
    if (!seg) return { ok: false, reason: stage.value.hintTip }
    if (level !== 'L1') {
      const key = `${seg}:${level}`
      const left = coolingLeft(level)
      if (left > 0) return { ok: false, reason: `同级提示冷却中，请 ${left} 秒后再试` }
      if (state.quota[level === 'L2' ? 'l2Remaining' : 'l3Remaining'] <= 0) {
        return { ok: false, reason: level === 'L2'
          ? '本段指向提示已用完，先自己写写看'
          : '本段要点提示已用完，先自己写写看' }
      }
      if (level === 'L2') state.quota.l2Remaining -= 1
      else state.quota.l3Remaining -= 1
      state.cooling[key] = Date.now()
    }
    // 取该段第一个「缺失」要素作为指向对象；缺省取要素表首项
    const pending = coverage.value.find(c => c.mark === 'miss') || coverage.value[0]
    const h = hintFor(seg, level, pending && pending.key)
    const item = {
      ...h,
      stage: stage.value.key,
      time: new Date().toTimeString().slice(0, 8),
      quotaLeft: { l2Remaining: state.quota.l2Remaining, l3Remaining: state.quota.l3Remaining }
    }
    state.hints.push(item)
    return { ok: true, hint: item }
  }

  function goStage(i) {
    // 回退到已完成阶段随时可以；前进只能逐级，且当前段非空（训练侧铁律，§5.4.1 规则 2）
    if (i === state.stageIndex || i < 0 || i >= STAGES.length) return { ok: false }
    if (i > state.stageIndex) {
      if (i !== state.stageIndex + 1) return { ok: false, reason: '请按顺序推进阶段，不能跳阶段' }
      if (segment.value && !canAdvance.value) return { ok: false, reason: blockReason.value }
    }
    state.stageIndex = i
    return { ok: true }
  }

  function nextStage() {
    const r = goStage(state.stageIndex + 1)
    return r
  }
  const prevStage = () => goStage(state.stageIndex - 1)

  /** 重写：回到 T1，**不新建回合**、配额不重置、上一轮文本保留（§5.2.5） */
  function rewrite() {
    state.stageIndex = 1
    state.selfSubmitted = false
    state.marks = {}
  }

  /** 重练：新回合 —— roundIndex+1，提示配额重置，上一轮记录保留可回看（§5.2.5） */
  function restartRound() {
    state.roundIndex += 1
    state.stageIndex = 0
    state.draft = emptyDraft()
    state.viewNotes = ''
    state.hints = []
    state.quota = emptyQuota()
    state.cooling = {}
    state.selfSubmitted = false
    state.marks = {}
  }

  /**
   * 提交 T4 自评。幂等：同一回合重复提交直接返回既有结果、**不重复计数**（§5.2.4 幂等契约）。
   * @returns {{alreadySubmitted: boolean}}
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

  /** 完成一例 = 提交 T4 自评（§5.2.5 训练终态） */
  const roundComplete = computed(() => state.selfSubmitted)

  return {
    state, stage, stages: STAGES, segment, segments, coverage,
    totalChars, totalOver, TOTAL_LIMIT,
    canAdvance, blockReason,
    usedHintCount, quotaLeft, coolingLeft, requestHint,
    nextStage, prevStage, goStage, rewrite, restartRound,
    submitSelfReview, selfSubmitted, selfReviewTotal, roundComplete
  }
}

function nowStamp() {
  const d = new Date()
  const p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}
