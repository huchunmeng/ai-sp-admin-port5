// 从病例 basic 数据提取评分点（纯前端，不依赖考站配置）
// 评分点是病例的固有属性，考站方案只决定如何组织它们

// 动态导入避免 vite config 打包时 workspace symlink 解析失败
const { templateV1 } = await import('@ai-sp/shared/score-tables').catch(() => ({ templateV1: { items: [] } }))

// ── 查体关键词 → 检查点 ──

const PE_KEYWORDS = [
  [/眼睑|结膜|睑结膜|苍白/, '检查眼睑结膜有无苍白'],
  [/巩膜|黄染|黄疸/, '检查巩膜有无黄染'],
  [/淋巴结|淋巴/, '检查浅表淋巴结有无肿大'],
  [/甲状腺/, '检查甲状腺有无肿大及结节'],
  [/颈静脉|怒张/, '检查颈静脉有无怒张'],
  [/呼吸音|啰音|干湿|哮鸣/, '肺部听诊（呼吸音、啰音）'],
  [/心界|心脏|心率|心音|杂音|心律/, '心脏听诊（心率、心律、心音、杂音）'],
  [/Murphy|墨菲/, '检查Murphy征'],
  [/压痛|反跳痛|肌紧张/, '腹部触诊（压痛、反跳痛、肌紧张）'],
  [/肝脾|肝大|脾大/, '肝脾触诊'],
  [/肠鸣音/, '肠鸣音听诊'],
  [/移动性浊音/, '检查移动性浊音'],
  [/水肿|凹陷|浮肿/, '检查下肢有无水肿'],
  [/足背动脉|动脉搏动/, '检查足背动脉搏动'],
  [/神经|病理征|Babinski|巴氏/, '神经系统检查（病理征）'],
  [/皮肤|皮疹|出血点|紫癜/, '检查皮肤黏膜有无异常'],
  [/瞳孔|对光反射/, '检查瞳孔对光反射'],
  [/鼓音|浊音|清音|叩诊/, '叩诊检查'],
  [/包块|肿物|肿块/, '检查有无包块/肿物'],
  [/静脉曲张/, '检查有无静脉曲张'],
  [/气管/, '检查气管有无偏移'],
  [/畸形/, '检查有无畸形'],
  [/叩击痛|肾区/, '检查有无肾区叩击痛']
]

// ── 主入口：从病例数据提取所有评分点 ──

/**
 * 从病例 basic 数据提取评分点，按领域分类
 * 不依赖任何考站配置 —— 评分点是病例的固有属性
 *
 * @param {Object} basicData - 病例基础信息
 * @returns {Object} { history: [...], physical_exam: [...], diagnosis: [...], communication: [...], medical_record: [...], case_analysis: [...] }
 */
export function extractScoringPoints(basicData) {
  if (!basicData) return createEmptyPoints()

  return {
    history: extractHistoryPoints(basicData),
    physical_exam: extractPEPoints(basicData),
    diagnosis: extractDiagnosisPoints(basicData),
    communication: extractCommunicationPoints(basicData),
    medical_record: extractMedicalRecordPoints(basicData),
    case_analysis: extractCaseAnalysisPoints(basicData)
  }
}

function createEmptyPoints() {
  return { history: [], physical_exam: [], diagnosis: [], communication: [], medical_record: [], case_analysis: [] }
}


// ── 病史采集评分点 ──

