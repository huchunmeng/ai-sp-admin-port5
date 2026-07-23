// ═══════════════════════════════════════════════════════════════
// 情绪引擎 v7.1 — 纯计算层
// 4 数值 (anger/fear/sadness/joy) + 性格乘数
// 状态判定已移交 emotion-state-machine.js
// 引擎职责：接收 delta → 乘系数 → 产出数值。不参与状态决策。
// ═══════════════════════════════════════════════════════════════

// ── 工具函数 ──

export function clamp(v, min, max) { return Math.max(min, Math.min(max, v)) }

export function repairJSON(text) {
  let s = text.trim()
  if (s.startsWith('```')) {
    s = s.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '')
  }
  s = s.replace(/,(\s*[}\]])/g, '$1')
  s = s.replace(/:\s*\+(\d+(?:\.\d+)?)/g, ': $1')  // fix LLM output like "anger_delta": +3
  const openCurly = (s.match(/\{/g) || []).length
  const closeCurly = (s.match(/\}/g) || []).length
  const openSquare = (s.match(/\[/g) || []).length
  const closeSquare = (s.match(/\]/g) || []).length
  if (closeCurly < openCurly) s += '}'.repeat(openCurly - closeCurly)
  if (closeSquare < openSquare) s += ']'.repeat(openSquare - closeSquare)
  return s
}

// ── 性格系统 ──

export const PERSONALITY_MAP = {
  expressiveness: {
    '火爆型': { offset: -1.0, desc: '火爆型——情绪外露，一点就着' },
    '普通型': { offset: 0,    desc: '普通型——情绪表达适中' },
    '偏内敛': { offset: 0.3,  desc: '偏内敛——外表相对平静，内心有情绪不直接表达' },
    '隐忍型': { offset: 1.5,  desc: '隐忍型——习惯克制，一旦爆发收不住' }
  },
  sensitivity: {
    '高敏感':   { mul: 1.1, desc: '高敏感——容易被言行影响' },
    '普通敏感度': { mul: 1.0, desc: '普通敏感度——正常的情绪反应' },
    '钝感':     { mul: 0.7, desc: '钝感——不太容易被影响' }
  },
  resilience: {
    '高豁达':   { mul: 1.3, desc: '高豁达——负面情绪消退较快' },
    '普通恢复力': { mul: 1.0, desc: '普通恢复力——恢复速度正常' },
    '低豁达':   { mul: 0.7, desc: '低豁达——记仇，消退慢' }
  }
}

export function derivePersonality(emotionText = '', roleDescription = '', explicitPersonality = null) {
  if (emotionText && typeof emotionText === 'object' && !explicitPersonality) {
    explicitPersonality = emotionText
    emotionText = ''
  }
  if (explicitPersonality && typeof explicitPersonality === 'object') {
    const exprType = explicitPersonality.expressiveness || '普通型'
    const expr = PERSONALITY_MAP.expressiveness[exprType] || PERSONALITY_MAP.expressiveness['普通型']
    const sens = PERSONALITY_MAP.sensitivity[explicitPersonality.sensitivity] || PERSONALITY_MAP.sensitivity['普通敏感度']
    const resi = PERSONALITY_MAP.resilience[explicitPersonality.resilience] || PERSONALITY_MAP.resilience['普通恢复力']
    return {
      expressiveness: exprType,
      exprOffset: expr.offset,
      exprDesc: expr.desc,
      sensitivityMul: sens.mul,
      sensitivityDesc: sens.desc,
      resilienceMul: resi.mul,
      resilienceDesc: resi.desc
    }
  }
  // 回退：关键词推导
  const text = (emotionText + ' ' + (roleDescription || '')).toLowerCase()
  let expressiveness = '普通型'
  let exprOffset = 0
  let exprDesc = PERSONALITY_MAP.expressiveness['普通型'].desc
  if (/暴躁|冲动|外露|直接|发作|易怒/.test(text)) { expressiveness = '火爆型'; exprOffset = -1.0; exprDesc = PERSONALITY_MAP.expressiveness['火爆型'].desc }
  else if (/隐忍|克制|内向|沉默|不说|压抑/.test(text)) { expressiveness = '隐忍型'; exprOffset = 1.5; exprDesc = PERSONALITY_MAP.expressiveness['隐忍型'].desc }
  else if (/合作|平静|配合/.test(text)) { expressiveness = '偏内敛'; exprOffset = 0.3; exprDesc = PERSONALITY_MAP.expressiveness['偏内敛'].desc }
  let sensitivityMul = 1.0
  let sensitivityDesc = PERSONALITY_MAP.sensitivity['普通敏感度'].desc
  if (/敏感|脆弱|容易受伤|在意|多心|小心眼|多愁善感/.test(text)) { sensitivityMul = 1.1; sensitivityDesc = PERSONALITY_MAP.sensitivity['高敏感'].desc }
  else if (/钝感|麻木|大大咧咧|无所谓|不在乎|不在意|粗线条/.test(text)) { sensitivityMul = 0.7; sensitivityDesc = PERSONALITY_MAP.sensitivity['钝感'].desc }
  let resilienceMul = 1.0
  let resilienceDesc = PERSONALITY_MAP.resilience['普通恢复力'].desc
  if (/豁达|想得开|乐观|容易恢复|不记仇|开朗|宽容|大度/.test(text)) { resilienceMul = 1.3; resilienceDesc = PERSONALITY_MAP.resilience['高豁达'].desc }
  else if (/执拗|记仇|放不下|固执|倔强|记恨|偏执|难缠/.test(text)) { resilienceMul = 0.7; resilienceDesc = PERSONALITY_MAP.resilience['低豁达'].desc }
  return { expressiveness, exprOffset, exprDesc, sensitivityMul, sensitivityDesc, resilienceMul, resilienceDesc }
}

