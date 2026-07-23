/**
 * 诊断推理引擎 — 基于现有2.0版病例的诊断/鉴别/治疗数据进行验证和评分
 * 适配现有 -basic.json 格式: diagnosis = { preliminary, differential, basis }, treatment_plan = string
 */

export function getPreliminaryDiagnosis(caseData) {
  return caseData?.diagnosis?.preliminary || ''
}

export function getDifferentialDiagnoses(caseData) {
  return caseData?.diagnosis?.differential || []
}

export function getDiagnosisBasis(caseData) {
  return caseData?.diagnosis?.basis || []
}

export function getTreatmentPlan(caseData) {
  return caseData?.treatment_plan || ''
}

export function buildEvidenceOptions(caseData, sessionData) {
  const options = []

  if (caseData?.chief_complaint) {
    options.push({ source: '主诉', text: caseData.chief_complaint })
  }
  if (caseData?.present_illness) {
    options.push({ source: '现病史', text: caseData.present_illness.substring(0, 200) })
  }
  if (caseData?.physical_exam?.vital_signs) {
    options.push({ source: '生命体征', text: caseData.physical_exam.vital_signs })
  }
  if (caseData?.physical_exam?.systemic) {
    const systemic = caseData.physical_exam.systemic
    // Split into sentences for individual evidence items
    const sentences = systemic.split(/[。；;]/).filter(s => s.trim().length > 10)
    for (const s of sentences.slice(0, 5)) {
      options.push({ source: '体格检查', text: s.trim() })
    }
  }
  if (caseData?.lab_tests) {
    options.push({ source: '实验室', text: caseData.lab_tests.substring(0, 200) })
  }
  if (caseData?.imaging) {
    options.push({ source: '影像学', text: caseData.imaging })
  }

  return options
}

export function validateDiagnosis(caseData, studentDiagnosis) {
  const correct = getPreliminaryDiagnosis(caseData)
  if (!studentDiagnosis || !studentDiagnosis.trim()) {
    return { isCorrect: false, level: 'empty', score: 0 }
  }
  if (!correct) {
    return { isCorrect: true, level: 'no_reference', score: 100, reference: null }
  }

  const studentNorm = studentDiagnosis.trim().toLowerCase()
  const correctNorm = correct.toLowerCase()

  if (studentNorm === correctNorm) {
    return { isCorrect: true, level: 'exact', score: 100, reference: correct }
  }

  // 关键词匹配
  const keywords = extractKeywords(correctNorm)
  const matched = keywords.filter(k => studentNorm.includes(k))
  const ratio = keywords.length > 0 ? matched.length / keywords.length : 0

  if (ratio >= 0.7) {
    return { isCorrect: true, level: 'partial', score: Math.round(70 + ratio * 30), reference: correct }
  }

  return { isCorrect: false, level: 'mismatch', score: Math.round(ratio * 40), reference: correct }
}

function extractKeywords(text) {
  return text.split(/[,，、()（）\s]+/).filter(w => w.length >= 2 && !['的', '型', '和', '及', '为', '于'].includes(w))
}

export function evaluateDiagnosis(caseData, studentDiagnosis, selectedEvidence = []) {
  const validation = validateDiagnosis(caseData, studentDiagnosis)
  const basis = getDiagnosisBasis(caseData)

  let evidenceScore = 0
  if (basis.length > 0 && selectedEvidence.length > 0) {
    const matched = basis.filter(b =>
      selectedEvidence.some(e => b.includes(e.text) || e.text.includes(b.substring(0, 10)))
    ).length
    evidenceScore = Math.round((matched / basis.length) * 40)
  }

  return {
    accuracy: validation.score * 0.6,
    evidence: evidenceScore,
    totalScore: Math.round(validation.score * 0.6 + evidenceScore),
    validation
  }
}

export function evaluateDifferential(caseData, studentDifferential) {
  const required = getDifferentialDiagnoses(caseData)
  if (required.length === 0) {
    return { score: 100, missing: [], extra: [], feedback: '无标准答案，略过评分' }
  }

  const studentNames = (studentDifferential || []).map(d =>
    (typeof d === 'string' ? d : (d.disease || d.name || '')).toLowerCase()
  ).filter(Boolean)
  const requiredNorm = required.map(r => r.toLowerCase())

  const missing = required.filter(r => !studentNames.some(s => s.includes(r.toLowerCase()) || r.toLowerCase().includes(s)))
  const extra = studentNames.filter(s => !requiredNorm.some(r => r.includes(s) || s.includes(r)))

  const completeness = ((required.length - missing.length) / required.length) * 70
  const penalty = extra.length * 10
  const score = Math.max(0, Math.round(completeness - penalty + (missing.length === 0 ? 30 : 0)))

  return {
    score: Math.min(100, score),
    missing,
    extra,
    feedback: missing.length > 0 ? `缺少: ${missing.join('、')}` : '鉴别诊断完成'
  }
}

export function evaluateTreatment(caseData, studentTreatment) {
  const standard = getTreatmentPlan(caseData)
  if (!standard) return { score: 100, feedback: '无标准答案，略过评分', isStub: true }

  const studentNorm = (studentTreatment || '').toLowerCase()
  const stdNorm = standard.toLowerCase()

  // 提取治疗计划中的关键词（药品名、治疗措施）
  const keywords = ['激素', '甲泼尼龙', '泼尼松', '抗生素', '头孢', '青霉素', '阿奇霉素',
    '降压', '降糖', '二甲双胍', '胰岛素', '氨氯地平', '硝苯地平',
    '静脉', '口服', '外用', '湿敷', '护理', '监测', '随访',
    '休息', '吸氧', '饮食', '戒烟', '限酒']
  const present = keywords.filter(k => stdNorm.includes(k))

  if (present.length === 0) {
    return { score: 100, feedback: '评分关键词不足，略过' }
  }

  const found = present.filter(k => studentNorm.includes(k))
  const score = Math.round((found.length / present.length) * 100)

  return {
    score: Math.min(100, score),
    matched: found,
    missed: present.filter(k => !studentNorm.includes(k)),
    feedback: score >= 70 ? '治疗方案基本合理' : score >= 40 ? '治疗方案不够完整' : '治疗方案需大幅改进'
  }
}
