<template>
  <div class="content-container">
    <div class="editor-header">
      <div class="header-left">
        <h2 class="editor-title">{{ isEdit ? '编辑评分表' : '新建评分表' }}</h2>
        <span v-if="formData.id" class="case-id-badge">ID: {{ formData.id }}</span>
      </div>
      <div class="header-right">
        <button class="btn btn-outline" @click="handleCancel">返回</button>
        <button class="btn btn-primary" @click="handleSave">保存</button>
      </div>
    </div>

    <div class="card mb-4" style="padding:20px">
      <h4 style="margin-bottom:16px">基本信息</h4>
      <div class="filter-row">
        <div class="filter-item" style="min-width:200px">
          <label>评分表名称</label>
          <input class="input" v-model="formData.name" placeholder="输入评分表名称" style="width:100%">
        </div>
        <div class="filter-item" style="min-width:150px">
          <label>编码</label>
          <input class="input" v-model="formData.code" placeholder="自动生成或手动输入">
        </div>
        <div class="filter-item" style="min-width:150px">
          <label>类型</label>
          <select class="select" v-model="formData.type">
            <option value="history">病史采集</option>
            <option value="physical">体格检查</option>
            <option value="communication">人文沟通</option>
            <option value="analysis">病例分析</option>
            <option value="record">病历书写</option>
            <option value="comprehensive">综合评分</option>
          </select>
        </div>
        <div class="filter-item" style="min-width:180px">
          <label>来源机构</label>
          <select class="select" v-model="formData.institution">
            <option value="">选择机构</option>
            <option v-for="inst in allInstitutions" :key="inst" :value="inst">{{ inst }}</option>
          </select>
        </div>
        <div class="filter-item" style="min-width:150px">
          <label>专业</label>
          <select class="select" v-model="formData.specialty">
            <option value="">全部专业</option>
            <option v-for="s in specialties" :key="s" :value="s">{{ s }}</option>
          </select>
        </div>
        <div class="filter-item" style="min-width:120px">
          <label>状态</label>
          <select class="select" v-model="formData.status">
            <option value="draft">草稿</option>
            <option value="active">启用</option>
            <option value="archived">归档</option>
          </select>
        </div>
      </div>
      <div class="filter-row mt-4">
        <div class="filter-item" style="min-width:100%">
          <label>描述</label>
          <textarea class="input" v-model="formData.description" placeholder="评分表用途说明..." style="width:100%;min-height:60px"></textarea>
        </div>
      </div>
    </div>

    <div class="card mb-4" style="padding:20px">
      <div class="flex justify-between items-center mb-3">
        <h4 style="margin:0">评分项目</h4>
        <div class="flex gap-2">
          <button class="btn btn-sm" @click="addCategory">+ 添加分类</button>
          <button class="btn btn-sm btn-primary" @click="addItem">+ 添加评分项</button>
        </div>
      </div>

      <div class="table-wrapper">
        <table class="table">
          <thead>
            <tr>
              <th style="width:50px">#</th>
              <th style="width:160px">分类</th>
              <th style="min-width:200px">评分项</th>
              <th style="width:120px">评分要点</th>
              <th style="width:80px">满分</th>
              <th style="width:100px">必选</th>
              <th style="width:80px">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, idx) in formData.items" :key="idx">
              <td style="text-align:center">{{ idx + 1 }}</td>
              <td>
                <select class="select" v-model="item.category" style="width:100%">
                  <option value="">无分类</option>
                  <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
                </select>
              </td>
              <td><input class="input" v-model="item.name" placeholder="评分项名称" style="width:100%"></td>
              <td><input class="input" v-model="item.keyPoint" placeholder="评分要点" style="width:100%"></td>
              <td><input class="input" type="number" v-model.number="item.maxScore" min="0" max="100" style="width:100%"></td>
              <td style="text-align:center">
                <label class="switch">
                  <input type="checkbox" v-model="item.required">
                  <span class="slider"></span>
                </label>
              </td>
              <td>
                <button class="btn btn-sm" @click="moveItem(idx, -1)" :disabled="idx === 0">↑</button>
                <button class="btn btn-sm" @click="moveItem(idx, 1)" :disabled="idx === formData.items.length - 1">↓</button>
                <button class="btn btn-sm btn-danger" @click="removeItem(idx)">×</button>
              </td>
            </tr>
            <tr v-if="formData.items.length === 0">
              <td colspan="7" class="text-center py-8 text-secondary">暂无评分项目，请点击"添加评分项"</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="flex justify-between items-center mt-4" style="padding:12px 16px;background:#f9fafb;border-radius:8px">
        <span style="font-size:13px;color:var(--text-secondary)">共 {{ formData.items.length }} 项</span>
        <span style="font-size:14px;font-weight:600">总分：{{ totalScore }} 分</span>
      </div>
    </div>

    <div class="card mb-4" style="padding:20px" v-if="isEdit">
      <h4 style="margin-bottom:12px">操作记录</h4>
      <div class="table-wrapper">
        <table class="table">
          <thead><tr><th>时间</th><th>操作人</th><th>操作类型</th><th>摘要</th></tr></thead>
          <tbody>
            <tr v-for="log in operationLogs" :key="log.id">
              <td>{{ log.time }}</td><td>{{ log.operator }}</td>
              <td><span class="badge" :class="log.type === 'create' ? 'badge-success' : log.type === 'edit' ? 'badge-info' : 'badge-warning'">{{ log.typeLabel }}</span></td>
              <td>{{ log.summary }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast, confirm } from '@ai-sp/shared'

