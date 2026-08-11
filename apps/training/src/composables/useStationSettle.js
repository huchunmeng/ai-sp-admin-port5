import { PROJECT_TO_STATION_TARGET } from './useStationFlow'

// 训练结算建站逻辑：CaseDetail「结算」与 ScoreReport 全流程结算共用，保证 stationId 用英文 routeName（权重匹配）

// 把考站内评分表权重摊平到 settle 用 stationId（普通模式按权重归一化单站满分100）
export function buildStationWeights(stationScheme) {
  const SETTLE_STATION_ID = {
    historyTaking: 'historyTaking',
    physicalExam: 'physicalExam',
    diagnosis: 'preliminaryDiag',
    treatmentPlan: 'treatmentPlan',
    medicalRecord: 'medicalRecord',
    caseAnalysis: 'analysis',
    humanisticComm: 'humanity',
    mentalExam: 'mentalExam'
  }
  const weights = {}
  for (const station of stationScheme) {
    for (const st of station.scoreTables || []) {
      const w = typeof st.weight === 'number' ? st.weight : null
      if (w === null) continue
      const projects = st.bindProjects || []
      const perProj = projects.length ? w / projects.length : w
      for (const proj of projects) {
        const target = PROJECT_TO_STATION_TARGET[proj]
        const settleId = SETTLE_STATION_ID[target]
        if (!settleId) continue
        weights[settleId] = (weights[settleId] || 0) + perProj
      }
    }
  }
  // 权重保留整数近似，避免浮点误差（各表权重本身为整数时 sum 恰为整数）
  for (const k of Object.keys(weights)) weights[k] = Math.round(weights[k] * 100) / 100
  return weights
}

// 将各考站训练数据统一为评分记录格式，并判断是否有数据
// 结构化表单模块（辅助检查/诊断/治疗计划等）字段拼成自由文本供评分模型理解
export function serializeStationRecords(data) {
  if (!data) return { records: {}, hasData: false }
  if (typeof data === 'string') {
    const text = data.trim()
    return { records: { dialog: [], exam: [], qa: [], freeText: text ? [{ text }] : [] }, hasData: !!text }
  }
  const hasData = !!(
    (data.messages && data.messages.length) ||
    (data.examHistory && data.examHistory.length) ||
    (data.answers && data.answers.length) ||
    data.content || data.notes || data.preliminary || data.differential || data.basis || data.plan ||
    (data.results && data.results.length) || (data.items && data.items.length)
  )
  const textParts = []
  if (data.notes) textParts.push(data.notes)
  if (data.content) textParts.push(data.content)
  if (data.preliminary) textParts.push('初步诊断：' + data.preliminary)
  if (data.differential) textParts.push('鉴别诊断：' + data.differential)
  if (data.differentialDetails && data.differentialDetails.length) {
    textParts.push('鉴别诊断依据：' + data.differentialDetails.map(d => `${d.name || ''}：${d.evidence || ''}`).filter(Boolean).join('；'))
  }
  if (data.basis) textParts.push('诊断依据：' + data.basis)
  if (data.results && data.results.length) {
    textParts.push('辅助检查结果：' + data.results.map(r => `${r.name || ''}${r.result ? `（${r.result}）` : ''}`).filter(Boolean).join('；'))
  }
  if (data.items && data.items.length) {
    textParts.push('检查项目：' + data.items.map(i => typeof i === 'string' ? i : (i.name || '')).join('、'))
  }
  if (data.plan) textParts.push(typeof data.plan === 'string' ? data.plan : JSON.stringify(data.plan))
  return {
    records: {
      dialog: data.messages || [],
      exam: data.examHistory || [],
      qa: data.qa || [],
      freeText: textParts.filter(Boolean).map(text => ({ text }))
    },
    hasData
  }
}

// 构建 settle 请求体：full-flow 用考站方案 routeName（英文键），其他模式用固定考站列表
export function buildSettlePayload({ store, caseObj, caseId }) {
  const ts = store.trainingSession || {}
  const stations = []
  // flow 全流程：按考站方案动态取 6 个模块；其他模式保留固定考站列表
  const flowKeys = (store.stationScheme || []).map(s => s.routeName).filter(Boolean)
  const STATION_KEYS = store.trainingVersion === 'full-flow' && flowKeys.length
    ? flowKeys
    : ['historyTaking', 'physicalExam', 'medicalRecord', 'preliminaryDiag', 'treatmentPlan', 'analysis', 'humanity', 'mentalExam']
  for (const sid of STATION_KEYS) {
    const data = ts[sid]
    let parsedSheet = null
    try {
      parsedSheet = sessionStorage.getItem(`aisp_parsed_scoresheet_${caseId}_${sid}`)
      if (!parsedSheet) parsedSheet = sessionStorage.getItem(`aisp_parsed_scoresheet_${caseId}`)
      if (parsedSheet) parsedSheet = JSON.parse(parsedSheet)
    } catch (e) { /* ignore */ }
    const { records, hasData } = serializeStationRecords(data)
    stations.push({
      stationId: sid,
      stationName: sid,
      hasData,
      parsedSheet: parsedSheet || [],
      records
    })
  }
  return {
    caseId,
    caseInfo: {
      case_id: caseId,
      specialty: store.specialty || (caseObj && caseObj.specialty) || '',
      training_phase: (caseObj && caseObj.training_phase) || '',
      difficulty: (caseObj && caseObj.difficulty) || ''
    },
    stations,
    trainingMode: store.trainingVersion,
    stationWeights: buildStationWeights(store.stationScheme || [])
  }
}
