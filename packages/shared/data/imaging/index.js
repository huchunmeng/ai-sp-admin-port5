// 影像报告书写训练（E2）—— 共享数据源
//
// 为什么放在 `packages/shared/data/`：R1 表、能力位、样本题库**两端都要用**——管理端是生产侧
// （题库维护），训练端是消费侧（挑病例练）。放这里避免两处各写一份、日后漂移。
//
// 与既有资产的边界（重要，别误接）：
//   · **不接入** `apps/admin` 的「评分表管理」（`@ai-sp/shared/score-tables`）——那套是
//     `{ id, category, item, score }` 扁平数组，没有条目编码 / 维度满分 / 判定档位 / 不可评口径，
//     R1 表的两条核心口径（逐条 0-半-满分判定、不可评归一折算）无处安放。故本模块自带 R1 表。
//   · **不接入** `apps/admin` 的病例编辑器（`case-editor/`）——那是虚拟病人病例的 32 键结构，
//     本模块的 `imagingSample` 是另一套实体（影像序列 + 脱敏 + 能力位 + 三段式金标准）。
//   · **不接入**影像控件——全仓无 DICOM / 序列浏览 / 调窗 / 测量 组件（实证：零命中）。
//     本期三视图为占位，界面明写「影像待接入」，待院方样本与影像教学底座到位后按 §9.4 黑盒接入。

export {
  SCORE_TEMPLATE, TEMPLATE_ITEMS, TEMPLATE_VERSION, getScoreTemplate, setScoreTemplate,
  defaultScoreTemplate, isTemplateCustomized, LEVEL_CALIBRATION, getLevelCalibration,
  setLevelCalibration, defaultLevelCalibration, calibrationOf,
  SEGMENTS, WRITABLE_SEGMENTS, GOLD_SEGMENTS, DEIDENTIFY_ROWS, REPORT_TOTAL_LIMIT,
  R1_TABLE, R1_ITEMS, R1_TABLE_VERSION
} from './r1-table.js'
export {
  CAPABILITIES, CAPABILITY_FIELDS, CAPABILITY_KEYS, DERIVED_CAPABILITY, emptyCapabilities, SCOREABLE_PUBLISH_FLOOR
} from './capabilities.js'
export {
  RUBRIC, RUBRIC_VERSION, POINT_RULES, POINT_SCORE, RUBRIC_SEGMENTS, RUBRIC_TABLE,
  ASSESS_KINDS, ASSESS_BY_KEY, defaultPointScores,
  resolveRubric, hasHandRubric, scoreableOf, weightedScoreable
} from './rubric.js'
export {
  buildScoringPrompt, parseScoringResult, composeScore, prepareScoring, COMMENT_SCOPE,
  buildRubricExtractionPrompt, parseRubricExtraction,
  SCORING_FAILED_TEXT, NOT_COVERED_TEXT, PARTIAL_TEXT
} from './scoring.js'
export { IMAGING_SAMPLES, MODALITIES, BODY_PARTS, SAMPLE_STATUS, DEFAULT_VIEWS, VIEW_CANDIDATES, viewMeta } from './samples.js'
export {
  MAX_COMMON_SUBSTRING, GUIDE_FALLBACK, SEGMENT_GUIDE,
  extractFactWords, longestCommonSubstring, checkRedline,
  buildCompanionPrompt, goldFullTextOf
} from './companion.js'

import { IMAGING_SAMPLES, viewMeta } from './samples.js'
import { SEGMENTS, GOLD_SEGMENTS, DEIDENTIFY_ROWS as DEIDENTIFY_ROW_TEMPLATE } from './r1-table.js'

/* ── 学员侧标题：**不带任何征象**，只留「部位+模态 病例 N」 ──
 * 为什么两套标题：`title` 是**老师侧**用的（管理端列表/编辑器要能一眼认出是哪一例），
 * 学员侧不能出现"右肺上叶结节"这类提示，否则等于告诉他重点看哪里。
 * 诊断与征象仍在 `goldStandard` 里，老师照旧看得到。
 * 编号按题库顺序全局唯一、稳定（新增样本追加在末尾即不影响既有编号）。
 */
const STUDENT_SEQ = new Map(IMAGING_SAMPLES.map((s, i) => [s.id, i + 1]))

export function studentTitleOf(sample) {
  if (!sample) return ''
  const n = STUDENT_SEQ.get(sample.id)
  return `${sample.bodyPart || ''}${sample.modality || ''} 病例 ${n || ''}`.trim()
}

/** 某一段的参考报告文本：段二 = 题面给的检查目的 + 金标准里的检查方法 */
export function goldSegmentText(sample, seg) {
  const g = (sample && sample.goldStandard) || {}
  const base = seg.goldKey ? String(g[seg.goldKey] || '') : ''
  if (seg.key === 'purpose') return [sample && sample.purpose, base].filter(Boolean).join('；')
  return base
}
import { scoreableOf } from './rubric.js'

/** 运行时索引（样本元数据回取，避免各处重复造 title / modality） */
export const IMAGING_SAMPLE_BY_ID = Object.fromEntries(IMAGING_SAMPLES.map(s => [s.id, s]))

