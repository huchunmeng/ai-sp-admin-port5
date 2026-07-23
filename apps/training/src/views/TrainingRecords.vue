<template>
  <div class="modal-overlay" @click.self="goBack">
    <div class="modal-container records-modal">
      <div class="records-modal-header">
        <h3>{{ lang === 'zh' ? '训练记录' : 'Training Records' }}</h3>
        <button class="modal-close" @click="goBack"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div style="padding:10px 14px;background:#ecf5ff;border-radius:8px;margin-bottom:16px;display:flex;align-items:center;gap:8px;">
        <i class="fa-solid fa-folder-open" style="color:#409EFF;"></i>
        <span style="font-size:13px;">{{ lang === 'zh' ? '当前病例：' : 'Current Case: ' }}<strong>{{ c.title }}</strong> ({{ c.id }})</span>
      </div>

      <table class="records-table" v-if="paginatedRecords.length > 0">
        <thead>
          <tr>
            <th style="width:50px;">#</th>
            <th>{{ lang === 'zh' ? '训练时间' : 'Time' }}</th>
            <th>{{ lang === 'zh' ? '考站' : 'Station' }}</th>
            <th>{{ lang === 'zh' ? '分数' : 'Score' }}</th>
            <th>{{ lang === 'zh' ? '时长' : 'Duration' }}</th>
            <th>{{ lang === 'zh' ? '操作' : 'Action' }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(r, idx) in paginatedRecords" :key="r.id">
            <td>{{ (currentPage - 1) * pageSize + idx + 1 }}</td>
            <td>{{ r.time }}</td>
            <td>
              <span class="tag tag-info" v-if="r.trainingVersion === '1.0' && !r._expandedFrom">1.0版</span>
              <span class="tag tag-success" v-else-if="r.trainingVersion === 'full-flow' && !r._expandedFrom">全流程版</span>
              <span class="tag tag-info" v-else>{{ r.stationName }}</span>
            </td>
            <td>
              <span v-if="r.score === 'pending'" class="score-pending">
                {{ lang === 'zh' ? '正在分析对话记录...' : 'Analyzing conversation...' }}
              </span>
              <span v-else :class="{'score-high': r.score >= 85, 'score-mid': r.score >= 60, 'score-low': r.score < 60}">
                {{ r.score }}{{ lang === 'zh' ? '分' : 'pts' }}
              </span>
            </td>
            <td>{{ formatDuration(r.duration) }}</td>
            <td>
              <button v-if="r.score === 'pending'" class="btn btn-sm" disabled style="opacity:0.5;">
                <i class="fa-solid fa-spinner fa-spin"></i>
                {{ lang === 'zh' ? '报告正在生成，请稍后查看' : 'Report generating, check later' }}
              </button>
              <button v-else class="btn btn-sm" @click="viewReport(r)">
                <i class="fa-solid fa-file-lines"></i> {{ lang === 'zh' ? '查看报告' : 'View' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <div class="empty-state" v-else style="padding:40px 20px;">
        <i class="fa-solid fa-inbox"></i>
        <p>{{ lang === 'zh' ? '暂无训练记录' : 'No training records yet' }}</p>
      </div>

      <div class="records-pagination" v-if="totalPages >= 1">
        <span>{{ lang === 'zh' ? '共' : 'Total' }} {{ records.length }} {{ lang === 'zh' ? '条' : 'items' }}</span>
        <span style="margin:0 12px;">{{ pageSize }}{{ lang === 'zh' ? '条/页' : '/page' }}</span>
        <button class="page-btn" :disabled="currentPage === 1" @click="currentPage--"><i class="fa-solid fa-angle-left"></i></button>
        <span v-for="p in visiblePages" :key="p"
              class="page-btn" :class="{ active: p === currentPage }"
              @click="currentPage = p"
              style="font-size:12px;">{{ p }}</span>
        <button class="page-btn" :disabled="currentPage === totalPages" @click="currentPage++"><i class="fa-solid fa-angle-right"></i></button>
        <span style="margin-left:12px;">{{ lang === 'zh' ? '前往' : 'Go to' }}</span>
        <input type="number" v-model.number="jumpPage" @keyup.enter="doJump" min="1" :max="totalPages">
        <span>{{ lang === 'zh' ? '页' : 'Page' }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useTrainingStore } from '@/stores/training'

const props = defineProps({
  caseId: { type: String, required: true },
  versionFilter: { type: Array, default: null }  // null = 全部, 否则过滤 trainingVersion
})
const emit = defineEmits(['close', 'viewReport'])

const store = useTrainingStore()

const lang = ref(store.lang || 'zh')
const c = computed(() => store.currentCase || {})
const currentPage = ref(1)
const jumpPage = ref(1)
const pageSize = 10

const records = computed(() => {
  const caseId = props.caseId || c.value.id
  let all = store.getTrainingRecords(caseId)
  if (props.versionFilter && props.versionFilter.length) {
    all = all.filter(r => props.versionFilter.includes(r.trainingVersion) || !r.trainingVersion)
  }
  return all
})

const totalPages = computed(() => {
  return Math.ceil(records.value.length / pageSize) || 1
})

const paginatedRecords = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return records.value.slice(start, start + pageSize)
})

const visiblePages = computed(() => {
  const pages = []
  const total = totalPages.value
  const current = currentPage.value
  let start = Math.max(1, current - 2)
  let end = Math.min(total, current + 2)
  if (end - start < 4) {
    if (start === 1) end = Math.min(total, start + 4)
    else start = Math.max(1, end - 4)
  }
  for (let i = start; i <= end; i++) pages.push(i)
  return pages
})

function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (mins > 0) return mins + 'min ' + secs + 's'
  return secs + 's'
}

