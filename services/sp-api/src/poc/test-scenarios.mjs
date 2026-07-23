// ═══════════════════════════════════════════════════════════════
// 真实对话场景测试 — 11档系统
// 模拟完整对话链路，验证档位切换是否符合设计预期
// ═══════════════════════════════════════════════════════════════

import { decideGear, getGearAV, getGearStrategy } from './gear-system.js'
import { initCM, applyEventRound } from './event-mapping.js'

let passed = 0
let failed = 0
function assert(cond, label) {
  if (cond) { passed++; return true }
  console.log(`  ❌ FAIL: ${label}`)
  failed++
  return false
}
function info(msg) { console.log(`  ${msg}`) }

function makeDS(dominant = 'calm', attitude = 'neutral') {
  return { emotion_constraint: { dominant }, attitude }
}

// ═══════════════════════════════════════════════════════════
// 场景1: 暴怒触发 → 道歉消退（阻尼器快升慢降）
// 期望：被严重辱骂 → 暴怒 → 道歉 → 愤怒 → 不满 → 中立
// ═══════════════════════════════════════════════════════════
console.log('\n' + '═'.repeat(60))
console.log('场景1: 暴怒触发 → 道歉 → 阻尼器慢降')
console.log('═'.repeat(60))

const cm1 = initCM()
let prevGear1 = '中立'
let angerLevel1 = 0
const ds1 = makeDS()

function simRound(cm, events, angerDelta, ds, prevGear) {
  const result = applyEventRound(cm, events)
  // 阻尼器更新（模拟index.js逻辑）
  let newAnger = 0
  if (angerDelta > 0) {
    newAnger = Math.min(10, (cm._anger || 0) + angerDelta)
  } else {
    newAnger = Math.max(0, (cm._anger || 0) - (angerDelta <= -2 ? 1.0 : 0.3))
  }
  cm._anger = newAnger
  const gear = decideGear(cm, newAnger, ds, prevGear)
  return { ...result, anger: newAnger, gear }
}

// 第1轮：学生辱骂（+3怒），anger从0变3，触发不满(≥1)
let r1 = simRound(cm1, ['conflict'], 3, ds1, prevGear1)
info(`轮1 学生辱骂 | anger=+3→${r1.anger} | ${prevGear1}→${r1.gear}`)
assert(r1.gear === '不满', '单轮anger_delta=+3 → anger=3 → 不满(≥1)，非暴怒(需≥7)')
assert(r1.anger === 3, 'anger=3')
prevGear1 = r1.gear

// 继续辱骂累积到暴怒
let r1b = simRound(cm1, ['conflict'], 4, ds1, prevGear1)
info(`轮1b 再次辱骂 | anger=+4→${r1b.anger} | ${prevGear1}→${r1b.gear}`)
assert(r1b.gear === '暴怒', '再+4怒 → anger=7 → 暴怒')
prevGear1 = r1b.gear

// 检查暴怒策略文本
const rageStrategy = getGearStrategy('暴怒', 'humanistic-comm')
assert(rageStrategy.includes('短句回怼'), '暴怒策略: 短句回怼')
assert(rageStrategy.includes('15字以内'), '暴怒策略: 字数限制')
assert(rageStrategy.includes('🚫'), '暴怒策略: 禁止示弱')

// 第2轮：学生道歉（-2怒），暴怒后fast decay -1.0
let r2 = simRound(cm1, ['apology'], -2, ds1, prevGear1)
info(`轮2 学生道歉 | anger=-2→${r2.anger} | ${prevGear1}→${r2.gear}`)
assert(r2.gear === '愤怒', '道歉后anger从7降到6 → 愤怒(≥4)，阻尼器慢降保持余热')
prevGear1 = r2.gear

// 第3轮：学生继续好好说话（0怒 → 机械衰减）
let r3 = simRound(cm1, ['question_answered'], 0, ds1, prevGear1)
info(`轮3 学生正常沟通 | anger衰减→${r3.anger} | ${prevGear1}→${r3.gear}`)
// 阻尼器机械衰减0.3，anger=0.9 → 仍在不满
prevGear1 = r3.gear

