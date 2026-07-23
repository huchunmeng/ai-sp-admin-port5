import { ref } from 'vue'

// v7.4 声乐指令映射 — Qwen3-TTS 自由文本指令
const VOICE_INSTRUCTIONS = {
  warm:            '温和关切。',
  flat:            '平淡不带情绪。',
  normal:          '声音带关切。',
  slightly_tense:  '声音带些许不耐烦。',
  loud_fast:       '语气激动。',
  very_loud_fast:  '极度愤怒。',
  cold:            '冷淡疏离。',
  shaky:           '不安害怕。',
  very_shaky:      '极度恐惧。',
  soft_slow:       '声音低沉缓慢，悲伤压抑。',
  defensive:       '戒备抗拒。',
  vulnerable:      '声音虚弱颤抖，带着哭腔。',
  broken:          '崩溃抽泣，声音发抖，断断续续。',
}

const TTS_URL = 'ws://localhost:5100/api/sp/tts'
const SP_API_URL = 'http://localhost:5100'

function isCosyVoice(model) {
  return model && model.startsWith('cosyvoice')
}

// ── 音色配置 ──
// 从 /data/patient-voice-config.json 加载（运营平台可动态编辑）
// 新格式：{ "qwen3-tts-instruct-flash-realtime": {...}, "cosyvoice-v3-flash": {...} }
// 按当前 TTS 模型取对应区段

// 年龄-音色默认映射（Qwen 兜底，当 modelVoices 中未配置时回退）
const AGE_VOICE_DEFAULTS_QWEN = {
  male: [
    { ageMin: 0,  ageMax: 12, voice: 'Maia' },
    { ageMin: 12, ageMax: 30, voice: 'Moon' },
    { ageMin: 30, ageMax: 55, voice: 'Kai' },
    { ageMin: 55, ageMax: 70, voice: 'Vincent' },
    { ageMin: 70, ageMax: 999,voice: 'Arthur' },
  ],
  female: [
    { ageMin: 0,  ageMax: 12, voice: 'Maia' },
    { ageMin: 12, ageMax: 30, voice: 'Serena' },
    { ageMin: 30, ageMax: 55, voice: 'Maia' },
    { ageMin: 55, ageMax: 70, voice: 'Maia' },
    { ageMin: 70, ageMax: 999,voice: 'Maia' },
  ],
}

// CosyVoice 兜底
const AGE_VOICE_DEFAULTS_COSY = {
  male: [
    { ageMin: 0, ageMax: 12, voice: 'longhuhu_v3' },
    { ageMin: 12, ageMax: 30, voice: 'longanyang' },
    { ageMin: 30, ageMax: 55, voice: 'longshuo_v3' },
    { ageMin: 55, ageMax: 70, voice: 'longsanshu_v3' },
    { ageMin: 70, ageMax: 999, voice: 'longlaobo_v3' },
  ],
  female: [
    { ageMin: 0, ageMax: 12, voice: 'longhuhu_v3' },
    { ageMin: 12, ageMax: 30, voice: 'longxing_v3' },
    { ageMin: 30, ageMax: 55, voice: 'longxiaochun_v3' },
    { ageMin: 55, ageMax: 70, voice: 'longyingjing_v3' },
    { ageMin: 70, ageMax: 999, voice: 'longlaoyi_v3' },
  ],
}

// 模型ID推导 — 与 AssetManager.vue 的 RANGES 保持一致
const _MALE_BASE = [
  [0, 0.17, '男01'], [0.17, 0.42, '男02'], [0.42, 0.83, '男03'], [0.83, 2, '男04'],
  [2, 6, '男05'], [6, 11, '男06'], [11, 15, '男07'], [15, 19, '男08'],
  [19, 29, '男09'], [29, 40, '男10'], [40, 50, '男11'], [50, 60, '男12'],
  [60, 70, '男13'], [70, 86, '男14'], [86, 100, '男15'], [100, 999, '男16'],
]
const _FEMALE_BASE = _MALE_BASE.map(([min, max, id]) => [min, max, id.replace('男', '女')])

function deriveModelId(gender, ageYears) {
  const isMale = gender === '男' || gender === 'male'
  const ranges = isMale ? _MALE_BASE : _FEMALE_BASE
  for (const [min, max, id] of ranges) {
    if (ageYears >= min && ageYears < max) return id
  }
  return isMale ? '男10' : '女10'
}

let _ttsModel = null
let _ttsModelLoading = null
let _voiceConfigCache = null
let _voiceConfigLoading = null

