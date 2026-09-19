// 「AI伴学」提示源 —— 大模型读**题目答案（金标准报告）**后给出少量提示 + 出站红线校验
//
// 依据：PRD §5.7（提示引擎）· §9.5（红线的工程可校验定义）· §5.2.3（三级阶梯与配额）。
// 评审批注（2026-09-19）：「改为AI伴学，这里其实是大模型根据题目答案（真实判读结果）给出少量提示信息」。
//
// 三级阶梯的责任划分（本文件只做 L1 与 prompt；L2/L3 由模型产出）：
//   L1 体裁提示 —— 这一段**规范上**应包含哪些要素，完全不涉及本病例
//                  → **静态库**（确定性、零成本、零泄漏风险），不需要模型，也不需要金标准
//   L2 指向提示 —— 指出学员这一段在**哪一类**上还欠缺（只说类别名，不落到本病例内容）→ 模型
//   L3 要点提示 —— 给出该类**可关注**的要点词（不给金标准原句）→ 模型
//
// ⚠️ 与服务端正式实现的差别（本期无服务端出站层，故把校验放在前端兜底）：
//   · 正式版由**服务端**在模型出站 → 序列化之前校验，并把 `redlineCheck` 写 `hintAudit`（PRD §9.5）
//   · 正式版的 B1 结论词表 / B2 事实词表由服务端**在样本入库时自动抽取**（不依赖人工维护）
//   · 本期实现了**红线 A（最长公共子串 ≤ 8）**与 **B2 的两类高危害事实（测量值、具体征象词）**；
//     **B1 结论短语的自动抽取未实现**，靠红线 A 兜底（复述结论必然触发 ≥8 字连续片段）。
//     已知缺口：**改写措辞复述结论**可绕过，需按 PRD §12 场景 16 构造对抗样本回归后补。
//   · 泛化体裁词（"部位与范围""重要阴性征象""密度/信号/强化程度"）**不进词表**（PRD §9.5 明确），
//     否则 L1 体裁提示会被全部误拦。

import { SEGMENTS } from './r1-table.js'

const SEGMENT_NAME = Object.fromEntries(SEGMENTS.map(s => [s.key, s.name]))

/** 三级提示的定义（UI 展示与配额口径共用） */
export const HINT_LEVELS = [
  { value: 'L1', label: 'L1 体裁提示', desc: '这一段规范上应包含哪些要素（不涉及本病例）' },
  { value: 'L2', label: 'L2 指向提示', desc: '指出你这一段还缺哪一类（只说类别，不给内容）' },
  { value: 'L3', label: 'L3 要点提示', desc: '给该类可关注的要点词，不给金标准原句' }
]

/** 配额默认值（PRD §5.2.3）—— 按「段 × 回合」发放，用完不补 */
export const DEFAULT_QUOTA = { l2: 3, l3: 1 }
export const HINT_COOLDOWN_MS = 10 * 1000

/** 校验失败 / 模型不可用时的固定降级文案（PRD §5.7「失败降级」） */
export const DEGRADED_HINT = '这条提示没生成好，换个说法再试试'

/** 红线 A 阈值：与金标准全文的**最长公共子串（连续字符）长度**上限（PRD §9.5，初值 8） */
export const MAX_COMMON_SUBSTRING = 8

/** L1 体裁提示（静态库；case-agnostic，不含任何本病例信息） */
export const L1_HINTS = {
  technique: '检查技术段建议覆盖：检查部位 / 检查类型 / 检查技术（扫描方式、层厚、是否增强）。',
  findings: '影像所见建议覆盖：部位与范围、数目与大小、形态与边界、密度/信号/强化程度、重要阴性征象。',
  impression: '诊断意见段建议覆盖：是否回答临床问题 / 定位与定性诊断 / 诊断依据或鉴别 / 对临床的下一步建议。'
}

