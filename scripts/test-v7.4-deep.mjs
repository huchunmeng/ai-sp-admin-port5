// ═══════════════════════════════════════════════════════════════
// v7.4 深度测试 — 纯逻辑链路
// ═══════════════════════════════════════════════════════════════

import { createEmotionEngine, derivePersonality, clamp } from '../packages/shared/src/emotion-engine.js'
import { createStateMachine, STRATEGIES } from '../packages/shared/src/emotion-state-machine.js'

let passed = 0, failed = 0

function test(name, fn) {
  try { fn(); passed++; } catch(e) { failed++; console.log('  FAIL:', name, '-', e.message); }
}

function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed') }

// ═══════════════════════════════════════════════════
console.log('=== 1. 引擎层测试 ===')

const personality = derivePersonality(null, null, {
  expressiveness: '火爆型', sensitivity: '高敏感', resilience: '普通恢复力'
})
const engine = createEmotionEngine({
  baseline: { anger: 0, fear: 0, sadness: 0, joy: 0 }, personality
})

test('初始向量全0', () => {
  const v = engine.getVector()
  assert(v.anger === 0 && v.fear === 0 && v.sadness === 0 && v.joy === 0)
})

test('processTurn 高敏感放大 (×1.3)', () => {
  engine.reset()
  const v = engine.processTurn({ anger: 2, fear: 0, sadness: 0, joy: 0 })
  assert(Math.abs(v.anger - 2.6) < 0.01, 'expected 2.6 got ' + v.anger)
})

test('processTurn 恢复方向 resilience 加速 (×1.0)', () => {
  engine.reset()
  engine.processTurn({ anger: 3, fear: 0, sadness: 0, joy: 0 })
  const v = engine.processTurn({ anger: -1, fear: 0, sadness: 0, joy: 0 })
  // 3*1.3=3.9,  -1*max(1.3,1.0)*1.0=-1.3  → 2.6
  assert(Math.abs(v.anger - 2.6) < 0.01, 'expected 2.6 got ' + v.anger.toFixed(1))
})

test('validateLLMOutput 9字段完整（含video_action/voice_style）', () => {
  const r = engine.validateLLMOutput({
    text: '你好', video_action: 'calm', voice_style: 'normal',
    intent: 'friendly', delta: { anger: 0 }, trust_delta: 1,
    deep_reassure: false, show_material: null
  })
  const keys = Object.keys(r).sort()
  const expected = ['deep_reassure', 'delta', 'intent', 'show_material', 'text', 'trust_delta', 'video_action', 'voice_style']
  assert(JSON.stringify(keys) === JSON.stringify(expected), 'fields: ' + keys.join(','))
})

test('validateLLMOutput 非法video_action → null', () => {
  const r = engine.validateLLMOutput({ text: 'x', video_action: 'INVALID' })
  assert(r.video_action === null)
})

test('validateLLMOutput 非法voice_style → normal', () => {
  const r = engine.validateLLMOutput({ text: 'x', voice_style: 'INVALID' })
  assert(r.voice_style === 'normal')
})

test('validateLLMOutput defaults参数生效', () => {
  const r = engine.validateLLMOutput({ text: 'x' }, { video_action: 'fearful', voice_style: 'shaky' })
  assert(r.video_action === 'fearful')
  assert(r.voice_style === 'shaky')
})

test('validateLLMOutput 全部9个video_action白名单', () => {
  const all = ['calm', 'angry_mild', 'angry', 'angry_intense',
    'fearful_mild', 'fearful', 'fearful_intense', 'sad_soft', 'broken']
  all.forEach(va => {
    const r = engine.validateLLMOutput({ text: '', video_action: va })
    assert(r.video_action === va, 'failed: ' + va)
  })
})

test('validateLLMOutput 全部11个voice_style白名单', () => {
  const all = ['normal', 'slightly_tense', 'loud_fast', 'very_loud_fast',
    'cold', 'shaky', 'very_shaky', 'soft_slow', 'defensive', 'vulnerable', 'broken']
  all.forEach(vs => {
    const r = engine.validateLLMOutput({ text: '', voice_style: vs })
    assert(r.voice_style === vs, 'failed: ' + vs)
  })
})

