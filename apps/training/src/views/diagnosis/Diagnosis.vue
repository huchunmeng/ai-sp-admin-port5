<template>
  <div class="diagnosis-page">
    <video v-if="c.patient.idleVideo" class="patient-bg" :src="c.patient.idleVideo" autoplay loop muted playsinline />
    <img v-else-if="c.patient.fullBodyImage && (c.patient.fullBodyImage.startsWith('/images/') || c.patient.fullBodyImage.startsWith('images/'))" class="patient-bg" :src="c.patient.fullBodyImage" />
    <div v-else class="patient-placeholder">👤</div>

    <TrainingTopBar
      :stationName="topBarTitle"
      :steps="steps"
      :stepIndex="stepIndex"
      :formattedTime="formattedTime"
      :endLabel="lang === 'zh' ? (flowCtx.isLast ? '结束' : '下一步') : (flowCtx.isLast ? 'End' : 'Next')"
      :endIcon="flowCtx.isLast ? 'fa-right-from-bracket' : 'fa-arrow-right'"
      :hideStepNumber="true"
      showLangToggle
      :langLabel="lang === 'zh' ? 'EN' : '中'"
      :flow-steps="flowSteps"
      :flow-step-index="flowStepIndex"
      @step-click="onStepClick"
      @end="submitDiag"
      @toggle-lang="lang = lang === 'zh' ? 'en' : 'zh'"
      @flow-step-click="onFlowStepClick"
    />

    <div class="body-area">
      <div class="left-panel">
        <div class="panel-tabs">
          <div class="panel-tab" :class="{ active: leftTab === 'info' }" @click="leftTab = 'info'">
            {{ lang === 'zh' ? '患者信息' : 'Info' }}
          </div>
          <div class="panel-tab" :class="{ active: leftTab === 'notes' }" @click="leftTab = 'notes'">
            {{ lang === 'zh' ? '笔记' : 'Notes' }}
          </div>
          <div class="panel-tab" :class="{ active: leftTab === 'history' }" @click="leftTab = 'history'">
            {{ lang === 'zh' ? '接诊记录' : 'History' }}
          </div>
        </div>
        <div class="panel-content">
          <div v-show="leftTab === 'info'">
            <PatientInfoPanel :patient="c.patient" :vitals="c.vitals" :chiefComplaint="c.chiefComplaint" :lang="lang" />
          </div>
          <div v-show="leftTab === 'notes'">
            <div v-if="diagMarkedMessages.length">
              <div class="marked-msg" v-for="(m, i) in diagMarkedMessages" :key="i">
                <div class="marked-role">{{ m.role === 'user' ? (lang === 'zh' ? '我' : 'Me') : 'SP' }}</div>
                <div class="marked-text">{{ m.content }}</div>
              </div>
            </div>
            <div v-else class="empty-notes">{{ lang === 'zh' ? '暂无笔记' : 'No notes' }}</div>
          </div>
          <div v-show="leftTab === 'history'">
            <div v-if="historyMessages.length" class="chat-history">
              <div v-for="(m, i) in historyMessages" :key="i" class="chat-bubble" :class="m.role === 'user' ? 'by-user' : 'by-sp'">
                <div class="bubble-meta">{{ m.role === 'user' ? (lang === 'zh' ? '我' : 'Me') : 'SP' }} · {{ m.time }}</div>
                <div class="bubble-text">{{ m.content }}</div>
              </div>
            </div>
            <div v-else class="empty-notes">{{ lang === 'zh' ? '暂无接诊记录' : 'No history yet' }}</div>
          </div>
        </div>
      </div>

      <div class="right-panel">
        <div class="form-scroll">
          <div class="section-title">{{ lang === 'zh' ? '诊断' : 'Diagnosis' }}</div>

          <!-- Section 1: Preliminary Diagnosis -->
          <div class="diag-section">
            <div class="diag-section-header">
              <span class="diag-section-num">1</span>
              <span class="diag-section-title">{{ lang === 'zh' ? '初步诊断' : 'Preliminary Diagnosis' }}</span>
            </div>
            <div class="tag-input-wrap">
              <div class="tag-chips">
                <span v-for="(tag, idx) in primaryDiagTags" :key="idx" class="tag-chip tag-primary">
                  {{ tag }}
                  <i class="fa-solid fa-xmark" @click="removeDiagTag('primary', idx)"></i>
                </span>
              </div>
              <div class="input-row">
                <input
                  v-model="newPrimaryDiag"
                  type="text"
                  :placeholder="lang === 'zh' ? '输入诊断名称，回车添加...' : 'Type diagnosis, Enter to add...'"
                  @input="onPrimaryDiagInput"
                  @keydown.enter.prevent="addDiagTag('primary')"
                  class="tag-input"
                />
                <button class="add-btn" @click="addDiagTag('primary')" :disabled="!newPrimaryDiag.trim()">
                  <i class="fa-solid fa-plus"></i>
                </button>
              </div>
              <div v-if="primarySuggestions.length" class="suggestion-dropdown">
                <div v-for="s in primarySuggestions" :key="s" class="suggestion-item" @click="selectDiagSuggestion('primary', s)">
                  {{ s }}
                </div>
              </div>
            </div>

            <div class="form-group" style="margin-top:12px;">
              <label class="form-label">{{ lang === 'zh' ? '诊断依据' : 'Diagnostic Basis' }}</label>
              <textarea
                v-model="diag.basis"
                :placeholder="lang === 'zh' ? '请输入诊断依据...' : 'Enter diagnostic basis...'"
                maxlength="2000"
                class="diag-textarea"
              ></textarea>
              <div class="char-count">{{ diag.basis.length }}/2000</div>
            </div>
          </div>

          <!-- Section 2: Differential Diagnosis -->
          <div class="diag-section">
            <div class="diag-section-header">
              <span class="diag-section-num">2</span>
              <span class="diag-section-title">{{ lang === 'zh' ? '鉴别诊断' : 'Differential Diagnosis' }}</span>
            </div>
            <div class="tag-input-wrap">
              <div class="tag-chips">
                <span v-for="(tag, idx) in differentialDiagTags" :key="idx" class="tag-chip tag-warning">
                  {{ tag }}
                  <i class="fa-solid fa-xmark" @click="removeDiagTag('differential', idx)"></i>
                </span>
              </div>
              <div class="input-row">
                <input
                  v-model="newDifferentialDiag"
                  type="text"
                  :placeholder="lang === 'zh' ? '输入鉴别诊断，回车添加...' : 'Type differential, Enter to add...'"
                  @input="onDifferentialDiagInput"
                  @keydown.enter.prevent="addDiagTag('differential')"
                  class="tag-input"
                />
                <button class="add-btn" @click="addDiagTag('differential')" :disabled="!newDifferentialDiag.trim()">
                  <i class="fa-solid fa-plus"></i>
                </button>
              </div>
              <div v-if="differentialSuggestions.length" class="suggestion-dropdown">
                <div v-for="s in differentialSuggestions" :key="s" class="suggestion-item" @click="selectDiagSuggestion('differential', s)">
                  {{ s }}
                </div>
              </div>
            </div>

            <div v-if="differentialDiagTags.length" class="differential-detail-list">
              <div v-for="(tag, idx) in differentialDiagTags" :key="idx" class="diff-detail-item">
                <div class="diff-detail-name">{{ tag }}</div>
                <textarea
                  v-model="differentialDetails[idx].evidence"
                  :placeholder="lang === 'zh' ? '支持/反对/排除依据...' : 'Supporting/opposing/exclusion evidence...'"
                  class="diff-textarea"
                  rows="2"
                ></textarea>
              </div>
            </div>
          </div>

          <!-- Section 3: Final Diagnosis -->
          <div class="diag-section">
            <div class="diag-section-header">
              <span class="diag-section-num">3</span>
              <span class="diag-section-title">{{ lang === 'zh' ? '最终诊断' : 'Final Diagnosis' }}</span>
            </div>
            <div class="form-group">
              <label class="form-label">{{ lang === 'zh' ? '最终诊断名称' : 'Final Diagnosis Name' }}</label>
              <select v-model="finalDiagnosis" class="final-select">
                <option value="">{{ lang === 'zh' ? '-- 从初步诊断中选择 --' : '-- Select from preliminary --' }}</option>
                <option v-for="tag in primaryDiagTags" :key="tag" :value="tag">{{ tag }}</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">{{ lang === 'zh' ? '最终诊断依据' : 'Final Diagnostic Basis' }}</label>
              <textarea
                v-model="finalBasis"
                :placeholder="lang === 'zh' ? '总结最终诊断依据...' : 'Summarize final diagnostic basis...'"
                maxlength="2000"
                class="diag-textarea"
              ></textarea>
              <div class="char-count">{{ finalBasis.length }}/2000</div>
            </div>
            <div class="form-group">
              <label class="form-label">ICD {{ lang === 'zh' ? '编码（可选）' : 'Code (optional)' }}</label>
              <input
                v-model="icdCode"
                type="text"
                :placeholder="lang === 'zh' ? '如 J15.9' : 'e.g. J15.9'"
                class="icd-input"
              />
            </div>
          </div>
        </div>

        <div class="form-footer">
          <button class="btn btn-primary btn-submit" @click="submitDiag" :disabled="primaryDiagTags.length === 0">
            <i class="fa-solid fa-arrow-right"></i>
            {{ lang === 'zh' ? '提交并进入治疗' : 'Submit & Go to Treatment' }}
          </button>
        </div>
      </div>
    </div>

    <StationModals
      :show-end-confirm="showEndConfirm"
      :end-title="lang === 'zh' ? '确认提交诊断' : 'Confirm Submit Diagnosis'"
      :cancel-label="lang === 'zh' ? '继续编辑' : 'Continue Editing'"
      :confirm-label="lang === 'zh' ? '确认提交' : 'Confirm Submit'"
      :show-force-end="true"
      :force-end-label="lang === 'zh' ? '结束训练' : 'End Training'"
      :lang="lang"
      @cancel="showEndConfirm = false"
      @confirm="endStage"
      @force-end="forceEndTraining"
    >
      <template #end-body>
        <p class="end-warning">{{ lang === 'zh' ? '提交后无法返回修改，确认提交吗？' : 'Cannot modify after submission. Confirm?' }}</p>
      </template>
    </StationModals>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import { useTrainingStore } from '@/stores/training'