function extractHistoryPoints(basicData) {
  const points = []
  const symptoms = basicData.symptoms || []
  const mainSymptom = symptoms[0] || '主要症状'
  const cc = basicData.chief_complaint || ''
  const pi = typeof basicData.present_illness === 'string' ? basicData.present_illness : ''
  const past = typeof basicData.past_history === 'string' ? basicData.past_history : ''
  const combined = cc + pi

  // 固定项
  points.push({ point: '自我介绍并说明问诊目的', score: 3 })
  points.push({ point: '确认患者一般资料（姓名、性别、年龄）', score: 2 })

  // 主要症状
  points.push({ point: `询问${mainSymptom}的起病情况与诱因`, score: 6 })
  points.push({ point: `询问${mainSymptom}的特点（性质、部位、程度、持续时间等）`, score: 6 })

  if (/加重|缓解|减轻/.test(combined)) {
    points.push({ point: `询问${mainSymptom}的加重或缓解因素`, score: 4 })
  }

  // 伴随症状
  if (symptoms.length > 1) {
    points.push({ point: `询问伴随症状（${symptoms.slice(1, 3).join('、')}）的情况`, score: 4 })
  } else {
    points.push({ point: '询问有无伴随症状', score: 3 })
  }

  // 诊疗经过
  if (/治疗|用药|服药|就诊|门诊|住院|检查/.test(combined)) {
    points.push({ point: '详细询问院外诊疗过程（就诊医院、检查项目、具体用药及效果）', score: 5 })
  } else {
    points.push({ point: '询问诊疗经过（就诊医院、检查项目、用药及效果）', score: 4 })
  }

  // 一般情况
  points.push({ point: '询问发病以来一般情况（饮食、睡眠、大小便、体重变化）', score: 3 })

  // 既往史
  points.push({ point: '询问既往史（慢性病史、传染病史、手术外伤史、输血史）', score: 3 })
  if (/高血压|糖尿病|冠心病|心脏病|肾病|肝病/.test(past)) {
    points.push({ point: '详细询问慢性病的诊断时间、治疗及控制情况', score: 3 })
  }
  if (/手术/.test(past)) {
    points.push({ point: '详细询问手术史（手术名称、时间、恢复情况）', score: 2 })
  }

  // 过敏史
  points.push({ point: '询问过敏史（药物、食物及其他过敏）', score: 3 })

  // 个人史与家族史
  points.push({ point: '询问个人史（吸烟、饮酒、职业与环境暴露）', score: 3 })
  points.push({ point: '询问家族史（遗传病、家族性疾病发病情况）', score: 3 })

  // 性别相关
  const patientInfo = basicData.patient_info || {}
  const gender = patientInfo.patient_gender || patientInfo.sex || basicData.patient_gender || ''
  if (gender === '女' || String(gender) === '0') {
    points.push({ point: '询问月经史及婚育史', score: 3 })
  }

  // 发热
  if (/热|烧|体温|T\s*[3-4]\d/.test(combined)) {
    points.push({ point: '询问有无发热及热型特点', score: 3 })
  }

  // 疼痛放射
  if (/痛/.test(cc + mainSymptom)) {
    points.push({ point: '询问疼痛有无放射', score: 3 })
  }

  // 问诊技巧
  points.push({ point: '问诊顺序合理，逻辑清晰', score: 3 })
  points.push({ point: '使用开放性问题引导，避免诱导性提问', score: 3 })

  return points
}

// ── 体格检查评分点 ──

function extractPEPoints(basicData) {
  const points = []
  const pe = basicData.physical_exam
  let peText = ''
  if (typeof pe === 'object' && pe !== null) {
    peText = [pe.vital_signs, pe.general, pe.systemic].filter(Boolean).join(' ')
  } else if (typeof pe === 'string') {
    peText = pe
  }

  points.push({ point: '测量生命体征（T、P、R、BP）', score: 4 })
  points.push({ point: '观察一般情况（神志、体型、体位、面容）', score: 3 })

  for (const [pattern, desc] of PE_KEYWORDS) {
    if (pattern.test(peText)) {
      points.push({ point: desc, score: 5 })
    }
  }

  // 保底项
  if (points.length <= 4) {
    const defaults = [
      '检查皮肤黏膜有无异常',
      '检查浅表淋巴结有无肿大',
      '心肺听诊',
      '腹部触诊',
      '检查有无水肿'
    ]
    for (const d of defaults) {
      if (!points.some(p => p.point.includes(d.slice(2, 5)))) {
        points.push({ point: d, score: 5 })
        if (points.length >= 8) break
      }
    }
  }

  points.push({ point: '查体手法规范，动作轻柔', score: 3 })
  points.push({ point: '注意保护患者隐私及保暖', score: 3 })

  return points
}

// ── 诊断评分点 ──

function extractDiagnosisPoints(basicData) {
  const points = []
  const diagnosis = basicData.diagnosis || {}
  const primary = typeof diagnosis.preliminary === 'string'
    ? diagnosis.preliminary
    : (Array.isArray(diagnosis.preliminary) ? diagnosis.preliminary[0] : '')
  const differential = Array.isArray(diagnosis.differential)
    ? diagnosis.differential.filter(Boolean)
    : []

  points.push({ point: primary ? `主要诊断：${primary}` : '提出主要诊断', score: 40 })

  if (differential.length > 0) {
    for (const d of differential.slice(0, 4)) {
      points.push({ point: `鉴别诊断：${d}`, score: 10 })
    }
  } else {
    points.push({ point: '提出鉴别诊断并说明鉴别要点', score: 30 })
  }

  points.push({ point: '列出诊断依据（病史+体征+辅助检查）', score: 20 })
  points.push({ point: '诊断思路清晰，逻辑严密', score: 10 })

  return points
}

