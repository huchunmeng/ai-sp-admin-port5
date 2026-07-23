<template>
  <div class="physical-exam-panel">
    <div class="exam-layout">
      <div class="exam-left">
        <h4><i class="fas fa-stethoscope"></i> 体格检查结果（病例提供）</h4>
        <div class="case-data-display">
          <div class="data-section">
            <h5>生命体征</h5>
            <p>{{ vitalSigns || '(无数据)' }}</p>
          </div>
          <div class="data-section">
            <h5>一般情况</h5>
            <p>{{ general || '(无数据)' }}</p>
          </div>
          <div class="data-section">
            <h5>系统检查</h5>
            <p>{{ systemic || '(无数据)' }}</p>
          </div>
        </div>
      </div>

      <div class="exam-right">
        <h4><i class="fas fa-clipboard-check"></i> 你的观察记录</h4>
        <p class="hint">请阅读左侧体检数据，提炼关键阳性/阴性体征并记录在下方：</p>
        <div class="observation-section">
          <label>生命体征</label>
          <textarea v-model="obs.vitalSigns" rows="1" :disabled="disabled" placeholder="T/P/R/BP/SpO2" @input="emitChange"></textarea>
        </div>
        <div class="observation-section">
          <label>阳性体征</label>
          <textarea v-model="obs.positive" rows="3" :disabled="disabled" placeholder="异常发现..." @input="emitChange"></textarea>
        </div>
        <div class="observation-section">
          <label>阴性体征（有鉴别意义的正常发现）</label>
          <textarea v-model="obs.negative" rows="3" :disabled="disabled" placeholder="排除性发现..." @input="emitChange"></textarea>
        </div>
        <div class="observation-section">
          <label>整体评估</label>
          <textarea v-model="obs.summary" rows="2" :disabled="disabled" placeholder="综合评估..." @input="emitChange"></textarea>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { getVitalSigns, getGeneralInspection, getSystemicExam } from '../physical-exam-engine.js'

const props = defineProps({
  caseData: { type: Object, required: true },
  disabled: { type: Boolean, default: false }
})

const emit = defineEmits(['change'])

const obs = ref({ vitalSigns: '', positive: '', negative: '', summary: '' })

const vitalSigns = computed(() => getVitalSigns(props.caseData))
const general = computed(() => getGeneralInspection(props.caseData))
const systemic = computed(() => getSystemicExam(props.caseData))

function emitChange() {
  emit('change', getData())
}

function getData() {
  return {
    physicalExamResults: {
      vitalSigns: obs.value.vitalSigns,
      positive: obs.value.positive,
      negative: obs.value.negative,
      summary: obs.value.summary
    },
    fullText: [obs.value.vitalSigns, obs.value.positive, obs.value.negative, obs.value.summary]
      .filter(Boolean).join('\n')
  }
}

defineExpose({ getData })
</script>

<style scoped>
.physical-exam-panel { background: var(--card-bg, #fff); border-radius: 8px; }
.exam-layout { display: flex; min-height: 450px; }
.exam-layout h4 { margin: 0 0 12px; font-size: 14px; color: var(--text-main); }
.hint { font-size: 12px; color: var(--text-secondary); margin-bottom: 12px; }

.exam-left {
  width: 380px; padding: 20px; border-right: 1px solid var(--border);
  overflow-y: auto; max-height: 600px; background: #fafafa;
}
.case-data-display { font-size: 13px; line-height: 1.6; }
.data-section { margin-bottom: 16px; }
.data-section h5 { margin: 0 0 4px; font-size: 12px; color: var(--text-secondary); text-transform: uppercase; }
.data-section p { margin: 0; white-space: pre-wrap; }

.exam-right { flex: 1; padding: 20px; overflow-y: auto; max-height: 600px; }
.observation-section { margin-bottom: 14px; }
.observation-section label { display: block; font-size: 13px; font-weight: 500; margin-bottom: 4px; color: var(--text-main); }
.observation-section textarea {
  width: 100%; padding: 8px 12px; border: 1px solid var(--border); border-radius: 6px;
  font-size: 13px; line-height: 1.5; resize: vertical; box-sizing: border-box; font-family: inherit;
}
.observation-section textarea:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 2px rgba(37,99,235,0.1); }
</style>
