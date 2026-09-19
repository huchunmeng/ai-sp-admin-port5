<template>
  <div class="rww-page">
    <TrainingTopBar
      station-name="影像报告书写训练"
      formatted-time=""
      end-label="提交报告"
      end-icon="fa-paper-plane"
      :hide-step-number="true"
      :hide-timer="true"
      @end="onSubmit"
    />

    <div class="rww-body">
      <div class="rww-main">
        <ImagePanel :sample="sample" @copy="onCopy" />
        <SegmentForm :segments="segments" :draft="state.draft"
                     :total-chars="totalChars" :total-over="totalOver" :total-limit="TOTAL_LIMIT"
                     @update:segment="onSegmentInput" />
        <NotesPanel :notes="state.viewNotes" @update:notes="v => state.viewNotes = v" />
      </div>

      <!-- AI伴学：固定不动（不随页面滚动） -->
      <div class="rww-aside-wrap">
        <CompanionPanel :messages="state.chat" :loading="state.chatLoading" @ask="onAsk" />
      </div>
    </div>

    <!-- 成绩报告：提交后弹出；重练/返回修改都在弹窗里 -->
    <ScoreReportModal v-if="reportOpen"
                      :scoring="scoring"
                      :draft="state.draft"
                      :sample="sample"
                      :title="sample.title"
                      :submitted-at="submittedAt"
                      @close="onCloseReport"
                      @score="onScore"
                      @appeal="onAppeal"
                      @edit="onEdit"
                      @restart="onRestart" />
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast, confirm } from '@ai-sp/shared'
import { getImagingSample, scoreableOf, hasGoldStandard } from '@ai-sp/shared/imaging'
import { useReportSession } from '@/composables/useReportSession'
import TrainingTopBar from '@/components/TrainingTopBar.vue'
import ImagePanel from './components/ImagePanel.vue'
import SegmentForm from './components/SegmentForm.vue'
import NotesPanel from './components/NotesPanel.vue'
import CompanionPanel from './components/CompanionPanel.vue'
import ScoreReportModal from './components/ScoreReportModal.vue'

const route = useRoute()
const router = useRouter()

const raw = getImagingSample(route.params.caseId)
const playable = raw && raw.status === 'published' && hasGoldStandard(raw)

const sample = computed(() => {
  if (!raw) return { id: '', title: '', lost: [], scoreableMax: 100, capabilities: {}, goldStandard: null, series: [], deidentify: {}, clinicalBrief: '', modality: '', bodyPart: '', level: '', icon: '' }
  const { max, lost } = scoreableOf(raw.id, raw.capabilities)
  return { ...raw, scoreableMax: max, lost }
})

const session = useReportSession(route.params.caseId, sample.value)
const {
  state, segments, totalChars, totalOver, TOTAL_LIMIT,
  canSubmit, submitBlockReason, askCompanion,
  scoring, scoringRunning, runScoring, fileAppeal, backToWrite, restartRound
} = session

/** 成绩报告弹窗是否打开；提交后自动打开，也可在成绩落定后手动打开 */
const reportOpen = ref(false)
const submittedAt = ref('')

onMounted(() => {
  if (!raw) { toast.show('未找到该病例', 'error'); router.replace({ name: 'reportWritingTrain' }); return }
  if (!playable) { toast.show('该病例尚未发布或标准报告未录入，暂不可训练', 'warning'); router.replace({ name: 'reportWritingTrain' }) }
})

function onSegmentInput(key, val) {
  state.draft[key] = val
}

function onCopy(text, segment) {
  const key = segment || 'general'
  const cur = state.draft[key] || ''
  state.draft[key] = cur ? `${cur}\n${text}` : text
}

/** 提交报告 → 立即发起评分，并弹出成绩报告 */
function onSubmit() {
  if (!canSubmit.value) { toast.show(submitBlockReason.value, 'warning'); return }
  if (totalOver.value) { toast.show('超出字数上限', 'warning'); return }
  submittedAt.value = timestamp()
  reportOpen.value = true
  session.toReview()
}

async function onScore() {
  if (scoringRunning.value) return
  const r = await runScoring()
  if (r.ok) toast.show('评阅完成', 'success')
  else toast.show('评分失败，可重试', 'warning')
}

function onAppeal(reason) {
  const r = fileAppeal(reason)
  if (!r.ok) toast.show(r.reason, 'warning')
}

/** 关闭弹窗：已提交就停在成绩态，未提交（只是看了一眼）继续写 */
function onCloseReport() {
  reportOpen.value = false
}

function onEdit() {
  backToWrite()
  reportOpen.value = false
}

function onRestart() {
  confirm('开始新一轮？本轮报告与对话记录将清空。').then(ok => {
    if (!ok) return
    restartRound()
    reportOpen.value = false
  }).catch(() => {})
}

async function onAsk(question) {
  const r = await askCompanion(question)
  if (r && r.ok === false && r.reason === 'llm') toast.show('模型没连上，稍后再问', 'warning')
}

function timestamp() {
  const d = new Date()
  const p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}
</script>

<style scoped>
.rww-page { position: relative; min-height: 100vh; padding: 60px 24px 24px; background: var(--background); }
.rww-body {
  max-width: 1400px; margin: 0 auto;
  display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 16px; align-items: start;
}
.rww-main { display: flex; flex-direction: column; gap: 14px; min-width: 0; }
.rww-aside-wrap { position: sticky; top: 58px; align-self: flex-start; }
@media (max-width: 1100px) {
  .rww-body { grid-template-columns: 1fr; }
  .rww-aside-wrap { position: static; }
}
</style>
