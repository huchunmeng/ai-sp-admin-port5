<template>
  <div class="history-taking-page" @click="unlockAudio">
    <template v-if="c.patient.idleVideo">
      <video ref="idleVideoRef" :src="c.patient.idleVideo" class="patient-bg" autoplay loop muted playsinline v-show="!isAiSpeaking" />
      <video ref="speakingVideoRef" :src="c.patient.speakingVideo" class="patient-bg" autoplay loop muted playsinline v-show="isAiSpeaking" />
    </template>
    <img v-else-if="c.patient.fullBodyImage && (c.patient.fullBodyImage.startsWith('/images/') || c.patient.fullBodyImage.startsWith('images/'))" :src="c.patient.fullBodyImage" class="patient-bg" />
    <div v-else class="patient-placeholder">&#x1F464;</div>

    <TrainingTopBar
      :station-name="topBarTitle"
      :steps="steps"
      :step-index="stepIndex"
      :formatted-time="formattedTime"
      :timer-class="timerClass"
      :end-label="lang === 'zh' ? (flowCtx.isLast ? '结束' : '下一步') : (flowCtx.isLast ? 'End' : 'Next')"
      :end-icon="flowCtx.isLast ? 'fa-right-from-bracket' : 'fa-arrow-right'"
      :hide-step-number="true"
      :show-lang-toggle="true"
      :lang-label="lang === 'zh' ? 'EN' : '中'"
      :flow-steps="flowSteps"
      :flow-step-index="flowStepIndex"
      @step-click="onStepClick"
      @end="onNextClick"
      @toggle-lang="lang = lang === 'zh' ? 'en' : 'zh'"
      @flow-step-click="onFlowStepClick"
    />

    <FloatInfoPanel :patient="c.patient" :vitals="c.vitals" :chiefComplaint="c.chiefComplaint" :lang="lang" :hideName="true">
      <template #notes-content>
        <NotesPanel
          :notes="notes"
          :marked-messages="markedMessages"
          :lang="lang"
          :empty-hint="lang === 'zh' ? '暂无记录，在对话中点击「标记」按钮，患者回答将自动添加到此处' : 'No records yet. Click Mark on patient responses to add them here.'"
          @unmark="unmarkMessage"
        />
      </template>
    </FloatInfoPanel>

    <div class="chat-resize-handle" :class="'resize-at-' + chatLevel" @click="cycleChatLevel">
      <span class="resize-pill">
        <i class="fa-solid" :class="chatLevel === 2 ? 'fa-chevron-down' : 'fa-chevron-up'"></i>
        {{ lang === 'zh' ? (chatLevel === 2 ? '收起' : '展开') : (chatLevel === 2 ? 'Collapse' : 'Expand') }}
      </span>
    </div>
    <div class="chat-bubbles-overlay" ref="bubblesOverlay" :class="'chat-level-' + chatLevel">
      <div class="offline-banner" v-if="offline">
        <i class="fa-solid fa-triangle-exclamation"></i>
        {{ lang === 'zh' ? '离线模式 — 后端 API 未连接，仅可浏览界面' : 'Offline — Backend API not connected, UI-only mode' }}
      </div>
      <div class="bubble-row sp" v-if="messages.length === 0 && !isTyping">
        <div class="bubble-avatar sp">
          <img v-if="c.patient.avatar" :src="c.patient.avatar" class="sp-avatar-img" /><i v-else class="fa-solid fa-user"></i>
        </div>
        <div class="bubble-card sp" style="color:#909399;">
          {{ lang === 'zh' ? '正在准备...' : 'Preparing...' }}
        </div>
      </div>
      <div v-for="(m, idx) in messages" :key="idx"
           :class="['bubble-row', m.role === 'user' ? 'user' : 'sp']"
           :ref="el => { if (el) msgRefs[idx] = el; }">
        <div v-if="m.role === 'sp'" class="bubble-avatar sp">
          <img v-if="c.patient.avatar" :src="c.patient.avatar" class="sp-avatar-img" /><i v-else class="fa-solid fa-user"></i>
          <span v-if="m.emotion" class="emotion-dot" :class="'emo-' + m.emotion" :title="emotionLabels[m.emotion] || m.emotion"></span>
        </div>
        <div class="bubble-card" :class="[m.role === 'user' ? 'user' : 'sp', m.fallback ? 'fallback' : '']">
          {{ m.content }}
          <div v-if="m.role === 'sp' && m.material" class="material-card" @click="openMaterial(m.material)">
            <div class="mat-thumb">
              <img v-if="m.material.type === 'image' && m.material.url" :src="m.material.url" class="mat-img" />
              <i v-else :class="matIcon(m.material.type)"></i>
            </div>
            <div class="mat-info">
              <span class="mat-name">{{ m.material.itemName || m.material.filename }}</span>
            </div>
            <i class="fa-solid fa-magnifying-glass-plus mat-zoom"></i>
          </div>
        </div>
        <span class="mark-star" v-if="m.role === 'sp' && idx > 0" :class="{ marked: m.marked }" @click="toggleMark(idx)" :title="m.marked ? (lang === 'zh' ? '已标记' : 'Marked') : (lang === 'zh' ? '标记' : 'Mark')">
          <i :class="m.marked ? 'fa-solid fa-star' : 'fa-regular fa-star'"></i>
        </span>
        <div v-if="m.role === 'user'" class="bubble-avatar user">
          <i class="fa-solid fa-user-doctor"></i>
        </div>
      </div>
      <div v-if="isTyping" class="bubble-row sp">
        <div class="bubble-avatar sp"><img v-if="c.patient.avatar" :src="c.patient.avatar" class="sp-avatar-img" /><i v-else class="fa-solid fa-user"></i></div>
        <div class="bubble-card sp" style="color:#C0C4CC;">
          <i class="fa-solid fa-ellipsis"></i> {{ lang === 'zh' ? '正在回答...' : 'Answering...' }}
        </div>
      </div>
    </div>

    <div v-if="showMaterialModal" class="material-modal-overlay" @click.self="closeMaterialModal">
      <div class="material-modal-body">
        <button class="material-modal-close" @click="closeMaterialModal"><i class="fa-solid fa-xmark"></i></button>
        <div class="material-modal-label">{{ modalMaterial?.itemName || modalMaterial?.filename || '' }}</div>
        <img v-if="modalMaterial?.type === 'image' && modalMaterial?.url" :src="modalMaterial.url" class="material-modal-img" />
        <video v-else-if="modalMaterial?.type === 'video' && modalMaterial?.url" :src="modalMaterial.url" controls class="material-modal-img"></video>
        <audio v-else-if="modalMaterial?.type === 'audio' && modalMaterial?.url" :src="modalMaterial.url" controls class="material-modal-audio"></audio>
        <iframe v-else-if="modalMaterial?.type === 'pdf' && modalMaterial?.url" :src="modalMaterial.url" class="material-modal-pdf"></iframe>
        <div v-else class="material-modal-unsupported">{{ lang === 'zh' ? '不支持的文件类型' : 'Unsupported file type' }}</div>
      </div>
    </div>

    <div v-if="termination" class="termination-overlay">
      <div class="termination-dialog">
        <div class="termination-dialog-icon"><i class="fa-solid fa-circle-exclamation"></i></div>
        <div class="termination-dialog-title">{{ lang === 'zh' ? '对话已终止' : 'Conversation Terminated' }}</div>
        <div class="termination-dialog-msg">{{ termination.message }}</div>
        <div class="termination-dialog-reason" v-if="termination.reason">{{ termination.reason }}</div>
        <button class="termination-dialog-btn" @click="restartConversation">
          <i class="fa-solid fa-rotate-right"></i> {{ lang === 'zh' ? '重新开始' : 'Restart' }}
        </button>
      </div>
    </div>

    <div class="input-bar">
      <div class="input-area">
        <button class="mode-btn-toggle" :class="inputMode === 'voice' ? 'voice' : 'text'" @click="toggleInputMode">
          <i v-if="inputMode === 'voice'" class="fa-solid fa-microphone"></i>
          <i v-else class="fa-solid fa-keyboard"></i>
        </button>
        <template v-if="inputMode === 'text'">
          <input type="text" v-model="inputText"
                 :placeholder="lang === 'zh' ? '输入您要问的问题...' : 'Type your question...'"
                 @keydown.enter.prevent="sendMessage" />
          <button class="send-btn" @click="sendMessage" :disabled="!inputText.trim() || isTyping || termination">
            <i class="fa-solid fa-paper-plane"></i>
          </button>
        </template>
        <template v-else>
          <div class="voice-hold-btn" :class="{ recording: isRecording }"
               @mousedown.prevent="startRecording"
               @mouseup.prevent="stopRecording"
               @mouseleave.prevent="cancelRecording"
               @touchstart.prevent="startRecording"
               @touchend.prevent="stopRecording">
            <i class="fa-solid fa-microphone"></i>
            <span>{{ isRecording ? (lang === 'zh' ? '松开发送' : 'Release to Send') : (lang === 'zh' ? '按住说话' : 'Hold to Speak') }}</span>
          </div>
        </template>
      </div>
    </div>

    <StationModals
      :show-end-confirm="showEndConfirm"
      :end-title="lang === 'zh' ? (flowCtx.isLast ? '确认结束训练' : '确认进入' + flowCtx.nextLabel) : (flowCtx.isLast ? 'Confirm End Training' : 'Confirm Enter ' + flowCtx.nextLabel)"
      :cancel-label="lang === 'zh' ? '继续问诊' : 'Continue'"
      :confirm-label="lang === 'zh' ? (flowCtx.isLast ? '结束训练' : '进入' + flowCtx.nextLabel) : (flowCtx.isLast ? 'End Training' : 'Enter ' + flowCtx.nextLabel)"
      :lang="lang"
      :show-force-end="true"
      :force-end-label="lang === 'zh' ? '强制结束训练' : 'Force End'"
      @cancel="showEndConfirm = false"
      @confirm="endStage"
      @force-end="forceEndTraining"
    >
      <template #end-body>
        <p class="end-warning">{{ lang === 'zh' ? (flowCtx.isLast ? '结束当前阶段后，将生成训练报告，无法返回修改。' : '结束当前阶段后，将进入' + flowCtx.nextLabel + '阶段，无法返回修改。') : (flowCtx.isLast ? 'After ending this stage, a training report will be generated and you cannot return.' : 'After ending this stage, you will proceed to ' + flowCtx.nextLabel + ' and cannot return.') }}</p>
        <div class="summary-list">
          <div class="summary-item submitted">
            <span>{{ lang === 'zh' ? '对话轮次' : 'Dialog Rounds' }}</span>
            <span>{{ messages.filter(m => m.role === 'user').length }}</span>
          </div>
          <div class="summary-item submitted">
            <span>{{ lang === 'zh' ? '已标记关键信息' : 'Marked Items' }}</span>
            <span>{{ markedMessages.length }}</span>
          </div>
        </div>
      </template>
    </StationModals>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import { useTrainingStore } from '@/stores/training'
