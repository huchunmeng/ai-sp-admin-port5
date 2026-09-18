<template>
  <div class="mooc-page" v-if="mod">
    <!-- 页头 Hero -->
    <div class="mooc-hero" :style="{ background: mod.gradient }">
      <div class="hero-icon"><i class="fa-solid" :class="mod.icon"></i></div>
      <div class="hero-text">
        <div class="hero-title">{{ mod.title }}</div>
        <div class="hero-desc">{{ mod.desc }}</div>
      </div>
      <div class="hero-count">{{ mod.courses.length }} 门课程</div>
    </div>

    <!-- 课程卡：一门课一张卡，卡内突出主讲人 -->
    <div class="course-list">
      <a class="course-card" v-for="c in mod.courses" :key="c.url"
         :href="c.url" target="_blank" rel="noopener noreferrer">
        <div class="cc-avatar">
          <img v-if="c.lead && c.lead.avatar" :src="c.lead.avatar" :alt="c.lead.name" class="cc-photo" />
          <span v-else class="cc-photo-placeholder"><i class="fa-solid fa-user-tie"></i></span>
        </div>
        <div class="cc-body">
          <div class="cc-head">
            <span class="cc-name">{{ c.name }}</span>
            <span class="cc-status" :class="'st-' + c.status">{{ STATUS_LABEL[c.status] }}</span>
          </div>
          <div class="cc-teacher">
            <i class="fa-solid fa-user-tie cc-teacher-icon"></i>
            <span class="cc-teacher-name">{{ c.lead ? c.lead.name : '主讲人待补' }}</span>
            <span class="cc-team" v-if="c.teamCount > 1">等 {{ c.teamCount }} 位教师</span>
            <span class="cc-teacher-title" v-if="c.lead && c.lead.title">{{ c.lead.title }}</span>
          </div>
          <div class="cc-intro">{{ c.intro }}</div>
          <div class="cc-meta">
            <span class="cc-platform">{{ c.platform }}</span>
            <span class="cc-term" v-if="c.term">{{ c.term }}</span>
            <span class="cc-pin" v-if="c.pinned"><i class="fa-solid fa-link"></i> 学期绑定链接</span>
          </div>
        </div>
        <span class="cc-go">去学习 <i class="fa-solid fa-arrow-up-right-from-square"></i></span>
      </a>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { MOOC_MODULES, MOOC_STATUS_LABEL } from '@/data/moocModules'

const STATUS_LABEL = MOOC_STATUS_LABEL

const route = useRoute()
const router = useRouter()

const mod = computed(() => MOOC_MODULES.find(m => m.key === route.params.module) || null)

if (!mod.value) {
  router.replace({ name: 'home' })
}
</script>

<style scoped>
.mooc-page {
  max-width: 1100px;
  margin: 0 auto;
  padding: 20px 24px 48px;
}

/* Hero */
.mooc-hero {
  border-radius: 16px;
  padding: 26px 30px;
  color: #fff;
  display: flex;
  align-items: center;
  gap: 20px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, .12);
}
.hero-icon {
  width: 58px; height: 58px; flex-shrink: 0;
  border-radius: 16px;
  background: rgba(255, 255, 255, .18);
  display: flex; align-items: center; justify-content: center;
  font-size: 25px;
}
.hero-text { flex: 1; min-width: 0; }
.hero-title { font-size: 22px; font-weight: 800; margin-bottom: 6px; letter-spacing: .02em; }
.hero-desc { font-size: 13px; opacity: .9; line-height: 1.6; }
.hero-count {
  flex-shrink: 0;
  background: rgba(255, 255, 255, .18);
  border: 1px solid rgba(255, 255, 255, .35);
  padding: 8px 18px;
  border-radius: 24px;
  font-size: 14px; font-weight: 700;
}

/* 课程卡 */
.course-list {
  margin-top: 16px;
  display: flex; flex-direction: column; gap: 12px;
}
.course-card {
  position: relative;
  display: flex; align-items: flex-start; gap: 18px;
  background: #fff; border-radius: 12px;
  border: 1px solid #f0f2f5;
  padding: 20px 22px;
  text-decoration: none;
  box-shadow: 0 1px 3px rgba(0, 0, 0, .04);
  transition: all .2s;
}
.course-card:hover {
  border-color: #dbe3ef;
  box-shadow: 0 4px 16px rgba(0, 0, 0, .08);
  transform: translateY(-1px);
}

/* 主讲人头像 */
.cc-avatar {
  width: 96px; height: 96px; flex-shrink: 0;
  border-radius: 14px; overflow: hidden;
  background: #f3f4f6;
  display: flex; align-items: center; justify-content: center;
}
.cc-photo {
  width: 100%; height: 100%;
  object-fit: cover;
  object-position: center 20%;
}
.cc-photo-placeholder { font-size: 36px; color: #d1d5db; }

.cc-body { flex: 1; min-width: 0; }

.cc-head {
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
}
.cc-name { font-size: 16px; font-weight: 800; color: #111827; }
.cc-status {
  font-size: 11.5px; font-weight: 700;
  padding: 2px 10px; border-radius: 8px;
  white-space: nowrap;
}
.cc-status.st-ok { color: #059669; background: #ecfdf5; }
.cc-status.st-soon { color: #b45309; background: #fffbeb; }
.cc-status.st-ended { color: #9ca3af; background: #f3f4f6; }

/* 主讲人 —— 卡内突出 */
.cc-teacher {
  display: flex; align-items: center; flex-wrap: wrap; gap: 6px;
  margin: 7px 0 9px;
}
.cc-teacher-icon { font-size: 12px; color: #4f46e5; }
.cc-teacher-name { font-size: 14px; font-weight: 700; color: #4f46e5; }
.cc-team { font-size: 12px; font-weight: 500; color: #6b7280; }
.cc-teacher-title { font-size: 12.5px; color: #6b7280; }
.cc-teacher-title::before { content: '·'; margin-right: 6px; color: #d1d5db; }

.cc-intro {
  font-size: 12.5px; line-height: 1.8; color: #4b5563;
  text-align: justify;
}
.cc-meta {
  display: flex; align-items: center; flex-wrap: wrap; gap: 6px 10px;
  margin-top: 9px;
}
.cc-platform { font-size: 11.5px; font-weight: 600; color: #6366f1; }
.cc-term { font-size: 11.5px; color: #9ca3af; }
.cc-pin {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 10.5px; font-weight: 600; color: #b45309;
  background: #fffbeb; border: 1px solid #fde68a;
  padding: 1px 7px; border-radius: 6px;
}

.cc-go {
  flex-shrink: 0; align-self: center;
  display: flex; align-items: center; gap: 6px;
  font-size: 12px; font-weight: 700; color: #4f46e5;
  background: #eef2ff; padding: 8px 15px; border-radius: 20px;
  white-space: nowrap; transition: background .2s;
}
.cc-go i { font-size: 10px; }
.course-card:hover .cc-go { background: #e0e7ff; }

@media (max-width: 768px) {
  .mooc-hero { flex-wrap: wrap; padding: 20px; }
  .course-card { flex-wrap: wrap; }
  .cc-go { align-self: flex-start; }
}
</style>
