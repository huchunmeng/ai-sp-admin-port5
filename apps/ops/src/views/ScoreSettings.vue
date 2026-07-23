<template>
  <div class="content-container">
    <div class="card mb-4" style="padding:16px 20px">
      <div class="filter-row">
        <div class="filter-item" style="min-width:200px">
          <label>搜索</label>
          <input class="input" placeholder="评分表名称 / 编码" v-model="filters.keyword" @keyup.enter="handleSearch">
        </div>
        <div class="filter-item">
          <label>专业</label>
          <select class="select" v-model="filters.specialty">
            <option value="">全部</option>
            <option v-for="s in specialties" :key="s" :value="s">{{ s }}</option>
          </select>
        </div>
        <div class="filter-item">
          <label>状态</label>
          <select class="select" v-model="filters.status">
            <option value="">全部</option>
            <option v-for="s in statusOptions" :key="s" :value="s">{{ s }}</option>
          </select>
        </div>
        <div class="filter-item">
          <label>来源机构</label>
          <select class="select" v-model="filters.institution">
            <option value="">全部</option>
            <option v-for="inst in allInstitutions" :key="inst" :value="inst">{{ inst }}</option>
          </select>
        </div>
        <div class="filter-item">
          <label>&nbsp;</label>
          <div class="flex gap-2">
            <button class="btn btn-primary" @click="handleSearch">搜索</button>
            <button class="btn" @click="handleReset">重置</button>
          </div>
        </div>
      </div>
    </div>

    <div class="flex items-center justify-between mb-4">
      <div class="flex gap-2">
        <button class="btn" v-if="selectedRows.length > 0" @click="batchEnable" data-reviewable="批量启用">批量启用</button>
        <button class="btn" v-if="selectedRows.length > 0" @click="batchDisable" data-reviewable="批量禁用">批量禁用</button>
        <button class="btn btn-danger" v-if="selectedRows.length > 0" @click="batchDelete" data-reviewable="批量删除">批量删除</button>
        <span v-if="selectedRows.length === 0" class="text-secondary" style="font-size:13px;padding:6px 0">请勾选评分表以进行批量操作</span>
      </div>
      <div class="flex gap-2 relative">
        <button class="btn btn-primary" @click="createTemplate">+ 新建评分表</button>
        <button class="btn" @click="exportList">导出列表</button>
        <div style="position:relative">
          <button class="btn btn-icon" @click="showColumnSettings = !showColumnSettings">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H5.78a1.65 1.65 0 0 0-1.51 1 1.65 1.65 0 0 0 .33 1.82l.04.04A10 10 0 0 0 12 17.66a10 10 0 0 0 6.36-2.62l.04-.04z"/>
            </svg>
          </button>
          <div v-if="showColumnSettings" class="column-settings-panel">
            <div class="flex justify-between items-center mb-3">
              <span style="font-weight:500">列显示设置</span>
              <button class="btn btn-sm" @click="resetColumnSettings">重置</button>
            </div>
            <div v-for="col in allColumns" :key="col.key" class="flex items-center gap-2 mb-2">
              <input type="checkbox" :value="col.key" v-model="visibleColumns" style="width:16px;height:16px">
              <span>{{ col.label }}</span>
            </div>
            <button class="btn btn-primary w-full mt-3" @click="showColumnSettings = false">确定</button>
          </div>
        </div>
      </div>
    </div>

    <div class="card" style="padding:0">
      <div class="table-wrapper">
        <table class="table">
          <thead>
            <tr>
              <th class="sticky-left" style="left:0; width:40px; z-index:4">
                <input type="checkbox" :checked="selectAll" @change="toggleSelectAll">
              </th>
              <th class="sticky-left" style="left:40px; z-index:4" v-if="visibleColumns.includes('template_code')">评分表编码</th>
              <th v-if="visibleColumns.includes('template_name')">评分表名称</th>
              <th v-if="visibleColumns.includes('specialty')">专业</th>
              <th v-if="visibleColumns.includes('status')">状态</th>
              <th v-if="visibleColumns.includes('institution')">来源机构</th>
              <th v-if="visibleColumns.includes('creator_name')">创建人</th>
              <th v-if="visibleColumns.includes('created_at')">创建时间</th>
              <th v-if="visibleColumns.includes('updated_at')">更新时间</th>
              <th v-if="visibleColumns.includes('usage_count')" style="text-align:center">引用次数</th>
              <th style="text-align:center">启用状态</th>
              <th class="sticky-right" style="right:0; min-width:170px; z-index:4">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in paginatedData" :key="item.id">
              <td class="sticky-left" style="left:0">
                <input type="checkbox" v-model="selectedRows" :value="item.id">
              </td>
              <td class="sticky-left" style="left:40px" v-if="visibleColumns.includes('template_code')">
                <code style="background:#f3f4f6;padding:2px 6px;border-radius:4px">{{ item.template_code }}</code>
              </td>
              <td v-if="visibleColumns.includes('template_name')">
                <a href="#" @click.prevent="editTemplate(item)" style="color:var(--primary);text-decoration:none">{{ item.template_name }}</a>
              </td>
              <td v-if="visibleColumns.includes('specialty')">{{ item.specialty }}</td>
              <td v-if="visibleColumns.includes('status')">
                <span class="badge" :class="statusBadgeClass(item.status)">{{ item.status }}</span>
              </td>
              <td v-if="visibleColumns.includes('institution')">{{ item.institution }}</td>
              <td v-if="visibleColumns.includes('creator_name')">{{ item.creator_name }}</td>
              <td v-if="visibleColumns.includes('created_at')">{{ item.created_at }}</td>
              <td v-if="visibleColumns.includes('updated_at')">{{ item.updated_at }}</td>
              <td v-if="visibleColumns.includes('usage_count')" style="text-align:center">
                <span :style="{
                  display:'inline-flex',alignItems:'center',gap:'4px',
                  background: item.usage_count > 0 ? '#f0f7ff' : '#f9fafb',
                  color: item.usage_count > 0 ? 'var(--primary)' : 'var(--text-tertiary)',
                  padding:'2px 10px', borderRadius:'12px', fontSize:'13px', fontWeight: item.usage_count > 0 ? '600' : '400'
                }">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                  </svg>
                  {{ item.usage_count }}
                </span>
              </td>
              <td style="text-align:center">
                <label class="switch" :class="{ 'switch-disabled': item.status === '草稿' || item.status === '已归档' }">
                  <input type="checkbox"
                    :checked="item.enabled"
                    :disabled="item.status === '草稿' || item.status === '已归档'"
                    @change="toggleEnabled(item)">
                  <span class="slider"></span>
                </label>
              </td>
              <td class="sticky-right" style="right:0">
                <div class="flex gap-2" style="justify-content:flex-end">
                  <button class="btn btn-sm" @click="editTemplate(item)">编辑</button>
                  <button class="btn btn-sm" @click="copyTemplate(item)" title="复制评分表">复制</button>
                  <button class="btn btn-sm btn-danger" @click="deleteTemplate(item)">删除</button>
                </div>
              </td>
            </tr>
            <tr v-if="filteredData.length === 0">
              <td :colspan="visibleColumns.length + 3" style="text-align:center;padding:40px;color:var(--text-secondary)">
                暂无数据
              </td>
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
        <select class="select" style="width:100px" v-model="pageSize">
          <option :value="10">10条/页</option>
          <option :value="20">20条/页</option>
          <option :value="50">50条/页</option>
        </select>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { confirm, toast } from '@ai-sp/shared'

