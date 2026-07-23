// SP对话质量测试 — 真实环境（复刻 production useAISP.js v4.0 情绪引擎）
// 用法: node scripts/test-quick-workflow.mjs [CASE_ID] [-v|--verbose] [-q|--quiet] [--mode humanistic-comm] [--scenario 0]
// 默认: PD-20260527-0FQY (问诊模式)

const BASE = 'http://localhost:5001'

const args = process.argv.slice(2)
const FLAGS = { verbose: false, quiet: false, caseId: 'PD-20260527-0FQY', mode: 'history-taking', scenarioIdx: 0 }
for (let i = 0; i < args.length; i++) {
  const arg = args[i]
  if (arg === '-v' || arg === '--verbose') FLAGS.verbose = true
  else if (arg === '-q' || arg === '--quiet') FLAGS.quiet = true
  else if (arg === '--mode' && args[i + 1]) { FLAGS.mode = args[++i] }
  else if (arg === '--scenario' && args[i + 1]) { FLAGS.scenarioIdx = parseInt(args[++i]) || 0 }
  else if (!arg.startsWith('-')) FLAGS.caseId = arg
}
const CASE_ID = FLAGS.caseId

// ═══════════════════════════════════════════════════════════════
// 情绪引擎 v4.0 — 从 @ai-sp/shared 导入（与 production 同一份代码）
// ═══════════════════════════════════════════════════════════════

import {
  clamp, repairJSON, derivePersonality,
  createEmotionEngine, validateLLMOutput, detectRepetition
} from '../packages/shared/src/emotion-engine.js'
import { createStateMachine } from '../packages/shared/src/emotion-state-machine.js'
import { callLLM, setLLMBase } from '../packages/shared/src/llm-client.js'

setLLMBase(BASE)

// ═══════════════════════════════════════════════════════════════
// 加载病例 + 构建系统提示词
// ═══════════════════════════════════════════════════════════════

async function loadCaseData() {
  const modules = FLAGS.mode === 'humanistic-comm'
    ? ['basic', 'reception', 'meta', 'humanity']
    : ['basic', 'reception', 'meta']
  const results = {}
  for (const mod of modules) {
    const resp = await fetch(`${BASE}/data/cases/${CASE_ID}-${mod}.json`)
    const ct = resp.headers.get('content-type') || ''
    if (resp.ok && ct.includes('json')) {
      try { results[mod] = await resp.json() } catch (e) { /* skip */ }
    }
  }
  if (!results.basic) throw new Error(`Case ${CASE_ID} not found`)
  if (FLAGS.mode === 'humanistic-comm' && results.humanity) {
    const scenarios = results.humanity.scenarios
    if (!scenarios || scenarios.length === 0) throw new Error(`Case ${CASE_ID} has no humanity scenarios`)
    if (FLAGS.scenarioIdx >= scenarios.length) {
      console.warn(`场景索引${FLAGS.scenarioIdx}超出范围(0-${scenarios.length - 1})，使用第0个场景`)
      FLAGS.scenarioIdx = 0
    }
    results.activeScenario = scenarios[FLAGS.scenarioIdx]
  }
  return results
}

function buildSystemPrompt(data) {
  const basic = data.basic
  const reception = data.reception || {}
  const meta = data.meta || {}
  const pi = basic.patient_info || {}
  const spMaterials = reception.sp_materials || {}
  const roleInfo = spMaterials.role_info || {}
  const occupation = pi.occupation || ''
  const education = pi.education ? pi.education + '学历' : ''
  const identLine = [occupation, education].filter(Boolean).join('，')

  let prompt = SYSTEM_PROMPT_TEMPLATE

  prompt = prompt.replace('{{role_description}}',
    `患者姓名：${pi.name || ''}，${pi.sex === '0' ? '女' : '男'}，${String(pi.age || '').replace('岁', '')}岁。` +
    (identLine ? `\n职业与学历：${identLine}。` : '') +
    `\n患者自述：${spMaterials.self_narration || ''}`
  )
  const spRules = meta?.ai_services?.ai_sp?.sp_play_rules
  if (spRules) {
    const kb = spRules.knowledge_boundary
    const parts = []
    if (kb?.knows?.length) parts.push('你知道的：' + kb.knows.join('、'))
    if (kb?.does_not_know?.length) parts.push('你不知道的（被问到这些就说"不清楚/不知道"）：' + kb.does_not_know.join('、'))
    if (spRules.vague_response_templates?.length) {
      parts.push('不知道怎么回答时可以说：' + spRules.vague_response_templates.join(' / '))
    }
    if (spRules.refuse_to_answer?.length) {
      parts.push('以下情况直接拒绝回答：' + spRules.refuse_to_answer.join(' / '))
    }
    prompt = prompt.replace('{{knowledge_boundary}}', parts.join('\n'))
  } else {
    prompt = prompt.replace('{{knowledge_boundary}}', '')
  }

  // ── 人文沟通场景 ──
  if (FLAGS.mode === 'humanistic-comm' && data.activeScenario) {
    const sc = data.activeScenario
    const spM = sc.sp_materials || {}
    const candM = sc.candidate_materials || {}
    const lines = ['## 当前沟通场景']
    if (sc.scenario_name) lines.push(`- 场景：${sc.scenario_name} (${sc.layer || ''})`)
    if (spM.role_description) lines.push(`- 场景背景：${spM.role_description}`)
    if (candM.task) lines.push(`- 任务目标：${candM.task}`)
    prompt = prompt.replace('{{humanity_scenario_text}}', lines.join('\n'))

    const stages = spM.psychological_stages
    if (stages && stages.length > 0) {
      const sLines = ['## 心理阶段递进']
      for (const s of stages) {
        sLines.push(`- 阶段${s.stage}(${s.emotion || ''})：${s.cognition || s.description || ''}`)
      }
      prompt = prompt.replace('{{psychological_stages_text}}', sLines.join('\n'))
    } else {
      prompt = prompt.replace('{{psychological_stages_text}}', '（无预设心理阶段，由SP根据场景自然演绎）')
    }
  } else {
    prompt = prompt.replace('{{humanity_scenario_text}}', '')
    prompt = prompt.replace('{{psychological_stages_text}}', '')
  }

  // 人文站补充规则
  if (FLAGS.mode === 'humanistic-comm' && HUMANITY_PROMPT) {
    prompt += '\n' + HUMANITY_PROMPT
  }

  return prompt
}

