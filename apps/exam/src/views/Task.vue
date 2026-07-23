<template>
  <div class="page" :class="{ portrait: store.portraitMode }" style="height:100%;display:flex;flex-direction:column;">
    <div style="padding:12px 16px;border-bottom:1px solid #E5E7EB;display:flex;justify-content:space-between;">
      <span class="font-bold">任务说明</span>
      <a href="#" style="font-size:11px;color:#4A90E2;text-decoration:none;" @click.prevent="store.setPage('device-select')">← 返回设备选择</a>
    </div>
    <div style="padding:20px 24px;flex:1;display:flex;flex-direction:column;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
        <span style="font-size:13px;color:#9CA3AF;">当前时间 {{ now }}</span>
        <span style="font-size:13px;">考生：{{ store.examInfo.candidateName }} {{ store.examInfo.candidatePhone }}</span>
      </div>
      <div style="font-size:16px;font-weight:700;margin-bottom:4px;">王莹莹创建的考试0409-190</div>
      <div style="font-size:13px;color:#4B5563;margin-bottom:16px;">考核项目：{{ store.examInfo.selectedProjects[0] }}（{{ store.examInfo.station }}）</div>
      <div class="card" style="margin-bottom:12px;">
        <div style="font-size:15px;font-weight:600;margin-bottom:8px;">📋 任务说明</div>
        <div style="font-size:14px;color:#4B5563;">请你用<strong>14分钟</strong>的时间对患者进行病史采集。</div>
      </div>
      <div class="patient-info" style="margin-bottom:12px;">
        <div><strong>情景：</strong>{{ store.patientInfo.scene }}</div>
        <div style="margin-top:4px;"><strong>患者：</strong>{{ store.patientInfo.name }}；{{ store.patientInfo.age }}岁；{{ store.patientInfo.gender }}；{{ store.patientInfo.occupation }}</div>
        <div style="margin-top:4px;"><strong>主诉：</strong>{{ store.patientInfo.chiefComplaint }}</div>
        <div class="vital-signs" style="display:flex;gap:12px;flex-wrap:wrap;margin-top:6px;">
          <span v-for="v in store.patientInfo.vitals" :key="v.label" class="vital-item">{{ v.label }} {{ v.value }}</span>
        </div>
      </div>
      <div style="flex:1;"></div>
      <button class="btn btn-primary btn-block" @click="store.setPage('dialogue')">开始答题</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useExamStore } from '@/stores/exam'
const store = useExamStore()
const now = ref(new Date().toTimeString().slice(0, 5))
const timer = setInterval(() => { now.value = new Date().toTimeString().slice(0, 5) }, 60000)
onUnmounted(() => clearInterval(timer))
</script>

<style scoped>
.font-bold { font-weight:600; }
.card { background:#fff; border-radius:12px; box-shadow:0 2px 8px rgba(0,0,0,0.05); padding:20px; }
.patient-info { background:#E6F0FA; border-radius:8px; padding:12px 16px; font-size:13px; line-height:1.6; }
.vital-item { padding:4px 10px; background:#fff; border-radius:6px; font-size:12px; color:#4B5563; }
.btn { display:inline-flex; align-items:center; justify-content:center; padding:10px 24px; border-radius:8px; font-size:14px; cursor:pointer; border:none; min-height:44px; }
.btn-primary { background:#4A90E2; color:#fff; } .btn-primary:hover { background:#3A7BC8; }
.btn-block { width:100%; }

/* Portrait mode */
.portrait .card { padding: 14px; }
.portrait .patient-info { font-size: 12px; padding: 10px 12px; }
.portrait .vital-item { padding: 2px 6px; font-size: 10px; }
</style>
