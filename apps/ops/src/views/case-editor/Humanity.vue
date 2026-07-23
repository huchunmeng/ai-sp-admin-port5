<template>
  <div class="humanity-editor">
    <div class="editor-layout-split">
      <div class="editor-index-panel">
        <div class="panel-header">
          <div class="panel-header-row">
            <span class="panel-title">场景列表</span>
            <button class="btn btn-sm" @click="addScenario">+ 新增场景</button>
          </div>
          <div class="scenario-list">
            <div v-for="(scene, idx) in formData.humanity.scenarios" :key="idx" class="scenario-group">
              <div class="scenario-header" :class="{ active: activeScenarioIndex === idx }" @click="selectScenario(idx)">
                <span class="scenario-name">{{ scene.scenario_name || '未命名场景' }}</span>
                <button v-if="formData.humanity.scenarios.length > 1" class="btn-icon-sm" @click.stop="deleteScenario(idx)">🗑️</button>
              </div>
              <div v-if="activeScenarioIndex === idx" class="sub-items">
                <div v-for="sub in subItems" :key="sub.key" class="sub-item" :class="{ active: activeSubKey === sub.key }" @click="activeSubKey = sub.key">
                  <i class="sub-icon">{{ sub.icon }}</i>
                  <span>{{ sub.label }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="editor-content-panel">
        <div v-if="currentScene" class="content-body">
          <div class="scene-basic-row">
            <div class="scene-field scene-field-id">
              <label>场景ID</label>
              <input class="input" :value="currentScene.scenario_id" disabled>
            </div>
            <div class="scene-field scene-field-name">
              <label>场景名称</label>
              <input class="input" v-model="currentScene.scenario_name">
            </div>
            <div class="scene-field scene-field-type">
              <label>场景类型</label>
              <select class="select" v-model="currentScene.layer">
                <option value="基础场景">基础场景</option>
                <option value="专业特色场景">专业特色场景</option>
                <option value="专项场景">专项场景</option>
              </select>
            </div>
            <div class="scene-field scene-field-target">
              <label>沟通对象</label>
              <select class="select" v-model="currentScene.communication_target">
                <option value="patient">患者</option>
                <option value="family">家属</option>
              </select>
            </div>
          </div>

          <div v-if="activeSubKey === 'sp'">
            <h4 class="section-title">SP 材料</h4>
            <div class="filter-item mb-3">
              <label>角色描述</label>
              <textarea class="input" v-model="currentScene.sp_materials.role_description"></textarea>
            </div>
            <div class="filter-item mb-3">
              <label>开场白</label>
              <input class="input" v-model="currentScene.sp_materials.opening_line">
            </div>

            <div class="script-section">
              <div class="script-section-header">
                <label class="section-label">对话脚本（结构化）</label>
                <button class="btn btn-sm" @click="addScriptTurn">+ 添加对话轮次</button>
              </div>
              <div class="script-list">
                <div v-for="(turn, idx) in currentScene.sp_materials.script" :key="idx" class="script-card">
                  <div class="script-card-header">
                    <span class="turn-num">第 {{ idx + 1 }} 轮</span>
                    <div class="script-actions">
                      <button class="btn-icon-sm" :disabled="idx === 0" @click="moveScriptTurnUp(idx)">⬆️</button>
                      <button class="btn-icon-sm" :disabled="idx === currentScene.sp_materials.script.length - 1" @click="moveScriptTurnDown(idx)">⬇️</button>
                      <button class="btn-icon-sm" @click="deleteScriptTurn(idx)">🗑️</button>
                    </div>
                  </div>
                  <div class="mb-2">
                    <label class="field-mini-label">对话内容 (line)</label>
                    <textarea class="input" v-model="turn.line" placeholder="请输入对话内容..."></textarea>
                  </div>
                  <div class="script-card-fields">
                    <div class="flex-1">
                      <label class="field-mini-label">情绪 (emotion)</label>
                      <input class="input" v-model="turn.emotion" placeholder="如：焦虑、轻松">
                    </div>
                    <div class="flex-1">
                      <label class="field-mini-label">备注 (note)</label>
                      <input class="input" v-model="turn.note" placeholder="可选备注">
                    </div>
                  </div>
                </div>
                <div v-if="!currentScene.sp_materials.script || currentScene.sp_materials.script.length === 0" class="empty-state">
                  暂无对话，请点击"添加对话轮次"
                </div>
              </div>
            </div>
          </div>

          <div v-else-if="activeSubKey === 'examiner'">
            <h4 class="section-title">考官材料</h4>
            <div class="filter-item mb-3">
              <label>临床背景</label>
              <textarea class="input" v-model="currentScene.examiner_materials.clinical_context"></textarea>
            </div>

            <div class="scoring-section">
              <div class="script-section-header">
                <label class="section-label">评分标准（结构化）</label>
                <button class="btn btn-sm" @click="addScoringCriterion">+ 添加评分项</button>
              </div>
              <div class="scoring-container">
                <div class="total-score-row">
                  <label>总分：</label>
                  <input class="input" type="number" v-model.number="currentScene.examiner_materials.scoring_guide.total_score">
                </div>
                <table class="score-table">
                  <thead>
                    <tr>
                      <th class="col-num">#</th>
                      <th>评分项 (item)</th>
                      <th class="col-score">分值 (score)</th>
                      <th class="col-action"></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(cri, idx) in (currentScene.examiner_materials?.scoring_guide?.criteria || [])" :key="idx">
                      <td>{{ idx + 1 }}</td>
                      <td><input class="input" v-model="cri.item"></td>
                      <td><input class="input" type="number" v-model.number="cri.score"></td>
                      <td><button class="btn-icon-sm" @click="deleteScoringCriterion(idx)">🗑️</button></td>
                    </tr>
                    <tr v-if="!currentScene.examiner_materials?.scoring_guide?.criteria?.length">
                      <td colspan="4" class="score-empty">暂无评分项</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div class="filter-item mt-3">
              <label>参考答案 - 关键沟通要点（每行一个）</label>
              <textarea class="input" v-model="examinerKeyPointsStr"></textarea>
            </div>

            <div class="dialogue-section">
              <div class="script-section-header">
                <label class="section-label">考官完整对话（SP ↔ 考生 问答组）</label>
                <button class="btn btn-sm" @click="addQAPair">+ 添加问答组</button>
              </div>
              <div class="dialogue-groups">
                <div v-for="(pair, idx) in qaPairsList" :key="idx" class="dialogue-group">
                  <div class="dialogue-group-header">
                    <span class="dialogue-group-label">问答组 {{ idx + 1 }}</span>
                    <div>
                      <button class="btn-icon-sm" :disabled="idx === 0" @click="moveQAPairUp(idx)">⬆️</button>
                      <button class="btn-icon-sm" :disabled="idx === qaPairsList.length - 1" @click="moveQAPairDown(idx)">⬇️</button>
                      <button class="btn-icon-sm" @click="deleteQAPair(idx)">🗑️</button>
                    </div>
                  </div>
                  <div class="filter-item mb-2">
                    <label class="field-mini-label">SP 提问 / 陈述</label>
                    <textarea class="input" v-model="pair.sp_line" @input="syncQAPairsImmediate" placeholder="SP 说..."></textarea>
                  </div>
                  <div class="filter-item mb-2">
                    <label class="field-mini-label">SP 情绪 (sp_emotion)</label>
                    <input class="input" v-model="pair.sp_emotion" @input="syncQAPairsImmediate" placeholder="如：痛苦、焦虑">
                  </div>
                  <div class="filter-item mb-2">
                    <label class="field-mini-label">考生预期回应 - 简述 (expected_response.brief)</label>
                    <input class="input" v-model="pair.expected_brief" @input="syncQAPairsImmediate" placeholder="一句话总结考生应如何回应">
                  </div>
                  <div class="filter-item">
                    <label class="field-mini-label">考生预期回应 - 关键点 (每行一个)</label>
                    <textarea class="input" :value="pair.expected_points_str" @input="updateExpectedPoints(idx, $event.target.value)"></textarea>
                  </div>
                </div>
                <div v-if="qaPairsList.length === 0" class="empty-state">
                  暂无问答组，请点击"添加问答组"
                </div>
              </div>
            </div>
          </div>

          <div v-else-if="activeSubKey === 'candidate'">
            <h4 class="section-title">考生材料</h4>
            <div class="filter-item mb-3">
              <label>临床背景</label>
              <textarea class="input" v-model="currentScene.candidate_materials.clinical_context"></textarea>
            </div>
            <div class="filter-item mb-3">
              <label>任务描述</label>
              <textarea class="input" v-model="currentScene.candidate_materials.task"></textarea>
            </div>
            <div class="filter-item mb-3">
              <label>时间限制（分钟）</label>
              <input class="input" type="number" v-model.number="currentScene.candidate_materials.time_limit" style="width:150px">
            </div>
            <div class="filter-item mb-3">
              <label>备注</label>
              <input class="input" v-model="currentScene.candidate_materials.note">
            </div>
          </div>
        </div>
        <div v-else class="empty-panel">
          请选择一个场景
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { toast, confirm } from '@ai-sp/shared'

const props = defineProps({
  formData: { type: Object, required: true }
})

const activeScenarioIndex = ref(0)
const activeSubKey = ref('sp')
const qaPairsList = ref([])
const isSyncing = ref(false)

const subItems = [
  { key: 'sp', label: 'SP 剧本', icon: '🎭' },
  { key: 'examiner', label: '考官试卷', icon: '📋' },
  { key: 'candidate', label: '考生材料', icon: '✍️' }
]

const currentScene = computed(() => {
  return props.formData.humanity.scenarios[activeScenarioIndex.value] || null
})

const examinerKeyPointsStr = computed({
  get() {
    const points = currentScene.value?.examiner_materials?.reference_answer?.key_communication_points || []
    return points.join('\n')
  },
  set(val) {
    if (!currentScene.value.examiner_materials.reference_answer) {
      currentScene.value.examiner_materials.reference_answer = {}
    }
    currentScene.value.examiner_materials.reference_answer.key_communication_points = val.split('\n').filter(s => s.trim())
  }
})

function ensureHumanityData() {
  if (!props.formData.humanity) props.formData.humanity = { scenarios: [] }
  if (props.formData.humanity.scenarios.length === 0) {
    props.formData.humanity.scenarios.push(createEmptyScenario())
  }
  for (const scene of props.formData.humanity.scenarios) {
    if (!scene.examiner_materials) scene.examiner_materials = {}
    if (!scene.examiner_materials.qa_pairs) scene.examiner_materials.qa_pairs = []
    if (!scene.examiner_materials.reference_answer) scene.examiner_materials.reference_answer = { key_communication_points: [] }
    if (!scene.examiner_materials.scoring_guide) scene.examiner_materials.scoring_guide = { total_score: 0, criteria: [] }
    if (!scene.sp_materials) scene.sp_materials = { role_description: '', opening_line: '', script: [] }
    if (!scene.candidate_materials) scene.candidate_materials = { clinical_context: '', task: '', time_limit: 0, note: '' }
    if (!scene.communication_target) scene.communication_target = 'patient'
  }
}

function createEmptyScenario() {
  return {
    scenario_id: '',
    scenario_name: '新场景',
    layer: '基础场景',
    communication_target: 'patient',
    sp_materials: { role_description: '', opening_line: '', script: [] },
    examiner_materials: {
      clinical_context: '',
      qa_pairs: [],
      reference_answer: { key_communication_points: [] },
      scoring_guide: { total_score: 0, criteria: [] }
    },
    candidate_materials: { clinical_context: '', task: '', time_limit: 0, note: '' }
  }
}

function addScenario() {
  props.formData.humanity.scenarios.push(createEmptyScenario())
  activeScenarioIndex.value = props.formData.humanity.scenarios.length - 1
  activeSubKey.value = 'sp'
}

function deleteScenario(idx) {
  if (props.formData.humanity.scenarios.length <= 1) return toast.show('至少保留一个场景')
  props.formData.humanity.scenarios.splice(idx, 1)
  if (activeScenarioIndex.value >= props.formData.humanity.scenarios.length) {
    activeScenarioIndex.value = props.formData.humanity.scenarios.length - 1
  }
}

function selectScenario(idx) {
  activeScenarioIndex.value = idx
}

function addScriptTurn() {
  currentScene.value.sp_materials.script.push({
    turn: currentScene.value.sp_materials.script.length + 1,
    line: '',
    emotion: '',
    note: ''
  })
}

function deleteScriptTurn(idx) {
  currentScene.value.sp_materials.script.splice(idx, 1)
  currentScene.value.sp_materials.script.forEach((t, i) => { t.turn = i + 1 })
}

function moveScriptTurnUp(idx) {
  if (idx === 0) return
  const arr = currentScene.value.sp_materials.script
  ;[arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]]
  arr.forEach((t, i) => { t.turn = i + 1 })
}

