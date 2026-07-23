/**
 * 思维追踪引擎 — 记录学员的推理路径和关键决策点
 * 为Phase 2的可视化思维导图准备数据
 */

const ACTION_TYPES = {
  GENERATE_HYPOTHESIS: 'generate_hypothesis',
  COLLECT_INFO: 'collect_info',
  SELECT_EXAM: 'select_exam',
  ORDER_TEST: 'order_test',
  MAKE_DIAGNOSIS: 'make_diagnosis',
  REVISE: 'revise',
  CONFIRM: 'confirm'
}

export { ACTION_TYPES }

export function createTrace(sessionId, caseId) {
  return {
    sessionId,
    caseId,
    nodes: [],
    startedAt: new Date().toISOString(),
    completedAt: null
  }
}

export function recordAction(trace, stageId, actionType, description, data = null) {
  if (!trace || !Array.isArray(trace.nodes)) return trace

  trace.nodes.push({
    id: `node_${trace.nodes.length + 1}`,
    stage: stageId,
    action: actionType,
    description,
    data: data ? { ...data } : null,
    timestamp: new Date().toISOString()
  })

  return trace
}

export function getStageActions(trace, stageId) {
  if (!trace?.nodes) return []
  return trace.nodes.filter(n => n.stage === stageId)
}

export function getActionSummary(trace) {
  if (!trace?.nodes) return {}
  const summary = {}
  for (const node of trace.nodes) {
    if (!summary[node.action]) summary[node.action] = 0
    summary[node.action]++
  }
  return summary
}

export function generatePathJSON(trace) {
  if (!trace?.nodes) return { nodes: [], edges: [] }
  const nodes = trace.nodes.map((n, i) => ({
    id: n.id,
    label: n.description,
    stage: n.stage,
    action: n.action,
    timestamp: n.timestamp
  }))
  const edges = []
  for (let i = 0; i < nodes.length - 1; i++) {
    edges.push({ from: nodes[i].id, to: nodes[i + 1].id })
  }
  return { nodes, edges }
}

export function exportForComparison(trace, standardPath) {
  const student = generatePathJSON(trace)
  const diff = []
  if (standardPath?.nodes) {
    for (const sn of standardPath.nodes) {
      const found = student.nodes.find(n => n.label === sn.label && n.stage === sn.stage)
      diff.push({
        expected: sn.label,
        performed: !!found,
        stage: sn.stage
      })
    }
  }
  return {
    studentPath: student,
    standardPath: standardPath || { nodes: [], edges: [] },
    deviations: diff.filter(d => !d.performed)
  }
}
