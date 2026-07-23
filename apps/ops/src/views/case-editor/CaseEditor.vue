<template>
  <div class="case-editor">
    <div v-if="loading" class="card" style="text-align:center;padding:60px 20px;color:var(--text-secondary)">
      <div class="spinner"></div>
      <p style="margin-top:16px">加载病例数据中...</p>
    </div>

    <template v-else>
      <div class="editor-header">
        <div class="header-left">
          <h2 class="editor-title">病例编辑器</h2>
          <span v-if="formData.case_id" class="case-id-badge">ID: {{ formData.case_id }}</span>
        </div>
        <div class="header-right">
          <button class="btn btn-outline" @click="handleGoBack">返回</button>
          <button class="btn btn-outline" @click="optimizeCurrentTab">优化当前模块</button>
          <button class="btn btn-primary" @click="saveDraft">保存草稿</button>
        </div>
      </div>

      <div class="common-info-card card" :class="{ collapsed: infoCollapsed }">
        <div class="common-info-grid">
          <div class="filter-item">
            <label>病例ID</label>
            <input class="input" :value="formData.case_id" disabled style="background:#f3f4f6;color:#6b7280">
          </div>
          <div class="filter-item">
            <label>来源机构</label>
            <select class="select" v-model="formData.institution">
              <option value="">选择机构</option>
              <option v-for="inst in allInstitutions" :key="inst" :value="inst">{{ inst }}</option>
            </select>
          </div>
          <div class="filter-item" style="grid-column:span 2">
            <label>标题</label>
            <input class="input" v-model="formData.title" placeholder="输入病例标题" style="width:100%">
          </div>
          <div class="filter-item">
            <label>教学阶段</label>
            <SearchSelect :options="dict.teaching_phases" :modelValue="formData.teaching_phase" @update:modelValue="v => formData.teaching_phase = v" placeholder="选择教学阶段" />
          </div>
          <div class="filter-item">
            <label>专科</label>
            <SearchSelect :options="dict.specialties" :modelValue="formData.specialty" @update:modelValue="onSpecialtyChange" placeholder="选择专科" />
          </div>
          <div class="filter-item">
            <label>亚专业</label>
            <SearchSelect :options="availableCategories" :modelValue="formData.category" @update:modelValue="onCategoryChange" placeholder="选择亚专业" />
          </div>
          <div class="filter-item">
            <label>病种</label>
            <SearchSelect :options="availableDiseases" :modelValue="formData.disease" @update:modelValue="v => formData.disease = v" placeholder="选择病种" />
          </div>
          <div class="filter-item">
            <label>难度</label>
            <select class="select" v-model="formData.difficulty">
              <option value="L1">L1 - 低</option>
              <option value="L2">L2 - 中</option>
              <option value="L3">L3 - 高</option>
            </select>
          </div>
          <div class="filter-item" style="justify-content:flex-end">
            <button class="btn btn-primary" @click="showGenConfig = true">🤖 AI 生成</button>
          </div>
        </div>
      </div>
      <div ref="sentinelRef" class="collapse-sentinel"></div>

      <div class="tab-bar">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          :class="['tab-btn', { active: activeTab === tab.key }]"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </div>

      <div class="tab-content">
        <div v-if="activeTab === 'basic'" class="tab-panel" key="basic">
          <BasicInfoEditor
            :formData="formData"
            :dict="dict"
            :availableSpecialties="availableSpecialties"
            :availableCategories="availableCategories"
            :availableDiseases="availableDiseases"
          />
        </div>
        <div v-if="activeTab === 'reception'" class="tab-panel" key="reception">
          <ReceptionEditor :formData="formData" />
        </div>
        <div v-if="activeTab === 'analysis'" class="tab-panel" key="analysis">
          <AnalysisEditor :formData="formData" />
        </div>
        <div v-if="activeTab === 'humanity'" class="tab-panel" key="humanity">
          <HumanityEditor :formData="formData" />
        </div>
        <div v-if="activeTab === 'meta'" class="tab-panel" key="meta">
          <MetaInfoView :meta="formData.meta" />
        </div>
      </div>

      <div v-if="showGenConfig" class="modal-overlay" @click.self="showGenConfig = false">
        <div class="modal-card">
          <div class="modal-header">
            <h3>AI 生成配置</h3>
            <button class="btn-icon" @click="showGenConfig = false">✕</button>
          </div>
          <div class="modal-body">
            <p class="modal-desc">选择需要 AI 生成的模块步骤：</p>
            <div class="gen-step-selector">
              <div class="step-circles">
                <div
                  v-for="(step, idx) in genSteps"
                  :key="step.key"
                  :class="['step-circle', { active: currentGenStep === idx, done: genProgress[step.key] }]"
                  @click="currentGenStep = idx"
                >
                  <span class="step-num">{{ idx + 1 }}</span>
                  <span class="step-label">{{ step.label }}</span>
                </div>
              </div>
              <div class="step-actions">
                <label class="checkbox-label">
                  <input type="checkbox" v-model="genStepSelection[currentGenStep]">
                  <span>包含此步骤</span>
                </label>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" @click="showGenConfig = false">取消</button>
            <button class="btn btn-primary" @click="startGeneration">开始生成</button>
          </div>
        </div>
      </div>

      <div v-if="showGenProgress" class="modal-overlay">
        <div class="modal-card">
          <div class="modal-header">
            <h3>AI 生成进度</h3>
          </div>
          <div class="modal-body">
            <div class="progress-list">
              <div
                v-for="(step, stepIdx) in genSteps"
                :key="step.key"
                v-show="genStepSelection[stepIdx]"
                class="progress-item"
              >
                <div class="progress-label">
                  <span>{{ step.label }}</span>
                  <span class="progress-status">{{ genProgress[step.key] ? '✓ 完成' : generatingStep === step.key ? '生成中...' : '等待中' }}</span>
                </div>
                <div class="progress-bar-track">
                  <div
                    :class="['progress-bar-fill', { done: genProgress[step.key] }]"
                    :style="{ width: genProgress[step.key] ? '100%' : generatingStep === step.key ? '60%' : '0%' }"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="showGenPreview" class="modal-overlay" @click.self="showGenPreview = false">
        <div class="modal-card modal-card-lg">
          <div class="modal-header">
            <h3>生成预览</h3>
            <button class="btn-icon" @click="showGenPreview = false">✕</button>
          </div>
          <div class="modal-body">
            <div class="preview-tabs">
              <button
                v-for="tab in genPreviewTabs"
                :key="tab.key"
                :class="['preview-tab-btn', { active: previewActiveTab === tab.key }]"
                @click="previewActiveTab = tab.key"
              >
                {{ tab.label }}
              </button>
            </div>
            <div class="preview-content">
              <div v-if="previewActiveTab === 'basic'" class="preview-section">
                <h4>基础信息</h4>
                <pre class="preview-json">{{ JSON.stringify(previewData.basic, null, 2) }}</pre>
              </div>
              <div v-if="previewActiveTab === 'reception'" class="preview-section">
                <h4>接诊病人</h4>
                <pre class="preview-json">{{ JSON.stringify(previewData.reception, null, 2) }}</pre>
              </div>
              <div v-if="previewActiveTab === 'analysis'" class="preview-section">
                <h4>病例分析</h4>
                <pre class="preview-json">{{ JSON.stringify(previewData.analysis, null, 2) }}</pre>
              </div>
              <div v-if="previewActiveTab === 'humanity'" class="preview-section">
                <h4>人文沟通</h4>
                <pre class="preview-json">{{ JSON.stringify(previewData.humanity, null, 2) }}</pre>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" @click="showGenPreview = false">取消</button>
            <button class="btn btn-primary" @click="acceptGenerated">确认采用</button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue'
