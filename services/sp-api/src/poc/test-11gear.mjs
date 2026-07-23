// ═══════════════════════════════════════════════════════════════
// 11档系统全量验证脚本
// ═══════════════════════════════════════════════════════════════

import { decideGear, getGearAV, getGearStrategy, gearToIntent } from './gear-system.js'
import { initCM, applyEventRound, applyEvents, verifyDeterminism } from './event-mapping.js'

let passed = 0
let failed = 0
function assert(cond, label) {
  if (cond) { passed++; return true }
  console.log(`  ❌ FAIL: ${label}`)
  failed++
  return false
}

function makeCM(overrides = {}) {
  return initCM({
    concern: { primary: 'test', intensity: 5 },
    trust: 5,
    ...overrides
  })
}

function makeDS(dominant = 'calm', attitude = 'neutral') {
  return { emotion_constraint: { dominant }, attitude }
}

// ═══════════════════════════════════════════════════════════
// 1. 阻尼器优先（不计滞后）
// ═══════════════════════════════════════════════════════════
console.log('\n── 1. 阻尼器优先 ──')

const cmBase = makeCM()
const dsBase = makeDS()

assert(decideGear(cmBase, 10, dsBase) === '暴怒', 'angerLevel=10 → 暴怒')
assert(decideGear(cmBase, 7, dsBase) === '暴怒', 'angerLevel=7 → 暴怒')
assert(decideGear(cmBase, 7.5, dsBase) === '暴怒', 'angerLevel=7.5 → 暴怒')
assert(decideGear(cmBase, 6.9, dsBase) === '愤怒', 'angerLevel=6.9 → 愤怒')
assert(decideGear(cmBase, 4, dsBase) === '愤怒', 'angerLevel=4 → 愤怒')
assert(decideGear(cmBase, 3.9, dsBase) === '不满', 'angerLevel=3.9 → 不满')
assert(decideGear(cmBase, 1, dsBase) === '不满', 'angerLevel=1 → 不满')
assert(decideGear(cmBase, 0.9, dsBase) === '中立', 'angerLevel=0.9 → 中立（阻尼器无档位）')
assert(decideGear(cmBase, 0, dsBase) === '中立', 'angerLevel=0 → 中立')

// ═══════════════════════════════════════════════════════════
// 2. 跨轮累积升级（无滞后）
// ═══════════════════════════════════════════════════════════
console.log('\n── 2. 跨轮累积升级 ──')

assert(decideGear(makeCM({ stuck_count: 6 }), 0, dsBase) === '愤怒', 'stuck≥6 → 愤怒')
assert(decideGear(makeCM({ stuck_count: 4 }), 0, dsBase) === '不满', 'stuck≥4 → 不满')
assert(decideGear(makeCM({ consecutive_avoidance: 2 }), 0, dsBase) === '不满', 'avoid≥2 → 不满')
assert(decideGear(makeCM({ stuck_count: 3, consecutive_avoidance: 1 }), 0, dsBase) === '中立', 'stuck=3+avoid=1 → 中立（未达阈值）')

// ═══════════════════════════════════════════════════════════
// 3. 退缩（带退出滞后）
// ═══════════════════════════════════════════════════════════
console.log('\n── 3. 退缩（滞后：进bad_news+trust≤3+concern≥7，退concern<4或trust>5）──')

const retreatCM = makeCM({ bad_news_triggered: true, trust: 3, concern: { primary: 'test', intensity: 7 } })
assert(decideGear(retreatCM, 0, dsBase) === '退缩', '退缩进入: bad_news+trust≤3+concern≥7')

// 保持（在滞后范围内）
assert(decideGear(makeCM({ bad_news_triggered: true, trust: 3, concern: { primary: 'test', intensity: 7 } }), 0, dsBase, '退缩') === '退缩', '退缩保持: 同条件+prev=退缩')
assert(decideGear(makeCM({ bad_news_triggered: true, trust: 5, concern: { primary: 'test', intensity: 4 } }), 0, dsBase, '退缩') === '退缩', '退缩保持: trust=5+concern=4+prev=退缩')

