<template>
  <div class="rwr-page">
    <TrainingTopBar
      :station-name="sample.title || '影像报告书写训练'"
      formatted-time=""
      end-label="返回列表"
      end-icon="fa-arrow-left"
      :hide-step-number="true"
      @end="backToList"
    >
      <template #center>
        <span class="rwr-crumb">成绩报告</span>
      </template>
    </TrainingTopBar>

    <div class="rwr-body">
      <ScoreResultPanel :scoring="scoring" @score="onScore" @retry="onScore" @appeal="onAppeal" />
      <ComparePanel :draft="state.draft" :sample="sample" />

      <div class="rwr-foot">
        <button class="btn" @click="backToEdit">
          <i class="fa-solid fa-rotate-left"></i> 返回修改
        </button>
        <button class="btn" @click="onRestart">
          <i class="fa-solid fa-forward"></i> 重练
        </button>
        <button class="btn btn-primary" @click="backToList">
          完成 <i class="fa-solid fa-check"></i>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast, confirm } from '@ai-sp/shared'
import { getImagingSample, scoreableOf } from '@ai-sp/shared/imaging'
import { useReportSession } from '@/composables/useReportSession'
import TrainingTopBar from '@/components/TrainingTopBar.vue'
import ScoreResultPanel from './components/ScoreResultPanel.vue'
import ComparePanel from './components/ComparePanel.vue'

const route = useRoute()
const router = useRouter()

const raw = getImagingSample(route.params.caseId)
const sample = computed(() => {
  if (!raw) return { id: '', title: '', lost: [], scoreableMax: 100, capabilities: {}, goldStandard: null, series: [], deidentify: {}, clinicalBrief: '', modality: '', bodyPart: '', level: '', icon: '' }
  const { max, lost } = scoreableOf(raw.id, raw.capabilities)
  return { ...raw, scoreableMax: max, lost }
})

// 与工作台共享同一份本地会话（同一 caseId）
const session = useReportSession(route.params.caseId, sample.value)
const { state, inReview, scoring, scoringRunning, runScoring, fileAppeal, backToWrite, restartRound } = session

onMounted(() => {
  if (!raw) { router.replace({ name: 'reportWritingTrain' }); return }
  // 未提交就进来（比如手输 URL）→ 退回工作台
  if (!inReview.value) { router.replace({ name: 'reportWritingWorkbench', params: { caseId: route.params.caseId } }) }
})

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

function backToEdit() {
  backToWrite()
  router.push({ name: 'reportWritingWorkbench', params: { caseId: route.params.caseId } })
}

function onRestart() {
  confirm('开始新一轮？本轮报告与对话记录将清空。').then(ok => {
    if (!ok) return
    restartRound()
    router.push({ name: 'reportWritingWorkbench', params: { caseId: route.params.caseId } })
  }).catch(() => {})
}

function backToList() {
  router.push({ name: 'reportWritingTrain' })
}
</script>

<style scoped>
.rwr-page { min-height: 100vh; padding: 60px 24px 40px; background: var(--background); }
.rwr-crumb { font-size: 14px; font-weight: 600; color: #606266; }
.rwr-body { max-width: 1180px; margin: 0 auto; display: flex; flex-direction: column; gap: 14px; }
.rwr-foot {
  display: flex; justify-content: flex-end; gap: 8px;
  padding: 14px 0 0;
}
</style>