// 持续衰减直到平静（机械衰减 0.3/轮，从7到<1需约20轮）
let rn = null
// 暴力加速：20轮连续善意
for (let i = 4; i <= 25; i++) {
  rn = simRound(cm1, ['empathy_shown'], 0, ds1, prevGear1)
  if (i <= 12 || i % 5 === 0) {
    info(`轮${i} 学生继续善意 | anger衰减→${rn.anger.toFixed(2)} | ${prevGear1}→${rn.gear}`)
  }
  prevGear1 = rn.gear
  if (rn.anger < 1 && rn.gear === '中立') break
}

assert(rn.anger < 1 || prevGear1 === '中立', '长时间善意后anger衰减到<1')
info(`最终: 经多轮善意, gear=${prevGear1}, anger=${rn.anger.toFixed(2)}`)
assert(prevGear1 === '中立' || prevGear1 === '配合', '持续善意后回归中立/配合（阻尼器余热散尽）')

// ═══════════════════════════════════════════════════════════
// 场景2: 焦虑 → 被解答 → 消退
// 期望：反复追问被忽视 → 焦虑积累 → 终于被回答 → 不安 → 中立
// ═══════════════════════════════════════════════════════════
console.log('\n' + '═'.repeat(60))
console.log('场景2: 焦虑积累 → 解答消退')
console.log('═'.repeat(60))

// 使用 anger_delta=0，观察纯反思脑档位变化（不被阻尼器掩盖）
const cm2 = initCM({
  unresolved_goals: ['什么病', '严重吗', '怎么治'],
  concern: { primary: '什么病', intensity: 7 }
})
let prevGear2 = '中立'
const dsFear = makeDS('fear')

// 轮1：表达新担忧 + 被忽视
let s2 = simRound(cm2, ['new_concern_expressed', 'concern_ignored'], 0, dsFear, prevGear2)
info(`轮1 表达担忧+被忽视 | concern=${cm2.concern.intensity} stuck=${cm2.stuck_count} avoid=${cm2.consecutive_avoidance} | ${prevGear2}→${s2.gear}`)
prevGear2 = s2.gear

// 轮2：再次被忽视
s2 = simRound(cm2, ['concern_ignored'], 0, dsFear, prevGear2)
info(`轮2 再次被忽视 | concern=${cm2.concern.intensity} avoid=${cm2.consecutive_avoidance} | ${prevGear2}→${s2.gear}`)
prevGear2 = s2.gear

// 轮3：继续被回避（连续回避累积）
s2 = simRound(cm2, ['question_avoided'], 0, dsFear, prevGear2)
info(`轮3 连续回避 | concern=${cm2.concern.intensity} avoid=${cm2.consecutive_avoidance} | ${prevGear2}→${s2.gear}`)
assert(cm2.consecutive_avoidance >= 2 || cm2.stuck_count >= 3, '回避累积触发stuck或avoid')
prevGear2 = s2.gear

// 轮4：被回答 + 共情
s2 = simRound(cm2, ['question_answered', 'empathy_shown'], 0, dsFear, prevGear2)
info(`轮4 被解答+共情 | concern=${cm2.concern.intensity} unresolved=${cm2.unresolved_goals.length} | ${prevGear2}→${s2.gear}`)
assert(cm2.unresolved_goals.length === 3, 'question_answered移除最早疑问: 4个→shift→3个')
prevGear2 = s2.gear

// 轮5-6：继续被回答，concern逐渐降低
for (let i = 5; i <= 7; i++) {
  s2 = simRound(cm2, ['question_answered', 'empathy_shown'], 0, dsFear, prevGear2)
  info(`轮${i} 继续解答+共情 | concern=${cm2.concern.intensity} | ${prevGear2}→${s2.gear}`)
  prevGear2 = s2.gear
  if (s2.gear === '中立' || s2.gear === '配合') break
}
info(`最终: concern=${cm2.concern.intensity}, gear=${prevGear2}`)

