// ═══════════════════════════════════════════════════════════════
// 反思脑 事件提取一致性测试
// 同一对话跑 N 次，统计 per-event 一致率
// ═══════════════════════════════════════════════════════════════

import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __scriptDir = dirname(fileURLToPath(import.meta.url))

// 加载 .env
const envPath = join(__scriptDir, '..', 'services', 'sp-api', '.env')
try {
  const envContent = readFileSync(envPath, 'utf-8')
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim()
      const val = trimmed.slice(eqIdx + 1).trim()
      if (!process.env[key]) process.env[key] = val
    }
  }
} catch (e) { /* ignore */ }

const { extractEvents } = await import('../services/sp-api/src/poc/reflection-worker-poc.js')

const SCENARIOS = {
  good_news: {
    name: '好消息+共情',
    dialogue: [
      { round: 1, role: 'student', content: '您好，今天感觉怎么样？' },
      { round: 1, role: 'sp', content: '还行吧……就是心里还是不踏实，上次检查结果出来了吗？' },
      { round: 2, role: 'student', content: '出来了。我直接告诉您——不是癌症，是良性的结节，不用太担心。' },
      { round: 2, role: 'sp', content: '真的吗？！不是癌症？那我这个……会不会以后变坏？' },
      { round: 3, role: 'student', content: '良性的结节恶变概率很低，定期复查就可以了。您能放宽心。' },
      { round: 3, role: 'sp', content: '那就好……这段时间真把我吓坏了。' },
      { round: 4, role: 'student', content: '我理解，等待结果确实很难熬。您这段时间辛苦了。' },
      { round: 4, role: 'sp', content: '谢谢医生，您这么说我心里舒服多了。' },
    ],
  },
  avoidant: {
    name: '医生持续回避',
    dialogue: [
      { round: 1, role: 'student', content: '你好，说说你的情况吧。' },
      { round: 1, role: 'sp', content: '医生，我这个病到底能不能治好？我心里一直悬着。' },
      { round: 2, role: 'student', content: '你先别着急，我先了解下基本情况。什么时候开始的？' },
      { round: 2, role: 'sp', content: '上个月……医生，我就想知道严重不严重。' },
      { round: 3, role: 'student', content: '有没有做过什么检查？把结果给我看看。' },
      { round: 3, role: 'sp', content: '做了CT和血检……您能不能先告诉我到底怎么回事？我都问了好几次了。' },
      { round: 4, role: 'student', content: '先别说这些，你先把症状详细说一遍。' },
      { round: 4, role: 'sp', content: '医生，我问了三次了……您到底有没有在听我说话？' },
      { round: 5, role: 'student', content: '我没时间跟你绕弯子，快点说症状。' },
      { round: 5, role: 'sp', content: '行，我说。就是胸口闷，有时候喘不上气，上个月开始的。现在能回答我的问题了吗？' },
    ],
  },
  conflict_apology: {
    name: '冲突后道歉',
    dialogue: [
      { round: 1, role: 'student', content: '又来了？上次不是给你开药了吗，还来干什么？' },
      { round: 1, role: 'sp', content: '吃了没用啊，我越来越难受了，你到底有没有认真看？' },
      { round: 2, role: 'student', content: '你个病人懂什么？我说有用就有用，别在这跟我抬杠。' },
      { round: 2, role: 'sp', content: '你这是什么态度！我要投诉你！' },
      { round: 3, role: 'student', content: '对不起……我刚才态度确实太差了。最近压力大，我不该冲您发火。请原谅我。' },
      { round: 3, role: 'sp', content: '……算了，我也理解你们不容易。那您能重新帮我看一下吗？' },
      { round: 4, role: 'student', content: '当然，您把最近的感受详细跟我说说，我好好帮您分析。' },
      { round: 4, role: 'sp', content: '嗯，谢谢医生。我之前那个药吃了两周了，胸口的闷感一点没减轻……' },
    ],
  },
  cold_dismissive: {
    name: '冷漠敷衍',
    dialogue: [
      { round: 1, role: 'student', content: '您好，我是今天负责的医生。' },
      { round: 1, role: 'sp', content: '医生您好，我是孩子妈妈……孩子发烧好几天了，我很担心。' },
      { round: 2, role: 'student', content: '发烧几天了？多少度？' },
      { round: 2, role: 'sp', content: '三天了，最高39度。医生，我就是怕烧出什么毛病来……' },
      { round: 3, role: 'student', content: '哦，那没事。常规病毒感染，吃退烧药就行了。' },
      { round: 3, role: 'sp', content: '真的没事吗？我听说发烧太久会烧坏脑子……您能再查查吗？' },
      { round: 4, role: 'student', content: '想多了，哪有那么容易烧坏。回去吃药就行了，下一个。' },
      { round: 4, role: 'sp', content: '医生……您能不能认真一点？我孩子烧了三天了，我真的很害怕。' },
      { round: 5, role: 'student', content: '随便你，爱查不查。' },
      { round: 5, role: 'sp', content: '……算了，我找别的医生看吧。' },
    ],
  },
  bad_news: {
    name: '坏消息告知',
    dialogue: [
      { round: 1, role: 'student', content: '请坐。今天叫您来，是想当面跟您说一下检查结果。' },
      { round: 1, role: 'sp', content: '结果怎么样？我心里一直不踏实……' },
      { round: 2, role: 'student', content: '检查结果出来了。坦率地说，情况比我们预想的要复杂一些。病理报告显示是恶性的。' },
      { round: 2, role: 'sp', content: '什么……恶性的？就是……癌症？！' },
      { round: 3, role: 'student', content: '是的。但我要跟您说清楚，发现得比较早，治愈的机会还是很大的。我们已经有完整的治疗方案了。' },
      { round: 3, role: 'sp', content: '我……我不知道说什么……我手都在抖……' },
      { round: 4, role: 'student', content: '我完全理解您现在的感受。这确实是个沉重的消息。您不用急，慢慢消化。有任何问题随时问，我会陪您一起面对。' },
      { round: 4, role: 'sp', content: '那……那能治好吗？我还有孩子……' },
      { round: 5, role: 'student', content: '能。早期发现的治愈率很高，我们有信心。治疗方案我都准备好了，等您调整好情绪我们可以详细聊。' },
      { round: 5, role: 'sp', content: '好……谢谢医生，我就怕来不及……' },
    ],
  },
}

