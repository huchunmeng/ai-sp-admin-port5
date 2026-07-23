import { ref, computed } from 'vue'
import { useTrainingStore } from '@/stores/training.js'
import { loadAllSchemes, residencySchemes, collegeSchemes, specialtySchemes, resolveStationKey, getSpecialty } from '@ai-sp/shared'

// 考站名称 → 路由名称 + 视图组件映射
const STATION_ROUTE_MAP = {
  '接诊病人站':   { route: 'historyTaking',  label: '接诊病人' },
  '接诊和沟通站': { route: 'historyTaking',  label: '接诊和沟通' },
  '病史采集站':   { route: 'historyTaking',  label: '病史采集' },
  '体格检查站':   { route: 'physicalExam',   label: '体格检查' },
  '临床思维站':   { route: 'caseAnalysis',   label: '临床思维' },
  '交流沟通站':   { route: 'humanisticComm', label: '交流沟通' },
  '病历书写站':   { route: 'medicalRecord',  label: '病历书写' },
  '精神检查站':   { route: 'mentalExam',     label: '精神检查' }
}

// 考站内项目名称 → 路由名称映射
const PROJECT_ROUTE_MAP = {
  '病史采集': { route: 'historyTaking' },
  '体格检查': { route: 'physicalExam' },
  '辅助检查': { route: 'ancillaryTests' },
  '初步诊断': { route: 'diagnosis' },
  '诊断':     { route: 'diagnosis' },
  '治疗计划': { route: 'treatmentPlan' },
  '病历书写': { route: 'medicalRecord' },
  '病例分析': { route: 'caseAnalysis' },
  '人文沟通': { route: 'humanisticComm' },
  '精神检查': { route: 'mentalExam' },
}

// 考核项目名称 → station target 映射（用于评分表按 target 分发）
const PROJECT_TO_STATION_TARGET = {
  '病史采集': 'historyTaking',
  '体格检查': 'physicalExam',
  '辅助检查': 'ancillaryTests',
  '初步诊断': 'diagnosis',
  '诊断':     'diagnosis',
  '治疗计划': 'treatmentPlan',
  '病历书写': 'medicalRecord',
  '病例分析': 'caseAnalysis',
  '人文沟通': 'humanisticComm',
  '交流沟通站': 'humanisticComm',
  '精神检查': 'mentalExam',
}

// 从共享方案数据构建完整专业→考站映射（同步导入，始终可用，覆盖全部专业）
function buildMajorStationMap() {
  const allSchemes = [...residencySchemes, ...collegeSchemes, ...specialtySchemes]
  const map = {}
  for (const scheme of allSchemes) {
    for (const major of (scheme.majors || [])) {
      // 使用注册表规范化键名，避免同一专业因中文名变体产生重复
      const key = resolveStationKey(major.name)
      if (!map[key] && major.stations?.length) {
        map[key] = major.stations.map(s => ({
          name: s.name,
          duration: s.duration || 15,
          projects: (s.projects || []).map(p => typeof p === 'object' ? p.name : p),
          scoreTables: (s.scoreTables || []).map(st => ({
            templateCode: st.templateCode,
            bindProjects: st.bindProjects || []
          }))
        }))
      }
    }
  }
  return map
}

const MAJOR_STATIONS = buildMajorStationMap()
const DEFAULT_MAJOR = '内科'

// 根据当前考站流配置，计算给定路由的下一步目标
// 注意：此函数在 computed 中调用，禁止修改 store 状态
function resolveNextInFlow(store, currentRouteName) {
  const stations = store.stationScheme || store.stationFlow?.stations || []
  const stationIdx = store.currentFlowIndex ?? 0
  const cur = stations[stationIdx]
  if (!cur?.projects || cur.projects.length === 0) {
    return { stationName: cur?.name || '', nextRoute: null, nextLabel: '', isLast: true, advanceToStation: -1 }
  }

  const projects = cur.projects
  const localIdx = projects.findIndex(p => PROJECT_ROUTE_MAP[p]?.route === currentRouteName)
  const isLastInStation = localIdx < 0 || localIdx >= projects.length - 1

  let nextRoute = null
  let nextLabel = ''

  if (!isLastInStation) {
    const next = projects[localIdx + 1]
    nextRoute = PROJECT_ROUTE_MAP[next]?.route
    nextLabel = next
  } else if (stationIdx + 1 < stations.length) {
    // Last project in current station, but more stations exist
    const nextStation = stations[stationIdx + 1]
    const firstProject = nextStation.projects?.[0] || nextStation.name
    nextRoute = PROJECT_ROUTE_MAP[firstProject]?.route
    nextLabel = firstProject
    return { stationName: cur.name || '', nextRoute, nextLabel, isLast: false, advanceToStation: stationIdx + 1 }
  }

  return { stationName: cur.name || '', nextRoute, nextLabel, isLast: isLastInStation, advanceToStation: -1 }
}

