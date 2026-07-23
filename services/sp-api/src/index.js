// ═══════════════════════════════════════════════════════════════
// SP API 后端服务 v2.0 — 模块化重构
// 路由 + 编排层，具体逻辑委托给独立模块
// ═══════════════════════════════════════════════════════════════

import { createServer } from 'http'
import { readFileSync, existsSync, mkdirSync, writeFileSync, readdirSync, renameSync } from 'fs'
import { join, dirname, resolve } from 'path'
import { WebSocket, WebSocketServer } from 'ws'
import { fileURLToPath, pathToFileURL } from 'url'

// ── 内部模块 ──
import { callLLMDirect, LLM_MODEL, LLM_API_KEY } from './llm-client.js'
import { loadCaseData, buildRoleDescription, buildSymptomPoolRegex } from './case-loader.js'
import { initSessionStore, createSession, getSession, deleteSession, getAllSessions, cleanupSessions, saveSessionsToDisk, loadSessionsFromDisk } from './session-store.js'
import { detectBTrigger, detectATrigger, detectClosureTrigger, detectInsultTrigger, classifyIntentByRule } from './triggers.js'
import { selectFallbackPool, NEUTRAL_FALLBACKS, ANGRY_FALLBACKS, FURIOUS_FALLBACKS, SAD_FALLBACKS } from './fallbacks.js'
import { detectRepeat, detectStudentRepeat } from './repeat-detector.js'
import { buildSystemPrompt, buildMentalExamInstruction, loadPromptFile } from './prompt-builder.js'
import { initMentalState, updateMentalState, matchDelusionalTriggers, classifyChallenge, checkTermination, stateToEmotion, MENTAL_VA_CANDIDATES, MENTAL_VS_CANDIDATES } from './mental-engine.js'
import { computeDerivedState } from './poc/derived-state.js'
import { runReflectionIncremental } from './poc/reflection-worker-poc.js'
import { initCM } from './poc/event-mapping.js'
import { createAngerDamper } from './poc/emotion-damper.js'
import { decideGear, getGearAV, gearToIntent } from './poc/gear-system.js'
import { getPerceptionPersona } from './poc/personality-prompts.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = resolve(__dirname, '..', '..', '..')
const REPORTS_DIR = join(PROJECT_ROOT, 'reports')
const DATA_DIR = join(PROJECT_ROOT, 'data')
const TRAINING_RECORDS_DIR = join(DATA_DIR, 'training-records')
const TRAINING_SESSIONS_DIR = join(DATA_DIR, 'training-sessions')
const TRAINING_RECORDS_PATH = join(DATA_DIR, 'training-records.json') // 旧格式，启动时迁移

// ── 安全工具 ──
/** 剥离路径遍历字符，仅保留安全字符 */
function sanitizeId(id) {
  if (!id || typeof id !== 'string') return ''
  return id.replace(/[^a-zA-Z0-9_\-.@]/g, '').replace(/\.{2,}/g, '')
}

/** 安全拼接：校验结果不脱离 baseDir */
function safeJoin(baseDir, ...segments) {
  const sanitized = segments.map(s => sanitizeId(String(s)))
  const full = resolve(baseDir, ...sanitized)
  if (!full.startsWith(resolve(baseDir))) {
    throw new Error(`Path traversal blocked: ${full}`)
  }
  return full
}

// 从目录加载所有训练记录（每个记录一个 .json 文件）
function loadTrainingRecordsFromDir() {
  const records = {}
  if (!existsSync(TRAINING_RECORDS_DIR)) return records
  const files = readdirSync(TRAINING_RECORDS_DIR)
  for (const f of files) {
    if (!f.endsWith('.json')) continue
    try {
      const data = JSON.parse(readFileSync(join(TRAINING_RECORDS_DIR, f), 'utf-8'))
      const key = f.replace('.json', '')
      records[key] = data
    } catch { /* skip corrupted files */ }
  }
  return records
}

// 迁移旧格式 → 新格式（单文件 → 多文件目录）
function migrateTrainingRecordsIfNeeded() {
  if (!existsSync(TRAINING_RECORDS_PATH)) return
  try {
    const old = JSON.parse(readFileSync(TRAINING_RECORDS_PATH, 'utf-8'))
    mkdirSync(TRAINING_RECORDS_DIR, { recursive: true })
    let migrated = 0
    for (const [key, record] of Object.entries(old)) {
      const filePath = join(TRAINING_RECORDS_DIR, `${key}.json`)
      if (!existsSync(filePath)) {
        writeFileSync(filePath, JSON.stringify(record, null, 2), 'utf-8')
        migrated++
      }
    }
    if (migrated > 0) console.log(`[sp-api] 训练记录迁移完成: ${migrated} 条 → ${TRAINING_RECORDS_DIR}`)
    // 重命名旧文件作为备份
    const bak = TRAINING_RECORDS_PATH + '.bak'
    if (!existsSync(bak)) renameSync(TRAINING_RECORDS_PATH, bak)
  } catch (e) { console.warn('[sp-api] 训练记录迁移失败:', e.message) }
}
const SHARED_SRC = fileURLToPath(new URL('../../../packages/shared/src', import.meta.url))

// ── 动态加载 shared 模块（绕过 Vite 别名） ──
const {
  STATION_ID_TO_LABEL, STATION_TO_PROFILE_TYPE, STATION_TO_SESSION_KEY,
  PROFILE_TYPE_LABELS, PROFILE_CONFIG_MAP, STATION_LABEL_TO_IDS,
  STATION_LABEL_ALIASES, getStationLabel, getProfileType,
  getStationIdsByLabel, getReportLookupPrefixes,
} = await import(pathToFileURL(SHARED_SRC + '/station-constants.js').href)
const { clamp, repairJSON, derivePersonality, createEmotionEngine } = await import(
  pathToFileURL(SHARED_SRC + '/emotion-engine.js').href
)
const { createStateMachine, COMPLAINT_TRIGGERS } = await import(
  pathToFileURL(SHARED_SRC + '/emotion-state-machine.js').href
)
const { correctIntent } = await import(
  pathToFileURL(SHARED_SRC + '/intent-classifier.js').href
)

// ── 初始化会话管理器 ──
initSessionStore({ derivePersonality, createEmotionEngine, createStateMachine })

// ── 全局服务开关（运行时可切换） ──
let serviceEnabled = true
let forceTerminationEnabled = false
let ttsModel = process.env.TTS_MODEL || 'cosyvoice-v3-flash'

// ── 定时清理过期会话 ──
setInterval(cleanupSessions, 5 * 60 * 1000)

// ── 请求体解析 ──
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
      try { resolve(JSON.parse(body)) } catch { reject(new Error('Invalid JSON')) }
    })
    req.on('error', reject)
  })
}

function json(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  })
  res.end(JSON.stringify(data))
}

// ═══════════════════════════════════════════════════════════════
// 核心：sendSPMessage 服务端实现
// ═══════════════════════════════════════════════════════════════

/**
 * 精神检查独立消息管线
 * 完全不依赖标准 V8/V9 (CM / damper / gear / derivedState / engine / stateMachine)
 */
async function processMentalExamMessage(session, studentText) {
  const trimmed = studentText
  const ac = session.config.atypicalConfig
  const bp = (ac && ac.behavior_params) || {}
  const ds = (ac && ac.delusional_system) || {}
  const ALL_TIME_LIMIT = 30

  // ── 1. 惰性初始化心理状态 ──
  if (!session.mentalState) {
    session.mentalState = initMentalState(ac)
  }

  // ── 2. 触发词检测 + 挑战分类 ──
  const triggerResult = matchDelusionalTriggers(trimmed, ds.triggers || [])
  const isChallenge = triggerResult.matched
    ? classifyChallenge(trimmed, ds.core_belief || '')
    : false

  // ── 3. 状态更新(第一次: 基于触发检测) ──
  session.mentalState = updateMentalState(session.mentalState, 0, {
    triggerMatched: triggerResult.matched,
    triggerWord: triggerResult.word,
    isChallenge,
    _bpIrritability: bp.irritability || 0.3,
  }, bp.hallucination_interference || 0)

  // ── 4. 构建行为指令 ──
  const { prompt: systemPrompt } = buildMentalExamInstruction({
    config: session.config,
    mentalState: session.mentalState,
  })

  // ── 5. LLM 调用 ──
  const llmMessages = session.messages.map(m => ({
    role: m.role === 'user' ? 'user' : 'assistant',
    content: m.content,
  }))

  const { content: rawContent, model: usedModel } = await callLLMDirect(llmMessages, systemPrompt, 2, session.model)

  // ── 6. 解析 + 校验 ──
  let parsed
  try {
    parsed = JSON.parse(repairJSON(rawContent))
  } catch {
    parsed = { text: (rawContent || '').replace(/（[^）]*）/g, '').trim() }
  }

  const validated = {
    text: parsed.text || '',
    video_action: MENTAL_VA_CANDIDATES.includes(parsed.video_action) ? parsed.video_action : 'flat_affect',
    voice_style: MENTAL_VS_CANDIDATES.includes(parsed.voice_style) ? parsed.voice_style : 'monotone',
    delusional_activation_delta: Number.isFinite(parsed.delusional_activation_delta)
      ? Math.round(Math.max(-2, Math.min(3, parsed.delusional_activation_delta)))
      : 0,
    hallucination_triggered: !!parsed.hallucination_triggered,
  }

  let text = validated.text
  // 兜底清洗：移除括号包裹的动作描述（如"（侧头倾听）""（低声）"等）
  text = text.replace(/[（(][^）)]*[）)]/g, '').replace(/\s+/g, ' ').trim()
  if (!text) {
    text = '嗯……'
    validated.video_action = 'flat_affect'
    validated.voice_style = 'monotone'
  }

  // ── 7. 二次状态更新(LLM delta 回写) ──
  session.mentalState = updateMentalState(
    session.mentalState,
    validated.delusional_activation_delta,
    { triggerMatched: triggerResult.matched, triggerWord: triggerResult.word, isChallenge, _bpIrritability: bp.irritability || 0.3 },
    bp.hallucination_interference || 0
  )

  // ── 8. 重复检测 ──
  let finalText = text
  let finalVA = validated.video_action
  let finalVS = validated.voice_style

  session.allTimeReplies = session.allTimeReplies || []
  const recentSPReplies = []
  for (let i = session.messages.length - 1; i >= 0 && recentSPReplies.length < 10; i--) {
    if (session.messages[i].role === 'assistant') recentSPReplies.unshift(session.messages[i].content)
  }

  if (finalText && detectRepeat(finalText, session.allTimeReplies, recentSPReplies)) {
    const varyHint = '你上一条回复重复了。你作为精神科患者，沟通模式受疾病驱动（思维散漫/妄想/情感平淡），换一种方式来表达同样的内容。如果确实无话可说，回答"嗯……"即可。'
    const retryMessages = [...llmMessages, { role: 'assistant', content: finalText }]
    const retry = await callLLMDirect(retryMessages, systemPrompt + '\n\n' + varyHint, 0, session.model)
    let retryParsed
    try {
      retryParsed = JSON.parse(repairJSON(retry.content))
    } catch {
      retryParsed = { text: retry.content }
    }
    let retryText = retryParsed.text || finalText
    if (detectRepeat(retryText, session.allTimeReplies, recentSPReplies)) {
      retryText = '嗯……'
      finalVA = 'flat_affect'
      finalVS = 'monotone'
    }
    finalText = retryText
    if (MENTAL_VA_CANDIDATES.includes(retryParsed.video_action)) finalVA = retryParsed.video_action
    if (MENTAL_VS_CANDIDATES.includes(retryParsed.voice_style)) finalVS = retryParsed.voice_style
  }

  // ── 9. 终止检查 ──
  const terminationResult = checkTermination(session.mentalState)

  // ── 10. 构建情绪向量 ──
  const emotion = stateToEmotion(session.mentalState.currentState)

  // ── 11. 记录 + 持久化 ──
  session.allTimeReplies = session.allTimeReplies || []
  if (finalText) {
    session.allTimeReplies.push(finalText)
    if (session.allTimeReplies.length > ALL_TIME_LIMIT) session.allTimeReplies.shift()
  }

  session.messages.push({
    role: 'assistant',
    content: finalText,
    emotion: session.mentalState.currentState,
    action: finalVA,
    voiceStyle: finalVS,
  })

  saveSessionsToDisk()

  // ── 12. 返回 ──
  return {
    text: finalText,
    emotion,
    trustLevel: 5,
    intent: emotion.anger >= 5 ? 'offensive' : 'neutral',
    action: finalVA,
    videoAction: finalVA,
    voiceStyle: finalVS,
    terminated: terminationResult.terminated ? {
      type: terminationResult.type,
      message: terminationResult.message,
      reason: terminationResult.reason,
    } : null,
    strikes: 0,
    strikeMax: 3,
    deepReassure: false,
    material: null,
    sessionId: session.id,
    _debug: {
      model: usedModel,
      mode: 'mental-exam',
      mentalState: {
        delusionalActivation: session.mentalState.delusionalActivation,
        irritabilityLevel: session.mentalState.irritabilityLevel,
        hallucinationActive: session.mentalState.hallucinationActive,
        consecutiveChallengeCount: session.mentalState.consecutiveChallengeCount,
        currentState: session.mentalState.currentState,
        triggerHistory: session.mentalState.triggerHistory.slice(-5),
      },
      triggers: { matched: triggerResult.matched, word: triggerResult.word, isChallenge },
      llm: { rawOutput: rawContent, delta: validated.delusional_activation_delta },
      promptLength: systemPrompt.length,
    },
  }
}

