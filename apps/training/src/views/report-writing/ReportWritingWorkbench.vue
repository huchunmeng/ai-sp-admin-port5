<template>
  <div class="rww-page">
    <TrainingTopBar
      :station-name="sample.title || '影像报告书写训练'"
      formatted-time=""
      end-label="提交报告"
      end-icon="fa-paper-plane"
      :hide-step-number="true"
      @end="onSubmit"
    >
      <template #center>
        <span class="rww-crumb">{{ sample.bodyPart }} · {{ sample.modality }}</span>
      </template>
    </TrainingTopBar>

    <div class="rww-body">
      <div class="rww-main">
        <InfoBar :sample="sample" @copy="onCopy" />
        <ImageViewer :sample="sample" />
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

    <div class="rww-foot">
      <span v-if="!canSubmit" class="text-error">{{ submitBlockReason }}</span>
      <span v-if="totalOver" class="text-error">超出字数上限</span>
      <button class="btn btn-primary" :disabled="!canSubmit" @click="onSubmit">
        <i class="fa-solid fa-paper-plane"></i> 提交报告
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from '@ai-sp/shared'
import { getImagingSample, scoreableOf, hasGoldStandard } from '@ai-sp/shared/imaging'
import { useReportSession } from '@/composables/useReportSession'
import TrainingTopBar from '@/components/TrainingTopBar.vue'
import InfoBar from './components/InfoBar.vue'
import ImageViewer from './components/ImageViewer.vue'
import SegmentForm from './components/SegmentForm.vue'
import NotesPanel from './components/NotesPanel.vue'
import CompanionPanel from './components/CompanionPanel.vue'

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
  canSubmit, submitBlockReason, askCompanion
} = session

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

/** 提交报告 → 直接跳到成绩报告页（AI 评分在那里自动发起并展示） */
function onSubmit() {
  if (!canSubmit.value) { toast.show(submitBlockReason.value, 'warning'); return }
  session.toReview()
  router.push({ name: 'reportWritingResult', params: { caseId: route.params.caseId } })
}

async function onAsk(question) {
  const r = await askCompanion(question)
  if (r && r.ok === false && r.reason === 'llm') toast.show('模型没连上，稍后再问', 'warning')
}
</script>

<style scoped>
.rww-page { min-height: 100vh; padding: 60px 24px 0; background: var(--background); }
.rww-crumb { font-size: 14px; color: #606266; }
.rww-body {
  max-width: 1400px; margin: 0 auto; padding: 14px 0 88px;
  display: flex; gap: 14px; align-items: flex-start;
}
.rww-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 14px; }
/* AI伴学 固定不动：sticky 贴在顶栏之下 */
.rww-aside-wrap { position: sticky; top: 58px; align-self: flex-start; }
.rww-foot {
  position: fixed; left: 0; right: 0; bottom: 0; z-index: 15;
  display: flex; align-items: center; justify-content: flex-end; gap: 14px;
  padding: 12px 28px; background: rgba(255,255,255,.97); backdrop-filter: blur(6px);
  border-top: 1px solid var(--border); font-size: 12.5px;
}
@media (max-width: 1100px) {
  .rww-body { flex-direction: column; }
  .rww-aside-wrap { position: static; width: 100%; }
}
</style>