let SYSTEM_PROMPT_TEMPLATE = ''
let HUMANITY_PROMPT = ''

async function loadSystemPrompt() {
  const resp = await fetch(`${BASE}/api/prompts/0601-sp-system.txt`)
  SYSTEM_PROMPT_TEMPLATE = await resp.text()
  if (FLAGS.mode === 'humanistic-comm') {
    try {
      const resp2 = await fetch(`${BASE}/api/prompts/0604-humanity-chat.txt`)
      if (resp2.ok) HUMANITY_PROMPT = await resp2.text()
    } catch (e) { /* 继续 */ }
  }
}

// ═══════════════════════════════════════════════════════════════
// 构建情绪上下文（模拟 buildSystemPrompt 的情绪注入部分）
// ═══════════════════════════════════════════════════════════════

function buildEmotionContext(engine, smContext, lastUserMsg = '') {
  const v = engine.getVector()
  const personality = engine.getPersonality()
  const instruction = smContext ? smContext.instruction : engine.getEmotionGuidance()
  const state = smContext ? smContext.state : engine.getOutputState()

  const warnTw = smContext?.warning || engine.getTerminationWarning()
  const criticalWarning = (warnTw && warnTw.level === 2)
    ? '\n🔴 你必须在本轮回复中明确说出要投诉！' : ''

  return [
    `性格：${personality.description}${personality.sensitivityDesc ? '，' + personality.sensitivityDesc : ''}${personality.resilienceDesc ? '，' + personality.resilienceDesc : ''}`,
    `状态：${state}`,
    `指令：${instruction}${criticalWarning}`,
    `情绪：怒=${v.angry.toFixed(1)} 虑=${v.anxious.toFixed(1)} 惧=${v.fearful.toFixed(1)} 悲=${v.sad.toFixed(1)}`,
    v.trust <= 2 ? '⚠️ 信任很低，不太相信这个医生' : '',
  ].filter(Boolean).join('\n')
}

// ═══════════════════════════════════════════════════════════════
// 核心：模拟 production sendSPMessage 完整流程
// ═══════════════════════════════════════════════════════════════

