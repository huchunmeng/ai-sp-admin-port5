<template>
  <div class="differential-panel">
    <div class="panel-header">
      <h4><i class="fas fa-balance-scale"></i> 鉴别诊断</h4>
      <button v-if="!disabled" class="btn-add-diff" @click="addItem">
        <i class="fas fa-plus"></i> 添加鉴别
      </button>
    </div>

    <p class="section-hint">对每个需要考虑的疾病，列出支持和反对的证据，以及如何排除。</p>

    <div v-if="items.length === 0" class="empty-hint">尚未添加鉴别诊断项目</div>

    <div v-for="(item, idx) in items" :key="idx" class="diff-card">
      <div class="diff-card-header">
        <span class="diff-num">{{ idx + 1 }}</span>
        <input
          v-model="item.disease"
          type="text"
          class="diff-disease-input"
          placeholder="疾病名称，如：肺结核、肺癌、肺栓塞"
          :disabled="disabled"
          @input="emitChange"
        />
        <button v-if="!disabled" class="btn-remove-sm" @click="removeItem(idx)" title="删除">
          <i class="fas fa-trash-alt"></i>
        </button>
      </div>
      <div class="diff-card-body">
        <div class="diff-field">
          <label>支持证据</label>
          <textarea v-model="item.supporting" rows="2" :disabled="disabled" placeholder="支持该诊断的临床发现" @input="emitChange"></textarea>
        </div>
        <div class="diff-field">
          <label>反对证据</label>
          <textarea v-model="item.against" rows="2" :disabled="disabled" placeholder="不支持该诊断的临床发现" @input="emitChange"></textarea>
        </div>
        <div class="diff-field">
          <label>如何排除</label>
          <input v-model="item.excludeBy" type="text" :disabled="disabled" placeholder="排除该诊断的检查方法" @input="emitChange" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  disabled: { type: Boolean, default: false }
})

const emit = defineEmits(['change'])

const items = ref([{ disease: '', supporting: '', against: '', excludeBy: '' }])

function addItem() {
  items.value.push({ disease: '', supporting: '', against: '', excludeBy: '' })
}

function removeItem(idx) {
  if (items.value.length > 1) items.value.splice(idx, 1)
  emitChange()
}

function emitChange() {
  emit('change', getData())
}

function getData() {
  return items.value.filter(i => i.disease.trim())
}

defineExpose({ getData })
</script>

<style scoped>
.differential-panel { background: var(--card-bg, #fff); border-radius: 8px; padding: 20px; }
.panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.panel-header h4 { margin: 0; font-size: 14px; color: var(--text-main); }
.section-hint { font-size: 12px; color: var(--text-secondary); margin-bottom: 16px; }
.empty-hint { color: var(--text-secondary); font-size: 14px; text-align: center; padding: 30px 0; }

.btn-add-diff {
  background: var(--primary); color: #fff; border: none; padding: 6px 14px;
  border-radius: 6px; font-size: 13px; cursor: pointer;
}
.btn-add-diff:hover { opacity: 0.9; }

.diff-card {
  border: 1px solid var(--border); border-radius: 8px; margin-bottom: 12px; overflow: hidden;
}
.diff-card-header {
  display: flex; align-items: center; gap: 8px; padding: 10px 12px;
  background: #f9fafb; border-bottom: 1px solid var(--border);
}
.diff-num { width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; background: var(--primary); color: #fff; border-radius: 50%; font-size: 12px; font-weight: 600; }
.diff-disease-input { flex: 1; padding: 6px 10px; border: 1px solid var(--border); border-radius: 4px; font-size: 14px; font-weight: 500; }
.diff-disease-input:focus { outline: none; border-color: var(--primary); }
.btn-remove-sm { background: none; border: none; color: #ef4444; cursor: pointer; padding: 4px; }
.diff-card-body { padding: 12px; }
.diff-field { margin-bottom: 10px; }
.diff-field:last-child { margin-bottom: 0; }
.diff-field label { display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 4px; font-weight: 500; }
.diff-field textarea, .diff-field input { width: 100%; padding: 6px 10px; border: 1px solid var(--border); border-radius: 4px; font-size: 13px; resize: vertical; box-sizing: border-box; }
.diff-field textarea:focus, .diff-field input:focus { outline: none; border-color: var(--primary); }
</style>
