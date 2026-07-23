import { createRouter, createWebHashHistory } from 'vue-router'
import TrainingLayout from '@/layouts/TrainingLayout.vue'

const routes = [
  {
    path: '/',
    component: TrainingLayout,
    children: [
      { path: '', name: 'home', component: () => import('@/views/HomeView.vue') },
      { path: 'case-list/:specialty?', name: 'caseList', component: () => import('@/views/CaseList.vue') },
      { path: 'case-detail/:caseId', name: 'caseDetail', component: () => import('@/views/CaseDetail.vue') },
      { path: 'station-loading', name: 'stationLoading', component: () => import('@/views/StationLoading.vue') },
      { path: 'station-select', name: 'stationSelect', component: () => import('@/views/StationSelect.vue') },
      { path: 'history-taking', name: 'historyTaking', component: () => import('@/views/history-taking/HistoryTaking.vue') },
      { path: 'physical-exam', name: 'physicalExam', component: () => import('@/views/physical-exam/PhysicalExam.vue') },
      { path: 'treatment-plan', name: 'treatmentPlan', component: () => import('@/views/treatment-plan/TreatmentPlan.vue') },
      { path: 'medical-record', name: 'medicalRecord', component: () => import('@/views/medical-record/MedicalRecord.vue') },
      { path: 'case-analysis', name: 'caseAnalysis', component: () => import('@/views/case-analysis/CaseAnalysis.vue') },
      { path: 'humanistic-comm', name: 'humanisticComm', component: () => import('@/views/humanistic-comm/HumanisticComm.vue') },
      { path: 'ancillary-tests', name: 'ancillaryTests', component: () => import('@/views/ancillary-tests/AncillaryTests.vue') },
      { path: 'diagnosis', name: 'diagnosis', component: () => import('@/views/diagnosis/Diagnosis.vue') },
      { path: 'mental-exam', name: 'mentalExam', component: () => import('@/views/mental-exam/MentalExam.vue') },
      { path: 'preliminary-diag', redirect: { name: 'diagnosis' } },
      { path: 'score-report', name: 'scoreReport', component: () => import('@/views/ScoreReport.vue') },
      // 新功能页面
      { path: 'mdt-cases', name: 'mdtCaseList', component: () => import('@/views/MDTCaseList.vue') },
      { path: 'mdt-discussion/:caseId?', name: 'mdtDiscussion', component: () => import('@/views/MDTDiscussion.vue') },
      { path: 'adaptive-learning', name: 'adaptiveLearning', component: () => import('@/views/AdaptiveLearning.vue') },
    ]
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