import { toast } from '@ai-sp/shared'
import { dict, createEmptyFormData, loadCaseDataFromFiles } from './shared.js'
import BasicInfoEditor from './BasicInfo.vue'
import ReceptionEditor from './Reception.vue'
import AnalysisEditor from './Analysis.vue'
import HumanityEditor from './Humanity.vue'
import MetaInfoView from './MetaInfo.vue'
import SearchSelect from '@/components/SearchSelect.vue'

const props = defineProps({
  caseId: { type: String, default: null }
})

const allInstitutions = ['仁爱医院', '华西医院', '中山医院', '协和医院', '同济医院', '省立医院']

const loading = ref(true)
const formData = ref(createEmptyFormData())
const infoCollapsed = ref(false)
const sentinelRef = ref(null)
let observer = null

const tabs = [
  { key: 'basic', label: '基础信息' },
  { key: 'reception', label: '接诊病人' },
  { key: 'analysis', label: '病例分析' },
  { key: 'humanity', label: '人文沟通' },
  { key: 'meta', label: '元信息' }
]
const activeTab = ref('basic')

const availableSpecialties = computed(() => dict.specialties)

const availableCategories = computed(() => {
  if (!formData.value.specialty) return []
  return dict.categoriesMap[formData.value.specialty] || []
})

