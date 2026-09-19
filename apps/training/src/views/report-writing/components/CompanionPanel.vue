<template>
  <aside class="rwb-aside">
    <div class="card rwb-side">
      <div class="rwb-side-head">
        <i class="fa-solid fa-wand-magic-sparkles"></i> AI伴学
        <span class="rwb-side-sub">已用 {{ usedHintCount }} 次</span>
      </div>

      <div class="rwb-side-purpose">
        大模型读了<b>本题的参考报告（真实判读结果）</b>，再结合你已写的内容，给出<b>少量</b>提示——
        只帮你想起该写什么，<b>不会把答案说出来</b>。
      </div>

      <!-- 提示按"段"发放：先选要问哪一段 -->
      <div class="rwb-seg-tabs">
        <button v-for="s in segments" :key="s.key" class="rwb-seg-tab"
                :class="{ active: s.key === activeSegment }" @click="$emit('update:activeSegment', s.key)">
          {{ s.name }}
        </button>
      </div>
      <div class="rwb-seg-hint">提示按「段 × 回合」发放：换段不重置、新回合才重置</div>

      <div class="rwb-tips">
        <div v-for="(h, i) in segHints" :key="i" class="rwb-tip" :class="{ 'is-degraded': h.degraded }">
          <span class="rwb-tip-lv" :class="'lv-' + h.level">{{ h.level }}</span>
          <div class="rwb-tip-body">
            <div class="rwb-tip-title">
              <span>{{ LEVEL_NAME[h.level] }}</span>
              <span class="rwb-tip-time">{{ h.time }}</span>
              <span v-if="h.degraded" class="rwb-tip-degraded">降级</span>
            </div>
            <div class="rwb-tip-text">{{ h.text }}</div>
          </div>
        </div>
        <div v-if="loading" class="rwb-tips-loading">
          <i class="fa-solid fa-spinner fa-spin"></i> AI伴学正在读你的报告…
        </div>
        <div v-else-if="!segHints.length" class="rwb-tips-empty">
          这一段还没有请求过提示。先自己写，卡住了再要。
        </div>
      </div>

      <div class="rwb-hint-btns">
        <button v-for="l in HINT_LEVELS" :key="l.value" class="rwb-hint-btn"
                :disabled="disabled(l.value)" :title="l.desc" @click="$emit('hint', l.value)">
          <span class="rwb-hint-lv">{{ l.value }}</span>
          <span class="rwb-hint-txt">{{ l.label.replace(l.value + ' ', '') }}</span>
          <span class="rwb-hint-q">{{ quotaText(l.value) }}</span>
        </button>
      </div>

      <div class="rwb-side-note">
        点一次深一级，也可直接要 L3。<b>L1 不限；L2 每段每回合 3 次；L3 每段每回合 1 次；同级冷却 10 秒</b>；
        重写不重置，新回合才重置。提示出站前过红线校验（与参考报告最长公共子串 ≤ 8 字、不出现其具体征象与测量值），
        不过关就丢弃并<b>退还配额</b>。
      </div>
    </div>

    <!-- 其他段的提示记录（跨段汇总，便于回看） -->
    <div v-if="otherHints.length" class="card rwb-side">
      <div class="rwb-side-head">
        <i class="fa-solid fa-clock-rotate-left"></i> 本回合其他段的提示
      </div>
      <div class="rwb-tips">
        <div v-for="(h, i) in otherHints" :key="i" class="rwb-tip" :class="{ 'is-degraded': h.degraded }">
          <span class="rwb-tip-lv" :class="'lv-' + h.level">{{ h.level }}</span>
          <div class="rwb-tip-body">
            <div class="rwb-tip-title">{{ SEG_NAME[h.segment] || h.segment }} · {{ h.time }}</div>
            <div class="rwb-tip-text">{{ h.text }}</div>
          </div>
        </div>
      </div>
      <div class="rwb-side-note">提示使用记录是比分数更细的学情信号——用得多说明这一段还不熟。</div>
    </div>
  </aside>
</template>

<script setup>
import { computed } from 'vue'
import { HINT_LEVELS, SEGMENTS } from '@ai-sp/shared/imaging'

const SEG_NAME = Object.fromEntries(SEGMENTS.map(s => [s.key, s.name]))
const LEVEL_NAME = Object.fromEntries(HINT_LEVELS.map(l => [l.value, l.label.replace(l.value + ' ', '')]))

const props = defineProps({
  hints: { type: Array, default: () => [] },
  usedHintCount: { type: Number, default: 0 },
  loading: { type: Boolean, default: false },
  segments: { type: Array, default: () => SEGMENTS },
  /** 当前要问提示的段 */
  activeSegment: { type: String, default: 'findings' },
  quotaLeft: { type: Function, required: true },
  coolingLeft: { type: Function, required: true }
})
defineEmits(['hint', 'update:activeSegment'])

