// ═══════════════════════════════════════════════════════════════
// 反思脑 POC 验证脚本
// 验证目标:
//   1. 事件提取一致率 > 90% (同一对话 × 10 次)
//   2. 规则引擎确定性 = 100% (同一事件 × 100 次)
//   3. 状态变化轨迹合理性 (人工审查)
// ═══════════════════════════════════════════════════════════════

import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

// 加载 .env（必须在动态 import POC 模块之前完成，因为 POC 模块在 import 时读取 process.env）
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
  console.log('[poc] .env 已加载')
} catch (e) {
  console.log('[poc] .env 未找到, 使用已有环境变量')
}

// 动态导入（在 env 加载之后，确保模块初始化时能读到正确的 process.env）
const { applyEvents, verifyDeterminism } = await import('../services/sp-api/src/poc/event-mapping.js')
const { extractEvents, validateConsistency } = await import('../services/sp-api/src/poc/reflection-worker-poc.js')
const { computeDerivedState, derivedStatesEqual } = await import('../services/sp-api/src/poc/derived-state.js')

// ═══════════════════════════════════════════════════════════════
// 测试对话场景
// ═══════════════════════════════════════════════════════════════

const TEST_SCENARIOS = {
  // ── 场景1: 好消息 + 共情, 担忧逐步解除 ──
  scenario_good_news_empathy: {
    name: '好消息+共情 — 担忧逐步解除',
    initialCM: {
      concern: { primary: '担心是癌症', intensity: 8 },
      trust: 5,
      unresolved_goals: ['是不是癌症', '能不能治好'],
      stuck_count: 0,
    },
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

  // ── 场景2: 医生持续回避, 患者不满升级 ──
  scenario_doctor_avoidant: {
    name: '医生持续回避 — 不满升级',
    initialCM: {
      concern: { primary: '担心治不好', intensity: 7 },
      trust: 5,
      unresolved_goals: ['这个病能治好吗', '会不会影响工作'],
      stuck_count: 0,
    },
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

  // ── 场景3: 冲突后道歉, 关系修复 ──
  scenario_conflict_apology: {
    name: '冲突后道歉 — 关系修复',
    initialCM: {
      concern: { primary: '担心误诊', intensity: 6 },
      trust: 3,
      unresolved_goals: ['上次开的药为什么没效果'],
      stuck_count: 3,
    },
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

  // ── 场景4: 冷漠敷衍, 信任持续下降 ──
  scenario_cold_dismissive: {
    name: '冷漠敷衍 — 信任持续下降',
    initialCM: {
      concern: { primary: '孩子会不会有后遗症', intensity: 7 },
      trust: 6,
      unresolved_goals: ['治疗方案是什么', '会不会有后遗症'],
      stuck_count: 0,
    },
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

  // ── 场景5: 坏消息告知, 冲击性反应 ──
  scenario_bad_news_delivery: {
    name: '坏消息告知 — 冲击性反应',
    initialCM: {
      concern: { primary: '检查结果怎么样', intensity: 6 },
      trust: 6,
      unresolved_goals: ['是什么病', '严不严重', '能不能治'],
      stuck_count: 0,
    },
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

// ═══════════════════════════════════════════════════════════════
// Phase 1: 规则引擎确定性验证（纯代码，无 LLM，离线运行）
// ═══════════════════════════════════════════════════════════════

function testRuleEngineDeterminism() {
  console.log('═'.repeat(60))
  console.log('Phase 1: 规则引擎确定性验证')
  console.log('目标: 相同 events → 相同 finalCM (100%)')
  console.log('═\n'.repeat(2))

  const testCases = [
    {
      name: '好消息解除担忧',
      cm: { concern: { primary: '担心是癌症', intensity: 8 }, trust: 5, unresolved_goals: ['是不是癌症'], stuck_count: 1 },
      events: [
        { round: 1, events: ['good_news'] },
        { round: 2, events: ['empathy_shown'] },
      ],
    },
    {
      name: '冲突+道歉修复',
      cm: { concern: { primary: '担心误诊', intensity: 6 }, trust: 3, unresolved_goals: ['为什么没效果'], stuck_count: 3 },
      events: [
        { round: 1, events: ['dismissive', 'conflict'] },
        { round: 2, events: ['apology', 'concern_addressed'] },
      ],
    },
    {
      name: '持续回避积累',
      cm: { concern: { primary: '担心治不好', intensity: 7 }, trust: 5, unresolved_goals: ['能治好吗', '影响工作'], stuck_count: 0 },
      events: [
        { round: 1, events: ['question_avoided'] },
        { round: 2, events: ['concern_ignored'] },
        { round: 3, events: ['question_avoided', 'dismissive'] },
      ],
    },
    {
      name: '坏消息+共情挽救',
      cm: { concern: { primary: '是什么病', intensity: 6 }, trust: 6, unresolved_goals: ['是什么病', '能不能治'], stuck_count: 0 },
      events: [
        { round: 1, events: ['bad_news'] },
        { round: 2, events: ['empathy_shown'] },
        { round: 3, events: ['question_answered', 'concern_addressed'] },
      ],
    },
    {
      name: 'no_event 静默',
      cm: { concern: { primary: '例行复查', intensity: 3 }, trust: 7, unresolved_goals: [], stuck_count: 0 },
      events: [
        { round: 1, events: ['no_event'] },
        { round: 2, events: ['no_event'] },
        { round: 3, events: ['no_event'] },
      ],
    },
  ]

  let allPassed = true
  for (const tc of testCases) {
    const result = verifyDeterminism(tc.cm, tc.events, 100)
    const status = result.consistent ? 'PASS' : 'FAIL'
    if (!result.consistent) allPassed = false

    console.log(`[${status}] ${tc.name}`)
    if (result.consistent) {
      const end = result.finalState
      console.log(`  100 次运行, 输出一致`)
      console.log(`  最终状态: concern=${end.concern.primary}(intensity=${end.concern.intensity}), trust=${end.trust}, stuck=${end.stuck_count}, goals=${end.unresolved_goals.length}`)
    } else {
      console.log(`  第 ${result.divergentIndex} 次出现分歧`)
      console.log(`  预期: ${JSON.stringify(result.firstResult)}`)
      console.log(`  实际: ${JSON.stringify(result.divergentResult)}`)
    }
    console.log()
  }

  return allPassed
}

// ═══════════════════════════════════════════════════════════════
// Phase 2: 事件提取一致率验证（需 LLM API）
// ═══════════════════════════════════════════════════════════════

async function testExtractionConsistency(scenarioKey, runs = 10) {
  const scenario = TEST_SCENARIOS[scenarioKey]
  if (!scenario) {
    console.log(`错误: 场景 "${scenarioKey}" 不存在`)
    console.log(`可用场景: ${Object.keys(TEST_SCENARIOS).join(', ')}`)
    return null
  }

  console.log(`场景: ${scenario.name}`)
  console.log(`初始状态: concern=${scenario.initialCM.concern.primary}(I=${scenario.initialCM.concern.intensity}), trust=${scenario.initialCM.trust}, stuck=${scenario.initialCM.stuck_count}`)
  console.log(`对话轮次: ${Math.max(...scenario.dialogue.map(d => d.round))}`)
  console.log(`重复次数: ${runs}`)
  console.log('-'.repeat(40))

  const result = await validateConsistency(
    scenario.initialCM,
    scenario.dialogue,
    runs,
    { personality: 'default' }
  )

  return result
}

// ═══════════════════════════════════════════════════════════════
// Phase 3: 状态变化轨迹输出（人工审查用）
// ═══════════════════════════════════════════════════════════════

function printTrajectory(scenarioKey, consensusRounds) {
  const scenario = TEST_SCENARIOS[scenarioKey]
  if (!scenario || !consensusRounds) return

  const result = applyEvents(scenario.initialCM, consensusRounds, { personality: 'default' })

  console.log(`\n状态变化轨迹:`)
  console.log(`  Round 0: concern=${scenario.initialCM.concern.primary}(I=${scenario.initialCM.concern.intensity}), trust=${scenario.initialCM.trust}, stuck=${scenario.initialCM.stuck_count}`)
  for (const d of result.deltas) {
    const cm = d.cm_after
    console.log(`  Round ${d.round}: [${d.events.join(', ') || 'no_event'}] → concern(I=${cm.concern.intensity}), trust=${cm.trust}, stuck=${cm.stuck_count}`)
  }
  console.log()
}

// ═══════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════

async function main() {
  const args = process.argv.slice(2)
  const runLLM = args.includes('--llm')
  const scenarioArg = args.find(a => a.startsWith('--scenario='))
  const scenarioName = scenarioArg ? scenarioArg.split('=')[1] : null
  const runsArg = args.find(a => a.startsWith('--runs='))
  const runs = runsArg ? parseInt(runsArg.split('=')[1]) : 10

  console.log('AI-SP 反思脑 POC 验证')
  console.log(`时间: ${new Date().toISOString()}`)
  console.log()

  // ── Phase 1: 规则引擎确定性（不需要 API） ──
  const ruleEngineOK = testRuleEngineDeterminism()

  if (ruleEngineOK) {
    console.log('✓ Phase 1 通过: 规则引擎 100% 确定性')
  } else {
    console.log('✗ Phase 1 失败: 规则引擎存在不确定性 — 必须修复后再进行后续测试')
    process.exit(1)
  }

  // ── Phase 2: 事件提取一致率（需要 API） ──
  if (!runLLM) {
    console.log()
    console.log('═'.repeat(60))
    console.log('Phase 2 跳过: 未指定 --llm 参数')
    console.log('运行完整验证: node scripts/test-reflection-poc.mjs --llm')
    console.log('指定场景:     node scripts/test-reflection-poc.mjs --llm --scenario=scenario_good_news_empathy')
    console.log('指定次数:     node scripts/test-reflection-poc.mjs --llm --runs=5')
    console.log()
    console.log('可用场景:')
    for (const [key, sc] of Object.entries(TEST_SCENARIOS)) {
      console.log(`  ${key} — ${sc.name}`)
    }
    return
  }

  // 检查 API Key
  if (!process.env.LLM_API_KEY) {
    console.log('错误: 未设置 LLM_API_KEY 环境变量')
    process.exit(1)
  }

  console.log()
  console.log('═'.repeat(60))
  console.log('Phase 2: 事件提取一致率验证')
  console.log(`模型: ${process.env.REFLECTION_MODEL || 'qwen-plus'} (可通过 REFLECTION_MODEL 环境变量覆盖)`)
  console.log('═\n'.repeat(2))

  const scenarios = scenarioName
    ? [scenarioName]
    : Object.keys(TEST_SCENARIOS)

  const results = {}

  for (const key of scenarios) {
    console.log(`运行: ${key}`)
    const result = await testExtractionConsistency(key, runs)

    if (!result) continue

    results[key] = result

    // 诊断: 显示失败的运行
    const failedRuns = result.allResults.filter(r => !r.success)
    // 显示不同提取模式的对比
    if (result.uniqueExtractionPatterns > 1) {
      console.log(`  ⚠ ${result.uniqueExtractionPatterns} 种不同提取模式:`)
      // 收集每种模式
      const patternMap = new Map()
      for (const r of result.allResults) {
        if (!r.success || !r.extraction) continue
        const key = JSON.stringify(r.extraction)
        if (!patternMap.has(key)) {
          patternMap.set(key, { count: 0, extraction: r.extraction, finalCM: r.finalCM })
        }
        patternMap.get(key).count++
      }
      let pIdx = 0
      for (const [key, p] of patternMap) {
        pIdx++
        console.log(`    模式${pIdx} (${p.count}次): ${key}`)
      }
    }

    const passed = result.extractionConsistency >= 0.9
    console.log(`${passed ? '✓' : '✗'} 事件提取一致率: ${(result.extractionConsistency * 100).toFixed(1)}% (${result.successfulExtractions}/${result.runs})`)
    console.log(`  提取模式数: ${result.uniqueExtractionPatterns} | CM 状态数: ${result.uniqueCMs}`)

    // Derived State 一致性 (teacher-observable)
    const derivedStates = result.allResults
      .filter(r => r.success && r.finalCM)
      .map(r => computeDerivedState(r.finalCM))
    const uniqueDS = new Set(derivedStates.map(s => JSON.stringify(s)))
    const dsConsistency = derivedStates.length > 0
      ? Math.round((1 - (uniqueDS.size - 1) / derivedStates.length) * 1000) / 1000
      : 0
    console.log(`  Derived State 状态数: ${uniqueDS.size} (可观测一致性: ${(dsConsistency * 100).toFixed(0)}%)`)

    // 打印共识轨迹
    if (result.consensusExtraction) {
      printTrajectory(key, result.consensusExtraction)
    }

    console.log()
  }

  // ── 汇总 ──
  console.log('═'.repeat(60))
  console.log('验证汇总')
  console.log('═\n'.repeat(2))

  console.log(`| 场景 | 提取一致率 | CM一致率 | 模式数 | 通过 |`)
  console.log(`|------|-----------|---------|--------|------|`)

  let totalPassed = 0
  for (const [key, r] of Object.entries(results)) {
    const passed = r.extractionConsistency >= 0.9
    if (passed) totalPassed++
    const name = TEST_SCENARIOS[key]?.name || key
    console.log(`| ${name} | ${(r.extractionConsistency * 100).toFixed(1)}% | ${(r.cmConsistency * 100).toFixed(1)}% | ${r.uniqueExtractionPatterns} | ${passed ? '✓' : '✗'} |`)
  }

  console.log()
  console.log(`总计: ${totalPassed}/${Object.keys(results).length} 场景通过 (>90% 一致率)`)

  if (totalPassed === Object.keys(results).length) {
    console.log('✓ Phase 2 通过: 所有场景事件提取一致率 > 90%')
    console.log()
    console.log('下一步: 人工审查状态变化轨迹, 判断是否像真人')
    console.log('如通过 → 进入 Phase 3 (离线回放) + Phase 4 (接入现有 AI-SP)')
  } else {
    console.log('✗ Phase 2 未通过: 部分场景一致率不达标')
    console.log('建议: 审查不一致场景的 rawOutput, 优化事件提取 prompt')
  }
}

main().catch(e => {
  console.error('验证脚本异常:', e)
  process.exit(1)
})
