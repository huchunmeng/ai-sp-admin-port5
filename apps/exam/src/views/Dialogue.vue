<template>
  <div class="dialogue-page" :class="{ 'float-visible': showFloatPanel, portrait: store.portraitMode }">
    <!-- Patient background -->
    <template v-if="store.patientInfo.idleVideo">
      <video ref="idleVideoRef" :src="store.patientInfo.idleVideo" class="patient-bg" autoplay loop muted playsinline v-show="!isAiSpeaking" />
      <video ref="speakingVideoRef" :src="store.patientInfo.speakingVideo" class="patient-bg" autoplay loop muted playsinline v-show="isAiSpeaking" />
    </template>
    <img v-else-if="store.patientInfo.fullBodyImage" :src="store.patientInfo.fullBodyImage" class="patient-bg" />
    <div v-else class="patient-placeholder">👤</div>

    <!-- Topbar -->
    <div class="dialogue-topbar">
      <span class="station-label">接诊病人站</span>
      <div class="sub-step-bar">
        <template v-for="(step, si) in subSteps" :key="si">
          <div class="sub-step" :class="{ active: store.dialogueStep === si, done: store.dialogueStep > si }"
            @click="switchStep(si)">
            <span class="sub-step-label">{{ step }}</span>
          </div>
          <div v-if="si < subSteps.length - 1" class="sub-step-line" :class="{ done: store.dialogueStep > si }"></div>
        </template>
      </div>
      <div class="topbar-actions">
        <span class="candidate-name">{{ store.examInfo.candidateName }}</span>
        <div class="countdown" :class="cd.status">{{ cd.display }}</div>
        <button class="btn btn-sm end-exam-btn" @click="endExam">结束</button>
      </div>
    </div>

    <!-- Floating info/notes panel — left side, vertical split -->
    <div class="float-info-trigger" :class="{ active: showFloatPanel }" @click="showFloatPanel = !showFloatPanel">
      <i class="fa-solid fa-circle-info"></i>
    </div>
    <div class="float-panel" v-if="showFloatPanel">
      <!-- Info section (top) -->
      <div class="float-section float-section-info">
        <div class="float-section-header">患者信息</div>
        <div class="float-section-body">
          <div class="patient-info-mini">
            <div class="mini-name">
              <span class="patient-thumb">
                <img v-if="store.patientInfo.avatar" :src="store.patientInfo.avatar" />
                <span v-else>👤</span>
              </span>
              {{ store.patientInfo.name }}
            </div>
            <div class="mini-row">
              <span>{{ store.patientInfo.gender }}</span>
              <span>{{ store.patientInfo.age }}岁</span>
              <span v-if="store.patientInfo.occupation">{{ store.patientInfo.occupation }}</span>
            </div>
          </div>
          <div class="chief-complaint" v-if="store.patientInfo.chiefComplaint">
            <strong>主诉：</strong>{{ store.patientInfo.chiefComplaint }}
          </div>
          <div class="vital-mini" v-if="store.patientInfo.vitals && store.patientInfo.vitals.length">
            <div class="vm-item" v-for="(v, vi) in store.patientInfo.vitals" :key="vi">
              <div class="vm-val">{{ v.value }}</div>
              <div class="vm-label">{{ v.label }}</div>
            </div>
          </div>
          <!-- Humanity scenario info -->
          <template v-if="currentMode === 'humanity'">
            <div class="scenario-context">
              <div class="scenario-field">
                <div class="scenario-label">沟通场景</div>
                <div class="scenario-value">{{ humanityScenario.title }}</div>
              </div>
              <div class="scenario-field">
                <div class="scenario-label">场景描述</div>
                <div class="scenario-value">{{ humanityScenario.desc }}</div>
              </div>
              <div v-if="humanityEmotion" class="scenario-field">
                <div class="scenario-label">当前情绪</div>
                <div class="emotion-badge" :class="humanityEmotion">{{ emotionLabels[humanityEmotion] || humanityEmotion }}</div>
              </div>
            </div>
          </template>
        </div>
      </div>
      <!-- Notes section (bottom) -->
      <div class="float-section float-section-notes">
        <div class="float-section-header">笔记</div>
        <div class="float-section-body">
          <div class="notes-display" v-if="store.markedMessages.length === 0">暂无记录，在对话中点击「标记」按钮，患者回答将自动添加到此处</div>
          <div class="marked-items" v-if="store.markedMessages.length > 0">
            <div class="marked-item" v-for="(m, idx) in store.markedMessages" :key="idx">
              <span class="marked-text">{{ truncateText(m.text, 40) }}</span>
              <span class="unmark" @click="store.removeMarkedMessage(idx)"><i class="fa-solid fa-xmark"></i></span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Chat area (chat / exam / humanity modes) -->
    <div v-if="currentMode !== 'diag'" class="chat-area">
      <div class="chat-resize-handle" @click="cycleChatLevel">
        <span class="resize-pill">
          <i class="fa-solid" :class="chatLevel === 2 ? 'fa-chevron-down' : 'fa-chevron-up'"></i>
          {{ chatLevel === 2 ? '收起' : '展开' }}
        </span>
      </div>
      <div class="chat-bubbles-overlay" ref="chatListRef" :class="'chat-level-' + chatLevel">
        <div v-if="currentMsgs.length === 0" class="bubble-row system">
          <div class="bubble-avatar system">
            <i class="fa-solid" :class="currentMode === 'exam' ? 'fa-laptop-medical' : 'fa-user-injured'"></i>
          </div>
          <div class="bubble-card system">
            <strong>{{ emptyLabel }}</strong>
            <p style="margin-top:4px;">{{ emptyHint }}</p>
          </div>
        </div>
        <div v-for="(msg, idx) in currentMsgs" :key="idx" class="bubble-row" :class="msg.from === 'candidate' ? 'user' : 'system'">
          <div v-if="msg.from !== 'candidate'" class="bubble-avatar system">
            <i class="fa-solid" :class="currentMode === 'exam' ? 'fa-laptop-medical' : 'fa-user-injured'"></i>
          </div>
          <div class="bubble-card" :class="msg.from === 'candidate' ? 'user' : 'system'">
            <div class="bubble-time">{{ msg.time }}</div>
            <div class="bubble-text">{{ msg.text }}</div>
            <div v-if="msg.from !== 'candidate' && idx > 0" class="bubble-actions">
              <span class="act" :class="{ marked: msg.marked }" @click="store.toggleMarkMessage(msg)">
                <i class="fa-solid fa-bookmark"></i> {{ msg.marked ? '已标记' : '标记' }}
              </span>
            </div>
          </div>
          <div v-if="msg.from === 'candidate'" class="bubble-avatar user">
            <i class="fa-solid fa-user-doctor"></i>
          </div>
        </div>
        <div v-if="isTyping" class="bubble-row system">
          <div class="bubble-avatar system">
            <i class="fa-solid" :class="currentMode === 'exam' ? 'fa-laptop-medical' : 'fa-user-injured'"></i>
          </div>
          <div class="bubble-card system" style="color:#C0C4CC;">
            <i class="fa-solid fa-ellipsis"></i> 正在回答...
          </div>
        </div>
      </div>
    </div>

    <!-- Diagnosis form (初步诊断 mode) -->
    <div v-if="currentMode === 'diag'" class="diag-area" :class="{ 'float-visible': showFloatPanel }">
      <div class="diag-section">
        <h3 class="form-title">
          <i class="fa-solid fa-stethoscope" style="color:#409EFF;margin-right:8px;"></i>
          初步诊断
        </h3>
        <div class="form-section">
          <h4><i class="fa-solid fa-stethoscope"></i> 初步诊断</h4>
          <div class="tag-chip-list">
            <span v-for="(d, di) in selectedDiags" :key="di" class="tag-chip tag-chip-primary">{{ d.name }}<button class="tag-chip-close" @click="removeDiag(di)">&times;</button></span>
            <span v-if="!selectedDiags.length" class="tag-chip-empty">暂无，请搜索并添加诊断</span>
          </div>
          <div class="tag-search-row">
            <div class="tag-search-input-wrap">
              <input class="input" v-model="diagSearch" @keyup.enter="addDiagFromSearch" placeholder="搜索诊断库..." />
              <div v-if="filteredDiags.length && diagSearch" class="tag-search-dropdown">
                <div v-for="d in filteredDiags" :key="d.code" class="tag-search-option" @mousedown.prevent="selectDiag(d)">{{ d.name }}</div>
              </div>
            </div>
            <button class="btn-add-icon" @click="addDiagFromSearch">+</button>
          </div>
        </div>
        <div class="form-section flex-section">
          <h4><i class="fa-solid fa-magnifying-glass"></i> 诊断依据</h4>
          <div class="textarea-wrap">
            <textarea v-model="diagBasis" placeholder="请逐条列出诊断依据…"></textarea>
          </div>
          <div class="char-count">{{ diagBasis.length }} / 2000</div>
        </div>
        <div class="form-section">
          <h4><i class="fa-solid fa-scale-balanced"></i> 鉴别诊断</h4>
          <div class="tag-chip-list">
            <span v-for="(item, idx) in diffDiagTags" :key="idx" class="tag-chip tag-chip-warning">{{ item }}<button class="tag-chip-close" @click="removeDiffTag(idx)">&times;</button></span>
            <span v-if="!diffDiagTags.length" class="tag-chip-empty">暂无，请搜索并添加鉴别诊断</span>
          </div>
          <div class="tag-search-row">
            <div class="tag-search-input-wrap">
              <input class="input" v-model="newDiffDiag" @input="onDiffDiagInput" @keyup.enter="addDiagTag('differential')" placeholder="搜索诊断库..." />
              <div v-if="differentialSuggestions.length" class="tag-search-dropdown">
                <div v-for="item in differentialSuggestions" :key="item" class="tag-search-option" @mousedown.prevent="selectDiagSuggestion('differential', item)">{{ item }}</div>
              </div>
            </div>
            <button class="btn-add-icon" @click="addDiagTag('differential')">+</button>
          </div>
        </div>
        <div class="form-footer-save">
          <button class="btn btn-primary btn-submit" @click="saveDiag">
            <i class="fa-solid fa-check"></i> 保存
          </button>
        </div>
      </div>
    </div>

    <!-- Input bar -->
    <div v-if="currentMode !== 'diag'" class="input-bar" :class="{ 'float-visible': showFloatPanel }">
      <div class="input-area">
        <button class="mode-btn-toggle" :class="voiceMode ? 'voice' : 'text'" @click="voiceMode = !voiceMode">
          <i v-if="voiceMode" class="fa-solid fa-microphone"></i>
          <i v-else class="fa-solid fa-keyboard"></i>
        </button>
        <template v-if="!voiceMode">
          <input type="text" v-model="inputText" :placeholder="inputPlaceholder" maxlength="2000" @keydown.enter.prevent="send" />
          <button class="send-btn" @click="send" :disabled="!inputText.trim()">
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
            <span>{{ isRecording ? '松开发送' : '按住说话' }}</span>
          </div>
        </template>
      </div>
    </div>

    <!-- End confirmation modal -->
    <div v-if="showEndConfirm" class="modal-overlay" @click.self="showEndConfirm = false">
      <div class="modal-box">
        <div class="modal-title">确认提交</div>
        <div class="modal-body">
          <p>提交后将无法返回修改，确认提交吗？</p>
          <div class="summary-list">
            <div v-for="step in subSteps" :key="step" class="summary-item" :class="stepDone(step) ? 'done' : ''">
              <span>{{ step }}</span>
              <span>{{ stepDone(step) ? '已完成' : '未开始' }}</span>
            </div>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn" @click="showEndConfirm = false">继续答题</button>
          <button class="btn btn-primary" @click="submitAll">确认提交</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, watch, onMounted, onUnmounted, inject } from 'vue'