import { useCaseLoader } from '@/composables/useCaseLoader'
import { PROJECT_ROUTE_MAP, resolveNextInFlow, advanceToNextStation, ensureStationIndex } from '@/composables/useStationFlow'
import { useAISP } from '@/composables/useAISP'
import { useTTS } from '@/composables/useTTS'
import { emotionDebugger } from '@/composables/useEmotionDebugger'
import { matchPatientImage, matchPatientVideo } from '@/composables/usePatientImage'
import { showToast, confirmDialog, formatTimeNow, parseVitals, truncateText } from '@/composables/useUtils'
import { useTimer } from '@/composables/useTimer'
import TrainingTopBar from '@/components/TrainingTopBar.vue'
import FloatInfoPanel from '@/components/FloatInfoPanel.vue'
import NotesPanel from '@/components/NotesPanel.vue'
import StationModals from '@/components/StationModals.vue'

const route = useRoute()
const router = useRouter()
const forwardNav = ref(false)

onBeforeRouteLeave((to, from, next) => {
  if (forwardNav.value) { forwardNav.value = false; next(); return }
  if ((store.stationFlow?.stations?.length || 0) > 1) { next(); return }
  if (store.trainingVersion === '1.0') { next(); return }
  showEndConfirm.value = true
  next(false)
})

