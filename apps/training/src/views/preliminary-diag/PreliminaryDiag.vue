<template>
  <div class="preliminary-diag-page">
    <video v-if="c.patient.idleVideo" :src="c.patient.idleVideo" class="patient-bg" autoplay loop muted playsinline />
    <img v-else-if="c.patient.fullBodyImage && (c.patient.fullBodyImage.startsWith('/images/') || c.patient.fullBodyImage.startsWith('images/'))" :src="c.patient.fullBodyImage" class="patient-bg" />
    <div v-else class="patient-placeholder">👤</div>

    <TrainingTopBar
      :station-name="flowCtx.stationName || (lang === 'zh' ? '接诊病人站' : 'Reception')"
      :steps="steps"
      :step-index="stepIndex"
      :formatted-time="formattedTime"
      :end-label="lang === 'zh' ? (flowCtx.isLast ? '结束' : '下一步') : (flowCtx.isLast ? 'End' : 'Next')"
      :end-icon="flowCtx.isLast ? 'fa-right-from-bracket' : 'fa-arrow-right'"
      end-icon="fa-arrow-right"
      :hide-step-number="true"
      :show-lang-toggle="true"
      :lang-label="lang === 'zh' ? 'EN' : '中'"
      @step-click="onStepClick"
      @end="showEndConfirm = true"
      @toggle-lang="lang = lang === 'zh' ? 'en' : 'zh'"
    />

    <div class="body-area">
      <div class="left-panel">
        <div class="panel-tabs">
          <div class="panel-tab" :class="{ active: leftTab === 'info' }" @click="leftTab = 'info'">
            <i class="fa-solid fa-user"></i> {{ lang === 'zh' ? '患者信息' : 'Info' }}
          </div>
          <div class="panel-tab" :class="{ active: leftTab === 'notes' }" @click="leftTab = 'notes'">
            <i class="fa-solid fa-pencil"></i> {{ lang === 'zh' ? '笔记' : 'Notes' }}
          </div>
          <div class="panel-tab" :class="{ active: leftTab === 'history' }" @click="leftTab = 'history'">
            <i class="fa-solid fa-message"></i> {{ lang === 'zh' ? '接诊记录' : 'History' }}
          </div>
        </div>
        <div class="panel-content">
          <div v-show="leftTab === 'info'">
            <PatientInfoPanel :patient="c.patient" :vitals="c.vitals" :chief-complaint="c.chiefComplaint" :lang="lang" />
            <div v-if="peFindings && peFindings.length > 0" class="pe-section">
              <div class="info-label-row">{{ lang === 'zh' ? '查体结果' : 'PE Findings' }}</div>
              <div class="pe-finding" v-for="(f, idx) in peFindings" :key="'pf'+idx">
                {{ f.content }}
              </div>
            </div>
          </div>
          <div v-show="leftTab === 'notes'">
            <div class="marked-items" v-if="diagMarkedMessages && diagMarkedMessages.length > 0">
              <div class="marked-title">{{ lang === 'zh' ? '📌 已标记信息' : '📌 Marked Info' }}</div>
              <div class="marked-item" v-for="(m, idx) in diagMarkedMessages" :key="'dm'+idx">
                <span class="marked-text">{{ truncateText(m.content, 50) }}</span>
              </div>
            </div>
            <div v-else class="notes-display-area">{{ diagNotes || (lang === 'zh' ? '暂无笔记' : 'No notes') }}</div>
          </div>
          <div v-show="leftTab === 'history'">
            <div class="history-chat-list" v-if="historyMessages && historyMessages.length > 0">
              <div v-for="(m, idx) in historyMessages" :key="idx" :class="['chat-bubble-row', m.role === 'user' ? 'user' : 'sp']">
                <div v-if="m.role !== 'user'" class="chat-bubble-avatar sp">
                  <i class="fa-solid" :class="m.stage === 'exam' ? 'fa-laptop-medical' : 'fa-user-injured'"></i>
                </div>
                <div class="chat-bubble-card" :class="m.role === 'user' ? 'user' : 'sp'">
                  <div class="chat-bubble-time">{{ m.time }}</div>
                  <div class="chat-bubble-text">{{ m.content }}</div>
                </div>
                <div v-if="m.role === 'user'" class="chat-bubble-avatar user">
                  <i class="fa-solid fa-user-doctor"></i>
                </div>
              </div>
            </div>
            <div v-else class="empty-state">{{ lang === 'zh' ? '暂无接诊记录' : 'No consultation records' }}</div>
          </div>
        </div>
      </div>

      <div class="right-panel">
        <div class="form-scroll">
          <div class="structured-form">
            <h3 class="form-title">
              <i class="fa-solid fa-stethoscope" style="color:#409EFF;margin-right:8px;"></i>
              {{ lang === 'zh' ? '初步诊断' : 'Preliminary Diagnosis' }}
            </h3>
            <div class="form-section">
              <h4><i class="fa-solid fa-stethoscope"></i> {{ lang === 'zh' ? '初步诊断' : 'Preliminary Diagnosis' }}</h4>
              <div class="tag-chip-list">
                <span v-for="(item, idx) in primaryDiagTags" :key="'pd'+idx" class="tag-chip tag-chip-primary">{{ item }}<button class="tag-chip-close" @click="removeDiagTag('primary', idx)">&times;</button></span>
                <span v-if="!primaryDiagTags.length" class="tag-chip-empty">{{ lang === 'zh' ? '暂无，请搜索并添加诊断' : 'None, search to add' }}</span>
              </div>
              <div class="tag-search-row">
                <div class="tag-search-input-wrap">
                  <input class="input" v-model="newPrimaryDiag" @input="onPrimaryDiagInput" @keyup.enter="addDiagTag('primary')" :placeholder="lang === 'zh' ? '搜索诊断库...' : 'Search diagnosis library...'">
                  <div v-if="primarySuggestions.length" class="tag-search-dropdown">
                    <div v-for="item in primarySuggestions" :key="item" class="tag-search-option" @mousedown.prevent="selectDiagSuggestion('primary', item)">{{ item }}</div>
                  </div>
                </div>
                <button class="btn-add-icon" @click="addDiagTag('primary')">+</button>
              </div>
            </div>
            <div class="form-section flex-section">
              <h4><i class="fa-solid fa-magnifying-glass"></i> {{ lang === 'zh' ? '诊断依据' : 'Diagnostic Basis' }}</h4>
              <div class="textarea-wrap">
                <textarea v-model="diag.basis" :placeholder="lang === 'zh' ? '请逐条列出诊断依据，支持从左侧引用...' : 'List diagnostic basis, support quoting from left panel...'"></textarea>
              </div>
              <div class="char-count">{{ diag.basis.length }} / 2000</div>
            </div>
            <div class="form-section">
              <h4><i class="fa-solid fa-scale-balanced"></i> {{ lang === 'zh' ? '鉴别诊断' : 'Differential Diagnosis' }}</h4>
              <div class="tag-chip-list">
                <span v-for="(item, idx) in differentialDiagTags" :key="'dd'+idx" class="tag-chip tag-chip-warning">{{ item }}<button class="tag-chip-close" @click="removeDiagTag('differential', idx)">&times;</button></span>
                <span v-if="!differentialDiagTags.length" class="tag-chip-empty">{{ lang === 'zh' ? '暂无，请搜索并添加鉴别诊断' : 'None, search to add' }}</span>
              </div>
              <div class="tag-search-row">
                <div class="tag-search-input-wrap">
                  <input class="input" v-model="newDifferentialDiag" @input="onDifferentialDiagInput" @keyup.enter="addDiagTag('differential')" :placeholder="lang === 'zh' ? '搜索诊断库...' : 'Search diagnosis library...'">
                  <div v-if="differentialSuggestions.length" class="tag-search-dropdown">
                    <div v-for="item in differentialSuggestions" :key="item" class="tag-search-option" @mousedown.prevent="selectDiagSuggestion('differential', item)">{{ item }}</div>
                  </div>
                </div>
                <button class="btn-add-icon" @click="addDiagTag('differential')">+</button>
              </div>
            </div>

          </div>
        </div>
        <div class="form-footer">
          <button class="btn btn-primary btn-submit" @click="submitDiag">
            <i class="fa-solid fa-check"></i> {{ lang === 'zh' ? '提交并进入治疗计划' : 'Submit & Treatment Plan' }}
          </button>
        </div>
      </div>
    </div>

    <StationModals
      :show-end-confirm="showEndConfirm"
      :end-title="lang === 'zh' ? '确认提交初步诊断' : 'Confirm Submit Diagnosis'"
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
        <div class="summary-list">
          <div class="summary-item submitted">
            <span>{{ lang === 'zh' ? '✅ 初步诊断' : '✅ Primary Dx' }}</span>
            <span>{{ primaryDiagTags.length }}{{ lang === 'zh' ? '条' : '' }}</span>
          </div>
          <div class="summary-item submitted">
            <span>{{ lang === 'zh' ? '✅ 鉴别诊断' : '✅ Differential Dx' }}</span>
            <span>{{ differentialDiagTags.length }}{{ lang === 'zh' ? '条' : '' }}</span>
          </div>
        </div>
      </template>
    </StationModals>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import { useTrainingStore } from '@/stores/training'
