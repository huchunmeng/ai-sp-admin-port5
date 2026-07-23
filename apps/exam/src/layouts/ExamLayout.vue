<template>
  <div class="exam-root" :class="{ 'portrait-mode': store.portraitMode }">
    <aside class="sidebar" :class="{ collapsed: store.sidebarCollapsed }">
      <button class="sidebar-toggle" @click="store.toggleSidebar()" :title="store.sidebarCollapsed ? '展开菜单' : '收起菜单'">
        {{ store.sidebarCollapsed ? '▶' : '◀' }}
      </button>
      <div class="sidebar-logo">
        <div class="sys-name">AI-SP 考试端 v2.0</div>
        <div class="sys-ver">考核项目执考工具 · 原型</div>
      </div>
      <div class="sidebar-group">
        <div class="sidebar-group-title">考生端流程</div>
        <div v-for="item in candidateItems" :key="item.page" class="sidebar-item"
          :class="{ active: store.currentPage === item.page }" @click="store.setPage(item.page)">
          <span class="dot"></span>{{ item.label }}
        </div>
      </div>
      <div class="sidebar-group">
        <div class="sidebar-group-title">考官端流程</div>
        <div v-for="item in examinerItems" :key="item.page" class="sidebar-item"
          :class="{ active: store.currentPage === item.page }" @click="store.setPage(item.page)">
          <span class="dot"></span>{{ item.label }}
        </div>
      </div>
      <div class="sidebar-group">
        <div class="sidebar-group-title">异常/通用</div>
        <div class="sidebar-item" :class="{ active: store.currentPage === 'ex-pending' }" @click="store.setPage('ex-pending')">
          <span class="dot"></span>16. 待考考生
        </div>
        <div class="sidebar-item" :class="{ active: store.currentPage === 'load-fail' }" @click="store.setPage('load-fail')">
          <span class="dot"></span>17. 加载失败
        </div>
      </div>
    </aside>

    <div class="main">
      <header class="topbar">
        <span class="topbar-title">AI标准化病人考试系统 v2.0 · {{ store.pageTitles[store.currentPage] || '原型预览' }}</span>
        <div class="topbar-right">
          <span class="device-info" @click="store.toggleOrientation()" style="cursor:pointer;">🔄 {{ store.portraitMode ? '竖屏' : '横屏' }} {{ store.portraitMode ? '560×860' : '1024×700' }}</span>
          <span>{{ clock }}</span>
        </div>
      </header>
      <div class="content-wrap">
        <div class="content-main">
          <div class="tablet-frame">
            <div class="tablet-screen">
              <div class="tablet-statusbar">
                <span>💻 SP平板-01</span>
                <span>AI标准化病人考试系统 v2.0</span>
                <span>{{ clock }}</span>
              </div>
              <div class="tablet-content">
                <router-view />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showEndExamModal" class="modal-overlay" @click.self="showEndExamModal = false">
      <div class="modal-box"><div class="modal-title">⚠️ 提示</div><div class="modal-body">你即将结束考试，结束后不可返回。<br>是否确定？</div>
        <div class="modal-actions">
          <button class="btn btn-default" @click="showEndExamModal = false">取消</button>
          <button class="btn btn-danger" @click="endExam">确定</button>
        </div>
      </div>
    </div>

    <div v-if="showSubmitScoreModal" class="modal-overlay" @click.self="showSubmitScoreModal = false">
      <div class="modal-box"><div class="modal-title">✅ 确认提交</div><div class="modal-body">提交后将不可修改，是否确认提交？</div>
        <div class="modal-actions">
          <button class="btn btn-default" @click="showSubmitScoreModal = false">取消</button>
          <button class="btn btn-primary" @click="confirmSubmitScore">确认提交</button>
        </div>
      </div>
    </div>

    <div v-if="showAbortModal" class="modal-overlay" @click.self="showAbortModal = false">
      <div class="modal-box"><div class="modal-title">⛔ 中止考试</div><div class="modal-body">请选择中止原因：<br><br>
          <select class="input" style="width:100%;">
            <option>替考嫌疑</option><option>违规操作</option><option>身体不适</option><option>设备故障</option><option>其他（需填写）</option>
          </select>
        </div>
        <div class="modal-actions">
          <button class="btn btn-default" @click="showAbortModal = false">取消</button>
          <button class="btn btn-danger" @click="showAbortModal = false">确认中止</button>
        </div>
      </div>
    </div>

    <div v-if="showAddCandidateModal" class="modal-overlay" @click.self="showAddCandidateModal = false">
      <div class="modal-box"><div class="modal-title">👤 添加考生</div><div class="modal-body">
          <label class="input-label">姓名 <span style="color:var(--danger);">*</span></label><input class="input" v-model="newCandidateName" placeholder="考生姓名" style="margin-bottom:12px;">
          <label class="input-label">手机号 <span style="color:var(--danger);">*</span></label><input class="input" v-model="newCandidatePhone" placeholder="手机号" style="margin-bottom:12px;">
          <label class="input-label">考号（选填）</label><input class="input" v-model="newCandidateExamId" placeholder="考号">
        </div>
        <div class="modal-actions">
          <button class="btn btn-default" @click="showAddCandidateModal = false">取消</button>
          <button class="btn btn-primary" @click="doAddCandidate">提交</button>
        </div>
      </div>
    </div>

    <div id="sp-exam-bar" style="display:none;"></div>
  </div>
