<template>
  <div class="case-editor">
    <!-- 头部：与病例编辑器同一套固定头（返回 / 保存草稿 / 发布） -->
    <div class="editor-header">
      <div class="header-left">
        <h2 class="editor-title">影像题库编辑器</h2>
        <span v-if="form.id" class="case-id-badge">ID: {{ form.id }}</span>
        <span class="badge" :class="SAMPLE_STATUS[form.status].badge">{{ SAMPLE_STATUS[form.status].label }}</span>
        <span class="badge badge-info">v{{ form.version }}</span>
      </div>
      <div class="header-right">
        <button class="btn btn-outline" @click="router.push({ name: 'imagingSamples' })">返回</button>
        <button class="btn btn-outline" @click="save('draft')">保存草稿</button>
        <button class="btn btn-primary" :disabled="!canPublish" @click="save('published')">发布</button>
      </div>
    </div>

    <!-- 基本信息：钉在固定头下方，不作为步骤（与病例编辑器的「钉顶信息卡」同形） -->
    <div class="common-info-card card">
      <div class="common-info-grid">
        <div class="filter-item" style="grid-column:span 2">
          <label>病例标题 <span style="color:var(--error)">*</span></label>
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

    <!-- 步骤条：与病例编辑器的标签栏同一套观感 -->
    <div class="editor-tab-bar">
      <button v-for="(s, i) in STEPS" :key="s.key" class="editor-tab-btn"
              :class="{ active: i === step, done: i < step }" @click="go(i)">
        <span class="editor-tab-no">
          <i v-if="i < step" class="fa-solid fa-check"></i>
          <span v-else>{{ i + 1 }}</span>
        </span>
        {{ s.label }}
      </button>
    </div>

    <div class="editor-panel">
      <!-- ① 影像序列（图片 → 患者信息 → 标准报告） -->
      <template v-if="step === 0">
        <div class="card" data-reviewable="影像序列">
          <div class="is-sub">影像序列</div>
          <SeriesUploader v-model="form.seriesFrames" v-model:views="form.views" />
          <!-- 患者信息与影像同卡：放在图片下面、报告内容上面（2026-09-20 批注 9） -->
          <div class="is-patient" data-reviewable="患者信息">
            <div class="is-sub">患者信息</div>
            <DeidentifyForm ref="deidentifyRef" v-model:deidentify="form.deidentify" v-model:clinicalBrief="form.clinicalBrief" />
          </div>
        </div>
        <div class="card" data-reviewable="标准报告">
          <div class="is-sub">标准报告</div>
          <GoldStandardForm v-model="form.goldStandard" />
        </div>
      </template>

      <!-- ② 评分表（本卷条件并入其顶部，不再单独成步） -->
      <div v-show="step === 1" class="card" data-reviewable="评分表">
        <RubricPanel v-model="form.rubric" :sample="rubricSample" @update:capabilities="onCapabilities" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { toast, confirm, TRAINING_LEVELS, getCaseLevelLabel } from '@ai-sp/shared'
import { MODALITIES, BODY_PARTS, SAMPLE_STATUS } from '@ai-sp/shared/imaging'
import SeriesUploader from './components/SeriesUploader.vue'
import DeidentifyForm from './components/DeidentifyForm.vue'
import GoldStandardForm from './components/GoldStandardForm.vue'
import RubricPanel from './components/RubricPanel.vue'
import { blankSample, getSample, upsertSample, nextSampleId, now, loadSamples } from './store.js'

const props = defineProps({ id: { type: String, default: '' } })
const router = useRouter()

const STEPS = [
  { key: 'series', label: '影像序列与标准报告' },
  { key: 'rubric', label: '评分表' }
]

const step = ref(0)
const form = ref(loadForm())
const deidentifyRef = ref(null)

const rubricSample = computed(() => ({ ...form.value, capabilities: form.value.capabilities }))

/** 本卷条件（原「能力位」）改在评分表里勾 */
function onCapabilities(next) {
  form.value.capabilities = next
}

const goldFilled = computed(() => {
  const g = form.value.goldStandard || {}
  return ['technique', 'findings', 'impression'].every(k => String(g[k] || '').trim().length > 0)
})
const rubricFilled = computed(() => Object.keys(form.value.rubric?.items || {}).length > 0)
const canPublish = computed(() => goldFilled.value && rubricFilled.value)

function go(i) { step.value = Math.min(STEPS.length - 1, Math.max(0, i)) }

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
  if (problems.length) { toast.show(problems[0], 'error'); step.value = 0; return }
  if (!String(form.value.title || '').trim()) { toast.show('请填写病例标题', 'warning'); return }
  if (target === 'published' && !goldFilled.value) { toast.show('三段标准报告皆非空方可发布', 'warning'); return }
  if (target === 'published' && !rubricFilled.value) { toast.show('请先维护评分表', 'warning'); step.value = 1; return }

  const row = { ...form.value, capabilities: { ...form.value.capabilities } }
  const existing = props.id ? getSample(props.id) : null
  const wasLive = existing && existing.status !== 'draft'

  if (!row.id) {
    row.id = nextSampleId()
    row.createdAt = now()
    row.createdBy = '管理端'
  } else if (wasLive) {
    confirm(`「${row.title}」当前为${SAMPLE_STATUS[existing.status].label}状态，保存将新建版本 v${existing.version + 1}。是否继续？`)
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
/* 外壳（固定头 / 钉顶信息卡 / 标签栏 / 面板）一律走 global.css 的编辑器通用类，
   本文件只留影像题库自己的小节样式，避免再次出现"各页各写一份、新页漏写"的老问题。 */
.is-sub { font-size: 13px; font-weight: 600; color: var(--text-main); margin-bottom: 12px; }
.is-sub::before {
  content: ''; display: inline-block; width: 3px; height: 13px; background: var(--primary);
  border-radius: 2px; margin-right: 7px; vertical-align: -1px;
}
/* 患者信息并入影像序列卡后的小节：与图片之间有一条分隔线 */
.is-patient {
  margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--border);
}
/* 卡片之间留出与病例编辑器一致的间距（差异点：这里一屏内是多张卡） */
.editor-panel .card + .card { margin-top: 16px; }
</style>
