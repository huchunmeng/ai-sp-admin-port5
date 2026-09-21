<template>
  <div class="ex-page">
    <TrainingTopBar :station-name="phase === 'intro' ? '影像报告书写 · 练习考' : '练习考进行中'" :hide-timer="true" />

    <!-- ══ 开始前：考试须知 ══ -->
    <div v-if="phase === 'intro'" class="ex-intro">
      <div class="card ex-card">
        <h2 class="ex-title"><i class="fa-solid fa-file-pen"></i> 影像报告书写 · 练习考</h2>
        <div class="ex-warn">
          <i class="fa-solid fa-triangle-exclamation"></i>
          <div>
            <b>本模式仅用于练习与形态演示，不能用于正式考核。</b>
            本期无服务端，题库（含标准报告）随前端下发，<b>题目保密做不到</b>；
            限时也以本机时间为准。正式考核需要服务端 —— 见《考核侧方案与工作量评估》。
          </div>
        </div>
        <ul class="ex-rules">
          <li><b>题量</b>：{{ paper.length || EXAM_SIZE }} 题（从可练题库随机抽取）</li>
          <li><b>时长</b>：{{ durationMin }} 分钟，到点自动交卷</li>
          <li><b>作答</b>：看影像写三段报告（临床目的与检查方法 / 影像所见 / 诊断意见）</li>
          <li><b>不提供</b>：AI伴学、参考报告对照</li>
          <li><b>离开检测</b>：切屏或离开页面会被记录次数，考试期间请留在本页</li>
        </ul>
        <button class="btn btn-primary ex-start" @click="startExam">
          <i class="fa-solid fa-play"></i> 开始考试（进入全屏）
        </button>
        <div class="ex-hint">点开始后会请求全屏；浏览器不允许时不影响作答，仅失去全屏。</div>
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
        <span v-if="leaveCount" class="ex-leave">
          <i class="fa-solid fa-eye-slash"></i> 离开记录 {{ leaveCount }} 次
        </span>
        <button class="btn btn-sm btn-primary" @click="askSubmit">交卷</button>
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
          <div class="ex-scores">
            <div v-for="(q, i) in paper" :key="q.id" class="ex-score-row">
              <span class="ex-score-idx">{{ i + 1 }}</span>
              <span class="ex-score-title">{{ studentTitleOf(q.sample) }}</span>
              <span class="ex-score-val">
                <i v-if="submitting && !resultOf(i)" class="fa-solid fa-spinner fa-spin"></i>
                <template v-else-if="resultOf(i)">{{ resultOf(i).rawTotal }} / {{ resultOf(i).scoreableMax }}</template>
                <template v-else>—</template>
              </span>
              <span v-if="resultOf(i)" class="ex-pass" :class="passed(i) ? 'is-ok' : 'is-no'">
                {{ passed(i) ? '达标' : '未达标' }}（{{ resultOf(i).level }} 线 {{ round1(resultOf(i).passLine) }} 分）
              </span>
              <span v-else class="text-secondary" style="font-size:12px">{{ submitting ? '评阅中' : '评分失败' }}</span>
              <button class="btn btn-sm" :disabled="!resultOf(i)" @click="openReport(i)">成绩报告</button>
            </div>
          </div>
          <div class="ex-hint">
            <i class="fa-solid fa-circle-info"></i>
            练习考模式<b>不提供参考报告对照</b> —— 交卷即给参考报告等于泄题给下一批。
            要对照学习请回「影像报告书写训练」再练一遍。
          </div>
          <button class="btn ex-start" style="margin-top:14px" @click="restart">
            <i class="fa-solid fa-rotate-right"></i> 再来一份
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
import { TRAINING_CASES, WRITABLE_SEGMENTS, DEIDENTIFY_ROWS, studentTitleOf } from '@ai-sp/shared/imaging'
import TrainingTopBar from '@/components/TrainingTopBar.vue'
import ImagePanel from './components/ImagePanel.vue'
import SegmentForm from './components/SegmentForm.vue'
import ScoreReportModal from './components/ScoreReportModal.vue'
import { useReportScoring } from '@/composables/useReportScoring'

