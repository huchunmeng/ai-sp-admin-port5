<template>
  <div class="page" :class="{ portrait: store.portraitMode }" style="height:100%;display:flex;flex-direction:column;">
    <div style="padding:12px 16px;border-bottom:1px solid #E5E7EB;display:flex;justify-content:space-between;align-items:center;">
      <span class="font-bold">考生队列</span>
      <a href="#" style="font-size:11px;color:#4A90E2;text-decoration:none;" @click.prevent="store.setPage('confirm')">← 返回考生确认</a>
    </div>
    <div style="padding:6px 14px;border-bottom:1px solid #E5E7EB;font-size:11px;display:flex;justify-content:space-between;align-items:center;">
      <span>{{ store.examInfo.topic }} · {{ store.examInfo.station }} — {{ store.examInfo.selectedProjects[0] }}</span>
      <div style="display:flex;gap:2px;">
        <span class="queue-tab" :class="{ sel: store.queueFilter === 'all' }" @click="store.filterQueue('all')">全部</span>
        <span class="queue-tab" :class="{ sel: store.queueFilter === 'waiting' }" @click="store.filterQueue('waiting')">待考</span>
        <span class="queue-tab" :class="{ sel: store.queueFilter === 'examining' }" @click="store.filterQueue('examining')">考试中</span>
        <span class="queue-tab" :class="{ sel: store.queueFilter === 'done' }" @click="store.filterQueue('done')">已完成</span>
        <span class="queue-tab" :class="{ sel: store.queueFilter === 'abort' }" @click="store.filterQueue('abort')">中止</span>
      </div>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 14px;border-bottom:1px solid #E5E7EB;">
      <input class="input" placeholder="搜索考生姓名/手机号" style="width:200px;">
      <button class="btn btn-sm btn-outline" @click="showAdd">+ 添加考生</button>
    </div>
    <div style="flex:1;overflow-y:auto;padding:10px 14px;display:flex;flex-wrap:wrap;gap:10px;align-content:flex-start;">
      <div v-for="c in filteredQueue" :key="c.name" class="c-card" :class="{ sel: store.examInfo.candidateName === c.name }" :style="{ borderColor: c.status === 'examining' ? '#4A90E2' : '#E5E7EB' }" @click="store.pickCandidate(c)">
        <div class="c-avatar">👤</div>
        <div style="font-weight:600;font-size:13px;">{{ c.name }}</div>
        <div style="font-size:12px;color:#4B5563;margin:2px 0;">{{ c.phone }}</div>
        <div style="font-size:11px;color:#9CA3AF;">考号：无</div>
        <div style="margin-top:6px;">
          <span v-if="c.status === 'waiting'" class="badge badge-success">待考</span>
          <span v-else-if="c.status === 'examining'" class="badge" style="background:#d1fae5;color:#065f46;">考试中</span>
          <span v-else class="badge badge-info">已完成</span>
        </div>
        <div style="font-size:11px;color:#9CA3AF;margin-top:4px;" v-if="c.device !== '-'">💻 设备：{{ c.device }}</div>
      </div>
    </div>
    <div style="padding:8px 14px;border-top:1px solid #E5E7EB;display:flex;justify-content:center;align-items:center;gap:4px;font-size:12px;color:#9CA3AF;">
      <button class="btn btn-sm" disabled>上一页</button>
      <span>第 1/2 页</span>
      <button class="btn btn-sm">下一页</button>
    </div>
  </div>
</template>

<script setup>
import { computed, inject } from 'vue'
import { useExamStore } from '@/stores/exam'
const store = useExamStore()
const showAddCandidateModal = inject('showAddCandidateModal')

const filteredQueue = computed(() => {
  if (store.queueFilter === 'all') return store.candidateQueue
  return store.candidateQueue.filter(c => c.status === store.queueFilter)
})

function showAdd() { showAddCandidateModal() }
</script>

<style scoped>
.font-bold { font-weight:600; }
.input { padding:10px 14px; border-radius:8px; font-size:14px; border:none; background:#F3F4F6; outline:none; }
.c-card { width:190px; background:#fff; border:1px solid #E5E7EB; border-radius:10px; padding:12px; cursor:pointer; transition:all .15s; text-align:center; }
.c-card:hover { border-color:#4A90E2; box-shadow:0 2px 8px rgba(0,0,0,0.08); }
.c-card.sel { border-color:#4A90E2; background:#E6F0FA; }
.c-avatar { width:44px; height:44px; border-radius:50%; background:#E6F0FA; display:flex; align-items:center; justify-content:center; font-size:18px; margin:0 auto 8px; }
.queue-tab { padding:4px 10px; border-radius:4px; font-size:11px; cursor:pointer; transition:all .15s; color:#4B5563; }
.queue-tab.sel { background:#E6F0FA; color:#4A90E2; font-weight:600; }
.queue-tab:hover { background:#F3F4F6; }
.badge { display:inline-flex; align-items:center; gap:4px; padding:2px 10px; border-radius:4px; font-size:11px; font-weight:500; }
.badge-success { background:#d1fae5; color:#065f46; } .badge-info { background:#dbeafe; color:#1e40af; }
.btn { display:inline-flex; align-items:center; justify-content:center; padding:6px 14px; border-radius:8px; font-size:12px; cursor:pointer; border:1px solid #E5E7EB; background:#fff; color:#4B5563; min-height:32px; }
.btn-outline { background:#fff; color:#4A90E2; border:2px solid #4A90E2; }

/* Portrait mode */
.portrait .c-card { width: 150px; padding: 8px; }
.portrait .c-avatar { width: 36px; height: 36px; font-size: 16px; }
.portrait .queue-tab { padding: 2px 6px; font-size: 10px; }
</style>