import { useCaseLoader } from '@/composables/useCaseLoader'
import { PROJECT_ROUTE_MAP, resolveNextInFlow, advanceToNextStation, ensureStationIndex } from '@/composables/useStationFlow'
import { matchPatientImage, matchPatientVideo } from '@/composables/usePatientImage'
import { showToast, confirmDialog, parseVitals, truncateText } from '@/composables/useUtils'
import { useTimer } from '@/composables/useTimer'
import TrainingTopBar from '@/components/TrainingTopBar.vue'
import PatientInfoPanel from '@/components/PatientInfoPanel.vue'
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

const caseId = ref(route.query.caseId || '')
const caseData = ref({ basic: null })
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
      sex: gender,
      age: ageStr,
      fullBodyImage: matchPatientImage({ gender, age: ageNum, isPregnant: preg }, 'full'),
      idleVideo: matchPatientVideo({ gender, age: ageNum, isPregnant: preg }, 'idle'),
    },
    chiefComplaint: basic.chief_complaint || '',
    vitals: parseVitals(basic.physical_exam?.vital_signs),
    disease: basic.disease || '',
  }
})

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

const leftTab = ref('info')
const diag = reactive({ basis: '' })
const primaryDiagTags = ref([])
const differentialDiagTags = ref([])
const newPrimaryDiag = ref('')
const newDifferentialDiag = ref('')
const primarySuggestions = ref([])
const differentialSuggestions = ref([])

