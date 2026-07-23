<template>
  <div class="analysis-editor">
    <div class="editor-layout-split">
      <div class="editor-index-panel">
        <div class="index-header">
          <span>版本切换</span>
        </div>
        <ul class="index-list">
          <li 
            v-for="mode in versions" 
            :key="mode.key"
            :class="['index-item', { active: activeVersion === mode.key }]"
            @click="activeVersion = mode.key"
          >
            <i>{{ mode.icon }}</i>
            <span>{{ mode.label }}</span>
          </li>
        </ul>
        <div class="index-footer">
          <p class="mode-hint">
            ℹ️
            {{ activeVersion === 'examiner' ? '考官使用的评分标准与参考答案' : '考生看到的病例信息与问题' }}
          </p>
        </div>
      </div>

      <div class="editor-content-panel">
        <div class="content-header">
          <h3>{{ activeVersion === 'examiner' ? '考官版' : '考生版' }}</h3>
          <p class="content-desc">{{ activeVersion === 'examiner' ? '考官摘要、教学要点及步骤评分标准' : '病例标题及各步骤呈现信息与问题' }}</p>
        </div>
        <div class="content-body">
          <div v-if="activeVersion === 'examiner'">
            <div class="filter-item mb-3">
              <label>病例摘要（考官用）</label>
              <textarea class="input" v-model="formData.analysis.examiner_version.summary"></textarea>
            </div>
            <div class="filter-item mb-4">
              <label>教学要点（一行一个）</label>
              <textarea class="input" :value="teachingPointsStr" @input="updateTeachingPoints"></textarea>
            </div>

            <div style="border-top:1px solid var(--border);padding-top:16px;margin-top:8px">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
                <h4 style="margin:0">步骤</h4>
                <button class="btn btn-sm" @click="addExaminerStep">+ 新增步骤</button>
              </div>
              <div v-for="(step, idx) in formData.analysis.examiner_version.steps" :key="idx" style="margin-bottom:24px;padding:16px;background:#f9fafb;border-radius:8px">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
                  <h5 style="margin:0;color:var(--primary)">步骤 {{ idx + 1 }}</h5>
                  <button class="btn-icon-sm" @click="deleteExaminerStep(idx)" v-if="formData.analysis.examiner_version.steps.length > 1" style="color:var(--error)">🗑️ 删除</button>
                </div>
                <div class="filter-item mb-3">
                  <label>标题</label>
                  <input class="input" v-model="step.title" placeholder="如：初步诊断与高危因素">
                </div>
                <div class="filter-item mb-3">
                  <label>呈现信息</label>
                  <textarea class="input" v-model="step.presented_info" placeholder="向考生展示的病例信息..."></textarea>
                </div>
                <div class="filter-item mb-3">
                  <label>考官补充信息</label>
                  <textarea class="input" v-model="step.supplementary_info" placeholder="供考官参考的补充信息（若考生询问...）"></textarea>
                </div>
                <div class="filter-item mb-3">
                  <label>问题</label>
                  <textarea class="input" v-model="step.question" placeholder="（1）... （2）..."></textarea>
                </div>
                <div class="filter-item mb-3">
                  <label>参考答案</label>
                  <textarea class="input" v-model="step.reference_answer" placeholder="考官参考的详细答案..."></textarea>
                </div>
                <div class="filter-item">
                  <label>评分标准</label>
                  <div class="sg-editor">
                    <div class="sg-total-row">
                      <span class="sg-total-label">满分</span>
                      <input class="input sg-total-input" type="number" min="0" step="0.5" :value="getScoringTotal(step)" @input="setScoringTotal(step, $event.target.value)" placeholder="0">
                      <span class="sg-total-suffix">分</span>
                    </div>
                    <div class="sg-criteria-list">
                      <div v-for="(c, ci) in getScoringCriteria(step)" :key="ci" class="sg-criteria-row">
                        <span class="sg-criteria-num">{{ ci + 1 }}</span>
                        <input class="input sg-criteria-item" :value="c.item" @input="updateScoringCriteria(step, ci, 'item', $event.target.value)" placeholder="评分项描述">
                        <input class="input sg-criteria-score" type="number" min="0" step="0.5" :value="c.score" @input="updateScoringCriteria(step, ci, 'score', parseFloat($event.target.value) || 0)" placeholder="0">
                        <span class="sg-criteria-suffix">分</span>
                        <button class="btn-icon-sm sg-criteria-del" @click="deleteScoringCriteria(step, ci)" title="删除">×</button>
                      </div>
                      <div v-if="getScoringCriteria(step).length === 0" class="sg-criteria-empty">暂无评分项，请添加</div>
                    </div>
                    <button class="btn btn-sm btn-outline" @click="addScoringCriteria(step)" style="margin-top:6px">+ 添加评分项</button>
                  </div>
                </div>
              </div>
              <div v-if="formData.analysis.examiner_version.steps.length === 0" style="text-align:center;padding:20px;color:var(--text-secondary)">
                暂无步骤，请点击"新增步骤"
              </div>
            </div>
          </div>

          <div v-else>
            <div class="filter-item mb-4">
              <label>病例标题（考生版）</label>
              <input class="input" v-model="formData.analysis.candidate_version.title" style="width:100%" placeholder="如：病例摘要（骨科/康复科临床思维考站）">
            </div>

            <div style="border-top:1px solid var(--border);padding-top:16px;margin-top:8px">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
                <h4 style="margin:0">步骤</h4>
                <button class="btn btn-sm" @click="addCandidateStep">+ 新增步骤</button>
              </div>
              <div v-for="(step, idx) in formData.analysis.candidate_version.steps" :key="idx" style="margin-bottom:24px;padding:16px;background:#f9fafb;border-radius:8px">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
                  <h5 style="margin:0;color:var(--primary)">步骤 {{ idx + 1 }}</h5>
                  <button class="btn-icon-sm" @click="deleteCandidateStep(idx)" v-if="formData.analysis.candidate_version.steps.length > 1" style="color:var(--error)">🗑️ 删除</button>
                </div>
                <div class="filter-item mb-3">
                  <label>呈现信息</label>
                  <textarea class="input" v-model="step.presented_info" placeholder="向考生展示的病例信息..."></textarea>
                </div>
                <div class="filter-item">
                  <label>问题</label>
                  <textarea class="input" v-model="step.question" placeholder="（1）... （2）..."></textarea>
                </div>
              </div>
              <div v-if="formData.analysis.candidate_version.steps.length === 0" style="text-align:center;padding:20px;color:var(--text-secondary)">
                暂无步骤，请点击"新增步骤"
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { toast, confirm } from '@ai-sp/shared'

