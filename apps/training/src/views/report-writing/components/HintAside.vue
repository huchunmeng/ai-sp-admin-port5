<template>
  <aside class="rwb-aside">
    <!-- 要素覆盖清单（训练侧专属，考核侧不下发） -->
    <div class="card rwb-side">
      <div class="rwb-side-head">
        <i class="fa-solid fa-list-check"></i> 要素覆盖
        <span class="rwb-side-sub">影像所见段</span>
      </div>
      <div class="rwb-cov">
        <div v-for="c in coverage" :key="c.key" class="rwb-cov-item">
          <span class="rwb-mark" :class="'mk-' + c.mark">{{ MARK[c.mark] }}</span>
          <div class="rwb-cov-body">
            <div class="rwb-cov-name">{{ c.name }}</div>
            <div class="rwb-cov-text">{{ c.text }}</div>
          </div>
        </div>
      </div>
      <div class="rwb-side-note">● 已覆盖 &nbsp; ? 存疑 &nbsp; ○ 缺失 —— 系统判读，仅供自检</div>
    </div>

    <!-- 培训提示栏 -->
    <div class="card rwb-side">
      <div class="rwb-side-head">
        <i class="fa-solid fa-lightbulb"></i> 培训提示
        <span class="rwb-side-sub">已用 {{ usedHintCount }} 次</span>
      </div>

      <template v-if="locked">
        <div class="rwb-lock">
          <i class="fa-solid fa-lock"></i>
          <div class="rwb-lock-title">本阶段不提供提示</div>
          <div class="rwb-lock-desc">{{ lockReason }}</div>
        </div>
      </template>
      <template v-else>
        <div class="rwb-tips">
          <div v-for="(h, i) in hints" :key="i" class="rwb-tip">
            <span class="rwb-tip-lv" :class="'lv-' + h.level">{{ h.level }}</span>
            <div class="rwb-tip-body">
              <div class="rwb-tip-title">{{ h.title }}<span class="rwb-tip-time">{{ h.time }}</span></div>
              <div v-for="(it, j) in h.items" :key="j" class="rwb-tip-text">{{ it.text }}</div>
            </div>
          </div>
          <div v-if="!hints.length" class="rwb-tips-empty">还没有请求过提示。先自己写，卡住了再要。</div>
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
          点一次深一级，也可直接要 L3。L1 不限；L2 每段每回合 3 次；L3 每段每回合 1 次；同级冷却 10 秒；
          <b>重写不重置配额</b>，新回合才重置。L3 只给要点词，不给金标准原句。
        </div>
      </template>
    </div>
  </aside>
</template>

<script setup>
import { HINT_LEVELS } from '@ai-sp/shared/imaging'

const MARK = { ok: '●', doubt: '?', miss: '○' }

const props = defineProps({
  coverage: { type: Array, default: () => [] },
  hints: { type: Array, default: () => [] },
  usedHintCount: { type: Number, default: 0 },
  /** 当前段无提示通道时（T0 / T4）置 true */
  locked: { type: Boolean, default: false },
  lockReason: { type: String, default: '' },
  quotaLeft: { type: Function, required: true },
  coolingLeft: { type: Function, required: true }
})
defineEmits(['hint'])

function disabled(level) {
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
.rwb-aside { width: 320px; flex-shrink: 0; display: flex; flex-direction: column; gap: 14px; }
.rwb-side { overflow: hidden; }
.rwb-side-head {
  display: flex; align-items: center; gap: 8px;
  font-size: 13.5px; font-weight: 700; color: #1f2937;
  padding: 11px 16px; background: #fffbeb; border-bottom: 1px solid #fef3c7;
}
.rwb-side-head i { color: #d97706; }
.rwb-side-sub { margin-left: auto; font-size: 11px; font-weight: 400; color: #9ca3af; }
.rwb-cov { padding: 10px 16px 4px; display: flex; flex-direction: column; gap: 9px; }
.rwb-cov-item { display: flex; gap: 8px; }
.rwb-mark { flex-shrink: 0; width: 14px; text-align: center; font-size: 13px; font-weight: 700; }
.rwb-mark.mk-ok { color: var(--success); }
.rwb-mark.mk-doubt { color: var(--warning); }
.rwb-mark.mk-miss { color: #c0c4cc; }
.rwb-cov-body { min-width: 0; }
.rwb-cov-name { font-size: 12.5px; font-weight: 600; color: #4b5563; }
.rwb-cov-text { font-size: 11.5px; line-height: 1.7; color: #9ca3af; }
.rwb-tips { padding: 10px 16px 2px; display: flex; flex-direction: column; gap: 10px; max-height: 340px; overflow-y: auto; }
.rwb-tip { display: flex; gap: 8px; }
.rwb-tip-lv {
  flex-shrink: 0; height: 18px; padding: 0 6px; border-radius: 5px;
  font-size: 10.5px; font-weight: 700; line-height: 18px;
}
.rwb-tip-lv.lv-L1 { background: #eff6ff; color: #1d4ed8; }
.rwb-tip-lv.lv-L2 { background: #fff7ed; color: #c2410c; }
.rwb-tip-lv.lv-L3 { background: #fef2f2; color: #b91c1c; }
.rwb-tip-body { min-width: 0; }
.rwb-tip-title { font-size: 11.5px; font-weight: 700; color: #6b7280; display: flex; align-items: baseline; gap: 6px; }
.rwb-tip-time { font-weight: 400; color: #c0c4cc; font-size: 10.5px; }
.rwb-tip-text { font-size: 12.5px; line-height: 1.8; color: #4b5563; margin-top: 2px; }
.rwb-tips-empty { font-size: 12px; color: #c0c4cc; line-height: 1.8; }
.rwb-hint-btns { display: flex; flex-direction: column; gap: 6px; padding: 12px 16px 0; }
.rwb-hint-btn {
  display: flex; align-items: center; gap: 8px; width: 100%;
  font-family: inherit; font-size: 12.5px; padding: 8px 12px;
  border-radius: 8px; cursor: pointer; border: 1px dashed #fcd34d;
  background: #fffbeb; color: #b45309; transition: all .16s;
}
.rwb-hint-btn:hover:not(:disabled) { background: #fef3c7; border-style: solid; }
.rwb-hint-btn:disabled { opacity: .5; cursor: not-allowed; }
.rwb-hint-lv { font-weight: 700; }
.rwb-hint-txt { flex: 1; text-align: left; }
.rwb-hint-q { font-size: 11px; color: #9ca3af; }
.rwb-lock { padding: 26px 18px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 8px; }
.rwb-lock i { font-size: 26px; color: #d1d5db; }
.rwb-lock-title { font-size: 13px; font-weight: 700; color: #6b7280; }
.rwb-lock-desc { font-size: 12px; color: #9ca3af; line-height: 1.8; }
.rwb-side-note { font-size: 11px; line-height: 1.75; color: #9ca3af; padding: 12px 16px 14px; border-top: 1px solid #f3f4f6; margin-top: 12px; }
@media (max-width: 1100px) { .rwb-aside { width: 100%; } }
</style>
