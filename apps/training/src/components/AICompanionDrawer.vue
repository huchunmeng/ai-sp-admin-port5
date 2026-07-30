<template>
  <div class="companion-float-wrapper">
    <!-- 浮动触发按钮 — 右侧中上位置，与FloatInfoPanel高度一致 -->
    <div class="companion-trigger" :class="{ active: open }" @click="open = !open" title="AI伴学">
      <img :src="companionImg" class="trigger-img" />
    </div>

    <!-- 展开面板 -->
    <div v-if="open" class="companion-panel">
      <div class="panel-header">
        <span class="panel-tab" :class="{ active: activeTab === 'qa' }" @click="activeTab = 'qa'">
          <i class="fa-solid fa-comments"></i> AI伴学
        </span>
        <span class="panel-tab" :class="{ active: activeTab === 'commentary' }" @click="activeTab = 'commentary'">
          <i class="fa-solid fa-star"></i> 专家点评
        </span>
        <span class="panel-close" @click="open = false"><i class="fa-solid fa-xmark"></i></span>
      </div>

      <div class="panel-body">
        <!-- 智能问答 -->
        <div v-show="activeTab === 'qa'" class="tab-content">
          <div class="qa-messages" ref="qaContainer">
            <div v-for="(msg, i) in qaMessages" :key="i" :class="['qa-msg', msg.type]">
              <span v-if="msg.type === 'ai'" class="qa-msg-avatar">🤖</span>
              <div class="qa-msg-content">
                <div class="qa-msg-bubble" v-html="msg.html || msg.text"></div>
                <div v-if="msg.type === 'ai' && msg.followUps && msg.followUps.length && i === qaMessages.length - 1" class="followup-chips">
                  <button v-for="fq in msg.followUps" :key="fq" class="followup-chip" @click="askQuestion(fq)">{{ fq }}</button>
                </div>
              </div>
            </div>
            <div v-if="aiLoading" class="qa-msg ai typing">
              <span class="qa-msg-avatar">🤖</span>
              <div class="qa-msg-bubble"><span class="typing-dots"><i></i><i></i><i></i></span></div>
            </div>
          </div>
          <div class="qa-input-row">
            <input v-model="qaInput" class="input" placeholder="输入你的问题..." @keydown.enter="askQuestion()" :disabled="aiLoading">
            <button class="btn btn-primary btn-sm" @click="askQuestion()" :disabled="aiLoading">
              <i v-if="aiLoading" class="fa-solid fa-spinner fa-spin"></i>
              <i v-else class="fa-solid fa-paper-plane"></i>
            </button>
          </div>
        </div>

        <!-- 专家点评 -->
        <div v-show="activeTab === 'commentary'" class="tab-content commentary-tab">
          <!-- 加载中 -->
          <div v-if="expertLoading" style="text-align:center;padding:40px 20px;">
            <div class="spinner" style="margin:0 auto 16px;"></div>
            <p style="color:var(--text-tertiary);font-size:13px;">正在加载专家点评...</p>
          </div>

          <!-- 无专家点评 -->
          <div v-else-if="!expertData" class="expert-empty">
            <div class="expert-empty-icon"><i class="fa-solid fa-star"></i></div>
            <p class="expert-empty-title">该病例暂无专家点评</p>
            <p class="expert-empty-desc">此功能仅对指定病例开放，由专家结合病例内容和学员操作进行个性化点评。</p>
          </div>

          <!-- 有专家点评 -->
          <div v-else class="commentary-single">
            <!-- 专家信息 -->
            <div class="expert-profile">
              <div class="expert-avatar-icon">
                <img v-if="expertData.expertAvatar" :src="expertData.expertAvatar" @error="e => e.target.style.display='none'" />
                <i v-else class="fa-solid fa-user-tie"></i>
              </div>
              <div class="expert-meta">
                <div class="expert-name">{{ expertData.expertName }}</div>
                <div class="expert-dept">{{ expertData.expertTitle }}</div>
                <div class="expert-tags">
                  <span v-for="tag in expertData.expertTags" :key="tag" class="expert-tag">{{ tag }}</span>
                </div>
              </div>
            </div>

            <!-- 统一对话区 -->
            <div class="expert-chat">
              <div v-if="expertMessages.length === 0" class="suggested-qs">
                <button v-for="q in expertSuggestedQuestions" :key="q" class="suggested-q" @click="askExpertQuestion(q)">{{ q }}</button>
              </div>
              <div class="expert-chat-messages" ref="expertQaContainer">
                <div v-for="(msg, i) in expertMessages" :key="i" :class="['qa-msg', msg.type]">
                  <div class="qa-msg-avatar" v-if="msg.type === 'ai'">
                    <img v-if="expertData.expertAvatar" :src="expertData.expertAvatar" @error="e => e.target.style.display='none'" />
                    <i v-else class="fa-solid fa-user-tie"></i>
                  </div>
                  <div class="qa-msg-content">
                    <div class="qa-msg-bubble" v-html="msg.html || msg.text"></div>
                    <div v-if="msg.type === 'ai' && msg.followUps && msg.followUps.length && i === expertMessages.length - 1" class="followup-chips">
                      <button v-for="fq in msg.followUps" :key="fq" class="followup-chip" @click="askExpertQuestion(fq)">{{ fq }}</button>
                    </div>
                  </div>
                </div>
                <div v-if="expertAiLoading" class="qa-msg ai typing">
                  <div class="qa-msg-avatar">
                    <img v-if="expertData.expertAvatar" :src="expertData.expertAvatar" @error="e => e.target.style.display='none'" />
                    <i v-else class="fa-solid fa-user-tie"></i>
                  </div>
                  <div class="qa-msg-bubble"><span class="typing-dots"><i></i><i></i><i></i></span></div>
                </div>
              </div>
              <div class="qa-input-row">
                <input v-model="expertInput" class="input" placeholder="向专家提问..." @keydown.enter="askExpertQuestion()" :disabled="expertAiLoading">
                <button class="btn btn-primary btn-sm" @click="askExpertQuestion()" :disabled="expertAiLoading">
                  <i v-if="expertAiLoading" class="fa-solid fa-spinner fa-spin"></i>
                  <i v-else class="fa-solid fa-paper-plane"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useTrainingStore } from '@/stores/training'
