<template>
  <div class="st-page">
    <!-- ══ ① 登录 / 校验（考站机）══ -->
    <div v-if="phase === 'login'" class="st-box">
      <div class="st-brand">
        <i class="fa-solid fa-clipboard-check"></i>
        <div>
          <h1>影像报告书写站</h1>
          <p>{{ stationName }}</p>
        </div>
      </div>

      <div class="card st-card">
        <div class="st-row">
          <label>学号 / 工号</label>
          <input v-model.trim="form.code" class="input" placeholder="请输入学号或工号" @keyup.enter="doLogin" />
        </div>
        <div class="st-row">
          <label>考试码</label>
          <input v-model.trim="form.pass" class="input" placeholder="请输入本场考试码" @keyup.enter="doLogin" />
        </div>
        <div v-if="loginError" class="st-error"><i class="fa-solid fa-circle-exclamation"></i> {{ loginError }}</div>
        <button class="btn btn-primary st-btn" @click="doLogin"><i class="fa-solid fa-right-to-bracket"></i> 验证并进入</button>
        <div class="st-meta">考站机：{{ deviceId }} · 考试方式：{{ modeLabel }}</div>
      </div>
    </div>

    <!-- ══ ② 考试须知 ══ -->
    <div v-else-if="phase === 'notice'" class="st-box">
      <div class="card st-card">
        <h2 class="st-title"><i class="fa-solid fa-file-pen"></i> {{ task.name }}</h2>
        <ul class="st-rules">
          <li><b>考生</b>：{{ candidate.name }}（{{ candidate.id }}）</li>
          <li><b>考核方案</b>：{{ task.scheme }}</li>
          <li><b>题量</b>：{{ task.caseIds.length }} 题 · 满分 100 分 · 达标线 {{ task.passLine }} 分</li>
          <li><b>时长</b>：{{ task.durationMin }} 分钟，到点自动交卷</li>
          <li><b>成绩可见</b>：{{ scoreOpen ? '交卷后即可查看' : scoreHiddenText }}</li>
          <li><b>不提供</b>：AI伴学、参考报告对照</li>
          <li><b>断线续答</b>：中途断网或刷新不会重置计时，回到本机可继续作答</li>
        </ul>
        <label class="st-check">
          <input type="checkbox" v-model="agreed" /> 我已阅读并同意上述考试要求
        </label>
        <button class="btn btn-primary st-btn" :disabled="!agreed" @click="startExam">
          <i class="fa-solid fa-play"></i> 开始考试
        </button>
      </div>
    </div>

    <!-- ══ ③ 作答 ══ -->
    <template v-else-if="phase === 'exam'">
      <div class="st-bar">
        <span class="st-timer" :class="{ 'is-urgent': remainSec <= 300 }">
          <i class="fa-regular fa-clock"></i> 剩余 {{ remainText }}
        </span>
        <span class="st-bar-meta">{{ candidate.name }} · {{ currentIndex + 1 }} / {{ paper.length }} · {{ currentSample.bodyPart }} · {{ currentSample.modality }}</span>
        <span class="st-mode"><i class="fa-solid fa-desktop"></i> {{ modeLabel }}</span>
        <span v-if="savedAt" class="st-saved"><i class="fa-solid fa-cloud-arrow-up"></i> 已自动保存</span>
        <span v-if="leaveCount" class="st-leave"><i class="fa-solid fa-eye-slash"></i> 离开记录 {{ leaveCount }} 次</span>
        <button class="btn btn-sm btn-primary" @click="askSubmit">交卷</button>
      </div>
      <div class="st-main">
        <ImagePanel :sample="currentSample" />
        <SegmentForm :segments="segments" :draft="draftOf(currentIndex)" :given="givenOf(currentSample)"
                     :total-chars="totalChars" :total-over="false" :total-limit="TOTAL_LIMIT"
                     @update:segment="setSegment" />
      </div>
    </template>

    <!-- ══ ④ 已交卷（**不给参考报告对照** = 红线 R1）══ -->
    <div v-else class="st-box">
      <div class="card st-card">
        <h2 class="st-title"><i class="fa-solid fa-flag-checkered"></i> 已交卷</h2>
        <div v-if="!scoreOpen" class="st-locked"><i class="fa-solid fa-lock"></i> {{ scoreHiddenText }}</div>
        <div class="st-scores">
          <div v-for="(q, i) in paper" :key="q.id" class="st-score-row">
            <span class="st-idx">{{ i + 1 }}</span>
            <span class="st-score-title">{{ studentTitleOf(q.sample) }}</span>
            <span class="st-score-val">
              <i v-if="submitting && !resultOf(i)" class="fa-solid fa-spinner fa-spin"></i>
              <template v-else-if="resultOf(i) && scoreOpen">{{ resultOf(i).rawTotal }} / {{ resultOf(i).scoreableMax }}</template>
              <template v-else>—</template>
            </span>
            <span v-if="resultOf(i) && scoreOpen" class="st-pass" :class="passed(i) ? 'is-ok' : 'is-no'">
              {{ passed(i) ? '达标' : '未达标' }}（{{ resultOf(i).level }} 线 {{ round1(resultOf(i).passLine) }} 分）
            </span>
            <button v-if="showDetail" class="btn btn-sm" :disabled="!resultOf(i)" @click="openReport(i)">成绩报告</button>
          </div>
        </div>
        <div class="st-hint">
          <i class="fa-solid fa-circle-info"></i> 交卷后不提供参考报告对照。请按考务指引离场。
        </div>
        <button class="btn st-btn" @click="resetStation"><i class="fa-solid fa-user-clock"></i> 下一位考生</button>
      </div>
    </div>

    <ScoreReportModal v-if="reportIndex !== null && resultOf(reportIndex)"
                      :scoring="{ status: 'done', result: resultOf(reportIndex), error: '', attempts: 1, appeal: null }"
                      :draft="draftOf(reportIndex)"
                      :sample="paper[reportIndex].sample"
                      :title="studentTitleOf(paper[reportIndex].sample)"
                      :submitted-at="submittedAt"
                      hide-compare
                      @close="reportIndex = null" @score="() => {}" />
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { confirm, toast } from '@ai-sp/shared'
import { TRAINING_CASES, WRITABLE_SEGMENTS, DEIDENTIFY_ROWS, studentTitleOf, COMMENT_SCOPE, onsiteTaskAt, EXAM_MODE_LABEL } from '@ai-sp/shared/imaging'
import { ImagePanel, SegmentForm, ScoreReportModal, useReportScoring } from '@ai-sp/shared/imaging-ui'
import { startOrResume, saveSession, submitSession, loadSession, clearSession, currentClientId } from '@ai-sp/shared/imaging-ui'

