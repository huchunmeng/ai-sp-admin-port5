<template>
  <section class="card rwb-panel">
    <!-- 影像图片 / 患者信息 两个 tab（2026-09-20 第六轮批注：与患者信息做成两个 tab） -->
    <div class="rwb-panel-head">
      <button class="rwb-tab" :class="{ active: tab === 'image' }" @click="tab = 'image'">
        <i class="fa-solid fa-image"></i> 影像图片
      </button>
      <button class="rwb-tab" :class="{ active: tab === 'patient' }" @click="tab = 'patient'">
        <i class="fa-solid fa-circle-info"></i> 患者信息
      </button>
      <template v-if="tab === 'image'">
        <span class="rwb-tag">{{ sample.modality }} · {{ viewCount }} 个序列 / 共 {{ frameCount }} 帧</span>
        <span class="rwb-cap">滚轮 / ↑↓ 翻层面</span>
      </template>
    </div>

    <ImageViewer v-show="tab === 'image'" :sample="sample" />
    <PatientInfoTab v-show="tab === 'patient'" :sample="sample" @copy="(t, s) => $emit('copy', t, s)" />
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'
import { seriesListOf } from '@ai-sp/shared/imaging'
import ImageViewer from './ImageViewer.vue'
import PatientInfoTab from './PatientInfoTab.vue'

const props = defineProps({
  sample: { type: Object, required: true }
})
defineEmits(['copy'])

const tab = ref('image')

const views = computed(() => seriesListOf(props.sample))
const viewCount = computed(() => views.value.length)
const frameCount = computed(() => views.value.reduce((a, v) => a + (v.frames || 0), 0))
</script>

<style scoped>
.rwb-panel { overflow: hidden; }
.rwb-panel-head {
  display: flex; align-items: center; gap: 6px;
  padding: 8px 14px 0; background: #fafbfc; border-bottom: 1px solid #f3f4f6;
}
.rwb-tab {
  display: inline-flex; align-items: center; gap: 6px; font-family: inherit;
  font-size: 13.5px; font-weight: 700; color: #9ca3af; cursor: pointer;
  background: none; border: none; border-bottom: 2px solid transparent;
  padding: 9px 10px 10px;
}
.rwb-tab i { font-size: 12px; }
.rwb-tab:hover { color: var(--primary); }
.rwb-tab.active { color: #1f2937; border-bottom-color: var(--primary); }
.rwb-tab.active i { color: var(--primary); }
.rwb-tag {
  font-size: 11px; font-weight: 500; color: #6b7280; background: #f3f4f6;
  padding: 3px 10px; border-radius: 8px; margin-left: 6px;
}
.rwb-cap { margin-left: auto; font-size: 11px; color: #9ca3af; padding-bottom: 2px; }
</style>
