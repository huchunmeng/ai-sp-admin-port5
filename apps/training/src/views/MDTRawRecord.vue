<template>
  <div class="raw-page">
    <div class="raw-header">
      <div class="raw-title-row">
        <button class="back-btn" @click="goBack"><i class="fa-solid fa-arrow-left"></i></button>
        <h2><i class="fa-solid fa-folder-open"></i> 原始病历<span v-if="srcId" class="raw-id">（病历知识库 {{ srcId }}）</span></h2>
        <span v-if="kb && kb.hasData" class="raw-count">{{ recordCount }} 条记录</span>
      </div>
      <p v-if="title" class="raw-sub">{{ title }}</p>
    </div>

    <div v-if="loading" class="raw-state">
      <i class="fa-solid fa-spinner fa-spin"></i> 加载中...
    </div>

    <div v-else-if="!srcId" class="raw-state">
      <i class="fa-regular fa-folder-open"></i> 未提供原始病历编号
    </div>

    <div v-else-if="!kb || (!kb.hasData && !kb.fallback)" class="raw-state">
      <i class="fa-regular fa-folder-open"></i> 该病例未绑定原始病历
    </div>

    <div v-else class="mrkb-layout">
      <aside class="mrkb-sidebar">
        <div class="mrkb-search">
          <input class="mrkb-search-input" v-model="searchText" placeholder="搜索字段..." />
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
        </nav>
        <div v-if="filteredGroups.length === 0" class="mrkb-nav-empty">无匹配字段</div>
      </aside>

      <main class="mrkb-content">
        <template v-if="current">
          <!-- 病历内容：按类型多条记录卡片 -->
          <template v-if="current.type === 'records'">
            <div class="mrkb-content-header">
              <h3>{{ current.label }}</h3>
              <span class="mrkb-content-count">共 {{ current.records.length }} 条记录</span>
            </div>
            <div v-for="(rec, idx) in current.records" :key="idx" class="mrkb-card">
              <div class="mrkb-card-header">
                <div class="mrkb-card-meta">
                  <span v-if="rec.ftypeLabel" class="mrkb-card-type">{{ rec.ftypeLabel }}</span>
                  <span class="mrkb-card-date"><i class="fas fa-calendar-alt"></i> {{ rec.createDate || '—' }}</span>
                  <span v-if="rec.doctorCode" class="mrkb-card-doctor"><i class="fas fa-user-md"></i> {{ rec.doctorCode }}</span>
                  <span v-if="rec.visitNo" class="mrkb-card-visit"><i class="fas fa-file-medical-alt"></i> {{ rec.visitNo }}</span>
                </div>
                <button class="mrkb-card-toggle" @click="toggleExpand(current.key + ':' + idx)">
                  {{ expanded.has(current.key + ':' + idx) ? '收起' : '展开' }}
                </button>
              </div>
              <div :class="['mrkb-card-body', { collapsed: !expanded.has(current.key + ':' + idx) }]">
                <pre class="mrkb-content-text">{{ rec.content }}</pre>
              </div>
            </div>
          </template>

          <!-- 原始病历全文：单内容卡片 -->
          <template v-else>
            <div class="mrkb-content-header">
              <h3>{{ current.label }}</h3>
              <span class="mrkb-content-count">文本内容</span>
            </div>
            <div class="mrkb-card">
              <div class="mrkb-card-header">
                <div class="mrkb-card-meta">
                  <span>{{ current.meta || '内容' }}</span>
                </div>
                <button class="mrkb-card-toggle" @click="textExpanded = !textExpanded">
                  {{ textExpanded ? '收起' : '展开' }}
                </button>
              </div>
              <div :class="['mrkb-card-body', { collapsed: !textExpanded }]">
                <pre class="mrkb-content-text">{{ current.content }}</pre>
              </div>
            </div>
          </template>
        </template>

        <div v-else class="mrkb-empty">
          <i class="fa-regular fa-folder-open" style="font-size:48px;color:var(--text-tertiary);margin-bottom:16px;display:block"></i>
          <p>暂无病历内容</p>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { loadRawKB } from '@/composables/useRawRecords'

const router = useRouter()
const route = useRoute()

const srcId = ref('')
const title = ref('')
const loading = ref(true)
const kb = ref(null)

const searchText = ref('')
const selectedKey = ref('')
const openKeys = ref(new Set())
const expanded = ref(new Set())
const textExpanded = ref(true)   // 原始病历全文卡片默认展开

const recordCount = computed(() => {
  let n = 0
  const groups = kb.value?.groups || []
  for (const g of groups) {
    for (const item of g.items) {
      if (item.type === 'records') n += item.records.length
    }
  }
  return n
})

const groups = computed(() => (kb.value?.groups || []))

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
    // 默认选中第一个有内容的项（记录数>0 或全文文本），避免落在空分组导致"看不到病历内容"
    const filled = all.find(e => (e.type === 'records' && e.records.length > 0) || e.type === 'text')
    selectedKey.value = (filled || all[0]).key
  }
}, { immediate: true })

function goBack() {
  if (window.history.length > 1) router.back()
  else router.push({ name: 'mdtCaseList' })
}

onMounted(async () => {
  srcId.value = route.query.sourceRecordId || ''
  title.value = route.query.title || ''
  loading.value = true
  kb.value = await loadRawKB(srcId.value)
  loading.value = false
})
</script>

