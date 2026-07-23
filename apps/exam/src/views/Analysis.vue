<template>
  <div class="case-analysis-page" :class="{ portrait: store.portraitMode }">
    <div class="training-topbar">
      <div class="station-left">
        <span class="station-name">临床思维站</span>
      </div>
      <div class="topbar-center">
        <span class="topbar-title">病例分析</span>
      </div>
      <div class="topbar-right">
        <span class="timer" :class="cd.status">{{ cd.display }}</span>
        <button class="end-btn" @click="checkSubmit">
          <i class="fa-solid fa-check"></i> 提交
        </button>
      </div>
    </div>

    <div class="body-area">
      <div class="left-panel">
        <div class="panel-header">
          <i class="fa-solid fa-file-lines"></i> 病例信息
        </div>
        <div class="panel-content">
          <div class="case-full-text">{{ currentPhasedText }}</div>
        </div>
      </div>

      <div class="right-panel">
        <div class="qa-area">
          <div class="qa-nav">
            <span v-for="(q, qi) in store.analysisQuestions" :key="qi"
                  class="qa-dot"
                  :class="{ active: activeIdx === qi, done: q.done }"
                  @click="q.done ? store.selectAnalysisQuestion(q.id) : null">
              {{ qi + 1 }}
            </span>
          </div>
          <div class="qa-card">
            <div class="qa-question">{{ activeQ.text }}</div>
            <div class="qa-input-wrap">
              <textarea
                v-model="activeQ.answer"
                placeholder="请输入"
                class="qa-textarea"
              ></textarea>
              <button class="voice-btn" :class="{ recording: isRecording }" @click="toggleVoice" :title="isRecording ? '停止录音' : '语音输入'">
                <i :class="isRecording ? 'fa-solid fa-stop' : 'fa-solid fa-microphone'"></i>
              </button>
            </div>
          </div>
        </div>
        <div class="qa-footer">
          <button v-if="activeIdx < store.analysisQuestions.length - 1" class="btn btn-primary" @click="nextQuestion">
            下一题 <i class="fa-solid fa-chevron-right"></i>
          </button>
          <button v-else class="btn btn-primary" @click="checkSubmit">
            <i class="fa-solid fa-check"></i> 提交
          </button>
        </div>
      </div>
    </div>

    <div v-if="showSubmitConfirm" class="modal-overlay" @click.self="showSubmitConfirm = false">
      <div class="modal-container">
        <div class="modal-header">
          <h3>确认提交病例分析</h3>
          <span class="modal-close" @click="showSubmitConfirm = false"><i class="fa-solid fa-xmark"></i></span>
        </div>
        <div class="modal-body">
          <p class="end-warning">提交后无法返回修改，确认提交吗？</p>
        </div>
        <div class="btn-row">
          <button class="btn" @click="showSubmitConfirm = false">继续作答</button>
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

const store = useExamStore()
const cd = useCountdown(1200)
const showSubmitConfirm = ref(false)
const isRecording = ref(false)

let recognition = null
function toggleVoice() {
  if (isRecording.value) {
    stopVoice()
    return
  }
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!SpeechRecognition) {
    toast.show('当前浏览器不支持语音识别', 'warning')
    return
  }
  recognition = new SpeechRecognition()
  recognition.lang = 'zh-CN'
  recognition.interimResults = true
  recognition.continuous = true
  recognition.onresult = function(e) {
    let transcript = ''
    for (let i = e.resultIndex; i < e.results.length; i++) {
      transcript += e.results[i][0].transcript
    }
    activeQ.value.answer = (activeQ.value.answer || '') + transcript
  }
  recognition.onerror = function(e) {
    if (e.error !== 'aborted') toast.show('语音识别出错: ' + e.error, 'warning')
    isRecording.value = false
  }
  recognition.onend = function() { isRecording.value = false }
  recognition.start()
  isRecording.value = true
}

function stopVoice() {
  if (recognition) { recognition.abort(); recognition = null }
  isRecording.value = false
}

const activeIdx = computed(() => {
  const qs = store.analysisQuestions
  const idx = qs.findIndex(q => q.id === store.activeAnalysisQuestion)
  return idx >= 0 ? idx : 0
})

const currentPhasedText = computed(() => {
  if (!store.analysisPhased || !store.analysisPhased.length) return ''
  const qs = store.analysisQuestions
  const phase = qs[activeIdx.value]?.phase || 0
  return store.analysisPhased.slice(0, phase + 1).join('\n\n')
})

const activeQ = computed(() => {
  return store.analysisQuestions[activeIdx.value] || store.analysisQuestions[0]
})

function nextQuestion() {
  const cur = activeQ.value
  if (!cur.answer || !cur.answer.trim()) {
    toast.show('请先填写当前题目', 'warning')
    return
  }
  cur.done = true
  if (activeIdx.value < store.analysisQuestions.length - 1) {
    store.selectAnalysisQuestion(store.analysisQuestions[activeIdx.value + 1].id)
  }
}

function checkSubmit() {
  const cur = activeQ.value
  if (!cur.answer || !cur.answer.trim()) {
    toast.show('请先填写当前题目', 'warning')
    return
  }
  cur.done = true
  showSubmitConfirm.value = true
}

