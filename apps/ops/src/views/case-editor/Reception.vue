<template>
  <div class="reception-editor">
    <div class="editor-layout-split">
      <div class="editor-index-panel">
        <div class="index-header">内容模块</div>
        <ul class="index-list">
          <li v-for="item in sections" :key="item.key"
              :class="['index-item', { active: activeSection === item.key }]"
              @click="activeSection = item.key">
            <i>{{ item.icon }}</i>
            <span>{{ item.label }}</span>
          </li>
        </ul>
      </div>

      <div class="editor-content-panel">
        <div v-show="activeSection === 'sp'">
          <div class="content-header">
            <h3>SP剧本</h3>
            <p class="content-desc">标准化病人角色信息、自述与问答脚本</p>
          </div>
          <div class="content-body">
            <div class="sp-role-bar">
              <div class="filter-item" style="min-width:160px">
                <label>SP 扮演角色</label>
                <select class="select" v-model="spRole" @change="onSpRoleChange">
                  <option value="patient">患者本人</option>
                  <option value="family">患者家属</option>
                </select>
              </div>
              <div class="filter-item" v-if="spRole === 'family'" style="min-width:200px">
                <label>与患者关系</label>
                <input class="input" v-model="spRoleInfo.relation" placeholder="如：母亲、父亲、配偶、女儿、儿子">
              </div>
              <div class="filter-item" style="min-width:140px">
                <label>沟通对象</label>
                <input class="input" :value="communicationTargetLabel" disabled style="color:var(--text-secondary);background:#f9fafb">
              </div>
            </div>
            <div class="role-info-grid">
              <div class="filter-item">
                <label>姓名</label>
                <input class="input" v-model="spRoleInfo.name" :placeholder="spRole === 'family' ? '家属姓名' : '患者姓名'">
              </div>
              <div class="filter-item">
                <label>性别</label>
                <select class="select" v-model="spRoleInfo.gender">
                  <option>男</option>
                  <option>女</option>
                </select>
              </div>
              <div class="filter-item">
                <label>年龄</label>
                <input class="input" type="number" v-model.number="spRoleInfo.age" placeholder="年龄">
              </div>
              <div class="filter-item" style="grid-column: span 2">
                <label>情绪状态</label>
                <input class="input" v-model="spRoleInfo.emotion" placeholder="如：痛苦、焦虑...">
              </div>
              <div class="filter-item" style="grid-column: span 3">
                <label>主动提问句</label>
                <input class="input" v-model="spRoleInfo.active_question" placeholder="医生，我这腰疼得厉害...">
              </div>
            </div>

            <div class="filter-item mb-4">
              <label>SP 自述</label>
              <textarea 
                class="input" 
                v-model="formData.reception.sp_materials.self_narration" 
                placeholder="患者用自己的话描述病情..."
              ></textarea>
            </div>

            <div style="margin-top:20px">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
                <label style="font-weight:600">问答脚本</label>
                <div style="display:flex;gap:8px">
                  <button class="btn btn-sm btn-outline" @click="addQAPair">
                    ➕ 添加问答对（医生+患者）
                  </button>
                  <button class="btn btn-sm btn-outline" @click="addPatientActive">
                    💬 添加患者主动问
                  </button>
                </div>
              </div>
              
              <div class="qa-structured-list">
                <div v-for="(turn, idx) in qaTurns" :key="idx" 
                     class="qa-card" 
                     :class="getQACardClass(turn)">
                  <div class="qa-card-header">
                    <span class="qa-speaker-badge">{{ getQASpeakerLabel(turn) }}</span>
                    <div class="qa-card-actions">
                      <button class="btn-icon-sm" @click="moveQAUp(idx)" :disabled="idx === 0">⬆️</button>
                      <button class="btn-icon-sm" @click="moveQADown(idx)" :disabled="idx === qaTurns.length - 1">⬇️</button>
                      <button class="btn-icon-sm" @click="deleteQATurn(idx)">🗑️</button>
                    </div>
                  </div>
                  
                  <div v-if="turn.doctor !== undefined && turn.patient !== undefined">
                    <div class="filter-item mb-2">
                      <label style="font-size:12px; color:var(--text-secondary)">医生提问</label>
                      <textarea class="input qa-card-content" v-model="turn.doctor" placeholder="医生提问或回应..." rows="2"></textarea>
                    </div>
                    <div class="filter-item">
                      <label style="font-size:12px; color:var(--text-secondary)">患者回答</label>
                      <textarea class="input qa-card-content" v-model="turn.patient" placeholder="患者回答..." rows="2"></textarea>
                    </div>
                  </div>

                  <div v-else-if="turn.patient_active !== undefined">
                    <div class="filter-item mb-2">
                      <label style="font-size:12px; color:var(--text-secondary)">患者主动提问</label>
                      <textarea class="input qa-card-content" v-model="turn.patient_active" placeholder="患者主动提问..." rows="2"></textarea>
                    </div>
                    <div class="qa-note">
                      <i>📌</i>
                      <input class="input" v-model="turn.note" placeholder="备注（考官提示）" style="flex:1">
                    </div>
                  </div>
                </div>
                
                <div v-if="qaTurns.length === 0" class="qa-empty-state">
                  <i>💬</i>
                  <p>暂无对话，请点击上方按钮添加</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-show="activeSection === 'examiner'">
          <div class="content-header">
            <h3>考官试卷</h3>
            <p class="content-desc">病情摘要、评分表及诊断与鉴别</p>
          </div>
          <div class="content-body">
            <div class="filter-item mb-4">
              <label>病情摘要</label>
              <textarea class="input" v-model="formData.reception.examiner_materials.summary" placeholder="患者基本信息、查体要点、初步诊断..."></textarea>
            </div>
            
            <div class="score-section">
              <div class="score-section-header">
                <h4>问诊评分项</h4>
                <button class="btn btn-sm" @click="addHistoryItem">+ 添加</button>
              </div>
              <table class="score-table">
                <thead><tr><th>#</th><th style="min-width:240px">评分项目</th><th>分值</th><th></th></tr></thead>
                <tbody>
                  <tr v-for="(item, idx) in formData.reception.examiner_materials.history_score_items" :key="idx">
                    <td>{{ idx + 1 }}</td>
                    <td><input class="input" v-model="item.item" placeholder="评分项" style="width:100%"></td>
                    <td><input class="input" type="number" min="0" v-model.number="item.score" style="width:80px"></td>
                    <td><button class="btn-icon-sm" @click="removeHistoryItem(idx)">🗑️</button></td>
                  </tr>
                  <tr v-if="!formData.reception.examiner_materials.history_score_items.length">
                    <td colspan="4" class="score-empty">暂无评分项</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="score-section">
              <div class="score-section-header">
                <h4>体格检查评分项</h4>
                <button class="btn btn-sm" @click="addPhysicalItem">+ 添加</button>
              </div>
              <table class="score-table">
                <thead><tr><th>#</th><th style="min-width:240px">评分项目</th><th>分值</th><th></th></tr></thead>
                <tbody>
                  <tr v-for="(item, idx) in formData.reception.examiner_materials.physical_score_items" :key="idx">
                    <td>{{ idx + 1 }}</td>
                    <td><input class="input" v-model="item.item" placeholder="评分项" style="width:100%"></td>
                    <td><input class="input" type="number" min="0" v-model.number="item.score" style="width:80px"></td>
                    <td><button class="btn-icon-sm" @click="removePhysicalItem(idx)">🗑️</button></td>
                  </tr>
                  <tr v-if="!formData.reception.examiner_materials.physical_score_items.length">
                    <td colspan="4" class="score-empty">暂无评分项</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="score-section">
              <div class="score-section-header">
                <h4>诊断与鉴别</h4>
              </div>
              <div style="padding:12px">
                <div class="filter-item mb-2">
                  <label>初步诊断</label>
                  <input class="input" v-model="formData.reception.examiner_materials.diagnosis_answer.primary" style="width:100%" placeholder="如：腰椎间盘突出症（L3/4，左侧）">
                </div>
                <div class="filter-item mb-2">
                  <label>初步诊断分值</label>
                  <input class="input" type="number" min="0" v-model.number="formData.reception.examiner_materials.diagnosis_answer.primary_score" style="width:120px">
                </div>
                <div class="filter-item mb-2">
                  <label>鉴别诊断（一行一个）</label>
                  <textarea class="input" v-model="differentialStr" placeholder="腰椎管狭窄症&#10;梨状肌综合征"></textarea>
                </div>
                <div class="filter-item mb-2">
                  <label>鉴别诊断分值</label>
                  <input class="input" type="number" min="0" v-model.number="formData.reception.examiner_materials.diagnosis_answer.differential_score" style="width:120px">
                </div>
              </div>
            </div>

            <div class="score-section">
              <div class="score-section-header">
                <h4>阳性体征</h4>
              </div>
              <div style="padding:12px">
                <div class="filter-item mb-2">
                  <label>一般情况</label>
                  <textarea class="input" v-model="formData.reception.examiner_materials.positive_signs.general" placeholder="患者一般情况..."></textarea>
                </div>
                <div class="filter-item mb-2">
                  <label>压痛</label>
                  <textarea class="input" v-model="formData.reception.examiner_materials.positive_signs.palpation" placeholder="压痛部位及放射..."></textarea>
                </div>
                <div class="filter-item mb-2">
                  <label>直腿抬高试验</label>
                  <input class="input" v-model="formData.reception.examiner_materials.positive_signs.straight_leg_raise" placeholder="如：左侧60°阳性">
                </div>
                <div class="filter-item mb-2">
                  <label>股神经牵拉试验</label>
                  <input class="input" v-model="formData.reception.examiner_materials.positive_signs.femoral_nerve_stretch" placeholder="如：左侧阳性">
                </div>
                <div class="filter-item mb-2">
                  <label>感觉</label>
                  <input class="input" v-model="formData.reception.examiner_materials.positive_signs.sensory" placeholder="如：左小腿前内侧感觉减退">
                </div>
                <div class="filter-item mb-2">
                  <label>肌力</label>
                  <input class="input" v-model="formData.reception.examiner_materials.positive_signs.motor" placeholder="如：股四头肌IV级">
                </div>
                <div class="filter-item mb-2">
                  <label>反射</label>
                  <input class="input" v-model="formData.reception.examiner_materials.positive_signs.reflex" placeholder="如：左膝腱反射减弱">
                </div>
                <div class="filter-item mb-2">
                  <label>病理征</label>
                  <input class="input" v-model="formData.reception.examiner_materials.positive_signs.babinski" placeholder="如：双侧巴氏征阴性">
                </div>
              </div>
            </div>

            <div class="score-section">
              <div class="score-section-header">
                <h4>诊断依据评分项</h4>
                <button class="btn btn-sm" @click="addBasisItem">+ 添加</button>
              </div>
              <table class="score-table">
                <thead><tr><th>#</th><th>诊断依据</th><th>分值</th><th></th></tr></thead>
                <tbody>
                  <tr v-for="(item, idx) in formData.reception.examiner_materials.diagnosis_answer.basis_points" :key="idx">
                    <td>{{ idx + 1 }}</td>
                    <td><input class="input" v-model="item.point" placeholder="诊断依据" style="width:100%"></td>
                    <td><input class="input" type="number" min="0" v-model.number="item.score" style="width:80px"></td>
                    <td><button class="btn-icon-sm" @click="removeBasisItem(idx)">🗑️</button></td>
                  </tr>
                  <tr v-if="!formData.reception.examiner_materials.diagnosis_answer.basis_points.length">
                    <td colspan="4" class="score-empty">暂无诊断依据</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div v-show="activeSection === 'candidate'">
          <div class="content-header">
            <h3>考生材料</h3>
            <p class="content-desc">任务卡与查体结果卡</p>
          </div>
          <div class="content-body">
            <div class="filter-item mb-4">
              <label>考生任务卡</label>
              <textarea class="input" v-model="formData.reception.candidate_materials.task_card" style="white-space:pre-wrap" placeholder="情景
