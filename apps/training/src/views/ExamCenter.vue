<template>
  <div class="ec-page">
    <div class="ec-hero">
      <div class="ec-hero-left">
        <h2><i class="fa-solid fa-file-circle-check"></i> 在线考试</h2>
        <p>三项考核并行，按统一标准评定成绩</p>
      </div>
      <div class="ec-hero-stats">
        <div class="ec-hero-stat"><strong>3</strong><span>考核项目</span></div>
        <div class="ec-hero-stat"><strong>考核模式</strong><span>不给提示</span></div>
      </div>
    </div>

    <div class="ec-grid">
      <div v-for="item in EXAM_ITEMS" :key="item.key" class="ec-card" @click="open(item)">
        <div class="ec-card-top">
          <div class="ec-icon-wrap" :style="{ background: item.tint, color: item.color }">
            <i class="fa-solid" :class="item.icon"></i>
          </div>
          <span class="ec-badge">考核模式</span>
        </div>
        <div class="ec-name">{{ item.title }}</div>
        <div class="ec-desc">{{ item.desc }}</div>
        <div class="ec-foot">
          <span class="ec-platform">{{ item.platform }}</span>
          <i class="fa-solid ec-arrow" :class="item.external ? 'fa-arrow-up-right-from-square' : 'fa-chevron-right'"></i>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

const EXAM_ITEMS = [
  {
    key: 'interview',
    title: 'AI问诊考核',
    desc: '与AI标准化病人对话，考察问诊思路与信息获取能力',
    platform: 'AI标准化病人考核端',
    icon: 'fa-stethoscope',
    tint: '#eff6ff',
    color: '#2563eb',
    external: true,
    url: 'https://aisp.mvwchina.com/training-pad/'
  },
  {
    key: 'theory',
    title: '理论考试',
    desc: '正式考核评估认证，按标准答案计分',
    platform: '在线考试平台',
    icon: 'fa-file-circle-check',
    tint: '#fef3c7',
    color: '#d97706',
    external: true,
    url: 'https://examon.mvwchina.com/'
  },
  {
    key: 'report',
    title: '影像报告书写考核',
    desc: '不给提示，按金标准报告评定书写质量',
    platform: '本系统内置影像数据',
    icon: 'fa-clipboard-check',
    tint: '#eef2ff',
    color: '#4f46e5',
    external: false,
    mode: 'exam'
  }
]

function open(item) {
  if (item.external) {
    window.open(item.url, '_blank', 'noopener,noreferrer')
    return
  }
  router.push({ name: 'reportWriting', params: { mode: item.mode } })
}
</script>

<style scoped>
.ec-page { padding: 24px; max-width: 1100px; margin: 0 auto; }

.ec-hero {
  background: linear-gradient(135deg, #4f46e5 0%, #312e81 100%);
  color: #fff; border-radius: 14px; padding: 16px 28px;
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 20px;
}
.ec-hero-left h2 { font-size: 17px; font-weight: 700; display: flex; align-items: center; gap: 10px; margin-bottom: 2px; }
.ec-hero-left p { font-size: 12px; opacity: 0.85; }
.ec-hero-stats { display: flex; gap: 32px; }
.ec-hero-stat { text-align: center; }
.ec-hero-stat strong { display: block; font-size: 18px; font-weight: 700; }
.ec-hero-stat span { font-size: 11px; opacity: 0.75; }

.ec-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
.ec-card {
  background: #fff; border: 1px solid #e5e7eb; border-radius: 14px;
  padding: 18px; cursor: pointer; transition: all .2s;
  display: flex; flex-direction: column; gap: 8px;
}
.ec-card:hover { border-color: #4f46e5; box-shadow: 0 4px 16px rgba(0,0,0,0.08); transform: translateY(-2px); }
.ec-card-top { display: flex; align-items: center; justify-content: space-between; }
.ec-icon-wrap {
  width: 44px; height: 44px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center; font-size: 20px;
}
.ec-badge {
  font-size: 11px; font-weight: 600; color: #475569;
  background: #f1f5f9; padding: 3px 9px; border-radius: 8px;
}
.ec-name { font-size: 15px; font-weight: 700; color: #1f2937; }
.ec-desc { font-size: 12px; color: #6b7280; line-height: 1.6; flex: 1; }
.ec-foot {
  display: flex; align-items: center; justify-content: space-between;
  padding-top: 10px; border-top: 1px solid #f3f4f6;
}
.ec-platform { font-size: 11px; color: #9ca3af; }
.ec-arrow { color: #d1d5db; font-size: 12px; transition: color .2s; }
.ec-card:hover .ec-arrow { color: #4f46e5; }
</style>
