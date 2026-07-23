<template>
  <div class="content-container">
    <h2 style="margin-bottom:4px;">个人报告</h2>
    <p class="text-secondary mb-4" style="font-size:13px;">学员个人成绩报告查询与详情</p>

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
              <th>学员</th>
              <th>来源机构</th>
              <th>总训练次数</th>
              <th>总考核次数</th>
              <th>平均分</th>
              <th>最高分</th>
              <th>最近活跃</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in tableData" :key="item.id">
              <td style="font-weight:600;">{{ item.name }}</td>
              <td>{{ item.institution }}</td>
              <td>{{ item.trainCount }}</td>
              <td>{{ item.examCount }}</td>
              <td>
                <span :style="{ color: item.avgScore >= 80 ? 'var(--success)' : item.avgScore >= 60 ? 'var(--warning)' : 'var(--danger)', fontWeight: 600 }">{{ item.avgScore }}</span>
              </td>
              <td>{{ item.maxScore }}</td>
              <td>{{ item.lastActive }}</td>
              <td>
                <a class="action-link" @click="viewReport(item)">查看报告</a>
                <a class="action-link" @click="viewHistory(item)">训练历史</a>
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

    <div v-if="drawerVisible" class="drawer-overlay" @click.self="drawerVisible = false">
      <div class="drawer-container" style="width: 560px;">
        <div class="drawer-header">
          <span>个人成绩报告 - {{ selectedStudent?.name }}</span>
          <button class="btn btn-sm" @click="drawerVisible = false">✕</button>
        </div>
        <div class="drawer-body" v-if="selectedStudent">
          <div class="stat-cards-row" style="grid-template-columns: repeat(2, 1fr); margin-bottom: 20px;">
            <div class="stat-card">
              <div class="stat-card-icon" style="background: #dbeafe;"><i class="fa-solid fa-chart-line" style="color:var(--primary);"></i></div>
              <div class="stat-card-body">
                <div class="stat-card-label">平均分</div>
                <div class="stat-card-value" :style="{ color: selectedStudent.avgScore >= 80 ? 'var(--success)' : 'var(--warning)' }">{{ selectedStudent.avgScore }}</div>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-card-icon" style="background: #d1fae5;"><i class="fa-solid fa-trophy" style="color:var(--success);"></i></div>
              <div class="stat-card-body">
                <div class="stat-card-label">最高分</div>
                <div class="stat-card-value">{{ selectedStudent.maxScore }}</div>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-card-icon" style="background: #fef3c7;"><i class="fa-solid fa-dumbbell" style="color:var(--warning);"></i></div>
              <div class="stat-card-body">
                <div class="stat-card-label">训练次数</div>
                <div class="stat-card-value">{{ selectedStudent.trainCount }}</div>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-card-icon" style="background: #ede9fe;"><i class="fa-solid fa-clipboard-check" style="color:#7c3aed;"></i></div>
              <div class="stat-card-body">
                <div class="stat-card-label">考核次数</div>
                <div class="stat-card-value">{{ selectedStudent.examCount }}</div>
              </div>
            </div>
          </div>

          <h4 style="margin-bottom: 12px;">考站维度得分</h4>
          <table class="data-table">
            <thead><tr><th>考站</th><th>平均分</th><th>最高分</th><th>完成次数</th><th>评级</th></tr></thead>
            <tbody>
              <tr v-for="st in stationScores" :key="st.name">
                <td>{{ st.name }}</td>
                <td>{{ st.avg }}</td>
                <td>{{ st.max }}</td>
                <td>{{ st.count }}</td>
                <td><span class="badge" :class="st.rating === '优秀' ? 'badge-success' : st.rating === '良好' ? 'badge-info' : 'badge-warning'">{{ st.rating }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="drawer-footer">
          <button class="btn" @click="drawerVisible = false">关闭</button>
          <button class="btn btn-primary" @click="exportReport">导出报告</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { toast } from '@ai-sp/shared'
import dayjs from 'dayjs'

const filters = ref({ keyword: '', institution: '', dateFrom: '' })
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const tableData = ref([])
const drawerVisible = ref(false)
const selectedStudent = ref(null)

const allInstitutions = ['仁爱医院', '华西医院', '中山医院', '协和医院', '同济医院', '省立医院']
const studentNames = ['张三', '李四', '王五', '赵六', '陈七', '刘八', '周九', '吴十', '郑一', '钱二']
const stationNames = ['病史采集', '体格检查', '初步诊断', '治疗计划', '病历书写', '病例分析', '人文沟通']

const stationScores = ref([
  { name: '病史采集', avg: 85, max: 92, count: 12, rating: '优秀' },
  { name: '体格检查', avg: 78, max: 88, count: 10, rating: '良好' },
  { name: '初步诊断', avg: 72, max: 85, count: 8, rating: '良好' },
  { name: '治疗计划', avg: 68, max: 80, count: 7, rating: '良好' },
  { name: '病历书写', avg: 90, max: 95, count: 5, rating: '优秀' },
  { name: '病例分析', avg: 75, max: 89, count: 9, rating: '良好' },
  { name: '人文沟通', avg: 65, max: 78, count: 6, rating: '及格' }
])

const allData = ref([])
const generateMock = () => {
  const data = []
  for (let i = 1; i <= 20; i++) {
    const institution = allInstitutions[i % allInstitutions.length]
    const avgScore = Math.floor(Math.random() * 30) + 65
    const maxScore = avgScore + Math.floor(Math.random() * 15)
    data.push({
      id: `stu_${i}`,
      name: studentNames[i % studentNames.length],
      institution,
      trainCount: Math.floor(Math.random() * 30) + 5,
      examCount: Math.floor(Math.random() * 10) + 1,
      avgScore, maxScore,
      lastActive: dayjs().subtract(i, 'day').format('YYYY-MM-DD')
    })
  }
  return data
}
allData.value = generateMock()

const fetchData = () => {
  let filtered = [...allData.value]
  const kw = filters.value.keyword
  if (kw) filtered = filtered.filter(e => e.name.includes(kw))
  if (filters.value.institution) filtered = filtered.filter(e => e.institution === filters.value.institution)
  if (filters.value.dateFrom) filtered = filtered.filter(e => e.lastActive >= filters.value.dateFrom)
  total.value = filtered.length
  const start = (currentPage.value - 1) * pageSize.value
  tableData.value = filtered.slice(start, start + pageSize.value)
}

const handleSearch = () => { currentPage.value = 1; fetchData() }
const handleReset = () => { filters.value = { keyword: '', institution: '', dateFrom: '' }; handleSearch() }

const viewReport = (item) => {
  selectedStudent.value = item
  drawerVisible.value = true
}
const viewHistory = (item) => toast.show(`查看训练历史：${item.name}（演示）`)
const exportReport = () => toast.show(`导出${selectedStudent.value.name}的成绩报告（演示）`)

const totalPages = computed(() => Math.ceil(total.value / pageSize.value) || 1)
const onPageSizeChange = () => { currentPage.value = 1; fetchData() }

watch(currentPage, () => fetchData())
onMounted(() => { fetchData() })
</script>
