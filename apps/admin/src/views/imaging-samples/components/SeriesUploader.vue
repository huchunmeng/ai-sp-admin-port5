<template>
  <div>
    <div class="is-series">
      <div v-for="(view, vi) in views" :key="view.key" class="is-series-view">
        <!-- 视图头：名称可改、顺序可调、可删除 —— 视图集合由用户自主掌握 -->
        <div class="is-series-head">
          <input class="input is-view-name" :value="view.name" placeholder="视图名称"
                 @input="rename(vi, $event.target.value)" @blur="normalizeName(vi, $event.target.value)">
          <span class="is-view-en">{{ view.en }}</span>
          <div class="is-view-ops">
            <button class="btn-icon-sm is-view-btn" title="前移" :disabled="vi === 0" @click="move(vi, -1)">
              <i class="fa-solid fa-arrow-left"></i>
            </button>
            <button class="btn-icon-sm is-view-btn" title="后移" :disabled="vi === views.length - 1" @click="move(vi, 1)">
              <i class="fa-solid fa-arrow-right"></i>
            </button>
            <button class="btn-icon-sm is-view-btn is-view-del" title="删除该视图"
                    :disabled="views.length <= 1" @click="remove(vi)">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>
        <div class="is-view-count">{{ framesOf(view.key).length }} / {{ MAX_FRAMES }} 帧</div>

        <div class="is-drop" :class="{ 'is-drop-over': dragOver === view.key }"
             @dragover.prevent="dragOver = view.key"
             @dragleave="dragOver = ''"
             @drop.prevent="onDrop($event, view.key)">
          <template v-if="framesOf(view.key).length">
            <div class="is-strip">
              <div v-for="(f, i) in framesOf(view.key)" :key="f.name + i" class="is-frame"
                   draggable="true"
                   :title="f.name + (f.order != null ? '（原序 ' + f.order + '）' : '')"
                   @dragstart="dragFrom = { view: view.key, index: i }"
                   @dragover.prevent
                   @drop.stop.prevent="onReorder(view.key, i)">
                <img v-if="f.url" :src="f.url" :alt="f.name">
                <i v-else class="fa-solid fa-film"></i>
                <span class="is-frame-no">{{ i + 1 }}</span>
              </div>
            </div>
            <div class="is-series-foot">
              <span class="text-secondary" style="font-size:12px">
                {{ framesOf(view.key).length === 1 ? '单帧（如 DR 平片的体位）' : '拖拽缩略图可微调层面顺序，顺序即层面序号' }}
              </span>
              <button class="btn btn-sm" @click="clear(view.key)">清空</button>
            </div>
          </template>
          <template v-else>
            <i class="fa-solid fa-cloud-arrow-up" style="font-size:22px;color:#c0c4cc"></i>
            <div style="font-size:13px;margin:6px 0">拖入「{{ view.name }}」图片或压缩包</div>
            <div class="flex gap-2">
              <button class="btn btn-sm" @click="pick(view.key)">选择图片</button>
              <button class="btn btn-sm" @click="pickZip(view.key)">选择 zip</button>
              <button class="btn btn-sm" @click="useBuiltin(view.key)">样例序列</button>
            </div>
            <div class="text-secondary" style="font-size:11px;margin-top:8px;text-align:center">jpg / png，单视图 ≤ 300 张、单张 ≤ 5 MB</div>
          </template>
        </div>

        <input :ref="el => setInputRef(view.key, el)" type="file" accept="image/jpeg,image/png,.jpg,.jpeg,.png" multiple style="display:none"
               @change="onPickImages($event, view.key)">
        <input :ref="el => setZipRef(view.key, el)" type="file" accept=".zip,application/zip" style="display:none"
               @change="onPickZip($event, view.key)">
      </div>

      <!-- 添加视图 -->
      <div class="is-add">
        <button class="btn btn-sm" @click="addOpen = !addOpen">
          <i class="fa-solid fa-plus"></i> 添加视图
        </button>
        <span class="text-secondary" style="font-size:11.5px;display:block;margin-top:8px;line-height:1.8">
          有几个序列/方位就建几个，名称可改
        </span>

        <div v-if="addOpen" class="is-add-panel">
          <div class="is-add-row">
            <input class="input" v-model.trim="customName" placeholder="自定义视图名称"
                   style="flex:1" @keyup.enter="addCustom">
            <button class="btn btn-sm btn-primary" :disabled="!customName" @click="addCustom">添加</button>
          </div>
          <div class="is-add-hint">或从常用项选择：</div>
          <div class="is-add-chips">
            <div v-for="c in availableCandidates" :key="c.key" class="is-add-item" @click="addCandidate(c)">
              {{ c.name }}<span class="text-secondary" style="font-size:11px">{{ c.en }}</span>
            </div>
            <div v-if="!availableCandidates.length" class="text-secondary" style="font-size:12px">候选已全部添加</div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="errors.length" class="is-errors">
      <div v-for="(e, i) in errors" :key="i"><i class="fa-solid fa-circle-exclamation"></i> {{ e }}</div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import JSZip from 'jszip'
