<template>
  <div class="ss-root">
    <!-- 与病例编辑器的评分表同一套表头 -->
    <div class="ss-header">
      <h3>评分表</h3>
      <div class="ss-header-right">
        <span class="ss-total">共 <strong>{{ resolved.items.length }}</strong> 条</span>
        <select class="select btn-sm" style="width:190px;height:28px;padding:0 8px;font-size:12px"
                v-model="genTemplate" title="生成前先选模板：评分表按所选模板的维度与条目生成">
          <option value="">选择评分表模板…</option>
          <option v-for="t in TEMPLATE_OPTIONS" :key="t.code" :value="t.code">
            {{ t.name }}（{{ t.version }}）
          </option>
        </select>
        <button class="btn btn-outline btn-sm" :disabled="extracting || !goldReady || !genTemplate" @click="extract"
                :title="genTemplate ? '' : '请先选择评分表模板'">
          <i class="fa-solid" :class="extracting ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'"></i>
          {{ extracting ? '抽取中...' : 'AI 从标准报告抽取' }}
        </button>
        <button class="btn btn-outline btn-sm" :disabled="extracting" @click="resetAll"
                title="丢弃本页的改动，回到题库里存的那一版（样机内是「AI 从标准报告抽取」的初版）">还原初始评分表</button>
      </div>
    </div>

    <div v-if="!goldReady" class="empty-state">
      <i class="fa-solid fa-file-circle-exclamation"></i>
      <p>先在「影像与报告」填完三段标准报告，再来抽取评分表</p>
    </div>
    <div v-else-if="!hasRubric" class="empty-state">
      <i class="fa-solid fa-table-list"></i>
      <p>还没有评分表，点右上「AI 从标准报告抽取」生成一版，再逐条校正</p>
    </div>

    <div v-else class="ss-table-wrap">
      <table class="ss-table">
        <thead>
          <tr>
            <th style="width:92px">维度</th>
            <th style="width:176px">条目</th>
            <th style="width:64px">分值</th>
            <th>评分要点</th>
            <th style="width:78px">要点分值</th>
            <th style="width:300px">评分规则</th>
            <th style="width:58px">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in tableRows" :key="row.item.code + '-' + row.p.id">
            <td v-if="row.dimSpan" :rowspan="row.dimSpan" class="td-merged">{{ shortDim(row.dim) }}</td>

            <td v-if="row.itemSpan" :rowspan="row.itemSpan" class="td-merged td-item"
                :title="row.item.code + ' ' + row.item.name + (editableCodes.includes(row.item.code) ? '' : '（按样单元数据自动生成，不可编辑）')">
              <div class="td-item-name">{{ row.item.name }}</div>
              <textarea v-if="editableCodes.includes(row.item.code)" class="cell-input cell-textarea is-item-rules"
                        :rows="rowsFor(row.item.rules, 16)" :value="row.item.rules"
                        placeholder="整条判定说明（可选）"
                        @change="updateRules(row.item.code, $event.target.value)"></textarea>
              <div v-else-if="row.item.rules" class="is-item-rules-ro">{{ row.item.rules }}</div>
            </td>

            <td v-if="row.itemSpan" :rowspan="row.itemSpan" class="td-merged cell-num">
              <span style="font-weight:600">{{ row.item.full }}</span>
              <div v-if="row.item.full !== row.item.r1Score" class="is-score-warn"
                   :title="'R1 表里这条是 ' + row.item.r1Score + ' 分，要点分值之和对不上'">≠{{ row.item.r1Score }}</div>
            </td>

            <td>
              <textarea v-if="editableCodes.includes(row.item.code)" class="cell-input cell-textarea"
                        :rows="rowsFor(row.p.text)" :value="row.p.text"
                        placeholder="评分要点（要可判定）"
                        @input="updatePoint(row.item.code, row.pi, 'text', $event.target.value)"></textarea>
              <span v-else class="cell-ro">{{ row.p.text }}</span>
            </td>

            <td class="cell-num">
              <input v-if="editableCodes.includes(row.item.code)" class="cell-input cell-num-input" type="number"
                     step="0.5" min="0" :value="row.p.score"
                     @change="updatePoint(row.item.code, row.pi, 'score', Number($event.target.value))">
              <span v-else>{{ row.p.score }}</span>
            </td>

            <td>
              <textarea v-if="editableCodes.includes(row.item.code)" class="cell-input cell-textarea"
                        :rows="rowsFor(row.p.rule, 22)" :value="row.p.rule"
                        placeholder="评分规则"
                        @change="updatePoint(row.item.code, row.pi, 'rule', $event.target.value)"></textarea>
              <span v-else class="cell-ro">{{ row.p.rule || '—' }}</span>
              <div class="is-accept-row">
                <span class="is-accept-label">可接受表述</span>
                <textarea v-if="editableCodes.includes(row.item.code)" class="cell-input cell-textarea is-accept"
                          :rows="rowsFor(acceptText(row.p), 26)" :value="acceptText(row.p)"
                          placeholder="用 / 分隔，如：右肺上叶尖段 / 右上叶尖段"
                          @change="updatePoint(row.item.code, row.pi, 'accept', $event.target.value)"></textarea>
                <span v-else class="cell-ro">{{ acceptText(row.p) || '—' }}</span>
              </div>
              <div v-if="!row.p.assessable" class="is-na-line" :title="row.p.nAReason">
                {{ row.p.nASource === 'na' ? '本题不适用' : '本题条件不足，不评' }}（{{ row.p.nAReason }}）
                <a v-if="editableCodes.includes(row.item.code)" href="#" @click.prevent="setAssessable(row.item.code, row.pi)">改为参评</a>
              </div>
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
            <td colspan="2" style="font-size:12px;color:var(--text-secondary)">本卷可评</td>
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
  TEMPLATE_VERSION,
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

