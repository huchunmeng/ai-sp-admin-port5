<template>
  <div class="rwb-patient">
    <div class="rwb-patient-body">
      <div v-for="row in rows" :key="row.k" class="rwb-patient-item">
        <span class="rwb-patient-k">{{ row.k }}</span>
        <span class="rwb-patient-v">{{ row.v }}</span>
        <button class="rwb-copy" title="复制到报告" @click="copy(row)">
          <i class="fa-solid fa-copy"></i>
        </button>
      </div>

      <div class="rwb-patient-item rwb-clinical">
        <span class="rwb-patient-k">临床主要信息及检查目的</span>
        <button class="rwb-copy" title="整段复制到报告" @click="copyClinical">
          <i class="fa-solid fa-copy"></i>
        </button>
      </div>
      <div class="rwb-clinical-text">{{ sample.clinicalBrief }}</div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { toast } from '@ai-sp/shared'
import { DEIDENTIFY_ROWS } from '@ai-sp/shared/imaging'

const props = defineProps({
  sample: { type: Object, required: true }
})
const emit = defineEmits(['copy'])

const rows = computed(() => DEIDENTIFY_ROWS.map(r => ({
  k: r.k, v: (props.sample.deidentify || {})[r.key] || ''
})))

function copy(row) {
  emit('copy', `${row.k}：${row.v}`, 'general')
  toast.show('已复制到「一般信息」段', 'success')
}

function copyClinical() {
  emit('copy', `临床主要信息及检查目的：${props.sample.clinicalBrief}`, 'general')
  toast.show('已复制到「一般信息」段', 'success')
}
</script>

<style scoped>
.rwb-patient-body {
  display: flex; flex-wrap: wrap; gap: 9px 24px;
  padding: 14px 18px 18px;
}
.rwb-patient-item { display: flex; align-items: center; gap: 6px; font-size: 12.5px; min-width: 0; }
.rwb-patient-k { color: #909399; flex-shrink: 0; }
.rwb-patient-v { color: #1f2937; font-weight: 600; white-space: nowrap; }
.rwb-copy {
  flex-shrink: 0; width: 20px; height: 20px; border-radius: 5px; cursor: pointer;
  border: 1px solid #e5e7eb; background: #fff; color: #9ca3af; font-size: 10px;
  display: flex; align-items: center; justify-content: center;
}
.rwb-copy:hover { color: var(--primary); border-color: var(--primary); }
.rwb-clinical { flex: 1 0 100%; margin-top: 2px; }
.rwb-clinical-text {
  flex: 1 0 100%; font-size: 12.5px; color: #4b5563; line-height: 1.85;
  border-left: 2px solid #EBEEF5; padding-left: 10px;
}
</style>
