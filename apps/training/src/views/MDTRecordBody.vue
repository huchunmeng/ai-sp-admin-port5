<template>
  <div class="record-body">
    <div class="rec-meta-grid">
      <div class="rec-meta-item"><span class="lbl">病例 ID</span><span>{{ r.caseId || r.mdtId || '—' }}</span></div>
      <div class="rec-meta-item"><span class="lbl">开始</span><span>{{ r.startedAt ? new Date(r.startedAt).toLocaleString() : '—' }}</span></div>
      <div class="rec-meta-item"><span class="lbl">结束</span><span>{{ r.finishedAt ? new Date(r.finishedAt).toLocaleString() : '—' }}</span></div>
      <div class="rec-meta-item"><span class="lbl">归档时间</span><span>{{ fmtTime(r.recordedAt) }}</span></div>
    </div>

    <!-- 能力评价 -->
    <div class="rec-section" v-if="r.portraitAssess?.length">
      <h4 class="sec-title"><i class="fa-solid fa-brain"></i> 能力评价</h4>
      <div class="portrait-grid">
        <div class="portrait-item" v-for="p in r.portraitAssess" :key="p.dim">
          <div class="pi-top">
            <span class="pi-dim">{{ p.dim }}</span>
            <span class="pi-score" :class="scoreClass(p.score)">{{ p.score == null ? '—' : fmtScore(p.score) }}</span>
          </div>
          <p class="pi-note">{{ p.note }}</p>
        </div>
      </div>
    </div>

    <!-- 任务作答 -->
    <div class="rec-section" v-if="Object.keys(r.tasks || {}).length">
      <h4 class="sec-title"><i class="fa-solid fa-list-check"></i> 任务作答</h4>
      <div class="task-item" v-for="key in Object.keys(r.tasks)" :key="key">
        <div class="task-item-head">
          <span class="task-key">{{ taskLabel(r, key) }}</span>
          <span class="task-status" :class="{ 'st-skip': r.skipped?.[key], 'st-done': r.submitted?.[key] }">
            {{ r.skipped?.[key] ? '已跳过' : r.submitted?.[key] ? '已提交' : '未作答' }}
          </span>
        </div>
        <p class="task-value">{{ taskText(r.tasks[key]) }}</p>
      </div>
    </div>

    <!-- 完整对话 -->
    <div class="rec-section">
      <h4 class="sec-title"><i class="fa-solid fa-comments"></i> 完整对话</h4>
      <div class="transcript">
        <template v-for="(m, i) in r.messages || []" :key="i">
          <div v-if="m.type === 'expert'" class="msg msg-expert">
            <span class="msg-role">{{ speakerLabel(m.speaker) }}</span>
            <span class="msg-text">{{ m.text }}</span>
          </div>
          <div v-else-if="m.type === 'student'" class="msg msg-student">
            <span class="msg-role">我 · {{ roleLabel(r.studentRole) }}</span>
            <span class="msg-text">{{ m.text }}</span>
          </div>
          <div v-else-if="m.type === 'callout'" class="msg msg-callout">{{ m.text }}</div>
          <div v-else-if="m.type === 'task'" class="msg msg-task">📋 任务：{{ taskLabel(r, m.taskKey) }}</div>
          <div v-else-if="m.type === 'decision'" class="msg msg-section">———— MDT 最终决策 ————</div>
          <div v-else-if="m.type === 'followup'" class="msg msg-section">———— 随访计划 ————</div>
          <div v-else-if="m.type === 'references'" class="msg msg-section">———— 参考依据 ————</div>
          <div v-else-if="m.text" class="msg">{{ m.text }}</div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { fmtScore } from '@/composables/useUtils'
const ROLE_LABELS = { observer: '观察者', attending: '主诊·管床·主任' }

defineProps({
  r: { type: Object, required: true }
})

function roleLabel(role) {
  if (role === 'resident') return '观察者'   // 旧记录住院医师 → 观察者
  return ROLE_LABELS[role] || role || '—'
}

function speakerLabel(speaker) {
  if (!speaker) return '主持人'
  if (speaker === 'host') return '主持人'
  return speaker
}

function taskLabel(r, key) {
  return (r.taskLabels && r.taskLabels[key]) || key || ''
}

function taskText(val) {
  if (val == null || val === '') return '（空）'
  if (Array.isArray(val)) return val.join('、')
  if (typeof val === 'object') return JSON.stringify(val)
  return String(val)
}

function fmtTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d)) return '—'
  const p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

function scoreClass(score) {
  if (score == null) return ''
  if (score >= 80) return 'sc-high'
  if (score >= 60) return 'sc-mid'
  return 'sc-low'
}
</script>

<style scoped>
.record-body { padding: 0 18px 18px; border-top: 1px solid #f3f4f6; }
.rec-meta-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 8px 16px; padding: 14px 0; }
.rec-meta-item { display: flex; flex-direction: column; gap: 2px; font-size: 12px; color: #374151; }
.rec-meta-item .lbl { font-size: 11px; color: #9ca3af; }

.rec-section { margin-top: 14px; }
.sec-title { margin: 0 0 10px; font-size: 14px; font-weight: 700; color: #374151; }

.portrait-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px; }
.portrait-item { background: #f8fafc; border: 1px solid #eef2f7; border-radius: 10px; padding: 12px; }
.pi-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
.pi-dim { font-size: 13px; font-weight: 600; color: #1f2937; }
.pi-score { font-size: 16px; font-weight: 700; }
.sc-high { color: #67c23a; }
.sc-mid { color: #e6a23c; }
.sc-low { color: #f56c6c; }
.pi-note { margin: 0; font-size: 12px; color: #6b7280; line-height: 1.6; }

.task-item { background: #f8fafc; border: 1px solid #eef2f7; border-radius: 8px; padding: 10px 12px; margin-bottom: 8px; }
.task-item-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
.task-key { font-size: 13px; font-weight: 600; color: #1f2937; }
.task-status { font-size: 11px; padding: 1px 8px; border-radius: 8px; background: #f3f4f6; color: #6b7280; }
.task-status.st-done { background: #f0f9eb; color: #67c23a; }
.task-status.st-skip { background: #fff7e6; color: #e6a23c; }
.task-value { margin: 0; font-size: 12px; color: #4b5563; line-height: 1.6; }

.transcript { display: flex; flex-direction: column; gap: 8px; }
.msg { font-size: 13px; line-height: 1.6; }
.msg-expert { display: flex; gap: 10px; }
.msg-student { display: flex; gap: 10px; background: #eff6ff; border-radius: 8px; padding: 8px 10px; }
.msg-role { flex-shrink: 0; font-weight: 700; color: #1e40af; font-size: 12px; min-width: 72px; }
.msg-text { color: #374151; white-space: pre-wrap; }
.msg-callout { background: #fff7e6; border: 1px solid #ffe7ba; border-radius: 8px; padding: 8px 10px; color: #92400e; }
.msg-task { color: #7c3aed; font-weight: 600; }
.msg-section { text-align: center; color: #9ca3af; font-weight: 600; font-size: 12px; padding: 6px 0; }
</style>