import { useCaseLoader } from '@/composables/useCaseLoader'
import { useExpertAgent } from '@/composables/useExpertAgent'
import { useAICompanion } from '@/composables/useAICompanion'
import { getStationLabel } from '@ai-sp/shared'

const store = useTrainingStore()
const route = useRoute()
const { getCached } = useCaseLoader()
const { askCompanion, companionLoading: aiLoading } = useAICompanion()
const { askExpert, expertAiLoading } = useExpertAgent()

const open = ref(false)
const activeTab = ref('qa')
const qaInput = ref('')
const qaContainer = ref(null)
const companionImg = '/images/avatars/' + encodeURIComponent('AI学伴.png')

// ── Station context ──
const stationLabel = computed(() => getStationLabel(route.name) || '')

// ── Case info helper ──
function getCaseInfo() {
  const c = store.currentCase || getCached(store.currentCase?.caseId || store.currentCase?.id)
  if (!c) return null
  const basic = c.basic || c
  const p = basic.patient || basic
  return {
    name: p.name || '',
    age: p.age || '',
    gender: p.gender || (basic.gender || ''),
    chiefComplaint: basic.chiefComplaint || c.chiefComplaint || '',
    disease: basic.disease || c.disease || '',
    specialty: basic.specialty || c.specialty || '',
  }
}

// ── Suggested questions per station ──
const stationQuestionMap = {
  historyTaking: [
    '接下来应该问哪些问题？',
    '哪些关键病史信息不能遗漏？',
    '如何根据已有信息缩小鉴别诊断范围？',
    '这个症状的可能病因有哪些？',
  ],
  physicalExam: [
    '应该重点检查哪些体征？',
    '这些体征的临床意义是什么？',
    '如何通过体格检查进一步鉴别诊断？',
  ],
  ancillaryTests: [
    '需要安排哪些辅助检查？',
    '这些检查项目的选择依据是什么？',
    '如何解读这些检查结果？',
  ],
  diagnosis: [
    '最可能的诊断是什么？',
    '需要与哪些疾病进行鉴别？',
    '诊断依据有哪些？',
  ],
  treatmentPlan: [
    '该病例的治疗原则是什么？',
    '有哪些可选的治疗方案？',
    '如何制定个体化的治疗计划？',
  ],
  medicalRecord: [
    '病历书写的要点有哪些？',
    '如何规范书写入院记录？',
  ],
  caseAnalysis: [
    '这个病例的临床特点是什么？',
    '诊断思路应该如何展开？',
    '有哪些需要特别注意的陷阱？',
  ],
  humanisticComm: [
    '如何与患者进行有效沟通？',
    '沟通中需要注意哪些人文关怀要点？',
  ],
  mentalExam: [
    '精神检查的要点有哪些？',
    '如何评估患者的精神状态？',
  ],
}