import { useCaseLoader } from '@/composables/useCaseLoader'
import { useStationFlow, resolveNextInFlow, advanceToNextStation, ensureStationIndex } from '@/composables/useStationFlow'
import { useTimer } from '@/composables/useTimer'
import { matchPatientImage } from '@/composables/usePatientImage'
import { parseVitals } from '@/composables/useUtils'
import TrainingTopBar from '@/components/TrainingTopBar.vue'
import PatientInfoPanel from '@/components/PatientInfoPanel.vue'
import StationModals from '@/components/StationModals.vue'

const route = useRoute()
const router = useRouter()
const store = useTrainingStore()
const { loadCase } = useCaseLoader()
const { stations: flowStations } = useStationFlow()
const { formattedTime, elapsedSeconds, startTimer, stopTimer } = useTimer()

const lang = ref(store.lang || 'zh')
const forwardNav = ref(false)
const caseData = ref({ basic: null })
const leftTab = ref('info')
const showEndConfirm = ref(false)
const showConfirmDialog = ref(false)
const showToast = ref(false)
const toastMessage = ref('')

const primaryDiagTags = ref([])
const differentialDiagTags = ref([])
const newPrimaryDiag = ref('')
const newDifferentialDiag = ref('')
const primarySuggestions = ref([])
const differentialSuggestions = ref([])
const differentialDetails = reactive([])
const finalDiagnosis = ref('')
const finalBasis = ref('')
const icdCode = ref('')

