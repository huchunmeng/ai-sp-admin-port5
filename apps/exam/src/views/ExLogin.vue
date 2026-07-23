<template>
  <div class="page" :class="{ portrait: store.portraitMode }" style="height:100%;display:flex;flex-direction:column;">
    <div style="padding:12px 16px;border-bottom:1px solid #E5E7EB;display:flex;justify-content:space-between;">
      <span class="font-bold">考官登录</span>
      <a href="#" style="font-size:11px;color:#4A90E2;text-decoration:none;" @click.prevent="store.setPage('device-select')">← 返回设备选择</a>
    </div>
    <div style="flex:1;display:flex;align-items:center;justify-content:center;padding:40px;">
      <div class="card" style="text-align:center;">
        <div style="font-size:13px;color:#4B5563;margin-bottom:4px;">{{ store.examName }} · 口令 {{ store.examPassword }}</div>
        <div style="font-size:14px;color:#4B5563;margin-bottom:2px;">{{ store.examInfo.topic }} · {{ store.examInfo.station }} — {{ store.examInfo.selectedProjects[0] }}</div>
        <div style="font-size:16px;font-weight:600;margin-bottom:16px;">考官登录</div>
        <div style="text-align:left;margin-bottom:14px;">
          <div style="font-size:12px;color:#4B5563;margin-bottom:3px;">考官用户名</div>
          <input class="input" v-model="username" placeholder="考官用户名" style="margin-bottom:10px;">
          <div style="font-size:12px;color:#4B5563;margin-bottom:3px;">密码</div>
          <input class="input" type="password" v-model="password" placeholder="请输入密码">
        </div>
        <button class="btn btn-primary btn-block" @click="doLogin">登 录</button>
        <div style="margin-top:10px;font-size:10px;color:#9CA3AF;">登录后请选择考生进行评分</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useExamStore } from '@/stores/exam'
const store = useExamStore()
const username = ref('')
const password = ref('')
function doLogin() {
  if (username.value && password.value) store.setPage('ex-select')
}
</script>

<style scoped>
.font-bold { font-weight:600; }
.card { background:#fff; border-radius:12px; box-shadow:0 2px 8px rgba(0,0,0,0.05); padding:20px; width:380px; }
.input { padding:10px 14px; border-radius:8px; font-size:14px; border:none; background:#F3F4F6; outline:none; width:100%; }
.btn { display:inline-flex; align-items:center; justify-content:center; padding:10px 24px; border-radius:8px; font-size:14px; cursor:pointer; border:none; min-height:44px; }
.btn-primary { background:#4A90E2; color:#fff; } .btn-primary:hover { background:#3A7BC8; }
.btn-block { width:100%; }

/* Portrait mode */
.portrait .card { width: 300px; padding: 16px; }
</style>
