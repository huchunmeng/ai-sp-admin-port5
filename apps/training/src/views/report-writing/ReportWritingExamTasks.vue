<template>
  <div class="et-page">
    <!-- ══ 顶部操作区（固定在最上面，不被任务记录挤走）══ -->
    <div class="et-hero">
      <div class="et-hero-main">
        <h2 class="et-hero-title"><i class="fa-solid fa-clipboard-list"></i> 我的考核任务</h2>
        <p class="et-hero-sub">老师派发的考核 · 当前考生 {{ examNumber || '—' }}</p>
      </div>
      <button class="btn btn-primary et-practice" @click="goPractice">
        <i class="fa-solid fa-pen-to-square"></i> 做练习考
      </button>
    </div>

    <!-- ══ 筛选：列表内**不再另起分组标题**（会和这里重复）══ -->
    <div class="et-tabs">
      <button v-for="t in TABS" :key="t.key" class="et-tab" :class="{ active: tab === t.key }" @click="switchTab(t.key)">
        {{ t.label }}<span class="et-tab-n">{{ countOf(t.key) }}</span>
      </button>
      <span class="et-source">{{ sourceLabel }}</span>
      <!-- 演示入口：没有练习考记录时可直接装几条看列表形态（与训练记录的"载入演示记录"同一约定） -->
      <button v-if="!practiceRecords.length" class="et-load-demo" @click="loadDemo">载入演示练习考记录</button>
    </div>

    <div v-if="filteredRows.length" class="et-list">
      <article v-for="r in filteredRows" :key="r.kind === 'practice' ? r.id : r.task.id" class="card et-card"
               :class="{ 'is-done': r.kind === 'practice' || r.state.key === 'submitted' }">

        <!-- 练习考记录：与正式考核同列表，靠「练习考」标记区分（不单独开页签） -->
        <template v-if="r.kind === 'practice'">
          <div class="et-card-main">
            <div class="et-card-title">{{ r.title }}</div>
            <div class="et-scheme">{{ r.sub }}<template v-if="r.level"> · {{ r.level }}</template></div>
            <div class="et-window">练习考 · 提交于 {{ r.submittedAt }}</div>
          </div>
          <div class="et-card-side">
            <span class="et-state is-practice">练习考</span>
            <div class="et-score">
              <span v-if="r.status === 'failed'" class="text-error" style="font-size:12px">评分失败</span>
              <span v-else class="et-score-val">{{ r.score }} / {{ r.scoreableMax }}</span>
            </div>
            <button class="btn btn-sm" :disabled="r.status !== 'done'" @click="openPracticeRecord(r.rec)">
              <i class="fa-solid fa-file-lines"></i> 成绩报告
            </button>
          </div>
        </template>

        <template v-else>
        <div class="et-card-main">
          <div class="et-card-title">{{ r.task.name }}</div>
          <div class="et-scheme">{{ r.task.scheme }}</div>

          <div class="et-facts">
            <span class="et-fact"><i class="fa-solid fa-laptop-medical"></i> {{ modeLabel(r.task.examMode) }}</span>
            <span class="et-fact"><i class="fa-solid fa-list-ol"></i> {{ questionCountOf(r.task) }} 题 · {{ fullScoreLabel(r.task) }}</span>
            <span class="et-fact"><i class="fa-regular fa-clock"></i> {{ r.task.durationMin }} 分钟</span>
            <span class="et-fact"><i class="fa-solid fa-bullseye"></i> 达标线 {{ r.task.passLine }} 分</span>
            <span v-if="remainTip(r)" class="et-fact is-urgent">
              <i class="fa-solid fa-hourglass-half"></i> {{ remainTip(r) }}
            </span>
          </div>

          <div class="et-window">
            考试窗口 {{ r.task.windowStart }} — {{ r.task.windowEnd }}
            <span class="et-by">· {{ r.task.dispatchedBy }} 派发于 {{ r.task.dispatchedAt }}</span>
          </div>
        </div>

        <!-- 右侧一列：状态徽标 → 成绩 → 主动作（状态不再挤在标题行） -->
        <div class="et-card-side">
          <span class="et-state" :class="'is-' + r.state.key">{{ r.state.label }}</span>

          <div v-if="r.session && r.session.submitted" class="et-score">
            <template v-if="r.scoreVisible">
              <span class="et-score-val">{{ r.scoreText }}</span>
              <span v-if="r.passText" class="et-pass" :class="r.passed ? 'is-ok' : 'is-no'">
                {{ r.passText }}
              </span>
            </template>
            <span v-else class="et-score-hidden">
              <i class="fa-solid fa-lock"></i> {{ r.hiddenReason }}
            </span>
          </div>

          <button v-if="r.state.key === 'inProgress'" class="btn btn-primary btn-sm" @click="enter(r.task)">
            <i class="fa-solid fa-play"></i> 继续作答
          </button>
          <button v-else-if="r.state.key === 'pending'" class="btn btn-primary btn-sm" @click="enter(r.task)">
            <i class="fa-solid fa-file-pen"></i> 进入考试
          </button>
          <button v-else-if="r.state.key === 'submitted'" class="btn btn-sm" @click="enter(r.task)">
            <i class="fa-solid fa-flag-checkered"></i> 查看成绩
          </button>
          <button v-else class="btn btn-sm" disabled>
            {{ r.state.key === 'notStarted' ? '未开始' : '已结束' }}
          </button>

          <span v-if="r.session && r.session.superseded" class="et-warn">
            <i class="fa-solid fa-triangle-exclamation"></i> 该考次在别处继续过 {{ r.session.superseded }} 次
          </span>
        </div>
        </template>
      </article>
    </div>

    <!-- ══ 空态 ══ -->
    <div v-else class="card et-empty">
      <i class="fa-regular fa-folder-open"></i>
      <p>{{ emptyText }}</p>
      <button class="btn btn-primary" @click="goPractice">
        <i class="fa-solid fa-pen-to-square"></i> 去做练习考
      </button>
    </div>

    <!-- 练习考记录的成绩报告：**不给报告对照**（红线 R1：考核侧不发金标准） -->
    <ScoreReportModal v-if="activeRecord"
                      :scoring="{ status: 'done', result: activeRecord.result, error: activeRecord.error || '', attempts: 1, appeal: null }"
                      :draft="activeRecord.draft || {}"
                      :sample="activeRecordSample"
                      :title="activeRecord.title"
                      :submitted-at="activeRecord.submittedAt"
                      hide-compare
                      :allow-rescore="false"
                      @close="activeRecord = null"
                      @score="() => {}" />
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { EXAM_TASKS, EXAM_MODE_LABEL, windowStateOf, getImagingSample } from '@ai-sp/shared/imaging'
import { loadSession, sessionStateOf, saveSession, examApi, ScoreReportModal } from '@ai-sp/shared/imaging-ui'
import { createdExamsStore } from '@ai-sp/shared/created-exams'
import { useUserStore } from '@/stores/user'
import { readExamRecords, loadDemoExamRecords } from '@/composables/useExamRecords'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const sessions = ref({})
/** 考试记录（练习考）：独立存储，与训练记录互不相干 */
const practiceRecords = ref([])
const activeRecord = ref(null)
const activeRecordSample = computed(() => (activeRecord.value ? (getImagingSample(activeRecord.value.caseId) || {}) : {}))
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

