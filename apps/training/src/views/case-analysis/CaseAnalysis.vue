<template>
  <div class="case-analysis-page">
    <img v-if="c.patient.fullBodyImage && (c.patient.fullBodyImage.startsWith('/images/') || c.patient.fullBodyImage.startsWith('images/'))" :src="c.patient.fullBodyImage" class="patient-bg" />
    <div v-else class="patient-placeholder">&#x1F464;</div>

    <TrainingTopBar
      :station-name="lang === 'zh' ? '临床思维站' : 'Clinical Thinking'"
      :steps="analysisSteps"
      :step-index="currentQ"
      :formatted-time="formattedTime"
      :hide-step-number="true"
      :end-label="lang === 'zh' ? '提交' : 'Submit'"
      :show-lang-toggle="true"
      :lang-label="lang === 'zh' ? 'EN' : '中'"
      @end="submitAnalysis"
      @toggle-lang="lang = lang === 'zh' ? 'en' : 'zh'"
    />

    <div class="body-area">
      <div class="left-panel">
        <div class="panel-header">
          <i class="fa-solid fa-file-lines"></i> {{ lang === 'zh' ? '病例信息' : 'Case Info' }}
        </div>
        <div class="panel-content">
          <div v-if="structuredPhasedInfo.length > 0" class="case-full-text">
            <div v-for="(block, bi) in structuredPhasedInfo" :key="bi" class="info-block">
              <div v-if="block.title" class="info-block-title">{{ block.title }}</div>
              <div class="info-block-text">{{ block.text }}</div>
            </div>
          </div>
          <div v-else class="case-full-text text-secondary">{{ lang === 'zh' ? '暂无病例资料' : 'No case data available' }}</div>
        </div>
      </div>

      <div class="right-panel">
        <div class="qa-area">
          <div class="qa-nav">
            <span v-for="(q, qi) in questions" :key="qi"
                  class="qa-dot"
                  :class="{ active: currentQ === qi, done: answers[qi] && answers[qi].trim() }"
                  @click="switchQuestion(qi)">
              {{ qi + 1 }}
            </span>
          </div>
          <div class="analysis-qa-card">
            <div class="qa-question">{{ questions[currentQ]?.question || (lang === 'zh' ? '加载中...' : 'Loading...') }}</div>
            <textarea
              v-model="answers[currentQ]"
              :placeholder="lang === 'zh' ? '请输入你的分析...' : 'Enter your analysis...'"
              class="qa-textarea"
            ></textarea>
          </div>
        </div>
        <div class="qa-footer">
          <button v-if="currentQ < questions.length - 1" class="btn btn-primary" @click="nextQuestion">
            {{ lang === 'zh' ? '下一题' : 'Next' }} <i class="fa-solid fa-chevron-right"></i>
          </button>
          <button v-else class="btn btn-primary" @click="submitAnalysis">
            <i class="fa-solid fa-check"></i> {{ lang === 'zh' ? '提交' : 'Submit' }}
          </button>
        </div>
      </div>
    </div>

    <StationModals
      :show-end-confirm="showEndConfirm"
      :end-title="lang === 'zh' ? '确认提交病例分析' : 'Confirm Submit Analysis'"
      :end-warning="lang === 'zh' ? '提交后无法返回修改，确认提交吗？' : 'Cannot modify after submission. Confirm?'"
      :cancel-label="lang === 'zh' ? '继续作答' : 'Continue'"
      :confirm-label="lang === 'zh' ? '确认提交' : 'Confirm Submit'"
      :lang="lang"
      @cancel="showEndConfirm = false"
      @confirm="endStage"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import { useTrainingStore } from '@/stores/training'
import { useCaseLoader } from '@/composables/useCaseLoader'
import { matchPatientImage } from '@/composables/usePatientImage'
import { showToast, confirmDialog } from '@/composables/useUtils'
import { useTimer } from '@/composables/useTimer'
import { resolveNextInFlow, advanceToNextStation, ensureStationIndex } from '@/composables/useStationFlow'
import TrainingTopBar from '@/components/TrainingTopBar.vue'
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
const caseData = ref({ basic: null, analysis: null })
const lang = ref(store.lang || 'zh')
const flowCtx = computed(() => resolveNextInFlow(store, route.name))

const currentQ = ref(0)
const answers = ref([])
const showEndConfirm = ref(false)

const c = computed(() => {
  const basic = caseData.value.basic
  if (!basic) return { id: caseId.value, patient: { name: '加载中...' } }
  const pi = basic.patient_info || {}
  const gender = pi.sex === '1' || pi.sex === '男' ? '男' : (pi.sex === '0' || pi.sex === '女' ? '女' : '')
  const ageStr = String(pi.age || '').replace('岁', '')
  const ageNum = parseInt(ageStr) || 30
  const preg = pi.pregnancy || ''
  return {
    id: caseId.value,
    title: basic.title || '',
    patient: {
      name: pi.name || '',
      sex: gender,
      age: ageStr,
      fullBodyImage: matchPatientImage({ gender, age: ageNum, isPregnant: preg }, 'full'),
    },
  }
})

