<template>
  <div style="padding:10px;">
    <div v-if="meta">
      <div class="card" style="padding:20px; margin-bottom:20px;">
        <h3 style="margin-bottom:12px;">📋 病例元信息</h3>
        <div class="info-grid">
          <div class="info-item"><label>病例ID</label><span>{{ safeMeta.case_id || '—' }}</span></div>
          <div class="info-item"><label>版本</label><span>{{ safeMeta.version || '—' }}</span></div>
          <div class="info-item"><label>专业</label><span>{{ safeMeta.specialty || '—' }}</span></div>
          <div class="info-item"><label>病种</label><span>{{ safeMeta.disease || '—' }}</span></div>
          <div class="info-item"><label>难度</label><span>{{ safeMeta.difficulty || '—' }}</span></div>
          <div class="info-item"><label>培训阶段</label><span>{{ safeMeta.trainingPhase || '—' }}</span></div>
          <div class="info-item"><label>输入模式</label><span>{{ safeMeta.inputMode || '—' }}</span></div>
          <div class="info-item"><label>源文档</label><span>{{ safeMeta.sourceDocument || '无' }}</span></div>
        </div>
      </div>

      <div class="card" style="padding:20px; margin-bottom:20px;">
        <h3 style="margin-bottom:12px;">🔍 生成溯源</h3>
        <div v-if="traceEntries.length" class="trace-list">
          <div v-for="trace in traceEntries" :key="trace.key" class="trace-item">
            <div class="trace-header">
              <strong>{{ trace.label }}</strong>
              <span class="badge badge-info">{{ trace.model || '未知模型' }}</span>
            </div>
            <div class="trace-details">
              <span>生成时间：{{ trace.time }}</span>
              <span>提示词版本：{{ trace.promptVersion || '—' }}</span>
            </div>
          </div>
        </div>
        <div v-else style="color:var(--text-secondary);">无生成溯源信息</div>
      </div>

      <div class="card" style="padding:20px; margin-bottom:20px;" v-if="aiSp.knows.length || aiScoring.historyRules.length">
        <h3 style="margin-bottom:16px;">🤖 AI 服务配置</h3>

        <div v-if="aiSp.knows.length || aiSp.emotionProgression.length || aiSp.physicalExamTemplates.length" class="config-section">
          <h4 class="config-title">🎭 AI 标准化病人 (SP)</h4>

          <div v-if="maxKnowLen > 0" class="config-block">
            <h5 class="block-title">知识边界</h5>
            <table class="score-table">
              <thead><tr><th style="width:50%">已知 (Knows)</th><th style="width:50%">未知 (Does Not Know)</th></tr></thead>
              <tbody>
                <tr v-for="i in maxKnowLen" :key="'k'+i">
                  <td>{{ aiSp.knows[i-1] || '' }}</td>
                  <td>{{ aiSp.doesNotKnow[i-1] || '' }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-if="aiSp.emotionProgression.length" class="config-block">
            <h5 class="block-title">情绪变化规则</h5>
            <table class="score-table">
              <thead><tr><th>触发条件</th><th>情绪变化</th></tr></thead>
              <tbody>
                <tr v-for="(rule, idx) in aiSp.emotionProgression" :key="'e'+idx">
                  <td>{{ rule.trigger }}</td>
                  <td>{{ rule.change }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-if="aiSp.physicalExamTemplates.length" class="config-block">
            <h5 class="block-title">体格检查结果模板</h5>
            <table class="score-table">
              <thead><tr><th>项目</th><th>意图</th><th>关键词</th><th>语义提示</th><th>结果</th></tr></thead>
              <tbody>
                <tr v-for="(tmpl, idx) in aiSp.physicalExamTemplates" :key="'p'+idx">
                  <td>{{ tmpl.item }}</td>
                  <td>{{ tmpl.intent }}</td>
                  <td>{{ arrToStr(tmpl.keywords) }}</td>
                  <td>{{ arrToStr(tmpl.semantic_hints) }}</td>
                  <td>{{ tmpl.result }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div v-if="aiScoring.historyRules.length || aiScoring.physicalRules.length || aiScoring.communicationRules.length || aiScoring.deductionRules || aiScoring.diagnosisScoring" class="config-section" style="margin-top:24px;">
          <h4 class="config-title">📝 AI 评分规则</h4>

          <div v-if="aiScoring.historyRules.length" class="config-block">
            <h5 class="block-title">病史采集规则</h5>
            <table class="score-table">
              <thead><tr><th>#</th><th>评分项</th><th>关键词</th></tr></thead>
              <tbody>
                <tr v-for="(rule, idx) in aiScoring.historyRules" :key="'h'+idx">
                  <td>{{ idx+1 }}</td>
                  <td>{{ rule.item }}</td>
                  <td>{{ arrToStr(rule.keywords) }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-if="aiScoring.physicalRules.length" class="config-block">
            <h5 class="block-title">体格检查规则</h5>
            <table class="score-table">
              <thead><tr><th>#</th><th>评分项</th><th>关键词</th></tr></thead>
              <tbody>
                <tr v-for="(rule, idx) in aiScoring.physicalRules" :key="'p'+idx">
                  <td>{{ idx+1 }}</td>
                  <td>{{ rule.item }}</td>
                  <td>{{ arrToStr(rule.keywords) }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-if="aiScoring.communicationRules.length" class="config-block">
            <h5 class="block-title">沟通规则</h5>
            <table class="score-table">
              <thead><tr><th>#</th><th>评分项</th><th>关键词</th></tr></thead>
              <tbody>
                <tr v-for="(rule, idx) in aiScoring.communicationRules" :key="'c'+idx">
                  <td>{{ idx+1 }}</td>
                  <td>{{ rule.item }}</td>
                  <td>{{ arrToStr(rule.keywords) }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-if="aiScoring.deductionRules" class="config-block">
            <h5 class="block-title">扣分规则</h5>
            <table class="score-table">
              <thead><tr><th>规则键</th><th>描述</th></tr></thead>
              <tbody>
                <tr v-for="(desc, key) in aiScoring.deductionRules" :key="'d'+key">
                  <td><code>{{ key }}</code></td>
                  <td>{{ desc }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-if="aiScoring.diagnosisScoring" class="config-block">
            <h5 class="block-title">诊断评分规则</h5>
            <div class="info-grid">
              <div class="info-item">
                <label>主诊断</label>
                <span>{{ aiScoring.diagnosisScoring.expected }} ({{ aiScoring.diagnosisScoring.score }}分)</span>
              </div>
              <div class="info-item">
                <label>鉴别诊断</label>
                <span>{{ aiScoring.diagnosisScoring.differentialStr }} ({{ aiScoring.diagnosisScoring.diffScore }}分)</span>
              </div>
            </div>
            <div v-if="aiScoring.diagnosisScoring.expectedPoints.length" style="margin-top:12px;">
              <label>诊断依据要点</label>
              <table class="score-table" style="margin-top:4px;">
                <thead><tr><th>#</th><th>要点</th></tr></thead>
                <tbody>
                  <tr v-for="(point, idx) in aiScoring.diagnosisScoring.expectedPoints" :key="'b'+idx">
                    <td>{{ idx+1 }}</td>
                    <td>{{ point }}</td>
                  </tr>
                </tbody>
              </table>
              <span style="font-size:12px;color:var(--text-secondary);">{{ aiScoring.diagnosisScoring.scoringLogic }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="card" style="padding:20px; margin-bottom:20px;">
        <h3 style="margin-bottom:12px;">✅ 审核与部署</h3>
        <div class="info-grid">
          <div class="info-item"><label>审核状态</label><span :class="statusClass(reviewStatus)">{{ reviewStatus || '无' }}</span></div>
          <div class="info-item"><label>审核人</label><span>{{ reviewBy || '—' }}</span></div>
          <div class="info-item"><label>审核时间</label><span>{{ reviewAt || '—' }}</span></div>
          <div class="info-item"><label>评论</label><span>{{ reviewComments || '无' }}</span></div>
          <div class="info-item"><label>发布状态</label><span :class="isPublished ? 'text-success' : 'text-warning'">{{ isPublished ? '已发布' : '未发布' }}</span></div>
          <div class="info-item"><label>发布时间</label><span>{{ publishedAt || '—' }}</span></div>
        </div>
      </div>

      <div class="card" style="padding:20px;">
        <h3 style="margin-bottom:12px;">⏱️ 关键时间线</h3>
        <div v-if="keyTimeline.length" class="timeline">
          <div v-for="(event, idx) in keyTimeline" :key="idx" class="timeline-item">
            <div class="timeline-dot"></div>
            <div>
              <p><strong>{{ event.event }}</strong></p>
              <p style="font-size:12px; color:var(--text-secondary);">{{ formatTime(event.timestamp) }}</p>
            </div>
          </div>
        </div>
        <div v-else style="color:var(--text-secondary);">无时间线数据</div>
      </div>
    </div>
    <div v-else style="text-align:center; padding:60px; color:var(--text-secondary);">
      暂无元数据信息
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  meta: { type: Object, default: null }
})

const safeMeta = computed(() => {
  const m = props.meta || {}
  return {
    case_id: m.case_id,
    version: m.version,
    specialty: m.pre_generation?.specialty,
    disease: m.pre_generation?.disease,
    difficulty: m.pre_generation?.difficulty,
    trainingPhase: m.pre_generation?.training_phase,
    inputMode: m.pre_generation?.input_mode,
    sourceDocument: m.pre_generation?.source_document || '无'
  }
})

const traceEntries = computed(() => {
  const trace = props.meta?.generation_trace
  if (!trace) return []
  return Object.entries(trace).map(([key, value]) => ({
    key,
    label: traceLabel(key),
    model: value.model,
    time: formatTime(value.generated_at),
    promptVersion: value.prompt_version
  }))
})

const aiSp = computed(() => {
  const sp = props.meta?.ai_services?.ai_sp?.sp_play_rules
  const boundary = sp?.knowledge_boundary || {}
  return {
    knows: boundary.knows || [],
    doesNotKnow: boundary.does_not_know || [],
    emotionProgression: sp?.emotion_progression || [],
    physicalExamTemplates: props.meta?.ai_services?.ai_sp?.physical_exam_result_templates || []
  }
})

const maxKnowLen = computed(() => {
  return Math.max(aiSp.value.knows.length, aiSp.value.doesNotKnow.length)
})

const aiScoring = computed(() => {
  const rules = props.meta?.ai_services?.ai_scoring?.ai_scoring_rules || {}
  const diag = props.meta?.ai_services?.ai_scoring?.diagnosis_scoring_rules || null
  let diagInfo = null
  if (diag) {
    const primary = diag.primary_diagnosis || {}
    const basis = diag.diagnosis_basis || {}
    const diff = diag.differential_diagnosis || {}
    diagInfo = {
      expected: primary.expected || '',
      score: primary.score || 0,
      expectedPoints: basis.expected_points || [],
      scoringLogic: basis.scoring_logic || '',
      differentialStr: (diff.expected || []).join('、'),
      diffScore: diff.score || 0
    }
  }
  return {
    historyRules: rules.history_rules || [],
    physicalRules: rules.physical_rules || [],
    communicationRules: rules.communication_rules || [],
    deductionRules: rules.deduction_rules || null,
    diagnosisScoring: diagInfo
  }
})

const reviewStatus = computed(() => props.meta?.review?.status || null)
const reviewBy = computed(() => props.meta?.review?.reviewed_by || null)
const reviewAt = computed(() => formatTime(props.meta?.review?.reviewed_at))
const reviewComments = computed(() => props.meta?.review?.comments || null)
const isPublished = computed(() => props.meta?.deployment?.is_published || false)
const publishedAt = computed(() => formatTime(props.meta?.deployment?.published_at))
const keyTimeline = computed(() => props.meta?.key_timeline || [])

function traceLabel(key) {
  const map = { basic_info: '基础信息生成', encounter: '接诊剧本生成', case_analysis: '病例分析生成', communication: '人文沟通生成' }
  return map[key] || key
}

function formatTime(iso) {
  if (!iso) return ''
  try { return new Date(iso).toLocaleString() } catch (e) { return iso }
}

function statusClass(s) {
  if (s === 'pending') return 'badge badge-warning'
  if (s === 'approved') return 'badge badge-success'
  if (s === 'rejected') return 'badge badge-error'
  return ''
}

function arrToStr(arr) {
  return Array.isArray(arr) ? arr.join(', ') : ''
}
</script>

<style scoped>
.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 12px;
}

.info-item {
  margin-bottom: 8px;
}

.info-item label {
  display: block;
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 2px;
}

.info-item span {
  font-size: 14px;
  color: var(--text-main);
}

.trace-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.trace-item {
  border-left: 3px solid var(--primary);
  padding-left: 12px;
}

.trace-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.trace-details {
  display: flex;
  gap: 24px;
  font-size: 13px;
  color: var(--text-secondary);
}

.config-section {
  margin-bottom: 24px;
}

.config-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 12px;
  color: var(--primary);
  border-bottom: 1px solid var(--border-light);
  padding-bottom: 6px;
}

.config-block {
  margin-bottom: 20px;
}

.block-title {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 8px;
  color: var(--text-main);
}

.mt-3 {
  margin-top: 16px;
}

.timeline {
  position: relative;
  padding-left: 24px;
}

.timeline-item {
  position: relative;
  margin-bottom: 16px;
}

.timeline-dot {
  position: absolute;
  left: -24px;
  top: 4px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--primary);
}

.text-success {
  color: var(--success);
  font-weight: 500;
}

.text-warning {
  color: var(--warning);
  font-weight: 500;
}
</style>