import { useExamStore } from '@/stores/exam'
import { useCountdown } from '@/composables/useCountdown'
import { humanityScenario } from '@/mock/data'
import { toast } from '@ai-sp/shared'

const store = useExamStore()
const showEndExamModal = inject('showEndExamModal', () => {})
const cd = useCountdown(828)
const inputText = ref('')
const voiceMode = ref(false)
const isRecording = ref(false)
const isTyping = ref(false)
const isAiSpeaking = ref(false)
const chatListRef = ref(null)
const showEndConfirm = ref(false)
const showFloatPanel = ref(false)
const chatLevel = ref(1)
const idleVideoRef = ref(null)
const speakingVideoRef = ref(null)

const emotionLabels = { calm: '平静', fearful: '恐惧', angry: '愤怒', anxious: '焦虑' }
const humanityEmotion = ref('')

const subSteps = computed(() => store.examInfo.selectedProjects || ['病史采集', '体格检查'])

const currentProject = computed(() => subSteps.value[store.dialogueStep] || '病史采集')

function getProjectMode(name) {
  if (name === '体格检查') return 'exam'
  if (name === '人文沟通') return 'humanity'
  if (name === '初步诊断') return 'diag'
  return 'chat'
}
const currentMode = computed(() => getProjectMode(currentProject.value))
const currentMsgs = computed(() => store.dialogueMessages[currentProject.value] || [])

