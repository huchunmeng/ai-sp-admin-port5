<template>
  <div class="humanistic-comm-page" @click="unlockAudio">
    <template v-if="displayPerson.idleVideo">
      <video ref="idleVideoRef" :src="displayPerson.idleVideo" class="patient-bg" autoplay loop muted playsinline v-show="!isAiSpeaking" />
      <video ref="speakingVideoRef" :src="displayPerson.speakingVideo" class="patient-bg" autoplay loop muted playsinline v-show="isAiSpeaking" />
    </template>
    <img v-else-if="displayPerson.fullBodyImage && (displayPerson.fullBodyImage.startsWith('/images/') || displayPerson.fullBodyImage.startsWith('images/'))" :src="displayPerson.fullBodyImage" class="patient-bg" />
    <div v-else class="patient-placeholder">&#x1F464;</div>

    <TrainingTopBar
      :station-name="flowCtx.stationName || (lang === 'zh' ? '人文沟通站' : 'Humanistic Communication')"
      :steps="steps"
      :step-index="stepIndex"
      :formatted-time="formattedTime"
      :timer-class="timerClass"
      :hide-step-number="true"
      :end-label="lang === 'zh' ? (flowCtx.isLast ? '结束' : '下一步') : (flowCtx.isLast ? 'End' : 'Next')"
      :end-icon="flowCtx.isLast ? 'fa-right-from-bracket' : 'fa-arrow-right'"
      :show-lang-toggle="true"
      :lang-label="lang === 'zh' ? 'EN' : '中'"
      @step-click="onStepClick"
      @end="onNextClick"
      @toggle-lang="lang = lang === 'zh' ? 'en' : 'zh'"
    />

    <FloatInfoPanel :patient="displayPerson" :vitals="c.vitals" :chiefComplaint="c.chiefComplaint" :lang="lang">
      <template #info-extra>
        <div class="scenario-context" v-if="currentScenario">
          <div class="scenario-field">
            <div class="scenario-label">{{ lang === 'zh' ? '临床情境' : 'Clinical Context' }}</div>
            <div class="scenario-value">{{ currentScenario.candidate_materials?.clinical_context || '' }}</div>
          </div>
          <div class="scenario-field">
            <div class="scenario-label">{{ lang === 'zh' ? '沟通任务' : 'Task' }}</div>
            <div class="scenario-value">{{ currentScenario.candidate_materials?.task || '' }}</div>
          </div>
          <div class="scenario-field" v-if="currentScenario.candidate_materials?.note">
            <div class="scenario-label">{{ lang === 'zh' ? '备注' : 'Note' }}</div>
            <div class="scenario-value">{{ currentScenario.candidate_materials.note }}</div>
          </div>
        </div>
      </template>
      <template #notes-content>
        <NotesPanel
          :notes="notes"
          :marked-messages="markedMessages"
          :lang="lang"
          :empty-hint="lang === 'zh' ? '暂无记录，在对话中点击「标记」按钮' : 'No records yet. Click Mark on patient responses.'
