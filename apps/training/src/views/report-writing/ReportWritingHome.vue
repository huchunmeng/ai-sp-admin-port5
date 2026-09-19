<template>
  <div class="rwh-page">
    <div class="rwh-hero">
      <div class="rwh-hero-icon"><i class="fa-solid fa-file-pen"></i></div>
      <div class="rwh-hero-text">
        <h2>影像报告书写训练</h2>
        <p>写一份规范的影像诊断报告，AI 按评分要点逐条评阅</p>
      </div>
      <div class="rwh-hero-stats">
        <div class="rwh-stat"><strong>{{ cases.length }}</strong><span>可练病例</span></div>
        <div class="rwh-stat"><strong>23</strong><span>评分条目</span></div>
      </div>
    </div>

    <div class="rwh-entries">
      <div class="rwh-entry" @click="goTrain">
        <div class="rwh-entry-top">
          <span class="rwh-entry-icon is-train"><i class="fa-solid fa-graduation-cap"></i></span>
          <span class="badge badge-info">训练</span>
        </div>
        <div class="rwh-entry-name">影像报告书写训练</div>
        <div class="rwh-entry-desc">自由挑病例，边写边问 AI伴学，提交后 AI 评阅</div>
        <div class="rwh-entry-foot">
          <span>{{ cases.length }} 例</span>
          <i class="fa-solid fa-chevron-right"></i>
        </div>
      </div>

      <div class="rwh-entry" @click="goExam">
        <div class="rwh-entry-top">
          <span class="rwh-entry-icon is-exam"><i class="fa-solid fa-file-circle-check"></i></span>
          <span class="badge badge-warning">考核</span>
        </div>
        <div class="rwh-entry-name">影像报告书写考核</div>
        <div class="rwh-entry-desc">管理端组卷后发布到本人，整卷计时、不提供 AI伴学</div>
        <div class="rwh-entry-foot">
          <span>等待派发</span>
          <i class="fa-solid fa-chevron-right"></i>
        </div>
      </div>

      <div class="rwh-entry" @click="goRecords">
        <div class="rwh-entry-top">
          <span class="rwh-entry-icon is-records"><i class="fa-solid fa-clock-rotate-left"></i></span>
          <span class="badge badge-info">记录</span>
        </div>
        <div class="rwh-entry-name">训练记录</div>
        <div class="rwh-entry-desc">逐次训练的成绩报告与报告原文，可随时回看</div>
        <div class="rwh-entry-foot">
          <span>{{ recordCount ? recordCount + ' 条' : '暂无记录' }}</span>
          <i class="fa-solid fa-chevron-right"></i>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { TRAINING_CASES, IMAGING_SAMPLES } from '@ai-sp/shared/imaging'
import { readPracticeRecords } from '@/composables/useReportSession'

const router = useRouter()

/** 可练病例 = 已发布且标准报告已录（PRD §5.12.2 / §5.12.6） */
const cases = computed(() => TRAINING_CASES)

/** 题库里还有多少例在草稿态（标准报告待教研录入）——如实告知，别让学生以为系统缺题 */
const draftCount = computed(() => IMAGING_SAMPLES.filter(s => s.status === 'draft').length)

const recordCount = computed(() => readPracticeRecords().length)

const goTrain = () => router.push({ name: 'reportWritingTrain' })
const goExam = () => router.push({ name: 'reportWritingExam' })
const goRecords = () => router.push({ name: 'reportWritingRecords' })
</script>

<style scoped>
.rwh-page { max-width: 1240px; margin: 0 auto; padding: 20px 24px 48px; }
.rwh-hero {
  display: flex; align-items: center; gap: 18px; flex-wrap: wrap;
  background: linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%);
  border: 1px solid #dbeafe; border-radius: 14px; padding: 22px 26px;
}
.rwh-hero-icon {
  width: 54px; height: 54px; flex-shrink: 0; border-radius: 14px;
  background: var(--primary); color: #fff; font-size: 24px;
  display: flex; align-items: center; justify-content: center;
}
.rwh-hero-text { flex: 1; min-width: 240px; }
.rwh-hero-text h2 { margin: 0; font-size: 20px; font-weight: 800; color: #111827; font-family: 'SimHei','Heiti SC','Microsoft YaHei',sans-serif; }
.rwh-hero-text p { margin: 6px 0 0; font-size: 13px; color: #4b5563; line-height: 1.7; }
.rwh-hero-stats { display: flex; gap: 22px; flex-shrink: 0; }
.rwh-stat { display: flex; flex-direction: column; align-items: center; }
.rwh-stat strong { font-size: 20px; color: var(--primary); }
.rwh-stat span { font-size: 11.5px; color: #6b7280; }

.rwh-entries { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 16px; }
.rwh-entry {
  background: #fff; border: 1px solid #f0f2f5; border-radius: 14px;
  padding: 18px; cursor: pointer; transition: all .18s;
  box-shadow: 0 1px 3px rgba(0,0,0,.04);
}
.rwh-entry:hover { border-color: var(--primary); box-shadow: 0 6px 20px rgba(37,99,235,.1); transform: translateY(-2px); }
.rwh-entry-top { display: flex; align-items: flex-start; justify-content: space-between; }
.rwh-entry-icon {
  width: 44px; height: 44px; border-radius: 12px; font-size: 20px;
  display: flex; align-items: center; justify-content: center;
}
.rwh-entry-icon.is-train { background: #eff6ff; color: var(--primary); }
.rwh-entry-icon.is-exam { background: #fef3c7; color: #b45309; }
.rwh-entry-icon.is-records { background: #ecfdf5; color: #059669; }
.rwh-entry-name { font-size: 15px; font-weight: 700; color: #111827; margin-top: 14px; }
.rwh-entry-desc { font-size: 12.5px; color: #6b7280; line-height: 1.8; margin-top: 6px; min-height: 44px; }
.rwh-entry-foot {
  display: flex; align-items: center; justify-content: space-between;
  margin-top: 12px; padding-top: 12px; border-top: 1px solid #f3f4f6;
  font-size: 12px; color: #9ca3af;
}
.rwh-note {
  display: flex; align-items: flex-start; gap: 8px;
  margin-top: 18px; padding: 12px 16px; border-radius: 10px;
  background: #f8fafc; font-size: 12px; color: #9ca3af; line-height: 1.8;
}
.rwh-note i { margin-top: 3px; }
@media (max-width: 860px) { .rwh-entries { grid-template-columns: 1fr; } }
</style>
