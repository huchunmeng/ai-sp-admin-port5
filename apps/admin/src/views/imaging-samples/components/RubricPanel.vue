<template>
  <div class="ss-root">
    <!-- 本卷条件：原「能力位」并入此处（2026-09-20 批注：不单独一个模块） -->
    <div class="is-conds">
      <span class="is-conds-title">本卷条件</span>
      <label v-for="f in CAPABILITY_FIELDS" :key="f.key" class="is-cond" :title="'影响 ' + (f.affects || []).join(' · ')">
        <input type="checkbox" :checked="!!caps[f.key]" @change="setCond(f.key, $event.target.checked)">
        <span>{{ f.label }}</span>
      </label>
      <label class="is-cond is-cond-ro" :title="DERIVED_CAPABILITY.note + '；影响 ' + (DERIVED_CAPABILITY.affects || []).join(' · ')">
        <input type="checkbox" :checked="false" disabled>
        <span>{{ DERIVED_CAPABILITY.label }}</span>
      </label>
    </div>

    <!-- 与病例编辑器的评分表同一套表头 -->
    <div class="ss-header">
      <h3>评分表</h3>
      <div class="ss-header-right">
        <span class="ss-total">共 <strong>{{ resolved.items.length }}</strong> 条</span>
        <button class="btn btn-outline btn-sm" :disabled="extracting || !goldReady" @click="extract">
          <i class="fa-solid" :class="extracting ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'"></i>
          {{ extracting ? '抽取中...' : 'AI 从标准报告抽取' }}
        </button>
        <button class="btn btn-outline btn-sm" :disabled="extracting" @click="resetAll">恢复内置</button>
      </div>
    </div>

    <div v-if="!goldReady" class="empty-state">
      <i class="fa-solid fa-file-circle-exclamation"></i>
      <p>先在「影像序列与标准报告」填完三段，再来抽取评分表</p>
    </div>
    <div v-else-if="!hasRubric" class="empty-state">
      <i class="fa-solid fa-table-list"></i>
      <p>还没有评分表，点右上「AI 从标准报告抽取」生成一版，再逐条校正</p>
    </div>

    <div v-else class="ss-table-wrap">
      <table class="ss-table">
        <thead>
          <tr>
            <th style="width:96px">维度</th>
            <th style="width:200px">条目</th>
            <th style="width:78px">分值</th>
            <th>要点 / 可接受表述</th>
            <th style="width:130px">可评条件</th>
            <th style="width:58px">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in tableRows" :key="row.item.code + '-' + row.p.id">
            <td v-if="row.dimSpan" :rowspan="row.dimSpan" class="td-merged">{{ shortDim(row.dim) }}</td>

            <td v-if="row.itemSpan" :rowspan="row.itemSpan" class="td-merged td-item"
                :title="row.item.code + ' ' + row.item.name + (editableCodes.includes(row.item.code) ? '' : '（按样单元数据自动生成，不可编辑）')">
              <code class="is-code">{{ row.item.code }}</code>
              <div class="td-item-name">{{ row.item.name }}</div>
              <textarea v-if="editableCodes.includes(row.item.code)" class="cell-input cell-textarea is-item-rules"
                        :rows="rowsFor(row.item.rules, 16)" :value="row.item.rules"
                        placeholder="判定说明（可选）"
                        @change="updateRules(row.item.code, $event.target.value)"></textarea>
              <div v-else-if="row.item.rules" class="is-item-rules-ro">{{ row.item.rules }}</div>
            </td>

            <td v-if="row.itemSpan" :rowspan="row.itemSpan" class="td-merged cell-num">
              <span :class="row.item.scoreableFull === row.item.full ? '' : 'text-warning'" style="font-weight:600">
                {{ row.item.scoreableFull }}
              </span>
              <span class="text-secondary"> / {{ row.item.full }}</span>
            </td>

            <td>
              <textarea v-if="editableCodes.includes(row.item.code)" class="cell-input cell-textarea"
                        :rows="rowsFor(row.p.text)" :value="row.p.text"
                        placeholder="要点内容（要可判定）"
                        @input="updatePoint(row.item.code, row.pi, 'text', $event.target.value)"></textarea>
              <span v-else class="cell-ro">{{ row.p.text }}</span>
              <div class="is-accept-row">
                <span class="is-accept-label">可接受表述</span>
                <textarea v-if="editableCodes.includes(row.item.code)" class="cell-input cell-textarea is-accept"
                          :rows="rowsFor(acceptText(row.p), 26)" :value="acceptText(row.p)"
                          placeholder="用 / 分隔，如：右肺上叶尖段 / 右上叶尖段"
                          @change="updatePoint(row.item.code, row.pi, 'accept', $event.target.value)"></textarea>
                <span v-else class="cell-ro">{{ acceptText(row.p) || '—' }}</span>
              </div>
            </td>

            <td>
              <template v-if="editableCodes.includes(row.item.code)">
                <select class="cell-input cell-select" :value="row.p.assess || ''"
                        @change="updatePoint(row.item.code, row.pi, 'assess', $event.target.value)">
                  <option value="">无条件可评</option>
                  <option v-for="a in ASSESS_KINDS" :key="a.key" :value="a.key">{{ a.label }}</option>
                </select>
              </template>
              <span v-else class="badge" :class="row.p.assessable ? 'badge-info' : (row.p.nASource === 'na' ? 'badge-info' : 'badge-warning')"
                    :title="row.p.assessable ? '' : row.p.nAReason">
                {{ row.p.assessable ? (row.p.assessLabel || '可评') : (row.p.nASource === 'na' ? '不适用' : '不可评') }}
              </span>
            </td>

            <td style="white-space:nowrap;text-align:center">
              <template v-if="editableCodes.includes(row.item.code)">
                <button class="btn-add-row" title="在下方添加要点" @click="addPoint(row.item.code)">+</button>
                <button class="btn-del" title="删除该要点" @click="removePoint(row.item.code, row.pi)">
                  <i class="fa-solid fa-trash-can"></i>
                </button>
              </template>
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr class="ss-total-row">
            <td colspan="2" style="text-align:right;font-weight:600;font-size:12px">合计</td>
            <td class="cell-num" style="font-weight:600">100</td>
            <td style="font-size:12px;color:var(--text-secondary)">本卷可评</td>
            <td class="cell-num" style="font-weight:600">{{ resolved.scoreableMax }}</td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { toast } from '@ai-sp/shared'
