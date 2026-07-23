<template>
  <div class="page">
    <div class="filter-bar">
      <div class="search-row">
        <div class="search-box">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input v-model="searchQuery" placeholder="搜索病例名称/编号/病种...">
          <i v-if="searchQuery" class="fa-solid fa-xmark clear-btn" @click="searchQuery = ''"></i>
        </div>
        <button class="filter-btn" @click="showFilterPanel = true">
          <i class="fa-solid fa-sliders"></i>
        </button>
      </div>
      <div class="result-hint" v-if="hasFilters">{{ filteredCases.length }} 条结果</div>
    </div>

    <!-- 筛选底部弹窗 -->
    <div v-if="showFilterPanel" class="filter-overlay" @click.self="showFilterPanel = false">
      <div class="filter-panel">
        <div class="filter-panel-header">
          <span class="filter-panel-title">筛选</span>
          <button class="filter-panel-close" @click="showFilterPanel = false">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
        <div class="filter-panel-body">
          <div class="filter-section">
            <label class="filter-label">专业</label>
            <div class="filter-chips">
              <span v-for="s in displayedSpecialties" :key="s.id" class="filter-chip" :class="{ active: specialtyFilter === s.name }" @click="specialtyFilter = s.name">{{ s.name }}</span>
              <span v-if="hasExpandSpecialties && !showAllSpecialties" class="filter-chip expand-chip" @click="showAllSpecialties = true">展开全部 <i class="fa-solid fa-chevron-down"></i></span>
              <span v-if="showAllSpecialties" class="filter-chip expand-chip" @click="showAllSpecialties = false">收起 <i class="fa-solid fa-chevron-up"></i></span>
            </div>
          </div>
          <div class="filter-section">
            <label class="filter-label">难度</label>
            <div class="filter-chips">
              <span class="filter-chip" :class="{ active: difficultyFilter === '' }" @click="difficultyFilter = ''">全部</span>
              <span v-for="d in difficultyOptions" :key="d.value"
                class="filter-chip" :class="{ active: difficultyFilter === d.value }"
                @click="difficultyFilter = difficultyFilter === d.value ? '' : d.value">{{ d.label }}</span>
            </div>
          </div>
          <div class="filter-section">
            <label class="filter-label">状态</label>
            <div class="filter-chips">
              <span class="filter-chip" :class="{ active: statusFilter === '' }" @click="statusFilter = ''">全部</span>
              <span v-for="s in statusOptions" :key="s.value"
                class="filter-chip" :class="{ active: statusFilter === s.value }"
                @click="statusFilter = statusFilter === s.value ? '' : s.value">{{ s.label }}</span>
            </div>
          </div>
          <div class="filter-section">
            <label class="filter-label">来源</label>
            <div class="filter-chips">
              <span class="filter-chip" :class="{ active: sourceFilter === '' }" @click="sourceFilter = ''">全部</span>
              <span class="filter-chip" :class="{ active: sourceFilter === '平台' }" @click="sourceFilter = sourceFilter === '平台' ? '' : '平台'">平台病例库</span>
              <span class="filter-chip" :class="{ active: sourceFilter === '机构' }" @click="sourceFilter = sourceFilter === '机构' ? '' : '机构'">机构病例库</span>
              <span class="filter-chip" :class="{ active: sourceFilter === '专家' }" @click="sourceFilter = sourceFilter === '专家' ? '' : '专家'">专家病例库</span>
            </div>
          </div>
        </div>
        <div class="filter-panel-footer">
          <button class="filter-reset-btn" @click="doReset">重置</button>
          <button class="filter-confirm-btn" @click="showFilterPanel = false">确定</button>
        </div>
      </div>
    </div>

    <!-- 首次进入专业选择弹窗 -->
    <div v-if="showSpecialtyModal" class="filter-overlay">
      <div class="specialty-panel">
        <div class="specialty-panel-header">
          <span class="specialty-panel-title">请选择您的专业方向</span>
        </div>
        <div class="specialty-panel-body">
          <div class="specialty-select-chips">
            <span v-for="s in specialties" :key="s.id" class="specialty-select-chip" :class="{ active: tempSpecialty === s.name }" @click="tempSpecialty = s.name">{{ s.name }}</span>
          </div>
        </div>
        <div class="specialty-panel-footer">
          <button class="specialty-confirm-btn" :disabled="!tempSpecialty" @click="confirmSpecialty">确认</button>
        </div>
      </div>
    </div>

    <div v-for="c in filteredCases" :key="c.id" class="case-item" @click="goDetail(c)">
      <div class="case-left">
        <div class="case-avatar">
          <i class="fa-solid fa-user"></i>
        </div>
        <div class="case-main">
          <div class="case-name-row">
            <span class="case-name">{{ c.patient.name }}</span>
            <span class="case-gender">{{ c.patient.sex }} · {{ c.patient.age }}岁 · {{ c.patient.occupation }}</span>
          </div>
          <div class="case-id">{{ c.id }}</div>
          <div class="case-symptoms">
            <span v-for="s in (c.symptoms || [])" :key="s" class="symptom-tag">{{ s }}</span>
          </div>
        </div>
      </div>
      <div class="case-right">
        <span class="diff-tag" :class="'diff-' + getCaseLevel(c.difficulty)">{{ getCaseLevelLabel(c.difficulty) }}</span>
        <span class="status-tag" :class="c.status === 'trained' ? 'done' : 'new'">
          {{ c.status === 'trained' ? '已学习' : '未学习' }}
        </span>
      </div>
    </div>

    <div v-if="filteredCases.length === 0" class="empty">
      <i class="fa-solid fa-folder-open"></i>
      <p>暂无匹配的病例</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAppTrainingStore } from '@/stores/appTraining'