// 退出
assert(decideGear(makeCM({ bad_news_triggered: true, trust: 3, concern: { primary: 'test', intensity: 3 } }), 0, dsBase, '退缩') === '中立', '退缩退出: concern<4')
assert(decideGear(makeCM({ bad_news_triggered: true, trust: 6, concern: { primary: 'test', intensity: 7 } }), 0, dsBase, '退缩') === '中立', '退缩退出: trust>5但concern=7, trust=6<7 → 中立')

// ═══════════════════════════════════════════════════════════
// 4. 焦虑（带退出滞后）
// ═══════════════════════════════════════════════════════════
console.log('\n── 4. 焦虑（滞后：进concern≥9+fear+unresolved，退concern<6或unresolved空且concern<8）──')

const anxDS = makeDS('fear')
const anxCM = makeCM({ concern: { primary: 'test', intensity: 9 }, unresolved_goals: ['q1'] })
assert(decideGear(anxCM, 0, anxDS) === '焦虑', '焦虑进入: concern≥9+fear+unresolved')

// 保持
assert(decideGear(makeCM({ concern: { primary: 'test', intensity: 6 }, unresolved_goals: ['q1'] }), 0, anxDS, '焦虑') === '焦虑', '焦虑保持: concern=6+fear+unresolved+prev=焦虑')
assert(decideGear(makeCM({ concern: { primary: 'test', intensity: 8 }, unresolved_goals: [] }), 0, anxDS, '焦虑') === '焦虑', '焦虑保持: concern=8+fear+unresolved空+prev=焦虑')

// 退出
assert(decideGear(makeCM({ concern: { primary: 'test', intensity: 5 }, unresolved_goals: ['q1'] }), 0, anxDS, '焦虑') === '中立', '焦虑退出: concern=5，不满足焦虑保持(需≥6)也不满足不安进入(需≥6) → 中立')

// ═══════════════════════════════════════════════════════════
// 5. 不安（带退出滞后）
// ═══════════════════════════════════════════════════════════
console.log('\n── 5. 不安（滞后：进concern≥6+fear+unresolved，退concern<4或unresolved空）──')

const uneaseCM = makeCM({ concern: { primary: 'test', intensity: 6 }, unresolved_goals: ['q1'] })
assert(decideGear(uneaseCM, 0, anxDS) === '不安', '不安进入: concern≥6+fear+unresolved')

// 保持
assert(decideGear(makeCM({ concern: { primary: 'test', intensity: 4 }, unresolved_goals: ['q1'] }), 0, anxDS, '不安') === '不安', '不安保持: concern=4+fear+unresolved+prev=不安')

// 退出
assert(decideGear(makeCM({ concern: { primary: 'test', intensity: 3 }, unresolved_goals: ['q1'] }), 0, anxDS, '不安') === '中立', '不安退出: concern<4')
assert(decideGear(makeCM({ concern: { primary: 'test', intensity: 6 }, unresolved_goals: [] }), 0, anxDS, '不安') === '中立', '不安退出: unresolved空')

// ═══════════════════════════════════════════════════════════
// 6. 防御（信任破裂，无滞后）
// ═══════════════════════════════════════════════════════════
console.log('\n── 6. 防御（trust≤2立即触发）──')

assert(decideGear(makeCM({ trust: 2 }), 0, dsBase) === '防御', '防御: trust=2')
assert(decideGear(makeCM({ trust: 0 }), 0, dsBase) === '防御', '防御: trust=0')
assert(decideGear(makeCM({ trust: 3 }), 0, dsBase) === '中立', '防御未触发: trust=3')

// ═══════════════════════════════════════════════════════════
// 7. 消沉（带退出滞后）
// ═══════════════════════════════════════════════════════════
console.log('\n── 7. 消沉（滞后：进sadness+concern≥5，退dominant≠sadness或concern<3）──')

