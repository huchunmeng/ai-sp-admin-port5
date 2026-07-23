import { createRouter, createWebHashHistory } from 'vue-router'
import ExamLayout from '@/layouts/ExamLayout.vue'

const routes = [
  {
    path: '/',
    component: ExamLayout,
    children: [
      { path: '', redirect: { name: 'device-select' } },
      { path: 'login', name: 'login', component: () => import('@/views/Login.vue') },
      { path: 'password', name: 'password', component: () => import('@/views/Password.vue') },
      { path: 'device-select', name: 'device-select', component: () => import('@/views/DeviceSelect.vue') },
      { path: 'confirm', name: 'confirm', component: () => import('@/views/Confirm.vue') },
      { path: 'candidate-queue', name: 'candidate-queue', component: () => import('@/views/CandidateQueue.vue') },
      { path: 'task', name: 'task', component: () => import('@/views/Task.vue') },
      { path: 'dialogue', name: 'dialogue', component: () => import('@/views/Dialogue.vue') },
      { path: 'analysis', name: 'analysis', component: () => import('@/views/Analysis.vue') },
      { path: 'writing', name: 'writing', component: () => import('@/views/Writing.vue') },
      { path: 'complete', name: 'complete', component: () => import('@/views/Complete.vue') },
      { path: 'ex-login', name: 'ex-login', component: () => import('@/views/ExLogin.vue') },
      { path: 'scoring', name: 'scoring', component: () => import('@/views/Scoring.vue') },
      { path: 'ex-select', name: 'ex-select', component: () => import('@/views/ExSelect.vue') },
      { path: 'ex-pending', name: 'ex-pending', component: () => import('@/views/ExPending.vue') },
      { path: 'load-fail', name: 'load-fail', component: () => import('@/views/LoadFail.vue') }
    ]
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
