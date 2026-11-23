<template>
  <div class="lrt-page">
    <div class="lrt-hero">
      <div class="lrt-hero-left">
        <h2><i class="fa-solid fa-flask"></i> 检验报告解读训练</h2>
        <p>一张卡就是一次训练：读一份检验报告，写出你的解读，提交后由 AI 评价。既往记录与同期其他检查只作背景信息提供。</p>
      </div>
      <div class="lrt-hero-stats">
        <div class="lrt-stat"><strong>{{ cards.length }}</strong><span>可练报告</span></div>
        <div class="lrt-stat"><strong>{{ trainedCount }}</strong><span>已练过</span></div>
        <div class="lrt-stat"><strong>{{ avgScore }}</strong><span>平均得分</span></div>
      </div>
    </div>

    <div class="filter-bar lrt-filters">
      <input v-model.trim="keyword" class="input lrt-search" placeholder="搜索病例 / 患者 / 临床信息">
      <select v-model="reportType" class="select">
        <option value="">全部报告类型</option>
        <option v-for="t in reportTypeOptions" :key="t" :value="t">{{ t }}</option>
      </select>
      <select v-model="level" class="select">
        <option value="">全部难度</option>
        <option v-for="l in TRAINING_LEVELS" :key="l.value" :value="l.value">{{ l.value }} · {{ getCaseLevelLabel(l.value) }}</option>
      </select>
      <select v-model="practice" class="select">
        <option value="">全部状态</option>
        <option value="untrained">未练过</option>
        <option value="trained">已练过</option>
      </select>
      <span class="lrt-count">共 {{ filtered.length }} 份报告</span>
      <button v-if="filteredOn" class="lrt-reset" type="button" @click="resetFilters">重置</button>
    </div>

    <div v-if="filtered.length" class="case-grid">
      <div v-for="c in filtered" :key="c.key" class="lrt-card" @click="open(c)">
        <div class="lrt-card-top">
          <span class="lrt-report-name">{{ c.title }}</span>
          <span class="case-level-badge" :class="CASE_LEVEL_BADGE_CLASS[levelKey(c.level)]">{{ getCaseLevelLabel(c.level) }}</span>
        </div>
        <div class="lrt-case">{{ c.subTitle }} · {{ c.patient.name }}</div>
        <div class="lrt-chips">
          <span class="lrt-chip focus">{{ c.itemCount }} 项 · {{ c.abnText }}</span>
          <span class="lrt-chip subtle">{{ c.timeLabel }}</span>
          <span v-if="c.hasHistory" class="lrt-chip subtle">含既往记录</span>
          <span v-if="c.otherCount" class="lrt-chip subtle">{{ c.otherCount }} 项其他检查作背景</span>
        </div>
        <div class="lrt-clinical">{{ c.clinical }}</div>
        <div class="lrt-card-foot">
          <span class="lrt-practice">
            <template v-if="c.trainedRounds">
              已练 {{ c.trainedRounds }} 次
              <template v-if="c.lastScore != null"> · 最近 <b :class="scoreCls(c.lastScore)">{{ c.lastScore }}</b> 分</template>
            </template>
            <template v-else>未练过</template>
          </span>
          <span class="lrt-go">开始解读 <i class="fa-solid fa-chevron-right"></i></span>
        </div>
      </div>
    </div>

    <div v-else class="empty-state">
      <i class="fa-solid fa-inbox"></i>
      <p>{{ cards.length ? '暂无匹配的检验报告' : '检验报告题库待补充' }}</p>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { TRAINING_LEVELS, getCaseLevelLabel, LEVEL_TO_CASE_LEVEL, CASE_LEVEL_BADGE_CLASS } from '@ai-sp/shared'
import { LAB_REPORTS, labReportCardOf } from '@ai-sp/shared/lab'
import { readLabStats } from '@/composables/useLabReportSession'

const router = useRouter()

const keyword = ref('')
const reportType = ref('')
const level = ref('')
const practice = ref('')

const stats = computed(() => readLabStats())
/* 一张卡 = 一次训练 = 一个报告（批注5）；既往与其他报告都收进这张报告的背景里。
   改成按「病例#报告」记成绩之前，练习记录是按病例记的，这里回退读一次旧键，别把已练过的成绩弄丢。 */
const cards = computed(() => {
  const s = stats.value
  return LAB_REPORTS.map(r => {
    const c = labReportCardOf(r, s[r.key] || s[r.caseId])
    return { ...c, abnText: c.abnCount ? c.abnCount + ' 项异常' : '本次未见异常', sample: r }
  })
})

const reportTypeOptions = computed(() => [...new Set(LAB_REPORTS.map(r => r.typeLabel))])
const levelKey = l => LEVEL_TO_CASE_LEVEL[l] || ''

