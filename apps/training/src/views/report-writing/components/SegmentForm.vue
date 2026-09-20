<template>
  <section class="card rwb-block">
    <div class="rwb-block-head">
      <i class="fa-solid fa-pen-to-square"></i> 学生报告
      <span class="rwb-tag">临床情境引导 + 三阶段</span>
      <span class="rwb-count" :class="{ 'text-error': totalOver }">{{ totalChars }} / {{ totalLimit }}</span>
    </div>

    <div v-if="given" class="rwb-given">
      <div class="rwb-given-head"><i class="fa-solid fa-circle-info"></i> {{ given.name }}<span class="rwb-given-tag">系统给出</span></div>

      <!-- 一般项目：两列标签值，像申请单抬头 -->
      <div class="rwb-given-grid">
        <div v-for="it in given.items" :key="it.k" class="rwb-given-cell">
          <span class="rwb-given-k">{{ it.k }}</span><span class="rwb-given-v">{{ it.v }}</span>
        </div>
      </div>

      <div v-if="given.study && given.study.length" class="rwb-given-grid">
        <div v-for="it in given.study" :key="it.k" class="rwb-given-cell">
          <span class="rwb-given-k">{{ it.k }}</span><span class="rwb-given-v">{{ it.v }}</span>
        </div>
      </div>

      <!-- 病史 / 检查目的：成段，各带小标题 -->
      <div v-for="f in given.fields" :key="f.k" class="rwb-given-block">
        <span class="rwb-given-k">{{ f.k }}</span>
        <p class="rwb-given-p">{{ f.v }}</p>
      </div>
    </div>
    <div class="rwb-segs">
      <div v-for="seg in segments" :key="seg.key" class="rwb-seg">
        <div class="rwb-seg-head">
          <span class="rwb-seg-name">{{ seg.name }}</span>
          <span v-if="seg.hint" class="rwb-seg-hint">{{ seg.hint }}</span>
          <span v-if="seg.filled" class="rwb-seg-ok"><i class="fa-solid fa-check"></i></span>
          <span class="rwb-seg-count" :class="{ 'text-error': (draft[seg.key] || '').length >= seg.limit }">
            {{ (draft[seg.key] || '').length }} / {{ seg.limit }}
          </span>
        </div>
        <textarea class="rwb-seg-area" :value="draft[seg.key]" :maxlength="seg.limit"
                  :rows="seg.key === 'purpose' ? 3 : 6"
                  :placeholder="PLACEHOLDER[seg.key]"
                  @input="$emit('update:segment', seg.key, $event.target.value)"></textarea>
      </div>
    </div>
  </section>
</template>

<script setup>
const PLACEHOLDER = {
  purpose: '如：胸部CT平扫。为明确右肺上叶结节性质，请评估有无纵隔淋巴结肿大及胸腔积液。',
  findings: '部位与范围、数目与大小、形态与边界、密度/信号/强化程度、重要阴性征象',
  impression: '回应临床问题、定位与定性倾向、依据与建议'
}

defineProps({
  segments: { type: Array, required: true },
  draft: { type: Object, required: true },
  totalChars: { type: Number, default: 0 },
  totalOver: { type: Boolean, default: false },
  // 注意：属性名必须能被 `total-limit` 归一化到，写成 TOTAL_LIMIT 会导致绑定失效、永远用默认值
  totalLimit: { type: Number, default: 6500 },
  /** 第一段「患者临床信息」由系统给出，只展示不给输入框 */
  given: { type: Object, default: null }
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
/* 第一段：患者临床信息由系统给出（临床情境引导），只展示不给输入框 */
.rwb-given { margin: 8px 18px 0; padding: 12px 14px; border-radius: 9px; background: #F0F7FF; border: 1px solid #DBEAFE; }
.rwb-given-head { display: flex; align-items: center; gap: 7px; font-size: 13px; font-weight: 700; color: #1f2937; }
.rwb-given-head i { color: var(--primary); }
.rwb-given-tag { margin-left: auto; font-size: 11px; font-weight: 400; color: #6b7280; background: #fff; padding: 2px 8px; border-radius: 8px; }
.rwb-given-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 5px 18px; margin-top: 9px; }
.rwb-given-cell { display: flex; gap: 8px; font-size: 12.5px; line-height: 1.7; min-width: 0; }
.rwb-given-k { flex-shrink: 0; color: #6b7280; }
.rwb-given-v { color: #111827; font-weight: 600; }
.rwb-given-block { margin-top: 9px; padding-top: 9px; border-top: 1px dashed #DBEAFE; }
.rwb-given-p { margin: 4px 0 0; font-size: 12.5px; line-height: 1.9; color: #1f2937; }
.rwb-seg-name { font-size: 13px; font-weight: 700; color: #4b5563; }
.rwb-seg-hint { font-size: 11.5px; color: #9ca3af; }
.rwb-seg-ok { font-size: 11px; color: var(--success); display: inline-flex; align-items: center; gap: 3px; }
.rwb-seg-todo { font-size: 11px; color: #c0c4cc; }
.rwb-seg-count { margin-left: auto; font-size: 11.5px; color: #9ca3af; font-variant-numeric: tabular-nums; }
.rwb-seg-tip { font-size: 11.5px; color: #9ca3af; line-height: 1.75; margin-top: 6px; }
.rwb-seg-area {
  width: 100%; box-sizing: border-box; resize: vertical; outline: none;
  padding: 10px 12px; border: 1px solid #e5e7eb; border-radius: 9px;
  font-family: inherit; font-size: 13.5px; line-height: 1.9; color: #1f2937;
}
.rwb-seg-area:hover { border-color: #cbd5e1; }
.rwb-seg-area:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(37,99,235,.08); }
.rwb-note { font-size: 12px; color: #9ca3af; line-height: 1.6; padding: 0 18px 16px; }
</style>
