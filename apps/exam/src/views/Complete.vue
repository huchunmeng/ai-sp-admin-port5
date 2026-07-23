<template>
  <div class="page" :class="{ portrait: store.portraitMode }" style="flex:1;display:flex;align-items:center;justify-content:center;padding:40px;">
    <div style="text-align:center;">
      <div style="font-size:56px;margin-bottom:16px;">✅</div>
      <div style="font-size:22px;font-weight:700;color:#52C41A;margin-bottom:8px;">本项目已完成</div>
      <div style="font-size:14px;color:#4B5563;margin-bottom:24px;">答题数据已提交，等待后续安排</div>
      <div class="card" style="text-align:left;display:inline-block;margin-bottom:16px;">
        <div style="font-size:13px;font-weight:600;margin-bottom:8px;">📋 已完成考核项目</div>
        <div style="font-size:12px;color:#4B5563;line-height:2;">
          <div>✅ 病史采集 — 已完成</div>
          <div style="color:#4A90E2;">⏳ 口腔检查 — 待考</div>
          <div style="color:#9CA3AF;">⬜ 病历书写 — 未开始</div>
        </div>
      </div>
      <div style="margin-bottom:8px;font-size:12px;color:#9CA3AF;">{{ countdown }}秒后自动返回…</div>
      <button class="btn btn-primary" style="width:200px;" @click="store.setPage('confirm')">确 定</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useExamStore } from '@/stores/exam'
const store = useExamStore()

const countdown = ref(5)
let timer = null
let cdtimer = null

function startCountdown() {
  countdown.value = 5
  cdtimer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) { clearInterval(cdtimer); store.setPage('confirm') }
  }, 1000)
}

onMounted(startCountdown)
onUnmounted(() => { if (cdtimer) clearInterval(cdtimer) })
</script>

<style scoped>
.card { background:#fff; border-radius:12px; box-shadow:0 2px 8px rgba(0,0,0,0.05); padding:20px; width:320px; }
.btn { display:inline-flex; align-items:center; justify-content:center; padding:10px 24px; border-radius:8px; font-size:14px; cursor:pointer; border:none; min-height:44px; }
.btn-primary { background:#4A90E2; color:#fff; } .btn-primary:hover { background:#3A7BC8; }

/* Portrait mode */
.portrait .card { width: 260px; padding: 14px; }
</style>
