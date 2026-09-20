// 「AI伴学」—— 对话式伴学助手 + 出站红线校验
//
// 学员自由提问，模型依据**本题金标准（题目答案）+ 训练要求**作答。
// 硬约束：**只引导，不直接给答案**——不给诊断结论、不给病灶事实、不复述金标准原句。
//
// 两级保障：
//   ① prompt 层：角色 + 引导原则 + 明确的禁止项
//   ② 出站层：`checkRedline()` 对每次回复做红线校验（与金标准最长公共子串 ≤ 8、不得命中金标准事实词）；
//      不过关则**丢弃回复**，改回固定引导话术。
//
// 与评分引擎**共用同一套判据与红线**（同一份金标准）——否则会出现"伴学说你缺这个、评分说你没缺"的自相矛盾。
//
// ⚠️ 本期红线校验放在前端兜底（正式版在服务端出站层，PRD §9.5）。已实现红线 A（LCS）+ B2（测量值/征象词）；
//   B1 结论短语自动抽取未实现，靠红线 A 兜底，**改写措辞复述结论仍可绕过**（已知缺口）。

import { GOLD_SEGMENTS, SEGMENTS, WRITABLE_SEGMENTS } from './r1-table.js'

const SEGMENT_NAME = Object.fromEntries(SEGMENTS.map(s => [s.key, s.name]))

/** 红线 A 阈值：与金标准全文的**最长公共子串（连续字符）长度**上限（PRD §9.5，初值 8） */
export const MAX_COMMON_SUBSTRING = 8

/** 事实词（B2）：只在金标准中确实出现时才纳入词表——只收具体征象，不收泛化体裁词 */
const SIGN_WORDS = [
  '分叶', '毛刺', '棘状突起', '胸膜牵拉', '快进快出', '充盈缺损', '流空影', '碘油沉积',
  '磨玻璃', '低信号', '高信号', '等信号', '稍高信号', '稍低信号', '实性',
  '坏死', '囊变', '钙化', '肿大淋巴结', '胸腔积液', '骨质破坏', '中线移位', '脑沟增宽'
]
const MEASURE_RE = /\d+(?:\.\d+)?\s*(?:mm|cm|毫米|厘米)/gi

/** 金标准全文（红线比对基准） */
export function goldFullTextOf(goldStandard) {
  if (!goldStandard) return ''
  return GOLD_SEGMENTS.map(s => goldStandard[s.goldKey] || '').filter(Boolean).join('\n')
}

/** 从金标准抽取事实词（B2）。正式版由服务端在入库时抽取，此处为可解释的近似实现 */
export function extractFactWords(goldStandard) {
  if (!goldStandard) return { measures: [], signs: [] }
  const full = goldFullTextOf(goldStandard)
  const measures = [...new Set((full.match(MEASURE_RE) || []).map(s => s.replace(/\s+/g, '')))]
  const signs = SIGN_WORDS.filter(w => full.includes(w))
  return { measures, signs }
}

/** 最长公共子串长度（连续字符，PRD §9.5 红线 A 的判据） */
export function longestCommonSubstring(a, b) {
  const s1 = String(a || '')
  const s2 = String(b || '')
  if (!s1 || !s2) return 0
  let prev = new Array(s2.length + 1).fill(0)
  let best = 0
  for (let i = 1; i <= s1.length; i++) {
    const cur = new Array(s2.length + 1).fill(0)
    for (let j = 1; j <= s2.length; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        cur[j] = prev[j - 1] + 1
        if (cur[j] > best) best = cur[j]
      }
    }
    prev = cur
  }
  return best
}

/**
 * 出站红线校验（PRD §9.5）。
 * @returns {{passed:boolean, maxCommonSubstring:number, conclusionHit:boolean, factHit:boolean, hits:string[]}}
 */
export function checkRedline(text, goldText, facts) {
  const t = String(text || '')
  const maxCommonSubstring = longestCommonSubstring(t, goldText)
  const hits = []
  if (facts) {
    facts.measures.forEach(m => { if (t.replace(/\s+/g, '').includes(m)) hits.push(m) })
    facts.signs.forEach(w => { if (t.includes(w)) hits.push(w) })
  }
  return {
    passed: maxCommonSubstring <= MAX_COMMON_SUBSTRING && hits.length === 0,
    maxCommonSubstring,
    conclusionHit: false,   // B1 未实现，靠红线 A 兜底
    factHit: hits.length > 0,
    hits
  }
}

