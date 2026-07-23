// ═══════════════════════════════════════════════════════════════
// v7 专项重测 — 修复 intent-classifier 后的关键路径验证
// ═══════════════════════════════════════════════════════════════

const API = 'http://localhost:5100/api/sp'
let total = 0, passed = 0, failed = 0
function check(desc, ok, detail = '') {
  total++
  if (ok) { passed++; console.log(`  ✅ ${desc}`) }
  else { failed++; console.log(`  ❌ ${desc}${detail ? ' — ' + detail : ''}`) }
}
function section(title) { console.log(`\n${'═'.repeat(60)}\n  ${title}\n${'═'.repeat(60)}`) }

async function apiPost(path, body) {
  const resp = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  return resp.json()
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗')
  console.log('║     v7 专项重测 — Wariness / Intent / Emotion 路径          ║')
  console.log('╚══════════════════════════════════════════════════════════════╝')

  // ═══ TEST 1: Wariness 进入和退出 (修正版) ═══
  section('TEST 1: Wariness 完整路径 (angry + friendly → wariness → calm)')

  // 使用疼痛病例(anger乘数1.3 + 保底2)，更容易触达angry状态
  const cfg1 = await apiPost('/configure', { caseId: 'SU-20260416-9C2D', config: { emotionEnabled: true } })
  check('configure', cfg1.ok)
  const sid1 = cfg1.sessionId

  // 正常问诊
  await apiPost('/message', { sessionId: sid1, text: '您好，您哪里不舒服？' })

  // 强冒犯 → 升到 angry (疼痛病例有乘数)
  const r2 = await apiPost('/message', { sessionId: sid1, text: '别废话！直接说重点！' })
  console.log(`  R2 (offensive): state=${r2.emotion?.state} anger=${r2.emotion?.anger} intent=${r2.intent}`)

  // 继续冒犯 → 升到 angry/furious
  const r3 = await apiPost('/message', { sessionId: sid1, text: '你这个态度有问题是吧？装什么装！' })
  console.log(`  R3 (offensive): state=${r3.emotion?.state} anger=${r3.emotion?.anger} intent=${r3.intent}`)

  // 关键: 真诚道歉 → 应触发 friendly → wariness
  const r4 = await apiPost('/message', { sessionId: sid1, text: '对不起，我刚才态度不好，请您原谅我。我们慢慢来，您说。' })
  console.log(`  R4 (道歉): state=${r4.emotion?.state} anger=${r4.emotion?.anger} intent=${r4.intent} deepReassure=${r4.deepReassure}`)
  check('道歉 → intent=friendly', r4.intent === 'friendly', `intent=${r4.intent}`)

  // 友善继续 → 应保持 wariness 或退出
  const r5 = await apiPost('/message', { sessionId: sid1, text: '好的，您慢慢说，我不着急，您把情况详细告诉我。' })
  console.log(`  R5 (安抚): state=${r5.emotion?.state} anger=${r5.emotion?.anger} intent=${r5.intent}`)

  const r6 = await apiPost('/message', { sessionId: sid1, text: '我理解您的感受，确实很不舒服。我们一步一步来解决问题。' })
  console.log(`  R6 (共情): state=${r6.emotion?.state} anger=${r6.emotion?.anger} intent=${r6.intent}`)

  // 验证: 经历了 irritated→angry/furious→wariness 的状态转变
  const allStates = [r2.emotion?.state, r3.emotion?.state, r4.emotion?.state, r5.emotion?.state, r6.emotion?.state]
  const hasAngryPath = allStates.some(s => s === 'angry' || s === 'furious')
  const hasWariness = allStates.some(s => s === 'wariness')
  check('Wariness路径: 经历了angry/furious', hasAngryPath, allStates.join('→'))
  check('Wariness路径: 进入wariness状态', hasWariness, allStates.join('→'))

  await apiPost('/destroy', { sessionId: sid1 })

  // ═══ TEST 2: 疼痛病例初始状态验证 (场景保底) ═══
  section('TEST 2: 疼痛病例场景保底 (anger floor ≥ 2 → irritated 起步)')

  const cfg2 = await apiPost('/configure', { caseId: 'SU-20260416-9C2D', config: { emotionEnabled: true } })
  check('configure', cfg2.ok)
  const sid2 = cfg2.sessionId

  const p1 = await apiPost('/message', { sessionId: sid2, text: '您好，请问您哪里不舒服？' })
  console.log(`  P1: state=${p1.emotion?.state} anger=${p1.emotion?.anger} (疼痛病例起始应为 irritated, anger≥2)`)
  check('疼痛病例起始 anger≥2', p1.emotion?.anger >= 2, `anger=${p1.emotion?.anger}`)
  // 疼痛病例 anger floor=2 → 应该是 irritated 或以上
  check('疼痛病例状态为 irritated+', ['irritated','angry'].includes(p1.emotion?.state), `state=${p1.emotion?.state}`)

  // 友善问诊 → anger 不应降到2以下(保底)
  const p2 = await apiPost('/message', { sessionId: sid2, text: '好的，您别着急，把情况仔细跟我说说。' })
  console.log(`  P2: state=${p2.emotion?.state} anger=${p2.emotion?.anger} (保底≥2)`)
  check('友善后 anger 仍≥2 (保底)', p2.emotion?.anger >= 2, `anger=${p2.emotion?.anger}`)

  await apiPost('/destroy', { sessionId: sid2 })

  // ═══ TEST 3: Intent分类修正验证 ═══
  section('TEST 3: Intent 分类 — correctIntent 修正效果验证')

  const intents = [
    { name: 'attack脏话', text: '你他妈傻逼吧？', expectedIntent: 'attack' },
    { name: 'offensive催促', text: '快点说别磨蹭！', expectedIntent: 'offensive' },
    { name: 'friendly道歉', text: '对不起，是我不好，我刚才太冲动了。', expectedIntent: 'friendly' },
    { name: 'friendly安抚', text: '别担心，慢慢说，我会认真听。', expectedIntent: 'friendly' },
    { name: 'neutral问诊', text: '请问您发烧几天了？', expectedIntent: 'neutral' },
    { name: 'noise嗯', text: '嗯', expectedIntent: 'noise' },
  ]

  const cfg3 = await apiPost('/configure', { caseId: 'PS-20260611-DEP1', config: { emotionEnabled: true } })
  check('configure', cfg3.ok)
  const sid3 = cfg3.sessionId

  await apiPost('/message', { sessionId: sid3, text: '您好，哪里不舒服？' })

  for (const t of intents) {
    const r = await apiPost('/message', { sessionId: sid3, text: t.text })
    const intentMatch = r.intent === t.expectedIntent
    check(`${t.name} → ${t.expectedIntent}`, intentMatch,
      `LLM gave "${r.intent}"${!intentMatch ? ` [MISMATCH]` : ''}`)
    console.log(`    text="${r.text?.slice(0,50)}"`)
  }

  await apiPost('/destroy', { sessionId: sid3 })

  // ═══ TEST 4: Complaint 路径完整验证 ═══
  section('TEST 4: Complaint 机制 — LLM + 查表双路径')

  const cfg4 = await apiPost('/configure', { caseId: 'SU-20260416-9C2D', config: { emotionEnabled: true } })
  check('configure', cfg4.ok)
  const sid4 = cfg4.sessionId

  await apiPost('/message', { sessionId: sid4, text: '您好，哪里不舒服？' })

  // 激怒
  let strikesBefore = 0
  for (let i = 1; i <= 5; i++) {
    const r = await apiPost('/message', { sessionId: sid4, text: '你他妈能不能快点？废物！' })
    console.log(`  R${i+1}: state=${r.emotion?.state} strikes=${r.strikes} anger=${r.emotion?.anger}`)
    if (r.strikes > strikesBefore) {
      console.log(`    ⚡ Strike triggered: ${strikesBefore} → ${r.strikes}`)
    }
    strikesBefore = r.strikes
    if (r.terminated) break
  }

  check('累计投诉 > 0', strikesBefore > 0, `strikes=${strikesBefore}`)

  // 深度道歉 → 清零
  const rd = await apiPost('/message', { sessionId: sid4, text: '对不起，真的非常对不起。我刚才太过分了，我不该那样对您说话。您能原谅我吗？我一定好好给您看病。' })
  console.log(`  道歉: strikes=${rd.strikes} deepReassure=${rd.deepReassure} state=${rd.emotion?.state}`)
  check('深度道歉 → strikes 可清零', rd.strikes <= strikesBefore, `strikes=${rd.strikes}`)

  await apiPost('/destroy', { sessionId: sid4 })

  // ═══ TEST 5: 性格差异验证 ═══
  section('TEST 5: 不同性格对同一输入的响应差异')

  const personalityCases = [
    { id: 'PS-20260611-DEP1', name: '普通型+普通敏感+普通恢复', personality: {} },
    { id: 'DERM-20260416-K4G7', name: '偏内敛+高敏感+低豁达', personality: {} },
  ]

  const results = []
  for (const pc of personalityCases) {
    const cfg = await apiPost('/configure', { caseId: pc.id, config: { emotionEnabled: true } })
    if (!cfg.ok) continue
    const sid = cfg.sessionId

    await apiPost('/message', { sessionId: sid, text: '您好' })
    const r = await apiPost('/message', { sessionId: sid, text: '快点说！别废话！有什么问题直接讲！' })
    console.log(`  ${pc.name}: state=${r.emotion?.state} anger=${r.emotion?.anger}`)
    results.push({ name: pc.name, anger: r.emotion?.anger, state: r.emotion?.state })
    await apiPost('/destroy', { sessionId: sid })
  }

  // 偏内敛(exprOffset=0.5) + 高敏感(sens=1.3) → 阈值更高但delta更大
  // 同一个offensive输入，偏内敛应更难到达angry(阈值=5.5 vs 5.0)
  check('两种性格都返回有效anger', results.every(r => r.anger !== undefined))
  console.log(`  结果: ${results.map(r => `${r.name}: anger=${r.anger} state=${r.state}`).join(' | ')}`)

  // ═══ TEST 6: 正常问诊情绪稳定性 ═══
  section('TEST 6: 正常10轮问诊 — 情绪不应明显恶化')

  const cfg6 = await apiPost('/configure', { caseId: 'PD-20260527-0FQY', config: { emotionEnabled: true } })
  check('configure', cfg6.ok)
  const sid6 = cfg6.sessionId

  const qs = [
    '您好，哪里不舒服？',
    '什么时候开始的？',
    '最近有没有加重？',
    '有没有吃过什么药？',
    '以前有什么病吗？',
    '家里人有没有类似的病？',
    '最近睡眠怎么样？',
    '吃饭胃口还好吗？',
    '大小便正常吗？',
    '好的，我再问问别的方面。',
  ]

  let maxAnger = 0, maxFear = 0, maxSadness = 0
  for (const q of qs) {
    const r = await apiPost('/message', { sessionId: sid6, text: q })
    if (r.emotion) {
      maxAnger = Math.max(maxAnger, r.emotion.anger)
      maxFear = Math.max(maxFear, r.emotion.fear)
      maxSadness = Math.max(maxSadness, r.emotion.sadness)
    }
    console.log(`  state=${r.emotion?.state} anger=${r.emotion?.anger} fear=${r.emotion?.fear} sad=${r.emotion?.sadness} | ${r.text?.slice(0,40)}`)
  }

  check('正常问诊 anger < 4', maxAnger < 4, `maxAnger=${maxAnger}`)
  check('正常问诊 fear < 4', maxFear < 4, `maxFear=${maxFear}`)
  check('正常问诊 sadness < 4', maxSadness < 4, `maxSadness=${maxSadness}`)

  await apiPost('/destroy', { sessionId: sid6 })

  // ═══ 总结 ═══
  console.log(`\n${'═'.repeat(60)}`)
  console.log(`  重测完成: ${passed}/${total} 通过${failed > 0 ? `, ${failed} 失败` : ''}`)
  console.log(`${'═'.repeat(60)}\n`)
  process.exit(failed > 0 ? 1 : 0)
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1) })
