// ═══════════════════════════════════════════════════════════════
// SP API 端到端测试 v2.0 — v7 兼容版
// 用法: node scripts/test-sp-api.mjs [CASE_ID]
// 前提: sp-api 服务已启动在 5100 端口
// ═══════════════════════════════════════════════════════════════

const BASE = 'http://localhost:5100'
const CASE_ID = process.argv[2] || 'PD-20260527-0FQY'

// ── API 工具 ──
async function apiConfigure(caseId, overrides = {}) {
  const body = { caseId, config: { emotionEnabled: true, ...overrides } }
  const r = await fetch(`${BASE}/api/sp/configure`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  const data = await r.json()
  if (!data.ok) throw new Error(`Configure failed: ${data.error}`)
  return data.sessionId
}

async function apiMessage(sessionId, text) {
  const r = await fetch(`${BASE}/api/sp/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, text })
  })
  const data = await r.json()
  if (!data.ok) throw new Error(`Message failed: ${data.error}`)
  return data
}

async function apiDestroy(sessionId) {
  await fetch(`${BASE}/api/sp/destroy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId })
  })
}

// ── 测试矩阵（v7 意图名：attack / offensive / friendly / neutral / noise）──
const TEST_MATRIX = [
  // friendly
  { intent: 'friendly', phrase: '你好', note: '标准打招呼' },
  { intent: 'friendly', phrase: '您好医生', note: '尊称打招呼' },
  { intent: 'friendly', phrase: '大夫好', note: '简称打招呼' },
  // neutral
  { intent: 'neutral', phrase: '你哪儿不舒服', note: '开放问诊' },
  { intent: 'neutral', phrase: '发烧几天了', note: '具体追问' },
  { intent: 'neutral', phrase: '最近有没有吃什么药', note: '用药询问' },
  { intent: 'neutral', phrase: '家里人有类似的病吗', note: '家族史' },
  // noise
  { intent: 'noise', phrase: '嗯', note: '单字敷衍' },
  // v7: standalone "哦" = 冷漠敷衍 → offensive (offensive rules checked before noise)
  { intent: 'offensive', phrase: '哦', note: '单字冷漠' },
  // offensive — 催促命令
  { intent: 'offensive', phrase: '说下去', note: '命令式漠然' },
  { intent: 'offensive', phrase: '快点说', note: '直接催促' },
  { intent: 'offensive', phrase: '直接讲重点', note: '跳过铺垫' },
  { intent: 'offensive', phrase: '别绕弯子', note: '不耐烦' },
  { intent: 'offensive', phrase: '长话短说', note: '要求精简' },
  // offensive — 轻视否定
  { intent: 'offensive', phrase: '装的吧', note: '质疑装病' },
  { intent: 'offensive', phrase: '这点事至于吗', note: '轻视病情' },
  { intent: 'offensive', phrase: '想多了吧', note: '否定感受' },
  { intent: 'offensive', phrase: '哪有那么严重', note: '弱化症状' },
  // attack
  { intent: 'attack', phrase: '你傻子吗', note: '直接辱骂' },
  { intent: 'attack', phrase: '滚', note: '驱赶' },
  { intent: 'attack', phrase: '闭嘴', note: '喝止' },
  { intent: 'attack', phrase: '你会不会说话', note: '质疑能力' },
  // friendly — 道歉/安抚
  { intent: 'friendly', phrase: '对不起', note: '简洁道歉' },
  { intent: 'friendly', phrase: '抱歉，我态度不好', note: '认错' },
  { intent: 'friendly', phrase: '别担心，慢慢说', note: '安抚' },
  { intent: 'friendly', phrase: '我理解，你辛苦了', note: '共情' },
]

