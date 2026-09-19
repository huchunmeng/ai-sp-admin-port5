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
          影响 <code class="is-code">{{ (f.affects || []).join(' · ') }}</code>
        </div>
      </div>
    </div>

    <div v-if="result.lost.length" class="is-derived">
      <div class="is-derived-head">
        <i class="fa-solid fa-triangle-exclamation"></i>
        {{ result.lost.length }} 个条目不可评（共 {{ lostScore }} 分）
      </div>
      <table class="table">
        <thead><tr><th>条目</th><th>名称</th><th>分值</th><th>原因</th></tr></thead>
        <tbody>
          <tr v-for="l in result.lost" :key="l.code">
            <td><code class="is-code">{{ l.code }}</code></td>
            <td>{{ l.label }}</td>
            <td>{{ l.score }}</td>
            <td class="text-secondary" style="font-size:12px">
              <span class="badge" :class="l.source === 'na' ? 'badge-info' : 'badge-warning'">{{ l.source === 'na' ? '不适用' : '缺能力位' }}</span>
              {{ l.why }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { CAPABILITY_FIELDS, scoreableOf } from '@ai-sp/shared/imaging'

const props = defineProps({
  /** { hasMeasurement, hasPriorExam, hasEnhancedPhase, isTumor, hasStagingInfo } */
  modelValue: { type: Object, required: true },
  /** 病例 ID：用来按该病例的评分表算「哪些条目不可评」 */
  sampleId: { type: String, default: '' }
})
const emit = defineEmits(['update:modelValue'])

const model = computed(() => props.modelValue)
const result = computed(() => scoreableOf(props.sampleId, props.modelValue))
const lostScore = computed(() => Math.round(result.value.lost.reduce((a, l) => a + l.score, 0) * 10) / 10)

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
.is-derived-head {
  display: flex; align-items: center; gap: 7px; font-size: 13px; font-weight: 600;
  color: #D46B08; margin-bottom: 10px;
}
</style>
