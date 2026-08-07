<template>
  <div class="content-container">
    <div class="flex items-center justify-between mb-4">
      <div class="text-secondary">共 {{ records.length }} 份原始病历</div>
      <div class="flex gap-2">
        <button class="btn" @click="loadRecords" :disabled="loading">刷新列表</button>
        <button class="btn" disabled title="占位：Excel 导入待实现，后续在列表页接入（数据源：HIS 原始病历 Excel）">导入 Excel（待实现）</button>
        <button class="btn btn-primary" @click="createRecord">+ 新建原始病历</button>
      </div>
    </div>

    <div class="card" style="padding:0">
      <div class="table-wrapper">
        <table class="table">
          <thead>
            <tr>
              <th>标题</th>
              <th>患者</th>
              <th>病种</th>
              <th>病历类型</th>
              <th>来源</th>
              <th>导入时间</th>
              <th style="min-width:150px">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in records" :key="r.id">
              <td>
                <a href="#" @click.prevent="openDetail(r)" style="color:var(--primary);text-decoration:none">{{ r.title || r.id }}</a>
              </td>
              <td>{{ patientInfo(r) }}</td>
              <td>{{ r.disease || '—' }}</td>
              <td>{{ r.recordType || '—' }}</td>
              <td>{{ r.source || '—' }}</td>
              <td>{{ formatDate(r.importedAt) }}</td>
              <td>
                <div class="flex gap-2">
                  <button class="btn btn-sm" @click="editRecord(r)">查看/编辑</button>
                  <button class="btn btn-sm btn-danger" @click="deleteRecord(r)">删除</button>
                </div>
              </td>
            </tr>
            <tr v-if="!loading && records.length === 0">
              <td colspan="7" style="text-align:center;padding:40px;color:var(--text-secondary)">暂无原始病历，点击「新建原始病历」添加（原文保存，供 SP 病例与 MDT 病例制作使用）</td>
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
const records = ref([])
const loading = ref(false)

async function loadRecords() {
  loading.value = true
  try {
    const res = await fetch('/api/raw-records')
    records.value = res.ok ? await res.json() : []
  } catch (e) {
    records.value = []
  }
  loading.value = false
}

function patientInfo(r) {
  return r.patientName ? `${r.patientName}（${r.gender || ''} ${r.age ?? ''}）` : '—'
}

function formatDate(d) {
  return d ? String(d).slice(0, 16).replace('T', ' ') : '—'
}

function createRecord() {
  router.push({ name: 'rawRecordEditor' })
}

function openDetail(r) {
  router.push({ name: 'rawRecordEditor', params: { id: r.id } })
}

function editRecord(r) {
  router.push({ name: 'rawRecordEditor', params: { id: r.id } })
}

function deleteRecord(r) {
  confirm(`确定删除原始病历「${r.title || r.id}」吗？此操作不可恢复。`).then(async ok => {
    if (!ok) return
    await fetch(`/api/raw-records/${r.id}`, { method: 'DELETE' })
    toast.show('已删除', 'success')
    loadRecords()
  }).catch(() => {})
}

onMounted(loadRecords)
</script>