const diagnosisLibrary = ['腰椎间盘突出症','腰椎管狭窄症','梨状肌综合征','第三腰椎横突综合征','颈椎病','骨质疏松症','骨折','关节炎','肩周炎','高血压','冠心病','心力衰竭','心律失常','心肌梗死','肺炎','哮喘','COPD','肺结核','肺栓塞','胃炎','胃溃疡','肝硬化','胰腺炎','胆囊炎','阑尾炎','糖尿病','肾病综合征','急性肾小球肾炎','慢性肾功能不全','脑梗死','脑出血','癫痫','帕金森病','贫血','白血病','淋巴瘤','系统性红斑狼疮','类风湿关节炎']
const diagNotes = ref('')
const showEndConfirm = ref(false)

const historyMessages = computed(() => {
  let all = []
  let sess = store.trainingSession || {}
  if (sess.historyTaking && sess.historyTaking.messages) {
    all = all.concat(sess.historyTaking.messages.map(function(m) { return Object.assign({}, m, { stage: 'history' }) }))
  }
  if (sess.physicalExam && sess.physicalExam.messages) {
    all = all.concat(sess.physicalExam.messages.map(function(m) { return Object.assign({}, m, { stage: 'exam' }) }))
  }
  return all
})

const peFindings = computed(() => {
  const findings = []
  // 从 session 中获取体格检查结果
  const sess = store.trainingSession || {}
  if (sess.physicalExam?.messages) {
    for (const m of sess.physicalExam.messages) {
      if (m.role === 'system' && m.content) {
        findings.push({ content: m.content })
      }
    }
  }
  if (findings.length === 0) {
    const pe = caseData.value.basic?.physical_exam
    if (pe) {
      for (const [key, val] of Object.entries(pe)) {
        if (typeof val === 'string' && val.trim()) findings.push({ content: val })
      }
    }
  }
  return findings
})