/**
 * 可编辑范围 = 评分表里的**全部条目**（2026-09-20 批注：所有字段都要可以编辑）。
 *
 * 通用条目（GEN-* / TECH-* / LANG-*）原本由样单元数据自动生成、不给改，导致这些行
 * 既没有输入框也没有操作按钮。现在一视同仁：**第一次编辑某条通用条目时，把"当前生成出来的
 * 那一份"固化进 rubric.items**（见 ensureItem），此后由老师完全接管。
 */
const ALL_ITEM_CODES = [
  'GEN-01', 'GEN-02', 'GEN-03', 'GEN-04',
  'TECH-01', 'TECH-02', 'TECH-03',
  'FIND-01', 'FIND-02', 'FIND-03', 'FIND-04', 'FIND-05', 'FIND-06', 'FIND-07',
  'IMP-01', 'IMP-02', 'IMP-03', 'IMP-04', 'IMP-05', 'IMP-06', 'IMP-07', 'IMP-08',
  'LANG-01'
]

/**
 * 可选的评分表模板（2026-09-20 批注：每次生成评分表前先选模板）。
 * 目前只有一套「影像报告评分表模板」；将来按专业/模态族扩多套时，这里列出来即可。
 */
const TEMPLATE_OPTIONS = [
  { code: 'IMAGING', name: '影像报告评分表模板', version: TEMPLATE_VERSION }
]
/** 本次生成用哪个模板；**默认空 = 未选择**，抽取按钮保持禁用（强制先选） */
const genTemplate = ref('')

const rubric = computed(() => props.modelValue || { version: 0, items: {} })
const editableCodes = computed(() => {
  const codes = resolved.value.items.map(i => i.code)
  return codes.length ? codes : ALL_ITEM_CODES
})
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

/**
 * 确保 items[code] 存在。通用条目第一次被编辑时，把**当前解析出来的那份**（要点文本 /
 * 可接受表述 / 判定规则 / 可评条件）固化进 rubric.items —— 否则 updatePoint 里的
 * `if (!items[code]) return` 会让编辑静默失效。
 * 要点分值只在老师显式设过时才固化，没设过就继续走"按 R1 满分均分"的默认值。
 */
