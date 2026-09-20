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
        <button class="rwb-tool-btn" :class="{ active: measuring }" :disabled="!canMeasure"
                :title="canMeasure ? '在图上按住拖动即可量长度（按层内像素间距换算毫米）' : '本序列没有像素间距信息，无法换算毫米'"
                @click="toggleMeasure">
          <i class="fa-solid fa-ruler"></i> 测量
        </button>
        <button class="rwb-tool-btn" :class="{ active: zooming }" :disabled="!canZoom"
                :title="canZoom ? '开启后：滚轮缩放（以画面中心为锚点）、按住拖动平移' : '本序列暂无可缩放的影像'"
                @click="toggleZoom">
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
        <div v-if="activeView" class="rwb-canvas" :class="{ 'is-zoom': zooming, 'is-measure': measuring }"
             tabindex="0" :title="canvasTitle"
             @wheel.prevent="onCanvasWheel($event)"
             @keydown.up.prevent="step(activeIndex, -1)"
             @keydown.down.prevent="step(activeIndex, 1)"
             @mousedown="onCanvasDown"
             @mousemove="onCanvasMove"
             @mouseup="onCanvasUp"
             @mouseleave="onCanvasUp"
             @click="onCanvasClick(activeIndex, $event)">
          <!-- 缩放/平移只作用在这一层；四角信息与工具栏不跟着缩 -->
          <div v-if="hasRaw || currentImage" class="rwb-stage" :style="{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }">
            <!-- 真实 DICOM 序列：16-bit 原始像素，窗宽窗位在 canvas 里实时算 -->
            <canvas v-if="hasRaw" ref="canvasEl" class="rwb-pixel"
                    :width="rawMeta.width" :height="rawMeta.height"></canvas>
            <img v-else class="rwb-pixel" :src="currentImage" :alt="activeView.name">

            <!-- 测量标注（有 PixelSpacing 才能出毫米值）；随影像一起缩放 -->
            <svg v-if="hasRaw && measures.length" class="rwb-measure"
                 :viewBox="'0 0 ' + rawMeta.width + ' ' + rawMeta.height">
              <g v-for="(m, i) in measures" :key="i">
                <line :x1="m.x1" :y1="m.y1" :x2="m.x2" :y2="m.y2" />
                <text :x="(m.x1 + m.x2) / 2 + 8" :y="(m.y1 + m.y2) / 2 - 8">{{ m.mm }} mm</text>
              </g>
            </svg>
          </div>
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
            <div>缩放 {{ Math.round(zoom * 100) }}%</div>
          </div>
          <span v-if="!currentImage && !hasRaw" class="rwb-demo-tag">演示占位</span>
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
    const extra = props.sample.modality === 'MR'
      // MR 没有"骨窗/肺窗"这套解剖窗，给窄窗/宽窗两个对比档
      ? [{ name: '窄窗（高对比）', WW: Math.round(own.WW * 0.55), WL: own.WL },
         { name: '宽窗（低对比）', WW: Math.round(own.WW * 1.8), WL: own.WL }]
      : BUILTIN_WINDOWS.filter(w => w.WW !== own.WW || w.WL !== own.WL)
    return [{ name: activeView.value.name || '序列窗', WW: own.WW, WL: own.WL }, ...extra]
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
/** 该序列是否带原始 16-bit 像素（带则走 canvas 真窗宽窗位） */
const hasRaw = computed(() => !!(activeView.value && activeView.value.raw))
/** canvas 尺寸用当前序列的原始像素尺寸 */
const rawMeta = computed(() => {
  const r = (activeView.value && activeView.value.raw) || {}
  return { width: r.width || 512, height: r.height || 512 }
})
/** 有像素间距才能把像素长度换算成毫米 */
const canMeasure = computed(() => {
  const r = (activeView.value && activeView.value.raw) || null
  return !!(r && r.pixelSpacing && r.pixelSpacing[0])
})