const route = useRoute()
const router = useRouter()

const isEdit = ref(false)
const allInstitutions = ['仁爱医院', '华西医院', '中山医院', '协和医院', '同济医院', '省立医院']
const specialties = ['内科', '外科', '儿科', '妇产科', '急诊科', '全科', '骨科/康复科']
const categories = ['一般项目', '主诉', '现病史', '既往史', '个人史与家族史', '系统回顾', '体格检查', '诊断', '治疗计划', '沟通与收尾', '总体评价']

const formData = ref({
  id: '',
  name: '',
  code: '',
  type: 'history',
  institution: '',
  specialty: '',
  status: 'draft',
  description: '',
  items: []
})

const operationLogs = ref([])

const totalScore = computed(() => {
  return formData.value.items.reduce((sum, item) => sum + (item.maxScore || 0), 0)
})

function addItem() {
  formData.value.items.push({
    category: '',
    name: '',
    keyPoint: '',
    maxScore: 0,
    required: false
  })
}

function addCategory() {
  const name = prompt('输入新分类名称：')
  if (name && name.trim() && !categories.includes(name.trim())) {
    categories.push(name.trim())
    toast.show(`已添加分类：${name.trim()}`)
  }
}

function removeItem(idx) {
  formData.value.items.splice(idx, 1)
}

function moveItem(idx, dir) {
  const newIdx = idx + dir
  if (newIdx < 0 || newIdx >= formData.value.items.length) return
  const temp = formData.value.items[idx]
  formData.value.items.splice(idx, 1)
  formData.value.items.splice(newIdx, 0, temp)
}

function handleSave() {
  if (!formData.value.name.trim()) {
    toast.show('请输入评分表名称', 'warning')
    return
  }
  if (formData.value.items.length === 0) {
    toast.show('请至少添加一个评分项', 'warning')
    return
  }
  toast.show(isEdit.value ? '评分表已更新' : '评分表已创建')
  router.back()
}

function handleCancel() {
  if (formData.value.name || formData.value.items.length > 0) {
    confirm('有未保存的内容，确定要返回吗？', { title: '确认离开', icon: 'fa-triangle-exclamation', iconClass: 'warning' })
      .then(confirmed => { if (confirmed) router.back() }).catch(() => {})
  } else {
    router.back()
  }
}