// ── 红线 B2：具体事实词（只在金标准中确实出现时才纳入词表） ──
// 只收**具体征象**，不收泛化体裁词
const SIGN_WORDS = [
  '分叶', '毛刺', '棘状突起', '胸膜牵拉', '快进快出', '充盈缺损', '流空影', '碘油沉积',
  '磨玻璃', '低信号', '高信号', '等信号', '稍高信号', '稍低信号', '实性',
  '坏死', '囊变', '钙化', '肿大淋巴结', '胸腔积液', '骨质破坏', '中线移位', '脑沟增宽'
]
const MEASURE_RE = /\d+(?:\.\d+)?\s*(?:mm|cm|毫米|厘米)/gi

/**
 * 从金标准抽取事实词（B2）。正式版由服务端在入库时抽取，此处为可解释的近似实现。
 * @returns {{measures: string[], signs: string[]}}
 */
export function extractFactWords(goldStandard) {
  if (!goldStandard) return { measures: [], signs: [] }
  const full = SEGMENTS.map(s => goldStandard[s.key] || '').join('\n')
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
 * @param {string} text 模型产出的提示文本
 * @param {string} goldText 金标准报告全文
 * @param {object} facts extractFactWords 的结果
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
  const overLcs = maxCommonSubstring > MAX_COMMON_SUBSTRING
  return {
    passed: !overLcs && hits.length === 0,
    maxCommonSubstring,
    conclusionHit: false,          // B1 自动抽取本期未实现，靠红线 A 兜底
    factHit: hits.length > 0,
    hits
  }
}

/**
 * 组装伴学提示的模型请求。L1 不需要模型，返回 null。
 * 关键：金标准作为「题目答案」放入 prompt 供模型参照，**但 prompt 明令禁止复述**；
 * 出站再由 checkRedline 兜底。
 */
export function buildCompanionPrompt({ caseTitle, goldStandard, segment, level, draftText }) {
  if (level === 'L1') return null
  const segName = SEGMENT_NAME[segment] || segment
  const gold = SEGMENTS.map(s => `${s.name}：${(goldStandard && goldStandard[s.key]) || '（未录入）'}`).join('\n')

  const system = [
    '你是医学影像报告书写训练的伴学助手。学员正在写一份影像诊断报告的「' + segName + '」段。',
    '你的任务是给出**少量、要点式**的提示，帮助学员自己想起来该写什么，而不是替他把答案写出来。',
    '',
    '铁律（违反即作废）：',
    '1. 绝对不得出现参考报告里的任何具体事实：病灶部位与叶段、大小与测量值、密度或信号特征、特殊征象、诊断结论。',
    '2. 不得复述参考报告的任何连续 8 个字。',
    '3. 只说"该关注哪一类"或"可关注哪些要点词"，不要给出成句的诊断结论。',
    '4. 只输出提示正文，1–3 句、总计不超过 80 字；不要 markdown、不要编号、不要解释你在做什么。'
  ].join('\n')

  const asks = {
    L2: '【本次要求 L2 指向提示】指出学员这一段的写法在"哪一类"内容上还欠缺。**只点类别名**（例如 部位与范围 / 数目与大小 / 形态与边界 / 密度或信号或强化程度 / 重要阴性征象），不要落到本病例的任何具体内容。',
    L3: '【本次要求 L3 要点提示】针对学员这一段最欠缺的那一类，给出"可关注"的**要点词**（如某类征象可以从哪几个角度去看），仍不得出现本病例的任何具体事实。'
  }

  const user = [
    '【病例】' + (caseTitle || '（未命名）'),
    '',
    '【参考报告 · 题目答案（仅供你内部参照，绝不能复述其中任何具体内容）】',
    gold,
    '',
    '【学员已写的「' + segName + '」段】',
    String(draftText || '').trim() || '（还没写）',
    '',
    asks[level] || asks.L2
  ].join('\n')

  return { system, messages: [{ role: 'user', content: user }] }
}
