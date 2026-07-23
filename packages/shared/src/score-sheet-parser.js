// 评分表病例锚定解析器
// 将通用评分表条目展开为病例特定子项（sub_items）
// 纯函数 + LLM 增强混合方案

// ═══════════════════════════════════════════════
// 一、主诉类型追问模板库
// ═══════════════════════════════════════════════

const SYMPTOM_QUESTION_TEMPLATES = {
  // 疼痛类（最常用）
  pain: {
    match: /痛|疼/,
    questions: [
      { point: '询问具体部位及有无放射', scoreRule: '部位定位准确' },
      { point: '询问疼痛性质（刺痛/钝痛/绞痛/烧灼痛/撕裂样等）', scoreRule: '性质描述清晰' },
      { point: '询问疼痛程度及对日常活动的影响', scoreRule: '程度评估恰当' },
      { point: '询问起病方式（突发/渐进）及持续时间', scoreRule: '起病方式明确' },
      { point: '询问加重或缓解因素（体位、进食、呼吸等）', scoreRule: '加重缓解因素问清' },
      { point: '询问有无伴随症状（发热、恶心呕吐、出汗等）', scoreRule: '伴随症状完整' }
    ]
  },

  // 发热类
  fever: {
    match: /发热|发烧|体温|热/,
    questions: [
      { point: '询问起病时间及最高体温', scoreRule: '起病时间和体温峰值明确' },
      { point: '询问热型特点（持续热/弛张热/间歇热/波状热等）', scoreRule: '热型描述清楚' },
      { point: '询问有无寒战、畏寒', scoreRule: '寒战情况' },
      { point: '询问有无出汗及退热方式', scoreRule: '出汗与退热' },
      { point: '询问有无伴随症状（头痛、肌肉酸痛、咳嗽、皮疹等）', scoreRule: '伴随症状完整' },
      { point: '询问有无疫区接触史、蚊虫叮咬史', scoreRule: '流行病学史' }
    ]
  },

  // 水肿类
  edema: {
    match: /水肿|浮肿|肿胀/,
    questions: [
      { point: '询问水肿起始部位及发展顺序', scoreRule: '起始部位明确' },
      { point: '询问水肿程度（凹陷性/非凹陷性）及范围', scoreRule: '程度和性质' },
      { point: '询问有无活动后气促、夜间阵发性呼吸困难', scoreRule: '心源性鉴别' },
      { point: '询问尿量变化及尿液性状', scoreRule: '肾源性鉴别' },
      { point: '询问有无肝病史或饮酒史', scoreRule: '肝源性鉴别' },
      { point: '询问药物使用史（CCB、激素等可致水肿药物）', scoreRule: '药物因素排查' }
    ]
  },

  // 出血类
  bleeding: {
    match: /出血|呕血|黑便|便血|咯血|血尿|瘀斑|紫癜/,
    questions: [
      { point: '询问出血部位、量及颜色', scoreRule: '出血定位定量' },
      { point: '询问出血起病时间及诱因', scoreRule: '起病与诱因' },
      { point: '询问有无伴随症状（头晕、心悸、出冷汗、晕厥）', scoreRule: '血流动力学评估' },
      { point: '询问近期用药史（抗凝药、NSAIDs、激素等）', scoreRule: '药物相关性排查' },
      { point: '询问既往出血史及家族出血性疾病史', scoreRule: '出血素质评估' }
    ]
  },

  // 呼吸困难类
  dyspnea: {
    match: /气促|气喘|呼吸困难|憋气|胸闷/,
    questions: [
      { point: '询问起病时间及诱因（劳力、静息、夜间）', scoreRule: '起病与诱因' },
      { point: '询问严重程度（平路/上楼/静息即出现）', scoreRule: '程度分级' },
      { point: '询问有无端坐呼吸及夜间阵发性呼吸困难', scoreRule: '心衰鉴别' },
      { point: '询问有无咳嗽、咳痰、胸痛', scoreRule: '呼吸系统症状' },
      { point: '询问有无发热、哮喘史、过敏史', scoreRule: '感染/哮喘/过敏' }
    ]
  },

  // 意识障碍类
  consciousness: {
    match: /意识|昏迷|晕厥|晕倒|抽搐|痉挛|惊厥/,
    questions: [
      { point: '询问发作时间、持续时间及频率', scoreRule: '发作特征' },
      { point: '询问发作前驱症状（头晕、视物模糊、心悸等）', scoreRule: '前驱症状' },
      { point: '询问发作时表现（抽搐形式、有无口吐白沫、二便失禁）', scoreRule: '发作表现' },
      { point: '询问有无外伤导致、既往有无类似发作', scoreRule: '病因及既往史' },
      { point: '询问有无高血压、糖尿病、心脏病史', scoreRule: '基础疾病排查' }
    ]
  },

  // 消化系统类
  digestive: {
    match: /恶心|呕吐|腹泻|便秘|腹胀|反酸|烧心|嗳气|厌食|黄疸/,
    questions: [
      { point: '询问起病时间及诱因（饮食、药物、情绪等）', scoreRule: '起病与诱因' },
      { point: '询问症状频率、严重程度', scoreRule: '严重度评估' },
      { point: '询问呕吐物/排泄物性状（颜色、量、内容物）', scoreRule: '性状描述' },
      { point: '询问有无腹痛、发热、体重变化', scoreRule: '伴随症状' },
      { point: '询问近期饮食及服药史', scoreRule: '饮食药物因素' }
    ]
  },

  // 皮肤病变类
  skin: {
    match: /皮疹|红斑|丘疹|水疱|糜烂|溃疡|脱屑|瘙痒/,
    questions: [
      { point: '询问皮损起始部位、形态演变及分布范围', scoreRule: '皮损特征' },
      { point: '询问有无瘙痒、疼痛、灼热感', scoreRule: '自觉症状' },
      { point: '询问发病前有无用药史、接触史、饮食诱因', scoreRule: '诱因排查' },
      { point: '询问有无发热、关节痛等全身症状', scoreRule: '系统受累评估' },
      { point: '询问既往皮肤病史及过敏史', scoreRule: '既往史关联' }
    ]
  },

  // 乏力/消瘦类
  fatigue: {
    match: /乏力|无力|疲倦|消瘦|体重下降|体重减轻/,
    questions: [
      { point: '询问起病时间及进展情况', scoreRule: '病程特征' },
      { point: '询问有无伴随发热、盗汗（感染/肿瘤鉴别）', scoreRule: '感染肿瘤鉴别' },
      { point: '询问有无活动后加重（心源性鉴别）', scoreRule: '心源性鉴别' },
      { point: '询问食欲及进食情况、有无恶心呕吐', scoreRule: '营养摄入评估' },
      { point: '询问有无慢性病史（贫血、甲减、肝病、肾病、糖尿病等）', scoreRule: '慢性病排查' },
      { point: '询问近期精神心理状态（情绪低落、睡眠障碍）', scoreRule: '心理因素评估' }
    ]
  },

  // 神经类
  neurological: {
    match: /头痛|头晕|眩晕|麻木|抽搐|震颤|步态|记忆|言语/,
    questions: [
      { point: '询问起病时间及发作频率', scoreRule: '病程特征' },
      { point: '询问症状具体表现及严重程度', scoreRule: '症状描述' },
      { point: '询问有无伴随恶心呕吐、视物模糊、耳鸣', scoreRule: '伴随症状' },
      { point: '询问有无外伤史、高血压、颈椎病史', scoreRule: '病因排查' },
      { point: '询问有无神经系统疾病家族史', scoreRule: '家族史关联' }
    ]
  },

  // 心血管/心悸/胸闷类
  cardiovascular: {
    match: /心悸|心慌|心跳|胸闷|胸痛|心前/,
    questions: [
      { point: '询问发作频率、持续时间及诱发因素（活动、情绪、体位等）', scoreRule: '发作特征' },
      { point: '询问发作时有无伴随胸痛、呼吸困难、头晕、黑矇', scoreRule: '伴随症状评估' },
      { point: '询问有无晕厥或近似晕厥发作', scoreRule: '血流动力学评估' },
      { point: '询问既往心脏病史、心律失常史及家族猝死史', scoreRule: '心脏病史' },
      { point: '询问近期有无感染、发热、情绪应激、咖啡因/酒精摄入', scoreRule: '诱因排查' }
    ]
  },

  // 多汗/内分泌类
  endocrine: {
    match: /多汗|手抖|心悸|怕热|消瘦|多食|突眼|甲状腺/,
    questions: [
      { point: '询问起病时间及症状演变过程', scoreRule: '病程特征' },
      { point: '询问有无怕热、多汗、手抖、心悸、消瘦等高代谢症状群', scoreRule: '高代谢症状群' },
      { point: '询问有无颈部增粗、突眼、胫前水肿', scoreRule: '体征相关' },
      { point: '询问近期情绪变化（易怒、焦虑、失眠）', scoreRule: '神经精神症状' },
      { point: '询问家族中有无甲状腺疾病或自身免疫病史', scoreRule: '家族与免疫' }
    ]
  }
}

