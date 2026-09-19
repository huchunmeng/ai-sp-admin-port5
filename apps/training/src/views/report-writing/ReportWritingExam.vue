<template>
  <div class="rwx-page">
    <div class="rwx-hero">
      <div class="rwx-hero-icon"><i class="fa-solid fa-file-circle-check"></i></div>
      <div class="rwx-hero-text">
        <h2>影像报告书写考核</h2>
        <p>由管理端组卷后发布到本人 · 整卷计时 · 不提供任何提示</p>
      </div>
    </div>

    <!-- 提示栏锁定态 -->
    <div class="rwx-body">
      <div class="rwx-main card">
        <div class="rwx-lock">
          <i class="fa-solid fa-hourglass-half"></i>
          <div class="rwx-lock-title">暂无待作答的考核任务</div>
          <div class="rwx-lock-desc">
            考核任务由管理端创建并发布到本人，发布后在此领取作答。当前没有已发布且未截止的任务。
          </div>
        </div>

        <div class="rwx-flow">
          <div class="rwx-flow-title">考核侧与训练侧的差别（本期口径）</div>
          <div class="rwx-flow-row"><span class="rwx-k">选病例</span><span class="rwx-v">学员<b>不自选</b>病例，等管理端派发整卷</span></div>
          <div class="rwx-flow-row"><span class="rwx-k">提示</span><span class="rwx-v">考核模式<b>不提供任何提示</b>，提示栏锁定</span></div>
          <div class="rwx-flow-row"><span class="rwx-k">金标准</span><span class="rwx-v">默认不下发；仅当任务开启「交卷后开放金标准」才可见</span></div>
          <div class="rwx-flow-row"><span class="rwx-k">计时</span><span class="rwx-v">整卷计时或分例计时，由任务配置决定</span></div>
          <div class="rwx-flow-row"><span class="rwx-k">评分</span><span class="rwx-v">以金标准报告 + R1 表逐条判定，服务端产出</span></div>
        </div>
      </div>

      <aside class="rwx-side card">
        <div class="rwx-side-head"><i class="fa-solid fa-lock"></i> 考核模式</div>
        <div class="rwx-side-desc">本模式不提供任何提示，请独立完成报告书写</div>
        <div class="rwx-side-desc">提交后以金标准报告为评分依据</div>
      </aside>
    </div>

    <div class="rwx-note">
      <i class="fa-solid fa-circle-info"></i>
      本页为占位页：考核侧界面（任务清单 / 考核工作台 / 评分结果）与训练侧同期设计、**本期未实现**，
      待管理端组卷与派发能力就绪后一并开发。当前保留入口以避免链接失效。
    </div>
  </div>
</template>

<script setup>
// 占位骨架：不接数据、不做业务，只保证入口可达、口径可见。
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
.rwx-lock { padding: 40px 24px 30px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 8px; }
.rwx-lock i { font-size: 32px; color: #d1d5db; }
.rwx-lock-title { font-size: 15px; font-weight: 700; color: #4b5563; }
.rwx-lock-desc { font-size: 12.5px; color: #9ca3af; line-height: 1.8; max-width: 460px; }
.rwx-flow { border-top: 1px solid #f3f4f6; padding: 14px 20px 18px; }
.rwx-flow-title { font-size: 13px; font-weight: 700; color: #374151; margin-bottom: 10px; }
.rwx-flow-row { display: flex; gap: 14px; font-size: 12.5px; line-height: 2; }
.rwx-k { flex-shrink: 0; width: 58px; color: #9ca3af; }
.rwx-v { color: #4b5563; }
.rwx-side-head {
  display: flex; align-items: center; gap: 8px; font-size: 13.5px; font-weight: 700;
  padding: 12px 18px; background: #fffbeb; border-bottom: 1px solid #fef3c7; color: #1f2937;
}
.rwx-side-head i { color: #d97706; }
.rwx-side-desc { font-size: 12.5px; color: #6b7280; line-height: 1.85; padding: 10px 18px 0; }
.rwx-side-desc:last-child { padding-bottom: 16px; }
.rwx-note {
  display: flex; align-items: flex-start; gap: 8px;
  margin-top: 16px; padding: 12px 16px; border-radius: 10px;
  background: #f8fafc; font-size: 12px; color: #9ca3af; line-height: 1.8;
}
.rwx-note i { margin-top: 3px; }
@media (max-width: 1000px) { .rwx-body { flex-direction: column; } .rwx-side { width: 100%; } }
</style>
