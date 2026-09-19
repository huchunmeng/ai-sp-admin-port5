// 影像报告样本（题库）—— 8 例
//
// ⚠️ 本期为界面骨架用的**假数据**：影像本体、金标准报告均为示例文本，待院方提供真实样本与
// 配套金标准后替换（需求确认单 Q2 待答复）。文件头显式声明，不做成像是真样本的样子。
//
// 字段形状照 PRD §5.12.7 `imagingSample` 与 data-specs.md §12.3 `ADM_SAMPLES`（同键，不另造 id）。
//
// 【金标准来源说明 —— 请不要误以为 8 例都是现成的】
//   · RC-001 / RC-002 / RC-003 的金标准**取自仓库既有内容**：apps/training/src/data/reportCases.js
//     原本就带这三例的金标准报告全文，此处拆成三段式（technique / findings / impression）。
//   · RC-004 ~ RC-008 **没有金标准**，按 §5.12.6「三段皆非空方可置 published」置为 draft。
//     这不是缺漏——PRD §5.12.2 本就允许草稿态存在，且正是 Q2 未答复的真相：
//     院方样本还没给，题库里先有题面、金标准待教研录入。
//   · 因此训练端当前**可练 3 例**，与既有 ReportWriting.vue 的规模一致，也符合 PRD §1.2
//     「按可配置导入设计，先用 2–3 例样例跑通」。
//
// `status`：draft（草稿·不可选）/ published（已发布·可选）/ disabled（已停用·不可选）。
//   ⚠️ 本批数据**没有 disabled 样例行**——停用语义是"做过但不给用"，需要一例曾发布且金标准
//   已录的真实样本才能演示；院方样本到位后补。schema / 筛选 / 文案均已支持该态。

/** 影像序列帧数（无真实图片，仅声明帧数供界面呈现"共 N 帧"与序列条） */
function series(axial, coronal, sagittal) {
  return { axial, coronal, sagittal }
}