// ═══════════════════════════════════════════════
// 二、红旗征象关键词 → 筛查项
// ═══════════════════════════════════════════════

const RED_FLAG_TEMPLATES = [
  {
    match: /黑便|呕血|便血|贫血|血色素|Hb\s*[<≤]\s*\d|血红蛋白\s*[<≤]/,
    questions: [
      { point: '筛查询问有无黑便/呕血（排除消化道出血）', scoreRule: '消化道出血筛查', weight: 2 }
    ]
  },
  {
    match: /胸痛.*放射|胸闷.*大汗|心梗|心肌梗死|ACS|急性冠脉/,
    questions: [
      { point: '筛查询问胸痛有无向肩臂/下颌放射、有无大汗', scoreRule: 'ACS筛查', weight: 2 }
    ]
  },
  {
    match: /呼吸困难|端坐呼吸|夜间阵发|粉红色泡沫/,
    questions: [
      { point: '筛查询问有无端坐呼吸、夜间憋醒（排除心衰）', scoreRule: '心衰筛查', weight: 2 }
    ]
  },
  {
    match: /意识障碍|昏迷|深昏迷|浅昏迷|GCS|格拉斯哥/,
    questions: [
      { point: '快速评估意识水平（GCS评分要素）', scoreRule: '意识评估', weight: 2 }
    ]
  },
  {
    match: /休克|血压.*低|低血压|休克指数/,
    questions: [
      { point: '评估循环状态（皮肤湿冷、尿量、毛细血管充盈）', scoreRule: '休克筛查', weight: 2 }
    ]
  },
  {
    match: /高热|超高热|体温\s*[≥>]\s*40|高热.*不退/,
    questions: [
      { point: '筛查询问有无头痛、颈强直（排除中枢神经系统感染）', scoreRule: 'CNS感染筛查', weight: 2 }
    ]
  },
  {
    match: /突然|突发|骤发|急性.*痛/,
    questions: [
      { point: '追问起病的精确时间点和当时在做什么', scoreRule: '急症时间线', weight: 1.5 }
    ]
  }
]

// ═══════════════════════════════════════════════
// 三、固定项子项定义（不需要病例锚定）
// ═══════════════════════════════════════════════

