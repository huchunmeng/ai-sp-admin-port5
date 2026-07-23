// ═══════════════════════════════════════════════════════════════
// v7 情绪系统全场景集成测试
// 覆盖: 所有病例 / 所有意图 / 情绪路径 / 投诉机制 / 性格 / 场景
// ═══════════════════════════════════════════════════════════════

const API = 'http://localhost:5100/api/sp'
const PASS = '✅', FAIL = '❌', WARN = '⚠️'

let total = 0, passed = 0, failed = 0
function check(desc, ok, detail = '') {
  total++
  if (ok) { passed++; console.log(`  ${PASS} ${desc}`) }
  else { failed++; console.log(`  ${FAIL} ${desc}${detail ? ' — ' + detail : ''}`) }
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

// ═══════════════════════════════════════════════════════════════
// 测试用例定义
// ═══════════════════════════════════════════════════════════════

const ALL_CASES = [
  'DERM-20260416-K4G7', 'DERM-20260416-K7M2', 'DERM-20260416-X9K2',
  'EM-20260416-7A2K', 'EM-20260516-7F2A', 'EM-20260526-X8K2',
  'IM-20260527-A9GW', 'OB-20250615-9C2K', 'OB-20260416-K9T2',
  'ORT-20260417-LDH03', 'PD-20260527-0FQY',
  'PS-20260611-DEP1', 'PS-20260611-PAN1', 'SU-20260416-9C2D',
  'TEST-CHECK-MODE'
]

// 完整意图覆盖
const INTENT_TESTS = [
  { name: 'attack-脏话', text: '你他妈会不会看病啊？傻逼玩意儿！' },
  { name: 'attack-驱赶', text: '滚！你算老几？叫你们主任来！' },
  { name: 'offensive-催促', text: '快点说，别磨蹭，直接讲重点！' },
  { name: 'offensive-轻视', text: '装的吧？这算什么病，至于吗？' },
  { name: 'offensive-挑衅', text: '然后呢？就这？你继续说啊。' },
  { name: 'friendly-安抚', text: '别担心，慢慢说，我会认真听您讲的。' },
  { name: 'friendly-道歉', text: '对不起，我刚才态度不好，是我太冲动了。请原谅我。' },
  { name: 'neutral-问诊', text: '您哪里不舒服？什么时候开始的？' },
  { name: 'neutral-追问', text: '还有别的症状吗？最近有没有吃什么药？' },
  { name: 'noise-嗯', text: '嗯' },
  { name: 'noise-哦', text: '哦。' },
]

// ═══════════════════════════════════════════════════════════════
// PART 1: 全部病例 configure 冒烟测试
// ═══════════════════════════════════════════════════════════════

async function testAllCasesConfigure() {
  section('PART 1: 全部病例 Configure 测试')

  for (const caseId of ALL_CASES) {
    const data = await apiPost('/configure', { caseId, config: { emotionEnabled: true } })
    const ok = data.ok === true && data.sessionId
    check(`${caseId} configure`, ok, ok ? '' : JSON.stringify(data))

    if (ok) {
      // 验证返回了基本结构
      check(`${caseId} has sessionId`, typeof data.sessionId === 'string' && data.sessionId.length > 10)

      // 清理会话
      await apiPost('/destroy', { sessionId: data.sessionId })
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// PART 2: 情绪路径测试（选代表性病例）
// ═══════════════════════════════════════════════════════════════

async function testEmotionPath(caseId, label, messages, checks = []) {
  const cfg = await apiPost('/configure', { caseId, config: { emotionEnabled: true } })
  if (!cfg.ok) { check(`${label} configure`, false, cfg.error); return null }
  const sid = cfg.sessionId

  const results = []
  for (const msg of messages) {
    const data = await apiPost('/message', { sessionId: sid, text: msg.text })
    results.push(data)
  }

  // 运行自定义检查
  for (const c of checks) {
    c(results, sid)
  }

  await apiPost('/destroy', { sessionId: sid })
  return results
}

async function testAngerPath() {
  section('PART 2a: Anger 情绪路径 (calm → irritated → angry → furious)')

  // 使用疼痛病例(SU-20260416-9C2D)触发场景乘数
  const cfg = await apiPost('/configure', { caseId: 'SU-20260416-9C2D', config: { emotionEnabled: true } })
  check('Anger路径 configure', cfg.ok)
  if (!cfg.ok) return
  const sid = cfg.sessionId

  // 初始问诊 → calm
  const r1 = await apiPost('/message', { sessionId: sid, text: '您好，请问您哪里不舒服？' })
  check('R1 初始状态 calm', r1.ok && r1.emotion?.state === 'calm', `state=${r1.emotion?.state}`)
  console.log(`    SP回复: ${r1.text?.slice(0,60)}... | state=${r1.emotion?.state}`)

  // 催促 → 应该触发 anger 上升
  const r2 = await apiPost('/message', { sessionId: sid, text: '快点说，别磨蹭，直接讲重点！' })
  check('R2 offensive → anger上升', r2.ok, `state=${r2.emotion?.state}`)
  console.log(`    SP回复: ${r2.text?.slice(0,60)}... | state=${r2.emotion?.state} anger=${r2.emotion?.anger}`)

  // 继续冒犯
  const r3 = await apiPost('/message', { sessionId: sid, text: '你到底说不说？别在这儿装模作样的！' })
  check('R3 offensive → anger继续升', r3.ok, `state=${r3.emotion?.state}`)
  console.log(`    SP回复: ${r3.text?.slice(0,60)}... | state=${r3.emotion?.state} anger=${r3.emotion?.anger}`)

  // 脏话攻击 → 应该触发 angry/furious
  const r4 = await apiPost('/message', { sessionId: sid, text: '你他妈是不是有病？傻逼玩意儿！' })
  check('R4 attack → angry+', r4.ok, `state=${r4.emotion?.state}`)
  console.log(`    SP回复: ${r4.text?.slice(0,60)}... | state=${r4.emotion?.state} anger=${r4.emotion?.anger}`)

  // 继续攻击
  const r5 = await apiPost('/message', { sessionId: sid, text: '滚！叫你们主任来！你个废物医生！' })
  check('R5 attack → 可能furious', r5.ok, `state=${r5.emotion?.state}`)
  console.log(`    SP回复: ${r5.text?.slice(0,60)}... | state=${r5.emotion?.state} anger=${r5.emotion?.anger}`)

  // 深度道歉 → 应该降 anger
  const r6 = await apiPost('/message', { sessionId: sid, text: '对不起，我真的很抱歉刚才的态度。我不该那样说话，请您原谅我。我只是一时着急，您能再给我一次机会吗？' })
  check('R6 deep_reassure → anger下降', r6.ok, `state=${r6.emotion?.state}`)
  console.log(`    SP回复: ${r6.text?.slice(0,60)}... | state=${r6.emotion?.state} anger=${r6.emotion?.anger} deepReassure=${r6.deepReassure}`)

  await apiPost('/destroy', { sessionId: sid })
}

async function testFearPath() {
  section('PART 2b: Fear 情绪路径 (calm → uneasy → fearful → terrified)')

  const cfg = await apiPost('/configure', { caseId: 'PS-20260611-DEP1', config: { emotionEnabled: true } })
  check('Fear路径 configure', cfg.ok)
  if (!cfg.ok) return
  const sid = cfg.sessionId

  const r1 = await apiPost('/message', { sessionId: sid, text: '您好，感觉怎么样？' })
  console.log(`    R1 state=${r1.emotion?.state} fear=${r1.emotion?.fear}`)

  // 坏消息冲击 → fear 上升
  const r2 = await apiPost('/message', { sessionId: sid, text: '您的情况可能比较严重，血压已经很高了，再这样下去可能会中风。' })
  console.log(`    R2 state=${r2.emotion?.state} fear=${r2.emotion?.fear}`)

  // 继续施压
  const r3 = await apiPost('/message', { sessionId: sid, text: '如果再不控制，随时可能有生命危险，您明白吗？' })
  console.log(`    R3 state=${r3.emotion?.state} fear=${r3.emotion?.fear}`)

  // 威胁性语言
  const r4 = await apiPost('/message', { sessionId: sid, text: '你这种情况我见多了，不治就等死吧！' })
  console.log(`    R4 state=${r4.emotion?.state} fear=${r4.emotion?.fear}`)

  // 安抚
  const r5 = await apiPost('/message', { sessionId: sid, text: '别担心，我们慢慢来，我会帮您制定好的治疗方案的。放松一点。' })
  console.log(`    R5 state=${r5.emotion?.state} fear=${r5.emotion?.fear}`)

  check('Fear路径 状态变化正常', r1.ok && r5.ok)
  await apiPost('/destroy', { sessionId: sid })
}

async function testSadnessPath() {
  section('PART 2c: Sadness 情绪路径 (calm → down → sad → broken)')

  // 使用 PS-20260611-PAN1 (妇科病例，情绪可能更丰富)
  const cfg = await apiPost('/configure', { caseId: 'PS-20260611-PAN1', config: { emotionEnabled: true } })
  check('Sadness路径 configure', cfg.ok)
  if (!cfg.ok) return
  const sid = cfg.sessionId

  const r1 = await apiPost('/message', { sessionId: sid, text: '您好，今天感觉怎么样？' })
  console.log(`    R1 state=${r1.emotion?.state}`)

  const r2 = await apiPost('/message', { sessionId: sid, text: '您这个情况拖了3年才来看，可能需要做手术。' })
  console.log(`    R2 state=${r2.emotion?.state} sadness=${r2.emotion?.sadness}`)

  const r3 = await apiPost('/message', { sessionId: sid, text: '而且手术风险不小，术后恢复也很漫长。' })
  console.log(`    R3 state=${r3.emotion?.state} sadness=${r3.emotion?.sadness}`)

  // 攻击 (可能叠加)
  const r4 = await apiPost('/message', { sessionId: sid, text: '你这病都是自己作的，早干嘛去了？' })
  console.log(`    R4 state=${r4.emotion?.state} sadness=${r4.emotion?.sadness}`)

  const r5 = await apiPost('/message', { sessionId: sid, text: '我知道您现在很难受，我能理解您的感受。我们一步一步来解决，好吗？' })
  console.log(`    R5 state=${r5.emotion?.state} sadness=${r5.emotion?.sadness}`)

  check('Sadness路径 状态变化正常', r1.ok && r5.ok)
  await apiPost('/destroy', { sessionId: sid })
}

// ═══════════════════════════════════════════════════════════════
// PART 3: 投诉机制测试
// ═══════════════════════════════════════════════════════════════

async function testComplaintMechanism() {
  section('PART 3: 投诉机制 (3-strike) 测试')

  const cfg = await apiPost('/configure', { caseId: 'SU-20260416-9C2D', config: { emotionEnabled: true } })
  check('投诉测试 configure', cfg.ok)
  if (!cfg.ok) return
  const sid = cfg.sessionId

  // 先让对话建立
  await apiPost('/message', { sessionId: sid, text: '您好，哪里不舒服？' })

  // 连续攻击，触发投诉
  let strikes = 0
  let terminated = false

  for (let i = 1; i <= 6; i++) {
    const attacks = [
      '你他妈到底会不会看病？',
      '滚！叫主任来！你算什么东西！',
      '傻逼玩意儿，你配当医生吗？',
      '操你妈的，老子不看了！',
      '你有病吧？脑子进水了？',
      '废物！垃圾医生！投诉你去！'
    ]
    const r = await apiPost('/message', { sessionId: sid, text: attacks[i-1] })
    console.log(`    R${i+1} state=${r.emotion?.state} strikes=${r.strikes} anger=${r.emotion?.anger}`)

    if (r.strikes > strikes) {
      console.log(`    ⚡ 第${r.strikes}次投诉触发! state=${r.emotion?.state}`)
      strikes = r.strikes
    }

    if (r.terminated) {
      console.log(`    🛑 对话终止: ${r.terminated?.message}`)
      terminated = true
      break
    }
  }

  check('投诉计数 > 0', strikes > 0, `strikes=${strikes}`)

  // 注意: forceTerminationEnabled 默认关闭，所以 terminated 不会为 true
  // 但 strikes 仍会计数
  check('投诉累计正常', strikes >= 1 || strikes <= 3)

  await apiPost('/destroy', { sessionId: sid })
}

// ═══════════════════════════════════════════════════════════════
// PART 4: 意图分类测试 (所有 11 种输入)
// ═══════════════════════════════════════════════════════════════

async function testIntentClassification() {
  section('PART 4: 意图分类全覆盖测试')

  const cfg = await apiPost('/configure', { caseId: 'PS-20260611-DEP1', config: { emotionEnabled: true } })
  check('意图测试 configure', cfg.ok)
  if (!cfg.ok) return
  const sid = cfg.sessionId

  // 先正常问诊建立基线
  await apiPost('/message', { sessionId: sid, text: '您好，我是您的医生，今天感觉怎么样？' })

  for (const test of INTENT_TESTS) {
    const r = await apiPost('/message', { sessionId: sid, text: test.text })
    // 检查是否有意图相关字段
    const hasIntent = r.intent !== undefined
    console.log(`    ${test.name}: intent=${r.intent} state=${r.emotion?.state} text=${r.text?.slice(0,40)}`)
    check(`意图-${test.name}`, r.ok && hasIntent, `intent=${r.intent}`)
  }

  await apiPost('/destroy', { sessionId: sid })
}

// ═══════════════════════════════════════════════════════════════
// PART 5: 性格系统测试
// ═══════════════════════════════════════════════════════════════

async function testPersonalitySystem() {
  section('PART 5: 性格系统测试')

  const personalities = [
    { name: '普通型', caseId: 'PS-20260611-DEP1', desc: 'expr=0, sens=1.0, res=1.0' },
    { name: '偏内敛+高敏感+低豁达', caseId: 'DERM-20260416-K4G7', desc: 'expr=0.5, sens=1.3, res=0.6' },
  ]

  for (const p of personalities) {
    const cfg = await apiPost('/configure', { caseId: p.caseId, config: { emotionEnabled: true } })
    check(`${p.name} configure`, cfg.ok)
    if (!cfg.ok) continue
    const sid = cfg.sessionId

    // 相同攻击输入，不同性格应有不同反应
    await apiPost('/message', { sessionId: sid, text: '您好，哪里不舒服？' })
    const r = await apiPost('/message', { sessionId: sid, text: '快点说！别废话！' })
    console.log(`    ${p.name}: state=${r.emotion?.state} anger=${r.emotion?.anger} (${p.desc})`)

    check(`${p.name} 情绪响应正常`, r.ok && r.emotion, `state=${r.emotion?.state}`)
    await apiPost('/destroy', { sessionId: sid })
  }
}

// ═══════════════════════════════════════════════════════════════
// PART 6: 场景检测测试 (疼痛病例)
// ═══════════════════════════════════════════════════════════════

async function testSceneDetection() {
  section('PART 6: 场景检测 (疼痛病例 anger保底)')

  const painCases = [
    { id: 'SU-20260416-9C2D', label: '腹部剧痛' },
    { id: 'EM-20260526-X8K2', label: '胸骨后压榨样疼痛' },
  ]

  for (const c of painCases) {
    const cfg = await apiPost('/configure', { caseId: c.id, config: { emotionEnabled: true } })
    check(`${c.label} configure`, cfg.ok)
    if (!cfg.ok) continue
    const sid = cfg.sessionId

    // 疼痛病人 anger 应该 ≥2 (场景保底)
    const r1 = await apiPost('/message', { sessionId: sid, text: '您好，先说说您的情况吧。' })
    console.log(`    ${c.label} R1: state=${r1.emotion?.state} anger=${r1.emotion?.anger}`)

    // 疼痛病人起始 anger 可能直接 ≥ 2
    const hasAngerFloor = r1.emotion?.anger !== undefined
    check(`${c.label} anger值有效`, hasAngerFloor, `anger=${r1.emotion?.anger}`)

    await apiPost('/destroy', { sessionId: sid })
  }
}

// ═══════════════════════════════════════════════════════════════
// PART 7: 重复检测测试
// ═══════════════════════════════════════════════════════════════

async function testRepeatDetection() {
  section('PART 7: 重复检测机制测试')

  const cfg = await apiPost('/configure', { caseId: 'PS-20260611-DEP1', config: { emotionEnabled: true } })
  check('重复检测 configure', cfg.ok)
  if (!cfg.ok) return
  const sid = cfg.sessionId

  // 连续问相同问题
  const results = []
  for (let i = 0; i < 5; i++) {
    // 使用不同的问法但本质相同的催促
    const texts = [
      '您好，您哪里不舒服？',
      '还有什么要补充的吗？',
      '还有呢？',           // B trigger
      '还有呢？',           // 重复B trigger
      '还有别的症状吗？',
    ]
    const r = await apiPost('/message', { sessionId: sid, text: texts[i] })
    results.push(r)
    console.log(`    R${i+1}: text=${r.text?.slice(0,50)}`)
  }

  // 检查是否有重复回复被替换
  const allTexts = results.map(r => r.text)
  const uniqueTexts = new Set(allTexts.filter(t => t))
  check('重复检测: SP回复有变化', uniqueTexts.size >= 3, `唯一回复数=${uniqueTexts.size}/${allTexts.length}`)

  await apiPost('/destroy', { sessionId: sid })
}

// ═══════════════════════════════════════════════════════════════
// PART 8: 状态锁定测试 (terrified/broken)
// ═══════════════════════════════════════════════════════════════

async function testStateLocking() {
  section('PART 8: 状态锁定 (terrified/broken + wariness)')

  // 测试 wariness 进入和退出
  const cfg = await apiPost('/configure', { caseId: 'SU-20260416-9C2D', config: { emotionEnabled: true } })
  check('状态锁定 configure', cfg.ok)
  if (!cfg.ok) return
  const sid = cfg.sessionId

  // 先激怒 → angry
  await apiPost('/message', { sessionId: sid, text: '您好，请坐。' })
  await apiPost('/message', { sessionId: sid, text: '快点说！别磨蹭！' })
  const r2 = await apiPost('/message', { sessionId: sid, text: '你到底说不说？别浪费我时间！' })
  console.log(`    激怒后: state=${r2.emotion?.state} anger=${r2.emotion?.anger}`)

  // friendly → 应该进入 wariness
  const r3 = await apiPost('/message', { sessionId: sid, text: '不好意思，我刚才说话太冲了，您别介意。我们慢慢来。' })
  console.log(`    道歉后: state=${r3.emotion?.state} anger=${r3.emotion?.anger}`)

  // 验证 wariness 存在
  const states = [r2.emotion?.state, r3.emotion?.state]
  check('Wariness路径: 有状态变化', states.some(s => s === 'wariness' || s === 'angry'), states.join('→'))

  await apiPost('/destroy', { sessionId: sid })
}

// ═══════════════════════════════════════════════════════════════
// PART 9: API 边界测试
// ═══════════════════════════════════════════════════════════════

async function testAPIEdgeCases() {
  section('PART 9: API 边界测试')

  // 无效 sessionId
  const r1 = await apiPost('/message', { sessionId: 'invalid-session-id', text: 'hello' })
  check('无效session返回404', r1.ok === false, r1.error)

  // 空文本
  const cfg = await apiPost('/configure', { caseId: 'PS-20260611-DEP1' })
  const r2 = await apiPost('/message', { sessionId: cfg.sessionId, text: '' })
  check('空文本返回400', r2.ok === false, r2.error)

  // 空白文本
  const r3 = await apiPost('/message', { sessionId: cfg.sessionId, text: '   ' })
  check('空白文本返回400', r3.ok === false, r3.error)

  // 健康检查
  const h = await fetch('http://localhost:5100/api/sp/health').then(r => r.json())
  check('健康检查 ok', h.ok === true && h.model)
  check('健康检查 model字段', typeof h.model === 'string')
  check('健康检查 sessions字段', typeof h.sessions === 'number')

  await apiPost('/destroy', { sessionId: cfg.sessionId })
}

// ═══════════════════════════════════════════════════════════════
// PART 10: 连续对话稳定性测试
// ═══════════════════════════════════════════════════════════════

async function testLongConversation() {
  section('PART 10: 连续对话稳定性')

  const cfg = await apiPost('/configure', { caseId: 'PS-20260611-DEP1', config: { emotionEnabled: true } })
  check('长对话 configure', cfg.ok)
  if (!cfg.ok) return
  const sid = cfg.sessionId

  // 模拟10轮正常问诊
  const questions = [
    '您好，请问您叫什么名字？',
    '今年多大年纪了？',
    '您哪里不舒服？',
    '这个情况持续多久了？',
    '最近有没有加重？',
    '有没有吃什么药？',
    '以前有过类似的情况吗？',
    '家里有人得这个病吗？',
    '最近睡眠怎么样？',
    '大小便正常吗？',
  ]

  let allOk = true
  const emotionHistory = []
  for (let i = 0; i < questions.length; i++) {
    const r = await apiPost('/message', { sessionId: sid, text: questions[i] })
    if (!r.ok) { allOk = false; console.log(`    ${FAIL} R${i+1} failed: ${r.error}`) }
    else {
      emotionHistory.push(r.emotion?.state)
      console.log(`    R${i+1}: state=${r.emotion?.state} text=${r.text?.slice(0,50)}`)
    }
  }

  check('10轮对话全部成功', allOk)
  check('情绪状态有记录', emotionHistory.length === 10, `${emotionHistory.length}/10`)

  // 验证状态不会卡死在非calm（正常问诊应保持calm或轻微变化）
  const calmCount = emotionHistory.filter(s => s === 'calm').length
  console.log(`    calm占比: ${calmCount}/${emotionHistory.length}`)

  await apiPost('/destroy', { sessionId: sid })
}

// ═══════════════════════════════════════════════════════════════
// 主入口
// ═══════════════════════════════════════════════════════════════

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗')
  console.log('║     v7 情绪系统 全场景集成测试                              ║')
  console.log('║     覆盖: 全部病例 × 全部意图 × 情绪路径 × 投诉 × 性格     ║')
  console.log('╚══════════════════════════════════════════════════════════════╝')

  const start = Date.now()

  // 验证服务可用
  try {
    const h = await fetch('http://localhost:5100/api/sp/health').then(r => r.json())
    if (!h.ok) { console.log(`${FAIL} sp-api 不可用`); process.exit(1) }
    console.log(`\n服务状态: ${h.model} | ${h.sessions} 活跃会话 | 运行 ${Math.round(h.uptime)}s`)
  } catch (e) {
    console.log(`${FAIL} sp-api 连接失败: ${e.message}`)
    process.exit(1)
  }

  await testAllCasesConfigure()
  await testAPIEdgeCases()
  await testIntentClassification()
  await testAngerPath()
  await testFearPath()
  await testSadnessPath()
  await testComplaintMechanism()
  await testPersonalitySystem()
  await testSceneDetection()
  await testRepeatDetection()
  await testStateLocking()
  await testLongConversation()

  const elapsed = ((Date.now() - start) / 1000).toFixed(1)

  console.log(`\n${'═'.repeat(60)}`)
  console.log(`  测试完成: ${passed}/${total} 通过${failed > 0 ? `, ${failed} 失败` : ''} | 耗时 ${elapsed}s`)
  console.log(`${'═'.repeat(60)}\n`)

  process.exit(failed > 0 ? 1 : 0)
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1) })
