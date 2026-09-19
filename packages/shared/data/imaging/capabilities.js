// 能力位与「不可评」判定 —— R1 表有 16 分本期根本评不了（PRD §5.2.2 / 附录 E）
//
// 两档语义必须区分（附录 E「先救后兜」）：
//   · 先救 —— 可评的子项留在分母内（如 FIND-04 的"数目"可目测可评）；
//   · 兜底 —— 子项所需输入确实不具备时，该子项分值从可评分母中剔除，**不得按 0 分计**。
// 演示按最坏情形（四类全部走到兜底），故按条级 −4 计，与 §5.5.1 / BDD 场景 30 的 84 分对齐。

/**
 * 甲类不可评 · 样本去标识（对所有样本一致，不随能力位变，全局常量）。
 * GEN-02 为**部分不可评**：检查号 / 影像号保留后 4 位仍可评，故该条整体仍计入分母，
 * 条内按可评部分判分 —— 这正是「四条同时落空 = 84 分」算式不含甲类的原因。
 *
 * ⚠️ `assessableRatio` 取 0.5 是**演示占位**，PRD 未给数值口径。真实值由评分引擎按
 * 实际可评字段比例产出，勿当契约（data-specs.md §五）。
 */
export const DEIDENTIFY_ITEMS = [
  {
    code: 'GEN-02', score: 1, assessableRatio: 0.5,
    label: '住院/门诊号、就诊卡号',
    why: '全掩字段，不提供复制、不纳入评分'
  }
]

/**
 * 乙类不可评 · 样本能力位 × 控件能力（随样本变，**必须按样本现算，不得写成静态旗标**）。
 * `hit` = 转入兜底（分值移出分母）；`nA` = 不适用（仅 IMP-05 有）。
 */
export const CAPABILITY_ITEMS = [
  {
    code: 'FIND-04', score: 4, label: '病灶大小准确测量',
    why: '影像控件不提供测量工具（归影像教学底座，口径 Q9）',
    hit: c => !c.hasMeasurement
  },
  {
    code: 'IMP-08', score: 4, label: '与以前检查比较',
    why: '病例为静态单次检查，无既往片子',
    hit: c => !c.hasPriorExam
  },
  {
    code: 'FIND-06', score: 4, label: '强化程度准确分度',
    why: '病例无增强期相序列（口径 Q2）',
    hit: c => !c.hasEnhancedPhase
  },
  {
    code: 'IMP-05', score: 4, label: '肿瘤分期',
    why: '肿瘤病例且临床主要信息未给足分期依据（口径 Q2）',
    nA: c => !c.isTumor,
    hit: c => c.isTumor && !c.hasStagingInfo
  }
]

/**
 * 能力位字段定义 —— 拆「控件派生位」与「样本声明位」两类（PRD §5.12.5）。
 *
 * ⚠️ `hasMeasurement` 虽列在能力位里，但**取值不由样本声明**：它由影像控件是否具备
 * 测量工具决定（§9.4 本期 `measurement: ❌`，故恒为 false）。入库侧**只读展示、不给勾选**——
 * 做成可勾开关会让老师误以为"给样本声明有测量能力"就能解锁 FIND-04，**恰恰相反**。
 */
export const CAPABILITY_FIELDS = [
  { key: 'hasMeasurement', short: '测量', label: '测量工具', derived: true, readonly: true, hitCode: 'FIND-04' },
  { key: 'hasPriorExam', short: '既往', label: '既往检查影像', derived: false, readonly: false, hitCode: 'IMP-08' },
  { key: 'hasEnhancedPhase', short: '增强', label: '增强期相序列', derived: false, readonly: false, hitCode: 'FIND-06' },
  { key: 'isTumor', short: '肿瘤', label: '肿瘤病例', derived: false, readonly: false, hitCode: 'IMP-05' },
  { key: 'hasStagingInfo', short: '分期', label: '临床含分期依据', derived: false, readonly: false, hitCode: 'IMP-05' }
]