export function getImagingSample(id) {
  return IMAGING_SAMPLE_BY_ID[id] || null
}

/** 三段金标准皆非空 = 金标准已录（PRD §5.12.6 的发布前提）。「一般信息」段无独立金标准，不计 */
export function hasGoldStandard(sample) {
  const g = sample && sample.goldStandard
  if (!g) return false
  return GOLD_SEGMENTS.every(seg => String(g[seg.goldKey] || '').trim().length > 0)
}

/**
 * 训练端可练病例 = 已发布 且 金标准已录（PRD §5.12.2 / §5.12.6）。
 * ⚠️ 当前为 3 例——金标准取自仓库既有内容（详见 samples.js 头部说明），
 * 其余 5 例为 draft（金标准待教研录入）。这是 Q2 未答复的真相，不是缺漏。
 */
export const TRAINING_CASES = IMAGING_SAMPLES.filter(
  s => s.status === 'published' && hasGoldStandard(s)
)

/** 管理端题库列表行（含现算的 scoreableMax 与落空条目，PRD §5.12.2） */
export const IMAGING_SAMPLE_ROWS = IMAGING_SAMPLES.map(s => {
  const { max, lost } = scoreableOf(s.id, s.capabilities)
  return { ...s, scoreableMax: max, lost, goldStandardRecorded: hasGoldStandard(s) }
})

/**
 * 一般信息条（PRD §5.2.2 / §5.4.2）—— 脱敏形态即评分基准。
 * 全掩字段（`masked`）不提供复制按钮，并标注"该字段本期不纳入评分"。
 */
export function infoRowsOf(sample) {
  const d = (sample && sample.deidentify) || {}
  return DEIDENTIFY_ROW_TEMPLATE.map(r => {
    const row = { k: r.k, v: d[r.key] || '', note: r.note }
    if (r.masked) { row.masked = true } else { row.copy = true }
    return row
  })
}

// 与 r1-table.js 的 DEIDENTIFY_ROWS 同源，infoRowsOf 只做一次浅拷贝以附挂 v 值

/** 三段式金标准 → 对照页展示的纯文本（T4 对照右栏 / 结果页参考报告）。「一般信息」段无金标准，不计 */
export function goldStandardText(gold) {
  if (!gold) return ''
  return GOLD_SEGMENTS
    .filter(seg => String(gold[seg.goldKey] || '').trim())
    .map(seg => `${seg.name}：\n${gold[seg.key]}`)
    .join('\n\n')
}

/** 学生报告草稿 → 对照页左栏纯文本 */
export function draftText(draft) {
  if (!draft) return ''
  return SEGMENTS
    .filter(seg => String(draft[seg.key] || '').trim())
    .map(seg => `${seg.name}：\n${draft[seg.key]}`)
    .join('\n\n')
}

/**
 * 序列总帧数（序列信息条展示用）。
 * `series` 是**有序数组** `[{key,name,en,frames}]`——视图数量随样本变（1–5 个不等），
 * 不是写死的"三视图"。兼容早期对象形状 `{axial:62,...}`，避免旧数据炸掉。
 */
export function seriesTotal(sample) {
  const s = (sample && sample.series) || null
  if (!s) return 0
  if (Array.isArray(s)) return s.reduce((a, x) => a + (x.frames || 0), 0)
  return Object.values(s).reduce((a, n) => a + (Number(n) || 0), 0)
}

/** 归一化序列列表（数组原样返回；对象形状转成列表，保证渲染侧只需处理一种形状） */
export function seriesListOf(sample) {
  const s = (sample && sample.series) || null
  if (!s) return []
  if (Array.isArray(s)) return s
  return Object.entries(s).map(([key, frames]) => ({ key, ...viewMeta(key), frames: Number(frames) || 0 }))
}

/** 该样本的不可评条目清单（管理端能力位徽章点开 / 结果页条目级分色） */
export function unassessableOf(caseId, cap) {
  return scoreableOf(caseId, cap).lost
}

/**
 * 训练端卡片视图（列表页用）。
 * 练习统计不在静态样本里——由训练端基于 localStorage 维护
 * `practiceStats[caseId] = { completedRounds, lastPracticedAt }`。
 * ⚠️ 原契约里还有 `lastSelfReviewScore`，**已随"取消逐条自评"的批注一并去掉**（完成一例 = 提交报告）。
 */
export function trainingCardOf(sample, stat) {
  const { max } = scoreableOf(sample.id, sample.capabilities)
  const s = stat || {}
  return {
    id: sample.id,
    // 学员侧标题：纯编号，不带征象
    title: studentTitleOf(sample),
    modality: sample.modality,
    bodyPart: sample.bodyPart,
    level: sample.level,
    icon: sample.icon,
    // 卡片只露病史：检查目的可能是答案的提示（学员要自己从病史提炼）
    clinical: sample.history || '',
    seriesTotal: seriesTotal(sample),
    viewCount: seriesListOf(sample).length,
    scoreableMax: max,
    trainedRounds: s.completedRounds || 0,
    lastAt: s.lastPracticedAt || null
  }
}
