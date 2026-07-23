<template>
  <div class="record-editor">
    <div class="editor-toolbar">
      <button class="tool-btn" :disabled="disabled" @click="$emit('auto-generate')">
        <i class="fas fa-magic"></i> AI生成初稿
      </button>
      <button class="tool-btn" :disabled="disabled || !hasPriorData" @click="$emit('auto-import')">
        <i class="fas fa-download"></i> 导入前序数据
      </button>
    </div>

    <div class="record-sections">
      <div class="record-section">
        <label>主诉</label>
        <textarea v-model="sections.chiefComplaint" rows="2" :disabled="disabled" placeholder="患者因...入院" @input="emitChange"></textarea>
      </div>
      <div class="record-section">
        <label>现病史</label>
        <textarea v-model="sections.presentIllness" rows="4" :disabled="disabled" placeholder="患者于...前无明显诱因出现..." @input="emitChange"></textarea>
      </div>
      <div class="record-section">
        <label>既往史</label>
        <textarea v-model="sections.pastHistory" rows="3" :disabled="disabled" placeholder="既往有高血压病史...吸烟...饮酒..." @input="emitChange"></textarea>
      </div>
      <div class="record-section">
        <label>体格检查</label>
        <textarea v-model="sections.physicalExam" rows="3" :disabled="disabled" placeholder="T: ... P: ... R: ... BP: ... 神志清楚..." @input="emitChange"></textarea>
      </div>
      <div class="record-section">
        <label>辅助检查</label>
        <textarea v-model="sections.ancillaryTests" rows="3" :disabled="disabled" placeholder="血常规：... 胸部X线：..." @input="emitChange"></textarea>
      </div>
      <div class="record-section">
        <label>初步诊断</label>
        <textarea v-model="sections.diagnosis" rows="2" :disabled="disabled" placeholder="1. ... 2. ..." @input="emitChange"></textarea>
      </div>
      <div class="record-section">
        <label>治疗计划</label>
        <textarea v-model="sections.treatment" rows="3" :disabled="disabled" placeholder="一般治疗：... 药物治疗：..." @input="emitChange"></textarea>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  disabled: { type: Boolean, default: false },
  sessionData: { type: Object, default: () => ({}) }
})

const emit = defineEmits(['change', 'auto-generate', 'auto-import'])

const hasPriorData = computed(() => {
  return props.sessionData && Object.keys(props.sessionData).length > 0
})

const sections = ref({
  chiefComplaint: '',
  presentIllness: '',
  pastHistory: '',
  physicalExam: '',
  ancillaryTests: '',
  diagnosis: '',
  treatment: ''
})

function emitChange() {
  emit('change', getData())
}

function getFullText() {
  return Object.values(sections.value).filter(Boolean).join('\n\n')
}

function getData() {
  return { sections: { ...sections.value }, fullText: getFullText() }
}

function setSection(key, value) {
  sections.value[key] = value
}

defineExpose({ getData, setSection, getFullText })
</script>

<style scoped>
.record-editor { background: var(--card-bg, #fff); border-radius: 8px; overflow: hidden; }
.editor-toolbar { display: flex; gap: 8px; padding: 12px 20px; background: #f9fafb; border-bottom: 1px solid var(--border); }
.tool-btn {
  display: flex; align-items: center; gap: 6px; padding: 6px 14px;
  background: var(--primary); color: #fff; border: none; border-radius: 6px;
  font-size: 13px; cursor: pointer;
}
.tool-btn:hover:not(:disabled) { opacity: 0.9; }
.tool-btn:disabled { opacity: 0.5; cursor: default; }

.record-sections { padding: 20px; }
.record-section { margin-bottom: 16px; }
.record-section:last-child { margin-bottom: 0; }
.record-section label { display: block; font-size: 13px; font-weight: 600; color: var(--text-main); margin-bottom: 4px; }
.record-section textarea {
  width: 100%; padding: 8px 12px; border: 1px solid var(--border); border-radius: 6px;
  font-size: 13px; line-height: 1.6; resize: vertical; box-sizing: border-box; font-family: inherit;
}
.record-section textarea:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 2px rgba(37,99,235,0.1); }
</style>