姓名、性别、年龄
主诉
任务描述"></textarea>
            </div>
            <div class="filter-item mb-4">
              <label>考生查体结果卡</label>
              <textarea class="input" v-model="formData.reception.candidate_materials.physical_exam_card" placeholder="步态、压痛、试验结果、肌力、感觉..."></textarea>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, nextTick } from 'vue'

const props = defineProps({
  formData: { type: Object, required: true }
})

const activeSection = ref('sp')

const sections = reactive([
  { key: 'sp', label: 'SP剧本', icon: '📖' },
  { key: 'examiner', label: '考官试卷', icon: '📋' },
  { key: 'candidate', label: '考生材料', icon: '✍️' }
])

const qaTurns = ref([])
let internalUpdate = ref(false)

function cloneQATurns(turns) {
  return turns.map(t => {
    if (t.doctor !== undefined && t.patient !== undefined) {
      return { doctor: t.doctor || '', patient: t.patient || '' }
    }
    if (t.patient_active !== undefined) {
      return { patient_active: t.patient_active || '', note: t.note || '' }
    }
    if (t.doctor !== undefined) {
      return { doctor: t.doctor || '', patient: '' }
    }
    if (t.patient !== undefined) {
      return { doctor: '', patient: t.patient || '' }
    }
    return {}
  })
}

