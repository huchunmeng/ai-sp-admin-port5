<template>
  <div class="page" :class="{ portrait: store.portraitMode }" style="height:100%;display:flex;flex-direction:column;">
    <div style="padding:12px 16px;border-bottom:1px solid #E5E7EB;display:flex;justify-content:space-between;">
      <span class="font-bold">待考考生</span>
      <a href="#" style="font-size:11px;color:#4A90E2;text-decoration:none;" @click.prevent="store.setPage('ex-select')">← 返回上一页</a>
    </div>
    <div style="padding:6px 14px;border-bottom:1px solid #E5E7EB;font-size:11px;display:flex;justify-content:space-between;">
      <span>考官：王考官 ｜ {{ store.examInfo.topic }} · {{ store.examInfo.station }}</span>
      <span style="color:#52C41A;">已登录</span>
    </div>
    <div style="padding:8px 14px;border-bottom:1px solid #E5E7EB;display:flex;gap:8px;align-items:center;">
      <input class="input" placeholder="搜索姓名/手机号" style="width:300px;">
      <select class="input" style="width:110px;"><option>全部</option><option>待考</option><option>已完成</option></select>
      <button class="btn btn-sm" style="background:#4A90E2;color:#fff;">搜索</button>
      <button class="btn btn-sm">重置</button>
      <span style="margin-left:auto;font-size:11px;color:#9CA3AF;">共 {{ pendingCount }} 人待考</span>
    </div>
    <div style="flex:1;overflow-y:auto;">
      <table class="score-table">
        <thead><tr><th>序号</th><th>考生</th><th>手机号</th><th>状态</th></tr></thead>
        <tbody>
          <tr v-for="c in store.pendingCandidates" :key="c.id">
            <td>{{ c.id }}</td><td>{{ c.name }}</td><td>{{ c.phone }}</td>
            <td>
              <span v-if="c.status === 'pending'" class="badge badge-warning">待考</span>
              <span v-else class="badge badge-info">已完成</span>
            </td>
          </tr>
        </tbody>
      </table>
      <div style="padding:10px 16px;font-size:11px;color:#9CA3AF;display:flex;justify-content:space-between;"><span>共 {{ store.pendingCandidates.length }} 条记录</span><span>第 1/1 页</span></div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useExamStore } from '@/stores/exam'
const store = useExamStore()
const pendingCount = computed(() => store.pendingCandidates.filter(c => c.status === 'pending').length)
</script>

<style scoped>
.font-bold { font-weight:600; }
.input { padding:10px 14px; border-radius:8px; font-size:14px; border:none; background:#F3F4F6; outline:none; }
.score-table { width:100%; border-collapse:collapse; font-size:13px; }
.score-table th { background:#f9fafb; padding:8px 10px; text-align:left; font-weight:600; border-bottom:2px solid #E5E7EB; }
.score-table td { padding:8px 10px; border-bottom:1px solid #E5E7EB; }
.score-table tr:hover td { background:#fafbfc; }
.badge { display:inline-flex; align-items:center; gap:4px; padding:2px 10px; border-radius:4px; font-size:11px; font-weight:500; }
.badge-warning { background:#fef3c7; color:#92400e; } .badge-info { background:#dbeafe; color:#1e40af; }
.btn { display:inline-flex; align-items:center; justify-content:center; padding:6px 14px; border-radius:8px; font-size:12px; cursor:pointer; border:1px solid #E5E7EB; background:#fff; color:#4B5563; min-height:32px; }

/* Portrait mode */
.portrait .score-table { font-size: 11px; }
.portrait .score-table th { padding: 4px 6px; }
.portrait .score-table td { padding: 4px 6px; }
</style>
