<template>
  <div>
    <!-- 顶部 -->
    <div class="flex items-center gap-3 mb-4">
      <span class="case-title">MDT多学科讨论：右肺占位性质待查</span>
      <span class="badge badge-error">疑难病例</span>
      <span class="badge badge-purple">MDT模式</span>
    </div>

    <!-- 阶段指示器 -->
    <div class="steps">
      <div
        v-for="(stage, i) in stages"
        :key="i"
        class="step-dot-wrapper"
      >
        <div
          :class="['step-dot', {
            done: i < currentStage,
            current: i === currentStage
          }]"
        >{{ i < currentStage ? '✓' : i + 1 }}</div>
        <span class="step-label">{{ stage }}</span>
      </div>
      <span class="stage-name">阶段{{ currentStage + 1 }}/5：{{ stages[currentStage] }}</span>
    </div>

    <!-- MDT 主体 -->
    <div class="mdt-layout">
      <!-- 讨论区 -->
      <div class="mdt-main">
        <div class="mdt-discussion" ref="discussionRef">
          <div
            v-for="(msg, i) in mdtMessages"
            :key="i"
            class="mdt-msg"
          >
            <div :class="['mdt-msg-avatar', msg.avatarClass]">{{ msg.initials }}</div>
            <div>
              <div class="mdt-msg-sender">{{ msg.sender }}</div>
              <div class="mdt-msg-text">{{ msg.text }}</div>
            </div>
          </div>

          <!-- 当前发言指示器 -->
          <div v-if="isTyping" class="mdt-msg">
            <div :class="['mdt-msg-avatar', currentSpeakerInfo.avatarClass]">{{ currentSpeakerInfo.initials }}</div>
            <div>
              <div class="mdt-msg-sender">{{ currentSpeakerInfo.name }}</div>
              <div class="mdt-msg-text typing">正在发言...</div>
            </div>
          </div>
        </div>

        <!-- 学员任务区 -->
        <div class="mdt-task">
          <h4>👤 学员操作 — {{ stages[currentStage] }}</h4>
          <p class="task-hint">{{ stageTasks[currentStage].hint }}</p>

          <!-- 阶段2：影像标注 -->
          <div v-if="currentStage === 1" class="ct-section">
            <div class="ct-placeholder" @click="addAnnotation">
              <div class="ct-inner">
                <div class="ct-icon">🫁</div>
                <div class="ct-title">胸部CT · 肺窗</div>
                <div class="ct-subtitle">右肺上叶横断面</div>
              </div>
              <div class="ct-markers">
                <div
                  v-for="(m, i) in markers"
                  :key="i"
                  class="ct-marker"
                  :style="{ left: m.x + '%', top: m.y + '%' }"
                >{{ i + 1 }}</div>
              </div>
            </div>
            <div v-if="annotationSubmitted" class="ct-result">
              <strong>影像专家AI 解读结果：</strong><br>
              <span class="result-hit">① 右肺上叶后段不规则结节（2.8×2.3cm），边缘毛糙，分叶征+短毛刺征 ✓ 你已标注</span><br>
              <span class="result-miss">② 纵隔4R区淋巴结肿大（短径1.2cm） ✗ 遗漏</span><br>
              <span class="result-miss">③ 结节内空泡征 ✗ 遗漏</span><br>
              <strong>关键病灶识别率：33%（1/3）</strong>
            </div>
          </div>

          <!-- 阶段0：诊断印象 -->
          <div v-if="currentStage === 0" class="mb-3">
            <textarea v-model="studentDiagnosis" class="input w-full" rows="3" placeholder="请写出你的初步诊断印象..."></textarea>
          </div>

          <!-- 阶段2：诊断辩论投票 -->
          <div v-if="currentStage === 2" class="mb-3">
            <div class="vote-options">
              <label v-for="(opt, i) in voteOptions" :key="i" class="vote-option">
                <input type="radio" v-model="studentVote" :value="opt" />
                <span>{{ opt }}</span>
              </label>
            </div>
            <textarea v-model="studentCritique" class="input w-full mt-2" rows="2" placeholder="指出专家论点中的逻辑漏洞或证据不足处..."></textarea>
          </div>

          <!-- 阶段3：方案制定 -->
          <div v-if="currentStage === 3" class="mb-3">
            <textarea v-model="studentPlan" class="input w-full" rows="4" placeholder="请独立制定治疗方案（用药/剂量/疗程/护理要点）..."></textarea>
          </div>

          <!-- 阶段4：反思总结 -->
          <div v-if="currentStage === 4" class="mb-3">
            <textarea v-model="studentReflection" class="input w-full" rows="3" placeholder="请完成反思总结：学到了什么、改变了什么认知..."></textarea>
          </div>

          <div class="flex gap-2 mt-3">
            <button
              v-if="!stageSubmitted"
              class="btn btn-primary btn-sm"
              @click="submitStage()"
            >{{ currentStage === 1 ? '提交标注' : '提交' }}</button>
            <button
              v-if="stageSubmitted && currentStage < 4"
              class="btn btn-sm"
              @click="advanceStage()"
            >进入下一阶段 →</button>
            <button
              v-if="stageSubmitted && currentStage === 4"
              class="btn btn-primary btn-sm"
              @click="finishMDT()"
            >查看MDT能力画像</button>
          </div>
        </div>
      </div>

      <!-- 参与者列表 -->
      <div class="mdt-roster">
        <div class="roster-title">讨论参与者</div>
        <div
          v-for="m in members"
          :key="m.initials"
          :class="['mdt-member', { speaking: m.isCurrentSpeaker }]"
        >
          <div :class="['mdt-avatar', m.avatarClass]">{{ m.initials }}</div>
          <div>
            <div class="mdt-name">{{ m.name }}</div>
            <div class="mdt-role">{{ m.role }}</div>
          </div>
          <div class="speaking-dot" :class="{ active: m.isCurrentSpeaker }"></div>
        </div>
        <div class="mdt-student-section">
          <div class="mdt-member student-member">
            <div class="mdt-avatar av-student">👤</div>
            <div>
              <div class="mdt-name">你（实习MDT成员）</div>
              <div class="mdt-role">主动参与</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 完成弹窗 -->
    <div v-if="showResult" class="modal-overlay" @click.self="showResult = false">
      <div class="modal-container" style="width:600px;">
        <div class="modal-header">
          <h3>MDT能力画像</h3>
          <button class="modal-close" @click="showResult = false">✕</button>
        </div>
        <div class="modal-body">
          <table>
            <thead><tr><th>评估维度</th><th>得分</th><th>评价</th></tr></thead>
            <tbody>
              <tr><td>诊断判断力</td><td><span class="badge badge-success">78%</span></td><td>初步诊断吻合度良好</td></tr>
              <tr><td>影像识读能力</td><td><span class="badge badge-warning">33%</span></td><td>关键病灶识别率偏低</td></tr>
              <tr><td>方案制定规范性</td><td><span class="badge badge-success">82%</span></td><td>与专家方案基本一致</td></tr>
              <tr><td>批判性思维</td><td><span class="badge badge-info">75%</span></td><td>能发现部分逻辑漏洞</td></tr>
              <tr><td>反思深度</td><td><span class="badge badge-success">85%</span></td><td>反思深刻，认知转变明显</td></tr>
            </tbody>
          </table>
        </div>
        <div class="modal-footer">
          <button class="btn btn-primary" @click="showResult = false">确认</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const stages = ['病例导入', '影像解读', '诊断辩论', '方案制定', '总结点评']