const canvasEl = ref(null)
const measuring = ref(false)
const measures = ref([])
const dragFrom = ref(null)
/** 原始像素缓存：`key:slice` → Int16Array */
const rawCache = new Map()
/** 已解出来的当前帧像素（供测量换算用，避免重复拉） */
let currentPixels = null

function rawUrlOf(vi) {
  const v = views.value[vi]
  const r = v && v.raw
  if (!r) return ''
  return r.pattern.replace('%03d', String(layerOf(vi)).padStart(3, '0'))
}

/** 取一帧原始像素：先查缓存，否则下载 .bin.gz 并解压 */
async function fetchPixels(vi) {
  const v = views.value[vi]
  if (!v || !v.raw) return null
  const ck = `${v.key}:${layerOf(vi)}`
  if (rawCache.has(ck)) return rawCache.get(ck)
  const resp = await fetch(rawUrlOf(vi))
  if (!resp.ok) return null
  let buf
  if (typeof DecompressionStream === 'function') {
    buf = await new Response(resp.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer()
  } else {
    buf = await resp.arrayBuffer()   // 兜底：万一服务端已解压
  }
  const px = new Int16Array(buf)
  rawCache.set(ck, px)
  return px
}

/** 按当前窗宽窗位把 16-bit 像素画到 canvas */
function drawCanvas(px) {
  const el = canvasEl.value
  if (!el || !px) return
  const { width: w, height: h } = rawMeta.value
  if (px.length < w * h) return
  const ww = Number(currentWindow.value.WW) || 1
  const wl = Number(currentWindow.value.WL) || 0
  const lo = wl - ww / 2
  const ctx = el.getContext('2d')
  const imgData = ctx.createImageData(w, h)
  const d = imgData.data
  for (let i = 0, p = 0; i < w * h; i++, p += 4) {
    let t = (px[i] - lo) / ww
    t = t < 0 ? 0 : t > 1 ? 1 : t
    const g = (t * 255) | 0
    d[p] = g; d[p + 1] = g; d[p + 2] = g; d[p + 3] = 255
  }
  ctx.putImageData(imgData, 0, 0)
  currentPixels = px
}

async function refreshRaw() {
  if (!hasRaw.value) { currentPixels = null; return }
  const px = await fetchPixels(activeIndex.value)
  if (px) drawCanvas(px)
}

/** 测量：按住拖动 → 记录起止点与毫米长度（像素间距按行/列分别换算） */
function canvasPoint(e) {
  const el = canvasEl.value
  if (!el) return null
  const r = el.getBoundingClientRect()
  return {
    x: (e.clientX - r.left) / r.width * rawMeta.value.width,
    y: (e.clientY - r.top) / r.height * rawMeta.value.height
  }
}
function mmOf(a, b) {
  const ps = activeView.value.raw.pixelSpacing || [1, 1]
  const dx = (b.x - a.x) * ps[1]
  const dy = (b.y - a.y) * ps[0]
  return Math.round(Math.sqrt(dx * dx + dy * dy) * 10) / 10
}
function measureStart(e) {
  if (!measuring.value || !canMeasure.value) return
  const p = canvasPoint(e)
  if (p) dragFrom.value = p
}
function measureMove(e) {
  if (!measuring.value || !dragFrom.value) return
  const p = canvasPoint(e)
  if (!p) return
  measures.value = [{ ...dragFrom.value, x2: p.x, y2: p.y, mm: mmOf(dragFrom.value, p) }]
}
function measureEnd() {
  if (dragFrom.value && measures.value.length) {
    // 保留最后一条测量结果，但清掉拖动中的临时态
    const last = measures.value[measures.value.length - 1]
    if (last.mm > 0.1) measures.value = [last]
  }
  dragFrom.value = null
}

function resetView() {
  Object.keys(windowOverride).forEach(k => delete windowOverride[k])
  layer[activeView.value && activeView.value.key] = 1
  measures.value = []
  resetZoom()
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

/** 点画布左半 = 上一张、右半 = 下一张（没有滚轮时的等价操作）；
 *  缩放/测量模式下不翻层，拖动过也不算点击 */
function onCanvasClick(vi, e) {
  if (zooming.value || measuring.value || dragMoved.value) { dragMoved.value = false; return }
  const rect = e.currentTarget.getBoundingClientRect()
  step(vi, e.clientX - rect.left < rect.width / 2 ? -1 : 1)
}

/* ══ 缩放 / 平移 ══ */
const zoom = ref(1)
const pan = reactive({ x: 0, y: 0 })
const zooming = ref(false)
const panFrom = ref(null)
/** 拖动过就不算"点击"，避免平移完顺手翻了一层 */
const dragMoved = ref(false)
const canZoom = computed(() => !!(hasRaw.value || currentImage.value))

const canvasTitle = computed(() => {
  if (zooming.value) return '滚轮缩放（以画面中心为锚点）· 按住拖动平移'
  if (measuring.value) return '按住拖动即可量长度'
  return frameCount.value > 1 ? '滚轮翻层面 / ↑↓ 键；点左半屏上一张、右半屏下一张' : '单帧图像'
})

const clampZoom = z => Math.min(8, Math.max(0.25, Math.round(z * 100) / 100))
function resetZoom() { zoom.value = 1; pan.x = 0; pan.y = 0 }

/** 测量与缩放是互斥工具（一次只用一种鼠标行为） */
function toggleZoom() {
  zooming.value = !zooming.value
  resetZoom()
  if (zooming.value) { measuring.value = false; measures.value = [] }
}
function toggleMeasure() {
  measuring.value = !measuring.value
  if (measuring.value) { zooming.value = false; resetZoom() }
}

/** 滚轮：缩放模式下缩放，否则翻层 */
function onCanvasWheel(e) {
  if (zooming.value) {
    const next = clampZoom(zoom.value * (e.deltaY < 0 ? 1.12 : 1 / 1.12))
    const k = next / zoom.value
    pan.x *= k; pan.y *= k   // 以画面中心为锚点：中心不动
    zoom.value = next
    return
  }
  onWheel(activeIndex.value, e)
}

function onCanvasDown(e) {
  dragMoved.value = false
  if (measuring.value) { measureStart(e); return }
  if (zooming.value) panFrom.value = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y }
}
function onCanvasMove(e) {
  if (panFrom.value) {
    const dx = e.clientX - panFrom.value.x
    const dy = e.clientY - panFrom.value.y
    if (Math.abs(dx) + Math.abs(dy) > 3) dragMoved.value = true
    pan.x = panFrom.value.px + dx
    pan.y = panFrom.value.py + dy
    return
  }
  if (measuring.value) measureMove(e)
}
function onCanvasUp() {
  panFrom.value = null
  if (measuring.value) measureEnd()
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
  rawCache.clear()
  measures.value = []
  ensureLayers()
})