const FIXED_ITEM_DEFS = {
  '既往疾病史': {
    sub: [
      { point: '询问慢性病史（高血压、糖尿病、冠心病、肝病、肾病等）及控制情况', scoreRule: '慢性病史及控制情况' },
      { point: '询问传染病史（肝炎、结核、伤寒等）', scoreRule: '传染病史' },
      { point: '询问既往住院史（时间、原因、诊疗结果）', scoreRule: '住院史' },
      { point: '询问预防接种史', scoreRule: '预防接种史' }
    ]
  },
  '手术外伤史': {
    sub: [
      { point: '询问有无手术史（手术名称、时间、术后恢复情况）', scoreRule: '手术史完整' },
      { point: '询问有无外伤史（受伤时间、部位、处理经过）', scoreRule: '外伤史清楚' },
      { point: '询问有无输血史及输血原因', scoreRule: '输血史明确' }
    ]
  },
  '过敏史': {
    sub: [
      { point: '询问有无药物过敏史（具体药物名称及过敏表现）', scoreRule: '药物过敏史' },
      { point: '询问有无食物或其他物质过敏史', scoreRule: '食物/其他过敏史' },
      { point: '询问过敏反应的严重程度及处理方式', scoreRule: '过敏反应详情' }
    ]
  },
  '个人生活习惯': {
    sub: [
      { point: '询问吸烟史（时长、每日量、是否戒烟）', scoreRule: '吸烟史' },
      { point: '询问饮酒史（种类、频率、每日量）', scoreRule: '饮酒史' },
      { point: '询问职业及工作环境中可能的暴露因素', scoreRule: '职业与暴露' },
      { point: '询问居住环境、饮食习惯及特殊嗜好', scoreRule: '居住环境与习惯' }
    ]
  },
  '家族遗传病史': {
    sub: [
      { point: '询问直系亲属（父母、兄弟姐妹、子女）健康状况', scoreRule: '直系亲属健康状况' },
      { point: '询问家族中有无遗传性疾病', scoreRule: '遗传性疾病史' },
      { point: '询问家族中有无类似疾病患者', scoreRule: '家族类似疾病' }
    ]
  },
  '各系统回顾完整性': {
    sub: [
      { point: '呼吸系统回顾（咳嗽、咳痰、胸闷、呼吸困难）', scoreRule: '呼吸系统' },
      { point: '循环系统回顾（心悸、胸痛、水肿、晕厥）', scoreRule: '循环系统' },
      { point: '消化系统回顾（腹痛、腹胀、恶心、呕吐、排便异常）', scoreRule: '消化系统' },
      { point: '泌尿生殖系统回顾（排尿异常、水肿、月经史/婚育史）', scoreRule: '泌尿生殖系统' },
      { point: '神经系统回顾（头痛、眩晕、感觉异常、运动障碍）', scoreRule: '神经系统' }
    ]
  },
  '问诊条理与组织': {
    sub: [
      { point: '问诊顺序合理，按时间线或系统有序展开', scoreRule: '问诊顺序合理' },
      { point: '主次分明，先聚焦主要问题再扩展细节', scoreRule: '主次分明' },
      { point: '时间分配合理，不遗漏关键信息', scoreRule: '时间分配合理' },
      { point: '避免跳跃式提问，过渡自然流畅', scoreRule: '提问过渡自然' }
    ]
  },
  '沟通技巧与人文关怀': {
    sub: [
      { point: '主动自我介绍并说明问诊目的，态度亲切和蔼', scoreRule: '自我介绍与目的说明' },
      { point: '使用通俗易懂的语言，避免过多医学术语', scoreRule: '语言通俗易懂' },
      { point: '善于倾听，适时给予患者回应和鼓励', scoreRule: '倾听与回应' },
      { point: '适当使用开放式提问，避免诱导性提问', scoreRule: '开放式提问' },
      { point: '表达共情，关注患者感受，妥善回应焦虑或担忧', scoreRule: '共情与关怀' },
      { point: '适时归纳总结，与患者核对确认信息准确性', scoreRule: '归纳总结确认' }
    ]
  }
}

// ═══════════════════════════════════════════════
// 四、辅助函数
// ═══════════════════════════════════════════════

/** 从病例数据提取文本上下文 */
function buildCaseContext(basicData) {
  const pi = basicData.patient_info || {}
  const diagnosis = basicData.diagnosis || {}
  const symptoms = basicData.symptoms || []

  return {
    chiefComplaint: basicData.chief_complaint || '',
    presentIllness: typeof basicData.present_illness === 'string' ? basicData.present_illness : '',
    pastHistory: typeof basicData.past_history === 'string' ? basicData.past_history : '',
    sex: pi.sex === '0' || pi.sex === '女' ? '女' : (pi.sex || ''),
    age: pi.age || '',
    mainSymptom: symptoms[0] || basicData.chief_complaint || '',
    symptoms: symptoms.join('、'),
    primaryDiagnosis: typeof diagnosis.preliminary === 'string'
      ? diagnosis.preliminary
      : (Array.isArray(diagnosis.preliminary) ? diagnosis.preliminary[0] : ''),
    differentialDiagnosis: Array.isArray(diagnosis.differential)
      ? diagnosis.differential.filter(Boolean).join('、')
      : '',
    fullText: [
      basicData.chief_complaint,
      basicData.present_illness,
      basicData.past_history,
      basicData.personal_history,
      basicData.family_history
    ].filter(Boolean).join('\n')
  }
}

/** 匹配主诉类型，返回追问模板 */
function matchSymptomType(chiefComplaint) {
  if (!chiefComplaint) return []
  const allQuestions = []
  for (const [key, template] of Object.entries(SYMPTOM_QUESTION_TEMPLATES)) {
    if (template.match.test(chiefComplaint)) {
      allQuestions.push(...template.questions)
    }
  }
  if (allQuestions.length > 0) return allQuestions
  // 兜底：通用主诉深挖
  return [
    { point: '询问起病时间及起病方式（突发/渐进）', scoreRule: '起病时间与方式' },
    { point: '询问主要表现及严重程度', scoreRule: '症状特点' },
    { point: '询问有无明显诱因或加重/缓解因素', scoreRule: '诱因与缓解因素' },
    { point: '询问有无伴随症状', scoreRule: '伴随症状' }
  ]
}

/** 匹配红旗征象 */
function matchRedFlags(caseContext) {
  const flags = []
  const text = caseContext.fullText
  for (const template of RED_FLAG_TEMPLATES) {
    if (template.match.test(text)) {
      flags.push(...template.questions)
    }
  }
  return flags
}

/** 判断条目是否属于固定项（子串匹配） */
function isFixedItem(itemName) {
  return Object.keys(FIXED_ITEM_DEFS).some(key =>
    itemName.includes(key) || key.includes(itemName)
  )
}

/** 获取固定项的子项（子串匹配） */
function getFixedSubItems(itemName) {
  for (const [key, def] of Object.entries(FIXED_ITEM_DEFS)) {
    if (itemName.includes(key) || key.includes(itemName)) {
      return JSON.parse(JSON.stringify(def.sub))
    }
  }
  return null
}

