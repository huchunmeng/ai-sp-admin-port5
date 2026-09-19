<template>
  <div class="rwt-page">
    <!-- 顶部横幅 -->
    <div class="rwt-hero">
      <div class="rwt-hero-left">
        <h2><i class="fa-solid fa-graduation-cap"></i> 影像报告书写训练</h2>
        <p>自由挑病例，按 T0–T4 分阶段推进；卡住了可要三级提示，写完先自评再看参考报告</p>
      </div>
      <div class="rwt-hero-stats">
        <div class="rwt-stat"><strong>{{ cards.length }}</strong><span>可练病例</span></div>
        <div class="rwt-stat"><strong>{{ trainedCount }}</strong><span>已练过</span></div>
        <div class="rwt-stat"><strong>23</strong><span>评分条目</span></div>
      </div>
    </div>

    <!-- 继续上次 -->
    <div v-if="unfinished" class="rwt-resume">
      <i class="fa-solid fa-clock-rotate-left"></i>
      <span>继续上次：<b>{{ unfinished.title }}</b>（停在 {{ unfinished.stageName }}）</span>
      <button class="btn btn-primary btn-sm" @click="open(unfinished.sample)">继续</button>
    </div>

    <!-- 筛选栏 -->
    <div class="filter-bar">
      <div class="rwt-filter-left">
        <button v-for="p in BODY_PART_FILTERS" :key="p"
                class="rwt-filter-btn" :class="{ active: bodyPart === p }"
                @click="bodyPart = p">{{ p === '全部' ? '全部' : p }}</button>
      </div>
      <div class="rwt-filter-right">
        <select class="select" v-model="modality" style="width:110px">
          <option value="">全部模态</option>
          <option v-for="m in MODALITIES" :key="m" :value="m">{{ m }}</option>
        </select>
        <select class="select" v-model="level" style="width:150px">
          <option value="">全部难度</option>
          <option v-for="l in TRAINING_LEVELS" :key="l.value" :value="l.value">{{ l.value }} · {{ getCaseLevelLabel(l.value) }}</option>
        </select>
        <select class="select" v-model="practice" style="width:120px">
          <option value="">全部状态</option>
          <option value="untrained">未练过</option>
          <option value="trained">已练过</option>
        </select>
        <input class="input" v-model.trim="keyword" placeholder="搜索病例名称" style="width:180px">
        <span class="rwt-count">共 {{ grouped.length }} 例</span>
      </div>
    </div>

    <!-- 按检查部位分组 -->
    <div v-if="grouped.length" class="rwt-groups">
      <div v-for="g in grouped" :key="g.bodyPart" class="rwt-group">
        <div class="rwt-group-head">
          <span class="rwt-group-name">{{ g.bodyPart }}</span>
          <span class="rwt-group-count">{{ g.items.length }} 例</span>
        </div>
        <div class="case-grid">
          <div v-for="c in g.items" :key="c.id" class="rwt-card" @click="open(c.sample)">
            <div class="rwt-card-canvas">
              <i class="fa-solid" :class="c.sample.icon || 'fa-film'"></i>
              <span class="rwt-card-series">{{ c.seriesTotal }} 帧</span>
            </div>
            <div class="rwt-card-body">
              <div class="rwt-card-row1">
                <span class="rwt-card-title">{{ c.title }}</span>
                <span class="rwt-card-diff" :class="CASE_LEVEL_BADGE_CLASS[levelKey(c.level)]">{{ getCaseLevelLabel(c.level) }}</span>
              </div>
              <div class="rwt-card-meta">{{ c.bodyPart }} · {{ c.modality }} · {{ c.level }}</div>
              <div class="rwt-card-clinical">{{ c.clinical }}</div>
              <div class="rwt-card-foot">
                <span class="rwt-card-practice">
                  <template v-if="c.trainedRounds">已练 {{ c.trainedRounds }} 次<template v-if="c.lastAt"> · 最近 {{ c.lastAt.slice(5, 16) }}</template></template>
                  <template v-else>未练过</template>
                </span>
                <span class="rwt-card-go">开始训练 <i class="fa-solid fa-chevron-right"></i></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="empty-state">
      <i class="fa-solid fa-inbox"></i>
      <p>{{ cards.length ? '暂无匹配的影像病例' : '影像样本待院方提供' }}</p>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { TRAINING_LEVELS, getCaseLevelLabel, LEVEL_TO_CASE_LEVEL, CASE_LEVEL_BADGE_CLASS } from '@ai-sp/shared'
