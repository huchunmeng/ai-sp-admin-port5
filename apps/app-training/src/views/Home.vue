<template>
  <div class="page">
    <div class="greeting">你好，{{ store.user.name }} 👋</div>
    <div class="subtitle">{{ store.user.phase }} · {{ store.user.specialty }}</div>

    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-num">{{ store.stats.totalTrainings }}</div>
        <div class="stat-label">训练次数</div>
      </div>
      <div class="stat-card">
        <div class="stat-num">{{ store.stats.completedCount }}</div>
        <div class="stat-label">已完成</div>
      </div>
      <div class="stat-card">
        <div class="stat-num">{{ store.stats.averageScore }}</div>
        <div class="stat-label">平均分</div>
      </div>
    </div>

    <div class="section-title">📌 最近训练</div>
    <div v-if="store.trainingRecords.length === 0" class="empty">暂无训练记录</div>
    <div v-for="r in recentRecords" :key="r.id" class="training-card" @click="viewScore(r)">
      <div class="training-info">
        <div class="training-title">{{ r.stationName }}</div>
        <div class="training-sub">{{ r.caseTitle }}</div>
        <div class="training-date">{{ r.time }}</div>
      </div>
      <div class="training-score">
        <span class="score-val">{{ r.score }}<small>分</small></span>
      </div>
    </div>

    <div class="section-title">🎯 推荐训练</div>
    <div class="case-scroll">
      <div v-for="c in untrainedCases" :key="c.id" class="case-card" @click="goDetail(c)">
        <div class="case-title">{{ c.title }}</div>
        <div class="case-meta">{{ getSpecialtyName(c.specialty) }} · {{ c.disease }}</div>
        <span class="case-diff" :class="'diff-' + getCaseLevel(c.difficulty)">{{ getCaseLevelLabel(c.difficulty) }}</span>
      </div>
      <div v-if="untrainedCases.length === 0" class="empty" style="min-width:100%;">所有病例已完成训练 🎉</div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAppTrainingStore } from '@/stores/appTraining'
import { getDifficultyLabel, getCaseLevel, getCaseLevelLabel } from '@ai-sp/shared'

const router = useRouter()
const store = useAppTrainingStore()

const recentRecords = computed(() => store.trainingRecords.slice(0, 5))

const untrainedCases = computed(() =>
  store.availableCases.filter(c => c.status !== 'trained')
)

function getSpecialtyName(specId) {
  const specs = store.specialties.resident
  const found = specs.find(s => s.id === specId || s.name === specId)
  return found ? found.name : specId
}

onMounted(() => {
  if (store.availableCases.length === 0) store.loadCases()
})

function viewScore(r) {
  store.currentRecord = r
  router.push({ name: 'scoreReport' })
}

function goDetail(c) {
  store.selectCase(c)
  router.push({ name: 'caseDetail', params: { caseId: c.id } })
}
</script>

<style scoped>
.page { padding: 16px; }
.greeting { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
.subtitle { font-size: 13px; color: var(--text-secondary); margin-bottom: 16px; }
.stat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 20px; }
.stat-card { background: #fff; border-radius: var(--radius); padding: 16px 12px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
.stat-num { font-size: 24px; font-weight: 700; color: var(--primary); }
.stat-label { font-size: 11px; color: var(--text-tertiary); margin-top: 4px; }
.section-title { font-size: 15px; font-weight: 600; margin: 16px 0 10px; }
.empty { text-align: center; padding: 30px; color: var(--text-tertiary); font-size: 13px; }
.training-card { display: flex; align-items: center; justify-content: space-between; background: #fff; border-radius: var(--radius); padding: 14px; margin-bottom: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); cursor: pointer; }
.training-card:active { background: #f5f7fa; }
.training-title { font-size: 14px; font-weight: 600; }
.training-sub { font-size: 12px; color: var(--text-secondary); margin-top: 2px; }
.training-date { font-size: 11px; color: var(--text-tertiary); margin-top: 2px; }
.training-score { }
.score-val { font-size: 20px; font-weight: 700; color: var(--success); }
.score-val small { font-size: 12px; font-weight: 400; margin-left: 2px; }
.case-scroll { display: flex; gap: 10px; overflow-x: auto; padding-bottom: 8px; }
.case-card { min-width: 150px; background: #fff; border-radius: var(--radius); padding: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); cursor: pointer; }
.case-card:active { background: #f5f7fa; }
.case-title { font-size: 13px; font-weight: 600; margin-bottom: 4px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.case-meta { font-size: 11px; color: var(--text-secondary); margin-bottom: 6px; }
.case-diff { font-size: 10px; padding: 2px 8px; border-radius: 4px; font-weight: 500; }
.diff-basic { background: #d1fae5; color: #065f46; }
.diff-advanced { background: #fef3c7; color: #92400e; }
.diff-difficult { background: #fee2e2; color: #991b1b; }
</style>
