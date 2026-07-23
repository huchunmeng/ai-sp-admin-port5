import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getSpecialty } from '../../../packages/shared/data/specialty-registry.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PROMPTS_DIR = path.resolve(__dirname, '../prompts')

// ── 提示词文件映射 ──────────────────────────────────────────

const PROMPT_MAP = {
  basic: ['01-basic', '0101-prompt.txt'],
  reception: ['02-reception', '0201-prompt.txt'],
  analysis: ['03-analysis', '0301-prompt.txt'],
  humanity: ['04-humanity', '0401-prompt.txt'],
  meta: ['05-meta', '0501-prompt.txt'],
  mentalExam: ['07-mental-exam', '0701-prompt.txt']
}

// ── 缓存 ──────────────────────────────────────────────────

let configCache = null

function loadConfig() {
  if (configCache) return configCache
  const configPath = path.join(PROMPTS_DIR, '01-basic', '0102-config.json')
  configCache = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
  return configCache
}

const promptCache = {}

export function loadPrompt(name) {
  if (promptCache[name]) return promptCache[name]
  const entry = PROMPT_MAP[name]
  if (!entry) return ''
  const filePath = path.join(PROMPTS_DIR, entry[0], entry[1])
  promptCache[name] = fs.readFileSync(filePath, 'utf-8')
  return promptCache[name]
}

// ── 专业查找辅助 ── 统一使用 specialty-registry ─────────────

function specialtyId(raw) {
  const sp = getSpecialty(raw)
  return sp ? sp.id : 'internal_medicine'
}

function specialtyAbbr(raw) {
  const sp = getSpecialty(raw)
  return sp ? sp.abbr : 'IM'
}

const LEVEL_TO_PHASE = { 'U1': '本科教学', 'U2': '本科教学', 'R1': '住院医师', 'R2': '住院医师', 'R3': '住院医师', 'F1': '专科培训', 'F2': '专科培训' }

// ── 阶段配置辅助函数 ──────────────────────────────────────

function getPhaseConfig(config, level) {
  const cfg = loadConfig()
  const configKey = specialtyId(config.specialty)
  const specConfig = cfg[configKey] || cfg.internal_medicine
  const phaseConfigs = cfg._phase_configs || {}
  const levelConfig = phaseConfigs[level] || phaseConfigs['R1'] || {}

  return {
    station_duration: specConfig.station_duration || levelConfig.station_duration || 15,
    task_requirements: specConfig.task_requirements || levelConfig.task_requirements || '完成病史采集和体格检查，做出初步诊断及鉴别诊断',
    physical_exam_focus: specConfig.physical_exam_focus || '',
    history_item_count_range: levelConfig.history_item_count_range || specConfig.history_item_count_range || [15, 25],
    exam_item_count_range: levelConfig.exam_item_count_range || specConfig.exam_item_count_range || [10, 15],
    communication_focus: specConfig.communication_focus || levelConfig.communication_focus || '',
    sp_role: specConfig.sp_role || 'patient',
    // v0.6 新增：阶段差异化精细参数
    qa_script_count_range: levelConfig.qa_script_count_range || [20, 60],
    scene_count_range: levelConfig.scene_count_range || [1, 4],
    psychological_stages_range: levelConfig.psychological_stages_range || [1, 4],
    dialogue_turns_range: levelConfig.dialogue_turns_range || [6, 20],
    sp_emotion_complexity: levelConfig.sp_emotion_complexity || '',
    sp_initiative_questions_range: levelConfig.sp_initiative_questions_range || [1, 5]
  }
}

// ── 提示词填充函数 ────────────────────────────────────────

