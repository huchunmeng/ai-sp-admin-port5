// 评分表模板索引 — 按领域和编码双向索引
// 用于评分表管理页面和病例生成系统

import historyTemplate from './score-sheet-history.json'
import physicalTemplate from './score-sheet-physical.json'
import diagnosisTemplate from './score-sheet-diagnosis.json'
import communicationTemplate from './score-sheet-communication.json'
import recordTemplate from './score-sheet-record.json'
import analysisTemplate from './score-sheet-analysis.json'

/** 所有标准模板列表 */
export const SCORE_SHEET_TEMPLATES = [
  historyTemplate,
  physicalTemplate,
  diagnosisTemplate,
  communicationTemplate,
  recordTemplate,
  analysisTemplate
]

/** 按领域类型索引: { history: {...}, physical: {...}, ... } */
export const TEMPLATES_BY_TYPE = Object.fromEntries(
  SCORE_SHEET_TEMPLATES.map(t => [t.type, t])
)

/** 按编码索引: { 'TPL-STD': {...}, 'TPL-STD-2': {...}, ... } */
export const TEMPLATES_BY_CODE = Object.fromEntries(
  SCORE_SHEET_TEMPLATES.map(t => [t.code, t])
)

/** 根据领域类型获取模板 */
export function getTemplateByType(type) {
  return TEMPLATES_BY_TYPE[type] || null
}

/** 根据编码获取模板 */
export function getTemplateByCode(code) {
  return TEMPLATES_BY_CODE[code] || null
}

/** 获取模板的扁平化评分项列表 */
export function getTemplateItems(typeOrCode) {
  const tpl = TEMPLATES_BY_TYPE[typeOrCode] || TEMPLATES_BY_CODE[typeOrCode]
  return tpl ? tpl.items : []
}
