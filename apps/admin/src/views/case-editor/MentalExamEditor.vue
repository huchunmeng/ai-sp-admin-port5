<template>
  <div class="mental-exam-editor">
    <div v-if="!localData" style="text-align:center;padding:40px;color:var(--text-secondary);">
      <p>暂无精神检查数据</p>
      <button class="btn btn-primary" @click="initDefault">初始化精神检查配置</button>
    </div>
    <template v-else>
      <!-- 疾病类型 -->
      <div class="card" style="padding:16px;margin-bottom:16px;">
        <h4 style="margin:0 0 12px 0;">疾病类型</h4>
        <select class="select" v-model="localData.disease_type" style="width:240px;">
          <option value="精神分裂症">精神分裂症</option>
          <option value="抑郁症">抑郁症</option>
          <option value="双相障碍（躁狂）">双相障碍（躁狂）</option>
          <option value="双相障碍（抑郁）">双相障碍（抑郁）</option>
          <option value="惊恐障碍">惊恐障碍</option>
          <option value="广泛性焦虑障碍">广泛性焦虑障碍</option>
          <option value="强迫障碍">强迫障碍</option>
          <option value="创伤后应激障碍">创伤后应激障碍</option>
          <option value="谵妄">谵妄</option>
          <option value="阿尔茨海默病">阿尔茨海默病</option>
        </select>
      </div>

      <!-- MSE 精神状态检查 -->
      <div class="card" style="padding:16px;margin-bottom:16px;">
        <h4 style="margin:0 0 12px 0;">精神状态检查 (MSE)</h4>
        <div class="mse-grid">
          <div class="mse-item" v-for="dim in mseDimensions" :key="dim.key">
            <label class="mse-label">{{ dim.label }} <span class="mse-en">{{ dim.en }}</span></label>
            <textarea class="input mse-textarea" v-model="localData.mental_status[dim.key]" :placeholder="dim.placeholder" rows="2"></textarea>
          </div>
        </div>
      </div>

      <!-- 行为参数 -->
      <div class="card" style="padding:16px;margin-bottom:16px;">
        <h4 style="margin:0 0 12px 0;">B类行为参数</h4>
        <div class="param-grid">
          <div class="param-item" v-for="param in behaviorParams" :key="param.key">
            <div class="param-header">
              <label>{{ param.label }}</label>
              <span class="param-value">{{ formatParamValue(param.key, localData.behavior_params[param.key]) }}</span>
            </div>
            <input type="range" class="param-slider" :min="param.min" :max="param.max" :step="param.step"
              v-model.number="localData.behavior_params[param.key]">
            <div class="param-range">
              <span>{{ param.minLabel }}</span>
              <span>{{ param.maxLabel }}</span>
            </div>
          </div>
          <!-- insight_level 下拉选择 -->
          <div class="param-item">
            <label>自知力水平</label>
            <select class="select" v-model="localData.behavior_params.insight_level" style="width:100%;">
              <option value="完整">完整 — 患者充分认识到自己的疾病</option>
              <option value="部分">部分 — 患者意识到有问题但归因有偏差</option>
              <option value="缺失">缺失 — 患者完全否认自己有精神问题</option>
              <option value="波动">波动 — 自知力时有时无</option>
            </select>
          </div>
        </div>
      </div>

      <!-- 妄想系统 -->
      <div class="card" style="padding:16px;margin-bottom:16px;">
        <h4 style="margin:0 0 12px 0;">妄想系统</h4>
        <div class="filter-item mb-3">
          <label>核心信念</label>
          <textarea class="input" v-model="localData.delusional_system.core_belief" rows="2" placeholder="例如：邻居通过电视和手机监视我"></textarea>
        </div>
        <div class="filter-item mb-3">
          <label>触发词（逗号分隔）</label>
          <input class="input" v-model="triggerInput" placeholder="例如：监视, 邻居, 手机, 电视" @change="syncTriggers">
        </div>
      </div>

      <!-- 幻觉特征 -->
      <div class="card" style="padding:16px;margin-bottom:16px;">
        <h4 style="margin:0 0 12px 0;">幻觉特征</h4>
        <div class="param-grid">
          <div class="param-item">
            <label>幻觉类型</label>
            <select class="select" v-model="localData.hallucination_profile.type" style="width:100%;">
              <option value="无">无幻觉</option>
              <option value="评论性幻听">评论性幻听</option>
              <option value="命令性幻听">命令性幻听</option>
              <option value="争论性幻听">争论性幻听</option>
              <option value="幻视">幻视</option>
              <option value="幻触">幻触</option>
              <option value="幻嗅">幻嗅</option>
            </select>
          </div>
          <div class="param-item">
            <label>幻觉频率</label>
            <select class="select" v-model="localData.hallucination_profile.frequency" style="width:100%;">
              <option :value="0">无</option>
              <option value="intermittent">间歇性</option>
              <option value="frequent">频繁</option>
              <option value="constant">持续性</option>
            </select>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  modelValue: { type: Object, default: null }
})