export function fillBasicPrompt(config) {
  const cfg = loadConfig()
  const configKey = specialtyId(config.specialty)
  const specConfig = cfg[configKey] || cfg.internal_medicine
  const vr = specConfig.variation_rules || {}
  const level = config.teaching_phase || 'R1'
  const trainingPhase = LEVEL_TO_PHASE[level] || '住院医师'

  let prompt = loadPrompt('basic')
  prompt = prompt.replace(/\{\{input_mode\}\}/g, '参数生成模式')
  prompt = prompt.replace(/\{\{uploaded_document\}\}/g, '无（当前为参数生成模式，非文档提取模式）')
  prompt = prompt.replace(/\{\{specialty_name\}\}/g, config.specialty || '内科')
  prompt = prompt.replace(/\{\{disease_name\}\}/g, config.disease || '高血压')
  prompt = prompt.replace(/\{\{difficulty\}\}/g, level)
  prompt = prompt.replace(/\{\{training_phase\}\}/g, trainingPhase)
  prompt = prompt.replace(/\{\{name_seed_hint\}\}/g, vr.name_seed_hint || '常见姓名')
  prompt = prompt.replace(/\{\{occupation_pool\}\}/g, (vr.occupation_pool || ['职员']).join('、'))
  prompt = prompt.replace(/\{\{trigger_pool\}\}/g, (vr.trigger_pool || ['无明显诱因']).join('、'))
  prompt = prompt.replace(/\{\{time_fluctuation\}\}/g, String(vr.time_fluctuation || 0.3))

  const extraFields = specConfig.extra_fields || []
  prompt = prompt.replace(/\{\{#extra_fields\}\}[\s\S]*?\{\{\/extra_fields\}\}/g, () => {
    if (extraFields.length === 0) return ''
    return extraFields.map(ef => `- ${ef.field}：${ef.label}。类型：${ef.type}。${ef.required ? '必填。' : ''}${ef.placeholder || ''}`).join('\n')
  })

  const physTemplate = specConfig.default_physical_exam_template || []
  prompt = prompt.replace(/\{\{#default_physical_exam_template\}\}[\s\S]*?\{\{\/default_physical_exam_template\}\}/g, () => {
    if (physTemplate.length === 0) return ''
    return physTemplate.map(t => `${t.category}：${t.items.join('、')}`).join('\n')
  })

  let exampleBlock = ''
  const exampleDir = path.join(PROMPTS_DIR, '01-basic', 'examples')
  const exampleFile = path.join(exampleDir, `${configKey}.json`)
  try {
    const exampleContent = fs.readFileSync(exampleFile, 'utf-8')
    JSON.parse(exampleContent) // validate JSON
    exampleBlock = `以下是一个符合当前专业（${config.specialty}）、病种（${config.disease}）和难度（${level}）的标准示例病历，请仔细分析其结构布局、语体风格、术语精准度及专科特色，并在生成新病历时严格保持这种专业水准：
\`\`\`json
${exampleContent}
\`\`\``
  } catch (_) {
    // 该专业暂无示例文件，移除示例块
  }

  prompt = prompt.replace(/\{\{#example_json\}\}[\s\S]*?\{\{\/example_json\}\}/g, exampleBlock)
  return prompt
}

export function fillReceptionPrompt(config, basicJson) {
  const level = config.teaching_phase || 'R1'
  const trainingPhase = LEVEL_TO_PHASE[level] || '住院医师'
  const pc = getPhaseConfig(config, level)
  const cfg = loadConfig()
  const configKey = specialtyId(config.specialty)
  const specConfig = cfg[configKey] || cfg.internal_medicine

  let prompt = loadPrompt('reception')
  prompt = prompt.replace(/\{\{specialty_name\}\}/g, specConfig.specialty_name || config.specialty)
  prompt = prompt.replace(/\{\{training_phase\}\}/g, trainingPhase)
  prompt = prompt.replace(/\{\{difficulty\}\}/g, level)
  prompt = prompt.replace(/\{\{station_duration\}\}/g, String(pc.station_duration))
  prompt = prompt.replace(/\{\{task_requirements\}\}/g, pc.task_requirements)
  prompt = prompt.replace(/\{\{physical_exam_focus\}\}/g, pc.physical_exam_focus)
  prompt = prompt.replace(/\{\{history_item_count_range\}\}/g, `[${pc.history_item_count_range.join(', ')}]`)
  prompt = prompt.replace(/\{\{exam_item_count_range\}\}/g, `[${pc.exam_item_count_range.join(', ')}]`)
  const communicationTarget = (basicJson && basicJson.communication_target) || pc.sp_role
  prompt = prompt.replace(/\{\{default_communication_target\}\}/g, communicationTarget)
  prompt = prompt.replace(/\{\{case_summary\}\}/g, JSON.stringify(basicJson, null, 2))

  // v0.6 新增：阶段差异化精细参数注入
  prompt = prompt.replace(/\{\{qa_script_count_range\}\}/g, `[${pc.qa_script_count_range.join(', ')}]`)
  prompt = prompt.replace(/\{\{sp_emotion_complexity\}\}/g, pc.sp_emotion_complexity)
  prompt = prompt.replace(/\{\{dialogue_turns_range\}\}/g, `[${pc.dialogue_turns_range.join(', ')}]`)

  return prompt
}

export function fillAnalysisPrompt(config, basicJson) {
  const enSpecialty = specialtyId(config.specialty)
  const level = config.teaching_phase || 'R1'
  const trainingPhase = LEVEL_TO_PHASE[level] || '住院医师'
  const stepsMap = { U1: 2, U2: 3, R1: 3, R2: 4, R3: 5, F1: 5, F2: 6 }

  let prompt = loadPrompt('analysis')
  prompt = prompt.replace(/\{\{specialty\}\}/g, enSpecialty)
  prompt = prompt.replace(/\{\{training_phase\}\}/g, trainingPhase)
  prompt = prompt.replace(/\{\{case_json\}\}/g, JSON.stringify(basicJson, null, 2))
  prompt = prompt.replace(/\{\{steps_count\}\}/g, String(stepsMap[level] || 4))
  prompt = prompt.replace(/\{\{difficulty\}\}/g, level)
  prompt = prompt.replace(/\{\{case_id\}\}/g, basicJson.case_id || '')
  prompt = prompt.replace(/\{\{disease\}\}/g, basicJson.disease || config.disease || '')
  return prompt
}

export function fillHumanityPrompt(config, basicJson) {
  const enSpecialty = specialtyId(config.specialty)
  const level = config.teaching_phase || 'R1'
  const trainingPhase = LEVEL_TO_PHASE[level] || '住院医师'
  const pc = getPhaseConfig(config, level)

  let prompt = loadPrompt('humanity')
  prompt = prompt.replace(/\{\{specialty\}\}/g, enSpecialty)
  prompt = prompt.replace(/\{\{training_phase\}\}/g, trainingPhase)
  prompt = prompt.replace(/\{\{difficulty\}\}/g, level)
  prompt = prompt.replace(/\{\{case_json\}\}/g, JSON.stringify(basicJson, null, 2))
  prompt = prompt.replace(/\{\{case_id\}\}/g, basicJson.case_id || '')
  prompt = prompt.replace(/\{\{disease\}\}/g, basicJson.disease || config.disease || '')

  // v0.6 新增：阶段差异化精细参数注入
  prompt = prompt.replace(/\{\{scene_count_range\}\}/g, `[${pc.scene_count_range.join(', ')}]`)
  prompt = prompt.replace(/\{\{psychological_stages_range\}\}/g, `[${pc.psychological_stages_range.join(', ')}]`)
  prompt = prompt.replace(/\{\{dialogue_turns_range\}\}/g, `[${pc.dialogue_turns_range.join(', ')}]`)
  prompt = prompt.replace(/\{\{sp_emotion_complexity\}\}/g, pc.sp_emotion_complexity)
  prompt = prompt.replace(/\{\{sp_initiative_questions_range\}\}/g, `[${pc.sp_initiative_questions_range.join(', ')}]`)

  return prompt
}

export function fillMentalExamPrompt(config, basicJson, previousResults) {
  const level = config.teaching_phase || 'R1'
  const trainingPhase = LEVEL_TO_PHASE[level] || '住院医师'

  let prompt = loadPrompt('mentalExam')
  if (!prompt) {
    // Fallback: use the prompt file content directly
    return ''
  }
  prompt = prompt.replace(/\{\{specialty\}\}/g, config.specialty || '精神科')
  prompt = prompt.replace(/\{\{disease\}\}/g, config.disease || '')
  prompt = prompt.replace(/\{\{training_phase\}\}/g, trainingPhase)
  prompt = prompt.replace(/\{\{difficulty\}\}/g, level)
  prompt = prompt.replace(/\{\{case_json\}\}/g, JSON.stringify(basicJson || {}, null, 2))

  return prompt
}

export function fillMetaPrompt(config, previousResults, AIModel) {
  let prompt = loadPrompt('meta')
  const now = new Date().toISOString()
  const prev = previousResults || {}
  const level = config.teaching_phase || 'R1'
  const trainingPhase = LEVEL_TO_PHASE[level] || '住院医师'

  prompt = prompt.replace(/\{\{case_id\}\}/g, (prev.basic || {}).case_id || '')
  prompt = prompt.replace(/\{\{specialty\}\}/g, config.specialty || '')
  prompt = prompt.replace(/\{\{disease\}\}/g, config.disease || '')
  prompt = prompt.replace(/\{\{difficulty\}\}/g, level)
  prompt = prompt.replace(/\{\{training_phase\}\}/g, trainingPhase)
  prompt = prompt.replace(/\{\{input_mode\}\}/g, '参数生成模式')
  prompt = prompt.replace(/\{\{source_document_ref\}\}/g, 'null')
  prompt = prompt.replace(/\{\{generation_timestamp\}\}/g, now)
  prompt = prompt.replace(/\{\{basic_info_json\}\}/g, JSON.stringify(prev.basic || {}))
  prompt = prompt.replace(/\{\{encounter_json\}\}/g, JSON.stringify(prev.reception || {}))
  prompt = prompt.replace(/\{\{case_analysis_json\}\}/g, JSON.stringify(prev.analysis || {}))
  prompt = prompt.replace(/\{\{communication_json\}\}/g, JSON.stringify(prev.humanity || {}))
  prompt = prompt.replace(/\{\{basic_info_model\}\}/g, AIModel)
  prompt = prompt.replace(/\{\{basic_info_prompt_version\}\}/g, 'v1.0')
  prompt = prompt.replace(/\{\{encounter_model\}\}/g, AIModel)
  prompt = prompt.replace(/\{\{encounter_prompt_version\}\}/g, 'v1.0')
  prompt = prompt.replace(/\{\{case_analysis_model\}\}/g, AIModel)
  prompt = prompt.replace(/\{\{case_analysis_prompt_version\}\}/g, 'v1.0')
  prompt = prompt.replace(/\{\{communication_model\}\}/g, AIModel)
  prompt = prompt.replace(/\{\{communication_prompt_version\}\}/g, 'v1.0')

  const basic = prev.basic || {}
  const reception = prev.reception || {}
  const examinerMat = reception.examiner_materials || {}
  const spMat = reception.sp_materials || {}
  const diagAnswer = examinerMat.diagnosis_answer || {}
  const basicDiag = basic.diagnosis || {}

  prompt = prompt.replace(/\{\{sp_play_rules\}\}/g, JSON.stringify({
    _hint: "请根据上方已生成的全部模块JSON数据，提取并合成SP扮演规则。替换此对象为最终规则（移除_hint字段）。",
    knowledge_boundary: {
      knows: spMat.role_info?.emotion ? [spMat.role_info.emotion] : [],
      does_not_know: []
    },
    emotion_progression: [],
    vague_response_templates: [],
    refuse_to_answer: []
  }, null, 2))

  prompt = prompt.replace(/\{\{ai_scoring_rules\}\}/g, JSON.stringify({
    _hint: "请根据上方已生成的全部模块JSON数据，提取并合成AI评分规则。替换此对象为最终规则（移除_hint字段）。",
    history_rules: (examinerMat.history_score_items || []).map(item => ({ item: item.item || '', keywords: [] })),
    physical_rules: (examinerMat.physical_score_items || []).map(item => ({ item: item.item || '', keywords: [] })),
    communication_rules: []
  }, null, 2))

  prompt = prompt.replace(/\{\{physical_exam_result_templates\}\}/g, JSON.stringify([{
    _hint: "请根据上方已生成的全部模块JSON数据，提取并合成体格检查结果模板。替换此数组为最终模板（移除_hint字段）。",
    _exam_focus: examinerMat.positive_signs || {},
    _exam_card: reception.candidate_materials?.physical_exam_card || ''
  }], null, 2))

  prompt = prompt.replace(/\{\{diagnosis_scoring_rules\}\}/g, JSON.stringify({
    _hint: "请根据上方已生成的全部模块JSON数据，提取并合成诊断评分规则。替换此对象为最终规则（移除_hint字段）。",
    primary_diagnosis: {
      expected: diagAnswer.primary || basicDiag.preliminary || '',
      keywords: [],
      score: 0
    },
    diagnosis_basis: {
      expected_points: (() => {
        const pts = diagAnswer.basis_points || basicDiag.basis || []
        return pts.map(p => typeof p === 'string' ? p : (p.point || ''))
      })(),
      scoring_logic: ''
    },
    differential_diagnosis: {
      expected: diagAnswer.differential || basicDiag.differential || [],
      score: 0
    }
  }, null, 2))

  return prompt
}

// ── 单页优化提示词 ──────────────────────────────────────

const OPTIMIZE_RULES = {
  reception: `## 优化规则（接诊剧本）
1. **单一信息原则（最高优先级）**：检查每一组对话。如果医生的提问包含多个信息点（如"有没有恶心、呕吐？"），必须拆分为独立的多组对话。如果SP的回答包含多条信息，必须精简为只回答被问到的那个信息点。
2. **信息完整覆盖**：对照病例中的病史信息，检查是否所有信息点都已被覆盖（主诉、现病史、既往史、个人史、家族史、系统回顾等）。如缺失，按标准问诊顺序补充。
3. **对话数量**：优化后总对话组数应在40-60组范围内。如果原文不足30组，说明信息覆盖不足，需大幅补充。
4. **问诊顺序**：确保按"开场确认身份→主诉→现病史→既往史→个人史→家族史→系统回顾→人文收尾"的顺序推进。
5. **保持原文合理内容**：原文中正确、自然的对话应尽量保留措辞，只修正不合理的部分。不要无意义地改写已经合理的对话。
6. **SP角色一致性**：确保SP的姓名、年龄、性别、病史等信息与病例摘要完全一致，角色语言风格与患者背景（年龄、职业、教育水平）匹配。`,

  humanity: `## 优化规则（人文沟通剧本）
1. **场景去重与精简**：检查场景间是否存在内容重叠（如B02+B03 ≈ S-EM-01），合并或删除重复场景。场景总数控制在2-4个。确保至少1个core场景。
2. **场景选择合理性**：重新评估每个场景是否对改病例有代表性。如果某个场景与病例核心矛盾无关，降级为optional或移除。核心矛盾优先级的判断标准：诊断严重性>治疗风险>依从性>预后。
3. **SP心理递进**：检查每个core场景是否有2-4个心理阶段，SP的认知和情绪是否有明确递进弧线。如果场景是平的（单一情绪从头到尾），补充设计心理阶段转折。
4. **SP主动提问**：确保全部场景SP提出3-5个实质性问题，分散在不同心理阶段，至少1个带质疑/压力性质的提问（如"是不是实习医生做的？""这能保证成功吗？"）。
5. **考生参考资料**：每个场景的candidate_materials必须包含reference_data（化验/检查/专业知识的通俗说明），不能为空。
6. **考官追问提示**：每个场景的examiner_materials必须包含examiner_prompts（1-3条）。
7. **评分聚焦沟通**：scoring_guide.dimensions必须聚焦沟通能力（共情/表达/共识/语言/结构），不考核医学知识。
8. **保持原文合理内容**：已写得好的场景对话和结构应尽量保留，只修正缺失项和规范问题。`,

  analysis: `## 优化规则（病例分析）
1. **临床逻辑一致性**：检查主诊断、鉴别诊断、诊断依据之间是否存在逻辑矛盾。如有矛盾，基于病例中的客观数据修正。
2. **分步结构**：确保诊断分析步骤数与难度等级匹配（U1=2步, U2=3步, R1=3步, R2=4步, R3=5步, F1=5步, F2=6步）。
3. **鉴别诊断合理性**：检查鉴别诊断是否合理、是否遗漏了重要的鉴别方向。
4. **保持原文合理内容**：正确的诊断推理和分析步骤应保留原文措辞。`,

  mentalExam: `## 优化规则（精神检查）
1. **MSE内在一致性**：检查8个维度描述是否存在矛盾（如appearance写"精神运动性迟滞"但speech写"语速极快"），如有矛盾需修正。
2. **参数与描述对齐**：behavior_params的数值应与mental_status文字描述一致。例如affect描述为"情感低落"则affective_blunting应≥0.5。
3. **诊断与症状匹配**：disease_type必须与病例诊断一致，症状描述应符合该疾病的典型临床表现。
4. **触发词合理性**：delusional_system.triggers应是问诊中自然出现的词汇（3-6个），不应出现医学术语。
5. **保持原文合理内容**：已合理的精神检查描述和参数应保留。`
}

export function fillOptimizePrompt(moduleType, currentData, config) {
  const rules = OPTIMIZE_RULES[moduleType] || ''
  const moduleLabels = { reception: '接诊剧本', humanity: '人文沟通剧本', analysis: '病例分析', mentalExam: '精神检查' }
  const moduleLabel = moduleLabels[moduleType] || moduleType

  return `你是一名临床医学考核命题专家。请对以下已生成的【${moduleLabel}】模块内容进行优化。

## 优化原则
1. **保持合理内容**：原文中正确、合理的内容应尽量保留，包括具体措辞、对话结构、医学信息。不要为了改而改。
2. **修正不合理内容**：只修正确实不符合考核规范的错误（见下方具体规则）。
3. **补充缺失内容**：如果原文缺少必要信息，根据已有数据合理补充，但不要虚构新的临床事实。

## 病例上下文
- 专业：${config.specialty || ''}
- 病种：${config.disease || ''}
- 教学阶段：${config.teaching_phase || 'R1'}
- 培训阶段：${LEVEL_TO_PHASE[config.teaching_phase] || '住院医师'}

${rules}

## 当前模块内容（需要优化）
\`\`\`json
${JSON.stringify(currentData, null, 2)}
\`\`\`

## 输出要求
请直接输出优化后的完整JSON对象，不要包含任何解释性文字或Markdown标记。输出格式必须与输入格式保持一致（相同的顶层字段结构）。`
}

export function generateCaseId(specialty) {
  const abbr = specialtyAbbr(specialty)
  const now = new Date()
  const dateStr = now.getFullYear() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0')
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `${abbr}-${dateStr}-${rand}`
}

export { LEVEL_TO_PHASE, loadConfig, specialtyId, specialtyAbbr }