/**
 * 现场考站机 —— 影像报告书写站（`apps/exam`）
 *
 * 与学员端在线考试（`apps/training`）**共用同一套作答组件与会话逻辑**，
 * 差别只在入口与鉴权：这里是考站机 + 学号/工号 + 考试码，且由考务安排场次；
 * 时间是"服务端签发"的同一套契约（原型用 useExamSession 的本地实现顶替）。
 *
 * 红线：交卷后**不下发标准报告/评分要点以外的内容**，成绩报告**无「报告对照」**（R1）。
 */

/* ── 考站机本地事实（真实环境应由考务系统下发：考点、机器号、本场任务）── */
const ROSTER = [
  { id: '2026001', name: '张*', dept: '放射科' },
  { id: '2026002', name: '李*', dept: '放射科' },
  { id: '2026003', name: '王*', dept: '放射科' }
]
const EXAM_CODE = 'S03'
const DEVICE_ID = 'STATION-03-01'

const task = ref(onsiteTaskAt())
const candidate = ref(null)
const phase = ref('login')
const form = reactive({ code: '', pass: '' })
const loginError = ref('')
const agreed = ref(false)

const paper = ref([])
const answers = reactive({})
const results = reactive({})
const currentIndex = ref(0)
const reportIndex = ref(null)
const submitting = ref(false)
const submittedAt = ref('')
const deadline = ref(0)
const now = ref(Date.now())
const leaveCount = ref(0)
const savedAt = ref(0)
let timer = null

