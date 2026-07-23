<template>
  <div class="treatment-plan-page">
    <img v-if="c.patient.fullBodyImage && (c.patient.fullBodyImage.startsWith('/images/') || c.patient.fullBodyImage.startsWith('images/'))" :src="c.patient.fullBodyImage" class="patient-bg" />
    <div v-else class="patient-placeholder">👤</div>

    <TrainingTopBar
      :station-name="topBarTitle"
      :steps="steps"
      :step-index="stepIndex"
      :formatted-time="formattedTime"
      :end-label="lang === 'zh' ? (flowCtx.isLast ? '结束' : '下一步') : (flowCtx.isLast ? 'End' : 'Next')"
      :end-icon="flowCtx.isLast ? 'fa-right-from-bracket' : 'fa-arrow-right'"
      end-icon="fa-arrow-right"
      :hide-step-number="true"
      :show-lang-toggle="true"
      :lang-label="lang === 'zh' ? 'EN' : '中'"
      :flow-steps="flowSteps"
      :flow-step-index="flowStepIndex"
      @step-click="onStepClick"
      @end="showEndConfirm = true"
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
          <div class="panel-tab" :class="{ active: leftTab === 'pe' }" @click="leftTab = 'pe'">
            {{ lang === 'zh' ? '接诊记录' : 'History' }}
          </div>
        </div>
        <div class="panel-content">
          <div v-show="leftTab === 'info'">
            <PatientInfoPanel :patient="c.patient" :vitals="c.vitals" :chief-complaint="c.chiefComplaint" :lang="lang" />
          </div>
          <div v-show="leftTab === 'notes'">
            <div class="marked-items" v-if="txMarkedMessages && txMarkedMessages.length > 0">
              <div class="marked-title">{{ lang === 'zh' ? '📌 已标记信息' : '📌 Marked Info' }}</div>
              <div class="marked-item" v-for="(m, idx) in txMarkedMessages" :key="'tm'+idx">
                <span class="marked-text">{{ truncateText(m.content, 50) }}</span>
              </div>
            </div>
            <div v-else class="notes-display-area">{{ notes || (lang === 'zh' ? '暂无笔记' : 'No notes') }}</div>
          </div>
          <div v-show="leftTab === 'pe'">
            <div v-if="consultationMessages && consultationMessages.length > 0" class="history-chat-list">
              <div v-for="(m, idx) in consultationMessages" :key="'rec'+idx" :class="['chat-bubble-row', m.role === 'user' ? 'user' : 'sp']">
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
          <div class="plan-form">
            <h3 class="form-title">
              <i class="fa-solid fa-prescription" style="color:#409EFF;margin-right:8px;"></i>
              {{ lang === 'zh' ? '治疗计划' : 'Treatment Plan' }}
            </h3>
            <div class="plan-section">
              <h4><i class="fa-solid fa-list-check"></i> {{ lang === 'zh' ? '治疗计划' : 'Treatment Plan' }}</h4>
              <div class="plan-textarea-wrap">
                <textarea v-model="plan.content" :placeholder="lang === 'zh' ? '请输入' : 'Please enter'"></textarea>
              </div>
            </div>
          </div>
        </div>
        <div class="form-footer">
          <button class="btn btn-primary btn-submit" @click="submitPlan">
            <i class="fa-solid fa-check"></i> {{ lang === 'zh' ? '提交并进入下一阶段' : 'Submit & Next Stage' }}
          </button>
        </div>
      </div>
    </div>

    <StationModals
      :show-end-confirm="showEndConfirm"
      :end-title="lang === 'zh' ? '确认提交治疗计划' : 'Confirm Submit Treatment Plan'"
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
            <span>{{ lang === 'zh' ? '✅ 治疗计划内容' : '✅ Plan Content' }}</span>
            <span>{{ plan.content ? (lang === 'zh' ? '已填写' : 'Filled') : (lang === 'zh' ? '未填写' : 'Empty') }}</span>
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
import { matchPatientImage } from '@/composables/usePatientImage'
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
  if ((store.stationFlow?.stations?.length || 0) > 1) { next(); return }
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
    },
    chiefComplaint: basic.chief_complaint || '',
    vitals: parseVitals(basic.physical_exam?.vital_signs),
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
  return flowCtx.value.stationName || (lang.value === 'zh' ? '治疗计划站' : 'Treatment Plan')
})
function onFlowStepClick(idx, step) {
  if (idx === flowStepIndex.value) return
  forwardNav.value = true
  store.currentFlowIndex = idx
  if (store.stationFlow) store.stationFlow.currentIndex = idx
  store.trainingSession = store.trainingSession || {}
  store.trainingSession.treatmentPlan = {
    content: plan.content,
    notes: notes.value,
    duration: elapsedSeconds.value
  }
  store.saveTrainingSession()
  router.replace({ name: step.routeName, query: { caseId: store.currentCase?.id || '' } })
}

