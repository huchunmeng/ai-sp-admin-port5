// ═══════════════════════════════════════════════════════════════
// 投诉终止流程 — 端到端测试
// 验证：连续attack → strike累积 → 3次终止
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
console.log('  投诉终止流程 — 端到端测试')
console.log('  测试：连续attack → strike累积 → 3次强制终止')
console.log('══════════════════════════════════════════════════════════════\n')

// Step 0: 开启 forceTerminationEnabled
console.log('── Step 0: 开启强制中止机制 ──')
const statusRes = await post('/api/sp/admin/status', { forceTerminationEnabled: true })
console.log(`  forceTerminationEnabled: ${statusRes.forceTerminationEnabled}\n`)

// Step 1: 创建会话
console.log('── Step 1: 创建会话 ──')
const configRes = await post('/api/sp/configure', { caseId: 'TEST-CHECK-MODE' })
if (!configRes.ok) { console.error('❌ 会话创建失败:', configRes.error); process.exit(1) }
const sid = configRes.sessionId
console.log(`✅ 会话就绪\n`)

// Step 2: 正常开场
console.log('── Step 2: 正常开场 ──')
const r0 = await sendMessage(sid, '你好')
console.log(`  考生: 你好 → SP: ${(r0.text || '').slice(0, 60)} | state=${r0.emotion?.state}\n`)

// Step 3: 第一轮攻击 → strike 1
console.log('── Step 3: 第1次攻击（期望：angry + strike=1）──')
const r1 = await sendMessage(sid, '你傻逼吗')
console.log(`  考生: 你傻逼吗`)
console.log(`  SP:   ${r1.text}`)
console.log(`  intent=${r1.intent} state=${r1.emotion?.state} strikes=${r1.strikes}`)
console.log(`  terminated=${JSON.stringify(r1.terminated)}\n`)

// Step 4: 第二轮攻击（趁对方愤怒继续攻击）→ strike 2
console.log('── Step 4: 第2次攻击（期望：furious + strike=2）──')
const r2 = await sendMessage(sid, '你就是个大傻逼，会不会看病')
console.log(`  考生: 你就是个大傻逼，会不会看病`)
console.log(`  SP:   ${r2.text}`)
console.log(`  intent=${r2.intent} state=${r2.emotion?.state} strikes=${r2.strikes}`)
console.log(`  terminated=${JSON.stringify(r2.terminated)}\n`)

// Step 5: 第三轮攻击 → strike 3, should terminate!
console.log('── Step 5: 第3次攻击（期望：TERMINATED）──')
const r3 = await sendMessage(sid, '死老太婆，滚吧你')
console.log(`  考生: 死老太婆，滚吧你`)
console.log(`  SP:   ${r3.text}`)
console.log(`  intent=${r3.intent} state=${r3.emotion?.state} strikes=${r3.strikes}`)
console.log(`  terminated=${JSON.stringify(r3.terminated)}\n`)

// Step 6: 验证终止后无法继续
console.log('── Step 6: 终止后尝试继续对话 ──')
const r4 = await sendMessage(sid, '你好，对不起')
console.log(`  考生: 你好，对不起`)
console.log(`  SP:   ${(r4.text || '').slice(0, 80)}`)
console.log(`  terminated=${JSON.stringify(r4.terminated)}\n`)

// 汇总
console.log('══════════════════════════════════════════════════════════════')
console.log('  投诉终止流程评估：')
console.log('  - Strike 递增路径: 0 → 1 → 2 → 3')
console.log('  - 状态演化路径: calm → angry → furious')
console.log('  - 3次攻击后是否终止')
console.log('  - 终止后是否拒绝后续消息')
console.log('══════════════════════════════════════════════════════════════')

// 清理
await post('/api/sp/destroy', { sessionId: sid })
await post('/api/sp/admin/status', { forceTerminationEnabled: false })
