<template>
  <div class="modal-overlay sr-modal" data-review-exempt @click.self="$emit('close')">
    <div class="sr-box">
      <!-- 头部：只放身份信息，不放任何分数（分数在下面的总览条） -->
      <div class="sr-head">
        <span class="sr-title"><i class="fa-solid fa-clipboard-check"></i> 成绩报告</span>
        <span class="sr-case">{{ title }}</span>
        <span v-if="submittedAt" class="sr-time">{{ submittedAt }}</span>
        <button class="sr-close" title="关闭" @click="$emit('close')"><i class="fa-solid fa-xmark"></i></button>
      </div>

      <!-- 总览条：总分 + 得分率 + 维度条，**一直可见**，不随页签切换 -->
      <div v-if="result" class="sr-summary">
        <div class="sr-total">
          <b>{{ result.rawTotal }}</b><span>/ {{ result.scoreableMax }}</span>
          <em v-if="result.scoreableMax < 100">本卷可评</em>
        </div>
        <div class="sr-rate">{{ rate }}<small>得分率</small></div>
        <div class="sr-dims">
          <div v-for="d in result.dims" :key="d.dim" class="sr-dim">
            <span class="sr-dim-name">{{ shortDim(d.dim) }}</span>
            <span class="sr-dim-bar"><i :style="{ width: pct(d.got, d.full) }"></i></span>
            <span class="sr-dim-score">{{ d.got }} / {{ d.full }}</span>
          </div>
        </div>
        <div v-if="result.missingItems.length" class="sr-badge">
          缺失 <b>{{ missingCount }}</b> 处
        </div>
      </div>

      <!-- 页签：把「得分明细」与「报告对照」分开，不再一路往下堆 -->
      <div class="sr-tabs">
        <button class="sr-tab" :class="{ active: tab === 'points' }" @click="tab = 'points'">
          <i class="fa-solid fa-list-check"></i> 得分明细
        </button>
        <button class="sr-tab" :class="{ active: tab === 'compare' }" @click="tab = 'compare'">
          <i class="fa-solid fa-file-lines"></i> 报告对照
        </button>
      </div>

      <div class="sr-body">
        <div v-show="tab === 'points'" class="sr-pane">
          <ScoreResultPanel :scoring="scoring" @score="$emit('score')" @retry="$emit('score')" @appeal="$emit('appeal', $event)" />
        </div>
        <div v-show="tab === 'compare'" class="sr-pane">
          <ComparePanel :draft="draft" :sample="sample" />
        </div>
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
import { computed, ref, watch } from 'vue'
import ScoreResultPanel from './ScoreResultPanel.vue'
import ComparePanel from './ComparePanel.vue'

const props = defineProps({
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

const tab = ref('points')
const result = computed(() => props.scoring.result || null)

/** 评阅中先停在明细页签，出分后再按有无缺失给个默认落点 */
watch(() => props.scoring.status, s => { if (s !== 'done') tab.value = 'points' })

const rate = computed(() => {
  const r = result.value
  if (!r || !r.scoreableMax) return '—'
  return Math.round(r.rawTotal / r.scoreableMax * 100) + '%'
})
const missingCount = computed(() => {
  const r = result.value
  return r ? r.missingItems.reduce((a, m) => a + m.missing.length, 0) : 0
})
const shortDim = d => String(d || '').replace(/^[一二三四五六七八九十]+、\s*/, '')
const pct = (got, full) => (full ? Math.round(got / full * 100) : 0) + '%'
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

/* 总览条：横排四块，一直可见 */
.sr-summary {
  flex-shrink: 0; display: flex; align-items: center; gap: 26px;
  padding: 14px 18px; background: #fff; border-bottom: 1px solid var(--border);
}
.sr-total { display: flex; align-items: baseline; gap: 4px; }
.sr-total b { font-size: 30px; font-weight: 800; color: var(--primary); line-height: 1; font-variant-numeric: tabular-nums; }
.sr-total span { font-size: 14px; color: #9ca3af; }
.sr-total em { font-size: 10.5px; color: #9ca3af; font-style: normal; margin-left: 4px; }
.sr-rate { font-size: 15px; font-weight: 700; color: #374151; display: flex; flex-direction: column; align-items: center; }
.sr-rate small { font-size: 10.5px; font-weight: 400; color: #9ca3af; }
.sr-dims { flex: 1; display: flex; flex-wrap: wrap; gap: 6px 20px; min-width: 0; }
.sr-dim { display: flex; align-items: center; gap: 7px; font-size: 11.5px; color: #6b7280; }
.sr-dim-name { white-space: nowrap; }
.sr-dim-bar { width: 64px; height: 5px; border-radius: 3px; background: #eef1f5; overflow: hidden; display: inline-block; }
.sr-dim-bar i { display: block; height: 100%; background: var(--primary); border-radius: 3px; }
.sr-dim-score { font-variant-numeric: tabular-nums; }
.sr-badge {
  flex-shrink: 0; font-size: 12px; color: #b45309; background: #fffbeb;
  border: 1px solid #fde68a; border-radius: 8px; padding: 4px 10px;
}
.sr-badge b { font-size: 14px; }

/* 页签 */
.sr-tabs { flex-shrink: 0; display: flex; gap: 0; padding: 0 18px; background: #fff; border-bottom: 1px solid var(--border); }
.sr-tab {
  display: inline-flex; align-items: center; gap: 6px; font-family: inherit; font-size: 13px;
  padding: 10px 14px; background: none; border: none; border-bottom: 2px solid transparent;
  cursor: pointer; color: #6b7280;
}
.sr-tab:hover { color: var(--primary); }
.sr-tab.active { color: var(--primary); border-bottom-color: var(--primary); font-weight: 700; }

.sr-body { flex: 1; min-height: 0; overflow-y: auto; padding: 14px 18px 18px; }
.sr-pane { display: block; }
.sr-foot {
  flex-shrink: 0; display: flex; justify-content: flex-end; gap: 8px;
  padding: 12px 18px; background: #fff; border-top: 1px solid var(--border);
}
</style>
