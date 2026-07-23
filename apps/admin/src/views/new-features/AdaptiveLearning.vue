<template>
  <div>
    <!-- 统计卡片 -->
    <div class="stat-cards-row">
      <div class="stat-card">
        <div class="stat-icon stat-blue">📊</div>
        <div>
          <div class="stat-value">72</div>
          <div class="stat-label">综合能力分</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon stat-green">📈</div>
        <div>
          <div class="stat-value">18</div>
          <div class="stat-label">累计训练病例</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon stat-purple">🏆</div>
        <div>
          <div class="stat-value">中级</div>
          <div class="stat-label">能力等级</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon stat-red">⚠</div>
        <div>
          <div class="stat-value">平台期</div>
          <div class="stat-label">诊断维度状态</div>
        </div>
      </div>
    </div>

    <div class="profile-layout">
      <!-- 五维能力雷达 -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">五维能力雷达</span>
          <span class="text-sm text-secondary">综合 72 分 · 上次更新 07/19 09:30</span>
        </div>
        <div class="radar-area">
          <svg width="280" height="280" viewBox="0 0 280 280">
            <polygon points="140,30 239,100 215,228 65,228 41,100" fill="none" stroke="var(--border)" stroke-width="1"/>
            <polygon points="140,63 216,115 198,207 82,207 64,115" fill="none" stroke="var(--border)" stroke-width="1"/>
            <polygon points="140,96 193,129 180,185 100,185 87,129" fill="none" stroke="var(--border)" stroke-width="1"/>
            <polygon points="140,129 170,148 163,163 117,163 110,148" fill="none" stroke="var(--border)" stroke-width="1"/>
            <line x1="140" y1="140" x2="140" y2="30" stroke="var(--border)" stroke-width="1"/>
            <line x1="140" y1="140" x2="239" y2="100" stroke="var(--border)" stroke-width="1"/>
            <line x1="140" y1="140" x2="215" y2="228" stroke="var(--border)" stroke-width="1"/>
            <line x1="140" y1="140" x2="65" y2="228" stroke="var(--border)" stroke-width="1"/>
            <line x1="140" y1="140" x2="41" y2="100" stroke="var(--border)" stroke-width="1"/>
            <polygon points="140,57 195,110 189,200 80,200 59,110" fill="rgba(37,99,235,0.12)" stroke="var(--primary)" stroke-width="2"/>
            <circle cx="140" cy="57" r="4" fill="var(--primary)"/>
            <circle cx="195" cy="110" r="4" fill="var(--error)"/>
            <circle cx="189" cy="200" r="4" fill="var(--primary)"/>
            <circle cx="80" cy="200" r="4" fill="var(--primary)"/>
            <circle cx="59" cy="110" r="4" fill="var(--primary)"/>
            <text x="140" y="18" text-anchor="middle" font-size="11" fill="var(--text-main)" font-weight="600">问诊完整性</text>
            <text x="250" y="102" text-anchor="start" font-size="11" fill="var(--text-main)" font-weight="600">诊断准确性</text>
            <text x="222" y="248" text-anchor="start" font-size="11" fill="var(--text-main)" font-weight="600">查体/辅检</text>
            <text x="58" y="248" text-anchor="end" font-size="11" fill="var(--text-main)" font-weight="600">治疗规范性</text>
            <text x="28" y="102" text-anchor="end" font-size="11" fill="var(--text-main)" font-weight="600">人文沟通</text>
            <text x="140" y="47" text-anchor="middle" font-size="10" fill="var(--primary)" font-weight="600">75</text>
            <text x="208" y="108" text-anchor="middle" font-size="10" fill="var(--error)" font-weight="600">62</text>
            <text x="202" y="212" text-anchor="middle" font-size="10" fill="var(--primary)" font-weight="600">68</text>
            <text x="68" y="212" text-anchor="middle" font-size="10" fill="var(--primary)" font-weight="600">80</text>
            <text x="48" y="108" text-anchor="middle" font-size="10" fill="var(--primary)" font-weight="600">72</text>
          </svg>
        </div>
      </div>

      <!-- 薄弱图谱 -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">薄弱图谱</span>
          <span class="text-sm text-secondary">3项待提升</span>
        </div>
        <div
          v-for="w in weaknesses"
          :key="w.label"
          class="weakness-item"
        >
          <span class="weakness-icon">{{ w.icon }}</span>
          <div style="flex:1;">
            <div class="weakness-label">{{ w.label }}</div>
            <div class="text-xs text-secondary">{{ w.desc }}</div>
          </div>
          <span :class="['w-severity', w.severity]">{{ w.rate }}</span>
        </div>
      </div>

      <!-- 能力趋势 -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">能力趋势（近30天）</span>
        </div>
        <svg width="100%" height="160" viewBox="0 0 520 160">
          <line x1="60" y1="20" x2="520" y2="20" stroke="var(--border-light)" stroke-width="1"/>
          <line x1="60" y1="55" x2="520" y2="55" stroke="var(--border-light)" stroke-width="1"/>
          <line x1="60" y1="90" x2="520" y2="90" stroke="var(--border-light)" stroke-width="1"/>
          <line x1="60" y1="125" x2="520" y2="125" stroke="var(--border-light)" stroke-width="1"/>
          <text x="55" y="24" text-anchor="end" font-size="10" fill="var(--text-tertiary)">100</text>
          <text x="55" y="59" text-anchor="end" font-size="10" fill="var(--text-tertiary)">75</text>
          <text x="55" y="94" text-anchor="end" font-size="10" fill="var(--text-tertiary)">50</text>
          <text x="55" y="129" text-anchor="end" font-size="10" fill="var(--text-tertiary)">25</text>
          <polyline points="70,60 155,55 240,58 325,50 410,45 495,40" fill="none" stroke="var(--success)" stroke-width="2.5"/>
          <polyline points="70,80 155,82 240,78 325,85 410,90 495,95" fill="none" stroke="var(--error)" stroke-width="2.5" stroke-dasharray="6,3"/>
          <polyline points="70,72 155,70 240,69 325,68 410,68 495,67" fill="none" stroke="var(--primary)" stroke-width="2.5"/>
          <circle cx="340" cy="140" r="3" fill="var(--success)"/><text x="348" y="144" font-size="10" fill="var(--text-secondary)">问诊</text>
          <circle cx="390" cy="140" r="3" fill="var(--error)"/><text x="398" y="144" font-size="10" fill="var(--text-secondary)">诊断（薄弱）</text>
          <circle cx="445" cy="140" r="3" fill="var(--primary)"/><text x="453" y="144" font-size="10" fill="var(--text-secondary)">综合</text>
          <text x="70" y="155" text-anchor="middle" font-size="9" fill="var(--text-tertiary)">6/20</text>
          <text x="240" y="155" text-anchor="middle" font-size="9" fill="var(--text-tertiary)">6/30</text>
          <text x="410" y="155" text-anchor="middle" font-size="9" fill="var(--text-tertiary)">7/10</text>
          <text x="495" y="155" text-anchor="middle" font-size="9" fill="var(--text-tertiary)">7/19</text>
        </svg>
        <div class="trend-warning">⚠ 诊断准确性维度持续偏低，已进入平台期（连续5例无显著提升）</div>
      </div>

      <!-- 各维度得分 -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">各维度得分</span>
        </div>
        <div v-for="dim in dimensions" :key="dim.label" class="score-bar">
          <span class="score-bar-label">{{ dim.label }}</span>
          <div class="score-bar-track">
            <div
              class="score-bar-fill"
              :style="{ width: dim.score + '%', background: dim.color }"
            ></div>
          </div>
          <span class="score-bar-val" :style="{ color: dim.score < 65 ? 'var(--error)' : 'inherit' }">{{ dim.score }}</span>
        </div>
        <div class="mastery-section">
          <div class="text-sm text-secondary mb-2">已掌握 vs 待攻克：</div>
          <div class="flex flex-wrap gap-1 mb-3">
            <span v-for="d in mastered" :key="d" class="badge badge-success">{{ d }}</span>
          </div>
          <div class="flex flex-wrap gap-1">
            <span v-for="d in toMaster" :key="d" class="badge badge-warning">{{ d }}</span>
          </div>
        </div>
      </div>

      <!-- 智能推荐 (全宽) -->
      <div class="card panel-full">
        <div class="card-header">
          <span class="card-title">为你推荐</span>
          <span class="text-sm text-secondary">基于画像薄弱环节智能匹配 — 每次3-5个病例</span>
        </div>
        <div class="stat-cards-row" style="margin-bottom:0;">
          <div
            v-for="rec in recommendations"
            :key="rec.name"
            class="recommend-card"
            @click="goToCompanion(rec)"
          >
            <div class="rec-name">{{ rec.name }}</div>
            <div class="flex gap-1 mt-2">
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
  { label: '问诊完整性', score: 75, color: 'var(--success)' },
  { label: '诊断准确性', score: 62, color: 'var(--error)' },
  { label: '查体/辅检', score: 68, color: 'var(--primary)' },
  { label: '治疗规范性', score: 80, color: 'var(--success)' },
  { label: '人文沟通', score: 72, color: 'var(--primary)' },
]