function advanceToNextStation(stations, currentIdx, store) {
  if (currentIdx + 1 < stations.length) {
    const nextStation = stations[currentIdx + 1]
    store.currentFlowIndex = currentIdx + 1
    if (store.stationFlow) store.stationFlow.currentIndex = currentIdx + 1
    store.saveTrainingSession()
    if (nextStation?.projects?.length) {
      const firstProject = nextStation.projects[0]
      return {
        stationName: nextStation.name || '',
        nextRoute: PROJECT_ROUTE_MAP[firstProject]?.route,
        nextLabel: firstProject,
        isLast: false
      }
    }
  }
  return null
}

function ensureStationIndex(store, routeName) {
  const stations = store.stationScheme || store.stationFlow?.stations || []
  const idx = store.currentFlowIndex ?? 0
  const cur = stations[idx]
  if (cur?.projects?.some(p => PROJECT_ROUTE_MAP[p]?.route === routeName)) {
    return
  }
  for (let i = 0; i < stations.length; i++) {
    if (STATION_ROUTE_MAP[stations[i]?.name]?.route === routeName) {
      store.currentFlowIndex = i
      if (store.stationFlow) store.stationFlow.currentIndex = i
      store.saveTrainingSession()
      return
    }
  }
  for (let i = 0; i < stations.length; i++) {
    if ((stations[i]?.projects || []).some(p => PROJECT_ROUTE_MAP[p]?.route === routeName)) {
      store.currentFlowIndex = i
      if (store.stationFlow) store.stationFlow.currentIndex = i
      store.saveTrainingSession()
      return
    }
  }
}

export { STATION_ROUTE_MAP, PROJECT_ROUTE_MAP, PROJECT_TO_STATION_TARGET, resolveNextInFlow, advanceToNextStation, ensureStationIndex }

export function useStationFlow() {
  const store = useTrainingStore()

  const stations = ref([])
  const currentIndex = ref(0)

  const currentStation = computed(() => stations.value[currentIndex.value] || null)
  const isFirstStation = computed(() => currentIndex.value === 0)
  const isLastStation = computed(() => currentIndex.value >= stations.value.length - 1)
  const totalStations = computed(() => stations.value.length)

  function applyStations(rawStations) {
    stations.value = rawStations.map(s => {
      const mapped = STATION_ROUTE_MAP[s.name]
      return {
        ...s,
        routeName: mapped?.route || 'historyTaking',
        routeLabel: mapped?.label || s.name,
        scoreTables: s.scoreTables || []
      }
    })
    currentIndex.value = 0
    store.stationScheme = stations.value
    store.currentFlowIndex = 0
    store.stationFlow = { stations: stations.value, currentIndex: 0 }
    store.saveTrainingSession()
  }

  // 从专业名中提取方案匹配用的方案类型
  function pickScheme(schemes, key) {
    const enabled = schemes.filter(s => s.status)
    const byType = (type) => enabled.find(s => s.type === type && s.majors?.some(m => resolveStationKey(m.name) === key))
    return byType('institution') || byType('province') || byType('platform') ||
      schemes.find(s => s.majors?.some(m => resolveStationKey(m.name) === key))
  }

  // 标准化考站数据用于比较
  function normalize(sts) {
    return sts.map(s => ({
      name: s.name,
      duration: s.duration,
      projects: (s.projects || []).map(p => typeof p === 'object' ? p.name : p),
      scoreTables: (s.scoreTables || []).map(st => ({
        templateCode: st.templateCode,
        bindProjects: st.bindProjects || []
      }))
    }))
  }

  async function loadStations(specialty) {
    const key = resolveStationKey(specialty)

    // 1. 立即应用硬编码数据作为占位（确保页面不白屏）
    const fallback = MAJOR_STATIONS[key] || MAJOR_STATIONS[DEFAULT_MAJOR]
    if (fallback) {
      applyStations(fallback)
    }

    // 2. 从 loadAllSchemes() 加载合并了编辑的真实数据（主数据源）
    try {
      const schemes = await loadAllSchemes()
      const scheme = pickScheme(schemes, key)
      if (scheme) {
        const major = scheme.majors.find(m => resolveStationKey(m.name) === key)
        if (major?.stations?.length) {
          const refreshed = normalize(major.stations)
          if (JSON.stringify(refreshed) !== JSON.stringify(fallback)) {
            applyStations(refreshed)
          }
        }
      }
    } catch (e) {
      console.warn('[StationFlow] 方案加载失败，使用硬编码回退:', e.message)
      // fallback 已在上方应用
    }
  }

  function getNextStation() {
    if (isLastStation.value) return null
    return stations.value[currentIndex.value + 1]
  }

  function advanceToNext() {
    if (!isLastStation.value) {
      currentIndex.value++
      store.currentFlowIndex = currentIndex.value
      store.stationFlow = { ...store.stationFlow, currentIndex: currentIndex.value }
      store.saveTrainingSession()
      return stations.value[currentIndex.value]
    }
    return null
  }

  function reset() {
    stations.value = []
    currentIndex.value = 0
  }

  return {
    stations, currentIndex, currentStation,
    isFirstStation, isLastStation, totalStations,
    loadStations, getNextStation, advanceToNext, reset,
    STATION_ROUTE_MAP, PROJECT_ROUTE_MAP
  }
}