import { TRAINING_CASES, MODALITIES, BODY_PARTS, trainingCardOf } from '@ai-sp/shared/imaging'
import { readPracticeStats } from '@/composables/useReportSession'

const router = useRouter()

const bodyPart = ref('全部')
const modality = ref('')
const level = ref('')
const practice = ref('')
const keyword = ref('')

const BODY_PART_FILTERS = ['全部', ...BODY_PARTS]

const cards = computed(() => {
  const stats = readPracticeStats()
  return TRAINING_CASES.map(s => ({ ...trainingCardOf(s, stats[s.id]), sample: s }))
})

const levelKey = l => LEVEL_TO_CASE_LEVEL[l] || ''

const filtered = computed(() => {
  const kw = keyword.value.toLowerCase()
  return cards.value.filter(c => {
    if (bodyPart.value !== '全部' && c.bodyPart !== bodyPart.value) return false
    if (modality.value && c.modality !== modality.value) return false
    if (level.value && c.level !== level.value) return false
    if (practice.value === 'untrained' && c.trainedRounds > 0) return false
    if (practice.value === 'trained' && !c.trainedRounds) return false
    if (kw && !`${c.title} ${c.id} ${c.clinical}`.toLowerCase().includes(kw)) return false
    return true
  })
})

/** 按检查部位分组（PRD §5.3：默认按部位分组，组内按难度递增） */
const grouped = computed(() => {
  const order = BODY_PARTS
  const map = new Map()
  const sorted = filtered.value.slice().sort((a, b) => {
    if (a.bodyPart !== b.bodyPart) return order.indexOf(a.bodyPart) - order.indexOf(b.bodyPart)
    if (a.trainedRounds !== b.trainedRounds) return a.trainedRounds - b.trainedRounds
    return String(a.level).localeCompare(String(b.level))
  })
  sorted.forEach(c => {
    if (!map.has(c.bodyPart)) map.set(c.bodyPart, [])
    map.get(c.bodyPart).push(c)
  })
  return [...map.entries()].map(([bp, items]) => ({ bodyPart: bp, items }))
})

const trainedCount = computed(() => cards.value.filter(c => c.trainedRounds > 0).length)

/** 未完成草稿的断点（PRD §5.3 顶部条）——本地会话里 stageIndex 未到 T4 即算未完成 */
const unfinished = computed(() => {
  const raw = localStorage.getItem('report_writing_session_v1')
  if (!raw) return null
  let store
  try { store = JSON.parse(raw) } catch (e) { return null }
  const stageNames = ['T0 阅片', 'T1 检查技术', 'T2 影像所见', 'T3 诊断意见', 'T4 对照自评']
  for (const s of TRAINING_CASES) {
    const sess = store[s.id]
    if (!sess || sess.selfSubmitted) continue
    const touched = Object.values(sess.draft || {}).some(v => String(v).trim())
    if (!touched && !sess.viewNotes) continue
    return {
      sample: s,
      title: s.title,
      stageName: stageNames[sess.stageIndex] || 'T0 阅片'
    }
  }
  return null
})

function open(sample) {
  router.push({ name: 'reportWritingWorkbench', params: { caseId: sample.id } })
}
</script>

