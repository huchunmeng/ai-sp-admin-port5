<template>
  <div class="content-container">
    <div class="card mb-4" style="padding: 20px;">
      <div class="filter-row">
        <div class="filter-item" style="min-width: 200px;">
          <label>考核名称</label>
          <input class="input" placeholder="考核名称" v-model="filters.keyword" @keyup.enter="handleSearch">
        </div>
        <div class="filter-item">
          <label>状态</label>
          <select class="select" v-model="filters.status">
            <option value="">全部</option>
            <option value="draft">草稿</option>
            <option value="active">进行中</option>
            <option value="paused">已暂停</option>
            <option value="ended">已结束</option>
            <option value="archived">已归档</option>
          </select>
        </div>
        <div class="filter-item">
          <label>考核大类</label>
          <select class="select" v-model="filters.typeCategory">
            <option value="">全部</option>
            <option value="residency">住培</option>
            <option value="college">院校</option>
          </select>
        </div>
        <div class="filter-item">
          <label>来源机构</label>
          <select class="select" v-model="filters.institution">
            <option value="">全部</option>
            <option v-for="inst in allInstitutions" :key="inst" :value="inst">{{ inst }}</option>
          </select>
        </div>
        <div class="filter-item" style="min-width: 200px;">
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

    <div class="mb-4">
      <div class="flex gap-2">
        <button class="btn btn-primary flex items-center gap-1" @click="createExam">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
          新建考核
        </button>
        <button class="btn flex items-center gap-1" @click="handleExport">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17h16"/></svg>
          导出
        </button>
      </div>
    </div>

    <div class="card" style="padding: 0;">
      <div class="table-wrapper">
        <table class="table">
          <thead>
            <tr>
              <th class="sticky-left" style="left:0; min-width:220px">考核名称</th>
              <th>考核专业</th>
              <th>考核类型</th>
              <th>考试口令</th>
              <th>开始时间</th>
              <th>结束时间</th>
              <th>状态</th>
              <th>考生数</th>
              <th>来源机构</th>
              <th>创建时间</th>
              <th>创建人</th>
              <th>最近编辑</th>
              <th>操作人</th>
              <th class="sticky-right" style="right:0; min-width:160px">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in tableData" :key="item.id">
              <td class="sticky-left" style="left:0">
                <a href="#" @click.prevent="openMonitor(item)" style="color:var(--primary);text-decoration:none;font-weight:500">{{ item.name }}</a>
              </td>
              <td>
                <div class="flex gap-1 flex-wrap">
                  <span v-for="m in item.majors.slice(0,2)" class="badge badge-info">{{ m }}</span>
                  <span v-if="item.majors.length > 2" class="text-primary text-sm cursor-pointer" style="text-decoration:underline" @click.stop="showMajorsPopup = item.majors">+{{ item.majors.length-2 }}</span>
                </div>
              </td>
              <td>{{ item.subtype_label }}</td>
              <td>
                <code style="background:#f3f4f6;padding:2px 6px;border-radius:4px;">{{ item.access_code }}</code>
                <span class="copy-icon" @click="copyCode(item.access_code)" style="cursor:pointer; margin-left:4px;">📋</span>
              </td>
              <td>{{ item.start_time }}</td>
              <td>{{ item.end_time }}</td>
              <td><span class="badge" :class="statusBadgeClass(item.status)">{{ item.status_label }}</span></td>
              <td>{{ item.candidate_count }}</td>
              <td>{{ item.institution }}</td>
              <td>{{ item.created_at }}</td>
              <td>{{ item.creator || '管理员' }}</td>
              <td>{{ item.last_edit || '2026-04-30 10:00' }}</td>
              <td>{{ item.operator || '管理员' }}</td>
              <td class="sticky-right whitespace-nowrap" style="right:0">
                <a class="action-link" @click="editExam(item.id)">编辑</a>
                <a class="action-link" @click="copyExam(item)">复制</a>
                <a v-if="item.status === 'draft'" class="action-link action-danger" @click="deleteExam(item.id)">删除</a>
                <a v-if="item.status === 'draft'" class="action-link" @click="startExam(item.id)">启动</a>
                <a v-if="item.status === 'active'" class="action-link" @click="pauseExam(item.id)">暂停</a>
                <a v-if="item.status === 'active' || item.status === 'paused'" class="action-link" @click="endExam(item.id)">结束</a>
              </td>
            </tr>
            <tr v-if="tableData.length === 0">
              <td :colspan="14" class="text-center py-8 text-secondary">暂无数据</td>
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

    <div v-if="deleteVisible" class="modal-overlay" @click.self="deleteVisible = false">
      <div class="modal-container" style="width: 400px;">
        <div class="drawer-header"><span>确认删除</span><button class="btn-default btn-sm" @click="deleteVisible = false">✕</button></div>
        <div class="drawer-body"><p>确定要删除考核「{{ deleteTargetName }}」吗？删除后不可恢复。</p></div>
        <div class="drawer-footer" style="justify-content: flex-end;"><button class="btn" @click="deleteVisible = false">取消</button><button class="btn btn-danger" @click="confirmDelete">确认删除</button></div>
      </div>
    </div>

    <div v-if="showMajorsPopup" class="modal-overlay" @click.self="showMajorsPopup = null">
      <div class="modal-container" style="width: 400px; padding: 24px;">
        <h3 style="margin-bottom:16px">全部考核专业</h3>
        <div class="flex gap-2 flex-wrap">
          <span v-for="m in showMajorsPopup" :key="m" class="badge badge-info" style="font-size:14px; padding:4px 12px;">{{ m }}</span>
        </div>
        <button class="btn btn-primary mt-4 w-full" @click="showMajorsPopup = null">关闭</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { toast, confirm, generateExamRecords } from '@ai-sp/shared'

