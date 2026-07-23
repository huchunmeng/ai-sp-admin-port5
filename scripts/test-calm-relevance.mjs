// ═══════════════════════════════════════════════════════════════
// calm 状态回复相关性根因排查
// 问题：问"病人是你吗" → 回"你这样让我很不舒服"（驴头对马嘴）
// ═══════════════════════════════════════════════════════════════

const BASE = 'http://localhost:5100'

async function post(path, body) {
  const resp = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  return resp.json()
}

async function sendMessage(sessionId, text) {
  const resp = await fetch(`${BASE}/api/sp/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, text })
  })
  return resp.json()
}

console.log('══════════════════════════════════════════════════════════════')
console.log('  calm 状态回复相关性 — 根因排查')
console.log('══════════════════════════════════════════════════════════════\n')

// 创建会话
const configRes = await post('/api/sp/configure', { caseId: 'TEST-CHECK-MODE' })
if (!configRes.ok) { console.error('❌ 会话创建失败:', configRes.error); process.exit(1) }
const sid = configRes.sessionId
console.log(`✅ 会话就绪\n`)

// 测试场景1: 打招呼后直接问身份
console.log('── 场景1: 正常开场 → 身份确认 ──')
const r1 = await sendMessage(sid, '你好')
console.log(`  考生: 你好`)
console.log(`  SP:   ${r1.text}`)
console.log(`  state=${r1.emotion?.state} intent=${r1.intent}\n`)

const r2 = await sendMessage(sid, '病人是你吗')
console.log(`  考生: 病人是你吗`)
console.log(`  SP:   ${r2.text}`)
console.log(`  state=${r2.emotion?.state} intent=${r2.intent}\n`)

// 清理
await post('/api/sp/destroy', { sessionId: sid })

// 测试场景2: 确认身份的不同问法
console.log('── 场景2: 身份确认变体 ──')
const c2 = await post('/api/sp/configure', { caseId: 'TEST-CHECK-MODE' })
const sid2 = c2.sessionId

const identityQuestions = [
  '你是郑长胜本人吗',
  '你是患者本人吗',
  '是你自己来看病的吗',
  '你是家属还是患者',
]

for (const q of identityQuestions) {
  // 先让对话有点上下文
  await sendMessage(sid2, '你好')
  await sendMessage(sid2, '你怎么不舒服')

  const r = await sendMessage(sid2, q)
  console.log(`  考生: ${q}`)
  console.log(`  SP:   ${(r.text || '').slice(0, 100)}`)
  console.log(`  intent=${r.intent} state=${r.emotion?.state}\n`)
}

await post('/api/sp/destroy', { sessionId: sid2 })

// 测试场景3: 易被误解为攻击的中性问题
console.log('── 场景3: 易被误解的中性问题 ──')
const c3 = await post('/api/sp/configure', { caseId: 'TEST-CHECK-MODE' })
const sid3 = c3.sessionId

const trickyQuestions = [
  '你是真的病人还是演的',  // 可能被误解为"装的吧"
  '你说的都是真的吗',       // 可能被误解为质疑
  '你不是AI吧',            // 身份质疑
  '你是不是在骗我',         // 可能被误解为攻击
]

for (const q of trickyQuestions) {
  const freshSid = (await post('/api/sp/configure', { caseId: 'TEST-CHECK-MODE' })).sessionId
  await sendMessage(freshSid, '你好')
  await sendMessage(freshSid, '你怎么不舒服')

  const r = await sendMessage(freshSid, q)
  console.log(`  考生: ${q}`)
  console.log(`  SP:   ${(r.text || '').slice(0, 100)}`)
  console.log(`  intent=${r.intent} state=${r.emotion?.state}\n`)
  await post('/api/sp/destroy', { sessionId: freshSid })
}

await post('/api/sp/destroy', { sessionId: sid3 })
console.log('══════════════════════════════════════════════════════════════')
