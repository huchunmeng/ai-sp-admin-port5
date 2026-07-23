<template>
  <div class="ops-layout">
    <!-- 顶部导航 -->
    <header class="ops-header">
      <div class="header-left">
        <span class="header-title">统一运营平台</span>
        <span class="header-sep">/</span>
        <span class="header-sub">AI标准化病人</span>
      </div>
      <div class="header-right">
        <span class="header-notify"><i class="fa-solid fa-bell"></i> 通知</span>
        <div class="header-user">
          <span class="user-avatar">管</span>
          <span>管理员</span>
        </div>
      </div>
    </header>

    <div class="ops-body">
      <!-- 左侧菜单 -->
      <aside class="ops-sidebar">
        <div class="sidebar-label">AI标准化病人</div>
        <nav class="sidebar-nav">
          <div v-for="mod in menu" :key="mod.key" class="menu-module">
            <div class="menu-module-header" :class="{ expanded: mod.expanded }" @click="toggleModule(mod)">
              <i :class="'fa-solid ' + mod.icon + ' menu-icon'"></i>
              <span class="menu-label">{{ mod.label }}</span>
              <i class="fa-solid fa-chevron-down menu-arrow"></i>
            </div>
            <div class="menu-subitems" v-show="mod.expanded">
              <div
                v-for="item in mod.children"
                :key="item.key"
                class="menu-subitem"
                :class="{ active: isActive(item) }"
                @click="navTo(item)"
              >
                {{ item.label }}
              </div>
            </div>
          </div>
        </nav>
      </aside>

      <!-- 主内容区 -->
      <main class="ops-main">
        <div class="ops-breadcrumb" v-if="breadcrumb.length">
          <span v-for="(b, i) in breadcrumb" :key="i">
            <span v-if="i > 0" class="breadcrumb-sep">/</span>
            <span :class="{ active: i === breadcrumb.length - 1 }">{{ b }}</span>
          </span>
        </div>
        <div class="ops-content"><router-view /></div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { review, requirement, bottomBar, createDefaultActions, resolveAppUrls } from '@ai-sp/shared'

const router = useRouter()
const route = useRoute()

const urls = resolveAppUrls()

const actions = createDefaultActions(route, {
  reviewAction: () => { review.toggle() },
  requirementAction: () => { requirement.toggle(route.name || 'dashboard') },
  btns: [
    { label: '训练端', url: urls.training, name: 'ai-sp-training', style: { background: '#7c3aed', color: '#fff' } },
    { label: '管理端', url: urls.admin, name: 'ai-sp-admin', style: { background: '#2563eb', color: '#fff' } },
    { label: '考试端', url: urls.exam, name: 'ai-sp-exam', style: { background: '#059669', color: '#fff' } },
    { label: '电子书包', url: urls.appTraining, name: 'ai-sp-app-training', style: { background: '#0891b2', color: '#fff' } },
  ]
})

watch(() => route.name, (name) => {
  review.setViewName(name || 'dashboard')
})

onMounted(() => {
  requirement.load()
  bottomBar.render(actions)
})

onUnmounted(() => {
  bottomBar.destroy()
})

const MENU_KEY = 'ai-sp-ops-sidebar'

