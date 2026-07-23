/**
 * 临床思维全流程 — 7阶段常量定义
 * 与 2.0 版数据结构共存，通过 @ai-sp/shared/workflow-constants 引入
 */

export const STAGES = [
  { id: 1, key: 'history', label: '病史采集', subtitle: '问诊对话', dataKey: 'dialogue', route: 'stage1' },
  { id: 2, key: 'physicalExam', label: '体格检查', subtitle: '虚拟体检', dataKey: 'physicalExamResults', route: 'stage2' },
  { id: 3, key: 'ancillaryTests', label: '辅助检查', subtitle: '检查选择', dataKey: 'testResults', route: 'stage3' },
  { id: 4, key: 'diagnosis', label: '初步诊断', subtitle: '诊断推理', dataKey: 'diagnosisData', route: 'stage4' },
  { id: 5, key: 'differential', label: '鉴别诊断', subtitle: '鉴别分析', dataKey: 'differentialData', route: 'stage5' },
  { id: 6, key: 'treatment', label: '治疗方案', subtitle: '治疗决策', dataKey: 'treatmentData', route: 'stage6' },
  { id: 7, key: 'record', label: '病历书写', subtitle: '病历总结', dataKey: 'recordData', route: 'stage7' }
]

export const STAGE_STATUS = {
  LOCKED: 'locked',
  ACTIVE: 'active',
  SUBMITTED: 'submitted'
}

export const SESSION_STATUS = {
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  ABANDONED: 'abandoned'
}

export const MODES = {
  FREE: 'free',
  EXAM: 'exam',
  CHALLENGE: 'challenge'
}

export function getStageById(id) {
  return STAGES.find(s => s.id === id) || null
}

export function getStageByKey(key) {
  return STAGES.find(s => s.key === key) || null
}

export function getStageLabel(stageId) {
  const stage = getStageById(stageId)
  return stage ? stage.label : `阶段 ${stageId}`
}

export function getNextStageId(currentId) {
  const next = currentId + 1
  return next <= STAGES.length ? next : null
}

export function getPrevStageId(currentId) {
  const prev = currentId - 1
  return prev >= 1 ? prev : null
}

export function isLastStage(stageId) {
  return stageId === STAGES.length
}

export function isFirstStage(stageId) {
  return stageId === 1
}

export function buildEmptyStageData() {
  const stages = {}
  STAGES.forEach((s, idx) => {
    stages[String(idx + 1)] = { status: STAGE_STATUS.LOCKED, data: {} }
  })
  stages['1'].status = STAGE_STATUS.ACTIVE
  return stages
}
