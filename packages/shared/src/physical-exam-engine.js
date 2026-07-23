/**
 * 体格检查引擎 — 从现有2.0版病例数据中提取和展示体检信息
 * 适配现有 -basic.json 格式: physical_exam = { vital_signs, general, systemic }
 */

export function getVitalSigns(caseData) {
  return caseData?.physical_exam?.vital_signs || ''
}

export function getGeneralInspection(caseData) {
  return caseData?.physical_exam?.general || ''
}

export function getSystemicExam(caseData) {
  return caseData?.physical_exam?.systemic || ''
}

export function getAllExamText(caseData) {
  const pe = caseData?.physical_exam
  if (!pe) return ''
  return [pe.vital_signs, pe.general, pe.systemic].filter(Boolean).join('\n\n')
}

export function getExamSection(caseData, section) {
  return caseData?.physical_exam?.[section] || ''
}

export function evaluateExamObservation(studentObservations, caseData) {
  const fullText = getAllExamText(caseData)
  if (!fullText) return { score: 100, feedback: '无标准数据，略过评分' }

  // 评估学员观察是否覆盖了关键内容
  const keywords = extractKeywords(fullText)
  const found = keywords.filter(k => studentObservations.toLowerCase().includes(k.toLowerCase()))
  const score = keywords.length > 0 ? Math.round((found.length / keywords.length) * 100) : 100

  return {
    score: Math.min(100, score),
    found,
    missed: keywords.filter(k => !studentObservations.toLowerCase().includes(k.toLowerCase())),
    feedback: found.length >= keywords.length * 0.6 ? '体格检查描述较完整' : `遗漏了约${keywords.length - found.length}个关键发现`
  }
}

function extractKeywords(text) {
  // 提取可能的阳性发现关键词
  const markers = ['℃', '次/分', 'mmHg', '阳性', '肿大', '闻及', '压痛', '水肿', '红斑', '水疱', '糜烂',
    '浊音', '啰音', '增强', '减弱', '消失', '结节', '肿块', '皮疹', '出血', '异常']
  const found = []
  for (const m of markers) {
    const idx = text.indexOf(m)
    if (idx > 0) {
      const start = Math.max(0, idx - 15)
      const snippet = text.substring(start, idx + m.length).replace(/^\S+\s/, '')
      if (snippet.length > 3) found.push(snippet)
    }
  }
  return [...new Set(found)]
}
