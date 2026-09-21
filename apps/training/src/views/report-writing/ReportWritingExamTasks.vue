<template>
  <div class="et-page">
    <TrainingTopBar station-name="我的考核任务" hide-timer hide-end formatted-time="" />

    <div class="et-head">
      <h2 class="et-title"><i class="fa-solid fa-clipboard-list"></i> 我的考核任务</h2>
      <p class="et-sub">老师派发的考核，学生不自选病例</p>
    </div>

    <div v-if="!rows.length" class="card et-empty">暂无考核任务</div>

    <div v-else class="et-list">
      <div v-for="r in rows" :key="r.task.id" class="card et-card">
        <div class="et-card-head">
          <div class="et-card-title">{{ r.task.name }}</div>
          <span class="et-state" :class="'is-' + r.state.key">{{ r.state.label }}</span>
        </div>
        <div class="et-scheme">{{ r.task.scheme }}</div>

        <div class="et-facts">
          <span class="et-fact"><i class="fa-solid fa-laptop-medical"></i> {{ modeLabel(r.task.examMode) }}</span>
          <span class="et-fact"><i class="fa-solid fa-list-ol"></i> {{ questionCountOf(r.task) }} 题 · {{ fullScoreLabel(r.task) }}</span>
          <span class="et-fact"><i class="fa-regular fa-clock"></i> {{ r.task.durationMin }} 分钟</span>
          <span class="et-fact"><i class="fa-solid fa-bullseye"></i> 达标线 {{ r.task.passLine }} 分</span>
        </div>

        <div class="et-window">
          考试窗口 {{ r.task.windowStart }} — {{ r.task.windowEnd }}
          <span class="et-by">· {{ r.task.dispatchedBy }} 派发于 {{ r.task.dispatchedAt }}</span>
        </div>

        <div class="et-score" v-if="r.session && r.session.submitted">
          <template v-if="r.scoreVisible">
            <span class="et-score-val">{{ r.scoreText }}</span>
            <span v-if="r.passText" class="et-pass" :class="r.passed ? 'is-ok' : 'is-no'">{{ r.passText }}</span>
          </template>
          <span v-else class="et-score-hidden">
            <i class="fa-solid fa-lock"></i> {{ r.hiddenReason }}
          </span>
        </div>

        <div class="et-actions">
          <button v-if="r.state.key === 'inProgress'" class="btn btn-primary btn-sm" @click="enter(r.task)">
            <i class="fa-solid fa-play"></i> 继续作答
          </button>
          <button v-else-if="r.state.key === 'pending'" class="btn btn-primary btn-sm" @click="enter(r.task)">
            <i class="fa-solid fa-file-pen"></i> 进入考试
          </button>
          <button v-else-if="r.state.key === 'submitted'" class="btn btn-sm" @click="enter(r.task)">
            <i class="fa-solid fa-flag-checkered"></i> 查看答卷
          </button>
          <button v-else class="btn btn-sm" disabled>
            {{ r.state.key === 'notStarted' ? '未开始' : '已结束' }}
          </button>
          <span v-if="r.session && r.session.superseded" class="et-warn">
            <i class="fa-solid fa-triangle-exclamation"></i> 该考次在别处继续过 {{ r.session.superseded }} 次
          </span>
        </div>
      </div>
    </div>

    <div class="et-foot">
      <span>没有派发的考核任务？</span>
      <button class="et-link" @click="goPractice">去做练习考（不计成绩）</button>
      <span class="et-source">{{ sourceLabel }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import TrainingTopBar from '@/components/TrainingTopBar.vue'
import { EXAM_TASKS, EXAM_MODE_LABEL, windowStateOf } from '@ai-sp/shared/imaging'
import { loadSession, sessionStateOf, saveSession, examApi } from '@ai-sp/shared/imaging-ui'
import { createdExamsStore } from '@ai-sp/shared/created-exams'

const router = useRouter()
const sessions = ref({})
/** 任务列表：管理端创建的考核优先，读不到才用演示数据兜底 */
const tasks = ref(EXAM_TASKS)
const dataSource = ref('demo')

function modeLabel(m) { return EXAM_MODE_LABEL[m] || m }
/** 实际题量：考务设定优先，缺省回落该场病例数 */
function questionCountOf(task) { return Number(task.questionCount) || (task.caseIds || []).length }
/** 满分口径：normalize 为百分制，raw 为本卷可评满分（不能都写"100 分"） */
function fullScoreLabel(task) { return task.scoreScale === 'raw' ? '按本卷可评满分' : '满分 100' }
/** 考务口径的分数（归一化/原始分），字段缺失时回落原始分以兼容老会话 */
function finalOf(r) {
  if (typeof r.finalScore === 'number' && typeof r.finalMax === 'number') return { score: r.finalScore, max: r.finalMax }
  return { score: r.rawTotal, max: r.scoreableMax }
}
/** 达标线文案：考务设定 vs 难度标定 */
function lineLabel(r) { return r.passLineSource === 'exam' ? '达标线' : `${r.level} 线` }

const STATE = {
  notStarted: { key: 'notStarted', label: '未开始' },
  pending: { key: 'pending', label: '待作答' },
  inProgress: { key: 'inProgress', label: '作答中' },
  submitted: { key: 'submitted', label: '已交卷' },
  expired: { key: 'expired', label: '已结束' }
}

/** 成绩可见性按任务的 §5.0 配置（1a 时机 × 1b 内容）判定 */
function scoreOf(task, session) {
  const cfg = task.scoreVisible || { when: 'afterSubmit', content: 'total' }
  const win = windowStateOf(task)
  const open = cfg.when === 'afterSubmit' || (cfg.when === 'afterWindow' && win === 'expired')
  // 考试室按 `results`（caseId → 评分结果）存，这里取第一份；兼容旧的单数 `result`
  const r = session && (session.result || (session.results && Object.values(session.results)[0]))
  if (!open) return { visible: false, reason: cfg.when === 'afterPublish' ? '成绩由教师发布后可见' : '成绩将于考试窗口结束后公布' }
  if (!r) return { visible: false, reason: '答卷已提交，等待评阅完成' }
  const detail = cfg.content !== 'total'
  // 判定与文案走考务口径的新字段：passLine / passed / passLineSource（见 useReportScoring.withExamScale）
  const line = typeof r.passLine === 'number' ? r.passLine : null
  const fin = finalOf(r)
  const passed = typeof r.passed === 'boolean' ? r.passed : (line === null ? null : fin.score >= line)
  return {
    visible: true,
    detail,
    text: `${fin.score} / ${fin.max}`,
    passed,
    pass: line === null ? '' : `${passed ? '达标' : '未达标'}（${lineLabel(r)} ${Math.round(line * 10) / 10} 分）`
  }
}

const rows = computed(() => tasks.value.map(task => {
  const session = sessions.value[task.id] || null
  const win = windowStateOf(task)
  const ss = sessionStateOf(task, session)
  let state = STATE.pending
  if (ss === 'submitted') state = STATE.submitted
  else if (ss === 'inProgress') state = STATE.inProgress
  else if (win === 'notStarted') state = STATE.notStarted
  else if (win === 'expired') state = STATE.expired
  const s = scoreOf(task, session)
  return {
    task, session, state,
    scoreVisible: s.visible, scoreText: s.text || '', passed: s.passed,
    passText: s.visible && s.pass ? s.pass : '',
    hiddenReason: s.reason || ''
  }
}))

function refresh() {
  const m = {}
  tasks.value.forEach(t => { const s = loadSession(t.id); if (s) m[t.id] = s })
  sessions.value = m
}
function enter(task) { router.push({ name: 'reportWritingExam', query: { task: task.id } }) }
function goPractice() { router.push({ name: 'reportWritingExam' }) }

/**
 * 任务来源优先级：**考核服务** → 管理端创建的考核配置 → 内置演示数据。
 * 同时把服务端已有的会话与成绩并回本地视图 —— 这是"交卷后关页，回来还能看到成绩"的前端一侧：
 * 换了设备或清了本地存储，也能从服务端拿回"这场我考过没有、出分没有"。
 */
async function loadTasks() {
  // ① 考核服务（含服务端算好的 state 与成绩）
  try {
    const r = await examApi.tasks()
    if (r.server && r.tasks.length) {
      tasks.value = r.tasks
      dataSource.value = 'server'
      const m = {}
      for (const t of r.tasks) {
        const remote = await examApi.sessionOf(t.id, '')
        if (remote && remote.session) {
          const rs = remote.session
          m[t.id] = {
            server: true, serverSessionId: rs.sessionId, taskId: t.id,
            startedAt: rs.startedAt, deadline: rs.deadline,
            answers: rs.answers || {}, leaveCount: rs.leaveCount || 0, superseded: rs.superseded || 0,
            submitted: !!rs.submitted, submittedAt: rs.submittedAt || '', status: rs.status,
            results: (remote.score && remote.score.results) || undefined
          }
          saveSession(t.id, m[t.id])
        }
      }
      sessions.value = m
      return
    }
  } catch (e) { /* 服务不可达 → 继续回落 */ }

  // ② 管理端创建（本地文件）
  try {
    const created = await createdExamsStore.load()
    if (Array.isArray(created) && created.length) {
      tasks.value = created
      dataSource.value = 'created'
      return
    }
  } catch (e) { /* 存储不可用则用示例数据 */ }

  // ③ 内置演示数据
  dataSource.value = 'demo'
}

const SOURCE_LABEL = {
  server: '已接入考核服务',
  created: '已接入考核配置',
  demo: '示例数据'
}
const sourceLabel = computed(() => SOURCE_LABEL[dataSource.value] || SOURCE_LABEL.demo)

onMounted(async () => {
  await loadTasks()
  if (dataSource.value !== 'server') refresh()
})
</script>

<style scoped>
.et-page { min-height: 100vh; padding: 60px 24px 40px; }
.et-head { max-width: 980px; margin: 0 auto 16px; }
.et-title { margin: 0 0 4px; font-size: 19px; display: flex; align-items: center; gap: 10px; }
.et-title i { color: var(--primary); }
.et-sub { margin: 0; font-size: 12.5px; color: var(--text-secondary); }

.et-empty { max-width: 980px; margin: 0 auto; padding: 32px; text-align: center; color: var(--text-secondary); font-size: 13px; }
.et-list { max-width: 980px; margin: 0 auto; display: flex; flex-direction: column; gap: 12px; }
.et-card { padding: 18px 22px; }

.et-card-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.et-card-title { font-size: 15px; font-weight: 600; color: #1f2937; }
.et-state { font-size: 11.5px; border-radius: 8px; padding: 3px 9px; white-space: nowrap; }
.et-state.is-pending { color: #1d4ed8; background: #dbeafe; }
.et-state.is-inProgress { color: #b45309; background: #fef3c7; }
.et-state.is-submitted { color: #15803d; background: #dcfce7; }
.et-state.is-notStarted { color: #475569; background: #f1f5f9; }
.et-state.is-expired { color: #6b7280; background: #f3f4f6; }

.et-scheme { margin-top: 4px; font-size: 12px; color: var(--text-secondary); }
.et-facts { display: flex; flex-wrap: wrap; gap: 16px; margin-top: 12px; }
.et-fact { font-size: 12.5px; color: #4b5563; display: inline-flex; align-items: center; gap: 6px; }
.et-fact i { color: #9ca3af; font-size: 11.5px; }
.et-window { margin-top: 10px; font-size: 11.5px; color: #9ca3af; }
.et-by { color: #b0b7c3; }

.et-score { margin-top: 12px; padding-top: 12px; border-top: 1px solid #f3f4f6; display: flex; align-items: center; gap: 12px; }
.et-score-val { font-size: 17px; font-weight: 700; color: var(--primary); font-variant-numeric: tabular-nums; }
.et-pass { font-size: 11.5px; border-radius: 8px; padding: 2px 8px; }
.et-pass.is-ok { color: #15803d; background: #dcfce7; }
.et-pass.is-no { color: #b91c1c; background: #fee2e2; }
.et-score-hidden { font-size: 12px; color: #92400e; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 4px 10px; }

.et-actions { margin-top: 14px; display: flex; align-items: center; gap: 12px; }
.et-warn { font-size: 11.5px; color: #b45309; }

.et-foot { max-width: 980px; margin: 18px auto 0; display: flex; align-items: center; gap: 8px; font-size: 12.5px; color: var(--text-secondary); }
.et-link { background: none; border: none; padding: 0; color: var(--primary); font-size: 12.5px; cursor: pointer; text-decoration: underline; }
.et-source { margin-left: auto; font-size: 11.5px; color: var(--text-tertiary); }
</style>
