<template>
  <section class="card rwb-block">
    <div class="rwb-block-head">
      <i class="fa-solid fa-image"></i> 影像显示控件
      <span class="rwb-tag">{{ sample.modality }} · {{ views.length }} 个序列 / 共 {{ totalFrames }} 帧</span>
      <span class="rwb-cap">滚轮 / ↑↓ 键 / 上一张·下一张 翻层面 · 调窗 ✗ · 测量 ✗ · 序列互不联动</span>
    </div>

    <!-- 序列切换：数量随病例变（DR 只有正/侧位，MR 可能有五个序列） -->
    <div class="rwb-seq-bar">
      <button v-for="(v, vi) in views" :key="v.key" class="rwb-seq"
              :class="{ active: vi === activeIndex }" @click="selectView(vi)">
        <span class="rwb-seq-name">{{ v.name }}</span>
        <span class="rwb-seq-n">{{ framesOf(v.key) }}</span>
      </button>
    </div>

    <div class="rwb-viewer" :class="visibleViews.length > 1 ? 'is-pair' : 'is-single'">
      <div v-for="(v, vi) in visibleViews" :key="v.key" class="rwb-view">
        <div class="rwb-canvas" tabindex="0"
             :title="framesOf(v.key) > 1 ? '滚轮翻层面 / ↑↓ 键；点左侧上一张、右侧下一张' : '单帧图像'"
             @wheel.prevent="onWheel(vi, $event)"
             @keydown.up.prevent="step(vi, -1)"
             @keydown.down.prevent="step(vi, 1)"
             @click="onCanvasClick(vi, $event)">
          <!-- 演示占位图：随层面号可见地变化，否则翻页交互无从判断 -->
          <div class="rwb-demo" :style="demoStyle(v.key, vi)">
            <span class="rwb-demo-scan"></span>
            <span class="rwb-demo-mark"></span>
          </div>
          <span class="rwb-demo-tag">演示占位 · 非真实影像</span>
          <span class="rwb-layer">第 {{ layerOf(vi) }} / {{ framesOf(v.key) || 0 }} 层</span>
        </div>

        <div class="rwb-view-foot">
          <span class="rwb-view-label">{{ v.name }} <span class="rwb-view-en">{{ v.en }}</span></span>
          <span class="rwb-wl">W 400 · L 40</span>
        </div>

        <!-- 图片切换：上一张 / 下一张（真实阅片的翻页习惯），不是拖动条 -->
        <div class="rwb-page">
          <button class="rwb-page-btn" :disabled="layerOf(vi) <= 1" @click="step(vi, -1)" title="上一张">
            <i class="fa-solid fa-chevron-left"></i> 上一张
          </button>
          <span class="rwb-page-no">
            <input class="rwb-page-input" type="number" min="1" :max="Math.max(1, framesOf(v.key))"
                   :value="layerOf(vi)" :disabled="framesOf(v.key) <= 1"
                   @change="jumpTo(vi, $event.target.value)">
            <span class="rwb-page-total">/ {{ framesOf(v.key) || 0 }}</span>
          </span>
          <button class="rwb-page-btn" :disabled="layerOf(vi) >= framesOf(v.key)" @click="step(vi, 1)" title="下一张">
            下一张 <i class="fa-solid fa-chevron-right"></i>
          </button>
        </div>
        <div class="rwb-progress"><span :style="{ width: progressOf(vi) }"></span></div>
      </div>
    </div>

    <div class="rwb-note">
      本期为界面骨架：影像本体待院方提供真实样本后接入（系统内置数据，非实时调阅 PACS）。
      上方为<b>演示占位图</b>，会随层面号变化以便验证翻页交互；接入真实序列后同一套控件直接渲染真实像素。
      调窗 / 测量 / MPR 等进阶能力归影像教学底座（§9.4 本期不做）。
    </div>
  </section>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { seriesListOf } from '@ai-sp/shared/imaging'

const props = defineProps({
  /** 题库样本（`series` 为有序数组，数量随病例变） */
  sample: { type: Object, required: true }
})

/** 视图列表——**不假设三视图**，按样本声明的序列渲染 */
const views = computed(() => seriesListOf(props.sample))
const totalFrames = computed(() => views.value.reduce((a, v) => a + (v.frames || 0), 0))

