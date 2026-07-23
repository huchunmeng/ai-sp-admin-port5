<template>
  <div class="page" :class="{ portrait: store.portraitMode }" style="flex:1;display:flex;align-items:center;justify-content:center;padding:40px;">
    <div style="width:360px;text-align:center;">
      <div style="font-size:32px;margin-bottom:8px;">🏥</div>
      <div style="font-size:18px;font-weight:700;color:var(--text-primary);margin-bottom:4px;">AI标准化病人考试系统</div>
      <div style="font-size:12px;color:var(--text-tertiary);margin-bottom:32px;">Medical Examination Terminal</div>
      <div style="text-align:left;margin-bottom:16px;">
        <label class="input-label">用户名</label>
        <input class="input" type="text" placeholder="手机号/账号" v-model="username" style="margin-bottom:12px;">
        <label class="input-label">密码</label>
        <input class="input" type="password" placeholder="请输入密码" v-model="password">
      </div>
      <button class="btn btn-primary btn-block" @click="doLogin">登 录</button>
      <div style="margin-top:12px;font-size:11px;color:var(--text-tertiary);">使用考务管理员账号登录</div>
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
  if (username.value && password.value) store.setPage('password')
}
</script>

<style scoped>
.page { font-family: var(--font); }
.input { padding:10px 14px; border-radius:8px; font-size:14px; border:none; background:#F3F4F6; outline:none; transition:all .15s; width:100%; }
.input:focus { background:#fff; box-shadow:0 0 0 2px #E6F0FA; }
.input-label { font-size:13px; color:#4B5563; margin-bottom:4px; display:block; }
.btn { display:inline-flex; align-items:center; justify-content:center; gap:6px; padding:10px 24px; border-radius:8px; font-size:14px; cursor:pointer; border:none; transition:all .15s; min-height:44px; }
.btn-primary { background:#4A90E2; color:#fff; } .btn-primary:hover { background:#3A7BC8; }
.btn-block { width:100%; }

/* Portrait mode */
.portrait .input { padding: 8px 12px; font-size: 13px; }
</style>
