<template>
  <div class="lmt-page">
    <div class="lmt-hero">
      <div class="lmt-hero-left">
        <h2><i class="fa-solid fa-microscope"></i> 形态学与图谱判读训练</h2>
        <p>看图辨认细胞形态、管型、病原体与图谱，选择作答，提交后即时判分并给出解析</p>
      </div>
      <div class="lmt-hero-stats">
        <div class="lmt-stat"><strong>{{ cards.length }}</strong><span>可练题库</span></div>
        <div class="lmt-stat"><strong>{{ trainedCount }}</strong><span>已练过</span></div>
        <div class="lmt-stat"><strong>{{ avgScore }}</strong><span>平均得分</span></div>
      </div>
    </div>

    <div class="case-grid">
      <div v-for="c in cards" :key="c.id" class="lmt-card" @click="open(c)">
        <div class="lmt-card-top">
          <span class="lmt-card-title">{{ c.title }}</span>
          <span class="case-level-badge" :class="levelKey(c.level)">{{ getCaseLevelLabel(c.level) }}</span>
        </div>
        <div class="lmt-chips">
          <span v-for="t in c.tags" :key="t" class="lmt-chip">{{ t }}</span>
          <span class="lmt-chip subtle">{{ c.questionCount }} 题</span>
        </div>
        <div class="lmt-desc">{{ c.desc }}</div>
        <div class="lmt-card-foot">
          <span class="lmt-practice">
            <template v-if="c.attempts">
              已练 {{ c.attempts }} 次
              <template v-if="c.bestScore != null"> · 最高 <b :class="scoreCls(c.bestScore)">{{ c.bestScore }}</b> 分</template>
            </template>
            <template v-else>未练过</template>
          </span>
          <span class="lmt-go">开始判读 <i class="fa-solid fa-chevron-right"></i></span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { getCaseLevelLabel, LEVEL_TO_CASE_LEVEL, CASE_LEVEL_BADGE_CLASS } from '@ai-sp/shared'
import { MORPH_SETS, morphCardOf } from '@ai-sp/shared/lab'
import { readMorphStats } from '@/composables/useMorphologySession'

const router = useRouter()

const stats = computed(() => readMorphStats())
const cards = computed(() => MORPH_SETS.map(s => morphCardOf(s, stats.value[s.id])))
const levelKey = l => CASE_LEVEL_BADGE_CLASS[LEVEL_TO_CASE_LEVEL[l] || ''] || ''

const trainedCount = computed(() => cards.value.filter(c => c.attempts > 0).length)
const avgScore = computed(() => {
  const scored = cards.value.filter(c => c.bestScore != null)
  if (!scored.length) return '—'
  return (scored.reduce((a, c) => a + c.bestScore, 0) / scored.length).toFixed(1)
})

function scoreCls(s) {
  return s >= 85 ? 'sc-good' : s >= 60 ? 'sc-mid' : 'sc-bad'
}

function open(c) {
  router.push({ name: 'labMorphQuiz', params: { setId: c.id } })
}
</script>

<style scoped>
.lmt-page { max-width: 1240px; margin: 0 auto; padding: 20px 24px 48px; }
.lmt-hero { display: flex; align-items: center; gap: 18px; flex-wrap: wrap; background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%); border: 1px solid #ddd6fe; border-radius: 14px; padding: 20px 24px; margin-bottom: 16px; }
.lmt-hero-left { flex: 1; min-width: 240px; }
.lmt-hero-left h2 { margin: 0; font-size: 19px; font-weight: 800; color: #111827; font-family: 'SimHei','Heiti SC','Microsoft YaHei',sans-serif; }
.lmt-hero-left h2 i { color: #7c3aed; margin-right: 6px; }
.lmt-hero-left p { margin: 6px 0 0; font-size: 12.5px; color: #4b5563; line-height: 1.7; }
.lmt-hero-stats { display: flex; gap: 26px; flex-shrink: 0; }
.lmt-stat { display: flex; flex-direction: column; align-items: center; }
.lmt-stat strong { font-size: 19px; color: #7c3aed; }
.lmt-stat span { font-size: 11.5px; color: #6b7280; }

.lmt-card { background: #fff; border: 1px solid #f0f2f5; border-radius: 12px; padding: 14px; cursor: pointer; transition: all .18s; box-shadow: 0 1px 3px rgba(0,0,0,.04); display: flex; flex-direction: column; }
.lmt-card:hover { border-color: #7c3aed; box-shadow: 0 6px 20px rgba(124,58,237,.12); transform: translateY(-2px); }
.lmt-card-top { display: flex; align-items: flex-start; gap: 8px; }
.lmt-card-title { flex: 1; min-width: 0; font-size: 14.5px; font-weight: 700; color: #111827; line-height: 1.5; }
.case-level-badge { flex-shrink: 0; font-size: 11px; padding: 2px 8px; border-radius: 10px; font-weight: 500; }
.case-level-badge.basic { background: #e8f5e9; color: #2e7d32; }
.case-level-badge.advanced { background: #fff3e0; color: #e65100; }
.case-level-badge.difficult { background: #fce4ec; color: #c62828; }

.lmt-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 9px; }
.lmt-chip { font-size: 11px; color: #6d28d9; background: #f5f3ff; border-radius: 6px; padding: 2px 8px; }
.lmt-chip.subtle { color: #6b7280; background: #f3f4f6; }
.lmt-desc { font-size: 12px; color: #6b7280; line-height: 1.75; margin-top: 9px; min-height: 42px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.lmt-card-foot { display: flex; align-items: center; justify-content: space-between; margin-top: 10px; padding-top: 9px; border-top: 1px solid #f3f4f6; font-size: 11.5px; }
.lmt-practice { color: #9ca3af; }
.lmt-go { color: #7c3aed; font-weight: 600; }
.sc-good { color: #059669; }
.sc-mid { color: #d97706; }
.sc-bad { color: #dc2626; }
</style>
