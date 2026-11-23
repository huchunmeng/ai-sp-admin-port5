<template>
  <div class="bg-block">
    <div class="bg-row">
      <button class="bg-toggle" type="button" @click="open = !open">
        <i class="fa-solid" :class="open ? 'fa-chevron-down' : 'fa-chevron-right'"></i>
        <span class="bg-label">{{ label }}</span>
        <span v-if="time" class="bg-time">{{ time }}{{ note ? ' · ' + note : '' }}</span>
      </button>
      <span class="bg-sum">共 {{ rows.length }} 项 · <b>{{ abn.length }}</b> 项异常</span>
    </div>

    <!-- 折叠态也先把异常项亮出来：背景信息要看得见，但不跟本次报告抢版面 -->
    <div v-if="!open && abn.length" class="bg-chips">
      <span v-for="r in abnVisible" :key="r.name" class="bg-chip" :class="chipCls(r)">
        {{ shortName(r.name) }} {{ r.value }}{{ flagOf(r, r.value) === 'low' ? '↓' : '↑' }}
      </span>
      <span v-if="abn.length > abnVisible.length" class="bg-chip more">另有 {{ abn.length - abnVisible.length }} 项</span>
    </div>
    <div v-else-if="!open" class="bg-chips empty">本次各项均在参考区间内（无异常项）</div>

    <div v-if="open" class="bg-table">
      <table class="lab-table">
        <thead>
          <tr>
            <th>项目</th>
            <th class="num">结果</th>
            <th>单位</th>
            <th>参考区间</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="r.name" :class="{ critical: isCritical(r, r.value) }">
            <td class="item-name">{{ r.name }}</td>
            <td class="num" :class="valClass(r)">{{ r.value }}<span v-if="flagOf(r, r.value)" class="arrow">{{ flagOf(r, r.value) === 'high' ? ' ↑' : ' ↓' }}</span></td>
            <td class="unit">{{ r.unit || '—' }}</td>
            <td class="ref">{{ r.ref }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { flagOf, isCritical, isAbnormal, abnormalRows } from '@ai-sp/shared/lab'

const props = defineProps({
  label: { type: String, required: true },
  time: { type: String, default: '' },
  note: { type: String, default: '' },
  rows: { type: Array, default: () => [] }
})

const open = ref(false)
const abn = computed(() => abnormalRows(props.rows))
const abnVisible = computed(() => abn.value.slice(0, 8))

/* 「平均红细胞体积 MCV」这类长名，摘要行里只留英文符号，一屏能多放几项 */
function shortName(name) {
  const parts = String(name).split(/\s+/)
  return parts.length > 1 ? parts[parts.length - 1] : name
}
function chipCls(r) {
  return flagOf(r, r.value) === 'low' && !r.abn ? 'is-low' : 'is-high'
}
function valClass(r) {
  if (!isAbnormal(r, r.value)) return ''
  return flagOf(r, r.value) === 'low' && !r.abn ? 'val-low' : 'val-high'
}
</script>

<style scoped>
.bg-block { border-top: 1px solid #eef2f7; padding: 8px 0; }
.bg-block:first-of-type { border-top: 0; }
.bg-row { display: flex; align-items: center; gap: 10px; }
.bg-toggle { display: inline-flex; align-items: baseline; gap: 7px; border: 0; background: none; padding: 0; cursor: pointer; font-family: inherit; text-align: left; }
.bg-toggle i { font-size: 10px; color: #94a3b8; width: 12px; }
.bg-label { font-size: 12px; font-weight: 600; color: #334155; }
.bg-time { font-size: 11px; color: #9ca3af; }
.bg-toggle:hover .bg-label { color: #1d4ed8; }
.bg-sum { margin-left: auto; font-size: 11px; color: #9ca3af; white-space: nowrap; }
.bg-sum b { color: #b45309; }

.bg-chips { display: flex; flex-wrap: wrap; gap: 5px; margin: 7px 0 2px 19px; }
.bg-chip { font-size: 11px; font-family: 'Consolas', monospace; border-radius: 5px; padding: 1px 6px; background: #f3f4f6; color: #6b7280; }
.bg-chip.is-high { background: #fff7ed; color: #c2410c; }
.bg-chip.is-low { background: #eff6ff; color: #1d4ed8; }
.bg-chip.more { background: #f3f4f6; color: #9ca3af; }
.bg-chips.empty { color: #9ca3af; font-size: 11px; }

.bg-table { margin: 8px 0 4px 19px; max-width: 720px; }
.lab-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.lab-table th { text-align: left; font-size: 11px; color: #6b7280; font-weight: 600; padding: 7px 8px; border-bottom: 1px solid #e5e7eb; background: #f8fafc; }
.lab-table th.num, .lab-table td.num { text-align: right; font-family: 'Consolas', monospace; }
.lab-table td { padding: 5px 8px; border-bottom: 1px solid #f3f4f6; color: #4b5563; }
.lab-table tr.critical { background: #fef2f2; }
.item-name { font-weight: 500; }
.unit, .ref { color: #9ca3af; font-size: 11px; }
.val-high { color: #c2410c; font-weight: 700; }
.val-low { color: #1d4ed8; font-weight: 700; }
.arrow { font-size: 11px; }
</style>
