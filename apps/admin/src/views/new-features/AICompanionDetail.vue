<template>
  <div>
    <!-- 顶部导航 -->
    <div class="flex items-center gap-3 mb-4">
      <button class="btn btn-sm" @click="$router.push({ name: 'caseLevelList' })">← 返回列表</button>
      <span class="case-title">{{ caseInfo.name }}</span>
      <span :class="['badge', levelBadgeClass]">{{ caseInfo.levelLabel }}</span>
      <span class="badge badge-info">{{ caseInfo.phase }}</span>
    </div>

    <!-- 双栏布局 -->
    <div class="panel-layout">
      <!-- 左侧：病例信息 -->
      <div class="panel-main">
        <div class="info-section">
          <h4>基本信息</h4>
          <div class="info-grid">
            <div><span class="info-label">姓名：</span>{{ caseInfo.patientName }}</div>
            <div><span class="info-label">性别：</span>{{ caseInfo.gender }}</div>
            <div><span class="info-label">年龄：</span>{{ caseInfo.age }}岁</div>
            <div><span class="info-label">科室：</span>{{ caseInfo.dept }}</div>
          </div>
        </div>

        <div class="info-section">
          <h4>主诉</h4>
          <p class="info-text">{{ caseInfo.chiefComplaint }}</p>
        </div>

        <div class="info-section">
          <h4>现病史</h4>
          <p class="info-text">{{ caseInfo.presentIllness }}</p>
        </div>

        <div class="info-section">
          <h4>既往史</h4>
          <p class="info-text">{{ caseInfo.pastHistory }}</p>
        </div>

        <div class="info-section">
          <h4>体格检查</h4>
          <p class="info-text">{{ caseInfo.physicalExam }}</p>
        </div>

        <div style="text-align:center;padding:20px;">
          <button class="btn btn-primary" @click="startTraining">开始SP对话训练</button>
        </div>
      </div>

      <!-- 右侧：AI伴学面板 -->
      <div class="panel-sidebar">
        <div class="sidebar-tabs">
          <button
            :class="['sidebar-tab', { active: activeTab === 'qa' }]"
            @click="activeTab = 'qa'"
          >💬 智能问答</button>
          <button
            :class="['sidebar-tab', { active: activeTab === 'commentary' }]"
            @click="activeTab = 'commentary'"
          >⭐ 专家点评</button>
        </div>

        <div class="sidebar-content">
          <!-- 问答 Tab -->
          <div v-show="activeTab === 'qa'">
            <div class="suggested-qs">
              <button
                v-for="q in suggestedQuestions"
                :key="q"
                class="suggested-q"
                @click="askQuestion(q)"
              >{{ q }}</button>
            </div>
            <div class="qa-messages" ref="qaContainer">
              <div
                v-for="(msg, i) in qaMessages"
                :key="i"
                :class="['qa-msg', msg.type]"
              >
                <span v-if="msg.type === 'ai'">🤖 </span>{{ msg.text }}
                <div v-if="msg.ref" class="ref">{{ msg.ref }}</div>
              </div>
            </div>
            <div class="qa-input-row">
              <input
                v-model="qaInput"
                class="input w-full"
                placeholder="输入你的问题..."
                @keydown.enter="askQuestion()"
              >
              <button class="btn btn-primary btn-sm" @click="askQuestion()">发送</button>
            </div>
          </div>

          <!-- 专家点评 Tab -->
          <div v-show="activeTab === 'commentary'">
            <div
              v-for="(c, i) in commentaries"
              :key="i"
              class="commentary-card"
            >
              <div class="flex items-center justify-between mb-2">
                <strong class="commentary-title">{{ c.title }}</strong>
                <span :class="['src-badge', c.source === 'manual' ? 'manual' : 'ai-gen']">{{ c.sourceLabel }}</span>
              </div>
              <div class="text-xs text-secondary">{{ c.author }}</div>
              <div class="commentary-body">{{ c.body }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const activeTab = ref(route.query.tab || 'qa')
const qaInput = ref('')
const qaContainer = ref(null)

const caseInfo = ref({
  id: 1,
  name: '陈建国 · 急性心肌梗死',
  patientName: '陈建国',
  gender: '男',
  age: 62,
  dept: '心内科',
  phase: 'R2',
  level: 'advanced',
  levelLabel: '高阶病例',
  chiefComplaint: '持续性胸骨后压榨样疼痛3小时，伴大汗、恶心，含服硝酸甘油未缓解。',
  presentIllness: '患者于3小时前无明显诱因出现胸骨后压榨样疼痛，向左肩放射，伴大汗、恶心，无呕吐。自服"速效救心丸"10粒，症状无缓解。急诊来我院。',
  pastHistory: '高血压病史10年，最高180/100mmHg，口服硝苯地平控释片30mg qd。2型糖尿病病史5年，口服二甲双胍0.5g tid。吸烟史40年，20支/日。否认药物过敏史。',
  physicalExam: 'T:36.8℃ P:96次/分 R:22次/分 BP:150/95mmHg。神清，痛苦貌。双肺呼吸音清。心界不大，心率96次/分，律齐，未闻及杂音。',
})

const levelBadgeClass = computed(() => {
  return caseInfo.value.level === 'basic' ? 'badge-success' :
    caseInfo.value.level === 'advanced' ? 'badge-warning' : 'badge-error'
})

const suggestedQuestions = [
  '鉴别诊断有哪些？',
  '需要做哪些辅助检查？',
  'STEMI的诊断标准是什么？',
]

const qaMessages = ref([
  { type: 'ai', text: '你好！我是AI伴学助手，基于中大医院专家知识库为你解答。你可以针对这个病例自由提问。' },
])

const qaResponses = {
  '鉴别诊断有哪些？': {
    text: '该病例需重点鉴别的疾病包括：(1)主动脉夹层——撕裂样疼痛，双侧血压不对称；(2)急性肺栓塞——呼吸困难为主，D-二聚体显著升高；(3)急性心包炎——疼痛与体位相关，心电图弥漫性ST段抬高；(4)张力性气胸——单侧呼吸音消失。',
    ref: '参考：《内科学（第9版）》胸痛鉴别诊断章节 · 王建民教授点评',
  },
  '需要做哪些辅助检查？': {
    text: '核心检查：(1)18导联心电图——10分钟内完成，动态观察ST-T变化；(2)高敏肌钙蛋白——发病3小时后检测，动态监测；(3)心脏超声——评估室壁运动异常；(4)冠脉造影——诊断金标准，同时可行介入治疗。',
    ref: '参考：《急性冠脉综合征急诊快速诊治指南（2019）》',
  },
  'STEMI的诊断标准是什么？': {
    text: 'STEMI诊断标准（满足以下至少2项）：(1)持续性缺血性胸痛>30分钟；(2)心电图：相邻两个导联ST段抬高≥0.2mV（胸前导联）或≥0.1mV（肢体导联）；(3)心肌坏死标志物（cTnI/cTnT）升高超过正常上限。',
    ref: '参考：《急性ST段抬高型心肌梗死诊断和治疗指南（2019）》',
  },
}

function askQuestion(q) {
  const question = typeof q === 'string' ? q : qaInput.value.trim()
  if (!question) return
  qaMessages.value.push({ type: 'user', text: question })
  qaInput.value = ''

  // 查找预置回答
  const answer = qaResponses[question]
  if (answer) {
    setTimeout(() => {
      qaMessages.value.push({ type: 'ai', text: answer.text, ref: answer.ref })
      scrollToBottom()
    }, 600)
  } else {
    setTimeout(() => {
      qaMessages.value.push({
        type: 'ai',
        text: '这是一个好问题。基于该病例的上下文和专家知识库，我建议你从病史特点、体格检查发现、辅助检查结果三个维度综合分析。如需更详细的解答，请咨询带教老师。',
      })
      scrollToBottom()
    }, 800)
  }
}

function scrollToBottom() {
  nextTick(() => {
    if (qaContainer.value) {
      qaContainer.value.scrollTop = qaContainer.value.scrollHeight
    }
  })
}

const commentaries = [
  {
    title: '胸痛的鉴别诊断要点',
    source: 'manual',
    sourceLabel: '专家撰写',
    author: '王建民 教授 · 心内科',
    body: '急性胸痛的鉴别诊断需首先排除危及生命的疾病：急性冠脉综合征、主动脉夹层、肺栓塞、张力性气胸。本病例患者老年男性，多个危险因素，胸痛呈压榨样，向左肩放射，含服硝酸甘油无效，高度提示急性心肌梗死。应尽快完成18导联心电图和心肌酶谱检测。',
  },
  {
    title: 'STEMI急救处理关键节点',
    source: 'ai',
    sourceLabel: 'AI生成',
    author: '基于院士团队诊断逻辑生成',
    body: '时间就是心肌。Door-to-Balloon时间应控制在90分钟以内。关键步骤：(1)10分钟内完成首份心电图；(2)立即启动导管室；(3)负荷量双联抗血小板（阿司匹林300mg+替格瑞洛180mg）；(4)如转运延迟>120分钟，考虑先溶栓再转运。',
  },
  {
    title: '心肌梗死后二级预防',
    source: 'manual',
    sourceLabel: '专家撰写',
    author: '《冠心病合理用药指南》',
    body: 'PCI术后需长期规范二级预防：双联抗血小板≥12个月、高强度他汀降LDL-C<1.8mmol/L、β受体阻滞剂、ACEI/ARB、严格控制血压(<130/80mmHg)和血糖(HbA1c<7%)。戒烟、低盐低脂饮食、适量运动、控制体重。',
  },
]

function startTraining() {
  alert('进入SP对话训练 (原型演示)')
}

onMounted(() => {
  if (route.query.tab) {
    activeTab.value = route.query.tab
  }
})
</script>

<style scoped>
.case-title { font-size: 15px; font-weight: 600; }

.panel-layout {
  display: flex;
  gap: 0;
  height: calc(100vh - 240px);
  min-height: 500px;
}

.panel-main {
  flex: 1;
  background: #fff;
  border-radius: var(--card-radius) 0 0 var(--card-radius);
  border: 1px solid var(--border);
  border-right: none;
  overflow-y: auto;
  padding: 20px;
}

.panel-sidebar {
  width: 420px;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 0 var(--card-radius) var(--card-radius) 0;
  display: flex;
  flex-direction: column;
}

.sidebar-tabs {
  display: flex;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.sidebar-tab {
  flex: 1;
  padding: 12px;
  text-align: center;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  border-bottom: 2px solid transparent;
  transition: all .15s;
  background: none;
  font-family: var(--font-family);
  color: var(--text-secondary);
}
.sidebar-tab.active {
  color: var(--primary);
  border-bottom-color: var(--primary);
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
}

.info-section { margin-bottom: 16px; }
.info-section h4 {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--text-main);
}
.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px 20px;
  font-size: 13px;
}
.info-label { color: var(--text-secondary); }
.info-text {
  font-size: 13px;
  line-height: 1.7;
}

