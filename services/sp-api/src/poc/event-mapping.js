// ═══════════════════════════════════════════════════════════════
// 事件 → 认知状态映射规则引擎 V3
// 100% 确定性 · 零 LLM · 零方差
//
// V3 变更: 移除 PERSONALITY_MODIFIERS（性格影响迁移至反思脑LLM提示词层）
// V2 保留: 连续回避递增、冲突比例修复、坏消息后振幅收窄
// ═══════════════════════════════════════════════════════════════

/**
 * 单事件 → 状态 delta 规则表
 * 每个事件的 delta: { concern, trust, stuck }
 * 未列出的维度保持 0（该事件不影响该维度）
 */
const EVENT_DELTA = {
  concern_addressed:  { concern: -2, trust: 0, stuck: 0 },
  concern_ignored:    { concern: +1, trust: 0, stuck: +1 },
  question_answered:  { concern: 0,  trust: 0, stuck: 'reset' },
  question_avoided:   { concern: 0,  trust: 0, stuck: +1 },
  empathy_shown:      { concern: 0,  trust: +1, stuck: 0 },
  dismissive:         { concern: 0,  trust: -1, stuck: +1 },
  bad_news:           { concern: +2, trust: 0, stuck: 0 },
  good_news:          { concern: -3, trust: 0, stuck: 0 },
  conflict:               { concern: 0,  trust: -2, stuck: +2 },
  apology:                { concern: 0,  trust: +2, stuck: 'reset' },
  new_concern_expressed:  { concern: +1, trust: 0,  stuck: 0 },
  no_event:               { concern: 0,  trust: 0,  stuck: 0 },
}

/**
 * 单轮最大变化幅度上限
 */
const AMPLITUDE_CAP = {
  concern: 3,
  trust: 2,
  stuck: 2
}

/**
 * Stuck count 处理辅助
 * 'reset' → 归零
 * 数值 → accumulated，有上限防止溢出
 */
function applyStuckDelta(currentStuck, delta) {
  if (delta === 'reset') return 0
  const raw = currentStuck + delta
  return Math.max(0, Math.min(5, raw))
}

/**
 * 应用一轮事件 → 计算该轮的 delta
 * @param {string[]} events — 单轮事件列表
 * @returns {{ concern: number, trust: number, stuck: number|string }}
 */
function computeRoundDelta(events) {
  const delta = { concern: 0, trust: 0, stuck: 0 }

  for (const event of events) {
    const d = EVENT_DELTA[event]
    if (!d) continue
    delta.concern += d.concern
    delta.trust += d.trust
    if (d.stuck === 'reset') {
      delta.stuck = 'reset'
    } else if (delta.stuck !== 'reset') {
      delta.stuck += d.stuck
    }
  }

  // 幅度上限钳位
  delta.concern = Math.max(-AMPLITUDE_CAP.concern, Math.min(AMPLITUDE_CAP.concern, delta.concern))
  delta.trust = Math.max(-AMPLITUDE_CAP.trust, Math.min(AMPLITUDE_CAP.trust, delta.trust))
  if (typeof delta.stuck === 'number') {
    delta.stuck = Math.min(AMPLITUDE_CAP.stuck, delta.stuck)
  }

  return delta
}

/**
 * concern.primary 迁移判断
 * 当前担忧 intensity 降为 0 时，自动从 unresolved_goals 选下一个
 * @param {object} cm — 当前 Cognitive Model
 * @param {string[]} accumulatedEvents — 本轮所有事件
 * @returns {string|null} — 新的 primary 标签，null 表示不换
 */
function checkConcernMigration(cm, accumulatedEvents) {
  if (cm.concern.intensity > 0) return null

  // 担忧已解决，看是否还有 unresolved_goals
  if (cm.unresolved_goals && cm.unresolved_goals.length > 0) {
    return cm.unresolved_goals[0]  // 下一个最关心的
  }

  // 无剩余疑问，担忧自然衰减但保留已有标签
  return null
}

/**
 * 初始化 CM（含 V2 跨轮追踪字段）
 */
export function initCM(overrides = {}) {
  return {
    concern: {
      primary: overrides.concern?.primary || '',
      intensity: overrides.concern?.intensity ?? 5,
    },
    trust: overrides.trust ?? 5,
    trust_peak: overrides.trust_peak ?? overrides.trust ?? 5,
    unresolved_goals: [...(overrides.unresolved_goals || [])],
    stuck_count: overrides.stuck_count ?? 0,
    // V2 跨轮追踪（增量模式持久化）
    consecutive_avoidance: overrides.consecutive_avoidance ?? 0,
    // V3 自然衰减追踪
    consecutive_neutral: overrides.consecutive_neutral ?? 0,
    consecutive_no_new_concern: overrides.consecutive_no_new_concern ?? 0,
    conflict_trust_loss: overrides.conflict_trust_loss ?? 0,
    bad_news_triggered: overrides.bad_news_triggered ?? false,
  }
}

