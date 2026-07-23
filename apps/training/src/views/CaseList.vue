<template>
  <div class="case-list-page">
    <div class="page-content">
      <div class="filter-bar">
        <div class="filter-search" data-reviewable="搜索框">
          <i class="fa-solid fa-magnifying-glass s-icon"></i>
          <input type="text" v-model="searchQuery" :placeholder="lang === 'zh' ? '搜索病例名称/编号/病种...' : 'Search case name/ID/disease...'">
        </div>
        <select v-model="difficultyFilter" data-reviewable="难度筛选">
          <option value="">{{ lang === 'zh' ? '全部阶段' : 'All Phases' }}</option>
          <option value="U">{{ lang === 'zh' ? '院校教育' : 'Undergraduate' }}</option>
          <option value="R">{{ lang === 'zh' ? '住培' : 'Residency' }}</option>
          <option value="F">{{ lang === 'zh' ? '专培' : 'Fellowship' }}</option>
        </select>
        <select v-model="statusFilter" data-reviewable="学习状态筛选">
          <option value="">{{ lang === 'zh' ? '全部状态' : 'All Status' }}</option>
          <option value="not_trained">{{ lang === 'zh' ? '未学习' : 'Not Learned' }}</option>
          <option value="trained">{{ lang === 'zh' ? '已学习' : 'Learned' }}</option>
        </select>
        <button class="btn btn-sm" @click="doReset" data-reviewable="重置" :style="{background: hasActiveFilters ? '#fef2f2' : '#fff', color: hasActiveFilters ? '#ef4444' : '#6b7280', border: '1px solid ' + (hasActiveFilters ? '#fecaca' : '#d1d5db'), padding:'4px 12px', borderRadius:'6px', cursor:'pointer', fontSize:'13px'}">
          <i class="fa-solid fa-rotate-left"></i> {{ lang === 'zh' ? '重置' : 'Reset' }}
        </button>
        <button v-if="currentSpecialty" class="btn btn-sm" @click="showSpecModal = true" style="margin-left:auto;background:var(--primary);color:#fff;border:none;padding:4px 12px;border-radius:6px;cursor:pointer;font-size:13px;flex-shrink:0;" data-reviewable="切换专业">
          <i class="fa-solid fa-sync"></i> {{ currentSpecialty }} · {{ lang === 'zh' ? '切换' : 'Switch' }}
        </button>
        <button v-else class="btn btn-sm" @click="showSpecModal = true" style="margin-left:auto;background:var(--primary);color:#fff;border:none;padding:4px 12px;border-radius:6px;cursor:pointer;font-size:13px;flex-shrink:0;" data-reviewable="选择专业">
          <i class="fa-solid fa-folder-plus"></i> {{ lang === 'zh' ? '选择专业' : 'Select Specialty' }}
        </button>
      </div>
      <div class="active-filters" v-if="hasActiveFilters">
        <span class="filter-badge" v-if="difficultyFilter">
          {{ lang === 'zh' ? '阶段' : 'Phase' }}: {{ phaseLabel(difficultyFilter) }}
          <i class="fa-solid fa-xmark" @click="difficultyFilter = ''" style="cursor:pointer;margin-left:4px"></i>
        </span>
        <span class="filter-badge" v-if="statusFilter">
          {{ lang === 'zh' ? '状态' : 'Status' }}: {{ statusFilter === 'trained' ? (lang === 'zh' ? '已学习' : 'Learned') : (lang === 'zh' ? '未学习' : 'Unlearned') }}
          <i class="fa-solid fa-xmark" @click="statusFilter = ''" style="cursor:pointer;margin-left:4px"></i>
        </span>
        <span class="filter-badge" v-if="searchQuery.trim()">
          {{ lang === 'zh' ? '搜索' : 'Search' }}: "{{ searchQuery }}"
          <i class="fa-solid fa-xmark" @click="searchQuery = ''" style="cursor:pointer;margin-left:4px"></i>
        </span>
        <span style="font-size:11px;color:#9ca3af;margin-left:8px">{{ filteredCases.length }} {{ lang === 'zh' ? '条结果' : 'results' }}</span>
      </div>

      <div v-if="loading" class="empty-state">
        <i class="fa-solid fa-spinner fa-spin"></i>
        <p>{{ lang === 'zh' ? '加载病例列表...' : 'Loading cases...' }}</p>
      </div>

      <div v-else-if="loadError" class="empty-state" style="color:#F56C6C;">
        <i class="fa-solid fa-triangle-exclamation"></i>
        <p>{{ loadError }}</p>
        <button class="btn" style="margin-top:12px;padding:6px 16px;border-radius:6px;cursor:pointer;" @click="fetchCases">{{ lang === 'zh' ? '重试' : 'Retry' }}</button>
      </div>

      <template v-else>
        <div class="case-grid">
          <div class="case-card" v-for="c in paginatedCases" :key="c.id" @click="viewDetail(c)" data-reviewable="病例卡片">
            <div class="case-card-photo" data-reviewable="患者头像">
              <img v-if="c.patient.photo" :src="c.patient.photo" class="card-patient-img" />
              <span v-else class="photo-placeholder"><i class="fa-solid fa-user"></i></span>
            </div>
            <div class="case-card-body">
              <div class="cc-row cc-row-1">
                <span class="cc-name">{{ c.patient.name }}</span>
                <span class="cc-badge" :class="c.status === 'trained' ? 'badge-learned' : 'badge-unlearned'">
                  {{ c.status === 'trained' ? (lang === 'zh' ? '已学习' : 'Learned') : (lang === 'zh' ? '未学习' : 'Unlearned') }}
                </span>
              </div>
              <div class="cc-row cc-row-2">
                <span class="cc-id">{{ c.id }}</span>
                <span class="cc-diff" :class="'diff-' + (c.difficulty || 'R1')[0]">{{ getDifficultyLabel(c.difficulty) }}</span>
                <span class="cc-case-level" :class="'cl-' + getCaseLevel(c.difficulty)">{{ getCaseLevelLabel(c.difficulty) }}</span>
              </div>
              <div class="cc-row cc-row-3">
                <span>{{ c.patient.gender }} · {{ c.patient.age }}{{ lang === 'zh' ? '岁' : 'y' }} · {{ c.specialty }}</span>
              </div>
              <div class="cc-row cc-row-4">
                <span class="cc-symptom-tag" v-for="s in (c.symptoms || [])" :key="s">{{ s }}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="empty-state" v-if="paginatedCases.length === 0 && !loading">
          <i class="fa-solid fa-folder-open"></i>
          <p>{{ lang === 'zh' ? '暂无匹配的病例' : 'No matching cases found' }}</p>
        </div>
        <div class="pagination" v-if="totalPages > 1">
          <button class="page-btn" :disabled="currentPage === 1" @click="currentPage = 1"><i class="fa-solid fa-angles-left"></i></button>
          <button class="page-btn" :disabled="currentPage === 1" @click="currentPage--"><i class="fa-solid fa-angle-left"></i></button>
          <button class="page-btn" v-for="p in visiblePages" :key="p" :class="{ active: p === currentPage }" @click="currentPage = p">{{ p }}</button>
          <button class="page-btn" :disabled="currentPage === totalPages" @click="currentPage++"><i class="fa-solid fa-angle-right"></i></button>
          <button class="page-btn" :disabled="currentPage === totalPages" @click="currentPage = totalPages"><i class="fa-solid fa-angles-right"></i></button>
          <div class="page-jump">
            <span>{{ lang === 'zh' ? '跳至' : 'Go to' }}</span>
            <input type="number" v-model.number="jumpPage" @keyup.enter="doJump" min="1" :max="totalPages">
            <span>{{ lang === 'zh' ? '页' : 'Page' }}</span>
          </div>
        </div>
      </template>
    </div>

    <!-- 断点续训弹窗（不可关闭，必须二选一） -->
    <div class="resume-overlay" v-if="showResumeModal && resumeInfo">
      <div class="resume-modal">
        <div class="resume-modal-icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
        <h2>{{ lang === 'zh' ? '检测到未完成的训练' : 'Unfinished Training Detected' }}</h2>
        <div class="resume-modal-info">
          <p><strong>{{ lang === 'zh' ? '病例：' : 'Case: ' }}</strong>{{ resumeInfo.caseId }}</p>
          <p><strong>{{ lang === 'zh' ? '中断于：' : 'Interrupted at: ' }}</strong>{{ resumeInfo.stationName || resumeInfo.currentStationId }}</p>
          <p v-if="resumeInfo.startedAt"><strong>{{ lang === 'zh' ? '开始时间：' : 'Started: ' }}</strong>{{ new Date(resumeInfo.startedAt).toLocaleString() }}</p>
        </div>
        <div class="resume-modal-actions">
          <button class="btn-resume-continue" @click="handleResume" :disabled="resumeLoading">
            <i class="fa-solid fa-spinner fa-spin" v-if="resumeLoading"></i>
            <i class="fa-solid fa-play" v-else></i>
            {{ lang === 'zh' ? '继续训练' : 'Continue Training' }}
          </button>
          <button class="btn-resume-settle" @click="handleSettle" :disabled="resumeLoading">
            <i class="fa-solid fa-spinner fa-spin" v-if="resumeLoading"></i>
            <i class="fa-solid fa-check-double" v-else></i>
            {{ lang === 'zh' ? '结束训练并结算成绩' : 'End & Settle Scores' }}
          </button>
        </div>
      </div>
    </div>

    <div class="spec-modal-overlay" v-if="showSpecModal" @click.self="showSpecModal = false" style="z-index:500;">
      <div class="spec-modal">
        <div class="spec-modal-header">
          <span class="spec-modal-title">{{ lang === 'zh' ? '选择专业' : 'Select Specialty' }}</span>
          <div class="phase-selector">
            <div class="phase-dot-wrap">
              <div class="phase-dot" :class="{ active: specPhase === 'R' }" @click="specPhase = 'R'">
                <span class="dot"></span>
                <span>{{ lang === 'zh' ? '住培' : 'Residency' }}</span>
              </div>
              <div class="phase-dot" :class="{ active: specPhase === 'F' }" @click="specPhase = 'F'">
                <span class="dot"></span>
                <span>{{ lang === 'zh' ? '专培' : 'Fellowship' }}</span>
              </div>
            </div>
          </div>
          <button class="spec-modal-close" @click="showSpecModal = false"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="spec-btn-grid">
          <div class="spec-btn" v-for="spec in filteredSpecialties" :key="spec.id"
               @click="selectSpecialty(spec)">
            <div style="font-size:20px;margin-bottom:4px;"><i :class="'fa-solid ' + spec.icon"></i></div>
            <div>{{ lang === 'zh' ? spec.name : spec.en }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTrainingStore } from '@/stores/training'
