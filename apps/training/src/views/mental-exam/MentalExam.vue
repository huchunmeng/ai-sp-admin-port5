<template>
  <div class="mental-exam-page" @click="unlockAudio">
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

    <FloatInfoPanel :patient="c.patient" :vitals="c.vitals" :chiefComplaint="c.chiefComplaint" :lang="lang">
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
      <div class="bubble-row sp" v-if="false">
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
      :cancel-label="lang === 'zh' ? '继续检查' : 'Continue'"
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

const stationProjects = computed(() => {
  const stations = store.stationScheme || store.stationFlow?.stations || []
  const idx = store.currentFlowIndex ?? 0
  return stations[idx]?.projects || []
})
const steps = computed(() => {
  return stationProjects.value.map(p => {
    const mapped = PROJECT_ROUTE_MAP[p]
    return { label: p, route: mapped?.route || 'mentalExam' }
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
  const labelMap = { '病史采集': '病史采集', '体格检查': '体格检查', '辅助检查': '辅助检查', '诊断': '诊断', '治疗计划': '治疗计划', '病历书写': '病历书写', '精神检查': '精神检查' }
  return stations.map(s => ({ ...s, label: labelMap[s.name] || s.name }))
})
const flowStepIndex = computed(() => store.currentFlowIndex ?? 0)
const topBarTitle = computed(() => {
  if (isV1.value) return lang.value === 'zh' ? '精神检查' : 'Mental Status Exam'
  if (flowSteps.value) return lang.value === 'zh' ? '临床思维模拟训练' : 'Clin. Thinking Simulation'
  return flowCtx.value.stationName || (lang.value === 'zh' ? '接诊病人站 · 精神检查' : 'Reception · MSE')
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

const inputMode = ref('text')
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
const idleVideoRef = ref(null)
const speakingVideoRef = ref(null)
const isAiSpeaking = ref(false)
const spEmotion = computed(() => aisp.emotion.value || 'calm')

const emotionLabels = {
  calm: '平静', relieved: '放松', uneasy: '不安', anxious: '焦虑',
  fearful: '恐惧', sad: '悲伤', angry: '愤怒', in_pain: '疼痛',
  crying_breakdown: '情绪崩溃', furious_outburst: '暴怒', shut_down: '沉默',
  flat: '情感平淡', delusional: '妄想激活', irritable: '易激惹',
  hallucinating: '幻觉干扰', withdrawn: '退缩', explosive: '爆发'
}

const caseData = ref({ basic: null, reception: null, meta: null })
const c = computed(() => {
  const basic = caseData.value.basic
  if (!basic) return { patient: { name: '加载中...' }, chiefComplaint: '', symptoms: [], vitals: null, pastHistory: '', familyHistory: '', personalHistory: '' }
  const pi = basic.patient_info || {}
  const gender = pi.sex === '1' || pi.sex === '男' ? '男' : (pi.sex === '0' || pi.sex === '女' ? '女' : '')
  const ageStr = String(pi.age || '').replace('岁', '')
  const ageNum = parseInt(ageStr) || 30
  const preg = pi.pregnancy || basic.pregnancy || ''

  return {
    id: caseId.value,
    patient: {
      name: pi.name || '',
      gender,
      age: ageStr,
      avatar: matchPatientImage({ gender, age: ageNum, isPregnant: preg }, 'patient'),
      fullBodyImage: matchPatientImage({ gender, age: ageNum, isPregnant: preg }, 'full'),
      idleVideo: matchPatientVideo({ gender, age: ageNum, isPregnant: preg }, 'idle'),
      speakingVideo: matchPatientVideo({ gender, age: ageNum, isPregnant: preg }, 'speaking'),
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
    syncMessagesToSession()
  }
  isAiSpeaking.value = false
}

function syncMessagesToSession() {
  store.trainingSession = store.trainingSession || {}
  store.trainingSession.mentalExam = {
    caseId: caseId.value,
    stationId: 'mentalExam',
    stage: 'mental-exam',
    messages: [...aisp.messages.value.map(m => ({ ...m }))],
    notes: notes.value
  }
  store.saveTrainingSession()
}

function restartConversation() {
  aisp.resetEmotion()
  aisp.messages.value = []
  inputText.value = ''
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
  inputText.value = lang.value === 'zh' ? '请问您叫什么名字？' : 'What is your name?'
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
    stationId: 'mentalExam',
    stage: 'mental-exam',
    messages: [...messages.value.map(m => ({ ...m }))],
    notes: notes.value,
    markedCount: markedMessages.value.length,
    duration: elapsedSeconds.value
  }
  store.trainingSession = store.trainingSession || {}
  store.trainingSession.mentalExam = sessionData
  store.saveTrainingSession()

  const rec = store.addTrainingRecord({
    caseId: caseId.value,
    stationId: 'mentalExam',
    stationName: flowCtx.value?.stationName || (lang.value === 'zh' ? '精神检查站' : 'MSE'),
    duration: elapsedSeconds.value,
    score: 0,
    time: new Date().toLocaleString()
  })

  store.currentCase = caseData.value.basic || c.value
  store.currentRecord = { caseId: caseId.value, stationId: 'mentalExam', stationName: flowCtx.value?.stationName || (lang.value === 'zh' ? '精神检查站' : 'MSE'), score: 0, time: new Date().toLocaleString(), id: rec.key, recordedAt: rec.recordedAt }

  aisp.flushLogToServer()
  showEndConfirm.value = false

  if (isV1.value) {
    forwardNav.value = true
    router.push({ name: 'scoreReport', query: { caseId: caseId.value, source: 'training' } })
    return
  }

  const ctx = flowCtx.value
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
  document.title = lang.value === 'zh' ? '接诊病人站 · 精神检查' : 'Reception · MSE'
  startTimer()

  const isResume = route.query.resume === '1'

  if (!caseId.value) {
    caseId.value = route.query.caseId || route.params.caseId || ''
  }

  if (caseId.value) {
    const data = await loadCase(caseId.value)
    if (data) {
      caseData.value = data
      const basic = data.basic
      const patientInfo = basic?.patient_info || {}
      const occupation = patientInfo.occupation || ''
      const education = patientInfo.education || ''
      const identLine = [occupation, education ? education + '学历' : ''].filter(Boolean).join('，')
      const patientGender = patientInfo.sex === '0' || patientInfo.sex === '女' ? '女' : '男'
      const patientAge = patientInfo.age || 30

      await tts.configureVoice(patientGender, patientAge)

      const openingText = '' // 精神检查：学生主动开口，SP不主动说话

      // 检测是否已有该考站的会话数据
      const hasSessionData = !!(store.trainingSession?.mentalExam?.messages?.length)

      let restored = false
      if (isResume || hasSessionData) {
        const cached = aisp.getCachedSessionByMode(caseId.value, 'mental-exam')
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

      // 精神检查：SP不主动说出开场白，等待学生开始问诊
      // 但如果已经有历史数据且恢复成功，不添加新消息

      // 后台配置 AISP 会话
      const atypicalConfig = data.meta?.atypical_dialogue || null
      const symptomPool = await aisp.buildSymptomPool(atypicalConfig?.mental_status
        ? Object.values(atypicalConfig.mental_status).join('；')
        : '')

      await aisp.configure({
        caseId: caseId.value,
        communicationTarget: 'patient',
        mode: 'mental-exam',
        spPlayRules: data.meta?.sp_play_rules || null,
        roleDescription: `患者姓名：${patientInfo.name || ''}，性别：${patientGender}，年龄：${patientAge}岁。` +
          (identLine ? `\n职业与学历：${identLine}。` : ''),
        symptomPool,
        openingMessage: '',
        openingLine: '',
        emotionBaseline: '',
        qaScript: [],
        selfNarration: '',
        personality: data.meta?.personality || data.basic?.personality || null,
        atypicalConfig,
      })

      // 从 trainingSession 恢复历史消息
      if (isResume || hasSessionData) {
        const sess = store.trainingSession
        const savedMsgs = sess?.mentalExam?.messages
        if (savedMsgs && savedMsgs.length > 0) {
          aisp.messages.value = savedMsgs.map(m => ({ ...m }))
        }
        if (restored) {
          console.log('[MentalExam] 会话已从断点恢复')
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
.mental-exam-page { position: relative; width: 100vw; height: 100vh; overflow: hidden; }
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
.emo-flat { background: #909399; }
.emo-delusional { background: #9B59B6; animation: pulse-dot 1.2s infinite; }
.emo-irritable { background: #E67E22; animation: pulse-dot 0.8s infinite; }
.emo-hallucinating { background: #8E44AD; animation: pulse-dot 0.5s infinite; }
.emo-withdrawn { background: #7F8C8D; }
.emo-explosive { background: #E13B3B; animation: pulse-dot 0.2s infinite; }
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
.voice-hold-btn { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 0 24px; height: 40px; background: #fff; border: 2px solid #409EFF; border-radius: 12px; cursor: pointer; font-size: 14px; color: #409EFF; flex: 1; max-width: 520px; user-select: none; transition: all .15s; }
.voice-hold-btn:hover { background: rgba(64,158,255,0.05); }
.voice-hold-btn.recording { background: #fef0f0; border-color: #F56C6C; color: #F56C6C; }

.termination-overlay { position: fixed; inset: 0; z-index: 100; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; }

.end-warning { color: #909399; font-size: 13px; margin-bottom: 16px; }
.summary-list { margin-bottom: 16px; }
.summary-item { display: flex; justify-content: space-between; padding: 8px 0; font-size: 13px; border-bottom: 1px solid #EBEEF5; }
.summary-item.submitted { color: #67C23A; }
.offline-banner { display: flex; align-items: center; gap: 8px; padding: 8px 14px; margin-bottom: 8px; background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; font-size: 12px; color: #92400e; }
.offline-banner i { color: #f59e0b; font-size: 14px; }
</style>