"
          @unmark="unmarkMessage"
        />
      </template>
    </FloatInfoPanel>

    <!-- 心理阶段指示器 -->
    <div v-if="currentScenario && currentScenario.sp_materials?.psychological_stages" class="stage-indicator">
      <div v-for="(s, i) in currentScenario.sp_materials.psychological_stages" :key="s.stage"
           class="stage-dot-row" :class="{ active: i === activeStageIndex, done: i < activeStageIndex }">
        <span class="stage-num">{{ s.stage }}</span>
        <span class="stage-emotion">{{ stageEmotionLabel(s.emotion) }}</span>
      </div>
    </div>

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
      <div class="bubble-row sp" v-if="messages.length === 0 && currentScenario">
        <div class="bubble-avatar sp">
          <img v-if="displayPerson.avatar" :src="displayPerson.avatar" class="sp-avatar-img" /><i v-else class="fa-solid fa-user"></i>
          <span class="emotion-dot" :class="'emo-' + (spEmotion || 'calm')" :title="emotionLabel"></span>
        </div>
        <div class="bubble-card sp">
          <strong>{{ displayPerson.name }}</strong>
          <p style="margin-top:4px;">{{ validatedOpening(currentScenario.sp_materials?.opening_line) }}</p>
        </div>
      </div>
      <div v-for="(m, idx) in messages" :key="idx"
           :class="['bubble-row', m.role === 'user' ? 'user' : 'sp']">
        <div v-if="m.role === 'sp'" class="bubble-avatar sp">
          <img v-if="displayPerson.avatar" :src="displayPerson.avatar" class="sp-avatar-img" /><i v-else class="fa-solid fa-user"></i>
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
        <div class="bubble-avatar sp"><img v-if="displayPerson.avatar" :src="displayPerson.avatar" class="sp-avatar-img" /><i v-else class="fa-solid fa-user"></i></div>
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
                 :placeholder="lang === 'zh' ? '请输入您的问题...' : 'Type your question...'"
                 @keydown.enter.prevent="sendMessage" />
          <button class="send-btn" @click="sendMessage" :disabled="!inputText.trim() || isTyping || !currentScenario || termination">
            <i class="fa-solid fa-paper-plane"></i>
          </button>
        </template>
        <template v-else>
          <div class="voice-hold-btn" :class="{ recording: isRecording }"
               @mousedown.prevent="startRecording" @mouseup.prevent="stopRecording"
               @mouseleave.prevent="cancelRecording" @touchstart.prevent="startRecording"
               @touchend.prevent="stopRecording">
            <i class="fa-solid fa-microphone"></i>
            <span>{{ isRecording ? (lang === 'zh' ? '松开发送' : 'Release to Send') : (lang === 'zh' ? '按住说话' : 'Hold to Speak') }}</span>
          </div>
        </template>
      </div>
    </div>

    <StationModals
      :show-end-confirm="showEndConfirm"
      :end-title="lang === 'zh' ? '确认结束沟通' : 'Confirm End'"
      :cancel-label="lang === 'zh' ? '继续沟通' : 'Continue'"
      :confirm-label="lang === 'zh' ? '确认结束' : 'Confirm End'"
      :lang="lang"
      @cancel="showEndConfirm = false" @confirm="endStage"
    >
      <template #end-body>
        <p class="end-warning">{{ lang === 'zh' ? '提交后无法返回修改，确认提交吗？' : 'Cannot modify after submission. Confirm?' }}</p>
        <div class="summary-list">
          <div class="summary-item submitted">
            <span>{{ lang === 'zh' ? '对话轮次' : 'Dialog Rounds' }}</span>
            <span>{{ messages.filter(m => m.role === 'user').length }}</span>
          </div>
        </div>
      </template>
    </StationModals>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import { useTrainingStore } from '@/stores/training'
import { useCaseLoader } from '@/composables/useCaseLoader'
import { PROJECT_ROUTE_MAP, resolveNextInFlow, advanceToNextStation, ensureStationIndex } from '@/composables/useStationFlow'
import { useAISP } from '@/composables/useAISP'
import { useTTS } from '@/composables/useTTS'
import { emotionDebugger } from '@/composables/useEmotionDebugger'
import { matchPatientImage, matchPatientVideo } from '@/composables/usePatientImage'
import { showToast, confirmDialog, formatTimeNow, parseVitals } from '@/composables/useUtils'
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
  showEndConfirm.value = true
  next(false)
})

const store = useTrainingStore()
const { formattedTime, elapsedSeconds, startTimer } = useTimer()
const { loadCase } = useCaseLoader()
const aisp = useAISP()
emotionDebugger.bind(aisp)
const tts = useTTS()

const caseId = ref(route.query.caseId || '')
const lang = ref(store.lang || 'zh')
const inputText = ref('')
const notes = ref('')
const bubblesOverlay = ref(null)
const isTyping = computed(() => aisp.isTyping.value)
const configured = computed(() => aisp.configured.value)
const offline = computed(() => aisp.offline.value)
const termination = computed(() => aisp.termination.value)
const isRecording = ref(false)
const showEndConfirm = ref(false)
const chatLevel = ref(1)
const inputMode = ref('voice')
const idleVideoRef = ref(null)
const speakingVideoRef = ref(null)
const isAiSpeaking = ref(false)
const spEmotion = computed(() => aisp.emotion.value || 'calm')
const activeStageIndex = ref(0)
let audioUnlocked = false
let pendingOpeningTTS = ''
let pendingOpeningVoice = 'normal'

