<template>
  <div class="app-root">
    <!-- Mobile Header -->
    <header class="mobile-header">
      <button class="hamburger-btn" @click="showDrawer = true">
        <i class="fa-solid fa-bars"></i>
      </button>
      <span class="header-title">{{ pageTitle }}</span>
      <span class="header-clock">{{ clock }}</span>
    </header>

    <!-- Drawer Overlay + Side Drawer -->
    <div v-if="showDrawer" class="drawer-overlay" @click="showDrawer = false">
      <aside class="drawer" @click.stop>
        <div class="drawer-header">
          <div>
            <div class="drawer-sys-name">电子书包 v2.0</div>
            <div class="drawer-sys-ver">H5 病例训练 · 原型</div>
          </div>
          <button class="drawer-close" @click="showDrawer = false">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
        <div class="drawer-body">
          <div class="drawer-group">
            <div class="drawer-group-title">病例训练流程</div>
            <div v-for="item in flowItems" :key="item.key" class="drawer-item"
              :class="{ active: route.name === item.key }" @click="navigateTo(item); showDrawer = false">
              <span class="dot"></span>{{ item.label }}
            </div>
          </div>
          <div class="drawer-group">
            <div class="drawer-group-title">接诊病人站</div>
            <div v-for="item in receptionItems" :key="item.key" class="drawer-item"
              :class="{ active: route.name === item.key }" @click="navigateTo(item); showDrawer = false">
              <span class="dot"></span>{{ item.label }}
            </div>
          </div>
          <div class="drawer-group">
            <div class="drawer-group-title">临床思维站</div>
            <div class="drawer-item" :class="{ active: route.name === 'caseAnalysis' }" @click="navigateTo({ key: 'caseAnalysis', label: '病例分析', route: '/case-analysis?caseId=IM-20240520-A1B2' }); showDrawer = false">
              <span class="dot"></span>病例分析
            </div>
          </div>
          <div class="drawer-group">
            <div class="drawer-group-title">人文沟通站</div>
            <div class="drawer-item" :class="{ active: route.name === 'humanisticComm' }" @click="navigateTo({ key: 'humanisticComm', label: '人文沟通', route: '/humanistic-comm?caseId=IM-20240520-A1B2' }); showDrawer = false">
              <span class="dot"></span>人文沟通
            </div>
          </div>
        </div>
      </aside>
    </div>

    <!-- Main Content Area -->
    <main class="main-content">
      <router-view />
    </main>

  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useTimer } from '@/composables/useTimer'
import { review, requirement, bottomBar, createDefaultActions, resolveAppUrls } from '@ai-sp/shared'

const router = useRouter()
const route = useRoute()
const { formattedTime: clock, startTimer } = useTimer()

const showDrawer = ref(false)

const pageTitle = computed(() => {
  const map = {
    caseList: '病例列表', caseDetail: '病例详情',
    historyTaking: '病史采集', physicalExam: '体格检查',
    preliminaryDiag: '初步诊断', treatmentPlan: '治疗计划',
    medicalRecord: '病历书写', caseAnalysis: '病例分析',
    humanisticComm: '人文沟通', scoreReport: '成绩报告'
  }
  return map[route.name] || '原型预览'
})

const flowItems = [
  { key: 'caseList', label: '1. 病例列表', route: '/case-list' },
  { key: 'caseDetail', label: '2. 病例详情', route: '/case-detail/IM-20240520-A1B2' },
  { key: 'scoreReport', label: '3. 成绩报告', route: '/score-report' }
]

const receptionItems = [
  { key: 'historyTaking', label: '4. 病史采集', route: '/history-taking?caseId=IM-20240520-A1B2' },
  { key: 'physicalExam', label: '5. 体格检查', route: '/physical-exam?caseId=IM-20240520-A1B2' },
  { key: 'preliminaryDiag', label: '6. 初步诊断', route: '/preliminary-diag?caseId=IM-20240520-A1B2' },
  { key: 'treatmentPlan', label: '7. 治疗计划', route: '/treatment-plan?caseId=IM-20240520-A1B2' },
  { key: 'medicalRecord', label: '8. 病历书写', route: '/medical-record?caseId=IM-20240520-A1B2' }
]

function navigateTo(item) {
  router.push(item.route)
}

watch(() => route.name, (name) => {
  review.setViewName(name || 'case-list')
})

const urls = resolveAppUrls()

const actions = createDefaultActions(route, {
  reviewAction: () => { review.toggle() },
  requirementAction: () => { requirement.toggle(route.name || 'case-list') },
  btns: [
    { label: '训练端', url: urls.training, name: 'ai-sp-training', style: { background: '#7c3aed', color: '#fff' } },
    { label: '管理端', url: urls.admin, name: 'ai-sp-admin', style: { background: '#2563eb', color: '#fff' } },
    { label: '考试端', url: urls.exam, name: 'ai-sp-exam', style: { background: '#059669', color: '#fff' } },
    { label: '运营平台', url: urls.ops, name: 'ai-sp-ops', style: { background: '#7c3aed', color: '#fff' } }
  ]
})

onMounted(() => {
  startTimer()
  bottomBar.render(actions, { bottom: '24px' })
})

onUnmounted(() => {
  bottomBar.destroy()
})
</script>

<style scoped>
.app-root {
  display: flex; flex-direction: column;
  height: 100vh; height: 100dvh;
  overflow: hidden;
  background: #e8ecf1;
}

