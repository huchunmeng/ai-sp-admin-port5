<template>
  <div class="content-container">
    <!-- 筛选栏 (follows PlatformCaseList pattern) -->
    <div class="card mb-4">
      <div class="filter-row">
        <div class="filter-item" style="min-width:200px">
          <label>搜索</label>
          <input class="input" placeholder="病例标题 / 患者姓名" v-model="filters.keyword" @input="onSearchInput">
        </div>
        <div class="filter-item">
          <label>病例分级</label>
          <select class="select" v-model="filters.caseLevel">
            <option value="">全部</option>
            <option value="basic">基础病例</option>
            <option value="advanced">高阶病例</option>
            <option value="difficult">疑难病例</option>
          </select>
        </div>
        <div class="filter-item">
          <label>教学阶段</label>
          <select class="select" v-model="filters.teachingPhase">
            <option value="">全部</option>
            <option v-for="p in phases" :key="p" :value="p">{{ p }}</option>
          </select>
        </div>
        <div class="filter-item">
          <label>科室</label>
          <select class="select" v-model="filters.dept">
            <option value="">全部</option>
            <option v-for="d in depts" :key="d" :value="d">{{ d }}</option>
          </select>
        </div>
      </div>
      <div class="filter-row mt-4">
        <div class="filter-item">
          <label>AI伴学状态</label>
          <select class="select" v-model="filters.companionStatus">
            <option value="">全部</option>
            <option value="ready">已开通</option>
            <option value="pending">待开通</option>
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

    <!-- 操作工具栏 (follows PlatformCaseList pattern) -->
    <div class="flex items-center justify-between mb-4">
      <div class="flex gap-2">
        <button class="btn btn-primary" @click="batchOpenCompanion" :disabled="selectedRows.length === 0">批量开通AI伴学</button>
      </div>
      <div class="flex gap-2">
        <button class="btn" @click="refreshList">刷新列表</button>
      </div>
    </div>

    <!-- 表格 (follows PlatformCaseList pattern) -->
    <div class="card" style="padding:0">
      <div class="table-wrapper">
        <table class="table">
          <thead>
            <tr>
              <th class="sticky-left" style="left:0;width:40px"><input type="checkbox" :checked="selectAll" @change="toggleSelectAll"></th>
              <th class="sticky-left" style="left:40px">病例标题</th>
              <th>病例ID</th>
              <th>患者信息</th>
              <th>教学阶段</th>
              <th>科室</th>
              <th>病种</th>
              <th>病例分级</th>
              <th>AI伴学</th>
              <th class="sticky-right" style="right:0;min-width:100px">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in paginatedData" :key="item.id">
              <td class="sticky-left" style="left:0"><input type="checkbox" v-model="selectedRows" :value="item.id"></td>
              <td class="sticky-left" style="left:40px">
                <a href="#" @click.prevent="openAICompanion(item)" style="color:var(--primary);text-decoration:none">{{ item.title }}</a>
              </td>
              <td><code style="background:#f3f4f6;padding:2px 6px;border-radius:4px">{{ item.caseId }}</code></td>
              <td>{{ item.patientName }} / {{ item.gender }} / {{ item.age }}岁</td>
              <td><span class="badge badge-info">{{ item.teachingPhase }}</span></td>
              <td>{{ item.dept }}</td>
              <td>{{ item.disease }}</td>
              <td><span class="badge" :class="levelBadgeClass(item.caseLevel)">{{ item.caseLevelLabel }}</span></td>
              <td>
                <button v-if="item.companionReady" class="btn btn-sm" @click="openAICompanion(item)">🤖 AI伴学</button>
                <button v-else class="btn btn-sm" @click="enableCompanion(item)" style="color:var(--warning)">开通</button>
              </td>
              <td class="sticky-right" style="right:0">
                <div class="flex gap-2">
                  <button class="btn btn-sm" @click="openAICompanion(item)">伴学</button>
                  <button class="btn btn-sm" @click="editCase(item)">编辑</button>
                </div>
              </td>
            </tr>
            <tr v-if="filteredData.length === 0">
              <td :colspan="10" style="text-align:center;padding:40px;color:var(--text-secondary)">暂无数据</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 分页 (follows PlatformCaseList pattern) -->
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
import { ref, reactive, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from '@ai-sp/shared'

const router = useRouter()

const phases = ['U1', 'U2', 'R1', 'R2', 'R3', 'F1', 'F2']
const depts = ['心内科', '呼吸科', '消化科', '神经内科', '内分泌科', '肾内科', '骨科', '普外科', '心外科']

const filters = reactive({
  keyword: '',
  caseLevel: '',
  teachingPhase: '',
  dept: '',
  companionStatus: ''
})

const currentPage = ref(1)
const pageSize = ref(10)
const selectedRows = ref([])
const searchTimer = ref(null)

const allData = ref([
  { id: 1, title: '陈建国 · 急性心肌梗死', caseId: 'AI-CARD-001', patientName: '陈建国', gender: '男', age: 62, dept: '心内科', disease: '急性心肌梗死', teachingPhase: 'R2', caseLevel: 'advanced', caseLevelLabel: '高阶病例', companionReady: true },
  { id: 2, title: '李秀兰 · 社区获得性肺炎', caseId: 'AI-RESP-002', patientName: '李秀兰', gender: '女', age: 45, dept: '呼吸科', disease: '社区获得性肺炎', teachingPhase: 'U2', caseLevel: 'basic', caseLevelLabel: '基础病例', companionReady: true },
  { id: 3, title: '张明华 · 心衰合并肾功能不全', caseId: 'AI-CARD-003', patientName: '张明华', gender: '男', age: 71, dept: '心内科', disease: '心力衰竭', teachingPhase: 'R2', caseLevel: 'advanced', caseLevelLabel: '高阶病例', companionReady: true },
  { id: 4, title: '王大勇 · 上消化道出血', caseId: 'AI-GAST-004', patientName: '王大勇', gender: '男', age: 55, dept: '消化科', disease: '上消化道出血', teachingPhase: 'R1', caseLevel: 'basic', caseLevelLabel: '基础病例', companionReady: false },
  { id: 5, title: '赵丽华 · 糖尿病酮症酸中毒', caseId: 'AI-ENDO-005', patientName: '赵丽华', gender: '女', age: 34, dept: '内分泌科', disease: '糖尿病酮症酸中毒', teachingPhase: 'R2', caseLevel: 'advanced', caseLevelLabel: '高阶病例', companionReady: true },
  { id: 6, title: '刘国强 · 系统性淀粉样变性', caseId: 'AI-RARE-006', patientName: '刘国强', gender: '男', age: 60, dept: '肾内科', disease: '系统性淀粉样变性', teachingPhase: 'R3', caseLevel: 'difficult', caseLevelLabel: '疑难病例', companionReady: true },
  { id: 7, title: '周文斌 · 脑卒中静脉溶栓', caseId: 'AI-NEUR-007', patientName: '周文斌', gender: '男', age: 68, dept: '神经内科', disease: '急性缺血性脑卒中', teachingPhase: 'R2', caseLevel: 'advanced', caseLevelLabel: '高阶病例', companionReady: false },
  { id: 8, title: '孙美玲 · 股骨颈骨折', caseId: 'AI-ORTH-008', patientName: '孙美玲', gender: '女', age: 72, dept: '骨科', disease: '股骨颈骨折', teachingPhase: 'U1', caseLevel: 'basic', caseLevelLabel: '基础病例', companionReady: true },
  { id: 9, title: '钱德胜 · 副肿瘤综合征', caseId: 'AI-NEUR-009', patientName: '钱德胜', gender: '男', age: 58, dept: '神经内科', disease: '副肿瘤综合征', teachingPhase: 'F1', caseLevel: 'difficult', caseLevelLabel: '疑难病例', companionReady: true },
  { id: 10, title: '吴晓峰 · 急性阑尾炎', caseId: 'AI-SURG-010', patientName: '吴晓峰', gender: '男', age: 28, dept: '普外科', disease: '急性阑尾炎', teachingPhase: 'U1', caseLevel: 'basic', caseLevelLabel: '基础病例', companionReady: true },
  { id: 11, title: '郑伟强 · 肺栓塞', caseId: 'AI-RESP-011', patientName: '郑伟强', gender: '男', age: 52, dept: '呼吸科', disease: '急性肺栓塞', teachingPhase: 'R3', caseLevel: 'advanced', caseLevelLabel: '高阶病例', companionReady: false },
  { id: 12, title: '冯小明 · 主动脉夹层', caseId: 'AI-CARD-012', patientName: '冯小明', gender: '男', age: 48, dept: '心外科', disease: '主动脉夹层', teachingPhase: 'R3', caseLevel: 'difficult', caseLevelLabel: '疑难病例', companionReady: true },
])

const filteredData = computed(() => {
  return allData.value.filter(item => {
    if (filters.keyword && !item.title.includes(filters.keyword) && !item.caseId.includes(filters.keyword)) return false
    if (filters.caseLevel && item.caseLevel !== filters.caseLevel) return false
    if (filters.teachingPhase && item.teachingPhase !== filters.teachingPhase) return false
    if (filters.dept && item.dept !== filters.dept) return false
    if (filters.companionStatus === 'ready' && !item.companionReady) return false
    if (filters.companionStatus === 'pending' && item.companionReady) return false
    return true
  })
})

const totalPages = computed(() => Math.ceil(filteredData.value.length / pageSize.value) || 1)

const paginatedData = computed(() =>
  filteredData.value.slice((currentPage.value - 1) * pageSize.value, currentPage.value * pageSize.value)
)

const selectAll = computed({
  get() { return paginatedData.value.length > 0 && paginatedData.value.every(item => selectedRows.value.includes(item.id)) },
  set(val) {
    if (val) {
      paginatedData.value.forEach(item => { if (!selectedRows.value.includes(item.id)) selectedRows.value.push(item.id) })
    } else {
      selectedRows.value = selectedRows.value.filter(id => !paginatedData.value.some(item => item.id === id))
    }
  }
})

function toggleSelectAll() { selectAll.value = !selectAll.value }

watch(() => ({ ...filters }), () => { currentPage.value = 1 })

function levelBadgeClass(level) {
  if (level === 'basic') return 'badge-success'
  if (level === 'advanced') return 'badge-warning'
  if (level === 'difficult') return 'badge-error'
  return 'badge-info'
}

let debounceTimer = null
function onSearchInput() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => { currentPage.value = 1 }, 250)
}

