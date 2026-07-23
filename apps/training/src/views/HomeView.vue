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
            <span class="radar-score-val" :class="{ low: d.score < 65 }">{{ d.score }}</span>
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
            <div class="entry-card entry-sp" @click="goSPTraining">
              <div class="entry-icon-wrapper" style="background: #eff6ff;">
                <i class="fa-solid fa-stethoscope entry-icon" style="color: #2563eb;"></i>
              </div>
              <div class="entry-info">
                <div class="entry-title">SP训练</div>
                <div class="entry-desc">标准化病人对话实战</div>
              </div>
              <div class="entry-badge" style="background: #dbeafe; color: #1d4ed8;">{{ trainedCount }} 例已完成</div>
              <i class="fa-solid fa-chevron-right entry-arrow"></i>
            </div>
            <div class="entry-card entry-mdt" @click="goMDT">
              <div class="entry-icon-wrapper" style="background: #f0fdf4;">
                <i class="fa-solid fa-users entry-icon" style="color: #059669;"></i>
              </div>
              <div class="entry-info">
                <div class="entry-title">MDT多学科讨论</div>
                <div class="entry-desc">团队协作病例思辨</div>
              </div>
              <div class="entry-badge" style="background: #d1fae5; color: #065f46;">{{ mdtCount }} 例可讨论</div>
              <i class="fa-solid fa-chevron-right entry-arrow"></i>
            </div>
            <div class="entry-card entry-exam" @click="goExam">
              <div class="entry-icon-wrapper" style="background: #fef3c7;">
                <i class="fa-solid fa-file-circle-check entry-icon" style="color: #d97706;"></i>
              </div>
              <div class="entry-info">
                <div class="entry-title">在线考试</div>
                <div class="entry-desc">正式考核评估认证</div>
              </div>
              <div class="entry-badge" style="background: #fef9c3; color: #a16207;">即将开放</div>
              <i class="fa-solid fa-chevron-right entry-arrow"></i>
            </div>
          </div>
        </div>
      </section>

      <!-- 为你推荐 -->
      <section class="zone-section zone-recommend">
        <div class="zone-header">
          <span class="zone-title"><i class="fa-solid fa-lightbulb"></i> 为你推荐</span>
          <span class="zone-link" @click="goSPTraining">全部病例 →</span>
        </div>
        <div class="zone-body">
          <div class="recommend-grid">
            <div v-for="(rec, i) in recommendations" :key="rec.caseId" class="recommend-card" @click="goSPTraining">
              <div class="rec-photo">
                <img v-if="recAvatars[i]" :src="recAvatars[i]" class="rec-patient-img" />
                <span v-else class="rec-photo-placeholder"><i class="fa-solid fa-user"></i></span>
              </div>
              <div class="rec-info">
                <div class="rec-row-1">
                  <span class="rec-name">{{ rec.patientName }}</span>
                  <span class="rec-diff" :class="'diff-' + (rec.difficulty[0] || 'R')">{{ rec.difficulty }}</span>
                  <span class="rec-case-level" :class="'cl-' + getCaseLevel(rec.difficulty)">{{ getCaseLevelLabel(rec.difficulty) }}</span>
                </div>
                <div class="rec-row-2">{{ rec.gender }} · {{ rec.age }}岁 · {{ rec.specialty }}</div>
                <div class="rec-row-3">
                  <span class="rec-symptom-tag" v-for="s in rec.symptoms" :key="s">{{ s }}</span>
                </div>
                <div class="rec-reason">{{ rec.reason }}</div>
              </div>
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
                <span v-if="r.score" class="record-score" :class="scoreClass(r.score)">{{ r.score }}分</span>
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
import { resolveAppUrls, getDifficultyLabel, getCaseLevel, getCaseLevelLabel } from '@ai-sp/shared'
import { matchPatientImage } from '@/composables/usePatientImage'

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

function goSPTraining() {
  router.push({ name: 'caseList' })
}

function goMDT() {
  router.push({ name: 'mdtCaseList' })
}

function goExam() {
  window.open(urls.exam, '_blank')
}

function goAdaptiveLearning() {
  router.push({ name: 'adaptiveLearning' })
}

function goRecords() {
  router.push({ name: 'caseList' })
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
  { patientName: '周伯通', disease: '心衰合并肾功能不全', caseId: 'CARD-20260715-M2N7', difficulty: 'R2', gender: '男', age: '68', specialty: '心血管内科', symptoms: ['呼吸困难', '下肢水肿', '少尿'], chiefComplaint: '反复胸闷气喘2月，加重伴夜间不能平卧1周', reason: '鉴别诊断维度得分偏低，推荐强化心血管鉴别能力' },
  { patientName: '孙晓芳', disease: '间质性肺病鉴别诊断', caseId: 'RESP-20260710-K9P3', difficulty: 'R3', gender: '女', age: '55', specialty: '呼吸内科', symptoms: ['干咳', '活动后气促', 'Velcro啰音'], chiefComplaint: '进行性呼吸困难伴干咳3月', reason: '肺部听诊遗漏率偏高，推荐加强胸部影像判读' },
  { patientName: '赵秀兰', disease: '社区获得性肺炎', caseId: 'RESP-20260602-B5Y1', difficulty: 'U2', gender: '女', age: '45', specialty: '呼吸内科', symptoms: ['发热', '咳嗽', '咳痰', '胸痛'], chiefComplaint: '发热、咳嗽、咳痰5天，加重伴胸痛1天', reason: '基础病例巩固，抗生素选择思路校准' },
])

