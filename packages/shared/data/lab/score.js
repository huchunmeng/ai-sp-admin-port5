/* 检验报告解读 · 规则评分
   演示版：按金标准要点的关键词命中判分，不调用模型。
   正式版应把 evaluateLabCase 换成服务端模型评分，返回结构保持一致。 */

export const LAB_DIMS = {
  abnormal: { name: '异常识别', full: 30, color: '#2563eb' },
  meaning: { name: '临床意义', full: 30, color: '#7c3aed' },
  reasoning: { name: '诊断思路', full: 20, color: '#0891b2' },
  plan: { name: '下一步建议', full: 20, color: '#059669' }
}

function normalizeText(s) {
  return String(s || '').toLowerCase().replace(/\s+/g, ' ')
}

export function evaluateLabCase(caseItem, text) {
  const t = normalizeText(text)
  const gold = caseItem.gold || { points: [], penalties: [] }

  const dimWeight = { abnormal: 0, meaning: 0, reasoning: 0, plan: 0 }
  const dimScore = { abnormal: 0, meaning: 0, reasoning: 0, plan: 0 }

  const points = gold.points.map(pt => {
    dimWeight[pt.dim] += pt.w
    const hit = pt.kw.some(k => t.indexOf(normalizeText(k)) >= 0)
    if (hit) dimScore[pt.dim] += pt.w
    return { ...pt, hit }
  })

  const penalties = []
  ;(gold.penalties || []).forEach(p => {
    if (p.re.test(text)) {
      dimScore[p.dim] = Math.max(0, dimScore[p.dim] - 2)
      penalties.push(p)
    }
  })

  const dims = {}
  let total = 0
  Object.keys(LAB_DIMS).forEach(k => {
    const ratio = dimWeight[k] ? Math.max(0, Math.min(1, dimScore[k] / dimWeight[k])) : 0
    const score = Math.round(LAB_DIMS[k].full * ratio * 2) / 2
    dims[k] = { score, full: LAB_DIMS[k].full, ratio }
    total += score
  })

  return {
    total: Math.round(total * 2) / 2,
    dims,
    points,
    penalties,
    hitCount: points.filter(p => p.hit).length,
    pointCount: points.length,
    grade: labGradeOf(total)
  }
}

export function labGradeOf(total) {
  if (total >= 85) return { label: '优秀', cls: 'good' }
  if (total >= 70) return { label: '良好', cls: 'mid' }
  if (total >= 60) return { label: '合格', cls: 'mid' }
  return { label: '待提高', cls: 'bad' }
}

export function buildLabComment(result) {
  const hitPts = result.points.filter(p => p.hit)
  const missPts = result.points.filter(p => !p.hit)
  const missByDim = {}
  missPts.forEach(p => { (missByDim[p.dim] = missByDim[p.dim] || []).push(p.text) })

  const paragraphs = []

  if (hitPts.length) {
    const strength = hitPts.slice(0, 3).map(p => '「' + p.text + '」').join('、')
    paragraphs.push('你抓住了 ' + hitPts.length + ' 个关键判读点，包括' + strength + '，整体方向是正确的。')
  } else {
    paragraphs.push('你的解读尚未触及本例的核心判读点，建议先逐项对照参考区间，找出达到危急值和进行性变化的指标。')
  }

  ;['abnormal', 'meaning', 'reasoning', 'plan'].forEach(k => {
    const list = missByDim[k]
    if (!list || !list.length) return
    const names = list.slice(0, 2).join('；')
    paragraphs.push('在「' + LAB_DIMS[k].name + '」上仍有欠缺：' + names + (list.length > 2 ? ' 等 ' + list.length + ' 处未覆盖' : '') + '。')
  })

  if (result.penalties.length) {
    paragraphs.push('注意：' + result.penalties.map(p => p.text).join('；') + '，这会直接影响判读结论的安全性和准确性。')
  }

  if (result.total >= 85) {
    paragraphs.push('整体解读层次清晰，异常识别与临床推断能够相互印证，建议进一步精简表述、突出处置优先级。')
  } else if (result.total >= 70) {
    paragraphs.push('建议按「异常识别 → 机制与临床意义 → 诊断方向 → 处置建议」的顺序补全，重点检查尚未覆盖的维度。')
  } else {
    paragraphs.push('建议以危急值和进行性变化为线索重写：先列出所有异常及程度，再说明异常之间的关联，最后给出必须立即执行的检查与处置。')
  }

  return paragraphs
}
