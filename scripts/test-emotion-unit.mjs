// 情绪引擎 v4.0 单元测试 — 无需 LLM/服务器，纯逻辑验证
import {
  createEmotionEngine, derivePersonality, validateLLMOutput
} from '../packages/shared/src/emotion-engine.js'

let passed = 0
let failed = 0
const failures = []

function check(name, condition, detail = '') {
  if (condition) { passed++; return true }
  failed++
  failures.push({ name, detail })
  console.log(`  ❌ ${name}: ${detail}`)
  return false
}

function section(title) {
  console.log(`\n${'═'.repeat(56)}`)
  console.log(`  ${title}`)
  console.log(`${'═'.repeat(56)}`)
}

// ═══════════════════════════════════════════════════════════════
// Test 1: peakCooldown — 愤怒触及10后道歉不能瞬间清零
// ═══════════════════════════════════════════════════════════════
section('Test 1: peakCooldown — 愤怒峰值冷却')

{
  const engine = createEmotionEngine(
    { anxious: 4, calm: 3, fearful: 2, trust: 3, rapport: 3 },
    'history-taking',
    derivePersonality({ expressiveness: '火爆型', sensitivity: '普通敏感度', resilience: '普通恢复力' })
  )

  engine.applyLLMScore({ angry: 10, fearful: 2, sad: 0 }, 'aggressive', false, 10, false)
  const v1 = engine.getVector()
  check('攻击后angry达到10', v1.angry >= 9.5, `angry=${v1.angry.toFixed(1)}`)

  engine.preUpdate()
  engine.applyLLMScore({ angry: 0, fearful: 1, sad: 0 }, 'reassuring', false, 10, false)
  const v2 = engine.getVector()
  // peakCooldown: preUpdate不衰减 + applyLLMScore maxDown≤1.0 → Δ≤1.0
  check('道歉后angry未清零(≥7.5)', v2.angry >= 7.5, `angry=${v2.angry.toFixed(1)}`)
  check('道歉后angry下降≤1.5', v1.angry - v2.angry <= 1.5, `Δ=${(v1.angry - v2.angry).toFixed(1)}`)
}

// ═══════════════════════════════════════════════════════════════
// Test 2: peakCooldown — 3轮冷却后解除（普通型）
// ═══════════════════════════════════════════════════════════════
section('Test 2: peakCooldown — 冷却递减与解除')

{
  const engine = createEmotionEngine(
    { anxious: 3, calm: 3, fearful: 2, trust: 3, rapport: 3 },
    'history-taking',
    derivePersonality({ expressiveness: '普通型', sensitivity: '普通敏感度', resilience: '普通恢复力' })
  )

  engine.applyLLMScore({ angry: 10, fearful: 2, sad: 0 }, 'aggressive', false, 10, false)
  const v0 = engine.getVector()
  check('angry达到10', v0.angry >= 9.5, `angry=${v0.angry.toFixed(1)}`)

  // 冷却轮1: peakCooldown.angry 3→2
  engine.preUpdate()
  engine.applyLLMScore({ angry: 0, fearful: 1, sad: 0 }, 'reassuring', false, 15, false)
  const v1 = engine.getVector()

  // 冷却轮2: 2→1
  engine.preUpdate()
  engine.applyLLMScore({ angry: 0, fearful: 1, sad: 0 }, 'reassuring', false, 15, false)
  const v2 = engine.getVector()

  // 冷却轮3: 1→0
  engine.preUpdate()
  engine.applyLLMScore({ angry: 0, fearful: 1, sad: 0 }, 'reassuring', false, 15, false)
  const v3 = engine.getVector()

  // 冷却结束
  engine.preUpdate()
  engine.applyLLMScore({ angry: 0, fearful: 1, sad: 0 }, 'reassuring', false, 15, false)
  const v4 = engine.getVector()

  check('冷却期内angry持续下降', v1.angry <= v0.angry && v2.angry <= v1.angry && v3.angry <= v2.angry,
    `${v0.angry.toFixed(1)}→${v1.angry.toFixed(1)}→${v2.angry.toFixed(1)}→${v3.angry.toFixed(1)}`)
  // 4轮安抚后(3轮冷却+1轮正常)，angry应显著降低
  check('4轮安抚后angry≤3', v4.angry <= 3.0, `angry=${v4.angry.toFixed(1)}`)
}

