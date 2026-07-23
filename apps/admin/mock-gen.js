import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getSpecialty } from '../../packages/shared/data/specialty-registry.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CASES_DIR = path.resolve(__dirname, 'public/data/cases')

// ── Mock 数据模板库 ──────────────────────────────────────

const NAMES_POOL = {
  '男': ['张明', '王德胜', '李建国', '赵强', '陈伟', '刘洋', '周磊', '吴刚', '郑华', '钱勇'],
  '女': ['李芳', '王秀英', '张丽', '赵敏', '陈静', '刘娟', '周婷', '吴娜', '郑红', '钱雪']
}

const OCCUPATIONS = ['公司职员', '教师', '退休工人', '农民', '个体工商户', '公务员', '工程师', '自由职业', '司机', '学生']


const LEVEL_TO_PHASE = { 'U1': '本科教学', 'U2': '本科教学', 'R1': '住院医师', 'R2': '住院医师', 'R3': '住院医师', 'F1': '专科培训', 'F2': '专科培训' }

// 根据病种生成 mock 基础数据
const DISEASE_TEMPLATES = {
  '高血压': {
    symptoms: ['头晕', '头痛', '心悸'],
    chief_complaint: '反复头晕、头痛2年，加重1周',
    present_illness: '患者于2年前无明显诱因出现头晕、头痛，呈持续性胀痛，以枕部为著，伴心悸，无恶心呕吐，无视力模糊。曾在社区医院测血压160/95mmHg，诊断为"高血压"，间断口服"硝苯地平缓释片"治疗，血压控制欠佳。近1周因工作压力大，上述症状加重，伴失眠、乏力。自测血压最高达180/105mmHg。为求进一步诊治来我院。',
    physical_exam: { vital_signs: 'T:36.5℃ P:88次/分 R:20次/分 BP:175/100mmHg', general: '神志清楚，体型偏胖，BMI 27.3kg/m²，自动体位，查体合作', systemic: '颈静脉无充盈。双肺呼吸音清。心界不大，心率88次/分，律齐，A2亢进，各瓣膜听诊区未闻及病理性杂音。腹软，无压痛。双下肢无水肿。' },
    past_history: '否认糖尿病、冠心病史。否认肝炎、结核等传染病史。',
    personal_history: '吸烟史20年，每日1包。偶饮酒。饮食偏咸。久坐办公，缺乏规律运动。',
    diagnosis: { preliminary: '原发性高血压2级（高危）', differential: ['继发性高血压', '白大衣高血压'], basis: ['血压180/105mmHg，达2级标准', '有吸烟、高盐饮食等危险因素', '排除继发性高血压常见病因'] },
    treatment_plan: '1. 非药物治疗：低盐低脂饮食、戒烟限酒、规律运动\n2. 药物治疗：氨氯地平5mg qd + 厄贝沙坦150mg qd\n3. 监测血压，2周后复诊',
    teaching_points: ['高血压分级标准', '继发性高血压的鉴别要点', '高血压的非药物治疗原则']
  },
  '急性心肌梗死': {
    symptoms: ['胸痛', '胸闷', '出汗', '呼吸困难'],
    chief_complaint: '持续性胸骨后压榨样疼痛3小时',
    present_illness: '患者于3小时前无明显诱因突发胸骨后压榨样疼痛，范围约手掌大小，向左肩及左上肢放射，伴冷汗、恶心，呼吸困难。休息及含服"硝酸甘油"1片后疼痛无明显缓解。发病以来意识清楚，大小便未解。',
    physical_exam: { vital_signs: 'T:36.2℃ P:102次/分 R:24次/分 BP:100/65mmHg', general: '急性痛苦面容，面色苍白，大汗淋漓，神志清楚', systemic: '双肺底可闻及少量湿啰音。心界不大，心率102次/分，律不齐，可闻及期前收缩，心音低钝。腹部查体无异常。' },
    past_history: '有高血压病史10年，最高达170/100mmHg，规律服药但控制一般。有高脂血症5年。',
    personal_history: '吸烟史30年，每日1包。偶尔饮酒。',
    diagnosis: { preliminary: '急性广泛前壁心肌梗死', differential: ['不稳定型心绞痛', '主动脉夹层', '急性肺栓塞'], basis: ['持续性胸痛3小时，含服硝酸甘油无效', '心电图示V1-V5导联ST段抬高', '心肌酶谱明显升高'] },
    treatment_plan: '1. 绝对卧床休息，心电监护\n2. 急诊PCI治疗\n3. 抗血小板、抗凝、调脂稳定斑块\n4. 对症支持治疗',
    teaching_points: ['急性心肌梗死的心电图演变', '胸痛鉴别诊断', '急诊PCI的时间窗']
  },
  'default': {
    symptoms: ['发热', '乏力'],
    chief_complaint: '发热伴乏力3天',
    present_illness: '患者于3天前受凉后出现发热，体温最高38.6℃，伴畏寒、全身乏力、食欲减退。自行服用"感冒药"后体温可暂时下降，但反复升高。今为进一步诊治来我院。发病以来，精神食欲欠佳，大小便正常。',
    physical_exam: { vital_signs: 'T:38.2℃ P:92次/分 R:20次/分 BP:120/80mmHg', general: '神志清楚，发育正常，营养中等，自动体位', systemic: '咽部充血，扁桃体无肿大。双肺呼吸音清晰。心率92次/分，律齐。腹软，无压痛。' },
    past_history: '既往体健，否认高血压、糖尿病等慢性病史。',
    personal_history: '无特殊不良嗜好。',
    diagnosis: { preliminary: '急性上呼吸道感染', differential: ['流行性感冒', '急性支气管炎'], basis: ['发热、咽部充血等上呼吸道症状', '起病急，病程短'] },
    treatment_plan: '1. 休息，多饮水\n2. 对症退热治疗\n3. 观察病情变化',
    teaching_points: ['发热的鉴别诊断思路', '上呼吸道感染的病原学', '合理使用抗生素原则']
  }
}

