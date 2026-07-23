<template>
  <div class="ai-companion-page">
    <div class="companion-layout">
      <!-- 左侧：病例信息 -->
      <div class="companion-main">
        <div class="case-header-card">
          <div class="flex items-center gap-3 mb-3">
            <button class="btn btn-sm" @click="$router.back()">
              <i class="fa-solid fa-arrow-left"></i> 返回
            </button>
            <h2>{{ caseInfo.patientName }} · {{ caseInfo.disease }}</h2>
            <span :class="['badge', levelBadgeClass]">{{ caseInfo.caseLevelLabel }}</span>
            <span class="badge badge-info">{{ caseInfo.teachingPhase }}</span>
          </div>
        </div>

        <div class="info-card">
          <h4 class="card-section-title"><i class="fa-solid fa-circle-info"></i> 基本信息</h4>
          <div class="info-grid">
            <div><span class="info-label">姓名：</span>{{ caseInfo.patientName }}</div>
            <div><span class="info-label">性别：</span>{{ caseInfo.gender }}</div>
            <div><span class="info-label">年龄：</span>{{ caseInfo.age }}岁</div>
            <div><span class="info-label">科室：</span>{{ caseInfo.dept }}</div>
          </div>
        </div>

        <div class="info-card">
          <h4 class="card-section-title"><i class="fa-solid fa-clipboard-list"></i> 主诉</h4>
          <p class="info-text">{{ caseInfo.chiefComplaint }}</p>
        </div>

        <div class="info-card">
          <h4 class="card-section-title"><i class="fa-solid fa-file-lines"></i> 现病史</h4>
          <p class="info-text">{{ caseInfo.presentIllness }}</p>
        </div>

        <div class="info-card">
          <h4 class="card-section-title"><i class="fa-solid fa-clock-rotate-left"></i> 既往史</h4>
          <p class="info-text">{{ caseInfo.pastHistory }}</p>
        </div>

        <div class="info-card">
          <h4 class="card-section-title"><i class="fa-solid fa-stethoscope"></i> 体格检查</h4>
          <p class="info-text">{{ caseInfo.physicalExam }}</p>
        </div>

        <div class="start-training-area">
          <button class="btn btn-primary btn-lg" @click="startTraining">
            <i class="fa-solid fa-play"></i> 开始SP对话训练
          </button>
        </div>
      </div>

      <!-- 右侧：AI伴学面板 -->
      <div class="companion-sidebar">
        <div class="sidebar-tabs">
          <button :class="['sidebar-tab', { active: activeTab === 'qa' }]" @click="activeTab = 'qa'">
            <i class="fa-solid fa-comments"></i> 智能问答
          </button>
          <button :class="['sidebar-tab', { active: activeTab === 'commentary' }]" @click="activeTab = 'commentary'">
            <i class="fa-solid fa-star"></i> 专家点评
          </button>
        </div>

        <!-- 问答 -->
        <div v-show="activeTab === 'qa'" class="tab-content">
          <div class="suggested-qs">
            <button v-for="q in suggestedQuestions" :key="q" class="suggested-q" @click="askQuestion(q)">{{ q }}</button>
          </div>
          <div class="qa-messages" ref="qaContainer">
            <div v-for="(msg, i) in qaMessages" :key="i" :class="['qa-msg', msg.type]">
              <span v-if="msg.type === 'ai'">🤖 </span>{{ msg.text }}
              <div v-if="msg.ref" class="qa-ref">{{ msg.ref }}</div>
            </div>
          </div>
          <div class="qa-input-row">
            <input v-model="qaInput" class="input" placeholder="输入你的问题..." @keydown.enter="askQuestion()">
            <button class="btn btn-primary btn-sm" @click="askQuestion()">
              <i class="fa-solid fa-paper-plane"></i>
            </button>
          </div>
        </div>

        <!-- 专家点评 -->
        <div v-show="activeTab === 'commentary'" class="tab-content">
          <div v-for="(c, i) in commentaries" :key="i" class="commentary-card">
            <div class="flex items-center justify-between mb-2">
              <strong class="commentary-title">{{ c.title }}</strong>
              <span :class="['commentary-source', c.source]">{{ c.sourceLabel }}</span>
            </div>
            <div class="commentary-author">{{ c.author }}</div>
            <div class="commentary-body">{{ c.body }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useTrainingStore } from '@/stores/training'

const router = useRouter()
const store = useTrainingStore()

