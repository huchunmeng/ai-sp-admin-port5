<template>
  <div class="float-info-trigger" :class="{ active: show }" @click="show = !show" title="患者信息 / 笔记">
    <i class="fa-solid fa-circle-info"></i>
  </div>
  <div class="float-info-overlay" v-if="show">
    <div class="float-info-header" :class="{ flow: isFlowMode }">
      <span class="float-tab" :class="{ active: activeTab === 'info' }" @click="activeTab = 'info'">{{ isZh ? '患者信息' : 'Info' }}</span>
      <span class="float-tab" :class="{ active: activeTab === 'notes' }" @click="activeTab = 'notes'">{{ isZh ? '笔记' : 'Notes' }}</span>
      <span v-if="isFlowMode" class="float-tab" :class="{ active: activeTab === 'consultation' }" @click="activeTab = 'consultation'">{{ isZh ? '接诊' : 'Hx' }}</span>
      <span v-if="isFlowMode" class="float-tab" :class="{ active: activeTab === 'ancillaryTests' }" @click="activeTab = 'ancillaryTests'">{{ isZh ? '辅检' : 'Tests' }}</span>
      <span v-if="isFlowMode" class="float-tab" :class="{ active: activeTab === 'diagnosis' }" @click="activeTab = 'diagnosis'">{{ isZh ? '诊断' : 'Dx' }}</span>
      <span v-if="isFlowMode" class="float-tab" :class="{ active: activeTab === 'treatmentPlan' }" @click="activeTab = 'treatmentPlan'">{{ isZh ? '治疗' : 'Tx' }}</span>
      <span v-if="isFlowMode" class="float-tab" :class="{ active: activeTab === 'medicalRecord' }" @click="activeTab = 'medicalRecord'">{{ isZh ? '病历' : 'MR' }}</span>
      <span class="float-close" @click="show = false"><i class="fa-solid fa-xmark"></i></span>
    </div>

    <!-- 患者信息 -->
    <div class="float-info-body" v-show="activeTab === 'info'">
      <PatientInfoPanel :patient="patient" :vitals="vitals" :chiefComplaint="chiefComplaint" :lang="lang" :hideName="hideName">
        <slot name="info-extra"></slot>
      </PatientInfoPanel>
    </div>

    <!-- 笔记 -->
    <div class="float-info-body" v-show="activeTab === 'notes'">
      <slot name="notes-content"></slot>
    </div>

    <!-- 接诊记录 -->
    <div v-if="isFlowMode" class="float-info-body" v-show="activeTab === 'consultation'">
      <div v-if="consultationMessages.length" class="chat-history">
        <div v-for="(m, i) in consultationMessages" :key="'cm'+i" class="chat-row" :class="m.role === 'user' ? 'user' : 'sp'">
          <span class="chat-role">{{ m.role === 'user' ? (isZh ? '学员' : 'Me') : 'SP' }}</span>
          <span class="chat-text">{{ m.content }}</span>
        </div>
      </div>
      <div v-else class="empty-hint">{{ isZh ? '暂无接诊记录' : 'No consultation records' }}</div>
    </div>

    <!-- 辅检记录 -->
    <div v-if="isFlowMode" class="float-info-body" v-show="activeTab === 'ancillaryTests'">
      <template v-if="ancillaryEntry?.hasData">
        <div class="detail-section">
          <div class="detail-label">{{ isZh ? '已选检查' : 'Selected Tests' }}（{{ ancillaryEntry.detail.totalSelected }}）</div>
          <div class="detail-item" v-for="(s, i) in ancillaryEntry.detail.selected" :key="'s'+i">{{ s }}</div>
        </div>
        <div class="detail-section" v-if="ancillaryEntry.detail.results.length">
          <div class="detail-label">{{ isZh ? '检查结果' : 'Results' }}</div>
          <div v-for="(r, i) in ancillaryEntry.detail.results" :key="'r'+i" class="result-item">
            <div class="detail-value" style="font-weight:600;">{{ r.name }}</div>
            <div class="detail-text">{{ r.result }}</div>
          </div>
        </div>
      </template>
      <div v-else class="empty-hint">{{ isZh ? '暂无辅检记录' : 'No test records' }}</div>
    </div>

    <!-- 诊断记录 -->
    <div v-if="isFlowMode" class="float-info-body" v-show="activeTab === 'diagnosis'">
      <template v-if="diagEntry?.hasData">
        <div class="detail-section" v-if="diagEntry.detail.preliminary">
          <div class="detail-label">{{ isZh ? '初步诊断' : 'Preliminary Dx' }}</div>
          <div class="detail-value">{{ diagEntry.detail.preliminary }}</div>
        </div>
        <div class="detail-section" v-if="diagEntry.detail.basis">
          <div class="detail-label">{{ isZh ? '诊断依据' : 'Basis' }}</div>
          <div class="detail-text">{{ diagEntry.detail.basis }}</div>
        </div>
        <div class="detail-section" v-if="diagEntry.detail.differential">
          <div class="detail-label">{{ isZh ? '鉴别诊断' : 'Differential Dx' }}</div>
          <div class="detail-value">{{ diagEntry.detail.differential }}</div>
          <div v-if="diagEntry.detail.differentialDetails.length" style="margin-top:8px;">
            <div v-for="(d, i) in diagEntry.detail.differentialDetails" :key="'dd'+i" class="result-item">
              <div class="detail-value" style="font-weight:600;">{{ d.name }}</div>
              <div class="detail-text" v-if="d.evidence">{{ d.evidence }}</div>
            </div>
          </div>
        </div>
      </template>
      <div v-else class="empty-hint">{{ isZh ? '暂无诊断记录' : 'No diagnosis records' }}</div>
    </div>

    <!-- 治疗记录 -->
    <div v-if="isFlowMode" class="float-info-body" v-show="activeTab === 'treatmentPlan'">
      <template v-if="txEntry?.hasData">
        <div class="detail-section">
          <div class="detail-label">{{ isZh ? '治疗计划内容' : 'Plan Content' }}</div>
          <div class="detail-text pre-wrap">{{ txEntry.detail.content }}</div>
          <div v-if="txEntry.detail.fullLength > 500" class="detail-hint">
            {{ isZh ? '（共' + txEntry.detail.fullLength + '字）' : '(' + txEntry.detail.fullLength + ' chars total)' }}
          </div>
        </div>
      </template>
      <div v-else class="empty-hint">{{ isZh ? '暂无治疗记录' : 'No treatment records' }}</div>
    </div>

    <!-- 病历记录 -->
    <div v-if="isFlowMode" class="float-info-body" v-show="activeTab === 'medicalRecord'">
      <template v-if="mrEntry?.hasData">
        <div class="detail-section">
          <div class="detail-label">{{ isZh ? '病历内容' : 'Record Content' }}</div>
          <div class="detail-text pre-wrap">{{ mrEntry.detail.content }}</div>
          <div v-if="mrEntry.detail.fullLength > 500" class="detail-hint">
            {{ isZh ? '（共' + mrEntry.detail.fullLength + '字）' : '(' + mrEntry.detail.fullLength + ' chars total)' }}
          </div>
        </div>
      </template>
      <div v-else class="empty-hint">{{ isZh ? '暂无病历记录' : 'No medical records' }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useTrainingStore } from '@/stores/training'