/**
 * 应用单轮事件 → 增量更新 CM（生产模式）
 *
 * 与 applyEvents 的区别:
 *   - 只处理单轮事件
 *   - 跨轮追踪变量从 CM 读取并写回 CM
 *   - 历史事件锁定，不可重分类
 *
 * @param {object} cm — 当前 CM（会被原地修改）
 * @param {string[]} events — 本轮事件列表
 * @param {string} _personality — 已废弃，保留签名兼容（性格改由反思脑LLM提示词驱动）
 * @returns {{ delta, cm_after, concern_migrated }}
 */
export function applyEventRound(cm, events, _personality) {
  const roundDelta = computeRoundDelta(events)

  // 从 CM 读取 V2 追踪变量
  let { consecutive_avoidance, conflict_trust_loss, bad_news_triggered } = cm

  // 检测 bad_news 触发
  if (events.includes('bad_news')) {
    bad_news_triggered = true
  }

  // ── V2 规则3: bad_news 后下行振幅收窄 ──
  if (bad_news_triggered) {
    if (events.includes('good_news')) {
      roundDelta.concern += 2
    }
    if (roundDelta.concern < -2) {
      roundDelta.concern = -2
    }
  }

  // ── V2 规则1: 连续回避递增惩罚 ──
  const avoidanceEvents = ['concern_ignored', 'question_avoided']
  const hasAvoidance = events.some(e => avoidanceEvents.includes(e))

  if (hasAvoidance) {
    consecutive_avoidance++
    const multiplier = consecutive_avoidance >= 3 ? 2.0
      : consecutive_avoidance >= 2 ? 1.5
      : 1.0

    if (multiplier > 1.0) {
      roundDelta.concern = Math.round(roundDelta.concern * multiplier)
      if (typeof roundDelta.stuck === 'number') {
        roundDelta.stuck = Math.min(AMPLITUDE_CAP.stuck, Math.round(roundDelta.stuck * multiplier))
      }
    }
  } else {
    consecutive_avoidance = 0
  }

  // ── V2 规则2: 冲突损伤追踪 + 比例修复 ──
  const negativeTrustEvents = ['dismissive', 'conflict']

  if (events.some(e => negativeTrustEvents.includes(e))) {
    if (roundDelta.trust < 0) {
      conflict_trust_loss += Math.abs(roundDelta.trust)
    }
  } else if (events.includes('apology')) {
    const recovery = Math.min(3, Math.max(1, Math.ceil(conflict_trust_loss * 0.6)))
    roundDelta.trust = recovery
    conflict_trust_loss = 0
    consecutive_avoidance = 0
  } else if (events.includes('empathy_shown')) {
    conflict_trust_loss = Math.max(0, conflict_trust_loss - 0.5)
  } else if (!hasAvoidance) {
    conflict_trust_loss = Math.max(0, conflict_trust_loss - 0.5)
  }

  // 应用 delta
  cm.concern.intensity = Math.max(0, Math.min(10, cm.concern.intensity + roundDelta.concern))

  if (bad_news_triggered && cm.concern.intensity < 5) {
    cm.concern.intensity = 5
  }

  cm.trust = Math.max(0, Math.min(10, cm.trust + roundDelta.trust))
  cm.trust_peak = Math.max(cm.trust_peak ?? 5, cm.trust)
  cm.stuck_count = applyStuckDelta(cm.stuck_count, roundDelta.stuck)

  // 写回 CM
  cm.consecutive_avoidance = consecutive_avoidance
  cm.conflict_trust_loss = conflict_trust_loss
  cm.bad_news_triggered = bad_news_triggered

  // ── V3 规则: stuck 自然衰减 ──
  // 连续无冲突轮次后 stuck 缓慢下降，防止病史采集中 stuck 单向递增
  const stuckIncreasingEvents = ['concern_ignored', 'question_avoided', 'dismissive', 'conflict']
  const hasStuckIncrease = events.some(e => stuckIncreasingEvents.includes(e))

  if (!hasStuckIncrease) {
    cm.consecutive_neutral = (cm.consecutive_neutral || 0) + 1
    if (cm.consecutive_neutral >= 4) {
      cm.stuck_count = Math.max(0, cm.stuck_count - 1)
    }
  } else {
    cm.consecutive_neutral = 0
  }

  // ── V3 规则: concern 自然衰减 ──
  // 连续无新担忧/忽视担忧的轮次后 concern 缓慢回落，不低于基线 3
  const concernIncreasingEvents = ['concern_ignored', 'bad_news', 'new_concern_expressed']
  const hasConcernIncrease = events.some(e => concernIncreasingEvents.includes(e))

  if (!hasConcernIncrease && roundDelta.concern >= 0) {
    cm.consecutive_no_new_concern = (cm.consecutive_no_new_concern || 0) + 1
    if (cm.consecutive_no_new_concern >= 4) {
      cm.concern.intensity = Math.max(3, cm.concern.intensity - 1)
    }
  } else {
    cm.consecutive_no_new_concern = 0
  }

  // concern 迁移
  let concernMigrated = false
  if (cm.concern.intensity === 0) {
    const newPrimary = checkConcernMigration(cm, events)
    if (newPrimary) {
      cm.concern.primary = newPrimary
      cm.concern.intensity = 5
      concernMigrated = true
    }
  }

  // question_answered: 移除最早未解答疑问
  if (events.includes('question_answered') && cm.unresolved_goals.length > 0) {
    cm.unresolved_goals.shift()
  }

  // new_concern_expressed: 追加到未解答疑问
  if (events.includes('new_concern_expressed')) {
    cm.unresolved_goals.push('(新担忧)')
  }

  return {
    delta: { ...roundDelta },
    cm_after: {
      concern: { primary: cm.concern.primary, intensity: cm.concern.intensity },
      trust: cm.trust,
      stuck_count: cm.stuck_count,
      unresolved_goals_count: cm.unresolved_goals.length,
    },
    concern_migrated: concernMigrated,
  }
}