// ═══════════════════════════════════════════════════════════
// 场景3: 信任建立 → 背叛 → 失望
// 期望：几轮共情配合 → trust上升 → 学生冲突打击 → 失望 → 继续攻击 → 防御
// ═══════════════════════════════════════════════════════════
console.log('\n' + '═'.repeat(60))
console.log('场景3: 信任建立 → 背叛 → 失望 → 防御')
console.log('═'.repeat(60))

const cm3 = initCM({ trust: 5, concern: { primary: 'test', intensity: 3 } })
let prevGear3 = '中立'

// 建立信任：连续共情
for (let i = 1; i <= 3; i++) {
  let s3 = simRound(cm3, ['empathy_shown', 'question_answered'], 0, ds1, prevGear3)
  info(`轮${i} 医生共情+解答 | trust=${cm3.trust} peak=${cm3.trust_peak} | ${prevGear3}→${s3.gear}`)
  prevGear3 = s3.gear
}
assert(cm3.trust >= 7, '信任建立: trust≥7')
assert(cm3.trust_peak >= 7, 'trust_peak 记录峰值')
assert(prevGear3 === '配合', '进入配合档')
info(`信任已建立: trust=${cm3.trust}, peak=${cm3.trust_peak}`)

// 背叛：学生冲突（无怒值，看看trust下跌后的档位）
let s3b = simRound(cm3, ['conflict'], 0, ds1, prevGear3)
info(`轮4 学生冲突 | trust=${cm3.trust} peak=${cm3.trust_peak} anger=${s3b.anger} | ${prevGear3}→${s3b.gear}`)
// trust从8跌到6(conflict -2)，peak=8不变。trust=6不满足配合(需≥7)也不满足失望(trust 3-5)
// → 中立（默契破裂但未到防御/失望）
prevGear3 = s3b.gear

// 继续轻视
let s3c = simRound(cm3, ['dismissive'], 0, ds1, prevGear3)
info(`轮5 继续轻视 | trust=${cm3.trust} peak=${cm3.trust_peak} anger=${s3c.anger} | ${prevGear3}→${s3c.gear}`)
// trust=5, peak=8 → 满足失望(trust 3-5 + peak≥6)!
assert(s3c.gear === '失望', '信任从高点跌到5 → 失望')
prevGear3 = s3c.gear
prevGear3 = s3c.gear

// 学生道歉 — trust恢复
let s3d = simRound(cm3, ['apology'], 0, ds1, prevGear3)
info(`轮6 学生道歉 | trust=${cm3.trust} peak=${cm3.trust_peak} | ${prevGear3}→${s3d.gear}`)
// apology修复: trust恢复部分(conflict_trust_loss*0.6 → trust增量), trust可能回到6+
// trust≥6 + prev=失望 → 配合（滞后恢复路径）
assert(s3d.gear === '配合', '道歉后信任恢复 → 配合（失望→配合滞后恢复）')

// ═══════════════════════════════════════════════════════════
// 场景4: 坏消息 → 退缩 → 缓慢恢复
// 期望：被告知坏消息 → trust低+concern高 → 退缩 → 慢慢恢复trust/降concern → 中立
// ═══════════════════════════════════════════════════════════
console.log('\n' + '═'.repeat(60))
console.log('场景4: 坏消息 → 退缩 → 恢复')
console.log('═'.repeat(60))

const cm4 = initCM({ trust: 3, concern: { primary: 'test', intensity: 7 } })
let prevGear4 = '中立'

let s4 = simRound(cm4, ['bad_news'], 0, ds1, prevGear4)
info(`轮1 坏消息 | concern=${cm4.concern.intensity} bad_news=${cm4.bad_news_triggered} | ${prevGear4}→${s4.gear}`)
assert(s4.gear === '退缩', 'bad_news+low trust+high concern → 退缩')
assert(cm4.bad_news_triggered === true, 'bad_news_triggered=true')
prevGear4 = s4.gear