function unlockAudio() {
  if (audioUnlocked) return
  audioUnlocked = true
  tts.unlock().then(() => {
    if (pendingOpeningTTS) {
      tts.speak(pendingOpeningTTS, pendingOpeningVoice)
      pendingOpeningTTS = ''
    }
  })
}

const timerClass = computed(() => {
  const mins = Math.floor(elapsedSeconds.value / 60)
  if (mins >= 25) return 'danger'
  if (mins >= 15) return 'warning'
  return ''
})

const emotionLabels = {
  calm: '平静', relieved: '放松', uneasy: '不安', anxious: '焦虑',
  fearful: '恐惧', sad: '悲伤', angry: '愤怒', in_pain: '疼痛',
  crying_breakdown: '情绪崩溃', furious_outburst: '暴怒', shut_down: '沉默'
}
const emotionLabel = computed(() => emotionLabels[spEmotion.value] || spEmotion.value)

// 心理阶段情绪键 → 中文标签（snake_case key 或中文直接透传）
const STAGE_EMOTION_MAP = {
  minimization_denial: '轻视否认',
  anxiety_fear: '焦虑恐惧',
  resistance_skepticism: '抗拒怀疑',
  cautious_acceptance: '谨慎接受',
  defensive_confusion: '防御困惑',
  frustration_resignation: '沮丧认命',
  motivated_pragmatism: '积极务实',
}
function stageEmotionLabel(emotion) {
  if (!emotion) return ''
  if (/[一-龥]/.test(emotion)) return emotion
  return STAGE_EMOTION_MAP[emotion] || emotion
}

// 中文情绪词 → 英文key（用于根据病例baseline设置初始情绪）
const CN_EMOTION_MAP = {
  '焦虑': 'anxious', '恐惧': 'fearful', '悲伤': 'sad', '愤怒': 'angry',
  '低落': 'down', '不安': 'uneasy', '担忧': 'anxious', '困惑': 'uneasy',
  '痛苦': 'sad', '满意': 'pleased', '接受': 'calm', '配合': 'calm',
  '平静': 'calm', '抵触': 'irritated', '犹豫': 'uneasy',
}
function toEmotionKey(cnEmotion) {
  if (!cnEmotion) return 'anxious'
  for (const [cn, key] of Object.entries(CN_EMOTION_MAP)) {
    if (cnEmotion.includes(cn)) return key
  }
  return 'anxious'
}

// 防御：opening_line 可能是字段名（如 2anxiety_fear）而非自然语言
function validatedOpening(raw) {
  if (!raw) return '医生您好...'
  if (/[一-龥]/.test(raw)) return raw
  if (raw.length > 20 && raw.includes(' ')) return raw
  return '医生您好...'
}

// 家属人员信息（family场景覆盖c.patient）
const familyPerson = ref(null)
const displayPerson = computed(() => {
  if (familyPerson.value && currentScenario.value?.communication_target === 'family') {
    return familyPerson.value
  }
  return c.value.patient
})

const stationProjects = computed(() => {
  const stations = store.stationScheme || store.stationFlow?.stations || []
  const idx = store.currentFlowIndex ?? 0
  return stations[idx]?.projects || []
})
const steps = computed(() => {
  return stationProjects.value.map(p => {
    const mapped = PROJECT_ROUTE_MAP[p]
    return { label: p, route: mapped?.route || 'humanisticComm' }
  })
})
const stepIndex = computed(() => {
  const idx = stationProjects.value.findIndex(p => PROJECT_ROUTE_MAP[p]?.route === route.name)
  return idx >= 0 ? idx : 0
})
const flowCtx = computed(() => resolveNextInFlow(store, route.name))

