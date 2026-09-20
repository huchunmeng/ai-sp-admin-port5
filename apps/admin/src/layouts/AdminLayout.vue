<template>
  <div class="app-layout">
    <div class="app-body">
      <aside class="app-sidebar" :class="{ collapsed: sidebarCollapsed }">
        <div class="sidebar-head">
          <img class="brand-emblem" src="/logo-seu.png" alt="东南大学医学院">
          <span class="system-name">医路慧影·管理端</span>
          <button class="collapse-btn" :title="sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'" @click="toggleSidebar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-if="sidebarCollapsed">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-else>
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>
        <div class="sidebar-menu">
          <div v-for="mod in menu" :key="mod.module" class="menu-module">
            <div class="module-header" :class="{ expanded: mod.expanded }" @click="onModuleClick(mod)">
              <span class="nav-icon" v-html="iconSvg(mod.icon)"></span>
              <span class="module-label">{{ mod.module }}</span>
              <svg class="expand-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-if="!mod.system">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
              <svg class="external-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-else>
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                <path d="M15 3h6v6"/>
                <path d="M10 14 21 3"/>
              </svg>
            </div>
            <template v-if="mod.expanded && mod.groups">
              <div v-for="grp in mod.groups" :key="grp.module" class="menu-group">
                <div class="group-header" :class="{ expanded: grp.expanded }" @click="grp.expanded = !grp.expanded; saveSidebarState()">
                  <span class="nav-icon" v-html="iconSvg(grp.icon)"></span>
                  <span class="group-label">{{ grp.module }}</span>
                  <svg class="expand-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </div>
                <div class="group-pages" v-show="grp.expanded">
                  <div v-for="page in grp.pages" :key="page.id" class="page-item nested"
                       :class="{ active: isTabActive(page) }"
                       @click="openPage(page)">
                    <span class="nav-icon" v-html="iconSvg(page.icon)"></span>
                    <span class="page-label">{{ page.label }}</span>
                  </div>
                </div>
              </div>
            </template>
            <template v-else-if="mod.expanded">
              <div v-for="page in mod.pages" :key="page.id" class="page-item"
                   :class="{ active: isTabActive(page) }"
                   @click="openPage(page)">
                <span class="nav-icon" v-html="iconSvg(page.icon)"></span>
                <span class="page-label">{{ page.label }}</span>
              </div>
            </template>
          </div>
        </div>
      </aside>

      <main class="app-main">
        <header class="app-header">
          <div class="header-left">
            <div class="mode-badge" @click="openTraining">训练端</div>
          </div>
          <div class="header-right">
            <div class="institution-selector" :class="{ 'is-on': toolsVisible }"
                 :title="toolsVisible ? '点击隐藏评审 / 需求工具' : '点击显示评审 / 需求工具'"
                 @click="toggleTools">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 21h16"/>
                <path d="M6 21V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v15"/>
                <path d="M10 9h4M10 13h4M10 17h4"/>
              </svg>
              <span>{{ store.currentInstitution }}</span>
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
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAdminStore } from '@/stores/admin'
import { review, requirement, bottomBar, createDefaultActions, resolveAppUrls, toast } from '@ai-sp/shared'

const router = useRouter()
const route = useRoute()
const store = useAdminStore()

const SIDEBAR_KEY = 'ai-sp-admin-sidebar-v3'

function loadSidebarState() {
  try {
    const raw = localStorage.getItem(SIDEBAR_KEY)
    if (raw) return JSON.parse(raw)
  } catch (e) { /* ignore */ }
  return { collapsed: false, top: ['临床思维管理'], groups: ['病例管理'] }
}

function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value
  saveSidebarState()
}

function saveSidebarState() {
  const state = {
    collapsed: sidebarCollapsed.value,
    top: menu.value.filter(m => m.expanded).map(m => m.module),
    groups: menu.value.flatMap(m => (m.groups || []).filter(g => g.expanded).map(g => g.module))
  }
  localStorage.setItem(SIDEBAR_KEY, JSON.stringify(state))
}

const saved = loadSidebarState()
const sidebarCollapsed = ref(saved.collapsed)

const urls = resolveAppUrls()

