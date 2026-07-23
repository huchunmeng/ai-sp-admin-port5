/**
 * 精神科B类SP独立情绪引擎
 *
 * 与标准 V8/V9 管线完全隔离：
 * - 不依赖 CM / damper / gear / derivedState / reflection brain
 * - 不依赖 packages/shared/src/emotion-engine.js
 * - 不依赖 packages/shared/src/emotion-state-machine.js
 *
 * 纯同步确定性规则引擎，零 LLM 调用
 */

// ── 状态枚举 ──────────────────────────────────────────────

export const MENTAL_STATES = ['flat', 'delusional', 'irritable', 'hallucinating', 'withdrawn', 'explosive', 'anxious']

export const MENTAL_VA_CANDIDATES = [
  'flat_affect',
  'delusional_gaze',
  'irritable_glare',
  'hallucinating_distracted',
  'withdrawn_still',
  'neutral',
]

export const MENTAL_VS_CANDIDATES = [
  'monotone',
  'slow_soft',
  'rushed_anxious',
  'irritable',
  'whispering',
  'normal',
]

// 非精神病性障碍：按疾病类型 + 幻觉/妄想参数综合判定
const NON_PSYCHOTIC_DISEASES = [
  '惊恐障碍', '广泛性焦虑障碍', '抑郁症', '双相障碍（抑郁）',
  '强迫障碍', '创伤后应激障碍', '阿尔茨海默病', '谵妄',
]

function isNonPsychotic(atypicalConfig) {
  const ac = atypicalConfig || {}
  const dt = ac.disease_type || ''
  // 按疾病类型直接判定
  if (NON_PSYCHOTIC_DISEASES.includes(dt)) return true
  // 精神病性障碍按参数判定
  const hp = ac.hallucination_profile || {}
  const hasHallucinations = hp.type && hp.type !== '无' && hp.frequency && hp.frequency !== '0'
  if (hasHallucinations) return false
  // 无幻觉 + 自知力非"缺失" → 倾向非精神病性
  const bp = ac.behavior_params || {}
  if (bp.insight_level && bp.insight_level !== '缺失') return true
  return false
}

// ── 心理状态初始化 ─────────────────────────────────────────

/**
 * @param {object} atypicalConfig - config.atypicalConfig (atypical_dialogue)
 * @returns {object} MentalState
 */
export function initMentalState(atypicalConfig) {
  const ac = atypicalConfig || {}
  const bp = ac.behavior_params || {}
  const nonPsychotic = isNonPsychotic(ac)

  return {
    delusionalActivation: nonPsychotic ? 1.0 : 5.0,
    irritabilityLevel: (bp.irritability || 0.3) * 3,
    hallucinationActive: false,
    consecutiveChallengeCount: 0,
    triggerHistory: [],
    currentState: nonPsychotic ? 'anxious' : 'flat',
    affectiveBluntFactor: bp.affective_blunting != null ? bp.affective_blunting : 0,
    insightLevel: bp.insight_level || '缺失',
    totalRounds: 0,
    nonPsychotic,
    diseaseType: ac.disease_type || '未指定',
  }
}

// ── 心理状态更新 ───────────────────────────────────────────

/**
 * @param {object} state - MentalState
 * @param {number} llmDelta - LLM 输出的 delusional_activation_delta
 * @param {object} triggerInfo - { triggerMatched, triggerWord, isChallenge }
 * @param {number} hallucinationInterference - 来自 behavior_params
 * @returns {object} 更新后的 MentalState (mutates input)
 */
