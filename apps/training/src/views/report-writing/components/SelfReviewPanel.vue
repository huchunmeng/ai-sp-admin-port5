<template>
  <section class="card rwb-block">
    <div class="rwb-block-head">
      <i class="fa-solid fa-clipboard-check"></i> 逐条自评
      <span class="rwb-tag">R1 表 · 5 维度 / 23 条目</span>
      <button v-if="!submitted" class="btn btn-sm" style="margin-left:auto" @click="quickFill">整页快速自评</button>
      <span v-else class="badge badge-success" style="margin-left:auto">自评已提交</span>
    </div>

    <div v-if="!submitted" class="rwb-sr-note">
      先自评、再看参考 —— 提交报告后不是"看答案"。逐条判断你<b>写了 / 没写 / 不确定</b>，
      提交后才解锁金标准对照（不可跳过）。
    </div>

    <div class="rwb-sr">
      <div v-for="dim in R1_TABLE" :key="dim.dim" class="rwb-sr-dim">
        <div class="rwb-sr-dimhead">
          <span class="rwb-sr-dimname">{{ dim.dim }}</span>
          <span class="rwb-sr-dimfull">满分 {{ dim.full }} 分</span>
        </div>
        <div v-for="it in dim.items" :key="it.code" class="rwb-sr-item">
          <span class="rwb-sr-code">{{ it.code }}</span>
          <span class="rwb-sr-name">{{ it.name }}</span>
          <span class="rwb-sr-score">{{ it.score }} 分</span>
          <div class="rwb-sr-marks">
            <button v-for="m in MARKS" :key="m.value"
                    class="rwb-sr-mark" :class="['mk-' + m.value, { on: marks[it.code] === m.value }]"
                    :disabled="submitted" @click="$emit('mark', it.code, m.value)">{{ m.label }}</button>
          </div>
        </div>
      </div>
    </div>

    <div class="rwb-sr-foot">
      <div class="rwb-sr-total">
        <span>自评合计</span>
        <b>{{ total.raw }}</b>
        <span class="text-secondary">/ {{ total.pool }}（该病例可评分）→ 归一 <b>{{ total.normalized }}</b> 分</span>
      </div>
      <div class="rwb-sr-btns">
        <button v-if="!submitted" class="btn btn-primary" @click="$emit('submit')">
          <i class="fa-solid fa-paper-plane"></i> 提交自评并解锁对照
        </button>
        <template v-else>
          <button class="btn" @click="$emit('rewrite')">
            <i class="fa-solid fa-rotate-left"></i> 返回修改报告（配额不重置）
          </button>
          <button class="btn" @click="$emit('restart')">
            <i class="fa-solid fa-forward"></i> 重练（新回合，配额重置）
          </button>
        </template>
      </div>
    </div>

    <div class="rwb-note">
      自评合计按"写了"的条目分值合计，<b>不可评条目整体不纳入</b>、分母为该病例可评分。
      自评<b>不参与任何计算</b>，只作学情信号——它的价值是让你看到自己的认知偏差。
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { R1_TABLE } from '@ai-sp/shared/imaging'

const MARKS = [
  { value: 'wrote', label: '写了' },
  { value: 'missed', label: '没写' },
  { value: 'unsure', label: '不确定' }
]

const props = defineProps({
  marks: { type: Object, default: () => ({}) },
  submitted: { type: Boolean, default: false },
  total: { type: Object, default: () => ({ raw: 0, pool: 100, normalized: 0 }) }
})
const emit = defineEmits(['mark', 'submit', 'rewrite', 'restart'])

/** 整页快速自评：全部默认"不确定"（PRD §5.2.4 允许以求速度） */
function quickFill() {
  R1_TABLE.forEach(d => d.items.forEach(it => {
    if (!props.marks[it.code]) emit('mark', it.code, 'unsure')
  }))
}

const filledCount = computed(() => Object.keys(props.marks).length)
defineExpose({ filledCount })
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
.rwb-sr-note {
  font-size: 12.5px; line-height: 1.85; color: #b45309;
  background: #fffbeb; border-bottom: 1px solid #fef3c7; padding: 10px 18px;
}
.rwb-sr { padding: 4px 18px 8px; }
.rwb-sr-dim { padding: 10px 0 4px; border-bottom: 1px solid #f3f4f6; }
.rwb-sr-dim:last-child { border-bottom: none; }
.rwb-sr-dimhead { display: flex; align-items: baseline; gap: 10px; margin-bottom: 4px; }
.rwb-sr-dimname { font-size: 13px; font-weight: 700; color: #374151; }
.rwb-sr-dimfull { font-size: 11.5px; color: #9ca3af; }
.rwb-sr-item { display: flex; align-items: center; gap: 10px; padding: 5px 0; font-size: 12.5px; }
.rwb-sr-code { flex-shrink: 0; width: 62px; font-family: monospace; font-size: 11px; color: #6b7280; }
.rwb-sr-name { flex: 1; min-width: 0; color: #4b5563; }
.rwb-sr-score { flex-shrink: 0; width: 42px; color: #9ca3af; font-variant-numeric: tabular-nums; }
.rwb-sr-marks { display: flex; gap: 4px; flex-shrink: 0; }
.rwb-sr-mark {
  font-family: inherit; font-size: 11.5px; padding: 3px 9px; border-radius: 6px; cursor: pointer;
  border: 1px solid #e5e7eb; background: #fff; color: #6b7280; transition: all .15s;
}
.rwb-sr-mark:hover:not(:disabled) { border-color: var(--primary); color: var(--primary); }
.rwb-sr-mark:disabled { cursor: default; opacity: .75; }
.rwb-sr-mark.mk-wrote.on { background: #ecfdf5; border-color: var(--success); color: #047857; font-weight: 700; }
.rwb-sr-mark.mk-missed.on { background: #fef2f2; border-color: var(--error); color: #b91c1c; font-weight: 700; }
.rwb-sr-mark.mk-unsure.on { background: #fffbeb; border-color: var(--warning); color: #b45309; font-weight: 700; }
.rwb-sr-foot {
  display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;
  padding: 12px 18px; border-top: 1px solid #f3f4f6; background: #fafbfc;
}
.rwb-sr-total { display: flex; align-items: baseline; gap: 6px; font-size: 12.5px; color: #6b7280; }
.rwb-sr-total b { font-size: 18px; color: var(--primary); }
.rwb-sr-total .text-secondary b { font-size: 14px; }
.rwb-sr-btns { display: flex; gap: 8px; }
.rwb-note { font-size: 12px; color: #9ca3af; line-height: 1.6; padding: 10px 18px 16px; }
</style>