const weaknesses = [
  { icon: '🫀', label: '心血管系统鉴别诊断遗漏', desc: '近5例中3例遗漏关键鉴别项', rate: '60%', severity: 'high' },
  { icon: '🩺', label: '肺部听诊关键发现遗漏', desc: '湿啰音/哮鸣音识别率偏低', rate: '55%', severity: 'high' },
  { icon: '💊', label: '抗生素选择倾向广谱', desc: '与标准方案偏差率偏高', rate: '30%', severity: 'medium' },
  { icon: '📋', label: '辅助检查冗余', desc: '非必要检查项目偏多', rate: '25%', severity: 'medium' },
]

const mastered = ['急性阑尾炎', '股骨颈骨折', '过敏性休克']
const toMaster = ['急性心肌梗死', '脑卒中', '上消化道出血']

const recommendations = [
  {
    name: '心衰合并肾功能不全',
    levelLabel: '高阶',
    levelBadge: 'badge-warning',
    phase: 'R2',
    reason: '你在"心血管鉴别诊断"维度得分偏低（62），此病例含复杂心衰鉴别场景，可针对性强化',
  },
  {
    name: '间质性肺病鉴别诊断',
    levelLabel: '疑难',
    levelBadge: 'badge-error',
    phase: 'R3',
    reason: '你的"肺部听诊遗漏率"偏高（55%），此病例需精细肺部听诊技能',
  },
  {
    name: '社区获得性肺炎',
    levelLabel: '基础',
    levelBadge: 'badge-success',
    phase: 'U2',
    reason: '你的"抗生素选择偏差"偏高（30%），此病例可重新校准抗感染治疗思路',
  },
]

