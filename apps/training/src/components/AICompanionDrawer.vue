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
          <i class="fa-solid fa-comments"></i> 智能问答
        </span>
        <span class="panel-tab" :class="{ active: activeTab === 'commentary' }" @click="activeTab = 'commentary'">
          <i class="fa-solid fa-star"></i> 专家点评
        </span>
        <span class="panel-close" @click="open = false"><i class="fa-solid fa-xmark"></i></span>
      </div>

      <div class="panel-body">
        <!-- 智能问答 -->
        <div v-show="activeTab === 'qa'" class="tab-content">
          <div class="suggested-qs">
            <button v-for="q in suggestedQuestions" :key="q" class="suggested-q" @click="askQuestion(q)">{{ q }}</button>
          </div>
          <div class="qa-messages" ref="qaContainer">
            <div v-for="(msg, i) in qaMessages" :key="i" :class="['qa-msg', msg.type]">
              <span v-if="msg.type === 'ai'">🤖 </span>{{ msg.text }}
            </div>
            <div v-if="aiLoading" class="qa-msg ai typing">
              <span class="typing-dots"><i></i><i></i><i></i></span>
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
              <div class="expert-avatar-icon"><i class="fa-solid fa-user-tie"></i></div>
              <div class="expert-meta">
                <div class="expert-name">{{ expertData.expertName }}</div>
                <div class="expert-dept">{{ expertData.expertTitle }}</div>
                <div class="expert-tags">
                  <span v-for="tag in expertData.expertTags" :key="tag" class="expert-tag">{{ tag }}</span>
                </div>
              </div>
            </div>

            <!-- 点评正文 -->
            <div class="commentary-article">
              <h3 class="article-title">{{ expertData.reviewTitle || '专家教学点评' }}</h3>
              <div class="article-body">
                <div v-if="reviewGenerating" style="text-align:center;padding:20px;">
                  <span class="typing-dots"><i></i><i></i><i></i></span>
                  <p style="color:var(--text-tertiary);font-size:12px;">AI 正在生成点评...</p>
                </div>
                <div v-else-if="reviewContent" v-html="renderedReview"></div>
                <div v-else style="text-align:center;padding:20px;">
                  <button class="btn btn-primary btn-sm" @click="generateExpertReview">生成专家点评</button>
                </div>
              </div>
            </div>

            <!-- 追问区域 -->
            <div v-if="reviewContent" class="expert-qa-section">
              <div class="expert-qa-messages" ref="expertQaContainer">
                <div v-for="(msg, i) in expertMessages" :key="i" :class="['qa-msg', msg.type]">
                  <span v-if="msg.type === 'ai'">🤖 </span>{{ msg.text }}
                </div>
                <div v-if="expertAiLoading" class="qa-msg ai typing">
                  <span class="typing-dots"><i></i><i></i><i></i></span>
                </div>
              </div>
              <div class="qa-input-row">
                <input v-model="expertInput" class="input" placeholder="向专家追问..." @keydown.enter="askExpertQuestion()" :disabled="expertAiLoading">
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
import { useAIChat } from '@/composables/useAIChat'
import { getStationLabel } from '@ai-sp/shared'

const store = useTrainingStore()
const route = useRoute()
const { getCached } = useCaseLoader()
const { sendMessage, loading: aiLoading } = useAIChat()
const { sendMessage: sendExpertMessage, loading: expertAiLoading } = useAIChat()

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

// ── Build system prompt from case + station + dialogue context ──
function buildSystemPrompt() {
  const info = getCaseInfo()
  const parts = []

  parts.push('你是一位临床教学助手，正在帮助医学学员进行临床思维训练。')

  if (info) {
    parts.push(`当前病例信息：`)
    if (info.name) parts.push(`- 患者：${info.name}，${info.gender || '未知'}，${info.age || '未知'}岁`)
    if (info.chiefComplaint) parts.push(`- 主诉：${info.chiefComplaint}`)
    if (info.disease) parts.push(`- 疾病：${info.disease}`)
    if (info.specialty) parts.push(`- 科室：${info.specialty}`)
  }

  if (stationLabel.value) {
    parts.push(`当前考站：${stationLabel.value}`)
  }

  // Add recent dialogue context from training session
  const session = store.trainingSession
  if (session) {
    const recentMsgs = []
    for (const key of Object.keys(session)) {
      const data = session[key]
      if (data && data.messages && Array.isArray(data.messages)) {
        recentMsgs.push(...data.messages)
      }
    }
    if (recentMsgs.length > 0) {
      const lastMsgs = recentMsgs.slice(-8)
      parts.push('学员与SP的最近对话记录：')
      for (const m of lastMsgs) {
        const role = m.role === 'user' ? '学员' : 'SP'
        parts.push(`${role}：${m.content}`)
      }
    }
  }

  parts.push('请用中文回答学员的问题，语言简洁专业，结合病例信息给出具体建议。')
  return parts.join('\n')
}

// ── Chat messages ──
const qaMessages = ref([
  { type: 'ai', text: '你好！我是AI伴学助手，可以针对当前病例和考站为你解答。请随时提问。' },
])

async function askQuestion(q) {
  const question = typeof q === 'string' ? q : qaInput.value.trim()
  if (!question || aiLoading.value) return

  qaMessages.value.push({ type: 'user', text: question })
  qaInput.value = ''
  scrollToBottom()

  const systemPrompt = buildSystemPrompt()
  const llmMessages = qaMessages.value.map(m => ({
    role: m.type === 'user' ? 'user' : 'assistant',
    content: m.text
  }))

  const result = await sendMessage(llmMessages, systemPrompt)
  qaMessages.value.push({ type: 'ai', text: result.content })
  scrollToBottom()
}