const diagMarkedMessages = computed(() => {
  let all = []
  let sess = store.trainingSession || {}
  if (sess.historyTaking && sess.historyTaking.messages) {
    all = all.concat(sess.historyTaking.messages.filter(function(m) { return m.role === 'sp' && m.marked }))
  }
  if (sess.physicalExam && sess.physicalExam.messages) {
    all = all.concat(sess.physicalExam.messages.filter(function(m) { return m.role === 'system' && m.marked }))
  }
  return all
})

function filterDiagLib(text) { return text.trim() ? diagnosisLibrary.filter(function(d) { return d.toLowerCase().includes(text.trim().toLowerCase()) }) : [] }
function onPrimaryDiagInput() { primarySuggestions.value = filterDiagLib(newPrimaryDiag.value) }
function onDifferentialDiagInput() { differentialSuggestions.value = filterDiagLib(newDifferentialDiag.value) }
function addDiagTag(type) {
  let inputRef = type === 'primary' ? newPrimaryDiag : newDifferentialDiag
  let tagsRef = type === 'primary' ? primaryDiagTags : differentialDiagTags
  let suggRef = type === 'primary' ? primarySuggestions : differentialSuggestions
  let val = inputRef.value.trim()
  if (!val) return
  if (!tagsRef.value.includes(val)) tagsRef.value.push(val)
  inputRef.value = ''
  suggRef.value = []
}
function removeDiagTag(type, idx) {
  let tagsRef = type === 'primary' ? primaryDiagTags : differentialDiagTags
  tagsRef.value.splice(idx, 1)
}
function selectDiagSuggestion(type, item) {
  let inputRef = type === 'primary' ? newPrimaryDiag : newDifferentialDiag
  inputRef.value = item
  addDiagTag(type)
}

function onStepClick(si) {
  if (si === stepIndex.value) return
  if (si < stepIndex.value) return
  if (si > stepIndex.value + 1) {
    showToast(lang.value === 'zh' ? '请按顺序完成当前步骤后再进入下一步' : 'Please complete current step first', 'warning')
    return
  }
  confirmDialog(
    lang.value === 'zh' ? '确定要进入下一步吗？当前诊断将自动提交。' : 'Proceed to next step? Current diagnosis will be submitted.',
    { title: lang.value === 'zh' ? '进入下一步' : 'Next Step', icon: 'fa-arrow-right', iconClass: 'info' }
  ).then(confirmed => {
    if (confirmed) {
      store.trainingSession = store.trainingSession || {}
      store.trainingSession.preliminaryDiag = {
        preliminary: primaryDiagTags.value.join('、'),
        differential: differentialDiagTags.value.join('、'),
        basis: diag.basis,
        notes: diagNotes.value,
        duration: elapsedSeconds.value
      }
      forwardNav.value = true; router.replace({ name: steps.value[si].route, query: { caseId: c.value.id } })
    }
  })
}

function submitDiag() {
  if (!primaryDiagTags.value.length) {
    showToast(lang.value === 'zh' ? '请添加至少一条初步诊断' : 'Please add at least one diagnosis', 'warning')
    return
  }
  showEndConfirm.value = true
}