function ensureReceptionData() {
  const r = props.formData.reception
  if (!r.communication_target) r.communication_target = 'patient'
  if (!r.sp_materials) {
    r.sp_materials = {
      role_info: { name: '', gender: '男', age: '', relation: '', emotion: '', active_question: '' },
      self_narration: '',
      qa_script: [],
      role: 'patient'
    }
  } else {
    if (!r.sp_materials.role_info) {
      r.sp_materials.role_info = { name: '', gender: '男', age: '', relation: '', emotion: '', active_question: '' }
    }
    if (r.sp_materials.self_narration === undefined) r.sp_materials.self_narration = ''
    if (!r.sp_materials.qa_script) r.sp_materials.qa_script = []
    if (!r.sp_materials.role) r.sp_materials.role = r.communication_target || 'patient'
  }
  
  if (!r.examiner_materials) {
    r.examiner_materials = {
      summary: '',
      history_score_items: [],
      physical_score_items: [],
      positive_signs: {},
      diagnosis_answer: { primary: '', primary_score: 0, differential: [], differential_score: 0, basis_points: [] }
    }
  } else {
    if (r.examiner_materials.summary === undefined) r.examiner_materials.summary = ''
    if (!r.examiner_materials.history_score_items) r.examiner_materials.history_score_items = []
    if (!r.examiner_materials.physical_score_items) r.examiner_materials.physical_score_items = []
    if (!r.examiner_materials.positive_signs) r.examiner_materials.positive_signs = {}
    if (!r.examiner_materials.diagnosis_answer) {
      r.examiner_materials.diagnosis_answer = { primary: '', primary_score: 0, differential: [], differential_score: 0, basis_points: [] }
    } else {
      const da = r.examiner_materials.diagnosis_answer
      if (da.primary === undefined) da.primary = ''
      if (da.primary_score === undefined) da.primary_score = 0
      if (!da.differential) da.differential = []
      if (da.differential_score === undefined) da.differential_score = 0
      if (!da.basis_points) da.basis_points = []
    }
  }
  
  if (!r.candidate_materials) {
    r.candidate_materials = { task_card: '', physical_exam_card: '' }
  } else {
    if (r.candidate_materials.task_card === undefined) r.candidate_materials.task_card = ''
    if (r.candidate_materials.physical_exam_card === undefined) r.candidate_materials.physical_exam_card = ''
  }
}

