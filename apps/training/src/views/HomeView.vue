<template>
  <div class="home-page">
    <!-- ====== 左侧：学员信息 ====== -->
    <aside class="home-left">
      <div class="welcome-card">
        <div class="welcome-avatar">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
        </div>
        <div class="welcome-name">张梓墨</div>
        <div class="welcome-greeting">{{ greetingText }}，{{ encouragement }}</div>
        <div class="welcome-meta">
          <span class="streak-badge" v-if="streakDays > 0">
            <i class="fa-solid fa-fire"></i> 连续 {{ streakDays }} 天
          </span>
          <span class="date-display">{{ todayStr }}</span>
        </div>
      </div>

      <div class="stat-cards">
        <div class="stat-card" v-for="s in stats" :key="s.label">
          <div class="stat-icon" :style="{ background: s.bg, color: s.color }">
            <i :class="s.icon"></i>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ s.value }}</div>
            <div class="stat-label">{{ s.label }}</div>
          </div>
        </div>
      </div>

      <div class="radar-card">
        <div class="card-title"><i class="fa-solid fa-chart-pie"></i> 学习画像</div>
        <div class="radar-mini">
          <svg width="160" height="160" viewBox="0 0 280 280">
            <polygon points="140,30 239,100 215,228 65,228 41,100" fill="none" stroke="#e5e7eb" stroke-width="1"/>
            <polygon points="140,66 213,116 193,204 87,204 67,116" fill="none" stroke="#e5e7eb" stroke-width="1"/>
            <polygon points="140,102 187,132 171,180 109,180 93,132" fill="none" stroke="#e5e7eb" stroke-width="1"/>
            <line x1="140" y1="140" x2="140" y2="30" stroke="#e5e7eb" stroke-width="1"/>
            <line x1="140" y1="140" x2="239" y2="100" stroke="#e5e7eb" stroke-width="1"/>
            <line x1="140" y1="140" x2="215" y2="228" stroke="#e5e7eb" stroke-width="1"/>
            <line x1="140" y1="140" x2="65" y2="228" stroke="#e5e7eb" stroke-width="1"/>
            <line x1="140" y1="140" x2="41" y2="100" stroke="#e5e7eb" stroke-width="1"/>
            <polygon :points="radarPoints" fill="rgba(37,99,235,0.12)" stroke="#2563eb" stroke-width="2"/>
            <circle v-for="(p, i) in radarDots" :key="i" :cx="p.x" :cy="p.y" r="4" :fill="p.color"/>
            <text x="140" y="18" text-anchor="middle" font-size="11" fill="#1f2937" font-weight="600">问诊</text>
            <text x="250" y="102" text-anchor="start" font-size="11" fill="#1f2937" font-weight="600">诊断</text>
            <text x="222" y="248" text-anchor="start" font-size="11" fill="#1f2937" font-weight="600">查体</text>
            <text x="58" y="248" text-anchor="end" font-size="11" fill="#1f2937" font-weight="600">治疗</text>
            <text x="28" y="102" text-anchor="end" font-size="11" fill="#1f2937" font-weight="600">沟通</text>
          </svg>
        </div>
        <div class="radar-scores">
          <div v-for="d in dimensions" :key="d.label" class="radar-score-item">
            <span class="radar-score-dot" :style="{ background: d.score < 65 ? '#ef4444' : d.color }"></span>
            <span class="radar-score-label">{{ d.label }}</span>
            <span class="radar-score-val" :class="{ low: d.score < 65 }">{{ fmtScore(d.score) }}</span>
          </div>
        </div>
        <span class="radar-link" @click="goAdaptiveLearning">完整学习画像 →</span>
      </div>
    </aside>

    <!-- ====== 右侧 ====== -->
    <main class="home-right">
      <!-- 功能操作 -->
      <section class="zone-section zone-action">
        <div class="zone-header">
          <span class="zone-title"><i class="fa-solid fa-rocket"></i> 功能操作</span>
        </div>
        <div class="zone-body">
          <div class="quick-entries">
            <div class="entry-card entry-sp" @click="goCaseList">
              <div class="entry-card-top">
                <div class="entry-icon-wrapper" style="background: #eff6ff;">
                  <i class="fa-solid fa-stethoscope entry-icon" style="color: #2563eb;"></i>
                </div>
                <div class="entry-badge" style="background: #dbeafe; color: #1d4ed8;">{{ trainedCount }} 例已完成</div>
              </div>
              <div class="entry-info">
                <div class="entry-title">AI问诊训练</div>
                <div class="entry-desc">标准化病人对话实战</div>
              </div>
              <i class="fa-solid fa-chevron-right entry-arrow"></i>
            </div>
            <div class="entry-card entry-report" @click="goReportWriting">
              <div class="entry-card-top">
                <div class="entry-icon-wrapper" style="background: #eef2ff;">
                  <i class="fa-solid fa-file-pen entry-icon" style="color: #4f46e5;"></i>
                </div>
                <div class="entry-badge" style="background: #e0e7ff; color: #4338ca;">训练模式</div>
              </div>
              <div class="entry-info">
                <div class="entry-title">影像报告书写训练</div>
                <div class="entry-desc">边写边提示 · 金标准对照</div>
              </div>
              <i class="fa-solid fa-chevron-right entry-arrow"></i>
            </div>
            <div class="entry-card entry-mdt" @click="goMDT">
              <div class="entry-card-top">
                <div class="entry-icon-wrapper" style="background: #f0fdf4;">
                  <i class="fa-solid fa-users entry-icon" style="color: #059669;"></i>
                </div>
                <div class="entry-badge" style="background: #fef9c3; color: #a16207;">即将开放</div>
              </div>
              <div class="entry-info">
                <div class="entry-title">MDT多学科讨论</div>
                <div class="entry-desc">团队协作病例思辨</div>
              </div>
              <i class="fa-solid fa-chevron-right entry-arrow"></i>
            </div>
            <div class="entry-card entry-exam" @click="goExamCenter">
              <div class="entry-card-top">
                <div class="entry-icon-wrapper" style="background: #fef3c7;">
                  <i class="fa-solid fa-file-circle-check entry-icon" style="color: #d97706;"></i>
                </div>
                <div class="entry-badge" style="background: #f1f5f9; color: #475569;">考核模式</div>
              </div>
              <div class="entry-info">
                <div class="entry-title">在线考试</div>
                <div class="entry-desc">考核评价 · 三项考核</div>
              </div>
              <i class="fa-solid fa-chevron-right entry-arrow"></i>
            </div>
          </div>
        </div>
      </section>

      <!-- 名医名课研习（精品病例 + VR研习空间） -->
      <section class="zone-section zone-elite">
        <div class="zone-header">
          <span class="zone-title"><i class="fa-solid fa-graduation-cap"></i> 名医名课研习</span>
        </div>
        <div class="zone-body">
          <div class="elite-grid">
            <div class="elite-card elite-academician" @click="goAcademicianCases">
              <div class="elite-card-top">
                <div class="elite-icon-wrap" style="background:linear-gradient(135deg,#312e81,#4f46e5);">
                  <i class="fa-solid fa-chalkboard-user"></i>
                </div>
                <span class="elite-count">{{ academicianCount }} 例</span>
              </div>
              <div class="elite-card-body">
                <div class="elite-title">院士精讲病例</div>
                <div class="elite-desc">顶尖专家深度解析疑难罕见病例，传授临床思维精髓</div>
              </div>
              <i class="fa-solid fa-chevron-right elite-arrow"></i>
            </div>
            <div class="elite-card elite-mentor" @click="goMentorCases">
              <div class="elite-card-top">
                <div class="elite-icon-wrap" style="background:linear-gradient(135deg,#b45309,#f59e0b);">
                  <i class="fa-solid fa-medal"></i>
                </div>
                <span class="elite-count">{{ mentorCount }} 例</span>
              </div>
              <div class="elite-card-body">
                <div class="elite-title">金牌导师病例</div>
                <div class="elite-desc">一线临床名师手把手带教，覆盖常见病与多发病实战</div>
              </div>
              <i class="fa-solid fa-chevron-right elite-arrow"></i>
            </div>
            <div class="elite-card elite-national" @click="goNationalCenterCases">
              <div class="elite-card-top">
                <div class="elite-icon-wrap" style="background:linear-gradient(135deg,#991b1b,#dc2626);">
                  <i class="fa-solid fa-building-columns"></i>
                </div>
                <span class="elite-count">{{ nationalCenterCount ? nationalCenterCount + ' 例' : '建设中' }}</span>
              </div>
              <div class="elite-card-body">
                <div class="elite-title">国家级质控中心病例</div>
                <div class="elite-desc">依据国家医疗质控指标，汇集急危重症与重点病种典型案例，推动诊疗规范化</div>
              </div>
              <i class="fa-solid fa-chevron-right elite-arrow"></i>
            </div>
            <div class="elite-card elite-vr" @click="openVRLab">
              <div class="elite-card-top">
                <div class="elite-icon-wrap" style="background:linear-gradient(135deg,#0d9488,#14b8a6);">
                  <i class="fa-solid fa-vr-cardboard"></i>
                </div>
                <span class="elite-count">国家级一流课程</span>
              </div>
              <div class="elite-card-body">
                <div class="elite-title">VR研习空间</div>
                <div class="elite-desc">磁共振成像虚拟仿真 · VR脑解剖图谱教学</div>
              </div>
              <i class="fa-solid fa-arrow-up-right-from-square elite-arrow"></i>
            </div>
          </div>
          <div class="mooc-grid">
            <div class="mooc-card" v-for="m in MOOC_MODULES" :key="m.key" @click="goMoocModule(m.key)">
              <span class="mooc-bar" :style="{ background: m.color }"></span>
              <div class="mooc-card-top">
                <span class="mooc-icon" :style="{ background: m.gradient }">
                  <i class="fa-solid" :class="m.icon"></i>
                </span>
                <span class="mooc-count">{{ m.courses.length }} 门</span>
              </div>
              <div class="mooc-body">
                <div class="mooc-title">MOOC {{ m.title }}</div>
                <div class="mooc-course">{{ platformText(m) }}</div>
              </div>
              <i class="fa-solid fa-chevron-right mooc-arrow"></i>
            </div>
          </div>
        </div>
      </section>

      <!-- 为你推荐 -->
      <section class="zone-section zone-recommend">
        <div class="zone-header">
          <span class="zone-title"><i class="fa-solid fa-lightbulb"></i> 为你推荐</span>
          <span class="zone-link" @click="goCaseList">全部病例 →</span>
        </div>
        <div class="zone-body">
          <div class="spec-grid">
            <div v-for="s in specialtyEntries" :key="s.name" class="spec-card" @click="goCaseList">
              <div class="spec-card-icon" :style="{ background: s.bg, color: s.color }">
                <i class="fa-solid" :class="s.icon"></i>
              </div>
              <div class="spec-card-body">
                <div class="spec-card-title">{{ s.name }}病例学习</div>
                <div class="spec-card-count">{{ s.count }} 例可用</div>
              </div>
              <i class="fa-solid fa-chevron-right spec-card-arrow"></i>
            </div>
          </div>
        </div>
      </section>

      <div class="bottom-row">
      <!-- 学习记录 -->
      <section class="zone-section zone-records">
        <div class="zone-header">
          <span class="zone-title"><i class="fa-solid fa-clock-rotate-left"></i> 学习记录</span>
          <span class="zone-link" @click="goRecords">全部记录 →</span>
        </div>
        <div class="zone-body" v-if="recentRecords.length">
          <div class="record-row" v-for="r in recentRecords" :key="r.id" @click="goScoreReport(r)">
            <div class="record-photo">
              <img v-if="r.caseGender" :src="matchPatientImage({ gender: r.caseGender, age: parseInt(r.caseAge) || 30 }, 'patient')" class="record-patient-img" />
              <span v-else class="record-photo-placeholder"><i class="fa-solid fa-user"></i></span>
            </div>
            <div class="record-info">
              <div class="record-row-1">
                <span class="record-name">{{ r.casePatientName || r.caseId }}</span>
                <span v-if="r.caseSource && r.caseSource !== '平台'" class="record-source-tag" :class="'src-' + sourceClass(r.caseSource)">{{ r.caseSource }}病例</span>
                <span v-if="r.score" class="record-score" :class="scoreClass(r.score)">{{ fmtScore(r.score) }}分</span>
                <span v-else class="record-score pending">未评分</span>
              </div>
              <div class="record-row-2">
                <span class="record-caseid">{{ r.caseId }}</span>
                <span v-if="r.caseDifficulty" class="record-diff" :class="'diff-' + (r.caseDifficulty[0] || 'R')">{{ r.caseDifficulty }}</span>
                <span class="record-station">{{ r.stationName || getStationLabel(r.stationId) || '训练' }}</span>
              </div>
              <div class="record-row-3" v-if="r.caseGender || r.caseSpecialty">
                <span>{{ r.caseGender }} · {{ r.caseAge }}岁 · {{ r.caseSpecialty }}</span>
                <span class="record-date">{{ formatShortDate(r.recordedAt) }}</span>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="zone-body empty-records">
          <i class="fa-solid fa-inbox"></i>
          <p>还没有训练记录</p>
        </div>
      </section>

      <!-- 系统通知 -->
      <section class="zone-section zone-notify">
        <div class="zone-header">
          <span class="zone-title"><i class="fa-solid fa-bell"></i> 系统通知</span>
        </div>
        <div class="zone-body">
          <div class="notify-item" v-for="n in notifications" :key="n.id">
            <div class="notify-dot" :class="n.unread ? 'unread' : ''"></div>
            <div class="notify-content">
              <div class="notify-title">{{ n.title }}</div>
              <div class="notify-desc">{{ n.desc }}</div>
            </div>
            <span class="notify-time">{{ n.time }}</span>
          </div>
        </div>
      </section>
      </div>
    </main>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useTrainingStore } from '@/stores/training'