const emit = defineEmits(['update:modelValue'])

const localData = ref(null)

const mseDimensions = [
  { key: 'appearance', label: '一般表现', en: 'Appearance', placeholder: '外观、行为、眼神接触、精神运动性等' },
  { key: 'speech', label: '言语', en: 'Speech', placeholder: '语速、音量、语量、流畅性等' },
  { key: 'thought_form', label: '思维形式', en: 'Thought Form', placeholder: '思维散漫、思维奔逸、思维迟缓、离题等' },
  { key: 'thought_content', label: '思维内容', en: 'Thought Content', placeholder: '妄想、自杀观念、强迫思维等' },
  { key: 'affect', label: '情感', en: 'Affect', placeholder: '情感性质、稳定性、恰当性等' },
  { key: 'perception', label: '感知觉', en: 'Perception', placeholder: '幻觉、错觉、现实解体等' },
  { key: 'cognition', label: '认知', en: 'Cognition', placeholder: '注意力、记忆力、定向力、计算力等' },
  { key: 'insight', label: '自知力', en: 'Insight', placeholder: '对疾病的认识程度' }
]

const behaviorParams = [
  { key: 'tangentiality', label: '离题倾向', min: 0, max: 1, step: 0.05, minLabel: '0 (紧扣主题)', maxLabel: '1 (极度离题)' },
  { key: 'verbosity', label: '语量系数', min: 0.3, max: 2.5, step: 0.1, minLabel: '0.3 (沉默寡言)', maxLabel: '2.5 (滔滔不绝)' },
  { key: 'affective_blunting', label: '情感平淡', min: 0, max: 1, step: 0.05, minLabel: '0 (情感丰富)', maxLabel: '1 (完全平淡)' },
  { key: 'irritability', label: '易激惹性', min: 0, max: 1, step: 0.05, minLabel: '0 (温和平静)', maxLabel: '1 (极易激惹)' },
  { key: 'hallucination_interference', label: '幻觉干扰度', min: 0, max: 1, step: 0.05, minLabel: '0 (无干扰)', maxLabel: '1 (严重干扰)' }
]

function formatParamValue(key, val) {
  if (val == null) return '—'
  switch (key) {
    case 'tangentiality':
    case 'affective_blunting':
    case 'irritability':
    case 'hallucination_interference':
      return Math.round(val * 100) + '%'
    case 'verbosity':
      return val.toFixed(1) + '×'
    default:
      return String(val)
  }
}

const triggerInput = ref('')

function syncTriggers() {
  if (!localData.value) return
  localData.value.delusional_system.triggers = triggerInput.value
    .split(/[,，、]/)
    .map(s => s.trim())
    .filter(Boolean)
  emitUpdate()
}

function emitUpdate() {
  emit('update:modelValue', JSON.parse(JSON.stringify(localData.value)))
}

function createDefault() {
  return {
    disease_type: '精神分裂症',
    mental_status: {
      appearance: '',
      speech: '',
      thought_form: '',
      thought_content: '',
      affect: '',
      perception: '',
      cognition: '',
      insight: ''
    },
    behavior_params: {
      tangentiality: 0.4,
      verbosity: 0.8,
      affective_blunting: 0.6,
      irritability: 0.3,
      hallucination_interference: 0.15,
      insight_level: '缺失'
    },
    delusional_system: {
      core_belief: '',
      triggers: []
    },
    hallucination_profile: {
      type: '无',
      frequency: 0
    }
  }
}

function initDefault() {
  localData.value = createDefault()
  triggerInput.value = (localData.value.delusional_system.triggers || []).join('，')
  emitUpdate()
}

watch(() => props.modelValue, (val) => {
  if (!val) {
    localData.value = null
    triggerInput.value = ''
    return
  }
  localData.value = JSON.parse(JSON.stringify(val))
  triggerInput.value = (localData.value.delusional_system?.triggers || []).join('，')
}, { immediate: true })

watch(localData, () => {
  if (localData.value) emitUpdate()
}, { deep: true })
</script>

<style scoped>
.mental-exam-editor { max-width: 960px; }
.mse-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
.mse-item { display: flex; flex-direction: column; gap: 4px; }
.mse-label { font-size: 13px; font-weight: 500; display: flex; align-items: center; gap: 8px; }
.mse-en { font-size: 10px; color: var(--text-tertiary); font-weight: 400; }
.mse-textarea { resize: vertical; min-height: 48px; font-size: 13px; }
.param-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
.param-item { display: flex; flex-direction: column; gap: 6px; }
.param-header { display: flex; justify-content: space-between; align-items: center; }
.param-header label { font-size: 13px; font-weight: 500; }
.param-value { font-size: 12px; color: #409EFF; font-weight: 600; font-family: monospace; }
.param-slider { width: 100%; accent-color: #409EFF; }
.param-range { display: flex; justify-content: space-between; font-size: 10px; color: var(--text-tertiary); }
.mb-3 { margin-bottom: 12px; }
</style>