const stationName = computed(() => (task.value ? task.value.scheme : '本场无排期'))
const modeLabel = computed(() => (task.value ? (EXAM_MODE_LABEL[task.value.examMode] || task.value.examMode) : '现场考站机'))
const deviceId = computed(() => DEVICE_ID)
const TOTAL_LIMIT = 6500
const segments = computed(() => WRITABLE_SEGMENTS)
const currentSample = computed(() => paper.value[currentIndex.value]?.sample || {})
const remainSec = computed(() => Math.max(0, Math.round((deadline.value - now.value) / 1000)))
const remainText = computed(() => {
  const s = remainSec.value
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
})
const totalChars = computed(() => {
  const d = draftOf(currentIndex.value)
  return WRITABLE_SEGMENTS.reduce((a, seg) => a + String(d[seg.key] || '').length, 0)
})

const scoreCfg = computed(() => (task.value && task.value.scoreVisible) || { when: 'afterSubmit', content: 'total' })
const scoreOpen = computed(() => scoreCfg.value.when === 'afterSubmit')
const scoreHiddenText = computed(() => (scoreCfg.value.when === 'afterPublish' ? '成绩由教师发布后可见' : '成绩将于考试窗口结束后公布'))
const showDetail = computed(() => scoreCfg.value.content !== 'total')

const { score } = useReportScoring()

const round1 = n => Math.round(Number(n) * 10) / 10
const passed = i => {
  const r = resultOf(i)
  return !!(r && typeof r.passLine === 'number' && r.rawTotal >= r.passLine)
}
const sessionKey = computed(() => (task.value && candidate.value ? `${task.value.id}::${candidate.value.id}` : ''))

function draftOf(i) {
  const id = paper.value[i]?.id
  if (!id) return { purpose: '', findings: '', impression: '' }
  if (!answers[id]) answers[id] = { purpose: '', findings: '', impression: '' }
  return answers[id]
}
function setSegment(key, val) { draftOf(currentIndex.value)[key] = val; persist() }
function resultOf(i) { return results[paper.value[i]?.id] || null }
function openReport(i) { reportIndex.value = i }

/** 段一：患者临床信息由系统给出（只给病史，不给检查目的） */
function givenOf(sample) {
  const d = sample.deidentify || {}
  return {
    name: '患者临床信息',
    items: DEIDENTIFY_ROWS.map(r => ({ k: r.k, v: d[r.key] || '' })).filter(x => x.v),
    fields: [{ k: '患者病史', v: sample.history || '' }].filter(x => x.v),
    study: [
      { k: '检查部位', v: sample.bodyPart || '' },
      { k: '检查方法', v: sample.modality || '' }
    ].filter(x => x.v)
  }
}

function persist(patch = {}) {
  if (phase.value !== 'exam') return
  saveSession(sessionKey.value, { answers, deadline: deadline.value, leaveCount: leaveCount.value, ...patch })
  savedAt.value = Date.now()
}

