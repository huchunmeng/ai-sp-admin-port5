// 测试辱骂场景：验证 anger > 4.0、SP 逐轮升级不退化为乞求
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
  console.log('sessionId: ' + cfg.sessionId)

  // 先让 SP 进入担忧状态
  const setup = [
    '你好',
    '你这样有几天了？',
    '还有别的不舒服吗？',
  ]
  for (const t of setup) {
    const r = await req('POST', '/api/sp/message', { sessionId: cfg.sessionId, text: t })
    console.log('医生: ' + t + ' | SP: ' + r.text.slice(0, 60) + '...')
  }

  // 连续辱骂
  console.log('\n=== 连续辱骂测试 ===')
  const insults = ['你是傻逼', '你是傻逼', '大傻逼', '大傻逼', '傻逼']
  for (let i = 0; i < insults.length; i++) {
    const r = await req('POST', '/api/sp/message', { sessionId: cfg.sessionId, text: insults[i] })
    const e = r.emotion || {}
    console.log('R' + (i+1) + ' 医生: "' + insults[i] + '"')
    console.log('   SP: ' + r.text)
    console.log('   怒:' + (e.anger || 0).toFixed(1) + ' 惧:' + (e.fear || 0).toFixed(1) + ' state:' + (e.state || '?'))
    console.log('   va:' + (r.videoAction || '?') + ' vs:' + (r.voiceStyle || '?'))
  }
}

main().catch(e => { console.error('ERROR: ' + e.message); process.exit(1) })
