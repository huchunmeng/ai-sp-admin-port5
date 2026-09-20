<template>
  <div class="rwb-pacs">
    <!-- ══ 工具条：按真实阅片工具的结构组织（序列 / 窗宽窗位 / 翻层 / 布局 / 测量）══ -->
    <div class="rwb-tool">
      <div class="rwb-tool-group">
        <span class="rwb-tool-label">窗宽窗位</span>
        <button v-for="w in windowPresets" :key="w.WW + '-' + w.WL" class="rwb-tool-btn"
                :class="{ active: isActiveWindow(w) }" :title="`W ${w.WW} · L ${w.WL}`"
                @click="applyWindow(w)">{{ w.name }}</button>
      </div>
      <div class="rwb-tool-sep"></div>
      <div class="rwb-tool-group">
        <span class="rwb-tool-label">层面</span>
        <button class="rwb-tool-btn" :disabled="!frameCount" @click="step(activeIndex, -9999)" title="首帧">
          <i class="fa-solid fa-backward-fast"></i>
        </button>
        <button class="rwb-tool-btn" :disabled="!frameCount" @click="step(activeIndex, -1)" title="上一张">
          <i class="fa-solid fa-chevron-left"></i>
        </button>
        <button class="rwb-tool-btn" :disabled="!frameCount" @click="step(activeIndex, 1)" title="下一张">
          <i class="fa-solid fa-chevron-right"></i>
        </button>
        <button class="rwb-tool-btn" :disabled="!frameCount" @click="step(activeIndex, 9999)" title="末帧">
          <i class="fa-solid fa-forward-fast"></i>
        </button>
      </div>
      <div class="rwb-tool-sep"></div>
      <div class="rwb-tool-group">
        <button class="rwb-tool-btn" disabled title="本期影像控件不具备测量工具">
          <i class="fa-solid fa-ruler"></i> 测量
        </button>
        <button class="rwb-tool-btn" disabled title="本期影像控件不具备缩放/平移">
          <i class="fa-solid fa-magnifying-glass-plus"></i> 缩放
        </button>
        <button class="rwb-tool-btn" @click="resetView" title="回到首帧并恢复默认窗">
          <i class="fa-solid fa-rotate-left"></i> 复位
        </button>
      </div>
      <span class="rwb-tool-hint">滚轮 / ↑↓ 翻层面</span>
    </div>

    <div class="rwb-body">
      <!-- ══ 左：序列栏 ══ -->
      <aside class="rwb-rail">
        <div class="rwb-rail-head">序列 <span class="rwb-rail-n">{{ views.length }}</span></div>
        <button v-for="(v, vi) in views" :key="v.key" class="rwb-rail-item"
                :class="{ active: vi === activeIndex }" @click="selectView(vi)">
          <span class="rwb-rail-thumb">
            <img v-if="thumbOf(v)" :src="thumbOf(v)" alt="">
            <i v-else class="fa-solid fa-image"></i>
          </span>
          <span class="rwb-rail-meta">
            <span class="rwb-rail-name">{{ v.name }}</span>
            <span class="rwb-rail-sub">{{ v.en || '' }} · {{ framesOf(v.key) }} 帧</span>
          </span>
        </button>
      </aside>

      <!-- ══ 右：影像区 ══ -->
      <div class="rwb-viewport">
        <div v-if="activeView" class="rwb-canvas" tabindex="0"
             :title="frameCount > 1 ? '滚轮翻层面 / ↑↓ 键；点左半屏上一张、右半屏下一张' : '单帧图像'"
             @wheel.prevent="onWheel(activeIndex, $event)"
             @keydown.up.prevent="step(activeIndex, -1)"
             @keydown.down.prevent="step(activeIndex, 1)"
             @click="onCanvasClick(activeIndex, $event)">
          <img v-if="currentImage" class="rwb-pixel" :src="currentImage" :alt="activeView.name">
          <template v-else>
            <div class="rwb-demo" :style="demoStyle(activeView.key, activeIndex)">
              <span class="rwb-demo-scan"></span>
              <span class="rwb-demo-mark"></span>
            </div>
          </template>

          <!-- 四角叠加：真实阅片的信息布局 -->
          <div class="rwb-ov rwb-ov-tl">
            <div class="rwb-ov-strong">{{ sample.deidentify && sample.deidentify.name || '—' }}</div>
            <div>{{ sexAge }}</div>
            <div>{{ (sample.deidentify && sample.deidentify.dept) || '' }}</div>
          </div>
          <div class="rwb-ov rwb-ov-tr">
            <div class="rwb-ov-strong">{{ sample.bodyPart || '' }} {{ sample.modality || '' }}</div>
            <div>{{ activeView.name }}</div>
            <div>{{ sample.title }}</div>
          </div>
          <div class="rwb-ov rwb-ov-bl">
            <div>W: {{ currentWindow.WW }} L: {{ currentWindow.WL }}</div>
            <div>{{ activeView.en || '' }}</div>
          </div>
          <div class="rwb-ov rwb-ov-br">
            <div>层 {{ layerOf(activeIndex) }} / {{ frameCount }}</div>
            <div>缩放 100%</div>
          </div>
          <span v-if="!currentImage" class="rwb-demo-tag">演示占位</span>
        </div>

        <!-- ══ 底部：层面滑动条 ══ -->
        <div class="rwb-slice">
          <span class="rwb-slice-no">{{ layerOf(activeIndex) }}</span>
          <input class="rwb-slice-range" type="range" min="1" :max="Math.max(1, frameCount)"
                 :value="layerOf(activeIndex)" :disabled="frameCount <= 1"
                 @input="jumpTo(activeIndex, $event.target.value)">
          <span class="rwb-slice-no">{{ frameCount }}</span>
        </div>
      </div>
    </div>

    <div v-if="!hasRealImage" class="rwb-note">影像待接入</div>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { seriesListOf } from '@ai-sp/shared/imaging'