// 检查退缩策略
const retreatStrategy = getGearStrategy('退缩', 'history-taking')
assert(retreatStrategy.includes('沉默') || retreatStrategy.includes('不想说话'), '退缩策略: 少说话')
assert(retreatStrategy.includes('🚫'), '退缩策略: 禁止长篇大论')

// 保持退缩几轮
let s4b = simRound(cm4, ['no_event'], 0, ds1, prevGear4)
info(`轮2 沉默 | concern=${cm4.concern.intensity} | ${prevGear4}→${s4b.gear}`)
assert(s4b.gear === '退缩', '保持退缩（滞后）')
prevGear4 = s4b.gear

// 学生共情，缓慢恢复
for (let i = 3; i <= 6; i++) {
  let s4x = simRound(cm4, ['empathy_shown'], 0, ds1, prevGear4)
  info(`轮${i} 学生共情 | concern=${cm4.concern.intensity} trust=${cm4.trust} | ${prevGear4}→${s4x.gear}`)
  prevGear4 = s4x.gear
  if (s4x.gear !== '退缩') break
}
info(`最终: gear=${prevGear4}`)

// ═══════════════════════════════════════════════════════════
// 场景5: 连续被忽视 → 不满 → 愤怒
// 期望：stuck/avoidance 跨轮累积升级
// ═══════════════════════════════════════════════════════════
console.log('\n' + '═'.repeat(60))
console.log('场景5: 连续忽视 → 不满 → 愤怒')
console.log('═'.repeat(60))

const cm5 = initCM()
let prevGear5 = '中立'

// 用 anger_delta=0 的忽视，观察 stuck 跨轮累积（不被阻尼器掩盖）
for (let i = 1; i <= 5; i++) {
  let s5 = simRound(cm5, ['concern_ignored'], 0, ds1, prevGear5)
  info(`轮${i} 被忽视(anger_delta=0) | stuck=${cm5.stuck_count} avoid=${cm5.consecutive_avoidance} anger=${s5.anger} | ${prevGear5}→${s5.gear}`)
  prevGear5 = s5.gear
}
// stuck_count 应已累积到4+
assert(cm5.stuck_count >= 4, '连续忽视后stuck≥4')
// stuck≥4+anger=0 → 不满（阻尼器不参与，纯跨轮累积）
assert(prevGear5 === '不满', 'stuck≥4 + anger=0 → 不满（纯跨轮累积升级）')

// ═══════════════════════════════════════════════════════════
// 场景6: 中立状态突发攻击 → 防御
// 期望：知觉脑自判断攻击 → 防御姿态（不跳到愤怒）
// ═══════════════════════════════════════════════════════════
console.log('\n' + '═'.repeat(60))
console.log('场景6: 中立 → 突发攻击 → 防御')
console.log('═'.repeat(60))

const cm6 = initCM({ trust: 7, concern: { primary: 'test', intensity: 3 } })
let prevGear6 = '中立'

// 突然被轻视
let s6 = simRound(cm6, ['dismissive', 'concern_ignored'], 2, ds1, prevGear6)
info(`轮1 被轻视 | trust=${cm6.trust} anger=${s6.anger} | ${prevGear6}→${s6.gear}`)
assert(s6.gear !== '愤怒', '中立态被攻击 → 不应到愤怒')
prevGear6 = s6.gear

// 再次被攻击
let s6b = simRound(cm6, ['conflict'], 3, ds1, prevGear6)
info(`轮2 继续攻击 | trust=${cm6.trust} anger=${s6b.anger} | ${prevGear6}→${s6b.gear}`)
// 阻尼器达到5 → 愤怒
prevGear6 = s6b.gear

// ═══════════════════════════════════════════════════════════
// 场景7: 失望 → 重新建立信任 → 配合
// 期望：trust从4恢复到6 → 进入配合（滞后恢复路径）
// ═══════════════════════════════════════════════════════════
console.log('\n' + '═'.repeat(60))
console.log('场景7: 失望 → 重新信任 → 配合')
console.log('═'.repeat(60))