const activeTab = ref('qa')
const qaInput = ref('')
const qaContainer = ref(null)

const caseInfo = ref({
  patientName: '陈建国', gender: '男', age: 62, dept: '心内科',
  disease: '急性心肌梗死', teachingPhase: 'R2',
  caseLevel: 'advanced', caseLevelLabel: '高阶病例',
  chiefComplaint: '持续性胸骨后压榨样疼痛3小时，伴大汗、恶心，含服硝酸甘油未缓解。',
  presentIllness: '患者于3小时前无明显诱因出现胸骨后压榨样疼痛，向左肩放射，伴大汗、恶心，无呕吐。自服"速效救心丸"10粒，症状无缓解。急诊来我院。',
  pastHistory: '高血压病史10年，最高180/100mmHg，口服硝苯地平控释片30mg qd。2型糖尿病病史5年，口服二甲双胍0.5g tid。吸烟史40年，20支/日。否认药物过敏史。',
  physicalExam: 'T:36.8℃ P:96次/分 R:22次/分 BP:150/95mmHg。神清，痛苦貌。双肺呼吸音清。心界不大，心率96次/分，律齐，未闻及杂音。',
})

const levelBadgeClass = computed(() => {
  const m = { basic: 'badge-success', advanced: 'badge-warning', difficult: 'badge-error' }
  return m[caseInfo.value.caseLevel] || 'badge-info'
})

const suggestedQuestions = ['鉴别诊断有哪些？', '需要做哪些辅助检查？', 'STEMI的诊断标准是什么？']

const qaMessages = ref([
  { type: 'ai', text: '你好！我是AI伴学助手，基于专家知识库为你解答。你可以针对这个病例自由提问。' },
])

const qaResponses = {
  '鉴别诊断有哪些？': {
    text: '该病例需重点鉴别的疾病包括：(1)主动脉夹层——撕裂样疼痛，双侧血压不对称；(2)急性肺栓塞——呼吸困难为主，D-二聚体显著升高；(3)急性心包炎——疼痛与体位相关；(4)张力性气胸——单侧呼吸音消失。',
    ref: '参考：《内科学（第9版）》胸痛鉴别诊断章节',
  },
  '需要做哪些辅助检查？': {
    text: '核心检查：(1)18导联心电图——10分钟内完成；(2)高敏肌钙蛋白——发病3小时后检测；(3)心脏超声——评估室壁运动异常；(4)冠脉造影——金标准。',
    ref: '参考：《急性冠脉综合征急诊快速诊治指南》',
  },
  'STEMI的诊断标准是什么？': {
    text: 'STEMI诊断标准：(1)持续性缺血性胸痛>30分钟；(2)相邻两个导联ST段抬高≥0.2mV（胸前）或≥0.1mV（肢体）；(3)心肌坏死标志物升高超过正常上限。满足至少2项。',
    ref: '参考：《急性ST段抬高型心肌梗死诊断和治疗指南》',
  },
}

function askQuestion(q) {
  const question = typeof q === 'string' ? q : qaInput.value.trim()
  if (!question) return
  qaMessages.value.push({ type: 'user', text: question })
  qaInput.value = ''
  const answer = qaResponses[question]
  if (answer) {
    setTimeout(() => { qaMessages.value.push({ type: 'ai', text: answer.text, ref: answer.ref }); scrollToBottom() }, 600)
  } else {
    setTimeout(() => {
      qaMessages.value.push({ type: 'ai', text: '这是一个好问题。基于病例上下文和专家知识库，建议从病史特点、体格检查、辅助检查三个维度综合分析。如需更详细解答，请咨询带教老师。' })
      scrollToBottom()
    }, 800)
  }
}

function scrollToBottom() {
  nextTick(() => { if (qaContainer.value) qaContainer.value.scrollTop = qaContainer.value.scrollHeight })
}

const commentaries = [
  {
    title: '胸痛的鉴别诊断要点', source: 'manual', sourceLabel: '专家撰写',
    author: '王建民 教授 · 心内科',
    body: '急性胸痛的鉴别诊断需首先排除危及生命的疾病：急性冠脉综合征、主动脉夹层、肺栓塞、张力性气胸。本病例患者老年男性，多个危险因素，高度提示急性心肌梗死。',
  },
  {
    title: 'STEMI急救处理关键节点', source: 'ai', sourceLabel: 'AI生成',
    author: '基于院士团队诊断逻辑生成',
    body: '时间就是心肌。Door-to-Balloon时间应控制在90分钟以内。关键步骤：(1)10分钟内心电图；(2)启动导管室；(3)负荷量双抗；(4)延迟>120分钟考虑先溶栓。',
  },
  {
    title: '心肌梗死后二级预防', source: 'manual', sourceLabel: '专家撰写',
    author: '《冠心病合理用药指南》',
    body: 'PCI术后双联抗血小板≥12个月、高强度他汀、β受体阻滞剂、ACEI/ARB、严格控制血压血糖。戒烟、低盐低脂饮食、适量运动。',
  },
]