const props = defineProps({
  /** 题库样本（`series` 为有序数组，数量随病例变） */
  sample: { type: Object, required: true }
})

/** 当前激活序列 */
const activeView = computed(() => views.value[activeIndex.value] || null)
/** 当前序列的帧数（滑动条与右下角层号用） */
const frameCount = computed(() => (activeView.value ? framesOf(activeView.value.key) : 0))
/** 当前帧的图片地址 */
const currentImage = computed(() => (activeView.value ? imgOf(activeView.value.key, activeIndex.value) : ''))
/** 序列栏缩略图：取该序列中间那一帧 */
function thumbOf(v) {
  const n = framesOf(v.key)
  if (!n) return ''
  return imgOf(v.key, Math.max(0, Math.floor(n / 2)))
}
/** 性别/年龄一行显示 */
const sexAge = computed(() => {
  const d = props.sample.deidentify || {}
  return [d.sex, d.ageRange].filter(Boolean).join(' · ') || '—'
})

/** 窗宽窗位预设：优先用序列自带的窗，再补常用解剖窗（真实 PACS 的窗口预设） */
const windowOverride = reactive({})
const BUILTIN_WINDOWS = [
  { name: '肺窗', WW: 1500, WL: -600 },
  { name: '纵隔窗', WW: 400, WL: 40 },
  { name: '骨窗', WW: 2000, WL: 300 },
  { name: '脑窗', WW: 80, WL: 40 }
]
const windowPresets = computed(() => {
  const own = (activeView.value && activeView.value.window) || null
  if (own) {
    return [{ name: activeView.value.name || '默认窗', WW: own.WW, WL: own.WL },
            ...BUILTIN_WINDOWS.filter(w => w.WW !== own.WW || w.WL !== own.WL)]
  }
  return BUILTIN_WINDOWS
})
const currentWindow = computed(() => {
  const key = activeView.value ? activeView.value.key : ''
  return windowOverride[key] || (activeView.value && activeView.value.window) || { WW: '—', WL: '—' }
})
const isActiveWindow = w => currentWindow.value.WW === w.WW && currentWindow.value.WL === w.WL
function applyWindow(w) {
  if (activeView.value) windowOverride[activeView.value.key] = { WW: w.WW, WL: w.WL }
}
function resetView() {
  Object.keys(windowOverride).forEach(k => delete windowOverride[k])
  layer[activeView.value && activeView.value.key] = 1
}
/** 视图列表——**不假设三视图**，按样本声明的序列渲染 */
const views = computed(() => seriesListOf(props.sample))
const totalFrames = computed(() => views.value.reduce((a, v) => a + (v.frames || 0), 0))
/** 本病例是否已接真实影像（没接才显示"影像待接入"） */
const hasRealImage = computed(() => views.value.some(v => (v.images || []).length > 0))

const activeIndex = ref(0)

/** 每视图的当前层面（1 起）；轴位/冠状位/矢状位等并列展示时各自独立翻页 */
const layer = reactive({})

function framesOf(key) {
  const v = views.value.find(x => x.key === key)
  return (v && v.frames) || 0
}