import { VIEW_CANDIDATES } from '@ai-sp/shared/imaging'

/** 校验上限（PRD §5.12.3）：单视图 ≤ 300 张；单张 ≤ 5 MB；格式仅 jpg/jpeg/png */
const MAX_FRAMES = 300
const MAX_BYTES = 5 * 1024 * 1024
const OK_EXT = /\.(jpe?g|png)$/i

const props = defineProps({
  /** 视图声明 `[{key,name,en}]`——数量、名称、顺序都由用户定 */
  views: { type: Array, required: true },
  /** 帧 `{ [viewKey]: Frame[] }` */
  modelValue: { type: Object, required: true }
})
const emit = defineEmits(['update:views', 'update:modelValue'])

const errors = ref([])
const dragOver = ref('')
const dragFrom = ref(null)
const addOpen = ref(false)
const customName = ref('')
const inputEls = {}
const zipEls = {}

const setInputRef = (key, el) => { if (el) inputEls[key] = el }
const setZipRef = (key, el) => { if (el) zipEls[key] = el }
const framesOf = key => props.modelValue[key] || []

const availableCandidates = computed(() =>
  VIEW_CANDIDATES.filter(c => !props.views.some(v => v.key === c.key))
)

const total = computed(() => props.views.reduce((a, v) => a + framesOf(v.key).length, 0))
defineExpose({ total })

/* ── 视图集合：增 / 删 / 改名 / 排序 ── */

/** 生成不冲突的视图 key：自定义名称走 customN，候选走其固定 key */
function uniqueKey(base) {
  const used = new Set(props.views.map(v => v.key))
  if (base && !used.has(base)) return base
  let n = 1
  while (used.has(`custom${n}`)) n += 1
  return `custom${n}`
}

function setViews(list) {
  emit('update:views', list)
}

function addCandidate(c) {
  errors.value = []
  addOpen.value = false
  setViews([...props.views, { key: uniqueKey(c.key), name: c.name, en: c.en }])
}

function addCustom() {
  const name = customName.value.trim()
  if (!name) return
  errors.value = []
  addOpen.value = false
  customName.value = ''
  setViews([...props.views, { key: uniqueKey(''), name, en: 'CUSTOM' }])
}

function rename(vi, name) {
  const list = props.views.map((v, i) => i === vi ? { ...v, name } : v)
  setViews(list)
}

/** 名称留空则回退为原 key 的展示名，避免出现无名视图 */
function normalizeName(vi, name) {
  if (String(name || '').trim()) return
  const list = props.views.map((v, i) => i === vi ? { ...v, name: v.key, en: v.en } : v)
  setViews(list)
}

function move(vi, delta) {
  const to = vi + delta
  if (to < 0 || to >= props.views.length) return
  const list = props.views.slice()
  const [moved] = list.splice(vi, 1)
  list.splice(to, 0, moved)
  setViews(list)
}

function remove(vi) {
  if (props.views.length <= 1) { errors.value = ['至少要保留一个视图']; return }
  errors.value = []
  const view = props.views[vi]
  const list = props.views.filter((_, i) => i !== vi)
  const frames = { ...props.modelValue }
  delete frames[view.key]
  emit('update:modelValue', frames)
  setViews(list)
}

/* ── 帧：上传 / 解包 / 排序 ── */

function setList(key, arr) {
  emit('update:modelValue', { ...props.modelValue, [key]: arr })
}

/** 文件名自然序：1.jpg < 2.jpg < 10.jpg（PRD §5.12.3） */
function naturalSort(names) {
  return names.slice().sort((a, b) => a.localeCompare(b, 'zh-Hans-CN', { numeric: true, sensitivity: 'base' }))
}