/* ── ① 登录校验：在名单 / 考试码 / 是否已交卷 / 窗口 ── */
function doLogin() {
  loginError.value = ''
  if (!task.value) { loginError.value = '本机当前没有排期的考试任务'; return }
  if (!form.code) { loginError.value = '请输入学号或工号'; return }
  if (form.pass !== EXAM_CODE) { loginError.value = '考试码不正确'; return }
  const c = ROSTER.find(r => r.id === form.code)
  if (!c) { loginError.value = '该学号/工号不在本场名单内'; return }
  const prev = loadSession(`${task.value.id}::${c.id}`)
  if (prev && prev.submitted && task.value.retake === 'single') {
    loginError.value = '该考生本场已交卷，不允许重考'
    return
  }
  candidate.value = c
  buildPaper()
  // 断线续答：该考生已有未交卷且未到点的会话 → 登录后**直接续考，不重新计时**（O2）
  const live = loadSession(`${task.value.id}::${c.id}`)
  if (live && !live.submitted && live.deadline > Date.now()) {
    Object.assign(answers, live.answers || {})
    deadline.value = live.deadline
    leaveCount.value = live.leaveCount || 0
    phase.value = 'exam'
    now.value = Date.now()
    startTick()
    toast.show('已恢复上次作答，计时继续', 'warning', 2500)
    return
  }
  phase.value = 'notice'
}

function buildPaper() {
  const ids = task.value.caseIds.filter(id => TRAINING_CASES.some(c => c.id === id))
  paper.value = ids.map(id => {
    const sample = TRAINING_CASES.find(c => c.id === id)
    return { id, sample, title: studentTitleOf(sample) }
  })
}

async function startExam() {
  const { session, adopted } = await startOrResume(sessionKey.value, task.value.durationMin, answers)
  deadline.value = session.deadline
  leaveCount.value = session.leaveCount || 0
  if (adopted) Object.assign(answers, session.answers || {})
  phase.value = 'exam'
  now.value = Date.now()
  persist()
  startTick()
}

function startTick() {
  stopTick()
  timer = setInterval(() => {
    now.value = Date.now()
    if (remainSec.value <= 0) { stopTick(); autoSubmit() }
  }, 1000)
}
function stopTick() { if (timer) { clearInterval(timer); timer = null } }

function onVisible() { if (document.hidden && phase.value === 'exam') markLeave() }
function onBlur() { if (phase.value === 'exam') markLeave() }
function markLeave() {
  leaveCount.value += 1
  persist()
  toast.show(`已记录离开页面 ${leaveCount.value} 次`, 'warning', 2000)
}

function askSubmit() {
  const empty = WRITABLE_SEGMENTS.filter(seg => !String(draftOf(currentIndex.value)[seg.key] || '').trim())
  confirm(empty.length
    ? `还有「${empty.map(s => s.name).join('、')}」没写，确定交卷？`
    : '确定交卷？交卷后不可修改。')
    .then(ok => { if (ok) doSubmit() })
}
function autoSubmit() {
  toast.show('时间到，自动交卷', 'warning', 2500)
  doSubmit()
}

async function doSubmit() {
  phase.value = 'done'
  submitting.value = true
  submittedAt.value = new Date().toISOString().slice(0, 16).replace('T', ' ')
  // ① 先锁定答卷（交卷即刻入库），评阅失败不影响"已交卷"
  submitSession(sessionKey.value, { answers, leaveCount: leaveCount.value, deadline: deadline.value })
  // ② 再评分回填（考核口径取严，含红线校验）
  const collected = {}
  for (let i = 0; i < paper.value.length; i++) {
    const q = paper.value[i]
    const res = await score({ sample: q.sample, reportText: { ...draftOf(i) }, scope: COMMENT_SCOPE.EXAM })
    if (res.ok) { results[q.id] = res.result; collected[q.id] = res.result }
    else toast.show(`${studentTitleOf(q.sample)} 评分失败：${res.reason || ''}`, 'error', 3000)
  }
  submitting.value = false
  submitSession(sessionKey.value, { results: collected })
}

function resetStation() {
  stopTick()
  candidate.value = null
  form.code = ''; form.pass = ''; agreed.value = false
  paper.value = []
  Object.keys(answers).forEach(k => delete answers[k])
  Object.keys(results).forEach(k => delete results[k])
  currentIndex.value = 0; reportIndex.value = null
  submittedAt.value = ''; leaveCount.value = 0; savedAt.value = 0
  phase.value = 'login'
}

