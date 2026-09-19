<template>
  <section id="score-result" class="card rwb-block">
    <div class="rwb-block-head">
      <i class="fa-solid fa-clipboard-check"></i> AI 评阅结果
      <span class="rwb-tag">按 R1 表 {{ result ? result.items.length : 23 }} 条逐条判定</span>
      <span class="rwb-cap">内容评分由大模型完成 · 训练模式结果仅供自检</span>
    </div>

    <!-- 评阅中 -->
    <div v-if="scoring.status === 'running'" class="rwb-score-loading">
      <span class="rwb-spinner"></span>
      <div>
        <div class="rwb-score-loading-title">正在逐条评阅你的报告…</div>
        <div class="rwb-score-loading-desc">
          模型会对照本题评分要点集，逐条判断你有没有写到该写的内容，约需 10–40 秒，可以先看下方的参考报告对照。
        </div>
      </div>
    </div>

    <!-- 失败 -->
    <div v-else-if="scoring.status === 'failed'" class="rwb-score-failed">
      <i class="fa-solid fa-triangle-exclamation"></i>
      <div class="rwb-score-failed-body">
        <div class="rwb-score-failed-title">这次没评出来：{{ scoring.error || '未知原因' }}</div>
        <div class="rwb-score-failed-desc">
          评分失败不影响训练 —— 下方仍可对照参考报告。已尝试 {{ scoring.attempts }} 次。
        </div>
      </div>
      <button class="btn btn-sm btn-primary" :disabled="scoring.status === 'running'" @click="$emit('retry')">重试评分</button>
    </div>

    <!-- 未评分 -->
    <div v-else-if="!result" class="rwb-score-loading">
      <div>
        <div class="rwb-score-loading-title">尚未评分</div>
        <div class="rwb-score-loading-desc">点右侧「立即评分」开始逐条评阅。</div>
      </div>
      <button class="btn btn-sm btn-primary" @click="$emit('score')">立即评分</button>
    </div>

    <!-- 已评分 -->
    <template v-else>
      <!-- 总分 -->
      <div class="rwb-hero">
        <div class="rwb-hero-main">
          <div class="rwb-hero-score">
            <b>{{ result.rawTotal }}</b>
            <span>/ {{ result.scoreableMax }}</span>
          </div>
          <div class="rwb-hero-label">
            本卷可评分 <b>{{ result.scoreableMax }}</b> / 100
            <span class="text-secondary">（{{ result.unassessableItems.length }} 条落在能力边界之外，其分值不计入分母）</span>
          </div>
        </div>
        <div class="rwb-hero-dims">
          <div v-for="d in result.dims" :key="d.dim" class="rwb-dim">
            <div class="rwb-dim-name">{{ shortDim(d.dim) }}</div>
            <div class="rwb-dim-bar"><span :style="{ width: pct(d.got, d.full) }"></span></div>
            <div class="rwb-dim-score">{{ d.got }} / {{ d.full }}</div>
          </div>
        </div>
      </div>

      <!-- 逐条 -->
      <div class="rwb-items">
        <div v-for="dim in grouped" :key="dim.dim" class="rwb-dim-block">
          <div class="rwb-dim-head">
            <span class="rwb-dim-title">{{ dim.dim }}</span>
            <span class="rwb-dim-total">{{ dim.got }} / {{ dim.full }} 分</span>
          </div>
          <div v-for="it in dim.items" :key="it.code" class="rwb-item" :class="markClass(it)">
            <div class="rwb-item-head" @click="toggle(it.code)">
              <i class="fa-solid rwb-item-caret" :class="open[it.code] ? 'fa-chevron-down' : 'fa-chevron-right'"></i>
              <code class="rwb-item-code">{{ it.code }}</code>
              <span class="rwb-item-name">{{ it.name }}</span>
              <span class="rwb-item-score" :class="markClass(it)">{{ it.got }} / {{ it.scoreableFull }}</span>
            </div>
            <div v-show="open[it.code]" class="rwb-item-body">
              <div v-for="p in it.points" :key="p.id" class="rwb-point" :class="'pt-' + markOf(p.score)">
                <span class="rwb-point-dot">{{ p.score === 1 ? '●' : p.score === 0.5 ? '?' : '○' }}</span>
                <span class="rwb-point-text">{{ p.text }}</span>
                <span v-if="p.comment" class="rwb-point-comment">{{ p.comment }}</span>
              </div>
              <div v-for="p in it.nAPoints" :key="'na-' + p.text" class="rwb-point is-na">
                <span class="rwb-point-dot">–</span>
                <span class="rwb-point-text">{{ p.text }}</span>
                <span class="rwb-point-comment">{{ p.why }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 缺失项汇总 -->
      <div v-if="result.missingItems.length" class="rwb-missing">
        <div class="rwb-missing-title"><i class="fa-solid fa-lightbulb"></i> 最该补的 {{ result.missingItems.length }} 处</div>
        <div v-for="m in result.missingItems" :key="m.code" class="rwb-missing-row">
          <code>{{ m.code }}</code>
          <span class="rwb-missing-name">{{ m.name }}</span>
          <span class="rwb-missing-list">{{ m.missing.map(x => x.text).join('；') }}</span>
        </div>
      </div>

      <!-- 不可评条目 -->
      <div v-if="result.unassessableItems.length" class="rwb-na">
        <div class="rwb-na-title">
          {{ result.unassessableItems.length }} 条落在能力边界之外，其分值<b>不扣你的分</b>
        </div>
        <div v-for="u in result.unassessableItems" :key="u.code" class="rwb-na-item">
          <code>{{ u.code }}</code> {{ u.name }}（可评 {{ u.scoreableFull }} / {{ u.full }} 分）—— {{ u.why }}
        </div>
      </div>

      <!-- 申诉与留痕 -->
      <div class="rwb-foot">
        <div class="rwb-trace">
          <span v-if="result.scoreTrace">
            评分留痕：要点集 v{{ result.scoreTrace.rubricVersion }} ·
            {{ result.scoreTrace.gradedAt.slice(0, 16).replace('T', ' ') }}
            <template v-if="result.scoreTrace.commentsBlocked">
              · {{ result.scoreTrace.commentsBlocked }} 条点评因触及红线被隐去
            </template>
          </span>
          <span v-if="scoring.appeal" class="rwb-appeal-done">
            <i class="fa-solid fa-flag"></i> 已于 {{ scoring.appeal.filedAt }} 提交复核申请
          </span>
        </div>
        <div class="flex gap-2">
          <button class="btn btn-sm" @click="$emit('score')">重新评分</button>
          <button v-if="!scoring.appeal" class="btn btn-sm" @click="appealOpen = true">申请复核</button>
        </div>
      </div>

      <div class="rwb-note">
        评分由大模型按要点集逐条判定，<b>不承诺两次完全同分</b>；结果仅供训练自检，成绩以考核侧为准。
        模型点评只说明"哪一类没写到"，不会透露参考报告的具体内容。
      </div>
    </template>

    <!-- 申诉弹窗 -->
    <div v-if="appealOpen" class="modal-overlay" @click.self="appealOpen = false" data-review-exempt>
      <div class="modal-container" style="width:520px">
        <div class="modal-header">
          <span style="font-weight:600">申请复核</span>
          <button class="modal-close" @click="appealOpen = false">✕</button>
        </div>
        <div class="form-item" style="display:block">
          <label style="display:block;font-size:12px;color:var(--text-secondary);margin-bottom:6px">申诉原因（必填，≤200 字）</label>
          <textarea class="input" v-model="appealReason" rows="4" maxlength="200"
                    placeholder="说明你认为哪一条判得不合理，以及理由…" style="width:100%"></textarea>
          <div class="text-secondary" style="font-size:11.5px;margin-top:4px;text-align:right">{{ appealReason.length }} / 200</div>
        </div>
        <div class="modal-footer">
          <button class="btn" @click="appealOpen = false">取消</button>
          <button class="btn btn-primary" @click="submitAppeal">提交申请</button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { toast } from '@ai-sp/shared'

const props = defineProps({
  /** { status, result, error, attempts, appeal } */
  scoring: { type: Object, required: true }
})
const emit = defineEmits(['score', 'retry', 'appeal'])

const open = reactive({})
const appealOpen = ref(false)
const appealReason = ref('')

const result = computed(() => props.scoring.result)

const grouped = computed(() => {
  if (!result.value) return []
  const map = new Map()
  result.value.items.forEach(i => {
    if (!map.has(i.dim)) map.set(i.dim, { dim: i.dim, got: 0, full: 0, items: [] })
    const d = map.get(i.dim)
    d.got += i.got
    d.full += i.scoreableFull
    d.items.push(i)
  })
  return [...map.values()].map(d => ({ ...d, got: Math.round(d.got * 10) / 10, full: Math.round(d.full * 10) / 10 }))
})

function toggle(code) { open[code] = !open[code] }
const pct = (a, b) => (b ? `${Math.round((a / b) * 100)}%` : '0%')
const shortDim = d => String(d).replace(/^[一二三四五六]、/, '')
const markOf = s => (s === 1 ? 'ok' : s === 0.5 ? 'mid' : 'bad')
const markClass = it => {
  const r = it.scoreableFull ? it.got / it.scoreableFull : 0
  return r >= 0.85 ? 'is-ok' : r >= 0.6 ? 'is-mid' : 'is-bad'
}

function submitAppeal() {
  if (!appealReason.value.trim()) { toast.show('请填写申诉原因', 'warning'); return }
  emit('appeal', appealReason.value)
  appealOpen.value = false
  appealReason.value = ''
  toast.show('复核申请已登记（本期只落数据，不做复核流程）', 'success')
}
</script>

<style scoped>
.rwb-block { overflow: hidden; }
.rwb-block-head {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  font-size: 14px; font-weight: 700; color: #1f2937;
  padding: 12px 18px; background: #fafbfc; border-bottom: 1px solid #f3f4f6;
}
.rwb-block-head i { color: var(--primary); }
.rwb-tag { font-size: 11px; font-weight: 500; color: #6b7280; background: #f3f4f6; padding: 3px 10px; border-radius: 8px; }
.rwb-cap { margin-left: auto; font-size: 11px; color: #9ca3af; font-weight: 400; }

/* 评阅中 / 未评分 / 失败 */
.rwb-score-loading, .rwb-score-failed {
  display: flex; align-items: center; gap: 14px; padding: 22px 18px;
}
.rwb-score-loading-title { font-size: 13.5px; font-weight: 700; color: #374151; }
.rwb-score-loading-desc { font-size: 12px; color: #9ca3af; line-height: 1.75; margin-top: 3px; }
.rwb-spinner {
  flex-shrink: 0; width: 28px; height: 28px; border-radius: 50%;
  border: 3px solid #e0e7ff; border-top-color: var(--primary);
  animation: rwb-spin .8s linear infinite;
}
@keyframes rwb-spin { to { transform: rotate(360deg); } }
.rwb-score-failed { background: #fffbeb; border-bottom: 1px solid #fef3c7; }
.rwb-score-failed > i { font-size: 22px; color: var(--warning); flex-shrink: 0; }
.rwb-score-failed-body { flex: 1; min-width: 0; }
.rwb-score-failed-title { font-size: 13px; font-weight: 700; color: #b45309; }
.rwb-score-failed-desc { font-size: 11.5px; color: #92400e; margin-top: 3px; line-height: 1.7; }

/* 总分 */
.rwb-hero { padding: 18px 18px 4px; }
.rwb-hero-main { display: flex; align-items: baseline; gap: 14px; flex-wrap: wrap; }
.rwb-hero-score { display: flex; align-items: baseline; gap: 6px; }
.rwb-hero-score b { font-size: 38px; color: var(--primary); line-height: 1; }
.rwb-hero-score span { font-size: 15px; color: #9ca3af; }
.rwb-hero-label { font-size: 12.5px; color: #6b7280; }
.rwb-hero-dims { display: flex; gap: 18px; flex-wrap: wrap; margin-top: 16px; }
.rwb-dim { min-width: 120px; flex: 1 1 120px; max-width: 200px; }
.rwb-dim-name { font-size: 11.5px; color: #6b7280; margin-bottom: 4px; }
.rwb-dim-bar { height: 6px; border-radius: 3px; background: #eef0f4; overflow: hidden; }
.rwb-dim-bar span { display: block; height: 100%; background: var(--primary); border-radius: 3px; transition: width .3s; }
.rwb-dim-score { font-size: 11px; color: #9ca3af; margin-top: 3px; font-variant-numeric: tabular-nums; }

/* 逐条 */
.rwb-items { padding: 14px 18px 0; }
.rwb-dim-block { margin-bottom: 16px; }
.rwb-dim-head { display: flex; align-items: baseline; gap: 10px; margin-bottom: 6px; }
.rwb-dim-title { font-size: 13px; font-weight: 700; color: #374151; }
.rwb-dim-title::before {
  content: ''; display: inline-block; width: 3px; height: 12px; background: var(--primary);
  border-radius: 2px; margin-right: 7px; vertical-align: -1px;
}
.rwb-dim-total { font-size: 11.5px; color: #9ca3af; margin-left: auto; font-variant-numeric: tabular-nums; }
.rwb-item { border: 1px solid #f0f2f5; border-radius: 8px; margin-bottom: 6px; overflow: hidden; }
.rwb-item.is-bad { border-color: #fee2e2; }
.rwb-item.is-mid { border-color: #fef3c7; }
.rwb-item-head {
  display: flex; align-items: center; gap: 9px; padding: 8px 12px; cursor: pointer;
  background: #fafbfc;
}
.rwb-item-head:hover { background: #f0f7ff; }
.rwb-item-caret { font-size: 10px; color: #9ca3af; }
.rwb-item-code { font-size: 11px; font-family: monospace; color: #6b7280; }
.rwb-item-name { flex: 1; min-width: 0; font-size: 12.5px; color: #374151; }
.rwb-item-score { font-size: 12.5px; font-weight: 700; font-variant-numeric: tabular-nums; }
.rwb-item-score.is-ok { color: var(--success); }
.rwb-item-score.is-mid { color: var(--warning); }
.rwb-item-score.is-bad { color: var(--error); }
.rwb-item-body { padding: 8px 12px 10px; border-top: 1px solid #f3f4f6; }
.rwb-point { display: flex; align-items: flex-start; gap: 7px; padding: 4px 0; font-size: 12.5px; }
.rwb-point-dot { flex-shrink: 0; width: 12px; text-align: center; font-size: 12px; line-height: 1.6; }
.rwb-point.pt-ok .rwb-point-dot { color: var(--success); }
.rwb-point.pt-mid .rwb-point-dot { color: var(--warning); }
.rwb-point.pt-bad .rwb-point-dot { color: #c0c4cc; }
.rwb-point-text { flex: 1; min-width: 0; color: #4b5563; line-height: 1.7; }
.rwb-point.pt-bad .rwb-point-text { color: #909399; }
.rwb-point-comment { flex-shrink: 0; max-width: 46%; font-size: 11.5px; color: #9ca3af; line-height: 1.7; }
.rwb-point.is-na { opacity: .7; }
.rwb-point.is-na .rwb-point-comment { color: #b45309; }

/* 缺失项 */
.rwb-missing { margin: 14px 18px 0; padding: 12px 14px; border-radius: 9px; background: #fffbeb; border: 1px solid #fef3c7; }
.rwb-missing-title { font-size: 13px; font-weight: 700; color: #b45309; margin-bottom: 8px; }
.rwb-missing-title i { margin-right: 5px; }
.rwb-missing-row { display: flex; gap: 8px; font-size: 12px; line-height: 1.9; color: #92400e; }
.rwb-missing-row code { flex-shrink: 0; background: #fff; padding: 0 5px; border-radius: 4px; font-size: 11px; }
.rwb-missing-name { flex-shrink: 0; width: 150px; }
.rwb-missing-list { flex: 1; min-width: 0; }

/* 不可评 */
.rwb-na { margin: 12px 18px 0; padding: 10px 14px; border-radius: 9px; background: #f8fafc; border: 1px solid #eef0f4; }
.rwb-na-title { font-size: 12.5px; font-weight: 700; color: #4b5563; margin-bottom: 6px; }
.rwb-na-item { font-size: 11.5px; line-height: 1.9; color: #6b7280; }
.rwb-na-item code { background: #fff; padding: 1px 5px; border-radius: 4px; font-size: 11px; }

/* 底栏 */
.rwb-foot {
  display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;
  margin: 14px 18px 0; padding: 12px 0; border-top: 1px solid #f3f4f6;
}
.rwb-trace { font-size: 11.5px; color: #9ca3af; line-height: 1.7; display: flex; gap: 12px; flex-wrap: wrap; }
.rwb-appeal-done { color: #b45309; }
.rwb-note { font-size: 12px; color: #9ca3af; line-height: 1.6; padding: 8px 18px 16px; }
</style>