const CATEGORY_MAP = {
  '心内科': '内科', '消化内科': '内科', '呼吸内科': '内科', '神经内科': '神经内科',
  '骨科': '骨科', '普外科': '外科', '产科': '妇产科', '小儿内科': '儿科',
  '急诊内科': '急诊科', '皮肤科': '皮肤科', '眼科': '眼科', '耳鼻喉科': '耳鼻喉科'
}

function getTemplate(disease, specialty) {
  const key = Object.keys(DISEASE_TEMPLATES).find(k => disease && disease.includes(k))
  const tpl = key ? DISEASE_TEMPLATES[key] : DISEASE_TEMPLATES['default']
  return { ...tpl, specialty, disease: disease || '待定' }
}

function generateCaseId(specialty) {
  const sp = getSpecialty(specialty)
  const abbr = sp ? sp.abbr : 'IM'
  const now = new Date()
  const dateStr = now.getFullYear() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0')
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `${abbr}-${dateStr}-${rand}`
}

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)] }

// ── 各步骤 Mock 数据生成 ──────────────────────────────────

function mockBasic(config) {
  const tpl = getTemplate(config.disease, config.specialty)
  const gender = pick(['男', '女'])
  const name = pick(NAMES_POOL[gender])
  const age = pick(['35', '42', '48', '52', '58', '63', '55', '45', '38', '60'])
  const caseId = generateCaseId(config.specialty)
  const now = new Date().toISOString().slice(0, 10)

  return {
    case_id: caseId,
    title: `${tpl.disease}诊疗病例`,
    specialty: config.specialty || '内科',
    communication_target: config.specialty === '儿科' || config.specialty === '精神科' ? 'family' : 'patient',
    category: config.category || '',
    disease: config.disease || tpl.disease,
    teaching_phase: config.teaching_phase || 'R1',
    training_phase: LEVEL_TO_PHASE[config.teaching_phase] || '住院医师',
    version: 'v1.0',
    record_date: now,
    patient_info: { name, sex: gender, age },
    chief_complaint: tpl.chief_complaint,
    present_illness: tpl.present_illness,
    past_history: tpl.past_history,
    personal_history: tpl.personal_history,
    family_history: '父母体健，否认家族性遗传病史。',
    general_condition: `发病以来，神志清楚，精神可，食欲减退，睡眠欠佳，大小便正常，近期体重无明显变化。`,
    review_of_systems: `呼吸系统：无咳嗽咳痰。循环系统：${tpl.symptoms.includes('心悸') || tpl.symptoms.includes('胸痛') ? '见现病史。' : '无心悸胸闷。'}消化系统：无恶心呕吐，无腹痛腹泻。泌尿系统：无尿频尿急。`,
    symptoms: tpl.symptoms,
    physical_exam: tpl.physical_exam,
    lab_tests: '血常规：WBC 8.5×10⁹/L，N 72%，Hb 135g/L，PLT 210×10⁹/L\n尿常规：未见明显异常\n生化全项：ALT 28U/L，AST 32U/L，Cr 82μmol/L，K⁺ 4.1mmol/L',
    imaging: '胸部X线：双肺纹理增粗，心影大小形态正常。',
    special_exams: '心电图：窦性心律，大致正常心电图。',
    diagnosis: tpl.diagnosis,
    treatment_plan: tpl.treatment_plan,
    teaching_points: tpl.teaching_points,
    specialty_focus: `重点掌握${tpl.disease}的临床表现、诊断标准和治疗原则。`,
    admission_info: {
      admission_time: `${now} 10:30`,
      admission_department: config.category || config.specialty + '科',
      admission_diagnosis: tpl.diagnosis.preliminary
    }
  }
}

function mockScoreSheet(config, basicData) {
  const disease = (basicData && basicData.disease) || config.disease || ''
  const diag = (basicData && basicData.diagnosis) || {}
  const preliminary = diag.preliminary || disease

  return {
    score_sheet: [
      { id: 1, category: '病史采集', item: '询问主要症状及其特点', group_score: 15, key_point: '主诉症状的部位、性质、持续时间、诱因、缓解因素', score: 15, rules: '每项2分，共5项' },
      { id: 2, category: '病史采集', item: '询问伴随症状', group_score: 10, key_point: '相关的阳性/阴性伴随症状', score: 10, rules: '每个有效症状2分' },
      { id: 3, category: '病史采集', item: '询问既往史及危险因素', group_score: 10, key_point: '高血压、糖尿病、吸烟饮酒史等', score: 10, rules: '每项2分' },
      { id: 4, category: '体格检查', item: '生命体征测量', group_score: 10, key_point: '体温、脉搏、呼吸、血压', score: 10, rules: '每项2.5分' },
      { id: 5, category: '体格检查', item: '系统体格检查', group_score: 15, key_point: '与主诉相关的系统查体', score: 15, rules: '每项3分' },
      { id: 6, category: '诊断能力', item: `提出初步诊断：${preliminary}`, group_score: 20, key_point: '诊断准确且有依据', score: 20, rules: '诊断正确15分，依据5分' },
      { id: 7, category: '诊断能力', item: '鉴别诊断', group_score: 10, key_point: '列出2-3个鉴别诊断并说明理由', score: 10, rules: '每个鉴别诊断3分，理由1分' },
      { id: 8, category: '治疗计划', item: '制定初步治疗方案', group_score: 10, key_point: '包括药物和非药物治疗', score: 10, rules: '药物治疗5分，非药物治疗5分' }
    ]
  }
}

