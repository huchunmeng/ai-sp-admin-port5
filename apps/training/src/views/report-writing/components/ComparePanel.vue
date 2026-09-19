<template>
  <section class="card rwb-block">
    <div class="rwb-block-head">
      <i class="fa-solid fa-code-compare"></i> 对照参考报告
      <span class="rwb-cap">仅训练侧可见</span>
    </div>

    <div class="rwb-cmp">
      <div class="rwb-cmp-col">
        <div class="rwb-cmp-head"><i class="fa-solid fa-pen"></i> 你的报告</div>
        <div class="rwb-cmp-body">
          <template v-for="seg in SEGMENTS" :key="seg.key">
            <span class="rwb-cmp-seg">{{ seg.name }}</span>
            <span class="rwb-cmp-text">{{ (draft[seg.key] || '').trim() || '（未填写）' }}</span>
          </template>
        </div>
      </div>
      <div class="rwb-cmp-col is-gold">
        <div class="rwb-cmp-head"><i class="fa-solid fa-circle-check"></i> 参考报告</div>
        <div class="rwb-cmp-body">
          <template v-for="seg in GOLD_SEGMENTS" :key="seg.key">
            <span class="rwb-cmp-seg">{{ seg.name }}</span>
            <span class="rwb-cmp-text">{{ (sample.goldStandard || {})[seg.key] }}</span>
          </template>
        </div>
      </div>
    </div>

    <!-- 该病例评不了的条目，如实说明 -->
    <div v-if="sample.lost && sample.lost.length" class="rwb-na">
      <div class="rwb-na-title">以下 {{ sample.lost.length }} 条不纳入评分</div>
      <div v-for="l in sample.lost" :key="l.code" class="rwb-na-item">
        <code>{{ l.code }}</code> {{ l.label }}
      </div>
    </div>
  </section>
</template>

<script setup>
import { SEGMENTS, GOLD_SEGMENTS } from '@ai-sp/shared/imaging'

defineProps({
  draft: { type: Object, default: () => ({}) },
  sample: { type: Object, required: true }
})
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
.rwb-cap { margin-left: auto; font-size: 11px; color: #9ca3af; font-weight: 400; }
.rwb-cmp { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 16px 18px 4px; }
.rwb-cmp-col { border: 1px solid #f0f2f5; border-radius: 10px; overflow: hidden; }
.rwb-cmp-col.is-gold { border-color: #d1fae5; }
.rwb-cmp-head {
  display: flex; align-items: center; gap: 7px; font-size: 12.5px; font-weight: 700;
  padding: 9px 14px; background: #fafbfc; color: #6b7280; border-bottom: 1px solid #f3f4f6;
}
.rwb-cmp-col.is-gold .rwb-cmp-head { background: #f0fdf4; color: #047857; border-bottom-color: #d1fae5; }
.rwb-cmp-body { padding: 12px 14px; font-size: 12.5px; line-height: 1.95; color: #374151; }
.rwb-cmp-seg { display: block; font-weight: 700; color: #6b7280; margin-top: 8px; }
.rwb-cmp-seg:first-child { margin-top: 0; }
.rwb-cmp-text { display: block; white-space: pre-wrap; }
.rwb-cmp-col.is-gold .rwb-cmp-text { color: #065f46; }
.rwb-cmp-note {
  font-size: 11.5px; line-height: 1.75; color: #6b7280;
  padding: 9px 14px; background: #f8fafc; border-top: 1px solid #d1fae5;
}
.rwb-cmp-how {
  display: flex; align-items: flex-start; gap: 8px;
  margin: 12px 18px 0; padding: 10px 14px; border-radius: 9px;
  background: #fffbeb; border: 1px solid #fef3c7; font-size: 12.5px; line-height: 1.85; color: #92400e;
}
.rwb-cmp-how i { margin-top: 3px; color: #d97706; }
.rwb-na { margin: 12px 18px 0; padding: 10px 14px; border-radius: 9px; background: #f8fafc; border: 1px solid #eef0f4; }
.rwb-na-title { font-size: 12.5px; font-weight: 700; color: #4b5563; margin-bottom: 6px; }
.rwb-na-item { font-size: 11.5px; line-height: 1.9; color: #6b7280; }
.rwb-na-item code { background: #fff; padding: 1px 5px; border-radius: 4px; font-size: 11px; }
.rwb-note { font-size: 12px; color: #9ca3af; line-height: 1.6; padding: 12px 18px 16px; }
@media (max-width: 1000px) { .rwb-cmp { grid-template-columns: 1fr; } }
</style>
