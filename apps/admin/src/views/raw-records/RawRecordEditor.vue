<template>
  <div class="case-editor">
    <!-- 头部（与 MDT 编辑/查看页一致） -->
    <div class="editor-header">
      <div class="header-left">
        <h2 class="editor-title">{{ isNew ? '导入原始病历' : '编辑原始病历' }}</h2>
        <span v-if="form.patientInfo.name" class="patient-badge">
          {{ form.patientInfo.name }}{{ form.patientInfo.gender ? ' · ' + form.patientInfo.gender : '' }}{{ form.patientInfo.age != null ? ' · ' + form.patientInfo.age : '' }}
        </span>
        <span v-if="!isNew && form.id" class="case-id-badge">{{ form.id }}</span>
      </div>
      <div class="header-right">
        <button class="btn btn-outline" @click="router.back()">返回</button>
        <button class="btn btn-primary" @click="save" :disabled="saving">{{ saving ? '保存中...' : '保存' }}</button>
      </div>
    </div>

    <!-- 基本信息（元数据卡片，与 MDT 编辑页一致） -->
    <div class="common-info-card card" :class="{ collapsed: !metaOpen }">
      <div class="common-info-head">
        <span class="common-info-title">基本信息</span>
        <button class="common-info-toggle" @click="metaOpen = !metaOpen">{{ metaOpen ? '收起' : '展开' }}</button>
      </div>
      <div class="common-info-grid">
        <div class="filter-item" style="grid-column:span 2">
          <label>标题</label>
          <input class="input" v-model="form.title" placeholder="如：急性心肌梗死入院记录" style="width:100%">
        </div>
        <div class="filter-item">
          <label>患者姓名</label>
          <input class="input" v-model="form.patientInfo.name" placeholder="姓名">
        </div>
        <div class="filter-item">
          <label>性别</label>
          <select class="select" v-model="form.patientInfo.gender">
            <option value="男">男</option>
            <option value="女">女</option>
          </select>
        </div>
        <div class="filter-item">
          <label>年龄</label>
          <input class="input" v-model.number="form.patientInfo.age" type="number" min="0" max="120" placeholder="年龄">
        </div>
        <div class="filter-item">
          <label>病种</label>
          <input class="input" v-model="form.disease" placeholder="如：急性前壁心肌梗死">
        </div>
        <div class="filter-item">
          <label>病历类型</label>
          <input class="input" v-model="form.recordType" placeholder="如：入院记录 / 出院记录 / 病程记录">
        </div>
        <div class="filter-item">
          <label>来源</label>
          <input class="input" v-model="form.source" placeholder="如：某医院">
        </div>
      </div>
    </div>

    <!-- 主体：病历内容分级浏览 + 原文编辑 -->
    <div class="tab-content">
      <div class="tab-panel">
        <div class="rrkb-layout card" style="padding:0">
          <aside class="rrkb-sidebar">
            <div class="rrkb-search">
              <input class="input" v-model="searchText" placeholder="搜索字段..." style="width:100%">
            </div>
            <nav class="rrkb-nav">
              <template v-for="g in filteredGroups" :key="g.label">
                <div class="rrkb-nav-group">{{ g.label }}</div>
                <template v-for="item in g.items" :key="item.key">
                  <button
                    :class="['rrkb-nav-item', 'rrkb-nav-l1', { active: selectedKey === item.key, open: openKeys.has(item.key) || item._open }]"
                    @click="selectItem(item)"
                  >
                    <span class="rrkb-nav-label">{{ item.label }}</span>
                    <span class="rrkb-nav-side">
                      <span v-if="item.type === 'records'" class="rrkb-nav-count">{{ item.records.length }}</span>
                      <i v-if="item.children && item.children.length" class="fas fa-chevron-down rrkb-nav-caret" :class="{ up: openKeys.has(item.key) }"></i>
                    </span>
                  </button>
                  <button
                    v-for="child in (openKeys.has(item.key) || item._open ? item.children : [])"
                    :key="child.key"
                    :class="['rrkb-nav-item', 'rrkb-nav-l2', { active: selectedKey === child.key }]"
                    @click="selectedKey = child.key"
                  >
                    <span class="rrkb-nav-label">{{ child.label }}</span>
                    <span v-if="child.time" class="rrkb-nav-time">{{ child.time }}</span>
                  </button>
                </template>
              </template>
              <div v-if="filteredGroups.length === 0" class="rrkb-nav-empty">无匹配字段</div>
            </nav>
          </aside>

          <main class="rrkb-content">
            <template v-if="current">
              <template v-if="current.type === 'records'">
                <div class="rrkb-content-header">
                  <h3>{{ current.label }}</h3>
                  <span class="rrkb-content-count">共 {{ current.records.length }} 条记录</span>
                </div>
                <div v-for="(rec, idx) in current.records" :key="idx" class="rrkb-card card">
                  <div class="rrkb-card-header">
                    <div class="rrkb-card-meta">
                      <span v-if="rec.ftypeLabel" class="rrkb-card-type">{{ rec.ftypeLabel }}</span>
                      <span class="rrkb-card-date"><i class="fas fa-calendar-alt"></i> {{ rec.createDate || '—' }}</span>
                      <span v-if="rec.doctorCode" class="rrkb-card-doctor"><i class="fas fa-user-md"></i> {{ rec.doctorCode }}</span>
                      <span v-if="rec.visitNo" class="rrkb-card-visit"><i class="fas fa-file-medical-alt"></i> {{ rec.visitNo }}</span>
                    </div>
                    <button class="btn btn-sm btn-outline" @click="toggleExpand(current.key + ':' + idx)">
                      {{ expanded.has(current.key + ':' + idx) ? '收起' : '展开' }}
                    </button>
                  </div>
                  <div :class="['rrkb-card-body', { collapsed: !expanded.has(current.key + ':' + idx) }]">
                    <pre class="rrkb-content-text">{{ rec.content }}</pre>
                  </div>
                </div>
              </template>

              <template v-else>
                <div class="rrkb-content-header">
                  <h3>{{ current.label }}</h3>
                  <span class="rrkb-content-count">文本内容</span>
                </div>
                <div class="rrkb-card card">
                  <div class="rrkb-card-header">
                    <div class="rrkb-card-meta">
                      <span>{{ current.meta || '内容' }}</span>
                    </div>
                    <button class="btn btn-sm btn-outline" @click="expandedText = !expandedText">
                      {{ expandedText ? '收起' : '展开' }}
                    </button>
                  </div>
                  <div :class="['rrkb-card-body', { collapsed: !expandedText }]">
                    <pre class="rrkb-content-text">{{ current.content }}</pre>
                  </div>
                </div>
              </template>
            </template>

            <div v-else class="rrkb-empty">
              <i class="fas fa-folder-open" style="font-size:48px;color:var(--text-tertiary);margin-bottom:16px;display:block"></i>
              <p>暂无病历内容</p>
            </div>
          </main>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { toast } from '@ai-sp/shared'