/** 判断条目是否需要病例锚定 */
function needsCaseAnchoring(item) {
  const category = item.category || ''
  const itemName = item.item || ''
  const combined = category + itemName
  // 现病史相关的条目需要锚定
  if (/现病史|起病|发病|症状|伴随|诊疗经过|一般状况|一般情况/.test(combined)) return true
  // 固定项不需要
  if (isFixedItem(itemName)) return false
  // 既往史/个人史/家族史/系统回顾/问诊技巧/沟通/开场/倾听/条理 → 不锚定
  if (/既往|个人史|家族史|系统|问诊技巧|沟通|开场|倾听|条理|开放|提问|过渡|总结|用药/.test(combined)) return false
  // PE检查条目不需要病例锚定（由静态解析处理）
  if (/视诊|触诊|叩诊|听诊|检查手法|检查内容|检查前准备|洗手|物品准备|阳性体征|保暖|隐私|恢复体位|与患者沟通|按系统顺序|重点部位/.test(combined)) return false
  // 人文沟通条目不需要病例锚定
  if (/共情|情绪|信息.*传达|通俗|确认.*理解|teach.*back|共同.*决策|提供.*选择|尊重.*意愿|后续.*计划|仪表|态度|尊重.*保密|职业.*素养|专业.*风范|建立.*信任|环境.*准备/.test(combined)) return false
  return true
}

/** 按主诉类型将模板问题分配为sub_items并均分总分 */
function scoreTemplateQuestions(questions, totalScore, overrides) {
  if (!questions.length) return []
  const merged = []
  const seen = new Set()
  for (const q of questions) {
    if (!seen.has(q.point)) {
      seen.add(q.point)
      merged.push({ ...q })
    }
  }
  // 如果有 override（红旗等），先加入
  const allItems = [...merged]
  if (overrides && overrides.length) {
    for (const o of overrides) {
      if (!seen.has(o.point)) {
        allItems.push({ ...o })
      }
    }
  }
  const n = allItems.length
  if (n === 0) return []
  const perScore = Math.round(totalScore / n * 2) / 2
  let allocated = 0
  return allItems.map((item, i) => {
    const isLast = i === n - 1
    const score = isLast ? Math.max(0.5, Math.round((totalScore - allocated) * 2) / 2) : perScore
    allocated += score
    return {
      point: item.point,
      score,
      rules: `${item.scoreRule || '按标准评分'}(${score}分)`
    }
  })
}

// ═══════════════════════════════════════════════
// 五、纯函数解析（不依赖LLM）
// ═══════════════════════════════════════════════

/**
 * 纯函数模式解析评分表
 * 固定项→预定义sub_items, 病例锚定项→主诉模板匹配
 *
 * @param {Object} basicData - 病例基础数据
 * @param {Array} templateItems - 评分表模板条目 [{category, item, score, id?}]
 * @param {Object} options
 * @param {string} options.specialty - 专业名称
 * @returns {Array} 解析后的评分表条目，含sub_items
 */
