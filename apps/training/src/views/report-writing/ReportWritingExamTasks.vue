<template>
  <div class="et-page">
    <!-- ══ 顶部操作区（固定在最上面，不被任务记录挤走）══ -->
    <div class="et-hero">
      <div class="et-hero-main">
        <h2 class="et-hero-title"><i class="fa-solid fa-clipboard-list"></i> 我的考核任务</h2>
        <p class="et-hero-sub">老师派发的考核 · 当前考生 {{ examNumber || '—' }}</p>
      </div>
      <div class="et-hero-side">
        <div class="et-stat"><strong>{{ stats.todo }}</strong><span>待完成</span></div>
        <div class="et-stat"><strong>{{ stats.done }}</strong><span>已完成</span></div>
        <button class="btn btn-primary et-practice" @click="goPractice">
          <i class="fa-solid fa-dumbbell"></i>
          <span class="et-practice-text">做练习考<em>不计成绩</em></span>
        </button>
      </div>
    </div>

    <!-- ══ 筛选 ══ -->
    <div class="et-tabs">
      <button v-for="t in TABS" :key="t.key" class="et-tab" :class="{ active: tab === t.key }" @click="tab = t.key">
        {{ t.label }}<span class="et-tab-n">{{ countOf(t.key) }}</span>
      </button>
      <span class="et-source">{{ sourceLabel }}</span>
    </div>

    <!-- ══ 列表：待完成在前，已完成可折叠（记录多了也不会把上面的入口顶下去）══ -->
    <div v-if="listRows.length" class="et-list">
      <template v-for="item in listRows" :key="item.key">
        <button v-if="item.head && item.head.toggle" class="et-sec-head is-toggle" @click="showDone = !showDone">
          <i class="fa-solid" :class="showDone ? 'fa-chevron-down' : 'fa-chevron-right'"></i>
          已完成 <span class="et-sec-n">{{ item.head.n }}</span>
          <span class="et-sec-tip">{{ showDone ? '收起' : '展开' }}</span>
        </button>
        <div v-else-if="item.head" class="et-sec-head">
          <i class="fa-solid" :class="item.head.icon"></i>
          {{ item.head.label }} <span class="et-sec-n">{{ item.head.n }}</span>
        </div>

        <article v-else class="card et-card" :class="{ 'is-done': item.row.state.key === 'submitted' }">
          <div class="et-card-main">
            <div class="et-card-head">
              <span class="et-card-title">{{ item.row.task.name }}</span>
              <span class="et-state" :class="'is-' + item.row.state.key">{{ item.row.state.label }}</span>
            </div>
            <div class="et-scheme">{{ item.row.task.scheme }}</div>

            <div class="et-facts">
              <span class="et-fact"><i class="fa-solid fa-laptop-medical"></i> {{ modeLabel(item.row.task.examMode) }}</span>
              <span class="et-fact"><i class="fa-solid fa-list-ol"></i> {{ questionCountOf(item.row.task) }} 题 · {{ fullScoreLabel(item.row.task) }}</span>
              <span class="et-fact"><i class="fa-regular fa-clock"></i> {{ item.row.task.durationMin }} 分钟</span>
              <span class="et-fact"><i class="fa-solid fa-bullseye"></i> 达标线 {{ item.row.task.passLine }} 分</span>
              <span v-if="remainTip(item.row)" class="et-fact is-urgent">
                <i class="fa-solid fa-hourglass-half"></i> {{ remainTip(item.row) }}
              </span>
            </div>

            <div class="et-window">
              考试窗口 {{ item.row.task.windowStart }} — {{ item.row.task.windowEnd }}
              <span class="et-by">· {{ item.row.task.dispatchedBy }} 派发于 {{ item.row.task.dispatchedAt }}</span>
            </div>
          </div>

          <div class="et-card-side">
            <div v-if="item.row.session && item.row.session.submitted" class="et-score">
              <template v-if="item.row.scoreVisible">
                <span class="et-score-val">{{ item.row.scoreText }}</span>
                <span v-if="item.row.passText" class="et-pass" :class="item.row.passed ? 'is-ok' : 'is-no'">
                  {{ item.row.passText }}
                </span>
              </template>
              <span v-else class="et-score-hidden">
                <i class="fa-solid fa-lock"></i> {{ item.row.hiddenReason }}
              </span>
            </div>

            <button v-if="item.row.state.key === 'inProgress'" class="btn btn-primary btn-sm" @click="enter(item.row.task)">
              <i class="fa-solid fa-play"></i> 继续作答
            </button>
            <button v-else-if="item.row.state.key === 'pending'" class="btn btn-primary btn-sm" @click="enter(item.row.task)">
              <i class="fa-solid fa-file-pen"></i> 进入考试
            </button>
            <button v-else-if="item.row.state.key === 'submitted'" class="btn btn-sm" @click="enter(item.row.task)">
              <i class="fa-solid fa-flag-checkered"></i> 查看成绩
            </button>
            <button v-else class="btn btn-sm" disabled>
              {{ item.row.state.key === 'notStarted' ? '未开始' : '已结束' }}
            </button>

            <span v-if="item.row.session && item.row.session.superseded" class="et-warn">
              <i class="fa-solid fa-triangle-exclamation"></i> 该考次在别处继续过 {{ item.row.session.superseded }} 次
            </span>
          </div>
        </article>
      </template>
    </div>

    <!-- ══ 空态 ══ -->
    <div v-else class="card et-empty">
      <i class="fa-regular fa-folder-open"></i>
      <p>{{ emptyText }}</p>
      <button class="btn btn-primary" @click="goPractice">
        <i class="fa-solid fa-dumbbell"></i> 去做练习考（不计成绩）
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { EXAM_TASKS, EXAM_MODE_LABEL, windowStateOf } from '@ai-sp/shared/imaging'
import { loadSession, sessionStateOf, saveSession, examApi } from '@ai-sp/shared/imaging-ui'
import { createdExamsStore } from '@ai-sp/shared/created-exams'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()
const sessions = ref({})
/** 任务列表：管理端创建的考核优先，读不到才用演示数据兜底 */
const tasks = ref(EXAM_TASKS)
const dataSource = ref('demo')
/** 当前考生学号：名单过滤、服务端认人、按人取会话都用它 */
const examNumber = computed(() => userStore.examNumber || '')

