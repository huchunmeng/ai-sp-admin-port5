// MDT 编排器 — 阶段2 单智能体多角色（五层流水线）+ 阶段3 多智能体编排
// 活动感知 → 意图识别 → 上下文组装 → 回复策略 → 智能推荐
// 纯函数式：方法接收 ctx、返回结果文本，UI 渲染与状态持久化留在组件。
// 对齐 docs/MDT多学科讨论/DESIGN_01_MDT多学科讨论.md 第7/8节。
// 阶段3 专家生成抽象为 expertPorts（调度与专家生成分离，见 ./mdt/）。

import { ref } from 'vue'
import { useAIChat } from './useAIChat.js'
import { getRoleConfig } from './roleConfig.js'
import { buildExpertPorts, hasStage3 } from './mdt/expertPorts.js'
import { convergeDisagreements } from './mdt/convergence.js'

// ── MDT 插话意图体系（设计 7.3）──
// challenge 排前：含"如果…怎么办"等风险探讨优先按批判性训练点处理
const MDT_INTENT_KEYWORDS = {
  challenge: [
    '但是', '可是', '不过', '如果', '万一', '会不会', '风险', '弊端',
    '问题在于', '我质疑', '难道', '值得商榷', '有把握吗', '副作用', '并发症',
    '不认同', '不同意', '担心',
  ],
  question: [
    '是什么', '为什么', '什么', '标准', '方案', '指南', '依据', '机制',
    '适应症', '禁忌', '剂量', '定义', '区别', '疗效', '预后', '怎么办',
    '如何', '应该', '原则', '条件',
  ],
  supplement: [
    '补充', '另外', '此外', '我认为还', '还应该', '再加上', '别忘了',
    '我建议', '建议', '提醒', '强调', '还要考虑',
  ],
  clarification: [
    '您说的', '你说的', '具体指', '什么意思', '能再解释', '不太明白',
    '详细讲', '指什么', '麻烦解释', '展开说说', '哪个是',
  ],
  casual: [
    '谢谢', '感谢', '好的', '收到', '嗯', '明白', '再见', '辛苦了',
    '了解', '知道了', '哦',
  ],
}

function classifyIntent(userMessage) {
  const q = (userMessage || '').toLowerCase()
  const results = []
  for (const [intent, keywords] of Object.entries(MDT_INTENT_KEYWORDS)) {
    let score = 0
    for (const kw of keywords) {
      if (q.includes(kw)) score += 1
    }
    if (score > 0) {
      results.push({ intent, score, confidence: Math.min(score / 3, 1.0) })
    }
  }
  results.sort((a, b) => b.score - a.score)
  return {
    primaryIntent: results.length > 0 ? results[0].intent : 'question',
    allIntents: results,
    confidence: results.length > 0 ? results[0].confidence : 0.5,
    needsLLMFallback: results.length === 0 || (results.length > 0 && results[0].confidence < 0.4),
  }
}

// ── 回复策略（设计 7.6）──
const STRATEGY_MAP = {
  question: { temperature: 0.6, maxTokens: 900 },
  challenge: { temperature: 0.5, maxTokens: 1100 },
  supplement: { temperature: 0.6, maxTokens: 800 },
  clarification: { temperature: 0.5, maxTokens: 600 },
  casual: { temperature: 0.7, maxTokens: 200 },
}

function selectMDTStrategy(intent) {
  return STRATEGY_MAP[intent] || STRATEGY_MAP.question
}

// ── 分歧收敛（设计 7.5 简版）──
function buildDisagreementText(caseData, studentRole) {
  const perspectives = caseData?.knowledgeBase?.disciplinePerspectives || []
  if (perspectives.length < 2) return ''
  const views = perspectives.map(p => `【${p.dept}】${p.view.replace(/[。.!?]+$/, '')}`)
  const guide = {
    observer: '请学员旁听并思考：结合各方依据，你倾向哪一方，为什么？',
    attending: '请主诊医师综合各方意见权衡利弊，确定最终策略方向。',
  }[studentRole] || '请学员权衡各学科意见，发表你的观点。'
  return `综合各位意见，目前分歧集中在：${views.join('；')}。我们进入讨论环节，${guide}`
}

// ── 阶段开头引导（advanceStage 注入部分，纯同步）──
// 返回 { disagreement, callout }：
//   disagreement — 分歧收敛语（渲染为普通 host 消息）
//   callout      — 角色引导语（attending 渲染为普通 host 消息）
function getStageOpening(caseData, studentRole, stageIdx) {
  if (!caseData) return { disagreement: '', callout: '' }
  const agenda = caseData.agenda || []
  const tasks = caseData.tasks || []
  const stageHasDecision = agenda.some(e => {
    if (e.phase !== stageIdx || !e.nextTask) return false
    return tasks.some(t => t.key === e.nextTask && t.assess === 'plan')
  })
  const disagreement = stageHasDecision ? buildDisagreementText(caseData, studentRole) : ''
  const rs = caseData.roleScripts?.[studentRole]
  const stageLabel = (caseData.stages || [])[stageIdx] || `第${stageIdx + 1}阶段`
  let callout = ''
  if (studentRole === 'attending') {
    callout = rs?.promptTemplates?.[stageIdx] || `作为主诊医师，请组织本环节讨论并发表你的观点。`
  }
  return { disagreement, callout }
}

