<template>
  <div>
    <div class="is-fields">
      <div v-for="f in CAPABILITY_FIELDS" :key="f.key" class="is-field" :class="{ 'is-field-readonly': f.readonly }">
        <label class="is-check" :title="f.readonly ? '由影像控件能力决定，本期只读' : ''">
          <input type="checkbox" :checked="!!model[f.key]" :disabled="f.readonly" @change="toggle(f.key, $event.target.checked)">
          <span>{{ f.label }}</span>
          <span v-if="f.readonly" class="badge badge-info" style="margin-left:6px">🔒 只读</span>
        </label>
        <div class="text-secondary" style="font-size:11.5px;line-height:1.7">
          影响 <code class="is-code">{{ f.hitCode }}</code>{{ f.key === 'hasMeasurement' ? '（本期影像控件无测量工具，恒不可评）' : '' }}
        </div>
      </div>
    </div>

    <div class="is-derived">
      <div class="is-derived-head">
        <span>本样本可评分</span>
        <b :class="result.max >= 85 ? 'text-primary' : 'text-warning'">{{ result.max }}</b>
        <span class="text-secondary"> / 100</span>
      </div>
      <table v-if="result.lost.length" class="table">
        <thead><tr><th>落空条目</th><th>名称</th><th>分值</th><th>来源</th><th>原因</th></tr></thead>
        <tbody>
          <tr v-for="l in result.lost" :key="l.code">
            <td><code class="is-code">{{ l.code }}</code></td>
            <td>{{ l.label }}</td>
            <td>{{ l.score }}</td>
            <td><span class="badge" :class="l.source === 'na' ? 'badge-info' : 'badge-warning'">{{ l.source === 'na' ? '不适用 N/A' : '能力位缺失' }}</span></td>
            <td class="text-secondary" style="font-size:12px">{{ l.why }}</td>
          </tr>
        </tbody>
      </table>
      <div v-else class="text-secondary" style="font-size:12.5px">本样本 23 条全部可评，可评分 100。</div>
      <div class="text-secondary" style="font-size:11.5px;margin-top:8px;line-height:1.8">
        落空条目的分值从分母中<b>剔除、不按 0 分计</b>，满分仍为 100 —— 但这等于考一张更短的卷，
        分布右移、区分度下降、<b>跨卷不可比</b>。组卷侧可评分低于 85 时发布需走覆盖确认。
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { CAPABILITY_FIELDS, scoreableOf } from '@ai-sp/shared/imaging'

const props = defineProps({
  /** { hasMeasurement, hasPriorExam, hasEnhancedPhase, isTumor, hasStagingInfo } */
  modelValue: { type: Object, required: true }
})
const emit = defineEmits(['update:modelValue'])

const model = computed(() => props.modelValue)
const result = computed(() => scoreableOf('', props.modelValue))

/** hasMeasurement 由控件能力决定，界面不给开关（PRD §5.12.5） */
function toggle(key, checked) {
  const field = CAPABILITY_FIELDS.find(f => f.key === key)
  if (!field || field.readonly) return
  emit('update:modelValue', { ...props.modelValue, [key]: checked })
}
</script>

<style scoped>
.is-fields { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px 16px; }
.is-field {
  border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px;
}
.is-field-readonly { background: #F5F7FA; }
.is-check { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; cursor: pointer; }
.is-field-readonly .is-check { cursor: not-allowed; }
.is-check input { width: 15px; height: 15px; }
.is-code { background: #F5F7FA; padding: 1px 5px; border-radius: 4px; font-size: 11.5px; }
.is-derived { margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--border); }
.is-derived-head { display: flex; align-items: baseline; gap: 6px; font-size: 13px; margin-bottom: 10px; }
.is-derived-head b { font-size: 20px; }
</style>
