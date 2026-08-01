<template>
  <div class="expert-kb">
    <div class="card ekb-card">
      <div class="ekb-header">
        <div class="ekb-header-left">
          <h3 class="ekb-title">专家知识库绑定</h3>
          <p class="ekb-desc">绑定后训练端"专家点评"面板将基于此内容结合学员操作生成个性化点评</p>
        </div>
        <label class="ekb-toggle">
          <input type="checkbox" :checked="model.enabled" @change="updateField('enabled', $event.target.checked)">
          <span class="ekb-toggle-track">
            <span class="ekb-toggle-thumb"></span>
          </span>
          <span class="ekb-toggle-label">{{ model.enabled ? '已启用' : '未启用' }}</span>
        </label>
      </div>

      <div v-if="model.enabled" class="ekb-body">
        <div class="ekb-sections">
          <!-- 专家基本信息 -->
          <section class="ekb-section">
            <h4 class="ekb-section-title">
              <i class="fas fa-user-tie"></i> 专家基本信息
            </h4>
            <div class="ekb-row">
              <div class="ekb-field">
                <label>专家姓名 <span class="ekb-required">*</span></label>
                <input class="input" :value="model.expertName" @input="updateField('expertName', $event.target.value)" placeholder="如：滕皋军 院士">
              </div>
              <div class="ekb-field">
                <label>单位/职称 <span class="ekb-required">*</span></label>
                <input class="input" :value="model.expertTitle" @input="updateField('expertTitle', $event.target.value)" placeholder="如：东南大学附属中大医院 · 介入与血管外科">
              </div>
            </div>
            <div class="ekb-row ekb-row-avatar">
              <div class="ekb-field ekb-field-avatar">
                <label>专家头像</label>
                <div
                  class="ekb-avatar-upload"
                  @click="triggerUpload"
                  @dragover.prevent="dragOver = true"
                  @dragleave.prevent="dragOver = false"
                  @drop.prevent="handleDrop"
                  :class="{ dragging: dragOver, uploading: avatarUploading }"
                >
                  <div v-if="avatarPreview" class="ekb-avatar-upload-preview">
                    <img :src="avatarPreview" alt="头像预览">
                    <div class="ekb-avatar-upload-overlay">
                      <i class="fas fa-sync-alt"></i> 更换
                    </div>
                  </div>
                  <div v-else class="ekb-avatar-upload-placeholder">
                    <i class="fas fa-cloud-upload-alt"></i>
                    <span>点击或拖拽上传</span>
                    <span class="ekb-avatar-upload-hint">支持 JPG/PNG，≤2MB</span>
                  </div>
                  <div v-if="avatarUploading" class="ekb-avatar-upload-loading">
                    <div class="spinner"></div>
                  </div>
                </div>
                <input
                  ref="fileInput"
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  hidden
                  @change="handleFileSelect"
                >
                <button v-if="avatarPreview" class="ekb-avatar-remove" @click.stop="removeAvatar">移除头像</button>
              </div>
              <div class="ekb-field">
                <label>点评标题 <span class="ekb-required">*</span></label>
                <input class="input" :value="model.reviewTitle" @input="updateField('reviewTitle', $event.target.value)" placeholder="如：肝癌综合治疗中的关键决策点">
              </div>
            </div>
          </section>

          <!-- 专家标签 -->
          <section class="ekb-section">
            <h4 class="ekb-section-title">
              <i class="fas fa-tags"></i> 专家标签
            </h4>
            <div class="ekb-tags-area">
              <div class="ekb-tags-list">
                <span v-for="(tag, idx) in model.expertTags || []" :key="idx" class="ekb-tag">
                  {{ tag }}
                  <button class="ekb-tag-remove" @click="removeTag(idx)" title="移除">&times;</button>
                </span>
                <span v-if="!model.expertTags?.length" class="ekb-tags-empty">暂无标签，请在下方添加</span>
              </div>
              <div class="ekb-tag-input-row">
                <input
                  class="input"
                  v-model="newTagText"
                  @keyup.enter="addTag"
                  @keydown.,.prevent="addTag"
                  placeholder="输入标签后按回车添加，如：中国科学院院士"
                >
                <button class="btn btn-sm btn-outline" @click="addTag" :disabled="!newTagText.trim()">添加</button>
              </div>
              <p class="ekb-hint">建议添加 2-4 个标签，展示专家身份和专长领域</p>
            </div>
          </section>

          <!-- 知识库内容 -->
          <section class="ekb-section">
            <h4 class="ekb-section-title">
              <i class="fas fa-book-open"></i> 知识库内容
            </h4>
            <textarea
              class="textarea ekb-textarea"
              :value="model.expertKB"
              @input="updateField('expertKB', $event.target.value)"
              placeholder="输入专家对该病例的教学点评知识库内容，建议 500-2000 字。&#10;&#10;建议包含：&#10;1. 病例核心诊疗要点&#10;2. 常见学员错误及纠正思路&#10;3. 该病种的诊疗规范和最新进展&#10;4. 专家个人经验和独到见解"
              rows="16"
            ></textarea>
            <div class="ekb-char-row">
              <div class="ekb-char-bar">
                <div class="ekb-char-fill" :class="charLevel" :style="{ width: charPercent + '%' }"></div>
              </div>
              <span class="ekb-char-count" :class="charLevel">
                {{ ekbLength }} 字
                <template v-if="charLevel === 'low'">（偏少，建议≥500字）</template>
                <template v-else-if="charLevel === 'good'">（适中）</template>
                <template v-else>（充足）</template>
              </span>
            </div>
          </section>

          <!-- 预览卡片 -->
          <section class="ekb-section">
            <h4 class="ekb-section-title">
              <i class="fas fa-eye"></i> 预览效果
            </h4>
            <div class="ekb-preview">
              <div class="ekb-preview-header">
                <div class="ekb-preview-avatar">
                  <img v-if="avatarPreview" :src="avatarPreview">
                  <i v-else class="fas fa-user-graduate"></i>
                </div>
                <div class="ekb-preview-meta">
                  <div class="ekb-preview-name">{{ model.expertName || '专家姓名' }}</div>
                  <div class="ekb-preview-title">{{ model.expertTitle || '单位/职称' }}</div>
                  <div class="ekb-preview-tags" v-if="model.expertTags?.length">
                    <span v-for="(tag, idx) in model.expertTags" :key="idx" class="ekb-preview-tag">{{ tag }}</span>
                  </div>
                </div>
              </div>
              <div class="ekb-preview-body">
                <div class="ekb-preview-review-title">
                  <i class="fas fa-star"></i>
                  {{ model.reviewTitle || '点评标题' }}
                </div>
                <div class="ekb-preview-kb-preview">
                  {{ (model.expertKB || '知识库内容预览...').substring(0, 150) }}{{ ekbLength > 150 ? '...' : '' }}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      <div v-else class="ekb-disabled">
        <div class="ekb-disabled-icon">
          <i class="fas fa-user-slash"></i>
        </div>
        <p class="ekb-disabled-title">专家点评功能未启用</p>
        <p class="ekb-disabled-desc">开启后，可配置专家信息和知识库，训练端将基于此生成个性化专家点评</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { toast, isStaticProduction } from '@ai-sp/shared'

