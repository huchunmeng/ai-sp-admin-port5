<template>
  <div class="content-container">
    <div class="flex items-center justify-between mb-4">
      <div class="text-secondary">共 {{ cases.length }} 个 MDT 病例</div>
      <div class="flex gap-2">
        <button class="btn" @click="loadCases" :disabled="loading">刷新列表</button>
        <button class="btn btn-primary" @click="createCase">+ 新增 MDT 病例</button>
      </div>
    </div>

    <div class="card" style="padding:0">
      <div class="table-wrapper">
        <table class="table">
          <thead>
            <tr>
              <th>病例名称</th>
              <th>患者</th>
              <th>参与学科</th>
              <th>难度</th>
              <th>来源方式</th>
              <th>更新时间</th>
              <th style="min-width:150px">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in cases" :key="c.id">
              <td>
                <a class="record-link" @click="viewCase(c)">{{ c.name || c.id }}</a>
                <div class="text-secondary" style="font-size:12px">{{ c.sourceRecordId || '手动创建' }}</div>
              </td>
              <td>{{ c.patientName || '—' }}</td>
              <td>
                <span v-for="d in c.disciplines" :key="d" class="badge badge-info" style="margin-right:4px">{{ d }}</span>
              </td>
              <td><span class="badge" :class="levelBadge(c.levelLabel)">{{ c.levelLabel || '—' }}</span></td>
              <td><span class="badge" :class="sourceBadge(c.sourceType)">{{ sourceLabel(c.sourceType) }}</span></td>
              <td>{{ formatDate(c.updatedAt) }}</td>
              <td>
                <div class="flex gap-2">
                  <button class="btn btn-sm" @click="viewCase(c)">查看</button>
                  <button class="btn btn-sm" @click="editCase(c)">编辑</button>
                  <button class="btn btn-sm btn-danger" @click="deleteCase(c)">删除</button>
                </div>
              </td>
            </tr>
            <tr v-if="!loading && cases.length === 0">
              <td colspan="7" style="text-align:center;padding:40px;color:var(--text-secondary)">暂无 MDT 病例，点击「新增 MDT 病例」创建</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { toast, confirm } from '@ai-sp/shared'

const router = useRouter()
const cases = ref([])
const loading = ref(false)

const SOURCE_META = {
  ai: { label: '系统内自建', badge: 'badge-info' },
  raw: { label: '基于原始病历', badge: 'badge-success' },
  manual: { label: '作者手动输入', badge: 'badge-warning' }
}

const sourceLabel = (t) => (SOURCE_META[t] || SOURCE_META.manual).label
const sourceBadge = (t) => (SOURCE_META[t] || SOURCE_META.manual).badge

const levelBadge = (level) => {
  if (level === '基础病例') return 'badge-info'
  if (level === '高阶病例') return 'badge-success'
  if (level === '疑难病例') return 'badge-error'
  return ''
}

const formatDate = (d) => d ? String(d).slice(0, 16).replace('T', ' ') : '—'

async function loadCases() {
  loading.value = true
  try {
    const res = await fetch('/api/mdt-cases')
    cases.value = res.ok ? await res.json() : []
  } catch (e) {
    cases.value = []
  }
  loading.value = false
}

function createCase() {
  router.push({ name: 'mdtCaseEditor' })
}

function viewCase(c) {
  router.push({ name: 'mdtCaseView', params: { mdtId: c.id } })
}

function editCase(c) {
  router.push({ name: 'mdtCaseEditor', params: { mdtId: c.id } })
}

function deleteCase(c) {
  confirm(`确定删除 MDT 病例「${c.patientName || c.id}」吗？此操作不可恢复。`).then(async ok => {
    if (!ok) return
    await fetch(`/api/mdt-cases/${c.id}`, { method: 'DELETE' })
    toast.show('已删除', 'success')
    loadCases()
  }).catch(() => {})
}

onMounted(loadCases)
</script>

<style scoped>
.record-link {
  color: var(--primary); font-weight: 500; cursor: pointer; font-size: 13px;
}
.record-link:hover { text-decoration: underline; }
</style>
