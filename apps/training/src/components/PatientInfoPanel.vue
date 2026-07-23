<template>
  <div class="patient-info-panel">
    <div class="patient-info-mini">
      <div class="mini-name">
        <span class="patient-thumb">
          <img v-if="patient.avatar && (patient.avatar.startsWith('/images/') || patient.avatar.startsWith('images/') || patient.avatar.startsWith('http'))" :src="patient.avatar" />
          <span v-else-if="patient.avatar">{{ patient.avatar }}</span>
        </span>
        <span v-if="!hideName">{{ patient.name }}</span>
      </div>
      <div class="mini-row">
        <span>{{ patient.sex || patient.gender }}</span>
        <span>{{ patient.age }}{{ lang === 'zh' ? '岁' : 'y' }}</span>
        <span v-if="patient.occupation">{{ patient.occupation }}</span>
      </div>
    </div>
    <div class="chief-complaint" v-if="chiefComplaint">
      <strong>{{ lang === 'zh' ? '主诉：' : 'CC: ' }}</strong>{{ chiefComplaint }}
    </div>
    <div class="vital-mini" v-if="vitals">
      <div class="vm-item" v-for="(val, key) in vitals" :key="key">
        <div class="vm-val">{{ val }}</div>
        <div class="vm-label">{{ vitalLabels[key] || key }}</div>
      </div>
    </div>
    <slot></slot>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  patient: { type: Object, required: true },
  vitals: { type: Object, default: null },
  chiefComplaint: { type: String, default: '' },
  lang: { type: String, default: 'zh' },
  hideName: { type: Boolean, default: false },
})

const vitalLabels = computed(() => ({
  temp: props.lang === 'zh' ? '体温' : 'Temp',
  pulse: props.lang === 'zh' ? '脉搏' : 'Pulse',
  rr: props.lang === 'zh' ? '呼吸' : 'RR',
  bp: props.lang === 'zh' ? '血压' : 'BP',
  spo2: 'SpO₂',
}))
</script>

<style scoped>
.patient-info-panel {
  font-size: 13px;
}
.patient-info-mini {
  margin-bottom: 12px;
}
.mini-name {
  font-weight: 600;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.mini-row {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
  display: flex;
  gap: 8px;
}
.patient-thumb img {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
}
.patient-thumb span {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #dce3ea;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
}
.vital-mini {
  display: flex;
  flex-wrap: nowrap;
  gap: 4px;
  margin: 12px 0;
}
.vm-item {
  text-align: center;
  background: #f5f7fa;
  border-radius: 6px;
  padding: 4px 6px;
  flex: 1;
  min-width: 0;
}
.vm-val {
  font-weight: 700;
  font-size: 11px;
  color: #303133;
  word-break: break-all;
}
.vm-label {
  font-size: 8px;
  color: #909399;
}
.chief-complaint {
  font-size: 13px;
  color: #909399;
  line-height: 1.6;
}
</style>
