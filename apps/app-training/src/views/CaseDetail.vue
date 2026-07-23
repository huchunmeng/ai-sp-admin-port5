<template>
  <div class="mobile-case-detail">
    <div class="fullbody-photo">
      <img v-if="c.patient && c.patient.fullBodyImage" :src="c.patient.fullBodyImage" />
      <div v-else class="photo-placeholder"><i class="fa-solid fa-user-injured"></i></div>
    </div>

    <div class="detail-topbar">
      <button class="back-btn" @click="$router.push('/case-list')"><i class="fa-solid fa-arrow-left"></i></button>
      <span class="topbar-title">病例详情</span>
      <span style="width:36px;"></span>
    </div>

    <div class="info-sheet" v-if="c && c.patient">
      <div class="sheet-handle"></div>
      <div class="sheet-content">
        <div class="patient-card">
          <div class="patient-top">
            <div class="avatar">{{ c.patient.name ? c.patient.name.charAt(0) : '?' }}</div>
            <div class="patient-meta">
              <div class="patient-name">{{ c.patient.name }} <span class="diff-tag" :class="'diff-' + getCaseLevel(c.difficulty)">{{ getCaseLevelLabel(c.difficulty) }}</span></div>
              <div class="patient-sub">{{ c.patient.sex }} · {{ c.patient.age }}岁 · {{ c.patient.occupation }}</div>
              <div class="case-id">{{ c.id }}</div>
            </div>
          </div>
          <div class="vitals-row" v-if="c.vitals">
            <div class="vital-item" v-for="(val, key) in c.vitals" :key="key"
                 :class="{ danger: isVitalDanger(key, val), warning: isVitalWarning(key, val) }">
              <span class="vital-val">{{ val }}</span>
              <span class="vital-label">{{ vitalLabels[key] || key }}</span>
            </div>
          </div>
        </div>

        <div class="info-card" v-if="c.symptoms && c.symptoms.length">
          <div class="card-title">症状</div>
          <div class="symptom-tags">
            <span class="tag" v-for="s in c.symptoms" :key="s">{{ s }}</span>
          </div>
        </div>

        <div class="action-btns">
          <button class="btn btn-primary btn-block" @click="showStationModal = true">
            <i class="fa-solid fa-play"></i> 开始训练
          </button>
          <button class="btn btn-default btn-block" @click="showRecordsModal = true">
            <i class="fa-solid fa-clock-rotate-left"></i> 我的训练记录
          </button>
        </div>
      </div>
    </div>

    <div class="modal-overlay" v-if="showStationModal" @click.self="showStationModal = false">
      <div class="station-modal">
        <div class="modal-header">
          <span class="modal-title">选择考站</span>
          <button class="modal-close" @click="showStationModal = false"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="station-list">
          <div class="station-item" v-for="s in availableStations" :key="s.id" @click="selectStation(s)">
            <div class="station-icon"><i :class="'fa-solid ' + s.icon"></i></div>
            <div class="station-info">
              <div class="station-name">{{ s.name }}</div>
            </div>
            <i class="fa-solid fa-chevron-right"></i>
          </div>
        </div>
      </div>
    </div>

    <div class="modal-overlay" v-if="showRecordsModal" @click.self="showRecordsModal = false">
      <div class="station-modal">
        <div class="modal-header">
          <span class="modal-title">训练记录</span>
          <button class="modal-close" @click="showRecordsModal = false"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div v-if="caseRecords.length > 0" class="records-list">
          <div class="record-item" v-for="(r, idx) in caseRecords" :key="idx">
            <div class="record-left">
              <div class="record-station">{{ r.stationName }}</div>
              <div class="record-time">{{ r.time }}</div>
            </div>
            <div class="record-right">
              <span class="record-score" :class="scoreClass(r.score)">{{ r.score }}分</span>
              <span class="record-duration">{{ formatDuration(r.duration) }}</span>
            </div>
          </div>
        </div>
        <div v-else class="empty-records">暂无训练记录</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppTrainingStore } from '@/stores/appTraining'
