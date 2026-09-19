/* P9 影像报告题库（管理端）· PRD §5.12.2 题库列表页 / §6.1 路由 /imaging-samples
   学员端看不到本页：题库维护的界面归管理端承接（原方案归教师端，port5 无教师端）。 */
(function (w) {
  'use strict';
  var S = w.SEED, H = w.H;

  /* 能力位显示名 · §5.12.5（前 4 位为样本声明位，可勾；hasMeasurement 由控件能力决定，只读） */
  var CAP_ORDER = ['hasMeasurement', 'hasPriorExam', 'hasEnhancedPhase', 'isTumor', 'hasStagingInfo'];
  var CAP_LABEL = {
    hasMeasurement: '测量', hasPriorExam: '既往片', hasEnhancedPhase: '增强',
    isTumor: '肿瘤', hasStagingInfo: '分期依据'
  };

  var STATUS_CLS = { published: 'scored', draft: 'pending', disabled: 'revoked' };
  var STATUS_TXT = { published: '已发布', draft: '草稿', disabled: '已停用' };

  function capBadges(cap, id) {
    return '<div class="adm-caps">' + CAP_ORDER.map(function (k) {
      var on = !!(cap && cap[k]);
      var cls = k === 'hasMeasurement' ? 'locked' : (on ? 'on' : 'off');
      var clickable = k === 'hasMeasurement' ? '' : ' data-act="adm-cap" data-id="' + H.esc(id) + '" data-cap="' + k + '"';
      return '<span class="adm-cap ' + cls + '"' + clickable +
        ' title="' + H.esc(CAP_LABEL[k] + (k === 'hasMeasurement' ? '：由影像控件能力决定（§9.4 本期 ❌），只读' : '：病例声明位，可勾')) + '">' +
        CAP_LABEL[k] + (k === 'hasMeasurement' ? ' 🔒' : '') + '</span>';
    }).join('') + '</div>';
  }

  function scoreableTag(max) {
    var cls = max >= 95 ? 'ok' : max >= 85 ? 'mid' : 'bad';
    return '<span class="adm-scoreable ' + cls + '">' + max + '<span class="adm-scoreable-den">/100</span></span>';
  }

  /* 右侧的能力位失分摘要：让"为什么不是 100 分"一眼可见（§5.9.2） */
  function lostNote(s) {
    if (!s.lost.length) return '<span class="tiny muted">满分卷 · 无不可评条目</span>';
    return '<span class="tiny muted">移出分母 ' + s.lost.length + ' 条：' +
      s.lost.map(function (l) { return l.code; }).join(' · ') + '</span>';
  }

  function sampleRow(s) {
    var sc = S.scoreableOf(s.id);   /* 现算，勾/取消能力位后立即反映 */
    return '' +
      '<div class="adm-sample" data-act="adm-open-sample" data-id="' + H.esc(s.id) + '">' +
        '<div class="adm-thumb">' + H.icon(s.ico || 'image', { size: 20 }) +
          '<span class="adm-thumb-tag">' + H.esc(s.modality) + ' · ' + H.esc(s.bodyPart) + '</span></div>' +
        '<div class="adm-sample-main">' +
          '<div class="adm-sample-title">' + H.esc(s.title) +
            ' <span class="adm-ver">' + H.esc(s.id) + ' · v' + s.version + '</span>' +
            ' ' + H.tag(STATUS_TXT[s.status] || s.status, STATUS_CLS[s.status] || '', true) +
            (s.goldStandard ? ' ' + H.tag('金标准已录', 'info', true) : ' ' + H.tag('缺金标准', 'diff-bad', true)) +
          '</div>' +
          '<div class="adm-sample-meta">' +
            H.levelTag(s) + ' · 序列 <span class="mono">' + s.series.axial + ' / ' + s.series.coronal + ' / ' + s.series.sagittal +
            '</span>（轴 / 冠 / 矢） · 更新 <span class="mono">' + H.esc(s.updatedAt) + '</span> · ' + H.esc(s.updatedBy) +
          '</div>' +
          capBadges(s.capabilities, s.id) +
        '</div>' +
        '<div class="adm-sample-side">' +
          scoreableTag(sc.max) +
          lostNote(sc) +
          '<div style="display:flex;gap:6px">' +
            '<button class="btn sm" type="button" data-act="adm-open-sample" data-id="' + H.esc(s.id) + '">' +
              H.icon('pen', { size: 12 }) + '编辑</button>' +
            '<button class="btn sm" type="button" data-act="noop">' +
              H.icon(s.status === 'disabled' ? 'refresh' : 'ban', { size: 12 }) +
              (s.status === 'disabled' ? '启用' : '停用') + '</button>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function P9AdmSamples() {
    var all = S.ADM_SAMPLES;
    var pub = all.filter(function (s) { return s.status === 'published'; }).length;
    var draft = all.filter(function (s) { return s.status === 'draft'; }).length;
    var off = all.filter(function (s) { return s.status === 'disabled'; }).length;
    var noGold = all.filter(function (s) { return !s.goldStandard; }).length;

    return '<div class="content-inner">' +

      '<div class="page-head">' +
        '<div class="page-head-icon">' + H.icon('folder', { size: 21 }) + '</div>' +
        '<div class="page-head-text">' +
          '<div class="page-head-title">影像报告题库</div>' +
          '<div class="page-head-sub">' + H.rich('影像报告病例的入库、脱敏、能力位声明与金标准录制') + '</div>' +
        '</div>' +
        '<div class="page-head-extra">' +
          H.tag('已发布 ' + pub, 'scored', true) +
          H.tag('草稿 ' + draft, 'pending', true) +
          H.tag('已停用 ' + off, 'revoked', true) +
        '</div>' +
      '</div>' +

      (noGold ? '<div class="banner warn">' + H.icon('warn', { size: 15 }) +
        '<span>' + H.rich('有 **' + noGold + ' 份**病例**缺金标准报告**，状态只能是「草稿」、**不可发布**——' +
          '金标准是评分依据，也是学员对照自评的参考。') + '</span></div>' : '') +

      '<div class="card mt16">' +
        '<div class="adm-bar">' +
          '<div class="filter-item"><label>部位</label>' +
            '<select class="select" data-act="noop"><option>全部部位</option><option>颅脑</option><option>头颈</option>' +
            '<option>胸部</option><option>腹部</option><option>骨肌</option><option>其他</option></select></div>' +
          '<div class="filter-item"><label>模态</label>' +
            '<select class="select" data-act="noop"><option>全部模态</option><option>CT</option><option>MR</option>' +
            '<option>DR</option><option>超声</option></select></div>' +
          '<div class="filter-item"><label>状态</label>' +
            '<select class="select" data-act="noop"><option>全部状态</option><option>已发布</option>' +
            '<option>草稿</option><option>已停用</option></select></div>' +
          '<div class="filter-item">' + H.icon('search', { size: 14 }) +
            '<input class="input" type="search" placeholder="搜索题号 / 名称 / 部位" data-act="noop"></div>' +
          '<div class="adm-bar-right">' +
            '<span class="adm-count">共 <b>' + all.length + '</b> 份病例 · 其中 <b>' + noGold + '</b> 份待补金标准</span>' +
            '<button class="btn primary sm" type="button" data-act="noop">' +
              H.icon('upload', { size: 13 }) + '上传病例（zip）</button>' +
          '</div>' +
        '</div>' +
        '<div class="adm-samples">' + all.map(sampleRow).join('') + '</div>' +
      '</div>' +

    '</div>';
  }

  /* 管理端页面共用的三件小事：能力位徽章 / 可评分标签 / 状态文案 */
  w.ADMUI = { CAP_ORDER: CAP_ORDER, CAP_LABEL: CAP_LABEL, capBadges: capBadges, scoreableTag: scoreableTag,
    STATUS_CLS: STATUS_CLS, STATUS_TXT: STATUS_TXT };

  w.P9AdmSamples = P9AdmSamples;
})(window);
