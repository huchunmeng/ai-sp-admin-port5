import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { matchPatientImage } from '@/composables/usePatientImage'

const SPECIALTIES = {
  resident: [
    { id: 'internal', name: '内科', en: 'Internal Medicine', icon: 'fa-heart-pulse' },
    { id: 'pediatrics', name: '儿科', en: 'Pediatrics', icon: 'fa-child' },
    { id: 'emergency', name: '急诊科', en: 'Emergency', icon: 'fa-truck-medical' },
    { id: 'psychiatry', name: '精神科', en: 'Psychiatry', icon: 'fa-brain' },
    { id: 'general', name: '全科', en: 'General Practice', icon: 'fa-stethoscope' },
    { id: 'dermatology', name: '皮肤科', en: 'Dermatology', icon: 'fa-hand-dots' },
    { id: 'neuro', name: '神经内科', en: 'Neurology', icon: 'fa-brain' },
    { id: 'rehabilitation', name: '康复医学科', en: 'Rehabilitation', icon: 'fa-person-walking' },
    { id: 'icu', name: '重症医学科', en: 'ICU', icon: 'fa-bed-pulse' },
    { id: 'general-surgery', name: '普通外科', en: 'General Surgery', icon: 'fa-suitcase-medical' },
    { id: 'cardiothoracic-surgery', name: '胸心外科', en: 'Cardiothoracic Surgery', icon: 'fa-heart' },
    { id: 'urology', name: '泌尿外科', en: 'Urology', icon: 'fa-droplet' },
    { id: 'plastic-surgery', name: '整形外科', en: 'Plastic Surgery', icon: 'fa-wand-magic-sparkles' },
    { id: 'orthopedics', name: '骨科', en: 'Orthopedics', icon: 'fa-bone' },
    { id: 'pediatric-surgery', name: '儿外科', en: 'Pediatric Surgery', icon: 'fa-baby' },
    { id: 'obgyn', name: '妇产科', en: 'OB/GYN', icon: 'fa-person-pregnant' },
    { id: 'anesthesiology', name: '麻醉科', en: 'Anesthesiology', icon: 'fa-syringe' },
    { id: 'ophthalmology', name: '眼科', en: 'Ophthalmology', icon: 'fa-eye' },
    { id: 'ent', name: '耳鼻咽喉科', en: 'ENT', icon: 'fa-ear-listen' },
    { id: 'general-dentistry', name: '口腔全科', en: 'General Dentistry', icon: 'fa-tooth' },
    { id: 'oral-medicine', name: '口腔内科', en: 'Oral Medicine', icon: 'fa-tooth' },
    { id: 'oral-surgery', name: '口腔颌面外科', en: 'Oral Surgery', icon: 'fa-teeth-open' },
    { id: 'prosthodontics', name: '口腔修复科', en: 'Prosthodontics', icon: 'fa-tooth' },
    { id: 'orthodontics', name: '口腔正畸科', en: 'Orthodontics', icon: 'fa-teeth-open' },
    { id: 'oral-pathology', name: '口腔病理科', en: 'Oral Pathology', icon: 'fa-tooth' },
    { id: 'oral-radiology', name: '口腔颌面影像科', en: 'Oral Radiology', icon: 'fa-x-ray' },
    { id: 'radiology', name: '放射科', en: 'Radiology', icon: 'fa-x-ray' },
    { id: 'ultrasound', name: '超声科', en: 'Ultrasound', icon: 'fa-wave-square' },
    { id: 'nuclear-medicine', name: '核医学科', en: 'Nuclear Medicine', icon: 'fa-radiation' },
    { id: 'clinical-pathology', name: '临床病理科', en: 'Clinical Pathology', icon: 'fa-microscope' },
    { id: 'laboratory-medicine', name: '检验医学科', en: 'Laboratory Medicine', icon: 'fa-flask' },
    { id: 'radiation-oncology', name: '放射肿瘤科', en: 'Radiation Oncology', icon: 'fa-ribbon' },
    { id: 'medical-genetics', name: '医学遗传科', en: 'Medical Genetics', icon: 'fa-dna' },
    { id: 'preventive-medicine', name: '预防医学科', en: 'Preventive Medicine', icon: 'fa-shield-virus' }
  ],
  specialist: [
    { id: 'internal', name: '内科', en: 'Internal Medicine', icon: 'fa-heart-pulse' },
    { id: 'surgery', name: '外科', en: 'Surgery', icon: 'fa-suitcase-medical' },
    { id: 'cardio', name: '心内科', en: 'Cardiology', icon: 'fa-heart' },
    { id: 'neuro', name: '神经内科', en: 'Neurology', icon: 'fa-brain' },
    { id: 'oncology', name: '肿瘤科', en: 'Oncology', icon: 'fa-ribbon' },
    { id: 'icu', name: '重症医学科', en: 'ICU', icon: 'fa-bed-pulse' },
    { id: 'dental', name: '口腔科', en: 'Dentistry', icon: 'fa-tooth' },
    { id: 'ent', name: '耳鼻喉科', en: 'ENT', icon: 'fa-ear-listen' },
    { id: 'dermatology', name: '皮肤科', en: 'Dermatology', icon: 'fa-hand-dots' },
    { id: 'psychiatry', name: '精神科', en: 'Psychiatry', icon: 'fa-brain' },
    { id: 'ophthalmology', name: '眼科', en: 'Ophthalmology', icon: 'fa-eye' },
    { id: 'general-dentistry', name: '口腔全科', en: 'General Dentistry', icon: 'fa-tooth' },
    { id: 'oral-surgery', name: '口腔颌面外科', en: 'Oral Surgery', icon: 'fa-teeth-open' },
    { id: 'tcm', name: '中医全科', en: 'TCM', icon: 'fa-mortar-pestle' }
  ]
}