function ensureItem(items, code) {
  if (items[code]) return items[code]
  const it = resolved.value.items.find(i => i.code === code)
  items[code] = {
    rules: (it && it.rules) || '',
    points: ((it && it.points) || []).map(p => ({
      id: p.id,
      text: p.text,
      ...(p.accept && p.accept.length ? { accept: p.accept } : {}),
      ...(p.rule ? { rule: p.rule } : {}),
      ...(p.scoreDeclared ? { score: p.score } : {}),
      ...(p.assess ? { assess: p.assess } : {})
    }))
  }
  return items[code]
}

function updatePoint(code, pi, field, value) {
  const items = JSON.parse(JSON.stringify(rubric.value.items || {}))
  ensureItem(items, code)
  if (field === 'accept') {
    items[code].points[pi].accept = String(value || '').split('/').map(s => s.trim()).filter(Boolean)
  } else if (field === 'assess') {
    // 显式写值（含空串）：「空串」= 明确无条件可评，要与「没声明」区分开，
    // 否则会被兜底推断又拉回不可评，「改为参评」就失效了
    items[code].points[pi].assess = value
  } else {
    items[code].points[pi][field] = value
  }
  emitItems(items)
}

/** 「改为参评」：显式写空串，覆盖兜底推断 */
function setAssessable(code, pi) {
  updatePoint(code, pi, 'assess', '')
}

function updateRules(code, value) {
  const items = JSON.parse(JSON.stringify(rubric.value.items || {}))
  ensureItem(items, code)
  items[code].rules = String(value || '').trim()
  emitItems(items)
}

function addPoint(code) {
  const items = JSON.parse(JSON.stringify(rubric.value.items || {}))
  ensureItem(items, code)
  const n = items[code].points.length + 1
  items[code].points.push({ id: `p${n}`, text: '', accept: [] })
  emitItems(items)
  toast.show(`已为 ${code} 添加一个要点`, 'success')
}

function removePoint(code, pi) {
  const items = JSON.parse(JSON.stringify(rubric.value.items || {}))
  ensureItem(items, code)
  items[code].points.splice(pi, 1)
  emitItems(items)
}

function resetAll() {
  const src = BUILD_IN_RUBRIC[props.sample.id]
  emitItems(src ? JSON.parse(JSON.stringify(src.items)) : {})
  toast.show(src ? '已恢复内置评分表' : '该样本没有内置评分表，已清空', 'success')
}

async function extract() {
  if (!genTemplate.value) { toast.show('请先选择评分表模板', 'warning'); return }
  extracting.value = true
  try {
    const prompt = buildRubricExtractionPrompt({ sample: props.sample })
    const res = await sendMessage(prompt.messages, prompt.system, { temperature: 0.2, maxTokens: 3500 })
    if (!res.ok) { toast.show('抽取失败：' + (res.content || '模型不可用'), 'error'); return }
    const parsed = parseRubricExtraction(res.content)
    if (!parsed.ok) { toast.show('抽取失败：' + parsed.reason, 'error'); return }
    const merged = { ...JSON.parse(JSON.stringify(rubric.value.items || {})), ...parsed.items }
    emitItems(merged, { extracted: true, templateCode: genTemplate.value, templateVersion: TEMPLATE_VERSION })
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

.cell-num-input { width: 56px; text-align: center; }
.is-score-warn { font-size: 10.5px; color: #D46B08; }
/* 该要点本题不评：一行说明 + 「改为参评」 */
.is-na-line { font-size: 11px; color: #D46B08; line-height: 1.6; margin-top: 3px; }
.is-na-line a { color: var(--primary); text-decoration: none; margin-left: 4px; }
.is-na-line a:hover { text-decoration: underline; }
</style>
