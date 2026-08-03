// MDT 阶段3 — 专家端口抽象（调度与专家生成分离）
// 每个学科一个端口：独立人设 + 独立知识库 + 独立 LLM 调用。
// 对齐 DESIGN_01 第8章；useMDTDirector 负责调度，端口负责生成。
import { useAIChat } from '../useAIChat.js'

export function hasStage3(caseData) {
  return (caseData?.knowledgeBase?.disciplinePerspectives || []).some(p => p.expertKB)
}

export function buildExpertPorts(caseData) {
  const perspectives = caseData?.knowledgeBase?.disciplinePerspectives || []
  const ports = {}
  for (const p of perspectives) {
    if (!p?.dept) continue
    const port = {
      dept: p.dept,
      expertName: p.expertName || p.dept,
      expertTitle: p.expertTitle || `${p.dept}主任医师`,
      persona: p.persona || '',
      view: p.view || '',
      expertKB: p.expertKB || '',
    }
    port.call = async (ctx = {}, opts = {}) => {
      const { sendMessage } = useAIChat()
      const systemPrompt = buildExpertSystemPrompt(port, ctx)
      return sendMessage([], systemPrompt, { temperature: 0.7, maxTokens: 800, timeout: 45000, ...opts })
    }
    ports[p.dept] = port
  }
  return ports
}

function buildExpertSystemPrompt(port, ctx) {
  const cd = ctx.caseData || {}
  const pi = cd.patientInfo || {}
  const others = (cd.knowledgeBase?.disciplinePerspectives || []).filter(o => o.dept !== port.dept)
  const stageLabel = cd.stages?.[ctx.stageIdx] ?? `第${(ctx.stageIdx ?? 0) + 1}阶段`

  const roleSeg = `你是${port.expertName}（${port.expertTitle}）。${port.persona ? '性格特点：' + port.persona + '。' : ''}你在MDT会议中代表${port.dept}发言，以第一人称"我"自称。`

  const dataParts = []
  dataParts.push(`当前病例：${pi.name || '患者'}${pi.gender ? '，' + pi.gender : ''}${pi.age ? '，' + pi.age + '岁' : ''}。主诉：${pi.chiefComplaint || ''}`)
  if (cd.objective) dataParts.push(`核心议题：${cd.objective}`)
  if (port.view) dataParts.push(`你的学科立场：${port.view}`)
  if (port.expertKB) dataParts.push(`你的独立知识库（发言依据）：\n${port.expertKB}`)
  if (others.length) dataParts.push(`其他学科观点（供你回应）：${others.map(o => `【${o.dept}】${o.view}`).join('；')}`)

  const recent = (ctx.recentMessages || []).filter(m => m.type === 'expert').slice(-5)
    .map(m => `[${m.speaker}] ${(m.text || '').substring(0, 80)}`)
    .join('\n')
  if (recent) dataParts.push(`前面已发生的讨论：\n${recent}`)

  const instruct = [
    `当前阶段：${stageLabel}`,
    ctx.taskContext ? `当前等待学员完成任务：${ctx.taskContext.label}` : '',
    '请从你的学科视角就当前议题发表专业意见。要点：1) 结合你的知识库给出明确立场与依据；2) 如前面已有专家发言，可针对性回应或赞同；3) 与其他学科存在分歧时，明确说明你的理由；4) 回复150-250字，自然口语化，像真实专家在MDT会议中说话，不要用列表符号。',
  ].filter(Boolean).join('\n')

  return [roleSeg, dataParts.filter(Boolean).join('\n\n'), instruct].join('\n\n')
}

export { buildExpertSystemPrompt }
