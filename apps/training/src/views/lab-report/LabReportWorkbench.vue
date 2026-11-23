<template>
  <div v-if="report" class="labr-page">
    <div class="labr-top">
      <button class="back" type="button" @click="goList"><i class="fa-solid fa-arrow-left"></i> 返回列表</button>
      <div class="title-wrap">
        <h2>{{ report.cardTitle }}</h2>
        <div class="meta">
          <span class="chip">{{ report.reportName }}</span>
          <span class="chip">{{ report.specimen }}</span>
          <span class="chip">本次 {{ report.timeLabel }}</span>
          <span class="chip focus">本次训练只解读这一个报告</span>
        </div>
      </div>
      <span class="level-tag" :class="levelKey">{{ getCaseLevelLabel(report.level) }}</span>
    </div>

    <div class="labr-grid">
      <LabReportSheet :report="report" />

      <aside class="write-col">
        <section class="write-card">
          <div class="write-head">
            <div class="write-title">我的解读 · {{ report.reportName }}</div>
            <!-- 演示数据：打开就有上次成绩，点「查看上次评价」直接出带分数的报告（批注 11-23） -->
            <div v-if="lastRun && lastRun.score != null" class="last-run">
              <span class="lr-score">上次成绩 <b :class="scoreCls(lastRun.score)">{{ lastRun.score }}</b> 分 · {{ gradeLabel(lastRun.score) }}</span>
              <span class="lr-meta">{{ lastRun.attempts }} 次练习 · {{ lastRun.lastAt }}</span>
              <button v-if="lastRun.result" class="link-btn" type="button" @click="showLastRun">查看上次评价</button>
              <span v-if="lastRun.demo" class="lr-tag">演示数据</span>
            </div>
          </div>

          <div class="write-body">
            <div class="task-card">
              <div class="tk">解读任务</div>
              <ul>
                <li>指出本次报告的主要异常及其程度，关注危急值</li>
                <li>说明异常之间的关联与可能的病理生理机制</li>
                <li>给出诊断方向与需要补充的检查/处置</li>
              </ul>
            </div>

            <div class="write-label">
              <span>解读意见</span>
              <span class="count">{{ text.length }} / 1200</span>
            </div>
            <textarea v-model="text" maxlength="1200" class="answer"
                      :placeholder="placeholder"></textarea>

            <div class="hint-row">
              <button class="link-btn" type="button" @click="tipOpen = !tipOpen">{{ tipOpen ? '收起提示' : '训练提示' }}</button>
              <span class="count">训练模式 · 不计时</span>
            </div>
            <div v-if="tipOpen" class="tip-box">
              <div class="tip-t">思考方向（不包含答案）</div>
              <ul>
                <li v-for="(t, i) in (report.tips || [])" :key="i">{{ t }}</li>
              </ul>
            </div>
          </div>

          <div class="write-actions">
            <button class="btn btn-sm" type="button" @click="onReset">清空重写</button>
            <span class="actions-right">
              <button v-if="scoring" class="btn btn-sm" type="button" @click="viewResult = scoring; modalOpen = true">查看评价</button>
              <button class="btn btn-primary btn-sm" type="button" :disabled="!canSubmit || scoringRunning" @click="onSubmit">
                <i v-if="scoringRunning" class="fa-solid fa-circle-notch fa-spin"></i>
                {{ scoringRunning ? 'AI 评价中…' : (scoring ? '重新提交评价' : '提交 AI 评价') }}
              </button>
            </span>
          </div>

          <div class="write-meta">
            <span>已写 <b>{{ text.trim().length }}</b> 字</span>
            <span>·</span>
            <span>至少 30 字，建议 200 字以上</span>
            <span>·</span>
            <span>本场按本报告的 {{ report.gold.points.length }} 个判读点计分</span>
          </div>
        </section>
      </aside>
    </div>

    <LabScoreModal v-if="modalOpen && viewResult" :result="viewResult" :report="report"
                   :submitted-at="submittedAt" @close="modalOpen = false" @revise="modalOpen = false" />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast, getCaseLevelLabel, LEVEL_TO_CASE_LEVEL } from '@ai-sp/shared'
