<template>
  <div class="mrkb-layout">
    <aside class="mrkb-sidebar">
      <div class="mrkb-search">
        <input class="input" v-model="searchText" placeholder="搜索字段..." style="width:100%">
      </div>
      <nav class="mrkb-nav">
        <template v-for="g in filteredGroups" :key="g.label">
          <div class="mrkb-nav-group">{{ g.label }}</div>
          <template v-for="item in g.items" :key="item.key">
            <button
              :class="['mrkb-nav-item', 'mrkb-nav-l1', { active: selectedKey === item.key, open: openKeys.has(item.key) || item._open }]"
              @click="selectItem(item)"
            >
              <span class="mrkb-nav-label">{{ item.label }}</span>
              <span class="mrkb-nav-side">
                <span v-if="item.type === 'records'" class="mrkb-nav-count">{{ item.records.length }}</span>
                <i v-if="item.children && item.children.length" class="fas fa-chevron-down mrkb-nav-caret" :class="{ up: openKeys.has(item.key) }"></i>
              </span>
            </button>
            <button
              v-for="child in (openKeys.has(item.key) || item._open ? item.children : [])"
              :key="child.key"
              :class="['mrkb-nav-item', 'mrkb-nav-l2', { active: selectedKey === child.key }]"
              @click="selectedKey = child.key"
            >
              <span class="mrkb-nav-label">{{ child.label }}</span>
              <span v-if="child.time" class="mrkb-nav-time">{{ child.time }}</span>
            </button>
          </template>
        </template>
        <div v-if="filteredGroups.length === 0" class="mrkb-nav-empty">无匹配字段</div>
      </nav>
    </aside>

    <main class="mrkb-content">
      <div v-if="rawRecord || rawError" :class="['mrkb-raw-notice', { error: rawError }]">
        <i class="fas" :class="rawError ? 'fa-exclamation-triangle' : 'fa-link'"></i>
        <template v-if="rawError">{{ rawError }}</template>
        <template v-else-if="rawLoading">关联原始病历加载中...</template>
        <template v-else>关联原始病历：{{ rawRecord.title || rawRecord.id }}</template>
      </div>

      <template v-if="rawFallbackContent">
        <div class="mrkb-content-header">
          <h3>原始病历全文</h3>
          <span class="mrkb-content-count">文本内容</span>
        </div>
        <div class="mrkb-card card">
          <div class="mrkb-card-header">
            <div class="mrkb-card-meta">
              <span>{{ rawRecord.title || rawRecord.id }}</span>
            </div>
          </div>
          <div class="mrkb-card-body">
            <pre class="mrkb-content-text">{{ rawFallbackContent }}</pre>
          </div>
        </div>
      </template>

      <template v-else-if="current">
        <template v-if="current.type === 'records'">
          <div class="mrkb-content-header">
            <h3>{{ current.label }}</h3>
            <span class="mrkb-content-count">共 {{ current.records.length }} 条记录</span>
          </div>
          <div v-for="(rec, idx) in current.records" :key="rec.id || idx" class="mrkb-card card">
            <div class="mrkb-card-header">
              <div class="mrkb-card-meta">
                <span v-if="rec.ftypeLabel" class="mrkb-card-type">{{ rec.ftypeLabel }}</span>
                <span class="mrkb-card-date"><i class="fas fa-calendar-alt"></i> {{ rec.createDate || '—' }}</span>
                <span v-if="rec.doctorCode" class="mrkb-card-doctor"><i class="fas fa-user-md"></i> {{ rec.doctorCode }}</span>
                <span v-if="rec.visitNo" class="mrkb-card-visit"><i class="fas fa-file-medical-alt"></i> {{ rec.visitNo }}</span>
              </div>
              <button class="btn btn-sm btn-outline" @click="toggleExpand(current.key + ':' + idx)">
                {{ expanded.has(current.key + ':' + idx) ? '收起' : '展开' }}
              </button>
            </div>
            <div :class="['mrkb-card-body', { collapsed: !expanded.has(current.key + ':' + idx) }]">
              <pre class="mrkb-content-text">{{ rec.content }}</pre>
            </div>
          </div>
        </template>
      </template>

      <div v-else class="mrkb-empty">
        <i class="fas fa-folder-open" style="font-size:48px;color:var(--text-tertiary);margin-bottom:16px;display:block"></i>
        <p>暂无病历内容</p>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { FTYPE_LABELS, FTYPE_GROUPS } from '../mdt-case-manage/shared.js'

const props = defineProps({
  records: { type: Object, default: () => ({}) },
  sourceRecordId: { type: String, default: '' }
})

const searchText = ref('')
const selectedKey = ref('')
const openKeys = ref(new Set())
const expanded = ref(new Set())

const rawRecord = ref(null)
const rawLoading = ref(false)
const rawError = ref('')

const recordsData = computed(() => rawRecord.value?.records || props.records)

const rawFallbackContent = computed(() => {
  const data = recordsData.value
  if (data && Object.keys(data).some(k => Array.isArray(data[k]) && data[k].length)) return ''
  return rawRecord.value?.content || ''
})