const filters = reactive({
  keyword: '', specialty: '', status: '', institution: ''
})

const specialties = ['内科', '外科', '儿科', '妇产科', '急诊科', '全科']
const statusOptions = ['草稿', '已发布', '已停用', '已归档']
const allInstitutions = ['仁爱医院', '华西医院', '中山医院', '协和医院', '同济医院', '省立医院']

const mockData = () => [
  { id: 1, template_code: 'TPL-001', template_name: '内科问诊评分表', specialty: '内科', status: '已发布', institution: '仁爱医院', creator_name: '张主任', created_at: '2026-02-10 09:30', updated_at: '2026-03-15 14:20', usage_count: 156, enabled: true },
  { id: 2, template_code: 'TPL-005', template_name: '外科体格检查评分表', specialty: '外科', status: '已发布', institution: '华西医院', creator_name: '李医师', created_at: '2026-01-18 11:15', updated_at: '2026-03-01 10:00', usage_count: 89, enabled: true },
  { id: 3, template_code: 'TPL-012', template_name: '儿科急诊评分表', specialty: '儿科', status: '草稿', institution: '中山医院', creator_name: '王医生', created_at: '2026-04-01 08:45', updated_at: '2026-04-10 16:30', usage_count: 0, enabled: true },
  { id: 4, template_code: 'TPL-008', template_name: '妇产科常规评分表', specialty: '妇产科', status: '已停用', institution: '协和医院', creator_name: '赵教授', created_at: '2025-11-20 13:20', updated_at: '2026-02-28 09:10', usage_count: 234, enabled: false },
  { id: 5, template_code: 'TPL-023', template_name: '全科综合能力评分表', specialty: '全科', status: '已发布', institution: '同济医院', creator_name: '陈医师', created_at: '2026-03-22 10:30', updated_at: '2026-03-22 10:30', usage_count: 12, enabled: true },
  { id: 6, template_code: 'TPL-019', template_name: '急诊科抢救流程评分表', specialty: '急诊科', status: '已归档', institution: '省立医院', creator_name: '刘主任', created_at: '2025-09-05 14:00', updated_at: '2026-01-10 11:20', usage_count: 67, enabled: false }
]

const allData = ref(mockData())
const selectedRows = ref([])
const currentPage = ref(1)
const pageSize = ref(10)