/**
 * 主函数: 应用多轮事件序列 → 计算状态变化轨迹（批量/回放模式）
 *
 * @param {object} currentCM — 当前 Cognitive Model
 * @param {Array} roundEvents — 每轮提取的事件
 *   [{ round: number, events: string[] }]
 * @param {object} options
 *   { personality?: string, maxRounds?: number }
 * @returns {object}
 *   { finalCM, deltas, concern_migrated }
 */
export function applyEvents(currentCM, roundEvents, options = {}) {
  const personality = options.personality || 'default'
  const maxRounds = options.maxRounds || 10

  // 批量模式从 CM 初始状态起步，但跨轮变量在循环内重新追踪
  const cm = initCM(currentCM)

  // 重置跨轮变量用于全量计算
  cm.consecutive_avoidance = 0
  cm.conflict_trust_loss = 0
  cm.bad_news_triggered = false
  cm.consecutive_neutral = 0
  cm.consecutive_no_new_concern = 0

  const deltas = []
  let concernMigrated = false

  const rounds = roundEvents.slice(0, maxRounds)

  for (const round of rounds) {
    const result = applyEventRound(cm, round.events, personality)
    concernMigrated = concernMigrated || result.concern_migrated

    deltas.push({
      round: round.round,
      events: [...round.events],
      delta: result.delta,
      cm_after: result.cm_after,
    })
  }

  return {
    finalCM: {
      concern: { ...cm.concern },
      trust: cm.trust,
      unresolved_goals: [...cm.unresolved_goals],
      stuck_count: cm.stuck_count,
      consecutive_avoidance: cm.consecutive_avoidance,
      conflict_trust_loss: cm.conflict_trust_loss,
      bad_news_triggered: cm.bad_news_triggered,
      consecutive_neutral: cm.consecutive_neutral,
      consecutive_no_new_concern: cm.consecutive_no_new_concern,
    },
    deltas,
    concern_migrated: concernMigrated,
  }
}

/**
 * 确定性验证: 相同输入 → 相同输出
 * @param {object} cm
 * @param {Array} roundEvents
 * @param {number} iterations — 验证次数
 * @returns {{ consistent: boolean, results: object[] }}
 */
export function verifyDeterminism(cm, roundEvents, iterations = 100) {
  const results = []
  for (let i = 0; i < iterations; i++) {
    const result = applyEvents(cm, roundEvents)
    results.push(result)
  }
  const first = JSON.stringify(results[0].finalCM)
  const consistent = results.every(r => JSON.stringify(r.finalCM) === first)

  if (!consistent) {
    // 找到第一个不一致的
    const badIdx = results.findIndex(r => JSON.stringify(r.finalCM) !== first)
    return {
      consistent: false,
      firstResult: results[0].finalCM,
      divergentResult: results[badIdx].finalCM,
      divergentIndex: badIdx,
    }
  }

  return { consistent: true, finalState: results[0].finalCM, iterations }
}

export { EVENT_DELTA, AMPLITUDE_CAP }