import { useCaseLoader } from '@/composables/useCaseLoader'
import { matchPatientImage } from '@/composables/usePatientImage'
import { getDifficultyLabel, getCaseLevel, getCaseLevelLabel } from '@ai-sp/shared'

const route = useRoute()
const router = useRouter()
const store = useTrainingStore()
const { loadCaseIndex } = useCaseLoader()

const lang = ref(store.lang || 'zh')
const searchQuery = ref('')
const difficultyFilter = ref('')
const statusFilter = ref('')
const currentPage = ref(1)
const jumpPage = ref(1)
const pageSize = 12
const showSpecModal = ref(false)
const specPhase = ref('R')
const allCasesData = ref([])
const loading = ref(false)
const loadError = ref('')
const showResumeModal = ref(false)
const resumeInfo = ref(null)
const resumeLoading = ref(false)

// 专业列表
const allSpecialties = [
  { id: '内科', name: '内科', en: 'Internal Medicine', icon: 'fa-heart-pulse', phase: 'R' },
  { id: '外科', name: '外科', en: 'Surgery', icon: 'fa-suitcase-medical', phase: 'R' },
  { id: '儿科', name: '儿科', en: 'Pediatrics', icon: 'fa-child', phase: 'R' },
  { id: '急诊科', name: '急诊科', en: 'Emergency', icon: 'fa-truck-medical', phase: 'R' },
  { id: '精神科', name: '精神科', en: 'Psychiatry', icon: 'fa-brain', phase: 'R' },
  { id: '全科', name: '全科', en: 'General Practice', icon: 'fa-stethoscope', phase: 'R' },
  { id: '皮肤科', name: '皮肤科', en: 'Dermatology', icon: 'fa-hand-dots', phase: 'R' },
  { id: '神经内科', name: '神经内科', en: 'Neurology', icon: 'fa-brain', phase: 'R' },
  { id: '康复医学科', name: '康复医学科', en: 'Rehabilitation', icon: 'fa-person-walking', phase: 'R' },
  { id: '重症医学科', name: '重症医学科', en: 'ICU', icon: 'fa-bed-pulse', phase: 'R' },
  { id: '骨科', name: '骨科', en: 'Orthopedics', icon: 'fa-bone', phase: 'R' },
  { id: '儿外科', name: '儿外科', en: 'Pediatric Surgery', icon: 'fa-baby', phase: 'R' },
  { id: '妇产科', name: '妇产科', en: 'OB/GYN', icon: 'fa-person-pregnant', phase: 'R' },
  { id: '麻醉科', name: '麻醉科', en: 'Anesthesiology', icon: 'fa-syringe', phase: 'R' },
  { id: '眼科', name: '眼科', en: 'Ophthalmology', icon: 'fa-eye', phase: 'R' },
  { id: '耳鼻咽喉科', name: '耳鼻咽喉科', en: 'ENT', icon: 'fa-ear-listen', phase: 'R' },
  { id: '口腔全科', name: '口腔全科', en: 'General Dentistry', icon: 'fa-tooth', phase: 'R' },
  { id: '放射肿瘤科', name: '放射肿瘤科', en: 'Radiation Oncology', icon: 'fa-ribbon', phase: 'R' },
  { id: '医学遗传科', name: '医学遗传科', en: 'Medical Genetics', icon: 'fa-dna', phase: 'R' },
  { id: '预防医学科', name: '预防医学科', en: 'Preventive Medicine', icon: 'fa-shield-virus', phase: 'R' },
]