export function updateMentalState(state, llmDelta, triggerInfo, hallucinationInterference) {
  const { triggerMatched, triggerWord, isChallenge } = triggerInfo || {}
  const hi = hallucinationInterference != null ? hallucinationInterference : 0

  state.totalRounds += 1

  // ── 1. 幻觉干扰概率判定 ──
  const hallucinationProbability = hi * Math.pow(1.05, state.totalRounds)
  state.hallucinationActive = hallucinationProbability > 0 ? Math.random() < Math.min(hallucinationProbability, 0.45) : false

  // ── 2. 妄想激活衰减（被动消退） ──
  if (!triggerMatched) {
    if (state.triggerHistory.length === 0 || state.totalRounds - (state.triggerHistory[state.triggerHistory.length - 1]?.round || 0) >= 3) {
      state.delusionalActivation -= 0.8
    } else {
      state.delusionalActivation -= 0.3
    }
  }
  state.delusionalActivation = Math.max(0, state.delusionalActivation)

  // ── 3. 易激惹衰减 ──
  const irritabilityFloor = (triggerInfo?._bpIrritability || 0.3) * 2
  state.irritabilityLevel = Math.max(irritabilityFloor, state.irritabilityLevel - 0.4)

  // ── 4. 挑战连续计数衰减 ──
  if (!isChallenge) {
    state.consecutiveChallengeCount = Math.max(0, state.consecutiveChallengeCount - 1)
  }

  // ── 5. 触发词命中处理 ──
  if (triggerMatched) {
    state.triggerHistory.push({ word: triggerWord || '', round: state.totalRounds })
    if (state.triggerHistory.length > 10) state.triggerHistory.shift()
    state.delusionalActivation += 1.5
  }

  // ── 6. 挑战处理 ──
  if (isChallenge) {
    state.consecutiveChallengeCount += 1
    state.irritabilityLevel += 1.5
  }

  // ── 7. 应用 LLM delta ──
  const delta = Number.isFinite(llmDelta) ? llmDelta : 0
  state.delusionalActivation = Math.max(0, Math.min(10, state.delusionalActivation + delta))
  state.irritabilityLevel = Math.max(0, Math.min(10, state.irritabilityLevel))
  state.delusionalActivation = Math.round(state.delusionalActivation * 10) / 10
  state.irritabilityLevel = Math.round(state.irritabilityLevel * 10) / 10

  // ── 8. 状态判定（优先级从高到低） ──
  if (state.irritabilityLevel >= 8) {
    state.currentState = 'explosive'
  } else if (state.nonPsychotic) {
    // 非精神病性障碍：无妄想/幻觉路径，基于焦虑+易激惹判定
    if (state.irritabilityLevel >= 5) {
      state.currentState = 'irritable'
    } else {
      state.currentState = 'anxious'
    }
  } else {
    // 精神病性障碍：保留原有路径
    if (state.hallucinationActive) {
      state.currentState = 'hallucinating'
    } else if (state.irritabilityLevel >= 4) {
      state.currentState = 'irritable'
    } else if (state.delusionalActivation >= 7 && state.consecutiveChallengeCount >= 2) {
      state.currentState = 'withdrawn'
    } else if (state.delusionalActivation >= 5) {
      state.currentState = 'delusional'
    } else {
      state.currentState = 'flat'
    }
  }

  return state
}

// ── 妄想触发匹配 ───────────────────────────────────────────

/**
 * @param {string} studentText
 * @param {string[]} triggers - delusional_system.triggers
 * @returns {{ matched: boolean, word: string|null, count: number }}
 */
export function matchDelusionalTriggers(studentText, triggers) {
  if (!triggers || !triggers.length) return { matched: false, word: null, count: 0 }
  const text = studentText || ''
  let count = 0
  let matchedWord = null
  for (const t of triggers) {
    if (!t) continue
    if (text.includes(t)) {
      count += 1
      if (!matchedWord) matchedWord = t
    }
  }
  return { matched: count > 0, word: matchedWord, count }
}

/**
 * 检测学生是否在质疑/反驳妄想信念
 * @param {string} studentText
 * @param {string} coreBelief - delusional_system.core_belief
 * @returns {boolean}
 */
export function classifyChallenge(studentText, coreBelief) {
  const text = studentText || ''
  const negationPatterns = [
    '不对', '不是真的', '没有', '不会的', '不可能', '不是这样',
    '你说的不对', '这不是真的', '你误会了', '你多想了', '别胡思乱想',
    '你想多了', '不要这样想', '这是假的', '不存在', '你弄错了',
    '那只是你的想象', '那只是幻觉', '你不应该这样想',
  ]
  const hasNegation = negationPatterns.some(p => text.includes(p))
  if (!hasNegation) return false

  // 否定 + 触及妄想核心关键词 = 挑战
  if (coreBelief) {
    const beliefWords = coreBelief.replace(/[，,。.]/g, ' ').split(/\s+/).filter(w => w.length >= 2)
    const beliefHit = beliefWords.some(w => text.includes(w))
    if (beliefHit) return true
  }

  // 纯否定表达（"不对""你说错了"等）也算轻度挑战
  const pureChallengePatterns = ['你说的不对', '这不是真的', '不可能', '你弄错了', '你撒谎', '别胡说了']
  return pureChallengePatterns.some(p => text.includes(p))
}

