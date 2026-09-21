// 报告内容评分引擎（LLM 检查评分）
//
// 评的是**报告内容**（定位、征象、诊断倾向、有没有回应临床问题），不是格式合规性。
// 流程：
//   要点集（rubric，逐要点可评性已解析）+ 学员报告
//     → 组装 prompt（要求**严格 JSON** 逐要点判定）
//     → 调 /api/llm
//     → 解析 + 校验（枚举合法、分值不超上限、条目齐全）
//     → 点评语**逐条过红线**（复用 companion.js 的 checkRedline）+ 白名单约束
//     → 合成：逐条得分 / 维度得分 / 总得分 / 未覆盖要点 / 不可评条目
//
// 与 AI伴学**共用同一套判据**（同一份要点集与金标准）。否则会出现"伴学说你缺这个、
// 评分却说你没缺"的自相矛盾——这是硬约束，不是优化项。
//
// ⚠️ 出站安全（PRD §5.9.1 白名单 + §9.5 红线）：
//   点评语**只能**说"维度名 + 条目名 + 得分/满分 + 通用改进话术"，**不得**出现金标准里的
//   事实词（病灶名/部位/大小/密度等）或原句。实现上对每条 comment 过一遍 checkRedline，
//   不过关就把该条 comment 置空（分数保留）——**宁可少一句点评，不可泄一句答案**。

import { resolveRubric } from './rubric.js'
import { checkRedline, extractFactWords, longestCommonSubstring } from './companion.js'
import { SEGMENTS, WRITABLE_SEGMENTS, GOLD_SEGMENTS, R1_ITEMS } from './r1-table.js'

/** 金标准全文（红线比对基准） */
function goldFullText(sample) {
  const g = sample && sample.goldStandard
  if (!g) return ''
  // 红线也覆盖题面给的检查目的：段二的金标准 = 检查目的 + 检查方法
  return [...GOLD_SEGMENTS.map(s => g[s.goldKey]), sample && sample.purpose].filter(Boolean).join('\n')
}

/** 单条点评的字数上限（防止模型把整段答案写进点评） */
const COMMENT_MAX = 60

/** 固定话术：该要点未被覆盖 */
export const NOT_COVERED_TEXT = '该类内容未提及'
/** 固定话术：部分覆盖 */
export const PARTIAL_TEXT = '有所涉及但不够具体'

/* ══════════════════════════════════════════════════════════════
   Prompt
   ══════════════════════════════════════════════════════════════ */

/**
 * 组装评分请求。
 * 只把**可评要点**交给模型判定；不可评要点在 compose 阶段直接排除，不让模型有机会给分。
 */
/**
 * 点评的**合规范围**（2026-09-20 产品拍板）：
 *   · scope: 'exam'（默认）—— 考核侧，**严**：点评不得泄漏标准报告（LCS ≤ 8 + 词表拦截）
 *   · scope: 'training'   —— 训练侧，**放宽**：允许点到"漏了哪一类/哪个具体内容"，
 *                            让学员知道该补什么；仍不许把标准报告整句抄给他
 * 默认取严，新增调用方不传 scope 就是安全的。
 */
export const COMMENT_SCOPE = { EXAM: 'exam', TRAINING: 'training' }

