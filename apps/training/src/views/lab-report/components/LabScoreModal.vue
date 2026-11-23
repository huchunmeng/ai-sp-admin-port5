<template>
  <div class="mask" @click.self="$emit('close')">
    <div class="modal" role="dialog" aria-modal="true">
      <div class="modal-head">
        <h3><i class="fa-solid fa-wand-magic-sparkles"></i> AI 解读评价
          <span class="head-sub">{{ report.cardTitle || report.reportName || '' }}</span>
        </h3>
        <button class="close" type="button" @click="$emit('close')">×</button>
      </div>

      <div class="hero">
        <div class="ring-wrap">
          <div class="ring">
            <svg width="132" height="132" viewBox="0 0 132 132">
              <circle cx="66" cy="66" r="56" fill="none" stroke="#e2e8f0" stroke-width="10"></circle>
              <circle cx="66" cy="66" r="56" fill="none" :stroke="gradeColor" stroke-width="10"
                      stroke-linecap="round" :stroke-dasharray="dash + ' ' + circumference" transform="rotate(-90 66 66)"></circle>
            </svg>
            <div class="ring-num"><b>{{ result.total }}</b><small>总分 100</small></div>
          </div>
          <span class="grade" :class="result.grade.cls">{{ result.grade.label }}</span>
        </div>

        <div class="dims">
          <div v-for="(d, key) in LAB_DIMS" :key="key" class="dim-row">
            <span class="dim-name">{{ d.name }}</span>
            <span class="dim-bar"><i :style="{ width: (result.dims[key].ratio * 100) + '%', background: d.color }"></i></span>
            <span class="dim-score"><b>{{ result.dims[key].score }}</b> / {{ d.full }}</span>
          </div>
        </div>
      </div>

      <div class="body">
        <div class="sec">
          <div class="sec-t">要点对照 <span class="sec-sub">本报告 {{ result.pointCount }} 个判读点，命中 {{ result.hitCount }}</span><span class="line"></span></div>
          <div class="point-grid">
            <div v-for="p in result.points" :key="p.id" class="point" :class="p.hit ? 'hit' : 'miss'">
              <span class="mk">{{ p.hit ? '✓' : '✗' }}</span>
              <span>{{ p.text }}<span class="pt-dim">{{ LAB_DIMS[p.dim].name }}</span></span>
            </div>
          </div>
        </div>

        <div class="sec">
          <div class="sec-t">AI 评语<span class="line"></span></div>
          <div class="comment"><p v-for="(para, i) in comment" :key="i">{{ para }}</p></div>
        </div>

        <div class="sec">
          <div class="sec-t">参考解读 <span class="sec-sub">整例（本次报告 + 背景信息）· 训练模式提交后可对照</span><span class="line"></span></div>
          <div class="ref-answer">{{ report.gold.refAnswer }}</div>
        </div>
      </div>

      <div class="modal-foot">
        <span class="left">演示评分 · 由本地规则判定，正式版由服务端模型评分<template v-if="submittedAt"> · 提交于 {{ submittedAt }}</template></span>
        <span class="actions">
          <button class="btn btn-sm" type="button" @click="$emit('revise')">返回修改</button>
          <button class="btn btn-primary btn-sm" type="button" @click="$emit('close')">完成</button>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { LAB_DIMS, buildLabComment } from '@ai-sp/shared/lab'

const props = defineProps({
  result: { type: Object, required: true },
  /* 传进来的是「一次训练 = 一个报告」的展开对象（见 shared/data/lab/reports.js），
     金标准要点已按本报告筛过，refAnswer 仍是整例的（背景信息里都能看到） */
  report: { type: Object, required: true },
  submittedAt: { type: String, default: '' }
})
defineEmits(['close', 'revise'])

const circumference = 2 * Math.PI * 56
const dash = computed(() => circumference * Math.max(0, Math.min(100, props.result.total)) / 100)
const comment = computed(() => buildLabComment(props.result))
const gradeColor = computed(() => {
  const cls = props.result.grade.cls
  return cls === 'good' ? '#10b981' : cls === 'bad' ? '#ef4444' : '#f59e0b'
})
</script>

