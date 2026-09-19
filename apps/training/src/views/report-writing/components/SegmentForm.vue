<template>
  <section class="card rwb-block">
    <div class="rwb-block-head">
      <i class="fa-solid fa-pen-to-square"></i> 学生报告
      <span class="rwb-tag">三段式 · 检查技术 / 影像所见 / 诊断意见</span>
      <span class="rwb-count" :class="{ 'text-error': totalOver }">{{ totalChars }} / {{ TOTAL_LIMIT }} 字</span>
    </div>

    <div class="rwb-segs">
      <div v-for="seg in segments" :key="seg.key" class="rwb-seg"
           :class="{ 'is-active': seg.key === activeKey, 'is-readonly': !isEditable(seg.key) }">
        <div class="rwb-seg-head">
          <span class="rwb-seg-name">{{ seg.name }}</span>
          <span v-if="seg.key === activeKey" class="badge badge-info">当前阶段</span>
          <span v-else class="rwb-seg-lock">
            <i class="fa-solid" :class="isEditable(seg.key) ? 'fa-lock-open' : 'fa-lock'"></i>
            {{ isEditable(seg.key) ? '可回看编辑' : '未解锁' }}
          </span>
          <span class="rwb-seg-count" :class="{ 'text-error': (draft[seg.key] || '').length >= seg.limit }">
            {{ (draft[seg.key] || '').length }} / {{ seg.limit }}
          </span>
        </div>
        <textarea v-if="isEditable(seg.key)" class="rwb-seg-area" :value="draft[seg.key]"
                  :maxlength="seg.limit" :rows="seg.key === 'technique' ? 2 : 6"
                  :placeholder="PLACEHOLDER[seg.key]"
                  @input="$emit('update:segment', seg.key, $event.target.value)"></textarea>
        <div v-else class="rwb-seg-readonly">
          <p v-if="(draft[seg.key] || '').trim()">{{ draft[seg.key] }}</p>
          <p v-else class="rwb-seg-empty">尚未填写</p>
          <span class="rwb-seg-locknote">按顺序推进到本段后即可编辑；已完成的段落可随时回看修改</span>
        </div>
      </div>
    </div>

    <div class="rwb-note">
      字数上限前端硬限、<b>不做静默截断</b>；粘贴内容自动剥离格式（防带入外部样式与不可见字符）。
      单例三段合计上限 {{ TOTAL_LIMIT }} 字。
    </div>
  </section>
</template>

<script setup>
const PLACEHOLDER = {
  technique: '如：胸部CT平扫。',
  findings: '按部位与范围、数目与大小、形态与边界、密度/信号/强化程度、重要阴性征象逐类描述。',
  impression: '回应临床问题，给出定位与定性倾向、诊断依据及下一步建议。'
}

const props = defineProps({
  segments: { type: Array, required: true },
  draft: { type: Object, required: true },
  activeKey: { type: String, default: '' },
  /** 已达成的阶段对应的段（这些段可编辑回看） */
  editableKeys: { type: Array, default: () => [] },
  totalChars: { type: Number, default: 0 },
  totalOver: { type: Boolean, default: false },
  TOTAL_LIMIT: { type: Number, default: 5000 }
})
defineEmits(['update:segment'])

const isEditable = key => props.editableKeys.includes(key)
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
.rwb-segs { padding: 6px 18px 10px; }
.rwb-seg { padding: 10px 0; border-bottom: 1px solid #f3f4f6; }
.rwb-seg:last-child { border-bottom: none; }
.rwb-seg-head { display: flex; align-items: center; gap: 8px; margin-bottom: 7px; }
.rwb-seg-name { font-size: 13px; font-weight: 700; color: #6b7280; }
.rwb-seg.is-active .rwb-seg-name { color: var(--primary); }
.rwb-seg-lock { font-size: 11px; color: #c0c4cc; display: flex; align-items: center; gap: 4px; }
.rwb-seg-count { margin-left: auto; font-size: 11.5px; color: #9ca3af; font-variant-numeric: tabular-nums; }
.rwb-seg-area {
  width: 100%; box-sizing: border-box; resize: vertical; outline: none;
  padding: 10px 12px; border: 1px solid #e5e7eb; border-radius: 9px;
  font-family: inherit; font-size: 13.5px; line-height: 1.9; color: #1f2937;
}
.rwb-seg.is-active .rwb-seg-area { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(37,99,235,.08); }
.rwb-seg-readonly {
  padding: 10px 12px; border: 1px dashed #e5e7eb; border-radius: 9px; background: #fafbfc;
  font-size: 13px; line-height: 1.9; color: #909399; white-space: pre-wrap;
}
.rwb-seg-readonly p { margin: 0; }
.rwb-seg-empty { color: #c0c4cc; }
.rwb-seg-locknote { display: block; margin-top: 6px; font-size: 11px; color: #c0c4cc; }
.rwb-note { font-size: 12px; color: #9ca3af; line-height: 1.6; padding: 0 18px 16px; }
</style>
