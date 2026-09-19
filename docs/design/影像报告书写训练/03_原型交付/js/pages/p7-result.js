/* P7 评分结果页 · PRD §6.4 线框 / §5.5.1 折算与双存
   整卷分 → 分例 chips → 维度条 → 23 条逐条点评（含不可评折算标注）。 */
(function (w) {
  'use strict';
  var S = w.SEED, H = w.H;

  var MARK_ICO = { ok: '✓', mid: '△', bad: '✗', na: '—', unassessable: '—' };
  var MARK_CLS = { ok: 'ok', mid: 'mid', bad: 'bad' };

  function dimRows(c) {
    return c.dims.map(function (d) {
      var ratio = d.got / d.full;
      var cls = ratio >= 0.8 ? '' : ratio >= 0.5 ? 'mid' : 'bad';
      return '<div class="dim-row">' +
        '<span class="dim-name">' + H.esc(d.dim) + '</span>' +
        '<span class="dim-bar"><i class="' + cls + '" style="width:' + Math.round(ratio * 100) + '%"></i></span>' +
        '<span class="dim-score">' + H.fixed(d.got, ratio === 1 ? 0 : 1) + ' / ' + d.full + '</span>' +
      '</div>';
    }).join('');
  }

  function itemRows(c) {
    return c.items.map(function (it) {
      var cls = MARK_CLS[it.mark] || '';
      var na = it.mark === 'unassessable' || it.mark === 'na';
      var flag = it.mark === 'na' ? '部分不可评' : it.mark === 'unassessable' ? '不可评·已折算' : '';
      return '<div class="item-row">' +
        '<span class="item-ico ' + cls + '"' + (na ? ' style="background:var(--border-light);color:var(--text-tertiary)"' : '') + '>' +
          (MARK_ICO[it.mark] || '·') + '</span>' +
        '<span class="item-main">' +
          '<span class="item-name">' + H.esc(it.code) + ' ' + H.esc(nameOf(it.code)) +
            (flag ? '<span class="item-flag">' + flag + '</span>' : '') + '</span>' +
          (it.comment ? '<div class="item-comment">' + H.esc(it.comment) + '</div>' : '') +
        '</span>' +
        '<span class="item-score' + (it.got === 0 && !na ? ' zero' : '') + '">' +
          H.fixed(it.got, it.got % 1 ? 1 : 0) + ' / ' + it.full + '</span>' +
      '</div>';
    }).join('');
  }

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

  function P7Result() {
    var R = S.RESULT;
    var idx = w.appState.resCaseIdx || 0;
    var c = R.cases[idx];

    return '<div class="content-inner">' +

      '<div class="res-hero">' +
        '<div class="res-hero-main">' +
          '<div class="score-hero">' +
            '<span class="score-num">' + R.totalScore + '</span>' +
            '<span class="score-den">/ 100</span>' +
            '<span class="score-cap">整卷得分（' + R.cases.length + ' 例等权）</span>' +
          '</div>' +
        '</div>' +
        '<div class="res-hero-meta">' +
          '<div class="rhm-title">' + H.esc(R.title) + '</div>' +
          '<div class="rhm-sub">' + H.esc(R.taskId) + ' · 第 ' + R.attemptIndex + ' / ' + R.attemptTotal + ' 次作答 · ' +
            '提交方式 <span class="mono">' + (R.submitType === 'autoTimeout' ? '自动交卷' : '手动交卷') + '</span></div>' +
          '<div class="rhm-sub">最后保存于 <span class="mono">' + H.esc(R.lastSavedAt) + '</span>' +
            (R.savedNotice ? ' · ' + H.icon('check', { size: 12 }) + ' 草稿已落库' : '') + '</div>' +
        '</div>' +
        '<div class="page-head-extra">' +
          H.tag(R.appealFiled ? '复核已申请' : '可申请复核', R.appealFiled ? 'scored' : 'info', true) +
        '</div>' +
      '</div>' +

      '<div class="res-note">' + H.icon('info', { size: 14 }) +
        '<span>' + H.rich('成绩按例给出并**透视到条目**。本期病例中有 **4 条条目（共 16 分）**落在能力边界之外（测量工具 / 增强序列 / 既往片 / 分期依据），这些条目**整条移出分母**，成绩按可评分项**归一折算**。' +
          '换句话说：这里的满分对应的是**"本卷实际能考到的量"**，不是扣分理由。') + '</span>' +
      '</div>' +

      '<div class="card">' +
        '<div class="card-head">' + H.icon('grid', { size: 15 }) +
          '<span>分例得分</span>' +
          '<span class="card-tag">点选某例查看维度与条目明细</span>' +
        '</div>' +
        '<div class="card-body tight">' +
          '<div class="case-chips">' + R.cases.map(function (x, i) {
            var on = i === idx;
            var naN = x.items.filter(function (it) { return it.mark === 'unassessable' || it.mark === 'na'; }).length;
            return '<div class="case-chip" data-act="res-case" data-idx="' + i + '" style="cursor:pointer;min-width:210px;' +
              (on ? 'border-color:var(--primary);box-shadow:0 0 0 2px rgba(37,99,235,.10)' : '') + '">' +
              '<div class="cc-name">' + H.esc(x.short) + ' · ' + H.esc(x.name) + '</div>' +
              '<div class="cc-score">' + x.total + '<span style="font-size:12px;color:var(--text-tertiary)"> / 100</span></div>' +
              '<div class="cc-meta mono">权重 ' + x.weight + ' · 已折算 ' + naN + ' 条</div>' +
            '</div>';
          }).join('') + '</div>' +
        '</div>' +
      '</div>' +

      '<div class="wb-grid mt12">' +
        '<div class="wb-main">' +
          '<div class="card">' +
            '<div class="card-head">' + H.icon('chart', { size: 15 }) +
              '<span>维度得分 · ' + H.esc(c.short) + '</span>' +
              '<span class="card-tag">R1 表 5 维度 / 23 条目</span>' +
            '</div>' +
            '<div class="card-body">' +
              dimRows(c) +
              '<div class="tiny muted mt8">' + H.rich('维度分为原始分（非归一）；该例归一后为 **' + c.total + '**。') + '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div class="wb-side">' +
          '<div class="card">' +
            '<div class="card-head">' + H.icon('eye', { size: 15 }) + '<span>参考报告（金标准原文）</span>' +
              H.tag(R.goldStandardRevealed ? '本任务已开放' : '本任务未开放', R.goldStandardRevealed ? 'scored' : 'plain', true) + '</div>' +
            '<div class="card-body tight">' +
              '<div class="tip-locked-box" style="padding:22px 6px">' +
                '<div class="lock-ico">' + H.icon('lock', { size: 28 }) + '</div>' +
                '<div class="lock-title" style="font-size:13.5px">本任务未开放（由老师组卷时设置）</div>' +
                '<div class="lock-desc">' + H.rich('本任务未开放参考报告原文，你仍可看到**维度与条目级的缺失清单**。') + '</div>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div class="card mt12">' +
        '<div class="card-head">' + H.icon('list', { size: 15 }) +
          '<span>逐条点评 · ' + H.esc(c.short) + '</span>' +
          '<span class="card-tag">✓ 满分 · △ 部分 · ✗ 未得分 · — 不可评（已折算）</span>' +
        '</div>' +
        '<div class="card-body">' + itemRows(c) + '</div>' +
        '<div class="card-foot">' +
          '<div class="res-foot" style="margin:0;flex:1;background:transparent;padding:0">' +
            '<span>' + H.icon('info', { size: 14 }) +
              ' 有异议可申请复核；复核期间成绩冻结，不影响其他任务</span>' +
          '</div>' +
          (R.makeupFiled
            ? '<button class="btn sm" type="button" disabled>' + H.icon('check', { size: 13 }) + '补考申请已登记</button>'
            : '<button class="btn sm" type="button" data-act="makeup">' +
                H.icon('refresh', { size: 13 }) + '因系统原因申请补考</button>') +
          (R.attemptsUsed >= R.maxAttempts
            ? '<button class="btn sm" type="button" disabled title="重考次数已用完（' + R.attemptsUsed + ' / ' + R.maxAttempts + '）">' +
                H.icon('redo', { size: 13 }) + '整卷重考（' + R.attemptsUsed + ' / ' + R.maxAttempts + '，已用完）</button>'
            : '<button class="btn sm" type="button" data-act="noop">' +
                H.icon('redo', { size: 13 }) + '整卷重考（剩 ' + (R.maxAttempts - R.attemptsUsed) + ' 次）</button>') +
          '<button class="btn sm" type="button" data-act="appeal">' +
            H.icon('flag', { size: 13 }) + (R.appealFiled ? '已申请复核' : '申请复核') + '</button>' +
        '</div>' +
        '<div class="tiny muted" style="padding:0 20px 14px;line-height:1.8">' +
          H.rich('重考粒度是**整卷**（不提供单例重考）；已评分的作答冻结不可改。') +
        '</div>' +
      '</div>' +

    '</div>';
  }

  w.P7Result = P7Result;
})(window);