function pick(key) {
  const input = inputEls[key]
  if (input) { input.value = ''; input.click() }
}

function pickZip(key) {
  const input = zipEls[key]
  if (input) { input.value = ''; input.click() }
}

function onPickImages(e, key) {
  const files = [...(e.target.files || [])]
  if (files.length) ingestFiles(files, key)
}

function onPickZip(e, key) {
  const file = e.target.files && e.target.files[0]
  if (file) ingest(file, key)
}

function onDrop(e, key) {
  dragOver.value = ''
  const files = [...(e.dataTransfer.files || [])]
  if (!files.length) return
  // 拖入单个 zip 走解包；拖入多张图片直接进序列
  if (files.length === 1 && /\.zip$/i.test(files[0].name)) ingest(files[0], key)
  else ingestFiles(files, key)
}

/** 校验一组图片并落成序列（不打包也能用） */
function ingestFiles(files, key) {
  errors.value = []
  const name = (props.views.find(v => v.key === key) || {}).name || key
  const images = files.filter(f => OK_EXT.test(f.name))
  const skipped = files.filter(f => !OK_EXT.test(f.name))
  if (!images.length) {
    errors.value.push(`「${name}」没有可用的 jpg / png 图片；本序列未改动`)
    return
  }
  if (images.length > MAX_FRAMES) {
    errors.value.push(`选了 ${images.length} 张，超出单视图上限 ${MAX_FRAMES} 张；本序列未改动`)
    return
  }
  const oversized = []
  const frames = []
  images.forEach(f => {
    if (f.size > MAX_BYTES) { oversized.push(f.name); return }
    frames.push({ name: f.name, size: f.size, url: URL.createObjectURL(f), order: null })
  })
  if (oversized.length) errors.value.push(`超过单张 5 MB 已跳过：${oversized.slice(0, 3).join('、')}${oversized.length > 3 ? ` 等 ${oversized.length} 张` : ''}`)
  if (skipped.length) errors.value.push(`非 jpg / png 已忽略：${skipped.slice(0, 3).map(f => f.name).join('、')}`)
  if (!frames.length) { errors.value.push('没有可用的图片；本序列未改动'); return }
  setList(key, sortFrames(frames))
}

/** 文件名自然序：1.jpg < 2.jpg < 10.jpg */
function sortFrames(frames) {
  const byName = Object.fromEntries(frames.map(f => [f.name, f]))
  return naturalSort(frames.map(f => f.name)).map((n, i) => ({ ...byName[n], order: i + 1 }))
}

/**
 * 解包 → 校验 → 自然序排序。
 * 失败处理：空包 / 无有效图片 / 加密包 / 超限 —— 明确文案 + **保留原序列不动**。
 */
async function ingest(file, key) {
  errors.value = []
  const name = (props.views.find(v => v.key === key) || {}).name || key

  if (!/\.zip$/i.test(file.name)) {
    errors.value.push(`「${file.name}」不是 .zip 压缩包，「${name}」序列未改动`)
    return
  }

  let zip
  try {
    zip = await JSZip.loadAsync(file)
  } catch (err) {
    errors.value.push(/encrypt|password/i.test(String(err && err.message))
      ? '压缩包已加密，无法解包；本序列未改动'
      : '压缩包无法解析（可能已损坏）；本序列未改动')
    return
  }

  const entries = Object.values(zip.files).filter(f => !f.dir)
  const images = entries.filter(f => OK_EXT.test(f.name))
  if (!entries.length) { errors.value.push('压缩包是空包；本序列未改动'); return }
  if (!images.length) { errors.value.push(`压缩包内 ${entries.length} 个文件，无 JPG / PNG 图片；本序列未改动`); return }
  if (images.length > MAX_FRAMES) {
    errors.value.push(`本包 ${images.length} 张，超出单视图上限 ${MAX_FRAMES} 张；本序列未改动`)
    return
  }

  const oversized = []
  const frames = []
  for (const f of images) {
    const blob = await f.async('blob')
    if (blob.size > MAX_BYTES) { oversized.push(`${f.name}（${(blob.size / 1024 / 1024).toFixed(1)} MB）`); continue }
    frames.push({ name: f.name.split('/').pop(), size: blob.size, url: URL.createObjectURL(blob), order: null })
  }
  if (oversized.length) {
    errors.value.push(`以下图片超过单张 5 MB 上限，已跳过：${oversized.slice(0, 3).join('、')}${oversized.length > 3 ? ` 等 ${oversized.length} 张` : ''}`)
  }
  if (!frames.length) { errors.value.push('没有可用的图片；本序列未改动'); return }
  setList(key, sortFrames(frames))
}

