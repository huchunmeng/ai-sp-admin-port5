<template>
  <div>
    <div class="flex items-center justify-between mb-4" style="flex-wrap:wrap;gap:12px">
      <div>
        <span class="text-secondary" style="font-size:12.5px">
          共 {{ resolved.items.length }} 条 · <b class="text-primary">本样本可评分 {{ resolved.scoreableMax }} / 100</b>
          · 内容条目 {{ editableCount }} 条可编辑，通用条目按样单元数据自动生成
        </span>
      </div>
      <div class="flex gap-2">
        <button class="btn" :disabled="extracting || !goldReady" @click="extract">
          <i class="fa-solid" :class="extracting ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'"></i>
          {{ extracting ? '抽取中...' : 'AI 从金标准抽取' }}
        </button>
        <button class="btn" :disabled="extracting" @click="resetAll">恢复内置要点集</button>
      </div>
    </div>

    <div v-if="!goldReady" class="is-hint is-hint-warn">
      本样本尚未录入三段金标准，无法抽取要点集，也无法发布。请先在「④ 金标准报告」里补全。
    </div>
    <div v-else-if="!hasRubric" class="is-hint is-hint-warn">
      当前用的是<b>占位要点</b>（每条只有条目名、无法逐点判定）。建议点「AI 从金标准抽取」生成一版要点集后再手工校正。
    </div>
    <div v-else class="is-hint">
      要点集是 LLM 评分的<b>判据</b>：模型按要点命中判分，而不是拿学员报告跟范文比相似度。
      <b>可接受表述域</b>用于避免误伤"写对了但说法不同"的学员。
    </div>

    <div v-for="dim in dims" :key="dim.dim" class="is-dim">
      <div class="section-head">
        <span class="section-head-title">{{ dim.dim }}</span>
        <span class="text-secondary" style="font-size:12px">
          满分 {{ dim.full }} 分 · 可评 {{ dim.scoreableFull }} 分
        </span>
      </div>

      <div v-for="item in dim.items" :key="item.code" class="is-item">
        <div class="is-item-head" @click="toggle(item.code)">
          <i class="fa-solid" :class="open[item.code] ? 'fa-chevron-down' : 'fa-chevron-right'" style="font-size:10px;color:#909399"></i>
          <code class="is-code">{{ item.code }}</code>
          <span class="is-item-name">{{ item.name }}</span>
          <span class="badge" :class="item.scoreableFull === item.full ? 'badge-success' : 'badge-warning'">
            {{ item.scoreableFull }} / {{ item.full }} 分
          </span>
          <span v-if="!editableCodes.includes(item.code)" class="badge badge-info">自动生成</span>
          <span class="text-secondary" style="font-size:11.5px;margin-left:auto">{{ item.points.length }} 个要点</span>
        </div>

        <div v-show="open[item.code]" class="is-item-body">
          <div v-if="item.rules" class="is-rules">判定说明：{{ item.rules }}</div>

          <div v-for="(p, pi) in item.points" :key="p.id" class="is-point" :class="{ 'is-point-na': !p.assessable }">
            <div class="is-point-row">
              <span class="is-point-id">{{ p.id }}</span>
              <template v-if="editableCodes.includes(item.code)">
                <input class="input is-point-text" :value="p.text" placeholder="要点内容（要可判定）"
                       @input="updatePoint(item.code, pi, 'text', $event.target.value)">
              </template>
              <template v-else>
                <span class="is-point-text-ro">{{ p.text }}</span>
              </template>
              <span v-if="!p.assessable" class="badge" :class="p.nASource === 'na' ? 'badge-info' : 'badge-warning'">
                {{ p.nASource === 'na' ? '不适用' : '不可评' }}
              </span>
              <button v-if="editableCodes.includes(item.code)" class="btn btn-sm btn-danger"
                      title="删除该要点" @click="removePoint(item.code, pi)">
                <i class="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div class="is-point-sub">
              <template v-if="editableCodes.includes(item.code)">
                <span class="is-accept-label">可接受表述</span>
                <input class="input is-accept" :value="(p.accept || []).join(' / ')"
                       placeholder="用 / 分隔，如：右肺上叶尖段 / 右上叶尖段"
                       @change="updatePoint(item.code, pi, 'accept', $event.target.value)">
              </template>
              <template v-else-if="p.accept && p.accept.length">
                <span class="is-accept-label">可接受表述</span>
                <span class="is-accept-ro">{{ p.accept.join(' / ') }}</span>
              </template>
              <span v-if="!p.assessable" class="is-na-why">{{ p.nAReason }}</span>
            </div>
          </div>

          <div v-if="editableCodes.includes(item.code)" class="is-item-ops">
            <button class="btn btn-sm" @click="addPoint(item.code)">+ 添加要点</button>
            <input class="input is-rules-input" :value="item.rules" placeholder="判定说明（可选）"
                   @change="updateRules(item.code, $event.target.value)">
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { toast } from '@ai-sp/shared'
import {
  resolveRubric,
  RUBRIC as BUILD_IN_RUBRIC,
  buildRubricExtractionPrompt, parseRubricExtraction
} from '@ai-sp/shared/imaging'
import { useAIChat } from '@/composables/useAIChat'

