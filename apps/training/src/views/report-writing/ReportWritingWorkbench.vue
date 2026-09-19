<template>
  <div class="rww-page">
    <!-- 阶段条 -->
    <StepBar :stages="stages" :current="state.stageIndex" :round-index="state.roundIndex"
             :reachable="reachableStages" @go="onGoStage" />

    <div class="rww-body">
      <div class="rww-main">
        <!-- 一般信息条 -->
        <InfoBar :sample="sample" @copy="onCopy" />

        <!-- T0：阅片笔记 -->
        <section v-if="stage.key === 'T0'" class="card rwb-block">
          <div class="rwb-block-head">
            <i class="fa-solid fa-eye"></i> T0 阅片
            <span class="rwb-tag">阅片笔记 · 不进入报告、不参与评分</span>
            <span class="rwb-count">{{ state.viewNotes.length }} / 500 字</span>
          </div>
          <textarea class="rww-notes" v-model="state.viewNotes" maxlength="500" rows="5"
                    placeholder="边看边记：病灶在哪一层最清楚、形态特征、你打算怎么描述、有哪些拿不准的地方…"></textarea>
          <div class="rwb-note">
            这段笔记只给你自己看，T4 可回看。它不进报告、也不参与评分——放心记下不确定的东西。
          </div>
        </section>

        <!-- 影像显示控件 -->
        <ImageViewer :sample="sample" />

        <!-- T1–T3：报告输入 -->
        <SegmentForm v-if="inReportStage" :segments="segments" :draft="state.draft"
                     :active-key="stage.segment" :editable-keys="editableKeys"
                     :total-chars="totalChars" :total-over="totalOver" :total-limit="TOTAL_LIMIT"
                     @update:segment="onSegmentInput" />

        <!-- T4：自评 + 对照（自评未提交不出对照） -->
        <template v-if="stage.key === 'T4'">
          <SelfReviewPanel :marks="state.marks" :submitted="selfSubmitted" :total="selfReviewTotal()"
                           @mark="onMark" @submit="onSubmitSelfReview"
                           @rewrite="onRewrite" @restart="onRestartRound" />
          <ComparePanel :unlocked="selfSubmitted" :draft="state.draft" :sample="sample"
                        :self-total="selfReviewTotal()" :system-coverage="systemCoverage" />
        </template>
      </div>

      <!-- 右侧：要素覆盖 + 提示栏 -->
      <HintAside :coverage="coverage" :hints="state.hints" :used-hint-count="usedHintCount"
                 :locked="!stage.segment" :lock-reason="stage.hintTip || ''"
                 :quota-left="quotaLeft" :cooling-left="coolingLeft" @hint="onHint" />
    </div>

    <!-- 底部操作区 -->
    <div class="rww-foot">
      <div class="rww-foot-left">
        <span class="rww-stage-hint">{{ stageHint }}</span>
        <span v-if="!canAdvance && stage.segment" class="text-error">{{ blockReason }}</span>
        <span v-if="totalOver" class="text-error">单例三段合计超过 {{ TOTAL_LIMIT }} 字上限，请精简后再提交</span>
      </div>
      <div class="rww-foot-right">
        <button class="btn" :disabled="state.stageIndex === 0" @click="onPrev">
          <i class="fa-solid fa-chevron-left"></i> 上一阶段
        </button>
        <button v-if="stage.key === 'T0' || stage.key === 'T1' || stage.key === 'T2'"
                class="btn btn-primary" :disabled="!canAdvance" @click="onNext">
          下一阶段 <i class="fa-solid fa-chevron-right"></i>
        </button>
        <button v-else-if="stage.key === 'T3'" class="btn btn-primary" :disabled="!canAdvance" @click="goSelfReview">
          <i class="fa-solid fa-paper-plane"></i> 提交报告，进入自评
        </button>
        <button v-else-if="!selfSubmitted" class="btn btn-primary" @click="scrollToSelfReview">
          去自评 <i class="fa-solid fa-chevron-down"></i>
        </button>
        <button v-else class="btn btn-primary" @click="backToList">
          完成，返回列表 <i class="fa-solid fa-check"></i>
        </button>
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
  if (!raw) return { id: '', title: '', lost: [], scoreableMax: 100, capabilities: {}, goldStandard: null, series: {}, deidentify: {}, clinicalBrief: '', modality: '', bodyPart: '', level: '', icon: '' }
  const { max, lost } = scoreableOf(raw.id, raw.capabilities)
  return { ...raw, scoreableMax: max, lost }
})

