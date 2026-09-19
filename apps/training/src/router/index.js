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
      { path: 'mdt-premeeting/:caseId?', name: 'mdtPreMeeting', component: () => import('@/views/MDTPreMeeting.vue') },
      { path: 'mdt-raw-record', name: 'mdtRawRecord', component: () => import('@/views/MDTRawRecord.vue') },
      { path: 'mdt-records', name: 'mdtRecords', component: () => import('@/views/MDTRecordView.vue') },
      { path: 'adaptive-learning', name: 'adaptiveLearning', component: () => import('@/views/AdaptiveLearning.vue') },
      { path: 'vr-lab', name: 'vrLab', component: () => import('@/views/VRLab.vue') },
      { path: 'mentor/:category', name: 'mentorCases', component: () => import('@/views/MentorCaseView.vue') },
      // 影像报告书写训练（E2）—— 遵 PRD §6.1 学生侧页面清单拆为独立路由
      { path: 'report-writing', name: 'reportWriting', component: () => import('@/views/report-writing/ReportWritingHome.vue') },
      { path: 'report-writing/train', name: 'reportWritingTrain', component: () => import('@/views/report-writing/ReportWritingTrainList.vue') },
      { path: 'report-writing/train/:caseId', name: 'reportWritingWorkbench', component: () => import('@/views/report-writing/ReportWritingWorkbench.vue') },
      { path: 'report-writing/train/:caseId/result', name: 'reportWritingResult', component: () => import('@/views/report-writing/ReportWritingResult.vue') },
      // 考核侧本期未实现，保留可达的占位骨架（避免首页与在线考试页的入口 404）
      { path: 'report-writing/exam', name: 'reportWritingExam', component: () => import('@/views/report-writing/ReportWritingExam.vue') },
      { path: 'mooc/:module', name: 'moocModule', component: () => import('@/views/MoocModuleView.vue') },
      { path: 'exam-center', name: 'examCenter', component: () => import('@/views/ExamCenter.vue') },
    ]
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
