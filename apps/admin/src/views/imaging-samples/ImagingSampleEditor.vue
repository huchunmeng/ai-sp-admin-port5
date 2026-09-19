<template>
  <div class="case-editor is-editor">
    <!-- 头部：动作按钮在顶部固定头（避开全局评审批注浮条常驻的右下角） -->
    <div class="editor-header">
      <div class="header-left">
        <h2 class="editor-title">{{ isNew ? '新建病例' : '编辑病例' }}</h2>
        <span v-if="form.id" class="case-id-badge">{{ form.id }}</span>
        <span class="badge" :class="SAMPLE_STATUS[form.status].badge">{{ SAMPLE_STATUS[form.status].label }}</span>
        <span class="text-secondary" style="font-size:12px">v{{ form.version }}</span>
      </div>
      <div class="header-right">
        <button class="btn btn-outline" @click="router.push({ name: 'imagingSamples' })">返回</button>
        <button class="btn" @click="save('draft')">保存草稿</button>
        <button class="btn btn-primary" :disabled="!canPublish" @click="save('published')">发布</button>
      </div>
    </div>

    <!-- 步骤条 -->
    <div class="is-steps">
      <div v-for="(s, i) in STEPS" :key="s.key" class="is-step"
           :class="{ active: i === step, done: i < step }" @click="go(i)">
        <span class="is-step-no">
          <i v-if="i < step" class="fa-solid fa-check"></i>
          <span v-else>{{ i + 1 }}</span>
        </span>
        <span class="is-step-label">{{ s.label }}</span>
      </div>
    </div>

    <div class="is-body">
      <!-- ① 基本信息 -->
      <div v-show="step === 0" class="card" data-reviewable="基本信息">
        <div class="is-meta">
          <div class="filter-item" style="grid-column:span 2">
            <label>病例标题<span>*</span></label>
            <input class="input" v-model="form.title" placeholder="如：胸部CT · 右肺上叶结节" style="width:100%">
          </div>
          <div class="filter-item">
            <label>检查部位</label>
            <select class="select" v-model="form.bodyPart"><option v-for="p in BODY_PARTS" :key="p" :value="p">{{ p }}</option></select>
          </div>
          <div class="filter-item">
            <label>模态</label>
            <select class="select" v-model="form.modality"><option v-for="m in MODALITIES" :key="m" :value="m">{{ m }}</option></select>
          </div>
          <div class="filter-item">
            <label>难度</label>
            <select class="select" v-model="form.level">
              <option v-for="l in TRAINING_LEVELS" :key="l.value" :value="l.value">{{ l.value }} · {{ getCaseLevelLabel(l.value) }}</option>
            </select>
          </div>
        </div>
      </div>

      <!-- ② 影像序列 -->
      <div v-show="step === 1" class="card" data-reviewable="影像序列">
        <SeriesUploader v-model="form.seriesFrames" v-model:views="form.views" />
      </div>

      <!-- ③ 脱敏信息 -->
      <div v-show="step === 2" class="card" data-reviewable="脱敏信息">
        <DeidentifyForm ref="deidentifyRef" v-model:deidentify="form.deidentify" v-model:clinicalBrief="form.clinicalBrief" />
      </div>

      <!-- ④ 能力位 -->
      <div v-show="step === 3" class="card" data-reviewable="能力位">
        <CapabilityPanel v-model="form.capabilities" />
      </div>

      <!-- ⑤ 金标准报告 -->
      <div v-show="step === 4" class="card" data-reviewable="金标准报告">
        <GoldStandardForm v-model="form.goldStandard" />
      </div>

      <!-- ⑥ 评分要点集 -->
      <div v-show="step === 5" class="card" data-reviewable="评分要点集">
        <RubricPanel v-model="form.rubric" :sample="rubricSample" />
      </div>
    </div>

    <!-- 页脚：步骤导航 + 实时可评分 -->
    <div class="is-foot">
      <div class="is-foot-left">
        <button class="btn" :disabled="step === 0" @click="go(step - 1)">
          <i class="fa-solid fa-chevron-left"></i> 上一步
        </button>
        <button class="btn" :disabled="step === STEPS.length - 1" @click="go(step + 1)">
          下一步 <i class="fa-solid fa-chevron-right"></i>
        </button>
      </div>
      <div class="is-foot-right">
        <span>可评分</span>
        <b :class="liveScoreable >= 85 ? 'text-primary' : 'text-warning'">{{ liveScoreable }}</b>
        <span class="text-secondary"> / 100</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { toast, confirm, TRAINING_LEVELS, getCaseLevelLabel } from '@ai-sp/shared'
import { MODALITIES, BODY_PARTS, SAMPLE_STATUS, resolveRubric } from '@ai-sp/shared/imaging'
import SeriesUploader from './components/SeriesUploader.vue'
import DeidentifyForm from './components/DeidentifyForm.vue'
import CapabilityPanel from './components/CapabilityPanel.vue'
import GoldStandardForm from './components/GoldStandardForm.vue'
import RubricPanel from './components/RubricPanel.vue'
import { blankSample, getSample, upsertSample, nextSampleId, now, loadSamples } from './store.js'