const sadDS = makeDS('sadness')
const melCM = makeCM({ concern: { primary: 'test', intensity: 5 } })
assert(decideGear(melCM, 0, sadDS) === '消沉', '消沉进入: sadness+concern≥5')

// 保持
assert(decideGear(makeCM({ concern: { primary: 'test', intensity: 3 } }), 0, sadDS, '消沉') === '消沉', '消沉保持: sadness+concern=3+prev=消沉')

// 退出
assert(decideGear(makeCM({ concern: { primary: 'test', intensity: 2 } }), 0, sadDS, '消沉') === '中立', '消沉退出: concern<3')

// ═══════════════════════════════════════════════════════════
// 8. 失望（带退出滞后）
// ═══════════════════════════════════════════════════════════
console.log('\n── 8. 失望（滞后：进trust=3-5+trustPeak≥6，退trust≥6→配合/trust≤2→防御）──')

const disCM = makeCM({ trust: 4, trust_peak: 7 })
assert(decideGear(disCM, 0, dsBase) === '失望', '失望进入: trust=4+trustPeak=7')

// 保持
assert(decideGear(makeCM({ trust: 3, trust_peak: 7 }), 0, dsBase, '失望') === '失望', '失望保持: trust=3+trustPeak=7+prev=失望')
assert(decideGear(makeCM({ trust: 5, trust_peak: 7 }), 0, dsBase, '失望') === '失望', '失望保持: trust=5+trustPeak=7+prev=失望')

// 退出恢复
assert(decideGear(makeCM({ trust: 6, trust_peak: 7 }), 0, dsBase, '失望') === '配合', '失望退出→配合: trust=6')

// trust降到防御
assert(decideGear(makeCM({ trust: 2, trust_peak: 7 }), 0, dsBase, '失望') === '防御', '失望→防御: trust=2')

// ═══════════════════════════════════════════════════════════
// 9. 配合（带退出滞后）
// ═══════════════════════════════════════════════════════════
console.log('\n── 9. 配合（滞后：进trust≥7+concern≤4，退trust<5或concern>7）──')

const coopCM = makeCM({ trust: 8, concern: { primary: 'test', intensity: 3 } })
assert(decideGear(coopCM, 0, dsBase) === '配合', '配合进入: trust≥7+concern≤4')

// 保持
assert(decideGear(makeCM({ trust: 5, concern: { primary: 'test', intensity: 7 } }), 0, dsBase, '配合') === '配合', '配合保持: trust=5+concern=7+prev=配合')

// 退出
assert(decideGear(makeCM({ trust: 4, concern: { primary: 'test', intensity: 3 } }), 0, dsBase, '配合') === '中立', '配合退出: trust<5')

// ═══════════════════════════════════════════════════════════
// 10. GEAR_AV 覆盖
// ═══════════════════════════════════════════════════════════
console.log('\n── 10. GEAR_AV 覆盖 ──')

const allGears = ['暴怒', '愤怒', '不满', '焦虑', '不安', '退缩', '消沉', '防御', '失望', '配合', '中立']
for (const g of allGears) {
  const av = getGearAV(g)
  assert(av && Array.isArray(av.va) && av.va.length > 0, `GEAR_AV[${g}].va 非空`)
  assert(av && Array.isArray(av.vs) && av.vs.length > 0, `GEAR_AV[${g}].vs 非空`)
  assert(av && typeof av.guide === 'string' && av.guide.length > 0, `GEAR_AV[${g}].guide 非空`)
}

// ═══════════════════════════════════════════════════════════
// 11. getGearStrategy 覆盖
// ═══════════════════════════════════════════════════════════
console.log('\n── 11. getGearStrategy 覆盖 ──')

for (const g of allGears) {
  for (const mode of ['humanistic-comm', 'history-taking']) {
    const s = getGearStrategy(g, mode)
    assert(typeof s === 'string' && s.length > 20, `getGearStrategy(${g}, ${mode}) 非空`)
  }
}

// ═══════════════════════════════════════════════════════════
// 12. gearToIntent
// ═══════════════════════════════════════════════════════════
console.log('\n── 12. gearToIntent ──')

