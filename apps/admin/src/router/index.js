import { createRouter, createWebHashHistory } from 'vue-router'
import AdminLayout from '@/layouts/AdminLayout.vue'

const routes = [
  {
    path: '/',
    component: AdminLayout,
    children: [
      { path: '', name: 'home', component: () => import('@/views/HomeView.vue') },
      { path: 'platform-cases', name: 'platformCases', component: () => import('@/views/case-list/PlatformCaseList.vue') },
      { path: 'institution-cases', name: 'institutionCases', component: () => import('@/views/case-list/InstitutionCaseList.vue') },
      { path: 'expert-cases', name: 'expertCases', component: () => import('@/views/case-list/ExpertCaseList.vue') },
      { path: 'score-settings', name: 'scoreSettings', component: () => import('@/views/ScoreSettings.vue') },
      { path: 'flow-scheme-settings', name: 'flowSchemeSettings', component: () => import('@/views/FlowSchemeSettings.vue') },
      { path: 'station-settings', name: 'stationSettings', component: () => import('@/views/StationSettings.vue') },
      { path: 'system-settings', name: 'systemSettings', component: () => import('@/views/SystemSettings.vue') },
      { path: 'exam-records', name: 'examRecords', component: () => import('@/views/ExamRecords.vue') },
      { path: 'exam-create', name: 'examCreate', component: () => import('@/views/ExamCreate.vue') },
      { path: 'exam-monitor/:examId', name: 'examMonitor', component: () => import('@/views/ExamMonitor.vue') },
      { path: 'case-editor/:caseId?', name: 'caseEditor', props: true, component: () => import('@/views/case-editor/CaseEditor.vue') },
      { path: 'training-records', name: 'trainingRecords', component: () => import('@/views/TrainingRecords.vue') },
      // 病例分级管理（老师配置病例分级标签+AI伴学开关）
      { path: 'case-level-list', name: 'caseLevelList', component: () => import('@/views/new-features/CaseLevelList.vue') },
      { path: 'ai-companion', name: 'aiCompanionDetail', component: () => import('@/views/new-features/AICompanionDetail.vue') },
      // 原始病历素材库 + MDT 病例管理
      { path: 'raw-records', name: 'rawRecords', component: () => import('@/views/raw-records/RawRecordList.vue') },
      { path: 'raw-record-editor/:id?', name: 'rawRecordEditor', props: true, component: () => import('@/views/raw-records/RawRecordEditor.vue') },
      { path: 'mdt-cases', name: 'mdtCases', component: () => import('@/views/mdt-case-manage/MDTCaseList.vue') },
      { path: 'mdt-case-editor/:mdtId?', name: 'mdtCaseEditor', props: true, component: () => import('@/views/mdt-case-manage/MDTEditor.vue') },

    ]
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