function scrollToBottom() {
  nextTick(() => { if (qaContainer.value) qaContainer.value.scrollTop = qaContainer.value.scrollHeight })
}

// ── Expert Review ──
const expertData = ref(null)
const expertLoading = ref(false)
const reviewGenerating = ref(false)
const reviewContent = ref('')
const expertMessages = ref([])
const expertInput = ref('')
const expertQaContainer = ref(null)

const renderedReview = computed(() => {
  if (!reviewContent.value) return ''
  return reviewContent.value
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/^|$/g, '<p>')
    .replace(/<p><\/p>/g, '')
    .replace(/^<p>/, '<p>')
    .replace(/(?:^|\n)#{1,3}\s*(.+?)(?:\n|$)/g, (_, title) => `<h4 style="font-weight:600;margin:14px 0 6px;color:#1f2937;">${title}</h4>`)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/-\s(.+?)(?=<br>|<\/p>)/g, '<li>$1</li>')
})

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
          expertTags: json.expertTags || [],
          expertKB: json.expertKB || '',
          reviewTitle: json.reviewTitle || ''
        }
      }
    }
  } catch { /* no expert data available */ }
  expertLoading.value = false
}

async function generateExpertReview() {
  if (!expertData.value || reviewGenerating.value) return
  reviewGenerating.value = true

  const info = getCaseInfo()
  const parts = ['你是一位顶级临床专家，正在为医学学员撰写教学点评。']

  if (info) {
    parts.push(`病例信息：${info.name}，${info.gender || ''}，${info.age || ''}岁，主诉：${info.chiefComplaint}，疾病：${info.disease}`)
  }

  if (expertData.value.expertName) {
    parts.push(`点评专家：${expertData.value.expertName}（${expertData.value.expertTitle}）`)
  }

  if (expertData.value.expertKB) {
    parts.push(`专家知识库（必须基于此内容进行点评）：\n${expertData.value.expertKB}`)
  }

  // Add student's training context
  const session = store.trainingSession
  if (session) {
    const recentMsgs = []
    for (const key of Object.keys(session)) {
      const data = session[key]
      if (data && data.messages && Array.isArray(data.messages)) {
        recentMsgs.push(...data.messages)
      }
    }
    if (recentMsgs.length > 0) {
      const lastMsgs = recentMsgs.slice(-10)
      parts.push('学员操作记录（据此给出针对性点评）：')
      for (const m of lastMsgs) {
        const role = m.role === 'user' ? '学员' : 'SP'
        parts.push(`${role}：${m.content}`)
      }
    }
  }

  parts.push('请撰写一篇结构清晰的教学点评，包括：学员表现分析、关键知识点讲解、改进建议。用中文输出，语言专业但易读。')

  const result = await sendExpertMessage(
    [{ role: 'user', content: '请为这个病例撰写专家教学点评。' }],
    parts.join('\n'),
    { temperature: 0.5, maxTokens: 3000 }
  )

  reviewContent.value = result.content
  reviewGenerating.value = false
}

async function askExpertQuestion() {
  const q = expertInput.value.trim()
  if (!q || expertAiLoading.value) return

  expertMessages.value.push({ type: 'user', text: q })
  expertInput.value = ''
  scrollExpertToBottom()

  const systemPrompt = [
    '你是一位临床专家，正在回答学员关于病例点评的追问。',
    `之前的点评内容：${reviewContent.value}`,
    `专家知识库：${expertData.value?.expertKB || ''}`,
    '请基于点评内容和知识库，用中文简洁回答学员的问题。'
  ].join('\n')

  const llmMessages = expertMessages.value.map(m => ({
    role: m.type === 'user' ? 'user' : 'assistant',
    content: m.text
  }))

  const result = await sendExpertMessage(llmMessages, systemPrompt)
  expertMessages.value.push({ type: 'ai', text: result.content })
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
.qa-msg { max-width: 90%; padding: 10px 14px; border-radius: 12px; font-size: 13px; line-height: 1.6; }
.qa-msg.user { align-self: flex-end; background: #ecf5ff; color: #1f2937; }
.qa-msg.ai { align-self: flex-start; background: #f9fafb; border: 1px solid #e5e7eb; color: #374151; }
.qa-msg.typing { padding: 14px 18px; }
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
  font-size: 20px; flex-shrink: 0;
}
.expert-meta { min-width: 0; }
.expert-name { font-size: 15px; font-weight: 700; color: #1f2937; }
.expert-dept { font-size: 11px; color: #6b7280; margin-top: 2px; }
.expert-tags { display: flex; gap: 6px; margin-top: 6px; flex-wrap: wrap; }
.expert-tag {
  font-size: 10px; padding: 2px 8px; border-radius: 10px;
  background: #dbeafe; color: #1d4ed8; font-weight: 500;
}

/* ─── 点评正文 ─── */
.commentary-article {
  padding: 16px; overflow-y: auto; flex: 1; min-height: 0;
}
.article-title { font-size: 15px; font-weight: 700; color: #1f2937; margin-bottom: 14px; line-height: 1.4; }
.article-body { font-size: 13px; line-height: 1.8; color: #4b5563; }

/* ─── 追问区域 ─── */
.expert-qa-section {
  border-top: 1px solid #e5e7eb; padding: 12px 16px; flex-shrink: 0;
  display: flex; flex-direction: column; max-height: 200px;
}
.expert-qa-messages { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; margin-bottom: 8px; min-height: 40px; }
.expert-qa-section .qa-input-row { border-top: none; padding-top: 0; }

/* ─── Spinner ─── */
.spinner {
  width: 32px; height: 32px;
  border: 3px solid #e5e7eb; border-top-color: #409EFF;
  border-radius: 50%; animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
