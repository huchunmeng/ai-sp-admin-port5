<template>
  <div class="physical-exam-page">
    <video v-if="c.patient.idleVideo" :src="c.patient.idleVideo" class="patient-bg" autoplay loop muted playsinline />
    <img v-else-if="c.patient.fullBodyImage" :src="c.patient.fullBodyImage" class="patient-bg" />
    <div v-else class="patient-placeholder">&#x1F464;</div>

    <TrainingTopBar
      :station-name="topBarTitle"
      :steps="steps"
      :step-index="stepIndex"
      :formatted-time="formattedTime"
      :timer-class="timerClass"
      :hide-step-number="true"
      :end-label="lang === 'zh' ? (flowCtx.isLast ? '结束' : '下一步') : (flowCtx.isLast ? 'End' : 'Next')"
      :end-icon="flowCtx.isLast ? 'fa-right-from-bracket' : 'fa-arrow-right'"
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
          :empty-hint="lang === 'zh' ? '暂无记录，在对话中标记检查结果将自动添加到此处' : 'No records yet. Mark exam results to add them here.'"
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
      <div class="bubble-row system" v-if="messages.length === 0">
        <div class="bubble-avatar system"><i class="fa-solid fa-stethoscope"></i></div>
        <div class="bubble-card system">
          <strong>{{ lang === 'zh' ? '体格检查系统' : 'Physical Exam System' }}</strong>
          <p style="margin-top:4px;">{{ lang === 'zh' ? openPrompt : openPromptEn }}</p>
        </div>
      </div>
      <div v-for="(m, idx) in messages" :key="idx"
           :class="['bubble-row', m.role === 'user' ? 'user' : 'system']"
           :ref="el => { if (el) msgRefs[idx] = el; }">
        <div v-if="m.role === 'system'" class="bubble-avatar system">
          <i class="fa-solid fa-laptop-medical"></i>
        </div>
        <div class="bubble-card" :class="[m.role === 'user' ? 'user' : 'system', m.fallback ? 'fallback' : '']">
          <div v-if="m.role === 'system' && m.parsed">
            <div v-if="m.parsed.note" class="exam-note">{{ m.parsed.note }}</div>
            <div v-for="r in m.parsed.results" :key="r.exam" class="exam-result-item">
              <span class="exam-name">{{ r.exam }}</span>
              <span class="exam-finding" v-if="r.finding">{{ r.finding }}</span>
            </div>
            <div v-if="m.parsed.unmatched && m.parsed.unmatched.length" class="exam-unmatched">
              {{ lang === 'zh' ? '未匹配：' : 'Unmatched: ' }}{{ m.parsed.unmatched.join('、') }}
            </div>
          </div>
          <div v-else>{{ m.content }}</div>
        </div>
        <span class="mark-star" v-if="m.role === 'system' && idx > 0" :class="{ marked: m.marked }" @click="toggleMark(idx)" :title="m.marked ? (lang === 'zh' ? '已标记' : 'Marked') : (lang === 'zh' ? '标记' : 'Mark')">
          <i :class="m.marked ? 'fa-solid fa-star' : 'fa-regular fa-star'"></i>
        </span>
        <div v-if="m.role === 'user'" class="bubble-avatar user">
          <i class="fa-solid fa-user-doctor"></i>
        </div>
      </div>
      <div v-if="isTyping" class="bubble-row system">
        <div class="bubble-avatar system"><i class="fa-solid fa-laptop-medical"></i></div>
        <div class="bubble-card system" style="color:#C0C4CC;">
          <i class="fa-solid fa-ellipsis"></i> {{ lang === 'zh' ? '正在检查...' : 'Examining...' }}
        </div>
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
                 :placeholder="lang === 'zh' ? '输入查体指令（如「听诊二尖瓣」「测量血压」「检查腹部」等）' : 'Enter exam command...'"
                 @keydown.enter.prevent="sendMessage" />
          <button class="send-btn" @click="sendMessage" :disabled="!inputText.trim() || isTyping">
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
      :end-title="lang === 'zh' ? '确认结束体格检查' : 'Confirm End Physical Exam'"
      :cancel-label="lang === 'zh' ? '继续检查' : 'Continue'"
      :confirm-label="lang === 'zh' ? (flowCtx.isLast ? '结束训练' : '进入' + flowCtx.nextLabel) : (flowCtx.isLast ? 'End Training' : 'Proceed to ' + flowCtx.nextLabel)"
      :show-force-end="true"
      :force-end-label="lang === 'zh' ? '结束训练' : 'End Training'"
      :lang="lang"
      @cancel="showEndConfirm = false"
      @confirm="endStage"
      @force-end="forceEndTraining"
    >
      <template #end-body>
        <p class="end-warning">{{ lang === 'zh' ? (flowCtx.isLast ? '进入后无法返回修改。如需提前结束训练，可点击"结束训练"按钮（将无法生成训练报告）。' : '进入' + flowCtx.nextLabel + '阶段后，将无法返回修改。如需提前结束训练，可点击"结束训练"按钮（将无法生成训练报告）。') : (flowCtx.isLast ? 'After proceeding, you cannot return to edit. To end early, click "End Training" (no report will be generated).' : 'After proceeding to ' + flowCtx.nextLabel + ', you cannot return to edit. To end early, click "End Training" (no report will be generated).') }}</p>
        <div class="summary-list">
          <div class="summary-item submitted">
            <span>{{ lang === 'zh' ? '✅ 完成检查项目' : '✅ Exam Items' }}</span>
            <span>{{ messages.filter(m => m.role === 'user').length }}</span>
          </div>
          <div class="summary-item submitted">
            <span>{{ lang === 'zh' ? '✅ 已标记关键结果' : '✅ Marked Items' }}</span>
            <span>{{ markedMessages.length }}</span>
          </div>
          <div class="summary-item" v-if="examHistory.length > 0">
            <span>{{ lang === 'zh' ? '已检查部位' : 'Examined Areas' }}</span>
            <span>{{ examHistory.length }}</span>
          </div>
        </div>
      </template>
    </StationModals>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted, nextTick } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import { useTrainingStore } from '@/stores/training'