const STATIONS = [
  { id: 'reception', name: '接诊病人站', en: 'Patient Reception', icon: 'fa-user-doctor', desc: '模拟完整接诊流程，包括病史采集、体格检查、初步诊断、治疗计划与病历书写' },
  { id: 'analysis', name: '临床思维站', en: 'Clinical Thinking', icon: 'fa-magnifying-glass-chart', desc: '基于病例资料进行临床思维训练，按要求逐条分析诊断与鉴别诊断' },
  { id: 'humanity', name: '人文沟通站', en: 'Humanistic Communication', icon: 'fa-comments', desc: '模拟医患沟通场景，训练知情同意、坏消息告知等人文沟通技能' }
]

const STATION_VIEW_MAP = {
  reception: 'historyTaking',
  analysis: 'caseAnalysis',
  humanity: 'humanisticComm'
}

const STORAGE_KEY = 'app-training-state'

export const useAppTrainingStore = defineStore('appTraining', () => {
  // App-training specific
  const user = ref({ name: '朱波', avatar: '👤', phase: '住培', specialty: '内科' })
  const activeTab = ref('home')

  // Training state
  const lang = ref('zh')
  const currentCase = ref(null)
  const currentStation = ref(null)
  const currentRecord = ref(null)
  const trainingSession = ref({})

  // Station flow
  const stationFlow = ref(null)
  const stationScheme = ref(null)
  const currentFlowIndex = ref(0)

  // Data
  const trainingRecords = ref([])
  const availableCases = ref([])

  // Computed
  const stats = computed(() => ({
    totalTrainings: trainingRecords.value.length,
    completedCount: trainingRecords.value.length,
    averageScore: (() => {
      const scored = trainingRecords.value.filter(r => r.score != null)
      if (scored.length === 0) return '-'
      const sum = scored.reduce((acc, r) => acc + r.score, 0)
      return (sum / scored.length).toFixed(1)
    })(),
    recentActivity: trainingRecords.value.slice(0, 5)
  }))

  // ═══ Persistence ═══
  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        user: user.value,
        lang: lang.value,
        trainingSession: trainingSession.value,
        trainingRecords: trainingRecords.value
      }))
    } catch (e) { /* ignore */ }
  }

  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const s = JSON.parse(saved)
        if (s.user) user.value = s.user
        if (s.lang) lang.value = s.lang
        if (s.trainingSession) trainingSession.value = s.trainingSession
        if (s.trainingRecords) trainingRecords.value = s.trainingRecords
      }
    } catch (e) { /* ignore */ }
  }

  function loadTrainingRecords() {
    try {
      const records = JSON.parse(localStorage.getItem('app_training_records') || '{}')
      const list = Object.values(records).sort((a, b) => {
        return (b.time || '').localeCompare(a.time || '')
      })
      if (list.length > 0) trainingRecords.value = list
    } catch (e) { /* ignore */ }
  }

  function addTrainingRecord(record) {
    try {
      const records = JSON.parse(localStorage.getItem('app_training_records') || '{}')
      const key = (record.caseId || '') + '_' + (record.stationId || 'reception')
      records[key] = { ...record, recordedAt: new Date().toISOString() }
      localStorage.setItem('app_training_records', JSON.stringify(records))
      // Refresh in-memory list
      loadTrainingRecords()
    } catch (e) { /* ignore */ }
  }

  function getCaseTrainingStatus(caseId) {
    const records = trainingRecords.value.filter(r => r.caseId === caseId)
    return records.length > 0 ? 'trained' : 'not_trained'
  }

  // ═══ Actions ═══
  function setTab(tab) { activeTab.value = tab }
  function selectCase(c) { currentCase.value = c }
  function setLang(l) { lang.value = l; saveState() }

  async function loadCases() {
    try {
      const resp = await fetch('/api/cases')
      if (resp.ok) {
        const data = await resp.json()
        availableCases.value = data.map(c => {
          const gender = c.patient_gender || ''
          const ageNum = parseInt(String(c.patient_age || '').replace('岁', '')) || 30
          return {
            id: c.id,
            title: c.title,
            specialty: c.specialty,
            disease: c.disease,
            difficulty: c.difficulty,
            phase: c.training_phase,
            source: c.source,
            chiefComplaint: c.chief_complaint,
            symptoms: c.symptoms || [],
            patient: {
              name: c.patient_name,
              sex: gender,
              age: c.patient_age,
              pregnancy: c.patient_pregnancy,
              fullBodyImage: matchPatientImage({ gender, age: ageNum, isPregnant: c.patient_pregnancy || '' }, 'full') || ''
            },
            status: getCaseTrainingStatus(c.id)
          }
        })
      }
    } catch (e) {
      console.warn('[appTraining] loadCases failed:', e)
    }
  }

  async function loadCaseDetail(caseId) {
    try {
      const resp = await fetch(`/data/cases/${caseId}-basic.json`)
      if (!resp.ok) return null
      const basic = await resp.json()
      const pi = basic.patient_info || {}
      const gender = pi.sex === '1' || pi.sex === '男' ? '男' : (pi.sex === '0' || pi.sex === '女' ? '女' : '')
      const ageNum = parseInt(String(pi.age || '').replace('岁', '')) || 30
      return {
        id: caseId,
        title: basic.title || basic.disease || caseId,
        specialty: basic.specialty || '',
        disease: basic.disease || '',
        difficulty: basic.difficulty || basic.teaching_phase || '',
        source: '平台',
        chiefComplaint: basic.chief_complaint || '',
        symptoms: basic.symptoms || [],
        patient: {
          name: pi.name || '',
          sex: gender,
          age: String(pi.age || '').replace('岁', ''),
          occupation: pi.occupation || '',
          marital: pi.marital || '',
          fullBodyImage: matchPatientImage({ gender, age: ageNum, isPregnant: pi.pregnancy || '' }, 'full') || ''
        },
        vitals: basic.vitals || null,
        presentIllness: basic.present_illness || '',
        pastHistory: basic.past_history || '',
        personalHistory: basic.personal_history || '',
        familyHistory: basic.family_history || '',
        physicalExam: basic.physical_exam || '',
        diagnosis: basic.diagnosis || null,
        treatmentPlan: basic.treatment_plan || '',
        stations: ['reception', 'analysis', 'humanity']
      }
    } catch (e) {
      return null
    }
  }

  // Station flow actions
  function startStationFlow(stations) {
    stationScheme.value = stations
    currentFlowIndex.value = 0
    stationFlow.value = { stations, currentIndex: 0 }
    saveState()
  }

  function advanceStation() {
    if (!stationFlow.value?.stations) return null
    const max = stationFlow.value.stations.length - 1
    if (currentFlowIndex.value < max) {
      currentFlowIndex.value++
      stationFlow.value.currentIndex = currentFlowIndex.value
      saveState()
      return stationFlow.value.stations[currentFlowIndex.value]
    }
    return null
  }

  function saveSessionStage(stage, data) {
    if (!trainingSession.value) trainingSession.value = {}
    trainingSession.value[stage] = data
    saveState()
  }

  function saveHistorySession(data) { saveSessionStage('historyTaking', data) }
  function savePhysicalSession(data) { saveSessionStage('physicalExam', data) }
  function savePreliminaryDiag(data) { saveSessionStage('preliminaryDiag', data) }
  function saveTreatmentPlan(data) { saveSessionStage('treatmentPlan', data) }
  function saveMedicalRecord(data) { saveSessionStage('medicalRecord', data) }
  function saveCaseAnalysis(data) { saveSessionStage('caseAnalysis', data) }
  function saveHumanisticComm(data) { saveSessionStage('humanisticComm', data) }

  function clearSession() {
    trainingSession.value = {}
    stationFlow.value = null
    stationScheme.value = null
    currentFlowIndex.value = 0
    currentCase.value = null
    currentStation.value = null
    try { localStorage.removeItem(STORAGE_KEY) } catch (e) { /* ignore */ }
  }

  function getReceptionStats() {
    const sess = trainingSession.value || {}
    const ht = sess.historyTaking || {}
    const pe = sess.physicalExam || {}
    return {
      historyMessages: ht.messages ? ht.messages.filter(m => m.role === 'user').length : 0,
      historyMarked: ht.markedCount || 0,
      peMessages: pe.messages ? pe.messages.filter(m => m.role === 'user').length : 0,
      peMarked: pe.markedCount || 0
    }
  }

  // Init
  loadState()
  loadTrainingRecords()

  return {
    user, activeTab, lang, currentCase, currentStation, currentRecord,
    trainingSession, trainingRecords, availableCases,
    stationFlow, stationScheme, currentFlowIndex,
    stats,
    specialties: SPECIALTIES,
    stations: STATIONS,
    stationViewMap: STATION_VIEW_MAP,
    setTab, selectCase, setLang,
    loadCases, loadCaseDetail,
    addTrainingRecord, getCaseTrainingStatus,
    startStationFlow, advanceStation, saveSessionStage, clearSession,
    saveHistorySession, savePhysicalSession, savePreliminaryDiag,
    saveTreatmentPlan, saveMedicalRecord, saveCaseAnalysis, saveHumanisticComm,
    getReceptionStats
  }
})
