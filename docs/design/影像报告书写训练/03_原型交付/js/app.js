/* 外壳路由 + 交互演示。页面工厂在 try/catch 内执行，单页报错只死自己。 */
(function (w) {
  'use strict';
  var H = w.H, S = w.SEED;

  w.appState = w.appState || { exCaseIdx: null, resCaseIdx: 0, current: 'p1' };

  var PAGES = [
    { id: 'p1', no: 'P1', label: '模块首页', flag: '/report-writing', req: 'home', render: w.P1Home, note: '双入口' },
    { id: 'p2', no: 'P2', label: '训练样本列表', flag: '/samples', req: 'trainList', render: w.P2TrainList },
    { id: 'p3', no: 'P3', label: '训练工作台 T0–T4', flag: '/samples/:id', req: 'trainWorkbench', render: w.P3TrainWorkbench },
    { id: 'p4', no: 'P4', label: '对照自评页', flag: '/:id/self-review', req: 'selfReview', render: w.P4SelfReview },
    { id: 'p5', no: 'P5', label: '我的考核任务', flag: '/exam', req: 'examTasks', render: w.P5ExamTasks },
    { id: 'p6', no: 'P6', label: '考核工作台', flag: '/exam/:taskId', req: 'examWorkbench', render: w.P6ExamWorkbench },
    { id: 'p7', no: 'P7', label: '评分结果页', flag: '/:taskId/result', req: 'result', render: w.P7Result },
    { id: 'p8', no: 'P8', label: '评审说明', flag: '非产品界面', req: 'notes', render: w.P8Notes, note: '交付说明' }
  ];

  var PAGE_BY_ID = {};
  PAGES.forEach(function (p) { PAGE_BY_ID[p.id] = p; });

  function renderSidebar() {
    var el = document.getElementById('sidebar');
    if (!el) return;
    var rows = PAGES.map(function (p) {
      return '<div class="side-item' + (p.id === w.appState.current ? ' active' : '') + '" ' +
        'data-act="go" data-page="' + p.id + '" title="' + H.esc(p.label) + '">' +
        '<span class="side-idx">' + p.no + '</span>' +
        '<span class="side-label">' + H.esc(p.label) + '</span>' +
        (p.note ? '<span class="side-flag">' + H.esc(p.note) + '</span>' : '') +
      '</div>';
    }).join('');

    el.innerHTML =
      '<div class="side-note">影像报告书写训练</div>' +
      rows +
      '<div class="side-divider"></div>' +
      '<div class="side-note">查看</div>' +
      '<div class="side-item" data-act="toggle-req"><span class="side-idx">§</span>' +
        '<span class="side-label">折叠需求面板</span></div>' +
      '<div class="side-item" data-act="toggle-side"><span class="side-idx">⇤</span>' +
        '<span class="side-label">折叠左栏</span></div>';
  }

  function renderCrumb(p) {
    var el = document.getElementById('crumb');
    if (el) el.innerHTML = '<b>' + H.esc(p.label) + '</b> · ' + H.esc(p.flag);
  }

  function renderContent(id) {
    var p = PAGE_BY_ID[id] || PAGE_BY_ID.p1;
    var el = document.getElementById('content');
    if (!el) return;
    var html;
    try {
      html = p.render();
    } catch (e) {
      html = '<div class="content-inner"><div class="card"><div class="card-body">' +
        '<div class="banner error">' + H.icon('warn', { size: 15 }) +
        '<span>本页渲染失败：<b>' + H.esc(String(e.message || e)) + '</b>。其余页面不受影响（各页工厂独立 try/catch）。</span>' +
        '</div></div></div></div>';
      if (w.console) console.error('[proto] page ' + id + ' failed:', e);
    }
    el.innerHTML = html;
    el.scrollTop = 0;
  }

  function renderReqPanel(id) {
    var el = document.getElementById('reqPanel');
    if (!el) return;
    var p = PAGE_BY_ID[id] || PAGE_BY_ID.p1;
    try {
      el.innerHTML = w.renderReq(p.req);
    } catch (e) {
      el.innerHTML = '<div class="req-panel-head"><h2>需求面板渲染失败</h2></div>' +
        '<div class="req-panel-body"><div class="banner error">' + H.esc(String(e.message || e)) + '</div></div>';
      if (w.console) console.error('[proto] req-panel ' + id + ' failed:', e);
    }
  }

  function renderCurrent() {
    var id = w.appState.current;
    renderSidebar();
    renderCrumb(PAGE_BY_ID[id] || PAGE_BY_ID.p1);
    renderContent(id);
    renderReqPanel(id);
    /* 传 body：内容区与需求面板都要能串讲改写 */
    if (w.EDIT) w.EDIT.afterRender(document.body);
  }

  function go(id) {
    if (!PAGE_BY_ID[id]) return;
    w.appState.current = id;
    if (w.location) w.location.hash = id;
    renderCurrent();
  }

  /* ── 交互演示：只切状态，不做真实业务写入 ── */
  function onClick(e) {
    var t = e.target.closest ? e.target.closest('[data-act]') : null;
    if (!t) return;
    var act = t.getAttribute('data-act');

    if (act === 'noop') {
      if (t.tagName === 'BUTTON' || t.classList.contains('banner-close')) {
        H.toast('原型演示：此处仅为状态呈现，不触发真实业务');
      }
      return;
    }

    if (act === 'go') { go(t.getAttribute('data-page')); return; }

    if (act === 'modal-mask') { if (e.target === t) H.dismissModal(); return; }
    if (act === 'modal-close') { H.dismissModal(); return; }
    if (act === 'modal-ok') { H.closeModal(true); return; }

    if (act === 'copy') {
      var v = t.getAttribute('data-v') || '';
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(v).then(function () { H.toast('已复制：' + v); },
          function () { H.toast('已复制（演示）：' + v); });
      } else {
        H.toast('已复制（演示）：' + v);
      }
      return;
    }

    if (act === 'toggle-req') {
      document.body.classList.toggle('req-collapsed');
      return;
    }
    if (act === 'toggle-side') {
      document.body.classList.toggle('side-collapsed');
      return;
    }

    /* ── P3 提示配额消耗 ── */
    if (act === 'hint') {
      var lv = t.getAttribute('data-level');
      var wb = S.WORKBENCH;
      var now = new Date();
      var hhmmss = ('0' + now.getHours()).slice(-2) + ':' + ('0' + now.getMinutes()).slice(-2) + ':' + ('0' + now.getSeconds()).slice(-2);
      if (lv === 'L2') {
        if (wb.quota.l2Remaining <= 0) { H.toast('L2 配额已用完（本回合不再补）'); return; }
        wb.quota.l2Remaining--;
        wb.hints.push({ level: 'L2', segment: 'findings', stage: wb.stage, time: hhmmss,
          title: 'L2 指向提示 · 影像所见', body: "沿用同一策略：本病例的影像所见中，'密度/信号/强化程度'一类描述仍偏弱。" });
      } else if (lv === 'L3') {
        if (wb.quota.l3Remaining <= 0) { H.toast('L3 配额已用完（每回合 1 次）'); return; }
        wb.quota.l3Remaining--;
        wb.hints.push({ level: 'L3', segment: 'findings', stage: wb.stage, time: hhmmss,
          title: 'L3 结构提示 · 影像所见',
          body: '建议按此结构组织：①部位与范围 ②数目与大小 ③形态与边界 ④密度/信号/强化 ⑤重要阴性征象。' +
            '（L3 只给结构，不代写内容）' });
      } else {
        wb.hints.push({ level: 'L1', segment: 'findings', stage: wb.stage, time: hhmmss,
          title: 'L1 体裁提示 · 影像所见',
          body: '影像所见建议覆盖：部位与范围、数目与大小、形态与边界、密度/信号/强化程度、重要阴性征象。' });
      }
      H.toast('已请求 ' + lv + ' 提示（原型演示：无需网络）');
      renderCurrent();
      return;
    }

    if (act === 'submit-review') {
      H.openModal({
        title: '进入 T4 逐条自评？',
        icon: 'clipboard-check',
        body: '提交后本回合进入「对照自评」。自评表按 R1 表 23 条逐条判定，**不可跳过**（允许整页快速自评）。',
        okText: '进入自评',
        onClose: function () { go('p4'); }
      });
      return;
    }

    /* ── P4 自评 ── */
    if (act === 'mark') {
      S.SELF_REVIEW.marks[t.getAttribute('data-code')] = t.getAttribute('data-mark');
      renderCurrent();
      return;
    }
    if (act === 'quick-self') {
      var marks = S.SELF_REVIEW.marks;
      Object.keys(marks).forEach(function (k) { marks[k] = 'unsure'; });
      H.toast('整页快速自评：23 条已全部置为「不确定」');
      renderCurrent();
      return;
    }
    if (act === 'toggle-submit') {
      S.SELF_REVIEW.submitted = !S.SELF_REVIEW.submitted;
      H.toast(S.SELF_REVIEW.submitted
        ? '自评已提交（原型演示）→ 对照区解锁'
        : '已撤销提交（原型演示）→ 对照区重新被门禁挡住');
      renderCurrent();
      return;
    }

    /* ── P6 考核工作台 ── */
    if (act === 'ex-switch') {
      w.appState.exCaseIdx = parseInt(t.getAttribute('data-idx'), 10);
      renderCurrent();
      return;
    }
    if (act === 'ex-prev' || act === 'ex-next') {
      var ew = S.EXAM_WORKBENCH;
      var cur = w.appState.exCaseIdx == null ? ew.caseIndex : w.appState.exCaseIdx;
      var next = act === 'ex-prev' ? cur - 1 : cur + 1;
      if (next < 0 || next >= ew.caseTotal) return;
      /* 切例自动锁定上一例 · 演示 §5.6 单例锁定 */
      var prevId = ew.caseIds[cur];
      if (!ew.drafts[prevId].locked && (ew.drafts[prevId].findings || ew.drafts[prevId].technique)) {
        ew.drafts[prevId].locked = true;
        ew.drafts[prevId].lockReason = 'switch';
        ew.drafts[prevId].lockedAt = '14:33:10';
        H.toast('切例自动锁定：例' + (cur + 1) + ' 已锁定（演示）');
      }
      w.appState.exCaseIdx = next;
      renderCurrent();
      return;
    }
    if (act === 'ex-lock') {
      var ewx = S.EXAM_WORKBENCH;
      var id = ewx.caseIds[w.appState.exCaseIdx == null ? ewx.caseIndex : w.appState.exCaseIdx];
      H.openModal({
        title: '锁定本例？',
        icon: 'lock',
        body: '锁定后**不可再改**，也不能取消锁定（避免"先看参考再改"）。其余例仍可继续作答。',
        okText: '锁定',
        okCls: 'danger',
        onClose: function () {
          ewx.drafts[id].locked = true;
          ewx.drafts[id].lockReason = 'manual';
          ewx.drafts[id].lockedAt = '14:33:41';
          H.toast('例已锁定（演示）');
          renderCurrent();
        }
      });
      return;
    }
    if (act === 'ex-submit') {
      var ew2 = S.EXAM_WORKBENCH;
      var unlocked = ew2.caseIds.filter(function (x) { return !ew2.drafts[x].locked; }).length;
      H.openModal({
        title: '确认整卷提交？',
        icon: 'send',
        bodyHtml: H.rich('整卷 ' + ew2.caseTotal + ' 例，其中仍有 <b>' + unlocked + '</b> 例未锁定。' +
          '提交后**不可再改**，进入自动评分。<br><br>倒计时剩余 19:42，尚充裕；到点将自动交卷。'),
        okText: '确认提交',
        okCls: 'exam',
        onClose: function () { H.toast('已提交（演示）→ 跳转成绩页'); go('p7'); }
      });
      return;
    }

    /* ── P7 结果页 ── */
    if (act === 'res-case') {
      w.appState.resCaseIdx = parseInt(t.getAttribute('data-idx'), 10);
      renderCurrent();
      return;
    }
    if (act === 'appeal') {
      H.openModal({
        title: '申请复核',
        icon: 'flag',
        body: '复核申请提交后成绩冻结，教师端处理期间不影响其他任务。请填写异议条目与理由（本原型不收集真实数据）。',
        okText: '提交申请',
        onClose: function () {
          S.RESULT.appealFiled = true;
          H.toast('复核申请已提交（演示）');
          renderCurrent();
        }
      });
      return;
    }
  }

  function boot() {
    document.addEventListener('click', onClick);
    var bR = document.getElementById('btnReq');
    if (bR) bR.addEventListener('click', function () { document.body.classList.toggle('req-collapsed'); });
    var bS = document.getElementById('btnSide');
    if (bS) bS.addEventListener('click', function () { document.body.classList.toggle('side-collapsed'); });

    if (w.EDIT) w.EDIT.init();

    var h = (w.location.hash || '').replace('#', '');
    w.appState.current = PAGE_BY_ID[h] ? h : 'p1';
    renderCurrent();

    document.body.setAttribute('data-proto-ready', '1');
    if (w.console) {
      console.log('%c影像报告书写训练 · 高保真原型', 'font-weight:700');
      console.log('页面数：' + PAGES.length + ' · 种子样本：' + S.CASES.length + ' · 考核任务：' + S.EXAM_TASKS.length);
    }
  }

  w.renderCurrent = renderCurrent;
  w.go = go;
  w.PAGES = PAGES;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window);