const store = useTrainingStore()
const { formattedTime, elapsedSeconds, startTimer } = useTimer()
const { loadCase } = useCaseLoader()
const aisp = useAISP()
const tts = useTTS()
emotionDebugger.bind(aisp)

const timerClass = computed(() => {
  const mins = Math.floor(elapsedSeconds.value / 60)
  if (mins >= 25) return 'danger'
  if (mins >= 15) return 'warning'
  return ''
})

const caseId = ref(route.query.caseId || route.params.caseId || '')
const lang = ref(store.lang || 'zh')

// 当前站的考核项目（不跨站，同名项目隔离）
const stationProjects = computed(() => {
  const stations = store.stationScheme || store.stationFlow?.stations || []
  const idx = store.currentFlowIndex ?? 0
  return stations[idx]?.projects || []
})
const steps = computed(() => {
  return stationProjects.value.map(p => {
    const mapped = PROJECT_ROUTE_MAP[p]
    return { label: p, route: mapped?.route || 'historyTaking' }
  })
})
const stepIndex = computed(() => {
  return stationProjects.value.findIndex(p => PROJECT_ROUTE_MAP[p]?.route === route.name)
})
const flowCtx = computed(() => resolveNextInFlow(store, route.name))
const isV1 = computed(() => store.trainingVersion === '1.0')

const flowSteps = computed(() => {
  if (isV1.value) return null
  const stations = store.stationFlow?.stations
  if (!stations?.length) return null
  if (stations.length <= 1) return null
  const labelMap = { '病史采集': '病史采集', '体格检查': '体格检查', '辅助检查': '辅助检查', '诊断': '诊断', '治疗计划': '治疗计划', '病历书写': '病历书写' }
  return stations.map(s => ({ ...s, label: labelMap[s.name] || s.name }))
})
const flowStepIndex = computed(() => store.currentFlowIndex ?? 0)
const topBarTitle = computed(() => {
  if (isV1.value) return lang.value === 'zh' ? '病史采集' : 'History Taking'
  if (flowSteps.value) return lang.value === 'zh' ? '临床思维模拟训练' : 'Clin. Thinking Simulation'
  return flowCtx.value.stationName || (lang.value === 'zh' ? '接诊病人站' : 'Reception')
})
function onFlowStepClick(idx, step) {
  if (idx === flowStepIndex.value) return
  forwardNav.value = true
  syncMessagesToSession()
  store.currentFlowIndex = idx
  if (store.stationFlow) store.stationFlow.currentIndex = idx
  store.saveTrainingSession()
  router.replace({ name: step.routeName, query: { caseId: store.currentCase?.id || '' } })
}