const props = defineProps({
  /** 完整样本（含 goldStandard / capabilities） */
  sample: { type: Object, required: true },
  /** 要点集 `{ version, updatedAt, updatedBy, items: { [code]: { points, rules } } }` */
  modelValue: { type: Object, default: null }
})
const emit = defineEmits(['update:modelValue'])

const { sendMessage } = useAIChat()
const extracting = ref(false)
const open = reactive({})

/** 内容条目（可编辑）；通用条目由样单元数据自动生成，不给改 */
const CONTENT_CODES = [
  'FIND-01', 'FIND-02', 'FIND-03', 'FIND-04', 'FIND-05', 'FIND-06', 'FIND-07',
  'IMP-01', 'IMP-02', 'IMP-03', 'IMP-04', 'IMP-05', 'IMP-06', 'IMP-07', 'IMP-08'
]

const rubric = computed(() => props.modelValue || { version: 0, items: {} })
const editableCodes = CONTENT_CODES
const editableCount = CONTENT_CODES.length
const hasRubric = computed(() => Object.keys(rubric.value.items || {}).length > 0)
const goldReady = computed(() => {
  const g = props.sample.goldStandard
  return !!(g && g.technique && g.findings && g.impression)
})

/** 解析后的完整评分表（含逐要点可评性与可评分） */
const resolved = computed(() => resolveRubric(props.sample.id, props.sample.capabilities))

const dims = computed(() => {
  const map = new Map()
  resolved.value.items.forEach(i => {
    if (!map.has(i.dim)) map.set(i.dim, { dim: i.dim, full: 0, scoreableFull: 0, items: [] })
    const d = map.get(i.dim)
    d.full += i.full
    d.scoreableFull += i.scoreableFull
    d.items.push(i)
  })
  return [...map.values()].map(d => ({
    ...d,
    full: Math.round(d.full * 10) / 10,
    scoreableFull: Math.round(d.scoreableFull * 10) / 10
  }))
})

function toggle(code) { open[code] = !open[code] }

function emitItems(items, extra) {
  emit('update:modelValue', {
    version: (rubric.value.version || 0) + 1,
    updatedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
    updatedBy: '管理端',
    items,
    ...(extra || {})
  })
}

function updatePoint(code, pi, field, value) {
  const items = JSON.parse(JSON.stringify(rubric.value.items || {}))
  if (!items[code]) return
  if (field === 'accept') {
    items[code].points[pi].accept = String(value || '').split('/').map(s => s.trim()).filter(Boolean)
  } else {
    items[code].points[pi][field] = value
  }
  emitItems(items)
}

function updateRules(code, value) {
  const items = JSON.parse(JSON.stringify(rubric.value.items || {}))
  if (!items[code]) return
  items[code].rules = String(value || '').trim()
  emitItems(items)
}