const diag = reactive({ basis: '' })

const diagnosisLibrary = [
  '社区获得性肺炎', '急性心肌梗死', '不稳定型心绞痛', '急性心力衰竭', '慢性心力衰竭',
  '支气管哮喘', 'COPD急性加重', '肺栓塞', '急性呼吸窘迫综合征', '自发性气胸',
  '急性胰腺炎', '急性胆囊炎', '急性阑尾炎', '肠梗阻', '上消化道出血',
  '糖尿病酮症酸中毒', '低血糖昏迷', '甲亢危象', '肾上腺危象',
  '脑梗死', '脑出血', '蛛网膜下腔出血', '癫痫持续状态', '吉兰-巴雷综合征',
  '急性肾损伤', '急性肾盂肾炎', '尿路结石', '急性尿潴留',
  '高血压急症', '主动脉夹层', '急性心包炎', '感染性心内膜炎',
  '过敏性休克', '脓毒症', '热射病', '有机磷中毒', '一氧化碳中毒'
]

const c = computed(() => {
  const basic = caseData.value.basic
  if (!basic) {
    const mc = store.currentCase || {}
    const g = mc.patient?.sex || mc.patient_gender || ''
    const a = mc.patient?.age || mc.patient_age || ''
    const preg = mc.patient?.pregnancy || mc.patient_pregnancy || ''
    return {
      id: mc.id || route.query.caseId || '',
      difficulty: mc.difficulty || '',
      patient: {
        name: mc.patient?.name || mc.patient_name || '',
        gender: g,
        age: a,
        avatar: matchPatientImage({ gender: g, age: a, isPregnant: preg }, 'patient'),
        fullBodyImage: matchPatientImage({ gender: g, age: a, isPregnant: preg }, 'full'),
        idleVideo: mc.patient?.idleVideo || '',
      },
      chiefComplaint: mc.chiefComplaint || '',
      symptoms: mc.symptoms || [],
      vitals: {}
    }
  }
  const pi = basic.patient_info || {}
  const gender = pi.sex === '1' || pi.sex === '男' ? '男' : (pi.sex === '0' || pi.sex === '女' ? '女' : '')
  const ageStr = String(pi.age || '').replace('岁', '')
  const ageNum = parseInt(ageStr) || 30
  const preg = pi.pregnancy || basic.pregnancy || ''
  return {
    id: basic.case_id || caseData.value.caseId || '',
    difficulty: basic.teaching_phase || '',
    specialty: basic.specialty || '',
    patient: {
      name: pi.name || '',
      gender,
      age: ageStr,
      avatar: matchPatientImage({ gender, age: ageNum, isPregnant: preg }, 'patient'),
      fullBodyImage: matchPatientImage({ gender, age: ageNum, isPregnant: preg }, 'full'),
      idleVideo: pi.idleVideo || basic.idleVideo || '',
    },
    chiefComplaint: basic.chief_complaint || '',
    symptoms: basic.symptoms || [],
    vitals: parseVitals(basic.physical_exam?.vital_signs),
  }
})