function goToCompanion(rec) {
  router.push({ name: 'aiCompanionDetail', query: { caseName: rec.name } })
}
</script>

<style scoped>
/* 统计卡片行 (4列) */
.stat-cards-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}

.stat-card {
  background: #fff;
  border-radius: var(--card-radius);
  padding: 20px;
  box-shadow: var(--card-shadow);
  border: 1px solid var(--border-light);
  display: flex;
  align-items: center;
  gap: 16px;
}
.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  flex-shrink: 0;
}
.stat-blue { background: #eff6ff; color: #2563eb; }
.stat-green { background: #d1fae5; color: #10b981; }
.stat-purple { background: #f0f0ff; color: #7c3aed; }
.stat-red { background: #fee2e2; color: #ef4444; }
.stat-value { font-size: 28px; font-weight: 700; line-height: 1.2; }
.stat-label { font-size: 13px; color: var(--text-secondary); margin-top: 2px; }

/* 两栏布局 */
.profile-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}
.panel-full { grid-column: 1 / -1; }

.card {
  background: var(--card-bg);
  border-radius: var(--card-radius);
  box-shadow: var(--card-shadow);
  border: 1px solid var(--border-light);
  padding: 20px;
}

.card-header {
  padding: 0 0 14px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.card-title { font-size: 16px; font-weight: 600; }

/* 雷达 */
.radar-area {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px 0;
}

/* 薄弱图谱 */
.weakness-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 8px;
  margin-bottom: 8px;
  background: #fef2f2;
  border: 1px solid #fecaca;
}
.weakness-icon { font-size: 18px; flex-shrink: 0; }
.weakness-label { font-size: 13px; font-weight: 500; }

.w-severity {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 8px;
  font-weight: 600;
  flex-shrink: 0;
}
.w-severity.high { background: #fecaca; color: #dc2626; }
.w-severity.medium { background: #fed7aa; color: #ea580c; }

/* 趋势 */
.trend-warning {
  font-size: 11px;
  color: var(--error);
  margin-top: 4px;
}

/* 得分条 */
.score-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}
.score-bar-label { width: 90px; font-size: 12px; flex-shrink: 0; color: var(--text-secondary); }
.score-bar-track { flex: 1; height: 8px; background: #f3f4f6; border-radius: 4px; overflow: hidden; }
.score-bar-fill { height: 100%; border-radius: 4px; transition: width .6s ease; }
.score-bar-val { width: 36px; font-size: 12px; font-weight: 600; text-align: right; flex-shrink: 0; }

.mastery-section {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--border);
}

/* 推荐卡片 */
.recommend-card {
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: var(--card-radius);
  cursor: pointer;
  transition: all .15s;
}
.recommend-card:hover { border-color: var(--primary); background: var(--primary-light); }
.rec-name { font-size: 14px; font-weight: 500; }
.rec-reason {
  font-size: 11px;
  color: var(--primary);
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px solid var(--border);
}

.text-sm { font-size: 13px; }
.text-xs { font-size: 12px; }
.text-secondary { color: var(--text-secondary); }
.flex { display: flex; }
.flex-wrap { flex-wrap: wrap; }
.gap-1 { gap: 4px; }
.mb-2 { margin-bottom: 8px; }
.mb-3 { margin-bottom: 12px; }
.mt-2 { margin-top: 8px; }
.items-center { align-items: center; }

.badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}
.badge-info { background: #dbeafe; color: #1e40af; }
.badge-success { background: #d1fae5; color: #065f46; }
.badge-warning { background: #fef3c7; color: #92400e; }
.badge-error { background: #fee2e2; color: #991b1b; }
.badge-purple { background: #f3f0ff; color: #7c3aed; }
</style>