function confirmSubmit() {
  showSubmitConfirm.value = false
  store.setPage('complete')
}

onMounted(() => cd.start())
onUnmounted(() => { cd.stop(); stopVoice() })
</script>

<style scoped>
.case-analysis-page { position: relative; width: 100%; height: 100%; overflow: hidden; background: linear-gradient(180deg, #e8edf2 0%, #dce3ea 100%); }

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

.body-area { position: absolute; top: 58px; left: 0; right: 0; bottom: 0; display: flex; gap: 16px; padding: 14px; }
.left-panel { flex: 0 0 35%; background: rgba(255,255,255,0.96); backdrop-filter: blur(8px); border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; border: 1px solid #EBEEF5; }
.right-panel { flex: 1; background: rgba(255,255,255,0.96); backdrop-filter: blur(8px); border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; border: 1px solid #EBEEF5; }

.panel-header { padding: 12px; font-size: 14px; font-weight: 600; color: #303133; border-bottom: 1px solid #EBEEF5; flex-shrink: 0; display: flex; align-items: center; gap: 6px; }
.panel-content { padding: 12px; overflow-y: auto; flex: 1; }
.case-full-text { font-size: 13px; color: #303133; line-height: 1.8; white-space: pre-wrap; }

.qa-area { flex: 1; display: flex; flex-direction: column; overflow: hidden; padding: 24px; }
.qa-nav { display: flex; gap: 8px; justify-content: center; margin-bottom: 16px; flex-shrink: 0; }
.qa-dot { width: 32px; height: 32px; border-radius: 50%; background: #DCDFE6; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 600; cursor: default; transition: all .15s; }
.qa-dot.active { background: #409EFF; transform: scale(1.1); box-shadow: 0 2px 8px rgba(64,158,255,0.3); }
.qa-dot.done { background: #67C23A; cursor: pointer; }
.qa-dot.done:hover { transform: scale(1.1); }
.qa-card { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
.qa-question { font-size: 15px; font-weight: 600; color: #303133; margin-bottom: 12px; flex-shrink: 0; }
.qa-input-wrap { flex: 1; display: flex; flex-direction: column; gap: 10px; align-items: center; }
.qa-textarea { flex: 1; width: 100%; min-height: 120px; padding: 12px; border: none; border-radius: 8px; font-size: 13px; line-height: 1.6; resize: none; box-sizing: border-box; outline: none; background: #f8f9fa; -webkit-appearance: none; }
.qa-textarea:focus { outline: none; box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2); background: #fff; }
.voice-btn { width: 48px; height: 48px; border-radius: 50%; border: 1px solid #d9d9d9; background: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 18px; color: #909399; flex-shrink: 0; transition: all .15s; }
.voice-btn:hover { border-color: #409eff; color: #409eff; }
.voice-btn.recording { background: #f56c6c; border-color: #f56c6c; color: #fff; animation: pulse 1.2s infinite; }
@keyframes pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(245,108,108,0.4); } 50% { box-shadow: 0 0 0 8px rgba(245,108,108,0); } }
.qa-footer { display: flex; gap: 8px; padding: 0 24px 24px; flex-shrink: 0; }

.btn { padding: 8px 20px; border: 1px solid #DCDFE6; border-radius: 8px; background: #fff; cursor: pointer; font-size: 13px; transition: all .15s; }
.btn:hover { border-color: #409EFF; color: #409EFF; }
.btn-primary { background: #409EFF; color: #fff; border-color: #409EFF; }
.btn-primary:hover { color: #fff; background: #337ecc; border-color: #337ecc; }

.modal-overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.4); display: flex; align-items: center; justify-content: center; z-index: 200; }
.modal-container { background: #fff; border-radius: 12px; padding: 24px; width: 90%; max-width: 480px; box-shadow: 0 8px 40px rgba(0, 0, 0, 0.12); }
.modal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.modal-header h3 { margin: 0; font-size: 16px; font-weight: 600; }
.modal-close { cursor: pointer; font-size: 18px; color: #909399; transition: all .15s; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; border-radius: 50%; }
.modal-close:hover { color: #F56C6C; background: rgba(245,108,108,0.08); }
.modal-body { margin-bottom: 16px; }
.end-warning { color: #909399; font-size: 13px; }
.btn-row { display: flex; gap: 12px; justify-content: center; }

.portrait .body-area { flex-direction: column; gap: 10px; }
.portrait .left-panel { flex: 0 0 auto; max-height: 28%; }
.portrait .right-panel { flex: 1; }
.portrait .qa-area { padding: 16px; }
.portrait .qa-nav { margin-bottom: 10px; }
.portrait .qa-dot { width: 28px; height: 28px; font-size: 11px; }
.portrait .qa-textarea { min-height: 100px; font-size: 12px; }
.portrait .qa-footer { padding: 0 16px 16px; }
.portrait .training-topbar { padding: 6px 12px; }
.portrait .station-name { font-size: 13px; }
.portrait .timer { font-size: 12px; padding: 4px 10px; }
.portrait .end-btn { font-size: 12px; padding: 4px 12px; }
</style>