import { getDifficultyLabel, getCaseLevel, getCaseLevelLabel } from '@ai-sp/shared'

const route = useRoute()
const router = useRouter()
const store = useAppTrainingStore()
const showStationModal = ref(false)
const showRecordsModal = ref(false)

const c = computed(() => store.currentCase || {})

const caseRecords = computed(() => {
  const caseId = route.params.caseId
  return store.trainingRecords.filter(r => r.caseId === caseId)
})

function scoreClass(s) { if (s >= 85) return 'great'; if (s >= 70) return 'good'; return 'low' }
function formatDuration(sec) { const m = Math.floor(sec / 60); const s = sec % 60; return m + '分' + s + '秒' }

const vitalLabels = { temp: '体温', pulse: '脉搏', rr: '呼吸', bp: '血压', spo2: 'SpO₂' }

function isVitalDanger(key, val) {
  if (key === 'bp') {
    const systolic = parseInt(val)
    return systolic > 140
  }
  if (typeof val === 'string' && val.indexOf('↑') >= 0) return true
  return false
}

function isVitalWarning(key, val) {
  if (key === 'temp') {
    const t = parseFloat(val)
    return t > 37.5
  }
  return false
}

const availableStations = computed(() => {
  if (!c.value || !c.value.stations) return store.stations
  return store.stations.filter(s => c.value.stations.indexOf(s.id) >= 0)
})

function selectStation(s) {
  store.currentCase = c.value
  store.currentStation = s
  const viewName = store.stationViewMap[s.id] || 'historyTaking'
  router.push({ name: viewName, query: { caseId: c.value.id } })
}

onMounted(async () => {
  const id = route.params.caseId
  if (!store.currentCase || store.currentCase.id !== id) {
    const found = await store.loadCaseDetail(id)
    if (found) store.currentCase = found
  }
})
</script>

