import { ref } from 'vue'

// ═══════════════════════════════════════════════════════════════
// SP API 后端通信 — 所有 LLM/情绪引擎/状态机/提示词在服务端运行
// ═══════════════════════════════════════════════════════════════

const SP_API = '/api/sp'

// ═══════════════════════════════════════════════════════════════
// 模块级会话缓存 — 支持跨路由预配置 + 渐进式加载
// ═══════════════════════════════════════════════════════════════

const sessionCache = new Map()  // key: `${caseId}:${mode}` → { sessionId, options, ts }
const pendingPreconfigs = new Map()  // key → Promise (进行中的预配置，避免重复请求)

let cachedSettings = { emotionEnabled: true, llmModel: 'qwen-turbo' }

async function loadSettings() {
  try {
    const resp = await fetch('/config/settings.json')
    if (resp.ok) {
      cachedSettings = await resp.json()
    }
  } catch (e) { /* keep defaults */ }
}

function cacheKey(caseId, mode) {
  return `${caseId || ''}:${mode || 'history-taking'}`
}

/**
 * 预配置：在导航前调用，完成网络请求并缓存结果。
 * 返回 cached key，station 页通过 configure() 复用。
 */
export async function preconfigureSession(options = {}) {
  const mode = options.mode || 'history-taking'
  const caseId = options.caseId || ''
  const key = cacheKey(caseId, mode)

  // 已有缓存且未过期（5分钟），直接返回
  const cached = sessionCache.get(key)
  if (cached && (Date.now() - cached.ts < 300000)) {
    return { key, cached: true }
  }

  // 已有进行中的预配置，复用其 Promise（避免重复请求）
  if (pendingPreconfigs.has(key)) {
    return pendingPreconfigs.get(key)
  }

  // 创建预配置 Promise 并注册
  const promise = (async () => {
    await loadSettings()

    let resp
    try {
      resp = await fetch(`${SP_API}/configure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId,
          config: {
            mode,
            roleDescription: options.roleDescription || '',
            emotionBaseline: options.emotionBaseline || {},
            spPlayRules: options.spPlayRules || null,
            symptomPool: options.symptomPool || '',
            personality: options.personality || null,
            psychologicalStages: options.psychologicalStages || null,
            humanityScenario: options.humanityScenario || null,
            emotionEnabled: cachedSettings.emotionEnabled !== false,
            model: options.llmModel || cachedSettings.llmModel || undefined
          }
        })
      })
    } catch (e) {
      console.warn('[useAISP] 预配置失败，API 不可达:', e.message)
      sessionCache.set(key, { sessionId: '__offline__', options: { ...options }, ts: Date.now(), offline: true })
      return { key, cached: false, offline: true }
    }

    const data = await resp.json()
    if (!data.ok) {
      console.warn('[useAISP] 预配置失败:', data.error)
      sessionCache.set(key, { sessionId: '__offline__', options: { ...options }, ts: Date.now(), offline: true })
      return { key, cached: false, offline: true }
    }

    sessionCache.set(key, {
      sessionId: data.sessionId,
      options: { ...options },
      ts: Date.now()
    })

    return { key, cached: false }
  })()

  pendingPreconfigs.set(key, promise)
  promise.finally(() => pendingPreconfigs.delete(key))
  return promise
}

/**
 * 后台预配置（fire-and-forget，失败不报错）
 */
export function preconfigureInBackground(options) {
  preconfigureSession(options).catch(e => {
    console.warn('[useAISP] background preconfigure failed:', e.message)
  })
}

// ═══════════════════════════════════════════════════════════════
// 主 Composable
// ═══════════════════════════════════════════════════════════════

export function useAISP() {
  const messages = ref([])
  const isTyping = ref(false)
  const configured = ref(false)
  const offline = ref(false)
  const emotion = ref(null)
  const debugLog = ref([])
  const termination = ref(null)
  const terminationWarning = ref(null)
  const strikeCount = ref(0)
  const strikeMax = ref(3)
  const sessionLogKey = ref('')
  const caseMeta = ref(null)
  let sessionId = null
  let config = {}
  let _configurePromise = null  // sendSPMessage 等待 configure 完成

  // ── 本地日志持久化 ──
  const LOG_INDEX_KEY = 'aisp_log_index'

  function registerLogKey(key) {
    try {
      const raw = localStorage.getItem(LOG_INDEX_KEY)
      const index = raw ? JSON.parse(raw) : []
      if (!index.includes(key)) {
        index.push(key)
        while (index.length > 30) {
          const old = index.shift()
          localStorage.removeItem(old)
          localStorage.removeItem(old + '_updated')
        }
        localStorage.setItem(LOG_INDEX_KEY, JSON.stringify(index))
      }
    } catch (e) { /* ignore */ }
  }

  function getStoredLogs() {
    try {
      const raw = localStorage.getItem(LOG_INDEX_KEY)
      const index = raw ? JSON.parse(raw) : []
      const logs = []
      for (const key of index) {
        const data = localStorage.getItem(key)
        const updated = localStorage.getItem(key + '_updated')
        if (data) {
          try {
            const parsed = JSON.parse(data)
            logs.push({
              key,
              updated: updated ? Number(updated) : 0,
              rounds: parsed.length,
              data: parsed
            })
          } catch (e) { /* skip corrupt */ }
        }
      }
      logs.sort((a, b) => b.updated - a.updated)
      return logs
    } catch (e) { return [] }
  }

  function exportLogs(caseIdFilter) {
    const all = getStoredLogs()
    const filtered = caseIdFilter
      ? all.filter(l => l.key.includes(caseIdFilter))
      : all
    return filtered.map(l => ({
      key: l.key,
      updated: new Date(l.updated).toLocaleString('zh-CN'),
      rounds: l.rounds,
      data: l.data
    }))
  }

  function clearAllLogs() {
    try {
      const raw = localStorage.getItem(LOG_INDEX_KEY)
      const index = raw ? JSON.parse(raw) : []
      for (const key of index) {
        localStorage.removeItem(key)
        localStorage.removeItem(key + '_updated')
      }
      localStorage.removeItem(LOG_INDEX_KEY)
    } catch (e) { /* ignore */ }
  }

  // ── 初始化本地状态（不涉及网络） ──

  const ACTIVE_SESSION_KEY = 'aisp_active_sessions'

  function persistSessionInfo(sid, opts) {
    try {
      const raw = localStorage.getItem(ACTIVE_SESSION_KEY)
      const map = raw ? JSON.parse(raw) : {}
      const cid = opts.caseId || config.caseId || ''
      const md = opts.mode || config.mode || 'history-taking'
      // 按 caseId:mode 为 key 存储，支持多考站各自缓存会话
      map[`${cid}:${md}`] = {
        sessionId: sid,
        caseId: cid,
        mode: md,
        timestamp: Date.now()
      }
      // 清理超过 30 分钟的旧条目
      const now = Date.now()
      for (const [k, v] of Object.entries(map)) {
        if (now - v.timestamp > 30 * 60 * 1000) delete map[k]
      }
      localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(map))
    } catch (e) { /* ignore */ }
  }

  function initLocalState(options, sid) {
    sessionId = sid
    config = { ...options }
    persistSessionInfo(sid, options)
    emotion.value = 'calm'
    termination.value = null
    terminationWarning.value = null

    // 保留 configure 等待期间用户已发送的消息（它们排在队列中等发送）
    const pending = messages.value.filter(m => m.role === 'user')
    messages.value = []

    if (options.openingMessage) {
      messages.value.push({ role: 'sp', content: options.openingMessage, time: Date.now(), emotion: 'calm' })
    }

    // 恢复排队消息（在开场白之后）
    for (const m of pending) {
      messages.value.push(m)
    }

    const caseId = options.caseId || ''
    const ts = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19)
    sessionLogKey.value = `aisp_convlog_${caseId || 'unknown'}_${ts}`
    debugLog.value = []

    let personalityStr = ''
    if (options.personality) {
      if (typeof options.personality === 'string') {
        personalityStr = options.personality
      } else {
        personalityStr = options.personality.type || options.personality.expressiveness || options.personality.name || options.personality.label || JSON.stringify(options.personality)
      }
    }
    caseMeta.value = {
      caseId,
      mode: config.mode || 'history-taking',
      scenarioName: config.humanityScenario?.scenario_name || config.humanityScenario?.sp_materials?.role_description || '',
      roleDescription: config.roleDescription || '',
      personality: personalityStr,
      openingMessage: options.openingMessage || '',
    }
    configured.value = true
  }

  // ═══ configure — 创建/复用会话 ═══

  async function configure(options = {}) {
    configured.value = false
    const mode = options.mode || 'history-taking'
    const caseId = options.caseId || ''
    const key = cacheKey(caseId, mode)

    let resolveCfg
    _configurePromise = new Promise(r => { resolveCfg = r })
    try {

    // 1. 检查预配置缓存
    const cached = sessionCache.get(key)
    if (cached) {
      sessionCache.delete(key)  // 消费后删除，避免过期复用
      if (cached.offline) {
        console.warn('[useAISP] 预配置时 API 已不可达，进入离线浏览模式')
        offline.value = true
        initLocalState(options, '__offline__')
        return
      }
      if (sessionId && sessionId !== cached.sessionId) {
        try {
          await fetch(`${SP_API}/destroy`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId })
          })
        } catch (e) { /* ignore */ }
      }
      initLocalState(options, cached.sessionId)
      return
    }

    // 2. 等待进行中的预配置（StationLoading 发起的 fire-and-forget）
    const pending = pendingPreconfigs.get(key)
    if (pending) {
      try { await pending } catch (e) { /* 预配置失败，继续走自行创建流程 */ }
      const cachedAfter = sessionCache.get(key)
      if (cachedAfter) {
        sessionCache.delete(key)
        if (cachedAfter.offline) {
          console.warn('[useAISP] 预配置时 API 已不可达，进入离线浏览模式')
          offline.value = true
          initLocalState(options, '__offline__')
          return
        }
        if (sessionId && sessionId !== cachedAfter.sessionId) {
          try {
            await fetch(`${SP_API}/destroy`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sessionId })
            })
          } catch (e) { /* ignore */ }
        }
        initLocalState(options, cachedAfter.sessionId)
        return
      }
    }

    // 2.5 尝试恢复 localStorage 中缓存的旧会话（全流程模式切站加速）
    if (mode !== 'humanistic-comm') {
      const cachedSession = getCachedSessionByMode(caseId, mode)
      if (cachedSession) {
        try {
          const resp = await fetch(`${SP_API}/session/restore`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId: cachedSession.sessionId, caseId })
          })
          const rj = await resp.json()
          if (rj.ok && rj.data?.state === 'active') {
            initLocalState(options, cachedSession.sessionId)
            return
          }
        } catch (e) { /* ignore */ }
      }
    }

    // 3. 正常流程：销毁旧会话 + 创建新会话
    if (sessionId) {
      try {
        await fetch(`${SP_API}/destroy`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId })
        })
      } catch (e) { /* ignore */ }
    }

    config = { ...options }
    await loadSettings()

    let resp
    try {
      resp = await fetch(`${SP_API}/configure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId,
          config: {
            mode,
            roleDescription: config.roleDescription || '',
            emotionBaseline: config.emotionBaseline || {},
            spPlayRules: config.spPlayRules || null,
            symptomPool: config.symptomPool || '',
            personality: options.personality || null,
            psychologicalStages: config.psychologicalStages || null,
            humanityScenario: config.humanityScenario || null,
            emotionEnabled: cachedSettings.emotionEnabled !== false,
            model: options.llmModel || cachedSettings.llmModel || undefined
          }
        })
      })
    } catch (e) {
      console.warn('[useAISP] API 不可用，进入离线浏览模式')
      offline.value = true
      initLocalState(options, '__offline__')
      return
    }

    const data = await resp.json()
    if (!data.ok) {
      console.warn('[useAISP] API 不可用，进入离线浏览模式:', data.error)
      offline.value = true
      initLocalState(options, '__offline__')
      return
    }
    initLocalState(options, data.sessionId)
    } finally {
      resolveCfg()
      _configurePromise = null
    }
  }

  // ═══ sendSPMessage — 通过 sp-api 发送消息 ═══

  async function sendSPMessage(studentText) {
    const trimmed = studentText.trim()
    messages.value.push({ role: 'user', content: trimmed, time: Date.now() })

    if (!configured.value) {
      if (_configurePromise) {
        // configure 正在进行中，等待完成后自动续发
        await _configurePromise
      } else {
        return { text: '', emotion: '', pending: true, error: true }
      }
    }

    if (offline.value) {
      messages.value.push({
        role: 'sp', content: '（离线模式 — 后端 API 未连接，仅可浏览界面）', time: Date.now(), emotion: 'calm', offline: true
      })
      return { text: '（离线模式 — 后端 API 未连接，仅可浏览界面）', emotion: 'calm', offline: true }
    }

    if (termination.value) {
      return { text: '', emotion: emotion.value, terminated: true }
    }

    isTyping.value = true

    try {
      const resp = await fetch(`${SP_API}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, text: trimmed })
      })

      const data = await resp.json()
      if (!data.ok) throw new Error(data.error)

      const finalText = data.text
      const action = data.action || ''
      const intent = data.intent || 'neutral'
      const voiceStyle = data.voiceStyle || 'normal'

      emotion.value = data.emotion?.state || 'calm'
      strikeCount.value = data.strikes ?? 0
      strikeMax.value = data.strikeMax ?? 3

      if (data.terminated) {
        termination.value = data.terminated
        terminationWarning.value = null
      } else {
        termination.value = null
        terminationWarning.value = null
      }

      let material = null
      if (data.material) {
        const fp = data.material.filePath
        let url = null
        if (fp) {
          const parts = fp.replace(/^\/data\/cases\//, '').split('/')
          const caseIdPart = parts[0]
          const filename = parts.slice(2).join('/')
          url = `/api/sp/materials/${caseIdPart}/${encodeURIComponent(filename)}`
        }
        material = { ...data.material, url }
      }

      messages.value.push({
        role: 'sp',
        content: finalText,
        time: Date.now(),
        emotion: emotion.value,
        action,
        material,
        terminated: !!data.terminated
      })

      recordDebugLog(trimmed, finalText, data.emotion, intent, action, data.deepReassure || false, voiceStyle, data.videoAction || 'calm', data.trustLevel ?? 0, data._debug || null)
      flushLogToServer()

      isTyping.value = false
      return { text: finalText, emotion: emotion.value, action, material, voiceStyle }

    } catch (e) {
      console.warn('[useAISP] SP API call failed:', e.message)
      isTyping.value = false

      if (e.name === 'TypeError' || e.message?.includes('fetch') || e.message?.includes('network')) {
        try {
          const retryResp = await fetch(`${SP_API}/message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, text: trimmed })
          })
          const retryData = await retryResp.json()
          if (retryData.ok) {
            const finalText = retryData.text
            const action = retryData.action || ''
            const intent = retryData.intent || 'neutral'
            const voiceStyle = retryData.voiceStyle || 'normal'
            emotion.value = retryData.emotion?.state || 'calm'
            strikeCount.value = retryData.strikes ?? 0
            strikeMax.value = retryData.strikeMax ?? 3
            if (retryData.terminated) termination.value = retryData.terminated
            let retryMaterial = null
            if (retryData.material) {
              const fp = retryData.material.filePath
              let url = null
              if (fp) {
                const parts = fp.replace(/^\/data\/cases\//, '').split('/')
                url = `/api/sp/materials/${parts[0]}/${encodeURIComponent(parts.slice(2).join('/'))}`
              }
              retryMaterial = { ...retryData.material, url }
            }
            messages.value.push({
              role: 'sp', content: finalText, time: Date.now(),
              emotion: emotion.value, action, material: retryMaterial
            })
            recordDebugLog(trimmed, finalText, retryData.emotion, intent, action, retryData.deepReassure || false, voiceStyle, retryData.videoAction || 'calm', retryData.trustLevel ?? 0, retryData._debug || null)
            return { text: finalText, emotion: emotion.value, action, material: retryMaterial, voiceStyle }
          }
        } catch (e2) { /* fall through */ }
      }

      const fallbackText = '嗯……（请继续问诊）'
      messages.value.push({
        role: 'sp', content: fallbackText, time: Date.now(),
        emotion: emotion.value, error: true
      })
      return { text: fallbackText, emotion: emotion.value, error: true }
    }
  }

  // ═══ buildSymptomPool — 通过 sp-api 结构化症状池 ═══

  async function buildSymptomPool(selfNarration) {
    if (!selfNarration) return ''
    try {
      const resp = await fetch(`${SP_API}/symptom-pool`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selfNarration })
      })
      const data = await resp.json()
      if (!data.ok) throw new Error(data.error)
      return data.content
    } catch (e) {
      console.warn('[buildSymptomPool] sp-api 失败:', e.message)
      return ''
    }
  }

  // ═══ sendExamCommand — 通过 sp-api 处理体格检查 ═══

  async function sendExamCommand(command) {
    const templates = config.examTemplates || []
    isTyping.value = true
    try {
      const resp = await fetch(`${SP_API}/exam`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command, templates })
      })
      const data = await resp.json()
      if (!data.ok) throw new Error(data.error)
      return data.result
    } catch (e) {
      console.warn('[sendExamCommand] sp-api 失败:', e.message)
      return JSON.stringify({ results: [], unmatched: [], repeated: [] })
    } finally {
      isTyping.value = false
    }
  }

  // ── 调试日志 ──

  function recordDebugLog(studentText, spText, emo = {}, intent = 'unknown', action = '', deepReassure = false, voiceStyle = 'normal', videoAction = 'calm', trustLevel = 0, debugData = null) {
    const entry = {
      round: debugLog.value.length + 1,
      student: studentText,
      sp: spText,
      time: Date.now(),
      vector: {
        anger: +(emo.anger || 0) || 0,
        fear: +(emo.fear || 0) || 0,
        sadness: +(emo.sadness || 0) || 0,
        joy: +(emo.joy || 0) || 0
      },
      state: emo.state || emotion.value || 'calm',
      intent,
      deepReassure,
      voiceStyle,
      videoAction,
      trustLevel,
      action: action || '',
      personality: '',
      fallback: false,
    }
    if (debugData) {
      entry.gear = debugData.gears?.effective || ''
      entry.damperPre = debugData.damper?.preDecision ?? 0
      entry.damper = debugData.damper?.postDecision ?? 0
      entry.cm = debugData.cm || null
      entry.triggers = debugData.triggers || null
      entry.llmModel = debugData.model || ''
      entry.reflectionMode = debugData.reflectionMode
      if (!entry.damper && debugData.damper?.angerLevel != null) {
        entry.damper = debugData.damper.angerLevel
      }
    }
    debugLog.value.push(entry)
    if (debugLog.value.length > 80) debugLog.value.shift()

    if (sessionLogKey.value) {
      try {
        localStorage.setItem(sessionLogKey.value, JSON.stringify(debugLog.value))
        localStorage.setItem(sessionLogKey.value + '_updated', String(Date.now()))
        registerLogKey(sessionLogKey.value)
      } catch (e) { /* localStorage 满或不可用 */ }
    }

    if (debugLog.value.length === 1 || debugLog.value.length % 5 === 0) {
      flushLogToServer()
    }
  }

  function flushLogToServer() {
    try {
      fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId: config.caseId || sessionLogKey.value || 'unknown',
          rounds: debugLog.value
        })
      }).catch(() => { /* 静默 */ })
    } catch (e) { /* 静默 */ }
  }

  // ── 公共 API ──

  function getEmotion() { return emotion.value }
  function getTermination() { return termination.value }
  function getEngine() { return null }
  function getLLMModel() { return { configured: cachedSettings.llmModel || 'qwen-turbo', lastUsed: cachedSettings.llmModel } }

  async function resetEmotion(newBaseline = {}) {
    if (sessionId) {
      try {
        await fetch(`${SP_API}/destroy`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId })
        })
      } catch (e) { /* ignore */ }
    }

    // 清除缓存，强制新建
    const key = cacheKey(config.caseId, config.mode)
    sessionCache.delete(key)

    const resp = await fetch(`${SP_API}/configure`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        caseId: config.caseId,
        config: {
          mode: config.mode,
          roleDescription: config.roleDescription,
          emotionBaseline: newBaseline || config.emotionBaseline,
          spPlayRules: config.spPlayRules,
          symptomPool: config.symptomPool,
          personality: config.personality,
          psychologicalStages: config.psychologicalStages,
          humanityScenario: config.humanityScenario,
          emotionEnabled: cachedSettings.emotionEnabled !== false,
          model: config.llmModel || cachedSettings.llmModel || undefined
        }
      })
    })

    const data = await resp.json()
    if (!data.ok) throw new Error(data.error)
    initLocalState({ ...config, emotionBaseline: newBaseline || config.emotionBaseline }, data.sessionId)
  }

  function getCachedSessionInfo() {
    try {
      const raw = localStorage.getItem(ACTIVE_SESSION_KEY)
      if (!raw) return null
      const map = JSON.parse(raw)
      // 兼容旧格式（单个对象）
      if (map.sessionId && !map.timestamp) {
        // 迁移旧格式
        const info = map
        if (Date.now() - info.timestamp > 30 * 60 * 1000) {
          localStorage.removeItem(ACTIVE_SESSION_KEY)
          return null
        }
        return info
      }
      // 新格式：返回最近的一个
      let latest = null
      for (const [, v] of Object.entries(map)) {
        if (Date.now() - v.timestamp > 30 * 60 * 1000) continue
        if (!latest || v.timestamp > latest.timestamp) latest = v
      }
      return latest
    } catch { return null }
  }

  function getCachedSessionByMode(caseId, mode) {
    try {
      const raw = localStorage.getItem(ACTIVE_SESSION_KEY)
      if (!raw) return null
      const map = JSON.parse(raw)
      const key = `${caseId}:${mode}`
      const info = map[key]
      if (!info) return null
      if (Date.now() - info.timestamp > 30 * 60 * 1000) {
        delete map[key]
        localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(map))
        return null
      }
      return info
    } catch { return null }
  }

  function clearCachedSession() {
    try { localStorage.removeItem(ACTIVE_SESSION_KEY) } catch (e) { /* ignore */ }
  }

  return {
    messages, isTyping, configured, offline, emotion, debugLog, termination, terminationWarning, strikeCount, strikeMax, sessionLogKey, caseMeta,
    configure, sendSPMessage, sendExamCommand, buildSymptomPool,
    getEmotion, getTermination, getEngine, getLLMModel, resetEmotion, flushLogToServer,
    getStoredLogs, exportLogs, clearAllLogs,
    getCachedSessionInfo, getCachedSessionByMode, clearCachedSession
  }
}