const currentStage = ref(1)
const stageSubmitted = ref(false)
const isTyping = ref(false)
const showResult = ref(false)

// 学员输入
const studentDiagnosis = ref('')
const studentVote = ref('')
const studentCritique = ref('')
const studentPlan = ref('')
const studentReflection = ref('')
const markers = ref([])
const annotationSubmitted = ref(false)

const voteOptions = [
  '原发性肺腺癌（肿瘤专家观点）',
  '炎性假瘤（病理专家观点）',
  '结核球（影像专家提示）',
]

const members = [
  { name: '主持人', role: '流程调度', initials: 'MC', avatarClass: 'av-host', isCurrentSpeaker: false },
  { name: '肿瘤专家', role: '诊疗方案', initials: 'ON', avatarClass: 'av-onco', isCurrentSpeaker: false },
  { name: '影像专家', role: '影像解读', initials: 'RD', avatarClass: 'av-radio', isCurrentSpeaker: true },
  { name: '病理专家', role: '病理分析', initials: 'PT', avatarClass: 'av-path', isCurrentSpeaker: false },
  { name: '护理专家', role: '护理计划', initials: 'NS', avatarClass: 'av-nurse', isCurrentSpeaker: false },
  { name: '麻醉专家', role: '风险评估', initials: 'AN', avatarClass: 'av-anes', isCurrentSpeaker: false },
]

