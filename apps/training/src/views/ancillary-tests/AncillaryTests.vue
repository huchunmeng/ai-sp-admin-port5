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
        <!-- 上栏：检查结果（图标展示） -->
        <div class="results-upper">
          <div class="results-upper-header">
            <span class="results-upper-title">
              <i class="fa-solid fa-file-lines"></i>
              {{ lang === 'zh' ? '检查结果' : 'Test Results' }}
            </span>
            <span v-if="submittedTests.length" class="results-upper-count">{{ submittedTests.length }} {{ lang === 'zh' ? '项' : 'items' }}</span>
          </div>
          <div :class="['results-grid', { 'results-flash': justSubmitted }]" v-if="submittedTests.length > 0">
            <div
              v-for="(test, idx) in submittedTests"
              :key="idx"
              :class="['result-icon-card', { viewed: viewedSet.has(idx) }]"
              @click="toggleReport(idx)"
            >
              <div class="result-icon">
                <i :class="getTestIcon(test.category)"></i>
              </div>
              <div class="result-icon-name">{{ test.name }}</div>
              <div class="result-icon-cat">{{ test.categoryLabel }}</div>
              <div v-if="!viewedSet.has(idx)" class="result-icon-badge new">NEW</div>
            </div>
          </div>
          <div v-else class="results-empty">
            <i class="fa-solid fa-flask"></i>
            <span>{{ lang === 'zh' ? '尚未申请检查，请在下方输入' : 'No tests ordered yet' }}</span>
          </div>
        </div>

        <!-- 下栏：开具检查申请 -->
        <div class="input-lower">
          <div class="input-lower-header">
            <span class="input-lower-title">
              <i class="fa-solid fa-pen-to-square"></i>
              {{ lang === 'zh' ? '开具检查申请' : 'Order Tests' }}
            </span>
            <span class="input-lower-hint">{{ lang === 'zh' ? '自由输入检查项目，AI自动识别处理' : 'Free-text input, AI auto-recognition' }}</span>
          </div>
          <div class="input-lower-body">
            <textarea
              ref="orderTextareaRef"
              v-model="orderText"
              class="order-textarea"
              :placeholder="lang === 'zh' ? '在此输入要申请的检查项目，支持自然语言：\n例如：查个血常规+超敏CRP，肝功能全套，再加个腹部CT平扫+增强\n也可以简写：血常规、肝功、腹部CT\n系统将自动识别并匹配检查项目...' : 'Enter test orders in natural language:\ne.g. CBC with CRP, liver panel, abdominal CT with contrast'"
              rows="5"
              :disabled="processingOrder"
            ></textarea>

            <div class="input-actions">
              <span v-if="processingOrder" class="processing-hint">
                <i class="fa-solid fa-spinner fa-spin"></i>
                {{ lang === 'zh' ? 'AI正在识别和处理检查项目...' : 'AI is processing your order...' }}
              </span>
              <span v-else class="matched-count empty"></span>
              <button
                class="btn btn-primary"
                @click="submitOrder"
                :disabled="!orderText.trim() || processingOrder"
              >
                <i v-if="!processingOrder" class="fa-solid fa-paper-plane"></i>
                {{ lang === 'zh' ? '提交申请' : 'Submit Order' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <transition name="toast-fade">
        <div v-if="showToast" class="app-toast" @click="showToast = false">
          <i class="fa-solid fa-circle-exclamation"></i>
          <span>{{ toastMessage }}</span>
        </div>
      </transition>
    </Teleport>

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

    <!-- 报告查看弹窗 -->
    <Teleport to="body">
      <transition name="modal-fade">
        <div v-if="showReport" class="report-modal-overlay" @click.self="showReport = false">
          <div class="report-modal">
            <div class="report-modal-header">
              <span class="report-modal-title">
                <i :class="getTestIcon(reportTest?.category)"></i>
                {{ reportTest?.name }}
              </span>
              <span class="report-modal-cat">{{ reportTest?.categoryLabel }}</span>
              <button class="report-modal-close" @click="showReport = false">
                <i class="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div class="report-modal-body">
              <div v-if="reportImageLoaded" class="report-image-wrap">
                <img :src="reportImageSrc" :alt="reportTest?.name" class="report-image" @error="reportImageLoaded = false" />
                <div class="report-image-caption">{{ lang === 'zh' ? '检查报告图片' : 'Test Report Image' }}</div>
              </div>
              <div v-else class="report-text-wrap">
                <div class="report-text-header">
                  <div class="report-text-hospital">{{ lang === 'zh' ? '东南大学附属中大医院' : 'Zhongda Hospital, Southeast University' }}</div>
                  <div class="report-text-title">{{ reportTest?.name }}{{ lang === 'zh' ? '检查报告' : ' Report' }}</div>
                  <div class="report-text-meta">
                    <span>{{ lang === 'zh' ? '姓名' : 'Name' }}: {{ c.patient.name }}</span>
                    <span>{{ lang === 'zh' ? '性别' : 'Sex' }}: {{ c.patient.gender }}</span>
                    <span>{{ lang === 'zh' ? '年龄' : 'Age' }}: {{ c.patient.age }}</span>
                    <span>ID: {{ caseId?.slice(0, 16) }}</span>
                  </div>
                </div>
                <div class="report-text-divider"></div>
                <pre class="report-text-content">{{ formatReportText(reportTest) }}</pre>
              </div>
            </div>
          </div>
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import { useTrainingStore } from '@/stores/training'
import { useCaseLoader } from '@/composables/useCaseLoader'
import { useStationFlow, resolveNextInFlow, advanceToNextStation, ensureStationIndex, PROJECT_ROUTE_MAP } from '@/composables/useStationFlow'
import { useTimer } from '@/composables/useTimer'
import { matchPatientImage } from '@/composables/usePatientImage'
import { parseVitals } from '@/composables/useUtils'
import { useAIChat } from '@/composables/useAIChat'
import TrainingTopBar from '@/components/TrainingTopBar.vue'
import PatientInfoPanel from '@/components/PatientInfoPanel.vue'
import StationModals from '@/components/StationModals.vue'

const route = useRoute()
const router = useRouter()
const store = useTrainingStore()
const { loadCase } = useCaseLoader()
const { stations: flowStations } = useStationFlow()
const { formattedTime, elapsedSeconds, startTimer, stopTimer } = useTimer()
const { sendMessage: sendLLMMessage } = useAIChat()

const lang = ref(store.lang || 'zh')
const forwardNav = ref(false)
const caseData = ref({ basic: null })
const leftTab = ref('info')
const showEndConfirm = ref(false)
const showToast = ref(false)
const toastMessage = ref('')
const submittedTests = ref([])
const viewedSet = reactive(new Set())

const orderTextareaRef = ref(null)
const orderText = ref('')
const processingOrder = ref(false)
const justSubmitted = ref(false)

const showReport = ref(false)
const reportTest = ref(null)
const reportImageSrc = ref('')
const reportImageLoaded = ref(false)

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
  if (stationProjects.value.length > 0) {
    return stationProjects.value.map(p => {
      const mapped = PROJECT_ROUTE_MAP[p]
      return { label: p, route: mapped?.route || 'ancillaryTests' }
    })
  }
  if (store.stationScheme?.length) {
    const st = store.stationScheme[store.currentFlowIndex]
    const projects = st?.projects || [st?.name].filter(Boolean)
    return projects.map(p => ({ label: p, route: 'ancillaryTests' }))
  }
  const label = lang.value === 'zh' ? '辅助检查' : 'Ancillary Tests'
  return [{ label, route: 'ancillaryTests' }]
})

