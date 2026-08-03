<template>
  <div class="vr-lab-page">
    <div class="vr-hero">
      <button class="back-btn" @click="goBack"><i class="fa-solid fa-arrow-left"></i></button>
      <div class="hero-text">
        <h2><i class="fa-solid fa-vr-cardboard"></i> VR研习空间</h2>
        <p>沉浸式虚拟仿真学习资源，融合影像与解剖，从宏观到微观探索医学深层知识</p>
      </div>
    </div>

    <!-- 项目一：磁共振成像 -->
    <div class="vr-card">
      <div class="vr-card-head">
        <div class="vr-icon" style="background:linear-gradient(135deg,#0d9488,#14b8a6);">
          <i class="fa-solid fa-magnet"></i>
        </div>
        <div class="vr-card-title">
          <h3>磁共振成像原理与序列应用虚拟仿真实验</h3>
          <span class="vr-badge"><i class="fa-solid fa-award"></i> 国家级一流本科课程</span>
        </div>
      </div>
      <div class="vr-card-body">
        <div class="vr-intro">
          <p class="vr-desc">2023 年获评国家级一流本科课程，已登陆国家虚拟仿真实验教学平台。根据生物医学工程专业《医学成像原理》教学要求，设计 <strong>4 个递进实验模块</strong>：磁共振物理基础、磁共振信号基础、成像设备和原理认知、扫描和成像质量控制和评估，并设置评分与讨论环节，强化学习成效。</p>
          <p class="vr-stats"><i class="fa-solid fa-chart-line"></i> 上线以来累计浏览量超 <strong>35000</strong> 次，实验参与量 <strong>18000+</strong> 人次，其中 <strong>8000+</strong> 人给予 5 分评价</p>
        </div>
        <div class="vr-cover">
          <img src="/images/vr-space/mri-cover.png" alt="磁共振成像虚拟仿真实验" />
        </div>
      </div>
      <div class="vr-card-foot">
        <button class="vr-btn vr-btn-primary" @click="openMRI">
          <i class="fa-solid fa-arrow-up-right-from-square"></i> 进入课程
        </button>
      </div>
    </div>

    <!-- 项目二：VR脑解剖图谱 -->
    <div class="vr-card">
      <div class="vr-card-head">
        <div class="vr-icon" style="background:linear-gradient(135deg,#312e81,#4f46e5);">
          <i class="fa-solid fa-brain"></i>
        </div>
        <div class="vr-card-title">
          <h3>VR脑解剖图谱教学</h3>
          <span class="vr-badge vr-badge-blue"><i class="fa-solid fa-cube"></i> 三维结构模型 · 体绘制影像</span>
        </div>
      </div>
      <div class="vr-card-body">
        <div class="vr-intro">
          <p class="vr-desc">本教学系统面向网页端，通过三维结构模型与体绘制影像，共同呈现脑部的整体外形、内部层次以及不同结构之间的空间关系。三维模型可选择展示脑叶、脑功能分区、脑室和血管等内容，便于观察各部分的位置与联系；体绘制影像可从不同方向查看，并结合冠状面、矢状面和横断面图像，了解脑部不同位置的结构。学习者可根据教学需要选择展示内容，调整观察角度和切面位置，并结合文字介绍与观察提示，逐步建立从整体到局部、从外部到内部的认识。相关内容适用于课堂讲解、课程演示和自主学习。</p>
        </div>
        <div class="vr-gallery">
          <img src="/images/vr-space/brain-atlas-1.jpeg" alt="VR脑解剖图谱 - 三维结构" />
          <img src="/images/vr-space/brain-atlas-2.jpeg" alt="VR脑解剖图谱 - 体绘制影像" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

function goBack() {
  router.push({ name: 'home' })
}

function openMRI() {
  window.open('https://xnfz.seu.edu.cn/exp/272.html', '_blank')
}
</script>

<style scoped>
.vr-lab-page { padding: 24px; max-width: 980px; margin: 0 auto; }

/* ─── Hero ─── */
.vr-hero {
  display: flex; align-items: center; gap: 16px;
  background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%);
  color: #fff; border-radius: 14px; padding: 18px 24px; margin-bottom: 22px;
  box-shadow: 0 6px 20px rgba(37, 99, 235, 0.18);
}
.back-btn {
  flex-shrink: 0; width: 34px; height: 34px; border-radius: 8px;
  border: 1px solid rgba(255,255,255,.5); background: rgba(255,255,255,.15);
  color: #fff; cursor: pointer; font-size: 14px;
}
.back-btn:hover { background: rgba(255,255,255,.3); }
.hero-text h2 { margin: 0 0 4px; font-size: 18px; font-weight: 700; display: flex; align-items: center; gap: 10px; }
.hero-text p { margin: 0; font-size: 12px; opacity: .85; }

/* ─── 项目卡片 ─── */
.vr-card {
  background: #fff; border: 1px solid #f0f2f5; border-radius: 14px;
  padding: 22px 24px; margin-bottom: 20px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  transition: box-shadow .2s;
}
.vr-card:hover { box-shadow: 0 6px 20px rgba(0,0,0,0.08); }
.vr-card-head { display: flex; align-items: center; gap: 14px; margin-bottom: 14px; }
.vr-icon {
  flex-shrink: 0; width: 46px; height: 46px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-size: 20px;
}
.vr-card-title h3 { margin: 0 0 4px; font-size: 16px; font-weight: 700; color: #1f2937; }
.vr-badge {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 11px; font-weight: 600; padding: 2px 10px; border-radius: 10px;
  background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0;
}
.vr-badge-blue { background: #eff6ff; color: #1d4ed8; border-color: #bfdbfe; }

.vr-card-body { display: flex; gap: 20px; align-items: flex-start; }
.vr-intro { flex: 1; min-width: 0; }
.vr-desc { margin: 0 0 10px; font-size: 13px; line-height: 1.8; color: #4b5563; text-align: justify; }
.vr-stats { margin: 0; font-size: 12px; color: #6b7280; background: #eff6ff; border: 1px solid #dbeafe; border-radius: 8px; padding: 10px 12px; line-height: 1.7; }
.vr-stats i { color: #2563eb; margin-right: 4px; }
.vr-cover { flex-shrink: 0; width: 300px; }
.vr-cover img { width: 100%; border-radius: 10px; border: 1px solid #eef2f7; display: block; }

.vr-gallery { display: flex; gap: 16px; flex: 1; min-width: 0; }
.vr-gallery img { flex: 1; min-width: 0; border-radius: 10px; border: 1px solid #eef2f7; display: block; }

.vr-card-foot {
  display: flex; align-items: center; justify-content: flex-end;
  gap: 12px; margin-top: 16px; padding-top: 14px; border-top: 1px solid #f1f5f9;
}
.vr-btn {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 9px 24px; border-radius: 8px; font-size: 14px; font-weight: 600; font-family: inherit;
  cursor: pointer; transition: all .15s;
}
.vr-btn-primary { background: var(--primary); border: 1px solid var(--primary); color: #fff; }
.vr-btn-primary:hover { background: var(--primary-dark); border-color: var(--primary-dark); box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25); }

@media (max-width: 720px) {
  .vr-card-body { flex-direction: column; }
  .vr-cover { width: 100%; }
  .vr-gallery { flex-direction: column; }
}
</style>
