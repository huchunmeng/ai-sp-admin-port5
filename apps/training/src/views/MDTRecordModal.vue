<template>
  <div class="mdt-records-overlay" @click.self="close">
    <div class="mdt-records-modal">
      <div class="mr-header">
        <div class="mr-header-left">
          <h3><i class="fa-solid fa-folder-open"></i> MDT 训练记录</h3>
          <span class="mr-case-name" v-if="caseTitle">{{ caseTitle }}</span>
        </div>
        <button class="mr-close" @click="close"><i class="fa-solid fa-xmark"></i></button>
      </div>

      <div v-if="records.length === 0" class="mr-empty">
        <i class="fa-solid fa-inbox"></i>
        <p>暂无该病例的 MDT 训练记录。完成一次讨论后，完整对话会在此自动存档。</p>
      </div>

      <div class="mr-record-card" v-for="r in records" :key="r.id" :class="{ open: expanded[r.id] }">
        <div class="mr-record-head" @click="toggle(r.id)">
          <div class="mr-rec-main">
            <span class="mr-rec-tag" :class="r.done ? 'tag-done' : 'tag-partial'">{{ r.done ? '完成' : '中断' }}</span>
            <span class="mr-rec-role"><i class="fa-solid fa-user"></i> {{ roleLabel(r.studentRole) }}</span>
          </div>
          <div class="mr-rec-meta">
            <span>{{ fmtTime(r.startedAt || r.recordedAt) }}</span>
            <span>{{ fmtDuration(r.duration) }}</span>
            <span class="mr-rec-msgs">{{ (r.messages || []).length }} 条</span>
          </div>
          <i class="fa-solid fa-chevron-down mr-rec-chevron"></i>
        </div>

        <MDTRecordBody :r="r" v-show="expanded[r.id]" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useTrainingStore } from '@/stores/training'
import MDTRecordBody from '@/views/MDTRecordBody.vue'

const props = defineProps({
  mdtId: { type: String, required: true },
  caseTitle: { type: String, default: '' }
})
const emit = defineEmits(['close'])

const store = useTrainingStore()
const ROLE_LABELS = { observer: '观察者', attending: '主诊·管床·主任' }

const records = ref([])
const expanded = reactive({})

function roleLabel(role) {
  if (role === 'resident') return '观察者'   // 旧记录住院医师 → 观察者
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

function close() {
  emit('close')
}

onMounted(() => {
  records.value = store.getMdtRecords().filter(r => r.mdtId === props.mdtId || r.caseId === props.mdtId)
  if (records.value.length) {
    expanded[records.value[0].id] = true
  }
})
</script>

<style scoped>
.mdt-records-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,.45);
  display: flex; align-items: center; justify-content: center;
  z-index: 2000;
}
.mdt-records-modal {
  background: #fff; border-radius: 12px; box-shadow: 0 8px 40px rgba(0,0,0,.15);
  width: 92%; max-width: 860px; max-height: 85vh; overflow-y: auto;
  padding: 20px 24px 24px;
}
.mr-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.mr-header-left { display: flex; align-items: center; gap: 12px; min-width: 0; }
.mr-header h3 { margin: 0; font-size: 17px; font-weight: 700; color: #1f2937; display: flex; align-items: center; gap: 8px; white-space: nowrap; }
.mr-header h3 i { color: #409EFF; }
.mr-case-name {
  font-size: 12px; color: #1e40af; background: #eff6ff; border: 1px solid #dbeafe;
  padding: 2px 10px; border-radius: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.mr-close {
  background: none; border: none; font-size: 20px; cursor: pointer;
  color: #909399; padding: 4px 8px; border-radius: 4px; flex-shrink: 0;
}
.mr-close:hover { background: #f5f5f5; }

.mr-empty {
  text-align: center; padding: 50px 20px; color: #9ca3af;
}
.mr-empty i { font-size: 40px; margin-bottom: 12px; }
.mr-empty p { margin: 0; font-size: 13px; }

.mr-record-card {
  border: 1px solid #edf0f4; border-radius: 12px;
  margin-bottom: 12px; overflow: hidden; transition: box-shadow .2s;
}
.mr-record-card.open { box-shadow: 0 6px 24px rgba(0,0,0,.06); }
.mr-record-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 18px; cursor: pointer; gap: 12px;
}
.mr-record-head:hover { background: #fafbfc; }
.mr-rec-main { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; min-width: 0; }
.mr-rec-tag { font-size: 11px; padding: 2px 8px; border-radius: 10px; }
.tag-done { background: #f0f9eb; color: #67c23a; }
.tag-partial { background: #fff7e6; color: #e6a23c; }
.mr-rec-role { font-size: 12px; color: #6b7280; }
.mr-rec-meta { display: flex; align-items: center; gap: 12px; font-size: 12px; color: #6b7280; }
.mr-rec-msgs { color: #1e40af; font-weight: 600; }
.mr-rec-chevron { color: #9ca3af; transition: transform .2s; }
.mr-record-card.open .mr-rec-chevron { transform: rotate(180deg); }
</style>
