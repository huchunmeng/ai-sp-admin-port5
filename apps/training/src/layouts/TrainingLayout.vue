<template>
  <div class="training-container" style="position:relative;min-height:100vh;">
    <header class="app-header" v-if="!isChromeless">
      <div class="header-left">
        <div class="brand" @click="onBrandClick" :title="brandTitle">
          <img class="brand-emblem" src="/logo-seu.png" alt="东南大学医学院">
          <span class="system-name">{{ brandName }}</span>
          <i class="fa-solid fa-right-left brand-switch-icon" :class="{ 'is-home': onHomeRoute }"></i>
        </div>
        <div class="mode-badge" @click="openAdmin" v-if="false">管理端</div>
        <div class="version-btns" v-if="store.showHiddenControls">
          <button class="ver-btn" @click="openAdmin">管理端</button>
          <button class="ver-btn" :class="{ active: store.appVersion === '1.0' }" @click="switchVersion('1.0')">进入1.0版</button>
          <button class="ver-btn" :class="{ active: store.appVersion === '2.0' }" @click="switchVersion('2.0')">进入2.0版</button>
        </div>
      </div>
      <div class="header-right">
        <div class="tts-status" v-if="store.showHiddenControls" :title="'当前TTS模型: ' + ttsModelLabel" @click="openOpsLlmConfig">
          <i class="fa-solid fa-volume-high" style="font-size:11px;"></i>
          <span>{{ ttsModelLabel }}</span>
        </div>
        <div class="institution-selector" @click="toggleHiddenControls" title="点击显示工具面板">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
          <span>{{ userStore.institution }}</span>
        </div>
        <div class="user-menu-wrap">
          <div class="user-menu" @click="showUserMenu = !showUserMenu" title="点击查看账号菜单">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            <span>{{ userStore.name }}</span>
            <i class="fa-solid fa-caret-down" style="font-size:9px;margin-left:2px;"></i>
          </div>
          <div class="user-dropdown" v-if="showUserMenu" @click.stop>
            <div class="user-dropdown-item" @click="showUserMenu = false; openAdaptiveLearning()">
              <i class="fa-solid fa-chart-pie"></i> 学习画像
            </div>
          </div>
        </div>
      </div>
    </header>

    <div class="breadcrumb-bar" v-if="crumbs.length && !isChromeless">
      <span class="breadcrumb-item" v-for="(cr, i) in crumbs" :key="i">
        <span v-if="i > 0" class="breadcrumb-sep">/</span>
        <a v-if="cr.to" @click="handleCrumbClick(cr)">{{ cr.label }}</a>
        <span v-else class="breadcrumb-current">{{ cr.label }}</span>
      </span>
    </div>

    <router-view v-slot="{ Component }">
      <!-- key 用 path（含路由参数、不含 query）：换病例/换参数时重建组件，避免复用旧数据；
           仅 query 变化时不重建，保持既有交互不变 -->
      <transition name="fade">
        <component :is="Component" :key="route.path" />
      </transition>
    </router-view>

    <AICompanionDrawer v-if="isStationRoute" />
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useTrainingStore } from '@/stores/training'
import { useUserStore } from '@/stores/user'
import { review, requirement, bottomBar, createDefaultActions, resolveAppUrls } from '@ai-sp/shared'
import { getCurrentTtsModel } from '@/composables/useTTS.js'
import AICompanionDrawer from '@/components/AICompanionDrawer.vue'
import { MENTOR_CATEGORIES } from '@/data/mentorCategories'
import { MOOC_MODULES } from '@/data/moocModules'

const router = useRouter()
const route = useRoute()
const store = useTrainingStore()
const userStore = useUserStore()

// 面包屑「首页」跳转的外部站点（MDT 路径 + 名医名课内页）
const EXTERNAL_HOME_URL = 'https://ydxt.njzdyy.com:20881/training-web/index'

// ─── 首页版本：医路慧影（影像）/ 医工慧检（检验）───────────────
// 两套首页共用同一套训练功能，页头 logo 点击即切换；版本存 store（持久化到 localStorage）。
const isYigong = computed(() => store.homeVariant === 'yigong')
const homeRouteName = computed(() => (isYigong.value ? 'homeYigong' : 'home'))
const onHomeRoute = computed(() => route.name === 'home' || route.name === 'homeYigong')
const brandName = computed(() => (isYigong.value ? '医工慧检 检验智思体' : '医路慧影（WiseImag）影像智思体'))
const brandTitle = computed(() => {
  if (!onHomeRoute.value) return '回到首页'
  return isYigong.value ? '点击切换首页：医路慧影（影像）' : '点击切换首页：医工慧检（检验）'
})

