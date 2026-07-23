<template>
  <!-- End Confirm Modal -->
  <div v-if="showEndConfirm" class="modal-overlay" @click.self="$emit('cancel')">
    <div class="modal-container" :style="{ maxWidth: endMaxWidth || '480px' }">
      <div class="modal-header">
        <h3>{{ endTitle }}</h3>
        <span class="modal-close" @click="$emit('cancel')"><i class="fa-solid fa-xmark"></i></span>
      </div>
      <div class="modal-body">
        <slot name="end-body">
          <p class="end-warning">{{ endWarning }}</p>
        </slot>
      </div>
      <div class="btn-row">
        <button class="btn" @click="$emit('cancel')">{{ cancelLabelI18n }}</button>
        <button class="btn btn-danger" v-if="showForceEnd" @click="$emit('forceEnd')">{{ forceEndLabelI18n }}</button>
        <button class="btn btn-primary" @click="$emit('confirm')">{{ confirmLabelI18n }}</button>
      </div>
    </div>
  </div>

  <!-- Confirm Dialog Modal -->
  <div v-if="confirmState.show" class="modal-overlay">
    <div class="modal-container" style="max-width:420px;">
      <div class="confirm-dialog">
        <div class="confirm-icon" :class="confirmState.iconClass">
          <i :class="'fa-solid ' + confirmState.icon"></i>
        </div>
        <h3>{{ confirmState.title }}</h3>
        <p>{{ confirmState.message }}</p>
        <div class="btn-row">
          <button class="btn" @click="confirmState.resolve(false); confirmState.show = false">
            {{ lang === 'zh' ? '取消' : 'Cancel' }}
          </button>
          <button class="btn btn-primary" @click="confirmState.resolve(true); confirmState.show = false">
            {{ lang === 'zh' ? '确定' : 'Confirm' }}
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Toast -->
  <div v-if="toastMsg" class="toast-bar" :class="toastType">{{ toastMsg }}</div>
</template>

<script setup>
import { computed } from 'vue'
import { useToast, useConfirm } from '@/composables/useUtils'

const props = defineProps({
  showEndConfirm: { type: Boolean, default: false },
  endTitle: { type: String, default: '' },
  endWarning: { type: String, default: '' },
  endMaxWidth: { type: String, default: '480px' },
  cancelLabel: { type: String, default: '' },
  confirmLabel: { type: String, default: '' },
  showForceEnd: { type: Boolean, default: false },
  forceEndLabel: { type: String, default: '' },
  lang: { type: String, default: 'zh' },
})

defineEmits(['cancel', 'confirm', 'forceEnd'])

const cancelLabelI18n = computed(() => props.cancelLabel || (props.lang === 'zh' ? '取消' : 'Cancel'))
const confirmLabelI18n = computed(() => props.confirmLabel || (props.lang === 'zh' ? '确定' : 'Confirm'))
const forceEndLabelI18n = computed(() => props.forceEndLabel || (props.lang === 'zh' ? '强制结束' : 'Force End'))

const { toastMsg, toastType } = useToast()
const { confirmState } = useConfirm()
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
}
.modal-container {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  width: 90%;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.12);
}
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.modal-header h3 {
  margin: 0;
}
.modal-close {
  cursor: pointer;
  font-size: 18px;
  color: #909399;
  transition: all .15s;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}
.modal-close:hover {
  color: #F56C6C;
  background: rgba(245,108,108,0.08);
}
.modal-body {
  margin-bottom: 16px;
}
.end-warning {
  color: #909399;
  font-size: 13px;
}
.btn-row {
  display: flex;
  gap: 12px;
  justify-content: center;
}
.btn {
  padding: 8px 20px;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  font-size: 13px;
  transition: all .15s;
}
.btn:hover {
  border-color: #409EFF;
  color: #409EFF;
}
.btn-primary {
  background: #409eff;
  color: #fff;
  border-color: #409eff;
}
.btn-primary:hover {
  background: #337ecc;
  color: #fff;
  border-color: #337ecc;
}
.btn-danger {
  background: #fef2f2;
  color: #f56c6c;
  border-color: #fecaca;
}
.btn-danger:hover {
  background: #f56c6c;
  color: #fff;
  border-color: #f56c6c;
}
.confirm-dialog {
  text-align: center;
}
.confirm-icon {
  font-size: 36px;
  margin-bottom: 12px;
  color: #e6a23c;
}
.confirm-icon.danger {
  color: #f56c6c;
}
.confirm-icon.info {
  color: #409eff;
}
.toast-bar {
  position: fixed;
  top: 62px;
  left: 50%;
  transform: translateX(-50%);
  padding: 8px 24px;
  border-radius: 8px;
  font-size: 13px;
  z-index: 300;
  color: #fff;
  box-shadow: 0 4px 12px rgba(0,0,0,0.12);
}
.toast-bar.success {
  background: #67c23a;
}
.toast-bar.warning {
  background: #e6a23c;
}
.toast-bar.info {
  background: #909399;
}
</style>
