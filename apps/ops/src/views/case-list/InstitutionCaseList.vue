<template>
  <div class="content-container">
    <div class="card mb-4">
      <div class="filter-row">
        <div class="filter-item" style="min-width:200px"><label>搜索</label><input class="input" placeholder="病例标题 / ID" v-model="filters.keyword" @input="debouncedSearch"></div>
        <div class="filter-item"><label>阶段</label><select class="select" v-model="filters.teaching_phase" @change="onPhaseChange"><option value="">全部</option><option v-for="p in dict.teaching_phases" :value="p">{{ p }}</option></select></div>
        <div class="filter-item"><label>专业</label><SearchSelect v-model="filters.specialty" :options="availableSpecialties" placeholder="全部" @change="onSpecialtyChange" :disabled="!filters.teaching_phase" /></div>
        <div class="filter-item"><label>分类</label><SearchSelect v-model="filters.category" :options="availableCategories" placeholder="全部" @change="onCategoryChange" :disabled="!filters.specialty" /></div>
        <div class="filter-item"><label>病种</label><SearchSelect v-model="filters.disease" :options="availableDiseases" placeholder="全部" :disabled="!filters.category" /></div>
        <div class="filter-item"><label>难度</label><select class="select" v-model="filters.difficulty"><option value="">全部</option><option>L1</option><option>L2</option><option>L3</option></select></div>
      </div>
      <div class="filter-row mt-4">
        <div class="filter-item"><label>AI质检</label><select class="select" v-model="filters.ai_quality_status"><option value="">全部</option><option>待质检</option><option>已通过</option><option>未通过</option></select></div>
        <div class="filter-item"><label>基地审核</label><select class="select" v-model="filters.base_review_status"><option value="">全部</option><option>待审核</option><option>已通过</option><option>未通过</option></select></div>
        <div class="filter-item"><label>来源机构</label><select class="select" v-model="filters.institution"><option value="">全部</option><option v-for="inst in allInstitutions" :key="inst" :value="inst">{{ inst }}</option></select></div>
        <div class="filter-item"><label>&nbsp;</label><div class="flex gap-2"><button class="btn btn-primary" @click="handleSearch">搜索</button><button class="btn" @click="handleReset">重置</button></div></div>
      </div>
    </div>

    <div class="flex items-center justify-between mb-4">
      <div class="flex gap-2"><button class="btn" :disabled="selectedRows.length === 0" @click="batchEnable" data-reviewable="批量启用">批量启用</button><button class="btn" :disabled="selectedRows.length === 0" @click="batchDisable" data-reviewable="批量禁用">批量禁用</button><button class="btn btn-danger" :disabled="selectedRows.length === 0" @click="batchDelete" data-reviewable="批量删除">批量删除</button></div>
      <div class="flex gap-2 relative"><button class="btn btn-primary" @click="createCase">+ 新建病例</button><button class="btn" @click="exportList">导出列表</button><div style="position:relative"><button class="btn btn-icon" @click="showColumnSettings = !showColumnSettings"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H5.78a1.65 1.65 0 0 0-1.51 1 1.65 1.65 0 0 0 .33 1.82l.04.04A10 10 0 0 0 12 17.66a10 10 0 0 0 6.36-2.62l.04-.04z"/></svg></button><div v-if="showColumnSettings" class="column-settings-panel"><div class="flex justify-between items-center mb-3"><span style="font-weight:500">列显示设置</span><button class="btn btn-sm" @click="resetColumnSettings">重置</button></div><div v-for="col in allColumns" :key="col.key" class="flex items-center gap-2 mb-2"><input type="checkbox" :value="col.key" v-model="visibleColumns" style="width:16px;height:16px"><span>{{ col.label }}</span></div><button class="btn btn-primary w-full mt-3" @click="showColumnSettings = false">确定</button></div></div></div>
    </div>

    <div class="card" style="padding:0">
      <div class="table-wrapper">
        <table class="table">
          <thead>
            <tr>
              <th class="sticky-left" style="left:0; width:40px"><input type="checkbox" :checked="selectAll" @change="toggleSelectAll"></th>
              <th class="sticky-left" style="left:40px" v-if="visibleColumns.includes('title')">病例标题</th>
              <th v-if="visibleColumns.includes('case_id')">病例ID</th>
              <th v-if="visibleColumns.includes('patient_info')">患者信息</th>
              <th v-if="visibleColumns.includes('teaching_phase')">阶段</th>
              <th v-if="visibleColumns.includes('specialty')">专业</th>
              <th v-if="visibleColumns.includes('category')">分类</th>
              <th v-if="visibleColumns.includes('disease')">病种</th>
              <th v-if="visibleColumns.includes('difficulty')">难度</th>
              <th v-if="visibleColumns.includes('version')">版本</th>
              <th v-if="visibleColumns.includes('ai_quality_status')">AI质检</th>
              <th v-if="visibleColumns.includes('base_review_status')">基地审核</th>
              <th v-if="visibleColumns.includes('institution')">来源机构</th>
              <th v-if="visibleColumns.includes('creator_name')">创建人</th>
              <th v-if="visibleColumns.includes('created_at')">创建时间</th>
              <th class="sticky-right" style="right:180px">启用状态</th>
              <th class="sticky-right" style="right:0; min-width:160px">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in paginatedData" :key="item.id">
              <td class="sticky-left" style="left:0"><input type="checkbox" v-model="selectedRows" :value="item.id"></td>
              <td class="sticky-left" style="left:40px" v-if="visibleColumns.includes('title')"><a href="#" @click.prevent="openDetail(item)" style="color:var(--primary);text-decoration:none">{{ item.title }}</a></td>
              <td v-if="visibleColumns.includes('case_id')"><code style="background:#f3f4f6;padding:2px 6px;border-radius:4px">{{ item.case_id }}</code></td>
              <td v-if="visibleColumns.includes('patient_info')">{{ getPatientInfo(item) }}</td>
              <td v-if="visibleColumns.includes('teaching_phase')">{{ item.teaching_phase }}</td>
              <td v-if="visibleColumns.includes('specialty')">{{ item.specialty }}</td>
              <td v-if="visibleColumns.includes('category')">{{ item.category }}</td>
              <td v-if="visibleColumns.includes('disease')">{{ item.disease }}</td>
              <td v-if="visibleColumns.includes('difficulty')"><span class="badge" :class="{'badge-info': item.difficulty==='L1','badge-warning': item.difficulty==='L2','badge-error': item.difficulty==='L3'}">{{ item.difficulty }}</span></td>
              <td v-if="visibleColumns.includes('version')"><a href="#" @click.prevent="showVersionHistory(item)" style="color:var(--primary);text-decoration:none; cursor:pointer">{{ item.version }}</a></td>
              <td v-if="visibleColumns.includes('ai_quality_status')"><span class="badge" :class="statusBadgeClass(item.ai_quality_status)">{{ item.ai_quality_status }}</span></td>
              <td v-if="visibleColumns.includes('base_review_status')"><span class="badge" :class="statusBadgeClass(item.base_review_status)">{{ item.base_review_status }}</span></td>
              <td v-if="visibleColumns.includes('institution')">{{ item.institution }}</td>
              <td v-if="visibleColumns.includes('creator_name')">{{ item.creator_name }}</td>
              <td v-if="visibleColumns.includes('created_at')">{{ item.created_at }}</td>
              <td class="sticky-right" style="right:180px"><label class="switch"><input type="checkbox" v-model="item.enabled"><span class="slider"></span></label></td>
              <td class="sticky-right" style="right:0"><div class="flex gap-2"><button class="btn btn-sm" @click="editCase(item)">编辑</button><button class="btn btn-sm" @click="copyCase(item)" :disabled="item.enabled">复制</button><button class="btn btn-sm btn-danger" @click="deleteCase(item)" :disabled="item.enabled">删除</button></div></td>
            </tr>
            <tr v-if="filteredData.length === 0"><td :colspan="visibleColumns.length + 3" style="text-align:center;padding:40px;color:var(--text-secondary)">暂无数据</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="flex items-center justify-between mt-4">
      <div class="text-secondary">共 {{ filteredData.length }} 条记录</div>
      <div class="flex gap-2"><button class="btn btn-sm" :disabled="currentPage === 1" @click="currentPage--">上一页</button><span class="flex items-center px-3">{{ currentPage }} / {{ totalPages }}</span><button class="btn btn-sm" :disabled="currentPage === totalPages" @click="currentPage++">下一页</button><select class="select" style="width:100px" v-model="pageSize"><option :value="10">10条/页</option><option :value="20">20条/页</option><option :value="50">50条/页</option></select></div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import SearchSelect from '@/components/SearchSelect.vue'
