/**
 * 人体系统分类表（医工慧检首页「按系统推荐病例」+ 病例列表「系统」筛选共用）
 *
 * 病例索引里没有现成的「系统」字段（只有 specialty / category），所以按关键词归类。
 * 只用 **分类 / 病种 / 病例名 / 专业** 四个字段判系统，**不看症状与主诉**——
 * 症状（头痛、呼吸困难、少尿…）跨系统出现，会把一氧化碳中毒判成神经系统、
 * 把心梗判成呼吸系统，实测踩过这个坑。
 *
 * 匹配顺序（MATCH_ORDER）与展示顺序（BODY_SYSTEMS）分开：
 *   - 展示顺序：首页卡片的默认排列；
 *   - 匹配顺序：谁先命中算谁的。例：
 *       病毒性肝炎 → 感染与传染病（不是因为肝不重要，而是它按传染病急症收治）
 *       大疱性类天疱疮（伴糖尿病…）→ 免疫与皮肤（皮肤关键词先于内分泌）
 *       肝癌伴门静脉瘤栓 → 消化系统（消化先于循环，否则"静脉"把它拽到循环）
 */

export const BODY_SYSTEMS = [
  {
    key: 'circulation',
    name: '循环系统',
    icon: 'fa-heart-pulse',
    color: '#e11d48',
    bg: '#fff1f2',
    keywords: ['循环', '心血管', '心肌', '心梗', '冠心病', '高血压', '心衰', '心力衰竭', '心律', '心包', '动脉', '静脉'],
  },
  {
    key: 'respiratory',
    name: '呼吸系统',
    icon: 'fa-lungs',
    color: '#0284c7',
    bg: '#f0f9ff',
    keywords: ['呼吸', '肺', '支气管', '哮喘', '气胸', '咳嗽', '咯血', '胸腔积液', '肺结节'],
  },
  {
    key: 'digestive',
    name: '消化系统',
    icon: 'fa-utensils',
    color: '#d97706',
    bg: '#fffbeb',
    keywords: ['消化', '肝', '胆', '胰', '胃', '肠', '阑尾', '腹水', '腹泻', '黄疸', '呕血', '黑便', '急腹症'],
  },
  {
    key: 'nervous',
    name: '神经系统',
    icon: 'fa-brain',
    color: '#4f46e5',
    bg: '#eef2ff',
    keywords: ['神经', '脑', '卒中', '癫痫', '偏瘫', '颅内', '帕金森', '共济失调', '脊髓'],
  },
  {
    key: 'urinary',
    name: '泌尿系统',
    icon: 'fa-droplet',
    color: '#2563eb',
    bg: '#eff6ff',
    keywords: ['泌尿', '肾', '尿', '膀胱', '前列腺', '透析', '肌酐'],
  },
  {
    key: 'endocrine',
    name: '内分泌系统',
    icon: 'fa-dna',
    color: '#0891b2',
    bg: '#ecfeff',
    keywords: ['内分泌', '糖尿病', '甲状腺', 'graves', '肾上腺', '垂体', '代谢', '矮小', '性早熟', '痛风', '电解质'],
  },
  {
    key: 'hematology',
    name: '血液系统',
    icon: 'fa-vials',
    color: '#dc2626',
    bg: '#fef2f2',
    keywords: ['血液', '贫血', '白血病', '血小板', '凝血', '淋巴瘤', '骨髓', '血友病', '紫癜'],
  },
  {
    key: 'immune',
    name: '免疫与皮肤',
    icon: 'fa-shield-virus',
    color: '#ca8a04',
    bg: '#fefce8',
    keywords: ['皮肤', '疱', '银屑', '红斑狼疮', '免疫', '风湿', '皮炎', '荨麻疹', '过敏', '干燥综合征', '白塞'],
  },
  {
    key: 'musculoskeletal',
    name: '运动系统',
    icon: 'fa-bone',
    color: '#0d9488',
    bg: '#f0fdfa',
    keywords: ['骨', '关节', '脊柱', '腰椎', '膝', '骨折', '肌腱', '半月板', '颈椎', '肩袖'],
  },
  {
    key: 'reproduction',
    name: '生殖系统',
    icon: 'fa-baby',
    color: '#db2777',
    bg: '#fdf2f8',
    keywords: ['妇产', '妇科', '产科', '孕', '胎盘', '子宫', '卵巢', '分娩', '月经', '妊娠', '产程', '乳腺', '不孕'],
  },
  {
    key: 'mental',
    name: '精神心理',
    icon: 'fa-face-smile',
    color: '#7c3aed',
    bg: '#f5f3ff',
    keywords: ['精神', '心理', '抑郁', '焦虑', '分裂', '应激', 'ptsd', '强迫', '双相', '失眠', '情绪障碍'],
  },
  {
    key: 'infection',
    name: '感染与传染病',
    icon: 'fa-bacterium',
    color: '#16a34a',
    bg: '#f0fdf4',
    keywords: ['感染', '传染', '出血热', '结核', '脓毒', '败血症', '病毒性肝炎', '艾滋', '疟疾', '破伤风', '发热待查'],
  },
  {
    key: 'emergency',
    name: '急诊与危重症',
    icon: 'fa-truck-medical',
    color: '#ea580c',
    bg: '#fff7ed',
    keywords: ['中毒', '休克', '危重', '复苏', '多脏器', '创伤', '外伤', '溺水', '电击', '一氧化碳'],
  },
]