/**
 * 换序列 / 换层 / 改窗 → 用新窗重画原始像素。
 * ⚠️ 必须放在**所有 ref/reactive 声明之后**：watch 的源数组在 setup 阶段就会求值，
 * 放到前面会踩 `const activeIndex` 的暂时性死区（TDZ），整条序列直接白屏。
 */
watch([activeIndex, () => layer[activeView.value && activeView.value.key], currentWindow], () => {
  measures.value = []
  refreshRaw()
}, { immediate: true, flush: 'post' })
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
  position: relative; flex: 1; min-height: 300px; background: #000; overflow: hidden;
  display: flex; align-items: center; justify-content: center; outline: none; cursor: crosshair;
}
.rwb-canvas.is-zoom { cursor: grab; }
.rwb-canvas.is-zoom:active { cursor: grabbing; }
/* 缩放 / 平移层：以画面中心为锚点，四角信息与工具栏不受影响 */
.rwb-stage { position: relative; transform-origin: center center; will-change: transform; }
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

/* ══ 测量标注 ══ */
.rwb-measure { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
.rwb-measure line { stroke: #22d3ee; stroke-width: 2; vector-effect: non-scaling-stroke; }
.rwb-measure text { fill: #22d3ee; font-size: 16px; font-weight: 700; paint-order: stroke; stroke: #000; stroke-width: 3px; }

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
