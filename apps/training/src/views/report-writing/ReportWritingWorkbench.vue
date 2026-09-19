<template>
  <div class="rww-page">
    <!-- 两态：书写报告 → 对照参考 -->
    <StepBar :phases="phases" :current="phaseIndex" :round-index="state.roundIndex" @go="onGoPhase" />

    <div class="rww-body">
      <div class="rww-main">
        <!-- 一般信息（可收起展开） -->
        <InfoBar :sample="sample" @copy="onCopy" />

        <!-- 影像显示控件：序列数量随病例变，翻层面用图片切换 -->
        <ImageViewer :sample="sample" />

        <!-- 三段报告（同时可写；对照态下由对照区左栏呈现，此处收起，点"返回修改报告"再展开） -->
        <SegmentForm v-if="!inReview" :segments="segments" :draft="state.draft"
                     :total-chars="totalChars" :total-over="totalOver" :total-limit="TOTAL_LIMIT"
                     @update:segment="onSegmentInput" />

        <!-- 提交后：AI 评阅结果 + 与参考报告对照 -->
        <template v-if="inReview">
          <ScoreResultPanel :scoring="scoring" @score="onScore" @retry="onScore" @appeal="onAppeal" />
          <ComparePanel :draft="state.draft" :sample="sample" />
        </template>

        <!-- 阅片笔记：按批注放在最后 -->
        <NotesPanel :notes="state.viewNotes" @update:notes="v => state.viewNotes = v" />
      </div>

      <!-- 右侧：AI伴学（对话式） -->
      <CompanionPanel :messages="state.chat" :loading="state.chatLoading"
                      :segments="segments" :active-segment="state.activeSegment"
                      @update:activeSegment="setActiveSegment" @ask="onAsk" />
    </div>

    <!-- 底部操作区 -->
    <div class="rww-foot">
      <div class="rww-foot-left">
        <span v-if="!inReview && !canSubmit" class="text-error">{{ submitBlockReason }}</span>
        <span v-if="totalOver" class="text-error">超出字数上限</span>
      </div>
      <div class="rww-foot-right">
        <template v-if="!inReview">
          <button class="btn btn-primary" :disabled="!canSubmit" @click="onSubmit">
            <i class="fa-solid fa-wand-magic-sparkles"></i> 提交报告
          </button>
        </template>
        <template v-else>
          <button class="btn" @click="onRewrite">
            <i class="fa-solid fa-rotate-left"></i> 返回修改
          </button>
          <button class="btn" @click="onRestartRound">
            <i class="fa-solid fa-forward"></i> 重练
          </button>
          <button class="btn btn-primary" @click="backToList">
            完成 <i class="fa-solid fa-check"></i>
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
import SegmentForm from './components/SegmentForm.vue'
import ScoreResultPanel from './components/ScoreResultPanel.vue'
import ComparePanel from './components/ComparePanel.vue'
import NotesPanel from './components/NotesPanel.vue'
import CompanionPanel from './components/CompanionPanel.vue'

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
  state, inReview, phases, segments,
  totalChars, totalOver, TOTAL_LIMIT,
  canSubmit, submitBlockReason,
  askCompanion, setActiveSegment,
  toReview, backToWrite, restartRound,
  scoring, scoringRunning, runScoring, fileAppeal
} = session

const phaseIndex = computed(() => (inReview.value ? 1 : 0))

onMounted(() => {
  if (!raw) { toast.show('未找到该病例', 'error'); router.replace({ name: 'reportWritingTrain' }); return }
  if (!playable) { toast.show('该病例尚未发布或金标准未录入，暂不可训练', 'warning'); router.replace({ name: 'reportWritingTrain' }) }
})

function onSegmentInput(key, val) {
  state.draft[key] = val
}

function onCopy(text, segment) {
  // 复制进指定段（一般信息条默认进「一般信息」段）
  const key = segment || state.activeSegment || 'general'
  const cur = state.draft[key] || ''
  state.draft[key] = cur ? `${cur}\n${text}` : text
  setActiveSegment(key)
}

/** 提交报告 → 进入评分与对照（评分由 session 自动发起） */
function onSubmit() {
  if (!canSubmit.value) { toast.show(submitBlockReason.value, 'warning'); return }
  const r = toReview()
  if (!r.ok) { toast.show(r.reason || '无法提交', 'warning'); return }
  setTimeout(() => document.querySelector('#score-result')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120)
}

function onGoPhase(i) {
  if (i === 0 && inReview.value) backToWrite()
}

async function onAsk(question) {
  const r = await askCompanion(question)
  if (r && r.ok === false && r.reason === 'llm') toast.show('模型没连上，稍后再问', 'warning')
}

function onRewrite() { backToWrite() }

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

function onRestartRound() {
  confirm('开始新一轮？本轮报告与对话记录将清空。').then(ok => {
    if (!ok) return
    restartRound()
    toast.show('已开始新一轮', 'success')
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
.rww-foot-left { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; min-width: 0; font-size: 12.5px; }
.rww-foot-right { display: flex; gap: 8px; margin-left: auto; }
@media (max-width: 1100px) {
  .rww-body { flex-direction: column; }
}
</style>
