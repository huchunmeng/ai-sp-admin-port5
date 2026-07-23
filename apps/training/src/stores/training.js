import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { STATION_TO_SESSION_KEY, getStationLabel, STATION_LABEL_TO_IDS } from '@ai-sp/shared'

/** JSON.stringify 安全版：防御循环引用 */
function safeStringify(obj) {
  const seen = new WeakSet()
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) return '[Circular]'
      seen.add(value)
    }
    return value
  })
}

export const useTrainingStore = defineStore('training', () => {
  const phase = ref('resident')
  const specialty = ref(null)
  const lang = ref('zh')
  const currentStation = ref(null)
  const trainingSession = ref(null)
  const selectedStations = ref([])
  const currentCase = ref(null)
  const currentRecord = ref(null)
  const appVersion = ref('2.0')

  // 考站流程
  const stationFlow = ref(null)
  const stationScheme = ref(null)
  const currentFlowIndex = ref(0)
  const sessionEpoch = ref(null)  // 每次训练的唯一标识（13位毫秒时间戳）
  const trainingVersion = ref(null)  // 当前训练会话的版本标记: '1.0' / '2.0' / 'full-flow'

  // LLM 配置
  const llmConfig = ref({
    available: true,
    failCount: 0,
    model: '',
  })

  const currentStationConfig = computed(() => {
    if (!stationFlow.value?.stations) return null
    return stationFlow.value.stations[stationFlow.value.currentIndex] || null
  })

  // ═══ 持久化 ═══
  function saveState() {
    try {
      localStorage.setItem('training-app-state', JSON.stringify({
        phase: phase.value,
        specialty: specialty.value,
        appVersion: appVersion.value,
        currentCase: currentCase.value,
        currentRecord: currentRecord.value
      }))
    } catch (e) { console.warn('[store] saveState failed:', e) }
  }

  function loadState() {
    try {
      const saved = localStorage.getItem('training-app-state')
      if (saved) {
        const s = JSON.parse(saved)
        if (s.phase) phase.value = s.phase
        if (s.specialty) specialty.value = s.specialty
        if (s.appVersion) appVersion.value = s.appVersion
        if (s.currentCase) currentCase.value = s.currentCase
        if (s.currentRecord) currentRecord.value = s.currentRecord
      }
    } catch (e) { console.warn('[store] loadState failed:', e) }
  }

  // 自动持久化 currentCase / currentRecord
  watch([currentCase, currentRecord], () => saveState(), { deep: true })

  function saveTrainingSession() {
    if (!trainingSession.value) return
    try {
      localStorage.setItem('training-session', JSON.stringify(trainingSession.value))
    } catch (e) { console.warn('[store] saveTrainingSession failed:', e) }

    // 实时推送到服务端
    const c = currentCase.value
    const caseId = c?.case_id || c?.id
    if (caseId) {
      fetch('/api/training/session-save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId, sessionData: trainingSession.value, sessionEpoch: sessionEpoch.value })
      }).catch(() => { /* 静默，localStorage 已有副本 */ })
    }
  }

  function loadTrainingSession() {
    try {
      const saved = localStorage.getItem('training-session')
      if (saved) {
        trainingSession.value = JSON.parse(saved)
      }
    } catch (e) { console.warn('[store] loadTrainingSession failed:', e) }
  }

  async function loadSessionDataFromServer(caseId, epoch) {
    try {
      const se = epoch || sessionEpoch.value
      const resp = await fetch('/api/training/session-data?caseId=' + encodeURIComponent(caseId)
        + (se ? '&sessionEpoch=' + se : ''))
      const json = await resp.json()
      if (json.ok && json.data && json.data.sessionData) {
        trainingSession.value = json.data.sessionData
        saveTrainingSession()
      }
    } catch (e) {
      console.warn('[store] loadSessionDataFromServer failed:', e.message)
    }
  }

  const RECORDS_KEY = 'training_records'

  function addTrainingRecord(record) {
    // 内置版本统一考站名称
    if (trainingVersion.value === '1.0') {
      record.stationName = '病史采集'
    } else if (trainingVersion.value === 'full-flow') {
      record.stationName = '临床思维模拟训练'
    }
    try {
      const records = JSON.parse(localStorage.getItem(RECORDS_KEY) || '{}')
      const ts = Date.now()
      const recordedAt = new Date().toISOString()
      const se = sessionEpoch.value

      // 同一 sessionEpoch + 同一考站（含同站多项目）合并为一条训练记录
      if (se) {
        // 先按 stationId 精确匹配，再检查是否属于同一考站的不同项目（如 historyTaking + mentalExam ∈ 接诊病人站）
        let existing = Object.entries(records).find(([, r]) => r.caseId === record.caseId && r.stationId === record.stationId && r.sessionEpoch === se)
        if (!existing) {
          existing = Object.entries(records).find(([, r]) => {
            if (r.caseId !== record.caseId || r.sessionEpoch !== se) return false
            // 检查两个 stationId 是否属于同一考站
            for (const ids of Object.values(STATION_LABEL_TO_IDS)) {
              if (ids.includes(record.stationId) && ids.includes(r.stationId)) return true
            }
            return false
          })
        }
        if (existing) {
          const [existingKey, existingRec] = existing
          existingRec.duration = (existingRec.duration || 0) + (record.duration || 0)
          if (record.score != null) existingRec.score = record.score
          existingRec.recordedAt = recordedAt
          existingRec.ts = ts
          if (!existingRec._stationIds) existingRec._stationIds = [existingRec.stationId]
          if (!existingRec._stationIds.includes(record.stationId)) existingRec._stationIds.push(record.stationId)
          // 更新 session 快照
          const sessionKey = STATION_TO_SESSION_KEY[record.stationId]
            || Object.entries(STATION_TO_SESSION_KEY).find(([,v]) => v === record.stationId)?.[0]
          if (sessionKey && trainingSession.value?.[sessionKey]) {
            existingRec.rawData = { ...(existingRec.rawData || {}), [sessionKey]: trainingSession.value[sessionKey] }
          }
          localStorage.setItem(RECORDS_KEY, safeStringify(records))
          syncRecordsToServer()
          return { key: existingKey, recordedAt }
        }
      }

      const key = record.caseId + '_' + (record.stationId || 'reception') + '_' + ts
      const sessionKey = STATION_TO_SESSION_KEY[record.stationId]
        || Object.entries(STATION_TO_SESSION_KEY).find(([,v]) => v === record.stationId)?.[0]
      const sessionData = sessionKey ? trainingSession.value?.[sessionKey] : null
      records[key] = {
        ...record,
        ts,
        recordedAt,
        sessionEpoch: se,
        trainingVersion: trainingVersion.value,
        ...(sessionData ? { rawData: sessionData } : {}),
      }
      localStorage.setItem(RECORDS_KEY, safeStringify(records))
      syncRecordsToServer()
      return { key, recordedAt }
    } catch (e) { console.warn('[store] addTrainingRecord failed:', e); return {} }
  }

  function getTrainingRecords(caseId) {
    try {
      const records = JSON.parse(localStorage.getItem(RECORDS_KEY) || '{}')
      const list = caseId
        ? Object.entries(records).filter(([,r]) => r.caseId === caseId).map(([key, val]) => ({ ...val, id: key }))
        : Object.entries(records).map(([key, val]) => ({ ...val, id: key }))
      // 按 sessionEpoch 合并：同一 sessionEpoch 的记录合并为一条
      const merged = []
      const seenEpochs = new Set()
      for (const r of list) {
        const se = r.sessionEpoch
        if (se && seenEpochs.has(se)) {
          const existing = merged.find(m => m.sessionEpoch === se)
          if (existing) {
            existing.duration = (existing.duration || 0) + (r.duration || 0)
            if (r.score != null && (existing.score == null || r.score > existing.score)) existing.score = r.score
            if (new Date(r.recordedAt) > new Date(existing.recordedAt)) existing.recordedAt = r.recordedAt
            if (!existing._stationIds) existing._stationIds = [existing.stationId]
            if (!existing._stationIds.includes(r.stationId)) existing._stationIds.push(r.stationId)
          }
        } else {
          if (se) seenEpochs.add(se)
          merged.push({ ...r })
        }
      }
      // 按时间倒序，最新记录在前
      merged.sort((a, b) => new Date(b.recordedAt) - new Date(a.recordedAt))
      // 展开 _stationIds：全流程合并记录中每个考站独立为一行
      // 但同站多项目（如 historyTaking + mentalExam ∈ 接诊病人站）不展开
      const expanded = []
      for (const r of merged) {
        expanded.push(r)
        const extraIds = (r._stationIds || []).filter(id => {
          if (id === r.stationId) return false
          for (const ids of Object.values(STATION_LABEL_TO_IDS)) {
            if (ids.includes(id) && ids.includes(r.stationId)) return false
          }
          return true
        })
        for (const extraId of extraIds) {
          const sessionKey = STATION_TO_SESSION_KEY[extraId]
          const subData = sessionKey ? (r.rawData || {})[sessionKey] : null
          expanded.push({
            ...r,
            id: (r.id || r.key || '') + '__' + extraId,
            stationId: extraId,
            stationName: getStationLabel(extraId),
            stationLabel: getStationLabel(extraId),
            duration: (subData && subData.duration) || 0,
            _expandedFrom: r.id || r.key,
          })
        }
      }
      return expanded
    } catch (e) {
      return []
    }
  }

  function getCaseTrainingStatus(caseId) {
    const records = getTrainingRecords(caseId)
    // 按当前版本过滤训练状态：1.0版只看1.0记录，2.0版看2.0/full-flow
    const v = appVersion.value
    const versionRecords = v === '1.0'
      ? records.filter(r => r.trainingVersion === '1.0')
      : records.filter(r => r.trainingVersion !== '1.0')  // '2.0' / 'full-flow' / undefined(展开记录)
    return versionRecords.length > 0 ? 'trained' : 'not_trained'
  }

  // stationId → trainingSession key 映射（来自 @ai-sp/shared）

  async function loadRecordsFromServer() {
    try {
      // 1. 加载原始记录（含 rawData，用于操作记录展示）
      const rawResp = await fetch('/api/training-records')
      if (rawResp.ok) {
        const rawJson = await rawResp.json()
        if (rawJson.ok && rawJson.data) {
          // 修正历史数据中错误的 stationName
          for (const key of Object.keys(rawJson.data)) {
            const r = rawJson.data[key]
            const label = getStationLabel(r.stationId)
            if (label && r.stationName !== label) {
              r.stationName = label
            }
          }
          // 合并而非覆盖：localStorage 中可能有无服务端尚未同步的最新记录
          const localRecords = JSON.parse(localStorage.getItem(RECORDS_KEY) || '{}')
          const merged = { ...rawJson.data, ...localRecords }
          localStorage.setItem(RECORDS_KEY, JSON.stringify(merged))
          rebuildSessionFromRecords(merged)
        }
      }
    } catch (e) {
      console.warn('[store] loadRecordsFromServer(raw) failed:', e.message)
    }

    try {
      // 2. 加载 enriched records（含真实分数），更新 localStorage 中的 score/hasReport
      const enrichedResp = await fetch('/api/training/enriched-records')
      if (enrichedResp.ok) {
        const enrichedJson = await enrichedResp.json()
        if (enrichedJson.ok && enrichedJson.data) {
          const records = JSON.parse(localStorage.getItem(RECORDS_KEY) || '{}')
          for (const item of enrichedJson.data) {
            if (records[item.key]) {
              records[item.key].score = item.score
              records[item.key].hasReport = item.hasReport
              records[item.key].reportTimestamp = item.reportTimestamp
              if (item.stationLabel) records[item.key].stationName = item.stationLabel
            }
          }
          localStorage.setItem(RECORDS_KEY, JSON.stringify(records))
        }
      }
    } catch (e) {
      console.warn('[store] loadRecordsFromServer(enriched) failed:', e.message)
    }
  }

  function rebuildSessionFromRecords(records) {
    // 从记录 rawData 合并到当前 session：已有 key 保留（当前会话数据更新），缺失的补上
    const session = { ...(trainingSession.value || {}) }
    let hasNew = false
    Object.values(records).forEach(r => {
      const key = STATION_TO_SESSION_KEY[r.stationId]
      if (key && r.rawData && !session[key]) {
        session[key] = r.rawData
        hasNew = true
      } else if (key && r.messages?.length && !session[key]) {
        session[key] = { messages: r.messages }
        hasNew = true
      }
    })
    if (hasNew && Object.keys(session).length > 0) {
      trainingSession.value = session
      saveTrainingSession()
    }
  }

  async function syncRecordsToServer() {
    try {
      const records = JSON.parse(localStorage.getItem(RECORDS_KEY) || '{}')
      await fetch('/api/training-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(records)
      })
    } catch (e) {
      console.warn('[store] syncRecordsToServer failed:', e.message)
    }
  }

  loadState()
  loadTrainingSession()
  loadRecordsFromServer()

  // ═══ 活跃训练流程（断点续训） ═══
  const ACTIVE_FLOW_KEY = 'active-training-flow'
  const activeFlow = ref(null)

  function saveActiveFlow(caseId, stations, currentStationId) {
    const c = currentCase.value
    const p = c?.patient || {}
    const flow = {
      caseId,
      caseName: p.name || c?.title || '',
      caseDisease: c?.disease || '',
      caseSpecialty: c?.specialty || '',
      caseDifficulty: c?.difficulty || '',
      caseChiefComplaint: c?.chiefComplaint || '',
      casePatientGender: p.gender || '',
      casePatientAge: p.age || '',
      casePatientAvatar: p.avatar || '',
      caseSymptoms: c?.symptoms || [],
      stationFlow: stationFlow.value ? { stations: stationFlow.value.stations, currentIndex: stationFlow.value.currentIndex } : null,
      stationScheme: stationScheme.value,
      currentStationId: currentStationId || null,
      startedAt: new Date().toISOString(),
      sessionEpoch: sessionEpoch.value,
      currentFlowIndex: currentFlowIndex.value,
      trainingVersion: trainingVersion.value
    }
    activeFlow.value = flow
    try { localStorage.setItem(ACTIVE_FLOW_KEY, JSON.stringify(flow)) } catch (e) { /* ignore */ }
  }

  function loadActiveFlow() {
    try {
      const raw = localStorage.getItem(ACTIVE_FLOW_KEY)
      if (raw) {
        activeFlow.value = JSON.parse(raw)
        if (activeFlow.value.sessionEpoch) sessionEpoch.value = activeFlow.value.sessionEpoch
        if (activeFlow.value.stationFlow) stationFlow.value = activeFlow.value.stationFlow
        if (activeFlow.value.stationScheme) stationScheme.value = activeFlow.value.stationScheme
        if (activeFlow.value.currentFlowIndex != null) currentFlowIndex.value = activeFlow.value.currentFlowIndex
        if (activeFlow.value.trainingVersion) trainingVersion.value = activeFlow.value.trainingVersion
        return activeFlow.value
      }
    } catch (e) { /* ignore */ }
    return null
  }

  function hasUnfinishedSession(caseId) {
    const flow = loadActiveFlow()
    if (flow && flow.caseId === caseId) {
      const elapsed = Date.now() - new Date(flow.startedAt).getTime()
      // 超过24小时的训练视为放弃
      if (elapsed > 24 * 60 * 60 * 1000) return null
      return {
        caseId: flow.caseId,
        stationName: flow.currentStationId || 'unknown',
        startedAt: flow.startedAt
      }
    }
    // 回退：检查 trainingSession 是否有未评分的考站数据
    try {
      const ts = trainingSession.value
      if (ts) {
        const stationKeys = Object.keys(ts).filter(k => typeof ts[k] === 'object' && ts[k] !== null)
        if (stationKeys.length > 0) {
          const records = JSON.parse(localStorage.getItem(RECORDS_KEY) || '{}')
          const hasUnscored = stationKeys.some(sid => {
            // 查找该 case+station 的最新记录（key 格式：caseId_stationId_timestamp）
            const latest = Object.values(records)
              .filter(r => r.caseId === caseId && r.stationId === sid)
              .sort((a, b) => new Date(b.recordedAt) - new Date(a.recordedAt))[0]
            return !latest || latest.score === 0
          })
          if (hasUnscored) {
            return {
              caseId,
              stationName: stationKeys[stationKeys.length - 1] || 'unknown',
              startedAt: null
            }
          }
        }
      }
    } catch (e) { /* ignore */ }
    return null
  }

  function clearActiveFlow() {
    activeFlow.value = null
    try { localStorage.removeItem(ACTIVE_FLOW_KEY) } catch (e) { /* ignore */ }
  }

  // 启动时恢复活跃流程
  loadActiveFlow()

  // ═══ Actions ═══
  function setPhase(p) { phase.value = p; saveState() }
  function setSpecialty(s) { specialty.value = s; saveState() }
  function setVersion(v) { appVersion.value = v; saveState() }

  function startStationFlow(stations) {
    stationScheme.value = stations
    currentFlowIndex.value = 0
    stationFlow.value = { stations, currentIndex: 0 }
    sessionEpoch.value = Date.now()  // 每次训练生成唯一会话标识
    saveTrainingSession()
    if (currentCase.value) {
      saveActiveFlow(currentCase.value.id, stations, stations[0]?.name || null)
      // 清除该病例所有评分缓存，确保每次训练重新评分
      clearScoringCache(currentCase.value.id)
    }
  }

  function advanceStation() {
    if (!stationFlow.value?.stations) return null
    const max = stationFlow.value.stations.length - 1
    if (currentFlowIndex.value < max) {
      currentFlowIndex.value++
      stationFlow.value.currentIndex = currentFlowIndex.value
      saveTrainingSession()
      const next = stationFlow.value.stations[currentFlowIndex.value]
      if (currentCase.value) {
        saveActiveFlow(currentCase.value.id, stationFlow.value.stations, next?.name || null)
      }
      return next
    }
    return null
  }

  function saveSessionStage(stage, data) {
    if (!trainingSession.value) trainingSession.value = {}
    trainingSession.value[stage] = data
    saveTrainingSession()
  }

  function clearScoringCache(caseId) {
    const prefix = `aisp_scoring_result_${caseId}_`
    try {
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const key = sessionStorage.key(i)
        if (key && key.startsWith(prefix)) sessionStorage.removeItem(key)
      }
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i)
        if (key && key.startsWith(prefix)) localStorage.removeItem(key)
      }
    } catch (e) { /* ignore */ }
  }

  function resetForNewSession(caseId) {
    // 清除评分缓存（确保每次训练重新评分）
    clearScoringCache(caseId)
    // 清除旧 trainingSession，让各站重新填充
    trainingSession.value = null
    sessionEpoch.value = Date.now()
    trainingVersion.value = null
    try { localStorage.removeItem('training-session') } catch (e) { /* ignore */ }
  }

  function clearSession() {
    trainingSession.value = null
    stationFlow.value = null
    stationScheme.value = null
    currentFlowIndex.value = 0
    sessionEpoch.value = null
    clearActiveFlow()
    try { localStorage.removeItem('training-session') } catch (e) { console.warn('[store] clearSession failed:', e) }
  }

  function setLlmAvailable(available) {
    llmConfig.value.available = available
  }

  return {
    phase, specialty, lang, currentStation, trainingSession, selectedStations,
    currentCase, currentRecord, appVersion,
    stationFlow, stationScheme, currentFlowIndex, llmConfig,
    currentStationConfig,
    setPhase, setSpecialty, setVersion,
    startStationFlow, advanceStation,
    saveSessionStage, clearSession,
    saveState, saveTrainingSession,
    addTrainingRecord, getTrainingRecords, getCaseTrainingStatus,
    loadRecordsFromServer, loadSessionDataFromServer,
    activeFlow, saveActiveFlow, hasUnfinishedSession, clearActiveFlow, loadActiveFlow,
    clearScoringCache, resetForNewSession,
    setLlmAvailable,
    sessionEpoch, trainingVersion,
  }
})