function addPoint(code) {
  const items = JSON.parse(JSON.stringify(rubric.value.items || {}))
  if (!items[code]) {
    items[code] = { rules: '', points: [] }
  }
  const n = items[code].points.length + 1
  items[code].points.push({ id: `p${n}`, text: '', accept: [] })
  emitItems(items)
}

function removePoint(code, pi) {
  const items = JSON.parse(JSON.stringify(rubric.value.items || {}))
  if (!items[code]) return
  items[code].points.splice(pi, 1)
  emitItems(items)
}

function resetAll() {
  const src = BUILD_IN_RUBRIC[props.sample.id]
  emitItems(src ? JSON.parse(JSON.stringify(src.items)) : {})
  toast.show(src ? '已恢复内置要点集' : '该样本没有内置要点集，已清空', 'success')
}

async function extract() {
  extracting.value = true
  try {
    const prompt = buildRubricExtractionPrompt({ sample: props.sample })
    const res = await sendMessage(prompt.messages, prompt.system, { temperature: 0.2, maxTokens: 3500 })
    if (!res.ok) { toast.show('抽取失败：' + (res.content || '模型不可用'), 'error'); return }
    const parsed = parseRubricExtraction(res.content)
    if (!parsed.ok) { toast.show('抽取失败：' + parsed.reason, 'error'); return }
    // 与既有要点集合并：模型产出的条目覆盖，未产出的保留
    const merged = { ...JSON.parse(JSON.stringify(rubric.value.items || {})), ...parsed.items }
    emitItems(merged, { extracted: true })
    // 默认展开被抽取的条目，便于逐条核对
    Object.keys(parsed.items).forEach(c => { open[c] = true })
    toast.show(`已抽取 ${parsed.count} 条要点集，请逐条核对后再发布`, 'success')
  } finally {
    extracting.value = false
  }
}
</script>

<style scoped>
.is-hint {
  font-size: 12.5px; line-height: 1.85; color: #6b7280;
  background: #F5F7FA; border-radius: 8px; padding: 10px 14px; margin-bottom: 16px;
}
.is-hint-warn { background: #FFF7E6; color: #D46B08; }
.is-dim { margin-bottom: 18px; }
.is-item { border: 1px solid var(--border); border-radius: 8px; margin-bottom: 8px; overflow: hidden; }
.is-item-head {
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  padding: 9px 12px; background: #FAFBFC; cursor: pointer; user-select: none;
}
.is-item-head:hover { background: #F0F7FF; }
.is-item-name { font-size: 13px; font-weight: 600; color: var(--text-main); }
.is-code { background: #F5F7FA; padding: 1px 6px; border-radius: 4px; font-size: 11.5px; color: #606266; }
.is-item-body { padding: 10px 12px 12px; border-top: 1px solid var(--border); }
.is-rules { font-size: 12px; color: #909399; margin-bottom: 8px; }
.is-point { padding: 7px 0; border-bottom: 1px dashed #EBEEF5; }
.is-point:last-child { border-bottom: none; }
.is-point-na { opacity: .72; }
.is-point-row { display: flex; align-items: center; gap: 8px; }
.is-point-id { flex-shrink: 0; width: 26px; font-family: monospace; font-size: 11px; color: #A8ABB2; }
.is-point-text { flex: 1; min-width: 0; }
.is-point-text-ro { flex: 1; min-width: 0; font-size: 12.5px; color: var(--text-main); }
.is-point-sub { display: flex; align-items: center; gap: 8px; margin: 5px 0 0 34px; flex-wrap: wrap; }
.is-accept-label { flex-shrink: 0; font-size: 11.5px; color: #A8ABB2; }
.is-accept { flex: 1; min-width: 220px; font-size: 12px; }
.is-accept-ro { font-size: 11.5px; color: #909399; }
.is-na-why { font-size: 11.5px; color: #D46B08; }
.is-item-ops { display: flex; gap: 8px; margin-top: 10px; align-items: center; }
.is-rules-input { flex: 1; min-width: 200px; font-size: 12px; }
</style>
