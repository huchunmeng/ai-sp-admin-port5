<template>
  <div class="mrkb-layout">
    <aside class="mrkb-sidebar">
      <div class="mrkb-search">
        <input class="input" v-model="searchText" placeholder="搜索字段..." style="width:100%">
      </div>
      <nav class="mrkb-nav">
        <button
          v-for="item in filteredTypes"
          :key="item.ftype"
          :class="['mrkb-nav-item', { active: selectedType === item.ftype }]"
          @click="selectedType = item.ftype"
        >
          <span class="mrkb-nav-label">{{ item.label }}</span>
          <span class="mrkb-nav-count">{{ item.count }}</span>
        </button>
      </nav>
      <div v-if="filteredTypes.length === 0" class="mrkb-nav-empty">
        无匹配字段
      </div>
    </aside>

    <main class="mrkb-content">
      <template v-if="selectedType && currentRecords.length > 0">
        <div class="mrkb-content-header">
          <h3>{{ currentLabel }}</h3>
          <span class="mrkb-content-count">共 {{ currentRecords.length }} 条记录</span>
        </div>

        <div
          v-for="(rec, idx) in currentRecords"
          :key="rec.id || idx"
          class="mrkb-card card"
        >
          <div class="mrkb-card-header">
            <div class="mrkb-card-meta">
              <span class="mrkb-card-date">
                <i class="fas fa-calendar-alt"></i> {{ rec.createDate || '—' }}
              </span>
              <span v-if="rec.doctorCode" class="mrkb-card-doctor">
                <i class="fas fa-user-md"></i> {{ rec.doctorCode }}
              </span>
              <span v-if="rec.visitNo" class="mrkb-card-visit">
                <i class="fas fa-file-medical-alt"></i> {{ rec.visitNo }}
              </span>
            </div>
            <button
              class="btn btn-sm btn-outline"
              @click="toggleExpand(idx)"
            >
              {{ expanded.has(idx) ? '收起' : '展开' }}
            </button>
          </div>
          <div
            :class="['mrkb-card-body', { collapsed: !expanded.has(idx) }]"
          >
            <pre class="mrkb-content-text">{{ rec.content }}</pre>
          </div>
        </div>
      </template>

      <div v-else-if="selectedType && currentRecords.length === 0" class="mrkb-empty">
        <p>暂无记录</p>
      </div>

      <div v-else class="mrkb-empty">
        <i class="fas fa-folder-open" style="font-size:48px;color:var(--text-tertiary);margin-bottom:16px;display:block"></i>
        <p>请从左侧菜单选择病历字段查看</p>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const FTYPE_LABELS = {
  'In_Record': '入院记录',
  'FirstRecord': '首次病程记录',
  'NormalRecord': '病程记录',
  'AttendingInvestigate': '主治医师查房',
  'DirectorInvestigate': '主任医师查房',
  'Consultation_Record': '会诊记录',
  'ShiftToRecord': '转入记录',
  'TurnOutRecord': '转出记录',
  'Preoperative_summary': '术前小结',
  'Preoperative_discussion': '术前讨论',
  'Ops_Agree_Record': '手术同意记录',
  'OpsSafeCheck': '手术安全核查',
  'Operation_Record': '手术记录',
  'OperRecord': '操作记录',
  'OpsFirstRecord': '术后首次病程',
  'Special_Check_Record': '特殊检查记录',
  'LeaveHospitalRecord': '出院前病程',
  'Out_Record': '出院记录',
  'others': '其他记录'
}

const FTYPE_ORDER = [
  'In_Record', 'FirstRecord', 'NormalRecord',
  'AttendingInvestigate', 'DirectorInvestigate', 'Consultation_Record',
  'ShiftToRecord', 'TurnOutRecord',
  'Preoperative_summary', 'Preoperative_discussion', 'Ops_Agree_Record',
  'OpsSafeCheck', 'Operation_Record', 'OperRecord', 'OpsFirstRecord',
  'Special_Check_Record', 'LeaveHospitalRecord', 'Out_Record',
  'others'
]