const filters = ref({ keyword: '', status: '', typeCategory: '', institution: '', dateFrom: '' })
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const tableData = ref([])
const deleteVisible = ref(false)
const deleteTargetId = ref(null)
const deleteTargetName = ref('')
const showMajorsPopup = ref(null)

const allInstitutions = ['仁爱医院', '华西医院', '中山医院', '协和医院', '同济医院', '省立医院']

const allExams = ref(generateExamRecords(5))

const fetchData = () => {
  let filtered = [...allExams.value]
  const kw = filters.value.keyword
  if (kw) filtered = filtered.filter(e => e.name.includes(kw))
  if (filters.value.status) filtered = filtered.filter(e => e.status === filters.value.status)
  if (filters.value.typeCategory) filtered = filtered.filter(e => e.typeCategory === filters.value.typeCategory)
  if (filters.value.institution) filtered = filtered.filter(e => e.institution === filters.value.institution)
  if (filters.value.dateFrom) filtered = filtered.filter(e => e.start_time >= filters.value.dateFrom)
  total.value = filtered.length
  const start = (currentPage.value - 1) * pageSize.value
  tableData.value = filtered.slice(start, start + pageSize.value)
}

const handleSearch = () => { currentPage.value = 1; fetchData() }
const handleReset = () => { filters.value = { keyword: '', status: '', typeCategory: '', institution: '', dateFrom: '' }; handleSearch() }
const createExam = () => { toast.show('【演示】跳转至新建考核页面', 'info') }
const editExam = (id) => { toast.show(`【演示】编辑考核：${id}`, 'info') }
const copyExam = (item) => toast.show(`复制考核 ${item.name}（演示）`)
const deleteExam = (id) => { const exam = allExams.value.find(x => x.id === id); if (exam) { deleteTargetId.value = id; deleteTargetName.value = exam.name; deleteVisible.value = true } }
const confirmDelete = () => { const idx = allExams.value.findIndex(x => x.id === deleteTargetId.value); if (idx !== -1) allExams.value.splice(idx, 1); deleteVisible.value = false; fetchData() }
const startExam = (id) => { const exam = allExams.value.find(x => x.id === id); if (exam && exam.status === 'draft') { exam.status = 'active'; exam.status_label = '进行中'; fetchData(); toast.show('考核已启动') } }
const pauseExam = (id) => { const exam = allExams.value.find(x => x.id === id); if (exam && exam.status === 'active') { exam.status = 'paused'; exam.status_label = '已暂停'; fetchData(); toast.show('考核已暂停') } }
const endExam = (id) => { const exam = allExams.value.find(x => x.id === id); if (exam && (exam.status === 'active' || exam.status === 'paused')) { exam.status = 'ended'; exam.status_label = '已结束'; fetchData(); toast.show('考核已结束') } }
const handleExport = () => toast.show(`导出当前筛选结果共 ${total.value} 条（演示）`)
const copyCode = (code) => { try { navigator.clipboard.writeText(code).then(() => toast.show('口令已复制')).catch(() => fallbackCopy(code)) } catch (e) { fallbackCopy(code) } }
const fallbackCopy = (code) => { const ta = document.createElement('textarea'); ta.value = code; ta.style.cssText = 'position:fixed;left:-9999px'; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); toast.show('口令已复制') }
const statusBadgeClass = (status) => { const map = { draft:'badge-warning', active:'badge-success', paused:'badge-warning', ended:'badge-info', archived:'badge-error' }; return map[status] || '' }
const totalPages = computed(() => Math.ceil(total.value / pageSize.value) || 1)
const onPageSizeChange = () => { currentPage.value = 1; fetchData() }

watch(currentPage, () => fetchData())
watch(pageSize, () => { currentPage.value = 1 })
onMounted(() => { fetchData() })

const openMonitor = (exam) => {
  toast.show(`【演示】打开监考面板：${exam.name}`, 'info')
}
</script>
