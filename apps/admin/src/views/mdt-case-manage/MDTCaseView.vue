<template>
  <div class="case-editor">
    <div v-if="loading" class="card" style="text-align:center;padding:60px 20px;color:var(--text-secondary)">
      <div class="spinner"></div>
      <p style="margin-top:16px">加载病例数据中...</p>
    </div>

    <template v-else-if="caseData">
      <div class="editor-header">
        <div class="header-left">
          <h2 class="editor-title">MDT 病例详情</h2>
          <span v-if="caseData.patientInfo?.name" class="patient-badge">
            {{ caseData.patientInfo.name }}{{ caseData.patientInfo.gender ? ' · ' + caseData.patientInfo.gender : '' }}{{ caseData.patientInfo.age != null ? ' · ' + caseData.patientInfo.age : '' }}
          </span>
          <span v-if="caseData.sourceRecordId" class="case-id-badge">{{ caseData.sourceRecordId }}</span>
          <span v-if="caseData.id" class="version-badge">{{ caseData.id }}</span>
        </div>
        <div class="header-right">
          <button class="btn btn-outline" @click="router.back()">返回</button>
        </div>
      </div>

      <div class="common-info-card card">
        <div class="common-info-head">
          <span class="common-info-title">病例元数据</span>
        </div>
        <div class="common-info-grid">
          <div class="info-item" style="grid-column:span 2">
            <label>病例名称</label>
            <div class="info-value">{{ caseData.name || '—' }}</div>
          </div>
          <div class="info-item">
            <label>来源方式</label>
            <div class="info-value">{{ sourceLabel(caseData.sourceType) }}</div>
          </div>
          <div class="info-item">
            <label>难度阶段</label>
            <div class="info-value">{{ caseData.teachingPhase || '—' }}</div>
          </div>
          <div class="info-item">
            <label>病例分级</label>
            <div class="info-value">{{ caseData.levelLabel || '—' }}</div>
          </div>
          <div class="info-item">
            <label>学科分类</label>
            <div class="info-value">{{ filterKeyLabel(caseData.filterKey) }}</div>
          </div>
          <div class="info-item">
            <label>来源</label>
            <div class="info-value">{{ caseData.source || '—' }}</div>
          </div>
          <div class="info-item" style="grid-column:span 2">
            <label>参与学科</label>
            <div class="flex gap-1" style="flex-wrap:wrap">
              <span v-for="d in caseData.disciplines" :key="d" class="badge badge-info">{{ d }}</span>
              <span v-if="!caseData.disciplines?.length" style="font-size:13px;color:var(--text-tertiary)">—</span>
            </div>
          </div>
          <div class="info-item" style="grid-column:span 2">
            <label>核心目标</label>
            <div class="info-value">{{ caseData.objective || '—' }}</div>
          </div>
        </div>
      </div>

      <div class="tab-bar">
        <button
          v-for="t in tabs"
          :key="t.key"
          :class="['tab-btn', { active: activeTab === t.key }]"
          @click="activeTab = t.key"
        >{{ t.label }}</button>
      </div>

      <div class="tab-content">
        <!-- 病例知识库 -->
        <div v-show="activeTab === 'kb'" class="tab-panel">
          <MDTKBForm :form="caseData" />
        </div>

        <!-- 基本信息 -->
        <div v-show="activeTab === 'basic'" class="tab-panel">
          <div class="card">
            <h3 class="section-title">患者资料</h3>
            <div class="info-grid">
              <template v-for="(item, k) in patientItems" :key="k">
                <div v-if="item.value" class="info-item" :class="{ wide: item.wide }">
                  <label>{{ item.label }}</label>
                  <div class="info-value">{{ item.value }}</div>
                </div>
              </template>
              <div v-if="patientItems.every(i => !i.value)" class="text-secondary" style="font-size:13px">暂无患者资料</div>
            </div>
          </div>
        </div>

        <!-- 学科与议题 -->
        <div v-show="activeTab === 'knowledge'" class="tab-panel">
          <div class="card">
            <h3 class="section-title">学科视角</h3>
            <div v-if="perspectives.length" class="disc-grid">
              <div v-for="p in perspectives" :key="p.dept" class="disc-card">
                <div class="disc-head">
                  <span class="badge badge-info">{{ p.dept }}</span>
                  <span class="text-secondary" style="font-size:12px">{{ p.expertName || p.expertTitle ? (p.expertName || '') + (p.expertTitle ? '·' + p.expertTitle : '') : '' }}</span>
                </div>
                <div class="disc-view">{{ p.view || '—' }}</div>
              </div>
            </div>
            <div v-else class="text-secondary" style="font-size:13px">暂无学科视角</div>
          </div>
          <div class="card">
            <h3 class="section-title">核心议题与关键问题</h3>
            <ol class="question-list">
              <li v-for="(q, i) in caseData.keyQuestions" :key="i">{{ q }}</li>
              <li v-if="!caseData.keyQuestions?.length" class="text-secondary">暂无关键问题</li>
            </ol>
          </div>
        </div>

        <!-- 剧本与任务 -->
        <div v-show="activeTab === 'script'" class="tab-panel">
          <div class="card">
            <h3 class="section-title">剧本与任务</h3>
            <div class="sub-label">讨论阶段</div>
            <div class="stages-row">
              <span v-for="(s, i) in caseData.stages" :key="i" class="stage-chip">{{ i + 1 }}. {{ s }}</span>
            </div>
            <div class="sub-label">讨论议程</div>
            <div class="agenda-list">
              <div v-for="(a, i) in caseData.agenda" :key="i" class="agenda-item">
                <span class="agenda-speaker">{{ speakerLabel(a.speaker) }}</span>
                <span class="agenda-text">{{ a.text }}</span>
                <span v-if="a.nextTask" class="badge badge-warning" style="flex-shrink:0">→ {{ a.nextTask }}</span>
              </div>
              <div v-if="!caseData.agenda?.length" class="text-secondary" style="font-size:13px">暂无议程</div>
            </div>
            <div class="sub-label">任务清单</div>
            <div v-for="t in caseData.tasks" :key="t.key" class="task-card">
              <div class="task-head">
                <code class="task-key">{{ t.key }}</code>
                <span class="task-label">{{ t.label }}</span>
                <span class="badge badge-info">{{ taskTypeLabel(t.type) }}</span>
                <span v-if="t.assess" class="badge">{{ assessLabel(t.assess) }}</span>
              </div>
              <div class="task-prompt">{{ t.prompt }}</div>
              <div v-if="t.placeholder" class="task-placeholder"><code>作答提示：</code>{{ t.placeholder }}</div>
            </div>
            <div v-if="!caseData.tasks?.length" class="text-secondary" style="font-size:13px">暂无任务</div>
          </div>
        </div>

        <!-- 决策与反馈 -->
        <div v-show="activeTab === 'decision'" class="tab-panel">
          <div class="card">
            <h3 class="section-title">决策与随访</h3>
            <div class="info-grid">
              <div class="info-item wide">
                <label>最终决策</label>
                <div class="info-value">{{ caseData.decision || '—' }}</div>
              </div>
              <div class="info-item wide">
                <label>随访计划</label>
                <div class="info-value">{{ caseData.followUp || '—' }}</div>
              </div>
              <div class="info-item wide">
                <label>参考文献</label>
                <div class="info-value">{{ caseData.referencesList?.length ? caseData.referencesList.join('\n') : '—' }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 角色话术 -->
        <div v-show="activeTab === 'role'" class="tab-panel">
          <div class="card">
            <h3 class="section-title">角色话术</h3>
            <div v-if="roleScripts" class="role-grid">
              <div v-for="(rs, role) in roleScripts" :key="role" class="role-card">
                <div class="role-title">{{ roleLabel(role) }}</div>
                <div v-if="rs.opening" class="role-line"><label>开场</label><span>{{ rs.opening }}</span></div>
                <div v-if="rs.callOut?.length" class="role-line"><label>呼叫话术</label><span>{{ rs.callOut.join('；') }}</span></div>
                <div v-if="rs.promptTemplates?.length" class="role-line"><label>追问模板</label><span>{{ rs.promptTemplates.join('；') }}</span></div>
                <div v-if="rs.interruptHint" class="role-line"><label>提问提示</label><span>{{ rs.interruptHint }}</span></div>
                <div v-if="!rs.opening && !rs.callOut?.length && !rs.promptTemplates?.length && !rs.interruptHint" class="text-secondary" style="font-size:13px">—</div>
              </div>
            </div>
            <div v-else class="text-secondary" style="font-size:13px">暂无角色话术</div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import MDTKBForm from './MDTKBForm.vue'
import { MDT_FILTER_KEYS } from './shared.js'

const router = useRouter()
const route = useRoute()

const loading = ref(true)
const caseData = ref(null)
const activeTab = ref('kb')

const tabs = [
  { key: 'kb', label: '病例知识库' },
  { key: 'basic', label: '基本信息' },
  { key: 'knowledge', label: '学科与议题' },
  { key: 'script', label: '剧本与任务' },
  { key: 'decision', label: '决策与反馈' },
  { key: 'role', label: '角色话术' }
]

const TASK_TYPE_LABELS = { text: '文字作答', choice: '选择作答', exhibit: '影像标注' }
const taskTypeLabel = (t) => TASK_TYPE_LABELS[t] || t || '—'
const ASSESS_LABELS = { diagnosis: '诊断判断力', imaging: '影像识读能力', plan: '方案一致性' }
const assessLabel = (a) => ASSESS_LABELS[a] || a || ''

const ROLE_LABELS = { observer: '观察者', attending: '主诊·管床·主任' }
const roleLabel = (r) => (r === 'resident' ? '观察者' : (ROLE_LABELS[r] || r))   // 旧病例 resident → 观察者

const SOURCE_LABELS = { ai: '系统内自建', raw: '基于原始病历', manual: '作者手动输入' }
const sourceLabel = (t) => SOURCE_LABELS[t] || '—'
const FILTER_LABELS = Object.fromEntries(MDT_FILTER_KEYS.map(k => [k.value, k.label]))
const filterKeyLabel = (k) => k ? (FILTER_LABELS[k] || k) : '未分类'

const SPEAKER_LABELS = { host: '主持人' }
const speakerLabel = (s) => SPEAKER_LABELS[s] || s

const patientItems = computed(() => {
  const pi = caseData.value?.patientInfo || {}
  return [
    { label: '主诉', value: pi.chiefComplaint, wide: true },
    { label: '现病史', value: pi.presentIllness, wide: true },
    { label: '生命体征', value: pi.vitals },
    { label: '体格检查', value: pi.physicalExam, wide: true },
    { label: '实验室检查', value: pi.labTests, wide: true },
    { label: '影像学检查', value: pi.imagingText, wide: true },
    { label: '既往史', value: pi.pastHistory, wide: true },
    { label: '家族史', value: pi.familyHistory, wide: true }
  ]
})

const perspectives = computed(() => caseData.value?.knowledgeBase?.disciplinePerspectives || [])
const roleScripts = computed(() => caseData.value?.roleScripts || null)

onMounted(async () => {
  const id = route.params.mdtId
  try {
    const res = await fetch(`/api/mdt-cases/${id}`)
    if (res.ok) caseData.value = await res.json()
  } catch (e) { /* 404 */ }
  loading.value = false
})
</script>

<style scoped>
.case-editor { background: var(--background); }

/* ── 头部 ── */
.editor-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 12px 24px; background: var(--card-bg); border-bottom: 1px solid var(--border);
  position: sticky; top: 0; z-index: 20;
}
.header-left { display: flex; align-items: center; gap: 12px; }
.editor-title { margin: 0; font-size: 16px; color: var(--text-main); }
.patient-badge {
  font-size: 12px; padding: 2px 8px; border-radius: 4px;
  background: #eef2ff; color: #4338ca;
}
.case-id-badge {
  font-size: 12px; padding: 2px 8px; border-radius: 4px;
  background: var(--primary-light); color: var(--primary); font-family: monospace;
}
.version-badge {
  font-size: 12px; padding: 2px 8px; border-radius: 4px;
  background: #f0fdf4; color: #16a34a; font-family: monospace;
}
.header-right { display: flex; gap: 8px; }

