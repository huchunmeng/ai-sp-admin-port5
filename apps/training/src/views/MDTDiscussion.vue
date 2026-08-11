<template>
  <div class="mdt-page">
    <!-- 加载中 / 会诊前申请过渡（避免跳转 mdtPreMeeting 前闪现讨论区） -->
    <div v-if="loading || phase === 'premeeting'" class="loading-state">
      <i class="fa-solid fa-spinner fa-spin"></i> {{ phase === 'premeeting' ? '正在进入会诊前申请…' : '加载中...' }}
    </div>

    <!-- 准备面板（角色选择） -->
    <div v-else-if="phase === 'prep'" class="mdt-prep">
      <div class="prep-card">
        <div class="prep-header">
          <h3 class="prep-title"><i class="fa-solid fa-users-between-lines"></i> MDT多学科讨论 · 病例概要</h3>
        </div>
        <div class="prep-case-summary">
          <div class="prep-case-row">
            <span class="prep-case-name">{{ caseInfo.patientName }}</span>
            <span class="prep-case-meta">{{ caseInfo.gender }} {{ caseInfo.age }}岁 · {{ caseInfo.specialty }}</span>
            <span class="prep-discipline-chip" v-for="d in caseData.disciplines" :key="d">
              <i :class="disciplineIcon(d)"></i> {{ d }}
            </span>
          </div>
          <div class="prep-objective"><i class="fa-solid fa-bullseye"></i> 核心议题：{{ caseData.objective }}</div>
          <div class="prep-key-questions">
            <div v-for="q in mdtQuestions" :key="q.id" class="prep-q">
              <span class="prep-q-num">Q{{ q.id }}</span>{{ q.text }}
            </div>
          </div>
        </div>
        <div class="prep-role-title">你将作为</div>
        <div class="prep-role-fixed">
          <div class="prep-role-fixed-icon"><i class="fa-solid fa-user-tie"></i></div>
          <div>
            <div class="prep-role-fixed-name">{{ roleOption.label }}</div>
            <div class="prep-role-fixed-duty">{{ roleOption.duty }}</div>
            <div class="prep-role-fixed-desc">{{ roleOption.desc }}</div>
          </div>
        </div>
        <button class="btn btn-primary prep-start" @click="startDiscussion">开始 MDT 讨论</button>
      </div>
    </div>

    <!-- 讨论区 -->
    <template v-else>
      <!-- 阶段指示器 -->
      <div class="steps-bar">
        <div v-for="(stage, i) in runtimeStages" :key="i" class="step-item">
          <div :class="['step-dot', { done: i < currentStage, current: i === currentStage }]">
            {{ i < currentStage ? '✓' : i + 1 }}
          </div>
          <span class="step-label">{{ stage }}</span>
        </div>
        <button class="btn-end-training" @click="$router.push({ name: 'mdtCaseList' })">
          <i class="fa-solid fa-stop"></i> 结束训练
        </button>
      </div>

      <!-- 主体：三栏布局 -->
      <div class="mdt-layout">
        <!-- 左栏：病例信息（分页） -->
        <div class="mdt-sidebar-left">
          <div class="case-info-title">
            <span><i class="fa-solid fa-folder-open"></i> 病例信息</span>
            <button v-if="hasRawRecord" class="btn btn-sm case-raw-btn" @click="openRawRecordPage">
              <i class="fa-solid fa-folder-open"></i> 原始病历
            </button>
          </div>

          <!-- Tab 导航 -->
          <div class="info-tabs">
            <button v-for="tab in infoTabs" :key="tab.key"
              :class="['info-tab', { active: activeInfoTab === tab.key }]"
              @click="activeInfoTab = tab.key">
              <i :class="tab.icon"></i> {{ tab.label }}
            </button>
          </div>

          <!-- Tab 内容 -->
          <div class="info-tab-content">
            <!-- 基本信息 -->
            <div v-show="activeInfoTab === 'basic'" class="tab-panel">
              <div class="case-info-photo">
                <img v-if="patientAvatar" :src="patientAvatar" class="case-patient-img" />
                <span v-else class="case-info-avatar"><i class="fa-solid fa-user"></i></span>
              </div>
              <div class="case-info-name">{{ caseInfo.patientName }}</div>
              <div class="case-info-row">
                <span class="case-info-id">{{ caseInfo.caseId }}</span>
                <span class="case-info-diff" :class="'diff-' + (caseInfo.difficulty[0] || 'R')">{{ caseInfo.difficulty }}</span>
              </div>
              <div class="case-info-meta-grid">
                <div class="meta-item"><span class="meta-label">性别</span><span class="meta-value">{{ caseInfo.gender }}</span></div>
                <div class="meta-item"><span class="meta-label">年龄</span><span class="meta-value">{{ caseInfo.age }}岁</span></div>
                <div class="meta-item"><span class="meta-label">首诊科室</span><span class="meta-value">{{ caseInfo.specialty }}</span></div>
                <div class="meta-item"><span class="meta-label">教学层级</span><span class="meta-value">{{ caseInfo.teachingPhase }}</span></div>
              </div>
              <div class="case-section">
                <div class="case-section-label">主诉</div>
                <div class="case-section-text">{{ caseInfo.chiefComplaint }}</div>
              </div>
              <div class="case-section case-features-box">
                <div class="case-section-label"><i class="fa-solid fa-list-check"></i> 临床要点</div>
                <ul class="features-list">
                  <li v-for="(f, i) in caseFeatures" :key="i">{{ f }}</li>
                </ul>
              </div>
            </div>

            <!-- 病史资料 -->
            <div v-show="activeInfoTab === 'history'" class="tab-panel">
              <div class="case-section">
                <div class="case-section-label">现病史</div>
                <div class="case-section-text">{{ caseInfo.presentIllness }}</div>
              </div>
              <div class="case-section">
                <div class="case-section-label">体格检查</div>
                <div class="case-section-text">{{ caseInfo.physicalExam }}</div>
              </div>
              <div class="case-section case-two-col">
                <div class="case-col">
                  <div class="case-section-label">既往史</div>
                  <div class="case-section-text">{{ caseInfo.pastHistory }}</div>
                </div>
                <div class="case-col">
                  <div class="case-section-label">家族史</div>
                  <div class="case-section-text">{{ caseInfo.familyHistory }}</div>
                </div>
              </div>
            </div>

            <!-- 检查报告 -->
            <div v-show="activeInfoTab === 'reports'" class="tab-panel">
              <div class="case-section">
                <div class="case-section-label"><i class="fa-solid fa-flask"></i> 实验室检查</div>
                <div class="case-section-text">{{ caseInfo.labTests || '—' }}</div>
              </div>
              <div class="case-section">
                <div class="case-section-label"><i class="fa-solid fa-x-ray"></i> 影像检查</div>
                <div class="case-section-text">{{ caseInfo.imagingText || '—' }}</div>
              </div>
            </div>

            <!-- MDT议题 -->
            <div v-show="activeInfoTab === 'mdt'" class="tab-panel">
              <div class="case-section mdt-question-box">
                <div class="case-section-label"><i class="fa-solid fa-circle-question"></i> 本次MDT核心议题</div>
                <div class="case-section-text" style="font-weight:500;color:#1f2937;">{{ caseData.objective }}</div>
              </div>
              <div class="case-section" style="margin-top:16px;">
                <div class="case-section-label"><i class="fa-solid fa-list-ol"></i> 讨论问题列表</div>
                <div class="mdt-question-list">
                  <div v-for="q in mdtQuestions" :key="q.id" class="mdt-question-item">
                    <span class="mdt-q-num">Q{{ q.id }}</span>
                    <span class="mdt-q-text">{{ q.text }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 中栏：对话流 + 输入栏 -->
        <div class="mdt-center">
          <div class="mdt-main" ref="discussionRef">
            <template v-for="(item, i) in chatItems" :key="i">
              <!-- 专家消息 -->
              <div v-if="item.type === 'expert'" class="mdt-msg">
                <div :class="['mdt-msg-avatar', memberOf(item.speaker).avatarClass]">
                  <img v-if="memberOf(item.speaker).avatar" :src="memberOf(item.speaker).avatar" class="avatar-img" />
                  <span v-else>{{ memberOf(item.speaker).initials }}</span>
                </div>
                <div class="mdt-msg-body">
                  <div class="mdt-msg-sender">{{ memberOf(item.speaker).name }}</div>
                  <div class="mdt-msg-text" style="white-space:pre-wrap;">{{ msgText(item) }}</div>
                </div>
              </div>

              <!-- 学员发言 -->
              <div v-else-if="item.type === 'student'" class="mdt-msg student-msg">
                <div class="mdt-msg-body" style="text-align:right;">
                  <div class="mdt-msg-sender" style="color:#409EFF;">你（{{ roleOption.label }}）</div>
                  <div class="mdt-msg-text student-text">{{ item.text }}</div>
                </div>
                <div class="mdt-msg-avatar student-avatar-msg">
                  <img v-if="learnerAvatar" :src="learnerAvatar" class="avatar-img" />
                  <span v-else>{{ ROLE_ICONS[studentRole] }}</span>
                </div>
              </div>

              <!-- 任务卡片 -->
              <div v-else-if="item.type === 'task'" class="chat-card" @click="openCard(item.taskKey)">
                <div class="chat-card-icon" :style="taskCardStyle(item.taskKey)"><i :class="taskCardIcon(item.taskKey)"></i></div>
                <div class="chat-card-body">
                  <div class="chat-card-title">{{ taskCardTitle(item.taskKey) }}</div>
                  <div class="chat-card-meta" v-if="submitted[item.taskKey]">{{ taskCardSummary(item.taskKey) }}</div>
                  <div class="chat-card-meta" v-else>待完成 — 点击打开</div>
                </div>
                <div class="chat-card-status" v-if="submitted[item.taskKey]"><i class="fa-solid fa-circle-check" style="color:#10b981;"></i></div>
                <div class="chat-card-status" v-else><i class="fa-solid fa-chevron-right" style="color:#9ca3af;"></i></div>
              </div>

              <!-- MDT最终决策 -->
              <div v-else-if="item.type === 'decision'" class="mdt-decision-card">
                <div class="decision-header"><i class="fa-solid fa-gavel"></i> MDT最终决策</div>
                <div class="decision-body">{{ caseData.decision }}</div>
              </div>

              <!-- 随访计划 -->
              <div v-else-if="item.type === 'followup'" class="flow-card followup-card-flow">
                <div class="flow-card-header"><i class="fa-solid fa-calendar-check"></i> 随访计划</div>
                <div class="flow-card-body">{{ caseData.followUp }}</div>
              </div>

              <!-- 参考文献 -->
              <div v-else-if="item.type === 'references'" class="flow-card references-card-flow">
                <div class="flow-card-header"><i class="fa-solid fa-book-open"></i> 参考文献与指南依据</div>
                <div class="flow-card-body">
                  <div v-for="(r, i) in caseData.referencesList" :key="i" class="ref-item">{{ i + 1 }}. {{ r }}</div>
                </div>
              </div>

              <!-- 原始病历入口 -->
              <div v-else-if="item.type === 'case-raw'" class="case-raw-card">
                <div class="case-raw-icon"><i class="fa-solid fa-folder-open"></i></div>
                <div class="case-raw-body">
                  <div class="case-raw-title">原始病历</div>
                  <div class="case-raw-text">可查看本次 MDT 之前住院期间的原始病历（按事件线整理）。</div>
                  <button class="btn btn-primary btn-sm" @click="openRawRecordPage">查看原始病历 <i class="fa-solid fa-arrow-right"></i></button>
                </div>
              </div>

            </template>

            <!-- 打字指示器 -->
            <div v-if="showTypingIndicator" class="mdt-msg">
              <div :class="['mdt-msg-avatar', currentSpeaker.avatarClass]">
                <img v-if="currentSpeaker.avatar" :src="currentSpeaker.avatar" class="avatar-img" />
                <span v-else>{{ currentSpeaker.initials }}</span>
              </div>
              <div class="mdt-msg-body">
                <div class="mdt-msg-sender">{{ currentSpeaker.name }}</div>
                <div class="mdt-msg-text typing">正在发言...</div>
              </div>
            </div>
          </div>

          <!-- 继续讨论（Learner-paced） -->
          <div class="mdt-continue-bar">
            <button class="btn-continue" @click="continueDiscussion" :disabled="isTyping || streamingActive > 0 || turnPending || phase === 'ended'">
              <i class="fa-solid fa-forward"></i>
              {{ continueLabel }}
            </button>
            <span class="continue-hint">{{ continueHint }}</span>
          </div>

          <!-- 底部输入栏 -->
          <div class="mdt-input-bar">
            <button class="input-voice-btn" :class="{ recording: isRecording }" title="语音输入"
                    @mousedown.prevent="startVoice" @mouseup.prevent="stopVoice" @mouseleave.prevent="cancelVoice">
              <i class="fa-solid fa-microphone"></i>
            </button>
            <input v-model="chatInput" class="chat-input" :placeholder="inputPlaceholder" :disabled="inputDisabled" @keyup.enter="sendMessage" />
            <button class="input-send-btn" @click="sendMessage" :disabled="!chatInput.trim() || inputDisabled"><i class="fa-solid fa-paper-plane"></i></button>
          </div>
        </div>

        <!-- 右栏：参与者 -->
        <div class="mdt-roster">
          <div class="roster-title">AI专家</div>
          <div v-for="m in members" :key="m.speakerKey" :class="['roster-member', { speaking: m.isCurrentSpeaker }]">
            <div :class="['roster-avatar', m.avatarClass]">
              <img v-if="m.avatar" :src="m.avatar" class="roster-avatar-img" />
              <span v-else>{{ m.initials }}</span>
            </div>
            <div>
              <div class="roster-name">{{ m.name }}</div>
              <div class="roster-role">{{ m.role }}</div>
            </div>
            <div class="speaking-indicator" :class="{ active: m.isCurrentSpeaker }"></div>
          </div>
          <div class="roster-student">
            <div class="roster-member student-row">
              <div class="roster-avatar student-avatar">
                <img v-if="learnerAvatar" :src="learnerAvatar" class="roster-avatar-img" />
                <span v-else>{{ ROLE_ICONS[studentRole] }}</span>
              </div>
              <div><div class="roster-name">{{ roleOption.label }}</div><div class="roster-role">{{ ROLE_ICONS[studentRole] }} {{ roleOption.duty }}</div></div>
            </div>
          </div>
        </div>
      </div>

      <!-- ========== 卡片弹窗 ========== -->
        <!-- 通用任务弹窗 -->
      <div v-if="activeTask" class="modal-overlay" @click.self="closeCard">
        <div class="card-modal" :class="{ 'card-modal-lg': activeTask.type === 'exhibit' }">
          <div class="card-modal-header">
            <div class="card-modal-title"><i :class="activeTaskIcon"></i> {{ activeTask.label }}</div>
            <button class="modal-close" @click="closeCard"><i class="fa-solid fa-xmark"></i></button>
          </div>
          <div class="card-modal-body">
            <p class="card-modal-desc">{{ activeTask.prompt }}</p>

            <!-- 文本任务 -->
            <textarea v-if="activeTask.type === 'text'" v-model="taskValues[activeTask.key]"
              class="flow-textarea" :rows="activeTask.rows || 5"
              :placeholder="activeTask.placeholder || '请输入你的作答'" :disabled="submitted[activeTask.key]"></textarea>

            <!-- 选择题任务 -->
            <div v-else-if="activeTask.type === 'choice'" class="vote-options">
              <label v-for="opt in activeTask.options" :key="opt" class="vote-option"
                :class="{ selected: isOptionSelected(activeTask, opt) }">
                <input :type="activeTask.multi ? 'checkbox' : 'radio'"
                  :value="opt" :disabled="submitted[activeTask.key]"
                  @change="onChoiceChange(activeTask, opt)" /> {{ opt }}
              </label>
            </div>

            <!-- 影像标注任务 -->
            <div v-else-if="activeTask.type === 'exhibit'">
              <div class="ct-placeholder" @click="addAnnotation">
                <div class="ct-inner">
                  <div class="ct-icon"><i :class="imgIcon(activeTask.image?.modality)" style="font-size:48px;"></i></div>
                  <div class="ct-label">{{ activeTask.image?.title || '影像图像' }}</div>
                  <div style="font-size:11px;color:#888;">点击图像添加标注</div>
                </div>
                <div v-for="(m, idx) in markers" :key="idx" class="ct-marker" :style="{ left: m.x + '%', top: m.y + '%' }">{{ idx + 1 }}</div>
              </div>
              <div v-if="submitted[activeTask.key]" class="ct-result">
                <strong>影像专家 AI 解读：</strong><br>
                <span class="result-hit" v-for="h in exhibitHits" :key="h">✓ {{ h }}</span><br>
                <span class="result-miss" v-for="m in exhibitMisses" :key="m">✗ {{ m }}</span><br>
                <strong>关键病灶识别率：{{ exhibitPct }}%（{{ exhibitHits.length }}/{{ exhibitTotal }}）</strong>
              </div>
            </div>

            <!-- 已提交反馈 -->
            <div v-if="submitted[activeTask.key] && taskFeedbackList.length" class="expert-feedback mt-3">
              <div class="feedback-title"><i class="fa-solid fa-clipboard-check"></i> 主持人点评</div>
              <div class="feedback-item" v-for="fb in taskFeedbackList" :key="fb.point">{{ fb.icon }} {{ fb.point }}</div>
            </div>
          </div>
          <div class="card-modal-footer">
            <button v-if="!submitted[activeTask.key] && canSkip" class="btn btn-skip" @click="skipCard(activeTask.key)">跳过</button>
            <button v-if="!submitted[activeTask.key]" class="btn btn-primary" @click="submitCard(activeTask.key)" :disabled="!canSubmitTask">提交</button>
            <button v-else class="btn" @click="closeCard">关闭</button>
          </div>
        </div>
      </div>

  
      <!-- attending 确认最终方案 -->
      <div v-if="showConfirm && confirmPlan" class="modal-overlay" @click.self="reviseFinalPlan">
        <div class="modal-container">
          <div class="modal-header">
            <h3><i class="fa-solid fa-gavel"></i> 确认最终方案</h3>
            <button class="modal-close" @click="reviseFinalPlan"><i class="fa-solid fa-xmark"></i></button>
          </div>
          <div class="modal-body">
            <p class="confirm-plan-label">你作为主诊医师，请确认本次 MDT 的最终方案：</p>
            <div class="confirm-plan-text">{{ confirmPlan.text }}</div>
          </div>
          <div class="modal-footer confirm-plan-footer">
            <button class="btn btn-skip" @click="reviseFinalPlan">返回修改</button>
            <button class="btn btn-primary" @click="confirmFinalPlan"><i class="fa-solid fa-check"></i> 确认方案</button>
          </div>
        </div>
      </div>

    </template>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from '@ai-sp/shared'
import { loadMDTCase, disciplineIcon } from '@/composables/useMDTData'
import { matchPatientImage } from '@/composables/usePatientImage'
import { useMDTDirector } from '@/composables/useMDTDirector'
import { useTrainingStore } from '@/stores/training'
import { getRoleConfig } from '@/composables/roleConfig'
import { useASR } from '@/composables/useASR'

const route = useRoute()
const router = useRouter()
const store = useTrainingStore()
const director = useMDTDirector()

const AVATAR_BASE = '/images/avatars/'
const EXPERT_AVATARS = [
  AVATAR_BASE + 'avatar-friendly-zhao.png',
  AVATAR_BASE + 'avatar-skeptical-wang.png',
  AVATAR_BASE + 'avatar-academic-li.png',
  AVATAR_BASE + 'avatar-busy-zhang.png',
  AVATAR_BASE + encodeURIComponent('男医生形象.png'),
  AVATAR_BASE + encodeURIComponent('男医生形象 (1).png'),
]
const EXPERT_AVATAR_CLASSES = ['av-host', 'av-onco', 'av-radio', 'av-path', 'av-nurse', 'av-anes']
const ROLE_ICONS = { observer: '👁', attending: '🎯' }
const PLACEHOLDER_BY_ROLE = { observer: '输入你的疑问...', attending: '请组织讨论/追问...' }

// 任务图标/配色按 type 兜底（任务 JSON 可自定义 icon）
const STYLE_BY_TYPE = {
  text: { bg: '#eff6ff', color: '#409EFF', icon: 'fa-solid fa-clipboard-list' },
  choice: { bg: '#f0fdf4', color: '#059669', icon: 'fa-solid fa-square-poll-vertical' },
  exhibit: { bg: '#fef3c7', color: '#d97706', icon: 'fa-solid fa-x-ray' },
}
const DEFAULT_STYLE = { bg: '#f3f4f6', color: '#6b7280', icon: 'fa-solid fa-clipboard' }

// 流程版本：v3 = 新流程（病例汇报→专科意见→主诊医师意见→自由讨论→拍板决策→反思，
// 拍板后各专科评判循环；影像解读不再作为独立阶段）。旧存档恢复时自动重播新流程。
const MDT_FLOW_VERSION = 3

// ── 状态机 ──
const loading = ref(true)
const phase = ref('prep')          // 'prep' | 'discussion' | 'ended'（会诊前发起在独立页面 mdtPreMeeting）
const mdtId = ref('')
const caseData = ref(null)
const studentRole = ref('attending')
const currentStage = ref(0)
const agentsTyping = ref(0)      // 阶段3 多智能体并发计数（>0 即处于发言中）
const streamingActive = ref(0)   // 流式展示中（此时隐藏"正在发言"指示器）
const isTyping = computed(() => agentsTyping.value > 0)
const showTypingIndicator = computed(() => agentsTyping.value > 0 && streamingActive.value === 0)
const discussionRef = ref(null)
const chatItems = ref([])
const agendaIndex = ref(0)         // 下一要播的 runtimeAgenda 条目索引
const pendingTask = ref(null)      // 当前暂停等待的任务类型
const currentSpeakerKey = ref('host')
const decisionRevealed = ref(false)   // MDT 决策卡是否已在拍板环节展示
// 批注4：拍板后各专科评判主诊方案（同意→通过；异议→修改方案循环，最多 judgementMaxRounds 轮）
const judgementMaxRounds = 3
const judgementRound = ref(0)           // 当前评判轮数
const judgementResults = ref(null)      // 最近一轮各科评判 [{dept, verdict, reason}]
let playing = false
let agendaRunId = 0            // 讨论运行标记：重开时自增，令旧的 playAgenda 中断，避免残留异步污染新会话
// ── 新流程阶段（运行时合成，替代病例自带 stages/agenda 的旧五段）──
// 批注2：影像解读不再作为独立阶段；批注3：专科意见后插入「主诊医师意见」
const runtimeStages = computed(() => ['病例汇报', '专科意见', '主诊医师意见', '自由讨论', '拍板决策', '反思'])

// ── 病例信息分页 ──
const activeInfoTab = ref('basic')
const infoTabs = [
  { key: 'basic', label: '基本信息', icon: 'fa-solid fa-user' },
  { key: 'history', label: '病史资料', icon: 'fa-solid fa-notes-medical' },
  { key: 'reports', label: '检查报告', icon: 'fa-solid fa-file-waveform' },
  { key: 'mdt', label: 'MDT议题', icon: 'fa-solid fa-circle-question' },
]

// ── 卡片状态（任务 key 动态化）──
const activeCard = ref(null)       // 当前打开的任务 key
const submitted = ref({})          // { [taskKey]: boolean }
const skipped = ref({})            // { [taskKey]: boolean }
const taskValues = ref({})         // { [taskKey]: 作答（text→string / choice→string|string[] / exhibit→markers[]） }
const selectedChoices = ref({})    // choice 多选暂存 { [taskKey]: string[] }
const markers = ref([])            // 当前 exhibit 任务的标注点

// 阶段2：LLM 能力评价缓存 + attending 确认方案
const portraitAssess = ref(null)      // [{dim,score,note}]
const portraitAssessing = ref(false)
const confirmPlan = ref(null)         // {taskKey, text}
const showConfirm = ref(false)

// 会诊前发起（DESIGN_02 §4.2）：主诊·管床·主任 + 病例启用 preMeeting 时先走会诊前
// 发起流程在独立页面 mdtPreMeeting 完成，本页仅保留状态快照（存档/归档/恢复用）
const preMeetingApplied = ref(false)     // 是否已提交申请
const preMeetingApproved = ref(false)    // AI 审批是否通过
const preMeetingFeedback = ref('')       // 审批未通过时的补充意见
const preMeetingForm = ref({ questions: '', summary: '', depts: [] })

// ── 原始病历入口：跳转独立页面（与 MDT 病例详情「原始病历」同页，非侧滑弹窗）──
const hasRawRecord = computed(() => !!caseData.value?.sourceRecordId)

function openRawRecordPage() {
  const srcId = caseData.value?.sourceRecordId
  if (!srcId) return
  // 新标签页打开原始病历页面，讨论页保留在当前标签（不中断进行中的讨论）
  const url = router.resolve({
    name: 'mdtRawRecord',
    query: { sourceRecordId: srcId, title: caseData.value?.name || '' },
  }).href
  window.open(url, '_blank')
}

let runSeq = 0                        // 重开守卫：丢弃上一轮仍在飞的异步结果（如能力评价）

// 观察者无决策权，任务可跳过；主诊医师须全部完成
const canSkip = computed(() => !getRoleConfig(studentRole.value).decision)

// ── 学员输入 ──
const chatInput = ref('')

const caseInfo = computed(() => {
  const pi = caseData.value?.patientInfo || {}
  return {
    patientName: pi.name || '',
    caseId: caseData.value?.caseId || caseData.value?.id || '',
    difficulty: caseData.value?.levelLabel || '',
    teachingPhase: caseData.value?.teachingPhase || '',
    gender: pi.gender || '',
    age: pi.age || '',
    specialty: caseData.value?.disciplines?.[0] || '',
    chiefComplaint: pi.chiefComplaint || '',
    presentIllness: pi.presentIllness || '',
    physicalExam: pi.physicalExam || '',
    pastHistory: pi.pastHistory || '',
    familyHistory: pi.familyHistory || '',
    labTests: pi.labTests || '',
    imagingText: pi.imagingText || '',
  }
})

const patientAvatar = computed(() => matchPatientImage({ gender: caseInfo.value.gender, age: caseInfo.value.age }, 'patient'))

const caseFeatures = computed(() => {
  const pts = caseData.value?.knowledgeBase?.clinicalKeyPoints
  return pts ? [pts] : []
})

const mdtQuestions = computed(() =>
  (caseData.value?.keyQuestions || []).map((q, i) => ({ id: i + 1, text: q }))
)

const roleOption = computed(() => getRoleConfig(studentRole.value))

// ── 参与者（roster）──
const members = computed(() => {
  const list = [
    { name: '主持人', role: '流程调度', initials: 'MC', avatarClass: 'av-host', avatar: EXPERT_AVATARS[0], speakerKey: 'host', isCurrentSpeaker: currentSpeakerKey.value === 'host' },
  ]
  ;(caseData.value?.disciplines || []).forEach((d, i) => {
    list.push({
      name: d, role: d, initials: d.slice(0, 2),
      avatarClass: EXPERT_AVATAR_CLASSES[(i + 1) % EXPERT_AVATAR_CLASSES.length],
      avatar: EXPERT_AVATARS[(i + 1) % EXPERT_AVATARS.length],
      speakerKey: d,
      isCurrentSpeaker: currentSpeakerKey.value === d,
    })
  })
  return list
})

const currentSpeaker = computed(() =>
  members.value.find(m => m.speakerKey === currentSpeakerKey.value) || members.value[0]
)

function memberOf(speaker) {
  return members.value.find(m => m.speakerKey === speaker) || members.value[0]
}

// 阶段3：专家端口（调度与生成分离；病例加载后稳定，重进重建）
const mdtPorts = computed(() => (caseData.value ? director.buildExpertPorts(caseData.value) : {}))

const learnerAvatar = AVATAR_BASE + encodeURIComponent('学习者.png')

// ── 任务定义（通用模型：key 引用，type 驱动渲染）──
// 拍板阶段合并原 strategy01（策略选择）+ plan01（治疗方案）为一个任务：诊断+治疗+依据
const RUNTIME_PLAN_TASK = {
  key: 'plan01',
  type: 'text',
  label: '主诊医师最终决策',
  assess: 'plan',
  prompt: '综合各专科意见，以主诊医师身份给出本次 MDT 的最终诊断与治疗方案（含关键决策依据与权衡）。',
  rows: 6,
  placeholder: '1. 最终诊断及依据\n2. 治疗/处理方案\n3. 关键权衡与下一步',
  feedback: {},
}
// 批注3：专科意见后主诊医师发表综合意见（Learner-paced 任务卡）
const RUNTIME_ATTENDING_VIEW_TASK = {
  key: 'attendingView01',
  type: 'text',
  label: '主诊医师意见',
  assess: 'attendingView',
  prompt: '结合各专科意见，以主诊医师身份发表你的综合看法（诊断方向、对专科分歧的权衡、下一步重点关注）。',
  rows: 5,
  placeholder: '1. 对诊断方向/方案的初步看法\n2. 对专科分歧的权衡\n3. 下一步需要重点关注的问题',
  feedback: {},
}
function getTask(key) {
  if (key === 'plan01') return RUNTIME_PLAN_TASK
  if (key === 'attendingView01') return RUNTIME_ATTENDING_VIEW_TASK
  return caseData.value?.tasks?.find(t => t.key === key) || null
}

const activeTask = computed(() => getTask(activeCard.value) || null)
const activeTaskIcon = computed(() => {
  const t = activeTask.value
  if (!t) return DEFAULT_STYLE.icon
  if (t.icon) return t.icon
  return STYLE_BY_TYPE[t.type]?.icon || DEFAULT_STYLE.icon
})
const taskFeedbackList = computed(() => {
  const fb = activeTask.value?.feedback || {}
  return [...(fb.hits || []), ...(fb.misses || [])]
})

// exhibit 影像任务的命中/遗漏统计
const exhibitHits = computed(() => (activeTask.value?.feedback?.hits || []).map(f => f.point))
const exhibitMisses = computed(() => (activeTask.value?.feedback?.misses || []).map(f => f.point))
const exhibitTotal = computed(() => exhibitHits.value.length + exhibitMisses.value.length)
const exhibitPct = computed(() => {
  const t = exhibitTotal.value
  return t ? Math.round(exhibitHits.value.length / t * 100) : 0
})

// 提交按钮可用性
const canSubmitTask = computed(() => {
  const t = activeTask.value
  if (!t) return false
  if (submitted.value[t.key]) return true
  if (t.type === 'text') return !!String(taskValues.value[t.key] || '').trim()
  if (t.type === 'choice') return t.multi ? (selectedChoices.value[t.key] || []).length > 0 : !!taskValues.value[t.key]
  if (t.type === 'exhibit') return markers.value.length > 0
  return false
})

// choice 单选/多选交互
function isOptionSelected(task, opt) {
  if (task.multi) return (selectedChoices.value[task.key] || []).includes(opt)
  return taskValues.value[task.key] === opt
}
function onChoiceChange(task, opt) {
  if (submitted.value[task.key]) return
  if (task.multi) {
    const arr = selectedChoices.value[task.key] || []
    const i = arr.indexOf(opt)
    if (i >= 0) arr.splice(i, 1)
    else arr.push(opt)
    selectedChoices.value[task.key] = [...arr]
  } else {
    taskValues.value[task.key] = opt
  }
}

function taskCardTitle(key) {
  const t = getTask(key)
  return t?.label || key
}
function taskCardStyle(key) {
  const t = getTask(key)
  const style = STYLE_BY_TYPE[t?.type] || DEFAULT_STYLE
  return { background: style.bg, color: style.color }
}
function taskCardIcon(key) {
  const t = getTask(key)
  if (t?.icon) return t.icon
  return STYLE_BY_TYPE[t?.type]?.icon || DEFAULT_STYLE.icon
}
function taskCardSummary(key) {
  const t = getTask(key)
  if (skipped.value[key]) return '已跳过'
  const v = taskValues.value[key]
  if (t?.type === 'exhibit') return `已标注 ${(v?.length || markers.value.length)} 处异常`
  if (Array.isArray(v)) return v.join('、')
  const s = String(v || '')
  return s.length > 60 ? s.substring(0, 60) + '...' : s
}

function imgIcon(modality) {
  const map = { CT: 'fa-solid fa-x-ray', DSA: 'fa-solid fa-heart-pulse', MRI: 'fa-solid fa-brain', CTA: 'fa-solid fa-wave-square', NM: 'fa-solid fa-bone', '眼底照相': 'fa-solid fa-eye' }
  return map[modality] || 'fa-solid fa-image'
}

// ── 持久化 ──
function saveState(extra = {}) {
  if (!store.trainingSession?.mdt) return
  store.saveSessionStage('mdt', {
    ...store.trainingSession.mdt,
    mdtId: mdtId.value,
    caseId: caseData.value?.caseId || '',
    studentRole: studentRole.value,
    flowVersion: MDT_FLOW_VERSION,
    currentStage: currentStage.value,
    agendaIndex: agendaIndex.value,
    currentSpeakerKey: currentSpeakerKey.value,
    pendingTask: pendingTask.value,
    messages: chatItems.value.map(({ revealed, ...rest }) => rest),   // 剥离流式进度，恢复时全文显示
    tasks: { ...taskValues.value },
    selectedChoices: { ...selectedChoices.value },
    submitted: { ...submitted.value },
    skipped: { ...skipped.value },
    markers: [...markers.value],
    portraitAssess: portraitAssess.value,
    decisionRevealed: decisionRevealed.value,
    judgementRound: judgementRound.value,
    judgementResults: judgementResults.value,
    phase: phase.value,
    preMeeting: {
      applied: preMeetingApplied.value,
      applicationText: { questions: preMeetingForm.value.questions, summary: preMeetingForm.value.summary },
      invitedDepts: preMeetingForm.value.depts,
      approved: preMeetingApproved.value,
      feedback: preMeetingFeedback.value,
    },
    ...extra,
  })
}

function pushExpert(speaker, text) {
  chatItems.value.push({ type: 'expert', speaker, text })
  currentSpeakerKey.value = speaker
  saveState()
  nextTick(() => scrollToBottom())
}

function wait(ms) {
  return new Promise(r => setTimeout(r, ms))
}

// 话轮暂停（Learner-paced）：专家发言后暂停，等待学员决定"发问"或"继续讨论"
const awaitingTurn = ref(false)
let turnResolve = null
function awaitTurn() {
  awaitingTurn.value = true
  return new Promise(resolve => { turnResolve = resolve })
}
function resumeTurn() {
  awaitingTurn.value = false
  if (turnResolve) { const r = turnResolve; turnResolve = null; r() }
}
// 专家发言结束→交还话轮前的过渡停顿（期间按钮禁用，避免点击被吞）
const turnPending = ref(false)
async function turnPause() {
  turnPending.value = true
  await wait(3000)
  turnPending.value = false
}

function beginTyping(speaker) {
  agentsTyping.value++
  if (speaker) currentSpeakerKey.value = speaker
}

function endTyping() {
  agentsTyping.value = Math.max(0, agentsTyping.value - 1)
}

// 流式展示：消息先以空文本入列，按自然语速逐字 reveal
function msgText(item) {
  if (item.revealed === undefined) return item.text
  return item.text.slice(0, item.revealed)
}

function streamExpertMessage(speaker, text) {
  chatItems.value.push({ type: 'expert', speaker, text, revealed: 0 })
  currentSpeakerKey.value = speaker
  const msg = chatItems.value[chatItems.value.length - 1]   // 取响应式代理，逐字更新驱动模板
  streamingActive.value++
  saveState()
  nextTick(() => scrollToBottom())
  return animateReveal(msg, text).finally(() => {
    streamingActive.value = Math.max(0, streamingActive.value - 1)
  })
}

function animateReveal(msg, text) {
  return new Promise(resolve => {
    const total = (text || '').length
    if (!total) { msg.revealed = 0; resolve(); return }
    // 语速自适应：短文本约 35 字/秒，长文略快（后续接语音时改由音频时长驱动）
    const cps = total < 60 ? 35 : total < 200 ? 50 : 65
    const tick = 28
    let shown = 0
    const step = () => {
      shown = Math.min(shown + Math.max(1, Math.round(cps * tick / 1000)), total)
      msg.revealed = shown
      nextTick(() => scrollToBottom())
      if (shown >= total) { resolve(); return }
      setTimeout(step, tick)
    }
    step()
  })
}

async function playExpert(speaker, text) {
  currentSpeakerKey.value = speaker
  beginTyping()
  await wait(400)   // 静态文本：短暂"准备发言"感，再流式展示
  await streamExpertMessage(speaker, text)
  endTyping()
  await turnPause()   // 发言结束停顿 3 秒：营造"说完了→下一位"的自然换人节奏
  nextTick(() => scrollToBottom())
}

// 阶段3：专家动态发言（LLM 独立生成，失败回退剧本文本）
async function playGeneratedExpert(entry) {
  beginTyping(entry.speaker)
  const result = await director.speakAsExpert({
    caseData: caseData.value,
    ports: mdtPorts.value,
    speaker: entry.speaker,
    entry,
    stageIdx: currentStage.value,
    recentMessages: chatItems.value,
    studentRole: studentRole.value,
  })
  if (result?.ok && result.text) {
    currentSpeakerKey.value = entry.speaker
    await streamExpertMessage(entry.speaker, result.text)   // 生成完成 → 流式展示
    endTyping()
    await turnPause()   // 动态发言结束停顿 3 秒：专家切换时留出自然讨论间隙
  } else {
    endTyping()
    await playExpert(entry.speaker, entry.text)
  }
}

// 阶段3：分歧收敛（识别 → 二次讨论 → 归纳收敛；失败回退规则分歧语）
async function runConvergence(opening, stageIdx) {
  const transcripts = chatItems.value.filter(m => m.type === 'expert')
  beginTyping('host')
  const result = await director.convergeDisagreements({
    caseData: caseData.value,
    ports: mdtPorts.value,
    studentRole: studentRole.value,
    transcripts,
    stageIdx,
    recentMessages: chatItems.value,
  })
  endTyping()
  if (!result.ok || !result.convergence) {
    await playExpert('host', opening.disagreement)
    return
  }
  if (result.disagreementMsg) await playExpert('host', result.disagreementMsg)
  for (const r of result.reRound || []) {
    await playExpert(r.speaker, r.text)
  }
  await playExpert('host', result.convergence)
  saveState()
  nextTick(() => scrollToBottom())
}

// ── 新流程议程合成（替代病例自带 agenda 的旧五段）──
// 病例汇报由 playOpenings 播报，此处从病例字段合成：专科意见→主诊医师意见→自由讨论→拍板→反思
function buildRuntimeAgenda(cd, stages) {
  if (!cd) return []
  const entries = []
  const perspectives = cd.knowledgeBase?.disciplinePerspectives || []
  const viewOf = d => perspectives.find(p => p.dept === d)?.view || ''
  const disciplines = cd.disciplines && cd.disciplines.length
    ? cd.disciplines
    : perspectives.map(p => p.dept).filter(Boolean)
  const idx = s => stages.indexOf(s)

  // 专科意见：各专科依次轮流发言（speakAsExpert 生成 / view 兜底）
  const pSpecialty = idx('专科意见')
  if (pSpecialty >= 0 && disciplines.length) {
    entries.push({ phase: pSpecialty, speaker: 'host', text: '病例汇报完毕。下面请各专科依次就本病例发表意见。' })
    for (const d of disciplines) {
      entries.push({ phase: pSpecialty, speaker: d, text: viewOf(d) || `${d}专家：基于本科室角度，就本病例的诊治发表意见。` })
    }
    // 各专科发表完意见后，主诊医师发表综合意见（批注3，独立阶段「主诊医师意见」）
    const pAttending = idx('主诊医师意见')
    if (pAttending >= 0) {
      entries.push({
        phase: pAttending,
        speaker: 'host',
        text: '各专科意见已发表完毕。请主诊医师结合各专科意见，发表你作为主诊医师的综合看法。',
        nextTask: 'attendingView01',
      })
    }
  }
  // 影像解读已移除（批注2：影像解读不需要单独一个阶段）
  // 自由讨论：各科互辩 + 学员随时插话
  const pFree = idx('自由讨论')
  if (pFree >= 0) {
    entries.push({ phase: pFree, speaker: 'host', text: '现在进入自由讨论环节，各科室可围绕分歧点互相交换意见，你也可以随时提问、补充或质疑。' })
    entries.push({ phase: pFree, speaker: 'host', text: '请主诊医师权衡各方意见；若有补充可直接发言，确认可以推进时继续。' })
  }
  // 拍板决策：先分歧收敛（专家互辩→归纳），再学员以主诊医师身份拍板诊断+方案
  const pPlan = idx('拍板决策')
  if (pPlan >= 0) {
    entries.push({
      phase: pPlan, speaker: 'host',
      text: '综合各位意见，我们进入决策环节。请以主诊医师身份，独立给出本次 MDT 的最终诊断与治疗方案。',
      converge: true, disagreement: director.buildDisagreementText(cd, studentRole.value),
      nextTask: 'plan01',
    })
    entries.push({ phase: pPlan, revealDecision: true })
  }
  // 反思收尾
  const pReflect = idx('反思')
  if (pReflect >= 0) {
    entries.push({ phase: pReflect, speaker: 'host', text: '本次讨论已接近尾声，请写下你的反思总结。', nextTask: 'reflect01' })
  }
  return entries
}

const runtimeAgenda = computed(() => buildRuntimeAgenda(caseData.value, runtimeStages.value))

// 展示 MDT 一致决策 / 随访 / 参考（拍板后对照展示，仅一次）
function pushDecisionCards() {
  if (decisionRevealed.value) return
  decisionRevealed.value = true
  pushExpert('host', '各专科意见已归纳一致。以下是 MDT 最终决策、随访计划与参考依据，请对照你的方案分析差异。')
  chatItems.value.push({ type: 'decision' })
  chatItems.value.push({ type: 'followup' })
  if (caseData.value?.referencesList?.length) chatItems.value.push({ type: 'references' })
  saveState()
  nextTick(() => scrollToBottom())
}

async function playAgenda() {
  if (playing) return
  playing = true
  const myRun = agendaRunId
  const pSpecialtyIdx = runtimeStages.value.indexOf('专科意见')
  try {
    const agenda = runtimeAgenda.value
    while (agendaIndex.value < agenda.length) {
      if (myRun !== agendaRunId) return   // 新一轮讨论已开始 → 放弃本轮剩余播报（重开保护）
      const entry = agenda[agendaIndex.value]
      agendaIndex.value++
      // 阶段切换：拍板前注入分歧收敛（识别→二次交锋→归纳）
      if (entry.phase !== currentStage.value) {
        currentStage.value = entry.phase
        if (entry.converge) {
          await playExpert('host', entry.text)
          if (director.hasStage3(caseData.value)) {
            await runConvergence(entry, entry.phase)
          } else if (entry.disagreement) {
            await playExpert('host', entry.disagreement)
          }
          if (entry.nextTask) {
            pendingTask.value = entry.nextTask
            chatItems.value.push({ type: 'task', taskKey: entry.nextTask })
            saveState()
            nextTick(() => scrollToBottom())
            return
          }
          continue
        }
      }
      if (entry.revealDecision) { pushDecisionCards(); continue }
      // 阶段3：非 host 专家动态生成（独立知识库发言）；否则播剧本文本
      if (entry.speaker === 'host') {
        await playExpert('host', entry.text)
      } else if (director.hasStage3(caseData.value)) {
        await playGeneratedExpert(entry)
      } else {
        await playExpert(entry.speaker, entry.text)
      }
      // 专科意见阶段：每位专家发言后暂停，等待学员决定"发问"或"继续讨论"（Learner-paced）
      if (entry.speaker !== 'host' && entry.phase === pSpecialtyIdx) {
        await awaitTurn()
      }
      if (entry.nextTask) {
        pendingTask.value = entry.nextTask
        // 主诊医师意见走输入框直接输入，不推送任务卡（无弹窗）
        if (entry.nextTask !== 'attendingView01') {
          chatItems.value.push({ type: 'task', taskKey: entry.nextTask })
        }
        saveState()
        nextTick(() => scrollToBottom())
        return
      }
    }
    // 播完 → 结束（决策卡已在拍板环节展示，此处仅收尾）
    pendingTask.value = null
    finishDiscussion()
  } finally {
    if (myRun === agendaRunId) playing = false   // 仅当前轮次释放锁，避免被重开中断的过期轮次误关新会话
  }
}

function finishDiscussion() {
  if (!decisionRevealed.value) pushDecisionCards()
  pushExpert('host', '本次 MDT 讨论已结束，谢谢参与。')
  phase.value = 'ended'
  saveState({ done: true })
  nextTick(() => scrollToBottom())
  archiveMdtSession({ done: true })   // 立即归档完整记录（评价异步完成后同会话升级补充）
  runPortraitAssessment()
}

// ── 完整对话归档（训练记录，供后续分析专家AI表现与流程合理性）──
// 以 startedAt 为会话级 epoch，同一会话重复归档（中断→完成）合并为一条并升级为完整内容
function archiveMdtSession({ done }) {
  if (!caseData.value) return
  const s = store.trainingSession?.mdt || {}
  const startedAt = s.startedAt || new Date().toISOString()
  const finishedAt = new Date().toISOString()
  const epoch = Date.parse(startedAt)
  store.addTrainingRecord({
    caseId: caseData.value.caseId || mdtId.value,
    stationId: 'mdt',
    stationName: 'MDT多学科讨论',
    sessionEpoch: epoch,
    trainingVersion: 'mdt',
    score: null,                      // MDT 非硬评分，过程性反馈
    done: !!done,
    duration: Math.max(0, Math.round((Date.parse(finishedAt) - epoch) / 1000)),
    caseTitle: caseData.value.patientInfo?.name || caseData.value.title || mdtId.value,
    studentRole: studentRole.value,
    startedAt,
    finishedAt,
    messages: chatItems.value.map(({ revealed, ...rest }) => rest),   // 完整对话（含专家发言/学员发言/任务/决策）
    taskLabels: Object.fromEntries([...(caseData.value?.tasks || []), RUNTIME_PLAN_TASK, RUNTIME_ATTENDING_VIEW_TASK].map(t => [t.key, t.label])),
    portraitAssess: portraitAssess.value,
    tasks: { ...taskValues.value },
    selectedChoices: { ...selectedChoices.value },
    submitted: { ...submitted.value },
    skipped: { ...skipped.value },
    markers: [...markers.value],
    mdtId: mdtId.value,
    phase: phase.value,
    preMeeting: {
      applied: preMeetingApplied.value,
      applicationText: preMeetingForm.value.questions ? { questions: preMeetingForm.value.questions, summary: preMeetingForm.value.summary } : null,
      invitedDepts: preMeetingForm.value.depts,
      approved: preMeetingApproved.value,
    },
  })
}

// 阶段2：LLM 能力评价（批判性/循证/反思三维度）
async function runPortraitAssessment() {
  if (portraitAssess.value || portraitAssessing.value) return
  const seq = runSeq
  portraitAssessing.value = true
  const result = await director.assessPortrait({
    caseData: caseData.value,
    studentRole: studentRole.value,
    studentMessages: chatItems.value.filter(m => m.type === 'student'),
    taskValues: { ...taskValues.value },
    submitted: { ...submitted.value },
  })
  portraitAssessing.value = false
  if (seq !== runSeq) return   // 已重新开始，丢弃过期评估
  if (result) {
    portraitAssess.value = result
    saveState()
  }
  // 评价就绪后归档/升级完整记录（同会话按 startedAt 合并）
  if (phase.value === 'ended') archiveMdtSession({ done: true })
}

async function startDiscussion() {
  if (!caseData.value) return
  const enabled = getRoleConfig(studentRole.value).preMeeting === true
    && caseData.value.preMeeting !== false
    && (caseData.value.inviteCandidates?.length || caseData.value.disciplines?.length || 0) >= 2
  store.saveSessionStage('mdt', {
    mdtId: mdtId.value,
    caseId: caseData.value.caseId || '',
    studentRole: studentRole.value,
    flowVersion: MDT_FLOW_VERSION,
    startedAt: new Date().toISOString(),
    phase: enabled ? 'premeeting' : 'discussion',
    currentStage: 0,
    agendaIndex: 0,
    currentSpeakerKey: 'host',
    pendingTask: null,
    messages: [],
    tasks: {},
    selectedChoices: {},
    submitted: {},
    skipped: {},
    markers: [],
    done: false,
    preMeeting: { applied: false, applicationText: null, invitedDepts: [], approved: null, feedback: '' },
  })
  phase.value = enabled ? 'premeeting' : 'discussion'
  chatItems.value = []
  // 重置运行态：重开时必须清掉上轮遗留的议程游标/阶段/任务/发言人，否则 playAgenda 会从旧位置续播或直接结束
  agendaIndex.value = 0
  currentStage.value = 0
  pendingTask.value = null
  currentSpeakerKey.value = 'host'
  decisionRevealed.value = false
  judgementRound.value = 0
  judgementResults.value = null
  agendaRunId++
  turnPending.value = false
  preMeetingApplied.value = false
  preMeetingApproved.value = false
  preMeetingFeedback.value = ''
  preMeetingForm.value = { questions: '', summary: '', depts: [] }
  if (enabled) {
    // 会诊前发起在独立页面（mdtPreMeeting）完成 → 跳转；会话已按 phase='premeeting' 保存
    router.push({ name: 'mdtPreMeeting', params: { caseId: mdtId.value } })
  } else {
    await playOpenings()
  }
}

// 会诊中开场：完整病例汇报 + 原始病历入口 + 新流程（premeeting 确认进入后复用）
async function playOpenings() {
  // 开场引入：欢迎 + 病例概要 + 核心议题 + 参与学科 + 流程（数据驱动，避免一上来就让学员发言）
  const intro = buildMdtIntro(caseData.value, runtimeStages.value)
  if (intro) await playExpert('host', intro)   // 开场引入也流式展示，营造自然开场
  // 完整病例汇报：按 MDT 病例内容分节汇报（含摘要/住院经过/初步诊断考虑）
  const report = buildCaseReport(caseData.value)
  if (report) {
    await playExpert('host', report)
  }
  // 原始病历抽屉入口：绑定原始病历的病例提供「查看原始病历」卡（按事件线查看 mdt 之前全部病历）
  if (caseData.value?.sourceRecordId) {
    chatItems.value.push({ type: 'case-raw' })
    saveState()
    nextTick(() => scrollToBottom())
  }
  playAgenda()
}

// 完整病例汇报（阶段0）：按 MDT 病例内容分节汇报
// patientInfo 结构化字段 + clinicalKeyPoints 摘要 + admissionContext 住院经过 + 核心议题帧（无 LLM 幻觉）
function buildCaseReport(cd) {
  const pi = cd.patientInfo || {}
  const seg = [`好的，我先完整汇报病例。患者：${pi.gender || ''}${pi.age || ''}岁${pi.name || '患者'}，主诉：${pi.chiefComplaint || '不详'}。`]
  if (pi.presentIllness) seg.push(`【现病史】${pi.presentIllness}`)
  if (pi.pastHistory) seg.push(`【既往史】${pi.pastHistory}`)
  if (pi.familyHistory) seg.push(`【家族史】${pi.familyHistory}`)
  if (pi.physicalExam) seg.push(`【查体】${pi.physicalExam}`)
  if (pi.vitals) seg.push(`【生命体征】${pi.vitals}`)
  if (pi.labTests) seg.push(`【实验室检查】${pi.labTests}`)
  if (pi.imagingText) seg.push(`【影像学】${pi.imagingText}`)
  if (cd.knowledgeBase?.clinicalKeyPoints) seg.push(`【病情摘要】${cd.knowledgeBase.clinicalKeyPoints}`)
  if (cd.admissionContext?.priorCourse) {
    seg.push(`【住院经过】${cd.admissionContext.daysHospitalized ? `入院第 ${cd.admissionContext.daysHospitalized} 天，` : ''}${cd.admissionContext.priorCourse}`)
  }
  const suspect = cd.trigger?.reason || cd.objective
  if (suspect) seg.push(`【初步诊断考虑】结合以上资料，初步诊断方向需紧扣核心议题：${cd.objective || ''}。触发本次会诊的关键原因是：${suspect}。请各位专家在随后的专科意见中围绕这一点展开。`)
  return seg.join('\n')
}

// 开场引入语：欢迎 + 病例 + 核心议题 + 参与学科 + 流程（流程用运行时阶段）
function buildMdtIntro(cd, stages = []) {
  const pi = cd.patientInfo || {}
  const parts = [`欢迎参加本次 MDT 多学科讨论，今天围绕${pi.gender || ''}${pi.age || ''}岁${pi.name || '患者'}（主诉：${pi.chiefComplaint || ''}）进行多学科会诊`]
  if (cd.objective) parts.push(`核心议题：${cd.objective}`)
  const disciplines = (cd.disciplines || []).join('、')
  if (disciplines) parts.push(`参与学科：${disciplines}`)
  const flow = (stages && stages.length ? stages : cd.stages || []).join(' → ')
  if (flow) parts.push(`讨论流程：${flow}`)
  return parts.join('。') + '。'
}

function continueDiscussion() {
  if (phase.value === 'ended') return
  if (showConfirm.value) return
  if (awaitingTurn.value) { resumeTurn(); return }
  if (pendingTask.value && !submitted.value[pendingTask.value]) {
    if (pendingTask.value === 'attendingView01') return   // 主诊医师意见直接在输入框输入，无任务卡
    openCard(pendingTask.value)
    return
  }
  pendingTask.value = null
  playAgenda()
}

const continueLabel = computed(() => {
  if (phase.value === 'ended') return '讨论已结束'
  if (showConfirm.value) return '请确认最终方案'
  if (awaitingTurn.value) return '继续讨论'
  if (pendingTask.value === 'attendingView01' && !submitted.value['attendingView01']) return '请在输入框输入'
  if (pendingTask.value && !submitted.value[pendingTask.value]) return '完成任务后继续'
  return '继续讨论'
})
const continueHint = computed(() => {
  if (isTyping.value) return '专家正在发言…'
  if (awaitingTurn.value) return '点击播放下一位专家，或直接在输入框提问'
  if (pendingTask.value === 'attendingView01' && !submitted.value['attendingView01']) return '请直接在下方输入框输入你的主诊综合意见'
  if (pendingTask.value && !submitted.value[pendingTask.value]) return '请先完成任务卡片，或直接输入观点'
  return '点击把话轮交回主持人继续推进'
})

// ── 输入栏 ──
const inputDisabled = computed(() => isTyping.value || phase.value === 'ended')
const inputPlaceholder = computed(() => {
  if (phase.value === 'ended') return '本次讨论已结束'
  if (isTyping.value) return '专家正在发言…'
  if (pendingTask.value === 'attendingView01' && !submitted.value['attendingView01']) return '请以主诊医师身份，结合各专科意见发表你的综合看法'
  if (pendingTask.value && !submitted.value[pendingTask.value]) return '请先完成任务卡片，或输入你的观点'
  return PLACEHOLDER_BY_ROLE[studentRole.value] || '输入你的观点或疑问，专家将回应...'
})

// ── 卡片操作 ──
function openCard(key) {
  if (key === 'attendingView01') return   // 主诊医师意见直接在输入框输入，无任务卡弹窗
  const t = getTask(key)
  if (!t) return
  // exhibit 打开时回填已标注点；多选 choice 回填已选项
  if (t.type === 'exhibit') {
    markers.value = Array.isArray(taskValues.value[key]) ? [...taskValues.value[key]] : []
  } else if (t.type === 'choice' && t.multi && !selectedChoices.value[key]) {
    selectedChoices.value[key] = Array.isArray(taskValues.value[key]) ? [...taskValues.value[key]] : []
  }
  activeCard.value = key
}
function closeCard() { activeCard.value = null }

function getTaskValue(key) {
  const t = getTask(key)
  if (!t) return ''
  if (t.type === 'exhibit') return [...markers.value]
  if (t.type === 'choice' && t.multi) return [...(selectedChoices.value[key] || [])]
  return taskValues.value[key] || ''
}

function buildFeedbackText(key) {
  const t = getTask(key)
  const gentle = getRoleConfig(studentRole.value).feedbackMode === 'gentle'
  const lead = gentle ? '已收到你的作答。对照 MDT 标准要点一起看，对不上也没关系：\n' : '对照本次 MDT 决策要点：\n'
  const fb = t?.feedback
  if (fb && ((fb.hits || []).length || (fb.misses || []).length)) {
    return lead + [...(fb.hits || []), ...(fb.misses || [])].map(f => `${f.icon || '•'} ${f.point}`).join('\n')
  }
  if (t?.type === 'exhibit') {
    return lead + `关键病灶识别率 ${exhibitPct.value}%（命中 ${exhibitHits.value.length}/${exhibitTotal.value}）`
  }
  if (t?.type === 'choice') {
    return gentle ? '已记录你的选择。接下来可以继续旁听，或直接对照 MDT 最终决策。' : '已记录你的选择。请对照后续 MDT 决策要点，思考你是否认同。'
  }
  return gentle ? '已收到你的作答，可对照后续 MDT 决策要点继续思考，对不上也没关系。' : '已收到你的作答。可对照后续 MDT 决策要点，看看你的思路与 MDT 共识的差异。'
}

async function submitCard(key) {
  const t = getTask(key)
  const value = getTaskValue(key)
  taskValues.value[key] = value
  submitted.value[key] = true
  saveState({ tasks: { ...taskValues.value } })

  // attending 提交方案类 text 任务 → 先弹「确认最终方案」
  if (getRoleConfig(studentRole.value).decision && t?.assess === 'plan' && t?.type === 'text') {
    closeCard()
    confirmPlan.value = { taskKey: key, text: String(value || '') }
    showConfirm.value = true
    return
  }

  await doSubmitFeedback(key, value)
  closeCard()
  nextTick(() => scrollToBottom())
}

// 阶段2：任务提交 LLM 过程反馈；choice/exhibit 有客观对错，保留静态反馈
async function doSubmitFeedback(key, value) {
  const t = getTask(key)
  if (t?.type !== 'text') {
    const fbText = buildFeedbackText(key)
    if (fbText) pushExpert('host', fbText)
    return
  }
  beginTyping('host')
  const result = await director.onTaskSubmit({
    caseData: caseData.value,
    studentRole: studentRole.value,
    taskKey: key,
    taskValue: value,
    task: t,
  }, key)
  if (result?.ok && result.text) {
    currentSpeakerKey.value = 'host'
    await streamExpertMessage('host', result.text)
    endTyping()
  } else {
    endTyping()
    const fbText = buildFeedbackText(key)
    if (fbText) pushExpert('host', fbText)
  }
}

// attending 确认最终方案 → 各专科评判（批注4）
function confirmFinalPlan() {
  const plan = confirmPlan.value
  if (!plan) return
  showConfirm.value = false
  confirmPlan.value = null
  closeCard()
  nextTick(() => scrollToBottom())
  runExpertJudgement()
}

// 批注4：各专科专家对主诊方案逐一评判（同意→通过；异议→修改方案循环，最多 judgementMaxRounds 轮）
// 每位专家评判后停顿 3 秒并暂停等待学员决定（发问或继续），全部评判完再汇总决定
async function runExpertJudgement() {
  judgementRound.value++
  judgementResults.value = []
  const planText = String(taskValues.value.plan01 || '')
  await playExpert('host', '已确认主诊医师最终方案。下面请各专科专家对该方案逐一评判。')
  const depts = caseData.value?.disciplines || []
  for (const d of depts) {
    const port = mdtPorts.value[d]
    if (!port?.judgePlan) {
      judgementResults.value.push({ dept: d, verdict: 'approve', reason: '' })
    } else {
      beginTyping(d)
      const r = await port.judgePlan({
        caseData: caseData.value, speaker: d, planText,
        recentMessages: chatItems.value, stageIdx: currentStage.value,
      })
      endTyping()
      const msg = r.verdict === 'approve'
        ? `我同意主诊医师的方案，${r.reason || '思路与本科室意见一致，通过。'}`
        : `我对主诊医师的方案有异议：${r.reason || '需要进一步权衡。'}`
      await streamExpertMessage(d, msg)
      judgementResults.value.push({ dept: d, verdict: r.verdict, reason: r.reason })
    }
    saveState()
    await turnPause()   // 专家评判发言间隔 3 秒
    await awaitTurn()  // 每位专家评判后暂停，等待学员决定
  }
  await finalizeJudgement()
}

// 全部专家评判完 → 汇总决定（通过 / 强制通过 / 异议修改循环）
async function finalizeJudgement() {
  const objections = judgementResults.value.filter(r => r.verdict === 'object')
  if (!objections.length) {
    await playExpert('host', '各专科专家一致同意主诊医师方案，评判通过。')
    finishJudgementApproved()
  } else if (judgementRound.value >= judgementMaxRounds) {
    const objText = objections.map(r => `【${r.dept}】${r.reason || '有不同意见'}`).join('；')
    await playExpert('host', `部分专科仍持异议：${objText}。经过多轮讨论，请主诊医师权衡各方意见后确定最终方案。`)
    finishJudgementApproved()
  } else {
    const objText = objections.map(r => `【${r.dept}】${r.reason || '有不同意见'}`).join('；')
    await playExpert('host', `部分专科专家对方案持不同意见：${objText}。`)
    await playExpert('host', `请主诊医师根据专家意见修改方案后重新提交（第 ${judgementRound.value}/${judgementMaxRounds} 轮）。`)
    pendingTask.value = 'plan01'
    submitted.value['plan01'] = false      // 重新开放提交以便修改
    saveState()
    nextTick(() => scrollToBottom())
    openCard('plan01')
  }
}

// 评判通过 → 展示 MDT 决策卡，放行继续（反思）
function finishJudgementApproved() {
  pendingTask.value = null
  saveState()
  pushDecisionCards()
}

function reviseFinalPlan() {
  const key = confirmPlan.value?.taskKey
  if (key) {
    submitted.value[key] = false
    saveState()
  }
  showConfirm.value = false
  confirmPlan.value = null
  closeCard()
  if (key) openCard(key)
}

function skipCard(key) {
  submitted.value[key] = true
  skipped.value[key] = true
  saveState()
  const skipText = buildSkipText(key)
  if (skipText) pushExpert('host', skipText)
  closeCard()
  nextTick(() => scrollToBottom())
}

function buildSkipText(key) {
  const label = getTask(key)?.label || '该任务'
  const gentle = getRoleConfig(studentRole.value).feedbackMode === 'gentle'
  return gentle
    ? `好的，先跳过「${label}」。你继续旁听即可，稍后 MDT 决策会给出标准要点供你对照。`
    : `先跳过「${label}」。请继续关注后续讨论，MDT 决策要点稍后会展示。`
}

function addAnnotation(e) {
  const t = activeTask.value
  if (!t || submitted.value[t.key] || t.type !== 'exhibit') return
  const max = Math.min(3, t.image?.expected?.length || 3)
  if (markers.value.length >= max) return
  const rect = e.currentTarget.getBoundingClientRect()
  markers.value.push({
    x: ((e.clientX - rect.left) / rect.width * 100).toFixed(1),
    y: ((e.clientY - rect.top) / rect.height * 100).toFixed(1),
  })
}

// ── 学员插话（阶段2：意图识别 + 角色差异化回应）──
const { isRecording, start, stop, cancel } = useASR()
async function startVoice() {
  try { await start() } catch (e) { toast.show(e.message || '无法访问麦克风', 'error') }
}
async function stopVoice() {
  if (!isRecording.value) return
  const text = await stop()
  if (text) { chatInput.value = text; sendMessage() }
  else toast.show('未识别到语音，请重试', 'error')
}
function cancelVoice() { cancel() }

async function sendMessage() {
  const text = chatInput.value.trim()
  if (!text || inputDisabled.value) return
  chatItems.value.push({ type: 'student', text })
  chatInput.value = ''
  saveState()
  nextTick(() => scrollToBottom())

  // 主诊医师意见：直接在输入框输入即提交（无任务卡弹窗）
  if (pendingTask.value === 'attendingView01' && !submitted.value['attendingView01']) {
    const key = 'attendingView01'
    taskValues.value[key] = text
    submitted.value[key] = true
    saveState({ tasks: { ...taskValues.value } })
    await doSubmitFeedback(key, text)
    pendingTask.value = null
    saveState()
    nextTick(() => scrollToBottom())
    playAgenda()   // 继续自由讨论
    return
  }

  beginTyping(currentSpeakerKey.value)
  const result = await director.onStudentInterrupt({
    caseData: caseData.value,
    studentRole: studentRole.value,
    speakerKey: currentSpeakerKey.value,
    recentMessages: chatItems.value,
    taskContext: pendingTask.value ? { key: pendingTask.value, label: getTask(pendingTask.value)?.label || pendingTask.value } : null,
    currentStage: currentStage.value,
  }, text)

  const speaker = currentSpeakerKey.value
  if (result?.ok && result.text) {
    await streamExpertMessage(speaker, result.text)
    endTyping()
  } else {
    endTyping()
    const fallback = '你的观点很有价值。结合目前的讨论，建议你关注当前议题的关键决策点，再思考一下其中的权衡。我们继续推进讨论。'
    chatItems.value.push({ type: 'expert', speaker, text: fallback })
    saveState()
    nextTick(() => scrollToBottom())
  }
}

// ── 会话恢复 ──
// 返回 true 表示旧流程（v1）会话，需要按新流程重播
function restoreSession(s) {
  // 流程重构后角色固定主诊·管床·主任；旧存档身份一律映射为 attending
  studentRole.value = 'attending'
  phase.value = s.done ? 'ended' : (s.phase || 'discussion')
  chatItems.value = s.messages || []
  agendaIndex.value = s.agendaIndex || 0
  currentStage.value = s.currentStage || 0
  currentSpeakerKey.value = s.currentSpeakerKey || 'host'
  pendingTask.value = s.pendingTask || null
  decisionRevealed.value = !!s.decisionRevealed
  submitted.value = { ...(s.submitted || {}) }
  skipped.value = { ...(s.skipped || {}) }
  taskValues.value = { ...(s.tasks || {}) }
  selectedChoices.value = { ...(s.selectedChoices || {}) }
  markers.value = s.markers || []
  portraitAssess.value = s.portraitAssess || null
  judgementRound.value = s.judgementRound || 0
  judgementResults.value = s.judgementResults || null
  const pm = s.preMeeting || {}
  preMeetingApplied.value = !!pm.applied
  preMeetingApproved.value = !!pm.approved
  preMeetingFeedback.value = pm.feedback || ''
  preMeetingForm.value = {
    questions: pm.applicationText?.questions || '',
    summary: pm.applicationText?.summary || '',
    depts: pm.invitedDepts || [],
  }
  return s.flowVersion !== MDT_FLOW_VERSION && (phase.value === 'discussion' || phase.value === 'premeeting')
}

// 旧流程会话升级：清空对话按新流程重播（保留会诊前申请已通过状态）
async function restartFlowForNewVersion() {
  const hadApproved = preMeetingApproved.value
  chatItems.value = []
  agendaIndex.value = 0
  currentStage.value = 0
  pendingTask.value = null
  currentSpeakerKey.value = 'host'
  decisionRevealed.value = false
  submitted.value = {}
  skipped.value = {}
  taskValues.value = {}
  selectedChoices.value = {}
  markers.value = []
  portraitAssess.value = null
  judgementRound.value = 0
  judgementResults.value = null
  const enabled = getRoleConfig(studentRole.value).preMeeting === true
    && caseData.value.preMeeting !== false
    && (caseData.value.inviteCandidates?.length || caseData.value.disciplines?.length || 0) >= 2
  if (enabled && !hadApproved) {
    phase.value = 'premeeting'
    saveState()
    router.push({ name: 'mdtPreMeeting', params: { caseId: mdtId.value } })
  } else {
    phase.value = 'discussion'
    saveState()
    await playOpenings()
  }
}

async function load() {
  loading.value = true
  mdtId.value = route.query.mdtId || route.params.caseId || ''
  caseData.value = await loadMDTCase(mdtId.value)
  loading.value = false
  if (!caseData.value) {
    toast.show('未找到该 MDT 病例', 'warning')
    router.push({ name: 'mdtCaseList' })
    return
  }
  const saved = store.trainingSession?.mdt
  if (saved && saved.mdtId === mdtId.value) {
    const stale = restoreSession(saved)
    if (stale) {
      // 旧流程会话 → 按新流程重播（清空对话重来，保留会诊前申请已通过状态）
      restartFlowForNewVersion()
      return
    }
    // 会诊前发起在独立页面完成 → 跳转（暂不进入/中断后重新进入讨论页）
    if (phase.value === 'premeeting') {
      router.push({ name: 'mdtPreMeeting', params: { caseId: mdtId.value } })
      return
    }
    if (phase.value === 'ended') {
      // 评价未完成 → 补触发（完成后会自动归档）；评价已就绪 → 直接补归档（含改版前的旧会话回填）
      if (!portraitAssess.value) runPortraitAssessment()
      else archiveMdtSession({ done: true })
    } else if (!saved.done && !(saved.messages?.length) && !saved.agendaIndex) {
      // 新会话（会诊前确认进入后跳回 / 直接进入）→ 开场播放
      await playOpenings()
    }
  }
}

function scrollToBottom() {
  if (discussionRef.value) {
    discussionRef.value.scrollTop = discussionRef.value.scrollHeight
  }
}

// 中途离开讨论页 → 存档中断会话（供分析流程/专家异常；完成后同会话会升级为完整记录）
onBeforeUnmount(() => {
  if (phase.value === 'discussion' && chatItems.value.length > 0) {
    archiveMdtSession({ done: false })
  }
})

onMounted(load)
</script>

<style scoped>
.mdt-page {
  height: calc(100vh - 110px); display: flex; flex-direction: column;
  padding: 20px 24px; background: #f8f9fb;
}

/* ─── 加载态 ─── */
.loading-state { flex: 1; display: flex; align-items: center; justify-content: center; color: #9ca3af; font-size: 15px; gap: 10px; }

/* ─── 准备面板 ─── */
.mdt-prep { flex: 1; display: flex; align-items: center; justify-content: center; overflow-y: auto; padding: 24px 0; }
.prep-card {
  width: 620px; max-width: 92vw; background: #fff;
  border-radius: 16px; border: 1px solid #edf0f4;
  box-shadow: 0 8px 30px rgba(0,0,0,0.06); padding: 28px 32px;
}
.prep-header { margin-bottom: 18px; }
.prep-title { margin: 0; font-size: 17px; font-weight: 700; display: flex; align-items: center; gap: 10px; color: #1f2937; }
.prep-case-summary {
  background: linear-gradient(135deg, #eff6ff, #f0f5ff);
  border: 1px solid #dbeafe; border-radius: 12px; padding: 16px 18px; margin-bottom: 22px;
}
.prep-case-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 10px; }
.prep-case-name { font-size: 16px; font-weight: 700; color: #1f2937; }
.prep-case-meta { font-size: 12px; color: #4b5563; }
.prep-discipline-chip {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 11px; padding: 2px 10px; border-radius: 12px;
  background: #fff; color: #1e40af; border: 1px solid #b3d8ff;
}
.prep-objective { font-size: 13px; font-weight: 600; color: #1e40af; margin-bottom: 10px; line-height: 1.6; }
.prep-key-questions { display: flex; flex-direction: column; gap: 6px; }
.prep-q { font-size: 12px; color: #4b5563; line-height: 1.6; display: flex; gap: 8px; }
.prep-q-num {
  font-size: 10px; font-weight: 700; color: #fff; background: #409EFF;
  width: 20px; height: 20px; border-radius: 10px; display: flex;
  align-items: center; justify-content: center; flex-shrink: 0;
}
.prep-role-title { font-size: 14px; font-weight: 700; color: #374151; margin-bottom: 12px; }
.prep-role-fixed {
  display: flex; align-items: center; gap: 14px;
  border: 2px solid #409EFF; background: #ecf5ff; border-radius: 12px;
  padding: 14px 16px; margin-bottom: 18px;
}
.prep-role-fixed-icon {
  width: 46px; height: 46px; border-radius: 23px; flex-shrink: 0;
  background: #409EFF; color: #fff; font-size: 20px;
  display: flex; align-items: center; justify-content: center;
}
.prep-role-fixed-name { font-size: 15px; font-weight: 700; color: #1f2937; margin-bottom: 3px; }
.prep-role-fixed-duty { font-size: 12px; font-weight: 600; color: #409EFF; margin-bottom: 4px; }
.prep-role-fixed-desc { font-size: 12px; color: #6b7280; line-height: 1.55; }
.prep-start { width: 100%; padding: 12px 20px; font-size: 15px; }

/* ─── 阶段指示器 ─── */
.steps-bar {
  display: flex; align-items: center; gap: 6px;
  background: #fff; border-radius: 12px; padding: 12px 24px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.04); border: 1px solid #edf0f4; margin-bottom: 10px;
}
.step-item { display: flex; flex-direction: column; align-items: center; gap: 5px; position: relative; }
.step-item + .step-item::before {
  content: ''; position: absolute; left: -8px; top: 14px;
  width: 16px; height: 1px; background: #e5e7eb;
}
.step-dot {
  width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 600; background: #f3f4f6; color: #9ca3af;
  transition: all .3s;
}
.step-dot.done { background: #10b981; color: #fff; }
.step-dot.current { background: #409EFF; color: #fff; box-shadow: 0 0 0 4px rgba(64,158,255,0.15); }
.step-label { font-size: 10px; color: #6b7280; white-space: nowrap; font-weight: 500; }
.btn-end-training {
  margin-left: auto; padding: 8px 18px;
  background: #fee2e2; color: #dc2626; border: 1px solid #fecaca;
  border-radius: 10px; font-size: 13px; font-weight: 600;
  cursor: pointer; font-family: inherit; transition: all .2s;
  display: flex; align-items: center; gap: 6px; white-space: nowrap;
}
.btn-end-training:hover { background: #fecaca; }

.mdt-layout { display: flex; gap: 0; flex: 1; overflow: hidden; min-height: 0; }

/* ─── 左栏 ─── */
.mdt-sidebar-left {
  flex: 1.5; min-width: 240px; overflow-y: auto;
  background: #fff; border: 1px solid #edf0f4; border-right: none;
  border-radius: 12px 0 0 12px; padding: 0;
  display: flex; flex-direction: column;
}
.case-info-title {
  font-size: 13px; font-weight: 600; color: #374151;
  display: flex; align-items: center; gap: 6px;
  padding: 18px 16px 12px; border-bottom: 1px solid #f3f4f6;
  flex-shrink: 0;
}

/* ─── 信息分页标签 ─── */
.info-tabs {
  display: flex; gap: 0; padding: 6px 10px; flex-shrink: 0;
  border-bottom: 1px solid #edf0f4; background: #fafbfc;
}
.info-tab {
  flex: 1; padding: 7px 4px; border: none; background: transparent;
  font-size: 10px; font-family: inherit; color: #9ca3af;
  cursor: pointer; border-radius: 6px; transition: all .2s;
  display: flex; flex-direction: column; align-items: center; gap: 3px;
  font-weight: 500; white-space: nowrap;
}
.info-tab i { font-size: 12px; }
.info-tab:hover { color: #6b7280; background: #f3f4f6; }
.info-tab.active { color: #409EFF; background: #eff6ff; font-weight: 600; }

.info-tab-content {
  flex: 1; overflow-y: auto; padding: 16px;
}
.tab-panel { animation: tabFadeIn .2s ease; }
@keyframes tabFadeIn { from { opacity: 0; transform: translateX(-4px); } to { opacity: 1; transform: translateX(0); } }
.case-section { margin-bottom: 18px; }
.case-section:last-child { margin-bottom: 0; }
.case-section-label {
  font-size: 10px; font-weight: 700; color: #b0b7c3; text-transform: uppercase;
  letter-spacing: .8px; margin-bottom: 6px; display: flex; align-items: center; gap: 5px;
}
.case-section-text { font-size: 12px; color: #4b5563; line-height: 1.65; }
.case-section-sub { font-size: 10px; font-weight: 600; color: #b0b7c3; margin: 8px 0 4px; }

.case-info-photo {
  width: 72px; height: 72px; border-radius: 50%; overflow: hidden;
  background: linear-gradient(135deg, #ecf5ff, #d9ecff);
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 8px;
}
.case-patient-img { width: 100%; height: 100%; object-fit: cover; border: none; background: transparent; }
.case-info-avatar { font-size: 28px; color: #79bbff; }
.case-info-name { font-size: 15px; font-weight: 700; text-align: center; margin-bottom: 4px; color: #1f2937; }
.case-info-row { font-size: 11px; color: #6b7280; margin-bottom: 2px; display: flex; align-items: center; gap: 6px; justify-content: center; }
.case-info-id { font-size: 10px; color: #9ca3af; font-family: 'SF Mono', 'Fira Code', monospace; background: #f9fafb; padding: 1px 6px; border-radius: 4px; }
.case-info-diff { font-size: 10px; padding: 2px 8px; border-radius: 10px; font-weight: 600; }
.diff-U { background: #d9ecff; color: #1d4ed8; }
.diff-R { background: #fef3c7; color: #d97706; }
.diff-F { background: #fee2e2; color: #dc2626; }

.case-info-meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 10px; }
.meta-item { display: flex; flex-direction: column; gap: 2px; padding: 6px 10px; background: #f9fafb; border-radius: 8px; }
.meta-label { font-size: 10px; color: #9ca3af; text-transform: uppercase; letter-spacing: .5px; }
.meta-value { font-size: 13px; color: #1f2937; font-weight: 600; }

.case-lab-table { border: 1px solid #edf0f4; border-radius: 8px; overflow: hidden; }
.case-vital-row { display: flex; justify-content: space-between; align-items: center; font-size: 12px; padding: 6px 12px; border-bottom: 1px solid #f9fafb; }
.case-vital-row:last-child { border-bottom: none; }
.case-vital-row:nth-child(even) { background: #fafbfc; }
.case-vital-label { color: #6b7280; font-weight: 500; }
.case-vital-value { color: #374151; font-weight: 500; }
.case-vital-value.abnormal { color: #dc2626; font-weight: 700; }

.case-two-col { display: flex; gap: 16px; }
.case-col { flex: 1; min-width: 0; }
.case-col .case-section-text { font-size: 11px; }

.mdt-question-box {
  background: linear-gradient(135deg, #eff6ff, #f0f5ff);
  border: 1px solid #dbeafe; border-radius: 10px; padding: 12px 14px; margin-top: 4px;
}

/* ─── 影像缩略图卡片 ─── */
.imaging-cards { display: flex; flex-direction: column; gap: 8px; }
.imaging-card {
  display: flex; gap: 10px; padding: 10px 12px;
  background: #f9fafb; border: 1px solid #edf0f4; border-radius: 10px;
  cursor: pointer; transition: all .15s; align-items: center;
}
.imaging-card:hover { border-color: #93c5fd; background: #f8faff; }
.imaging-thumb {
  width: 56px; height: 56px; border-radius: 8px; flex-shrink: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 3px; color: #94a3b8; position: relative; overflow: hidden;
}
.imaging-thumb::before {
  content: ''; position: absolute; inset: 0;
  background: radial-gradient(circle at 60% 30%, rgba(255,255,255,0.05), transparent 70%);
}
.imaging-thumb i { font-size: 18px; position: relative; z-index: 1; }
.imaging-modality { font-size: 9px; font-weight: 700; color: #64748b; position: relative; z-index: 1; letter-spacing: .5px; }
.imaging-info { flex: 1; min-width: 0; }
.imaging-label { font-size: 12px; font-weight: 600; color: #1f2937; margin-bottom: 3px; }
.imaging-summary { font-size: 10px; color: #6b7280; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

/* ─── MDT问题列表 ─── */
.mdt-question-list { display: flex; flex-direction: column; gap: 8px; }
.mdt-question-item {
  display: flex; align-items: flex-start; gap: 8px;
  padding: 10px 12px; background: #f9fafb; border: 1px solid #edf0f4;
  border-radius: 8px; font-size: 11px; line-height: 1.6;
}
.mdt-q-num {
  font-size: 10px; font-weight: 700; color: #fff; background: #409EFF;
  width: 20px; height: 20px; border-radius: 10px; display: flex;
  align-items: center; justify-content: center; flex-shrink: 0;
}
.mdt-q-text { color: #4b5563; padding-top: 1px; }

/* ─── 中栏 ─── */
.mdt-center {
  flex: 7; display: flex; flex-direction: column; min-width: 360px;
  background: #fff; border-top: 1px solid #edf0f4; border-bottom: 1px solid #edf0f4;
}
.mdt-main { flex: 1; overflow-y: auto; padding: 20px 24px 8px; background: #fafbfc; }

/* ─── 消息 ─── */
.mdt-msg { display: flex; gap: 10px; align-items: flex-start; margin-bottom: 16px; }
.mdt-msg-avatar {
  width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700; color: #fff; flex-shrink: 0; overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}
.avatar-img { width: 100%; height: 100%; object-fit: cover; object-position: top center; }
.av-host { background: #409EFF; } .av-onco { background: #ef4444; } .av-radio { background: #f59e0b; }
.av-path { background: #8b5cf6; } .av-nurse { background: #10b981; } .av-anes { background: #06b6d4; }
.student-avatar-msg { background: #3b82f6; }
.mdt-msg-body { flex: 1; min-width: 0; }
.mdt-msg-sender { font-size: 11px; font-weight: 700; margin-bottom: 4px; color: #374151; letter-spacing: .2px; }
.mdt-msg-text {
  font-size: 13px; line-height: 1.75; padding: 12px 16px;
  background: #fff; border-radius: 12px; border: 1px solid #f1f5f9;
  box-shadow: 0 1px 2px rgba(0,0,0,0.03);
}
.mdt-msg-text.typing { background: #eff6ff; color: #409EFF; font-style: italic; border-color: #dbeafe; }
.student-msg { justify-content: flex-end; }
.student-msg .mdt-msg-body { display: flex; flex-direction: column; align-items: flex-end; }
.student-text { background: #eff6ff; border-color: #dbeafe; }

/* ─── 紧凑卡片（对话流中） ─── */
.chat-card {
  display: flex; align-items: center; gap: 14px;
  margin: 10px 4px 14px; padding: 16px 18px;
  background: #fff; border: 2px solid #edf0f4; border-radius: 14px;
  cursor: pointer; transition: all .2s;
}
.chat-card:hover {
  border-color: #93c5fd;
  box-shadow: 0 4px 12px rgba(64,158,255,0.08);
  transform: translateY(-1px);
}
.chat-card-icon {
  width: 42px; height: 42px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  font-size: 17px; flex-shrink: 0;
}
.chat-card-body { flex: 1; min-width: 0; }
.chat-card-title { font-size: 14px; font-weight: 600; color: #1f2937; margin-bottom: 3px; }
.chat-card-meta { font-size: 12px; color: #9ca3af; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.chat-card-status { font-size: 18px; flex-shrink: 0; }

/* ─── 继续讨论栏 ─── */
.mdt-continue-bar {
  display: flex; align-items: center; gap: 12px;
  padding: 8px 20px; background: #fff; border-top: 1px solid #edf0f4;
}
.btn-continue {
  padding: 7px 18px; border-radius: 20px; border: 1px solid #b3d8ff;
  background: #eff6ff; color: #1e40af; font-size: 12px; font-weight: 600;
  cursor: pointer; font-family: inherit; display: flex; align-items: center; gap: 6px;
  transition: all .2s; white-space: nowrap;
}
.btn-continue:hover:not(:disabled) { background: #dbeafe; border-color: #93c5fd; }
.btn-continue:disabled { opacity: .5; cursor: not-allowed; }
.continue-hint { font-size: 11px; color: #9ca3af; }

/* ─── 弹窗卡片 ─── */
.card-modal {
  background: #fff; border-radius: 16px; width: 640px; max-height: 82vh;
  overflow-y: auto; display: flex; flex-direction: column;
  box-shadow: 0 20px 60px rgba(0,0,0,0.15);
}
.card-modal-lg { width: 740px; }
.card-modal-header {
  padding: 20px 28px; border-bottom: 1px solid #f3f4f6;
  display: flex; align-items: center; justify-content: space-between;
}
.card-modal-title { font-size: 17px; font-weight: 700; display: flex; align-items: center; gap: 10px; color: #1f2937; }
.card-modal-body { padding: 28px; flex: 1; overflow-y: auto; }
.card-modal-footer { padding: 18px 28px; border-top: 1px solid #f3f4f6; display: flex; justify-content: flex-end; gap: 10px; }
.card-modal-desc { font-size: 13px; color: #6b7280; margin-bottom: 18px; line-height: 1.7; }

.flow-textarea {
  width: 100%; min-height: 110px; padding: 14px 16px;
  border: 2px solid #edf0f4; border-radius: 10px; font-size: 13px;
  font-family: inherit; outline: none; resize: vertical;
  line-height: 1.7; box-sizing: border-box; transition: all .2s;
}
.flow-textarea:focus { border-color: #409EFF; box-shadow: 0 0 0 4px rgba(64,158,255,0.06); }
.flow-textarea:disabled { background: #f9fafb; color: #6b7280; border-color: #f3f4f6; }

.ct-placeholder {
  width: 100%; height: 260px;
  background: linear-gradient(145deg, #0f172a, #1e293b);
  border-radius: 10px; display: flex; align-items: center; justify-content: center;
  position: relative; cursor: crosshair; margin-bottom: 14px;
  overflow: hidden;
}
.ct-placeholder::before {
  content: ''; position: absolute; inset: 0;
  background: radial-gradient(circle at 65% 35%, rgba(255,255,255,0.03) 0%, transparent 70%);
}
.ct-inner { text-align: center; color: #94a3b8; position: relative; z-index: 1; }
.ct-label { font-size: 15px; color: #94a3b8; margin-top: 10px; font-weight: 500; }
.ct-marker {
  position: absolute; width: 26px; height: 26px; border-radius: 50%;
  background: rgba(239,68,68,0.9); border: 2px solid #fff; color: #fff;
  font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center;
  transform: translate(-50%, -50%); pointer-events: none; z-index: 2;
  box-shadow: 0 2px 8px rgba(239,68,68,0.4);
}
.ct-result { padding: 16px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; font-size: 13px; line-height: 1.8; }
.result-hit { color: #059669; font-weight: 500; }
.result-miss { color: #dc2626; font-weight: 500; }

.vote-options { display: flex; flex-direction: column; gap: 10px; }
.vote-option {
  display: flex; align-items: center; gap: 10px; padding: 14px 18px;
  border: 2px solid #edf0f4; border-radius: 10px; font-size: 14px;
  cursor: pointer; transition: all .2s;
}
.vote-option:hover { border-color: #93c5fd; background: #f8faff; }
.vote-option.selected { border-color: #409EFF; background: #ecf5ff; }
.vote-option input[type="radio"] { accent-color: #409EFF; width: 16px; height: 16px; }
.vote-option input[type="radio"]:disabled { accent-color: #a0cfff; }

.expert-question-card {
  background: #fffbeb !important; border: 1px solid #fde68a !important;
  color: #92400e; font-size: 14px; line-height: 1.7;
  margin: 8px 4px 14px; padding: 14px 18px; border-radius: 12px;
}
.expert-question-card i { color: #f59e0b; }

.expert-feedback { padding: 16px; background: #f9fafb; border: 1px solid #edf0f4; border-radius: 10px; }
.feedback-title { font-weight: 700; font-size: 14px; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; color: #1f2937; }
.feedback-item { font-size: 13px; line-height: 1.8; padding: 4px 0; color: #4b5563; }

.mdt-decision-card {
  margin: 14px 4px; border: 2px solid #10b981; border-radius: 12px; overflow: hidden;
  box-shadow: 0 2px 8px rgba(16,185,129,0.08);
}
.decision-header {
  background: #d1fae5; padding: 12px 18px; font-weight: 700; font-size: 14px;
  color: #065f46; display: flex; align-items: center; gap: 8px;
}
.decision-body { padding: 16px 18px; font-size: 13px; line-height: 1.85; color: #374151; background: #f0fdf4; }

/* ─── 输入栏 ─── */
.mdt-input-bar {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 20px; background: #fff;
  border-top: 1px solid #edf0f4;
  box-shadow: 0 -1px 4px rgba(0,0,0,0.03);
}
.input-voice-btn {
  width: 38px; height: 38px; border-radius: 50%; border: 1px solid #edf0f4;
  background: #f9fafb; cursor: pointer; display: flex; align-items: center; justify-content: center;
  font-size: 15px; color: #6b7280; flex-shrink: 0; transition: all .2s;
}
.input-voice-btn:hover { border-color: #79bbff; color: #409EFF; background: #ecf5ff; }
.input-voice-btn.recording { background: #fef0f0; border-color: #F56C6C; color: #F56C6C; }
.chat-input {
  flex: 1; height: 40px; padding: 0 18px;
  border: 2px solid #edf0f4; border-radius: 24px;
  font-size: 13px; font-family: inherit; outline: none; background: #f9fafb;
  transition: all .2s;
}
.chat-input:focus { border-color: #409EFF; background: #fff; box-shadow: 0 0 0 4px rgba(64,158,255,0.06); }
.chat-input::placeholder { color: #c0c4cc; }
.chat-input:disabled { background: #f3f4f6; cursor: not-allowed; }
.input-send-btn {
  width: 40px; height: 40px; border-radius: 50%; border: none;
  background: #409EFF; color: #fff; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; flex-shrink: 0; transition: all .2s;
  box-shadow: 0 2px 4px rgba(64,158,255,0.3);
}
.input-send-btn:hover { background: #337ECC; transform: scale(1.05); }
.input-send-btn:disabled { background: #d1d5db; cursor: not-allowed; box-shadow: none; }

/* ─── 右栏 ─── */
.mdt-roster {
  flex: 1.5; min-width: 180px; background: #fff;
  border: 1px solid #edf0f4; border-radius: 0 12px 12px 0;
  border-left: none; padding: 18px 14px; overflow-y: auto;
}
.roster-title { font-weight: 600; font-size: 13px; margin-bottom: 16px; color: #374151; padding-bottom: 10px; border-bottom: 2px solid #f3f4f6; }
.roster-member {
  display: flex; align-items: center; gap: 8px; padding: 9px 10px;
  border-radius: 10px; margin-bottom: 3px; transition: background .2s;
}
.roster-member.speaking { background: #eff6ff; box-shadow: inset 3px 0 0 #409EFF; }
.roster-avatar {
  width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 700; color: #fff; flex-shrink: 0; overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}
.roster-avatar-img { width: 100%; height: 100%; object-fit: cover; object-position: top center; }
.student-avatar { background: #3b82f6; }
.roster-name { font-size: 12px; font-weight: 600; color: #1f2937; }
.roster-role { font-size: 10px; color: #9ca3af; }
.speaking-indicator {
  width: 8px; height: 8px; border-radius: 50%; background: #10b981;
  margin-left: auto; display: none; box-shadow: 0 0 4px rgba(16,185,129,0.5);
}
.speaking-indicator.active { display: block; animation: pulse 1.2s infinite; }
@keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.7)} }
.roster-student { border-top: 1px solid #edf0f4; margin-top: 12px; padding-top: 12px; }
.student-row { background: #ecf5ff; border-radius: 10px; }

/* ─── 弹窗通用 ─── */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 2000; }
.modal-container { background: #fff; border-radius: 12px; width: 560px; max-height: 80vh; overflow-y: auto; }
.modal-header { padding: 16px 24px; border-bottom: 1px solid #e5e7eb; display: flex; align-items: center; justify-content: space-between; }
.modal-header h3 { font-size: 16px; font-weight: 600; }
.modal-close { background: none; border: none; font-size: 18px; cursor: pointer; color: #6b7280; padding: 4px; }
.modal-body { padding: 24px; }
.modal-footer { padding: 16px 24px; border-top: 1px solid #e5e7eb; display: flex; justify-content: flex-end; }
.result-table { width: 100%; border-collapse: collapse; }
.result-table th, .result-table td { padding: 10px 14px; text-align: left; font-size: 13px; border-bottom: 1px solid #e5e7eb; }
.result-table th { font-size: 12px; color: #6b7280; font-weight: 600; }
.confirm-plan-label { font-size: 13px; color: #6b7280; margin-bottom: 12px; }
.confirm-plan-text {
  background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px 16px;
  font-size: 13px; line-height: 1.7; color: #1f2937; white-space: pre-wrap; max-height: 320px; overflow-y: auto;
}
.confirm-plan-footer { justify-content: space-between; }

/* ─── 通用 ─── */
.badge-error { background: #fee2e2; color: #991b1b; padding: 3px 12px; border-radius: 14px; font-size: 12px; font-weight: 600; }
.badge-purple { background: #f0f0ff; color: #409EFF; padding: 3px 12px; border-radius: 14px; font-size: 12px; font-weight: 600; }
.badge-success { background: #d1fae5; color: #065f46; padding: 3px 12px; border-radius: 14px; font-size: 12px; font-weight: 600; }
.badge-warning { background: #fef3c7; color: #92400e; padding: 3px 12px; border-radius: 14px; font-size: 12px; font-weight: 600; }
.badge-info { background: #dbeafe; color: #1e40af; padding: 3px 12px; border-radius: 14px; font-size: 12px; font-weight: 600; }
.badge { display: inline-block; }

.btn { cursor: pointer; border-radius: 10px; font-family: inherit; font-size: 14px; padding: 9px 20px; transition: all .2s; background: #fff; border: 2px solid #edf0f4; font-weight: 500; }
.btn:hover { border-color: #d1d5db; }
.btn-primary { background: #409EFF; color: #fff; border-color: #409EFF; }
.btn-primary:hover { background: #337ECC; border-color: #337ECC; }
.btn-primary:disabled { background: #a0cfff; border-color: #a0cfff; cursor: not-allowed; }
.btn-sm { font-size: 12px; padding: 7px 16px; }
.btn-skip { margin-right: auto; background: #f9fafb; color: #9ca3af; border-color: #e5e7eb; }
.btn-skip:hover { color: #6b7280; border-color: #d1d5db; background: #f3f4f6; }

.mt-3 { margin-top: 16px; }

/* ─── 病例特点 ─── */
.case-features-box { background: #fefce8; border: 1px solid #fef08a; border-radius: 10px; padding: 12px 14px; }
.case-features-box .case-section-label { color: #a16207; }
.features-list { margin: 0; padding-left: 18px; }
.features-list li { font-size: 11px; color: #713f12; line-height: 1.7; margin-bottom: 5px; }

/* ─── MDT讨论问题卡片 ─── */
.mdt-questions-card {
  margin: 14px 4px; padding: 20px 22px;
  background: linear-gradient(135deg, #f0f7ff, #e0efff);
  border: 2px solid #b3d8ff; border-radius: 14px;
}
.questions-header {
  font-size: 15px; font-weight: 700; color: #1d4ed8;
  display: flex; align-items: center; gap: 8px; margin-bottom: 14px;
}
.questions-list { display: flex; flex-direction: column; gap: 10px; }
.question-item {
  display: flex; align-items: flex-start; gap: 10px;
  font-size: 13px; color: #374151; line-height: 1.65;
  padding: 10px 14px; background: #fff; border-radius: 10px;
  border: 1px solid #d9ecff;
}
.question-num {
  font-size: 11px; font-weight: 700; color: #fff; background: #409EFF;
  padding: 2px 8px; border-radius: 12px; flex-shrink: 0; margin-top: 1px;
}

/* ─── 通用flow卡片 ─── */
.flow-card {
  margin: 10px 4px 14px; border-radius: 12px; overflow: hidden;
  border: 1px solid #edf0f4;
}
.flow-card-header {
  padding: 12px 18px; font-weight: 700; font-size: 14px;
  display: flex; align-items: center; gap: 8px;
}
.flow-card-body { padding: 16px 18px; font-size: 13px; line-height: 1.85; color: #374151; }

.discharge-card-flow { border-color: #10b981; }
.discharge-card-flow .flow-card-header { background: #d1fae5; color: #065f46; }
.discharge-card-flow .flow-card-body { background: #f0fdf4; }

.followup-card-flow { border-color: #409EFF; }
.followup-card-flow .flow-card-header { background: #d9ecff; color: #1e40af; }
.followup-card-flow .flow-card-body { background: #ecf5ff; }

.references-card-flow { border-color: #d1d5db; }
.references-card-flow .flow-card-header { background: #f3f4f6; color: #374151; }
.references-card-flow .flow-card-body { background: #fafafa; }
.ref-item { font-size: 12px; line-height: 1.75; padding: 4px 0; color: #4b5563; }

/* ─── 原始病历入口卡 ─── */
.case-raw-card {
  display: flex; gap: 12px; align-items: flex-start;
  background: linear-gradient(135deg, #f5f3ff, #eef2ff);
  border: 1px solid #ddd6fe; border-radius: 12px; padding: 14px 16px;
}
.case-raw-icon {
  width: 38px; height: 38px; border-radius: 10px; flex-shrink: 0;
  background: #7c3aed; color: #fff; font-size: 16px;
  display: flex; align-items: center; justify-content: center;
}
.case-raw-body { flex: 1; }
.case-raw-title { font-size: 14px; font-weight: 700; color: #1f2937; margin-bottom: 4px; }
.case-raw-text { font-size: 12px; color: #4b5563; line-height: 1.6; margin-bottom: 10px; }

/* ─── 原始病历按钮（左栏）─── */
.case-info-title { display: flex; align-items: center; justify-content: space-between; }
.case-raw-btn {
  border: 1px solid #c4b5fd; color: #6d28d9; background: #f5f3ff;
  font-size: 12px; padding: 3px 10px; border-radius: 8px; cursor: pointer;
}
.case-raw-btn:hover { background: #ede9fe; }
</style>
