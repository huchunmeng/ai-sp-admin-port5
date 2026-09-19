<template>
  <div class="rww-page">
    <!-- 两态：书写报告 → 对照自评 -->
    <StepBar :phases="phases" :current="phaseIndex" :round-index="state.roundIndex" @go="onGoPhase" />

    <div class="rww-body">
      <div class="rww-main">
        <!-- 一般信息（可收起展开） -->
        <InfoBar :sample="sample" @copy="onCopy" />

        <!-- 影像显示控件：序列数量随病例变，翻层面用图片切换 -->
        <ImageViewer :sample="sample" />

        <!-- 阅片笔记：放在影像下方，可选、默认收起 -->
        <NotesPanel :notes="state.viewNotes" @update:notes="v => state.viewNotes = v" />

        <!-- 三段报告（同时可写） -->
        <SegmentForm v-if="!inReview" :segments="segments" :draft="state.draft"
                     :total-chars="totalChars" :total-over="totalOver" :total-limit="TOTAL_LIMIT"
                     @update:segment="onSegmentInput" />

        <!-- 提交后：自评 + 对照 -->
        <template v-if="inReview">
          <SelfReviewPanel :marks="state.marks" :submitted="selfSubmitted" :total="selfReviewTotal()"
                           @mark="onMark" @submit="onSubmitSelfReview"
                           @rewrite="onRewrite" @restart="onRestartRound" />
          <ComparePanel :unlocked="selfSubmitted" :draft="state.draft" :sample="sample"
                        :self-total="selfReviewTotal()" :system-coverage="systemCoverage" />
        </template>
      </div>

      <!-- 右侧：要素自检 + 提示栏（提示按段发放） -->
      <HintAside :coverage="coverage" :hints="state.hints" :used-hint-count="usedHintCount"
                 :segments="segments" :active-segment="state.activeSegment"
                 :quota-left="quotaLeft" :cooling-left="coolingLeft"
                 @update:activeSegment="setActiveSegment" @hint="onHint" />
    </div>

    <!-- 底部操作区 -->
    <div class="rww-foot">
      <div class="rww-foot-left">
        <span class="rww-stage-hint">{{ phaseHint }}</span>
        <span v-if="!inReview && !canSubmit" class="text-error">{{ submitBlockReason }}</span>
        <span v-if="totalOver" class="text-error">单例三段合计超过 {{ TOTAL_LIMIT }} 字上限，请精简后再提交</span>
      </div>
      <div class="rww-foot-right">
        <template v-if="!inReview">
          <button class="btn btn-primary" :disabled="!canSubmit" @click="onSubmit">
            <i class="fa-solid fa-paper-plane"></i> 提交报告，进入自评对照
          </button>
        </template>
        <template v-else>
          <button class="btn" @click="onRewrite">
            <i class="fa-solid fa-rotate-left"></i> 返回修改报告
          </button>
          <button v-if="selfSubmitted" class="btn btn-primary" @click="backToList">
            完成，返回列表 <i class="fa-solid fa-check"></i>
          </button>
          <button v-else class="btn btn-primary" @click="scrollToSelfReview">
            去自评 <i class="fa-solid fa-chevron-down"></i>
          </button>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast, confirm } from '@ai-sp/shared'
import { getImagingSample, scoreableOf, hasGoldStandard } from '@ai-sp/shared/imaging'
import { useReportSession } from '@/composables/useReportSession'
import StepBar from './components/StepBar.vue'
import InfoBar from './components/InfoBar.vue'
import ImageViewer from './components/ImageViewer.vue'
import NotesPanel from './components/NotesPanel.vue'
import SegmentForm from './components/SegmentForm.vue'
import HintAside from './components/HintAside.vue'
import SelfReviewPanel from './components/SelfReviewPanel.vue'
import ComparePanel from './components/ComparePanel.vue'

const route = useRoute()
const router = useRouter()

const raw = getImagingSample(route.params.caseId)
const playable = raw && raw.status === 'published' && hasGoldStandard(raw)

/** 样本视图模型：现算可评分与落空条目（派生量不写死） */
const sample = computed(() => {
  if (!raw) return { id: '', title: '', lost: [], scoreableMax: 100, capabilities: {}, goldStandard: null, series: [], deidentify: {}, clinicalBrief: '', modality: '', bodyPart: '', level: '', icon: '' }
  const { max, lost } = scoreableOf(raw.id, raw.capabilities)
  return { ...raw, scoreableMax: max, lost }
})