test('clamp边界', () => {
  assert(clamp(15, 0, 10) === 10)
  assert(clamp(-5, 0, 10) === 0)
  assert(clamp(5, 0, 10) === 5)
})

test('processTurn 向量总在[0,10]区间', () => {
  engine.reset()
  for (let i = 0; i < 20; i++) {
    const v = engine.processTurn({ anger: 5, fear: 3, sadness: 2, joy: -2 })
    assert(v.anger >= 0 && v.anger <= 10, 'anger out of range: ' + v.anger)
    assert(v.fear >= 0 && v.fear <= 10, 'fear out of range: ' + v.fear)
    assert(v.sadness >= 0 && v.sadness <= 10, 'sadness out of range')
    assert(v.joy >= 0 && v.joy <= 10, 'joy out of range')
  }
})

// ═══════════════════════════════════════════════════
console.log('=== 2. 状态机层测试 ===')
// 火爆型(exprOffset=-1.5) + 高敏感(sensitivityMul=1.3)
// 阈值: irritated=0.5 angry=3.5 furious=6.5 | uneasy=0.5 fearful=3.5 terrified=6.5 | sad=3.5
// 复合态: fear≥1.5 && anger≥1.5 → 恐+怒 | fear≥1.5 && sadness≥1.5 → 恐+悲
// 崩溃: anger≥6.5 && fear≥6.5 && sadness≥6.5

const sm = createStateMachine(engine, { personality })

test('初始状态 calm', () => {
  sm.reset()
  assert(sm.getState() === 'calm')
})

test('getContext 包含字段级菜单', () => {
  sm.reset()
  const ctx = sm.getContext('我头疼')
  assert(ctx.instruction.includes('video_action'), 'no video_action')
  assert(ctx.instruction.includes('voice_style'), 'no voice_style')
  assert(ctx.instruction.includes('text写作'), 'no text写作')
  assert(ctx.instruction.includes('delta:'), 'no delta')
  assert(ctx.mode === 'full')
})

test('getContext 包含所有意图条目', () => {
  sm.reset()
  const ctx = sm.getContext('你好')
  ;['[attack]', '[offensive]', '[friendly]', '[neutral]', '[noise]'].forEach(i => {
    assert(ctx.instruction.includes(i), 'missing intent: ' + i)
  })
})

test('getContext 包含 OUTPUT_SCHEMA', () => {
  const ctx = sm.getContext('你好')
  assert(ctx.instruction.includes('"video_action"'), 'no video_action in schema')
  assert(ctx.instruction.includes('"voice_style"'), 'no voice_style in schema')
  assert(ctx.instruction.includes('"trust_delta"'), 'no trust_delta in schema')
})

test('calm → irritated (anger*1.3≈1.3 ≥ 0.5)', () => {
  sm.reset()
  engine.processTurn({ anger: 1, fear: 0, sadness: 0, joy: 0 })
  sm.determineState('offensive')
  assert(sm.getState() === 'irritated', 'got ' + sm.getState())
})

test('irritated → angry (anger*1.3≥3.5)', () => {
  sm.reset()
  engine.processTurn({ anger: 3, fear: 0, sadness: 0, joy: 0 })
  sm.determineState('offensive')
  assert(sm.getState() === 'angry', 'got ' + sm.getState())
})

test('angry → furious (anger*1.3≥6.5)', () => {
  sm.reset()
  engine.processTurn({ anger: 6, fear: 0, sadness: 0, joy: 0 })
  sm.determineState('attack')
  assert(sm.getState() === 'furious', 'got ' + sm.getState())
})

test('calm → uneasy (fear*1.3≥0.5)', () => {
  sm.reset()
  engine.processTurn({ anger: 0, fear: 1, sadness: 0, joy: 0 })
  sm.determineState('offensive')
  assert(sm.getState() === 'uneasy', 'got ' + sm.getState())
})

test('uneasy → fearful (fear*1.3≥3.5)', () => {
  sm.reset()
  engine.processTurn({ anger: 0, fear: 3, sadness: 0, joy: 0 })
  sm.determineState('offensive')
  assert(sm.getState() === 'fearful', 'got ' + sm.getState())
})