/** 该视图当前层面的真实图片地址（无真实图返回空，回退演示占位） */
function imgOf(key, vi) {
  const v = views.value.find(x => x.key === key)
  const imgs = (v && v.images) || []
  if (!imgs.length) return ''
  const idx = Math.min(Math.max(0, layerOf(vi) - 1), imgs.length - 1)
  return imgs[idx]
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
/* ══ PACS 式阅片工具（2026-09-20 批注 3：「按 PACS 的要求做成真实的阅片工具结构」）══ */
.rwb-pacs { display: flex; flex-direction: column; background: #0b0d10; }

/* 工具条 */
.rwb-tool {
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  padding: 7px 12px; background: #14181d; border-bottom: 1px solid #232931;
}
.rwb-tool-group { display: flex; align-items: center; gap: 4px; }
.rwb-tool-label { font-size: 11px; color: #6b7280; margin-right: 3px; }
.rwb-tool-sep { width: 1px; height: 18px; background: #2a313a; }
.rwb-tool-btn {
  display: inline-flex; align-items: center; gap: 4px; font-family: inherit; font-size: 11.5px;
  color: #c7ccd4; background: #1c2229; border: 1px solid #2a313a; border-radius: 5px;
  padding: 4px 9px; cursor: pointer; transition: all .12s;
}
.rwb-tool-btn:hover:not(:disabled) { background: #232b34; color: #fff; border-color: #3a444f; }
.rwb-tool-btn.active { background: var(--primary); border-color: var(--primary); color: #fff; }
.rwb-tool-btn:disabled { opacity: .40; cursor: not-allowed; }
.rwb-tool-hint { margin-left: auto; font-size: 11px; color: #5b636e; }

/* 主体：序列栏 + 影像区 */
.rwb-body { display: flex; min-height: 0; }

.rwb-rail {
  flex-shrink: 0; width: 176px; background: #10141a; border-right: 1px solid #232931;
  overflow-y: auto; max-height: 460px;
}
.rwb-rail-head {
  display: flex; align-items: center; gap: 6px; padding: 8px 10px;
  font-size: 11px; color: #6b7280; border-bottom: 1px solid #1c2229;
}
.rwb-rail-n {
  font-size: 10px; color: #9ca3af; background: #1c2229; border-radius: 7px; padding: 1px 6px;
}
.rwb-rail-item {
  display: flex; align-items: center; gap: 9px; width: 100%; text-align: left; font-family: inherit;
  padding: 8px 10px; background: none; border: none; border-left: 2px solid transparent;
  cursor: pointer; transition: background .12s;
}
.rwb-rail-item:hover { background: #161c23; }
.rwb-rail-item.active { background: #1b2530; border-left-color: var(--primary); }
.rwb-rail-thumb {
  flex-shrink: 0; width: 40px; height: 40px; border-radius: 4px; overflow: hidden;
  background: #05070a; display: flex; align-items: center; justify-content: center; color: #3a444f;
}
.rwb-rail-thumb img { width: 100%; height: 100%; object-fit: cover; }
.rwb-rail-meta { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.rwb-rail-name { font-size: 12.5px; font-weight: 600; color: #e5e7eb; }
.rwb-rail-item.active .rwb-rail-name { color: #fff; }
.rwb-rail-sub { font-size: 10.5px; color: #6b7280; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.rwb-viewport { flex: 1; min-width: 0; display: flex; flex-direction: column; }

.rwb-canvas {
  position: relative; flex: 1; min-height: 300px; background: #000;
  display: flex; align-items: center; justify-content: center; outline: none; cursor: crosshair;
}
.rwb-pixel { max-width: 100%; max-height: 460px; object-fit: contain; display: block; }

/* 四角叠加信息（真实阅片的固定位置） */
.rwb-ov {
  position: absolute; font-size: 11px; line-height: 1.55; color: #d1d5db;
  text-shadow: 0 1px 2px rgba(0, 0, 0, .9); pointer-events: none; max-width: 42%;
}
.rwb-ov-strong { font-weight: 700; color: #fff; }
.rwb-ov-tl { top: 8px; left: 10px; }
.rwb-ov-tr { top: 8px; right: 10px; text-align: right; }
.rwb-ov-bl { bottom: 8px; left: 10px; }
.rwb-ov-br { bottom: 8px; right: 10px; text-align: right; }

/* 演示占位（无真实影像时） */
.rwb-demo { position: absolute; inset: 0; overflow: hidden; background: radial-gradient(circle at 50% 45%, #1b2733, #05070a 70%); }
.rwb-demo-scan {
  position: absolute; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, transparent, #38bdf8, transparent);
  animation: rwb-scan 3.4s linear infinite;
}
.rwb-demo-mark {
  position: absolute; top: 42%; left: 56%; width: 26px; height: 26px; border-radius: 50%;
  border: 2px solid #38bdf8; box-shadow: 0 0 12px #38bdf8;
}
@keyframes rwb-scan { 0% { top: 8%; } 100% { top: 92%; } }
.rwb-demo-tag {
  position: absolute; bottom: 46px; left: 50%; transform: translateX(-50%);
  font-size: 10.5px; color: #6b7280; background: rgba(0, 0, 0, .55); padding: 2px 8px; border-radius: 8px;
}

/* 层面滑动条 */
.rwb-slice {
  display: flex; align-items: center; gap: 10px; padding: 7px 14px;
  background: #14181d; border-top: 1px solid #232931;
}
.rwb-slice-no { font-size: 11px; color: #9ca3af; min-width: 34px; text-align: center; font-variant-numeric: tabular-nums; }
.rwb-slice-range { flex: 1; accent-color: var(--primary); cursor: pointer; }
.rwb-slice-range:disabled { opacity: .4; cursor: default; }

.rwb-note {
  padding: 6px 14px; font-size: 11px; color: #9ca3af;
  background: #14181d; border-top: 1px solid #232931; text-align: center;
}
</style>
