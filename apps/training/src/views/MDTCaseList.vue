<template>
  <div class="mdt-list-page">
    <!-- 顶部横幅 -->
    <div class="mdt-hero">
      <div class="hero-left">
        <h2><i class="fa-solid fa-users-between-lines"></i> MDT多学科讨论</h2>
        <p>选择病例，扮演多学科团队成员，展开协作讨论与临床决策</p>
      </div>
      <div class="hero-stats">
        <div class="hero-stat"><strong>{{ mdtCases.length }}</strong><span>可用病例</span></div>
        <div class="hero-stat"><strong>3-4</strong><span>学科/例</span></div>
        <div class="hero-stat"><strong>R1-R3</strong><span>难度范围</span></div>
      </div>
    </div>

    <!-- 筛选栏 -->
    <div class="filter-bar">
      <div class="filter-left">
        <button v-for="f in filters" :key="f.key" :class="['filter-btn', { active: activeFilter === f.key }]" @click="activeFilter = f.key">
          {{ f.label }}
        </button>
      </div>
      <span class="filter-count">共 {{ filteredCases.length }} 例</span>
    </div>

    <!-- 病例网格 -->
    <div class="case-grid" v-if="!loading">
      <div class="case-card" v-for="c in filteredCases" :key="c.id" @click="viewDetail(c)">
        <div class="case-card-photo">
          <img v-if="patientAvatar(c)" :src="patientAvatar(c)" class="card-patient-img" />
          <span v-else class="photo-placeholder"><i class="fa-solid fa-user"></i></span>
        </div>
        <div class="case-card-body">
          <div class="cc-row cc-row-1">
            <span class="cc-name">{{ c.patientName }}</span>
            <span class="cc-diff" :class="'diff-' + c.teachingPhase[0]">{{ c.levelLabel }}</span>
          </div>
          <div class="cc-row cc-row-2">
            <span class="cc-id">{{ c.id }}</span>
          </div>
          <div class="cc-row cc-row-3">
            <span>{{ c.gender }} · {{ c.age }}岁</span>
          </div>
          <div class="cc-row cc-row-4">
            <span class="cc-discipline-tag" v-for="d in c.disciplines" :key="d">
              <i :class="disciplineIcon(d)"></i> {{ d }}
            </span>
          </div>
          <div class="cc-row cc-row-6">
            <span class="cc-objective"><i class="fa-solid fa-bullseye"></i> {{ c.objective }}</span>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="loading-state">
      <i class="fa-solid fa-spinner fa-spin"></i> 加载中...
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { MDT_CASES, disciplineIcon } from '@/composables/useMDTData'
import { matchPatientImage } from '@/composables/usePatientImage'

const router = useRouter()
const loading = ref(false)
const activeFilter = ref('all')

const filters = [
  { key: 'all', label: '全部' },
  { key: 'cardio', label: '心血管' },
  { key: 'respiratory', label: '呼吸' },
  { key: 'neuro', label: '神经' },
  { key: 'oncology', label: '肿瘤' },
  { key: 'endocrine', label: '内分泌' },
]

const mdtCases = ref(MDT_CASES)

const filteredCases = computed(() => {
  if (activeFilter.value === 'all') return mdtCases.value
  return mdtCases.value.filter(c => c.filterKey === activeFilter.value)
})

function patientAvatar(c) {
  return matchPatientImage({ gender: c.gender, age: c.age }, 'patient')
}

function viewDetail(c) {
  router.push({ name: 'caseDetail', params: { caseId: c.realCaseId }, query: { from: 'mdt', mdtId: c.id } })
}

onMounted(() => { loading.value = false })
</script>

<style scoped>
.mdt-list-page { padding: 24px; max-width: 1100px; margin: 0 auto; }

/* ─── Hero ─── */
.mdt-hero {
  background: linear-gradient(135deg, #409EFF 0%, #337ECC 100%);
  color: #fff; border-radius: 14px; padding: 16px 28px;
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 20px;
}
.hero-left h2 { font-size: 17px; font-weight: 700; display: flex; align-items: center; gap: 10px; margin-bottom: 2px; }
.hero-left p { font-size: 12px; opacity: 0.85; }
.hero-stats { display: flex; gap: 32px; }
.hero-stat { text-align: center; }
.hero-stat strong { display: block; font-size: 18px; font-weight: 700; }
.hero-stat span { font-size: 11px; opacity: 0.75; }

/* ─── Filter ─── */
.filter-bar {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 16px;
}
.filter-left { display: flex; gap: 6px; flex-wrap: wrap; }
.filter-btn {
  padding: 6px 14px; border-radius: 8px; border: 1px solid #e5e7eb;
  background: #fff; cursor: pointer; font-size: 13px; font-family: inherit;
  color: #6b7280; transition: all .15s;
}
.filter-btn:hover { border-color: #409EFF; color: #409EFF; }
.filter-btn.active { background: #409EFF; color: #fff; border-color: #409EFF; }
.filter-count { font-size: 13px; color: #9ca3af; }

/* ─── Case Grid (align with SP CaseList) ─── */
.case-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 14px;
}
.case-card {
  display: flex; gap: 16px; padding: 18px; cursor: pointer;
  border-radius: 14px; border: 1px solid #e5e7eb;
  transition: all .2s; background: #fff;
}
.case-card:hover {
  box-shadow: 0 4px 16px rgba(0,0,0,0.08);
  border-color: #409EFF;
}
.case-card-photo { flex-shrink: 0; width: 108px; }
.case-card-photo img, .card-patient-img {
  border-radius: 50%; width: 108px; height: 108px; object-fit: cover; border: none; background: transparent;
}
.photo-placeholder {
  display: flex; align-items: center; justify-content: center;
  width: 108px; height: 108px; border-radius: 50%;
  background: #f5f7fa; color: #C0C4CC; font-size: 36px;
}
.case-card-body {
  flex: 1; min-width: 0;
  display: flex; flex-direction: column; gap: 4px; justify-content: center;
}
.cc-row { display: flex; align-items: center; }
.cc-row-1 { gap: 6px; }
.cc-name { font-size: 14px; font-weight: 600; color: #303133; }
.cc-diff {
  display: inline-block; font-size: 9px; font-weight: 600;
  padding: 0 5px; border-radius: 3px; line-height: 1.6;
}
.diff-R { background: #e3f2fd; color: #1565c0; }
.diff-F { background: #fce4ec; color: #c62828; font-weight: 700; }
.cc-row-2 {}
.cc-id { font-size: 10px; color: #999; }
.cc-row-3 { font-size: 11px; color: #666; }
.cc-row-4 { gap: 4px; flex-wrap: wrap; }
.cc-discipline-tag {
  display: inline-flex; align-items: center; gap: 3px;
  font-size: 10px; padding: 1px 6px; border-radius: 4px;
  background: #ecf5ff; color: #1e40af; border: 1px solid #b3d8ff;
}
.cc-row-5 { margin-top: 2px; }
.cc-complaint {
  font-size: 11px; color: #555; line-height: 1.4;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.cc-row-6 { margin-top: 2px; }
.cc-objective {
  font-size: 10px; color: #409EFF; line-height: 1.3;
  display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden;
}

.loading-state { text-align: center; padding: 60px 0; color: #9ca3af; }
</style>