function endStage() {
  store.trainingSession = store.trainingSession || {}
  store.trainingSession.preliminaryDiag = {
    preliminary: primaryDiagTags.value.join('、'),
    differential: differentialDiagTags.value.join('、'),
    basis: diag.basis,
    notes: diagNotes.value,
    duration: elapsedSeconds.value
  }
  store.saveTrainingSession()
  const rec = store.addTrainingRecord({
    caseId: c.value.id,
    stationId: 'preliminaryDiag',
    stationName: flowCtx.value?.stationName || (lang.value === 'zh' ? '初步诊断站' : 'Preliminary Diagnosis'),
    duration: elapsedSeconds.value,
    score: 0,
    time: new Date().toLocaleString()
  })
  store.currentCase = caseData.value.basic || c.value
  store.currentRecord = { caseId: c.value.id, stationId: 'preliminaryDiag', stationName: flowCtx.value?.stationName || (lang.value === 'zh' ? '初步诊断站' : 'Preliminary Diagnosis'), score: 0, time: new Date().toLocaleString(), id: rec.key, recordedAt: rec.recordedAt }
  showEndConfirm.value = false
  const ctx = flowCtx.value
  if (ctx.advanceToStation >= 0) {
    advanceToNextStation(store.stationScheme || store.stationFlow?.stations || [], store.currentFlowIndex, store)
  }
  if (ctx.nextRoute) {
    forwardNav.value = true; router.replace({ name: ctx.nextRoute, query: { caseId: caseId.value, source: 'training' } })
  } else {
    forwardNav.value = true; router.push({ name: 'scoreReport', query: { caseId: caseId.value, source: 'training' } })
  }
}

function forceEndTraining() {
  showEndConfirm.value = false
  forwardNav.value = true; router.push({ name: 'caseDetail', query: { caseId: c.value.id } })
}

onMounted(async () => {
  ensureStationIndex(store, route.name)
  document.title = lang.value === 'zh' ? '接诊病人站 · 初步诊断' : 'Reception · Preliminary Diagnosis'
  if (!caseId.value) caseId.value = route.query.caseId || 'IM-20260527-A9GW'

  if (caseId.value) {
    const data = await loadCase(caseId.value)
    if (data) caseData.value = data
  }

  // 从之前阶段恢复笔记内容
  const sess = store.trainingSession || {}
  const parts = []
  if (sess.historyTaking?.notes) parts.push(sess.historyTaking.notes)
  if (sess.physicalExam?.notes) parts.push(sess.physicalExam.notes)
  diagNotes.value = parts.join('\n')
  // Restore diagnosis tags if returning from later stage
  if (sess.preliminaryDiag) {
    if (sess.preliminaryDiag.basis) diag.basis = sess.preliminaryDiag.basis
    if (sess.preliminaryDiag.preliminary) {
      primaryDiagTags.value = sess.preliminaryDiag.preliminary.split('、').filter(Boolean)
    }
    if (sess.preliminaryDiag.differential) {
      differentialDiagTags.value = sess.preliminaryDiag.differential.split('、').filter(Boolean)
    }
  }
  startTimer()
})
</script>

