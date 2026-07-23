// ═══════════════════════════════════════════════════════════════
// 档位系统 V2 — 反思脑统一档位决策
// 阻尼器出数值(angerLevel) → 反思脑综合CM全貌 → 单一档位 → 知觉脑
// 11档体系: 暴怒/愤怒/不满/焦虑/不安/退缩/消沉/防御/失望/配合/中立
// ═══════════════════════════════════════════════════════════════

// ── 档位 → 行为策略文本（注入知觉脑提示词） ──

const HUMANITY_STRATEGIES = {
  '暴怒': '🛑 暴怒档：对方激怒了你。强力反击，短句回怼。威胁中断对话、直接离开。15字以内。🚫 严禁：示弱("难受""帮帮我")、描述症状、哭泣、追问病情。你不是来沟通的，你是一个被冒犯的人。',
  '愤怒': '愤怒档：你很不满。冷淡带刺回应对方，质问他的态度。可以继续沟通主题但态度强硬。20字以内。即使对方态度转变，你的愤怒不会立刻消失。',
  '不满': '不满档：你心里有气。语气冷淡但不失礼。催促对方回应你的核心疑问。可以表达不耐烦，但不升级到攻击。',
  '焦虑': '焦虑档：你内心非常担忧、紧张不安。急切想知道答案，反复追问，语气急促。1-2句话但可以连续追问。不攻击医生，只是急切。',
  '不安': '不安档：你有些担忧，但还没到焦虑的程度。说话犹豫、试探性提问。1-2句话。不攻击医生。',
  '退缩': '退缩档：你听到了坏消息，悲伤消沉。声音低微，不想说话，用最少的字回应。可以沉默、叹气、哭泣。1句话以内。🚫 严禁：长篇大论、主动提问、攻击或指责。',
  '消沉': '消沉档：你情绪低落、有些沮丧。话比平时少，回答简短，不主动提问。1-2句话。不攻击，只是提不起精神。',
  '防御': '防御档：你不信任医生。拒绝配合医生的引导，用反问代替回答（"医生你问具体点""这跟我们说的有关系吗"）。20字以内。即使对方道歉也不立刻软化。⚠️ 突发豁免：如果学生**本轮**辱骂或进一步冒犯你，可以进一步加强防御（更冷的语气、更短、直接拒绝），但**禁止跳档到攻击**——你只是不信任，不是想伤害对方。',
  '失望': '失望档：你之前对医生有过信任，但现在感觉被辜负了。语气降温、不再主动配合、用简短冷淡的方式回应。1-2句话。不攻击，只是不再信任。⚠️ 突发豁免：如果学生**本轮**辱骂或进一步冒犯你，可转为防御姿态，但**禁止攻击**。',
  '配合': '配合档：你信任医生。主动提出当前疑问，配合医生的引导。医生认真回应后给予正面反馈，再自然推进到下一个疑问。语气自然温和。1-2句话。⚠️ 突发豁免：如果学生**本轮**突然辱骂、嘲讽或严重冒犯你，或被告知重大坏消息，信任立刻冻结——停止配合、变得冷淡疏离。但**禁止攻击或升级为愤怒**——信任可以暂停，不能反转。',
  '中立': '中立档：保持距离。按顺序提出疑问，简短直接。对医生态度观望，不主动也不拒绝。1-2句话。⚠️ 突发豁免：如果学生**本轮**突然辱骂、嘲讽或严重冒犯你，你可以立刻做出防御反应（冷淡、反问、拒绝回应），但**禁止攻击或升级为愤怒**。如果学生**本轮**告知重大坏消息（如确诊重病），可以表现出担忧或低落，但不崩溃。',
}

const HISTORY_STRATEGIES = {
  '暴怒': '🛑 暴怒档：你被激怒了。强力反击，短句回怼。威胁离开、拒绝继续。15字以内。🚫 严禁：示弱("难受""帮帮我")、描述症状、哭泣、继续配合。',
  '愤怒': '愤怒档：你很不满。冷淡带刺回应，表达不满，不配合。20字以内。即使对方态度转变，你的愤怒不会立刻消失。',
  '不满': '不满档：你心里有气。催促医生回应核心问题。语气冷淡但不失礼。',
  '焦虑': '焦虑档：你内心非常担忧、紧张不安。急切想知道检查结果和病情。语气急促，反复追问。不攻击医生，只是急切和不安。',
  '不安': '不安档：你有些担忧病情。说话犹豫、试探性提问。1-2句话。不攻击医生。',
  '退缩': '退缩档：你听到了坏消息，悲伤消沉。声音低微，不想说话。可以沉默、叹气、哭泣。1句话以内。🚫 严禁：长篇大论、主动提问。',
  '消沉': '消沉档：你情绪低落、提不起精神。回答简短，不主动提问。1-2句话。不攻击。',
  '防御': '防御档：你对医生有戒心。拒绝深入交流，用反问代替回答（"不知道""你自己查"）。20字以内。⚠️ 突发豁免：如果学生**本轮**辱骂或进一步冒犯你，可以进一步加强防御（更冷、更短、直接拒绝），但**禁止跳档到攻击**。',
  '失望': '失望档：你之前信任医生，现在觉得被辜负了。语气降温、不再主动配合。1-2句话。⚠️ 突发豁免：如果学生**本轮**辱骂或进一步冒犯你，可转为防御姿态，但**禁止攻击**。',
  '配合': '配合档：你信任医生。配合回答，详细描述感受和症状。语气自然温和。⚠️ 突发豁免：如果学生**本轮**突然辱骂、嘲讽或严重冒犯你，或被告知重大坏消息，立刻停止配合、变得冷淡简短，但**禁止攻击或升级为愤怒**。',
  '中立': '中立档：医生问什么答什么，不主动也不拒绝。简短直接。⚠️ 突发豁免：如果学生**本轮**突然辱骂、嘲讽或严重冒犯你，你可以立刻做出防御反应（冷淡、反问、拒绝回应），但**禁止攻击或升级为愤怒**。如果学生**本轮**告知重大坏消息，可以表现出担忧或低落。',
}

