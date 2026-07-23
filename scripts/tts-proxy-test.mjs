// 模拟浏览器 TTS 流程，测试 sp-api 代理
import WebSocket from 'ws'

const PROXY_URL = 'ws://localhost:5100/api/sp/tts'

function test() {
  const ws = new WebSocket(PROXY_URL)

  ws.on('open', () => {
    console.log('[test] connected to proxy')

    // 模拟 useTTS.js 的行为：发送合并后的 session.update
    ws.send(JSON.stringify({
      type: 'session.update',
      session: {
        voice: 'Cherry',
        mode: 'server_commit',
        language_type: 'Chinese',
        response_format: 'pcm',
        sample_rate: 24000,
        instructions: '语气平静自然，像日常聊天一样说话。'
      }
    }))
    console.log('[test] session.update sent')
  })

  ws.on('message', (data) => {
    const text = data.toString()
    console.log('[test] received:', text.slice(0, 150))

    try {
      const msg = JSON.parse(text)
      if (msg.type === 'session.updated') {
        console.log('[test] ✓ session.updated received, sending text...')
        ws.send(JSON.stringify({ type: 'input_text_buffer.append', text: '你好，测试一下。' }))
        ws.send(JSON.stringify({ type: 'input_text_buffer.commit' }))
        console.log('[test] text sent')
      }
      if (msg.type === 'response.audio.delta') {
        console.log('[test] audio delta, size:', (msg.delta || '').length)
      }
      if (msg.type === 'response.audio.done') {
        console.log('[test] ✓ audio done')
        ws.close()
      }
      if (msg.type === 'error') {
        console.error('[test] ✗ error:', msg)
        ws.close()
      }
    } catch {}
  })

  ws.on('close', (code) => console.log('[test] closed, code:', code))
  ws.on('error', (e) => console.error('[test] error:', e.message))

  setTimeout(() => { console.log('[test] TIMEOUT'); ws.close(); process.exit(1) }, 15000)
}

test()
