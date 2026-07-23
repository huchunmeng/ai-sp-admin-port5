import WebSocket from 'ws'
import { writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const API_KEY = process.env.LLM_API_KEY
if (!API_KEY) { console.error('请设置环境变量 LLM_API_KEY'); process.exit(1) }
const MODEL = 'qwen3-tts-instruct-flash-realtime'

const outDir = join(__dirname, 'tts-output')
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true })

function test(text, instructions, voice, filename) {
  return new Promise((resolve, reject) => {
    const url = `wss://dashscope.aliyuncs.com/api-ws/v1/realtime?model=${MODEL}`
    const ws = new WebSocket(url, {
      headers: { 'Authorization': `Bearer ${API_KEY}` }
    })

    const audioChunks = []
    let resolved = false

    ws.on('open', () => {
      ws.send(JSON.stringify({
        type: 'session.update',
        session: {
          voice: voice || 'Cherry',
          mode: 'server_commit',
          language_type: 'Chinese',
          response_format: 'mp3',
          sample_rate: 24000,
          instructions: instructions || ''
        }
      }))

      setTimeout(() => {
        ws.send(JSON.stringify({ type: 'input_text_buffer.append', text }))
        ws.send(JSON.stringify({ type: 'input_text_buffer.commit' }))
      }, 300)
    })

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString())
        if (msg.type === 'response.audio.delta' && msg.delta) {
          audioChunks.push(Buffer.from(msg.delta, 'base64'))
        }
        if (msg.type === 'response.audio.done' && !resolved) {
          resolved = true
          if (audioChunks.length > 0) {
            const all = Buffer.concat(audioChunks)
            const outPath = join(outDir, filename)
            writeFileSync(outPath, all)
            console.log(`  ✓ ${filename} — ${all.length} bytes`)
          }
          ws.close()
          resolve()
        }
        if (msg.type === 'error') {
          ws.close()
          reject(new Error(msg.message || 'unknown'))
        }
      } catch {}
    })

    ws.on('error', reject)
    ws.on('close', () => { if (!resolved) { resolved = true; resolve() } })
    setTimeout(() => { if (!resolved) { resolved = true; ws.close(); reject(new Error('timeout')) } }, 20000)
  })
}

const tests = [
  {
    text: '医生您好，我最近胸口闷得慌，有点担心。',
    instructions: '语气里带一点紧张，语速偏快，透出明显的焦虑感。',
    voice: 'Cherry',
    file: '01-anxious.mp3'
  },
  {
    text: '你们这些医生到底行不行？看了半天也看不出个结果！',
    instructions: '很生气，声音变大，语气尖锐，直接质问对方。',
    voice: 'Cherry',
    file: '02-angry.mp3'
  },
  {
    text: '医生……我真的很害怕，万一是很严重的病怎么办……',
    instructions: '声音发抖，说话断断续续，明显在害怕。',
    voice: 'Cherry',
    file: '03-fearful.mp3'
  },
  {
    text: '算了，反正也就这样了，看不好也没办法。',
    instructions: '声音低沉，语气平淡，说话没精打采的。',
    voice: 'Cherry',
    file: '04-down.mp3'
  }
]

console.log('Qwen3-TTS Realtime 情绪表达测试\n')
for (const t of tests) {
  console.log(`▶ ${t.file}`)
  console.log(`  text: "${t.text}"`)
  console.log(`  instructions: "${t.instructions}"`)
  try {
    await test(t.text, t.instructions, t.voice, t.file)
  } catch (e) {
    console.error(`  ✗ ${e.message}`)
  }
  await new Promise(r => setTimeout(r, 1000))
}
console.log('\n✅ 完成，文件在 scripts/tts-output/')