import { getDifficultyLabel, getCaseLevel, getCaseLevelLabel } from '@ai-sp/shared'

const router = useRouter()
const store = useAppTrainingStore()

const SPECIALTY_KEY = 'app-training-specialty-chosen'
const savedSpecialty = localStorage.getItem(SPECIALTY_KEY)
const defaultSpecialtyId = ''

const searchQuery = ref('')
const difficultyFilter = ref('')
const statusFilter = ref('')
const sourceFilter = ref('')
const specialtyFilter = ref(savedSpecialty || defaultSpecialtyId)
const showFilterPanel = ref(false)

const showSpecialtyModal = ref(!savedSpecialty)
const tempSpecialty = ref('内科')

const difficultyOptions = [
  { value: 'basic', label: '基础病例' },
  { value: 'advanced', label: '高阶病例' },
  { value: 'difficult', label: '疑难病例' }
]
const statusOptions = [
  { value: 'not_trained', label: '未学习' },
  { value: 'trained', label: '已学习' }
]
const specialties = computed(() => store.specialties.resident.map(s => ({ id: s.id, name: s.name })))

const MAX_VISIBLE_SPECIALTIES = 8
const showAllSpecialties = ref(false)
const displayedSpecialties = computed(() => showAllSpecialties.value ? specialties.value : specialties.value.slice(0, MAX_VISIBLE_SPECIALTIES))
const hasExpandSpecialties = computed(() => specialties.value.length > MAX_VISIBLE_SPECIALTIES)

const hasFilters = computed(() => !!(searchQuery.value.trim() || difficultyFilter.value || statusFilter.value || sourceFilter.value))

const filteredCases = computed(() => {
  let list = store.availableCases
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase()
    list = list.filter(c =>
      c.title.toLowerCase().includes(q) ||
      c.id.toLowerCase().includes(q) ||
      c.disease.toLowerCase().includes(q) ||
      c.chiefComplaint.toLowerCase().includes(q)
    )
  }
  if (difficultyFilter.value) {
    list = list.filter(c => getCaseLevel(c.difficulty) === difficultyFilter.value)
  }
  if (statusFilter.value) {
    list = list.filter(c => c.status === statusFilter.value)
  }
  if (sourceFilter.value) {
    if (sourceFilter.value === '机构') {
      list = list.filter(c => c.source && c.source !== '平台' && c.source !== '专家')
    } else {
      list = list.filter(c => c.source === sourceFilter.value)
    }
  }
  if (specialtyFilter.value) {
    list = list.filter(c => c.specialty === specialtyFilter.value)
  }
  return list
})

function confirmSpecialty() {
  if (tempSpecialty.value) {
    specialtyFilter.value = tempSpecialty.value
    localStorage.setItem(SPECIALTY_KEY, tempSpecialty.value)
    showSpecialtyModal.value = false
  }
}

function doReset() {
  searchQuery.value = ''
  difficultyFilter.value = ''
  statusFilter.value = ''
  sourceFilter.value = ''
  specialtyFilter.value = ''
  showAllSpecialties.value = false
}

function goDetail(c) {
  store.selectCase(c)
  router.push({ name: 'caseDetail', params: { caseId: c.id } })
}

onMounted(() => {
  store.loadCases()
})
</script>

