<template>
  <div class="mdt-records-page">
    <div class="records-header">
      <div class="records-title">
        <button class="back-btn" @click="goBack"><i class="fa-solid fa-arrow-left"></i></button>
        <h2><i class="fa-solid fa-folder-open"></i> MDT 多学科讨论训练记录</h2>
        <span class="count-badge">{{ records.length }} 条</span>
      </div>
      <p class="records-sub">完整对话已自动存档，用于复盘专家AI表现与讨论流程合理性。</p>
    </div>

    <div v-if="records.length === 0" class="empty-state">
      <i class="fa-solid fa-inbox"></i>
      <p>暂无 MDT 训练记录。完成一次 MDT 多学科讨论后，完整对话会在此自动存档。</p>
      <button class="btn btn-primary" @click="goCaseList"><i class="fa-solid fa-play"></i> 去开始讨论</button>
    </div>

    <div class="record-card" v-for="r in records" :key="r.id" :class="{ open: expanded[r.id] }">
      <div class="record-head" @click="toggle(r.id)">
        <div class="rec-main">
          <span class="rec-case">{{ r.caseTitle || r.mdtId || r.caseId }}</span>
          <span class="rec-tag" :class="r.done ? 'tag-done' : 'tag-partial'">{{ r.done ? '完成' : '中断' }}</span>
          <span class="rec-role"><i class="fa-solid fa-user"></i> {{ roleLabel(r.studentRole) }}</span>
        </div>
        <div class="rec-meta">
          <span>{{ fmtTime(r.startedAt || r.recordedAt) }}</span>
          <span>{{ fmtDuration(r.duration) }}</span>
          <span class="rec-msgs">{{ (r.messages || []).length }} 条</span>
        </div>
        <i class="fa-solid fa-chevron-down rec-chevron"></i>
      </div>

      <MDTRecordBody :r="r" v-show="expanded[r.id]" />
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useTrainingStore } from '@/stores/training'
import MDTRecordBody from '@/views/MDTRecordBody.vue'

const router = useRouter()
const route = useRoute()
const store = useTrainingStore()

const ROLE_LABELS = { observer: '观察者', resident: '住院医师', attending: '主诊医师' }
const records = ref([])
const expanded = reactive({})

function roleLabel(role) {
  return ROLE_LABELS[role] || role || '—'
}

function fmtTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d)) return '—'
  const p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

function fmtDuration(sec) {
  if (sec == null) return '—'
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return m > 0 ? `${m}min${s}s` : `${s}s`
}

function toggle(id) {
  expanded[id] = !expanded[id]
}

function goBack() {
  router.back()
}

function goCaseList() {
  router.push({ name: 'mdtCaseList' })
}

onMounted(() => {
  records.value = store.getMdtRecords()
  // 展开指定记录（?focus=sessionEpoch），否则展开最新一条
  const focus = route.query.focus
  if (focus && records.value.some(r => String(r.sessionEpoch) === String(focus))) {
    records.value.forEach(r => { expanded[r.id] = String(r.sessionEpoch) === String(focus) })
  } else if (records.value.length) {
    expanded[records.value[0].id] = true
  }
})
</script>

<style scoped>
.mdt-records-page { padding: 24px; max-width: 860px; margin: 0 auto; }
.records-header { margin-bottom: 18px; }
.records-title { display: flex; align-items: center; gap: 12px; }
.back-btn {
  width: 34px; height: 34px; border-radius: 8px; border: 1px solid #e5e7eb;
  background: #fff; cursor: pointer; color: #4b5563; font-size: 14px;
}
.back-btn:hover { background: #f3f4f6; }
.records-title h2 { margin: 0; font-size: 18px; font-weight: 700; color: #1f2937; }
.count-badge {
  font-size: 12px; background: #eff6ff; color: #1e40af; border: 1px solid #dbeafe;
  padding: 2px 10px; border-radius: 12px;
}
.records-sub { margin: 10px 0 0 46px; font-size: 12px; color: #6b7280; }

.empty-state {
  text-align: center; padding: 60px 20px; background: #fff; border-radius: 12px;
  border: 1px dashed #d1d5db; color: #9ca3af;
}
.empty-state i { font-size: 40px; margin-bottom: 12px; }
.empty-state p { margin: 0 0 16px; }

.record-card {
  background: #fff; border: 1px solid #edf0f4; border-radius: 12px;
  margin-bottom: 12px; overflow: hidden; transition: box-shadow .2s;
}
.record-card.open { box-shadow: 0 6px 24px rgba(0,0,0,.06); }
.record-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 18px; cursor: pointer; gap: 12px;
}
.record-head:hover { background: #fafbfc; }
.rec-main { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; min-width: 0; }
.rec-case { font-weight: 700; color: #1f2937; font-size: 14px; }
.rec-tag { font-size: 11px; padding: 2px 8px; border-radius: 10px; }
.tag-done { background: #f0f9eb; color: #67c23a; }
.tag-partial { background: #fff7e6; color: #e6a23c; }
.rec-role { font-size: 12px; color: #6b7280; }
.rec-meta { display: flex; align-items: center; gap: 12px; font-size: 12px; color: #6b7280; }
.rec-msgs { color: #1e40af; font-weight: 600; }
.rec-chevron { color: #9ca3af; transition: transform .2s; }
.record-card.open .rec-chevron { transform: rotate(180deg); }
</style>
