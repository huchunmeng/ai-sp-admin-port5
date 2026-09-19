// R1 表 —— 《放射科-诊断报告书写质量评价表》100 分 / 5 维度 / 23 条目
//
// 来源：PRD_影像报告书写训练.md 附录 E（条目编码表）。
// 所有分数只在此处定义一次；结果页与自评页均由此归并（data-specs.md §三）。
// 注意：本表与 apps/admin 既有的「评分表管理」（score_sheets：{id, category, item, score}
// 扁平数组）**不是同一套结构**——后者没有条目编码、没有维度满分、没有判定档位、也没有
// 「不可评/归一」概念，R1 表的两条核心口径无处安放，故本模块自带此表，不改动既有评分表。

/** 5 维度 / 23 条目 / 合计 100 分 */
export const R1_TABLE = [
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
]

/** 23 条扁平索引（code → { code, name, score, dim }），供逐条自评 / 结果页按 code 关联 */
export const R1_ITEMS = R1_TABLE.flatMap(d =>
  d.items.map(it => ({ ...it, dim: d.dim, dimFull: d.full }))
)

/**
 * 报告字段规则（PRD §5.4.1，两侧同值同规则）。
 *
 * ⚠️ **四段而非三段**（2026-09-19 评分引擎接通后修正）：
 * R1 表「一、一般信息及报告及时性」占 14 分（`GEN-01` 患者信息 / `GEN-03` 检查时间 / `GEN-04` 临床主要信息
 * 及检查目的），而原先的三段输入（检查技术/影像所见/诊断意见）**没有任何地方能写这些内容** ——
 * 13 分对所有人都不可达（`GEN-02` 因全掩不评）。真实影像报告也以患者信息开头。故补「一般信息」段。
 *
 * `inGold: false` 表示该段**没有独立金标准**：它的"答案"就是样单元数据本身（脱敏值 + 临床主要信息），
 * 已写进 `rubric.js` 的 `GEN-01/03/04` 要点里。故 `hasGoldStandard()` 不计它，发布门槛不受影响。
 */
export const SEGMENTS = [
  // 「一般信息」段是**报告抬头**，不是把上面的患者信息再抄一遍：上限 250 字
  // （2026-09-20 批注：原 800 字与上方患者信息条观感重复，压到 250 并给一句极短的段头定位）
  { key: 'general', name: '一般信息', hint: '报告抬头：患者信息 + 检查 + 临床目的', limit: 250, trainingRequired: true, examRequired: false, inGold: false },
  { key: 'technique', name: '检查技术', limit: 500, trainingRequired: true, examRequired: false, inGold: true },
  { key: 'findings', name: '影像所见', limit: 3000, trainingRequired: true, examRequired: false, inGold: true },
  { key: 'impression', name: '诊断意见', limit: 3000, trainingRequired: true, examRequired: false, inGold: true }
]

/** 有独立金标准的段（发布门槛 / 金标准对照只看这三段） */
export const GOLD_SEGMENTS = SEGMENTS.filter(s => s.inGold !== false)

/**
 * 一般信息条的字段顺序与脱敏展示规则（PRD §5.2.2 / §5.12.4）。
 * `masked: true` 为全掩字段——不提供复制、本期不纳入评分（GEN-02 甲类）。
 */
export const DEIDENTIFY_ROWS = [
  { k: '患者姓名', key: 'name', copy: true, note: '仅露首字' },
  { k: '年龄', key: 'ageRange', copy: true, note: '年龄段' },
  { k: '性别', key: 'sex', copy: true },
  { k: '科别', key: 'dept', copy: true },
  { k: '检查时间', key: 'examTime', copy: true }
]
// 2026-09-20 批注：删掉「检查号 / 影像号 / 住院门诊号 / 就诊卡号」四个号码字段——
// 这些号对"写报告"没有可练的内容（原设计里 GEN-02 也一直判"不适用"），
// 去掉后剩下的字段够少，可以直接摊在影像下面，不必再挤进 tab 或折叠面板。
// 样本数据里若仍留着这几个键，只是不再渲染与评分，不报错。

/**
 * 报告字数上限（四段合计的兜底值）。
 * 原为 5000，但三段各自上限相加已达 6500，5000 反而成了"合法输入也被拦"的假约束；
 * 2026-09-20 「一般信息」段由 800 压到 250（报告抬头而非再抄一遍患者信息），
 * 故合计上限同步取各段之和 6750，只作防滥用的兜底。
 */
export const REPORT_TOTAL_LIMIT = 6750

/** R1 表版本号——随评分表改动递增，评分记录须留痕以解释历史成绩（PRD §5.9） */
export const R1_TABLE_VERSION = 'R1-2026.09'