// ═══════════════════════════════════════════════════════════════
// Test 3: angryCollapseTimer — 持续愤怒≥8，4轮终止
// ═══════════════════════════════════════════════════════════════
section('Test 3: angryCollapseTimer — 持续愤怒终止')

{
  const engine = createEmotionEngine(
    { anxious: 3, calm: 3, fearful: 2, trust: 3, rapport: 3 },
    'history-taking',
    derivePersonality({ expressiveness: '普通型', sensitivity: '普通敏感度', resilience: '普通恢复力' })
  )

  // 推高angry到9.5 + 3轮维持 ≥9 → 共4轮，应触发angry_collapse（阈值9.0）
  engine.applyLLMScore({ angry: 9.5, fearful: 2, sad: 0 }, 'aggressive', false, 10, false)
  let term = engine.getTerminationState()
  check('第1轮angry=9.5无终止', term === null, `term=${term?.type || 'none'}`)

  for (let i = 2; i <= 4; i++) {
    engine.preUpdate()
    engine.applyLLMScore({ angry: 9.5, fearful: 2, sad: 0 }, 'neutral', false, 10, false)
    term = engine.getTerminationState()
    if (i < 4) {
      check(`第${i}轮angry≥9无终止`, term === null, `term=${term?.type || 'none'}`)
    }
  }
  check('第4轮触发angry_collapse', term?.type === 'angry_collapse', `term=${term?.type}`)
}

// ═══════════════════════════════════════════════════════════════
// Test 4: trust_broken — trust≤1.5 直接终止
// ═══════════════════════════════════════════════════════════════
section('Test 4: trust_broken — 信任崩溃终止')

{
  const engine = createEmotionEngine(
    { anxious: 3, calm: 3, fearful: 2, trust: 3, rapport: 3 },
    'history-taking',
    derivePersonality({ expressiveness: '普通型', sensitivity: '普通敏感度', resilience: '普通恢复力' })
  )

  for (let i = 0; i < 6; i++) {
    engine.preUpdate()
    engine.applyLLMScore({ angry: 2, fearful: 2, sad: 0 }, 'aggressive', false, 10, false)
  }
  const term = engine.getTerminationState()
  check('多轮攻击后trust≤1.5触发trust_broken', term?.type === 'trust_broken',
    `trust=${engine.getVector().trust.toFixed(1)}, term=${term?.type}`)
}

// ═══════════════════════════════════════════════════════════════
// Test 5: fearfulCollapseTimer — 恐惧≥9.5，3轮终止
// ═══════════════════════════════════════════════════════════════
section('Test 5: fearfulCollapseTimer — 恐惧崩溃终止')

{
  const engine = createEmotionEngine(
    { anxious: 3, calm: 3, fearful: 2, trust: 3, rapport: 3 },
    'history-taking',
    derivePersonality({ expressiveness: '普通型', sensitivity: '高敏感', resilience: '普通恢复力' })
  )

  // 第1轮: fearful=10, timer 0→1
  engine.applyLLMScore({ angry: 0, fearful: 10, sad: 0 }, 'neutral', false, 10, false)
  let term = engine.getTerminationState()
  check('第1轮fearful=10无终止', term === null, `term=${term?.type || 'none'}`)

  // 第2轮: 1→2
  engine.preUpdate()
  engine.applyLLMScore({ angry: 0, fearful: 10, sad: 0 }, 'neutral', false, 10, false)
  term = engine.getTerminationState()
  check('第2轮fearful≥9.5无终止', term === null, `term=${term?.type || 'none'}`)

  // 第3轮: 2→3 触发
  engine.preUpdate()
  engine.applyLLMScore({ angry: 0, fearful: 10, sad: 0 }, 'neutral', false, 10, false)
  term = engine.getTerminationState()
  check('第3轮触发fear_collapse', term?.type === 'fear_collapse', `term=${term?.type}`)
}

// ═══════════════════════════════════════════════════════════════
// Test 6: sadCollapseTimer — 悲伤≥9.5，3轮终止
// ═══════════════════════════════════════════════════════════════
section('Test 6: sadCollapseTimer — 悲伤崩溃终止')