const inputMode = ref('voice')
const inputText = ref('')
const notes = ref('')
const msgRefs = reactive({})
const bubblesOverlay = ref(null)
const isTyping = computed(() => aisp.isTyping.value)
const configured = computed(() => aisp.configured.value)
const offline = computed(() => aisp.offline.value)
const termination = computed(() => aisp.termination.value)
const isRecording = ref(false)
const showEndConfirm = ref(false)
const chatLevel = ref(1)
const greetingMarked = ref(false)
const idleVideoRef = ref(null)
const speakingVideoRef = ref(null)
const isAiSpeaking = ref(false)
const spEmotion = computed(() => aisp.emotion.value || 'calm')

const emotionLabels = {
  calm: '平静', relieved: '放松', uneasy: '不安', anxious: '焦虑',
  fearful: '恐惧', sad: '悲伤', angry: '愤怒', in_pain: '疼痛',
  crying_breakdown: '情绪崩溃', furious_outburst: '暴怒', shut_down: '沉默'
}
const emotionLabel = computed(() => emotionLabels[spEmotion.value] || spEmotion.value)

// 真实病例数据
const caseData = ref({ basic: null, reception: null })
const c = computed(() => {
  const basic = caseData.value.basic
  if (!basic) return { patient: { name: '加载中...' }, chiefComplaint: '', symptoms: [], vitals: null, pastHistory: '', familyHistory: '', personalHistory: '' }
  const pi = basic.patient_info || {}
  const gender = pi.sex === '1' || pi.sex === '男' ? '男' : (pi.sex === '0' || pi.sex === '女' ? '女' : '')
  const ageStr = String(pi.age || '').replace('岁', '')
  const ageNum = parseInt(ageStr) || 30
  const preg = pi.pregnancy || basic.pregnancy || ''

  // 形象：成人失能+家属场景用家属信息，儿童(<10)母子同框用患者信息
  const reception = caseData.value.reception
  const commTarget = reception?.sp_materials?.role || reception?.communication_target
  const roleInfo = reception?.sp_materials?.role_info
  const isAdultFamily = commTarget === 'family' && roleInfo && ageNum >= 10
  const imgGender = isAdultFamily ? (roleInfo.gender || gender) : gender
  const imgAge = isAdultFamily ? (parseInt(String(roleInfo.age || '').replace(/[^0-9]/g, '')) || ageNum) : ageNum
  const imgPreg = isAdultFamily ? '' : preg

  return {
    id: caseId.value,
    patient: {
      name: pi.name || '',
      gender,
      age: ageStr,
      avatar: matchPatientImage({ gender: imgGender, age: imgAge, isPregnant: imgPreg }, 'patient'),
      fullBodyImage: matchPatientImage({ gender: imgGender, age: imgAge, isPregnant: imgPreg }, 'full'),
      idleVideo: matchPatientVideo({ gender: imgGender, age: imgAge, isPregnant: imgPreg }, 'idle'),
      speakingVideo: matchPatientVideo({ gender: imgGender, age: imgAge, isPregnant: imgPreg }, 'speaking'),
    },
    chiefComplaint: basic.chief_complaint || '',
    symptoms: basic.symptoms || [],
    vitals: parseVitals(basic.physical_exam?.vital_signs),
    pastHistory: basic.past_history || '',
    familyHistory: basic.family_history || '',
    personalHistory: basic.personal_history || '',
  }
})

const messages = computed(() => aisp.messages.value)

const markedMessages = computed(() =>
  messages.value.filter(m => m.role === 'sp' && m.marked)
)

watch(isAiSpeaking, (val) => {
  if (val) {
    if (speakingVideoRef.value) { speakingVideoRef.value.currentTime = 0; speakingVideoRef.value.play() }
  } else {
    if (idleVideoRef.value) { idleVideoRef.value.play() }
  }
})

function onStepClick(si) {
  if (si === stepIndex.value) return
  if (si < stepIndex.value) return
  if (si > stepIndex.value + 1) {
    showToast(lang.value === 'zh' ? '请按顺序完成当前步骤后再进入下一步' : 'Please complete current step first', 'warning')
    return
  }
  const step = steps.value[si]
  confirmDialog(
    lang.value === 'zh' ? '确定要进入' + step.label + '吗？' : 'Proceed to ' + step.label + '?',
    { title: lang.value === 'zh' ? '进入下一步' : 'Next Step', icon: 'fa-arrow-right', iconClass: 'info' }
  ).then(confirmed => {
    if (confirmed) {
      if (stepIndex.value === 0) endStage()
      else { forwardNav.value = true; router.replace({ name: step.route, query: { caseId: caseId.value, source: 'training' } }) }
    }
  })
}

async function sendMessage() {
  const text = inputText.value.trim()
  if (!text || isTyping.value || termination.value) return
  inputText.value = ''

  isAiSpeaking.value = true
  const result = await aisp.sendSPMessage(text)
  nextTick(() => scrollToBottom())

  if (result && !result.error) {
    await tts.speak(result.text, result.voiceStyle || 'normal')
    // 每轮对话后实时同步消息到 trainingSession 并推送服务器落盘
    syncMessagesToSession()
  }
  isAiSpeaking.value = false
}