function moveScriptTurnDown(idx) {
  if (idx === currentScene.value.sp_materials.script.length - 1) return
  const arr = currentScene.value.sp_materials.script
  ;[arr[idx + 1], arr[idx]] = [arr[idx], arr[idx + 1]]
  arr.forEach((t, i) => { t.turn = i + 1 })
}

function addScoringCriterion() {
  currentScene.value.examiner_materials.scoring_guide.criteria.push({ item: '', score: 0 })
}

function deleteScoringCriterion(idx) {
  currentScene.value.examiner_materials.scoring_guide.criteria.splice(idx, 1)
}

function loadQAPairs() {
  if (!currentScene.value) return
  isSyncing.value = true
  const qaPairs = currentScene.value.examiner_materials.qa_pairs || []
  qaPairsList.value = qaPairs.map(pair => ({
    turn: pair.turn || 0,
    sp_line: pair.sp_line || '',
    sp_emotion: pair.sp_emotion || '',
    expected_brief: pair.expected_response?.brief || '',
    expected_points_str: (pair.expected_response?.key_points || []).join('\n')
  }))
  nextTick(() => {
    isSyncing.value = false
  })
}

function syncQAPairsImmediate() {
  isSyncing.value = true
  if (currentScene.value && activeSubKey.value === 'examiner') {
    const newPairs = []
    for (let i = 0; i < qaPairsList.value.length; i++) {
      const p = qaPairsList.value[i]
      newPairs.push({
        turn: i + 1,
        sp_line: p.sp_line || '',
        sp_emotion: p.sp_emotion || '',
        expected_response: {
          brief: p.expected_brief || '',
          key_points: p.expected_points_str.split('\n').filter(s => s.trim())
        }
      })
    }
    currentScene.value.examiner_materials.qa_pairs = newPairs
  }
  nextTick(() => {
    isSyncing.value = false
  })
}

