<template>
  <div class="ex-page">
    <TrainingTopBar :station-name="phase === 'intro' ? pageTitle : (task ? '考核进行中' : '练习考进行中')" hide-timer hide-end formatted-time="" />

    <!-- ══ 开始前：考试须知 ══ -->
    <div v-if="phase === 'intro'" class="ex-intro">
      <div class="card ex-card">
        <h2 class="ex-title"><i class="fa-solid fa-file-pen"></i> {{ pageTitle }}</h2>
        <div v-if="!task" class="ex-warn">
          <i class="fa-solid fa-triangle-exclamation"></i>
          <div>
            <b>练习考不计成绩</b>，用于熟悉考试形态；评阅走训练口径（不跑考核红线校验），
            且<b>不提供参考报告对照</b>。
          </div>
        </div>
        <ul class="ex-rules">
          <li><b>考试方式</b>：{{ modeLabel }}</li>
          <li v-if="task"><b>考核方案</b>：{{ task.scheme }}</li>
          <li><b>题量</b>：{{ paper.length || paperSize }} 题{{ task ? '' : '（从可练题库随机抽取）' }}</li>
          <li><b>时长</b>：{{ durationMin }} 分钟，到点自动交卷</li>
          <li v-if="task"><b>满分 / 达标线</b>：{{ fullScoreText }} / {{ task.passLine }} 分</li>
          <li v-if="task"><b>成绩可见</b>：{{ scoreOpen ? '交卷后即可查看' : scoreHiddenText }}</li>
          <li><b>作答</b>：看影像写三段报告（临床目的与检查方法 / 影像所见 / 诊断意见）</li>
          <li><b>不提供</b>：AI伴学、参考报告对照</li>
          <li><b>断线续答</b>：中途断网或刷新不会重置计时，回到本页可继续作答</li>
          <li><b>单点作答</b>：同一考次在别处作答会被本页接管并留痕</li>
          <li><b>离开检测</b>：切屏或离开页面会被记录次数</li>
        </ul>
        <button class="btn btn-primary ex-start" @click="startExam">
          <i class="fa-solid fa-play"></i> {{ task ? '开始考试（进入全屏）' : '开始练习考（进入全屏）' }}
        </button>
        <div class="ex-hint">
          点开始后会请求全屏；浏览器不允许时不影响作答，仅失去全屏。
          <template v-if="task && task.examMode === 'online'">本场为在线考试，请使用自己的设备并保持网络连通。</template>
        </div>
      </div>
    </div>

    <!-- ══ 考试中 ══ -->
    <template v-else-if="phase === 'exam'">
      <div class="ex-bar">
        <span class="ex-timer" :class="{ 'is-urgent': remainSec <= 300 }">
          <i class="fa-regular fa-clock"></i> 剩余 {{ remainText }}
        </span>
        <span class="ex-meta">
          {{ currentIndex + 1 }} / {{ paper.length }} · {{ currentSample.bodyPart }} · {{ currentSample.modality }}
        </span>
        <span class="ex-mode"><i class="fa-solid fa-laptop-medical"></i> {{ modeLabel }}</span>
        <span v-if="savedAt" class="ex-saved"><i class="fa-solid fa-cloud-arrow-up"></i> 已自动保存</span>
        <span v-if="leaveCount" class="ex-leave">
          <i class="fa-solid fa-eye-slash"></i> 离开记录 {{ leaveCount }} 次
        </span>
        <button class="btn btn-sm btn-primary" @click="askSubmit">交卷</button>
      </div>

      <div v-if="superseded" class="ex-takenover">
        <i class="fa-solid fa-triangle-exclamation"></i>
        {{ resumeNotice || '该考次曾在别处继续作答（已留痕）' }}
      </div>

      <div class="ex-main">
        <ImagePanel :sample="currentSample" />
        <SegmentForm :segments="segments" :draft="draftOf(currentIndex)" :given="givenOf(currentSample)"
                     :total-chars="totalChars" :total-over="false" :total-limit="TOTAL_LIMIT"
                     @update:segment="setSegment" />
      </div>
    </template>

    <!-- ══ 已交卷：成绩（**不给参考报告对照**）══ -->
    <template v-else>
      <div class="ex-done">
        <div class="card ex-card">
          <h2 class="ex-title"><i class="fa-solid fa-flag-checkered"></i> 已交卷</h2>

          <div v-if="!scoreOpen" class="ex-locked">
            <i class="fa-solid fa-lock"></i> {{ scoreHiddenText }}
          </div>

          <div class="ex-scores">
            <div v-for="(q, i) in paper" :key="q.id" class="ex-score-row">
              <span class="ex-score-idx">{{ i + 1 }}</span>
              <span class="ex-score-title">{{ studentTitleOf(q.sample) }}</span>
              <span class="ex-score-val">
                <i v-if="submitting && !resultOf(i)" class="fa-solid fa-spinner fa-spin"></i>
                <template v-else-if="resultOf(i) && scoreOpen">{{ scoreTextOf(i) }}</template>
                <template v-else>—</template>
              </span>
              <span v-if="resultOf(i) && scoreOpen" class="ex-pass" :class="passed(i) ? 'is-ok' : 'is-no'">
                {{ passed(i) ? '达标' : '未达标' }}（{{ passLineLabel(i) }}）
              </span>
              <span v-else-if="!scoreOpen" class="text-secondary" style="font-size:12px">—</span>
              <span v-else class="text-secondary" style="font-size:12px">{{ submitting ? '评阅中' : '评分失败' }}</span>
              <button v-if="showDetail" class="btn btn-sm" :disabled="!resultOf(i)" @click="openReport(i)">成绩报告</button>
            </div>
          </div>
          <div class="ex-hint">
            <i class="fa-solid fa-circle-info"></i>
            交卷后<b>不提供参考报告对照</b> —— 交卷即给参考报告等于泄题给下一批。
            要对照学习请回「影像报告书写训练」再练一遍。
          </div>
          <button v-if="!task || task.retake !== 'single'" class="btn ex-start" style="margin-top:14px" @click="restart">
            <i class="fa-solid fa-rotate-right"></i> {{ task ? '重做本题' : '再来一份' }}
          </button>
          <button v-else class="btn ex-start" style="margin-top:14px" @click="goTasks">
            <i class="fa-solid fa-list-check"></i> 返回我的考核任务
          </button>
        </div>
      </div>
    </template>

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
import { TRAINING_CASES, WRITABLE_SEGMENTS, DEIDENTIFY_ROWS, studentTitleOf, COMMENT_SCOPE } from '@ai-sp/shared/imaging'
import TrainingTopBar from '@/components/TrainingTopBar.vue'
import { ImagePanel, SegmentForm, ScoreReportModal, useReportScoring } from '@ai-sp/shared/imaging-ui'
import { useRoute, useRouter } from 'vue-router'
import { taskById, windowStateOf, EXAM_MODE_LABEL } from '@ai-sp/shared/imaging'
import { startOrResume, saveSession, submitSession, loadSession, clearSession, currentClientId, EXAM_SERVER } from '@ai-sp/shared/imaging-ui'
import { createdExamsStore } from '@ai-sp/shared/created-exams'