const filteredSpecialties = computed(() =>
  allSpecialties.filter(s => s.phase === specPhase.value)
)

const currentSpecialty = computed(() => route.params.specialty || store.specialty || '')

const hasActiveFilters = computed(() =>
  !!(searchQuery.value.trim() || difficultyFilter.value || statusFilter.value)
)

function getTrainingStatus(caseId) {
  return store.getCaseTrainingStatus(caseId)
}

const allCases = computed(() =>
  allCasesData.value.map(c => {
    const gender = c.patient_gender || ''
    const age = c.patient_age || ''
    const preg = c.patient_pregnancy || ''
    return {
      id: c.id,
      title: c.title,
      specialty: c.specialty,
      disease: c.disease,
      difficulty: c.difficulty || c.training_phase || '',
      phase: c.training_phase || '',
      source: c.source || '平台',
      chiefComplaint: c.chief_complaint || '',
      symptoms: c.symptoms || [],
      status: getTrainingStatus(c.id),
      patient: {
        name: c.patient_name || '',
        gender,
        age,
        photo: matchPatientImage({ gender, age, isPregnant: preg }, 'patient'),
      }
    }
  })
)

const filteredCases = computed(() => {
  let list = allCases.value

  // 按专业过滤
  if (currentSpecialty.value) {
    list = list.filter(c => c.specialty === currentSpecialty.value)
  }

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase()
    list = list.filter(c =>
      (c.title || '').toLowerCase().indexOf(q) >= 0 ||
      (c.id || '').toLowerCase().indexOf(q) >= 0 ||
      (c.disease || '').toLowerCase().indexOf(q) >= 0 ||
      (c.chiefComplaint || '').toLowerCase().indexOf(q) >= 0
    )
  }
  if (difficultyFilter.value) {
    list = list.filter(c => {
      const tp = c.phase || c.difficulty || ''
      return tp.startsWith(difficultyFilter.value)
    })
  }
  if (statusFilter.value) {
    list = list.filter(c => c.status === statusFilter.value)
  }
  return list
})