const leftTab = ref('info')
const notes = ref('')
const plan = reactive({ content: '' })
const showEndConfirm = ref(false)

const diagData = computed(() => {
  const ts = store.trainingSession
  if (!ts) return null
  return ts.diagnosis || ts.preliminaryDiag || null
})
const diagPreliminary = computed(() => diagData.value?.preliminary || '')
const diagDifferential = computed(() => diagData.value?.differential || '')
const diagBasis = computed(() => diagData.value?.basis || '')

const peFindings = computed(() => {
  const findings = []
  const sess = store.trainingSession || {}
  if (sess.physicalExam?.messages) {
    for (const m of sess.physicalExam.messages) {
      if (m.role === 'system' && m.content) findings.push({ content: m.content })
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

const txMarkedMessages = computed(() => {
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

const consultationMessages = computed(() => {
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

const existingPlanContent = computed(() => {
  const t = store.trainingSession && store.trainingSession.treatmentPlan
  if (!t) return ''
  if (t.content) return t.content
  const meds = (t.medications || []).filter(m => m.name).map(m =>
    m.name + ' ' + m.dosage + ' ' + m.course
  ).join('；')
  const parts = []
  if (t.principle) parts.push((lang.value === 'zh' ? '治疗原则：' : 'Principles: ') + t.principle)
  if (meds) parts.push((lang.value === 'zh' ? '药物治疗：' : 'Medication: ') + meds)
  if (t.nonPharma) parts.push((lang.value === 'zh' ? '非药物治疗：' : 'Non-Pharma: ') + t.nonPharma)
  if (t.education) parts.push((lang.value === 'zh' ? '健康教育：' : 'Health Education: ') + t.education)
  if (t.followUp) parts.push((lang.value === 'zh' ? '随访计划：' : 'Follow-up: ') + t.followUp)
  return parts.join('\n\n')
})

function onStepClick(si) {
  if (si === stepIndex.value) return
  if (si < stepIndex.value) return
  if (si > stepIndex.value + 1) {
    showToast(lang.value === 'zh' ? '请按顺序完成当前步骤后再进入下一步' : 'Please complete current step first', 'warning')
    return
  }
  confirmDialog(
    lang.value === 'zh' ? '确定要进入下一步吗？当前治疗计划将自动提交。' : 'Proceed to next step? Current plan will be submitted.',
    { title: lang.value === 'zh' ? '进入下一步' : 'Next Step', icon: 'fa-arrow-right', iconClass: 'info' }
  ).then(confirmed => {
    if (confirmed) {
      store.trainingSession = store.trainingSession || {}
      store.trainingSession.treatmentPlan = {
        content: plan.content,
        notes: notes.value,
        duration: elapsedSeconds.value
      }
      forwardNav.value = true; router.replace({ name: steps.value[si].route, query: { caseId: c.value.id } })
    }
  })
}

function submitPlan() {
  if (!plan.content.trim()) {
    showToast(lang.value === 'zh' ? '请输入治疗计划' : 'Please enter treatment plan', 'warning')
    return
  }
  showEndConfirm.value = true
}

function endStage() {
  store.trainingSession = store.trainingSession || {}
  store.trainingSession.treatmentPlan = {
    content: plan.content,
    notes: notes.value,
    duration: elapsedSeconds.value
  }
  store.saveTrainingSession()
  const rec = store.addTrainingRecord({
    caseId: c.value.id,
    stationId: 'treatmentPlan',
    stationName: flowCtx.value?.stationName || (lang.value === 'zh' ? '治疗计划站' : 'Treatment Plan'),
    duration: elapsedSeconds.value,
    score: 0,
    time: new Date().toLocaleString()
  })
  store.currentCase = caseData.value.basic || c.value
  store.currentRecord = { caseId: c.value.id, stationId: 'treatmentPlan', stationName: flowCtx.value?.stationName || (lang.value === 'zh' ? '治疗计划站' : 'Treatment Plan'), score: 0, time: new Date().toLocaleString(), id: rec.key, recordedAt: rec.recordedAt }
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
  document.title = lang.value === 'zh' ? '接诊病人站 · 治疗计划' : 'Reception · Treatment Plan'
  if (!caseId.value) caseId.value = route.query.caseId || 'IM-20260527-A9GW'

  if (caseId.value) {
    const data = await loadCase(caseId.value)
    if (data) caseData.value = data
  }

  if (!plan.content && existingPlanContent.value) {
    plan.content = existingPlanContent.value
  }
  const sess = store.trainingSession || {}
  const parts = []
  if (sess.historyTaking?.notes) parts.push(sess.historyTaking.notes)
  if (sess.physicalExam?.notes) parts.push(sess.physicalExam.notes)
  if (sess.diagnosis?.notes || sess.preliminaryDiag?.notes) parts.push(sess.diagnosis?.notes || sess.preliminaryDiag?.notes)
  if (parts.length > 0) notes.value = parts.join('\n')
  startTimer()
})
</script>

<style scoped>
.treatment-plan-page { position: relative; width: 100vw; height: 100vh; overflow: hidden; }
.patient-bg { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); max-height: calc(100vh - 140px); max-width: 90vw; width: auto; height: auto; object-fit: contain; z-index: 0; }
.patient-placeholder { position: absolute; inset: 0; z-index: 0; display: flex; align-items: center; justify-content: center; color: #C0C4CC; font-size: 120px; background: linear-gradient(180deg, #e8edf2 0%, #dce3ea 100%); }

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

.marked-items { max-height: calc(100vh - 280px); overflow-y: auto; }
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
.empty-state { color: #C0C4CC; text-align: center; padding: 20px; }

.diag-record-section { font-size: 12px; }
.diag-record-label { font-weight: 600; font-size: 12px; color: #409EFF; margin-bottom: 4px; }
.diag-record-value { font-size: 13px; color: #303133; padding: 8px 10px; background: #f5f7fa; border-radius: 6px; }
.diag-record-text { font-size: 13px; color: #606266; padding: 8px 10px; background: #f5f7fa; border-radius: 6px; line-height: 1.6; white-space: pre-wrap; }

.form-scroll { flex: 1; overflow-y: auto; }
.plan-form { max-width: 700px; margin: 0 auto; display: flex; flex-direction: column; height: 100%; }
.form-title { text-align: center; font-size: 18px; font-weight: 700; color: #303133; margin-bottom: 20px; flex-shrink: 0; }
.plan-section { display: flex; flex-direction: column; flex: 1; }
.plan-section h4 { font-size: 14px; color: #303133; margin-bottom: 8px; flex-shrink: 0; }
.plan-textarea-wrap { flex: 1; display: flex; }
.plan-textarea-wrap textarea { width: 100%; flex: 1; min-height: 200px; padding: 12px; border: 1px solid #DCDFE6; border-radius: 8px; font-size: 13px; resize: none; box-sizing: border-box; }
.plan-textarea-wrap textarea:focus { border-color: #409EFF; outline: none; }
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