import { resolveAppUrls } from '@ai-sp/shared'
import { matchPatientImage } from '@/composables/usePatientImage'
import { fmtScore } from '@/composables/useUtils'
import { MENTOR_CATEGORIES } from '@/data/mentorCategories'
import { MOOC_MODULES } from '@/data/moocModules'

const router = useRouter()
const store = useTrainingStore()

const urls = resolveAppUrls()

const hour = new Date().getHours()
const greetingText = computed(() => {
  if (hour < 6) return '夜深了'
  if (hour < 9) return '早上好'
  if (hour < 12) return '上午好'
  if (hour < 14) return '中午好'
  if (hour < 18) return '下午好'
  return '晚上好'
})

const encouragements = [
  '诊断准确率持续提升，继续保持！',
  '每一次训练都在接近专家水平',
  '今天的努力是明天的诊断底气',
  '你已经比上周进步了许多',
  '台上一分钟，台下十年功',
]
const encouragement = computed(() => encouragements[Math.floor(Math.random() * encouragements.length)])

const todayStr = computed(() => {
  const d = new Date()
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
})

const streakDays = computed(() => {
  const records = store.getTrainingRecords()
  if (!records.length) return 0
  const dates = records.map(r => new Date(r.recordedAt).toDateString())
  const uniqueDates = [...new Set(dates)].sort().reverse()
  let streak = 0
  const today = new Date()
  for (let i = 0; i < uniqueDates.length; i++) {
    const d = new Date(uniqueDates[i])
    const expected = new Date(today)
    expected.setDate(expected.getDate() - i)
    if (d.toDateString() === expected.toDateString()) streak++
    else break
  }
  return streak
})

