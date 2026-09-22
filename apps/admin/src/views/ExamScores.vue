<template>
  <div class="content-container">
    <div class="card mb-4" style="padding: 20px;">
      <div class="filter-row">
        <div class="filter-item" style="min-width: 220px;">
          <label>考核名称 / 考生</label>
          <input class="input" placeholder="考核名称 / 姓名 / 学号" v-model="filters.keyword" @keyup.enter="applyFilter" />
        </div>
        <div class="filter-item">
          <label>状态</label>
          <select class="select" v-model="filters.status">
            <option value="">全部</option>
            <option v-for="(s, k) in STATUS" :key="k" :value="k">{{ s.label }}</option>
          </select>
        </div>
        <div class="filter-item">
          <label>&nbsp;</label>
          <div class="flex gap-2">
            <button class="btn-primary" @click="applyFilter">搜索</button>
            <button class="btn" @click="resetFilter">重置</button>
          </div>
        </div>
      </div>
    </div>

    <div class="flex justify-between mb-4">
      <div class="text-secondary" style="font-size: 13px;">
        共 {{ filtered.length }} 条记录<span v-if="loadError" class="es-err"> · {{ loadError }}</span>
      </div>
      <button class="btn btn-sm" @click="load">刷新</button>
    </div>

    <div class="card" style="padding: 0;">
      <div class="table-wrapper">
        <table class="table">
          <thead>
            <tr>
              <th class="sticky-left">考核名称</th>
              <th>考生</th>
              <th>学号</th>
              <th>提交时间</th>
              <th style="text-align:center">题数</th>
              <th style="text-align:right">总分</th>
              <th>达标</th>
              <th>状态</th>
              <th class="sticky-right">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in paged" :key="r.key">
              <td class="sticky-left">{{ r.taskName }}</td>
              <td>{{ r.candidateName || '—' }}</td>
              <td>{{ r.candidateExamNumber || '—' }}</td>
              <td>{{ r.submittedAt ? fmt(r.submittedAt) : '—' }}</td>
              <td style="text-align:center">{{ r.caseCount || 0 }}</td>
              <td style="text-align:right" class="es-score">
                <template v-if="typeof r.finalScore === 'number'">{{ r.finalScore }} / {{ r.finalMax }}</template>
                <template v-else>—</template>
              </td>
              <td>
                <span v-if="typeof r.passed === 'boolean'" class="es-pass" :class="r.passed ? 'is-ok' : 'is-no'">
                  {{ r.passed ? '达标' : '未达标' }}（达标线 {{ r.passLine }} 分）
                </span>
                <span v-else class="text-secondary">—</span>
              </td>
              <td><span class="es-state" :class="'is-' + r.status">{{ statusLabel(r.status) }}</span></td>
              <td class="sticky-right">
                <button class="btn btn-sm" :disabled="!canDetail(r)" @click="openDetail(r)">成绩明细</button>
              </td>
            </tr>
            <tr v-if="filtered.length === 0">
              <td :colspan="9" class="text-center py-8 text-secondary">
                {{ loading ? '加载中…' : '暂无成绩记录' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="flex items-center justify-between mt-4">
      <div class="text-secondary">共 {{ filtered.length }} 条记录</div>
      <div class="flex gap-2 items-center">
        <button class="btn btn-sm" :disabled="currentPage <= 1" @click="currentPage--">上一页</button>
        <span class="px-3">{{ currentPage }} / {{ totalPages }}</span>
        <button class="btn btn-sm" :disabled="currentPage >= totalPages" @click="currentPage++">下一页</button>
        <select class="select" style="width: auto;" v-model.number="pageSize" @change="currentPage = 1">
          <option :value="10">10 条/页</option>
          <option :value="20">20 条/页</option>
          <option :value="50">50 条/页</option>
        </select>
      </div>
    </div>

    <!-- 成绩明细：复用考核侧成绩报告弹窗，**一律 hide-compare**（红线 R1：不给参考报告对照） -->
    <ScoreReportModal v-if="detail"
                      :scoring="detail.scoring"
                      :draft="detail.draft"
                      :sample="detail.sample"
                      :title="detail.title"
                      :submitted-at="detail.submittedAt"
                      hide-compare
                      @close="detail = null"
                      @score="() => {}" />
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { toast } from '@ai-sp/shared'
import { getImagingSample, studentTitleOf } from '@ai-sp/shared/imaging'
import { ScoreReportModal, examApi } from '@ai-sp/shared/imaging-ui'

/**
 * 成绩管理（管理端）—— 影像报告书写考核的成绩台账 + 逐要点明细
 *
 * 数据来源是**考核服务**（`services/exam-api`），不是本地文件：
 *   · `GET /api/exam/tasks`  拿任务与**派发名单**
 *   · `GET /api/exam/scores` 拿成绩扁平行（含未交卷的会话）
 *   · 二者 join：名单里有、但还没有会话的考生 → 补成「未开始」行
 *     （服务端不替页面造行，否则分不清"没人考"和"考了没交"）
 *
 * 红线 R1：明细弹窗 hide-compare，页面不出现金标准/参考报告。
 */

const STATUS = {
  notStarted: { label: '未开始' },
  inProgress: { label: '作答中' },
  expired: { label: '已过期' },
  pending: { label: '评阅中' },
  grading: { label: '评阅中' },
  done: { label: '已交卷' },
  failed: { label: '评阅失败' }
}

const tasks = ref([])
const scoreRows = ref([])
const loading = ref(false)
const loadError = ref('')
const detail = ref(null)

const filters = reactive({ keyword: '', status: '' })
const applied = reactive({ keyword: '', status: '' })
const currentPage = ref(1)
const pageSize = ref(10)

function statusLabel(s) { return (STATUS[s] && STATUS[s].label) || s || '—' }
function fmt(s) { return String(s).slice(0, 16).replace('T', ' ') || '—' }

/** 任务名单 × 成绩会话 → 台账行 */
const joined = computed(() => {
  const rows = scoreRows.value.map(r => ({
    key: r.sessionId,
    sessionId: r.sessionId,
    taskId: r.taskId,
    taskName: r.taskName || r.taskId,
    candidateId: r.candidateId || '',
    candidateExamNumber: r.candidateExamNumber || '',
    candidateName: r.candidateName || '',
    status: r.status || 'inProgress',
    submittedAt: r.submittedAt || '',
    caseCount: r.caseCount || (r.caseIds || []).length,
    finalScore: r.finalScore,
    finalMax: r.finalMax,
    passLine: r.passLine,
    passed: r.passed
  }))
  const have = new Set(rows.map(r => `${r.taskId}::${r.candidateExamNumber}`))
  for (const t of tasks.value) {
    for (const c of (t.candidates || [])) {
      const no = String(c.examNumber || c.id || '')
      const k = `${t.id}::${no}`
      if (have.has(k)) continue
      have.add(k)
      rows.push({
        key: k, sessionId: '', taskId: t.id, taskName: t.name,
        candidateId: no, candidateExamNumber: no, candidateName: c.name || '',
        status: 'notStarted', submittedAt: '',
        caseCount: (t.caseIds || []).length,
        finalScore: null, finalMax: null, passLine: null, passed: null
      })
    }
  }
  return rows
})

const filtered = computed(() => {
  const kw = applied.keyword.trim().toLowerCase()
  return joined.value.filter(r => {
    if (applied.status && r.status !== applied.status) return false
    if (!kw) return true
    return String(r.taskName).toLowerCase().includes(kw) ||
      String(r.candidateName).toLowerCase().includes(kw) ||
      String(r.candidateExamNumber).toLowerCase().includes(kw)
  })
})

const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize.value)))
const paged = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filtered.value.slice(start, start + pageSize.value)
})