const availableDiseases = computed(() => {
  if (!formData.value.category) return []
  return dict.diseasesMap[formData.value.category] || []
})

function onSpecialtyChange(val) {
  formData.value.specialty = val
  formData.value.category = ''
  formData.value.disease = ''
}

function onCategoryChange(val) {
  formData.value.category = val
  formData.value.disease = ''
}

watch(() => props.caseId, (newVal) => {
  loadData(newVal)
}, { immediate: true })

async function loadData(id) {
  loading.value = true
  try {
    formData.value = await loadCaseDataFromFiles(id)
  } catch (e) {
    toast.show('加载病例数据失败: ' + e.message, 'error')
  } finally {
    loading.value = false
  }
}

function handleGoBack() {
  toast.show('已返回上一页')
}

function optimizeCurrentTab() {
  toast.show('优化功能开发中，敬请期待')
}

function saveDraft() {
  toast.show('草稿已保存')
}

onMounted(() => {
  observer = new IntersectionObserver(
    ([entry]) => { infoCollapsed.value = !entry.isIntersecting },
    { rootMargin: '-1px 0px 0px 0px', threshold: 0 }
  )
  if (sentinelRef.value) observer.observe(sentinelRef.value)
})

onUnmounted(() => {
  if (observer) observer.disconnect()
})

const showGenConfig = ref(false)
const showGenProgress = ref(false)
const showGenPreview = ref(false)

const genSteps = [
  { key: 'basic', label: '基础信息' },
  { key: 'reception', label: '接诊病人' },
  { key: 'analysis', label: '病例分析' },
  { key: 'humanity', label: '人文沟通' }
]
const currentGenStep = ref(0)
const genStepSelection = ref([true, true, true, true])

const genProgress = reactive({
  basic: false,
  reception: false,
  analysis: false,
  humanity: false
})

const generatingStep = ref('')

const previewData = ref({
  basic: {},
  reception: {},
  analysis: {},
  humanity: {}
})

const previewActiveTab = ref('basic')

const genPreviewTabs = [
  { key: 'basic', label: '基础信息' },
  { key: 'reception', label: '接诊病人' },
  { key: 'analysis', label: '病例分析' },
  { key: 'humanity', label: '人文沟通' }
]

async function startGeneration() {
  showGenConfig.value = false
  showGenProgress.value = true

  for (const key in genProgress) {
    genProgress[key] = false
  }
  previewData.value = {
    basic: {},
    reception: {},
    analysis: {},
    humanity: {}
  }

  const selectedSteps = genSteps.filter((_, i) => genStepSelection.value[i])

  for (const step of selectedSteps) {
    generatingStep.value = step.key
    try {
      const result = await simulateGenStep(step.key)
      previewData.value[step.key] = result
      genProgress[step.key] = true
    } catch (e) {
      toast.show(`生成 ${step.label} 失败: ${e.message}`, 'error')
    }
  }

  generatingStep.value = ''
  showGenProgress.value = false
  showGenPreview.value = true
  previewActiveTab.value = selectedSteps[0]?.key || 'basic'
}

async function simulateGenStep(stepKey) {
  await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200))
  return { generated: true, step: stepKey, timestamp: Date.now() }
}

function acceptGenerated() {
  if (previewData.value.basic && Object.keys(previewData.value.basic).length) {
    Object.assign(formData.value, previewData.value.basic)
  }
  if (previewData.value.reception && Object.keys(previewData.value.reception).length) {
    Object.assign(formData.value.reception, previewData.value.reception)
  }
  if (previewData.value.analysis && Object.keys(previewData.value.analysis).length) {
    Object.assign(formData.value.analysis, previewData.value.analysis)
  }
  if (previewData.value.humanity && Object.keys(previewData.value.humanity).length) {
    Object.assign(formData.value.humanity, previewData.value.humanity)
  }
  showGenPreview.value = false
  toast.show('已采用 AI 生成内容')
}
</script>

<style scoped>
.case-editor {
  background: var(--page-bg);
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 24px;
  background: var(--card-bg);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 20;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.editor-title {
  margin: 0;
  font-size: 16px;
  color: var(--text-main);
}

.case-id-badge {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--primary-light);
  color: var(--primary);
}

.header-right {
  display: flex;
  gap: 8px;
}

.common-info-card {
  margin: 0;
  padding: 16px 24px;
  border-radius: 0;
  transition: padding .2s, max-height .25s, opacity .2s;
  overflow: hidden;
}