/** Q2 未答复时的兜底：绑定系统内置样例序列（PRD §5.12.3「兜底」） */
function useBuiltin(key) {
  errors.value = []
  // 单帧体位（正/侧位）就只给 1 帧，别把 DR 也塞成层面序列
  const single = ['pa', 'lateral'].includes(key)
  const n = single ? 1 : ({ axial: 24, coronal: 16, sagittal: 16 }[key] || 16)
  const frames = Array.from({ length: n }, (_, i) => ({
    name: `${key}_${String(i + 1).padStart(3, '0')}.jpg`, size: 0, url: '', order: i + 1, builtin: true
  }))
  setList(key, frames)
}

function clear(key) {
  errors.value = []
  setList(key, [])
}

/** 拖拽微调：把 index 处的帧移动到 target 位置 */
function onReorder(key, target) {
  const from = dragFrom.value
  dragFrom.value = null
  if (!from || from.view !== key || from.index === target) return
  const arr = framesOf(key).slice()
  const [moved] = arr.splice(from.index, 1)
  arr.splice(target, 0, moved)
  setList(key, arr)
}
</script>

<style scoped>
.is-series { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; align-items: start; }
.is-series-view { border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
.is-series-head {
  display: flex; align-items: center; gap: 6px;
  padding: 7px 10px; background: #FAFBFC; border-bottom: 1px solid var(--border);
}
.is-view-name { flex: 1; min-width: 0; font-size: 13px; font-weight: 600; }
.is-view-en { font-size: 11px; color: var(--text-secondary); flex-shrink: 0; }
.is-view-ops { display: flex; gap: 3px; flex-shrink: 0; }
.is-view-btn { font-size: 10px; }
.is-view-btn.is-view-del:hover:not(:disabled) { border-color: var(--error); color: var(--error); }
.is-view-count { font-size: 11px; color: var(--text-secondary); padding: 5px 12px 0; }
.is-drop {
  min-height: 140px; padding: 10px 14px 14px; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 2px;
  border: 1px dashed transparent; transition: all .15s;
}
.is-drop-over { border-color: var(--primary); background: var(--primary-light); }
.is-strip { display: flex; flex-wrap: wrap; gap: 4px; align-content: flex-start; width: 100%; max-height: 190px; overflow-y: auto; }
.is-frame {
  position: relative; width: 42px; height: 42px; border-radius: 6px; cursor: grab;
  background: repeating-linear-gradient(45deg, #2b2f36, #2b2f36 5px, #31353d, #31353d 10px);
  color: #8b93a1; font-size: 14px;
  display: flex; align-items: center; justify-content: center; overflow: hidden;
}
.is-frame img { width: 100%; height: 100%; object-fit: cover; }
.is-frame-no {
  position: absolute; right: 1px; bottom: 0; font-size: 9px; line-height: 1;
  padding: 1px 3px; border-radius: 3px; background: rgba(0,0,0,.55); color: #fff;
}
.is-series-foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 10px; width: 100%; }
.is-add { border: 1px dashed var(--border); border-radius: 8px; padding: 14px; background: #FAFBFC; }
.is-add-panel { margin-top: 10px; }
.is-add-row { display: flex; gap: 8px; }
.is-add-hint { font-size: 11.5px; color: var(--text-secondary); margin: 10px 0 6px; }
.is-add-chips { display: flex; flex-wrap: wrap; gap: 6px; max-height: 120px; overflow-y: auto; }
.is-add-item {
  font-size: 12px; padding: 4px 10px; border-radius: 6px; cursor: pointer;
  border: 1px solid var(--border); background: #fff; color: var(--text-main);
  display: flex; align-items: baseline; gap: 5px;
}
.is-add-item:hover { border-color: var(--primary); color: var(--primary); }
.is-errors {
  margin-top: 12px; background: #FFF7E6; border: 1px solid #FFE7BA; border-radius: 8px;
  padding: 10px 14px; font-size: 12.5px; color: #D46B08; line-height: 1.9;
}
</style>
