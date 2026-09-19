<template>
  <div class="modal-overlay sr-modal" data-review-exempt @click.self="$emit('close')">
    <div class="sr-box">
      <div class="sr-head">
        <span class="sr-title"><i class="fa-solid fa-clipboard-check"></i> 成绩报告</span>
        <span class="sr-case">{{ title }}</span>
        <span v-if="submittedAt" class="sr-time">{{ submittedAt }}</span>
        <button class="sr-close" title="关闭" @click="$emit('close')"><i class="fa-solid fa-xmark"></i></button>
      </div>

      <div class="sr-body">
        <ScoreResultPanel :scoring="scoring" @score="$emit('score')" @retry="$emit('score')" @appeal="$emit('appeal', $event)" />
        <ComparePanel :draft="draft" :sample="sample" />
      </div>

      <div class="sr-foot">
        <button class="btn" @click="$emit('edit')">
          <i class="fa-solid fa-rotate-left"></i> 返回修改
        </button>
        <button class="btn" @click="$emit('restart')">
          <i class="fa-solid fa-forward"></i> 重练
        </button>
        <button class="btn btn-primary" @click="$emit('close')">
          完成 <i class="fa-solid fa-check"></i>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import ScoreResultPanel from './ScoreResultPanel.vue'
import ComparePanel from './ComparePanel.vue'

defineProps({
  /** 与 ScoreResultPanel 同契约 `{ status, result, error, attempts, appeal }` */
  scoring: { type: Object, required: true },
  /** 学员报告（四段） */
  draft: { type: Object, required: true },
  /** 样单元数据（对照区需要 goldStandard） */
  sample: { type: Object, required: true },
  title: { type: String, default: '' },
  submittedAt: { type: String, default: '' }
})
defineEmits(['close', 'score', 'appeal', 'edit', 'restart'])
</script>

<style scoped>
.sr-modal { background: rgba(0, 0, 0, .5); }
.sr-box {
  width: 94vw; max-width: 1180px; max-height: 92vh;
  display: flex; flex-direction: column;
  background: var(--background); border-radius: 12px; overflow: hidden;
  box-shadow: 0 18px 60px rgba(0, 0, 0, .28);
}
.sr-head {
  display: flex; align-items: center; gap: 10px; flex-shrink: 0;
  padding: 12px 18px; background: #fff; border-bottom: 1px solid var(--border);
}
.sr-title { font-size: 15px; font-weight: 700; color: #111827; }
.sr-title i { color: var(--primary); margin-right: 4px; }
.sr-case { font-size: 12.5px; color: #6b7280; }
.sr-time { font-size: 12px; color: #9ca3af; margin-left: auto; }
.sr-close {
  width: 30px; height: 30px; border: none; border-radius: 6px; cursor: pointer;
  background: transparent; color: #909399; font-size: 15px;
}
.sr-close:hover { background: #f5f7fa; color: var(--error); }
.sr-body {
  flex: 1; min-height: 0; overflow-y: auto;
  padding: 14px 18px 0; display: flex; flex-direction: column; gap: 14px;
}
.sr-foot {
  flex-shrink: 0; display: flex; justify-content: flex-end; gap: 8px;
  padding: 12px 18px; background: #fff; border-top: 1px solid var(--border);
}
</style>
