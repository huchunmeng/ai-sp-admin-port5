/* P12 组卷与发布（管理端）· PRD §5.13 / §6.1 路由 /imaging-exams/create/:id?
   一页四步（基本信息 → 选样与权重 → 发布设置 → 确认发布），草稿只存本机、不落服务端。 */
(function (w) {
  'use strict';
  var S = w.SEED, H = w.H;
  var U = w.ADMUI;

  var STEPS = ['基本信息', '选样与权重', '发布设置', '确认发布'];

  function stepsBar(cur) {
    return '<div class="adm-steps">' + STEPS.map(function (label, i) {
      var n = i + 1;
      var cls = n < cur ? 'done' : n === cur ? 'current' : '';
      return (i ? '<div class="adm-step-line' + (n <= cur ? ' done' : '') + '"></div>' : '') +
        '<div class="adm-step ' + cls + '" data-act="adm-step" data-step="' + n + '" style="cursor:pointer">' +
          '<span class="adm-step-no">' + (n < cur ? '✓' : n) + '</span>' +
          '<span class="adm-step-label">' + H.esc(label) + '</span>' +
        '</div>';
    }).join('') + '</div>';
  }

  /* ── 第 1 步：基本信息 ── */
  function step1(d) {
    var s = d.step1;
    return '<div class="card-body">' +
      '<div class="field"><div class="field-label">任务名称<span class="req-star">*</span></div>' +
        '<input class="input" value="' + H.esc(s.title) + '" data-act="noop">' +
        '<div class="tiny muted" style="margin-top:5px">' +
          H.rich('学员在「我的任务」列表里看到的就是这个名称。') + '</div></div>' +
      '<div class="field"><div class="field-label">任务说明<span class="field-note">可选 · 学员可见</span></div>' +
        '<textarea class="textarea" rows="2" data-act="noop">' + H.esc(s.desc) + '</textarea></div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0 16px">' +
        '<div class="field"><div class="field-label">计时方式<span class="req-star">*</span></div>' +
          '<select class="select" data-act="noop">' +
            '<option' + (s.durationMode === 'whole' ? ' selected' : '') + '>整卷计时（whole）</option>' +
            '<option' + (s.durationMode === 'perCase' ? ' selected' : '') + '>单例计时（perCase）</option>' +
          '</select>' +
          '<div class="tiny muted" style="margin-top:5px">' +
            H.rich('整卷：切例不停表；单例：本例锁定后不可再改。') + '</div></div>' +
        '<div class="field"><div class="field-label">时长（分钟）<span class="req-star">*</span></div>' +
          '<input class="input" value="' + s.durationMinutes + '" data-act="noop">' +
          '<div class="tiny muted" style="margin-top:5px">默认 20 分钟。</div></div>' +
        '<div class="field"><div class="field-label">评价表版本<span class="field-note">只读</span></div>' +
          '<input class="input" value="' + H.esc(s.evaluationTableVersion) + '（R1 表 23 条 / 100 分）" disabled>' +
          '<div class="tiny muted" style="margin-top:5px">评价表版本化，改表不改历史成绩。</div></div>' +
      '</div>' +
    '</div>';
  }

  /* ── 第 2 步：选样与权重 ── */
  function starRow(id, n) {
    var stars = '';
    for (var i = 1; i <= 5; i++) {
      stars += '<span class="adm-star' + (i <= n ? ' on' : '') + '" data-act="adm-star" data-id="' + H.esc(id) +
        '" data-star="' + i + '">' + H.icon('star', { size: 13, weight: 1.6 }) + '</span>';
    }
    return '<span class="adm-stars">' + stars + '<span class="adm-stars-cap">' + n + '/5 星</span></span>';
  }

  function pickRow(s, d) {
    var picked = d.picked[s.id];
    var sc = S.scoreableOf(s.id);
    var ref = S.draftRefs().filter(function (r) { return r.caseId === s.id; })[0];
    var usable = s.status === 'published' && s.goldStandard;
    return '<div class="adm-sample' + (picked ? ' picked' : '') + (usable ? '' : ' off') + '"' +
        (usable ? ' data-act="adm-pick" data-id="' + H.esc(s.id) + '"' : '') + '>' +
      '<input class="adm-pick" type="checkbox"' + (picked ? ' checked' : '') + (usable ? '' : ' disabled') + '>' +
      '<div class="adm-thumb">' + H.icon(s.ico || 'image', { size: 18 }) +
        '<span class="adm-thumb-tag">' + H.esc(s.modality) + '</span></div>' +
      '<div class="adm-sample-main">' +
        '<div class="adm-sample-title">' + H.esc(s.title) +
          ' <span class="adm-ver">' + H.esc(s.id) + ' · v' + s.version + '</span>' +
          (usable ? '' : ' ' + H.tag(s.status === 'draft' ? '草稿 · 不可选' : '已停用 · 不可选', 'diff-bad', true)) +
        '</div>' +
        '<div class="adm-sample-meta">' + H.levelTag(s) + ' · ' + H.esc(s.bodyPart) +
          ' · 序列 <span class="mono">' + s.series.axial + '/' + s.series.coronal + '/' + s.series.sagittal + '</span>' +
        '</div>' +
        U.capBadges(s.capabilities, s.id) +
      '</div>' +
      '<div class="adm-sample-side">' +
        (picked
          ? starRow(s.id, picked) +
            '<div class="tiny mono muted">权重 ' + (ref ? ref.weight : '—') + '% · 本例可评分 ' + sc.max + '</div>'
          : '<span class="adm-scoreable ' + (sc.max >= 95 ? 'ok' : sc.max >= 85 ? 'mid' : 'bad') + '">' +
              sc.max + '<span class="adm-scoreable-den">/100</span></span>' +
            '<span class="tiny muted">未勾选</span>') +
      '</div>' +
    '</div>';
  }

  function step2(d) {
    var cur = S.draftScoreable();
    var n = Object.keys(d.picked).length;
    var cls = cur.max >= 95 ? 'ok' : cur.max >= 85 ? 'mid' : 'bad';
    var hint = cur.max >= 95 ? '≥ 95 · 可直接发布'
      : cur.max >= 85 ? '85–94 · 可发布，成绩单会标注不可评条目'
      : '< 85 · 发布需门禁二次确认 + 写审计';
    var usable = S.ADM_SAMPLES.filter(function (s) { return s.status === 'published' && s.goldStandard; });

    return '' +
      '<div class="adm-bar">' +
        '<div class="filter-item"><label>部位</label>' +
          '<select class="select" data-act="noop"><option>全部部位</option><option>颅脑</option><option>头颈</option>' +
            '<option>胸部</option><option>腹部</option><option>骨肌</option><option>其他</option></select></div>' +
        '<div class="filter-item"><label>模态</label>' +
          '<select class="select" data-act="noop"><option>全部模态</option><option>CT</option><option>MR</option>' +
            '<option>DR</option><option>超声</option></select></div>' +
        '<div class="adm-bar-right">' +
          '<span class="adm-count">已选 <b>' + n + '</b> / 20 例</span>' +
          Object.keys(S.ADM_PRESETS).map(function (k) {
            return '<button class="btn sm" type="button" data-act="adm-preset" data-preset="' + k + '">' +
              H.icon('refresh', { size: 12 }) + H.esc(S.ADM_PRESETS[k].label) + '</button>';
          }).join('') +
        '</div>' +
      '</div>' +

      '<div class="banner muted" style="border-radius:0;border-left:0;border-right:0">' + H.icon('info', { size: 15 }) +
        '<span>' + H.rich('部位 / 模态只影响列表显示什么，不写进任务。' +
          '**只有已发布且金标准已录**的病例可勾（草稿 / 已停用置灰）。勾选范围 **1–20 例**。') + '</span>' +
      '</div>' +

      '<div class="adm-samples">' + usable.map(function (s) { return pickRow(s, d); }).join('') + '</div>' +

      '<div class="adm-range ' + cls + '" style="border-radius:0;border-left:0;border-right:0">' +
        '<div class="adm-range-top">' +
          '<span class="adm-range-k">整卷可评分（按权重加权）</span>' +
          '<span class="adm-range-v">' + cur.max + '</span>' +
          '<span class="adm-range-den">/ 100</span>' +
          '<span class="adm-range-hint">' + H.rich(hint) + '</span>' +
        '</div>' +
        '<div class="adm-range-bar">' +
          '<i class="' + cls + '" style="width:' + cur.max + '%"></i>' +
          '<span class="adm-threshold" style="left:85%"></span>' +
        '</div>' +
      '</div>' +

      '<div class="card-body">' +
        '<div class="section-title">' + H.icon('sliders', { size: 13 }) +
          '<span>卷内病例与权重</span>' +
          '<span class="st-badge">星级越高，该例在整卷得分里占比越大</span></div>' +
        (n ? '<table class="table table-compact">' +
          '<thead><tr><th style="width:150px">病例</th><th style="width:110px">权重星级</th>' +
            '<th style="width:100px">归一权重</th><th style="width:110px">本例可评分</th><th>落空条目</th></tr></thead>' +
          '<tbody>' + S.draftRefs().map(function (r) {
            var s = S.ADM_SAMPLES.filter(function (x) { return x.id === r.caseId; })[0];
            var sc = S.scoreableOf(r.caseId);
            return '<tr><td class="mono">' + H.esc(r.caseId) + ' <span class="muted">v' + r.version + '</span></td>' +
              '<td>' + starRow(r.caseId, d.picked[r.caseId]) + '</td>' +
              '<td class="mono">' + r.weight + '%</td>' +
              '<td class="mono">' + sc.max + '</td>' +
              '<td class="tiny">' + (sc.lost.length ? sc.lost.map(function (l) { return '<code>' + l.code + '</code>'; }).join(' ') : '—') + '</td></tr>';
          }).join('') + '</tbody></table>'
          : '<div class="empty"><div class="empty-ico">' + H.icon('layers', { size: 32 }) + '</div>' +
            '<div class="empty-title">还没有勾选病例</div>' +
            '<div class="empty-desc">' + H.rich('点上方病例卡勾选（至少 1 例）。星级越高，该例在整卷得分里的**权重占比越大**。') + '</div></div>') +
      '</div>';
  }

  /* ── 第 3 步：发布设置 ── */
  function sw(on, label, hint) {
    return '<div class="adm-sample" style="padding:10px 12px;cursor:default">' +
      '<span class="adm-cap ' + (on ? 'on' : 'off') + '" style="font-size:11px">' + (on ? 'ON' : 'OFF') + '</span>' +
      '<div class="adm-sample-main"><div class="adm-sample-title" style="font-size:13px">' + H.esc(label) + '</div>' +
        '<div class="tiny muted" style="margin-top:3px">' + H.rich(hint) + '</div></div>' +
      '</div>';
  }

  function step3(d) {
    var s = d.step3;
    return '<div class="card-body">' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0 20px">' +
        '<div class="field"><div class="field-label">考核对象<span class="req-star">*</span></div>' +
          '<select class="select" data-act="noop">' +
            '<option' + (s.assigneeType === 'class' ? ' selected' : '') + '>按班级</option>' +
            '<option' + (s.assigneeType === 'student' ? ' selected' : '') + '>指定学员</option></select></div>' +
        '<div class="field"><div class="field-label">取分策略<span class="req-star">*</span></div>' +
          '<select class="select" data-act="noop">' +
            ['highest|取最高分', 'first|取首次成绩', 'latest|取最后一次'].map(function (o) {
              var kv = o.split('|');
              return '<option' + (s.scorePolicy === kv[0] ? ' selected' : '') + '>' + kv[1] + '（' + kv[0] + '）</option>';
            }).join('') + '</select>' +
          '<div class="tiny muted" style="margin-top:5px">' +
            H.rich('多次作答时**成绩单只呈现被计入的那一次**。') + '</div></div>' +
      '</div>' +

      '<div class="field"><div class="field-label">班级</div>' +
        '<div style="display:flex;flex-wrap:wrap;gap:8px">' +
          S.ADM_CLASSES.map(function (c) {
            var on = s.classIds.indexOf(c.id) >= 0;
            return '<span class="adm-cap ' + (on ? 'on' : 'off') + '" style="font-size:12px;padding:5px 11px">' +
              H.esc(c.name) + '（' + c.studentCount + ' 人）' + (on ? ' ✓' : '') + '</span>';
          }).join('') +
        '</div>' +
      '</div>' +

      '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0 16px">' +
        '<div class="field"><div class="field-label">开放起始<span class="req-star">*</span></div>' +
          '<input class="input" type="date" value="' + H.esc(s.openFrom) + '" data-act="noop"></div>' +
        '<div class="field"><div class="field-label">开放截止<span class="req-star">*</span></div>' +
          '<input class="input" type="date" value="' + H.esc(s.openTo) + '" data-act="noop"></div>' +
        '<div class="field"><div class="field-label">重考上限<span class="req-star">*</span></div>' +
          '<input class="input" value="' + s.maxAttempts + ' 次" data-act="noop"></div>' +
      '</div>' +

      '<div class="section-title mt16">' + H.icon('sliders', { size: 13 }) +
        '<span>开关项</span><span class="st-badge">默认值即推荐值</span></div>' +
      '<div style="display:flex;flex-direction:column;gap:8px">' +
        sw(s.excludeTrainedSamples, '排除学员已练过的病例',
          '开启后，训练侧练过的病例不再下发给该学员；**默认关闭**。') +
        sw(s.revealGoldStandardAfterSubmit, '交卷后下发金标准原文',
          '**默认关闭**。开启后仅对已交卷学员可见。') +
        sw(s.showScoreToStudent, '学员可见成绩',
          '关闭则学员侧只显示「已完成」，分数由教师线下公布。') +
        sw(s.showRankToStudent, '学员可见排名',
          '**默认关闭**；本期不做跨任务总榜。') +
      '</div>' +
    '</div>';
  }

  /* ── 第 4 步：确认发布 ── */
  function step4(d) {
    var cur = S.draftScoreable();
    var ok = cur.max >= 85;
    var refs = S.draftRefs();
    var kv = [
      ['任务名称', d.step1.title],
      ['卷内例数', refs.length + ' 例'],
      ['计时', d.step1.durationMinutes + ' 分钟 · ' + (d.step1.durationMode === 'whole' ? '整卷计时' : '单例计时')],
      ['取分策略', { first: '取首次成绩', highest: '取最高分', latest: '取最后一次' }[d.step3.scorePolicy] || d.step3.scorePolicy],
      ['重考上限', d.step3.maxAttempts + ' 次'],
      ['考核对象', d.step3.classIds.map(function (id) {
        var c = S.ADM_CLASSES.filter(function (x) { return x.id === id; })[0];
        return c ? c.name : id;
      }).join('、') || '（未选）'],
      ['开放窗口', d.step3.openFrom + ' — ' + d.step3.openTo],
      ['评价表', d.step1.evaluationTableVersion],
      ['整卷可评分', cur.max + ' / 100']
    ];

    return '<div class="card-body">' +
      '<div class="kv-grid">' + kv.map(function (r) {
        return '<div class="kv"><span class="kv-k">' + H.esc(r[0]) + '</span>' +
          '<span class="kv-v">' + H.esc(r[1]) + '</span></div>';
      }).join('') + '</div>' +

      '<div class="adm-range ' + (cur.max >= 95 ? 'ok' : cur.max >= 85 ? 'mid' : 'bad') +
        '" style="margin-top:16px;border-radius:10px;border:1px solid var(--border)">' +
        '<div class="adm-range-top">' +
          '<span class="adm-range-k">整卷可评分</span>' +
          '<span class="adm-range-v">' + cur.max + '</span>' +
          '<span class="adm-range-den">/ 100</span>' +
          '<span class="adm-range-hint">' + H.rich(ok
            ? '≥ 85 · 走**正常发布**路径'
            : '< 85 · 走**门禁二次确认**（必填发布原因 + 写审计）') + '</span>' +
        '</div>' +
        '<div class="adm-range-bar"><i class="' + (cur.max >= 95 ? 'ok' : cur.max >= 85 ? 'mid' : 'bad') +
          '" style="width:' + cur.max + '%"></i><span class="adm-threshold" style="left:85%"></span></div>' +
        (ok ? '' : '<div class="tiny" style="margin-top:8px;color:#b91c1c">' + H.rich('本卷低于下限的原因：' +
          cur.refs.map(function (r) { return '`' + r.caseId + '`'; }).join(' ') +
          ' 中部分病例的能力位未覆盖（缺失工具 / 序列 / 临床信息），详见第 2 步的落空条目。') + '</div>') +
      '</div>' +

      '<div class="banner ' + (ok ? 'ok' : 'error') + ' mt16">' +
        H.icon(ok ? 'check' : 'warn', { size: 15 }) +
        '<span>' + H.rich(ok
          ? '可评分 **' + cur.max + ' ≥ 85**：点「确认发布」→ 二次确认弹窗 → 生成 `AT-…` 任务并发布。'
          : '可评分 **' + cur.max + ' < 85**：点「确认发布」会**强制**弹出覆盖门禁的二次确认，' +
            '**必填发布原因（≤ 200 字）**，按钮文案为「仍要发布」，并写审计 `exam.publish.overrideGate`。' +
            '门禁**不阻止发布**——它只保证"没人能悄悄发一张可评分不足的卷"。') + '</span>' +
      '</div>' +
    '</div>';
  }

  function P12AdmExamCreate() {
    var d = S.ADM_DRAFT;
    var cur = S.draftScoreable();
    var ok = cur.max >= 85;
    var body = d.step === 1 ? step1(d) : d.step === 2 ? step2(d) : d.step === 3 ? step3(d) : step4(d);
    var titles = ['基本信息', '选样与权重', '发布设置', '确认发布'];

    return '<div class="content-inner">' +

      '<div class="page-head">' +
        '<div class="page-head-icon">' + H.icon('layers', { size: 21 }) + '</div>' +
        '<div class="page-head-text">' +
          '<div class="page-head-title">组卷与发布</div>' +
          '<div class="page-head-sub">' + H.rich('从题库挑病例 → 赋权重 → 定考核对象与开放窗口 → 发布') + '</div>' +
        '</div>' +
        '<div class="page-head-extra">' +
          H.tag('草稿 · 第 ' + d.step + ' / 4 步', 'pending', true) +
          '<button class="btn sm" type="button" data-act="go" data-page="p11">' +
            H.icon('prev', { size: 12 }) + '返回任务列表</button>' +
        '</div>' +
      '</div>' +

      (d.gateReason ? '<div class="banner warn">' + H.icon('warn', { size: 15 }) +
        '<span>' + H.rich('本卷最近一次发布走了**门禁覆盖**，已记录原因：') +
          '<span class="mono">' + H.esc(d.gateReason) + '</span></span></div>'
        : '<div class="banner">' + H.icon('info', { size: 15 }) +
          '<span>' + H.rich('四步**在同一页**完成，草稿**只存本机**，刷新不丢。') + '</span></div>') +

      '<div class="card mt16">' +
        stepsBar(d.step) +
        '<div class="card-head" style="border-top:1px solid var(--border-light)">' +
          H.icon('sliders', { size: 15 }) +
          '<span>第 ' + d.step + ' 步 · ' + H.esc(titles[d.step - 1]) + '</span>' +
        '</div>' +
        body +
      '</div>' +

      '<div class="adm-sticky-foot" style="border-radius:12px;border:1px solid var(--border);margin-top:16px">' +
        '<span class="adm-foot-note">当前卷面整卷可评分 <b>' + cur.max + '</b> / 100' + H.esc(ok ? '（≥ 85）' : '（< 85 · 发布需二次确认）') + '</span>' +
        '<div class="adm-foot-right">' +
          '<button class="btn sm" type="button" data-act="noop">' + H.icon('copy', { size: 12 }) + '保存草稿</button>' +
          (d.step > 1 ? '<button class="btn sm" type="button" data-act="adm-prev">' +
            H.icon('prev', { size: 12 }) + '上一步</button>' : '') +
          (d.step < 4
            ? '<button class="btn primary sm" type="button" data-act="adm-next">下一步' +
                H.icon('next', { size: 12 }) + '</button>'
            : (ok
              ? '<button class="btn primary sm" type="button" data-act="adm-publish">' +
                  H.icon('send', { size: 12 }) + '确认发布</button>'
              : '<button class="btn danger sm" type="button" data-act="adm-gate-confirm">' +
                  H.icon('warn', { size: 12 }) + '确认发布（可评分 &lt; 85）</button>')) +
        '</div>' +
      '</div>' +

    '</div>';
  }

  w.P12AdmExamCreate = P12AdmExamCreate;
})(window);
