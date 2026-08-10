<template>
  <div class="pm-page">
    <div v-if="loading" class="loading-state">
      <i class="fa-solid fa-spinner fa-spin"></i> 加载中...
    </div>
    <div v-else-if="caseData" class="pm-card">
      <!-- 头部 -->
      <div class="pm-header">
        <div class="pm-header-left">
          <h3 class="pm-title"><i class="fa-solid fa-file-signature"></i> 会诊前发起 · 多学科协作诊疗</h3>
          <div class="pm-subtitle">住院患者跨学科会诊申请 · 医务科审批通过后进入讨论</div>
        </div>
        <button class="btn btn-sm btn-skip pm-exit" @click="exitFlow">
          <i class="fa-solid fa-xmark"></i> 退出
        </button>
      </div>

      <!-- 病例概要 -->
      <div class="pm-case-summary">
        <div class="pm-case-row">
          <span class="pm-case-name">{{ caseInfo.patientName }}</span>
          <span class="pm-case-meta">{{ caseInfo.gender }} {{ caseInfo.age }}岁 · {{ caseInfo.specialty }}</span>
          <span class="pm-discipline-chip" v-for="d in caseData.disciplines" :key="d">
            <i :class="disciplineIcon(d)"></i> {{ d }}
          </span>
        </div>
        <div class="pm-objective"><i class="fa-solid fa-bullseye"></i> 核心议题：{{ caseData.objective }}</div>
        <div class="pm-summary-footer">
          <span class="pm-invite-hint"><i class="fa-solid fa-users"></i> 可邀请 {{ candidates.length }} 个科室参与会诊</span>
          <span class="pm-flow-hint"><i class="fa-solid fa-route"></i> 会诊申请 → 医务科审批 → 预发资料 → 确认进入</span>
        </div>
      </div>

      <!-- 步骤条 -->
      <div class="pm-steps">
        <div :class="['pm-step', { active: step === 'form', done: step === 'material' }]">
          <span class="pm-step-dot"><i class="fa-solid fa-file-pen"></i></span>
          <div class="pm-step-text">
            <span class="pm-step-label">会诊申请</span>
            <span class="pm-step-desc">填写议题与拟邀科室</span>
          </div>
        </div>
        <div class="pm-step-line" :class="{ active: step === 'material' }"></div>
        <div :class="['pm-step', { active: step === 'material' }]">
          <span class="pm-step-dot"><i class="fa-solid fa-folder-open"></i></span>
          <div class="pm-step-text">
            <span class="pm-step-label">资料确认</span>
            <span class="pm-step-desc">核对预发资料包</span>
          </div>
        </div>
      </div>

      <div class="pm-body">
        <!-- 步骤1：会诊前情境 + 申请表 -->
        <template v-if="step === 'form'">
          <div class="pm-context-box">
            <div class="pm-context-title"><i class="fa-solid fa-circle-info"></i> 会诊前情境</div>
            <div class="pm-context-text" style="white-space:pre-wrap;">{{ contextText }}</div>
          </div>
          <div class="pm-form-item">
            <label class="pm-form-label">需讨论的问题</label>
            <textarea v-model="form.questions" class="flow-textarea" :rows="3"
              placeholder="请填写本次需要 MDT 讨论解决的核心问题"></textarea>
          </div>
          <div class="pm-form-item">
            <label class="pm-form-label">病情摘要</label>
            <textarea v-model="form.summary" class="flow-textarea" :rows="4"
              placeholder="请补充患者病情摘要（可编辑自动生成的内容）"></textarea>
          </div>
          <div class="pm-form-item">
            <label class="pm-form-label">拟邀请科室 <span class="pm-form-tip">（至少选择 2 个，可手动填写）</span></label>
            <div class="pm-dept-options">
              <label v-for="d in candidates" :key="d" class="pm-dept-option"
                :class="{ selected: form.depts.includes(d) }">
                <input type="checkbox" :value="d" v-model="form.depts" /> {{ d }}
              </label>
            </div>
            <div class="pm-dept-add-row">
              <input v-model="newDept" class="pm-dept-input" placeholder="手动填写其他科室，如：临床药学"
                @keyup.enter="addDept" />
              <button class="pm-dept-add-btn" @click="addDept"><i class="fa-solid fa-plus"></i> 添加</button>
            </div>
            <div v-if="form.depts.length" class="pm-dept-chips">
              <span v-for="d in form.depts" :key="d" class="pm-dept-chip">{{ d }}
                <button class="pm-dept-chip-close" @click="removeDept(d)">&times;</button>
              </span>
            </div>
            <div v-else class="pm-dept-empty">尚未选择科室</div>
          </div>
          <div v-if="feedback" class="pm-feedback"><i class="fa-solid fa-triangle-exclamation"></i> {{ feedback }}</div>
        </template>
        <!-- 步骤2：审批通过 + 预发资料包 -->
        <template v-else>
          <div class="pm-approved-msg"><i class="fa-solid fa-circle-check"></i> 医务科审核通过：会诊申请资料齐全，符合跨科会诊条件。请核对预发资料包。</div>
          <div class="pm-material-title"><i class="fa-solid fa-folder-open"></i> 预发资料包 · 模拟提前阅片</div>
          <div class="pm-material-item"><span class="pm-label">影像</span>{{ material?.imaging }}</div>
          <div class="pm-material-item"><span class="pm-label">病理</span>{{ material?.pathology }}</div>
          <div class="pm-material-item"><span class="pm-label">检验</span>{{ material?.lab }}</div>
        </template>
      </div>

      <!-- 底部操作 -->
      <div class="pm-footer">
        <template v-if="step === 'form'">
          <button class="btn btn-skip" @click="exitFlow">暂不进入</button>
          <button class="btn btn-primary" @click="submitApplication"><i class="fa-solid fa-paper-plane"></i> 提交申请</button>
        </template>
        <template v-else>
          <button class="btn btn-skip" @click="exitFlow">暂不进入</button>
          <button class="btn btn-primary" @click="confirmEnter"><i class="fa-solid fa-door-open"></i> 确认进入会诊</button>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from '@ai-sp/shared'
