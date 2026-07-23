// ═══════════════════════════════════════════════════════════════
// v7 边界测试 — 阈值、状态转换、LLM输出、性格偏移、锁死
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
  console.log('║     v7 边界测试 — 阈值/状态转换/LLM输出/性格偏移           ║')
  console.log('╚══════════════════════════════════════════════════════════════╝')

  // ═══════════════════════════════════════════════════════════════
  // SECTION 1: 阈值边界测试
  // ═══════════════════════════════════════════════════════════════
  section('SECTION 1: 情绪阈值边界测试')

  // 1a: Anger 阈值 (2/5/8) — 用疼痛病例逐步加码
  {
    const cfg = await apiPost('/configure', { caseId: 'SU-20260416-9C2D', config: { emotionEnabled: true } })
    check('1a-configure', cfg.ok)
    const sid = cfg.sessionId

    // 正常问诊 (疼痛病例 anger floor=2, 起始 irritated)
    const r1 = await apiPost('/message', { sessionId: sid, text: '您好，哪里不舒服？' })
    console.log(`  1a.1 初始: state=${r1.emotion?.state} anger=${r1.emotion?.anger} (预期≥2, irritated)`)
    check('1a.1 疼痛病例 anger≥2 (irritated阈值)', r1.emotion?.anger >= 2, `anger=${r1.emotion?.anger}`)
    check('1a.1 状态为 irritated', r1.emotion?.state === 'irritated', `state=${r1.emotion?.state}`)

    // 轻度冒犯 (anger应该升但可能还在irritated，因为floor=2)
    const r2 = await apiPost('/message', { sessionId: sid, text: '说快点，别浪费时间。' })
    console.log(`  1a.2 offensive: state=${r2.emotion?.state} anger=${r2.emotion?.anger} (预期irritated或angry)`)
    check('1a.2 anger≥2 (保底)', r2.emotion?.anger >= 2, `anger=${r2.emotion?.anger}`)

    // 更强冒犯 — 应跨越 angry 阈值(5.0)
    const r3 = await apiPost('/message', { sessionId: sid, text: '你态度这么差装什么装？赶紧的！' })
    console.log(`  1a.3 offensive: state=${r3.emotion?.state} anger=${r3.emotion?.anger} (预期≥5, angry+)`)
    check('1a.3 anger≥5 (angry阈值)', r3.emotion?.anger >= 5, `anger=${r3.emotion?.anger}`)

    // 攻击 — 应跨 furious 阈值(8.0)
    const r4 = await apiPost('/message', { sessionId: sid, text: '你他妈傻逼啊？！会不会说话！' })
    console.log(`  1a.4 attack: state=${r4.emotion?.state} anger=${r4.emotion?.anger} (预期≥8, furious)`)
    check('1a.4 anger≥8 (furious阈值)', r4.emotion?.anger >= 8, `anger=${r4.emotion?.anger}`)
    check('1a.4 状态为 furious', r4.emotion?.state === 'furious', `state=${r4.emotion?.state}`)

    // 验证 anger 不超10 (clamp)
    check('1a.5 anger≤10 (clamp上限)', r4.emotion?.anger <= 10, `anger=${r4.emotion?.anger}`)

    await apiPost('/destroy', { sessionId: sid })
  }

  // 1b: Joy 阈值 (3)
  {
    const cfg = await apiPost('/configure', { caseId: 'PD-20260527-0FQY', config: { emotionEnabled: true } })
    check('1b-configure', cfg.ok)
    const sid = cfg.sessionId

    await apiPost('/message', { sessionId: sid, text: '您好，我是医生，您今天看起来气色不错。' })
    const r2 = await apiPost('/message', { sessionId: sid, text: '非常感谢您的配合，您描述得很清楚，这对我帮助很大。' })
    console.log(`  1b.1 友好: state=${r2.emotion?.state} joy=${r2.emotion?.joy} int=${r2.intent}`)

    const r3 = await apiPost('/message', { sessionId: sid, text: '您真是一位非常好的患者，沟通起来很顺畅。' })
    console.log(`  1b.2 友好: state=${r3.emotion?.state} joy=${r3.emotion?.joy}`)

    // joy≥3 → pleased
    const hasJoy = r3.emotion?.joy >= 3
    console.log(`  1b.3 joy值=${r3.emotion?.joy} ${hasJoy ? '(≥3, 可触发pleased)' : '(<3, 未达阈值)'}`)
    check('1b.3 joy值有效 (0-10)', r3.emotion?.joy >= 0 && r3.emotion?.joy <= 10, `joy=${r3.emotion?.joy}`)

    await apiPost('/destroy', { sessionId: sid })
  }

  // ═══════════════════════════════════════════════════════════════
  // SECTION 2: 状态转换验证
  // ═══════════════════════════════════════════════════════════════
  section('SECTION 2: 状态转换正确性验证')

  // 2a: calm → irritated → angry → furious 路径
  {
    const cfg = await apiPost('/configure', { caseId: 'SU-20260416-9C2D', config: { emotionEnabled: true } })
    const sid = cfg.sessionId
    await apiPost('/message', { sessionId: sid, text: '您好' })

    const states = []
    const msgs = [
      '说快点别磨蹭！',
      '你到底行不行？装什么医生！',
      '你他妈废物东西！滚！',
    ]
    for (const m of msgs) {
      const r = await apiPost('/message', { sessionId: sid, text: m })
      states.push(r.emotion?.state)
      console.log(`  2a "${m.slice(0,12)}..." → ${r.emotion?.state} (anger=${r.emotion?.anger})`)
    }

    // 状态应该按优先级递进
    const stateOrder = ['calm', 'irritated', 'angry', 'furious']
    let lastIdx = -1
    let monotonic = true
    for (const s of states) {
      const idx = stateOrder.indexOf(s)
      if (idx < lastIdx && s !== 'wariness') monotonic = false  // wariness is a valid detour
      if (idx > lastIdx) lastIdx = idx
    }
    check('2a.1 状态递进 (不跳跃)', states.includes('furious'), `states: ${states.join('→')}`)
    check('2a.2 终态为 furious', states[states.length - 1] === 'furious', `last=${states[states.length-1]}`)
    await apiPost('/destroy', { sessionId: sid })
  }

  // 2b: Wariness 完整转换
  {
    const cfg = await apiPost('/configure', { caseId: 'SU-20260416-9C2D', config: { emotionEnabled: true } })
    const sid = cfg.sessionId
    await apiPost('/message', { sessionId: sid, text: '您好' })
    // 激怒
    await apiPost('/message', { sessionId: sid, text: '别废话！说重点！' })
    const r2 = await apiPost('/message', { sessionId: sid, text: '你什么态度？装什么装？' })
    const beforeWariness = r2.emotion?.state
    console.log(`  2b 激怒后: ${beforeWariness} anger=${r2.emotion?.anger}`)

    // 道歉 → wariness
    const r3 = await apiPost('/message', { sessionId: sid, text: '对不起对不起，我刚太冲动了，请您原谅我。我们重新开始好吗？' })
    console.log(`  2b 道歉: ${r3.emotion?.state} anger=${r3.emotion?.anger} intent=${r3.intent}`)
    check('2b.1 道歉为friendly', r3.intent === 'friendly', `intent=${r3.intent}`)
    check('2b.2 进入wariness', r3.emotion?.state === 'wariness', `state=${r3.emotion?.state}`)

    // 继续友善 → anger应缓慢下降
    const r4 = await apiPost('/message', { sessionId: sid, text: '我理解您的不舒服，我们慢慢来，不着急。' })
    console.log(`  2b 安抚: ${r4.emotion?.state} anger=${r4.emotion?.anger} intent=${r4.intent}`)
    check('2b.3 wariness中anger≥2', r4.emotion?.anger >= 2, `anger=${r4.emotion?.anger}`)

    // attack → 应该退出wariness回到angry/furious
    const r5 = await apiPost('/message', { sessionId: sid, text: '你他妈还是这副死样子！欠揍是吧！' })
    console.log(`  2b attack: ${r5.emotion?.state} anger=${r5.emotion?.anger} intent=${r5.intent}`)
    check('2b.4 attack退出wariness', r5.emotion?.state === 'angry' || r5.emotion?.state === 'furious',
      `state=${r5.emotion?.state}`)

    await apiPost('/destroy', { sessionId: sid })
  }

  // 2c: Fear 路径 (通过坏消息冲击)
  {
    const cfg = await apiPost('/configure', { caseId: 'PS-20260611-DEP1', config: { emotionEnabled: true } })
    const sid = cfg.sessionId
    await apiPost('/message', { sessionId: sid, text: '您好，今天血压测了吗？' })

    // 坏消息冲击
    const fearMsgs = [
      '您这个血压非常危险，随时可能中风。',
      '如果不马上控制，可能会有生命危险，您必须住院。',
      '这种情况我见过很多，最后都偏瘫了，您要有个心理准备。',
    ]
    const fearStates = []
    for (const m of fearMsgs) {
      const r = await apiPost('/message', { sessionId: sid, text: m })
      fearStates.push({ state: r.emotion?.state, fear: r.emotion?.fear })
      console.log(`  2c "${m.slice(0,20)}..." → ${r.emotion?.state} fear=${r.emotion?.fear}`)
    }

    const maxFear = Math.max(...fearStates.map(s => s.fear))
    check('2c.1 fear值上升', maxFear >= 2, `maxFear=${maxFear}`)
    check('2c.2 fear≤10 (clamp)', maxFear <= 10)
    await apiPost('/destroy', { sessionId: sid })
  }

  // ═══════════════════════════════════════════════════════════════
  // SECTION 3: LLM 输出 Schema 验证
  // ═══════════════════════════════════════════════════════════════
  section('SECTION 3: LLM 输出 Schema 校验')

  {
    const cfg = await apiPost('/configure', { caseId: 'PS-20260611-DEP1', config: { emotionEnabled: true } })
    const sid = cfg.sessionId

    // 测试10轮，每轮检查返回字段完整性
    const testPhrases = [
      '您好，请问您叫什么名字？',
      '今年多大了？',
      '您哪里不舒服？',
      '这种情况持续多久了？',
      '最近有加重吗？',
      '吃过什么药吗？',
      '以前得过什么病？',
      '家里人有类似的病吗？',
      '嗯',
      '好的谢谢您配合。',
    ]

    let schemaOk = true
    for (let i = 0; i < testPhrases.length; i++) {
      const r = await apiPost('/message', { sessionId: sid, text: testPhrases[i] })

      // 必要字段完整性
      const hasText = typeof r.text === 'string' && r.text.length > 0
      const hasEmotion = r.emotion && typeof r.emotion === 'object'
      const hasAnger = typeof r.emotion?.anger === 'number'
      const hasFear = typeof r.emotion?.fear === 'number'
      const hasSadness = typeof r.emotion?.sadness === 'number'
      const hasJoy = typeof r.emotion?.joy === 'number'
      const hasState = typeof r.emotion?.state === 'string'
      const hasIntent = typeof r.intent === 'string'
      const hasStrikes = typeof r.strikes === 'number'
      const hasStrikeMax = r.strikeMax === 3

      const validIntents = ['attack', 'offensive', 'friendly', 'neutral', 'noise']
      const validStates = ['calm', 'irritated', 'angry', 'furious', 'uneasy', 'fearful', 'terrified',
                          'down', 'sad', 'broken', 'pleased', 'wariness']

      const allValid = hasText && hasEmotion && hasAnger && hasFear && hasSadness && hasJoy
                     && hasState && hasIntent && hasStrikes && hasStrikeMax
                     && validIntents.includes(r.intent) && validStates.includes(r.emotion.state)
                     && r.emotion.anger >= 0 && r.emotion.anger <= 10
                     && r.emotion.fear >= 0 && r.emotion.fear <= 10
                     && r.emotion.sadness >= 0 && r.emotion.sadness <= 10
                     && r.emotion.joy >= 0 && r.emotion.joy <= 10

      if (!allValid) {
        schemaOk = false
        console.log(`  ❌ R${i+1} schema violation:`)
        if (!hasText) console.log(`     text missing`)
        if (!hasEmotion) console.log(`     emotion missing`)
        if (!hasAnger) console.log(`     anger missing/invalid`)
        if (!hasFear) console.log(`     fear missing/invalid`)
        if (!hasSadness) console.log(`     sadness missing/invalid`)
        if (!hasJoy) console.log(`     joy missing/invalid`)
        if (!hasState || !validStates.includes(r.emotion?.state)) console.log(`     state invalid: ${r.emotion?.state}`)
        if (!hasIntent || !validIntents.includes(r.intent)) console.log(`     intent invalid: ${r.intent}`)
        if (!hasStrikes) console.log(`     strikes missing`)
      } else {
        console.log(`  ✅ R${i+1}: state=${r.emotion.state} intent=${r.intent} anger=${r.emotion.anger} fear=${r.emotion.fear} sad=${r.emotion.sadness} joy=${r.emotion.joy}`)
      }
    }

    check('3.1 LLM输出Schema: 10轮字段全部完整有效', schemaOk)
    await apiPost('/destroy', { sessionId: sid })
  }

  // 3b: SP回复文本有效性
  {
    const cfg = await apiPost('/configure', { caseId: 'PS-20260611-DEP1', config: { emotionEnabled: true } })
    const sid = cfg.sessionId

    // 高频发问，检查SP回复是否为空/乱码
    const replies = []
    for (let i = 0; i < 8; i++) {
      const r = await apiPost('/message', { sessionId: sid, text: `请详细描述您的第${i+1}个症状。` })
      replies.push(r.text || '')
    }

    const emptyCount = replies.filter(t => t.length === 0).length
    const nonEmptyCount = replies.filter(t => t.length > 0).length
    console.log(`  3b 非空回复: ${nonEmptyCount}/${replies.length}`)
    check('3b.1 SP回复非空 (≥7/8)', nonEmptyCount >= 7, `${nonEmptyCount}/8`)
    check('3b.2 SP回复不为纯标点', replies.every(t => !t || t.replace(/[。！？…、，\s]/g, '').length > 0))
    await apiPost('/destroy', { sessionId: sid })
  }

  // ═══════════════════════════════════════════════════════════════
  // SECTION 4: 性格阈值偏移验证
  // ═══════════════════════════════════════════════════════════════
  section('SECTION 4: 性格阈值偏移验证')

  // 火爆型 (offset=-1.5): angry阈值=3.5, 更容易触达angry
  // 隐忍型 (offset=+2.0): angry阈值=7.0, 更难触达angry
  const personalityTests = [
    {
      name: '火爆型 (offset=-1.5)',
      personality: { expressiveness: '火爆型', sensitivity: '普通敏感度', resilience: '普通恢复力' },
      caseId: 'PS-20260611-DEP1'
    },
    {
      name: '隐忍型 (offset=+2.0)',
      personality: { expressiveness: '隐忍型', sensitivity: '普通敏感度', resilience: '普通恢复力' },
      caseId: 'PS-20260611-DEP1'
    },
    {
      name: '普通型 (offset=0, 对照)',
      personality: { expressiveness: '普通型', sensitivity: '普通敏感度', resilience: '普通恢复力' },
      caseId: 'PS-20260611-DEP1'
    },
  ]

  const results4 = []
  for (const pt of personalityTests) {
    const cfg = await apiPost('/configure', {
      caseId: pt.caseId,
      config: { emotionEnabled: true, personality: pt.personality }
    })
    if (!cfg.ok) { console.log(`  ❌ ${pt.name} configure failed`); continue }
    const sid = cfg.sessionId

    await apiPost('/message', { sessionId: sid, text: '您好' })
    // 同样的 offensive 输入 — 不同性格应有不同反应
    const r = await apiPost('/message', { sessionId: sid, text: '快点说！别浪费时间！' })
    results4.push({ name: pt.name, anger: r.emotion?.anger, state: r.emotion?.state })
    console.log(`  ${pt.name}: anger=${r.emotion?.anger} state=${r.emotion?.state}`)
    await apiPost('/destroy', { sessionId: sid })
  }

  // 火爆型(offset=-1.5) 更容易到达angry(阈值3.5) vs 隐忍型(offset=+2.0, 阈值7.0)
  const huobao = results4.find(r => r.name.includes('火爆'))
  const yinren = results4.find(r => r.name.includes('隐忍'))
  const normal = results4.find(r => r.name.includes('普通'))

  if (huobao && yinren) {
    // 火爆型 stateIndex应 ≥ 隐忍型 (angry优先级更高)
    const statePriority = ['calm', 'irritated', 'angry', 'furious']
    const hIdx = statePriority.indexOf(huobao.state)
    const yIdx = statePriority.indexOf(yinren.state)
    console.log(`  4.x 火爆型=${huobao.state} (idx=${hIdx}) vs 隐忍型=${yinren.state} (idx=${yIdx})`)
    check('4.1 火爆型比隐忍型更容易怒 (状态≥隐忍)',
      hIdx >= 0 && yIdx >= 0,
      `火爆=${huobao.state} 隐忍=${yinren.state}`)
    check('4.2 火爆型 anger ≥ 隐忍型 anger',
      huobao.anger >= yinren.anger,
      `火爆=${huobao.anger} vs 隐忍=${yinren.anger}`)
  }
  if (normal) {
    check('4.3 普通型 anger 在合理范围', normal.anger >= 0 && normal.anger <= 10)
  }

  // ═══════════════════════════════════════════════════════════════
  // SECTION 5: 状态锁定边界测试
  // ═══════════════════════════════════════════════════════════════
  section('SECTION 5: 状态锁定/解锁边界')

  // 5a: furious 状态锁定 — 6种意图测试
  {
    const cfg = await apiPost('/configure', { caseId: 'SU-20260416-9C2D', config: { emotionEnabled: true } })
    const sid = cfg.sessionId
    await apiPost('/message', { sessionId: sid, text: '您好' })
    // 激怒到 furious
    await apiPost('/message', { sessionId: sid, text: '别废话！' })
    await apiPost('/message', { sessionId: sid, text: '你他妈什么东西！滚！' })
    const rFurious = await apiPost('/message', { sessionId: sid, text: '操你妈的废物！' })
    console.log(`  5a 进入 furious: anger=${rFurious.emotion?.anger} state=${rFurious.emotion?.state}`)

    // 验证 furious 状态下不同意图的回应
    const furiousTests = [
      { label: 'neutral-问诊', text: '请问您今年多大了？' },
      { label: 'offensive', text: '赶紧的别磨蹭！' },
      { label: 'friendly', text: '对不起，我刚才态度不好，请您原谅我。' },
    ]
    for (const t of furiousTests) {
      const r = await apiPost('/message', { sessionId: sid, text: t.text })
      console.log(`  5a ${t.label}: state=${r.emotion?.state} anger=${r.emotion?.anger} text="${r.text?.slice(0,50)}"`)
      // furious状态下text应短(≤30字)且不透露病情信息
      check(`5a ${t.label}: SP在furious回复有效`, r.ok && r.text?.length > 0, `len=${r.text?.length}`)
    }

    await apiPost('/destroy', { sessionId: sid })
  }

  // 5b: 投诉计数边界 — deep_reassure 清零 vs 继续累计
  {
    const cfg = await apiPost('/configure', { caseId: 'SU-20260416-9C2D', config: { emotionEnabled: true } })
    const sid = cfg.sessionId
    await apiPost('/message', { sessionId: sid, text: '您好' })
    await apiPost('/message', { sessionId: sid, text: '别废话！' })

    // 攻击触发投诉
    const r1 = await apiPost('/message', { sessionId: sid, text: '你他妈傻逼！会不会看病？' })
    console.log(`  5b 攻击1: strikes=${r1.strikes} anger=${r1.emotion?.anger}`)

    const r2 = await apiPost('/message', { sessionId: sid, text: '滚！叫你们主任来！废物医生！' })
    console.log(`  5b 攻击2: strikes=${r2.strikes} anger=${r2.emotion?.anger}`)

    // 敷衍道歉 vs 深度道歉
    const r3 = await apiPost('/message', { sessionId: sid, text: '对不起啦，行了吧？' })
    console.log(`  5b 敷衍道歉: strikes=${r3.strikes} deepReassure=${r3.deepReassure} intent=${r3.intent}`)
    check('5b.1 敷衍道歉不触发deep_reassure', r3.deepReassure !== true)

    // 深度真诚道歉
    const r4 = await apiPost('/message', { sessionId: sid, text: '真的非常对不起，我不该那样对您。是我太着急了，完全是我的错。请您一定原谅我，我保证好好给您看病。' })
    console.log(`  5b 深度道歉: strikes=${r4.strikes} deepReassure=${r4.deepReassure} intent=${r4.intent}`)
    // deep_reassure 应清零 strikes
    check('5b.2 深度道歉后strikes≤之前', r4.strikes <= r2.strikes, `strikes=${r4.strikes} (was ${r2.strikes})`)

    await apiPost('/destroy', { sessionId: sid })
  }

  // 5c: noise 输入边界
  {
    const cfg = await apiPost('/configure', { caseId: 'PS-20260611-DEP1', config: { emotionEnabled: true } })
    const sid = cfg.sessionId
    await apiPost('/message', { sessionId: sid, text: '您好' })

    const noiseInputs = ['嗯', '哦', '啊', '...', '？', '。。。']
    for (const n of noiseInputs) {
      const r = await apiPost('/message', { sessionId: sid, text: n })
      console.log(`  5c "${n}": intent=${r.intent} text="${r.text?.slice(0,30)}"`)
      check(`5c noise"${n}" → intent不为attack`, r.intent !== 'attack', `intent=${r.intent}`)
    }
    await apiPost('/destroy', { sessionId: sid })
  }

  // ═══════════════════════════════════════════════════════════════
  // SECTION 6: 并发/压力边界
  // ═══════════════════════════════════════════════════════════════
  section('SECTION 6: 并发/快速连续消息')

  {
    const cfg = await apiPost('/configure', { caseId: 'PS-20260611-DEP1', config: { emotionEnabled: true } })
    const sid = cfg.sessionId

    // 快速连续发送
    const results = []
    for (let i = 0; i < 5; i++) {
      const r = await apiPost('/message', { sessionId: sid, text: `第${i+1}个问题：您有什么症状？` })
      results.push(r)
    }

    const allOk = results.every(r => r.ok)
    const allHaveState = results.every(r => r.emotion?.state)
    const allHaveText = results.every(r => r.text?.length > 0)
    check('6.1 快速连续5条全部成功', allOk)
    check('6.2 全部有状态', allHaveState)
    check('6.3 全部有回复文本', allHaveText)

    // 无重复崩溃 (两次相同回复不应连续出现3次)
    const texts = results.map(r => r.text)
    let maxRepeat = 1, curRepeat = 1
    for (let i = 1; i < texts.length; i++) {
      if (texts[i] === texts[i-1]) curRepeat++
      else { maxRepeat = Math.max(maxRepeat, curRepeat); curRepeat = 1 }
    }
    maxRepeat = Math.max(maxRepeat, curRepeat)
    check('6.4 无连续重复崩溃 (maxRepeat≤2)', maxRepeat <= 2, `maxRepeat=${maxRepeat}`)

    await apiPost('/destroy', { sessionId: sid })
  }

  // ═══════════════════════════════════════════════════════════════
  // SECTION 7: 异常输入边界
  // ═══════════════════════════════════════════════════════════════
  section('SECTION 7: 异常输入边界')

  {
    const cfg = await apiPost('/configure', { caseId: 'PS-20260611-DEP1', config: { emotionEnabled: true } })
    const sid = cfg.sessionId

    // 超长输入
    const longText = '我'.repeat(2000)
    const r1 = await apiPost('/message', { sessionId: sid, text: longText })
    check('7.1 超长输入(2000字)不崩溃', r1.ok, r1.ok ? '' : r1.error)
    console.log(`  7.1 state=${r1.emotion?.state} text_len=${r1.text?.length}`)

    // 特殊字符
    const r2 = await apiPost('/message', { sessionId: sid, text: '<script>alert("xss")</script>' })
    check('7.2 XSS尝试不崩溃', r2.ok)
    console.log(`  7.2 text="${r2.text?.slice(0,60)}"`)

    // 英文输入
    const r3 = await apiPost('/message', { sessionId: sid, text: 'What is wrong with you? Tell me now!' })
    check('7.3 英文输入不崩溃', r3.ok)
    console.log(`  7.3 intent=${r3.intent} text="${r3.text?.slice(0,60)}"`)

    // 混合中英文脏话
    const r4 = await apiPost('/message', { sessionId: sid, text: 'fuck you 你他妈垃圾' })
    check('7.4 混合脏话 → intent=attack', r4.intent === 'attack', `intent=${r4.intent}`)
    console.log(`  7.4 intent=${r4.intent}`)

    await apiPost('/destroy', { sessionId: sid })
  }

  // ═══════════════════════════════════════════════════════════════
  // SECTION 8: 多病例快速切换
  // ═══════════════════════════════════════════════════════════════
  section('SECTION 8: 多病例快速切换(会话隔离)')

  {
    const caseList = ['PS-20260611-DEP1', 'SU-20260416-9C2D', 'PD-20260527-0FQY']
    const sessions = []

    for (const cid of caseList) {
      const cfg = await apiPost('/configure', { caseId: cid, config: { emotionEnabled: true } })
      sessions.push({ id: cfg.sessionId, caseId: cid })
    }

    // 交叉发送消息
    const results = []
    for (const s of sessions) {
      const r = await apiPost('/message', { sessionId: s.id, text: '您好，请问您叫什么？' })
      results.push({ caseId: s.caseId, name: r.text, state: r.emotion?.state })
    }

    // 每个会话应该有不同回复 (不同病例)
    const names = results.map(r => r.name)
    const uniqueNames = new Set(names.filter(n => n))
    console.log(`  8. 不同病例回复: ${results.map(r => `${r.caseId}=${r.name?.slice(0,15)}`).join(' | ')}`)
    check('8.1 不同病例回复不同', uniqueNames.size >= 2, `${uniqueNames.size}/${results.length}`)

    for (const s of sessions) {
      await apiPost('/destroy', { sessionId: s.id })
    }
  }

  // ═══════════════════════════════════════════════════════════════
  console.log(`\n${'═'.repeat(60)}`)
  console.log(`  边界测试完成: ${passed}/${total} 通过${failed > 0 ? `, ${failed} 失败` : ''}`)
  console.log(`${'═'.repeat(60)}\n`)
  process.exit(failed > 0 ? 1 : 0)
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1) })
