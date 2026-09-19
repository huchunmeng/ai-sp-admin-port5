/* 种子数据 —— 全部挂在 window.SEED 全局（file:// 下 fetch JSON 会被 CORS 拦，故不用外部 JSON）。
   数据来源：PRD_定稿版.md §5.2.2 / §5.3 / §5.5 / §5.5.1 / §6.2–6.4 / 附录 E，
   以及 apps/training/src/data/reportCases.js 的既有示例样本。 */
(function (w) {
  'use strict';

  /* ── R1 表（《放射科-诊断报告书写质量评价表》，100 分 / 5 维度 / 23 条目） · 附录 E ── */
  var R1_TABLE = [
    {
      dim: '一、一般信息及报告及时性', full: 14,
      items: [
        { code: 'GEN-01', name: '患者信息（姓名、年龄、性别、科别）', score: 2 },
        { code: 'GEN-02', name: '住院/门诊号、检查号、就诊卡号、影像号正确', score: 1 },
        { code: 'GEN-03', name: '检查时间正确，按规定时间完成报告', score: 1 },
        { code: 'GEN-04', name: '临床主要信息及检查目的', score: 10 }
      ]
    },
    {
      dim: '二、检查技术', full: 9,
      items: [
        { code: 'TECH-01', name: '检查部位准确', score: 3 },
        { code: 'TECH-02', name: '检查类型准确', score: 3 },
        { code: 'TECH-03', name: '检查技术填写规范', score: 3 }
      ]
    },
    {
      dim: '三、影像描述', full: 34,
      items: [
        { code: 'FIND-01', name: '描述全面，条理清楚', score: 10 },
        { code: 'FIND-02', name: '描述疾病或器官顺序适当', score: 4 },
        { code: 'FIND-03', name: '病灶部位及累及范围描述准确', score: 4 },
        { code: 'FIND-04', name: '病灶数目、大小准确测量并规范描述', score: 4 },
        { code: 'FIND-05', name: '病灶形态、边界及特殊征象描述准确', score: 4 },
        { code: 'FIND-06', name: '病灶密度/信号/强化程度准确分度', score: 4 },
        { code: 'FIND-07', name: '重要阴性征象描述', score: 4 }
      ]
    },
    {
      dim: '四、影像诊断', full: 38,
      items: [
        { code: 'IMP-01', name: '回答临床问题', score: 10 },
        { code: 'IMP-02', name: '定位诊断准确', score: 4 },
        { code: 'IMP-03', name: '典型病变明确诊断', score: 4 },
        { code: 'IMP-04', name: '不典型病变给出的可能诊断符合规范', score: 4 },
        { code: 'IMP-05', name: '肿瘤分期正确', score: 4 },
        { code: 'IMP-06', name: '疾病诊断遵循规范或指南', score: 4 },
        { code: 'IMP-07', name: '给临床的建议明确', score: 4 },
        { code: 'IMP-08', name: '与以前检查比较符合规范、准确', score: 4 }
      ]
    },
    {
      dim: '五、文字描述', full: 5,
      items: [{ code: 'LANG-01', name: '无错别字，数据单位及标点符号使用正确', score: 5 }]
    }
  ];

  /* ── 样本能力位（随样本入库声明，非 attempt 字段） · §5.2.2 乙类 / §5.10.2 ──
     hasMeasurement:   病灶大小能否准确测量（依赖影像控件的测量工具）
     hasPriorExam:     是否有既往检查影像（决定能否"与以前检查比较"）
     hasEnhancedPhase: 是否有增强期相序列（决定能否判"强化程度"）
     isTumor:          是否肿瘤病例（非肿瘤时 IMP-05 = 不适用 N/A）
     hasStagingInfo:   临床主要信息是否给足分期依据（仅肿瘤病例有意义） */
  var CAPABILITIES = {
    'RC-001': { hasMeasurement: false, hasPriorExam: false, hasEnhancedPhase: false, isTumor: true, hasStagingInfo: false },
    'RC-002': { hasMeasurement: false, hasPriorExam: false, hasEnhancedPhase: false, isTumor: false, hasStagingInfo: false },
    'RC-003': { hasMeasurement: false, hasPriorExam: true, hasEnhancedPhase: true, isTumor: true, hasStagingInfo: true },
    'RC-004': { hasMeasurement: true, hasPriorExam: false, hasEnhancedPhase: false, isTumor: true, hasStagingInfo: false },
    'RC-005': { hasMeasurement: false, hasPriorExam: false, hasEnhancedPhase: true, isTumor: false, hasStagingInfo: false },
    'RC-006': { hasMeasurement: false, hasPriorExam: false, hasEnhancedPhase: false, isTumor: false, hasStagingInfo: false },
    'RC-007': { hasMeasurement: false, hasPriorExam: false, hasEnhancedPhase: false, isTumor: true, hasStagingInfo: false },
    'RC-008': { hasMeasurement: true, hasPriorExam: false, hasEnhancedPhase: false, isTumor: false, hasStagingInfo: false }
  };

  /* ── 甲类不可评 · 样本去标识（对所有样本一致，不随能力位变，可作全局常量） ──
     GEN-02 为"部分不可评"：检查号/影像号保留后 4 位仍可评，故该条**整体仍计入分母**，
     条内按可评部分判分。这是 PRD §5.5.1「四条同时落空 = 84 分」算式不含甲类的原因。 */
  var DEIDENTIFY_ITEMS = [
    { code: 'GEN-02', score: 1, assessableRatio: 0.5, label: '住院/门诊号、就诊卡号', why: '全掩字段，不提供复制、不纳入评分' }
  ];

  /* ── 乙类不可评 · 样本能力位 × 控件能力（随样本变，必须按样本现算，不得写成静态旗标） ──
     口径：**条级剔除** —— 该条要求的输入不具备时，整条满分从可评分母中剔除，不按 0 分计。 */
  var CAPABILITY_ITEMS = [
    {
      code: 'FIND-04', score: 4, label: '病灶大小准确测量',
      why: '影像控件不提供测量工具（归影像教学底座，口径 Q9）',
      hit: function (c) { return !c.hasMeasurement; }
    },
    {
      code: 'IMP-08', score: 4, label: '与以前检查比较',
      why: '样本为静态单次检查，无既往片子',
      hit: function (c) { return !c.hasPriorExam; }
    },
    {
      code: 'FIND-06', score: 4, label: '强化程度准确分度',
      why: '样本无增强期相序列（口径 Q2）',
      hit: function (c) { return !c.hasEnhancedPhase; }
    },
    {
      code: 'IMP-05', score: 4, label: '肿瘤分期',
      why: '肿瘤样本且临床主要信息未给足分期依据（口径 Q2）',
      nA: function (c) { return !c.isTumor; },
      hit: function (c) { return c.isTumor && !c.hasStagingInfo; }
    }
  ];

  /* scoreableMax = 100 − Σ(乙类落空条满分)。甲类 GEN-02 部分不可评，不整体剔除。 */
  function scoreableOf(caseId) {
    var c = CAPABILITIES[caseId] || {};
    var max = 100, lost = [];
    CAPABILITY_ITEMS.forEach(function (it) {
      if (it.nA && it.nA(c)) {
        max -= it.score;
        lost.push({ code: it.code, source: 'na', score: it.score, why: '该条对本类样本不适用（N/A），结果页不标注折算' });
      } else if (it.hit(c)) {
        max -= it.score;
        lost.push({ code: it.code, source: 'capability', score: it.score, why: it.why });
      }
    });
    return { max: Math.round(max * 10) / 10, lost: lost };
  }

  /* ── 训练样本（§5.3 卡片字段） ── */
  var CASES = [
    {
      id: 'RC-001', title: '胸部CT · 右肺上叶结节', modality: 'CT', bodyPart: '胸部',
      level: 'R2', levelName: '进阶', ico: 'film',
      clinical: '咳嗽伴痰中带血 2 周。胸部 CT 平扫发现右肺上叶占位。',
      trainedRounds: 1, lastSelfReview: 78, lastAt: '2026-09-19 14:32'
    },
    {
      id: 'RC-002', title: '颅脑MR · 急性脑梗死', modality: 'MR', bodyPart: '颅脑',
      level: 'R2', levelName: '进阶', ico: 'target',
      clinical: '突发左侧肢体无力 6 小时。',
      trainedRounds: 2, lastSelfReview: 85, lastAt: '2026-09-18 20:10'
    },
    {
      id: 'RC-003', title: '腹部CT · 肝细胞癌（TACE术后）', modality: 'CT', bodyPart: '腹部',
      level: 'R3', levelName: '疑难', ico: 'grid',
      clinical: '肝细胞癌 TACE 术后 1 月复查。',
      trainedRounds: 0, lastSelfReview: null, lastAt: null
    },
    {
      id: 'RC-004', title: '胸部CT · 纵隔淋巴结肿大', modality: 'CT', bodyPart: '胸部',
      level: 'F1', levelName: '疑难', ico: 'film',
      clinical: '低热、盗汗 1 月余，胸片示纵隔增宽。',
      trainedRounds: 0, lastSelfReview: null, lastAt: null
    },
    {
      id: 'RC-005', title: '腹部MR · 肝血管瘤', modality: 'MR', bodyPart: '腹部',
      level: 'U2', levelName: '基础', ico: 'grid',
      clinical: '体检发现肝内占位。',
      trainedRounds: 3, lastSelfReview: 91, lastAt: '2026-09-15 16:44'
    },
    {
      id: 'RC-006', title: '颅脑CT · 高血压性脑出血', modality: 'CT', bodyPart: '颅脑',
      level: 'U1', levelName: '基础', ico: 'target',
      clinical: '突发头痛伴意识障碍 2 小时，高血压病史 10 年。',
      trainedRounds: 0, lastSelfReview: null, lastAt: null
    },
    {
      id: 'RC-007', title: '头颈CT · 鼻咽癌', modality: 'CT', bodyPart: '头颈',
      level: 'F2', levelName: '疑难', ico: 'user',
      clinical: '回吸性血涕 3 月，颈部包块。',
      trainedRounds: 1, lastSelfReview: 72, lastAt: '2026-09-16 11:05'
    },
    {
      id: 'RC-008', title: '骨肌DR · 胫骨平台骨折', modality: 'DR', bodyPart: '骨肌',
      level: 'U1', levelName: '基础', ico: 'grid',
      clinical: '摔伤后左膝关节肿痛、活动受限 1 天。',
      trainedRounds: 0, lastSelfReview: null, lastAt: null
    }
  ];

  var CASE_BY_ID = {};
  CASES.forEach(function (c) { CASE_BY_ID[c.id] = c; });

  /* ── 训练工作台当前状态（§5.2.1 继续上次 / §6.2 线框） ── */
  var WORKBENCH = {
    caseId: 'RC-001',
    roundIndex: 2,
    stage: 'T2',
    stageHint: 'T2 影像所见 —— R1 表分值最高的段落（三、影像描述，34 分）',
    draft: {
      technique: '胸部CT平扫。',
      findings: '右肺上叶尖段见一枚实性结节，大小约 12mm×10mm，边缘可见分叶及短毛刺，周围见局限性胸膜牵拉。',
      impression: ''
    },
    viewNotes: '结节在轴位第 38 层显示最清楚，分叶明显，外侧胸膜有牵拉。本机无调窗，看不清内部密度细节。',
    /* §5.2.2 一般信息条 · 脱敏形态即评分基准 */
    info: [
      { k: '患者姓名', v: '张*', copy: true, note: '仅露首字' },
      { k: '年龄', v: '50–59 岁', copy: true, note: '年龄段' },
      { k: '性别', v: '女', copy: true },
      { k: '科别', v: '呼吸内科', copy: true },
      { k: '检查号', v: '****1234', copy: true, note: '保留后 4 位' },
      { k: '影像号', v: '****5678', copy: true, note: '保留后 4 位' },
      { k: '住院/门诊号', v: '****', masked: true },
      { k: '就诊卡号', v: '****', masked: true },
      { k: '检查时间', v: '2026-09-16 14:32', copy: true }
    ],
    clinicalText: '咳嗽伴痰中带血 2 周。胸部 CT 平扫发现右肺上叶占位，为进一步明确病变性质及范围，请评估右肺上叶结节的性质，并回答有无纵隔淋巴结肿大及胸腔积液。',
    /* §6.2 提示栏的要素覆盖清单（●已覆盖 ○缺失 ?存疑） */
    coverage: [
      { mark: 'ok', name: '部位与范围', text: '右肺上叶尖段' },
      { mark: 'ok', name: '数目与大小', text: '单发，约 12mm×10mm（未能工具测量）' },
      { mark: 'ok', name: '形态与边界', text: '分叶、短毛刺' },
      { mark: 'doubt', name: '密度/信号/强化程度', text: '仅写"实性"；强化程度无法判读（无增强序列）' },
      { mark: 'miss', name: '重要阴性征象', text: '纵隔淋巴结、胸腔积液、其余肺野均未提及' }
    ],
    /* §5.2.3 三级提示阶梯（本回合已用 3 次：L1×2 + L2×1，故剩余 L2:2 L3:1） */
    hints: [
      {
        level: 'L1', segment: 'technique', stage: 'T1', time: '14:12:08',
        title: 'L1 体裁提示 · 检查技术', body: '检查技术段建议覆盖：检查部位 / 检查类型 / 检查技术（扫描方式、层厚、是否增强）。'
      },
      {
        level: 'L1', segment: 'findings', stage: 'T2', time: '14:20:33',
        title: 'L1 体裁提示 · 影像所见', body: '影像所见建议覆盖：部位与范围、数目与大小、形态与边界、密度/信号/强化程度、重要阴性征象。'
      },
      {
        level: 'L2', segment: 'findings', stage: 'T2', time: '14:25:47',
        title: 'L2 指向提示 · 影像所见', body: "本病例的影像所见中，'重要阴性征象'一类尚未涉及。"
      }
    ],
    quota: { l2Remaining: 2, l3Remaining: 1 },
    resetQuota: { l2Remaining: 3, l3Remaining: 1 },
    exhaustedQuota: { l2Remaining: 0, l3Remaining: 0 }
  };

  /* ── 报告输入控件（§5.4.1 字段规则） ── */
  var SEGMENTS = [
    { key: 'technique', name: '检查技术', limit: 500, trainingRequired: true, examRequired: false },
    { key: 'findings', name: '影像所见', limit: 3000, trainingRequired: true, examRequired: false },
    { key: 'impression', name: '诊断意见', limit: 3000, trainingRequired: true, examRequired: false }
  ];

  /* ── 我的考核任务（§5.5 状态全集，8 态各一例 + 窗外不可作答一例） ── */
  var EXAM_TASKS = [
    {
      id: 'ET-2026-0930', title: '胸部CT报告书写考核', state: '待作答',
      desc: '覆盖胸部 CT 平扫，含肺内结节与纵隔病变各一例。',
      caseCount: 3, durationMinutes: 20, durationMode: 'whole',
      openFrom: '2026-09-19 08:00', openTo: '2026-09-25 23:59',
      attemptsUsed: 0, maxAttempts: 3, scorePolicy: 'highest',
      score: null, actionable: true, actionLabel: '领取并作答'
    },
    {
      id: 'ET-2026-0931', title: '颅脑MR报告书写考核', state: '待作答',
      desc: '急性期脑梗死与脑出血鉴别。',
      caseCount: 2, durationMinutes: 20, durationMode: 'whole',
      openFrom: '2026-09-19 08:00', openTo: '2026-09-24 23:59',
      attemptsUsed: 1, maxAttempts: 2, scorePolicy: 'highest',
      score: null, actionable: true, actionLabel: '领取并作答'
    },
    {
      id: 'ET-2026-0928', title: '腹部CT报告书写考核', state: '作答中',
      desc: '肝癌 TACE 术后疗效评估。',
      caseCount: 1, durationMinutes: 20, durationMode: 'whole',
      openFrom: '2026-09-18 08:00', openTo: '2026-09-22 23:59',
      attemptsUsed: 1, maxAttempts: 1, scorePolicy: 'latest',
      score: null, actionable: true, actionLabel: '继续作答',
      remainSeconds: 728, lastSavedAt: '14:31:52'
    },
    {
      id: 'ET-2026-0927', title: '骨肌DR报告书写考核', state: '评分中',
      desc: '四肢骨折平片描述与诊断。',
      caseCount: 1, durationMinutes: 15, durationMode: 'whole',
      openFrom: '2026-09-18 08:00', openTo: '2026-09-21 23:59',
      attemptsUsed: 1, maxAttempts: 1, scorePolicy: 'latest',
      score: null, actionable: false, reason: '评分中，请稍候（可离开页面，回来轮询）'
    },
    {
      id: 'ET-2026-0926', title: '胸部CT报告书写考核（第 2 次）', state: '已评分',
      desc: '同批次补考，取最高分。',
      caseCount: 2, durationMinutes: 20, durationMode: 'whole',
      openFrom: '2026-09-15 08:00', openTo: '2026-09-20 23:59',
      attemptsUsed: 2, maxAttempts: 2, scorePolicy: 'highest',
      score: 86, scoreDetail: '第 2 次作答 · scorePolicy = highest', actionable: true,
      actionLabel: '查看成绩', reason: '重考次数已用完（2 / 2）'
    },
    {
      id: 'ET-2026-0925', title: '头颈CT报告书写考核', state: '评分失败',
      desc: '鼻咽部病变。',
      caseCount: 1, durationMinutes: 15, durationMode: 'whole',
      openFrom: '2026-09-18 08:00', openTo: '2026-09-23 23:59',
      attemptsUsed: 1, maxAttempts: 1, scorePolicy: 'latest',
      score: null, actionable: true, actionLabel: '重试评分',
      retryUsed: 1, retryMax: 3, reason: '评分引擎超时，已重试 1 / 3 次；3 次仍失败将提示"成绩稍后由老师核定"'
    },
    {
      id: 'ET-2026-0912', title: '胸部CT报告书写考核', state: '已截止',
      desc: '学生未在开放窗口内领取。',
      caseCount: 3, durationMinutes: 20, durationMode: 'whole',
      openFrom: '2026-09-08 08:00', openTo: '2026-09-12 23:59',
      attemptsUsed: 0, maxAttempts: 1, scorePolicy: 'latest',
      score: null, actionable: false, reason: '开放时间窗已关闭，且未领取作答'
    },
    {
      id: 'ET-2026-0910', title: '腹部MR报告书写考核', state: '已撤销',
      desc: '教师撤回（样本替换中）。',
      caseCount: 2, durationMinutes: 20, durationMode: 'whole',
      openFrom: '2026-09-10 08:00', openTo: '2026-09-18 23:59',
      attemptsUsed: 0, maxAttempts: 1, scorePolicy: 'latest',
      score: null, actionable: false, reason: '教师已撤回该任务'
    },
    {
      id: 'ET-2026-0950', title: '胸部CT报告书写考核（补考专用）', state: '待作答',
      desc: '开放时间窗尚未开始。',
      caseCount: 2, durationMinutes: 20, durationMode: 'whole',
      openFrom: '2026-09-26 08:00', openTo: '2026-09-30 23:59',
      attemptsUsed: 0, maxAttempts: 1, scorePolicy: 'latest',
      score: null, actionable: false, reason: '尚未到开放时间（2026-09-26 08:00 开放）'
    }
  ];

  /* ── 考核工作台当前状态（§6.3 线框） ── */
  var EXAM_WORKBENCH = {
    taskId: 'ET-2026-0930',
    title: '胸部CT报告书写考核',
    caseIndex: 2, caseTotal: 3,
    remainSeconds: 1182,          /* 19:42 */
    durationMode: 'whole',
    caseIds: ['RC-001', 'RC-004', 'RC-003'],
    caseWeights: [1, 1, 1],
    drafts: {
      'RC-001': {
        technique: '胸部CT平扫。',
        findings: '右肺上叶尖段见一枚实性结节，大小约 12mm×10mm，边缘分叶、短毛刺。',
        impression: '右肺上叶结节，考虑周围型肺癌可能，建议增强CT。',
        locked: true, lockReason: 'manual', lockedAt: '14:22:41'
      },
      'RC-004': {
        technique: '胸部CT增强扫描。',
        findings: '纵隔 4R 组见肿大淋巴结，短径约 15mm。',
        impression: '',
        locked: false, lockReason: null, lockedAt: null
      },
      'RC-003': { technique: '', findings: '', impression: '', locked: false, lockReason: null, lockedAt: null }
    }
  };

  /* 三例加权后的整卷可评分（派生字段，学生不可见） */
  EXAM_WORKBENCH.scoreableMax = Math.round(
    ([84, 88, 96].reduce(function (a, b) { return a + b; }, 0) / 3) * 10) / 10;

  /* ── 评分结果页（§6.4 线框 · 三例等权，整卷 76） ──
     每例：normalized（成绩，满分恒 100） / rawTotal（原始分） / scoreableMax（归一分母）三者双存。
     normalized = rawTotal / scoreableMax × 100，向上取整到整数分。 */
  var RESULT = {
    taskId: 'ET-2026-0930',
    title: '胸部CT报告书写考核',
    attemptIndex: 1, attemptTotal: 2,
    submitType: 'autoTimeout', lastSavedAt: '14:32:07',
    savedNotice: true,
    goldStandardRevealed: false,
    /* totalScore / scoreableMax / rawTotal 一律由 cases 现算（见本块末尾），不写死，避免与条目分漂移 */
    cases: [
      {
        id: 'RC-001', name: '胸部CT · 右肺上叶结节', short: '例1',
        weight: '各 1/3', scoreableMax: 84,
        items: [
          { code: 'GEN-01', mark: 'ok', got: 2, full: 2, comment: '' },
          { code: 'GEN-02', mark: 'na', got: 0.5, full: 1, comment: '该条按可评部分判定（检查号/影像号保留后 4 位）；住院/门诊号、就诊卡号因样本去标识不计入', source: 'deidentify' },
          { code: 'GEN-03', mark: 'ok', got: 1, full: 1, comment: '' },
          { code: 'GEN-04', mark: 'mid', got: 7, full: 10, comment: '临床主要信息基本完整，但接近照抄原文，未转述为规范写法' },
          { code: 'TECH-01', mark: 'ok', got: 3, full: 3, comment: '' },
          { code: 'TECH-02', mark: 'ok', got: 3, full: 3, comment: '' },
          { code: 'TECH-03', mark: 'ok', got: 3, full: 3, comment: '' },
          { code: 'FIND-01', mark: 'mid', got: 8, full: 10, comment: '未按器官顺序组织，层次不够清楚' },
          { code: 'FIND-02', mark: 'ok', got: 4, full: 4, comment: '' },
          { code: 'FIND-03', mark: 'mid', got: 3, full: 4, comment: '部位准确，累及范围描述略欠' },
          { code: 'FIND-04', mark: 'unassessable', got: 0, full: 4, comment: '该项因本期样本/控件不具备相应能力不可评，已折算（影像控件不提供测量工具）', source: 'capability' },
          { code: 'FIND-05', mark: 'ok', got: 4, full: 4, comment: '' },
          { code: 'FIND-06', mark: 'unassessable', got: 0, full: 4, comment: '该项因本期样本/控件不具备相应能力不可评，已折算（无增强期相序列）', source: 'capability' },
          { code: 'FIND-07', mark: 'bad', got: 0, full: 4, comment: '该类征象未提及' },
          { code: 'IMP-01', mark: 'mid', got: 8, full: 10, comment: '未直接答复临床问题（有无纵隔淋巴结肿大及胸腔积液）' },
          { code: 'IMP-02', mark: 'ok', got: 4, full: 4, comment: '' },
          { code: 'IMP-03', mark: 'mid', got: 3, full: 4, comment: '给出倾向性诊断，但依据表述不足' },
          { code: 'IMP-04', mark: 'ok', got: 4, full: 4, comment: '' },
          { code: 'IMP-05', mark: 'unassessable', got: 0, full: 4, comment: '该项因本期样本/控件不具备相应能力不可评，已折算（临床主要信息未给足分期依据）', source: 'capability' },
          { code: 'IMP-06', mark: 'ok', got: 4, full: 4, comment: '' },
          { code: 'IMP-07', mark: 'mid', got: 2.5, full: 4, comment: '建议不够明确，未写清下一步检查方式' },
          { code: 'IMP-08', mark: 'unassessable', got: 0, full: 4, comment: '该项因本期样本/控件不具备相应能力不可评，已折算（无既往检查影像）', source: 'capability' },
          { code: 'LANG-01', mark: 'ok', got: 5, full: 5, comment: '' }
        ]
      },
      {
        id: 'RC-004', name: '胸部CT · 纵隔淋巴结肿大', short: '例2',
        weight: '各 1/3', scoreableMax: 88,
        items: [
          { code: 'GEN-01', mark: 'ok', got: 2, full: 2, comment: '' },
          { code: 'GEN-02', mark: 'na', got: 0.5, full: 1, comment: '该条按可评部分判定；全掩字段因样本去标识不计入', source: 'deidentify' },
          { code: 'GEN-03', mark: 'ok', got: 1, full: 1, comment: '' },
          { code: 'GEN-04', mark: 'mid', got: 6.5, full: 10, comment: '临床信息转述不完整' },
          { code: 'TECH-01', mark: 'ok', got: 3, full: 3, comment: '' },
          { code: 'TECH-02', mark: 'mid', got: 2, full: 3, comment: '检查类型表述欠规范' },
          { code: 'TECH-03', mark: 'mid', got: 2, full: 3, comment: '未写明扫描方式与层厚' },
          { code: 'FIND-01', mark: 'bad', got: 4, full: 10, comment: '描述不全面，层次不清' },
          { code: 'FIND-02', mark: 'mid', got: 2, full: 4, comment: '器官顺序不够清楚' },
          { code: 'FIND-03', mark: 'mid', got: 3, full: 4, comment: '位置尚可，范围描述不足' },
          { code: 'FIND-04', mark: 'ok', got: 4, full: 4, comment: '' },
          { code: 'FIND-05', mark: 'mid', got: 2, full: 4, comment: '边界与形态描述不足' },
          { code: 'FIND-06', mark: 'unassessable', got: 0, full: 4, comment: '该项因本期样本/控件不具备相应能力不可评，已折算（无增强期相序列）', source: 'capability' },
          { code: 'FIND-07', mark: 'bad', got: 0, full: 4, comment: '该类征象未提及' },
          { code: 'IMP-01', mark: 'ok', got: 8, full: 10, comment: '' },
          { code: 'IMP-02', mark: 'ok', got: 4, full: 4, comment: '' },
          { code: 'IMP-03', mark: 'mid', got: 3, full: 4, comment: '诊断倾向性不足' },
          { code: 'IMP-04', mark: 'ok', got: 4, full: 4, comment: '' },
          { code: 'IMP-05', mark: 'unassessable', got: 0, full: 4, comment: '该项因本期样本/控件不具备相应能力不可评，已折算（临床主要信息未给足分期依据）', source: 'capability' },
          { code: 'IMP-06', mark: 'ok', got: 4, full: 4, comment: '' },
          { code: 'IMP-07', mark: 'mid', got: 3, full: 4, comment: '建议方向正确，表述可再明确' },
          { code: 'IMP-08', mark: 'unassessable', got: 0, full: 4, comment: '该项因本期样本/控件不具备相应能力不可评，已折算（无既往检查影像）', source: 'capability' },
          { code: 'LANG-01', mark: 'mid', got: 4, full: 5, comment: '存在一处标点使用不规范' }
        ]
      },
      {
        id: 'RC-003', name: '腹部CT · 肝细胞癌（TACE术后）', short: '例3',
        weight: '各 1/3', scoreableMax: 96,
        items: [
          { code: 'GEN-01', mark: 'ok', got: 2, full: 2, comment: '' },
          { code: 'GEN-02', mark: 'na', got: 0.5, full: 1, comment: '该条按可评部分判定；全掩字段因样本去标识不计入', source: 'deidentify' },
          { code: 'GEN-03', mark: 'ok', got: 1, full: 1, comment: '' },
          { code: 'GEN-04', mark: 'ok', got: 8.5, full: 10, comment: '信息完整，转述基本规范' },
          { code: 'TECH-01', mark: 'ok', got: 3, full: 3, comment: '' },
          { code: 'TECH-02', mark: 'mid', got: 2.5, full: 3, comment: '需写明增强扫描期相' },
          { code: 'TECH-03', mark: 'mid', got: 2.5, full: 3, comment: '未写层厚' },
          { code: 'FIND-01', mark: 'ok', got: 8, full: 10, comment: '' },
          { code: 'FIND-02', mark: 'ok', got: 4, full: 4, comment: '' },
          { code: 'FIND-03', mark: 'ok', got: 4, full: 4, comment: '' },
          { code: 'FIND-04', mark: 'unassessable', got: 0, full: 4, comment: '该项因本期样本/控件不具备相应能力不可评，已折算（影像控件不提供测量工具）', source: 'capability' },
          { code: 'FIND-05', mark: 'ok', got: 4, full: 4, comment: '' },
          { code: 'FIND-06', mark: 'ok', got: 4, full: 4, comment: '' },
          { code: 'FIND-07', mark: 'mid', got: 2, full: 4, comment: '阴性征象不全' },
          { code: 'IMP-01', mark: 'mid', got: 6, full: 10, comment: '未直接答复临床问题' },
          { code: 'IMP-02', mark: 'ok', got: 4, full: 4, comment: '' },
          { code: 'IMP-03', mark: 'bad', got: 0, full: 4, comment: '未给出明确诊断' },
          { code: 'IMP-04', mark: 'mid', got: 2, full: 4, comment: '可能诊断依据不足' },
          { code: 'IMP-05', mark: 'ok', got: 4, full: 4, comment: '' },
          { code: 'IMP-06', mark: 'mid', got: 1, full: 4, comment: '未引用规范/指南' },
          { code: 'IMP-07', mark: 'mid', got: 1, full: 4, comment: '随访建议不够明确' },
          { code: 'IMP-08', mark: 'ok', got: 4, full: 4, comment: '' },
          { code: 'LANG-01', mark: 'ok', got: 5, full: 5, comment: '' }
        ]
      }
    ],
    appealFiled: false,
    goldStandardText:
      '肝右叶见一不规则肿块，大小约 56mm×48mm，增强扫描动脉期明显强化，门脉期及延迟期强化减退，呈"快进快出"表现。' +
      '病灶内见片状高密度碘油沉积影，沉积较致密，未见明确新增活性灶。门静脉主干及左右支通畅，未见充盈缺损。'
  };

  /* ── 结果页数字一律现算，杜绝"条目分 / 维度分 / 整卷分"三处对不上 ──
     dims 由 items 按 R1 表归并；rawTotal = Σ条目分；normalized = rawTotal ÷ scoreableMax × 100（取整到整数分）；
     整卷按例等权。 */
  function deriveResult(R) {
    R.cases.forEach(function (c) {
      c.dims = R1_TABLE.map(function (g) {
        var got = g.items.reduce(function (a, it) {
          var row = c.items.filter(function (x) { return x.code === it.code; })[0];
          return a + (row ? row.got : 0);
        }, 0);
        return { dim: g.dim, got: Math.round(got * 10) / 10, full: g.full };
      });
      c.rawTotal = Math.round(c.items.reduce(function (a, it) { return a + it.got; }, 0) * 10) / 10;
      c.score = Math.round(c.rawTotal / c.scoreableMax * 100);
    });
    var n = R.cases.length;
    R.scoreableMax = Math.round(R.cases.reduce(function (a, c) { return a + c.scoreableMax; }, 0) / n * 10) / 10;
    R.rawTotal = Math.round(R.cases.reduce(function (a, c) { return a + c.rawTotal; }, 0) / n * 10) / 10;
    R.totalScore = Math.round(R.cases.reduce(function (a, c) { return a + c.score; }, 0) / n);
    return R;
  }
  deriveResult(RESULT);

  /* ── 训练 T4 自评（§5.2.4 逐条 R1 表 · 写了/没写/不确定） ── */
  var SELF_REVIEW = {
    caseId: 'RC-001', roundIndex: 2,
    submitted: false,
    marks: {
      'GEN-01': 'wrote', 'GEN-02': 'wrote', 'GEN-03': 'wrote', 'GEN-04': 'wrote',
      'TECH-01': 'wrote', 'TECH-02': 'wrote', 'TECH-03': 'wrote',
      'FIND-01': 'unsure', 'FIND-02': 'unsure', 'FIND-03': 'wrote', 'FIND-04': 'wrote',
      'FIND-05': 'wrote', 'FIND-06': 'unsure', 'FIND-07': 'missed',
      'IMP-01': 'missed', 'IMP-02': 'wrote', 'IMP-03': 'wrote', 'IMP-04': 'wrote',
      'IMP-05': 'unsure', 'IMP-06': 'wrote', 'IMP-07': 'wrote', 'IMP-08': 'missed',
      'LANG-01': 'wrote'
    },
    yourReport:
      '检查技术：\n胸部CT平扫。\n\n' +
      '影像所见：\n右肺上叶尖段见一枚实性结节，大小约 12mm×10mm，边缘可见分叶及短毛刺，周围见局限性胸膜牵拉。\n\n' +
      '诊断意见：\n右肺上叶结节，考虑周围型肺癌，建议增强CT。',
    goldReport:
      '检查技术：\n胸部CT平扫。\n\n' +
      '影像所见：\n右肺上叶尖段见一枚实性结节，大小约 12mm×10mm，边缘可见分叶及短毛刺，周围见局限性胸膜牵拉。' +
      '双肺其余肺野纹理清晰，未见明确结节及实变影。纵隔居中，气管及主支气管通畅，纵隔及肺门未见明显肿大淋巴结。' +
      '双侧胸腔未见积液，心影及大血管形态未见异常。\n\n' +
      '诊断意见：\n右肺上叶尖段实性结节，边缘分叶伴短毛刺、胸膜牵拉，考虑周围型肺癌可能性大，建议增强CT及多学科评估。',
    /* 自评合计（§5.2.4 口径）：按"写了"的条目分值合计，**不可评条目整体不纳入**；
       分母 = 该样本可评分（RC-001 → 84），归一后与系统分对照。自评**不参与任何计算**，只作学情信号。 */
    selfPool: 84,
    yourSelfTotal: 56,
    yourSelfNormalized: 67,
    selfCounts: { wrote: 15, unsure: 2, missed: 2, na: 4 },
    /* 对照差异 = 自评归一 − 系统归一（负 = 学生低估自己） */
    systemRaw: 69,
    systemNormalized: 82,
    deviation: 67 - 82
  };

  /* ── 组卷侧 scoreableMax 示意（教师端界面本期不做，仅机制演示） · §5.5.1 ── */
  var SELECTION_DEMO = CASES.map(function (c) {
    var s = scoreableOf(c.id);
    return {
      id: c.id, title: c.title, cap: CAPABILITIES[c.id],
      scoreableMax: s.max, lost: s.lost
    };
  });

  w.SEED = {
    R1_TABLE: R1_TABLE,
    CAPABILITIES: CAPABILITIES,
    CAPABILITY_ITEMS: CAPABILITY_ITEMS,
    DEIDENTIFY_ITEMS: DEIDENTIFY_ITEMS,
    scoreableOf: scoreableOf,
    CASES: CASES,
    CASE_BY_ID: CASE_BY_ID,
    WORKBENCH: WORKBENCH,
    SEGMENTS: SEGMENTS,
    EXAM_TASKS: EXAM_TASKS,
    EXAM_WORKBENCH: EXAM_WORKBENCH,
    RESULT: RESULT,
    SELF_REVIEW: SELF_REVIEW,
    SELECTION_DEMO: SELECTION_DEMO,
    USER: { name: '胡春蒙', institution: '东南大学医学院' }
  };
})(window);