/**
 * 考试室 —— **一个页面同时承担两种考试方式**（不写成两条代码路径）
 *
 *   · 带 `?task=` → 老师派发的考核：题目/时长/达标线/成绩可见性全部来自任务配置，
 *     评分走**考核口径**（COMMENT_SCOPE.EXAM，比训练侧多一道红线校验）
 *   · 不带 `?task=` → 练习考（考核侧 A 路 =「课后练习」那套预设），评分走训练口径
 *
 * 「考」的形态（两种方式共有）：
 *   · 限时，到点自动交卷
 *   · **断线续答**：会话与 deadline 落本地，刷新/重连不重置时钟（在线方式见《考核功能设计》§5.0.1 O2）
 *   · **单点作答**：同一考次在别处继续会被本页顶掉并留痕（O3）
 *   · 进入即请求全屏 + 切屏/失焦检测并记录次数（O7：只留痕、不阻断）
 *   · **无 AI伴学**；交卷后**不给参考报告对照**（给了就是泄题，红线 R1）
 *
 * ⚠️ 原型阶段时间以本机 `Date.now()` 为准，正式考核必须由服务端签发 startedAt/deadline；
 *    替换点只有 `useExamSession.js` 里的 `EXAM_SERVER`（该文件顶部写了接口契约）。
 */

/* ── 配置：有任务取任务，无任务取练习考预设 ── */
const route = useRoute()
const router = useRouter()
const task = ref(taskById(route.query.task))
const PRACTICE_SIZE = 1
const PRACTICE_MIN = 30            // 练习考预设时长；正式考核对齐 S03 = 20 分钟（写在任务配置里）

/**
 * 管理端创建的考核**不在静态清单里**（`taskById` 只查内置演示任务），需要异步补查。
 * 任务形状与静态任务完全一致，所以下面所有 computed 不用改。
 */