function syncMessagesToSession() {
  store.trainingSession = store.trainingSession || {}
  store.trainingSession.historyTaking = {
    caseId: caseId.value,
    stationId: 'historyTaking',
    stage: 'history-taking',
    messages: [...aisp.messages.value.map(m => ({ ...m }))],
    notes: notes.value
  }
  store.saveTrainingSession()
}

function restartConversation() {
  aisp.resetEmotion()
  aisp.messages.value = []
  inputText.value = ''
  // 等待学生开口（考核标准：SP 不主动发言）
}

function matIcon(type) {
  const icons = { image: 'fa-solid fa-image', video: 'fa-solid fa-video', audio: 'fa-solid fa-music', pdf: 'fa-solid fa-file-pdf' }
  return icons[type] || 'fa-solid fa-file'
}
const showMaterialModal = ref(false)
const modalMaterial = ref(null)
function openMaterial(mat) {
  if (mat.url) {
    modalMaterial.value = mat
    showMaterialModal.value = true
  }
}
function closeMaterialModal() {
  showMaterialModal.value = false
  modalMaterial.value = null
}

function toggleMark(idx) {
  if (messages.value[idx] && messages.value[idx].role === 'sp') {
    messages.value[idx].marked = !messages.value[idx].marked
    if (messages.value[idx].marked) {
      const header = lang.value === 'zh' ? '标记：' : 'Mark: '
      notes.value += (notes.value ? '\n' : '') + header + messages.value[idx].content
    } else {
      const markerLine = (lang.value === 'zh' ? '标记：' : 'Mark: ') + messages.value[idx].content
      const lines = notes.value.split('\n').filter(l => l !== markerLine)
      notes.value = lines.join('\n')
    }
  }
}

function unmarkMessage(idx) {
  const marked = markedMessages.value[idx]
  if (marked) {
    const origIdx = messages.value.indexOf(marked)
    if (origIdx >= 0) {
      messages.value[origIdx].marked = false
      const lines = notes.value.split('\n').filter(l => !l.includes(marked.content))
      notes.value = lines.join('\n')
    }
  }
}

function scrollToBottom() {
  nextTick(() => {
    if (bubblesOverlay.value) {
      bubblesOverlay.value.scrollTop = bubblesOverlay.value.scrollHeight
    }
  })
}

let audioUnlocked = false
let pendingOpeningTTS = ''
function unlockAudio() {
  if (audioUnlocked) return
  audioUnlocked = true
  tts.unlock().then(() => {
    if (pendingOpeningTTS) {
      tts.speak(pendingOpeningTTS, 'normal')
      pendingOpeningTTS = ''
    }
  })
}

function toggleInputMode() {
  inputMode.value = inputMode.value === 'voice' ? 'text' : 'voice'
}

function cycleChatLevel() {
  chatLevel.value = (chatLevel.value + 1) % 3
  nextTick(() => scrollToBottom())
}

function startRecording() {
  isRecording.value = true
  showToast(lang.value === 'zh' ? '正在录音...' : 'Recording...', 'info')
}

function stopRecording() {
  if (!isRecording.value) return
  isRecording.value = false
  showToast(lang.value === 'zh' ? '语音识别中...' : 'Transcribing...', 'info')
  inputText.value = lang.value === 'zh' ? '请问您哪里不舒服？' : 'Where do you feel uncomfortable?'
  sendMessage()
}

function cancelRecording() {
  if (isRecording.value) {
    isRecording.value = false
    showToast(lang.value === 'zh' ? '已取消录音' : 'Recording cancelled', 'info')
  }
}

function onNextClick() {
  showEndConfirm.value = true
}

function forceEndTraining() {
  showEndConfirm.value = false
  forwardNav.value = true; router.push({ name: 'caseDetail', params: { caseId: caseId.value } })
}

function endStage() {
  const sessionData = {
    caseId: caseId.value,
    stationId: 'historyTaking',
    stage: 'history-taking',
    messages: [...messages.value.map(m => ({ ...m }))],
    notes: notes.value,
    markedCount: markedMessages.value.length,
    duration: elapsedSeconds.value
  }
  store.trainingSession = store.trainingSession || {}
  store.trainingSession.historyTaking = sessionData
  store.saveTrainingSession()

  // 保存训练记录（供 ScoreReport 和 TrainingRecords 使用）
  const rec = store.addTrainingRecord({
    caseId: caseId.value,
    stationId: 'historyTaking',
    stationName: flowCtx.value?.stationName || (lang.value === 'zh' ? '接诊病人站' : 'Reception'),
    duration: elapsedSeconds.value,
    score: 0,
    time: new Date().toLocaleString()
  })

  store.currentCase = caseData.value.basic || c.value
  store.currentRecord = { caseId: caseId.value, stationId: 'historyTaking', stationName: flowCtx.value?.stationName || (lang.value === 'zh' ? '接诊病人站' : 'Reception'), score: 0, time: new Date().toLocaleString(), id: rec.key, recordedAt: rec.recordedAt }

  aisp.flushLogToServer()
  showEndConfirm.value = false

  // 1.0 模式直接跳转评分报告
  if (isV1.value) {
    forwardNav.value = true
    router.push({ name: 'scoreReport', query: { caseId: caseId.value, source: 'training' } })
    return
  }

  const ctx = flowCtx.value
  // 跨站导航时先更新 flowIndex
  if (ctx.advanceToStation >= 0) {
    advanceToNextStation(store.stationScheme || store.stationFlow?.stations || [], store.currentFlowIndex, store)
  }
  if (ctx.nextRoute) {
    forwardNav.value = true; router.replace({ name: ctx.nextRoute, query: { caseId: caseId.value } })
  } else {
    forwardNav.value = true; router.push({ name: 'scoreReport', query: { caseId: caseId.value, source: 'training' } })
  }
}