/**
 * 匹配优先级（先命中先定系统）。刻意与展示顺序不同：
 * 生殖/精神/免疫 在前——这几个系统的病名字面常带别的系统词（"伴糖尿病""伴呼吸急促"），
 * 先判掉才不会串系统；消化放在循环前——"肝癌伴门静脉瘤栓"里"静脉"会误判成循环。
 */
const MATCH_ORDER = [
  'reproduction',
  'mental',
  'immune',
  'hematology',
  'endocrine',
  'infection',
  'urinary',
  'respiratory',
  'nervous',
  'digestive',
  'circulation',
  'musculoskeletal',
  'emergency',
]

/**
 * 首页「按系统推荐病例」的展示顺序（2026-11-21 客户口径）：
 * 常见系统疾病排在前面——呼吸、消化、循环、神经、内分泌；泌尿/血液/免疫/运动居中；
 * 生殖、感染、急诊这类专科性强的靠后。
 * 注意：这是**展示顺序**，与上面的 MATCH_ORDER（判系统用）是两回事，别混用。
 */
export const HOME_SYSTEM_ORDER = [
  'respiratory',
  'digestive',
  'circulation',
  'nervous',
  'endocrine',
  'urinary',
  'hematology',
  'immune',
  'musculoskeletal',
  'reproduction',
  'infection',
  'emergency',
]

/** 首页不展示的系统（病例仍在，走「全部病例」还能看）：精神心理不做首页推荐位 */
export const HOME_HIDDEN_SYSTEMS = ['mental']

/** 演示/测试病例编号前缀，不计入系统推荐与统计（病例列表仍可见） */
const TEST_CASE_PREFIX = 'TEST-'

export function isTestCase(caseItem) {
  const id = (caseItem && (caseItem.id || caseItem.case_id || caseItem.caseId)) || ''
  return String(id).toUpperCase().startsWith(TEST_CASE_PREFIX)
}

/**
 * 判断一个病例属于哪个人体系统
 * @param {Object} caseItem 病例索引项（/api/cases 返回，或 CaseList 归一化后的对象）
 * @returns {Object|null} BODY_SYSTEMS 中的一项；未命中返回 null
 */
export function classifyCaseSystem(caseItem) {
  if (!caseItem) return null
  const text = [caseItem.category, caseItem.disease, caseItem.title, caseItem.specialty]
    .filter(Boolean).join(' ').toLowerCase()
  if (!text) return null

  for (const key of MATCH_ORDER) {
    const system = BODY_SYSTEMS.find(s => s.key === key)
    if (!system) continue
    if (system.keywords.some(k => text.indexOf(k.toLowerCase()) >= 0)) return system
  }
  return null
}

/** 按 key 取系统定义 */
export function getBodySystem(key) {
  return BODY_SYSTEMS.find(s => s.key === key) || null
}
