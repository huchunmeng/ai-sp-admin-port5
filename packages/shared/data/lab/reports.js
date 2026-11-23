/* 检验报告解读训练 · 「一次训练只解读一个报告」的展开层
   ------------------------------------------------------------------
   samples.js 存的是**病例**（一个病人、一次就诊、若干报告，可能抽了两次血）。
   本文件把它展开成**训练单元 = 一个报告的一次结果**（2026-11-23 批注 5），并规定两类信息只作背景：

     · 本次结果  —— 报告单主表，只有一个时点一列结果，这才是要解读的对象
     · 既往结果  —— 同一个报告的更早一次结果（若曾复抽），作背景信息给出，不在主表里做前后对照（批注 4）
     · 其他报告  —— 同次就诊做的别的项目，同样只作背景

   计分跟着改：异常识别 / 临床意义只算**属于本报告**的要点（按词表归类），
   诊断思路 / 下一步建议保留全部——那两维本来就要综合背景才能答。 */

import { LAB_CASES } from './samples.js'

/* ── 判高低 / 危急值（主表与背景块共用一套判读口径） ── */
export function flagOf(row, value) {
  if (value === '' || value == null) return null
  const n = parseFloat(value)
  if (isNaN(n)) return null
  if (row.hi != null && n > row.hi) return 'high'
  if (row.lo != null && n < row.lo) return 'low'
  return null
}

export function isCritical(row, value) {
  if (row.criticalLow == null || value === '' || value == null) return false
  const n = parseFloat(value)
  return !isNaN(n) && n < row.criticalLow
}

/* 定性项目（尿糖 4+、尿酮体 3+）没有数值区间，靠数据里的 abn: true 直接判异常 */
export function isAbnormal(row, value) {
  if (value === '' || value == null) return false
  if (row.abn) return true
  return flagOf(row, value) != null
}

export function abnormalRows(rows) {
  return rows.filter(r => isAbnormal(r, r.value))
}

/* ── 词表：把金标准要点归到具体报告 ──
   短英文符号（pt / cr / be / ag…）必须整词匹配，否则 'APTT' 里的 'PT'、'CRP' 里的 'CR'
   会把要点错归到别的报告上；中文词按包含匹配。 */
const PANEL_VOCAB = {
  cbc: ['血常规', '白细胞', 'wbc', '中性粒', 'neut', '淋巴', 'lymph', '单核', 'monit', '嗜酸', '嗜碱', '红细胞', 'rbc', '血红蛋白', 'hgb', 'hb', '压积', 'hct', 'mcv', 'mch', 'mchc', 'rdw', '血小板', 'plt', '网织红', 'ret', 'crp', 'c反应蛋白', 'pct', '降钙素原'],
  bio: ['生化', '丙氨酸', 'alt', 'ast', '转氨酶', '胆红素', 'tbil', 'dbil', '白蛋白', 'alb', '球蛋白', '总蛋白', '肌酐', '尿素', '尿酸', 'ua', '血钾', '血钠', '血氯', '血钙', 'glu', '血糖', 'ldh', '乳酸脱氢酶', '淀粉酶', 'amy', '脂肪酶', 'lip', '甘油三酯', 'tg', '胆固醇', 'hdl', 'ldl', 'alp', 'ggt', '肌酸激酶', 'b12', '叶酸', '阴离子间隙', 'ag', '渗透压', '血酮', '羟丁酸'],
  coag: ['凝血', 'pt', 'aptt', '纤维蛋白原', 'fib', 'd-二聚体', 'd二聚体', 'ddimer', '二聚体', 'inr', '国际标准化'],
  gas: ['血气', 'ph', 'paco2', 'co2', 'pao2', 'o2', 'hco3', '碳酸氢', '剩余碱', 'be', '乳酸', 'lac', '氧分压', '二氧化碳', 'spo2', '碱中毒', '酸中毒'],
  iron: ['铁代谢', '血清铁', '铁蛋白', '总铁结合力', 'tibc', '转铁蛋白', '饱和度'],
  urine: ['尿常规', '尿糖', '尿酮', '尿蛋白', '尿白细胞', '尿亚硝酸盐', '尿比重', '尿隐血', '尿胆', '酮体'],
  cardiac: ['心肌标志物', '肌钙蛋白', 'hs-ctni', 'ctni', 'ctnt', 'tni', 'tnt', 'ck-mb', 'ckmb', '肌酸激酶同工酶', 'probnp', 'bnp', '脑钠肽', '肌红蛋白', 'myo']
}