function mockReception(config, basicData) {
  const pi = (basicData && basicData.patient_info) || {}
  const name = pi.name || '患者'
  const gender = pi.sex || '男'
  const age = pi.age || '50'
  const disease = (basicData && basicData.disease) || config.disease || ''
  const chief = (basicData && basicData.chief_complaint) || '身体不适'

  return {
    sp_materials: {
      role_info: {
        name, gender, age,
        emotion: pick(['焦虑', '紧张', '担忧', '平静']),
        active_question: `医生，我${chief.substring(0, 20)}...这是怎么回事？`
      },
      self_narration: `我叫${name}，今年${age}岁。最近${chief}`,
      qa_script: [
        { question: '您哪里不舒服？', answer: `${chief}` },
        { question: '这种情况持续多久了？', answer: '有好几天了，具体记不太清。' },
        { question: '之前有看过医生吗？', answer: '在社区医院看过，吃了点药。' },
        { question: '有没有什么药物过敏？', answer: '没有。' },
        { question: '家里人有类似的病吗？', answer: '没太注意。' }
      ]
    },
    examiner_materials: {
      history_score_items: [
        { item: '询问主诉（部位、性质、持续时间、诱因）', keywords: chief.split(/[，,、]+/).slice(0, 3) },
        { item: '询问伴随症状', keywords: [] },
        { item: '询问既往史', keywords: ['高血压', '糖尿病', '手术'] },
        { item: '询问个人史及家族史', keywords: ['吸烟', '饮酒', '家族'] }
      ],
      physical_score_items: [
        { item: '生命体征检查', keywords: ['体温', '脉搏', '呼吸', '血压'] },
        { item: '专科体格检查', keywords: [] },
        { item: '阳性体征识别', keywords: [] }
      ],
      diagnosis_answer: {
        primary: (basicData && basicData.diagnosis && basicData.diagnosis.preliminary) || disease,
        basis_points: [(basicData && basicData.diagnosis && basicData.diagnosis.basis) || []].flat(),
        differential: (basicData && basicData.diagnosis && basicData.diagnosis.differential) || []
      },
      positive_signs: {}
    },
    candidate_materials: {
      physical_exam_card: '请在此记录您的体格检查发现。',
      task: `请对SP进行病史采集和重点体格检查，时间为15分钟。任务：1. 完成病史采集 2. 进行重点体格检查 3. 做出初步诊断及鉴别诊断`
    }
  }
}

function mockAnalysis(config, basicData) {
  const disease = (basicData && basicData.disease) || config.disease || ''
  const level = config.teaching_phase || 'R1'
  const stepsMap = { U1: 2, U2: 3, R1: 3, R2: 4, R3: 5, F1: 5, F2: 6 }
  const n = stepsMap[level] || 3

  const stepDefs = [
    { title: '初步诊断', presented: '请根据以下病例信息，做出初步诊断并列出诊断依据。', info: '该患者的核心临床表现符合典型病例特征，需注意与其他疾病鉴别。', question: `请列出该病例的初步诊断及诊断依据。`, answer: `初步诊断：${disease}\n诊断依据：\n1. 患者临床表现典型\n2. 相关检查结果支持\n3. 排除其他可能疾病` },
    { title: '鉴别诊断', presented: '请列出至少2个需要鉴别的疾病，并说明鉴别要点。', info: '鉴别诊断需考虑具有类似临床表现的疾病，注意关键鉴别点。', question: '请列出鉴别诊断及鉴别要点。', answer: '鉴别诊断：\n1. 疾病A：鉴别要点为...\n2. 疾病B：鉴别要点为...\n3. 疾病C：鉴别要点为...' },
    { title: '辅助检查', presented: '请说明需要完善的辅助检查项目及其临床意义。', info: '注意检查项目的合理性和必要性，避免过度检查。', question: '请列出需要完善的辅助检查及每项检查的目的。', answer: '辅助检查方案：\n1. 实验室检查：血常规、生化全项...\n2. 影像学检查：胸部X线...\n3. 特殊检查：心电图...' },
    { title: '治疗方案', presented: '请制定该病例的治疗方案。', info: '治疗方案应个体化，包括药物和非药物治疗。', question: '请制定完整的治疗方案。', answer: '治疗方案：\n1. 一般治疗：...\n2. 药物治疗：...\n3. 非药物治疗：...' },
    { title: '病情评估', presented: '请对该病例的病情严重程度进行评估，并说明预后因素。', info: '综合评估病情有助于制定合理的治疗策略。', question: '请评估病情严重程度及预后。', answer: '病情评估：\n1. 严重程度：...\n2. 危险分层：...\n3. 预后因素：...' },
    { title: '综合管理', presented: '请制定该病例的长期管理方案。', info: '慢性病管理需注重长期随访和健康教育。', question: '请制定长期管理方案。', answer: '长期管理方案：\n1. 随访计划：...\n2. 患者教育：...\n3. 多学科协作：...' }
  ]

  const steps = stepDefs.slice(0, n).map((def, idx) => ({
    step: idx + 1,
    title: def.title,
    presented_info: def.presented,
    supplementary_info_for_examiner: def.info,
    question: { text: def.question },
    reference_answer: { detailed_answer: def.answer },
    scoring_guide: [
      { criterion: '内容完整性', max_score: 5, description: '回答覆盖关键要点' },
      { criterion: '逻辑清晰度', max_score: 5, description: '分析和推理过程清晰' },
      { criterion: '专业准确性', max_score: 5, description: '医学知识运用准确' }
    ]
  }))

  return {
    examiner_version: {
      case_summary_for_examiner: `${disease}病例分析，适用于${LEVEL_TO_PHASE[level] || '住院医师'}阶段考核。`,
      key_teaching_points: [
        `${disease}的临床表现和诊断标准`,
        `${disease}的鉴别诊断要点`,
        `${disease}的治疗原则和方案`
      ],
      steps
    },
    candidate_version: {
      case_title: `${disease}病例分析`,
      steps: steps.map(s => ({
        presented_info: s.presented_info,
        question: s.question
      }))
    }
  }
}