const ICON_PATHS = {
  cases: '<path d="M3 7a2 2 0 0 1 2-2h3.6a2 2 0 0 1 1.5.7L11.4 7H19a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M8 12h8M8 16h5"/>',
  training: '<path d="M22 9 12 4 2 9l10 5z"/><path d="M6 11.5V17c0 1.7 2.7 3 6 3s6-1.3 6-3v-5.5"/>',
  exam: '<path d="M9 4H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2"/><rect x="9" y="2" width="6" height="4" rx="1"/><path d="m9 13 2 2 4-4"/>',
  system: '<path d="M4 6h8M16 6h4M4 12h4M12 12h8M4 18h8M16 18h4"/><circle cx="14" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="14" cy="18" r="2"/>',
  platform: '<rect x="3" y="4" width="18" height="6.5" rx="2"/><rect x="3" y="13.5" width="18" height="6.5" rx="2"/><path d="M7.5 7.2h3M7.5 16.8h3"/>',
  institution: '<path d="M4 21h16"/><path d="M6 21V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v15"/><path d="M10 9h4M10 13h4M10 17h4"/>',
  expert: '<circle cx="12" cy="9" r="5"/><path d="m9 13.5-1.2 7L12 18.5l4.2 2-1.2-7"/>',
  score: '<path d="M9 4H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2"/><rect x="9" y="2" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h4"/>',
  ai: '<rect x="7" y="7" width="10" height="10" rx="2"/><path d="M10 3v4M14 3v4M10 17v4M14 17v4M3 10h4M3 14h4M17 10h4M17 14h4"/>',
  file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17.5" cy="9.5" r="2.5"/><path d="M15.5 20a5 5 0 0 1 6-4.9"/>',
  trend: '<path d="m3 17 5.5-5.5 4 4L21 7"/><path d="M15 7h6v6"/>',
  fileCheck: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="m9 14 2 2 4-4"/>',
  layout: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 10v10"/>',
  flow: '<rect x="3" y="3" width="7" height="6" rx="1.5"/><rect x="14" y="15" width="7" height="6" rx="1.5"/><path d="M6.5 9v6a3 3 0 0 0 3 3H14"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
  clinical: '<path d="M3 12h4l2.5-6 3.5 12 2.5-6H21"/>',
  idcard: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10.5" r="2"/><path d="M5.8 16a3.6 3.6 0 0 1 6.4 0"/><path d="M14.5 10h4M14.5 14h2.5"/>',
  internship: '<circle cx="10" cy="8" r="3.5"/><path d="M3.5 20a6.5 6.5 0 0 1 13 0"/><path d="M18 8v6M15 11h6"/>',
  examRoom: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
  imaging: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16"/><path d="M3 9h4M3 15h4M17 9h4M17 15h4"/>'
}

function iconSvg(name) {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + (ICON_PATHS[name] || '') + '</svg>'
}

const MENU_CONFIG = [
  { module: '临床思维管理', icon: 'clinical', groups: [
    { module: '病例管理', icon: 'cases', pages: [
        { id: 'platform-cases', label: '平台病例库', route: '/platform-cases', icon: 'platform' },
        { id: 'institution-cases', label: '机构病例库', route: '/institution-cases', icon: 'institution' },
        { id: 'expert-cases', label: '专家病例库', route: '/expert-cases', icon: 'expert' },
        { id: 'score-settings', label: '评分表管理', route: '/score-settings', icon: 'score' },
        { id: 'case-level-list', label: 'AI伴学病例库', route: '/case-level-list', icon: 'ai' },
        { id: 'raw-records', label: '原始病历素材库', route: '/raw-records', icon: 'file' },
        { id: 'mdt-cases', label: 'MDT病例管理', route: '/mdt-cases', icon: 'users' },
        { id: 'imaging-samples', label: '影像报告题库', route: '/imaging-samples', icon: 'imaging' }
    ]},
    { module: '培训管理', icon: 'training', pages: [
        { id: 'training-records', label: '训练记录', route: '/training-records', icon: 'trend' }
    ]},
    { module: '考核管理', icon: 'exam', pages: [
        { id: 'exam-records', label: '考核记录', route: '/exam-records', icon: 'fileCheck' }
    ]},
    { module: '系统管理', icon: 'system', pages: [
        { id: 'station-settings', label: '考站设置', route: '/station-settings', icon: 'layout' },
        { id: 'flow-scheme-settings', label: '全流程评分配置', route: '/flow-scheme-settings', icon: 'flow' },
        { id: 'system-settings', label: '系统设置', route: '/system-settings', icon: 'gear' }
    ]}
  ]},
  // 以下三项为外部系统入口，点击直接跳转，不在本系统内开页
  { module: '住培管理', icon: 'idcard', system: 'residency' },
  { module: '实习管理', icon: 'internship', system: 'internship' },
  { module: '考试管理', icon: 'examRoom', system: 'exam' }
]