<style scoped>
.mask { position: fixed; inset: 0; background: rgba(15,23,42,.45); z-index: 200; display: flex; align-items: flex-start; justify-content: center; padding: 40px 20px; overflow: auto; }
.modal { width: 960px; max-width: 100%; background: #fff; border-radius: 16px; box-shadow: 0 24px 70px rgba(15,23,42,.25); overflow: hidden; }
.modal-head { display: flex; align-items: center; justify-content: space-between; padding: 16px 22px; border-bottom: 1px solid #f3f4f6; }
.modal-head h3 { margin: 0; font-size: 15.5px; font-weight: 700; display: flex; align-items: center; gap: 8px; }
.modal-head h3 i { color: var(--primary, #2563eb); }
.head-sub { font-size: 12px; font-weight: 400; color: #6b7280; background: #f3f4f6; border-radius: 6px; padding: 2px 8px; margin-left: 4px; }
.close { border: 0; background: transparent; font-size: 20px; color: #9ca3af; line-height: 1; padding: 2px 6px; border-radius: 6px; cursor: pointer; }
.close:hover { background: #f3f4f6; color: #1f2937; }

.hero { display: grid; grid-template-columns: 190px minmax(0,1fr); gap: 22px; padding: 20px 22px; background: linear-gradient(135deg, #f8fbff 0%, #eef5ff 100%); border-bottom: 1px solid #f3f4f6; }
.ring-wrap { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; }
.ring { position: relative; width: 132px; height: 132px; }
.ring svg { display: block; }
.ring-num { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.ring-num b { font-size: 34px; font-family: 'Consolas', monospace; letter-spacing: -1px; line-height: 1; }
.ring-num small { font-size: 11px; color: #9ca3af; margin-top: 4px; }
.grade { font-size: 12px; font-weight: 700; padding: 2px 10px; border-radius: 999px; }
.grade.good { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
.grade.mid { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; }
.grade.bad { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }

.dims { display: flex; flex-direction: column; justify-content: center; gap: 11px; }
.dim-row { display: grid; grid-template-columns: 96px minmax(0,1fr) 62px; align-items: center; gap: 10px; }
.dim-name { font-size: 12.5px; color: #6b7280; }
.dim-bar { height: 8px; border-radius: 999px; background: #e2e8f0; overflow: hidden; }
.dim-bar i { display: block; height: 100%; border-radius: 999px; transition: width .5s ease; }
.dim-score { font-size: 12px; font-family: 'Consolas', monospace; text-align: right; color: #6b7280; }
.dim-score b { color: #1f2937; font-size: 13px; }

.body { padding: 20px 22px; max-height: 52vh; overflow-y: auto; }
.sec { margin-bottom: 20px; }
.sec:last-child { margin-bottom: 0; }
.sec-t { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 700; margin-bottom: 9px; }
.sec-sub { font-size: 11.5px; color: #9ca3af; font-weight: 400; }
.line { flex: 1; height: 1px; background: #f3f4f6; }

.point-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.point { display: flex; align-items: flex-start; gap: 8px; padding: 8px 10px; border-radius: 8px; font-size: 12.2px; line-height: 1.6; border: 1px solid transparent; }
.point.hit { background: #ecfdf5; border-color: #a7f3d0; }
.point.miss { background: #fef2f2; border-color: #fecaca; }
.mk { font-weight: 700; font-size: 12px; line-height: 1.5; }
.point.hit .mk { color: #047857; }
.point.miss .mk { color: #b91c1c; }
.pt-dim { font-size: 10.5px; color: #9ca3af; margin-left: 4px; }

.comment { border-left: 3px solid var(--primary, #2563eb); background: #f7faff; border-radius: 0 10px 10px 0; padding: 13px 16px; font-size: 13px; line-height: 1.85; color: #334155; }
.comment p { margin: 0 0 8px; }
.comment p:last-child { margin-bottom: 0; }

.ref-answer { border: 1px dashed #cbd5e1; border-radius: 10px; padding: 13px 16px; font-size: 12.8px; line-height: 1.9; color: #374151; background: #fcfcfd; }

.modal-foot { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 22px; border-top: 1px solid #f3f4f6; background: #fcfcfd; }
.modal-foot .left { font-size: 11.5px; color: #9ca3af; }
.actions { display: flex; gap: 8px; }

@media (max-width: 760px) {
  .hero { grid-template-columns: 1fr; }
  .point-grid { grid-template-columns: 1fr; }
  .modal-foot { flex-direction: column; align-items: stretch; }
}
</style>