export function buildScoringPrompt({ sample, rubric, reportText, scope = COMMENT_SCOPE.EXAM }) {
  const gold = GOLD_SEGMENTS.map(s => `${s.name}：${(sample.goldStandard && sample.goldStandard[s.goldKey]) || '（未录入）'}`).join('\n')

  const assessable = rubric.items.filter(i => i.points.some(p => p.assessable))

  const itemSpec = assessable.map(i => {
    const pts = i.points.filter(p => p.assessable)
      .map(p => {
        const bits = [`${p.score} 分`]
        if (p.accept && p.accept.length) bits.push(`可接受表述：${p.accept.join(' / ')}`)
        const rule = p.rule ? `\n        判定规则：${p.rule}` : ''
        return `    - ${p.id}（${bits.join('；')}）：${p.text}${rule}`
      })
      .join('\n')
    return [
      `- ${i.code} 《${i.name}》（本类病例可评满分 ${i.scoreableFull} 分，共 ${pts.split('\n    - ').length} 个要点）`,
      i.rules ? `  判定说明：${i.rules}` : '',
      pts
    ].filter(Boolean).join('\n')
  }).join('\n')

  const system = [
    '你是医学影像报告的评价专家。你要按给定的**评分要点表**逐点判定学员报告是否命中。',
    '',
    '判定规则：',
    '1. 每个要点给一个 score：1 = 明确写出且正确；0.5 = 提及但笼统、不完整或表述不规范；0 = 未提及或写错。',
    '2. **只依据要点表判定**，不要因为表述风格不同就扣分——要点表里的"可接受表述"命中任一即算 1。',
    '3. 学员写的内容若与参考报告的事实相矛盾（写错部位/写错征象），该要点给 0。',
    scope === COMMENT_SCOPE.TRAINING
      ? '4. comment 要**具体、可据以修改**：直接指出"漏了哪一类征象 / 哪个部位没写 / 哪个描述不规范或写错了"。'
        + '例如"没写有无纵隔淋巴结肿大""密度描述缺失""部位只写到肺叶、没到肺段"。'
        + '可以点到具体内容，但**不要把参考报告的句子整段抄给他**，每条 comment 不超过 60 字。'
      : '4. comment 用**通用改进话术**，只说明"哪一类没写到/写得不够"，**绝对不许**写参考报告里的具体事实（病灶名称、部位、大小、数值、密度、征象、诊断结论），也不许出现参考报告的任何连续 8 个字。每条 comment 不超过 40 字。',
    '5. 只输出 JSON，不要 markdown 代码块，不要任何解释文字。'
  ].join('\n')

  const user = [
    '【病例】' + (sample.title || sample.id),
    '',
    '【参考报告 · 仅你内部参照，绝不能写进 comment】',
    gold,
    '',
    '【评分要点表】',
    itemSpec,
    '',
    '【学员报告】',
    ...SEGMENTS.map(s => `${s.name}：` + (String(reportText[s.key] || '').trim() || '（未填写）')),
    '',
    '【输出格式】严格如下 JSON：',
    '{',
    '  "items": [',
    '    { "code": "条目编号", "points": [ { "id": "要点id", "score": 0, "comment": "通用话术" } ] }',
    '  ]',
    '}',
    'items 必须覆盖上面列出的全部条目编号及其全部要点 id。'
  ].join('\n')

  return { system, messages: [{ role: 'user', content: user }] }
}

/* ══════════════════════════════════════════════════════════════
   解析与校验
   ══════════════════════════════════════════════════════════════ */

/** 从模型输出里抠出 JSON（容忍 ```json 包裹与前后杂字） */
function extractJson(text) {
  const s = String(text || '').trim()
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const body = fence ? fence[1] : s
  const start = body.indexOf('{')
  const end = body.lastIndexOf('}')
  if (start < 0 || end <= start) return null
  try { return JSON.parse(body.slice(start, end + 1)) } catch (e) { return null }
}

/** score 归一到 0 / 0.5 / 1 */
function normScore(v) {
  const n = Number(v)
  if (!Number.isFinite(n)) return 0
  if (n >= 0.75) return 1
  if (n >= 0.25) return 0.5
  return 0
}

/**
 * 解析模型输出 → 逐要点结果。缺失的要点按 0 计（模型漏答不放过）。
 * @returns {{ok:boolean, reason?:string, raw?:object}}
 */
export function parseScoringResult(rawText, rubric) {
  const json = extractJson(rawText)
  if (!json || !Array.isArray(json.items)) return { ok: false, reason: '模型未返回可解析的 JSON' }

  const byCode = Object.fromEntries(json.items.map(i => [i && i.code, i]))
  const result = {}
  rubric.items.forEach(item => {
    const got = byCode[item.code]
    const pts = (got && Array.isArray(got.points)) ? got.points : []
    const ptBy = Object.fromEntries(pts.map(p => [p && p.id, p]))
    result[item.code] = item.points
      .filter(p => p.assessable)
      .map(p => {
        const raw = ptBy[p.id] || {}
        return { id: p.id, text: p.text, score: normScore(raw.score), comment: String(raw.comment || '').trim().slice(0, COMMENT_MAX) }
      })
  })
  return { ok: true, byItem: result }
}

/* ══════════════════════════════════════════════════════════════
   合成成绩
   ══════════════════════════════════════════════════════════════ */

/**
 * 用解析结果合成成绩。
 * · 条目得分 = 可评满分 × 命中要点分之和 / 可评要点数
 * · 总分 = Σ条目得分；满分 = 该病例可评分（不折算到 100，避免"考一张更短的卷"却显示满分）
 * · 点评语逐条过红线，不过关置空
 */