const activeIndex = ref(0)

/** 每视图的当前层面（1 起）；轴位/冠状位/矢状位等并列展示时各自独立翻页 */
const layer = reactive({})

function framesOf(key) {
  const v = views.value.find(x => x.key === key)
  return (v && v.frames) || 0
}

function ensureLayers() {
  views.value.forEach(v => { if (layer[v.key] == null) layer[v.key] = 1 })
}

ensureLayers()

/**
 * 并列时最多显示 3 个（再多就拥挤），其余通过序列条切到单序列大图看。
 * 单序列病例（如颅脑CT 只有轴位）就显示 1 个。
 */
const visibleViews = computed(() => {
  if (views.value.length <= 3) return views.value
  return [views.value[activeIndex.value]]
})

function selectView(vi) {
  activeIndex.value = vi
}

/** 层号取值（visibleViews 的下标 ≠ views 的下标，用 key 取） */
function layerOf(vi) {
  const v = visibleViews.value[vi]
  return v ? (layer[v.key] || 1) : 1
}

function progressOf(vi) {
  const v = visibleViews.value[vi]
  if (!v) return '0%'
  const max = Math.max(1, framesOf(v.key))
  return `${(layerOf(vi) / max) * 100}%`
}

function step(vi, delta) {
  const v = visibleViews.value[vi]
  if (!v) return
  const max = Math.max(1, framesOf(v.key))
  layer[v.key] = Math.min(max, Math.max(1, (layer[v.key] || 1) + delta))
}

function jumpTo(vi, value) {
  const v = visibleViews.value[vi]
  if (!v) return
  const max = Math.max(1, framesOf(v.key))
  const n = Math.round(Number(value) || 1)
  layer[v.key] = Math.min(max, Math.max(1, n))
}

/** 滚轮翻层面：向下滚 = 下一张（PACS 习惯） */
function onWheel(vi, e) {
  step(vi, e.deltaY > 0 ? 1 : -1)
}

/** 点画布左半 = 上一张、右半 = 下一张（没有滚轮时的等价操作） */
function onCanvasClick(vi, e) {
  const rect = e.currentTarget.getBoundingClientRect()
  step(vi, e.clientX - rect.left < rect.width / 2 ? -1 : 1)
}

/**
 * 演示占位图的视觉：随层面号变化——一条上下移动的扫描线 + 一个大小随层面收放的光斑。
 * 这样"翻页有没有生效"一眼可判；接真实序列后整块替换为图像。
 */
function demoStyle(key, vi) {
  const v = visibleViews.value[vi]
  if (!v) return {}
  const max = Math.max(1, framesOf(v.key))
  const t = layerOf(vi) / max
  return {
    '--scan-top': `${(1 - t) * 100}%`,
    '--mark-size': `${18 + Math.sin(t * Math.PI) * 26}%`,
    '--mark-top': `${20 + (1 - t) * 30}%`,
    '--mark-left': `${28 + t * 16}%`
  }
}

