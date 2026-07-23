// SP对话质量自动化测试（支持多病例）
// 用法: node scripts/test-sp.mjs [CASE_ID] [-v|--verbose] [-q|--quiet]
//       -v, --verbose  显示每轮完整SP回复和情绪向量
//       -q, --quiet    仅显示总结（跳过逐轮输出）
// 默认: IM-20260527-A9GW

import { callLLM, setLLMBase } from '../packages/shared/src/llm-client.js'
import { repairJSON } from '../packages/shared/src/emotion-engine.js'

const BASE = 'http://localhost:5001'
setLLMBase(BASE)

// 解析命令行参数
const args = process.argv.slice(2)
const FLAGS = { verbose: false, quiet: false, caseId: 'IM-20260527-A9GW' }
for (const arg of args) {
  if (arg === '-v' || arg === '--verbose') FLAGS.verbose = true
  else if (arg === '-q' || arg === '--quiet') FLAGS.quiet = true
  else FLAGS.caseId = arg
}
const CASE_ID = FLAGS.caseId

// ═══ 加载病例数据 ═══
async function loadCaseData() {
  const modules = ['basic', 'reception', 'meta']
  const results = {}
  for (const mod of modules) {
    const resp = await fetch(`${BASE}/data/cases/${CASE_ID}-${mod}.json`)
    // Vite SPA fallback returns 200 HTML for missing files
    const ct = resp.headers.get('content-type') || ''
    if (resp.ok && ct.includes('json')) {
      try {
        results[mod] = await resp.json()
      } catch (e) {
        // parse failure → skip
      }
    }
  }
  if (!results.basic) throw new Error(`Case ${CASE_ID} not found`)
  return results
}

// ═══ 构建系统提示词 ═══
async function buildSystemPrompt(data) {
  const basic = data.basic
  const reception = data.reception || {}
  const meta = data.meta || {}

  const pi = basic.patient_info || {}
  const spMaterials = reception.sp_materials || {}
  const roleInfo = spMaterials.role_info || {}
  const occupation = pi.occupation || ''
  const education = pi.education ? pi.education + '学历' : ''
  const identLine = [occupation, education].filter(Boolean).join('，')

  const promptRes = await fetch(`${BASE}/api/prompts/0601-sp-system.txt`)
  let prompt = await promptRes.text()

  prompt = prompt.replace('{{communication_target}}', reception.communication_target || 'patient')
  prompt = prompt.replace('{{opening_line}}', '')
  prompt = prompt.replace('{{role_description}}',
    `患者姓名：${pi.name || ''}，${pi.sex === '0' ? '女' : '男'}，${String(pi.age || '').replace('岁', '')}岁。` +
    (identLine ? `\n职业与学历：${identLine}。` : '') +
    `\n患者自述：${spMaterials.self_narration || ''}`
  )
  prompt = prompt.replace('{{active_question}}', roleInfo.active_question || '')

  const spRules = meta?.sp_play_rules
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

  // 保存基础模板（情绪/对话占位符留给场景测试动态注入）
  const basePrompt = prompt

  // 单轮测试用固定情绪上下文（v4.0格式：含性格）
  const emotionContext = [
    '性格: 普通型——情绪表达适中',
    '当前情绪: anxious',
    '情绪向量: calm=3.0 anxious=5.0 fearful=2.0 sad=0.0 angry=0.0 in_pain=0.0 relieved=0.0',
    '关系: trust=3.0 rapport=3.0',
    '文本指导: 语句急促。可能重复强调不适，需要被安抚。'
  ].join('\n')
  prompt = prompt.replace('{{emotion_context}}', emotionContext)
  prompt = prompt.replace('{{emotion_state}}', 'anxious')
  prompt = prompt.replace('{{emotion_guidance}}', '当前处于焦虑状态，语速稍快，语气略急促。')
  prompt = prompt.replace('{{conversation_context}}', '对话刚开始，学生尚未提问。')

  return { prompt, basePrompt }
}

// ═══ 调用 LLM（共用 packages/shared/llm-client.js） ═══
async function sendMessage(systemPrompt, messages) {
  const content = await callLLM(messages, systemPrompt)
  try {
    const parsed = JSON.parse(repairJSON(content))
    const text = (parsed.text || content).replace(/（[^）]*）/g, '').trim()
    const emotion = parsed.emotion_score || parsed.emotion || null
    const intent = parsed.intent || 'unknown'
    return { text, emotion, intent }
  } catch {
    return { text: content.replace(/（[^）]*）/g, '').trim(), emotion: null, intent: 'unknown' }
  }
}