const session = useReportSession(route.params.caseId, sample.value)
const {
  state, inReview, phases, segments, coverage,
  totalChars, totalOver, TOTAL_LIMIT,
  canSubmit, submitBlockReason,
  usedHintCount, quotaLeft, coolingLeft, requestHint, setActiveSegment,
  toReview, backToWrite, restartRound,
  submitSelfReview, selfSubmitted, selfReviewTotal
} = session

const PHASE_HINT = {
  write: '三段报告同时可写，不必按顺序推进；写影像所见时右侧「要素自检」会跟着判读',
  review: '先逐条自评，提交后才解锁参考报告；自评不参与评分，只看你自己的认知偏差'
}

const phaseIndex = computed(() => (inReview.value ? 1 : 0))
const phaseHint = computed(() => PHASE_HINT[inReview.value ? 'review' : 'write'])

/** 要素覆盖率（0–100），给对照页的系统参考分用 */
const systemCoverage = computed(() => {
  if (!coverage.value.length) return 0
  const score = coverage.value.reduce((a, c) => a + (c.mark === 'ok' ? 1 : c.mark === 'doubt' ? 0.5 : 0), 0)
  return Math.round((score / coverage.value.length) * 100)
})

onMounted(() => {
  if (!raw) { toast.show('未找到该病例', 'error'); router.replace({ name: 'reportWritingTrain' }); return }
  if (!playable) { toast.show('该病例尚未发布或金标准未录入，暂不可训练', 'warning'); router.replace({ name: 'reportWritingTrain' }) }
})

function onSegmentInput(key, val) {
  state.draft[key] = val
}

function onCopy(text) {
  // 复制进「影像所见」段末尾；复制只是省打字，照抄不得满分（GEN-04）
  const key = state.activeSegment || 'findings'
  const cur = state.draft[key] || ''
  state.draft[key] = cur ? `${cur}\n${text}` : text
  setActiveSegment(key)
}

/** 提交报告 → 自评对照（收口动作，不可跳过） */
function onSubmit() {
  if (!canSubmit.value) { toast.show(submitBlockReason.value, 'warning'); return }
  confirm('提交报告并进入逐条自评？自评表按 R1 表 23 条逐条判定，不可跳过（允许整页快速自评）；提交后才解锁金标准对照。')
    .then(ok => {
      if (!ok) return
      const r = toReview()
      if (!r.ok) { toast.show(r.reason || '无法提交', 'warning'); return }
      setTimeout(scrollToSelfReview, 120)
    })
    .catch(() => {})
}

/** 从"对照自评"点回"书写报告"= 重写（不新建回合、配额不重置） */
function onGoPhase(i) {
  if (i === 0 && inReview.value) onRewrite()
}

function onHint(level) {
  const r = requestHint(level)
  if (!r.ok) { toast.show(r.reason, 'warning'); return }
  toast.show(`已给出 ${level} 提示`, 'success')
}

function onMark(code, mark) {
  state.marks = { ...state.marks, [code]: mark }
}

function scrollToSelfReview() {
  document.querySelector('.rwb-sr')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function onSubmitSelfReview() {
  const filled = Object.keys(state.marks).length
  if (!filled) { toast.show('请先逐条自评（可用「整页快速自评」）', 'warning'); return }
  const r = submitSelfReview()
  if (r.alreadySubmitted) { toast.show('本回合已提交过自评，不重复计数', 'warning'); return }
  toast.show('自评已提交，已解锁对照', 'success')
}

function onRewrite() { backToWrite() }

function onRestartRound() {
  confirm('开始新一轮（重练）？本回合记录会保留可回看，提示配额将重置。').then(ok => {
    if (!ok) return
    restartRound()
    toast.show('新回合已开始', 'success')
  }).catch(() => {})
}

function backToList() {
  router.push({ name: 'reportWritingTrain' })
}
</script>

<style scoped>
.rww-page { max-width: 1400px; margin: 0 auto; padding: 16px 24px 88px; }
.rww-body { display: flex; gap: 14px; margin-top: 14px; align-items: flex-start; }
.rww-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 14px; }
.rww-foot {
  position: sticky; bottom: 0; z-index: 15;
  display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;
  margin-top: 14px; padding: 12px 20px; border-radius: 12px;
  background: rgba(255,255,255,.96); backdrop-filter: blur(6px);
  border: 1px solid #f0f2f5; box-shadow: 0 -2px 12px rgba(0,0,0,.05);
}
.rww-foot-left { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; min-width: 0; }
.rww-stage-hint { font-size: 12.5px; color: #6b7280; }
.rww-foot-right { display: flex; gap: 8px; margin-left: auto; }
@media (max-width: 1100px) {
  .rww-body { flex-direction: column; }
}
</style>
