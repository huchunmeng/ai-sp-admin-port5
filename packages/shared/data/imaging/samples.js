// 影像报告样本（题库）—— 8 例
//
// ⚠️ 本期为界面骨架用的**假数据**：影像本体、金标准报告均为示例文本，待院方提供真实样本与
// 配套金标准后替换（需求确认单 Q2 待答复）。文件头显式声明，不做成像是真样本的样子。
//
// 字段形状照 PRD §5.12.7 `imagingSample` 与 data-specs.md §12.3 `ADM_SAMPLES`（同键，不另造 id）。
//
// 【序列（series）不是"三视图"——是按样本声明的有序列表】
//   PRD/原型当初按"三视图（轴位/冠状位/矢状位）"设计，但真实影像不是这样：
//     · DR 平片只有「正位 / 侧位」两个体位，每个体位 **1 帧**（不是层面序列）
//     · 颅脑 MR 是「DWI / ADC / T2WI / FLAIR」等**多序列**，不是三个方位
//     · 腹部 CT 增强是「平扫 / 动脉期 / 门脉期 / 延迟期」**按期相**分，不是三个方位
//   故 `series` 改为**有序数组** `[{ key, name, en, frames }]`，视图数量随样本变（本批 1–5 个），
//   界面按数组长度自适应渲染，编辑端可增删视图（`VIEW_CANDIDATES` 提供候选项）。
//   本节数据刻意覆盖了 1 / 2 / 3 / 4 / 5 个视图与"单帧"这两种边界。
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

/** 新建样本时的默认视图（三视图）——只是**模板**，不是所有样本都必须有这三个 */
export const DEFAULT_VIEWS = [
  { key: 'axial', name: '轴位', en: 'AXIAL' },
  { key: 'coronal', name: '冠状位', en: 'CORONAL' },
  { key: 'sagittal', name: '矢状位', en: 'SAGITTAL' }
]

/** 编辑端「添加视图」的候选项——覆盖常见方位 / MR 序列 / CT 期相 / DR 体位 */
export const VIEW_CANDIDATES = [
  ...DEFAULT_VIEWS,
  { key: 'dwi', name: 'DWI', en: 'DWI' },
  { key: 'adc', name: 'ADC 图', en: 'ADC' },
  { key: 't1wi', name: 'T1WI', en: 'T1WI' },
  { key: 't2wi', name: 'T2WI', en: 'T2WI' },
  { key: 'flair', name: 'FLAIR', en: 'FLAIR' },
  { key: 'plain', name: '平扫', en: 'PLAIN' },
  { key: 'arterial', name: '动脉期', en: 'ARTERIAL' },
  { key: 'portal', name: '门脉期', en: 'PORTAL' },
  { key: 'delayed', name: '延迟期', en: 'DELAYED' },
  { key: 'pa', name: '正位', en: 'AP' },
  { key: 'lateral', name: '侧位', en: 'LATERAL' }
]

/** 视图定义查表（`{key,name,en}`）；未知 key 退回 key 本身，保证渲染不炸 */
export function viewMeta(key) {
  return VIEW_CANDIDATES.find(v => v.key === key) || { key, name: key, en: String(key).toUpperCase() }
}

const v = (key, frames) => ({ key, ...viewMeta(key), frames })

import { SEU_SAMPLES } from './samples-seu.js'
import { PUB_SAMPLES } from './samples-pub.js'
import { KNEE_SAMPLES } from './samples-knee.js'

