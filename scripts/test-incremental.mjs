// ═══════════════════════════════════════════════════════════════
// 增量模式验证
// 测试1: 相同事件 → 批量 vs 增量 CM 一致性
// 测试2: 增量 LLM 提取实际运行
// 测试3: 跨轮变量持久化
// ═══════════════════════════════════════════════════════════════

import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __scriptDir = dirname(fileURLToPath(import.meta.url))

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

const { applyEvents, initCM, applyEventRound } = await import('../services/sp-api/src/poc/event-mapping.js')
const { extractEvents, extractRoundEvents, buildStructuredContext } = await import('../services/sp-api/src/poc/reflection-worker-poc.js')
const { computeDerivedState } = await import('../services/sp-api/src/poc/derived-state.js')

// 测试场景
const SCENARIOS = [
  {
    name: '回避对话',
    initialCM: { concern: { primary: '担心治不好', intensity: 7 }, trust: 5, unresolved_goals: ['这个病能治好吗'], stuck_count: 0 },
    dialogue: [
      { round: 1, role: 'student', content: '你好，说说你的情况吧。' },
      { round: 1, role: 'sp', content: '医生，我这个病到底能不能治好？我心里一直悬着。' },
      { round: 2, role: 'student', content: '你先别着急，我先了解下基本情况。' },
      { round: 2, role: 'sp', content: '上个月……医生，我就想知道严重不严重。' },
      { round: 3, role: 'student', content: '有没有做过什么检查？把结果给我看看。' },
      { round: 3, role: 'sp', content: '做了CT……您能不能先告诉我到底怎么回事？' },
    ],
  },
  {
    name: '冲突道歉',
    initialCM: { concern: { primary: '担心误诊', intensity: 6 }, trust: 3, unresolved_goals: ['上次开的药为什么没效果'], stuck_count: 3 },
    dialogue: [
      { round: 1, role: 'student', content: '又来了？上次不是给你开药了吗，还来干什么？' },
      { round: 1, role: 'sp', content: '吃了没用啊，我越来越难受了。' },
      { round: 2, role: 'student', content: '你个病人懂什么？别在这跟我抬杠。' },
      { round: 2, role: 'sp', content: '你这是什么态度！我要投诉你！' },
      { round: 3, role: 'student', content: '对不起……我刚才态度确实太差了。最近压力大，我不该冲您发火。' },
      { round: 3, role: 'sp', content: '算了，我也理解你们不容易。那您能重新帮我看一下吗？' },
    ],
  },
]

console.log('═'.repeat(60))
console.log('  增量模式验证')
console.log('═'.repeat(60))

let allPassed = true

for (const sc of SCENARIOS) {
  console.log(`\n──────────────────────────────`)
  console.log(`  场景: ${sc.name}`)
  console.log(`──────────────────────────────`)

  // ── 测试1: 规则引擎一致性（相同事件 → 相同 CM）──
  console.log('\n[1] 规则引擎: 批量 vs 增量（相同事件）')

  const batchExtraction = await extractEvents(sc.dialogue)
  if (!batchExtraction.success) {
    console.error(`  ❌ 批量提取失败: ${batchExtraction.error}`)
    allPassed = false
    continue
  }
  console.log(`  批量事件: ${batchExtraction.rounds.map(r => `R${r.round}=[${r.events.join(',')}]`).join(' ')}`)

  const batchResult = applyEvents(sc.initialCM, batchExtraction.rounds)

  const cm = initCM(sc.initialCM)
  for (const round of batchExtraction.rounds) {
    applyEventRound(cm, round.events)
  }

  const match = cm.concern.intensity === batchResult.finalCM.concern.intensity
    && cm.trust === batchResult.finalCM.trust
    && cm.stuck_count === batchResult.finalCM.stuck_count
    && cm.consecutive_avoidance === batchResult.finalCM.consecutive_avoidance
    && cm.conflict_trust_loss === batchResult.finalCM.conflict_trust_loss
    && cm.bad_news_triggered === batchResult.finalCM.bad_news_triggered

  console.log(`  批量: concern=${batchResult.finalCM.concern.intensity} trust=${batchResult.finalCM.trust} stuck=${batchResult.finalCM.stuck_count} avoid=${batchResult.finalCM.consecutive_avoidance}`)
  console.log(`  增量: concern=${cm.concern.intensity} trust=${cm.trust} stuck=${cm.stuck_count} avoid=${cm.consecutive_avoidance}`)

  if (match) {
    console.log(`  ✅ 规则引擎一致`)
  } else {
    console.log(`  ❌ 规则引擎不一致!`)
    allPassed = false
  }

  // ── 测试2: 增量 LLM 提取实际运行 ──
  console.log('\n[2] 增量 LLM 提取（逐轮独立调用）')
  const cm2 = initCM(sc.initialCM)
  let incrementalOk = true

  for (let r = 1; r <= batchExtraction.rounds.length; r++) {
    const roundDialogue = sc.dialogue.filter(d => d.round === r)
    const extraction = await extractRoundEvents(cm2, roundDialogue)

    if (!extraction.success) {
      console.log(`  Round ${r}: ❌ 提取失败 - ${extraction.error}`)
      incrementalOk = false
      break
    }

    applyEventRound(cm2, extraction.events)
    const ds = computeDerivedState(cm2)
    const ctx = buildStructuredContext(cm2)
    console.log(`  Round ${r}: [${extraction.events.join(', ')}] → c=${cm2.concern.intensity} t=${cm2.trust} s=${cm2.stuck_count} | ${ds.attitude}/${ds.emotion_constraint.intensity}-${ds.emotion_constraint.dominant}`)
    console.log(`           上下文: ${ctx.replace(/\n/g, ' | ')}`)
  }

  if (incrementalOk) {
    console.log(`  ✅ 增量 LLM 调用全部成功`)
  } else {
    allPassed = false
  }

  // ── 测试3: 跨轮变量持久化 ──
  console.log('\n[3] CM 跨轮变量')
  console.log(`  consecutive_avoidance: ${cm2.consecutive_avoidance}`)
  console.log(`  conflict_trust_loss:   ${cm2.conflict_trust_loss}`)
  console.log(`  bad_news_triggered:     ${cm2.bad_news_triggered}`)
  console.log(`  unresolved_goals:      [${cm2.unresolved_goals.join(', ')}]`)
}

console.log('\n' + '═'.repeat(60))
if (allPassed) {
  console.log('  ✅ 增量模式验证全部通过')
} else {
  console.log('  ❌ 存在未通过的测试')
  process.exit(1)
}
