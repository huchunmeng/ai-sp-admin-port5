<template>
  <div class="ancillary-tests-page">
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
      @end="submitTests"
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
            <div v-if="testMarkedMessages.length">
              <div class="marked-msg" v-for="(m, i) in testMarkedMessages" :key="i">
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
        <div class="view-toggle-bar">
          <button class="view-toggle-btn" :class="{ active: rightView === 'select' }" @click="rightView = 'select'">
            <i class="fa-solid fa-flask"></i>
            {{ lang === 'zh' ? '添加辅检' : 'Add Tests' }}
          </button>
          <button class="view-toggle-btn" :class="{ active: rightView === 'report' }" @click="rightView = 'report'">
            <i class="fa-solid fa-file-lines"></i>
            {{ lang === 'zh' ? '结果报告' : 'Results' }}
            <span v-if="submittedTests.length" class="view-badge">{{ submittedTests.length }}</span>
          </button>
        </div>

        <div class="form-scroll">
          <!-- View A: Batch Test Selection -->
          <div v-show="rightView === 'select'">
            <div class="section-title">{{ lang === 'zh' ? '选择辅助检查项目' : 'Select Ancillary Tests' }}</div>
            <div v-if="testCategories.length === 0" class="empty-state">
              <i class="fa-solid fa-circle-info" style="font-size:32px;color:#C0C4CC;"></i>
              <p>{{ lang === 'zh' ? '该病例暂无可用辅查数据' : 'No test data available for this case' }}</p>
            </div>
            <div v-for="cat in testCategories" :key="cat.name" class="test-category">
              <div class="category-header" @click="cat.expanded = !cat.expanded">
                <div class="category-title">
                  <i class="fa-solid" :class="cat.expanded ? 'fa-chevron-down' : 'fa-chevron-right'" style="width:16px;"></i>
                  <span>{{ cat.label }}</span>
                  <span class="category-count">({{ cat.items.length }})</span>
                </div>
                <div class="category-actions" @click.stop>
                  <button class="cat-action-btn" @click="selectAllInCat(cat)">{{ lang === 'zh' ? '全选' : 'All' }}</button>
                  <button class="cat-action-btn" @click="clearAllInCat(cat)">{{ lang === 'zh' ? '取消' : 'None' }}</button>
                </div>
              </div>
              <div v-show="cat.expanded" class="category-items">
                <label v-for="item in cat.items" :key="item.name" class="test-item" :class="{ selected: isSelected(cat.name, item.name) }">
                  <input type="checkbox" :checked="isSelected(cat.name, item.name)" @change="toggleTest(cat.name, item)" />
                  <div class="test-item-info">
                    <div class="test-item-name">{{ item.name }}</div>
                    <div class="test-item-desc" v-if="item.result && item.result !== item.name">{{ item.result.substring(0, 60) }}</div>
                  </div>
                </label>
              </div>
            </div>

            <div v-if="testCategories.length > 0" class="batch-submit-area">
              <div class="selected-count">{{ lang === 'zh' ? '已选' : 'Selected' }}: {{ selectedTests.length }} {{ lang === 'zh' ? '项' : 'items' }}</div>
              <button class="btn btn-primary btn-submit" @click="submitBatch" :disabled="selectedTests.length === 0 || batchSubmitted">
                <i class="fa-solid fa-paper-plane"></i>
                {{ batchSubmitted ? (lang === 'zh' ? '已提交' : 'Submitted') : (lang === 'zh' ? '提交申请' : 'Submit') }}
              </button>
            </div>
          </div>

          <!-- View B: Results Report -->
          <div v-show="rightView === 'report'">
            <div class="section-title">{{ lang === 'zh' ? '检查结果报告' : 'Test Results Report' }}</div>
            <div v-if="submittedTests.length === 0" class="empty-state">
              <i class="fa-solid fa-flask" style="font-size:32px;color:#C0C4CC;"></i>
              <p>{{ lang === 'zh' ? '尚未提交任何检查申请' : 'No tests submitted yet' }}</p>
              <button class="btn" @click="rightView = 'select'" style="margin-top:8px;">
                {{ lang === 'zh' ? '去添加辅检' : 'Add Tests' }}
              </button>
            </div>
            <div class="result-summary" v-if="submittedTests.length > 0">
              <div class="result-summary-item">
                <span class="summary-num">{{ submittedTests.length }}</span>
                <span class="summary-label">{{ lang === 'zh' ? '已申请检查' : 'Tests Ordered' }}</span>
              </div>
              <div class="result-summary-item">
                <span class="summary-num">{{ viewedResults.length }}</span>
                <span class="summary-label">{{ lang === 'zh' ? '已查看报告' : 'Reports Viewed' }}</span>
              </div>
            </div>
            <div v-for="(test, idx) in submittedTests" :key="idx" class="result-item">
              <div class="result-item-header" @click="toggleReport(idx)">
                <div class="result-item-left">
                  <span class="result-cat-tag">{{ test.categoryLabel }}</span>
                  <span class="result-item-name">{{ test.name }}</span>
                </div>
                <button class="report-toggle-btn" :class="{ viewed: viewedSet.has(idx) }">
                  <i class="fa-solid" :class="expandedReports.has(idx) ? 'fa-chevron-up' : 'fa-file-lines'"></i>
                  {{ expandedReports.has(idx) ? (lang === 'zh' ? '收起' : 'Hide') : (lang === 'zh' ? '报告' : 'Report') }}
                </button>
              </div>
              <div v-if="expandedReports.has(idx)" class="result-detail">
                <div class="result-meta">
                  <span><i class="fa-solid fa-clock"></i> {{ test.submittedAt || '' }}</span>
                  <span><i class="fa-solid fa-tag"></i> {{ test.categoryLabel }}</span>
                </div>
                <div class="result-content">{{ test.result }}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="form-footer">
          <button class="btn btn-primary btn-submit" @click="submitTests" :disabled="!batchSubmitted && selectedTests.length === 0">
            <i class="fa-solid fa-arrow-right"></i>
            {{ lang === 'zh' ? '提交并进入诊断' : 'Submit & Go to Diagnosis' }}
          </button>
        </div>
      </div>
    </div>

    <StationModals
      :show-end-confirm="showEndConfirm"
      :end-title="lang === 'zh' ? '确认提交辅助检查' : 'Confirm Submit Tests'"
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
import { getTestCategories } from '@ai-sp/shared/test-selection-engine'
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
const rightView = ref('select')
const showEndConfirm = ref(false)
const showConfirmDialog = ref(false)
const showToast = ref(false)
const toastMessage = ref('')
const selectedTests = ref([])
const submittedTests = ref([])
const batchSubmitted = ref(false)
const expandedReports = reactive(new Set())
const viewedSet = reactive(new Set())

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
  return [lang.value === 'zh' ? '辅助检查' : 'Ancillary Tests']
})