const defaultQuestions = [
  '这个病例的关键点是什么？',
  '我应该从哪些方面入手？',
  '有哪些容易遗漏的地方？',
]

const suggestedQuestions = computed(() => {
  return stationQuestionMap[route.name] || defaultQuestions
})

// ── Chat messages ──
const qaMessages = ref([
  { type: 'ai', text: '你好！我是AI伴学助手，可以针对当前病例和考站为你解答。请随时提问。', html: '', followUps: [] },
])
// 初始化开场白的推荐问题
qaMessages.value[0].html = renderMsgText(qaMessages.value[0].text)
qaMessages.value[0].followUps = suggestedQuestions.value

async function askQuestion(q) {
  const question = typeof q === 'string' ? q : qaInput.value.trim()
  if (!question || aiLoading.value) return

  qaMessages.value.push({ type: 'user', text: question })
  qaInput.value = ''
  scrollToBottom()

  const response = await askCompanion(
    getCaseInfo(),
    stationLabel.value,
    route.name,
    store.trainingSession,
    qaMessages.value,
    question
  )

  if (response) {
    qaMessages.value.push({
      type: 'ai',
      text: response.text,
      html: renderMsgText(response.text),
      followUps: response.followUps,
    })
  }
  scrollToBottom()
}

function scrollToBottom() {
  nextTick(() => { if (qaContainer.value) qaContainer.value.scrollTop = qaContainer.value.scrollHeight })
}

// ── Expert Review ──
const expertData = ref(null)
const expertLoading = ref(false)
const expertMessages = ref([])
const expertInput = ref('')
const expertQaContainer = ref(null)

const expertQuestionMap = {
  historyTaking: [
    '请对我的问诊过程进行综合点评',
    '我的问诊思路有什么需要改进的地方？',
    '这个病例的病史采集要点是什么？',
  ],
  physicalExam: [
    '请对我的体格检查进行综合点评',
    '我的查体过程有哪些遗漏？',
    '这个病例的查体重点是什么？',
  ],
  ancillaryTests: [
    '请对我的辅助检查选择进行综合点评',
    '我选择的检查项目是否合理？',
    '这个病例的辅助检查策略是什么？',
  ],
  diagnosis: [
    '请对我的诊断过程进行综合点评',
    '我的诊断和鉴别诊断是否完善？',
    '这个病例的诊断思路应该如何展开？',
  ],
  preliminaryDiag: [
    '请对我的初步诊断进行综合点评',
    '我的诊断和鉴别诊断是否完善？',
    '这个病例的诊断思路应该如何展开？',
  ],
  treatmentPlan: [
    '请对我的治疗方案进行综合点评',
    '我的治疗计划是否合理完善？',
    '这个病例的治疗要点是什么？',
  ],
  medicalRecord: [
    '请对我的病历书写进行综合点评',
    '我的病历有哪些需要完善的地方？',
    '规范病历书写的要点是什么？',
  ],
  caseAnalysis: [
    '请对我的病例分析进行综合点评',
    '我的诊断思路有什么问题？',
    '这个病例的鉴别诊断要点是什么？',
  ],
  humanisticComm: [
    '请对我的沟通表现进行综合点评',
    '我在人文关怀方面有哪些不足？',
    '这个病例的医患沟通要点是什么？',
  ],
  mentalExam: [
    '请对我的精神检查进行综合点评',
    '我的精神检查有什么遗漏？',
    '这个病例的精神检查要点是什么？',
  ],
}

const defaultExpertQuestions = [
  '请对我的操作进行综合点评',
  '在这个病例中我有哪些不足？',
  '这个病例的核心临床要点是什么？',
]

const expertSuggestedQuestions = computed(() => {
  return expertQuestionMap[route.name] || defaultExpertQuestions
})

function renderMsgText(text) {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/^|$/g, '<p>')
    .replace(/<p><\/p>/g, '')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(?:^|\n)#{1,3}\s*(.+?)(?:\n|$)/g, (_, title) => `<h4 style="font-weight:600;margin:14px 0 6px;color:#1f2937;">${title}</h4>`)
}