const props = defineProps({
  records: {
    type: Object,
    default: () => ({})
  }
})

const searchText = ref('')
const selectedType = ref('')
const expanded = ref(new Set())

const ftypeEntries = computed(() => {
  const entries = []
  for (const ftype of FTYPE_ORDER) {
    const recs = props.records[ftype]
    if (recs && recs.length > 0) {
      entries.push({
        ftype,
        label: FTYPE_LABELS[ftype] || ftype,
        count: recs.length
      })
    }
  }
  // Auto-select first entry on load
  if (entries.length > 0 && !selectedType.value) {
    selectedType.value = entries[0].ftype
  }
  return entries
})

const filteredTypes = computed(() => {
  const q = searchText.value.trim().toLowerCase()
  if (!q) return ftypeEntries.value
  return ftypeEntries.value.filter(e =>
    e.label.toLowerCase().includes(q) || e.ftype.toLowerCase().includes(q)
  )
})

const currentLabel = computed(() => {
  if (!selectedType.value) return ''
  return FTYPE_LABELS[selectedType.value] || selectedType.value
})

const currentRecords = computed(() => {
  if (!selectedType.value) return []
  return props.records[selectedType.value] || []
})

function toggleExpand(idx) {
  const next = new Set(expanded.value)
  if (next.has(idx)) next.delete(idx)
  else next.add(idx)
  expanded.value = next
}
</script>

<style scoped>
.mrkb-layout {
  display: flex;
  gap: 0;
  min-height: calc(100vh - 340px);
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}

.mrkb-sidebar {
  width: 220px;
  min-width: 220px;
  border-right: 1px solid var(--border);
  background: #fafbfc;
  display: flex;
  flex-direction: column;
}

.mrkb-search {
  padding: 12px;
  border-bottom: 1px solid var(--border);
}

.mrkb-nav {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
}

.mrkb-nav-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 10px 16px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 13px;
  color: var(--text-main);
  text-align: left;
  transition: background 0.15s;
}

.mrkb-nav-item:hover {
  background: #eef2ff;
}

.mrkb-nav-item.active {
  background: var(--primary-light);
  color: var(--primary);
  font-weight: 600;
  border-right: 3px solid var(--primary);
}

.mrkb-nav-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mrkb-nav-count {
  font-size: 11px;
  background: #e5e7eb;
  color: var(--text-secondary);
  padding: 1px 7px;
  border-radius: 10px;
  min-width: 20px;
  text-align: center;
}

.mrkb-nav-item.active .mrkb-nav-count {
  background: #c7d2fe;
  color: var(--primary);
}

.mrkb-nav-empty {
  padding: 24px 16px;
  text-align: center;
  color: var(--text-tertiary);
  font-size: 13px;
}

.mrkb-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
  min-width: 0;
}

.mrkb-content-header {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
}

.mrkb-content-header h3 {
  margin: 0;
  font-size: 18px;
  color: var(--text-main);
}

.mrkb-content-count {
  font-size: 13px;
  color: var(--text-tertiary);
}

.mrkb-card {
  margin-bottom: 16px;
  padding: 0;
  overflow: hidden;
}

.mrkb-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #f8fafc;
  border-bottom: 1px solid var(--border);
}

.mrkb-card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  font-size: 12px;
  color: var(--text-secondary);
}

.mrkb-card-meta i {
  margin-right: 4px;
  color: var(--text-tertiary);
}

.mrkb-card-body {
  padding: 16px;
  max-height: 600px;
  overflow-y: auto;
  transition: max-height 0.3s ease;
}

.mrkb-card-body.collapsed {
  max-height: 120px;
  overflow: hidden;
  position: relative;
}

.mrkb-card-body.collapsed::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 48px;
  background: linear-gradient(transparent, #fff);
}

.mrkb-content-text {
  margin: 0;
  font-size: 13px;
  line-height: 1.8;
  color: var(--text-main);
  white-space: pre-wrap;
  word-break: break-all;
  font-family: inherit;
}

.mrkb-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 300px;
  color: var(--text-tertiary);
  font-size: 14px;
}
</style>