function addQAPair() {
  qaPairsList.value.push({
    turn: qaPairsList.value.length + 1,
    sp_line: '',
    sp_emotion: '',
    expected_brief: '',
    expected_points_str: ''
  })
  syncQAPairsImmediate()
}

function deleteQAPair(idx) {
  qaPairsList.value.splice(idx, 1)
  syncQAPairsImmediate()
}

function moveQAPairUp(idx) {
  if (idx === 0) return
  const arr = qaPairsList.value
  ;[arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]]
  syncQAPairsImmediate()
}

function moveQAPairDown(idx) {
  if (idx === qaPairsList.value.length - 1) return
  const arr = qaPairsList.value
  ;[arr[idx + 1], arr[idx]] = [arr[idx], arr[idx + 1]]
  syncQAPairsImmediate()
}

function updateExpectedPoints(idx, value) {
  qaPairsList.value[idx].expected_points_str = value
  syncQAPairsImmediate()
}

watch(activeScenarioIndex, () => {
  if (!isSyncing.value && activeSubKey.value === 'examiner') {
    loadQAPairs()
  }
})

watch(activeSubKey, (newVal) => {
  if (!isSyncing.value && newVal === 'examiner') {
    loadQAPairs()
  }
})

watch(() => props.formData.humanity.scenarios, () => {
  if (!isSyncing.value && activeSubKey.value === 'examiner') {
    loadQAPairs()
  }
}, { deep: true })

