<template>
  <div class="mentor-page" v-if="cat">
    <!-- 页头 Hero -->
    <div class="mentor-hero" :style="{ background: cat.gradient }">
      <div class="hero-icon"><i class="fa-solid" :class="cat.icon"></i></div>
      <div class="hero-text">
        <div class="hero-title">{{ cat.title }}</div>
        <div class="hero-desc">{{ cat.desc }}</div>
      </div>
      <div class="hero-count">{{ totalCount ? totalCount + ' 例' : '建设中' }}</div>
    </div>

    <!-- 按导师分组：导师信息 + 名下病例 -->
    <section class="mentor-group" v-for="(m, gi) in cat.mentors" :key="gi">
      <div class="mentor-card">
        <div class="mentor-avatar">
          <img v-if="m.photo" :src="m.photo" :alt="m.name" class="mentor-photo" />
          <span v-else class="mentor-photo-placeholder"><i class="fa-solid fa-user-tie"></i></span>
        </div>
        <div class="mentor-info">
          <div class="mentor-name">{{ m.name }}</div>
          <div class="mentor-title" v-if="m.title">{{ m.title }}</div>
          <div class="mentor-intro" v-if="m.intro">{{ m.intro }}</div>
        </div>
        <span class="mentor-case-count" :class="{ 'count-pending': !m.cases.length }">
          {{ m.cases.length ? m.cases.length + ' 例' : '病例整理中' }}
        </span>
      </div>
      <!-- 央视科普 / 媒体报道 -->
      <a class="mentor-media" v-if="m.media" :href="m.media.url" target="_blank" rel="noopener noreferrer">
        <div class="media-icon" :style="{ background: cat.gradient }"><i class="fa-solid fa-tv"></i></div>
        <div class="media-body">
          <div class="media-platform">{{ m.media.platform }}</div>
          <div class="media-title">{{ m.media.title }}</div>
          <div class="media-desc">{{ m.media.desc }}</div>
        </div>
        <span class="media-play"><i class="fa-solid fa-play"></i> 前往观看</span>
      </a>
      <div class="case-grid" v-if="m.cases.length">
        <div class="case-card" v-for="(c, i) in m.cases" :key="i" @click="onCaseClick(c)">
          <span class="case-anon-tag" :style="{ background: cat.gradient }">{{ cat.title }}</span>
          <div class="case-card-photo">
            <img v-if="getAvatar(c)" :src="getAvatar(c)" :alt="c.patientName" class="case-avatar" />
            <span v-else class="photo-placeholder"><i class="fa-solid fa-user"></i></span>
          </div>
          <div class="case-card-body">
            <div class="cc-row cc-row-1">
              <span class="cc-name">{{ c.patientName }}</span>
              <span class="cc-badge badge-unlearned">未学习</span>
            </div>
            <div class="cc-row cc-row-2">
              <span class="cc-disease">{{ c.disease }}</span>
              <span class="cc-diff" v-if="c.difficulty" :class="'diff-' + c.difficulty[0]">{{ getDifficultyLabel(c.difficulty) }}</span>
              <span class="cc-case-level" v-if="c.difficulty" :class="'cl-' + getCaseLevel(c.difficulty)">{{ c.caseLevel || getCaseLevelLabel(c.difficulty) }}</span>
            </div>
            <div class="cc-row cc-row-3" v-if="c.gender || c.age || c.specialty">
              <span>{{ [c.gender, c.age ? c.age + '岁' : '', c.specialty].filter(Boolean).join(' · ') }}</span>
            </div>
            <div class="cc-row cc-row-4" v-if="c.symptoms && c.symptoms.length">
              <span class="cc-symptom-tag" v-for="s in c.symptoms" :key="s">{{ s }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 质控中心分组：中心 + 名下病例 -->
    <section class="center-group" v-for="(ct, gi) in cat.centers" :key="gi">
      <div class="center-card">
        <div class="center-icon" :style="{ background: cat.gradient }"><i class="fa-solid fa-shield-halved"></i></div>
        <div class="center-info">
          <div class="center-name">{{ ct.name }}</div>
          <div class="center-intro" v-if="ct.intro">{{ ct.intro }}</div>
        </div>
        <span class="center-case-count">{{ ct.cases.length }} 例</span>
      </div>
      <div class="case-grid">
        <div class="case-card" v-for="(c, i) in ct.cases" :key="i" @click="onCaseClick(c)">
          <span class="case-anon-tag" :style="{ background: cat.gradient }">{{ cat.title }}</span>
          <div class="case-card-photo">
            <img v-if="getAvatar(c)" :src="getAvatar(c)" :alt="c.patientName" class="case-avatar" />
            <span v-else class="photo-placeholder"><i class="fa-solid fa-user"></i></span>
          </div>
          <div class="case-card-body">
            <div class="cc-row cc-row-1">
              <span class="cc-name">{{ c.patientName }}</span>
              <span class="cc-badge badge-unlearned">未学习</span>
            </div>
            <div class="cc-row cc-row-2">
              <span class="cc-disease">{{ c.disease }}</span>
              <span class="cc-diff" v-if="c.difficulty" :class="'diff-' + c.difficulty[0]">{{ getDifficultyLabel(c.difficulty) }}</span>
              <span class="cc-case-level" v-if="c.difficulty" :class="'cl-' + getCaseLevel(c.difficulty)">{{ c.caseLevel || getCaseLevelLabel(c.difficulty) }}</span>
            </div>
            <div class="cc-row cc-row-3" v-if="c.gender || c.age || c.specialty">
              <span>{{ [c.gender, c.age ? c.age + '岁' : '', c.specialty].filter(Boolean).join(' · ') }}</span>
            </div>
            <div class="cc-row cc-row-4" v-if="c.symptoms && c.symptoms.length">
              <span class="cc-symptom-tag" v-for="s in c.symptoms" :key="s">{{ s }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getDifficultyLabel, getCaseLevel, getCaseLevelLabel, toast } from '@ai-sp/shared'
import { matchPatientImage } from '@/composables/usePatientImage'
import { MENTOR_CATEGORIES } from '@/data/mentorCategories'

const route = useRoute()
const router = useRouter()

const cat = computed(() => MENTOR_CATEGORIES[route.params.category] || null)

if (!cat.value) {
  router.replace({ name: 'home' })
}

const totalCount = computed(() => {
  if (!cat.value) return 0
  if (cat.value.mentors.length) {
    return cat.value.mentors.reduce((s, m) => s + (m.cases || []).length, 0)
  }
  if (cat.value.centers && cat.value.centers.length) {
    return cat.value.centers.reduce((s, ct) => s + (ct.cases || []).length, 0)
  }
  return 0
})

function onCaseClick() {
  toast.show('SP内容建设中，敬请期待', 'info')
}

function getAvatar(c) {
  return matchPatientImage({ gender: c.gender, age: c.age }, 'patient')
}
</script>

<style scoped>
.mentor-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px 24px 48px;
}

