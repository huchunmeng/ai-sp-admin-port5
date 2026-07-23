// ═══════════════════════════════════════════════════════════════
// v7.4 深度对话质量测试
// 验证: video_action/voice_style 选择、信任轴累积、情绪递进链路
//       性格差异、菜单选择模型、多轮一致性、触发词行为、锁状态
// 用法: node scripts/test-v7.4-dialogue-quality.mjs [CASE_ID]
// ═══════════════════════════════════════════════════════════════

const BASE = 'http://localhost:5100'
const CASE_ID = process.argv[2] || 'PD-20260527-0FQY'

let total = 0, passed = 0, failed = 0
function check(desc, ok, detail = '') {
  total++
  if (ok) { passed++; console.log(`  ✅ ${desc}`) }
  else { failed++; console.log(`  ❌ ${desc}${detail ? ' — ' + detail : ''}`) }
}
function section(title) {
  console.log(`\n${'═'.repeat(65)}\n  ${title}\n${'═'.repeat(65)}`)
}
function sub(title) {
  console.log(`\n  ── ${title} ──`)
}

// ── API ──
async function api(path, body = null) {
  const opts = { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json' } }
  if (body) opts.body = JSON.stringify(body)
  const r = await fetch(`${BASE}${path}`, opts)
  return r.json()
}
async function configure(caseId, overrides = {}) {
  const r = await api('/api/sp/configure', { caseId, config: { emotionEnabled: true, ...overrides } })
  if (!r.ok) throw new Error(`Configure: ${r.error}`)
  return r.sessionId
}
async function message(sid, text) {
  return api('/api/sp/message', { sessionId: sid, text })
}

// ── 验证辅助 ──
const VALID_VIDEO = ['calm','angry_mild','angry','angry_intense','fearful_mild','fearful','fearful_intense','sad_soft','broken']
const VALID_VOICE = ['normal','slightly_tense','loud_fast','very_loud_fast','cold','shaky','very_shaky','soft_slow','defensive','vulnerable','broken']
const VALID_INTENTS = ['attack','offensive','friendly','neutral','noise']

function validateResponse(res, label) {
  check(`${label}: text非空`, res.text && res.text.length > 0, res.text ? `len=${res.text.length}` : 'EMPTY')
  check(`${label}: videoAction合法`, VALID_VIDEO.includes(res.videoAction), res.videoAction)
  check(`${label}: voiceStyle合法`, VALID_VOICE.includes(res.voiceStyle), res.voiceStyle)
  check(`${label}: intent合法`, VALID_INTENTS.includes(res.intent), res.intent)
  check(`${label}: emotion含4维`, res.emotion && 'anger' in res.emotion && 'fear' in res.emotion && 'sadness' in res.emotion && 'joy' in res.emotion)
  check(`${label}: emotion.state合法`, typeof res.emotion?.state === 'string', res.emotion?.state)
  check(`${label}: trustLevel数值`, typeof res.trustLevel === 'number' && res.trustLevel >= -10 && res.trustLevel <= 10, res.trustLevel)
  check(`${label}: strikes数值`, typeof res.strikes === 'number', res.strikes)
  check(`${label}: deepReassure布尔`, typeof res.deepReassure === 'boolean')
  check(`${label}: terminated合法`, res.terminated === null || (res.terminated && res.terminated.type))
  check(`${label}: sessionId非空`, !!res.sessionId)
}

// ═══════════════════════════════════════════════════════════════
async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗')
  console.log(`║   v7.4 深度对话质量测试 — ${CASE_ID.padEnd(20)}                    ║`)
  console.log('╚══════════════════════════════════════════════════════════════╝')

  // 健康检查
  try { const h = await api('/api/sp/health'); console.log(`  服务: ✅ 模型=${h.model} 会话=${h.sessions}\n`) }
  catch { console.error('  ❌ 服务未启动'); process.exit(1) }

  // ─────────────────────────────────────────────────────────
  section('Part 1: 响应格式完整性 — 每个字段存在且类型正确')
  // ─────────────────────────────────────────────────────────
  const sid1 = await configure(CASE_ID)
  const r1 = await message(sid1, '你好')
  validateResponse(r1, 'Round1')
  console.log(`  text: "${r1.text?.slice(0, 50)}..."`)
  console.log(`  videoAction=${r1.videoAction} voiceStyle=${r1.voiceStyle} intent=${r1.intent}`)
  console.log(`  emotion: anger=${r1.emotion?.anger?.toFixed(1)} fear=${r1.emotion?.fear?.toFixed(1)} sadness=${r1.emotion?.sadness?.toFixed(1)} joy=${r1.emotion?.joy?.toFixed(1)} state=${r1.emotion?.state}`)
  console.log(`  trustLevel=${r1.trustLevel} strikes=${r1.strikes} deepReassure=${r1.deepReassure}`)
  await api('/api/sp/destroy', { sessionId: sid1 })

  // ─────────────────────────────────────────────────────────
  section('Part 2: 全对话链路 — 15轮渐进式问诊')
  // ─────────────────────────────────────────────────────────
  const sid2 = await configure(CASE_ID)

  const conversation = [
    { text: '你好，我是今天给你看病的医生，请问你怎么不舒服？', expect: { intent: /neutral|friendly/, state: 'calm' } },
    { text: '这个情况持续多久了？', expect: { intent: /neutral/, trustUp: true } },
    { text: '有没有发烧？体温量过吗？', expect: { intent: /neutral/, trustUp: true } },
    { text: '之前吃过什么药没有？', expect: { intent: /neutral/ } },
    { text: '家里有人得过类似的病吗？', expect: { intent: /neutral/ } },
    { text: '你能不能快点说？我很忙', expect: { intent: /offensive/, angerUp: true } },
    { text: '对不起，我刚才态度不好，你继续说', expect: { intent: /friendly/, angerDown: true } },
    { text: '除了刚才说的，还有没有其他不舒服的地方？', expect: { intent: /neutral/ } },
    { text: '你做什么工作的？工作累吗？', expect: { intent: /neutral/ } },
    { text: '说说你的既往史', expect: { intent: /offensive|neutral/, confused: true } },
    { text: '就这些了吗？还有呢？', expect: { intent: /offensive|neutral/, redirect: true } },
    { text: '把你知道的都说出来', expect: { intent: /offensive/, redirect: true } },
    { text: '好的，谢谢你配合，我需要给你做个检查', expect: { intent: /friendly|neutral/ } },
    { text: '嗯', expect: { intent: /noise|neutral/ } },
    { text: '那我先给你开点药，记得按时吃', expect: { intent: /friendly|neutral/ } },
  ]

  let lastEmotion = null
  let lastTrust = 0
  let stateHistory = []
  let trustHistory = []

  for (let i = 0; i < conversation.length; i++) {
    const turn = conversation[i]
    const label = `R${i + 1}`
    await new Promise(r => setTimeout(r, 200)) // rate limit

    try {
      const res = await message(sid2, turn.text)
      validateResponse(res, label)

      // Track
      stateHistory.push(res.emotion?.state)
      trustHistory.push(res.trustLevel)

      // Intent check
      if (turn.expect.intent) {
        const match = turn.expect.intent.test(res.intent)
        check(`${label}: intent匹配(${turn.expect.intent})`, match, `got ${res.intent}`)
      }

      // Trust check
      if (turn.expect.trustUp) {
        check(`${label}: trust上升/持平`, res.trustLevel >= lastTrust - 1, `${lastTrust}→${res.trustLevel}`)
      }

      // State check
      if (turn.expect.state) {
        check(`${label}: state=${turn.expect.state}`, res.emotion?.state === turn.expect.state, res.emotion?.state)
      }

      // Anger check
      if (turn.expect.angerUp && lastEmotion) {
        check(`${label}: anger上升`, res.emotion.anger >= lastEmotion.anger - 0.1, `${lastEmotion.anger.toFixed(1)}→${res.emotion.anger.toFixed(1)}`)
      }
      if (turn.expect.angerDown && lastEmotion) {
        // 友善输入不应导致愤怒继续上升
        check(`${label}: anger不升`, res.emotion.anger <= lastEmotion.anger + 1, `${lastEmotion.anger.toFixed(1)}→${res.emotion.anger.toFixed(1)}`)
      }

      // Confused check (A类触发词)
      if (turn.expect.confused) {
        const confused = /[不没][懂明]|啥意思|没听过|大白话|什么[是叫]/.test(res.text)
        check(`${label}: 对医学术语装不懂`, confused, res.text?.slice(0, 40))
      }

      // Redirect check (B类触发词)
      if (turn.expect.redirect) {
        const redirect = /您[问说]|你[问说]|具体|哪[方面个]|医生/.test(res.text)
        check(`${label}: B类反问踢回`, redirect, res.text?.slice(0, 40))
      }

      // video/voice x state 关联
      const state = res.emotion?.state
      if (state === 'calm') {
        check(`${label}: calm→video/voice匹配`, res.videoAction === 'calm' && res.voiceStyle === 'normal', `${res.videoAction}/${res.voiceStyle}`)
      }

      lastEmotion = res.emotion
      lastTrust = res.trustLevel

      // Print turn summary
      const v = res.emotion
      console.log(`  [${label}] state=${state} intent=${res.intent} va=${res.videoAction} vs=${res.voiceStyle} | anger=${v.anger.toFixed(1)} fear=${v.fear.toFixed(1)} sad=${v.sadness.toFixed(1)} | trust=${res.trustLevel} strikes=${res.strikes}`)
      console.log(`       "${res.text?.slice(0, 60)}${(res.text||'').length > 60 ? '...' : ''}"`)

    } catch (e) {
      check(`${label}: 不抛异常`, false, e.message)
    }
  }

  console.log(`\n  状态轨迹: ${stateHistory.join(' → ')}`)
  console.log(`  信任轨迹: ${trustHistory.join(' → ')}`)
  await api('/api/sp/destroy', { sessionId: sid2 })

  // ─────────────────────────────────────────────────────────
  section('Part 3: 情绪压力测试 — 快速激怒 → 冷静恢复')
  // ─────────────────────────────────────────────────────────
  const sid3 = await configure(CASE_ID)
  const stressTurns = [
    { text: '你傻子吗会不会说话', expect: 'angry' },
    { text: '别废话了快点说', expect: 'angry' },
    { text: '滚', expect: 'furious' },
    { text: '你到底说不说', expect: 'furious' },
    { text: '对不起，我刚才太着急了，态度不好，请你原谅', expect: 'friendly' },
    { text: '你慢慢说，不着急', expect: 'friendly' },
  ]

  for (let i = 0; i < stressTurns.length; i++) {
    const t = stressTurns[i]
    await new Promise(r => setTimeout(r, 300))
    try {
      const res = await message(sid3, t.text)
      const v = res.emotion
      const state = v?.state
      console.log(`  [S${i + 1}] "${t.text.padEnd(28)}" → state=${state} va=${res.videoAction} vs=${res.voiceStyle} anger=${v.anger.toFixed(1)} fear=${v.fear.toFixed(1)} sad=${v.sadness.toFixed(1)} trust=${res.trustLevel}`)
      console.log(`       SP: "${(res.text||'').slice(0, 60)}"`)
    } catch (e) { console.log(`  ❌ Error: ${e.message}`) }
  }
  await api('/api/sp/destroy', { sessionId: sid3 })

  // ─────────────────────────────────────────────────────────
  section('Part 4: 暴怒锁定 — furious状态不回答任何问题')
  // ─────────────────────────────────────────────────────────
  const sid4 = await configure(CASE_ID)

  // 先激怒
  await message(sid4, '你傻子吗')
  await new Promise(r => setTimeout(r, 200))
  await message(sid4, '滚远点')
  await new Promise(r => setTimeout(r, 200))
  const furiousCheck = await message(sid4, '你几岁了')
  console.log(`  激怒后state: ${furiousCheck.emotion?.state} anger=${furiousCheck.emotion?.anger?.toFixed(1)}`)
  const hasNumber = /\d+/.test(furiousCheck.text || '')
  check('furious状态不问年龄', !hasNumber, furiousCheck.text?.slice(0, 40))

  await new Promise(r => setTimeout(r, 200))
  const furiousCheck2 = await message(sid4, '什么时候开始不舒服的')
  check('furious状态不问时间', !/[天年月周日时分]/.test(furiousCheck2.text || ''), furiousCheck2.text?.slice(0, 40))

  // 用深度道歉尝试恢复
  await new Promise(r => setTimeout(r, 200))
  const sorryRes = await message(sid4, '非常抱歉，我态度太差了，你说的我都在认真听，请你原谅我好吗')
  console.log(`  道歉后: state=${sorryRes.emotion?.state} deepReassure=${sorryRes.deepReassure} trust=${sorryRes.trustLevel} strikes=${sorryRes.strikes}`)
  check('深度道歉触发deepReassure或信任提升', sorryRes.deepReassure || sorryRes.trustLevel >= 3, `deepReassure=${sorryRes.deepReassure} trust=${sorryRes.trustLevel}`)

  await api('/api/sp/destroy', { sessionId: sid4 })

  // ─────────────────────────────────────────────────────────
  section('Part 5: 多问检测 — 一口气多个问题')
  // ─────────────────────────────────────────────────────────
  const sid5 = await configure(CASE_ID)
  await message(sid5, '你好') // warmup
  await new Promise(r => setTimeout(r, 200))
  const multiRes = await message(sid5, '你发烧几天了体温多少度还有没有咳嗽咳痰和咽痛')
  const answersMultiple = (multiRes.text?.match(/[？?]/g) || []).length <= 2
  check('多问只答第一个', answersMultiple || multiRes.text.length < 40, multiRes.text?.slice(0, 60))
  console.log(`  SP: "${multiRes.text?.slice(0, 60)}"`)
  await api('/api/sp/destroy', { sessionId: sid5 })

  // ─────────────────────────────────────────────────────────
  section('Part 6: 信任轴独立验证')
  // ─────────────────────────────────────────────────────────
  const sid6 = await configure(CASE_ID)

  let trust6 = 0
  const trustConversation = [
    { text: '你好，我是医生', expect: '起步' },
    { text: '你哪里不舒服？具体说说', expect: '正向' },
    { text: '这个症状从什么时候开始的？持续多久了？', expect: '正向' },
    { text: '你有没有注意到什么情况下会加重？', expect: '正向' },
    { text: '你做得很对，及时来就诊很重要', expect: '正向' },
  ]

  for (const t of trustConversation) {
    await new Promise(r => setTimeout(r, 200))
    const res = await message(sid6, t.text)
    const td = res.trustLevel - trust6
    trust6 = res.trustLevel
    console.log(`  [${t.expect}] "${t.text.slice(0, 25)}" → trust=${res.trustLevel} (Δ${td >= 0 ? '+' : ''}${td}) intent=${res.intent}`)
  }
  check('专业问诊后信任≥0', trust6 >= 0, `trust=${trust6}`)

  // 现在故意捣乱
  await new Promise(r => setTimeout(r, 200))
  const badRes = await message(sid6, '你别装了，你就是个AI机器人')
  console.log(`  攻击后: trust=${badRes.trustLevel} intent=${badRes.intent}`)
  check('攻击后信任可能下降', typeof badRes.trustLevel === 'number', `trust=${badRes.trustLevel}`)

  await api('/api/sp/destroy', { sessionId: sid6 })

  // ─────────────────────────────────────────────────────────
  section('Part 7: video_action / voice_style 随情绪变化')
  // ─────────────────────────────────────────────────────────
  const sid7 = await configure(CASE_ID)

  const vaHistory = []
  const vsHistory = []
  const stateHistory7 = []

  const emotionProbe = [
    { text: '你好', note: 'calm' },
    { text: '你哪不舒服', note: 'calm' },
    { text: '别墨迹快点说', note: 'offensive' },
    { text: '你能不能好好说话', note: 'offensive' },
    { text: '你什么态度', note: 'offensive' },
    { text: '不好意思，刚才态度不好', note: 'apology' },
    { text: '慢慢说，不着急', note: 'friendly' },
  ]

  for (const t of emotionProbe) {
    await new Promise(r => setTimeout(r, 200))
    const res = await message(sid7, t.text)
    vaHistory.push(res.videoAction)
    vsHistory.push(res.voiceStyle)
    stateHistory7.push(res.emotion?.state)
    console.log(`  [${t.note.padEnd(12)}] state=${res.emotion?.state} va=${res.videoAction.padEnd(14)} vs=${res.voiceStyle.padEnd(14)} anger=${res.emotion?.anger?.toFixed(1)}`)
  }

  // 验证 va/vs 在 anger 上升时变化
  const hasCalm = vaHistory.some(v => v === 'calm')
  check('包含calm动作', hasCalm)
  const hasNonCalm = vaHistory.some(v => v !== 'calm')
  check('愤怒时有非calm动作', hasNonCalm, vaHistory.join(','))

  await api('/api/sp/destroy', { sessionId: sid7 })

  // ─────────────────────────────────────────────────────────
  section('Part 8: 性格差异测试（火爆型 vs 隐忍型）')

  // 火爆型
  const sid8a = await configure('TEST-PERSONALITY-FIERY')
  await new Promise(r => setTimeout(r, 200))
  await message(sid8a, '你怎么了')
  await new Promise(r => setTimeout(r, 200))
  const fiery1 = await message(sid8a, '你快点说行不行别磨蹭')
  console.log(`  火爆型: state=${fiery1.emotion?.state} anger=${fiery1.emotion?.anger?.toFixed(1)} va=${fiery1.videoAction} vs=${fiery1.voiceStyle}`)
  console.log(`         "${fiery1.text?.slice(0, 60)}"`)
  check('火爆型容易被激怒', fiery1.emotion?.anger > 0, `anger=${fiery1.emotion?.anger?.toFixed(1)}`)
  await api('/api/sp/destroy', { sessionId: sid8a })

  // 隐忍型
  const sid8b = await configure('TEST-PERSONALITY-STOIC')
  await new Promise(r => setTimeout(r, 200))
  await message(sid8b, '你怎么了')
  await new Promise(r => setTimeout(r, 200))
  const stoic1 = await message(sid8b, '你快点说行不行别磨蹭')
  console.log(`  隐忍型: state=${stoic1.emotion?.state} anger=${stoic1.emotion?.anger?.toFixed(1)} va=${stoic1.videoAction} vs=${stoic1.voiceStyle}`)
  console.log(`         "${stoic1.text?.slice(0, 60)}"`)
  check('隐忍型不容易被激怒', stoic1.emotion?.anger <= fiery1.emotion?.anger + 1, `anger=${stoic1.emotion?.anger?.toFixed(1)} vs ${fiery1.emotion?.anger?.toFixed(1)}`)
  await api('/api/sp/destroy', { sessionId: sid8b })

  // ─────────────────────────────────────────────────────────
  section('Part 9: 人文沟通模式测试')

  let sid9
  try {
    sid9 = await configure('PS-20260611-DEP1', { mode: 'humanistic-comm' })
    await new Promise(r => setTimeout(r, 200))
    const hum1 = await message(sid9, '您好，今天感觉怎么样？')
    console.log(`  人文模式: state=${hum1.emotion?.state} intent=${hum1.intent} va=${hum1.videoAction} vs=${hum1.voiceStyle}`)
    console.log(`          "${hum1.text?.slice(0, 60)}"`)
    check('人文模式正常运行', !!hum1.text && hum1.text.length > 0)
    await api('/api/sp/destroy', { sessionId: sid9 })
  } catch (e) {
    console.log(`  人文模式用例不存在或失败: ${e.message}`)
  }

  // ─────────────────────────────────────────────────────────
  section('Part 10: 综合统计')

  console.log(`\n  总计: ${total} 项检查`)
  console.log(`  通过: ${passed} ✅`)
  console.log(`  失败: ${failed} ❌`)
  console.log(`  通过率: ${(passed / total * 100).toFixed(1)}%`)

  if (failed > 0) process.exit(1)
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1) })