// ── 会诊前发起（DESIGN_02 §4.2）──
// 全部纯数据驱动、不调 LLM：情境卡片/申请表预填/审批规则/资料包，沿用 buildCaseReport 的缺字段降级模式
function buildMdtContext(cd) {
  if (!cd) return ''
  const pi = cd.patientInfo || {}
  const admission = cd.admissionContext || {}
  const trigger = cd.trigger || {}
  const priorCourse = admission.priorCourse
    || (pi.presentIllness ? `${pi.presentIllness.substring(0, 120)}…` : '患者入院后多学科评估，科室内部处理困难')
  const dayPrefix = admission.daysHospitalized ? `入院第 ${admission.daysHospitalized} 天，` : ''
  const triggerReason = trigger.reason || cd.objective || (typeof (cd.keyQuestions?.[0]) === 'string' ? cd.keyQuestions[0] : cd.keyQuestions?.[0]?.text) || '多学科协作诊疗'
  const inviteList = (cd.inviteCandidates?.length ? cd.inviteCandidates : (cd.disciplines || [])).join('、')
  return [
    '【会诊前情境】',
    `· 住院经过：${dayPrefix}${priorCourse}`,
    `· 触发原因：${triggerReason}`,
    inviteList ? `· 拟邀请科室：${inviteList}` : '',
  ].filter(Boolean).join('\n')
}

function buildApplicationDraft(cd) {
  const pi = cd.patientInfo || {}
  const kqs = cd.keyQuestions || []
  const questions = (kqs.length
    ? kqs.map(q => (typeof q === 'string' ? q : q.text)).filter(Boolean)
    : (cd.objective ? [cd.objective] : [])).join('\n')
  const summary = [pi.chiefComplaint, pi.presentIllness, pi.labTests, pi.imagingText]
    .filter(Boolean).join('；')
  const candidates = cd.inviteCandidates?.length ? cd.inviteCandidates : (cd.disciplines || [])
  return { questions, summary, candidates }
}

function assessPreMeetingApproval(cd, form) {
  const missing = []
  const depts = form?.depts || []
  if (!form?.questions?.trim()) missing.push('需讨论的问题')
  if (!form?.summary?.trim()) missing.push('病情摘要')
  if (depts.length < 2) missing.push('拟邀请科室至少 2 个')
  const crossDept = (cd.disciplines?.length || cd.inviteCandidates?.length || 0) >= 2
  if (!crossDept) missing.push('跨学科会诊需求')
  return { ok: missing.length === 0, missing }
}

function buildApprovalMessage({ pass, missing, depts }) {
  if (pass) {
    return `医务科审核通过：会诊申请资料齐全，涉及 ${(depts || []).length} 个学科，符合跨科会诊条件。请核对预发资料包，确认后进入会诊。`
  }
  return `医务科审核未通过，请补充：${(missing || []).join('、')}。请修改申请表后重新提交。`
}

function buildPreMeetingMaterial(cd) {
  const pi = cd.patientInfo || {}
  const views = cd.knowledgeBase?.disciplinePerspectives || []
  const findView = kw => views.find(p => p.dept && p.dept.includes(kw))?.view || ''
  return {
    imaging: pi.imagingText || findView('影像') || '影像资料详见病例影像报告',
    pathology: findView('病理') || '病理报告待出（病理科已纳入会诊，资料将于会诊前补发）',
    lab: pi.labTests || '检验结果详见病例实验室检查',
  }
}

