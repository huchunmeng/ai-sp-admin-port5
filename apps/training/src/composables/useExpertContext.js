// 专家智能体 — 活动感知层 (Activity Awareness Layer)
// 为每个考站定义 Data Extractor，将结构化数据转为自然语言摘要

import { STATION_TO_SESSION_KEY, STATION_ID_TO_LABEL } from '@ai-sp/shared'

// ── 路由名 → session key（补充 STATION_TO_SESSION_KEY 缺失的映射） ──
const ROUTE_TO_SESSION_KEY = {
  ...STATION_TO_SESSION_KEY,
  ancillaryTests: 'ancillaryTests',
  diagnosis: 'diagnosis',
}

// ── 考站类别 ──
const STATION_CATEGORY = {
  historyTaking: 'dialog',
  physicalExam: 'dialog',
  mentalExam: 'dialog',
  humanisticComm: 'dialog',
  ancillaryTests: 'selection',
  diagnosis: 'selection',
  preliminaryDiag: 'selection',
  caseAnalysis: 'text-input',
  medicalRecord: 'text-input',
  treatmentPlan: 'text-input',
}

export function getStationCategory(stationId) {
  return STATION_CATEGORY[stationId] || 'special'
}

// ── Data Extractors ──

function extractDialogStation(sessionData) {
  const messages = sessionData?.messages || []
  const notes = sessionData?.notes || ''
  const markedCount = sessionData?.markedCount || 0
  if (messages.length === 0) return null

  const userMsgs = messages.filter(m => m.role === 'user')
  const spMsgs = messages.filter(m => m.role === 'sp')
  const parts = [`共${messages.length}轮对话（学员发言${userMsgs.length}条）`]

  if (markedCount > 0) parts.push(`学员标记了${markedCount}条重要信息作为笔记`)
  if (notes) parts.push(`学员笔记：${notes.slice(0, 200)}`)

  // 最近5轮对话摘要
  const last5 = messages.slice(-5)
  const topics = last5
    .filter(m => m.role === 'user')
    .map(m => m.content?.slice(0, 40))
    .filter(Boolean)
  if (topics.length > 0) parts.push(`最近话题：${topics.join(' | ')}`)

  return {
    hasActivity: true,
    summary: parts.join('。'),
    detail: last5UserMsgs(last5).join('\n'),
  }
}

function extractPhysicalExam(sessionData) {
  const messages = sessionData?.messages || []
  const examHistory = sessionData?.examHistory || []
  if (messages.length === 0 && examHistory.length === 0) return null

  const parts = []
  if (examHistory.length > 0) {
    const operations = examHistory.slice(-15).map(e => e.original || e.lower).filter(Boolean)
    parts.push(`共${examHistory.length}次体检操作`)
    if (operations.length > 0) parts.push(`最近操作：${operations.join(' → ')}`)
  }
  if (messages.length > 0) {
    parts.push(`${messages.length}条系统反馈消息`)
  }

  return {
    hasActivity: true,
    summary: parts.join('。'),
    detail: messages.slice(-5).map(m => `系统：${m.content?.slice(0, 100)}`).join('\n'),
  }
}

function extractSelectionStation(sessionData) {
  if (!sessionData) return null

  // 辅助检查站
  if (sessionData.selections && Array.isArray(sessionData.selections)) {
    const selected = sessionData.selections
    if (selected.length === 0) return null
    const names = selected.map(s => s.name).filter(Boolean)
    const results = sessionData.results?.filter(r => r.viewed) || []
    const parts = [`选择了${selected.length}项辅助检查：${names.join('、')}`]
    if (results.length > 0) parts.push(`已查看${results.length}项检查结果`)
    return { hasActivity: true, summary: parts.join('。'), detail: names.join('\n') }
  }

  // 诊断站
  const preliminary = sessionData.preliminary || ''
  const differential = sessionData.differential || ''
  const basis = sessionData.basis || ''

  if (!preliminary && !differential && !basis) return null

  const parts = []
  if (preliminary) parts.push(`初步诊断：${preliminary}`)
  if (differential) parts.push(`鉴别诊断：${differential}`)
  if (basis) parts.push(`诊断依据：${basis.slice(0, 300)}`)

  return { hasActivity: true, summary: parts.join('；'), detail: parts.join('\n') }
}