// ── 人文沟通评分点 ──

function extractCommunicationPoints(basicData) {
  const phase = basicData.teaching_phase || 'R1'
  const isSimple = phase === 'U1' || phase === 'U2'

  if (isSimple) {
    return [
      { point: '主动自我介绍，态度友善', score: 12 },
      { point: '使用通俗语言，表达清晰', score: 10 },
      { point: '适当回应患者情绪', score: 8 }
    ]
  }

  return [
    { point: '主动自我介绍并说明问诊目的，态度和蔼友善', score: 8 },
    { point: '使用通俗易懂的语言，避免医学术语', score: 7 },
    { point: '善于倾听，适时给予患者回应和鼓励', score: 7 },
    { point: '表达共情，关心患者感受并妥善回应焦虑情绪', score: 7 },
    { point: '善于归纳小结，通过反馈确认信息准确性', score: 6 },
    { point: '对患者的提问给予恰当专业的回应', score: 5 }
  ]
}

// ── 病历书写评分点 ──

function extractMedicalRecordPoints(basicData) {
  return [
    { point: '主诉简洁明了（症状+时间）', score: 8 },
    { point: '现病史完整（起病、经过、诊疗、一般情况）', score: 20 },
    { point: '既往史、个人史、家族史记录完整', score: 10 },
    { point: '体格检查记录规范、有序', score: 15 },
    { point: '辅助检查结果记录完整', score: 10 },
    { point: '初步诊断及诊断依据明确', score: 15 },
    { point: '鉴别诊断合理', score: 10 },
    { point: '诊疗计划具体可行', score: 7 },
    { point: '书写格式规范、字迹工整', score: 5 }
  ]
}

// ── 病例分析评分点 ──

function extractCaseAnalysisPoints(basicData) {
  return [
    { point: '正确归纳病例特点', score: 15 },
    { point: '提出主要诊断并阐述诊断依据', score: 20 },
    { point: '列出鉴别诊断及鉴别要点', score: 15 },
    { point: '分析辅助检查结果的意义', score: 10 },
    { point: '评估病情严重程度', score: 10 },
    { point: '提出合理的治疗方案', score: 15 },
    { point: '分析预后及随访计划', score: 10 },
    { point: '逻辑清晰、表达流畅', score: 5 }
  ]
}

// ── v2.0 评分表生成（基于通用模板）──

// 病史采集评分表通用模板
const HISTORY_SHEET_TEMPLATE = templateV1.items

// 每个类别的合计分值
const CATEGORY_SCORES = {}
for (const t of HISTORY_SHEET_TEMPLATE) {
  CATEGORY_SCORES[t.category] = (CATEGORY_SCORES[t.category] || 0) + t.score
}
export { HISTORY_SHEET_TEMPLATE, CATEGORY_SCORES }

/**
 * 从病例 basic 数据生成病例特定评分表
 * 以通用模板为骨架，key_point/rules 根据病例数据动态生成
 *
 * 格式: [{id, category, item, key_point, score, rules}]
 */
export function generateV1ScoreSheet(basicData) {
  if (!basicData) return []

  const ctx = buildFillContext(basicData)
  const rows = []

  for (const t of HISTORY_SHEET_TEMPLATE) {
    const key = `${t.category}|${t.item}`
    const def = SUB_POINT_DEFS[key]

    if (def && def.desc.length > 0) {
      // 拆分为独立子项行
      const n = def.desc.length
      const perScore = Math.round(t.score / n * 2) / 2
      let allocated = 0
      for (let i = 0; i < n; i++) {
        const isLast = i === n - 1
        const sp = isLast ? Math.max(0.5, Math.round((t.score - allocated) * 2) / 2) : perScore
        allocated += sp
        rows.push({
          id: `${t.id}-${i + 1}`,
          category: t.category,
          item: t.item,
          key_point: `${i + 1}. ${fillTemplate(def.desc[i], ctx)}`,
          score: sp,
          rules: `${fillTemplate(def.rule[i], ctx)}(${sp}分)`
        })
      }
    } else {
      // 无子项定义，保持原始单行
      rows.push({
        id: t.id,
        category: t.category,
        item: t.item,
        key_point: fillTemplate(t.item, ctx),
        score: t.score,
        rules: buildRulesFallback(t)
      })
    }
  }

  return rows
}

