<template>
  <div class="diagnosis-panel">
    <div class="panel-section">
      <h4><i class="fas fa-diagnoses"></i> 初步诊断</h4>

      <div class="diagnosis-inputs">
        <div v-for="(d, idx) in diagnoses" :key="idx" class="diagnosis-entry">
          <div class="entry-row">
            <input
              v-model="d.name"
              type="text"
              class="primary-input"
              placeholder="输入诊断名称，如：社区获得性肺炎(右侧)"
              :disabled="disabled"
              @input="emitChange"
            />
            <button v-if="diagnoses.length > 1 && !disabled" class="btn-remove" @click="removeDiagnosis(idx)" title="删除">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="entry-row secondary">
            <input v-model="d.icdCode" type="text" class="small-input" placeholder="ICD编码(选填)" :disabled="disabled" @input="emitChange" />
            <select v-model="d.confidence" class="small-select" :disabled="disabled" @change="emitChange">
              <option value="">置信度</option>
              <option value="高">高</option>
              <option value="中">中</option>
              <option value="低">低</option>
            </select>
          </div>
        </div>
        <button v-if="!disabled" class="btn-add" @click="addDiagnosis">
          <i class="fas fa-plus"></i> 添加诊断
        </button>
      </div>
    </div>

    <div v-if="evidenceOptions.length > 0" class="panel-section">
      <h4><i class="fas fa-microscope"></i> 诊断依据</h4>
      <p class="section-hint">从前序阶段中选择支持该诊断的证据</p>
      <label v-for="evo in evidenceOptions" :key="evo.text" class="evidence-item" :class="{ checked: selectedEvidence.has(evo.text) }">
        <input type="checkbox" :checked="selectedEvidence.has(evo.text)" :disabled="disabled" @change="toggleEvidence(evo)" />
        <span class="evidence-source">{{ evo.source === 'history' ? '病史' : evo.source === 'physicalExam' ? '体检' : '辅查' }}</span>
        <span class="evidence-text">{{ truncate(evo.text, 60) }}</span>
      </label>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  caseData: { type: Object, default: () => ({}) },
  sessionData: { type: Object, default: () => ({}) },
  evidenceOptions: { type: Array, default: () => [] },
  disabled: { type: Boolean, default: false }
})

const emit = defineEmits(['change'])

const diagnoses = ref([{ name: '', icdCode: '', confidence: '' }])
const selectedEvidence = ref(new Set())

function addDiagnosis() {
  diagnoses.value.push({ name: '', icdCode: '', confidence: '' })
}

function removeDiagnosis(idx) {
  if (diagnoses.value.length > 1) diagnoses.value.splice(idx, 1)
  emitChange()
}

function toggleEvidence(evo) {
  if (selectedEvidence.value.has(evo.text)) {
    selectedEvidence.value.delete(evo.text)
  } else {
    selectedEvidence.value.add(evo.text)
  }
  emitChange()
}

function emitChange() {
  emit('change', getData())
}

function truncate(text, len) {
  if (!text) return ''
  return text.length > len ? text.slice(0, len) + '...' : text
}

function getData() {
  return {
    diagnoses: diagnoses.value.filter(d => d.name.trim()),
    evidence: Array.from(selectedEvidence.value)
  }
}

defineExpose({ getData })
</script>

<style scoped>
.diagnosis-panel { background: var(--card-bg, #fff); border-radius: 8px; padding: 20px; }
.panel-section { margin-bottom: 24px; }
.panel-section:last-child { margin-bottom: 0; }
.panel-section h4 { margin: 0 0 12px; font-size: 14px; color: var(--text-main); }
.section-hint { font-size: 12px; color: var(--text-secondary); margin: -8px 0 8px; }

.diagnosis-entry { margin-bottom: 12px; }
.entry-row { display: flex; gap: 8px; align-items: center; margin-bottom: 6px; }
.entry-row.secondary { padding-left: 0; }
.primary-input { flex: 1; padding: 8px 12px; border: 1px solid var(--border); border-radius: 6px; font-size: 14px; }
.primary-input:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 2px rgba(37,99,235,0.15); }
.small-input { width: 160px; padding: 6px 10px; border: 1px solid var(--border); border-radius: 4px; font-size: 13px; }
.small-select { width: 100px; padding: 6px 10px; border: 1px solid var(--border); border-radius: 4px; font-size: 13px; background: #fff; }
.btn-remove { background: none; border: none; color: var(--error); cursor: pointer; padding: 4px 8px; font-size: 14px; }
.btn-remove:hover { color: #dc2626; }
.btn-add { background: none; border: 1px dashed var(--border); color: var(--primary); cursor: pointer; padding: 8px 16px; border-radius: 6px; font-size: 13px; width: 100%; }
.btn-add:hover { background: #eff6ff; border-color: var(--primary); }

.evidence-item {
  display: flex; align-items: center; gap: 8px; padding: 8px 12px;
  font-size: 13px; cursor: pointer; border-radius: 4px;
}
.evidence-item:hover { background: #f9fafb; }
.evidence-item.checked { background: #eff6ff; }
.evidence-source { font-size: 11px; padding: 1px 6px; border-radius: 8px; background: #e5e7eb; color: #4b5563; white-space: nowrap; }
.evidence-text { color: var(--text-main); }
</style>