function handleSearch() { currentPage.value = 1 }
function handleReset() {
  filters.keyword = ''
  filters.caseLevel = ''
  filters.teachingPhase = ''
  filters.dept = ''
  filters.companionStatus = ''
  currentPage.value = 1
}
function refreshList() { toast.info('列表已刷新') }

function openAICompanion(item) {
  router.push({ name: 'aiCompanionDetail', query: { caseId: item.id } })
}

function enableCompanion(item) {
  item.companionReady = true
  toast.info(`已为「${item.title}」开通AI伴学`)
}

function batchOpenCompanion() {
  selectedRows.value.forEach(id => {
    const item = allData.value.find(d => d.id === id)
    if (item) item.companionReady = true
  })
  toast.info(`已为 ${selectedRows.value.length} 个病例开通AI伴学`)
  selectedRows.value = []
}

function editCase(item) {
  router.push({ name: 'caseEditor', params: { caseId: item.caseId } })
}
</script>

<style scoped>
.content-container { /* inherits app-content padding */ }

.filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: flex-end;
}
.filter-item { display: flex; flex-direction: column; gap: 4px; }
.filter-item label { font-size: 12px; color: var(--text-secondary); }

.table-wrapper { overflow-x: auto; }
.table { width: 100%; border-collapse: collapse; }
.table th, .table td { padding: 12px 16px; text-align: left; font-size: 13px; border-bottom: 1px solid var(--border); white-space: nowrap; }
.table th { background: #fafcff; font-weight: 600; color: var(--text-secondary); font-size: 12px; text-transform: uppercase; }
.table tbody tr:hover td { background: #fafafa; }

.sticky-left { position: sticky; z-index: 1; background: inherit; }
.sticky-right { position: sticky; z-index: 1; background: inherit; }
.table tbody tr:hover .sticky-left,
.table tbody tr:hover .sticky-right { background: #fafafa; }

.flex { display: flex; }
.gap-2 { gap: 8px; }
.items-center { align-items: center; }
.justify-between { justify-content: space-between; }
.text-secondary { color: var(--text-secondary); font-size: 13px; }
.mb-4 { margin-bottom: 16px; }
.mt-4 { margin-top: 16px; }
.w-full { width: 100%; }
</style>