async function processMessage(session, studentText) {
  const trimmed = studentText.trim()

  // 强制中止检查
  if (session.forceTerminated) {
    return {
      text: '（对话已被管理员强制中止）',
      emotion: { anger: 0, fear: 0, sadness: 0, joy: 0, state: 'calm' },
      intent: 'neutral',
      action: '',
      terminated: { message: '对话已被管理员强制中止', reason: '管理员操作' },
      sessionId: session.id
    }
  }

  session.messages.push({ role: 'user', content: trimmed })
  session.lastActivity = Date.now()

  // ═══ 精神检查模式：独立管线，完全绕过 V8/V9 ───
  if (session.config.mode === 'mental-exam') {
    return processMentalExamMessage(session, trimmed)
  }

  const { config, engine, stateMachine } = session
  const bTrigger = detectBTrigger(trimmed)
  const aTrigger = detectATrigger(trimmed)
  const closureTrigger = detectClosureTrigger(trimmed)
  // detectInsultTrigger 移至 LLM 调用之后（post-LLM 阻尼器安全兜底），不挡在知觉脑前面
  const emotionOn = config.emotionEnabled !== false
  const ALL_TIME_LIMIT = 30

  // CM 和阻尼器在 createSession() 中由场景初始化器设定
  // 以下为迁移前旧会话的兜底保护 (mental-exam 不会走到这里)
  if (emotionOn && !session.cm) {
    session.cm = initCM({
      concern: { primary: config.roleDescription?.slice(0, 50) || '健康状况', intensity: 5 },
      trust: 5,
    })
  }
  if (emotionOn && !session.damper) {
    session.damper = createAngerDamper(0)
  }

  // ── V2 反思脑统一档位决策 ──
  // 阻尼器出数值 → 反思脑综合CM全貌 → 单一档位 → 知觉脑
  let reflectionState = null
  let gears = { effectiveGear: '中立' }
  let personalityPrompt = ''
  let damperPreLevel = 0  // 记录决策前怒值（_debug用）

  if (emotionOn && session.cm) {
    const ds = computeDerivedState(session.cm)
    const damperLevel = session.damper.getLevel()
    damperPreLevel = damperLevel

    // 反思脑统一决策（唯一档位出口），传入上一轮档位用于退出滞后
    const effectiveGear = decideGear(session.cm, damperLevel, ds, session.previousGear)

    // 档位 → 视听候选菜单
    const avCandidates = getGearAV(effectiveGear)

    gears = { effectiveGear }
    reflectionState = { derivedState: ds, candidates: { va: avCandidates.va, vs: avCandidates.vs, text_guide: avCandidates.guide } }

    // 性格提示词（仅注入知觉脑，不设代码参数）
    personalityPrompt = getPerceptionPersona(session.personality)
  }

  // 学生消息相似度检测：检测是否在重复追问同一个问题
  const repeatHint = detectStudentRepeat(trimmed, session.messages)

  // 家属预后情绪检测：family角色被问到长期/预后/会不会影响一辈子时 → 要求情绪波动
  const PROGNOSIS_KEYWORDS = /会不会影响|一辈子|遗传|能治好吗|严重吗|预后|以后怎么办|长期|会不会好|是不是大病|什么病|会不会死|危险吗|严重到什么|有没有生命|将来.*怎么|以后.*怎么|确诊|诊断结果|检查结果.*出来|查出来|是什么病|糖尿病|打.*针|打针|胰岛素/
  const familyPrognosisConcern = config.role === 'family' && PROGNOSIS_KEYWORDS.test(trimmed)

  // 多问检测：学生一次问多个问题（≥2个问号）
  const multiQuestion = (trimmed.match(/[？?]/g) || []).length >= 2

  // ① 状态机上下文 (v7: 策略条目 + 行为指南)
  const smContext = emotionOn ? stateMachine.getContext(trimmed) : null

  // ② 构建提示词（V9: 档位 + 性格驱动，不再传 quickSignals/insultTrigger）
  const { prompt: systemPrompt, itemMap } = buildSystemPrompt({
    config,
    engine,
    smContext,
    reflectionState,
    messages: session.messages,
    emotionOn,
    gears,
    personality: personalityPrompt,
    triggers: { bTrigger, aTrigger, repeatHint, familyPrognosisConcern, multiQuestion, closureTrigger }
  })

  // ═══ DEBUG: 快照 LLM 调用前的状态 ═══
  const debugPre = emotionOn ? {
    vectorBefore: engine.getVector(),
    stateBefore: stateMachine.getState(),
    strikesBefore: engine.getStrikeCount()
  } : { vectorBefore: null, stateBefore: 'calm', strikesBefore: 0 }

  // ③ LLM 调用
  const llmMessages = session.messages.map(m => ({
    role: m.role === 'user' ? 'user' : 'assistant',
    content: m.content
  }))

  const { content: rawContent, model: usedModel } = await callLLMDirect(llmMessages, systemPrompt, 2, session.model)

  const debugLLM = { rawOutput: rawContent, model: usedModel }

  // ④ 解析 + 校验
  let parsed
  try {
    parsed = JSON.parse(repairJSON(rawContent))
  } catch {
    parsed = { text: rawContent.replace(/（[^）]*）/g, '').trim() }
  }

  let validated
  if (reflectionState) {
    // ── v8 反思脑模式: LLM 输出 text + video_action + voice_style + anger_delta ──
    const { va, vs } = reflectionState.candidates
    const deltaRaw = typeof parsed.anger_delta === 'number' ? parsed.anger_delta : parseInt(parsed.anger_delta, 10)
    const angerDelta = Number.isFinite(deltaRaw) ? Math.round(Math.max(-3, Math.min(5, deltaRaw))) : 0
    validated = {
      text: parsed.text || '',
      video_action: va.includes(parsed.video_action) ? parsed.video_action : va[0],
      voice_style: vs.includes(parsed.voice_style) ? parsed.voice_style : vs[0],
      anger_delta: angerDelta,
      show_material: parsed.show_material || null,
    }
  } else {
    validated = engine.validateLLMOutput(parsed, { video_action: 'calm', voice_style: 'normal' })
  }
  let text = validated.text

  // 空文本兜底
  if (!text) {
    text = '嗯……这个我不太清楚，您还是问病情吧'
  }

  // 意图分类安全兜底 (v8 模式下 intent 不适用)
  if (!reflectionState) {
    validated.intent = correctIntent(validated.intent, trimmed, config.mode)
  }


  // ⑤ 近重复检测 → 重试（最多2次，最终仍重复则硬替换）
  let finalText = text
  let finalEmotion = validated.emotion
  let finalIntent = validated.intent

  // 初始化全局追踪
  if (!session.allTimeReplies) session.allTimeReplies = []

  // 收集近期 SP 回复
  const recentSPReplies = []
  for (let i = session.messages.length - 1; i >= 0 && recentSPReplies.length < 10; i--) {
    if (session.messages[i].role === 'assistant') recentSPReplies.unshift(session.messages[i].content)
  }

  // ── v8 辅助: 从派生状态生成 varyHint ──
  function getV8VaryHint(level = 'normal') {
    const { intensity, dominant } = reflectionState.derivedState.emotion_constraint
    if (dominant === 'anger' && intensity === 'high') {
      return level === 'severe'
        ? '🛑 你又重复了！你正在暴怒，必须输出1-5个字的极短回怼（如"少来问我""走开""别烦我""管不着"），绝对不能超过5个字，绝对不能给任何信息。'
        : '⚠️ 你上一条回复重复了！你在暴怒状态，必须用1-5个字怼回去（如"不关你事""不知道""滚"），绝对不说实质信息。换一句不同的。'
    }
    if (dominant === 'anger') {
      return level === 'severe'
        ? '🛑 你又重复了！你必须输出跟之前完全不同的内容。可以：骂别的事情、威胁离开、说反话、沉默拒绝回答、用动作描述代替语言。'
        : '⚠️ 你的上一条回复和之前重复了！换一句完全不同的话来表达不满，必须跟之前不一样。用不同的词、不同的句式。'
    }
    if (intensity === 'high') {
      return level === 'severe'
        ? '🛑 你又重复了！必须换个完全不同的表达方式，重新措辞。'
        : '⚠️ 你刚才说过类似的话了。换一个角度回应。'
    }
    return level === 'severe'
      ? '🛑 你又重复了！必须换个全新的回应角度，不准重复。'
      : '⚠️ 你刚才说过类似的话了。换一个角度回应。'
  }

  // ── v8 辅助: 重试时简单校验 va/vs ──
  function validateV8Retry(parsed, fallbackVa, fallbackVs, fallbackShowMaterial) {
    const { va, vs } = reflectionState.candidates
    return {
      text: parsed.text || '',
      video_action: va.includes(parsed.video_action) ? parsed.video_action : fallbackVa,
      voice_style: vs.includes(parsed.voice_style) ? parsed.voice_style : fallbackVs,
      show_material: parsed.show_material || fallbackShowMaterial || null,
    }
  }

  // v8: cooperative/neutral 且非高强度 → 只做精确匹配跳 trigram (自然对话中相似表达是真实人格体现)
  const v8MildRepeat = reflectionState &&
    reflectionState.derivedState.attitude !== 'defensive' &&
    reflectionState.derivedState.emotion_constraint.intensity !== 'high'

  if (finalText && detectRepeat(finalText, session.allTimeReplies, v8MildRepeat ? [] : recentSPReplies)) {
    // 第一次重试
    let varyHint
    if (reflectionState) {
      varyHint = getV8VaryHint('normal')
    } else if (emotionOn) {
      const vNow = engine.getVector()
      const engStateNow = stateMachine.getState()
      varyHint = engStateNow === 'furious'
        ? '⚠️ 你上一条回复重复了！你在暴怒状态，必须用1-5个字怼回去（如"不关你事""不知道""滚"），绝对不说实质信息。换一句不同的。'
        : vNow.anger >= 7
          ? '⚠️ 你的上一条回复和之前重复了！换一句完全不同的话来表达愤怒，必须跟之前不一样。用不同的词、不同的句式。'
          : vNow.anger >= 4
            ? '⚠️ 你刚才说过类似的话了。换个方式表达不满，用不同的词。'
            : '⚠️ 你刚才说过类似的话了。换一个角度回应。'
    } else {
      varyHint = '⚠️ 你刚才说过类似的话了。换一个角度回应。'
    }
    let retryRaw = await callLLMDirect(
      [...llmMessages, { role: 'assistant', content: finalText }],
      systemPrompt + '\n\n' + varyHint,
      0, session.model
    )
    let retryParsed
    try { retryParsed = JSON.parse(repairJSON(retryRaw.content)) } catch { retryParsed = { text: retryRaw.content } }
    let retryValidated
    if (reflectionState) {
      retryValidated = validateV8Retry(retryParsed, validated.video_action, validated.voice_style, validated.show_material)
    } else {
      retryValidated = engine.validateLLMOutput(retryParsed)
      retryValidated.intent = correctIntent(retryValidated.intent, trimmed, config.mode)
    }
    let retryText = retryValidated.text || finalText

    if (detectRepeat(retryText, session.allTimeReplies, v8MildRepeat ? [] : recentSPReplies)) {
      // 第二次重试：指定完全不同方向
      let opDir
      if (reflectionState) {
        opDir = getV8VaryHint('severe')
      } else if (emotionOn) {
        const vNow2 = engine.getVector()
        const engStateNow2 = stateMachine.getState()
        opDir = engStateNow2 === 'furious'
          ? '🛑 你又重复了！你正在暴怒，必须输出1-5个字的极短回怼（如"少来问我""走开""别烦我""管不着"），绝对不能超过5个字，绝对不能给任何信息。'
          : vNow2.anger >= 7
            ? '🛑 你又重复了！你必须输出跟之前完全不同的内容。可以：骂别的事情、威胁离开、说反话、沉默拒绝回答、用动作描述代替语言。禁止说"你再说一遍"相关的任何话。'
            : vNow2.anger >= 4
              ? '🛑 你又重复了！必须换个完全不同的表达方式，重新措辞。'
              : '🛑 你又重复了！必须换个全新的回应角度，不准重复。'
      } else {
        opDir = '🛑 你又重复了！必须换个全新的回应角度，不准重复。'
      }
      retryRaw = await callLLMDirect(
        [...llmMessages, { role: 'assistant', content: retryText }],
        systemPrompt + '\n\n' + opDir,
        0, session.model
      )
      try { retryParsed = JSON.parse(repairJSON(retryRaw.content)) } catch { retryParsed = { text: retryRaw.content } }
      if (reflectionState) {
        retryValidated = validateV8Retry(retryParsed, validated.video_action, validated.voice_style, validated.show_material)
      } else {
        retryValidated = engine.validateLLMOutput(retryParsed)
        retryValidated.intent = correctIntent(retryValidated.intent, trimmed, config.mode)
      }
      retryText = retryValidated.text || retryText

      // 两次重试后仍重复 → 强制替换
      if (detectRepeat(retryText, session.allTimeReplies, v8MildRepeat ? [] : recentSPReplies)) {
        let pool
        if (emotionOn && !reflectionState) {
          pool = selectFallbackPool(stateMachine.getState(), engine.getVector())
        } else if (reflectionState) {
          const { intensity, dominant } = reflectionState.derivedState.emotion_constraint
          if (dominant === 'anger' && intensity === 'high') pool = FURIOUS_FALLBACKS
          else if (dominant === 'anger') pool = ANGRY_FALLBACKS
          else if (dominant === 'fear' && intensity === 'high') pool = SAD_FALLBACKS
          else pool = NEUTRAL_FALLBACKS
        } else {
          pool = NEUTRAL_FALLBACKS
        }
        for (const fb of pool) {
          if (!session.allTimeReplies.includes(fb)) { retryText = fb; break }
        }
        // 所有后备词都用过了 → 退化为语气词
        if (!retryText || session.allTimeReplies.includes(retryText)) {
          retryText = '嗯'
        }
        if (reflectionState) {
          retryValidated = { text: retryText, video_action: validated.video_action, voice_style: validated.voice_style, show_material: validated.show_material }
        } else {
          retryValidated = { text: retryText, emotion: retryValidated.emotion, intent: retryValidated.intent }
        }
      }
    }

    finalText = retryText
    if (reflectionState) {
      validated.video_action = retryValidated.video_action || validated.video_action
      validated.voice_style = (retryValidated.voice_style && retryValidated.voice_style !== 'normal') ? retryValidated.voice_style : validated.voice_style
      validated.show_material = retryValidated.show_material || validated.show_material
    } else {
      finalEmotion = retryValidated.emotion
      finalIntent = retryValidated.intent || finalIntent
      validated.show_material = retryValidated.show_material || validated.show_material
      validated.deep_reassure = retryValidated.deep_reassure || validated.deep_reassure
      validated.video_action = retryValidated.video_action || validated.video_action
      validated.voice_style = (retryValidated.voice_style && retryValidated.voice_style !== 'normal') ? retryValidated.voice_style : validated.voice_style
    }
  }

  // 记录全局历史
  if (finalText) {
    session.allTimeReplies.push(finalText)
    if (session.allTimeReplies.length > ALL_TIME_LIMIT) session.allTimeReplies.shift()
  }

  // ⑥ 引擎状态更新 (v8 反思脑模式下跳过，由反思脑异步接管)
  let effectiveDeepReassure = false
  if (emotionOn && !reflectionState) {
    const absEmotion = validated.emotion || {}
    const deepReassure = validated.deep_reassure === true
    const result = engine.setAbsolute(absEmotion, { deepReassure, intent: finalIntent })
    effectiveDeepReassure = result.deepReassure

    stateMachine.determineState(finalIntent)

    const stateNow = stateMachine.getState()
    const trigger = COMPLAINT_TRIGGERS[stateNow]?.[finalIntent]
    if (trigger) {
      engine.addStrike()
    }
    if (effectiveDeepReassure) {
      engine.resetStrikes()
    }
  }

  // ⑦ 终止检查
  let terminated = null
  if (reflectionState) {
    // ── v8 终止: 基于 CM 状态 ──
    const cm = session.cm
    if (forceTerminationEnabled) {
      if (cm.trust <= 1 && cm.stuck_count >= 5) {
        terminated = { type: 'breakdown', message: '信任完全破裂，对话无法继续', reason: 'trust=0且卡住≥5轮' }
      } else if (cm.stuck_count >= 8) {
        terminated = { type: 'stuck', message: '对话长期卡住，自动终止', reason: '累计卡住≥8轮' }
      }
    }
  } else if (emotionOn && smContext) {
    const smResult = stateMachine.processResult(finalIntent, trimmed, effectiveDeepReassure)
    if (forceTerminationEnabled && smResult.terminal) {
      terminated = smResult.termination
    }
    if (!forceTerminationEnabled && smResult.terminal) {
      stateMachine.clearTerminalState()
    }
  } else if (emotionOn) {
    if (forceTerminationEnabled && engine.getStrikeCount() >= 3) {
      terminated = {
        type: 'complaint',
        message: '病人已向医务科投诉，对话终止',
        reason: '累计3次投诉'
      }
    }
  }

  // ═══ DEBUG: 快照处理后的状态 ═══
  const outputState = reflectionState
    ? reflectionState.derivedState.emotion_constraint.dominant
    : (emotionOn ? stateMachine.getState() : 'calm')
  const finalActionGroup = reflectionState
    ? validated.video_action
    : (emotionOn ? engine.getVideoCommand(outputState).group : 'calm')

  // ── va/vs 硬覆盖（仅人文站 + 旧路径）：策略表为权威来源 ──
  if (!reflectionState && config.mode === 'humanistic-comm' && outputState !== 'calm') {
    const strategies = stateMachine.getStrategiesForState(outputState)
    const strat = strategies[finalIntent] || strategies['neutral']
    if (strat) {
      validated.video_action = strat.va
      validated.voice_style = strat.vs
    }
  }

  const debugPost = reflectionState ? {
    vectorAfter: null,
    stateAfter: outputState,
    strikesAfter: 0,
    noiseCount: 0,
    actionGroup: finalActionGroup,
    peakLock: { remaining: 0, type: null },
    cm: {
      concern: session.cm.concern.intensity,
      trust: session.cm.trust,
      stuck: session.cm.stuck_count,
      attitude: reflectionState.derivedState.attitude,
      emotion: reflectionState.derivedState.emotion_constraint,
    }
  } : (emotionOn ? {
    vectorAfter: engine.getVector(),
    stateAfter: outputState,
    strikesAfter: engine.getStrikeCount(),
    noiseCount: engine.getConsecutiveNoiseCount(),
    actionGroup: finalActionGroup,
    peakLock: engine.getPeakLock()
  } : { vectorAfter: null, stateAfter: 'calm', strikesAfter: 0, noiseCount: 0, actionGroup: 'calm', peakLock: { remaining: 0, type: null } })

  session.messages.push({
    role: 'assistant',
    content: finalText,
    emotion: outputState,
    action: finalActionGroup,
    voiceStyle: validated.voice_style || 'normal'
  })

  // 保存本轮档位 → 下一轮 decideGear 退出滞后使用
  session.previousGear = gears.effectiveGear

  // ── v8 反思脑: 异步更新 CM (fire-and-forget, 为下一轮准备) ──
  if (reflectionState) {
    const currentRound = session.messages.filter(m => m.role === 'user').length
    const roundDialogue = [
      { round: currentRound, role: 'student', content: trimmed },
      { round: currentRound, role: 'sp', content: finalText }
    ]
    const bgPersonality = session.personality || 'default'
    runReflectionIncremental(session.cm, roundDialogue, { personality: bgPersonality, role: config.role })
      .then(result => {
        if (!result.success) {
          console.error(`[sp-api] 反思脑更新失败(session=${session.id}): ${result.error}`)
        } else {
          console.log(`[sp-api] 反思脑 R${currentRound}: events=[${result.extraction.events.join(',')}] c=${session.cm.concern.intensity} t=${session.cm.trust} s=${session.cm.stuck_count}`)
        }
      })
      .catch(e => {
        console.error(`[sp-api] 反思脑异常(session=${session.id}): ${e.message}`)
      })
  }

  // ── 阻尼器: 升门自由(LLM delta驱动)，关门有阻(机械减速) ──
  // 关键词检测仅在 LLM 之后运行 —— 阻尼器安全兜底，不挡知觉脑
  // 阻尼器只负责: 辱骂兜底升 + LLM delta升 + 机械慢降(-0.3/轮)
  // 道歉/共情的识别和纠偏是反思脑的事，阻尼器不干预
  const insultByKeyword = detectInsultTrigger(trimmed)
  const empathyByKeyword = classifyIntentByRule(trimmed)
  if (insultByKeyword) {
    // 辱骂兜底: 无视 LLM，强制升门 ≥3
    session.damper.rise(Math.max(validated.anger_delta, 3))
  } else if (validated.anger_delta > 0) {
    // LLM 判涨: 信任 LLM delta
    session.damper.rise(validated.anger_delta)
  } else {
    // 机械慢降: 不管学生说什么，只降 -0.3/轮
    session.damper.decay(false)
  }
  const damperAnger = session.damper ? session.damper.getLevel() : 0
  // lastIntent 追踪已移除 —— 情绪记忆由档位系统接管

  // 构建公开向量 (v8: 派生状态合成 fear/sadness, 阻尼器提供 anger)
  let emotion
  if (reflectionState) {
    const { intensity, dominant, secondary } = reflectionState.derivedState.emotion_constraint
    const mapVal = (level) => level === 'high' ? 7 : level === 'medium' ? 5 : 3
    // anger 来自阻尼器（快升慢降），fear/sadness 来自 CM
    // 高恐惧场景（坏消息等）不让中等愤怒覆盖 state 标签
    const angerVal = damperAnger > 0 ? damperAnger : (dominant === 'anger' ? mapVal(intensity) : (secondary === 'anger' ? 4 : 0))
    const cmHighFear = dominant === 'fear' && intensity === 'high'
    const effectiveDominant = (angerVal >= 4 && !(cmHighFear && angerVal < 7)) ? 'anger' : dominant
    emotion = { anger: angerVal, fear: 0, sadness: 0, joy: 0, state: effectiveDominant }
    if (dominant === 'fear' || secondary === 'fear') {
      emotion.fear = mapVal(intensity)
      if (secondary === 'fear' && dominant === 'anger') emotion.fear = 4
    }
  } else {
    const rawVec = engine.getVector()
    emotion = {
      anger: rawVec.anger,
      fear: rawVec.fear,
      sadness: rawVec.sadness,
      joy: rawVec.joy,
      state: outputState
    }
  }

  // 检查报告素材
  let material = null
  const showMaterial = validated.show_material || null
  if (showMaterial && itemMap?.[showMaterial]) {
    const item = itemMap[showMaterial]
    material = { id: item.id, type: item.type, filename: item.filename, itemName: item.itemName, filePath: item.filePath }
  }

  // 每轮消息后落盘会话状态（异步，fire-and-forget）
  saveSessionsToDisk()

  return {
    text: finalText,
    emotion,
    trustLevel: session.cm?.trust ?? 0,
    intent: reflectionState ? gearToIntent(gears.effectiveGear) : finalIntent,
    action: finalActionGroup || '',
    videoAction: validated.video_action || 'calm',
    voiceStyle: validated.voice_style || 'normal',
    terminated,
    strikes: (!reflectionState && emotionOn) ? engine.getStrikeCount() : 0,
    strikeMax: 3,
    deepReassure: reflectionState ? false : effectiveDeepReassure,
    material,
    sessionId: session.id,
    // ═══ DEBUG: 完整内部链路 ═══
    _debug: {
      model: debugLLM.model,
      pre: debugPre,
      post: debugPost,
      emotion: finalEmotion,
      validated: validated.emotion || validated,
      llm: { rawOutput: debugLLM.rawOutput, parsedOutput: parsed },
      promptLength: systemPrompt.length,
      emotionOn,
      reflectionMode: !!reflectionState,
      triggers: { bTrigger: !!bTrigger, aTrigger: !!aTrigger, repeatHint: !!repeatHint, multiQuestion, familyPrognosisConcern, closureTrigger, insultByKeyword, empathyByKeyword },
      gears: { effective: gears.effectiveGear },
      damper: { preDecision: damperPreLevel, postDecision: session.damper?.getLevel() ?? 0 },
      cm: session.cm ? {
        trust: session.cm.trust,
        trust_peak: session.cm.trust_peak,
        concern: { primary: session.cm.concern?.primary, intensity: session.cm.concern?.intensity },
        stuck_count: session.cm.stuck_count,
        consecutive_avoidance: session.cm.consecutive_avoidance,
        conflict_trust_loss: session.cm.conflict_trust_loss,
        bad_news_triggered: session.cm.bad_news_triggered,
        unresolved_count: session.cm.unresolved_goals?.length ?? 0,
      } : null
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// HTTP 路由
// ═══════════════════════════════════════════════════════════════

const server = createServer(async (req, res) => {
  // CORS
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    })
    res.end()
    return
  }

  // GET/POST /api/sp/admin/status — 运行时服务开关
  if ((req.method === 'GET' || req.method === 'POST') && req.url.split('?')[0] === '/api/sp/admin/status') {
    if (req.method === 'POST') {
      try {
        const body = await parseBody(req)
        if (typeof body.enabled === 'boolean') {
          serviceEnabled = body.enabled
          console.log(`[sp-api] 服务已${serviceEnabled ? '开启' : '关闭'}`)
        }
        if (typeof body.forceTerminationEnabled === 'boolean') {
          forceTerminationEnabled = body.forceTerminationEnabled
          console.log(`[sp-api] 强制中止机制已${forceTerminationEnabled ? '开启' : '关闭'}`)
        }
      } catch { /* ignore bad body */ }
    }
    return json(res, 200, { ok: true, enabled: serviceEnabled, forceTerminationEnabled })
  }

  // GET/POST /api/sp/admin/settings — TTS模型配置
  if ((req.method === 'GET' || req.method === 'POST') && req.url.split('?')[0] === '/api/sp/admin/settings') {
    if (req.method === 'POST') {
      try {
        const body = await parseBody(req)
        if (typeof body.ttsModel === 'string' && body.ttsModel) {
          ttsModel = body.ttsModel
          console.log(`[sp-api] TTS模型已切换为: ${ttsModel}`)
        }
      } catch { /* ignore bad body */ }
    }
    return json(res, 200, { ok: true, ttsModel })
  }

  // GET /api/sp/admin/sessions — 查看活跃会话
  if (req.method === 'GET' && req.url.split('?')[0] === '/api/sp/admin/sessions') {
    const list = []
    for (const [id, s] of getAllSessions()) {
      list.push({
        sessionId: id,
        caseId: s.config?.caseId || '',
        mode: s.config?.mode || '',
        messageCount: s.messages?.length || 0,
        forceTerminated: s.forceTerminated || false,
        lastActivity: new Date(s.lastActivity).toISOString()
      })
    }
    return json(res, 200, { ok: true, sessions: list })
  }

  // POST /api/sp/admin/terminate — 强制中止对话
  if (req.method === 'POST' && req.url.split('?')[0] === '/api/sp/admin/terminate') {
    if (!forceTerminationEnabled) {
      return json(res, 403, { ok: false, error: '强制中止机制已关闭' })
    }
    try {
      const body = await parseBody(req)
      const { sessionId, caseId } = body
      let count = 0
      for (const [id, session] of getAllSessions()) {
        if (sessionId) {
          if (id === sessionId) { session.forceTerminated = true; count++ }
        } else if (caseId) {
          if (session.config?.caseId === caseId) { session.forceTerminated = true; count++ }
        } else {
          session.forceTerminated = true; count++
        }
      }
      console.log(`[sp-api] 强制中止 ${count} 个会话`)
      return json(res, 200, { ok: true, terminated: count })
    } catch (e) {
      return json(res, 400, { ok: false, error: e.message })
    }
  }

  // GET /api/sp/admin/prompts — 查看所有提示词与策略文件
  if (req.method === 'GET' && req.url.split('?')[0] === '/api/sp/admin/prompts') {
    try {
      const { readdirSync, readFileSync } = await import('fs')
      const promptsDir = join(__dirname, '..', '..', 'ai-generator', 'prompts')
      const pocDir = join(__dirname, 'poc')

      const readTxtFiles = (dirPath) => {
        if (!existsSync(dirPath)) return []
        return readdirSync(dirPath)
          .filter(f => f.endsWith('.txt'))
          .map(f => ({
            name: f,
            content: readFileSync(join(dirPath, f), 'utf-8')
          }))
      }

      const sections = [
        { key: 'case-basic',    label: '病例生成 - 基本信息',  files: readTxtFiles(join(promptsDir, '01-basic')) },
        { key: 'case-reception',label: '病例生成 - 接诊信息',  files: readTxtFiles(join(promptsDir, '02-reception')) },
        { key: 'case-analysis', label: '病例生成 - 病例分析',  files: readTxtFiles(join(promptsDir, '03-analysis')) },
        { key: 'case-humanity', label: '病例生成 - 人文沟通',  files: readTxtFiles(join(promptsDir, '04-humanity')) },
        { key: 'case-meta',     label: '病例生成 - Meta模块',  files: readTxtFiles(join(promptsDir, '05-meta')) },
        { key: 'sp-system',     label: 'SP系统提示词',         files: readTxtFiles(join(promptsDir, '06-aisp')) },
      ]

      // POC策略文件（只展示纯文本+JS源码，排除test文件）
      const pocFiles = []
      if (existsSync(pocDir)) {
        const jsFiles = readdirSync(pocDir)
          .filter(f => (f.endsWith('.js') || f.endsWith('.txt')) && !f.startsWith('test-'))
        for (const f of jsFiles) {
          pocFiles.push({ name: f, content: readFileSync(join(pocDir, f), 'utf-8') })
        }
        // JS文件放前面，txt放后面
        pocFiles.sort((a, b) => {
          const aJs = a.name.endsWith('.js'), bJs = b.name.endsWith('.js')
          if (aJs && !bJs) return -1
          if (!aJs && bJs) return 1
          return a.name.localeCompare(b.name)
        })
      }
      sections.push({ key: 'strategy', label: '情绪策略引擎 (POC)', files: pocFiles })

      return json(res, 200, { ok: true, sections })
    } catch (e) {
      return json(res, 500, { ok: false, error: e.message })
    }
  }

  // 服务关闭时拒绝 AI 请求
  if (!serviceEnabled && req.url.split('?')[0] !== '/api/sp/health' && req.url.split('?')[0] !== '/api/sp/admin/status') {
    return json(res, 503, { ok: false, error: '服务已关闭，请在管理端系统设置中重新开启' })
  }

  // GET /api/sp/health
  if (req.method === 'GET' && req.url.split('?')[0] === '/api/sp/health') {
    return json(res, 200, {
      ok: true,
      model: LLM_MODEL,
      ttsModel,
      sessions: getAllSessions().size,
      uptime: process.uptime()
    })
  }

  // GET /api/sp/materials/<caseId>/<filename> — 静态文件服务
  const matMatch = req.url.match(/^\/api\/sp\/materials\/([^/]+)\/(.+)$/)
  if ((req.method === 'GET' || req.method === 'HEAD') && matMatch) {
    const [, caseId, decodedFile] = matMatch
    const filePath = decodeURIComponent(decodedFile)
    const MATERIALS_DIR = join(__dirname, '..', '..', '..', 'apps', 'admin', 'public', 'data', 'cases')
    let fullPath
    try {
      fullPath = safeJoin(MATERIALS_DIR, caseId, 'materials', filePath)
    } catch {
      return json(res, 400, { ok: false, error: 'Invalid path' })
    }
    if (!existsSync(fullPath)) {
      return json(res, 404, { ok: false, error: 'Material file not found' })
    }
    try {
      const ext = filePath.split('.').pop().toLowerCase()
      const mimeTypes = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', pdf: 'application/pdf', mp4: 'video/mp4', mp3: 'audio/mpeg', wav: 'audio/wav' }
      const contentType = mimeTypes[ext] || 'application/octet-stream'
      const data = readFileSync(fullPath)
      res.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=3600' })
      res.end(data)
    } catch {
      return json(res, 500, { ok: false, error: 'Failed to read material file' })
    }
    return
  }

  // POST /api/sp/configure
  if (req.method === 'POST' && req.url.split('?')[0] === '/api/sp/configure') {
    try {
      const body = await parseBody(req)
      const { caseId: rawCaseId, config } = body
      const caseId = sanitizeId(rawCaseId)

      let finalConfig = null
      if (caseId) {
        const basic = loadCaseData(caseId, 'basic')
        if (!basic) return json(res, 404, { ok: false, error: `Case ${caseId} not found` })
        const reception = loadCaseData(caseId, 'reception')
        const meta = loadCaseData(caseId, 'meta')
        const humanity = loadCaseData(caseId, 'humanity')

        finalConfig = {
          caseId,
          mode: 'history-taking',
          role: reception?.sp_materials?.role || 'patient',
          roleDescription: buildRoleDescription(basic, reception),
          symptomPool: reception?.sp_materials?.self_narration || '',
          emotionBaseline: reception?.sp_materials?.emotion_baseline || {},
          spPlayRules: reception?.sp_materials?.sp_play_rules || null,
          personality: meta?.personality || null,
          emotionEnabled: true
        }

        if (!config?.mode && humanity?.scenarios?.length) {
          finalConfig.mode = 'humanistic-comm'
        }

        if (config) {
          Object.assign(finalConfig, config)
        }

        // 人文站：始终加载场景数据（无论mode是自动检测还是显式传入）
        if (finalConfig.mode === 'humanistic-comm' && humanity?.scenarios?.length) {
          finalConfig.psychologicalStages = humanity.scenarios[0].psychological_stages || []
          finalConfig.humanityScenario = humanity.scenarios[0]
        }
        // 精神检查站：强制患者角色 + 加载 B类SP非典型对话配置
        if (finalConfig.mode === 'mental-exam') {
          finalConfig.role = 'patient'
          let atypicalConfig = meta?.atypical_dialogue || null
          if (!atypicalConfig) {
            const mentalExam = loadCaseData(caseId, 'mentalExam')
            atypicalConfig = mentalExam || null
          }
          finalConfig.atypicalConfig = atypicalConfig
        }
        // communicationTarget 始终覆盖 role（人文沟通场景可能不同于 reception 数据）
        if (finalConfig.communicationTarget) {
          finalConfig.role = finalConfig.communicationTarget
        }
      } else if (config) {
        finalConfig = config
        if (finalConfig.communicationTarget && !finalConfig.role) {
          finalConfig.role = finalConfig.communicationTarget
        }
      }

      if (!finalConfig) return json(res, 400, { ok: false, error: 'Missing config or caseId' })

      const session = await createSession(finalConfig)
      return json(res, 200, {
        ok: true,
        sessionId: session.id,
        config: { mode: finalConfig.mode, caseId: finalConfig.caseId }
      })
    } catch (e) {
      return json(res, 400, { ok: false, error: e.message })
    }
  }

  // POST /api/sp/message
  if (req.method === 'POST' && req.url.split('?')[0] === '/api/sp/message') {
    try {
      const body = await parseBody(req)
      const { sessionId, text } = body
      if (!sessionId) return json(res, 400, { ok: false, error: 'Missing sessionId' })
      if (!text?.trim()) return json(res, 400, { ok: false, error: 'Missing text' })

      const session = getSession(sessionId)
      if (!session) return json(res, 404, { ok: false, error: 'Session not found or expired' })

      const result = await processMessage(session, text)
      return json(res, 200, { ok: true, ...result })
    } catch (e) {
      return json(res, 500, { ok: false, error: e.message })
    }
  }

  // POST /api/sp/destroy (销毁会话)
  if (req.method === 'POST' && req.url.split('?')[0] === '/api/sp/destroy') {
    try {
      const body = await parseBody(req)
      deleteSession(body.sessionId)
      saveSessionsToDisk()
      return json(res, 200, { ok: true })
    } catch {
      return json(res, 400, { ok: false, error: 'Invalid request' })
    }
  }

  // POST /api/sp/session/restore — 断点续训：恢复已存在的会话
  if (req.method === 'POST' && req.url.split('?')[0] === '/api/sp/session/restore') {
    try {
      const body = await parseBody(req)
      const sid = body.sessionId
      if (!sid) return json(res, 400, { ok: false, error: 'Missing sessionId' })
      const session = getSession(sid)
      if (session && !session.forceTerminated) {
        return json(res, 200, { ok: true, data: { sessionId: sid, state: 'active' } })
      }
      return json(res, 200, { ok: true, data: { sessionId: sid, state: session?.forceTerminated ? 'terminated' : 'not_found' } })
    } catch {
      return json(res, 400, { ok: false, error: 'Invalid request' })
    }
  }

  // POST /api/sp/symptom-pool (症状池结构化，无状态)
  if (req.method === 'POST' && req.url.split('?')[0] === '/api/sp/symptom-pool') {
    try {
      const body = await parseBody(req)
      const { selfNarration } = body
      if (!selfNarration?.trim()) return json(res, 400, { ok: false, error: 'Missing selfNarration' })

      const content = await buildSymptomPool(selfNarration)
      return json(res, 200, { ok: true, content })
    } catch (e) {
      return json(res, 500, { ok: false, error: e.message })
    }
  }

  // POST /api/sp/exam (体格检查命令，无状态)
  if (req.method === 'POST' && req.url.split('?')[0] === '/api/sp/exam') {
    try {
      const body = await parseBody(req)
      const { command, templates } = body
      if (!command?.trim()) return json(res, 400, { ok: false, error: 'Missing command' })

      const result = await processExamCommand(command, templates || [])
      return json(res, 200, { ok: true, result })
    } catch (e) {
      return json(res, 500, { ok: false, error: e.message })
    }
  }

  // ═══ 评分/剖面/整合 API 已废弃 ═══
  // 报告生成统一走 POST /api/training/settle（全流程 + 落盘）
  // score-analyzer 函数通过 settle/regenerate 内部直接调用，不再暴露独立 HTTP 端点

  // POST /api/score-sheet/parse
  if (req.method === 'POST' && req.url.split('?')[0] === '/api/score-sheet/parse') {
    if (!LLM_API_KEY) return json(res, 503, { ok: false, error: 'LLM API key not configured' })
    try {
      const body = await parseBody(req)
      const { basicData, templateItems, specialty } = body
      if (!basicData || !templateItems || !templateItems.length) return json(res, 400, { ok: false, error: 'Missing basicData or templateItems' })
      const PARSER_SRC = fileURLToPath(new URL('../../../packages/shared/src/score-sheet-parser.js', import.meta.url))
      const { parseScoreSheet } = await import(pathToFileURL(PARSER_SRC).href)
      const llmConfig = { apiUrl: process.env.LLM_API_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', apiKey: LLM_API_KEY, model: process.env.LLM_MODEL || 'qwen-plus' }
      const result = await parseScoreSheet({ basicData, templateItems, specialty, llmConfig })
      return json(res, 200, { ok: true, data: result })
    } catch (e) {
      console.error('[sp-api] scoreSheetParse error:', e.message)
      return json(res, 500, { ok: false, error: e.message })
    }
  }

  // GET /api/training-records — 加载训练记录
  if (req.method === 'GET' && req.url.split('?')[0] === '/api/training-records') {
    try {
      const records = loadTrainingRecordsFromDir()
      return json(res, 200, { ok: true, data: records })
    } catch (e) {
      console.error('[sp-api] loadTrainingRecords error:', e.message)
      return json(res, 500, { ok: false, error: e.message })
    }
  }

  // POST /api/training-records — 保存训练记录
  if (req.method === 'POST' && req.url.split('?')[0] === '/api/training-records') {
    try {
      const body = await parseBody(req)
      mkdirSync(TRAINING_RECORDS_DIR, { recursive: true })
      for (const [key, record] of Object.entries(body)) {
        const filePath = join(TRAINING_RECORDS_DIR, `${key}.json`)
        // 保留已有记录的 rawData（避免空 POST 覆盖含操作数据的记录）
        if (existsSync(filePath) && (!record.rawData || Object.keys(record.rawData).length === 0)) {
          try {
            const existing = JSON.parse(readFileSync(filePath, 'utf-8'))
            if (existing.rawData && Object.keys(existing.rawData).length > 0) {
              record.rawData = existing.rawData
            }
          } catch { /* skip */ }
        }
        writeFileSync(filePath, JSON.stringify(record, null, 2), 'utf-8')
      }
      return json(res, 200, { ok: true })
    } catch (e) {
      console.error('[sp-api] saveTrainingRecords error:', e.message)
      return json(res, 500, { ok: false, error: e.message })
    }
  }

  // POST /api/training/session-save — 实时持久化训练会话数据
  if (req.method === 'POST' && req.url.split('?')[0] === '/api/training/session-save') {
    try {
      const body = await parseBody(req)
      const { caseId: rawCaseId, sessionData, sessionEpoch } = body
      const caseId = sanitizeId(rawCaseId)
      if (!caseId || !sessionData) return json(res, 400, { ok: false, error: 'Missing caseId or sessionData' })

      const dir = join(TRAINING_SESSIONS_DIR, caseId)
      mkdirSync(dir, { recursive: true })
      const fileName = sessionEpoch ? `${sessionEpoch}.json` : 'session.json'
      const filePath = join(dir, fileName)
      const payload = {
        caseId,
        sessionEpoch: sessionEpoch || null,
        savedAt: new Date().toISOString(),
        sessionData
      }
      writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf-8')
      return json(res, 200, { ok: true })
    } catch (e) {
      console.error('[sp-api] session-save error:', e.message)
      return json(res, 500, { ok: false, error: e.message })
    }
  }

  // GET /api/training/session-data — 读取实时落盘的训练会话数据
  if (req.method === 'GET' && req.url.split('?')[0] === '/api/training/session-data') {
    try {
      const urlParams = new URLSearchParams(req.url.split('?')[1] || '')
      const caseId = sanitizeId(urlParams.get('caseId'))
      const sessionEpoch = urlParams.get('sessionEpoch')
      if (!caseId) return json(res, 400, { ok: false, error: 'Missing caseId' })

      const caseDir = join(TRAINING_SESSIONS_DIR, caseId)
      if (!existsSync(caseDir)) return json(res, 404, { ok: false, error: 'Session data not found' })

      let sessionFile
      if (sessionEpoch) {
        sessionFile = join(caseDir, `${sessionEpoch}.json`)
      } else {
        // 无 sessionEpoch 时返回最新文件
        const files = readdirSync(caseDir).filter(f => f.endsWith('.json'))
        if (!files.length) return json(res, 404, { ok: false, error: 'Session data not found' })
        files.sort()
        sessionFile = join(caseDir, files[files.length - 1])
      }
      if (!existsSync(sessionFile)) return json(res, 404, { ok: false, error: 'Session data not found' })

      const payload = JSON.parse(readFileSync(sessionFile, 'utf-8'))
      return json(res, 200, { ok: true, data: payload })
    } catch (e) {
      console.error('[sp-api] session-data error:', e.message)
      return json(res, 500, { ok: false, error: e.message })
    }
  }

  // POST /api/training/settle — 断点续训：结算所有考站
  if (req.method === 'POST' && req.url.split('?')[0] === '/api/training/settle') {
    if (!LLM_API_KEY) return json(res, 503, { ok: false, error: 'LLM API key not configured' })
    try {
      const body = await parseBody(req)
      const { caseId: rawCaseId, caseInfo, settleKey, sessionEpoch } = body
      const caseId = sanitizeId(rawCaseId)
      if (!caseId) return json(res, 400, { ok: false, error: 'Missing caseId' })
      const ANALYZER_SRC = fileURLToPath(new URL('../../score-analyzer/src', import.meta.url))
      const PARSER_SRC = fileURLToPath(new URL('../../../packages/shared/src/score-sheet-parser.js', import.meta.url))
      const SCORE_TABLES_SRC = fileURLToPath(new URL('../../../packages/shared/data/score-tables/index.js', import.meta.url))
      const { scoreSession } = await import(pathToFileURL(ANALYZER_SRC + '/index.js').href)
      const llmConfig = { apiUrl: process.env.LLM_API_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', apiKey: LLM_API_KEY, model: process.env.LLM_MODEL || 'qwen-plus' }

      // project ID → template type 映射（服务端兜底加载评分表）
      const stationTypeMap = {
        historyTaking: 'history',
        physicalExam: 'physical',
        preliminaryDiag: 'analysis',
        humanity: 'communication',
        medicalRecord: 'medical_record',
        mentalExam: 'psychiatry-history'
      }

      // 服务端兜底：加载并解析评分表模板
      async function ensureParsedSheet(st, caseInfo) {
        if (st.parsedSheet && st.parsedSheet.length > 0) return st.parsedSheet
        const firstProjectId = (st.projects && st.projects.length > 0) ? st.projects[0] : null
        if (!firstProjectId) return null
        const templateType = stationTypeMap[firstProjectId]
        if (!templateType) return null
        try {
          const { getTemplateByType } = await import(pathToFileURL(SCORE_TABLES_SRC).href)
          const { parseScoreSheet } = await import(pathToFileURL(PARSER_SRC).href)
          const template = getTemplateByType(templateType)
          if (!template) return null
          let templateItems = template.items || template.scoring_items || []
          if (typeof templateItems === 'function') templateItems = templateItems()
          const sheet = await parseScoreSheet({
            basicData: caseInfo || { case_id: caseId },
            templateItems,
            specialty: (caseInfo || {}).specialty || '',
            llmConfig
          })
          console.log(`[sp-api] settle: 服务端兜底解析评分表 (${firstProjectId}/${templateType}) → ${sheet.length} 项`)
          return sheet
        } catch (e) {
          console.warn(`[sp-api] settle: 兜底解析评分表失败 (${firstProjectId}):`, e.message)
          return null
        }
      }

      // 收集所有有数据的考站进行评分
      const stationResults = []
      let totalScore = 0, totalMax = 0

      const stations = body.stations || []
      // 分离需要 AI 评分的站和无数据/无评分表的站
      const scoreTasks = []
      const noScoreResults = []
      for (const st of stations) {
        // 服务端兜底：如果前端未传入 parsedSheet，从模板加载
        if (st.hasData) {
          const sheet = await ensureParsedSheet(st, caseInfo)
          if (sheet && sheet.length > 0) {
            st.parsedSheet = sheet
          }
        }
        if (st.hasData && st.parsedSheet && st.parsedSheet.length > 0) {
          scoreTasks.push((async () => {
            try {
              const scoring = await scoreSession({
                parsedSheet: st.parsedSheet,
                allRecords: st.records || {},
                records: st.records || {},
                caseInfo: caseInfo || { case_id: caseId },
                stationType: st.stationType || st.stationId
              }, llmConfig)
              st._scoring = scoring
              const hasLimitations = scoring.data_limitations?.narrative && scoring.data_limitations.narrative.trim()
              return { stationId: st.stationId, stationName: st.stationName, score: scoring.total_score || 0, maxScore: scoring.total_max || 0, scored: true, dataLimitations: hasLimitations ? scoring.data_limitations : null, _scoring: scoring }
            } catch (e) {
              console.error(`[sp-api] settle: score ${st.stationId} failed:`, e.message)
              return { stationId: st.stationId, stationName: st.stationName, score: 0, maxScore: st.parsedSheet?.reduce((s, i) => s + (i.max_score || 0), 0) || 0, scored: false, error: e.message, _scoring: null }
            }
          })())
        } else if (st.hasData) {
          noScoreResults.push({ stationId: st.stationId, stationName: st.stationName, score: 0, maxScore: 0, scored: false, dataInsufficient: true, insufficientReason: st.parsedSheet && st.parsedSheet.length === 0 ? '评分表为空，无法评分' : '缺少评分表，无法评分' })
        } else {
          noScoreResults.push({ stationId: st.stationId, stationName: st.stationName, score: 0, maxScore: 0, scored: false })
        }
      }

      // 并行执行所有评分任务
      const scoredResults = scoreTasks.length > 0 ? await Promise.allSettled(scoreTasks).then(results =>
        results.map(r => r.status === 'fulfilled' ? r.value : { stationId: 'unknown', stationName: 'unknown', score: 0, maxScore: 0, scored: false, error: 'Task rejected' })
      ) : []

      // 合并且计算总览
      for (const r of scoredResults) {
        stationResults.push(r)
        totalScore += r.score || 0
        totalMax += r.maxScore || 0
      }
      stationResults.push(...noScoreResults)

      // 保存结算报告 — sessionEpoch 标识本次训练
      const se = sessionEpoch || settleKey || Date.now().toString()
      const reportDir = join(REPORTS_DIR, caseId)
      mkdirSync(reportDir, { recursive: true })

      // ── Part B: 逐站剖面分析（支持考站内多个考核项目）──
      // STATION_TO_PROFILE_TYPE / PROFILE_CONFIG_MAP 来自共享常量
      // profileReports: keyed by profileType for Part C/D/A integration (first station wins)
      // stationProfileMap: keyed by stationId for per-station profile assignment

      const profileReports = {}
      const stationProfileMap = {}
      let integration = null, stage = null, navigation = null

      for (const st of stations) {
        if (!st.hasData) continue
        // 考站可包含多个考核项目，每个项目用对应的剖面分析器
        const projectIds = (st.projects && st.projects.length > 0) ? st.projects : [st.stationId]
        for (const projectId of projectIds) {
          const profileType = STATION_TO_PROFILE_TYPE[projectId]
          const profileConfig = PROFILE_CONFIG_MAP[projectId]
          if (!profileType || !profileConfig) continue
          // 同类型已分析过则跳过（profileReports 用于跨剖面整合，仅需每种类型一次）
          // 但每个考站仍需独立记录 → 使用 stationProfileMap
          const alreadyAnalyzed = !!profileReports[profileType]

          try {
            const analyzer = await import(pathToFileURL(ANALYZER_SRC + '/index.js').href)
            const profileFn = analyzer[profileConfig.fn]
            if (!profileFn) continue

            let profileParams
            if (profileConfig.useText) {
              profileParams = { caseInfo: caseInfo || { case_id: caseId }, recordText: st.records?.record_text || '' }
            } else if (profileConfig.useExam) {
              profileParams = { caseInfo: caseInfo || { case_id: caseId }, examRecords: st.records?.exam || st.records || [] }
            } else {
              profileParams = { caseInfo: caseInfo || { case_id: caseId }, dialogRecords: st.records?.dialog || st.records || [] }
            }

            if (alreadyAnalyzed) {
              // 复用已分析的结果（同 profileType 共享同一个剖面分析）
              stationProfileMap[st.stationId] = { profileType, profile: profileReports[profileType] }
            } else {
              const profile = await profileFn(profileParams, llmConfig)
              if (profile) {
                profileReports[profileType] = profile
                stationProfileMap[st.stationId] = { profileType, profile }
              }
            }
          } catch (e) {
            console.warn(`[sp-api] settle: 剖面分析失败 (${st.stationId}/${projectId}):`, e.message)
          }
        }
      }

      // ── Part C/D/A: 跨剖面整合（≥2个剖面时运行）──
      if (Object.keys(profileReports).length >= 2) {
        try {
          const { analyzeComprehensive } = await import(pathToFileURL(ANALYZER_SRC + '/index.js').href)
          const traineeContext = {
            phase: (caseInfo || {}).training_phase || '',
            specialty: (caseInfo || {}).specialty || '',
            difficulty: (caseInfo || {}).difficulty || ''
          }
          const comprehensive = await analyzeComprehensive({
            profileReports,
            scoringSummary: { total_score: totalScore, total_max: totalMax, pass_fail: totalMax > 0 ? (totalScore >= totalMax * 0.6 ? '通过' : '未通过') : '无数据' },
            caseInfo: caseInfo || { case_id: caseId },
            traineeContext
          }, llmConfig)
          integration = comprehensive.integration
          stage = comprehensive.stage
          navigation = comprehensive.navigation
          console.log(`[sp-api] settle: Part C/D/A 整合完成 (${Object.keys(profileReports).length}个剖面)`)
        } catch (e) {
          console.warn('[sp-api] settle: Part C/D/A 整合失败:', e.message)
        }
      }

      // ── 构建 stationDetails（供训练端 ScoreReport 直接展示详细评分）──
      const stationDetails = {}
      for (const st of stations) {
        if (!st.hasData || !st._scoring) continue
        // st.stationId 现在是中文考站名（如"接诊病人站"），需通过 projects[0] 查找 profile
        const firstProjectId = (st.projects && st.projects.length > 0) ? st.projects[0] : st.stationId
        const profileType = STATION_TO_PROFILE_TYPE[firstProjectId]
        // 优先使用该考站自己的分析结果，回退到同类型共享结果
        const stProfile = stationProfileMap[st.stationId]
        const stationProfile = stProfile ? stProfile.profile : profileReports[profileType] || null
        // 收集该考站所有项目的 profile
        const stationProfiles = {}
        for (const pid of (st.projects || [])) {
          const pt = STATION_TO_PROFILE_TYPE[pid]
          if (pt && profileReports[pt]) stationProfiles[pt] = profileReports[pt]
        }
        stationDetails[st.stationId] = {
          scoring: st._scoring,
          profile: stationProfile,
          profiles: stationProfiles,
          parsedSheet: st.parsedSheet || []
        }
      }

      const reportPath = join(reportDir, `settle_${se}.json`)
      const report = {
        caseId,
        timestamp: new Date().toISOString(),
        settled: true,
        totalScore,
        totalMax,
        passFail: totalMax > 0 ? (totalScore >= totalMax * 0.6 ? 'pass' : 'fail') : 'no_data',
        stations: stationResults,
        stationDetails,
        profileReports,
        integration,
        stage,
        navigation
      }
      try {
        writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8')
      } catch (e) {
        console.error('[sp-api] settle: save report failed:', e.message)
      }

      // ── 保存单站报告文件（用 settleKey 命名，确定性匹配记录）──
      for (const st of stations) {
        if (!st.hasData || !st._scoring) continue
        const firstProjectId = (st.projects && st.projects.length > 0) ? st.projects[0] : st.stationId
        const profileType = STATION_TO_PROFILE_TYPE[firstProjectId]
        const stProfile = stationProfileMap[st.stationId]
        const stationProfile = stProfile ? stProfile.profile : null
        // 收集该考站所有项目的 profile
        const stationProfiles = {}
        for (const pid of (st.projects || [])) {
          const pt = STATION_TO_PROFILE_TYPE[pid]
          if (pt && profileReports[pt]) stationProfiles[pt] = profileReports[pt]
        }
        const stationReport = {
          caseId,
          stationType: st.stationId,
          stationName: st.stationName || st.stationId,
          profileType,
          sessionEpoch: se,
          timestamp: new Date().toISOString(),
          scoring: st._scoring,
          caseInfo: caseInfo || { case_id: caseId },
          templateSheet: st.parsedSheet || [],
          profile: stationProfile,
          profiles: stationProfiles,
          profileReports,
          integration,
          stage,
          navigation
        }
        const stationPath = join(reportDir, `${se}_${st.stationId}.json`)
        // 同时用 stationId_settleKey 命名，方便精确查找（epoch 匹配）
        try {
          writeFileSync(stationPath, JSON.stringify(stationReport, null, 2), 'utf-8')
          console.log(`[sp-api] settle: 单站报告 → ${stationPath}`)
        } catch (e) {
          console.error(`[sp-api] settle: 单站报告保存失败 (${st.stationId}):`, e.message)
        }
      }

      return json(res, 200, { ok: true, data: report })
    } catch (e) {
      console.error('[sp-api] training/settle error:', e.message)
      return json(res, 500, { ok: false, error: e.message })
    }
  }

  // GET /api/training/enriched-records — 富化训练记录（含病例元数据 + 报告匹配）
  if (req.method === 'GET' && req.url.split('?')[0] === '/api/training/enriched-records') {
    try {
      const recordsObj = loadTrainingRecordsFromDir()
      // 展开 _stationIds 合并记录：每个考站独立为一条
      const expandedRecords = []
      for (const [key, val] of Object.entries(recordsObj)) {
        expandedRecords.push({ key, ...val })
        // 全流程模式下的合并记录：_stationIds 包含多个考站时，为额外的考站创建独立条目
        // 但跳过与主 stationId 属于同一考站的项目（如 historyTaking + mentalExam 同属接诊病人站）
        const extraIds = (val._stationIds || []).filter(id => {
          if (id === val.stationId) return false
          for (const ids of Object.values(STATION_LABEL_TO_IDS)) {
            if (ids.includes(id) && ids.includes(val.stationId)) return false
          }
          return true
        })
        for (const extraId of extraIds) {
          const sessionKey = STATION_TO_SESSION_KEY[extraId]
          const subData = sessionKey ? (val.rawData || {})[sessionKey] : null
          expandedRecords.push({
            key: key + '__' + extraId,
            caseId: val.caseId,
            stationId: extraId,
            stationName: getStationLabel(extraId),
            duration: (subData && subData.duration) || 0,
            score: val.score || 0,
            recordedAt: val.recordedAt || val.time || '',
            sessionEpoch: val.sessionEpoch,
            trainingVersion: val.trainingVersion,
            _expandedFrom: key,
          })
        }
      }
      const records = expandedRecords

      // 加载病例索引
      let caseIndex = []
      const caseIndexPath = join(PROJECT_ROOT, 'dist', 'data', 'cases', 'cases-index.json')
      if (existsSync(caseIndexPath)) {
        caseIndex = JSON.parse(readFileSync(caseIndexPath, 'utf-8'))
      }

      // 使用共享常量 STATION_ID_TO_LABEL / STATION_LABEL_TO_IDS

      // 富化每条记录 — 用记录 key 中的 epoch 精确匹配报告文件名
      const enriched = records.map(r => {
        const caseMeta = caseIndex.find(c => (c.case_id || c.id) === r.caseId)
        const stationLabel = getStationLabel(r.stationId) || r.stationName || '未知'
        let rep = null
        // 从记录 sessionEpoch + 考站名匹配报告文件: {sessionEpoch}_{stationName}.json
        const epochForLookup = r.sessionEpoch
        if (epochForLookup) {
          const reportDirForCase = join(REPORTS_DIR, r.caseId)
          if (existsSync(reportDirForCase)) {
            const prefixes = getReportLookupPrefixes(r.stationId)
            for (const pfx of prefixes) {
              const directPath = join(reportDirForCase, `${epochForLookup}_${pfx}.json`)
              if (existsSync(directPath)) {
                try {
                  const reportData = JSON.parse(readFileSync(directPath, 'utf-8'))
                  rep = {
                    caseId: r.caseId, stationType: r.stationId,
                    fileName: `${epochForLookup}_${pfx}.json`,
                    timestamp: reportData.timestamp || '',
                    path: directPath,
                    score: reportData?.scoring?.total_score ?? 0
                  }
                } catch (_) { /* skip */ }
                break
              }
            }
          }
        }
        const hasReport = !!rep
        return {
          key: r.key,
          caseId: r.caseId,
          stationId: r.stationId,
          stationLabel,
          duration: r.duration || 0,
          score: (hasReport && rep?.score > 0) ? rep.score : (typeof r.score === 'number' ? r.score : (r.score || 0)),
          recordedAt: r.recordedAt || r.time || '',
          caseTitle: caseMeta?.title || caseMeta?.disease || '',
          specialty: caseMeta?.specialty || '',
          disease: caseMeta?.disease || '',
          patientName: caseMeta?.patient_name || '',
          patientGender: caseMeta?.patient_gender || '',
          patientAge: caseMeta?.patient_age || '',
          hasReport,
          reportTimestamp: hasReport && rep ? rep.timestamp : null
        }
      })

      // 按时间倒序
      enriched.sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())

      // ── 按考站合并：同一 caseId + 同一考站 的记录合并为一条 ──
      // 先预分组：同一 sessionEpoch 内，不同项目但同属多项目考站的记录归入同一组
      const merged = []
      const mergedKeys = new Set()
      const seenEpochGroups = new Map() // `${caseId}_${sessionEpoch}` → mergedIndex

      for (const r of enriched) {
        let groupKey = `${r.caseId}_${r.stationLabel}`
        let existing = mergedKeys.has(groupKey)
          ? merged.find(m => m.caseId === r.caseId && m.stationLabel === r.stationLabel)
          : null

        // 同一 sessionEpoch 内，检查是否属于同一多项目考站
        if (!existing && r.sessionEpoch) {
          const epochKey = `${r.caseId}_${r.sessionEpoch}`
          const siblingIdx = seenEpochGroups.get(epochKey)
          if (siblingIdx != null) {
            const sibling = merged[siblingIdx]
            // 检查当前记录与已存在的同 session 记录是否属于同一多项目考站
            for (const [stLabel, ids] of Object.entries(STATION_LABEL_TO_IDS)) {
              if (ids.length <= 1) continue
              if (ids.includes(r.stationId) && sibling._projectIds?.some(pid => ids.includes(pid))) {
                existing = sibling
                groupKey = `${r.caseId}_${stLabel}`
                break
              }
            }
          }
        }

        // 非同一 session，按 stationLabel 回溯查找多项目考站
        if (!existing) {
          for (const [stLabel, ids] of Object.entries(STATION_LABEL_TO_IDS)) {
            if (ids.length <= 1 || !ids.includes(r.stationId)) continue
            const altKey = `${r.caseId}_${stLabel}`
            if (mergedKeys.has(altKey)) {
              existing = merged.find(m => m.caseId === r.caseId && m.stationLabel === stLabel)
              if (existing) { groupKey = altKey; break }
            }
          }
        }

        if (existing) {
          existing.duration += r.duration
          if (r.score > existing.score) existing.score = r.score
          if (new Date(r.recordedAt).getTime() > new Date(existing.recordedAt).getTime()) {
            existing.recordedAt = r.recordedAt
          }
          if (r.hasReport) {
            existing.hasReport = true
            if (!existing.reportTimestamp || (r.reportTimestamp && new Date(r.reportTimestamp).getTime() > new Date(existing.reportTimestamp).getTime())) {
              existing.reportTimestamp = r.reportTimestamp
            }
          }
          if (!existing._projectIds) existing._projectIds = [existing.stationId]
          if (!existing._projectIds.includes(r.stationId)) existing._projectIds.push(r.stationId)
          // 如果合并键是考站名（多项目站），更新 label 为考站名
          for (const [stLabel, ids] of Object.entries(STATION_LABEL_TO_IDS)) {
            if (ids.length > 1 && groupKey === `${r.caseId}_${stLabel}`) {
              existing.stationLabel = stLabel
              break
            }
          }
        } else {
          const idx = merged.length
          mergedKeys.add(groupKey)
          // 注册多项目考站的备选键：如果 stationId 属于多项目考站，也注册该站名
          // 确保后续同站其他项目记录能通过 altKey 找到此记录
          for (const [stLabel, ids] of Object.entries(STATION_LABEL_TO_IDS)) {
            if (ids.length > 1 && ids.includes(r.stationId)) {
              mergedKeys.add(`${r.caseId}_${stLabel}`)
            }
          }
          merged.push({ ...r, _projectIds: [r.stationId] })
          if (r.sessionEpoch) {
            seenEpochGroups.set(`${r.caseId}_${r.sessionEpoch}`, idx)
          }
        }
      }

      // 统计（基于合并后的考站记录）
      const totalRecords = merged.length
      const scores = merged.filter(r => r.score > 0).map(r => r.score)
      const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 10) / 10 : 0
      const passCount = merged.filter(r => r.score >= 60).length
      const passRate = totalRecords > 0 ? Math.round(passCount / totalRecords * 100) : 0
      const durations = merged.filter(r => r.duration > 0).map(r => r.duration)
      const avgDuration = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0

      return json(res, 200, {
        ok: true,
        data: merged,
        stats: { totalRecords, avgScore, passRate, avgDuration }
      })
    } catch (e) {
      console.error('[sp-api] enriched-records error:', e.message)
      return json(res, 500, { ok: false, error: e.message })
    }
  }

  // GET /api/training/report — 读取指定成绩报告
  if (req.method === 'GET' && req.url.split('?')[0] === '/api/training/report') {
    try {
      const urlParams = new URLSearchParams(req.url.split('?')[1] || '')
      const caseId = sanitizeId(urlParams.get('caseId'))
      const stationType = sanitizeId(urlParams.get('stationType'))
      const sessionEpoch = urlParams.get('sessionEpoch')
      if (!caseId || !stationType) return json(res, 400, { ok: false, error: 'Missing caseId or stationType' })

      const reportDir = join(REPORTS_DIR, caseId)
      if (!existsSync(reportDir)) return json(res, 404, { ok: false, error: 'Report directory not found' })

      // stationType 可能是项目ID或考站名，构建查找前缀列表
      const lookupPrefixes = getReportLookupPrefixes(stationType)

      // 精确匹配：sessionEpoch 前缀 + 考站名后缀 = {epoch}_{stationName}.json
      if (sessionEpoch) {
        for (const pfx of lookupPrefixes) {
          const directPath = join(reportDir, `${sessionEpoch}_${pfx}.json`)
          if (existsSync(directPath)) {
            return json(res, 200, { ok: true, data: JSON.parse(readFileSync(directPath, 'utf-8')) })
          }
        }
        return json(res, 404, { ok: false, error: 'No report found for this training session' })
      }

      // 无 sessionEpoch 时返回 404
      return json(res, 404, { ok: false, error: 'Missing sessionEpoch' })
    } catch (e) {
      console.error('[sp-api] training/report error:', e.message)
      return json(res, 500, { ok: false, error: e.message })
    }
  }

  // POST /api/training/regenerate — 重新生成成绩报告（使用最新系统）
  if (req.method === 'POST' && req.url.split('?')[0] === '/api/training/regenerate') {
    if (!LLM_API_KEY) return json(res, 503, { ok: false, error: 'LLM API key not configured' })
    try {
      const body = await parseBody(req)
      const { caseId: rawCaseId, stationId: rawStationId, recordedAt, settleKey: bodySettleKey, sessionEpoch: reqSessionEpoch } = body
      const caseId = sanitizeId(rawCaseId)
      const stationId = sanitizeId(rawStationId)
      if (!caseId || !stationId) return json(res, 400, { ok: false, error: 'Missing caseId or stationId' })
      const reportDir = join(REPORTS_DIR, caseId)

      const llmConfig = {
        apiUrl: process.env.LLM_API_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
        apiKey: LLM_API_KEY,
        model: process.env.LLM_MODEL || 'qwen-plus'
      }

      const ANALYZER_SRC = fileURLToPath(new URL('../../score-analyzer/src', import.meta.url))
      const PARSER_SRC = fileURLToPath(new URL('../../../packages/shared/src/score-sheet-parser.js', import.meta.url))
      const SCORE_TABLES_SRC = fileURLToPath(new URL('../../../packages/shared/data/score-tables/index.js', import.meta.url))

      // ── 数据恢复（优先级：session 文件 > 旧报告 inputData > 训练日志）──
      let dialogRecords = []
      let examRecords = []
      let qaRecords = []
      let freeTextRecords = []

      // ── 1. 主路径：从训练会话文件恢复（{caseId}/{sessionEpoch}.json）──
      const seForLookup = reqSessionEpoch || ''
      if (seForLookup) {
        const sessionFile = join(TRAINING_SESSIONS_DIR, caseId, `${seForLookup}.json`)
        if (existsSync(sessionFile)) {
          try {
            const sessionPayload = JSON.parse(readFileSync(sessionFile, 'utf-8'))
            const sd = sessionPayload.sessionData || {}
            const htMsgs = sd.historyTaking?.messages || []
            const hcMsgs = sd.humanisticComm?.messages || []
            const meMsgs = sd.mentalExam?.messages || []
            dialogRecords = [...htMsgs, ...hcMsgs, ...meMsgs]
            examRecords = sd.physicalExam?.messages || []
            if (sd.caseAnalysis?.answers?.length) {
              const qs = sd.caseAnalysis.questions || []
              const as = sd.caseAnalysis.answers || []
              qaRecords = qs.map((q, i) => ({ question: q, answer: as[i] || '' }))
            }
            if (sd.preliminaryDiag) {
              const pd = sd.preliminaryDiag
              const parts = []
              if (pd.preliminary) parts.push(`初步诊断: ${pd.preliminary}`)
              if (pd.differential) parts.push(`鉴别诊断: ${pd.differential}`)
              if (pd.basis) parts.push(`诊断依据: ${pd.basis}`)
              if (parts.length) freeTextRecords.push({ label: '初步诊断与鉴别诊断', content: parts.join('\n') })
            }
            if (sd.treatmentPlan?.content) {
              freeTextRecords.push({ label: '治疗计划', content: sd.treatmentPlan.content })
            }
            if (typeof sd.medicalRecord === 'string' && sd.medicalRecord.trim()) {
              freeTextRecords.push({ label: '病历书写', content: sd.medicalRecord })
            }
            console.log(`[sp-api] regenerate: 从会话文件恢复 (${dialogRecords.length}对话 ${examRecords.length}操作 ${qaRecords.length}问答 ${freeTextRecords.length}文本)`)
          } catch (e) {
            console.warn('[sp-api] regenerate: 读取会话文件失败:', e.message)
          }
        }
      }

      // ── 2. 回退：从旧格式报告的 inputData 恢复（向后兼容）──
      if (!dialogRecords.length && !examRecords.length && !qaRecords.length && !freeTextRecords.length) {
        if (existsSync(reportDir) && recordedAt) {
          const { readdirSync: rdSync } = await import('fs')
          const files = rdSync(reportDir)
          const searchPrefixes = getReportLookupPrefixes(stationId)
          let matching = []
          for (const pfx of searchPrefixes) {
            matching = files.filter(f => f.startsWith(pfx + '_') && f.endsWith('.json')).sort()
            if (matching.length > 0) break
          }
          for (const f of matching.reverse()) {
            try {
              const existing = JSON.parse(readFileSync(join(reportDir, f), 'utf-8'))
              const idRecs = existing.inputData?.allRecords || existing.inputData?.records
              if (idRecs) {
                if (Array.isArray(idRecs)) {
                  dialogRecords = idRecs
                } else {
                  dialogRecords = idRecs.dialog || idRecs.records || []
                  examRecords = idRecs.exam || []
                  qaRecords = idRecs.qa || []
                  freeTextRecords = idRecs.freeText || []
                }
                console.log(`[sp-api] regenerate: 从旧报告 inputData 恢复 (${dialogRecords.length}对话 ${examRecords.length}操作 ${qaRecords.length}问答 ${freeTextRecords.length}文本)`)
                break
              }
            } catch {}
          }
        }
      }

      // ── 3. 回退：从训练日志恢复（向后兼容）──
      if (!dialogRecords.length && !examRecords.length && !qaRecords.length && !freeTextRecords.length) {
        const logsDir = join(PROJECT_ROOT, 'apps', 'training', 'public', 'logs')
        if (existsSync(logsDir)) {
          const { readdirSync: rdSync } = await import('fs')
          const logFiles = rdSync(logsDir).filter(f => f.endsWith('.json')).sort().reverse()
          const recordTime = recordedAt ? new Date(recordedAt).getTime() : Date.now()
          let bestLog = null, bestDiff = Infinity

          for (const lf of logFiles) {
            try {
              const log = JSON.parse(readFileSync(join(logsDir, lf), 'utf-8'))
              if (log.caseId !== caseId) continue
              if (!log.rounds?.length) continue
              const logTime = new Date(log.savedAt).getTime()
              const diff = Math.abs(logTime - recordTime)
              if (diff < bestDiff && diff < 3600000) {
                bestDiff = diff
                bestLog = log
              }
            } catch {}
          }

          if (bestLog && bestLog.rounds?.length) {
            dialogRecords = bestLog.rounds.map(r => [
              { round: r.round, speaker: 'student', content: r.student || '' },
              { round: r.round, speaker: 'sp', content: r.sp || '' }
            ]).flat().filter(d => d.content)
            console.log(`[sp-api] regenerate: 从训练日志恢复 (${dialogRecords.length} 条对话, 差异${bestDiff}ms)`)
          }
        }
      }

      if (!dialogRecords.length && !examRecords.length && !qaRecords.length && !freeTextRecords.length) {
        return json(res, 404, { ok: false, error: '原始训练数据未找到，无法重新生成。请确认训练日志或已有报告仍存在。' })
      }

      // ── 3. 加载病例数据 ──
      const casesDir = join(PROJECT_ROOT, 'apps', 'admin', 'public', 'data', 'cases')
      const basicPath = join(casesDir, `${caseId}-basic.json`)
      let caseInfo = { case_id: caseId }
      if (existsSync(basicPath)) {
        const basicData = JSON.parse(readFileSync(basicPath, 'utf-8'))
        caseInfo = {
          case_id: caseId,
          title: basicData.title || '',
          disease: basicData.disease || '',
          specialty: basicData.specialty || '',
          training_phase: basicData.training_phase || '',
          difficulty: basicData.difficulty || '',
          patient_info: basicData.patient_info || {}
        }
      }

      // ── 4. 加载评分表模板并解析 ──
      const { getTemplateByType } = await import(pathToFileURL(SCORE_TABLES_SRC).href)
      const { parseScoreSheet } = await import(pathToFileURL(PARSER_SRC).href)

      // stationId → template type 映射
      const stationTypeMap = {
        historyTaking: 'history',
        physicalExam: 'physical',
        preliminaryDiag: 'analysis',
        humanity: 'communication',
        medicalRecord: 'medical_record',
        mentalExam: 'psychiatry-history'
      }
      const templateType = stationTypeMap[stationId] || stationId
      const template = getTemplateByType(templateType)
      if (!template) return json(res, 500, { ok: false, error: `评分表模板未找到: ${templateType}` })

      let templateItems = template.items || template.scoring_items || []
      if (typeof templateItems === 'function') templateItems = templateItems()

      const parsedSheet = await parseScoreSheet({
        basicData: caseInfo,
        templateItems,
        specialty: caseInfo.specialty || '',
        llmConfig
      })

      // ── 5. 构造 allRecords（模拟训练端格式） ──
      const allRecords = {
        dialog: dialogRecords,
        exam: examRecords,
        qa: qaRecords,
        freeText: freeTextRecords
      }

      // ── 6. 评分 ──
      const { scoreSession } = await import(pathToFileURL(ANALYZER_SRC + '/index.js').href)
      const scoring = await scoreSession({
        parsedSheet,
        allRecords,
        records: dialogRecords,
        caseInfo,
        stationType: stationId
      }, llmConfig)

      // ── 7. 剖面分析 ──
      let profile = null
      const profileConfig = PROFILE_CONFIG_MAP[stationId]
      if (profileConfig) {
        try {
          const analyzer = await import(pathToFileURL(ANALYZER_SRC + '/index.js').href)
          const profileFn = analyzer[profileConfig.fn]
          if (profileFn) {
            let profileParams
            if (profileConfig.useText) {
              profileParams = { caseInfo, recordText: allRecords.record_text || '' }
            } else if (profileConfig.useExam) {
              profileParams = { caseInfo, examRecords }
            } else {
              profileParams = { caseInfo, dialogRecords }
            }
            profile = await profileFn(profileParams, llmConfig)
          }
        } catch (e) {
          console.warn(`[sp-api] regenerate: 剖面分析失败 (${stationId}):`, e.message)
        }
      }

      // ── 8. 收集同病例其他考站的剖面报告 (用于 Part C 跨剖面整合) ──
      // STATION_TO_PROFILE_TYPE 来自共享常量
      const currentProfileType = getProfileType(stationId)

      let integration = null
      let stage = null
      let navigation = null
      let profileReports = {}
      if (profile) profileReports[currentProfileType] = profile

      try {
        if (existsSync(reportDir)) {
          const { readdirSync: rdSync } = await import('fs')
          const files = rdSync(reportDir).filter(f => f.endsWith('.json')).sort().reverse()
          const loadedTypes = new Set([currentProfileType])

          for (const f of files) {
            if (Object.keys(profileReports).length >= 6) break // 最多6个剖面
            try {
              const existing = JSON.parse(readFileSync(join(reportDir, f), 'utf-8'))
              const rawType = existing.stationType
              // rawType 可能是项目ID或中文考站名，统一翻译为 profile type
              let pt = STATION_TO_PROFILE_TYPE[rawType]
              if (!pt) {
                for (const [en, zh] of Object.entries(STATION_ID_TO_LABEL)) {
                  if (zh === rawType) { pt = STATION_TO_PROFILE_TYPE[en]; break }
                }
              }
              pt = pt || rawType
              // 从单剖面报告收集 (regenerate 保存的旧格式)
              if (pt && !loadedTypes.has(pt) && existing.profile) {
                profileReports[pt] = existing.profile
                loadedTypes.add(pt)
              }
              // 从 station-level 报告的 profiles 字段收集
              if (existing.profiles) {
                for (const [ptKey, ptReport] of Object.entries(existing.profiles)) {
                  const normalizedPt = STATION_TO_PROFILE_TYPE[ptKey] || ptKey
                  if (!loadedTypes.has(normalizedPt) && ptReport) {
                    profileReports[normalizedPt] = ptReport
                    loadedTypes.add(normalizedPt)
                  }
                }
              }
              // 从结算报告收集 (settle 保存的 profileReports 格式)
              if (existing.profileReports) {
                for (const [ptKey, ptReport] of Object.entries(existing.profileReports)) {
                  const normalizedPt = STATION_TO_PROFILE_TYPE[ptKey] || ptKey
                  if (!loadedTypes.has(normalizedPt) && ptReport) {
                    profileReports[normalizedPt] = ptReport
                    loadedTypes.add(normalizedPt)
                  }
                }
              }
            } catch {}
          }
        }
      } catch (e) {
        console.warn('[sp-api] regenerate: 收集其他剖面失败:', e.message)
      }

      // ── 9. Part C/D/A 跨剖面整合（≥2个剖面时运行）──
      if (Object.keys(profileReports).length >= 2) {
        try {
          const { analyzeComprehensive } = await import(pathToFileURL(ANALYZER_SRC + '/index.js').href)
          const traineeContext = {
            phase: caseInfo.training_phase || '',
            specialty: caseInfo.specialty || '',
            difficulty: caseInfo.difficulty || ''
          }
          const comprehensive = await analyzeComprehensive({
            profileReports,
            scoringSummary: {
              total_score: scoring?.total_score || 0,
              total_max: scoring?.total_max || 0,
              pass_fail: (scoring?.total_max > 0) ? ((scoring?.total_score || 0) >= scoring.total_max * 0.6 ? '通过' : '未通过') : '无数据'
            },
            caseInfo,
            traineeContext
          }, llmConfig)
          integration = comprehensive.integration
          stage = comprehensive.stage
          navigation = comprehensive.navigation
          console.log(`[sp-api] regenerate: Part C/D/A 整合完成 (${Object.keys(profileReports).length}个剖面)`)
        } catch (e) {
          console.warn('[sp-api] regenerate: Part C/D/A 整合失败:', e.message)
        }
      }

      // ── 10. 保存新报告 ──
      const se = reqSessionEpoch || bodySettleKey
        || (recordedAt ? new Date(recordedAt).getTime().toString() : null)
        || Date.now().toString()
      mkdirSync(reportDir, { recursive: true })
      // 优先用多项目考站名（如 mentalExam ∈ 接诊病人站），确保查找时能匹配
      let stationName = getStationLabel(stationId)
      for (const [stLabel, ids] of Object.entries(STATION_LABEL_TO_IDS)) {
        if (ids.length > 1 && ids.includes(stationId)) { stationName = stLabel; break }
      }
      const reportPath = join(reportDir, `${se}_${stationName}.json`)
      const report = {
        caseId,
        stationType: stationName,
        profileType: currentProfileType,
        sessionEpoch: se,
        timestamp: new Date().toISOString(),
        scoring,
        caseInfo,
        templateSheet: parsedSheet,
        profile,
        profileReports,
        integration,
        stage,
        navigation
      }
      writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8')
      console.log(`[sp-api] regenerate: 新报告已保存 → ${reportPath}${integration ? ' (含Part C/D/A)' : ''}`)

      return json(res, 200, { ok: true, data: report })
    } catch (e) {
      console.error('[sp-api] regenerate error:', e.message)
      return json(res, 500, { ok: false, error: e.message })
    }
  }

  // 404
  json(res, 404, { ok: false, error: 'Not found' })
})