import { loadMDTCase, disciplineIcon } from '@/composables/useMDTData'
import { useMDTDirector } from '@/composables/useMDTDirector'
import { useTrainingStore } from '@/stores/training'

const MDT_FLOW_VERSION = 3   // 与 MDTDiscussion.vue 一致：v3 新流程会话

const route = useRoute()
const router = useRouter()
const store = useTrainingStore()
const director = useMDTDirector()

const loading = ref(true)
const mdtId = ref('')
const caseData = ref(null)
const step = ref('form')            // 'form'（会诊申请）| 'material'（资料确认）
const form = ref({ questions: '', summary: '', depts: [] })
const newDept = ref('')             // 手动填写科室输入（批注1：类似添加诊断的手动添加）
const feedback = ref('')
const applied = ref(false)
const approved = ref(false)
const material = ref(null)

const contextText = computed(() => caseData.value ? director.buildMdtContext(caseData.value) : '')
const candidates = computed(() => caseData.value ? (director.buildApplicationDraft(caseData.value)?.candidates || []) : [])

const caseInfo = computed(() => {
  const pi = caseData.value?.patientInfo || {}
  return {
    patientName: pi.name || '',
    gender: pi.gender || '',
    age: pi.age || '',
    specialty: caseData.value?.disciplines?.[0] || '',
  }
})

// 申请表预填：问题/摘要自动生成，科室预选前 2 个
function prefillDraft() {
  const draft = director.buildApplicationDraft(caseData.value)
  return {
    questions: draft.questions || '',
    summary: draft.summary || '',
    depts: draft.candidates?.length ? draft.candidates.slice(0, 2) : [],
  }
}

// 手动添加科室（批注1：类似添加诊断——输入回车/点击添加，chips 可删除）
function addDept() {
  const d = newDept.value.trim()
  if (!d) return
  if (form.value.depts.includes(d)) { toast.show('该科室已在列表中', 'warning'); return }
  form.value.depts.push(d)
  newDept.value = ''
}
function removeDept(d) {
  form.value.depts = form.value.depts.filter(x => x !== d)
}

