/* 串讲编辑模式：点开顶栏「编辑模式」→ 带虚线框的文案可直接改写，
   改动写入 localStorage 草稿，刷新不丢；可导出为 prototype-config.json + prd-change-suggestions.md。
   草稿超过 30 天会先询问是否继续套用。 */
(function (w) {
  'use strict';
  var H = w.H;

  var LS_KEY = 'hi-fi-prototype:report-writing:draft';
  var DRAFT_DAYS = 30;

  var state = { on: false, edits: {}, savedAt: null };

  function load() {
    try {
      var raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      var d = JSON.parse(raw);
      state.edits = d.edits || {};
      state.savedAt = d.savedAt || null;
    } catch (e) { state.edits = {}; state.savedAt = null; }
  }

  function persist() {
    state.savedAt = new Date().toISOString();
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ savedAt: state.savedAt, edits: state.edits }));
    } catch (e) { /* 隐私模式等写不进去，忽略 */ }
  }

  function staleDays() {
    if (!state.savedAt) return 0;
    return (Date.now() - new Date(state.savedAt).getTime()) / 86400000;
  }

  /* 自动锚点：给各页的关键文案（标题、说明条、卡片注释、边界提示…）补 data-edit-key，
     省去逐页手写锚点。键 = 页 + 选择器 + 该选择器内的渲染序号；已显式写过的锚点不覆盖。
     注：序号随渲染顺序生成，故"改了顺序"会让旧草稿错位——原型阶段可接受。 */
  var AUTO_SEL = [
    '.page-head-title', '.page-head-sub',
    '.banner > span', '.card-tag', '.section-title > span',
    '.viewer-note', '.seg-readonly-hint', '.stage-hint',
    '.gate-title', '.gate-desc', '.lock-title', '.lock-desc', '.lock-note',
    '.empty-title', '.empty-desc', '.res-note > span', '.sp-title', '.sp-desc',
    '.task-desc', '.ts-reason', '.sr-group-head > span',
    '.tip-card-body', '.tip-legend-txt', '.tip-quota > span',
    '.item-comment', '.wt-case', '.rhm-sub',
    '.req-section-title', '.req-section p', '.req-section li',
    '.req-panel-head h2', '.req-panel-foot'
  ];

  function autoKeys(root) {
    var page = (w.appState && w.appState.current) || 'p';
    AUTO_SEL.forEach(function (sel) {
      var nodes = root.querySelectorAll(sel);
      for (var i = 0; i < nodes.length; i++) {
        if (nodes[i].hasAttribute('data-edit-key')) continue;
        nodes[i].setAttribute('data-edit-key', page + '::' + sel + '#' + i);
      }
    });
  }

  /* 每次渲染后套用草稿：按 data-edit-key 覆盖 innerHTML */
  function apply() {
    var keys = Object.keys(state.edits);
    if (!keys.length) return;
    keys.forEach(function (k) {
      var el = document.querySelector('[data-edit-key="' + k.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"]');
      if (el) el.innerHTML = state.edits[k];
    });
  }

  function bindEditable(root) {
    var els = (root || document).querySelectorAll('[data-edit-key]');
    Array.prototype.forEach.call(els, function (el) {
      el.setAttribute('contenteditable', state.on ? 'true' : 'false');
      el.setAttribute('spellcheck', 'false');
    });
  }

  function onEditInput(e) {
    var el = e.target.closest ? e.target.closest('[data-edit-key]') : null;
    if (!el) return;
    state.edits[el.getAttribute('data-edit-key')] = el.innerHTML;
    persist();
    var st = document.getElementById('editState');
    if (st) st.innerHTML = '编辑模式已开启 · 已改 <b>' + Object.keys(state.edits).length + '</b> 处';
  }

  function toggle(force) {
    state.on = force == null ? !state.on : !!force;
    document.body.classList.toggle('edit-mode', state.on);
    bindEditable(document);
    var st = document.getElementById('editState');
    if (st) {
      st.innerHTML = state.on
        ? '编辑模式已开启 · 已改 <b>' + Object.keys(state.edits).length + '</b> 处'
        : '编辑模式已关闭';
    }
    if (state.on) H.toast('编辑模式：点虚线框内的文案即可直接改写');
  }

  function toMd() {
    var keys = Object.keys(state.edits);
    if (!keys.length) return '<!-- 无改动 -->\n';
    var byPage = {};
    keys.forEach(function (k) {
      var page = k.split('.')[0];
      (byPage[page] = byPage[page] || []).push(k);
    });
    var out = '# 原型串讲改动 → PRD 修改建议\n\n' +
      '> 来源：`03_原型交付` 串讲编辑模式草稿（' + (state.savedAt || '') + '）\n' +
      '> 生成时间：' + new Date().toISOString() + '\n\n';
    Object.keys(byPage).sort().forEach(function (p) {
      out += '## ' + p + '\n\n';
      byPage[p].forEach(function (k) {
        var txt = state.edits[k].replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim();
        out += '- `' + k + '`\n  - 改为：' + txt + '\n';
      });
      out += '\n';
    });
    return out;
  }

  function download(name, text, mime) {
    var blob = new Blob([text], { type: (mime || 'text/plain') + ';charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  function exportAll() {
    var n = Object.keys(state.edits).length;
    if (!n) { H.toast('还没有任何改动'); return; }
    download('prototype-config.json', JSON.stringify({
      module: '影像报告书写训练',
      prototype: '03_原型交付',
      savedAt: state.savedAt,
      exportedAt: new Date().toISOString(),
      editCount: n,
      edits: state.edits
    }, null, 2), 'application/json');
    setTimeout(function () { download('prd-change-suggestions.md', toMd(), 'text/markdown'); }, 300);
    H.toast('已导出 ' + n + ' 处改动（JSON + 建议 md）');
  }

  function reset() {
    if (!Object.keys(state.edits).length) { H.toast('没有改动可恢复'); return; }
    if (!window.confirm('确认放弃全部改动、恢复原型默认文案？')) return;
    state.edits = {};
    state.savedAt = null;
    try { localStorage.removeItem(LS_KEY); } catch (e) {}
    toggle(false);
    w.renderCurrent();
    H.toast('已恢复默认文案');
  }

  function checkStale() {
    var d = staleDays();
    if (d > DRAFT_DAYS) {
      var keep = window.confirm('检测到 ' + Math.round(d) + ' 天前的串讲草稿。\n\n' +
        '「确定」= 继续套用旧草稿；「取消」= 丢弃旧草稿、回到默认文案。');
      if (!keep) {
        state.edits = {}; state.savedAt = null;
        try { localStorage.removeItem(LS_KEY); } catch (e) {}
      } else {
        persist();
      }
    }
  }

  w.EDIT = {
    init: function () {
      load();
      checkStale();
      document.addEventListener('input', onEditInput, true);
      var b = document.getElementById('btnEdit');
      if (b) b.addEventListener('click', function () { toggle(); });
      var ex = document.getElementById('btnExport');
      if (ex) ex.addEventListener('click', exportAll);
      var rs = document.getElementById('btnReset');
      if (rs) rs.addEventListener('click', reset);
    },
    /* 每次页面渲染后调用：先补自动锚点，再套用草稿、绑定可编辑 */
    afterRender: function (root) {
      autoKeys(root || document);
      apply();
      bindEditable(root || document);
    },
    state: state
  };
})(window);