import { getLabReport, labGradeOf } from '@ai-sp/shared/lab'
import { useLabReportSession, lastLabRun } from '@/composables/useLabReportSession'
import LabReportSheet from './components/LabReportSheet.vue'
import LabScoreModal from './components/LabScoreModal.vue'

const route = useRoute()
const router = useRouter()

const report = getLabReport(route.params.caseId, route.params.panelId)
const levelKey = computed(() => (report ? LEVEL_TO_CASE_LEVEL[report.level] || '' : ''))

const { text, scoring, scoringRunning, submittedAt, canSubmit, submit, reset } = useLabReportSession(report || { id: '' })

const tipOpen = ref(false)
const modalOpen = ref(false)
const viewResult = ref(null)
const lastRun = ref(report ? lastLabRun(report) : null)

function gradeLabel(s) { return labGradeOf(s).label }
function scoreCls(s) { return s >= 85 ? 'sc-good' : s >= 60 ? 'sc-mid' : 'sc-bad' }

/* 演示成绩与本机成绩共用同一个报告弹窗，打开时把 submittedAt 换成那次的时间 */
function showLastRun() {
  if (!lastRun.value || !lastRun.value.result) return
  viewResult.value = lastRun.value.result
  submittedAt.value = lastRun.value.lastAt
  modalOpen.value = true
}

/* 示例句按报告给，避免练凝血时抄着一句血常规的思路写 */
const PLACEHOLDER_BY_PANEL = {
  cbc: '示例：本次血常规示白细胞及中性粒细胞显著升高、PCT 明显升高，血红蛋白与血小板……',
  bio: '示例：本次生化中肌酐、转氨酶较参考区间明显升高，白蛋白降低，提示……',
  coag: '示例：本次凝血 PT/APTT 延长、纤维蛋白原降低、D-二聚体升高，需考虑……',
  gas: '示例：本次血气示 pH 降低、HCO₃⁻ 下降、乳酸升高，酸碱失衡类型为……',
  iron: '示例：本次铁代谢中血清铁蛋白降低、总铁结合力升高，饱和度……',
  urine: '示例：本次尿常规尿糖、尿酮体阳性，蛋白……，需结合血糖血酮判断……',
  cardiac: '示例：本次心肌标志物 hs-cTnI 明显升高，CK-MB……，结合心电图考虑……'
}
const placeholder = computed(() => (report && PLACEHOLDER_BY_PANEL[report.panelId]) ||
  '示例：本次报告主要异常为……，提示……，建议……')

if (!report) {
  toast.show('未找到该检验报告', 'error')
  router.replace({ name: 'labReportTrain' })
}

function goList() {
  router.push({ name: 'labReportTrain' })
}

async function onSubmit() {
  if (!canSubmit.value) {
    toast.show('解读内容过短，请至少写 30 字再提交', 'warning')
    return
  }
  const result = await submit()
  if (result) {
    viewResult.value = result
    lastRun.value = lastLabRun(report)   // 交完卷，「上次成绩」就是刚这一份
    modalOpen.value = true
  }
}

function onReset() {
  if (!text.value.trim()) return
  reset()
  toast.show('已清空，可重新书写')
}
</script>

