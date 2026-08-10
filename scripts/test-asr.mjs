// ═══════════════════════════════════════════════════════════════
// ASR 端到端冒烟测试 — 本地 CosyVoice TTS 合成中文语音 → /api/sp/asr 转写
// 运行：node scripts/test-asr.mjs
// 前置：sp-api 已启动（5100）
// ═══════════════════════════════════════════════════════════════
const TTS_URL = 'ws://localhost:5100/api/sp/tts'
const ASR_URL = 'http://localhost:5100/api/sp/asr'

function synthesize(text) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(TTS_URL)
    const chunks = []
    const timer = setTimeout(() => { try { ws.close() } catch {}; reject(new Error('TTS timeout')) }, 20000)
    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'session.update', session: { voice: 'longanyang', response_format: 'wav', sample_rate: 24000, rate: 1, pitch: 1, volume: 50 } }))
      ws.send(JSON.stringify({ type: 'input_text_buffer.append', text }))
      ws.send(JSON.stringify({ type: 'input_text_buffer.commit' }))
      ws.send(JSON.stringify({ type: 'session.finish' }))
    }
    ws.onmessage = (e) => {
      let msg
      try { msg = JSON.parse(e.data) } catch { return }
      if (msg.type === 'response.audio.delta') chunks.push(msg.delta)
      else if (msg.type === 'response.audio.done') { clearTimeout(timer); ws.close(); resolve(chunks.join('')) }
      else if (msg.type === 'error') { clearTimeout(timer); ws.close(); reject(new Error('TTS: ' + msg.message)) }
    }
    ws.onerror = (e) => { clearTimeout(timer); reject(new Error('TTS connection error')) }
  })
}

const text = '请问您哪里不舒服'
const wavBase64 = await synthesize(text)
const wavBuf = Buffer.from(wavBase64, 'base64')
console.log(`[1] TTS 合成「${text}」→ base64 ${wavBase64.length} 字符 / 解码 ${wavBuf.length} 字节`)
console.log('[1] wav 头 hex:', wavBuf.subarray(0, 44).toString('hex'))
console.log('[1] RIFF?', wavBuf.toString('latin1', 0, 4), '| WAVE?', wavBuf.toString('latin1', 8, 12), '| fmt?', wavBuf.toString('latin1', 12, 16))

const resp = await fetch(ASR_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ audioBase64: wavBase64, format: 'wav' })
})
const json = await resp.json()
console.log('[2] ASR 识别结果:', JSON.stringify(json, null, 2))

if (json.ok && json.text) {
  console.log(`[✓] 端到端通过：识别为「${json.text}」`)
} else {
  console.log('[✗] 识别未返回文本，请检查 sp-api 日志')
  process.exit(1)
}