export function composeScore(parsed, rubric, sample, scope = COMMENT_SCOPE.EXAM) {
  const gold = sample && sample.goldStandard
  const goldText = goldFullText(sample)
  const facts = extractFactWords(gold)

  const items = rubric.items.map(item => {
    const assessable = item.points.filter(p => p.assessable)
    const judged = (parsed.byItem && parsed.byItem[item.code]) || []
    // 逐要点计分：得数 = Σ(该要点命中档 × 要点分值)
    const byId = Object.fromEntries(assessable.map(p => [p.id, p]))
    const got = Math.round(judged.reduce((a, p) => {
      const rp = byId[p.id]
      return a + (rp ? Number(rp.score) * Number(p.score) : 0)
    }, 0) * 10) / 10

    const points = judged.map(p => {
      // 出站安全：点评语不得泄漏标准报告（PRD §5.9.1 白名单 + §9.5 红线）
      let comment = p.comment
      let blocked = false
      // 考核侧严：点评泄漏标准报告就清空并标记；训练侧放宽：允许具体指出缺什么，不拦截
      if (scope !== COMMENT_SCOPE.TRAINING && comment && goldText) {
        const r = checkRedline(comment, goldText, facts)
        if (!r.passed) { comment = ''; blocked = true }
      }
      // 未命中且模型没给话术时，用固定通用话术兜底
      if (!comment && p.score < 1) comment = p.score === 0 ? NOT_COVERED_TEXT : PARTIAL_TEXT
      const rp = byId[p.id] || {}
      return { ...p, text: rp.text || p.text, scoreWeight: rp.score, comment, commentBlocked: blocked }
    })

    const missing = points.filter(p => p.score === 0).map(p => ({ text: p.text, comment: p.comment }))

    return {
      code: item.code, name: item.name, dim: item.dim,
      full: item.full, scoreableFull: item.scoreableFull,
      got, points, missing,
      nAPoints: item.points.filter(p => !p.assessable).map(p => ({ text: p.text, why: p.nAReason, source: p.nASource }))
    }  })

  // 维度归并
  const dimMap = new Map()
  items.forEach(i => {
    if (!dimMap.has(i.dim)) dimMap.set(i.dim, { dim: i.dim, got: 0, full: 0 })
    const d = dimMap.get(i.dim)
    d.got += i.got
    d.full += i.scoreableFull
  })
  const dims = [...dimMap.values()].map(d => ({ ...d, got: Math.round(d.got * 10) / 10, full: Math.round(d.full * 10) / 10 }))

  const rawTotal = Math.round(items.reduce((a, i) => a + i.got, 0) * 10) / 10
  const scoreableMax = Math.round(items.reduce((a, i) => a + i.scoreableFull, 0) * 10) / 10

  const missingItems = items.filter(i => i.missing.length).map(i => ({
    code: i.code, name: i.name, dim: i.dim, full: i.scoreableFull,
    missing: i.missing
  }))

  const unassessableItems = items
    .filter(i => i.scoreableFull < i.full)
    .map(i => ({
      code: i.code, name: i.name, full: i.full, scoreableFull: i.scoreableFull,
      lost: Math.round((i.full - i.scoreableFull) * 10) / 10,
      source: i.nAPoints.some(p => p.source === 'capability') ? 'capability' : 'na',
      why: (i.nAPoints[0] || {}).why || '',
      points: i.nAPoints
    }))

  return {
    items, dims, rawTotal, scoreableMax, missingItems, unassessableItems,
    // 难度分层标定（来自 resolveRubric）：成绩报告据此显示"达标 / 未达标"
    level: rubric.level || '',
    passRate: rubric.passRate,
    passLine: rubric.passLine
  }
}

/* ══════════════════════════════════════════════════════════════
   一次性入口（给前端调用）
   ══════════════════════════════════════════════════════════════ */

/**
 * 由 UI 调用的完整评分请求组装：返回 prompt 与一个「用模型原始输出换成绩」的收口函数。
 * 这样 HTTP 放在 composable 里，纯逻辑留在 shared，便于单测。
 */
export function prepareScoring({ sample, reportText, scope = COMMENT_SCOPE.EXAM }) {
  const rubric = resolveRubric(sample.id, sample.capabilities)
  const prompt = buildScoringPrompt({ sample, rubric, reportText, scope })

  return {
    rubric,
    prompt,
    /**
     * @param {string} rawModelText
     * @returns {{ok:boolean, reason?:string, result?:object}}
     */
    settle(rawModelText) {
      const parsed = parseScoringResult(rawModelText, rubric)
      if (!parsed.ok) return { ok: false, reason: parsed.reason }
      const result = composeScore(parsed, rubric, sample, scope)
      // 留痕（可复现性 / 申诉依据）
      const gt = goldFullText(sample)
      const maxLcs = Math.max(
        0,
        ...result.items.flatMap(i => i.points.map(p => p.comment ? longestCommonSubstring(p.comment, gt) : 0))
      )
      result.scoreTrace = {
        rubricVersion: rubric.version,
        scoreableMax: rubric.scoreableMax,
        commentScope: scope,
        commentsBlocked: result.items.reduce((a, i) => a + i.points.filter(p => p.commentBlocked).length, 0),
        maxCommentLcs: maxLcs,
        gradedAt: new Date().toISOString()
      }
      return { ok: true, result }
    }
  }
}

