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
    const nc = r._debug?.post?.noiseCount ?? -1
    const peak = r._debug?.post?.peakLock
    const lockStr = peak && peak.remaining > 0 ? ` [LOCK:${peak.remaining}]` : ''
    console.log(`${label} | ang:${e.anger?.toFixed(1)} fea:${e.fear?.toFixed(1)} nc:${nc}${lockStr} | "${r.text?.slice(0,50)}"`)
    return r
  }

  // First ask normally to establish calm state
  await send('#1 q', '你好，请问哪里不舒服？')

  // 2 noise rounds (grace period, no anger rise)
  await send('#2 ns', '嗯')
  await send('#3 ns', '哦')
  console.log('  → After 2 noise: anger should be 0 (grace period)')

  // 3rd noise: anger +0.5
  await send('#4 ns', '...')
  console.log('  → 3rd noise: anger should rise +0.5')

  // 4th noise
  await send('#5 ns', '嗯嗯')
  console.log('  → 4th noise: anger +0.5 more')

  // Student returns to medical question → counter resets
  await send('#6 q', '你胸口疼多久了？')
  console.log('  → Medical question: nc should reset to 0')

  // Noise again — counter starts fresh
  await send('#7 ns', '呵呵')
  await send('#8 ns', '哈哈')
  await send('#9 ns', '嗯')
  console.log('  → Back to noise, 3rd noise: anger +0.5 again')

  console.log('\nDone.')
}

main().catch(e => console.error(e))