async function ensureTaskLoaded() {
  if (task.value || !route.query.task) return
  try {
    const list = await createdExamsStore.load()
    const found = (Array.isArray(list) ? list : []).find(t => t.id === route.query.task)
    if (found) task.value = found
  } catch (e) { /* 读不到就按练习考处理 */ }
}

const durationMin = computed(() => (task.value ? task.value.durationMin : PRACTICE_MIN))
/** 实际出题数：考务设定的题量优先（且不超过该场病例数），缺省用全部病例 */
const questionCount = computed(() => {
  if (!task.value) return PRACTICE_SIZE
  const total = (task.value.caseIds || []).length
  const want = Number(task.value.questionCount) || total
  return Math.max(1, Math.min(want, total || 1))
})
const paperSize = computed(() => (task.value ? questionCount.value : PRACTICE_SIZE))
const scopeOf = computed(() => (task.value ? COMMENT_SCOPE.EXAM : COMMENT_SCOPE.TRAINING))
const sessionKey = computed(() => (task.value ? task.value.id : '__practice__'))
const modeLabel = computed(() => (task.value ? (EXAM_MODE_LABEL[task.value.examMode] || task.value.examMode) : '练习考（不计成绩）'))
const pageTitle = computed(() => (task.value ? task.value.name : '影像报告书写 · 练习考'))
/** 须知里的满分口径文案：normalize 是百分制，raw 是本卷可评满分 */
const fullScoreText = computed(() => (task.value && task.value.scoreScale === 'raw' ? '按本卷可评满分' : '100 分'))
const TOTAL_LIMIT = 6500

const { score } = useReportScoring()

const phase = ref('intro')
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
const superseded = ref(0)
const resumeNotice = ref('')
let timer = null

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

const round1 = n => Math.round(Number(n) * 10) / 10
/** 达标判定：优先用评分层给出的 `passed`（已按考务设定的达标线算），缺失时回落原始分比较 */
const passed = i => {
  const r = resultOf(i)
  if (!r) return false
  if (typeof r.passed === 'boolean') return r.passed
  return typeof r.passLine === 'number' && r.rawTotal >= r.passLine
}
/** 考务口径的分数展示（字段缺失回落 rawTotal/scoreableMax，兼容老会话数据） */
function scoreTextOf(i) {
  const r = resultOf(i)
  if (!r) return '—'
  if (typeof r.finalScore === 'number' && typeof r.finalMax === 'number') return `${r.finalScore} / ${r.finalMax}`
  return `${r.rawTotal} / ${r.scoreableMax}`
}
/** 达标线文案：考务设定 → 「达标线 X 分」；难度标定 → 「R1 线 X 分」 */
function passLineLabel(i) {
  const r = resultOf(i)
  if (!r || typeof r.passLine !== 'number') return ''
  return r.passLineSource === 'exam' ? `达标线 ${round1(r.passLine)} 分` : `${r.level} 线 ${round1(r.passLine)} 分`
}

function draftOf(i) {
  const id = paper.value[i]?.id
  if (!id) return { purpose: '', findings: '', impression: '' }
  if (!answers[id]) answers[id] = { purpose: '', findings: '', impression: '' }
  return answers[id]
}
function setSegment(key, val) {
  draftOf(currentIndex.value)[key] = val
  persist()
}
function resultOf(i) { return results[paper.value[i]?.id] || null }

/** 段一：患者临床信息由系统给出（与训练侧同一口径：只给病史，不给检查目的） */
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

/* ── 全屏：浏览器会以 Promise 形式拒绝（拒绝/不支持都不能影响作答，也不能抛 unhandled rejection）── */
function requestFullscreenSafe() {
  try {
    const r = document.documentElement.requestFullscreen?.()
    if (r && typeof r.catch === 'function') r.catch(() => {})
  } catch (e) { /* ignore */ }
}
function exitFullscreenSafe() {
  try {
    const r = document.exitFullscreen?.()
    if (r && typeof r.catch === 'function') r.catch(() => {})
  } catch (e) { /* ignore */ }
}

/* ── 断线续答：会话落本地，deadline 开考时写入 → 刷新/重连不重置时钟（O2）── */
function persist(patch = {}) {
  if (phase.value !== 'exam') return
  saveSession(sessionKey.value, {
    answers, deadline: deadline.value, leaveCount: leaveCount.value, ...patch
  })
  savedAt.value = Date.now()
  EXAM_SERVER.save()   // 服务端契约占位（原型为空实现）
}