test('fearful → terrified (fear*1.3≥6.5)', () => {
  sm.reset()
  engine.processTurn({ anger: 0, fear: 6, sadness: 0, joy: 0 })
  sm.determineState('offensive')
  assert(sm.getState() === 'terrified', 'got ' + sm.getState())
})

test('→ sad (sadness*1.3≥3.5)', () => {
  sm.reset()
  engine.processTurn({ anger: 0, fear: 0, sadness: 3, joy: 0 })
  sm.determineState('friendly')
  assert(sm.getState() === 'sad', 'got ' + sm.getState())
})

test('→ 恐+怒 (fear≥1.5 && anger≥1.5)', () => {
  sm.reset()
  engine.processTurn({ anger: 2, fear: 2, sadness: 0, joy: 0 })
  sm.determineState('offensive')
  // anger*1.3=2.6≥1.5, fear*1.3=2.6≥1.5 → 恐+怒 (优先级高于单维度)
  assert(sm.getState() === '恐+怒', 'got ' + sm.getState())
})

test('→ 恐+悲 (fear≥1.5 && sadness≥1.5)', () => {
  sm.reset()
  engine.processTurn({ anger: 0, fear: 2, sadness: 2, joy: 0 })
  sm.determineState('friendly')
  assert(sm.getState() === '恐+悲', 'got ' + sm.getState())
})

test('→ 崩溃 (三维全≥6.5)', () => {
  sm.reset()
  engine.processTurn({ anger: 7, fear: 7, sadness: 7, joy: 0 })
  sm.determineState('attack')
  assert(sm.getState() === '崩溃', 'got ' + sm.getState())
})

test('terrified delta锁定：非friendly时fear delta上限为0', () => {
  sm.reset()
  engine.processTurn({ anger: 0, fear: 6, sadness: 0, joy: 0 })
  sm.determineState('offensive')
  assert(sm.getState() === 'terrified')
  const c = sm.applyDeltaConstraints({ anger: 0, fear: 3, sadness: 0, joy: 0 }, 'attack')
  assert(c.fear <= 0, 'fear delta should be locked to ≤0, got ' + c.fear)
})

test('崩溃 delta锁定：非friendly时全部涨幅锁为≤0', () => {
  sm.reset()
  engine.processTurn({ anger: 7, fear: 7, sadness: 7, joy: 0 })
  sm.determineState('attack')
  assert(sm.getState() === '崩溃')
  const c = sm.applyDeltaConstraints({ anger: 2, fear: 2, sadness: 2, joy: 0 }, 'attack')
  assert(c.anger <= 0, 'anger locked')
  assert(c.fear <= 0, 'fear locked')
  assert(c.sadness <= 0, 'sadness locked')
})

test('terminal 投诉3次后终止', () => {
  sm.reset()
  engine.addStrike()
  engine.addStrike()
  assert(engine.getStrikeCount() === 2)
  assert(!sm.isTerminal())
  engine.addStrike()
  assert(engine.getStrikeCount() === 3)
  assert(sm.isTerminal())
  const r = sm.processResult('attack', '滚', false)
  assert(r.terminal === true)
  assert(r.termination.type === 'complaint')
})

test('deepReassure 重置投诉计数', () => {
  sm.reset()
  engine.addStrike()
  engine.addStrike()
  engine.resetStrikes()
  assert(engine.getStrikeCount() === 0)
  assert(!sm.isTerminal())
})

test('getStrategiesForState 所有11状态有策略', () => {
  const states = ['calm', 'irritated', 'angry', 'furious', 'uneasy', 'fearful',
    'terrified', 'sad', '恐+怒', '恐+悲', '崩溃']
  states.forEach(s => {
    const strats = sm.getStrategiesForState(s)
    assert(strats && typeof strats === 'object', 'no strats for ' + s)
  })
})