// ═══════════════════════════════════════════════════════════════
// 症状池结构化 + 体格检查命令（无状态辅助功能）
// ═══════════════════════════════════════════════════════════════

const STRUCTURING_PROMPT = `你是一个医疗数据标注助手。将患者/家属的自述文本转化为结构化"触发→回答"映射表。

规则：
1. 排除纯身份信息（姓名、年龄、职业、关系，如"我是XX的妈妈""这孩子今年X岁"）
2. 每个信息点拆为独立条目，格式：【触发关键词1/关键词2】1-2句口语回答
3. 主诉（最突出的症状）排第一，触发词标注"主诉"
4. 涉及具体疾病名称的（如"糖尿病""冠心病"），用模糊表达替代（如"老毛病""血糖毛病"）
5. 不添加原文没有的信息，不推断
6. 回答保持原文口语风格
7. 家属的情绪/担忧也保留为条目
8. 时间信息必须精确分离：起病时间用"时间/什么时候开始/多久了"标注；后续加重/恶化用"加重/最近变化"标注。两者触发词不能重叠，回答只含对应时间节点的信息
9. 每条回答必须是原子信息，不能捆绑

输出纯文本，每行一条，格式严格：
【触发词1/触发词2】回答内容`

async function buildSymptomPool(selfNarration) {
  if (!selfNarration) return ''
  try {
    const { content } = await callLLMDirect(
      [{ role: 'user', content: selfNarration }],
      STRUCTURING_PROMPT,
      0
    )
    return content.trim()
  } catch (e) {
    return buildSymptomPoolRegex(selfNarration)
  }
}

