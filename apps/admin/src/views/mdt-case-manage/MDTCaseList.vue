<template>
  <div class="content-container">
    <div class="card mb-4">
      <div class="filter-row">
        <div class="filter-item" style="min-width:220px"><label>搜索</label><input class="input" placeholder="病例名称 / 病历号 / 患者" v-model="filters.keyword" @input="handleSearch"></div>
        <div class="filter-item"><label>难度</label><select class="select" v-model="filters.levelLabel" @change="handleSearch"><option value="">全部</option><option v-for="l in LEVEL_LABELS" :value="l">{{ l }}</option></select></div>
        <div class="filter-item"><label>来源方式</label><select class="select" v-model="filters.sourceType" @change="handleSearch"><option value="">全部</option><option v-for="(m, t) in SOURCE_META" :value="t">{{ m.label }}</option></select></div>
        <div class="filter-item" style="min-width:180px"><label>参与学科</label><select class="select" v-model="filters.discipline" @change="handleSearch"><option value="">全部</option><option v-for="d in disciplineOptions" :value="d">{{ d }}</option></select></div>
        <div class="filter-item"><label>&nbsp;</label><div class="flex gap-2"><button class="btn" @click="handleReset">重置</button></div></div>
      </div>
    </div>

    <div class="flex items-center justify-between mb-4">
      <div class="text-secondary">共 {{ filteredData.length }} 个 MDT 病例</div>
      <div class="flex gap-2">
        <button class="btn" @click="loadCases" :disabled="loading">刷新列表</button>
        <button class="btn btn-primary" @click="createCase">+ 新增 MDT 病例</button>
      </div>
    </div>

    <div class="card" style="padding:0">
      <div class="table-wrapper">
        <table class="table">
          <thead>
            <tr>
              <th>病例名称</th>
              <th>患者</th>
              <th>参与学科</th>
              <th>难度</th>
              <th>来源方式</th>
              <th>更新时间</th>
              <th style="min-width:150px">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in paginatedData" :key="c.id">
              <td>
                <a class="record-link" @click="viewCase(c)">{{ c.name || c.id }}</a>
                <div class="text-secondary" style="font-size:12px">{{ c.sourceRecordId || '手动创建' }}</div>
              </td>
              <td>{{ c.patientName || '—' }}</td>
              <td>
                <span v-for="d in c.disciplines" :key="d" class="badge badge-info" style="margin-right:4px">{{ d }}</span>
              </td>
              <td><span class="badge" :class="levelBadge(c.levelLabel)">{{ c.levelLabel || '—' }}</span></td>
              <td><span class="badge" :class="sourceBadge(c.sourceType)">{{ sourceLabel(c.sourceType) }}</span></td>
              <td>{{ formatDate(c.updatedAt) }}</td>
              <td>
                <div class="flex gap-2">
                  <button class="btn btn-sm" @click="viewCase(c)">查看</button>
                  <button class="btn btn-sm" @click="editCase(c)">编辑</button>
                  <button class="btn btn-sm btn-danger" @click="deleteCase(c)">删除</button>
                </div>
              </td>
            </tr>
            <tr v-if="!loading && filteredData.length === 0">
              <td colspan="7" style="text-align:center;padding:40px;color:var(--text-secondary)">暂无匹配的 MDT 病例</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="flex items-center justify-between mt-4">
      <div class="text-secondary">共 {{ filteredData.length }} 条记录</div>
      <div class="flex gap-2">
        <button class="btn btn-sm" :disabled="currentPage === 1" @click="currentPage--">上一页</button>
        <span class="flex items-center px-3">{{ currentPage }} / {{ totalPages }}</span>
        <button class="btn btn-sm" :disabled="currentPage === totalPages" @click="currentPage++">下一页</button>
        <select class="select" style="width:100px" v-model="pageSize"><option :value="10">10条/页</option><option :value="20">20条/页</option><option :value="50">50条/页</option></select>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { toast, confirm } from '@ai-sp/shared'
import { MDT_DISCIPLINES, LEVEL_LABELS } from './shared.js'

const router = useRouter()
const cases = ref([])
const loading = ref(false)