// 持久化到 trainingSession.mdt（与 MDTDiscussion 共用同一会话对象）
function saveState(phase = 'premeeting') {
  const prev = store.trainingSession?.mdt || {}
  store.saveSessionStage('mdt', {
    ...prev,
    mdtId: mdtId.value,
    caseId: caseData.value?.caseId || '',
    studentRole: 'attending',
    flowVersion: MDT_FLOW_VERSION,
    startedAt: prev.startedAt || new Date().toISOString(),
    phase,
    preMeeting: {
      applied: applied.value,
      applicationText: { questions: form.value.questions, summary: form.value.summary },
      invitedDepts: form.value.depts,
      approved: approved.value,
      feedback: feedback.value,
    },
  })
}

function exitFlow() {
  router.push({ name: 'mdtCaseList' })
}

// 提交申请 → 纯规则审批（无 LLM）：通过切到资料确认步骤，未通过内联反馈可改重提
function submitApplication() {
  if (!form.value.questions?.trim()) { toast.show('请填写需讨论的问题', 'warning'); return }
  if (!form.value.summary?.trim()) { toast.show('请填写病情摘要', 'warning'); return }
  if ((form.value.depts || []).length < 2) { toast.show('拟邀请科室至少选择 2 个', 'warning'); return }
  applied.value = true
  feedback.value = ''
  const res = director.assessPreMeetingApproval(caseData.value, form.value)
  if (res.ok) {
    approved.value = true
    material.value = director.buildPreMeetingMaterial(caseData.value)
    step.value = 'material'
  } else {
    feedback.value = `审核未通过，请补充：${res.missing.join('、')}。`
  }
  saveState('premeeting')
}

// 确认进入会诊 → 会话转为 discussion → 跳转 MDT 讨论室（该页检测到新会话自动开场播放）
function confirmEnter() {
  approved.value = true
  saveState('discussion')
  router.push({ name: 'mdtDiscussion', params: { caseId: mdtId.value } })
}

async function load() {
  loading.value = true
  mdtId.value = route.params.caseId || route.query.mdtId || ''
  caseData.value = await loadMDTCase(mdtId.value)
  loading.value = false
  if (!caseData.value) {
    toast.show('未找到该 MDT 病例', 'warning')
    router.push({ name: 'mdtCaseList' })
    return
  }
  const saved = store.trainingSession?.mdt
  if (saved && saved.mdtId === mdtId.value && saved.phase === 'premeeting') {
    // 恢复会诊前会话（暂不进入/中断后重新进入 → 定位到已到达步骤）
    const pm = saved.preMeeting || {}
    applied.value = !!pm.applied
    approved.value = !!pm.approved
    feedback.value = pm.feedback || ''
    if (applied.value) {
      form.value = {
        questions: pm.applicationText?.questions || '',
        summary: pm.applicationText?.summary || '',
        depts: pm.invitedDepts || [],
      }
    } else {
      form.value = prefillDraft()   // 未提交过申请 → 预填
    }
    if (approved.value) {
      material.value = director.buildPreMeetingMaterial(caseData.value)
      step.value = 'material'
    }
  } else {
    // 无存档或已进入讨论 → 初始化申请
    form.value = prefillDraft()
    saveState('premeeting')
  }
}

onMounted(load)
</script>

