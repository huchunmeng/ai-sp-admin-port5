<template>
  <section class="card rwb-block">
    <div class="rwb-block-head">
      <i class="fa-solid fa-code-compare"></i> 报告对照
      <span class="rwb-tag">你的报告 ↔ 参考报告（金标准）</span>
    </div>

    <!-- 门禁：自评未提交不渲染对照（PRD §5.8；服务端实现时应为 409 SELF_REVIEW_REQUIRED） -->
    <div v-if="!unlocked" class="rwb-gate">
      <i class="fa-solid fa-lock"></i>
      <div class="rwb-gate-title">提交自评后才能查看对照</div>
      <div class="rwb-gate-desc">
        先把自评写完再看参考 —— 这是训练侧的收口动作，<b>不可跳过</b>。
      </div>
    </div>

    <template v-else>
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
          <div class="rwb-cmp-head"><i class="fa-solid fa-circle-check"></i> 参考报告（金标准）</div>
          <div class="rwb-cmp-body">
            <template v-for="seg in SEGMENTS" :key="seg.key">
              <span class="rwb-cmp-seg">{{ seg.name }}</span>
              <span class="rwb-cmp-text">{{ (sample.goldStandard || {})[seg.key] }}</span>
            </template>
          </div>
        </div>
      </div>

      <!-- 自我认知偏差 -->
      <div class="rwb-dev">
        <div class="rwb-dev-item">
          <span>你的自评总分</span><b>{{ selfTotal.normalized }}</b>
        </div>
        <div class="rwb-dev-item">
          <span>系统参考分<i class="rwb-dev-tag">估算</i></span><b class="text-primary">{{ systemTotal }}</b>
        </div>
        <div class="rwb-dev-item">
          <span>偏差</span>
          <b :class="deviation < 0 ? 'text-warning' : 'text-success'">{{ deviation > 0 ? '+' : '' }}{{ deviation }}</b>
          <span class="rwb-dev-hint">{{ deviation < 0 ? '你低估了自己' : deviation > 0 ? '你高估了自己' : '自我认知准确' }}（估算口径，仅供自检）</span>
        </div>
      </div>

      <!-- 该样本评不了的条目，如实说明（PRD §5.2.2 不按 0 分计） -->
      <div v-if="sample.lost && sample.lost.length" class="rwb-na">
        <div class="rwb-na-title">本病例有 {{ sample.lost.length }} 条落在能力边界之外，其分值<b>不扣你的分</b></div>
        <div v-for="l in sample.lost" :key="l.code" class="rwb-na-item">
          <code>{{ l.code }}</code> {{ l.label }}（{{ l.score }} 分）—— {{ l.why }}
        </div>
      </div>

      <div class="rwb-note">
        系统参考分是<b>按能力位现算</b>的示意值，本期无评分引擎；考核侧的真实评分需服务端以金标准为依据产出。
      </div>
    </template>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { SEGMENTS } from '@ai-sp/shared/imaging'

const props = defineProps({
  unlocked: { type: Boolean, default: false },
  draft: { type: Object, default: () => ({}) },
  sample: { type: Object, required: true },
  selfTotal: { type: Object, default: () => ({ raw: 0, pool: 100, normalized: 0 }) },
  /** 要素覆盖率（0–100），由父组件用同一套判读传入，避免两处口径不一致 */
  systemCoverage: { type: Number, default: 60 }
})

/**
 * 系统参考分——**本期无评分引擎**，按"要素覆盖率 × 该样本可评分"给一个示意值，
 * 用途仅是让自评偏差有可比对象。真实评分由服务端以金标准 + R1 表产出（PRD §5.9）。
 */
const systemTotal = computed(() => {
  const pool = props.sample.scoreableMax || 100
  return Math.round(pool * props.systemCoverage / 100)
})

const deviation = computed(() => props.selfTotal.normalized - systemTotal.value)
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
.rwb-gate {
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  padding: 40px 24px; text-align: center;
}
.rwb-gate i { font-size: 30px; color: #d1d5db; }
.rwb-gate-title { font-size: 14px; font-weight: 700; color: #6b7280; }
.rwb-gate-desc { font-size: 12.5px; color: #9ca3af; line-height: 1.8; }
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
.rwb-dev {
  display: flex; gap: 26px; flex-wrap: wrap; align-items: baseline;
  padding: 12px 18px; margin: 12px 18px 0; border-radius: 9px; background: #f8fafc;
}
.rwb-dev-item { display: flex; align-items: baseline; gap: 7px; font-size: 12.5px; color: #6b7280; }
.rwb-dev-item b { font-size: 17px; }
.rwb-dev-tag {
  font-style: normal; font-size: 10px; margin-left: 5px; padding: 1px 5px; border-radius: 4px;
  background: #e5e7eb; color: #6b7280; vertical-align: 1px;
}
.rwb-dev-hint { font-size: 11px; color: #9ca3af; }
.rwb-na { margin: 12px 18px 0; padding: 10px 14px; border-radius: 9px; background: #fffbeb; border: 1px solid #fef3c7; }
.rwb-na-title { font-size: 12.5px; font-weight: 700; color: #b45309; margin-bottom: 6px; }
.rwb-na-item { font-size: 11.5px; line-height: 1.9; color: #92400e; }
.rwb-na-item code { background: #fff; padding: 1px 5px; border-radius: 4px; font-size: 11px; }
.rwb-note { font-size: 12px; color: #9ca3af; line-height: 1.6; padding: 12px 18px 16px; }
@media (max-width: 1000px) { .rwb-cmp { grid-template-columns: 1fr; } }
</style>
