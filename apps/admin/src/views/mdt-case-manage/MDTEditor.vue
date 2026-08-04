<template>
  <div class="case-editor">
    <div class="editor-header">
      <div class="header-left">
        <h2 class="editor-title">{{ isNew ? '新增 MDT 病例' : '编辑 MDT 病例' }}</h2>
        <span v-if="form.sourceRecordId" class="case-id-badge">{{ form.sourceRecordId }}</span>
        <span v-if="!isNew" class="version-badge">{{ form.id }}</span>
      </div>
      <div class="header-right">
        <button class="btn btn-outline" @click="router.back()">返回</button>
        <button class="btn btn-primary" @click="save" :disabled="saving">{{ saving ? '保存中...' : '保存' }}</button>
      </div>
    </div>

    <!-- 来源选择（仅新建未确认时） -->
    <div v-if="isNew && !sourceChosen" class="tab-content">
      <div class="tab-panel">
        <h3 class="block-title">选择创建来源</h3>
        <p class="block-desc">MDT 病例支持三种创建来源，与 SP 病例一致</p>
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
          <div class="filter-row">
            <div class="filter-item">
              <label>病种</label>
              <input class="input" v-model="aiDraft.disease" placeholder="如：非小细胞肺癌">
            </div>
          </div>
          <div class="filter-item">
            <label>文字需求</label>
            <textarea class="input" rows="4" v-model="aiDraft.requirement" placeholder="描述 MDT 讨论的核心议题与期望产出，如：明确临床分期、讨论新辅助治疗 vs 直接手术"></textarea>
          </div>
          <div class="ai-note">🤖 系统内自建的 AI 生成将于后续接入，当前请直接手动编辑下方表单完成病例制作</div>
        </div>

        <div v-if="sourceType === 'raw'" class="source-config">
          <div class="filter-item">
            <label>选择原始病历素材</label>
            <select class="select" v-model="selectedRecordId" @change="applyRecord">
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
    </div>

    <!-- 编辑表单 -->
    <template v-if="!isNew || sourceChosen">
      <div class="common-info-card card" :class="{ collapsed: infoCollapsed }">
        <div class="common-info-head">
          <span class="common-info-title">病例元数据</span>
          <button class="common-info-toggle" @click="infoCollapsed = !infoCollapsed">{{ infoCollapsed ? '展开' : '收起' }}</button>
        </div>
        <div class="common-info-grid">
          <div class="filter-item" style="grid-column:span 2">
            <label>病例名称</label>
            <input class="input" v-model="form.name" placeholder="输入病例名称" style="width:100%">
          </div>
          <div class="filter-item">
            <label>来源方式</label>
            <select class="select" v-model="form.sourceType">
              <option value="ai">系统内自建</option>
              <option value="raw">基于原始病历</option>
              <option value="manual">作者手动输入</option>
            </select>
          </div>
          <div class="filter-item">
            <label>难度阶段</label>
            <select class="select" v-model="form.teachingPhase">
              <option v-for="p in TEACHING_PHASES" :key="p.value" :value="p.value">{{ p.label }}</option>
            </select>
          </div>
          <div class="filter-item">
            <label>病例分级</label>
            <select class="select" v-model="form.levelLabel">
              <option value="">未设置</option>
              <option v-for="l in LEVEL_LABELS" :key="l" :value="l">{{ l }}</option>
            </select>
          </div>
          <div class="filter-item">
            <label>学科分类</label>
            <select class="select" v-model="form.filterKey">
              <option value="">未分类</option>
              <option v-for="k in MDT_FILTER_KEYS" :key="k.value" :value="k.value">{{ k.label }}</option>
            </select>
          </div>
          <div class="filter-item">
            <label>来源</label>
            <input class="input" v-model="form.source" placeholder="如：中大医院真实病历" style="width:100%">
          </div>
          <div class="filter-item" style="grid-column:span 2">
            <label>参与学科</label>
            <div class="flex gap-1" style="flex-wrap:wrap;align-items:center">
              <span v-for="d in form.disciplines" :key="d" class="badge badge-info">
                {{ d }}<button class="chip-remove" @click="removeDiscipline(d)">×</button>
              </span>
              <select class="select disc-add" @change="addDiscipline($event)">
                <option value="">+ 添加学科</option>
                <option v-for="d in availableDisciplines" :key="d" :value="d">{{ d }}</option>
              </select>
            </div>
          </div>
          <div class="filter-item" style="grid-column:span 2">
            <label>核心目标</label>
            <textarea class="input" rows="2" v-model="form.objective" placeholder="本次 MDT 讨论的核心目标"></textarea>
          </div>
        </div>
      </div>

      <div class="tab-bar">
        <button
          v-for="t in tabs"
          :key="t.key"
          :class="['tab-btn', { active: activeTab === t.key }]"
          @click="activeTab = t.key"
        >{{ t.label }}</button>
      </div>
      <div class="tab-content">
        <div v-show="activeTab === 'kb'" class="tab-panel"><MDTKBForm :form="form" /></div>
        <div v-show="activeTab === 'basic'" class="tab-panel"><MDTBasicForm :form="form" /></div>
        <div v-show="activeTab === 'knowledge'" class="tab-panel"><MDTKnowledgeForm :form="form" /></div>
        <div v-show="activeTab === 'script'" class="tab-panel"><MDTScriptForm :form="form" /></div>
        <div v-show="activeTab === 'decision'" class="tab-panel"><MDTDecisionForm :form="form" /></div>
        <div v-show="activeTab === 'role'" class="tab-panel"><MDTRoleScriptForm :form="form" /></div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { toast } from '@ai-sp/shared'