import { FTYPE_LABELS, FTYPE_GROUPS } from '../mdt-case-manage/shared.js'

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
  records: {},
  importedAt: ''
})

const form = ref(emptyForm())
const saving = ref(false)
const isNew = computed(() => !route.params.id)

const metaOpen = ref(true)
const searchText = ref('')
const selectedKey = ref('')
const openKeys = ref(new Set())
const expanded = ref(new Set())
const expandedText = ref(false)

function genId() {
  const d = new Date()
  const ymd = d.toISOString().slice(0, 10).replace(/-/g, '')
  return `RAW-${ymd}-${Math.random().toString(36).slice(-4).toUpperCase()}`
}

// 左侧分级菜单：病历内容（按 HIS 大类分组，病程类合并按时间线）+ 原始病历全文
const groups = computed(() => {
  const out = []
  const recs = form.value?.records || {}
  const byFtype = {}
  for (const [ftype, items] of Object.entries(recs)) {
    if (Array.isArray(items) && items.length) byFtype[ftype] = items
  }
  // 始终展示完整 HIS 大类（无数据大类显示条数 0）；无任何结构化记录时回退全文
  const recItems = []
  let hasData = false
  for (const g of FTYPE_GROUPS) {
    const merged = []
    for (const ft of g.ftypes) {
      const items = byFtype[ft]
      if (items) {
        for (const it of items) merged.push({ ...it, ftypeLabel: FTYPE_LABELS[ft] || ft })
      }
    }
    merged.sort((a, b) => (a.createDate || '').localeCompare(b.createDate || ''))
    const item = { key: 'grp-' + g.key, label: g.label, type: 'records', records: merged }
    // 二级 = 目录：照搬每条记录的原始名称 + 时间，按时间升序，点一条定位到该条记录
    if (merged.length > 1) {
      item.children = merged.map((rec, i) => ({
        key: 'rec-' + g.key + '-' + i,
        label: rec.ftypeLabel,
        time: rec.createDate || '',
        type: 'records',
        records: [rec]
      }))
    }
    if (merged.length) hasData = true
    recItems.push(item)
  }
  if (!hasData && form.value?.content) {
    recItems.push({ key: 'full', label: '原始病历全文', type: 'text', content: form.value.content, meta: form.value.title || form.value.id || '原始病历' })
  }
  out.push({ label: '病历内容', items: recItems })
  return out
})