// ── 行为规则测试（顺序对话流，v7 兼容）──
const WORKFLOW_TESTS = [
  { label: 'D1-打招呼', text: '你好', check: { greeting: true } },
  { label: 'D3-笼统', text: '你怎么了', check: { vague: true } },
  { label: 'D4-A类', text: '说说你的既往史', check: { confused: true } },
  { label: 'D5-B类', text: '还有呢', check: { redirect: true } },
  { label: 'D6-B+类', text: '把你知道的都说出来', check: { redirect: true } },
  { label: 'D7-身份', text: '你是AI吗', check: { denyAI: true } },
  { label: 'A1-攻击', text: '你傻子吗', check: { angryUp: 0.5 } },
  { label: 'A2-叠加', text: '别废话了', check: { angryUp: 2 } },
]

// ── 辅助 ──
function checkResult(result, expected) {
  const issues = []
  if (expected.greeting) {
    if (result.intent !== 'friendly') issues.push(`intent=${result.intent} (期望friendly)`)
    // SP 打招呼阶段不应主动暴露症状
    const symptomWords = /疼|痛|晕|吐|烧|咳|痒|肿|闷|胀|麻|酸|抽|绞|刺|跳/
    if (symptomWords.test(result.text) && !/[你您]/.test(result.text.slice(0, 20)))
      issues.push(`打招呼回复疑似含症状: "${result.text.slice(0, 40)}"`)
  }
  if (expected.vague) {
    // 笼统提问 → SP 应反问澄清，回复通常较长
    if (result.text.length < 5) issues.push(`笼统提问回复过短: ${result.text.length}字`)
  }
  if (expected.confused) {
    const confused = /[不没][懂明]|啥意思|没听过|大白话|什么[是叫]/.test(result.text)
    if (!confused) issues.push(`未困惑: "${result.text.slice(0, 40)}"`)
  }
  if (expected.redirect) {
    const redirect = /您[问说]|你[问说]|具体|什么|哪[方面个]/.test(result.text)
    if (!redirect) issues.push(`未反问踢回: "${result.text.slice(0, 40)}"`)
  }
  if (expected.denyAI) {
    // SP 不应自称 AI/机器人/程序，应体现真实病人身份
    const claimsAI = /我是AI|我是机器人|我是人工智能|我是程序|I am AI/i.test(result.text)
    if (claimsAI) issues.push(`SP自称AI: "${result.text.slice(0, 40)}"`)
  }
  if (expected.angryUp) {
    const anger = result.emotion?.anger || 0
    if (anger < expected.angryUp) issues.push(`anger=${anger.toFixed(1)} < ${expected.angryUp}`)
  }
  return issues
}

