<template>
  <div class="content-container">
    <div class="card mb-4">
      <div class="flex items-center justify-between">
        <h3 style="margin:0">{{ isNew ? '导入原始病历' : '编辑原始病历' }}</h3>
        <div class="flex gap-2">
          <button class="btn" @click="router.back()">返回</button>
          <button class="btn btn-primary" @click="save" :disabled="saving">{{ saving ? '保存中...' : '保存' }}</button>
        </div>
      </div>
    </div>

    <div class="card mb-4">
      <div class="form-grid">
        <div class="form-item">
          <label>标题</label>
          <input class="input" v-model="form.title" placeholder="如：急性心肌梗死入院记录">
        </div>
        <div class="form-item">
          <label>患者姓名</label>
          <input class="input" v-model="form.patientInfo.name" placeholder="姓名">
        </div>
        <div class="form-item">
          <label>性别</label>
          <select class="select" v-model="form.patientInfo.gender">
            <option value="男">男</option>
            <option value="女">女</option>
          </select>
        </div>
        <div class="form-item">
          <label>年龄</label>
          <input class="input" v-model.number="form.patientInfo.age" type="number" min="0" max="120" placeholder="年龄">
        </div>
        <div class="form-item">
          <label>病种</label>
          <input class="input" v-model="form.disease" placeholder="如：急性前壁心肌梗死">
        </div>
        <div class="form-item">
          <label>病历类型</label>
          <input class="input" v-model="form.recordType" placeholder="如：入院记录 / 出院记录 / 病程记录">
        </div>
        <div class="form-item">
          <label>来源</label>
          <input class="input" v-model="form.source" placeholder="如：某医院">
        </div>
      </div>
    </div>

    <div class="card mb-4">
      <div class="flex items-center justify-between mb-3">
        <label style="font-weight:600">原文内容（原文保存，作为制作素材）</label>
        <label class="btn btn-sm" style="cursor:pointer">
          选择文件读取
          <input type="file" accept=".txt,.md,.json" style="display:none" @change="onFile">
        </label>
      </div>
      <textarea class="input" v-model="form.content" rows="20" placeholder="粘贴原始病历文本，或选择 .txt 文件读取（原文保存）"></textarea>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { toast } from '@ai-sp/shared'

const router = useRouter()
const route = useRoute()

const emptyForm = () => ({
  id: '',
  title: '',
  patientInfo: { name: '', gender: '男', age: '' },
  specialty: '',
  disease: '',
  recordType: '',
  source: '',
  content: '',
  importedAt: ''
})

const form = ref(emptyForm())
const saving = ref(false)
const isNew = computed(() => !route.params.id)

function genId() {
  const d = new Date()
  const ymd = d.toISOString().slice(0, 10).replace(/-/g, '')
  return `RAW-${ymd}-${Date.now().toString(36).slice(-4).toUpperCase()}`
}

function onFile(e) {
  const file = e.target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => { form.value.content = String(reader.result || '') }
  reader.readAsText(file)
  e.target.value = ''
}

async function load() {
  const id = route.params.id
  if (!id) return
  try {
    const res = await fetch(`/api/raw-records/${id}`)
    if (res.ok) {
      const data = await res.json()
      form.value = { ...emptyForm(), ...data }
    }
  } catch (e) { /* 404 等 */ }
}

async function save() {
  if (!form.value.content.trim()) { toast.show('请填写原文内容', 'warning'); return }
  saving.value = true
  const id = form.value.id || genId()
  try {
    const res = await fetch('/api/raw-records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, data: { ...form.value, id, importedAt: form.value.importedAt || new Date().toISOString() } })
    })
    if (res.ok) {
      toast.show('已保存', 'success')
      router.push({ name: 'rawRecords' })
    } else {
      toast.show('保存失败', 'error')
    }
  } catch (e) {
    toast.show('保存失败', 'error')
  }
  saving.value = false
}

onMounted(load)
</script>

<style scoped>
.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 4px 20px;
}
</style>