const emptyLabel = computed(() => {
  if (currentMode.value === 'exam') return '体格检查系统'
  return '患者：' + store.patientInfo.name
})
const emptyHint = computed(() => {
  if (currentMode.value === 'exam') return '请选择检查项目开始体格检查'
  if (currentMode.value === 'humanity') return '医生，我到底是什么病啊？严重吗？我真的很担心…'
  return '您好，请问您今天怎么不舒服？'
})
const inputPlaceholder = computed(() => {
  if (currentMode.value === 'exam') return '输入检查项目…'
  if (currentMode.value === 'humanity') return '输入沟通内容…'
  return '输入您要问的问题...'
})

watch(isAiSpeaking, (val) => {
  if (val) {
    if (speakingVideoRef.value) { speakingVideoRef.value.currentTime = 0; speakingVideoRef.value.play() }
  } else {
    if (idleVideoRef.value) { idleVideoRef.value.play() }
  }
})

function switchStep(si) {
  if (si === store.dialogueStep) return
  if (si > store.dialogueStep + 1) {
    toast.show('请按顺序完成当前步骤', 'warning')
    return
  }
  store.setDialogueStep(si)
  scrollBottom()
}

function cycleChatLevel() { chatLevel.value = (chatLevel.value + 1) % 3; nextTick(() => scrollBottom()) }

