<template>
  <div v-if="stations.length > 1" class="workflow-step-bar">
    <div class="progress-bar-wrap">
      <div class="progress-steps">
        <template v-for="(st, idx) in stations" :key="idx">
          <div
            class="progress-step"
            :class="{
              active: idx === currentIdx,
              done: idx < currentIdx,
              clickable: idx !== currentIdx
            }"
            @click="goToModule(idx, st)"
          >
            <div class="step-dot">
              <i v-if="idx < currentIdx" class="fa-solid fa-check"></i>
              <span v-else>{{ idx + 1 }}</span>
            </div>
            <div class="step-label">{{ st.label || st.name }}</div>
          </div>
          <div
            v-if="idx < stations.length - 1"
            class="progress-line"
            :class="{ done: idx < currentIdx }"
          ></div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useTrainingStore } from '@/stores/training'

const router = useRouter()
const store = useTrainingStore()

const stations = computed(() => (store.stationFlow?.stations || []).map((s, i) => {
  const labelMap = {
    '病史采集': '病史采集', '体格检查': '体格检查', '辅助检查': '辅助检查',
    '诊断': '诊断', '治疗计划': '治疗', '病历书写': '书写病历'
  }
  return { ...s, label: labelMap[s.name] || s.name, index: i }
}))

const currentIdx = computed(() => store.currentFlowIndex ?? 0)

function goToModule(idx, st) {
  if (idx === currentIdx.value) return
  store.currentFlowIndex = idx
  if (store.stationFlow) store.stationFlow.currentIndex = idx
  store.saveTrainingSession()
  const routeName = st.routeName || (
    st.name === '病史采集' ? 'historyTaking' :
    st.name === '体格检查' ? 'physicalExam' :
    st.name === '辅助检查' ? 'ancillaryTests' :
    st.name === '诊断' ? 'diagnosis' :
    st.name === '治疗计划' ? 'treatmentPlan' :
    st.name === '病历书写' ? 'medicalRecord' : 'historyTaking'
  )
  router.replace({ name: routeName, query: { caseId: store.currentCase?.id || '' } })
}
</script>

<style scoped>
.workflow-step-bar {
  position: relative;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px 24px;
  margin-top: 46px;
  flex-shrink: 0;
}

.progress-bar-wrap {
  background: rgba(255,255,255,0.55);
  border-radius: 24px;
  padding: 6px 18px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
}

.progress-steps {
  display: flex;
  align-items: center;
}

.progress-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 72px;
  cursor: default;
  padding: 0 3px;
  position: relative;
}

.progress-step.clickable {
  cursor: pointer;
}

.progress-step.clickable .step-dot {
  transition: box-shadow 0.2s;
}

.progress-step.clickable:hover .step-dot {
  box-shadow: 0 0 0 4px rgba(64, 158, 255, 0.25);
}

.step-dot {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: #dcdfe6;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  transition: all 0.2s;
  flex-shrink: 0;
}

.progress-step.active .step-dot {
  background: #409eff;
  box-shadow: 0 2px 8px rgba(64,158,255,0.35);
  width: 28px;
  height: 28px;
  font-size: 13px;
}

.progress-step.done .step-dot {
  background: #67c23a;
}

.step-label {
  font-size: 15px;
  color: #909399;
  margin-top: 4px;
  white-space: nowrap;
  font-weight: 500;
  flex-shrink: 0;
}

.progress-step.active .step-label {
  color: #409EFF;
  font-weight: 700;
}

.progress-step.done .step-label {
  color: #67c23a;
}

.progress-step.clickable:hover .step-label {
  color: #409EFF;
}

.progress-line {
  height: 2px;
  flex: 1;
  min-width: 22px;
  background: #e0e3e8;
  margin: 0 2px;
  align-self: center;
  margin-bottom: 20px;
  transition: background 0.3s;
}

.progress-line.done {
  background: #67c23a;
}
</style>