test('strategies 每条都有 {va, vs, tx, dl} 结构', () => {
  const states = ['calm', 'irritated', 'angry', 'furious', 'uneasy', 'fearful',
    'terrified', 'sad', '恐+怒', '恐+悲', '崩溃']
  const intents = ['neutral', 'friendly', 'offensive', 'attack', 'noise']
  let count = 0
  states.forEach(state => {
    const strats = sm.getStrategiesForState(state)
    intents.forEach(intent => {
      count++
      const s = strats[intent]
      assert(s && s.va && s.vs && s.tx && s.dl, `${state}.${intent} missing fields`)
    })
  })
  console.log('  (' + count + ' entries checked)')
})

test('clearTerminalState 清除投诉计数', () => {
  engine.reset()
  engine.addStrike(); engine.addStrike(); engine.addStrike()
  assert(sm.isTerminal())
  sm.clearTerminalState()
  assert(!sm.isTerminal())
})

// ═══════════════════════════════════════════════════
console.log('=== 3. 性格×状态 策略表 220条目完整性 ===')

const personalities = ['火爆型', '普通型', '偏内敛', '隐忍型']
const allStates = ['calm', 'irritated', 'angry', 'furious', 'uneasy', 'fearful',
  'terrified', 'sad', '恐+怒', '恐+悲', '崩溃']
const intents = ['neutral', 'friendly', 'offensive', 'attack', 'noise']
const allVA = ['calm', 'angry_mild', 'angry', 'angry_intense',
  'fearful_mild', 'fearful', 'fearful_intense', 'sad_soft', 'broken']
const allVS = ['normal', 'slightly_tense', 'loud_fast', 'very_loud_fast',
  'cold', 'shaky', 'very_shaky', 'soft_slow', 'defensive', 'vulnerable', 'broken']

let entryCount = 0
let issues = []
personalities.forEach(p => {
  const slice = STRATEGIES[p]
  assert(slice, 'missing personality: ' + p)
  allStates.forEach(state => {
    const strats = slice[state]
    assert(strats, `missing state ${p}.${state}`)
    intents.forEach(intent => {
      entryCount++
      const s = strats[intent]
      if (!s) { issues.push(`${p}.${state}.${intent}: no entry`); return }
      if (!s.va) { issues.push(`${p}.${state}.${intent}: no va`); return }
      if (!allVA.includes(s.va)) { issues.push(`${p}.${state}.${intent}: invalid va "${s.va}"`); return }
      if (!s.vs) { issues.push(`${p}.${state}.${intent}: no vs`); return }
      if (!allVS.includes(s.vs)) { issues.push(`${p}.${state}.${intent}: invalid vs "${s.vs}"`); return }
      if (!s.tx || typeof s.tx !== 'string' || s.tx.length < 3) { issues.push(`${p}.${state}.${intent}: tx too short`); return }
      if (!s.dl || typeof s.dl !== 'object') { issues.push(`${p}.${state}.${intent}: no dl`); return }
      // Validate dl structure
      if (s.dl.locked || s.dl.maintain) { /* valid */ }
      else {
        const dims = Object.keys(s.dl)
        dims.forEach(k => {
          if (!Array.isArray(s.dl[k])) { issues.push(`${p}.${state}.${intent}: dl.${k} not array`); return }
          const [min, max] = s.dl[k]
          if (typeof min !== 'number' || typeof max !== 'number') issues.push(`${p}.${state}.${intent}: dl.${k} not numbers`)
          if (min > max) issues.push(`${p}.${state}.${intent}: dl.${k} min>max`)
        })
      }
    })
  })
})
if (issues.length > 0) {
  issues.forEach(i => console.log('  ISSUE:', i))
  throw new Error(`${issues.length} issues found`)
}
console.log(`  4性格 × 11状态 × 5意图 = ${entryCount}条, 全部字段格式合法`)

// ═══════════════════════════════════════════════════
console.log('=== 4. 边界场景 ===')

test('furious 状态 getContext 警告含具体禁令', () => {
  sm.reset()
  engine.processTurn({ anger: 6, fear: 0, sadness: 0, joy: 0 })
  sm.determineState('attack')
  assert(sm.getState() === 'furious', 'got ' + sm.getState())
  const ctx = sm.getContext('你今年多大')
  assert(ctx.instruction.includes('最高优先级规则'), 'no max priority rule')
  assert(ctx.instruction.includes('绝对不回答任何问题'), 'no lock warning')
  assert(ctx.instruction.includes('不许出现任何数字、年龄、时间、症状词、病名、检查名'), 'no number ban')
})

