<template>
  <div class="modal-overlay" @click.self="goBack">
    <div class="modal-container" style="position:relative;">
      <div class="station-modal-titlebar">
        <h3>{{ lang === 'zh' ? '请选择考站进行训练' : 'Please Select Training Station' }}</h3>
      </div>
      <button class="modal-close" style="position:absolute;top:16px;right:24px;" @click="goBack">
        <i class="fa-solid fa-xmark"></i>
      </button>
      <div style="padding:12px 16px;background:#f0f2f5;border-radius:8px;margin-bottom:20px;display:flex;align-items:center;gap:8px;">
        <i class="fa-solid fa-circle-info" style="color:#409EFF;"></i>
        <span style="font-size:13px;color:#606266;">
          {{ lang === 'zh' ? '当前病例：' : 'Current Case: ' }}<strong>{{ caseTitle }}</strong>
          ({{ caseId }})
        </span>
      </div>
      <div class="station-btn-grid" style="grid-template-columns: repeat(3, 1fr);">
        <div class="station-btn" v-for="s in availableStations" :key="s.name"
             @click="selectStation(s)">
          <div style="font-size:28px;margin-bottom:8px;"><i :class="'fa-solid ' + (s.icon || 'fa-stethoscope')"></i></div>
          <div>{{ lang === 'zh' ? s.name : (s.nameEn || s.name) }}</div>
          <div style="font-size:11px;color:#909399;margin-top:4px;">{{ s.duration }}{{ lang === 'zh' ? '分钟' : 'min' }}</div>
          <div style="font-size:11px;color:#909399;margin-top:2px;" v-if="s.projects">{{ s.projects.join('、') }}</div>
        </div>
      </div>
      <div class="modal-footer" style="margin-top:24px;">
        <button class="btn" @click="goBack">
          <i class="fa-solid fa-arrow-left"></i> {{ lang === 'zh' ? '返回' : 'Back' }}
        </button>
      </div>
    </div>

    <!-- 人文沟通场景选择弹窗 -->
    <div class="modal-overlay" v-if="showScenarioModal" @click.self="showScenarioModal = false">
      <div class="modal-container">
        <div class="station-modal-titlebar">
          <h3>{{ lang === 'zh' ? '请选择沟通场景' : 'Select Communication Scenario' }}</h3>
        </div>
        <button class="modal-close" style="position:absolute;top:16px;right:24px;" @click="showScenarioModal = false">
          <i class="fa-solid fa-xmark"></i>
        </button>
        <div class="scenario-select-grid" v-if="humanityScenarios.length > 0">
          <div v-for="sc in humanityScenarios" :key="sc.scenario_id"
               class="scenario-card" :class="{ core: sc.priority === 'core' }"
               @click="selectHumanityScenario(sc)">
            <div class="scenario-card-header">
              <span class="sc-card-star" v-if="sc.priority === 'core'">★</span>
              <span class="sc-card-name">{{ sc.scenario_name }}</span>
              <span class="sc-card-badge" v-if="sc.communication_target === 'family'">{{ lang === 'zh' ? '家属沟通' : 'Family' }}</span>
              <span class="sc-card-badge patient" v-else>{{ lang === 'zh' ? '患者沟通' : 'Patient' }}</span>
            </div>
            <div class="sc-card-desc">{{ sc.sp_materials?.role_description || '' }}</div>
            <div class="sc-card-task" v-if="sc.candidate_materials?.task">
              <i class="fa-solid fa-clipboard-check"></i> {{ sc.candidate_materials.task }}
            </div>
          </div>
        </div>
        <div class="scenario-select-empty" v-else>
          <p>{{ lang === 'zh' ? '该病例暂无沟通场景数据' : 'No communication scenario data for this case.' }}</p>
          <button class="scenario-back-btn" @click="showScenarioModal = false">{{ lang === 'zh' ? '返回考站选择' : 'Back to Station Selection' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTrainingStore } from '@/stores/training'
import { useStationFlow } from '@/composables/useStationFlow'
import { useCaseLoader } from '@/composables/useCaseLoader'

const route = useRoute()
const router = useRouter()
const store = useTrainingStore()
const { stations, loadStations, STATION_ROUTE_MAP } = useStationFlow()
const { loadCase } = useCaseLoader()

const lang = ref(store.lang || 'zh')
const caseTitle = ref('')
const caseId = ref(route.query.caseId || '')
const showScenarioModal = ref(false)
const humanityScenarios = ref([])

const availableStations = computed(() => {
  if (stations.value.length > 0) return stations.value
  return [
    { name: '接诊病人站', duration: 15, routeName: 'historyTaking', icon: 'fa-user-doctor' },
    { name: '临床思维站', duration: 15, routeName: 'caseAnalysis', icon: 'fa-magnifying-glass-chart' },
    { name: '交流沟通站', duration: 15, routeName: 'humanisticComm', icon: 'fa-comments' },
  ]
})

function selectStation(s) {
  const routeName = s.routeName || STATION_ROUTE_MAP[s.name]?.route || 'historyTaking'
  if (routeName === 'humanisticComm') {
    if (humanityScenarios.value.length > 0) {
      showScenarioModal.value = true
      return
    }
  }
  if (routeName === 'mentalExam') {
    router.push({ name: 'stationLoading', query: { caseId: caseId.value, target: 'mentalExam' } })
    return
  }
  router.push({ name: 'stationLoading', query: { caseId: caseId.value, target: routeName } })
}

function selectHumanityScenario(sc) {
  showScenarioModal.value = false
  router.push({ name: 'stationLoading', query: { caseId: caseId.value, target: 'humanisticComm', scenarioId: sc.scenario_id } })
}

function goBack() {
  router.push({ name: 'caseDetail', params: { caseId: caseId.value } })
}

onMounted(async () => {
  const cid = route.query.caseId || store.currentCase?.id
  if (cid) {
    caseId.value = cid
    const data = await loadCase(cid)
    if (data?.basic) {
      caseTitle.value = data.basic.title || cid
      const specialty = data.basic.specialty
      if (specialty) await loadStations(specialty)
    }
    if (data?.humanity?.scenarios) {
      humanityScenarios.value = data.humanity.scenarios
    }
  }
})
</script>

<style scoped>
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 2000;
  display: flex; align-items: center; justify-content: center;
}
.modal-container {
  background: #fff; border-radius: 14px; width: 680px; max-width: 95vw; max-height: 90vh;
  overflow-y: auto; box-shadow: 0 12px 48px rgba(0,0,0,0.2); padding: 28px 32px;
}
.station-modal-titlebar h3 { font-size: 18px; font-weight: 700; color: #303133; margin: 0; }
.modal-close { background: none; border: none; font-size: 20px; color: #909399; cursor: pointer; }
.modal-close:hover { color: #F56C6C; }
.station-btn-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.station-btn { text-align: center; padding: 20px 12px; border-radius: 12px; cursor: pointer; border: 2px solid #EBEEF5; transition: all .15s; color: #606266; }
.station-btn:hover { border-color: #409EFF; color: #409EFF; background: #ecf5ff; }
.btn { padding: 10px 20px; border-radius: 8px; cursor: pointer; font-size: 14px; border: 1px solid #DCDFE6; background: #fff; color: #606266; display: inline-flex; align-items: center; gap: 6px; }
.btn:hover { border-color: #409EFF; color: #409EFF; }

.scenario-select-grid { display: flex; flex-direction: column; gap: 12px; }
.scenario-card { padding: 16px 20px; border-radius: 10px; cursor: pointer; border: 2px solid #EBEEF5; transition: all .15s; text-align: left; }
.scenario-card:hover { border-color: #409EFF; background: #ecf5ff; }
.scenario-card.core { border-color: #E6A23C; background: #fef9f0; }
.scenario-card.core:hover { border-color: #E6A23C; background: #fef3e0; }
.scenario-card-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.sc-card-star { color: #E6A23C; font-size: 14px; }
.sc-card-name { font-size: 15px; font-weight: 700; color: #303133; }
.sc-card-badge { font-size: 11px; padding: 1px 6px; border-radius: 4px; background: #e6f7ff; color: #1890ff; }
.sc-card-badge.patient { background: #f6ffed; color: #52c41a; }
.sc-card-desc { font-size: 12px; color: #606266; line-height: 1.5; margin-bottom: 6px; }
.sc-card-task { font-size: 12px; color: #909399; }
.sc-card-meta { display: flex; gap: 12px; font-size: 11px; color: #C0C4CC; margin-top: 6px; }
.scenario-select-empty { text-align: center; padding: 32px 0; }
.scenario-back-btn { margin-top: 12px; padding: 8px 20px; border-radius: 6px; cursor: pointer; border: 1px solid #DCDFE6; background: #fff; color: #606266; }
</style>
