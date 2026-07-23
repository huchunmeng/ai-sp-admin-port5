import { createRouter, createWebHashHistory } from 'vue-router'
import AppTrainingLayout from '@/layouts/AppTrainingLayout.vue'

const routes = [
  {
    path: '/',
    component: AppTrainingLayout,
    children: [
      { path: '', redirect: { name: 'caseList' } },
      { path: 'case-list/:specialty?', name: 'caseList', component: () => import('@/views/CaseList.vue') },
      { path: 'case-detail/:caseId', name: 'caseDetail', component: () => import('@/views/CaseDetail.vue') },
      { path: 'station-loading', name: 'stationLoading', component: () => import('@/t-views/StationLoading.vue') },
      { path: 'station-select', name: 'stationSelect', component: () => import('@/t-views/StationSelect.vue') },
      { path: 'history-taking', name: 'historyTaking', component: () => import('@/t-views/history-taking/HistoryTaking.vue') },
      { path: 'physical-exam', name: 'physicalExam', component: () => import('@/t-views/physical-exam/PhysicalExam.vue') },
      { path: 'preliminary-diag', name: 'preliminaryDiag', component: () => import('@/t-views/preliminary-diag/PreliminaryDiag.vue') },
      { path: 'treatment-plan', name: 'treatmentPlan', component: () => import('@/t-views/treatment-plan/TreatmentPlan.vue') },
      { path: 'medical-record', name: 'medicalRecord', component: () => import('@/t-views/medical-record/MedicalRecord.vue') },
      { path: 'case-analysis', name: 'caseAnalysis', component: () => import('@/t-views/case-analysis/CaseAnalysis.vue') },
      { path: 'humanistic-comm', name: 'humanisticComm', component: () => import('@/t-views/humanistic-comm/HumanisticComm.vue') },
      { path: 'score-report', name: 'scoreReport', component: () => import('@/t-views/ScoreReport.vue') }
    ]
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