<style scoped>
.rwt-page { max-width: 1240px; margin: 0 auto; padding: 20px 24px 48px; }
.rwt-hero {
  display: flex; align-items: center; gap: 18px; flex-wrap: wrap;
  background: linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%);
  border: 1px solid #dbeafe; border-radius: 14px; padding: 20px 24px;
}
.rwt-hero-left { flex: 1; min-width: 240px; }
.rwt-hero-left h2 { margin: 0; font-size: 19px; font-weight: 800; color: #111827; font-family: 'SimHei','Heiti SC','Microsoft YaHei',sans-serif; }
.rwt-hero-left h2 i { color: var(--primary); margin-right: 6px; }
.rwt-hero-left p { margin: 6px 0 0; font-size: 12.5px; color: #4b5563; line-height: 1.7; }
.rwt-hero-stats { display: flex; gap: 22px; flex-shrink: 0; }
.rwt-stat { display: flex; flex-direction: column; align-items: center; }
.rwt-stat strong { font-size: 19px; color: var(--primary); }
.rwt-stat span { font-size: 11.5px; color: #6b7280; }

.rwt-resume {
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  margin-top: 14px; padding: 10px 16px; border-radius: 10px;
  background: #fffbeb; border: 1px solid #fef3c7; font-size: 12.5px; color: #92400e;
}
.rwt-resume .btn { margin-left: auto; }

.filter-bar { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin: 16px 0 14px; }
.rwt-filter-left { display: flex; gap: 6px; flex-wrap: wrap; }
.rwt-filter-btn {
  font-family: inherit; font-size: 12.5px; padding: 6px 14px; border-radius: 8px; cursor: pointer;
  border: 1px solid #e5e7eb; background: #fff; color: #6b7280; transition: all .15s;
}
.rwt-filter-btn:hover { border-color: var(--primary); color: var(--primary); }
.rwt-filter-btn.active { background: var(--primary); border-color: var(--primary); color: #fff; font-weight: 600; }
.rwt-filter-right { margin-left: auto; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.rwt-count { font-size: 12px; color: #9ca3af; }

.rwt-groups { display: flex; flex-direction: column; gap: 20px; }
.rwt-group-head { display: flex; align-items: baseline; gap: 8px; margin-bottom: 10px; }
.rwt-group-name { font-size: 14px; font-weight: 700; color: #374151; font-family: 'SimHei','Heiti SC','Microsoft YaHei',sans-serif; }
.rwt-group-name::before {
  content: ''; display: inline-block; width: 3px; height: 13px; background: var(--primary);
  border-radius: 2px; margin-right: 7px; vertical-align: -1px;
}
.rwt-group-count { font-size: 11.5px; color: #9ca3af; }

.rwt-card {
  background: #fff; border: 1px solid #f0f2f5; border-radius: 12px; overflow: hidden;
  cursor: pointer; transition: all .18s; box-shadow: 0 1px 3px rgba(0,0,0,.04);
  display: flex; flex-direction: column;
}
.rwt-card:hover { border-color: var(--primary); box-shadow: 0 6px 20px rgba(37,99,235,.1); transform: translateY(-2px); }
.rwt-card-canvas {
  height: 104px; position: relative;
  background: repeating-linear-gradient(45deg, #2b2f36, #2b2f36 10px, #31353d, #31353d 20px);
  color: #8b93a1; font-size: 26px;
  display: flex; align-items: center; justify-content: center;
}
.rwt-card-series {
  position: absolute; right: 8px; bottom: 8px; font-size: 10.5px; color: #cbd5e1;
  background: rgba(0,0,0,.4); padding: 2px 7px; border-radius: 6px;
}
.rwt-card-body { padding: 12px 14px 0; display: flex; flex-direction: column; flex: 1; }
.rwt-card-row1 { display: flex; align-items: flex-start; gap: 8px; }
.rwt-card-title { flex: 1; min-width: 0; font-size: 14px; font-weight: 700; color: #111827; line-height: 1.5; }
.rwt-card-diff { flex-shrink: 0; font-size: 11px; padding: 2px 8px; border-radius: 10px; font-weight: 500; }
.rwt-card-meta { font-size: 11.5px; color: #9ca3af; margin-top: 3px; }
.rwt-card-clinical {
  font-size: 12px; color: #6b7280; line-height: 1.75; margin-top: 7px; min-height: 42px;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.rwt-card-foot {
  display: flex; align-items: center; justify-content: space-between;
  margin-top: 10px; padding: 9px 0; border-top: 1px solid #f3f4f6; font-size: 11.5px;
}
.rwt-card-practice { color: #9ca3af; }
.rwt-card-go { color: var(--primary); font-weight: 600; }
</style>