onMounted(() => {
  const editId = route.query.id
  if (editId) {
    isEdit.value = true
    formData.value = {
      id: editId,
      name: '病史采集标准评分表',
      code: 'SCORE-HISTORY-001',
      type: 'history',
      institution: '仁爱医院',
      specialty: '内科',
      status: 'active',
      description: '用于考核问诊站中病史采集能力的标准评分表，涵盖一般项目、主诉、现病史、既往史、个人史与家族史、系统回顾、沟通与收尾等维度。',
      items: [
        { category: '一般项目', name: '检查者自我介绍(姓名、职务或职责)', keyPoint: '身份确认', maxScore: 3, required: true },
        { category: '一般项目', name: '说明问诊目的及大致时长', keyPoint: '流程告知', maxScore: 2, required: true },
        { category: '一般项目', name: '核对患者姓名、性别、年龄', keyPoint: '信息核对', maxScore: 2, required: true },
        { category: '主诉', name: '准确获取核心症状', keyPoint: '症状锁定', maxScore: 3, required: true },
        { category: '主诉', name: '明确主诉持续时间与发作特点', keyPoint: '时间维度', maxScore: 3, required: true },
        { category: '现病史', name: '现病史起病时间与诱因', keyPoint: '起病诱因', maxScore: 3, required: true },
        { category: '现病史', name: '疼痛性质、部位、程度、放射', keyPoint: '四维特征', maxScore: 4, required: true },
        { category: '现病史', name: '伴随症状', keyPoint: '伴随筛查', maxScore: 3, required: true },
        { category: '现病史', name: '既往发作频率与模式', keyPoint: '病史模式', maxScore: 3, required: true },
        { category: '现病史', name: '缓解/加重因素', keyPoint: '影响因素', maxScore: 2, required: true },
        { category: '现病史', name: '诊疗经过与用药效果', keyPoint: '诊疗史', maxScore: 3, required: true },
        { category: '既往史', name: '既往慢性病史', keyPoint: '慢病史', maxScore: 2, required: true },
        { category: '既往史', name: '手术外伤史及过敏史', keyPoint: '手术过敏', maxScore: 2, required: true },
        { category: '既往史', name: '辅助检查史', keyPoint: '检查史', maxScore: 2, required: false },
        { category: '个人史与家族史', name: '相关家族病史', keyPoint: '家族史', maxScore: 2, required: true },
        { category: '个人史与家族史', name: '职业、生活习惯、压力因素', keyPoint: '个人史', maxScore: 2, required: true },
        { category: '系统回顾', name: '食欲、睡眠、体重变化', keyPoint: '一般情况', maxScore: 2, required: true },
        { category: '沟通与收尾', name: '患者情绪关注与共情表达', keyPoint: '人文关怀', maxScore: 2, required: true },
        { category: '沟通与收尾', name: '问诊后总结反馈', keyPoint: '总结收尾', maxScore: 1, required: true }
      ]
    }
    operationLogs.value = [
      { id: 1, time: '2025-06-15 14:30:00', operator: '管理员', type: 'create', typeLabel: '创建', summary: '创建评分表' },
      { id: 2, time: '2025-06-18 09:15:00', operator: '李主任', type: 'edit', typeLabel: '编辑', summary: '调整现病史评分项分值，新增"鉴别诊断"分类' },
      { id: 3, time: '2025-07-01 16:00:00', operator: '管理员', type: 'status', typeLabel: '状态变更', summary: '状态从"草稿"变更为"启用"' }
    ]
  }
})
</script>

<style scoped>
.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 0 16px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.editor-title {
  margin: 0;
  font-size: 16px;
  color: var(--text-main);
}

.case-id-badge {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--primary-light);
  color: var(--primary);
}

.header-right {
  display: flex;
  gap: 8px;
}

.mt-4 { margin-top: 16px; }
</style>