export function parseScoreSheetStatic(basicData, templateItems, options = {}) {
  if (!basicData || !templateItems || !templateItems.length) return []

  const ctx = buildCaseContext(basicData)
  const symptomQuestions = matchSymptomType(ctx.chiefComplaint)
  const redFlagQuestions = matchRedFlags(ctx)
  const mainSymptom = ctx.mainSymptom || '主要症状'

  return templateItems.map(item => {
    const itemName = item.item || ''
    const totalScore = item.score || 0
    const combined = (item.category || '') + itemName

    // 固定项
    const fixed = getFixedSubItems(itemName)
    if (fixed) {
      return {
        ...item,
        sub_items: fixed.map(sub => ({
          point: sub.point,
          score: Math.round(totalScore / fixed.length * 2) / 2,
          rules: `${sub.scoreRule}(${Math.round(totalScore / fixed.length * 2) / 2}分)`
        }))
      }
    }

    // 病例锚定项 - 根据类型生成
    if (/起病|发病.*时间|发病.*诱因/.test(itemName)) {
      return {
        ...item,
        sub_items: scoreTemplateQuestions(symptomQuestions.slice(0, 4), totalScore)
      }
    }

    if (/症状特点|主要症状/.test(itemName)) {
      return {
        ...item,
        sub_items: scoreTemplateQuestions(symptomQuestions.slice(2), totalScore)
      }
    }

    if (/伴随|鉴别/.test(itemName)) {
      const differentialQs = ctx.differentialDiagnosis
        ? [{ point: `询问有鉴别意义的阴性症状（${ctx.differentialDiagnosis}相关）`, scoreRule: '鉴别症状排查' }]
        : []
      return {
        ...item,
        sub_items: scoreTemplateQuestions(
          [{ point: `主动询问有无其他伴随症状`, scoreRule: '伴随症状问询完整' },
           { point: `询问伴随症状与${mainSymptom}的时间关系和先后顺序`, scoreRule: '伴随与主症状关系' },
           ...differentialQs],
          totalScore
        )
      }
    }

    if (/诊疗经过/.test(itemName)) {
      return {
        ...item,
        sub_items: [
          { point: '询问发病后就诊的医院及科室', score: Math.round(totalScore / 3 * 2) / 2, rules: `就诊医院科室明确(${Math.round(totalScore / 3 * 2) / 2}分)` },
          { point: '询问已做的检查项目及结果（实验室、影像学等）', score: Math.round(totalScore / 3 * 2) / 2, rules: `检查项目及结果清楚(${Math.round(totalScore / 3 * 2) / 2}分)` },
          { point: '询问用药情况（药物名称、剂量、疗程、效果）', score: Math.max(0.5, Math.round((totalScore - Math.round(totalScore / 3 * 2) * 2) * 2) / 2), rules: `用药情况详细(${Math.max(0.5, Math.round((totalScore - Math.round(totalScore / 3 * 2) * 2) * 2) / 2)}分)` }
        ]
      }
    }

    if (/一般状况|一般情况/.test(itemName)) {
      return {
        ...item,
        sub_items: [
          { point: '询问发病以来的饮食及食欲变化', score: Math.round(totalScore / 4 * 2) / 2, rules: `饮食情况(${Math.round(totalScore / 4 * 2) / 2}分)` },
          { point: '询问睡眠状况有无改变', score: Math.round(totalScore / 4 * 2) / 2, rules: `睡眠状况(${Math.round(totalScore / 4 * 2) / 2}分)` },
          { point: '询问大小便情况（频次、性状、颜色）', score: Math.round(totalScore / 4 * 2) / 2, rules: `大小便情况(${Math.round(totalScore / 4 * 2) / 2}分)` },
          { point: '询问体重有无明显变化', score: Math.max(0.5, Math.round((totalScore - Math.round(totalScore / 4 * 2) * 3) * 2) / 2), rules: `体重变化(${Math.max(0.5, Math.round((totalScore - Math.round(totalScore / 4 * 2) * 3) * 2) / 2)}分)` }
        ]
      }
    }

    // 用药史
    if (/用药/.test(itemName)) {
      return {
        ...item,
        sub_items: [
          { point: '询问长期用药史（药物名称、剂量、用药时间）', score: Math.round(totalScore / 2 * 2) / 2, rules: `长期用药史(${Math.round(totalScore / 2 * 2) / 2}分)` },
          { point: '询问近期用药调整情况', score: Math.max(0.5, Math.round((totalScore - Math.round(totalScore / 2 * 2) / 2) * 2) / 2), rules: `近期调整(${Math.max(0.5, Math.round((totalScore - Math.round(totalScore / 2 * 2) / 2) * 2) / 2)}分)` }
        ]
      }
    }

    // 各系统回顾 / 与主诉相关系统重点回顾
    if (/各系统|系统回顾|系统.*重点|系统症状/.test(itemName)) {
      return {
        ...item,
        sub_items: [
          { point: '呼吸系统回顾（咳嗽、咳痰、胸闷、呼吸困难）', score: Math.round(totalScore / 5 * 2) / 2, rules: `呼吸系统(${Math.round(totalScore / 5 * 2) / 2}分)` },
          { point: '循环系统回顾（心悸、胸痛、水肿、晕厥）', score: Math.round(totalScore / 5 * 2) / 2, rules: `循环系统(${Math.round(totalScore / 5 * 2) / 2}分)` },
          { point: '消化系统回顾（腹痛、腹胀、恶心、呕吐、排便异常）', score: Math.round(totalScore / 5 * 2) / 2, rules: `消化系统(${Math.round(totalScore / 5 * 2) / 2}分)` },
          { point: '泌尿生殖系统回顾（排尿异常、水肿、月经史/婚育史）', score: Math.round(totalScore / 5 * 2) / 2, rules: `泌尿生殖系统(${Math.round(totalScore / 5 * 2) / 2}分)` },
          { point: '神经系统回顾（头痛、眩晕、感觉异常、运动障碍）', score: Math.max(0.5, Math.round((totalScore - Math.round(totalScore / 5 * 2) * 4) * 2) / 2), rules: `神经系统(${Math.max(0.5, Math.round((totalScore - Math.round(totalScore / 5 * 2) * 4) * 2) / 2)}分)` }
        ]
      }
    }

    // 问诊技巧子项
    if (/开场|自我介绍/.test(itemName)) {
      return {
        ...item,
        sub_items: [
          { point: '主动向患者自我介绍，说明姓名和职责', score: Math.round(totalScore / 2 * 2) / 2, rules: `自我介绍完整(${Math.round(totalScore / 2 * 2) / 2}分)` },
          { point: '说明本次问诊目的和大致时长', score: Math.max(0.5, totalScore - Math.round(totalScore / 2 * 2) / 2), rules: `目的说明清晰(${Math.max(0.5, totalScore - Math.round(totalScore / 2 * 2) / 2)}分)` }
        ]
      }
    }
    if (/开放|提问/.test(itemName)) {
      return {
        ...item,
        sub_items: [
          { point: '以开放式问题开始问诊', score: Math.round(totalScore / 2 * 2) / 2, rules: `开放式引导(${Math.round(totalScore / 2 * 2) / 2}分)` },
          { point: '避免诱导性或封闭式连续提问', score: Math.max(0.5, totalScore - Math.round(totalScore / 2 * 2) / 2), rules: `避免诱导(${Math.max(0.5, totalScore - Math.round(totalScore / 2 * 2) / 2)}分)` }
        ]
      }
    }
    if (/倾听|回应/.test(itemName)) {
      return {
        ...item,
        sub_items: [
          { point: '保持眼神接触和专注姿态，不随意打断患者', score: Math.round(totalScore / 2 * 2) / 2, rules: `倾听态度(${Math.round(totalScore / 2 * 2) / 2}分)` },
          { point: '对患者表述给予适当口头回应和鼓励', score: Math.max(0.5, totalScore - Math.round(totalScore / 2 * 2) / 2), rules: `积极回应(${Math.max(0.5, totalScore - Math.round(totalScore / 2 * 2) / 2)}分)` }
        ]
      }
    }
    if (/条理|逻辑/.test(itemName)) {
      return {
        ...item,
        sub_items: [
          { point: '按时间线或系统有序推进，不跳跃', score: Math.round(totalScore / 2 * 2) / 2, rules: `顺序合理(${Math.round(totalScore / 2 * 2) / 2}分)` },
          { point: '有明确的主次意识，先核心问题后细节', score: Math.max(0.5, totalScore - Math.round(totalScore / 2 * 2) / 2), rules: `主次分明(${Math.max(0.5, totalScore - Math.round(totalScore / 2 * 2) / 2)}分)` }
        ]
      }
    }
    if (/过渡|总结/.test(itemName)) {
      return {
        ...item,
        sub_items: [
          { point: '在问诊段落间使用过渡语句，引导自然', score: Math.round(totalScore / 2 * 2) / 2, rules: `过渡自然(${Math.round(totalScore / 2 * 2) / 2}分)` },
          { point: '适时总结已获取的信息，与患者核对确认', score: Math.max(0.5, totalScore - Math.round(totalScore / 2 * 2) / 2), rules: `总结确认(${Math.max(0.5, totalScore - Math.round(totalScore / 2 * 2) / 2)}分)` }
        ]
      }
    }

    // 职业与环境暴露
    if (/职业|环境暴露/.test(itemName)) {
      return {
        ...item,
        sub_items: [
          { point: '询问具体职业及工种', score: Math.round(totalScore / 3 * 2) / 2, rules: `职业信息(${Math.round(totalScore / 3 * 2) / 2}分)` },
          { point: '询问工作环境有无粉尘/化学/噪音等暴露', score: Math.round(totalScore / 3 * 2) / 2, rules: `环境暴露(${Math.round(totalScore / 3 * 2) / 2}分)` },
          { point: '询问职业暴露对身体健康的影响', score: Math.max(0.5, Math.round((totalScore - Math.round(totalScore / 3 * 2) * 2) * 2) / 2), rules: `影响评估(${Math.max(0.5, Math.round((totalScore - Math.round(totalScore / 3 * 2) * 2) * 2) / 2)}分)` }
        ]
      }
    }

    // PE 检查手法类：视诊/触诊/叩诊/听诊 → 展开为检查要点
    if (/视诊|触诊|叩诊|听诊|检查手法|检查内容|阳性体征|检查前准备|洗手|物品准备|保暖|隐私|恢复体位|与患者沟通|按系统顺序|重点部位/.test(combined)) {
      const peSub = []
      const s2 = Math.round(totalScore * 0.5 * 2) / 2  // 50% for execution
      const s3 = Math.round(totalScore * 0.3 * 2) / 2  // 30% for technique
      const sRest = Math.max(0.5, Math.round((totalScore - s2 - s3) * 2) / 2) // remainder

      // 核心思路：每个检查方法分三层 — 做了没有 → 做得规范吗 → 细节到位吗
      if (/视诊/.test(itemName)) {
        peSub.push({ point: '执行了视诊检查（如心脏视诊、腹部视诊等）', score: s2, rules: '执行视诊' })
        peSub.push({ point: '视诊时充分暴露检查区域，观察仔细', score: s3, rules: '视诊充分暴露' })
        if (sRest > 0) peSub.push({ point: '视诊光线充足，检查环境适当', score: sRest, rules: '视诊环境' })
      } else if (/触诊/.test(itemName)) {
        peSub.push({ point: '执行了触诊检查（如腹部触诊、甲状腺触诊等）', score: s2, rules: '执行触诊' })
        peSub.push({ point: '触诊手法正确，力度适中', score: s3, rules: '触诊手法' })
        if (sRest > 0) peSub.push({ point: '触诊顺序合理，系统有序', score: sRest, rules: '触诊顺序' })
      } else if (/叩诊/.test(itemName)) {
        peSub.push({ point: '执行了叩诊检查（如胸部叩诊、腹部叩诊等）', score: s2, rules: '执行叩诊' })
        peSub.push({ point: '叩诊手法规范，对比叩诊', score: s3, rules: '叩诊手法' })
        if (sRest > 0) peSub.push({ point: '叩诊部位准确，力度适当', score: sRest, rules: '叩诊部位' })
      } else if (/听诊/.test(itemName)) {
        peSub.push({ point: '执行了听诊检查（如心脏听诊、肺部听诊等）', score: s2, rules: '执行听诊' })
        peSub.push({ point: '听诊部位准确，涵盖主要听诊区', score: s3, rules: '听诊部位' })
        if (sRest > 0) peSub.push({ point: '听诊器使用正确，听诊时间充分', score: sRest, rules: '听诊器使用' })
      } else if (/检查手法|检查内容/.test(itemName)) {
        peSub.push({ point: '按系统顺序执行检查，内容全面', score: s2, rules: '系统顺序' })
        peSub.push({ point: '检查部位定位准确，无遗漏', score: s3, rules: '部位准确' })
        if (sRest > 0) peSub.push({ point: '检查手法规范熟练', score: sRest, rules: '手法规范' })
      } else if (/检查前准备|洗手/.test(itemName)) {
        peSub.push({ point: '操作前洗手或手消毒', score: Math.round(totalScore / 3 * 2) / 2, rules: '手卫生' })
        peSub.push({ point: '自我介绍并解释检查目的', score: Math.round(totalScore / 3 * 2) / 2, rules: '沟通说明' })
        peSub.push({ point: '检查所需物品准备齐全', score: Math.max(0.5, Math.round((totalScore - Math.round(totalScore / 3 * 2) * 2) * 2) / 2), rules: '物品准备' })
      } else if (/保护.*患者|保护.*隐私|隐私/.test(itemName)) {
        peSub.push({ point: '检查过程中注意保护患者隐私，遮挡无关部位', score: Math.round(totalScore / 2 * 2) / 2, rules: '隐私保护' })
        peSub.push({ point: '检查结束后及时整理衣物', score: Math.max(0.5, totalScore - Math.round(totalScore / 2 * 2) / 2), rules: '整理衣物' })
      } else if (/保暖/.test(itemName)) {
        peSub.push({ point: '检查过程中注意保暖，避免患者受凉', score: Math.round(totalScore / 2 * 2) / 2, rules: '保暖操作' })
        peSub.push({ point: '检查后帮助患者恢复衣物或调整环境温度', score: Math.max(0.5, totalScore - Math.round(totalScore / 2 * 2) / 2), rules: '检查后保暖' })
      } else if (/恢复体位/.test(itemName)) {
        peSub.push({ point: '检查后帮助患者恢复舒适体位', score: Math.round(totalScore / 2 * 2) / 2, rules: '体位恢复' })
        peSub.push({ point: '询问患者有无不适', score: Math.max(0.5, totalScore - Math.round(totalScore / 2 * 2) / 2), rules: '不适询问' })
      } else if (/阳性体征/.test(itemName)) {
        peSub.push({ point: '阳性体征准确识别与描述', score: Math.round(totalScore / 2 * 2) / 2, rules: '阳性体征识别' })
        peSub.push({ point: '阳性体征与病例关联分析', score: Math.max(0.5, totalScore - Math.round(totalScore / 2 * 2) / 2), rules: '体征关联分析' })
      } else if (/与患者沟通/.test(itemName)) {
        peSub.push({ point: '检查过程中向患者解释操作目的', score: Math.round(totalScore / 3 * 2) / 2, rules: '解释操作' })
        peSub.push({ point: '检查中关注患者反应并给予回应', score: Math.round(totalScore / 3 * 2) / 2, rules: '关注反应' })
        peSub.push({ point: '检查后告知患者初步发现', score: Math.max(0.5, Math.round((totalScore - Math.round(totalScore / 3 * 2) * 2) * 2) / 2), rules: '告知发现' })
      } else if (/按系统顺序/.test(itemName)) {
        peSub.push({ point: '按系统顺序执行检查，不遗漏关键系统', score: Math.round(totalScore / 2 * 2) / 2, rules: '系统顺序完整' })
        peSub.push({ point: '检查覆盖了与主诉相关的重点系统', score: Math.max(0.5, totalScore - Math.round(totalScore / 2 * 2) / 2), rules: '重点系统覆盖' })
      } else if (/重点部位/.test(itemName)) {
        peSub.push({ point: '对病变相关部位进行详细检查', score: Math.round(totalScore / 2 * 2) / 2, rules: '病变部位详查' })
        peSub.push({ point: '检查包含关键鉴别诊断所需体征', score: Math.max(0.5, totalScore - Math.round(totalScore / 2 * 2) / 2), rules: '鉴别体征检查' })
      }
      if (peSub.length > 0) return { ...item, sub_items: peSub }
    }

    // 人文沟通类：共情/决策/传达/确认理解等 → 按主题展开
    if (/共情|情绪|人文|沟通|信息.*传达|通俗|teach.*back|确认.*理解|共同.*决策|提供.*选择|尊重.*意愿|后续.*计划|明确.*后续|仪表|态度|尊重.*保密|职业.*素养|专业.*风范|建立.*信任/.test(combined)) {
      const huSub = []
      if (/信息.*传达|通俗/.test(itemName)) {
        huSub.push(
          { point: '使用通俗易懂的语言，避免过多医学术语', score: Math.round(totalScore / 2 * 2) / 2, rules: '语言通俗' },
          { point: '信息传达清晰准确，逻辑层次分明', score: Math.max(0.5, totalScore - Math.round(totalScore / 2 * 2) / 2), rules: '传达清晰' }
        )
      }
      if (/确认.*理解|teach.*back/.test(itemName)) {
        huSub.push(
          { point: '适当使用teach-back方法确认患者理解', score: Math.round(totalScore / 2 * 2) / 2, rules: '确认理解' },
          { point: '发现误解时及时澄清', score: Math.max(0.5, totalScore - Math.round(totalScore / 2 * 2) / 2), rules: '误解澄清' }
        )
      }
      if (/共情|情绪/.test(itemName)) {
        huSub.push(
          { point: '准确识别患者的情绪状态（焦虑/恐惧/愤怒/悲伤）', score: Math.round(totalScore / 3 * 2) / 2, rules: '情绪识别' },
          { point: '对患者情绪表达共情与理解', score: Math.round(totalScore / 3 * 2) / 2, rules: '共情表达' },
          { point: '恰当回应患者的疑问与担忧', score: Math.max(0.5, Math.round((totalScore - Math.round(totalScore / 3 * 2) * 2) * 2) / 2), rules: '回应担忧' }
        )
      }
      if (/共同.*决策|提供.*选择/.test(itemName)) {
        huSub.push(
          { point: '向患者提供可行的诊疗方案选择', score: Math.round(totalScore / 2 * 2) / 2, rules: '方案提供' },
          { point: '充分尊重患者的意愿和选择', score: Math.max(0.5, totalScore - Math.round(totalScore / 2 * 2) / 2), rules: '尊重意愿' }
        )
      }
      if (/尊重.*意愿/.test(itemName) && huSub.length === 0) {
        huSub.push(
          { point: '询问患者对诊疗方案的看法和顾虑', score: Math.round(totalScore / 2 * 2) / 2, rules: '询问看法' },
          { point: '在患者意愿和医学建议之间寻求平衡', score: Math.max(0.5, totalScore - Math.round(totalScore / 2 * 2) / 2), rules: '平衡意愿' }
        )
      }
      if (/后续.*计划|明确.*后续/.test(itemName)) {
        huSub.push(
          { point: '明确告知后续步骤和时间节点', score: Math.round(totalScore / 2 * 2) / 2, rules: '告知计划' },
          { point: '确认患者知晓并同意后续安排', score: Math.max(0.5, totalScore - Math.round(totalScore / 2 * 2) / 2), rules: '确认同意' }
        )
      }
      if (/仪表|态度|职业.*素养|专业.*风范/.test(itemName)) {
        huSub.push(
          { point: '仪表端庄得体，态度和蔼可亲', score: Math.round(totalScore / 2 * 2) / 2, rules: '仪表态度' },
          { point: '全程保持专业风范，尊重患者', score: Math.max(0.5, totalScore - Math.round(totalScore / 2 * 2) / 2), rules: '专业风范' }
        )
      }
      if (/尊重.*保密/.test(itemName)) {
        huSub.push(
          { point: '不泄露患者隐私信息', score: Math.round(totalScore / 2 * 2) / 2, rules: '隐私保密' },
          { point: '在适当环境中进行敏感话题沟通', score: Math.max(0.5, totalScore - Math.round(totalScore / 2 * 2) / 2), rules: '环境适当' }
        )
      }
      if (/建立.*信任|环境.*准备/.test(itemName)) {
        huSub.push(
          { point: '营造安静私密的沟通环境', score: Math.round(totalScore / 2 * 2) / 2, rules: '环境准备' },
          { point: '通过积极倾听和开放态度建立信任', score: Math.max(0.5, totalScore - Math.round(totalScore / 2 * 2) / 2), rules: '建立信任' }
        )
      }
      if (huSub.length > 0) return { ...item, sub_items: huSub }
    }

    // 红旗筛查项：仅对病史采集相关条目生效，且仅在明确无其他匹配时
    if (redFlagQuestions.length > 0 && /现病史|起病|发病|伴随|症状|诊断依据|危重|筛查/.test(combined)) {
      return {
        ...item,
        sub_items: scoreTemplateQuestions(redFlagQuestions, totalScore)
      }
    }

    // 其他无法归类的 → 保留原样
    return {
      ...item,
      sub_items: [{ point: itemName, score: totalScore, rules: `按标准评分(${totalScore}分)` }]
    }
  })
}