const stepIndex = computed(() => {
  return steps.value.findIndex(s => s.route === route.name)
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

function getTestIcon(cat) {
  const map = {
    '实验室检查': 'fa-solid fa-vial-circle-check',
    '影像学检查': 'fa-solid fa-x-ray',
    '特殊检查': 'fa-solid fa-stethoscope',
    'Laboratory Tests': 'fa-solid fa-vial-circle-check',
    'Imaging Studies': 'fa-solid fa-x-ray',
    'Special Tests': 'fa-solid fa-stethoscope'
  }
  return map[cat] || 'fa-solid fa-file-lines'
}

// ============ LLM Integration ============

function buildTestOrderSystemPrompt() {
  return `你是一名临床辅助检查智能调度员。用户（医学生）会输入需要开具的检查项目，你的任务是：
1. 判断输入是否为合理的医疗检查申请——拦截完全无关、恶意或非医疗的输入
2. 将用户输入解析为具体的检查项目列表
3. 为每个检查项目生成完整的检查报告

报告生成规则（优先级递减）：
- 病例原始素材中已有该检查的明确结果 → 直接引用，保持原始格式
- 病例中有相关临床发现但无该检查的完整结果 → 基于病例中的临床信息（症状、体征、既往史等）整合出合理报告
- 病例中完全没有相关信息 → 生成正常范围的检查结果（需考虑患者既往史中的基础疾病可能带来的影响）

报告格式要求：
- 实验室检查：包含检查项目、标本类型、各项指标及结果值（带单位）、参考区间、异常标记
- 影像学检查：包含检查技术、影像所见（详细描述）、诊断意见
- 特殊检查：包含检查方法、检查所见、结论

请严格按以下JSON格式输出，不要包含其他内容：
{
  "valid": true/false,
  "reason": "如valid为false，说明原因",
  "tests": [
    {
      "name": "检查项目名称",
      "category": "实验室检查/影像学检查/特殊检查",
      "result": "完整的检查报告内容（纯文本，用换行分隔各部分）",
      "source": "case_material/case_context/generated"
    }
  ]
}`
}

function buildTestOrderUserMessage(inputText) {
  const basic = caseData.value.basic || {}
  const pi = basic.patient_info || {}
  const pe = basic.physical_exam || {}

  let ctx = ''
  ctx += `患者：${pi.name || '未知'}，${pi.sex === '1' || pi.sex === '男' ? '男' : '女'}，${pi.age || '未知'}\n`
  ctx += `主诉：${basic.chief_complaint || '无'}\n`
  ctx += `现病史：${basic.present_illness || '无'}\n`
  ctx += `既往史：${basic.past_history || '无'}\n`
  ctx += `个人史：${basic.personal_history || '无'}\n`
  ctx += `家族史：${basic.family_history || '无'}\n`
  ctx += `体格检查：${[pe.vital_signs, pe.general, pe.systemic].filter(Boolean).join('；') || '无'}\n`
  ctx += `\n【病例已有检查素材】\n`
  ctx += `实验室检查结果：\n${basic.lab_tests || '（无）'}\n\n`
  ctx += `影像学检查结果：\n${basic.imaging || '（无）'}\n\n`
  ctx += `特殊检查结果：\n${basic.special_exams || '（无）'}\n`
  ctx += `\n学员输入的检查申请：\n${inputText}`

  return ctx
}

function parseLLMResponse(content) {
  try {
    const json = JSON.parse(content)
    return json
  } catch {
    const match = content.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (match) {
      try { return JSON.parse(match[1].trim()) } catch { /* continue */ }
    }
    const braceMatch = content.match(/\{[\s\S]*"valid"[\s\S]*\}/)
    if (braceMatch) {
      try { return JSON.parse(braceMatch[0]) } catch { /* continue */ }
    }
    throw new Error('Unable to parse LLM response')
  }
}

async function submitOrder() {
  const input = orderText.value.trim()
  if (!input || processingOrder.value) return

  processingOrder.value = true

  try {
    const systemPrompt = buildTestOrderSystemPrompt()
    const userMessage = buildTestOrderUserMessage(input)

    const response = await sendLLMMessage(
      [{ role: 'user', content: userMessage }],
      systemPrompt,
      { temperature: 0.3, maxTokens: 4000, timeout: 45000 }
    )

    if (!response.ok) {
      showToast.value = true
      toastMessage.value = lang.value === 'zh' ? 'AI服务异常，请重试' : 'AI service error, please retry'
      setTimeout(() => { showToast.value = false }, 3000)
      return
    }

    const parsed = parseLLMResponse(response.content)

    if (!parsed || !parsed.valid) {
      showToast.value = true
      toastMessage.value = (parsed?.reason) || (lang.value === 'zh' ? '输入无法识别为有效的检查申请，请重新输入' : 'Cannot recognize as valid test order')
      setTimeout(() => { showToast.value = false }, 3500)
      return
    }

    if (!parsed.tests || parsed.tests.length === 0) {
      showToast.value = true
      toastMessage.value = lang.value === 'zh' ? '未识别到检查项目，请重新输入' : 'No test items recognized'
      setTimeout(() => { showToast.value = false }, 3000)
      return
    }

    const catLabelMap = {
      '实验室检查': lang.value === 'zh' ? '实验室检查' : 'Lab',
      '影像学检查': lang.value === 'zh' ? '影像学检查' : 'Imaging',
      '特殊检查': lang.value === 'zh' ? '特殊检查' : 'Special'
    }

    const newTests = parsed.tests.map(t => ({
      category: t.category || '实验室检查',
      categoryLabel: catLabelMap[t.category] || t.category || (lang.value === 'zh' ? '实验室检查' : 'Lab'),
      name: t.name || '未知检查',
      result: t.result || t.name || '',
      source: t.source || 'generated',
      submittedAt: new Date().toLocaleString('zh-CN')
    }))

    submittedTests.value.push(...newTests)
    orderText.value = ''
    justSubmitted.value = true
    syncAncillaryToSession()
    setTimeout(() => { justSubmitted.value = false }, 1200)

  } catch (e) {
    console.error('Order processing error:', e)
    showToast.value = true
    toastMessage.value = lang.value === 'zh' ? '处理失败，请重试' : 'Processing failed, please retry'
    setTimeout(() => { showToast.value = false }, 3000)
  } finally {
    processingOrder.value = false
  }
}

// ============ Session Persistence ============

function syncAncillaryToSession() {
  store.trainingSession = store.trainingSession || {}
  store.trainingSession.ancillaryTests = {
    results: submittedTests.value.map((t, i) => ({
      ...t,
      viewed: viewedSet.has(i)
    })),
    submittedAt: new Date().toISOString(),
    duration: elapsedSeconds.value
  }
  store.saveTrainingSession()
}

// ============ Report Display ============

function toggleReport(idx) {
  viewedSet.add(idx)
  const test = submittedTests.value[idx]
  if (!test) return

  reportTest.value = test
  reportImageLoaded.value = false
  reportImageSrc.value = ''

  const cleanName = test.name.replace(/[（(].*?[)）]/g, '').replace(/\s+/g, '')
  const imgPath = `/data/cases/${caseId.value}-tests/${cleanName}.png`
  reportImageSrc.value = imgPath
  reportImageLoaded.value = true

  showReport.value = true
}

function formatReportText(test) {
  if (!test) return ''
  const result = test.result || ''
  const cat = test.category || ''

  if (result.includes('：') && result.length > 30) return result

  if (cat === 'Laboratory Tests') {
    return formatLabReport(test)
  } else if (cat === 'Imaging Studies') {
    return formatImagingReport(test)
  } else if (cat === 'Special Tests') {
    return formatSpecialReport(test)
  }
  return result
}

function formatLabReport(test) {
  const result = test.result || test.name
  const lines = [
    '【检查项目】' + test.name,
    '【标本类型】静脉血',
    '【检查结果】',
  ]
  if (result.includes('正常') || result.includes('异常') || result.includes('增高') || result.includes('降低')) {
    lines.push(result)
  } else {
    lines.push(result)
    lines.push('')
    lines.push('【参考区间】详见各分项参考范围')
  }
  lines.push('')
  lines.push('【报告日期】' + new Date().toLocaleDateString('zh-CN'))
  lines.push('【检验医师】' + (lang.value === 'zh' ? '检验科' : 'Lab Dept.'))
  return lines.join('\n')
}

function formatImagingReport(test) {
  const result = test.result || test.name
  const lines = [
    '【检查项目】' + test.name,
    '【检查技术】' + (lang.value === 'zh' ? '详见扫描参数' : 'See scan parameters'),
    '【影像所见】',
    '  ' + result,
    '',
    '【诊断意见】',
    '  ' + (lang.value === 'zh' ? '结合临床病史及其他检查综合判断。' : 'Correlate with clinical history and other findings.'),
    '',
    '【报告日期】' + new Date().toLocaleDateString('zh-CN'),
    '【报告医师】' + (lang.value === 'zh' ? '影像科' : 'Radiology Dept.'),
  ]
  return lines.join('\n')
}

function formatSpecialReport(test) {
  const result = test.result || test.name
  const lines = [
    '【检查项目】' + test.name,
    '【检查所见】',
    '  ' + result,
    '',
    '【结论】',
    '  ' + (lang.value === 'zh' ? '详见上述检查所见。' : 'See findings above.'),
    '',
    '【报告日期】' + new Date().toLocaleDateString('zh-CN'),
    '【报告医师】' + (lang.value === 'zh' ? '检查科室' : 'Exam Dept.'),
  ]
  return lines.join('\n')
}

// ============ Navigation & Stage Completion ============

function submitTests() {
  if (submittedTests.value.length === 0) {
    showToast.value = true
    toastMessage.value = lang.value === 'zh' ? '请先申请检查并获取结果' : 'Please submit test orders first'
    setTimeout(() => { showToast.value = false }, 2500)
    return
  }
  showEndConfirm.value = true
}

function endStage() {
  showEndConfirm.value = false
  syncAncillaryToSession()

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
  if (submittedTests.value.length === 0) { next(); return }
  showEndConfirm.value = true
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
    if (ts.ancillaryTests.results?.length) {
      submittedTests.value = ts.ancillaryTests.results
      ts.ancillaryTests.results.forEach((r, i) => {
        if (r.viewed) viewedSet.add(i)
      })
    }
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

/* Results Upper — 50% */
.results-upper { flex: 1 1 50%; border-bottom: 1px solid #EBEEF5; display: flex; flex-direction: column; overflow: hidden; background: #fafbfc; min-height: 0; }
.results-upper-header { display: flex; align-items: center; justify-content: space-between; padding: 10px 16px; flex-shrink: 0; }
.results-upper-title { font-size: 14px; font-weight: 600; color: #303133; display: flex; align-items: center; gap: 8px; }
.results-upper-title i { color: #67C23A; }
.results-upper-count { font-size: 12px; color: #909399; background: #e5e7eb; padding: 2px 10px; border-radius: 10px; font-weight: 500; }
.results-grid { display: flex; flex-wrap: wrap; gap: 8px; padding: 4px 16px 12px; overflow-y: auto; align-content: flex-start; flex: 1; transition: background .3s; }
.results-grid.results-flash { animation: results-flash-anim .4s ease; }
@keyframes results-flash-anim { 0% { background: #ecf5ff; } 100% { background: transparent; } }
.result-icon-card { display: flex; flex-direction: column; align-items: center; width: 82px; padding: 10px 8px 8px; border: 1px solid #EBEEF5; border-radius: 10px; cursor: pointer; transition: all .18s; position: relative; background: #fff; flex-shrink: 0; }
.result-icon-card:hover { border-color: #409EFF; box-shadow: 0 2px 10px rgba(64,158,255,0.1); transform: translateY(-1px); }
.result-icon-card.viewed { background: #f0f9eb; border-color: #c6e6c0; }
.result-icon { width: 36px; height: 36px; border-radius: 50%; background: #ecf5ff; display: flex; align-items: center; justify-content: center; margin-bottom: 5px; font-size: 15px; color: #409EFF; transition: all .15s; }
.result-icon-card.viewed .result-icon { background: #e1f3d8; color: #67C23A; }
.result-icon-name { font-size: 11px; font-weight: 500; color: #303133; text-align: center; line-height: 1.35; word-break: break-all; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; max-width: 100%; }
.result-icon-cat { font-size: 9px; color: #C0C4CC; margin-top: 2px; }
.result-icon-badge { position: absolute; top: -3px; right: -3px; font-size: 9px; font-weight: 700; padding: 1px 5px; border-radius: 6px; }
.result-icon-badge.new { background: #F56C6C; color: #fff; animation: badge-pulse 1.5s ease infinite; }
@keyframes badge-pulse { 0%, 100% { opacity: 1; } 50% { opacity: .65; } }
.results-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px 20px; color: #C0C4CC; gap: 10px; font-size: 13px; flex: 1; }
.results-empty i { font-size: 32px; opacity: .5; }

/* Input Lower — 50% */
.input-lower { flex: 1 1 50%; display: flex; flex-direction: column; overflow: hidden; min-height: 0; background: #fff; }
.input-lower-header { display: flex; align-items: center; justify-content: space-between; padding: 10px 16px 6px; flex-shrink: 0; }
.input-lower-title { font-size: 14px; font-weight: 600; color: #303133; display: flex; align-items: center; gap: 8px; }
.input-lower-title i { color: #409EFF; }
.input-lower-hint { font-size: 11px; color: #C0C4CC; }
.input-lower-body { flex: 1; display: flex; flex-direction: column; padding: 0 16px 12px; overflow: hidden; min-height: 0; }

.order-textarea { flex: 1; width: 100%; border: 1.5px dashed #DCDFE6; border-radius: 10px; padding: 12px 14px; font-size: 13px; line-height: 1.7; resize: none; font-family: inherit; color: #303133; background: #fafbfc; transition: border-color .2s, box-shadow .2s; outline: none; box-sizing: border-box; }
.order-textarea:focus { border-color: #409EFF; border-style: solid; box-shadow: 0 0 0 2px rgba(64,158,255,0.08); background: #fff; }
.order-textarea::placeholder { color: #C0C4CC; font-size: 12px; line-height: 1.6; }
.order-textarea:disabled { background: #f5f7fa; color: #909399; }

.input-actions { display: flex; align-items: center; justify-content: space-between; padding: 10px 0 0; flex-shrink: 0; border-top: 1px solid #f0f0f0; margin-top: auto; }
.processing-hint { font-size: 12px; color: #409EFF; display: flex; align-items: center; gap: 6px; }
.processing-hint i { font-size: 13px; }
.matched-count { font-size: 12px; color: #409EFF; font-weight: 500; }
.matched-count.empty { visibility: hidden; }

/* Report Modal */
.report-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 9000; display: flex; align-items: center; justify-content: center; }
.report-modal { background: #fff; border-radius: 14px; width: min(640px, 92vw); max-height: 85vh; display: flex; flex-direction: column; box-shadow: 0 12px 48px rgba(0,0,0,0.18); overflow: hidden; }
.report-modal-header { display: flex; align-items: center; gap: 10px; padding: 16px 20px; border-bottom: 1px solid #EBEEF5; flex-shrink: 0; }
.report-modal-title { font-size: 16px; font-weight: 600; color: #303133; display: flex; align-items: center; gap: 8px; }
.report-modal-title i { color: #409EFF; }
.report-modal-cat { font-size: 12px; color: #909399; background: #f0f0f0; padding: 3px 10px; border-radius: 10px; }
.report-modal-close { margin-left: auto; border: none; background: none; cursor: pointer; font-size: 18px; color: #909399; padding: 4px; border-radius: 6px; transition: all .15s; }
.report-modal-close:hover { color: #303133; background: #f0f0f0; }
.report-modal-body { flex: 1; overflow-y: auto; padding: 0; }

.report-image-wrap { padding: 16px 20px; display: flex; flex-direction: column; align-items: center; }
.report-image { max-width: 100%; max-height: 60vh; object-fit: contain; border-radius: 6px; border: 1px solid #EBEEF5; }
.report-image-caption { font-size: 12px; color: #909399; margin-top: 10px; }

.report-text-wrap { padding: 20px 24px; }
.report-text-header { margin-bottom: 16px; }
.report-text-hospital { font-size: 16px; font-weight: 700; color: #303133; text-align: center; margin-bottom: 8px; }
.report-text-title { font-size: 15px; font-weight: 600; color: #303133; text-align: center; margin-bottom: 12px; }
.report-text-meta { display: flex; flex-wrap: wrap; gap: 16px; font-size: 12px; color: #606266; justify-content: center; }
.report-text-divider { height: 1px; background: #303133; margin: 14px 0 18px; opacity: 0.4; }
.report-text-content { font-size: 13px; line-height: 1.9; color: #303133; white-space: pre-wrap; word-break: break-all; font-family: inherit; margin: 0; }

.modal-fade-enter-active { transition: all .25s ease; }
.modal-fade-leave-active { transition: all .2s ease; }
.modal-fade-enter-from { opacity: 0; }
.modal-fade-enter-from .report-modal { transform: scale(0.95); }
.modal-fade-leave-to { opacity: 0; }

/* Toast */
.app-toast { position: fixed; top: 72px; left: 50%; transform: translateX(-50%); background: #fff; color: #303133; padding: 10px 20px; border-radius: 10px; font-size: 14px; box-shadow: 0 4px 24px rgba(0,0,0,0.12); z-index: 9999; cursor: pointer; display: flex; align-items: center; gap: 8px; border-left: 4px solid #E6A23C; }
.app-toast i { color: #E6A23C; font-size: 15px; }
.toast-fade-enter-active { transition: all .25s ease; }
.toast-fade-leave-active { transition: all .2s ease; }
.toast-fade-enter-from { opacity: 0; transform: translateX(-50%) translateY(-10px); }
.toast-fade-leave-to { opacity: 0; transform: translateX(-50%) translateY(-6px); }

.btn { padding: 10px 20px; border-radius: 8px; cursor: pointer; font-size: 14px; border: 1px solid #DCDFE6; background: #fff; color: #606266; display: inline-flex; align-items: center; gap: 6px; transition: all .15s; }
.btn:hover { border-color: #409EFF; color: #409EFF; }
.btn-primary { background: #409EFF; border-color: #409EFF; color: #fff; }
.btn-primary:hover { background: #337ecc; color: #fff; }
.btn-primary:disabled { background: #a0cfff; border-color: #a0cfff; cursor: not-allowed; }

/* Scrollbar */
.results-grid::-webkit-scrollbar { width: 4px; }
.results-grid::-webkit-scrollbar-thumb { background: #d9dce0; border-radius: 3px; }
.results-grid::-webkit-scrollbar-thumb:hover { background: #c0c4cc; }
</style>
