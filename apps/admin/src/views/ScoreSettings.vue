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
              <th v-if="visibleColumns.includes('creator_name')">创建人</th>
              <th v-if="visibleColumns.includes('created_at')">创建时间</th>
              <th v-if="visibleColumns.includes('updated_at')">更新时间</th>
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
              <td v-if="visibleColumns.includes('creator_name')">{{ item.creator_name }}</td>
              <td v-if="visibleColumns.includes('created_at')">{{ item.created_at }}</td>
              <td v-if="visibleColumns.includes('updated_at')">{{ item.updated_at }}</td>
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

    <!-- 评分表详情抽屉 -->
    <div v-if="detailVisible" class="drawer-overlay" @click.self="detailVisible = false">
      <div class="drawer" style="width: 1100px; max-width: 95vw;">
        <div class="drawer-header">
          <span v-if="!detailEditMode" style="font-weight:600;font-size:16px">{{ detailTarget?.template_name }}</span>
          <input v-else class="input" v-model="editMeta.name" style="font-size:16px;font-weight:600;width:400px">
          <div class="flex gap-2">
            <template v-if="!detailEditMode">
              <button class="btn btn-sm btn-primary" @click="startEditDetail">编辑</button>
              <button class="btn btn-sm" @click="detailVisible = false">✕ 关闭</button>
            </template>
            <template v-else>
              <button class="btn btn-sm btn-primary" @click="saveEditDetail">保存</button>
              <button class="btn btn-sm" @click="cancelEditDetail">取消</button>
            </template>
          </div>
        </div>
        <div class="drawer-body" style="padding:16px 20px;">
          <div class="flex gap-3 mb-4" style="align-items:center;flex-wrap:wrap;">
            <span class="badge" :class="statusBadgeClass(detailTarget?.status)">{{ detailTarget?.status }}</span>
            <span v-if="detailTarget?.is_system" class="badge" style="background:#ede9fe;color:#7c3aed;border:1px solid #c4b5fd">系统模板</span>
            <span v-if="detailTarget?.version" style="font-size:12px;color:var(--text-tertiary);font-family:monospace">{{ detailTarget.version }}</span>
            <span v-if="!detailEditMode" style="font-size:13px;color:var(--text-secondary)">{{ detailTarget?.specialty }} | 总分 {{ detailTarget?.total_score || 100 }} | 共 {{ detailItems.length }} 项</span>
            <span v-else style="font-size:13px;color:var(--text-secondary)">{{ detailTarget?.specialty }} | 总分 {{ editTotalScore }} | 共 {{ editItems.length }} 项</span>
          </div>
          <div v-if="!detailEditMode && detailTarget?.description" style="font-size:12px;color:var(--text-tertiary);margin-bottom:12px;padding:8px 12px;background:#f9fafb;border-radius:6px">{{ detailTarget.description }}</div>
          <div v-if="detailEditMode" style="margin-bottom:12px;">
            <label style="font-size:12px;color:var(--text-secondary);display:block;margin-bottom:4px;">描述</label>
            <textarea class="input" v-model="editMeta.description" rows="2" style="width:100%;resize:vertical;"></textarea>
          </div>
          <div class="ss-table-wrap" v-if="detailItems.length > 0 || detailEditMode">
            <table class="ss-table">
              <thead>
                <tr>
                  <th style="width:44px;">序号</th>
                  <th style="width:120px;">考核项目</th>
                  <th>评分项</th>
                  <th style="width:88px;">评分项分值</th>
                  <th v-if="detailEditMode" style="width:60px;">操作</th>
                </tr>
              </thead>
              <tbody>
                <template v-if="!detailEditMode">
                  <tr v-for="(it, idx) in detailItems" :key="it.id">
                    <td class="td-num">{{ idx + 1 }}</td>
                    <td v-if="detailCatSpans[idx] > 0" :rowspan="detailCatSpans[idx]" class="td-merged">{{ it.category }}</td>
                    <td class="cell-text">{{ it.item }}</td>
                    <td class="cell-num" style="font-weight:600;color:var(--primary);">{{ it.score }}</td>
                  </tr>
                </template>
                <template v-else>
                  <tr v-for="(it, idx) in editItems" :key="it._key">
                    <td class="td-num">{{ idx + 1 }}</td>
                    <td><input class="input" v-model="it.category" style="width:100%;min-width:80px;font-size:12px;padding:4px 6px;"></td>
                    <td><input class="input" v-model="it.item" style="width:100%;font-size:12px;padding:4px 6px;"></td>
                    <td><input class="input" type="number" v-model.number="it.score" style="width:70px;text-align:center;font-size:12px;padding:4px 6px;"></td>
                    <td style="text-align:center">
                      <button class="btn btn-sm btn-danger" @click="removeEditItem(idx)" style="padding:2px 8px;font-size:11px;">删除</button>
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
            <div v-if="detailEditMode" style="padding:8px 12px;border-top:1px solid #e5e7eb;">
              <button class="btn btn-sm" @click="addEditItem">+ 添加评分项</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { confirm, toast } from '@ai-sp/shared'