{
  const engine = createEmotionEngine(
    { anxious: 3, calm: 3, fearful: 2, trust: 3, rapport: 3 },
    'history-taking',
    derivePersonality({ expressiveness: '普通型', sensitivity: '高敏感', resilience: '低豁达' })
  )

  engine.applyLLMScore({ angry: 0, fearful: 2, sad: 10 }, 'neutral', false, 10, false)
  let term = engine.getTerminationState()
  check('第1轮sad=10无终止', term === null, `term=${term?.type || 'none'}`)

  engine.preUpdate()
  engine.applyLLMScore({ angry: 0, fearful: 2, sad: 10 }, 'neutral', false, 10, false)
  term = engine.getTerminationState()
  check('第2轮sad≥9.5无终止', term === null, `term=${term?.type || 'none'}`)

  engine.preUpdate()
  engine.applyLLMScore({ angry: 0, fearful: 2, sad: 10 }, 'neutral', false, 10, false)
  term = engine.getTerminationState()
  check('第3轮触发sad_collapse', term?.type === 'sad_collapse', `term=${term?.type}`)
}

// ═══════════════════════════════════════════════════════════════
// Test 7: 三维峰值冷却互相独立
// ═══════════════════════════════════════════════════════════════
section('Test 7: 三维峰值冷却互相独立')

{
  const engine = createEmotionEngine(
    { anxious: 3, calm: 3, fearful: 1, sad: 0, angry: 0, trust: 3, rapport: 3 },
    'history-taking',
    derivePersonality({ expressiveness: '普通型', sensitivity: '普通敏感度', resilience: '普通恢复力' })
  )

  // 先触发angry封顶
  engine.applyLLMScore({ angry: 10, fearful: 2, sad: 0 }, 'aggressive', false, 10, false)
  const v0 = engine.getVector()

  // 再触发fearful封顶（angry仍在冷却中）
  engine.preUpdate()
  engine.applyLLMScore({ angry: 10, fearful: 10, sad: 0 }, 'neutral', false, 10, false)
  const v1 = engine.getVector()
  check('fearful也达到10', v1.fearful >= 9.5, `fearful=${v1.fearful.toFixed(1)}`)

  // 道歉 — angry和fearful都应被cap
  engine.preUpdate()
  engine.applyLLMScore({ angry: 0, fearful: 0, sad: 0 }, 'reassuring', false, 15, false)
  const v2 = engine.getVector()
  check('道歉后angry保底≥2.0', v2.angry >= 2.0, `angry=${v2.angry.toFixed(1)}`)
  check('道歉后fearful保底≥2.0', v2.fearful >= 2.0, `fearful=${v2.fearful.toFixed(1)}`)
}

// ═══════════════════════════════════════════════════════════════
// Test 8: patienceExhausted — 攻击→道歉循环降低容忍度
// ═══════════════════════════════════════════════════════════════
section('Test 8: patienceExhausted — 道歉滥用追踪')

{
  const engine = createEmotionEngine(
    { anxious: 3, calm: 3, fearful: 2, angry: 0, trust: 3, rapport: 3 },
    'history-taking',
    derivePersonality({ expressiveness: '普通型', sensitivity: '高敏感', resilience: '普通恢复力' })
  )

  // 第1次：攻击→道歉
  engine.applyLLMScore({ angry: 9.5, fearful: 2, sad: 0 }, 'aggressive', false, 10, false)
  engine.preUpdate()
  engine.applyLLMScore({ angry: 5, fearful: 2, sad: 0 }, 'reassuring', false, 15, false)
  const v1 = engine.getVector()
  check('第1次道歉后angry保底≥2.0', v1.angry >= 2.0, `angry=${v1.angry.toFixed(1)}`)

  // 第2次：攻击→道歉（耐心从1→2，保底升至4.0）
  engine.preUpdate()
  engine.applyLLMScore({ angry: 9.5, fearful: 2, sad: 0 }, 'aggressive', false, 10, false)
  engine.preUpdate()
  engine.applyLLMScore({ angry: 5, fearful: 2, sad: 0 }, 'reassuring', false, 15, false)
  const v2 = engine.getVector()
  check('第2次道歉后angry保底≥4.0(耐心耗尽)', v2.angry >= 4.0, `angry=${v2.angry.toFixed(1)}`)
}