const LATIN = /^[a-z0-9+\-]/

function hayHas(hay, tok) {
  if (LATIN.test(tok)) {
    const esc = tok.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return new RegExp('(^|[^a-z0-9])' + esc + '($|[^a-z0-9])').test(hay)
  }
  return hay.indexOf(tok) >= 0
}

function panelVocab(panel) {
  const out = (PANEL_VOCAB[panel.id] || []).slice()
  panel.rows.forEach(r => {
    String(r.name).split(/[\s/()（）]+/).forEach(part => {
      const t = part.trim().toLowerCase()
      if (t.length >= 2 && out.indexOf(t) < 0) out.push(t)
    })
  })
  return out
}

function pointHaystack(pt) {
  return (String(pt.text || '') + ' ' + (pt.kw || []).join(' ')).toLowerCase()
}

/** 该要点落在哪些报告上；返回空数组表示归不了类（当通用要点处理） */
export function pointPanels(pt, panels) {
  const hay = pointHaystack(pt)
  return panels.filter(p => panelVocab(p).some(t => hayHas(hay, t))).map(p => p.id)
}

/* ── 取值规则 ──
   '—' 表示这一次没做该项目（复诊常只复查血常规），不能当结果渲染。

   本次 = 病例声明的那个时点（focusTime），没声明时默认取最新一次；
   既往 = 本次之前的那一次，只作背景；
   本次之后的时点（治疗后的复查）**不进训练**——那是「下一步怎么办」的答案，摆出来就是泄题。 */
function normVal(v) {
  if (v == null) return ''
  const s = String(v).trim()
  return s === '' || s === '—' || s === '-' ? '' : s
}
function panelHasSecond(panel) {
  return panel.rows.some(r => normVal(r.second) !== '')
}
function focusIndex(c, panel) {
  if (c.focusTime != null) return c.focusTime
  return panelHasSecond(panel) ? 1 : 0
}
function valueAt(row, idx) {
  return normVal(idx >= 1 ? (normVal(row.second) || normVal(row.first)) : row.first)
}
function shapeRow(row, value) {
  return {
    name: row.name, unit: row.unit, ref: row.ref,
    lo: row.lo, hi: row.hi, criticalLow: row.criticalLow, abn: row.abn,
    value
  }
}
function mapRows(panel, idx) {
  return panel.rows.map(r => shapeRow(r, valueAt(r, idx))).filter(r => r.value !== '')
}
/* 背景块里的其他报告：本次值之外再带上它自己的既往值。
   参考解读是按整例写的，若不把其他报告的既往值放进来，
   弹窗里出现的数字在页面上就找不到（例如练血气时提到生化的 Cr 168）。 */
function mapRowsWithPrior(panel, idx) {
  return panel.rows.map(r => {
    const row = shapeRow(r, valueAt(r, idx))
    if (row.value === '') return null
    row.prior = idx > 0 ? valueAt(r, idx - 1) : ''
    return row
  }).filter(Boolean)
}

/* 时间标签形如「首次 11-18 08:00」「补铁 4 周复查 12-18 09:10」：
   主表表头只取日期时间，前面的说明语（首次/入院/复查…）挪去背景块，免得又被读成前后对照 */
function splitTime(label) {
  const s = String(label || '')
  const m = s.match(/\d{1,2}-\d{1,2}\s+\d{1,2}:\d{2}/)
  if (!m) return { at: s, note: '' }
  return { at: m[0], note: s.replace(m[0], '').trim() }
}

/* 综合维度：要靠背景信息才能答，不按报告切割 */
const GLOBAL_DIMS = { reasoning: true, plan: true }

/**
 * 金标准要点三级筛选：
 *  1) time: 'later' —— 说的是本次之后的时点（治疗后复查），本场不出现，直接剔除
 *     time: 'trend' —— 需要拿既往作对照，只有本场存在既往记录时才计分
 *  2) 异常识别 / 临床意义：只留归到本报告的要点（词表归类，归不了类的当通用）
 *  3) 诊断思路 / 下一步建议：全部保留（本来就要综合背景）
 */