const stepIndex = computed(() => {
  const proj = stationProjects.value
  if (!proj.length) return 0
  const idx = proj.findIndex(p => p === (lang.value === 'zh' ? '辅助检查' : 'Ancillary Tests'))
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
  return flowCtx.value.stationName || (lang.value === 'zh' ? '辅助检查' : 'Ancillary Tests')
})
function onFlowStepClick(idx, step) {
  if (idx === flowStepIndex.value) return
  forwardNav.value = true
  syncAncillaryToSession()
  store.currentFlowIndex = idx
  if (store.stationFlow) store.stationFlow.currentIndex = idx
  store.saveTrainingSession()
  router.replace({ name: step.routeName, query: { caseId: store.currentCase?.id || '' } })
}

const testMarkedMessages = computed(() => {
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

const testCategories = computed(() => {
  const basic = caseData.value.basic
  if (!basic) return []
  const catMap = getTestCategories(basic)
  const labelMap = {
    'Laboratory Tests': lang.value === 'zh' ? '实验室检查' : 'Laboratory Tests',
    'Imaging Studies': lang.value === 'zh' ? '影像学检查' : 'Imaging Studies',
    'Special Tests': lang.value === 'zh' ? '特殊检查' : 'Special Tests'
  }
  return Array.from(catMap.entries()).map(([key, items]) => ({
    name: key,
    label: labelMap[key] || key,
    expanded: true,
    items: items.map(it => ({ ...it }))
  }))
})

function isSelected(catName, itemName) {
  return selectedTests.value.some(t => t.category === catName && t.name === itemName)
}

function toggleTest(catName, item) {
  if (batchSubmitted.value) return
  const idx = selectedTests.value.findIndex(t => t.category === catName && t.name === item.name)
  if (idx >= 0) {
    selectedTests.value.splice(idx, 1)
  } else {
    selectedTests.value.push({
      category: catName,
      name: item.name,
      result: item.result || item.name
    })
  }
  syncAncillaryToSession()
}

function selectAllInCat(cat) {
  if (batchSubmitted.value) return
  cat.items.forEach(item => {
    if (!isSelected(cat.name, item.name)) {
      selectedTests.value.push({
        category: cat.name,
        name: item.name,
        result: item.result || item.name
      })
    }
  })
  syncAncillaryToSession()
}

function clearAllInCat(cat) {
  if (batchSubmitted.value) return
  selectedTests.value = selectedTests.value.filter(t => t.category !== cat.name)
  syncAncillaryToSession()
}

function syncAncillaryToSession() {
  const labelMap = {
    'Laboratory Tests': '实验室检查',
    'Imaging Studies': '影像学检查',
    'Special Tests': '特殊检查'
  }
  store.trainingSession = store.trainingSession || {}
  store.trainingSession.ancillaryTests = {
    selections: selectedTests.value.map(t => ({
      category: t.category,
      categoryLabel: labelMap[t.category] || t.category,
      name: t.name,
      result: t.result
    })),
    results: submittedTests.value.map(t => ({
      ...t,
      viewed: viewedSet.has(submittedTests.value.indexOf(t))
    })),
    batchSubmitted: batchSubmitted.value,
    submittedAt: new Date().toISOString(),
    duration: elapsedSeconds.value
  }
  store.saveTrainingSession()
}

function submitBatch() {
  if (selectedTests.value.length === 0) return
  batchSubmitted.value = true
  const labelMap = {
    'Laboratory Tests': lang.value === 'zh' ? '实验室检查' : 'Lab',
    'Imaging Studies': lang.value === 'zh' ? '影像学检查' : 'Imaging',
    'Special Tests': lang.value === 'zh' ? '特殊检查' : 'Special'
  }
  submittedTests.value = selectedTests.value.map(t => ({
    ...t,
    categoryLabel: labelMap[t.category] || t.category,
    submittedAt: new Date().toLocaleString('zh-CN')
  }))
  rightView.value = 'report'
  syncAncillaryToSession()
}

function toggleReport(idx) {
  viewedSet.add(idx)
  if (expandedReports.has(idx)) {
    expandedReports.delete(idx)
  } else {
    expandedReports.add(idx)
  }
}

const viewedResults = computed(() => submittedTests.value.filter((_, i) => viewedSet.has(i)))

const confirmMessage = computed(() => {
  if (lang.value === 'zh') {
    return `已选择 ${selectedTests.value.length} 项辅助检查，确认提交并进入诊断？`
  }
  return `Selected ${selectedTests.value.length} tests. Confirm and proceed to diagnosis?`
})

function submitTests() {
  if (!batchSubmitted.value && selectedTests.value.length > 0) {
    showToast.value = true
    toastMessage.value = lang.value === 'zh' ? '请先点击"提交申请"获取检查结果' : 'Please submit the test order first'
    return
  }
  showEndConfirm.value = true
}

function endStage() {
  showEndConfirm.value = false

  const labelMap = {
    'Laboratory Tests': lang.value === 'zh' ? '实验室检查' : 'Lab',
    'Imaging Studies': lang.value === 'zh' ? '影像学检查' : 'Imaging',
    'Special Tests': lang.value === 'zh' ? '特殊检查' : 'Special'
  }

  store.trainingSession = store.trainingSession || {}
  store.trainingSession.ancillaryTests = {
    selections: selectedTests.value.map(t => ({
      category: t.category,
      categoryLabel: labelMap[t.category] || t.category,
      name: t.name,
      result: t.result
    })),
    results: submittedTests.value.map(t => ({
      ...t,
      viewed: viewedSet.has(submittedTests.value.indexOf(t))
    })),
    submittedAt: new Date().toISOString(),
    duration: elapsedSeconds.value
  }
  store.saveTrainingSession()

  stopTimer()
  store.addTrainingRecord({
    caseId: caseId.value,
    stationId: 'ancillaryTests',
    stationName: flowCtx.value?.stationName || (lang.value === 'zh' ? '辅助检查' : 'Ancillary Tests'),
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
    submitTests()
    return
  }
}

onBeforeRouteLeave((to, from, next) => {
  if (forwardNav.value) { next(); return }
  if ((store.stationFlow?.stations?.length || 0) > 1) { next(); return }
  if (showEndConfirm.value) { showEndConfirm.value = false }
  if (batchSubmitted.value || selectedTests.value.length === 0) { next(); return }
  showConfirmDialog.value = true
  next(false)
})

onMounted(async () => {
  ensureStationIndex(store, route.name)
  document.title = lang.value === 'zh' ? '辅助检查 - AI-SP' : 'Ancillary Tests - AI-SP'

  if (caseId.value) {
    const data = await loadCase(caseId.value)
    if (data) caseData.value = data
  }

  // Restore previous session data
  const ts = store.trainingSession || {}
  if (ts.ancillaryTests) {
    if (ts.ancillaryTests.selections) selectedTests.value = ts.ancillaryTests.selections
    if (ts.ancillaryTests.results?.length) {
      submittedTests.value = ts.ancillaryTests.results
      batchSubmitted.value = true
      // Restore viewed states
      ts.ancillaryTests.results.forEach((r, i) => {
        if (r.viewed) viewedSet.add(i)
      })
    }
    if (ts.ancillaryTests.batchSubmitted) batchSubmitted.value = true
  }

  // Accumulate notes from prior stages
  const notes = []
  if (ts.historyTaking?.notes) notes.push(ts.historyTaking.notes)
  if (ts.physicalExam?.notes) notes.push(ts.physicalExam.notes)
  store.trainingSession = { ...ts, ancillaryNotes: notes.filter(Boolean).join('\n') }

  startTimer()
})
</script>

<style scoped>
.ancillary-tests-page { width: 100vw; height: 100vh; overflow: hidden; position: relative; background: #1a1a2e; }
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

/* View Toggle */
.view-toggle-bar { display: flex; gap: 0; border-bottom: 2px solid #EBEEF5; flex-shrink: 0; }
.view-toggle-btn { flex: 1; padding: 14px 16px; border: none; background: #f5f7fa; cursor: pointer; font-size: 14px; font-weight: 600; color: #909399; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all .15s; position: relative; }
.view-toggle-btn:first-child { border-right: 1px solid #EBEEF5; }
.view-toggle-btn.active { background: #fff; color: #409EFF; border-bottom: 2px solid #409EFF; margin-bottom: -2px; }
.view-toggle-btn:hover:not(.active) { color: #606266; background: #ebeef5; }
.view-badge { background: #67C23A; color: #fff; font-size: 11px; padding: 1px 7px; border-radius: 10px; font-weight: 400; }

.form-scroll { flex: 1; overflow-y: auto; padding: 20px 24px; }
.section-title { font-size: 15px; font-weight: 600; color: #303133; margin-bottom: 16px; }
.empty-state { text-align: center; padding: 40px 20px; color: #C0C4CC; }

/* Test Categories */
.test-category { margin-bottom: 12px; border: 1px solid #EBEEF5; border-radius: 10px; overflow: hidden; }
.category-header { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: #f5f7fa; cursor: pointer; transition: background .15s; }
.category-header:hover { background: #ebeef5; }
.category-title { display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 13px; color: #303133; }
.category-count { font-size: 11px; color: #909399; font-weight: 400; }
.category-actions { display: flex; gap: 6px; }
.cat-action-btn { font-size: 11px; padding: 3px 10px; border-radius: 4px; border: 1px solid #DCDFE6; background: #fff; color: #606266; cursor: pointer; transition: all .15s; }
.cat-action-btn:hover { border-color: #409EFF; color: #409EFF; }

.category-items { padding: 8px; max-height: 250px; overflow-y: auto; }
.test-item { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 8px; cursor: pointer; transition: background .15s; margin-bottom: 2px; }
.test-item:hover { background: #f5f7fa; }
.test-item.selected { background: #ecf5ff; }
.test-item input[type="checkbox"] { width: 16px; height: 16px; cursor: pointer; accent-color: #409EFF; flex-shrink: 0; }
.test-item-info { flex: 1; min-width: 0; }
.test-item-name { font-size: 13px; font-weight: 500; color: #303133; }
.test-item-desc { font-size: 11px; color: #909399; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.batch-submit-area { display: flex; align-items: center; justify-content: space-between; padding: 16px 0; margin-top: 12px; border-top: 1px solid #EBEEF5; }
.selected-count { font-size: 14px; color: #409EFF; font-weight: 600; }

/* Results Report */
.result-summary { display: flex; gap: 16px; margin-bottom: 20px; }
.result-summary-item { flex: 1; text-align: center; padding: 16px 12px; background: #f5f7fa; border-radius: 10px; }
.summary-num { display: block; font-size: 24px; font-weight: 700; color: #409EFF; }
.summary-label { font-size: 12px; color: #909399; margin-top: 4px; display: block; }

.result-item { margin-bottom: 8px; border: 1px solid #EBEEF5; border-radius: 10px; overflow: hidden; }
.result-item-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; cursor: pointer; transition: background .15s; }
.result-item-header:hover { background: #f5f7fa; }
.result-item-left { display: flex; align-items: center; gap: 10px; }
.result-cat-tag { font-size: 10px; padding: 2px 8px; border-radius: 4px; background: #ecf5ff; color: #409EFF; }
.result-item-name { font-size: 13px; font-weight: 500; color: #303133; }
.report-toggle-btn { font-size: 12px; padding: 5px 12px; border-radius: 6px; border: 1px solid #DCDFE6; background: #fff; color: #606266; cursor: pointer; display: flex; align-items: center; gap: 4px; transition: all .15s; white-space: nowrap; }
.report-toggle-btn:hover { border-color: #409EFF; color: #409EFF; }
.report-toggle-btn.viewed { border-color: #67C23A; color: #67C23A; }

.result-detail { padding: 14px; border-top: 1px solid #EBEEF5; background: #fafafa; }
.result-meta { display: flex; gap: 16px; margin-bottom: 10px; font-size: 11px; color: #909399; }
.result-content { font-size: 13px; color: #303133; line-height: 1.8; white-space: pre-wrap; }

.form-footer { flex-shrink: 0; text-align: center; padding: 16px 24px; position: sticky; bottom: 0; background: rgba(255,255,255,0.95); border-top: 1px solid #EBEEF5; }
.btn { padding: 10px 20px; border-radius: 8px; cursor: pointer; font-size: 14px; border: 1px solid #DCDFE6; background: #fff; color: #606266; display: inline-flex; align-items: center; gap: 6px; transition: all .15s; }
.btn:hover { border-color: #409EFF; color: #409EFF; }
.btn-primary { background: #409EFF; border-color: #409EFF; color: #fff; }
.btn-primary:hover { background: #337ecc; color: #fff; }
.btn-primary:disabled { background: #a0cfff; border-color: #a0cfff; cursor: not-allowed; }
.btn-submit { padding: 12px 32px; font-size: 15px; }
</style>