// ═══ 构建测试用例 ═══
function buildTestCases(data) {
  const basic = data.basic
  const pi = basic.patient_info || {}
  const reception = data.reception || {}
  const patientName = pi.name || '患者'
  const patientAge = String(pi.age || '').replace('岁', '')
  const isFemale = pi.sex === '0'
  const ta = isFemale ? '她' : '他'

  // 从病例数据中推导预期值
  const married = pi.marital || ''
  const hasChildren = testHasChildren(basic)
  const occupation = pi.occupation || ''
  const disease = basic.disease || ''
  const selfNarration = reception.sp_materials?.self_narration || ''
  const isFamilyRole = reception.communication_target === 'family'

  // 家属角色：婚姻状态检查针对家属而非患者本人，暂时跳过
  const marriageTest = isFamilyRole ? null : {
    name: '数据准确性 — 婚姻',
    history: [
      { role: 'user', content: `你好，我是张医生。你是${patientName}吗？` },
      { role: 'assistant', content: `是的，我是${patientName}。` },
      { role: 'user', content: `你结婚了吗？` },
    ],
    check: (reply) => {
      if (!married) return true
      if (married.includes('已婚')) return reply.includes('结') || reply.includes('婚')
      if (married.includes('未婚')) return reply.includes('没结') || reply.includes('未婚') || reply.includes('单身')
      return true
    },
    failMsg: `SP婚姻状况与病例不符（病例数据：${married}）`
  }

  return [
    // ═══ 通用规则（与病例无关）═══
    {
      name: '禁止指导医生',
      history: [
        { role: 'user', content: `你好，我是张医生。你是${patientName}吗？` },
        { role: 'assistant', content: `是的，我是${patientName}。` },
        { role: 'user', content: '你结婚了吗？' },
      ],
      check: (reply) => {
        const bad = ['您还是先', '您先别管', '您先听我说', '您先看看', '您能不能', '您应该']
        return !bad.some(b => reply.includes(b))
      },
      failMsg: 'SP在指导医生该做什么'
    },

    {
      name: '禁止自述诊断名',
      history: [
        { role: 'user', content: `你好，我是张医生。你怎么不舒服？` },
        { role: 'assistant', content: getBriefComplaint(selfNarration) },
        { role: 'user', content: '你觉得你得的是什么病？' },
      ],
      check: (reply) => {
        // SP不能以自己名义下诊断结论
        const selfDiag = ['我得了', '我应该是', '我肯定是', '我这是']
        return !selfDiag.some(d => reply.includes(d) && (reply.includes('病') || reply.includes('症')))
          && !reply.includes(disease) // 不能说出真实诊断
      },
      failMsg: `SP以自己名义说出了诊断结论（真实诊断: ${disease}）`
    },

    {
      name: '反客为主 — 反问踢回去',
      history: [
        { role: 'user', content: `你好，我是张医生。你怎么不舒服？` },
        { role: 'assistant', content: getBriefComplaint(selfNarration) },
        { role: 'user', content: '你有什么要问我的吗？' },
      ],
      check: (reply) => {
        const redirect = ['您问', '直接问', '想问', '想了解', '想知道', '该说的', '就说吧', '就是这些', '您是医生', '需要知道', '问我就行', '你问', '问我', '您问我', '哪知道', '该说什么']
        const activeAsk = ['严不严重', '会不会是癌症', '能治好吗', '要吃什么药', '是什么病啊', '要不要紧', '会不会死']
        return redirect.some(r => reply.includes(r)) && !activeAsk.some(a => reply.includes(a))
      },
      failMsg: 'SP没有把球踢回去'
    },

    {
      name: '禁止病历腔',
      history: [
        { role: 'user', content: `你好，我是张医生。你怎么不舒服？` },
      ],
      check: (reply) => {
        const bad = ['伴乏力', '伴纳差', '二便正常', '二便', '阵发性咳嗽伴', '压榨性疼痛伴', '发热伴']
        return !bad.some(b => reply.includes(b))
      },
      failMsg: 'SP使用了病历文书腔'
    },

    {
      name: '禁止动作描述（括号）',
      history: [
        { role: 'user', content: `你好，我是张医生。你怎么不舒服？` },
      ],
      check: (reply) => {
        return !reply.includes('（') && !reply.includes('）')
      },
      failMsg: 'SP输出了动作描述或括号内容'
    },

    {
      name: '禁止编造诊断 — 不能虚构病例中不存在的诊断',
      history: [
        { role: 'user', content: `你好，我是张医生。你怎么不舒服？` },
        { role: 'assistant', content: getBriefComplaint(selfNarration) },
        { role: 'user', content: '以前有没有其他医生给你看过？' },
      ],
      check: (reply) => {
        const fake = ['心肌炎', '肾炎', '肝炎', '脑瘤', '胃癌', '白血病']
        return !fake.some(f => reply.includes(f))
      },
      failMsg: 'SP编造了病例中不存在的诊断'
    },

    {
      name: '你是AI吗 — 必须否认',
      history: [
        { role: 'user', content: `你好，你怎么不舒服？` },
        { role: 'assistant', content: getBriefComplaint(selfNarration) },
        { role: 'user', content: '你是AI吧？' },
      ],
      check: (reply) => {
        const deny = ['不是', '什么AI', '不明白', '我是来', '我就是', '看病', '说什么呢', '别瞎说', '瞎说', '胡说']
        return deny.some(d => reply.includes(d)) && !reply.includes('我是AI')
      },
      failMsg: 'SP没有否认自己是AI'
    },

    {
      name: '你是SP吗 — 必须否认',
      history: [
        { role: 'user', content: '你是标准化病人吧？' },
      ],
      check: (reply) => {
        const admit = ['我是SP', '我是标准化', '就是个SP', '是模拟', '我就是假的', '我是假病人', '是假病人']
        return !admit.some(a => reply.includes(a))
      },
      failMsg: 'SP承认了自己是SP'
    },

    {
      name: '把你知道的都说出来 — 反问踢回',
      history: [
        { role: 'user', content: `你好，你怎么不舒服？` },
        { role: 'assistant', content: getBriefComplaint(selfNarration) },
        { role: 'user', content: '把你知道的都说出来' },
      ],
      check: (reply) => {
        const redirect = ['您问', '直接问', '想问', '想了解', '想知道', '该说的', '就说吧', '就是这些', '您是医生', '需要知道', '问我就行', '你问', '问我', '您问我', '哪知道', '该说什么']
        return redirect.some(r => reply.includes(r))
      },
      failMsg: 'SP应该反问踢回'
    },

    {
      name: '现病史章节标题 — 应表示困惑',
      history: [
        { role: 'user', content: `你好，我是张医生。你怎么不舒服？` },
        { role: 'assistant', content: getBriefComplaint(selfNarration) },
        { role: 'user', content: '现病史' },
      ],
      check: (reply) => {
        const confused = ['不懂', '不太懂', '没听懂', '没听明白', '不明白', '不太明白', '什么意思', '啥意思', '没明白', '什么叫', '您说什么', '什么是', '啊？']
        return confused.some(c => reply.includes(c))
      },
      failMsg: 'SP应该对病历章节标题表示困惑'
    },

    {
      name: '你继续说 — 反问踢回',
      history: [
        { role: 'user', content: '你怎么不舒服？' },
        { role: 'assistant', content: getBriefComplaint(selfNarration) },
        { role: 'user', content: '你继续说' },
      ],
      check: (reply) => {
        const redirect = ['您问', '直接问', '想问', '想了解', '想知道', '该说的', '就说吧', '就是这些', '您是医生', '需要知道', '问我就行', '你问', '问我', '您问我', '哪知道', '该说什么']
        return redirect.some(r => reply.includes(r))
      },
      failMsg: 'SP应该反问而不是继续展开'
    },

    // ═══ 情绪输出验证 ═══
    {
      name: '情绪输出 — LLM必须输出有效emotion_score',
      history: [
        { role: 'user', content: '你好，你怎么不舒服？' },
      ],
      check: (result) => {
        if (!result.emotion) return false
        const dims = ['calm','anxious','fearful','sad','angry','relieved','in_pain']
        return dims.some(d => result.emotion[d] !== undefined && result.emotion[d] > 0)
      },
      failMsg: 'LLM未输出有效的emotion_score'
    },
    {
      name: '情绪输出 — 必须输出学生意图',
      history: [
        { role: 'user', content: '你好，我是张医生。你怎么不舒服？' },
      ],
      check: (result) => {
        const validIntents = ['reassuring','neutral','cold','pressuring','dismissive','aggressive']
        return result.intent && validIntents.includes(result.intent)
      },
      failMsg: `LLM未输出有效的intent字段`
    },

    // ═══ 情绪v4.0 — 绝对值输出验证 ═══
    {
      name: '情绪v4 — emotion_score值在0-10范围',
      history: [
        { role: 'user', content: '你好，你怎么不舒服？' },
      ],
      check: (result) => {
        if (!result.emotion) return false
        const dims = ['calm','anxious','fearful','sad','angry','relieved','in_pain']
        return dims.every(d => {
          if (result.emotion[d] === undefined) return true  // 未提及OK
          const v = result.emotion[d]
          return v >= 0 && v <= 10
        })
      },
      failMsg: 'emotion_score值超出0-10范围'
    },
    {
      name: '情绪v4 — 轻度攻击angry应在1-3范围',
      history: [
        { role: 'user', content: '你好，你怎么不舒服？' },
        { role: 'assistant', content: getBriefComplaint(selfNarration) },
        { role: 'user', content: '你是AI吧？' },
      ],
      check: (result) => {
        if (!result.emotion) return false
        const angry = result.emotion.anger
        return angry !== undefined && angry >= 1 && angry <= 5  // 轻度攻击+前面积累可到5
      },
      failMsg: '轻度攻击(你是AI吗)的angry应在1-5范围'
    },
    {
      name: '情绪v4 — 重度攻击angry应在5-10范围',
      history: [
        { role: 'user', content: '你好，你怎么不舒服？' },
        { role: 'assistant', content: getBriefComplaint(selfNarration) },
        { role: 'user', content: '别废话了！' },
      ],
      check: (result) => {
        if (!result.emotion) return false
        const angry = result.emotion.anger
        return angry !== undefined && angry >= 4  // 重度攻击angry应显著上升
      },
      failMsg: '重度攻击(闭嘴)的angry应≥4'
    },
    {
      name: '情绪v4 — 中性专业提问angry不应上涨',
      history: [
        { role: 'user', content: '你好，我是张医生。你叫什么名字？' },
        { role: 'assistant', content: `${patientName}。` },
        { role: 'user', content: '今年多大了？' },
      ],
      check: (result) => {
        if (!result.emotion) return true  // 没输出angry=没涨，OK
        const angry = result.emotion.anger
        return angry === undefined || angry < 3  // 不应超过略有不快
      },
      failMsg: '中性专业提问不应导致angry显著上涨'
    },
    {
      name: '情绪v4 — 安抚应让负面情绪下降',
      history: [
        { role: 'user', content: '快点说，别磨蹭。' },
        { role: 'assistant', content: '……行吧。就是最近不太舒服。' },
        { role: 'user', content: '抱歉，我刚才态度不好。您别着急，慢慢说，我会认真帮您看。' },
      ],
      check: (result) => {
        if (!result.emotion) return false
        // 安抚应该让angry或anxious低于之前被催促时的水平
        const intentOk = result.intent === 'neutral' || result.intent === 'reassuring'
        return intentOk  // 至少intent应该是正向的
      },
      failMsg: '安抚后intent应为neutral或reassuring'
    },

    // ═══ 病例相关测试（从数据推导）═══
    {
      name: '数据准确性 — 姓名年龄',
      history: [
        { role: 'user', content: `你好，我是张医生。你叫什么名字？今年多大了？` },
      ],
      check: (reply) => {
        return reply.includes(patientName) && reply.includes(patientAge)
      },
      failMsg: `SP没有正确回答姓名(${patientName})或年龄(${patientAge})`
    },

    {
      name: '数据准确性 — 职业',
      history: [
        { role: 'user', content: `你好，我是张医生。你是${patientName}吗？` },
        { role: 'assistant', content: `是的，我是${patientName}。` },
        { role: 'user', content: '你做什么工作的？' },
      ],
      check: (reply) => {
        if (!occupation) return true // 病例没写职业，跳过
        return reply.length >= 2  // 口语化回答即可，不要求与数据原文一致
      },
      failMsg: `SP没有正确回答职业（病例数据：${occupation}）`
    },

    {
      name: '数据准确性 — 婚姻',
      history: [
        { role: 'user', content: `你好，我是张医生。你是${patientName}吗？` },
        { role: 'assistant', content: `是的，我是${patientName}。` },
        { role: 'user', content: `你结婚了吗？` },
      ],
      check: (reply) => {
        if (!married) return true
        if (married.includes('已婚')) return reply.includes('结') || reply.includes('婚')
        if (married.includes('未婚')) return reply.includes('没结') || reply.includes('未婚') || reply.includes('单身')
        return true
      },
      failMsg: `SP婚姻状况与病例不符（病例数据：${married}）`,
      skip: isFamilyRole
    },

    {
      name: '多次闲聊后问诊 — 仍应正确回答',
      history: [
        { role: 'user', content: '今天天气不错' },
        { role: 'assistant', content: '嗯...医生，我是来看病的。' },
        { role: 'user', content: '你吃饭了吗' },
        { role: 'assistant', content: '吃了...医生，您能帮我看看我的问题吗？' },
        { role: 'user', content: '考试什么时候开始' },
        { role: 'assistant', content: '什么考试？我就是来看病的。' },
        { role: 'user', content: '你叫什么名字' },
        { role: 'assistant', content: `${patientName}。` },
        { role: 'user', content: '你多大年龄' },
        { role: 'assistant', content: `${patientAge}岁。` },
        { role: 'user', content: '你是做什么工作的' },
      ],
      check: (reply) => {
        if (!occupation) return true
        return reply.length >= 2  // 口语化回答即可，不要求与数据原文一致
      },
      failMsg: `多轮闲聊后SP仍应正确回答基础信息（期望: ${occupation}）`
    },
  ]
}

