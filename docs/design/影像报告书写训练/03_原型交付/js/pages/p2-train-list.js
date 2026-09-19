/* P2 训练样本列表 · PRD §5.3 / §6.1 路由 /report-writing/samples
   卡片信息：缩略图 · 部位 + 模态 · 临床简要（脱敏）· 难度 · 已练 N 次 + 最近自评得分 */
(function (w) {
  'use strict';
  var S = w.SEED, H = w.H;

  var BODY_ORDER = ['颅脑', '头颈', '胸部', '腹部', '骨肌'];

  function caseCard(c) {
    var practiced = c.trainedRounds > 0;
    return '' +
      '<div class="case-card" data-act="go" data-page="p3" data-case="' + c.id + '">' +
        '<div class="case-thumb">' +
          '<i>' + H.icon(c.ico, { size: 32 }) + '</i>' +
          '<span class="case-modal">' + H.esc(c.modality) + ' · ' + H.esc(c.bodyPart) + '</span>' +
          '<span class="case-prac' + (practiced ? '' : ' none') + '">' +
            (practiced ? '已练 ' + c.trainedRounds + ' 次' : '未练习') + '</span>' +
        '</div>' +
        '<div class="case-body">' +
          '<div class="case-title">' + H.esc(c.title) + '</div>' +
          '<div class="case-clinical">' + H.esc(c.clinical) + '</div>' +
          '<div class="case-foot">' +
            H.levelTag(c) +
            (c.trainedRounds >= 2 ? H.tag('已多回合', 'diff-ok', true) : '') +
            '<span class="cf-stats">' +
              '回合 <b>' + c.trainedRounds + '</b> · ' +
              (c.lastSelfReview != null ? '最近自评 <b>' + c.lastSelfReview + '</b>' : '最近自评 <b>—</b>') +
            '</span>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function P2TrainList() {
    var byBody = {};
    S.CASES.forEach(function (c) { (byBody[c.bodyPart] = byBody[c.bodyPart] || []).push(c); });

    var groups = BODY_ORDER.filter(function (b) { return byBody[b]; }).map(function (b) {
      return '<div class="group-head">' + H.icon('grid', { size: 14 }) +
          '<span>' + H.esc(b) + '</span>' +
          '<span class="gh-count">' + byBody[b].length + ' 例</span>' +
        '</div>' +
        '<div class="case-grid">' + byBody[b].map(caseCard).join('') + '</div>';
    }).join('');

    var last = S.CASES.filter(function (c) { return c.trainedRounds > 0; })
      .sort(function (a, b) { return a.lastAt < b.lastAt ? 1 : -1; })[0];
    var wb = S.WORKBENCH;

    return '<div class="content-inner">' +

      '<div class="page-head">' +
        '<div class="page-head-icon">' + H.icon('film', { size: 21 }) + '</div>' +
        '<div class="page-head-text">' +
          '<div class="page-head-title">训练样本列表</div>' +
          '<div class="page-head-sub">' + H.ed('p2.sub',
            '按部位 / 模态 / 难度 / 练习状态筛选；**已练 N 次**只统计已完成回合（提交 T4 自评才算完成）') + '</div>' +
        '</div>' +
        '<div class="page-head-extra">' + H.tag('共 ' + S.CASES.length + ' 例', 'info', true) + '</div>' +
      '</div>' +

      '<div class="continue-strip" ' + H.edAttr('p2.continue') + '>' + H.icon('clock', { size: 15 }) +
        '<span>' + H.ed('p2.continue.text',
          '<span class="cs-title">继续上次</span> · ' + H.esc(S.CASE_BY_ID[wb.caseId].title)) +
          ' <span class="cs-meta">第 ' + wb.roundIndex + ' 回合 · 上次停在 ' + wb.stage + ' · 草稿已保存</span>' +
        '</span>' +
        '<button class="btn primary sm" type="button" data-act="go" data-page="p3">' +
          H.icon('next', { size: 13 }) + '继续书写</button>' +
      '</div>' +

      '<div class="card"><div class="card-body tight">' +
        '<div class="filter-row">' +
          '<div class="filter-item"><label>部位</label>' +
            '<select class="select" data-act="noop"><option>全部部位</option>' +
            BODY_ORDER.map(function (b) { return '<option>' + b + '</option>'; }).join('') + '</select></div>' +
          '<div class="filter-item"><label>模态</label>' +
            '<select class="select" data-act="noop"><option>全部模态</option><option>CT</option><option>MR</option><option>DR</option></select></div>' +
          '<div class="filter-item"><label>难度</label>' +
            '<select class="select" data-act="noop"><option>全部难度</option><option>U1–U2 基础</option><option>R1–R3 进阶</option><option>F1–F2 疑难</option></select></div>' +
          '<div class="filter-item"><label>练习状态</label>' +
            '<select class="select" data-act="noop"><option>全部</option><option>未练习</option><option>已练过</option><option>已多回合</option></select></div>' +
          '<div class="filter-item">' + H.icon('search', { size: 14 }) +
            '<input class="input" type="search" placeholder="搜索样本标题 / 主诉（脱敏）" data-act="noop"></div>' +
        '</div>' +
      '</div></div>' +

      '<div class="mt12">' + groups + '</div>' +

      '<div class="card mt16">' +
        '<div class="card-head">' + H.icon('list', { size: 15 }) +
          '<span>列表状态示例</span>' +
          '<span class="card-tag">加载中 · 空态 · 错误态</span>' +
        '</div>' +
        '<div class="card-body">' +
          '<div class="section-title">' + H.icon('refresh', { size: 13 }) +
            '<span>加载中（骨架屏）</span><span class="st-badge">首次进入 / 切筛选</span></div>' +
          '<div class="skeleton-grid">' +
            [0, 1, 2].map(function () {
              return '<div class="sk-card"><div class="sk-thumb"></div>' +
                '<div class="sk-line w60"></div><div class="sk-line"></div><div class="sk-line w40"></div></div>';
            }).join('') +
          '</div>' +

          '<div class="divider"></div>' +

          '<div class="section-title">' + H.icon('search', { size: 13 }) +
            '<span>空态</span><span class="st-badge">筛选无结果 / 全部练完</span></div>' +
          '<div class="empty">' +
            '<div class="empty-ico">' + H.icon('search', { size: 34 }) + '</div>' +
            '<div class="empty-title">当前筛选下没有样本</div>' +
            '<div class="empty-desc">' + H.rich('换一个部位或难度；也可点「清空筛选」回到全部样本。列表为空时**不显示**"继续上次"入口。') + '</div>' +
            '<button class="btn sm" type="button" data-act="noop">' + H.icon('refresh', { size: 13 }) + '清空筛选</button>' +
          '</div>' +

          '<div class="divider"></div>' +

          '<div class="section-title">' + H.icon('warn', { size: 13 }) +
            '<span>加载失败</span><span class="st-badge">样本服务不可用</span></div>' +
          '<div class="banner error mb0">' + H.icon('warn', { size: 15 }) +
            '<span>' + H.rich('样本列表加载失败（`500 SAMPLE_SERVICE_UNAVAILABLE`）。已练次数与自评得分来自学情服务，若仅学情服务不可用，则卡片**照常展示样本**、只把统计数字降级为 `—`，不整页报错。') + '</span>' +
            '<span class="banner-close" data-act="noop">' + H.icon('close', { size: 13 }) + '</span>' +
          '</div>' +

          (last ? '<div class="tiny muted mt12">最近活动：' + H.esc(last.title) + ' · ' + H.esc(last.lastAt) + '</div>' : '') +
        '</div>' +
      '</div>' +

    '</div>';
  }

  w.P2TrainList = P2TrainList;
})(window);