// ═══════════════════════════════════════════════════════════════
// Test 9: getEmotionGuidance — 极端状态行为引导
// ═══════════════════════════════════════════════════════════════
section('Test 9: getEmotionGuidance — 极端情绪行为引导')

{
  // 用普通型以正确触发furious/broken/very_fearful状态
  const engine = createEmotionEngine(
    { anxious: 3, calm: 3, fearful: 2, angry: 0, sad: 0, trust: 3, rapport: 3 },
    'history-taking',
    derivePersonality({ expressiveness: '普通型', sensitivity: '普通敏感度', resilience: '低豁达' })
  )

  // 触发angry封顶
  engine.applyLLMScore({ angry: 10, fearful: 2, sad: 0 }, 'aggressive', false, 10, false)
  const guidance = engine.getEmotionGuidance()
  check('furious冷却期包含"大吼大叫"', guidance.includes('大吼大叫'), `guidance片段: ${guidance.substring(0, 80)}...`)
  check('furious冷却期包含"拍桌"', guidance.includes('拍桌'), `guidance片段: ${guidance.substring(0, 80)}...`)
  check('furious冷却期包含"🔴"', guidance.includes('🔴'), `guidance片段: ${guidance.substring(0, 80)}...`)

  // 重置后用sad触发（注意：fearful必须为0，否则"uneasy"会优先于"broken"）
  engine.reset()
  engine.applyLLMScore({ angry: 0, fearful: 0, sad: 10 }, 'neutral', false, 10, false)
  const guidance2 = engine.getEmotionGuidance()
  check('broken冷却期包含"大哭"', guidance2.includes('大哭'), `guidance片段: ${guidance2.substring(0, 80)}...`)
  check('broken冷却期包含"泣不成声"', guidance2.includes('泣不成声'), `guidance片段: ${guidance2.substring(0, 80)}...`)

  // 重置后用fearful触发
  engine.reset()
  engine.applyLLMScore({ angry: 0, fearful: 10, sad: 0 }, 'neutral', false, 10, false)
  const guidance3 = engine.getEmotionGuidance()
  check('very_fearful冷却期包含"声音发抖"', guidance3.includes('声音发抖'), `guidance片段: ${guidance3.substring(0, 80)}...`)
  check('very_fearful冷却期包含"反复追问"', guidance3.includes('反复追问'), `guidance片段: ${guidance3.substring(0, 80)}...`)
}

// ═══════════════════════════════════════════════════════════════
// Test 10: 连续安抚在冷却期内效果减半
// ═══════════════════════════════════════════════════════════════
section('Test 10: consecutiveReassuring 冷却期减半')

{
  const engine = createEmotionEngine(
    { anxious: 3, calm: 3, fearful: 2, angry: 0, sad: 0, trust: 3, rapport: 3 },
    'history-taking',
    derivePersonality({ expressiveness: '普通型', sensitivity: '普通敏感度', resilience: '普通恢复力' })
  )

  engine.applyLLMScore({ angry: 10, fearful: 2, sad: 0 }, 'aggressive', false, 10, false)

  // 连续3轮安抚（冷却期内consecutiveReassuring bonus减半: 0.4×N）
  for (let i = 0; i < 3; i++) {
    engine.preUpdate()
    engine.applyLLMScore({ angry: 3, fearful: 2, sad: 0 }, 'reassuring', false, 15, false)
  }
  const vFinal = engine.getVector()
  check('3轮安抚后angry明显下降(≤5)', vFinal.angry <= 5.0, `angry=${vFinal.angry.toFixed(1)}`)
  check('3轮安抚后angry≥2.0(保底)', vFinal.angry >= 2.0, `angry=${vFinal.angry.toFixed(1)}`)
}

// ═══════════════════════════════════════════════════════════════
// Test 11: reset 清空所有冷却状态
// ═══════════════════════════════════════════════════════════════
section('Test 11: reset 清空所有状态')