function buildRulesFallback(tpl) {
  const { score } = tpl
  if (score >= 12) return `全面覆盖得满分，遗漏关键信息按比例扣分（满分${score}分）`
  if (score >= 8) return `完整询问得满分，部分遗漏按比例扣分（满分${score}分）`
  return `询问到即得分，未询问不得分（满分${score}分）`
}

// ── 从 basic 数据提取填充上下文 ──

function buildFillContext(basicData) {
  const patientInfo = basicData.patient_info || {}
  const gender = patientInfo.patient_gender || patientInfo.sex || basicData.patient_gender || ''
  const genderStr = gender === '女' || String(gender) === '0' ? '女' : '男'

  const symptoms = basicData.symptoms || []
  const cc = basicData.chief_complaint || ''
  const pi = typeof basicData.present_illness === 'string' ? basicData.present_illness : ''

  return {
    name: patientInfo.patient_name || basicData.patient_name || '',
    gender: genderStr,
    age: patientInfo.patient_age || basicData.patient_age || '',
    occupation: patientInfo.occupation || basicData.occupation || '',
    chiefComplaint: cc,
    presentIllness: pi,
    symptoms: symptoms.length ? symptoms : [],
    mainSymptom: symptoms[0] || cc || '',
  }
}

// ── 根据通用模板项 + 病例上下文动态生成评分要点 ──