const spRole = computed({
  get() {
    return props.formData.reception.sp_materials?.role || props.formData.reception.communication_target || 'patient'
  },
  set(val) {
    ensureReceptionData()
    props.formData.reception.communication_target = val
    if (props.formData.reception.sp_materials) {
      props.formData.reception.sp_materials.role = val
    }
    if (val === 'patient') {
      spRoleInfo.value = { ...spRoleInfo.value, relation: '' }
    }
  }
})

const communicationTargetLabel = computed(() => {
  return spRole.value === 'family' ? '家属' : '患者本人'
})

function onSpRoleChange(val) {
  spRole.value = val
}

const spRoleInfo = computed({
  get() {
    const mats = props.formData.reception.sp_materials
    if (!mats || !mats.role_info) {
      return { name: '', gender: '男', age: '', relation: '', emotion: '', active_question: '' }
    }
    return mats.role_info
  },
  set(val) {
    if (!props.formData.reception.sp_materials) {
      props.formData.reception.sp_materials = { role_info: val, self_narration: '', qa_script: [] }
    }
    props.formData.reception.sp_materials.role_info = val
  }
})

const differentialStr = computed({
  get() {
    const arr = props.formData.reception.examiner_materials.diagnosis_answer.differential
    return (arr || []).join('\n')
  },
  set(val) {
    props.formData.reception.examiner_materials.diagnosis_answer.differential = val.split('\n').filter(s => s.trim())
  }
})

watch(
  () => props.formData.reception.sp_materials.qa_script,
  (newVal) => {
    if (!internalUpdate.value) {
      qaTurns.value = cloneQATurns(newVal || [])
    }
  },
  { immediate: true, deep: true }
)