async function loadExpertData() {
  if (expertData.value || expertLoading.value) return
  expertLoading.value = true
  try {
    const caseData = store.currentCase || getCached(store.currentCase?.caseId || store.currentCase?.id)
    const caseId = caseData?.caseId || store.currentCase?.case_id || store.currentCase?.id
    if (!caseId) { expertLoading.value = false; return }

    // Try cache first
    if (caseData?.expert) {
      expertData.value = caseData.expert
      expertLoading.value = false
      return
    }

    // Fetch expert data directly
    const resp = await fetch(`/data/cases/${caseId}-expert.json`)
    if (resp.ok) {
      const json = await resp.json()
      if (json.expertEnabled || json.enabled) {
        expertData.value = {
          expertName: json.expertName || '',
          expertTitle: json.expertTitle || '',
          expertAvatar: json.expertAvatar || '',
          expertTags: json.expertTags || [],
          expertKB: json.expertKB || '',
          reviewTitle: json.reviewTitle || ''
        }
      }
    }
  } catch { /* no expert data available */ }
  expertLoading.value = false
}

async function askExpertQuestion(q) {
  const question = typeof q === 'string' ? q : expertInput.value.trim()
  if (!question || expertAiLoading.value || !expertData.value) return

  expertMessages.value.push({ type: 'user', text: question })
  if (typeof q === 'string') expertInput.value = ''
  else expertInput.value = ''
  scrollExpertToBottom()

  const response = await askExpert(
    expertData.value,
    getCaseInfo(),
    stationLabel.value,
    route.name,
    store.trainingSession,
    expertMessages.value,
    question
  )

  if (response) {
    expertMessages.value.push({
      type: 'ai',
      text: response.text,
      html: renderMsgText(response.text),
      followUps: response.followUps,
    })
  }
  scrollExpertToBottom()
}

function scrollExpertToBottom() {
  nextTick(() => {
    if (expertQaContainer.value) expertQaContainer.value.scrollTop = expertQaContainer.value.scrollHeight
  })
}

// Watch tab switch to load expert data
watch(() => activeTab.value, (tab) => {
  if (tab === 'commentary') loadExpertData()
})

defineExpose({ open })
</script>

<style scoped>
.companion-float-wrapper {
  position: absolute; top: 60px; right: 16px; z-index: 10;
}

/* 触发按钮 — 圆形，与FloatInfoPanel一致 */
.companion-trigger {
  width: 42px; height: 42px; border-radius: 50%;
  background: rgba(255,255,255,0.94); border: 1px solid rgba(0,0,0,0.06);
  box-shadow: 0 2px 12px rgba(0,0,0,0.15);
  cursor: pointer; overflow: hidden;
  transition: all .2s;
  display: flex; align-items: center; justify-content: center;
}
.companion-trigger:hover { transform: scale(1.08); box-shadow: 0 4px 16px rgba(0,0,0,0.18); }
.companion-trigger.active { box-shadow: 0 0 0 3px rgba(64,158,255,0.3); border-color: #409EFF; }
.trigger-img { width: 100%; height: 100%; object-fit: cover; }

/* 展开面板 — 从右侧向左展开 */
.companion-panel {
  position: absolute; top: 0; right: 56px;
  width: 400px; height: calc(100vh - 80px); max-height: calc(100vh - 80px);
  background: rgba(255,255,255,0.97); border-radius: 12px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.15);
  display: flex; flex-direction: column; overflow: hidden;
  backdrop-filter: blur(8px); border: 1px solid rgba(0,0,0,0.06);
}