function localFuzzyMatch(command, templates) {
  if (!templates || templates.length === 0) return null
  const keywords = command.match(/[一-龥]{2,}|[a-zA-Z]+/g)
  if (!keywords || keywords.length === 0) return null
  const matched = []
  for (const t of templates) {
    const finding = (t.finding || t.result || '').toLowerCase()
    if (!finding) continue
    const hitCount = keywords.filter(kw => finding.includes(kw.toLowerCase())).length
    if (hitCount >= 1) matched.push({ template: t, hits: hitCount })
  }
  if (matched.length === 0) return null
  matched.sort((a, b) => b.hits - a.hits)
  const best = matched[0].template
  return JSON.stringify({
    results: [{ exam: best.exam || best.item || '检查', finding: best.finding || best.result }],
    unmatched: [],
    repeated: []
  })
}

async function processExamCommand(command, templates) {
  // 空模板 → 直接返回
  if (!templates || templates.length === 0) {
    return JSON.stringify({ results: [], unmatched: [command], repeated: [], note: '暂无可用检查模板。' })
  }

  // LLM 主路径：所有识别和反馈由 LLM 完成
  try {
    let prompt = loadPromptFile('0603-physical-exam.txt')
    prompt = prompt.replace('{{exam_templates}}', JSON.stringify(templates, null, 2))
    prompt = prompt.replace('{{exam_history}}', JSON.stringify([], null, 2))
    const { content } = await callLLMDirect(
      [{ role: 'user', content: `考生检查指令：${command}` }],
      prompt,
      1
    )
    JSON.parse(repairJSON(content))
    return content
  } catch (e) {
    // LLM 不可用 → 本地模糊兜底
    console.warn('[exam] LLM 失败，走本地兜底:', e.message)
    const local = localFuzzyMatch(command, templates)
    if (local) return local
    return JSON.stringify({ results: [], unmatched: [command], repeated: [], note: '检查数据暂无记录。' })
  }
}

