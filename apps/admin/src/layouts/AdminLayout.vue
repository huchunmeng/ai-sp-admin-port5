<template>
  <div class="app-layout">
    <header class="app-header">
      <div class="header-left">
        <button class="collapse-btn" @click="sidebarCollapsed = !sidebarCollapsed; saveSidebarState()">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" v-if="sidebarCollapsed">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" v-else>
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
        <span class="system-name">AI标准化病人 · 机构端</span>
        <div class="mode-badge" @click="openTraining">训练端</div>
      </div>
      <div class="header-right">
        <div class="institution-selector" ref="instSelectorRef" @click="showInstDropdown = !showInstDropdown">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
          <span>{{ store.currentInstitution }}</span>
          <div v-if="showInstDropdown" class="inst-dropdown" @click.stop>
            <input v-model="instSearch" placeholder="搜索机构名称..." class="inst-search-input" @click.stop>
            <div v-for="inst in filteredInstitutions" :key="inst" class="inst-option" :class="{ active: store.currentInstitution === inst }" @click.stop="selectInstitution(inst)">{{ inst }}</div>
          </div>
        </div>
        <div class="user-menu">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
          <span>管理员</span>
        </div>
      </div>
    </header>

    <div class="app-body">
      <aside class="app-sidebar" :class="{ collapsed: sidebarCollapsed }">
        <div class="sidebar-menu">
          <div v-for="mod in menu" :key="mod.module" class="menu-module">
            <div class="module-header" :class="{ expanded: mod.expanded }" @click="mod.expanded = !mod.expanded; saveSidebarState()">
              <span class="module-icon">{{ mod.icon }}</span>
              <span class="module-label">{{ mod.module }}</span>
              <svg class="expand-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </div>
            <div class="module-pages" v-show="mod.expanded">
              <div v-for="page in mod.pages" :key="page.id" class="page-item"
                   :class="{ active: isTabActive(page) }"
                   @click="openPage(page)">
                <span>{{ page.label }}</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <main class="app-main">
        <div class="app-tabbar">
          <div v-for="tab in store.tabs" :key="tab.id" class="tab-item"
               :class="{ active: store.activeTabId === tab.id }"
               @click="store.setActiveTab(tab.id)">
            <span>{{ tab.label }}</span>
            <span class="tab-close" @click.stop="store.closeTab(tab.id)" v-if="tab.closable">✕</span>
          </div>
        </div>
        <div class="app-content">
          <router-view :key="route.fullPath" />
        </div>
      </main>
    </div>

    <div class="bottom-left-buttons" id="sp-exam-bar" style="display:none;"></div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAdminStore } from '@/stores/admin'
import { review, requirement, bottomBar, createDefaultActions, resolveAppUrls } from '@ai-sp/shared'

const router = useRouter()
const route = useRoute()
const store = useAdminStore()

const SIDEBAR_KEY = 'ai-sp-admin-sidebar-v2'

function loadSidebarState() {
  try {
    const raw = localStorage.getItem(SIDEBAR_KEY)
    if (raw) return JSON.parse(raw)
  } catch (e) { /* ignore */ }
  return { collapsed: false, expanded: ['病例管理', '培训管理'] }
}

function saveSidebarState() {
  const state = {
    collapsed: sidebarCollapsed.value,
    expanded: menu.value.filter(m => m.expanded).map(m => m.module)
  }
  localStorage.setItem(SIDEBAR_KEY, JSON.stringify(state))
}

const saved = loadSidebarState()
const sidebarCollapsed = ref(saved.collapsed)

const instSelectorRef = ref(null)
const showInstDropdown = ref(false)
const instSearch = ref('')
const institutions = ['仁爱医院 (总部)', '华西医院', '中山医院', '协和医院', '同济医院', '省立医院', '瑞金医院', '北大第一医院', '湘雅医院', '齐鲁医院', '郑大一附院', '南方医院', '西南医院', '清华长庚医院', '浙江省人民医院']

const filteredInstitutions = computed(() => {
  const kw = instSearch.value.trim().toLowerCase()
  if (!kw) return institutions
  return institutions.filter(i => i.toLowerCase().includes(kw))
})

function selectInstitution(name) {
  store.currentInstitution = name
  showInstDropdown.value = false
  instSearch.value = ''
}

function handleClickOutside(e) {
  if (instSelectorRef.value && !instSelectorRef.value.contains(e.target)) {
    showInstDropdown.value = false
  }
}

const urls = resolveAppUrls()

const MENU_CONFIG = [
  { module: '病例管理', icon: '📋', pages: [
      { id: 'platform-cases', label: '平台病例库', route: '/platform-cases' },
      { id: 'institution-cases', label: '机构病例库', route: '/institution-cases' },
      { id: 'expert-cases', label: '专家病例库', route: '/expert-cases' },
      { id: 'score-settings', label: '评分表管理', route: '/score-settings' },
      { id: 'case-level-list', label: 'AI伴学病例库', route: '/case-level-list' }
  ]},
  { module: '培训管理', icon: '🎓', pages: [
      { id: 'training-records', label: '训练记录', route: '/training-records' }
  ]},
  { module: '考核管理', icon: '📝', pages: [
      { id: 'exam-records', label: '考核记录', route: '/exam-records' }
  ]},
  { module: '系统管理', icon: '⚙️', pages: [
      { id: 'station-settings', label: '考站设置', route: '/station-settings' },
      { id: 'system-settings', label: '系统设置', route: '/system-settings' }
  ]}
]