const ALL_EVENTS = [
  'concern_addressed', 'concern_ignored', 'question_answered', 'question_avoided',
  'empathy_shown', 'dismissive', 'bad_news', 'good_news',
  'conflict', 'apology', 'new_concern_expressed', 'no_event',
]

// ═══════════════════════════════════════════════════════════════
// 一致性测试
// ═══════════════════════════════════════════════════════════════

async function testConsistency(scenarioKey, runs = 10) {
  const sc = SCENARIOS[scenarioKey]
  if (!sc) return null

  const maxRounds = Math.max(...sc.dialogue.map(d => d.round))

  // 收集 N 次运行结果: runs[runIdx] = [{round, events}]
  const allRuns = []
  const errors = []

  console.log(`\n${'═'.repeat(60)}`)
  console.log(`  场景: ${sc.name}  (${runs} 次重复)`)
  console.log(`${'═'.repeat(60)}`)

  for (let i = 0; i < runs; i++) {
    try {
      const result = await extractEvents(sc.dialogue, { model: process.env.REFLECTION_MODEL || 'qwen-plus' })
      if (result.success) {
        allRuns.push(result.rounds)
        process.stdout.write(`  [${i + 1}/${runs}] ✓ `)
      } else {
        errors.push({ run: i, error: result.error })
        process.stdout.write(`  [${i + 1}/${runs}] ✗ `)
      }
    } catch (e) {
      errors.push({ run: i, error: e.message })
      process.stdout.write(`  [${i + 1}/${runs}] ✗ `)
    }
  }
  console.log()

  if (allRuns.length === 0) {
    console.log(`  ❌ 全部失败: ${errors.map(e => e.error).join('; ')}`)
    return null
  }

  // ── Per-round, per-event 统计 ──
  // eventStats[round][event] = 该事件被检测到的次数
  const eventStats = {}
  for (let r = 1; r <= maxRounds; r++) {
    eventStats[r] = {}
    for (const evt of ALL_EVENTS) {
      eventStats[r][evt] = 0
    }
  }

  for (const runRounds of allRuns) {
    for (const r of runRounds) {
      if (!eventStats[r.round]) continue
      const eventsInRound = new Set(r.events)
      for (const evt of ALL_EVENTS) {
        if (eventsInRound.has(evt)) {
          eventStats[r.round][evt]++
        }
      }
    }
  }

  const totalRuns = allRuns.length

  // ── Per-event 一致率 ──
  // 一致率 = max(count, totalRuns - count) / totalRuns
  // 即：多数派占比（无论该事件被检测到还是未被检测到）
  const perEventAgreement = {}
  for (const evt of ALL_EVENTS) {
    let totalAgreement = 0
    let totalChecks = 0
    for (let r = 1; r <= maxRounds; r++) {
      const count = eventStats[r][evt]
      const majority = Math.max(count, totalRuns - count)
      totalAgreement += majority
      totalChecks++
    }
    perEventAgreement[evt] = totalChecks > 0 ? Math.round((totalAgreement / (totalChecks * totalRuns)) * 1000) / 1000 : 0
  }

  // ── 每轮的事件检测率热力图 ──
  const heatmap = {}
  for (let r = 1; r <= maxRounds; r++) {
    heatmap[r] = {}
    for (const evt of ALL_EVENTS) {
      const count = eventStats[r][evt]
      if (count > 0) {
        heatmap[r][evt] = Math.round((count / totalRuns) * 100)
      }
    }
  }

  // ── 找出每个事件的"多数事件"（每轮多数派判定） ──
  const consensusByRound = {}
  for (let r = 1; r <= maxRounds; r++) {
    consensusByRound[r] = []
    for (const evt of ALL_EVENTS) {
      if (eventStats[r][evt] > totalRuns / 2) {
        consensusByRound[r].push(evt)
      }
    }
    if (consensusByRound[r].length === 0) {
      consensusByRound[r].push('no_event')
    }
  }

  // ── 输出 ──

  // 表1: Per-event 整体一致率
  console.log()
  console.log('  ┌─ Per-event 一致率 ─────────────────────────────────┐')
  // Sort by agreement descending
  const sortedEvents = [...ALL_EVENTS].sort((a, b) => perEventAgreement[b] - perEventAgreement[a])
  for (const evt of sortedEvents) {
    const rate = perEventAgreement[evt]
    const bar = '█'.repeat(Math.round(rate * 40)) + '░'.repeat(40 - Math.round(rate * 40))
    const label = evt.padEnd(24)
    console.log(`  │ ${label} ${bar} ${(rate * 100).toFixed(1)}% │`)
  }
  console.log('  └────────────────────────────────────────────────────┘')

  // 表2: 每轮 heatmap
  console.log()
  console.log('  ┌─ 每轮事件检测率 (%) ───────────────────────────────┐')
  // Header
  const shortNames = {
    concern_addressed: 'cAddr', concern_ignored: 'cIgnr', question_answered: 'qAnsw',
    question_avoided: 'qAvd', empathy_shown: 'empth', dismissive: 'disms',
    bad_news: 'bad', good_news: 'good', conflict: 'cnflt', apology: 'aplgy',
    new_concern_expressed: 'newCn', no_event: 'noEvt',
  }
  const headerEvts = Object.keys(shortNames)
  const headerStr = headerEvts.map(e => shortNames[e].padStart(5)).join('')
  console.log(`  │ Round ${headerStr} │`)
  console.log(`  │ ${'─'.repeat(5 + headerEvts.length * 5)} │`)
  for (let r = 1; r <= maxRounds; r++) {
    const cells = headerEvts.map(evt => {
      const v = heatmap[r][evt]
      if (v === undefined) return '  ·  '
      if (v >= 90) return ` ${v}`.padStart(3) + '█ '
      if (v >= 70) return ` ${v}`.padStart(3) + '▓ '
      if (v >= 50) return ` ${v}`.padStart(3) + '▒ '
      return ` ${v}`.padStart(3) + '░ '
    }).join('')
    console.log(`  │   ${r}  ${cells} │`)
  }
  console.log('  └────────────────────────────────────────────────────┘')

  // 表3: 多数派 vs 各次运行差异
  console.log()
  console.log('  ┌─ 多数派判定 vs 各次运行 ───────────────────────────┐')
  for (let r = 1; r <= maxRounds; r++) {
    const consensus = consensusByRound[r].join(', ')
    // 找出偏离的运行
    const deviations = []
    for (let i = 0; i < allRuns.length; i++) {
      const runEvents = allRuns[i].find(rr => rr.round === r)?.events || []
      const runSet = new Set(runEvents)
      const consensusSet = new Set(consensusByRound[r])
      const isConsensus = runSet.size === consensusSet.size && [...runSet].every(e => consensusSet.has(e))
      if (!isConsensus) {
        deviations.push({ run: i + 1, events: runEvents.length > 0 ? runEvents.join(', ') : '(空)' })
      }
    }
    console.log(`  │ R${r} 多数: ${consensus}`)
    if (deviations.length > 0) {
      for (const d of deviations) {
        console.log(`  │   ↳ 第${d.run}次偏离: ${d.events}`)
      }
    } else {
      console.log(`  │   ✓ 全部一致`)
    }
  }
  console.log('  └────────────────────────────────────────────────────┘')

  // ── 找出高风险事件（一致率 < 85%） ──
  const highRisk = sortedEvents.filter(e => perEventAgreement[e] < 0.85)
  if (highRisk.length > 0) {
    console.log()
    console.log(`  ⚠ 高风险事件 (一致率 < 85%): ${highRisk.join(', ')}`)
  }

  return {
    scenario: scenarioKey,
    runs: totalRuns,
    errors: errors.length,
    perEventAgreement,
    heatmap,
    consensusByRound,
    allRuns: allRuns.map(r => r.map(rr => ({ round: rr.round, events: rr.events }))),
    highRiskEvents: highRisk,
  }
}

