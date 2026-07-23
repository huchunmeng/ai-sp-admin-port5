<template>
  <div class="page" :class="{ portrait: store.portraitMode }" style="height:100%;display:flex;flex-direction:column;">
    <div style="padding:12px 16px;border-bottom:1px solid #E5E7EB;display:flex;justify-content:space-between;align-items:center;">
      <span class="font-bold">考生信息确认</span>
      <a href="#" style="font-size:11px;color:#4A90E2;text-decoration:none;" @click.prevent="store.setPage('device-select')">← 返回设备选择</a>
    </div>
    <div style="flex:1;overflow-y:auto;padding:12px 16px;">
      <div class="card" style="text-align:center;margin-bottom:12px;">
        <div style="font-size:14px;color:#4B5563;margin-bottom:4px;">{{ store.examInfo.topic }} · {{ store.examInfo.station }} — {{ store.examInfo.selectedProjects.join('、') }}</div>
        <div class="avatar-icon" style="width:72px;height:72px;border-radius:50%;background:#E6F0FA;margin:0 auto 12px;display:flex;align-items:center;justify-content:center;font-size:28px;">👤</div>
        <div style="font-size:20px;font-weight:700;margin-bottom:4px;">{{ store.examInfo.candidateName }}</div>
        <div style="font-size:13px;color:#4B5563;margin-bottom:4px;">📱 {{ store.examInfo.candidatePhone }} ｜ 🆔 考号：无 ｜ 🏥 {{ store.examInfo.candidateRoom }}</div>
        <div style="font-size:11px;color:#9CA3AF;margin-bottom:8px;">💻 当前设备：<strong>{{ store.examInfo.deviceName }}</strong></div>
        <button class="btn btn-primary btn-block" style="margin-top:12px;" @click="store.setPage('task')">确认考生信息</button>
        <button class="btn btn-outline btn-block" style="margin-top:8px;" @click="store.setPage('candidate-queue')">切换考生</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useExamStore } from '@/stores/exam'
const store = useExamStore()
</script>

<style scoped>
.font-bold { font-weight:600; }
.card { background:#fff; border-radius:12px; box-shadow:0 2px 8px rgba(0,0,0,0.05); padding:20px; }
.btn { display:inline-flex; align-items:center; justify-content:center; padding:10px 24px; border-radius:8px; font-size:14px; cursor:pointer; border:none; min-height:44px; }
.btn-primary { background:#4A90E2; color:#fff; } .btn-primary:hover { background:#3A7BC8; }
.btn-outline { background:#fff; color:#4A90E2; border:2px solid #4A90E2; }
.btn-block { width:100%; }

/* Portrait mode */
.portrait .card { padding: 14px; }
</style>
