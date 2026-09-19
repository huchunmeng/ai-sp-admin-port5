<template>
  <section class="card rwb-block">
    <div class="rwb-block-head">
      <i class="fa-solid fa-pen-field"></i> 阅片笔记
      <span class="rwb-tag">不评分</span>
      <span class="rwb-count">{{ notes.length }} / 500</span>
      <button class="rwb-collapse" @click="open = !open">
        {{ open ? '收起' : '展开' }} <i class="fa-solid" :class="open ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
      </button>
    </div>

    <div v-show="open">
      <textarea class="rwb-notes" :value="notes" maxlength="500" rows="4"
                placeholder="边看边记：哪一层最清楚、有哪些征象、哪里不确定"
                @input="$emit('update:notes', $event.target.value)"></textarea>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue'

defineProps({
  notes: { type: String, default: '' }
})
defineEmits(['update:notes'])

/** 笔记是可选的旁栏，默认收起以免占掉正文首屏 */
const open = ref(false)
</script>

<style scoped>
.rwb-block { overflow: hidden; }
.rwb-block-head {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  font-size: 14px; font-weight: 700; color: #1f2937;
  padding: 12px 18px; background: #fafbfc; border-bottom: 1px solid #f3f4f6;
}
.rwb-block-head i { color: var(--primary); }
.rwb-tag { font-size: 11px; font-weight: 500; color: #6b7280; background: #f3f4f6; padding: 3px 10px; border-radius: 8px; }
.rwb-count { margin-left: auto; font-size: 12px; color: #9ca3af; font-variant-numeric: tabular-nums; }
.rwb-collapse {
  font-family: inherit; font-size: 12px; color: var(--primary); background: none; border: none;
  cursor: pointer; display: inline-flex; align-items: center; gap: 4px; padding: 2px 4px;
}
.rwb-collapse:hover { text-decoration: underline; }
.rwb-purpose {
  font-size: 11.5px; line-height: 1.85; color: #6b7280;
  padding: 9px 18px; background: #f8fafc; border-bottom: 1px solid #f3f4f6;
}
.rwb-notes {
  width: 100%; box-sizing: border-box; resize: vertical; outline: none; border: none;
  padding: 12px 18px 14px; font-family: inherit; font-size: 13.5px; line-height: 1.9; color: #1f2937;
}
</style>