const currentSpeakerInfo = ref(members[2])

const stageTasks = {
  0: { hint: '阅读病例材料后，写出你的初步诊断印象 + 列出想追问的信息清单（提交后作为对照基线）。' },
  1: { hint: '请在下方CT图像上标注你发现的异常征象（点击图像添加标注），标注完成后提交，查看影像专家AI的解读。' },
  2: { hint: '投票选择最认同的诊断方向，并指出各专家AI论点中的逻辑漏洞或证据不足处。' },
  3: { hint: '在专家发言前，先独立制定治疗方案（用药/剂量/疗程/护理要点）。提交后各专家AI将逐条点评。' },
  4: { hint: '查看各阶段操作与专家的差距对比，完成反思总结。AI导师将对反思质量评分。' },
}

const mdtMessages = ref([
  {
    sender: '主持人 AI',
    initials: 'MC',
    avatarClass: 'av-host',
    text: '各位专家，我们今天讨论一位58岁男性，"咳嗽、痰中带血2周"就诊。胸部CT示右肺上叶2.8×2.3cm不规则结节，边缘毛糙，可见分叶及短毛刺征。吸烟史30年，40支/日。先请影像科专家分析影像学表现。',
  },
])

function addAnnotation(e) {
  if (annotationSubmitted.value) return
  if (markers.value.length >= 3) return
  const rect = e.target.getBoundingClientRect()
  markers.value.push({
    x: ((e.clientX - rect.left) / rect.width * 100).toFixed(1),
    y: ((e.clientY - rect.top) / rect.height * 100).toFixed(1),
  })
}

function submitStage() {
  stageSubmitted.value = true
  isTyping.value = true

  if (currentStage.value === 1) {
    annotationSubmitted.value = true
  }

  setTimeout(() => {
    isTyping.value = false
    const responses = getStageResponses()
    mdtMessages.value.push(...responses)
  }, 1500)
}

