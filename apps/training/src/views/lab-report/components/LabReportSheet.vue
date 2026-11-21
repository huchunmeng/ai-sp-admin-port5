<template>
  <section class="lab-sheet">
    <div class="sheet-head">
      <div class="sheet-title"><i class="fa-solid fa-vial"></i> 检验报告单</div>
      <div class="sheet-sub">报告号 {{ caseItem.id }} · {{ caseItem.department }}</div>
    </div>

    <div class="patient-bar">
      <div class="p-cell"><span class="p-k">姓名</span><span class="p-v">{{ caseItem.patient.name }}</span></div>
      <div class="p-cell"><span class="p-k">性别 / 年龄</span><span class="p-v">{{ caseItem.patient.sex }} / {{ caseItem.patient.age }}</span></div>
      <div class="p-cell"><span class="p-k">科室</span><span class="p-v">{{ caseItem.department }}</span></div>
      <div class="p-cell"><span class="p-k">标本类型</span><span class="p-v">{{ caseItem.specimen }}</span></div>
      <div class="p-cell"><span class="p-k">主诉</span><span class="p-v">{{ caseItem.patient.chiefComplaint }}</span></div>
      <div class="p-cell wide"><span class="p-k">临床主要信息</span><span class="p-v">{{ caseItem.patient.clinical }}</span></div>
      <div class="p-cell"><span class="p-k">采样时间</span><span class="p-v">{{ caseItem.times.join(' / ') }}</span></div>
    </div>

    <div class="hl-row">
      <div v-for="h in caseItem.highlights" :key="h.name" class="hl" :class="{ abn: h.abn }">
        <div class="hl-name">{{ h.name }}</div>
        <div class="hl-val">{{ h.value }}<span v-if="h.abn" class="hl-arrow">!</span></div>
        <div class="hl-ref">参考 {{ h.ref }} {{ h.unit }}<template v-if="h.critical"> · 危急</template></div>
      </div>
    </div>

    <div class="tabs">
      <button v-for="p in caseItem.panels" :key="p.id" class="tab" :class="{ active: p.id === currentTab }" @click="currentTab = p.id">
        {{ p.name }}<span class="tab-cnt">{{ abnCount(p) }} 项异常</span>
      </button>
    </div>

    <div class="table-wrap">
      <table class="lab-table">
        <thead>
          <tr>
            <th>项目</th>
            <th class="num">{{ caseItem.times[0] }}</th>
            <th class="num">{{ caseItem.times[1] || '—' }}</th>
            <th>单位</th>
            <th>参考区间</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in activePanel.rows" :key="row.name" :class="{ critical: isCritical(row, row.first) || isCritical(row, row.second) }">
            <td class="item-name">{{ row.name }}</td>
            <td class="num" :class="valClass(row, row.first)">{{ row.first || '—' }}<span v-if="flagOf(row, row.first)" class="arrow">{{ flagOf(row, row.first) === 'high' ? ' ↑' : ' ↓' }}</span><span v-if="isCritical(row, row.first)" class="badge-critical">危急</span></td>
            <td class="num" :class="valClass(row, row.second)">{{ row.second || '—' }}<span v-if="flagOf(row, row.second)" class="arrow">{{ flagOf(row, row.second) === 'high' ? ' ↑' : ' ↓' }}</span><span v-if="isCritical(row, row.second)" class="badge-critical">危急</span></td>
            <td class="unit">{{ row.unit || '—' }}</td>
            <td class="ref">{{ row.ref }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="sheet-foot">
      <span class="legend"><i class="dot high"></i>高于参考区间</span>
      <span class="legend"><i class="dot low"></i>低于参考区间</span>
      <span class="legend"><i class="dot crit"></i>危急值</span>
      <span class="foot-note">检验结果仅作教学训练使用，不用于临床决策。</span>
    </div>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  caseItem: { type: Object, required: true }
})

const currentTab = ref(props.caseItem.panels[0].id)
const activePanel = computed(() => props.caseItem.panels.find(p => p.id === currentTab.value) || props.caseItem.panels[0])

function flagOf(row, val) {
  if (val === '' || val == null) return null
  const n = parseFloat(val)
  if (isNaN(n)) return null
  if (row.hi != null && n > row.hi) return 'high'
  if (row.lo != null && n < row.lo) return 'low'
  return null
}
function isCritical(row, val) {
  if (row.criticalLow == null || val === '' || val == null) return false
  const n = parseFloat(val)
  return !isNaN(n) && n < row.criticalLow
}
function valClass(row, val) {
  if (val === '' || val == null) return ''
  // 定性项目（如尿糖 4+、尿酮体 3+）没有数值区间，由数据里标 abn: true 直接判异常
  if (row.abn) return 'val-high'
  const f = flagOf(row, val)
  return f === 'high' ? 'val-high' : f === 'low' ? 'val-low' : ''
}
function abnCount(panel) {
  return panel.rows.filter(r => {
    const v = r.second !== '' && r.second != null ? r.second : r.first
    return r.abn || flagOf(r, v) != null
  }).length
}
</script>