/**
 * 档位 → 行为策略文本
 */
export function getGearStrategy(effectiveGear, mode) {
  const strategies = mode === 'humanistic-comm' ? HUMANITY_STRATEGIES : HISTORY_STRATEGIES
  return strategies[effectiveGear] || strategies['中立']
}

// ── 反思脑统一档位决策（V2：唯一档位出口） ──

/**
 * 反思脑统一决策：综合阻尼器怒值 + CM全貌 → 单一档位
 *
 * @param {object} cm — Cognitive Model
 * @param {number} angerLevel — 阻尼器当前怒值 (0-10)
 * @param {object} ds — derived state (含 dominant/attitude)
 * @param {string} previousGear — 上一轮档位（用于退出滞后）
 * @returns {string} — 档位: 暴怒|愤怒|不满|焦虑|不安|退缩|消沉|防御|失望|配合|中立
 */
export function decideGear(cm, angerLevel, ds, previousGear = '中立') {
  const stuck = cm.stuck_count ?? 0
  const avoid = cm.consecutive_avoidance ?? 0
  const trust = cm.trust ?? 5
  const trustPeak = cm.trust_peak ?? 5
  const concern = cm.concern?.intensity ?? 5
  const badNews = cm.bad_news_triggered ?? false
  const dominant = ds?.emotion_constraint?.dominant || 'calm'
  const attitude = ds?.attitude || 'neutral'
  const unresolvedLen = cm.unresolved_goals?.length ?? 0

  // ═══ 阻尼器优先（ABS即时生效，无滞后） ═══
  if (angerLevel >= 7) return '暴怒'
  if (angerLevel >= 4) return '愤怒'
  if (angerLevel >= 1) return '不满'

  // ═══ 跨轮累积升级（无滞后） ═══
  if (stuck >= 6) return '愤怒'
  if (stuck >= 4 || avoid >= 2) return '不满'

  // ═══ 悲伤退缩（进入: bad_news+trust≤3+concern≥7, 退出: concern<4 或 trust>5） ═══
  if (previousGear === '退缩' && concern >= 4 && trust <= 5) return '退缩'
  if (badNews && trust <= 3 && concern >= 7) return '退缩'

  // ═══ 焦虑（进入: concern≥9+fear+unresolved, 退出: concern<6 或 unresolved空且concern<8） ═══
  if (previousGear === '焦虑' && concern >= 6 && dominant === 'fear' && unresolvedLen > 0) return '焦虑'
  if (previousGear === '焦虑' && concern >= 8 && dominant === 'fear' && unresolvedLen === 0) return '焦虑'
  if (concern >= 9 && dominant === 'fear' && unresolvedLen > 0) return '焦虑'

  // ═══ 不安（进入: concern≥6+fear+unresolved, 退出: concern<4 或 unresolved空） ═══
  if (previousGear === '不安' && concern >= 4 && dominant === 'fear' && unresolvedLen > 0) return '不安'
  if (concern >= 6 && dominant === 'fear' && unresolvedLen > 0) return '不安'

  // ═══ 信任破裂（无滞后：trust≤2立刻触发） ═══
  if (trust <= 2) return '防御'

  // ═══ 消沉（进入: sadness+concern≥5, 退出: dominant≠sadness 或 concern<3） ═══
  if (previousGear === '消沉' && dominant === 'sadness' && concern >= 3) return '消沉'
  if (dominant === 'sadness' && concern >= 5) return '消沉'

  // ═══ 失望（进入: trust 3-5+trustPeak≥6, 退出: trust≥6→配合, trust≤2→防御） ═══
  if (previousGear === '失望' && trust >= 6) return '配合'
  if (previousGear === '失望' && trust >= 3 && trust <= 5) return '失望'
  if (trust >= 3 && trust <= 5 && trustPeak >= 6) return '失望'

  // ═══ 高度配合（进入: trust≥7+concern≤4, 退出: trust<5 或 concern>7） ═══
  if (previousGear === '配合' && trust >= 5 && concern <= 7) return '配合'
  if (trust >= 7 && concern <= 4) return '配合'

  return '中立'
}