const cm7 = initCM({ trust: 4, trust_peak: 8, concern: { primary: 'test', intensity: 3 } })
let prevGear7 = '失望'

// 确认在失望档
let s7a = decideGear(cm7, 0, ds1, '失望')
info(`初始: trust=4 peak=8 prev=失望 → ${s7a}`)
assert(s7a === '失望', '初始: 失望档')

// 连续共情恢复trust
for (let i = 1; i <= 3; i++) {
  let s7x = simRound(cm7, ['empathy_shown'], 0, ds1, prevGear7)
  info(`轮${i} 共情 | trust=${cm7.trust} peak=${cm7.trust_peak} | ${prevGear7}→${s7x.gear}`)
  prevGear7 = s7x.gear
  if (s7x.gear === '配合') break
}
assert(prevGear7 === '配合', 'trust恢复到6+ → 配合（滞后恢复）')

// ═══════════════════════════════════════════════════════════
// 场景8: 不满 + 听到坏消息 → concern升级但不跳档到退缩
// 期望：不满档保持，因为阻尼器优先
// ═══════════════════════════════════════════════════════════
console.log('\n' + '═'.repeat(60))
console.log('场景8: 阻尼器优先 — 不满+坏消息仍保持不满')
console.log('═'.repeat(60))

const cm8 = initCM({ trust: 4, concern: { primary: 'test', intensity: 7 } })

// 阻尼器有怒值（不满）
let s8 = decideGear(cm8, 1.5, ds1, '中立')
info(`anger=1.5 + trust=4 + concern=7 → ${s8}`)
assert(s8 === '不满', '阻尼器优先: 怒值1.5 → 不满（不会降档到退缩）')

// 即使满足退缩条件，阻尼器仍优先
let cm8b = initCM({ bad_news_triggered: true, trust: 2, concern: { primary: 'test', intensity: 8 } })
let s8b = decideGear(cm8b, 3, ds1)
info(`anger=3 + bad_news + trust=2 + concern=8 → ${s8b}`)
assert(s8b === '不满', '阻尼器怒值=3 → 不满（不跳退缩）')

// ═══════════════════════════════════════════════════════════
// 场景9: 消沉状态链路
// 期望：sadness支配 + concern中高 → 消沉
// ═══════════════════════════════════════════════════════════
console.log('\n' + '═'.repeat(60))
console.log('场景9: 消沉 → 恢复')
console.log('═'.repeat(60))

const cm9 = initCM({ concern: { primary: 'test', intensity: 6 } })
const dsSad = makeDS('sadness')
let prevGear9 = '中立'

const s9 = decideGear(cm9, 0, dsSad, prevGear9)
info(`sadness + concern=6 → ${s9}`)
assert(s9 === '消沉', 'sadness+concern≥5 → 消沉')
prevGear9 = s9

// 保持消沉
const s9stay = decideGear(cm9, 0, dsSad, '消沉')
assert(s9stay === '消沉', '消沉保持: sadness+concern=6+prev=消沉')

// concern降温但仍在滞后范围
cm9.concern.intensity = 3
const s9stay2 = decideGear(cm9, 0, dsSad, '消沉')
info(`sadness + concern降为3 + prev=消沉 → ${s9stay2}`)
assert(s9stay2 === '消沉', '消沉保持: sadness+concern=3+prev=消沉')

// 彻底退出
cm9.concern.intensity = 2
const s9exit = decideGear(cm9, 0, dsSad, '消沉')
info(`sadness + concern降为2 + prev=消沉 → ${s9exit}`)
assert(s9exit === '中立', '消沉退出: concern<3')

// ═══════════════════════════════════════════════════════════
// 场景10: 不安状态链路
// 期望：fear+concern中等+unresolved → 不安
// ═══════════════════════════════════════════════════════════
console.log('\n' + '═'.repeat(60))
console.log('场景10: 不安 → 解答消退')
console.log('═'.repeat(60))

