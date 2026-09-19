<template>
  <section class="card rwb-block">
    <div class="rwb-block-head">
      <i class="fa-solid fa-circle-info"></i> 一般信息
      <span class="rwb-tag">{{ sample.bodyPart }} · {{ sample.modality }}</span>
      <span class="rwb-mask-note">脱敏形态即评分基准</span>
      <button class="rwb-collapse" @click="toggle">
        {{ open ? '收起' : '展开' }} <i class="fa-solid" :class="open ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
      </button>
    </div>

    <div v-show="open" class="rwb-info">
      <div v-for="row in rows" :key="row.k" class="rwb-info-item" :class="{ 'is-masked': row.masked }">
        <span class="rwb-info-k">{{ row.k }}</span>
        <span class="rwb-info-v">{{ row.v }}</span>
        <button v-if="row.copy" class="rwb-copy" title="复制到报告" @click="copy(row)">
          <i class="fa-solid fa-copy"></i>
        </button>
        <span v-else-if="row.masked" class="rwb-info-hint">全掩 · 本期不纳入评分</span>
        <span v-else-if="row.note" class="rwb-info-hint">{{ row.note }}</span>
      </div>
      <div class="rwb-info-item rwb-clinical">
        <span class="rwb-info-k">临床主要信息及检查目的</span>
        <span class="rwb-info-v">{{ sample.clinicalBrief }}</span>
        <button class="rwb-copy" title="整段复制到报告" @click="copyClinical">
          <i class="fa-solid fa-copy"></i>
        </button>
      </div>
    </div>

    <div v-if="open" class="rwb-note">
      复制只是省打字，<b>照抄不得满分</b>——GEN-04（10 分）要求规范转述临床主要信息与检查目的。
    </div>
  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { toast } from '@ai-sp/shared'
import { DEIDENTIFY_ROWS } from '@ai-sp/shared/imaging'

const props = defineProps({
  sample: { type: Object, required: true }
})
const emit = defineEmits(['copy'])

/** 一般信息条默认展开，可收起（收起状态记忆在本机） */
const COLLAPSE_KEY = 'report_writing_info_collapsed'
const open = ref(localStorage.getItem(COLLAPSE_KEY) !== '1')
function toggle() {
  open.value = !open.value
  try { localStorage.setItem(COLLAPSE_KEY, open.value ? '0' : '1') } catch (e) { /* 忽略 */ }
}

const rows = computed(() => DEIDENTIFY_ROWS.map(r => {
  const row = { k: r.k, v: (props.sample.deidentify || {})[r.key] || '', note: r.note }
  if (r.masked) row.masked = true
  else row.copy = true
  return row
}))

function copy(row) {
  // 复制进「一般信息」段——那一段就是用来复述这些脱敏值 + 转述临床信息的
  emit('copy', `${row.k}：${row.v}`, 'general')
  toast.show('已复制到「一般信息」段', 'success')
}

function copyClinical() {
  emit('copy', `临床主要信息及检查目的：${props.sample.clinicalBrief}`, 'general')
  toast.show('已复制到「一般信息」段，记得规范改写', 'success')
}
</script>

<style scoped>
.rwb-block { overflow: hidden; }
.rwb-block-head {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  font-size: 14px; font-weight: 700; color: #1f2937;
  padding: 12px 18px; background: #fafbfc; border-bottom: 1px solid #f3f4f6;
}
.rwb-block-head i { color: var(--primary); }
.rwb-tag { font-size: 11px; font-weight: 500; color: #6b7280; background: #f3f4f6; padding: 3px 10px; border-radius: 8px; }
.rwb-mask-note { margin-left: auto; font-size: 11px; color: #9ca3af; font-weight: 400; }
.rwb-collapse {
  font-family: inherit; font-size: 12px; color: var(--primary); background: none; border: none;
  cursor: pointer; display: inline-flex; align-items: center; gap: 4px; padding: 2px 4px;
}
.rwb-collapse:hover { text-decoration: underline; }
.rwb-info { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px 16px; padding: 14px 18px 2px; }
.rwb-info-item { display: flex; align-items: center; gap: 6px; font-size: 12.5px; min-width: 0; }
.rwb-info-k { color: #909399; flex-shrink: 0; }
.rwb-info-v { color: #1f2937; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rwb-info-item.is-masked .rwb-info-v { color: #9ca3af; font-weight: 500; }
.rwb-info-hint { font-size: 11px; color: #9ca3af; }
.rwb-copy {
  flex-shrink: 0; width: 20px; height: 20px; border-radius: 5px; cursor: pointer;
  border: 1px solid #e5e7eb; background: #fff; color: #9ca3af; font-size: 10px;
  display: flex; align-items: center; justify-content: center;
}
.rwb-copy:hover { color: var(--primary); border-color: var(--primary); }
.rwb-clinical { grid-column: 1 / -1; }
.rwb-clinical .rwb-info-v { white-space: normal; font-weight: 500; line-height: 1.8; }
.rwb-note { font-size: 12px; color: #9ca3af; line-height: 1.6; padding: 12px 18px 16px; }
@media (max-width: 1100px) { .rwb-info { grid-template-columns: repeat(2, 1fr); } }
</style>