// ═══════════════════════════════════════════════════════════════
// TTS WebSocket 代理 — 双协议支持
// ═══════════════════════════════════════════════════════════════

function isCosyVoice(model) {
  return model && model.startsWith('cosyvoice')
}

function uuid32() {
  const h = () => Math.floor(Math.random() * 0x10000).toString(16).padStart(4, '0')
  return `${h()}${h()}${h()}${h()}${h()}${h()}${h()}${h()}`
}

// ── Qwen-TTS 透明代理（现有逻辑） ──
function handleQwenTTS(clientWS, model) {
  const effectiveModel = model || ttsModel
  const dashWS = new WebSocket(
    `wss://dashscope.aliyuncs.com/api-ws/v1/realtime?model=${effectiveModel}`,
    { headers: { 'Authorization': `Bearer ${LLM_API_KEY}` } }
  )

  const queue = []

  clientWS.on('message', (data) => {
    const text = typeof data === 'string' ? data : data.toString()
    console.log('[TTS:qwen] client → dash', text.slice(0, 120))
    if (dashWS.readyState === WebSocket.OPEN) dashWS.send(text)
    else { queue.push(text); console.log('[TTS:qwen] queued (dashWS not open)') }
  })

  dashWS.on('open', () => {
    console.log('[TTS:qwen] dashWS open, queue length:', queue.length)
    dashWS.on('message', (data) => {
      const text = typeof data === 'string' ? data : data.toString()
      console.log('[TTS:qwen] dash → client', text.slice(0, 120))
      if (clientWS.readyState === WebSocket.OPEN) clientWS.send(text)
    })
    for (const msg of queue) { console.log('[TTS:qwen] flushing:', msg.slice(0, 120)); dashWS.send(msg) }
    queue.length = 0
  })

  dashWS.on('unexpected-response', (req, res) => {
    console.log('[TTS:qwen] dashWS rejected:', res.statusCode)
    clientWS.close(4500, `DashScope ${res.statusCode}`)
  })
  dashWS.on('error', (e) => { console.log('[TTS:qwen] dashWS error', e.message); try { clientWS.close(4500, e.message) } catch {} })
  clientWS.on('close', (code) => { console.log('[TTS:qwen] clientWS close', code); try { dashWS.close() } catch {} })
  dashWS.on('close', (code) => { console.log('[TTS:qwen] dashWS close', code); try { clientWS.close() } catch {} })
}