const props = defineProps({
  model: { type: Object, default: () => ({ enabled: false, expertName: '', expertTitle: '', expertAvatar: '', expertTags: [], expertKB: '', reviewTitle: '' }) },
  caseId: { type: String, default: null }
})

const emit = defineEmits(['update:model'])

const newTagText = ref('')
const fileInput = ref(null)
const dragOver = ref(false)
const avatarUploading = ref(false)

const avatarPreview = computed(() => {
  return props.model.expertAvatar || ''
})

function updateField(key, value) {
  emit('update:model', { ...props.model, [key]: value })
}

function addTag() {
  const text = newTagText.value.trim()
  if (!text) return
  const tags = [...(props.model.expertTags || [])]
  if (!tags.includes(text)) {
    tags.push(text)
    updateField('expertTags', tags)
  }
  newTagText.value = ''
}

function removeTag(idx) {
  const tags = [...(props.model.expertTags || [])]
  tags.splice(idx, 1)
  updateField('expertTags', tags)
}

function triggerUpload() {
  if (avatarUploading.value) return
  fileInput.value?.click()
}

function removeAvatar() {
  updateField('expertAvatar', '')
}

function handleDrop(e) {
  dragOver.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file) processFile(file)
}

function handleFileSelect(e) {
  const file = e.target?.files?.[0]
  if (file) processFile(file)
  if (fileInput.value) fileInput.value.value = ''
}

