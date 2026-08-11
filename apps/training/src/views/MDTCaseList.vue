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
      <div class="filter-right">
        <input class="search-input" v-model.trim="keyword" placeholder="搜索病例名称 / 病历号 / 患者" />
        <span class="filter-count">共 {{ filteredCases.length }} 例</span>
      </div>
    </div>

    <!-- 病例卡片（字段对齐后管 MDT 病例编辑：名称/患者/学科/难度/来源） -->
    <div class="case-grid" v-if="!loading">
      <div class="case-card" v-for="c in filteredCases" :key="c.id" @click="viewDetail(c)">
        <div class="case-card-photo">
          <img v-if="patientAvatar(c)" :src="patientAvatar(c)" class="card-patient-img" />
          <span v-else class="photo-placeholder"><i class="fa-solid fa-user"></i></span>
        </div>
        <div class="case-card-body">
          <div class="cc-row cc-row-1">
            <span class="cc-name">{{ c.name || c.id }}</span>
            <span class="cc-diff" :class="'diff-' + levelClass(c.levelLabel)">{{ c.levelLabel }}</span>
          </div>
          <div class="cc-row cc-row-2">
            <span class="cc-id">{{ c.sourceRecordId || '手动创建' }}</span>
          </div>
          <div class="cc-row cc-row-3">
            <span>{{ c.patientName || '—' }}<template v-if="c.gender || c.age"> · {{ c.gender }}<template v-if="c.age"> · {{ c.age }}岁</template></template></span>
          </div>
          <div class="cc-row cc-row-4">
            <span class="cc-source" :class="'src-' + c.sourceType">{{ sourceLabel(c.sourceType) }}</span>
            <span class="cc-discipline-tag" v-for="d in c.disciplines" :key="d">
              <i :class="disciplineIcon(d)"></i> {{ d }}
            </span>
          </div>
        </div>
      </div>
      <div v-if="filteredCases.length === 0" class="empty-state">
        <i class="fa-solid fa-inbox"></i>
        <p>暂无匹配的 MDT 病例</p>
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
import { loadMDTCases, disciplineIcon } from '@/composables/useMDTData'
import { matchPatientImage } from '@/composables/usePatientImage'

const router = useRouter()
const loading = ref(true)
const activeFilter = ref('all')
const keyword = ref('')

// 单份入院摘要转换出记录的 8 份素材：绑定它们的 MDT 病例在列表中置后（稳定排序，仅整体后移）
const CONVERTED_SRC_IDS = new Set([
  'ZY010101453782', 'ZY010101478088', 'ZY010101620094', 'ZY010101602948',
  'ZY020101577826', 'ZY020101721441', 'ZY030101718668', 'ZY040101362766'
])

const filters = [
  { key: 'all', label: '全部' },
  { key: 'cardio', label: '心血管' },
  { key: 'respiratory', label: '呼吸' },
  { key: 'neuro', label: '神经' },
  { key: 'oncology', label: '肿瘤' },
  { key: 'endocrine', label: '内分泌' },
]

const SOURCE_META = {
  ai: { label: '系统内自建', cls: 'src-ai' },
  raw: { label: '基于原始病历', cls: 'src-raw' },
  manual: { label: '作者手动输入', cls: 'src-manual' },
}

const mdtCases = ref([])

const filteredCases = computed(() => {
  const kw = keyword.value.toLowerCase()
  return mdtCases.value.filter(c => {
    if (activeFilter.value !== 'all' && c.filterKey !== activeFilter.value) return false
    if (kw) {
      const hay = [c.name, c.id, c.sourceRecordId, c.patientName].filter(Boolean).join(' ').toLowerCase()
      if (!hay.includes(kw)) return false
    }
    return true
  })
})

function patientAvatar(c) {
  return matchPatientImage({ gender: c.gender, age: c.age }, 'patient')
}

function sourceLabel(t) {
  return (SOURCE_META[t] || SOURCE_META.manual).label
}

function levelClass(level) {
  if (level === '基础病例') return 'R'
  if (level === '高阶病例') return 'F'
  if (level === '疑难病例') return 'X'
  return 'R'
}

function viewDetail(c) {
  router.push({ name: 'caseDetail', params: { caseId: c.id }, query: { from: 'mdt', mdtId: c.id } })
}

async function load() {
  loading.value = true
  const list = await loadMDTCases()
  mdtCases.value = [...list].sort((a, b) =>
    (CONVERTED_SRC_IDS.has(a.sourceRecordId) ? 1 : 0) - (CONVERTED_SRC_IDS.has(b.sourceRecordId) ? 1 : 0)
  )
  loading.value = false
}

onMounted(load)
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
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
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
.filter-right { display: flex; align-items: center; gap: 12px; }
.search-input {
  width: 220px; box-sizing: border-box; padding: 7px 12px;
  border: 1px solid #e5e7eb; border-radius: 8px; font-size: 13px; font-family: inherit;
  color: #1f2937; outline: none;
}
.search-input:focus { border-color: #409EFF; box-shadow: 0 0 0 3px rgba(64, 158, 255, 0.15); }
.filter-count { font-size: 13px; color: #9ca3af; white-space: nowrap; }

/* ─── Case Grid（卡片形式） ─── */
.case-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 14px;
}
.case-card {
  display: flex; gap: 16px; padding: 18px; cursor: pointer;
  border-radius: 14px; border: 1px solid #e5e7eb;
  transition: all .2s; background: #fff;
  position: relative; overflow: hidden;
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
.cc-row-1 { gap: 6px; flex-wrap: wrap; }
.cc-name { font-size: 14px; font-weight: 600; color: #303133; }
.cc-diff {
  display: inline-block; font-size: 9px; font-weight: 600;
  padding: 0 5px; border-radius: 3px; line-height: 1.6; white-space: nowrap;
}
.diff-R { background: #e3f2fd; color: #1565c0; }
.diff-F { background: #e8f5e9; color: #2e7d32; }
.diff-X { background: #fce4ec; color: #c62828; font-weight: 700; }
.cc-row-2 {}
.cc-id { font-size: 10px; color: #999; }
.cc-row-3 { font-size: 11px; color: #666; }
.cc-row-4 { gap: 4px; flex-wrap: wrap; }
.cc-source {
  display: inline-block; font-size: 10px; font-weight: 600;
  padding: 1px 6px; border-radius: 4px; white-space: nowrap;
}
.src-ai { background: #e8eaf6; color: #3949ab; }
.src-raw { background: #e8f5e9; color: #2e7d32; }
.src-manual { background: #fff3e0; color: #e65100; }
.cc-discipline-tag {
  display: inline-flex; align-items: center; gap: 3px;
  font-size: 10px; padding: 1px 6px; border-radius: 4px;
  background: #ecf5ff; color: #1e40af; border: 1px solid #b3d8ff;
}
.cc-discipline-tag i { font-size: 10px; }

.empty-state {
  grid-column: 1 / -1;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 12px; padding: 60px 0; color: #9ca3af; font-size: 13px;
}
.empty-state i { font-size: 32px; }
.empty-state p { margin: 0; }

.loading-state { text-align: center; padding: 60px 0; color: #9ca3af; }
</style>