const totalPages = computed(() =>
  Math.ceil(filteredCases.value.length / pageSize) || 1
)

const paginatedCases = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredCases.value.slice(start, start + pageSize)
})

const visiblePages = computed(() => {
  const pages = []
  const total = totalPages.value
  const current = currentPage.value
  let start = Math.max(1, current - 2)
  let end = Math.min(total, current + 2)
  if (end - start < 4) {
    if (start === 1) end = Math.min(total, start + 4)
    else start = Math.max(1, end - 4)
  }
  for (let i = start; i <= end; i++) pages.push(i)
  return pages
})

function phaseLabel(p) {
  const map = { U: '院校教育', R: '住培', F: '专培' }
  return map[p] || p
}

function doReset() {
  searchQuery.value = ''
  difficultyFilter.value = ''
  statusFilter.value = ''
  currentPage.value = 1
}

function doJump() {
  if (jumpPage.value >= 1 && jumpPage.value <= totalPages.value) {
    currentPage.value = jumpPage.value
  }
}

function viewDetail(c) {
  store.currentCase = c
  router.push({ name: 'caseDetail', params: { caseId: c.id } })
}

function selectSpecialty(spec) {
  store.setSpecialty(spec.id)
  showSpecModal.value = false
  currentPage.value = 1
  router.push({ name: 'caseList', params: { specialty: spec.id } })
}