// 外部系统登录地址：三家均随部署环境不同，集中在这里改。
// 住培与实习同在 zp6 平台的 rest-xk，考试系统登录地址统一、按身份进入对应页面。
// 留空时点击只弹提示、不跳转——避免开到空白页或错误域名。
const EXTERNAL_SYSTEMS = {
  residency: { url: 'https://zp6.mvwchina.com/rest-xk/login.html?_=xfwmqHXkhzFS6x4f' },
  internship: { url: 'https://zp6.mvwchina.com/rest-xk/login.html?_=ryQKfM9NeqZBYJ26' },
  exam: { url: 'https://examon.mvwchina.com/' }
}

const menu = ref(MENU_CONFIG.map(m => ({
  ...m,
  expanded: saved.top.includes(m.module),
  groups: m.groups ? m.groups.map(g => ({ ...g, expanded: saved.groups.includes(g.module) })) : undefined
})))

function onModuleClick(mod) {
  if (mod.system) {
    const sys = EXTERNAL_SYSTEMS[mod.system]
    if (sys && sys.url) window.open(sys.url, '_blank', 'noopener,noreferrer')
    else toast.show('该系统地址未配置', 'warning')
    return
  }
  mod.expanded = !mod.expanded
  saveSidebarState()
}

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

/**
 * 评审 / 需求那一坨浮动工具（shared 的 `.sp-floating-bar` + 需求抽屉）**默认隐藏**，
 * 点顶栏的机构名称切换显示（2026-09-20 批注）。
 *
 * 走 shared 的 bottomBar.show()/hide()（2026-09-20 给 bottomBar 补的 API），
 * 不再由调用方直接操作它生成出来的 DOM。
 */
const toolsVisible = ref(false)

function applyToolsVisibility() {
  toolsVisible.value ? bottomBar.show() : bottomBar.hide()
  // 隐藏时顺手把需求抽屉收起来，避免"抽屉还开着、入口按钮却没了"
  if (!toolsVisible.value && requirement && typeof requirement.hide === 'function') requirement.hide()
}

function toggleTools() {
  toolsVisible.value = !toolsVisible.value
  applyToolsVisibility()
}

const actions = createDefaultActions(route, {
  /** 评审 / 需求工具默认隐藏（2026-09-20 批注）：点顶栏机构名称才显示 */
  reviewAction: () => { review.toggle() },
  requirementAction: () => { requirement.toggle(route.name || 'home') },
  btns: [
    { label: '训练端', url: urls.training, name: 'ai-sp-training', style: { background: '#7c3aed', color: '#fff' } },
  ]
})

onMounted(() => {
  requirement.load()
  bottomBar.render(actions)
  applyToolsVisibility()
})

onUnmounted(() => {
  bottomBar.destroy()
})

function openTraining() {
  window.open(urls.training, '_blank', 'noopener,noreferrer')
}
</script>