</template>

<script setup>
import { ref, provide, watch, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useExamStore } from '@/stores/exam'
import { useClock } from '@/composables/useClock'
import { review, requirement, bottomBar, createDefaultActions, resolveAppUrls } from '@ai-sp/shared'

const store = useExamStore()
const router = useRouter()
const route = useRoute()
const { time: clock } = useClock()

watch(() => store.currentPage, (page) => {
  if (route.name !== page) router.push({ name: page })
})

onMounted(() => {
  if (route.name && route.name !== store.currentPage) {
    store.currentPage = route.name
  }
})

const urls = resolveAppUrls()

const actions = createDefaultActions(route, {
  reviewAction: () => { review.toggle(route.name || '') },
  requirementAction: () => { requirement.toggle(route.name) },
  btns: [
    { label: '管理端', url: urls.admin, name: 'ai-sp-admin', style: { background: '#4A90E2', color: '#fff' } },
    { label: '训练端', url: urls.training, name: 'ai-sp-training', style: { background: '#7c3aed', color: '#fff' } },
    { label: '运营平台', url: urls.ops, name: 'ai-sp-ops', style: { background: '#7c3aed', color: '#fff' } },
    { label: '电子书包', url: urls.appTraining, name: 'ai-sp-app-training', style: { background: '#059669', color: '#fff' } },
  ]
})

const showEndExamModal = ref(false)
const showSubmitScoreModal = ref(false)
const showAbortModal = ref(false)
const showAddCandidateModal = ref(false)
const newCandidateName = ref('')
const newCandidatePhone = ref('')
const newCandidateExamId = ref('')

const candidateItems = [
  { page: 'login', label: '1. 考务登录' },
  { page: 'password', label: '2. 考试口令' },
  { page: 'device-select', label: '3. 设备选择' },
  { page: 'confirm', label: '4. 考生确认' },
  { page: 'candidate-queue', label: '5. 考生队列' },
  { page: 'task', label: '6. 任务说明' },
  { page: 'dialogue', label: '7. 对话考核' },
  { page: 'analysis', label: '8. 病例分析' },
  { page: 'writing', label: '9. 病历书写' },
  { page: 'complete', label: '10. 考核完成' }
]

const examinerItems = [
  { page: 'ex-login', label: '11. 考官登录' },
  { page: 'ex-select', label: '12. 评分记录' },
  { page: 'scoring', label: '13. 考官评分' }
]

onMounted(() => {
  bottomBar.render(actions)
  review.setViewName(route.name || '')
})

onUnmounted(() => {
  bottomBar.destroy()
})

watch(() => route.name, (name) => {
  if (name) review.setViewName(name)
})

function endExam() {
  showEndExamModal.value = false
  store.setPage('complete')
}
function confirmSubmitScore() {
  showSubmitScoreModal.value = false
  store.submitAllSheets()
}

function doAddCandidate() {
  if (!newCandidateName.value || !newCandidatePhone.value) return
  store.addCandidate(newCandidateName.value, newCandidatePhone.value, newCandidateExamId.value)
  newCandidateName.value = ''
  newCandidatePhone.value = ''
  newCandidateExamId.value = ''
  showAddCandidateModal.value = false
}

provide('showEndExamModal', () => { showEndExamModal.value = true })
provide('showSubmitScoreModal', () => { showSubmitScoreModal.value = true })
provide('showAbortModal', () => { showAbortModal.value = true })
provide('showAddCandidateModal', () => { showAddCandidateModal.value = true })
</script>

<style scoped>
.exam-root { display:flex; height:100vh; overflow:hidden; }