/* Hero */
.mentor-hero {
  border-radius: 16px;
  padding: 28px 32px;
  color: #fff;
  display: flex;
  align-items: center;
  gap: 20px;
  position: relative;
  box-shadow: 0 6px 20px rgba(0,0,0,0.12);
}
.hero-icon {
  width: 60px; height: 60px;
  border-radius: 16px;
  background: rgba(255,255,255,0.18);
  display: flex; align-items: center; justify-content: center;
  font-size: 26px; flex-shrink: 0;
}
.hero-text { flex: 1; min-width: 0; }
.hero-title { font-size: 22px; font-weight: 800; margin-bottom: 6px; letter-spacing: 0.02em; }
.hero-desc { font-size: 13px; opacity: 0.92; line-height: 1.6; }
.hero-count {
  flex-shrink: 0;
  background: rgba(255,255,255,0.18);
  border: 1px solid rgba(255,255,255,0.35);
  padding: 8px 18px;
  border-radius: 24px;
  font-size: 14px; font-weight: 700;
}

/* 导师 + 病例分组 */
.mentor-group { margin-top: 24px; }
.center-group { margin-top: 24px; }
.center-card {
  position: relative;
  display: flex; gap: 16px; align-items: center;
  background: #fff; border-radius: 12px; border: 1px solid #f0f2f5;
  padding: 20px 22px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  margin-bottom: 14px;
}
.center-icon {
  width: 52px; height: 52px; flex-shrink: 0;
  border-radius: 14px; color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 20px;
}
.center-info { flex: 1; min-width: 0; }
.center-name { font-size: 15px; font-weight: 700; color: #111827; }
.center-intro { font-size: 12px; line-height: 1.7; color: #6b7280; margin-top: 6px; text-align: justify; }
.center-case-count {
  position: absolute; top: 16px; right: 16px;
  font-size: 12px; font-weight: 700; color: #6b7280;
  background: #f3f4f6; padding: 4px 12px; border-radius: 10px;
}
.section-title {
  display: flex; align-items: center; gap: 8px;
  font-size: 16px; font-weight: 700; color: #1f2937;
  margin-bottom: 16px;
}
.section-title i { color: #8b5cf6; }
.section-count { font-size: 12px; color: #9ca3af; font-weight: 500; }

/* 导师卡 */
.mentor-card {
  position: relative;
  display: flex; gap: 20px;
  background: #fff; border-radius: 12px;
  border: 1px solid #f0f2f5;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  margin-bottom: 14px;
}
.mentor-avatar {
  width: 120px; height: 120px; flex-shrink: 0;
  border-radius: 14px; overflow: hidden;
  background: #f3f4f6;
  display: flex; align-items: center; justify-content: center;
}
.mentor-photo {
  width: 100%; height: 100%;
  object-fit: cover;
  object-position: center 20%;
}
.mentor-photo-placeholder { font-size: 44px; color: #d1d5db; }
.mentor-info { flex: 1; min-width: 0; }
.mentor-name { font-size: 20px; font-weight: 800; color: #111827; }
.mentor-title { font-size: 13px; color: #6b7280; margin: 4px 0 12px; }
.mentor-intro { font-size: 13px; line-height: 1.9; color: #4b5563; text-align: justify; }
.mentor-case-count {
  position: absolute; top: 16px; right: 16px;
  font-size: 12px; font-weight: 700; color: #6b7280;
  background: #f3f4f6; padding: 4px 12px; border-radius: 10px;
}
.mentor-case-count.count-pending { color: #a16207; background: #fef9c3; }

/* 央视科普 / 媒体报道 */
.mentor-media {
  display: flex; align-items: center; gap: 16px;
  background: #fff; border-radius: 12px;
  border: 1px solid #f0f2f5;
  padding: 16px 20px;
  margin-bottom: 14px;
  text-decoration: none;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  transition: all .2s;
}
.mentor-media:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.10); border-color: #d1d5db; }
.media-icon {
  width: 48px; height: 48px; flex-shrink: 0;
  border-radius: 12px;
  color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 18px;
}
.media-body { flex: 1; min-width: 0; }
.media-platform { font-size: 11px; font-weight: 700; color: #6366f1; letter-spacing: 0.04em; }
.media-title { font-size: 15px; font-weight: 700; color: #111827; margin: 3px 0 4px; }
.media-desc { font-size: 12px; line-height: 1.6; color: #6b7280; }
.media-play {
  flex-shrink: 0;
  display: flex; align-items: center; gap: 6px;
  font-size: 12px; font-weight: 700; color: #4f46e5;
  background: #eef2ff; padding: 8px 16px; border-radius: 20px;
  white-space: nowrap;
}

/* SP 病例卡片 —— 与 SP 病例卡片结构一致 */
.case-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 14px;
}
.case-card {
  position: relative;
  display: flex;
  gap: 16px;
  padding: 18px;
  cursor: pointer;
  border-radius: 14px;
  border: 1px solid #eee;
  transition: all .2s;
  background: #fff;
  overflow: hidden;
}
.case-card:hover {
  box-shadow: 0 4px 16px rgba(0,0,0,0.08);
  border-color: #d1d5db;
}
.case-anon-tag {
  position: absolute; top: 0; right: 0;
  font-size: 9px; font-weight: 700;
  padding: 3px 10px;
  border-radius: 0 13px 0 8px;
  color: #fff;
  letter-spacing: 0.03em;
}
.case-card-photo { flex-shrink: 0; width: 108px; }
.photo-placeholder {
  display: flex; align-items: center; justify-content: center;
  width: 108px; height: 108px;
  border-radius: 50%;
  background: #f5f7fa; color: #C0C4CC;
  font-size: 36px;
}
.case-avatar {
  width: 108px; height: 108px;
  border-radius: 50%;
  object-fit: cover;
  object-position: center top;
  display: block;
}
.case-card-body {
  flex: 1; min-width: 0;
  display: flex; flex-direction: column; gap: 4px;
  justify-content: center;
}
.cc-row { display: flex; align-items: center; }
.cc-row-1 { gap: 6px; }
.cc-name { font-size: 14px; font-weight: 600; color: #303133; }
.cc-badge {
  display: inline-block; font-size: 9px; padding: 0 6px;
  border-radius: 8px; line-height: 1.6; font-weight: 500;
  white-space: nowrap;
}
.badge-unlearned { background: #fff3e0; color: #e65100; }
.cc-row-2 { gap: 8px; flex-wrap: wrap; }
.cc-disease {
  font-size: 10px; color: #67C23A;
  background: #f0f9eb; padding: 1px 6px; border-radius: 4px;
  max-width: 120px; overflow: hidden;
  text-overflow: ellipsis; white-space: nowrap;
}
.cc-diff {
  display: inline-block; font-size: 9px; font-weight: 600;
  padding: 0 5px; border-radius: 3px; line-height: 1.6;
}
.cc-diff.diff-U { background: #e8f5e9; color: #2e7d32; }
.cc-diff.diff-R { background: #e3f2fd; color: #1565c0; }
.cc-diff.diff-F { background: #fce4ec; color: #c62828; font-weight: 700; }
.cc-case-level {
  display: inline-block; font-size: 9px; font-weight: 500;
  padding: 0 5px; border-radius: 3px; line-height: 1.6; white-space: nowrap;
}
.cc-case-level.cl-basic { background: #e8f5e9; color: #2e7d32; }
.cc-case-level.cl-advanced { background: #fff3e0; color: #e65100; }
.cc-case-level.cl-difficult { background: #fce4ec; color: #c62828; }
.cc-row-3 { font-size: 11px; color: #666; }
.cc-row-4 { gap: 4px; flex-wrap: wrap; }
.cc-symptom-tag {
  display: inline-block; font-size: 10px;
  padding: 1px 6px; border-radius: 4px;
  background: #f0f5ff; color: #409eff; white-space: nowrap;
}

@media (max-width: 768px) {
  .mentor-media { flex-wrap: wrap; }
  .mentor-hero { flex-wrap: wrap; padding: 20px; }
  .mentor-card { flex-direction: column; align-items: center; text-align: center; }
  .mentor-avatar { width: 96px; height: 96px; }
  .mentor-intro { text-align: justify; }
}
</style>