function mockHumanity(config, basicData) {
  const disease = (basicData && basicData.disease) || config.disease || ''
  const pi = (basicData && basicData.patient_info) || {}
  const name = pi.name || '患者'

  const scenarios = [
    {
      scenario_id: 'SC001',
      scenario_name: '告知病情',
      layer: '基本信息沟通',
      communication_target: 'patient',
      sp_materials: {
        role_description: `你是一位刚被诊断为${disease}的患者。你对这个诊断感到担忧和困惑，想知道病情有多严重，需要怎么治疗。`,
        opening_line: `医生，我这个病严重吗？会不会有生命危险？`,
        script: [
          { context: '医生告知诊断后', response: '那我这个病严重吗？需要怎么治？' },
          { context: '医生解释病情时', response: '我听不太懂，能说得简单点吗？' },
          { context: '医生提到治疗方案时', response: '要吃药吗？要吃多久？有没有副作用？' }
        ]
      },
      examiner_materials: {
        clinical_context: `患者${name}，初步诊断为${disease}。你需要以通俗易懂的方式告知病情，并回答患者的疑问。`,
        full_dialogue: [],
        reference_answer: {
          key_communication_points: [
            '用通俗语言解释诊断结果',
            '说明疾病的严重程度和预后',
            '介绍治疗方案及其必要性',
            '给予患者情感支持和鼓励'
          ]
        },
        scoring_guide: {
          total_score: 100,
          criteria: [
            { item: '语言通俗易懂', score: 25, description: '避免过多医学术语' },
            { item: '信息完整准确', score: 25, description: '病情说明真实全面' },
            { item: '共情能力', score: 25, description: '关注患者情绪反应' },
            { item: '引导患者参与', score: 25, description: '鼓励患者提问和表达' }
          ]
        }
      },
      candidate_materials: {
        clinical_context: `患者${name}，初步诊断为${disease}。请向患者告知病情并回答其疑问。`,
        task: '请以通俗易懂的方式向患者告知病情，回答其关于诊断、治疗和预后的疑问，并给予必要的情感支持。',
        time_limit: 10,
        note: '注意观察患者情绪变化，适时给予安抚。'
      }
    },
    {
      scenario_id: 'SC002',
      scenario_name: '治疗方案沟通',
      layer: '治疗决策沟通',
      communication_target: 'patient',
      sp_materials: {
        role_description: `你是患者${name}，医生刚刚建议你接受治疗。你对治疗方案有顾虑，特别是担心药物的副作用和治疗费用。`,
        opening_line: `医生，这个治疗一定要做吗？会不会有什么副作用？`,
        script: [
          { context: '医生介绍治疗方案', response: '那这个方案有什么风险吗？' },
          { context: '医生提到药物', response: '这个药副作用大吗？会不会影响我的工作？' }
        ]
      },
      examiner_materials: {
        clinical_context: `患者${name}，诊断为${disease}，需要制定治疗方案。请与患者沟通治疗方案的利弊。`,
        full_dialogue: [],
        reference_answer: {
          key_communication_points: [
            '说明治疗的必要性和获益',
            '坦诚告知可能的副作用和风险',
            '讨论替代方案',
            '尊重患者的知情选择权'
          ]
        },
        scoring_guide: {
          total_score: 100,
          criteria: [
            { item: '治疗必要性说明', score: 25, description: '' },
            { item: '风险告知', score: 25, description: '' },
            { item: '替代方案讨论', score: 25, description: '' },
            { item: '尊重患者自主权', score: 25, description: '' }
          ]
        }
      },
      candidate_materials: {
        clinical_context: `患者${name}，诊断为${disease}。请与患者讨论治疗方案并获取知情同意。`,
        task: '请向患者介绍治疗方案，说明利弊，并回答其关切的问题。',
        time_limit: 10,
        note: ''
      }
    }
  ]

  return { scenarios }
}

