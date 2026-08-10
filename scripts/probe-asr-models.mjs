// ═══════════════════════════════════════════════════════════════
// ASR 模型可用性探测 — 先测实时 WS 接口，再测同步 recognition REST 接口
// 运行：node --env-file=services/sp-api/.env scripts/probe-asr-models.mjs
// ═══════════════════════════════════════════════════════════════
import { readFileSync } from 'node:fs'

const envText = readFileSync('services/sp-api/.env', 'utf-8')
const KEY = (envText.match(/LLM_API_KEY=(.+)/)?.[1] || '').trim()
if (!KEY) { console.log('未找到 LLM_API_KEY'); process.exit(1) }

// 用一段真实中文语音（本地 TTS 合成）作为测试音频
const TTS_URL = 'ws://localhost:5100/api/sp/tts'
function synthesize() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(TTS_URL)
    const chunks = []
    const timer = setTimeout(() => { try { ws.close() } catch {}; reject(new Error('TTS timeout')) }, 20000)
    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'session.update', session: { voice: 'longanyang', response_format: 'wav', sample_rate: 24000, rate: 1, pitch: 1, volume: 50 } }))
      ws.send(JSON.stringify({ type: 'input_text_buffer.append', text: '请问您哪里不舒服' }))
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
    ws.onerror = () => { clearTimeout(timer); reject(new Error('TTS connection error')) }
  })
}

const wavBase64 = await synthesize()
console.log(`测试音频 base64 ${wavBase64.length} 字符`)

// ── 实时 WS 接口探测 ──
const wsModels = [
  'paraformer-realtime-v2',
  'paraformer-realtime-v1',
  'paraformer-realtime-8k-v2',
  'sensevoice-small',
  'sensevoice-v1',
]

function probeWS(model) {
  return new Promise((resolve) => {
    let ws
    const timer = setTimeout(() => { try { ws?.close() } catch {}; console.log(`[WS] ${model}: TIMEOUT`); resolve() }, 15000)
    ws = new WebSocket('wss://dashscope.aliyuncs.com/api-ws/v1/inference', {
      headers: { 'Authorization': `Bearer ${KEY}` }
    })
    ws.onopen = () => {
      ws.send(JSON.stringify({
        header: { action: 'run-task', task_id: Math.random().toString(36).slice(2), streaming: 'duplex' },
        payload: { task_group: 'audio', task: 'asr', function: 'recognition', model, input: {}, parameters: { format: 'wav', sample_rate: 24000 } }
      }))
    }
    ws.onmessage = (e) => {
      let m
      try { m = JSON.parse(e.data) } catch { return }
      const action = m.header?.action || m.header?.event
      if (action === 'task-started') { console.log(`[WS] ${model}: ✓ 可用`); clearTimeout(timer); try { ws.close() } catch {}; resolve() }
      else if (action === 'task-failed') { console.log(`[WS] ${model}: ✗ ${m.header?.error_code} — ${m.header?.error_message}`); clearTimeout(timer); try { ws.close() } catch {}; resolve() }
    }
    ws.onerror = () => { console.log(`[WS] ${model}: 连接错误`); clearTimeout(timer); resolve() }
  })
}

// ── 同步 recognition REST 接口探测 ──
const restModels = ['sensevoice-v1', 'sensevoice-small', 'paraformer-v2', 'paraformer-v1', 'paraformer-realtime-v2']
async function probeREST(model) {
  try {
    const resp = await fetch('https://dashscope.aliyuncs.com/api/v1/services/audio/asr/recognition', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, input: { audio: wavBase64 }, parameters: { language_hints: ['zh'] } })
    })
    const text = await resp.text()
    console.log(`[REST] ${model}: ${resp.status} — ${text.slice(0, 200)}`)
  } catch (e) {
    console.log(`[REST] ${model}: 请求异常 ${e.message}`)
  }
}

console.log('\n== 实时 WS 接口 ==')
for (const m of wsModels) await probeWS(m)
console.log('\n== 同步 recognition REST 接口 ==')
for (const m of restModels) await probeREST(m)
