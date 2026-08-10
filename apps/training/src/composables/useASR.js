import { ref } from 'vue'

// ═══════════════════════════════════════════════════════════════
// ASR 语音输入 composable — 双引擎，优先浏览器原生语音识别
// engine 'speech':    Web Speech API（Chrome/Edge/Safari 内置，零成本零后端）
//                     —— 按住说话即识别，无需上传音频
// engine 'dashscope': MediaRecorder 录音 → sp-api /api/sp/asr 转写
//                     —— 浏览器不支持 Web Speech 时的回退（需 dashscope 开通权限）
// 返回 { isRecording, engine, start, stop, cancel }
// start 在浏览器均不支持时抛中文错误，由页面 catch 提示。
// ═══════════════════════════════════════════════════════════════
export function useASR() {
  const isRecording = ref(false)
  const engine = ref('none')

  const SR = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null
  const canMedia = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia &&
    typeof window !== 'undefined' && !!window.MediaRecorder

  // ── Web Speech 引擎状态 ──
  let rec = null
  let speechFinish = null

  // ── MediaRecorder 引擎状态 ──
  let mediaRecorder = null
  let mediaStream = null
  let mediaChunks = []
  let mediaMime = ''

  function blobToBase64(blob) {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(String(reader.result || '').split(',')[1] || '')
      reader.readAsDataURL(blob)
    })
  }

  async function start() {
    if (isRecording.value) return
    if (SR) {
      engine.value = 'speech'
      await startSpeech()
      return
    }
    if (canMedia) {
      engine.value = 'dashscope'
      await startDashscope()
      return
    }
    throw new Error('当前浏览器不支持语音识别，请使用 Chrome 或 Edge')
  }

  // ── Web Speech ──
  function startSpeech() {
    return new Promise((resolve, reject) => {
      try {
        rec = new SR()
        rec.lang = 'zh-CN'
        rec.continuous = false
        rec.interimResults = false
        rec.maxAlternatives = 1
        rec.onresult = (e) => {
          const text = Array.from(e.results).map(r => (r[0] && r[0].transcript) || '').join('')
          finishSpeech(text)
        }
        rec.onerror = () => finishSpeech('')
        rec.onend = () => finishSpeech('')
        rec.start()
        isRecording.value = true
        resolve()
      } catch (e) {
        reject(e)
      }
    })
  }

  function finishSpeech(text) {
    isRecording.value = false
    if (speechFinish) {
      const f = speechFinish
      speechFinish = null
      f(text)
    }
  }

  // ── MediaRecorder → dashscope ──
  async function startDashscope() {
    const candidates = ['audio/wav', 'audio/webm;codecs=opus', 'audio/webm']
    const supported = candidates.find(t => window.MediaRecorder.isTypeSupported(t))
    if (!supported) throw new Error('当前浏览器不支持录音')
    mediaMime = supported
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true })
    mediaChunks = []
    mediaRecorder = new MediaRecorder(mediaStream, { mimeType: mediaMime })
    mediaRecorder.ondataavailable = (e) => { if (e.data && e.data.size) mediaChunks.push(e.data) }
    mediaRecorder.start()
    isRecording.value = true
  }

  async function stopDashscope() {
    if (!mediaRecorder) return ''
    return new Promise((resolve) => {
      mediaRecorder.onstop = async () => {
        isRecording.value = false
        cleanupMedia()
        try {
          const blob = new Blob(mediaChunks, { type: mediaMime })
          const audioBase64 = await blobToBase64(blob)
          if (!audioBase64) { resolve(''); return }
          const format = mediaMime.startsWith('audio/wav') ? 'wav' : (mediaMime.includes('opus') ? 'opus' : 'mp3')
          const resp = await fetch('/api/sp/asr', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ audioBase64, format })
          })
          const json = await resp.json()
          resolve((json && json.ok && json.text) || '')
        } catch {
          resolve('')
        }
      }
      mediaRecorder.stop()
    })
  }

  function cleanupMedia() {
    try { mediaStream?.getTracks().forEach(t => t.stop()) } catch {}
    mediaStream = null
  }

  async function stop() {
    if (!isRecording.value) return ''
    if (engine.value === 'speech') {
      // Web Speech 识别结果由事件回调返回；8 秒兜底防止服务不可达时挂起
      return new Promise((resolve) => {
        const timer = setTimeout(() => finishSpeech(''), 8000)
        speechFinish = (text) => { clearTimeout(timer); resolve(text) }
        try { rec && rec.stop() } catch { finishSpeech('') }
      })
    }
    if (engine.value === 'dashscope') {
      return stopDashscope()
    }
    return ''
  }

  function cancel() {
    if (engine.value === 'speech' && rec) {
      try { rec.abort() } catch {}
    }
    if (engine.value === 'dashscope' && mediaRecorder && mediaRecorder.state !== 'inactive') {
      try { mediaRecorder.onstop = () => {}; mediaRecorder.stop() } catch {}
      cleanupMedia()
    }
    isRecording.value = false
  }

  return { isRecording, engine, start, stop, cancel }
}