// ── 阈值 & 状态 (供状态机使用) ──
// v7.2: 12 互斥表情状态 — anger线4 + fear线3 + sadness线1 + 复合态2 + 特殊2

export const BASE_THRESHOLDS = {
  anger:    [2, 5, 8],  // irritated, angry, furious
  fear:     [2, 5, 8],  // uneasy, fearful, terrified
  sadness:  [5],         // sad (down/broken 合并)
  joy:      []           // pleased 已移除
}

export const STATE_NAMES = {
  anger:    ['calm', 'irritated', 'angry', 'furious'],
  fear:     ['calm', 'uneasy', 'fearful', 'terrified'],
  sadness:  ['calm', 'sad']
}

// 单维度主导状态优先级 (高→低) — 不含复合态和特殊状态
export const PRIORITY = [
  'furious', 'terrified', 'angry', 'fearful', 'sad',
  'irritated', 'uneasy', 'calm'
]

export function getStateForDim(dim, value, exprOffset = 0) {
  const thresholds = BASE_THRESHOLDS[dim]
  if (!thresholds) return 'calm'
  const names = STATE_NAMES[dim]
  let level = 0
  for (const t of thresholds) {
    if (value >= t + exprOffset) level++
    else break
  }
  return names[level]
}

export function getAllStates(vector, exprOffset = 0) {
  return {
    anger:   getStateForDim('anger',   vector.anger,   exprOffset),
    fear:    getStateForDim('fear',    vector.fear,    exprOffset),
    sadness: getStateForDim('sadness', vector.sadness, exprOffset)
  }
}

export function dominantState(states) {
  for (const s of PRIORITY) {
    if (Object.values(states).includes(s)) return s
  }
  return 'calm'
}

// 从 vector 直接计算状态（v8: 去掉复合态，单维度按优先级判定）
// 优先级: 怒 > 悲 > 恐，极端值优先
export function computeRawState(vector, exprOffset = 0) {
  const a = vector.anger
  const f = vector.fear
  const s = vector.sadness

  // 1. 崩溃：三维同时极高（极罕见）
  if (a >= 8 + exprOffset && f >= 8 + exprOffset && s >= 8 + exprOffset) {
    return '崩溃'
  }

  // 2. 极端单维（情绪压倒一切，不再有复合）
  if (a >= 9 + exprOffset) return 'furious'
  if (f >= 9 + exprOffset) return 'terrified'

  // 3. 中等单维（按怒>悲>恐优先级取首个命中）
  if (a >= 5 + exprOffset) return 'angry'
  if (s >= 5 + exprOffset) return 'sad'
  if (f >= 5 + exprOffset) return 'fearful'
  if (a >= 2 + exprOffset) return 'irritated'
  if (f >= 2 + exprOffset) return 'uneasy'

  return 'calm'
}

