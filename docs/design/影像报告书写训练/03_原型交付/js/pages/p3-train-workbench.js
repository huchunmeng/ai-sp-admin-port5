/* P3 训练工作台 · PRD §5.2.1 五阶段 T0–T4 / §6.2 线框
   左：一般信息条 + 三视图 + 报告三段；右：提示栏（覆盖清单 + 三级提示 + 配额）。 */
(function (w) {
  'use strict';
  var S = w.SEED, H = w.H;

  var STAGES = [
    { no: 'T0', name: '阅片' },
    { no: 'T1', name: '检查技术' },
    { no: 'T2', name: '影像所见' },
    { no: 'T3', name: '诊断意见' },
    { no: 'T4', name: '对照自评' }
  ];

  function segKeyOfStage(stage) {
    return stage === 'T1' ? 'technique' : stage === 'T2' ? 'findings' : stage === 'T3' ? 'impression' : null;
  }

  function stageBar(wb) {
    var curIdx = -1;
    STAGES.forEach(function (s, i) { if (s.no === wb.stage) curIdx = i; });
    if (curIdx < 0) curIdx = STAGES.length - 1;

    return '<div class="stage-bar">' + STAGES.map(function (s, i) {
      var cls = i < curIdx ? 'done' : i === curIdx ? 'current' : 'locked';
      var inner = '<span class="stage-no">' + s.no + '</span><span>' + H.esc(s.name) + '</span>';
      var attrs = 'data-act="stage" data-stage="' + s.no + '"';
      if (i <= curIdx) attrs = 'data-act="go" data-page="p3"';
      return '<div class="stage ' + cls + '" ' + attrs + '>' + inner + '</div>' +
        (i < STAGES.length - 1 ? '<span class="stage-sep"></span>' : '');
    }).join('') + '</div>';
  }

  function infoBar(wb) {
    var cells = wb.info.map(function (r) {
      var cls = 'info-copy' + (r.masked ? ' off' : '');
      /* §5.4.2：一键**复制进报告对应位置**（不是复制到剪贴板），复制动作埋点 */
      var copy = r.masked
        ? '<span class="' + cls + '" title="全掩字段不提供复制">不可复制</span>' +
          '<span class="tiny" style="color:var(--text-tertiary)">本期不纳入评分</span>'
        : '<span class="' + cls + '" data-act="copy" data-v="' + H.esc(r.v) + '" title="写入报告一般信息段对应位置（埋点记录）">复制到报告</span>';
      return '<div class="info-item">' +
        '<span class="info-k">' + H.esc(r.k) + '</span>' +
        '<span class="info-v' + (r.masked ? ' masked' : '') + '">' + H.esc(r.v) + '</span>' +
        copy +
        (r.note ? '<span class="tiny" style="color:var(--text-tertiary)">(' + H.esc(r.note) + ')</span>' : '') +
      '</div>';
    }).join('');

    return '<div class="info-bar">' + cells +
      '<div class="info-item info-clinical">' +
        '<span class="info-k">临床主要信息</span>' +
        '<span class="info-v">' + H.esc(wb.clinicalText) + '</span>' +
        '<span class="info-copy" data-act="copy" data-v="' + H.esc(wb.clinicalText) + '" title="写入报告一般信息段对应位置（埋点记录）">复制到报告</span>' +
      '</div>' +
    '</div>';
  }

  function viewer() {
    var slots = [
      { label: '轴位 Axial', slice: '38 / 96' },
      { label: '冠状位 Coronal', slice: '24 / 74' },
      { label: '矢状位 Sagittal', slice: '31 / 82' }
    ];
    return '<div class="viewer">' + slots.map(function (s) {
      return '<div class="view-slot">' +
        '<div class="view-canvas">' +
          '<div class="view-cross"></div>' +
          '<span class="view-ph">' + H.icon('image', { size: 26 }) + '</span>' +
          '<span class="view-ph-txt">影像占位</span>' +
          '<span class="view-slice">' + H.esc(s.slice) + '</span>' +
          '<span class="view-lock">' + H.icon('lock', { size: 11 }) + ' 仅训练浏览</span>' +
        '</div>' +
        '<div class="view-foot"><span class="view-label">' + H.esc(s.label) + '</span>' +
          '<span class="view-wl">W 400 · L 40</span></div>' +
      '</div>';
    }).join('') + '</div>' +
    '<div class="viewer-note">' + H.rich('三视图**互不联动**，各自独立翻层。') +
      '<br>' + H.esc(wbNote()) + '</div>';
  }

  var wbNote = function () { return S.WORKBENCH.viewNotes; };

  function segList(wb) {
    var activeKey = segKeyOfStage(wb.stage);
    return '<div class="seg-list">' + S.SEGMENTS.map(function (s) {
      var val = wb.draft[s.key] || '';
      var isActive = s.key === activeKey;
      var filled = val.trim().length > 0;
      var cls = isActive ? 'active' : (filled ? 'done' : '');
      var flag = isActive ? '当前阶段' : (filled ? '已填写' : '待填写');
      var req = s.trainingRequired ? '训练必填' : '训练可空';
      return '' +
        '<div class="seg ' + cls + '" data-seg="' + s.key + '">' +
          '<div class="seg-head">' + H.icon(filled ? 'check' : 'pen', { size: 13 }) +
            '<span>' + H.esc(s.name) + '</span>' +
            '<span class="seg-flag">' + H.esc(flag) + ' · ' + H.esc(req) + '</span>' +
            '<span class="seg-count" data-count-of="' + s.key + '">' + val.length + ' / ' + s.limit + '</span>' +
          '</div>' +
          '<textarea class="seg-textarea" data-act="draft" data-seg-key="' + s.key + '" ' +
            'maxlength="' + s.limit + '" rows="' + (s.key === 'technique' ? 2 : 4) + '" ' +
            'placeholder="在此书写「' + H.esc(s.name) + '」…">' + H.esc(val) + '</textarea>' +
          (isActive ? '<div class="seg-readonly-hint">当前处于 ' + H.esc(wb.stage) + ' · ' +
            H.esc(wb.stageHint) + '</div>' : '') +
        '</div>';
    }).join('') + '</div>';
  }

  function tipPanel(wb) {
    var legend = wb.coverage.map(function (c) {
      var mark = c.mark === 'ok' ? '✓' : c.mark === 'miss' ? '✗' : '?';
      return '<div class="tip-legend-row">' +
        '<span class="tip-mark ' + c.mark + '">' + mark + '</span>' +
        '<span class="tip-legend-txt"><b>' + H.esc(c.name) + '</b>：' + H.esc(c.text) + '</span>' +
      '</div>';
    }).join('');

    var cards = wb.hints.map(function (h) {
      var cls = h.level === 'L1' ? 'l1' : h.level === 'L3' ? 'l3' : '';
      return '<div class="tip-card ' + cls + '">' +
        '<div class="tip-card-head">' + H.icon('bulb', { size: 12 }) +
          '<span>' + H.esc(h.title) + '</span>' +
          '<span class="tip-time">' + H.esc(h.time) + '</span>' +
        '</div>' +
        '<div class="tip-card-body">' + H.esc(h.body) + '</div>' +
      '</div>';
    }).join('');

    var used = wb.hints.length;
    var l2 = wb.quota.l2Remaining, l3 = wb.quota.l3Remaining;

    return '<div class="card">' +
      '<div class="tip-panel-head">' + H.icon('bulb', { size: 16 }) +
        '<span>训练提示</span>' +
        '<span class="section-title st-right" style="margin-left:auto;font-weight:500;font-size:11.5px;color:#b45309">' +
          '已用 ' + used + ' 次</span>' +
      '</div>' +

      '<div class="tip-legend">' + legend + '</div>' +
      '<div class="tip-divider"></div>' +

      '<div class="tip-cards">' + (cards || '<div class="tiny muted">本回合尚未请求提示</div>') + '</div>' +

      '<div class="tip-actions">' +
        '<div class="tip-btn-row">' +
          '<button class="tip-btn l1" type="button" data-act="hint" data-level="L1">' +
            H.icon('info', { size: 13 }) + 'L1 体裁提示（不限次）</button>' +
        '</div>' +
        '<div class="tip-btn-row">' +
          '<button class="tip-btn" type="button" data-act="hint" data-level="L2"' + (l2 <= 0 ? ' disabled' : '') + '>' +
            H.icon('flag', { size: 13 }) + 'L2 指向提示</button>' +
          '<button class="tip-btn" type="button" data-act="hint" data-level="L3"' + (l3 <= 0 ? ' disabled' : '') + '>' +
            H.icon('target', { size: 13 }) + 'L3 要点提示</button>' +
        '</div>' +
      '</div>' +

      '<div class="tip-quota">' +
        '<span>本段 · 本回合剩余配额</span>' +
        '<b' + (l2 <= 0 ? ' class="quota-out"' : '') + '>L2 ' + l2 + '</b>' +
        '<b' + (l3 <= 0 ? ' class="quota-out"' : '') + '>L3 ' + l3 + '</b>' +
        '<span style="margin-left:auto">L1 不限次</span>' +
      '</div>' +

      '<div class="req-section" style="padding:0 16px 14px">' +
        '<div class="tiny muted" style="line-height:1.75;padding-top:12px;border-top:1px solid var(--border-light)">' +
          H.rich('配额**按「段 × 回合」发放**（段 = 三段式之一），用完不补；L3 每段每回合 1 次，同级提示间有 **10 秒冷却**。') +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function P3TrainWorkbench() {
    var wb = S.WORKBENCH;
    var c = S.CASE_BY_ID[wb.caseId];

    return '<div class="content-inner">' +

      '<div class="wb-top">' +
        '<div>' +
          '<div class="wt-title">' + H.esc(c.title) + '</div>' +
          '<div class="wt-case">' + H.esc(c.modality) + ' · ' + H.esc(c.bodyPart) + ' · ' +
            H.esc(c.level) + '（' + H.esc(c.levelName) + '） · 训练回合第 ' + wb.roundIndex + ' 次</div>' +
        '</div>' +
        '<div class="wt-right">' +
          H.tag('训练模式', 'info') +
          '<button class="btn sm" type="button" data-act="go" data-page="p2">' +
            H.icon('prev', { size: 13 }) + '返回病例列表</button>' +
        '</div>' +
      '</div>' +

      '<div class="mt12">' + stageBar(wb) + '</div>' +

      '<div class="wb-grid">' +
        '<div class="wb-main">' +

          '<div class="card">' +
            '<div class="card-head">' + H.icon('user', { size: 15 }) +
              '<span>一般信息</span>' +
              '<span class="card-tag">已去标识</span>' +
            '</div>' +
            '<div class="card-body tight">' + infoBar(wb) + '</div>' +
          '</div>' +

          '<div class="card">' +
            '<div class="card-head">' + H.icon('image', { size: 15 }) +
              '<span>影像浏览</span>' +
              '<span class="card-tag">三视图 · 互不联动</span>' +
            '</div>' +
            '<div class="card-body">' + viewer() + '</div>' +
          '</div>' +

          '<div class="card">' +
            '<div class="card-head">' + H.icon('pen', { size: 15 }) +
              '<span>报告书写</span>' +
              '<span class="card-tag">自动保存草稿</span>' +
            '</div>' +
            '<div class="card-body">' + segList(wb) + '</div>' +
            '<div class="card-foot">' +
              '<span class="tiny muted">草稿自动保存 · 最后保存 <b class="mono">14:31:52</b></span>' +
              '<span style="margin-left:auto"></span>' +
              '<button class="btn sm" type="button" data-act="noop">' + H.icon('eye', { size: 13 }) + '预览全文</button>' +
              '<button class="btn primary sm" type="button" data-act="submit-review">' +
                H.icon('clipboard-check', { size: 13 }) + '进入 T4 逐条自评</button>' +
            '</div>' +
          '</div>' +

          '<div class="wb-footbar">' +
            '<span class="fb-note">本回合已完成 <b>' + S.CASES[0].trainedRounds + '</b> 回合 · 重写不限次，' +
              '<b>提交自评</b>才算完成本回合</span>' +
            '<button class="btn sm" type="button" data-act="noop">' + H.icon('redo', { size: 13 }) + '重写本段</button>' +
            '<button class="btn sm" type="button" data-act="noop">' + H.icon('refresh', { size: 13 }) + '重练（新回合）</button>' +
          '</div>' +
        '</div>' +

        '<div class="wb-side">' + tipPanel(wb) + '</div>' +
      '</div>' +

    '</div>';
  }

  w.P3TrainWorkbench = P3TrainWorkbench;
})(window);
