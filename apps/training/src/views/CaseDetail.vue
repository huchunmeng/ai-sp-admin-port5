<template>
  <div class="case-detail-page" :class="{ 'mdt-mode': isFromMDT }">
    <div class="detail-content">
      <!-- MDT 布局 -->
      <template v-if="isFromMDT && mdtCase">
        <div class="mdt-layout">
          <!-- 顶部患者信息条 -->
          <div class="mdt-patient-bar">
            <div class="mdt-bar-avatar">
              <img v-if="c.patient.avatar" :src="c.patient.avatar" />
              <span v-else>{{ (c.patient.name || '?').charAt(0) }}</span>
            </div>
            <div class="mdt-bar-info">
              <div class="mdt-bar-name-row">
                <span class="mdt-bar-name">{{ c.patient.name }}</span>
                <span class="mdt-bar-diff">{{ mdtCase.levelLabel }}</span>
                <span class="mdt-bar-phase">{{ mdtCase.teachingPhase }}</span>
              </div>
              <div class="mdt-bar-meta">
                <span><i class="fa-solid fa-venus-mars"></i> {{ c.patient.gender }}</span>
                <span class="mdt-bar-sep">·</span>
                <span>{{ c.patient.age }}岁</span>
                <span class="mdt-bar-sep">·</span>
                <span class="mdt-bar-disciplines">
                  <i v-for="d in mdtCase.disciplines" :key="d" :class="disciplineIcon(d)" :title="d"></i>
                  {{ mdtCase.disciplines.join(' / ') }}
                </span>
              </div>
            </div>
          </div>

          <!-- 页签 -->
          <div class="mdt-tabs">
            <button v-for="(tab, ti) in mdtTabs" :key="ti"
              :class="['mdt-tab', { active: mdtActiveTab === ti }]"
              @click="mdtActiveTab = ti">
              <i :class="tab.icon"></i> {{ tab.label }}
            </button>
          </div>

          <!-- 滚动内容区 -->
          <div class="mdt-scroll-area">
            <!-- Tab 0: 临床概览 -->
            <div class="mdt-tab-content" v-if="mdtActiveTab === 0">
              <div class="section-card">
                <div class="section-title"><i class="fa-solid fa-file-medical"></i> 临床摘要</div>
                <p>{{ mdtCase.clinicalSummary }}</p>
              </div>
              <div class="section-card">
                <div class="section-title"><i class="fa-solid fa-circle-question"></i> 关键讨论问题</div>
                <div class="mdt-question-list">
                  <div class="mdt-question-item" v-for="(q, qi) in mdtCase.keyQuestions" :key="qi">
                    <span class="mdt-q-num">{{ qi + 1 }}</span>
                    <span>{{ q }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Tab 1: 学科视角 -->
            <div class="mdt-tab-content" v-if="mdtActiveTab === 1">
              <div class="mdt-perspective-list">
                <div class="mdt-perspective-item" v-for="(dp, dpi) in mdtCase.disciplinePerspectives" :key="dpi">
                  <div class="mdt-perspective-header">
                    <span class="mdt-perspective-icon"><i :class="disciplineIcon(dp.dept)"></i></span>
                    <span class="mdt-perspective-dept">{{ dp.dept }}</span>
                  </div>
                  <p class="mdt-perspective-text">{{ dp.view }}</p>
                </div>
              </div>
            </div>

            <!-- Tab 2: 讨论议程 -->
            <div class="mdt-tab-content" v-if="mdtActiveTab === 2">
              <div class="section-card mdt-info-card">
                <div class="section-title"><i class="fa-solid fa-circle-info"></i> MDT讨论信息</div>
                <div class="mdt-info-grid">
                  <div class="mdt-info-item">
                    <div class="mdt-info-icon" style="background:#ecf5ff;color:#409EFF;"><i class="fa-solid fa-users"></i></div>
                    <div>
                      <div class="mdt-info-label">参与学科</div>
                      <div class="mdt-info-value">{{ mdtCase.disciplines.join('、') }}</div>
                    </div>
                  </div>
                  <div class="mdt-info-item">
                    <div class="mdt-info-icon" style="background:#eff6ff;color:#3b82f6;"><i class="fa-solid fa-signal"></i></div>
                    <div>
                      <div class="mdt-info-label">难度等级</div>
                      <div class="mdt-info-value">{{ mdtCase.levelLabel }} ({{ mdtCase.teachingPhase }})</div>
                    </div>
                  </div>
                  <div class="mdt-info-item mdt-info-full">
                    <div class="mdt-info-icon" style="background:#fef3c7;color:#d97706;"><i class="fa-solid fa-bullseye"></i></div>
                    <div>
                      <div class="mdt-info-label">学习目标</div>
                      <div class="mdt-info-value">{{ mdtCase.objective }}</div>
                    </div>
                  </div>
                </div>
              </div>
              <div class="section-card">
                <div class="section-title"><i class="fa-solid fa-list-ol"></i> 讨论流程</div>
                <div class="mdt-agenda-list">
                  <div class="mdt-agenda-item" v-for="(ag, agi) in mdtCase.discussionAgenda" :key="agi">
                    <div class="mdt-agenda-phase">
                      <span class="mdt-agenda-num">{{ agi + 1 }}</span>
                      <span class="mdt-agenda-name">{{ ag.phase }}</span>
                      <span class="mdt-agenda-dur">{{ ag.duration }}</span>
                    </div>
                    <p class="mdt-agenda-desc">{{ ag.desc }}</p>
                  </div>
                </div>
              </div>
              <div class="section-card">
                <div class="section-title"><i class="fa-solid fa-book-open"></i> 参考指南与文献</div>
                <div class="mdt-ref-list">
                  <div class="mdt-ref-item" v-for="(ref, ri) in mdtCase.references" :key="ri">
                    <i class="fa-solid fa-file-lines"></i> {{ ref }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 底部固定操作栏 -->
          <div class="mdt-action-bar">
            <button class="mdt-cta-btn" @click="goMDTDiscussion" v-if="mdtCase">
              <i class="fa-solid fa-users"></i> 进入MDT讨论
            </button>
            <button class="mdt-records-btn" @click="viewRecords">
              <i class="fa-solid fa-clock-rotate-left"></i> 训练记录
            </button>
          </div>
        </div>
      </template>

      <!-- 非MDT: 原始双栏布局 -->
      <template v-else>
        <div class="detail-two-col">
          <div class="detail-left-col">
            <div class="fullbody-photo">
              <img v-if="c.patient.fullBodyImage" :src="c.patient.fullBodyImage" class="fullbody-img" />
              <div v-else class="photo-placeholder">
                <i class="fa-solid fa-user" style="font-size:64px;"></i>
                <div>{{ lang === 'zh' ? '暂无全身照' : 'No photo' }}</div>
              </div>
            </div>
          </div>
          <div class="detail-right-col">
            <div class="patient-info-card">
              <div class="patient-header">
                <div class="patient-avatar">
                  <img v-if="c.patient.avatar" :src="c.patient.avatar" />
                  <span v-else>{{ c.patient.name ? c.patient.name.charAt(0) : '?' }}</span>
                </div>
                <div>
                  <div class="case-id-line" style="font-size:11px;color:#999;margin-bottom:2px;">{{ c.id }}</div>
                  <div class="patient-name-row">
                    <span class="patient-name">{{ c.patient.name }}</span>
                    <span class="tag tag-primary">{{ diffLabel(c.difficulty) }}</span>
                    <span class="tag" :class="'tag-case-level tag-' + getCaseLevel(c.difficulty)">{{ getCaseLevelLabel(c.difficulty) }}</span>
                  </div>
                  <div class="patient-detail-row">
                    <span><i class="fa-solid fa-venus-mars"></i> {{ c.patient.gender }}</span>
                    <span><i class="fa-solid fa-calendar"></i> {{ c.patient.age }}{{ lang === 'zh' ? '岁' : 'y' }}</span>
                    <span v-if="c.specialty"><i class="fa-solid fa-stethoscope"></i> {{ c.specialty }}</span>
                  </div>
                </div>
              </div>
              <div class="vital-signs" v-if="c.vitals && Object.keys(c.vitals).length">
                <div class="vital-card" v-for="(val, key) in c.vitals" :key="key">
                  <div class="vital-value">{{ val }}</div>
                  <div class="vital-label">{{ vitalLabels[key] || key }}</div>
                </div>
              </div>
            </div>

            <div class="section-card" v-if="c.symptoms && c.symptoms.length">
              <div class="section-title"><i class="fa-solid fa-list-check"></i> {{ lang === 'zh' ? '症状' : 'Symptoms' }}</div>
              <div class="symptom-tags">
                <span class="tag tag-warning" v-for="s in c.symptoms" :key="s">{{ s }}</span>
              </div>
            </div>

            <div class="detail-actions" data-reviewable="页面操作区">
              <button class="btn btn-primary btn-lg" @click="startTraining" data-reviewable="开始训练">
                <i class="fa-solid fa-play"></i> {{ lang === 'zh' ? '开始训练' : 'Start Training' }}
              </button>
              <button v-if="showFullFlowBtn" class="btn btn-workflow btn-lg" @click="startWorkflow" data-reviewable="全流程训练">
                <i class="fa-solid fa-diagram-project"></i> {{ lang === 'zh' ? '全流程训练' : 'Full Workflow' }}
              </button>
              <button class="btn btn-lg" @click="viewRecords" data-reviewable="我的训练记录">
                <i class="fa-solid fa-clock-rotate-left"></i> {{ lang === 'zh' ? '我的训练记录' : 'My Training Records' }}
              </button>
            </div>
          </div>
        </div>
      </template>

      <div class="station-select-overlay" v-if="showStationModal" @click.self="showStationModal = false">
        <div class="station-select-modal">
          <div class="station-select-modal-header">
            <h3>{{ lang === 'zh' ? '请选择考站进行训练' : 'Please Select Training Station' }}</h3>
            <button class="station-select-modal-close" @click="showStationModal = false">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
          <div class="station-select-case-info">
            <i class="fa-solid fa-circle-info" style="color:#409EFF;"></i>
            <span style="font-size:13px;color:#606266;">
              {{ lang === 'zh' ? '当前病例：' : 'Current Case: ' }}<strong>{{ c.title || c.id }}</strong>
            </span>
          </div>
          <div class="station-btn-grid">
            <div class="station-btn" v-for="s in availableStations" :key="s.name" @click="selectStation(s)">
              <div style="font-size:28px;margin-bottom:8px;"><i :class="'fa-solid ' + (s.icon || 'fa-stethoscope')"></i></div>
              <div>{{ lang === 'zh' ? s.name : (s.nameEn || s.name) }}</div>
              <div style="font-size:11px;color:#909399;margin-top:4px;">{{ s.duration }}{{ lang === 'zh' ? '分钟' : 'min' }}</div>
            </div>
          </div>
        </div>
      </div>

      <TrainingRecords v-if="showRecordsModal" :caseId="c.id" :versionFilter="recordsVersionFilter" @close="handleCloseRecords" @viewReport="handleViewReport" />

      <!-- 人文沟通场景选择弹窗 -->
      <div class="station-select-overlay" v-if="showScenarioModal" @click.self="showScenarioModal = false">
        <div class="station-select-modal">
          <div class="station-select-modal-header">
            <h3>{{ lang === 'zh' ? '请选择沟通场景' : 'Select Communication Scenario' }}</h3>
            <button class="station-select-modal-close" @click="showScenarioModal = false">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
          <div class="station-select-case-info">
            <i class="fa-solid fa-circle-info" style="color:#409EFF;"></i>
            <span style="font-size:13px;color:#606266;">
              {{ lang === 'zh' ? '当前病例：' : 'Current Case: ' }}<strong>{{ c.patient.name }} · {{ c.chiefComplaint }}</strong>
            </span>
          </div>
          <div class="scenario-select-grid" v-if="humanityScenarios.length > 0">
            <div v-for="sc in humanityScenarios" :key="sc.scenario_id"
                 class="scenario-card" :class="{ core: sc.priority === 'core' }"
                 @click="selectHumanityScenario(sc)">
              <div class="scenario-card-header">
                <span class="sc-card-star" v-if="sc.priority === 'core'">★</span>
                <span class="sc-card-name">{{ sc.scenario_name }}</span>
                <span class="sc-card-badge" v-if="sc.communication_target === 'family'">{{ lang === 'zh' ? '家属沟通' : 'Family' }}</span>
                <span class="sc-card-badge patient" v-else>{{ lang === 'zh' ? '患者沟通' : 'Patient' }}</span>
              </div>
              <div class="sc-card-desc">{{ sc.sp_materials?.role_description || '' }}</div>
              <div class="sc-card-task" v-if="sc.candidate_materials?.task">
                <i class="fa-solid fa-clipboard-check"></i> {{ sc.candidate_materials.task }}
              </div>
              <div class="sc-card-meta">
                <span v-if="sc.candidate_materials?.time_limit"><i class="fa-solid fa-clock"></i> {{ sc.candidate_materials.time_limit }}min</span>
                <span v-if="sc.sp_materials?.psychological_stages?.length">{{ sc.sp_materials.psychological_stages.length }}{{ lang === 'zh' ? '个心理阶段' : ' stages' }}</span>
              </div>
            </div>
          </div>
          <div class="scenario-select-empty" v-else>
            <i class="fa-solid fa-circle-exclamation" style="font-size:32px;color:#E6A23C;"></i>
            <p>{{ lang === 'zh' ? '该病例暂无沟通场景数据' : 'No communication scenario data for this case.' }}</p>
            <button class="scenario-back-btn" @click="showScenarioModal = false">{{ lang === 'zh' ? '返回考站选择' : 'Back to Station Selection' }}</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTrainingStore } from '@/stores/training'
import { useCaseLoader } from '@/composables/useCaseLoader'
import { useStationFlow } from '@/composables/useStationFlow'
import { BUILTIN_STATIONS, getDifficultyLabel, getCaseLevel, getCaseLevelLabel } from '@ai-sp/shared'
import { matchPatientImage } from '@/composables/usePatientImage'
import { useTTS } from '@/composables/useTTS'
import { parseVitals } from '@/composables/useUtils'
import { getMDTCase, disciplineIcon } from '@/composables/useMDTData'
import TrainingRecords from '@/views/TrainingRecords.vue'

const route = useRoute()
const router = useRouter()
const store = useTrainingStore()
const { loadCase } = useCaseLoader()
const { loadStations, stations, STATION_ROUTE_MAP } = useStationFlow()
const tts = useTTS()

const lang = ref(store.lang || 'zh')
const showStationModal = ref(false)
const showScenarioModal = ref(false)
const showRecordsModal = ref(false)
const settling = ref(false)
const caseData = ref({ basic: null })

// 版本分支
const isV1 = computed(() => store.appVersion === '1.0')
const showFullFlowBtn = computed(() => store.appVersion === '2.0')
const recordsVersionFilter = computed(() => isV1.value ? ['1.0'] : ['2.0', 'full-flow'])

// MDT 流程
const isFromMDT = computed(() => route.query.from === 'mdt')
const mdtCase = computed(() => {
  const mdtId = route.query.mdtId
  return mdtId ? getMDTCase(mdtId) : null
})
const mdtActiveTab = ref(0)
const mdtTabs = [
  { label: '临床概览', icon: 'fa-solid fa-file-medical' },
  { label: '学科视角', icon: 'fa-solid fa-microscope' },
  { label: '讨论议程', icon: 'fa-solid fa-list-ol' },
]

function goMDTDiscussion() {
  router.push({ name: 'mdtDiscussion', params: { caseId: c.value.id }, query: { mdtId: route.query.mdtId } })
}

const humanityScenarios = computed(() => caseData.value.humanity?.scenarios || [])

const c = computed(() => {
  const mdt = mdtCase.value
  const basic = caseData.value.basic
  if (!basic) {
    // MDT fallback: use MDT case data for patient info
    if (mdt) {
      return {
        id: mdt.id,
        title: mdt.patientName + ' · ' + mdt.disciplines[0],
        difficulty: mdt.teachingPhase,
        specialty: mdt.disciplines[0],
        disease: '',
        patient: {
          name: mdt.patientName,
          gender: mdt.gender,
          age: String(mdt.age),
          avatar: matchPatientImage({ gender: mdt.gender, age: mdt.age }, 'patient'),
          fullBodyImage: matchPatientImage({ gender: mdt.gender, age: mdt.age }, 'full'),
        },
        chiefComplaint: mdt.chiefComplaint,
        symptoms: mdt.disciplines,
        vitals: {}
      }
    }
    const mc = store.currentCase || {}
    const g = mc.patient?.sex || mc.patient_gender || ''
    const a = mc.patient?.age || mc.patient_age || ''
    const preg = mc.patient?.pregnancy || mc.patient_pregnancy || ''
    return {
      id: mc.id || route.params.caseId || '',
      title: mc.title || '',
      difficulty: mc.difficulty || '',
      specialty: mc.specialty || '',
      disease: mc.disease || '',
      patient: {
        name: mc.patient?.name || mc.patient_name || '',
        gender: g,
        age: a,
        avatar: matchPatientImage({ gender: g, age: a, isPregnant: preg }, 'patient'),
        fullBodyImage: matchPatientImage({ gender: g, age: a, isPregnant: preg }, 'full'),
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
  // MDT mode: overlay MDT-specific content on real patient image
  if (mdt) {
    return {
      id: mdt.id,
      title: mdt.patientName + ' · ' + mdt.disciplines[0],
      difficulty: mdt.teachingPhase,
      specialty: mdt.disciplines[0],
      disease: basic.disease || '',
      patient: {
        name: pi.name || mdt.patientName,
        gender,
        age: ageStr,
        avatar: matchPatientImage({ gender, age: ageNum, isPregnant: preg }, 'patient'),
        fullBodyImage: matchPatientImage({ gender, age: ageNum, isPregnant: preg }, 'full'),
      },
      chiefComplaint: mdt.chiefComplaint,
      symptoms: mdt.disciplines,
      vitals: parseVitals(basic.physical_exam?.vital_signs),
    }
  }
  return {
    id: basic.case_id || caseData.value.caseId || '',
    title: basic.title || '',
    difficulty: basic.teaching_phase || '',
    specialty: basic.specialty || '',
    disease: basic.disease || '',
    patient: {
      name: pi.name || '',
      gender,
      age: ageStr,
      avatar: matchPatientImage({ gender, age: ageNum, isPregnant: preg }, 'patient'),
      fullBodyImage: matchPatientImage({ gender, age: ageNum, isPregnant: preg }, 'full'),
    },
    chiefComplaint: basic.chief_complaint || '',
    symptoms: basic.symptoms || [],
    vitals: parseVitals(basic.physical_exam?.vital_signs),
  }
})

const availableStations = computed(() => {
  if (stations.value.length > 0) return stations.value
  // 回退默认考站
  return [
    { name: '接诊病人站', duration: 15, routeName: 'historyTaking', icon: 'fa-user-doctor' },
    { name: '临床思维站', duration: 15, routeName: 'caseAnalysis', icon: 'fa-magnifying-glass-chart' },
    { name: '交流沟通站', duration: 15, routeName: 'humanisticComm', icon: 'fa-comments' },
  ]
})

const vitalLabels = { temp: '体温', pulse: '脉搏', rr: '呼吸', bp: '血压', spo2: 'SpO₂' }

function diffLabel(d) {
  if (!d) return ''
  if (lang.value !== 'zh') return d
  return getDifficultyLabel(d)
}

async function startTraining() {
  tts.unlock()
  store.currentCase = c.value
  store.resetForNewSession(c.value.id)

  // 1.0 模式：直接进入病史采集
  if (isV1.value) {
    store.trainingVersion = '1.0'
    store.startStationFlow(BUILTIN_STATIONS['1.0'].stations)
    router.push({ name: 'historyTaking', query: { caseId: c.value.id } })
    return
  }

  // 2.0 模式：显示考站选择弹窗
  store.trainingVersion = '2.0'
  const specialty = c.value.specialty
  if (specialty) {
    await loadStations(specialty)
  }
  showStationModal.value = true
}

function startWorkflow() {
  tts.unlock()
  store.currentCase = c.value
  store.resetForNewSession(c.value.id)
  store.trainingVersion = 'full-flow'

  const workflowStations = BUILTIN_STATIONS['full-flow'].stations
  store.startStationFlow(workflowStations)
  router.push({ name: 'stationLoading', query: { caseId: c.value.id, target: 'historyTaking' } })
}

async function selectStation(s) {
  store.currentCase = c.value
  store.resetForNewSession(c.value.id)
  store.trainingVersion = '2.0'

  const routeName = s.routeName || STATION_ROUTE_MAP[s.name]?.route || 'historyTaking'

  // 设置为单站流程（只含选中站）
  const singleStation = [{
    name: s.name,
    routeName,
    projects: s.projects || [],
    duration: s.duration || 15
  }]
  store.startStationFlow(singleStation)

  if (routeName === 'humanisticComm') {
    showStationModal.value = false
    showScenarioModal.value = true
    return
  }

  router.push({ name: 'stationLoading', query: { caseId: c.value.id, target: routeName } })
}

async function selectHumanityScenario(sc) {
  store.currentCase = c.value
  store.resetForNewSession(c.value.id)
  showScenarioModal.value = false
  router.push({ name: 'stationLoading', query: { caseId: c.value.id, target: 'humanisticComm', scenarioId: sc.scenario_id } })
}

function viewRecords() {
  showRecordsModal.value = true
}

function handleViewReport() {
  showRecordsModal.value = false
  router.push({ name: 'scoreReport', query: { caseId: c.value.id, source: 'records', stationId: store.currentRecord?.stationId, recordedAt: store.currentRecord?.recordedAt, sessionEpoch: store.currentRecord?.sessionEpoch || store.sessionEpoch } })
}

function handleCloseRecords() {
  showRecordsModal.value = false
}

// ── 断点续训 ──
async function handleResumeTraining() {
  const flow = store.loadActiveFlow()
  if (!flow) return
  const caseId = flow.caseId || c.value.id
  store.currentCase = c.value
  if (flow.stationFlow) {
    store.stationFlow = flow.stationFlow
    store.stationScheme = flow.stationScheme
    store.currentFlowIndex = flow.stationFlow.currentIndex || 0
  }
  const mapped = STATION_ROUTE_MAP[flow.currentStationId]
  const routeName = mapped?.route || 'historyTaking'
  if (routeName) {
    router.push({ name: routeName, query: { caseId, resume: '1' } })
  } else {
    await loadStations(c.value.specialty || store.specialty)
    showStationModal.value = true
  }
}

async function handleSettleTraining() {
  settling.value = true
  try {
    const caseId = c.value.id
    const ts = store.trainingSession || {}
    const stations = []
    const STATION_KEYS = ['historyTaking', 'physicalExam', 'medicalRecord', 'preliminaryDiag', 'treatmentPlan', 'analysis', 'humanity', 'mentalExam']
    for (const sid of STATION_KEYS) {
      const data = ts[sid]
      let parsedSheet = null
      try {
        parsedSheet = sessionStorage.getItem(`aisp_parsed_scoresheet_${caseId}_${sid}`)
        if (!parsedSheet) parsedSheet = sessionStorage.getItem(`aisp_parsed_scoresheet_${caseId}`)
        if (parsedSheet) parsedSheet = JSON.parse(parsedSheet)
      } catch (e) { /* ignore */ }
      stations.push({
        stationId: sid,
        stationName: sid,
        hasData: !!data && (data.messages?.length > 0 || data.answers?.length > 0 || data.content),
        parsedSheet: parsedSheet || [],
        records: data ? { dialog: data.messages || [], exam: data.examHistory || [], qa: [], freeText: data.notes ? [{ text: data.notes }] : [] } : {}
      })
    }
    const resp = await fetch('/api/training/settle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseId, caseInfo: { case_id: caseId }, stations })
    })
    const json = await resp.json()
    if (json.ok) {
      const reportData = json.data
      store.clearActiveFlow()
      store.currentRecord = { caseId, stationId: 'settled', stationName: lang.value === 'zh' ? '结算' : 'Settled', score: reportData.totalScore || 0, time: new Date().toLocaleString() }
      router.push({ name: 'scoreReport', query: { caseId, source: 'training' } })
    } else {
      alert(json.error || (lang.value === 'zh' ? '结算失败' : 'Settlement failed'))
    }
  } catch (e) {
    console.error('[CaseDetail] settle failed:', e)
    alert(lang.value === 'zh' ? '结算失败，请重试' : 'Settlement failed, please retry')
  } finally {
    settling.value = false
  }
}

onMounted(async () => {
  // MDT模式锁定body滚动，防止视口滚动条切换导致宽度跳动
  if (isFromMDT.value) {
    document.body.style.overflow = 'hidden'
  }

  const caseId = route.params.caseId || store.currentCase?.id
  if (!caseId) return

  const data = await loadCase(caseId)
  if (data) {
    caseData.value = data
    const specialty = data.basic?.specialty || store.currentCase?.specialty
    if (specialty) {
      await loadStations(specialty)
    }
  }

  if (route.query.settle === '1') {
    return handleSettleTraining()
  }
  if (route.query.resume === '1') {
    return handleResumeTraining()
  }
})

onUnmounted(() => {
  document.body.style.overflow = ''
})
</script>

<style scoped>
.case-detail-page { height: calc(100vh - 96px); }
.detail-content { padding: 24px; max-width: 1200px; margin: 0 auto; flex: 1; overflow: hidden; width: 100%; display: flex; flex-direction: column; }
.case-detail-page.mdt-mode .detail-content { padding: 18px 24px 12px; }


/* ─── MDT 单栏布局 ─── */
.mdt-layout {
  display: flex; flex-direction: column; flex: 1;
  max-width: 860px; margin: 0 auto; width: 100%;
}

/* ─── MDT 患者信息条 ─── */
.mdt-patient-bar {
  display: flex; align-items: center; gap: 14px;
  padding: 16px 20px; margin-bottom: 14px;
  background: #fff; border-radius: 12px; border: 1px solid #e5e7eb;
  flex-shrink: 0;
}
.mdt-bar-avatar {
  width: 44px; height: 44px; border-radius: 50%;
  background: #409EFF; color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 18px; font-weight: 700; flex-shrink: 0; overflow: hidden;
}
.mdt-bar-avatar img { width: 44px; height: 44px; border-radius: 50%; object-fit: cover; }
.mdt-bar-info { flex: 1; min-width: 0; }
.mdt-bar-name-row { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.mdt-bar-name { font-size: 16px; font-weight: 700; color: #1f2937; }
.mdt-bar-diff {
  font-size: 11px; font-weight: 600; padding: 1px 8px; border-radius: 4px;
  background: #ecf5ff; color: #409EFF;
}
.mdt-bar-phase {
  font-size: 10px; color: #9ca3af; font-weight: 500;
  background: #f3f4f6; padding: 1px 6px; border-radius: 3px;
}
.mdt-bar-meta { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #6b7280; }
.mdt-bar-meta span { display: flex; align-items: center; gap: 4px; }
.mdt-bar-sep { color: #d1d5db; }
.mdt-bar-disciplines { color: #374151; }
.mdt-bar-disciplines i { color: #409EFF; font-size: 12px; }

/* ─── MDT Tabs ─── */
.mdt-tabs {
  display: flex; gap: 2px; margin-bottom: 14px;
  background: #f0f2f5; border-radius: 10px; padding: 4px;
  flex-shrink: 0;
}
.mdt-tab {
  flex: 1; padding: 9px 14px; border-radius: 8px; border: none;
  background: transparent; cursor: pointer; font-size: 13px; font-family: inherit;
  color: #6b7280; font-weight: 500; transition: all .18s;
  display: flex; align-items: center; justify-content: center; gap: 5px;
}
.mdt-tab:hover { color: #374151; background: rgba(255,255,255,0.5); }
.mdt-tab.active {
  background: #fff; color: #409EFF; font-weight: 600;
  box-shadow: 0 1px 4px rgba(0,0,0,0.07);
}
.mdt-tab-content { animation: tabFadeIn .2s ease; }
@keyframes tabFadeIn { from { opacity: 0; } to { opacity: 1; } }

/* ─── MDT 滚动内容区 ─── */
.mdt-scroll-area { flex: 1; overflow-y: auto; overflow-x: hidden; scrollbar-gutter: stable; }

/* ─── 非MDT双栏 ─── */
.detail-two-col { display: flex; gap: 24px; flex: 1; overflow: hidden; }
.detail-left-col { flex: 0 0 480px; display: flex; flex-direction: column; }
.detail-right-col { flex: 1; min-width: 0; }

.detail-left-col .fullbody-photo {
  border-radius: 12px; overflow: hidden; flex: 1; min-height: 0;
}
.detail-left-col .fullbody-photo .fullbody-img {
  width: 100%; height: 100%;
  object-fit: contain; object-position: top center;
  border-radius: 12px; display: block;
}
.photo-placeholder {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  width: 100%; min-height: 240px; border-radius: 12px; background: #f5f7fa; color: #C0C4CC;
}
.mdt-action-bar {
  flex-shrink: 0; background: #fff;
  padding: 14px 0 10px; border-top: 1px solid #e5e7eb;
  display: flex; gap: 12px; align-items: center;
}
.mdt-cta-btn {
  flex: 1; padding: 10px 24px; border-radius: 8px; cursor: pointer;
  font-size: 14px; font-weight: 600; font-family: inherit;
  background: #409EFF; border: 1px solid #409EFF; color: #fff;
  display: flex; align-items: center; justify-content: center; gap: 7px;
  transition: all .15s;
}
.mdt-cta-btn:hover { background: #337ecc; border-color: #337ecc; }
.mdt-records-btn {
  flex: 1; padding: 10px 20px; border-radius: 8px; cursor: pointer;
  font-size: 14px; font-family: inherit;
  background: #fff; border: 1px solid #dcdfe6; color: #606266;
  display: flex; align-items: center; justify-content: center; gap: 6px;
  transition: all .15s;
}
.mdt-records-btn:hover { border-color: #409EFF; color: #409EFF; }

/* ─── Patient Info ─── */
.patient-info-card { background: #fff; border-radius: 12px; padding: 18px; border: 1px solid #e5e7eb; }
.patient-header { display: flex; align-items: center; gap: 12px; }
.patient-avatar { width: 48px; height: 48px; border-radius: 50%; background: #409EFF; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 600; flex-shrink: 0; overflow: hidden; }
.patient-avatar img { width: 48px; height: 48px; border-radius: 50%; object-fit: cover; }
.patient-name-row { display: flex; align-items: center; gap: 8px; margin-bottom: 3px; }
.patient-name { font-size: 16px; font-weight: 700; color: #1f2937; }
.patient-detail-row { display: flex; gap: 14px; font-size: 12px; color: #6b7280; }
.patient-detail-row span { display: flex; align-items: center; gap: 4px; }
.vital-signs { display: flex; gap: 10px; margin-top: 16px; flex-wrap: wrap; }
.vital-card { flex: 1; min-width: 80px; text-align: center; padding: 8px 4px; border-radius: 8px; background: #f5f7fa; }
.vital-value { font-size: 15px; font-weight: 700; color: #303133; margin-bottom: 2px; }
.vital-label { font-size: 11px; color: #909399; }

.section-card { background: #fff; border-radius: 10px; padding: 16px 18px; border: 1px solid #e5e7eb; margin-bottom: 10px; transition: border-color .15s; }
.section-card:hover { border-color: #d1d5db; }
.section-title { font-size: 14px; font-weight: 600; color: #1f2937; margin-bottom: 10px; display: flex; align-items: center; gap: 7px; }
.section-title i { color: #409EFF; font-size: 14px; width: 16px; text-align: center; }
.section-card p { margin: 0; font-size: 13px; color: #4b5563; line-height: 1.75; }
.symptom-tags { display: flex; gap: 6px; flex-wrap: wrap; }
.tag { display: inline-block; padding: 3px 10px; border-radius: 5px; font-size: 11px; font-weight: 500; }
.tag-primary { background: #ecf5ff; color: #409EFF; }
.tag-warning { background: #fdf6ec; color: #E6A23C; }
.tag-case-level { font-size: 10px; }
.tag-basic { background: #e8f5e9; color: #2e7d32; }
.tag-advanced { background: #fff3e0; color: #e65100; }
.tag-difficult { background: #fce4ec; color: #c62828; }

.detail-actions { display: flex; gap: 12px; }
.btn { padding: 10px 20px; border-radius: 8px; cursor: pointer; font-size: 14px; border: 1px solid #DCDFE6; background: #fff; color: #606266; display: inline-flex; align-items: center; gap: 6px; transition: all .15s; font-family: inherit; }
.btn:hover { border-color: #409EFF; color: #409EFF; }
.btn-primary { background: #409EFF; border-color: #409EFF; color: #fff; }
.btn-primary:hover { background: #337ecc; color: #fff; }
.btn-workflow { background: #10B981; border-color: #10B981; color: #fff; }
.btn-workflow:hover { background: #059669; border-color: #059669; color: #fff; }
.btn-lg { padding: 12px 28px; font-size: 15px; }

/* ─── MDT Info Card ─── */
.mdt-info-card { background: #f8fafd; border-color: #d1e3fa; }
.mdt-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.mdt-info-grid > * { min-width: 0; }
.mdt-info-item { display: flex; gap: 10px; align-items: flex-start; }
.mdt-info-item > div { min-width: 0; overflow: hidden; }
.mdt-info-icon {
  width: 34px; height: 34px; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; flex-shrink: 0;
}
.mdt-info-label { font-size: 11px; color: #9ca3af; margin-bottom: 1px; }
.mdt-info-value { font-size: 13px; color: #374151; font-weight: 500; line-height: 1.4; overflow-wrap: break-word; }
.mdt-info-full { grid-column: 1 / -1; }

/* ─── MDT Rich Content ─── */
.mdt-question-list { display: flex; flex-direction: column; gap: 8px; }
.mdt-question-item {
  display: flex; gap: 10px; align-items: baseline; font-size: 13px; color: #374151;
  line-height: 1.65; padding: 12px 14px; background: #f9fafb; border-radius: 8px;
  border-left: 3px solid #409EFF; transition: background .15s;
}
.mdt-question-item:hover { background: #eff6ff; }
.mdt-q-num {
  width: 20px; height: 20px; border-radius: 50%; background: #409EFF;
  color: #fff; font-size: 11px; font-weight: 600;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px;
}

.mdt-perspective-list { display: flex; flex-direction: column; gap: 10px; }
.mdt-perspective-item {
  border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px 18px;
  background: #fff; border-left: 4px solid #409EFF;
  transition: box-shadow .15s, border-color .15s;
}
.mdt-perspective-item:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
.mdt-perspective-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.mdt-perspective-icon {
  width: 30px; height: 30px; border-radius: 7px;
  background: #ecf5ff; color: #409EFF;
  display: flex; align-items: center; justify-content: center;
  font-size: 13px; flex-shrink: 0;
}
.mdt-perspective-dept { font-size: 14px; font-weight: 600; color: #1f2937; }
.mdt-perspective-text { font-size: 13px; color: #4b5563; line-height: 1.7; margin: 0; }

.mdt-agenda-list { display: flex; flex-direction: column; gap: 2px; }
.mdt-agenda-item { display: flex; flex-direction: column; padding: 12px 14px; border-radius: 8px; position: relative; }
.mdt-agenda-item:not(:last-child)::after {
  content: ''; position: absolute; left: 12px; top: 42px; bottom: -2px;
  width: 2px; background: #e5e7eb; border-radius: 1px;
}
.mdt-agenda-phase { display: flex; align-items: center; gap: 10px; }
.mdt-agenda-num {
  width: 26px; height: 26px; border-radius: 7px;
  background: #ecf5ff; color: #409EFF; font-size: 12px; font-weight: 700;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  border: 2px solid #a3c9f5;
}
.mdt-agenda-name { font-size: 14px; font-weight: 600; color: #1f2937; }
.mdt-agenda-dur { font-size: 11px; color: #9ca3af; margin-left: auto; background: #f3f4f6; padding: 2px 8px; border-radius: 4px; white-space: nowrap; }
.mdt-agenda-desc { font-size: 12px; color: #6b7280; margin: 2px 0 0 36px; line-height: 1.5; overflow-wrap: break-word; }

.mdt-ref-list { display: flex; flex-direction: column; gap: 5px; }
.mdt-ref-item {
  font-size: 12px; color: #4b5563; display: flex; align-items: center; gap: 8px;
  padding: 7px 10px; border-radius: 6px; background: #f9fafb; border: 1px solid #f3f4f6;
  transition: background .15s; overflow-wrap: break-word; min-width: 0;
}
.mdt-ref-item:hover { background: #eff6ff; }
.mdt-ref-item i { color: #409EFF; font-size: 11px; flex-shrink: 0; }

/* ─── Modals (shared) ─── */
.station-select-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 2000;
  display: flex; align-items: center; justify-content: center;
}
.station-select-modal {
  background: #fff; border-radius: 14px; width: 680px; max-width: 95vw; max-height: 90vh;
  overflow-y: auto; box-shadow: 0 12px 48px rgba(0,0,0,0.2); padding: 28px 32px;
}
.station-select-modal-header {
  display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;
}
.station-select-modal-header h3 { font-size: 18px; font-weight: 700; color: #303133; margin: 0; }
.station-select-modal-close {
  width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
  border-radius: 50%; cursor: pointer; color: #909399; font-size: 18px; border: none;
  background: none; transition: all .15s;
}
.station-select-modal-close:hover { background: #f0f2f5; color: #303133; }
.station-select-case-info {
  padding: 12px 16px; background: #f0f2f5; border-radius: 8px; margin-bottom: 20px;
  display: flex; align-items: center; gap: 8px;
}
.station-btn-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.station-btn { text-align: center; padding: 20px 12px; border-radius: 12px; cursor: pointer; border: 2px solid #EBEEF5; transition: all .15s; color: #606266; }
.station-btn:hover { border-color: #409EFF; color: #409EFF; background: #ecf5ff; }

.scenario-select-grid { display: flex; flex-direction: column; gap: 12px; }
.scenario-card { padding: 16px 20px; border-radius: 10px; cursor: pointer; border: 2px solid #EBEEF5; transition: all .15s; text-align: left; }
.scenario-card:hover { border-color: #409EFF; background: #ecf5ff; }
.scenario-card.core { border-color: #E6A23C; background: #fef9f0; }
.scenario-card.core:hover { border-color: #E6A23C; background: #fef3e0; }
.scenario-card-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.sc-card-star { color: #E6A23C; font-size: 14px; }
.sc-card-name { font-size: 15px; font-weight: 700; color: #303133; }
.sc-card-badge { font-size: 10px; padding: 2px 6px; border-radius: 4px; background: #ecf5ff; color: #409EFF; }
.sc-card-badge.patient { background: #f0f9eb; color: #67C23A; }
.sc-card-desc { font-size: 12px; color: #606266; line-height: 1.6; margin-bottom: 8px; }
.sc-card-task { font-size: 12px; color: #409EFF; margin-bottom: 8px; display: flex; align-items: center; gap: 4px; }
.sc-card-meta { display: flex; gap: 16px; font-size: 11px; color: #909399; }
.scenario-select-empty { text-align: center; padding: 40px 20px; color: #909399; }
.scenario-select-empty p { margin: 12px 0; }
.scenario-back-btn { padding: 8px 20px; border-radius: 8px; background: #409EFF; color: #fff; border: none; font-size: 14px; cursor: pointer; }
</style>
