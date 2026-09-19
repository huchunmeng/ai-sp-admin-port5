// 影像报告书写训练 —— 训练端数据入口（再导出）
//
// **真相源**：`packages/shared/data/imaging/`（经 `@ai-sp/shared/imaging` 暴露）。
// 本文件只是训练端的统一入口，不含任何数据 —— 病例题库、R1 表、能力位、提示库都在 shared 里，
// 因为管理端（题库维护）与训练端（挑病例练）必须读同一份，否则两边会漂移。
//
// 【本期数据边界，别误读】
//   · 影像本体：占位。全仓无 DICOM / 序列浏览 / 调窗 / 测量组件，待院方样本（Q2）与影像
//     教学底座到位后按 PRD §9.4 黑盒接入。界面明写「影像待接入」。
//   · 金标准报告：只有 RC-001 / RC-002 / RC-003 三例（取自仓库既有原文，已拆成 PRD §5.12.7
//     的三段式）；其余 5 例为草稿、金标准待教研录入。故训练端**当前可练 3 例**。
//   · 提示内容：静态示例，取自三级提示库（L1 体裁 / L2 指向 / L3 要点）。接服务端后改为
//     「模型输出 + 出站红线校验」（PRD §5.7 / §9.5），库只保留降级文案。
//
// 历史说明：本文件原自带 3 例 `{id,title,modality,bodyPart,icon,goldStandard,hints}` 的 mock
// 数据与 `REPORT_CASES` 导出。移植进 port5 时数据上移到 shared，旧导出已无调用方，故移除；
// 需要「卡片形状」请用 `trainingCardOf(sample, stat)`。

export {
  // 题库与派生
  IMAGING_SAMPLES,
  IMAGING_SAMPLE_ROWS,
  IMAGING_SAMPLE_BY_ID,
  TRAINING_CASES,
  // R1 表与报告契约
  R1_TABLE,
  R1_ITEMS,
  SEGMENTS,
  COVERAGE_ELEMENTS,
  DEIDENTIFY_ROWS,
  R1_TABLE_VERSION,
  REPORT_TOTAL_LIMIT,
  // 能力位与不可评
  CAPABILITIES,
  CAPABILITY_ITEMS,
  CAPABILITY_FIELDS,
  DEIDENTIFY_ITEMS,
  emptyCapabilities,
  scoreableOf,
  weightedScoreable,
  SCOREABLE_PUBLISH_FLOOR,
  // 提示库
  hintFor,
  hintBody,
  HINT_ELEMENTS,
  HINT_LEVELS,
  DEFAULT_QUOTA,
  HINT_COOLDOWN_MS,
  // 枚举与视图
  MODALITIES,
  BODY_PARTS,
  SAMPLE_STATUS,
  VIEW_KEYS,
  // 便捷函数
  getImagingSample,
  hasGoldStandard,
  infoRowsOf,
  goldStandardText,
  draftText,
  seriesTotal,
  trainingCardOf,
  unassessableOf
} from '@ai-sp/shared/imaging'

/** 三视图（PRD §9.4：静态浏览 + 基础切换，互不联动） */
export { VIEW_KEYS as VIEWS } from '@ai-sp/shared/imaging'