const caseId = computed(() => c.value.id || route.query.caseId || store.currentCase?.id || '')

const stationProjects = computed(() => {
  if (store.stationFlow?.stations && store.currentFlowIndex != null) {
    const st = store.stationFlow.stations[store.currentFlowIndex]
    return st?.projects || [st?.name].filter(Boolean)
  }
  return []
})

const steps = computed(() => {
  if (stationProjects.value.length > 0) return stationProjects.value
  if (store.stationScheme?.length) {
    const st = store.stationScheme[store.currentFlowIndex]
    return st?.projects || [st?.name].filter(Boolean)
  }
  return [lang.value === 'zh' ? '诊断' : 'Diagnosis']
})

const stepIndex = computed(() => {
  const proj = stationProjects.value
  if (!proj.length) return 0
  const idx = proj.findIndex(p => p === (lang.value === 'zh' ? '诊断' : 'Diagnosis') || p === (lang.value === 'zh' ? '初步诊断' : 'Preliminary Diag'))
  return idx >= 0 ? idx : 0
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
  return flowCtx.value.stationName || (lang.value === 'zh' ? '诊断' : 'Diagnosis')
})
function onFlowStepClick(idx, step) {
  if (idx === flowStepIndex.value) return
  forwardNav.value = true
  store.currentFlowIndex = idx
  if (store.stationFlow) store.stationFlow.currentIndex = idx
  store.trainingSession = store.trainingSession || {}
  store.trainingSession.diagnosis = {
    preliminary: primaryDiagTags.value.join('、'),
    differential: differentialDiagTags.value.join('、'),
    differentialDetails: differentialDetails.map((d, i) => ({
      name: differentialDiagTags.value[i] || '',
      evidence: d.evidence
    })),
    basis: diag.basis,
    final: finalDiagnosis.value,
    finalBasis: finalBasis.value,
    icdCode: icdCode.value,
    notes: store.trainingSession.diagNotes || '',
    duration: elapsedSeconds.value
  }
  store.saveTrainingSession()
  router.replace({ name: step.routeName, query: { caseId: store.currentCase?.id || '' } })
}

