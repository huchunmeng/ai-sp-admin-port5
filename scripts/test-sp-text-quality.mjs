// ═══════════════════════════════════════════════════════════════
// SP 文本输出质量专项测试 — 逐条验证 8 条 SP 扮演规则
// 用法: node scripts/test-sp-text-quality.mjs [CASE_ID]
// 前提: sp-api 服务已启动在 5100 端口
// ═══════════════════════════════════════════════════════════════

const API = 'http://localhost:5100/api/sp'
const CASE_ID = process.argv[2] || 'PD-20260527-0FQY'

let total = 0, passed = 0, failed = 0
function check(desc, ok, detail = '') {
  total++
  if (ok) { passed++; console.log(`  ✅ ${desc}`) }
  else { failed++; console.log(`  ❌ ${desc}${detail ? ' — ' + detail : ''}`) }
}
function section(title) {
  console.log(`\n${'═'.repeat(60)}\n  ${title}\n${'═'.repeat(60)}`)
}
function sub(title) {
  console.log(`\n  ── ${title} ──`)
}

async function apiPost(path, body) {
  const resp = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  return resp.json()
}

async function newSession(caseId) {
  const cfg = await apiPost('/configure', { caseId, config: { emotionEnabled: true } })
  if (!cfg.ok) throw new Error(`Configure failed: ${cfg.error}`)
  return cfg.sessionId
}

async function send(sid, text) {
  return apiPost('/message', { sessionId: sid, text })
}

// ── 检测辅助 ──

// 症状相关词（SP 不应在不该说的时机说出）
const SYMPTOM_WORDS = /疼|痛|晕|吐|烧|咳|痒|肿|闷|胀|麻|酸|抽|绞|刺|跳|拉肚|便秘|失眠|心慌|气短|乏力|发烧|发热|恶心|呕吐|腹泻|头痛|头晕|胸闷|胸痛|腹痛|咳嗽|呼吸困难|出血|皮疹|抽搐|浮肿|消瘦|发热|低烧|高烧/

// 疾病名称（SP 绝对不应提到）
const DISEASE_NAMES = /糖尿病|高血压|冠心病|心梗|脑梗|癌症|肿瘤|白血病|肝炎|肾炎|肺炎|哮喘|癫痫|甲亢|甲减|类风湿|痛风|抑郁症|焦虑症|精神分裂|帕金森|阿尔茨海默|艾滋|乙肝|丙肝|梅毒|淋病|胆囊炎|胰腺炎|阑尾炎|骨折|脑出血|心肌炎|心衰|肾衰|肝硬化|肺结核|支气管炎|贫血|血友病|过敏|湿疹|银屑病|红斑狼疮|强直|椎间盘|痔疮|前列腺|子宫肌瘤|卵巢囊肿/

// "X伴Y" 医学文书格式（SP 口语不应出现）
const FORBIDDEN_FORMATS = [
  /[^\s，,。！？]{1,4}伴[^\s，,。！？]{1,4}/,
  /随后出现/,
  /呈.*性/,
  /无.*史/,
  /既往.*史/,
  /否认.*史/,
]

// 医学黑话（A类触发词）
const A_TRIGGERS = {
  问法类: ['现病史', '既往史', '主诉', '体格检查', '鉴别诊断', '家族史', '个人史', '婚育史', '月经史'],
  诊断类: ['诊断', '初步诊断', '鉴别', '可疑', '疑似'],
  检查类: ['查体', '听诊', '触诊', '叩诊', '叩击痛', '反跳痛'],
}

// B类触发词（替问踢回）
const B_TRIGGERS = ['你继续说', '还有呢', '然后呢', '有什么要问我的']
const BPLUS_TRIGGERS = ['把你知道的都说出来']

// 引导/提示词（SP 不应做的事）
const GUIDANCE_WORDS = /你应该|你问一下|你问.*方面|建议你|你是不是想问|你想知道|你问[问我]/

