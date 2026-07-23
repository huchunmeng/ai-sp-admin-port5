<template>
  <div class="content-container">
    <h2 style="margin-bottom:4px;">LLM模型配置</h2>
    <p class="text-secondary mb-4" style="font-size:13px;">各模块独立选择模型，并控制是否启用深度思考（推理增强）</p>

    <!-- 病例生成 -->
    <div class="card mb-4" style="padding: 24px;">
      <div style="display:flex; align-items:center; gap:12px; margin-bottom:20px;">
        <span class="module-badge" style="background:#059669;">病例生成</span>
        <h3 style="margin:0;">AI病例生成</h3>
        <span v-if="form.caseGenChanged" class="changed-dot" title="已修改未保存"></span>
      </div>
      <p style="color:var(--text-secondary); font-size:13px; margin-bottom:16px;">
        用于管理端自动生成标准化病人病例，侧重输出质量和推理深度，不要求实时响应。
      </p>
      <div class="config-grid">
        <div class="config-row">
          <label class="config-label">模型</label>
          <select class="select" v-model="form.caseGen" @change="form.caseGenChanged = true">
            <option v-for="m in caseGenModels" :key="m.id" :value="m.id">{{ m.name }}</option>
          </select>
        </div>
        <div class="config-row">
          <label class="config-label">深度思考</label>
          <label class="switch" style="margin:0;">
            <input type="checkbox" v-model="form.caseGenThinking" @change="form.caseGenChanged = true">
            <span class="slider"></span>
          </label>
          <span class="toggle-hint">{{ form.caseGenThinking ? '已开启 — 推理更深，耗时增加' : '已关闭 — 速度更快' }}</span>
        </div>
      </div>
    </div>

    <!-- 对话 -->
    <div class="card mb-4" style="padding: 24px;">
      <div style="display:flex; align-items:center; gap:12px; margin-bottom:20px;">
        <span class="module-badge" style="background:#2563eb;">对话</span>
        <h3 style="margin:0;">SP角色扮演对话</h3>
        <span v-if="form.dialogueChanged" class="changed-dot" title="已修改未保存"></span>
      </div>
      <p style="color:var(--text-secondary); font-size:13px; margin-bottom:16px;">
        用于训练端病史采集和人文沟通的SP实时对话，要求低延迟（目标 &lt;3s）。病史采集和人文沟通共用此模型。
      </p>
      <div class="config-grid">
        <div class="config-row">
          <label class="config-label">模型</label>
          <select class="select" v-model="form.dialogue" @change="form.dialogueChanged = true">
            <option v-for="m in dialogueModels" :key="m.id" :value="m.id">{{ m.name }}</option>
          </select>
        </div>
        <div class="config-row">
          <label class="config-label">深度思考</label>
          <span class="thinking-locked">已强制关闭 — 对话场景要求低延迟</span>
        </div>
      </div>
    </div>

    <!-- 语音合成 TTS -->
    <div class="card mb-4" style="padding: 24px;">
      <div style="display:flex; align-items:center; gap:12px; margin-bottom:20px;">
        <span class="module-badge" style="background:#7c3aed;">语音合成</span>
        <h3 style="margin:0;">TTS 语音合成</h3>
        <span v-if="form.ttsChanged" class="changed-dot" title="已修改未保存"></span>
      </div>
      <p style="color:var(--text-secondary); font-size:13px; margin-bottom:16px;">
        用于训练端/考试端 SP 对话的实时语音合成，将文本转为自然语音输出。低延迟模型适合对话场景，高表现力模型适合长文本。
      </p>
      <div class="config-grid">
        <div class="config-row">
          <label class="config-label">模型</label>
          <select class="select" v-model="form.tts" @change="form.ttsChanged = true">
            <option v-for="m in ttsModels" :key="m.id" :value="m.id">{{ m.name }}</option>
          </select>
        </div>
      </div>
    </div>

    <!-- 评分 -->
    <div class="card mb-4" style="padding: 24px; opacity: 0.7;">
      <div style="display:flex; align-items:center; gap:12px; margin-bottom:20px;">
        <span class="module-badge" style="background:#d97706;">评分</span>
        <h3 style="margin:0;">AI评分评估</h3>
        <span class="placeholder-tag">规划中</span>
      </div>
      <p style="color:var(--text-secondary); font-size:13px; margin-bottom:16px;">
        用于考试端/训练端的对话质量自动评分。此模块尚未实现，配置为预留。
      </p>
      <div class="config-grid">
        <div class="config-row">
          <label class="config-label">模型</label>
          <select class="select" v-model="form.scoring" disabled>
            <option v-for="m in scoringModels" :key="m.id" :value="m.id">{{ m.name }}</option>
          </select>
        </div>
        <div class="config-row">
          <label class="config-label">深度思考</label>
          <label class="switch" style="margin:0;">
            <input type="checkbox" v-model="form.scoringThinking" disabled>
            <span class="slider"></span>
          </label>
          <span class="toggle-hint">{{ form.scoringThinking ? '已开启' : '已关闭' }}</span>
        </div>
      </div>
    </div>

    <!-- 模型池总览 -->
    <div class="card mb-4" style="padding: 24px;">
      <h3 style="margin-bottom: 12px;">模型池总览</h3>
      <table class="model-table">
        <thead>
          <tr>
            <th>模型</th>
            <th>API名称</th>
            <th>回复速度</th>
            <th>上下文</th>
            <th>适用模块</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="m in allModels" :key="m.id">
            <td><strong>{{ m.name }}</strong></td>
            <td><code>{{ m.id }}</code></td>
            <td><span class="speed-badge" :class="m.speedClass">{{ m.speed }}</span></td>
            <td>{{ m.context }}</td>
            <td>
              <span v-for="t in m.tags" :key="t" class="tag-label">{{ t }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div style="display:flex; gap: 12px;">
      <button class="btn btn-primary" @click="saveConfig">保存配置</button>
      <button class="btn" @click="resetForm">恢复默认</button>
    </div>
  </div>
</template>

<script setup>
import { reactive, computed } from 'vue'
import { toast } from '@ai-sp/shared'

const CONFIG_KEY = 'ai-sp-ops-llm-config'

const caseGenModels = [
  { id: 'deepseek-v4-pro', name: 'DeepSeek V4 Pro', speed: '中等 ~3s', speedClass: 'speed-slow', context: '128K', tags: ['病例生成'], desc: 'DeepSeek 旗舰模型，推理深度和结构化输出能力强。' },
  { id: 'qwen-max', name: '通义千问 Max', speed: '中等 ~3s', speedClass: 'speed-slow', context: '1M', tags: ['病例生成'], desc: '通义千问顶级模型，复杂指令遵循和长文本生成能力突出。' },
  { id: 'qwen-plus', name: '通义千问 Plus', speed: '快速 ~2s', speedClass: 'speed-medium', context: '1M', tags: ['病例生成', '对话'], desc: '平衡速度与效果，1M上下文可处理长病例模板。' }
]

const dialogueModels = [
  { id: 'qwen-turbo', name: '通义千问 Turbo', speed: '极速 ~1s', speedClass: 'speed-fast', context: '1M', tags: ['对话'], desc: '轻量快速，延迟最低。' },
  { id: 'qwen-plus', name: '通义千问 Plus', speed: '快速 ~2s', speedClass: 'speed-medium', context: '1M', tags: ['病例生成', '对话'], desc: '指令遵循能力强，适合复杂情绪表达。' },
  { id: 'deepseek-v4-flash', name: 'DeepSeek V4 Flash', speed: '快速 ~1.5s', speedClass: 'speed-medium', context: '128K', tags: ['对话'], desc: 'DeepSeek 快速版，角色扮演一致性较好。' }
]

const ttsModels = [
  { id: 'cosyvoice-v3-flash', name: 'CosyVoice V3 Flash', speed: '极速 ~0.5s', speedClass: 'speed-fast', context: '—', tags: ['语音合成'], desc: '阿里语音实验室最新极速模型，自然度高、延迟极低，适合实时对话场景。' },
  { id: 'cosyvoice-v3-pro', name: 'CosyVoice V3 Pro', speed: '快速 ~1s', speedClass: 'speed-fast', context: '—', tags: ['语音合成'], desc: 'CosyVoice 旗舰模型，情感表现力和音色还原度最强，适合长文本合成。' },
  { id: 'qwen3-tts-instruct-flash-realtime', name: 'Qwen3-TTS Flash', speed: '快速 ~1s', speedClass: 'speed-fast', context: '—', tags: ['语音合成'], desc: 'Qwen3-TTS 实时版，原生支持声乐指令和角色扮演语气控制。' },
]

const scoringModels = [
  { id: 'qwen-plus', name: '通义千问 Plus', speed: '快速 ~2s', speedClass: 'speed-medium', context: '1M', tags: ['评分'], desc: '指令遵循和输出格式能力强。' },
  { id: 'deepseek-v4-pro', name: 'DeepSeek V4 Pro', speed: '中等 ~3s', speedClass: 'speed-slow', context: '128K', tags: ['病例生成', '评分'], desc: '推理最强，适合复杂评分标准。' },
  { id: 'qwen-turbo', name: '通义千问 Turbo', speed: '极速 ~1s', speedClass: 'speed-fast', context: '1M', tags: ['评分'], desc: '适合简单评分维度。' }
]

const allModels = computed(() => {
  const seen = new Set()
  const merged = []
  for (const m of [...caseGenModels, ...dialogueModels, ...ttsModels, ...scoringModels]) {
    if (seen.has(m.id)) {
      const existing = merged.find(x => x.id === m.id)
      if (existing) {
        for (const t of m.tags) {
          if (!existing.tags.includes(t)) existing.tags.push(t)
        }
      }
    } else {
      seen.add(m.id)
      merged.push({ ...m, tags: [...m.tags] })
    }
  }
  return merged
})

const defaults = {
  caseGen: 'deepseek-v4-pro',
  dialogue: 'qwen-turbo',
  tts: 'cosyvoice-v3-flash',
  scoring: 'qwen-plus',
  caseGenThinking: true,
  scoringThinking: true
}

function loadConfig() {
  try {
    const raw = localStorage.getItem(CONFIG_KEY)
    if (raw) {
      const saved = JSON.parse(raw)
      return { ...defaults, ...saved }
    }
  } catch { /* ignore */ }
  return { ...defaults }
}

const saved = loadConfig()
const form = reactive({
  caseGen: saved.caseGen,
  dialogue: saved.dialogue,
  tts: saved.tts,
  scoring: saved.scoring,
  caseGenThinking: saved.caseGenThinking !== false,
  scoringThinking: saved.scoringThinking !== false,
  caseGenChanged: false,
  dialogueChanged: false,
  ttsChanged: false
})

function saveConfig() {
  const config = {
    caseGen: form.caseGen,
    dialogue: form.dialogue,
    tts: form.tts,
    scoring: form.scoring,
    caseGenThinking: form.caseGenThinking,
    scoringThinking: form.scoringThinking
  }
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config))
  form.caseGenChanged = false
  form.dialogueChanged = false
  form.ttsChanged = false

  // 推送对话配置到训练端
  const trainPromise = fetch('http://localhost:5001/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ llmModel: form.dialogue })
  }).then(r => r.json()).catch(() => null)

  // 推送病例生成配置到管理端
  const adminPromise = fetch('http://localhost:5002/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ llmModel: form.caseGen, deepThinking: form.caseGenThinking })
  }).then(r => r.json()).catch(() => null)

  // 推送TTS模型配置到SP-API
  const ttsPromise = fetch('http://localhost:5100/api/sp/admin/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ttsModel: form.tts })
  }).then(r => r.json()).catch(() => null)

  Promise.all([trainPromise, adminPromise, ttsPromise]).then(([trainRes, adminRes, ttsRes]) => {
    const parts = []
    if (trainRes?.ok) parts.push('训练端已同步')
    else parts.push('训练端未运行')
    if (adminRes?.ok) parts.push('管理端已同步')
    else parts.push('管理端未运行')
    if (ttsRes?.ok) parts.push('TTS已同步')
    else parts.push('TTS服务未运行')
    toast.show('LLM配置已保存 — ' + parts.join('，'))
  })
}