import PatientInfoPanel from '@/components/PatientInfoPanel.vue'
import { buildOperationLog } from '@/composables/useOperationLog'

defineProps({
  patient: { type: Object, default: () => ({}) },
  vitals: { type: Object, default: () => ({}) },
  chiefComplaint: { type: String, default: '' },
  lang: { type: String, default: 'zh' },
  hideName: { type: Boolean, default: false },
})

const store = useTrainingStore()
const show = ref(false)
const activeTab = ref('info')

const isZh = computed(() => (store.lang || 'zh') === 'zh')
const isFlowMode = computed(() => (store.stationFlow?.stations?.length || 0) > 1)

const logEntries = computed(() => buildOperationLog(store.trainingSession))

function getEntry(key) {
  return logEntries.value.find(e => e.key === key)
}

const ancillaryEntry = computed(() => getEntry('ancillaryTests'))
const diagEntry = computed(() => getEntry('diagnosis'))
const txEntry = computed(() => getEntry('treatmentPlan'))
const mrEntry = computed(() => getEntry('medicalRecord'))

const consultationMessages = computed(() => {
  const sess = store.trainingSession || {}
  const htMsgs = (sess.historyTaking?.messages || []).map(m => ({ ...m, stage: 'history' }))
  const peMsgs = (sess.physicalExam?.messages || []).map(m => ({ ...m, stage: 'exam' }))
  return [...htMsgs, ...peMsgs].filter(m => m.content && (m.role === 'user' || m.role === 'sp')).slice(-50)
})
</script>

