<template>
  <section class="lab-sheet">
    <div class="sheet-head">
      <div class="sheet-title">
        <i class="fa-solid fa-vial"></i> 检验报告单
        <span class="sheet-name">{{ report.reportName }}</span>
      </div>
      <div class="sheet-sub">报告号 {{ report.caseId }} · {{ report.department }} · 本次 {{ report.timeLabel }}</div>
    </div>

    <!-- 字段顺序（11-23 批注）：姓名 → 性别年龄 → 科室 → 主诉 → 采样时间 → 标本类型 → 临床主要信息 -->
    <div class="patient-bar">
      <div class="p-cell"><span class="p-k">姓名</span><span class="p-v">{{ report.patient.name }}</span></div>
      <div class="p-cell"><span class="p-k">性别 / 年龄</span><span class="p-v">{{ report.patient.sex }} / {{ report.patient.age }}</span></div>
      <div class="p-cell"><span class="p-k">科室</span><span class="p-v">{{ report.department }}</span></div>
      <div class="p-cell"><span class="p-k">主诉</span><span class="p-v">{{ report.patient.chiefComplaint }}</span></div>
      <div class="p-cell"><span class="p-k">采样时间</span><span class="p-v">{{ report.timeLabel }}</span></div>
      <div class="p-cell"><span class="p-k">标本类型</span><span class="p-v">{{ report.specimen }}</span></div>
      <div class="p-cell wide" :class="{ expanded: clinicalOpen }">
        <span class="p-k">临床主要信息
          <button v-if="clinicalLong" class="more-btn" type="button" @click="clinicalOpen = !clinicalOpen">{{ clinicalOpen ? '收起' : '展开更多' }}</button>
        </span>
        <span class="p-v">{{ report.patient.clinical }}</span>
      </div>
    </div>

    <!-- ══ 本次报告：只有一列结果（批注4：不在这里做前后对照） ══ -->
    <div class="cur-head">
      <span class="cur-t">本次结果</span>
      <span class="cur-time">{{ report.timeLabel }}{{ report.timeNote ? ' · ' + report.timeNote : '' }}</span>
      <span class="cur-abn">共 {{ report.rows.length }} 项，<b>{{ report.abn }}</b> 项异常</span>
    </div>

    <div class="table-wrap">
      <table class="lab-table">
        <thead>
          <tr>
            <th>项目</th>
            <th class="num">结果</th>
            <th>单位</th>
            <th>参考区间</th>
            <th>提示</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in report.rows" :key="row.name" :class="{ critical: isCritical(row, row.value) }">
            <td class="item-name">{{ row.name }}</td>
            <td class="num" :class="valClass(row, row.value)">{{ row.value }}<span v-if="flagOf(row, row.value)" class="arrow">{{ flagOf(row, row.value) === 'high' ? ' ↑' : ' ↓' }}</span></td>
            <td class="unit">{{ row.unit || '—' }}</td>
            <td class="ref">{{ row.ref }}</td>
            <td class="flag-cell">
              <span v-if="isCritical(row, row.value)" class="badge-critical">危急</span>
              <span v-else-if="isAbnormal(row, row.value)" class="badge-abn">异常</span>
              <span v-else class="badge-ok">—</span>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="report.notDone && report.notDone.length" class="not-done">
        <i class="fa-solid fa-circle-info"></i> 本次未开展：{{ report.notDone.join('、') }}（可在下方既往检验记录中查看上次结果）
      </div>
    </div>

    <!-- ══ 背景信息（批注4、5：既往记录与同期其他检查都只作背景） ══ -->
    <div class="bg-wrap">
      <div class="bg-title">
        <i class="fa-solid fa-folder-open"></i> 背景信息
        <span class="bg-note">供判读参考，不是本次要解读的报告，不要求逐项做前后对照</span>
      </div>

      <BgBlock v-if="report.history"
               :label="'既往检验记录 · ' + report.reportName"
               :time="report.history.timeLabel"
               :note="report.history.timeNote"
               :rows="report.history.rows" />

      <BgBlock v-for="o in report.others" :key="o.panelId"
               :label="'同期其他检查 · ' + o.reportName"
               :time="o.timeLabel"
               :rows="o.rows" />
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
import { flagOf, isCritical, isAbnormal, abnormalRows } from '@ai-sp/shared/lab'
import BgBlock from './LabBgBlock.vue'

