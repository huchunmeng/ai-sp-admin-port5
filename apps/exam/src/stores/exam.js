import { defineStore } from 'pinia'
import { ref, reactive, computed } from 'vue'
import {
  examInfoData, patientInfoData, chatMessagesData,
  analysisQuestionsData, analysisPhasedInfo, scoreSheetsData, candidateQueueData,
  scoringRecordsData, pendingCandidatesData, deviceDataConfig, pageTitles,
  diagnosisLibrary
} from '@/mock/data'

export const useExamStore = defineStore('exam', () => {
  const examId = ref(null)
  const examName = ref(examInfoData.examName)
  const examPassword = ref(examInfoData.examPassword)

  const currentPage = ref('device-select')
  const sidebarCollapsed = ref(false)
  const portraitMode = ref(false)
  const deviceMode = ref('candidate')

  const examInfo = reactive({ ...examInfoData, scoringReadOnly: false })

  const patientInfo = reactive(JSON.parse(JSON.stringify(patientInfoData)))
  const chatMessages = ref(JSON.parse(JSON.stringify(chatMessagesData)))
  const inputMode = ref('text')
  const analysisQuestions = ref(JSON.parse(JSON.stringify(analysisQuestionsData)))
  const analysisPhased = ref(JSON.parse(JSON.stringify(analysisPhasedInfo)))
  const activeAnalysisQuestion = ref(1)
  const writingContent = ref('主诉：发热、头痛伴意识模糊2天。\n\n现病史：患者于2天前无明显诱因出现发热，体温最高38.9℃，伴头痛…\n\n既往史：既往体健，否认高血压、糖尿病、心脏病史。')

  // 接诊病人站 — 按项目分组的对话消息
  const dialogueStep = ref(0)
  const dialogueMessages = reactive({
    '病史采集': JSON.parse(JSON.stringify(chatMessagesData)),
    '体格检查': [],
    '人文沟通': [],
    '初步诊断': []
  })
  const markedMessages = ref([])

  // 初步诊断
  const preliminaryDiag = reactive({ preliminary: '', differential: '', basis: '', treatmentPlan: '' })

  // 诊断库
  const diagLibrary = ref(JSON.parse(JSON.stringify(diagnosisLibrary)))

  const scoreSheets = ref(JSON.parse(JSON.stringify(scoreSheetsData)))
  const activeScoreSheet = ref(0)
  const scoringState = ref('form')

  const candidateQueue = ref(JSON.parse(JSON.stringify(candidateQueueData)))
  const queueFilter = ref('all')

  const scoringRecords = ref(JSON.parse(JSON.stringify(scoringRecordsData)))
  const pendingCandidates = ref(JSON.parse(JSON.stringify(pendingCandidatesData)))
  const pendingFilter = ref('all')

  const deviceData = reactive(JSON.parse(JSON.stringify(deviceDataConfig)))
  deviceData.selectedSummary = '已选：3 个项目（病史采集、体格检查、人文沟通）'

  const totalScore = computed(() => {
    let sum = 0, max = 0
    const sheet = scoreSheets.value[activeScoreSheet.value]
    if (sheet) {
      sheet.categories.forEach(cat => {
        cat.items.forEach(item => { sum += item.score; max += item.max })
      })
    }
    return { sum, max }
  })

  const allSheetsTotal = computed(() => {
    let sum = 0, max = 0
    scoreSheets.value.forEach(sheet => {
      sheet.categories.forEach(cat => {
        cat.items.forEach(item => { sum += item.score; max += item.max })
      })
    })
    return { sum, max }
  })

  function setPage(page) { currentPage.value = page }
  function toggleSidebar() { sidebarCollapsed.value = !sidebarCollapsed.value }
  function toggleOrientation() { portraitMode.value = !portraitMode.value }
  function toggleDeviceTab(mode) { deviceMode.value = mode }

  function toggleCandidateProj(specIdx, stIdx, projIdx) {
    const proj = deviceData.candidateStations[specIdx].stations[stIdx].projects[projIdx]
    proj.checked = !proj.checked
    if (proj.checked) {
      deviceData.candidateStations.forEach((spec, si) => {
        spec.stations.forEach((st, sti) => {
          st.projects.forEach((p, pi) => {
            if (p !== proj && p.checked) {
              const sameStation = si === specIdx && sti === stIdx
              if (!sameStation) p.checked = false
            }
          })
        })
      })
    }
    updateProjSummary()
  }

  function updateProjSummary() {
    const texts = []
    deviceData.candidateStations.forEach(spec => {
      spec.stations.forEach(st => {
        st.projects.forEach(p => {
          if (p.checked) texts.push(p.name)
        })
      })
    })
    deviceData.selectedSummary = texts.length === 0 ? '未选择任何项目' : `已选：${texts.length} 个项目（${texts.join('、')}）`
  }

  function toggleExaminerStation(idx) {
    deviceData.examinerStations.forEach((s, i) => {
      s.checked = i === idx
    })
  }

  function applyDeviceConfig() {
    if (deviceMode.value === 'candidate') {
      examInfo.selectedProjects = []
      deviceData.candidateStations.forEach(spec => {
        spec.stations.forEach(st => {
          st.projects.forEach(p => {
            if (p.checked) {
              examInfo.topic = spec.specialty
              examInfo.station = st.name
              examInfo.selectedProjects.push(p.name)
            }
          })
        })
      })
      setPage('confirm')
    } else {
      const sel = deviceData.examinerStations.find(s => s.checked)
      if (sel) {
        examInfo.topic = sel.specialty
        examInfo.station = sel.station
        examInfo.deviceBind = sel.bindings.filter(b => b.ok).map(b => b.name).join('、')
      }
      setPage('ex-login')
    }
  }

  function pickCandidate(candidate) {
    examInfo.candidateName = candidate.name
    examInfo.candidatePhone = candidate.phone
    examInfo.candidateRoom = candidate.room || ''
    setPage('confirm')
  }

  function selectScoringCandidate(record, readOnly) {
    examInfo.candidateName = record.name
    examInfo.candidatePhone = record.phone
    examInfo.scoringReadOnly = readOnly || false
    setPage('scoring')
  }

  function addCandidate(name, phone, examIdVal) {
    candidateQueue.value.push({ name, phone, room: examInfo.topic, status: 'waiting', device: '-', examId: examIdVal || '' })
  }

  function filterQueue(status) { queueFilter.value = status }

  function adjScore(item, delta) {
    item.score = Math.max(0, Math.min(item.max, item.score + delta))
    if (Math.abs(item.score - Math.round(item.score)) > Number.EPSILON) item.score = parseFloat(item.score.toFixed(1))
  }

  function setScore(item, value) {
    item.score = Math.max(0, Math.min(item.max, value))
  }

  function switchScoreSheet(idx) {
    if (idx >= 0 && idx < scoreSheets.value.length) {
      activeScoreSheet.value = idx
    }
  }

  function submitAllSheets() { scoringState.value = 'waiting' }
  function loadNextCandidate() {
    scoreSheets.value = JSON.parse(JSON.stringify(scoreSheetsData))
    activeScoreSheet.value = 0
    scoringState.value = 'form'
  }
  function selectAnalysisQuestion(id) { activeAnalysisQuestion.value = id }

  function addChatMessage(from, text) {
    const t = new Date()
    const time = t.getHours().toString().padStart(2, '0') + ':' + t.getMinutes().toString().padStart(2, '0')
    chatMessages.value.push({ from, text, time })
  }

  function setInputMode(mode) { inputMode.value = mode }

  // 接诊病人站
  function setDialogueStep(idx) { dialogueStep.value = idx }

  function addDialogueMessage(project, from, text) {
    if (!dialogueMessages[project]) dialogueMessages[project] = []
    const t = new Date()
    const time = t.getHours().toString().padStart(2, '0') + ':' + t.getMinutes().toString().padStart(2, '0')
    const msgId = 'msg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8)
    dialogueMessages[project].push({ id: msgId, from, text, time })
  }

  function toggleMarkMessage(msg) {
    if (!msg.id) msg.id = 'msg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8)
    msg.marked = !msg.marked
    if (msg.marked) {
      markedMessages.value.push({ id: msg.id, text: msg.text, time: msg.time })
    } else {
      const pos = markedMessages.value.findIndex(function(m) { return m.id === msg.id })
      if (pos >= 0) markedMessages.value.splice(pos, 1)
    }
  }

  function removeMarkedMessage(idx) {
    if (idx >= 0 && idx < markedMessages.value.length) {
      markedMessages.value.splice(idx, 1)
    }
  }

  // 初步诊断
  function savePreliminaryDiag(data) {
    preliminaryDiag.preliminary = data.preliminary || ''
    preliminaryDiag.differential = data.differential || ''
    preliminaryDiag.basis = data.basis || ''
    preliminaryDiag.treatmentPlan = data.treatmentPlan || ''
  }

  return {
    examId, examName, examPassword,
    currentPage, sidebarCollapsed, portraitMode,
    deviceMode, examInfo, patientInfo,
    chatMessages, inputMode,
    analysisQuestions, analysisPhased, activeAnalysisQuestion,
    writingContent,
    scoreSheets, activeScoreSheet, scoringState, totalScore, allSheetsTotal,
    candidateQueue, queueFilter,
    scoringRecords, pendingCandidates, pendingFilter,
    deviceData, pageTitles,
    // 接诊病人站
    dialogueStep, dialogueMessages, markedMessages,
    // 初步诊断
    preliminaryDiag, diagLibrary,
    // 方法
    setPage, toggleSidebar, toggleOrientation,
    toggleDeviceTab, toggleCandidateProj, toggleExaminerStation, applyDeviceConfig,
    pickCandidate, selectScoringCandidate, addCandidate, filterQueue,
    adjScore, setScore, switchScoreSheet, submitAllSheets, loadNextCandidate,
    selectAnalysisQuestion, addChatMessage, setInputMode,
    setDialogueStep, addDialogueMessage, toggleMarkMessage, removeMarkedMessage,
    savePreliminaryDiag
  }
})