test('terrified 状态 getContext 含恐惧锁定说明', () => {
  sm.reset()
  engine.processTurn({ anger: 0, fear: 6, sadness: 0, joy: 0 })
  sm.determineState('offensive')
  assert(sm.getState() === 'terrified', 'got ' + sm.getState())
  const ctx = sm.getContext('你能听到我说话吗')
  assert(ctx.instruction.includes('恐惧锁定'))
})

test('崩溃 状态 getContext 含崩溃锁定说明', () => {
  sm.reset()
  engine.processTurn({ anger: 7, fear: 7, sadness: 7, joy: 0 })
  sm.determineState('attack')
  assert(sm.getState() === '崩溃', 'got ' + sm.getState())
  const ctx = sm.getContext('...')
  assert(ctx.instruction.includes('崩溃锁定'))
  assert(ctx.instruction.includes('三维情绪'))
})

test('getLastVector 正确记录上一轮', () => {
  engine.reset()
  engine.processTurn({ anger: 1, fear: 2, sadness: 3, joy: 0 })
  const prev = engine.getLastVector()
  assert(prev !== null)
  assert(prev.anger === 0)
  assert(prev.fear === 0)
  assert(prev.sadness === 0)
  // 验证上次确实是处理前的值
  const cur = engine.getVector()
  assert(cur.anger > 0)
})

test('processResult 正常（非terminal）', () => {
  sm.reset()
  const r = sm.processResult('neutral', '你好', false)
  assert(!r.terminal)
  assert(r.state === 'calm')
  assert(r.vector.anger !== undefined)
})

test('getContext 包含 state/vector/mode/warning/terminal', () => {
  sm.reset()
  engine.addStrike()
  const ctx = sm.getContext('测试')
  assert(ctx.state === 'calm')
  assert(ctx.mode === 'full')
  assert(ctx.warning !== null)
  assert(ctx.warning.strikes === 1)
  assert(ctx.vector.anger !== undefined)
  assert(ctx.terminal === false)
})

// ═══════════════════════════════════════════════════
console.log('=== 5. Prompt-Builder 集成 ===')

import { buildSystemPrompt } from '../services/sp-api/src/prompt-builder.js'

const mockConfig = {
  roleDescription: '你是一个30岁的女性患者，因头痛就诊。',
  mode: 'history-taking',
  symptomPool: '头痛、恶心、视力模糊',
  spPlayRules: {
    knowledge_boundary: {
      knows: ['头痛', '恶心'],
      does_not_know: ['MRI', 'CT']
    },
    vague_response_templates: ['我不太清楚'],
    refuse_to_answer: ['你问这个干什么']
  }
}

test('buildSystemPrompt 无引擎 / 无smContext → schema含video_action', () => {
  const { prompt } = buildSystemPrompt({ config: mockConfig, engine: null, smContext: null, messages: [] })
  assert(prompt.includes('video_action'), 'no video_action')
  assert(prompt.includes('voice_style'), 'no voice_style')
  assert(prompt.includes('trust_delta'), 'no trust_delta')
})

test('buildSystemPrompt 有引擎 / 无smContext → schema含video_action', () => {
  const { prompt } = buildSystemPrompt({ config: mockConfig, engine, smContext: null, messages: [] })
  assert(prompt.includes('video_action'))
  assert(prompt.includes('voice_style'))
  assert(prompt.includes('trust_delta'))
})

test('buildSystemPrompt 有引擎 / smContext → 菜单模式', () => {
  engine.reset()
  const smCtx = sm.getContext('你好')
  const { prompt } = buildSystemPrompt({
    config: mockConfig, engine, smContext: smCtx, messages: [], emotionOn: true
  })
  assert(prompt.includes('video_action'))
  assert(prompt.includes('voice_style'))
  assert(prompt.includes('text写作'))
  assert(prompt.includes('信任评估规则'))
})