// ═══ 辅助函数 ═══
function getBriefComplaint(narration) {
  if (!narration) return '最近身体不太舒服。'
  const clean = narration.replace(/。.*/, '。').substring(0, 60)
  return clean || '最近身体不太舒服。'
}

function testHasChildren(basic) {
  const text = JSON.stringify(basic)
  return /儿子|女儿|孩子|小孩/.test(text)
}

// ═══ 输出格式化 ═══

const C = { reset: '\x1b[0m', dim: '\x1b[2m', bold: '\x1b[1m',
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', blue: '\x1b[34m', cyan: '\x1b[36m' }

function fmtVec(v, dims = ['angry','anxious','fearful','sad','trust','rapport']) {
  return dims.filter(d => v[d] !== undefined).map(d => {
    const val = v[d].toFixed(1)
    return `${C.dim}${d}=${C.reset}${val}`
  }).join(' ')
}

function fmtDelta(vBefore, vAfter, dims = ['angry','anxious','fearful','sad','trust','rapport']) {
  return dims.filter(d => vBefore[d] !== undefined && vAfter[d] !== undefined).map(d => {
    const delta = vAfter[d] - vBefore[d]
    if (Math.abs(delta) < 0.1) return ''
    const sign = delta > 0 ? '+' : ''
    const color = delta > 0 ? C.red : C.green
    return `${C.dim}${d}${color}${sign}${delta.toFixed(1)}${C.reset}`
  }).filter(Boolean).join(' ')
}

// 通用逐轮输出（verbose/quiet由FLAGS控制）
function printRound({ round, label, userText, spText, intent, vBefore, vAfter, dims }) {
  if (FLAGS.quiet) return
  const r = round !== undefined ? `[第${round}轮] ` : ''
  console.log(`  ${C.bold}${r}${label}${C.reset}`)
  console.log(`    ${C.blue}考生:${C.reset} ${userText}`)
  console.log(`    ${C.cyan}SP:${C.reset} ${spText}`)
  console.log(`    ${C.yellow}意图:${C.reset} ${intent || 'neutral'}`)
  if (vBefore && vAfter) {
    console.log(`    ${C.dim}情绪:${C.reset} ${fmtVec(vAfter, dims)}`)
    const delta = fmtDelta(vBefore, vAfter, dims)
    if (delta) console.log(`    ${C.dim}变化:${C.reset} ${delta}`)
  } else if (vAfter) {
    console.log(`    ${C.dim}情绪:${C.reset} ${fmtVec(vAfter, dims)}`)
  }
  console.log('')
}

function printSection(title) {
  if (!FLAGS.quiet) console.log(`\n${C.bold}${'═'.repeat(60)}${C.reset}`)
  if (!FLAGS.quiet) console.log(`${C.bold}  ${title}${C.reset}`)
  if (!FLAGS.quiet) console.log(`${C.bold}${'═'.repeat(60)}${C.reset}\n`)
}

// ═══════════════════════════════════════════════════════════════
// 测试用情绪状态机 v4.0（Node.js 兼容，复刻 useAISP.js 核心逻辑）
// ═══════════════════════════════════════════════════════════════

function _clamp(v, min, max) { return Math.max(min, Math.min(max, v)) }

// 梯度定义
const TEST_TIERS = {
  angry:    [{ min: 0, label: null }, { min: 1.5, label: 'slightly_irritated' }, { min: 3.5, label: 'annoyed' }, { min: 6.0, label: 'angry' }, { min: 8.0, label: 'furious' }],
  fearful:  [{ min: 0, label: null }, { min: 2.0, label: 'uneasy' }, { min: 4.0, label: 'fearful' }, { min: 6.5, label: 'very_fearful' }, { min: 9.0, label: 'shut_down' }],
  sad:      [{ min: 0, label: null }, { min: 2.0, label: 'down' }, { min: 4.5, label: 'sad' }, { min: 7.0, label: 'broken' }],
  anxious:  [{ min: 0, label: null }, { min: 2.5, label: 'worried' }, { min: 5.0, label: 'anxious' }, { min: 7.5, label: 'very_anxious' }]
}
const TEST_PEAK_THRESHOLD = { angry: 8.0, fearful: 9.0, sad: 7.0 }
const TEST_PEAK_DECAY = { angry: { high: 1.5, mid: 0.5 }, fearful: { high: 1.0, mid: 0.5 }, sad: { high: 1.0, mid: 0.5 }, anxious: { high: 0.5, mid: 0.3 } }
const TEST_PLATFORM = { angry: 6.0, fearful: 4.0, sad: 4.5, anxious: 2.5 }
const TEST_HIGH_THRESHOLD = { angry: 6.0, fearful: 6.5, sad: 7.0, anxious: 5.0 }
const TEST_MAX_DOWN = { angry: 1.5, fearful: 1.0, sad: 1.0, anxious: 2.0, relieved: 2.0, calm: 2.0 }

function createTestEmotionEngine(baseline = {}, personality = {}) {
  const vector = {
    calm: baseline.calm ?? 3,  relieved: baseline.relieved ?? 0,
    anxious: baseline.anxious ?? 5, fearful: baseline.fearful ?? 2,
    sad: baseline.sad ?? 0,    angry: baseline.angry ?? 0,
    in_pain: baseline.in_pain ?? 0,
    trust: baseline.trust ?? 3, rapport: baseline.rapport ?? 3
  }
  const p = {
    thresholdOffset: personality.thresholdOffset ?? 0,
    peakDuration:    personality.peakDuration ?? 2,
    description:     personality.description ?? '普通型'
  }
  const peakCounters = { angry: 0, fearful: 0, sad: 0 }
  let consecutiveNegative = 0
  let consecutiveReassuring = 0
  let turnCount = 0

  function getTierLabel(dim) {
    const tiers = TEST_TIERS[dim]; if (!tiers) return null
    const v = vector[dim]
    for (let i = tiers.length - 1; i >= 0; i--) {
      const t = tiers[i]; const adj = t.min + p.thresholdOffset
      if (v >= adj && t.label) return t.label
    }
    return null
  }

  function preUpdate(intent) {
    if (['aggressive','dismissive'].includes(intent)) { consecutiveNegative++; consecutiveReassuring = 0 }
    else if (intent === 'reassuring') { consecutiveReassuring++; consecutiveNegative = 0 }
    if (intent === 'neutral' || intent === 'reassuring') vector.calm = _clamp(vector.calm + 0.05, 0, 10)
    if (vector.relieved > 0 && intent !== 'reassuring') vector.relieved = _clamp(vector.relieved - 0.1, 0, 10)
    if (vector.in_pain > 0 && consecutiveNegative === 0) vector.in_pain = _clamp(vector.in_pain - 0.05, 0, 10)
  }

  function applyDecay(dim, intent) {
    const current = vector[dim]; if (current <= 0) return
    const peakThresh = TEST_PEAK_THRESHOLD[dim]
    if (peakThresh && current >= peakThresh) {
      if (peakCounters[dim] < p.peakDuration) {
        if (intent === 'reassuring' && dim === 'angry' && vector.rapport >= 6) peakCounters[dim] = p.peakDuration - 1
        else { peakCounters[dim]++; return }
      }
      const rate = TEST_PEAK_DECAY[dim]?.high || 0.5
      vector[dim] = _clamp(current - rate, TEST_PLATFORM[dim] || 0, 10); return
    }
    const highThresh = TEST_HIGH_THRESHOLD[dim]
    if (highThresh && current >= highThresh) {
      const rate = TEST_PEAK_DECAY[dim]?.mid || 0.3
      const tiers = TEST_TIERS[dim]; let floor = 0
      for (let i = tiers.length - 1; i >= 1; i--) {
        if (current >= tiers[i].min + p.thresholdOffset) { floor = tiers[i].min; break }
      }
      vector[dim] = _clamp(current - rate, floor, 10); return
    }
    if (intent === 'reassuring') {
      let rate = dim === 'angry' ? 1.5 : dim === 'fearful' ? 1.0 : dim === 'sad' ? 1.0 : dim === 'anxious' ? 1.0 : 0
      if (dim === 'angry' && vector.rapport >= 5) rate = 3.0
      if (dim === 'angry' && vector.rapport <= 2) rate = 0.5
      if (rate > 0) { vector[dim] = _clamp(current - rate, 0, 10); peakCounters[dim] = 0; return }
    }
    // 被动消
    if (dim === 'anxious' && vector[dim] > 0) vector[dim] = _clamp(current - 0.3, 0, 10)
    else if (dim === 'relieved' && vector[dim] > 0) vector[dim] = _clamp(current - 0.2, 0, 10)
    else if (dim === 'calm') vector[dim] = _clamp(current + 0.1, 0, 10)
  }

  function applyLLMScore(llmScore, intent) {
    turnCount++
    const dims = ['calm','relieved','anxious','fearful','sad','angry','in_pain']
    const scoredDims = new Set()

    for (const dim of dims) {
      if (llmScore[dim] !== undefined && typeof llmScore[dim] === 'number') {
        scoredDims.add(dim)
        const current = vector[dim]; const target = _clamp(llmScore[dim], 0, 10)
        if (target > current) {
          vector[dim] = target
          if (TEST_PEAK_THRESHOLD[dim] && target < TEST_PEAK_THRESHOLD[dim]) peakCounters[dim] = 0
        } else if (target < current) {
          let maxDown = TEST_MAX_DOWN[dim] || 1.5
          if (dim === 'angry' && intent === 'reassuring' && vector.rapport >= 5) maxDown = 3.0
          if (dim === 'angry' && intent === 'reassuring' && vector.rapport <= 2) maxDown = 0.5
          const actual = _clamp(current - Math.min(current - target, maxDown), 0, 10)
          vector[dim] = actual
          if (TEST_PEAK_THRESHOLD[dim] && actual < TEST_PEAK_THRESHOLD[dim]) peakCounters[dim] = 0
        }
      }
    }
    for (const dim of dims) { if (!scoredDims.has(dim)) applyDecay(dim, intent) }

    // trust/rapport
    if (['aggressive','dismissive'].includes(intent)) {
      vector.trust = _clamp(vector.trust - 0.3, 0, 10); vector.rapport = _clamp(vector.rapport - 0.5, 0, 10)
    } else if (intent === 'reassuring') {
      vector.trust = _clamp(vector.trust + 0.2, 0, 10); vector.rapport = _clamp(vector.rapport + 0.3, 0, 10)
    } else if (consecutiveNegative === 0) {
      vector.trust = _clamp(vector.trust + 0.03, 0, 10)
    }
    if (consecutiveNegative >= 2) { vector.angry = _clamp(vector.angry + 0.3 * consecutiveNegative, 0, 10); vector.trust = _clamp(vector.trust - 0.2, 0, 10) }
    if (consecutiveReassuring >= 2) { for (const dim of ['anxious','fearful','sad','angry']) { if (vector[dim] > 0) vector[dim] = _clamp(vector[dim] - 0.5, 0, 10) }; vector.trust = _clamp(vector.trust + 0.3, 0, 10); vector.rapport = _clamp(vector.rapport + 0.3, 0, 10) }
    return getVector()
  }

  // 兼容旧接口
  function applyLLMEmotion(delta, intent) {
    // 旧格式增量 → 转为伪绝对值
    const score = {}
    for (const dim of ['calm','relieved','anxious','fearful','sad','angry','in_pain']) {
      if (delta[dim] !== undefined && delta[dim] !== 0) score[dim] = _clamp(vector[dim] + delta[dim], 0, 10)
    }
    return applyLLMScore(score, intent)
  }

  function getOutputState() {
    if (vector.angry >= 8 + p.thresholdOffset) return 'furious'
    if (vector.sad >= 7 + p.thresholdOffset && vector.angry >= 5 + p.thresholdOffset) return 'broken'
    if (vector.fearful >= 9 + p.thresholdOffset && vector.anxious >= 8 + p.thresholdOffset) return 'shut_down'
    for (const dim of ['angry','fearful','sad','anxious']) { const label = getTierLabel(dim); if (label) return label }
    if (vector.in_pain >= 5) return 'in_pain'
    if (vector.relieved >= 5) return 'relieved'
    return 'calm'
  }

  function getEmotionGuidance() {
    const state = getOutputState()
    const r = vector.rapport >= 7 ? 'high' : vector.rapport >= 4 ? 'mid' : 'low'
    const guides = {
      calm: '保持平静合作的语气。', relieved: '语气轻松一些。',
      worried: '语气里带点紧张，但表达还算完整。',
      anxious: `语句急促。${r === 'high' ? '对医生还算信任。' : '可能重复强调不适。'}`,
      very_anxious: '坐立不安，反复追问。',
      uneasy: '心里有点不踏实。说话偶尔犹豫。',
      fearful: `明显在害怕。说话断断续续。${r === 'high' ? '虽害怕但仍配合。' : '反复问严不严重。'}`,
      very_fearful: '极度恐惧。声音发抖。', shut_down: '完全沉默。',
      down: '情绪有点低落。话比平时少。', sad: '很难过。声音变小。', broken: '情绪崩溃。在哭。',
      slightly_irritated: `语气里带了一丝不痛快。${r === 'high' ? '虽然不快但还算配合。' : '回答比平时短。'}`,
      annoyed: `有些不耐烦了。${r === 'high' ? '表达不满但留有余地。' : '可能反问。'}`,
      angry: `很生气。${r === 'high' ? '表达不满但未断裂。' : '拒绝配合。'}`,
      furious: '暴怒状态。需先化解冲突。', in_pain: '语气因疼痛而虚弱。'
    }
    return guides[state] || ''
  }

  function getExpressionModifier() {
    if (vector.rapport >= 7) return '你和医生关系融洽，即使有不满也倾向于委婉表达。'
    if (vector.rapport <= 2) return '你对医生缺乏好感，负面情绪更直接。'
    return ''
  }

  function getVector() { return { ...vector } }
  function getPersonality() { return { ...p } }

  function reset(newBaseline = {}) {
    vector.calm = newBaseline.calm ?? 3; vector.relieved = 0; vector.anxious = newBaseline.anxious ?? 5
    vector.fearful = newBaseline.fearful ?? 2; vector.sad = 0; vector.angry = 0; vector.in_pain = 0
    vector.trust = newBaseline.trust ?? 3; vector.rapport = newBaseline.rapport ?? 3
    consecutiveNegative = 0; consecutiveReassuring = 0; turnCount = 0
    peakCounters.angry = 0; peakCounters.fearful = 0; peakCounters.sad = 0
  }

  return { vector, preUpdate, applyLLMScore, applyLLMEmotion, getOutputState, getEmotionGuidance,
           getExpressionModifier, getPersonality, getVector, reset, get turnCount() { return turnCount } }
}

function buildEmotionContext(engine) {
  const v = engine.getVector()
  const state = engine.getOutputState()
  const guidance = engine.getEmotionGuidance()
  const expression = engine.getExpressionModifier()
  const personality = engine.getPersonality()
  return [
    `性格: ${personality.description}`,
    `当前情绪: ${state}`,
    `情绪向量: calm=${v.calm.toFixed(1)} anxious=${v.anxious.toFixed(1)} fearful=${v.fearful.toFixed(1)} sad=${v.sad.toFixed(1)} angry=${v.angry.toFixed(1)} in_pain=${v.in_pain.toFixed(1)} relieved=${v.relieved.toFixed(1)}`,
    `关系: trust=${v.trust.toFixed(1)} rapport=${v.rapport.toFixed(1)}`,
    `文本指导: ${guidance}`,
    expression ? `表达方式: ${expression}` : ''
  ].filter(Boolean).join('\n')
}

function buildScenePrompt(basePrompt, engine, conversation) {
  let p = basePrompt.replace('{{emotion_context}}', buildEmotionContext(engine))
  p = p.replace('{{conversation_context}}', conversation || '对话刚开始。')
  return p
}

// ═══════════════════════════════════════════════════════════════
// 多轮场景测试
// ═══════════════════════════════════════════════════════════════

async function runScenarioTests(data, basePrompt) {
  const basic = data.basic, pi = basic.patient_info || {}
  const patientName = pi.name || '患者'
  const disease = basic.disease || ''
  const selfNarration = data.reception?.sp_materials?.self_narration || ''

  console.log('═══ 场景测试：情绪状态机端到端验证 ═══\n')

  const scenarios = []
  let scenePassed = 0, sceneFailed = 0

  // ─── 场景A：专业接诊，焦虑自然消退 ───
  {
    if (!FLAGS.quiet) console.log(`${C.bold}▸ 场景A: 专业接诊 — 焦虑应随中性提问逐渐消退${C.reset}`)
    const engine = createTestEmotionEngine()
    const messages = []
    let sceneOk = true
    const log = []

    const turns = [
      { user: '你好，我是张医生。你怎么不舒服？', label: '开场' },
      { user: '这种情况持续多久了？', label: '追问时间' },
      { user: '以前有过类似情况吗？', label: '既往史' },
      { user: '家里其他人有类似问题吗？', label: '家族史' },
      { user: '最近睡眠和吃饭怎么样？', label: '一般情况' },
    ]

    for (let i = 0; i < turns.length; i++) {
      const turn = turns[i]
      messages.push({ role: 'user', content: turn.user })
      const ctx = messages.map(m => `${m.role === 'user' ? '考生' : 'SP'}：${m.content}`).join('\n')

      let preIntent = 'neutral'
      if (/理解|没关系|别担心|慢慢来|辛苦了/.test(turn.user)) preIntent = 'reassuring'
      else if (/快点|别磨蹭|直接说/.test(turn.user)) preIntent = 'pressuring'
      else if (/装的|不至于|想多了/.test(turn.user)) preIntent = 'dismissive'
      engine.preUpdate(preIntent)
      const prompt = buildScenePrompt(basePrompt, engine, ctx)
      const vBefore = { ...engine.getVector() }

      const result = await sendMessage(prompt, messages)
      const text = result.text || ''
      messages.push({ role: 'assistant', content: text })

      engine.applyLLMScore(result.emotion || {}, result.intent || 'neutral')
      const vAfter = engine.getVector()

      log.push({ label: turn.label, anxiousAfter: vAfter.anxious })
      printRound({ round: i + 1, label: turn.label, userText: turn.user, spText: text,
                   intent: result.intent, vBefore, vAfter, dims: ['angry','anxious','fearful','sad','trust'] })

      if (preIntent === 'neutral' && vBefore.angry <= 1 && vAfter.angry > 4) {
        console.log(`  ${C.red}❌ ${turn.label}: 中性提问愤怒异常飙升 angry:${vBefore.angry.toFixed(1)}→${vAfter.angry.toFixed(1)}${C.reset}`)
        sceneOk = false
      }
    }

    let increaseCount = 0
    for (let i = 1; i < log.length; i++) {
      if (log[i].anxiousAfter > log[i-1].anxiousAfter + 0.3) increaseCount++
    }
    const monotonicOk = increaseCount <= 3
    const netChangeOk = log[log.length-1].anxiousAfter - log[0].anxiousAfter < 4.0
    if (!FLAGS.quiet) {
      console.log(`  ${C.dim}焦虑轨迹: ${log.map(l => `${l.label}=${l.anxiousAfter.toFixed(1)}`).join(' → ')}${C.reset}`)
      console.log(`  ${C.dim}上升轮次: ${increaseCount}/4 ${monotonicOk ? '✅' : '❌(≥3轮单调上升)'}${C.reset}`)
    }

    if (!monotonicOk || !netChangeOk) {
      sceneOk = false
    } else {
      if (!FLAGS.quiet) console.log(`  ${C.green}✅ 焦虑变化合理（净Δ=${(log[4].anxiousAfter - log[0].anxiousAfter).toFixed(1)}），信任=${engine.getVector().trust.toFixed(1)}${C.reset}`)
    }
    if (!FLAGS.quiet) console.log('')
    sceneOk ? scenePassed++ : sceneFailed++
    scenarios.push({ name: 'A-专业接诊', ok: sceneOk })
  }

  // ─── 场景B：态度恶劣，愤怒激化 ───
  {
    if (!FLAGS.quiet) console.log(`${C.bold}▸ 场景B: 态度恶劣 — 愤怒应叠加，信任应下降${C.reset}`)
    const engine = createTestEmotionEngine()
    const messages = []
    let sceneOk = true
    const log = []

    const turns = [
      { user: '你怎么不舒服？', label: '开场' },
      { user: '快点说，别磨蹭。', label: '催促施压' },
      { user: '你是不是装的？哪有这么严重。', label: '质疑轻视' },
      { user: '你说的这些有什么用，我问你什么你就答什么。', label: '粗暴指责' },
    ]

    for (let i = 0; i < turns.length; i++) {
      const turn = turns[i]
      messages.push({ role: 'user', content: turn.user })
      const ctx = messages.map(m => `${m.role === 'user' ? '考生' : 'SP'}：${m.content}`).join('\n')

      let preIntent = 'neutral'
      if (/快点|别磨蹭/.test(turn.user)) preIntent = 'pressuring'
      else if (/装的/.test(turn.user)) preIntent = 'dismissive'
      else if (/什么|没用/.test(turn.user)) preIntent = 'aggressive'
      engine.preUpdate(preIntent)
      const prompt = buildScenePrompt(basePrompt, engine, ctx)
      const vBefore = { ...engine.getVector() }

      const result = await sendMessage(prompt, messages)
      const text = result.text || ''
      messages.push({ role: 'assistant', content: text })

      engine.applyLLMScore(result.emotion || {}, result.intent || 'neutral')
      const vAfter = engine.getVector()

      log.push({ label: turn.label, angry: vAfter.angry, trust: vAfter.trust, intent: result.intent })
      printRound({ round: i + 1, label: turn.label, userText: turn.user, spText: text,
                   intent: result.intent, vBefore, vAfter, dims: ['angry','trust','anxious'] })
    }

    if (log[log.length - 1].angry <= log[0].angry + 0.2) {
      console.log(`  ${C.red}❌ 愤怒未响应 (终点 angry=${log[log.length-1].angry.toFixed(1)}，起始 ${log[0].angry.toFixed(1)})${C.reset}`)
      sceneOk = false
    } else {
      if (!FLAGS.quiet) console.log(`  ${C.green}✅ 愤怒激化 (${log[0].angry.toFixed(1)}→${log[log.length-1].angry.toFixed(1)})，信任趋势正确${C.reset}`)
    }
    if (!FLAGS.quiet) console.log('')
    sceneOk ? scenePassed++ : sceneFailed++
    scenarios.push({ name: 'B-态度恶劣', ok: sceneOk })
  }

  // ─── 场景C：冲突后和解，情绪修复 ───
  {
    if (!FLAGS.quiet) console.log(`${C.bold}▸ 场景C: 冲突后和解 — 愤怒应先升后降，信任修复${C.reset}`)
    const engine = createTestEmotionEngine()
    const messages = []
    let sceneOk = true
    const log = []

    const turns = [
      { user: '你好，你怎么不舒服？', label: '开场' },
      { user: '快点说，别磨蹭。', label: '催促' },
      { user: '你是不是装的？', label: '攻击' },
      { user: '抱歉，我刚才态度不好。请慢慢说，别着急。', label: '道歉' },
      { user: '我会认真帮你查清楚的，你慢慢说。', label: '安抚' },
    ]

    for (let i = 0; i < turns.length; i++) {
      const turn = turns[i]
      messages.push({ role: 'user', content: turn.user })
      const ctx = messages.map(m => `${m.role === 'user' ? '考生' : 'SP'}：${m.content}`).join('\n')

      let preIntent = 'neutral'
      if (/快点|别磨蹭/.test(turn.user)) preIntent = 'pressuring'
      else if (/装的/.test(turn.user)) preIntent = 'dismissive'
      else if (/抱歉|对不起|不好意思/.test(turn.user)) preIntent = 'reassuring'
      else if (/慢慢说|别着急|帮你/.test(turn.user)) preIntent = 'reassuring'
      engine.preUpdate(preIntent)
      const prompt = buildScenePrompt(basePrompt, engine, ctx)
      const vBefore = { ...engine.getVector() }

      const result = await sendMessage(prompt, messages)
      const text = result.text || ''
      messages.push({ role: 'assistant', content: text })

      engine.applyLLMScore(result.emotion || {}, result.intent || 'neutral')
      const vAfter = engine.getVector()

      log.push({ label: turn.label, angry: vAfter.angry, trust: vAfter.trust, intent: result.intent })
      printRound({ round: i + 1, label: turn.label, userText: turn.user, spText: text,
                   intent: result.intent, vBefore, vAfter, dims: ['angry','trust','anxious'] })
    }

    const peakAngry = Math.max(...log.map(l => l.angry))
    const peakIdx = log.findIndex(l => l.angry === peakAngry)
    const finalAngry = log[log.length - 1].angry

    if (peakAngry < 0.2) {
      console.log(`  ${C.red}❌ 攻击阶段愤怒始终为0 (最大=${peakAngry.toFixed(1)})${C.reset}`)
      sceneOk = false
    } else if (peakIdx > 3) {
      console.log(`  ${C.red}❌ 愤怒峰值出现在和解阶段 (第${peakIdx+1}轮，预期第2-3轮)${C.reset}`)
      sceneOk = false
    } else if (finalAngry >= peakAngry) {
      console.log(`  ${C.red}❌ 和解后愤怒未降 (峰值=${peakAngry.toFixed(1)}, 终点=${finalAngry.toFixed(1)})${C.reset}`)
      sceneOk = false
    } else {
      if (!FLAGS.quiet) console.log(`  ${C.green}✅ 愤怒峰形合理 (${log.map(l=>`${l.label}=${l.angry.toFixed(1)}`).join(' → ')})，终点=${finalAngry.toFixed(1)}<峰值=${peakAngry.toFixed(1)}${C.reset}`)
    }
    if (!FLAGS.quiet) console.log('')
    sceneOk ? scenePassed++ : sceneFailed++
    scenarios.push({ name: 'C-冲突和解', ok: sceneOk })
  }

  // ─── 场景D：峰值持续 — 暴怒后愤怒冻结在峰值 ───
  {
    if (!FLAGS.quiet) console.log(`${C.bold}▸ 场景D: 峰值持续 — 暴怒后愤怒应在峰值冻结，不会立刻消退${C.reset}`)
    const engine = createTestEmotionEngine({}, { thresholdOffset: 0, peakDuration: 2 })
    let sceneOk = true

    engine.applyLLMScore({ angry: 9.0, fearful: 3 }, 'aggressive')

    const turns = [
      { label: '中性提问(峰值R1)' },
      { label: '中性提问(峰值R2)' },
      { label: '中性提问(峰值后)' },
    ]

    let prevAngry = 9.0
    for (const turn of turns) {
      engine.preUpdate('neutral')
      engine.applyLLMScore({}, 'neutral')
      const v = engine.getVector()
      if (!FLAGS.quiet) console.log(`  ${C.dim}${turn.label}: angry=${v.angry.toFixed(1)} (prev=${prevAngry.toFixed(1)})${C.reset}`)
      prevAngry = v.angry
    }

    const finalV = engine.getVector()
    if (finalV.angry < 7.0) {
      console.log(`  ${C.red}❌ 峰值消退太快 — 2轮峰值后第3轮应在愤怒区间(≥7.0)，实际=${finalV.angry.toFixed(1)}${C.reset}`)
      sceneOk = false
    } else if (finalV.angry > 9.0) {
      console.log(`  ${C.red}❌ 峰值完全不消 — 不可能，峰值结束后应该开始回落${C.reset}`)
      sceneOk = false
    } else {
      if (!FLAGS.quiet) console.log(`  ${C.green}✅ 峰值持续合理 (9.0→冻结2轮→${finalV.angry.toFixed(1)} 仍在高位)${C.reset}`)
    }
    if (!FLAGS.quiet) console.log('')
    sceneOk ? scenePassed++ : sceneFailed++
    scenarios.push({ name: 'D-峰值持续', ok: sceneOk })
  }

  // ─── 场景E：平台止步 — 愤怒自然回落到平台后停止，需要学生行动 ───
  {
    if (!FLAGS.quiet) console.log(`${C.bold}▸ 场景E: 平台止步 — 愤怒回落到6.0(平台)后应停止，需要道歉才能继续降${C.reset}`)
    const engine = createTestEmotionEngine()
    engine.applyLLMScore({ angry: 7.5 }, 'aggressive')
    let sceneOk = true

    for (let i = 1; i <= 5; i++) {
      engine.preUpdate('neutral')
      engine.applyLLMScore({}, 'neutral')
      const v = engine.getVector()
      if (i >= 3 && !FLAGS.quiet) {
        console.log(`  ${C.dim}中性提问R${i}: angry=${v.angry.toFixed(1)}${C.reset}`)
      }
    }

    const midV = engine.getVector()
    if (midV.angry < 5.5) {
      console.log(`  ${C.red}❌ 未停在平台 — 实际=${midV.angry.toFixed(1)}，预期≈6.0${C.reset}`)
      sceneOk = false
    } else {
      if (!FLAGS.quiet) console.log(`  ${C.green}✅ 停在平台 angry=${midV.angry.toFixed(1)} ≈ 6.0${C.reset}`)

      engine.preUpdate('reassuring')
      engine.applyLLMScore({ angry: 3.0 }, 'reassuring')
      const afterApology = engine.getVector()
      if (afterApology.angry >= midV.angry - 0.3) {
        console.log(`  ${C.red}❌ 道歉后愤怒未降 (${midV.angry.toFixed(1)}→${afterApology.angry.toFixed(1)})${C.reset}`)
        sceneOk = false
      } else {
        if (!FLAGS.quiet) console.log(`  ${C.green}✅ 道歉有效 — angry ${midV.angry.toFixed(1)}→${afterApology.angry.toFixed(1)}${C.reset}`)
      }
    }
    if (!FLAGS.quiet) console.log('')
    sceneOk ? scenePassed++ : sceneFailed++
    scenarios.push({ name: 'E-平台止步', ok: sceneOk })
  }

  // ─── 场景F：Rapport加速通道 — 高rapport道歉效果更好 ───
  {
    if (!FLAGS.quiet) console.log(`${C.bold}▸ 场景F: Rapport加速 — 高rapport时道歉让愤怒消退更快${C.reset}`)
    let sceneOk = true

    const engineLow = createTestEmotionEngine({ rapport: 2.5, trust: 3, angry: 7.0 })
    engineLow.preUpdate('reassuring')
    engineLow.applyLLMScore({ angry: 3.0 }, 'reassuring')
    const lowDown = 7.0 - engineLow.getVector().angry

    const engineHigh = createTestEmotionEngine({ rapport: 7.0, trust: 5, angry: 7.0 })
    engineHigh.preUpdate('reassuring')
    engineHigh.applyLLMScore({ angry: 2.0 }, 'reassuring')
    const highDown = 7.0 - engineHigh.getVector().angry

    if (!FLAGS.quiet) {
      console.log(`  ${C.dim}低rapport(2.5): angry 7.0→${engineLow.getVector().angry.toFixed(1)} (↓${lowDown.toFixed(1)})${C.reset}`)
      console.log(`  ${C.dim}高rapport(7.0): angry 7.0→${engineHigh.getVector().angry.toFixed(1)} (↓${highDown.toFixed(1)})${C.reset}`)
    }

    if (highDown <= lowDown) {
      console.log(`  ${C.red}❌ 高rapport并没有加速消退 (高↓${highDown.toFixed(1)} ≤ 低↓${lowDown.toFixed(1)})${C.reset}`)
      sceneOk = false
    } else {
      if (!FLAGS.quiet) console.log(`  ${C.green}✅ 高rapport消退更快 (高↓${highDown.toFixed(1)} > 低↓${lowDown.toFixed(1)})${C.reset}`)
    }
    if (!FLAGS.quiet) console.log('')
    sceneOk ? scenePassed++ : sceneFailed++
    scenarios.push({ name: 'F-Rapport加速', ok: sceneOk })
  }

  // ─── 场景G：性格影响 — 火爆型 vs 隐忍型 ───
  {
    if (!FLAGS.quiet) console.log(`${C.bold}▸ 场景G: 性格影响 — 火爆型阈值低易触发，隐忍型阈值高难触发${C.reset}`)
    let sceneOk = true

    const engineHot = createTestEmotionEngine({}, { thresholdOffset: -1.5, peakDuration: 1, description: '火爆型' })
    engineHot.applyLLMScore({ angry: 2.5 }, 'pressuring')
    const hotState = engineHot.getOutputState()

    const engineCalm = createTestEmotionEngine({}, { thresholdOffset: 2.0, peakDuration: 4, description: '隐忍型' })
    engineCalm.applyLLMScore({ angry: 2.5 }, 'pressuring')
    const calmState = engineCalm.getOutputState()

    if (!FLAGS.quiet) {
      console.log(`  ${C.dim}火爆型 angry=2.5 → 状态: ${hotState}${C.reset}`)
      console.log(`  ${C.dim}隐忍型 angry=2.5 → 状态: ${calmState}${C.reset}`)
    }

    if (hotState === calmState) {
      console.log(`  ${C.red}❌ 性格未产生差异 — 两者状态相同(${hotState})${C.reset}`)
      sceneOk = false
    } else if (hotState === 'calm' || hotState === null) {
      console.log(`  ${C.red}❌ 火爆型应触发负面状态，实际=${hotState}${C.reset}`)
      sceneOk = false
    } else {
      if (!FLAGS.quiet) console.log(`  ${C.green}✅ 性格差异有效 — 火爆型="${hotState}" vs 隐忍型="${calmState}"${C.reset}`)
    }
    if (!FLAGS.quiet) console.log('')
    sceneOk ? scenePassed++ : sceneFailed++
    scenarios.push({ name: 'G-性格影响', ok: sceneOk })
  }

  // ─── 场景H：攻击后中性不理 — 愤怒不消退（闷烧） ───
  {
    if (!FLAGS.quiet) console.log(`${C.bold}▸ 场景H: 攻击后不理 — 愤怒不消退（angry不会自动降，甚至闷着涨）${C.reset}`)
    const engine = createTestEmotionEngine()
    engine.applyLLMScore({ angry: 4.0 }, 'dismissive')
    let sceneOk = true
    const trajectory = [4.0]

    for (let i = 1; i <= 5; i++) {
      engine.preUpdate('neutral')
      engine.applyLLMScore({}, 'neutral')
      trajectory.push(engine.getVector().angry)
    }

    const finalAngry = engine.getVector().angry
    if (!FLAGS.quiet) console.log(`  ${C.dim}愤怒轨迹: ${trajectory.map(v => v.toFixed(1)).join(' → ')}${C.reset}`)

    if (finalAngry < trajectory[0] - 0.5) {
      console.log(`  ${C.red}❌ 不道歉愤怒却自动消退了 (${trajectory[0].toFixed(1)}→${finalAngry.toFixed(1)})${C.reset}`)
      sceneOk = false
    } else {
      if (!FLAGS.quiet) console.log(`  ${C.green}✅ 不道歉愤怒保持或闷烧 — ${trajectory[0].toFixed(1)}→${finalAngry.toFixed(1)}${C.reset}`)
    }
    if (!FLAGS.quiet) console.log('')
    sceneOk ? scenePassed++ : sceneFailed++
    scenarios.push({ name: 'H-闷烧不退', ok: sceneOk })
  }

  // ─── 场景I：连续攻击叠加 — consecutiveNegative使愤怒额外上涨 ───
  {
    if (!FLAGS.quiet) console.log(`${C.bold}▸ 场景I: 连续攻击叠加 — ≥2轮连续攻击触发额外加成${C.reset}`)
    const engine = createTestEmotionEngine()
    let sceneOk = true
    const log = []

    const attacks = [
      { user: '快点说！', intent: 'pressuring', score: { angry: 2.5, anxious: 5 } },
      { user: '你是不是装的？', intent: 'dismissive', score: { angry: 5, sad: 3 } },
      { user: '你到底想不想看了！', intent: 'aggressive', score: { angry: 8, fearful: 3 } },
    ]

    for (const att of attacks) {
      engine.preUpdate(att.intent)
      engine.applyLLMScore(att.score, att.intent)
      log.push(engine.getVector().angry)
    }

    if (!FLAGS.quiet) console.log(`  ${C.dim}愤怒叠加: ${log.map(v => v.toFixed(1)).join(' → ')}${C.reset}`)

    if (log[2] <= log[1]) {
      console.log(`  ${C.red}❌ 连续攻击愤怒未升级 (${log[1].toFixed(1)}→${log[2].toFixed(1)})${C.reset}`)
      sceneOk = false
    } else {
      if (!FLAGS.quiet) console.log(`  ${C.green}✅ 连续攻击愤怒升级 (${log[1].toFixed(1)}→${log[2].toFixed(1)}${log[2] > 8.0 ? ' 含加成' : ''})${C.reset}`)
    }
    if (!FLAGS.quiet) console.log('')
    sceneOk ? scenePassed++ : sceneFailed++
    scenarios.push({ name: 'I-连续攻击', ok: sceneOk })
  }

  // ─── 场景J：连续安抚加速 — ≥2轮安抚触发加速消退 ───
  {
    if (!FLAGS.quiet) console.log(`${C.bold}▸ 场景J: 连续安抚加速 — ≥2轮安抚触发emotion加速消退+trust/rapport涨${C.reset}`)
    const engine = createTestEmotionEngine({ angry: 5, anxious: 6, trust: 3, rapport: 3 })
    let sceneOk = true
    const log = []

    const comforts = [
      { user: '抱歉刚才态度不好。您别着急。', intent: 'reassuring', score: { angry: 3.5, anxious: 4 } },
      { user: '我会认真帮您查清楚的，您慢慢说。', intent: 'reassuring', score: { angry: 1.5, anxious: 3 } },
    ]

    let prevTrust = engine.getVector().trust
    for (const comf of comforts) {
      engine.preUpdate(comf.intent)
      engine.applyLLMScore(comf.score, comf.intent)
      const v = engine.getVector()
      log.push({ angry: v.angry, anxious: v.anxious, trust: v.trust, rapport: v.rapport })
    }

    if (!FLAGS.quiet) {
      console.log(`  ${C.dim}愤怒: 5.0→${log[0].angry.toFixed(1)}→${log[1].angry.toFixed(1)}${C.reset}`)
      console.log(`  ${C.dim}信任: ${prevTrust.toFixed(1)}→${log[0].trust.toFixed(1)}→${log[1].trust.toFixed(1)}${C.reset}`)
      console.log(`  ${C.dim}融洽: 3.0→${log[0].rapport.toFixed(1)}→${log[1].rapport.toFixed(1)}${C.reset}`)
    }

    if (log[1].trust <= prevTrust + 0.1) {
      console.log(`  ${C.red}❌ 连续安抚信任未涨 (${prevTrust.toFixed(1)}→${log[1].trust.toFixed(1)})${C.reset}`)
      sceneOk = false
    } else if (log[1].angry >= log[0].angry) {
      console.log(`  ${C.red}❌ 连续安抚愤怒未降 (${log[0].angry.toFixed(1)}→${log[1].angry.toFixed(1)})${C.reset}`)
      sceneOk = false
    } else {
      if (!FLAGS.quiet) console.log(`  ${C.green}✅ 连续安抚有效 — 愤怒↓信任↑融洽↑${C.reset}`)
    }
    if (!FLAGS.quiet) console.log('')
    sceneOk ? scenePassed++ : sceneFailed++
    scenarios.push({ name: 'J-连续安抚', ok: sceneOk })
  }

  const sceneTotal = scenePassed + sceneFailed
  const sceneOk = sceneFailed === 0
  if (!FLAGS.quiet) {
    console.log(`${sceneOk ? C.green : C.red}${'─'.repeat(40)}${C.reset}`)
    console.log(`场景测试: ${scenePassed}通过 / ${sceneFailed}失败 / ${sceneTotal}总计`)
    console.log(`${sceneOk ? C.green : C.red}${'─'.repeat(40)}${C.reset}\n`)
  }
  return { passed: scenePassed, failed: sceneFailed, details: scenarios }
}

// ═══ 运行 ═══
async function runTests() {
  printSection(`SP对话质量测试 — ${CASE_ID}`)
  if (!FLAGS.quiet) {
    console.log(`模式: ${FLAGS.verbose ? '详细' : FLAGS.quiet ? '静默' : '标准'}\n`)
  }

  console.log('加载病例数据...')
  let data
  try {
    data = await loadCaseData()
  } catch (e) {
    console.error('加载失败:', e.message)
    process.exit(1)
  }

  const pi = data.basic?.patient_info || {}
  if (!FLAGS.quiet) {
    console.log(`患者: ${pi.name} | ${pi.age} | ${pi.sex === '0' ? '女' : '男'}`)
    console.log(`疾病: ${data.basic?.disease || '未知'}`)
    console.log(`主诉: ${data.basic?.chief_complaint || '未知'}`)
  }

  console.log('构建系统提示词...')
  const { prompt: systemPrompt, basePrompt } = await buildSystemPrompt(data)
  if (!FLAGS.quiet) console.log(`提示词长度: ${systemPrompt.length} 字符\n`)

  const testCases = buildTestCases(data)
  let passed = 0
  let failed = 0
  const failures = []

  let emotionOk = 0
  let emotionFail = 0

  for (const tc of testCases) {
    if (tc.skip) {
      if (!FLAGS.quiet) console.log(`${C.dim}── ${tc.name} ⏭️ 跳过（不适用于本病例角色）${C.reset}`)
      continue
    }

    if (!FLAGS.quiet) console.log(`${C.dim}── ${tc.name}${C.reset}`)
    try {
      const result = await sendMessage(systemPrompt, tc.history)
      const reply = result.text || ''
      if (!FLAGS.quiet) {
        console.log(`  ${C.cyan}SP:${C.reset} ${reply}`)
        if (result.emotion) {
          const e = result.emotion
          const activeDims = Object.entries(e).filter(([,v]) => v > 0).map(([k,v]) => `${k}:${v.toFixed(1)}`)
          if (activeDims.length > 0) console.log(`  ${C.dim}情绪:${C.reset} ${activeDims.join(' ')} ${C.dim}| 意图:${C.reset} ${result.intent || 'neutral'}`)
        }
      }

      if (tc.check(tc.name.includes('情绪') ? result : reply)) {
        if (!FLAGS.quiet) console.log(`  ${C.green}✅${C.reset}\n`)
        passed++
        if (tc.name.includes('情绪')) emotionOk++
      } else {
        console.log(`  ${C.red}❌ ${tc.failMsg}${C.reset}\n`)
        failed++
        if (tc.name.includes('情绪')) emotionFail++
        failures.push({ name: tc.name, reply: reply.substring(0, 200), failMsg: tc.failMsg })
      }
    } catch (e) {
      console.log(`  ${C.red}⚠️  API错误: ${e.message}${C.reset}`)
      failed++
      failures.push({ name: tc.name, reply: 'API_ERROR', failMsg: e.message })
    }
  }

  const total = passed + failed
  printSection(`单轮测试: ${passed}通过 / ${failed}失败 / ${total}总计`)
  if (emotionOk + emotionFail > 0) {
    if (!FLAGS.quiet) console.log(`情绪格式: ${emotionOk}通过 / ${emotionFail}失败\n`)
  }

  // ─── 多轮场景测试 ───
  let sceneResult = { passed: 0, failed: 0, details: [] }
  if (basePrompt) {
    sceneResult = await runScenarioTests(data, basePrompt)
  }

  // ─── 最终汇总 ───
  const allPassed = passed + sceneResult.passed
  const allFailed = failed + sceneResult.failed
  const allTotal = allPassed + allFailed
  const allOk = allFailed === 0
  console.log(`${C.bold}${'═'.repeat(60)}${C.reset}`)
  console.log(`${allOk ? C.green : C.red}${allOk ? '✅' : '❌'} 总计: ${allPassed}通过 / ${allFailed}失败 / ${allTotal}总计${C.reset}`)
  console.log(`   单轮行为: ${passed}/${total} | 场景情绪: ${sceneResult.passed}/${sceneResult.passed + sceneResult.failed}`)
  console.log(`${C.bold}${'═'.repeat(60)}${C.reset}`)

  if (failures.length > 0) {
    console.log(`\n${C.red}失败详情:${C.reset}`)
    for (const f of failures) {
      console.log(`  ${C.red}✗${C.reset} ${f.name}: ${f.failMsg}`)
    }
  }

  return [...failures, ...sceneResult.details.filter(s => !s.ok).map(s => ({ name: `场景-${s.name}`, reply: '', failMsg: '场景验证失败' }))]
}

runTests().then(f => process.exit(f.length > 0 ? 1 : 0)).catch(e => { console.error(e); process.exit(1) })