.common-info-card.collapsed {
  padding: 0 24px;
  max-height: 0;
  border: none;
  margin: 0;
}

.common-info-card.collapsed .common-info-grid {
  opacity: 0;
  pointer-events: none;
}

.common-info-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  align-items: end;
  transition: opacity .15s;
}

.filter-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.filter-item label {
  font-size: 12px;
  color: var(--text-secondary);
}

.tab-bar {
  display: flex;
  gap: 0;
  padding: 0 24px;
  background: var(--card-bg);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 53px;
  z-index: 10;
}

.tab-btn {
  padding: 10px 20px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  font-size: 14px;
  color: var(--text-secondary);
  transition: all .15s;
}

.tab-btn:hover {
  color: var(--primary);
}

.tab-btn.active {
  color: var(--primary);
  border-bottom-color: var(--primary);
  font-weight: 600;
}

.tab-content {
}

.tab-panel {
  padding: 20px 24px;
}

.spinner {
  width: 36px;
  height: 36px;
  margin: 0 auto;
  border: 3px solid var(--border);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin .8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-card {
  background: var(--card-bg);
  border-radius: 12px;
  width: 520px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
}

.modal-card-lg {
  width: 720px;
  max-height: 85vh;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-light);
}

.modal-header h3 {
  margin: 0;
  font-size: 16px;
  color: var(--text-main);
}

.btn-icon {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 18px;
  color: var(--text-tertiary);
  padding: 4px 8px;
  border-radius: 4px;
  transition: background .15s;
}

.btn-icon:hover {
  background: var(--border-light);
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

.modal-desc {
  margin: 0 0 16px;
  font-size: 13px;
  color: var(--text-secondary);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 20px;
  border-top: 1px solid var(--border-light);
}

.gen-step-selector {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.step-circles {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.step-circle {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  width: 100px;
  padding: 12px 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: all .15s;
  border: 2px solid var(--border);
}

.step-circle:hover {
  border-color: var(--primary);
  background: var(--primary-light);
}

.step-circle.active {
  border-color: var(--primary);
  background: var(--primary-light);
}

.step-circle.done {
  border-color: var(--success);
  background: #ecfdf5;
}

.step-num {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--border-light);
  font-weight: 600;
  font-size: 14px;
  color: var(--text-secondary);
}

.step-circle.active .step-num {
  background: var(--primary);
  color: white;
}

.step-circle.done .step-num {
  background: var(--success);
  color: white;
}

.step-label {
  font-size: 12px;
  color: var(--text-secondary);
  text-align: center;
}

.step-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text-main);
  cursor: pointer;
}

.progress-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.progress-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.progress-label {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: var(--text-main);
}

.progress-status {
  font-size: 12px;
  color: var(--text-tertiary);
}

.progress-bar-track {
  height: 8px;
  background: var(--border-light);
  border-radius: 4px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: var(--primary);
  border-radius: 4px;
  transition: width .3s ease;
}

.progress-bar-fill.done {
  background: var(--success);
}

.preview-tabs {
  display: flex;
  gap: 0;
  border-bottom: 1px solid var(--border-light);
  margin-bottom: 16px;
}

.preview-tab-btn {
  padding: 8px 16px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  font-size: 13px;
  color: var(--text-secondary);
  transition: all .15s;
}

.preview-tab-btn:hover {
  color: var(--primary);
}

.preview-tab-btn.active {
  color: var(--primary);
  border-bottom-color: var(--primary);
  font-weight: 600;
}

.preview-section h4 {
  margin: 0 0 12px;
  font-size: 14px;
  color: var(--text-main);
}

.preview-json {
  background: #f9fafb;
  padding: 16px;
  border-radius: 8px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-main);
  overflow-x: auto;
  max-height: 400px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-all;
}

.btn {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  border: none;
  transition: all .15s;
}

.btn-primary {
  background: var(--primary);
  color: white;
}

.btn-primary:hover {
  background: var(--primary-dark);
}

.btn-outline {
  background: white;
  border: 1px solid var(--border);
  color: var(--text-main);
}

.btn-outline:hover {
  background: var(--primary-light);
  border-color: var(--primary);
  color: var(--primary);
}

.btn-sm {
  padding: 4px 10px;
  font-size: 12px;
}

.input, .select {
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 13px;
  color: var(--text-main);
  background: white;
  transition: border-color .15s;
}

.input:focus, .select:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 2px var(--primary-light);
}

.input:disabled {
  cursor: not-allowed;
}
</style>