onMounted(() => {
  document.addEventListener('visibilitychange', onVisible)
  window.addEventListener('blur', onBlur)
})
onUnmounted(() => {
  stopTick()
  document.removeEventListener('visibilitychange', onVisible)
  window.removeEventListener('blur', onBlur)
})
</script>

<style scoped>
.st-page { min-height: 100vh; padding: 32px 24px; background: #f5f7fa; }
.st-box { max-width: 720px; margin: 40px auto; }
.st-main { display: flex; flex-direction: column; gap: 16px; max-width: 1400px; margin: 0 auto; }

.st-brand { display: flex; align-items: center; gap: 14px; margin-bottom: 18px; }
.st-brand i { font-size: 26px; color: var(--primary, #4f46e5); }
.st-brand h1 { margin: 0; font-size: 20px; }
.st-brand p { margin: 2px 0 0; font-size: 12.5px; color: #6b7280; }

.st-card { padding: 24px 28px; }
.st-title { margin: 0 0 16px; font-size: 18px; display: flex; align-items: center; gap: 10px; }
.st-title i { color: var(--primary, #4f46e5); }
.st-row { display: flex; align-items: center; gap: 14px; margin-bottom: 14px; }
.st-row label { width: 90px; font-size: 13px; color: #4b5563; }
.st-row .input { flex: 1; }
.st-error { display: flex; align-items: center; gap: 8px; font-size: 12.5px; color: #b91c1c; background: #fee2e2; border-radius: 8px; padding: 8px 12px; margin-bottom: 12px; }
.st-btn { width: 100%; justify-content: center; margin-top: 8px; }
.st-meta { margin-top: 12px; font-size: 11.5px; color: #9ca3af; text-align: center; }

.st-rules { margin: 0 0 18px; padding-left: 20px; font-size: 13px; line-height: 2.1; color: #4b5563; }
.st-check { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #374151; margin-bottom: 10px; }

.st-bar {
  display: flex; align-items: center; gap: 16px; flex-wrap: wrap;
  padding: 10px 18px; margin-bottom: 14px; border-radius: 10px;
  background: #fff; border: 1px solid #e5e7eb;
  position: sticky; top: 0; z-index: 30; max-width: 1400px; margin-left: auto; margin-right: auto;
}
.st-timer { font-size: 16px; font-weight: 700; color: #1f2937; font-variant-numeric: tabular-nums; display: inline-flex; align-items: center; gap: 6px; }
.st-timer.is-urgent { color: #dc2626; }
.st-bar-meta { font-size: 12.5px; color: #6b7280; }
.st-mode { font-size: 12px; color: #4b5563; display: inline-flex; align-items: center; gap: 5px; }
.st-saved { font-size: 11.5px; color: #15803d; display: inline-flex; align-items: center; gap: 5px; }
.st-leave { font-size: 11.5px; color: #b45309; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 3px 9px; }
.st-bar .btn { margin-left: auto; }

.st-locked { display: flex; align-items: center; gap: 8px; padding: 10px 14px; margin-bottom: 12px; border-radius: 8px; font-size: 12.5px; color: #92400e; background: #fffbeb; border: 1px solid #fde68a; }
.st-scores { display: flex; flex-direction: column; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
.st-score-row { display: flex; align-items: center; gap: 12px; padding: 10px 14px; border-bottom: 1px solid #f5f7fa; font-size: 13px; }
.st-score-row:last-child { border-bottom: none; }
.st-idx { width: 20px; color: #9ca3af; font-size: 12px; }
.st-score-title { flex: 1; min-width: 0; }
.st-score-val { font-weight: 700; color: var(--primary, #4f46e5); font-variant-numeric: tabular-nums; }
.st-pass { font-size: 11.5px; border-radius: 8px; padding: 2px 8px; }
.st-pass.is-ok { color: #15803d; background: #dcfce7; }
.st-pass.is-no { color: #b91c1c; background: #fee2e2; }
.st-hint { margin-top: 14px; font-size: 11.5px; color: #9ca3af; line-height: 1.8; }
</style>