const allRecords = computed(() => store.getTrainingRecords())

const trainedCount = computed(() => {
  const ids = new Set(allRecords.value.map(r => r.caseId).filter(Boolean))
  return ids.size
})

const mdtCount = ref(3)

const avgScore = computed(() => {
  const scored = allRecords.value.filter(r => r.score)
  if (!scored.length) return 0
  return Math.round(scored.reduce((s, r) => s + r.score, 0) / scored.length)
})

const weeklyCount = computed(() => {
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  return allRecords.value.filter(r => new Date(r.recordedAt) >= weekAgo).length
})

const masteredCount = computed(() => {
  const scored = allRecords.value.filter(r => r.score && r.score >= 80)
  return new Set(scored.map(r => r.caseId)).size
})

const stats = computed(() => [
  { label: '累计训练', value: `${trainedCount.value} 例`, icon: 'fa-solid fa-book-medical', bg: '#eff6ff', color: '#2563eb' },
  { label: '综合得分', value: avgScore.value ? `${avgScore.value} 分` : '--', icon: 'fa-solid fa-chart-simple', bg: '#d1fae5', color: '#059669' },
  { label: '本周训练', value: `${weeklyCount.value} 次`, icon: 'fa-solid fa-calendar-check', bg: '#f0f0ff', color: '#7c3aed' },
  { label: '已掌握', value: `${masteredCount.value} 例`, icon: 'fa-solid fa-trophy', bg: '#fef3c7', color: '#d97706' },
])

const unfinishedFlow = ref(null)

const unfinishedAvatar = computed(() => {
  const f = unfinishedFlow.value
  if (!f || !f.casePatientGender) return ''
  const gender = f.casePatientGender
  const age = parseInt(f.casePatientAge) || 30
  return matchPatientImage({ gender, age }, 'patient')
})

function loadUnfinished() {
  const flow = store.loadActiveFlow()
  if (flow && flow.caseId) {
    const elapsed = Date.now() - new Date(flow.startedAt).getTime()
    if (elapsed > 24 * 60 * 60 * 1000) { store.clearActiveFlow(); return }
    let caseName = flow.caseName || ''
    if (!caseName) {
      const records = store.getTrainingRecords()
      const matched = records.find(r => r.caseId === flow.caseId && r.caseName)
      if (matched) caseName = matched.caseName
    }
    unfinishedFlow.value = {
      caseId: flow.caseId,
      casePatientName: caseName || flow.caseId,
      caseDisease: flow.caseDisease || '',
      caseSpecialty: flow.caseSpecialty || '',
      caseDifficulty: flow.caseDifficulty || '',
      caseChiefComplaint: flow.caseChiefComplaint || '',
      casePatientGender: flow.casePatientGender || '',
      casePatientAge: flow.casePatientAge || '',
      casePatientAvatar: flow.casePatientAvatar || '',
      caseSymptoms: flow.caseSymptoms || [],
      stationName: flow.currentStationId,
      stationLabel: getStationLabel(flow.currentStationId),
      startedAt: flow.startedAt,
      progress: flow.stationFlow ? `${flow.stationFlow.currentIndex + 1}/${flow.stationFlow.stations.length} 考站` : '',
    }
  }
}

const stationLabelMap = {
  historyTaking: '病史采集', physicalExam: '体格检查', ancillaryTests: '辅助检查',
  diagnosis: '诊断', treatmentPlan: '治疗计划', medicalRecord: '病历书写',
  caseAnalysis: '病例分析', humanisticComm: '人文沟通', mentalExam: '精神检查',
}

function getStationLabel(id) {
  return stationLabelMap[id] || id || ''
}

function continueTraining() {
  if (!unfinishedFlow.value) return
  const caseId = unfinishedFlow.value.caseId
  const stationName = unfinishedFlow.value.stationName
  if (stationName) {
    router.push({ name: stationName })
  } else {
    store.setSpecialty('')
    router.push({ name: 'caseDetail', params: { caseId } })
  }
}

function resetAndNew() {
  store.clearActiveFlow()
  store.clearSession()
  unfinishedFlow.value = null
  router.push({ name: 'caseList' })
}

function goCaseList() {
  router.push({ name: 'caseList' })
}

function goMDT() {
  router.push({ name: 'mdtCaseList' })
}