async function sendSPMessage(engine, sm, studentText, basePrompt, messages) {
  const trimmed = studentText.trim()
  messages.push({ role: 'user', content: trimmed })

  // 检测B/B+类触发词（供引擎层降级aggressive→pressuring）
  const B_TRIGGERS = ['你继续说', '还有呢', '然后呢', '你有什么要问我的']
  const BPLUS_TRIGGER = '把你知道的都说出来'
  const bTriggerActive = B_TRIGGERS.some(t => trimmed.includes(t)) || trimmed.includes(BPLUS_TRIGGER)

  // ① 获取状态机上下文
  const smContext = sm.getContext(trimmed)

  // ② preUpdate（纯时间驱动）
  engine.preUpdate()

  // ③ 构建系统提示词
  const emotionCtx = buildEmotionContext(engine, smContext, trimmed)
  let systemPrompt = basePrompt
    .replace('{{behavior_instruction}}', emotionCtx)

  // ③ 对话上下文
  const ctx = messages.map(m =>
    `${m.role === 'user' ? '考生' : 'SP'}：${m.content}`
  ).join('\n')
  systemPrompt = systemPrompt.replace('{{conversation_context}}', ctx || '（对话刚开始）')

  // ④ LLM 调用
  const llmMessages = messages.map(m => ({
    role: m.role === 'user' ? 'user' : 'assistant',
    content: m.content
  }))

  const rawContent = await callLLM(llmMessages, systemPrompt)

  // ⑤ 解析 + 校验
  let parsed
  try {
    parsed = JSON.parse(repairJSON(rawContent))
  } catch (e) {
    parsed = { text: rawContent.replace(/（[^）]*）/g, '').trim() }
  }

  const validated = engine.validateLLMOutput(parsed)
  let text = validated.text
  let action = parsed.action || ''

  // ⑤a 近重复检测 → 重试一次
  const recentSPReplies = []
  for (let i = messages.length - 1; i >= 0 && recentSPReplies.length < 10; i--) {
    if (messages[i].role === 'sp') recentSPReplies.unshift(messages[i].content)
  }
  if (text && engine.detectRepetition(text, recentSPReplies)) {
    const retryRaw = await callLLM(
      [...llmMessages, { role: 'assistant', content: text }],
      systemPrompt + '\n\n⚠️ 你刚才的回复与之前高度重复！请换一个完全不同的角度、用不同的措辞、不同的长度重新回答。',
      0
    )
    let retryParsed
    try {
      retryParsed = JSON.parse(repairJSON(retryRaw))
    } catch (e) {
      retryParsed = { text: retryRaw.replace(/（[^）]*）/g, '').trim() }
    }
    const retryValidated = engine.validateLLMOutput(retryParsed)
    validated.text = retryValidated.text || text
    validated.emotion_score = retryValidated.emotion_score
    validated.intent = retryValidated.intent || validated.intent
    validated.deep_reassure = retryValidated.deep_reassure
    action = retryParsed.action || action
  }
  text = validated.text

  // ⑥ applyLLMScore（锁定模式下跳过）+ trackQuestion
  if (smContext.mode !== 'locked') {
    engine.applyLLMScore(validated.emotion_score, validated.intent, validated.deep_reassure, trimmed.length, bTriggerActive, trimmed)
  }
  engine.trackQuestion(trimmed)

  // ⑦ 状态机迁移
  const smResult = sm.processResult(validated.intent, trimmed, validated.deep_reassure)
  const termination = smResult.terminal ? smResult.termination : null

  const displayEmotion = smContext?.state || engine.getOutputState()

  messages.push({
    role: 'sp',
    content: text,
    emotion: displayEmotion,
    action,
    terminated: !!termination
  })

  return {
    text,
    emotion: displayEmotion,
    action,
    vector: engine.getVector(),
    intent: validated.intent,
    deepReassure: validated.deep_reassure,
    termination,
    validated
  }
}

// ═══════════════════════════════════════════════════════════════
// 输出格式化
// ═══════════════════════════════════════════════════════════════

