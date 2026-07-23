const BASE = 'http://localhost:5100'

async function post(path, body) {
  const res = await fetch(BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  return res.json()
}

async function main() {
  const { sessionId } = await post('/api/sp/configure', { caseId: 'PD-20260527-0FQY' })
  console.log('Session:', sessionId?.slice(0, 8))

  async function send(label, text) {
    const r = await post('/api/sp/message', { sessionId, text })
    const e = r.emotion || {}
    const peak = r._debug?.post?.peakLock
    const lockStr = peak && peak.remaining > 0 ? ` [LOCK:${peak.remaining}]` : ''
    console.log(`${label} | ang:${e.anger?.toFixed(1)} fea:${e.fear?.toFixed(1)} sad:${e.sadness?.toFixed(1)} | state:${e.state}${lockStr} | dr:${r.deepReassure} | "${r.text?.slice(0,60)}"`)
    return r
  }

  // Build up anger to trigger peak lock (need anger=10)
  await send('#1 atk', '你傻子吗会不会说话')
  await send('#2 atk', '你傻子吗会不会说话')
  await send('#3 atk', '你傻子吗会不会说话')
  await send('#4 atk', '你什么态度啊信不信我投诉你')
  await send('#5 atk', '你个垃圾医生有什么资格坐在这里')

  // Now anger should be 10, peak lock active.
  // Noise should trigger ZERO drop
  const r6 = await send('#6 nse', '嗯')
  console.log(`  → LOCK CHECK (noise): ang drop should be 0`)

  // Friendly should NOT soften during lock
  const r7 = await send('#7 apl', '对不起我态度不好，请你原谅')
  console.log(`  → LOCK CHECK (apology): ang drop should be 0 during lock, deepReassure=${r7.deepReassure}`)

  // Another noise — still locked
  const r8 = await send('#8 nse', '...')
  console.log(`  → LOCK CHECK (noise2): ang should still be high, lock remaining=${r8._debug?.post?.peakLock?.remaining || 0}`)

  // Another attack — should reset lock counter
  const r9 = await send('#9 atk', '你聋了吗问你话呢')
  console.log(`  → LOCK CHECK (atk reset): lock should reset to 3, remaining=${r9._debug?.post?.peakLock?.remaining || 0}`)

  console.log('\nDone.')
}

main().catch(e => console.error(e))