function goExamCenter() {
  router.push({ name: 'examCenter' })
}

function goReportWriting() {
  router.push({ name: 'reportWritingTrain' })
}

// 角标 = 各分类下导师病例示例总数
function sumMentorCases(cat) {
  return cat.mentors.reduce((s, m) => s + (m.cases || []).length, 0)
}
const academicianCount = ref(sumMentorCases(MENTOR_CATEGORIES.academician))
const mentorCount = ref(sumMentorCases(MENTOR_CATEGORIES.mentor))
const nationalCenterCount = ref(
  (MENTOR_CATEGORIES.national.centers || []).reduce((s, ct) => s + (ct.cases || []).length, 0)
)

function goAcademicianCases() {
  router.push({ name: 'mentorCases', params: { category: 'academician' } })
}

function goMentorCases() {
  router.push({ name: 'mentorCases', params: { category: 'mentor' } })
}

function goNationalCenterCases() {
  router.push({ name: 'mentorCases', params: { category: 'national' } })
}

function goAdaptiveLearning() {
  router.push({ name: 'adaptiveLearning' })
}

function openVRLab() {
  router.push({ name: 'vrLab' })
}

function goMoocModule(key) {
  router.push({ name: 'moocModule', params: { module: key } })
}

// 模块卡副标题：课程平台（去重、去掉 SPOC 后缀）；课程门数移到卡片右上角标
function platformText(m) {
  const names = [...new Set(m.courses.map(c => c.platform.split(' · ')[0]))]
  return names.join(' / ')
}

function goRecords() {
  router.push({ name: 'caseList' })
}

function sourceClass(src) {
  if (src === '院士精讲') return 'academician'
  if (src === '金牌导师') return 'mentor'
  if (src === '国家级质控中心' || src === '国家综合介入技术质控中心' || src === '国家重症医学质控中心') return 'national'
  return ''
}

function goScoreReport(record) {
  if (record.caseId) {
    store.currentCase = { id: record.caseId, patient: { name: record.casePatientName || record.caseId } }
  }
  router.push({ name: 'scoreReport' })
}

const dimensions = ref([
  { label: '问诊', score: 75, color: '#2563eb' },
  { label: '诊断', score: 62, color: '#ef4444' },
  { label: '查体', score: 68, color: '#2563eb' },
  { label: '治疗', score: 80, color: '#10b981' },
  { label: '沟通', score: 72, color: '#2563eb' },
])

const radarPoints = computed(() => {
  const cx = 140, cy = 140, r = 113
  const angles = [-90, -18, 54, 126, 198].map(a => a * Math.PI / 180)
  const scores = dimensions.value.map(d => d.score / 100)
  return angles.map((a, i) => {
    const x = cx + r * scores[i] * Math.cos(a)
    const y = cy + r * scores[i] * Math.sin(a)
    return `${x.toFixed(0)},${y.toFixed(0)}`
  }).join(' ')
})

const radarDots = computed(() => {
  const cx = 140, cy = 140, r = 113
  const angles = [-90, -18, 54, 126, 198].map(a => a * Math.PI / 180)
  return dimensions.value.map((d, i) => ({
    x: (cx + r * (d.score / 100) * Math.cos(angles[i])).toFixed(0),
    y: (cy + r * (d.score / 100) * Math.sin(angles[i])).toFixed(0),
    color: d.score < 65 ? '#ef4444' : '#2563eb',
  }))
})

