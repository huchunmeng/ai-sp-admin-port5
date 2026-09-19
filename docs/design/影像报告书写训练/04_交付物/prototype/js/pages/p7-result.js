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
        '<span>' + H.rich('成绩按例给出并**透视到条目**。本期样本有 **4 条条目（共 16 分）**落在能力边界之外（测量工具 / 增强序列 / 既往片 / 分期依据），这些条目**整条移出分母**，成绩按可评分项**归一折算**。' +
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
              '<div class="tiny muted mt8">' + H.rich('维度分是**整卷视角**的合成分（原始分，非归一）；该例归一后为 **' + c.total + '**。') + '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div class="wb-side">' +
          '<div class="card" style="border-style:dashed">' +
            '<div class="card-head">' + H.icon('flag', { size: 15 }) + '<span>该例数据口径</span>' +
              H.tag('评审专用 · 学生端不展示', 'diff-mid', true) + '</div>' +
            '<div class="card-body tight">' +
              '<div class="banner mb12" style="padding:8px 11px;font-size:11.5px;background:var(--diff-mid-bg,#fffbeb);border-color:#fde68a">' +
                H.icon('warn', { size: 13 }) +
                '<span>' + H.rich('按 §5.5.1，**学生成绩单不展示 `scoreableMax`**（避免"这卷只考了 84 分"被误读为扣分理由）。' +
                  '本卡片是**给评审看的口径核对窗**，不是学生可见界面；学生侧只看到成绩与条目级"该项已折算"标注。') + '</span>' +
              '</div>' +
              '<div class="kv-grid" style="grid-template-columns:1fr">' +
                '<div class="kv"><span class="kv-k">`total`（成绩·归一）</span><span class="kv-v mono">' + c.total + ' / 100</span></div>' +
                '<div class="kv"><span class="kv-k">`rawTotal`（原始分）</span><span class="kv-v mono">' + c.rawTotal + '</span></div>' +
                '<div class="kv"><span class="kv-k">`scoreableMax`（归一分母）</span><span class="kv-v mono">' + c.scoreableMax + '</span></div>' +
                '<div class="kv"><span class="kv-k">不可评条目数</span><span class="kv-v mono">' + naCount + ' 条（' + naCount * 4 + ' 分）</span></div>' +
                '<div class="kv"><span class="kv-k">算式</span><span class="kv-v mono">' + c.rawTotal + ' ÷ ' + c.scoreableMax + ' × 100 = ' + c.total + '</span></div>' +
              '</div>' +
              '<div class="tiny muted mt12" style="line-height:1.8">' +
                H.rich('三者**同时持久化**（§5.5.1 ③ raw / normalized 双存）——否则影像教学底座补齐测量工具后，**历史成绩无法重算**。') +
              '</div>' +
              '<div class="banner mt12 mb0" style="padding:8px 11px;font-size:11.5px">' + H.icon('info', { size: 13 }) +
                '<span>' + H.rich('例外：若整卷 `scoreableMax < 85` 且组卷者**二次确认强行发布**，则该卷成绩单会标注"本卷可评分 X 分"（§5.5.1 门禁表）。') + '</span>' +
              '</div>' +
            '</div>' +
          '</div>' +

          '<div class="card mt12">' +
            '<div class="card-head">' + H.icon('eye', { size: 15 }) + '<span>参考报告（金标准原文）</span>' +
              H.tag(R.goldStandardRevealed ? '本任务已开放' : '本任务未开放', R.goldStandardRevealed ? 'scored' : 'plain', true) + '</div>' +
            '<div class="card-body tight">' +
              '<div class="tip-locked-box" style="padding:22px 6px">' +
                '<div class="lock-ico">' + H.icon('lock', { size: 28 }) + '</div>' +
                '<div class="lock-title" style="font-size:13.5px">本任务未开放（由老师组卷时设置）</div>' +
                '<div class="lock-desc">' + H.rich('考核结果页是否露金标准原文，由任务级配置开关 `revealGoldStandardAfterSubmit` 决定，**默认 false**（§5.5.1 / D9 / §7.4）。') + '</div>' +
                '<div class="lock-note">' + H.rich('开为 true 时，此处展示**金标准报告全文**（BDD 场景 12）；为 false 时只给维度/条目级缺失清单，不含金标准原文与事实词。训练侧不受此开关影响——T4 自评提交后**必定下发**。') + '</div>' +
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
          H.rich('重考粒度是**整卷**（不提供单例重考，§7.2 重考粒度），新起一次 `attempt`；成绩取值口径由组卷时的 `scorePolicy` 决定。已评分的 attempt 冻结不可改。') +
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
