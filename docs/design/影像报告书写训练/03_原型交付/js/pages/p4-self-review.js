/* P4 对照自评页（T4） · PRD §5.2.4 自评 / §5.8 下发门禁 / §6.2
   A 态：自评表（未提交 → 对照区被门禁挡住）；B 态：提交后展开对照双栏 + 差异。 */
(function (w) {
  'use strict';
  var S = w.SEED, H = w.H;

  var MARK_LABEL = { wrote: '写了', missed: '没写', unsure: '不确定' };

  /* 每例的不可评条目集合（按能力位现算，不写死旗标） */
  function unassessableSet(caseId) {
    var set = {};
    S.scoreableOf(caseId).lost.forEach(function (l) { set[l.code] = l.why; });
    return set;
  }

  /* 自评合计：按"写了"的条目分值合计，不可评条目整体不纳入，分母 = 可评分（§5.2.4 / 附录 E） */
  function selfTotals(caseId) {
    var na = unassessableSet(caseId);
    var marks = S.SELF_REVIEW.marks;
    var pool = 0, wrote = 0, counts = { wrote: 0, unsure: 0, missed: 0, na: 0 };
    S.R1_TABLE.forEach(function (g) {
      g.items.forEach(function (it) {
        if (na[it.code]) { counts.na++; return; }
        pool += it.score;
        var m = marks[it.code] || 'unsure';
        if (m === 'wrote') { wrote += it.score; counts.wrote++; }
        else if (m === 'missed') { counts.missed++; }
        else { counts.unsure++; }
      });
    });
    return { pool: pool, wrote: wrote, counts: counts, normalized: Math.round(wrote / pool * 100) };
  }

  function selfTable(caseId) {
    var na = unassessableSet(caseId);
    var marks = S.SELF_REVIEW.marks;

    return '<div class="selfreview-list">' + S.R1_TABLE.map(function (g) {
      var rows = g.items.map(function (it) {
        var isNa = !!na[it.code];
        var m = marks[it.code] || 'unsure';
        var pills = isNa
          ? '<span class="tiny" style="color:var(--text-tertiary)">本样本不可评</span>'
          : '<span class="pill-group">' + ['wrote', 'missed', 'unsure'].map(function (k) {
              return '<span class="pill' + (m === k ? ' on-' + k : '') + '" ' +
                'data-act="mark" data-code="' + it.code + '" data-mark="' + k + '">' +
                MARK_LABEL[k] + '</span>';
            }).join('') + '</span>';
        return '<div class="sr-row' + (isNa ? ' na' : '') + '">' +
          '<span class="sr-name"><span class="sr-code">' + it.code + '</span>' + H.esc(it.name) + '</span>' +
          '<span class="sr-score">' + (isNa ? '—' : it.score + ' 分') + '</span>' +
          pills +
        '</div>';
      }).join('');
      return '<div class="sr-group">' +
        '<div class="sr-group-head">' + H.icon('list', { size: 13 }) +
          '<span>' + H.esc(g.dim) + '</span>' +
          '<span class="sr-group-score">满分 ' + g.full + ' 分</span>' +
        '</div>' + rows +
      '</div>';
    }).join('') + '</div>';
  }

  /* 对照双栏（绿底 = 参考报告中你未覆盖的内容） */
  var CMP = {
    your: [
      { t: '检查技术', p: [{ x: '胸部CT平扫。' }] },
      { t: '影像所见', p: [{ x: '右肺上叶尖段见一枚实性结节，大小约 12mm×10mm，边缘可见分叶及短毛刺，周围见局限性胸膜牵拉。' }] },
      { t: '诊断意见', p: [{ x: '右肺上叶结节，考虑周围型肺癌，建议增强CT。' }] }
    ],
    gold: [
      { t: '检查技术', p: [{ x: '胸部CT平扫。' }] },
      { t: '影像所见', p: [
        { x: '右肺上叶尖段见一枚实性结节，大小约 12mm×10mm，边缘可见分叶及短毛刺，周围见局限性胸膜牵拉。' },
        { x: '双肺其余肺野纹理清晰，未见明确结节及实变影。纵隔居中，气管及主支气管通畅，纵隔及肺门未见明显肿大淋巴结。双侧胸腔未见积液，心影及大血管形态未见异常。', hl: true }
      ] },
      { t: '诊断意见', p: [
        { x: '右肺上叶尖段实性结节，边缘分叶伴短毛刺、胸膜牵拉，考虑周围型肺癌可能性大，建议增强CT及多学科评估。', hl: true }
      ] }
    ]
  };

  function colBody(segs) {
    return segs.map(function (s, i) {
      return (i ? '' : '') + '<span class="seg-title">' + H.esc(s.t) + '</span>' +
        s.p.map(function (x) {
          return x.hl ? '<span class="hl-ok">' + H.esc(x.x) + '</span>' : H.esc(x.x);
        }).join('');
    }).join('\n');
  }

  function P4SelfReview() {
    var caseId = S.SELF_REVIEW.caseId;
    var c = S.CASE_BY_ID[caseId];
    var t = selfTotals(caseId);
    var submitted = S.SELF_REVIEW.submitted;
    var sr = S.SELF_REVIEW;

    var total = t.wrote;
    var sysNorm = sr.systemNormalized;
    var dev = t.normalized - sysNorm;

    return '<div class="content-inner">' +

      '<div class="page-head">' +
        '<div class="page-head-icon">' + H.icon('clipboard-check', { size: 21 }) + '</div>' +
        '<div class="page-head-text">' +
          '<div class="page-head-title">对照自评（T4）</div>' +
          '<div class="page-head-sub">' + H.rich('先**自评**、再看参考 —— 训练侧的收口动作，**不可跳过**（允许"整页快速自评"）') + '</div>' +
        '</div>' +
        '<div class="page-head-extra">' +
          H.tag(H.esc(c.title), 'info', true) +
          H.tag('回合 ' + sr.roundIndex, '', true) +
        '</div>' +
      '</div>' +

      (submitted
        ? '<div class="banner ok">' + H.icon('check', { size: 15 }) +
            '<span>' + H.rich('自评已提交（<b class="mono">14:41:20</b>）→ 对照区已解锁。自评结果**不参与任何计算**，仅作学情信号与教师端可消费数据。') + '</span>' +
          '</div>'
        : '<div class="banner">' + H.icon('info', { size: 15 }) +
            '<span>' + H.rich('自评表按 **R1 表逐条（含分值）**；**不可评条目**显示为"本样本不可评"且不纳入自评总分，避免学生按用不了的工具给自己打低分。') + '</span>' +
          '</div>') +

      '<div class="card">' +
        '<div class="card-head">' + H.icon('list', { size: 15 }) +
          '<span>自评表 · R1 表 23 条</span>' +
          '<span class="card-tag">写了 / 没写 / 不确定 · 条目 + 分值全显示</span>' +
        '</div>' +
        '<div class="card-body">' + selfTable(caseId) + '</div>' +
        '<div class="card-foot">' +
          '<span class="tiny muted">' +
            '写了 <b>' + t.counts.wrote + '</b> 条 · 不确定 <b>' + t.counts.unsure + '</b> 条 · ' +
            '没写 <b>' + t.counts.missed + '</b> 条 · 不可评 <b>' + t.counts.na + '</b> 条' +
          '</span>' +
          '<span style="margin-left:auto"></span>' +
          '<button class="btn sm" type="button" data-act="quick-self">' + H.icon('refresh', { size: 13 }) + '整页快速自评（全部"不确定"）</button>' +
          '<button class="btn primary sm" type="button" data-act="toggle-submit">' +
            H.icon('send', { size: 13 }) + (submitted ? '撤销提交（演示）' : '提交自评') + '</button>' +
        '</div>' +
      '</div>' +

      '<div class="card">' +
        '<div class="card-head">' + H.icon('chart', { size: 15 }) +
          '<span>自评合计</span>' +
          '<span class="card-tag">' + H.rich('口径：按"写了"的条目分值合计，按可评分归一') + '</span>' +
        '</div>' +
        '<div class="card-body">' +
          '<div class="row wrap" style="gap:22px">' +
            '<div style="flex:1;min-width:260px">' +
              '<div class="kv-grid">' +
                '<div class="kv"><span class="kv-k">自评总分（原始）</span><span class="kv-v mono">' + total + ' / ' + t.pool + '</span></div>' +
                '<div class="kv"><span class="kv-k">自评归一</span><span class="kv-v mono">' + t.normalized + ' / 100</span></div>' +
                '<div class="kv"><span class="kv-k">系统归一（同回合）</span><span class="kv-v mono">' + sysNorm + ' / 100</span></div>' +
                '<div class="kv"><span class="kv-k">对照差异</span><span class="kv-v mono" style="color:' +
                  (dev < 0 ? 'var(--warning)' : 'var(--primary)') + '">' + (dev > 0 ? '+' : '') + dev + '</span></div>' +
              '</div>' +
            '</div>' +
            '<div style="flex:1;min-width:280px">' +
              '<div class="self-diff">' +
                '<div class="sd-item"><span class="sd-k">你的自评</span><span class="sd-v">' + t.normalized + '</span></div>' +
                '<div class="sd-item"><span class="sd-k">系统评分</span><span class="sd-v">' + sysNorm + '</span></div>' +
                '<div class="sd-item"><span class="sd-k">偏差</span><span class="sd-v ' + (dev < 0 ? 'up' : 'down') + '">' +
                  (dev > 0 ? '+' : '') + dev + '</span></div>' +
              '</div>' +
              '<div class="tiny muted mt8" style="line-height:1.75">' +
                H.rich('偏差为负 = 你**低估了自己**。分母为该样本**可评分 ' + t.pool + '**（已扣掉 4 条不可评，共 16 分）。') +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +

      /* ── A 态：门禁 ── */
      '<div class="card">' +
        '<div class="card-head">' + H.icon('lock', { size: 15 }) +
          '<span>【状态 A】对照区 · 自评未提交</span>' +
          '<span class="card-tag">' + H.rich('门禁在**服务端**，前端隐藏仅为体验') + '</span>' +
        '</div>' +
        '<div class="card-body">' +
          '<div class="gate-hold">' +
            '<div class="gate-ico">' + H.icon('lock', { size: 32 }) + '</div>' +
            '<div class="gate-title">提交自评后才能查看对照</div>' +
            '<div class="gate-desc">' +
              H.rich('对照接口**服务端**校验 `round{n}.selfReview` 已提交，未提交一律拒绝返回对照数据，返回 `409 SELF_REVIEW_REQUIRED`。' +
                '前端隐藏**不作为门禁** —— 否则学生改请求即可绕过"先自评"。') +
            '</div>' +
            '<button class="btn primary sm" type="button" data-act="toggle-submit">' +
              H.icon('send', { size: 13 }) + '提交自评并解锁对照</button>' +
          '</div>' +
        '</div>' +
      '</div>' +

      /* ── B 态：对照 ── */
      '<div class="card">' +
        '<div class="card-head">' + H.icon('eye', { size: 15 }) +
          '<span>【状态 B】对照差异 · 自评提交后</span>' +
          '<span class="card-tag">' + H.rich('只下发**当例**金标准 · `Cache-Control: no-store`') + '</span>' +
        '</div>' +
        '<div class="card-body">' +
          '<div class="compare-grid">' +
            '<div class="compare-col">' +
              '<div class="compare-head">' + H.icon('pen', { size: 14 }) + '<span>你的报告</span></div>' +
              '<div class="compare-body">' + colBody(CMP.your) + '</div>' +
            '</div>' +
            '<div class="compare-col gold">' +
              '<div class="compare-head">' + H.icon('check', { size: 14 }) + '<span>参考报告（金标准）</span></div>' +
              '<div class="compare-body">' + colBody(CMP.gold) + '</div>' +
            '</div>' +
          '</div>' +
          '<div class="compare-legend">' +
            '<span><span class="hl-ok">绿底</span> = 参考报告中你未覆盖的内容</span>' +
            '<span>' + H.rich('参考报告只在**训练侧 T4** 下发，考核侧任何时候都不下发（§5.8）') + '</span>' +
          '</div>' +

          '<div class="divider"></div>' +

          '<div class="section-title">' + H.icon('redo', { size: 13 }) +
            '<span>下一步</span><span class="st-badge">重写不限次，但不是硬门槛</span></div>' +
          '<div class="row wrap">' +
            '<button class="btn primary sm" type="button" data-act="go" data-page="p3">' +
              H.icon('redo', { size: 13 }) + '重写本回合（回到 T1）</button>' +
            '<button class="btn sm" type="button" data-act="noop">' +
              H.icon('plus', { size: 13 }) + '重练（新回合，配额重置）</button>' +
            '<button class="btn sm" type="button" data-act="go" data-page="p2">' +
              H.icon('next', { size: 13 }) + '换一例样本</button>' +
            '<span class="tiny muted" style="margin-left:auto">完成一例 = 提交 T4 自评；本回合已计入「已练 N 次」</span>' +
          '</div>' +
        '</div>' +
      '</div>' +

    '</div>';
  }

  w.P4SelfReview = P4SelfReview;
  w.P4Totals = selfTotals;
})(window);