onMounted(() => {
  ensureHumanityData()
  loadQAPairs()
})
</script>

<style scoped>
.editor-layout-split {
  display: flex;
}

.editor-index-panel {
  width: 280px;
  flex-shrink: 0;
  border-right: 1px solid var(--border);
  background: #fafafa;
  overflow-y: auto;
}

.panel-header {
  padding: 12px;
}

.panel-header-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
}

.panel-title {
  font-weight: 600;
}

.scenario-list {
  display: flex;
  flex-direction: column;
}

.scenario-group {
  margin-bottom: 2px;
}

.scenario-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  cursor: pointer;
  border-radius: 6px;
  transition: background 0.15s;
}

.scenario-header:hover {
  background: #f0f0f0;
}

.scenario-header.active {
  background: var(--primary-light);
  color: var(--primary);
  font-weight: 500;
}

.scenario-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sub-items {
  padding: 4px 0 4px 8px;
}

.sub-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  cursor: pointer;
  border-radius: 4px;
  font-size: 13px;
  color: var(--text-secondary);
  transition: background 0.15s;
}

.sub-item:hover {
  background: #f0f0f0;
}

.sub-item.active {
  background: var(--primary-light);
  color: var(--primary);
  font-weight: 500;
}

.sub-icon {
  font-style: normal;
}