const rows = computed(() => visibleTasks.value.map(task => {
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

/* ── 主界面交互：分段筛选 ──
   练习考入口固定在页头（见模板 .et-hero），任务再多也不会把它挤下去；
   列表内**不再另起分组标题**（"待考/已考/全部"已经由上面的页签表达，重复了）。 */
const TABS = [
  { key: 'todo', label: '待考' },
  { key: 'done', label: '已考' },
  { key: 'all', label: '全部' }
]
const tab = ref('all')

const isDone = r => r.state.key === 'submitted'
const todoRows = computed(() => rows.value.filter(r => !isDone(r)))
const doneRows = computed(() => rows.value.filter(isDone))

/** 练习考记录 → 与考核任务同列表的行（靠「练习考」标记与正式考核区分，不单独开页签） */
const practiceRows = computed(() => practiceRecords.value.map(rec => ({
  kind: 'practice',
  id: rec.id,
  rec,
  title: rec.title,
  sub: [rec.bodyPart, rec.modality].filter(Boolean).join(' · '),
  level: rec.level,
  submittedAt: rec.submittedAt,
  score: rec.score,
  scoreableMax: rec.scoreableMax,
  status: rec.status
})))

/** 已完成项：正式考核（按交卷时间）+ 练习考记录，混排后按时间倒序 */
const doneList = computed(() => {
  const tasks = doneRows.value.map(r => ({ ...r, kind: 'task', sortAt: (r.session && r.session.submittedAt) || '' }))
  const practices = practiceRows.value.map(r => ({ ...r, sortAt: r.submittedAt }))
  return [...tasks, ...practices].sort((a, b) => String(b.sortAt).localeCompare(String(a.sortAt)))
})

function countOf(key) {
  if (key === 'todo') return todoRows.value.length
  if (key === 'done') return doneList.value.length
  return rows.value.length + practiceRows.value.length
}

/** 切页签时重新读一次考试记录（刚考完回来能看到） */
function refreshPractice() { practiceRecords.value = readExamRecords() }
function switchTab(key) {
  tab.value = key
  refreshPractice()
}
/** 载入演示练习考记录（仅演示用） */
function loadDemo() {
  practiceRecords.value = loadDemoExamRecords()
  if (!TABS.some(t => t.key === tab.value)) tab.value = 'done'
}
function openPracticeRecord(rec) { activeRecord.value = rec }

/** 排序：可操作的（作答中 / 待作答 / 未开始）在前，已交卷/已结束在后；组内保持原顺序 */
const STATE_ORDER = { inProgress: 0, pending: 1, notStarted: 2, submitted: 3, expired: 4 }
/** 列表行：待考（按状态排序）在前；已考（正式考核 + 练习考混排，按时间倒序）在后 */
const filteredRows = computed(() => {
  if (tab.value === 'todo') {
    return [...todoRows.value].sort((a, b) => (STATE_ORDER[a.state.key] ?? 9) - (STATE_ORDER[b.state.key] ?? 9))
  }
  if (tab.value === 'done') return doneList.value
  const todo = [...todoRows.value].sort((a, b) => (STATE_ORDER[a.state.key] ?? 9) - (STATE_ORDER[b.state.key] ?? 9))
      .map(r => ({ ...r, kind: 'task' }))
  return [...todo, ...doneList.value]
})

/** 作答中的场次给剩余时间，帮学员判断先做哪个 */
function remainTip(r) {
  const s = r.session
  if (r.state.key !== 'inProgress' || !s || !s.deadline) return ''
  const left = Math.max(0, Math.round((s.deadline - Date.now()) / 60000))
  return `剩余约 ${left} 分钟`
}

const emptyText = computed(() => {
  if (tab.value === 'todo') return '没有待考的考核'
  if (tab.value === 'done') return '还没有已考的考核'
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
  // 从练习考成绩报告「去查看」过来时带 ?tab=done，落到已考（练习考记录就在里面）
  if (route.query.tab && TABS.some(t => t.key === route.query.tab)) tab.value = route.query.tab
  refreshPractice()
  await loadTasks()
  if (dataSource.value !== 'server') refresh()
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
.et-practice {
  display: inline-flex; align-items: center; gap: 8px;
  background: #fff; color: #3730a3; border: none;
  padding: 10px 20px; border-radius: 10px; font-size: 13.5px; font-weight: 600; cursor: pointer;
  box-shadow: 0 2px 10px rgba(0,0,0,.15);
}
.et-practice:hover { background: #f5f3ff; }

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

/* ── 练习考标记：与正式考核同列表，靠它区分 ── */
.et-state.is-practice { color: #3730a3; background: #eef2ff; }
.et-load-demo {
  margin-left: 12px; background: none; border: none; padding: 0; cursor: pointer;
  font-size: 11.5px; color: var(--primary); text-decoration: underline;
}

/* ── 任务卡：左信息 + 右操作（状态徽标在右列顶部）── */
.et-list { display: flex; flex-direction: column; gap: 10px; }
.et-card { padding: 16px 20px; display: flex; align-items: center; gap: 20px; }
.et-card.is-done { background: #fcfcfd; }
.et-card-main { flex: 1; min-width: 0; }
.et-card-side {
  flex-shrink: 0; display: flex; flex-direction: column; align-items: flex-end; gap: 8px;
  min-width: 180px;
}
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