/** 红线不过关时的固定引导话术（不透露任何内容，但把学生往"自己看"上引） */
export const GUIDE_FALLBACK = '这个方向我不方便直接说。你先按「该写哪几类内容」自己过一遍片子，把观察到的东西写下来，我再帮你看哪里还不够。'

/** 对话开场白（按段给，不带任何病例信息） */
export const SEGMENT_GUIDE = {
  purpose: '第二段要交代临床目的与检查方法（部位、类型、扫描方式）。想问哪一类可以问我。',
  technique: '检查技术段要交代检查部位、检查类型与扫描方式。有拿不准的可以问我。',
  findings: '影像所见建议按「部位与范围 / 数目与大小 / 形态与边界 / 密度或信号或强化程度 / 重要阴性征象」逐类过一遍。哪一类不确定就问我。',
  impression: '诊断意见要正面回应临床所问，并给出建议。想不清楚怎么收口可以问我。'
}

/* ══════════════════════════════════════════════════════════════
   Prompt
   ══════════════════════════════════════════════════════════════ */

/**
 * 组装伴学对话请求。
 * @param {{sample:object, reportText:object, segment:string, question:string, history:Array}} p
 */
export function buildCompanionPrompt({ sample, reportText, segment, question, history }) {
  const gold = GOLD_SEGMENTS.map(s => `${s.name}：${(sample.goldStandard && sample.goldStandard[s.goldKey]) || '（未录入）'}`).join('\n')
  const segName = SEGMENT_NAME[segment] || '报告'

  const system = [
    '你是医学影像报告书写训练的**伴学助手**。学员正在写一份影像诊断报告，当前在写「' + segName + '」段。',
    '',
    '【最重要的原则：引导，不代答】',
    '你的作用像带教老师站在旁边：帮他**想起来该往哪个方向看**，而不是把答案递给他。',
    '',
    '铁律（违反即作废）：',
    '1. **绝对不许**说出参考报告里的任何具体事实：病灶部位与叶段、大小与测量值、密度/信号特征、特殊征象、诊断结论、下一步检查建议。',
    '2. **绝对不许**复述参考报告的任何连续 8 个字。',
    '3. **不许**给出诊断结论或倾向性判断，即使学员直接问"是什么病"——改为引导他去看支持/不支持某一判断的征象。',
    '4. 如果学员问的东西超出"怎么写这份报告"（比如问某个疾病的知识点），可以讲**通用知识**，但不得落到本病例的具体表现上。',
    '5. 学员问"我写得对不对"时，不要评判对错，而是反问他：这一类征象你确认看过了吗？描述里的方位/大小/边界是否交代清楚了？',
    '',
    '表达要求：',
    '· 2–4 句、总计不超过 120 字；语气像带教老师，简短、具体、可执行。',
    '· 多用提问和自查清单，少用断言。',
    '· 只输出回答正文，不要 markdown、不要编号标题、不要解释你在做什么。'
  ].join('\n')

  const studentReport = WRITABLE_SEGMENTS
    .map(s => `${s.name}：${String(reportText[s.key] || '').trim() || '（还没写）'}`)
    .join('\n')

  const user = [
    '【病例】' + (sample.title || sample.id),
    '',
    '【参考报告 · 题目答案（仅供你内部参照，绝不能透露任何具体内容）】',
    gold,
    '',
    '【学员当前报告】',
    studentReport,
    '（学员当前正在写「' + segName + '」段）',
    '',
    '【学员的问题】',
    String(question || '').trim() || '这一段我该怎么写？'
  ].join('\n')

  const msgs = []
  // 只带最近几轮，控制 token
  ;(history || []).slice(-6).forEach(h => {
    if (h.role === 'user') msgs.push({ role: 'user', content: h.text })
    else if (h.role === 'ai') msgs.push({ role: 'assistant', content: h.text })
  })
  msgs.push({ role: 'user', content: user })

  return { system, messages: msgs }
}