watch(isAiSpeaking, (val) => {
  if (val) {
    if (speakingVideoRef.value) { speakingVideoRef.value.currentTime = 0; speakingVideoRef.value.play() }
  } else {
    if (idleVideoRef.value) { idleVideoRef.value.play() }
  }
})

// 病例数据
const caseData = ref({ basic: null, humanity: null, meta: null })
const c = computed(() => {
  const basic = caseData.value.basic
  if (!basic) return { patient: { name: '加载中...' }, chiefComplaint: '', symptoms: [], vitals: null }
  const pi = basic.patient_info || {}
  const gender = pi.sex === '1' || pi.sex === '男' ? '男' : (pi.sex === '0' || pi.sex === '女' ? '女' : '')
  const ageStr = String(pi.age || '').replace('岁', '')
  const ageNum = parseInt(ageStr) || 30
  const preg = pi.pregnancy || ''
  return {
    id: caseId.value,
    patient: {
      name: pi.name || '', gender, age: ageStr,
      avatar: matchPatientImage({ gender, age: ageNum, isPregnant: preg }, 'patient'),
      fullBodyImage: matchPatientImage({ gender, age: ageNum, isPregnant: preg }, 'full'),
      idleVideo: matchPatientVideo({ gender, age: ageNum, isPregnant: preg }, 'idle'),
      speakingVideo: matchPatientVideo({ gender, age: ageNum, isPregnant: preg }, 'speaking'),
    },
    chiefComplaint: basic.chief_complaint || '',
    symptoms: basic.symptoms || [],
    vitals: parseVitals(basic.physical_exam?.vital_signs),
  }
})

const scenarios = computed(() => caseData.value.humanity?.scenarios || [])
const currentScenario = ref(null)
const messages = computed(() => aisp.messages.value)

const markedMessages = computed(() => messages.value.filter(m => m.role === 'sp' && m.marked))

async function selectScenario(sc) {
  const spInfo = c.value.patient
  const spMaterials = sc.sp_materials || {}
  const basic = caseData.value.basic
  const pi = basic?.patient_info || {}
  const occupation = pi.occupation || ''
  const education = pi.education ? pi.education + '学历' : ''
  const identLine = [occupation, education].filter(Boolean).join('，')
  const commTarget = sc.communication_target || 'patient'

  // TTS音色 + 形象：family场景用家属性别年龄
  let ttsGender = spInfo.gender
  let ttsAge = spInfo.age
  familyPerson.value = null
  if (commTarget === 'family') {
    const rd = spMaterials.role_description || ''
    const maleKw = ['丈夫', '父亲', '儿子', '哥哥', '弟弟', '哥', '弟', '爸爸', '男友']
    const femaleKw = ['妻子', '母亲', '女儿', '姐姐', '妹妹', '姐', '妹', '妈妈', '女友', '老婆', '爱人']
    for (const kw of maleKw) { if (rd.includes(kw)) { ttsGender = '男'; break } }
    if (ttsGender === spInfo.gender) { for (const kw of femaleKw) { if (rd.includes(kw)) { ttsGender = '女'; break } } }
    const ageM = rd.match(/(\d{1,3})岁/)
    if (ageM) ttsAge = parseInt(ageM[1])
    const patientAgeNum = typeof spInfo.age === 'string' ? (parseInt(spInfo.age) || 999) : (spInfo.age || 999)
    const usePatientAssets = ttsGender === '女' && patientAgeNum < 11
    const imgGender = usePatientAssets ? spInfo.gender : ttsGender
    const imgAge = usePatientAssets ? spInfo.age : String(ttsAge)
    familyPerson.value = {
      name: spInfo.relation || '家属',
      gender: ttsGender,
      age: String(ttsAge),
      avatar: matchPatientImage({ gender: imgGender, age: imgAge }, 'patient'),
      fullBodyImage: matchPatientImage({ gender: imgGender, age: imgAge }, 'full'),
      idleVideo: matchPatientVideo({ gender: imgGender, age: imgAge }, 'idle'),
      speakingVideo: matchPatientVideo({ gender: imgGender, age: imgAge }, 'speaking'),
    }
  }

  // ── 同步阶段：在第一个 await 之前完成所有 DOM 可见状态的设置，消除闪烁 ──
  const baselineEmotion = toEmotionKey(spMaterials.role_info?.emotion)
  const opening = validatedOpening(spMaterials.opening_line)
  aisp.emotion.value = baselineEmotion
  aisp.messages.value = [{ role: 'sp', content: opening, time: formatTimeNow(), emotion: baselineEmotion }]
  activeStageIndex.value = 0
  currentScenario.value = sc

  // ── TTS 语音配置与 LLM 调用并行，开场白语音不等待后端 ──
  pendingOpeningTTS = opening
  pendingOpeningVoice = 'normal'
  const voiceReady = tts.configureVoice(ttsGender, ttsAge).then(() => {
    if (tts.unlocked.value && pendingOpeningTTS) {
      tts.speak(pendingOpeningTTS, pendingOpeningVoice)
      pendingOpeningTTS = ''
    }
  }).catch(() => {})

  // ── 异步阶段 ──
  const symptomPool = await aisp.buildSymptomPool(spMaterials.role_description || '')
  await aisp.configure({
    caseId: caseId.value,
    mode: 'humanistic-comm',
    communicationTarget: commTarget,
    spPlayRules: caseData.value.meta?.sp_play_rules || null,
    roleDescription: commTarget === 'family'
      ? `你扮演的角色：患者的${spInfo.relation || '家属'}，${spInfo.name}，${spInfo.gender}，${spInfo.age}岁。`
      : `患者：${spInfo.name}，${spInfo.gender}，${spInfo.age}岁。` +
        (identLine ? `\n职业与学历：${identLine}。` : ''),
    symptomPool,
    openingMessage: opening,
    emotionBaseline: spMaterials.role_info?.emotion || '焦虑',
    psychologicalStages: spMaterials.psychological_stages || [],
    humanityScenario: sc,
    qaScript: spMaterials.script || [],
    selfNarration: spMaterials.role_description || '',
    personality: caseData.value.meta?.personality || caseData.value.basic?.personality || null
  })

  await voiceReady
  startTimer()
}