async function processFile(file) {
  if (!file.type.startsWith('image/')) {
    toast.show('请上传图片文件（JPG/PNG/GIF/WebP）', 'warning')
    return
  }
  if (file.size > 2 * 1024 * 1024) {
    toast.show('图片大小不能超过 2MB', 'warning')
    return
  }

  // Generate local data URL for immediate preview
  const dataUrl = await new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.readAsDataURL(file)
  })

  // Show preview immediately with data URL
  updateField('expertAvatar', dataUrl)

  // Upload to server if not in static mode
  if (!isStaticProduction() && props.caseId) {
    avatarUploading.value = true
    try {
      const res = await fetch('/api/case/upload-material', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId: props.caseId, filename: `expert-avatar-${Date.now()}.${file.type.split('/')[1]}`, data: dataUrl })
      })
      if (res.ok) {
        const r = await res.json()
        updateField('expertAvatar', r.path)
      }
    } catch (e) {
      // Keep data URL if upload fails
    } finally {
      avatarUploading.value = false
    }
  }
}

const ekbLength = computed(() => (props.model.expertKB || '').length)

const charLevel = computed(() => {
  if (ekbLength.value < 500) return 'low'
  if (ekbLength.value <= 2000) return 'good'
  return 'full'
})

const charPercent = computed(() => Math.min(100, (ekbLength.value / 2000) * 100))
</script>

<style scoped>
.expert-kb {
  padding: 10px;
}

.ekb-card {
  padding: 0;
  overflow: hidden;
}

.ekb-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  background: #f8fafc;
  border-bottom: 1px solid var(--border);
}

.ekb-header-left {
  flex: 1;
}

.ekb-title {
  margin: 0 0 4px;
  font-size: 18px;
  color: var(--text-main);
}

.ekb-desc {
  margin: 0;
  font-size: 12px;
  color: var(--text-tertiary);
}

/* Toggle Switch */
.ekb-toggle {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  flex-shrink: 0;
}

.ekb-toggle input {
  display: none;
}

.ekb-toggle-track {
  width: 44px;
  height: 24px;
  border-radius: 12px;
  background: #cbd5e1;
  position: relative;
  transition: background 0.2s;
}

.ekb-toggle input:checked + .ekb-toggle-track {
  background: var(--primary);
}

.ekb-toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0,0,0,0.15);
  transition: transform 0.2s;
}

.ekb-toggle input:checked + .ekb-toggle-track .ekb-toggle-thumb {
  transform: translateX(20px);
}

.ekb-toggle-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  min-width: 42px;
}

/* Body */
.ekb-body {
  padding: 24px;
}

.ekb-sections {
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.ekb-section {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 20px;
}

.ekb-section-title {
  margin: 0 0 16px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-main);
  display: flex;
  align-items: center;
  gap: 8px;
}

.ekb-section-title i {
  color: var(--primary);
  width: 18px;
  text-align: center;
}

.ekb-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 12px;
}

.ekb-row:last-child {
  margin-bottom: 0;
}

.ekb-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.ekb-field label {
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 500;
}

.ekb-required {
  color: #ef4444;
}

.ekb-row-avatar {
  align-items: start;
}

.ekb-field-avatar {
  flex: 0 0 auto;
  width: 180px;
}

.ekb-avatar-upload {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  border: 2px dashed #d1d5db;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: border-color 0.2s, background 0.2s;
  background: #f9fafb;
}

.ekb-avatar-upload:hover,
.ekb-avatar-upload.dragging {
  border-color: var(--primary);
  background: #eef2ff;
}

.ekb-avatar-upload.uploading {
  pointer-events: none;
  opacity: 0.7;
}

.ekb-avatar-upload-preview {
  width: 100%;
  height: 100%;
}

.ekb-avatar-upload-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

.ekb-avatar-upload-overlay {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: rgba(0,0,0,0.45);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: #fff;
  font-size: 12px;
  opacity: 0;
  transition: opacity 0.2s;
}