async function fetchTtsModel() {
  if (_ttsModel) return _ttsModel
  if (_ttsModelLoading) return _ttsModelLoading
  _ttsModelLoading = (async () => {
    try {
      const res = await fetch(`${SP_API_URL}/api/sp/admin/settings`)
      const data = await res.json()
      _ttsModel = data.ttsModel || 'cosyvoice-v3-flash'
    } catch {
      _ttsModel = 'cosyvoice-v3-flash'
    }
    return _ttsModel
  })()
  return _ttsModelLoading
}

function getDefaultVoiceDefaults(model) {
  return isCosyVoice(model) ? AGE_VOICE_DEFAULTS_COSY : AGE_VOICE_DEFAULTS_QWEN
}

async function loadVoiceConfig() {
  if (_voiceConfigCache) return _voiceConfigCache
  if (_voiceConfigLoading) return _voiceConfigLoading
  _voiceConfigLoading = (async () => {
    const model = await fetchTtsModel()
    try {
      const res = await fetch('/data/patient-voice-config.json')
      const data = res.ok ? await res.json() : null
      if (data && data[model]) {
        _voiceConfigCache = {
          modelVoices: data[model].modelVoices || {},
          modelSpeeds: data[model].modelSpeeds || {},
          defaults: data[model].defaults || getDefaultVoiceDefaults(model),
          emotionParams: data[model].emotionParams || null,
          model,
        }
      } else if (data && data['cosyvoice-v3-flash']) {
        // fallback to cosyvoice section
        const cv = data['cosyvoice-v3-flash']
        _voiceConfigCache = {
          modelVoices: cv.modelVoices || {},
          modelSpeeds: cv.modelSpeeds || {},
          defaults: cv.defaults || AGE_VOICE_DEFAULTS_COSY,
          emotionParams: cv.emotionParams || null,
          model: 'cosyvoice-v3-flash',
        }
      } else {
        _voiceConfigCache = { modelVoices: {}, modelSpeeds: {}, defaults: getDefaultVoiceDefaults(model), emotionParams: null, model }
      }
    } catch {
      _voiceConfigCache = { modelVoices: {}, modelSpeeds: {}, defaults: getDefaultVoiceDefaults(model), emotionParams: null, model }
    }
    return _voiceConfigCache
  })()
  return _voiceConfigLoading
}

async function selectVoice(gender, age) {
  await loadVoiceConfig()
  const ageNum = typeof age === 'string' ? (parseInt(age.replace(/[^0-9]/g, '')) || 30) : (age || 30)
  const config = _voiceConfigCache
  const modelId = deriveModelId(gender, ageNum)

  // 1. 优先：按模型ID精确匹配
  if (config && config.modelVoices && config.modelVoices[modelId]) {
    return config.modelVoices[modelId]
  }

  // 2. 回退：年龄段默认
  const defaults = config?.defaults || getDefaultVoiceDefaults(config?.model || 'cosyvoice-v3-flash')
  const g = (gender === '男' || gender === 'male') ? 'male' : 'female'
  const entries = defaults[g] || AGE_VOICE_DEFAULTS_QWEN[g]
  for (const e of entries) {
    if (ageNum >= e.ageMin && ageNum < e.ageMax) return e.voice
  }
  return entries[entries.length - 1]?.voice || (g === 'male' ? 'Kai' : 'Maia')
}

async function selectSpeed(gender, age) {
  await loadVoiceConfig()
  const ageNum = typeof age === 'string' ? (parseInt(age.replace(/[^0-9]/g, '')) || 30) : (age || 30)
  const config = _voiceConfigCache
  const modelId = deriveModelId(gender, ageNum)
  if (config && config.modelSpeeds && config.modelSpeeds[modelId] != null) {
    return config.modelSpeeds[modelId]
  }
  return 1.0
}

function getEmotionParams(voiceStyle) {
  if (!_voiceConfigCache || !_voiceConfigCache.emotionParams) return null
  return _voiceConfigCache.emotionParams[voiceStyle] || _voiceConfigCache.emotionParams['normal'] || null
}

// 启动时即加载配置（非阻塞）
fetchTtsModel().then(() => loadVoiceConfig())

// 模型切换后刷新配置（可由外部调用）
export async function refreshTtsConfig() {
  _ttsModel = null
  _ttsModelLoading = null
  _voiceConfigCache = null
  _voiceConfigLoading = null
  await fetchTtsModel()
  await loadVoiceConfig()
  console.log('[TTS] 配置已刷新，当前模型:', _ttsModel)
}