import { dict } from '@/composables/shared.js'
import { toast, confirm, useDebounce } from '@ai-sp/shared'

const filters = reactive({
  keyword: '', teaching_phase: '', specialty: '', category: '', disease: '', difficulty: '',
  ai_quality_status: '', base_review_status: '', institution: ''
})

const allInstitutions = ['仁爱医院', '华西医院', '中山医院', '协和医院', '同济医院']

const availableSpecialties = computed(() => dict.specialties)
const availableCategories = computed(() =>
  filters.specialty ? dict.categoriesMap[filters.specialty] || [] : []
)
const availableDiseases = computed(() =>
  filters.category ? dict.diseasesMap[filters.category] || [] : []
)

const onPhaseChange = () => { filters.specialty = ''; filters.category = ''; filters.disease = '' }
const onSpecialtyChange = () => { filters.category = ''; filters.disease = '' }
const onCategoryChange = () => { filters.disease = '' }

const mockData = () => [
  { id:101, case_id:'ORT-20260417-LDH03', title:'慢性心力衰竭', teaching_phase:'住院医师', specialty:'内科', category:'心内科', disease:'心衰', difficulty:'L2', version:'v1.1.0', ai_quality_status:'已通过', base_review_status:'已通过', institution:'仁爱医院', creator_name:'李医师', created_at:'2026-03-20 09:15', enabled:true, patient_name:'王德明', patient_gender:'男', patient_age:'65' },
  { id:102, case_id:'IM-20240520-A1B2', title:'新生儿黄疸', teaching_phase:'本科教学', specialty:'儿科', category:'新生儿科', disease:'黄疸', difficulty:'L1', version:'v1.0.0', ai_quality_status:'待质检', base_review_status:'待审核', institution:'华西医院', creator_name:'王主任', created_at:'2026-04-10 14:30', enabled:true, patient_name:'张宝宝', patient_gender:'女', patient_age:'0.2' },
  { id:103, case_id:'ORT-20260417-LDH03', title:'急性阑尾炎', teaching_phase:'专科培训', specialty:'外科', category:'普外科', disease:'阑尾炎', difficulty:'L3', version:'v2.0.1', ai_quality_status:'已通过', base_review_status:'未通过', institution:'中山医院', creator_name:'张医师', created_at:'2026-02-15 11:20', enabled:false, patient_name:'李明', patient_gender:'男', patient_age:'32' },
  { id:104, case_id:'IM-20240520-A1B2', title:'妊娠期糖尿病', teaching_phase:'住院医师', specialty:'妇产科', category:'产科', disease:'妊娠期糖尿病', difficulty:'L2', version:'v1.3.0', ai_quality_status:'已通过', base_review_status:'已通过', institution:'协和医院', creator_name:'赵医生', created_at:'2026-01-05 16:00', enabled:true, patient_name:'王芳', patient_gender:'女', patient_age:'30' },
  { id:105, case_id:'ORT-20260417-LDH03', title:'过敏性休克', teaching_phase:'本科教学', specialty:'急诊科', category:'急诊内科', disease:'过敏', difficulty:'L1', version:'v1.0.2', ai_quality_status:'未通过', base_review_status:'未通过', institution:'同济医院', creator_name:'刘医师', created_at:'2026-04-22 08:45', enabled:true, patient_name:'陈华', patient_gender:'男', patient_age:'28' }
]

