// 测试开场白：学生说"你好"，SP第一次回复
import http from 'http'

const BASE = { hostname: 'localhost', port: 5100 }

function req(method, path, data) {
  return new Promise((resolve, reject) => {
    const body = data ? JSON.stringify(data) : ''
    const opts = { ...BASE, method, path, headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } }
    const r = http.request(opts, res => {
      let raw = ''
      res.on('data', c => raw += c)
      res.on('end', () => {
        try { resolve(JSON.parse(raw)) } catch (e) { reject(new Error(e.message + ': ' + raw.slice(0, 200))) }
      })
    })
    r.on('error', reject)
    if (body) r.write(body)
    r.end()
  })
}

async function main() {
  const cfg = await req('POST', '/api/sp/configure', { caseId: 'DERM-20260416-K4G7', config: { mode: 'humanistic-comm' } })
  if (!cfg.ok) throw new Error(cfg.error)
  console.log('sessionId: ' + cfg.sessionId)

  // 学生只打招呼
  console.log('\n--- 第1轮：学生说"你好" ---')
  const r1 = await req('POST', '/api/sp/message', { sessionId: cfg.sessionId, text: '你好' })
  console.log('SP: ' + r1.text)
  console.log('')

  // 学生问"你怎么了"
  console.log('--- 第2轮：学生问"你咋了？" ---')
  const r2 = await req('POST', '/api/sp/message', { sessionId: cfg.sessionId, text: '你咋了？' })
  console.log('SP: ' + r2.text)
}

main().catch(e => { console.error('ERROR: ' + e.message); process.exit(1) })