test('buildSystemPrompt 知识边界注入', () => {
  engine.reset()
  const smCtx = sm.getContext('你好')
  const { prompt } = buildSystemPrompt({
    config: mockConfig, engine, smContext: smCtx, messages: []
  })
  assert(prompt.includes('你知道的'))
  assert(prompt.includes('头痛'))
  assert(prompt.includes('你不知道的'))
  assert(prompt.includes('MRI'))
})

test('buildSystemPrompt 信任偏置 >5 注入正面偏见', () => {
  engine.reset()
  const smCtx = sm.getContext('你好')
  const { prompt } = buildSystemPrompt({
    config: mockConfig, engine, smContext: smCtx, messages: [], trustLevel: 7
  })
  assert(prompt.includes('信任偏置'))
  assert(prompt.includes('向好处理解'))
  assert(!prompt.includes('怀疑偏置'))
})

test('buildSystemPrompt 信任偏置 < -5 注入怀疑偏见', () => {
  engine.reset()
  const smCtx = sm.getContext('你好')
  const { prompt } = buildSystemPrompt({
    config: mockConfig, engine, smContext: smCtx, messages: [], trustLevel: -7
  })
  assert(prompt.includes('怀疑偏置'))
  assert(prompt.includes('向坏处理解'))
  assert(!prompt.includes('信任偏置'))
})

test('buildSystemPrompt |trust|≤5 不注入偏置', () => {
  engine.reset()
  const smCtx = sm.getContext('你好')
  const { prompt } = buildSystemPrompt({
    config: mockConfig, engine, smContext: smCtx, messages: [], trustLevel: 3
  })
  assert(!prompt.includes('信任偏置'))
  assert(!prompt.includes('怀疑偏置'))
})

test('buildSystemPrompt B类触发词注入', () => {
  engine.reset()
  const smCtx = sm.getContext('你好')
  const { prompt } = buildSystemPrompt({
    config: mockConfig, engine, smContext: smCtx, messages: [],
    triggers: { bTrigger: { type: 'B', word: '你看着办' } }
  })
  assert(prompt.includes('B类替问'))
  assert(prompt.includes('反问踢回'))
  assert(prompt.includes('绝对禁止输出'))
})

test('buildSystemPrompt B+类触发词注入', () => {
  engine.reset()
  const smCtx = sm.getContext('你好')
  const { prompt } = buildSystemPrompt({
    config: mockConfig, engine, smContext: smCtx, messages: [],
    triggers: { bTrigger: { type: 'B+', word: '你详细说说' } }
  })
  assert(prompt.includes('B+类倾泻陷阱'))
  assert(prompt.includes('不超过20字'))
})

test('buildSystemPrompt A类触发词注入', () => {
  engine.reset()
  const smCtx = sm.getContext('你好')
  const { prompt } = buildSystemPrompt({
    config: mockConfig, engine, smContext: smCtx, messages: [],
    triggers: { aTrigger: { word: 'CVA' } }
  })
  assert(prompt.includes('医学黑话'))
  assert(prompt.includes('装不懂'))
})

test('buildSystemPrompt 多问检测注入', () => {
  engine.reset()
  const smCtx = sm.getContext('你好')
  const { prompt } = buildSystemPrompt({
    config: mockConfig, engine, smContext: smCtx, messages: [],
    triggers: { multiQuestion: true }
  })
  assert(prompt.includes('多问检测'))
  assert(prompt.includes('只回答第一个'))
})

test('buildSystemPrompt 家属预后情绪注入', () => {
  engine.reset()
  const smCtx = sm.getContext('你好')
  const { prompt } = buildSystemPrompt({
    config: mockConfig, engine, smContext: smCtx, messages: [],
    triggers: { familyPrognosisConcern: true }
  })
  assert(prompt.includes('家属情绪规则'))
  assert(prompt.includes('fear或sadness必须至少+1.0'))
})

test('buildSystemPrompt 对话上下文注入', () => {
  engine.reset()
  const smCtx = sm.getContext('你好')
  const { prompt } = buildSystemPrompt({
    config: mockConfig, engine, smContext: smCtx,
    messages: [
      { role: 'user', content: '你好' },
      { role: 'assistant', content: '你好，医生' }
    ]
  })
  assert(prompt.includes('考生：你好'))
  assert(prompt.includes('SP：你好，医生'))
})