// 各评分项的子要点定义（按 "category|item" 索引）
// desc: 评分要点详细描述, rule: 评分规则简短标签
// 占位符 {symptom} 会被替换为 ctx.mainSymptom
const SUB_POINT_DEFS = {
  '现病史采集|起病情况与诱因': {
    desc: [
      '询问{symptom}的起病具体时间（年/月/日或大致时间段）',
      '询问起病方式（突发/缓慢/间歇性/持续性）',
      '询问有无明显诱因（劳累、感染、情绪激动、饮食不当、外伤等）',
      '询问{symptom}起病时的主要表现及病情演变过程'
    ],
    rule: ['起病时间明确', '起病方式描述清晰', '诱因问询完整', '起病表现及演变清楚']
  },
  '现病史采集|主要症状特点': {
    desc: [
      '询问{symptom}的具体性质（如疼痛性质：刺痛/钝痛/绞痛等）',
      '询问{symptom}的准确部位及有无放射',
      '询问{symptom}的严重程度及对日常生活的影响',
      '询问{symptom}的持续时间、发作频率及变化趋势'
    ],
    rule: ['症状性质描述准确', '部位定位清楚', '程度评估恰当', '持续时间及频率明确']
  },
  '现病史采集|伴随症状与鉴别': {
    desc: [
      '主动询问有无其他伴随症状',
      '询问伴随症状与{symptom}的时间关系和先后顺序',
      '询问有鉴别意义的阴性症状（如发热、寒战、恶心呕吐等）'
    ],
    rule: ['伴随症状问询完整', '伴随与主症状关系清晰', '阴性症状有鉴别']
  },
  '现病史采集|诊疗经过': {
    desc: [
      '询问发病后就诊的医院及科室',
      '询问已做的检查项目及结果（实验室、影像学等）',
      '询问用药情况（药物名称、剂量、用药途径、疗程、效果）'
    ],
    rule: ['就诊医院科室明确', '检查项目及结果清楚', '用药情况详细']
  },
  '现病史采集|发病以来一般状况': {
    desc: [
      '询问发病以来的饮食及食欲变化',
      '询问睡眠状况有无改变',
      '询问大小便情况（频次、性状、颜色）',
      '询问体重有无明显变化'
    ],
    rule: ['饮食情况', '睡眠状况', '大小便情况', '体重变化']
  },
  '既往史采集|既往疾病史': {
    desc: [
      '询问慢性病史（高血压、糖尿病、冠心病、肝病、肾病等）及控制情况',
      '询问传染病史（肝炎、结核、伤寒等）',
      '询问既往住院史（时间、原因、诊疗结果）',
      '询问预防接种史'
    ],
    rule: ['慢性病史及控制情况', '传染病史', '住院史', '预防接种史']
  },
  '既往史采集|手术外伤史': {
    desc: [
      '询问有无手术史（手术名称、时间、术后恢复情况）',
      '询问有无外伤史（受伤时间、部位、处理经过）',
      '询问有无输血史及输血原因'
    ],
    rule: ['手术史完整', '外伤史清楚', '输血史明确']
  },
  '既往史采集|过敏史': {
    desc: [
      '询问有无药物过敏史（具体药物名称及过敏表现）',
      '询问有无食物或其他物质过敏史',
      '询问过敏反应的严重程度及处理方式'
    ],
    rule: ['药物过敏史', '食物/其他过敏史', '过敏反应详情']
  },
  '个人史与家族史|个人生活习惯': {
    desc: [
      '询问吸烟史（时长、每日量、是否戒烟）',
      '询问饮酒史（种类、频率、每日量）',
      '询问职业及工作环境中可能的暴露因素',
      '询问居住环境、饮食习惯及特殊嗜好'
    ],
    rule: ['吸烟史', '饮酒史', '职业与暴露', '居住环境与习惯']
  },
  '个人史与家族史|家族遗传病史': {
    desc: [
      '询问直系亲属（父母、兄弟姐妹、子女）健康状况',
      '询问家族中有无遗传性疾病',
      '询问家族中有无类似疾病患者'
    ],
    rule: ['直系亲属健康状况', '遗传性疾病史', '家族类似疾病']
  },
  '系统回顾|各系统回顾完整性': {
    desc: [
      '呼吸系统回顾（咳嗽、咳痰、胸闷、呼吸困难）',
      '循环系统回顾（心悸、胸痛、水肿、晕厥）',
      '消化系统回顾（腹痛、腹胀、恶心、呕吐、排便异常）',
      '泌尿生殖系统回顾（排尿异常、水肿、月经史/婚育史）',
      '神经系统回顾（头痛、眩晕、感觉异常、运动障碍）'
    ],
    rule: ['呼吸系统', '循环系统', '消化系统', '泌尿生殖系统', '神经系统']
  },
  '问诊技巧与沟通|问诊条理与组织': {
    desc: [
      '问诊顺序合理，按时间线或系统有序展开',
      '主次分明，先聚焦主要问题再扩展细节',
      '时间分配合理，不遗漏关键信息',
      '避免跳跃式提问，过渡自然流畅'
    ],
    rule: ['问诊顺序合理', '主次分明', '时间分配合理', '提问过渡自然']
  },
  '问诊技巧与沟通|沟通技巧与人文关怀': {
    desc: [
      '主动自我介绍并说明问诊目的，态度亲切和蔼',
      '使用通俗易懂的语言，避免过多医学术语',
      '善于倾听，适时给予患者回应和鼓励',
      '适当使用开放式提问，避免诱导性提问',
      '表达共情，关注患者感受，妥善回应焦虑或担忧',
      '适时归纳总结，与患者核对确认信息的准确性'
    ],
    rule: ['自我介绍与说明目的', '语言通俗易懂', '倾听与回应', '开放式提问', '共情与关怀', '归纳总结确认']
  }
}

// 占位符替换
function fillTemplate(str, ctx) {
  return str
    .replace(/\{symptom\}/g, ctx.mainSymptom || '主要症状')
}

function buildKeyPoint(tpl, ctx) {
  const key = `${tpl.category}|${tpl.item}`
  const def = SUB_POINT_DEFS[key]
  if (!def) {
    return fillTemplate(tpl.item, ctx)
  }
  return def.desc
    .map((p, i) => `${i + 1}. ${fillTemplate(p, ctx)}`)
    .join('\n')
}

function buildRules(tpl, ctx) {
  const { score } = tpl
  const key = `${tpl.category}|${tpl.item}`
  const def = SUB_POINT_DEFS[key]

  if (!def) {
    if (score >= 12) return `全面覆盖得满分，遗漏关键信息按比例扣分（满分${score}分）`
    if (score >= 8) return `完整询问得满分，部分遗漏按比例扣分（满分${score}分）`
    return `询问到即得分，未询问不得分（满分${score}分）`
  }

  const labels = def.rule
  const n = labels.length
  const perScore = Math.round(score / n * 2) / 2
  const parts = []
  let allocated = 0
  for (let i = 0; i < n; i++) {
    const isLast = i === n - 1
    const sp = isLast ? Math.max(0.5, Math.round((score - allocated) * 2) / 2) : perScore
    allocated += sp
    parts.push(`${fillTemplate(labels[i], ctx)}(${sp}分)`)
  }
  return parts.join('，') + '；每缺一项扣对应分值，部分满足酌情扣分'
}