assert(gearToIntent('暴怒') === 'attack', '暴怒 → attack')
assert(gearToIntent('愤怒') === 'offensive', '愤怒 → offensive')
assert(gearToIntent('防御') === 'offensive', '防御 → offensive')
assert(gearToIntent('配合') === 'friendly', '配合 → friendly')
assert(gearToIntent('中立') === 'neutral', '中立 → neutral')
assert(gearToIntent('退缩') === 'neutral', '退缩 → neutral')  // 退缩/消沉不是攻击

// ═══════════════════════════════════════════════════════════
// 13. 阻尼器覆写其他档位
// ═══════════════════════════════════════════════════════════
console.log('\n── 13. 阻尼器覆写优先级 ──')

// 即使信任很高，阻尼器触发仍上档
const highTrustCM = makeCM({ trust: 9, concern: { primary: 'test', intensity: 1 } })
assert(decideGear(highTrustCM, 1, dsBase) === '不满', '阻尼器怒=1覆写高信任 → 不满')
assert(decideGear(highTrustCM, 4, dsBase) === '愤怒', '阻尼器怒=4覆写高信任 → 愤怒')

// ═══════════════════════════════════════════════════════════
// 14. event-mapping: trust_peak
// ═══════════════════════════════════════════════════════════
console.log('\n── 14. event-mapping: trust_peak ──')

let cm14 = initCM({ trust: 5 })
assert(cm14.trust_peak === 5, 'initCM trust_peak 初始 = trust')

cm14 = applyEventRound(initCM({ trust: 5 }), ['empathy_shown']).cm_after
assert(cm14.trust === 6, 'empathy_shown → trust=6')
// trust_peak 在 cm 内部跟踪，需要直接访问

let cm14b = initCM({ trust: 5 })
const res14 = applyEventRound(cm14b, ['empathy_shown'])
assert(res14.cm_after.trust === 6, 'empathy_shown → trust=6 (check cm_after)')
assert(cm14b.trust_peak === 6, 'trust_peak 更新到6')
// 再次共情
applyEventRound(cm14b, ['empathy_shown'])
assert(cm14b.trust_peak === 7, 'trust_peak 连续升到7')
// trust被打击后trust_peak不变
applyEventRound(cm14b, ['conflict'])
assert(cm14b.trust_peak === 7, 'trust下降后trust_peak保持7')

// ═══════════════════════════════════════════════════════════
// 15. event-mapping: 连续回避递增
// ═══════════════════════════════════════════════════════════
console.log('\n── 15. 连续回避递增 ──')

let cm15 = initCM()
// 第1次回避：1.0x multiplier (consecutive_avoidance=1, no bonus)
let r15 = applyEventRound(cm15, ['concern_ignored'])
assert(r15.cm_after.concern.intensity === 6, '1st avoidance: concern +1 (no multiplier, avoid=1)')
assert(cm15.consecutive_avoidance === 1, 'consecutive_avoidance=1')

// 第2次回避：1.5x (consecutive_avoidance=2)
r15 = applyEventRound(cm15, ['concern_ignored'])
assert(cm15.consecutive_avoidance === 2, 'consecutive_avoidance=2')
// concern delta = +1 * 1.5 = 1.5 → Math.round = 2; 6 + 2 = 8
assert(r15.cm_after.concern.intensity === 8, '2nd avoidance: concern +2 (1.5x multiplier)')

// 第3次回避：2.0x (consecutive_avoidance=3)
r15 = applyEventRound(cm15, ['concern_ignored'])
assert(cm15.consecutive_avoidance === 3, 'consecutive_avoidance=3')
// concern delta = +1 * 2.0 = 2; 8 + 2 = 10
assert(r15.cm_after.concern.intensity === 10, '3rd avoidance: concern +2 (2.0x multiplier, capped at 10)')

