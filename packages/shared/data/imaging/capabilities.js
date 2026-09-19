// 能力位（样本具备什么影像/临床条件）
//
// 能力位决定**哪些评分要点可评**——这个判断现在由 `rubric.js` 的 `POINT_RULES` 落到**要点级**
// （原先是"整条剔除"，会把学生写对的子项也一起扣掉，对训练不公平）。
//
// ⚠️ `hasMeasurement` 虽列在能力位里，但**取值不由样本声明**：它由影像控件是否具备测量工具决定
// （§9.4 本期 `measurement: ❌`，故恒为 false）。入库侧**只读展示、不给勾选**——做成可勾开关会让
// 老师误以为"给样本声明有测量能力"就能解锁 `FIND-04`，**恰恰相反**。

/** 能力位字段定义：拆「控件派生位」与「样本声明位」两类（PRD §5.12.5） */
export const CAPABILITY_FIELDS = [
  { key: 'hasMeasurement', short: '测量', label: '测量工具', derived: true, readonly: true, affects: ['FIND-04 · 大小测量'] },
  { key: 'hasPriorExam', short: '既往', label: '既往检查影像', derived: false, readonly: false, affects: ['IMP-08 · 与以前检查比较'] },
  { key: 'hasEnhancedPhase', short: '增强', label: '增强期相序列', derived: false, readonly: false, affects: ['FIND-06 · 强化程度'] },
  { key: 'isTumor', short: '肿瘤', label: '肿瘤病例', derived: false, readonly: false, affects: ['IMP-05 · 肿瘤分期'] },
  { key: 'hasStagingInfo', short: '分期', label: '临床含分期依据', derived: false, readonly: false, affects: ['IMP-05 · 肿瘤分期'] }
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
 * 本期影像控件无测量工具，故 `hasMeasurement` 全为 false；待影像教学底座补齐后由底座侧置位。
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

/** 组卷发布门禁下限（PRD §5.13.5）：可评分 < 85 需走覆盖确认。训练侧不用 */
export const SCOREABLE_PUBLISH_FLOOR = 85
