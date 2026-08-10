// ═══════════════════════════════════════════════════════════════
// 体格检查模板构建 — 从病例真实查体数据生成粒度化检查模板
// StationLoading（预加载写 sessionStorage）与 PhysicalExam（兜底）共用
// 返回格式：{ category, items: [{ name, result }] }
// ═══════════════════════════════════════════════════════════════

// 判分查体项目 → 结果来源规则（按特异性从高到低匹配）
const FINDING_RULES = [
  { keys: ['心脏', '瓣膜', '杂音', '心律', '心音'], region: 'heart' },
  { keys: ['双肺', '呼吸音', '啰音', '肺部'], region: 'lungs' },
  { keys: ['腹部叩诊', '移动性浊音', '叩击痛'], region: 'abdomen' },
  { keys: ['腹部触诊', '压痛', '反跳痛', '肝脾', '麦氏', 'murphy'], region: 'abdomen' },
  { keys: ['腹部视诊', '腹壁静脉', '胃肠型', '腹部外形'], region: 'abdomen_visual' },
  { keys: ['巩膜', '肝掌', '蜘蛛痣'], region: 'skin' },
  { keys: ['面容', '体态', '一般情况', '发育', '营养'], region: 'general' },
  { keys: ['生命体征', '血压', '体温', '脉搏', '心率', '呼吸'], region: 'vital' },
  { keys: ['下肢', '水肿'], region: 'edema' },
]

// 过程性/人文类项目不构成查体结果，跳过
function isProcessItem(name) {
  return /人文|关怀|保暖|解释动作|沟通|尊重|语气|隐私/.test(name)
}

// 自由文本查体键 → 中文检查名（PhysicalExam 原 CAT_LABELS 对齐）
const PE_CAT_LABELS = {
  vital_signs: '生命体征', general: '一般情况', heent: '头颈部', neck: '颈部',
  chest_lung: '胸部/肺部', heart: '心脏', abdomen: '腹部',
  neuro: '神经系统', skin: '皮肤', extremity: '四肢脊柱', vascular: '血管',
  systemic: '系统查体', lymph: '淋巴结'
}

function deriveFinding(name, ctx) {
  const { vital, general, systemic, signs } = ctx
  const rule = FINDING_RULES.find(r => r.keys.some(k => name.includes(k)))
  if (!rule) return systemic || ''
  switch (rule.region) {
    case 'vital': return vital
    case 'general': return general
    case 'skin': return signs.skin || general || systemic
    case 'abdomen_visual': return systemic || signs.abdomen || ''
    case 'abdomen': return signs.abdomen || systemic || ''
    case 'lungs': return signs.lungs || systemic || ''
    case 'heart': return signs.heart || systemic || ''
    case 'edema': {
      if ((general + systemic).includes('水肿')) return '皮肤黏膜颜色正常，无皮疹、出血、水肿（双下肢无水肿）'
      return '双下肢无水肿'
    }
    default: return systemic || ''
  }
}

export function buildExamTemplatesFromCase(data) {
  const templates = []
  const basic = data.basic || {}
  const reception = data.reception || {}
  const meta = data.meta || {}

  // ① 结构化查体模板（历史数据源）
  if (basic.physical_examination) {
    for (const [cat, items] of Object.entries(basic.physical_examination)) {
      if (items && items.length) {
        templates.push({ category: cat, items: items.map(i => typeof i === 'string' ? { name: i, result: '' } : i) })
      }
    }
  }
  if (reception.sp_materials?.physical_exam_items?.length) {
    templates.push({ category: '检查项目', items: reception.sp_materials.physical_exam_items.map(i => typeof i === 'string' ? { name: i, result: '' } : i) })
  }
  if (meta.physical_exam_templates) {
    for (const [cat, items] of Object.entries(meta.physical_exam_templates)) {
      if (items && items.length) {
        templates.push({ category: cat, items: items.map(i => typeof i === 'string' ? { name: i, result: '' } : i) })
      }
    }
  }

  // ② 病例自由文本查体数据（basic.physical_exam）→ 粗分类兜底模板
  const pe = basic.physical_exam || {}
  const vital = typeof pe.vital_signs === 'string' ? pe.vital_signs.trim() : ''
  const general = typeof pe.general === 'string' ? pe.general.trim() : ''
  const systemic = typeof pe.systemic === 'string' ? pe.systemic.trim() : ''
  if (vital) templates.push({ category: '生命体征', items: [{ name: '生命体征', result: vital }] })
  if (general) templates.push({ category: '一般情况', items: [{ name: '一般情况', result: general }] })
  if (systemic) templates.push({ category: '系统查体', items: [{ name: '系统查体', result: systemic }] })
  // 其他自由文本键（如 chest_lung / abdomen 等）也作为粗分类兜底
  for (const [key, value] of Object.entries(pe)) {
    if (['vital_signs', 'general', 'systemic'].includes(key)) continue
    if (typeof value === 'string' && value.trim()) {
      templates.push({ category: key, items: [{ name: PE_CAT_LABELS[key] || key, result: value.trim() }] })
    }
  }

  // ③ 判分查体项目 → 粒度模板，逐项附对应结果（覆盖腹部叩诊/双肺呼吸音/下肢水肿等）
  const em = reception.examiner_materials || {}
  const signs = em.positive_signs || {}
  const ctx = { vital, general, systemic, signs }
  for (const si of Array.isArray(em.physical_score_items) ? em.physical_score_items : []) {
    const name = typeof si === 'string' ? si : (si.item || '')
    if (!name || isProcessItem(name)) continue
    templates.push({ category: '查体项目', items: [{ name, result: deriveFinding(name, ctx) }] })
  }

  // ④ 全部为空 → 通用项目提示（结果留空，由 LLM 如实反馈"无记录"）
  if (templates.length === 0) {
    return [
      { category: '一般检查', items: [{ name: '生命体征', result: '' }] },
      { category: '头颈部', items: [{ name: '头颈部视诊', result: '' }] },
      { category: '胸部', items: [{ name: '胸部视诊', result: '' }] },
      { category: '腹部', items: [{ name: '腹部视诊', result: '' }] },
      { category: '神经系统', items: [{ name: '神经系统检查', result: '' }] },
    ]
  }
  return templates
}
