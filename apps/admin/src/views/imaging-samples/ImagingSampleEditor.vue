<template>
  <div class="case-editor is-editor">
    <!-- 头部：动作按钮放这里（顶部固定头），避开全局评审批注浮条常驻的右下角 -->
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
        <button class="btn btn-primary" @click="save('published')">发布</button>
      </div>
    </div>

    <div class="is-body">
      <!-- 基本信息 -->
      <div class="card mb-4" data-reviewable="基本信息">
        <div class="section-head"><span class="section-head-title">基本信息</span></div>
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

      <!-- ① 影像序列入库 -->
      <div class="card mb-4" data-reviewable="影像序列入库">
        <div class="section-head">
          <span class="section-head-title">① 影像序列入库</span>
          <span class="text-secondary" style="font-size:12px">
            序列数量与名称自定义（1 个不嫌少、5 个不嫌多）· 前端解包 · 单视图 ≤ 300 张 / 单张 ≤ 5 MB / 仅 jpg·png
          </span>
        </div>
        <SeriesUploader v-model="form.seriesFrames" v-model:views="form.views" />
      </div>

      <!-- ② 脱敏信息 -->
      <div class="card mb-4" data-reviewable="脱敏信息">
        <div class="section-head">
          <span class="section-head-title">② 脱敏信息</span>
          <span class="text-secondary" style="font-size:12px">录入脱敏后的展示值，系统硬校验格式</span>
        </div>
        <DeidentifyForm ref="deidentifyRef" v-model:deidentify="form.deidentify" v-model:clinicalBrief="form.clinicalBrief" />
      </div>

      <!-- ③ 能力位声明 -->
      <div class="card mb-4" data-reviewable="能力位声明">
        <div class="section-head">
          <span class="section-head-title">③ 能力位声明</span>
          <span class="text-secondary" style="font-size:12px">决定哪些评分要点可评 —— 后果当场可见</span>
        </div>
        <CapabilityPanel v-model="form.capabilities" />
      </div>

      <!-- ④ 金标准报告 -->
      <div class="card mb-4" data-reviewable="金标准报告">
        <div class="section-head">
          <span class="section-head-title">④ 金标准报告</span>
          <span class="text-secondary" style="font-size:12px">三段式 · 字段规则与训练端同值同规则 · 三段皆非空方可发布</span>
        </div>
        <GoldStandardForm v-model="form.goldStandard" />
      </div>

      <!-- ⑤ 评分要点集 -->
      <div class="card mb-4" data-reviewable="评分要点集">
        <div class="section-head">
          <span class="section-head-title">⑤ 评分要点集</span>
          <span class="text-secondary" style="font-size:12px">
            LLM 评分的判据 —— 按要点命中判分，而不是拿学员报告跟范文比相似度
          </span>
        </div>
        <RubricPanel v-model="form.rubric" :sample="rubricSample" />
      </div>

      <!-- 版本与审计 -->
      <div class="card mb-4" data-reviewable="版本与审计">
        <div class="section-head"><span class="section-head-title">版本与审计</span></div>
        <div class="is-audit">
          <div>创建：{{ form.createdAt || '—' }} · {{ form.createdBy || '—' }}</div>
          <div>最近改动：{{ form.updatedAt || '—' }} · {{ form.updatedBy || '—' }}</div>
          <div>发布：{{ form.publishedAt || '（未发布）' }}</div>
          <div class="text-secondary" style="line-height:1.9;margin-top:6px">
            改<b>草稿</b>样本原地修改、版本不变；改<b>已发布 / 已停用</b>样本强制新建版本（版本 +1），
            原版本保留可回查 —— 已发布的考核任务锁在派发时刻的样本版本上，不随改动变化。
          </div>
        </div>
      </div>
    </div>

    <!-- 页脚：实时派生量读出（动作按钮在顶部固定头，此处只读） -->
    <div class="is-foot">
      <div class="is-foot-left">
        <span>本样本可评分</span>
        <b :class="liveScoreable >= 85 ? 'text-primary' : 'text-warning'">{{ liveScoreable }}</b>
        <span class="text-secondary"> / 100</span>
        <span v-if="liveScoreable < 85" class="badge badge-warning" style="margin-left:8px">低于发布下限 85</span>
        <span class="text-secondary" style="margin-left:10px">
          不可评 {{ liveUnassessable.length }} 条 · 其分值自分母剔除、不按 0 分计
        </span>
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

