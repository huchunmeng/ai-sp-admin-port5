<template>
  <div class="rwb-info">
    <div v-for="row in rows" :key="row.k" class="rwb-info-item" :class="{ 'is-masked': row.masked }">
      <span class="rwb-info-k">{{ row.k }}</span>
      <span class="rwb-info-v">{{ row.v }}</span>
      <button v-if="row.copy" class="rwb-copy" title="复制到报告" @click="copy(row)">
        <i class="fa-solid fa-copy"></i>
      </button>
      <span v-else-if="row.masked" class="rwb-info-hint">全掩</span>
    </div>

    <div class="rwb-info-item rwb-clinical">
      <span class="rwb-info-k">临床主要信息及检查目的</span>
      <button class="rwb-copy" title="整段复制到报告" @click="copyClinical">
        <i class="fa-solid fa-copy"></i>
      </button>
    </div>
    <div class="rwb-clinical-text">{{ sample.clinicalBrief }}</div>
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

const rows = computed(() => DEIDENTIFY_ROWS.map(r => {
  const row = { k: r.k, v: (props.sample.deidentify || {})[r.key] || '' }
  if (r.masked) row.masked = true
  else row.copy = true
  return row
}))

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
.rwb-info {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 9px 20px;
  padding: 14px 18px 18px;
}
.rwb-info-item { display: flex; align-items: center; gap: 6px; font-size: 12.5px; min-width: 0; }
.rwb-info-k { color: #909399; flex-shrink: 0; }
.rwb-info-v {
  color: #1f2937; font-weight: 600;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.rwb-info-item.is-masked .rwb-info-v { color: #9ca3af; font-weight: 500; }
.rwb-info-hint { font-size: 11px; color: #9ca3af; }
.rwb-copy {
  flex-shrink: 0; width: 20px; height: 20px; border-radius: 5px; cursor: pointer;
  border: 1px solid #e5e7eb; background: #fff; color: #9ca3af; font-size: 10px;
  display: flex; align-items: center; justify-content: center;
}
.rwb-copy:hover { color: var(--primary); border-color: var(--primary); }
.rwb-clinical { grid-column: 1 / -1; margin-top: 4px; }
.rwb-clinical-text {
  grid-column: 1 / -1; font-size: 12.5px; color: #4b5563; line-height: 1.85;
  border-left: 2px solid #EBEEF5; padding-left: 10px; margin-top: -4px;
}
@media (max-width: 1100px) { .rwb-info { grid-template-columns: repeat(2, 1fr); } }
</style>
