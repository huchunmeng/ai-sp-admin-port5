<template>
  <div class="content-container">
    <div class="card mb-4">
      <div class="flex items-center justify-between">
        <div>
          <h3 style="margin:0">{{ isNew ? '新增 MDT 病例' : '编辑 MDT 病例' }}</h3>
          <span v-if="!isNew" class="text-secondary" style="font-size:12px">{{ form.id }}</span>
        </div>
        <div class="flex gap-2">
          <button class="btn" @click="router.back()">返回</button>
          <button class="btn btn-primary" @click="save" :disabled="saving">{{ saving ? '保存中...' : '保存' }}</button>
        </div>
      </div>
    </div>

    <!-- 来源选择（仅新建未确认时） -->
    <div v-if="isNew && !sourceChosen" class="card mb-4">
      <h4 style="margin:0 0 4px">选择创建来源</h4>
      <p class="text-secondary" style="margin-bottom:16px">MDT 病例支持三种创建来源，与 SP 病例一致</p>
      <div class="source-grid">
        <div
          v-for="s in SOURCES"
          :key="s.key"
          :class="['source-card', { active: sourceType === s.key }]"
          @click="sourceType = s.key"
        >
          <div class="source-icon">{{ s.icon }}</div>
          <div class="source-title">{{ s.title }}</div>
          <div class="source-desc">{{ s.desc }}</div>
        </div>
      </div>

      <div v-if="sourceType === 'ai'" class="source-config">
        <div class="form-grid">
          <div class="form-item">
            <label>病种</label>
            <input class="input" v-model="aiDraft.disease" placeholder="如：非小细胞肺癌">
          </div>
        </div>
        <div class="form-item">
          <label>文字需求</label>
          <textarea class="input" rows="4" v-model="aiDraft.requirement" placeholder="描述 MDT 讨论的核心议题与期望产出，如：明确临床分期、讨论新辅助治疗 vs 直接手术"></textarea>
        </div>
        <div class="ai-note">🤖 系统内自建的 AI 生成将于后续接入，当前请直接手动编辑下方表单完成病例制作</div>
      </div>

      <div v-if="sourceType === 'raw'" class="source-config">
        <div class="form-item">
          <label>选择原始病历素材</label>
          <select class="select" style="width:100%" v-model="selectedRecordId" @change="applyRecord">
            <option value="">— 请选择 —</option>
            <option v-for="r in rawRecords" :key="r.id" :value="r.id">{{ r.title || r.id }}（{{ r.disease || '未标注病种' }}）</option>
          </select>
        </div>
        <div v-if="previewContent" class="raw-preview">
          <h5>引用原始病历：{{ selectedRecordLabel }}</h5>
          <pre>{{ previewContent }}</pre>
        </div>
        <div class="ai-note">🤖 基于原始病历的 AI 自动提取将于后续接入，当前已从病历元数据预填患者信息，请手动完善其余字段</div>
      </div>

      <div class="flex justify-end mt-4">
        <button class="btn btn-primary" @click="confirmSource">进入编辑</button>
      </div>
    </div>

    <!-- 编辑表单 -->
    <template v-if="!isNew || sourceChosen">
      <div class="tab-bar mb-4">
        <button
          v-for="t in tabs"
          :key="t.key"
          :class="['tab-btn', { active: activeTab === t.key }]"
          @click="activeTab = t.key"
        >{{ t.label }}</button>
      </div>
      <div v-show="activeTab === 'basic'"><MDTBasicForm :form="form" /></div>
      <div v-show="activeTab === 'knowledge'"><MDTKnowledgeForm :form="form" /></div>
      <div v-show="activeTab === 'script'"><MDTScriptForm :form="form" /></div>
      <div v-show="activeTab === 'decision'"><MDTDecisionForm :form="form" /></div>
      <div v-show="activeTab === 'role'"><MDTRoleScriptForm :form="form" /></div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { toast } from '@ai-sp/shared'
import MDTBasicForm from './MDTBasicForm.vue'
import MDTKnowledgeForm from './MDTKnowledgeForm.vue'
import MDTScriptForm from './MDTScriptForm.vue'
import MDTDecisionForm from './MDTDecisionForm.vue'
import MDTRoleScriptForm from './MDTRoleScriptForm.vue'
import { createEmptyMDTCase, genMDTId } from './shared.js'

const router = useRouter()
const route = useRoute()

const SOURCES = [
  { key: 'ai', icon: '🤖', title: '系统内自建', desc: '选择病种 + 输入文字需求，由 AI 生成 MDT 剧本（AI 后续接入）' },
  { key: 'raw', icon: '📄', title: '基于原始病历生成', desc: '从原始病历素材库选择病历，基于其生成 MDT 病例（AI 后续接入）' },
  { key: 'manual', icon: '✍️', title: '作者手动输入', desc: '直接手动编辑全部 MDT 字段（当前完整可用）' }
]

const tabs = [
  { key: 'basic', label: '基本信息' },
  { key: 'knowledge', label: '学科与议题' },
  { key: 'script', label: '剧本与任务' },
  { key: 'decision', label: '决策与反馈' },
  { key: 'role', label: '角色话术' }
]