const isNew = computed(() => !props.id)
const form = ref(loadForm())
const deidentifyRef = ref(null)

/** 要点集面板需要完整样本（金标准 + 能力位）才能解析与抽取 */
const rubricSample = computed(() => ({ ...form.value, capabilities: form.value.capabilities }))

/** 页脚可评分随能力位与要点集**实时现算**（PRD §5.12.5「后果当场可见」） */
const liveResolved = computed(() => resolveRubric(form.value.id || '__new__', form.value.capabilities))
const liveScoreable = computed(() => liveResolved.value.scoreableMax)
const liveUnassessable = computed(() => liveResolved.value.unassessable)

function loadForm() {
  loadSamples()
  if (props.id) {
    const found = getSample(props.id)
    if (found) return found
    toast.show(`未找到病例 ${props.id}，已切换为新建`, 'warning')
  }
  return blankSample()
}

/**
 * 保存。`draft` 只校验脱敏格式与标题；`published` 额外要求三段金标准皆非空。
 * 改已发布/已停用样本走**新建版本**（PRD §5.12.8）。
 */
function save(target) {
  const problems = deidentifyRef.value ? deidentifyRef.value.validate() : []
  if (problems.length) { toast.show(`脱敏信息不合规：${problems[0]}`, 'error'); return }
  if (!String(form.value.title || '').trim()) { toast.show('请先填写病例标题', 'warning'); return }

  const gold = form.value.goldStandard || {}
  const goldFilled = ['technique', 'findings', 'impression'].every(k => String(gold[k] || '').trim().length > 0)
  if (target === 'published' && !goldFilled) { toast.show('三段金标准皆非空方可发布', 'warning'); return }
  if (target === 'published' && !Object.keys(form.value.rubric?.items || {}).length) {
    toast.show('发布前请先维护评分要点集（可用「AI 从金标准抽取」生成一版）', 'warning')
    return
  }

  const row = { ...form.value, capabilities: { ...form.value.capabilities } }

  const existing = props.id ? getSample(props.id) : null
  const wasLive = existing && existing.status !== 'draft'

  if (!row.id) {
    row.id = nextSampleId()
    row.createdAt = now()
    row.createdBy = '管理端'
  } else if (wasLive) {
    confirm(`「${row.title}」当前为${SAMPLE_STATUS[existing.status].label}状态，保存将新建版本 v${existing.version + 1}（原版本保留可回查）。当前有 0 个未结束任务引用该病例的旧版本，它们不会随本次改动变化。是否继续？`)
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
  toast.show(target === 'published' ? '病例已发布' : '草稿已保存', 'success')
}
</script>

<style scoped>
/* 仅供本页的少量形态；外壳（.case-editor / .editor-header / .section-head）与按钮、表单、徽章、
   表格一律走 global.css 既有类 */
.is-body { padding: 16px 24px 0; }
.is-meta { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px 16px; align-items: end; }
.is-audit { font-size: 12.5px; line-height: 2; color: var(--text-main); }
.is-foot {
  position: sticky; bottom: 0; z-index: 15;
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 24px; background: var(--card-bg); border-top: 1px solid var(--border);
  box-shadow: 0 -1px 3px rgba(0, 0, 0, 0.04);
}
.is-foot-left { display: flex; align-items: baseline; gap: 6px; font-size: 13px; }
.is-foot-left b { font-size: 20px; }
</style>
