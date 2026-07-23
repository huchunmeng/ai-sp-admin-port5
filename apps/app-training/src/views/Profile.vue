<template>
  <div class="page">
    <div class="profile-header">
      <div class="avatar">{{ store.user.avatar }}</div>
      <div class="name">{{ store.user.name }}</div>
      <div class="role">{{ store.user.phase }} · {{ store.user.specialty }}</div>
    </div>
    <div class="menu-list">
      <div class="menu-item"><span>📋 训练设置</span><span class="arrow">→</span></div>
      <div class="menu-item"><span>📊 学习报告</span><span class="arrow">→</span></div>
      <div class="menu-item"><span>🔔 消息通知</span><span class="arrow">→</span></div>
      <div class="menu-item"><span>⚙️ 通用设置</span><span class="arrow">→</span></div>
      <div class="menu-item"><span>❓ 帮助与反馈</span><span class="arrow">→</span></div>
    </div>
    <div class="version">AI-SP App训练端 v2.0 · 待开发</div>
  </div>
</template>

<script setup>
import { useAppTrainingStore } from '@/stores/appTraining'
const store = useAppTrainingStore()
</script>

<style scoped>
.page { padding: 16px; }
.profile-header { text-align:center; padding:30px 0 20px; }
.avatar { width:64px; height:64px; border-radius:50%; background:var(--primary-light); display:flex; align-items:center; justify-content:center; font-size:28px; margin:0 auto 12px; }
.name { font-size:20px; font-weight:700; margin-bottom:4px; }
.role { font-size:13px; color:var(--text-secondary); }
.menu-list { margin-top: 20px; }
.menu-item { display:flex; align-items:center; justify-content:space-between; background:#fff; padding:16px; border-radius:var(--radius); margin-bottom:6px; box-shadow:0 1px 3px rgba(0,0,0,0.06); cursor:pointer; font-size:14px; }
.arrow { color:var(--text-tertiary); }
.version { text-align:center; margin-top:30px; font-size:11px; color:var(--text-tertiary); }
</style>