function mockMentalExam(config, basicData) {
  const disease = (basicData && basicData.disease) || config.disease || '抑郁症'
  const diseaseTypeMap = {
    '精神分裂症': '精神分裂症（偏执型）',
    '抑郁症': '抑郁症',
    '双相障碍': '双相障碍（抑郁）',
    '躁狂症': '双相障碍（躁狂）',
    '惊恐障碍': '惊恐障碍',
    '广泛性焦虑障碍': '广泛性焦虑障碍',
    '强迫障碍': '强迫障碍',
    '创伤后应激障碍': '创伤后应激障碍',
    '谵妄': '谵妄',
    '阿尔茨海默病': '阿尔茨海默病'
  }
  const diseaseType = Object.keys(diseaseTypeMap).find(k => disease.includes(k))
    ? diseaseTypeMap[Object.keys(diseaseTypeMap).find(k => disease.includes(k))]
    : '抑郁症'

  const paramTable = {
    '精神分裂症（偏执型）': { tangentiality: 0.4, verbosity: 0.8, affective_blunting: 0.6, irritability: 0.35, insight_level: '缺失' },
    '精神分裂症（青春型）': { tangentiality: 0.75, verbosity: 1.0, affective_blunting: 0.4, irritability: 0.3, insight_level: '缺失' },
    '抑郁症': { tangentiality: 0.2, verbosity: 0.6, affective_blunting: 0.65, irritability: 0.2, insight_level: '部分' },
    '双相障碍（躁狂）': { tangentiality: 0.75, verbosity: 2.0, affective_blunting: 0.05, irritability: 0.75, insight_level: '缺失' },
    '双相障碍（抑郁）': { tangentiality: 0.25, verbosity: 0.55, affective_blunting: 0.7, irritability: 0.25, insight_level: '部分' },
    '惊恐障碍': { tangentiality: 0.35, verbosity: 1.25, affective_blunting: 0.05, irritability: 0.65, insight_level: '波动' },
    '广泛性焦虑障碍': { tangentiality: 0.3, verbosity: 1.4, affective_blunting: 0.1, irritability: 0.55, insight_level: '波动' },
    '强迫障碍': { tangentiality: 0.4, verbosity: 1.1, affective_blunting: 0.15, irritability: 0.4, insight_level: '部分' },
    '创伤后应激障碍': { tangentiality: 0.45, verbosity: 0.9, affective_blunting: 0.35, irritability: 0.7, insight_level: '波动' },
    '谵妄': { tangentiality: 0.85, verbosity: 0.9, affective_blunting: 0.05, irritability: 0.75, insight_level: '缺失' },
    '阿尔茨海默病': { tangentiality: 0.5, verbosity: 0.65, affective_blunting: 0.35, irritability: 0.4, insight_level: '缺失' }
  }
  const p = paramTable[diseaseType] || paramTable['抑郁症']

  const mseMap = {
    '精神分裂症（偏执型）': { appearance: '衣着尚整，表情警惕，眼神警觉，坐姿紧张，对周围环境保持高度戒备，偶有自语', speech: '语速正常或偏慢，音量适中，回答谨慎且有选择性，谈及某些话题时出现明显停顿或回避', thought_form: '思维连贯但内容异常，可查及关系妄想和被害妄想，无思维破裂或思维散漫', thought_content: '存在系统性关系妄想和被害妄想，坚信邻居和同事在议论和针对自己，无自杀观念', affect: '情感反应与妄想内容协调，谈及被跟踪和监视事件时表现愤怒和恐惧，情感平淡不明显', perception: '存在评论性幻听，听到有声音在评论自己的行为', cognition: '注意力选择性集中，对与妄想相关的内容警觉，记忆力定向力正常', insight: '无自知力，坚信自己的体验是真实的，拒绝承认有病' },
    '抑郁症': { appearance: '衣着整洁但缺乏修饰，面容憔悴，眼睑下垂，坐姿萎靡，眼神交流少，精神运动性迟滞明显', speech: '语速缓慢、音量低沉、句子简短，回答前有明显停顿和延迟，有时仅以单字或叹息回应', thought_form: '思维迟缓，主诉脑子变慢、思考困难，无明显思维破裂或离题', thought_content: '有自责自罪妄想，认为自己一事无成、拖累家人；存在自杀观念但无具体计划', affect: '情感低落，面部表情愁苦，几乎无愉悦反应，快感缺失，谈及负面事件时易哭泣', perception: '无明显幻觉或错觉', cognition: '注意力减退，记忆力下降，计算力正常，定向力完整', insight: '部分自知力，能意识到情绪不好但倾向于归因为躯体不适或外界压力' },
    '双相障碍（躁狂）': { appearance: '衣着鲜艳夸张，妆容浓艳不合时宜，动作增多，坐立不安，表情丰富多变', speech: '语速极快、音量大、语量明显增多，话题跳跃快速，难以打断，有音联意联', thought_form: '思维奔逸，意念飘忽，随境转移，话题间存在音联和意联但无明显破裂', thought_content: '存在夸大妄想，自称有特殊才能和人脉，计划宏大但不切实际，无自杀观念', affect: '情感高涨，欣快，易笑，但情绪不稳定，易转为激惹或愤怒', perception: '无明显幻觉', cognition: '注意力随境转移，难以集中，计算力正常但速度过快出错，定向力正常', insight: '无自知力，否认自己有病，认为自己状态前所未有的好' }
  }
  const mse = mseMap[diseaseType] || mseMap['抑郁症']

  const delusionMap = {
    '精神分裂症（偏执型）': { core_belief: '邻居和同事通过监控设备监视我的一举一动，并在背后议论和针对我', triggers: ['邻居', '同事', '监控', '跟踪', '监视', '议论'] },
    '抑郁症': { core_belief: '我是一个没有用的人，活着只会拖累家人', triggers: ['家人', '工作', '经济', '未来', '能力', '对不起'] },
    '双相障碍（躁狂）': { core_belief: '我是天才，我的能力远超常人，即将完成改变世界的伟大事业', triggers: ['成就', '创意', '项目', '合作', '投资', '认可'] }
  }
  const delusion = delusionMap[diseaseType] || delusionMap['抑郁症']

  const hallucinationMap = {
    '精神分裂症（偏执型）': { type: '评论性幻听', frequency: 'frequent' },
    '抑郁症': { type: '无', frequency: 0 },
    '双相障碍（躁狂）': { type: '无', frequency: 0 }
  }
  const hallucination = hallucinationMap[diseaseType] || hallucinationMap['抑郁症']

  return {
    disease_type: diseaseType,
    mental_status: mse,
    behavior_params: {
      tangentiality: p.tangentiality,
      verbosity: p.verbosity,
      affective_blunting: p.affective_blunting,
      irritability: p.irritability,
      hallucination_interference: hallucination.frequency === 0 ? 0 : (hallucination.frequency === 'frequent' ? 0.6 : 0.15),
      insight_level: p.insight_level
    },
    delusional_system: delusion,
    hallucination_profile: hallucination
  }
}

