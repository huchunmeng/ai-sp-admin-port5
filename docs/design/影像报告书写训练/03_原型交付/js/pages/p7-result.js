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
    var naCount = c.items.filter(function (i) { return i.mark === 'unassessable'; }).length;

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
            '提交方式 <span class="mono">' + (R.submitType === 'autoTimeout' ? 'autoTimeout（自动交卷）' : 'manual') + '</span></div>' +
          '<div class="rhm-sub">最后保存于 <span class="mono">' + H.esc(R.lastSavedAt) + '</span>' +
            (R.savedNotice ? ' · ' + H.icon('check', { size: 12 }) + ' 草稿已落库' : '') + '</div>' +
        '</div>' +
        '<div class="page-head-extra">' +
          H.tag(R.appealFiled ? '复核已申请' : '可申请复核', R.appealFiled ? 'scored' : 'info', true) +
        '</div>' +
      '</div>' +

      '<div class="res-note">' + H.icon('info', { size: 14 }) +
        '<span>' + H.rich('成绩按例给出并**透视到条目**。本期样本有 **4 条条目（共 16 分）**落在能力边界之外（测量工具 / 增强序列 / 既往片 / 分期依据），这些条目**整条移出分母**，成绩按 `实得分 ÷ 可评总分 × 100` **归一折算**；原始分与归一分**双存**（`rawTotal` / `normalized`）。') + '</span>' +
      '</div>' +

      '<div class="card">' +
        '<div class="card-head">' + H.icon('grid', { size: 15 }) +
          '<span>分例得分</span>' +
          '<span class="card-tag">点选某例查看维度与条目明细</span>' +
        '</div>' +
        '<div class="card-body tight">' +
          '<div class="case-chips">' + R.cases.map(function (x, i) {
            var on = i === idx;
            return '<div class="case-chip" data-act="res-case" data-idx="' + i + '" style="cursor:pointer;min-width:210px;' +
              (on ? 'border-color:var(--primary);box-shadow:0 0 0 2px rgba(37,99,235,.10)' : '') + '">' +
              '<div class="cc-name">' + H.esc(x.short) + ' · ' + H.esc(x.name) + '</div>' +
              '<div class="cc-score">' + x.score + '<span style="font-size:12px;color:var(--text-tertiary)"> / 100</span></div>' +
              '<div class="cc-meta mono">raw ' + x.rawTotal + ' / ' + x.scoreableMax + ' · 权重 ' + x.weight + '</div>' +
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
              '<div class="tiny muted mt8">' + H.rich('维度分是**整卷视角**的合成分（原始分，非归一）；该例归一后为 **' + c.score + '**。') + '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div class="wb-side">' +
          '<div class="card">' +
            '<div class="card-head">' + H.icon('flag', { size: 15 }) + '<span>该例数据口径</span></div>' +
            '<div class="card-body tight">' +
              '<div class="kv-grid" style="grid-template-columns:1fr">' +
                '<div class="kv"><span class="kv-k">归一分（成绩）</span><span class="kv-v mono">' + c.score + ' / 100</span></div>' +
                '<div class="kv"><span class="kv-k">原始分（rawTotal）</span><span class="kv-v mono">' + c.rawTotal + '</span></div>' +
                '<div class="kv"><span class="kv-k">可评分（scoreableMax）</span><span class="kv-v mono">' + c.scoreableMax + '</span></div>' +
                '<div class="kv"><span class="kv-k">不可评条目数</span><span class="kv-v mono">' + naCount + ' 条（' + naCount * 4 + ' 分）</span></div>' +
                '<div class="kv"><span class="kv-k">算式</span><span class="kv-v mono">' + c.rawTotal + ' ÷ ' + c.scoreableMax + ' × 100 = ' + c.score + '</span></div>' +
              '</div>' +
              '<div class="banner mt12 mb0" style="padding:8px 11px;font-size:11.5px">' + H.icon('info', { size: 13 }) +
                '<span>' + H.rich('`scoreableMax` 是**派生字段**，由样本能力位现算，**不展示给学生**；学生只看到成绩与"该项不可评·已折算"。') + '</span>' +
              '</div>' +
            '</div>' +
          '</div>' +

          '<div class="card mt12">' +
            '<div class="card-head">' + H.icon('eye', { size: 15 }) + '<span>参考报告</span></div>' +
            '<div class="card-body tight">' +
              '<div class="tip-locked-box" style="padding:22px 6px">' +
                '<div class="lock-ico">' + H.icon('lock', { size: 28 }) + '</div>' +
                '<div class="lock-title" style="font-size:13.5px">考核侧不开放金标准</div>' +
                '<div class="lock-desc">' + H.rich('参考报告只在**训练侧 T4**（自评提交后）下发；考核侧**任何时候都不下发**，避免题目外泄（§5.8）。') + '</div>' +
                '<div class="lock-note">' + H.rich('要拿参考报告，请回到**训练模式**练同一病种。') + '</div>' +
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
          '<button class="btn sm" type="button" data-act="appeal">' +
            H.icon('flag', { size: 13 }) + (R.appealFiled ? '已申请复核' : '申请复核') + '</button>' +
        '</div>' +
      '</div>' +

      '<div class="card mt16">' +
        '<div class="card-head">' + H.icon('warn', { size: 15 }) +
          '<span>本页关键状态</span>' +
          '<span class="card-tag">评分中 · 评分失败</span>' +
        '</div>' +
        '<div class="card-body">' +

          '<div class="section-title">' + H.icon('clock', { size: 13 }) +
            '<span>评分中</span><span class="st-badge">可离开页面，回来轮询</span></div>' +
          '<div class="score-pending">' +
            '<div class="spinner"></div>' +
            '<div class="sp-title">评分进行中</div>' +
            '<div class="sp-desc">' + H.rich('成绩生成中，通常数秒内完成。**可以离开页面**，回来时自动轮询；轮询不产生副作用。') + '</div>' +
          '</div>' +

          '<div class="divider"></div>' +

          '<div class="section-title">' + H.icon('warn', { size: 13 }) +
            '<span>评分失败</span><span class="st-badge">自动重试 3 次后转人工</span></div>' +
          '<div class="banner error">' + H.icon('warn', { size: 15 }) +
            '<span>' + H.rich('评分引擎超时，已自动重试 **1 / 3** 次。3 次仍失败则提示"**成绩稍后由老师核定**"，并保留「申请复核」入口；不把失败暴露成空白分数。') + '</span>' +
            '<button class="btn sm" type="button" data-act="noop" style="margin-left:auto">' +
              H.icon('refresh', { size: 13 }) + '重试评分</button>' +
          '</div>' +

        '</div>' +
      '</div>' +

    '</div>';
  }

  w.P7Result = P7Result;
})(window);
