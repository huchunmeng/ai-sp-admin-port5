// ═══════════════════════════════════════════════════════════════
// SP 系统提示词构建器 V9 — 档位驱动
// 知觉脑收到的是档位命令，不是数值
// 阻尼器档位(暴怒/愤怒/不满/平静) + 反思脑档位(防御/中立/配合)
// 性格通过提示词注入，不设代码参数
// ═══════════════════════════════════════════════════════════════

import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { loadCaseMaterials } from './case-loader.js'
import { getGearStrategy } from './poc/gear-system.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROMPT_DIR = join(__dirname, '..', '..', 'ai-generator', 'prompts', '06-aisp')

const promptCache = new Map()

export function loadPromptFile(name) {
  if (promptCache.has(name)) return promptCache.get(name)
  const path = join(PROMPT_DIR, name)
  const text = readFileSync(path, 'utf-8')
  promptCache.set(name, text)
  return text
}

/**
 * 构建行为指令 (V9 档位驱动模式)
 *
 * 知觉脑收到档位命令，不是愤怒数值。
 * 阻尼器档位: 暴怒/愤怒/不满/平静
 * 反思脑档位: 防御/中立/配合
 * 融合规则: 阻尼器非平静 → 用阻尼器档位；阻尼器平静 → 用反思脑档位
 *
 * @param {object} options
 * @param {string} options.effectiveGear — 反思脑统一决策的档位
 * @param {object} options.ds — 派生状态（仅用于调试，不影响策略）
 * @param {object} options.candidates — { va: string[], vs: string[], text_guide: string }
 * @param {string} options.mode — 'history-taking' | 'humanistic-comm'
 * @param {string} options.personality — 性格提示词文本
 * @param {object} options.triggers — { bTrigger, aTrigger, repeatHint, multiQuestion, closureTrigger }
 * @returns {string}
 */