.ekb-avatar-upload:hover .ekb-avatar-upload-overlay {
  opacity: 1;
}

.ekb-avatar-upload-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  text-align: center;
  padding: 10px;
}

.ekb-avatar-upload-placeholder i {
  font-size: 24px;
  color: #9ca3af;
  margin-bottom: 2px;
}

.ekb-avatar-upload-placeholder span {
  font-size: 10px;
  color: #9ca3af;
  line-height: 1.3;
}

.ekb-avatar-upload-hint {
  font-size: 9px !important;
  color: #c4c4c4 !important;
}

.ekb-avatar-upload-loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255,255,255,0.6);
}

.ekb-avatar-remove {
  margin-top: 6px;
  font-size: 12px;
  color: #ef4444;
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px 0;
}

.ekb-avatar-remove:hover {
  text-decoration: underline;
}

.ekb-hint {
  margin: 6px 0 0;
  font-size: 11px;
  color: var(--text-tertiary);
}

/* Tags */
.ekb-tags-area {
  display: flex;
  flex-direction: column;
}

.ekb-tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
  min-height: 28px;
  align-items: center;
}

.ekb-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: #eef2ff;
  color: #4338ca;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
}

.ekb-tag-remove {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  color: #6366f1;
  padding: 0;
  line-height: 1;
}

.ekb-tag-remove:hover {
  color: #ef4444;
}

.ekb-tags-empty {
  font-size: 13px;
  color: var(--text-tertiary);
}

.ekb-tag-input-row {
  display: flex;
  gap: 8px;
}

.ekb-tag-input-row .input {
  flex: 1;
}

/* Textarea */
.ekb-textarea {
  width: 100%;
  font-family: inherit;
  font-size: 13px;
  line-height: 1.7;
  resize: vertical;
  min-height: 320px;
}

/* Character count bar */
.ekb-char-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
}

.ekb-char-bar {
  flex: 1;
  height: 4px;
  border-radius: 2px;
  background: #e5e7eb;
  overflow: hidden;
}

.ekb-char-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s, background 0.3s;
}

.ekb-char-fill.low {
  background: #f59e0b;
}

.ekb-char-fill.good {
  background: #10b981;
}

.ekb-char-fill.full {
  background: #6366f1;
}

.ekb-char-count {
  font-size: 11px;
  white-space: nowrap;
  flex-shrink: 0;
}

.ekb-char-count.low { color: #f59e0b; }
.ekb-char-count.good { color: #10b981; }
.ekb-char-count.full { color: #6366f1; }

/* Preview */
.ekb-preview {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}

.ekb-preview-header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  background: linear-gradient(135deg, #f0f4ff 0%, #f8fafc 100%);
  border-bottom: 1px solid #e5e7eb;
}

.ekb-preview-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #e0e7ff;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}

.ekb-preview-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.ekb-preview-avatar i {
  font-size: 22px;
  color: #6366f1;
}

.ekb-preview-meta {
  min-width: 0;
}

.ekb-preview-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-main);
}

.ekb-preview-title {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 2px;
}

.ekb-preview-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 6px;
}

.ekb-preview-tag {
  font-size: 10px;
  padding: 1px 7px;
  background: #eef2ff;
  color: #6366f1;
  border-radius: 4px;
  font-weight: 500;
}

.ekb-preview-body {
  padding: 16px;
}

.ekb-preview-review-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-main);
  margin-bottom: 8px;
}

.ekb-preview-review-title i {
  color: #f59e0b;
  margin-right: 4px;
}

.ekb-preview-kb-preview {
  font-size: 12px;
  color: var(--text-tertiary);
  line-height: 1.7;
}

/* Disabled state */
.ekb-disabled {
  padding: 60px 24px;
  text-align: center;
}

.ekb-disabled-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
}

.ekb-disabled-icon i {
  font-size: 28px;
  color: #94a3b8;
}

.ekb-disabled-title {
  font-size: 15px;
  color: var(--text-secondary);
  margin: 0 0 6px;
}

.ekb-disabled-desc {
  font-size: 12px;
  color: var(--text-tertiary);
  margin: 0;
  max-width: 320px;
  margin: 0 auto;
}
</style>