onMounted(async () => {
  if (!props.sourceRecordId) return
  rawLoading.value = true
  try {
    const res = await fetch(`/api/raw-records/${props.sourceRecordId}`)
    if (res.ok) {
      rawRecord.value = await res.json()
    } else {
      rawError.value = '关联原始病历加载失败'
    }
  } catch (e) {
    rawError.value = '关联原始病历加载失败'
  } finally {
    rawLoading.value = false
  }
})

// 左侧分级菜单：HIS 大类（一级）+ 逐条记录目录（二级，名称+时间按时间升序）
const groups = computed(() => {
  const out = []
  const byFtype = {}
  for (const [ftype, items] of Object.entries(recordsData.value)) {
    if (Array.isArray(items) && items.length) byFtype[ftype] = items
  }
  // 始终展示完整 HIS 大类（无数据大类显示条数 0）
  const recItems = []
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
    if (merged.length > 1) {
      item.children = merged.map((rec, i) => ({
        key: 'rec-' + g.key + '-' + i,
        label: rec.ftypeLabel,
        time: rec.createDate || '',
        type: 'records',
        records: [rec]
      }))
    }
    recItems.push(item)
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
</script>

<style scoped>
.mrkb-layout {
  display: flex;
  gap: 0;
  min-height: calc(100vh - 340px);
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}
.mrkb-sidebar {
  width: 230px;
  min-width: 230px;
  border-right: 1px solid var(--border);
  background: #fafbfc;
  display: flex;
  flex-direction: column;
}
.mrkb-search {
  padding: 12px;
  border-bottom: 1px solid var(--border);
}
.mrkb-nav {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
}
.mrkb-nav-group {
  padding: 10px 16px 4px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  color: var(--text-tertiary);
}
.mrkb-nav-item {
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
.mrkb-nav-item:hover { background: #eef2ff; }
.mrkb-nav-item.active {
  background: var(--primary-light);
  color: var(--primary);
  font-weight: 600;
  border-right: 3px solid var(--primary);
}
.mrkb-nav-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.mrkb-nav-side {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: 8px;
  flex-shrink: 0;
}
.mrkb-nav-side .mrkb-nav-count { margin-left: 0; }
.mrkb-nav-caret {
  font-size: 11px;
  color: var(--text-tertiary);
  transition: transform 0.2s ease;
}
.mrkb-nav-caret.up { transform: rotate(180deg); }
.mrkb-nav-l2 {
  padding: 7px 16px 7px 30px;
  font-size: 12px;
  color: var(--text-secondary);
  border-left: 3px solid transparent;
}
.mrkb-nav-l2:hover { background: #eef2ff; }
.mrkb-nav-l2.active {
  background: #f0f4ff;
  color: var(--primary);
  font-weight: 600;
  border-left-color: var(--primary);
}
.mrkb-nav-l2 .mrkb-nav-label { flex: 1; min-width: 0; }
.mrkb-nav-time {
  font-size: 11px;
  color: var(--text-tertiary);
  margin-left: 8px;
  flex-shrink: 0;
  font-family: monospace;
}
.mrkb-nav-l2.active .mrkb-nav-time { color: var(--primary); }
.mrkb-nav-count {
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
.mrkb-nav-empty {
  padding: 24px 16px;
  text-align: center;
  color: var(--text-tertiary);
  font-size: 13px;
}
.mrkb-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
  min-width: 0;
}
.mrkb-raw-notice {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  padding: 10px 14px;
  border-radius: 6px;
  background: #eef2ff;
  color: var(--primary);
  font-size: 13px;
}
.mrkb-raw-notice.error {
  background: #fef2f2;
  color: #dc2626;
}
.mrkb-content-header {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
}
.mrkb-content-header h3 {
  margin: 0;
  font-size: 18px;
  color: var(--text-main);
}
.mrkb-content-count {
  font-size: 13px;
  color: var(--text-tertiary);
}
.mrkb-card {
  margin-bottom: 16px;
  padding: 0;
  overflow: hidden;
}
.mrkb-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #f8fafc;
  border-bottom: 1px solid var(--border);
}
.mrkb-card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  font-size: 12px;
  color: var(--text-secondary);
}
.mrkb-card-meta i { margin-right: 4px; color: var(--text-tertiary); }
.mrkb-card-type {
  font-size: 11px; padding: 1px 8px; border-radius: 10px;
  background: var(--primary-light); color: var(--primary); font-weight: 600;
  white-space: nowrap;
}
.mrkb-card-body {
  padding: 16px;
  max-height: 600px;
  overflow-y: auto;
  transition: max-height 0.3s ease;
}
.mrkb-card-body.collapsed {
  max-height: 140px;
  overflow: hidden;
  position: relative;
}
.mrkb-card-body.collapsed::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 48px;
  background: linear-gradient(transparent, #fff);
}
.mrkb-content-text {
  margin: 0;
  font-size: 13px;
  line-height: 1.8;
  color: var(--text-main);
  white-space: pre-wrap;
  word-break: break-all;
  font-family: inherit;
}
.mrkb-empty {
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