const diagMarkedMessages = computed(() => {
  const ts = store.trainingSession || {}
  const allMessages = [
    ...(ts.historyTaking?.messages || []),
    ...(ts.physicalExam?.messages || [])
  ]
  return allMessages.filter(m => (m.role === 'sp' || m.role === 'system') && m.marked)
})

const historyMessages = computed(() => {
  const ts = store.trainingSession || {}
  const combined = [
    ...(ts.historyTaking?.messages || []).map(m => ({ ...m, stage: 'history' })),
    ...(ts.physicalExam?.messages || []).map(m => ({ ...m, stage: 'physical' }))
  ]
  return combined.filter(m => m.content && (m.role === 'user' || m.role === 'sp')).slice(-50)
})

const peFindings = computed(() => {
  const ts = store.trainingSession || {}
  const peMsgs = (ts.physicalExam?.messages || []).filter(m => m.role === 'sp' || m.role === 'system')
  if (peMsgs.length) return peMsgs.map(m => m.content).filter(Boolean)
  const basic = caseData.value.basic
  if (basic?.physical_exam) {
    const pe = basic.physical_exam
    return [pe.vital_signs, pe.general, pe.systemic].filter(Boolean)
  }
  return []
})

const ancillaryResults = computed(() => {
  const ts = store.trainingSession || {}
  return ts.ancillaryTests?.results || []
})

const confirmMessage = computed(() => {
  const parts = []
  if (primaryDiagTags.value.length) parts.push((lang.value === 'zh' ? '初步诊断：' : 'Preliminary: ') + primaryDiagTags.value.join('、'))
  if (differentialDiagTags.value.length) parts.push((lang.value === 'zh' ? '鉴别诊断：' : 'Differential: ') + differentialDiagTags.value.join('、'))
  if (finalDiagnosis.value) parts.push((lang.value === 'zh' ? '最终诊断：' : 'Final: ') + finalDiagnosis.value)
  return parts.join('\n')
})

function filterDiagLib(text) {
  if (!text.trim()) return []
  const t = text.trim().toLowerCase()
  return diagnosisLibrary.filter(d => d.toLowerCase().includes(t) && !primaryDiagTags.value.includes(d) && !differentialDiagTags.value.includes(d)).slice(0, 8)
}

function onPrimaryDiagInput() { primarySuggestions.value = filterDiagLib(newPrimaryDiag.value) }
function onDifferentialDiagInput() { differentialSuggestions.value = filterDiagLib(newDifferentialDiag.value) }

function addDiagTag(type) {
  const inputVal = type === 'primary' ? newPrimaryDiag.value : newDifferentialDiag.value
  const tagsArr = type === 'primary' ? primaryDiagTags : differentialDiagTags
  const name = inputVal.trim()
  if (!name) return
  if (tagsArr.value.includes(name)) { clearInput(type); return }
  tagsArr.value.push(name)
  if (type === 'differential') {
    differentialDetails.push({ evidence: '' })
  }
  // Auto-select as final if it's the only primary
  if (type === 'primary' && primaryDiagTags.value.length === 1 && !finalDiagnosis.value) {
    finalDiagnosis.value = name
  }
  clearInput(type)
}