const rawSteps = computed(() => {
  const analysis = caseData.value.analysis
  if (!analysis) return []
  // 优先使用考生版，考官版作为兜底
  const src = analysis.candidate_version?.steps || analysis.examiner_version?.steps
  if (!src || !Array.isArray(src)) return []
  // 标准化：candidate_version 的步骤没有 step/title 字段，从索引推导
  return src.map((s, i) => ({
    ...s,
    step: s.step || (i + 1),
    title: s.title || ((lang.value === 'zh' ? '步骤 ' : 'Step ') + (i + 1)),
  }))
})

const questions = computed(() => {
  if (rawSteps.value.length === 0) {
    return [{ question: lang.value === 'zh' ? '请等待病例数据加载...' : 'Loading case data...', step: 0 }]
  }
  const all = []
  for (const s of rawSteps.value) {
    if (s.questions && Array.isArray(s.questions)) {
      for (const q of s.questions) {
        all.push({ question: q.text || '', step: s.step, title: s.title })
      }
    } else if (s.question) {
      all.push({ question: s.question.text || s.question || s.title || '', step: s.step, title: s.title })
    } else {
      all.push({ question: s.title || '', step: s.step, title: s.title })
    }
  }
  return all
})

const analysisSteps = computed(() => [
  { label: lang.value === 'zh' ? '病例分析' : 'Case Analysis' }
])

// 当前阶段可见的递呈信息
const structuredPhasedInfo = computed(() => {
  const steps = rawSteps.value
  if (steps.length === 0) return []

  // 病人基本信息
  const basic = caseData.value.basic
  const blocks = []

  // 基本信息块(始终可见)
  if (basic) {
    const pi = basic.patient_info || {}
    blocks.push({
      title: lang.value === 'zh' ? '基本信息' : 'Basic Info',
      text: [
        pi.name ? (lang.value === 'zh' ? '姓名：' : 'Name: ') + pi.name : '',
        pi.sex ? (lang.value === 'zh' ? '性别：' : 'Sex: ') + (pi.sex === '1' || pi.sex === '男' ? (lang.value === 'zh' ? '男' : 'M') : (pi.sex === '0' || pi.sex === '女' ? (lang.value === 'zh' ? '女' : 'F') : pi.sex)) : '',
        pi.age ? (lang.value === 'zh' ? '年龄：' : 'Age: ') + pi.age + (lang.value === 'zh' ? '岁' : 'y') : '',
      ].filter(Boolean).join('，')
    })
  }

  // 当前阶段递呈信息
  const stepOfCurrentQ = questions.value[currentQ.value]?.step || 1
  for (let i = 0; i < steps.length; i++) {
    if (steps[i].step > stepOfCurrentQ) continue
    if (steps[i].presented_info) {
      blocks.push({
        title: lang.value === 'zh' ? ('步骤' + steps[i].step + '题干') : ('Step ' + steps[i].step + ' Stem'),
        text: steps[i].presented_info
      })
    }
  }

  return blocks
})

function switchQuestion(qi) {
  if (answers.value[qi]?.trim() || qi < currentQ.value) currentQ.value = qi
}

function nextQuestion() {
  if (!answers.value[currentQ.value] || !answers.value[currentQ.value].trim()) {
    showToast(lang.value === 'zh' ? '请输入当前题目的答案' : 'Please answer the current question', 'warning')
    return
  }
  if (currentQ.value < questions.value.length - 1) {
    currentQ.value++
  }
}

function submitAnalysis() {
  const allAnswered = questions.value.every((_, i) => answers.value[i] && answers.value[i].trim())
  if (!allAnswered) {
    confirmDialog(
      lang.value === 'zh' ? '还有题目未作答，确定要提交吗？' : 'Some questions are not answered. Submit anyway?',
      { title: lang.value === 'zh' ? '确认提交' : 'Confirm Submit', icon: 'fa-triangle-exclamation', iconClass: 'danger' }
    ).then(confirmed => {
      if (confirmed) showEndConfirm.value = true
    })
    return
  }
  showEndConfirm.value = true
}