// ── 终止条件判定 ───────────────────────────────────────────

/**
 * @param {object} state - MentalState
 * @returns {{ terminated: boolean, type: string|null, message: string|null, reason: string|null }}
 */
export function checkTermination(state) {
  if (state.irritabilityLevel >= 9) {
    return {
      terminated: true,
      type: 'explosive_irritability',
      message: '患者因持续的追问刺激导致情绪失控，无法继续进行精神检查',
      reason: `易激惹程度达到${state.irritabilityLevel.toFixed(1)}/10`,
    }
  }
  if (state.delusionalActivation >= 8 && state.consecutiveChallengeCount >= 3) {
    return {
      terminated: true,
      type: 'catatonic_shutdown',
      message: '患者陷入紧张性缄默状态，对外界呼唤无反应',
      reason: `妄想激活度${state.delusionalActivation.toFixed(1)}/10 + 连续质疑${state.consecutiveChallengeCount}轮`,
    }
  }
  if (state.consecutiveChallengeCount >= 5) {
    return {
      terminated: true,
      type: 'delusional_challenge',
      message: '患者妄想系统受挑战过强，产生被害性转移，拒绝继续交流',
      reason: `连续质疑${state.consecutiveChallengeCount}轮`,
    }
  }
  return { terminated: false, type: null, message: null, reason: null }
}

// ── 序列化 / 反序列化 ─────────────────────────────────────

export function serializeMentalState(state) {
  if (!state) return null
  return {
    delusionalActivation: state.delusionalActivation,
    irritabilityLevel: state.irritabilityLevel,
    hallucinationActive: state.hallucinationActive,
    consecutiveChallengeCount: state.consecutiveChallengeCount,
    triggerHistory: state.triggerHistory.slice(-10),
    currentState: state.currentState,
    affectiveBluntFactor: state.affectiveBluntFactor,
    insightLevel: state.insightLevel,
    totalRounds: state.totalRounds,
    nonPsychotic: state.nonPsychotic,
    diseaseType: state.diseaseType,
  }
}

export function deserializeMentalState(saved) {
  if (!saved) return null
  return {
    delusionalActivation: saved.delusionalActivation ?? 5.0,
    irritabilityLevel: saved.irritabilityLevel ?? 0,
    hallucinationActive: saved.hallucinationActive ?? false,
    consecutiveChallengeCount: saved.consecutiveChallengeCount ?? 0,
    triggerHistory: saved.triggerHistory || [],
    currentState: saved.currentState || 'flat',
    affectiveBluntFactor: saved.affectiveBluntFactor ?? 0,
    insightLevel: saved.insightLevel || '缺失',
    totalRounds: saved.totalRounds ?? 0,
    nonPsychotic: saved.nonPsychotic ?? false,
    diseaseType: saved.diseaseType || '未指定',
  }
}

// ── 情绪向量映射 ───────────────────────────────────────────

const STATE_EMOTION_MAP = {
  flat: { dominant: 'flat', level: 3 },
  delusional: { dominant: 'fear', level: 6 },
  irritable: { dominant: 'anger', level: 5 },
  hallucinating: { dominant: 'fear', level: 7 },
  withdrawn: { dominant: 'sadness', level: 7 },
  explosive: { dominant: 'anger', level: 9 },
  anxious: { dominant: 'fear', level: 5 },
}

/**
 * @param {string} currentState
 * @returns {{ anger: number, fear: number, sadness: number, joy: number, state: string }}
 */
export function stateToEmotion(currentState) {
  const mapped = STATE_EMOTION_MAP[currentState] || STATE_EMOTION_MAP.anxious
  return {
    anger: mapped.dominant === 'anger' ? mapped.level : 0,
    fear: mapped.dominant === 'fear' ? mapped.level : (mapped.dominant === 'flat' ? 2 : 0),
    sadness: mapped.dominant === 'sadness' ? mapped.level : 0,
    joy: 0,
    state: currentState,
  }
}