<style scoped>
.mobile-case-detail { height: 100%; position: relative; background: #000; overflow: hidden; }

.fullbody-photo { position: absolute; top: 0; left: 0; right: 0; height: 65%; overflow: hidden; }
.fullbody-photo img { width: 100%; height: 100%; object-fit: cover; object-position: top center; }
.photo-placeholder { display: flex; align-items: center; justify-content: center; height: 100%; font-size: 64px; color: #555; }

.detail-topbar { position: absolute; top: 0; left: 0; right: 0; z-index: 10; height: 48px; display: flex; align-items: center; justify-content: space-between; padding: 0 12px; background: linear-gradient(to bottom, rgba(0,0,0,0.4), transparent); }
.back-btn { background: none; border: none; color: #fff; font-size: 18px; cursor: pointer; padding: 4px 8px; text-shadow: 0 1px 3px rgba(0,0,0,0.5); }
.topbar-title { font-size: 16px; font-weight: 600; color: #fff; text-shadow: 0 1px 3px rgba(0,0,0,0.5); }

.info-sheet { position: absolute; bottom: 0; left: 0; right: 0; max-height: 58%; background: #fff; border-radius: 20px 20px 0 0; display: flex; flex-direction: column; z-index: 5; box-shadow: 0 -4px 20px rgba(0,0,0,0.15); }
.sheet-handle { width: 36px; height: 4px; background: #DCDFE6; border-radius: 2px; margin: 10px auto 4px; flex-shrink: 0; }
.sheet-content { flex: 1; overflow-y: auto; padding: 8px 16px 20px; -ms-overflow-style: none; scrollbar-width: none; }
.sheet-content::-webkit-scrollbar { display: none; }

.patient-card { margin-bottom: 10px; }
.patient-top { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
.avatar { width: 44px; height: 44px; border-radius: 50%; background: #409EFF; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 600; flex-shrink: 0; }
.patient-name { font-size: 16px; font-weight: 600; display: flex; align-items: center; gap: 8px; }
.patient-sub { font-size: 12px; color: #909399; margin-top: 2px; }
.case-id { font-size: 10px; color: #C0C4CC; margin-top: 2px; }
.diff-tag { font-size: 10px; padding: 2px 6px; border-radius: 4px; }
.diff-basic { background: #d1fae5; color: #065f46; }
.diff-advanced { background: #fef3c7; color: #92400e; }
.diff-difficult { background: #fee2e2; color: #991b1b; }
.diff-undefined { background: #f3f4f6; color: #9ca3af; }

.vitals-row { display: flex; gap: 4px; flex-wrap: wrap; }
.vital-item { background: #f5f7fa; border-radius: 8px; padding: 6px 10px; text-align: center; flex: 1; min-width: 50px; }
.vital-val { font-size: 12px; font-weight: 600; color: #303133; display: block; }
.vital-label { font-size: 10px; color: #909399; margin-top: 2px; display: block; }
.vital-item.danger { background: #fef0f0; border: 1px solid #fecaca; }
.vital-item.danger .vital-val { color: #dc2626; }
.vital-item.warning { background: #fdf6ec; border: 1px solid #fde68a; }
.vital-item.warning .vital-val { color: #d97706; }

.info-card { margin-bottom: 8px; }
.card-title { font-size: 13px; font-weight: 600; color: #409EFF; margin-bottom: 4px; }
.card-text { font-size: 13px; color: #303133; line-height: 1.7; margin: 0; }
.symptom-tags { display: flex; flex-wrap: wrap; gap: 6px; }
.tag { font-size: 11px; padding: 3px 10px; background: #fef3c7; color: #92400e; border-radius: 4px; }

.action-btns { display: flex; flex-direction: column; gap: 8px; padding: 12px 0 8px; }
.btn { padding: 12px 20px; border: 1px solid #DCDFE6; border-radius: 10px; font-size: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; }
.btn-block { width: 100%; }
.btn-primary { background: #409EFF; color: #fff; border-color: #409EFF; }
.btn-default { background: #fff; color: #606266; }

.modal-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.45); z-index: 200; display: flex; align-items: flex-end; justify-content: center; }
.station-modal { background: #fff; border-radius: 16px 16px 0 0; width: 100%; max-height: 70vh; overflow-y: auto; padding: 20px 16px 32px; }
.modal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.modal-title { font-size: 17px; font-weight: 700; }
.modal-close { background: none; border: none; font-size: 20px; cursor: pointer; color: #909399; }
.modal-case-info { padding: 10px 14px; background: #f0f2f5; border-radius: 8px; margin-bottom: 14px; font-size: 13px; color: #606266; display: flex; align-items: center; gap: 8px; }
.station-list { display: flex; flex-direction: column; gap: 8px; }
.station-item { display: flex; align-items: center; gap: 14px; padding: 14px; background: #f5f7fa; border-radius: 12px; cursor: pointer; transition: all .15s; }
.station-item:hover { background: #ecf5ff; }
.station-icon { width: 44px; height: 44px; background: #409EFF; color: #fff; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; }
.station-info { flex: 1; }
.station-name { font-size: 14px; font-weight: 600; color: #303133; }
.station-desc { font-size: 11px; color: #909399; margin-top: 2px; line-height: 1.4; }
.records-list { display: flex; flex-direction: column; gap: 8px; }
.record-item { display: flex; justify-content: space-between; align-items: center; padding: 12px 14px; background: #f5f7fa; border-radius: 10px; }
.record-station { font-size: 14px; font-weight: 600; color: #303133; }
.record-time { font-size: 11px; color: #909399; margin-top: 2px; }
.record-right { text-align: right; }
.record-score { font-size: 16px; font-weight: 700; }
.record-score.great { color: #67C23A; }
.record-score.good { color: #409EFF; }
.record-score.low { color: #F56C6C; }
.record-duration { font-size: 11px; color: #C0C4CC; display: block; margin-top: 2px; }
.empty-records { text-align: center; padding: 24px; color: #C0C4CC; font-size: 14px; }
</style>