/** 空能力位（新建样本的初值）—— hasMeasurement 由控件决定，新建时预置为 false */
export function emptyCapabilities() {
  return {
    hasMeasurement: false,
    hasPriorExam: false,
    hasEnhancedPhase: false,
    isTumor: false,
    hasStagingInfo: false
  }
}

/**
 * 样本能力位声明表（键 = caseId）。
 * 本期影像控件无测量工具，故 `hasMeasurement` 全为 false；RC-004 / RC-008 在原型种子中曾置
 * true 以示"控件补齐后"的形态，本实现**统一按控件真实能力置 false**——否则管理端会出现
 * 「声明了测量能力却不评 FIND-04」的假象。待影像教学底座补齐测量工具，由底座侧置位。
 */
export const CAPABILITIES = {
  'RC-001': { hasMeasurement: false, hasPriorExam: false, hasEnhancedPhase: false, isTumor: true, hasStagingInfo: false },
  'RC-002': { hasMeasurement: false, hasPriorExam: false, hasEnhancedPhase: false, isTumor: false, hasStagingInfo: false },
  'RC-003': { hasMeasurement: false, hasPriorExam: true, hasEnhancedPhase: true, isTumor: true, hasStagingInfo: true },
  'RC-004': { hasMeasurement: false, hasPriorExam: false, hasEnhancedPhase: false, isTumor: true, hasStagingInfo: false },
  'RC-005': { hasMeasurement: false, hasPriorExam: false, hasEnhancedPhase: true, isTumor: false, hasStagingInfo: false },
  'RC-006': { hasMeasurement: false, hasPriorExam: false, hasEnhancedPhase: false, isTumor: false, hasStagingInfo: false },
  'RC-007': { hasMeasurement: false, hasPriorExam: false, hasEnhancedPhase: false, isTumor: true, hasStagingInfo: false },
  'RC-008': { hasMeasurement: false, hasPriorExam: false, hasEnhancedPhase: false, isTumor: false, hasStagingInfo: false }
}

/**
 * scoreableMax = 100 − Σ(乙类落空条满分)。甲类 GEN-02 部分不可评，**不整体剔除**。
 * 派生量，**每次现算**，不得写死（PRD §5.5.1 / data-specs §14.2）。
 *
 * @param {string} caseId
 * @param {object} [cap] 覆盖能力位（管理端编辑器里勾选后即时重算用）
 * @returns {{ max: number, lost: Array<{code,source,score,why,label}> }}
 */
export function scoreableOf(caseId, cap) {
  const c = cap || CAPABILITIES[caseId] || {}
  let max = 100
  const lost = []
  CAPABILITY_ITEMS.forEach(it => {
    if (it.nA && it.nA(c)) {
      max -= it.score
      lost.push({ code: it.code, source: 'na', score: it.score, label: it.label, why: '该条对本类病例不适用（N/A），结果页不标注折算' })
    } else if (it.hit(c)) {
      max -= it.score
      lost.push({ code: it.code, source: 'capability', score: it.score, label: it.label, why: it.why })
    }
  })
  return { max: Math.round(max * 10) / 10, lost }
}

/** 整卷加权可评分（PRD §5.9.2）：Σ(该例 scoreableMax × 权重) ÷ Σ权重（1 位小数） */
export function weightedScoreable(refs) {
  if (!refs || !refs.length) return { max: 0, lost: [] }
  const totalWeight = refs.reduce((a, r) => a + (r.weight || 0), 0)
  if (!totalWeight) return { max: 0, lost: [] }
  let sum = 0
  const lostMap = new Map()
  refs.forEach(r => {
    const s = scoreableOf(r.caseId)
    sum += s.max * (r.weight || 0)
    s.lost.forEach(l => {
      const prev = lostMap.get(`${r.caseId}:${l.code}`)
      if (!prev) lostMap.set(`${r.caseId}:${l.code}`, { ...l, caseId: r.caseId, weight: r.weight })
    })
  })
  return { max: Math.round((sum / totalWeight) * 10) / 10, lost: [...lostMap.values()] }
}

/** 组卷发布门禁下限（PRD §5.13.5）：可评分 < 85 需走覆盖确认 */
export const SCOREABLE_PUBLISH_FLOOR = 85