function restartConversation() {
  aisp.resetEmotion()
  aisp.messages.value = []
  activeStageIndex.value = 0
  inputText.value = ''
  const baselineEmotion = toEmotionKey(currentScenario.value?.sp_materials?.role_info?.emotion)
  aisp.emotion.value = baselineEmotion
  const opening = validatedOpening(currentScenario.value?.sp_materials?.opening_line)
  aisp.messages.value.push({ role: 'sp', content: opening, time: formatTimeNow(), emotion: baselineEmotion })
  if (tts.unlocked.value) {
    tts.speak(opening, 'normal')
  } else {
    pendingOpeningTTS = opening
    pendingOpeningVoice = 'normal'
  }
}

async function sendMessage() {
  const text = inputText.value.trim()
  if (!text || isTyping.value || !currentScenario.value || termination.value) return
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

  if (aisp.termination.value) return

  // 根据消息数量推进心理阶段
  const totalRounds = messages.value.filter(m => m.role === 'user').length
  const stages = currentScenario.value?.sp_materials?.psychological_stages || []
  if (stages.length > 1) {
    const progress = Math.min(Math.floor(totalRounds / 4), stages.length - 1)
    activeStageIndex.value = progress
  }
}

function syncMessagesToSession() {
  store.trainingSession = store.trainingSession || {}
  store.trainingSession.humanisticComm = {
    caseId: caseId.value,
    stationId: 'humanity',
    stage: 'humanistic-comm',
    messages: [...aisp.messages.value.map(m => ({ ...m }))]
  }
  store.saveTrainingSession()
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
    if (bubblesOverlay.value) bubblesOverlay.value.scrollTop = bubblesOverlay.value.scrollHeight
  })
}

function toggleInputMode() { inputMode.value = inputMode.value === 'voice' ? 'text' : 'voice' }
function cycleChatLevel() { chatLevel.value = (chatLevel.value + 1) % 3; nextTick(() => scrollToBottom()) }
function startRecording() { isRecording.value = true; showToast(lang.value === 'zh' ? '正在录音...' : 'Recording...', 'info') }