const segHints = computed(() => props.hints.filter(h => h.segment === props.activeSegment))
const otherHints = computed(() => props.hints.filter(h => h.segment !== props.activeSegment))

function disabled(level) {
  if (props.loading) return true
  if (level === 'L1') return false
  return props.coolingLeft(level) > 0 || props.quotaLeft(level) <= 0
}

function quotaText(level) {
  if (level === 'L1') return '不限'
  const cooling = props.coolingLeft(level)
  if (cooling > 0) return `冷却 ${cooling}s`
  const left = props.quotaLeft(level)
  return left <= 0 ? '已用完' : `剩 ${left}`
}
</script>

<style scoped>
.rwb-aside { width: 330px; flex-shrink: 0; display: flex; flex-direction: column; gap: 14px; }
.rwb-side { overflow: hidden; }
.rwb-side-head {
  display: flex; align-items: center; gap: 8px;
  font-size: 13.5px; font-weight: 700; color: #1f2937;
  padding: 11px 16px; background: #eef2ff; border-bottom: 1px solid #e0e7ff;
}
.rwb-side-head i { color: #4f46e5; }
.rwb-side-sub { margin-left: auto; font-size: 11px; font-weight: 400; color: #9ca3af; }
.rwb-side-purpose {
  font-size: 11.5px; line-height: 1.85; color: #6b7280;
  padding: 9px 16px; background: #f8fafc; border-bottom: 1px solid #f3f4f6;
}
.rwb-seg-tabs { display: flex; gap: 0; margin: 10px 16px 0; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
.rwb-seg-tab {
  flex: 1; font-family: inherit; font-size: 12px; padding: 6px 0; cursor: pointer;
  border: none; background: #fff; color: #6b7280; border-right: 1px solid #e5e7eb;
}
.rwb-seg-tab:last-child { border-right: none; }
.rwb-seg-tab.active { background: var(--primary); color: #fff; font-weight: 600; }
.rwb-seg-hint { font-size: 10.5px; color: #c0c4cc; padding: 5px 16px 0; }

.rwb-tips { padding: 10px 16px 2px; display: flex; flex-direction: column; gap: 11px; max-height: 340px; overflow-y: auto; }
.rwb-tip { display: flex; gap: 8px; }
.rwb-tip.is-degraded { opacity: .85; }
.rwb-tip-lv {
  flex-shrink: 0; height: 18px; padding: 0 6px; border-radius: 5px;
  font-size: 10.5px; font-weight: 700; line-height: 18px;
}
.rwb-tip-lv.lv-L1 { background: #eff6ff; color: #1d4ed8; }
.rwb-tip-lv.lv-L2 { background: #fff7ed; color: #c2410c; }
.rwb-tip-lv.lv-L3 { background: #fef2f2; color: #b91c1c; }
.rwb-tip-body { min-width: 0; }
.rwb-tip-title {
  font-size: 11.5px; font-weight: 700; color: #6b7280;
  display: flex; align-items: baseline; gap: 6px; flex-wrap: wrap;
}
.rwb-tip-time { font-weight: 400; color: #c0c4cc; font-size: 10.5px; }
.rwb-tip-degraded {
  font-size: 10px; font-weight: 600; color: #b45309;
  background: #fef3c7; padding: 0 5px; border-radius: 4px;
}
.rwb-tip-text { font-size: 12.5px; line-height: 1.8; color: #4b5563; margin-top: 3px; white-space: pre-wrap; }
.rwb-tips-empty { font-size: 12px; color: #c0c4cc; line-height: 1.8; }
.rwb-tips-loading { font-size: 12px; color: #6b7280; display: flex; align-items: center; gap: 6px; line-height: 1.8; }
.rwb-tips-loading i { color: #4f46e5; }
.rwb-hint-btns { display: flex; flex-direction: column; gap: 6px; padding: 12px 16px 0; }
.rwb-hint-btn {
  display: flex; align-items: center; gap: 8px; width: 100%;
  font-family: inherit; font-size: 12.5px; padding: 8px 12px;
  border-radius: 8px; cursor: pointer; border: 1px dashed #c7d2fe;
  background: #eef2ff; color: #4338ca; transition: all .16s;
}
.rwb-hint-btn:hover:not(:disabled) { background: #e0e7ff; border-style: solid; }
.rwb-hint-btn:disabled { opacity: .5; cursor: not-allowed; }
.rwb-hint-lv { font-weight: 700; }
.rwb-hint-txt { flex: 1; text-align: left; }
.rwb-hint-q { font-size: 11px; color: #9ca3af; }
.rwb-side-note { font-size: 11px; line-height: 1.75; color: #9ca3af; padding: 12px 16px 14px; border-top: 1px solid #f3f4f6; margin-top: 12px; }
@media (max-width: 1100px) { .rwb-aside { width: 100%; } }
</style>
