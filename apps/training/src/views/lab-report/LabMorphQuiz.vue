<template>
  <div v-if="morphSet" class="lmq-page">
    <div class="lmq-top">
      <button class="back" type="button" @click="goList"><i class="fa-solid fa-arrow-left"></i> 返回列表</button>
      <div class="title-wrap">
        <h2>{{ morphSet.title }}</h2>
        <div class="meta">
          <span v-for="t in morphSet.tags" :key="t" class="chip">{{ t }}</span>
          <span class="chip">{{ morphSet.questions.length }} 题 · 每题 {{ perScore }} 分</span>
        </div>
      </div>
      <span class="level-tag" :class="levelKey">{{ getCaseLevelLabel(morphSet.level) }}</span>
    </div>

    <!-- 答题态 -->
    <template v-if="!result">
      <div class="lmq-progress">
        <span class="pg-label">第 {{ current + 1 }} / {{ total }} 题</span>
        <div class="pg-dots">
          <button v-for="(q, i) in morphSet.questions" :key="q.id" type="button"
                  class="pg-dot" :class="{ on: i === current, done: answers[q.id] && answers[q.id].length }"
                  @click="current = i">{{ i + 1 }}</button>
        </div>
        <span class="pg-count">已答 {{ answeredCount }} / {{ total }}</span>
      </div>

      <div class="lmq-grid">
        <section class="lmq-image-card">
          <img :src="q.image" :alt="q.imageCaption">
          <div class="lmq-caption">
            <i class="fa-solid fa-image"></i>
            <span>{{ q.imageCaption }}</span>
            <template v-if="q.imageCredit">
              <span class="credit-sep">·</span>
              <span>来源：<a :href="q.imageCredit.url" target="_blank" rel="noopener">{{ q.imageCredit.text }}</a></span>
              <span class="credit-sep">·</span>
              <a :href="q.imageCredit.licenseUrl" target="_blank" rel="noopener">{{ q.imageCredit.license }}</a>
            </template>
          </div>
        </section>

        <section class="lmq-q-card">
          <div class="q-kind">单选题 · 判读题</div>
          <h3 class="q-stem">{{ q.stem }}</h3>
          <div class="q-options">
            <button v-for="opt in q.options" :key="opt.key" type="button"
                    class="q-option" :class="{ picked: isSelected(q.id, opt.key) }"
                    @click="pick(q.id, opt.key)">
              <span class="opt-key">{{ opt.key }}</span>
              <span class="opt-text">{{ opt.text }}</span>
              <i v-if="isSelected(q.id, opt.key)" class="fa-solid fa-circle-check opt-check"></i>
            </button>
          </div>

          <div class="q-actions">
            <button class="btn" type="button" :disabled="current === 0" @click="current--">上一题</button>
            <span class="q-actions-right">
              <button v-if="current < total - 1" class="btn btn-primary" type="button" @click="current++">下一题</button>
              <button v-else class="btn btn-primary" type="button" :disabled="answeredCount < total" @click="onSubmit">
                提交答卷
              </button>
            </span>
          </div>
          <div v-if="current === total - 1 && answeredCount < total" class="q-note">
            还有 {{ total - answeredCount }} 题未作答，完成后再提交
          </div>
        </section>
      </div>
    </template>

    <!-- 成绩回顾态 -->
    <template v-else>
      <section class="lmr-hero">
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
        <div class="lmr-summary">
          <div class="lmr-sum-title">答对 {{ result.correctCount }} / {{ result.questionCount }} 题</div>
          <div class="lmr-sum-desc">逐题解析见下方。训练模式 · 可重新作答<template v-if="submittedAt"> · 提交于 {{ submittedAt }}</template></div>
          <div class="lmr-actions">
            <button class="btn" type="button" @click="onRetry">重新作答</button>
            <button class="btn btn-primary" type="button" @click="goList">返回列表</button>
          </div>
        </div>
      </section>

      <section class="lmr-list">
        <div v-for="(p, i) in result.perQuestion" :key="p.id" class="lmr-item" :class="p.correct ? 'ok' : 'bad'">
          <div class="lmr-item-head">
            <span class="lmr-idx">{{ i + 1 }}</span>
            <span class="lmr-mk">{{ p.correct ? '✓' : '✗' }}</span>
            <span class="lmr-stem">{{ p.stem }}</span>
          </div>
          <div class="lmr-item-body">
            <div class="lmr-thumb-wrap">
              <img :src="p.image" alt="">
              <div v-if="creditOf(p.id)" class="lmr-credit">
                来源：<a :href="creditOf(p.id).url" target="_blank" rel="noopener">{{ creditOf(p.id).text }}</a>
                · {{ creditOf(p.id).license }}
              </div>
            </div>
            <div class="lmr-item-right">
              <div class="lmr-ans">
                <span class="ans-tag">你的选择</span>
                <span class="ans-val" :class="p.correct ? 'ok' : 'bad'">{{ keysText(p.picked) }}</span>
                <span class="ans-tag">正确答案</span>
                <span class="ans-val ok">{{ keysText(p.answer) }}</span>
              </div>
              <div class="lmr-exp"><b>解析</b>{{ p.explanation }}</div>
            </div>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast, getCaseLevelLabel, LEVEL_TO_CASE_LEVEL } from '@ai-sp/shared'
