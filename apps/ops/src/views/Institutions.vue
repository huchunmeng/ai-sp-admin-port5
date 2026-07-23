<template>
  <div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
      <div><h2>机构管理</h2><p style="font-size:13px;color:var(--text-tertiary);">管理全部接入机构</p></div>
      <button class="btn btn-primary" @click="newInstitution">+ 新增机构</button>
    </div>
    <table class="data-table">
      <thead><tr><th>编号</th><th>机构名称</th><th>考核次数</th><th>平均分</th><th>状态</th><th>操作</th></tr></thead>
      <tbody>
        <tr v-for="inst in store.institutions" :key="inst.id">
          <td style="color:var(--text-tertiary);">{{ inst.code }}</td><td style="font-weight:600;">{{ inst.name }}</td>
          <td>{{ inst.exams }}</td><td>{{ inst.avgScore }}</td>
          <td><span :style="{ color: inst.status === 'active' ? 'var(--success)' : 'var(--text-tertiary)', fontWeight: 500 }">{{ inst.status === 'active' ? '● 启用' : '○ 停用' }}</span></td>
          <td>
            <a href="#" @click.prevent class="action-link">详情</a>
            <a href="#" @click.prevent class="action-link" style="margin-left:8px;">管理</a>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { useOpsStore } from '@/stores/ops'
import { toast } from '@ai-sp/shared'
const store = useOpsStore()
function newInstitution() {
  toast.show('【演示】跳转至新增机构页面', 'info')
}
</script>

<style scoped>
.data-table { width: 100%; border-collapse: collapse; font-size: 13px; background: #fff; border-radius: var(--radius); overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
.data-table th { background: #f9fafb; padding: 10px 14px; text-align: left; font-weight: 600; border-bottom: 2px solid var(--border); }
.data-table td { padding: 10px 14px; border-bottom: 1px solid var(--border); }
.data-table tr:hover td { background: #fafbfc; }
.action-link { color: var(--primary); font-size: 12px; text-decoration: none; }
.btn { display: inline-flex; align-items: center; padding: 8px 20px; border-radius: var(--radius); font-size: 13px; cursor: pointer; border: none; }
.btn-primary { background: var(--primary); color: #fff; }
</style>