// ── 插话三段式 Prompt（设计 7.4）──
function buildInterruptSystemPrompt(ctx, msg, intent) {
  const cd = ctx.caseData || {}
  const kb = cd.knowledgeBase || {}
  const perspectives = kb.disciplinePerspectives || []
  const speaker = ctx.speakerKey === 'host' ? '主持人' : ctx.speakerKey
  const role = getRoleConfig(ctx.studentRole)

  const roleSeg = speaker === '主持人'
    ? '你是MDT会议主持人（主任医师），负责调度各学科意见、推动讨论达成共识，维护会议节奏。以第一人称"我"自称。'
    : `你是MDT会议中的${speaker}主任医师，代表${speaker}在MDT会议中发言。以第一人称"我"自称。`

  const dataParts = []
  const pi = cd.patientInfo || {}
  dataParts.push(`当前病例：${pi.name || '患者'}${pi.gender ? '，' + pi.gender : ''}${pi.age ? '，' + pi.age + '岁' : ''}。主诉：${pi.chiefComplaint || ''}`)
  if (cd.objective) dataParts.push(`核心议题：${cd.objective}`)
  const persp = perspectives.find(p => p.dept === speaker)
  if (persp?.view) dataParts.push(`你的学科观点：${persp.view}`)
  const others = perspectives.filter(p => p.dept !== speaker)
  if (others.length) dataParts.push(`其他学科观点（供你回应）：${others.map(o => `【${o.dept}】${o.view}`).join('；')}`)
  dataParts.push(`学员身份：${role.label}（${role.desc}）`)
  dataParts.push(ctx.taskContext
    ? `当前等待学员完成任务：${ctx.taskContext.label}（任务key: ${ctx.taskContext.key}）`
    : '当前为自由发言环节，学员可随时提问或发表观点')
  const recent = (ctx.recentMessages || []).slice(-5)
    .map(m => (m.type === 'expert' ? `[${m.speaker}]` : '[你]') + ` ${(m.text || '').substring(0, 60)}`)
    .join('\n')
  if (recent) dataParts.push(`已发生的讨论：\n${recent}`)

  const stageLabel = cd.stages?.[ctx.currentStage] || `第${(ctx.currentStage ?? 0) + 1}阶段`
  const gentle = role.feedbackMode === 'gentle'
  const intentInstr = {
    question: '学员提出专业问题，请从你的学科视角清晰讲解，引用你的学科观点作为依据；可结合当前病例举例。',
    challenge: '学员提出质疑或相反观点，请认真对待：先承认其合理之处，再说明你的依据与局限，引导学员权衡分歧（这是批判性思维训练点，避免含糊带过）。',
    supplement: '学员补充了观点，请先肯定其补充价值，再结合你的学科知识展开关联要点，并指出可能的边界或注意事项。',
    clarification: '学员请求澄清概念或术语，请用口语化方式解释清楚，可举例说明，帮助学员理解。',
    casual: '这是客套或简短回应，请同样简短回应一句即可，然后回归当前议程，不要展开长篇。',
  }[intent.primaryIntent]
  const toneInstr = gentle
    ? '反馈语气：以引导性为主——先肯定可取之处，再指出需补充的角度，最后用一个问题反问引导学员思考。'
    : '反馈语气：你是主诊医师级专家，可更直接地点评并给出专业建议，不必刻意委婉。'
  const instruct = [
    `当前阶段：${stageLabel}`,
    `学员刚说：${msg}`,
    `请从你的视角回应学员。要点：1) ${intentInstr}；2) 如与其他学科存在分歧，明确说明你的立场和理由；3) ${toneInstr}；4) 回复200字以内，自然口语化，像真人专家在会议中说话。`,
  ].join('\n')

  return [roleSeg, dataParts.join('\n'), instruct].join('\n\n')
}

// ── 任务过程反馈 Prompt（设计 9.3）──
function buildTaskFeedbackPrompt(ctx, taskKey) {
  const cd = ctx.caseData || {}
  const task = ctx.task || (cd.tasks || []).find(t => t.key === taskKey)
  const role = getRoleConfig(ctx.studentRole)
  const value = ctx.taskValue
  const valueText = Array.isArray(value)
    ? value.join('、')
    : String(value == null ? '' : value)
  const fb = task?.feedback || {}
  const standard = [...(fb.hits || []), ...(fb.misses || [])]
    .map(f => `${f.icon || '•'} ${f.point}`).join('\n')
  const isPlan = task?.assess === 'plan' || taskKey === 'plan01'
  const decisionAnchor = isPlan && cd.decision ? `\nMDT一致决策（供对照）：${cd.decision}` : ''
  const gentle = role.feedbackMode === 'gentle'
  return [
    '你是MDT会议主持人（主任医师），负责点评学员的作答并引导其对照MDT共识改进。以第一人称"我"自称。',
    `当前病例：${cd.patientInfo?.name || ''}，${cd.patientInfo?.chiefComplaint || ''}。核心议题：${cd.objective || ''}`,
    `任务：${task?.label || taskKey}`,
    `任务要求：${task?.prompt || ''}`,
    `学员作答：\n${valueText || '（未填写）'}`,
    `MDT标准要点：\n${standard || '（无固定要点）'}${decisionAnchor}`,
    gentle
      ? '请以引导性语气点评学员作答：先指出做得好的地方，再点出与MDT标准要点的差距，最后用一句话引导学员改进。回复200字以内，对不上也没关系，重在思考过程。'
      : '请以专家点评语气评估学员作答：明确指出与MDT共识的差异与遗漏，给出具体改进建议。回复200字以内。',
  ].join('\n\n')
}

