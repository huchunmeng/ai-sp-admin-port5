/* P6 考核工作台 · PRD §5.6 整卷作答 / §6.3 线框
   卷头（第 i/N 例 + 剩余时间 + 整卷提交）／一般信息条／三视图（只读，仅锁进阶操作）／报告三段／提示栏锁定态。 */
(function (w) {
  'use strict';
  var S = w.SEED, H = w.H;

  function fmtSec(s) {
    var m = Math.floor(s / 60), ss = s % 60;
    return (m < 10 ? '0' : '') + m + ':' + (ss < 10 ? '0' : '') + ss;
  }

  function timerCls(s) {
    return s <= 60 ? 'danger' : s <= 300 ? 'warn' : '';
  }

  function caseChips(ew, activeIdx) {
    return '<div class="case-chips">' + ew.caseIds.map(function (id, i) {
      var d = ew.drafts[id];
      var c = S.CASE_BY_ID[id];
      var empty = !(d.impression || d.findings || d.technique);
      var st = d.locked ? '已锁定' : (empty ? '未作答' : '作答中');
      var on = i === activeIdx;
      /* 锁定原因只取 §5.6.2 定义的 manual | timeout 两值 */
      var reasonTxt = d.lockReason === 'timeout' ? '到时锁定' : '提交时锁定';
      return '<div class="case-chip" data-act="ex-switch" data-idx="' + i + '"' +
        ' style="cursor:pointer;' + (on ? 'border-color:var(--primary);box-shadow:0 0 0 2px rgba(37,99,235,.10)' : '') + '">' +
        '<div class="cc-name">例' + (i + 1) + ' · ' + H.esc(c.title) + '</div>' +
        '<div class="cc-score" style="font-size:13.5px">' + H.esc(st) + '</div>' +
        (d.locked
          ? '<div class="cc-meta">' + H.icon('lock', { size: 10 }) + ' ' + reasonTxt + ' ' + H.esc(d.lockedAt) + '</div>'
          : '<div class="cc-meta">权重 ' + ew.caseWeights[i] + ' · 满分 100 · ' + (empty ? '提交后按 0 分计' : '尚未锁定') + '</div>') +
      '</div>';
    }).join('') + '</div>';
  }

  function infoBar() {
    return '<div class="info-bar">' + S.WORKBENCH.info.map(function (r) {
      return '<div class="info-item">' +
        '<span class="info-k">' + H.esc(r.k) + '</span>' +
        '<span class="info-v' + (r.masked ? ' masked' : '') + '">' + H.esc(r.v) + '</span>' +
        (r.masked ? '<span class="info-copy off">不可复制</span>'
                  : '<span class="info-copy" data-act="copy" data-v="' + H.esc(r.v) + '">复制</span>') +
      '</div>';
    }).join('') +
      '<div class="info-item info-clinical">' +
        '<span class="info-k">临床主要信息</span>' +
        '<span class="info-v">' + H.esc(S.WORKBENCH.clinicalText) + '</span>' +
      '</div>' +
    '</div>';
  }

  function segList(draft, readOnly) {
    return '<div class="seg-list">' + S.SEGMENTS.map(function (s) {
      var val = draft[s.key] || '';
      var filled = val.trim().length > 0;
      var cls = readOnly ? '' : (filled ? 'done' : '');
      return '<div class="seg ' + cls + '">' +
        '<div class="seg-head">' + H.icon(readOnly ? 'lock' : (filled ? 'check' : 'pen'), { size: 13 }) +
          '<span>' + H.esc(s.name) + '</span>' +
          '<span class="seg-flag">' + (readOnly ? '已锁定只读' : filled ? '已填写' : '待填写') +
            ' · ' + (s.examRequired ? '考核必填' : '考核可空') + '</span>' +
          '<span class="seg-count">' + val.length + ' / ' + s.limit + '</span>' +
        '</div>' +
        '<textarea class="seg-textarea" rows="' + (s.key === 'technique' ? 2 : 4) + '" ' +
          'maxlength="' + s.limit + '" ' +
          (readOnly ? 'disabled' : 'data-act="ex-draft" data-seg-key="' + s.key + '"') + '>' +
          H.esc(val) + '</textarea>' +
      '</div>';
    }).join('') + '</div>';
  }

  function P6ExamWorkbench() {
    var ew = S.EXAM_WORKBENCH;
    var idx = w.appState.exCaseIdx;
    if (idx == null) idx = ew.caseIndex;
    var caseId = ew.caseIds[idx];
    var c = S.CASE_BY_ID[caseId];
    var draft = ew.drafts[caseId];

    return '<div class="content-inner">' +

      '<div class="wb-top">' +
        '<div>' +
          '<div class="wt-title">' + H.esc(ew.title) + '</div>' +
          '<div class="wt-case">' + H.esc(ew.taskId) + ' · 整卷 ' + ew.caseTotal + ' 例 · 各例等权 · ' +
            (ew.durationMode === 'whole' ? '倒计时按整卷走' : '按单例计时') + '</div>' +
        '</div>' +
        '<div class="wt-right">' +
          H.tag('考核模式', 'submitted') +
          '<span class="pager-case">' + H.icon('grid', { size: 13 }) +
            ' 第 <b>' + (idx + 1) + '</b> / ' + ew.caseTotal + ' 例</span>' +
          '<span class="timer ' + timerCls(ew.remainSeconds) + '">' +
            H.icon('clock', { size: 14 }) + '<span class="timer-k">剩余</span>' + fmtSec(ew.remainSeconds) + '</span>' +
        '</div>' +
      '</div>' +

      '<div class="mt12">' +
        '<div class="banner warn">' + H.icon('warn', { size: 15 }) +
          '<span>' + H.rich('考核期内**无训练辅助**：三级提示关闭、覆盖清单不下发、参考报告不下发。' +
            (ew.durationMode === 'perCase'
              ? '**单例计时**：每例各自倒计时，到点锁该例，**锁定后不可再改**；切走暂停、切回继续。'
              : '**整卷计时**：切例**不停表、不锁定**，各例自由来回；锁定只发生在**整卷提交**或**到时**。') +
            '倒计时到点自动交卷。') + '</span>' +
        '</div>' +
      '</div>' +

      '<div class="wb-exam-grid">' +
        '<div class="wb-main">' +

          '<div class="card">' +
            '<div class="card-head">' + H.icon('grid', { size: 15 }) +
              '<span>整卷例次</span>' +
              '<span class="card-tag">点选切换当前例 · 已锁定的例只读</span>' +
            '</div>' +
            '<div class="card-body tight">' + caseChips(ew, idx) + '</div>' +
          '</div>' +

          '<div class="card">' +
            '<div class="card-head">' + H.icon('user', { size: 15 }) +
              '<span>一般信息 · 例' + (idx + 1) + '</span>' +
              '<span class="card-tag">已去标识</span>' +
            '</div>' +
            '<div class="card-body tight">' + infoBar() + '</div>' +
          '</div>' +

          '<div class="card">' +
            '<div class="card-head">' + H.icon('image', { size: 15 }) +
              '<span>影像浏览 · 例' + (idx + 1) + '</span>' +
              '<span class="card-tag">三视图 · 互不联动</span>' +
            '</div>' +
            '<div class="card-body">' +
              '<div class="viewer">' +
                [{ l: '轴位 Axial', s: '38 / 96' }, { l: '冠状位 Coronal', s: '24 / 74' }, { l: '矢状位 Sagittal', s: '31 / 82' }]
                  .map(function (v) {
                    return '<div class="view-slot"><div class="view-canvas">' +
                      '<div class="view-cross"></div>' +
                      '<span class="view-ph">' + H.icon('image', { size: 26 }) + '</span>' +
                      '<span class="view-ph-txt">影像占位</span>' +
                      '<span class="view-slice">' + H.esc(v.s) + '</span>' +
                      '<span class="view-lock">' + H.icon('lock', { size: 11 }) + ' 测量/调窗已锁</span>' +
                    '</div><div class="view-foot"><span class="view-label">' + H.esc(v.l) + '</span>' +
                      '<span class="view-wl">W 400 · L 40</span></div></div>';
                  }).join('') +
              '</div>' +
              '<div class="viewer-note">' + H.rich('考核期锁定**测量工具与调窗**；浏览与翻层不受限。') + '</div>' +
            '</div>' +
          '</div>' +

          '<div class="card">' +
            '<div class="card-head">' + H.icon('pen', { size: 15 }) +
              '<span>报告书写 · 例' + (idx + 1) + '</span>' +
              '<span class="card-tag">' + H.esc(c.title) + '</span>' +
            '</div>' +
            '<div class="card-body">' + segList(draft, draft.locked) + '</div>' +
            '<div class="card-foot">' +
              '<span class="tiny muted">' +
                (draft.locked
                  ? H.icon('lock', { size: 12 }) + ' 本例已于 ' + H.esc(draft.lockedAt) + ' 锁定（' +
                    (draft.lockReason === 'timeout' ? '到时锁定' : '提交时锁定') + '），不可再改'
                  : '草稿自动保存 · 最后保存 <b class="mono">' + H.esc(ew.lastSavedAt || '14:32:07') + '</b>' +
                    ' · ' + (ew.durationMode === 'perCase' ? '单例计时：切走暂停、切回继续' : '整卷计时：切例不停表')) +
              '</span>' +
              '<span style="margin-left:auto"></span>' +
              /* perCase 才有"单例锁定"这一步；whole 模式下锁定只由整卷提交/到时触发 */
              (draft.locked || ew.durationMode !== 'perCase'
                ? ''
                : '<button class="btn sm" type="button" data-act="ex-lock">' +
                    H.icon('lock', { size: 13 }) + '锁定本例</button>') +
            '</div>' +
          '</div>' +

          '<div class="wb-footbar">' +
            '<span class="fb-note">' +
              '已作答 <b>' + ew.caseIds.filter(function (id) {
                var d = ew.drafts[id];
                return d.findings || d.technique || d.impression;
              }).length + '</b> / ' + ew.caseTotal +
              ' 例 · 已锁定 <b>' + ew.caseIds.filter(function (id) { return ew.drafts[id].locked; }).length + '</b> 例 · ' +
              (ew.durationMode === 'perCase' ? '单例计时' : '整卷计时，切例不停表') + '</span>' +
            '<button class="btn sm" type="button" data-act="ex-prev"' + (idx === 0 ? ' disabled' : '') + '>' +
              H.icon('prev', { size: 13 }) + '上一例</button>' +
            '<button class="btn sm" type="button" data-act="ex-next"' + (idx === ew.caseTotal - 1 ? ' disabled' : '') + '>' +
              '下一例' + H.icon('next', { size: 13 }) + '</button>' +
            '<button class="btn exam" type="button" data-act="ex-submit">' +
              H.icon('send', { size: 13 }) + '整卷提交</button>' +
          '</div>' +
        '</div>' +

        '<div class="wb-side">' +
          '<div class="card">' +
            '<div class="tip-panel-head locked">' + H.icon('lock', { size: 16 }) +
              '<span>训练提示</span>' +
              '<span style="margin-left:auto;font-size:11.5px;font-weight:500">考核期关闭</span>' +
            '</div>' +
            '<div class="tip-locked-box">' +
              '<div class="lock-ico">' + H.icon('lock', { size: 30 }) + '</div>' +
              '<div class="lock-title">考核期不提供提示</div>' +
              '<div class="lock-desc">' + H.rich('三级提示阶梯（L1/L2/L3）**仅训练侧提供**。考核侧既不显示提示按钮，服务端也不接受提示请求 —— 这是**服务端**的判定，不是前端隐藏。') + '</div>' +
              '<div class="lock-note">' + H.rich('同理，要素覆盖清单与参考报告在考核期**都不下发**。') + '</div>' +
            '</div>' +
          '</div>' +

          '<div class="card mt12">' +
            '<div class="card-head">' + H.icon('clock', { size: 15 }) + '<span>交卷状态</span></div>' +
            '<div class="card-body tight">' +
              '<div class="kv-grid" style="grid-template-columns:1fr">' +
                '<div class="kv"><span class="kv-k">倒计时</span><span class="kv-v mono">' +
                  fmtSec(ew.remainSeconds) + '（' + (ew.durationMode === 'perCase' ? '本例' : '整卷') + '）</span></div>' +
                '<div class="kv"><span class="kv-k">已锁定例</span><span class="kv-v mono">' +
                  ew.caseIds.filter(function (id) { return ew.drafts[id].locked; }).length + ' / ' + ew.caseTotal +
                  '（' + (ew.durationMode === 'perCase' ? '单例锁定' : '整卷提交时统一锁定') + '）</span></div>' +
                '<div class="kv"><span class="kv-k">未同步草稿</span><span class="kv-v" style="color:var(--warning)">1 例待同步</span></div>' +
                '<div class="kv"><span class="kv-k">自动交卷</span><span class="kv-v">到点触发</span></div>' +
              '</div>' +
              '<div class="banner warn mt12 mb0" style="padding:8px 11px;font-size:11.5px">' +
                H.icon('refresh', { size: 13 }) +
                '<span>' + H.rich('网络中断时草稿**暂存本机**，恢复后自动同步；**不因离线丢卷**。') + '</span>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +

    '</div>';
  }

  w.P6ExamWorkbench = P6ExamWorkbench;
})(window);