// ── LLM 输出校验 ──

// v7.4: 视频动作和语音风格有效值（与 emotion-state-machine.js 同步，避免循环引用）
const VALID_VIDEO_ACTIONS = new Set([
  'calm', 'angry_mild', 'angry', 'angry_intense',
  'fearful_mild', 'fearful', 'fearful_intense',
  'sad_soft', 'broken'
])
const VALID_VOICE_STYLES = new Set([
  'normal', 'slightly_tense', 'loud_fast', 'very_loud_fast',
  'cold', 'shaky', 'very_shaky', 'soft_slow',
  'defensive', 'vulnerable', 'broken'
])

export function validateLLMOutput(parsed, defaults = {}) {
  const result = {
    text: '',
    intent: 'neutral',
    emotion: { anger: 0, fear: 0, sadness: 0, joy: 0 },
    delta: { anger: 0, fear: 0, sadness: 0, joy: 0 },
    deep_reassure: false,
    video_action: null,
    voice_style: 'normal'
  }

  result.text = (parsed.text || '')
    .replace(/（[^）]*）/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()

  const validIntents = ['attack', 'offensive', 'friendly', 'neutral', 'noise']
  result.intent = validIntents.includes(parsed.intent) ? parsed.intent : 'neutral'

  // v8: 优先取 emotion（绝对值），没有则 fallback 到 delta
  if (parsed.emotion && typeof parsed.emotion === 'object') {
    for (const dim of ['anger', 'fear', 'sadness', 'joy']) {
      if (typeof parsed.emotion[dim] === 'number') {
        result.emotion[dim] = clamp(parsed.emotion[dim], 0, 10)
      }
    }
  }
  if (parsed.delta && typeof parsed.delta === 'object') {
    for (const dim of ['anger', 'fear', 'sadness', 'joy']) {
      if (typeof parsed.delta[dim] === 'number') {
        result.delta[dim] = clamp(parsed.delta[dim], -10, 10)
      }
    }
  }

  result.deep_reassure = parsed.deep_reassure === true

  result.show_material = (typeof parsed.show_material === 'string' && parsed.show_material) ? parsed.show_material : null

  result.video_action = VALID_VIDEO_ACTIONS.has(parsed.video_action) ? parsed.video_action : (defaults.video_action || null)
  result.voice_style = VALID_VOICE_STYLES.has(parsed.voice_style) ? parsed.voice_style : (defaults.voice_style || 'normal')

  return result
}

// ═══════════════════════════════════════════════════════════════
// 引擎工厂 — v7.1 纯计算层
// 状态判定已移交 emotion-state-machine.js
// ═══════════════════════════════════════════════════════════════

export function createEmotionEngine(config = {}) {
  const { baseline = {}, personality = {}, scene = {}, maxRise = {}, constrainDrop = ['anger', 'fear', 'sadness'], emotionFloor = {} } = config

  const constrainDropSet = new Set(constrainDrop)

  // 各维度最低值（场景决定，如人文站母亲永远有基础担忧）
  const floor = {
    anger:   emotionFloor.anger   ?? 0,
    fear:    emotionFloor.fear    ?? 0,
    sadness: emotionFloor.sadness ?? 0,
    joy:     emotionFloor.joy     ?? 0
  }

  const vector = {
    anger:   clamp(baseline.anger   ?? floor.anger,   floor.anger,   10),
    fear:    clamp(baseline.fear    ?? floor.fear,    floor.fear,    10),
    sadness: clamp(baseline.sadness ?? floor.sadness, floor.sadness, 10),
    joy:     clamp(baseline.joy     ?? floor.joy,     floor.joy,     10)
  }

  // 性格参数
  const p = {
    exprOffset:     personality.exprOffset     ?? 0,
    exprDesc:       personality.exprDesc       ?? '普通型',
    sensitivityMul: personality.sensitivityMul ?? 1.0,
    sensitivityDesc: personality.sensitivityDesc ?? '普通敏感度',
    resilienceMul:  personality.resilienceMul  ?? 1.0,
    resilienceDesc: personality.resilienceDesc ?? '普通恢复力'
  }

  // 场景乘数（仅乘数部分；floor 由状态机负责）
  const sceneMul = scene.multiplier || { anger: 1.0, fear: 1.0, sadness: 1.0, joy: 1.0 }

  let strikeCount = 0
  let lastVector = null
  let peakLockRemaining = 0   // 峰值锁定剩余轮次
  let peakType = null          // 'angry' | 'broken'
  let consecutiveNoiseCount = 0 // 连续无关轮次计数

  // ── 每轮处理（仅计算数值，不判定状态）──

  function processTurn(delta) {
    lastVector = { ...vector }

    for (const dim of ['anger', 'fear', 'sadness', 'joy']) {
      let d = delta[dim] || 0
      d *= Math.max(p.sensitivityMul, sceneMul[dim] || 1.0)
      if (d < 0) d *= p.resilienceMul
      vector[dim] = clamp(vector[dim] + d, 0, 10)
    }

    return { ...vector }
  }

  // v8: LLM 输出绝对值，引擎负责下行刹车 + attack强制上升 + 峰值锁定
  // 返回 { vector, effectiveDeepReassure } — 锁定期 deepReassure 强制为 false
  function setAbsolute(values, opts = {}) {
    lastVector = { ...vector }
    const { deepReassure = false, intent = 'neutral' } = opts
    const isAttack = intent === 'attack'
    const peakThreshold = Math.min(10, 9 + p.exprOffset)

    // ── 已有锁：全部冻结 + 管计数器 ──
    if (peakLockRemaining > 0) {
      if (isAttack) {
        peakLockRemaining = 2
      } else {
        peakLockRemaining--
      }
      if (peakLockRemaining <= 0 || vector.anger < peakThreshold) {
        peakLockRemaining = 0
        peakType = null
        // 锁到期：强制降温到阈值以下，防止LLM高值立即重触发锁
        if (vector.anger >= peakThreshold) {
          vector.anger = clamp(peakThreshold - 0.5, 0, 10)
        }
      }
      return { vector: { ...vector }, deepReassure: false }
    }

    // ── 无锁：正常处理值 ──
    // constrainDrop: 引擎截断升降; 不在集合内 → LLM 完全自主
    const angerMaxDrop = isAttack ? 0 : (deepReassure ? 2 : 0.5)
    const minRise = isAttack ? { anger: 2 } : null

    for (const dim of ['anger', 'fear', 'sadness', 'joy']) {
      if (typeof values[dim] !== 'number') continue
      const target = clamp(values[dim], 0, 10)
      const current = vector[dim]

      if (constrainDropSet.has(dim)) {
        // 引擎约束维度：rise受maxRise限制，drop受angerMaxDrop限制
        const forcedFloor = minRise?.[dim] ? current + (minRise[dim] || 0) : -Infinity
        if (isAttack && target < forcedFloor) {
          vector[dim] = clamp(forcedFloor, 0, 10)
        } else if (target > current) {
          const rise = target - current
          const cap = (isAttack && dim === 'anger') ? undefined : maxRise[dim]
          vector[dim] = cap != null ? current + Math.min(rise, cap) : target
        } else if (target < current) {
          const drop = Math.abs(target - current)
          vector[dim] = current - Math.min(drop, angerMaxDrop)
        }
      } else {
        // LLM 完全自主：值直接透传，引擎不干预升降
        vector[dim] = target
      }
    }

    // ── floor钳位：场景决定的最低情绪值，LLM不能降到floor以下 ──
    for (const dim of ['anger', 'fear', 'sadness', 'joy']) {
      if (vector[dim] < floor[dim]) vector[dim] = floor[dim]
    }

    // 处理后：anger触顶 → 启动锁定（触发轮即锁，非anger维度回退）
    if (vector.anger >= peakThreshold) {
      peakLockRemaining = 2
      peakType = (vector.fear >= 8 && vector.sadness >= 8) ? 'broken' : 'angry'
      vector.fear = lastVector.fear
      vector.sadness = lastVector.sadness
      vector.joy = lastVector.joy
      if (isAttack) { peakLockRemaining = 2 }
      return { vector: { ...vector }, deepReassure: false }
    }

    // ── 连续无关话题怒气累积 ──
    if (intent === 'noise') {
      consecutiveNoiseCount++
      if (consecutiveNoiseCount > 2) {
        vector.anger = clamp(Math.max(vector.anger, lastVector.anger + 0.5), 0, 10)
      }
    } else {
      consecutiveNoiseCount = 0
    }

    return { vector: { ...vector }, deepReassure }
  }

  function getLastVector() { return lastVector ? { ...lastVector } : null }

  // ── 投诉 + 噪声计数 ──

  function addStrike() { strikeCount++ }
  function resetStrikes() { strikeCount = 0 }
  function getStrikeCount() { return strikeCount }

  function getConsecutiveNoiseCount() { return consecutiveNoiseCount }

  // ── Video (接受外部状态参数) ──

  function getVideoCommand(state) {
    const s = state || 'calm'
    let group = 'calm', rate = 1.0, shake = 0
    // anger 线
    if (s === 'furious')          { group = 'angry'; rate = 1.3; shake = 0.5 }
    else if (s === 'angry')       { group = 'angry'; rate = 1.1; shake = 0.2 }
    else if (s === 'irritated')   { group = 'angry'; rate = 1.0 }
    // fear 线
    else if (s === 'terrified')   { group = 'fearful'; rate = 0.6; shake = 0.7 }
    else if (s === 'fearful')     { group = 'fearful'; rate = 0.85; shake = 0.3 }
    else if (s === 'uneasy')      { group = 'fearful'; rate = 1.0 }
    // sadness 线
    else if (s === 'sad')         { group = 'sad'; rate = 0.85 }
    // 崩溃
    else if (s === '崩溃')        { group = 'sad'; rate = 0.6; shake = 0.5 }
    return { group, playbackRate: clamp(rate, 0.5, 1.5), shakeIntensity: clamp(shake, 0, 1), swayAmplitude: 0 }
  }

  // ── 导出 ──

  function getVector() { return { ...vector } }
  function getPersonality() { return { ...p } }

  function reset(newBaseline = {}) {
    vector.anger   = clamp(newBaseline.anger   ?? baseline.anger   ?? floor.anger, floor.anger, 10)
    vector.fear    = clamp(newBaseline.fear    ?? baseline.fear    ?? floor.fear,  floor.fear,  10)
    vector.sadness = clamp(newBaseline.sadness ?? baseline.sadness ?? floor.sadness,floor.sadness,10)
    vector.joy     = clamp(newBaseline.joy     ?? baseline.joy     ?? floor.joy,   floor.joy,   10)
    strikeCount = 0
    lastVector = null
    peakLockRemaining = 0
    peakType = null
    consecutiveNoiseCount = 0
  }

  function getEmotionFloor() { return { ...floor } }
  function getPeakLock() { return { remaining: peakLockRemaining, type: peakType } }

  function getSerializedState() {
    return {
      vector: { ...vector },
      lastVector: lastVector ? { ...lastVector } : null,
      strikeCount,
      peakLockRemaining,
      peakType,
      consecutiveNoiseCount
    }
  }

  function restoreState(saved) {
    if (!saved) return
    if (saved.vector) {
      vector.anger = clamp(saved.vector.anger ?? 0, 0, 10)
      vector.fear = clamp(saved.vector.fear ?? 0, 0, 10)
      vector.sadness = clamp(saved.vector.sadness ?? 0, 0, 10)
      vector.joy = clamp(saved.vector.joy ?? 0, 0, 10)
    }
    lastVector = saved.lastVector ? { ...saved.lastVector } : null
    strikeCount = typeof saved.strikeCount === 'number' ? saved.strikeCount : 0
    peakLockRemaining = typeof saved.peakLockRemaining === 'number' ? saved.peakLockRemaining : 0
    peakType = saved.peakType || null
    consecutiveNoiseCount = typeof saved.consecutiveNoiseCount === 'number' ? saved.consecutiveNoiseCount : 0
  }

  return {
    vector,
    processTurn,
    setAbsolute,
    getLastVector,
    getVector,
    getPersonality,
    getEmotionFloor,
    getStrikeCount,
    addStrike,
    resetStrikes,
    getConsecutiveNoiseCount,
    getSerializedState,
    restoreState,
    reset,
    getVideoCommand,
    getPeakLock,
    validateLLMOutput: (parsed, defaults) => validateLLMOutput(parsed, defaults)
  }
}
