<template>
  <section class="card rwb-block">
    <div class="rwb-block-head">
      <i class="fa-solid fa-image"></i> 影像显示控件
      <span class="rwb-tag">三视图 · {{ sample.modality }}</span>
      <span class="rwb-cap">序列切换 ✓ · 层面浏览 ✓ · 调窗 ✗ · 测量 ✗ · 三视图互不联动</span>
    </div>

    <div class="rwb-viewer">
      <div v-for="(v, vi) in VIEW_KEYS" :key="v.key" class="rwb-view">
        <div class="rwb-canvas">
          <i class="fa-solid fa-film"></i>
          <span>影像待接入</span>
          <span class="rwb-series">共 {{ framesOf(v.key) }} 帧</span>
        </div>
        <div class="rwb-view-foot">
          <span class="rwb-view-label">{{ v.zh }} / {{ v.en }}</span>
          <span class="rwb-wl">W 400 · L 40</span>
        </div>
        <div class="rwb-slice">
          <button class="rwb-slice-btn" :disabled="slice[vi] <= 1" @click="stepSlice(vi, -1)">
            <i class="fa-solid fa-chevron-left"></i>
          </button>
          <input class="rwb-slice-range" type="range" min="1" :max="Math.max(1, framesOf(v.key))"
                 v-model.number="slice[vi]" :disabled="framesOf(v.key) <= 1">
          <span class="rwb-slice-no">{{ framesOf(v.key) > 1 ? slice[vi] : 0 }} / {{ framesOf(v.key) }}</span>
          <button class="rwb-slice-btn" :disabled="slice[vi] >= framesOf(v.key)" @click="stepSlice(vi, 1)">
            <i class="fa-solid fa-chevron-right"></i>
          </button>
        </div>
      </div>
    </div>

    <div class="rwb-note">
      本期为界面骨架：影像本体待院方提供真实样本后接入（系统内置数据，非实时调阅 PACS）。
      进阶能力（调窗 / 测量 / MPR）归影像教学底座，按黑盒接口接入。
    </div>
  </section>
</template>

<script setup>
import { reactive, watch } from 'vue'
import { VIEW_KEYS } from '@ai-sp/shared/imaging'

const props = defineProps({
  /** 题库样本（含 series 帧数） */
  sample: { type: Object, required: true }
})

const slice = reactive([1, 1, 1])

function framesOf(key) {
  return (props.sample.series && props.sample.series[key]) || 0
}

function stepSlice(vi, delta) {
  const key = VIEW_KEYS[vi].key
  const max = Math.max(1, framesOf(key))
  slice[vi] = Math.min(max, Math.max(1, slice[vi] + delta))
}

// 换样本时层面号归位
watch(() => props.sample.id, () => { slice[0] = 1; slice[1] = 1; slice[2] = 1 })
</script>

<style scoped>
.rwb-block { overflow: hidden; }
.rwb-block-head {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  font-size: 14px; font-weight: 700; color: #1f2937;
  padding: 12px 18px; background: #fafbfc; border-bottom: 1px solid #f3f4f6;
}
.rwb-block-head i { color: var(--primary); }
.rwb-tag {
  font-size: 11px; font-weight: 500; color: #6b7280;
  background: #f3f4f6; padding: 3px 10px; border-radius: 8px;
}
.rwb-cap { margin-left: auto; font-size: 11px; color: #9ca3af; font-weight: 400; }
.rwb-viewer { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; padding: 16px 18px 10px; }
.rwb-view { border: 1px solid #eef0f4; border-radius: 10px; overflow: hidden; }
.rwb-canvas {
  aspect-ratio: 1 / 1;
  background: repeating-linear-gradient(45deg, #2b2f36, #2b2f36 10px, #31353d, #31353d 20px);
  color: #8b93a1; font-size: 12px;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px;
}
.rwb-canvas i { font-size: 26px; opacity: .7; }
.rwb-series { font-size: 11px; opacity: .75; }
.rwb-view-foot {
  display: flex; align-items: center; justify-content: space-between;
  padding: 7px 12px; background: #fafbfc; border-top: 1px solid #f0f2f5;
}
.rwb-view-label { font-size: 12px; font-weight: 600; color: #4b5563; }
.rwb-wl { font-size: 11px; color: #9ca3af; font-family: monospace; }
.rwb-slice {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 10px; border-top: 1px solid #f0f2f5;
}
.rwb-slice-btn {
  width: 22px; height: 22px; flex-shrink: 0; border-radius: 6px; cursor: pointer;
  border: 1px solid #e5e7eb; background: #fff; color: #6b7280; font-size: 10px;
  display: flex; align-items: center; justify-content: center;
}
.rwb-slice-btn:disabled { opacity: .4; cursor: not-allowed; }
.rwb-slice-range { flex: 1; min-width: 0; accent-color: var(--primary); }
.rwb-slice-no { font-size: 11px; color: #6b7280; font-variant-numeric: tabular-nums; white-space: nowrap; }
.rwb-note { font-size: 12px; color: #9ca3af; line-height: 1.6; padding: 0 18px 16px; }
@media (max-width: 900px) { .rwb-viewer { grid-template-columns: 1fr; } }
</style>
