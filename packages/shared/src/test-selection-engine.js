/**
 * 辅助检查引擎 — 从现有2.0版病例数据中提取检查项目
 * 适配现有 -basic.json 格式: lab_tests/imaging/special_exams 均为文本字符串
 */

export function getLabTests(caseData) {
  return caseData?.lab_tests || ''
}

export function getImaging(caseData) {
  return caseData?.imaging || ''
}

export function getSpecialExams(caseData) {
  return caseData?.special_exams || ''
}

export function getAvailableTestsSummary(caseData) {
  const items = []
  if (caseData?.lab_tests) items.push({ category: '实验室检查', content: caseData.lab_tests })
  if (caseData?.imaging) items.push({ category: '影像学检查', content: caseData.imaging })
  if (caseData?.special_exams) items.push({ category: '特殊检查', content: caseData.special_exams })
  return items
}

export function getAllTestsText(caseData) {
  return [caseData?.lab_tests, caseData?.imaging, caseData?.special_exams].filter(Boolean).join('\n\n')
}

export function getTestCategories(caseData) {
  const cats = new Map()
  if (caseData?.lab_tests) cats.set('实验室检查', parseTestItems(caseData.lab_tests))
  if (caseData?.imaging) cats.set('影像学检查', parseTestItems(caseData.imaging))
  if (caseData?.special_exams) cats.set('特殊检查', parseTestItems(caseData.special_exams))
  return cats
}

function parseTestItems(text) {
  // 按句子/分号分割，提取检查项目名
  const items = []
  const sentences = text.split(/[。；;]/)
  for (const s of sentences) {
    const trimmed = s.trim()
    if (!trimmed) continue
    const nameEnd = trimmed.indexOf('：') > 0 ? trimmed.indexOf('：') : trimmed.indexOf(':')
    const name = nameEnd > 0 ? trimmed.substring(0, nameEnd).trim() : trimmed.substring(0, Math.min(30, trimmed.length))
    if (name.length > 2) {
      items.push({
        name,
        result: nameEnd > 0 ? trimmed.substring(nameEnd + 1).trim() : trimmed,
        isKeyTest: false,
        cost: 0
      })
    }
  }
  return items
}

export function evaluateTestSelection(studentSelections, caseData) {
  const allText = getAllTestsText(caseData)
  if (!allText) return { score: 100, feedback: '无标准数据，略过评分' }

  const available = getTestCategories(caseData)
  let totalItems = 0
  for (const items of available.values()) totalItems += items.length

  const selectedCount = studentSelections?.length || 0
  const score = totalItems > 0 ? Math.min(100, Math.round((selectedCount / Math.max(3, totalItems * 0.6)) * 100)) : 100

  return {
    score,
    totalAvailable: totalItems,
    selectedCount,
    feedback: selectedCount >= Math.min(3, totalItems) ? '检查选择基本合理' : '建议选择更多必要的检查项目'
  }
}