/* QA */
.qa-messages {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 320px;
  overflow-y: auto;
  margin-bottom: 12px;
}
.qa-msg {
  max-width: 90%;
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 13px;
  line-height: 1.6;
}
.qa-msg.user {
  align-self: flex-end;
  background: var(--primary-light);
  color: var(--text-main);
}
.qa-msg.ai {
  align-self: flex-start;
  background: #f9fafb;
  border: 1px solid var(--border);
}
.qa-msg .ref {
  font-size: 11px;
  color: var(--primary);
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px solid var(--border);
}

.qa-input-row {
  display: flex;
  gap: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--border);
}

.suggested-qs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}
.suggested-q {
  font-size: 11px;
  padding: 4px 10px;
  border-radius: 12px;
  background: var(--primary-light);
  color: var(--primary);
  cursor: pointer;
  border: none;
  font-family: var(--font-family);
  transition: .15s;
}
.suggested-q:hover { background: var(--primary-lightest); }

/* Commentary */
.commentary-card {
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: 8px;
  margin-bottom: 10px;
}
.commentary-title { font-size: 13px; }
.src-badge {
  font-size: 10px;
  padding: 1px 8px;
  border-radius: 8px;
  font-weight: 500;
}
.src-badge.manual { background: #d1fae5; color: #065f46; }
.src-badge.ai-gen { background: #fff7ed; color: #ea580c; }
.commentary-body {
  font-size: 13px;
  line-height: 1.7;
  margin-top: 8px;
}

.w-full { width: 100%; }
</style>
