<template>
  <div class="test-selection-panel">
    <div class="test-layout">
      <div class="test-left">
        <h4><i class="fas fa-book-medical"></i> 辅助检查结果（病例提供）</h4>
        <div class="test-data">
          <div v-if="labTests" class="test-data-section">
            <h5>实验室检查</h5>
            <p>{{ labTests }}</p>
          </div>
          <div v-if="imaging" class="test-data-section">
            <h5>影像学检查</h5>
            <p>{{ imaging }}</p>
          </div>
          <div v-if="specialExams" class="test-data-section">
            <h5>特殊检查</h5>
            <p>{{ specialExams }}</p>
          </div>
          <div v-if="!labTests && !imaging && !specialExams" class="empty-hint">该病例暂无辅助检查数据</div>
        </div>
      </div>

      <div class="test-right">
        <h4><i class="fas fa-clipboard-list"></i> 你的检查申请与分析</h4>
        <p class="hint">阅读左侧检查结果后，记录你认为了必要的检查项目和判读结果：</p>
        <div class="selection-area">
          <label>你认为必须做哪些检查？（可多写）</label>
          <textarea v-model="sel.mustDo" rows="3" :disabled="disabled" placeholder="血常规、心电图、胸部X线..." @input="emitChange"></textarea>
        </div>
        <div class="selection-area">
          <label>关键检查结果的判读</label>
          <textarea v-model="sel.interpretation" rows="4" :disabled="disabled" placeholder="WBC升高提示感染... 心电图ST段抬高提示..." @input="emitChange"></textarea>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { getLabTests, getImaging, getSpecialExams } from '../test-selection-engine.js'

const props = defineProps({
  caseData: { type: Object, required: true },
  disabled: { type: Boolean, default: false }
})

const emit = defineEmits(['change'])

const sel = ref({ mustDo: '', interpretation: '' })

const labTests = computed(() => getLabTests(props.caseData))
const imaging = computed(() => getImaging(props.caseData))
const specialExams = computed(() => getSpecialExams(props.caseData))

function emitChange() {
  emit('change', getData())
}

function getData() {
  return {
    testResults: {
      mustDo: sel.value.mustDo,
      interpretation: sel.value.interpretation
    },
    fullText: [sel.value.mustDo, sel.value.interpretation].filter(Boolean).join('\n')
  }
}

defineExpose({ getData })
</script>

<style scoped>
.test-selection-panel { background: var(--card-bg, #fff); border-radius: 8px; }
.test-layout { display: flex; min-height: 450px; }
.test-layout h4 { margin: 0 0 12px; font-size: 14px; }
.hint { font-size: 12px; color: var(--text-secondary); margin-bottom: 12px; }

.test-left {
  width: 380px; padding: 20px; border-right: 1px solid var(--border);
  overflow-y: auto; max-height: 600px; background: #fafafa;
}
.test-data-section { margin-bottom: 16px; }
.test-data-section h5 { margin: 0 0 4px; font-size: 12px; color: var(--text-secondary); text-transform: uppercase; }
.test-data-section p { margin: 0; font-size: 13px; line-height: 1.6; white-space: pre-wrap; }
.empty-hint { color: var(--text-secondary); font-size: 14px; text-align: center; padding: 30px 0; }

.test-right { flex: 1; padding: 20px; overflow-y: auto; max-height: 600px; }
.selection-area { margin-bottom: 14px; }
.selection-area label { display: block; font-size: 13px; font-weight: 500; margin-bottom: 4px; color: var(--text-main); }
.selection-area textarea {
  width: 100%; padding: 8px 12px; border: 1px solid var(--border); border-radius: 6px;
  font-size: 13px; line-height: 1.5; resize: vertical; box-sizing: border-box; font-family: inherit;
}
.selection-area textarea:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 2px rgba(37,99,235,0.1); }
</style>
