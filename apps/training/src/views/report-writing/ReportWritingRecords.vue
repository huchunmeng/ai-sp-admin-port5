<template>
  <div class="rwr-page">
    <div class="rwr-hero">
      <div class="rwr-hero-left">
        <h2><i class="fa-solid fa-clock-rotate-left"></i> 训练记录</h2>
      </div>
      <div class="rwr-hero-stats">
        <div class="rwr-stat"><strong>{{ records.length }}</strong><span>提交次数</span></div>
        <div class="rwr-stat"><strong>{{ caseCount }}</strong><span>练过病例</span></div>
        <div class="rwr-stat"><strong>{{ avgScore }}</strong><span>平均得分</span></div>
      </div>
    </div>

    <div class="filter-bar">
      <div class="rwr-filter-left">
        <select class="select" v-model="caseId" style="width:260px">
          <option value="">全部病例</option>
          <option v-for="c in caseOptions" :key="c.id" :value="c.id">{{ c.title }}</option>
        </select>
        <select class="select" v-model="status" style="width:130px">
          <option value="">全部状态</option>
          <option value="done">已评分</option>
          <option value="pending">评阅中</option>
          <option value="failed">评分失败</option>
        </select>
        <input class="input" v-model.trim="keyword" placeholder="搜索病例名称" style="width:180px">
      </div>
      <div class="rwr-filter-right">
        <span class="rwr-count">共 {{ filtered.length }} 条</span>
        <button class="btn btn-sm" @click="goTrain">去训练</button>
      </div>
    </div>

    <div v-if="filtered.length" class="card" style="padding:0">
      <div class="table-wrapper">
        <table class="table">
          <thead>
            <tr>
              <th style="width:150px">提交时间</th>
              <th>病例</th>
              <th style="width:150px">部位 · 模态</th>
              <th style="width:80px">难度</th>
              <th style="width:120px">得分</th>
              <th style="width:110px">轮次</th>
              <th class="sticky-right" style="right:0;width:170px">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in filtered" :key="r.id">
              <td>{{ r.submittedAt }}</td>
              <td>
                <a href="#" @click.prevent="openRecord(r)" style="color:var(--primary);text-decoration:none">{{ r.title }}</a>
                <div class="text-secondary" style="font-size:12px;margin-top:2px">
                  <code style="background:#F5F7FA;padding:1px 6px;border-radius:4px">{{ r.caseId }}</code>
                </div>
              </td>
              <td>{{ r.bodyPart }} · {{ r.modality }}</td>
              <td>{{ r.level }}</td>
              <td>
                <span v-if="r.status === 'pending'" class="text-secondary" style="font-style:italic">评阅中…</span>
                <span v-else-if="r.status === 'failed'" class="text-error">评分失败</span>
                <template v-else>
                  <span :class="r.score >= 85 ? 'text-primary' : 'text-warning'" style="font-weight:600">{{ r.score }}</span>
                  <span class="text-secondary"> / {{ r.scoreableMax }}</span>
                </template>
              </td>
              <td class="text-secondary">第 {{ r.round }} 轮</td>
              <td class="sticky-right" style="right:0">
                <div class="flex gap-2">
                  <button class="btn btn-sm" @click="openRecord(r)">成绩报告</button>
                  <button class="btn btn-sm" @click="redo(r)">重练</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-else class="empty-state">
      <i class="fa-solid fa-inbox"></i>
      <p>{{ records.length ? '暂无匹配的训练记录' : '还没有训练记录，去写一份报告吧' }}</p>
      <button v-if="!records.length" class="btn btn-primary" style="margin-top:12px" @click="goTrain">去训练</button>
    </div>

    <ScoreReportModal v-if="active"
                      :scoring="activeScoring"
                      :draft="active.draft || {}"
                      :sample="activeSample"
                      :title="active.title"
                      :submitted-at="active.submittedAt"
                      @close="active = null"
                      @edit="editActive"
                      @restart="restartActive" />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { confirm } from '@ai-sp/shared'
import { getImagingSample } from '@ai-sp/shared/imaging'
import { readPracticeRecords } from '@/composables/useReportSession'
import ScoreReportModal from './components/ScoreReportModal.vue'

const router = useRouter()

/** 记录在提交时落盘；本页每次进入重新读，保证刚提交的那条能看到 */
const records = ref(readPracticeRecords())