function onBrandClick() {
  // 在首页：点 logo 换另一套首页；在内页：点 logo 回自己那套首页（保留「回首页」习惯）
  if (!onHomeRoute.value) { router.push({ name: homeRouteName.value }); return }
  const next = isYigong.value ? 'yilu' : 'yigong'
  store.setHomeVariant(next)
  router.push({ name: next === 'yigong' ? 'homeYigong' : 'home' })
}

function handleCrumbClick(cr) {
  if (typeof cr.to === 'string') {
    window.location.href = cr.to
    return
  }
  router.push(cr.to)
}

const showUserMenu = ref(false)
let floatingBarEl = null

function toggleHiddenControls() {
  store.showHiddenControls = !store.showHiddenControls
  if (floatingBarEl) {
    floatingBarEl.style.display = store.showHiddenControls ? '' : 'none'
  }
}

const ttsModelLabel = computed(() => {
  const id = getCurrentTtsModel()
  if (id && id.startsWith('cosyvoice')) return 'CosyVoice V3'
  return 'Qwen-TTS'
})

function openAdmin() {
  window.location.href = urls.admin
}

function openAdaptiveLearning() {
  router.push({ name: 'adaptiveLearning' })
}

function onClickOutside(e) {
  if (showUserMenu.value && !e.target.closest('.user-menu-wrap')) {
    showUserMenu.value = false
  }
}

function openOpsLlmConfig() {
  window.open(urls.ops + '#/llm-config', '_blank')
}

function switchVersion(v) {
  if (store.appVersion === v) return
  store.setVersion(v)
  router.push({ name: 'caseList', params: { specialty: store.specialty || '' } })
}

const stationRoutes = ['historyTaking', 'physicalExam', 'ancillaryTests', 'diagnosis', 'treatmentPlan', 'medicalRecord', 'caseAnalysis', 'humanisticComm', 'mentalExam']

// 「无壳页」：隐藏全局页头与面包屑，页面自带 TrainingTopBar（与病史采集/体格检查同一套框架）。
// 影像报告书写：**只有"考试操作页"与训练工作台**无壳（它们自带 TrainingTopBar）；
// 列表类页面（我的考核任务、训练列表）**保留**全局页头与面包屑。
const reportWritingStationRoutes = ['reportWritingWorkbench', 'reportWritingExam']
const chromelessRoutes = [...stationRoutes, ...reportWritingStationRoutes]

const isStationRoute = computed(function() {
  return stationRoutes.includes(route.name)
})

/**
 * 隐藏全局页头 + 面包屑。
 * 优先看页面自己声明的 `store.shellMode`（考试室按状态切换：作答中无壳、须知/成绩报告有壳），
 * 页面没声明（'auto'）时才按路由白名单判断。
 */
const isChromeless = computed(function() {
  if (store.shellMode === 'chromeless') return true
  if (store.shellMode === 'shell') return false
  return chromelessRoutes.includes(route.name)
})

