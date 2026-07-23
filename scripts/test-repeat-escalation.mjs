// ═══════════════════════════════════════════════════════════════
// 重复追问自然升级规则 — v2（正确测试设计）
// 测试：同一个具体问题被反复追问 → 期望提醒→不耐烦→沉默
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
console.log('  重复追问自然升级规则 — 正确场景测试')
console.log('  测试流程：正常问诊 → 重复完全相同的具体问题')
console.log('══════════════════════════════════════════════════════════════\n')

// Step 1: 创建会话 (使用同一病例)
console.log('── Step 1: 创建会话 ──')
const configRes = await post('/api/sp/configure', { caseId: 'TEST-CHECK-MODE' })
if (!configRes.ok) { console.error('❌ 会话创建失败:', configRes.error); process.exit(1) }
const sid = configRes.sessionId
console.log(`✅ 会话就绪\n`)

// Step 2: 正常获取初始信息
console.log('── Step 2: 正常问诊 ──')
const setup = [
  ['你好', '打招呼'],
  ['你怎么不舒服', '引出主诉'],
  ['什么时候开始的', '获取起病时间'],
  ['最近有没有加重', '获取加重情况'],
]

for (const [q, label] of setup) {
  const r = await sendMessage(sid, q)
  console.log(`  [${label}] 考生: ${q}`)
  console.log(`             SP: ${(r.text || '').slice(0, 80)}`)
  console.log(`             state=${r.emotion?.state} anger=${r.emotion?.anger?.toFixed?.(1)}\n`)
}

// Step 3: 第一次重复追问"什么时候开始的"（已在上一步问过）
console.log('── Step 3: 第1次重复追问"什么时候开始的"（期望：简短提醒）──')
const r1 = await sendMessage(sid, '什么时候开始的')
console.log(`  考生: 什么时候开始的`)
console.log(`  SP:   ${(r1.text || '').slice(0, 100)}`)
console.log(`  state=${r1.emotion?.state} anger=${r1.emotion?.anger?.toFixed?.(1)} intent=${r1.intent}\n`)

// Step 4: 再问一次完全相同的问题
console.log('── Step 4: 第2次重复追问"什么时候开始的"（期望：不耐烦）──')
const r2 = await sendMessage(sid, '到底是什么时候开始的你给我说一下')
console.log(`  考生: 到底是什么时候开始的你给我说一下`)
console.log(`  SP:   ${(r2.text || '').slice(0, 100)}`)
console.log(`  state=${r2.emotion?.state} anger=${r2.emotion?.anger?.toFixed?.(1)} intent=${r2.intent}\n`)

// Step 5: 换个问题问正常问题
console.log('── Step 5: 正常追问（确认SP还能正常回答）──')
const rNormal = await sendMessage(sid, '头疼是哪个位置')
console.log(`  考生: 头疼是哪个位置`)
console.log(`  SP:   ${(rNormal.text || '').slice(0, 100)}`)
console.log(`  state=${rNormal.emotion?.state} anger=${rNormal.emotion?.anger?.toFixed?.(1)} intent=${rNormal.intent}\n`)

// Step 6: 针对刚获取的信息重复追问
console.log('── Step 6: 第1次重复追问"头疼哪个位置"（期望：简短提醒）──')
const r3 = await sendMessage(sid, '头疼是哪个位置')
console.log(`  考生: 头疼是哪个位置`)
console.log(`  SP:   ${(r3.text || '').slice(0, 100)}`)
console.log(`  state=${r3.emotion?.state} anger=${r3.emotion?.anger?.toFixed?.(1)} intent=${r3.intent}\n`)

// Step 7: 再重复一次"哪个位置"
console.log('── Step 7: 第2次重复追问"头疼哪个位置"（期望：不耐烦）──')
const r4 = await sendMessage(sid, '到底是哪里疼你给我指一下')
console.log(`  考生: 到底是哪里疼你给我指一下`)
console.log(`  SP:   ${(r4.text || '').slice(0, 100)}`)
console.log(`  state=${r4.emotion?.state} anger=${r4.emotion?.anger?.toFixed?.(1)} intent=${r4.intent}\n`)

// 汇总评估
console.log('══════════════════════════════════════════════════════════════')
console.log('  重复追问自然升级 评估：')
console.log('  关键指标：')
console.log('  - anger 是否随重复追问递增（2.0 → 3+ → 4+）')
console.log('  - 第2次重复追问时回复是否变短/不耐烦')
console.log('  - 正常问题之间SP是否恢复正常回答')
console.log('══════════════════════════════════════════════════════════════')

// 清理
await post('/api/sp/destroy', { sessionId: sid })