.sidebar { width: var(--sidebar-w); min-width: var(--sidebar-w); background: #fff; border-right: 1px solid var(--border); display:flex; flex-direction:column; overflow-y:auto; z-index:10; transition: width .25s, min-width .25s; position: relative; }
.sidebar.collapsed { width: 0; min-width: 0; overflow: hidden; border-right: none; }
.sidebar-toggle { position: absolute; top: 10px; right: -32px; width: 28px; height: 28px; background: #fff; border: 1px solid var(--border); border-left: none; border-radius: 0 6px 6px 0; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px; color: var(--text-secondary); z-index: 11; }
.sidebar.collapsed .sidebar-toggle { right: -32px; border-left: 1px solid var(--border); border-radius: 6px; }
.sidebar-logo { padding: 20px 16px 12px; border-bottom:1px solid var(--border); }
.sidebar-logo .sys-name { font-size:15px; font-weight:700; color:var(--primary); }
.sidebar-logo .sys-ver { font-size:11px; color:var(--text-tertiary); margin-top:2px; }
.sidebar-group { padding:8px 0; }
.sidebar-group-title { font-size:11px; color: var(--text-tertiary); padding:8px 16px 4px; letter-spacing:1px; text-transform:uppercase; }
.sidebar-item { display:flex; align-items:center; gap:8px; padding:9px 16px; font-size:13px; color:var(--text-secondary); cursor:pointer; transition: all .15s; border-left:3px solid transparent; user-select:none; }
.sidebar-item:hover { background:var(--primary-light); color:var(--primary); }
.sidebar-item.active { background:var(--primary-light); color:var(--primary); font-weight:600; border-left-color:var(--primary); }
.sidebar-item .dot { width:6px; height:6px; border-radius:50%; background:var(--text-tertiary); flex-shrink:0; }
.sidebar-item.active .dot { background:var(--primary); }

.main { flex:1; display:flex; flex-direction:column; overflow:hidden; min-width:0; }
.topbar { height:52px; min-height:52px; background:#fff; border-bottom:1px solid var(--border); display:flex; align-items:center; justify-content:space-between; padding:0 24px; }
.topbar-title { font-size:16px; font-weight:700; color:var(--text-primary); }
.topbar-right { display:flex; align-items:center; gap:16px; font-size:13px; color:var(--text-secondary); }
.topbar-right .device-info { color:var(--primary); font-weight:500; }
.content-wrap { flex:1; display:flex; overflow:hidden; position:relative; }
.content-main { flex:1; display:flex; align-items:center; justify-content:center; padding:20px; overflow-y:auto; background: var(--bg); }

.tablet-frame { width:1024px; height:700px; background:#1a1a2e; border-radius:20px; padding:14px 10px; box-shadow:0 8px 30px rgba(0,0,0,0.18); display:flex; flex-direction:column; align-items:center; flex-shrink:0; }
.tablet-screen { width:996px; height:672px; background:#fff; border-radius:8px; overflow:hidden; display:flex; flex-direction:column; }
.portrait-mode .tablet-frame { width:560px; height:860px; padding:18px 12px; }
.portrait-mode .tablet-screen { width:536px; height:824px; }
.portrait-mode .content-main { padding:10px; align-items:flex-start; }
.portrait-mode .tablet-content { word-break:break-word; }
.portrait-mode .tablet-content > * { min-width:0; }
.tablet-statusbar { height:28px; background:#f8f9fb; display:flex; align-items:center; justify-content:space-between; padding:0 16px; font-size:11px; color:var(--text-tertiary); border-bottom:1px solid var(--border); flex-shrink:0; }
.tablet-content { flex:1; overflow-y:auto; overflow-x:hidden; position:relative; display:flex; flex-direction:column; }

.btn { display:inline-flex; align-items:center; justify-content:center; gap:6px; padding:10px 24px; border-radius:var(--btn-radius); font-size:14px; font-family:var(--font); cursor:pointer; border:none; transition:all .15s; user-select:none; min-height:44px; }
.btn-primary { background:var(--primary); color:#fff; } .btn-primary:hover { background:var(--primary-hover); }
.btn-default { background:#fff; color:var(--text-secondary); border:1px solid var(--border); } .btn-default:hover { background:var(--input-bg); }
.btn-danger { background:var(--danger); color:#fff; } .btn-danger:hover { opacity:.9; }
.btn-outline { background:#fff; color:var(--primary); border:2px solid var(--primary); }
.btn-sm { padding:6px 14px; font-size:12px; min-height:32px; }
.btn-block { width:100%; }
.input { padding:10px 14px; border-radius:var(--btn-radius); font-size:14px; font-family:var(--font); border:none; background:var(--input-bg); outline:none; transition:all .15s; width:100%; }
.input:focus { background:#fff; box-shadow:0 0 0 2px var(--primary-light); }
.input-label { font-size:13px; color:var(--text-secondary); margin-bottom:4px; display:block; }
.card { background:var(--card-bg); border-radius:var(--card-radius); box-shadow:var(--card-shadow); padding:20px; }
.badge { display:inline-flex; align-items:center; gap:4px; padding:2px 10px; border-radius:4px; font-size:11px; font-weight:500; }
.badge-success { background:#d1fae5; color:#065f46; } .badge-warning { background:#fef3c7; color:#92400e; }
.badge-error { background:#fee2e2; color:#991b1b; } .badge-info { background:#dbeafe; color:#1e40af; }
.modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.45); z-index:1000; display:flex; align-items:center; justify-content:center; }
.modal-box { background:#fff; border-radius:16px; padding:28px; max-width:440px; width:90%; box-shadow:0 12px 40px rgba(0,0,0,0.15); }
.modal-title { font-size:18px; font-weight:600; margin-bottom:12px; }
.modal-body { font-size:14px; color:var(--text-secondary); margin-bottom:20px; line-height:1.6; }
.modal-actions { display:flex; gap:12px; justify-content:flex-end; }
</style>