const cm10 = initCM({
  concern: { primary: 'test', intensity: 7 },
  unresolved_goals: ['检查结果', '治疗方案']
})
let prevGear10 = '中立'

const s10 = decideGear(cm10, 0, dsFear, prevGear10)
info(`fear + concern=7 + unresolved → ${s10}`)
assert(s10 === '不安', 'fear+concern≥6+unresolved → 不安')
prevGear10 = s10

// 保持不安
cm10.concern.intensity = 4
const s10stay = decideGear(cm10, 0, dsFear, '不安')
info(`concern降为4 + prev=不安 → ${s10stay}`)
assert(s10stay === '不安', '不安保持: concern=4+prev=不安（≥4滞后阈值）')

// concern=3退出
cm10.concern.intensity = 3
const s10exit = decideGear(cm10, 0, dsFear, '不安')
info(`concern降为3 + prev=不安 → ${s10exit}`)
assert(s10exit === '中立', '不安退出: concern=3<滞后阈值4')

// ═══════════════════════════════════════════════════════════
// 场景11: 所有档位的AV映射完整性
// ═══════════════════════════════════════════════════════════
console.log('\n' + '═'.repeat(60))
console.log('场景11: GEAR_AV 映射完整性')
console.log('═'.repeat(60))

const allGears = ['暴怒', '愤怒', '不满', '焦虑', '不安', '退缩', '消沉', '防御', '失望', '配合', '中立']
const expectedVA = {
  '暴怒': ['angry_intense'],
  '愤怒': ['angry'],
  '不满': ['angry'],           // 复用愤怒（说话时负面语气体现差异）
  '焦虑': ['anxious', 'fearful'],
  '不安': ['anxious'],          // 复用anxious
  '退缩': ['sad', 'broken'],
  '消沉': ['sad'],              // 复用sad
  '防御': ['defensive'],
  '失望': ['defensive'],        // 复用defensive
  '配合': ['warm'],
  '中立': ['neutral'],
}

for (const g of allGears) {
  const av = getGearAV(g)
  const expVA = expectedVA[g]
  assert(JSON.stringify(av.va) === JSON.stringify(expVA), `${g}.va = [${expVA}]`)
  assert(av.guide.length > 0, `${g}.guide 非空`)
}

// ═══════════════════════════════════════════════════════════
// 场景12: 档位禁止跳档验证
// 期望：配合档不能直接跳到愤怒（必须经过中间档位，阻尼器除外）
// ═══════════════════════════════════════════════════════════
console.log('\n' + '═'.repeat(60))
console.log('场景12: 跳档验证 — 配合不会被非阻尼器直接拉到愤怒')
console.log('═'.repeat(60))

const cm12 = initCM({ trust: 8, concern: { primary: 'test', intensity: 2 } })
// 配合状态 + 学生说了不好的话但不构成严重冲突
const g12a = decideGear(cm12, 0, ds1, '配合')
info(`trust=8 concern=2 prev=配合 → ${g12a}`)
assert(g12a === '配合', '正常保持配合')

// trust下降但仍满足配合滞后
cm12.trust = 6
const g12b = decideGear(cm12, 0, ds1, '配合')
info(`trust降到6 prev=配合 → ${g12b}`)
assert(g12b === '配合', 'trust=6仍满足配合保持(≥5)')

// trust跌破保持阈值
cm12.trust = 4
const g12c = decideGear(cm12, 0, ds1, '配合')
info(`trust降到4 prev=配合 → ${g12c}`)
assert(g12c !== '愤怒' && g12c !== '暴怒', 'trust下降 → 不跳攻击档')
assert(g12c === '中立' || g12c === '防御' || g12c === '失望', 'trust下降 → 中立/防御/失望')

// ═══════════════════════════════════════════════════════════
// 结果
// ═══════════════════════════════════════════════════════════
console.log(`\n${'═'.repeat(60)}`)
console.log(`  通过: ${passed} | 失败: ${failed} | 总计: ${passed + failed}`)
console.log(`${'═'.repeat(60)}`)

if (failed > 0) process.exit(1)