function applyFilter() { applied.keyword = filters.keyword; applied.status = filters.status; currentPage.value = 1 }
function resetFilter() { filters.keyword = ''; filters.status = ''; applyFilter() }
function canDetail(r) { return !!(r.sessionId && typeof r.finalScore === 'number') }

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    /* 注意：examApi.scores() 直接返回数组（失败为 null），与 tasks() 的 {server, tasks} 形状不同 */
    const t = await examApi.tasks()
    const s = await examApi.scores()
    if (!t.server || !Array.isArray(s)) {
      tasks.value = []
      scoreRows.value = []
      loadError.value = '考核服务不可达'
      return
    }
    tasks.value = t.tasks || []
    scoreRows.value = s
  } catch (e) {
    loadError.value = '考核服务不可达'
  } finally {
    loading.value = false
  }
}

async function openDetail(row) {
  const remote = await examApi.sessionOf(row.taskId, row.candidateId)
  if (!remote || !remote.session) { toast.show('未取到该考生答卷', 'warning'); return }
  const sess = remote.session
  const results = (remote.score && remote.score.results) || {}
  const answers = sess.answers || {}
  const caseId = Object.keys(answers)[0] || Object.keys(results)[0] || (row.caseIds || [])[0]
  const result = results[caseId]
  if (!result) { toast.show('该考生尚未出分或评阅失败', 'warning'); return }
  const sample = getImagingSample(caseId) || {}
  detail.value = {
    scoring: { status: 'done', result, error: '', attempts: 1, appeal: null },
    draft: answers[caseId] || {},
    sample,
    title: studentTitleOf(sample),
    submittedAt: fmt(sess.submittedAt)
  }
}

onMounted(load)
</script>

<style scoped>
.es-err { color: #b45309; }
.es-score { font-variant-numeric: tabular-nums; font-weight: 600; }
.es-pass { font-size: 11.5px; border-radius: 8px; padding: 2px 8px; }
.es-pass.is-ok { color: #15803d; background: #dcfce7; }
.es-pass.is-no { color: #b91c1c; background: #fee2e2; }
.es-state { font-size: 11.5px; border-radius: 8px; padding: 2px 8px; }
.es-state.is-notStarted { color: #475569; background: #f1f5f9; }
.es-state.is-inProgress { color: #b45309; background: #fef3c7; }
.es-state.is-expired { color: #6b7280; background: #f3f4f6; }
.es-state.is-pending,
.es-state.is-grading { color: #1d4ed8; background: #dbeafe; }
.es-state.is-done { color: #15803d; background: #dcfce7; }
.es-state.is-failed { color: #b91c1c; background: #fee2e2; }
</style>