function mockMeta(config, previousResults) {
  const prev = previousResults || {}
  const basic = prev.basic || {}
  const reception = prev.reception || {}
  const analysis = prev.analysis || {}
  const humanity = prev.humanity || {}
  const caseId = basic.case_id || ''
  const now = new Date().toISOString()

  // ── generation_trace ──
  const generationTrace = {
    basic_info: { model: 'mock-model', prompt_version: 'v2.0', generated_at: now }
  }
  if (reception && Object.keys(reception).length) {
    generationTrace.encounter = { model: 'mock-model', prompt_version: 'v2.0', generated_at: now }
  }
  if (analysis && Object.keys(analysis).length) {
    generationTrace.case_analysis = { model: 'mock-model', prompt_version: 'v2.0', generated_at: now }
  }
  if (humanity && Object.keys(humanity).length) {
    generationTrace.communication = { model: 'mock-model', prompt_version: 'v2.0', generated_at: now }
  }

  // ── SP知识边界 ──
  const symptoms = basic.symptoms || []
  const cc = basic.chief_complaint || ''
  const pi = basic.present_illness || ''
  const knowItems = []
  if (symptoms.length) knowItems.push(`主要症状：${symptoms.slice(0, 3).join('、')}`)
  if (cc) knowItems.push(`主诉：${cc}`)
  if (pi && pi.length > 20) knowItems.push('现病史详情')
  const roleInfo = reception.sp_materials?.role_info
  if (roleInfo) {
    if (roleInfo.name) knowItems.push('自己的姓名和一般资料')
    if (roleInfo.active_question) knowItems.push(`主动提问：${roleInfo.active_question}`)
  }
  knowItems.push('就医经历', '既往病史')

  // ── SP情绪 ──
  const spEmotion = []
  if (roleInfo?.emotion) {
    spEmotion.push({ trigger: '就诊开始', change: roleInfo.emotion })
  }
  if (spEmotion.length === 0) {
    spEmotion.push({ trigger: '就诊开始', change: '表现出担忧' })
  }
  spEmotion.push({ trigger: '问诊过程', change: '逐渐放松，配合医生' })

  // ── 评分规则 ──
  const historyItems = reception.examiner_materials?.history_score_items || []
  const historyRules = historyItems.length > 0
    ? historyItems.map(it => ({
        item: it.item || '',
        keywords: it.keywords && it.keywords.length > 0 ? it.keywords : [],
        score: it.score || 0
      }))
    : [
        { item: '询问主诉', keywords: ['主要症状', '持续时间', '发病情况'], score: 10 },
        { item: '询问伴随症状', keywords: ['伴随症状', '其他不适'], score: 10 },
        { item: '询问既往史', keywords: ['既往病史', '用药史', '过敏史'], score: 10 }
      ]

  const physicalItems = reception.examiner_materials?.physical_score_items || []
  const physicalRules = physicalItems.length > 0
    ? physicalItems.map(it => ({
        item: it.item || '',
        keywords: it.keywords || [],
        score: it.score || 0
      }))
    : [
        { item: '生命体征', keywords: ['血压', '心率', '体温', '呼吸'], score: 10 },
        { item: '系统查体', keywords: ['视诊', '触诊', '叩诊', '听诊'], score: 10 }
      ]

  const humanityScenarios = humanity.scenarios || []
  const commRules = []
  const seen = new Set()
  for (const scene of humanityScenarios) {
    const criteria = scene.examiner_materials?.scoring_guide?.criteria || []
    for (const c of criteria) {
      const key = (c.item || '').slice(0, 30)
      if (!seen.has(key)) {
        seen.add(key)
        commRules.push({ item: c.item || '', score: c.score || 0 })
      }
    }
  }
  if (commRules.length === 0) {
    commRules.push(
      { item: '礼貌问候', score: 5 },
      { item: '自我介绍', score: 5 },
      { item: '共情表达', score: 10 },
      { item: '信息确认', score: 10 }
    )
  }

  // ── 诊断评分 ──
  const answer = reception.examiner_materials?.diagnosis_answer
  const diagnosisScoring = answer
    ? {
        primary_diagnosis: {
          expected: answer.primary || '',
          keywords: answer.primary ? [answer.primary] : [],
          score: answer.primary_score || 0
        },
        diagnosis_basis: {
          expected_points: answer.basis_points || [],
          scoring_logic: '按要点给分'
        },
        differential_diagnosis: {
          expected: answer.differential || [],
          score: answer.differential_score || 0
        }
      }
    : {
        primary_diagnosis: {
          expected: (basic.diagnosis && basic.diagnosis.preliminary) || basic.disease || '',
          keywords: [(basic.diagnosis && basic.diagnosis.preliminary) || basic.disease || ''],
          score: 20
        },
        diagnosis_basis: {
          expected_points: (basic.diagnosis && basic.diagnosis.basis) || [],
          scoring_logic: '每点5分，至少列出3点'
        },
        differential_diagnosis: {
          expected: (basic.diagnosis && basic.diagnosis.differential) || [],
          score: 15
        }
      }

  // ── 查体模板 ──
  const peTemplates = []
  if (physicalItems.length > 0) {
    for (const it of physicalItems) {
      peTemplates.push({
        item: it.item || '',
        intent: '评估考生操作规范性',
        keywords: it.keywords || [],
        semantic_hints: [],
        result: ''
      })
    }
  }
  if (peTemplates.length === 0) {
    peTemplates.push({
      item: '生命体征测量',
      intent: 'T、P、R、BP测量操作规范性',
      keywords: ['体温', '脉搏', '呼吸', '血压'],
      semantic_hints: ['注意测量方法正确'],
      result: ''
    })
  }

  return {
    case_id: caseId,
    version: basic.version || 'v1.0',
    pre_generation: {
      specialty: config.specialty || basic.specialty || '',
      disease: config.disease || basic.disease || '',
      difficulty: config.teaching_phase || basic.teaching_phase || 'R1',
      training_phase: LEVEL_TO_PHASE[config.teaching_phase] || '住院医师',
      input_mode: '参数生成模式',
      source_document: null
    },
    generation_trace: generationTrace,
    ai_services: {
      ai_sp: {
        sp_play_rules: {
          knowledge_boundary: {
            knows: knowItems.length ? [...new Set(knowItems)].slice(0, 8) : ['主要症状', '就医经历', '既往病史'],
            does_not_know: ['具体诊断名称', '实验室检查结果']
          },
          emotion_progression: spEmotion,
          vague_response_templates: ['具体记不太清了...', '好像有这回事...', '应该没什么问题吧...'],
          refuse_to_answer: ['我不知道...', '这个我不太清楚...']
        },
        physical_exam_result_templates: peTemplates
      },
      ai_scoring: {
        ai_scoring_rules: {
          history_rules: historyRules,
          physical_rules: physicalRules,
          communication_rules: commRules,
          deduction_rules: {
            leading_question: '诱导性提问扣分',
            medical_jargon: '过度使用医学术语扣分',
            poor_organization: '问诊缺乏条理扣分',
            miss_critical: '遗漏关键信息扣分'
          }
        },
        diagnosis_scoring_rules: diagnosisScoring
      }
    },
    review: { status: 'pending', reviewed_by: null, reviewed_at: null, comments: null },
    deployment: { is_published: false, published_at: null },
    key_timeline: [{ event: 'AI 生成完成', timestamp: now }]
  }
}

// ── 请求体解析 ──────────────────────────────────────────

function parseRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
      try { resolve(JSON.parse(body)) }
      catch (e) { reject(e) }
    })
    req.on('error', reject)
  })
}

// ── 初始 Mock 病例列表 ──────────────────────────────────

