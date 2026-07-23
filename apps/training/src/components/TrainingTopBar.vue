<template>
  <div class="training-topbar">
    <div class="station-left">
      <span class="home-link" @click="$router.push({ name: 'home' })" title="回到首页">
        <i class="fa-solid fa-house"></i>
      </span>
      <span class="station-name">{{ stationName }}</span>
      <button v-if="showLangToggle" class="lang-toggle-btn" @click="$emit('toggle-lang')">
        <i class="fa-solid fa-language"></i> {{ langLabel }}
      </button>
    </div>
    <div v-if="flowSteps && flowSteps.length > 0" class="progress-bar-wrap flow-nav">
      <div class="progress-steps">
        <template v-for="(step, si) in flowSteps" :key="si">
          <div
            class="progress-step"
            :class="{ active: flowStepIndex === si, clickable: flowStepIndex !== si, 'no-dot': true }"
            @click="$emit('flow-step-click', si, step)"
          >
            <span class="step-label">{{ step.label }}</span>
          </div>
          <div
            v-if="si < flowSteps.length - 1"
            class="progress-line"
          ></div>
        </template>
      </div>
    </div>
    <div v-else-if="steps && steps.length > 0" class="progress-bar-wrap">
      <div class="progress-steps">
        <template v-for="(step, si) in steps" :key="si">
          <div
            class="progress-step"
            :class="{ active: stepIndex === si, done: stepIndex > si, clickable: canClickStep(si), 'no-dot': hideStepNumber }"
            @click="$emit('step-click', si)"
          >
            <span v-if="!hideStepNumber" class="step-dot">
              <i v-if="stepIndex > si" class="fa-solid fa-check"></i>
              <span v-else>{{ si + 1 }}</span>
            </span>
            <span class="step-label">{{ step.label }}</span>
          </div>
          <div
            v-if="si < steps.length - 1"
            class="progress-line"
            :class="{ done: stepIndex > si }"
          ></div>
        </template>
      </div>
    </div>
    <div v-else class="topbar-center">
      <slot name="center"></slot>
    </div>
    <div class="topbar-right">
      <span class="timer" :class="timerClass">{{ formattedTime }}</span>
      <button class="end-btn" :class="{ 'next-btn': endIcon === 'fa-arrow-right' }" @click="$emit('end')">
        <i :class="'fa-solid ' + endIcon"></i> {{ endLabel }}
      </button>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  stationName: { type: String, required: true },
  steps: { type: Array, default: () => [] },
  stepIndex: { type: Number, default: 0 },
  formattedTime: { type: String, required: true },
  endLabel: { type: String, default: '结束训练' },
  endIcon: { type: String, default: 'fa-right-from-bracket' },
  allowBack: { type: Boolean, default: false },
  timerClass: { type: String, default: '' },
  showLangToggle: { type: Boolean, default: false },
  langLabel: { type: String, default: 'EN' },
  hideStepNumber: { type: Boolean, default: false },
  allowAdvance: { type: Boolean, default: true },
  flowSteps: { type: Array, default: null },
  flowStepIndex: { type: Number, default: 0 },
})

defineEmits(['step-click', 'end', 'toggle-lang', 'flow-step-click'])

function canClickStep(si) {
  if (si === props.stepIndex) return false
  if (si === props.stepIndex + 1 && !props.allowAdvance) return false
  if (si === props.stepIndex + 1) return true
  if (props.allowBack && si < props.stepIndex) return true
  return false
}
</script>

<style scoped>
.training-topbar {
  position: absolute;
  top: env(safe-area-inset-top, 0px);
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px 24px;
  background: rgba(220, 227, 234, 0.94);
  backdrop-filter: blur(8px);
  z-index: 10;
  border-bottom: 1px solid rgba(0,0,0,0.05);
}
.station-left {
  position: absolute;
  left: 24px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.home-link {
  width: 32px; height: 32px; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: #6b7280; font-size: 14px;
  transition: all .15s;
}
.home-link:hover { background: #f3f4f6; color: #2563eb; }
.station-name {
  font-weight: 600;
  font-size: 15px;
  white-space: nowrap;
  color: #606266;
  letter-spacing: 0.02em;
}
.lang-toggle-btn {
  background: rgba(255,255,255,0.7);
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  padding: 3px 10px;
  font-size: 12px;
  cursor: pointer;
  color: #606266;
  display: flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
  transition: all .15s;
}
.lang-toggle-btn:hover {
  background: #409eff;
  color: #fff;
  border-color: #409eff;
}
.progress-bar-wrap {
  background: rgba(255,255,255,0.55);
  border-radius: 24px;
  padding: 6px 18px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
}
.progress-steps {
  display: flex;
  align-items: center;
}
.progress-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 72px;
  cursor: default;
  padding: 0 3px 18px;
  position: relative;
}
.progress-step.clickable {
  cursor: pointer;
}
.progress-step.no-dot {
  padding-bottom: 0;
  flex: 1;
}
.progress-step.no-dot .step-label {
  text-align: center;
}
.progress-step.clickable .step-dot {
  transition: box-shadow 0.2s;
}
.progress-step.clickable:hover .step-dot {
  box-shadow: 0 0 0 4px rgba(64, 158, 255, 0.25);
}
.step-dot {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: #dcdfe6;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  transition: all 0.2s;
  flex-shrink: 0;
}
.progress-step.active .step-dot {
  background: #409eff;
  box-shadow: 0 2px 8px rgba(64,158,255,0.35);
  width: 28px;
  height: 28px;
  font-size: 13px;
}
.progress-step.done .step-dot {
  background: #67c23a;
}
.step-label {
  font-size: 15px;
  color: #909399;
  margin-top: 4px;
  white-space: nowrap;
  font-weight: 500;
  flex-shrink: 0;
}
.progress-step.active .step-label {
  color: #409EFF;
  font-weight: 700;
}
.progress-step.done .step-label {
  color: #67c23a;
}
.progress-line {
  height: 2px;
  flex: 1;
  min-width: 22px;
  background: #e0e3e8;
  margin: 0 2px;
  align-self: center;
  transition: background 0.3s;
}
.progress-line.done {
  background: #67c23a;
}
/* flow-nav: compact, two-state (active/inactive only, no done) */
.flow-nav .progress-step {
  min-width: 0;
  padding: 0 6px;
}
.flow-nav .step-label {
  font-size: 13px;
}
.flow-nav .progress-line {
  min-width: 14px;
}

.topbar-center {}
.topbar-right {
  position: absolute;
  right: 24px;
  display: flex;
  align-items: center;
  gap: 14px;
  flex-shrink: 0;
}
.timer {
  font-size: 14px;
  font-weight: 600;
  color: #606266;
  white-space: nowrap;
  background: rgba(255,255,255,0.7);
  padding: 5px 14px;
  border-radius: 14px;
  font-variant-numeric: tabular-nums;
}
.timer.warning {
  background: #fdf6ec;
  color: #E6A23C;
}
.timer.danger {
  background: #fef0f0;
  color: #F56C6C;
}
.end-btn {
  background: #f56c6c;
  color: #fff;
  border: none;
  padding: 6px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  white-space: nowrap;
  font-weight: 500;
  transition: background 0.15s, box-shadow 0.15s;
}
.end-btn:hover {
  background: #e04545;
  box-shadow: 0 2px 8px rgba(245,108,108,0.3);
}
.end-btn.next-btn {
  background: #409eff;
}
.end-btn.next-btn:hover {
  background: #337ecc;
  box-shadow: 0 2px 8px rgba(64,158,255,0.3);
}
</style>