function analyzeEmotion(input) {
  const text = input.toLowerCase()
  if (text.includes('担心') || text.includes('害怕') || text.includes('怕') || text.includes('恐惧')) return 'fearful'
  if (text.includes('生气') || text.includes('愤怒') || text.includes('怒')) return 'angry'
  if (text.includes('焦虑') || text.includes('紧张') || text.includes('不安')) return 'anxious'
  if (text.includes('没事') || text.includes('放心') || text.includes('还好')) return 'calm'
  return ''
}

function send() {
  const t = inputText.value.trim()
  if (!t) return
  const project = currentProject.value
  store.addDialogueMessage(project, 'candidate', t.slice(0, 2000))
  if (currentMode.value === 'humanity') {
    const emotion = analyzeEmotion(t)
    if (emotion) humanityEmotion.value = emotion
  }
  inputText.value = ''
  isTyping.value = true
  isAiSpeaking.value = true
  scrollBottom()
  setTimeout(() => {
    isTyping.value = false
    isAiSpeaking.value = false
    let reply
    if (currentMode.value === 'exam') {
      const replies = ['检查项目：体温 38.9℃ ↑', '检查项目：心率 96次/分 ↑', '检查项目：血压 128/76mmHg 正常', '听诊：双肺呼吸音清，未闻及干湿啰音']
      reply = replies[Math.floor(Math.random() * replies.length)]
    } else if (currentMode.value === 'humanity') {
      const replies = humanityEmotion.value === 'fearful'
        ? ['医生，真的那么严重吗？我…我还能好吗？', '会不会有生命危险？我家里还有孩子…', '我需要住院吗？会不会影响工作？']
        : humanityEmotion.value === 'angry'
        ? ['为什么会这样？我之前一直很健康的！', '你们之前为什么没查出来？', '那现在怎么办？我不想住院！']
        : ['好的，我明白了…谢谢医生耐心解释。', '那我需要注意些什么呢？', '这个病能完全康复吗？', '医生你说得对，我会配合治疗的。']
      reply = replies[Math.floor(Math.random() * replies.length)]
    } else {
      const replies = ['请问具体是哪个位置不舒服？持续多长时间了？', '以前有过类似情况吗？', '有在服用什么药物吗？', '好的，我了解了。还有其他不舒服吗？']
      reply = replies[Math.floor(Math.random() * replies.length)]
    }
    store.addDialogueMessage(project, 'patient', reply)
    scrollBottom()
  }, 800 + Math.random() * 1200)
}

function startRecording() { isRecording.value = true; toast.show('正在录音...', 'info') }
function stopRecording() {
  if (!isRecording.value) return
  isRecording.value = false; toast.show('语音识别中...', 'info')
  inputText.value = '请问您哪里不舒服？'; send()
}
function cancelRecording() { if (isRecording.value) { isRecording.value = false; toast.show('已取消录音', 'info') } }

function scrollBottom() {
  nextTick(() => { if (chatListRef.value) chatListRef.value.scrollTop = chatListRef.value.scrollHeight })
}

function truncateText(text, maxLen) {
  if (!text) return ''
  return text.length > maxLen ? text.substring(0, maxLen) + '...' : text
}

const diagSearch = ref('')
const selectedDiags = ref((store.preliminaryDiag.preliminary || '').split('、').filter(Boolean).map(n => ({ name: n, code: '' })))
const diffDiagTags = ref((store.preliminaryDiag.differential || '').split('、').filter(Boolean))
const newDiffDiag = ref('')
const differentialSuggestions = ref([])
const diagBasis = ref(store.preliminaryDiag.basis || '')