const recommendations = ref([
  { patientName: '周伯通', disease: '心衰合并肾功能不全', caseId: 'CARD-20260715-M2N7', difficulty: 'R2', gender: '男', age: '68', specialtyGroup: '内科', specialty: '心血管内科', symptoms: ['呼吸困难', '下肢水肿', '少尿'], chiefComplaint: '反复胸闷气喘2月，加重伴夜间不能平卧1周', reason: '鉴别诊断维度得分偏低，推荐强化心血管鉴别能力', source: '院士精讲' },
  { patientName: '孙晓芳', disease: '间质性肺病鉴别诊断', caseId: 'RESP-20260710-K9P3', difficulty: 'R3', gender: '女', age: '55', specialtyGroup: '内科', specialty: '呼吸内科', symptoms: ['干咳', '活动后气促', 'Velcro啰音'], chiefComplaint: '进行性呼吸困难伴干咳3月', reason: '肺部听诊遗漏率偏高，推荐加强胸部影像判读', source: '金牌导师' },
  { patientName: '赵秀兰', disease: '社区获得性肺炎', caseId: 'RESP-20260602-B5Y1', difficulty: 'U2', gender: '女', age: '45', specialtyGroup: '内科', specialty: '呼吸内科', symptoms: ['发热', '咳嗽', '咳痰', '胸痛'], chiefComplaint: '发热、咳嗽、咳痰5天，加重伴胸痛1天', reason: '基础病例巩固，抗生素选择思路校准', source: '国家级质控中心' },
  { patientName: '钱志强', disease: '肝硬化失代偿期', caseId: 'GAST-20260620-D4L8', difficulty: 'R2', gender: '男', age: '58', specialtyGroup: '内科', specialty: '消化内科', symptoms: ['腹胀', '黄疸', '腹水'], chiefComplaint: '腹胀纳差3月，加重伴皮肤黄染2周', reason: '肝功能分级判读不熟，推荐强化肝硬化并发症处理', source: '金牌导师' },
  { patientName: '陈国强', disease: '急性阑尾炎', caseId: 'GS-20260605-Q7W2', difficulty: 'U1', gender: '男', age: '32', specialtyGroup: '外科', specialty: '普通外科', symptoms: ['转移性右下腹痛', '发热', '反跳痛'], chiefComplaint: '转移性右下腹痛12小时', reason: '急腹症鉴别思路建立，外科基础病例入门', source: '国家级质控中心' },
  { patientName: '林建华', disease: '胆囊结石伴急性胆囊炎', caseId: 'GS-20260612-T3H9', difficulty: 'R1', gender: '男', age: '56', specialtyGroup: '外科', specialty: '普通外科', symptoms: ['右上腹痛', '墨菲征阳性', '恶心'], chiefComplaint: '进食油腻后右上腹绞痛6小时', reason: '手术指征把握不稳，推荐强化胆道急症决策', source: '院士精讲' },
  { patientName: '吴淑芬', disease: '异位妊娠破裂', caseId: 'OBGY-20260701-V8R4', difficulty: 'R2', gender: '女', age: '28', specialtyGroup: '妇产科', specialty: '妇科', symptoms: ['突发下腹痛', '停经', '阴道流血'], chiefComplaint: '停经45天，突发下腹剧痛伴头晕2小时', reason: '育龄女性急腹症漏诊风险高，推荐优先强化', source: '国家级质控中心' },
  { patientName: '王小宝', disease: '支气管肺炎', caseId: 'PED-20260609-F2N6', difficulty: 'U1', gender: '男', age: '4', specialtyGroup: '儿科', specialty: '儿科', symptoms: ['发热', '咳嗽', '气促'], chiefComplaint: '发热咳嗽3天，气促1天', reason: '儿科问诊与家属沟通待加强，推荐基础病例', source: '金牌导师' },
  { patientName: '郑海涛', disease: '急性有机磷中毒', caseId: 'EM-20260618-Y5K1', difficulty: 'R2', gender: '男', age: '45', specialtyGroup: '急诊科', specialty: '急诊医学科', symptoms: ['瞳孔缩小', '大汗', '肌颤'], chiefComplaint: '喷洒农药后恶心呕吐伴大汗3小时', reason: '解毒剂剂量计算易错，推荐强化急危重症处置', source: '院士精讲' },
  { patientName: '张明辉', disease: '抑郁障碍伴自杀意念', caseId: 'PSY-20260625-C9M3', difficulty: 'R2', gender: '男', age: '34', specialtyGroup: '精神科', specialty: '临床心理科', symptoms: ['情绪低落', '兴趣减退', '失眠'], chiefComplaint: '情绪低落伴兴趣减退半年，加重2周', reason: '自杀风险评估欠缺，推荐强化精神科危机干预', source: '国家级质控中心' },
  { patientName: '何秀英', disease: '寻常型银屑病', caseId: 'DERM-20260615-X4B7', difficulty: 'U2', gender: '女', age: '41', specialtyGroup: '皮肤科', specialty: '皮肤科', symptoms: ['红斑', '鳞屑', 'Auspitz征阳性'], chiefComplaint: '四肢反复红斑鳞屑5年，冬季加重', reason: '皮损描述不完整，推荐强化皮肤科查体规范', source: '金牌导师' },
  { patientName: '马俊杰', disease: '腰椎间盘突出症', caseId: 'ORT-20260608-G6P2', difficulty: 'R1', gender: '男', age: '47', specialtyGroup: '骨科', specialty: '脊柱外科', symptoms: ['腰痛', '下肢放射痛', '直腿抬高试验阳性'], chiefComplaint: '腰痛伴右下肢放射痛3月，加重1周', reason: '神经定位体征判读待加强，推荐骨科专科查体训练', source: '国家级质控中心' },
  { patientName: '沈玉琴', disease: '急性脑梗死静脉溶栓', caseId: 'NEURO-20260628-N1Z5', difficulty: 'R3', gender: '女', age: '67', specialtyGroup: '神经内科', specialty: '神经内科', symptoms: ['偏瘫', '言语含糊', '口角歪斜'], chiefComplaint: '突发右侧肢体无力伴言语不清2小时', reason: '溶栓时间窗把握不足，推荐强化卒中绿色通道决策', source: '院士精讲' },
  { patientName: '罗文博', disease: '肺结节良恶性鉴别', caseId: 'RAD-20260705-J3S8', difficulty: 'R2', gender: '男', age: '52', specialtyGroup: '影像科', specialty: '放射科', symptoms: ['体检发现肺结节', '无咳嗽', '无咯血'], chiefComplaint: '体检胸部CT发现右肺结节1周', reason: '影像征象判读经验不足，推荐强化肺结节分级评估', source: '院士精讲' },
  { patientName: '潘晓峰', disease: '肝脏占位性病变鉴别', caseId: 'RAD-20260712-A7E4', difficulty: 'R3', gender: '男', age: '60', specialtyGroup: '影像科', specialty: '超声科', symptoms: ['右上腹隐痛', '肝区叩击痛', 'AFP升高'], chiefComplaint: '体检超声发现肝占位3天', reason: '多模态影像综合判读待提升，推荐影像科进阶病例', source: '金牌导师' },
])

// 科室入口：影像科置顶，其余按下列顺序排列
const SPECIALTY_ORDER = ['影像科', '内科', '外科', '妇产科', '儿科', '急诊科', '精神科', '皮肤科', '骨科', '神经内科']
const SPECIALTY_META = {
  '影像科': { icon: 'fa-x-ray', color: '#4f46e5', bg: '#eef2ff' },
  '内科': { icon: 'fa-stethoscope', color: '#2563eb', bg: '#eff6ff' },
  '外科': { icon: 'fa-syringe', color: '#dc2626', bg: '#fef2f2' },
  '妇产科': { icon: 'fa-baby', color: '#db2777', bg: '#fdf2f8' },
  '儿科': { icon: 'fa-child', color: '#16a34a', bg: '#f0fdf4' },
  '急诊科': { icon: 'fa-truck-medical', color: '#ea580c', bg: '#fff7ed' },
  '精神科': { icon: 'fa-brain', color: '#7c3aed', bg: '#f5f3ff' },
  '皮肤科': { icon: 'fa-disease', color: '#ca8a04', bg: '#fefce8' },
  '骨科': { icon: 'fa-bone', color: '#0d9488', bg: '#f0fdfa' },
  '神经内科': { icon: 'fa-wave-square', color: '#0891b2', bg: '#ecfeff' },
}

const specialtyEntries = computed(() => {
  const counts = {}
  recommendations.value.forEach(r => {
    if (!r.specialtyGroup) return
    counts[r.specialtyGroup] = (counts[r.specialtyGroup] || 0) + 1
  })
  return SPECIALTY_ORDER.filter(name => counts[name]).map(name => ({
    name,
    count: counts[name],
    ...(SPECIALTY_META[name] || { icon: 'fa-folder-open', color: '#64748b', bg: '#f8fafc' }),
  }))
})

const recentRecords = computed(() => {
  const raw = allRecords.value.slice(0, 5)
  return raw.map(r => ({
    id: r.id,
    caseId: r.caseId,
    casePatientName: r.casePatientName || r.caseName || '',
    caseDisease: r.caseDisease || '',
    caseGender: r.caseGender || '',
    caseAge: r.caseAge || '',
    caseSpecialty: r.caseSpecialty || '',
    caseDifficulty: r.caseDifficulty || '',
    caseChiefComplaint: r.caseChiefComplaint || '',
    caseSymptoms: r.caseSymptoms || [],
    caseSource: r.caseSource || '',
    stationId: r.stationId,
    stationName: r.stationName || getStationLabel(r.stationId),
    score: r.score,
    recordedAt: r.recordedAt,
  }))
})