// ── 元信息构建（纯前端组装，从其他模块提取数据）──

/**
 * 从生成结果构建病例元信息
 * @param {Object} basicData - 已生成的 basic 数据
 * @param {Object} previousResults - { reception, analysis, humanity }
 * @returns {Object} meta 对象
 */
export function buildMetaInfo(basicData, previousResults = {}) {
  const now = new Date().toISOString()
  const basic = basicData || {}
  const reception = previousResults.reception || {}
  const humanity = previousResults.humanity || {}

  const generationTrace = {
    basic_info: { model: 'frontend', prompt_version: 'v2.0', generated_at: now }
  }
  if (reception && Object.keys(reception).length) {
    generationTrace.encounter = { model: 'frontend', prompt_version: 'v2.0', generated_at: now }
  }
  if (previousResults.analysis && Object.keys(previousResults.analysis).length) {
    generationTrace.case_analysis = { model: 'frontend', prompt_version: 'v2.0', generated_at: now }
  }
  if (humanity && Object.keys(humanity).length) {
    generationTrace.communication = { model: 'frontend', prompt_version: 'v2.0', generated_at: now }
  }

  // 从 basic + reception 推断 SP 知识边界
  const knowItems = extractSPKnows(basic, reception)
  const spEmotion = extractSPEmotion(reception)

  // 从 reception + humanity 提取评分规则
  const historyRules = extractHistoryRules(reception)
  const physicalRules = extractPhysicalRules(reception)
  const communicationRules = extractCommunicationRules(humanity)
  const diagnosisRules = extractDiagnosisRules(reception)

  // 从 basic + reception 提取查体模板 + 模糊应答
  const peTemplates = extractPETemplates(basic, reception)
  const vagueResponses = extractVagueTemplates(reception)
  const refuseAnswers = extractRefuseAnswers()

  return {
    case_id: basic.case_id || '',
    version: basic.version || 'v1.0',
    personality: reception.personality || basic.personality || {
      expressiveness: '普通型',
      sensitivity: '普通敏感度',
      resilience: '普通恢复力'
    },
    pre_generation: {
      specialty: basic.specialty || '',
      disease: basic.disease || '',
      difficulty: basic.difficulty || '',
      training_phase: basic.teaching_phase || '',
      input_mode: '参数生成模式',
      source_document: null
    },
    generation_trace: generationTrace,
    ai_services: {
      ai_sp: {
        sp_play_rules: {
          knowledge_boundary: {
            knows: knowItems.length ? knowItems : ['主要症状', '就医经历', '既往病史'],
            does_not_know: ['具体诊断名称', '实验室检查结果']
          },
          emotion_progression: spEmotion,
          vague_response_templates: vagueResponses.length ? vagueResponses : ['具体记不太清了...', '应该没什么问题吧...'],
          refuse_to_answer: refuseAnswers
        },
        physical_exam_result_templates: peTemplates
      },
      ai_scoring: {
        ai_scoring_rules: {
          history_rules: historyRules,
          physical_rules: physicalRules,
          communication_rules: communicationRules,
          deduction_rules: {
            leading_question: '诱导性提问扣分',
            medical_jargon: '过度使用医学术语扣分',
            poor_organization: '问诊缺乏条理扣分',
            miss_critical: '遗漏关键信息扣分'
          }
        },
        diagnosis_scoring_rules: diagnosisRules
      }
    },
    review: { status: 'pending', reviewed_by: null, reviewed_at: null, comments: null },
    deployment: { is_published: false, published_at: null },
    key_timeline: [{ event: 'AI 生成完成', timestamp: now }],
    atypical_dialogue: previousResults.mentalExam || null
  }
}

function extractSPKnows(basic, reception) {
  const items = []
  const symptoms = basic.symptoms || []
  const cc = basic.chief_complaint || ''
  if (symptoms.length) items.push(`主要症状：${symptoms.slice(0, 3).join('、')}`)
  if (cc) items.push(`主诉：${cc}`)
  const pi = basic.present_illness || ''
  if (pi && pi.length > 20) items.push('现病史详情')

  const roleInfo = reception.sp_materials?.role_info
  if (roleInfo) {
    if (roleInfo.name) items.push('自己的姓名和一般资料')
    if (roleInfo.active_question) items.push(`主动提问：${roleInfo.active_question}`)
  }
  items.push('就医经历', '既往病史')
  return [...new Set(items)].slice(0, 8)
}

