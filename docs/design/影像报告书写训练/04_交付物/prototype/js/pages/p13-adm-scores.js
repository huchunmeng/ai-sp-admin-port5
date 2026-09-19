/* P13 成绩汇总与学情（管理端）· PRD §5.14 / §6.1 路由 /imaging-exams/:id/scores
   三层下钻：任务级 → 学员级 → 病例级；外加"学情视角"（条目级失分率）。 */
(function (w) {
  'use strict';
  var S = w.SEED, H = w.H;

  var MARK_ICO = { ok: '✓', mid: '△', bad: '✗', na: '—', unassessable: '—' };
  var MARK_CLS = { ok: 'ok', mid: 'mid', bad: 'bad' };

  var NAME_MAP = null;
  function nameOf(code) {
    if (!NAME_MAP) {
      NAME_MAP = {};
      S.R1_TABLE.forEach(function (g) {
        g.items.forEach(function (it) { NAME_MAP[it.code] = it.name; });
      });
    }
    return NAME_MAP[code] || '';
  }

  /* ── 任务级（§5.14.2）── */
  function taskLevel(t, st) {
    if (!st) return '';
    var maxN = Math.max.apply(null, st.dist.map(function (d) { return d.n; }));
    var kv = [
      ['考核人数', st.assigned + ' 人'],
      ['已领取', st.claimed + ' 人'],
      ['已交卷', st.submitted + ' 人'],
      ['未交卷', (st.assigned - st.submitted) + ' 人'],
      ['均分', st.avg + ' 分'],
      ['申诉', st.appeals + ' 件']
    ];
    return '<div class="card">' +
      '<div class="card-head">' + H.icon('chart', { size: 15 }) +
        '<span>一、任务级汇总</span>' +
        '<span class="card-tag">均分只统计已交卷的作答</span>' +
      '</div>' +
      '<div class="card-body">' +
        '<div class="kv-grid">' + kv.map(function (r) {
          return '<div class="kv"><span class="kv-k">' + H.esc(r[0]) + '</span>' +
            '<span class="kv-v">' + H.esc(r[1]) + '</span></div>';
        }).join('') + '</div>' +
        '<div class="section-title mt16">' + H.icon('chart', { size: 13 }) +
          '<span>分数分布</span>' +
          '<span class="st-badge">区间按整卷归一得分</span></div>' +
        '<div style="display:flex;flex-direction:column;gap:7px">' + st.dist.map(function (d) {
          var w = maxN ? Math.round(d.n / maxN * 100) : 0;
          return '<div class="adm-loss-row" style="border-bottom:none;padding:0">' +
            '<span class="adm-loss-code">' + H.esc(d.label) + '</span>' +
            '<span class="adm-loss-bar" style="width:220px"><i style="width:' + w + '%;background:var(--adm-primary)"></i></span>' +
            '<span class="adm-loss-v">' + d.n + ' 人</span>' +
          '</div>';
        }).join('') + '</div>' +
        '<div class="tiny muted mt16">' + H.rich('「未交卷」**不按 0 分计入均分**，也不显示为 0 分。') + '</div>' +
      '</div>' +
    '</div>';
  }

  /* ── 病例级下钻（§5.14.4）── */
  function caseDetail(s, idx) {
    var c = s.cases[idx];
    if (!c) return '<div class="adm-detail"><div class="empty" style="padding:26px 0">' +
      '<div class="empty-title">该学员暂无可下钻的病例明细</div>' +
      '<div class="empty-desc">' + H.rich('未交卷 / 未领取的学员没有病例级数据；' +
        '交卷但评分失败的学员，明细按**评分失败**处理，不显示 0 分。') + '</div></div></div>';

    var unassess = c.items.filter(function (it) { return it.mark === 'unassessable' || it.mark === 'na'; });

    return '<div class="adm-detail">' +
      '<div style="display:flex;align-items:center;gap:8px;margin:12px 0 2px">' +
        s.cases.map(function (x, i) {
          return '<span class="adm-cap ' + (i === idx ? 'on' : 'off') + '" style="font-size:12px;padding:4px 12px;cursor:pointer" ' +
            'data-act="adm-stu-case" data-idx="' + i + '">' + H.esc(x.short) + ' · ' + H.esc(x.name) + '</span>';
        }).join('') +
      '</div>' +

      '<div class="adm-case-block">' +
        '<div class="adm-case-head">' +
          '<span class="adm-case-name">' + H.esc(c.short) + ' · ' + H.esc(c.name) + '</span>' +
          '<span class="adm-ver">权重 ' + H.esc(c.weight) + '</span>' +
          '<span class="adm-case-score">' + c.total + '<span class="muted" style="font-size:12px;font-weight:400"> / 100</span></span>' +
        '</div>' +

        '<div style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px">' +
          c.dims.map(function (d) {
            var ratio = d.got / d.full;
            var cls = ratio >= 0.8 ? '' : ratio >= 0.5 ? 'mid' : 'bad';
            return '<div class="dim-row">' +
              '<span class="dim-name">' + H.esc(d.dim) + '</span>' +
              '<span class="dim-bar"><i class="' + cls + '" style="width:' + Math.round(ratio * 100) + '%"></i></span>' +
              '<span class="dim-score">' + H.fixed(d.got, ratio === 1 ? 0 : 1) + ' / ' + d.full + '</span>' +
            '</div>';
          }).join('') +
        '</div>' +

        c.items.map(function (it) {
          var na = it.mark === 'unassessable' || it.mark === 'na';
          var cls = MARK_CLS[it.mark] || '';
          return '<div class="item-row">' +
            '<span class="item-ico ' + cls + '"' + (na ? ' style="background:var(--border-light);color:var(--text-tertiary)"' : '') + '>' +
              (MARK_ICO[it.mark] || '·') + '</span>' +
            '<span class="item-main">' +
              '<span class="item-name">' + H.esc(it.code) + ' ' + H.esc(nameOf(it.code)) +
                (it.mark === 'na' ? '<span class="item-flag">部分不可评</span>'
                  : it.mark === 'unassessable' ? '<span class="item-flag">不可评·已折算</span>' : '') +
              '</span>' +
              (it.comment ? '<div class="item-comment">' + H.esc(it.comment) + '</div>' : '') +
            '</span>' +
            '<span class="item-score' + (it.got === 0 && !na ? ' zero' : '') + '">' +
              H.fixed(it.got, it.got % 1 ? 1 : 0) + ' / ' + it.full + '</span>' +
          '</div>';
        }).join('') +

        /* 不可评条目按 source 分色（§5.14.4）——灰 = 去标识（甲类），蓝 = 能力位落空（乙类） */
        (unassess.length
          ? '<div class="adm-unassess" style="margin-top:12px">' +
              '<div class="tiny" style="font-weight:700;color:var(--text-secondary)">本例不可评条目（' +
                unassess.length + ' 条 · 已从分母折算）</div>' +
              unassess.map(function (it) {
                var deid = it.source === 'deidentify';
                return '<div class="adm-ua-row">' +
                  '<span class="adm-ua-mark ' + (deid ? 'deid' : 'cap') + '">' +
                    (deid ? '甲类 · 去标识' : '乙类 · 能力位') + '</span>' +
                  '<span class="adm-ua-txt"><code>' + H.esc(it.code) + '</code> ' + H.esc(nameOf(it.code)) +
                    '（' + it.full + ' 分）· ' + H.esc(it.comment || '') + '</span>' +
                '</div>';
              }).join('') +
            '</div>'
          : '') +

      '</div>' +
    '</div>';
  }

  function stuRow(s, open) {
    var sc = s.score;
    return '' +
      '<div class="adm-student' + (open ? ' open' : '') + (sc == null ? ' silent' : '') + '" data-act="adm-stu" data-id="' + H.esc(s.id) + '">' +
        '<span class="adm-stu-name">' + H.esc(s.name) + '</span>' +
        '<span class="adm-stu-class">' + H.esc(s.className) + '</span>' +
        '<span class="adm-stu-state">' +
          (s.state === '已交卷' ? H.tag('已交卷', 'submitted', true)
            : s.state === '作答中' ? H.tag('作答中', 'doing', true)
            : s.state === '未领取' ? H.tag('未领取', 'closed', true) : H.tag('未交卷', 'closed', true)) +
        '</span>' +
        '<span class="adm-stu-score">' +
          (sc == null
            ? '<b>' + H.esc(s.state) + '</b>'
            : '<b>' + sc + '</b> 分' +
              (s.attemptTotal > 1 ? ' <span class="muted tiny">第 ' + s.attemptIndex + '/' + s.attemptTotal + ' 次 · ' +
                H.esc(s.policy === 'highest' ? '取最高分' : s.policy === 'first' ? '取首次成绩' : '取最后一次') + '</span>' : '')) +
        '</span>' +
        '<span class="adm-stu-note">' +
          (s.appeal
            ? '<button class="btn sm" type="button" data-act="adm-appeal-view" data-id="' + H.esc(s.id) + '">' +
                H.icon('flag', { size: 11 }) + '有申诉</button>'
            : s.note ? H.esc(s.note)
            : s.state === '已交卷' ? H.esc(s.submitTypeLabel + ' · ' + s.submittedAt) : '—') +
          ' <span class="muted">' + (open ? '▾' : '▸') + '</span>' +
        '</span>' +
      '</div>' +
      (open ? caseDetail(s, w.appState.admCaseIdx || 0) : '');
  }

  /* ── 学情视角（§5.14.5）── */
  function learningLevel() {
    var rows = S.ADM_ITEM_STATS.slice();
    var enough = rows.filter(function (r) { return r.enough && r.lossRate != null; })
      .sort(function (a, b) { return b.lossRate - a.lossRate; });
    var few = rows.filter(function (r) { return !r.enough; }).length;
    var outOfPool = rows.length - rows.filter(function (r) { return r.assessCount > 0; }).length;

    return '<div class="card mt16">' +
      '<div class="card-head">' + H.icon('target', { size: 15 }) +
        '<span>三、学情视角 · 条目级失分率</span>' +
        '<span class="card-tag">不可评条目已踢出分母</span>' +
      '</div>' +
      '<div class="card-body">' +
        '<div class="banner">' + H.icon('info', { size: 15 }) +
          '<span>' + H.rich('**不可评条目直接从分母剔除**，否则"病例不具备的能力"会被读成"学员不会"。' +
            '可评次数 < 5 的条目标「例数不足」、**不参与排序**。') + '</span>' +
        '</div>' +
        '<div class="section-title">' + H.icon('warn', { size: 13 }) +
          '<span>失分率排行（前 8）</span>' +
          '<span class="st-badge">越靠上越该补课</span></div>' +
        enough.slice(0, 8).map(function (r) {
          var hi = r.lossRate >= 50;
          return '<div class="adm-loss-row">' +
            '<span class="adm-loss-code">' + H.esc(r.code) + '</span>' +
            '<span class="adm-loss-name">' + H.esc(r.name) + '<span class="muted"> · ' + H.esc(r.dim) + '</span></span>' +
            '<span class="adm-loss-bar"><i class="' + (hi ? '' : 'low') + '" style="width:' + Math.min(r.lossRate, 100) + '%"></i></span>' +
            '<span class="adm-loss-v">' + r.lossRate + '%</span>' +
          '</div>';
        }).join('') +
        '<div class="tiny muted mt16">' + H.rich('例数不足（可评次数 < 5）的条目 **' + few + ' 条**已折叠不列出；' +
          '整卷中从未可评的条目 **' + outOfPool + ' 条**同样不出现在排行里（没有分母就没有失分率）。') + '</div>' +
      '</div>' +
    '</div>';
  }

  function P13AdmScores() {
    var id = w.appState.admTaskId || 'AT-2026-0999';
    var t = S.ADM_TASK_BY_ID[id] || S.ADM_TASKS[2];
    var st = S.ADM_TASK_STATS[t.id];
    var open = w.appState.admStuOpen;
    var submitted = S.ADM_STUDENTS.filter(function (s) { return s.state === '已交卷'; }).length;

    return '<div class="content-inner">' +

      '<div class="page-head">' +
        '<div class="page-head-icon">' + H.icon('chart', { size: 21 }) + '</div>' +
        '<div class="page-head-text">' +
          '<div class="page-head-title">成绩汇总与学情</div>' +
          '<div class="page-head-sub"><b>' + H.esc(t.title) + '</b> · <span class="mono">' + H.esc(t.id) +
            '</span> · ' + t.caseCount + ' 例 · 整卷可评分 ' + t.scoreableMax + ' 分</div>' +
        '</div>' +
        '<div class="page-head-extra">' +
          H.stateTag(t.state) +
          H.tag('已交卷 ' + submitted + ' / ' + t.assignee.count, 'submitted', true) +
          '<button class="btn sm" type="button" data-act="adm-export">' +
            H.icon('download', { size: 12 }) + '导出成绩单</button>' +
          '<button class="btn sm" type="button" data-act="go" data-page="p11">' +
            H.icon('prev', { size: 12 }) + '返回任务列表</button>' +
        '</div>' +
      '</div>' +

      (t.overrideGate && t.overrideGate.used
        ? '<div class="banner warn">' + H.icon('warn', { size: 15 }) +
            '<span>' + H.rich('本任务发布时**覆盖了门禁**（可评分 ' + t.overrideGate.scoreableMax + ' < 85）。' +
              '成绩单须标注"本卷含不可评条目"，且**跨卷不可比**；发布原因与操作人见审计。') + '</span></div>'
        : '') +

      '<div class="mt16">' + taskLevel(t, st) + '</div>' +

      '<div class="card mt16">' +
        '<div class="card-head">' + H.icon('users', { size: 15 }) +
          '<span>二、学员级（按取分策略取值）</span>' +
          '<span class="card-tag">点行展开病例级下钻</span>' +
        '</div>' +
        '<div class="adm-bar" style="border-top:1px solid var(--border-light)">' +
          '<div class="filter-item"><label>班级</label>' +
            '<select class="select" data-act="noop"><option>全部班级</option>' +
              S.ADM_CLASSES.map(function (c) { return '<option>' + H.esc(c.name) + '</option>'; }).join('') +
            '</select></div>' +
          '<div class="filter-item"><label>状态</label>' +
            '<select class="select" data-act="noop"><option>全部</option><option>已交卷</option>' +
              '<option>作答中</option><option>未交卷</option><option>未领取</option></select></div>' +
          '<div class="filter-item"><label>分数</label>' +
            '<select class="select" data-act="noop"><option>全部</option><option>低于 60</option>' +
              '<option>60 – 79</option><option>80 – 100</option><option>有申诉</option></select></div>' +
          '<div class="adm-bar-right"><span class="adm-count">本页 <b>' + S.ADM_STUDENTS.length + '</b> 条 · 每页 50 条</span></div>' +
        '</div>' +
        S.ADM_STUDENTS.map(function (s) { return stuRow(s, open === s.id); }).join('') +
      '</div>' +

      learningLevel() +

      '<div class="card mt16">' +
        '<div class="card-head">' + H.icon('flag', { size: 15 }) +
          '<span>四、成绩申诉（只读登记）</span>' +
          '<span class="card-tag">本期不设复核 / 改分</span>' +
        '</div>' +
        '<div class="card-body">' +
          (S.ADM_STUDENTS.filter(function (s) { return s.appeal; }).length
            ? S.ADM_STUDENTS.filter(function (s) { return s.appeal; }).map(function (s) {
                return '<div class="adm-case-block">' +
                  '<div class="adm-case-head">' +
                    '<span class="adm-case-name">' + H.esc(s.name) + '</span>' +
                    '<span class="adm-ver">' + H.esc(s.appeal.filedAt) + '</span>' +
                    '<span style="margin-left:auto">' + H.tag('待线下处置', 'pending', true) + '</span>' +
                  '</div>' +
                  '<div style="font-size:12.5px;line-height:1.8;white-space:pre-wrap">' + H.esc(s.appeal.reason) + '</div>' +
                '</div>';
              }).join('')
            : '<div class="empty"><div class="empty-title">暂无申诉</div>' +
              '<div class="empty-desc">' + H.rich('本期申诉**只落登记数据**，管理端不提供复核 / 改分按钮；' +
                '处置在线下完成，线上仅留痕。') + '</div></div>') +
          '<div class="banner mb0 mt16">' + H.icon('info', { size: 15 }) +
            '<span>' + H.rich('导出成绩单（CSV / PDF）**不含金标准原文**，并写审计 `score.export`；每页 50 条。') + '</span>' +
          '</div>' +
        '</div>' +
      '</div>' +

    '</div>';
  }

  w.P13AdmScores = P13AdmScores;
})(window);