<style scoped>
.lab-sheet { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,.05); overflow: hidden; }
.sheet-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 18px; border-bottom: 1px solid #f3f4f6; }
.sheet-title { font-size: 15px; font-weight: 700; display: flex; align-items: center; gap: 8px; }
.sheet-title i { color: var(--primary, #2563eb); }
.sheet-sub { font-size: 12px; color: #9ca3af; }

.patient-bar { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); border-bottom: 1px solid #f3f4f6; background: #fbfdff; }
.p-cell { padding: 10px 14px; border-right: 1px solid #f3f4f6; min-width: 0; }
.p-cell.wide { grid-column: span 3; }
.p-k { display: block; font-size: 11px; color: #9ca3af; margin-bottom: 3px; }
.p-v { display: block; font-size: 12.5px; font-weight: 600; color: #1f2937; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.hl-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; padding: 14px 18px 4px; }
.hl { border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px 12px; }
.hl.abn { border-color: #fecaca; background: #fef2f2; }
.hl-name { font-size: 11.5px; color: #6b7280; margin-bottom: 4px; }
.hl-val { font-size: 19px; font-weight: 700; font-family: 'Consolas', monospace; letter-spacing: -.3px; }
.hl.abn .hl-val { color: #c81e1e; }
.hl-arrow { font-size: 13px; margin-left: 3px; }
.hl-ref { font-size: 11px; color: #9ca3af; margin-top: 2px; }

.tabs { display: flex; gap: 4px; padding: 14px 18px 0; border-bottom: 1px solid #f3f4f6; }
.tab { border: 0; background: transparent; padding: 8px 14px 9px; font-size: 13px; color: #6b7280; border-bottom: 2px solid transparent; margin-bottom: -1px; border-radius: 6px 6px 0 0; font-family: inherit; cursor: pointer; }
.tab:hover { background: #f3f4f6; color: #1f2937; }
.tab.active { color: #1d4ed8; border-bottom-color: #2563eb; font-weight: 600; background: #eff6ff; }
.tab-cnt { font-size: 11px; color: #9ca3af; margin-left: 4px; }

.table-wrap { padding: 4px 18px 12px; overflow-x: auto; }
.lab-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.lab-table th { text-align: left; font-size: 11.5px; color: #6b7280; font-weight: 600; padding: 9px 8px; border-bottom: 1px solid #e5e7eb; background: #fafbfc; }
.lab-table th.num, .lab-table td.num { text-align: right; font-family: 'Consolas', monospace; }
.lab-table td { padding: 7px 8px; border-bottom: 1px solid #f3f4f6; }
.lab-table tr:hover { background: #fafcff; }
.lab-table tr.critical { background: #fef2f2; }
.lab-table tr.critical:hover { background: #fde8e8; }
.item-name { font-weight: 500; }
.unit { color: #9ca3af; font-size: 11.5px; }
.ref { color: #9ca3af; font-family: 'Consolas', monospace; font-size: 11.5px; }
.val-high { color: #c2410c; font-weight: 700; }
.val-low { color: #1d4ed8; font-weight: 700; }
.arrow { font-size: 11px; }
.badge-critical { display: inline-block; font-size: 10.5px; font-weight: 700; color: #fff; background: #ef4444; border-radius: 4px; padding: 1px 5px; margin-left: 6px; vertical-align: 1px; }

.sheet-foot { display: flex; flex-wrap: wrap; gap: 16px; padding: 12px 18px; border-top: 1px solid #f3f4f6; font-size: 11.5px; color: #9ca3af; background: #fcfcfd; }
.legend { display: inline-flex; align-items: center; gap: 4px; }
.dot { display: inline-block; width: 10px; height: 10px; border-radius: 2px; }
.dot.high { background: #c2410c; }
.dot.low { background: #1d4ed8; }
.dot.crit { background: #ef4444; }
.foot-note { margin-left: auto; }

@media (max-width: 1100px) {
  .patient-bar { grid-template-columns: repeat(3, 1fr); }
  .p-cell.wide { grid-column: span 3; }
  .hl-row { grid-template-columns: repeat(2, 1fr); }
}
</style>