.panel-header {
  display: flex; align-items: center; border-bottom: 1px solid #EBEEF5; flex-shrink: 0;
}
.panel-tab {
  flex: 1; text-align: center; padding: 12px 6px; font-size: 13px;
  cursor: pointer; color: #909399; transition: all .15s;
  display: flex; align-items: center; justify-content: center; gap: 5px;
}
.panel-tab.active { color: #409EFF; border-bottom: 2px solid #409EFF; }
.panel-close {
  padding: 8px 14px; cursor: pointer; color: #909399; font-size: 16px; flex-shrink: 0;
  transition: color .15s;
}
.panel-close:hover { color: #F56C6C; }

.panel-body { flex: 1; overflow-y: auto; }

.tab-content { padding: 16px; display: flex; flex-direction: column; height: 100%; }

.suggested-qs { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; flex-shrink: 0; }
.suggested-q {
  font-size: 11px; padding: 4px 10px; border-radius: 12px;
  background: #ecf5ff; color: #409EFF; cursor: pointer;
  border: none; font-family: inherit; transition: .15s;
}
.suggested-q:hover { background: #d9ecff; }

.qa-messages { flex: 1; display: flex; flex-direction: column; gap: 10px; overflow-y: auto; margin-bottom: 12px; min-height: 160px; }
.qa-msg { max-width: 90%; display: flex; gap: 8px; align-items: flex-start; }
.qa-msg.user { align-self: flex-end; flex-direction: row-reverse; }
.qa-msg.ai { align-self: flex-start; }
.qa-msg-avatar {
  width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0;
  background: #dbeafe; color: #2563eb;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; overflow: hidden;
}
.qa-msg-avatar img { width: 100%; height: 100%; object-fit: cover; }
.qa-msg-bubble { padding: 8px 12px; border-radius: 12px; font-size: 13px; line-height: 1.6; }
.qa-msg.user .qa-msg-bubble { background: #ecf5ff; color: #1f2937; }
.qa-msg.ai .qa-msg-bubble { background: #f9fafb; border: 1px solid #e5e7eb; color: #374151; }
.qa-msg.typing .qa-msg-bubble { padding: 12px 16px; }
.typing-dots { display: flex; gap: 4px; align-items: center; }
.typing-dots i {
  width: 6px; height: 6px; border-radius: 50%;
  background: #c0c4cc; display: inline-block;
  animation: typingBounce 1.2s infinite ease-in-out;
}
.typing-dots i:nth-child(2) { animation-delay: 0.2s; }
.typing-dots i:nth-child(3) { animation-delay: 0.4s; }
@keyframes typingBounce {
  0%, 60%, 100% { transform: translateY(0); }
  30% { transform: translateY(-6px); }
}

.qa-input-row { display: flex; gap: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb; flex-shrink: 0; }
.qa-input-row .input {
  flex: 1; height: 38px; padding: 0 14px;
  border: 1px solid #DCDFE6; border-radius: 8px; font-size: 13px;
  font-family: inherit; outline: none; transition: border-color .15s;
}
.qa-input-row .input:focus { border-color: #409EFF; }

.commentary-tab { padding: 0 !important; }

.commentary-single { display: flex; flex-direction: column; height: 100%; }

/* ─── 无专家点评 ─── */
.expert-empty { text-align: center; padding: 40px 24px; }
.expert-empty-icon { font-size: 36px; color: #d1d5db; margin-bottom: 12px; }
.expert-empty-title { font-size: 14px; color: #6b7280; margin-bottom: 6px; font-weight: 500; }
.expert-empty-desc { font-size: 12px; color: #9ca3af; line-height: 1.6; }

/* ─── 专家信息 ─── */
.expert-profile {
  display: flex; align-items: flex-start; gap: 12px;
  padding: 16px; background: linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%);
  border-bottom: 1px solid #e5e7eb; flex-shrink: 0;
}
.expert-avatar-icon {
  width: 48px; height: 48px; border-radius: 50%;
  background: #dbeafe; color: #2563eb;
  display: flex; align-items: center; justify-content: center;
  font-size: 20px; flex-shrink: 0; overflow: hidden;
}
.expert-avatar-icon img { width: 100%; height: 100%; object-fit: cover; }
.expert-meta { min-width: 0; }
.expert-name { font-size: 15px; font-weight: 700; color: #1f2937; }
.expert-dept { font-size: 11px; color: #6b7280; margin-top: 2px; }
.expert-tags { display: flex; gap: 6px; margin-top: 6px; flex-wrap: wrap; }
.expert-tag {
  font-size: 10px; padding: 2px 8px; border-radius: 10px;
  background: #dbeafe; color: #1d4ed8; font-weight: 500;
}

/* ─── 专家点评统一对话区 ─── */
.expert-chat { flex: 1; display: flex; flex-direction: column; min-height: 0; overflow: hidden; }
.expert-chat .suggested-qs { padding: 10px 16px; flex-shrink: 0; }
.expert-chat-messages { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; padding: 0 16px; min-height: 80px; }
.expert-chat .qa-input-row { padding: 8px 16px; flex-shrink: 0; }

.qa-msg-content { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.followup-chips { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 2px; }
.followup-chip {
  font-size: 11px; padding: 4px 10px; border-radius: 12px;
  background: #f0f5ff; color: #409EFF; cursor: pointer;
  border: 1px solid #d9ecff; font-family: inherit; transition: .15s;
  white-space: nowrap;
}
.followup-chip:hover { background: #d9ecff; border-color: #b3d8ff; }

/* ─── Spinner ─── */
.spinner {
  width: 32px; height: 32px;
  border: 3px solid #e5e7eb; border-top-color: #409EFF;
  border-radius: 50%; animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