import MDTKBForm from './MDTKBForm.vue'
import MDTBasicForm from './MDTBasicForm.vue'
import MDTKnowledgeForm from './MDTKnowledgeForm.vue'
import MDTScriptForm from './MDTScriptForm.vue'
import MDTDecisionForm from './MDTDecisionForm.vue'
import MDTRoleScriptForm from './MDTRoleScriptForm.vue'
import { createEmptyMDTCase, genMDTId, MDT_DISCIPLINES, MDT_FILTER_KEYS, TEACHING_PHASES, LEVEL_LABELS } from './shared.js'

const router = useRouter()
const route = useRoute()

const SOURCES = [
  { key: 'ai', icon: '🤖', title: '系统内自建', desc: '选择病种 + 输入文字需求，由 AI 生成 MDT 剧本（AI 后续接入）' },
  { key: 'raw', icon: '📄', title: '基于原始病历生成', desc: '从原始病历素材库选择病历，基于其生成 MDT 病例（AI 后续接入）' },
  { key: 'manual', icon: '✍️', title: '作者手动输入', desc: '直接手动编辑全部 MDT 字段（当前完整可用）' }
]

const tabs = [
  { key: 'kb', label: '病例知识库' },
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
const activeTab = ref('kb')
const saving = ref(false)

const rawRecords = ref([])
const selectedRecordId = ref('')
const previewContent = ref('')
const selectedRecordLabel = ref('')
const infoCollapsed = ref(false)

const availableDisciplines = computed(() =>
  MDT_DISCIPLINES.filter(d => !(form.value.disciplines || []).includes(d))
)

function addDiscipline(e) {
  const v = e.target.value
  if (v && !form.value.disciplines.includes(v)) {
    form.value.disciplines.push(v)
  }
  e.target.value = ''
}

function removeDiscipline(d) {
  form.value.disciplines = form.value.disciplines.filter(x => x !== d)
}

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
.case-editor {
  background: var(--background);
}

/* ── 头部（与 SP 病例编辑器一致）── */
.editor-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 12px 24px; background: var(--card-bg); border-bottom: 1px solid var(--border);
  position: sticky; top: 0; z-index: 20;
}
.header-left { display: flex; align-items: center; gap: 12px; }
.editor-title { margin: 0; font-size: 16px; color: var(--text-main); }
.case-id-badge {
  font-size: 12px; padding: 2px 8px; border-radius: 4px;
  background: var(--primary-light); color: var(--primary); font-family: monospace;
}
.version-badge {
  font-size: 12px; padding: 2px 8px; border-radius: 4px;
  background: #f0fdf4; color: #16a34a; font-family: monospace;
}
.header-right { display: flex; gap: 8px; }