async function fetchCases() {
  loading.value = true
  loadError.value = ''
  try {
    const data = await loadCaseIndex()
    allCasesData.value = data || []
  } catch (e) {
    loadError.value = lang.value === 'zh' ? '加载病例失败：' + e.message : 'Failed to load cases: ' + e.message
  } finally {
    loading.value = false
  }
}

watch([searchQuery, difficultyFilter, statusFilter], () => { currentPage.value = 1 })

onMounted(() => {
  if (route.params.specialty) {
    store.setSpecialty(route.params.specialty)
  }
  specPhase.value = store.phase === 'specialist' ? 'F' : 'R'
  fetchCases()
  if (!currentSpecialty.value) {
    showSpecModal.value = true
  }
  // 检测未完成训练
  const flow = store.loadActiveFlow()
  if (flow && flow.caseId) {
    const elapsed = Date.now() - new Date(flow.startedAt).getTime()
    if (elapsed <= 24 * 60 * 60 * 1000) {
      resumeInfo.value = {
        caseId: flow.caseId,
        stationName: flow.currentStationId || flow.stationName || '',
        startedAt: flow.startedAt,
        stationFlow: flow.stationFlow,
        stationScheme: flow.stationScheme,
        currentStationId: flow.currentStationId
      }
      showResumeModal.value = true
    }
  }
})

// ── 断点续训处理 ──
function handleResume() {
  if (!resumeInfo.value) return
  resumeLoading.value = true
  const flow = resumeInfo.value
  // 恢复考站流程状态
  if (flow.stationFlow) {
    store.stationFlow = flow.stationFlow
    store.stationScheme = flow.stationScheme
    store.currentFlowIndex = flow.stationFlow.currentIndex || 0
  }
  router.push({ name: 'caseDetail', params: { caseId: flow.caseId }, query: { resume: '1' } })
}

async function handleSettle() {
  if (!resumeInfo.value) return
  const caseId = resumeInfo.value.caseId

  // 立即关闭弹窗，清除活跃流程，不影响前端操作
  showResumeModal.value = false
  store.clearActiveFlow()

  // 后台结算（fire-and-forget，静默完成）
  const ts = store.trainingSession || {}
  const STATION_KEYS = ['historyTaking', 'physicalExam', 'medicalRecord', 'preliminaryDiag', 'treatmentPlan', 'analysis', 'humanity', 'mentalExam']
  const stations = []
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
      hasData: !!(data && (data.messages?.length > 0 || data.answers?.length > 0 || data.content)),
      parsedSheet: parsedSheet || [],
      records: data ? { dialog: data.messages || [], exam: data.examHistory || [], qa: [], freeText: data.notes ? [{ text: data.notes }] : [] } : {}
    })
  }

  const hasAnyData = stations.some(s => s.hasData)
  if (hasAnyData) {
    fetch('/api/training/settle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseId, caseInfo: { case_id: caseId }, stations })
    }).catch(() => { /* 静默 */ })
  }

  resumeInfo.value = null
  resumeLoading.value = false
}
</script>

