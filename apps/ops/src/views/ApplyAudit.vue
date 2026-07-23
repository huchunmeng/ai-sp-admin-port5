<template>
  <div class="content-container">
    <h2 style="margin-bottom:4px;">申请审核</h2>
    <p class="text-secondary mb-4" style="font-size:13px;">机构申请与变更审核处理</p>

    <div class="card mb-4" style="padding: 20px;">
      <div class="filter-row">
        <div class="filter-item" style="min-width: 180px;">
          <label>申请编号/名称</label>
          <input class="input" placeholder="搜索编号或名称" v-model="filters.keyword" @keyup.enter="handleSearch">
        </div>
        <div class="filter-item">
          <label>申请类型</label>
          <select class="select" v-model="filters.applyType">
            <option value="">全部</option>
            <option value="institution_join">机构入驻</option>
            <option value="case_submit">病例提交</option>
            <option value="expert_apply">专家认证</option>
            <option value="info_change">信息变更</option>
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
            <option value="pending">待审核</option>
            <option value="approved">已通过</option>
            <option value="rejected">已驳回</option>
          </select>
        </div>
        <div class="filter-item" style="min-width: 160px;">
          <label>申请时间</label>
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
              <th>申请编号</th>
              <th>申请名称</th>
              <th>类型</th>
              <th>来源机构</th>
              <th>申请人</th>
              <th>申请时间</th>
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
              <td>{{ item.applicant }}</td>
              <td>{{ item.applyTime }}</td>
              <td><span class="badge" :class="statusBadgeClass(item.status)">{{ item.statusLabel }}</span></td>
              <td>
                <a v-if="item.status === 'pending'" class="action-link" @click="approveItem(item)">通过</a>
                <a v-if="item.status === 'pending'" class="action-link action-danger" @click="rejectItem(item)">驳回</a>
                <a class="action-link" @click="viewDetail(item)">详情</a>
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

    <div v-if="rejectVisible" class="modal-overlay" @click.self="rejectVisible = false">
      <div class="modal-container" style="width: 440px;">
        <div class="drawer-header"><span>驳回申请</span><button class="btn btn-sm" @click="rejectVisible = false">✕</button></div>
        <div class="drawer-body">
          <p style="margin-bottom:12px;">确定驳回「{{ rejectItemName }}」吗？</p>
          <label class="text-secondary" style="font-size:12px;">驳回原因</label>
          <textarea v-model="rejectReason" class="input w-full mt-2" rows="3" placeholder="请输入驳回原因..." style="width:100%;resize:vertical;"></textarea>
        </div>
        <div class="drawer-footer">
          <button class="btn" @click="rejectVisible = false">取消</button>
          <button class="btn btn-danger" @click="confirmReject">确认驳回</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { toast } from '@ai-sp/shared'

const filters = ref({ keyword: '', applyType: '', institution: '', status: '', dateFrom: '' })
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const tableData = ref([])
const rejectVisible = ref(false)
const rejectItemName = ref('')
const rejectTargetId = ref(null)
const rejectReason = ref('')

const allInstitutions = ['仁爱医院', '华西医院', '中山医院', '协和医院', '同济医院', '省立医院']

const applyTypes = ['institution_join', 'case_submit', 'expert_apply', 'info_change']
const typeLabels = { institution_join: '机构入驻', case_submit: '病例提交', expert_apply: '专家认证', info_change: '信息变更' }
const statuses = ['pending', 'approved', 'rejected']
const statusLabels = { pending: '待审核', approved: '已通过', rejected: '已驳回' }
const applyNames = ['仁爱医院入驻申请', '华西医院病例提交', '专家认证-张明', '中山医院信息变更', '协和医院病例提交', '专家认证-李华']
const applicants = ['张院长', '李主任', '张明', '王科长', '赵主任', '李华']

const allData = ref([])
const generateMock = () => {
  const data = []
  for (let i = 1; i <= 26; i++) {
    const type = applyTypes[i % 4]
    const status = statuses[i % 3]
    data.push({
      id: `apply_${i}`,
      code: `APL-${String(i).padStart(4, '0')}`,
      name: applyNames[i % applyNames.length] + (i > 6 ? ` (${i})` : ''),
      type: type, typeLabel: typeLabels[type],
      institution: allInstitutions[i % allInstitutions.length],
      applicant: applicants[i % applicants.length] + (i > 6 ? String(i) : ''),
      applyTime: `2026-0${Math.floor(Math.random() * 5) + 1}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')} ${String(Math.floor(Math.random() * 24)).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`,
      status, statusLabel: statusLabels[status],
      reason: ''
    })
  }
  return data
}
allData.value = generateMock()

const fetchData = () => {
  let filtered = [...allData.value]
  const kw = filters.value.keyword
  if (kw) filtered = filtered.filter(e => e.name.includes(kw) || e.code.includes(kw))
  if (filters.value.applyType) filtered = filtered.filter(e => e.type === filters.value.applyType)
  if (filters.value.institution) filtered = filtered.filter(e => e.institution === filters.value.institution)
  if (filters.value.status) filtered = filtered.filter(e => e.status === filters.value.status)
  if (filters.value.dateFrom) filtered = filtered.filter(e => e.applyTime >= filters.value.dateFrom)
  total.value = filtered.length
  const start = (currentPage.value - 1) * pageSize.value
  tableData.value = filtered.slice(start, start + pageSize.value)
}

const handleSearch = () => { currentPage.value = 1; fetchData() }
const handleReset = () => { filters.value = { keyword: '', applyType: '', institution: '', status: '', dateFrom: '' }; handleSearch() }

const statusBadgeClass = (s) => ({ pending: 'badge-warning', approved: 'badge-success', rejected: 'badge-error' }[s] || '')

const viewDetail = (item) => toast.show(`查看申请详情：${item.name}（演示）`)
const approveItem = (item) => {
  const found = allData.value.find(x => x.id === item.id)
  if (found) {
    found.status = 'approved'
    found.statusLabel = '已通过'
    fetchData()
    toast.show(`申请「${item.name}」已通过`)
  }
}
const rejectItem = (item) => {
  rejectTargetId.value = item.id
  rejectItemName.value = item.name
  rejectReason.value = ''
  rejectVisible.value = true
}
const confirmReject = () => {
  const found = allData.value.find(x => x.id === rejectTargetId.value)
  if (found) {
    found.status = 'rejected'
    found.statusLabel = '已驳回'
    found.reason = rejectReason.value
    fetchData()
  }
  rejectVisible.value = false
  toast.show('申请已驳回')
}

const totalPages = computed(() => Math.ceil(total.value / pageSize.value) || 1)
const onPageSizeChange = () => { currentPage.value = 1; fetchData() }

watch(currentPage, () => fetchData())
onMounted(() => { fetchData() })
</script>
