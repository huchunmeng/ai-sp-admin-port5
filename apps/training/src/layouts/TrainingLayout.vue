<template>
  <div class="training-container" style="position:relative;min-height:100vh;">
    <header class="app-header" v-if="!isStationRoute">
      <div class="header-left">
        <span class="system-name" @click="goHome" title="回到首页">医道星途临床思维教学智能体</span>
        <div class="mode-badge" @click="openAdmin" v-if="false">管理端</div>
        <div class="version-btns" v-if="showHiddenControls">
          <button class="ver-btn" @click="openAdmin">管理端</button>
          <button class="ver-btn" :class="{ active: store.appVersion === '1.0' }" @click="switchVersion('1.0')">进入1.0版</button>
          <button class="ver-btn" :class="{ active: store.appVersion === '2.0' }" @click="switchVersion('2.0')">进入2.0版</button>
        </div>
      </div>
      <div class="header-right">
        <div class="tts-status" v-if="showHiddenControls" :title="'当前TTS模型: ' + ttsModelLabel" @click="openOpsLlmConfig">
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

    <div class="breadcrumb-bar" v-if="crumbs.length && !isStationRoute">
      <span class="breadcrumb-item" v-for="(cr, i) in crumbs" :key="i">
        <span v-if="i > 0" class="breadcrumb-sep">/</span>
        <a v-if="cr.to" @click="handleCrumbClick(cr)">{{ cr.label }}</a>
        <span v-else class="breadcrumb-current">{{ cr.label }}</span>
      </span>
    </div>

    <router-view v-slot="{ Component }">
      <transition name="fade">
        <component :is="Component" />
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

const router = useRouter()
const route = useRoute()
const store = useTrainingStore()
const userStore = useUserStore()

// MDT 病例列表页面包屑「首页」跳转的外部地址
const EXTERNAL_HOME_URL = 'https://ydxt.njzdyy.com:20881/training-web/index'

function handleCrumbClick(cr) {
  if (typeof cr.to === 'string') {
    window.location.href = cr.to
    return
  }
  router.push(cr.to)
}

const showHiddenControls = ref(false)
const showUserMenu = ref(false)
let floatingBarEl = null

function toggleHiddenControls() {
  showHiddenControls.value = !showHiddenControls.value
  if (floatingBarEl) {
    floatingBarEl.style.display = showHiddenControls.value ? '' : 'none'
  }
}

const ttsModelLabel = computed(() => {
  const id = getCurrentTtsModel()
  if (id && id.startsWith('cosyvoice')) return 'CosyVoice V3'
  return 'Qwen-TTS'
})

function goHome() {
  router.push({ name: 'home' })
}

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

const isStationRoute = computed(function() {
  return stationRoutes.includes(route.name)
})

const crumbs = computed(function() {
  const items = []
  const name = route.name
  const lang = store.lang || 'zh'

  if (name !== 'home') {
    items.push({ label: lang === 'zh' ? '首页' : 'Home', to: name === 'mdtCaseList' ? EXTERNAL_HOME_URL : { name: 'home' } })
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
})
</script>

<style scoped>
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