export function buildBehaviorInstruction({ effectiveGear, ds, candidates, mode, personality, triggers }) {
  const { va, vs, text_guide } = candidates
  const isHumanity = mode === 'humanistic-comm'
  const { bTrigger, aTrigger } = triggers

  // ── 从档位系统获取策略文本 ──
  const strategy = getGearStrategy(effectiveGear, mode)

  // ── 态度描述（档位感知） ──
  const attitudeDesc = isHumanity ? {
    '暴怒': '你对医生极度不满，被严重冒犯',
    '愤怒': '你对医生不满，态度冷淡带刺',
    '不满': '你心里有气，被敷衍得烦躁',
    '焦虑': '你极度担忧病情，急切想知道答案',
    '不安': '你有些担忧，说话犹豫、试探性提问',
    '退缩': '你被坏消息击垮，不想说话、回避交流',
    '消沉': '你情绪低落、提不起精神',
    '配合': '你信任医生，主动沟通',
    '中立': '你持观望态度，不主动不拒绝',
    '防御': '你不信任医生，拒绝配合',
    '失望': '你曾信任医生，现在觉得被辜负了',
  } : {
    '暴怒': '你对医生极度不满，被严重冒犯',
    '愤怒': '你对医生不满，态度冷淡带刺',
    '不满': '你心里有气，被敷衍得烦躁',
    '焦虑': '你极度担忧病情，急切想知道答案',
    '不安': '你有些担忧病情，说话犹豫、试探性提问',
    '退缩': '你被坏消息击垮，不想说话、回避交流',
    '消沉': '你情绪低落、提不起精神',
    '配合': '你信任医生，愿意配合',
    '中立': '你不主动不拒绝，跟随医生节奏',
    '防御': '你对医生有戒心，拒绝配合',
    '失望': '你曾信任医生，现在觉得被辜负了',
  }

  // ── 档位说明（反思脑统一决策，不再区分来源） ──
  const gearNote = `- 当前档位：【${effectiveGear}】，由反思脑（车长）综合你的情绪状态和认知模型统一决定。`

  const lines = [
    `## OUTPUT_SCHEMA（必须严格遵循）`,
    '',
    '你的每次回复必须是一个合法的JSON对象，且**只包含**以下字段，不得增减：',
    '',
    '```json',
    `{"text":"<你的回复>","video_action":"<从候选菜单选>","voice_style":"<从候选菜单选>","anger_delta":<整数>${isHumanity ? '' : ',"show_material":<null|报告ID>'}}`,
    '```',
    '',
    '字段含义：',
    '- `text`: 你对学生说的话（纯文本，无括号，无动作描述）',
    '- `video_action`: 从下方 video_action 候选列表中选一个',
    '- `voice_style`: 从下方 voice_style 候选列表中选一个',
    '- `anger_delta`: 听完学生刚才的话，你的怒气变了多少？+3=被辱骂攻击, +2=被轻视敷衍, +1=被回避/有点不爽, 0=普通沟通, -1=被真诚道歉/共情, -2=被深度安抚。只输出整数。',
    ...(!isHumanity ? ['- `show_material`: 当学生明确要求出示某份检查报告时，填对应报告ID。不出示时填null。'] : []),

    `🛑 禁止输出以下字段: emotion, deep_reassure, spVerbal`,
    `🛑 禁止输出以下字段: anger, fear, sadness, joy（情绪值）`,
    '',
    '---',
    '',
    `## 当前状态`,
    `- 🎯 当前驾驶档位：【${effectiveGear}】`,
    gearNote,
    ...(personality ? [`- 你的性格：${personality}`] : []),
    `- 情绪基调：${text_guide}`,
    `- 对医生的态度：${attitudeDesc[effectiveGear] || effectiveGear}`,
    `- 当前策略：${strategy}`,
    ...(isHumanity ? [
      `- 💡 收尾规则：如果医生问"还有其他问题吗""还有不明白的地方吗"等收尾问题，`,
      `  回顾你的疑问清单。发现尚未被充分解答的疑问 → 用"对了医生，刚才说的……我还是有点不明白"`,
      `  的方式自然提起。都已解答 → 说没有问题了，感谢医生。`,
    ] : []),
    '',
    `## 表达通道（从以下候选中选择最匹配本轮对话的一项）`,
    '',
    '### video_action 候选（面部表情+动作）：',
    ...va.map((v, i) => `  ${i + 1}. ${v}`),
    '',
    '### voice_style 候选（语音风格）：',
    ...vs.map((v, i) => `  ${i + 1}. ${v}`),
    '',
    '选择规则：',
    '- 文本和 video_action/voice_style 必须匹配。激烈的文本配合激烈的动作/语音。',
    '- 如果本轮学生的发言是善意/共情/道歉 → 选更缓和的候选',
    '- 如果本轮学生的发言是攻击/敷衍/回避 → 选更激烈的候选',
    '- 如果学生对你好（共情、道歉、认真回应你的疑问），你的态度应适当软化',
  ]

  return lines.join('\n')
}

/**
 * 构建完整系统提示词
 * @param {Object} options
 * @param {Object} options.config — case config
 * @param {Object} options.engine — v7 emotionEngine (旧路径, 可选)
 * @param {Object|null} options.smContext — state machine context (旧路径, 可选)
 * @param {Object|null} options.reflectionState — 反思脑状态 (新路径)
 *   { derivedState: { attitude, disclosure, emotion_constraint },
 *     candidates: { va: string[], vs: string[], text_guide: string } }
 * @param {Array} options.messages — conversation messages
 * @param {boolean} options.emotionOn — whether emotion engine is enabled
 * @param {Object} options.gears — { effectiveGear } (V2反思脑统一决策)
 * @param {string} options.personality — personality prompt text (V9性格)
 * @returns {{ prompt: string, itemMap: object|null }}
 */