const allData = ref(mockData())
const selectedRows = ref([])
const currentPage = ref(1)
const pageSize = ref(10)

const allColumns = [
  { key: 'title', label: '病例标题' }, { key: 'case_id', label: '病例ID' }, { key: 'patient_info', label: '患者信息' },
  { key: 'teaching_phase', label: '阶段' }, { key: 'specialty', label: '专业' }, { key: 'category', label: '分类' },
  { key: 'disease', label: '病种' }, { key: 'difficulty', label: '难度' }, { key: 'version', label: '版本' },
  { key: 'ai_quality_status', label: 'AI质检' }, { key: 'base_review_status', label: '基地审核' },
  { key: 'institution', label: '来源机构' },
  { key: 'creator_name', label: '创建人' }, { key: 'created_at', label: '创建时间' }
]

const visibleColumns = ref(allColumns.map(c => c.key))
const showColumnSettings = ref(false)
const resetColumnSettings = () => { visibleColumns.value = allColumns.map(c => c.key) }

const filteredData = computed(() => allData.value.filter(item => {
  if (filters.keyword && !item.title.includes(filters.keyword) && !item.case_id.includes(filters.keyword)) return false
  if (filters.teaching_phase && item.teaching_phase !== filters.teaching_phase) return false
  if (filters.specialty && item.specialty !== filters.specialty) return false
  if (filters.category && item.category !== filters.category) return false
  if (filters.disease && item.disease !== filters.disease) return false
  if (filters.difficulty && item.difficulty !== filters.difficulty) return false
  if (filters.ai_quality_status && item.ai_quality_status !== filters.ai_quality_status) return false
  if (filters.base_review_status && item.base_review_status !== filters.base_review_status) return false
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
    if (val) { paginatedData.value.forEach(item => { if (!selectedRows.value.includes(item.id)) selectedRows.value.push(item.id) }) }
    else { selectedRows.value = selectedRows.value.filter(id => !paginatedData.value.some(item => item.id === id)) }
  }
})
const toggleSelectAll = () => { selectAll.value = !selectAll.value }
watch(() => ({ ...filters }), () => { currentPage.value = 1 })
const { debounced: debouncedSearch } = useDebounce(() => { currentPage.value = 1 }, 250)
const handleSearch = () => { currentPage.value = 1 }
const handleReset = () => { Object.keys(filters).forEach(k => filters[k] = ''); currentPage.value = 1 }
const batchEnable = () => { allData.value.forEach(item => { if (selectedRows.value.includes(item.id)) item.enabled = true }); selectedRows.value = [] }
const batchDisable = () => { allData.value.forEach(item => { if (selectedRows.value.includes(item.id)) item.enabled = false }); selectedRows.value = [] }
const batchDelete = () => { confirm(`确定要删除选中的 ${selectedRows.value.length} 条病例吗？此操作不可恢复。`).then(ok => { if (ok) { allData.value = allData.value.filter(item => !selectedRows.value.includes(item.id)); selectedRows.value = [] } }).catch(() => {}) }
const openDetail = (item) => { toast.show(`查看病例：${item.title}`) }
const editCase = (item) => { toast.show(`编辑病例：${item.title}`) }
const copyCase = (item) => {
  if (item.enabled) { toast.show('启用状态下无法复制', 'warning'); return }
  const copy = { ...item, id: Date.now(), case_id: item.case_id + '-CP', title: item.title + ' (副本)', enabled: false }
  allData.value.unshift(copy)
  toast.show('病例已复制', 'success')
}
const deleteCase = (item) => {
  if (item.enabled) { toast.show('启用状态下无法删除', 'warning'); return }
  confirm(`确定删除病例「${item.title}」吗？此操作不可恢复。`).then(ok => {
    if (ok) { allData.value = allData.value.filter(d => d.id !== item.id); toast.show('病例已删除', 'success') }
  }).catch(() => {})
}
const showVersionHistory = (item) => { toast.show(`版本历史：${item.title}`) }
const createCase = () => { toast.show('【演示】跳转至新建病例页面') }
const exportList = () => { toast.show('导出功能开发中（演示）') }
const statusBadgeClass = (status) => {
  if (status.includes('通过')) return 'badge-success'
  if (status.includes('未通过')) return 'badge-error'
  return 'badge-warning'
}
const getPatientInfo = (item) => {
  if (item.patient_name) return `${item.patient_name}（${item.patient_age}岁，${item.patient_gender}）`
  return '—'
}
</script>