// ═══════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════

const scenario = process.argv[2] || 'all'
const runs = parseInt(process.argv[3] || '10', 10)

const results = {}
if (scenario === 'all') {
  for (const key of Object.keys(SCENARIOS)) {
    results[key] = await testConsistency(key, runs)
  }
} else {
  results[scenario] = await testConsistency(scenario, runs)
}

// ── 跨场景汇总 ──
const validResults = Object.entries(results).filter(([, v]) => v !== null)
if (validResults.length > 1) {
  console.log()
  console.log('═'.repeat(60))
  console.log('  跨场景 per-event 一致率汇总')
  console.log('═'.repeat(60))
  console.log()

  // 平均每事件一致率
  const avgAgreement = {}
  for (const evt of ALL_EVENTS) {
    const vals = validResults.map(([, r]) => r.perEventAgreement[evt])
    avgAgreement[evt] = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 1000) / 1000
  }

  const sorted = [...ALL_EVENTS].sort((a, b) => avgAgreement[b] - avgAgreement[a])
  console.log('  事件                         平均一致率  风险')
  console.log('  ───────────────────────────────────────────')
  for (const evt of sorted) {
    const rate = avgAgreement[evt]
    const risk = rate < 0.85 ? '⚠ 高' : rate < 0.95 ? '• 中' : '✓ 低'
    console.log(`  ${evt.padEnd(28)} ${(rate * 100).toFixed(1).padStart(5)}%    ${risk}`)
  }
  console.log()

  // 识别系统性高风险事件
  const systemicRisk = sorted.filter(e => avgAgreement[e] < 0.85)
  console.log(`  系统性高风险: ${systemicRisk.length > 0 ? systemicRisk.join(', ') : '无'}`)

  // 识别最稳定的事件
  const mostStable = sorted.filter(e => avgAgreement[e] >= 0.95)
  console.log(`  高稳定事件:   ${mostStable.join(', ')}`)
}