const props = defineProps({
  formData: { type: Object, required: true }
})

const activeVersion = ref('examiner')

const versions = reactive([
  { key: 'examiner', label: '考官版', icon: '📋' },
  { key: 'candidate', label: '考生版', icon: '✍️' }
])

const teachingPointsStr = computed(() => {
  const pts = props.formData.analysis.examiner_version.teaching_points || []
  return pts.join('\n')
})

function ensureAnalysisData() {
  const a = props.formData.analysis
  if (!a.examiner_version) {
    a.examiner_version = { summary: '', teaching_points: [], steps: [] }
  }
  if (!a.examiner_version.teaching_points) {
    a.examiner_version.teaching_points = []
  }
  if (!a.examiner_version.steps || a.examiner_version.steps.length === 0) {
    a.examiner_version.steps = [createEmptyExaminerStep()]
  }
  if (!a.candidate_version) {
    a.candidate_version = { title: '', steps: [] }
  }
  if (!a.candidate_version.steps || a.candidate_version.steps.length === 0) {
    a.candidate_version.steps = [createEmptyCandidateStep()]
  }
}

function createEmptyExaminerStep() {
  return {
    title: '',
    presented_info: '',
    supplementary_info: '',
    question: '',
    reference_answer: '',
    scoring_guide: { total_score: 0, criteria: [] }
  }
}

function createEmptyCandidateStep() {
  return {
    presented_info: '',
    question: ''
  }
}

function ensureScoringGuide(step) {
  if (!step.scoring_guide) {
    step.scoring_guide = { total_score: 0, criteria: [] }
  } else if (typeof step.scoring_guide === 'string') {
    step.scoring_guide = parseScoringGuideString(step.scoring_guide)
  }
  if (!step.scoring_guide.criteria) step.scoring_guide.criteria = []
  if (step.scoring_guide.total_score === undefined) step.scoring_guide.total_score = 0
}

function parseScoringGuideString(str) {
  if (!str || !str.trim()) return { total_score: 0, criteria: [] }
  const lines = str.split('\n').map(s => s.trim()).filter(Boolean)
  let total_score = 0
  const criteria = []
  for (const line of lines) {
    const scoreMatch = line.match(/满分[：:]\s*(\d+\.?\d*)\s*分?/)
    if (scoreMatch) { total_score = parseFloat(scoreMatch[1]) || 0; continue }
    const itemMatch = line.match(/^[•\-\*]\s*(.+?)[（(](\d+\.?\d*)\s*分[）)]$/)
    if (itemMatch) { criteria.push({ item: itemMatch[1].trim(), score: parseFloat(itemMatch[2]) || 0 }); continue }
    const plainMatch = line.match(/^[•\-\*]\s*(.+)/)
    if (plainMatch) { criteria.push({ item: plainMatch[1].trim(), score: 0 }); continue }
  }
  return { total_score, criteria }
}

function getScoringTotal(step) {
  ensureScoringGuide(step)
  return step.scoring_guide.total_score
}