function buildGold(c, panel, opts) {
  const gold = c.gold || { points: [], penalties: [], refAnswer: '' }
  const picked = []
  const dropped = []
  gold.points.forEach(pt => {
    if (pt.time === 'later' || (pt.time === 'trend' && !opts.hasHistory)) return dropped.push(pt)
    if (GLOBAL_DIMS[pt.dim]) return picked.push(pt)
    const hit = pointPanels(pt, c.panels)
    if (!hit.length || hit.indexOf(panel.id) >= 0) picked.push(pt)
    else dropped.push(pt)
  })
  /* 某个维度被切空了（例如该报告本身只有两三项）就把该维度要点放回，避免整维度直接判 0 */
  const weight = { abnormal: 0, meaning: 0, reasoning: 0, plan: 0 }
  picked.forEach(pt => { weight[pt.dim] += pt.w })
  Object.keys(weight).forEach(k => {
    if (weight[k]) return
    const back = gold.points.filter(p => p.dim === k && p.time !== 'later')
    if (back.length) picked.push(...back)
  })
  return {
    points: picked,
    penalties: gold.penalties || [],
    refAnswer: gold.refAnswer || '',
    dropped: dropped.map(p => p.text)
  }
}

function buildReport(c, panel) {
  const idx = focusIndex(c, panel)
  const prevIdx = idx - 1
  const rows = mapRows(panel, idx)
  const historyRows = prevIdx >= 0 ? mapRows(panel, prevIdx) : []
  const notDone = panel.rows.filter(r => valueAt(r, idx) === '').map(r => r.name)
  const hasHistory = historyRows.length > 0
  const gold = buildGold(c, panel, { hasHistory })
  const cur = splitTime(c.times[idx] || '')
  const pre = hasHistory ? splitTime(c.times[prevIdx] || '') : { at: '', note: '' }

  return {
    key: c.id + '#' + panel.id,
    id: c.id + '#' + panel.id,
    caseId: c.id,
    panelId: panel.id,
    title: c.title,
    reportName: panel.name,
    typeLabel: PANEL_TYPE[panel.id] || panel.name,
    cardTitle: c.title + ' · ' + panel.name,
    level: c.level,
    department: c.department,
    specimen: panel.specimen || c.specimen,
    patient: c.patient,
    /* 主表只有一个时点；既往与其他报告的时间只写在背景块标题上 */
    timeLabel: cur.at,
    timeNote: cur.note,
    priorTime: pre.at,
    priorNote: pre.note,
    rows,
    notDone,
    history: hasHistory ? { reportName: panel.name, timeLabel: pre.at, timeNote: pre.note, rows: historyRows } : null,
    others: c.panels.filter(p => p.id !== panel.id).map(p => ({
      reportName: p.name, panelId: p.id, timeLabel: cur.at, priorTime: pre.at, rows: mapRowsWithPrior(p, idx)
    })),
    tips: (c.tips || []).slice(),
    gold,
    goldTotal: (c.gold && c.gold.points || []).length,
    goldDropped: gold.dropped,
    abn: abnormalRows(rows).length
  }
}

/* 报告类型（列表筛选用）：页签原名太花（'生化（含胰酶）'/'生化 + 血脂'），
   筛选按大类，卡面仍显示原名 */
const PANEL_TYPE = { cbc: '血常规', bio: '生化', coag: '凝血', gas: '血气', iron: '铁代谢', urine: '尿常规', cardiac: '心肌标志物' }

export const LAB_REPORTS = []
LAB_CASES.forEach(c => c.panels.forEach(p => LAB_REPORTS.push(buildReport(c, p))))

export function getLabReport(caseId, panelId) {
  return LAB_REPORTS.find(r => r.caseId === caseId && r.panelId === panelId) || null
}

/** 列表页卡片：一张卡 = 一次训练 = 一个报告 */
export function labReportCardOf(r, stat) {
  return {
    key: r.key,
    caseId: r.caseId,
    panelId: r.panelId,
    title: r.reportName,
    subTitle: r.title,
    typeLabel: r.typeLabel,
    cardTitle: r.cardTitle,
    level: r.level,
    department: r.department,
    patient: r.patient,
    clinical: r.patient.clinical,
    specimen: r.specimen,
    itemCount: r.rows.length,
    abnCount: r.abn,
    hasHistory: !!r.history,
    otherCount: r.others.length,
    timeLabel: r.timeLabel,
    trainedRounds: stat ? stat.attempts || 0 : 0,
    lastScore: stat ? (stat.score != null ? stat.score : null) : null,
    lastAt: stat ? stat.lastAt || '' : ''
  }
}