import {
  resolveRubric,
  RUBRIC as BUILD_IN_RUBRIC,
  CAPABILITY_FIELDS, DERIVED_CAPABILITY,
  ASSESS_KINDS,
  buildRubricExtractionPrompt, parseRubricExtraction
} from '@ai-sp/shared/imaging'
import { useAIChat } from '@/composables/useAIChat'

const props = defineProps({
  /** 完整样本（含 goldStandard / capabilities） */
  sample: { type: Object, required: true },
  /** 评分表 `{ version, updatedAt, updatedBy, items: { [code]: { points, rules } } }` */
  modelValue: { type: Object, default: null }
})
const emit = defineEmits(['update:modelValue', 'update:capabilities'])

const { sendMessage } = useAIChat()
const extracting = ref(false)

const caps = computed(() => props.sample.capabilities || {})

/** 本卷条件（原「能力位」）——勾选即改样本的 capabilities */
function setCond(key, checked) {
  emit('update:capabilities', { ...caps.value, [key]: checked })
}

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

/** 解析后的完整评分表（含逐要点可评性与可评分）
 *  必须把**正在编辑的那份**传进去，否则表格渲染的是模块内置版、改什么都不体现 */
const resolved = computed(() => resolveRubric(props.sample.id, props.sample.capabilities, rubric.value.items))

/**
 * 摊平成表格行：维度用 rowspan 合并在该维度的首行，条目/分值/判定说明合并在该条目的首行。
 * 与病例编辑器 ScoreSheet 的 `类别 / 评分项 / 评分项分值` 合并单元格是同一套做法。
 */
const tableRows = computed(() => {
  const rows = []
  const dimMap = new Map()
  resolved.value.items.forEach(it => {
    if (!dimMap.has(it.dim)) dimMap.set(it.dim, [])
    dimMap.get(it.dim).push(it)
  })
  dimMap.forEach((items, dim) => {
    const dimCount = items.reduce((a, it) => a + it.points.length, 0)
    let firstOfDim = true
    items.forEach(it => {
      it.points.forEach((p, pi) => {
        rows.push({
          dim,
          dimSpan: firstOfDim ? dimCount : 0,
          item: it,
          itemSpan: pi === 0 ? it.points.length : 0,
          p,
          pi
        })
        firstOfDim = false
      })
    })
  })
  return rows
})

/** 维度名去序号前缀：一、一般信息及报告及时性 → 一般信息及报告及时性 */
const shortDim = d => String(d || '').replace(/^[一二三四五六七八九十]+、\s*/, '')

const acceptText = p => (p.accept || []).join(' / ')

/** 文本域行数按内容估算（不用 autoResize：面板在 v-show 下量不到高度，会塌成 0） */
const rowsFor = (t, per = 20) => Math.max(1, Math.min(6, Math.ceil(String(t || '').length / per)))

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
  } else if (field === 'assess') {
    // 空串 = 无条件可评，直接把字段删掉，别在数据里留空值
    if (value) items[code].points[pi].assess = value
    else delete items[code].points[pi].assess
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
  if (!items[code]) items[code] = { rules: '', points: [] }
  const n = items[code].points.length + 1
  items[code].points.push({ id: `p${n}`, text: '', accept: [] })
  emitItems(items)
  toast.show(`已为 ${code} 添加一个要点`, 'success')
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
    const merged = { ...JSON.parse(JSON.stringify(rubric.value.items || {})), ...parsed.items }
    emitItems(merged, { extracted: true })
    toast.show(`已抽取 ${parsed.count} 条评分表，请逐条核对后再发布`, 'success')
  } finally {
    extracting.value = false
  }
}
</script>

