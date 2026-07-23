// ═══════════════════════════════════════════════════════════════
// 会话管理器 — 创建/查询/销毁/过期清理
// 依赖注入：引擎和状态机工厂函数由调用方传入
// V2: 集成场景初始化器（分类LLM设定初始CM+阻尼器值）
// ═══════════════════════════════════════════════════════════════

import { randomUUID } from 'crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join, resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { LLM_MODEL } from './llm-client.js'
import { classifyScene } from './poc/scene-initializer.js'
import { initCM } from './poc/event-mapping.js'
import { createAngerDamper } from './poc/emotion-damper.js'
import { serializeMentalState, deserializeMentalState } from './mental-engine.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = resolve(__dirname, '..', '..', '..')
const DATA_DIR = join(PROJECT_ROOT, 'data')
const SESSIONS_PATH = join(DATA_DIR, 'sessions.json')

const SESSION_TTL = 30 * 60 * 1000 // 30 分钟

const sessions = new Map()

let _deps = null

/**
 * 初始化（注入引擎工厂依赖）
 * @param {object} deps
 * @param {Function} deps.derivePersonality
 * @param {Function} deps.createEmotionEngine
 * @param {Function} deps.createStateMachine
 */
export function initSessionStore(deps) {
  _deps = deps
}

function parseBaseline(baseline) {
  if (typeof baseline === 'string') {
    try { return JSON.parse(baseline) } catch { return {} }
  }
  return baseline || {}
}

function detectScene(config) {
  const multiplier = { anger: 1.0, fear: 1.0, sadness: 1.0, joy: 1.0 }
  const floor = {}
  const maxRise = {}
  let constrainDrop = ['anger', 'fear', 'sadness']
  const emotionFloor = { anger: 0, fear: 0, sadness: 0, joy: 0 }

  if (config.scene) {
    if (config.scene.multiplier) Object.assign(multiplier, config.scene.multiplier)
    if (config.scene.floor) Object.assign(floor, config.scene.floor)
    return { multiplier, floor, maxRise, constrainDrop, emotionFloor }
  }

  if (config.mode === 'mental-exam') {
    // 精神检查模式：不使用情感乘数/地板，情绪完全由 atypicConfig 驱动
    return { multiplier, floor, maxRise, constrainDrop: [], emotionFloor }
  }

  if (config.mode === 'humanistic-comm') {
    multiplier.anger = 0.6
    multiplier.fear = 0.7
    maxRise.anger = 1.0
    constrainDrop = ['anger']
    emotionFloor.fear = 3
    emotionFloor.sadness = 3
    return { multiplier, floor, maxRise, constrainDrop, emotionFloor }
  }

  const text = ((config.roleDescription || '') + (config.symptomPool || '')).toLowerCase()
  if (/疼|痛|剧痛|疼痛|绞痛|刺痛/.test(text)) {
    multiplier.anger = 1.3
    floor.anger = 2
  }

  return { multiplier, floor, maxRise, constrainDrop, emotionFloor }
}

/**
 * 创建会话（异步 —— 包含场景初始化LLM调用）
 * @param {object} config
 * @returns {Promise<object>}
 */
export async function createSession(config) {
  if (!_deps) throw new Error('session-store not initialized — call initSessionStore() first')

  const sid = randomUUID()
  const baseline = parseBaseline(config.emotionBaseline || {})
  const personality = _deps.derivePersonality(
    typeof config.emotionBaseline === 'string' ? config.emotionBaseline : '',
    config.roleDescription || '',
    config.personality || null
  )
  const scene = detectScene(config)
  const sceneConfig = { mode: config.mode || 'history-taking' }

  // ── 精神检查模式：跳过标准管线，不创建 engine/sm/cm/damper ──
  const isMentalExam = config.mode === 'mental-exam'

  let engine, sm, cm, damper, sceneInit

  if (isMentalExam) {
    engine = null
    sm = null
    cm = null
    damper = null
    sceneInit = null
  } else {
    // 旧引擎 + 状态机（向后兼容）
    engine = _deps.createEmotionEngine({ baseline, personality, scene, maxRise: scene.maxRise, constrainDrop: scene.constrainDrop, emotionFloor: scene.emotionFloor })
    sm = _deps.createStateMachine(engine, { personality, sceneConfig })

    // ── V8 场景初始化: 分类LLM设定初始CM + 阻尼器 ──
    try {
      sceneInit = await classifyScene(config)
    } catch (e) {
      console.warn(`[sp-api] Scene init failed for session ${sid}: ${e.message}, using defaults`)
      sceneInit = { sceneType: '普通接诊', initialTrust: 5, initialConcernIntensity: 5, initialAnger: 0 }
    }

    cm = initCM({
      concern: {
        primary: config.roleDescription?.slice(0, 50) || '健康状况',
        intensity: sceneInit.initialConcernIntensity,
      },
      trust: sceneInit.initialTrust,
    })

    damper = createAngerDamper(sceneInit.initialAnger)
  }

  const session = {
    id: sid,
    config,
    model: config.model || LLM_MODEL,
    engine,
    stateMachine: sm,
    cm,
    damper,
    personality: config.personality || 'default',
    messages: [],
    lastActivity: Date.now(),
    forceTerminated: false,
    mentalState: isMentalExam ? null : undefined  // null = 惰性初始化
  }
  sessions.set(sid, session)
  return session
}