const allColumns = [
  { key: 'template_code', label: '评分表编码' },
  { key: 'template_name', label: '评分表名称' },
  { key: 'specialty', label: '专业' },
  { key: 'status', label: '状态' },
  { key: 'institution', label: '来源机构' },
  { key: 'creator_name', label: '创建人' },
  { key: 'created_at', label: '创建时间' },
  { key: 'updated_at', label: '更新时间' },
  { key: 'usage_count', label: '引用次数' }
]

const visibleColumns = ref(allColumns.map(c => c.key))
const showColumnSettings = ref(false)
const resetColumnSettings = () => { visibleColumns.value = allColumns.map(c => c.key) }

const filteredData = computed(() => allData.value.filter(item => {
  if (filters.keyword && !item.template_name.includes(filters.keyword) && !item.template_code.includes(filters.keyword)) return false
  if (filters.specialty && item.specialty !== filters.specialty) return false
  if (filters.status && item.status !== filters.status) return false
  if (filters.institution && item.institution !== filters.institution) return false
  return true
}))

const totalPages = computed(() => Math.ceil(filteredData.value.length / pageSize.value) || 1)
const paginatedData = computed(() =>
  filteredData.value.slice((currentPage.value - 1) * pageSize.value, currentPage.value * pageSize.value)
)

const selectAll = computed({
  get: () => paginatedData.value.length > 0 && paginatedData.value.every(item => selectedRows.value.includes(item.id)),
  set: (val) => {
    if (val) {
      paginatedData.value.forEach(item => {
        if (!selectedRows.value.includes(item.id)) selectedRows.value.push(item.id)
      })
    } else {
      selectedRows.value = selectedRows.value.filter(id => !paginatedData.value.some(item => item.id === id))
    }
  }
})

const toggleSelectAll = () => { selectAll.value = !selectAll.value }

const handleSearch = () => { currentPage.value = 1 }
const handleReset = () => { Object.keys(filters).forEach(k => filters[k] = ''); currentPage.value = 1 }

const batchEnable = () => {
  allData.value.forEach(item => {
    if (selectedRows.value.includes(item.id)) { item.enabled = true; item.status = '已发布' }
  })
  selectedRows.value = []
}

const batchDisable = () => {
  const selected = allData.value.filter(item => selectedRows.value.includes(item.id))
  if (selected.length === 0) return
  const highUsage = selected.filter(item => item.usage_count > 0)
  if (highUsage.length > 0) {
    const names = highUsage.map(i => i.template_name).join('、')
    confirm(`以下评分表已被引用，停用可能影响相关考核：\n${names}\n\n确认停用吗？`).then(ok => {
      if (ok) {
        selected.forEach(item => { item.enabled = false; item.status = '已停用' })
        selectedRows.value = []
      }
    }).catch(() => {})
    return
  }
  selected.forEach(item => { item.enabled = false; item.status = '已停用' })
  selectedRows.value = []
}

const batchDelete = () => {
  if (selectedRows.value.length === 0) return
  confirm(`确认删除选中的 ${selectedRows.value.length} 个评分表吗？`).then(ok => {
    if (ok) {
      allData.value = allData.value.filter(item => !selectedRows.value.includes(item.id))
      selectedRows.value = []
    }
  }).catch(() => {})
}

const createTemplate = () => { toast.show('【演示】跳转至新建评分表页面', 'info') }
const editTemplate = (item) => { toast.show(`【演示】编辑评分表：${item.template_name}`, 'info') }

const deleteTemplate = (item) => {
  confirm(`确认删除评分表「${item.template_name}」吗？`).then(ok => {
    if (ok) {
      allData.value = allData.value.filter(t => t.id !== item.id)
      if (paginatedData.value.length === 0 && currentPage.value > 1) currentPage.value--
    }
  }).catch(() => {})
}

const copyTemplate = (item) => {
  const newId = Math.max(...allData.value.map(t => t.id)) + 1
  const newCode = 'TPL-' + String(newId).padStart(3, '0')
  allData.value.push({
    ...JSON.parse(JSON.stringify(item)),
    id: newId,
    template_code: newCode,
    template_name: item.template_name + '（副本）',
    status: '草稿',
    enabled: true,
    usage_count: 0,
    created_at: new Date().toISOString().slice(0, 16).replace('T', ' '),
    updated_at: new Date().toISOString().slice(0, 16).replace('T', ' ')
  })
}

const toggleEnabled = (item) => {
  if (item.status === '草稿' || item.status === '已归档') return
  if (item.status === '已发布') { item.enabled = false; item.status = '已停用' }
  else if (item.status === '已停用') { item.enabled = true; item.status = '已发布' }
}

const exportList = () => { toast.show('【演示】导出列表功能开发中', 'info') }

const statusBadgeClass = (status) => {
  switch (status) {
    case '已发布': return 'badge-success'
    case '草稿': return 'badge-warning'
    case '已停用': return 'badge-error'
    case '已归档': return 'badge-info'
    default: return ''
  }
}
</script>