// ═══════════════════════════════════════════════
// 六、LLM增强解析
// ═══════════════════════════════════════════════

const PARSE_SYSTEM_PROMPT = `你是一名资深临床医学教育考官。你的任务是将通用评分表条目展开为针对具体病例的评分子项。

## 规则
1. 对每个条目，根据病例信息生成2-6个具体的评分子项(sub_items)
2. 每个子项包含: point(具体评分要点描述)、score(分值，所有子项分值之和等于该条目总分)、rules(评分规则简述)
3. 评分要点必须引用病例中的具体细节（症状名、诊断名、该病例特有的鉴别点）
4. 固定类条目（既往史/个人史/家族史/系统回顾/问诊技巧）不需要展开，标记为"skip"
5. 现病史相关条目是展开重点，要结合病例的主诉和诊断深入设计追问点
6. 如果病例中有红旗征象/危重症线索，为相关条目增加高危筛查子项

## 输出格式
严格JSON数组，每个元素对应一个条目:
[{
  "index": 条目在输入数组中的序号(0-based),
  "skip": true,  // 仅固定类条目标记为true
  "sub_items": [
    { "point": "评分要点", "score": 分值数字, "rules": "评分规则" }
  ]
}]
注意：不要包含任何解释文字，只输出JSON数组。`

