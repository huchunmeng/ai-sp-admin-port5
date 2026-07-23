<template>
  <div class="content-container">
    <div class="flex justify-between items-center mb-4">
      <div>
        <h2>专家管理</h2>
        <p class="text-secondary" style="font-size:13px;">审核专家库管理与维护</p>
      </div>
      <button class="btn btn-primary" @click="addExpert">+ 新增专家</button>
    </div>

    <div class="card mb-4" style="padding: 20px;">
      <div class="filter-row">
        <div class="filter-item" style="min-width: 160px;">
          <label>专家姓名</label>
          <input class="input" placeholder="搜索姓名" v-model="filters.keyword" @keyup.enter="handleSearch">
        </div>
        <div class="filter-item">
          <label>来源机构</label>
          <select class="select" v-model="filters.institution">
            <option value="">全部</option>
            <option v-for="inst in allInstitutions" :key="inst" :value="inst">{{ inst }}</option>
          </select>
        </div>
        <div class="filter-item">
          <label>科室</label>
          <select class="select" v-model="filters.department">
            <option value="">全部</option>
            <option v-for="dept in departments" :key="dept" :value="dept">{{ dept }}</option>
          </select>
        </div>
        <div class="filter-item">
          <label>职称</label>
          <select class="select" v-model="filters.title">
            <option value="">全部</option>
            <option value="professor">教授/主任医师</option>
            <option value="associate">副教授/副主任医师</option>
            <option value="attending">主治医师</option>
          </select>
        </div>
        <div class="filter-item">
          <label>状态</label>
          <select class="select" v-model="filters.status">
            <option value="">全部</option>
            <option value="active">启用</option>
            <option value="inactive">停用</option>
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
              <th>专家编号</th>
              <th>姓名</th>
              <th>来源机构</th>
              <th>科室</th>
              <th>职称</th>
              <th>审核数量</th>
              <th>加入时间</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in tableData" :key="item.id">
              <td style="color:var(--text-tertiary);">{{ item.code }}</td>
              <td style="font-weight:600;">{{ item.name }}</td>
              <td>{{ item.institution }}</td>
              <td>{{ item.department }}</td>
              <td>{{ item.title }}</td>
              <td>{{ item.reviewCount }}</td>
              <td>{{ item.joinDate }}</td>
              <td><span class="badge" :class="item.status === 'active' ? 'badge-success' : 'badge-error'">{{ item.status === 'active' ? '启用' : '停用' }}</span></td>
              <td>
                <a class="action-link" @click="viewDetail(item)">详情</a>
                <a class="action-link" @click="editExpert(item)">编辑</a>
                <a class="action-link" @click="toggleStatus(item)">
                  {{ item.status === 'active' ? '停用' : '启用' }}
                </a>
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

    <div v-if="detailVisible" class="modal-overlay" @click.self="detailVisible = false">
      <div class="modal-container" style="width: 480px;">
        <div class="drawer-header"><span>专家详情</span><button class="btn btn-sm" @click="detailVisible = false">✕</button></div>
        <div class="drawer-body">
          <div v-if="detailItem" style="display:grid; grid-template-columns: 80px 1fr; gap: 10px; font-size: 13px;">
            <span class="text-secondary">姓名</span><span style="font-weight:600;">{{ detailItem.name }}</span>
            <span class="text-secondary">编号</span><span>{{ detailItem.code }}</span>
            <span class="text-secondary">机构</span><span>{{ detailItem.institution }}</span>
            <span class="text-secondary">科室</span><span>{{ detailItem.department }}</span>
            <span class="text-secondary">职称</span><span>{{ detailItem.title }}</span>
            <span class="text-secondary">审核数量</span><span>{{ detailItem.reviewCount }}</span>
            <span class="text-secondary">加入时间</span><span>{{ detailItem.joinDate }}</span>
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

const filters = ref({ keyword: '', institution: '', department: '', title: '', status: '' })
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const tableData = ref([])
const detailVisible = ref(false)
const detailItem = ref(null)

const allInstitutions = ['仁爱医院', '华西医院', '中山医院', '协和医院', '同济医院', '省立医院']
const departments = ['内科', '外科', '妇产科', '儿科', '急诊科', '全科', '麻醉科', '影像科']
const titles = ['教授/主任医师', '副教授/副主任医师', '主治医师']
const names = ['张明', '李华', '王芳', '赵强', '陈静', '刘伟', '周敏', '吴涛', '郑丽', '孙磊']

const allData = ref([])
const generateMock = () => {
  const data = []
  for (let i = 1; i <= 25; i++) {
    data.push({
      id: `expert_${i}`,
      code: `EXP-${String(i).padStart(4, '0')}`,
      name: names[i % names.length] + (i > 10 ? String(i) : ''),
      institution: allInstitutions[i % allInstitutions.length],
      department: departments[i % departments.length],
      title: titles[i % titles.length],
      reviewCount: Math.floor(Math.random() * 200) + 20,
      joinDate: `202${Math.floor(Math.random() * 6)}-0${Math.floor(Math.random() * 9) + 1}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
      status: i % 5 === 0 ? 'inactive' : 'active'
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
  if (filters.value.department) filtered = filtered.filter(e => e.department === filters.value.department)
  if (filters.value.title) filtered = filtered.filter(e => e.title === filters.value.title)
  if (filters.value.status) filtered = filtered.filter(e => e.status === filters.value.status)
  total.value = filtered.length
  const start = (currentPage.value - 1) * pageSize.value
  tableData.value = filtered.slice(start, start + pageSize.value)
}

const handleSearch = () => { currentPage.value = 1; fetchData() }
const handleReset = () => { filters.value = { keyword: '', institution: '', department: '', title: '', status: '' }; handleSearch() }

const addExpert = () => toast.show('【演示】新增专家')
const viewDetail = (item) => { detailItem.value = item; detailVisible.value = true }
const editExpert = (item) => toast.show(`编辑专家：${item.name}（演示）`)
const toggleStatus = (item) => {
  item.status = item.status === 'active' ? 'inactive' : 'active'
  toast.show(`专家「${item.name}」已${item.status === 'active' ? '启用' : '停用'}`)
}

const totalPages = computed(() => Math.ceil(total.value / pageSize.value) || 1)
const onPageSizeChange = () => { currentPage.value = 1; fetchData() }

watch(currentPage, () => fetchData())
onMounted(() => { fetchData() })
</script>