/** 换病例时层面归位 */
watch(() => props.sample.id, () => {
  Object.keys(layer).forEach(k => delete layer[k])
  activeIndex.value = 0
  ensureLayers()
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

.rwb-seq-bar { display: flex; flex-wrap: wrap; gap: 6px; padding: 12px 18px 0; }
.rwb-seq {
  display: inline-flex; align-items: center; gap: 6px; font-family: inherit; font-size: 12.5px;
  padding: 5px 11px; border-radius: 8px; cursor: pointer;
  border: 1px solid #e5e7eb; background: #fff; color: #6b7280; transition: all .15s;
}
.rwb-seq:hover { border-color: var(--primary); color: var(--primary); }
.rwb-seq.active { background: var(--primary); border-color: var(--primary); color: #fff; font-weight: 600; }
.rwb-seq-n {
  font-size: 10.5px; padding: 0 5px; border-radius: 7px; background: rgba(0,0,0,.06); color: inherit;
}
.rwb-seq.active .rwb-seq-n { background: rgba(255,255,255,.24); }

.rwb-viewer { display: grid; grid-template-columns: 1fr; gap: 12px; padding: 12px 18px 6px; }
/* 只显示一个序列时居中限宽：别让一张大方图把阅片笔记与报告输入挤出首屏。
   注意用 visibleViews 的数量判分支——auto-fit 会塌掉空轨道，单个子元素会独占整行。 */
.rwb-viewer.is-single .rwb-view { max-width: 400px; margin: 0 auto; width: 100%; }
.rwb-viewer.is-pair { grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
.rwb-view { border: 1px solid #eef0f4; border-radius: 10px; overflow: hidden; }
.rwb-canvas {
  aspect-ratio: 1 / 1; position: relative; cursor: crosshair; overflow: hidden; outline: none;
  background: repeating-linear-gradient(45deg, #2b2f36, #2b2f36 10px, #31353d, #31353d 20px);
}
.rwb-canvas:focus-visible { box-shadow: inset 0 0 0 2px var(--primary); }
.rwb-demo { position: absolute; inset: 0; }
.rwb-demo-scan {
  position: absolute; left: 0; right: 0; top: var(--scan-top, 50%); height: 2px;
  background: linear-gradient(90deg, transparent, rgba(96,165,250,.55), transparent);
  box-shadow: 0 0 12px rgba(96,165,250,.45);
}
.rwb-demo-mark {
  position: absolute; width: var(--mark-size, 30%); height: var(--mark-size, 30%);
  top: var(--mark-top, 35%); left: var(--mark-left, 32%);
  border-radius: 50%; border: 1px solid rgba(226,232,240,.5);
  background: radial-gradient(circle, rgba(148,163,184,.35), rgba(148,163,184,.08) 70%, transparent);
}
.rwb-demo-tag {
  position: absolute; left: 8px; top: 8px; font-size: 10px; color: #94a3b8;
  background: rgba(0,0,0,.35); padding: 2px 7px; border-radius: 6px;
}
.rwb-layer {
  position: absolute; right: 8px; bottom: 8px; font-size: 10.5px; color: #cbd5e1;
  background: rgba(0,0,0,.42); padding: 2px 8px; border-radius: 6px; font-variant-numeric: tabular-nums;
}
.rwb-view-foot {
  display: flex; align-items: center; justify-content: space-between;
  padding: 7px 12px; background: #fafbfc; border-top: 1px solid #f0f2f5;
}
.rwb-view-label { font-size: 12px; font-weight: 600; color: #4b5563; }
.rwb-view-en { font-size: 10.5px; color: #9ca3af; font-weight: 400; margin-left: 3px; }
.rwb-wl { font-size: 11px; color: #9ca3af; font-family: monospace; }

.rwb-page { display: flex; align-items: center; gap: 6px; padding: 7px 10px 5px; }
.rwb-page-btn {
  display: inline-flex; align-items: center; gap: 4px; font-family: inherit; font-size: 11.5px;
  padding: 4px 9px; border-radius: 6px; cursor: pointer;
  border: 1px solid #e5e7eb; background: #fff; color: #6b7280; transition: all .15s;
}
.rwb-page-btn:hover:not(:disabled) { border-color: var(--primary); color: var(--primary); }
.rwb-page-btn:disabled { opacity: .45; cursor: not-allowed; }
.rwb-page-no { margin: 0 auto; display: inline-flex; align-items: baseline; gap: 3px; }
.rwb-page-input {
  width: 46px; text-align: center; font-family: inherit; font-size: 12px;
  padding: 3px 4px; border: 1px solid #e5e7eb; border-radius: 6px; color: #4b5563;
}
.rwb-page-input:disabled { background: #fafbfc; color: #9ca3af; }
.rwb-page-total { font-size: 11.5px; color: #9ca3af; font-variant-numeric: tabular-nums; }
.rwb-progress { height: 2px; margin: 0 10px 8px; border-radius: 2px; background: #eef0f4; overflow: hidden; }
.rwb-progress span { display: block; height: 100%; background: var(--primary); transition: width .12s; }

.rwb-note { font-size: 12px; color: #9ca3af; line-height: 1.7; padding: 6px 18px 16px; }
@media (max-width: 900px) { .rwb-viewer.is-pair { grid-template-columns: 1fr; } }
</style>