export function getSession(sid) {
  const s = sessions.get(sid)
  if (s) s.lastActivity = Date.now()
  return s
}

export function deleteSession(sid) {
  return sessions.delete(sid)
}

export function getAllSessions() {
  return sessions
}

export function cleanupSessions() {
  const now = Date.now()
  for (const [id, s] of sessions) {
    if (now - s.lastActivity > SESSION_TTL) sessions.delete(id)
  }
}

// ═══ 会话序列化 / 恢复 ═══

export function serializeSession(session) {
  const base = {
    id: session.id,
    config: session.config,
    model: session.model,
    personality: session.personality,
    messages: session.messages,
    allTimeReplies: session.allTimeReplies || [],
    previousGear: session.previousGear || null,
    forceTerminated: session.forceTerminated || false,
    lastActivity: session.lastActivity || Date.now(),
  }

  if (session.config.mode === 'mental-exam') {
    return {
      ...base,
      mentalState: session.mentalState ? serializeMentalState(session.mentalState) : null,
      engineState: null,
      stateMachineState: null,
      damperLevel: null,
      cm: null,
    }
  }

  return {
    ...base,
    engineState: session.engine.getSerializedState(),
    stateMachineState: session.stateMachine.getFullState(),
    damperLevel: session.damper.getLevel(),
    cm: { ...session.cm },
    mentalState: null,
  }
}

export function saveSessionsToDisk() {
  try {
    const data = []
    for (const s of sessions.values()) {
      try {
        data.push(serializeSession(s))
      } catch (e) {
        console.warn(`[session-store] serialize session ${s.id} failed:`, e.message)
      }
    }
    if (data.length === 0) {
      // 无会话时清理旧文件
      if (existsSync(SESSIONS_PATH)) {
        try { writeFileSync(SESSIONS_PATH, '{}', 'utf-8') } catch {}
      }
      return
    }
    mkdirSync(DATA_DIR, { recursive: true })
    writeFileSync(SESSIONS_PATH, JSON.stringify({ sessions: data, savedAt: new Date().toISOString() }, null, 2), 'utf-8')
  } catch (e) {
    console.warn('[session-store] saveSessionsToDisk failed:', e.message)
  }
}

export async function loadSessionsFromDisk() {
  if (!_deps) throw new Error('session-store not initialized — call initSessionStore() first')
  try {
    if (!existsSync(SESSIONS_PATH)) return 0
    const raw = readFileSync(SESSIONS_PATH, 'utf-8')
    const data = JSON.parse(raw)
    if (!data.sessions || !Array.isArray(data.sessions)) return 0
    let restored = 0
    for (const saved of data.sessions) {
      try {
        if (!saved.id || !saved.config) continue
        restoreSession(saved)
        restored++
      } catch (e) {
        console.warn(`[session-store] restore session ${saved.id} failed:`, e.message)
      }
    }
    console.log(`[session-store] restored ${restored} sessions from disk`)
    return restored
  } catch (e) {
    console.warn('[session-store] loadSessionsFromDisk failed:', e.message)
    return 0
  }
}

function restoreSession(saved) {
  const { config, model, personality, messages, allTimeReplies, previousGear,
          forceTerminated, lastActivity, engineState, stateMachineState, damperLevel, cm, mentalState } = saved

  // ── 精神检查模式：仅恢复 mentalState，不创建标准管线 ──
  if (config.mode === 'mental-exam') {
    const session = {
      id: saved.id,
      config,
      model: model || LLM_MODEL,
      engine: null,
      stateMachine: null,
      cm: null,
      damper: null,
      personality: personality || 'default',
      messages: messages || [],
      allTimeReplies: allTimeReplies || [],
      previousGear: null,
      lastActivity: lastActivity || Date.now(),
      forceTerminated: forceTerminated || false,
      mentalState: mentalState ? deserializeMentalState(mentalState) : null,
    }
    sessions.set(session.id, session)
    return session
  }

  // ── 标准模式恢复 ──
  const baseline = parseBaseline(config.emotionBaseline || {})
  const personalityObj = _deps.derivePersonality(
    typeof config.emotionBaseline === 'string' ? config.emotionBaseline : '',
    config.roleDescription || '',
    config.personality || null
  )
  const scene = detectScene(config)
  const sceneConfig = { mode: config.mode || 'history-taking' }

  const engine = _deps.createEmotionEngine({
    baseline, personality: personalityObj, scene,
    maxRise: scene.maxRise, constrainDrop: scene.constrainDrop, emotionFloor: scene.emotionFloor
  })
  if (engineState) engine.restoreState(engineState)

  const sm = _deps.createStateMachine(engine, { personality: personalityObj, sceneConfig })
  if (stateMachineState) sm.setFullState(stateMachineState)

  const restoredCm = initCM(cm || { concern: { primary: config.roleDescription?.slice(0, 50) || '健康状况', intensity: 5 }, trust: 5 })
  const damper = createAngerDamper(damperLevel ?? 0)

  const session = {
    id: saved.id,
    config,
    model: model || LLM_MODEL,
    engine,
    stateMachine: sm,
    cm: restoredCm,
    damper,
    personality: personality || 'default',
    messages: messages || [],
    allTimeReplies: allTimeReplies || [],
    previousGear: previousGear || null,
    lastActivity: lastActivity || Date.now(),
    forceTerminated: forceTerminated || false
  }
  sessions.set(session.id, session)
  return session
}

export { SESSION_TTL }
