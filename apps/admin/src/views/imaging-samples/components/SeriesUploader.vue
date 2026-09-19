<template>
  <div class="is-series">
    <div v-for="v in VIEW_KEYS" :key="v.key" class="is-series-view">
      <div class="is-series-head">
        <span class="is-series-name">{{ v.zh }} <span class="text-secondary">{{ v.en }}</span></span>
        <span class="text-secondary" style="font-size:12px">
          {{ list(v.key).length }} / {{ MAX_FRAMES }} 帧
        </span>
      </div>

      <div class="is-drop" :class="{ 'is-drop-over': dragOver === v.key }"
           @dragover.prevent="dragOver = v.key"
           @dragleave="dragOver = ''"
           @drop.prevent="onDrop($event, v.key)">
        <template v-if="list(v.key).length">
          <div class="is-strip">
            <div v-for="(f, i) in list(v.key)" :key="f.name + i" class="is-frame"
                 draggable="true"
                 :title="f.name + (f.order != null ? '（原序 ' + f.order + '）' : '')"
                 @dragstart="dragFrom = { view: v.key, index: i }"
                 @dragover.prevent
                 @drop.stop.prevent="onReorder(v.key, i)">
              <img v-if="f.url" :src="f.url" :alt="f.name">
              <i v-else class="fa-solid fa-film"></i>
              <span class="is-frame-no">{{ i + 1 }}</span>
            </div>
          </div>
          <div class="is-series-foot">
            <span class="text-secondary" style="font-size:12px">拖拽缩略图可微调层面顺序，顺序即层面序号</span>
            <button class="btn btn-sm" @click="clear(v.key)">清空</button>
          </div>
        </template>
        <template v-else>
          <i class="fa-solid fa-cloud-arrow-up" style="font-size:22px;color:#c0c4cc"></i>
          <div style="font-size:13px;margin:6px 0">拖入 {{ v.zh }} 压缩包，或</div>
          <div class="flex gap-2">
            <button class="btn btn-sm" @click="pick(v.key)">选择 zip 文件</button>
            <button class="btn btn-sm" @click="useBuiltin(v.key)">使用内置样例序列</button>
          </div>
          <div class="text-secondary" style="font-size:11px;margin-top:8px;text-align:center">
            仅收 JPG / PNG 图片序列（老师先从 PACS 导出为图片再打包），本期不解析 DICOM
          </div>
        </template>
      </div>

      <input :ref="el => setInputRef(v.key, el)" type="file" accept=".zip,application/zip" style="display:none"
             @change="onPick($event, v.key)">
    </div>

    <div v-if="errors.length" class="is-errors">
      <div v-for="(e, i) in errors" :key="i"><i class="fa-solid fa-circle-exclamation"></i> {{ e }}</div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import JSZip from 'jszip'
import { VIEW_KEYS } from '@ai-sp/shared/imaging'

/** 校验上限（PRD §5.12.3）：单视图 ≤ 300 张；单张 ≤ 5 MB；格式仅 jpg/jpeg/png */
const MAX_FRAMES = 300
const MAX_BYTES = 5 * 1024 * 1024
const OK_EXT = /\.(jpe?g|png)$/i

const props = defineProps({
  /** { axial: Frame[], coronal: Frame[], sagittal: Frame[] }，Frame = { name, size, url? } */
  modelValue: { type: Object, required: true }
})
const emit = defineEmits(['update:modelValue'])

const errors = ref([])
const dragOver = ref('')
const dragFrom = ref(null)
const inputEls = {}

const setInputRef = (key, el) => { if (el) inputEls[key] = el }

const list = key => props.modelValue[key] || []

const total = computed(() => VIEW_KEYS.reduce((a, v) => a + list(v.key).length, 0))
defineExpose({ total })

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

function onPick(e, key) {
  const file = e.target.files && e.target.files[0]
  if (file) ingest(file, key)
}

function onDrop(e, key) {
  dragOver.value = ''
  const file = e.dataTransfer.files && e.dataTransfer.files[0]
  if (file) ingest(file, key)
}

/**
 * 解包 → 校验 → 自然序排序。
 * 失败处理：空包 / 无有效图片 / 加密包 / 超限 —— 明确文案 + **保留原序列不动**。
 */
async function ingest(file, key) {
  errors.value = []
  const before = list(key).slice()

  if (!/\.zip$/i.test(file.name)) {
    errors.value.push(`「${file.name}」不是 .zip 压缩包，${VIEW_KEYS.find(v => v.key === key).zh}序列未改动`)
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

  const byName = Object.fromEntries(frames.map(f => [f.name, f]))
  const sorted = naturalSort(frames.map(f => f.name)).map((n, i) => ({ ...byName[n], order: i + 1 }))
  // 超限只警告不阻断（上面的 oversized 已剔除）；长度校验兜底
  setList(key, sorted)
  if (before.length) errors.value.push('已用新压缩包覆盖原序列（原序列已替换，保存后生效）')
}

/** Q2 未答复时的兜底：直接绑定系统内置样例序列（PRD §5.12.3「兜底」） */
function useBuiltin(key) {
  errors.value = []
  const n = { axial: 24, coronal: 16, sagittal: 16 }[key] || 16
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
  const arr = list(key).slice()
  const [moved] = arr.splice(from.index, 1)
  arr.splice(target, 0, moved)
  setList(key, arr)
}
</script>

<style scoped>
.is-series { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.is-series-view { border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
.is-series-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 12px; background: #FAFBFC; border-bottom: 1px solid var(--border);
}
.is-series-name { font-size: 13px; font-weight: 600; }
.is-series-name .text-secondary { font-size: 11px; font-weight: 400; margin-left: 4px; }
.is-drop {
  min-height: 168px; padding: 14px; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 2px;
  border: 1px dashed transparent; transition: all .15s;
}
.is-drop-over { border-color: var(--primary); background: var(--primary-light); }
.is-strip { display: flex; flex-wrap: wrap; gap: 4px; align-content: flex-start; width: 100%; max-height: 200px; overflow-y: auto; }
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
.is-errors {
  grid-column: 1 / -1; background: #FFF7E6; border: 1px solid #FFE7BA; border-radius: 8px;
  padding: 10px 14px; font-size: 12.5px; color: #D46B08; line-height: 1.9;
}
</style>
