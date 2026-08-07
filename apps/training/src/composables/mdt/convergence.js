// MDT 阶段3 — 分歧收敛（识别 → 二次讨论 → 归纳收敛）
// 任一环节 LLM 失败即降级：identify 失败由组件回退规则分歧语（buildDisagreementText），
// converge 失败回退 caseData.decision。不 throw。
import { useAIChat } from '../useAIChat.js'
import { buildExpertSystemPrompt } from './expertPorts.js'

function parseDisagreementJSON(text) {
  const match = (text || '').match(/\[[\s\S]*\]/)
  if (!match) return null
  let arr
  try { arr = JSON.parse(match[0]) } catch { return null }
  if (!Array.isArray(arr)) return null
  return arr.filter(d => d && d.a && d.b && d.issue)
}

// 1) 主持人识别分歧点 → [{a, b, issue}]
export async function identifyDisagreements(caseData, transcripts, studentRole) {
  const { sendMessage } = useAIChat()
  const lines = (transcripts || []).map(t => `【${t.speaker}】${t.text}`).join('\n')
  const sys = [
    '你是MDT会议主持人（主任医师），负责识别各学科专家发言中的核心分歧点。',
    `病例：${caseData?.patientInfo?.name || ''}，${caseData?.objective || ''}`,
    `专家发言记录：\n${lines || '（无）'}`,
    `学员角色：${studentRole || '主诊·管床·主任'}`,
    '请找出 1-3 个最实质的分歧点（两个学科间观点冲突）。只输出一个JSON数组，格式：[{"a":"学科A","b":"学科B","issue":"一句话描述分歧议题"}]，不要输出其他内容。a/b 必须是发言记录中出现的学科名。',
  ].join('\n\n')
  const result = await sendMessage([], sys, { temperature: 0.3, maxTokens: 500 })
  const disagreements = parseDisagreementJSON(result.content)
  return { ok: !!disagreements, disagreements: disagreements || [] }
}

// 2) 二次讨论：分歧双方针对对方观点再次发言（串行）
export async function secondRoundResponses(ports, disagreements, ctx) {
  const out = []
  for (const d of (disagreements || [])) {
    const portA = ports?.[d.a]
    const portB = ports?.[d.b]
    if (!portA && !portB) continue
    if (portA) {
      const text = await respondToOpponent(portA, d.b, d.issue, ctx)
      if (text) out.push({ speaker: d.a, text })
    }
    if (portB) {
      const text = await respondToOpponent(portB, d.a, d.issue, ctx)
      if (text) out.push({ speaker: d.b, text })
    }
  }
  return out
}

async function respondToOpponent(port, opponent, issue, ctx) {
  const { sendMessage } = useAIChat()
  const systemPrompt = buildExpertSystemPrompt(port, {
    ...ctx,
    recentMessages: ctx.recentMessages || [],
  })
  const instruct = [
    `刚才${opponent}专家的观点与本学科存在分歧，分歧议题：${issue}`,
    '请针对对方的观点进行回应：先承认或反驳其合理之处，再用你的知识库依据阐明你的立场，最后给出你的权衡建议。150-250字，自然口语化。',
  ].join('\n')
  const result = await sendMessage([], [systemPrompt, instruct].join('\n\n'), { temperature: 0.6, maxTokens: 700, timeout: 45000 })
  return result.ok ? result.content : ''
}

function buildDisagreementMsg(disagreements) {
  if (!disagreements?.length) return ''
  const items = disagreements.map((d, i) => `${i + 1}) ${d.a}与${d.b}就「${d.issue}」存在分歧`)
  return `各位专家，刚才的发言中主要分歧集中在：${items.join('；')}。请相关学科专家针对对方的观点再次说明你们的依据，帮助大家进一步权衡。`
}

// 4) 总编排：识别 → 二次讨论 → 收敛；任一步 LLM 失败即降级
// 识别失败返回 {ok:false}（组件回退规则分歧语 opening.disagreement）；
// 识别成功但无分歧仍收敛（无 reRound）；收敛失败回退 caseData.decision。
export async function convergeDisagreements(ctx) {
  const { caseData, ports, studentRole, transcripts } = ctx
  const idResult = await identifyDisagreements(caseData, transcripts, studentRole)
  if (!idResult.ok) return { ok: false }
  const disagreements = idResult.disagreements || []
  const reRound = disagreements.length ? await secondRoundResponses(ports, disagreements, ctx) : []
  const conv = await convergeToDraft(caseData, transcripts, reRound)
  return {
    ok: true,
    disagreementMsg: buildDisagreementMsg(disagreements),
    reRound,
    convergence: conv.text || caseData?.decision || '',
  }
}

// 3) 主持人归纳收敛 → 收敛语 + 决策草案
export async function convergeToDraft(caseData, transcripts, reRound) {
  const { sendMessage } = useAIChat()
  const first = (transcripts || []).map(t => `【${t.speaker}】${t.text}`).join('\n')
  const second = (reRound || []).map(t => `【${t.speaker}】${t.text}`).join('\n')
  const sys = [
    '你是MDT会议主持人（主任医师），负责在专家讨论后归纳共识、收敛分歧，形成决策方向。',
    `病例：${caseData?.patientInfo?.name || ''}，核心议题：${caseData?.objective || ''}`,
    `各学科主要发言：\n${first || '（无）'}`,
    `二次交锋发言：\n${second || '（无）'}`,
    '请输出你的收尾语：1) 归纳专家的共识点；2) 说明分歧的权衡方向（哪方面占主导、理由）；3) 提出一个明确的 MDT 决策方向。回复200字以内，口语化，以第一人称"我"主持。',
  ].join('\n\n')
  const result = await sendMessage([], sys, { temperature: 0.4, maxTokens: 800 })
  if (!result.ok || !result.content) return { ok: false, text: caseData?.decision || '' }
  return { ok: true, text: result.content }
}