<style scoped>
.pm-page {
  height: calc(100vh - 110px); display: flex; align-items: flex-start; justify-content: center;
  padding: 24px; background: #f8f9fb; overflow-y: auto;
}
.loading-state { flex: 1; display: flex; align-items: center; justify-content: center; color: #9ca3af; font-size: 15px; gap: 10px; }
.pm-card {
  width: 900px; max-width: 94vw; background: #fff;
  border-radius: 16px; border: 1px solid #edf0f4;
  box-shadow: 0 8px 30px rgba(0,0,0,0.06); display: flex; flex-direction: column;
}
.pm-header {
  display: flex; align-items: center; justify-content: space-between; gap: 16px;
  padding: 20px 28px; border-bottom: 1px solid #edf0f4;
}
.pm-header-left { display: flex; flex-direction: column; gap: 5px; }
.pm-title { margin: 0; font-size: 17px; font-weight: 700; display: flex; align-items: center; gap: 10px; color: #1f2937; }
.pm-subtitle { font-size: 12px; color: #9ca3af; }
.pm-exit { display: inline-flex; align-items: center; gap: 4px; }

.pm-case-summary {
  background: linear-gradient(135deg, #eff6ff, #f0f5ff);
  border-bottom: 1px solid #dbeafe; padding: 18px 28px;
}
.pm-case-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 10px; }
.pm-case-name { font-size: 17px; font-weight: 700; color: #1f2937; }
.pm-case-meta { font-size: 12px; color: #4b5563; }
.pm-discipline-chip {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 11px; padding: 2px 10px; border-radius: 12px;
  background: #fff; color: #1e40af; border: 1px solid #b3d8ff;
}
.pm-objective { font-size: 13px; font-weight: 600; color: #1e40af; line-height: 1.7; }
.pm-summary-footer {
  display: flex; align-items: center; gap: 18px; flex-wrap: wrap;
  margin-top: 12px; padding-top: 12px; border-top: 1px dashed #bfdbfe;
}
.pm-invite-hint, .pm-flow-hint { font-size: 11px; color: #4b5563; display: inline-flex; align-items: center; gap: 5px; }

.pm-steps {
  display: flex; align-items: center; padding: 20px 28px 6px;
}
.pm-step {
  display: flex; align-items: center; gap: 12px;
  padding: 8px 14px; border-radius: 12px;
  color: #9ca3af; transition: all .25s;
}
.pm-step.active { background: #eff6ff; }
.pm-step.done { background: #ecfdf5; }
.pm-step-dot {
  width: 34px; height: 34px; border-radius: 50%;
  background: #e5e7eb; color: #6b7280; font-size: 14px;
  display: inline-flex; align-items: center; justify-content: center;
  flex-shrink: 0; transition: all .25s;
}
.pm-step.active .pm-step-dot { background: #409EFF; color: #fff; }
.pm-step.done .pm-step-dot { background: #10b981; color: #fff; }
.pm-step-text { display: flex; flex-direction: column; gap: 2px; }
.pm-step-label { font-size: 13px; font-weight: 600; line-height: 1.3; }
.pm-step.active .pm-step-label { color: #1e40af; }
.pm-step.done .pm-step-label { color: #047857; }
.pm-step-desc { font-size: 11px; color: #9ca3af; line-height: 1.3; white-space: nowrap; }
.pm-step-line {
  flex: 1; height: 2px; min-width: 48px; margin: 0 8px;
  background: #e5e7eb; border-radius: 1px; transition: background .3s;
}
.pm-step-line.active { background: #409EFF; }

.pm-body { padding: 22px 28px 10px; }

.pm-context-box {
  padding: 14px 16px; border-radius: 12px; margin-bottom: 20px;
  background: #eff6ff; border: 1px solid #dbeafe;
}
.pm-context-title { font-size: 12px; font-weight: 700; color: #1e40af; margin-bottom: 8px; }
.pm-context-text { font-size: 13px; line-height: 1.8; color: #374151; }

.pm-approved-msg {
  padding: 12px 16px; border-radius: 10px; margin-bottom: 16px;
  background: #ecfdf5; border: 1px solid #a7f3d0; color: #047857; font-size: 13px;
  display: flex; align-items: center; gap: 8px; line-height: 1.6;
}
.pm-material-title {
  padding: 12px 16px; font-weight: 700; font-size: 14px;
  display: flex; align-items: center; gap: 8px;
  background: #d9ecff; color: #1e40af; border-radius: 10px 10px 0 0;
}
.pm-material-item {
  padding: 12px 16px; font-size: 13px; line-height: 1.7; color: #374151;
  background: #ecf5ff; border-top: 1px solid #dbeafe;
}
.pm-material-item:last-child { border-radius: 0 0 10px 10px; }
.pm-label {
  display: inline-block; min-width: 34px; margin-right: 10px;
  font-size: 11px; font-weight: 700; color: #fff; background: #409EFF;
  padding: 2px 8px; border-radius: 12px; text-align: center;
}

.pm-form-item { margin-bottom: 20px; }
.pm-form-label { display: block; font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 8px; }
.pm-form-tip { font-size: 11px; font-weight: 400; color: #9ca3af; }
.pm-dept-options { display: flex; flex-wrap: wrap; gap: 8px; }
.pm-dept-option {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 9px 16px; border: 1.5px solid #edf0f4; border-radius: 20px;
  font-size: 13px; color: #374151; cursor: pointer; transition: all .2s;
}
.pm-dept-option:hover { border-color: #b3d8ff; }
.pm-dept-option.selected { border-color: #409EFF; background: #eff6ff; color: #1e40af; font-weight: 600; }
.pm-dept-option input { accent-color: #409EFF; }
.pm-dept-add-row { display: flex; gap: 8px; margin-top: 12px; }
.pm-dept-input {
  flex: 1; height: 38px; padding: 0 14px; border: 2px solid #edf0f4;
  border-radius: 10px; font-size: 13px; font-family: inherit; outline: none;
  background: #f9fafb; transition: all .2s; box-sizing: border-box;
}
.pm-dept-input:focus { border-color: #409EFF; background: #fff; box-shadow: 0 0 0 4px rgba(64,158,255,0.06); }
.pm-dept-add-btn {
  padding: 0 18px; border: 2px solid #b3d8ff; border-radius: 10px;
  background: #eff6ff; color: #1e40af; font-size: 13px; font-weight: 600;
  cursor: pointer; font-family: inherit; transition: all .2s; white-space: nowrap;
  display: inline-flex; align-items: center; gap: 5px;
}
.pm-dept-add-btn:hover { background: #dbeafe; border-color: #93c5fd; }
.pm-dept-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
.pm-dept-chip {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 5px 10px 5px 14px; border-radius: 18px;
  background: #ecf5ff; border: 1px solid #b3d8ff; color: #1e40af;
  font-size: 12px; font-weight: 600;
}
.pm-dept-chip-close {
  border: none; background: transparent; color: #1e40af; cursor: pointer;
  font-size: 15px; line-height: 1; padding: 0; opacity: .6;
}
.pm-dept-chip-close:hover { opacity: 1; color: #dc2626; }
.pm-dept-empty { font-size: 12px; color: #9ca3af; margin-top: 10px; }
.pm-feedback {
  padding: 12px 16px; border-radius: 10px; background: #fef2f2;
  border: 1px solid #fecaca; color: #b91c1c; font-size: 13px; line-height: 1.6;
  display: flex; align-items: center; gap: 8px;
}

.pm-footer {
  display: flex; justify-content: flex-end; gap: 10px;
  padding: 18px 28px; border-top: 1px solid #edf0f4;
}

/* ── 通用 ── */
.flow-textarea {
  width: 100%; min-height: 110px; padding: 14px 16px;
  border: 2px solid #edf0f4; border-radius: 10px; font-size: 13px;
  font-family: inherit; outline: none; resize: vertical;
  line-height: 1.7; box-sizing: border-box; transition: all .2s;
}
.flow-textarea:focus { border-color: #409EFF; box-shadow: 0 0 0 4px rgba(64,158,255,0.06); }
.btn { cursor: pointer; border-radius: 10px; font-family: inherit; font-size: 14px; padding: 9px 20px; transition: all .2s; background: #fff; border: 2px solid #edf0f4; font-weight: 500; }
.btn:hover { border-color: #d1d5db; }
.btn-primary { background: #409EFF; color: #fff; border-color: #409EFF; }
.btn-primary:hover { background: #337ECC; border-color: #337ECC; }
.btn-sm { font-size: 12px; padding: 7px 16px; }
.btn-skip { margin-right: auto; background: #f9fafb; color: #9ca3af; border-color: #e5e7eb; }
.btn-skip:hover { color: #6b7280; border-color: #d1d5db; background: #f3f4f6; }
</style>