// ── 能力画像 LLM 评估 Prompt（设计 7.7）──
const PORTRAIT_DIMS = ['批判性思维', '循证决策能力', '反思深度']

function buildPortraitPrompt(ctx) {
  const cd = ctx.caseData || {}
  const studentMsgs = (ctx.studentMessages || []).map(m => m.text).join('\n').substring(0, 800)
  const reflect = ctx.taskValues?.reflect01 || ''
  const plan = ctx.taskValues?.plan01 || ''
  const attendingView = ctx.taskValues?.attendingView01 || ''
  return [
    '你是MDT训练的评价专家。基于学员在整个MDT多学科讨论中的表现，对其能力进行画像评估。',
    `病例：${cd.patientInfo?.name || ''}，核心议题：${cd.objective || ''}`,
    `学员角色：${getRoleConfig(ctx.studentRole).label}`,
    `学员发言记录：\n${studentMsgs || '（无）'}`,
    `学员专科意见后的主诊医师意见：\n${attendingView || '（未填写）'}`,
    `学员反思总结：\n${reflect || '（未填写）'}`,
    `学员方案：\n${plan || '（未填写）'}`,
    `请按以下三个维度评估（0-100分）并各给一句评价：
1. 批判性思维：发言中是否提出有价值的质疑、补充或不同视角
2. 循证决策能力：方案与发言是否引用指南、文献或循证依据
3. 反思深度：反思是否触及认知改变、遗留困惑与改进方向
只输出一个JSON数组，格式：[{"dim":"批判性思维","score":85,"note":"一句话评价"}]，不要输出其他内容。`,
  ].join('\n\n')
}

function parsePortraitJSON(text) {
  const match = (text || '').match(/\[[\s\S]*\]/)
  if (!match) return null
  let arr
  try { arr = JSON.parse(match[0]) } catch { return null }
  if (!Array.isArray(arr)) return null
  return PORTRAIT_DIMS.map((dim) => {
    const found = arr.find(a => a?.dim === dim)
    return {
      dim,
      score: typeof found?.score === 'number' ? Math.max(0, Math.min(100, Math.round(found.score))) : null,
      note: typeof found?.note === 'string' && found.note ? found.note : '待AI评估',
    }
  })
}

// ── 主入口 hook ──
export function useMDTDirector() {
  const { sendMessage, loading: directorLoading } = useAIChat()

  async function onStudentInterrupt(ctx, msg) {
    if (!msg || directorLoading.value) return { ok: false, text: '', intent: 'question' }
    const intent = classifyIntent(msg)
    const systemPrompt = buildInterruptSystemPrompt(ctx, msg, intent)
    const strategy = selectMDTStrategy(intent.primaryIntent)
    const result = await sendMessage([{ role: 'user', content: msg }], systemPrompt, strategy)
    return { ok: result.ok, text: result.content, intent: intent.primaryIntent }
  }

  async function onTaskSubmit(ctx, taskKey) {
    if (directorLoading.value) return { ok: false, text: '' }
    const systemPrompt = buildTaskFeedbackPrompt(ctx, taskKey)
    const result = await sendMessage(
      [{ role: 'user', content: `请点评学员对「${taskKey}」任务的作答。` }],
      systemPrompt,
      { temperature: 0.5, maxTokens: 600 },
    )
    return { ok: result.ok, text: result.content }
  }

  async function assessPortrait(ctx) {
    if (directorLoading.value) return null
    const systemPrompt = buildPortraitPrompt(ctx)
    const result = await sendMessage(
      [{ role: 'user', content: '请输出能力画像评估JSON。' }],
      systemPrompt,
      { temperature: 0.3, maxTokens: 800 },
    )
    if (!result.ok) return null
    return parsePortraitJSON(result.content)
  }

  // ── 阶段3：专家动态发言（独立端口 LLM 调用，失败回退剧本文本/学科观点）──
  async function speakAsExpert(ctx) {
    const { caseData, speaker, entry } = ctx
    const ports = ctx.ports || (caseData ? buildExpertPorts(caseData) : null)
    const port = ports?.[speaker]
    if (!port) return { ok: false, text: entry?.text || '' }
    const result = await port.call(ctx)
    if (result.ok && result.content) return { ok: true, text: result.content }
    return { ok: false, text: entry?.text || port.view || '' }
  }

  return {
    classifyIntent,
    selectMDTStrategy,
    getStageOpening,
    buildDisagreementText,
    buildMdtContext,
    buildApplicationDraft,
    assessPreMeetingApproval,
    buildApprovalMessage,
    buildPreMeetingMaterial,
    onStudentInterrupt,
    onTaskSubmit,
    assessPortrait,
    speakAsExpert,
    buildExpertPorts,
    hasStage3,
    convergeDisagreements,
    directorLoading,
  }
}