/**
 * LLM增强模式：对病例锚定条目调用LLM展开
 *
 * @param {Object} basicData - 病例数据
 * @param {Array} templateItems - 评分表条目
 * @param {Object} llmConfig - { apiUrl, apiKey, model }
 * @param {Object} options
 * @returns {Promise<Array>} 解析后的评分表
 */
export async function parseScoreSheetWithLLM(basicData, templateItems, llmConfig, options = {}) {
  if (!llmConfig || !llmConfig.apiKey || llmConfig.apiKey === 'your-api-key-here') {
    console.warn('[scoreSheetParser] LLM config incomplete, falling back to static parse')
    return parseScoreSheetStatic(basicData, templateItems, options)
  }

  // 分离固定项和锚定项
  const anchoredIndices = []
  const anchoredItems = []
  for (let i = 0; i < templateItems.length; i++) {
    if (needsCaseAnchoring(templateItems[i])) {
      anchoredIndices.push(i)
      anchoredItems.push(templateItems[i])
    }
  }

  if (anchoredItems.length === 0) {
    return parseScoreSheetStatic(basicData, templateItems, options)
  }

  const ctx = buildCaseContext(basicData)
  const caseSummary = [
    `主诉: ${ctx.chiefComplaint}`,
    `现病史: ${ctx.presentIllness}`,
    `主要诊断: ${ctx.primaryDiagnosis || '未明确'}`,
    `鉴别诊断: ${ctx.differentialDiagnosis || '未明确'}`,
    `临床表现: ${ctx.symptoms}`,
    `既往史: ${ctx.pastHistory}`,
  ].join('\n')

  const itemsSummary = anchoredItems.map((it, i) =>
    `[${i}] ${it.category || ''} — ${it.item || ''} (${it.score || 0}分)`
  ).join('\n')

  const prompt = `## 病例信息\n${caseSummary}\n\n## 需要展开的评分条目\n${itemsSummary}\n\n请为每个条目生成评分子项。`

  // 调用LLM
  let llmResult
  try {
    llmResult = await callLLMForParse(prompt, llmConfig)
  } catch (e) {
    console.warn('[scoreSheetParser] LLM call failed, falling back to static:', e.message)
    return parseScoreSheetStatic(basicData, templateItems, options)
  }

  // 合并结果
  const llmMap = {}
  for (const entry of (llmResult || [])) {
    if (!entry.skip && entry.sub_items) {
      llmMap[entry.index] = entry.sub_items
    }
  }

  return templateItems.map((item, i) => {
    const anchoredIdx = anchoredIndices.indexOf(i)
    if (anchoredIdx >= 0 && llmMap[anchoredIdx]) {
      // 验证分值之和
      const subItems = llmMap[anchoredIdx]
      const totalScore = item.score || 0
      const subTotal = subItems.reduce((s, si) => s + (si.score || 0), 0)
      if (Math.abs(subTotal - totalScore) > 2) {
        // 分值偏差>2分时重缩放
        const scale = totalScore / subTotal
        for (const si of subItems) {
          si.score = Math.round(si.score * scale * 2) / 2
        }
      }
      return { ...item, sub_items: subItems }
    }
    // LLM未覆盖的 → 静态解析
    const staticResult = parseScoreSheetStatic(basicData, [item], options)
    return staticResult[0] || { ...item, sub_items: [] }
  })
}