function clearInput(type) {
  if (type === 'primary') {
    newPrimaryDiag.value = ''
    primarySuggestions.value = []
  } else {
    newDifferentialDiag.value = ''
    differentialSuggestions.value = []
  }
}

function removeDiagTag(type, idx) {
  if (type === 'primary') {
    const removed = primaryDiagTags.value[idx]
    primaryDiagTags.value.splice(idx, 1)
    if (finalDiagnosis.value === removed) finalDiagnosis.value = primaryDiagTags.value[0] || ''
  } else {
    differentialDiagTags.value.splice(idx, 1)
    differentialDetails.splice(idx, 1)
  }
}

function selectDiagSuggestion(type, item) {
  if (type === 'primary') {
    newPrimaryDiag.value = item
  } else {
    newDifferentialDiag.value = item
  }
  addDiagTag(type)
}

function submitDiag() {
  if (primaryDiagTags.value.length === 0) {
    showToast.value = true
    toastMessage.value = lang.value === 'zh' ? '请至少输入一个初步诊断' : 'Please enter at least one preliminary diagnosis'
    return
  }
  showEndConfirm.value = true
}

function endStage() {
  showEndConfirm.value = false

  store.trainingSession = store.trainingSession || {}

  // Write to new diagnosis key
  store.trainingSession.diagnosis = {
    preliminary: primaryDiagTags.value.join('、'),
    differential: differentialDiagTags.value.join('、'),
    differentialDetails: differentialDetails.map((d, i) => ({
      name: differentialDiagTags.value[i] || '',
      evidence: d.evidence
    })),
    basis: diag.basis,
    final: finalDiagnosis.value,
    finalBasis: finalBasis.value,
    icdCode: icdCode.value,
    notes: store.trainingSession.diagNotes || '',
    duration: elapsedSeconds.value
  }

  // Also write to old key for backward compatibility
  store.trainingSession.preliminaryDiag = {
    preliminary: primaryDiagTags.value.join('、'),
    differential: differentialDiagTags.value.join('、'),
    basis: diag.basis
  }

  store.saveTrainingSession()
  stopTimer()
  store.addTrainingRecord({
    caseId: caseId.value,
    stationId: 'diagnosis',
    stationName: flowCtx.value?.stationName || (lang.value === 'zh' ? '诊断' : 'Diagnosis'),
    duration: elapsedSeconds.value
  })

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

function forceEndTraining() {
  showEndConfirm.value = false
  showConfirmDialog.value = false
  forwardNav.value = true
  router.push({ name: 'caseDetail', params: { caseId: caseId.value } })
}

function onStepClick(si) {
  if (si < stepIndex.value) return
  if (si > stepIndex.value) {
    submitDiag()
    return
  }
}

onBeforeRouteLeave((to, from, next) => {
  if (forwardNav.value) { next(); return }
  if ((store.stationFlow?.stations?.length || 0) > 1) { next(); return }
  if (showEndConfirm.value) { showEndConfirm.value = false }
  next()
})

onMounted(async () => {
  ensureStationIndex(store, route.name)
  document.title = lang.value === 'zh' ? '诊断 - AI-SP' : 'Diagnosis - AI-SP'

  if (caseId.value) {
    const data = await loadCase(caseId.value)
    if (data) caseData.value = data
  }

  const ts = store.trainingSession || {}

  // Restore data from diagnosis key (new) or preliminaryDiag key (old)
  const diagData = ts.diagnosis || ts.preliminaryDiag
  if (diagData) {
    if (diagData.preliminary) {
      primaryDiagTags.value = diagData.preliminary.split(/[、,，]/).filter(Boolean)
    }
    if (diagData.differential) {
      differentialDiagTags.value = diagData.differential.split(/[、,，]/).filter(Boolean)
    }
    if (diagData.basis) diag.basis = diagData.basis
    if (diagData.differentialDetails) {
      differentialDetails.splice(0, differentialDetails.length)
      diagData.differentialDetails.forEach(d => differentialDetails.push({ evidence: d.evidence || '' }))
    } else {
      differentialDiagTags.value.forEach(() => differentialDetails.push({ evidence: '' }))
    }
    if (diagData.final) finalDiagnosis.value = diagData.final
    if (diagData.finalBasis) finalBasis.value = diagData.finalBasis
    if (diagData.icdCode) icdCode.value = diagData.icdCode
  }

  // Accumulate notes from prior stages
  const notes = []
  if (ts.historyTaking?.notes) notes.push(ts.historyTaking.notes)
  if (ts.physicalExam?.notes) notes.push(ts.physicalExam.notes)
  if (ts.ancillaryNotes) notes.push(ts.ancillaryNotes)
  store.trainingSession = { ...ts, diagNotes: notes.filter(Boolean).join('\n') }

  startTimer()
})
</script>

<style scoped>
.diagnosis-page { width: 100vw; height: 100vh; overflow: hidden; position: relative; background: #1a1a2e; }
.patient-bg { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); max-width: 80%; max-height: 80%; object-fit: contain; z-index: 0; opacity: 0.5; }
.patient-placeholder { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 120px; z-index: 0; opacity: 0.3; }

.body-area { position: absolute; top: 58px; left: 0; right: 0; bottom: 0; display: flex; gap: 16px; padding: 14px; }
.left-panel { flex: 0 0 35%; background: rgba(255,255,255,0.96); backdrop-filter: blur(8px); border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
.right-panel { flex: 1; background: rgba(255,255,255,0.96); backdrop-filter: blur(8px); border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }

.panel-tabs { display: flex; border-bottom: 1px solid #EBEEF5; flex-shrink: 0; }
.panel-tab { flex: 1; text-align: center; padding: 12px 8px; cursor: pointer; color: #909399; font-size: 13px; transition: all .15s; }
.panel-tab:hover { color: #409EFF; }
.panel-tab.active { color: #409EFF; border-bottom: 2px solid #409EFF; font-weight: 600; }
.panel-content { padding: 12px; overflow-y: auto; flex: 1; }

.section-label { font-size: 12px; font-weight: 600; color: #909399; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
.finding-item { font-size: 12px; color: #606266; padding: 4px 0; line-height: 1.5; display: flex; align-items: flex-start; }

.marked-msg { padding: 8px 10px; margin-bottom: 8px; background: #f0f9eb; border-radius: 8px; border-left: 3px solid #67C23A; }
.marked-role { font-size: 11px; color: #67C23A; font-weight: 600; margin-bottom: 2px; }
.marked-text { font-size: 12px; color: #606266; line-height: 1.5; }
.empty-notes { text-align: center; color: #C0C4CC; padding: 30px 0; font-size: 13px; }

.chat-history { display: flex; flex-direction: column; gap: 8px; }
.chat-bubble { padding: 8px 12px; border-radius: 12px; max-width: 90%; font-size: 12px; }
.chat-bubble.by-user { align-self: flex-end; background: #ecf5ff; }
.chat-bubble.by-sp { align-self: flex-start; background: #f0f9eb; }
.bubble-meta { font-size: 10px; color: #909399; margin-bottom: 2px; }
.bubble-text { color: #303133; line-height: 1.5; }

/* Test Results Panel */
.test-results-panel { display: flex; flex-direction: column; gap: 8px; }
.test-result-card { padding: 10px 12px; background: #f5f7fa; border-radius: 8px; border: 1px solid #EBEEF5; }
.trc-header { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.trc-tag { font-size: 10px; padding: 1px 6px; border-radius: 4px; background: #ecf5ff; color: #409EFF; }
.trc-name { font-size: 12px; font-weight: 600; color: #303133; }
.trc-result { font-size: 11px; color: #606266; line-height: 1.5; }

/* Form */
.form-scroll { flex: 1; overflow-y: auto; padding: 20px 24px; }
.section-title { font-size: 15px; font-weight: 600; color: #303133; margin-bottom: 16px; }

.diag-section { margin-bottom: 20px; padding: 16px; border: 1px solid #EBEEF5; border-radius: 12px; background: #fafafa; }
.diag-section-header { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.diag-section-num { width: 24px; height: 24px; border-radius: 50%; background: #409EFF; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; flex-shrink: 0; }
.diag-section-title { font-size: 14px; font-weight: 600; color: #303133; }

.tag-input-wrap { position: relative; }
.tag-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
.tag-chip { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 6px; font-size: 12px; }
.tag-chip i { font-size: 10px; cursor: pointer; opacity: 0.7; }
.tag-chip i:hover { opacity: 1; }
.tag-primary { background: #ecf5ff; color: #409EFF; }
.tag-warning { background: #fdf6ec; color: #E6A23C; }

.input-row { display: flex; gap: 6px; }
.tag-input { flex: 1; padding: 8px 12px; border: 1px solid #DCDFE6; border-radius: 8px; font-size: 13px; outline: none; transition: border-color .15s; }
.tag-input:focus { border-color: #409EFF; }
.add-btn { padding: 8px 12px; border: 1px solid #DCDFE6; border-radius: 8px; background: #fff; cursor: pointer; color: #409EFF; font-size: 13px; transition: all .15s; }
.add-btn:hover { border-color: #409EFF; background: #ecf5ff; }
.add-btn:disabled { color: #C0C4CC; cursor: not-allowed; }

.suggestion-dropdown { position: absolute; top: 100%; left: 0; right: 0; background: #fff; border: 1px solid #EBEEF5; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); max-height: 180px; overflow-y: auto; z-index: 20; }
.suggestion-item { padding: 8px 12px; font-size: 13px; color: #606266; cursor: pointer; transition: background .15s; }
.suggestion-item:hover { background: #ecf5ff; color: #409EFF; }

.form-group { margin-bottom: 12px; }
.form-label { display: block; font-size: 12px; font-weight: 600; color: #606266; margin-bottom: 4px; }
.diag-textarea { width: 100%; min-height: 80px; padding: 10px 12px; border: 1px solid #DCDFE6; border-radius: 8px; font-size: 13px; resize: vertical; outline: none; font-family: inherit; line-height: 1.6; }
.diag-textarea:focus { border-color: #409EFF; }
.char-count { text-align: right; font-size: 11px; color: #909399; margin-top: 2px; }

.differential-detail-list { display: flex; flex-direction: column; gap: 10px; margin-top: 12px; }
.diff-detail-item { padding: 10px 12px; background: #fff; border: 1px solid #EBEEF5; border-radius: 8px; }
.diff-detail-name { font-size: 12px; font-weight: 600; color: #E6A23C; margin-bottom: 6px; }
.diff-textarea { width: 100%; padding: 6px 10px; border: 1px solid #EBEEF5; border-radius: 6px; font-size: 12px; resize: vertical; outline: none; font-family: inherit; }
.diff-textarea:focus { border-color: #E6A23C; }

.final-select { width: 100%; padding: 8px 12px; border: 1px solid #DCDFE6; border-radius: 8px; font-size: 13px; outline: none; background: #fff; }
.final-select:focus { border-color: #409EFF; }
.icd-input { width: 100%; padding: 8px 12px; border: 1px solid #DCDFE6; border-radius: 8px; font-size: 13px; outline: none; max-width: 300px; }
.icd-input:focus { border-color: #409EFF; }

.form-footer { flex-shrink: 0; text-align: center; padding: 16px 24px; position: sticky; bottom: 0; background: rgba(255,255,255,0.95); border-top: 1px solid #EBEEF5; }
.btn { padding: 10px 20px; border-radius: 8px; cursor: pointer; font-size: 14px; border: 1px solid #DCDFE6; background: #fff; color: #606266; display: inline-flex; align-items: center; gap: 6px; transition: all .15s; }
.btn:hover { border-color: #409EFF; color: #409EFF; }
.btn-primary { background: #409EFF; border-color: #409EFF; color: #fff; }
.btn-primary:hover { background: #337ecc; color: #fff; }
.btn-primary:disabled { background: #a0cfff; border-color: #a0cfff; cursor: not-allowed; }
.btn-submit { padding: 12px 32px; font-size: 15px; }
</style>
