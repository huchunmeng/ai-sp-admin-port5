<template>
  <div class="medical-record-page" :class="{ portrait: store.portraitMode }">
    <!-- Topbar — 样式与 TrainingTopBar 一致 -->
    <div class="training-topbar">
      <div class="station-left">
        <span class="station-name">接诊病人站</span>
      </div>
      <div class="topbar-center">
        <span class="topbar-title">病历书写</span>
      </div>
      <div class="topbar-right">
        <span class="timer" :class="cd.status">{{ cd.display }}</span>
        <button class="end-btn" @click="submitRecord">
          <i class="fa-solid fa-check"></i> 提交
        </button>
      </div>
    </div>

    <!-- Body -->
    <div class="body-area">
      <div class="left-panel">
        <div class="panel-tabs">
          <div class="panel-tab" :class="{ active: leftTab === 'info' }" @click="leftTab = 'info'">
            <i class="fa-solid fa-user"></i> 信息
          </div>
          <div class="panel-tab" :class="{ active: leftTab === 'history' }" @click="leftTab = 'history'">
            <i class="fa-solid fa-message"></i> 记录
          </div>
          <div class="panel-tab" :class="{ active: leftTab === 'diag' }" @click="leftTab = 'diag'">
            <i class="fa-solid fa-stethoscope"></i> 诊断
          </div>
          <div class="panel-tab" :class="{ active: leftTab === 'txPlan' }" @click="leftTab = 'txPlan'">
            <i class="fa-solid fa-prescription"></i> 治疗
          </div>
        </div>
        <div class="panel-content">
          <!-- Info tab -->
          <div v-show="leftTab === 'info'">
            <PatientInfoPanel :patient="store.patientInfo" />
          </div>

          <!-- History tab -->
          <div v-show="leftTab === 'history'">
            <div v-if="allChatMsgs.length > 0" class="history-chat-list">
              <div v-for="(m, idx) in allChatMsgs" :key="idx" :class="['chat-bubble-row', m.from === 'candidate' ? 'user' : 'sp']">
                <div v-if="m.from !== 'candidate'" class="chat-bubble-avatar sp">
                  <i class="fa-solid fa-user-injured"></i>
                </div>
                <div class="chat-bubble-card" :class="m.from === 'candidate' ? 'user' : 'sp'">
                  <div class="chat-bubble-time">{{ m.time }}</div>
                  <div class="chat-bubble-text">{{ m.text }}</div>
                </div>
                <div v-if="m.from === 'candidate'" class="chat-bubble-avatar user">
                  <i class="fa-solid fa-user-doctor"></i>
                </div>
              </div>
            </div>
            <div v-else class="empty-state">暂无接诊记录</div>
          </div>

          <!-- Diagnosis tab -->
          <div v-show="leftTab === 'diag'">
            <div class="diag-tx-section">
              <div class="section-label">初步诊断</div>
              <div class="section-value">{{ store.preliminaryDiag.preliminary || '未提交' }}</div>
              <div class="section-label">鉴别诊断</div>
              <div class="section-value">{{ store.preliminaryDiag.differential || '未提交' }}</div>
              <div class="section-label">诊断依据</div>
              <div class="section-value" style="white-space:pre-wrap;">{{ store.preliminaryDiag.basis || '未填写' }}</div>
            </div>
          </div>

          <!-- Treatment Plan tab -->
          <div v-show="leftTab === 'txPlan'">
            <div class="diag-tx-section">
              <div class="section-label">治疗计划</div>
              <div class="section-value" style="white-space:pre-wrap;">{{ store.preliminaryDiag.treatmentPlan || '未提交' }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="right-panel">
        <div class="record-area">
          <h3 class="record-title">
            <i class="fa-solid fa-file-medical" style="color:#409EFF;margin-right:8px;"></i>
            书写病历
          </h3>
          <textarea
            v-model="recordText"
            placeholder="请输入"
            class="record-textarea"
          ></textarea>
        </div>
        <div class="form-footer">
          <button class="btn btn-primary btn-submit" @click="submitRecord">
            <i class="fa-solid fa-check"></i> 提交
          </button>
        </div>
      </div>
    </div>

    <!-- Modal — 与 StationModals 结构一致 -->
    <div v-if="showSubmitConfirm" class="modal-overlay" @click.self="showSubmitConfirm = false">
      <div class="modal-container" style="max-width:520px;">
        <div class="modal-header">
          <h3>确认提交病历</h3>
          <span class="modal-close" @click="showSubmitConfirm = false"><i class="fa-solid fa-xmark"></i></span>
        </div>
        <div class="modal-body">
          <p class="end-warning-text">提交后将生成评分，无法返回修改。确认提交吗？</p>
        </div>
        <div class="btn-row">
          <button class="btn" @click="showSubmitConfirm = false">继续编辑</button>
          <button class="btn btn-primary" @click="confirmSubmit">确认提交</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useExamStore } from '@/stores/exam'