/** 固定降级文案：评分整体失败 */
export const SCORING_FAILED_TEXT = '这次评分没跑成功，可以稍后重试'

/* ══════════════════════════════════════════════════════════════
   考务口径的分数与达标判定（**浏览器端与服务端共用同一份实现**）
   —— 放在 shared 的纯逻辑层，服务端评阅与前端展示才不会各算一套。
   ══════════════════════════════════════════════════════════════ */

/**
 * 给评分结果补上**考务口径**的分数与达标判定（两侧展示统一读这几个字段）。
 *
 * 量纲由 `scoreScale` 定死：
 *   · `normalize` → 百分制：finalMax = 100，finalScore = rawTotal / scoreableMax × 100
 *   · `raw`       → 本卷可评满分量纲：finalMax = scoreableMax，finalScore = rawTotal
 * `scoreableMax` 为 0（不可评）时不做除法，直接回落 raw，避免除零。
 *
 * 达标线：有考务设定（`passLine` 传了数字）就用它，并把难度标定原值留在 `rubricPassLine`；
 * 没传（练习考）保持难度标定值 —— 两种情况都写 `passLineSource`，便于界面区分文案。
 *
 * @param {object} result composeScore 的结果
 * @param {number|string|null} passLine 考务设定的达标线
 * @param {'normalize'|'raw'} scoreScale 满分口径
 */
export function applyExamScale(result, passLine, scoreScale) {
  if (!result || typeof result !== 'object') return result
  const rawTotal = Number(result.rawTotal) || 0
  const scoreableMax = Number(result.scoreableMax) || 0
  let finalScore = rawTotal
  let finalMax = scoreableMax
  if (scoreScale === 'normalize' && scoreableMax > 0) {
    finalMax = 100
    finalScore = Math.round(rawTotal / scoreableMax * 1000) / 10
  }
  const hasExamLine = passLine !== null && passLine !== undefined && passLine !== '' && !isNaN(Number(passLine))
  const rubricPassLine = typeof result.passLine === 'number' ? result.passLine : null
  const line = hasExamLine ? Number(passLine) : rubricPassLine
  return {
    ...result,
    finalScore,
    finalMax,
    rubricPassLine,
    passLine: line,
    passLineSource: hasExamLine ? 'exam' : 'rubric',
    passed: typeof line === 'number' ? finalScore >= line : null
  }
}

/* ══════════════════════════════════════════════════════════════
   要点集抽取（管理端「AI 从金标准抽取」用）
   —— 这是要点集的**产出工艺**：模型先抽一版，教研再改。
   ══════════════════════════════════════════════════════════════ */

/** 需要模型抽取的内容条目（通用条目由样单元数据自动生成，不让模型碰） */
const EXTRACT_CODES = [
  'FIND-01', 'FIND-02', 'FIND-03', 'FIND-04', 'FIND-05', 'FIND-06', 'FIND-07',
  'IMP-01', 'IMP-02', 'IMP-03', 'IMP-04', 'IMP-05', 'IMP-06', 'IMP-07', 'IMP-08'
]