const filteredGroups = computed(() => {
  const q = searchText.value.trim().toLowerCase()
  if (!q) return groups.value
  const out = []
  for (const g of groups.value) {
    const items = []
    for (const item of g.items) {
      if (item.label.toLowerCase().includes(q)) {
        items.push({ ...item, _open: true })
      } else if (item.children && item.children.length) {
        const children = item.children.filter(c => c.label.toLowerCase().includes(q))
        if (children.length) items.push({ ...item, _open: true, children })
      }
    }
    if (items.length) out.push({ label: g.label, items })
  }
  return out
})

const current = computed(() => {
  for (const g of groups.value) {
    for (const item of g.items) {
      if (item.key === selectedKey.value) return item
      if (item.children) {
        const found = item.children.find(c => c.key === selectedKey.value)
        if (found) return found
      }
    }
  }
  return null
})

function selectItem(item) {
  if (item.children && item.children.length) {
    const s = new Set(openKeys.value)
    if (s.has(item.key)) s.delete(item.key)
    else s.add(item.key)
    openKeys.value = s
  }
  selectedKey.value = item.key
}

function toggleExpand(k) {
  const s = new Set(expanded.value)
  if (s.has(k)) s.delete(k)
  else s.add(k)
  expanded.value = s
}

watch(filteredGroups, (list) => {
  const all = []
  for (const g of list) {
    for (const item of g.items) {
      all.push(item)
      if (item.children) all.push(...item.children)
    }
  }
  if (all.length && !all.some(e => e.key === selectedKey.value)) {
    selectedKey.value = all[0].key
  }
}, { immediate: true })

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

onMounted(() => {
  load()
})
</script>

<style scoped>
.case-editor { background: var(--background); }

/* ── 头部（与 MDT 编辑/查看页一致）── */
.editor-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 12px 24px; background: var(--card-bg); border-bottom: 1px solid var(--border);
  position: sticky; top: 0; z-index: 20;
}
.header-left { display: flex; align-items: center; gap: 12px; }
.editor-title { margin: 0; font-size: 16px; color: var(--text-main); }
.patient-badge {
  font-size: 12px; padding: 2px 8px; border-radius: 4px;
  background: #eef2ff; color: #4338ca;
}
.case-id-badge {
  font-size: 12px; padding: 2px 8px; border-radius: 4px;
  background: var(--primary-light); color: var(--primary); font-family: monospace;
}
.header-right { display: flex; gap: 8px; }

/* ── 基本信息（元数据卡片，与 MDT 编辑页一致）── */
.common-info-card {
  margin: 0; padding: 14px 24px; border-radius: 0;
  border-bottom: 1px solid var(--border);
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
}
.common-info-card.collapsed .common-info-grid {
  display: none;
}
.filter-item { display: flex; flex-direction: column; gap: 4px; min-width: 140px; flex: 1 0 auto; }
.filter-item label { font-size: 12px; color: var(--text-secondary); }
.filter-item .input, .filter-item .select, .filter-item textarea { width: 100%; }

/* ── 主体区 ── */
.tab-content { }
.tab-panel { padding: 20px 24px; }

