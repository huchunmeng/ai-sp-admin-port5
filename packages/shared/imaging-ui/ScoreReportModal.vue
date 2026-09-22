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

      <!-- 总览条：左「得分」右「维度得分」，两块用竖线分开，一直可见 -->
      <div v-if="result" class="sr-summary">
        <div class="sr-score">
          <div class="sr-score-num">
            <b>{{ finalScore }}</b><span>/ {{ finalMax }}</span>
          </div>
          <div class="sr-score-meta">
            <span class="sr-rate">得分率 {{ rate }}</span>
            <span v-if="passInfo" class="sr-pass" :class="passInfo.ok ? 'is-ok' : 'is-no'">
              <i class="fa-solid" :class="passInfo.ok ? 'fa-circle-check' : 'fa-circle-xmark'"></i>
              {{ passInfo.ok ? '达标' : '未达标' }}（{{ passInfo.label }} {{ passInfo.line }} 分）
            </span>
            <button v-if="missingCount" class="sr-badge" title="在「得分明细」里看是哪几条"
                    @click="tab = 'points'">
              <i class="fa-solid fa-circle-exclamation"></i> 缺失 {{ missingCount }} 处
            </button>
          </div>
        </div>

        <div class="sr-divider"></div>

        <div class="sr-dims">
          <div v-for="d in result.dims" :key="d.dim" class="sr-dim">
            <span class="sr-dim-name" :title="d.dim">{{ shortDim(d.dim) }}</span>
            <span class="sr-dim-bar"><i :style="{ width: pct(d.got, d.full) }"></i></span>
            <span class="sr-dim-score">{{ d.got }}<em>/ {{ d.full }}</em></span>
          </div>
        </div>
      </div>

      <!-- 页签：把「得分明细」与「报告对照」分开，不再一路往下堆 -->
      <!-- ⚠️ 练习考/考核模式必须 hideCompare —— 交卷后给参考报告 = 泄题给下一批（见考核侧方案 §3.5） -->
      <div class="sr-tabs">
        <button class="sr-tab" :class="{ active: tab === 'points' }" @click="tab = 'points'">
          <i class="fa-solid fa-list-check"></i> 得分明细
        </button>
        <button v-if="!hideCompare" class="sr-tab" :class="{ active: tab === 'compare' }" @click="tab = 'compare'">
          <i class="fa-solid fa-file-lines"></i> 报告对照
        </button>
      </div>

      <div class="sr-body">
        <div v-show="tab === 'points'" class="sr-pane">
          <ScoreResultPanel :scoring="scoring" :allow-rescore="allowRescore" @score="$emit('score')" @retry="$emit('score')" @appeal="$emit('appeal', $event)" />
        </div>
        <div v-if="!hideCompare" v-show="tab === 'compare'" class="sr-pane">
          <ComparePanel :draft="draft" :sample="sample" />
        </div>
      </div>

      <div class="sr-foot">
        <!-- 考核侧（交卷后不可修改）要能隐藏"返回修改/重练"；训练侧保留 -->
        <button v-if="!hideEditActions" class="btn" @click="$emit('edit')">
          <i class="fa-solid fa-rotate-left"></i> 返回修改
        </button>
        <button v-if="!hideEditActions" class="btn" @click="$emit('restart')">
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
  submittedAt: { type: String, default: '' },
  /** 练习考/考核模式：隐藏「报告对照」页签（交卷后给参考报告 = 泄题给下一批） */
  hideCompare: { type: Boolean, default: false },
  /** 是否允许「重新评分」；**考核与成绩管理页传 false**（反复重评 = 重掷到过线） */
  allowRescore: { type: Boolean, default: true },
  /** 隐藏底栏的「返回修改 / 重练」；**考核侧必须传 true**（交卷后不可修改，也不该重练） */
  hideEditActions: { type: Boolean, default: false }
})
defineEmits(['close', 'score', 'appeal', 'edit', 'restart'])

const tab = ref('points')
const result = computed(() => props.scoring.result || null)

/** 评阅中先停在明细页签，出分后再按有无缺失给个默认落点 */
watch(() => props.scoring.status, s => { if (s !== 'done') tab.value = 'points' })

/** 分数：走考务口径字段（finalScore/finalMax，见 useReportScoring.withExamScale）；
 *  老记录没有这两个字段时回落原始分，保证历史成绩照常显示 */