/* ===== Mobile Header ===== */
.mobile-header {
  height: 48px; min-height: 48px;
  background: #fff; border-bottom: 1px solid #e5e7eb;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 12px; gap: 12px;
  flex-shrink: 0; z-index: 10;
}
.hamburger-btn {
  width: 34px; height: 34px;
  border: none; background: #f3f4f6; border-radius: 8px;
  cursor: pointer; font-size: 16px; color: #374151;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.hamburger-btn:active { background: #e5e7eb; }
.header-title {
  font-size: 16px; font-weight: 700; color: #1f2937;
  flex: 1; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.header-clock {
  font-size: 12px; color: #2563eb; font-weight: 500;
  flex-shrink: 0; min-width: 44px; text-align: right;
}

/* ===== Drawer ===== */
.drawer-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.4);
  z-index: 100; display: flex;
}
.drawer {
  width: 260px; max-width: 80vw; height: 100%;
  background: #fff; display: flex; flex-direction: column;
  overflow-y: auto; animation: drawerSlideIn .2s ease;
}
@keyframes drawerSlideIn { from { transform: translateX(-100%); } to { transform: translateX(0); } }
.drawer-header {
  display: flex; align-items: flex-start; justify-content: space-between;
  padding: 16px; border-bottom: 1px solid #e5e7eb;
}
.drawer-sys-name { font-size: 15px; font-weight: 700; color: #2563eb; }
.drawer-sys-ver { font-size: 11px; color: #9ca3af; margin-top: 2px; }
.drawer-close {
  width: 28px; height: 28px; border: none; background: #f3f4f6;
  border-radius: 50%; cursor: pointer; font-size: 14px; color: #6b7280;
  display: flex; align-items: center; justify-content: center;
}
.drawer-body { padding: 12px 0; flex: 1; }
.drawer-group { padding: 8px 0; }
.drawer-group-title {
  font-size: 11px; color: #9ca3af; padding: 12px 20px 6px;
  letter-spacing: 1px; text-transform: uppercase;
}
.drawer-item {
  display: flex; align-items: center; gap: 10px;
  padding: 13px 20px; font-size: 15px; color: #6b7280;
  cursor: pointer; transition: all .15s;
  border-left: 3px solid transparent; user-select: none;
  line-height: 1.4;
}
.drawer-item:hover { background: #eff6ff; color: #2563eb; }
.drawer-item.active {
  background: #eff6ff; color: #2563eb;
  font-weight: 600; border-left-color: #2563eb;
}
.drawer-item .dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: #9ca3af; flex-shrink: 0;
}
.drawer-item.active .dot { background: #2563eb; }

/* ===== Main Content ===== */
.main-content {
  flex: 1; overflow: hidden; position: relative;
  width: 100%; max-width: 500px; margin: 0 auto;
  background: #fff;
}

/* ===== 训练站视图适配 — 覆盖 viewport 单位为相对单位 ===== */
.main-content :deep(.history-taking-page),
.main-content :deep(.physical-exam-page),
.main-content :deep(.preliminary-diag-page),
.main-content :deep(.treatment-plan-page),
.main-content :deep(.medical-record-page),
.main-content :deep(.case-analysis-page),
.main-content :deep(.humanistic-comm-page),
.main-content :deep(.score-report-page) {
  width: 100% !important;
  height: 100% !important;
}

.main-content :deep(.patient-bg) {
  max-height: calc(100% - 100px) !important;
  max-width: 90% !important;
}

.main-content :deep(.float-info-overlay) {
  max-height: calc(100% - 80px) !important;
}

.main-content :deep(.chat-bubbles-overlay) {
  position: absolute !important;
}
.main-content :deep(.chat-bubbles-overlay.chat-level-2) {
  height: calc(100% - 180px) !important;
}

.main-content :deep(.chat-resize-handle) {
  position: absolute !important;
}
.main-content :deep(.chat-resize-handle.resize-at-2) {
  bottom: calc(100% - 120px) !important;
}

.main-content :deep(.marked-items) {
  max-height: calc(100% - 220px) !important;
}

/* 步骤导航栏下移 50px — 考站名称/计时器/下一步按钮保持置顶 */
.main-content :deep(.training-topbar) {
  align-items: flex-start !important;
  min-height: 108px !important;
}
.main-content :deep(.progress-bar-wrap) {
  margin-top: 50px !important;
}
.main-content :deep(.body-area) {
  top: 108px !important;
}

/* 步骤导航文字缩小 — 适配手机屏幕宽度，5步全部显示 */
.main-content :deep(.step-label) {
  font-size: 11px !important;
}
.main-content :deep(.progress-step) {
  min-width: 52px !important;
}
.main-content :deep(.step-dot) {
  width: 20px !important;
  height: 20px !important;
  font-size: 10px !important;
}
.main-content :deep(.progress-step.active .step-dot) {
  width: 22px !important;
  height: 22px !important;
}
.main-content :deep(.progress-line) {
  min-width: 10px !important;
}
.main-content :deep(.progress-bar-wrap) {
  padding: 4px 10px !important;
}

/* 初步诊断/病历书写/病例分析/治疗计划 — 左右改上下结构 */
.main-content :deep(.preliminary-diag-page .body-area),
.main-content :deep(.medical-record-page .body-area),
.main-content :deep(.case-analysis-page .body-area),
.main-content :deep(.treatment-plan-page .body-area) {
  flex-direction: column !important;
}
.main-content :deep(.preliminary-diag-page .left-panel),
.main-content :deep(.medical-record-page .left-panel),
.main-content :deep(.case-analysis-page .left-panel),
.main-content :deep(.treatment-plan-page .left-panel) {
  flex: 0 0 auto !important;
  max-height: 40% !important;
}
.main-content :deep(.preliminary-diag-page .right-panel),
.main-content :deep(.medical-record-page .right-panel),
.main-content :deep(.case-analysis-page .right-panel),
.main-content :deep(.treatment-plan-page .right-panel) {
  flex: 1 !important;
}

</style>