const filteredDiags = computed(() => {
  if (!diagSearch.value) return []
  const kw = diagSearch.value.toLowerCase()
  return store.diagLibrary.filter(d => d.name.toLowerCase().includes(kw) || d.category.toLowerCase().includes(kw))
})
function onDiffDiagInput() {
  const val = newDiffDiag.value.trim()
  differentialSuggestions.value = val ? store.diagLibrary.filter(d => d.name.toLowerCase().includes(val.toLowerCase())).map(d => d.name) : []
}
function selectDiag(d) { if (!selectedDiags.value.find(s => s.name === d.name)) selectedDiags.value.push(d); diagSearch.value = '' }
function addDiagFromSearch() { const val = diagSearch.value.trim(); if (!val) return; if (!selectedDiags.value.find(s => s.name === val)) selectedDiags.value.push({ name: val, code: '' }); diagSearch.value = '' }
function removeDiag(idx) { selectedDiags.value.splice(idx, 1) }
function addDiagTag(type) { const val = newDiffDiag.value.trim(); if (!val) return; if (!diffDiagTags.value.includes(val)) diffDiagTags.value.push(val); newDiffDiag.value = ''; differentialSuggestions.value = [] }
function removeDiffTag(idx) { diffDiagTags.value.splice(idx, 1) }
function selectDiagSuggestion(type, item) { newDiffDiag.value = item; addDiagTag(type) }
function saveDiag() {
  store.savePreliminaryDiag({ preliminary: selectedDiags.value.map(d => d.name).join('、'), differential: diffDiagTags.value.join('、'), basis: diagBasis.value })
  toast.show('初步诊断已保存', 'success')
}
function stepDone(stepName) {
  if (stepName === '初步诊断') return !!(store.preliminaryDiag.preliminary)
  const msgs = store.dialogueMessages[stepName]
  return msgs && msgs.length > 0
}
function endExam() {
  const hasContent = subSteps.value.some(s => stepDone(s))
  if (!hasContent) { if (typeof showEndExamModal === 'function') showEndExamModal(); return }
  showEndConfirm.value = true
}
function submitAll() { showEndConfirm.value = false; store.setPage('complete') }
onMounted(() => { cd.start(); scrollBottom() })
onUnmounted(() => cd.stop())
</script>

