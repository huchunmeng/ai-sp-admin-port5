/* 共享小工具：转义、状态标签、可编辑标注、弹层、Toast。
   各页工厂与 app.js 共用，挂在 window.H 上。 */
(function (w) {
  'use strict';

  /* 页面级临时状态（切例、选中的结果例次）——先占位，app.js 会复用同一对象 */
  w.appState = w.appState || { exCaseIdx: null, resCaseIdx: 0, current: 'p1' };

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* 只转义尖括号与引号，保留 **粗体** / `code` / 换行 → <br> */
  function rich(s) {
    return esc(s)
      .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>');
  }

  function nl2br(s) { return esc(s).replace(/\n/g, '<br>'); }

  /* 串讲编辑点：data-edit-key 让 edit-mode.js 能定位并改写 */
  function ed(key, text) {
    return '<span data-edit-key="' + esc(key) + '">' + rich(text) + '</span>';
  }
  function edAttr(key) { return 'data-edit-key="' + esc(key) + '"'; }

  /* 考核任务状态 → 标签样式 · §5.5 状态全集 */
  var STATE_CLS = {
    '待作答': 'pending', '作答中': 'doing', '评分中': 'scoring',
    '已评分': 'scored', '评分失败': 'failed', '已截止': 'closed', '已撤销': 'revoked'
  };
  function tag(text, cls, plain) {
    return '<span class="tag ' + (cls || '') + (plain ? ' plain' : '') + '">' + esc(text) + '</span>';
  }
  function stateTag(state) { return tag(state, STATE_CLS[state] || ''); }

  function icon(name, opts) { return w.icon(name, opts); }

  /* 难度双标签：三阶段七级 + 基础/高阶/疑难 · 见记忆 difficulty-dual-label-system */
  function levelTag(c) {
    return tag(c.level, (c.levelName === '基础' ? 'info' : c.levelName === '疑难' ? 'diff-bad' : 'diff-mid'), true);
  }

  /* 三段报告的分值合计等小计算 */
  function sum(arr, get) { return arr.reduce(function (a, x) { return a + (get ? get(x) : x); }, 0); }
  function fixed(n, d) { return (Math.round(n * Math.pow(10, d || 1)) / Math.pow(10, d || 1)).toFixed(d || 1); }

  var toastTimer = null;
  function toast(msg) {
    var el = document.getElementById('_toast');
    if (!el) {
      el = document.createElement('div');
      el.id = '_toast';
      el.style.cssText = 'position:fixed;left:50%;bottom:38px;transform:translateX(-50%);' +
        'background:#1f2937;color:#f9fafb;font-size:12.5px;padding:9px 16px;border-radius:9px;' +
        'z-index:400;box-shadow:0 10px 28px rgba(0,0,0,.25);max-width:70vw;text-align:center';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.display = 'block';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.style.display = 'none'; }, 2200);
  }

  /* 模态：二次确认 / 申请复核 等 */
  var modalOnClose = null;
  function openModal(opt) {
    var root = document.getElementById('modalRoot');
    if (!root) return;
    modalOnClose = opt.onClose || null;
    root.innerHTML =
      '<div class="modal-mask" data-act="modal-mask">' +
        '<div class="modal" role="dialog" aria-modal="true">' +
          '<div class="modal-head">' + icon(opt.icon || 'warn', { size: 17 }) + esc(opt.title) + '</div>' +
          '<div class="modal-body">' + (opt.bodyHtml || nl2br(opt.body || '')) + '</div>' +
          '<div class="modal-foot">' +
            '<button class="btn" type="button" data-act="modal-close">' + esc(opt.cancelText || '取消') + '</button>' +
            (opt.okText ? '<button class="btn ' + (opt.okCls || 'primary') + '" type="button" data-act="modal-ok">' + esc(opt.okText) + '</button>' : '') +
          '</div>' +
        '</div>' +
      '</div>';
  }
  /* fire = true 时才执行回调（「取消 / 点遮罩」不该触发确认动作） */
  function closeModal(fire) {
    var root = document.getElementById('modalRoot');
    if (root) root.innerHTML = '';
    var f = modalOnClose;
    modalOnClose = null;
    if (fire && f) f();
  }
  function dismissModal() { modalOnClose = null; closeModal(false); }

  w.H = {
    esc: esc, rich: rich, nl2br: nl2br, ed: ed, edAttr: edAttr,
    tag: tag, stateTag: stateTag, levelTag: levelTag, icon: icon,
    sum: sum, fixed: fixed, toast: toast,
    openModal: openModal, closeModal: closeModal, dismissModal: dismissModal,
    STATE_CLS: STATE_CLS
  };
})(window);
