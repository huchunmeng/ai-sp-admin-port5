// ═══════════════════════════════════════════════════════════════
// Derived State 规则计算引擎 V2
// attitude + disclosure + emotion_constraint
// 100% 确定性 · 零 LLM · 零方差
// 性格影响已移至提示词层（personality-prompts.js）
// ═══════════════════════════════════════════════════════════════

/**
 * 从 Cognitive Model 计算派生状态
 * @param {object} cm — { concern: { primary, intensity }, trust, stuck_count }
 * @param {string} _personality — 已废弃，保留签名兼容
 * @returns {{ attitude, disclosure, emotion_constraint }}
 */
export function computeDerivedState(cm, _personality) {
  const concern = cm.concern?.intensity ?? 5
  const trust = cm.trust ?? 5
  const stuck = cm.stuck_count ?? 0

  // ── Attitude ──
  let attitude
  if (trust <= 3 || stuck >= 3) {
    attitude = 'defensive'
  } else if (trust >= 7 && concern <= 4) {
    attitude = 'cooperative'
  } else {
    attitude = 'neutral'
  }

  // ── Disclosure ──
  let disclosure
  if (trust >= 7) {
    disclosure = 'high'
  } else if (trust >= 4) {
    disclosure = 'medium'
  } else {
    disclosure = 'low'
  }
  if (attitude === 'defensive' && disclosure === 'high') {
    disclosure = 'medium'
  }

  // ── Emotion Constraint (5 rules, priority order) ──
  let intensity, dominant, secondary

  if (stuck >= 4) {
    intensity = 'high'; dominant = 'anger'; secondary = 'fear'
  } else if (concern >= 7) {
    intensity = 'high'; dominant = 'fear'; secondary = trust <= 3 ? 'anger' : 'none'
  } else if (concern >= 4) {
    intensity = 'medium'; dominant = 'fear'; secondary = 'none'
  } else if (concern <= 3 && trust >= 7) {
    intensity = 'low'; dominant = 'calm'; secondary = 'none'
  } else {
    intensity = 'low'; dominant = 'calm'; secondary = 'none'
  }

  return { attitude, disclosure, emotion_constraint: { intensity, dominant, secondary } }
}

/**
 * 比较两个派生状态是否相同
 */
export function derivedStatesEqual(a, b) {
  return a.attitude === b.attitude
    && a.disclosure === b.disclosure
    && a.emotion_constraint.intensity === b.emotion_constraint.intensity
    && a.emotion_constraint.dominant === b.emotion_constraint.dominant
    && a.emotion_constraint.secondary === b.emotion_constraint.secondary
}

/**
 * 确定性验证
 */
export function verifyDerivedDeterminism(cm, iterations = 100) {
  const first = JSON.stringify(computeDerivedState(cm))
  for (let i = 0; i < iterations; i++) {
    if (JSON.stringify(computeDerivedState(cm)) !== first) {
      return { consistent: false, first, iteration: i }
    }
  }
  return { consistent: true, state: JSON.parse(first), iterations }
}