// ── CosyVoice 协议适配器 ──
function handleCosyVoiceTTS(clientWS, model) {
  const effectiveModel = model || ttsModel
  let dashWS = null
  let taskId = null
  let sessionConfig = null
  let textBuffer = ''
  let taskStarted = false
  let clientClosed = false
  let commitPending = false
  let dashClosingIntentionally = false

  function cleanupDash() {
    if (dashWS) {
      dashClosingIntentionally = true
      try { dashWS.close() } catch {}
      dashWS = null
    }
    taskStarted = false
    commitPending = false
  }

  function sendRunTask() {
    if (!sessionConfig || !dashWS || dashWS.readyState !== WebSocket.OPEN) return
    taskId = uuid32()
    const { voice, instructions, format, sample_rate, rate, pitch, volume } = sessionConfig
    const payload = {
      header: { action: 'run-task', task_id: taskId, streaming: 'duplex' },
      payload: {
        task_group: 'audio',
        task: 'tts',
        function: 'SpeechSynthesizer',
        model: effectiveModel,
        parameters: {
          text_type: 'PlainText',
          voice: voice || 'longanyang',
          format: format || 'pcm',
          sample_rate: sample_rate || 24000,
          volume: volume != null ? volume : 50,
          rate: rate != null ? rate : 1.0,
          pitch: pitch != null ? pitch : 1.0,
        },
        input: {}
      }
    }
    // _v3 音色不支持 instruction 参数（DashScope 返回 428），仅非 _v3 音色（如 longanyang）支持
    const isV3Voice = (voice || '').endsWith('_v3')
    if (instructions && !isV3Voice) payload.payload.parameters.instruction = instructions
    console.log('[TTS:cosy] run-task model:', payload.payload.model, 'voice:', payload.payload.parameters.voice, 'instr:', instructions?.slice(0, 80), 'rate:', rate, 'pitch:', pitch, 'vol:', volume)
    dashWS.send(JSON.stringify(payload))
  }

  function sendContinueTask(text) {
    if (!dashWS || dashWS.readyState !== WebSocket.OPEN || !taskId || !taskStarted) return
    console.log('[TTS:cosy] continue-task:', text.slice(0, 80))
    dashWS.send(JSON.stringify({
      header: { action: 'continue-task', task_id: taskId, streaming: 'duplex' },
      payload: { input: { text } }
    }))
  }

  function sendFinishTask() {
    if (!dashWS || dashWS.readyState !== WebSocket.OPEN || !taskId) return
    console.log('[TTS:cosy] finish-task')
    dashWS.send(JSON.stringify({
      header: { action: 'finish-task', task_id: taskId, streaming: 'duplex' },
      payload: { input: {} }
    }))
  }

  clientWS.on('message', (data) => {
    let msg
    try {
      msg = JSON.parse(typeof data === 'string' ? data : data.toString())
    } catch { return }

    if (msg.type === 'session.update') {
      // 关闭旧连接（如有重复 session.update）
      cleanupDash()
      textBuffer = ''

      sessionConfig = {
        voice: msg.session?.voice || 'longanyang',
        instructions: msg.session?.instructions || '',
        format: msg.session?.response_format || 'pcm',
        sample_rate: msg.session?.sample_rate || 24000,
        rate: msg.session?.rate,
        pitch: msg.session?.pitch,
        volume: msg.session?.volume,
      }
      console.log('[TTS:cosy] session.update received, connecting to CosyVoice...')

      // 建立 CosyVoice 连接
      dashWS = new WebSocket(
        'wss://dashscope.aliyuncs.com/api-ws/v1/inference',
        { headers: { 'Authorization': `Bearer ${LLM_API_KEY}` } }
      )

      dashWS.on('open', () => {
        console.log('[TTS:cosy] dashWS open, sending run-task')
        sendRunTask()
      })

      dashWS.on('message', (dashData, isBinary) => {
        if (isBinary) {
          // 二进制音频 → base64 → response.audio.delta
          const base64 = Buffer.from(dashData).toString('base64')
          if (clientWS.readyState === WebSocket.OPEN) {
            clientWS.send(JSON.stringify({ type: 'response.audio.delta', delta: base64 }))
          }
          return
        }

        let dashMsg
        try { dashMsg = JSON.parse(dashData.toString()) } catch { return }

        const action = dashMsg.header?.action || dashMsg.header?.event
        if (action === 'task-started') {
          taskStarted = true
          console.log('[TTS:cosy] task-started, notifying client')
          if (clientWS.readyState === WebSocket.OPEN) {
            clientWS.send(JSON.stringify({ type: 'session.updated' }))
          }
          // 处理积压的文本
          if (textBuffer) {
            sendContinueTask(textBuffer)
            textBuffer = ''
          }
          // 如果 commit 先于 task-started 到达，补发 finish-task
          if (commitPending) {
            commitPending = false
            sendFinishTask()
          }
        } else if (action === 'task-finished') {
          console.log('[TTS:cosy] task-finished')
          if (clientWS.readyState === WebSocket.OPEN) {
            clientWS.send(JSON.stringify({ type: 'response.audio.done' }))
          }
        } else if (action === 'task-failed') {
          console.log('[TTS:cosy] task-failed FULL:', JSON.stringify(dashMsg, null, 2).slice(0, 500))
          if (clientWS.readyState === WebSocket.OPEN) {
            clientWS.send(JSON.stringify({
              type: 'error',
              message: dashMsg.payload?.output?.message || dashMsg.payload?.error?.message || dashMsg.payload?.message || 'CosyVoice TTS task failed'
            }))
          }
        }
      })

      dashWS.on('unexpected-response', (req, res) => {
        console.log('[TTS:cosy] dashWS rejected:', res.statusCode)
        clientWS.close(4500, `CosyVoice ${res.statusCode}`)
      })
      dashWS.on('error', (e) => {
        console.log('[TTS:cosy] dashWS error', e.message)
        try { clientWS.close(4500, e.message) } catch {}
      })
      dashWS.on('close', (code) => {
        console.log('[TTS:cosy] dashWS close', code)
        taskStarted = false
        if (dashClosingIntentionally) {
          dashClosingIntentionally = false
        } else if (!clientClosed) {
          try { clientWS.close() } catch {}
        }
      })

      return
    }

    if (msg.type === 'input_text_buffer.append') {
      const text = msg.text || ''
      if (taskStarted) {
        sendContinueTask(text)
      } else {
        textBuffer += text
      }
      return
    }

    if (msg.type === 'input_text_buffer.commit') {
      if (dashWS && dashWS.readyState === WebSocket.OPEN && taskStarted) {
        sendFinishTask()
      } else {
        // commit 先于 task-started 到达，标记等待 task-started 后发送 finish
        commitPending = true
      }
      return
    }

    if (msg.type === 'session.finish') {
      if (dashWS && dashWS.readyState === WebSocket.OPEN) {
        sendFinishTask()
      }
      return
    }
  })

  clientWS.on('close', (code) => {
    clientClosed = true
    console.log('[TTS:cosy] clientWS close', code)
    cleanupDash()
  })
}