<style scoped>
.float-info-trigger { position: absolute; top: 60px; left: 16px; width: 40px; height: 40px; background: rgba(255,255,255,0.94); border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 10; box-shadow: 0 2px 12px rgba(0,0,0,0.15); font-size: 20px; color: #409EFF; transition: all .2s; border: 1px solid rgba(0,0,0,0.06); }
.float-info-trigger:hover { transform: scale(1.08); box-shadow: 0 4px 16px rgba(0,0,0,0.18); }
.float-info-trigger.active { background: #409EFF; color: #fff; border-color: #409EFF; }
.float-info-overlay { position: absolute; top: 60px; left: 64px; width: 390px; max-height: calc(100vh - 8px); background: rgba(255,255,255,0.96); border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); overflow: hidden; z-index: 10; display: flex; flex-direction: column; backdrop-filter: blur(8px); }
.float-info-header { display: flex; align-items: center; border-bottom: 1px solid #EBEEF5; flex-shrink: 0; overflow-x: auto; }
.float-info-header.flow .float-tab { padding: 10px 5px; font-size: 11px; }
.float-tab { flex: 1; text-align: center; padding: 12px 6px; font-size: 13px; cursor: pointer; color: #909399; transition: all .15s; white-space: nowrap; }
.float-tab.active { color: #409EFF; border-bottom: 2px solid #409EFF; }
.float-close { padding: 8px 12px; cursor: pointer; color: #909399; font-size: 14px; flex-shrink: 0; }
.float-close:hover { color: #F56C6C; }
.float-info-body { padding: 12px; overflow-y: auto; flex: 1; }

/* Detail sections */
.detail-section { margin-bottom: 10px; }
.detail-label { font-size: 11px; font-weight: 600; color: #909399; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.3px; }
.detail-value { font-size: 13px; color: #303133; line-height: 1.6; }
.detail-text { font-size: 12px; color: #606266; line-height: 1.6; white-space: pre-wrap; word-break: break-word; }
.detail-text.pre-wrap { white-space: pre-wrap; }
.detail-item { font-size: 12px; color: #606266; padding: 3px 0 3px 8px; border-left: 2px solid #EBEEF5; margin-bottom: 2px; }
.result-item { padding: 6px 8px; background: #fafafa; border-radius: 6px; margin-bottom: 4px; }
.detail-hint { font-size: 11px; color: #909399; margin-top: 4px; font-style: italic; }
.empty-hint { text-align: center; color: #C0C4CC; padding: 30px 0; font-size: 13px; }

/* Chat history */
.chat-history { display: flex; flex-direction: column; gap: 4px; }
.chat-row { display: flex; gap: 6px; align-items: flex-start; font-size: 12px; line-height: 1.5; padding: 3px 0; }
.chat-role { font-weight: 600; flex-shrink: 0; min-width: 32px; font-size: 10px; padding: 1px 5px; border-radius: 4px; }
.chat-row.user .chat-role { background: #ecf5ff; color: #409EFF; }
.chat-row.sp .chat-role { background: #f0f9eb; color: #67C23A; }
.chat-text { color: #303133; word-break: break-word; }
</style>
