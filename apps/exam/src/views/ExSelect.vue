<template>
  <div class="page" :class="{ portrait: store.portraitMode }" style="height:100%;display:flex;flex-direction:column;">
    <div style="padding:12px 16px;border-bottom:1px solid #E5E7EB;display:flex;justify-content:space-between;">
      <span class="font-bold">评分记录</span>
      <a href="#" style="font-size:11px;color:#4A90E2;text-decoration:none;" @click.prevent="store.setPage('ex-login')">← 返回上一页</a>
    </div>
    <div style="padding:6px 14px;border-bottom:1px solid #E5E7EB;font-size:11px;display:flex;justify-content:space-between;">
      <span>考官：王考官 ｜ {{ store.examInfo.topic }} · {{ store.examInfo.station }}</span>
      <span style="color:#52C41A;">已登录</span>
    </div>
    <div style="padding:8px 14px;border-bottom:1px solid #E5E7EB;display:flex;gap:8px;align-items:center;">
      <input class="input" placeholder="搜索姓名/手机号" style="width:300px;">
      <select class="input" style="width:110px;"><option>全部状态</option><option>考试中</option><option>未评分</option><option>已评分</option></select>
      <button class="btn btn-sm">搜索</button>
      <button class="btn btn-sm">重置</button>
      <button class="btn btn-sm" style="margin-left:auto;background:#E6F0FA;color:#4A90E2;border:1px solid #4A90E2;" @click="store.setPage('ex-pending')">待考考生（20人）</button>
    </div>
    <div style="flex:1;overflow-y:auto;">
      <table class="score-table">
        <thead><tr><th>序号</th><th>考生</th><th>手机号</th><th>考生答题</th><th>考官评分</th><th>得分</th><th>评分时间</th><th>操作</th></tr></thead>
        <tbody>
          <tr v-for="r in store.scoringRecords" :key="r.id">
            <td>{{ r.id }}</td>
            <td>
              <span v-if="r.scoredByMe" class="scored-dot" title="已评分">●</span>
              <span v-else class="unscored-dot" title="未评分">○</span>
              {{ r.name }}
            </td>
            <td>{{ r.phone }}</td>
            <td>
              <span v-if="r.examStatus === 'examining'" class="badge" style="background:#d1fae5;color:#065f46;">考试中</span>
              <span v-else class="badge badge-info">已完成</span>
            </td>
            <td>
              <span v-if="r.scoreStatus === 'unscored' || r.scoredCount === 0" class="badge badge-zero">{{ r.scoredCount }}/{{ r.minHumanExaminers }}</span>
              <span v-else-if="r.scoreStatus === 'scored' && r.scoredCount < r.minHumanExaminers" class="badge badge-partial">{{ r.scoredCount }}/{{ r.minHumanExaminers }}</span>
              <span v-else-if="r.scoreStatus === 'scored' && r.scoredCount >= r.minHumanExaminers" class="badge badge-done">{{ r.scoredCount }}/{{ r.minHumanExaminers }}</span>
              <span v-else style="font-size:11px;color:#9CA3AF;">-</span>
            </td>
            <td>{{ r.result }}</td><td>{{ r.time }}</td>
            <td>
              <a v-if="r.examStatus === 'examining'" href="#" style="color:#4A90E2;font-size:11px;" @click.prevent="store.selectScoringCandidate(r)">评分</a>
              <a v-else-if="!r.scoredByMe" href="#" style="color:#4A90E2;font-size:11px;" @click.prevent="store.selectScoringCandidate(r)">补充评分</a>
              <a v-else href="#" style="color:#4A90E2;font-size:11px;" @click.prevent="store.selectScoringCandidate(r, true)">查看</a>
            </td>
          </tr>
        </tbody>
      </table>
      <div style="padding:10px 16px;font-size:11px;color:#9CA3AF;display:flex;justify-content:space-between;"><span>共 {{ store.scoringRecords.length }} 条记录</span><span>第 1/1 页</span></div>
    </div>
  </div>
</template>

<script setup>
import { useExamStore } from '@/stores/exam'
const store = useExamStore()
</script>

<style scoped>
.font-bold { font-weight:600; }
.input { padding:10px 14px; border-radius:8px; font-size:14px; border:none; background:#F3F4F6; outline:none; }
.score-table { width:100%; border-collapse:collapse; font-size:13px; }
.score-table th { background:#f9fafb; padding:8px 10px; text-align:left; font-weight:600; border-bottom:2px solid #E5E7EB; white-space:nowrap; }
.score-table td { padding:8px 10px; border-bottom:1px solid #E5E7EB; }
.score-table tr:hover td { background:#fafbfc; }
.badge { display:inline-flex; align-items:center; gap:4px; padding:2px 10px; border-radius:4px; font-size:11px; font-weight:500; }
.badge-info { background:#dbeafe; color:#1e40af; } .badge-error { background:#fee2e2; color:#991b1b; }
.badge-zero { background:#f3f4f6; color:#9ca3af; }
.badge-partial { background:#fef3c7; color:#92400e; }
.badge-done { background:#d1fae5; color:#065f46; }
.scored-dot { color:#52C41A; margin-right:2px; font-size:10px; } .unscored-dot { color:#d9d9d9; margin-right:2px; font-size:10px; }
.btn { display:inline-flex; align-items:center; justify-content:center; padding:6px 14px; border-radius:8px; font-size:12px; cursor:pointer; border:1px solid #E5E7EB; background:#fff; color:#4B5563; min-height:32px; }

/* Portrait mode */
.portrait .score-table { font-size: 11px; }
.portrait .score-table th { padding: 4px 4px; white-space: normal; }
.portrait .score-table td { padding: 4px 4px; }
</style>