<style scoped>
.labr-page { max-width: 1480px; margin: 0 auto; padding: 18px 24px 48px; }
.labr-top { display: flex; align-items: center; gap: 14px; margin-bottom: 14px; }
.back { border: 1px solid #e5e7eb; background: #fff; border-radius: 8px; height: 32px; padding: 0 12px; font-size: 12.5px; color: #4b5563; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; font-family: inherit; }
.back:hover { border-color: #cbd5e1; background: #f8fafc; }
.title-wrap { flex: 1; min-width: 0; }
.title-wrap h2 { margin: 0; font-size: 18px; font-weight: 800; color: #111827; }
.meta { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 5px; }
.chip { font-size: 11px; color: #6b7280; background: #f3f4f6; border-radius: 6px; padding: 2px 8px; }
.chip.focus { color: #1d4ed8; background: #eff6ff; }
.level-tag { font-size: 11.5px; padding: 3px 10px; border-radius: 999px; font-weight: 600; }
.level-tag.basic { background: #ecfdf5; color: #047857; }
.level-tag.advanced { background: #fffbeb; color: #b45309; }
.level-tag.difficult { background: #fef2f2; color: #b91c1c; }

.labr-grid { display: grid; grid-template-columns: minmax(0, 1fr) 420px; gap: 16px; align-items: start; }
.write-col { position: sticky; top: 14px; }
.write-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,.05); }
.write-head { padding: 14px 18px 12px; border-bottom: 1px solid #f3f4f6; }
.write-title { font-size: 15px; font-weight: 700; }
.last-run { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 8px; font-size: 11.5px; color: #6b7280; }
.lr-score b { font-size: 13px; }
.lr-meta { color: #9ca3af; }
.lr-tag { font-size: 10.5px; color: #92400e; background: #fef3c7; border-radius: 4px; padding: 1px 6px; }
.sc-good { color: #059669; }
.sc-mid { color: #d97706; }
.sc-bad { color: #dc2626; }
.write-body { padding: 14px 18px; }
.task-card { border: 1px solid #dbeafe; background: #eff6ff; border-radius: 10px; padding: 10px 12px; margin-bottom: 12px; }
.tk { font-size: 11.5px; font-weight: 700; color: #1d4ed8; margin-bottom: 5px; }
.task-card ul { margin: 0; padding-left: 16px; }
.task-card li { font-size: 12px; color: #334155; line-height: 1.75; }

.write-label { display: flex; align-items: center; justify-content: space-between; margin-bottom: 7px; }
.write-label span:first-child { font-size: 12.5px; font-weight: 600; }
.count { font-size: 11px; color: #9ca3af; font-family: 'Consolas', monospace; }
.answer { width: 100%; min-height: 300px; resize: vertical; line-height: 1.8; font-size: 13px; padding: 12px 14px; border: 1px solid #e2e8f0; border-radius: 10px; color: #1f2937; outline: none; transition: border-color .15s, box-shadow .15s; font-family: inherit; }
.answer:focus { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,.10); }
.answer::placeholder { color: #a8b3c2; }

.hint-row { display: flex; align-items: center; justify-content: space-between; margin-top: 10px; }
.link-btn { border: 0; background: none; color: #1d4ed8; font-size: 12px; padding: 2px 0; cursor: pointer; font-family: inherit; }
.link-btn:hover { text-decoration: underline; }
.tip-box { margin-top: 10px; border: 1px dashed #fde68a; background: #fffbeb; border-radius: 9px; padding: 10px 12px; }
.tip-t { font-size: 12px; font-weight: 700; color: #92400e; margin-bottom: 5px; }
.tip-box ul { margin: 0; padding-left: 16px; }
.tip-box li { font-size: 12px; color: #78350f; line-height: 1.75; }

.write-actions { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 0 18px 14px; }
.actions-right { display: flex; gap: 8px; }
.write-actions .btn { font-family: inherit; cursor: pointer; }
.write-actions .btn:disabled { opacity: .55; cursor: not-allowed; }
.write-meta { display: flex; gap: 8px; flex-wrap: wrap; padding: 10px 18px; border-top: 1px solid #f3f4f6; font-size: 11.5px; color: #9ca3af; background: #fcfcfd; border-radius: 0 0 12px 12px; }
.write-meta b { color: #6b7280; }

@media (max-width: 1180px) {
  .labr-grid { grid-template-columns: 1fr; }
  .write-col { position: static; }
}
</style>
