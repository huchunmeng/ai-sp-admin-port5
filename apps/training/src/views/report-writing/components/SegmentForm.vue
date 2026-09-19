<template>
  <section class="card rwb-block">
    <div class="rwb-block-head">
      <i class="fa-solid fa-pen-to-square"></i> 学生报告
      <span class="rwb-tag">三段式 · 检查技术 / 影像所见 / 诊断意见</span>
      <span class="rwb-count" :class="{ 'text-error': totalOver }">{{ totalChars }} / {{ TOTAL_LIMIT }} 字</span>
    </div>

    <div class="rwb-segs">
      <div v-for="seg in segments" :key="seg.key" class="rwb-seg">
        <div class="rwb-seg-head">
          <span class="rwb-seg-name">{{ seg.name }}</span>
          <span v-if="seg.filled" class="rwb-seg-ok"><i class="fa-solid fa-check"></i> 已写</span>
          <span v-else class="rwb-seg-todo">未写</span>
          <span class="rwb-seg-count" :class="{ 'text-error': (draft[seg.key] || '').length >= seg.limit }">
            {{ (draft[seg.key] || '').length }} / {{ seg.limit }}
          </span>
        </div>
        <textarea class="rwb-seg-area" :value="draft[seg.key]" :maxlength="seg.limit"
                  :rows="seg.key === 'technique' ? 2 : 6"
                  :placeholder="PLACEHOLDER[seg.key]"
                  @input="$emit('update:segment', seg.key, $event.target.value)"></textarea>
      </div>
    </div>

    <div class="rwb-note">
      三段<b>同时可写</b>，不必按顺序逐段推进；字数上限前端硬限、<b>不做静默截断</b>；
      粘贴内容自动剥离格式（防带入外部样式与不可见字符）。单例三段合计上限 {{ TOTAL_LIMIT }} 字。
    </div>
  </section>
</template>

<script setup>
const PLACEHOLDER = {
  technique: '如：胸部CT平扫。',
  findings: '按部位与范围、数目与大小、形态与边界、密度/信号/强化程度、重要阴性征象逐类描述。',
  impression: '回应临床问题，给出定位与定性倾向、诊断依据及下一步建议。'
}

defineProps({
  segments: { type: Array, required: true },
  draft: { type: Object, required: true },
  totalChars: { type: Number, default: 0 },
  totalOver: { type: Boolean, default: false },
  TOTAL_LIMIT: { type: Number, default: 5000 }
})
defineEmits(['update:segment'])
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
.rwb-segs { padding: 6px 18px 10px; display: grid; grid-template-columns: 1fr; gap: 4px; }
.rwb-seg { padding: 10px 0; border-bottom: 1px solid #f3f4f6; }
.rwb-seg:last-child { border-bottom: none; }
.rwb-seg-head { display: flex; align-items: center; gap: 8px; margin-bottom: 7px; }
.rwb-seg-name { font-size: 13px; font-weight: 700; color: #4b5563; }
.rwb-seg-ok { font-size: 11px; color: var(--success); display: inline-flex; align-items: center; gap: 3px; }
.rwb-seg-todo { font-size: 11px; color: #c0c4cc; }
.rwb-seg-count { margin-left: auto; font-size: 11.5px; color: #9ca3af; font-variant-numeric: tabular-nums; }
.rwb-seg-area {
  width: 100%; box-sizing: border-box; resize: vertical; outline: none;
  padding: 10px 12px; border: 1px solid #e5e7eb; border-radius: 9px;
  font-family: inherit; font-size: 13.5px; line-height: 1.9; color: #1f2937;
}
.rwb-seg-area:hover { border-color: #cbd5e1; }
.rwb-seg-area:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(37,99,235,.08); }
.rwb-note { font-size: 12px; color: #9ca3af; line-height: 1.6; padding: 0 18px 16px; }
</style>
