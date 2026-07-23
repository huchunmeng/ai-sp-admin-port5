import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import residencySchemes from '@/data/station-schemes/residency.js'
import collegeSchemes from '@/data/station-schemes/college.js'
import specialtySchemes from '@/data/station-schemes/specialty.js'
import { stationSchemesEdits } from '@ai-sp/shared'

function clone(obj) { return JSON.parse(JSON.stringify(obj)) }

const STORAGE_KEY = 'ai-sp-station-schemes-edits'
const COLOR_PALETTE = ['blue', 'green', 'purple', 'yellow', 'red', 'indigo']

function configToOps(configScheme) {
  return {
    id: configScheme.id,
    name: configScheme.name,
    type: configScheme.type,
    source: configScheme.source,
    operator: '管理员',
    editTime: '2026-04-30 10:00',
    enabled: configScheme.status,
    majors: (configScheme.majors || []).map((m, mi) => ({
      key: m.name,
      name: m.name + '专业',
      color: COLOR_PALETTE[mi % COLOR_PALETTE.length],
      stations: (m.stations || []).map((s, si) => ({
        id: 'station-' + mi + '-' + si,
        name: s.name,
        duration: s.duration,
        collapsed: s.collapsed !== undefined ? s.collapsed : false,
        projects: (s.projects || []).map(p => ({ name: p.name, score: p.score })),
        scoreTables: (s.scoreTables || []).map(st => ({
          name: st.name,
          templateCode: st.templateCode,
          covers: st.bindProjects || []
        }))
      }))
    }))
  }
}

function loadEdits() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

function loadAll() {
  const base = [
    ...residencySchemes.map(clone),
    ...collegeSchemes.map(clone),
    ...specialtySchemes.map(clone)
  ].map(configToOps)
  const edits = loadEdits()
  return base.map(s => {
    if (edits[s.id]) {
      if (s.type !== 'institution') {
        return { ...s, enabled: edits[s.id].status ?? edits[s.id].enabled }
      }
      return edits[s.id]
    }
    return s
  })
}

async function persist(schemes) {
  const edits = loadEdits()
  schemes.forEach(s => {
    if (s.type === 'institution') {
      edits[s.id] = JSON.parse(JSON.stringify(s))
    } else {
      edits[s.id] = { id: s.id, status: s.enabled }
    }
  })
  localStorage.setItem(STORAGE_KEY, JSON.stringify(edits))
  await stationSchemesEdits.save(edits)
}