import { SCORE_SHEET_TEMPLATES } from '@/data/templates/index.js'

const filters = reactive({
  keyword: '',
  specialty: '',
  status: ''
})

const specialties = ['内科', '外科', '儿科', '妇产科', '急诊科', '全科', '精神科']
const statusOptions = ['草稿', '已发布', '已停用', '已归档']

const mockData = () => SCORE_SHEET_TEMPLATES.map((tpl, i) => ({
  id: i + 1,
  template_code: tpl.code,
  template_name: tpl.name,
  specialty: tpl.specialty || '通用',
  status: '已发布',
  creator_name: '系统',
  created_at: '2026-01-01 00:00',
  updated_at: '2026-01-01 00:00',
  enabled: true,
  items: tpl.items,
  is_system: true,
  version: tpl.version,
  description: tpl.description,
  total_score: tpl.total_score
}))

const allData = ref(mockData())
const selectedRows = ref([])
const currentPage = ref(1)
const pageSize = ref(10)

// 详情抽屉
const detailVisible = ref(false)
const detailTarget = ref(null)
const detailItems = computed(() => detailTarget.value?.items || [])
const detailCatSpans = computed(() => computeRowSpans(detailItems.value, 'category'))

// 编辑模式
const detailEditMode = ref(false)
const editItems = ref([])
const editMeta = reactive({ name: '', description: '' })
const editTotalScore = computed(() => editItems.value.reduce((s, it) => s + (it.score || 0), 0))

let _editItemKey = 0
function startEditDetail() {
  editMeta.name = detailTarget.value?.template_name || ''
  editMeta.description = detailTarget.value?.description || ''
  editItems.value = (detailTarget.value?.items || []).map(it => ({
    _key: ++_editItemKey,
    id: it.id,
    category: it.category,
    item: it.item,
    score: it.score
  }))
  detailEditMode.value = true
}

function cancelEditDetail() {
  detailEditMode.value = false
  editItems.value = []
}

function saveEditDetail() {
  if (!detailTarget.value) return
  detailTarget.value.template_name = editMeta.name
  detailTarget.value.description = editMeta.description
  detailTarget.value.items = editItems.value.map((it, idx) => ({
    id: idx + 1,
    category: it.category,
    item: it.item,
    score: it.score || 0
  }))
  detailTarget.value.total_score = editTotalScore.value
  detailEditMode.value = false
  editItems.value = []
  toast.show('评分表已更新', 'success')
}

function addEditItem() {
  const lastCat = editItems.value.length > 0 ? editItems.value[editItems.value.length - 1].category : ''
  editItems.value.push({
    _key: ++_editItemKey,
    id: editItems.value.length + 1,
    category: lastCat,
    item: '',
    score: 0
  })
}

function removeEditItem(idx) {
  editItems.value.splice(idx, 1)
}

function computeRowSpans(arr, field) {
  const spans = []
  let i = 0
  while (i < arr.length) {
    let j = i + 1
    while (j < arr.length && arr[j][field] === arr[i][field]) j++
    const count = j - i
    for (let k = 0; k < count; k++) spans.push(k === 0 ? count : 0)
    i = j
  }
  return spans
}

const allColumns = [
  { key: 'template_code', label: '评分表编码' },
  { key: 'template_name', label: '评分表名称' },
  { key: 'specialty', label: '专业' },
  { key: 'status', label: '状态' },
  { key: 'creator_name', label: '创建人' },
  { key: 'created_at', label: '创建时间' },
  { key: 'updated_at', label: '更新时间' }
]

