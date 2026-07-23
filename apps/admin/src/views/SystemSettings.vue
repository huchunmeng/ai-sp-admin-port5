<template>
  <div class="content-container">
    <h1 style="margin: 8px 0 24px; font-size: 1.5rem; font-weight: 600;">系统设置</h1>

    <div class="settings-section">
      <div class="settings-section-title">训练端设置</div>

      <div class="setting-row">
        <div class="setting-info">
          <div class="setting-label">情绪引擎</div>
          <div class="setting-desc">控制标准化病人的情绪响应系统。关闭后 SP 将以平静模式回应，不会产生愤怒、恐惧、悲伤等情绪变化。</div>
        </div>
        <label class="toggle-switch">
          <input type="checkbox" v-model="emotionEnabled" :disabled="loading" @change="saveEmotionSetting" />
          <span class="toggle-slider"></span>
        </label>
      </div>

      <div class="setting-row">
        <div class="setting-info">
          <div class="setting-label">强制中止</div>
          <div class="setting-desc">控制对话强制中止机制。开启时 SP 在极端情绪下可能被系统强制结束对话；<strong>关闭后对话永不自动中止，SP 可以一直争吵下去。</strong></div>
        </div>
        <label class="toggle-switch">
          <input type="checkbox" v-model="forceTerminationEnabled" @change="saveForceTermination" />
          <span class="toggle-slider"></span>
        </label>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { toast, resolveAppUrls } from '@ai-sp/shared'

const trainingUrl = resolveAppUrls().training
const SETTINGS_URL = `${trainingUrl}/api/settings`
const SP_API = 'http://localhost:5100'

const emotionEnabled = ref(true)
const loading = ref(true)
const forceTerminationEnabled = ref(false)

async function fetchSettings() {
  try {
    const resp = await fetch(SETTINGS_URL)
    if (resp.ok) {
      const data = await resp.json()
      emotionEnabled.value = data.emotionEnabled !== false
    }
  } catch (e) {
    // training 端未启动
  } finally {
    loading.value = false
  }

  try {
    const resp = await fetch(`${SP_API}/api/sp/admin/status`)
    if (resp.ok) {
      const data = await resp.json()
      forceTerminationEnabled.value = data.forceTerminationEnabled !== false
    }
  } catch (e) {
    // sp-api 未启动
  }
}

async function saveEmotionSetting() {
  try {
    const resp = await fetch(SETTINGS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emotionEnabled: emotionEnabled.value })
    })
    if (resp.ok) {
      toast.show(
        emotionEnabled.value ? '情绪引擎已开启' : '情绪引擎已关闭',
        emotionEnabled.value ? 'success' : 'warning'
      )
    } else {
      throw new Error('请求失败')
    }
  } catch (e) {
    emotionEnabled.value = !emotionEnabled.value
    toast.show('设置失败，请确保训练端已启动', 'error')
  }
}

async function saveForceTermination() {
  try {
    const resp = await fetch(`${SP_API}/api/sp/admin/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ forceTerminationEnabled: forceTerminationEnabled.value })
    })
    if (resp.ok) {
      toast.show(
        forceTerminationEnabled.value ? '强制中止机制已开启 — SP 极端情绪下可被中止' : '强制中止机制已关闭 — 对话永不自动中止',
        forceTerminationEnabled.value ? 'info' : 'warning'
      )
    } else {
      throw new Error('请求失败')
    }
  } catch (e) {
    forceTerminationEnabled.value = !forceTerminationEnabled.value
    toast.show('设置失败，请确保 SP API 服务已启动', 'error')
  }
}

onMounted(fetchSettings)
</script>

<style scoped>
.settings-section {
  background: var(--card-bg);
  border-radius: var(--card-radius);
  box-shadow: var(--card-shadow);
  border: 1px solid var(--border-light);
  overflow: hidden;
}
.settings-section-title {
  padding: 14px 20px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-main);
  border-bottom: 1px solid var(--border);
  background: #fafbfc;
}
.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px;
}
.setting-row + .setting-row {
  border-top: 1px solid var(--border-light);
}
.setting-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-main);
  margin-bottom: 4px;
}
.setting-desc {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.5;
  max-width: 520px;
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 48px;
  height: 26px;
  flex-shrink: 0;
  cursor: pointer;
}
.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}
.toggle-slider {
  position: absolute;
  inset: 0;
  background: #dcdfe6;
  border-radius: 26px;
  transition: background .2s;
}
.toggle-slider::before {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 20px;
  height: 20px;
  background: #fff;
  border-radius: 50%;
  transition: transform .2s;
}
.toggle-switch input:checked + .toggle-slider {
  background: var(--primary);
}
.toggle-switch input:checked + .toggle-slider::before {
  transform: translateX(22px);
}
.toggle-switch input:disabled + .toggle-slider {
  opacity: .5;
  cursor: not-allowed;
}
</style>
