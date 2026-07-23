<template>
  <div class="treatment-panel">
    <div class="panel-section">
      <h4><i class="fas fa-pills"></i> 一般治疗</h4>
      <div class="checkbox-group">
        <label v-for="opt in generalOptions" :key="opt" class="general-check">
          <input type="checkbox" :checked="generalTreatment.includes(opt)" :disabled="disabled" @change="toggleGeneral(opt)" />
          {{ opt }}
        </label>
      </div>
      <input v-model="generalCustom" type="text" class="custom-input" placeholder="自定义一般治疗措施" :disabled="disabled" @input="emitChange" />
    </div>

    <div class="panel-section">
      <h4><i class="fas fa-prescription"></i> 药物治疗</h4>
      <div v-for="(med, idx) in medications" :key="idx" class="med-card">
        <div class="med-row">
          <input v-model="med.drug" class="med-drug" placeholder="药品名称" :disabled="disabled" @input="emitChange" />
          <input v-model="med.dosage" class="med-small" placeholder="剂量" :disabled="disabled" @input="emitChange" />
          <input v-model="med.frequency" class="med-small" placeholder="频次" :disabled="disabled" @input="emitChange" />
          <select v-model="med.route" class="med-route" :disabled="disabled" @change="emitChange">
            <option value="">途径</option>
            <option value="po">口服 po</option>
            <option value="ivgtt">静滴 ivgtt</option>
            <option value="iv">静注 iv</option>
            <option value="im">肌注 im</option>
            <option value="ih">皮下 ih</option>
            <option value="inh">吸入 inh</option>
          </select>
          <input v-model="med.duration" class="med-small" placeholder="疗程" :disabled="disabled" @input="emitChange" />
          <button v-if="!disabled" class="btn-remove-med" @click="removeMed(idx)" title="删除">
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>
      <button v-if="!disabled" class="btn-add" @click="addMed">
        <i class="fas fa-plus"></i> 添加药品
      </button>
    </div>

    <div class="panel-section">
      <h4><i class="fas fa-heartbeat"></i> 监测与随访</h4>
      <textarea v-model="monitoring" rows="3" class="textarea" :disabled="disabled" placeholder="治疗监测计划、复查项目、出院标准等" @input="emitChange"></textarea>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  disabled: { type: Boolean, default: false }
})

const emit = defineEmits(['change'])

const generalOptions = ['卧床休息', '吸氧', '心电监护', '清淡饮食', '多饮水', '戒烟限酒', '健康教育']
const generalTreatment = ref([])
const generalCustom = ref('')
const medications = ref([{ drug: '', dosage: '', frequency: '', route: '', duration: '' }])
const monitoring = ref('')

function toggleGeneral(opt) {
  const idx = generalTreatment.value.indexOf(opt)
  if (idx >= 0) generalTreatment.value.splice(idx, 1)
  else generalTreatment.value.push(opt)
  emitChange()
}

function addMed() {
  medications.value.push({ drug: '', dosage: '', frequency: '', route: '', duration: '' })
}

function removeMed(idx) {
  if (medications.value.length > 1) medications.value.splice(idx, 1)
  emitChange()
}

function emitChange() {
  emit('change', getData())
}

function getData() {
  return {
    general: [...generalTreatment.value, generalCustom.value].filter(Boolean),
    medication: medications.value.filter(m => m.drug.trim()),
    monitoring: monitoring.value
  }
}

defineExpose({ getData })
</script>

<style scoped>
.treatment-panel { background: var(--card-bg, #fff); border-radius: 8px; padding: 20px; }
.panel-section { margin-bottom: 24px; }
.panel-section:last-child { margin-bottom: 0; }
.panel-section h4 { margin: 0 0 12px; font-size: 14px; color: var(--text-main); }

.checkbox-group { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 10px; }
.general-check { display: flex; align-items: center; gap: 6px; font-size: 13px; cursor: pointer; }
.custom-input { width: 100%; padding: 8px 12px; border: 1px solid var(--border); border-radius: 6px; font-size: 13px; box-sizing: border-box; }

.med-card { margin-bottom: 10px; padding: 10px; border: 1px solid var(--border); border-radius: 6px; background: #fafafa; }
.med-row { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
.med-drug { flex: 1.5; min-width: 120px; padding: 6px 8px; border: 1px solid var(--border); border-radius: 4px; font-size: 13px; }
.med-small { flex: 1; min-width: 70px; padding: 6px 8px; border: 1px solid var(--border); border-radius: 4px; font-size: 13px; }
.med-route { flex: 1; min-width: 90px; padding: 6px 8px; border: 1px solid var(--border); border-radius: 4px; font-size: 13px; background: #fff; }
.btn-remove-med { background: none; border: none; color: #ef4444; cursor: pointer; padding: 4px; }
.btn-add {
  background: none; border: 1px dashed var(--border); color: var(--primary); cursor: pointer;
  padding: 8px 16px; border-radius: 6px; font-size: 13px; width: 100%;
}
.btn-add:hover { background: #eff6ff; border-color: var(--primary); }
.textarea { width: 100%; padding: 8px 12px; border: 1px solid var(--border); border-radius: 6px; font-size: 13px; resize: vertical; box-sizing: border-box; min-height: 80px; }
.textarea:focus, .custom-input:focus, .med-drug:focus, .med-small:focus, .med-route:focus { outline: none; border-color: var(--primary); }
</style>
