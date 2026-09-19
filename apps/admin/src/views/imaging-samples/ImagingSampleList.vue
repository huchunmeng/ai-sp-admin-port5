<template>
  <div class="content-container">
    <!-- 筛选 -->
    <div class="card mb-4">
      <div class="filter-row">
        <div class="filter-item" style="min-width:200px">
          <label>搜索</label>
          <input class="input" placeholder="病例标题 / 编号" v-model="filters.keyword">
        </div>
        <div class="filter-item">
          <label>检查部位</label>
          <select class="select" v-model="filters.bodyPart"><option value="">全部</option><option v-for="p in BODY_PARTS" :key="p" :value="p">{{ p }}</option></select>
        </div>
        <div class="filter-item">
          <label>模态</label>
          <select class="select" v-model="filters.modality"><option value="">全部</option><option v-for="m in MODALITIES" :key="m" :value="m">{{ m }}</option></select>
        </div>
        <div class="filter-item">
          <label>难度</label>
          <select class="select" v-model="filters.level"><option value="">全部</option><option v-for="l in TRAINING_LEVELS" :key="l.value" :value="l.value">{{ l.value }} · {{ getCaseLevelLabel(l.value) }}</option></select>
        </div>
        <div class="filter-item">
          <label>可评分区间</label>
          <select class="select" v-model="filters.scoreBand"><option value="">全部</option><option value="full">可评满分（100）</option><option value="high">85 – 99</option><option value="low">低于 85（考不满）</option></select>
        </div>
        <div class="filter-item">
          <label>金标准</label>
          <select class="select" v-model="filters.gold"><option value="">全部</option><option value="recorded">金标准已录</option><option value="missing">缺金标准</option></select>
        </div>
        <div class="filter-item">
          <label>状态</label>
          <select class="select" v-model="filters.status"><option value="">全部</option><option v-for="(v, k) in SAMPLE_STATUS" :key="k" :value="k">{{ v.label }}</option></select>
        </div>
        <div class="filter-item" style="flex:0 0 auto;min-width:0">
          <label>&nbsp;</label>
          <div class="flex gap-2"><button class="btn btn-primary" @click="currentPage = 1">搜索</button><button class="btn" @click="handleReset">重置</button></div>
        </div>
      </div>
    </div>

    <!-- 操作条 -->
    <div class="flex items-center justify-between mb-4">
      <div class="flex gap-2">
        <button class="btn" :disabled="!selectedRows.length" @click="batchSetStatus('published')">批量启用</button>
        <button class="btn" :disabled="!selectedRows.length" @click="batchSetStatus('disabled')">批量停用</button>
      </div>
      <div class="flex gap-2">
        <button class="btn btn-primary" @click="createSample">+ 新建病例</button>
        <button class="btn" @click="refresh">刷新列表</button>
      </div>
    </div>

    <!-- 列表 -->
    <div v-if="!rows.length" class="empty-state">
      <div style="margin-bottom:12px">题库暂无条目</div>
      <button class="btn btn-primary" @click="createSample">+ 新建病例</button>
    </div>
    <div v-else-if="!filtered.length" class="empty-state">暂无匹配的影像病例</div>

    <template v-else>
      <div class="card" style="padding:0">
        <div class="table-wrapper">
          <table class="table">
            <thead>
              <tr>
                <th class="sticky-left" style="left:0;width:40px"><input type="checkbox" :checked="selectAll" @change="toggleSelectAll"></th>
                <th class="sticky-left" style="left:40px;width:64px">缩略图</th>
                <th>病例标题</th>
                <th>部位 · 模态</th>
                <th>难度</th>
                <th style="cursor:pointer;white-space:nowrap" @click="toggleScoreSort">
                  可评分 {{ filters.sort === 'scoreAsc' ? '↑' : '' }}
                </th>
                <th>能力位</th>
                <th>金标准</th>
                <th>状态</th>
                <th>最近更新</th>
                <th class="sticky-right" style="right:0;min-width:230px">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in paginatedData" :key="item.id">
                <td class="sticky-left" style="left:0"><input type="checkbox" v-model="selectedRows" :value="item.id"></td>
                <td class="sticky-left" style="left:40px">
                  <div class="is-thumb" :title="'影像待接入 · 轴位首层'">
                    <i class="fa-solid" :class="item.icon || 'fa-image'"></i>
                  </div>
                </td>
                <td>
                  <a href="#" @click.prevent="editSample(item)" style="color:var(--primary);text-decoration:none">{{ item.title }}</a>
                  <div class="text-secondary" style="font-size:12px;margin-top:2px">
                    <code style="background:#F5F7FA;padding:1px 6px;border-radius:4px">{{ item.id }}</code>
                    <span style="margin-left:6px">v{{ item.version }}</span>
                  </div>
                </td>
                <td>{{ item.bodyPart }} · {{ item.modality }}</td>
                <td><span class="badge" :class="CASE_LEVEL_BADGE_CLASS[levelKey(item.level)]">{{ getCaseLevelLabel(item.level) || '—' }}</span></td>
                <td>
                  <span :class="item.scoreableMax >= 85 ? 'text-primary' : 'text-warning'" style="font-weight:600">{{ item.scoreableMax }}</span>
                  <span class="text-secondary"> / 100</span>
                </td>
                <td><span class="is-cap-list"><span v-for="f in CAPABILITY_FIELDS" :key="f.key" class="badge" :class="item.capabilities[f.key] ? 'badge-success' : 'badge-info'" :title="capTitle(f, item)">{{ f.short }}</span></span></td>
                <td><span class="badge" :class="item.goldStandardRecorded ? 'badge-success' : 'badge-warning'">{{ item.goldStandardRecorded ? '金标准已录' : '缺金标准' }}</span></td>
                <td><span class="badge" :class="SAMPLE_STATUS[item.status].badge">{{ SAMPLE_STATUS[item.status].label }}</span></td>
                <td>
                  <div>{{ item.updatedAt }}</div>
                  <div class="text-secondary" style="font-size:12px">{{ item.updatedBy }}</div>
                </td>
                <td class="sticky-right" style="right:0">
                  <div class="flex gap-2">
                    <button class="btn btn-sm" @click="editSample(item)">编辑</button>
                    <button class="btn btn-sm" @click="copySample(item)">复制</button>
                    <button class="btn btn-sm" @click="showDerived(item)">查看派生</button>
                    <button v-if="item.status !== 'disabled'" class="btn btn-sm btn-danger" @click="disableSample(item)">停用</button>
                    <button v-else class="btn btn-sm" @click="enableSample(item)">启用</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="flex items-center justify-between mt-4">
        <div class="text-secondary">共 {{ filtered.length }} 条记录</div>
        <div class="flex gap-2">
          <button class="btn btn-sm" :disabled="currentPage === 1" @click="currentPage--">上一页</button>
          <span class="flex items-center px-3">{{ currentPage }} / {{ totalPages }}</span>
          <button class="btn btn-sm" :disabled="currentPage === totalPages" @click="currentPage++">下一页</button>
          <select class="select" style="width:100px" v-model="pageSize"><option :value="10">10条/页</option><option :value="20">20条/页</option><option :value="50">50条/页</option></select>
        </div>
      </div>
    </template>

    <!-- 查看派生：该样本落空的不可评条目（PRD §5.12.2 操作列） -->
    <div v-if="derivedSample" class="modal-overlay" @click.self="derivedSample = null">
      <div class="modal-container" style="width:600px">
        <div class="modal-header">
          <span style="font-weight:600">可评分 {{ derivedSample.scoreableMax }} / 100 — {{ derivedSample.title }}</span>
          <button class="modal-close" @click="derivedSample = null">✕</button>
        </div>
        <div class="text-secondary" style="font-size:12px;margin-bottom:12px">
          不可评条目的分值已从分母中剔除、<b>不按 0 分计</b>；满分为 100 的归一后得分，跨卷不可比。
        </div>
        <table class="table">
          <thead>
            <tr><th>条目</th><th>名称</th><th>分值</th><th>来源</th><th>原因</th></tr>
          </thead>
          <tbody>
            <tr v-for="l in derivedSample.lost" :key="l.code">
              <td><code style="background:#F5F7FA;padding:2px 6px;border-radius:4px">{{ l.code }}</code></td>
              <td>{{ l.label }}</td>
              <td>{{ l.score }}</td>
              <td><span class="badge" :class="l.source === 'na' ? 'badge-info' : 'badge-warning'">{{ l.source === 'na' ? '不适用 N/A' : '能力位缺失' }}</span></td>
              <td class="text-secondary" style="font-size:12px">{{ l.why }}</td>
            </tr>
            <tr v-if="!derivedSample.lost.length"><td colspan="5" style="text-align:center;padding:24px;color:var(--text-secondary)">本病例 23 条全部可评</td></tr>
          </tbody>
        </table>
        <div class="modal-footer">
          <button class="btn" @click="derivedSample = null">关闭</button>
          <button class="btn btn-primary" @click="editSample(derivedSample)">去编辑能力位</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from '@ai-sp/shared'