function mockCaseList() {
  return [
    { id: 'mock-001', case_id: 'IM-20260527-MK01', title: '急性心肌梗死诊疗病例', teaching_phase: '住院医师', specialty: '内科', category: '心内科', disease: '急性心肌梗死', version: 'v1.0', ai_quality_status: '已通过', editor_review_status: '已通过', source: 'AI生成', creator_name: 'AI生成', created_at: '2026-05-27', enabled: true, patient_name: '王德胜', patient_gender: '男', patient_age: '58' },
    { id: 'mock-002', case_id: 'IM-20260527-MK02', title: '原发性高血压诊疗病例', teaching_phase: '本科教学', specialty: '内科', category: '心内科', disease: '高血压', version: 'v1.0', ai_quality_status: '已通过', editor_review_status: '待审核', source: 'AI生成', creator_name: 'AI生成', created_at: '2026-05-27', enabled: true, patient_name: '张明', patient_gender: '男', patient_age: '52' },
    { id: 'mock-003', case_id: 'PD-20260527-MK03', title: '儿童热性惊厥鉴别诊断', teaching_phase: '本科教学', specialty: '儿科', category: '小儿内科', disease: '热性惊厥', version: 'v1.2', ai_quality_status: '已通过', editor_review_status: '已通过', source: 'AI生成', creator_name: 'AI生成', created_at: '2026-04-05', enabled: true, patient_name: '李小乐', patient_gender: '男', patient_age: '3' },
    { id: 'mock-004', case_id: 'SU-20260527-MK04', title: '急性阑尾炎诊疗病例', teaching_phase: '专科培训', specialty: '外科', category: '普外科', disease: '急性阑尾炎', version: 'v2.0', ai_quality_status: '待质检', editor_review_status: '未通过', source: 'AI生成', creator_name: 'AI生成', created_at: '2026-02-15', enabled: false, patient_name: '李明', patient_gender: '男', patient_age: '32' },
    { id: 'mock-005', case_id: 'OB-20260527-MK05', title: '妊娠期糖尿病管理', teaching_phase: '住院医师', specialty: '妇产科', category: '产科', disease: '妊娠期糖尿病', version: 'v1.3', ai_quality_status: '已通过', editor_review_status: '已通过', source: 'AI生成', creator_name: 'AI生成', created_at: '2026-01-05', enabled: true, patient_name: '王芳', patient_gender: '女', patient_age: '30' },
    { id: 'mock-006', case_id: 'EM-20260527-MK06', title: '过敏性休克急救病例', teaching_phase: '专科培训', specialty: '急诊科', category: '急诊内科', disease: '过敏性休克', version: 'v1.0', ai_quality_status: '未通过', editor_review_status: '未通过', source: 'AI生成', creator_name: 'AI生成', created_at: '2026-04-22', enabled: true, patient_name: '陈华', patient_gender: '男', patient_age: '28' }
  ]
}

// ── 插件导出 ────────────────────────────────────────────

