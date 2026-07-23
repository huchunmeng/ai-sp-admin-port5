// 评分表模板索引 — 统一从 shared 规范数据源导出
// 规范数据文件位于 packages/shared/data/score-tables/*.json
export {
  scoreTemplates,
  getScoreTable,
  getTemplateList,
  SCORE_SHEET_TEMPLATES,
  TEMPLATES_BY_TYPE,
  TEMPLATES_BY_CODE,
  getTemplateByType,
  getTemplateByCode,
  getTemplateItems,
  specialtyTableNames,
  getSpecialtyTableName,
  stationScoreTableBindings,
  flattenTemplateItems,
  getTemplateFlatItems,
  templateV1
} from '@ai-sp/shared/score-tables'