import { useCaseLoader } from '@/composables/useCaseLoader'
import { PROJECT_ROUTE_MAP, resolveNextInFlow, advanceToNextStation, ensureStationIndex } from '@/composables/useStationFlow'
import { useAISP } from '@/composables/useAISP'
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
  showEndConfirm.value = true
  next(false)
})

const store = useTrainingStore()
const { formattedTime, elapsedSeconds, startTimer } = useTimer()
const { loadCase } = useCaseLoader()
const aisp = useAISP()
emotionDebugger.bind(aisp)

const configured = computed(() => aisp.configured.value)
const offline = computed(() => aisp.offline.value)

const timerClass = computed(() => {
  const mins = Math.floor(elapsedSeconds.value / 60)
  if (mins >= 35) return 'danger'
  if (mins >= 20) return 'warning'
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
    return { label: p, route: mapped?.route || 'historyTaking' }
  })
})
const stepIndex = computed(() => {
  return stationProjects.value.findIndex(p => PROJECT_ROUTE_MAP[p]?.route === route.name)
})
const flowCtx = computed(() => resolveNextInFlow(store, route.name))

const flowSteps = computed(() => {
  const stations = store.stationFlow?.stations
  if (!stations?.length) return null
  if (stations.length <= 1) return null
  const labelMap = { '病史采集': '病史采集', '体格检查': '体格检查', '辅助检查': '辅助检查', '诊断': '诊断', '治疗计划': '治疗计划', '病历书写': '病历书写' }
  return stations.map(s => ({ ...s, label: labelMap[s.name] || s.name }))
})
const flowStepIndex = computed(() => store.currentFlowIndex ?? 0)
const topBarTitle = computed(() => {
  if (flowSteps.value) return lang.value === 'zh' ? '临床思维模拟训练' : 'Clin. Thinking Simulation'
  return flowCtx.value.stationName || (lang.value === 'zh' ? '体格检查站' : 'Physical Exam')
})
function onFlowStepClick(idx, step) {
  if (idx === flowStepIndex.value) return
  forwardNav.value = true
  syncExamToSession()
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
const isRecording = ref(false)
const showEndConfirm = ref(false)
const chatLevel = ref(1)
const messages = computed(() => aisp.messages.value)

// 病例数据
const caseData = ref({ basic: null, reception: null, meta: null })
const c = computed(() => {
  const basic = caseData.value.basic
  if (!basic) return { patient: { name: '加载中...' }, chiefComplaint: '', vitals: null }
  const pi = basic.patient_info || {}
  const gender = pi.sex === '1' || pi.sex === '男' ? '男' : (pi.sex === '0' || pi.sex === '女' ? '女' : '')
  const ageStr = String(pi.age || '').replace('岁', '')
  const ageNum = parseInt(ageStr) || 30
  const preg = pi.pregnancy || ''
  return {
    id: caseId.value,
    patient: {
      name: pi.name || '',
      gender,
      age: ageStr,
      fullBodyImage: matchPatientImage({ gender, age: ageNum, isPregnant: preg }, 'full'),
      idleVideo: matchPatientVideo({ gender, age: ageNum, isPregnant: preg }, 'idle'),
    },
    chiefComplaint: basic.chief_complaint || '',
    vitals: parseVitals(basic.physical_exam?.vital_signs),
  }
})

const openPrompt = computed(() => {
  const name = c.value.patient?.name || ''
  return '请对患者' + name + '进行体格检查，输入查体指令（如"听诊二尖瓣""测量血压""检查腹部"等）。'
})
const openPromptEn = computed(() => {
  const name = c.value.patient?.name || ''
  return 'Please perform physical examination on ' + name + '. Enter commands (e.g., "auscultate mitral valve", "measure BP", "examine abdomen").'
})

const markedMessages = computed(() =>
  messages.value.filter(m => m.role === 'system' && m.marked)
)

// 已执行检查追踪 + 已加载的检查模板
const examHistory = ref([])
const loadedTemplates = ref([])

// ═══ 关键词 → 体格检查字段映射 ═══
const CATEGORY_KEYWORDS = [
  { cat: 'vital_signs', kw: ['体温', '脉搏', '心率', '呼吸', '血压', '血氧', 'spo2', 'temp', 'pulse', 'bp', 'blood pressure', 'heart rate', 'rr', '生命体征', 'vital'] },
  { cat: 'general', kw: ['一般', '视诊', '发育', '营养', '神态', '意识', '体位', 'general', 'inspection'] },
  { cat: 'heent', kw: ['头', '眼', '耳', '鼻', '口腔', '咽喉', '扁桃', '瞳孔', '巩膜', '结膜', 'head', 'eye', 'ear', 'nose', 'throat', '咽'] },
  { cat: 'neck', kw: ['颈', '气管', '甲状腺', 'thyroid', 'neck'] },
  { cat: 'chest_lung', kw: ['胸', '肺', '呼吸音', 'chest', 'lung', 'rales', 'wheeze', 'crackle', '听诊'] },
  { cat: 'heart', kw: ['心', '心脏', '二尖瓣', '三尖瓣', '主动脉', '肺动脉', 'heart', 'cardiac', 'mitral', 'aortic', '瓣膜'] },
  { cat: 'abdomen', kw: ['腹', '肝', '脾', '肠', 'abdomen', 'liver', 'spleen', 'bowel', 'murphy'] },
  { cat: 'neuro', kw: ['神经', '反射', '感觉', '运动', 'neuro', 'reflex', 'babinski', '肌力', '肌张力', '瞳孔'] },
  { cat: 'skin', kw: ['皮肤', '皮疹', 'skin', 'rash', '黏膜'] },
  { cat: 'extremity', kw: ['四肢', '关节', '脊柱', 'extremity', 'limb', 'spine', '手足', '手脚', '背部', 'back'] },
  { cat: 'vascular', kw: ['血管', '动脉', 'vascular', 'bruit', '脉搏'] },
  { cat: 'lymph', kw: ['淋巴结', 'lymph'] },
]

function matchCategory(command) {
  const lower = command.toLowerCase()
  for (const { cat, kw } of CATEGORY_KEYWORDS) {
    if (kw.some(k => lower.includes(k))) return cat
  }
  return null
}

const CAT_LABELS = {
  vital_signs: '生命体征', general: '一般情况', heent: '头颈部', neck: '颈部',
  chest_lung: '胸部/肺部', heart: '心脏', abdomen: '腹部',
  neuro: '神经系统', skin: '皮肤', extremity: '四肢脊柱', vascular: '血管',
  systemic: '系统查体', lymph: '淋巴结'
}

function buildExamTemplates(basic, reception, meta) {
  const templates = []
  const pe = basic?.physical_exam || {}

  for (const [key, value] of Object.entries(pe)) {
    if (typeof value === 'string' && value.trim()) {
      templates.push({
        category: key,
        exam: CAT_LABELS[key] || key,
        finding: value.trim(),
      })
    }
  }

  // physical_score_items from reception
  const scoreItems = reception?.examiner_materials?.physical_score_items
  if (Array.isArray(scoreItems)) {
    for (const item of scoreItems) {
      templates.push({
        category: 'score_item',
        exam: item.item,
        keywords: item.keywords || [],
      })
    }
  }

  return templates
}

// 前置过滤：拦截明显非体检指令的输入（寒暄/病史术语/过短）
function isValidExamCommand(text) {
  const t = text.trim()
  if (t.length < 2) return false
  // 纯寒暄（精确匹配，避免误伤含问候词的合理提问）
  const greetings = ['你好', '您好', '嗨', '哈喽', '哈啰', '早上好', '下午好', '晚上好', '谢谢', '再见', '拜拜', '好的', 'ok', 'OK']
  if (greetings.includes(t)) return false
  // 病史采集站术语（这些属于问诊站，不是体检站）
  const historyTerms = ['现病史', '既往史', '主诉', '鉴别诊断', '家族史', '个人史', '婚育史', '月经史', '初步诊断', '诊断依据']
  if (historyTerms.some(h => t.includes(h))) return false
  // 反问/闲聊
  const chatter = ['你怎么了', '你哪儿不舒服', '你还好吗', '你是谁', '你叫什么', '你多大了']
  if (chatter.some(c => t.includes(c))) return false
  return true
}

function isRepeated(command) {
  const lower = command.toLowerCase().replace(/\s/g, '')
  for (const hist of examHistory.value) {
    if (hist.lower.includes(lower) || lower.includes(hist.lower)) return hist
  }
  return null
}

function localKeywordMatch(command) {
  const pe = caseData.value.basic?.physical_exam || {}
  const cat = matchCategory(command)

  // 命中已知分类且有独立数据 → 直接返回
  if (cat && pe[cat]) {
    if (cat === 'vital_signs') {
      const subResults = extractVitalSignSubItem(command, pe[cat])
      if (subResults.length > 0) {
        return { results: subResults, unmatched: [], repeated: [] }
      }
    }
    return {
      results: [{ exam: CAT_LABELS[cat] || cat, finding: pe[cat] }],
      unmatched: [],
      repeated: []
    }
  }

  // 命中已知分类但无该分类独立数据 → 反馈暂无记录
  if (cat && !pe[cat]) {
    const available = [...new Set(loadedTemplates.value.map(t => t.exam).filter(Boolean))]
    return {
      results: [],
      unmatched: [command],
      repeated: [],
      note: (CAT_LABELS[cat] || cat) + '检查暂无记录数据。\n可做的检查包括：' + available.join('、')
    }
  }

  // 未命中任何已知分类 → 笼统请求 / 偏门/无关检查
  return buildUnmatchedResponse(command)
}

function isGenericRequest(command) {
  const t = command.trim()
  const patterns = ['做个体检', '全身检查', '查一下', '全部查', '所有检查', '常规检查',
    '体格检查', '全面检查', '都查', '查体', '体检', '检查一下', '帮我检查',
    '做检查', '有什么检查', '哪些检查', '什么检查', '检查项目', '查哪些',
    '能做哪些', '能做什么', '做哪些检查', '都做', '都查一遍', '查查看']
  return patterns.some(p => t.includes(p))
}

function buildUnmatchedResponse(command) {
  // 笼统请求 → 列出可用检查项（教学引导，非评分环节）
  if (isGenericRequest(command)) {
    const available = loadedTemplates.value.map(t => t.exam).filter(Boolean)
    const unique = [...new Set(available)]
    return {
      results: [],
      unmatched: [],
      repeated: [],
      note: '可做的检查项目：' + unique.join('、') + '。\n请问你想查哪些？'
    }
  }
  // 未命中任何已知分类且非笼统请求 → 引导提示
  return {
    results: [],
    unmatched: [command],
    repeated: [],
    note: '未识别到明确的检查项目。可做的检查包括：' + [...new Set(loadedTemplates.value.map(t => t.exam).filter(Boolean))].join('、') + '。\n请明确检查部位或项目。'
  }
}

function extractVitalSignSubItem(command, fullText) {
  // 子项 → 正则（宽松匹配，允许缺冒号/空格）
  const items = {
    '体温': /T[：:：\s]*([\d.]+[℃C]?)/,
    '心率': /(?:HR|P)[：:：\s]*(\d+)/,
    '脉搏': /P[：:：\s]*(\d+)/,
    '呼吸': /R[：:：\s]*(\d+)/,
    '血压': /BP[：:：\s]*([\d/]+\s*mmHg)/,
    '血氧': /SpO[₂2][：:：\s]*([\d.]+%)/
  }
  const matched = []
  const lower = command.toLowerCase()
  for (const [label, regex] of Object.entries(items)) {
    if (lower.includes(label.toLowerCase())) {
      const m = fullText.match(regex)
      matched.push(m
        ? { exam: label, finding: m[1] }
        : { exam: label, finding: '此项未查' }
      )
    }
  }
  return matched
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

async function sendMessage() {
  const text = inputText.value.trim()
  if (!text || isTyping.value) return

  const time = formatTimeNow()

  // 前置过滤：非体检指令 → 引导提示，不写入历史
  if (!isValidExamCommand(text)) {
    messages.value.push({ role: 'user', content: text, time })
    messages.value.push({
      role: 'system',
      content: '请输入查体指令，如"测量血压""听诊心肺""检查腹部""神经系统查体"等。',
      time: formatTimeNow(), marked: false,
    })
    inputText.value = ''
    nextTick(() => scrollToBottom())
    return
  }

  // 检查重复
  const repeated = isRepeated(text)
  if (repeated) {
    messages.value.push({ role: 'user', content: text, time })
    messages.value.push({
      role: 'system', content: '此检查已执行过：' + repeated.original,
      time: formatTimeNow(), marked: false, repeated: true
    })
    inputText.value = ''
    nextTick(() => scrollToBottom())
    return
  }

  // ═══ LLM 主路径：所有有效体检指令送 LLM 识别和反馈 ═══
  messages.value.push({ role: 'user', content: text, time })
  inputText.value = ''

  try {
    const result = await aisp.sendExamCommand(text)
    let parsed
    try {
      parsed = JSON.parse(result)
    } catch (e) {
      parsed = { results: [], unmatched: [text], note: result }
    }

    examHistory.value.push({ lower: text.toLowerCase().replace(/\s/g, ''), original: text })

    const displayText = parsed.note && parsed.results.length === 0
      ? parsed.note
      : formatResultsDisplay(parsed.results)

    messages.value.push({
      role: 'system',
      content: displayText,
      time: formatTimeNow(),
      marked: false,
      parsed,
    })
    nextTick(() => scrollToBottom())
  } catch (e) {
    // LLM 不可用 → 本地兜底
    console.warn('[PE] LLM 失败，走本地兜底:', e.message)
    const fallback = localKeywordMatch(text)
    examHistory.value.push({ lower: text.toLowerCase().replace(/\s/g, ''), original: text })

    const displayText = fallback.note && fallback.results.length === 0
      ? fallback.note
      : formatResultsDisplay(fallback.results)

    messages.value.push({
      role: 'system',
      content: displayText || '检查数据暂无记录',
      time: formatTimeNow(),
      marked: false,
      parsed: fallback,
      fallback: true,
    })
    nextTick(() => scrollToBottom())
  }
  // 每次体检操作后实时同步消息到 trainingSession
  syncExamToSession()
}

function syncExamToSession() {
  store.trainingSession = store.trainingSession || {}
  store.trainingSession.physicalExam = {
    caseId: caseId.value,
    stationId: 'physicalExam',
    stage: 'physical-exam',
    messages: [...messages.value.map(m => ({ ...m }))],
    examHistory: [...examHistory.value],
    notes: notes.value
  }
  store.saveTrainingSession()
}

function formatResultsDisplay(results) {
  if (!results || results.length === 0) return ''
  return results.map(r => {
    if (r.finding) return r.exam + '：' + r.finding
    return r.exam || ''
  }).join('\n')
}

function toggleMark(idx) {
  if (messages.value[idx] && messages.value[idx].role === 'system') {
    messages.value[idx].marked = !messages.value[idx].marked
    if (messages.value[idx].marked) {
      const header = lang.value === 'zh' ? '📌 标记：' : '📌 Mark: '
      notes.value += (notes.value ? '\n' : '') + header + messages.value[idx].content
    } else {
      const lines = notes.value.split('\n').filter(l => !l.includes(messages.value[idx].content))
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
  inputText.value = lang.value === 'zh' ? '请进行体格检查' : 'Please perform physical examination'
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
  aisp.flushLogToServer()
  forwardNav.value = true; router.push({ name: 'caseDetail', query: { caseId: caseId.value } })
}

function endStage() {
  const sessionData = {
    caseId: caseId.value,
    stationId: 'physicalExam',
    stage: 'physical-exam',
    messages: [...messages.value.map(m => ({ ...m }))],
    examHistory: [...examHistory.value],
    notes: notes.value,
    markedCount: markedMessages.value.length,
    duration: elapsedSeconds.value
  }
  store.trainingSession = store.trainingSession || {}
  store.trainingSession.physicalExam = sessionData
  store.saveTrainingSession()
  const rec = store.addTrainingRecord({
    caseId: caseId.value,
    stationId: 'physicalExam',
    stationName: flowCtx.value?.stationName || (lang.value === 'zh' ? '体格检查站' : 'Physical Exam'),
    duration: elapsedSeconds.value,
    score: 0,
    time: new Date().toLocaleString()
  })
  store.currentCase = caseData.value.basic || c.value
  store.currentRecord = { caseId: caseId.value, stationId: 'physicalExam', stationName: flowCtx.value?.stationName || (lang.value === 'zh' ? '体格检查站' : 'Physical Exam'), score: 0, time: new Date().toLocaleString(), id: rec.key, recordedAt: rec.recordedAt }
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

onMounted(async () => {
  ensureStationIndex(store, route.name)
  document.title = lang.value === 'zh' ? '接诊病人站 · 体格检查' : 'Reception · Physical Exam'

  // 恢复之前的笔记
  const sess = store.trainingSession || {}
  if (sess.historyTaking?.notes) {
    notes.value = sess.historyTaking.notes
  }
  if (sess.physicalExam?.examHistory) {
    examHistory.value = sess.physicalExam.examHistory
  }

  startTimer()

  if (!caseId.value) {
    caseId.value = route.query.caseId || route.params.caseId || 'IM-20260527-A9GW'
  }

  if (caseId.value) {
    const data = await loadCase(caseId.value)
    if (data) {
      caseData.value = data
      // 优先使用预存的模板（CaseDetail 预加载时写入）
      let templates
      try {
        const cached = sessionStorage.getItem(`aisp_exam_templates_${caseId.value}`)
        if (cached) {
          templates = JSON.parse(cached)
          sessionStorage.removeItem(`aisp_exam_templates_${caseId.value}`)
        }
      } catch (e) { /* ignore */ }
      if (!templates || templates.length === 0) {
        templates = buildExamTemplates(data.basic, data.reception, data.meta)
      }
      loadedTemplates.value = templates

      await aisp.configure({
        caseId: caseId.value,
        mode: 'physical-exam',
        communicationTarget: 'patient',
        personality: data.meta?.personality || data.basic?.personality || null,
        examTemplates: templates,
      })

      // 全流程模式：从 trainingSession 恢复历史消息
      const savedExamMsgs = store.trainingSession?.physicalExam?.messages
      if (savedExamMsgs && savedExamMsgs.length > 0) {
        aisp.messages.value = savedExamMsgs.map(m => ({ ...m }))
      }
    }
  }
})
</script>

<style scoped>
.physical-exam-page { position: relative; width: 100vw; height: 100vh; overflow: hidden; }
.patient-bg { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); max-height: calc(100vh - 140px); max-width: 90vw; width: auto; height: auto; object-fit: contain; z-index: 0; border-radius: 12px; }
.patient-placeholder { position: absolute; inset: 0; z-index: 0; display: flex; align-items: center; justify-content: center; color: #C0C4CC; font-size: 120px; background: #A2A2A2; }


.chat-bubbles-overlay { position: fixed !important; bottom: 66px !important; left: 0 !important; right: 0 !important; top: auto !important; overflow-y: auto !important; padding: 2px 16px !important; z-index: 5 !important; pointer-events: none !important; display: block !important; }
.chat-bubbles-overlay.chat-level-0 { height: 170px; }
.chat-bubbles-overlay.chat-level-1 { height: 450px; }
.chat-bubbles-overlay.chat-level-2 { height: calc(100vh - 150px); }
.chat-resize-handle { position: fixed; left: 0; right: 0; display: flex; justify-content: center; cursor: pointer; pointer-events: auto; z-index: 6; padding: 0 0 6px; }
.chat-resize-handle.resize-at-0 { bottom: 250px; }
.chat-resize-handle.resize-at-1 { bottom: 530px; }
.chat-resize-handle.resize-at-2 { bottom: calc(100vh - 120px); }
.resize-pill { font-size: 12px; color: #fff; background: #409EFF; border-radius: 12px; padding: 3px 14px; transition: all .15s; display: flex; align-items: center; gap: 4px; box-shadow: 0 1px 4px rgba(64,158,255,0.3); }
.resize-pill:hover { background: #337ecc; box-shadow: 0 2px 8px rgba(64,158,255,0.4); }
.chat-bubbles-overlay > * { pointer-events: auto; }
.bubble-row { display: flex; align-items: flex-start; gap: 6px; margin-bottom: 6px; }
.bubble-row.user { justify-content: flex-end; }
.bubble-row.system { justify-content: flex-start; }
.bubble-avatar { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; flex-shrink: 0; }
.bubble-avatar.system { background: #67C23A; color: #fff; }
.bubble-avatar.user { background: #409EFF; color: #fff; }
.bubble-card { max-width: 70%; padding: 6px 12px; border-radius: 10px; font-size: 12px; line-height: 1.5; word-break: break-word; }
.bubble-card.system { background: rgba(255,255,255,0.6); color: #303133; border: 1px solid rgba(235,238,245,0.35); }
.bubble-card.system.fallback { border-left: 3px solid #E6A23C; }
.bubble-card.user { background: #409EFF; color: #fff; }

.mark-star { font-size: 13px; cursor: pointer; color: #A0CFFF; flex-shrink: 0; align-self: flex-end; padding-bottom: 6px; transition: all .15s; }
.mark-star.marked { color: #E6A23C; }
.mark-star:hover { color: #E6A23C; }

.exam-result-item { padding: 3px 0; border-bottom: 1px solid rgba(235,238,245,0.5); }
.exam-result-item:last-child { border-bottom: none; }
.exam-name { font-weight: 600; color: #409EFF; margin-right: 6px; }
.exam-finding { color: #303133; }
.exam-unmatched { color: #E6A23C; font-size: 11px; margin-top: 4px; }
.exam-note { color: #909399; font-size: 11px; margin-bottom: 4px; font-style: italic; }

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

.end-warning { color: #909399; font-size: 13px; margin-bottom: 16px; }
.summary-list { margin-bottom: 16px; }
.summary-item { display: flex; justify-content: space-between; padding: 8px 0; font-size: 13px; border-bottom: 1px solid #EBEEF5; }
.summary-item.submitted { color: #67C23A; }
.offline-banner { display: flex; align-items: center; gap: 8px; padding: 8px 14px; margin-bottom: 8px; background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; font-size: 12px; color: #92400e; }
.offline-banner i { color: #f59e0b; font-size: 14px; }
</style>