function getStageResponses() {
  switch (currentStage.value) {
    case 0:
      return [
        { sender: '主持人 AI', initials: 'MC', avatarClass: 'av-host', text: '已收到你的初步诊断印象，接下来请影像专家分析。你的诊断基线已记录，将在后续对照。' },
      ]
    case 1:
      return [
        { sender: '影像专家 AI', initials: 'RD', avatarClass: 'av-radio', text: '胸部CT肺窗示右肺上叶后段2.8×2.3cm不规则结节，边缘毛糙，可见分叶征及短毛刺征，高度提示恶性。纵隔4R区淋巴结肿大（短径1.2cm），应注意N1站转移可能。结节内可见空泡征，进一步支持腺癌诊断。建议CT引导下穿刺活检明确病理。' },
      ]
    case 2:
      return [
        { sender: '肿瘤专家 AI', initials: 'ON', avatarClass: 'av-onco', text: '同意影像专家意见。患者58岁，长期重度吸烟史，影像学特征高度恶性。若病理确诊为肺腺癌，需行EGFR/ALK/ROS1基因检测指导靶向治疗。分期考虑T1cN1M0，IIB期。' },
        { sender: '病理专家 AI', initials: 'PT', avatarClass: 'av-path', text: '补充：空泡征是肺腺癌的特征性影像学表现之一。但需注意与炎性假瘤鉴别——后者通常边界光滑，无分叶及毛刺。建议穿刺活检行HE染色+免疫组化（TTF-1、Napsin A、CK7、p40）。' },
      ]
    case 3:
      return [
        { sender: '护理专家 AI', initials: 'NS', avatarClass: 'av-nurse', text: '学员方案总体合理。补充护理要点：(1)术前呼吸功能锻炼（深呼吸、有效咳嗽训练）；(2)术后早期下床活动，预防VTE；(3)疼痛管理：术后48h内PCA镇痛；(4)胸腔闭式引流管护理，注意水柱波动及引流量。' },
      ]
    case 4:
      return [
        { sender: '主持人 AI', initials: 'MC', avatarClass: 'av-host', text: '本次MDT讨论结束。学员在各阶段表现积极，影像识读方面有待加强。肿瘤专家、病理专家和护理专家已给出针对性点评。综合评分：诊断判断力78%，影像识读33%，方案规范82%，批判思维75%，反思深度85%。' },
      ]
    default:
      return []
  }
}

function advanceStage() {
  if (currentStage.value < 4) {
    currentStage.value++
    stageSubmitted.value = false
    // 更新当前发言者
    members.forEach(m => m.isCurrentSpeaker = false)
    const speakerMap = [0, 2, 0, 3, 0] // index of speaker for each stage
    const idx = speakerMap[currentStage.value]
    members[idx].isCurrentSpeaker = true
    currentSpeakerInfo.value = members[idx]
    isTyping.value = false
    markers.value = []
    annotationSubmitted.value = false
    studentVote.value = ''
    studentCritique.value = ''
    studentPlan.value = ''
    studentReflection.value = ''
  }
}

function finishMDT() {
  showResult.value = true
}

function resetMDT() {
  currentStage.value = 0
  stageSubmitted.value = false
  isTyping.value = false
  showResult.value = false
  annotationSubmitted.value = false
  markers.value = []
  studentDiagnosis.value = ''
  studentVote.value = ''
  studentCritique.value = ''
  studentPlan.value = ''
  studentReflection.value = ''
  mdtMessages.value = [mdtMessages.value[0]]
  members.forEach(m => m.isCurrentSpeaker = false)
  members[0].isCurrentSpeaker = true
  currentSpeakerInfo.value = members[0]
}
</script>

<style scoped>
.case-title { font-size: 15px; font-weight: 600; }

.steps {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: var(--card-radius);
  padding: 16px 24px;
  box-shadow: var(--card-shadow);
  border: 1px solid var(--border-light);
  margin-bottom: 20px;
  gap: 0;
}