onMounted(async () => {
  ensureStationIndex(store, route.name)
  document.title = lang.value === 'zh' ? '接诊病人站 · 病史采集' : 'Reception · History Taking'
  startTimer()

  const isResume = route.query.resume === '1'

  if (!caseId.value) {
    caseId.value = route.query.caseId || route.params.caseId || 'IM-20260527-A9GW'
  }

  if (caseId.value) {
    const data = await loadCase(caseId.value)
    if (data) {
      caseData.value = data
      const reception = data.reception
      const basic = data.basic
      const spMaterials = reception?.sp_materials || {}
      const roleInfo = spMaterials.role_info || {}
      const patientInfo = basic?.patient_info || {}
      const occupation = patientInfo.occupation || ''
      const education = patientInfo.education || ''
      const identLine = [occupation, education ? education + '学历' : ''].filter(Boolean).join('，')

      // 提取 meta.json 中的 SP 行为规则
      const spPlayRules = data.meta?.sp_play_rules || null

      // 配置 AISP
      const commTarget = spMaterials.role || reception.communication_target || 'patient'

      // ── 开场白：立即显示，不等待任何网络请求 ──
      const patientGender = patientInfo.sex === '0' || patientInfo.sex === '女' ? '女' : '男'
      if (commTarget === 'family' && roleInfo.gender && roleInfo.age) {
        await tts.configureVoice(roleInfo.gender, roleInfo.age)
      } else {
        await tts.configureVoice(patientGender, patientInfo.age || 30)
      }
      let selfRef = '我'
      if (commTarget === 'family') {
        const rel = (roleInfo.relation || '')
        if (/爸|妈|父|母/.test(rel)) selfRef = '孩子'
        else if (/爱人|丈夫|妻子|老公|老婆/.test(rel)) selfRef = '我爱人'
        else if (/儿|女/.test(rel)) selfRef = patientGender === '女' ? '我妈' : '我爸'
        else selfRef = '家里人'
      }
      const pronoun = selfRef === '我' ? '我' : (patientGender === '女' ? '她' : '他')
      const openingText = `医生，您赶紧给${selfRef}看看，${pronoun}这是怎么了？`

      // 检测是否已有该考站的会话数据（全流程模式中返回已完成的考站）
      const hasSessionData = !!(store.trainingSession?.historyTaking?.messages?.length)

      // 恢复模式/有会话数据：尝试恢复服务端会话
      let restored = false
      if (isResume || hasSessionData) {
        const cached = aisp.getCachedSessionByMode(caseId.value, 'history-taking')
        if (cached && cached.sessionId) {
          try {
            const resp = await fetch('/api/sp/session/restore', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sessionId: cached.sessionId, caseId: caseId.value })
            })
            const rj = await resp.json()
            restored = rj.ok && rj.data?.state === 'active'
          } catch (e) { /* ignore */ }
        }
      }

      // 无历史数据时显示开场白
      if (!isResume && !hasSessionData && !restored) {
        aisp.messages.value.push({
          role: 'sp',
          content: openingText,
          time: Date.now(),
          emotion: 'calm'
        })
        if (tts.unlocked.value) {
          tts.speak(openingText, 'normal')
        } else {
          pendingOpeningTTS = openingText
        }
      }

      // 后台完成会话配置（还原模式不传 openingMessage，避免覆盖历史消息）
      const symptomPool = await aisp.buildSymptomPool(spMaterials.self_narration || '')
      await aisp.configure({
        caseId: caseId.value,
        communicationTarget: commTarget,
        mode: 'history-taking',
        spPlayRules,
        roleDescription: commTarget === 'family'
          ? `你扮演的角色：患者的${roleInfo.relation || '家属'}，${roleInfo.name}，${roleInfo.age}岁，${roleInfo.gender}。\n` +
            `患者信息：${c.value.patient.name}，${c.value.patient.gender}，${c.value.patient.age}岁。\n` +
            `当前情绪：${roleInfo.emotion || ''}`
          : `患者姓名：${roleInfo.name || c.value.patient.name}，性别：${roleInfo.gender || c.value.patient.gender}，年龄：${roleInfo.age || c.value.patient.age}岁。` +
            (identLine ? `\n职业与学历：${identLine}。` : '') +
            `\n当前情绪：${roleInfo.emotion || ''}`,
        symptomPool,
        openingMessage: (isResume || hasSessionData) ? '' : openingText,
        openingLine: '',
        emotionBaseline: roleInfo.emotion || '',
        qaScript: spMaterials.qa_script || [],
        selfNarration: spMaterials.self_narration || '',
        personality: caseData.value.meta?.personality || caseData.value.basic?.personality || null
      })

      // 从 trainingSession 恢复历史消息
      if (isResume || hasSessionData) {
        const sess = store.trainingSession
        const savedMsgs = sess?.historyTaking?.messages
        if (savedMsgs && savedMsgs.length > 0) {
          aisp.messages.value = savedMsgs.map(m => ({ ...m }))
        }
        if (restored) {
          console.log('[HistoryTaking] 会话已从断点恢复')
        }
      }
    }
  }
})