function viewReport(record) {
  store.currentRecord = record
  store.currentCase = c.value
  emit('viewReport', record)
}

function goBack() {
  emit('close')
}

function doJump() {
  if (jumpPage.value >= 1 && jumpPage.value <= totalPages.value) {
    currentPage.value = jumpPage.value
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,.45);
  display: flex; align-items: center; justify-content: center;
  z-index: 1000;
}
.modal-container {
  background: #fff; border-radius: 12px; box-shadow: 0 8px 40px rgba(0,0,0,.15);
  width: 90%; max-width: 900px; max-height: 85vh; overflow-y: auto;
  padding: 24px;
}
.records-modal-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 16px;
}
.records-modal-header h3 { margin: 0; font-size: 18px; }
.modal-close {
  background: none; border: none; font-size: 20px; cursor: pointer;
  color: var(--text-secondary); padding: 4px 8px; border-radius: 4px;
}
.modal-close:hover { background: #f5f5f5; }
.records-table {
  width: 100%; border-collapse: collapse; font-size: 13px;
}
.records-table th {
  background: #f5f7fa; padding: 10px 12px; text-align: left;
  font-weight: 600; border-bottom: 1px solid #e5e7eb;
}
.records-table td {
  padding: 10px 12px; border-bottom: 1px solid #f0f0f0;
}
.tag-info {
  background: #ecf5ff; color: #409EFF; padding: 2px 8px;
  border-radius: 4px; font-size: 12px;
}
.tag-success {
  background: #f0f9eb; color: #67C23A; padding: 2px 8px;
  border-radius: 4px; font-size: 12px;
}
.score-high { color: #67C23A; font-weight: 700; }
.score-mid { color: #E6A23C; font-weight: 700; }
.score-low { color: #F56C6C; font-weight: 700; }
.score-pending { color: #909399; font-style: italic; }
.empty-state { text-align: center; color: var(--text-secondary); }
.empty-state i { font-size: 36px; color: var(--text-placeholder); margin-bottom: 8px; }
.empty-state p { margin: 0; }
.records-pagination {
  display: flex; align-items: center; justify-content: center;
  margin-top: 16px; gap: 4px; font-size: 13px; flex-wrap: wrap;
}
.page-btn {
  background: #fff; border: 1px solid #d9d9d9; border-radius: 4px;
  padding: 4px 10px; cursor: pointer; min-width: 32px; text-align: center;
}
.page-btn:hover { border-color: var(--primary); color: var(--primary); }
.page-btn.active { background: var(--primary); color: #fff; border-color: var(--primary); }
.page-btn:disabled { opacity: .4; cursor: not-allowed; }
.records-pagination input[type="number"] {
  width: 50px; padding: 4px 6px; border: 1px solid #d9d9d9; border-radius: 4px;
  text-align: center;
}
</style>