.step-dot-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.step-dot {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  background: var(--border);
  color: var(--text-tertiary);
}
.step-dot.done { background: var(--success); color: #fff; }
.step-dot.current {
  background: var(--primary);
  color: #fff;
  box-shadow: 0 0 0 4px rgba(37,99,235,0.2);
}

.step-label { font-size: 11px; color: var(--text-secondary); white-space: nowrap; }

.stage-name {
  margin-left: 24px;
  font-size: 13px;
  color: var(--primary);
  font-weight: 500;
}

.mdt-layout {
  display: flex;
  gap: 0;
  height: calc(100vh - 320px);
  min-height: 440px;
}

.mdt-main {
  flex: 1;
  background: #fff;
  border-radius: var(--card-radius) 0 0 var(--card-radius);
  border: 1px solid var(--border);
  border-right: none;
  overflow-y: auto;
  padding: 20px;
}

.mdt-discussion { margin-bottom: 16px; }

.mdt-roster {
  width: 260px;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 0 var(--card-radius) var(--card-radius) 0;
  padding: 16px;
  overflow-y: auto;
}

.roster-title {
  font-weight: 500;
  margin-bottom: 12px;
  font-size: 13px;
}

.mdt-member {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border-radius: 8px;
  margin-bottom: 4px;
  transition: background .2s;
}
.mdt-member.speaking { background: var(--primary-light); }

.mdt-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  flex-shrink: 0;
}
.av-host { background: #6366f1; }
.av-onco { background: #ef4444; }
.av-radio { background: #f59e0b; }
.av-path { background: #8b5cf6; }
.av-nurse { background: #10b981; }
.av-anes { background: #06b6d4; }
.av-student { background: var(--primary); }

.mdt-name { font-size: 13px; font-weight: 500; }
.mdt-role { font-size: 11px; color: var(--text-secondary); }

.speaking-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--success);
  margin-left: auto;
  display: none;
}
.speaking-dot.active { display: block; animation: pulse 1s infinite; }
@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }

.mdt-msg {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  margin-bottom: 14px;
}
.mdt-msg-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #fff;
  flex-shrink: 0;
}
.mdt-msg-sender { font-size: 12px; font-weight: 600; margin-bottom: 4px; }
.mdt-msg-text {
  font-size: 13px;
  line-height: 1.7;
  padding: 10px 14px;
  background: #f9fafb;
  border-radius: 8px;
}
.mdt-msg-text.typing {
  background: var(--primary-light);
  color: var(--primary);
  font-style: italic;
}

.mdt-task {
  padding: 16px;
  border: 2px dashed var(--primary);
  border-radius: var(--card-radius);
  background: var(--primary-light);
}
.mdt-task h4 { font-size: 14px; font-weight: 600; color: var(--primary); margin-bottom: 4px; }
.task-hint { font-size: 12px; color: var(--text-secondary); margin-bottom: 12px; }

.ct-section { margin-bottom: 16px; }
.ct-placeholder {
  width: 100%;
  max-width: 500px;
  height: 260px;
  background: linear-gradient(135deg, #1a1a2e, #0f3460);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  cursor: crosshair;
  margin-bottom: 10px;
}
.ct-inner { text-align: center; }
.ct-icon { font-size: 60px; margin-bottom: 10px; }
.ct-title { font-size: 14px; color: #ccc; }
.ct-subtitle { font-size: 11px; color: #888; }

.ct-markers {
  position: absolute;
  inset: 0;
}
.ct-marker {
  position: absolute;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(239,68,68,0.7);
  border: 2px solid #fff;
  color: #fff;
  font-size: 10px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  transform: translate(-50%, -50%);
}

.ct-result {
  padding: 12px;
  background: #d1fae5;
  border: 1px solid #a7f3d0;
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.8;
  margin-bottom: 8px;
}
.result-hit { color: #059669; }
.result-miss { color: #dc2626; }

.vote-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.vote-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: var(--btn-radius);
  font-size: 13px;
  cursor: pointer;
  transition: all .15s;
}
.vote-option:hover { border-color: var(--primary); background: var(--primary-light); }

.mdt-student-section { border-top: 1px solid var(--border); margin-top: 12px; padding-top: 12px; }
.student-member { background: var(--primary-light); }

.w-full { width: 100%; }
.flex { display: flex; }
.gap-2 { gap: 8px; }
.gap-3 { gap: 12px; }
.items-center { align-items: center; }
.mb-3 { margin-bottom: 12px; }
.mt-2 { margin-top: 8px; }
.mt-3 { margin-top: 12px; }
</style>