/** 恢复：已交卷 → 直接进成绩页；未到点 → 续答；否则返回 false 走新开考 */
function restoreSession() {
  const s = loadSession(sessionKey.value)
  if (!s) return false
  Object.assign(answers, s.answers || {})
  leaveCount.value = s.leaveCount || 0
  superseded.value = s.superseded || 0
  deadline.value = s.deadline || 0
  if (s.submitted) {
    submittedAt.value = String(s.submittedAt || '').slice(0, 16).replace('T', ' ')
    Object.entries(s.results || {}).forEach(([k, v]) => { results[k] = v })
    buildPaper()
    phase.value = 'done'
    return true
  }
  if (s.deadline > Date.now()) {
    buildPaper()
    phase.value = 'exam'
    if (s.clientId && s.clientId !== currentClientId()) {
      resumeNotice.value = '该考次已在别处继续作答，本页已接管（已留痕）'
      toast.show(resumeNotice.value, 'warning', 3000)
    }
    return true
  }
  return false
}

/** 出卷：派发任务按固定题序取前 N 例（N = 考务设定题量）；练习考从可练题库随机抽 */
function buildPaper() {
  if (task.value) {
    const ids = (task.value.caseIds || [])
      .filter(id => TRAINING_CASES.some(c => c.id === id))
      .slice(0, paperSize.value)
    paper.value = ids.map(id => {
      const sample = TRAINING_CASES.find(c => c.id === id)
      return { id, sample, title: studentTitleOf(sample) }
    })
    return
  }
  const pool = TRAINING_CASES.slice()
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  paper.value = pool.slice(0, PRACTICE_SIZE).map(sample => ({ id: sample.id, sample, title: studentTitleOf(sample) }))
}

/* ── 成绩可见性：按任务的 §5.0 配置（1a 时机 × 1b 内容）── */
const scoreCfg = computed(() => (task.value && task.value.scoreVisible) || { when: 'afterSubmit', content: 'total' })
const scoreOpen = computed(() => {
  if (scoreCfg.value.when === 'afterSubmit') return true
  if (scoreCfg.value.when === 'afterWindow') return !task.value || windowStateOf(task.value) === 'expired'
  return false
})
const scoreHiddenText = computed(() => (scoreCfg.value.when === 'afterPublish'
  ? '成绩由教师发布后可见'
  : '成绩将于考试窗口结束后公布'))
const showDetail = computed(() => scoreCfg.value.content !== 'total')

async function startExam() {
  if (!paper.value.length) buildPaper()
  const { session, adopted } = await startOrResume(sessionKey.value, durationMin.value, answers)
  deadline.value = session.deadline
  leaveCount.value = session.leaveCount || 0
  superseded.value = session.superseded || 0
  if (adopted) {
    Object.assign(answers, session.answers || {})   // 接管别处的作答内容（单点作答 O3）
    resumeNotice.value = '该考次已在别处继续作答，本页已接管（已留痕）'
    toast.show(resumeNotice.value, 'warning', 3000)
  }
  phase.value = 'exam'
  now.value = Date.now()
  persist()
  // 全屏需用户手势：这里正是点击回调
  requestFullscreenSafe()
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

/* ── 离开检测 ── */
function onVisible() { if (document.hidden && phase.value === 'exam') markLeave() }
function onBlur() { if (phase.value === 'exam') markLeave() }
function markLeave() {
  leaveCount.value += 1
  persist()
  toast.show(`已记录离开页面 ${leaveCount.value} 次`, 'warning', 2000)
}

/* ── 交卷 ── */
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
  exitFullscreenSafe()
  // ① **先锁定答卷**：交卷即刻入库（服务端契约：POST /submit）。
  //    评阅是异步的，评分失败/中途关页都不能让"已交卷"这件事本身丢掉。
  submitSession(sessionKey.value, {
    answers, leaveCount: leaveCount.value, deadline: deadline.value
  })
  // ② 再逐题评分并回填成绩
  const collected = {}
  for (let i = 0; i < paper.value.length; i++) {
    const q = paper.value[i]
    // 考核口径取严（含红线校验）；练习考走训练口径。
    // 达标线 / 满分口径取**考务设定**（练习考没有，传 null 走难度标定）。
    const res = await score({
      sample: q.sample,
      reportText: { ...draftOf(i) },
      scope: scopeOf.value,
      passLine: task.value ? task.value.passLine : null,
      scoreScale: task.value ? task.value.scoreScale : 'normalize'
    })
    if (res.ok) { results[q.id] = res.result; collected[q.id] = res.result }
    else toast.show(`${studentTitleOf(q.sample)} 评分失败：${res.reason || ''}`, 'error', 3000)
  }
  submitting.value = false
  submitSession(sessionKey.value, { results: collected })
}
function openReport(i) { reportIndex.value = i }
function goTasks() { router.push({ name: 'reportWritingExamTasks' }) }
function restart() {
  clearSession(sessionKey.value)
  paper.value = []
  Object.keys(answers).forEach(k => delete answers[k])
  Object.keys(results).forEach(k => delete results[k])
  currentIndex.value = 0
  reportIndex.value = null
  submittedAt.value = ''
  leaveCount.value = 0
  superseded.value = 0
  resumeNotice.value = ''
  phase.value = 'intro'
  buildPaper()
}