import { useCountdown } from '@/composables/useCountdown'
import { toast } from '@ai-sp/shared'
import PatientInfoPanel from '@/components/PatientInfoPanel.vue'

const store = useExamStore()
const cd = useCountdown(1200)
const leftTab = ref('info')
const recordText = ref('')
const showSubmitConfirm = ref(false)

const allChatMsgs = computed(() => {
  const msgs = []
  const dm = store.dialogueMessages
  Object.values(dm).forEach(arr => { if (arr && arr.length) msgs.push(...arr.map(m => ({ ...m }))) })
  return msgs
})

function submitRecord() {
  if (!recordText.value.trim()) {
    toast.show('请撰写病历', 'warning')
    return
  }
  store.writingContent = recordText.value
  showSubmitConfirm.value = true
}

function confirmSubmit() {
  showSubmitConfirm.value = false
  store.setPage('complete')
}

onMounted(() => cd.start())
onUnmounted(() => cd.stop())
</script>

<style scoped>
/* === 页面容器 === */
.medical-record-page { position: relative; width: 100%; height: 100%; overflow: hidden; background: linear-gradient(180deg, #e8edf2 0%, #dce3ea 100%); }

/* === Topbar — 拷贝 TrainingTopBar === */
.training-topbar { position: relative; display: flex; align-items: center; justify-content: center; padding: 10px 24px; background: rgba(220, 227, 234, 0.94); backdrop-filter: blur(8px); z-index: 10; border-bottom: 1px solid rgba(0,0,0,0.05); }
.station-left { position: absolute; left: 24px; display: flex; align-items: center; gap: 10px; }
.station-name { font-weight: 600; font-size: 15px; white-space: nowrap; color: #606266; letter-spacing: 0.02em; }
.topbar-center { display: flex; align-items: center; }
.topbar-title { font-weight: 700; font-size: 16px; color: #303133; }
.topbar-right { position: absolute; right: 24px; display: flex; align-items: center; gap: 14px; flex-shrink: 0; }
.timer { font-size: 14px; font-weight: 600; color: #606266; white-space: nowrap; background: rgba(255,255,255,0.7); padding: 5px 14px; border-radius: 14px; font-variant-numeric: tabular-nums; }
.timer.warning { background: #fdf6ec; color: #E6A23C; }
.timer.danger { background: #fef0f0; color: #F56C6C; }
.end-btn { background: #f56c6c; color: #fff; border: none; padding: 6px 16px; border-radius: 8px; cursor: pointer; font-size: 13px; white-space: nowrap; font-weight: 500; transition: background 0.15s, box-shadow 0.15s; }
.end-btn:hover { background: #e04545; box-shadow: 0 2px 8px rgba(245,108,108,0.3); }

/* === Body — 拷贝训练端 MedicalRecord === */
.body-area { position: absolute; top: 58px; left: 0; right: 0; bottom: 0; display: flex; gap: 16px; padding: 14px; }
.left-panel { flex: 0 0 35%; background: rgba(255,255,255,0.96); backdrop-filter: blur(8px); border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
.right-panel { flex: 1; background: rgba(255,255,255,0.96); backdrop-filter: blur(8px); border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 4px 20px rgba(0,0,0,0.08); padding: 24px; }

.panel-tabs { display: flex; border-bottom: 1px solid #EBEEF5; flex-shrink: 0; }
.panel-tab { flex: 1; text-align: center; padding: 12px 8px; font-size: 13px; cursor: pointer; color: #909399; transition: all .15s; }
.panel-tab.active { color: #409EFF; border-bottom: 2px solid #409EFF; }
.panel-content { padding: 12px; overflow-y: auto; flex: 1; }

/* === Chat bubbles === */
.chat-bubble-row { display: flex; align-items: flex-start; gap: 6px; margin-bottom: 6px; }
.chat-bubble-row.user { justify-content: flex-end; }
.chat-bubble-row.sp { justify-content: flex-start; }
.chat-bubble-avatar { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; flex-shrink: 0; }
.chat-bubble-avatar.sp { background: #67C23A; color: #fff; }
.chat-bubble-avatar.user { background: #409EFF; color: #fff; }
.chat-bubble-card { max-width: 80%; padding: 6px 10px; border-radius: 10px; font-size: 12px; line-height: 1.5; word-break: break-word; }
.chat-bubble-card.sp { background: #f5f7fa; color: #303133; border: 1px solid #EBEEF5; }
.chat-bubble-card.user { background: #409EFF; color: #fff; }
.chat-bubble-time { font-size: 10px; color: #C0C4CC; margin-bottom: 2px; }
.chat-bubble-text { word-break: break-word; }
.history-chat-list { max-height: 100%; overflow-y: auto; }
.empty-state { color: #C0C4CC; text-align: center; padding: 20px; }

/* === Diagnosis/Treatment section — 拷贝训练端 === */
.diag-tx-section { margin-bottom: 16px; }
.section-label { font-size: 12px; font-weight: 600; color: #409EFF; margin-bottom: 4px; margin-top: 12px; }
.section-label:first-child { margin-top: 0; }
.section-value { font-size: 12px; color: #303133; white-space: pre-wrap; }

/* === Record area — 拷贝训练端 === */
.record-area { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
.record-title { text-align: center; font-size: 18px; font-weight: 700; color: #303133; margin-bottom: 16px; flex-shrink: 0; }
.record-textarea { flex: 1; width: 100%; min-height: 300px; padding: 14px; border: 1px solid #DCDFE6; border-radius: 8px; font-size: 13px; line-height: 1.8; resize: none; box-sizing: border-box; }
.record-textarea:focus { border-color: #409EFF; outline: none; }
.form-footer { flex-shrink: 0; text-align: center; padding-top: 16px; }
.btn-submit { padding: 12px 32px; font-size: 15px; }

/* === Buttons — 拷贝训练端 === */
.btn { padding: 8px 20px; border: 1px solid #DCDFE6; border-radius: 8px; background: #fff; cursor: pointer; font-size: 13px; transition: all .15s; }
.btn:hover { border-color: #409EFF; color: #409EFF; }
.btn-primary { background: #409EFF; color: #fff; border-color: #409EFF; }
.btn-primary:hover { color: #fff; background: #337ecc; border-color: #337ecc; }

/* === Modal — 拷贝 StationModals === */
.modal-overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.4); display: flex; align-items: center; justify-content: center; z-index: 200; }
.modal-container { background: #fff; border-radius: 12px; padding: 24px; width: 90%; box-shadow: 0 8px 40px rgba(0, 0, 0, 0.12); }
.modal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.modal-header h3 { margin: 0; font-size: 16px; font-weight: 600; }
.modal-close { cursor: pointer; font-size: 18px; color: #909399; transition: all .15s; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; border-radius: 50%; }
.modal-close:hover { color: #F56C6C; background: rgba(245,108,108,0.08); }
.modal-body { margin-bottom: 16px; }
.end-warning-text { color: #909399; font-size: 13px; }
.btn-row { display: flex; gap: 12px; justify-content: center; }

/* === Portrait mode === */
.portrait .body-area { flex-direction: column; gap: 10px; }
.portrait .left-panel { flex: 0 0 auto; max-height: 32%; }
.portrait .right-panel { flex: 1; padding: 16px; }
.portrait .record-textarea { min-height: 150px; }
.portrait .record-title { font-size: 16px; margin-bottom: 10px; }
.portrait .form-footer { padding-top: 10px; }
.portrait .btn-submit { padding: 10px 24px; font-size: 14px; }
.portrait .training-topbar { padding: 6px 12px; }
.portrait .station-name { font-size: 13px; }
.portrait .timer { font-size: 12px; padding: 4px 10px; }
.portrait .end-btn { font-size: 12px; padding: 4px 12px; }
</style>
