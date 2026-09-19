<template>
  <div class="rwx-page">
    <div class="rwx-hero">
      <div class="rwx-hero-icon"><i class="fa-solid fa-file-circle-check"></i></div>
      <div class="rwx-hero-text">
        <h2>影像报告书写考核</h2>
        <p>管理端组卷后发布到本人</p>
      </div>
    </div>

    <div class="rwx-body">
      <div class="rwx-main card">
        <div class="rwx-lock">
          <i class="fa-solid fa-hourglass-half"></i>
          <div class="rwx-lock-title">暂无待作答的考核任务</div>
        </div>
      </div>

      <aside class="rwx-side card">
        <div class="rwx-side-head"><i class="fa-solid fa-lock"></i> 考核模式</div>
        <div class="rwx-side-desc">不提供 AI伴学</div>
        <div class="rwx-side-desc">提交后以参考报告为评分依据</div>
      </aside>
    </div>
  </div>
</template>

<script setup>
// 占位骨架：本期考核侧未实现，保留入口避免链接失效。
</script>

<style scoped>
.rwx-page { max-width: 1240px; margin: 0 auto; padding: 20px 24px 48px; }
.rwx-hero {
  display: flex; align-items: center; gap: 16px;
  background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
  border: 1px solid #fde68a; border-radius: 14px; padding: 20px 24px;
}
.rwx-hero-icon {
  width: 52px; height: 52px; flex-shrink: 0; border-radius: 14px;
  background: #b45309; color: #fff; font-size: 22px;
  display: flex; align-items: center; justify-content: center;
}
.rwx-hero-text h2 { margin: 0; font-size: 19px; font-weight: 800; color: #111827; font-family: 'SimHei','Heiti SC','Microsoft YaHei',sans-serif; }
.rwx-hero-text p { margin: 6px 0 0; font-size: 12.5px; color: #92400e; }
.rwx-body { display: flex; gap: 14px; margin-top: 14px; align-items: flex-start; }
.rwx-main { flex: 1; min-width: 0; overflow: hidden; }
.rwx-side { width: 300px; flex-shrink: 0; }
.rwx-lock { padding: 60px 24px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 10px; }
.rwx-lock i { font-size: 32px; color: #d1d5db; }
.rwx-lock-title { font-size: 15px; font-weight: 700; color: #4b5563; }
.rwx-side-head {
  display: flex; align-items: center; gap: 8px; font-size: 13.5px; font-weight: 700;
  padding: 12px 18px; background: #fffbeb; border-bottom: 1px solid #fef3c7; color: #1f2937;
}
.rwx-side-head i { color: #d97706; }
.rwx-side-desc { font-size: 12.5px; color: #6b7280; line-height: 1.85; padding: 10px 18px 0; }
.rwx-side-desc:last-child { padding-bottom: 16px; }
@media (max-width: 1000px) { .rwx-body { flex-direction: column; } .rwx-side { width: 100%; } }
</style>