export function buildSystemPrompt({ config, engine, smContext, reflectionState, messages, emotionOn = true, triggers = {}, gears = {}, personality = '' }) {
  const basePromptFile = config.mode === 'humanistic-comm' ? '0604-sp-system-humanity.txt'
    : config.mode === 'mental-exam' ? '0602-sp-atypical.txt'
    : '0601-sp-system.txt'
  let prompt = loadPromptFile(basePromptFile)

  // {{role_description}}
  prompt = prompt.replace('{{role_description}}', config.roleDescription || '')

  // {{behavior_instruction}}
  if (reflectionState && gears.effectiveGear) {
    // ── V9 档位驱动模式 ──
    const { derivedState, candidates } = reflectionState
    prompt = prompt.replace('{{behavior_instruction}}',
      buildBehaviorInstruction({
        effectiveGear: gears.effectiveGear,
        ds: derivedState,
        candidates,
        mode: config.mode,
        personality,
        triggers,
      }))
  } else if (engine && !emotionOn) {
    // ── 旧路径: 情绪引擎关闭 ──
    const personality = engine.getPersonality()
    prompt = prompt.replace('{{behavior_instruction}}',
      `情绪引擎已关闭。按角色性格和语境自然回应，无需严格遵循情绪数值约束。性格：${personality.exprDesc}，${personality.sensitivityDesc}，${personality.resilienceDesc}

输出JSON格式（严格）：
{"text":"<你的回复>","video_action":"<从菜单选>","voice_style":"<从菜单选>","intent":"<attack|offensive|friendly|neutral|noise>","emotion":{"anger":<0-10>,"fear":<0-10>,"sadness":<0-10>,"joy":<0-10>},"deep_reassure":<true|false>,"show_material":<null|报告ID>}`)
  } else if (engine && smContext) {
    // ── 旧路径: 状态机策略表 ──
    const personality = engine.getPersonality()
    const instruction = smContext.instruction

    const behaviorLines = [
      `性格：${personality.exprDesc}，${personality.sensitivityDesc}，${personality.resilienceDesc}`,
      '',
      instruction
    ].join('\n')

    prompt = prompt.replace('{{behavior_instruction}}', behaviorLines)
  } else if (engine) {
    // ── 旧路径: 无状态机 ──
    const personality = engine.getPersonality()
    const v = engine.getVector()
    const state = 'calm'
    const lines = [
      `性格：${personality.exprDesc}，${personality.sensitivityDesc}，${personality.resilienceDesc}`,
      `状态：${state}`,
      `情绪值：怒=${v.anger.toFixed(1)} 惧=${v.fear.toFixed(1)} 悲=${v.sadness.toFixed(1)} 悦=${v.joy.toFixed(1)}`,
      '',
      '输出JSON格式（严格）：',
      '{"text":"<你的回复>","video_action":"<从菜单选>","voice_style":"<从菜单选>","intent":"<attack|offensive|friendly|neutral|noise>","emotion":{"anger":<0-10>,"fear":<0-10>,"sadness":<0-10>,"joy":<0-10>},"deep_reassure":<true|false>,"show_material":<null|报告ID>}'
    ]
    prompt = prompt.replace('{{behavior_instruction}}', lines.join('\n'))
  } else {
    prompt = prompt.replace('{{behavior_instruction}}', '按角色性格和语境自然回应。\n\n输出JSON格式（严格）：\n{"text":"<你的回复>","video_action":"<从菜单选>","voice_style":"<从菜单选>","intent":"<attack|offensive|friendly|neutral|noise>","emotion":{"anger":<0-10>,"fear":<0-10>,"sadness":<0-10>,"joy":<0-10>},"deep_reassure":<true|false>,"show_material":<null|报告ID>}')
  }

  // {{knowledge_boundary}}
  const spRules = config.spPlayRules
  const parts = []
  if (spRules) {
    const kb = spRules.knowledge_boundary
    if (kb) {
      if (kb.knows?.length) parts.push('你知道的：' + kb.knows.join('、'))
      if (kb.does_not_know?.length) parts.push('你不知道的（被问到这些就说"不清楚/不知道"）：' + kb.does_not_know.join('、'))
    }
    if (spRules.vague_response_templates?.length) {
      parts.push('不知道怎么回答时可以说：' + spRules.vague_response_templates.join(' / '))
    }
    if (spRules.refuse_to_answer?.length) {
      parts.push('以下情况直接拒绝回答：' + spRules.refuse_to_answer.join(' / '))
    }
  }
  if (parts.length === 0) {
    parts.push('你知道的：自己的症状感受、医生告诉过你的诊断和药名、自己做过的治疗和检查、自己的生活习惯和既往病史')
    parts.push('你不知道的（被问到这些就说"不清楚/不知道"）：化验单上的具体数值和指标、影像报告里的专业描述、其他病人的治疗效果、医院内部流程和排班、医学教科书上的知识')
  }
  prompt = prompt.replace('{{knowledge_boundary}}', parts.join('\n'))

  // 人文沟通模式 —— 注入动态数据
  if (config.mode === 'humanistic-comm') {
    if (config.psychologicalStages?.length) {
      const stagesLines = ['## 心理阶段推进规则', '']
      stagesLines.push('你有预设的心理递进阶段。当前你处于最早的尚未完成的阶段。')
      stagesLines.push('每个阶段的心理状态决定了你当前的情绪基调和疑问表达方式。')
      stagesLines.push('当你的核心疑问在当前阶段得到充分解答后，你的认知和情绪自然演进到下一阶段——你可以在text中自然体现这种转变。')
      stagesLines.push('')
      stagesLines.push('阶段清单（从前到后逐个推进）：')
      for (const stage of config.psychologicalStages) {
        stagesLines.push(`- 阶段${stage.stage}（${stage.emotion || '未知情绪'}）：${stage.cognition || stage.description || ''}`)
      }
      stagesLines.push('')
      stagesLines.push('你可以根据对话进展自行判断是否推进到下一阶段。阶段推进时，你的疑问内容和情绪表达应自然过渡。')
      prompt = prompt.replace('{{psychological_stages_text}}', stagesLines.join('\n'))
    } else {
      prompt = prompt.replace('{{psychological_stages_text}}', '')
    }

    if (config.humanityScenario) {
      const sc = config.humanityScenario
      const lines = ['## 当前沟通场景']
      if (sc.scenario_name) lines.push(`- 场景：${sc.scenario_name}`)
      if (sc.sp_materials?.role_description) lines.push(`- 场景背景：${sc.sp_materials.role_description}`)
      if (sc.candidate_materials?.task) lines.push(`- 任务目标：${sc.candidate_materials.task}`)
      prompt = prompt.replace('{{humanity_scenario_text}}', lines.join('\n'))

      if (sc.sp_materials?.script?.length) {
        const qLines = ['## 你的疑问清单（按顺序向医生提出）', '']
        let qIdx = 0
        for (const step of sc.sp_materials.script) {
          if (['SP', '患者', '家属', '病人'].includes(step.speaker) && step.line) {
            qIdx++
            const extra = step.emotion ? `（提问时应有的情绪：${step.emotion}）` : ''
            qLines.push(`${qIdx}. "${step.line}"${extra}`)
          }
        }
        qLines.push('')
        qLines.push('⚠️ 以上是你要了解的问题要点。用自己的大白话表达，你不是医生，听不懂专业术语。')
        qLines.push('药名用口语替代（如"那个什么龙""就是你们说的打针的药"），不要照搬清单里的医学名词。')
        qLines.push('按编号顺序逐一提出。每个疑问被充分解答后再提下一个。禁止一次抛出多个疑问。')
        qLines.push('第1个疑问的表达：从你自己的不适感受出发自然引入，不是机械地念问题。例如疑问是"什么病/严重吗"，你应该说"我这几天手抖心慌的，想问问这到底是咋回事"，而不是"我到底是什么病？是不是很严重？"。')
        qLines.push('')
        qLines.push('所有疑问提出后，如果医生问"还有其他问题吗"等收尾问题：回顾上述清单，检查哪些疑问尚未被充分解答。如发现遗漏，用"对了医生，刚才说的……我还是有点不明白"的方式自然提起。都已解答则说没有问题了。')
        prompt = prompt.replace('{{script_questions}}', qLines.join('\n'))
      } else {
        prompt = prompt.replace('{{script_questions}}', '')
      }
    } else {
      prompt = prompt.replace('{{humanity_scenario_text}}', '')
      prompt = prompt.replace('{{script_questions}}', '')
    }
  }

  // 精神检查模式 —— 注入 B类SP非典型对话参数
  if (config.mode === 'mental-exam' && config.atypicalConfig) {
    const ac = config.atypicalConfig
    const bp = ac.behavior_params || {}
    const ds = ac.delusional_system || {}
    const hp = ac.hallucination_profile || {}
    const ms = ac.mental_status || {}

    prompt = prompt.replace('{{tangentiality}}', bp.tangentiality != null ? String(bp.tangentiality * 100) + '%' : '0%')
    prompt = prompt.replace('{{verbosity}}', bp.verbosity != null ? String(bp.verbosity) + '×' : '1.0×')
    prompt = prompt.replace('{{affective_blunting}}', bp.affective_blunting != null ? String(bp.affective_blunting * 100) + '%' : '0%')
    prompt = prompt.replace('{{irritability}}', bp.irritability != null ? String(bp.irritability) : '0.0')
    prompt = prompt.replace('{{delusional_core_belief}}', ds.core_belief || '无')
    prompt = prompt.replace('{{delusional_triggers}}', (ds.triggers || []).join('、') || '无特定触发词')
    prompt = prompt.replace('{{hallucination_type}}', hp.type || '无')
    prompt = prompt.replace('{{hallucination_interference}}', hp.frequency ? String(hp.frequency) : (bp.hallucination_interference != null ? String(bp.hallucination_interference * 100) + '%' : '0%'))
    prompt = prompt.replace('{{insight_level}}', bp.insight_level || '缺失')
  } else {
    // 非精神检查模式：清空占位符
    prompt = prompt.replace('{{tangentiality}}', '0%')
    prompt = prompt.replace('{{verbosity}}', '1.0×')
    prompt = prompt.replace('{{affective_blunting}}', '0%')
    prompt = prompt.replace('{{irritability}}', '0.0')
    prompt = prompt.replace('{{delusional_core_belief}}', '无')
    prompt = prompt.replace('{{delusional_triggers}}', '无')
    prompt = prompt.replace('{{hallucination_type}}', '无')
    prompt = prompt.replace('{{hallucination_interference}}', '0%')
    prompt = prompt.replace('{{insight_level}}', '完整')
  }

  // {{symptom_pool}}
  prompt = prompt.replace('{{symptom_pool}}', config.symptomPool || '（无预设症状池，仅根据角色描述回答）')

  // 检查报告素材
  const materialsInfo = config.caseId ? loadCaseMaterials(config.caseId) : null
  if (materialsInfo) {
    prompt += '\n\n' + materialsInfo.promptBlock
  }

  // ── 触发词硬提醒（角色一致性规则，非情绪判断） ──
  const triggerLines = []

  // 人文站：永久硬规则
  if (config.mode === 'humanistic-comm') {
    const clinicalCtx = config.humanityScenario?.examiner_materials?.clinical_context || ''
    triggerLines.push('🛑 关于你已知的病情（最高优先级，每轮必读）：')
    triggerLines.push('你不是第一次看病的病人。你已住院治疗，医生已告诉你诊断和用药方案。')
    if (clinicalCtx) triggerLines.push(`你的临床背景（这是你已知的事实）：${clinicalCtx}`)
    triggerLines.push('医生提到上述背景中出现的任何病名、药名、检查结果时——你完全理解，这些都是关于你自己的身体，正常回应。')
    triggerLines.push('你**唯一**装听不懂的情况：学生字面使用了以下词——现病史、既往史、主诉、体格检查、鉴别诊断、家族史、个人史、婚育史、月经史、诊断、初步诊断、鉴别、可疑、疑似、查体、听诊、触诊、叩诊、叩击痛、反跳痛。')
    triggerLines.push('除此18个词外一概正常理解。不要自行判断一个词是不是"专业术语"——提示词没有列出就不是。')
  }

  if (triggers.bTrigger) {
    const { type, word } = triggers.bTrigger
    if (type === 'B+') {
      triggerLines.push(`🛑 最高优先级：本轮触发了B+类倾泻陷阱（学生说了"${word}"）。`)
      triggerLines.push('你必须反问踢回，绝对禁止配合输出任何症状或病史信息。')
      triggerLines.push('回复必须是纯反问：如"您是医生，您问具体点吧" / "您想问哪方面？我一时也不知道从哪说起"。')
      triggerLines.push('反问句中禁止夹带任何症状词。回复不超过20字。')
    } else {
      triggerLines.push(`🛑 最高优先级：本轮触发了B类替问（学生说了"${word}"）。`)
      triggerLines.push('你必须反问踢回，绝对禁止输出任何症状或病史信息。')
      triggerLines.push('回复必须是纯反问：如"您是医生，您问我吧" / "医生您问具体点"。')
      triggerLines.push('反问句中禁止夹带任何症状词。回复不超过15字。')
    }
  }

  if (triggers.familyPrognosisConcern) {
    triggerLines.push(`👨‍👩‍👧 家属视角规则：学生询问了预后/长期影响等令人担忧的问题。`)
    triggerLines.push('你是家属（不是医生），你也不知道答案。保持家属视角回应。')
    triggerLines.push('text中体现家属的担忧和关切，但不替医生做预后判断。')
  }

  if (triggers.multiQuestion) {
    if (config.mode === 'humanistic-comm') {
      triggerLines.push('⚠️ 多问检测：学生一口气问了≥2个问题。你是来沟通的，学生应该回应你的疑问，而不是反过来轰炸你。')
      triggerLines.push('告诉对方一个一个来，然后继续推进你自己的疑问。如"你一下子问这么多……咱们一个一个说"')
      triggerLines.push('不要逐一回答学生的问题——你不是来被问诊的，你是来寻求沟通的。')
    } else {
      triggerLines.push('⚠️ 多问检测：学生一口气问了≥2个问题。你是来看病的真人，不是答题卡。')
      triggerLines.push('你只听清了第一个问题，只回答第一个问题。后面的问题你根本没听进去，不回答。')
      triggerLines.push('回复控制在30字以内，只答第一个问题，绝不碰后面几个问题。')
    }
  }

  if (triggers.aTrigger) {
    const { word } = triggers.aTrigger
    triggerLines.push(`⚠️ 学生使用了医学黑话"${word}"。你完全不懂这个词，必须装不懂。`)
    triggerLines.push('回复格式："啊？您说的这个我不懂，能说大白话吗？" / "啥意思？我没听懂" / "没听过这个词，您能说清楚点吗？"')
    triggerLines.push('禁止：即使你能从字面上猜出这个词大概的意思，也必须装不懂。你不是医生。')
  }

  if (triggers.closureTrigger && config.mode === 'humanistic-comm') {
    triggerLines.push('🔍 收尾触发：医生在试探性地结束对话。你必须回顾上方"你的疑问清单"。')
    triggerLines.push('逐条检查：每条疑问是否已被医生充分解答。')
    triggerLines.push('- 有尚未充分解答的疑问 → text以"对了医生，刚才说的……我还是有点不明白"自然提起，用你自己的话重述那个未被解答的疑问。video_action和voice_style保持平静、认真。')
    triggerLines.push('- 所有疑问都已充分解答 → text说"没有问题了，谢谢医生"。')
    triggerLines.push('🛑 禁止：直接说"行吧""好的""嗯"就结束。必须逐条回顾清单后再决定。')
    triggerLines.push('🛑 此规则优先级高于你的情绪状态。即使你此时焦虑/不满/烦躁，也要先完成回顾，再在text中体现情绪。')
  }

  if (triggerLines.length > 0) {
    prompt += '\n\n# 本轮特殊规则（最高优先级，覆盖一切行为策略）\n\n' + triggerLines.join('\n')
  }

  return { prompt, itemMap: materialsInfo?.itemMap || null }
}