function resetForm() {
  Object.assign(form, { ...defaults, caseGenChanged: false, dialogueChanged: false, ttsChanged: false })
  localStorage.removeItem(CONFIG_KEY)
  toast.show('已恢复默认配置')
}
</script>

<style scoped>
.module-badge {
  display: inline-flex; align-items: center; padding: 4px 12px;
  border-radius: 4px; color: #fff; font-size: 12px; font-weight: 600;
}
.placeholder-tag {
  font-size: 11px; padding: 2px 8px; border-radius: 4px;
  background: #fef3c7; color: #92400e; font-weight: 500;
}
.changed-dot {
  width: 8px; height: 8px; border-radius: 50%; background: #f59e0b;
  flex-shrink: 0;
}

.config-grid { display: flex; flex-direction: column; gap: 14px; }
.config-row { display: flex; align-items: center; gap: 12px; }
.config-label { font-size: 13px; color: var(--text-secondary); min-width: 72px; }
.config-row .select { flex: 1; max-width: 360px; }
.toggle-hint { font-size: 12px; color: var(--text-tertiary); }
.thinking-locked {
  font-size: 12px; color: #ef4444; background: #fef2f2; padding: 4px 10px; border-radius: 4px;
}

.speed-badge {
  display: inline-flex; align-items: center; padding: 2px 10px;
  border-radius: 12px; font-size: 11px; font-weight: 600;
}
.speed-fast { background: #dcfce7; color: #166534; }
.speed-medium { background: #fef3c7; color: #92400e; }
.speed-slow { background: #fee2e2; color: #991b1b; }

.tag-label {
  display: inline-block; font-size: 11px; padding: 1px 8px; margin-right: 4px;
  border-radius: 3px; background: #e0f2fe; color: #0369a1;
}

.model-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.model-table th { text-align: left; padding: 8px 12px; background: #f9fafb; color: var(--text-secondary); font-weight: 600; border-bottom: 1px solid var(--border); }
.model-table td { padding: 10px 12px; border-bottom: 1px solid #f3f4f6; }
.model-table code { font-size: 12px; background: #f3f4f6; padding: 2px 6px; border-radius: 3px; }
</style>
