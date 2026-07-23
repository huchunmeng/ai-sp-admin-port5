<template>
  <div class="page" :class="{ portrait: store.portraitMode }" style="flex:1;display:flex;align-items:center;justify-content:center;padding:40px;">
    <div style="width:380px;text-align:center;">
      <div style="font-size:16px;font-weight:600;margin-bottom:8px;">请输入考试口令</div>
      <div style="font-size:12px;color:#9CA3AF;margin-bottom:28px;">由考官/管理员提供的6位数字口令</div>
      <div class="digit-boxes">
        <div v-for="i in 6" :key="i" class="digit-box" :class="{ filled: digits[i-1] !== '', active: activeIdx === i-1 }" @click="activeIdx = i-1">
          {{ digits[i-1] }}
        </div>
      </div>
      <div style="margin-top:10px;font-size:11px;color:#9CA3AF;">点击上方方框后使用键盘输入</div>
      <div style="margin-top:24px;">
        <button class="btn btn-primary" style="width:160px;" @click="store.setPage('device-select')">确 定</button>
      </div>
      <div style="margin-top:12px;font-size:12px;color:#9CA3AF;">当前账号：138****1234</div>
      <div style="margin-top:4px;"><a href="#" style="font-size:12px;color:#4A90E2;text-decoration:none;" @click.prevent="store.setPage('login')">退出登录</a></div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useExamStore } from '@/stores/exam'
const store = useExamStore()

const digits = ref(['','','','','',''])
const activeIdx = ref(0)

function handleKeydown(e) {
  if (e.key >= '0' && e.key <= '9') {
    if (activeIdx.value < 6) {
      digits.value[activeIdx.value] = e.key
      if (activeIdx.value < 5) activeIdx.value++
    }
  } else if (e.key === 'Backspace') {
    if (activeIdx.value > 0 && digits.value[activeIdx.value] === '') activeIdx.value--
    if (digits.value[activeIdx.value] !== '') {
      digits.value[activeIdx.value] = ''
    }
  }
}
onMounted(() => document.addEventListener('keydown', handleKeydown))
onUnmounted(() => document.removeEventListener('keydown', handleKeydown))
</script>

<style scoped>
.digit-boxes { display:flex; gap:10px; justify-content:center; }
.digit-box { width:48px; height:56px; border-radius:8px; background:#F3F4F6; display:flex; align-items:center; justify-content:center; font-size:24px; font-weight:700; color:#4A90E2; transition:all .15s; border:2px solid transparent; cursor:pointer; }
.digit-box.filled { background:#fff; border-color:#4A90E2; }
.digit-box.active { border-color:#4A90E2; box-shadow:0 0 0 3px #E6F0FA; }
.btn { display:inline-flex; align-items:center; justify-content:center; padding:10px 24px; border-radius:8px; font-size:14px; cursor:pointer; border:none; transition:all .15s; min-height:44px; }
.btn-primary { background:#4A90E2; color:#fff; } .btn-primary:hover { background:#3A7BC8; }

/* Portrait mode */
.portrait .digit-box { width: 42px; height: 48px; font-size: 20px; }
</style>