<style scoped>
/* ── 以下表格样式与 case-editor/ScoreSheet.vue 保持一致（同源观感） ── */
.ss-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 8px; }
.ss-header h3 { margin: 0; font-size: 16px; }
.ss-header-right { display: flex; align-items: center; gap: 12px; }
.ss-total { font-size: 13px; color: var(--text-secondary); }
.ss-total strong { color: var(--primary); font-size: 17px; }

.ss-table-wrap { overflow-x: auto; border: 1px solid #EBEEF5; border-radius: 8px; }
.ss-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.ss-table th {
  background: #F0F2F5; padding: 10px 8px; text-align: center; font-weight: 600;
  color: #303133; border-bottom: 2px solid #EBEEF5; white-space: nowrap; font-size: 12px;
}
.ss-table td { padding: 4px 6px; border-bottom: 1px solid #F5F7FA; vertical-align: middle; }
.ss-table tbody tr:last-child td { border-bottom: none; }

.td-num { text-align: center; color: #909399; font-size: 12px; }
.td-merged {
  vertical-align: middle; text-align: center; font-size: 13px; color: #303133;
  font-weight: 500; background: #FAFAFA; border-right: 1px solid #EBEEF5;
  max-width: 190px; overflow: hidden;
}
.td-item { text-align: left; padding: 6px 8px; }
.td-item-name { font-size: 12.5px; line-height: 1.5; margin: 4px 0 5px; }
.is-item-rules { font-size: 11.5px; color: #909399; }
.is-item-rules-ro { font-size: 11.5px; color: #909399; line-height: 1.6; padding: 2px 4px; }
/* 「可接受表述」是要点的从属属性，收在要点下面一行，省一列 */
.is-accept-row { display: flex; align-items: flex-start; gap: 6px; margin-top: 2px; }
.is-accept-label { flex-shrink: 0; font-size: 11px; color: #A8ABB2; padding-top: 8px; }
.is-accept { flex: 1; min-width: 0; }
.is-code { background: #fff; border: 1px solid #EBEEF5; padding: 1px 6px; border-radius: 4px; font-size: 11.5px; color: #606266; }

.cell-input {
  width: 100%; border: 1px solid transparent; background: transparent;
  padding: 6px 8px; font-size: 12.5px; color: #303133; border-radius: 4px;
  outline: none; font-family: inherit; box-sizing: border-box;
}
.cell-input:hover { border-color: #D9D9D9; background: #FAFAFA; }
.cell-input:focus { border-color: var(--primary); background: #fff; box-shadow: 0 0 0 2px #E6F7FF; }
.cell-textarea { resize: vertical; line-height: 1.6; }
.cell-select { padding: 5px 6px; }
.cell-num { text-align: center; }
.cell-ro { display: block; font-size: 12.5px; line-height: 1.6; color: #303133; padding: 2px 4px; }

.ss-total-row td { background: #E6F7FF; border-top: 2px solid #EBEEF5; }

.btn-add-row {
  width: 22px; height: 22px; display: inline-flex; align-items: center; justify-content: center;
  border: none; background: transparent; color: #909399; cursor: pointer;
  border-radius: 4px; font-size: 16px; font-weight: 700; transition: all .15s;
}
.btn-add-row:hover { color: #52C41A; background: #F6FFED; }
.btn-del {
  width: 24px; height: 24px; display: inline-flex; align-items: center; justify-content: center;
  border: none; background: transparent; color: #C0C4CC; cursor: pointer;
  border-radius: 4px; font-size: 13px; transition: all .15s;
}
.btn-del:hover { color: #F5222D; background: #FFF1F0; }
.btn-outline { background: #fff; color: var(--text-secondary); border: 1px solid #D9D9D9; }
.btn-outline:hover:not(:disabled) { border-color: var(--primary); color: var(--primary); }
.btn-outline:disabled { opacity: .5; cursor: not-allowed; }
.btn-sm { padding: 4px 10px; font-size: 11.5px; }

.empty-state { text-align: center; padding: 40px 20px; color: var(--text-secondary); }
.empty-state i { font-size: 34px; color: var(--text-placeholder); margin-bottom: 10px; display: block; }
.empty-state p { margin: 0; font-size: 13.5px; }

/* 本卷条件（原「能力位」） */
.is-conds {
  display: flex; align-items: center; flex-wrap: wrap; gap: 10px 22px;
  padding: 12px 16px; margin-bottom: 16px;
  background: #FAFBFC; border: 1px solid var(--border); border-radius: 8px;
}
.is-conds-title { font-size: 13px; font-weight: 600; color: var(--text-main); }
.is-cond { display: flex; align-items: center; gap: 6px; font-size: 12.5px; cursor: pointer; }
.is-cond input { width: 15px; height: 15px; }
.is-cond-ro { cursor: not-allowed; color: #9ca3af; }
</style>