/**
 * **按名单过滤**：老师派发的考核只对名单内的考生可见。
 * 名单为空 = 对所有人开放（兼容老数据与"不派发"的练习场景）。
 */
const visibleTasks = computed(() => {
  const me = examNumber.value
  return tasks.value.filter(t => {
    const roster = Array.isArray(t.candidates) ? t.candidates : []
    if (!roster.length) return true
    return roster.some(c => String(c.examNumber || c.id || '') === String(me))
  })
})

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

const rows = computed(() => visibleTasks.value.map(task => {  const session = sessions.value[task.id] || null
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

/* ── 主界面交互：分段筛选 + 待完成/已完成分组 + 已完成可折叠 ──
   设计意图：**练习考入口固定在页头**（见模板 .et-hero），所以任务再多也不会把它挤到看不见；
   已完成属于历史，默认折叠（只有一两条时自动展开），避免列表越堆越长。 */
const TABS = [
  { key: 'todo', label: '待完成' },
  { key: 'done', label: '已完成' },
  { key: 'all', label: '全部' }
]
const tab = ref('all')
const showDone = ref(true)

const isDone = r => r.state.key === 'submitted'
const todoRows = computed(() => rows.value.filter(r => !isDone(r)))
const doneRows = computed(() => rows.value.filter(isDone))
const stats = computed(() => ({ todo: todoRows.value.length, done: doneRows.value.length }))

function countOf(key) {
  if (key === 'todo') return todoRows.value.length
  if (key === 'done') return doneRows.value.length
  return rows.value.length
}

const filteredRows = computed(() => {
  if (tab.value === 'todo') return todoRows.value
  if (tab.value === 'done') return doneRows.value
  return rows.value
})

/** 两组之间插一个分组标题；已完成组折叠时只留标题 */
const listRows = computed(() => {
  const out = []
  const todo = filteredRows.value.filter(r => !isDone(r))
  const done = filteredRows.value.filter(isDone)
  if (todo.length) {
    out.push({ key: '__h_todo', head: { icon: 'fa-hourglass-half', label: '待完成', n: todo.length, toggle: false } })
    todo.forEach(r => out.push({ key: r.task.id, row: r }))
  }
  if (done.length) {
    out.push({ key: '__h_done', head: { label: '已完成', n: done.length, toggle: tab.value !== 'done' } })
    if (showDone.value || tab.value === 'done') done.forEach(r => out.push({ key: r.task.id, row: r }))
  }
  return out
})

/** 作答中的场次给剩余时间，帮学员判断先做哪个 */
function remainTip(r) {
  const s = r.session
  if (r.state.key !== 'inProgress' || !s || !s.deadline) return ''
  const left = Math.max(0, Math.round((s.deadline - Date.now()) / 60000))
  return `剩余约 ${left} 分钟`
}

const emptyText = computed(() => {
  if (tab.value === 'todo') return '没有待完成的考核'
  if (tab.value === 'done') return '还没有已完成的考核'
  return '暂无考核任务'
})
function refresh() {
  const m = {}
  visibleTasks.value.forEach(t => { const s = loadSession(t.id); if (s) m[t.id] = s })
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
      /* 按 (taskId, 学号) 取会话 —— 换设备/清本地存储后仍能拿回"这场我考过没有、出分没有"；
         同时保证看到的是**自己**的状态，不是别人的 */
      for (const t of visibleTasks.value) {
        const remote = await examApi.sessionOf(t.id, examNumber.value)
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
const sourceLabel = computed(() => `${SOURCE_LABEL[dataSource.value] || SOURCE_LABEL.demo} · 考生 ${examNumber.value || '—'}`)

onMounted(async () => {
  await loadTasks()
  if (dataSource.value !== 'server') refresh()
  /* 已完成只有一两条时展开，多了就默认收起 —— 让"待完成"和页头入口始终在首屏 */
  showDone.value = doneRows.value.length <= 2
})
</script>

<style scoped>
/* 有壳页：全局页头 + 面包屑由 TrainingLayout 提供；容器宽度与训练列表页（.rwt-page）一致 */
.et-page { max-width: 1240px; margin: 0 auto; padding: 20px 24px 48px; }

/* ── 页头：操作区，永远在最上面 ── */
.et-hero {
  display: flex; align-items: center; justify-content: space-between; gap: 20px; flex-wrap: wrap;
  padding: 18px 22px; margin-bottom: 14px; border-radius: 12px;
  background: linear-gradient(135deg, #4f46e5 0%, #312e81 100%); color: #fff;
}
.et-hero-title { margin: 0 0 4px; font-size: 18px; font-weight: 700; display: flex; align-items: center; gap: 10px; }
.et-hero-sub { margin: 0; font-size: 12.5px; opacity: .85; }
.et-hero-side { display: flex; align-items: center; gap: 22px; }
.et-stat { text-align: center; }
.et-stat strong { display: block; font-size: 20px; font-weight: 700; line-height: 1.1; }
.et-stat span { font-size: 11px; opacity: .8; }
.et-practice {
  display: inline-flex; align-items: center; gap: 10px;
  background: #fff; color: #3730a3; border: none;
  padding: 9px 18px; border-radius: 10px; font-weight: 600; cursor: pointer;
  box-shadow: 0 2px 10px rgba(0,0,0,.15);
}
.et-practice:hover { background: #f5f3ff; }
.et-practice-text { display: flex; flex-direction: column; align-items: flex-start; line-height: 1.25; }
.et-practice-text em { font-style: normal; font-size: 10.5px; font-weight: 400; color: #7c7fa1; }

/* ── 分段筛选 ── */
.et-tabs { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }
.et-tab {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 14px; border-radius: 16px; cursor: pointer;
  border: 1px solid var(--border); background: #fff; font-size: 12.5px; color: #4b5563;
}
.et-tab:hover { border-color: var(--primary); }
.et-tab.active { border-color: var(--primary); background: #eef2ff; color: #3730a3; font-weight: 600; }
.et-tab-n { font-size: 11px; color: #9ca3af; }
.et-tab.active .et-tab-n { color: #6366f1; }
.et-source { margin-left: auto; font-size: 11.5px; color: var(--text-tertiary); }

/* ── 分组标题 ── */
.et-sec-head {
  display: flex; align-items: center; gap: 8px;
  margin: 6px 0 2px; padding: 0 2px;
  font-size: 12.5px; font-weight: 600; color: #6b7280;
}
.et-sec-head.is-toggle {
  background: none; border: none; cursor: pointer; padding: 6px 2px;
  font-family: inherit; text-align: left;
}
.et-sec-head.is-toggle:hover { color: var(--primary); }
.et-sec-n { font-size: 11px; font-weight: 500; color: #9ca3af; background: #f1f5f9; border-radius: 8px; padding: 1px 7px; }
.et-sec-tip { font-size: 11px; font-weight: 400; color: #b0b7c3; }

/* ── 任务卡：左信息 + 右操作 ── */
.et-list { display: flex; flex-direction: column; gap: 10px; }
.et-card { padding: 16px 20px; display: flex; align-items: center; gap: 20px; }
.et-card.is-done { background: #fcfcfd; }
.et-card-main { flex: 1; min-width: 0; }
.et-card-side {
  flex-shrink: 0; display: flex; flex-direction: column; align-items: flex-end; gap: 8px;
  min-width: 180px;
}
.et-card-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.et-card-title { font-size: 15px; font-weight: 600; color: #1f2937; }
.et-state { font-size: 11.5px; border-radius: 8px; padding: 3px 9px; white-space: nowrap; }
.et-state.is-pending { color: #1d4ed8; background: #dbeafe; }
.et-state.is-inProgress { color: #b45309; background: #fef3c7; }
.et-state.is-submitted { color: #15803d; background: #dcfce7; }
.et-state.is-notStarted { color: #475569; background: #f1f5f9; }
.et-state.is-expired { color: #6b7280; background: #f3f4f6; }

.et-scheme { margin-top: 4px; font-size: 12px; color: var(--text-secondary); }
.et-facts { display: flex; flex-wrap: wrap; gap: 16px; margin-top: 10px; }
.et-fact { font-size: 12.5px; color: #4b5563; display: inline-flex; align-items: center; gap: 6px; }
.et-fact i { color: #9ca3af; font-size: 11.5px; }
.et-fact.is-urgent { color: #b45309; }
.et-fact.is-urgent i { color: #d97706; }
.et-window { margin-top: 8px; font-size: 11.5px; color: #9ca3af; }
.et-by { color: #b0b7c3; }

.et-score { display: flex; align-items: center; gap: 10px; }
.et-score-val { font-size: 18px; font-weight: 700; color: var(--primary); font-variant-numeric: tabular-nums; }
.et-pass { font-size: 11.5px; border-radius: 8px; padding: 2px 8px; }
.et-pass.is-ok { color: #15803d; background: #dcfce7; }
.et-pass.is-no { color: #b91c1c; background: #fee2e2; }
.et-score-hidden { font-size: 12px; color: #92400e; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 4px 10px; }
.et-warn { font-size: 11px; color: #b45309; }

/* ── 空态 ── */
.et-empty {
  padding: 44px 24px; text-align: center; color: var(--text-secondary); font-size: 13px;
  display: flex; flex-direction: column; align-items: center; gap: 12px;
}
.et-empty i { font-size: 30px; color: #cbd5e1; }
.et-empty p { margin: 0; }

@media (max-width: 900px) {
  .et-card { flex-direction: column; align-items: stretch; }
  .et-card-side { align-items: flex-start; min-width: 0; }
}
.et-source { margin-left: auto; font-size: 11.5px; color: var(--text-tertiary); }
</style>