// ── 主入口 ──
const PORT = parseInt(process.env.PORT || '5100', 10)
const wss = new WebSocketServer({ server })

wss.on('connection', (clientWS, req) => {
  const urlPath = req.url?.split('?')[0] || ''
  if (urlPath !== '/api/sp/tts') {
    clientWS.close(4000, 'Not Found')
    return
  }

  if (!serviceEnabled) {
    clientWS.close(4503, '服务已关闭')
    return
  }

  // query param ?model=xxx 覆盖全局设置（供试听等场景独立指定模型）
  const urlParams = new URLSearchParams(req.url?.split('?')[1] || '')
  const connModel = urlParams.get('model') || ttsModel

  if (isCosyVoice(connModel)) {
    console.log(`[TTS] 使用 CosyVoice 协议 (模型: ${connModel})`)
    handleCosyVoiceTTS(clientWS, connModel)
  } else {
    console.log(`[TTS] 使用 Qwen-TTS 协议 (模型: ${connModel})`)
    handleQwenTTS(clientWS, connModel)
  }
})

// ── 启动 ──
migrateTrainingRecordsIfNeeded()
loadSessionsFromDisk().then(count => {
  console.log(`[sp-api] 磁盘恢复 ${count} 个会话`)
})
server.listen(PORT, () => {
  console.log(`[sp-api] 启动成功 → http://localhost:${PORT}`)
  console.log(`[sp-api] LLM模型: ${LLM_MODEL}`)
  console.log(`[sp-api] TTS模型: ${ttsModel}`)
  console.log(`[sp-api] 健康检查: http://localhost:${PORT}/api/sp/health`)
})
