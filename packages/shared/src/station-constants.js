// ═══════════════════════════════════════════════════════════════
// 考站/剖面/项目统一常量 — 全平台唯一数据源
// ═══════════════════════════════════════════════════════════════

// ── 考站 ID → 中文名称 ──
export const STATION_ID_TO_LABEL = {
  historyTaking: '接诊病人站',
  physicalExam: '体格检查站',
  humanity: '交流沟通站',
  humanisticComm: '交流沟通站',
  preliminaryDiag: '初步诊断站',
  caseAnalysis: '临床思维站',
  analysis: '临床思维站',
  medicalRecord: '病历书写站',
  treatmentPlan: '治疗计划站',
  mentalExam: '精神检查站',
}

// ── 考站 ID → 剖面类型 (snake_case) ──
export const STATION_TO_PROFILE_TYPE = {
  historyTaking: 'history_taking',
  physicalExam: 'physical_exam',
  humanity: 'communication',
  humanisticComm: 'communication',
  analysis: 'case_analysis',
  caseAnalysis: 'case_analysis',
  preliminaryDiag: 'case_analysis',
  medicalRecord: 'medical_record',
  treatmentPlan: 'case_analysis',
  mentalExam: 'mental_exam',
}

// ── 考站 ID → trainingSession key ──
export const STATION_TO_SESSION_KEY = {
  historyTaking: 'historyTaking',
  humanity: 'humanisticComm',
  physicalExam: 'physicalExam',
  analysis: 'caseAnalysis',
  preliminaryDiag: 'preliminaryDiag',
  treatmentPlan: 'treatmentPlan',
  medicalRecord: 'medicalRecord',
  mentalExam: 'mentalExam',
}

// ── 剖面类型 → 展示名称 ──
export const PROFILE_TYPE_LABELS = {
  history_taking: '病史采集',
  physical_exam: '体格检查',
  communication: '人文沟通',
  mental_exam: '精神检查',
  case_analysis: '病例分析',
  medical_record: '病历书写',
}

// ── 考站 ID → 剖面分析器配置 ──
export const PROFILE_CONFIG_MAP = {
  historyTaking: { fn: 'analyzeHistoryTakingProfile', useExam: false },
  physicalExam: { fn: 'analyzePhysicalExamProfile', useExam: true },
  humanity: { fn: 'analyzeHumanisticCommProfile', useExam: false },
  analysis: { fn: 'analyzeCaseAnalysisProfile', useExam: false },
  preliminaryDiag: { fn: 'analyzeCaseAnalysisProfile', useExam: false },
  medicalRecord: { fn: 'analyzeMedicalRecordProfile', useText: true },
  treatmentPlan: { fn: 'analyzeCaseAnalysisProfile', useExam: false },
  mentalExam: { fn: 'analyzeMentalExamProfile', useExam: false },
}

// ── 中文考站名 → 英文 ID 列表（用于 enriched-records 报告匹配） ──
export const STATION_LABEL_TO_IDS = {
  '接诊病人站': ['historyTaking', 'mentalExam'],
  '体格检查站': ['physicalExam'],
  '交流沟通站': ['humanity', 'humanisticComm'],
  '初步诊断站': ['preliminaryDiag'],
  '临床思维站': ['caseAnalysis', 'analysis'],
  '病历书写站': ['medicalRecord'],
  '治疗计划站': ['treatmentPlan'],
  '精神检查站': ['mentalExam'],
}

// ── 旧名称别名 → 标准中文名称 ──
export const STATION_LABEL_ALIASES = {
  '病史采集站': '接诊病人站',
}

