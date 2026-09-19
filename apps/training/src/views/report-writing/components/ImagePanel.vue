<template>
  <section class="rwb-panel">
    <!-- 影像图片 -->
    <div class="rwb-panel-head">
      <span class="rwb-panel-title"><i class="fa-solid fa-image"></i> 影像图片</span>
      <span class="rwb-tag">{{ sample.modality }} · {{ viewCount }} 个序列 / 共 {{ frameCount }} 帧</span>
      <span class="rwb-cap">滚轮 / ↑↓ 翻层面</span>
    </div>

    <ImageViewer :sample="sample" />

    <!-- 患者信息：与影像同卡，放在图片下面、报告上面 -->
    <PatientInfoSection :sample="sample" @copy="(t, s) => $emit('copy', t, s)" />
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { seriesListOf } from '@ai-sp/shared/imaging'
import ImageViewer from './ImageViewer.vue'
import PatientInfoSection from './PatientInfoSection.vue'

const props = defineProps({
  sample: { type: Object, required: true }
})
defineEmits(['copy'])

const views = computed(() => seriesListOf(props.sample))
const viewCount = computed(() => views.value.length)
const frameCount = computed(() => views.value.reduce((a, v) => a + (v.frames || 0), 0))
</script>

<style scoped>
.rwb-panel { overflow: hidden; }
.rwb-panel-head {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  padding: 12px 18px; background: #fafbfc; border-bottom: 1px solid #f3f4f6;
}
.rwb-panel-title { font-size: 14px; font-weight: 700; color: #1f2937; display: inline-flex; align-items: center; gap: 7px; }
.rwb-panel-title i { color: var(--primary); }
.rwb-tag {
  font-size: 11px; font-weight: 500; color: #6b7280; background: #f3f4f6;
  padding: 3px 10px; border-radius: 8px;
}
.rwb-cap { margin-left: auto; font-size: 11px; color: #9ca3af; }
</style>