function stopRecording() {
  if (!isRecording.value) return
  isRecording.value = false
  showToast(lang.value === 'zh' ? '语音识别中...' : 'Transcribing...', 'info')
  inputText.value = lang.value === 'zh' ? '我理解您的担心...' : 'I understand your concern...'
  sendMessage()
}

function cancelRecording() {
  if (isRecording.value) { isRecording.value = false; showToast(lang.value === 'zh' ? '已取消录音' : 'Recording cancelled', 'info') }
}

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
      forwardNav.value = true; router.replace({ name: step.route, query: { caseId: caseId.value, source: 'training' } })
    }
  })
}

function onNextClick() { showEndConfirm.value = true }

function endStage() {
  const sessionData = {
    caseId: caseId.value, stationId: 'humanity', scenarioId: currentScenario.value?.scenario_id,
    messages: [...messages.value.map(m => ({ ...m }))], notes: notes.value,
    markedCount: markedMessages.value.length, duration: elapsedSeconds.value
  }
  store.trainingSession = store.trainingSession || {}
  store.trainingSession.humanisticComm = sessionData
  store.saveTrainingSession()
  const rec = store.addTrainingRecord({
    caseId: caseId.value,
    stationId: 'humanity',
    stationName: flowCtx.value?.stationName || (lang.value === 'zh' ? '人文沟通站' : 'Humanistic Communication'),
    duration: elapsedSeconds.value,
    score: 0,
    time: new Date().toLocaleString()
  })
  store.currentCase = caseData.value.basic || c.value
  store.currentRecord = { caseId: caseId.value, stationId: 'humanity', stationName: flowCtx.value?.stationName || (lang.value === 'zh' ? '人文沟通站' : 'Humanistic Communication'), score: 0, time: new Date().toLocaleString(), id: rec.key, recordedAt: rec.recordedAt }
  showEndConfirm.value = false
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

onUnmounted(() => {
  tts.destroy()
})

onMounted(async () => {
  ensureStationIndex(store, route.name)
  document.title = lang.value === 'zh' ? '人文沟通站' : 'Humanistic Communication'
  if (!caseId.value) caseId.value = route.query.caseId || 'IM-20260527-A9GW'
  const scenarioId = route.query.scenarioId || ''
  const isResume = route.query.resume === '1'

  if (caseId.value) {
    const data = await loadCase(caseId.value)
    if (data) {
      caseData.value = { basic: data.basic, humanity: data.humanity, meta: data.meta }
      if (scenarioId) {
        const sc = (data.humanity?.scenarios || []).find(s => s.scenario_id === scenarioId)
        if (sc) {
          // 恢复模式：先尝试恢复服务端会话
          let sessionRestored = false
          if (isResume) {
            const cached = aisp.getCachedSessionInfo()
            if (cached && cached.sessionId) {
              try {
                const resp = await fetch('/api/sp/session/restore', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ sessionId: cached.sessionId, caseId: caseId.value })
                })
                const rj = await resp.json()
                sessionRestored = rj.ok && rj.data?.state === 'active'
              } catch (e) { /* ignore */ }
            }
          }

          await selectScenario(sc)

          // 恢复模式：加载历史消息
          if (isResume) {
            const sess = store.trainingSession
            const savedMsgs = sess?.humanity?.messages
            if (savedMsgs && savedMsgs.length > 0) {
              aisp.messages.value = savedMsgs.map(m => ({ ...m }))
            }
          }
        }
      }
    }
  }
})
</script>