function startTraining() {
  router.push({ name: 'caseDetail', params: { caseId: caseInfo.value.patientName } })
}
</script>

<style scoped>
.ai-companion-page { height: calc(100vh - 120px); display: flex; flex-direction: column; }

.companion-layout { display: flex; gap: 0; flex: 1; overflow: hidden; }

.companion-main {
  flex: 1; overflow-y: auto; padding: 20px;
  background: #fff; border-radius: var(--card-radius) 0 0 var(--card-radius);
  border: 1px solid var(--border); border-right: none;
}

.companion-sidebar {
  width: 420px; background: #fff; border: 1px solid var(--border);
  border-radius: 0 var(--card-radius) var(--card-radius) 0;
  display: flex; flex-direction: column;
}

.case-header-card { margin-bottom: 16px; }
.case-header-card h2 { font-size: 18px; font-weight: 600; }

.info-card {
  margin-bottom: 12px;
  padding: 14px; background: #fafcff; border-radius: 8px; border: 1px solid #edf2f7;
}
.card-section-title { font-size: 14px; font-weight: 600; margin-bottom: 8px; color: var(--text-main); }
.info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 20px; font-size: 13px; }
.info-label { color: var(--text-secondary); }
.info-text { font-size: 13px; line-height: 1.7; }

.start-training-area { text-align: center; padding: 24px 0; }
.btn-lg { height: 44px; padding: 0 28px; font-size: 15px; }

.sidebar-tabs { display: flex; border-bottom: 1px solid var(--border); flex-shrink: 0; }
.sidebar-tab {
  flex: 1; padding: 12px; text-align: center; font-size: 13px; font-weight: 500;
  cursor: pointer; border: none; border-bottom: 2px solid transparent;
  background: none; font-family: inherit; color: var(--text-secondary);
  transition: all .15s;
}
.sidebar-tab.active { color: var(--primary); border-bottom-color: var(--primary); }

.tab-content { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; }

.suggested-qs { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
.suggested-q {
  font-size: 11px; padding: 4px 10px; border-radius: 12px;
  background: #eff6ff; color: var(--primary); cursor: pointer;
  border: none; font-family: inherit; transition: .15s;
}
.suggested-q:hover { background: #dbeafe; }

.qa-messages { flex: 1; display: flex; flex-direction: column; gap: 10px; max-height: 320px; overflow-y: auto; margin-bottom: 12px; }
.qa-msg { max-width: 90%; padding: 10px 14px; border-radius: 12px; font-size: 13px; line-height: 1.6; }
.qa-msg.user { align-self: flex-end; background: #eff6ff; }
.qa-msg.ai { align-self: flex-start; background: #f9fafb; border: 1px solid var(--border); }
.qa-ref { font-size: 11px; color: var(--primary); margin-top: 6px; padding-top: 6px; border-top: 1px solid var(--border); }

.qa-input-row { display: flex; gap: 8px; padding-top: 8px; border-top: 1px solid var(--border); }
.qa-input-row .input { flex: 1; }

.commentary-card { padding: 14px; border: 1px solid var(--border); border-radius: 8px; margin-bottom: 10px; }
.commentary-title { font-size: 13px; }
.commentary-source { font-size: 10px; padding: 2px 8px; border-radius: 8px; font-weight: 500; }
.commentary-source.manual { background: #d1fae5; color: #065f46; }
.commentary-source.ai { background: #fff7ed; color: #ea580c; }
.commentary-author { font-size: 12px; color: var(--text-secondary); margin-bottom: 6px; }
.commentary-body { font-size: 13px; line-height: 1.7; }

.flex { display: flex; }
.items-center { align-items: center; }
.justify-between { justify-content: space-between; }
.gap-3 { gap: 12px; }
.mb-2 { margin-bottom: 8px; }
.mb-3 { margin-bottom: 12px; }
</style>
