// ═══════════════════════════════════════════════════════════════
// TTS/Video 候选映射引擎
// 100% 确定性 · 零 LLM
//
// 输入: derived_state + intent
// 输出: va/vs 候选集合 (2~3 个, 供 LLM 在候选范围内根据本轮对话选择)
//
// 为什么不让规则直接定死 va/vs:
//   知觉脑拿到的是 CM_{N-1} (滞后), 规则看不到本轮对话。
//   学生道歉了 → 规则如果硬定 very_loud_fast 就失真。
//   LLM 在候选里挑可以补偿滞后。
// ═══════════════════════════════════════════════════════════════

/**
 * 9 种 video_action
 * calm, angry_mild, angry, angry_intense,
 * fearful_mild, fearful, fearful_intense,
 * sad_soft, broken
 */

/**
 * 11 种 voice_style
 * normal, slightly_tense, loud_fast, very_loud_fast,
 * cold, shaky, very_shaky, soft_slow,
 * defensive, vulnerable, broken
 */

/**
 * 根据 derived state + intent → va/vs 候选
 *
 * @param {object} ds — derived state
 *   { attitude: 'cooperative'|'neutral'|'defensive',
 *     emotion_constraint: { intensity: 'high'|'medium'|'low',
 *                           dominant: 'calm'|'fear'|'anger',
 *                           secondary: 'anger'|'fear'|'none' } }
 * @param {string} intent — 'neutral'|'attack'|'offensive'|'friendly'|'noise'
 * @returns {{ va: string[], vs: string[], text_guide: string }}
 */
export function getEmotionCandidates(ds, intent = 'neutral') {
  const { attitude, emotion_constraint: ec } = ds
  const { intensity, dominant, secondary } = ec

  // 极端状态 → 收窄到 1 个, 不选
  if (dominant === 'calm' && intensity === 'low') {
    return { va: ['calm'], vs: ['normal'], text_guide: '平静自然，语气温和' }
  }

  // ── 主线映射: 基于 dominant emotion ──
  let vaPool = []
  let vsPool = []
  let guide = ''

  if (dominant === 'fear') {
    vaPool = intensity === 'high'
      ? ['fearful', 'fearful_intense']
      : intensity === 'medium'
        ? ['fearful_mild', 'fearful']
        : ['fearful_mild', 'calm']

    vsPool = intensity === 'high'
      ? ['shaky', 'very_shaky']
      : intensity === 'medium'
        ? ['slightly_tense', 'shaky']
        : ['slightly_tense', 'normal']

    guide = intensity === 'high'
      ? '极度恐惧，声音颤抖，语速急促或断断续续'
      : intensity === 'medium'
        ? '担心不安，语气带忧虑'
        : '略有不安，但总体可控'
  }

  if (dominant === 'anger') {
    vaPool = intensity === 'high'
      ? ['angry', 'angry_intense']
      : intensity === 'medium'
        ? ['angry_mild', 'angry']
        : ['angry_mild', 'calm']

    vsPool = intensity === 'high'
      ? ['loud_fast', 'very_loud_fast']
      : intensity === 'medium'
        ? ['cold', 'loud_fast']
        : ['slightly_tense', 'normal']

    guide = intensity === 'high'
      ? '愤怒，高声质问或怒吼'
      : intensity === 'medium'
        ? '不满，语气带刺或冷淡'
        : '轻微不悦，语调略硬'
  }

  // ── attitude 修正 ──
  if (attitude === 'defensive') {
    // 防御态: 愤怒更多表现为冷而非热
    if (dominant === 'anger') {
      if (!vsPool.includes('cold')) vsPool.unshift('cold')
      guide += '，防御姿态，语气冷淡疏离'
    }
    if (dominant === 'fear' && secondary === 'anger') {
      vsPool = ['defensive', 'shaky']
      guide = '恐惧中带着戒备抗拒，声音不稳但态度强硬'
    }
  }

  if (attitude === 'cooperative') {
    // 合作态: 向 calm/normal 方向收
    if (!vaPool.includes('calm')) vaPool.push('calm')
    if (!vsPool.includes('normal')) vsPool.push('normal')
    guide += '，总体配合，语气相对克制'
  }

  // ── secondary emotion 修正 ──
  if (secondary === 'fear' && dominant === 'anger') {
    guide += '，底层带恐惧颤音'
    if (!vsPool.includes('shaky')) vsPool.push('shaky')
  }
  if (secondary === 'anger' && dominant === 'fear') {
    guide += '，恐惧中夹杂愤怒'
    if (!vsPool.includes('defensive')) vsPool.push('defensive')
  }

  // ── intent 微调 ──
  if (intent === 'attack') {
    // 攻击意图: 选更激烈的候选
    vaPool = vaPool.filter(v => v.includes('intense') || v === 'angry' || v === 'fearful')
    vsPool = vsPool.filter(v => v.includes('loud') || v.includes('fast') || v === 'cold' || v === 'defensive')
    guide += '，对抗升级'
  }
  if (intent === 'friendly') {
    // 善意意图: 选更缓和的候选
    vaPool = vaPool.filter(v => v === 'calm' || v.includes('mild'))
    vsPool = vsPool.filter(v => v === 'normal' || v === 'slightly_tense' || v === 'soft_slow')
    guide += '，态度缓和'
  }
  if (intent === 'offensive') {
    // 冒犯意图: 冷淡或激烈
    vsPool = vsPool.filter(v => v === 'cold' || v === 'very_loud_fast' || v === 'loud_fast' || v === 'defensive')
    guide += '，语气带刺'
  }
  if (intent === 'noise') {
    // 噪音: 极简回应
    vaPool = ['calm']
    vsPool = ['normal', 'cold']
    guide = '简短回应，不展开'
  }

  // fallback: 确保至少 1 个候选
  if (vaPool.length === 0) vaPool = ['calm']
  if (vsPool.length === 0) vsPool = ['normal']

  // 去重
  vaPool = [...new Set(vaPool)]
  vsPool = [...new Set(vsPool)]

  return { va: vaPool, vs: vsPool, text_guide: guide }
}

/**
 * 验证映射完整性: 所有派生状态组合都应有有效候选
 */
export function validateMapping() {
  const attitudes = ['cooperative', 'neutral', 'defensive']
  const intensities = ['high', 'medium', 'low']
  const dominants = ['calm', 'fear', 'anger']
  const secondaries = ['none', 'fear', 'anger']
  const intents = ['neutral', 'attack', 'offensive', 'friendly', 'noise']

  const errors = []
  for (const a of attitudes) {
    for (const i of intensities) {
      for (const d of dominants) {
        for (const s of secondaries) {
          // 跳过无效组合
          if (s === d) continue
          if (d === 'calm' && s !== 'none') continue
          if (d === 'calm' && i !== 'low') continue

          for (const intent of intents) {
            const ds = { attitude: a, emotion_constraint: { intensity: i, dominant: d, secondary: s } }
            const result = getEmotionCandidates(ds, intent)
            if (result.va.length === 0 || result.vs.length === 0 || !result.text_guide) {
              errors.push(`${a}/${i}/${d}/${s}/${intent}: va=${result.va} vs=${result.vs}`)
            }
          }
        }
      }
    }
  }

  return { valid: errors.length === 0, errors, totalChecked: attitudes.length * intensities.length * 3 * 3 * intents.length }
}
