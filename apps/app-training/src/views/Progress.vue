<template>
  <div class="page">
    <div class="section-title">📊 训练进度</div>
    <div class="summary-bar">
      <span>已完成 {{ completedCount }} 次训练</span>
      <span>均分 {{ averageScore }}</span>
    </div>

    <div class="filter-row">
      <select v-model="stationFilter">
        <option value="">全部考站</option>
        <option v-for="s in store.stations" :key="s.id" :value="s.name">{{ s.name }}</option>
      </select>
    </div>

    <div v-if="filteredRecords.length === 0" class="empty">暂无训练记录</div>
    <div v-for="r in filteredRecords" :key="r.id" class="record-item" @click="viewScore(r)">
      <div class="record-left">
        <div class="record-title">{{ r.stationName }}</div>
        <div class="record-sub">{{ r.caseTitle }}</div>
        <div class="record-date">{{ r.time }}</div>
      </div>
      <div class="record-right">
        <span class="tag status-done">已完成</span>
        <div class="record-score">{{ r.score }}<small>分</small></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAppTrainingStore } from '@/stores/appTraining'

const router = useRouter()
const store = useAppTrainingStore()

const stationFilter = ref('')

const completedCount = computed(() => store.trainingRecords.length)

const averageScore = computed(() => {
  const records = store.trainingRecords
  if (records.length === 0) return '-'
  const sum = records.reduce((acc, r) => acc + (r.score || 0), 0)
  return (sum / records.length).toFixed(1)
})

const filteredRecords = computed(() => {
  if (!stationFilter.value) return store.trainingRecords
  return store.trainingRecords.filter(r => r.stationName === stationFilter.value)
})

function viewScore(r) {
  store.currentRecord = r
  router.push({ name: 'scoreReport' })
}
</script>

<style scoped>
.page { padding: 16px; }
.section-title { font-size: 15px; font-weight: 600; margin-bottom: 12px; }
.summary-bar { display: flex; justify-content: space-between; background: var(--primary-light); border-radius: 10px; padding: 12px 14px; margin-bottom: 14px; font-size: 13px; color: var(--primary); font-weight: 500; }
.filter-row { margin-bottom: 12px; }
.filter-row select { width: 100%; padding: 8px 10px; border: 1px solid #DCDFE6; border-radius: 8px; font-size: 13px; color: #606266; background: #fff; outline: none; }
.empty { text-align: center; padding: 50px 20px; color: var(--text-tertiary); font-size: 13px; }
.record-item { display: flex; align-items: center; justify-content: space-between; background: #fff; border-radius: 12px; padding: 14px; margin-bottom: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); cursor: pointer; }
.record-item:active { background: #f5f7fa; }
.record-title { font-size: 14px; font-weight: 600; }
.record-sub { font-size: 12px; color: var(--text-secondary); margin-top: 2px; }
.record-date { font-size: 11px; color: var(--text-tertiary); margin-top: 2px; }
.record-right { text-align: right; }
.tag { font-size: 10px; padding: 2px 8px; border-radius: 4px; font-weight: 500; display: inline-block; margin-bottom: 4px; }
.status-done { background: #d1fae5; color: #065f46; }
.record-score { font-size: 20px; font-weight: 700; color: var(--success); }
.record-score small { font-size: 12px; font-weight: 400; margin-left: 2px; }
</style>