.editor-content-panel {
  flex: 1;
  overflow-y: auto;
}

.content-body {
  padding: 20px;
}

.empty-panel {
  padding: 40px;
  text-align: center;
  color: var(--text-secondary);
}

.scene-basic-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.scene-field {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.scene-field label {
  font-size: 12px;
  color: var(--text-secondary);
}

.scene-field-id {
  min-width: 120px;
  width: 120px;
}

.scene-field-id input {
  background: #f3f4f6;
  color: #6b7280;
}

.scene-field-name {
  flex: 1;
  min-width: 200px;
}

.scene-field-type {
  min-width: 140px;
  width: 140px;
}

.scene-field-target {
  min-width: 140px;
  width: 140px;
}

.section-title {
  margin: 16px 0 12px;
}

.section-label {
  font-weight: 600;
}

.filter-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 140px;
}

.filter-item label {
  font-size: 12px;
  color: var(--text-secondary);
}

.mb-2 {
  margin-bottom: 8px;
}

.mb-3 {
  margin-bottom: 12px;
}

.mt-3 {
  margin-top: 16px;
}

.script-section {
  margin-top: 20px;
}

.script-section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.script-card {
  padding: 12px;
  margin-bottom: 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: white;
}

.script-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.turn-num {
  font-weight: 600;
  color: var(--primary);
}

.script-actions {
  display: flex;
  gap: 6px;
}

.script-card-fields {
  display: flex;
  gap: 12px;
}

.flex-1 {
  flex: 1;
}

.field-mini-label {
  font-size: 12px;
  color: var(--text-secondary);
}

.empty-state {
  text-align: center;
  padding: 20px;
  background: #f9fafb;
  border-radius: 8px;
  color: var(--text-secondary);
}

.scoring-section {
  margin-top: 20px;
}

.scoring-container {
  margin-bottom: 12px;
}

.total-score-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.total-score-row input {
  width: 120px;
}

.score-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border: 1px solid var(--border);
  border-radius: 8px;
}

.score-table th,
.score-table td {
  padding: 8px;
  border-bottom: 1px solid var(--border);
}

.score-table th {
  text-align: left;
  font-weight: 500;
  background: #f9fafb;
}

.col-num {
  width: 40px;
}

.col-score {
  width: 100px;
}

.col-action {
  width: 50px;
}

.score-empty {
  text-align: center;
  padding: 24px;
  color: var(--text-secondary);
}

.dialogue-section {
  margin-top: 20px;
}

.dialogue-groups {
  border: 1px solid var(--border-light);
  border-radius: 8px;
  padding: 8px;
  background: #fafafa;
}

.dialogue-group {
  margin-bottom: 16px;
  padding: 12px;
  background: white;
  border-radius: 8px;
  border-left: 4px solid var(--primary);
}

.dialogue-group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.dialogue-group-label {
  font-weight: 600;
  color: var(--primary);
}

.btn-icon-sm {
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px 4px;
}

.btn-icon-sm:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
