<template>
  <div class="station-record-panel">
    <template v-if="entry?.hasData">
      <!-- 辅检记录 -->
      <template v-if="entry.key === 'ancillaryTests'">
        <div class="detail-section">
          <div class="detail-label">{{ isZh ? '已选检查' : 'Selected Tests' }}（{{ entry.detail.totalSelected }}）</div>
          <div class="detail-item" v-for="(s, i) in entry.detail.selected" :key="'s'+i">{{ s }}</div>
        </div>
        <div class="detail-section" v-if="entry.detail.results.length">
          <div class="detail-label">{{ isZh ? '检查结果' : 'Results' }}</div>
          <div v-for="(r, i) in entry.detail.results" :key="'r'+i" class="result-item">
            <div class="detail-value" style="font-weight:600;">{{ r.name }}</div>
            <div class="detail-text">{{ r.result }}</div>
          </div>
        </div>
      </template>

      <!-- 诊断记录 -->
      <template v-if="entry.key === 'diagnosis'">
        <div class="detail-section" v-if="entry.detail.preliminary">
          <div class="detail-label">{{ isZh ? '初步诊断' : 'Preliminary Dx' }}</div>
          <div class="detail-value">{{ entry.detail.preliminary }}</div>
        </div>
        <div class="detail-section" v-if="entry.detail.basis">
          <div class="detail-label">{{ isZh ? '诊断依据' : 'Basis' }}</div>
          <div class="detail-text">{{ entry.detail.basis }}</div>
        </div>
        <div class="detail-section" v-if="entry.detail.differential">
          <div class="detail-label">{{ isZh ? '鉴别诊断' : 'Differential Dx' }}</div>
          <div class="detail-value">{{ entry.detail.differential }}</div>
          <div v-if="entry.detail.differentialDetails.length" style="margin-top:8px;">
            <div v-for="(d, i) in entry.detail.differentialDetails" :key="'dd'+i" class="result-item">
              <div class="detail-value" style="font-weight:600;">{{ d.name }}</div>
              <div class="detail-text" v-if="d.evidence">{{ d.evidence }}</div>
            </div>
          </div>
        </div>
      </template>

      <!-- 治疗记录 -->
      <template v-if="entry.key === 'treatmentPlan'">
        <div class="detail-section">
          <div class="detail-label">{{ isZh ? '治疗计划内容' : 'Plan Content' }}</div>
          <div class="detail-text pre-wrap">{{ entry.detail.content }}</div>
          <div v-if="entry.detail.fullLength > 500" class="detail-hint">
            {{ isZh ? '（共' + entry.detail.fullLength + '字）' : '(' + entry.detail.fullLength + ' chars total)' }}
          </div>
        </div>
      </template>

      <!-- 病历记录 -->
      <template v-if="entry.key === 'medicalRecord'">
        <div class="detail-section">
          <div class="detail-label">{{ isZh ? '病历内容' : 'Record Content' }}</div>
          <div class="detail-text pre-wrap">{{ entry.detail.content }}</div>
          <div v-if="entry.detail.fullLength > 500" class="detail-hint">
            {{ isZh ? '（共' + entry.detail.fullLength + '字）' : '(' + entry.detail.fullLength + ' chars total)' }}
          </div>
        </div>
      </template>
    </template>
    <div v-else class="empty-hint">{{ emptyText }}</div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  entry: { type: Object, default: null },
  isZh: { type: Boolean, default: true },
})

const emptyText = computed(() => {
  if (!props.entry) return ''
  const map = {
    ancillaryTests: props.isZh ? '暂无辅检记录' : 'No test records',
    diagnosis: props.isZh ? '暂无诊断记录' : 'No diagnosis records',
    treatmentPlan: props.isZh ? '暂无治疗记录' : 'No treatment records',
    medicalRecord: props.isZh ? '暂无病历记录' : 'No medical records',
  }
  return map[props.entry.key] || ''
})
</script>

<style scoped>
.detail-section { margin-bottom: 10px; }
.detail-label { font-size: 11px; font-weight: 600; color: #909399; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.3px; }
.detail-value { font-size: 13px; color: #303133; line-height: 1.6; }
.detail-text { font-size: 12px; color: #606266; line-height: 1.6; white-space: pre-wrap; word-break: break-word; }
.detail-text.pre-wrap { white-space: pre-wrap; }
.detail-item { font-size: 12px; color: #606266; padding: 3px 0 3px 8px; border-left: 2px solid #EBEEF5; margin-bottom: 2px; }
.result-item { padding: 6px 8px; background: #fafafa; border-radius: 6px; margin-bottom: 4px; }
.detail-hint { font-size: 11px; color: #909399; margin-top: 4px; font-style: italic; }
.empty-hint { text-align: center; color: #C0C4CC; padding: 20px 0; font-size: 13px; }
</style>