/* ── 公共元数据卡片（tab 上方，与 SP 病例编辑器一致）── */
.common-info-card {
  margin: 0; padding: 14px 24px; border-radius: 0;
  border-bottom: 1px solid var(--border);
  transition: padding .2s;
}
.common-info-card.collapsed {
  padding: 0 24px; max-height: 0; border: none; overflow: hidden;
}
.common-info-card.collapsed .common-info-grid {
  opacity: 0; pointer-events: none;
}
.common-info-head {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 12px;
}
.common-info-title {
  font-size: 13px; font-weight: 600; color: var(--text-secondary);
  display: flex; align-items: center; gap: 6px;
}
.common-info-title::before {
  content: ''; width: 3px; height: 14px; background: var(--primary); border-radius: 2px;
}
.common-info-toggle {
  font-size: 12px; color: var(--primary); background: none; border: none;
  cursor: pointer; font-family: inherit;
}
.common-info-toggle:hover { text-decoration: underline; }
.common-info-grid {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; align-items: end;
  transition: opacity .15s;
}
.chip-remove {
  background: none; border: none; cursor: pointer; font-size: 13px;
  color: inherit; padding: 0 0 0 4px; line-height: 1;
}
.disc-add { width: auto; min-width: 130px; }

/* ── Tab 栏（与 SP 病例编辑器一致）── */
.tab-bar {
  display: flex; gap: 0; padding: 0 24px;
  background: var(--card-bg); border-bottom: 1px solid var(--border);
  position: sticky; top: 53px; z-index: 10;
}
.tab-btn {
  padding: 10px 20px; background: none; border: none;
  border-bottom: 2px solid transparent; cursor: pointer;
  font-size: 14px; color: var(--text-secondary); transition: all .15s;
  font-family: inherit;
}
.tab-btn:hover { color: var(--primary); }
.tab-btn.active { color: var(--primary); border-bottom-color: var(--primary); font-weight: 600; }

.tab-content { }
.tab-panel { padding: 20px 24px; }

/* ── 来源选择 ── */
.block-title { margin: 0 0 4px; font-size: 16px; color: var(--text-main); }
.block-desc { margin: 0 0 16px; font-size: 13px; color: var(--text-secondary); }
.source-grid {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px;
}
.source-card {
  border: 1px solid var(--border); border-radius: var(--card-radius);
  padding: 16px; cursor: pointer; transition: all .15s;
}
.source-card:hover { border-color: var(--primary); box-shadow: var(--card-shadow); }
.source-card.active { border-color: var(--primary); background: var(--primary-light); }
.source-icon { font-size: 26px; margin-bottom: 8px; }
.source-title { font-weight: 600; margin-bottom: 4px; }
.source-desc { font-size: 12px; color: var(--text-secondary); line-height: 1.5; }

.source-config {
  margin-top: 16px; border: 1px solid var(--border); border-radius: 10px;
  padding: 14px; background: #fafbfc;
}
.filter-row { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 16px; margin-bottom: 20px; }
.filter-item { display: flex; flex-direction: column; gap: 4px; min-width: 140px; flex: 1 0 auto; }
.filter-item label { font-size: 12px; color: var(--text-secondary); }
.filter-item .input, .filter-item .select, .filter-item textarea { width: 100%; }
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
</style>