export const IMAGING_SAMPLES = [
  {
    id: 'RC-001',
    title: '胸部CT · 右肺上叶结节',
    modality: 'CT',
    bodyPart: '胸部',
    level: 'R2',
    icon: 'fa-lungs',
    clinicalBrief: '咳嗽伴痰中带血 2 周。胸部 CT 平扫发现右肺上叶占位。',
    series: series(62, 48, 48),
    deidentify: {
      name: '张*', ageRange: '50–59 岁', sex: '女', dept: '呼吸内科',
      examNo: '****1234', imageNo: '****5678',
      inpatientNo: '****', cardNo: '****', examTime: '2026-09-16 14:32'
    },
    capabilities: { hasMeasurement: false, hasPriorExam: false, hasEnhancedPhase: false, isTumor: true, hasStagingInfo: false },
    goldStandard: {
      technique: '胸部CT平扫。',
      findings: '右肺上叶尖段见一枚实性结节，大小约 12mm×10mm，边缘可见分叶及短毛刺，周围见局限性胸膜牵拉。'
        + '双肺其余肺野纹理清晰，未见明确结节及实变影。纵隔居中，气管及主支气管通畅，纵隔及肺门未见明显肿大淋巴结。'
        + '双侧胸腔未见积液，心影及大血管形态未见异常。',
      impression: '右肺上叶尖段实性结节，边缘分叶伴短毛刺、胸膜牵拉，考虑周围型肺癌可能性大，建议增强CT及多学科评估。'
    },
    version: 3, status: 'published',
    createdAt: '2026-09-10 09:12', createdBy: '教研 · 陈',
    publishedAt: '2026-09-18 15:20', updatedAt: '2026-09-18 15:20', updatedBy: '教研 · 陈'
  },
  {
    id: 'RC-002',
    title: '颅脑MR · 急性脑梗死',
    modality: 'MR',
    bodyPart: '颅脑',
    level: 'R2',
    icon: 'fa-brain',
    clinicalBrief: '突发左侧肢体无力 6 小时。',
    series: series(40, 32, 32),
    deidentify: {
      name: '李*', ageRange: '60–69 岁', sex: '男', dept: '神经内科',
      examNo: '****2043', imageNo: '****7710',
      inpatientNo: '****', cardNo: '****', examTime: '2026-09-17 08:05'
    },
    capabilities: { hasMeasurement: false, hasPriorExam: false, hasEnhancedPhase: false, isTumor: false, hasStagingInfo: false },
    goldStandard: {
      technique: '颅脑MR平扫，含 DWI、ADC、T2WI 及 FLAIR 序列。',
      findings: 'DWI 序列示左侧基底节区及放射冠区片状高信号，相应 ADC 图呈低信号，范围约 28mm×19mm，'
        + '边界欠清。T2WI/FLAIR 示该区稍高信号。脑室系统大小形态正常，中线结构居中，'
        + '脑沟脑裂未见增宽。颅内未见明确异常流空影。',
      impression: '左侧基底节区及放射冠区急性期脑梗死。'
    },
    version: 2, status: 'published',
    createdAt: '2026-09-08 10:30', createdBy: '教研 · 陈',
    publishedAt: '2026-09-17 09:40', updatedAt: '2026-09-17 09:40', updatedBy: '教研 · 陈'
  },
  {
    id: 'RC-003',
    title: '腹部CT · 肝细胞癌（TACE术后）',
    modality: 'CT',
    bodyPart: '腹部',
    level: 'R3',
    icon: 'fa-x-ray',
    clinicalBrief: '肝细胞癌 TACE 术后 1 月复查。',
    series: series(88, 64, 64),
    deidentify: {
      name: '王*', ageRange: '50–59 岁', sex: '男', dept: '介入科',
      examNo: '****3187', imageNo: '****9024',
      inpatientNo: '****', cardNo: '****', examTime: '2026-09-16 16:48'
    },
    capabilities: { hasMeasurement: false, hasPriorExam: true, hasEnhancedPhase: true, isTumor: true, hasStagingInfo: true },
    goldStandard: {
      technique: '腹部CT平扫 + 增强扫描（动脉期 / 门脉期 / 延迟期）。',
      findings: '肝右叶见一不规则肿块，大小约 56mm×48mm，增强扫描动脉期明显强化，'
        + '门脉期及延迟期强化减退，呈"快进快出"表现。病灶内见片状高密度碘油沉积影，'
        + '沉积较致密，未见明确新增活性灶。门静脉主干及左右支通畅，未见充盈缺损。'
        + '肝内外胆管未见扩张，胆囊壁不厚。脾脏不大，腹腔未见积液，腹膜后未见肿大淋巴结。',
      impression: '肝右叶肝细胞癌 TACE 术后，碘油沉积致密，未见明确存活灶；建议结合 AFP 及 MR 复查随访。'
    },
    version: 1, status: 'published',
    createdAt: '2026-09-05 14:20', createdBy: '教研 · 王',
    publishedAt: '2026-09-16 17:02', updatedAt: '2026-09-16 17:02', updatedBy: '教研 · 王'
  },
  {
    id: 'RC-004',
    title: '胸部CT · 纵隔淋巴结肿大',
    modality: 'CT', bodyPart: '胸部', level: 'F1', icon: 'fa-lungs',
    clinicalBrief: '低热、盗汗 1 月余，胸片示纵隔增宽。',
    series: series(74, 0, 0),
    deidentify: {
      name: '赵*', ageRange: '20–29 岁', sex: '女', dept: '呼吸内科',
      examNo: '****5566', imageNo: '****1188',
      inpatientNo: '****', cardNo: '****', examTime: '2026-09-16 10:12'
    },
    capabilities: { hasMeasurement: false, hasPriorExam: false, hasEnhancedPhase: false, isTumor: true, hasStagingInfo: false },
    goldStandard: null,
    version: 1, status: 'draft',
    createdAt: '2026-09-16 11:00', createdBy: '教研 · 王',
    publishedAt: null, updatedAt: '2026-09-16 11:28', updatedBy: '教研 · 王'
  },
  {
    id: 'RC-005',
    title: '腹部MR · 肝血管瘤',
    modality: 'MR', bodyPart: '腹部', level: 'U2', icon: 'fa-x-ray',
    clinicalBrief: '体检发现肝内占位。',
    series: series(52, 0, 0),
    deidentify: {
      name: '陈*', ageRange: '40–49 岁', sex: '女', dept: '消化内科',
      examNo: '****6621', imageNo: '****3390',
      inpatientNo: '****', cardNo: '****', examTime: '2026-09-19 09:50'
    },
    capabilities: { hasMeasurement: false, hasPriorExam: false, hasEnhancedPhase: true, isTumor: false, hasStagingInfo: false },
    goldStandard: null,
    version: 1, status: 'draft',
    createdAt: '2026-09-19 09:40', createdBy: '教研 · 陈',
    publishedAt: null, updatedAt: '2026-09-19 10:05', updatedBy: '教研 · 陈'
  },
  {
    id: 'RC-006',
    title: '颅脑CT · 高血压性脑出血',
    modality: 'CT', bodyPart: '颅脑', level: 'U1', icon: 'fa-brain',
    clinicalBrief: '突发头痛伴意识障碍 2 小时，高血压病史 10 年。',
    series: series(36, 28, 28),
    deidentify: {
      name: '刘*', ageRange: '60–69 岁', sex: '男', dept: '神经外科',
      examNo: '****4419', imageNo: '****8836',
      inpatientNo: '****', cardNo: '****', examTime: '2026-09-15 13:40'
    },
    capabilities: { hasMeasurement: false, hasPriorExam: false, hasEnhancedPhase: false, isTumor: false, hasStagingInfo: false },
    goldStandard: null,
    version: 1, status: 'draft',
    createdAt: '2026-09-15 13:55', createdBy: '教研 · 王',
    publishedAt: null, updatedAt: '2026-09-15 14:11', updatedBy: '教研 · 王'
  },
  {
    id: 'RC-007',
    title: '头颈CT · 鼻咽癌',
    modality: 'CT', bodyPart: '头颈', level: 'F2', icon: 'fa-user-doctor',
    clinicalBrief: '回吸性血涕 3 月，颈部包块。',
    series: series(96, 70, 70),
    deidentify: {
      name: '黄*', ageRange: '40–49 岁', sex: '男', dept: '耳鼻咽喉科',
      examNo: '****7754', imageNo: '****2201',
      inpatientNo: '****', cardNo: '****', examTime: '2026-09-14 16:20'
    },
    capabilities: { hasMeasurement: false, hasPriorExam: false, hasEnhancedPhase: false, isTumor: true, hasStagingInfo: false },
    goldStandard: null,
    version: 2, status: 'draft',
    createdAt: '2026-09-09 15:30', createdBy: '教研 · 陈',
    publishedAt: null, updatedAt: '2026-09-14 16:48', updatedBy: '教研 · 陈'
  },
  {
    id: 'RC-008',
    title: '骨肌DR · 胫骨平台骨折',
    modality: 'DR', bodyPart: '骨肌', level: 'U1', icon: 'fa-bone',
    clinicalBrief: '摔伤后左膝关节肿痛、活动受限 1 天。',
    series: series(24, 0, 0),
    deidentify: {
      name: '周*', ageRange: '30–39 岁', sex: '男', dept: '骨科',
      examNo: '****9903', imageNo: '****4470',
      inpatientNo: '****', cardNo: '****', examTime: '2026-09-19 08:58'
    },
    capabilities: { hasMeasurement: false, hasPriorExam: false, hasEnhancedPhase: false, isTumor: false, hasStagingInfo: false },
    goldStandard: null,
    version: 1, status: 'draft',
    createdAt: '2026-09-19 09:10', createdBy: '教研 · 王',
    publishedAt: null, updatedAt: '2026-09-19 09:31', updatedBy: '教研 · 王'
  }
]

/** 模态 / 部位 / 状态 筛选项（PRD §5.3 / §5.12.2 的枚举） */
export const MODALITIES = ['CT', 'MR', 'DR', '超声']
export const BODY_PARTS = ['颅脑', '头颈', '胸部', '腹部', '骨肌', '其他']

export const SAMPLE_STATUS = {
  draft: { label: '草稿', hint: '草稿 · 不可选', badge: 'badge-info' },
  published: { label: '已发布', hint: '已发布 · 可选', badge: 'badge-success' },
  disabled: { label: '已停用', hint: '已停用 · 不可选', badge: 'badge-error' }
}

/** 三视图键（PRD §9.4：本期三视图静态浏览 + 基础切换，互不联动） */
export const VIEW_KEYS = [
  { key: 'axial', zh: '轴位', en: 'AXIAL' },
  { key: 'coronal', zh: '冠状位', en: 'CORONAL' },
  { key: 'sagittal', zh: '矢状位', en: 'SAGITTAL' }
]