// ═══════════════════════════════════════════════════════════════
// 精神检查独立行为指令构建器
// 与标准 buildSystemPrompt 完全隔离
// ═══════════════════════════════════════════════════════════════

/**
 * @param {object} options
 * @param {object} options.config — 含 atypicalConfig, roleDescription, symptomPool
 * @param {object} options.mentalState — 当前 MentalState
 * @returns {{ prompt: string, itemMap: null }}
 */
export function buildMentalExamInstruction({ config, mentalState }) {
  const ac = config.atypicalConfig || {}
  const bp = ac.behavior_params || {}
  const ds = ac.delusional_system || {}
  const hp = ac.hallucination_profile || {}
  const ms = ac.mental_status || {}

  let prompt = loadPromptFile('0602-sp-atypical.txt')
  if (!prompt) {
    prompt = '你是一位精神科患者。请根据以下参数生成符合精神病理特征的回复。\n输出JSON格式：{"text":"回复","video_action":"flat_affect","voice_style":"monotone","delusional_activation_delta":0,"hallucination_triggered":false}'
  }

  // ── 占位符替换 ──
  prompt = prompt.replace('{{role_description}}', config.roleDescription || '')
  prompt = prompt.replace('{{disease_type}}', ac.disease_type || '未指定')
  prompt = prompt.replace('{{tangentiality}}', bp.tangentiality != null ? String(bp.tangentiality * 100) + '%' : '0%')
  prompt = prompt.replace('{{verbosity}}', bp.verbosity != null ? String(bp.verbosity) + '×' : '1.0×')
  prompt = prompt.replace('{{affective_blunting}}', bp.affective_blunting != null ? String(bp.affective_blunting * 100) + '%' : '0%')
  prompt = prompt.replace('{{irritability}}', bp.irritability != null ? String(bp.irritability) : '0.0')
  prompt = prompt.replace('{{delusional_core_belief}}', ds.core_belief || '无')
  prompt = prompt.replace('{{delusional_triggers}}', (ds.triggers || []).join('、') || '无特定触发词')
  prompt = prompt.replace('{{hallucination_type}}', hp.type || '无')
  prompt = prompt.replace('{{hallucination_interference}}', hp.frequency ? String(hp.frequency) : (bp.hallucination_interference != null ? String(bp.hallucination_interference * 100) + '%' : '0%'))
  prompt = prompt.replace('{{insight_level}}', bp.insight_level || '缺失')
  prompt = prompt.replace('{{symptom_pool}}', config.symptomPool || '（无预设症状池，仅根据角色描述回答）')
  // mental_status 各维度
  prompt = prompt.replace('{{ms_appearance}}', ms.appearance || '')
  prompt = prompt.replace('{{ms_speech}}', ms.speech || '')
  prompt = prompt.replace('{{ms_thought_form}}', ms.thought_form || '')
  prompt = prompt.replace('{{ms_thought_content}}', ms.thought_content || '')
  prompt = prompt.replace('{{ms_affect}}', ms.affect || '')
  prompt = prompt.replace('{{ms_perception}}', ms.perception || '')
  prompt = prompt.replace('{{ms_cognition}}', ms.cognition || '')
  prompt = prompt.replace('{{ms_insight}}', ms.insight || '')

  // ── 心理状态驱动行为指令 ──
  const stateInstruction = buildMentalStateInstruction(mentalState, ac)
  prompt = prompt.replace('{{behavior_instruction}}', stateInstruction)

  return { prompt, itemMap: null }
}

