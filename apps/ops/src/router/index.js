import { createRouter, createWebHashHistory } from 'vue-router'
import OpsLayout from '@/layouts/OpsLayout.vue'

const routes = [
  {
    path: '/',
    component: OpsLayout,
    children: [
      { path: '', redirect: { name: 'dashboard' } },
      { path: 'dashboard', name: 'dashboard', component: () => import('@/views/Dashboard.vue') },
      { path: 'institutions', name: 'institutions', component: () => import('@/views/Institutions.vue') },
      { path: 'station-settings', name: 'stationSettings', component: () => import('@/views/StationSettings.vue') },
      // 病例管理
      { path: 'platform-cases', name: 'platformCases', component: () => import('@/views/case-list/PlatformCaseList.vue') },
      { path: 'institution-cases', name: 'institutionCases', component: () => import('@/views/case-list/InstitutionCaseList.vue') },
      { path: 'expert-cases', name: 'expertCases', component: () => import('@/views/case-list/ExpertCaseList.vue') },
      { path: 'score-settings', name: 'scoreSettings', component: () => import('@/views/ScoreSettings.vue') },
      { path: 'score-editor', name: 'scoreEditor', component: () => import('@/views/ScoreTableEditor.vue') },
      { path: 'case-editor', name: 'caseEditor', component: () => import('@/views/case-editor/CaseEditor.vue') },
      // 培训管理
      { path: 'training-records', name: 'trainingRecords', component: () => import('@/views/TrainingRecords.vue') },
      // 考核管理
      { path: 'exam-records', name: 'examRecords', component: () => import('@/views/ExamRecords.vue') },
      { path: 'exam-create', name: 'examCreate', component: () => import('@/views/ExamCreate.vue') },
      { path: 'exam-monitor/:examId', name: 'examMonitor', component: () => import('@/views/ExamMonitor.vue') },
      { path: 'activity-records', name: 'activityRecords', component: () => import('@/views/ActivityRecords.vue') },
      // 审核管理
      { path: 'task-mgmt', name: 'taskMgmt', component: () => import('@/views/TaskManagement.vue') },
      { path: 'expert-mgmt', name: 'expertMgmt', component: () => import('@/views/ExpertManagement.vue') },
      { path: 'apply-audit', name: 'applyAudit', component: () => import('@/views/ApplyAudit.vue') },
      // 数据统计
      { path: 'record-query', name: 'recordQuery', component: () => import('@/views/RecordQuery.vue') },
      { path: 'personal-report', name: 'personalReport', component: () => import('@/views/PersonalReport.vue') },
      { path: 'export-mgmt', name: 'exportMgmt', component: () => import('@/views/ExportManagement.vue') },
      // 系统管理
      { path: 'sys-config', name: 'sysConfig', component: () => import('@/views/SystemSettings.vue') },
      { path: 'llm-config', name: 'llmConfig', component: () => import('@/views/SysConfig.vue') },
      { path: 'llm-config/prompts', name: 'llmPrompts', component: () => import('@/views/PromptViewer.vue') },
      { path: 'asset-manager', name: 'assetManager', component: () => import('@/views/AssetManager.vue') },
    ]
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
