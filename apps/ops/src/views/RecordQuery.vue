<template>
  <div class="content-container">
    <h2 style="margin-bottom:4px;">记录查询</h2>
    <p class="text-secondary mb-4" style="font-size:13px;">全平台训练与考核记录综合查询</p>

    <div class="card mb-4" style="padding: 20px;">
      <div class="filter-row">
        <div class="filter-item" style="min-width: 160px;">
          <label>学员姓名</label>
          <input class="input" placeholder="搜索学员" v-model="filters.keyword" @keyup.enter="handleSearch">
        </div>
        <div class="filter-item">
          <label>来源机构</label>
          <select class="select" v-model="filters.institution">
            <option value="">全部</option>
            <option v-for="inst in allInstitutions" :key="inst" :value="inst">{{ inst }}</option>
          </select>
        </div>
        <div class="filter-item">
          <label>考站类型</label>
          <select class="select" v-model="filters.stationType">
            <option value="">全部</option>
            <option value="history">病史采集</option>
            <option value="physical">体格检查</option>
            <option value="diagnosis">初步诊断</option>
            <option value="treatment">治疗计划</option>
            <option value="record">病历书写</option>
            <option value="analysis">病例分析</option>
            <option value="humanity">人文沟通</option>
          </select>
        </div>
        <div class="filter-item">
          <label>案例名称</label>
          <input class="input" placeholder="搜索案例" v-model="filters.caseName">
        </div>
        <div class="filter-item">
          <label>最低分数</label>
          <input type="number" class="input" placeholder="0-100" v-model="filters.minScore" min="0" max="100" style="width:80px;">
        </div>
        <div class="filter-item" style="min-width: 160px;">
          <label>开始时间</label>
          <input type="date" class="input" v-model="filters.dateFrom">
        </div>
        <div class="filter-item" style="min-width: 160px;">
          <label>结束时间</label>
          <input type="date" class="input" v-model="filters.dateTo">
        </div>
        <div class="filter-item">
          <label>&nbsp;</label>
          <div class="flex gap-2">
            <button class="btn btn-primary" @click="handleSearch">搜索</button>
            <button class="btn" @click="handleReset">重置</button>
            <button class="btn" @click="handleExport">导出</button>
          </div>
        </div>
      </div>
    </div>

    <div class="card" style="padding: 0;">
      <div class="table-wrapper">
        <table class="table">
          <thead>
            <tr>
              <th>学员</th>
              <th>来源机构</th>
              <th>案例名称</th>
              <th>考站类型</th>
              <th>分数</th>
              <th>用时</th>
              <th>完成时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in tableData" :key="item.id">
              <td style="font-weight:600;">{{ item.studentName }}</td>
              <td>{{ item.institution }}</td>
              <td>{{ item.caseName }}</td>
              <td><span class="badge badge-info">{{ item.stationLabel }}</span></td>
              <td>
                <span :style="{ color: item.score >= 80 ? 'var(--success)' : item.score >= 60 ? 'var(--warning)' : 'var(--danger)', fontWeight: 600 }">{{ item.score }}</span>
              </td>
              <td>{{ item.duration }}</td>
              <td>{{ item.completeTime }}</td>
              <td>
                <a class="action-link" @click="viewReport(item)">查看报告</a>
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
      <div class="flex items-center gap-4">
        <span class="text-secondary">共 {{ total }} 条记录</span>
      </div>
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

const filters = ref({ keyword: '', institution: '', stationType: '', caseName: '', minScore: '', dateFrom: '', dateTo: '' })
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const tableData = ref([])

const allInstitutions = ['仁爱医院', '华西医院', '中山医院', '协和医院', '同济医院', '省立医院']
const stations = ['history', 'physical', 'diagnosis', 'treatment', 'record', 'analysis', 'humanity']
const stationLabels = { history: '病史采集', physical: '体格检查', diagnosis: '初步诊断', treatment: '治疗计划', record: '病历书写', analysis: '病例分析', humanity: '人文沟通' }
const caseNames = ['急性心肌梗死', '慢性阻塞性肺病', '糖尿病酮症酸中毒', '脑卒中', '急性阑尾炎', '肺炎']
const studentNames = ['张三', '李四', '王五', '赵六', '陈七', '刘八', '周九', '吴十']

const allData = ref([])
const generateMock = () => {
  const data = []
  for (let i = 1; i <= 45; i++) {
    const institution = allInstitutions[i % allInstitutions.length]
    const station = stations[i % stations.length]
    const score = Math.floor(Math.random() * 41) + 60
    const durationMin = Math.floor(Math.random() * 30) + 10
    const completeTime = dayjs().subtract(i, 'hour').format('YYYY-MM-DD HH:mm')
    data.push({
      id: `rec_${i}`,
      studentName: studentNames[i % studentNames.length],
      institution,
      caseName: caseNames[i % caseNames.length],
      stationType: station, stationLabel: stationLabels[station],
      score, duration: `${durationMin}min`,
      completeTime
    })
  }
  return data
}
allData.value = generateMock()

const fetchData = () => {
  let filtered = [...allData.value]
  const kw = filters.value.keyword
  if (kw) filtered = filtered.filter(e => e.studentName.includes(kw))
  if (filters.value.institution) filtered = filtered.filter(e => e.institution === filters.value.institution)
  if (filters.value.stationType) filtered = filtered.filter(e => e.stationType === filters.value.stationType)
  if (filters.value.caseName) filtered = filtered.filter(e => e.caseName.includes(filters.value.caseName))
  if (filters.value.minScore) filtered = filtered.filter(e => e.score >= Number(filters.value.minScore))
  if (filters.value.dateFrom) filtered = filtered.filter(e => e.completeTime >= filters.value.dateFrom)
  if (filters.value.dateTo) filtered = filtered.filter(e => e.completeTime <= filters.value.dateTo + ' 23:59:59')
  total.value = filtered.length
  const start = (currentPage.value - 1) * pageSize.value
  tableData.value = filtered.slice(start, start + pageSize.value)
}

const handleSearch = () => { currentPage.value = 1; fetchData() }
const handleReset = () => { filters.value = { keyword: '', institution: '', stationType: '', caseName: '', minScore: '', dateFrom: '', dateTo: '' }; handleSearch() }
const handleExport = () => toast.show(`导出当前筛选结果共 ${total.value} 条（演示）`)
const viewReport = (item) => toast.show(`查看报告：${item.studentName} - ${item.caseName}（演示）`)

const totalPages = computed(() => Math.ceil(total.value / pageSize.value) || 1)
const onPageSizeChange = () => { currentPage.value = 1; fetchData() }

watch(currentPage, () => fetchData())
onMounted(() => { fetchData() })
</script>
