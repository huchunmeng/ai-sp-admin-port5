<template>
  <div>
    <h2 style="margin-bottom:4px;">数据总览</h2>
    <p style="font-size:13px;color:var(--text-tertiary);margin-bottom:20px;">全平台运营数据概览</p>

    <div class="stat-grid">
      <div class="stat-card"><div class="stat-num" style="color:var(--primary);">{{ store.stats.institutionCount }}</div><div class="stat-label">接入机构</div></div>
      <div class="stat-card"><div class="stat-num" style="color:var(--success);">{{ store.stats.totalExams }}</div><div class="stat-label">总考核场次</div></div>
      <div class="stat-card"><div class="stat-num" style="color:var(--warning);">{{ store.stats.activeUsers }}</div><div class="stat-label">活跃用户</div></div>
      <div class="stat-card"><div class="stat-num" style="color:var(--primary);">{{ store.stats.monthlyGrowth }}</div><div class="stat-label">月增长率</div></div>
    </div>

    <h3 style="margin:24px 0 12px;">最近考核活动</h3>
    <table class="data-table">
      <thead><tr><th>考核名称</th><th>机构</th><th>考生数</th><th>日期</th><th>状态</th></tr></thead>
      <tbody>
        <tr v-for="e in store.recentExams" :key="e.id">
          <td style="font-weight:600;">{{ e.name }}</td><td>{{ e.institution }}</td><td>{{ e.candidates }}</td><td>{{ e.date }}</td>
          <td><span class="status-tag" :class="statusClass(e.status)">{{ e.status }}</span></td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { useOpsStore } from '@/stores/ops'
const store = useOpsStore()
function statusClass(s) {
  if (s === '进行中') return 'status-active'
  if (s === '已结束') return 'status-done'
  return 'status-archived'
}
</script>

<style scoped>
.stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.stat-card { background: #fff; border-radius: var(--radius); padding: 24px 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); text-align: center; }
.stat-num { font-size: 32px; font-weight: 700; }
.stat-label { font-size: 12px; color: var(--text-tertiary); margin-top: 6px; }
.data-table { width: 100%; border-collapse: collapse; font-size: 13px; background: #fff; border-radius: var(--radius); overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
.data-table th { background: #f9fafb; padding: 10px 14px; text-align: left; font-weight: 600; border-bottom: 2px solid var(--border); }
.data-table td { padding: 10px 14px; border-bottom: 1px solid var(--border); }
.data-table tr:hover td { background: #fafbfc; }
.status-tag { font-size: 11px; padding: 3px 10px; border-radius: 4px; font-weight: 500; }
.status-active { background: #dbeafe; color: #1e40af; }
.status-done { background: #d1fae5; color: #065f46; }
.status-archived { background: #f3f4f6; color: #6b7280; }
</style>
