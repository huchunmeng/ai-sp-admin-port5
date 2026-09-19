<template>
  <div>
    <!-- 工具条 -->
    <div class="flex items-center justify-between mb-4" style="flex-wrap:wrap;gap:12px">
      <span class="text-secondary" style="font-size:12.5px">
        共 {{ resolved.items.length }} 条
      </span>
      <div class="flex gap-2">
        <button class="btn" :disabled="extracting || !goldReady" @click="extract">
          <i class="fa-solid" :class="extracting ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'"></i>
          {{ extracting ? '抽取中...' : 'AI 从标准报告抽取' }}
        </button>
        <button class="btn" :disabled="extracting" @click="resetAll">恢复内置</button>
      </div>
    </div>

    <div v-if="!goldReady" class="is-empty">
      先在「影像序列与标准报告」填完三段，再来抽取评分表
    </div>
    <div v-else-if="!hasRubric" class="is-empty">
      还没有评分表 —— 点右上「AI 从标准报告抽取」生成一版，再逐条校正
    </div>

    <!-- 每个维度一张标准表格 -->
    <div v-for="dim in dims" :key="dim.dim" class="is-dim">
      <div class="section-head">
        <span class="section-head-title">{{ dim.dim }}</span>
        <span class="text-secondary" style="font-size:12px">
          {{ dim.items.length }} 个条目
        </span>
      </div>

      <div class="card" style="padding:0">
        <div class="table-wrapper">
          <table class="table">
            <thead>
              <tr>
                <th style="width:190px">条目</th>
                <th style="width:78px">分值</th>
                <th>要点</th>
                <th style="width:240px">可接受表述</th>
                <th style="width:64px">操作</th>
              </tr>
            </thead>
            <tbody>
              <template v-for="item in dim.items" :key="item.code">
                <tr v-for="(p, pi) in item.points" :key="item.code + '-' + p.id">
                  <td v-if="pi === 0" :rowspan="item.points.length" class="is-item-cell">
                    <code class="is-code">{{ item.code }}</code>
                    <div class="is-item-name">{{ item.name }}</div>
                    <span v-if="!editableCodes.includes(item.code)" class="badge badge-info">自动生成</span>
                    <span v-else-if="item.wholeNA" class="badge badge-warning">不适用</span>
                  </td>

                  <td v-if="pi === 0" :rowspan="item.points.length">
                    <span class="badge" :class="item.scoreableFull === item.full ? 'badge-success' : 'badge-warning'">
                      {{ item.scoreableFull }} / {{ item.full }}
                    </span>
                  </td>

                  <td>
                    <div class="is-point">
                      <input v-if="editableCodes.includes(item.code)" class="input" :value="p.text"
                             placeholder="要点内容（要可判定）"
                             @input="updatePoint(item.code, pi, 'text', $event.target.value)">
                      <span v-else class="is-point-ro">{{ p.text }}</span>
                      <span v-if="!p.assessable" class="badge" :class="p.nASource === 'na' ? 'badge-info' : 'badge-warning'">
                        {{ p.nASource === 'na' ? '不适用' : '不可评' }}
                      </span>
                    </div>
                  </td>

                  <td>
                    <input v-if="editableCodes.includes(item.code)" class="input" :value="(p.accept || []).join(' / ')"
                           placeholder="用 / 分隔，如：右肺上叶尖段 / 右上叶尖段"
                           @change="updatePoint(item.code, pi, 'accept', $event.target.value)">
                    <span v-else class="is-accept-ro">{{ (p.accept || []).join(' / ') || '—' }}</span>
                  </td>

                  <td>
                    <button v-if="editableCodes.includes(item.code)" class="btn btn-sm btn-danger"
                            title="删除该要点" @click="removePoint(item.code, pi)">
                      <i class="fa-solid fa-xmark"></i>
                    </button>
                  </td>
                </tr>

                <!-- 条目级：判定说明 + 加要点 -->
                <tr v-if="editableCodes.includes(item.code)" :key="item.code + '-ops'" class="is-ops-row">
                  <td colspan="5">
                    <div class="is-ops">
                      <button class="btn btn-sm" @click="addPoint(item.code)">+ 添加要点</button>
                      <input class="input is-rules-input" :value="item.rules"
                             placeholder="判定说明（可选）"
                             @change="updateRules(item.code, $event.target.value)">
                    </div>
                  </td>
                </tr>
                <tr v-else-if="item.rules" :key="item.code + '-rules'" class="is-ops-row">
                  <td colspan="5"><div class="is-rules">{{ item.rules }}</div></td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
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
  /** 评分表 `{ version, updatedAt, updatedBy, items: { [code]: { points, rules } } }` */
  modelValue: { type: Object, default: null }
})
const emit = defineEmits(['update:modelValue'])

const { sendMessage } = useAIChat()
const extracting = ref(false)

/** 内容条目（可编辑）；通用条目由样单元数据自动生成，不给改 */
const CONTENT_CODES = [
  'FIND-01', 'FIND-02', 'FIND-03', 'FIND-04', 'FIND-05', 'FIND-06', 'FIND-07',
  'IMP-01', 'IMP-02', 'IMP-03', 'IMP-04', 'IMP-05', 'IMP-06', 'IMP-07', 'IMP-08'
]

const rubric = computed(() => props.modelValue || { version: 0, items: {} })
const editableCodes = CONTENT_CODES
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
  toast.show(src ? '已恢复内置评分表' : '该样本没有内置评分表，已清空', 'success')
}

async function extract() {
  extracting.value = true
  try {
    const prompt = buildRubricExtractionPrompt({ sample: props.sample })
    const res = await sendMessage(prompt.messages, prompt.system, { temperature: 0.2, maxTokens: 3500 })
    if (!res.ok) { toast.show('抽取失败：' + (res.content || '模型不可用'), 'error'); return }
    const parsed = parseRubricExtraction(res.content)
    if (!parsed.ok) { toast.show('抽取失败：' + parsed.reason, 'error'); return }
    // 与既有评分表合并：模型产出的条目覆盖，未产出的保留
    const merged = { ...JSON.parse(JSON.stringify(rubric.value.items || {})), ...parsed.items }
    emitItems(merged, { extracted: true })
    toast.show(`已抽取 ${parsed.count} 条评分表，请逐条核对后再发布`, 'success')
  } finally {
    extracting.value = false
  }
}
</script>

<style scoped>
.is-empty {
  font-size: 13px; color: #909399; text-align: center;
  background: #FAFAFA; border-radius: 8px; padding: 32px 20px; margin-bottom: 16px;
}
.is-dim { margin-bottom: 18px; }
.is-code { background: #F5F7FA; padding: 1px 6px; border-radius: 4px; font-size: 11.5px; color: #606266; }
.is-item-cell { vertical-align: top; }
.is-item-name { font-size: 13px; font-weight: 600; color: var(--text-main); margin: 4px 0 6px; }
.is-point { display: flex; align-items: center; gap: 8px; }
.is-point .input { flex: 1; min-width: 0; }
.is-point-ro { flex: 1; min-width: 0; font-size: 12.5px; color: var(--text-main); }
.is-accept-ro { font-size: 11.5px; color: #909399; }
.is-ops-row > td { background: #FAFBFC; padding: 8px 12px; }
.is-ops { display: flex; gap: 8px; align-items: center; }
.is-rules-input { flex: 1; min-width: 200px; font-size: 12px; }
.is-rules { font-size: 12px; color: #909399; }
</style>
