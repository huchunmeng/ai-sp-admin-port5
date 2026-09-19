<template>
  <div>
    <div v-for="seg in GOLD_SEGMENTS" :key="seg.key" class="is-seg">
      <div class="is-seg-head">
        <span class="is-seg-name">{{ seg.name }}</span>
        <span class="text-secondary" style="font-size:11.5px">≤ {{ seg.limit }} 字</span>
        <span class="is-seg-count" :class="{ 'text-error': over(seg) }">{{ (text(seg) || '').length }} / {{ seg.limit }}</span>
      </div>
      <textarea class="input is-seg-area" :value="text(seg)" :maxlength="seg.limit"
                :rows="seg.key === 'technique' ? 3 : 7"
                :placeholder="PLACEHOLDER[seg.key]"
                @input="onInput(seg.key, $event.target.value)"></textarea>
    </div>

    <div class="is-gate" :class="allFilled ? 'is-gate-ok' : ''">
      <i class="fa-solid" :class="allFilled ? 'fa-circle-check' : 'fa-circle-exclamation'"></i>
      <template v-if="allFilled">三段已录入，可发布</template>
      <template v-else>三段皆非空方可发布</template>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { GOLD_SEGMENTS } from '@ai-sp/shared/imaging'

const PLACEHOLDER = {
  technique: '如：胸部CT平扫。',
  findings: '按部位、大小、形态、密度、强化与阴性征象逐项描述。',
  impression: '给出定位与定性倾向、诊断依据与进一步建议。'
}

const props = defineProps({
  /** { technique, findings, impression }；新建样本时为 null */
  modelValue: { type: Object, default: null }
})
const emit = defineEmits(['update:modelValue'])

const gold = computed(() => props.modelValue || { technique: '', findings: '', impression: '' })
const text = seg => gold.value[seg.key] || ''
const over = seg => (text(seg) || '').length >= seg.limit
const allFilled = computed(() => GOLD_SEGMENTS.every(s => String(text(s)).trim().length > 0))

function onInput(key, val) {
  emit('update:modelValue', { ...gold.value, [key]: val })
}
</script>

<style scoped>
.is-seg { margin-bottom: 14px; }
.is-seg-head { display: flex; align-items: baseline; gap: 8px; margin-bottom: 6px; }
.is-seg-name { font-size: 13px; font-weight: 600; }
.is-seg-count { margin-left: auto; font-size: 11.5px; color: var(--text-secondary); }
.is-seg-area { width: 100%; resize: vertical; line-height: 1.8; font-family: inherit; }
.is-code { background: #F5F7FA; padding: 1px 5px; border-radius: 4px; font-size: 11.5px; }
.is-gate {
  padding: 10px 14px; border-radius: 8px; font-size: 12.5px; line-height: 1.8;
  background: #FFF7E6; border: 1px solid #FFE7BA; color: #D46B08;
}
.is-gate-ok { background: #F6FFED; border-color: #D9F7BE; color: #389E0D; }
.is-note {
  margin-top: 12px; padding: 10px 14px; border-radius: 8px; background: #F5F7FA;
  color: var(--text-secondary); font-size: 12px; line-height: 1.9;
}
</style>
