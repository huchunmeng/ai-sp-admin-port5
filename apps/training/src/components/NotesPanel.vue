<template>
  <div class="notes-panel">
    <div class="notes-display" v-if="!markedMessages || markedMessages.length === 0">{{ notes || emptyHint }}</div>
    <div class="marked-items" v-if="markedMessages && markedMessages.length > 0">
      <div class="marked-title">{{ lang === 'zh' ? '📌 已标记信息' : '📌 Marked Info' }}</div>
      <div class="marked-item" v-for="(m, idx) in markedMessages" :key="m.time ? m.time + '_' + idx : idx">
        <span class="marked-text">{{ truncateText(m.content, 50) }}</span>
        <span class="unmark" @click="$emit('unmark', idx)"><i class="fa-solid fa-xmark"></i></span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { truncateText } from '@/composables/useUtils'

defineProps({
  notes: { type: String, default: '' },
  markedMessages: { type: Array, default: () => [] },
  lang: { type: String, default: 'zh' },
  emptyHint: { type: String, default: '' },
})

defineEmits(['unmark'])
</script>

<style scoped>
.notes-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.notes-display {
  width: 100%;
  min-height: 100px;
  border: 1px solid #DCDFE6;
  border-radius: 8px;
  padding: 10px;
  font-size: 13px;
  line-height: 1.6;
  color: #303133;
  background: #fafafa;
  white-space: pre-wrap;
  word-break: break-word;
  box-sizing: border-box;
}
.marked-items { margin-top: 8px; max-height: calc(100vh - 280px); overflow-y: auto; }
.marked-title { font-size: 13px; font-weight: 600; color: #409EFF; margin-bottom: 8px; }
.marked-item { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; padding: 8px 10px; font-size: 13px; background: #f5f7fa; border-radius: 8px; margin-bottom: 6px; line-height: 1.5; }
.marked-text { flex: 1; color: #303133; word-break: break-word; }
.unmark { cursor: pointer; color: #C0C4CC; font-size: 12px; flex-shrink: 0; padding: 2px; transition: color .15s; }
.unmark:hover { color: #F56C6C; }
</style>
