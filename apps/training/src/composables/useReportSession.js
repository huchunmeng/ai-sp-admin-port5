// 影像报告书写训练 —— 会话状态（书写报告 → 对照参考 / 三段草稿 / AI伴学配额 / 回合）
//
// 契约依据：PRD §5.4.1（字段规则）· §5.2.3（提示配额）· §5.2.5（回合）· §5.10（持久化）· §5.7（提示引擎）。
// 本期无服务端：草稿落 localStorage；提示由 `useReportCompanion` 调模型产出。
//
// ⚠️ **已按 2026-09-19 两轮评审批注调整**（与最初封版的 PRD 不一致，需回写）：
//   1. 阶段：五阶段 T0–T4 → **两态**「书写报告 → 对照参考」（批注"0 到 3 没必要分 4 个阶段，直接写就行"）
//   2. **取消逐条自评**（批注"我觉得自评没什么必要"）——提交报告即进入对照，不再有 23 条自评表、
//      不再有"自评未提交不给看对照"的门禁、不再有自评总分与偏差。「完成一例」= 提交报告。
//   3. **取消要素自检面板**（批注"去掉该模块"）——覆盖判读与其前端启发式实现一并删除
//   4. 提示改为 **AI伴学**：由大模型读金标准（题目答案）产出 L2/L3，L1 仍走静态体裁库
//
// 不变的两条铁律：
//   · 提示配额按「**段 × 回合**」发放：L1 不限 / L2 每段 3 次 / L3 每段 1 次；重写不重置，新回合才重置
//   · 配额「**受理即原子预扣**」：校验 → 扣减 → 写冷却在同一同步块内完成，不留"先校验后扣减"的空窗；
//     模型失败或红线不过 → **回滚配额与冷却**（系统过错不罚学员，PRD §5.7.2）

import { computed, reactive, watch } from 'vue'
import { SEGMENTS, DEFAULT_QUOTA, HINT_COOLDOWN_MS } from '@ai-sp/shared/imaging'
import { useReportCompanion } from './useReportCompanion'

const SESSION_KEY = 'report_writing_session_v1'
const STATS_KEY = 'report_writing_stats_v1'

/** 三段合集字数上限（PRD §5.4.1 单例合计 ≤ 5000 字） */
const TOTAL_LIMIT = 5000

/** 两态：书写报告 → 对照参考 */
export const PHASES = [
  { key: 'write', name: '书写报告' },
  { key: 'review', name: '对照参考' }
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
 * @param {object} sample 题库样本（含序列、脱敏信息、能力位、可评分、金标准）
 */
export function useReportSession(caseId, sample) {
  const saved = readJson(SESSION_KEY, {})[caseId] || {}
  const companion = useReportCompanion()

  const state = reactive({
    phase: saved.phase === 'review' ? 'review' : 'write',
    roundIndex: saved.roundIndex || 1,
    viewNotes: saved.viewNotes || '',
    draft: { ...emptyDraft(), ...(saved.draft || {}) },
    /** AI伴学给出的提示流水（每段各自记录） */
    hints: saved.hints || [],
    /** 每段各自的剩余配额 `{ technique: {l2,l3}, ... }` */
    quota: { ...emptyQuota(), ...(saved.quota || {}) },
    /** 每段各级别上次请求时刻：`'段:级别' → 毫秒`，用于 10 秒同级冷却 */
    cooling: saved.cooling || {},
    /** 当前要问提示的段（与"阶段"无关，由用户自己选） */
    activeSegment: saved.activeSegment || 'findings',
    /** 提示是否正在生成（按钮 loading 态） */
    hintLoading: false
  })

  // 兼容旧会话，缺失的段补齐
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
      activeSegment: state.activeSegment
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

  /** 提交前提：三段都非空 */
  const missingSegments = computed(() => segments.value.filter(s => !s.filled).map(s => s.name))
  const canSubmit = computed(() => missingSegments.value.length === 0)
  const submitBlockReason = computed(() =>
    canSubmit.value ? '' : `${missingSegments.value.join('、')}段还没写，三段都写完才能提交报告`)

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
   * 请求一条 AI伴学 提示（异步：要调模型）。
   * 受理即原子预扣 → 调模型 → 红线校验 → 失败则回滚配额与冷却。
   * @returns {Promise<{ok:boolean, reason?:string, degraded?:boolean}>}
   */
  async function requestHint(level) {
    if (state.hintLoading) return { ok: false, reason: '上一条提示还在生成中' }
    const seg = state.activeSegment
    if (!SEGMENTS.some(s => s.key === seg)) return { ok: false, reason: '请先选择要问提示的段落' }

    // ── 受理即原子预扣（同一同步块，不留空窗）──
    let deducted = null
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
      const coolKey = `${seg}:${level}`
      const prevCool = state.cooling[coolKey]
      state.cooling[coolKey] = Date.now()
      deducted = { field, coolKey, prevCool }
    }

    state.hintLoading = true
    let result
    try {
      result = await companion.fetchHint({
        caseTitle: sample && sample.title,
        sample,
        segment: seg,
        level,
        draftText: state.draft[seg]
      })
    } catch (e) {
      result = { ok: false, degraded: true, text: '', reason: e && e.message }
    } finally {
      state.hintLoading = false
    }

    if (!result.ok) {
      // ── 回滚配额与冷却：系统过错不罚学员 ──
      if (deducted) {
        state.quota[seg][deducted.field] += 1
        if (deducted.prevCool == null) delete state.cooling[deducted.coolKey]
        else state.cooling[deducted.coolKey] = deducted.prevCool
      }
      // 降级文案仍展示给学员（PRD §5.7「失败降级」），但不算已消耗配额
      if (result.text) {
        state.hints.push({
          level, segment: seg, degraded: true,
          text: result.text,
          time: new Date().toTimeString().slice(0, 8)
        })
      }
      return { ok: false, degraded: true, reason: result.reason || '提示生成失败（配额未消耗）' }
    }

    state.hints.push({
      level, segment: seg, degraded: false,
      text: result.text,
      time: new Date().toTimeString().slice(0, 8),
      redline: result.redline
    })
    return { ok: true }
  }

  /** 提交报告 → 进入对照参考 */
  function toReview() {
    if (!canSubmit.value) return { ok: false, reason: submitBlockReason.value }
    state.phase = 'review'
    const stats = readPracticeStats()
    const prev = stats[caseId] || { completedRounds: 0, lastPracticedAt: null }
    stats[caseId] = {
      completedRounds: (prev.completedRounds || 0) + 1,
      lastPracticedAt: nowStamp()
    }
    writeJson(STATS_KEY, stats)
    return { ok: true }
  }

  /** 重写：回到书写态继续改 —— **不新建回合**、配额不重置、文本保留（§5.2.5） */
  function backToWrite() {
    state.phase = 'write'
  }

  /** 重练：新回合 —— roundIndex+1，清空文本、配额重置，上一轮提示记录保留可回看（§5.2.5） */
  function restartRound() {
    state.roundIndex += 1
    state.phase = 'write'
    state.draft = emptyDraft()
    state.viewNotes = ''
    state.hints = []
    state.quota = emptyQuota()
    state.cooling = {}
  }

  return {
    state, inReview, phases: PHASES,
    segments, totalChars, totalOver, TOTAL_LIMIT,
    canSubmit, missingSegments, submitBlockReason,
    usedHintCount, quotaLeft, coolingLeft, requestHint, setActiveSegment,
    toReview, backToWrite, restartRound
  }
}

function nowStamp() {
  const d = new Date()
  const p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}