{
  const engine = createEmotionEngine(
    { anxious: 3, calm: 3, fearful: 2, angry: 0, sad: 0, trust: 3, rapport: 3 },
    'history-taking',
    derivePersonality({ expressiveness: '普通型', sensitivity: '普通敏感度', resilience: '普通恢复力' })
  )

  engine.applyLLMScore({ angry: 10, fearful: 10, sad: 10 }, 'aggressive', false, 10, false)
  engine.reset()

  const v = engine.getVector()
  check('reset后angry重置', v.angry <= 1, `angry=${v.angry.toFixed(1)}`)
  check('reset后fearful重置', v.fearful <= 2, `fearful=${v.fearful.toFixed(1)}`)
  check('reset后sad重置', v.sad <= 1, `sad=${v.sad.toFixed(1)}`)
  check('reset后无终止状态', engine.getTerminationState() === null, `term=${engine.getTerminationState()?.type || 'none'}`)
}

// ═══════════════════════════════════════════════════════════════
// Test 12: validateLLMOutput — 自洽性校验
// ═══════════════════════════════════════════════════════════════
section('Test 12: validateLLMOutput — LLM输出校验')

{
  const r1 = validateLLMOutput({ text: '测试', emotion_score: { angry: 0 }, intent: 'aggressive' })
  check('aggressive+angry=0 → neutral', r1.intent === 'neutral', `intent=${r1.intent}`)

  const r2 = validateLLMOutput({ text: '测试', emotion_score: { angry: 0.5 }, intent: 'dismissive' })
  check('dismissive+angry<1 → neutral', r2.intent === 'neutral', `intent=${r2.intent}`)

  const r3 = validateLLMOutput({ text: '道歉', emotion_score: { angry: 9 }, intent: 'reassuring' })
  check('reassuring+angry≥8 → neutral', r3.intent === 'neutral', `intent=${r3.intent}`)

  const r4 = validateLLMOutput({ text: '攻击', emotion_score: { angry: 5 }, intent: 'aggressive' })
  check('aggressive+angry=5 → 保留aggressive', r4.intent === 'aggressive', `intent=${r4.intent}`)

  const r5 = validateLLMOutput({ text: '测试', emotion_score: {}, intent: 'invalid' })
  check('非法intent → neutral', r5.intent === 'neutral', `intent=${r5.intent}`)
}

// ═══════════════════════════════════════════════════════════════
// Test 13: 火爆型快速衰减（未触及10，无peakCooldown）
// ═══════════════════════════════════════════════════════════════
section('Test 13: 火爆型正常衰减（未触及10）')

{
  const engine = createEmotionEngine(
    { anxious: 3, calm: 3, fearful: 2, angry: 0, trust: 3, rapport: 3 },
    'history-taking',
    derivePersonality({ expressiveness: '火爆型', sensitivity: '普通敏感度', resilience: '普通恢复力' })
  )

  // 用cold意图推高angry到8.5（neutral会cap在+0.5，aggressive会触发angryEverPeaked*1.3→10→peakCooldown）
  engine.applyLLMScore({ angry: 8.5, fearful: 2, sad: 0 }, 'cold', false, 10, false)
  const v1 = engine.getVector()
  check('angry=8.5', v1.angry >= 8.0 && v1.angry < 10, `angry=${v1.angry.toFixed(1)}`)

  // 火爆型 peakDuration=1, preUpdate会正常衰减1.5（无peakCooldown干扰）
  engine.preUpdate()
  const v2 = engine.getVector()
  check('火爆型preUpdate后angry下降', v2.angry <= v1.angry - 1.0,
    `${v1.angry.toFixed(1)}→${v2.angry.toFixed(1)}`)

  // 道歉仍然有效（无peakCooldown限制）
  engine.applyLLMScore({ angry: 0, fearful: 1, sad: 0 }, 'reassuring', false, 15, false)
  const v3 = engine.getVector()
  check('火爆型道歉后下降明显', v3.angry <= v2.angry - 1.0,
    `${v2.angry.toFixed(1)}→${v3.angry.toFixed(1)}`)
}

// ═══════════════════════════════════════════════════════════════
// 结果
// ═══════════════════════════════════════════════════════════════
console.log(`\n${'═'.repeat(56)}`)
console.log(`  结果: ${passed} 通过 / ${failed} 失败 / ${passed + failed} 总计`)
console.log(`${'═'.repeat(56)}`)

if (failed > 0) {
  console.log(`\n失败详情:`)
  for (const f of failures) {
    console.log(`  ❌ ${f.name}: ${f.detail}`)
  }
}

process.exit(failed > 0 ? 1 : 0)