/** 手写样例（界面骨架用假数据，金标准取自仓库既有原文） */
const RC_SAMPLES = [
  {
    id: 'RC-001',
    title: '胸部CT · 右肺上叶结节',
    modality: 'CT',
    bodyPart: '胸部',
    level: 'R2',
    icon: 'fa-lungs',
    history: "咳嗽伴痰中带血2周；胸部CT平扫已发现右肺上叶占位",
    purpose: "明确右肺上叶占位性质",
    series: [v('axial', 62), v('coronal', 48), v('sagittal', 48)],
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
    version: 3, status: 'draft',
    createdAt: '2026-09-10 09:12', createdBy: '教研 · 陈',
    publishedAt: null, updatedAt: '2026-09-20 02:30', updatedBy: '系统',
    sampleNote: '下架：影像原为程序生成的演示占位图（非真实影像）。2026-09-20 接入公开数据集真实序列后，本模块不再保留假影像的病例；补上真实影像后可重新上架'
  },
  {
    id: 'RC-002',
    title: '颅脑MR · 急性脑梗死',
    modality: 'MR',
    bodyPart: '颅脑',
    level: 'R2',
    icon: 'fa-brain',
    history: "突发左侧肢体无力6小时",
    purpose: "评估急性脑血管病（如脑梗死或脑出血）",
    // MR 病例：**不是三视图**，是按序列分（4 个序列）
    series: [v('dwi', 40), v('adc', 40), v('t2wi', 32), v('flair', 32)],
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
    version: 2, status: 'draft',
    createdAt: '2026-09-08 10:30', createdBy: '教研 · 陈',
    publishedAt: null, updatedAt: '2026-09-20 02:30', updatedBy: '系统',
    sampleNote: '下架：影像原为程序生成的演示占位图（非真实影像）。补上真实影像后可重新上架'
  },
  {
    id: 'RC-003',
    title: '腹部CT · 肝细胞癌（TACE术后）',
    modality: 'CT',
    bodyPart: '腹部',
    level: 'R3',
    icon: 'fa-x-ray',
    history: "肝细胞癌TACE术后1月",
    purpose: "术后疗效评估及肿瘤复发/残留监测",
    // 增强 CT：按**期相**分（4 期），不是按方位
    series: [v('plain', 88), v('arterial', 88), v('portal', 88), v('delayed', 64)],
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
    version: 1, status: 'draft',
    createdAt: '2026-09-05 14:20', createdBy: '教研 · 王',
    publishedAt: null, updatedAt: '2026-09-20 02:30', updatedBy: '系统',
    sampleNote: '下架：影像原为程序生成的演示占位图（非真实影像）。补上真实影像后可重新上架'
  },
  {
    id: 'RC-004',
    title: '胸部CT · 纵隔淋巴结肿大',
    modality: 'CT', bodyPart: '胸部', level: 'F1', icon: 'fa-lungs',
    history: "低热、盗汗1月余；胸片示纵隔增宽",
    purpose: "进一步评估纵隔病变性质（如淋巴瘤、结核、胸腺瘤等）",
    // 只有两个方位（不做矢状位重建）
    series: [v('axial', 74), v('coronal', 56)],
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
    history: "体检发现肝内占位",
    purpose: "明确肝内占位性质（良恶性鉴别、来源判断）",
    // 最多的一例：5 个序列（T1WI / T2WI + 增强三期）
    series: [v('t1wi', 52), v('t2wi', 52), v('arterial', 52), v('portal', 52), v('delayed', 52)],
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
    history: "突发头痛伴意识障碍2小时；高血压病史10年",
    purpose: "评估急性颅内病变（如脑出血、大面积脑梗死、蛛网膜下腔出血）",
    // 只有轴位一个序列
    series: [v('axial', 36)],
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
    history: "回吸性血涕3月，颈部包块",
    purpose: "筛查鼻咽癌及颈部淋巴结转移",
    series: [v('axial', 96), v('coronal', 70), v('sagittal', 70)],
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
    history: "摔伤后左膝关节肿痛、活动受限1天",
    purpose: "评估左膝关节骨折、韧带或半月板损伤",
    // DR 平片：两个体位、**每个体位 1 帧**（不是层面序列）—— 单帧边界
    series: [v('pa', 1), v('lateral', 1)],
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

/**
 * 题库 = 手写样例（RC-*，界面骨架用假数据） + 院方素材样例（SEU-*，真实影像）
 * 院方样例的元数据、金标准与要点集见 `samples-seu.js`（自动生成，含已知事项说明）。
 */
export const IMAGING_SAMPLES = [
  ...KNEE_SAMPLES,...RC_SAMPLES, ...SEU_SAMPLES, ...PUB_SAMPLES]

/** 模态 / 部位 / 状态 筛选项（PRD §5.3 / §5.12.2 的枚举） */
export const MODALITIES = ['CT', 'MR', 'DR', '超声']
export const BODY_PARTS = ['颅脑', '头颈', '胸部', '腹部', '骨肌', '其他']

export const SAMPLE_STATUS = {
  draft: { label: '草稿', hint: '草稿 · 不可选', badge: 'badge-info' },
  published: { label: '已发布', hint: '已发布 · 可选', badge: 'badge-success' },
  disabled: { label: '已停用', hint: '已停用 · 不可选', badge: 'badge-error' }
}