<style scoped>
.preliminary-diag-page { position: relative; width: 100vw; height: 100vh; overflow: hidden; }
.patient-bg { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); max-height: calc(100vh - 140px); max-width: 90vw; width: auto; height: auto; object-fit: contain; z-index: 0; }
.patient-placeholder { position: absolute; inset: 0; z-index: 0; display: flex; align-items: center; justify-content: center; color: #C0C4CC; font-size: 120px; background: #A2A2A2; }

.body-area { position: absolute; top: 58px; left: 0; right: 0; bottom: 0; display: flex; gap: 16px; padding: 14px; }
.left-panel { flex: 0 0 35%; background: rgba(255,255,255,0.96); backdrop-filter: blur(8px); border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
.right-panel { flex: 1; background: rgba(255,255,255,0.96); backdrop-filter: blur(8px); border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 4px 20px rgba(0,0,0,0.08); padding: 24px; }

.panel-tabs { display: flex; border-bottom: 1px solid #EBEEF5; flex-shrink: 0; }
.panel-tab { flex: 1; text-align: center; padding: 12px 8px; font-size: 13px; cursor: pointer; color: #909399; transition: all .15s; }
.panel-tab.active { color: #409EFF; border-bottom: 2px solid #409EFF; }
.panel-content { padding: 12px; overflow-y: auto; flex: 1; }

.pe-section { margin-top: 14px; }
.info-label-row { font-size: 11px; color: #909399; margin: 12px 0 4px; font-weight: 600; }
.pe-finding { font-size: 12px; margin-bottom: 6px; color: #303133; line-height: 1.5; }

.notes-display-area {
  width: 100%;
  min-height: 120px;
  border: 1px solid #DCDFE6;
  border-radius: 8px;
  padding: 10px;
  font-size: 13px;
  line-height: 1.6;
  color: #303133;
  background: #fafafa;
  white-space: pre-wrap;
  word-break: break-word;
  box-sizing: border-box;
}

.marked-items { max-height: calc(100vh - 180px); overflow-y: auto; }
.marked-title { font-size: 13px; font-weight: 600; color: #409EFF; margin-bottom: 8px; }
.marked-item { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; padding: 8px 10px; font-size: 13px; background: #f5f7fa; border-radius: 8px; margin-bottom: 6px; line-height: 1.5; }
.marked-text { flex: 1; color: #303133; word-break: break-word; }

.chat-bubble-row { display: flex; align-items: flex-start; gap: 6px; margin-bottom: 6px; }
.chat-bubble-row.user { justify-content: flex-end; }
.chat-bubble-row.sp { justify-content: flex-start; }
.chat-bubble-avatar { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; flex-shrink: 0; }
.chat-bubble-avatar.sp { background: #67C23A; color: #fff; }
.chat-bubble-avatar.user { background: #409EFF; color: #fff; }
.chat-bubble-card { max-width: 80%; padding: 6px 10px; border-radius: 10px; font-size: 12px; line-height: 1.5; word-break: break-word; }
.chat-bubble-card.sp { background: #f5f7fa; color: #303133; border: 1px solid #EBEEF5; }
.chat-bubble-card.user { background: #409EFF; color: #fff; }
.chat-bubble-time { font-size: 10px; color: #C0C4CC; margin-bottom: 2px; }
.chat-bubble-text { word-break: break-word; }
.history-chat-list { max-height: 100%; overflow-y: auto; }

.btn-add-icon { width: 34px; height: 34px; padding: 0; border: 1px solid #409EFF; border-radius: 6px; background: #409EFF; color: #fff; cursor: pointer; font-size: 22px; font-weight: 700; line-height: 34px; transition: all .15s; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; text-align: center; }
.btn-add-icon:hover { background: #337ecc; border-color: #337ecc; }
.empty-state { color: #C0C4CC; text-align: center; padding: 20px; }

.form-scroll { flex: 1; overflow-y: auto; }
.structured-form { max-width: 700px; margin: 0 auto; }
.form-title { text-align: center; font-size: 18px; font-weight: 700; color: #303133; margin-bottom: 20px; }
.form-section { margin-bottom: 20px; }
.form-section h4 { font-size: 14px; color: #303133; margin-bottom: 8px; }
.form-section input[type="text"] { width: 100%; padding: 10px 12px; border: 1px solid #DCDFE6; border-radius: 6px; font-size: 13px; box-sizing: border-box; }
.form-section input[type="text"]:focus { border-color: #409EFF; outline: none; }
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
.flex-section { display: flex; flex-direction: column; }
.textarea-wrap { flex: 1; display: flex; }
.textarea-wrap textarea { width: 100%; flex: 1; min-height: 120px; padding: 10px 12px; border: 1px solid #DCDFE6; border-radius: 6px; font-size: 13px; resize: none; box-sizing: border-box; }
.textarea-wrap textarea:focus { border-color: #409EFF; outline: none; }
.char-count { text-align: right; font-size: 11px; color: #C0C4CC; margin-top: 4px; }
.form-footer { flex-shrink: 0; text-align: center; padding-top: 16px; position: sticky; bottom: 0; background: rgba(255,255,255,0.95); backdrop-filter: blur(4px); }
.btn-submit { padding: 12px 32px; font-size: 15px; }
.btn { padding: 8px 20px; border: 1px solid #DCDFE6; border-radius: 8px; background: #fff; cursor: pointer; font-size: 13px; transition: all .15s; }
.btn:hover { border-color: #409EFF; color: #409EFF; }
.btn-primary { background: #409EFF; color: #fff; border-color: #409EFF; }
.btn-primary:hover { color: #fff; background: #337ecc; border-color: #337ecc; }

.end-warning { color: #909399; font-size: 13px; margin-bottom: 16px; }
.summary-list { margin-bottom: 16px; }
.summary-item { display: flex; justify-content: space-between; padding: 8px 0; font-size: 13px; border-bottom: 1px solid #EBEEF5; }
.summary-item.submitted { color: #67C23A; }
</style>
