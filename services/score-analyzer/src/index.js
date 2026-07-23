import { readFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { callLLM } from './llm-client.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROMPTS_DIR = resolve(__dirname, 'prompts')

function loadPrompt(name) {
  return readFileSync(resolve(PROMPTS_DIR, name), 'utf-8')
}

/**
 * 将对话记录数组格式化为分析用文本
 * @param {Array} records - [{sequence, speaker, content, type?}]
 * @returns {string}
 */
function formatDialogRecords(records) {
  if (!records || !records.length) return '（无对话记录）'

  const speakerLabels = { doctor: '学员', patient: '患者', system: '系统', user: '学员', sp: '患者', assistant: 'AI' }
  return records
    .map((r, idx) => {
      const speaker = r.speaker || r.role || ''
      const label = speakerLabels[speaker] || speaker
      const typeTag = r.type ? ` [${r.type}]` : ''
      const seq = r.sequence ?? (idx + 1)
      return `[第${seq}轮] ${label}${typeTag}: ${r.content}`
    })
    .join('\n\n')
}

/**
 * 将体格检查操作记录格式化为结构化检查日志
 * @param {Array} records - [{sequence, speaker, content}]
 * @returns {string}
 */
function formatExamRecords(records) {
  if (!records || !records.length) return '（无检查记录）'

  const lines = ['## 体格检查操作记录']
  let lastDoctor = ''
  for (const r of records) {
    const speaker = r.speaker || r.role || ''
    if (speaker === 'doctor' || speaker === 'user') {
      lastDoctor = r.content
    } else {
      const cmd = lastDoctor ? `"${lastDoctor}" → ` : ''
      lines.push(`- ${cmd}${r.content}`)
      lastDoctor = ''
    }
  }
  return lines.join('\n')
}

/**
 * 将病例信息格式化为分析用文本
 * @param {object} caseInfo - 病例信息对象
 * @returns {string}
 */
function formatCaseInfo(caseInfo) {
  if (!caseInfo) return '（无病例信息）'

  const lines = []
  const patient = caseInfo.patient || caseInfo.patient_info || {}

  if (patient.name) lines.push(`患者姓名: ${patient.name}`)
  if (patient.age) lines.push(`年龄: ${patient.age}`)
  if (patient.sex) lines.push(`性别: ${patient.sex}`)
  if (caseInfo.chief_complaint || patient.chief_complaint) {
    lines.push(`主诉: ${caseInfo.chief_complaint || patient.chief_complaint}`)
  }
  if (caseInfo.title || caseInfo.disease) {
    lines.push(`诊断/病种: ${caseInfo.title || caseInfo.disease}`)
  }
  if (caseInfo.specialty) lines.push(`专业: ${caseInfo.specialty}`)
  if (caseInfo.full_text) {
    lines.push(`\n病例全文:\n${caseInfo.full_text}`)
  } else if (caseInfo.present_illness || caseInfo.history_of_present_illness) {
    lines.push(`\n现病史:\n${caseInfo.present_illness || caseInfo.history_of_present_illness}`)
    if (caseInfo.past_history) lines.push(`\n既往史:\n${caseInfo.past_history}`)
    if (caseInfo.personal_history) lines.push(`\n个人史:\n${caseInfo.personal_history}`)
    if (caseInfo.family_history) lines.push(`\n家族史:\n${caseInfo.family_history}`)
  }

  return lines.join('\n') || '（病例信息不完整）'
}

/**
 * 将评分表数据格式化为参考文本
 * @param {object} scoring - 评分表数据
 * @returns {string}
 */
function formatScoreSheet(scoring) {
  if (!scoring) return '（无评分表）'

  const lines = []
  const categories = scoring.categories || []

  for (const cat of categories) {
    lines.push(`\n【${cat.name}】`)
    const items = cat.items || []
    for (const item of items) {
      const score = `${item.awarded_score ?? '?'}/${item.max_score ?? '?'}`
      const evidence = item.evidence ? ` — ${item.evidence}` : ''
      lines.push(`  ${item.name}: ${score}${evidence}`)
    }
  }

  if (scoring.total_score !== undefined) {
    lines.push(`\n总分: ${scoring.total_score}/${scoring.total_max || '?'}`)
  }

  return lines.join('\n') || '（评分表为空）'
}

/**
 * Part B 单剖面分析 — 病史采集
 * @param {object} params
 * @param {Array}  params.records - 对话记录 [{sequence, speaker, content, type?}]
 * @param {object} params.caseInfo - 病例信息
 * @param {object} [params.scoring] - 评分表数据（可选）
 * @param {object} llmConfig - {apiUrl, apiKey, model}
 * @returns {Promise<object>} 结构化剖面分析报告
 */
export async function analyzeHistoryTaking(params, llmConfig) {
  const { records, caseInfo, scoring } = params

  if (!records || !records.length) {
    throw new Error('缺少对话记录：Part B分析至少需要1条对话记录')
  }
  if (!caseInfo) {
    throw new Error('缺少病例信息：Part B分析需要病例原文作为参照')
  }

  const promptTemplate = loadPrompt('partb-history-taking.txt')
  const prompt = promptTemplate
    .replace('{{CASE_INFO}}', formatCaseInfo(caseInfo))
    .replace('{{DIALOG_RECORDS}}', formatDialogRecords(records))
    .replace('{{SCORE_SHEET}}', formatScoreSheet(scoring))


  return callLLM(prompt, llmConfig.apiUrl, llmConfig.apiKey, llmConfig.model)
}

/**
 * 根据剖面类型调度分析
 * @param {object} params
 * @param {string} params.profileType - 剖面类型：history_taking | physical_exam | communication | case_analysis | medical_record | mental_exam
 * @param {Array}  params.records - 对话/操作记录
 * @param {object} params.caseInfo - 病例信息
 * @param {object} [params.scoring] - 评分表数据
 * @param {object} llmConfig - LLM配置
 * @returns {Promise<object>}
 */
export async function analyzeProfile(params, llmConfig) {
  const { profileType } = params

  switch (profileType) {
    case 'history_taking':
      return analyzeHistoryTaking(params, llmConfig)
    case 'physical_exam':
      return analyzePhysicalExamProfile(params, llmConfig)
    case 'communication':
      return analyzeHumanisticCommProfile(params, llmConfig)
    case 'case_analysis':
      return analyzeCaseAnalysisProfile(params, llmConfig)
    case 'medical_record':
      return analyzeMedicalRecordProfile(params, llmConfig)
    case 'mental_exam':
      return analyzeMentalExamProfile(params, llmConfig)
    default:
      throw new Error(`未知的剖面类型: ${profileType}`)
  }
}

/**
 * 将解析后的评分表格式化为 LLM prompt 文本
 * @param {Array} parsedSheet - parseScoreSheet() 的输出 [{ category, item, score, sub_items: [{ point, score, rules }] }]
 * @returns {string}
 */
export function formatParsedScoreSheet(parsedSheet) {
  if (!parsedSheet || !parsedSheet.length) return '（无评分表）'

  // 展平：当前端传入 [{ templateCode, templateName, items: [...] }] 包装格式时，
  // 取 entry.items 内的实际评分项；否则直接使用 entry 本身
  const flatItems = []
  for (const entry of parsedSheet) {
    if (entry.items && Array.isArray(entry.items) && entry.items.length > 0) {
      flatItems.push(...entry.items)
    } else if (entry.category || entry.item) {
      flatItems.push(entry)
    }
  }
  if (!flatItems.length) return '（无评分表）'

  const lines = []
  lines.push(`> 模板: ${parsedSheet.map(e => e.templateName || e.templateCode).filter(Boolean).join(', ') || '未知'}`)
  let idx = 1
  for (const entry of flatItems) {
    lines.push(`\n### ${idx}. [${entry.category}] ${entry.item}（满分${entry.max_score ?? entry.score ?? '?'}分）`)
    if (entry.sub_items && entry.sub_items.length) {
      for (const sub of entry.sub_items) {
        const subScore = sub.max_score ?? sub.score ?? '?'
        lines.push(`  - ${sub.point}（${subScore}分）${sub.rules ? ` 指引: ${sub.rules}` : ''}`)
      }
    } else {
      lines.push(`  （无细分评分点）`)
    }
    idx++
  }
  return lines.join('\n')
}

/**
 * 将统一格式的所有记录格式化为 LLM 提示词文本
 * @param {object} allRecords - { dialog?, exam?, qa?, freeText? }
 * @returns {string}
 */
function formatAllRecords(allRecords) {
  if (!allRecords) return '（无考核记录）'
  const parts = []

  // 对话类记录 — 兼容 speaker（旧格式）和 role（training session 格式）
  const dialog = allRecords.dialog || allRecords.records || []
  if (dialog.length) {
    const speakerLabels = { doctor: '学员', patient: '患者', system: '系统', user: '学员', sp: '患者', assistant: 'AI' }
    parts.push('## 对话记录\n')
    let seqIdx = 0
    for (const r of dialog) {
      const speaker = r.speaker || r.role || ''
      const label = speakerLabels[speaker] || speaker
      const typeTag = r.type ? ` [${r.type}]` : ''
      const seq = r.sequence ?? (++seqIdx)
      parts.push(`[第${seq}轮] ${label}${typeTag}: ${r.content}`)
    }
    parts.push('')
  }

  // 体格检查操作 — 兼容 speaker/role
  const exam = allRecords.exam || []
  if (exam.length) {
    parts.push('## 体格检查操作记录\n')
    let lastDoctor = ''
    for (const r of exam) {
      const speaker = r.speaker || r.role || ''
      if (speaker === 'doctor' || speaker === 'user') {
        lastDoctor = r.content
      } else {
        const cmd = lastDoctor ? `"${lastDoctor}" → ` : ''
        parts.push(`- ${cmd}${r.content}`)
        lastDoctor = ''
      }
    }
    parts.push('')
  }

  // 病例分析问答
  const qa = allRecords.qa || []
  if (qa.length) {
    parts.push('## 病例分析问答\n')
    for (const item of qa) {
      parts.push(`问题: ${item.question}`)
      parts.push(`回答: ${item.answer}`)
      parts.push('')
    }
  }

  // 自由文本（诊断、治疗、病历）
  const freeText = allRecords.freeText || []
  if (freeText.length) {
    parts.push('## 学员撰写文本\n')
    for (const ft of freeText) {
      parts.push(`### ${ft.label}`)
      parts.push(ft.content)
      parts.push('')
    }
  }

  return parts.join('\n') || '（无考核记录）'
}

/**
 * 将旧格式 records 转换为统一格式
 */
function normalizeRecords(params) {
  // 已有 allRecords 直接使用
  if (params.allRecords) return params.allRecords

  // 旧格式：单一 records 数组
  if (params.records?.length) {
    const isExam = params.stationType === 'physicalExam'
    if (isExam) return { exam: params.records }
    return { dialog: params.records }
  }

  return {}
}

/**
 * Part B 评分 — 基于解析评分表+学员记录进行逐项打分
 * 支持统一记录格式（allRecords）和旧格式（records+stationType）
 *
 * @param {object} params
 * @param {Array}  params.parsedSheet - 解析后的评分表
 * @param {object} [params.allRecords] - 统一格式的所有记录 { dialog, exam, qa, freeText }
 * @param {Array}  [params.records] - (旧格式) 单一记录数组
 * @param {string} [params.stationType] - (旧格式) 考站类型
 * @param {object} params.caseInfo - 病例信息
 * @param {object} llmConfig - {apiUrl, apiKey, model}
 * @returns {Promise<object>} 包含 scored_items 的评分结果
 */
export async function scoreSession(params, llmConfig) {
  const { parsedSheet, caseInfo } = params

  if (!parsedSheet || !parsedSheet.length) {
    throw new Error('缺少评分表：需要解析后的评分表')
  }

  const allRecords = normalizeRecords(params)

  // 检查是否有任何记录
  const hasRecords = (
    (allRecords.dialog || []).length > 0 ||
    (allRecords.exam || []).length > 0 ||
    (allRecords.qa || []).length > 0 ||
    (allRecords.freeText || []).length > 0
  )
  if (!hasRecords) {
    throw new Error('缺少学员记录：至少需要一种类型的记录')
  }

  const allRecordsText = formatAllRecords(allRecords)
  const prompt = loadPrompt('score-unified.txt')
    .replace('{{SCORE_SHEET}}', formatParsedScoreSheet(parsedSheet))
    .replace('{{ALL_RECORDS}}', allRecordsText)
    .replace('{{CASE_CONTEXT}}', formatCaseInfo(caseInfo))


  return callLLM(prompt, llmConfig.apiUrl, llmConfig.apiKey, llmConfig.model)
}

// ═══════════════════════════════════════════════
// Part B 剖面分析 — L1 信息覆盖分析
// ═══════════════════════════════════════════════

/** 从 L1 覆盖结果构建紧凑摘要，供 L2/L3 使用 */
function buildL1Summary(coverage) {
  if (!coverage) return '（L1分析未完成）'
  const missedHigh = coverage.missed_high_importance || []
  const summary = [
    `覆盖率: ${Math.round((coverage.coverage_rate || 0) * 100)}%（${coverage.covered || 0}覆盖/${coverage.partial || 0}部分/${coverage.missed || 0}遗漏）`,
    missedHigh.length > 0 ? `高重要性遗漏: ${missedHigh.join('、')}` : '无高重要性遗漏',
    coverage.narrative || ''
  ]
  return summary.join('\n')
}

/** 从 L2 策略结果构建紧凑摘要，供 L3 使用 */
function buildL2Summary(strategy) {
  if (!strategy) return '（L2分析未完成）'
  const typeLabel = { hypothesis_driven: '假设驱动型', template_driven: '模板覆盖型', random_jumping: '随机跳跃型' }
  return [
    `策略类型: ${typeLabel[strategy.type] || strategy.type} (置信度: ${strategy.confidence})`,
    `追问深度: ${strategy.characteristics?.follow_up_depth || '未知'}，序列逻辑: ${strategy.characteristics?.sequence_logic || '未知'}`,
    strategy.narrative || ''
  ].join('\n')
}

/** 从 L3 认知结果构建紧凑摘要，供 L4/L5 使用 */
function buildL3Summary(hypothesisActivity) {
  if (!hypothesisActivity) return '（L3分析未完成）'
  const biases = (hypothesisActivity.cognitive_biases || []).map(b => `${b.type}(${b.severity})`).join('、')
  return [
    `推理模式: ${hypothesisActivity.reasoning_mode || '未知'}`,
    `过早关闭: ${hypothesisActivity.premature_closure ? '是' : '否'}`,
    biases ? `认知偏误: ${biases}` : '未检测到明显偏误',
    hypothesisActivity.narrative || ''
  ].join('\n')
}

const PROFILE_TYPE_LABELS = {
  history_taking: '病史采集',
  physical_exam: '体格检查',
  communication: '人文沟通',
  mental_exam: '精神检查',
  case_analysis: '病例分析',
  medical_record: '病历书写'
}

/**
 * L4 安全行为分析 — 通用，按剖面类型调整分析焦点
 */
async function analyzeSafety(formattedRecords, l1Summary, l2Summary, l3Summary, profileType, llmConfig) {
  const promptTemplate = loadPrompt('partb-l4-safety.txt')
  const prompt = promptTemplate
    .replace('{{PROFILE_TYPE}}', PROFILE_TYPE_LABELS[profileType] || profileType)
    .replace('{{RECORDS}}', formattedRecords)
    .replace('{{L1_SUMMARY}}', buildL1Summary(l1Summary))
    .replace('{{L2_SUMMARY}}', buildL2Summary(l2Summary))
    .replace('{{L3_SUMMARY}}', buildL3Summary(l3Summary))


  return callLLM(prompt, llmConfig.apiUrl, llmConfig.apiKey, llmConfig.model)
}

/**
 * L5 关系质量分析 — 通用，仅对话类剖面
 */
async function analyzeRelationship(formattedDialogRecords, l1Summary, l2Summary, l3Summary, profileType, llmConfig) {
  const promptTemplate = loadPrompt('partb-l5-relationship.txt')
  const prompt = promptTemplate
    .replace('{{PROFILE_TYPE}}', PROFILE_TYPE_LABELS[profileType] || profileType)
    .replace('{{DIALOG_RECORDS}}', formattedDialogRecords)
    .replace('{{L1_SUMMARY}}', buildL1Summary(l1Summary))
    .replace('{{L2_SUMMARY}}', buildL2Summary(l2Summary))
    .replace('{{L3_SUMMARY}}', buildL3Summary(l3Summary))


  return callLLM(prompt, llmConfig.apiUrl, llmConfig.apiKey, llmConfig.model)
}

/**
 * L1 信息覆盖分析 — 对话记录 vs 病例原文，逐项对照
 */
export async function analyzeCoverage(caseInfo, dialogRecords, llmConfig) {
  const promptTemplate = loadPrompt('partb-l1-coverage.txt')
  const prompt = promptTemplate
    .replace('{{CASE_INFO}}', typeof caseInfo === 'string' ? caseInfo : formatCaseInfo(caseInfo))
    .replace('{{DIALOG_RECORDS}}', Array.isArray(dialogRecords) ? formatDialogRecords(dialogRecords) : (dialogRecords || ''))


  return callLLM(prompt, llmConfig.apiUrl, llmConfig.apiKey, llmConfig.model)
}

/**
 * L2 行为策略分析 — 识别问诊组织模式
 */
export async function analyzeStrategy(dialogRecords, l1Summary, llmConfig) {
  const promptTemplate = loadPrompt('partb-l2-strategy.txt')
  const prompt = promptTemplate
    .replace('{{DIALOG_RECORDS}}', Array.isArray(dialogRecords) ? formatDialogRecords(dialogRecords) : (dialogRecords || ''))
    .replace('{{L1_SUMMARY}}', buildL1Summary(l1Summary))


  return callLLM(prompt, llmConfig.apiUrl, llmConfig.apiKey, llmConfig.model)
}

/**
 * L3 认知过程还原 — 从提问序列反推假设活动
 */
export async function analyzeCognition(dialogRecords, l1Summary, l2Summary, llmConfig) {
  const promptTemplate = loadPrompt('partb-l3-cognition.txt')
  const prompt = promptTemplate
    .replace('{{DIALOG_RECORDS}}', Array.isArray(dialogRecords) ? formatDialogRecords(dialogRecords) : (dialogRecords || ''))
    .replace('{{L1_SUMMARY}}', buildL1Summary(l1Summary))
    .replace('{{L2_SUMMARY}}', buildL2Summary(l2Summary))


  return callLLM(prompt, llmConfig.apiUrl, llmConfig.apiKey, llmConfig.model)
}

/**
 * Part B 病史采集剖面统一分析 — L1 先跑 → L2/L3 并行
 *
 * @param {object} params
 * @param {object} params.caseInfo - 病例信息
 * @param {Array}  params.dialogRecords - 对话记录
 * @param {object} llmConfig - {apiUrl, apiKey, model}
 * @returns {Promise<{profile_type, coverage, strategy, hypothesis_activity}>}
 */
export async function analyzeHistoryTakingProfile(params, llmConfig) {
  const { caseInfo, dialogRecords } = params

  if (!dialogRecords || !dialogRecords.length) {
    throw new Error('缺少对话记录：Part B分析至少需要1条对话记录')
  }
  if (!caseInfo) {
    throw new Error('缺少病例信息：Part B分析需要病例原文作为参照')
  }

  // L1 先跑（L2/L3 需要 L1 结果作为上下文）
  const coverage = await analyzeCoverage(caseInfo, dialogRecords, llmConfig)

  // L2/L3 并行（两者都依赖 L1，但彼此独立）
  const [strategy, cognition] = await Promise.all([
    analyzeStrategy(dialogRecords, coverage, llmConfig),
    analyzeCognition(dialogRecords, coverage, null, llmConfig)
  ])

  // L3 用 L2 结果增强后再跑一次（可选：如果 L2 置信度低，跳过增强）
  let hypothesisActivity = cognition
  if (strategy && strategy.type) {
    hypothesisActivity = await analyzeCognition(dialogRecords, coverage, strategy, llmConfig)
  }

  // L4/L5 并行（两者依赖 L1-L3 但彼此独立）
  const formattedDialog = formatDialogRecords(dialogRecords)
  const [safety, relationship] = await Promise.all([
    analyzeSafety(formattedDialog, coverage, strategy, hypothesisActivity, 'history_taking', llmConfig),
    analyzeRelationship(formattedDialog, coverage, strategy, hypothesisActivity, 'history_taking', llmConfig)
  ])

  return {
    profile_type: 'history_taking',
    coverage,
    strategy,
    hypothesis_activity: hypothesisActivity,
    safety,
    relationship
  }
}

// ═══════════════════════════════════════════════
// Part B 剖面分析 — 体格检查 L1/L2/L3
// ═══════════════════════════════════════════════

/**
 * 体格检查 L1 检查覆盖分析
 */
async function analyzeExamCoverage(caseInfo, examRecords, llmConfig) {
  const promptTemplate = loadPrompt('partb-pe-l1-coverage.txt')
  const prompt = promptTemplate
    .replace('{{CASE_INFO}}', typeof caseInfo === 'string' ? caseInfo : formatCaseInfo(caseInfo))
    .replace('{{EXAM_RECORDS}}', formatExamRecords(examRecords))


  return callLLM(prompt, llmConfig.apiUrl, llmConfig.apiKey, llmConfig.model)
}

/**
 * 体格检查 L2 检查策略分析
 */
async function analyzeExamStrategy(examRecords, l1Summary, llmConfig) {
  const promptTemplate = loadPrompt('partb-pe-l2-strategy.txt')
  const prompt = promptTemplate
    .replace('{{EXAM_RECORDS}}', formatExamRecords(examRecords))
    .replace('{{L1_SUMMARY}}', buildL1Summary(l1Summary))


  return callLLM(prompt, llmConfig.apiUrl, llmConfig.apiKey, llmConfig.model)
}

/**
 * 体格检查 L3 认知关联分析
 */
async function analyzeExamCognition(examRecords, l1Summary, l2Summary, llmConfig) {
  const promptTemplate = loadPrompt('partb-pe-l3-cognition.txt')
  const prompt = promptTemplate
    .replace('{{EXAM_RECORDS}}', formatExamRecords(examRecords))
    .replace('{{L1_SUMMARY}}', buildL1Summary(l1Summary))
    .replace('{{L2_SUMMARY}}', buildL2Summary(l2Summary))


  return callLLM(prompt, llmConfig.apiUrl, llmConfig.apiKey, llmConfig.model)
}

/**
 * Part B 体格检查剖面统一分析 — L1 先跑 → L2/L3 并行
 *
 * @param {object} params
 * @param {object} params.caseInfo - 病例信息
 * @param {Array}  params.examRecords - 体格检查操作记录
 * @param {object} llmConfig - {apiUrl, apiKey, model}
 * @returns {Promise<{profile_type, coverage, strategy, hypothesis_activity}>}
 */
export async function analyzePhysicalExamProfile(params, llmConfig) {
  const { caseInfo, examRecords } = params

  if (!examRecords || !examRecords.length) {
    throw new Error('缺少检查操作记录：体格检查分析至少需要1条记录')
  }
  if (!caseInfo) {
    throw new Error('缺少病例信息：体格检查分析需要病例体征发现作为参照')
  }

  const coverage = await analyzeExamCoverage(caseInfo, examRecords, llmConfig)

  const [strategy, cognition] = await Promise.all([
    analyzeExamStrategy(examRecords, coverage, llmConfig),
    analyzeExamCognition(examRecords, coverage, null, llmConfig)
  ])

  let hypothesisActivity = cognition
  if (strategy && strategy.type) {
    hypothesisActivity = await analyzeExamCognition(examRecords, coverage, strategy, llmConfig)
  }

  // L4 安全行为分析（体格检查无对话维度，不跑 L5）
  const safety = await analyzeSafety(formatExamRecords(examRecords), coverage, strategy, hypothesisActivity, 'physical_exam', llmConfig)

  return {
    profile_type: 'physical_exam',
    coverage,
    strategy,
    hypothesis_activity: hypothesisActivity,
    safety,
    relationship: null
  }
}

// ═══════════════════════════════════════════════
// Part B 剖面分析 — 人文沟通 L1/L2/L3
// ═══════════════════════════════════════════════

/**
 * 将人文沟通场景数据格式化为分析参考文本
 */
function formatScenarioData(scenarioData) {
  if (!scenarioData) return '（无场景数据）'
  const lines = []

  if (scenarioData.scenario_name) {
    lines.push(`场景：${scenarioData.scenario_name}`)
  }
  if (scenarioData.task) {
    lines.push(`沟通任务：${scenarioData.task}`)
  }

  const script = scenarioData.script || []
  if (script.length) {
    lines.push('\nSP预设疑问清单：')
    for (const item of script) {
      const speaker = item.speaker === 'sp' ? 'SP' : (item.speaker || '?')
      const emotion = item.emotion ? ` [${item.emotion}]` : ''
      lines.push(`  ${speaker}${emotion}: ${item.line || item.content || ''}`)
    }
  }

  const stages = scenarioData.psychological_stages || []
  if (stages.length) {
    lines.push('\n心理阶段：')
    for (const s of stages) {
      lines.push(`  阶段${s.stage}: ${s.emotion || ''} — ${s.cognition || ''}`)
    }
  }

  return lines.join('\n') || '（场景数据不完整）'
}

/**
 * 人文沟通 L1 沟通覆盖分析
 */
async function analyzeCommCoverage(caseInfo, dialogRecords, scenarioData, llmConfig) {
  const promptTemplate = loadPrompt('partb-hc-l1-coverage.txt')
  const prompt = promptTemplate
    .replace('{{CASE_INFO}}', typeof caseInfo === 'string' ? caseInfo : formatCaseInfo(caseInfo))
    .replace('{{DIALOG_RECORDS}}', formatDialogRecords(dialogRecords))
    .replace('{{SCENARIO_DATA}}', formatScenarioData(scenarioData))


  return callLLM(prompt, llmConfig.apiUrl, llmConfig.apiKey, llmConfig.model)
}

/**
 * 人文沟通 L2 沟通策略分析
 */
async function analyzeCommStrategy(dialogRecords, l1Summary, llmConfig) {
  const promptTemplate = loadPrompt('partb-hc-l2-strategy.txt')
  const prompt = promptTemplate
    .replace('{{DIALOG_RECORDS}}', formatDialogRecords(dialogRecords))
    .replace('{{L1_SUMMARY}}', buildL1Summary(l1Summary))


  return callLLM(prompt, llmConfig.apiUrl, llmConfig.apiKey, llmConfig.model)
}

/**
 * 人文沟通 L3 沟通认知过程分析
 */
async function analyzeCommCognition(dialogRecords, l1Summary, l2Summary, llmConfig) {
  const promptTemplate = loadPrompt('partb-hc-l3-cognition.txt')
  const prompt = promptTemplate
    .replace('{{DIALOG_RECORDS}}', formatDialogRecords(dialogRecords))
    .replace('{{L1_SUMMARY}}', buildL1Summary(l1Summary))
    .replace('{{L2_SUMMARY}}', buildL2Summary(l2Summary))


  return callLLM(prompt, llmConfig.apiUrl, llmConfig.apiKey, llmConfig.model)
}

/**
 * Part B 人文沟通剖面统一分析 — L1 先跑 → L2/L3 并行
 *
 * @param {object} params
 * @param {object} params.caseInfo - 病例信息
 * @param {Array}  params.dialogRecords - 对话记录
 * @param {object} [params.scenarioData] - 场景数据（疑问清单、心理阶段等）
 * @param {object} llmConfig - {apiUrl, apiKey, model}
 * @returns {Promise<{profile_type, coverage, strategy, hypothesis_activity}>}
 */
export async function analyzeHumanisticCommProfile(params, llmConfig) {
  const { caseInfo, dialogRecords, scenarioData } = params

  if (!dialogRecords || !dialogRecords.length) {
    throw new Error('缺少对话记录：人文沟通分析至少需要1条对话记录')
  }
  if (!caseInfo) {
    throw new Error('缺少病例信息：人文沟通分析需要病例原文作为参照')
  }

  const coverage = await analyzeCommCoverage(caseInfo, dialogRecords, scenarioData, llmConfig)

  const [strategy, cognition] = await Promise.all([
    analyzeCommStrategy(dialogRecords, coverage, llmConfig),
    analyzeCommCognition(dialogRecords, coverage, null, llmConfig)
  ])

  let hypothesisActivity = cognition
  if (strategy && strategy.type) {
    hypothesisActivity = await analyzeCommCognition(dialogRecords, coverage, strategy, llmConfig)
  }

  // L4/L5 并行（人文沟通是 L5 的主深度剖面）
  const formattedDialog = formatDialogRecords(dialogRecords)
  const [safety, relationship] = await Promise.all([
    analyzeSafety(formattedDialog, coverage, strategy, hypothesisActivity, 'communication', llmConfig),
    analyzeRelationship(formattedDialog, coverage, strategy, hypothesisActivity, 'communication', llmConfig)
  ])

  return {
    profile_type: 'communication',
    coverage,
    strategy,
    hypothesis_activity: hypothesisActivity,
    safety,
    relationship
  }
}

// ═══════════════════════════════════════════════
// Part B 剖面分析 — 病例分析 L1/L2/L3
// ═══════════════════════════════════════════════

/** 将QA记录格式化为分析用文本 */
function formatQARecords(qaRecords) {
  if (!qaRecords || !qaRecords.length) return '（无病例分析问答）'
  const lines = ['## 病例分析问答']
  for (const item of qaRecords) {
    lines.push(`\n问题: ${item.question}`)
    lines.push(`回答: ${item.answer}`)
  }
  return lines.join('\n')
}

async function analyzeCACoverage(caseInfo, qaRecords, llmConfig) {
  const promptTemplate = loadPrompt('partb-ca-l1-coverage.txt')
  const prompt = promptTemplate
    .replace('{{CASE_INFO}}', typeof caseInfo === 'string' ? caseInfo : formatCaseInfo(caseInfo))
    .replace('{{QA_RECORDS}}', formatQARecords(qaRecords))


  return callLLM(prompt, llmConfig.apiUrl, llmConfig.apiKey, llmConfig.model)
}

async function analyzeCAStrategy(qaRecords, l1Summary, llmConfig) {
  const promptTemplate = loadPrompt('partb-ca-l2-strategy.txt')
  const prompt = promptTemplate
    .replace('{{QA_RECORDS}}', formatQARecords(qaRecords))
    .replace('{{L1_SUMMARY}}', buildL1Summary(l1Summary))


  return callLLM(prompt, llmConfig.apiUrl, llmConfig.apiKey, llmConfig.model)
}

async function analyzeCACognition(qaRecords, l1Summary, l2Summary, llmConfig) {
  const promptTemplate = loadPrompt('partb-ca-l3-cognition.txt')
  const prompt = promptTemplate
    .replace('{{QA_RECORDS}}', formatQARecords(qaRecords))
    .replace('{{L1_SUMMARY}}', buildL1Summary(l1Summary))
    .replace('{{L2_SUMMARY}}', buildL2Summary(l2Summary))


  return callLLM(prompt, llmConfig.apiUrl, llmConfig.apiKey, llmConfig.model)
}

export async function analyzeCaseAnalysisProfile(params, llmConfig) {
  const { caseInfo, qaRecords } = params

  if (!qaRecords || !qaRecords.length) {
    throw new Error('缺少问答记录：病例分析至少需要1组问答')
  }
  if (!caseInfo) {
    throw new Error('缺少病例信息：病例分析需要病例原文作为参照')
  }

  const coverage = await analyzeCACoverage(caseInfo, qaRecords, llmConfig)

  const [strategy, cognition] = await Promise.all([
    analyzeCAStrategy(qaRecords, coverage, llmConfig),
    analyzeCACognition(qaRecords, coverage, null, llmConfig)
  ])

  let hypothesisActivity = cognition
  if (strategy && strategy.type) {
    hypothesisActivity = await analyzeCACognition(qaRecords, coverage, strategy, llmConfig)
  }

  // L4 安全行为分析（病例分析无对话维度，不跑 L5）
  const safety = await analyzeSafety(formatQARecords(qaRecords), coverage, strategy, hypothesisActivity, 'case_analysis', llmConfig)

  return {
    profile_type: 'case_analysis',
    coverage,
    strategy,
    hypothesis_activity: hypothesisActivity,
    safety,
    relationship: null
  }
}

// ═══════════════════════════════════════════════
// Part B 剖面分析 — 病历书写 L1/L2
// ═══════════════════════════════════════════════

/** 将病历自由文本格式化为分析用文本 */
function formatMedicalRecord(recordText) {
  if (!recordText) return '（无病历内容）'
  return recordText
}

async function analyzeMRCcoverage(caseInfo, recordText, llmConfig) {
  const promptTemplate = loadPrompt('partb-mr-l1-coverage.txt')
  const prompt = promptTemplate
    .replace('{{CASE_INFO}}', typeof caseInfo === 'string' ? caseInfo : formatCaseInfo(caseInfo))
    .replace('{{MEDICAL_RECORD}}', formatMedicalRecord(recordText))


  return callLLM(prompt, llmConfig.apiUrl, llmConfig.apiKey, llmConfig.model)
}

async function analyzeMRStrategy(recordText, l1Summary, llmConfig) {
  const promptTemplate = loadPrompt('partb-mr-l2-strategy.txt')
  const prompt = promptTemplate
    .replace('{{MEDICAL_RECORD}}', formatMedicalRecord(recordText))
    .replace('{{L1_SUMMARY}}', buildL1Summary(l1Summary))


  return callLLM(prompt, llmConfig.apiUrl, llmConfig.apiKey, llmConfig.model)
}

export async function analyzeMedicalRecordProfile(params, llmConfig) {
  const { caseInfo, recordText } = params

  if (!recordText || !recordText.trim()) {
    throw new Error('缺少病历内容：病历书写分析需要病历文本')
  }
  if (!caseInfo) {
    throw new Error('缺少病例信息：病历书写分析需要病例原文作为参照')
  }

  const coverage = await analyzeMRCcoverage(caseInfo, recordText, llmConfig)
  const strategy = await analyzeMRStrategy(recordText, coverage, llmConfig)

  return {
    profile_type: 'medical_record',
    coverage,
    strategy,
    hypothesis_activity: null // 设计文档：病历书写最大深度 L2
  }
}

// ═══════════════════════════════════════════════
// Part B 剖面分析 — 精神检查 L1/L2/L3
// ═══════════════════════════════════════════════

async function analyzeMECoverage(caseInfo, dialogRecords, llmConfig) {
  const promptTemplate = loadPrompt('partb-me-l1-coverage.txt')
  const prompt = promptTemplate
    .replace('{{CASE_INFO}}', typeof caseInfo === 'string' ? caseInfo : formatCaseInfo(caseInfo))
    .replace('{{DIALOG_RECORDS}}', formatDialogRecords(dialogRecords))


  return callLLM(prompt, llmConfig.apiUrl, llmConfig.apiKey, llmConfig.model)
}

async function analyzeMEStrategy(dialogRecords, l1Summary, llmConfig) {
  const promptTemplate = loadPrompt('partb-me-l2-strategy.txt')
  const prompt = promptTemplate
    .replace('{{DIALOG_RECORDS}}', formatDialogRecords(dialogRecords))
    .replace('{{L1_SUMMARY}}', buildL1Summary(l1Summary))


  return callLLM(prompt, llmConfig.apiUrl, llmConfig.apiKey, llmConfig.model)
}

async function analyzeMECognition(dialogRecords, l1Summary, l2Summary, llmConfig) {
  const promptTemplate = loadPrompt('partb-me-l3-cognition.txt')
  const prompt = promptTemplate
    .replace('{{DIALOG_RECORDS}}', formatDialogRecords(dialogRecords))
    .replace('{{L1_SUMMARY}}', buildL1Summary(l1Summary))
    .replace('{{L2_SUMMARY}}', buildL2Summary(l2Summary))


  return callLLM(prompt, llmConfig.apiUrl, llmConfig.apiKey, llmConfig.model)
}

export async function analyzeMentalExamProfile(params, llmConfig) {
  const { caseInfo, dialogRecords } = params

  if (!dialogRecords || !dialogRecords.length) {
    throw new Error('缺少对话记录：精神检查分析至少需要1条对话记录')
  }
  if (!caseInfo) {
    throw new Error('缺少病例信息：精神检查分析需要病例原文作为参照')
  }

  const coverage = await analyzeMECoverage(caseInfo, dialogRecords, llmConfig)

  const [strategy, cognition] = await Promise.all([
    analyzeMEStrategy(dialogRecords, coverage, llmConfig),
    analyzeMECognition(dialogRecords, coverage, null, llmConfig)
  ])

  let hypothesisActivity = cognition
  if (strategy && strategy.type) {
    hypothesisActivity = await analyzeMECognition(dialogRecords, coverage, strategy, llmConfig)
  }

  // L4/L5 并行（精神检查中 L4 安全红线 + L5 治疗性关系质量）
  const formattedDialog = formatDialogRecords(dialogRecords)
  const [safety, relationship] = await Promise.all([
    analyzeSafety(formattedDialog, coverage, strategy, hypothesisActivity, 'mental_exam', llmConfig),
    analyzeRelationship(formattedDialog, coverage, strategy, hypothesisActivity, 'mental_exam', llmConfig)
  ])

  return {
    profile_type: 'mental_exam',
    coverage,
    strategy,
    hypothesis_activity: hypothesisActivity,
    safety,
    relationship
  }
}

// ═══════════════════════════════════════════════
// 观测能力矩阵 — 各考核项目对各维度的观测强度
// ═══════════════════════════════════════════════

const OBSERVATION_MATRIX = {
  history_taking:  { safety: 3, reasoning: 3, skill: 2, comm: 2, professionalism: 2 },
  physical_exam:   { safety: 3, reasoning: 2, skill: 3, comm: 2, professionalism: 2 },
  communication:   { safety: 2, reasoning: 2, skill: 0, comm: 3, professionalism: 2 },
  case_analysis:   { safety: 2, reasoning: 3, skill: 2, comm: 0, professionalism: 2 },
  medical_record:  { safety: 1, reasoning: 2, skill: 3, comm: 0, professionalism: 3 },
  mental_exam:     { safety: 3, reasoning: 3, skill: 3, comm: 3, professionalism: 2 }
}

const DIMENSION_WEIGHTS = { 3: '强', 2: '中', 1: '弱', 0: '无' }

/**
 * 将多个 Part B 剖面报告紧凑化为 LLM 可消费的 JSON 文本
 */
function formatProfileReportsForLLM(profileReports) {
  if (!profileReports || !Object.keys(profileReports).length) return '（无剖面报告）'

  const summaries = []
  for (const [profileType, profile] of Object.entries(profileReports)) {
    if (!profile) continue
    const label = PROFILE_TYPE_LABELS[profileType] || profileType
    const summary = {
      profile_type: label,
      coverage_rate: profile.coverage?.coverage_rate != null ? Math.round(profile.coverage.coverage_rate * 100) + '%' : '未知',
      missed_high: profile.coverage?.missed_high_importance?.slice(0, 5) || [],
      strategy_type: profile.strategy?.type || '未知',
      strategy_confidence: profile.strategy?.confidence || '未知',
      reasoning_mode: profile.hypothesis_activity?.reasoning_mode || '未知',
      premature_closure: profile.hypothesis_activity?.premature_closure || false,
      cognitive_biases: (profile.hypothesis_activity?.cognitive_biases || []).map(b => b.type),
      safety_pattern: profile.safety?.safety_pattern || '未知',
      screening_rate: profile.safety?.screening_rate != null ? Math.round(profile.safety.screening_rate * 100) + '%' : '未知',
      empathy_quality: profile.relationship?.empathy_quality || null,
      response_rate: profile.relationship?.response_rate != null ? Math.round(profile.relationship.response_rate * 100) + '%' : null
    }
    summaries.push(`### ${label}\n${JSON.stringify(summary, null, 2)}`)
  }

  return summaries.join('\n\n')
}

/**
 * 根据观测矩阵 + 可用剖面类型，计算各维度的置信度修正
 */
function computeDimensionConfidence(availableProfileTypes) {
  const dims = ['safety', 'reasoning', 'skill', 'comm', 'professionalism']
  const result = {}
  for (const dim of dims) {
    let totalWeight = 0
    for (const pt of availableProfileTypes) {
      const matrix = OBSERVATION_MATRIX[pt]
      if (matrix) totalWeight += (matrix[dim] || 0)
    }
    // 总权重 >= 6 → 强覆盖, 3-5 → 中覆盖, < 3 → 弱覆盖
    if (totalWeight >= 6) result[dim] = { coverage: '充分', confidence_boost: '+0' }
    else if (totalWeight >= 3) result[dim] = { coverage: '一般', confidence_boost: '-1' }
    else result[dim] = { coverage: '不足', confidence_boost: '-2' }
  }
  return result
}

// ═══════════════════════════════════════════════
// Part C — 跨剖面整合分析
// ═══════════════════════════════════════════════

/**
 * @param {object} params
 * @param {object} params.profileReports — { history_taking: {...}, physical_exam: {...}, ... }
 * @param {object} [params.scoringSummary] — 评分汇总
 * @param {object} params.caseInfo — 病例信息
 * @param {object} llmConfig — {apiUrl, apiKey, model}
 * @returns {Promise<object>}
 */
export async function analyzeCrossProfileIntegration(params, llmConfig) {
  const { profileReports, scoringSummary, caseInfo } = params

  const profileTypes = Object.keys(profileReports).filter(k => profileReports[k])
  if (profileTypes.length < 1) {
    throw new Error('至少需要一个剖面报告进行整合分析')
  }

  const promptTemplate = loadPrompt('partc-integration.txt')
  const prompt = promptTemplate
    .replace('{{CASE_INFO}}', typeof caseInfo === 'string' ? caseInfo : formatCaseInfo(caseInfo))
    .replace('{{PROFILE_REPORTS}}', formatProfileReportsForLLM(profileReports))
    .replace('{{SCORING_SUMMARY}}', scoringSummary ? JSON.stringify(scoringSummary, null, 2) : '（无评分数据）')


  const result = await callLLM(prompt, llmConfig.apiUrl, llmConfig.apiKey, llmConfig.model)

  // 附加观测覆盖信息
  result._dimension_coverage = computeDimensionConfidence(profileTypes)
  result._profile_count = profileTypes.length

  return result
}

// ═══════════════════════════════════════════════
// Part A — 能力发展阶段定位
// ═══════════════════════════════════════════════

/**
 * @param {object} params
 * @param {object} params.integrationResult — Part C 输出
 * @param {object} [params.traineeContext] — { phase, specialty, difficulty } 学员背景（可选）
 * @param {object} llmConfig — {apiUrl, apiKey, model}
 * @returns {Promise<object>}
 */
export async function analyzeCapabilityStage(params, llmConfig) {
  const { integrationResult, traineeContext } = params

  if (!integrationResult) {
    throw new Error('缺少 Part C 整合分析结果')
  }

  const promptTemplate = loadPrompt('parta-stage.txt')
  const prompt = promptTemplate
    .replace('{{INTEGRATION_RESULT}}', JSON.stringify(integrationResult, null, 2))
    .replace('{{TRAINEE_CONTEXT}}', traineeContext
      ? `培训阶段: ${traineeContext.phase || '未知'}\n专业: ${traineeContext.specialty || '未知'}\n难度: ${traineeContext.difficulty || '未知'}`
      : '（学员背景信息未提供）')


  return callLLM(prompt, llmConfig.apiUrl, llmConfig.apiKey, llmConfig.model)
}

// ═══════════════════════════════════════════════
// Part D — 发展导航
// ═══════════════════════════════════════════════

/**
 * @param {object} params
 * @param {object} params.integrationResult — Part C 输出
 * @param {object} [params.stageResult] — Part A 输出（可选但推荐）
 * @param {object} [params.profileReports] — Part B 剖面报告（可选）
 * @param {object} llmConfig — {apiUrl, apiKey, model}
 * @returns {Promise<object>}
 */
export async function analyzeDevelopmentPlan(params, llmConfig) {
  const { integrationResult, stageResult, profileReports } = params

  if (!integrationResult) {
    throw new Error('缺少 Part C 整合分析结果')
  }

  const promptTemplate = loadPrompt('partd-navigation.txt')
  const prompt = promptTemplate
    .replace('{{STAGE_RESULT}}', stageResult ? JSON.stringify(stageResult, null, 2) : '（Part A 阶段定位未提供）')
    .replace('{{INTEGRATION_RESULT}}', JSON.stringify(integrationResult, null, 2))
    .replace('{{PROFILE_SUMMARY}}', profileReports
      ? formatProfileReportsForLLM(profileReports)
      : '（Part B 剖面摘要未提供）')


  return callLLM(prompt, llmConfig.apiUrl, llmConfig.apiKey, llmConfig.model)
}

/**
 * Part C → Part A → Part D 一体化分析
 * 串行执行：Part D 需要 Part A 的阶段定位结果来提高处方针对性
 */
export async function analyzeComprehensive(params, llmConfig) {
  const { profileReports, scoringSummary, caseInfo, traineeContext } = params

  // Part C 先跑（A 依赖它）
  const integration = await analyzeCrossProfileIntegration(
    { profileReports, scoringSummary, caseInfo },
    llmConfig
  )

  // Part A → Part D 串行（Part D 利用 Part A 的阶段判定）
  const stage = await analyzeCapabilityStage({ integrationResult: integration, traineeContext }, llmConfig)
  const navigation = await analyzeDevelopmentPlan({ integrationResult: integration, stageResult: stage, profileReports }, llmConfig)

  return { integration, stage, navigation }
}

// 导出格式化函数供外部使用
export { formatDialogRecords, formatExamRecords, formatCaseInfo, formatAllRecords, formatProfileReportsForLLM }

export { loadPrompt }
