/* P1 模块首页 · PRD §6.1 路由 /report-writing
   两个独立入口，本页不提供模式切换（老胡拍板）。 */
(function (w) {
  'use strict';
  var S = w.SEED, H = w.H;

  function P1Home() {
    var rounds = H.sum(S.CASES, function (c) { return c.trainedRounds; });
    var touched = S.CASES.filter(function (c) { return c.trainedRounds > 0; }).length;
    var latest = S.CASES.filter(function (c) { return c.lastSelfReview != null; })
      .sort(function (a, b) { return a.lastAt < b.lastAt ? 1 : -1; })[0];
    var todo = S.EXAM_TASKS.filter(function (t) { return t.state === '待作答' && t.actionable; }).length;

    return '<div class="content-inner">' +

      '<div class="page-head">' +
        '<div class="page-head-icon">' + H.icon('file-pen', { size: 21 }) + '</div>' +
        '<div class="page-head-text">' +
          '<div class="page-head-title" ' + H.edAttr('p1.title') + '>' + H.ed('p1.title', '影像报告书写训练') + '</div>' +
          '<div class="page-head-sub">' + H.ed('p1.sub',
            '覆盖影像报告书写的**完整链路**：阅片 → 分段书写 → 三级提示 → 逐条自评 → 对照差异') + '</div>' +
        '</div>' +
        '<div class="page-head-extra">' +
          H.tag('医路慧影 · 训练端', 'info', true) +
          H.tag('东南大学医学院', '', true) +
        '</div>' +
      '</div>' +

      '<div class="banner">' + H.icon('info', { size: 15 }) +
        '<span>' + H.ed('p1.banner.noSwitch',
          '训练与考核是**两个独立入口**：训练入口面向自主学习，考核入口只显示**管理端发布**的任务。本页**不提供模式切换**。') +
        '</span>' +
      '</div>' +

      '<div class="entry-grid">' +

        '<div class="entry-card" data-act="go" data-page="p2">' +
          '<div class="entry-ico">' + H.icon('file-pen', { size: 21 }) + '</div>' +
          '<div class="entry-title">' + H.ed('p1.entry.train.title', '训练模式') + '</div>' +
          '<div class="entry-sub">' + H.ed('p1.entry.train.sub',
            '自主选择病例，从阅片到对照自评走完 T0–T4，可反复重写、不限回合') + '</div>' +
          '<ul class="entry-points">' +
            '<li>' + H.icon('check', { size: 11 }) + '<span>' + H.ed('p1.entry.train.p1',
              '**分阶段书写**：T0 阅片 → T1 检查技术 → T2 影像所见 → T3 诊断意见 → T4 对照自评') + '</span></li>' +
            '<li>' + H.icon('check', { size: 11 }) + '<span>' + H.ed('p1.entry.train.p2',
              '**三级提示阶梯**：L1 体裁 → L2 指向 → L3 要点，配额按「段 × 回合」发放，用完不补') + '</span></li>' +
            '<li>' + H.icon('check', { size: 11 }) + '<span>' + H.ed('p1.entry.train.p3',
              '**逐条对照**：按 R1 表 23 条自评，再看参考报告与系统点评') + '</span></li>' +
          '</ul>' +
          '<div class="entry-go">进入训练病例列表 ' + H.icon('next', { size: 14 }) + '</div>' +
        '</div>' +

        '<div class="entry-card exam" data-act="go" data-page="p5">' +
          '<div class="entry-ico">' + H.icon('clipboard-check', { size: 21 }) + '</div>' +
          '<div class="entry-title">' + H.ed('p1.entry.exam.title', '考核模式') + '</div>' +
          '<div class="entry-sub">' + H.ed('p1.entry.exam.sub',
            '只显示**管理端发布**的考核任务；病例由管理端组卷，学员不能自选，也不能指定例数') + '</div>' +
          '<ul class="entry-points">' +
            '<li>' + H.icon('check', { size: 11 }) + '<span>' + H.ed('p1.entry.exam.p1',
              '**整卷作答**：一题多例，倒计时按整卷走；单例锁定后不可再改') + '</span></li>' +
            '<li>' + H.icon('check', { size: 11 }) + '<span>' + H.ed('p1.entry.exam.p2',
              '**考核期无训练辅助**：三级提示全部关闭，覆盖清单不下发') + '</span></li>' +
            '<li>' + H.icon('check', { size: 11 }) + '<span>' + H.ed('p1.entry.exam.p3',
              '**成绩页**：按例给分并透视到条目；不可评条目按本期能力基线折算') + '</span></li>' +
          '</ul>' +
          '<div class="entry-go">查看我的考核任务 ' + H.icon('next', { size: 14 }) + '</div>' +
        '</div>' +

        '<div class="entry-note">' + H.icon('bulb', { size: 15, style: 'flex-shrink:0;margin-top:2px' }) +
          '<span>' + H.ed('p1.entry.note',
            '本模块**只管报告书写训练**：影像调窗 / 测量 / MPR 等阅片工具由影像教学底座提供。') +
          '</span>' +
        '</div>' +
      '</div>' +

      '<div class="home-strip">' +
        '<div class="mini-card"><div class="mc-k">训练病例</div><div class="mc-v">' + S.CASES.length + '</div>' +
          '<div class="mc-sub">已练过 ' + touched + ' 例</div></div>' +
        '<div class="mini-card"><div class="mc-k">已完成回合</div><div class="mc-v">' + rounds + '</div>' +
          '<div class="mc-sub">提交 T4 自评才计数</div></div>' +
        '<div class="mini-card"><div class="mc-k">最近一次自评</div><div class="mc-v">' +
          (latest ? latest.lastSelfReview : '—') + '</div>' +
          '<div class="mc-sub">' + (latest ? H.esc(latest.title) + ' · ' + H.esc(latest.lastAt) : '暂无记录') + '</div></div>' +
        '<div class="mini-card hint"><div class="mc-k">待作答考核任务</div><div class="mc-v">' + todo + ' 项</div>' +
          '<div class="mc-sub">开放窗口内可领取</div></div>' +
      '</div>' +

    '</div>';
  }

  w.P1Home = P1Home;
})(window);