// ─── 系统通知 ───
const notifications = ref([
  { id: 1, title: '系统升级通知', desc: '医路慧影平台v2.0已上线，新增MDT多学科讨论模块，点击体验', time: '07-20', unread: true },
  { id: 2, title: '新病例上线', desc: '心血管内科新增3例F1级疑难病例，涵盖心衰、心梗等急重症场景', time: '07-18', unread: true },
  { id: 3, title: '考核提醒', desc: '本月住培考核将于7月28日进行，请提前完成模拟训练', time: '07-15', unread: false },
])

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function formatShortDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function scoreClass(s) {
  if (s >= 80) return 'score-good'
  if (s >= 60) return 'score-ok'
  return 'score-low'
}

const caseMetaMap = {
  'IM-20260527-A9GW': { patientName: '王丽', gender: '女', age: '36', specialty: '内分泌科', difficulty: 'R2', disease: 'Graves病', symptoms: ['心悸', '多汗', '体重下降'], chiefComplaint: '心悸、多汗、体重下降3月', source: '院士精讲' },
  'IM-20260416-K4G7': { patientName: '张德明', gender: '男', age: '62', specialty: '心血管内科', difficulty: 'R3', disease: '急性心肌梗死', symptoms: ['胸痛', '大汗', '呼吸困难'], chiefComplaint: '突发胸痛伴大汗2小时', source: '金牌导师' },
  'NEURO-20260515-P3X8': { patientName: '李广富', gender: '男', age: '71', specialty: '神经内科', difficulty: 'F1', disease: '急性缺血性脑卒中', symptoms: ['言语不清', '右侧肢体无力', '口角歪斜'], chiefComplaint: '突发言语不清伴右侧肢体无力1.5小时', source: '国家级质控中心' },
  'RESP-20260602-B5Y1': { patientName: '赵秀兰', gender: '女', age: '45', specialty: '呼吸内科', difficulty: 'U2', disease: '社区获得性肺炎', symptoms: ['发热', '咳嗽', '咳痰', '胸痛'], chiefComplaint: '发热、咳嗽、咳痰5天，加重伴胸痛1天', source: '院士精讲' },
  'GI-20260701-C2M3': { patientName: '刘建国', gender: '男', age: '55', specialty: '消化内科', difficulty: 'R2', disease: '上消化道出血', symptoms: ['黑便', '呕血', '上腹痛'], chiefComplaint: '反复黑便3天，呕血1次', source: '金牌导师' },
  'DERM-20260416-K4G7': { patientName: '陈小雅', gender: '女', age: '28', specialty: '皮肤科', difficulty: 'R1', disease: '寻常型银屑病', symptoms: ['红斑', '鳞屑', '瘙痒'], chiefComplaint: '全身红斑鳞屑伴瘙痒2年，加重1月', source: '国家级质控中心' },
}

function makeRecord(entry) {
  const ts = Date.now() - entry.daysAgo * 86400000
  const meta = caseMetaMap[entry.caseId] || {}
  return {
    caseId: entry.caseId, stationId: entry.stationId, stationName: entry.stationName,
    score: entry.score, duration: entry.duration, recordedAt: new Date(ts).toISOString(),
    ts, sessionEpoch: ts, trainingVersion: '2.0',
    casePatientName: meta.patientName || entry.caseName || '', caseDisease: meta.disease || entry.caseName || '',
    caseGender: meta.gender || '', caseAge: meta.age || '', caseSpecialty: meta.specialty || '',
    caseDifficulty: meta.difficulty || '', caseSymptoms: meta.symptoms || [], caseChiefComplaint: meta.chiefComplaint || '',
    caseSource: meta.source || '',
  }
}

function seedDemoRecords() {
  const RECORDS_KEY = 'training_records'
  const VERSION_KEY = 'training_records_version'
  const DEMO_VERSION = '2'
  try {
    const ver = localStorage.getItem(VERSION_KEY)
    if (ver === DEMO_VERSION) {
      const existing = localStorage.getItem(RECORDS_KEY)
      if (existing) {
        const parsed = JSON.parse(existing)
        if (Object.keys(parsed).length > 0) return
      }
    }
  } catch (e) { /* ignore */ }

  const entries = [
    { caseId: 'IM-20260527-A9GW', stationId: 'historyTaking', stationName: '病史采集', score: 78, duration: 720, daysAgo: 2, caseName: 'Graves病' },
    { caseId: 'IM-20260527-A9GW', stationId: 'physicalExam', stationName: '体格检查', score: 85, duration: 540, daysAgo: 2, caseName: 'Graves病' },
    { caseId: 'IM-20260416-K4G7', stationId: 'historyTaking', stationName: '病史采集', score: 82, duration: 680, daysAgo: 3, caseName: '急性心肌梗死' },
    { caseId: 'NEURO-20260515-P3X8', stationId: 'diagnosis', stationName: '诊断', score: 62, duration: 510, daysAgo: 4, caseName: '急性缺血性脑卒中' },
    { caseId: 'RESP-20260602-B5Y1', stationId: 'historyTaking', stationName: '病史采集', score: 90, duration: 600, daysAgo: 5, caseName: '社区获得性肺炎' },
    { caseId: 'GI-20260701-C2M3', stationId: 'treatmentPlan', stationName: '治疗计划', score: 75, duration: 560, daysAgo: 6, caseName: '上消化道出血' },
    { caseId: 'DERM-20260416-K4G7', stationId: 'diagnosis', stationName: '诊断', score: 68, duration: 480, daysAgo: 1, caseName: '寻常型银屑病' },
    { caseId: 'IM-20260416-K4G7', stationId: 'ancillaryTests', stationName: '辅助检查', score: 72, duration: 420, daysAgo: 1, caseName: '急性心肌梗死' },
  ]

  const demoRecords = {}
  entries.forEach(e => {
    const record = makeRecord(e)
    const key = record.caseId + '_' + record.stationId + '_' + record.ts
    demoRecords[key] = record
  })

  try {
    localStorage.setItem(RECORDS_KEY, JSON.stringify(demoRecords))
    localStorage.setItem(VERSION_KEY, DEMO_VERSION)
  } catch (e) { /* ignore */ }
}