export function buildRubricExtractionPrompt({ sample }) {
  const gold = GOLD_SEGMENTS.map(s => `${s.name}：${(sample.goldStandard && sample.goldStandard[s.goldKey]) || '（未录入）'}`).join('\n')
  const clinical = [sample.history, sample.purpose].filter(Boolean).join('；')
  const itemList = EXTRACT_CODES
    .map(code => {
      const it = R1_ITEMS.find(x => x.code === code)
      return `- ${code} 《${it.name}》（满分 ${it.score}）`
    })
    .join('\n')

  const system = [
    '你是医学影像教学与考评专家。请把一份参考报告拆成**可逐点判定的评分要点集**。',
    '',
    '要求：',
    '1. 每条要点必须是**可判定的具体事实或规范要求**，不要写"描述准确"这类无法判定的空话。',
    '2. 对**本病例特有的**内容（部位、大小、形态征象、阴性征象、诊断倾向、建议），要点里要写清**本病例的具体答案**；',
    '   同时给出 accept（可接受表述域）——即同样算对的 2–4 种说法，用于避免误伤表述不同的学员。',
    '3. 对**通用规范要求**（条理、顺序、术语规范、少错别字等），写通用表述即可，accept 留空数组。',
    '4. 每条目给 2–4 个要点；要点要覆盖该条目该评的核心内容，不要凑数。',
    '5. **要点必须落在本条目的语义范围内**（例如 FIND-06 是"密度/信号/强化程度"，不要把"紧贴膈面"这类位置描述放进去）。',
    '6. 每条要点给一个 `rule`：**这条要点的判定规则**——命中要写到什么程度、什么情况算错、哪些表述算对。',
    '   它会被评分模型直接使用，所以要写成可执行的判据（不要写"描述准确"这类空话）。',
    '7. 若某要点依赖本病例不具备的条件，给该要点加 `assess` 标签（取值只能是下面四个之一，否则省略该字段）：',
    '   - "measure"：需要影像测量工具才能评（如病灶大小/尺寸的实测值）',
    '   - "enhance"：需要增强期相才能评（如强化程度、强化方式）',
    '   - "prior"：需要既往检查影像才能评（如与以前片比较、病灶有无变化）',
    '   - "staging"：需要临床提供分期依据才能评（如 TNM 分期是否正确）',
    '   省略该字段 = 该要点无条件、始终可评。',
    '8. 只输出 JSON，不要 markdown 代码块，不要解释。'
  ].join('\n')

  const user = [
    '【病例】' + (sample.title || sample.id),
    '【临床主要信息及检查目的】' + (clinical || '（未提供）'),
    '【参考报告 · 题目答案】',
    gold,
    '',
    '【需要拆解的 R1 条目】',
    itemList,
    '',
    '【输出格式】严格如下 JSON：',
    '{',
    '  "items": {',
    '    "FIND-03": { "rules": "（可选，该条的判定说明，没有就空串）",',
    '                 "points": [',
    '                   { "id": "p1", "text": "要点内容", "rule": "这条要点的判定规则", "accept": ["可接受说法A", "可接受说法B"] },',
    '                   { "id": "p2", "text": "需要增强才能评的要点", "rule": "…", "accept": [], "assess": "enhance" }',
    '                 ] },',
    '    "...": {}',
    '  }',
    '}',
    'items 的键必须且只能是上面列出的条目编号。'
  ].join('\n')

  return { system, messages: [{ role: 'user', content: user }] }
}

/** 解析抽取结果，只保留合法条目与合法字段 */
export function parseRubricExtraction(rawText) {
  const s = String(rawText || '').trim()
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const body = fence ? fence[1] : s
  const start = body.indexOf('{')
  const end = body.lastIndexOf('}')
  if (start < 0 || end <= start) return { ok: false, reason: '模型未返回可解析的 JSON' }
  let json
  try { json = JSON.parse(body.slice(start, end + 1)) } catch (e) { return { ok: false, reason: '返回的 JSON 无法解析' } }
  const src = json && json.items
  if (!src || typeof src !== 'object') return { ok: false, reason: '返回内容缺少 items' }

  const items = {}
  EXTRACT_CODES.forEach(code => {
    const it = src[code]
    if (!it || !Array.isArray(it.points)) return
    const points = it.points
      .filter(p => p && String(p.text || '').trim())
      .slice(0, 6)
      .map((p, i) => {
        const assess = String(p.assess || '').trim()
        const score = Number(p.score)
        return {
          id: String(p.id || `p${i + 1}`),
          text: String(p.text).trim(),
          accept: Array.isArray(p.accept) ? p.accept.map(a => String(a).trim()).filter(Boolean).slice(0, 6) : [],
          // 逐要点判定规则（评分时交给模型；也是老师改判据的地方）
          ...(String(p.rule || '').trim() ? { rule: String(p.rule).trim() } : {}),
          // 要点分值：模型给不出准确分配时可以省略，界面用 R1 满分均分的默认值
          ...(Number.isFinite(score) && score >= 0 ? { score } : {}),
          // 可评条件标签：measure / enhance / prior / staging，空串 = 无条件
          ...(['measure', 'enhance', 'prior', 'staging'].includes(assess) ? { assess } : {})
        }
      })
    if (points.length) items[code] = { rules: String(it.rules || '').trim(), points }
  })
  const n = Object.keys(items).length
  if (!n) return { ok: false, reason: '没有解析出任何有效条目' }
  return { ok: true, items, count: n }
}

