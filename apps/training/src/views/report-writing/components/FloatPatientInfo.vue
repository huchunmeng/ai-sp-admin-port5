<template>
  <!-- 左侧浮动患者信息（样式与病史采集/体格检查的 FloatInfoPanel 一致） -->
  <div class="float-info-trigger" :class="{ active: show }" title="患者信息" @click="show = !show">
    <i class="fa-solid fa-circle-info"></i>
  </div>

  <div v-show="show" class="float-info-overlay">
    <div class="float-info-header">
      <span class="float-tab active">患者信息</span>
      <span class="float-close" @click="show = false"><i class="fa-solid fa-xmark"></i></span>
    </div>

    <div class="float-info-body">
      <div v-for="row in rows" :key="row.k" class="fi-row" :class="{ 'is-masked': row.masked }">
        <span class="fi-k">{{ row.k }}</span>
        <span class="fi-v">{{ row.v }}</span>
        <button v-if="row.copy" class="fi-copy" title="复制到报告" @click="copy(row)">
          <i class="fa-solid fa-copy"></i>
        </button>
        <span v-else-if="row.masked" class="fi-hint">全掩</span>
      </div>

      <div class="fi-row fi-clinical">
        <span class="fi-k">临床主要信息及检查目的</span>
        <button class="fi-copy" title="整段复制到报告" @click="copyClinical">
          <i class="fa-solid fa-copy"></i>
        </button>
      </div>
      <div class="fi-clinical-text">{{ sample.clinicalBrief }}</div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { toast } from '@ai-sp/shared'
import { DEIDENTIFY_ROWS } from '@ai-sp/shared/imaging'

const props = defineProps({
  sample: { type: Object, required: true }
})
const emit = defineEmits(['copy'])

const show = ref(false)

const rows = computed(() => DEIDENTIFY_ROWS.map(r => {
  const row = { k: r.k, v: (props.sample.deidentify || {})[r.key] || '' }
  if (r.masked) row.masked = true
  else row.copy = true
  return row
}))

function copy(row) {
  emit('copy', `${row.k}：${row.v}`, 'general')
  toast.show('已复制到「一般信息」段', 'success')
}

function copyClinical() {
  emit('copy', `临床主要信息及检查目的：${props.sample.clinicalBrief}`, 'general')
  toast.show('已复制到「一般信息」段', 'success')
}
</script>

<style scoped>
/* 与 apps/training/src/components/FloatInfoPanel.vue 同一套观感 */
.float-info-trigger {
  position: absolute; top: 60px; left: 16px; width: 40px; height: 40px;
  background: rgba(255, 255, 255, .94); border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; z-index: 10; box-shadow: 0 2px 12px rgba(0, 0, 0, .15);
  font-size: 20px; color: #409EFF; transition: all .2s;
  border: 1px solid rgba(0, 0, 0, .06);
}
.float-info-trigger:hover { transform: scale(1.08); box-shadow: 0 4px 16px rgba(0, 0, 0, .18); }
.float-info-trigger.active { background: #409EFF; color: #fff; border-color: #409EFF; }

.float-info-overlay {
  position: absolute; top: 60px; left: 64px; width: 390px;
  max-height: calc(100vh - 80px);
  background: rgba(255, 255, 255, .96); border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, .15); overflow: hidden;
  z-index: 10; display: flex; flex-direction: column; backdrop-filter: blur(8px);
}
.float-info-header { display: flex; align-items: center; border-bottom: 1px solid #EBEEF5; flex-shrink: 0; }
.float-tab { flex: 1; text-align: center; padding: 12px 6px; font-size: 13px; color: #909399; }
.float-tab.active { color: #409EFF; border-bottom: 2px solid #409EFF; font-weight: 600; }
.float-close { padding: 8px 12px; cursor: pointer; color: #909399; font-size: 14px; flex-shrink: 0; }
.float-close:hover { color: #F56C6C; }
.float-info-body { padding: 12px 14px 14px; overflow-y: auto; flex: 1; }

.fi-row { display: flex; align-items: center; gap: 6px; font-size: 12.5px; padding: 5px 0; }
.fi-k { color: #909399; flex-shrink: 0; min-width: 88px; }
.fi-v { color: #1f2937; font-weight: 600; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fi-row.is-masked .fi-v { color: #9ca3af; font-weight: 500; }
.fi-hint { font-size: 11px; color: #9ca3af; }
.fi-copy {
  flex-shrink: 0; width: 20px; height: 20px; border-radius: 5px; cursor: pointer;
  border: 1px solid #e5e7eb; background: #fff; color: #9ca3af; font-size: 10px;
  display: flex; align-items: center; justify-content: center;
}
.fi-copy:hover { color: var(--primary); border-color: var(--primary); }
.fi-clinical { padding-bottom: 0; }
.fi-clinical-text {
  font-size: 12.5px; color: #4b5563; line-height: 1.8; padding: 4px 0 2px;
  border-left: 2px solid #EBEEF5; padding-left: 8px;
}
</style>