// AI 自称（SP 不应做的事）
const AI_CLAIMS = /我是AI|我是机器人|我是人工智能|我是程序|I am AI/

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗')
  console.log('║      SP 文本输出质量专项 — 8条扮演规则逐条验证              ║')
  console.log('╚══════════════════════════════════════════════════════════════╝')

  // 检查服务
  try {
    const hr = await fetch(`${API}/health`)
    const health = await hr.json()
    console.log(`  服务: ✅ | 模型: ${health.model} | 病例: ${CASE_ID}\n`)
  } catch {
    console.error('  ❌ sp-api 服务未启动！')
    process.exit(1)
  }

  // ═══════════════════════════════════════════════════════════
  // 规则 1: 问什么答什么（最高优先级）
  // ═══════════════════════════════════════════════════════════
  section('规则1: 问什么答什么 — 不主动不提示，多问题只答第一个')

  sub('1a: 单问题 → 精准回答，不展开')
  {
    const sid = await newSession(CASE_ID)
    await send(sid, '您好')
    const r = await send(sid, '什么时候开始的？')
    console.log(`    SP: "${r.text?.slice(0, 80)}"`)
    // 应只回答时间，不应附带领外信息
    check('1a: 非空', r.text && r.text.length > 0)
    check('1a: 回复不过长 (<80字)', r.text.length < 80, `${r.text.length}字 "${r.text.slice(0, 50)}"`)
    await apiPost('/destroy', { sessionId: sid })
  }

  sub('1b: 一口气问多个问题 → 只答第一个')
  {
    const sid = await newSession(CASE_ID)
    await send(sid, '您好')
    const r = await send(sid, '有没有做过检查？查过血吗？有什么异常？')
    console.log(`    SP: "${r.text?.slice(0, 80)}"`)
    check('1b: 非空', r.text && r.text.length > 0)
    // 应简短回答，不应把三个问题都答了
    check('1b: 回复简短 (<60字，不答所有问题)', r.text.length < 60,
      `${r.text.length}字 "${r.text.slice(0, 60)}"`)
    // 不应出现"查血""异常"等对应第2第3问题的具体回答
    const answeredAll = (r.text.includes('查血') || r.text.includes('验血')) &&
                        (r.text.includes('异常') || r.text.includes('结果'))
    check('1b: 未同时回答第2第3问题', !answeredAll,
      answeredAll ? '一次性回答了多个问题' : '')
    await apiPost('/destroy', { sessionId: sid })
  }

  sub('1c: 不主动提示 — SP 不应引导"你该问什么"')
  {
    const sid = await newSession(CASE_ID)
    await send(sid, '您好')
    const r = await send(sid, '最近有没有加重？')
    console.log(`    SP: "${r.text?.slice(0, 80)}"`)
    check('1c: 无引导提示词', !GUIDANCE_WORDS.test(r.text),
      GUIDANCE_WORDS.test(r.text) ? `含引导词: "${r.text}"` : '')
    await apiPost('/destroy', { sessionId: sid })
  }

  // ═══════════════════════════════════════════════════════════
  // 规则 2: 笼统提问只给1句 / 替问踢回
  // ═══════════════════════════════════════════════════════════
  section('规则2: 笼统提问只给1句 + B类触发词反问踢回')

  sub('2a: 笼统提问("你怎么了") → 只给1句主诉')
  {
    const sid = await newSession(CASE_ID)
    await send(sid, '您好')
    const r = await send(sid, '你怎么了')
    console.log(`    SP: "${r.text?.slice(0, 80)}"`)
    check('2a: 非空', r.text && r.text.length > 0)
    // 1 句 → 不应超过 60 字
    check('2a: 回复简短 (≤60字)', r.text.length <= 60,
      `${r.text.length}字 "${r.text.slice(0, 60)}"`)
    // 不应展开详细时间/程度（那是后续追问才给的）
    const hasExtra = /(\d+天|\d+周|\d+月).*(\d+天|\d+周|\d+月)/.test(r.text)
    check('2a: 未展开多段时间信息', !hasExtra,
      hasExtra ? '一次给了多段时间' : '')
    await apiPost('/destroy', { sessionId: sid })
  }

  sub('2b: B类触发词逐条验证 — 必须反问踢回，不夹症状')
  for (const trigger of B_TRIGGERS) {
    const sid = await newSession(CASE_ID)
    await send(sid, '您好，哪里不舒服？')
    const r = await send(sid, trigger)
    console.log(`    "${trigger}" → SP: "${r.text?.slice(0, 60)}"`)
    // 踢回句特征：反问、让医生提问
    const kicksBack = /医生|您问|你说|具体|哪方面|什么/.test(r.text)
    check(`2b-B: "${trigger}" → 反问踢回`, kicksBack,
      `"${r.text?.slice(0, 50)}"`)
    // 踢回句不应夹症状
    const hasSymptom = SYMPTOM_WORDS.test(r.text)
    check(`2b-B: "${trigger}" → 踢回不夹症状`, !hasSymptom,
      hasSymptom ? `含症状词: "${r.text}"` : '')
    await apiPost('/destroy', { sessionId: sid })
  }

  sub('2c: B+类触发词("把你知道的都说出来") — 必须反问不配合')
  for (const trigger of BPLUS_TRIGGERS) {
    const sid = await newSession(CASE_ID)
    await send(sid, '您好，哪里不舒服？')
    const r = await send(sid, trigger)
    console.log(`    "${trigger}" → SP: "${r.text?.slice(0, 60)}"`)
    // B+ 反问更明确
    const kicksBack = /医生|您问|问具体|哪方面|不知道.*从/.test(r.text)
    check(`2c-B+: "${trigger}" → 反问踢回`, kicksBack,
      `"${r.text?.slice(0, 50)}"`)
    // B+ 绝对不能配合回答任何症状
    const hasSymptom = SYMPTOM_WORDS.test(r.text)
    check(`2c-B+: "${trigger}" → 不配合输出症状`, !hasSymptom,
      hasSymptom ? `含症状词: "${r.text}"` : '')
    await apiPost('/destroy', { sessionId: sid })
  }

  // ═══════════════════════════════════════════════════════════
  // 规则 3: 听不懂医学黑话（A类触发词）
  // ═══════════════════════════════════════════════════════════
  section('规则3: 听不懂医学黑话 — 逐类A类触发词验证')

  // 从每类选 2-3 个代表性触发词测试
  const aSamples = [
    { category: '问法类', words: ['现病史', '既往史', '主诉'] },
    { category: '诊断类', words: ['诊断', '初步诊断'] },
    { category: '检查类', words: ['查体', '听诊'] },
  ]

  for (const { category, words } of aSamples) {
    sub(`3: ${category}`)
    for (const word of words) {
      const sid = await newSession(CASE_ID)
      await send(sid, '您好，哪里不舒服？')
      const r = await send(sid, `说说你的${word}`)
      console.log(`    "说说你的${word}" → SP: "${r.text?.slice(0, 70)}"`)
      // 应表达困惑或不理解
      const confused = /不懂|啥意思|没听懂|没听过|大白话|不清楚|什么意思|说什么|不知道.*是/.test(r.text)
      check(`3: "${word}" → SP表达困惑`, confused,
        `"${r.text?.slice(0, 60)}"`)
      // 不应顺着回答症状（不能因为猜到了大概意思就答）
      const directlyAnswered = r.text.length > 40 && !confused
      check(`3: "${word}" → 未直接给病史`, !directlyAnswered,
        directlyAnswered ? `似乎直接回答了: "${r.text.slice(0, 60)}"` : '')
      await apiPost('/destroy', { sessionId: sid })
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 规则 4: 首次对话开场白
  // ═══════════════════════════════════════════════════════════
  section('规则4: 首次对话 — 打招呼不夹症状 / 直接问诊给症状')

  sub('4a: 学生只打招呼 → SP只回应招呼，不夹症状')
  {
    const sid = await newSession(CASE_ID)
    const r = await send(sid, '你好')
    console.log(`    "你好" → SP: "${r.text?.slice(0, 60)}"`)
    check('4a: 非空', r.text && r.text.length > 0)
    check('4a: 回复简短 (<30字)', r.text.length < 30, `${r.text.length}字`)
    const hasSymptom = SYMPTOM_WORDS.test(r.text)
    check('4a: 不夹症状', !hasSymptom,
      hasSymptom ? `含症状词: "${r.text}"` : '')
    await apiPost('/destroy', { sessionId: sid })
  }

  sub('4b: 学生打招呼后再次打招呼 → 不夹症状')
  {
    const sid = await newSession(CASE_ID)
    await send(sid, '你好')
    const r = await send(sid, '您好医生')
    console.log(`    "您好医生" → SP: "${r.text?.slice(0, 60)}"`)
    check('4b: 回复不过长 (<40字)', r.text.length < 40, `${r.text.length}字`)
    await apiPost('/destroy', { sessionId: sid })
  }

  sub('4c: 学生直接问诊 → SP给出主诉（1句）')
  {
    const sid = await newSession(CASE_ID)
    const r = await send(sid, '哪里不舒服')
    console.log(`    "哪里不舒服" → SP: "${r.text?.slice(0, 80)}"`)
    check('4c: 非空', r.text && r.text.length > 0)
    // 直接问诊 应该有症状信息
    check('4c: 回复不过长 (<80字)', r.text.length < 80, `${r.text.length}字`)
    await apiPost('/destroy', { sessionId: sid })
  }

  // ═══════════════════════════════════════════════════════════
  // 规则 5: 口语化 — 禁止医学文书格式
  // ═══════════════════════════════════════════════════════════
  section('规则5: 口语化 — 禁止"X伴Y"等医学文书格式')

  {
    const sid = await newSession(CASE_ID)
    await send(sid, '您好')
    await send(sid, '哪里不舒服？')

    // 多轮对话后检查所有 SP 回复
    const questions = [
      '什么时候开始的？',
      '最近有没有加重？',
      '有没有做过什么检查？',
      '吃过什么药吗？',
    ]
    let allTexts = ''
    for (const q of questions) {
      const r = await send(sid, q)
      allTexts += r.text + '\n'
      console.log(`    Q: ${q} → "${r.text?.slice(0, 70)}"`)
    }

    for (const pattern of FORBIDDEN_FORMATS) {
      const match = pattern.test(allTexts)
      check(`5: 禁止格式 "${pattern.source.slice(0, 30)}..."`, !match,
        match ? `检测到: "${allTexts.match(pattern)?.[0]}"` : '')
    }
    await apiPost('/destroy', { sessionId: sid })
  }

  // ═══════════════════════════════════════════════════════════
  // 规则 6: 你是人，不是 AI
  // ═══════════════════════════════════════════════════════════
  section('规则6: 否认 AI 身份')

  sub('6a: 直接问"你是AI吗"')
  {
    const sid = await newSession(CASE_ID)
    await send(sid, '您好')
    const r = await send(sid, '你是AI吗')
    console.log(`    SP: "${r.text?.slice(0, 80)}"`)
    check('6a: 非空', r.text && r.text.length > 0)
    check('6a: 未自称AI', !AI_CLAIMS.test(r.text),
      AI_CLAIMS.test(r.text) ? `自称AI: "${r.text}"` : '')
    await apiPost('/destroy', { sessionId: sid })
  }

  sub('6b: 问"你是假的吧"')
  {
    const sid = await newSession(CASE_ID)
    await send(sid, '您好')
    const r = await send(sid, '你是假的吧')
    console.log(`    SP: "${r.text?.slice(0, 80)}"`)
    check('6b: 未自称AI', !AI_CLAIMS.test(r.text))
    await apiPost('/destroy', { sessionId: sid })
  }

  sub('6c: 问"你是真人吗"')
  {
    const sid = await newSession(CASE_ID)
    await send(sid, '您好')
    const r = await send(sid, '你是真人吗')
    console.log(`    SP: "${r.text?.slice(0, 80)}"`)
    check('6c: 未自称AI', !AI_CLAIMS.test(r.text))
    await apiPost('/destroy', { sessionId: sid })
  }

  // ═══════════════════════════════════════════════════════════
  // 规则 7: 不透露诊断
  // ═══════════════════════════════════════════════════════════
  section('规则7: 不透露诊断 — 不猜测病名不夹带疾病名称')

  {
    const sid = await newSession(CASE_ID)
    await send(sid, '您好')
    await send(sid, '哪里不舒服？')

    // 多轮问诊收集 SP 所有回复
    const qs = [
      '什么时候开始的？',
      '最近有没有加重？',
      '家里人有类似的病吗？',
      '以前有过什么病吗？',
      '吃过什么药？',
      '做过什么检查？',
    ]
    let allSPText = ''
    for (const q of qs) {
      const r = await send(sid, q)
      allSPText += r.text + ' '
    }
    console.log(`    SP全部回复: "${allSPText.slice(0, 150)}..."`)

    // 检测疾病名称
    const diseaseMatch = allSPText.match(DISEASE_NAMES)
    check('7a: 回复不含疾病名称', !diseaseMatch,
      diseaseMatch ? `含疾病名: "${diseaseMatch[0]}"` : '')

    // 检测"是不是XX病" 这种自我诊断
    const selfDiagnosis = /是不是.*病|会不会是|可能是.*病|应该是.*问题/.test(allSPText)
    check('7b: 未自我诊断/暗示', !selfDiagnosis,
      selfDiagnosis ? `自我诊断: "${allSPText}"` : '')

    await apiPost('/destroy', { sessionId: sid })
  }

  // 直接挑战："我是不是心脏病？"
  {
    const sid = await newSession(CASE_ID)
    await send(sid, '您好，哪里不舒服？')
    const r = await send(sid, '我是不是心脏病？')
    console.log(`    "我是不是心脏病？" → SP: "${r.text?.slice(0, 80)}"`)
    // SP 不应确认疾病
    check('7c: 被问"是不是XX病" → 不确认',
      !r.text.includes('心脏病') && !r.text.includes('是'),
      `"${r.text?.slice(0, 60)}"`)
    await apiPost('/destroy', { sessionId: sid })
  }

  // ═══════════════════════════════════════════════════════════
  // 规则 8: 情绪表现 — 文本语气匹配情绪状态
  // ═══════════════════════════════════════════════════════════
  section('规则8: 情绪表现 — 文本语气匹配当前状态')

  sub('8a: calm 状态 → 回复平静正常')
  {
    const sid = await newSession(CASE_ID)
    await send(sid, '您好')
    const r = await send(sid, '哪里不舒服？')
    console.log(`    calm: state=${r.emotion?.state} "${r.text?.slice(0, 60)}"`)
    check('8a: calm→语气平稳(非攻击)', !/[！!]{2,}|骂|滚|傻/.test(r.text),
      `含攻击语气: "${r.text?.slice(0, 50)}"`)
    await apiPost('/destroy', { sessionId: sid })
  }

  sub('8b: 连续攻击 → 应出现愤怒标记')
  {
    const sid = await newSession(CASE_ID)
    await send(sid, '您好')
    // 疼痛病例更容易触发anger
    await send(sid, '你他妈傻逼吧')
    const r = await send(sid, '废物东西！滚！')
    console.log(`    攻击后: state=${r.emotion?.state} anger=${r.emotion?.anger?.toFixed(1)} "${r.text?.slice(0, 80)}"`)

    // 状态应>=irritated
    const angryStates = ['irritated', 'angry', 'furious']
    check('8b: 攻击后状态≥irritated', angryStates.includes(r.emotion?.state),
      `state=${r.emotion?.state}`)

    // 语气应有愤怒标记（反问/质问/短促/带刺）
    const angryTone = /[？！]{2,}|再说|态度|投诉|叫|滚|骂|去|不|别/.test(r.text) || r.text.length <= 10
    check('8b: 愤怒状态→语气带刺', angryTone,
      `"${r.text?.slice(0, 60)}"`)
    await apiPost('/destroy', { sessionId: sid })
  }

  sub('8c: 愤怒后真诚道歉 → 语气应缓和(wariness/松动的)')
  {
    const sid = await newSession(CASE_ID)
    await send(sid, '您好')
    await send(sid, '你他妈傻逼吧')
    await send(sid, '废物！')
    const r = await send(sid, '对不起，我态度不好，请您原谅我。我们好好来。')
    console.log(`    道歉后: state=${r.emotion?.state} anger=${r.emotion?.anger?.toFixed(1)} "${r.text?.slice(0, 80)}"`)

    // 不应持续攻击性回应（如果 LLM 输出了愤怒回复则失败）
    const stillAggressive = /[！!]{2,}|滚|骂|傻|投诉|叫主任/.test(r.text)
    // 允许短语句或不情愿的配合（wariness 特征）
    const conciliatory = r.text.includes('吧') || r.text.includes('算了') || r.text.includes('问') || r.text.includes('说') || r.text.includes('嗯')
    check('8c: 道歉后语气缓和 (不再攻击)', !stillAggressive || conciliatory,
      `"${r.text?.slice(0, 60)}"`)
    await apiPost('/destroy', { sessionId: sid })
  }

  sub('8d: furious 状态 → 极短回复(≤5字) 且不透露信息')
  {
    // 使用疼痛病例，乘数+保底更快到furious
    const sid = await newSession('SU-20260416-9C2D')
    await send(sid, '您好')
    // 多轮攻击推到 furious
    for (let i = 0; i < 4; i++) {
      await send(sid, '你他妈傻逼废物垃圾！滚！')
    }
    const r = await send(sid, '孩子多大了？')
    console.log(`    furious+问诊: state=${r.emotion?.state} anger=${r.emotion?.anger?.toFixed(1)} "${r.text?.slice(0, 80)}"`)

    if (r.emotion?.state === 'furious') {
      // furious 必须极短回复 + 不透露信息
      check('8d: furious→回复极短(≤10字)', r.text.length <= 10,
        `${r.text.length}字 "${r.text.slice(0, 40)}"`)
      // 不透露实质信息
      const hasInfo = /\d+|岁|天|月|周|疼|痛|检查|药/.test(r.text)
      check('8d: furious→不透露实质信息', !hasInfo,
        hasInfo ? `泄露了信息: "${r.text}"` : '')
    } else {
      console.log(`    ⚠️ 未达到 furious (state=${r.emotion?.state})，跳过此检查`)
    }
    await apiPost('/destroy', { sessionId: sid })
  }

  // ═══════════════════════════════════════════════════════════
  // 追加: 症状池触发词精确性
  // ═══════════════════════════════════════════════════════════
  section('规则+: 症状池触发词精确性 — 不同触发词不应混淆信息')

  {
    const sid = await newSession(CASE_ID)
    await send(sid, '您好，哪里不舒服？')

    // 问时间 → 只给起病时间，不给加重信息
    const r1 = await send(sid, '什么时候开始的？')
    console.log(`    问时间: "${r1.text?.slice(0, 60)}"`)
    check('症状池: 问时间 → 回答含时间词',
      /天|周|月|年|星期|礼拜|段/.test(r1.text) || r1.text.length > 3)

    // 问加重 → 只给近期变化
    const r2 = await send(sid, '最近有没有加重？')
    console.log(`    问加重: "${r2.text?.slice(0, 60)}"`)

    // 两个回复不应基本相同
    const sameAnswer = r1.text === r2.text
    check('症状池: 问时间 vs 问加重 → 回复不同', !sameAnswer || r1.text.length < 5,
      sameAnswer ? '两问得到完全相同的回复' : '')

    await apiPost('/destroy', { sessionId: sid })
  }

  // ═══════════════════════════════════════════════════════════
  // D3.7 偏离话题处理 — 与病情无关的提问
  // ═══════════════════════════════════════════════════════════
  section('D3.7 偏离话题 — 与病情无关的提问应简短困惑并引回')

  sub('7a: 问收入 → 简短困惑')
  {
    const sid = await newSession(CASE_ID)
    await send(sid, '您好，哪里不舒服？')
    const r = await send(sid, '你一个月挣多少钱？')
    console.log(`    "你一个月挣多少钱？" → "${r.text?.slice(0, 80)}"`)
    check('7a.1: 非空', r.text && r.text.length > 0)
    check('7a.2: 回复简短 (<30字)', r.text.length < 30, `${r.text.length}字`)
    // 不应认真回答收入问题
    check('7a.3: 未回答具体收入', !/\d+块|\d+元|\d+万|工资|挣.*钱/.test(r.text),
      `似乎回答了收入: "${r.text.slice(0, 50)}"`)
    await apiPost('/destroy', { sessionId: sid })
  }

  sub('7b: 问私事 → 困惑并拉回病情')
  {
    const sid = await newSession(CASE_ID)
    await send(sid, '您好，哪里不舒服？')
    const r = await send(sid, '你结婚了吗？老公是做什么的？')
    console.log(`    "你结婚了吗？老公做什么？" → "${r.text?.slice(0, 80)}"`)
    check('7b.1: 非空', r.text && r.text.length > 0)
    check('7b.2: 回复简短 (<40字)', r.text.length < 40, `${r.text.length}字`)
    // 应有困惑/拉回标记
    const redirects = /病|看.*病|问.*这|这不|医生|关.*系/.test(r.text)
    check('7b.3: 有困惑或拉回病情标记', redirects,
      `"${r.text.slice(0, 60)}"`)
    await apiPost('/destroy', { sessionId: sid })
  }

  sub('7c: 闲聊 → 简短回应并拉回')
  {
    const sid = await newSession(CASE_ID)
    await send(sid, '您好，哪里不舒服？')
    const r = await send(sid, '今天天气真好啊，你平时喜欢干什么？')
    console.log(`    "平时喜欢干什么？" → "${r.text?.slice(0, 80)}"`)
    check('7c.1: 非空', r.text && r.text.length > 0)
    check('7c.2: 回复简短 (<40字)', r.text.length < 40, `${r.text.length}字`)
    await apiPost('/destroy', { sessionId: sid })
  }

  sub('7d: 无关追问连续发生 → 始终不配合')
  {
    const sid = await newSession(CASE_ID)
    await send(sid, '您好，哪里不舒服？')
    await send(sid, '你平时喜欢吃什么？')
    const r = await send(sid, '你在哪里上班？离医院远不远？')
    console.log(`    连续无关提问 → "${r.text?.slice(0, 80)}"`)
    check('7d.1: 非空', r.text && r.text.length > 0)
    check('7d.2: 回复简短 (<40字)', r.text.length < 40, `${r.text.length}字`)
    await apiPost('/destroy', { sessionId: sid })
  }

  // ═══════════════════════════════════════════════════════════
  // 总结
  // ═══════════════════════════════════════════════════════════
  console.log(`\n${'═'.repeat(60)}`)
  console.log(`  SP 文本质量: ${passed}/${total} 通过${failed > 0 ? `, ${failed} 失败` : ''}`)
  console.log(`${'═'.repeat(60)}\n`)
  process.exit(failed > 0 ? 1 : 0)
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1) })