onUnmounted(() => {
  tts.destroy()
})
</script>

<style scoped>
.history-taking-page { position: relative; width: 100vw; height: 100vh; overflow: hidden; }
.patient-bg { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); max-height: calc(100vh - 140px); max-width: 90vw; width: auto; height: auto; object-fit: contain; z-index: 0; border-radius: 12px; }
.patient-placeholder { position: absolute; inset: 0; z-index: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #C0C4CC; font-size: 120px; background: #A2A2A2; }


.emotion-dot { position: absolute; bottom: -2px; right: -2px; width: 10px; height: 10px; border-radius: 50%; border: 2px solid #fff; }
.emo-calm { background: #67C23A; }
.emo-relieved { background: #95D475; }
.emo-uneasy { background: #E6A23C; }
.emo-anxious { background: #E6A23C; animation: pulse-dot 1s infinite; }
.emo-fearful { background: #F56C6C; animation: pulse-dot 0.6s infinite; }
.emo-sad { background: #909399; }
.emo-angry { background: #F56C6C; }
.emo-in_pain { background: #E13B3B; animation: pulse-dot 0.4s infinite; }
.emo-crying_breakdown { background: #E13B3B; animation: pulse-dot 0.3s infinite; }
.emo-furious_outburst { background: #E13B3B; animation: pulse-dot 0.2s infinite; }
.emo-shut_down { background: #303133; }
@keyframes pulse-dot { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }

.chat-bubbles-overlay { position: fixed !important; bottom: 66px !important; left: 0 !important; right: 0 !important; top: auto !important; overflow-y: auto !important; padding: 2px 16px !important; z-index: 5 !important; pointer-events: none !important; display: block !important; }
.chat-bubbles-overlay.chat-level-0 { height: 170px; }
.chat-bubbles-overlay.chat-level-1 { height: 450px; }
.chat-bubbles-overlay.chat-level-2 { height: calc(100vh - 200px); }
.chat-resize-handle { position: fixed; left: 0; right: 0; display: flex; justify-content: center; cursor: pointer; pointer-events: auto; z-index: 6; padding: 0 0 6px; }
.chat-resize-handle.resize-at-0 { bottom: 250px; }
.chat-resize-handle.resize-at-1 { bottom: 530px; }
.chat-resize-handle.resize-at-2 { bottom: calc(100vh - 120px); }
.resize-pill { font-size: 12px; color: #fff; background: #409EFF; border-radius: 12px; padding: 3px 14px; transition: all .15s; display: flex; align-items: center; gap: 4px; box-shadow: 0 1px 4px rgba(64,158,255,0.3); }
.resize-pill:hover { background: #337ecc; box-shadow: 0 2px 8px rgba(64,158,255,0.4); }
.chat-bubbles-overlay > * { pointer-events: auto; }
.bubble-row { display: flex; align-items: flex-start; gap: 6px; margin-bottom: 6px; }
.bubble-row.user { justify-content: flex-end; }
.bubble-row.sp { justify-content: flex-start; }
.bubble-avatar { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; flex-shrink: 0; position: relative; }
.bubble-avatar.sp { background: #67C23A; color: #fff; }
.bubble-avatar.user { background: #409EFF; color: #fff; }
.sp-avatar-img { width: 28px; height: 28px; border-radius: 50%; object-fit: cover; }
.bubble-card { max-width: 70%; padding: 6px 12px; border-radius: 10px; font-size: 12px; line-height: 1.5; word-break: break-word; }
.bubble-card.sp { background: rgba(255,255,255,0.6); color: #303133; border: 1px solid rgba(235,238,245,0.35); }
.bubble-card.sp.fallback { border-left: 3px solid #E6A23C; }
.bubble-card.user { background: #409EFF; color: #fff; }

.mark-star { font-size: 13px; cursor: pointer; color: #A0CFFF; flex-shrink: 0; align-self: flex-end; padding-bottom: 6px; transition: all .15s; }
.mark-star.marked { color: #E6A23C; }
.mark-star:hover { color: #E6A23C; }

.material-card { margin-top: 10px; display: flex; align-items: center; gap: 10px; padding: 8px 10px; background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 10px; cursor: pointer; transition: background .15s; }
.material-card:hover { background: #e0f2fe; }
.mat-thumb { width: 48px; height: 48px; border-radius: 8px; overflow: hidden; display: flex; align-items: center; justify-content: center; background: #e6f7ff; font-size: 20px; color: #409EFF; flex-shrink: 0; }
.mat-img { width: 100%; height: 100%; object-fit: cover; }
.mat-info { flex: 1; min-width: 0; }
.mat-name { font-size: 13px; font-weight: 500; color: #303133; }
.mat-zoom { font-size: 14px; color: #409EFF; flex-shrink: 0; }

.input-bar { position: absolute; bottom: 0; left: 0; right: 0; padding: 10px 16px 12px; background: rgba(255,255,255,0.88); backdrop-filter: blur(6px); border-top: 1px solid rgba(235,238,245,0.4); z-index: 10; }
.input-area { display: flex; gap: 8px; align-items: center; justify-content: center; }
.mode-btn-toggle { display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; border: 1px solid #DCDFE6; border-radius: 8px; background: #fff; font-size: 16px; cursor: pointer; flex-shrink: 0; transition: all .15s; }
.mode-btn-toggle:hover { border-color: #409EFF; }
.mode-btn-toggle.voice { background: #409EFF; color: #fff; border-color: #409EFF; }
.mode-btn-toggle.text { background: #fff; color: #606266; }
.input-area input[type="text"] { flex: 1; max-width: 520px; height: 40px; border: 1px solid #DCDFE6; border-radius: 8px; padding: 0 14px; font-size: 14px; outline: none; }
.input-area input[type="text"]:focus { border-color: #409EFF; }
.send-btn { background: #409EFF; color: #fff; border: none; width: 40px; height: 40px; border-radius: 8px; cursor: pointer; font-size: 16px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
.send-btn:disabled { opacity: .5; cursor: not-allowed; }

.termination-overlay { position: fixed; inset: 0; z-index: 100; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; }

.material-modal-overlay { position: fixed; inset: 0; z-index: 200; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px); }
.material-modal-body { position: relative; max-width: 90vw; max-height: 90vh; background: #fff; border-radius: 12px; padding: 16px 16px 24px; box-shadow: 0 20px 60px rgba(0,0,0,0.4); display: flex; flex-direction: column; align-items: center; }
.material-modal-close { position: absolute; top: -12px; right: -12px; width: 32px; height: 32px; border-radius: 50%; background: #fff; border: 1px solid #DCDFE6; cursor: pointer; font-size: 16px; color: #606266; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.15); z-index: 1; transition: all .15s; }
.material-modal-close:hover { color: #F56C6C; border-color: #F56C6C; }
.material-modal-label { font-size: 14px; font-weight: 600; color: #303133; margin-bottom: 12px; text-align: center; }
.material-modal-img { max-width: 100%; max-height: calc(90vh - 80px); object-fit: contain; border-radius: 8px; }
.material-modal-audio { width: 360px; max-width: 80vw; margin-top: 8px; }
.material-modal-pdf { width: 80vw; height: 80vh; border: none; border-radius: 8px; }
.material-modal-unsupported { padding: 40px 20px; color: #909399; font-size: 14px; }
.termination-dialog { background: #fff; border-radius: 16px; padding: 32px 36px; text-align: center; max-width: 420px; width: 90%; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
.termination-dialog-icon { font-size: 48px; color: #F56C6C; margin-bottom: 12px; }
.termination-dialog-title { font-size: 18px; font-weight: 700; color: #303133; margin-bottom: 8px; }
.termination-dialog-msg { font-size: 14px; color: #606266; line-height: 1.6; margin-bottom: 4px; }
.termination-dialog-reason { font-size: 12px; color: #909399; margin-bottom: 20px; }
.termination-dialog-btn { background: #F56C6C; color: #fff; border: none; padding: 10px 28px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; }
.termination-dialog-btn:hover { background: #e04747; }
.voice-hold-btn { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 0 24px; height: 40px; background: #fff; border: 2px solid #409EFF; border-radius: 12px; cursor: pointer; font-size: 14px; color: #409EFF; flex: 1; max-width: 520px; user-select: none; transition: all .15s; }
.voice-hold-btn:hover { background: rgba(64,158,255,0.05); }
.voice-hold-btn.recording { background: #fef0f0; border-color: #F56C6C; color: #F56C6C; }

.end-warning { color: #909399; font-size: 13px; margin-bottom: 16px; }
.summary-list { margin-bottom: 16px; }
.summary-item { display: flex; justify-content: space-between; padding: 8px 0; font-size: 13px; border-bottom: 1px solid #EBEEF5; }
.summary-item.submitted { color: #67C23A; }
.info-label-row { font-size: 11px; color: #909399; margin: 12px 0 4px; font-weight: 600; }
.info-value-row { font-size: 12px; color: #303133; line-height: 1.6; }
.offline-banner { display: flex; align-items: center; gap: 8px; padding: 8px 14px; margin-bottom: 8px; background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; font-size: 12px; color: #92400e; }
.offline-banner i { color: #f59e0b; font-size: 14px; }
</style>
