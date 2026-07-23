<template>
  <div class="patient-info-panel">
    <div class="patient-info-mini">
      <div class="mini-name">
        <span class="patient-thumb">
          <img v-if="patient.avatar" :src="patient.avatar" />
          <span v-else>👤</span>
        </span>
        {{ patient.name }}
      </div>
      <div class="mini-row">
        <span>{{ patient.gender }}</span>
        <span>{{ patient.age }}岁</span>
        <span v-if="patient.occupation">{{ patient.occupation }}</span>
      </div>
    </div>
    <div class="chief-complaint" v-if="patient.chiefComplaint">
      <strong>主诉：</strong>{{ patient.chiefComplaint }}
    </div>
    <div class="vital-mini" v-if="patient.vitals && patient.vitals.length">
      <div class="vm-item" v-for="(v, vi) in patient.vitals" :key="vi">
        <div class="vm-val">{{ v.value }}</div>
        <div class="vm-label">{{ v.label }}</div>
      </div>
    </div>
    <slot></slot>
  </div>
</template>

<script setup>
defineProps({
  patient: { type: Object, required: true },
})
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
.chief-complaint {
  font-size: 13px;
  color: #909399;
  line-height: 1.6;
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
</style>