<style scoped>
.dialogue-page { height: 100%; display: flex; flex-direction: column; background: #A2A2A2; position: relative; overflow: hidden; }

/* Patient background */
.patient-bg { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); max-height: calc(100% - 100px); max-width: 95%; width: auto; height: auto; object-fit: contain; z-index: 0; border-radius: 12px; }
.patient-placeholder { position: absolute; inset: 0; z-index: 0; display: flex; align-items: center; justify-content: center; color: #C0C4CC; font-size: 120px; background: #A2A2A2; }

/* Topbar */
.dialogue-topbar { display: flex; align-items: center; padding: 4px 12px; border-bottom: 1px solid rgba(235,238,245,0.3); gap: 10px; min-height: 42px; position: relative; z-index: 10; background: rgba(255,255,255,0.9); backdrop-filter: blur(6px); }
.station-label { font-size: 13px; font-weight: 600; color: #303133; white-space: nowrap; flex-shrink: 0; }
.sub-step-bar { display: flex; align-items: center; flex: 1; justify-content: center; gap: 0; }
.sub-step { padding: 4px 14px; border-radius: 14px; font-size: 12px; color: #909399; cursor: pointer; transition: all .15s; white-space: nowrap; }
.sub-step.active { color: #409EFF; font-weight: 600; background: #ECF5FF; }
.sub-step.done { color: #67C23A; }
.sub-step-line { width: 24px; height: 2px; background: #DCDFE6; margin: 0 2px; flex-shrink: 0; }
.sub-step-line.done { background: #67C23A; }
.topbar-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.candidate-name { font-size: 11px; color: #909399; }
.countdown { font-size: 20px; font-weight: 700; color: #303133; }
.countdown.warning { color: #FF9F43; } .countdown.danger { color: #FF4D4F; animation: pulse .8s infinite; }
@keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: .5 } }

/* Float trigger button */
.float-info-trigger { position: absolute; top: 46px; left: 8px; width: 34px; height: 34px; background: rgba(255,255,255,0.8); border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 11; box-shadow: 0 2px 8px rgba(0,0,0,0.12); font-size: 17px; color: #409EFF; transition: all .2s; border: 1px solid rgba(0,0,0,0.05); }
.float-info-trigger:hover { transform: scale(1.08); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
.float-info-trigger.active { background: #409EFF; color: #fff; border-color: #409EFF; }

/* Float panel — left side, vertical split, high transparency */
.float-panel { position: absolute; top: 46px; left: 4px; width: 185px; bottom: 58px; z-index: 10; display: flex; flex-direction: column; gap: 6px; pointer-events: none; }
.float-panel > * { pointer-events: auto; }
.float-section { background: rgba(255,255,255,0.72); backdrop-filter: blur(4px); border-radius: 10px; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 2px 10px rgba(0,0,0,0.06); border: 1px solid rgba(235,238,245,0.25); }
.float-section-info { flex: 0 1 auto; max-height: 55%; }
.float-section-notes { flex: 1 1 auto; min-height: 0; }
.float-section-header { padding: 6px 10px; font-size: 11px; font-weight: 600; color: #409EFF; border-bottom: 1px solid rgba(235,238,245,0.4); flex-shrink: 0; }
.float-section-body { padding: 8px; overflow-y: auto; flex: 1; }

/* Patient info mini */
.patient-info-mini { margin-bottom: 8px; }
.mini-name { font-weight: 600; font-size: 13px; display: flex; align-items: center; gap: 6px; }
.mini-row { font-size: 11px; color: #909399; margin-top: 2px; display: flex; gap: 6px; }
.patient-thumb img { width: 28px; height: 28px; border-radius: 50%; object-fit: cover; }
.patient-thumb span { width: 28px; height: 28px; border-radius: 50%; background: #dce3ea; display: flex; align-items: center; justify-content: center; font-size: 14px; }
.chief-complaint { font-size: 11px; color: #909399; line-height: 1.5; margin-top: 4px; }
.vital-mini { display: flex; flex-wrap: wrap; gap: 3px; margin: 8px 0; }
.vm-item { text-align: center; background: rgba(245,247,250,0.7); border-radius: 4px; padding: 2px 4px; flex: 1; min-width: 0; }
.vm-val { font-weight: 700; font-size: 10px; color: #303133; }
.vm-label { font-size: 7px; color: #909399; }

/* Scenario in float */
.scenario-context { padding: 2px 0; }
.scenario-field { margin-bottom: 8px; }
.scenario-label { font-size: 10px; color: #909399; margin-bottom: 2px; font-weight: 600; }
.scenario-value { font-size: 11px; color: #303133; line-height: 1.5; }
.emotion-badge { display: inline-block; padding: 1px 8px; border-radius: 8px; font-size: 10px; font-weight: 600; }
.emotion-badge.calm { background: #D1FAE5; color: #065F46; }
.emotion-badge.fearful { background: #FEE2E2; color: #991B1B; }
.emotion-badge.angry { background: #FEF3C7; color: #B45309; }
.emotion-badge.anxious { background: #EDE9FE; color: #5B21B6; }

/* Notes in float */
.notes-display { font-size: 11px; color: #909399; line-height: 1.5; padding: 4px 0; }
.marked-items { max-height: 100%; overflow-y: auto; }
.marked-item { display: flex; justify-content: space-between; align-items: flex-start; gap: 4px; padding: 5px 8px; font-size: 11px; background: rgba(245,247,250,0.6); border-radius: 6px; margin-bottom: 4px; line-height: 1.4; }
.marked-text { flex: 1; color: #303133; word-break: break-word; }
.unmark { cursor: pointer; color: #C0C4CC; font-size: 10px; flex-shrink: 0; padding: 1px; transition: color .15s; }
.unmark:hover { color: #F56C6C; }

/* Chat area — shifted right when float panel visible */
.chat-area { flex: 1; overflow: hidden; position: relative; }
.chat-bubbles-overlay { position: absolute; bottom: 0; left: 0; right: 0; overflow-y: auto; padding: 2px 12px 2px 12px; z-index: 5; pointer-events: none; }
.chat-bubbles-overlay.chat-level-0 { height: 120px; }
.chat-bubbles-overlay.chat-level-1 { height: 300px; }
.chat-bubbles-overlay.chat-level-2 { height: calc(100% - 60px); }

/* Shift chat right when float is visible */
.float-visible .chat-bubbles-overlay { padding-left: 200px; }

/* Resize handle — right-aligned, avoids patient image */
.chat-resize-handle { position: absolute; right: 16px; bottom: 140px; display: flex; justify-content: flex-end; cursor: pointer; z-index: 6; pointer-events: auto; }
.chat-bubbles-overlay.chat-level-0 ~ .chat-resize-handle { bottom: 140px; }
.resize-pill { font-size: 10px; color: #fff; background: rgba(64,158,255,0.8); border-radius: 10px; padding: 2px 10px; transition: all .15s; display: flex; align-items: center; gap: 3px; box-shadow: 0 1px 3px rgba(64,158,255,0.25); }
.resize-pill:hover { background: #409EFF; box-shadow: 0 2px 6px rgba(64,158,255,0.35); }

.chat-bubbles-overlay > * { pointer-events: auto; }
.bubble-row { display: flex; align-items: flex-start; gap: 6px; margin-bottom: 6px; }
.bubble-row.user { justify-content: flex-end; }
.bubble-row.system { justify-content: flex-start; }
.bubble-avatar { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; flex-shrink: 0; }
.bubble-avatar.system { background: #67C23A; color: #fff; }
.bubble-avatar.user { background: #409EFF; color: #fff; }
.bubble-card { max-width: 65%; padding: 6px 12px; border-radius: 10px; font-size: 12px; line-height: 1.5; word-break: break-word; }
.bubble-card.system { background: rgba(255,255,255,0.6); color: #303133; border: 1px solid rgba(235,238,245,0.35); }
.bubble-card.user { background: #409EFF; color: #fff; }
.bubble-time { font-size: 10px; color: #C0C4CC; margin-bottom: 4px; }
.bubble-text { word-break: break-word; }
.bubble-actions { display: flex; gap: 8px; margin-top: 4px; }
.act { font-size: 12px; cursor: pointer; color: #606266; padding: 2px 4px; border-radius: 4px; transition: all .15s; }
.act.marked { color: #E6A23C; }
.act:hover { color: #409EFF; background: rgba(64,158,255,0.08); }

/* Input bar — shifted right when float visible */
.input-bar { position: relative; z-index: 10; padding: 10px 12px 12px; border-top: 1px solid rgba(235,238,245,0.4); background: rgba(255,255,255,0.88); backdrop-filter: blur(6px); }
.float-visible .input-bar { padding-left: 200px; }
.input-area { display: flex; gap: 8px; align-items: center; }
.mode-btn-toggle { display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; border: 1px solid #DCDFE6; border-radius: 8px; background: #fff; font-size: 16px; cursor: pointer; flex-shrink: 0; transition: all .15s; }
.mode-btn-toggle:hover { border-color: #409EFF; }
.mode-btn-toggle.voice { background: #409EFF; color: #fff; border-color: #409EFF; }
.mode-btn-toggle.text { background: #fff; color: #606266; }
.input-area input[type="text"] { flex: 1; height: 40px; border: 1px solid #DCDFE6; border-radius: 8px; padding: 0 14px; font-size: 14px; outline: none; box-sizing: border-box; }
.input-area input[type="text"]:focus { border-color: #409EFF; }
.send-btn { background: #409EFF; color: #fff; border: none; width: 40px; height: 40px; border-radius: 8px; cursor: pointer; font-size: 16px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
.send-btn:disabled { opacity: .5; cursor: not-allowed; }
.voice-hold-btn { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 0 24px; height: 40px; background: #fff; border: 2px solid #409EFF; border-radius: 12px; cursor: pointer; font-size: 14px; color: #409EFF; flex: 1; user-select: none; transition: all .15s; }
.voice-hold-btn:hover { background: rgba(64,158,255,0.05); }
.voice-hold-btn.recording { background: #fef0f0; border-color: #F56C6C; color: #F56C6C; }

/* Diagnosis form */
.diag-area { flex: 1; overflow-y: auto; padding: 12px 16px; position: relative; z-index: 5; background: rgba(255,255,255,0.85); }
.float-visible .diag-area { padding-left: 200px; }
.diag-section { max-width: 700px; margin: 0 auto; }
.form-title { text-align: center; font-size: 18px; font-weight: 700; color: #303133; margin-bottom: 20px; }
.form-section { margin-bottom: 20px; }
.form-section h4 { font-size: 14px; color: #303133; margin-bottom: 8px; }
.tag-chip-list { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
.tag-chip { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 6px; font-size: 13px; }
.tag-chip-primary { background: #dbeafe; color: #1e40af; }
.tag-chip-warning { background: #fef3c7; color: #92400e; }
.tag-chip-close { background: none; border: none; cursor: pointer; font-size: 14px; color: #909399; padding: 0; line-height: 1; }
.tag-chip-close:hover { color: #303133; }
.tag-chip-empty { color: #C0C4CC; font-size: 12px; }
.tag-search-row { display: flex; gap: 8px; }
.tag-search-input-wrap { position: relative; flex: 1; }
.tag-search-input-wrap .input { width: 100%; padding: 8px 10px; border: 1px solid #DCDFE6; border-radius: 6px; font-size: 13px; box-sizing: border-box; }
.tag-search-input-wrap .input:focus { border-color: #409EFF; outline: none; }
.tag-search-dropdown { position: absolute; top: 100%; left: 0; right: 0; background: #fff; border: 1px solid #DCDFE6; border-radius: 8px; max-height: 160px; overflow-y: auto; z-index: 50; box-shadow: 0 4px 12px rgba(0,0,0,0.1); margin-top: 2px; }
.tag-search-option { padding: 6px 10px; cursor: pointer; font-size: 13px; }
.tag-search-option:hover { background: #ecf5ff; color: #409EFF; }
.btn-add-icon { width: 34px; height: 34px; padding: 0; border: 1px solid #409EFF; border-radius: 6px; background: #409EFF; color: #fff; cursor: pointer; font-size: 22px; font-weight: 700; line-height: 34px; transition: all .15s; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
.btn-add-icon:hover { background: #337ecc; border-color: #337ecc; }
.flex-section { display: flex; flex-direction: column; }
.textarea-wrap { flex: 1; display: flex; }
.textarea-wrap textarea { width: 100%; flex: 1; min-height: 120px; padding: 10px 12px; border: 1px solid #DCDFE6; border-radius: 6px; font-size: 13px; resize: none; box-sizing: border-box; }
.textarea-wrap textarea:focus { border-color: #409EFF; outline: none; }
.char-count { text-align: right; font-size: 11px; color: #C0C4CC; margin-top: 4px; }
.form-footer-save { text-align: center; padding-top: 16px; }

/* Modals */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 1000; display: flex; align-items: center; justify-content: center; }
.modal-box { background: #fff; border-radius: 12px; padding: 24px; max-width: 380px; width: 90%; box-shadow: 0 8px 30px rgba(0,0,0,0.15); }
.modal-title { font-size: 16px; font-weight: 600; margin-bottom: 12px; }
.modal-body { font-size: 13px; color: #6B7280; margin-bottom: 16px; line-height: 1.6; }
.modal-body p { margin-bottom: 12px; }
.modal-actions { display: flex; gap: 10px; justify-content: flex-end; }
.summary-list { margin-bottom: 16px; }
.summary-item { display: flex; justify-content: space-between; padding: 8px 0; font-size: 13px; border-bottom: 1px solid #EBEEF5; color: #909399; }
.summary-item.done { color: #67C23A; }

/* Shared */
.input { padding: 8px 12px; border-radius: 8px; font-size: 13px; border: 1px solid #DCDFE6; background: #fff; outline: none; }
.input:focus { border-color: #409EFF; }
.btn { display: inline-flex; align-items: center; justify-content: center; padding: 8px 20px; border-radius: 8px; font-size: 13px; cursor: pointer; border: 1px solid #DCDFE6; background: #fff; color: #4B5563; min-height: 30px; transition: all .15s; }
.btn:hover { border-color: #409EFF; color: #409EFF; }
.btn-primary { background: #409EFF; color: #fff; border-color: #409EFF; }
.btn-primary:hover { color: #fff; background: #337ecc; border-color: #337ecc; }
.btn-sm { padding: 3px 8px; font-size: 11px; min-height: 24px; }
.btn-submit { padding: 12px 32px; font-size: 15px; }
.end-exam-btn { color: #FF4D4F; border-color: #FF4D4F; background: #fff; }

/* Portrait mode */
.portrait .dialogue-topbar { min-height: 36px; padding: 2px 8px; gap: 6px; }
.portrait .station-label { font-size: 11px; }
.portrait .sub-step { padding: 3px 10px; font-size: 10px; }
.portrait .sub-step-line { width: 16px; }
.portrait .countdown { font-size: 17px; }
.portrait .float-info-trigger { top: 40px; width: 30px; height: 30px; font-size: 15px; }
.portrait .float-panel { top: 40px; width: 140px; bottom: 50px; }
.portrait .float-visible .chat-bubbles-overlay { padding-left: 150px; }
.portrait .float-visible .input-bar { padding-left: 150px; }
.portrait .float-visible .diag-area { padding-left: 150px; }
.portrait .bubble-card { max-width: 75%; font-size: 11px; }
.portrait .input-area input[type="text"] { height: 36px; font-size: 13px; padding: 0 10px; }
.portrait .mode-btn-toggle { width: 36px; height: 36px; font-size: 14px; }
.portrait .send-btn { width: 36px; height: 36px; font-size: 14px; }
.portrait .voice-hold-btn { height: 36px; font-size: 13px; }
.portrait .chat-resize-handle { right: 10px; bottom: 120px; }
.portrait .chat-bubbles-overlay.chat-level-0 { height: 100px; }
.portrait .chat-bubbles-overlay.chat-level-1 { height: 240px; }
.portrait .chat-bubbles-overlay.chat-level-2 { height: calc(100% - 54px); }
.portrait .form-title { font-size: 16px; }
.portrait .tag-area { gap: 4px; }
.portrait .sub-step-bar { flex-wrap: wrap; justify-content: center; }
.portrait .candidate-name { display: none; }
.portrait .dialogue-topbar { overflow: hidden; }
.portrait .diag-section { max-width: 100%; }
.portrait .patient-bg { max-height: calc(100% - 90px); max-width: 88%; }
.portrait .patient-placeholder { font-size: 90px; }
.portrait .input-bar { padding: 8px 10px 10px; }
</style>