function seedDemoActiveFlow() {
  const FLOW_KEY = 'active-training-flow'
  const VERSION_KEY = 'active_flow_version'
  const DEMO_VERSION = '2'
  try {
    const ver = localStorage.getItem(VERSION_KEY)
    if (ver === DEMO_VERSION) {
      const existing = localStorage.getItem(FLOW_KEY)
      if (existing) {
        const parsed = JSON.parse(existing)
        if (parsed && parsed.caseId) return
      }
    }
  } catch (e) { /* ignore */ }
  const flow = {
    caseId: 'RESP-20260602-B5Y1',
    caseName: '赵秀兰',
    caseDisease: '社区获得性肺炎',
    caseSpecialty: '呼吸内科',
    caseDifficulty: 'R2',
    caseChiefComplaint: '发热、咳嗽、咳痰5天，加重伴胸痛1天',
    casePatientGender: '女',
    casePatientAge: '45',
    casePatientAvatar: '',
    caseSymptoms: ['发热', '咳嗽', '咳痰', '胸痛'],
    stationFlow: { stations: [{ name: 'historyTaking' }, { name: 'physicalExam' }, { name: 'ancillaryTests' }], currentIndex: 1 },
    stationScheme: null,
    currentStationId: 'physicalExam',
    startedAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    sessionEpoch: Date.now() - 2 * 3600000,
    currentFlowIndex: 1,
    trainingVersion: '2.0',
  }
  try {
    localStorage.setItem(FLOW_KEY, JSON.stringify(flow))
    localStorage.setItem(VERSION_KEY, DEMO_VERSION)
  } catch (e) { /* ignore */ }
}

onMounted(() => {
  seedDemoRecords()
  seedDemoActiveFlow()
  loadUnfinished()
})
</script>

<style scoped>
/* ─── 页面整体 ─── */
.home-page {
  display: flex; gap: 16px; padding: 16px 20px;
  min-height: calc(100vh - 60px); align-items: flex-start;
}

/* ─── 标题统一黑体 ─── */
.zone-title, .card-title, .entry-title, .elite-title, .mooc-title,
.spec-card-title, .record-name, .notify-title, .welcome-name {
  font-family: 'SimHei', 'Heiti SC', 'Microsoft YaHei', sans-serif;
}

/* ─── 左侧栏 ─── */
.home-left {
  width: 320px; flex-shrink: 0; display: flex; flex-direction: column; gap: 12px;
  position: sticky; top: 16px;
}