.card { margin-bottom: 14px; }

/* ── 病历内容分级浏览 ── */
.rrkb-layout {
  display: flex;
  gap: 0;
  min-height: calc(100vh - 380px);
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
  margin-bottom: 14px;
}
.rrkb-sidebar {
  width: 230px;
  min-width: 230px;
  border-right: 1px solid var(--border);
  background: #fafbfc;
  display: flex;
  flex-direction: column;
}
.rrkb-search {
  padding: 12px;
  border-bottom: 1px solid var(--border);
}
.rrkb-nav {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
}
.rrkb-nav-group {
  padding: 10px 16px 4px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  color: var(--text-tertiary);
}
.rrkb-nav-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 9px 16px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 13px;
  color: var(--text-main);
  text-align: left;
  transition: background 0.15s;
}
.rrkb-nav-item:hover { background: #eef2ff; }
.rrkb-nav-item.active {
  background: var(--primary-light);
  color: var(--primary);
  font-weight: 600;
  border-right: 3px solid var(--primary);
}
.rrkb-nav-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.rrkb-nav-side {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: 8px;
  flex-shrink: 0;
}
.rrkb-nav-side .rrkb-nav-count { margin-left: 0; }
.rrkb-nav-caret {
  font-size: 11px;
  color: var(--text-tertiary);
  transition: transform 0.2s ease;
}
.rrkb-nav-caret.up { transform: rotate(180deg); }
.rrkb-nav-l2 {
  padding: 7px 16px 7px 30px;
  font-size: 12px;
  color: var(--text-secondary);
  border-left: 3px solid transparent;
}
.rrkb-nav-l2:hover { background: #eef2ff; }
.rrkb-nav-l2.active {
  background: #f0f4ff;
  color: var(--primary);
  font-weight: 600;
  border-left-color: var(--primary);
}
.rrkb-nav-l2 .rrkb-nav-label { flex: 1; min-width: 0; }
.rrkb-nav-time {
  font-size: 11px;
  color: var(--text-tertiary);
  margin-left: 8px;
  flex-shrink: 0;
  font-family: monospace;
}
.rrkb-nav-l2.active .rrkb-nav-time { color: var(--primary); }
.rrkb-nav-count {
  min-width: 20px;
  padding: 1px 6px;
  border-radius: 10px;
  background: #eef2ff;
  color: var(--primary);
  font-size: 11px;
  font-weight: 600;
  text-align: center;
  margin-left: 8px;
}
.rrkb-nav-empty {
  padding: 24px 16px;
  text-align: center;
  color: var(--text-tertiary);
  font-size: 13px;
}
.rrkb-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
  min-width: 0;
}
.rrkb-content-header {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
}
.rrkb-content-header h3 {
  margin: 0;
  font-size: 18px;
  color: var(--text-main);
}
.rrkb-content-count {
  font-size: 13px;
  color: var(--text-tertiary);
}
.rrkb-card {
  margin-bottom: 16px;
  padding: 0;
  overflow: hidden;
}
.rrkb-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #f8fafc;
  border-bottom: 1px solid var(--border);
}
.rrkb-card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  font-size: 12px;
  color: var(--text-secondary);
}
.rrkb-card-meta i { margin-right: 4px; color: var(--text-tertiary); }
.rrkb-card-type {
  font-size: 11px; padding: 1px 8px; border-radius: 10px;
  background: var(--primary-light); color: var(--primary); font-weight: 600;
  white-space: nowrap;
}
.rrkb-card-body {
  padding: 16px;
  max-height: 600px;
  overflow-y: auto;
  transition: max-height 0.3s ease;
}
.rrkb-card-body.collapsed {
  max-height: 140px;
  overflow: hidden;
  position: relative;
}
.rrkb-card-body.collapsed::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 48px;
  background: linear-gradient(transparent, #fff);
}
.rrkb-content-text {
  margin: 0;
  font-size: 13px;
  line-height: 1.8;
  color: var(--text-main);
  white-space: pre-wrap;
  word-break: break-all;
  font-family: inherit;
}
.rrkb-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 300px;
  color: var(--text-tertiary);
  font-size: 14px;
}
</style>