function endStage() {
  const record = {
    caseId: c.value.id, caseTitle: c.value.title,
    stationId: 'analysis', stationName: lang.value === 'zh' ? '临床思维站' : 'Clinical Thinking',
    duration: elapsedSeconds.value,
    time: new Date().toISOString().replace('T', ' ').substring(0, 19),
    session: { answers: [...answers.value], questions: questions.value.map(q => q.question) }
  }
  const recResult = store.addTrainingRecord({
    caseId: c.value.id,
    stationId: 'analysis',
    stationName: lang.value === 'zh' ? '临床思维站' : 'Clinical Thinking',
    duration: elapsedSeconds.value,
    score: 0,
    time: new Date().toLocaleString()
  })
  store.trainingSession = store.trainingSession || {}
  store.trainingSession.caseAnalysis = record.session
  store.saveTrainingSession()
  showEndConfirm.value = false
  store.currentRecord = { ...record, id: recResult.key, recordedAt: recResult.recordedAt }
  store.currentCase = c.value
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

onMounted(async () => {
  ensureStationIndex(store, route.name)
  document.title = lang.value === 'zh' ? '临床思维站' : 'Clinical Thinking'
  if (!caseId.value) caseId.value = route.query.caseId || 'IM-20260527-A9GW'

  if (caseId.value) {
    const data = await loadCase(caseId.value)
    if (data) {
      caseData.value = data
      const steps = data.analysis?.examiner_version?.steps || []
      // 展平所有步骤中的问题，确保 answers 长度匹配实际题目数
      const allQ = []
      for (const s of steps) {
        if (s.questions && Array.isArray(s.questions)) {
          allQ.push(...s.questions)
        } else if (s.question) {
          allQ.push(s.question)
        } else {
          allQ.push({})
        }
      }
      answers.value = new Array(allQ.length || 1).fill('')
    }
  }
  startTimer()
})
</script>

<style scoped>
.case-analysis-page { position: relative; width: 100vw; height: 100vh; overflow: hidden; }
.patient-bg { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); max-height: calc(100vh - 140px); max-width: 90vw; width: auto; height: auto; object-fit: contain; z-index: 0; }
.patient-placeholder { position: absolute; inset: 0; z-index: 0; display: flex; align-items: center; justify-content: center; color: #C0C4CC; font-size: 120px; background: linear-gradient(180deg, #e8edf2 0%, #dce3ea 100%); }

.body-area { position: absolute; top: 58px; left: 0; right: 0; bottom: 0; display: flex; gap: 16px; padding: 14px; }
.left-panel { flex: 0 0 35%; background: rgba(255,255,255,0.96); backdrop-filter: blur(8px); border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; border: 1px solid #EBEEF5; }
.right-panel { flex: 1; background: rgba(255,255,255,0.96); backdrop-filter: blur(8px); border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; border: 1px solid #EBEEF5; }

.panel-header { padding: 12px; font-size: 14px; font-weight: 600; color: #303133; border-bottom: 1px solid #EBEEF5; flex-shrink: 0; display: flex; align-items: center; gap: 6px; }
.panel-content { padding: 12px; overflow-y: auto; flex: 1; }
.case-full-text { font-size: 13px; color: #303133; line-height: 1.8; }
.text-secondary { color: #909399; }

.info-block { margin-bottom: 12px; }
.info-block-title { font-size: 12px; font-weight: 600; color: #409EFF; margin-bottom: 4px; }
.info-block-text { font-size: 13px; color: #303133; line-height: 1.8; white-space: pre-wrap; }

.qa-area { flex: 1; display: flex; flex-direction: column; overflow: hidden; padding: 24px; }
.qa-nav { display: flex; gap: 8px; justify-content: center; margin-bottom: 16px; flex-shrink: 0; }
.qa-dot { width: 32px; height: 32px; border-radius: 50%; background: #DCDFE6; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 600; cursor: default; transition: all .15s; }
.qa-dot.active { background: #409EFF; transform: scale(1.1); box-shadow: 0 2px 8px rgba(64,158,255,0.3); }
.qa-dot.done { background: #67C23A; cursor: pointer; }
.qa-dot.done:hover { transform: scale(1.1); }
.analysis-qa-card { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
.qa-question { font-size: 15px; font-weight: 600; color: #303133; margin-bottom: 12px; flex-shrink: 0; }
.qa-textarea { flex: 1; width: 100%; min-height: 150px; padding: 12px; border: none; border-radius: 8px; font-size: 13px; line-height: 1.6; resize: none; box-sizing: border-box; outline: none; background: #f8f9fa; }
.qa-textarea:focus { box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2); background: #fff; }
.qa-footer { display: flex; gap: 8px; padding: 0 24px 24px; flex-shrink: 0; }
.btn { padding: 8px 20px; border: 1px solid #DCDFE6; border-radius: 8px; background: #fff; cursor: pointer; font-size: 13px; transition: all .15s; }
.btn:hover { border-color: #409EFF; color: #409EFF; }
.btn-primary { background: #409EFF; color: #fff; border-color: #409EFF; }
.btn-primary:hover { color: #fff; background: #337ecc; border-color: #337ecc; }
</style>
