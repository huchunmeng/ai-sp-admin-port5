/* 检验报告解读训练 · 演示成绩
   ------------------------------------------------------------------
   11-23 批注：「报告里做演示数据，要有分数」——打开系统就要能看到练过、有分，
   不能全靠现场手打一段解读才有成绩。

   做法：从每例的参考解读里挑出**与本报告要点相关**的句子，拼成一份示范解读，
   再交给同一套规则评分（evaluateLabCase）算出分数。
   所以演示分数不是写死的数字：改了金标准要点或参考解读，重跑就跟着变，
   弹窗里的「要点对照 / AI 评语 / 分数」三者始终对得上。

   真实提交过的记录优先，演示成绩只在本地没有记录时顶上。 */

import { LAB_REPORTS } from './reports.js'
import { evaluateLabCase } from './score.js'

/* 按句切：句号/分号结尾，丢掉太短的碎句 */
function sentences(text) {
  return String(text || '').split(/(?<=[。；])|(?<=\n)/)
    .map(s => s.trim()).filter(s => s.length > 8)
}

/**
 * 拼一份贴合「这个报告」的示范解读
 * @param report 训练单元
 * @param ratio 覆盖到参考解读里与该报告相关句子的比例；
 *              0.8 上下是练得好的，0.5 是及格偏上，0.32 是练得差的——演示分数要有起伏，不能整屏 90+
 */
function buildDemoText(report, ratio) {
  const ref = (report.gold && report.gold.refAnswer) || ''
  const list = sentences(ref)
  if (!list.length) return ''
  const kws = []
  report.gold.points.forEach(pt => (pt.kw || []).forEach(k => {
    const t = String(k).trim().toLowerCase()
    if (t.length >= 2) kws.push(t)
  }))
  /* 异常识别类的关键词单独留一份：练得再差的演示答案也得先点出异常，
     否则报告里会出现「异常识别 0/30」这种不像人写的分布 */
  const abnKws = []
  report.gold.points.filter(pt => pt.dim === 'abnormal').forEach(pt => (pt.kw || []).forEach(k => {
    const t = String(k).trim().toLowerCase()
    if (t.length >= 2) abnKws.push(t)
  }))
  const head = list[0]                       // 首句是临床背景，任何报告都该带上
  const hits = list.slice(1).filter(s => kws.some(k => s.toLowerCase().indexOf(k) >= 0))
  const keep = hits.slice(0, Math.max(1, Math.round(hits.length * ratio)))
  const firstAbn = hits.find(s => abnKws.some(k => s.toLowerCase().indexOf(k) >= 0))
  if (firstAbn && keep.indexOf(firstAbn) < 0) keep.splice(1, 0, firstAbn)
  return [...new Set([head, ...keep])].join('')
}

/* 练过的次数与时间也做进演示数据，列表看起来是真在用 */
const PLAN = [
  { ratio: 0.78, attempts: 2 },
  { ratio: 0.5, attempts: 1 },
  { ratio: 0.72, attempts: 3 },
  { ratio: 0.32, attempts: 2 },
  { ratio: 0.58, attempts: 1 },
  { ratio: 0.66, attempts: 2 }
]

const DAY = ['11-19', '11-20', '11-21', '11-22', '11-22']

/* 不是每份都练过：留几份空白，列表的「未练过」筛选和状态才有东西可看，
   19 份全练过反而一眼就是造的数 */
const SKIP = [5, 10, 18]

export const LAB_DEMO_RUNS = LAB_REPORTS
  .map((r, i) => ({ r, i }))
  .filter(({ i }) => !SKIP.includes(i))
  .map(({ r, i }) => {
    const plan = PLAN[i % PLAN.length]
    /* 演示成绩不留满分：满分意味着要点对照一排勾、评语没话可说，一眼就是造的。
       算出来 ≥98 就退一句重写，最多退三句 */
    let text = buildDemoText(r, plan.ratio)
    let result = text ? evaluateLabCase(r, text) : null
    for (let t = 0; t < 3 && result && result.total >= 98; t++) {
      text = buildDemoText(r, plan.ratio * (0.72 - t * 0.12))
      result = evaluateLabCase(r, text)
    }
    const minute = String((i * 13) % 60).padStart(2, '0')
    return {
      key: r.key,
      caseId: r.caseId,
      panelId: r.panelId,
      demo: true,
      text,
      result,
      score: result ? result.total : null,
      grade: result ? result.grade : null,
      attempts: plan.attempts,
      lastAt: `2026-${DAY[i % DAY.length]} ${8 + (i % 9)}:${minute}`
    }
  })

export function labDemoRunOf(key) {
  return LAB_DEMO_RUNS.find(d => d.key === key) || null
}
