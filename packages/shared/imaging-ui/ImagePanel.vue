<template>
  <section class="card rwb-panel">
    <div class="rwb-panel-head">
      <span class="rwb-panel-title"><i class="fa-solid fa-image"></i> 影像图片</span>
      <span class="rwb-tag">{{ sample.modality }} · {{ viewCount }} 个序列 / 共 {{ frameCount }} 帧</span>
    </div>

    <ImageViewer :sample="sample" />
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { seriesListOf } from '@ai-sp/shared/imaging'
import ImageViewer from './ImageViewer.vue'

const props = defineProps({
  sample: { type: Object, required: true }
})

const views = computed(() => seriesListOf(props.sample))
const viewCount = computed(() => views.value.length)
const frameCount = computed(() => views.value.reduce((a, v) => a + (v.frames || 0), 0))
</script>

<style scoped>
.rwb-panel { overflow: hidden; }
.rwb-panel-head {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 14px; background: #fafbfc; border-bottom: 1px solid #f3f4f6;
}
.rwb-panel-title { display: inline-flex; align-items: center; gap: 7px; font-size: 13.5px; font-weight: 700; color: #1f2937; }
.rwb-panel-title i { font-size: 12px; color: var(--primary); }
.rwb-tag {
  font-size: 11px; font-weight: 500; color: #6b7280; background: #f3f4f6;
  padding: 3px 10px; border-radius: 8px; margin-left: 6px;
}
</style>