// ═══════════════════════════════════════════════════════════════
// 人文沟通站 v8 测试
// 验证: script驱动 / 意图重定义 / 情绪基线 / maxRise约束
// ═══════════════════════════════════════════════════════════════

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
  const { sessionId } = await post('/api/sp/configure', { caseId: 'OB-20250615-9C2K' })
  console.log('Session:', sessionId?.slice(0, 8))
  console.log('Mode: humanistic-comm (script-driven)\n')

  async function send(label, text) {
    const r = await post('/api/sp/message', { sessionId, text })
    const e = r.emotion || {}
    const nc = r._debug?.post?.noiseCount ?? 0
    const peak = r._debug?.post?.peakLock
    const lockStr = peak && peak.remaining > 0 ? ` [LOCK:${peak.remaining}]` : ''
    const intent = r._debug?.llm?.parsedIntent || '?'
    console.log(`${label} | intent:${intent} | state:${r.state || '?'} | ang:${e.anger?.toFixed(1)} fea:${e.fear?.toFixed(1)} nc:${nc}${lockStr}`)
    console.log(`     SP: "${r.text?.slice(0,80)}"`)
    return r
  }

  // ═══ Phase 1: 医生认真解答 → 验证script推进 ═══
  console.log('── Phase 1: 医生认真解答每个疑问 ──')
  await send('#1', '你好，我们来说说你的情况。')

  // SP应提出第1个疑问（出血/孩子）
  await send('#2a', '您这次出血量不大，我们做了B超，孩子目前心跳正常。头晕是因为有轻度贫血，我们会给您补铁。')

  // SP应提出第2个疑问（胎盘/顺产）
  await send('#3a', '是的，B超显示胎盘完全覆盖宫颈内口，这种情况叫中央性前置胎盘，孩子目前估重2100克。不能顺产，需要剖宫产。')

  // SP应提出第3个疑问（胎盘植入）
  await send('#4a', '胎盘植入待排意思是：B超看到胎盘和子宫肌层的界限有点模糊，我们怀疑可能有植入，但不能完全确定。需要做个MRI来确认。这不是说一定有问题，只是需要进一步检查。')

  console.log('  → 验证: 每次认真解答后，SP应满意并过渡到下一个疑问\n')

  // ═══ Phase 2: 医生回避 → 验证追问/offensive ═══
  console.log('── Phase 2: 医生回避疑问 → SP应追问 ──')

  // SP提出后续疑问，医生回避
  await send('#5a', '这个事情我们后面再说。你先告诉我最近有没有腹痛？')

  // 医生继续回避
  await send('#6a', '你先别管MRI，我问你最近饮食怎么样？吃得好吗？')

  console.log('  → 验证: 医生连续回避后，SP应表达不满(intent:offensive)\n')

  // ═══ Phase 3: 验证情绪基线（高容忍） ═══
  console.log('── Phase 3: 验证情绪基线（不会快速暴怒）──')

  // 重置会话用新病例
  const { sessionId: sid2 } = await post('/api/sp/configure', { caseId: 'OB-20250615-9C2K' })
  console.log('New Session:', sid2?.slice(0, 8))

  // 正常开场
  await send2('#1', '你好，我们来说说你的情况。')

  // 连续3轮回避（验证anger不会跳满）
  await send2('#2', '这个问题以后再说，你先告诉我你最近怎么样。')
  await send2('#3', '先别管那个，你有没有按时吃药？')
  await send2('#4', '这些不是你该担心的，听医生的就行了。')

  console.log('  → 验证: 3轮回避后anger应<5（vs接诊站>8），maxRise=1.0生效\n')

  console.log('Done.')

  async function send2(label, text) {
    const r = await post('/api/sp/message', { sessionId: sid2, text })
    const e = r.emotion || {}
    const peak = r._debug?.post?.peakLock
    const lockStr = peak && peak.remaining > 0 ? ` [LOCK:${peak.remaining}]` : ''
    const intent = r._debug?.llm?.parsedIntent || '?'
    console.log(`${label} | intent:${intent} | state:${r.state || '?'} | ang:${e.anger?.toFixed(1)} fea:${e.fear?.toFixed(1)}${lockStr}`)
    console.log(`     SP: "${r.text?.slice(0,80)}"`)
    return r
  }
}

main().catch(e => console.error(e))