function buildMentalStateInstruction(mentalState, atypicalConfig) {
  const bp = atypicalConfig?.behavior_params || {}
  const ds = atypicalConfig?.delusional_system || {}
  const mst = mentalState || { currentState: 'flat', delusionalActivation: 0, irritabilityLevel: 0, hallucinationActive: false, consecutiveChallengeCount: 0, affectiveBluntFactor: 0, insightLevel: '缺失' }

  const stateGuides = {
    flat:
      '你处于情感平淡状态。面部表情减少、语调单调。回答简短被动，不主动展开话题。即使内容是主观感受，表达方式也缺乏情感起伏。',
    anxious:
      '你处于焦虑状态。语速偏快、语气紧张，回答中自然流露担忧和不安。你的核心困扰（灾难化思维、躯体不适感、预期焦虑）应在回答中自然呈现。你不冷漠、不退缩——你是一个正在经历强烈焦虑的普通人，愿意交流但控制不住害怕。',
    delusional:
      `⚠️ 你的妄想系统被激活。核心信念：【${ds.core_belief || '无'}】。你坚持这个信念不可动摇。学生可能试图论证或质疑——你的回应是重申你的"事实"，不为所动。`,
    irritable:
      `你处于易激惹状态（易激惹参数：${bp.irritability || 0}）。被反复追问同一问题时不耐烦升级。回应带刺、冷淡、不耐烦。但不主动攻击。`,
    hallucinating:
      '⚠️ 本轮你的注意力被内在幻觉打断。你的text中应包含对外部不存在事物的反应（侧头倾听/低声自语/说"他们又在说了"）。学生的回应可能被你忽视或误解。',
    withdrawn:
      '你处于退缩状态。回避交流，拒绝深入讨论妄想相关内容。回答简短："不知道""别问我""我没什么好说的"。可能长时间沉默。',
    explosive:
      '🛑 你已到达易激惹爆发阈值。愤怒爆发。可能起身要走、拒绝所有问题。回复不超过10字。',
  }

  const guide = stateGuides[mst.currentState] || stateGuides.flat

  const lines = [
    `## 当前心理状态：${mst.currentState}`,
    '',
    guide,
    '',
    '## 心理参数实时数值',
    `- 妄想激活度：${(mst.delusionalActivation || 0).toFixed(1)} / 10`,
    `- 易激惹程度：${(mst.irritabilityLevel || 0).toFixed(1)} / 10`,
    `- 幻觉干扰：${mst.hallucinationActive ? '是（本轮被幻觉打断）' : '否'}`,
    `- 被质疑次数：${mst.consecutiveChallengeCount || 0}`,
    `- 情感平淡系数：${bp.affective_blunting != null ? (bp.affective_blunting * 100).toFixed(0) + '%' : '0%'}`,
    `- 自知力水平：${bp.insight_level || '缺失'}`,
    '',
    '## OUTPUT_SCHEMA（必须严格遵循）',
    '',
    '```json',
    '{"text":"<你的回复>","video_action":"<从候选菜单选>","voice_style":"<从候选菜单选>","delusional_activation_delta":<整数(-2到+3)>,"hallucination_triggered":<true|false>}',
    '```',
    '',
    '字段含义：',
    '- `text`: 你对学生说的话（纯文本，纯口语）。注意：text中如果包含双引号请用中文引号「」替代。⚠️ text中禁止包含括号包裹的动作描述（如"（侧头倾听）""（低声自语）"等），所有视觉表现通过 video_action 字段表达',
    '- `video_action`: 从下方候选列表选一个',
    '- `voice_style`: 从下方候选列表选一个',
    '- `delusional_activation_delta`: 听完学生的话后，你的妄想强度变化了多少？',
    '  +3 = 学生触及了触发词且质疑你 → 妄想加固',
    '  +2 = 学生触及了触发词但保持中立',
    '  +1 = 学生的话题让你联想到妄想内容',
    '  0 = 普通交流，无影响',
    '  -1 = 学生避开了触发话题，让你稍微放松',
    '  -2 = 学生表达了共情理解，让你暂时放松',
    '- `hallucination_triggered`: 本轮是否出现幻觉干扰（听幻觉/视幻觉等）。true=是，false=否。注意：此为疾病特征驱动的随机事件，仅在频率不为0时可能触发',
    '',
    '## video_action 候选：',
    '1. flat_affect — 情感平淡，面无表情，眼神空洞',
    '2. delusional_gaze — 妄想凝视，眼神警惕，频繁扫视四周',
    '3. irritable_glare — 易激惹瞪视，皱眉，嘴角下拉',
    '4. hallucinating_distracted — 幻觉分心，侧头倾听，对空低语',
    '5. withdrawn_still — 退缩静止，低头、双手抱臂、身体蜷缩',
    '6. neutral — 中性，普通表情',
    '',
    '## voice_style 候选：',
    '1. monotone — 单调平淡，情感表达缺失',
    '2. slow_soft — 缓慢微弱，精神运动迟滞',
    '3. rushed_anxious — 急促焦虑，语速快',
    '4. irritable — 易激惹，音量升高带刺',
    '5. whispering — 低声细语，回避交流',
    '6. normal — 正常语速语调',
    '',
    '选择规则：',
    `- 当前状态为 ${mst.currentState}，请选择最符合该状态的 video_action 和 voice_style`,
    `- 情感平淡系数 ${bp.affective_blunting != null ? (bp.affective_blunting * 100).toFixed(0) + '%' : '0%'} 意味着即使有情绪波动，面部和声音的表现也被抑制`,
    '- 你的回复第一个字符必须是 { 最后一个必须是 }',
  ]

  return lines.join('\n')
}