function setScoringTotal(step, val) {
  ensureScoringGuide(step)
  step.scoring_guide.total_score = parseFloat(val) || 0
}

function getScoringCriteria(step) {
  ensureScoringGuide(step)
  return step.scoring_guide.criteria
}

function addScoringCriteria(step) {
  ensureScoringGuide(step)
  step.scoring_guide.criteria.push({ item: '', score: 0 })
}

function updateScoringCriteria(step, ci, field, value) {
  ensureScoringGuide(step)
  if (step.scoring_guide.criteria[ci]) {
    step.scoring_guide.criteria[ci][field] = value
  }
}

function deleteScoringCriteria(step, ci) {
  step.scoring_guide.criteria.splice(ci, 1)
}

function addExaminerStep() {
  props.formData.analysis.examiner_version.steps.push(createEmptyExaminerStep())
}

function deleteExaminerStep(idx) {
  if (props.formData.analysis.examiner_version.steps.length <= 1) {
    toast.show('至少保留一个步骤')
    return
  }
  props.formData.analysis.examiner_version.steps.splice(idx, 1)
}

function addCandidateStep() {
  props.formData.analysis.candidate_version.steps.push(createEmptyCandidateStep())
}

function deleteCandidateStep(idx) {
  if (props.formData.analysis.candidate_version.steps.length <= 1) {
    toast.show('至少保留一个步骤')
    return
  }
  props.formData.analysis.candidate_version.steps.splice(idx, 1)
}

function updateTeachingPoints(e) {
  props.formData.analysis.examiner_version.teaching_points = e.target.value.split('\n').filter(s => s.trim())
}

onMounted(() => {
  ensureAnalysisData()
})
</script>

<style scoped>
.editor-layout-split {
  display: flex;
  gap: 0;
}

.editor-index-panel {
  width: 200px;
  min-width: 200px;
  border-right: 1px solid var(--border);
  background: var(--card-bg);
  display: flex;
  flex-direction: column;
}

.index-header {
  padding: 16px;
  font-weight: 600;
  font-size: 14px;
  color: var(--text-main);
  border-bottom: 1px solid var(--border-light);
}

.index-list {
  list-style: none;
  padding: 8px;
  flex: 1;
}

.index-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  color: var(--text-secondary);
  transition: all .15s;
}

.index-item:hover {
  background: var(--primary-light);
  color: var(--primary);
}

.index-item.active {
  background: var(--primary-lightest);
  color: var(--primary);
  font-weight: 600;
}

.index-footer {
  padding: 12px 16px;
  border-top: 1px solid var(--border-light);
}

.mode-hint {
  font-size: 12px;
  color: var(--text-tertiary);
  line-height: 1.5;
  margin: 0;
}

.editor-content-panel {
  flex: 1;
  overflow-y: auto;
  padding: 0;
  min-width: 0;
}

.content-header {
  padding: 16px 24px;
  border-bottom: 1px solid var(--border-light);
}

.content-header h3 {
  margin: 0 0 4px;
  font-size: 16px;
  color: var(--text-main);
}

.content-desc {
  margin: 0;
  font-size: 12px;
  color: var(--text-tertiary);
}

.content-body {
  padding: 20px 24px;
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

.mb-3 { margin-bottom: 12px; }
.mb-4 { margin-bottom: 16px; }

.btn-icon-sm {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  padding: 2px 4px;
  border-radius: 4px;
  transition: background .15s;
}

.btn-icon-sm:hover {
  background: var(--border-light);
}

/* ── scoring guide structured editor ── */
.sg-editor {
  border: 1px solid var(--border-light);
  border-radius: 8px;
  padding: 10px 12px;
  background: #fafbfc;
}

.sg-total-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px dashed var(--border-light);
}

.sg-total-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
}

.sg-total-input {
  width: 64px;
  text-align: center;
  font-weight: 600;
  color: var(--primary);
}

.sg-total-suffix {
  font-size: 12px;
  color: var(--text-tertiary);
}

.sg-criteria-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sg-criteria-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px 0;
}

.sg-criteria-num {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e5e7eb;
  border-radius: 50%;
  font-size: 11px;
  font-weight: 600;
  color: #6b7280;
  flex-shrink: 0;
}

.sg-criteria-item {
  flex: 1;
  font-size: 12px;
}

.sg-criteria-score {
  width: 52px;
  text-align: center;
  font-weight: 600;
  color: var(--primary);
}

.sg-criteria-suffix {
  font-size: 12px;
  color: var(--text-tertiary);
}

.sg-criteria-del {
  color: #d1d5db;
  flex-shrink: 0;
}

.sg-criteria-del:hover {
  color: #ef4444;
  background: #fef2f2;
}

.sg-criteria-empty {
  text-align: center;
  padding: 8px;
  color: var(--text-tertiary);
  font-size: 12px;
}
</style>