function loadMenuState() {
  try {
    const raw = localStorage.getItem(MENU_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return ['系统管理']
}

const savedExpanded = loadMenuState()

const menu = ref([
  {
    key: 'case', label: '病例管理', icon: 'fa-folder-open',
    expanded: savedExpanded.includes('病例管理'),
    children: [
      { key: 'platform-cases', label: '平台病例库', route: 'platformCases' },
      { key: 'institution-cases', label: '机构病例库', route: 'institutionCases' },
      { key: 'expert-cases', label: '专家病例库', route: 'expertCases' },
      { key: 'score-settings', label: '评分设置', route: 'scoreSettings' }
    ]
  },
  {
    key: 'training', label: '培训管理', icon: 'fa-graduation-cap',
    expanded: savedExpanded.includes('培训管理'),
    children: [
      { key: 'training-records', label: '训练记录', route: 'trainingRecords' }
    ]
  },
  {
    key: 'exam', label: '考核管理', icon: 'fa-clipboard-check',
    expanded: savedExpanded.includes('考核管理'),
    children: [
      { key: 'exam-records', label: '考核记录', route: 'examRecords' },
      { key: 'activity-records', label: '活动记录', route: 'activityRecords' }
    ]
  },
  {
    key: 'audit', label: '审核管理', icon: 'fa-check-circle',
    expanded: savedExpanded.includes('审核管理'),
    children: [
      { key: 'task-mgmt', label: '任务管理', route: 'taskMgmt' },
      { key: 'expert-mgmt', label: '专家管理', route: 'expertMgmt' },
      { key: 'apply-audit', label: '申请审核', route: 'applyAudit' }
    ]
  },
  {
    key: 'stats', label: '数据统计', icon: 'fa-chart-bar',
    expanded: savedExpanded.includes('数据统计'),
    children: [
      { key: 'dashboard', label: '数据总览', route: 'dashboard' },
      { key: 'institutions', label: '机构明细', route: 'institutions' },
      { key: 'record-query', label: '记录查询', route: 'recordQuery' },
      { key: 'personal-report', label: '个人报告', route: 'personalReport' },
      { key: 'export-mgmt', label: '导出管理', route: 'exportMgmt' }
    ]
  },
  {
    key: 'system', label: '系统管理', icon: 'fa-cog',
    expanded: savedExpanded.includes('系统管理'),
    children: [
      { key: 'sys-config', label: '系统设置', route: 'sysConfig' },
      { key: 'llm-config', label: 'LLM配置', route: 'llmConfig' },
      { key: 'llm-prompts', label: '提示词查看', route: 'llmPrompts' },
      { key: 'asset-manager', label: '素材管理', route: 'assetManager' },
      { key: 'station-settings', label: '考站设置', route: 'stationSettings' }
    ]
  }
])

function saveMenuState() {
  const expanded = menu.value.filter(m => m.expanded).map(m => m.label)
  localStorage.setItem(MENU_KEY, JSON.stringify(expanded))
}

function toggleModule(mod) {
  mod.expanded = !mod.expanded
  saveMenuState()
}

function isActive(item) {
  if (item.route) return route.name === item.route
  return route.name === item.key
}

function navTo(item) {
  const targetRoute = item.route || item.key
  if (targetRoute === route.name) return
  router.push({ name: targetRoute }).catch(() => {})
}

const breadcrumbMap = {
  dashboard: ['数据统计', '数据总览'],
  institutions: ['数据统计', '机构明细'],
  stationSettings: ['系统管理', '考站设置'],
  platformCases: ['病例管理', '平台病例库'],
  institutionCases: ['病例管理', '机构病例库'],
  expertCases: ['病例管理', '专家病例库'],
  scoreSettings: ['病例管理', '评分设置'],
  scoreEditor: ['病例管理', '评分表编辑器'],
  caseEditor: ['病例管理', '病例编辑器'],
  trainingRecords: ['培训管理', '训练记录'],
  examRecords: ['考核管理', '考核记录'],
  examCreate: ['考核管理', '新建考核'],
  examMonitor: ['考核管理', '监考面板'],
  activityRecords: ['考核管理', '活动记录'],
  taskMgmt: ['审核管理', '任务管理'],
  expertMgmt: ['审核管理', '专家管理'],
  applyAudit: ['审核管理', '申请审核'],
  recordQuery: ['数据统计', '记录查询'],
  personalReport: ['数据统计', '个人报告'],
  exportMgmt: ['数据统计', '导出管理'],
  sysConfig: ['系统管理', '系统设置'],
  llmConfig: ['系统管理', 'LLM配置'],
  llmPrompts: ['系统管理', '提示词查看'],
  assetManager: ['系统管理', '素材管理']
}

const breadcrumb = computed(() => breadcrumbMap[route.name] || [])
</script>

<style scoped>
.ops-layout { display: flex; flex-direction: column; height: 100vh; }
.ops-header {
  height: 56px; min-height: 56px; background: #fff; border-bottom: 1px solid var(--border);
  display: flex; align-items: center; justify-content: space-between; padding: 0 24px; z-index: 50;
}
.header-left { display: flex; align-items: center; gap: 8px; }
.header-title { font-size: 18px; font-weight: 700; color: var(--text-primary); }
.header-sep { color: var(--text-tertiary); }
.header-sub { color: var(--text-secondary); }
.header-right { display: flex; align-items: center; gap: 16px; }
.header-notify { display: flex; align-items: center; gap: 6px; color: var(--text-secondary); font-size: 13px; cursor: pointer; }
.header-user { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--text-secondary); }
.user-avatar {
  width: 32px; height: 32px; border-radius: 50%; background: var(--primary); color: #fff;
  display: flex; align-items: center; justify-content: center; font-size: 13px;
}

.ops-body { display: flex; flex: 1; overflow: hidden; }

.ops-sidebar {
  width: 240px; min-width: 240px; background: #fff; border-right: 1px solid var(--border);
  overflow-y: auto; display: flex; flex-direction: column;
}
.sidebar-label {
  padding: 16px 16px 8px; font-size: 11px; font-weight: 600; color: var(--text-tertiary);
  text-transform: uppercase; letter-spacing: 0.05em;
}
.sidebar-nav { flex: 1; padding-bottom: 8px; }

.menu-module { margin-bottom: 1px; }

.menu-module-header {
  display: flex; align-items: center; gap: 10px; padding: 12px 16px;
  cursor: pointer; color: var(--text-primary); font-size: 13px; font-weight: 500;
  transition: background 0.15s; user-select: none;
}
.menu-module-header:hover { background: #f9fafb; }
.menu-module-header.expanded { background: #f0f9ff; }
.menu-icon { width: 18px; text-align: center; font-size: 14px; color: var(--text-secondary); }
.menu-label { flex: 1; }
.menu-arrow { font-size: 10px; color: var(--text-tertiary); transition: transform 0.2s; }
.menu-module-header.expanded .menu-arrow { transform: rotate(180deg); }

.menu-subitems { background: #fafbfc; }
.menu-subitem {
  padding: 9px 16px 9px 46px; font-size: 13px; color: var(--text-secondary);
  cursor: pointer; transition: all 0.15s;
}
.menu-subitem:hover { color: var(--primary); background: var(--primary-light); }
.menu-subitem.active { color: var(--primary); font-weight: 600; background: #e0f2fe; }

.ops-main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }

.ops-breadcrumb {
  padding: 12px 24px 0; font-size: 13px; color: var(--text-tertiary); flex-shrink: 0;
}
.ops-breadcrumb .active { color: var(--text-primary); font-weight: 500; }
.breadcrumb-sep { margin: 0 6px; }

.ops-content { flex: 1; overflow-y: auto; padding: 16px 24px 24px; }
</style>