// 单份入院摘要转换出记录的 8 份素材：绑定它们的 MDT 病例在列表中置后（稳定排序，仅整体后移）
const CONVERTED_SRC_IDS = new Set([
  'ZY010101453782', 'ZY010101478088', 'ZY010101620094', 'ZY010101602948',
  'ZY020101577826', 'ZY020101721441', 'ZY030101718668', 'ZY040101362766'
])

const SOURCE_META = {
  ai: { label: '系统内自建', badge: 'badge-info' },
  raw: { label: '基于原始病历', badge: 'badge-success' },
  manual: { label: '作者手动输入', badge: 'badge-warning' }
}

const sourceLabel = (t) => (SOURCE_META[t] || SOURCE_META.manual).label
const sourceBadge = (t) => (SOURCE_META[t] || SOURCE_META.manual).badge

const levelBadge = (level) => {
  if (level === '基础病例') return 'badge-info'
  if (level === '高阶病例') return 'badge-success'
  if (level === '疑难病例') return 'badge-error'
  return ''
}

const formatDate = (d) => d ? String(d).slice(0, 16).replace('T', ' ') : '—'

async function loadCases() {
  loading.value = true
  try {
    const res = await fetch('/api/mdt-cases')
    const list = res.ok ? await res.json() : []
    cases.value = [...list].sort((a, b) =>
      (CONVERTED_SRC_IDS.has(a.sourceRecordId) ? 1 : 0) - (CONVERTED_SRC_IDS.has(b.sourceRecordId) ? 1 : 0)
    )
  } catch (e) {
    cases.value = []
  }
  loading.value = false
}

// ── 搜索 / 筛选 / 分页 ──

const filters = reactive({ keyword: '', levelLabel: '', sourceType: '', discipline: '' })
const currentPage = ref(1)
const pageSize = ref(10)

// 学科下拉 = 预置学科 + 现有病例实际出现学科（含导入病例的非标准学科）
const disciplineOptions = computed(() => {
  const set = new Set(MDT_DISCIPLINES)
  cases.value.forEach(c => (c.disciplines || []).forEach(d => set.add(d)))
  return [...set].sort()
})

const filteredData = computed(() => {
  const kw = filters.keyword.trim().toLowerCase()
  return cases.value.filter(c => {
    if (kw) {
      const hay = [c.name, c.sourceRecordId, c.patientName].filter(Boolean).join(' ').toLowerCase()
      if (!hay.includes(kw)) return false
    }
    if (filters.levelLabel && c.levelLabel !== filters.levelLabel) return false
    if (filters.sourceType && c.sourceType !== filters.sourceType) return false
    if (filters.discipline && !(c.disciplines || []).includes(filters.discipline)) return false
    return true
  })
})

const totalPages = computed(() => Math.ceil(filteredData.value.length / pageSize.value) || 1)
const paginatedData = computed(() =>
  filteredData.value.slice((currentPage.value - 1) * pageSize.value, currentPage.value * pageSize.value)
)

watch(() => ({ ...filters }), () => { currentPage.value = 1 })
const handleSearch = () => { currentPage.value = 1 }
const handleReset = () => { Object.keys(filters).forEach(k => filters[k] = ''); currentPage.value = 1 }

// ── 操作 ──

function createCase() {
  router.push({ name: 'mdtCaseEditor' })
}

function viewCase(c) {
  router.push({ name: 'mdtCaseView', params: { mdtId: c.id } })
}

function editCase(c) {
  router.push({ name: 'mdtCaseEditor', params: { mdtId: c.id } })
}

function deleteCase(c) {
  confirm(`确定删除 MDT 病例「${c.patientName || c.id}」吗？此操作不可恢复。`).then(async ok => {
    if (!ok) return
    await fetch(`/api/mdt-cases/${c.id}`, { method: 'DELETE' })
    toast.show('已删除', 'success')
    loadCases()
  }).catch(() => {})
}

onMounted(loadCases)
</script>

<style scoped>
.record-link {
  color: var(--primary); font-weight: 500; cursor: pointer; font-size: 13px;
}
.record-link:hover { text-decoration: underline; }
</style>