/* ── Tab 栏 ── */
.tab-bar {
  display: flex; gap: 0; padding: 0 24px;
  background: var(--card-bg); border-bottom: 1px solid var(--border);
  position: sticky; top: 53px; z-index: 10;
}
.tab-btn {
  padding: 10px 20px; background: none; border: none;
  border-bottom: 2px solid transparent; cursor: pointer;
  font-size: 14px; color: var(--text-secondary); transition: all .15s;
  font-family: inherit;
}
.tab-btn:hover { color: var(--primary); }
.tab-btn.active { color: var(--primary); border-bottom-color: var(--primary); font-weight: 600; }

.tab-content { }
.tab-panel { padding: 20px 24px; }

/* ── 公共元数据卡片（tab 上方，与编辑页一致）── */
.common-info-card {
  margin: 0; padding: 14px 24px; border-radius: 0;
  border-bottom: 1px solid var(--border);
}
.common-info-head {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 12px;
}
.common-info-title {
  font-size: 13px; font-weight: 600; color: var(--text-secondary);
  display: flex; align-items: center; gap: 6px;
}
.common-info-title::before {
  content: ''; width: 3px; height: 14px; background: var(--primary); border-radius: 2px;
}
.common-info-grid {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px 20px;
}

.card { margin-bottom: 14px; }
.section-title {
  font-size: 15px; font-weight: 600; color: var(--text-main);
  margin: 0 0 12px; display: flex; align-items: center; gap: 8px;
}
.section-title::before {
  content: ''; width: 3px; height: 16px; background: var(--primary); border-radius: 2px;
}