// 获取当前 TTS 模型（供外部查询）
export function getCurrentTtsModel() {
  return _ttsModel || 'cosyvoice-v3-flash'
}

// 获取当前使用的音色名（供外部显示）
export function getCurrentVoiceName() {
  return _voiceConfigCache?.modelVoices || null
}

// 按模型ID获取当前配置的音色（供外部查询）
export function getVoiceForModelId(modelId) {
  if (!_voiceConfigCache?.modelVoices) return null
  return _voiceConfigCache.modelVoices[modelId] || null
}

// 模块级共享 AudioContext
let _sharedCtx = null
let _sharedUnlocked = false

export function useTTS() {
  const isSpeaking = ref(false)
  const enabled = ref(true)
  const unlocked = ref(_sharedUnlocked)
  let currentVoice = 'Cherry'
  let currentSpeed = 1.0
  let _ws = null
  let _connecting = null
  let _activeSource = null  // 当前正在播放的 AudioBufferSourceNode
  let _cosyVoiceParams = null  // { rate, pitch, volume } for CosyVoice

  function ensureConnection(instructions = '', extraParams = null) {
    if (_ws) { try { _ws.close() } catch {}; _ws = null }
    _connecting = null

    _connecting = new Promise((resolve, reject) => {
      const socket = new WebSocket(TTS_URL)
      _ws = socket
      let resolved = false

      const cleanup = (errMsg) => {
        clearTimeout(timeout)
        socket.removeEventListener('message', onMsg)
        if (_ws === socket) _ws = null
        if (!resolved) { resolved = true; _connecting = null; reject(new Error(errMsg)) }
      }

      const onMsg = (event) => {
        try {
          const msg = JSON.parse(typeof event.data === 'string' ? event.data : event.data.toString())
          if (msg.type === 'session.updated') {
            clearTimeout(timeout)
            socket.removeEventListener('message', onMsg)
            resolved = true
            _connecting = null
            resolve(socket)
          }
        } catch {}
      }

      const timeout = setTimeout(() => cleanup('TTS handshake timeout'), 5000)

      socket.onopen = () => {
        socket.addEventListener('message', onMsg)
        const session = {
          voice: currentVoice,
          mode: 'server_commit',
          language_type: 'Chinese',
          response_format: 'pcm',
          sample_rate: 24000
        }
        if (instructions) session.instructions = instructions
        // CosyVoice 附加参数
        if (extraParams) {
          if (extraParams.rate != null) session.rate = extraParams.rate
          if (extraParams.pitch != null) session.pitch = extraParams.pitch
          if (extraParams.volume != null) session.volume = extraParams.volume
        }
        socket.send(JSON.stringify({ type: 'session.update', session }))
      }

      socket.onerror = () => cleanup('TTS connection failed')
      socket.onclose = (evt) => {
        if (!resolved) cleanup(`TTS connection closed (${evt.code || 'unknown'})`)
        else { if (_ws === socket) _ws = null; isSpeaking.value = false }
      }
    })
    return _connecting
  }

  function b64ToBytes(b64) {
    const bin = atob(b64)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    return bytes
  }

  function concatU8(arrays) {
    const total = arrays.reduce((s, a) => s + a.length, 0)
    const out = new Uint8Array(total)
    let off = 0
    for (const a of arrays) { out.set(a, off); off += a.length }
    return out
  }

  function isSpeakable(text) {
    if (!text) return false
    const t = text.trim()
    if (t === '……' || t === '...' || t === '…') return false
    if (/^[（(][^)）]*[）)]$/.test(t)) return false
    return true
  }

  async function speak(text, voiceStyle = 'normal') {
    if (!enabled.value || !text || !isSpeakable(text)) return

    // 打断当前正在播放的音频
    if (_activeSource) {
      try { _activeSource.stop() } catch {}
      _activeSource = null
    }
    isSpeaking.value = false

    try {
      const model = _ttsModel || 'cosyvoice-v3-flash'
      let instructions = ''
      let extraParams = null

      if (isCosyVoice(model)) {
        // CosyVoice: 从 emotionParams 取指令和韵律参数
        // _v3 音色不支持 instruction 参数，仅靠 rate/pitch/volume 表达情绪
        const emotion = getEmotionParams(voiceStyle)
        const isV3Voice = currentVoice && currentVoice.endsWith('_v3')
        if (!isV3Voice) {
          instructions = emotion?.instruction || '你说话的情感是neutral。'
        }
        extraParams = {
          rate: emotion?.rate ?? 1.0,
          pitch: emotion?.pitch ?? 1.0,
          volume: emotion?.volume ?? 50,
        }
      } else {
        // Qwen-TTS: 自由文本指令
        instructions = VOICE_INSTRUCTIONS[voiceStyle] || VOICE_INSTRUCTIONS['normal']
      }

      const socket = await ensureConnection(instructions, extraParams)
      if (socket.readyState !== WebSocket.OPEN) return

      isSpeaking.value = true
      const audioChunks = []

      socket.send(JSON.stringify({ type: 'input_text_buffer.append', text }))
      socket.send(JSON.stringify({ type: 'input_text_buffer.commit' }))

      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          cleanup()
          reject(new Error('TTS timeout'))
        }, 15000)

        const onMsg = (event) => {
          try {
            const raw = event.data || event
            const msg = JSON.parse(typeof raw === 'string' ? raw : raw.toString())
            if (msg.type === 'response.audio.delta' && msg.delta) {
              audioChunks.push(b64ToBytes(msg.delta))
            }
            if (msg.type === 'response.audio.done') {
              clearTimeout(timeout)
              cleanup()
              resolve()
            }
            if (msg.type === 'error') {
              clearTimeout(timeout)
              cleanup()
              reject(new Error(msg.message || 'TTS error'))
            }
          } catch {}
        }

        function cleanup() {
          socket.removeEventListener('message', onMsg)
        }

        socket.addEventListener('message', onMsg)
      })

      if (audioChunks.length > 0) {
        await playPCM(concatU8(audioChunks), currentSpeed)
      }
    } catch (e) {
      console.warn('[TTS]', e.message)
    } finally {
      isSpeaking.value = false
    }
  }

  async function playPCM(pcmBytes, speed = 1.0) {
    if (!_sharedCtx) {
      _sharedCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 })
    }
    if (_sharedCtx.state === 'suspended') {
      try { await _sharedCtx.resume() } catch { /* autoplay blocked */ }
    }

    const view = new DataView(pcmBytes.buffer, pcmBytes.byteOffset, pcmBytes.byteLength)
    const samples = new Float32Array(pcmBytes.length / 2)
    for (let i = 0; i < samples.length; i++) {
      samples[i] = view.getInt16(i * 2, true) / 32768
    }

    const buf = _sharedCtx.createBuffer(1, samples.length, 24000)
    buf.getChannelData(0).set(samples)

    const src = _sharedCtx.createBufferSource()
    src.buffer = buf
    src.connect(_sharedCtx.destination)
    if (speed !== 1.0) src.playbackRate.value = speed

    _activeSource = src
    return new Promise((resolve) => {
      src.onended = () => { _activeSource = null; resolve() }
      src.start()
    })
  }

  async function configureVoice(gender, age) {
    currentVoice = await selectVoice(gender, age)
    currentSpeed = await selectSpeed(gender, age)
    if (_ws) { try { _ws.close() } catch {}; _ws = null }
    _connecting = null
  }

  async function configureVoiceById(modelId) {
    await loadVoiceConfig()
    const config = _voiceConfigCache
    if (config && config.modelVoices && config.modelVoices[modelId]) {
      currentVoice = config.modelVoices[modelId]
    }
    if (config && config.modelSpeeds && config.modelSpeeds[modelId] != null) {
      currentSpeed = config.modelSpeeds[modelId]
    }
    if (_ws) { try { _ws.close() } catch {}; _ws = null }
    _connecting = null
  }

  function setVoice(voice) {
    currentVoice = voice
  }

  function setSpeed(speed) {
    currentSpeed = speed
  }

  function toggle() {
    enabled.value = !enabled.value
  }

  async function unlock() {
    if (!_sharedCtx) {
      _sharedCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 })
    }
    if (_sharedCtx.state === 'suspended') {
      await _sharedCtx.resume()
    }
    if (_sharedCtx.state === 'running') {
      _sharedUnlocked = true
      unlocked.value = true
    }
  }

  function destroy() {
    enabled.value = false
    if (_ws) {
      _ws.close()
      _ws = null
    }
    _connecting = null
  }

  return { isSpeaking, enabled, unlocked, speak, setVoice, setSpeed, configureVoice, configureVoiceById, toggle, unlock, destroy }
}