async function callLLMForParse(prompt, llmConfig) {
  const { apiUrl, apiKey, model } = llmConfig
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 120000)

  try {
    const reqBody = {
      model,
      messages: [
        { role: 'system', content: PARSE_SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 8192
    }
    if (model && model.startsWith('deepseek')) {
      reqBody.thinking = { type: 'disabled' }
    } else if (model && model.startsWith('qwen')) {
      reqBody.enable_thinking = false
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify(reqBody),
      signal: controller.signal
    })
    clearTimeout(timeout)

    if (!response.ok) {
      throw new Error(`LLM API error ${response.status}`)
    }
    const result = await response.json()
    const content = result.choices?.[0]?.message?.content || ''

    // JSON 修复
    let jsonStr = content.trim()
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '')
    }
    // 修复常见格式问题
    jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1')
    return JSON.parse(jsonStr)
  } finally {
    clearTimeout(timeout)
  }
}

// ═══════════════════════════════════════════════
// 七、主入口
// ═══════════════════════════════════════════════

/**
 * 解析评分表 — 将通用条目展开为病例锚定子项
 *
 * @param {Object} params
 * @param {Object} params.basicData - 病例基础数据
 * @param {Array}  params.templateItems - 评分表条目 [{category, item, score, id?}]
 * @param {string} [params.specialty] - 专业名称
 * @param {Object} [params.llmConfig] - LLM配置 {apiUrl, apiKey, model}，不传则纯函数解析
 * @returns {Promise<Array>|Array} 解析后的评分表条目，含sub_items
 */
export function parseScoreSheet({ basicData, templateItems, specialty, llmConfig } = {}) {
  if (!basicData) throw new Error('parseScoreSheet: basicData is required')
  if (!templateItems || !templateItems.length) throw new Error('parseScoreSheet: templateItems is required')

  if (llmConfig) {
    return parseScoreSheetWithLLM(basicData, templateItems, llmConfig, { specialty })
  }
  return parseScoreSheetStatic(basicData, templateItems, { specialty })
}

// 导出模板库供外部使用/扩展
export { SYMPTOM_QUESTION_TEMPLATES, RED_FLAG_TEMPLATES, FIXED_ITEM_DEFS, buildCaseContext, matchSymptomType, matchRedFlags }
