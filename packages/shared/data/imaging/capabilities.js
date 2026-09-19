// 「本卷条件」——样本具备什么影像/临床条件，决定**哪些评分要点可评**。
//
// 2026-09-20 批注：「能力位**能不能放到评分表里去？不单独一个模块**」——故：
//   · 编辑端**不再有独立的「能力位」步骤**，条件声明并入「评分表」面板顶部的一条「本卷条件」
//   · 条件的**落点**从"整条剔除"改为**要点级标签**（`rubric.js` 的 `ASSESS_KINDS` / 要点上的 `assess`）
//   · 原 `isTumor` 不再单独暴露：它与 `hasStagingInfo` 对分数**完全等价**（两个分支同样剔除
//     `IMP-05` 的 4 分），故合并为一个条件「肿瘤病例（已提供分期依据）」= `hasStagingInfo`；
//     `isTumor` 仍留在数据里，只用来决定理由文案是"非肿瘤不适用"还是"缺分期依据"
//
// ⚠️ `hasMeasurement` **取值不由样本声明**：它由影像控件是否具备测量工具决定
// （§9.4 本期 `measurement: ❌`，故恒为 false）。故它**不是可勾条件**，只在评分表面板里
// 作为一行只读状态展示——做成可勾开关会让老师误以为"声明有测量能力"就能解锁 `FIND-04`，**恰恰相反**。

/**
 * 可勾的「本卷条件」（编辑端评分表面板顶部三项）。
 * `affects` 是"勾上/取消会影响哪些要点"，用于界面提示。
 */
export const CAPABILITY_FIELDS = [
  { key: 'hasEnhancedPhase', short: '增强', label: '增强期相序列', affects: ['FIND-06 · 强化程度'] },
  { key: 'hasPriorExam', short: '既往', label: '既往检查影像', affects: ['IMP-08 · 与以前检查比较'] },
  { key: 'hasStagingInfo', short: '分期', label: '肿瘤病例（已提供分期依据）', affects: ['IMP-05 · 肿瘤分期'] }
]

/** 不可勾、只读展示的条件（由影像控件能力决定） */
export const DERIVED_CAPABILITY = {
  key: 'hasMeasurement', short: '测量', label: '测量工具',
  affects: ['FIND-04 · 大小测量'], readonly: true,
  note: '由影像控件是否具备测量工具决定，本期不具备'
}

/** 全部能力位键（含只读派生位）——数据结构仍保留 5 个键，界面只暴露 3 个可勾 + 1 个只读 */
export const CAPABILITY_KEYS = ['hasMeasurement', 'hasPriorExam', 'hasEnhancedPhase', 'isTumor', 'hasStagingInfo']

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
 * 样本条件声明表（键 = caseId）。
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
  // 公开数据集样例（NSCLC-Radiomics）：均为肿瘤病例，无既往片、无分期依据；
  // 增强位按逐例目视判定（PUB-002 为增强扫描，其余为平扫）
  'PUB-001': { hasMeasurement: false, hasPriorExam: false, hasEnhancedPhase: false, isTumor: true, hasStagingInfo: false },
  'PUB-002': { hasMeasurement: false, hasPriorExam: false, hasEnhancedPhase: true, isTumor: true, hasStagingInfo: false },
  'PUB-003': { hasMeasurement: false, hasPriorExam: false, hasEnhancedPhase: false, isTumor: true, hasStagingInfo: false },
  'PUB-004': { hasMeasurement: false, hasPriorExam: false, hasEnhancedPhase: false, isTumor: true, hasStagingInfo: false },
  'RC-008': { hasMeasurement: false, hasPriorExam: false, hasEnhancedPhase: false, isTumor: false, hasStagingInfo: false }
}

/** 组卷发布门禁下限（PRD §5.13.5）：可评分 < 85 需走覆盖确认。训练侧不用 */
export const SCOREABLE_PUBLISH_FLOOR = 85
