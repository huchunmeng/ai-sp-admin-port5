// 测试：1) 辱骂后道歉的惯性 2) 坏消息的fear强度
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

async function testInertia() {
  console.log('========== 测试1: 辱骂后道歉的惯性 ==========\n')
  const cfg = await req('POST', '/api/sp/configure', { caseId: 'DERM-20260416-K4G7', config: { mode: 'humanistic-comm' } })
  // 先正常对话建立 context
  for (const t of ['你好', '你咋了？', '还有别的不舒服吗？']) {
    await req('POST', '/api/sp/message', { sessionId: cfg.sessionId, text: t })
  }
  // 连续辱骂
  for (const t of ['你是傻逼', '大傻逼', '滚', '滚']) {
    const r = await req('POST', '/api/sp/message', { sessionId: cfg.sessionId, text: t })
    const e = r.emotion || {}
    console.log('医生: ' + t + ' | SP: ' + r.text + ' | 怒' + (e.anger||0).toFixed(1) + ' 惧' + (e.fear||0).toFixed(1) + ' ' + (e.state||'?'))
  }
  // 道歉
  console.log('\n--- 道歉回合 ---')
  const r5 = await req('POST', '/api/sp/message', { sessionId: cfg.sessionId, text: '对不起' })
  const e5 = r5.emotion || {}
  console.log('医生: 对不起 | SP: ' + r5.text + ' | 怒' + (e5.anger||0).toFixed(1) + ' 惧' + (e5.fear||0).toFixed(1) + ' ' + (e5.state||'?'))
}

async function testBadNews() {
  console.log('\n\n========== 测试2: 坏消息的fear强度 ==========\n')
  const cfg = await req('POST', '/api/sp/configure', { caseId: 'DERM-20260416-K4G7', config: { mode: 'humanistic-comm' } })
  for (const t of ['你好']) {
    const r = await req('POST', '/api/sp/message', { sessionId: cfg.sessionId, text: t })
    console.log('医生: ' + t + ' | SP: ' + r.text.slice(0,60) + '...')
  }
  // 告知坏消息
  const bad = ['目前考虑是甲状腺癌', '没有错，确实是甲状腺癌，好消息是还是早期']
  for (const t of bad) {
    const r = await req('POST', '/api/sp/message', { sessionId: cfg.sessionId, text: t })
    const e = r.emotion || {}
    console.log('医生: ' + t + ' | SP: ' + r.text.slice(0,70) + '... | 惧' + (e.fear||0).toFixed(1) + ' ' + (e.state||'?'))
  }
}

async function main() {
  await testInertia()
  await testBadNews()
  console.log('\n========== 完成 ==========')
}

main().catch(e => { console.error('ERROR: ' + e.message); process.exit(1) })
