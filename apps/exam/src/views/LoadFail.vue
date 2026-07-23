<template>
  <div class="page" :class="{ portrait: store.portraitMode }" style="flex:1;display:flex;align-items:center;justify-content:center;padding:40px;">
    <div style="text-align:center;">
      <div style="font-size:56px;margin-bottom:16px;">⚠️</div>
      <div style="font-size:20px;font-weight:700;color:#FF4D4F;margin-bottom:8px;">考核项目加载失败</div>
      <div style="font-size:14px;color:#4B5563;margin-bottom:24px;">病例数据不完整，请联系考务人员</div>
      <div style="display:flex;gap:12px;justify-content:center;">
        <button class="btn btn-default" @click="store.setPage('device-select')">返回设备选择</button>
        <button class="btn btn-primary" @click="retry">重 试</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useExamStore } from '@/stores/exam'
const store = useExamStore()
function retry() {
  store.setPage('device-select')
}
</script>

<style scoped>
.btn { display:inline-flex; align-items:center; justify-content:center; padding:10px 24px; border-radius:8px; font-size:14px; cursor:pointer; border:none; min-height:44px; }
.btn-default { background:#fff; color:#4B5563; border:1px solid #E5E7EB; }
.btn-primary { background:#4A90E2; color:#fff; } .btn-primary:hover { background:#3A7BC8; }

/* Portrait mode */
.portrait .btn { padding: 8px 18px; font-size: 13px; min-height: 40px; }
</style>