<style scoped>
.app-header {
  height: var(--header-height);
  background: var(--header-bg);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  flex-shrink: 0;
}
.header-left { display: flex; align-items: center; gap: 16px; }
.header-right { display: flex; align-items: center; gap: 16px; }
.system-name { font-size: 14px; font-weight: 600; line-height: 1.35; flex: 1; white-space: nowrap; }
.mode-badge { background: rgba(255,255,255,0.16); color: #fff; border: 1px solid rgba(255,255,255,0.32); padding: 4px 16px; border-radius: 30px; font-size: 13px; cursor: pointer; transition: background .15s; }
.mode-badge:hover { background: rgba(255,255,255,0.28); }
.collapse-btn { background: none; border: none; color: #fff; cursor: pointer; font-size: 18px; padding: 4px 6px; border-radius: 6px; flex-shrink: 0; transition: background .15s; }
.collapse-btn:hover { background: rgba(255,255,255,0.12); }
.institution-selector { cursor: pointer; border-radius: 6px; transition: background .15s; }
.institution-selector:hover { background: rgba(255,255,255,.12); }
.institution-selector.is-on { background: rgba(255,255,255,.18); }
.institution-selector-origin { display: flex; align-items: center; gap: 6px; font-size: 13px; padding: 6px 12px; border-radius: 8px; }
.user-menu { display: flex; align-items: center; gap: 6px; font-size: 13px; }

.app-body { display: flex; flex: 1; overflow: hidden; }
/* 左侧栏：品牌头 + 菜单，整体一栏贯到底 */
.app-sidebar { width: var(--sidebar-width); background: var(--sidebar-bg); display: flex; flex-direction: column; overflow: hidden; flex-shrink: 0; transition: width .2s; }
.app-sidebar.collapsed { width: var(--sidebar-collapsed-width); }
.brand-emblem { width: 30px; height: 30px; flex-shrink: 0; object-fit: contain; }
.sidebar-head { height: var(--header-height); display: flex; align-items: center; gap: 6px; padding: 0 10px; flex-shrink: 0; }
.app-sidebar.collapsed .sidebar-head { justify-content: center; padding: 0; }
.app-sidebar.collapsed .system-name, .app-sidebar.collapsed .brand-emblem, .app-sidebar.collapsed .sidebar-menu { display: none; }
.sidebar-menu { flex: 1; overflow-y: auto; }
.module-header { display: flex; align-items: center; gap: 8px; padding: 12px 16px; cursor: pointer; font-weight: 500; color: var(--sidebar-text); transition: background .15s, color .15s; }
.module-header:hover { background: rgba(255,255,255,0.06); color: #fff; }
.group-header { display: flex; align-items: center; gap: 8px; padding: 9px 16px 9px 32px; cursor: pointer; font-size: 13px; color: var(--sidebar-text); transition: background .15s, color .15s; }
.group-header:hover { background: rgba(255,255,255,0.06); color: #fff; }
.nav-icon { display: inline-flex; flex-shrink: 0; }
.module-header .nav-icon { width: 17px; height: 17px; }
.group-header .nav-icon { width: 15px; height: 15px; }
.page-item .nav-icon { width: 14px; height: 14px; opacity: .85; }
.nav-icon :deep(svg) { width: 100%; height: 100%; display: block; }
.module-label, .group-label { flex: 1; }
.expand-icon { width: 14px; transition: transform .2s; flex-shrink: 0; }
.external-icon { width: 13px; flex-shrink: 0; opacity: .55; }
.group-header .expand-icon { width: 12px; }
.expanded > .expand-icon { transform: rotate(90deg); }
.page-item { display: flex; align-items: center; gap: 8px; padding: 8px 16px 8px 32px; cursor: pointer; font-size: 13px; color: var(--sidebar-text); transition: background .15s, color .15s; }
.page-item.nested { padding-left: 48px; }
.page-item:hover { color: var(--sidebar-text-active); background: rgba(255,255,255,0.06); }
.page-item.active { color: var(--sidebar-text-active); background: var(--sidebar-active-bg); }
.page-label { flex: 1; }
.app-main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
.app-tabbar { height: var(--tabbar-height); display: flex; background: var(--card-bg); border-bottom: 1px solid var(--border); overflow-x: auto; flex-shrink: 0; }
.tab-item { display: flex; align-items: center; gap: 6px; padding: 0 16px; font-size: 13px; cursor: pointer; border-bottom: 2px solid transparent; white-space: nowrap; }
.tab-item.active { color: var(--primary); border-bottom-color: var(--primary); }
.tab-close { opacity: 0; transition: opacity .15s; }
.tab-item:hover .tab-close { opacity: 1; }
.app-content { flex: 1; padding: var(--content-padding); overflow-y: auto; }
</style>