const recAvatars = computed(() => {
  return recommendations.value.map(rec => {
    const gender = rec.gender
    const age = parseInt(rec.age) || 30
    return matchPatientImage({ gender, age }, 'patient')
  })
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
    stationId: r.stationId,
    stationName: r.stationName || getStationLabel(r.stationId),
    score: r.score,
    recordedAt: r.recordedAt,
  }))
})

// ─── 系统通知 ───
const notifications = ref([
  { id: 1, title: '系统升级通知', desc: 'AI-SP平台v2.0已上线，新增MDT多学科讨论模块，点击体验', time: '07-20', unread: true },
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
  'IM-20260527-A9GW': { patientName: '王丽', gender: '女', age: '36', specialty: '内分泌科', difficulty: 'R2', disease: 'Graves病', symptoms: ['心悸', '多汗', '体重下降'], chiefComplaint: '心悸、多汗、体重下降3月' },
  'IM-20260416-K4G7': { patientName: '张德明', gender: '男', age: '62', specialty: '心血管内科', difficulty: 'R3', disease: '急性心肌梗死', symptoms: ['胸痛', '大汗', '呼吸困难'], chiefComplaint: '突发胸痛伴大汗2小时' },
  'NEURO-20260515-P3X8': { patientName: '李广富', gender: '男', age: '71', specialty: '神经内科', difficulty: 'F1', disease: '急性缺血性脑卒中', symptoms: ['言语不清', '右侧肢体无力', '口角歪斜'], chiefComplaint: '突发言语不清伴右侧肢体无力1.5小时' },
  'RESP-20260602-B5Y1': { patientName: '赵秀兰', gender: '女', age: '45', specialty: '呼吸内科', difficulty: 'U2', disease: '社区获得性肺炎', symptoms: ['发热', '咳嗽', '咳痰', '胸痛'], chiefComplaint: '发热、咳嗽、咳痰5天，加重伴胸痛1天' },
  'GI-20260701-C2M3': { patientName: '刘建国', gender: '男', age: '55', specialty: '消化内科', difficulty: 'R2', disease: '上消化道出血', symptoms: ['黑便', '呕血', '上腹痛'], chiefComplaint: '反复黑便3天，呕血1次' },
  'DERM-20260416-K4G7': { patientName: '陈小雅', gender: '女', age: '28', specialty: '皮肤科', difficulty: 'R1', disease: '寻常型银屑病', symptoms: ['红斑', '鳞屑', '瘙痒'], chiefComplaint: '全身红斑鳞屑伴瘙痒2年，加重1月' },
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
.quick-entries { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.entry-card {
  background: #fafbfc; border-radius: 10px; padding: 14px;
  border: 1px solid #f0f2f5; cursor: pointer; transition: all .2s; position: relative;
  display: flex; flex-direction: column; gap: 8px;
}
.entry-card:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); background: #fff; }
.entry-icon-wrapper {
  width: 38px; height: 38px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.entry-icon { font-size: 18px; }
.entry-info { flex: 1; }
.entry-title { font-size: 14px; font-weight: 600; margin-bottom: 2px; }
.entry-desc { font-size: 11px; color: #6b7280; }
.entry-badge {
  font-size: 10px; padding: 2px 8px; border-radius: 8px;
  font-weight: 500; align-self: flex-start;
}
.entry-arrow { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); color: #d1d5db; font-size: 11px; }
.entry-card:hover .entry-arrow { color: #6b7280; }

/* ─── 推荐病例 ─── */
.recommend-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.recommend-card {
  display: flex; align-items: flex-start; gap: 10px;
  padding: 12px; border-radius: 10px; cursor: pointer;
  transition: all .15s; background: #fafbfc; border: 1px solid #f0f2f5;
}
.recommend-card:hover { background: #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }

.rec-photo {
  width: 42px; height: 42px; border-radius: 50%; overflow: hidden;
  background: #f3f4f6; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
}
.rec-patient-img { width: 100%; height: 100%; object-fit: cover; }
.rec-photo-placeholder { font-size: 16px; color: #c0c4cc; }

.rec-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.rec-row-1 { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.rec-name { font-size: 13px; font-weight: 600; color: #1f2937; }
.rec-diff { font-size: 9px; padding: 1px 6px; border-radius: 4px; font-weight: 600; flex-shrink: 0; }
.rec-case-level { font-size: 9px; padding: 1px 4px; border-radius: 3px; font-weight: 500; flex-shrink: 0; }
.diff-U { background: #dbeafe; color: #1d4ed8; }
.diff-R { background: #fef3c7; color: #d97706; }
.diff-F { background: #fee2e2; color: #dc2626; }
.cl-basic { background: #e8f5e9; color: #2e7d32; }
.cl-advanced { background: #fff3e0; color: #e65100; }
.cl-difficult { background: #fce4ec; color: #c62828; }
.rec-row-2 { font-size: 11px; color: #6b7280; }
.rec-row-3 { display: flex; gap: 3px; flex-wrap: wrap; }
.rec-symptom-tag {
  font-size: 9px; padding: 1px 5px; background: #f3f4f6;
  border-radius: 3px; color: #6b7280;
}
.rec-reason {
  font-size: 10px; color: #9ca3af; margin-top: 3px; padding-top: 3px;
  border-top: 1px dashed #f3f4f6; line-height: 1.4;
}

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