const crumbs = computed(function() {
  const items = []
  const name = route.name
  const lang = store.lang || 'zh'

  if (name !== 'home' && name !== 'homeYigong') {
    // MDT 路径 + 名医名课内页的「首页」统一跳外部站点
    const useExternalHome = name.startsWith('mdt') || (name === 'caseDetail' && route.query.from === 'mdt') || name === 'mentorCases'
    items.push({ label: lang === 'zh' ? '首页' : 'Home', to: useExternalHome ? EXTERNAL_HOME_URL : { name: homeRouteName.value } })
  }

  if (name === 'caseList') {
    items.push({ label: lang === 'zh' ? '病例列表' : 'Case List', to: null })
  } else if (name === 'caseDetail') {
    if (route.query.from === 'mdt') {
      items.push({ label: lang === 'zh' ? 'MDT病例列表' : 'MDT Cases', to: { name: 'mdtCaseList' } })
    } else {
      items.push({ label: lang === 'zh' ? '病例列表' : 'Case List', to: { name: 'caseList', params: { specialty: store.specialty || '' } } })
    }
    items.push({ label: lang === 'zh' ? '病例详情' : 'Detail', to: null })
  } else if (name === 'stationSelect') {
    items.push({ label: lang === 'zh' ? '病例列表' : 'Case List', to: { name: 'caseList', params: { specialty: store.specialty || '' } } })
    items.push({ label: lang === 'zh' ? '病例详情' : 'Detail', to: { name: 'caseDetail', params: { caseId: store.currentCase ? store.currentCase.id : '' } } })
    items.push({ label: lang === 'zh' ? '选择考站' : 'Station', to: null })
  } else if (name === 'scoreReport') {
    items.push({ label: lang === 'zh' ? '成绩报告' : 'Report', to: null })
  } else if (name === 'mdtCaseList') {
    items.push({ label: lang === 'zh' ? 'MDT多学科讨论' : 'MDT Discussion', to: null })
  } else if (name === 'mdtDiscussion') {
    items.push({ label: lang === 'zh' ? 'MDT病例列表' : 'MDT Cases', to: { name: 'mdtCaseList' } })
    items.push({ label: lang === 'zh' ? 'MDT讨论室' : 'Discussion Room', to: null })
  } else if (name === 'mdtPreMeeting') {
    items.push({ label: lang === 'zh' ? 'MDT病例列表' : 'MDT Cases', to: { name: 'mdtCaseList' } })
    items.push({ label: lang === 'zh' ? '会诊前发起' : 'Pre-Meeting', to: null })
  } else if (name === 'adaptiveLearning') {
    items.push({ label: lang === 'zh' ? '学习画像' : 'Learning Profile', to: null })
  } else if (name === 'vrLab') {
    items.push({ label: lang === 'zh' ? 'VR研习空间' : 'VR Lab', to: null })
  } else if (name === 'reportWritingTrain') {
    items.push({ label: lang === 'zh' ? '影像报告书写训练' : 'Report Writing', to: null })
    items.push({ label: lang === 'zh' ? '训练病例' : 'Training Cases', to: null })
  } else if (name === 'reportWritingWorkbench') {
    items.push({ label: lang === 'zh' ? '影像报告书写训练' : 'Report Writing', to: null })
    items.push({ label: lang === 'zh' ? '训练病例' : 'Training Cases', to: { name: 'reportWritingTrain' } })
    items.push({ label: lang === 'zh' ? '训练工作台' : 'Workbench', to: null })
  } else if (name === 'labReportTrain') {
    items.push({ label: lang === 'zh' ? '检验报告解读训练' : 'Lab Report', to: null })
    items.push({ label: lang === 'zh' ? '训练病例' : 'Training Cases', to: null })
  } else if (name === 'labReportWorkbench') {
    items.push({ label: lang === 'zh' ? '检验报告解读训练' : 'Lab Report', to: null })
    items.push({ label: lang === 'zh' ? '训练病例' : 'Training Cases', to: { name: 'labReportTrain' } })
    items.push({ label: lang === 'zh' ? '训练工作台' : 'Workbench', to: null })
  } else if (name === 'labMorphTrain') {
    items.push({ label: lang === 'zh' ? '形态学与图谱判读训练' : 'Morphology', to: null })
  } else if (name === 'labMorphQuiz') {
    items.push({ label: lang === 'zh' ? '形态学与图谱判读训练' : 'Morphology', to: { name: 'labMorphTrain' } })
    items.push({ label: lang === 'zh' ? '判读练习' : 'Quiz', to: null })
  } else if (name === 'reportWritingExamTasks') {
    items.push({ label: lang === 'zh' ? '在线考试' : 'Online Exam', to: { name: 'examCenter' } })
    items.push({ label: lang === 'zh' ? '我的考核任务' : 'My Exams', to: null })
  } else if (name === 'reportWritingExam') {
    // 考试室有两种来源，路径不同：老师派发的考核 / 自己发起的练习考。
    // 原来一律写成「在线考试 / 影像报告书写考核」，练习考就错成了"考核"。
    items.push({ label: lang === 'zh' ? '在线考试' : 'Online Exam', to: { name: 'examCenter' } })
    items.push({ label: lang === 'zh' ? '我的考核任务' : 'My Exams', to: { name: 'reportWritingExamTasks' } })
    const examTaskId = route.query && route.query.task
    items.push({ label: examTaskId ? (lang === 'zh' ? '考核作答' : 'Exam') : (lang === 'zh' ? '练习考' : 'Practice'), to: null })
  } else if (name === 'examCenter') {
    items.push({ label: lang === 'zh' ? '在线考试' : 'Online Exam', to: null })
  } else if (name === 'moocModule') {
    const mmod = MOOC_MODULES.find(m => m.key === route.params.module)
    items.push({ label: lang === 'zh' ? '名医名课研习' : 'Elite Study', to: { name: homeRouteName.value } })
    items.push({ label: mmod ? mmod.title : (lang === 'zh' ? '慕课' : 'MOOC'), to: null })
  } else if (name === 'mentorCases') {
    const mcat = MENTOR_CATEGORIES[route.params.category]
    items.push({ label: lang === 'zh' ? '名医名课研习' : 'Elite Study', to: EXTERNAL_HOME_URL })
    items.push({ label: mcat ? mcat.title : (lang === 'zh' ? '导师病例' : 'Mentor Cases'), to: null })
  } else if (stationRoutes.includes(name)) {
    items.push({ label: lang === 'zh' ? '病例详情' : 'Detail', to: { name: 'caseDetail', params: { caseId: store.currentCase ? store.currentCase.id : '' } } })
    const stationLabels = { historyTaking: '病史采集', physicalExam: '体格检查', ancillaryTests: '辅助检查', diagnosis: '诊断', preliminaryDiag: '初步诊断', treatmentPlan: '治疗计划', medicalRecord: '病历书写', caseAnalysis: '病例分析', humanisticComm: '人文沟通' }
    items.push({ label: stationLabels[name] || name, to: null })
  }
  return items
})