const props = defineProps({ id: { type: String, default: '' } })
const router = useRouter()

const STEPS = [
  { key: 'basic', label: '基本信息' },
  { key: 'series', label: '影像序列' },
  { key: 'deidentify', label: '脱敏信息' },
  { key: 'capability', label: '能力位' },
  { key: 'gold', label: '金标准报告' },
  { key: 'rubric', label: '评分要点集' }
]

const step = ref(0)
const isNew = computed(() => !props.id)
const form = ref(loadForm())
const deidentifyRef = ref(null)

const rubricSample = computed(() => ({ ...form.value, capabilities: form.value.capabilities }))
const liveResolved = computed(() => resolveRubric(form.value.id || '__new__', form.value.capabilities))
const liveScoreable = computed(() => liveResolved.value.scoreableMax)

const goldFilled = computed(() => {
  const g = form.value.goldStandard || {}
  return ['technique', 'findings', 'impression'].every(k => String(g[k] || '').trim().length > 0)
})
const rubricFilled = computed(() => Object.keys(form.value.rubric?.items || {}).length > 0)
const canPublish = computed(() => goldFilled.value && rubricFilled.value)

function go(i) {
  step.value = Math.min(STEPS.length - 1, Math.max(0, i))
}

function loadForm() {
  loadSamples()
  if (props.id) {
    const found = getSample(props.id)
    if (found) return found
    toast.show(`未找到病例 ${props.id}，已切换为新建`, 'warning')
  }
  return blankSample()
}

function save(target) {
  const problems = deidentifyRef.value ? deidentifyRef.value.validate() : []
  if (problems.length) { toast.show(problems[0], 'error'); step.value = 2; return }
  if (!String(form.value.title || '').trim()) { toast.show('请填写病例标题', 'warning'); step.value = 0; return }
  if (target === 'published' && !goldFilled.value) { toast.show('三段金标准皆非空方可发布', 'warning'); step.value = 4; return }
  if (target === 'published' && !rubricFilled.value) { toast.show('请先维护评分要点集', 'warning'); step.value = 5; return }

  const row = { ...form.value, capabilities: { ...form.value.capabilities } }
  const existing = props.id ? getSample(props.id) : null
  const wasLive = existing && existing.status !== 'draft'

  if (!row.id) {
    row.id = nextSampleId()
    row.createdAt = now()
    row.createdBy = '管理端'
  } else if (wasLive) {
    confirm(`「${row.title}」当前为${SAMPLE_STATUS[existing.status].label}状态，保存将新建版本 v${existing.version + 1}（原版本保留可回查）。是否继续？`)
      .then(ok => { if (ok) commit(row, target, true) })
      .catch(() => {})
    return
  }
  commit(row, target, false)
}

function commit(row, target, isRev) {
  row.status = target === 'published' ? 'published' : (isRev ? 'draft' : row.status === 'disabled' ? 'disabled' : 'draft')
  if (isRev) row.version = (getSample(props.id)?.version || row.version) + 1
  row.updatedAt = now()
  row.updatedBy = '管理端'
  if (target === 'published') row.publishedAt = now()

  const saved = upsertSample(row)
  form.value = saved
  if (props.id !== saved.id) router.replace({ name: 'imagingSampleEditor', params: { id: saved.id } })
  toast.show(target === 'published' ? '已发布' : '草稿已保存', 'success')
}
</script>

<style scoped>
.is-body { padding: 16px 24px 0; }
.is-meta { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px 16px; align-items: end; }

.is-steps {
  display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
  padding: 12px 24px; background: var(--card-bg); border-bottom: 1px solid var(--border);
}
.is-step {
  display: inline-flex; align-items: center; gap: 7px; cursor: pointer;
  font-size: 12.5px; color: var(--text-secondary);
  padding: 5px 12px 5px 7px; border-radius: 999px; transition: all .15s;
}
.is-step:hover { background: #F0F7FF; }
.is-step.active { background: var(--primary-light); color: var(--primary); font-weight: 600; }
.is-step.done { color: var(--success); }
.is-step-no {
  width: 20px; height: 20px; border-radius: 50%; flex-shrink: 0;
  background: #E4E7ED; color: #909399; font-size: 11px; font-weight: 600;
  display: flex; align-items: center; justify-content: center;
}
.is-step.active .is-step-no { background: var(--primary); color: #fff; }
.is-step.done .is-step-no { background: var(--success); color: #fff; }

.is-foot {
  position: sticky; bottom: 0; z-index: 15;
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 24px; background: var(--card-bg); border-top: 1px solid var(--border);
  box-shadow: 0 -1px 3px rgba(0, 0, 0, 0.04);
}
.is-foot-left { display: flex; gap: 8px; }
.is-foot-right { display: flex; align-items: baseline; gap: 6px; font-size: 13px; }
.is-foot-right b { font-size: 18px; }
</style>
