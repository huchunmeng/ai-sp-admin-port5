<template>
  <div class="content-container">
    <div class="flex justify-between items-center mb-4">
      <div>
        <h2>任务管理</h2>
        <p class="text-secondary" style="font-size:13px;">审核任务分配与跟踪</p>
      </div>
      <button class="btn btn-primary" @click="createTask">+ 新建任务</button>
    </div>

    <div class="card mb-4" style="padding: 20px;">
      <div class="filter-row">
        <div class="filter-item" style="min-width: 180px;">
          <label>任务名称</label>
          <input class="input" placeholder="搜索任务名称" v-model="filters.keyword" @keyup.enter="handleSearch">
        </div>
        <div class="filter-item">
          <label>任务类型</label>
          <select class="select" v-model="filters.taskType">
            <option value="">全部</option>
            <option value="case-review">病例审核</option>
            <option value="score-review">成绩复核</option>
            <option value="expert-assign">专家指派</option>
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
          <label>优先级</label>
          <select class="select" v-model="filters.priority">
            <option value="">全部</option>
            <option value="high">高</option>
            <option value="medium">中</option>
            <option value="low">低</option>
          </select>
        </div>
        <div class="filter-item">
          <label>状态</label>
          <select class="select" v-model="filters.status">
            <option value="">全部</option>
            <option value="pending">待处理</option>
            <option value="in_progress">处理中</option>
            <option value="completed">已完成</option>
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
              <th>任务编号</th>
              <th>任务名称</th>
              <th>类型</th>
              <th>来源机构</th>
              <th>处理人</th>
              <th>优先级</th>
              <th>截止时间</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in tableData" :key="item.id">
              <td style="color:var(--text-tertiary);">{{ item.code }}</td>
              <td style="font-weight:600;">{{ item.name }}</td>
              <td><span class="badge badge-info">{{ item.typeLabel }}</span></td>
              <td>{{ item.institution }}</td>
              <td>{{ item.assignee }}</td>
              <td><span class="badge" :class="priorityBadgeClass(item.priority)">{{ item.priorityLabel }}</span></td>
              <td>{{ item.deadline }}</td>
              <td><span class="badge" :class="statusBadgeClass(item.status)">{{ item.statusLabel }}</span></td>
              <td>
                <a class="action-link" @click="viewDetail(item)">详情</a>
                <a v-if="item.status === 'pending'" class="action-link" @click="assignTask(item)">指派</a>
                <a v-if="item.status !== 'completed'" class="action-link action-danger" @click="cancelTask(item)">取消</a>
              </td>
            </tr>
            <tr v-if="tableData.length === 0">
              <td :colspan="9" class="text-center py-8 text-secondary">暂无数据</td>
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

const filters = ref({ keyword: '', taskType: '', institution: '', priority: '', status: '' })
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const tableData = ref([])

const allInstitutions = ['仁爱医院', '华西医院', '中山医院', '协和医院', '同济医院', '省立医院']

const taskNames = ['病例审核-内科组', '成绩复核-外科', '专家指派-妇产科', '病例审核-儿科', '成绩复核-全科', '专家指派-急诊科']
const taskTypes = ['case-review', 'score-review', 'expert-assign']
const typeLabels = { 'case-review': '病例审核', 'score-review': '成绩复核', 'expert-assign': '专家指派' }
const priorities = ['high', 'medium', 'low']
const priorityLabels = { high: '高', medium: '中', low: '低' }
const statuses = ['pending', 'in_progress', 'completed']
const statusLabels = { pending: '待处理', in_progress: '处理中', completed: '已完成' }
const assignees = ['张专家', '李主任', '王教授', '赵医师', '陈主任', '刘教授']

const allData = ref([])
const generateMock = () => {
  const data = []
  for (let i = 1; i <= 28; i++) {
    const type = taskTypes[i % 3]
    const status = statuses[i % 3]
    const deadline = dayjs().add(i * 2, 'day').format('YYYY-MM-DD')
    data.push({
      id: `task_${i}`,
      code: `TASK-${String(i).padStart(4, '0')}`,
      name: taskNames[i % taskNames.length] + (i > 6 ? ` (${i})` : ''),
      type: type, typeLabel: typeLabels[type],
      institution: allInstitutions[i % allInstitutions.length],
      assignee: assignees[i % assignees.length],
      priority: priorities[i % 3], priorityLabel: priorityLabels[priorities[i % 3]],
      deadline, status, statusLabel: statusLabels[status]
    })
  }
  return data
}
allData.value = generateMock()

const fetchData = () => {
  let filtered = [...allData.value]
  const kw = filters.value.keyword
  if (kw) filtered = filtered.filter(e => e.name.includes(kw))
  if (filters.value.taskType) filtered = filtered.filter(e => e.type === filters.value.taskType)
  if (filters.value.institution) filtered = filtered.filter(e => e.institution === filters.value.institution)
  if (filters.value.priority) filtered = filtered.filter(e => e.priority === filters.value.priority)
  if (filters.value.status) filtered = filtered.filter(e => e.status === filters.value.status)
  total.value = filtered.length
  const start = (currentPage.value - 1) * pageSize.value
  tableData.value = filtered.slice(start, start + pageSize.value)
}

const handleSearch = () => { currentPage.value = 1; fetchData() }
const handleReset = () => { filters.value = { keyword: '', taskType: '', institution: '', priority: '', status: '' }; handleSearch() }

const priorityBadgeClass = (p) => ({ high: 'badge-error', medium: 'badge-warning', low: 'badge-info' }[p] || '')
const statusBadgeClass = (s) => ({ pending: 'badge-warning', in_progress: 'badge-info', completed: 'badge-success' }[s] || '')

const createTask = () => toast.show('【演示】新建审核任务')
const viewDetail = (item) => toast.show(`查看任务详情：${item.name}（演示）`)
const assignTask = (item) => toast.show(`指派任务：${item.name}（演示）`)
const cancelTask = (item) => {
  const found = allData.value.find(x => x.id === item.id)
  if (found && found.status !== 'completed') {
    found.status = 'completed'
    found.statusLabel = '已完成'
    fetchData()
    toast.show('任务已取消')
  }
}

const totalPages = computed(() => Math.ceil(total.value / pageSize.value) || 1)
const onPageSizeChange = () => { currentPage.value = 1; fetchData() }

watch(currentPage, () => fetchData())
onMounted(() => { fetchData() })
</script>