import { TRAINING_LEVELS, getCaseLevelLabel, LEVEL_TO_CASE_LEVEL, CASE_LEVEL_BADGE_CLASS } from '@ai-sp/shared'
import { MODALITIES, BODY_PARTS, SAMPLE_STATUS, CAPABILITY_FIELDS } from '@ai-sp/shared/imaging'
import { sampleStore, loadSamples, upsertSample, nextCopyId, now } from './store.js'

const router = useRouter()

/**
 * 本期无服务端：题库数据来自 `@ai-sp/shared/imaging` 的静态样本（界面骨架用假数据，
 * 真实样本待院方提供 —— 需求确认单 Q2）。刷新即回到初始态，改动不落库。
 * 数据放在模块级 store 里，使「列表 → 编辑器 → 返回」看到的是同一份，避免编辑后回来还是旧值。
 * 接口就绪时只换 `store.js` 的实现，本页不动。
 */
const rows = computed(() => sampleStore.rows)
const loading = ref(false)

function refresh() {
  loadSamples(true)
  selectedRows.value = []
  toast.show('列表已刷新', 'success')
}

loadSamples()

const filters = reactive({
  keyword: '', bodyPart: '', modality: '', level: '',
  scoreBand: '', gold: '', status: '', sort: 'updated'
})