const menu = ref(MENU_CONFIG.map(m => ({
  ...m,
  expanded: saved.expanded.includes(m.module)
})))

function isTabActive(page) {
  return route.path === page.route
}

function openPage(page) {
  store.openTab(page)
  router.push(page.route)
}

watch(() => route.path, (path) => {
  if (path === '/') {
    store.activeTabId = 'home'
  } else {
    store.activeTabId = path.split('/')[1] || path.substring(1)
  }
})

const actions = createDefaultActions(route, {
  reviewAction: () => { review.toggle() },
  requirementAction: () => { requirement.toggle(route.name || 'home') },
  btns: [
    { label: '训练端', url: urls.training, name: 'ai-sp-training', style: { background: '#7c3aed', color: '#fff' } },
    { label: '考试端', url: urls.exam, name: 'ai-sp-exam', style: { background: '#059669', color: '#fff' } },
    { label: '运营平台', url: urls.ops, name: 'ai-sp-ops', style: { background: '#7c3aed', color: '#fff' } },
    { label: '电子书包', url: urls.appTraining, name: 'ai-sp-app-training', style: { background: '#059669', color: '#fff' } },
  ]
})

onMounted(() => {
  requirement.load()
  bottomBar.render(actions)
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  bottomBar.destroy()
  document.removeEventListener('click', handleClickOutside)
})

function openTraining() {
  window.location.href = urls.training
}
</script>

<style scoped>
.app-header {
  height: var(--header-height);
  background: #fff;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  flex-shrink: 0;
}
.header-left { display: flex; align-items: center; gap: 16px; }
.header-right { display: flex; align-items: center; gap: 16px; }
.system-name { font-size: 18px; font-weight: 600; }
.mode-badge { background: var(--primary); color: #fff; padding: 4px 16px; border-radius: 30px; font-size: 13px; cursor: pointer; }
.mode-badge:hover { background: var(--primary-dark); }
.collapse-btn { background: none; border: none; cursor: pointer; font-size: 18px; padding: 4px 8px; border-radius: 6px; }
.institution-selector { display: flex; align-items: center; gap: 6px; font-size: 13px; cursor: pointer; position: relative; padding: 6px 12px; border-radius: 8px; transition: background .15s; }
.institution-selector:hover { background: #f3f4f6; }
.inst-dropdown { position: absolute; top: 100%; right: 0; margin-top: 4px; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; box-shadow: 0 8px 24px rgba(0,0,0,0.12); width: 240px; max-height: 320px; overflow: hidden; z-index: 100; display: flex; flex-direction: column; }
.inst-search-input { width: 100%; padding: 10px 12px; border: none; border-bottom: 1px solid #e5e7eb; font-size: 13px; outline: none; box-sizing: border-box; }
.inst-search-input:focus { border-bottom-color: var(--primary); }
.inst-option { padding: 10px 12px; font-size: 13px; cursor: pointer; transition: background .12s; }
.inst-option:hover { background: #f0f5ff; }
.inst-option.active { background: #eff6ff; color: var(--primary); font-weight: 500; }
.user-menu { display: flex; align-items: center; gap: 6px; font-size: 13px; }

.app-body { display: flex; flex: 1; overflow: hidden; }
.app-sidebar { width: var(--sidebar-width); background: #fff; border-right: 1px solid var(--border); overflow-y: auto; flex-shrink: 0; transition: width .2s; }
.app-sidebar.collapsed { width: 0; overflow: hidden; }
.module-header { display: flex; align-items: center; gap: 8px; padding: 12px 16px; cursor: pointer; font-weight: 500; }
.module-header:hover { background: #f9fafb; }
.module-icon { font-size: 16px; }
.module-label { flex: 1; }
.expand-icon { width: 14px; transition: transform .2s; }
.expanded .expand-icon { transform: rotate(90deg); }
.page-item { padding: 8px 16px 8px 40px; cursor: pointer; font-size: 13px; color: var(--text-secondary); }
.page-item:hover, .page-item.active { color: var(--primary); background: var(--primary-light); }
.app-main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
.app-tabbar { height: var(--tabbar-height); display: flex; background: #fff; border-bottom: 1px solid var(--border); overflow-x: auto; flex-shrink: 0; }
.tab-item { display: flex; align-items: center; gap: 6px; padding: 0 16px; font-size: 13px; cursor: pointer; border-bottom: 2px solid transparent; white-space: nowrap; }
.tab-item.active { color: var(--primary); border-bottom-color: var(--primary); }
.tab-close { opacity: 0; transition: opacity .15s; }
.tab-item:hover .tab-close { opacity: 1; }
.app-content { flex: 1; padding: var(--content-padding); overflow-y: auto; }
</style>