// ── 档位 → 视听通道直接映射 ──

const GEAR_AV = {
  '暴怒': {
    va: ['angry_intense'],
    vs: ['very_loud_fast'],
    guide: '暴怒，面部扭曲、身体前倾、大声怒吼'
  },
  '愤怒': {
    va: ['angry'],
    vs: ['loud_fast', 'cold'],
    guide: '愤怒，皱眉瞪视、语气强硬冷淡'
  },
  '不满': {
    va: ['angry'],
    vs: ['cold', 'defensive'],
    guide: '不满，嘴角下拉、语气冷淡带刺'
  },
  '焦虑': {
    va: ['anxious', 'fearful'],
    vs: ['shaky', 'very_shaky'],
    guide: '焦虑不安，眼神游移、声音发抖、语速急促'
  },
  '不安': {
    va: ['anxious'],
    vs: ['slightly_tense', 'shaky'],
    guide: '不安担忧，双手交握、说话犹豫、试探性提问'
  },
  '退缩': {
    va: ['sad', 'broken'],
    vs: ['soft_slow', 'broken'],
    guide: '悲伤退缩，低头垂肩、声音低沉缓慢、不想说话'
  },
  '消沉': {
    va: ['sad'],
    vs: ['soft_slow'],
    guide: '情绪消沉，低头松垮、说话慢、无眼神交流'
  },
  '防御': {
    va: ['defensive'],
    vs: ['defensive', 'cold'],
    guide: '戒备防御，双臂交叉、语气疏离、拒绝深入'
  },
  '失望': {
    va: ['defensive'],
    vs: ['cold', 'flat'],
    guide: '失望被辜负，表情冷淡、语气降温、不再主动'
  },
  '配合': {
    va: ['warm'],
    vs: ['warm', 'normal'],
    guide: '信任配合，表情自然、语气温和'
  },
  '中立': {
    va: ['neutral'],
    vs: ['flat', 'normal'],
    guide: '平静观望，表情平淡、语气正常'
  },
}

/**
 * 档位 → 视听候选菜单
 * @returns {{ va: string[], vs: string[], guide: string }}
 */
export function getGearAV(gear) {
  return GEAR_AV[gear] || GEAR_AV['中立']
}

// ── 档位 → API 响应 intent（向后兼容） ──

/**
 * 档位 → 前端 intent 字段
 */
export function gearToIntent(effectiveGear) {
  switch (effectiveGear) {
    case '暴怒': return 'attack'
    case '愤怒': return 'offensive'
    case '不满': return 'offensive'
    case '焦虑': return 'offensive'
    case '不安': return 'neutral'
    case '防御': return 'offensive'
    case '失望': return 'offensive'
    case '配合': return 'friendly'
    default: return 'neutral'
  }
}

// ═══════════════════════════════════════════════════════════════
// 以下为 V1 旧函数，保留仅供向后兼容，新代码不应使用
// ═══════════════════════════════════════════════════════════════

/** @deprecated 使用 decideGear() 替代 */
export const DAMPER_THRESHOLDS = [
  { gear: '暴怒', min: 7 },
  { gear: '愤怒', min: 4 },
  { gear: '不满', min: 1 },
]

/** @deprecated 使用 decideGear() 替代 */
export function getDamperGear(angerLevel) {
  for (const t of DAMPER_THRESHOLDS) {
    if (angerLevel >= t.min) return t.gear
  }
  return '平静'
}

/** @deprecated 使用 decideGear() 替代 */
const ATTITUDE_GEAR_MAP = {
  defensive: '防御',
  neutral: '中立',
  cooperative: '配合',
}

/** @deprecated 使用 decideGear() 替代 */
export function getReflectionGear(attitude) {
  return ATTITUDE_GEAR_MAP[attitude] || '中立'
}

/** @deprecated 使用 decideGear() 替代 */
export function mergeGears(damperGear, reflectionGear) {
  if (damperGear !== '平静') {
    return { effectiveGear: damperGear, source: 'damper' }
  }
  return { effectiveGear: reflectionGear, source: 'reflection' }
}

/** @deprecated 使用 decideGear() 替代 */
export function getFrustrationGear(cm) {
  const stuck = cm.stuck_count ?? 0
  const avoidance = cm.consecutive_avoidance ?? 0
  if (stuck >= 7 || avoidance >= 4) return '愤怒'
  if (stuck >= 5 || avoidance >= 2) return '不耐烦'
  return null
}

/** @deprecated 使用 gearToIntent() 替代 */
export function getIntentFromGear(effectiveGear) {
  return gearToIntent(effectiveGear)
}