/**
 * 练习考 —— 考核侧的 **A 路**（无服务端，复用训练侧资产）
 *
 * 与训练侧的差异（这就是"考"的形态）：
 *   · 限时，到点自动交卷
 *   · 进入即请求全屏 + 切屏/失焦检测并记录次数
 *   · **无 AI伴学**（也没有阅片笔记以外的辅助）
 *   · 交卷后**不给参考报告对照**（给了就是泄题）
 *
 * ⚠️ **不能用于正式考核**：题库含标准报告、随前端下发，题目保密做不到；
 *    限时以本机时间为准，改系统时间即可绕过。要正式考核必须上服务端。
 */

/* ── 可调参数 ── */
const EXAM_SIZE = 1
const DURATION_MIN = 30
const STORE_KEY = 'report_writing_exam_v1'

const EXAM_SIZE_REF = EXAM_SIZE
const durationMin = DURATION_MIN
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
const passed = i => {
  const r = resultOf(i)
  return !!(r && typeof r.passLine === 'number' && r.rawTotal >= r.passLine)
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

/* ── 断点续考：时间戳落本地，刷新不重置时钟 ── */
function persist() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({
      paperIds: paper.value.map(q => q.id),
      answers, deadline: deadline.value, leaveCount: leaveCount.value, phase: phase.value
    }))
  } catch (e) { /* 隐私模式忽略 */ }
}
function restore() {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (!raw) return false
    const s = JSON.parse(raw)
    if (s.phase !== 'exam' || !s.deadline || s.deadline < Date.now()) { localStorage.removeItem(STORE_KEY); return false }
    const ids = (s.paperIds || []).filter(id => TRAINING_CASES.some(c => c.id === id))
    if (!ids.length) return false
    paper.value = ids.map(id => {
      const sample = TRAINING_CASES.find(c => c.id === id)
      return { id, sample, title: studentTitleOf(sample) }
    })
    Object.assign(answers, s.answers || {})
    deadline.value = s.deadline
    leaveCount.value = s.leaveCount || 0
    phase.value = 'exam'
    return true
  } catch (e) { return false }
}

function drawPaper() {
  const pool = TRAINING_CASES.slice()
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  paper.value = pool.slice(0, EXAM_SIZE_REF).map(sample => ({ id: sample.id, sample, title: studentTitleOf(sample) }))
}

async function startExam() {
  if (!paper.value.length) drawPaper()
  deadline.value = Date.now() + durationMin * 60 * 1000
  phase.value = 'exam'
  now.value = Date.now()
  persist()
  // 全屏需用户手势：这里正是点击回调
  try { await document.documentElement.requestFullscreen?.() } catch (e) { /* 拒绝/不支持不影响作答 */ }
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
  try { document.exitFullscreen?.() } catch (e) { /* ignore */ }
  try { localStorage.removeItem(STORE_KEY) } catch (e) { /* ignore */ }
  for (let i = 0; i < paper.value.length; i++) {
    const q = paper.value[i]
    const res = await score({ sample: q.sample, reportText: { ...draftOf(i) } })
    if (res.ok) results[q.id] = res.result
    else toast.show(`${studentTitleOf(q.sample)} 评分失败：${res.reason || ''}`, 'error', 3000)
  }
  submitting.value = false
}
function openReport(i) { reportIndex.value = i }
function restart() {
  paper.value = []
  Object.keys(answers).forEach(k => delete answers[k])
  Object.keys(results).forEach(k => delete results[k])
  currentIndex.value = 0
  reportIndex.value = null
  submittedAt.value = ''
  leaveCount.value = 0
  phase.value = 'intro'
  drawPaper()
}

onMounted(() => {
  if (!restore()) drawPaper()
  document.addEventListener('visibilitychange', onVisible)
  window.addEventListener('blur', onBlur)
  if (phase.value === 'exam') startTick()
})
onUnmounted(() => {
  stopTick()
  document.removeEventListener('visibilitychange', onVisible)
  window.removeEventListener('blur', onBlur)
  try { document.exitFullscreen?.() } catch (e) { /* ignore */ }
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
}
.ex-timer { font-size: 16px; font-weight: 700; color: #1f2937; font-variant-numeric: tabular-nums; display: inline-flex; align-items: center; gap: 6px; }
.ex-timer.is-urgent { color: #dc2626; }
.ex-meta { font-size: 12.5px; color: #6b7280; }
.ex-leave { font-size: 12px; color: #b45309; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 3px 9px; }
.ex-bar .btn { margin-left: auto; }
.ex-main { display: flex; flex-direction: column; gap: 16px; }

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