const levelKey = level => LEVEL_TO_CASE_LEVEL[level] || ''

function capTitle(field, item) {
  const on = item.capabilities[field.key]
  const head = `${field.label}：${on ? '具备' : '不具备'} → ${field.hitCode}`
  return field.derived ? `${head}（由影像控件能力决定，本期只读）` : head
}

const filtered = computed(() => {
  const kw = filters.keyword.trim().toLowerCase()
  const list = rows.value.filter(item => {
    if (kw && !item.title.toLowerCase().includes(kw) && !item.id.toLowerCase().includes(kw)) return false
    if (filters.bodyPart && item.bodyPart !== filters.bodyPart) return false
    if (filters.modality && item.modality !== filters.modality) return false
    if (filters.level && item.level !== filters.level) return false
    if (filters.gold === 'recorded' && !item.goldStandardRecorded) return false
    if (filters.gold === 'missing' && item.goldStandardRecorded) return false
    if (filters.status && item.status !== filters.status) return false
    if (filters.scoreBand === 'full' && item.scoreableMax !== 100) return false
    if (filters.scoreBand === 'high' && !(item.scoreableMax >= 85 && item.scoreableMax < 100)) return false
    if (filters.scoreBand === 'low' && item.scoreableMax >= 85) return false
    return true
  })
  // 默认最近更新倒序；可切换为可评分升序（便于先找出"考不满"的病例去补能力位）
  return list.slice().sort((a, b) =>
    filters.sort === 'scoreAsc'
      ? a.scoreableMax - b.scoreableMax || a.id.localeCompare(b.id)
      : String(b.updatedAt).localeCompare(String(a.updatedAt))
  )
})

