<template>
  <div class="adaptive-page">
    <div class="page-header">
      <h2><i class="fa-solid fa-id-card"></i> 我的学习画像</h2>
      <span class="text-secondary text-sm">上次更新 07/19 09:30</span>
    </div>

    <!-- 统计卡片 -->
    <div class="stat-cards">
      <div class="stat-card">
        <div class="stat-icon stat-blue"><i class="fa-solid fa-chart-simple"></i></div>
        <div><div class="stat-value">72</div><div class="stat-label">综合能力分</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon stat-green"><i class="fa-solid fa-book-medical"></i></div>
        <div><div class="stat-value">18</div><div class="stat-label">累计训练病例</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon stat-purple"><i class="fa-solid fa-trophy"></i></div>
        <div><div class="stat-value">中级</div><div class="stat-label">能力等级</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon stat-red"><i class="fa-solid fa-triangle-exclamation"></i></div>
        <div><div class="stat-value">平台期</div><div class="stat-label">诊断维度状态</div></div>
      </div>
    </div>

    <div class="profile-grid">
      <!-- 五维雷达 -->
      <div class="card">
        <div class="card-header"><span class="card-title">学习画像</span></div>
        <div class="radar-area">
          <svg width="170" height="170" viewBox="0 0 280 280">
            <polygon points="140,30 239,100 215,228 65,228 41,100" fill="none" stroke="#e5e7eb" stroke-width="1"/>
            <polygon points="140,63 216,115 198,207 82,207 64,115" fill="none" stroke="#e5e7eb" stroke-width="1"/>
            <polygon points="140,96 193,129 180,185 100,185 87,129" fill="none" stroke="#e5e7eb" stroke-width="1"/>
            <polygon points="140,129 170,148 163,163 117,163 110,148" fill="none" stroke="#e5e7eb" stroke-width="1"/>
            <line x1="140" y1="140" x2="140" y2="30" stroke="#e5e7eb" stroke-width="1"/>
            <line x1="140" y1="140" x2="239" y2="100" stroke="#e5e7eb" stroke-width="1"/>
            <line x1="140" y1="140" x2="215" y2="228" stroke="#e5e7eb" stroke-width="1"/>
            <line x1="140" y1="140" x2="65" y2="228" stroke="#e5e7eb" stroke-width="1"/>
            <line x1="140" y1="140" x2="41" y2="100" stroke="#e5e7eb" stroke-width="1"/>
            <polygon points="140,57 195,110 189,200 80,200 59,110" fill="rgba(37,99,235,0.12)" stroke="#2563eb" stroke-width="2"/>
            <circle cx="140" cy="57" r="4" fill="#2563eb"/><circle cx="195" cy="110" r="4" fill="#ef4444"/>
            <circle cx="189" cy="200" r="4" fill="#2563eb"/><circle cx="80" cy="200" r="4" fill="#2563eb"/>
            <circle cx="59" cy="110" r="4" fill="#2563eb"/>
            <text x="140" y="18" text-anchor="middle" font-size="11" fill="#1f2937" font-weight="600">问诊</text>
            <text x="250" y="102" text-anchor="start" font-size="11" fill="#1f2937" font-weight="600">诊断</text>
            <text x="222" y="248" text-anchor="start" font-size="11" fill="#1f2937" font-weight="600">查体</text>
            <text x="58" y="248" text-anchor="end" font-size="11" fill="#1f2937" font-weight="600">治疗</text>
            <text x="28" y="102" text-anchor="end" font-size="11" fill="#1f2937" font-weight="600">沟通</text>
          </svg>
        </div>
      </div>

      <!-- 各维度得分 -->
      <div class="card">
        <div class="card-header"><span class="card-title">各维度得分</span></div>
        <div v-for="dim in dimensions" :key="dim.label" class="score-bar">
          <span class="score-label">{{ dim.label }}</span>
          <div class="score-track"><div class="score-fill" :style="{ width: dim.score + '%', background: dim.color }"></div></div>
          <span class="score-val" :style="{ color: dim.score < 65 ? '#ef4444' : '' }">{{ dim.score }}</span>
        </div>
        <div class="mastery-section">
          <div class="text-sm text-secondary mb-2">已掌握 vs 待攻克：</div>
          <div class="tag-row">
            <span v-for="d in mastered" :key="d" class="badge badge-success">{{ d }}</span>
          </div>
          <div class="tag-row mt-2">
            <span v-for="d in toMaster" :key="d" class="badge badge-warning">{{ d }}</span>
          </div>
        </div>
      </div>


      <!-- 薄弱图谱 -->
      <div class="card">
        <div class="card-header"><span class="card-title">薄弱图谱</span><span class="text-sm text-secondary">3项待提升</span></div>
        <div v-for="w in weaknesses" :key="w.label" class="weakness-item">
          <span class="weakness-icon">{{ w.icon }}</span>
          <div style="flex:1"><div class="weakness-label">{{ w.label }}</div><div class="text-xs text-secondary">{{ w.desc }}</div></div>
          <span :class="['severity-badge', w.severity]">{{ w.rate }}</span>
        </div>
      </div>

      <!-- 学习轨迹 -->
      <div class="card">
        <div class="card-header"><span class="card-title">学习轨迹</span><span class="text-sm text-secondary">近2周</span></div>
        <div class="timeline">
          <div v-for="(t, i) in timeline" :key="i" class="timeline-item">
            <div class="timeline-dot" :class="t.type"></div>
            <div class="timeline-content">
              <div class="timeline-title">{{ t.title }}</div>
              <div class="timeline-meta">
                <span v-if="t.score" :class="['timeline-score', t.score >= 80 ? 'good' : t.score >= 65 ? 'ok' : 'low']">{{ t.score }}分</span>
                <span class="timeline-date">{{ t.date }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 专科分布 -->
      <div class="card">
        <div class="card-header"><span class="card-title">专科分布</span></div>
        <div v-for="spec in specialtyScores" :key="spec.name" class="spec-bar-item">
          <div class="spec-bar-label">
            <span>{{ spec.icon }} {{ spec.name }}</span>
            <span class="spec-bar-count">{{ spec.count }}例</span>
          </div>
          <div class="spec-bar-track">
            <div class="spec-bar-fill" :style="{ width: spec.avgScore + '%', background: spec.color }"></div>
          </div>
          <span class="spec-bar-score" :style="{ color: spec.avgScore < 65 ? '#ef4444' : '#059669' }">{{ spec.avgScore }}分</span>
        </div>
        <div class="peer-compare">
          <div class="peer-title">同伴对比 <span class="peer-rank">超越 68% 同级学员</span></div>
          <div class="peer-bar-track">
            <div class="peer-bar-fill" style="width:68%;"></div>
          </div>
        </div>
      </div>

      <!-- 为你推荐 -->
      <div class="card">
        <div class="card-header"><span class="card-title">为你推荐</span></div>
        <div class="recommend-list">
          <div v-for="rec in recommendations" :key="rec.name" class="recommend-card" @click="goTraining(rec)">
            <div class="rec-title">{{ rec.name }}</div>
            <div class="rec-meta">
              <span :class="['badge', rec.levelBadge]">{{ rec.levelLabel }}</span>
              <span class="badge badge-info">{{ rec.phase }}</span>
            </div>
            <div class="rec-reason">💡 {{ rec.reason }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const dimensions = [
  { label: '问诊完整性', score: 75, color: '#10b981' },
  { label: '诊断准确性', score: 62, color: '#ef4444' },
  { label: '查体/辅检', score: 68, color: '#2563eb' },
  { label: '治疗规范性', score: 80, color: '#10b981' },
  { label: '人文沟通', score: 72, color: '#2563eb' },
]

const weaknesses = [
  { icon: '🫀', label: '心血管系统鉴别诊断遗漏', desc: '近5例中3例遗漏关键鉴别项', rate: '60%', severity: 'high' },
  { icon: '🩺', label: '肺部听诊关键发现遗漏', desc: '湿啰音/哮鸣音识别率偏低', rate: '55%', severity: 'high' },
  { icon: '💊', label: '抗生素选择倾向广谱', desc: '与标准方案偏差率偏高', rate: '30%', severity: 'medium' },
]

const mastered = ['急性阑尾炎', '股骨颈骨折', '过敏性休克']
const toMaster = ['急性心肌梗死', '脑卒中', '上消化道出血']

const recommendations = [
  { name: '心衰合并肾功能不全', levelLabel: '高阶', levelBadge: 'badge-warning', phase: 'R2', reason: '"心血管鉴别诊断"得分偏低（62），此病例可针对性强化' },
  { name: '间质性肺病鉴别诊断', levelLabel: '疑难', levelBadge: 'badge-error', phase: 'R3', reason: '"肺部听诊遗漏率"偏高（55%），需精细听诊技能' },
  { name: '社区获得性肺炎', levelLabel: '基础', levelBadge: 'badge-success', phase: 'U2', reason: '"抗生素选择偏差"偏高（30%），可重新校准思路' },
]

const timeline = [
  { title: '急性心肌梗死 · 病史采集', score: 82, date: '07/19', type: 'train' },
  { title: 'Graves病 · 体格检查', score: 85, date: '07/18', type: 'train' },
  { title: '急性缺血性脑卒中 · 诊断', score: 62, date: '07/17', type: 'train' },
  { title: '社区获得性肺炎 · 病史采集', score: 90, date: '07/16', type: 'train' },
  { title: '学习画像更新', date: '07/15', type: 'milestone' },
]

const specialtyScores = [
  { icon: '🫀', name: '心内科', count: 5, avgScore: 76, color: '#2563eb' },
  { icon: '🧠', name: '神经内科', count: 3, avgScore: 64, color: '#ef4444' },
  { icon: '🫁', name: '呼吸科', count: 2, avgScore: 85, color: '#10b981' },
  { icon: '🩸', name: '消化科', count: 3, avgScore: 72, color: '#f59e0b' },
  { icon: '🩺', name: '内分泌科', count: 3, avgScore: 80, color: '#7c3aed' },
]

function goTraining(rec) {
  router.push({ name: 'caseList' })
}
</script>

<style scoped>
.adaptive-page { padding: 10px 20px 16px; }

.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.page-header h2 { font-size: 16px; font-weight: 600; }

.stat-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 10px; }
.stat-card {
  background: #fff; border-radius: 8px; padding: 10px 12px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.03); border: 1px solid #f3f4f6;
  display: flex; align-items: center; gap: 8px;
}
.stat-icon { width: 32px; height: 32px; border-radius: 7px; display: flex; align-items: center; justify-content: center; font-size: 15px; flex-shrink: 0; }
.stat-blue { background: #eff6ff; color: #2563eb; }
.stat-green { background: #d1fae5; color: #10b981; }
.stat-purple { background: #f0f0ff; color: #7c3aed; }
.stat-red { background: #fee2e2; color: #ef4444; }
.stat-value { font-size: 20px; font-weight: 700; line-height: 1.1; }
.stat-label { font-size: 10px; color: #6b7280; margin-top: 1px; }

.profile-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

.card { background: #fff; border-radius: 10px; padding: 12px 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); border: 1px solid #f3f4f6; }
.card-header { padding-bottom: 7px; border-bottom: 1px solid #e5e7eb; margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between; }
.card-title { font-size: 13px; font-weight: 600; }

.card-trend .card-header { padding-bottom: 6px; margin-bottom: 4px; }
.trend-legend { display: flex; align-items: center; gap: 8px; font-size: 10px; color: #6b7280; }
.legend-dot { width: 7px; height: 7px; border-radius: 50%; display: inline-block; flex-shrink: 0; }

.radar-area { display: flex; align-items: center; justify-content: center; padding: 0; }

.weakness-item { display: flex; align-items: center; gap: 8px; padding: 6px 10px; border-radius: 6px; margin-bottom: 4px; background: #fef2f2; border: 1px solid #fecaca; }
.weakness-item:last-child { margin-bottom: 0; }
.weakness-icon { font-size: 15px; flex-shrink: 0; }
.weakness-label { font-size: 11px; font-weight: 500; }

.severity-badge { font-size: 10px; padding: 2px 8px; border-radius: 8px; font-weight: 600; flex-shrink: 0; }
.severity-badge.high { background: #fecaca; color: #dc2626; }
.severity-badge.medium { background: #fed7aa; color: #ea580c; }

.trend-chart { margin-top: 2px; }
.trend-warning { font-size: 10px; color: #ef4444; margin-top: 3px; }

.score-bar { display: flex; align-items: center; gap: 8px; margin-bottom: 5px; }
.score-bar:last-of-type { margin-bottom: 0; }
.score-label { width: 70px; font-size: 11px; color: #6b7280; flex-shrink: 0; }
.score-track { flex: 1; height: 6px; background: #f3f4f6; border-radius: 3px; overflow: hidden; }
.score-fill { height: 100%; border-radius: 3px; transition: width .6s; }
.score-val { width: 26px; font-size: 11px; font-weight: 600; text-align: right; flex-shrink: 0; }

.mastery-section { margin-top: 8px; padding-top: 7px; border-top: 1px solid #e5e7eb; }
.tag-row { display: flex; flex-wrap: wrap; gap: 3px; }
.mt-2 { margin-top: 5px; }

.recommend-list { display: flex; flex-direction: column; gap: 6px; }
.recommend-card {
  padding: 10px 14px; border: 1px solid #e5e7eb; border-radius: 8px;
  cursor: pointer; transition: all .15s;
}
.recommend-card:hover { border-color: #2563eb; background: #f0f5ff; }
.rec-title { font-size: 12px; font-weight: 500; }
.rec-meta { display: flex; gap: 4px; margin-top: 3px; }
.rec-reason { font-size: 10px; color: #2563eb; margin-top: 3px; padding-top: 3px; border-top: 1px solid #e5e7eb; }

.text-sm { font-size: 11px; }
.text-xs { font-size: 10px; }
.text-secondary { color: #6b7280; }
.mb-2 { margin-bottom: 4px; }

/* ─── 学习轨迹 ─── */
.timeline { padding: 0; }
.timeline-item { display: flex; gap: 8px; padding: 4px 0; position: relative; }
.timeline-item:not(:last-child)::before {
  content: ''; position: absolute; left: 4px; top: 18px; bottom: -4px;
  width: 1px; background: #e5e7eb;
}
.timeline-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; margin-top: 2px; }
.timeline-dot.train { background: #2563eb; }
.timeline-dot.milestone { background: #f59e0b; }
.timeline-content { flex: 1; min-width: 0; }
.timeline-title { font-size: 11px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.timeline-meta { display: flex; align-items: center; gap: 6px; margin-top: 1px; }
.timeline-score { font-size: 10px; font-weight: 600; }
.timeline-score.good { color: #059669; }
.timeline-score.ok { color: #d97706; }
.timeline-score.low { color: #ef4444; }
.timeline-date { font-size: 10px; color: #9ca3af; }

/* ─── 专科分布 ─── */
.spec-bar-item { margin-bottom: 6px; }
.spec-bar-item:last-of-type { margin-bottom: 0; }
.spec-bar-label { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 2px; }
.spec-bar-count { font-size: 10px; color: #9ca3af; }
.spec-bar-track { height: 6px; background: #f3f4f6; border-radius: 3px; overflow: hidden; }
.spec-bar-fill { height: 100%; border-radius: 3px; transition: width .6s; }
.spec-bar-score { font-size: 10px; font-weight: 600; float: right; margin-top: 1px; }

.peer-compare { margin-top: 8px; padding-top: 7px; border-top: 1px solid #e5e7eb; }
.peer-title { font-size: 11px; font-weight: 500; margin-bottom: 4px; }
.peer-rank { font-size: 10px; color: #059669; font-weight: 600; }
.peer-bar-track { height: 7px; background: #f3f4f6; border-radius: 4px; overflow: hidden; }
.peer-bar-fill { height: 100%; border-radius: 4px; background: linear-gradient(90deg, #10b981, #059669); }
</style>
