// 临床思维模拟训练 — 全局操作记录提取
// 从 trainingSession 中读取各站已提交数据，生成操作摘要

const STATION_ORDER = [
  { key: 'historyTaking', label: '问诊记录', labelEn: 'Consultation', icon: 'fa-comments' },
  { key: 'physicalExam', label: '查体记录', labelEn: 'Physical Exam', icon: 'fa-stethoscope' },
  { key: 'ancillaryTests', label: '辅检记录', labelEn: 'Ancillary Tests', icon: 'fa-flask' },
  { key: 'diagnosis', label: '诊断记录', labelEn: 'Diagnosis', icon: 'fa-clipboard-check' },
  { key: 'treatmentPlan', label: '治疗记录', labelEn: 'Treatment Plan', icon: 'fa-prescription' },
  { key: 'medicalRecord', label: '病历记录', labelEn: 'Medical Record', icon: 'fa-file-medical' },
]

function extractHistoryTaking(session) {
  const data = session.historyTaking
  if (!data?.messages?.length) return null

  const userMsgs = data.messages.filter(m => m.role === 'user')
  const spMsgs = data.messages.filter(m => m.role === 'sp')
  const parts = [`共${data.messages.length}轮对话（学员提问${userMsgs.length}条，SP回答${spMsgs.length}条）`]

  const lastUser = userMsgs.slice(-10).map(m => m.content?.slice(0, 80)).filter(Boolean)
  const lastSp = spMsgs.slice(-10).map(m => m.content?.slice(0, 80)).filter(Boolean)

  return {
    summary: parts[0],
    detail: {
      questions: lastUser,
      answers: lastSp,
      totalRounds: Math.ceil(data.messages.length / 2),
      notes: data.notes || '',
    }
  }
}

function extractPhysicalExam(session) {
  const data = session.physicalExam
  if (!data) return null
  const examHistory = data.examHistory || []
  const messages = data.messages || []
  if (!examHistory.length && !messages.length) return null

  const operations = examHistory.slice(-20).map(e => e.original || e.lower || e.name).filter(Boolean)
  const systemMsgs = messages.filter(m => m.role === 'system' || m.role === 'sp').slice(-10)

  return {
    summary: `共${examHistory.length}项体检操作`,
    detail: {
      operations,
      feedback: systemMsgs.map(m => m.content?.slice(0, 120)).filter(Boolean),
      totalOps: examHistory.length,
    }
  }
}

function extractAncillaryTests(session) {
  const data = session.ancillaryTests
  if (!data) return null
  const selections = data.selections || []
  const results = data.results || []
  if (!selections.length && !results.length) return null

  const selectedNames = selections.map(s => s.name).filter(Boolean)
  const viewedResults = results.filter(r => r.viewed)
  const resultItems = viewedResults.map(r => ({
    name: r.name || '',
    result: r.result || r.content || '',
  }))

  return {
    summary: `选择了${selectedNames.length}项检查（${selectedNames.slice(0, 8).join('、')}${selectedNames.length > 8 ? '...' : ''}），已查看${viewedResults.length}项结果`,
    detail: {
      selected: selectedNames,
      results: resultItems,
      totalSelected: selectedNames.length,
      totalViewed: viewedResults.length,
    }
  }
}

function extractDiagnosis(session) {
  const data = session.diagnosis || session.preliminaryDiag
  if (!data) return null
  const preliminary = data.preliminary || ''
  const differential = data.differential || ''
  const basis = data.basis || ''
  if (!preliminary && !differential && !basis) return null

  const parts = []
  if (preliminary) parts.push(`初步诊断：${preliminary}`)
  if (differential) parts.push(`鉴别诊断：${differential}`)
  if (basis) parts.push(`诊断依据：${basis.slice(0, 200)}`)

  const diffDetails = data.differentialDetails || []

  return {
    summary: parts.slice(0, 2).join('；'),
    detail: {
      preliminary,
      differential,
      basis,
      differentialDetails: diffDetails.map(d => ({
        name: d.name || '',
        evidence: (d.evidence || '').slice(0, 200),
      })),
    }
  }
}

function extractTreatmentPlan(session) {
  const data = session.treatmentPlan
  if (!data) return null
  const content = data.content || ''
  if (!content.trim()) return null

  return {
    summary: `治疗计划共${content.length}字`,
    detail: {
      content: content.slice(0, 500),
      fullLength: content.length,
    }
  }
}

function extractMedicalRecord(session) {
  const data = session.medicalRecord
  if (!data) return null
  const text = typeof data === 'string' ? data : (data.content || '')
  if (!text.trim()) return null

  return {
    summary: `病历共${text.length}字`,
    detail: {
      content: text.slice(0, 500),
      fullLength: text.length,
    }
  }
}

const EXTRACTORS = {
  historyTaking: extractHistoryTaking,
  physicalExam: extractPhysicalExam,
  ancillaryTests: extractAncillaryTests,
  diagnosis: extractDiagnosis,
  treatmentPlan: extractTreatmentPlan,
  medicalRecord: extractMedicalRecord,
}

export function buildOperationLog(trainingSession) {
  if (!trainingSession) return []

  return STATION_ORDER.map(station => {
    const extractor = EXTRACTORS[station.key]
    const result = extractor ? extractor(trainingSession) : null

    return {
      key: station.key,
      label: station.label,
      labelEn: station.labelEn,
      icon: station.icon,
      hasData: !!result,
      summary: result?.summary || '',
      detail: result?.detail || null,
    }
  })
}