const caseId = ref('')
const status = ref('')
const keyword = ref('')
const active = ref(null)

const caseOptions = computed(() => {
  const map = new Map()
  records.value.forEach(r => { if (!map.has(r.caseId)) map.set(r.caseId, { id: r.caseId, title: r.title }) })
  return [...map.values()]
})

const filtered = computed(() => {
  const kw = keyword.value.toLowerCase()
  return records.value.filter(r => {
    if (caseId.value && r.caseId !== caseId.value) return false
    if (status.value && r.status !== status.value) return false
    if (kw && !`${r.title} ${r.caseId}`.toLowerCase().includes(kw)) return false
    return true
  })
})

const caseCount = computed(() => new Set(records.value.map(r => r.caseId)).size)

const avgScore = computed(() => {
  const scored = records.value.filter(r => r.status === 'done' && typeof r.score === 'number')
  if (!scored.length) return '—'
  return Math.round(scored.reduce((a, r) => a + r.score, 0) / scored.length * 10) / 10
})

/** 历史记录 → 与刚才那次一样的成绩报告弹窗（数据全部来自记录本身） */
const activeScoring = computed(() => ({
  status: active.value?.result ? 'done' : (active.value?.status === 'failed' ? 'failed' : 'idle'),
  result: active.value?.result || null,
  error: active.value?.error || '',
  attempts: 1,
  appeal: null
}))

const activeSample = computed(() => {
  if (!active.value) return { goldStandard: null, deidentify: {}, lost: [], scoreableMax: 100 }
  const raw = getImagingSample(active.value.caseId)
  return raw || { goldStandard: null, deidentify: {}, lost: [], scoreableMax: 100 }
})

function openRecord(r) { active.value = r }

function goTrain() { router.push({ name: 'reportWritingTrain' }) }

function editActive() {
  const id = active.value.caseId
  active.value = null
  router.push({ name: 'reportWritingWorkbench', params: { caseId: id } })
}

function restartActive() {
  const id = active.value.caseId
  confirm('开始新一轮？会清空该病例当前的报告与对话记录。').then(ok => {
    if (!ok) return
    resetSession(id)
    active.value = null
    router.push({ name: 'reportWritingWorkbench', params: { caseId: id } })
  }).catch(() => {})
}

/** 只清该病例的会话（不能整键删掉——那会连带清空其他病例的草稿） */
function resetSession(caseId) {
  const KEY = 'report_writing_session_v1'
  try {
    const all = JSON.parse(localStorage.getItem(KEY) || '{}')
    delete all[caseId]
    localStorage.setItem(KEY, JSON.stringify(all))
  } catch (e) { /* 忽略 */ }
}

/** 记录行上的「重练」：清掉该病例的会话后进工作台，从空白重新写 */
function redo(r) {
  confirm(`重练「${r.title}」？会清空该病例当前的报告与对话记录。`).then(ok => {
    if (!ok) return
    resetSession(r.caseId)
    active.value = null
    router.push({ name: 'reportWritingWorkbench', params: { caseId: r.caseId } })
  }).catch(() => {})
}
</script>

<style scoped>
.rwr-page { max-width: 1240px; margin: 0 auto; padding: 20px 24px 48px; }
.rwr-hero {
  display: flex; align-items: center; gap: 18px; flex-wrap: wrap;
  background: linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%);
  border: 1px solid #dbeafe; border-radius: 14px; padding: 20px 24px;
}
.rwr-hero-left { flex: 1; min-width: 240px; }
.rwr-hero-left h2 { margin: 0; font-size: 19px; font-weight: 800; color: #111827; font-family: 'SimHei','Heiti SC','Microsoft YaHei',sans-serif; }
.rwr-hero-left h2 i { color: var(--primary); margin-right: 6px; }
.rwr-hero-stats { display: flex; gap: 22px; flex-shrink: 0; }
.rwr-stat { display: flex; flex-direction: column; align-items: center; }
.rwr-stat strong { font-size: 19px; color: var(--primary); }
.rwr-stat span { font-size: 11.5px; color: #6b7280; }
.filter-bar { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin: 16px 0 14px; }
.rwr-filter-left { display: flex; gap: 8px; flex-wrap: wrap; }
.rwr-filter-right { margin-left: auto; display: flex; align-items: center; gap: 10px; }
.rwr-count { font-size: 12px; color: #9ca3af; }
</style>