function extractTextInputStation(sessionData) {
  if (!sessionData) return null

  // 临床思维站
  if (sessionData.answers && sessionData.questions) {
    const answered = sessionData.answers.filter(Boolean).length
    if (answered === 0) return null
    const parts = [`共${sessionData.questions.length}道病例分析题，已作答${answered}题`]
    sessionData.answers.forEach((ans, i) => {
      if (ans) parts.push(`第${i + 1}题答案：${ans.slice(0, 150)}`)
    })
    return { hasActivity: true, summary: parts[0], detail: parts.join('\n') }
  }

  // 病历书写站
  if (typeof sessionData === 'string') {
    const text = sessionData.trim()
    if (!text) return null
    return { hasActivity: true, summary: `已撰写病历，共${text.length}字`, detail: text.slice(0, 500) }
  }

  // 治疗计划站
  if (sessionData.content) {
    return { hasActivity: true, summary: `已制定治疗计划，共${sessionData.content.length}字`, detail: sessionData.content.slice(0, 500) }
  }

  return null
}

function last5UserMsgs(messages) {
  return messages
    .filter(m => m.role === 'user')
    .slice(-5)
    .map(m => `学员：${m.content}`)
}

// ── 主入口：构建活动上下文 ──

export function buildActivityContext(routeName, trainingSession) {
  const currentStationId = routeName || ''
  const currentStationLabel = STATION_ID_TO_LABEL[currentStationId] || currentStationId
  const currentCategory = getStationCategory(currentStationId)

  const stationSnapshots = {}
  const stationsWithActivity = []
  const stationsWithoutActivity = []
  let recentActivityStation = null

  // 遍历 trainingSession 中所有考站数据
  const allKeys = trainingSession ? Object.keys(trainingSession) : []

  for (const key of allKeys) {
    // 跳过非考站数据的key（如 caseId, stationId 等顶层字段）
    const sessionData = trainingSession[key]
    if (!sessionData || typeof sessionData !== 'object') continue

    // 找到这个 session key 对应的 stationId
    const stationId = findStationIdBySessionKey(key)
    if (!stationId) continue

    const category = getStationCategory(stationId)
    let snapshot = null

    if (stationId === 'physicalExam') {
      snapshot = extractPhysicalExam(sessionData)
    } else if (category === 'dialog') {
      snapshot = extractDialogStation(sessionData)
    } else if (category === 'selection') {
      snapshot = extractSelectionStation(sessionData)
    } else if (category === 'text-input') {
      snapshot = extractTextInputStation(sessionData)
    }

    if (snapshot) {
      snapshot.category = category
      snapshot.stationLabel = STATION_ID_TO_LABEL[stationId] || stationId
      stationSnapshots[stationId] = snapshot
      stationsWithActivity.push(stationId)
      recentActivityStation = stationId
    }
  }

  // 标记所有无活动的考站
  for (const [stationId, category] of Object.entries(STATION_CATEGORY)) {
    if (!stationSnapshots[stationId]) {
      stationSnapshots[stationId] = {
        hasActivity: false,
        category,
        stationLabel: STATION_ID_TO_LABEL[stationId] || stationId,
        summary: null,
        detail: null,
      }
      stationsWithoutActivity.push(stationId)
    }
  }

  return {
    currentStation: {
      id: currentStationId,
      label: currentStationLabel,
      category: currentCategory,
    },
    stationSnapshots,
    global: {
      stationsWithActivity,
      stationsWithoutActivity,
      recentActivityStation,
      totalVisited: stationsWithActivity.length,
      hasAnyActivity: stationsWithActivity.length > 0,
    },
  }
}

function findStationIdBySessionKey(sessionKey) {
  // sessionKey 反向查找 stationId
  for (const [stationId, key] of Object.entries(ROUTE_TO_SESSION_KEY)) {
    if (key === sessionKey) return stationId
  }
  // 直接匹配
  if (STATION_CATEGORY[sessionKey]) return sessionKey
  // 特殊映射
  if (sessionKey === 'humanisticComm') return 'humanisticComm'
  if (sessionKey === 'preliminaryDiag') return 'preliminaryDiag'
  if (sessionKey === 'caseAnalysis') return 'caseAnalysis'
  return null
}