import { getMorphSet } from '@ai-sp/shared/lab'
import { useMorphologySession } from '@/composables/useMorphologySession'

const route = useRoute()
const router = useRouter()

const morphSet = getMorphSet(route.params.setId)
const levelKey = computed(() => (morphSet ? LEVEL_TO_CASE_LEVEL[morphSet.level] || '' : ''))

if (!morphSet) {
  toast.show('未找到该判读题库', 'error')
  router.replace({ name: 'labMorphTrain' })
}

const { answers, result, submittedAt, pick, isSelected, submit, reset } =
  useMorphologySession(morphSet || { id: '', questions: [] })

const current = ref(0)
const total = computed(() => (morphSet ? morphSet.questions.length : 0))
const perScore = computed(() => (total.value ? 100 / total.value : 0))
const q = computed(() => morphSet.questions[current.value])
const answeredCount = computed(() =>
  morphSet.questions.filter(item => answers.value[item.id] && answers.value[item.id].length).length
)

const circumference = 2 * Math.PI * 56
const dash = computed(() => circumference * Math.max(0, Math.min(100, result.value.total)) / 100)
const gradeColor = computed(() => {
  const cls = result.value.grade.cls
  return cls === 'good' ? '#10b981' : cls === 'bad' ? '#ef4444' : '#f59e0b'
})

function keysText(keys) {
  return keys.length ? keys.join('、') : '未作答'
}

function creditOf(id) {
  const item = morphSet && morphSet.questions.find(x => x.id === id)
  return item ? item.imageCredit : null
}