const props = defineProps({
  report: { type: Object, required: true }
})

/* 临床信息现在写满背景（现病史/既往史/用药/查体），默认只占一行，点开才铺开（批注2） */
const clinicalOpen = ref(false)
const clinicalLong = computed(() => String(props.report.patient.clinical || '').length > 60)

function valClass(row, value) {
  if (isAbnormal(row, value)) return flagOf(row, value) === 'low' && !row.abn ? 'val-low' : 'val-high'
  return ''
}
</script>

<style scoped>
.lab-sheet { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,.05); overflow: hidden; }
.sheet-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 18px; border-bottom: 1px solid #f3f4f6; }
.sheet-title { font-size: 15px; font-weight: 700; display: flex; align-items: center; gap: 8px; }
.sheet-title i { color: var(--primary, #2563eb); }
.sheet-name { font-size: 13.5px; font-weight: 600; color: #1d4ed8; background: #eff6ff; border-radius: 6px; padding: 2px 9px; }
.sheet-sub { font-size: 12px; color: #9ca3af; }

.patient-bar { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); border-bottom: 1px solid #f3f4f6; background: #fbfdff; }
.p-cell { padding: 10px 14px; border-right: 1px solid #f3f4f6; min-width: 0; }
.p-cell.wide { grid-column: span 4; }
.p-cell.wide.expanded { grid-column: 1 / -1; }
.p-cell.expanded .p-v { white-space: normal; text-overflow: clip; line-height: 1.85; font-weight: 500; }
.more-btn { font-family: inherit; font-size: 11px; color: #2563eb; background: none; border: 0; padding: 0 0 0 6px; cursor: pointer; vertical-align: 1px; }
.more-btn:hover { text-decoration: underline; }
.p-k { display: block; font-size: 11px; color: #9ca3af; margin-bottom: 3px; }
.p-v { display: block; font-size: 12.5px; font-weight: 600; color: #1f2937; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.cur-head { display: flex; align-items: baseline; gap: 10px; padding: 13px 18px 8px; }
.cur-t { font-size: 13px; font-weight: 700; color: #111827; }
.cur-time { font-size: 11.5px; color: #6b7280; }
.cur-abn { margin-left: auto; font-size: 11.5px; color: #6b7280; }
.cur-abn b { color: #c2410c; }

.table-wrap { padding: 0 18px 12px; overflow-x: auto; }
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
.flag-cell { white-space: nowrap; }
.badge-critical { display: inline-block; font-size: 10.5px; font-weight: 700; color: #fff; background: #ef4444; border-radius: 4px; padding: 1px 5px; }
.badge-abn { display: inline-block; font-size: 10.5px; color: #b45309; background: #fef3c7; border-radius: 4px; padding: 1px 5px; }
.badge-ok { color: #d1d5db; }
.not-done { margin-top: 8px; font-size: 11.5px; color: #6b7280; background: #f8fafc; border: 1px dashed #e2e8f0; border-radius: 8px; padding: 7px 10px; }
.not-done i { color: #94a3b8; margin-right: 4px; }

.bg-wrap { margin: 4px 18px 14px; border: 1px solid #eef2f7; background: #fcfdfe; border-radius: 10px; padding: 10px 12px 4px; }
.bg-title { display: flex; align-items: baseline; gap: 8px; font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 8px; }
.bg-title i { color: #94a3b8; }
.bg-note { margin-left: auto; font-size: 11px; font-weight: 400; color: #9ca3af; }

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
  .p-cell.wide.expanded { grid-column: 1 / -1; }
  .bg-note { display: none; }
}
</style>
