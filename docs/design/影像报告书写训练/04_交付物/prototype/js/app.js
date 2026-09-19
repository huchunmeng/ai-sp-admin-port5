/* 外壳路由 + 交互演示。页面工厂在 try/catch 内执行，单页报错只死自己。 */
(function (w) {
  'use strict';
  var H = w.H, S = w.SEED;

  /* util.js 先挂了个只有 3 个键的占位对象，这里补齐管理端演示态（不能整体替换） */
  w.appState = w.appState || {};
  if (w.appState.current == null) w.appState.current = 'p1';
  if (w.appState.exCaseIdx === undefined) w.appState.exCaseIdx = null;
  if (w.appState.resCaseIdx == null) w.appState.resCaseIdx = 0;
  if (w.appState.admSampleId == null) w.appState.admSampleId = 'RC-001';
  if (w.appState.admTaskId == null) w.appState.admTaskId = 'AT-2026-0999';
  if (w.appState.admStuOpen === undefined) w.appState.admStuOpen = 'STU-2202001';
  if (w.appState.admCaseIdx == null) w.appState.admCaseIdx = 0;

  /* `end` 标记本页属管理端（`apps/admin` 承接，§5.12–5.14）：
     触发 `body.end-admin` 外壳观感切换（深蓝顶栏 + 主色 #1890FF），
     且侧栏归入「管理端」分组。路由首段与 apps/admin 的菜单项 id 一致（§6.1）。 */
  var PAGES = [
    { id: 'p1', no: 'P1', label: '模块首页', flag: '/report-writing', req: 'home', render: w.P1Home, note: '双入口' },
    { id: 'p2', no: 'P2', label: '训练样本列表', flag: '/report-writing/train', req: 'trainList', render: w.P2TrainList },
    { id: 'p3', no: 'P3', label: '训练工作台 T0–T4', flag: '/report-writing/train/:caseId', req: 'trainWorkbench', render: w.P3TrainWorkbench },
    { id: 'p4', no: 'P4', label: '对照自评页', flag: '/:id/self-review', req: 'selfReview', render: w.P4SelfReview },
    { id: 'p5', no: 'P5', label: '我的考核任务', flag: '/exam', req: 'examTasks', render: w.P5ExamTasks },
    { id: 'p6', no: 'P6', label: '考核工作台', flag: '/exam/:taskId', req: 'examWorkbench', render: w.P6ExamWorkbench },
    { id: 'p7', no: 'P7', label: '评分结果页', flag: '/:taskId/result', req: 'result', render: w.P7Result },

    { id: 'p9', no: 'P9', label: '影像报告题库', flag: '/imaging-samples', req: 'admSamples', render: w.P9AdmSamples, end: true, note: '§5.12.2' },
    { id: 'p10', no: 'P10', label: '样本编辑器', flag: '/imaging-samples/:id', req: 'admSampleEditor', render: w.P10AdmSampleEditor, end: true, note: '§5.12.3–5.12.6' },
    { id: 'p11', no: 'P11', label: '考核任务管理', flag: '/imaging-exams', req: 'admExamTasks', render: w.P11AdmExamTasks, end: true, note: '§5.14.1' },
    { id: 'p12', no: 'P12', label: '组卷与派发四步', flag: '/imaging-exams/create/:id?', req: 'admExamCreate', render: w.P12AdmExamCreate, end: true, note: '§5.13' },
    { id: 'p13', no: 'P13', label: '成绩汇总与学情', flag: '/imaging-exams/:id/scores', req: 'admScores', render: w.P13AdmScores, end: true, note: '§5.14' },

    { id: 'p8', no: 'P8', label: '评审说明', flag: '非产品界面', req: 'notes', render: w.P8Notes, note: '交付说明' }
  ];


  var PAGE_BY_ID = {};
  PAGES.forEach(function (p) { PAGE_BY_ID[p.id] = p; });

  function sideRow(p) {
    return '<div class="side-item' + (p.id === w.appState.current ? ' active' : '') + '" ' +
      'data-act="go" data-page="' + p.id + '" title="' + H.esc(p.label) + '">' +
      '<span class="side-idx">' + p.no + '</span>' +
      '<span class="side-label">' + H.esc(p.label) + '</span>' +
      (p.note ? '<span class="side-flag">' + H.esc(p.note) + '</span>' : '') +
    '</div>';
  }

  function sideGroup(no, text) {
    return '<div class="side-group"><span class="side-group-no">' + no + '</span>' + H.esc(text) + '</div>';
  }

  function renderSidebar() {
    var el = document.getElementById('sidebar');
    if (!el) return;
    var stu = PAGES.filter(function (p) { return !p.end && p.id !== 'p8'; });
    var adm = PAGES.filter(function (p) { return p.end; });
    var misc = PAGES.filter(function (p) { return p.id === 'p8'; });

    el.innerHTML =
      '<div class="side-note">影像报告书写训练</div>' +
      sideGroup('P1–P7', '训练端 · 学生侧') + stu.map(sideRow).join('') +
      sideGroup('P9–P13', '管理端 · 承接 §5.12–5.14') + adm.map(sideRow).join('') +
      sideGroup('—', '说明') + misc.map(sideRow).join('') +
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
    var p = PAGE_BY_ID[id] || PAGE_BY_ID.p1;
    /* 管理端页面切外壳观感：深蓝顶栏 + 主色 #1890FF（与 apps/admin 同一套令牌，
       见 css/admin.css 的 body.end-admin 规则）。学生侧仍走训练端令牌。 */
    document.body.classList.toggle('end-admin', !!p.end);
    var badge = document.getElementById('protoBadge');
    if (badge) badge.textContent = (p.end ? '管理端' : '训练端') + ' · 高保真原型';
    renderSidebar();
    renderCrumb(p);
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

    /* §5.2.2：阶段单线推进，可回退到已完成阶段、**不可跳过未完成阶段**（BDD 场景 2）。
       T0–T4 阶段条里未解锁的段落在原型中仍可点，点给它一句解释而不是静默无响应。 */
    if (act === 'stage') {
      H.toast('阶段不可跳过：请先完成当前阶段，再进入 ' + t.getAttribute('data-stage') + '（§5.2.2）');
      return;
    }

    if (act === 'modal-mask') { if (e.target === t) H.dismissModal(); return; }
    if (act === 'modal-close') { H.dismissModal(); return; }
    if (act === 'modal-ok') { H.closeModal(true); return; }

    if (act === 'copy') {
      var v = t.getAttribute('data-v') || '';
      /* §5.4.2：复制进报告对应位置 + 埋点；照抄不得满分，故提示里带上"仍需规范转述" */
      H.toast('已写入报告一般信息段（演示）：' + v + ' · 已埋点；整段照抄不得满分');
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
        if (wb.quota.l2Remaining <= 0) { H.toast('本段指向提示已用完'); return; }
        wb.quota.l2Remaining--;
        wb.hints.push({ level: 'L2', segment: 'findings', stage: wb.stage, time: hhmmss,
          title: 'L2 指向提示 · 影像所见', body: "沿用同一策略：本病例的影像所见中，'密度/信号/强化程度'一类描述仍偏弱。" });
      } else if (lv === 'L3') {
        if (wb.quota.l3Remaining <= 0) { H.toast('本段要点提示已用完，先自己写写看'); return; }
        wb.quota.l3Remaining--;
        wb.hints.push({ level: 'L3', segment: 'findings', stage: wb.stage, time: hhmmss,
          title: 'L3 要点提示 · 影像所见',
          body: '可关注：部位与范围、数目与大小、形态与边界、密度/信号/强化程度、重要阴性征象。' +
            '（L3 只给要点词，不给金标准原句）' });
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
      /* §5.6.1：`whole` 模式切例**不暂停、不锁定**，各例自由来回（§7.2.1）；
         `perCase` 模式下「下一例」才是该例的锁定请求（§5.6.2 竞态裁决，reason 只取 manual|timeout）。 */
      if (ew.durationMode === 'perCase' && act === 'ex-next') {
        var prevId = ew.caseIds[cur];
        if (!ew.drafts[prevId].locked && (ew.drafts[prevId].findings || ew.drafts[prevId].technique)) {
          ew.drafts[prevId].locked = true;
          ew.drafts[prevId].lockReason = 'manual';
          ew.drafts[prevId].lockedAt = '14:33:10';
          H.toast('perCase 计时：例' + (cur + 1) + ' 已锁定（演示）');
        }
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
        body: 'perCase 单例计时下，锁定后**不可再改**，也不能取消锁定（避免"先看参考再改"）。其余例仍可继续作答，切走暂停、切回继续。',
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
      var unanswered = ew2.caseIds.filter(function (x) {
        var d = ew2.drafts[x];
        return !d.locked && !(d.findings || d.technique || d.impression);
      }).length;
      H.openModal({
        title: '确认整卷提交？',
        icon: 'send',
        bodyHtml: H.rich('整卷 ' + ew2.caseTotal + ' 例，其中 **' + unanswered + '** 例**未作答**（提交时按 0 分计入，结果页明示）。' +
          '提交后**不可再改**，各例按锁定时的内容计分（未锁定的例在整卷提交时统一按 `caseLockReason = manual` 锁定；' +
          '此前已锁定（到时 `timeout`）的例保留原锁定原因），进入自动评分。\n\n' +
          '倒计时剩余 19:42，尚充裕；到点将由服务端兜底自动交卷（`submitType = autoTimeout`）。'),
        okText: '确认提交',
        okCls: 'exam',
        onClose: function () {
          /* §5.6.2（req-panel 同契约）：逐例 `caseLockReason` 各自留痕 —— 人工整卷提交把**未锁定**的例按 manual 锁定，
             已锁定的例（到时 timeout）**保留原值**；整卷 `submitType` 另算：任一例 timeout → autoTimeout，全 manual → manual。
             不得把已是 manual 的例改写成 timeout（那会污染申诉凭证）。 */
          ew2.caseIds.forEach(function (x) {
            if (!ew2.drafts[x].locked) {
              ew2.drafts[x].locked = true;
              ew2.drafts[x].lockReason = 'manual';
              ew2.drafts[x].lockedAt = '14:33:52';
            }
          });
          var anyTimeout = ew2.caseIds.some(function (x) { return ew2.drafts[x].lockReason === 'timeout'; });
          ew2.submitType = anyTimeout ? 'autoTimeout' : 'manual';
          H.toast('已提交（演示）→ 跳转成绩页');
          go('p7');
        }
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
      var reasonId = '_appealReason';
      H.openModal({
        title: '申请复核',
        icon: 'flag',
        bodyHtml: H.rich('复核申请提交后成绩冻结，管理端处理期间不影响其他任务。') +
          '<div class="modal-field">' +
            '<label>申诉原因<span class="req-mark">*</span></label>' +
            '<textarea id="' + reasonId + '" maxlength="200" placeholder="请填写异议条目与理由"></textarea>' +
            '<div class="modal-field-foot">' +
              '<span class="field-hint" id="_appealHint"></span>' +
              '<span class="field-count" id="_appealCnt">0 / 200</span>' +
            '</div>' +
          '</div>',
        okText: '提交申请',
        validate: function () {
          var el = document.getElementById(reasonId);
          var v = el ? el.value.trim() : '';
          if (!v) {
            H.fieldErr(reasonId, '_appealHint', '申诉原因为必填项（§5.4.1）');
            return '申诉原因必填，请填写异议条目与理由';
          }
          return null;
        },
        onClose: function () {
          S.RESULT.appealFiled = true;
          H.toast('复核申请已提交（演示）');
          renderCurrent();
        }
      });
      H.bindCounter(reasonId, '_appealCnt', 200);
      return;
    }

    /* §5.6.2 末行：系统原因补考登记入口（本期只落数据、不自动放行） */
    if (act === 'makeup') {
      H.openModal({
        title: '因系统原因申请补考',
        icon: 'refresh',
        bodyHtml: H.rich('本入口用于登记**系统原因**导致的作答异常（如断网到点、自动交卷未生效）。' +
          '登记写入 `appeal`，**本期只落数据、不自动放行**，由管理端人工核定后决定是否补考（§5.14.6 只读登记）。'),
        okText: '登记申请',
        onClose: function () {
          S.RESULT.makeupFiled = true;
          H.toast('补考申请已登记（演示）');
          renderCurrent();
        }
      });
      return;
    }

    /* ══════════ 管理端 P9–P13（§5.12–5.14） ══════════ */

    if (act === 'adm-open-sample') {
      w.appState.admSampleId = t.getAttribute('data-id');
      go('p10');
      return;
    }
    if (act === 'adm-open-task') {
      w.appState.admTaskId = t.getAttribute('data-id');
      go('p13');
      return;
    }

    /* P12 四步向导：草稿存本机（§5.13.1「草稿不落服务端」） */
    if (act === 'adm-step' || act === 'adm-next' || act === 'adm-prev') {
      var d = S.ADM_DRAFT;
      var target = act === 'adm-step'
        ? parseInt(t.getAttribute('data-step'), 10)
        : d.step + (act === 'adm-next' ? 1 : -1);
      if (target < 1 || target > 4) return;
      /* 前置校验只在真正推进时拦：至少选 1 例才能离开第 2 步（§5.13.3 勾选范围 [1,20]） */
      if (target > 2 && !Object.keys(d.picked).length) {
        H.toast('请先在第 2 步勾选至少 1 例样本（可勾选范围 1–20 例）');
        return;
      }
      if (target > 3 && !d.step3.classIds.length && !d.step3.studentIds.length) {
        H.toast('请先在第 3 步选择派发对象（班级或指定学员）（§5.13.4）');
        return;
      }
      d.step = target;
      renderCurrent();
      return;
    }

    if (act === 'adm-preset') {
      var pre = S.ADM_PRESETS[t.getAttribute('data-preset')];
      if (!pre) return;
      S.ADM_DRAFT.picked = {};
      Object.keys(pre.picked).forEach(function (k) { S.ADM_DRAFT.picked[k] = pre.picked[k]; });
      S.ADM_DRAFT.step = 2;
      H.toast('已套用预设：' + pre.label);
      renderCurrent();
      return;
    }

    /* §5.13.3 勾选样本：勾选即给默认 3 星，再点取消 */
    if (act === 'adm-pick') {
      var pid = t.getAttribute('data-id');
      if (S.ADM_DRAFT.picked[pid]) delete S.ADM_DRAFT.picked[pid];
      else {
        if (Object.keys(S.ADM_DRAFT.picked).length >= 20) { H.toast('单卷最多 20 例（§5.13.3）'); return; }
        S.ADM_DRAFT.picked[pid] = 3;
      }
      renderCurrent();
      return;
    }

    /* §5.13.3 星级权重：1–5 星，内部归一为百分比，不让学生看到权重数字 */
    if (act === 'adm-star') {
      var sid = t.getAttribute('data-id');
      var st = parseInt(t.getAttribute('data-star'), 10);
      if (!S.ADM_DRAFT.picked[sid]) return;
      S.ADM_DRAFT.picked[sid] = st;
      renderCurrent();
      return;
    }

    /* §5.12.5 能力位声明：前 4 位样本声明位可勾；hasMeasurement 由控件能力决定，恒 false 只读 */
    if (act === 'adm-cap') {
      var capId = t.getAttribute('data-id'), capKey = t.getAttribute('data-cap');
      if (capKey === 'hasMeasurement') {
        H.toast('测量能力位由影像控件能力决定（§9.4 本期 ❌），入库侧只读、不可勾选');
        return;
      }
      var cap = S.CAPABILITIES[capId];
      if (!cap) return;
      cap[capKey] = !cap[capKey];
      var now = S.scoreableOf(capId);
      H.toast((cap[capKey] ? '已声明' : '已取消') + '「' + capKey + '」→ 本例可评分变为 ' + now.max + ' 分');
      renderCurrent();
      return;
    }

    /* §5.13.5 门禁：scoreableMax < 85 时**不是直接拒绝**，而是强制走二次确认并写审计 */
    if (act === 'adm-gate-confirm') {
      var reasonId = '_gateReason';
      var cur = S.draftScoreable();
      /* closeModal 先清空弹层 DOM 再回调 onClose，故原因必须在 validate 时（DOM 尚在）取走 */
      var gateReason = '';
      H.openModal({
        title: '可评分 ' + cur.max + ' 分，低于发布下限 85',
        icon: 'warn',
        okCls: 'danger',
        bodyHtml: H.rich('本卷可评分 **' + cur.max + ' / 100**，低于发布门禁 **85**。' +
          '门禁**不阻止**发布，但**必须填写发布原因**，写审计 `exam.publish.overrideGate`；' +
          '成绩单会注明"本卷含不可评条目"，且**跨卷不可比**。') +
          '<div class="modal-field">' +
            '<label>发布原因<span class="req-mark">*</span></label>' +
            '<textarea id="' + reasonId + '" maxlength="200" placeholder="例如：本批次样本尚未覆盖测量能力，临床带教要求本周内完成考核"></textarea>' +
            '<div class="modal-field-foot">' +
              '<span class="field-hint" id="_gateHint"></span>' +
              '<span class="field-count" id="_gateCnt">0 / 200</span>' +
            '</div>' +
          '</div>',
        okText: '仍要发布',
        validate: function () {
          var el = document.getElementById(reasonId);
          gateReason = el ? el.value.trim() : '';
          if (!gateReason) {
            H.fieldErr(reasonId, '_gateHint', '发布原因为必填项（§5.13.5）');
            return '发布原因必填，请说明为何在可评分不足 85 的情况下仍需发布';
          }
          return null;
        },
        onClose: function () {
          S.ADM_DRAFT.gateReason = gateReason;
          S.ADM_DRAFT.step = 4;
          H.toast('已按覆盖门禁发布（演示）· 审计 action = exam.publish.overrideGate');
          go('p11');
        }
      });
      H.bindCounter(reasonId, '_gateCnt', 200);
      return;
    }

    if (act === 'adm-publish') {
      var cur2 = S.draftScoreable();
      if (cur2.max < 85) { H.toast('可评分 ' + cur2.max + ' 分 < 85，需走门禁二次确认'); return; }
      H.openModal({
        title: '确认发布？',
        icon: 'send',
        bodyHtml: H.rich('整卷 **' + Object.keys(S.ADM_DRAFT.picked).length + ' 例**、可评分 **' + cur2.max + ' 分**（≥ 85，正常发布路径）。' +
          '发布后**不可改卷内病例、不可改权重**（§5.13.6）——要换题只能撤销后重派。' +
          '样本改版走**新建版本**，已发布任务**锁旧版本**（§5.12.8）。'),
        okText: '确认发布',
        onClose: function () {
          H.toast('已发布（演示）· 审计 action = exam.publish');
          go('p11');
        }
      });
      return;
    }

    if (act === 'adm-revoke') {
      var rid = t.getAttribute('data-id');
      H.openModal({
        title: '撤销任务 ' + rid + '？',
        icon: 'ban',
        okCls: 'danger',
        bodyHtml: H.rich('撤销后学生**不可再领取/作答**；已交卷的成绩**保留可查**（§5.13.6）。' +
          '任务**不可删除**，只保留终态留痕。要换题请撤销后**重派新任务**。'),
        okText: '确认撤销',
        onClose: function () {
          var tk = S.ADM_TASK_BY_ID[rid];
          if (tk) { tk.state = '已撤销'; tk.revokedAt = '2026-09-19 16:40'; }
          H.toast('任务已撤销（演示）· 留痕不删');
          renderCurrent();
        }
      });
      return;
    }

    if (act === 'adm-export') {
      H.toast('已导出（演示）· CSV / PDF 均**不含金标准原文** · 审计 action = score.export');
      return;
    }

    /* §5.14.6 申诉本期只做只读登记：不设复核 / 改分按钮 */
    if (act === 'adm-appeal-view') {
      var stu = S.ADM_STUDENTS.filter(function (x) { return x.id === t.getAttribute('data-id'); })[0];
      var ap = stu && stu.appeal;
      H.openModal({
        title: '成绩申诉（只读登记）',
        icon: 'flag',
        bodyHtml: H.rich(ap ? '**' + stu.name + '** 于 ' + ap.filedAt + ' 提交：' : '该学生未提交申诉。') +
          (ap ? '<div style="margin-top:8px;padding:9px 12px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;white-space:pre-wrap">' +
            H.esc(ap.reason) + '</div>' : '') +
          '<p style="margin-top:10px;color:var(--text-secondary);font-size:12px">' +
          H.rich('本期**只落登记数据，不提供复核 / 改分界面**（§5.14.6）；处置在管理端线下完成，线上仅留痕。') + '</p>',
        okText: '关闭'
      });
      return;
    }

    /* P13 学生行展开 / 病例级下钻 */
    if (act === 'adm-stu') {
      var uid = t.getAttribute('data-id');
      w.appState.admStuOpen = w.appState.admStuOpen === uid ? null : uid;
      w.appState.admCaseIdx = 0;
      renderCurrent();
      return;
    }
    if (act === 'adm-stu-case') {
      w.appState.admCaseIdx = parseInt(t.getAttribute('data-idx'), 10);
      renderCurrent();
      return;
    }
  }

  /* ── 报告书写：段落输入 → 实时字数 + 草稿保存时间（原型只更新 UI，不落盘） ── */
  function onInput(e) {
    var t = e.target;
    if (!t || !t.getAttribute) return;
    var act = t.getAttribute('data-act');
    if (act !== 'draft' && act !== 'ex-draft') return;

    var seg = t.closest ? t.closest('.seg') : null;
    if (!seg) return;

    var key = t.getAttribute('data-seg-key');
    var def = null;
    S.SEGMENTS.forEach(function (s) { if (s.key === key) def = s; });
    var cnt = seg.querySelector('.seg-count');
    if (cnt && def) cnt.textContent = t.value.length + ' / ' + def.limit;

    var card = seg.closest('.card');
    var stamp = card ? card.querySelector('.card-foot .tiny.muted b.mono') : null;
    if (stamp) {
      var n = new Date();
      stamp.textContent = ('0' + n.getHours()).slice(-2) + ':' +
        ('0' + n.getMinutes()).slice(-2) + ':' + ('0' + n.getSeconds()).slice(-2);
    }
  }

  function boot() {
    document.addEventListener('click', onClick);
    document.addEventListener('input', onInput);
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
      console.log('页面数：' + PAGES.length + '（训练端 ' + PAGES.filter(function (p) { return !p.end; }).length +
        ' / 管理端 ' + PAGES.filter(function (p) { return p.end; }).length + '）' +
        ' · 种子样本：' + S.CASES.length + ' · 题库样本：' + S.ADM_SAMPLES.length +
        ' · 考核任务：' + S.EXAM_TASKS.length + '（管理端 ' + S.ADM_TASKS.length + '）');
    }
  }

  w.renderCurrent = renderCurrent;
  w.go = go;
  w.PAGES = PAGES;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window);