const session = useReportSession(route.params.caseId, sample.value)
const {
  state, stage, stages, segment, segments, coverage,
  totalChars, totalOver, TOTAL_LIMIT, canAdvance, blockReason,
  usedHintCount, quotaLeft, coolingLeft, requestHint,
  nextStage, prevStage, goStage, rewrite, restartRound,
  submitSelfReview, selfSubmitted, selfReviewTotal
} = session

const STAGE_HINT = {
  T0: 'T0 阅片 —— 先看清楚，把观察和疑问记下来，再动笔',
  T1: 'T1 检查技术 —— 交代检查部位、检查类型与扫描方式（9 分）',
  T2: 'T2 影像所见 —— R1 表分值最高的段落（影像描述 34 分）',
  T3: 'T3 诊断意见 —— 回应临床问题并给出下一步建议（影像诊断 38 分）',
  T4: 'T4 对照自评 —— 先逐条自评，提交后才解锁参考报告'
}
const stageHint = computed(() => STAGE_HINT[stage.value.key] || '')

const inReportStage = computed(() => ['T1', 'T2', 'T3'].includes(stage.value.key))

/** 可编辑的段 = 已达成的阶段对应的段（回看不丢） */
const editableKeys = computed(() => {
  const keys = []
  stages.forEach((s, i) => { if (i <= state.stageIndex && s.segment) keys.push(s.segment) })
  return keys
})

/** 可回退/可达的阶段：已完成的都能回，往前只能一步（且满足非空） */
const reachableStages = computed(() => {
  const out = []
  for (let i = 0; i <= state.stageIndex; i++) out.push(i)
  if (canAdvance.value && state.stageIndex < stages.length - 1) out.push(state.stageIndex + 1)
  return out
})

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
  // 复制进"当前阶段"对应段落的末尾；复制只是省打字，照抄不得满分（GEN-04）
  const key = stage.value.segment || 'findings'
  const cur = state.draft[key] || ''
  state.draft[key] = cur ? `${cur}\n${text}` : text
}

function onGoStage(i) {
  const r = goStage(i)
  if (!r.ok && r.reason) toast.show(r.reason, 'warning')
}

function onNext() {
  const r = nextStage()
  if (!r.ok) { toast.show(r.reason || blockReason.value || '无法进入下一阶段', 'warning'); return }
}

function onPrev() { prevStage() }

function scrollToSelfReview() {
  document.querySelector('.rwb-sr')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function onHint(level) {
  const r = requestHint(level)
  if (!r.ok) { toast.show(r.reason, 'warning'); return }
  toast.show(`已给出 ${level} 提示`, 'success')
}

function onMark(code, mark) {
  state.marks = { ...state.marks, [code]: mark }
}

/** T3 → T4 的收口动作：先确认，再推进阶段（不可跳过） */
function goSelfReview() {
  if (!canAdvance.value) { toast.show(blockReason.value, 'warning'); return }
  confirm('提交报告并进入 T4 逐条自评？自评表按 R1 表 23 条逐条判定，不可跳过（允许整页快速自评）；提交后才解锁金标准对照。')
    .then(ok => {
      if (!ok) return
      const r = goStage(4)
      if (!r.ok) { toast.show(r.reason || '无法进入自评', 'warning'); return }
      setTimeout(scrollToSelfReview, 120)
    })
    .catch(() => {})
}

function onSubmitSelfReview() {
  const filled = Object.keys(state.marks).length
  if (!filled) { toast.show('请先逐条自评（可用「整页快速自评」）', 'warning'); return }
  const r = submitSelfReview()
  if (r.alreadySubmitted) { toast.show('本回合已提交过自评，不重复计数', 'warning'); return }
  toast.show('自评已提交，已解锁对照', 'success')
}

function onRewrite() {
  rewrite()
  toast.show('已回到 T1，提示配额不重置', 'success')
}

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
.rwb-block { overflow: hidden; }
.rwb-block-head {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  font-size: 14px; font-weight: 700; color: #1f2937;
  padding: 12px 18px; background: #fafbfc; border-bottom: 1px solid #f3f4f6;
}
.rwb-block-head i { color: var(--primary); }
.rwb-tag { font-size: 11px; font-weight: 500; color: #6b7280; background: #f3f4f6; padding: 3px 10px; border-radius: 8px; }
.rwb-count { margin-left: auto; font-size: 12px; color: #9ca3af; font-variant-numeric: tabular-nums; }
.rwb-note { font-size: 12px; color: #9ca3af; line-height: 1.6; padding: 0 18px 16px; }
.rww-notes {
  width: 100%; box-sizing: border-box; resize: vertical; outline: none; border: none;
  padding: 14px 18px; font-family: inherit; font-size: 13.5px; line-height: 1.9; color: #1f2937;
}
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