export const useOpsStore = defineStore('ops', () => {
  const stats = computed(() => ({
    institutionCount: 47,
    totalExams: 1283,
    activeUsers: 892,
    monthlyGrowth: '+12.5%'
  }))

  const institutions = ref([
    { id: 1, name: '仁爱医院', code: 'RA001', exams: 156, avgScore: '82.3', status: 'active' },
    { id: 2, name: '华西医院', code: 'HX001', exams: 234, avgScore: '88.1', status: 'active' },
    { id: 3, name: '中山医院', code: 'ZS001', exams: 198, avgScore: '85.6', status: 'active' },
    { id: 4, name: '协和医院', code: 'XH001', exams: 312, avgScore: '91.2', status: 'active' },
    { id: 5, name: '同济医院', code: 'TJ001', exams: 178, avgScore: '83.9', status: 'inactive' },
    { id: 6, name: '省立医院', code: 'SL001', exams: 89, avgScore: '80.5', status: 'active' }
  ])

  const recentExams = ref([
    { id: 1, name: '2026年住培结业考核', institution: '仁爱医院', candidates: 45, date: '2026-05-20', status: '进行中' },
    { id: 2, name: '2026年度考核-内科', institution: '华西医院', candidates: 32, date: '2026-05-19', status: '已结束' },
    { id: 3, name: '出科考核-外科', institution: '中山医院', candidates: 18, date: '2026-05-18', status: '已结束' },
    { id: 4, name: '期中考试-内科', institution: '协和医院', candidates: 56, date: '2026-05-17', status: '已归档' },
    { id: 5, name: '期末考试-全科', institution: '同济医院', candidates: 28, date: '2026-05-16', status: '已归档' }
  ])

  // ===================== 考站设置 =====================

  let nextSchemeId = 100
  const now = () => {
    const d = new Date()
    const pad = n => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  }

  const schemes = ref(loadAll())

  // 侧滑面板状态
  const slidePanelOpen = ref(false)
  const editingSchemeId = ref(null)
  const editingMode = ref('new') // 'new' | 'edit'

  function openNewSlidePanel() {
    editingMode.value = 'new'
    editingSchemeId.value = null
    slidePanelOpen.value = true
  }

  function openEditSlidePanel(schemeId) {
    editingMode.value = 'edit'
    editingSchemeId.value = schemeId
    slidePanelOpen.value = true
  }

  function closeSlidePanel() {
    slidePanelOpen.value = false
    editingSchemeId.value = null
  }

  const editingScheme = computed(() => {
    if (editingMode.value === 'new') return null
    return schemes.value.find(s => s.id === editingSchemeId.value) || null
  })

  // Switch 互斥：同时只能有一个启用
  function toggleSchemeStatus(id) {
    const target = schemes.value.find(s => s.id === id)
    if (!target) return
    const newVal = !target.enabled
    if (newVal) {
      schemes.value.forEach(s => { s.enabled = false })
    }
    target.enabled = newVal
    persist(schemes.value)
  }

  // 方案 CRUD
  function addScheme(schemeData) {
    const s = {
      id: 'res-inst-' + Date.now(),
      name: schemeData.name,
      type: schemeData.type,
      source: schemeData.source || '——',
      operator: '当前用户',
      editTime: now(),
      enabled: true,
      majors: []
    }
    schemes.value.push(s)
    persist(schemes.value)
    return s
  }

  function deleteScheme(id) {
    const idx = schemes.value.findIndex(s => s.id === id)
    if (idx >= 0) schemes.value.splice(idx, 1)
    persist(schemes.value)
  }

  // 专业操作
  function addMajor(schemeId, majorKey, majorName, color) {
    const scheme = schemes.value.find(s => s.id === schemeId)
    if (!scheme) return
    if (scheme.majors.find(m => m.key === majorKey)) return false
    scheme.majors.push({ key: majorKey, name: majorName + '专业', color, stations: [] })
    persist(schemes.value)
    return true
  }

  function deleteMajor(schemeId, majorKey) {
    const scheme = schemes.value.find(s => s.id === schemeId)
    if (!scheme) return
    const idx = scheme.majors.findIndex(m => m.key === majorKey)
    if (idx >= 0) scheme.majors.splice(idx, 1)
    persist(schemes.value)
  }

  // 考站操作
  function addStation(schemeId, majorKey, station) {
    const scheme = schemes.value.find(s => s.id === schemeId)
    if (!scheme) return
    const major = scheme.majors.find(m => m.key === majorKey)
    if (!major) return
    major.stations.push({
      id: 'station-' + Date.now(),
      name: station.name,
      duration: station.duration || 15,
      collapsed: false,
      projects: [],
      scoreTables: []
    })
    persist(schemes.value)
  }

  function deleteStation(schemeId, majorKey, stationId) {
    const scheme = schemes.value.find(s => s.id === schemeId)
    if (!scheme) return
    const major = scheme.majors.find(m => m.key === majorKey)
    if (!major) return
    if (major.stations.length <= 1) return
    const idx = major.stations.findIndex(st => st.id === stationId)
    if (idx >= 0) major.stations.splice(idx, 1)
    persist(schemes.value)
  }

  // 考核项目操作
  function addProjects(schemeId, majorKey, stationId, projects) {
    const scheme = schemes.value.find(s => s.id === schemeId)
    if (!scheme) return
    const major = scheme.majors.find(m => m.key === majorKey)
    if (!major) return
    const station = major.stations.find(st => st.id === stationId)
    if (!station) return
    projects.forEach(p => {
      if (!station.projects.find(ep => ep.name === p.name)) {
        station.projects.push({ name: p.name, score: p.score })
      }
    })
    persist(schemes.value)
  }

  function deleteProject(schemeId, majorKey, stationId, projectName) {
    const scheme = schemes.value.find(s => s.id === schemeId)
    if (!scheme) return
    const major = scheme.majors.find(m => m.key === majorKey)
    if (!major) return
    const station = major.stations.find(st => st.id === stationId)
    if (!station) return
    const idx = station.projects.findIndex(p => p.name === projectName)
    if (idx >= 0) station.projects.splice(idx, 1)
    persist(schemes.value)
  }

  // 评分表操作
  function addScoreTable(schemeId, majorKey, stationId, tableName, covers) {
    const scheme = schemes.value.find(s => s.id === schemeId)
    if (!scheme) return
    const major = scheme.majors.find(m => m.key === majorKey)
    if (!major) return
    const station = major.stations.find(st => st.id === stationId)
    if (!station) return
    station.scoreTables.push({ name: tableName, covers })
    persist(schemes.value)
  }

  function deleteScoreTable(schemeId, majorKey, stationId, tableName) {
    const scheme = schemes.value.find(s => s.id === schemeId)
    if (!scheme) return
    const major = scheme.majors.find(m => m.key === majorKey)
    if (!major) return
    const station = major.stations.find(st => st.id === stationId)
    if (!station) return
    const idx = station.scoreTables.findIndex(t => t.name === tableName)
    if (idx >= 0) station.scoreTables.splice(idx, 1)
    persist(schemes.value)
  }

  // 考站拖拽排序
  function reorderStations(schemeId, majorKey, fromIndex, toIndex) {
    const scheme = schemes.value.find(s => s.id === schemeId)
    if (!scheme) return
    const major = scheme.majors.find(m => m.key === majorKey)
    if (!major) return
    if (fromIndex < 0 || fromIndex >= major.stations.length || toIndex < 0 || toIndex > major.stations.length) return
    const [moved] = major.stations.splice(fromIndex, 1)
    if (moved === undefined) return
    major.stations.splice(toIndex, 0, moved)
    persist(schemes.value)
  }

  // 项目拖拽排序
  function reorderProjects(schemeId, majorKey, stationId, fromIndex, toIndex) {
    const scheme = schemes.value.find(s => s.id === schemeId)
    if (!scheme) return
    const major = scheme.majors.find(m => m.key === majorKey)
    if (!major) return
    const station = major.stations.find(st => st.id === stationId)
    if (!station) return
    if (fromIndex < 0 || fromIndex >= station.projects.length || toIndex < 0 || toIndex > station.projects.length) return
    const [moved] = station.projects.splice(fromIndex, 1)
    if (moved === undefined) return
    station.projects.splice(toIndex, 0, moved)
    persist(schemes.value)
  }

  return {
    stats, institutions, recentExams,
    schemes, slidePanelOpen, editingSchemeId, editingMode, editingScheme,
    openNewSlidePanel, openEditSlidePanel, closeSlidePanel,
    toggleSchemeStatus, addScheme, deleteScheme,
    addMajor, deleteMajor,
    addStation, deleteStation,
    addProjects, deleteProject,
    addScoreTable, deleteScoreTable,
    reorderStations, reorderProjects
  }
})