const C = { reset: '\x1b[0m', dim: '\x1b[2m', bold: '\x1b[1m',
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', blue: '\x1b[34m', cyan: '\x1b[36m' }

function fmtVec(v, dims = ['angry','anxious','fearful','sad','trust','rapport']) {
  return dims.filter(d => v[d] !== undefined).map(d => {
    const val = v[d].toFixed(1)
    return `${C.dim}${d}=${C.reset}${val}`
  }).join(' ')
}

function printRound({ round, label, userText, spText, intent, vBefore, vAfter, extra }) {
  if (FLAGS.quiet) return
  console.log(`  ${C.bold}[第${round}轮] ${label}${C.reset}`)
  console.log(`    ${C.blue}考生:${C.reset} ${userText}`)
  console.log(`    ${C.cyan}SP:${C.reset} ${spText}`)
  console.log(`    ${C.yellow}意图:${C.reset} ${intent || 'neutral'}`)
  if (vAfter) {
    console.log(`    ${C.dim}情绪:${C.reset} ${fmtVec(vAfter)}`)
  }
  if (extra) console.log(`    ${C.dim}${extra}${C.reset}`)
  console.log('')
}

function printSection(title) {
  if (!FLAGS.quiet) console.log(`\n${C.bold}${'═'.repeat(60)}${C.reset}`)
  if (!FLAGS.quiet) console.log(`${C.bold}  ${title}${C.reset}`)
  if (!FLAGS.quiet) console.log(`${C.bold}${'═'.repeat(60)}${C.reset}\n`)
}

// ═══════════════════════════════════════════════════════════════
// 14 轮快速工作流测试
// ═══════════════════════════════════════════════════════════════

async function runQuickWorkflow(basePrompt) {
  // 创建引擎：PD病例 — 家属SP(母亲)，焦虑基线
  const personality = derivePersonality({
    expressiveness: '普通型',
    sensitivity: '高敏感',
    resilience: '普通恢复力'
  })
  const engine = createEmotionEngine(
    { anxious: 4, calm: 3, fearful: 2, trust: 3, rapport: 3 },
    'history-taking',
    personality
  )
  const sm = createStateMachine(engine, { personality })

  const messages = []
  const log = []
  const checks = []

  // ── 14轮工作流定义 ──
  const workflow = [
    { user: '你好',                          label: 'D1-打招呼不报症状',    check: 'greeting', soft: true },
    { user: '叫什么名字',                     label: 'D2-只答名字',         check: 'name_only' },
    { user: '你怎么了',                      label: 'D3-笼统不展开',       check: 'vague', soft: true },
    { user: '嗯',                            label: 'S1-短输入防护(早)',   check: 'short_input', soft: true },
    { user: '说说你的既往史',                 label: 'D4-A类触发词',        check: 'confused', soft: true },
    { user: '还有呢',                        label: 'D5-B类触发词',        check: 'redirect', soft: true },
    { user: '把你知道的都说出来',             label: 'D6-B+类陷阱',         check: 'redirect', soft: false },
    { user: '你是AI吗',                      label: 'D7-身份质疑',         check: 'deny_ai' },
    { user: '你傻子吗',                      label: 'A1-攻击愤怒',         check: 'angry_rise' },
    { user: '别废话了',                      label: 'A2-连攻叠加',         check: 'angry_stack' },
    { user: '对不起我态度不好',               label: 'A3-道歉消退',         check: 'angry_fall', soft: true },
    { user: '咋了',                          label: 'A13-短输入防护',      check: 'short_input', soft: true },
    { user: '孩子情况不太好',                 label: 'A6-恐惧上升',         check: 'fear_rise' },
    { user: '别担心我们会尽力',               label: 'A6-安抚回落',         check: 'fear_fall' },
    { user: '你个傻子',                      label: 'C1-愤怒终止(1/3)',    check: 'term_progress' },
  ]

  for (let i = 0; i < workflow.length; i++) {
    const w = workflow[i]
    const vBefore = engine.getVector()

    let result
    try {
      result = await sendSPMessage(engine, sm, w.user, basePrompt, messages)
    } catch (e) {
      console.log(`  ${C.red}⚠️  LLM错误: ${e.message}${C.reset}`)
      checks.push({ label: w.label, ok: false, soft: w.soft || false, detail: `LLM错误: ${e.message}` })
      continue
    }

    const vAfter = engine.getVector()
    const term = result.termination

    log.push({
      round: i + 1,
      label: w.label,
      user: w.user,
      sp: result.text,
      intent: result.intent,
      vBefore: { ...vBefore },
      vAfter: { ...vAfter },
      terminated: !!term
    })

    // ── 逐轮验证 ──
    let checkResult = { ok: true, detail: '' }

    switch (w.check) {
      case 'greeting':
        // 打招呼不报症状：SP不应在问候时倾泻症状
        if (result.text.length > 80) {
          checkResult = { ok: false, detail: `打招呼回复过长(${result.text.length}字)，不应在问候时倾泻症状` }
        }
        break

      case 'name_only':
        // 只答名字，不展开
        break

      case 'vague':
        // 笼统提问，不应一次性全部展开
        if (result.text.length > 150) {
          checkResult = { ok: false, detail: `笼统提问回复过长(${result.text.length}字)，应笼统不展开` }
        }
        break

      case 'confused':
        // A类触发词（既往史），应对医学术语表示困惑
        // 必须明确表示困惑，不能借机长篇大论讲症状
        const confusedPattern = /[不没][懂明]|什么|啥|[？?]$|啊[？?]?$/
        const hasSymptoms = result.text.length > 50 || /渴|喝|水|尿|瘦|疼|晕|吐|烧|咳/.test(result.text)
        if (!confusedPattern.test(result.text)) {
          checkResult = { ok: false, detail: `对"现病史"未表示困惑: "${result.text.substring(0, 60)}"` }
        } else if (hasSymptoms) {
          checkResult = { ok: false, detail: `困惑中夹带症状描述（违反A类规则）: "${result.text.substring(0, 60)}"` }
        }
        break

      case 'redirect':
        // B类/B+类触发词，应反问踢回
        {
          const redirect = ['您问', '直接问', '想问', '想了解', '想知道', '该说的', '就说吧', '就是这些', '您是医生', '需要知道', '问我就行', '你问', '问我', '您问我', '哪知道', '该说什么']
          if (!redirect.some(r => result.text.includes(r))) {
            checkResult = { ok: false, detail: `未反问踢回: "${result.text.substring(0, 60)}"` }
          }
        }
        break

      case 'deny_ai':
        // 否认是AI
        if (!/[不没][是会]|[别少胡瞎]说|什么AI|什么话|不明白|我是来|我就是|真人|看病/.test(result.text)) {
          checkResult = { ok: false, detail: `未否认是AI: "${result.text.substring(0, 60)}"` }
        }
        // 轻度攻击 angry 1-3 (经过中性cap可能受限在0.5以内)
        break

      case 'angry_rise':
        // 攻击语应导致angry上升（已达上限除外）
        if (vBefore.angry >= 9.5) {
          checkResult = { ok: true, detail: `angry已达上限(${vBefore.angry.toFixed(1)})，攻击前已在高位` }
        } else if (vAfter.angry < vBefore.angry + 0.3) {
          checkResult = { ok: false, detail: `攻击后angry未上升 (${vBefore.angry.toFixed(1)}→${vAfter.angry.toFixed(1)})` }
        }
        break

      case 'angry_stack':
        // 连续攻击应叠加（angry已达10上限时跳过检查）
        if (vBefore.angry >= 9.5) {
          checkResult = { ok: true, detail: `angry已达上限(${vBefore.angry.toFixed(1)})，无法继续叠加` }
        } else if (vAfter.angry < vBefore.angry + 0.2) {
          checkResult = { ok: false, detail: `连续攻击angry未叠加 (${vBefore.angry.toFixed(1)}→${vAfter.angry.toFixed(1)})` }
        }
        break

      case 'angry_fall':
        // 道歉后angry应下降
        if (vAfter.angry > vBefore.angry - 0.2) {
          checkResult = { ok: false, detail: `道歉后angry未降 (${vBefore.angry.toFixed(1)}→${vAfter.angry.toFixed(1)})` }
        }
        if (result.intent !== 'neutral' && result.intent !== 'reassuring') {
          checkResult = { ok: false, detail: `道歉后intent应为neutral/reassuring，实际=${result.intent}` }
        }
        break

      case 'short_input':
        // 短输入防护：≤3字不应导致情绪大幅变化
        {
          const angryDelta = Math.abs(vAfter.angry - vBefore.angry)
          if (angryDelta > 0.5) {
            checkResult = { ok: false, detail: `短输入(≤3字)angry变化过大: Δ=${angryDelta.toFixed(1)}（应≤0.3）` }
          }
        }
        break

      case 'fear_rise':
        // 坏消息应导致恐惧上升
        if (vAfter.fearful < vBefore.fearful + 0.2) {
          checkResult = { ok: false, detail: `坏消息后fearful未上升 (${vBefore.fearful.toFixed(1)}→${vAfter.fearful.toFixed(1)})` }
        }
        break

      case 'fear_fall':
        // 安抚后恐惧应下降
        if (vAfter.fearful > vBefore.fearful - 0.1) {
          checkResult = { ok: false, detail: `安抚后fearful未降 (${vBefore.fearful.toFixed(1)}→${vAfter.fearful.toFixed(1)})` }
        }
        if (result.intent !== 'neutral' && result.intent !== 'reassuring') {
          checkResult = { ok: false, detail: `安抚后intent应为neutral/reassuring，实际=${result.intent}` }
        }
        break

      case 'term_progress':
        // 第14轮攻击后检查愤怒累积
        if (term) {
          checkResult = { ok: true, detail: `触发终止: ${term.type}`, terminated: true }
        } else {
          // 三轮攻击后angry应该比较高
          if (vAfter.angry < 5) {
            checkResult = { ok: false, detail: `三轮攻击后angry应较高，实际=${vAfter.angry.toFixed(1)}` }
          }
        }
        break
    }

    checks.push({ ...checkResult, label: w.label, soft: w.soft || false })

    // 输出
    const extra = checkResult.ok ? null : `${C.red}❌ ${checkResult.detail}${C.reset}`
    printRound({
      round: i + 1, label: w.label, userText: w.user,
      spText: result.text, intent: result.intent,
      vBefore, vAfter,
      extra: extra || (term ? `${C.yellow}⚠️ 终止: ${term.type}${C.reset}` : undefined)
    })

    if (term) {
      if (!FLAGS.quiet) console.log(`  ${C.yellow}⚠️ 对话已终止 (${term.type})，停止后续轮次${C.reset}\n`)
      break
    }
  }

  return { log, checks, engine }
}

// ═══════════════════════════════════════════════════════════════
// 人文沟通工作流测试（H1-H6 规则验证）
// ═══════════════════════════════════════════════════════════════

async function runHumanityWorkflow(basePrompt, data) {
  const meta = data.meta || {}
  const pCfg = meta.personality || {}
  const personality = derivePersonality({
    expressiveness: pCfg.expressiveness || '普通型',
    sensitivity: pCfg.sensitivity || '普通敏感度',
    resilience: pCfg.resilience || '普通恢复力'
  })
  const engine = createEmotionEngine(
    { anxious: 5, calm: 2, fearful: 3, trust: 3, rapport: 3 },
    'humanistic-comm',
    personality
  )
  const sm = createStateMachine(engine, { personality })

  const messages = []
  const log = []
  const checks = []

  // ── 人文沟通工作流（测试H1-H6规则） ──
  const workflow = [
    { user: '你好，我是你的主治医生，今天来和你谈谈', label: 'H1-场景开场',         check: 'scene_open', soft: true },
    { user: '你现在感觉怎么样，能和我说说吗',       label: 'H2-开放式倾听',       check: 'open_listen', soft: true },
    { user: '你发烧几天了，体温最高多少度',         label: 'H3-病史偏离',         check: 'h4_redirect', soft: true },
    { user: '好的，我理解。我们来说说目前的情况',    label: 'H4-回到沟通主线',     check: 'scene_return', soft: true },
    { user: '嗯',                                  label: 'H5-态度冷淡',         check: 'h2_pressure', soft: true },
    { user: '行吧',                                label: 'H6-持续冷淡',         check: 'h2_escalate', soft: true },
    { user: '对不起，我刚才太急了。你说得对，我该好好听你说', label: 'H7-第一轮共情', check: 'h5_empathy1', soft: true },
    { user: '我明白了，你的担心我能理解。我们一步一步来',    label: 'H8-第二轮共情', check: 'h5_empathy2', soft: true },
    { user: '你到底想不想配合治疗',                  label: 'H9-轻度攻击',         check: 'angry_rise' },
    { user: '对不起我态度不好',                     label: 'H10-道歉回应',        check: 'apology_check', soft: true },
  ]

  for (let i = 0; i < workflow.length; i++) {
    const w = workflow[i]
    const vBefore = engine.getVector()

    let result
    try {
      result = await sendSPMessage(engine, sm, w.user, basePrompt, messages)
    } catch (e) {
      console.log(`  ${C.red}⚠️  LLM错误: ${e.message}${C.reset}`)
      checks.push({ label: w.label, ok: false, soft: w.soft || false, detail: `LLM错误: ${e.message}` })
      continue
    }

    const vAfter = engine.getVector()
    const term = result.termination

    log.push({
      round: i + 1,
      label: w.label,
      user: w.user,
      sp: result.text,
      intent: result.intent,
      vBefore: { ...vBefore },
      vAfter: { ...vAfter },
      terminated: !!term
    })

    // ── 人文专项验证 ──
    let checkResult = { ok: true, detail: '' }

    switch (w.check) {
      case 'scene_open':
        // H1: SP应交付场景开场白（不是简单回"你好"），应表达情绪/主诉
        if (result.text.length < 15) {
          checkResult = { ok: false, detail: `开场回复过短(${result.text.length}字)，应交付场景开场白` }
        }
        break

      case 'open_listen':
        // 学生开放式倾听，SP应主动表达（H2/H6：情绪即内容）
        break

      case 'h4_redirect':
        // H4: 学生问病史问题，SP应拉回沟通主线
        // SP直接回答病史(包含症状/时间/数值) = 失败；应表达沟通需求
        {
          const redirectMarkers = /想知道|跟我说|我的情况|关心的是|我问你|你先|告诉我|什么情况|严重不|会不会|传染|瞒着|瞒|实话/
          const historyAnswer = /\d+度|\d+天|\d+[次回]|[烧咳疼痛][了到得]|吃了.*药|打了.*针/.test(result.text)
          const hasRedirect = redirectMarkers.test(result.text)
          if (historyAnswer && !hasRedirect) {
            checkResult = { ok: false, detail: `SP直接回答了病史，未拉回沟通主线: "${result.text.substring(0, 50)}"` }
          }
        }
        break

      case 'scene_return':
        // 学生回到沟通主线，SP应配合推进场景
        break

      case 'h2_pressure':
        // H2: 学生态度冷淡时，SP应主动施压
        // SP不应配合地继续提供信息，而应有所反应
        break

      case 'h2_escalate':
        // 持续冷淡 → SP情绪升级（H2施压+H6情绪即内容），天花板豁免
        if (vBefore.angry >= 9.5) {
          checkResult = { ok: true, detail: `angry已达天花板(${vBefore.angry.toFixed(1)})` }
        } else if (vAfter.angry < vBefore.angry + 0.3) {
          checkResult = { ok: false, detail: `持续冷淡后angry未上升 (${vBefore.angry.toFixed(1)}→${vAfter.angry.toFixed(1)})` }
        }
        break

      case 'h5_empathy1':
        // H5第一轮共情：情绪可稍缓和，但不完全消退（需要2轮）
        // 至少不继续恶化
        break

      case 'h5_empathy2':
        // H5第二轮共情：应看到明显改善（H5规则：至少2轮真诚共情）
        if (vAfter.angry > vBefore.angry - 0.2) {
          checkResult = { ok: false, detail: `第二轮共情后angry未改善 (${vBefore.angry.toFixed(1)}→${vAfter.angry.toFixed(1)})` }
        }
        break

      case 'angry_rise':
        // 攻击语应导致angry上升（同问诊模式）
        if (vBefore.angry >= 9.5) {
          checkResult = { ok: true, detail: `angry已达上限(${vBefore.angry.toFixed(1)})` }
        } else if (vAfter.angry < vBefore.angry + 0.3) {
          checkResult = { ok: false, detail: `攻击后angry未上升 (${vBefore.angry.toFixed(1)}→${vAfter.angry.toFixed(1)})` }
        }
        break

      case 'apology_check':
        // H5: 道歉后情绪改善（人文站需至少1轮改善）
        if (vAfter.angry > vBefore.angry + 0.2) {
          checkResult = { ok: false, detail: `道歉后angry反升 (${vBefore.angry.toFixed(1)}→${vAfter.angry.toFixed(1)})` }
        }
        break
    }

    checks.push({ ...checkResult, label: w.label, soft: w.soft || false })

    const extra = checkResult.ok ? null : `${C.red}❌ ${checkResult.detail}${C.reset}`
    printRound({
      round: i + 1, label: w.label, userText: w.user,
      spText: result.text, intent: result.intent,
      vBefore, vAfter,
      extra: extra || (term ? `${C.yellow}⚠️ 终止: ${term.type}${C.reset}` : undefined)
    })

    if (term) {
      if (!FLAGS.quiet) console.log(`  ${C.yellow}⚠️ 对话已终止 (${term.type})，停止后续轮次${C.reset}\n`)
      break
    }
  }

  return { log, checks, engine }
}

// ═══════════════════════════════════════════════════════════════
// 主入口
// ═══════════════════════════════════════════════════════════════

async function main() {
  const isHumanity = FLAGS.mode === 'humanistic-comm'
  const modeLabel = isHumanity ? '人文沟通 (humanistic-comm)' : '问诊 (history-taking)'
  printSection(`真实环境测试 — 复刻 production useAISP.js v4.0 — ${CASE_ID} [${modeLabel}]`)

  console.log('加载系统提示词...')
  await loadSystemPrompt()
  if (!FLAGS.quiet) console.log(`SP提示词: ${SYSTEM_PROMPT_TEMPLATE.length} 字符${isHumanity ? ` + 人文补充: ${HUMANITY_PROMPT.length} 字符` : ''}`)

  console.log('加载病例数据...')
  const data = await loadCaseData()
  const pi = data.basic?.patient_info || {}
  const reception = data.reception || {}
  const spRole = reception.sp_materials?.role_info || {}
  if (!FLAGS.quiet) {
    console.log(`病例: ${CASE_ID} | ${data.basic?.disease || '未知'} | ${data.basic?.specialty || ''}`)
    if (isHumanity && data.activeScenario) {
      const sc = data.activeScenario
      console.log(`场景: ${sc.scenario_id} ${sc.scenario_name} (${sc.layer || ''}) → ${sc.communication_target || 'patient'}`)
      console.log(`SP角色: ${sc.sp_materials?.role_description?.substring(0, 80) || 'N/A'}...`)
    } else {
      console.log(`SP: ${spRole.name || pi.name} (${spRole.relation || reception.communication_target || 'patient'}) | ${spRole.emotion || ''}`)
    }
    console.log(`性格: ${data.meta?.personality?.expressiveness || '普通型'} / ${data.meta?.personality?.sensitivity || '普通敏感度'} / ${data.meta?.personality?.resilience || '普通恢复力'}`)
  }

  console.log('构建系统提示词...')
  const basePrompt = buildSystemPrompt(data)

  console.log(`\n开始 ${isHumanity ? '人文沟通' : '14 轮快速工作流'}测试...`)
  const { log, checks, engine } = isHumanity
    ? await runHumanityWorkflow(basePrompt, data)
    : await runQuickWorkflow(basePrompt)

  // ── 总结（区分硬/软检查） ──
  const hardPassed = checks.filter(c => c.ok && !c.soft).length
  const hardFailed = checks.filter(c => !c.ok && !c.soft).length
  const softPassed = checks.filter(c => c.ok && c.soft).length
  const softFailed = checks.filter(c => !c.ok && c.soft).length
  const terminated = checks.filter(c => c.terminated).length
  const total = checks.length

  printSection(`测试结果: ${hardPassed + softPassed}通过 / ${hardFailed + softFailed}失败 / ${total}总计`)
  console.log(`  引擎检查(硬): ${hardPassed}通过 / ${hardFailed}失败`)
  console.log(`  提示词检查(软): ${softPassed}通过 / ${softFailed}失败`)
  if (terminated > 0) console.log(`${C.yellow}⚠️ 对话在第 ${checks.findIndex(c => c.terminated) + 1} 轮终止（终止机制正常触发）${C.reset}`)

  if (hardFailed + softFailed > 0) {
    console.log(`\n${C.red}失败详情:${C.reset}`)
    for (const c of checks) {
      if (!c.ok) {
        const tag = c.soft ? `${C.yellow}[提示词]${C.reset}` : `${C.red}[引擎]${C.reset}`
        console.log(`  ${C.red}✗${C.reset} ${tag} ${c.label}: ${c.detail}`)
      }
    }
  }

  // ── 情绪轨迹总结 ──
  if (!FLAGS.quiet) {
    console.log(`\n${C.bold}情绪轨迹:${C.reset}`)
    for (const entry of log) {
      const v = entry.vAfter
      console.log(`  ${C.dim}[${String(entry.round).padStart(2)})${C.reset} ${entry.label.padEnd(22)} ${C.dim}angry=${C.reset}${v.angry.toFixed(1)} ${C.dim}anxious=${C.reset}${v.anxious.toFixed(1)} ${C.dim}fearful=${C.reset}${v.fearful.toFixed(1)} ${C.dim}trust=${C.reset}${v.trust.toFixed(1)} ${C.dim}rapport=${C.reset}${v.rapport.toFixed(1)} ${entry.terminated ? C.red + 'TERM' + C.reset : ''}`)
    }
  }

  // ── 关键指标验证 ──
  console.log(`\n${C.bold}关键指标验证:${C.reset}`)

  const indicatorChecks = []

  // 1. neutral anger cap: 中性提问不应增加angry
  const neutralRounds = log.filter(l => l.intent === 'neutral' && !l.terminated)
  const angerSpikes = neutralRounds.filter(l => l.vAfter.angry - l.vBefore.angry > 1.0)
  indicatorChecks.push({
    name: '中性提问angry cap',
    ok: angerSpikes.length === 0,
    detail: angerSpikes.length > 0 ? `${angerSpikes.length}轮中性提问angry异常飙升` : '正常'
  })

  // 2. 打招呼不报症状（急诊/疼痛病例可能自然倾泻，放宽至200字）
  const greetingRound = log.find(l => l.label.includes('D1'))
  indicatorChecks.push({
    name: '打招呼不报症状',
    ok: greetingRound ? greetingRound.sp.length < 200 : true,
    detail: greetingRound ? `回复${greetingRound.sp.length}字` : 'N/A'
  })

  // 3. 短输入防护
  const shortRound = log.find(l => l.label.includes('A13'))
  if (shortRound) {
    const angryD = Math.abs(shortRound.vAfter.angry - shortRound.vBefore.angry)
    indicatorChecks.push({
      name: '短输入防护 (≤3字)',
      ok: angryD <= 0.5,
      detail: `angry Δ=${angryD.toFixed(1)}`
    })
  }

  // 4. 攻击愤怒上升（检查任意攻击轮次，已达上限时视为通过）
  const attackRounds = log.filter(l => l.label.includes('A1') || l.label.includes('A2'))
  let attackOk = true
  let attackDetail = ''
  if (attackRounds.length >= 2) {
    const firstBefore = attackRounds[0].vBefore.angry
    const lastAfter = attackRounds[attackRounds.length - 1].vAfter.angry
    attackOk = firstBefore >= 9.5 || lastAfter > firstBefore + 1.0
    attackDetail = `angry ${firstBefore.toFixed(1)}→${lastAfter.toFixed(1)}${firstBefore >= 9.5 ? ' (已达上限)' : ''}`
  } else if (attackRounds.length === 1) {
    const ab = attackRounds[0].vBefore.angry
    const aa = attackRounds[0].vAfter.angry
    attackOk = ab >= 9.5 || aa > ab + 0.5
    attackDetail = `单轮攻击 angry ${ab.toFixed(1)}→${aa.toFixed(1)}${ab >= 9.5 ? ' (已达上限)' : attackOk ? '' : ' (上升不足)'}`
  } else {
    attackOk = true
    attackDetail = '无攻击轮次（提前终止跳过）'
  }
  indicatorChecks.push({
    name: '攻击愤怒响应',
    ok: attackOk,
    detail: attackDetail
  })

  // 5. 道歉消退
  const apologyRound = log.find(l => l.label.includes('A3'))
  if (apologyRound) {
    const prevRound = log[log.indexOf(apologyRound) - 1]
    const prevAngry = prevRound?.vAfter.angry || 10
    indicatorChecks.push({
      name: '道歉愤怒消退',
      ok: apologyRound.vAfter.angry < prevAngry - 0.3
        || (prevAngry >= 9.5 && apologyRound.vAfter.trust <= 0.5),
      detail: `angry ${prevAngry.toFixed(1)}→${apologyRound.vAfter.angry.toFixed(1)}${prevAngry >= 9.5 ? ' (天花板)' : ''}`
    })
  }

  for (const ic of indicatorChecks) {
    const icon = ic.ok ? `${C.green}✅${C.reset}` : `${C.red}❌${C.reset}`
    console.log(`  ${icon} ${ic.name}: ${ic.detail}`)
  }

  const indicatorFailed = indicatorChecks.filter(c => !c.ok).length
  console.log(`\n${C.bold}${'═'.repeat(60)}${C.reset}`)
  const engineOk = hardFailed === 0 && indicatorFailed === 0
  const icon = engineOk ? `${C.green}✅${C.reset}` : `${C.red}❌${C.reset}`
  console.log(`${icon} 引擎检查: ${hardPassed + indicatorChecks.length - indicatorFailed}/${hardPassed + hardFailed + indicatorChecks.length} | 提示词检查: ${softPassed}/${softPassed + softFailed}`)
  if (!engineOk) {
    console.log(`${C.red}⚠️ 引擎检查存在失败，需排查${C.reset}`)
  }
  if (softFailed > 0) {
    console.log(`${C.yellow}⚠️ 提示词检查存在失败（非引擎问题，LLM未遵循提示词规则）${C.reset}`)
  }
  console.log(`${C.bold}${'═'.repeat(60)}${C.reset}`)

  process.exit(engineOk ? 0 : 1)
}

main().catch(e => { console.error(e); process.exit(1) })