<style scoped>
.active-filters {
  display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
  padding: 8px 0; margin-bottom: 8px;
}
.filter-badge {
  display: inline-flex; align-items: center; gap: 2px;
  font-size: 11px; padding: 3px 10px; border-radius: 12px;
  background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe;
}
.filter-badge i { font-size: 9px; }
.filter-badge i:hover { color: #ef4444; }
.case-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 14px;
}
.case-card {
  display: flex;
  gap: 16px;
  padding: 18px;
  cursor: pointer;
  border-radius: 14px;
  border: 1px solid #eee;
  transition: all .2s;
  background: #fff;
}
.case-card:hover {
  box-shadow: 0 4px 16px rgba(0,0,0,0.08);
  border-color: #d1d5db;
}
.case-card-photo {
  flex-shrink: 0;
  width: 108px;
}
.case-card-photo img, .card-patient-img {
  border-radius: 50%;
  width: 108px;
  height: 108px;
  object-fit: cover;
  border: none;
}
.photo-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 108px;
  height: 108px;
  border-radius: 50%;
  background: #f5f7fa;
  color: #C0C4CC;
  font-size: 36px;
}
.case-card-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  justify-content: center;
}
.cc-row {
  display: flex;
  align-items: center;
}
.cc-row-1 { gap: 6px; }
.cc-name {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}
.cc-badge {
  display: inline-block;
  font-size: 9px;
  padding: 0 6px;
  border-radius: 8px;
  line-height: 1.6;
  font-weight: 500;
  white-space: nowrap;
}
.badge-learned { background: #e8f5e9; color: #2e7d32; }
.badge-unlearned { background: #fff3e0; color: #e65100; }
.cc-row-2 { gap: 8px; }
.cc-id {
  font-size: 10px;
  color: #999;
  max-width: 110px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cc-disease {
  font-size: 10px;
  color: #67C23A;
  background: #f0f9eb;
  padding: 1px 6px;
  border-radius: 4px;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cc-diff {
  display: inline-block;
  font-size: 9px;
  font-weight: 600;
  padding: 0 5px;
  border-radius: 3px;
  line-height: 1.6;
}
.cc-diff.diff-U {
  background: #e8f5e9; color: #2e7d32;
}
.cc-diff.diff-R {
  background: #e3f2fd; color: #1565c0;
}
.cc-diff.diff-F {
  background: #fce4ec; color: #c62828;
  font-weight: 700;
}
.cc-case-level {
  display: inline-block;
  font-size: 9px;
  font-weight: 500;
  padding: 0 5px;
  border-radius: 3px;
  line-height: 1.6;
}
.cc-case-level.cl-basic { background: #e8f5e9; color: #2e7d32; }
.cc-case-level.cl-advanced { background: #fff3e0; color: #e65100; }
.cc-case-level.cl-difficult { background: #fce4ec; color: #c62828; }
.cc-row-3 {
  font-size: 11px;
  color: #666;
}
.cc-row-4 {
  gap: 4px;
  flex-wrap: wrap;
}
.cc-symptom-tag {
  display: inline-block;
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 4px;
  background: #f0f5ff;
  color: #409eff;
  white-space: nowrap;
}
.cc-row-5 {
  font-size: 11px;
  color: #555;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 模态复用原版样式 */
.spec-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; }
.spec-modal { background: #fff; border-radius: 16px; padding: 28px; max-width: 720px; width: 90%; max-height: 80vh; overflow-y: auto; }
.spec-modal-header { display: flex; align-items: center; margin-bottom: 20px; gap: 16px; }
.spec-modal-title { font-size: 18px; font-weight: 600; color: #303133; }
.phase-selector { display: flex; align-items: center; }
.phase-dot-wrap { display: flex; gap: 12px; }
.phase-dot { display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 13px; color: #909399; padding: 4px 10px; border-radius: 12px; transition: all .15s; }
.phase-dot .dot { width: 8px; height: 8px; border-radius: 50%; background: #DCDFE6; }
.phase-dot.active { color: #409EFF; background: #ecf5ff; }
.phase-dot.active .dot { background: #409EFF; }
.spec-modal-close { margin-left: auto; background: none; border: none; font-size: 18px; color: #909399; cursor: pointer; }
.spec-btn-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 10px; }
.spec-btn { text-align: center; padding: 12px 8px; border-radius: 12px; cursor: pointer; transition: all .15s; border: 1px solid #EBEEF5; color: #606266; }
.spec-btn:hover { border-color: #409EFF; color: #409EFF; background: #ecf5ff; }

.page-content { padding: 16px 24px; }
.filter-bar { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-bottom: 12px; }
.filter-search { position: relative; flex: 1; min-width: 200px; }
.filter-search .s-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #C0C4CC; font-size: 14px; }
.filter-search input { width: 100%; padding: 6px 12px 6px 34px; border: 1px solid #DCDFE6; border-radius: 8px; font-size: 13px; outline: none; box-sizing: border-box; }
.filter-search input:focus { border-color: #409EFF; }
select { padding: 6px 10px; border: 1px solid #DCDFE6; border-radius: 8px; font-size: 13px; background: #fff; outline: none; }
select:focus { border-color: #409EFF; }

.empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 0; color: #C0C4CC; }
.empty-state i { font-size: 48px; margin-bottom: 12px; }
.empty-state p { font-size: 14px; margin: 0; }

.pagination { display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 20px; }
.page-btn { padding: 4px 10px; border: 1px solid #DCDFE6; border-radius: 6px; background: #fff; cursor: pointer; font-size: 13px; color: #606266; }
.page-btn:disabled { opacity: .4; cursor: not-allowed; }
.page-btn.active { background: #409EFF; border-color: #409EFF; color: #fff; }
.page-jump { display: flex; align-items: center; gap: 4px; font-size: 13px; color: #909399; margin-left: 12px; }
.page-jump input { width: 50px; padding: 4px 6px; border: 1px solid #DCDFE6; border-radius: 4px; text-align: center; font-size: 13px; }

/* 断点续训弹窗（不可关闭） */
.resume-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.55); z-index: 9999;
  display: flex; align-items: center; justify-content: center;
}
.resume-modal {
  background: #fff; border-radius: 16px; padding: 40px 48px;
  max-width: 500px; width: 90%; text-align: center;
  box-shadow: 0 16px 64px rgba(0,0,0,0.25);
}
.resume-modal-icon {
  width: 64px; height: 64px; border-radius: 50%;
  background: #E6A23C; color: #fff; font-size: 28px;
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 20px;
}
.resume-modal h2 {
  margin: 0 0 16px; font-size: 20px; font-weight: 700; color: #303133;
}
.resume-modal-info {
  text-align: left; background: #f5f7fa; border-radius: 10px;
  padding: 14px 18px; margin-bottom: 24px; font-size: 13px; color: #606266;
}
.resume-modal-info p { margin: 6px 0; }
.resume-modal-info strong { color: #303133; margin-right: 4px; }
.resume-modal-actions {
  display: flex; flex-direction: column; gap: 10px;
}
.btn-resume-continue, .btn-resume-settle {
  width: 100%; padding: 12px 24px; border-radius: 10px; border: none;
  font-size: 15px; font-weight: 600; cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  transition: all .15s;
}
.btn-resume-continue {
  background: #409EFF; color: #fff;
}
.btn-resume-continue:hover { background: #337ecc; }
.btn-resume-settle {
  background: #fff; color: #E6A23C; border: 2px solid #E6A23C;
}
.btn-resume-settle:hover { background: #fef0f0; }
.btn-resume-continue:disabled, .btn-resume-settle:disabled {
  opacity: 0.6; cursor: not-allowed;
}
</style>
