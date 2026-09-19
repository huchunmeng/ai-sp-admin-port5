/* P2 训练病例列表 · PRD §5.3 / §6.1 路由 /report-writing/train
   卡片信息：缩略图 · 部位 + 模态 · 临床简要（脱敏）· 难度 · 已练 N 次 + 最近自评得分 */
(function (w) {
  'use strict';
  var S = w.SEED, H = w.H;

  /* §5.3：按检查部位分组（颅脑 / 头颈 / 胸部 / 腹部 / 骨肌 / 其他） */
  var BODY_ORDER = ['颅脑', '头颈', '胸部', '腹部', '骨肌', '其他'];

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

    var wb = S.WORKBENCH;

    return '<div class="content-inner">' +

      '<div class="page-head">' +
        '<div class="page-head-icon">' + H.icon('film', { size: 21 }) + '</div>' +
        '<div class="page-head-text">' +
          '<div class="page-head-title">训练病例列表</div>' +
          '<div class="page-head-sub">' + H.ed('p2.sub',
            '按检查部位 / 模态 / 难度 / 练习状态筛选') + '</div>' +
        '</div>' +
        '<div class="page-head-extra">' + H.tag('共 ' + S.CASES.length + ' 例', 'info', true) + '</div>' +
      '</div>' +

      '<div class="continue-strip" ' + H.edAttr('p2.continue') + '>' + H.icon('clock', { size: 15 }) +
        '<span><span class="cs-title">' + H.ed('p2.continue.text', '继续上次') + '</span> · ' +
          H.esc(S.CASE_BY_ID[wb.caseId].title) +
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
            '<select class="select" data-act="noop"><option>全部模态</option><option>CT</option><option>MR</option><option>DR</option><option>超声</option></select></div>' +
          '<div class="filter-item"><label>难度</label>' +
            '<select class="select" data-act="noop"><option>全部难度</option><option>U1–U2 基础</option><option>R1–R3 进阶</option><option>F1–F2 疑难</option></select></div>' +
          '<div class="filter-item"><label>练习状态</label>' +
            '<select class="select" data-act="noop"><option>全部</option><option>未练习</option><option>已练过</option><option>已多回合</option></select></div>' +
          '<div class="filter-item">' + H.icon('search', { size: 14 }) +
            '<input class="input" type="search" placeholder="搜索病例标题 / 主诉（脱敏）" data-act="noop"></div>' +
        '</div>' +
      '</div></div>' +

      '<div class="mt12">' + groups + '</div>' +

    '</div>';
  }

  w.P2TrainList = P2TrainList;
})(window);