const isNew = computed(() => !route.params.mdtId)
const form = ref(createEmptyMDTCase())
const sourceChosen = ref(false)
const sourceType = ref('manual')
const aiDraft = ref({ disease: '', requirement: '' })
const activeTab = ref('basic')
const saving = ref(false)

const rawRecords = ref([])
const selectedRecordId = ref('')
const previewContent = ref('')
const selectedRecordLabel = ref('')

function mergeDeep(base, patch) {
  const out = Array.isArray(base) ? [...base] : { ...base }
  for (const k of Object.keys(patch || {})) {
    if (patch[k] && typeof patch[k] === 'object' && !Array.isArray(patch[k]) && base[k] && typeof base[k] === 'object') {
      out[k] = mergeDeep(base[k], patch[k])
    } else {
      out[k] = patch[k]
    }
  }
  return out
}

async function load() {
  const id = route.params.mdtId
  if (!id) return
  try {
    const res = await fetch(`/api/mdt-cases/${id}`)
    if (res.ok) {
      const data = await res.json()
      form.value = mergeDeep(createEmptyMDTCase(), data)
      sourceType.value = data.sourceType || 'manual'
      sourceChosen.value = true
    }
  } catch (e) { /* 404 */ }
}

function confirmSource() {
  form.value.sourceType = sourceType.value
  sourceChosen.value = true
  if (sourceType.value === 'raw' && selectedRecordId.value) {
    applyRecord()
  }
}

async function applyRecord() {
  if (!selectedRecordId.value) return
  const rec = rawRecords.value.find(r => r.id === selectedRecordId.value)
  form.value.sourceType = 'raw'
  form.value.sourceRecordId = selectedRecordId.value
  if (rec) {
    form.value.patientInfo.name = form.value.patientInfo.name || rec.patientName || ''
    form.value.patientInfo.gender = rec.gender || form.value.patientInfo.gender
    form.value.patientInfo.age = form.value.patientInfo.age || (rec.age ?? '')
    if (rec.disease && !form.value.objective) {
      form.value.objective = `围绕「${rec.disease}」开展多学科讨论，明确诊断与治疗策略`
    }
    selectedRecordLabel.value = rec.title || rec.id
  }
  try {
    const res = await fetch(`/api/raw-records/${selectedRecordId.value}`)
    if (res.ok) {
      const data = await res.json()
      previewContent.value = data.content || ''
      if (data.disease) form.value.disease = data.disease
    }
  } catch (e) { /* ignore */ }
}

async function loadRawRecords() {
  try {
    const res = await fetch('/api/raw-records')
    rawRecords.value = res.ok ? await res.json() : []
  } catch (e) { rawRecords.value = [] }
}

async function save() {
  if (!form.value.patientInfo.name && !form.value.id) {
    toast.show('请至少填写患者姓名', 'warning')
    return
  }
  saving.value = true
  const id = form.value.id || genMDTId()
  try {
    const res = await fetch('/api/mdt-cases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, data: { ...form.value, id } })
    })
    if (res.ok) {
      toast.show('已保存', 'success')
      router.push({ name: 'mdtCases' })
    } else {
      toast.show('保存失败', 'error')
    }
  } catch (e) {
    toast.show('保存失败', 'error')
  }
  saving.value = false
}

onMounted(() => {
  load()
  if (isNew.value) loadRawRecords()
})
</script>

<style scoped>
h4 { font-size: 15px; }
.source-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px;
}
.source-card {
  border: 1px solid var(--border); border-radius: 12px;
  padding: 16px; cursor: pointer; transition: all .15s;
}
.source-card:hover { border-color: var(--primary); box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.source-card.active { border-color: var(--primary); background: var(--primary-light); }
.source-icon { font-size: 26px; margin-bottom: 8px; }
.source-title { font-weight: 600; margin-bottom: 4px; }
.source-desc { font-size: 12px; color: var(--text-secondary); line-height: 1.5; }

.source-config {
  margin-top: 16px; border: 1px solid var(--border); border-radius: 10px;
  padding: 14px; background: #fafbfc;
}
.form-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 0 20px; }
.ai-note {
  margin-top: 10px; font-size: 12px; color: #92400e;
  background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 10px 14px;
}
.raw-preview {
  margin-top: 12px; border: 1px solid var(--border); border-radius: 8px; padding: 12px;
  max-height: 260px; overflow-y: auto;
}
.raw-preview h5 { margin: 0 0 8px; font-size: 13px; color: var(--text-secondary); }
.raw-preview pre {
  margin: 0; font-size: 12px; line-height: 1.7; white-space: pre-wrap;
  word-break: break-all; font-family: inherit; color: var(--text-main);
}

.tab-bar {
  display: flex; gap: 4px; border-bottom: 1px solid var(--border); padding-bottom: 0;
}
.tab-btn {
  padding: 8px 18px; border: none; background: none; cursor: pointer;
  font-size: 13px; color: var(--text-secondary); font-family: inherit;
  border-bottom: 2px solid transparent;
}
.tab-btn.active { color: var(--primary); border-bottom-color: var(--primary); font-weight: 600; }
</style>