function onSubmit() {
  if (answeredCount.value < total.value) {
    toast.show('请完成全部题目后再提交', 'warning')
    return
  }
  submit()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function onRetry() {
  reset()
  current.value = 0
}

function goList() {
  router.push({ name: 'labMorphTrain' })
}
</script>

<style scoped>
.lmq-page { max-width: 1280px; margin: 0 auto; padding: 18px 24px 48px; }
.lmq-top { display: flex; align-items: center; gap: 14px; margin-bottom: 14px; }
.back { border: 1px solid #e5e7eb; background: #fff; border-radius: 8px; height: 32px; padding: 0 12px; font-size: 12.5px; color: #4b5563; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; font-family: inherit; }
.back:hover { border-color: #cbd5e1; background: #f8fafc; }
.title-wrap { flex: 1; min-width: 0; }
.title-wrap h2 { margin: 0; font-size: 18px; font-weight: 800; color: #111827; }
.meta { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 5px; }
.chip { font-size: 11px; color: #6b7280; background: #f3f4f6; border-radius: 6px; padding: 2px 8px; }
.level-tag { font-size: 11.5px; padding: 3px 10px; border-radius: 999px; font-weight: 600; }
.level-tag.basic { background: #ecfdf5; color: #047857; }
.level-tag.advanced { background: #fffbeb; color: #b45309; }
.level-tag.difficult { background: #fef2f2; color: #b91c1c; }

.lmq-progress { display: flex; align-items: center; gap: 14px; background: #fff; border: 1px solid #ede9fe; border-radius: 10px; padding: 9px 14px; margin-bottom: 14px; }
.pg-label { font-size: 12.5px; font-weight: 700; color: #5b21b6; flex-shrink: 0; }
.pg-dots { display: flex; gap: 7px; flex: 1; }
.pg-dot { width: 26px; height: 26px; border-radius: 50%; border: 1.5px solid #ddd6fe; background: #fff; color: #7c3aed; font-size: 12px; cursor: pointer; font-family: inherit; transition: all .15s; }
.pg-dot.done { background: #ede9fe; border-color: #c4b5fd; }
.pg-dot.on { background: #7c3aed; border-color: #7c3aed; color: #fff; }
.pg-count { font-size: 11.5px; color: #9ca3af; flex-shrink: 0; }

.lmq-grid { display: grid; grid-template-columns: minmax(0, 1fr) 440px; gap: 16px; align-items: start; }
.lmq-image-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,.05); }
.lmq-image-card img { display: block; width: 100%; height: auto; background: #f8fafc; }
.lmq-caption { display: flex; flex-wrap: wrap; align-items: center; gap: 5px; padding: 9px 14px; font-size: 11.5px; color: #6b7280; border-top: 1px solid #f3f4f6; line-height: 1.6; }
.lmq-caption i { color: #a78bfa; }
.lmq-caption a { color: #7c3aed; text-decoration: none; }
.lmq-caption a:hover { text-decoration: underline; }
.credit-sep { color: #d1d5db; }
.lmr-thumb-wrap { min-width: 0; }
.lmr-credit { margin-top: 4px; font-size: 10.5px; color: #9ca3af; line-height: 1.5; }
.lmr-credit a { color: #7c3aed; text-decoration: none; }
.lmr-credit a:hover { text-decoration: underline; }

.lmq-q-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px 18px; box-shadow: 0 1px 3px rgba(0,0,0,.05); }
.q-kind { font-size: 11px; color: #7c3aed; background: #f5f3ff; display: inline-block; border-radius: 6px; padding: 2px 8px; }
.q-stem { margin: 10px 0 14px; font-size: 14.5px; font-weight: 700; line-height: 1.7; color: #111827; }
.q-options { display: flex; flex-direction: column; gap: 9px; }
.q-option { display: flex; align-items: flex-start; gap: 10px; text-align: left; border: 1.5px solid #e5e7eb; background: #fff; border-radius: 10px; padding: 10px 12px; cursor: pointer; font-family: inherit; font-size: 13px; color: #374151; line-height: 1.6; transition: all .12s; }
.q-option:hover { border-color: #c4b5fd; background: #faf9ff; }
.q-option.picked { border-color: #7c3aed; background: #f5f3ff; }
.opt-key { flex-shrink: 0; width: 22px; height: 22px; border-radius: 50%; background: #f3f4f6; color: #6b7280; font-size: 12px; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; }
.q-option.picked .opt-key { background: #7c3aed; color: #fff; }
.opt-text { flex: 1; }
.opt-check { color: #7c3aed; margin-top: 3px; }

.q-actions { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 16px; }
.q-actions .btn { font-family: inherit; cursor: pointer; }
.q-actions .btn:disabled { opacity: .5; cursor: not-allowed; }
.q-actions-right { display: flex; gap: 8px; }
.q-note { margin-top: 8px; font-size: 11.5px; color: #b45309; }

.lmr-hero { display: flex; align-items: center; gap: 26px; background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; padding: 20px 26px; box-shadow: 0 1px 3px rgba(0,0,0,.05); margin-bottom: 16px; }
.ring-wrap { display: flex; flex-direction: column; align-items: center; gap: 6px; }
.ring { position: relative; }
.ring-num { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.ring-num b { font-size: 32px; color: #111827; line-height: 1; }
.ring-num small { margin-top: 3px; font-size: 10.5px; color: #9ca3af; }
.grade { font-size: 12px; padding: 2px 12px; border-radius: 999px; font-weight: 700; }
.grade.good { background: #ecfdf5; color: #047857; }
.grade.mid { background: #fffbeb; color: #b45309; }
.grade.bad { background: #fef2f2; color: #b91c1c; }
.lmr-summary { flex: 1; }
.lmr-sum-title { font-size: 18px; font-weight: 800; color: #111827; }
.lmr-sum-desc { margin-top: 6px; font-size: 12px; color: #6b7280; }
.lmr-actions { display: flex; gap: 10px; margin-top: 14px; }
.lmr-actions .btn { font-family: inherit; cursor: pointer; }

.lmr-list { display: flex; flex-direction: column; gap: 12px; }
.lmr-item { background: #fff; border: 1px solid #e5e7eb; border-left: 4px solid #10b981; border-radius: 12px; padding: 14px 16px; }
.lmr-item.bad { border-left-color: #ef4444; }
.lmr-item-head { display: flex; align-items: baseline; gap: 8px; }
.lmr-idx { flex-shrink: 0; width: 22px; height: 22px; border-radius: 50%; background: #f3f4f6; color: #4b5563; font-size: 12px; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; }
.lmr-mk { font-weight: 800; color: #059669; }
.lmr-item.bad .lmr-mk { color: #dc2626; }
.lmr-stem { font-size: 13.5px; font-weight: 700; color: #111827; line-height: 1.65; }
.lmr-item-body { display: grid; grid-template-columns: 220px minmax(0, 1fr); gap: 16px; margin-top: 10px; }
.lmr-item-body img { width: 100%; border-radius: 8px; border: 1px solid #f0f2f5; }
.lmr-ans { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; font-size: 12.5px; }
.ans-tag { font-size: 11px; color: #6b7280; background: #f3f4f6; border-radius: 5px; padding: 1px 7px; }
.ans-val { font-weight: 700; }
.ans-val.ok { color: #059669; }
.ans-val.bad { color: #dc2626; }
.lmr-exp { margin-top: 9px; font-size: 12.5px; color: #4b5563; line-height: 1.8; background: #f8fafc; border-radius: 8px; padding: 9px 12px; }
.lmr-exp b { color: #111827; margin-right: 6px; }

@media (max-width: 1180px) {
  .lmq-grid { grid-template-columns: 1fr; }
  .lmr-item-body { grid-template-columns: 1fr; }
  .lmr-item-body img { max-width: 320px; }
}
</style>