const visibleColumns = ref(allColumns.map(c => c.key))
const showColumnSettings = ref(false)
const resetColumnSettings = () => {
  visibleColumns.value = allColumns.map(c => c.key)
}

const filteredData = computed(() => allData.value.filter(item => {
  if (filters.keyword && !item.template_name.includes(filters.keyword) && !item.template_code.includes(filters.keyword)) return false
  if (filters.specialty && item.specialty !== filters.specialty) return false
  if (filters.status && item.status !== filters.status) return false
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

const toggleSelectAll = () => {
  selectAll.value = !selectAll.value
}

const handleSearch = () => {
  currentPage.value = 1
}

const handleReset = () => {
  Object.keys(filters).forEach(k => filters[k] = '')
  currentPage.value = 1
}

const batchEnable = () => {
  allData.value.forEach(item => {
    if (selectedRows.value.includes(item.id)) { item.enabled = true; item.status = '已发布' }
  })
  selectedRows.value = []
}

const batchDisable = () => {
  const selected = allData.value.filter(item => selectedRows.value.includes(item.id))
  if (selected.length === 0) return
  confirm(`确认停用选中的 ${selected.length} 个评分表吗？`).then(ok => {
    if (ok) {
      selected.forEach(item => { item.enabled = false; item.status = '已停用' })
      selectedRows.value = []
    }
  }).catch(() => {})
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

const createTemplate = () => {
  toast.show('【演示】跳转至新建评分表页面', 'info')
}

const editTemplate = (item) => {
  detailTarget.value = item
  detailVisible.value = true
  // 直接进入编辑模式
  editMeta.name = item.template_name || ''
  editMeta.description = item.description || ''
  _editItemKey = 0
  editItems.value = (item.items || []).map(it => ({
    _key: ++_editItemKey,
    id: it.id,
    category: it.category,
    item: it.item,
    score: it.score
  }))
  detailEditMode.value = true
}

const deleteTemplate = (item) => {
  confirm(`确认删除评分表「${item.template_name}」吗？`).then(ok => {
    if (ok) {
      allData.value = allData.value.filter(t => t.id !== item.id)
      if (paginatedData.value.length === 0 && currentPage.value > 1) {
        currentPage.value--
      }
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
    created_at: new Date().toISOString().slice(0, 16).replace('T', ' '),
    updated_at: new Date().toISOString().slice(0, 16).replace('T', ' ')
  })
}

const toggleEnabled = (item) => {
  if (item.status === '草稿' || item.status === '已归档') return
  if (item.status === '已发布') {
    item.enabled = false
    item.status = '已停用'
  } else if (item.status === '已停用') {
    item.enabled = true
    item.status = '已发布'
  }
}

const exportList = () => {
  toast.show('【演示】导出列表功能开发中', 'info')
}

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

<style scoped>
/* 详情抽屉 */
.drawer-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.3); z-index: 1000; display: flex; justify-content: flex-end; }
.drawer { background: #fff; height: 100%; overflow-y: auto; box-shadow: -4px 0 12px rgba(0,0,0,0.1); display: flex; flex-direction: column; }
.drawer-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #e5e7eb; flex-shrink: 0; }
.drawer-body { flex: 1; overflow-y: auto; }

/* 评分表详情表格 */
.ss-table-wrap { overflow-x: auto; border: 1px solid #e5e7eb; border-radius: 8px; }
.ss-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.ss-table th { background: #f8fafc; padding: 10px 8px; text-align: center; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb; white-space: nowrap; font-size: 12px; }
.ss-table td { padding: 4px 6px; border-bottom: 1px solid #f3f4f6; }
.ss-table tr:last-child td { border-bottom: none; }
.td-num { text-align: center; color: #9ca3af; font-size: 12px; }
.td-merged { vertical-align: middle; text-align: center; font-size: 13px; color: #374151; font-weight: 500; background: #fafbfc; border-right: 1px solid #e5e7eb; max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cell-num { text-align: center; font-size: 13px; }
.cell-text { font-size: 13px; color: #303133; padding: 6px 8px; vertical-align: middle; }
</style>