const selectedRows = ref([])
const currentPage = ref(1)
const pageSize = ref(10)
const totalPages = computed(() => Math.ceil(filtered.value.length / pageSize.value) || 1)
const paginatedData = computed(() =>
  filtered.value.slice((currentPage.value - 1) * pageSize.value, currentPage.value * pageSize.value)
)

const selectAll = computed({
  get: () => paginatedData.value.length > 0 && paginatedData.value.every(i => selectedRows.value.includes(i.id)),
  set: val => {
    if (val) paginatedData.value.forEach(i => { if (!selectedRows.value.includes(i.id)) selectedRows.value.push(i.id) })
    else selectedRows.value = selectedRows.value.filter(id => !paginatedData.value.some(i => i.id === id))
  }
})
const toggleSelectAll = () => { selectAll.value = !selectAll.value }

watch(() => ({ ...filters }), () => { currentPage.value = 1 })

function toggleScoreSort() {
  filters.sort = filters.sort === 'scoreAsc' ? 'updated' : 'scoreAsc'
}

function handleReset() {
  Object.assign(filters, { keyword: '', bodyPart: '', modality: '', level: '', scoreBand: '', gold: '', status: '', sort: 'updated' })
}

/* ── 操作 ── */

const derivedSample = ref(null)
const showDerived = item => { derivedSample.value = item }

function createSample() { router.push({ name: 'imagingSampleEditor' }) }
function editSample(item) { derivedSample.value = null; router.push({ name: 'imagingSampleEditor', params: { id: item.id } }) }

/** 复制为新病例 —— 版本重新从 1 起，状态回落草稿（PRD §5.12.8 改版不原地改） */
function copySample(item) {
  upsertSample({
    ...item,
    id: nextCopyId(item.id),
    title: `${item.title}（副本）`,
    capabilities: { ...item.capabilities },
    seriesFrames: {
      axial: (item.seriesFrames?.axial || []).slice(),
      coronal: (item.seriesFrames?.coronal || []).slice(),
      sagittal: (item.seriesFrames?.sagittal || []).slice()
    },
    goldStandard: item.goldStandard ? { ...item.goldStandard } : null,
    version: 1,
    status: 'draft',
    publishedAt: null,
    updatedAt: now(),
    updatedBy: '管理端'
  })
  toast.show('病例已复制', 'success')
}

function disableSample(item) {
  item.status = 'disabled'
  item.updatedAt = now()
  item.updatedBy = '管理端'
  toast.show('病例已停用', 'success')
}

/** 启用 = 回已发布，但「三段金标准皆非空」是发布前提（PRD §5.12.6） */
function enableSample(item) {
  if (!item.goldStandardRecorded) { toast.show('缺金标准的病例不可发布，请先录入金标准报告', 'warning'); return }
  item.status = 'published'
  item.publishedAt = now()
  item.updatedAt = now()
  item.updatedBy = '管理端'
  toast.show('病例已发布', 'success')
}

function batchSetStatus(status) {
  const picked = sampleStore.rows.filter(r => selectedRows.value.includes(r.id))
  if (status === 'published') {
    const blocked = picked.filter(r => !r.goldStandardRecorded)
    picked.filter(r => r.goldStandardRecorded).forEach(r => { r.status = 'published'; r.publishedAt = now(); r.updatedAt = now() })
    if (blocked.length) toast.show(`${blocked.length} 条缺金标准，未启用`, 'warning')
    else toast.show('已批量启用', 'success')
  } else {
    picked.forEach(r => { r.status = 'disabled'; r.updatedAt = now() })
    toast.show('已批量停用', 'success')
  }
  selectedRows.value = []
}
</script>

<style scoped>
/* 仅本页专有形态；表格 / 筛选 / 徽章 / 按钮一律走 global.css 既有类 */
.is-thumb {
  width: 44px; height: 44px; border-radius: 8px;
  background: repeating-linear-gradient(45deg, #2b2f36, #2b2f36 6px, #31353d, #31353d 12px);
  color: #8b93a1; font-size: 16px;
  display: flex; align-items: center; justify-content: center;
}
.is-cap-list { display: inline-flex; gap: 3px; }
.is-cap-list .badge { padding: 1px 5px; font-size: 10px; font-weight: 600; }
</style>