// ═══════════════════════════════════════════════════════════
// 16. event-mapping: 冲突修复
// ═══════════════════════════════════════════════════════════
console.log('\n── 16. 冲突损伤追踪 + 道歉修复 ──')

let cm16 = initCM()
applyEventRound(cm16, ['conflict'])   // trust: -2, conflict_trust_loss += 2
assert(cm16.conflict_trust_loss === 2, 'conflict → loss=2')
assert(cm16.trust === 3, 'conflict → trust=3')

// 道歉修复: ceil(2*0.6) = 2
const r16 = applyEventRound(cm16, ['apology'])
assert(r16.cm_after.trust === 5, 'apology修复: trust +2')
assert(cm16.conflict_trust_loss === 0, 'apology重置 conflict_trust_loss')

// ═══════════════════════════════════════════════════════════
// 17. event-mapping: bad_news 振幅收窄
// ═══════════════════════════════════════════════════════════
console.log('\n── 17. bad_news 后振幅收窄 ──')

let cm17 = initCM()
applyEventRound(cm17, ['bad_news'])  // concern +2, bad_news_triggered=true
assert(cm17.bad_news_triggered === true, 'bad_news_triggered=true')
assert(cm17.concern.intensity === 7, 'bad_news → concern=7 (+2 from initial 5)')

// good_news 振幅收窄: bad_news后 good_news delta 从 -3 收窄为 -1 (roundDelta.concern += 2, -3+2=-1)
const r17 = applyEventRound(cm17, ['good_news'])
assert(r17.cm_after.concern.intensity === 6, 'bad_news后good_news: concern从7降1到6（原good_news=-3被收窄为-1）')
// bad_news_triggered 后 intensity 最低钳位=5
let cm17b = initCM({ bad_news_triggered: true, concern: { primary: 'test', intensity: 5 } })
assert(cm17b.concern.intensity === 5, 'bad_news后强度最低钳位5')

// ═══════════════════════════════════════════════════════════
// 18. event-mapping: concern 迁移
// ═══════════════════════════════════════════════════════════
console.log('\n── 18. concern 迁移 ──')

let cm18 = initCM({
  concern: { primary: '担忧A', intensity: 2 },
  unresolved_goals: ['担忧B', '担忧C']
})
const r18 = applyEventRound(cm18, ['concern_addressed'])  // concern -2 → 0
assert(r18.concern_migrated === true, 'concern归零触发迁移')
assert(cm18.concern.primary === '担忧B', '迁移到下一个unresolved goal')
assert(cm18.concern.intensity === 5, '新担忧初始强度5')

// ═══════════════════════════════════════════════════════════
// 19. event-mapping: 确定性验证
// ═══════════════════════════════════════════════════════════
console.log('\n── 19. 确定性验证 ──')

const cm19 = initCM()
const rounds19 = [
  { round: 1, events: ['concern_ignored'] },
  { round: 2, events: ['empathy_shown'] },
  { round: 3, events: ['conflict'] },
]
const result19 = verifyDeterminism(cm19, rounds19, 50)
assert(result19.consistent === true, `确定性验证: 50次相同输入→相同输出`)

// ═══════════════════════════════════════════════════════════
// 20. applyEvents 批量模式
// ═══════════════════════════════════════════════════════════
console.log('\n── 20. applyEvents 批量模式 ──')

const result20 = applyEvents(cm19, rounds19)
assert(result20.deltas.length === 3, '3轮deltas')
assert(typeof result20.finalCM.trust === 'number', 'finalCM.trust 存在')
assert(typeof result20.finalCM.stuck_count === 'number', 'finalCM.stuck_count 存在')
assert(typeof result20.finalCM.consecutive_avoidance === 'number', 'consecutive_avoidance 存在')

// ═══════════════════════════════════════════════════════════
// 结果
// ═══════════════════════════════════════════════════════════
console.log(`\n${'═'.repeat(60)}`)
console.log(`  通过: ${passed} | 失败: ${failed} | 总计: ${passed + failed}`)
console.log(`${'═'.repeat(60)}`)

if (failed > 0) process.exit(1)
