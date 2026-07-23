<template>
  <div class="content-container">
    <div class="flex justify-between items-center mb-4">
      <div>
        <h2>活动记录</h2>
        <p class="text-secondary" style="font-size:13px;">考核活动执行记录与日志</p>
      </div>
    </div>

    <div class="card mb-4" style="padding: 20px;">
      <div class="filter-row">
        <div class="filter-item" style="min-width: 180px;">
          <label>活动名称</label>
          <input class="input" placeholder="搜索活动名称" v-model="filters.keyword" @keyup.enter="handleSearch">
        </div>
        <div class="filter-item">
          <label>活动类型</label>
          <select class="select" v-model="filters.activityType">
            <option value="">全部</option>
            <option value="exam">考核</option>
            <option value="training">训练</option>
            <option value="competition">竞赛</option>
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
            <option value="active">进行中</option>
            <option value="ended">已结束</option>
            <option value="cancelled">已取消</option>
          </select>
        </div>
        <div class="filter-item" style="min-width: 160px;">
          <label>开始时间</label>
          <input type="date" class="input" v-model="filters.dateFrom">
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
              <th>活动名称</th>
              <th>活动类型</th>
              <th>来源机构</th>
              <th>参与人数</th>
              <th>开始时间</th>
              <th>结束时间</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in tableData" :key="item.id">
              <td style="font-weight:600;">{{ item.name }}</td>
              <td><span class="badge" :class="typeBadgeClass(item.type)">{{ item.typeLabel }}</span></td>
              <td>{{ item.institution }}</td>
              <td>{{ item.participants }}</td>
              <td>{{ item.startTime }}</td>
              <td>{{ item.endTime }}</td>
              <td><span class="badge" :class="statusBadgeClass(item.status)">{{ item.statusLabel }}</span></td>
              <td>
                <a class="action-link" @click="viewDetail(item)">详情</a>
                <a class="action-link" @click="viewLog(item)">日志</a>
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

    <div v-if="detailVisible" class="modal-overlay" @click.self="detailVisible = false">
      <div class="modal-container" style="width: 560px;">
        <div class="drawer-header"><span>活动详情</span><button class="btn btn-sm" @click="detailVisible = false">✕</button></div>
        <div class="drawer-body">
          <div v-if="detailItem" style="display:grid; grid-template-columns: 100px 1fr; gap: 12px; font-size: 13px;">
            <template v-for="(val, key) in detailItem" :key="key">
              <span class="text-secondary">{{ key }}</span>
              <span>{{ val }}</span>
            </template>
          </div>
        </div>
        <div class="drawer-footer"><button class="btn" @click="detailVisible = false">关闭</button></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { toast } from '@ai-sp/shared'
import dayjs from 'dayjs'

const filters = ref({ keyword: '', activityType: '', institution: '', status: '', dateFrom: '' })
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const tableData = ref([])
const detailVisible = ref(false)
const detailItem = ref(null)

const allInstitutions = ['仁爱医院', '华西医院', '中山医院', '协和医院', '同济医院', '省立医院']

const activityNames = ['2026年住培结业考核', '内科出科考核', '外科年度考核', '急诊模拟训练', '全科医师竞赛', '妇产科中期考核', '儿科招录考核']
const types = ['exam', 'training', 'competition']
const typeLabels = { exam: '考核', training: '训练', competition: '竞赛' }
const statuses = ['active', 'ended', 'cancelled']
const statusLabels = { active: '进行中', ended: '已结束', cancelled: '已取消' }

const allData = ref([])
const generateMock = () => {
  const data = []
  for (let i = 1; i <= 30; i++) {
    const type = types[i % 3]
    const status = statuses[i % 3]
    const startTime = dayjs().subtract(i * 3, 'day').format('YYYY-MM-DD HH:mm')
    const endTime = dayjs().subtract(i * 3, 'day').add(2, 'hour').format('YYYY-MM-DD HH:mm')
    data.push({
      id: `act_${i}`,
      name: activityNames[i % activityNames.length] + (i > 7 ? ` (${i})` : ''),
      type, typeLabel: typeLabels[type],
      institution: allInstitutions[i % allInstitutions.length],
      participants: Math.floor(Math.random() * 60) + 10,
      startTime, endTime,
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
  if (filters.value.activityType) filtered = filtered.filter(e => e.type === filters.value.activityType)
  if (filters.value.institution) filtered = filtered.filter(e => e.institution === filters.value.institution)
  if (filters.value.status) filtered = filtered.filter(e => e.status === filters.value.status)
  if (filters.value.dateFrom) filtered = filtered.filter(e => e.startTime >= filters.value.dateFrom)
  total.value = filtered.length
  const start = (currentPage.value - 1) * pageSize.value
  tableData.value = filtered.slice(start, start + pageSize.value)
}

const handleSearch = () => { currentPage.value = 1; fetchData() }
const handleReset = () => { filters.value = { keyword: '', activityType: '', institution: '', status: '', dateFrom: '' }; handleSearch() }

const typeBadgeClass = (t) => ({ exam: 'badge-info', training: 'badge-success', competition: 'badge-warning' }[t] || '')
const statusBadgeClass = (s) => ({ active: 'badge-success', ended: 'badge-info', cancelled: 'badge-error' }[s] || '')

const viewDetail = (item) => { detailItem.value = item; detailVisible.value = true }
const viewLog = (item) => toast.show(`查看活动日志：${item.name}（演示）`)

const totalPages = computed(() => Math.ceil(total.value / pageSize.value) || 1)
const onPageSizeChange = () => { currentPage.value = 1; fetchData() }

watch(currentPage, () => fetchData())
onMounted(() => { fetchData() })
</script>