/* 基本信息 */
.info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px 20px; }
.info-item { display: flex; flex-direction: column; gap: 4px; }
.info-item.wide { grid-column: 1 / -1; }
.info-item label { font-size: 12px; color: var(--text-tertiary); }
.info-value {
  font-size: 13px; color: var(--text-main); line-height: 1.7;
  background: var(--border-light); border-radius: 8px; padding: 10px 12px;
  white-space: pre-wrap; word-break: break-all;
}
.loc-grid {
  display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px 20px;
  margin-bottom: 14px;
}
.loc-item { display: flex; flex-direction: column; gap: 4px; }
.loc-item label { font-size: 12px; color: var(--text-tertiary); }
.loc-item span { font-size: 13px; color: var(--text-main); }

/* 学科视角 */
.disc-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 12px; }
.disc-card { border: 1px solid var(--border); border-radius: 10px; padding: 12px 14px; }
.disc-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 8px; }
.disc-view { font-size: 13px; line-height: 1.7; color: var(--text-main); }

/* 剧本任务 */
.sub-label { font-size: 12px; color: var(--text-tertiary); margin: 14px 0 8px; }
.stages-row { display: flex; flex-wrap: wrap; gap: 8px; }
.stage-chip {
  font-size: 12px; padding: 4px 10px; border-radius: 20px;
  background: var(--primary-light); color: var(--primary); font-weight: 500;
}
.agenda-list { display: flex; flex-direction: column; gap: 8px; }
.agenda-item {
  display: flex; align-items: baseline; gap: 10px;
  background: var(--border-light); border-radius: 8px; padding: 8px 12px;
}
.agenda-speaker {
  flex-shrink: 0; font-size: 12px; font-weight: 600;
  color: var(--primary); background: var(--primary-lightest);
  border-radius: 4px; padding: 1px 8px;
}
.agenda-text { font-size: 13px; line-height: 1.6; color: var(--text-main); flex: 1; }
.task-card {
  border: 1px solid var(--border); border-radius: 10px;
  padding: 12px 14px; margin-bottom: 10px;
}
.task-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 8px; }
.task-key { font-size: 11px; background: #f3f4f6; padding: 1px 6px; border-radius: 4px; color: var(--text-secondary); }
.task-label { font-size: 13px; font-weight: 600; color: var(--text-main); }
.task-prompt { font-size: 13px; line-height: 1.7; color: var(--text-main); }
.task-placeholder {
  margin-top: 6px; font-size: 12px; color: var(--text-tertiary);
  background: #fafbfc; border-radius: 6px; padding: 6px 10px; white-space: pre-wrap;
}

/* 关键问题 */
.question-list { margin: 0; padding-left: 20px; }
.question-list li { font-size: 13px; line-height: 1.8; color: var(--text-main); margin-bottom: 4px; }

/* 角色话术 */
.role-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 12px; }
.role-card { border: 1px solid var(--border); border-radius: 10px; padding: 12px 14px; }
.role-title { font-size: 13px; font-weight: 600; color: var(--text-main); margin-bottom: 10px; }
.role-line { display: flex; flex-direction: column; gap: 2px; margin-bottom: 8px; }
.role-line label { font-size: 11px; color: var(--text-tertiary); }
.role-line span { font-size: 13px; line-height: 1.6; color: var(--text-main); }
</style>