<style scoped>
.page { padding: 16px; }
.filter-bar { margin-bottom: 14px; }
.search-box { flex: 1; min-width: 0; display: flex; align-items: center; gap: 8px; background: #fff; border-radius: 10px; padding: 10px 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
.search-box i { color: var(--text-tertiary); font-size: 14px; }
.search-box input { flex: 1; border: none; outline: none; font-size: 14px; }
.clear-btn { cursor: pointer; color: #C0C4CC; }
.clear-btn:hover { color: #909399; }
.search-row { display: flex; gap: 8px; align-items: center; }
.filter-btn { width: 42px; height: 42px; display: flex; align-items: center; justify-content: center; background: #fff; border: none; border-radius: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); cursor: pointer; font-size: 16px; color: #606266; flex-shrink: 0; }
.filter-btn:active { background: #f0f0f0; }
/* 筛选弹窗 */
.filter-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.4); z-index: 1000; display: flex; align-items: flex-end; }
.filter-panel { width: 100%; background: #fff; border-radius: 16px 16px 0 0; padding: 20px; padding-bottom: calc(20px + env(safe-area-inset-bottom)); animation: slideUp 0.25s ease; }
@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
.filter-panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.filter-panel-title { font-size: 16px; font-weight: 600; }
.filter-panel-close { width: 28px; height: 28px; border: none; background: #f3f4f6; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 14px; color: #6b7280; }
.filter-section { margin-bottom: 18px; }
.filter-label { display: block; font-size: 13px; color: #6b7280; margin-bottom: 8px; font-weight: 500; }
.filter-section select { width: 100%; padding: 10px 12px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 14px; color: #374151; background: #f9fafb; outline: none; }
.filter-chips { display: flex; gap: 8px; flex-wrap: wrap; }
.filter-chip { padding: 6px 14px; border-radius: 20px; font-size: 13px; border: 1px solid #e5e7eb; color: #6b7280; background: #fff; cursor: pointer; transition: all 0.15s; }
.filter-chip.active { background: #eff6ff; color: #2563eb; border-color: #bfdbfe; }
.expand-chip { background: #f9fafb; color: #909399; font-size: 12px; gap: 4px; display: inline-flex; align-items: center; }
.expand-chip:active { background: #f3f4f6; }
.filter-panel-footer { display: flex; gap: 12px; margin-top: 24px; }
.filter-reset-btn { flex: 1; padding: 12px; border: 1px solid #e5e7eb; border-radius: 10px; background: #fff; color: #6b7280; font-size: 14px; cursor: pointer; }
.filter-confirm-btn { flex: 2; padding: 12px; border: none; border-radius: 10px; background: #2563eb; color: #fff; font-size: 14px; font-weight: 500; cursor: pointer; }
/* 首次专业选择弹窗 */
.specialty-panel { width: 100%; background: #fff; border-radius: 16px 16px 0 0; padding: 24px 20px; padding-bottom: calc(24px + env(safe-area-inset-bottom)); animation: slideUp 0.25s ease; }
.specialty-panel-header { text-align: center; margin-bottom: 20px; }
.specialty-panel-title { font-size: 17px; font-weight: 700; color: #303133; }
.specialty-panel-body { margin-bottom: 24px; }
.specialty-select-chips { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; }
.specialty-select-chip { padding: 10px 22px; border-radius: 12px; font-size: 14px; border: 2px solid #e5e7eb; color: #606266; background: #fff; cursor: pointer; transition: all 0.15s; }
.specialty-select-chip.active { background: #eff6ff; color: #2563eb; border-color: #2563eb; font-weight: 600; }
.specialty-panel-footer { display: flex; justify-content: center; }
.specialty-confirm-btn { width: 100%; padding: 14px; border: none; border-radius: 12px; background: #2563eb; color: #fff; font-size: 16px; font-weight: 600; cursor: pointer; }
.specialty-confirm-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.result-hint { font-size: 12px; color: var(--text-tertiary); margin-top: 8px; }

.case-item { display: flex; align-items: center; justify-content: space-between; background: #fff; border-radius: 12px; padding: 14px; margin-bottom: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); cursor: pointer; }
.case-item:active { background: #f5f7fa; }
.case-left { display: flex; gap: 12px; flex: 1; min-width: 0; }
.case-avatar { width: 44px; height: 44px; border-radius: 50%; background: #e5e7eb; display: flex; align-items: center; justify-content: center; color: #9ca3af; font-size: 18px; flex-shrink: 0; }
.case-main { flex: 1; min-width: 0; }
.case-name-row { display: flex; align-items: baseline; gap: 8px; margin-bottom: 2px; }
.case-name { font-size: 15px; font-weight: 600; }
.case-gender { font-size: 11px; color: var(--text-secondary); }
.case-id { font-size: 10px; color: #C0C4CC; margin-bottom: 4px; }
.case-symptoms { display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 4px; }
.symptom-tag { font-size: 10px; padding: 1px 6px; border-radius: 4px; background: #ecf5ff; color: #409EFF; }
.case-complaint { font-size: 11px; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.case-right { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; flex-shrink: 0; }
.diff-tag { font-size: 10px; padding: 1px 6px; border-radius: 4px; }
.diff-basic { background: #e8f5e9; color: #2e7d32; }
.diff-advanced { background: #fff3e0; color: #e65100; }
.diff-difficult { background: #fce4ec; color: #c62828; }
.diff-undefined { background: #f3f4f6; color: #9ca3af; }
.status-tag { font-size: 10px; padding: 2px 8px; border-radius: 4px; font-weight: 500; }
.status-tag.done { background: #e8f5e9; color: #2e7d32; }
.status-tag.new { background: #fff3e0; color: #e65100; }
.empty { text-align: center; padding: 50px 20px; color: var(--text-tertiary); }
.empty i { font-size: 36px; margin-bottom: 12px; display: block; }
.empty p { font-size: 13px; }
</style>
