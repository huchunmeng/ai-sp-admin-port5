<template>
  <div class="float-info-trigger" :class="{ active: show }" @click="show = !show" title="患者信息 / 笔记">
    <i class="fa-solid fa-circle-info"></i>
  </div>
  <div class="float-info-overlay" v-if="show">
    <div class="float-info-header">
      <span class="float-tab" :class="{ active: activeTab === 'info' }" @click="activeTab = 'info'">{{ lang === 'zh' ? '患者信息' : 'Info' }}</span>
      <span class="float-tab" :class="{ active: activeTab === 'notes' }" @click="activeTab = 'notes'">{{ lang === 'zh' ? '笔记' : 'Notes' }}</span>
      <span class="float-close" @click="show = false"><i class="fa-solid fa-xmark"></i></span>
    </div>
    <div class="float-info-body" v-show="activeTab === 'info'">
      <PatientInfoPanel :patient="patient" :vitals="vitals" :chiefComplaint="chiefComplaint" :lang="lang" :hideName="hideName">
        <slot name="info-extra"></slot>
      </PatientInfoPanel>
    </div>
    <div class="float-info-body" v-show="activeTab === 'notes'">
      <slot name="notes-content"></slot>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import PatientInfoPanel from '@/components/PatientInfoPanel.vue'

defineProps({
  patient: { type: Object, default: () => ({}) },
  vitals: { type: Object, default: () => ({}) },
  chiefComplaint: { type: String, default: '' },
  lang: { type: String, default: 'zh' },
  hideName: { type: Boolean, default: false },
})

const show = ref(false)
const activeTab = ref('info')
</script>

<style scoped>
.float-info-trigger { position: absolute; top: 60px; left: 16px; width: 40px; height: 40px; background: rgba(255,255,255,0.94); border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 10; box-shadow: 0 2px 12px rgba(0,0,0,0.15); font-size: 20px; color: #409EFF; transition: all .2s; border: 1px solid rgba(0,0,0,0.06); }
.float-info-trigger:hover { transform: scale(1.08); box-shadow: 0 4px 16px rgba(0,0,0,0.18); }
.float-info-trigger.active { background: #409EFF; color: #fff; border-color: #409EFF; }
.float-info-overlay { position: absolute; top: 60px; left: 64px; width: 390px; max-height: calc(100vh - 8px); background: rgba(255,255,255,0.96); border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); overflow: hidden; z-index: 10; display: flex; flex-direction: column; backdrop-filter: blur(8px); }
.float-info-header { display: flex; align-items: center; border-bottom: 1px solid #EBEEF5; flex-shrink: 0; }
.float-tab { flex: 1; text-align: center; padding: 12px 6px; font-size: 13px; cursor: pointer; color: #909399; transition: all .15s; }
.float-tab.active { color: #409EFF; border-bottom: 2px solid #409EFF; }
.float-close { padding: 8px 12px; cursor: pointer; color: #909399; font-size: 14px; flex-shrink: 0; }
.float-close:hover { color: #F56C6C; }
.float-info-body { padding: 12px; overflow-y: auto; flex: 1; }
</style>