const finalScore = computed(() => {
  const r = result.value
  if (!r) return '—'
  return typeof r.finalScore === 'number' ? r.finalScore : r.rawTotal
})
const finalMax = computed(() => {
  const r = result.value
  if (!r) return '—'
  return typeof r.finalMax === 'number' ? r.finalMax : r.scoreableMax
})

const rate = computed(() => {
  const r = result.value
  if (!r || !r.scoreableMax) return '—'
  return Math.round(r.rawTotal / r.scoreableMax * 100) + '%'
})
/**
 * 达标线：优先用评分层算好的 `passed`（已按量纲比对），量纲由 passLineSource 决定 ——
 * 考务设定 → 「达标线」；难度分层标定 → 「R1 线」。
 * 老记录没有这些字段时回落 rawTotal ≥ passLine（与过去行为一致）。
 */
const passInfo = computed(() => {
  const r = result.value
  if (!r || typeof r.passLine !== 'number') return null
  const examSource = r.passLineSource === 'exam'
  const ok = typeof r.passed === 'boolean' ? r.passed : (r.scoreableMax ? r.rawTotal >= r.passLine : false)
  return {
    ok,
    line: Math.round(r.passLine * 10) / 10,
    label: examSource ? '达标线' : `${r.level || '本级'} 线`
  }
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

/* 总览条：左「得分」右「维度得分」，中间竖线分隔 */
.sr-summary {
  flex-shrink: 0; display: flex; align-items: center; gap: 20px;
  padding: 13px 18px; background: #fff; border-bottom: 1px solid var(--border);
}
.sr-score { flex-shrink: 0; min-width: 168px; }
.sr-score-num { display: flex; align-items: baseline; gap: 5px; }
.sr-score-num b {
  font-size: 32px; font-weight: 800; color: var(--primary); line-height: 1.05;
  font-variant-numeric: tabular-nums;
}
.sr-score-num span { font-size: 13px; color: #9ca3af; font-variant-numeric: tabular-nums; }
.sr-score-meta { display: flex; align-items: center; gap: 10px; margin-top: 3px; }
.sr-rate { font-size: 12.5px; color: #6b7280; }
.sr-pass {
  display: inline-flex; align-items: center; gap: 4px; font-size: 11.5px;
  border-radius: 8px; padding: 2px 8px;
}
.sr-pass.is-ok { color: #15803d; background: #dcfce7; }
.sr-pass.is-no { color: #b91c1c; background: #fee2e2; }
.sr-divider { width: 1px; align-self: stretch; background: var(--border); }
.sr-badge {
  display: inline-flex; align-items: center; gap: 5px; font-family: inherit; font-size: 11.5px;
  color: #b45309; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px;
  padding: 2px 9px; cursor: pointer;
}
.sr-badge:hover { background: #fef3c7; }

/* 维度：两列网格，名称/条/分数三列定宽对齐，长名截断 */
.sr-dims {
  flex: 1; min-width: 0;
  display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 7px 26px;
}
.sr-dim {
  display: grid; grid-template-columns: minmax(0, 1fr) 62px 58px;
  align-items: center; gap: 9px; font-size: 11.5px; color: #6b7280;
}
.sr-dim-name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sr-dim-bar { height: 5px; border-radius: 3px; background: #eef1f5; overflow: hidden; }
.sr-dim-bar i { display: block; height: 100%; background: var(--primary); border-radius: 3px; }
.sr-dim-score { text-align: right; color: #374151; font-variant-numeric: tabular-nums; }
.sr-dim-score em { font-style: normal; color: #c0c4cc; font-size: 10.5px; }

/* 页签 */
.sr-tabs { flex-shrink: 0; display: flex; gap: 0; padding: 0 18px; background: #fff; border-bottom: 1px solid var(--border); }
.sr-tab {
  display: inline-flex; align-items: center; gap: 6px; font-family: inherit; font-size: 13px;
  padding: 10px 14px; background: none; border: none; border-bottom: 2px solid transparent;
  cursor: pointer; color: #6b7280;
}
.sr-tab:hover { color: var(--primary); }
.sr-tab.is-static { cursor: default; font-weight: 700; color: var(--primary); border-bottom-color: var(--primary); }
.sr-tab.active { color: var(--primary); border-bottom-color: var(--primary); font-weight: 700; }

.sr-body { flex: 1; min-height: 0; overflow-y: auto; padding: 14px 18px 18px; }
.sr-pane { display: block; }
.sr-foot {
  flex-shrink: 0; display: flex; justify-content: flex-end; gap: 8px;
  padding: 12px 18px; background: #fff; border-top: 1px solid var(--border);
}
</style>