const filtered = computed(() => {
  const kw = keyword.value.toLowerCase()
  return cards.value.filter(c => {
    if (reportType.value && c.typeLabel !== reportType.value) return false
    if (level.value && c.level !== level.value) return false
    if (practice.value === 'untrained' && c.trainedRounds > 0) return false
    if (practice.value === 'trained' && !c.trainedRounds) return false
    if (kw && !`${c.subTitle} ${c.title} ${c.caseId} ${c.patient.name} ${c.clinical}`.toLowerCase().includes(kw)) return false
    return true
  })
})

const filteredOn = computed(() => keyword.value || reportType.value || level.value || practice.value)
function resetFilters() {
  keyword.value = ''; reportType.value = ''; level.value = ''; practice.value = ''
}

const trainedCount = computed(() => cards.value.filter(c => c.trainedRounds > 0).length)
const avgScore = computed(() => {
  const scored = cards.value.filter(c => c.lastScore != null)
  if (!scored.length) return '—'
  return (scored.reduce((a, c) => a + c.lastScore, 0) / scored.length).toFixed(1)
})

function scoreCls(s) {
  return s >= 85 ? 'sc-good' : s >= 60 ? 'sc-mid' : 'sc-bad'
}

function open(c) {
  router.push({ name: 'labReportWorkbench', params: { caseId: c.caseId, panelId: c.panelId } })
}
</script>

<style scoped>
.lrt-page { max-width: 1240px; margin: 0 auto; padding: 20px 24px 48px; }
.lrt-hero { display: flex; align-items: center; gap: 18px; flex-wrap: wrap; background: linear-gradient(135deg, #ecfeff 0%, #e0f2fe 100%); border: 1px solid #cffafe; border-radius: 14px; padding: 20px 24px; }
.lrt-hero-left { flex: 1; min-width: 240px; }
.lrt-hero-left h2 { margin: 0; font-size: 19px; font-weight: 800; color: #111827; font-family: 'SimHei','Heiti SC','Microsoft YaHei',sans-serif; }
.lrt-hero-left h2 i { color: #0891b2; margin-right: 6px; }
.lrt-hero-left p { margin: 6px 0 0; font-size: 12.5px; color: #4b5563; line-height: 1.7; }
.lrt-hero-stats { display: flex; gap: 26px; flex-shrink: 0; }
.lrt-stat { display: flex; flex-direction: column; align-items: center; }
.lrt-stat strong { font-size: 19px; color: #0891b2; }
.lrt-stat span { font-size: 11.5px; color: #6b7280; }

.lrt-filters { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin: 16px 0 14px; }
.lrt-filters .select { width: 160px; }
.lrt-search { width: 220px; }
.lrt-count { font-size: 12px; color: #9ca3af; margin-left: auto; }
.lrt-reset { font-family: inherit; font-size: 12px; color: #2563eb; background: none; border: none; cursor: pointer; padding: 2px 4px; }
.lrt-reset:hover { text-decoration: underline; }

.lrt-card { background: #fff; border: 1px solid #f0f2f5; border-radius: 12px; padding: 14px; cursor: pointer; transition: all .18s; box-shadow: 0 1px 3px rgba(0,0,0,.04); display: flex; flex-direction: column; }
.lrt-card:hover { border-color: #0891b2; box-shadow: 0 6px 20px rgba(8,145,178,.12); transform: translateY(-2px); }
.lrt-card-top { display: flex; align-items: flex-start; gap: 8px; }
.lrt-report-name { flex: 1; min-width: 0; font-size: 14.5px; font-weight: 700; color: #111827; line-height: 1.5; }
.case-level-badge { flex-shrink: 0; font-size: 11px; padding: 2px 8px; border-radius: 10px; font-weight: 500; }
.case-level-badge.basic { background: #e8f5e9; color: #2e7d32; }
.case-level-badge.advanced { background: #fff3e0; color: #e65100; }
.case-level-badge.difficult { background: #fce4ec; color: #c62828; }

.lrt-case { font-size: 12px; color: #4b5563; margin-top: 5px; }
.lrt-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 9px; }
.lrt-chip { font-size: 11px; color: #0e7490; background: #ecfeff; border-radius: 6px; padding: 2px 8px; }
.lrt-chip.focus { color: #b45309; background: #fffbeb; font-weight: 600; }
.lrt-chip.subtle { color: #6b7280; background: #f3f4f6; }
.lrt-clinical { font-size: 12px; color: #6b7280; line-height: 1.75; margin-top: 9px; min-height: 42px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.lrt-card-foot { display: flex; align-items: center; justify-content: space-between; margin-top: 10px; padding-top: 9px; border-top: 1px solid #f3f4f6; font-size: 11.5px; }
.lrt-practice { color: #9ca3af; }
.lrt-go { color: #0891b2; font-weight: 600; }
.sc-good { color: #059669; }
.sc-mid { color: #d97706; }
.sc-bad { color: #dc2626; }
</style>