// ── 考核项目名称 → Tab 配置 ──
export const PROJECT_TAB_CONFIG = {
  '病史采集': { key: 'history', type: 'dialog', sessionKey: 'historyTaking' },
  '体格检查': { key: 'exam', type: 'exam', sessionKey: 'physicalExam' },
  '初步诊断': { key: 'diagnosis', type: 'diagnosis', sessionKey: 'preliminaryDiag' },
  '治疗计划': { key: 'treatment', type: 'treatment', sessionKey: 'treatmentPlan' },
  '病历书写': { key: 'record', type: 'record', sessionKey: 'medicalRecord' },
  '病例分析': { key: 'analysis', type: 'analysis', sessionKey: 'caseAnalysis' },
  '人文沟通': { key: 'humanity', type: 'humanity', sessionKey: 'humanisticComm' },
  '精神检查': { key: 'mental', type: 'dialog', sessionKey: 'mentalExam' },
}

// ── 考核项目名称 → station target ──
export const PROJECT_TO_STATION_TARGET = {
  '病史采集': 'historyTaking',
  '体格检查': 'physicalExam',
  '初步诊断': 'preliminaryDiag',
  '治疗计划': 'treatmentPlan',
  '病历书写': 'medicalRecord',
  '病例分析': 'caseAnalysis',
  '人文沟通': 'humanisticComm',
  '交流沟通站': 'humanisticComm',
  '精神检查': 'mentalExam',
}

// ── 辅助函数 ──

// ── 内置考站定义（全局统一，机构不可配置） ──
export const BUILTIN_STATIONS = {
  '1.0': {
    version: '1.0',
    label: '1.0版',
    stations: [
      { name: '病史采集', duration: 15, routeName: 'historyTaking', projects: ['病史采集'] }
    ]
  },
  'full-flow': {
    version: 'full-flow',
    label: '全流程版',
    stations: [
      { name: '病史采集', duration: 15, routeName: 'historyTaking', projects: ['病史采集'] },
      { name: '体格检查', duration: 10, routeName: 'physicalExam', projects: ['体格检查'] },
      { name: '辅助检查', duration: 10, routeName: 'ancillaryTests', projects: ['辅助检查'] },
      { name: '诊断', duration: 10, routeName: 'diagnosis', projects: ['诊断'] },
      { name: '治疗计划', duration: 10, routeName: 'treatmentPlan', projects: ['治疗计划'] },
      { name: '病历书写', duration: 15, routeName: 'medicalRecord', projects: ['病历书写'] }
    ]
  }
}

// ── 辅助函数 ──

/** stationId → 中文考站名 */
export function getStationLabel(stationId) {
  return STATION_ID_TO_LABEL[stationId] || stationId || '未知'
}

/** stationId → profile type (snake_case) */
export function getProfileType(stationId) {
  return STATION_TO_PROFILE_TYPE[stationId] || stationId
}

/** 中文考站名 → 所有英文 ID */
export function getStationIdsByLabel(label) {
  return STATION_LABEL_TO_IDS[label] || (label ? [label] : [])
}

/** 获取查找报告文件时需要的所有前缀（英文ID + 中文名 + 所属站名 + 同站其他项目名） */
export function getReportLookupPrefixes(stationId) {
  const prefixes = [stationId]
  const label = STATION_ID_TO_LABEL[stationId]
  if (label && label !== stationId) prefixes.push(label)
  // 反向查找：如果 stationId 属于某个站的项目，也要加入该站的中文名
  for (const [stationLabel, ids] of Object.entries(STATION_LABEL_TO_IDS)) {
    if (ids.includes(stationId) && !prefixes.includes(stationLabel)) {
      prefixes.push(stationLabel)
    }
  }
  // 同站其他项目的 label 也加入（兼容旧文件命名）
  for (const [stationLabel, ids] of Object.entries(STATION_LABEL_TO_IDS)) {
    if (ids.length <= 1) continue
    if (ids.includes(stationId)) {
      for (const siblingId of ids) {
        if (siblingId === stationId) continue
        const siblingLabel = STATION_ID_TO_LABEL[siblingId]
        if (siblingLabel && !prefixes.includes(siblingLabel)) prefixes.push(siblingLabel)
      }
    }
  }
  // 别名
  for (const [alias, canonical] of Object.entries(STATION_LABEL_ALIASES)) {
    if (canonical === label && !prefixes.includes(alias)) prefixes.push(alias)
  }
  return prefixes
}