.welcome-card {
  background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%);
  color: #fff; border-radius: 14px; padding: 20px 18px; text-align: center;
}
.welcome-avatar {
  width: 52px; height: 52px; border-radius: 50%; background: rgba(255,255,255,0.2);
  display: flex; align-items: center; justify-content: center; margin: 0 auto 10px;
}
.welcome-name { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
.welcome-greeting { font-size: 12px; opacity: 0.8; line-height: 1.4; }
.welcome-meta {
  display: flex; align-items: center; justify-content: center; gap: 10px;
  margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.15);
}
.streak-badge {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 11px; background: rgba(255,255,255,0.15); padding: 3px 10px; border-radius: 12px;
}
.streak-badge i { color: #fbbf24; font-size: 10px; }
.date-display { font-size: 11px; opacity: 0.6; }

.stat-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.stat-card {
  background: #fff; border-radius: 10px; padding: 12px 14px;
  border: 1px solid #f0f2f5; display: flex; align-items: center; gap: 10px;
  transition: all .15s;
}
.stat-card:hover { box-shadow: 0 2px 6px rgba(0,0,0,0.06); }
.stat-icon {
  width: 36px; height: 36px; border-radius: 8px;
  display: flex; align-items: center; justify-content: center; font-size: 15px; flex-shrink: 0;
}
.stat-info { min-width: 0; }
.stat-value { font-size: 18px; font-weight: 700; line-height: 1.2; }
.stat-label { font-size: 11px; color: #6b7280; }

.radar-card {
  background: #fff; border-radius: 12px; padding: 14px 16px;
  border: 1px solid #f0f2f5; text-align: center;
}
.card-title { font-size: 13px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 6px; margin-bottom: 4px; color: #1f2937; }
.radar-mini { display: flex; justify-content: center; padding: 0; }
.radar-scores { display: grid; grid-template-columns: repeat(2, 1fr); gap: 2px; margin-top: 4px; }
.radar-score-item { display: flex; align-items: center; gap: 4px; font-size: 11px; }
.radar-score-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
.radar-score-label { color: #6b7280; flex: 1; }
.radar-score-val { font-weight: 600; }
.radar-score-val.low { color: #ef4444; }
.radar-link { font-size: 11px; color: #2563eb; cursor: pointer; margin-top: 4px; display: inline-block; }
.radar-link:hover { text-decoration: underline; }

/* ─── 右侧主区域 ─── */
.home-right { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 14px; }

/* ─── 区域容器 ─── */
.zone-section {
  background: #fff; border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05); border: 1px solid #f0f2f5; overflow: hidden;
}
.zone-action { border-left: 4px solid #059669; }
.zone-elite { border-left: 4px solid #8b5cf6; }
.zone-recommend { border-left: 4px solid #f59e0b; }
.zone-records { border-left: 4px solid #2563eb; }
.zone-notify { border-left: 4px solid #7c3aed; }

.zone-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 18px; border-bottom: 1px solid #f3f4f6; background: #fafbfc;
}
.zone-title { font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 7px; color: #1f2937; }
.zone-link { font-size: 12px; color: #2563eb; cursor: pointer; }
.zone-link:hover { text-decoration: underline; }
.zone-body { padding: 14px 18px; }

/* ─── 快速入口 ─── */
.quick-entries { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.entry-card {
  background: #fafbfc; border-radius: 12px; padding: 16px;
  border: 1px solid #f0f2f5; cursor: pointer; transition: all .2s; position: relative;
  display: flex; flex-direction: column; gap: 12px;
}
.entry-card:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.1); background: #fff; }
.entry-card-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.entry-icon-wrapper {
  width: 44px; height: 44px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.entry-icon { font-size: 20px; }
.entry-info { flex: 1; min-width: 0; padding-right: 14px; }
.entry-title { font-size: 15px; font-weight: 700; color: #1f2937; line-height: 1.4; margin-bottom: 4px; }
.entry-desc { font-size: 12px; color: #6b7280; line-height: 1.5; }
.entry-badge {
  font-size: 11px; padding: 3px 9px; border-radius: 8px;
  font-weight: 600; flex-shrink: 0; white-space: nowrap;
}
.entry-arrow { position: absolute; right: 16px; bottom: 16px; color: #d1d5db; font-size: 12px; transition: color .2s; }
.entry-card:hover .entry-arrow { color: #6b7280; }

/* ─── 名医名课研习 ─── */
.elite-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.elite-card {
  background: #fafbfc; border-radius: 12px; padding: 16px;
  border: 1px solid #f0f2f5; cursor: pointer; transition: all .2s; position: relative;
  display: flex; flex-direction: column; gap: 12px;
}
.elite-card:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.1); background: #fff; }
.elite-card-top {
  display: flex; align-items: center; justify-content: space-between;
}
.elite-icon-wrap {
  width: 44px; height: 44px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-size: 20px;
}
.elite-count {
  font-size: 13px; font-weight: 700; color: #1f2937;
  background: #f3f4f6; padding: 4px 10px; border-radius: 8px;
}
.elite-card-body { flex: 1; }
.elite-title { font-size: 15px; font-weight: 700; color: #1f2937; margin-bottom: 4px; }
.elite-desc { font-size: 12px; color: #6b7280; line-height: 1.5; }
.elite-arrow { position: absolute; right: 16px; bottom: 16px; color: #d1d5db; font-size: 12px; transition: all .2s; }
.elite-card:hover .elite-arrow { color: #6b7280; }

.elite-vr:hover { border-color: #0d9488; }

/* ─── 慕课四个模块 ─── */
.mooc-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 12px; }
.mooc-card {
  position: relative; display: flex; flex-direction: column; gap: 12px;
  padding: 16px; border-radius: 12px; cursor: pointer;
  background: #fafbfc; border: 1px solid #f0f2f5; overflow: hidden;
  transition: all .2s;
}
.mooc-card:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.1); background: #fff; }
.mooc-bar { position: absolute; left: 0; top: 0; bottom: 0; width: 3px; }
.mooc-card-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.mooc-icon {
  width: 44px; height: 44px; border-radius: 12px; flex-shrink: 0; font-size: 20px;
  display: flex; align-items: center; justify-content: center; color: #fff;
}
.mooc-count {
  font-size: 13px; font-weight: 700; color: #1f2937;
  background: #f3f4f6; padding: 4px 10px; border-radius: 8px; flex-shrink: 0;
}
.mooc-body { flex: 1; }
.mooc-title { font-size: 15px; font-weight: 700; color: #1f2937; margin-bottom: 4px; }
/* 副标题补足两行高度，使卡片与上方「名医名课研习」四卡等高 */
.mooc-course { font-size: 12px; color: #6b7280; line-height: 1.5; min-height: 36px; }
.mooc-arrow { position: absolute; right: 16px; bottom: 16px; color: #d1d5db; font-size: 12px; transition: color .2s; }
.mooc-card:hover .mooc-arrow { color: #6b7280; }

/* ─── 科室入口 ─── */
.spec-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; }
.spec-card {
  display: flex; align-items: center; gap: 10px;
  padding: 14px 12px; border-radius: 10px; cursor: pointer;
  transition: all .15s; background: #fafbfc; border: 1px solid #f0f2f5;
}
.spec-card:hover { background: #fff; border-color: #dbe3ef; box-shadow: 0 3px 10px rgba(0,0,0,0.07); transform: translateY(-1px); }
.spec-card-icon {
  width: 38px; height: 38px; border-radius: 10px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center; font-size: 16px;
}
.spec-card-body { flex: 1; min-width: 0; }
.spec-card-title { font-size: 13px; font-weight: 600; color: #1f2937; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.spec-card-count { font-size: 11px; color: #9ca3af; margin-top: 2px; }
.spec-card-arrow { font-size: 11px; color: #d1d5db; transition: all .2s; }
.spec-card:hover .spec-card-arrow { color: #6b7280; transform: translateX(2px); }

.diff-U { background: #dbeafe; color: #1d4ed8; }
.diff-R { background: #fef3c7; color: #d97706; }
.diff-F { background: #fee2e2; color: #dc2626; }

/* ─── 底部双栏 ─── */
.bottom-row { display: flex; gap: 14px; }
.bottom-row .zone-section { flex: 1; min-width: 0; }

/* ─── 学习记录 ─── */
.record-row {
  display: flex; align-items: flex-start; gap: 12px;
  padding: 11px 0; border-bottom: 1px solid #f3f4f6;
  cursor: pointer; transition: background .1s;
}
.record-row:last-child { border-bottom: none; }
.record-row:hover { background: #fafbfc; margin: 0 -18px; padding: 11px 18px; }

.record-photo {
  width: 38px; height: 38px; border-radius: 50%; overflow: hidden;
  background: #f3f4f6; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
}
.record-patient-img { width: 100%; height: 100%; object-fit: cover; }
.record-photo-placeholder { font-size: 15px; color: #c0c4cc; }

.record-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.record-row-1 { display: flex; align-items: center; gap: 10px; }
.record-name { font-size: 13px; font-weight: 600; }
.record-caseid { font-size: 10px; color: #9ca3af; font-family: monospace; }
.record-diff { font-size: 9px; padding: 1px 6px; border-radius: 4px; font-weight: 600; }
.record-source-tag {
  font-size: 9px; font-weight: 700; padding: 1px 5px; border-radius: 3px;
  color: #fff; white-space: nowrap; letter-spacing: 0.03em; margin-left: 6px;
}
.record-source-tag.src-academician { background: linear-gradient(135deg, #3730a3, #4f46e5); }
.record-source-tag.src-mentor { background: linear-gradient(135deg, #b45309, #f59e0b); }
.record-source-tag.src-national { background: linear-gradient(135deg, #991b1b, #dc2626); }
.record-score { font-size: 13px; font-weight: 600; margin-left: auto; }
.record-score.score-good { color: #059669; }
.record-score.score-ok { color: #d97706; }
.record-score.score-low { color: #dc2626; }
.record-score.pending { font-size: 11px; color: #9ca3af; font-weight: 400; }

.record-row-2 { display: flex; align-items: center; gap: 8px; font-size: 11px; }
.record-row-3 { font-size: 11px; color: #6b7280; display: flex; align-items: center; gap: 10px; }
.record-station { color: #2563eb; font-weight: 500; }
.record-date { color: #9ca3af; margin-left: auto; }

/* ─── 系统通知 ─── */
.notify-item {
  display: flex; align-items: flex-start; gap: 10px;
  padding: 10px 0; border-bottom: 1px solid #f3f4f6;
}
.notify-item:last-child { border-bottom: none; }
.notify-dot {
  width: 7px; height: 7px; border-radius: 50%; margin-top: 5px;
  background: #d1d5db; flex-shrink: 0;
}
.notify-dot.unread { background: #7c3aed; box-shadow: 0 0 0 3px rgba(124,58,237,0.15); }
.notify-content { flex: 1; min-width: 0; }
.notify-title { font-size: 13px; font-weight: 600; }
.notify-desc { font-size: 11px; color: #6b7280; margin-top: 2px; line-height: 1.4; }
.notify-time { font-size: 11px; color: #9ca3af; flex-shrink: 0; white-space: nowrap; }

.empty-records {
  text-align: center; padding: 32px 0; color: #9ca3af;
}
.empty-records i { font-size: 32px; margin-bottom: 8px; display: block; }
</style>