export function mockGenPlugin(_env) {
  return {
    name: 'mock-gen',
    configureServer(server) {
      server.middlewares.use(async function(req, res, next) {
        const url = req.url.split('?')[0]

        // GET /api/ai-generate/cases — 返回 mock 病例列表
        if (req.method === 'GET' && url === '/api/ai-generate/cases') {
          // 也扫描已保存到 public/data/cases 的病例（如果有的话）
          let savedCases = []
          try {
            if (fs.existsSync(CASES_DIR)) {
              const files = fs.readdirSync(CASES_DIR)
              const basicFiles = files.filter(f => f.endsWith('-basic.json'))
              for (const f of basicFiles) {
                try {
                  const data = JSON.parse(fs.readFileSync(path.join(CASES_DIR, f), 'utf-8'))
                  const prefix = f.replace('-basic.json', '')
                  const pi = data.patient_info || {}
                  savedCases.push({
                    id: prefix,
                    case_id: data.case_id || prefix,
                    title: data.title || data.disease || prefix,
                    teaching_phase: data.training_phase || '',
                    specialty: data.specialty || '',
                    category: data.category || '',
                    disease: data.disease || '',
                    difficulty: data.difficulty || '',
                    version: data.version || 'v1.0',
                    ai_quality_status: '待质检',
                    editor_review_status: '待审核',
                    source: '平台',
                    creator_name: data.creator_name || '',
                    created_at: data.record_date || '',
                    enabled: true,
                    patient_name: pi.name || '',
                    patient_gender: pi.sex || '',
                    patient_age: String(pi.age || '').replace('岁', '')
                  })
                } catch (e) { /* skip */ }
              }
            }
          } catch (e) { /* skip */ }

          const cases = [...savedCases, ...mockCaseList()]
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify(cases))
          return
        }

        // POST /api/ai-generate — 返回 mock 生成数据（含延时模拟生成过程）
        if (req.method === 'POST' && url === '/api/ai-generate') {
          let body
          try {
            body = await parseRequestBody(req)
          } catch (e) {
            res.writeHead(400, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: false, error: 'Invalid JSON body' }))
            return
          }

          const { step, config, previousResults } = body
          if (!step || !config) {
            res.writeHead(400, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: false, error: 'Missing step or config in request body' }))
            return
          }

          const MOCK_DELAY_BASE = 2000
          const MOCK_DELAY_RANGE = 2000
          const delay = MOCK_DELAY_BASE + Math.random() * MOCK_DELAY_RANGE
          await new Promise(resolve => setTimeout(resolve, delay))

          try {
            let data
            const prev = previousResults || {}

            switch (step) {
              case 'basic':
                data = mockBasic(config)
                break
              case 'scoreSheet':
                data = mockScoreSheet(config, prev.basic)
                // scoreSheet 不改变 case_id，使用 basic 的
                if (prev.basic?.case_id) data.case_id = prev.basic.case_id
                break
              case 'reception':
                if (!prev.basic || !Object.keys(prev.basic).length)
                  throw new Error('reception step requires basic result first')
                data = mockReception(config, prev.basic)
                break
              case 'analysis':
                if (!prev.basic || !Object.keys(prev.basic).length)
                  throw new Error('analysis step requires basic result first')
                data = mockAnalysis(config, prev.basic)
                break
              case 'humanity':
                if (!prev.basic || !Object.keys(prev.basic).length)
                  throw new Error('humanity step requires basic result first')
                data = mockHumanity(config, prev.basic)
                break
              case 'mentalExam':
                if (!prev.basic || !Object.keys(prev.basic).length)
                  throw new Error('mentalExam step requires basic result first')
                data = mockMentalExam(config, prev.basic)
                break
              case 'meta':
                data = mockMeta(config, prev)
                break
              default:
                throw new Error(`Unknown step: ${step}`)
            }

            // 保存到本地文件系统（如果目录存在）
            try {
              if (!fs.existsSync(CASES_DIR)) {
                fs.mkdirSync(CASES_DIR, { recursive: true })
              }
              const caseId = (data.case_id || prev.basic?.case_id || 'CASE-UNKNOWN').replace(/[\\/:*?"<>|]/g, '-')
              const fileMap = {
                basic: `${caseId}-basic.json`,
                scoreSheet: `${caseId}-scoreSheet.json`,
                reception: `${caseId}-reception.json`,
                analysis: `${caseId}-analysis.json`,
                humanity: `${caseId}-humanity.json`,
                mentalExam: `${caseId}-mentalExam.json`,
                meta: `${caseId}-meta.json`
              }
              if (fileMap[step]) {
                fs.writeFileSync(path.join(CASES_DIR, fileMap[step]), JSON.stringify(data, null, 2), 'utf-8')
                console.log(`[mockGen] Saved: ${fileMap[step]}`)
              }
            } catch (e) {
              console.warn(`[mockGen] Could not save file: ${e.message}`)
            }

            console.log(`[mockGen] Generated step: ${step} (mock, ${Math.round(delay)}ms)`)
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: true, data, mock: true }))
          } catch (e) {
            console.error(`[mockGen] Error generating ${step}:`, e.message)
            res.writeHead(500, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: false, error: e.message }))
          }
          return
        }

        // POST /api/case/save-file — 保存模块文件到磁盘
        if (req.method === 'POST' && url === '/api/case/save-file') {
          let body
          try { body = await parseRequestBody(req) } catch (e) {
            res.writeHead(400, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: false, error: 'Invalid JSON' }))
            return
          }
          try {
            if (!fs.existsSync(CASES_DIR)) fs.mkdirSync(CASES_DIR, { recursive: true })
            const filePath = path.join(CASES_DIR, body.fileName)
            const data = body.data
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
            console.log(`[mockGen] Saved: ${body.fileName}`)
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: true }))
          } catch (e) {
            console.warn(`[mockGen] Save failed: ${e.message}`)
            res.writeHead(500, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: false, error: e.message }))
          }
          return
        }

        // POST /api/case/save-fields — 合并字段到 basic.json
        if (req.method === 'POST' && url === '/api/case/save-fields') {
          let body
          try { body = await parseRequestBody(req) } catch (e) {
            res.writeHead(400, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: false, error: 'Invalid JSON' }))
            return
          }
          try {
            const caseId = body.caseId
            const basicPath = path.join(CASES_DIR, `${caseId}-basic.json`)
            if (fs.existsSync(basicPath)) {
              const existing = JSON.parse(fs.readFileSync(basicPath, 'utf-8'))
              Object.assign(existing, body.fields)
              fs.writeFileSync(basicPath, JSON.stringify(existing, null, 2), 'utf-8')
              console.log(`[mockGen] Updated fields in: ${caseId}-basic.json`)
            }
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: true }))
          } catch (e) {
            console.warn(`[mockGen] Save fields failed: ${e.message}`)
            res.writeHead(500, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: false, error: e.message }))
          }
          return
        }

        // POST /api/ai-generate/optimize — 单项优化（重新生成并保存）
        if (req.method === 'POST' && url === '/api/ai-generate/optimize') {
          let body
          try { body = await parseRequestBody(req) } catch (e) {
            res.writeHead(400, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: false, error: 'Invalid JSON' }))
            return
          }
          try {
            const { moduleType, currentData, caseId, config } = body
            let data, fileName
            const prev = { basic: currentData?.basic || {} }

            switch (moduleType) {
              case 'basic':
                data = mockBasic(config)
                if (caseId) data.case_id = caseId
                fileName = `${caseId}-basic.json`
                break
              case 'scoreSheet':
                data = mockScoreSheet(config, prev.basic)
                if (caseId) data.case_id = caseId
                fileName = `${caseId}-scoreSheet.json`
                break
              case 'reception':
                data = mockReception(config, prev.basic)
                fileName = `${caseId}-reception.json`
                break
              case 'analysis':
                data = mockAnalysis(config, prev.basic)
                fileName = `${caseId}-analysis.json`
                break
              case 'humanity':
                data = mockHumanity(config, prev.basic)
                fileName = `${caseId}-humanity.json`
                break
              case 'mentalExam':
                data = mockMentalExam(config, prev.basic)
                fileName = `${caseId}-mentalExam.json`
                break
              default:
                throw new Error(`Unknown module type: ${moduleType}`)
            }

            if (fileName) {
              if (!fs.existsSync(CASES_DIR)) fs.mkdirSync(CASES_DIR, { recursive: true })
              fs.writeFileSync(path.join(CASES_DIR, fileName), JSON.stringify(data, null, 2), 'utf-8')
              console.log(`[mockGen] Optimized & saved: ${fileName}`)
            }
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: true, data, mock: true }))
          } catch (e) {
            console.warn(`[mockGen] Optimize failed: ${e.message}`)
            res.writeHead(500, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: false, error: e.message }))
          }
          return
        }

        // POST /api/case/upload-material — 上传素材二进制文件
        if (req.method === 'POST' && url === '/api/case/upload-material') {
          let body
          try { body = await parseRequestBody(req) } catch (e) {
            res.writeHead(400, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: false, error: 'Invalid JSON' }))
            return
          }
          try {
            const { caseId, filename, data } = body
            if (!caseId || !filename || !data) {
              res.writeHead(400, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ ok: false, error: 'Missing caseId, filename, or data' }))
              return
            }
            const materialsDir = path.join(CASES_DIR, caseId, 'materials')
            if (!fs.existsSync(materialsDir)) fs.mkdirSync(materialsDir, { recursive: true })
            const base64 = data.replace(/^data:[^;]+;base64,/, '')
            const buffer = Buffer.from(base64, 'base64')
            const filePath = path.join(materialsDir, filename)
            fs.writeFileSync(filePath, buffer)
            const url = `/data/cases/${caseId}/materials/${filename}`
            console.log(`[mockGen] Uploaded material: ${filePath}`)
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: true, path: url, filename }))
          } catch (e) {
            console.warn(`[mockGen] Upload material failed: ${e.message}`)
            res.writeHead(500, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: false, error: e.message }))
          }
          return
        }

        next()
      })
    }
  }
}