<style scoped>
.humanistic-comm-page { position: relative; width: 100vw; height: 100vh; overflow: hidden; }
.patient-bg { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); max-height: calc(100vh - 140px); max-width: 90vw; width: auto; height: auto; object-fit: contain; z-index: 0; border-radius: 12px; }
.patient-placeholder { position: absolute; inset: 0; z-index: 0; display: flex; align-items: center; justify-content: center; color: #C0C4CC; font-size: 120px; background: #A2A2A2; }


.scenario-context { margin-top: 8px; }
.scenario-field { margin-bottom: 8px; }
.scenario-label { font-size: 11px; color: #909399; font-weight: 600; margin-bottom: 2px; }
.scenario-value { font-size: 12px; color: #303133; line-height: 1.5; }

.stage-indicator { position: fixed; top: 60px; right: 16px; z-index: 15; display: flex; flex-direction: column; gap: 4px; background: rgba(255,255,255,0.9); border-radius: 10px; padding: 8px; box-shadow: 0 1px 4px rgba(0,0,0,0.1); }
.stage-dot-row { display: flex; align-items: center; gap: 6px; font-size: 11px; color: #C0C4CC; transition: all .15s; }
.stage-dot-row.active { color: #E6A23C; font-weight: 600; }
.stage-dot-row.done { color: #67C23A; }
.stage-num { width: 18px; height: 18px; border-radius: 50%; border: 2px solid currentColor; display: flex; align-items: center; justify-content: center; font-size: 10px; flex-shrink: 0; }

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

.chat-bubbles-overlay { position: fixed !important; bottom: 66px !important; left: 0 !important; right: 0 !important; overflow-y: auto !important; padding: 2px 16px !important; z-index: 5 !important; pointer-events: none !important; }
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
.bubble-avatar { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; flex-shrink: 0; position: relative; }
.bubble-avatar.sp { background: #67C23A; color: #fff; }
.bubble-avatar.user { background: #409EFF; color: #fff; }
.sp-avatar-img { width: 28px; height: 28px; border-radius: 50%; object-fit: cover; }
.bubble-card { max-width: 70%; padding: 6px 12px; border-radius: 10px; font-size: 12px; line-height: 1.5; word-break: break-word; }
.bubble-row.sp { justify-content: flex-start; }
.bubble-card.sp { background: rgba(255,255,255,0.6); color: #303133; border: 1px solid rgba(235,238,245,0.35); }
.bubble-card.sp.fallback { border-left: 3px solid #E6A23C; }
.bubble-card.user { background: #409EFF; color: #fff; }

.mark-star { font-size: 13px; cursor: pointer; color: #A0CFFF; flex-shrink: 0; align-self: flex-end; padding-bottom: 6px; transition: all .15s; }
.mark-star.marked { color: #E6A23C; }
.mark-star:hover { color: #E6A23C; }

.input-bar { position: absolute; bottom: 0; left: 0; right: 0; padding: 10px 16px 12px; background: rgba(255,255,255,0.88); backdrop-filter: blur(6px); border-top: 1px solid rgba(235,238,245,0.4); z-index: 10; }
.input-area { display: flex; gap: 8px; align-items: center; justify-content: center; }
.input-area input[type="text"] { flex: 1; max-width: 520px; height: 40px; border: 1px solid #DCDFE6; border-radius: 8px; padding: 0 14px; font-size: 14px; outline: none; }
.input-area input[type="text"]:focus { border-color: #409EFF; }
.send-btn { background: #409EFF; color: #fff; border: none; width: 40px; height: 40px; border-radius: 8px; cursor: pointer; font-size: 16px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
.send-btn:disabled { opacity: .5; cursor: not-allowed; }

.termination-overlay { position: fixed; inset: 0; z-index: 100; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; }
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
.mode-btn-toggle { display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; border: 1px solid #DCDFE6; border-radius: 8px; background: #fff; font-size: 16px; cursor: pointer; flex-shrink: 0; transition: all .15s; }
.mode-btn-toggle:hover { border-color: #409EFF; }
.mode-btn-toggle.voice { background: #409EFF; color: #fff; border-color: #409EFF; }
.mode-btn-toggle.text { background: #fff; color: #606266; }
.end-warning { color: #909399; font-size: 13px; margin-bottom: 16px; }
.summary-list { margin-bottom: 16px; }
.summary-item { display: flex; justify-content: space-between; padding: 8px 0; font-size: 13px; border-bottom: 1px solid #EBEEF5; }
.summary-item.submitted { color: #67C23A; }
.offline-banner { display: flex; align-items: center; gap: 8px; padding: 8px 14px; margin-bottom: 8px; background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; font-size: 12px; color: #92400e; }
.offline-banner i { color: #f59e0b; font-size: 14px; }
</style>