test('buildSystemPrompt emotionOn=false → 情绪引擎关闭', () => {
  engine.reset()
  const smCtx = sm.getContext('你好')
  const { prompt } = buildSystemPrompt({
    config: mockConfig, engine, smContext: smCtx, messages: [], emotionOn: false
  })
  assert(prompt.includes('情绪引擎已关闭'))
})

// ═══════════════════════════════════════════════════
console.log('=== 6. 性格参数测试 ===')

test('火爆型 exprOffset = -1.5', () => {
  const p = derivePersonality(null, null, { expressiveness: '火爆型', sensitivity: '普通敏感度', resilience: '普通恢复力' })
  assert(p.exprOffset === -1.5)
})

test('隐忍型 exprOffset = 2.0', () => {
  const p = derivePersonality(null, null, { expressiveness: '隐忍型', sensitivity: '普通敏感度', resilience: '普通恢复力' })
  assert(p.exprOffset === 2.0)
})

test('高敏感 sensitivityMul = 1.3', () => {
  const p = derivePersonality(null, null, { expressiveness: '普通型', sensitivity: '高敏感', resilience: '普通恢复力' })
  assert(p.sensitivityMul === 1.3)
})

test('钝感 sensitivityMul = 0.7', () => {
  const p = derivePersonality(null, null, { expressiveness: '普通型', sensitivity: '钝感', resilience: '普通恢复力' })
  assert(p.sensitivityMul === 0.7)
})

test('高豁达 resilienceMul = 1.5', () => {
  const p = derivePersonality(null, null, { expressiveness: '普通型', sensitivity: '普通敏感度', resilience: '高豁达' })
  assert(p.resilienceMul === 1.5)
})

test('低豁达 resilienceMul = 0.6', () => {
  const p = derivePersonality(null, null, { expressiveness: '普通型', sensitivity: '普通敏感度', resilience: '低豁达' })
  assert(p.resilienceMul === 0.6)
})

test('隐忍型+高敏感 angry阈值 = 3+2.0 = 5.0(实际), irritated = 2+2.0 = 4.0', () => {
  const p2 = derivePersonality(null, null, { expressiveness: '隐忍型', sensitivity: '高敏感', resilience: '普通恢复力' })
  const e2 = createEmotionEngine({ baseline: { anger: 0, fear: 0, sadness: 0, joy: 0 }, personality: p2 })
  const sm2 = createStateMachine(e2, { personality: p2 })
  // 平淡输入大量怒气
  e2.processTurn({ anger: 5, fear: 0, sadness: 0, joy: 0 })
  // 5 * 1.3 = 6.5, 隐忍型 threshold: irritated at 2+2.0=4.0 → irritated
  sm2.determineState('offensive')
  assert(sm2.getState() === 'irritated', '隐忍型 anger=6.5 should be irritated, got ' + sm2.getState())
})

test('火爆型 阈值更低 更容易进入高状态', () => {
  const p3 = derivePersonality(null, null, { expressiveness: '火爆型', sensitivity: '普通敏感度', resilience: '普通恢复力' })
  const e3 = createEmotionEngine({ baseline: { anger: 0, fear: 0, sadness: 0, joy: 0 }, personality: p3 })
  const sm3 = createStateMachine(e3, { personality: p3 })
  // 火爆型: irritated at 2+(-1.5)=0.5, angry at 5+(-1.5)=3.5, furious at 8+(-1.5)=6.5
  e3.processTurn({ anger: 7, fear: 0, sadness: 0, joy: 0 })
  sm3.determineState('attack')
  // 7*1.0=7.0 ≥ 6.5 → furious
  assert(sm3.getState() === 'furious', '火爆型 anger=7 should be furious, got ' + sm3.getState())
})

// ═══════════════════════════════════════════════════
console.log('')
console.log(`===== 结果: ${passed} PASS / ${failed} FAIL =====`)
if (failed > 0) process.exit(1)