<style scoped>
.raw-page { padding: 24px; max-width: 1180px; margin: 0 auto; }
.raw-header { margin-bottom: 18px; }
.raw-title-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.back-btn {
  width: 34px; height: 34px; border-radius: 8px; border: 1px solid var(--border);
  background: #fff; cursor: pointer; color: var(--text-secondary); font-size: 14px;
}
.back-btn:hover { background: var(--border-light); }
.raw-title-row h2 { margin: 0; font-size: 18px; font-weight: 700; color: var(--text-main); display: flex; align-items: center; gap: 8px; }
.raw-id { font-size: 11px; color: var(--text-tertiary); font-weight: 400; font-family: monospace; }
.raw-count {
  font-size: 12px; background: var(--primary-light); color: var(--primary);
  border: 1px solid var(--primary-lightest); padding: 2px 10px; border-radius: 12px;
}
.raw-sub { margin: 10px 0 0 46px; font-size: 12px; color: var(--text-secondary); }

.raw-state {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 8px; padding: 60px 0; color: var(--text-tertiary); font-size: 14px;
}

/* ─── MDTKB 布局（与管理端 MDT 病例编辑「病例知识库」一致） ─── */
.mrkb-layout {
  display: flex;
  gap: 0;
  min-height: calc(100vh - 200px);
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
.mrkb-search-input {
  width: 100%; box-sizing: border-box;
  padding: 7px 10px; border: 1px solid var(--border); border-radius: 6px;
  font-size: 13px; font-family: inherit; color: var(--text-main);
  outline: none; background: #fff;
}
.mrkb-search-input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-lightest); }
.mrkb-nav { flex: 1; overflow-y: auto; padding: 4px 0; }
.mrkb-nav-group {
  padding: 10px 16px 4px;
  font-size: 11px; font-weight: 600; letter-spacing: 0.05em;
  color: var(--text-tertiary);
}
.mrkb-nav-item {
  display: flex; align-items: center; justify-content: space-between;
  width: 100%; padding: 9px 16px; border: none; background: none; cursor: pointer;
  font-size: 13px; color: var(--text-main); text-align: left; font-family: inherit;
  transition: background 0.15s;
}
.mrkb-nav-item:hover { background: var(--primary-light); }
.mrkb-nav-item.active {
  background: var(--primary-light);
  color: var(--primary);
  font-weight: 600;
  border-right: 3px solid var(--primary);
}
.mrkb-nav-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mrkb-nav-side { display: flex; align-items: center; gap: 6px; margin-left: 8px; flex-shrink: 0; }
.mrkb-nav-caret { font-size: 11px; color: var(--text-tertiary); transition: transform 0.2s ease; }
.mrkb-nav-caret.up { transform: rotate(180deg); }
.mrkb-nav-l2 {
  padding: 7px 16px 7px 30px; font-size: 12px; color: var(--text-secondary);
  border-left: 3px solid transparent;
}
.mrkb-nav-l2:hover { background: var(--primary-light); }
.mrkb-nav-l2.active {
  background: var(--primary-light); color: var(--primary); font-weight: 600;
  border-left-color: var(--primary);
}
.mrkb-nav-l2 .mrkb-nav-label { flex: 1; min-width: 0; }
.mrkb-nav-time { font-size: 11px; color: var(--text-tertiary); margin-left: 8px; flex-shrink: 0; font-family: monospace; }
.mrkb-nav-l2.active .mrkb-nav-time { color: var(--primary); }
.mrkb-nav-count {
  min-width: 20px; padding: 1px 6px; border-radius: 10px;
  background: var(--primary-light); color: var(--primary);
  font-size: 11px; font-weight: 600; text-align: center; margin-left: 8px;
}
.mrkb-nav-empty { padding: 24px 16px; text-align: center; color: var(--text-tertiary); font-size: 13px; }
.mrkb-content {
  flex: 1; overflow-y: auto; padding: 20px 24px; min-width: 0;
  background: #fff;
}
.mrkb-content-header {
  display: flex; align-items: baseline; gap: 12px;
  margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid var(--border);
}
.mrkb-content-header h3 { margin: 0; font-size: 18px; color: var(--text-main); }
.mrkb-content-count { font-size: 13px; color: var(--text-tertiary); }
.mrkb-card { margin-bottom: 16px; overflow: hidden; border: 1px solid var(--border); border-radius: 8px; }
.mrkb-card-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px; background: #f8fafc; border-bottom: 1px solid var(--border);
}
.mrkb-card-meta { display: flex; flex-wrap: wrap; gap: 16px; font-size: 12px; color: var(--text-secondary); }
.mrkb-card-meta i { margin-right: 4px; color: var(--text-tertiary); }
.mrkb-card-type {
  font-size: 11px; padding: 1px 8px; border-radius: 10px;
  background: var(--primary-light); color: var(--primary); font-weight: 600; white-space: nowrap;
}
.mrkb-card-toggle {
  font-size: 12px; color: var(--primary); background: none; border: none; cursor: pointer; font-family: inherit;
}
.mrkb-card-toggle:hover { text-decoration: underline; }
.mrkb-card-body {
  padding: 16px; max-height: 600px; overflow-y: auto; transition: max-height 0.3s ease;
}
.mrkb-card-body.collapsed { max-height: 140px; overflow: hidden; position: relative; }
.mrkb-card-body.collapsed::after {
  content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 48px;
  background: linear-gradient(transparent, #fff);
}
.mrkb-content-text {
  margin: 0; font-size: 13px; line-height: 1.8; color: var(--text-main);
  white-space: pre-wrap; word-break: break-all; font-family: inherit;
}
.mrkb-empty {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  height: 100%; min-height: 300px; color: var(--text-tertiary); font-size: 14px;
}
</style>