const urls = resolveAppUrls()

const actions = createDefaultActions(route, {
  reviewAction: () => { review.toggle(route.name) },
  requirementAction: () => { requirement.toggle(route.name) },
  btns: [
    { label: '管理端', url: urls.admin, name: 'ai-sp-admin', style: { background: '#4A90E2', color: '#fff' } },
  ]
})

onMounted(() => {
  bottomBar.render(actions)
  review.setViewName(route.name || '')
  // 默认隐藏浮窗，点击机构名称显示
  floatingBarEl = document.querySelector('.sp-floating-bar')
  if (floatingBarEl) floatingBarEl.style.display = 'none'
  document.addEventListener('click', onClickOutside)
})

onUnmounted(() => {
  bottomBar.destroy()
  document.removeEventListener('click', onClickOutside)
})

watch(() => route.name, (name) => {
  if (name) review.setViewName(name)
  // 直接打开某个首页地址（刷新 / 收藏链接）时，把首页版本对齐到当前路由。
  // immediate：首屏就是 #/home-yigong 时路由不会再「变化」，不加 immediate 页头会留着另一套品牌名
  if (name === 'homeYigong' && store.homeVariant !== 'yigong') store.setHomeVariant('yigong')
  if (name === 'home' && store.homeVariant !== 'yilu') store.setHomeVariant('yilu')
}, { immediate: true })
</script>

<style scoped>
/* 品牌区：logo + 产品名，点击切换首页（医路慧影 / 医工慧检） */
.brand { display: flex; align-items: center; cursor: pointer; user-select: none; }
.brand-switch-icon {
  font-size: 10px; margin-left: 8px; padding: 2px 5px; border-radius: 5px;
  color: #94a3b8; background: #f1f5f9; opacity: 0; transition: opacity .15s, color .15s;
}
.brand:hover .brand-switch-icon { opacity: 1; color: #2563eb; }
.brand-switch-icon.is-home { opacity: .75; }

/* 东南大学医学院校徽：放在产品名前面（2026-09-20 批注） */
.brand-emblem { width: 28px; height: 28px; flex-shrink: 0; object-fit: contain; margin-right: 9px; }
.fade-enter-active { transition: opacity .3s .15s, transform .3s .15s; }
.fade-leave-active { transition: opacity .25s, transform .25s; }
.fade-enter-from { opacity: 0; transform: translateY(8px); }
.fade-leave-to { opacity: 0; transform: translateY(-4px); }

.breadcrumb-bar { display: flex; align-items: center; gap: 0; padding: 10px 24px; background: #fff; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
.breadcrumb-item { display: flex; align-items: center; }
.breadcrumb-sep { margin: 0 8px; color: #c0c4cc; }
.breadcrumb-item a { color: #409eff; cursor: pointer; text-decoration: none; }
.breadcrumb-item a:hover { text-decoration: underline; }
.breadcrumb-current { color: #606266; }
.version-badge { margin-left: 8px; }

.tts-status {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 4px 12px; border-radius: 6px;
  font-size: 12px; font-weight: 500;
  background: #f3f0ff; color: #6d28d9;
  border: 1px solid #e0d6ff;
  cursor: pointer; transition: background .15s;
  white-space: nowrap; margin-right: 12px;
}
.tts-status:hover { background: #ede5ff; }

.user-menu-wrap { position: relative; }
.user-menu { cursor: pointer; }
.user-dropdown {
  position: absolute; top: 100%; right: 0; margin-top: 6px;
  background: #fff; border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.12);
  border: 1px solid #e5e7eb; min-width: 150px; z-index: 1000;
  overflow: hidden;
}
.user-dropdown-item {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 16px; font-size: 13px; color: #374151;
  cursor: pointer; transition: background .12s;
}
.user-dropdown-item:hover { background: #f3f4f6; }
.user-dropdown-item.logout { color: #dc2626; }
.user-dropdown-item.logout:hover { background: #fef2f2; }
.user-dropdown-divider { height: 1px; background: #e5e7eb; margin: 2px 0; }
</style>