onMounted(async () => {
  await ensureTaskLoaded()
  if (!restoreSession()) buildPaper()
  document.addEventListener('visibilitychange', onVisible)
  window.addEventListener('blur', onBlur)
  if (phase.value === 'exam') startTick()
})
onUnmounted(() => {
  stopTick()
  document.removeEventListener('visibilitychange', onVisible)
  window.removeEventListener('blur', onBlur)
  try { exitFullscreenSafe() } catch (e) { /* ignore */ }
})
</script>

<style scoped>
.ex-page { position: relative; min-height: 100vh; padding: 60px 24px 24px; }
.ex-intro, .ex-done { max-width: 720px; margin: 40px auto; }
.ex-card { padding: 24px 28px; }
.ex-title { margin: 0 0 16px; font-size: 19px; display: flex; align-items: center; gap: 10px; }
.ex-title i { color: var(--primary); }
.ex-warn {
  display: flex; align-items: flex-start; gap: 10px; padding: 12px 14px; margin-bottom: 18px;
  border-radius: 8px; background: #fffbeb; border: 1px solid #fde68a; color: #92400e;
  font-size: 12.5px; line-height: 1.75;
}
.ex-rules { margin: 0 0 22px; padding-left: 20px; font-size: 13px; line-height: 2.1; color: #4b5563; }
.ex-start { width: 100%; justify-content: center; }
.ex-hint { margin-top: 12px; font-size: 11.5px; color: #9ca3af; line-height: 1.8; }

.ex-bar {
  display: flex; align-items: center; gap: 18px; flex-wrap: wrap;
  padding: 10px 18px; margin-bottom: 14px; border-radius: 10px;
  background: #fff; border: 1px solid var(--border);
  position: sticky; top: 60px; z-index: 30;
  /* 与训练工作台同一基准宽度，宽屏下不横满屏 */
  max-width: 1400px; margin-left: auto; margin-right: auto;
}
.ex-timer { font-size: 16px; font-weight: 700; color: #1f2937; font-variant-numeric: tabular-nums; display: inline-flex; align-items: center; gap: 6px; }
.ex-timer.is-urgent { color: #dc2626; }
.ex-meta { font-size: 12.5px; color: #6b7280; }
.ex-leave { font-size: 12px; color: #b45309; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 3px 9px; }
/* 在线/现场考试方式 + 自动保存状态（O1/O2 的可视化） */
.ex-mode { font-size: 12px; color: #4b5563; display: inline-flex; align-items: center; gap: 5px; }
.ex-mode i { color: #9ca3af; font-size: 11.5px; }
.ex-saved { font-size: 11.5px; color: #15803d; display: inline-flex; align-items: center; gap: 5px; }
.ex-takenover {
  max-width: 1400px; margin: 0 auto 12px;
  display: flex; align-items: center; gap: 8px;
  padding: 9px 14px; border-radius: 8px; font-size: 12.5px;
  color: #92400e; background: #fffbeb; border: 1px solid #fde68a;
}
.ex-locked {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 14px; margin-bottom: 12px; border-radius: 8px;
  font-size: 12.5px; color: #92400e; background: #fffbeb; border: 1px solid #fde68a;
}
.ex-bar .btn { margin-left: auto; }
.ex-main { display: flex; flex-direction: column; gap: 16px; max-width: 1400px; margin: 0 auto; }

.ex-scores { display: flex; flex-direction: column; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
.ex-score-row { display: flex; align-items: center; gap: 12px; padding: 10px 14px; border-bottom: 1px solid #f5f7fa; font-size: 13px; }
.ex-score-row:last-child { border-bottom: none; }
.ex-score-idx { width: 20px; color: #9ca3af; font-size: 12px; }
.ex-score-title { flex: 1; min-width: 0; }
.ex-score-val { font-weight: 700; color: var(--primary); font-variant-numeric: tabular-nums; }
.ex-pass { display: inline-flex; align-items: center; gap: 4px; font-size: 11.5px; border-radius: 8px; padding: 2px 8px; }
.ex-pass.is-ok { color: #15803d; background: #dcfce7; }
.ex-pass.is-no { color: #b91c1c; background: #fee2e2; }
</style>