function extractSPEmotion(reception) {
  const selfNarration = reception.sp_materials?.self_narration || ''
  const roleInfo = reception.sp_materials?.role_info
  const progression = []

  if (roleInfo?.emotion) {
    progression.push({ trigger: '就诊开始', change: roleInfo.emotion })
  }
  if (selfNarration.length > 30) {
    progression.push({ trigger: '病情叙述', change: '详细描述发病经过' })
  }
  if (progression.length === 0) {
    progression.push({ trigger: '就诊开始', change: '表现出担忧' })
  }
  progression.push({ trigger: '问诊过程', change: '逐渐放松，配合医生' })
  return progression
}

function extractHistoryRules(reception) {
  const items = reception.examiner_materials?.history_score_items || []
  const qaScript = reception.sp_materials?.qa_script || []

  return items.map(it => {
    const keywords = it.keywords && it.keywords.length > 0
      ? it.keywords
      : guessKeywords(it.item, qaScript)
    return { item: it.item || '', keywords, score: it.score || 0 }
  })
}

function extractPhysicalRules(reception) {
  const items = reception.examiner_materials?.physical_score_items || []
  return items.map(it => ({
    item: it.item || '',
    keywords: it.keywords || [],
    score: it.score || 0
  }))
}

// 从 QA 脚本中猜测评分项的关键词
function guessKeywords(itemName, qaScript) {
  if (!qaScript.length) return []
  // 从评分项名称中提取关键词
  const terms = itemName
    .replace(/[（(].+?[)）]/g, '')
    .replace(/询问|检查|评估|采集|了解|采集/g, '')
    .split(/[、，,；;]/)
    .map(s => s.trim())
    .filter(s => s.length >= 2 && s.length <= 15)
  return terms.slice(0, 5)
}

function extractCommunicationRules(humanity) {
  const scenarios = humanity.scenarios || []
  const rules = []
  const seen = new Set()
  for (const scene of scenarios) {
    const criteria = scene.examiner_materials?.scoring_guide?.criteria || []
    for (const c of criteria) {
      const key = (c.item || '').slice(0, 30)
      if (!seen.has(key)) {
        seen.add(key)
        rules.push({ item: c.item || '', score: c.score || 0 })
      }
    }
  }
  return rules
}

function extractDiagnosisRules(reception) {
  const answer = reception.examiner_materials?.diagnosis_answer
  if (!answer) return null
  return {
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
}

function extractPETemplates(basic, reception) {
  const examenMaterialPE = reception.examiner_materials?.physical_score_items || []
  const peText = typeof basic.physical_exam === 'string'
    ? basic.physical_exam
    : [basic.physical_exam?.vital_signs, basic.physical_exam?.general, basic.physical_exam?.systemic].filter(Boolean).join(' ')

  // 从 reception 的 physical_score_items 生成结构化模板
  if (examenMaterialPE.length) {
    return examenMaterialPE.map(it => ({
      item: it.item || '',
      intent: '评估考生操作规范性',
      keywords: it.keywords || [],
      semantic_hints: [],
      result: ''
    }))
  }

  // 回退：用 PE_KEYWORDS 从 basic 查体文本匹配
  if (peText && peText.length > 10) {
    const templates = []
    for (const [pattern, desc] of PE_KEYWORDS) {
      if (pattern.test(peText)) {
        templates.push({ item: desc, intent: '', keywords: [], semantic_hints: [], result: '' })
      }
    }
    if (templates.length) return templates
  }

  return []
}

function extractVagueTemplates(reception) {
  const selfNarration = reception.sp_materials?.self_narration || ''
  if (selfNarration.length > 50) {
    return ['具体记不太清了...', '好像有这回事...', '应该没什么问题吧...', '时间长了有点模糊了...']
  }
  return []
}

function extractRefuseAnswers() {
  return ['我不知道...', '这个我不太清楚...', '我得想想...']
}

// ── 向后兼容 ──

export function convertLegacyScoreSheet(flatArray) {
  if (!Array.isArray(flatArray)) return []
  return flatArray
}

export function generateEmptyScoreSheet() {
  return []
}