watch(
  qaTurns,
  () => {
    internalUpdate.value = true
    if (!props.formData.reception.sp_materials) {
      props.formData.reception.sp_materials = { role_info: spRoleInfo.value, self_narration: '', qa_script: [] }
    }
    props.formData.reception.sp_materials.qa_script = cloneQATurns(qaTurns.value)
    nextTick(() => { internalUpdate.value = false })
  },
  { deep: true }
)

function getQACardClass(turn) {
  if (turn.patient_active !== undefined) return 'qa-patient-active'
  return 'qa-doctor'
}

function getQASpeakerLabel(turn) {
  if (turn.patient_active !== undefined) return '患者主动问'
  return '医生 ↔ 患者'
}

function addQAPair() { qaTurns.value.push({ doctor: '', patient: '' }) }
function addPatientActive() { qaTurns.value.push({ patient_active: '', note: '' }) }
function deleteQATurn(idx) { qaTurns.value.splice(idx, 1) }

function moveQAUp(idx) {
  if (idx > 0) {
    const temp = qaTurns.value[idx]
    qaTurns.value.splice(idx, 1)
    qaTurns.value.splice(idx - 1, 0, temp)
  }
}

function moveQADown(idx) {
  if (idx < qaTurns.value.length - 1) {
    const temp = qaTurns.value[idx]
    qaTurns.value.splice(idx, 1)
    qaTurns.value.splice(idx + 1, 0, temp)
  }
}

function addHistoryItem() {
  props.formData.reception.examiner_materials.history_score_items.push({ item: '', score: 0 })
}

function removeHistoryItem(idx) {
  props.formData.reception.examiner_materials.history_score_items.splice(idx, 1)
}

function addPhysicalItem() {
  props.formData.reception.examiner_materials.physical_score_items.push({ item: '', score: 0 })
}

function removePhysicalItem(idx) {
  props.formData.reception.examiner_materials.physical_score_items.splice(idx, 1)
}

function addBasisItem() {
  props.formData.reception.examiner_materials.diagnosis_answer.basis_points.push({ point: '', score: 0 })
}

function removeBasisItem(idx) {
  props.formData.reception.examiner_materials.diagnosis_answer.basis_points.splice(idx, 1)
}

function updateDifferential(e) {
  props.formData.reception.examiner_materials.diagnosis_answer.differential = e.target.value.split('\n').filter(s => s.trim())
}

onMounted(() => {
  ensureReceptionData()
  qaTurns.value = cloneQATurns(props.formData.reception.sp_materials.qa_script || [])
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

.sp-role-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 16px;
  padding: 12px 16px;
  margin-bottom: 16px;
  background: #f0f4ff;
  border: 1px solid #dbeafe;
  border-radius: 8px;
}

.role-info-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 16px;
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

.mb-2 { margin-bottom: 8px; }
.mb-4 { margin-bottom: 16px; }

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

.qa-structured-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.qa-card {
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 12px;
  background: white;
}

.qa-card.qa-doctor {
  border-left: 3px solid var(--primary);
}

.qa-card.qa-patient-active {
  border-left: 3px solid var(--warning);
}

.qa-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.qa-speaker-badge {
  font-size: 12px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--border-light);
}

.qa-card-actions {
  display: flex;
  gap: 4px;
}

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

.btn-icon-sm:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.qa-card-content {
  resize: vertical;
}

.qa-note {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-tertiary);
  font-size: 13px;
}

.qa-empty-state {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-tertiary);
}

.qa-empty-state i {
  font-size: 32px;
  font-style: normal;
}

.qa-empty-state p {
  margin-top: 8px;
  font-size: 13px;
}

.score-section {
  margin-bottom: 24px;
  border: 1px solid var(--border-light);
  border-radius: 8px;
  overflow: hidden;
}

.score-section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--primary-light);
}

.score-section-header h4 {
  margin: 0;
  font-size: 14px;
  color: var(--primary-dark);
}

.score-table {
  width: 100%;
  border-collapse: collapse;
}

.score-table th {
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-tertiary);
  text-align: left;
  border-bottom: 1px solid var(--border-light);
}

.score-table td {
  padding: 6px 12px;
  font-size: 13px;
  border-bottom: 1px solid var(--border-light);
}

.score-table tr:last-child td {
  border-bottom: none;
}

.score-empty {
  text-align: center;
  padding: 20px;
  color: var(--text-tertiary);
  font-size: 13px;
}
</style>