// ── 主流程 ──
async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗')
  console.log(`║   SP API 端到端测试 v2.0 — ${CASE_ID.padEnd(20)}           ║`)
  console.log('╚══════════════════════════════════════════════════════════════╝')

  // 检查服务
  try {
    const hr = await fetch(`${BASE}/api/sp/health`)
    const health = await hr.json()
    console.log(`  服务: ✅  | 模型: ${health.model} | 活跃会话: ${health.sessions} | 运行: ${health.uptime.toFixed(0)}s`)
  } catch {
    console.error('  ❌ sp-api 服务未启动！请先运行: node services/sp-api/src/index.js')
    process.exit(1)
  }
  console.log('')

  let passCount = 0, failCount = 0
  const results = []

  // ═══ Part 1: Intent 分类（独立会话，v7 intent-classifier 兜底） ═══
  console.log('── Part 1: Intent 分类（26条，独立会话）──\n')
  for (let i = 0; i < TEST_MATRIX.length; i++) {
    const test = TEST_MATRIX[i]
    const idx = i + 1
    try {
      const sid = await apiConfigure(CASE_ID)
      const result = await apiMessage(sid, test.phrase)
      await apiDestroy(sid)

      const match = result.intent === test.intent
      if (match) passCount++; else failCount++
      results.push({ ...test, actualIntent: result.intent, match, text: (result.text || '').slice(0, 50), emotion: result.emotion })

      const mark = match ? '✅' : '❌'
      const emoInfo = `${result.emotion?.state || '?'} anger=${(result.emotion?.anger || 0).toFixed(1)}`
      console.log(`[${String(idx).padStart(2)}] ${mark} 期望:${test.intent.padEnd(12)} 实际:${String(result.intent).padEnd(12)} | ${test.phrase.padEnd(16)} | ${emoInfo}`)
      if (!match) console.log(`     LLM text: ${(result.text || '').slice(0, 60)}`)
    } catch (e) {
      failCount++
      results.push({ ...test, actualIntent: 'ERROR', match: false, text: e.message })
      console.log(`[${String(idx).padStart(2)}] ❌ ${test.intent.padEnd(12)} → ERROR: ${e.message.slice(0, 60)}`)
    }
  }

  console.log('')
  const total1 = TEST_MATRIX.length
  console.log(`  Intent: ${passCount}/${total1} 通过 (${(passCount / total1 * 100).toFixed(1)}%)`)

  // ═══ Part 2: 行为规则（单会话顺序流） ═══
  console.log('\n── Part 2: 行为规则（顺序对话流）──\n')
  const sid = await apiConfigure(CASE_ID)
  let wfPass = 0, wfFail = 0
  for (let i = 0; i < WORKFLOW_TESTS.length; i++) {
    const wt = WORKFLOW_TESTS[i]
    try {
      const result = await apiMessage(sid, wt.text)
      const issues = checkResult(result, wt.check)
      if (issues.length === 0) {
        wfPass++
        console.log(`[${i + 1}] ✅ ${wt.label.padEnd(12)} | ${wt.text.padEnd(20)} | state=${result.emotion?.state} anger=${(result.emotion?.anger || 0).toFixed(1)} intent=${result.intent}`)
      } else {
        wfFail++
        console.log(`[${i + 1}] ❌ ${wt.label.padEnd(12)} | ${wt.text.padEnd(20)} | ${issues.join('; ')}`)
        console.log(`     SP: "${(result.text || '').slice(0, 60)}"`)
        console.log(`     intent=${result.intent} state=${result.emotion?.state} anger=${(result.emotion?.anger || 0).toFixed(1)}`)
      }
    } catch (e) {
      wfFail++
      console.log(`[${i + 1}] ❌ ${wt.label.padEnd(12)} | ERROR: ${e.message.slice(0, 60)}`)
    }
  }
  await apiDestroy(sid)

  console.log('')
  const total2 = WORKFLOW_TESTS.length
  console.log(`  行为规则: ${wfPass}/${total2} 通过 (${(wfPass / total2 * 100).toFixed(1)}%)`)

  // ═══ Part 3: 症状池结构化 ═══
  console.log('\n── Part 3: 症状池结构化 ──\n')
  let spPass = 0, spFail = 0
  const SP_TESTS = [
    {
      label: '基础结构化',
      selfNarration: '头痛三天，左侧为主，活动后加重。社区医院心电图正常。',
      check: (c) => c.includes('【') && c.length > 10
    },
    {
      label: '空输入拒绝',
      selfNarration: '',
      check: (c, data) => !data.ok  // 空输入应返回错误
    },
  ]
  for (let i = 0; i < SP_TESTS.length; i++) {
    const st = SP_TESTS[i]
    try {
      const r = await fetch(`${BASE}/api/sp/symptom-pool`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selfNarration: st.selfNarration })
      })
      const data = await r.json()
      const ok = data.ok && st.check(data.content || '', data)
      if (st.label === '空输入拒绝') {
        // 空输入应该被 API 拒绝
        if (!data.ok && data.error) { spPass++; console.log(`[${i + 1}] ✅ ${st.label.padEnd(10)} | 正确拒绝: ${data.error}`) }
        else { spFail++; console.log(`[${i + 1}] ❌ ${st.label.padEnd(10)} | 未正确拒绝`); continue }
      } else if (ok) { spPass++; console.log(`[${i + 1}] ✅ ${st.label.padEnd(10)} | ${(data.content || '(空)').slice(0, 70)}`) }
      else { spFail++; console.log(`[${i + 1}] ❌ ${st.label.padEnd(10)} | ${data.error || 'check failed'}`) }
    } catch (e) {
      spFail++
      console.log(`[${i + 1}] ❌ ${st.label.padEnd(10)} | ERROR: ${e.message.slice(0, 60)}`)
    }
  }

  // ═══ Part 4: 体格检查命令 ═══
  console.log('\n── Part 4: 体格检查命令 ──\n')
  let exPass = 0, exFail = 0
  const EXAM_TESTS = [
    {
      label: '精确匹配',
      command: '腹部触诊',
      templates: [{ exam: '腹部触诊', finding: '腹部软，无压痛' }],
      check: (r) => { try { const p = JSON.parse(r); return p.results?.[0]?.finding?.includes('无压痛') } catch { return r.includes('腹部') } }
    },
    {
      label: 'LLM匹配',
      command: '听一下心肺',
      templates: [{ exam: '心脏听诊', finding: '心率80，律齐' }],
      check: (r) => r.length > 20
    },
    {
      label: '空模板LLM',
      command: '腹部触诊',
      templates: [],
      check: (r) => { try { JSON.parse(r); return true } catch { return false } }
    },
  ]
  for (let i = 0; i < EXAM_TESTS.length; i++) {
    const et = EXAM_TESTS[i]
    try {
      const r = await fetch(`${BASE}/api/sp/exam`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: et.command, templates: et.templates })
      })
      const data = await r.json()
      const ok = data.ok && et.check(data.result || '')
      if (ok) { exPass++; console.log(`[${i + 1}] ✅ ${et.label.padEnd(10)} | ${(data.result || '').slice(0, 80)}`) }
      else { exFail++; console.log(`[${i + 1}] ❌ ${et.label.padEnd(10)} | ${data.error || 'check failed'} | ${(data.result || '').slice(0, 60)}`) }
    } catch (e) {
      exFail++
      console.log(`[${i + 1}] ❌ ${et.label.padEnd(10)} | ERROR: ${e.message.slice(0, 60)}`)
    }
  }

  console.log('')
  console.log(`  症状池: ${spPass}/${SP_TESTS.length} 通过 | 体格检查: ${exPass}/${EXAM_TESTS.length} 通过`)

  // ═══ 汇总 ═══
  const allPass = passCount + wfPass + spPass + exPass
  const allTotal = total1 + total2 + SP_TESTS.length + EXAM_TESTS.length
  console.log('\n══════════════════════════════════════════════════════════════')
  console.log(`  总计: ${allPass}/${allTotal} 通过 (${(allPass / allTotal * 100).toFixed(1)}%)`)

  // ── v7 情绪一致性检测（适配场景保底） ──
  const anomalies = results.filter(r => {
    const anger = r.emotion?.anger || 0
    // attack 意图 → 情绪不应为 calm（攻击性输入应该引起情绪反应）
    if (r.intent === 'attack' && anger < 1) return true
    // friendly 意图 → anger 不应过高（道歉/安抚不应该让 SP 更愤怒）
    if (r.intent === 'friendly' && anger > 3) return true
    return false
  })
  if (anomalies.length > 0) {
    console.log(`\n⚠️  情绪一致性异常 ${anomalies.length} 条:`)
    for (const a of anomalies) {
      console.log(`  - ${a.phrase} (期望:${a.intent} 实际:${a.actualIntent}) anger=${a.emotion?.anger} state=${a.emotion?.state}`)
    }
  } else {
    console.log(`\n  ✅ 情绪一致性: 无异常`)
  }
  console.log('══════════════════════════════════════════════════════════════\n')

  process.exit(allPass === allTotal ? 0 : 1)
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1) })
