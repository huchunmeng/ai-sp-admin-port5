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
      <template v-if="allFilled">三段金标准皆已录入 —— 可将本样本置为「已发布」</template>
      <template v-else>三段金标准皆非空方可发布（PRD §5.12.6）；未发布的样本不会出现在组卷选样列表里</template>
    </div>

    <div class="is-note">
      金标准<b>学员侧永不可见</b>：训练侧仅在 T4 自评提交后下发，考核侧默认不发（由任务开关
      <code class="is-code">revealGoldStandardAfterSubmit</code> 决定，默认关）。题库侧不提供任何「预览学员视角」入口。
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { GOLD_SEGMENTS } from '@ai-sp/shared/imaging'

const PLACEHOLDER = {
  technique: '如：胸部CT平扫。',
  findings: '按部位与范围、数目与大小、形态与边界、密度/信号/强化程度、重要阴性征象逐类描述。',
  impression: '回应临床问题，给出定位与定性倾向、诊断依据及下一步建议。'
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
