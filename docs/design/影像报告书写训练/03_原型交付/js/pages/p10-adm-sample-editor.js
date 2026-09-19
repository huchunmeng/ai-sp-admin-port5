/* P10 病例编辑器（管理端）· PRD §5.12.3–5.12.6 / §6.1 路由 /imaging-samples/:id
   一页把「入库 → 脱敏 → 能力位 → 金标准 → 发布」串完；改已发布病例强制新建版本（§5.12.8）。 */
(function (w) {
  'use strict';
  var S = w.SEED, H = w.H;
  var U = w.ADMUI;

  var SEG_DEF = [
    { key: 'technique', label: '检查技术', hint: '扫描方式 / 方位 / 层厚 / 序列与造影剂，例："胸部CT平扫，层厚 1mm，肺窗 + 纵隔窗。"' },
    { key: 'findings', label: '影像所见', hint: '部位与范围 → 数目与大小 → 形态与边界 → 密度/信号/强化 → 重要阴性征象（§5.7 覆盖清单同源）' },
    { key: 'impression', label: '诊断意见', hint: '结论 + 建议；含鉴别或随访建议时给出依据链（对应 R1 表 IMP 组）' }
  ];

  /* 金标准三段示例：按病例现拼，只为让评审看到"金标准长什么样" */
  function goldText(s, key) {
    var base = {
      technique: s.modality + ' 扫描，层厚 1 mm，含平扫' + (s.capabilities.hasEnhancedPhase ? ' + 增强' : '') + '。',
      findings: '【' + s.bodyPart + '】' + s.title + '：病灶部位与范围、数目与大小、形态与边界、' +
        '密度/信号/强化程度逐项描述，重要阴性征象一并列出。' +
        (s.capabilities.isTumor ? '肿瘤性病变需写明与周围结构的关系。' : ''),
      impression: '【诊断意见】结合临床与影像表现，考虑' + s.title + '；' +
        (s.capabilities.hasStagingInfo ? '按分期依据给出分期结论与依据链。' : '建议结合临床进一步检查。')
    };
    return base[key] || '';
  }

  function P10AdmSampleEditor() {
    var id = w.appState.admSampleId || 'RC-001';
    var s = S.ADM_SAMPLES.filter(function (x) { return x.id === id; })[0] || S.ADM_SAMPLES[0];
    var sc = S.scoreableOf(s.id);
    var imp = S.SAMPLE_VER_IMPACT;
    var isVerBump = s.status === 'published' && s.id === imp.id;
    var rangeCls = sc.max >= 95 ? 'ok' : sc.max >= 85 ? 'mid' : 'bad';

    var frames = [];
    ['axial', 'coronal', 'sagittal'].forEach(function (ax) {
      var n = s.series[ax];
      var cap = Math.min(n, 8);
      for (var i = 1; i <= cap; i++) frames.push({ ax: ax, no: i });
    });

    return '<div class="content-inner">' +

      '<div class="page-head">' +
        '<div class="page-head-icon">' + H.icon('pen', { size: 21 }) + '</div>' +
        '<div class="page-head-text">' +
          '<div class="page-head-title">' + H.esc(s.title) + '</div>' +
          '<div class="page-head-sub">' +
            '<span class="mono">' + H.esc(s.id) + '</span> · v' + s.version + ' · ' +
            (U.STATUS_TXT[s.status] || s.status) + ' · ' + H.esc(s.bodyPart) + ' / ' + H.esc(s.modality) + '</div>' +
        '</div>' +
        '<div class="page-head-extra">' +
          (s.goldStandard ? H.tag('金标准已录', 'scored', true) : H.tag('缺金标准', 'pending', true)) +
          '<button class="btn sm" type="button" data-act="go" data-page="p9">' +
            H.icon('prev', { size: 12 }) + '返回题库</button>' +
        '</div>' +
      '</div>' +

      (isVerBump ? '<div class="banner warn">' + H.icon('warn', { size: 15 }) +
        '<span>' + H.rich('本病例**已发布**（v' + s.version + '）。改动**不允许原地覆盖**，保存即**新建版本 v' + (s.version + 1) + '**；' +
          '已有 **' + imp.openTasks + ' 个任务**锁在 v' + s.version + '，学员看到的影像与评分依据不变。') + '</span></div>' : '') +

      /* ── §5.12.3 影像序列入库 ── */
      '<div class="card mt16">' +
        '<div class="card-head">' + H.icon('upload', { size: 15 }) +
          '<span>一、影像序列入库</span>' +
          '<span class="card-tag">zip 解包</span>' +
        '</div>' +
        '<div class="card-body">' +
          '<div class="adm-upload has">' +
            '<div style="display:flex;align-items:center;gap:12px">' +
              '<div class="adm-upload-ico" style="margin:0">' + H.icon('folder', { size: 26 }) +
              '</div>' +
              '<div style="flex:1;min-width:0">' +
                '<div class="adm-upload-title">' + H.esc(s.id.toLowerCase() + '-' + s.modality.toLowerCase() + '.zip') + '</div>' +
                '<div class="adm-upload-desc">' +
                  '已解包 <b class="mono">' + (s.series.axial + s.series.coronal + s.series.sagittal) + '</b> 帧 · ' +
                  '轴位 <span class="mono">' + s.series.axial + '</span> / 冠状 <span class="mono">' + s.series.coronal + '</span> / ' +
                  '矢状 <span class="mono">' + s.series.sagittal + '</span> · ' +
                  '上传 <span class="mono">' + H.esc(s.updatedAt) + '</span> · ' + H.esc(s.updatedBy) + '</div>' +
              '</div>' +
              '<button class="btn sm" type="button" data-act="noop">' + H.icon('refresh', { size: 12 }) + '重新上传</button>' +
            '</div>' +
            '<div class="adm-frames">' + frames.map(function (f) {
              return '<div class="adm-frame" title="' + f.ax + ' #' + f.no + '">' + f.no + '</div>';
            }).join('') +
              (s.series.axial + s.series.coronal + s.series.sagittal > frames.length
                ? '<div class="adm-frame" style="justify-content:center;align-items:center;padding:0">…</div>' : '') +
            '</div>' +
            '<div class="adm-frames-note">' + H.rich('共 ' +
              (s.series.axial + s.series.coronal + s.series.sagittal) + ' 帧，上方仅示意前若干帧。') + '</div>' +
          '</div>' +
          '<div class="banner mb0 mt16">' + H.icon('info', { size: 15 }) +
            '<span>' + H.rich('**只收图片序列（JPG / PNG）**，zip 内按轴位 / 冠状 / 矢状分目录。' +
              '拒收情形：非 zip、含非图片文件、单帧 > 5 MB、总帧数 > 600、无轴位序列——均**整包拒绝**并明示原因，不做部分入库。') + '</span>' +
          '</div>' +
        '</div>' +
      '</div>' +

      /* ── §5.12.4 脱敏信息 ── */
      '<div class="card mt16">' +
        '<div class="card-head">' + H.icon('shield', { size: 15 }) +
          '<span>二、脱敏信息</span>' +
          '<span class="card-tag">强制全掩</span>' +
        '</div>' +
        '<div class="card-body">' +
          '<div class="banner warn">' + H.icon('lock', { size: 15 }) +
            '<span>' + H.rich('患者姓名等直接标识**强制全掩、不提供开关**：**在入库时即抹除**，' +
              '题库侧不存原文、也不存"可见 / 不可见"的选项。检查号 / 影像号**保留后 4 位**。') + '</span>' +
          '</div>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0 16px" class="mt16">' +
            '<div class="field"><div class="field-label">患者姓名 <span class="field-note">已全掩</span></div>' +
              '<input class="input" value="（已抹除）" disabled></div>' +
            '<div class="field"><div class="field-label">检查号 <span class="field-note">保留后 4 位</span></div>' +
              '<input class="input" value="****7612" disabled></div>' +
            '<div class="field"><div class="field-label">影像号 <span class="field-note">保留后 4 位</span></div>' +
              '<input class="input" value="****0438" disabled></div>' +
            '<div class="field"><div class="field-label">检查日期 <span class="field-note">保留年月</span></div>' +
              '<input class="input" value="2026-08" disabled></div>' +
            '<div class="field"><div class="field-label">性别<span class="req-star">*</span></div>' +
              '<select class="select" data-act="noop"><option>女</option><option>男</option></select></div>' +
            '<div class="field"><div class="field-label">年龄<span class="req-star">*</span></div>' +
              '<input class="input" value="58 岁"></div>' +
          '</div>' +
          '<div class="field"><div class="field-label">临床简要（学员可见的题干信息）<span class="req-star">*</span></div>' +
            '<textarea class="textarea" rows="3" data-act="noop">' +
              H.esc('主诉：' + s.bodyPart + '不适 2 周，伴轻度乏力，无发热。既往史与实验室检查结果随附。') +
            '</textarea>' +
            '<div class="tiny muted" style="margin-top:5px">' +
              H.rich('此栏**学员可见**，只写与影像诊断相关的必要信息；**不得**出现姓名、住院号、身份证号等直接标识。') + '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +

      /* ── §5.12.5 能力位声明 ── */
      '<div class="card mt16">' +
        '<div class="card-head">' + H.icon('sliders', { size: 15 }) +
          '<span>三、能力位声明</span>' +
          '<span class="card-tag">控件派生位只读 × 声明位可勾</span>' +
        '</div>' +
        '<div class="card-body">' +
          '<div class="section-title">' + H.icon('lock', { size: 13 }) +
            '<span>控件派生位（只读）</span>' +
            '<span class="st-badge">由影像控件能力决定，不由入库侧声明</span></div>' +
          '<table class="table table-compact">' +
            '<thead><tr><th style="width:150px">能力位</th><th style="width:110px">当前值</th><th>判定依据</th></tr></thead>' +
            '<tbody>' +
              '<tr><td class="mono">hasMeasurement</td><td><span class="adm-cap locked">false 🔒</span></td>' +
                '<td>' + H.rich('**测量工具**由影像教学底座提供、本期未交付 → **恒 false**。' +
                  '入库侧只读展示，**不可勾选**——勾了也没用，因为控件给不出测量能力。') + '</td></tr>' +
            '</tbody>' +
          '</table>' +
          '<div class="section-title mt16">' + H.icon('sliders', { size: 13 }) +
            '<span>病例声明位（可勾）</span>' +
            '<span class="st-badge">点徽章切换，下方可评分立即变</span></div>' +
          '<div style="display:flex;flex-direction:column;gap:10px">' +
            U.CAP_ORDER.filter(function (k) { return k !== 'hasMeasurement'; }).map(function (k) {
              var on = !!s.capabilities[k];
              return '<div class="adm-sample" style="padding:10px 12px">' +
                '<span class="adm-cap ' + (on ? 'on' : 'off') + '" data-act="adm-cap" data-id="' + H.esc(s.id) +
                  '" data-cap="' + k + '" style="font-size:12px;padding:4px 10px;cursor:pointer">' +
                  U.CAP_LABEL[k] + (on ? ' ✓' : ' ✗') + '</span>' +
                '<div class="adm-sample-main"><div class="tiny" style="line-height:1.7">' +
                  H.rich(CAP_WHY[k]) + '</div></div>' +
              '</div>';
            }).join('') +
          '</div>' +

          '<div class="adm-range ' + rangeCls + '" style="margin-top:16px;border-radius:10px;border:1px solid var(--border)">' +
            '<div class="adm-range-top">' +
              '<span class="adm-range-k">本例可评分</span>' +
              '<span class="adm-range-v">' + sc.max + '</span>' +
              '<span class="adm-range-den">/ 100</span>' +
              '<span class="adm-range-hint">' + H.rich('落空 ' + sc.lost.length + ' 条 · ' +
                (sc.lost.length ? sc.lost.map(function (l) { return '`' + l.code + '`'; }).join(' ') : '满分卷')) + '</span>' +
            '</div>' +
            '<div class="adm-range-bar">' +
              '<i class="' + rangeCls + '" style="width:' + sc.max + '%"></i>' +
              '<span class="adm-threshold" style="left:85%"></span>' +
            '</div>' +
            '<div class="tiny muted" style="margin-top:8px">' +
              H.rich('门禁线 85：**整卷加权**低于 85 时发布会走二次确认。' +
                '本页是**单例**口径，只用于让入库者看见"勾掉一位能力位要付多少代价"。') + '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +

      /* ── §5.12.6 金标准报告 ── */
      '<div class="card mt16">' +
        '<div class="card-head">' + H.icon('file-pen', { size: 15 }) +
          '<span>四、金标准报告</span>' +
          '<span class="card-tag">评分依据 · 学员端默认不可见</span>' +
        '</div>' +
        '<div class="card-body">' +
          (s.goldStandard ? '' :
            '<div class="banner error">' + H.icon('warn', { size: 15 }) +
              '<span>' + H.rich('**尚未录入金标准**：金标准是评分的唯一依据，缺失时病例**只能是草稿、不可发布**。') + '</span></div>') +
          SEG_DEF.map(function (d) {
            return '<div class="field"><div class="field-label">' + H.esc(d.label) +
              '<span class="field-note">' + H.esc('金标准 · 与 R1 表同源') + '</span></div>' +
              '<textarea class="textarea" rows="' + (d.key === 'findings' ? 5 : 3) + '" data-act="noop">' +
                H.esc(goldText(s, d.key)) + '</textarea>' +
              '<div class="tiny muted" style="margin-top:5px">' + H.rich(d.hint) + '</div></div>';
          }).join('') +
          '<div class="banner mb0">' + H.icon('eye', { size: 15 }) +
            '<span>' + H.rich('金标准**在考核模式下对前端不可见**；训练侧 T4 对照区需**提交自评后**才解锁。') + '</span>' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div class="adm-sticky-foot" style="border-radius:12px;border:1px solid var(--border);margin-top:16px">' +
        '<span class="adm-foot-note">' + H.rich('保存留痕；**已发布病例走新建版本**。') + '</span>' +
        '<div class="adm-foot-right">' +
          '<button class="btn sm" type="button" data-act="noop">' + H.icon('ban', { size: 12 }) + '停用病例</button>' +
          '<button class="btn sm" type="button" data-act="noop">' + H.icon('copy', { size: 12 }) + '保存为草稿</button>' +
          '<button class="btn primary sm" type="button" data-act="noop">' +
            H.icon('check', { size: 12 }) + (isVerBump ? '发布 v' + (s.version + 1) + '（新建版本）' : '发布') + '</button>' +
        '</div>' +
      '</div>' +

    '</div>';
  }

  /* 每个声明位"取 true 意味着什么"——与 seed.js 的 CAPABILITY_ITEMS 口径一致 */
  var CAP_WHY = {
    hasPriorExam: '病例带**既往片**。取 true 时 `IMP-08`「与既往片对照」可评；取 false 则该条落空（−4）。',
    hasEnhancedPhase: '病例含**增强序列**。取 true 时 `FIND-06`「强化程度描述」可评；取 false 则该条落空（−4）。',
    isTumor: '病变为**肿瘤性**。与 `hasStagingInfo` **合取**决定 `IMP-05`「分期依据」是否可评。',
    hasStagingInfo: '临床信息**给足分期依据**。仅在 `isTumor` 也为 true 时才有意义；两位同时为 true 时 `IMP-05` 可评。'
  };

  w.P10AdmSampleEditor = P10AdmSampleEditor;
})(window);
