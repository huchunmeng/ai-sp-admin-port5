<template>
  <div class="content-container">
    <div class="flex justify-between items-center mb-4">
      <div>
        <h2>导出管理</h2>
        <p class="text-secondary" style="font-size:13px;">数据导出任务管理与文件下载</p>
      </div>
      <button class="btn btn-primary" @click="createExport">+ 新建导出</button>
    </div>

    <div class="card mb-4" style="padding: 20px;">
      <div class="filter-row">
        <div class="filter-item" style="min-width: 180px;">
          <label>任务名称</label>
          <input class="input" placeholder="搜索任务名称" v-model="filters.keyword" @keyup.enter="handleSearch">
        </div>
        <div class="filter-item">
          <label>数据类型</label>
          <select class="select" v-model="filters.dataType">
            <option value="">全部</option>
            <option value="training">训练记录</option>
            <option value="exam">考核记录</option>
            <option value="user">用户数据</option>
            <option value="case">病例数据</option>
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
          <label>状态</label>
          <select class="select" v-model="filters.status">
            <option value="">全部</option>
            <option value="processing">处理中</option>
            <option value="completed">已完成</option>
            <option value="failed">失败</option>
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

    <div class="card" style="padding: 0;">
      <div class="table-wrapper">
        <table class="table">
          <thead>
            <tr>
              <th>任务名称</th>
              <th>数据类型</th>
              <th>来源机构</th>
              <th>创建人</th>
              <th>创建时间</th>
              <th>完成时间</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in tableData" :key="item.id">
              <td style="font-weight:600;">{{ item.name }}</td>
              <td><span class="badge badge-info">{{ item.dataTypeLabel }}</span></td>
              <td>{{ item.institution === 'all' ? '全部机构' : item.institution }}</td>
              <td>{{ item.creator }}</td>
              <td>{{ item.createdAt }}</td>
              <td>{{ item.completedAt || '——' }}</td>
              <td>
                <span class="badge" :class="statusBadgeClass(item.status)">{{ item.statusLabel }}</span>
                <span v-if="item.status === 'processing'" style="margin-left:6px;color:var(--primary);">⏳</span>
              </td>
              <td>
                <a v-if="item.status === 'completed'" class="action-link" @click="downloadFile(item)">下载</a>
                <a v-if="item.status === 'failed'" class="action-link" @click="retryExport(item)">重试</a>
                <a class="action-link action-danger" @click="deleteTask(item)">删除</a>
              </td>
            </tr>
            <tr v-if="tableData.length === 0">
              <td :colspan="8" class="text-center py-8 text-secondary">暂无数据</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="flex items-center justify-between mt-4">
      <div class="text-secondary">共 {{ total }} 条记录</div>
      <div class="flex gap-2 items-center">
        <button class="btn btn-sm" :disabled="currentPage <= 1" @click="currentPage--">上一页</button>
        <span class="px-3">{{ currentPage }} / {{ totalPages }}</span>
        <button class="btn btn-sm" :disabled="currentPage >= totalPages" @click="currentPage++">下一页</button>
        <select class="select" style="width: auto;" v-model="pageSize" @change="onPageSizeChange">
          <option :value="10">10条/页</option>
          <option :value="20">20条/页</option>
          <option :value="50">50条/页</option>
        </select>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { toast } from '@ai-sp/shared'
import dayjs from 'dayjs'

const filters = ref({ keyword: '', dataType: '', institution: '', status: '' })
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const tableData = ref([])

const allInstitutions = ['仁爱医院', '华西医院', '中山医院', '协和医院', '同济医院', '省立医院']

const dataTypes = ['training', 'exam', 'user', 'case']
const dataTypeLabels = { training: '训练记录', exam: '考核记录', user: '用户数据', case: '病例数据' }
const statuses = ['processing', 'completed', 'failed']
const statusLabels = { processing: '处理中', completed: '已完成', failed: '失败' }
const taskNames = ['训练记录汇总', '考核成绩汇总', '用户活跃度统计', '病例使用统计', '机构考核汇总', '月度报表']
const creators = ['管理员', '张主任', '李科长', '王老师']

const allData = ref([])
const generateMock = () => {
  const data = []
  for (let i = 1; i <= 24; i++) {
    const status = statuses[i % 3]
    const createdAt = dayjs().subtract(i * 5, 'hour').format('YYYY-MM-DD HH:mm')
    const completedAt = status === 'completed' ? dayjs().subtract(i * 5 - 1, 'hour').format('YYYY-MM-DD HH:mm') : null
    const inst = i % 7 === 0 ? 'all' : allInstitutions[i % allInstitutions.length]
    data.push({
      id: `exp_${i}`,
      name: taskNames[i % taskNames.length] + (i > 6 ? ` (${i})` : ''),
      dataType: dataTypes[i % 4], dataTypeLabel: dataTypeLabels[dataTypes[i % 4]],
      institution: inst,
      creator: creators[i % creators.length],
      createdAt, completedAt,
      status, statusLabel: statusLabels[status]
    })
  }
  return data
}
allData.value = generateMock()

const fetchData = () => {
  let filtered = [...allData.value]
  const kw = filters.value.keyword
  if (kw) filtered = filtered.filter(e => e.name.includes(kw))
  if (filters.value.dataType) filtered = filtered.filter(e => e.dataType === filters.value.dataType)
  if (filters.value.institution) filtered = filtered.filter(e => e.institution === filters.value.institution || e.institution === 'all')
  if (filters.value.status) filtered = filtered.filter(e => e.status === filters.value.status)
  total.value = filtered.length
  const start = (currentPage.value - 1) * pageSize.value
  tableData.value = filtered.slice(start, start + pageSize.value)
}

const handleSearch = () => { currentPage.value = 1; fetchData() }
const handleReset = () => { filters.value = { keyword: '', dataType: '', institution: '', status: '' }; handleSearch() }

const statusBadgeClass = (s) => ({ processing: 'badge-warning', completed: 'badge-success', failed: 'badge-error' }[s] || '')

const createExport = () => toast.show('【演示】新建导出任务')
const downloadFile = (item) => toast.show(`下载文件：${item.name}.xlsx（演示）`)
const retryExport = (item) => {
  const found = allData.value.find(x => x.id === item.id)
  if (found) {
    found.status = 'processing'
    found.statusLabel = '处理中'
    fetchData()
    toast.show('已重新提交导出任务')
  }
}
const deleteTask = (item) => {
  const idx = allData.value.findIndex(x => x.id === item.id)
  if (idx >= 0) {
    allData.value.splice(idx, 1)
    fetchData()
    toast.show('导出任务已删除')
  }
}

const totalPages = computed(() => Math.ceil(total.value / pageSize.value) || 1)
const onPageSizeChange = () => { currentPage.value = 1; fetchData() }

watch(currentPage, () => fetchData())
onMounted(() => { fetchData() })
</script>
