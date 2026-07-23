// 统一专业注册表 — 全平台唯一权威源
// 所有专业匹配、中文名/英文名/缩写互转均以此表为基准
//
// 使用方式:
//   import { resolveSpecialty, getSpecialty, SPECIALTIES, SPECIALTY_BY_ID } from './specialty-registry.js'
//   const sp = resolveSpecialty('儿科')  // → { id, cnName, abbr, ... }
//   const sp = resolveSpecialty('pediatrics')  // → 同上
//   const sp = resolveSpecialty('PD')  // → 同上

// ===== 专业定义 =====
// id:       稳定英文标识符（跨系统通用）
// cnName:   规范中文名（UI 展示用）
// abbr:     缩写（用于病例编号前缀等）
// aliases:  别名列表（含英文变体 + 中文简称）
// groupKey: 考站方案分组键 — 指向 station-schemes 中的 key
//           (多个专业可共享同一套考站，如普通外科→外科)

const SPECIALTIES = [
  // ── 内科系 ──
  { id: 'internal_medicine',   cnName: '内科',       abbr: 'IM',  aliases: ['internal', 'cardio', 'cardiovascular'] },
  { id: 'pediatrics',          cnName: '儿科',       abbr: 'PD',  aliases: [] },
  { id: 'emergency',           cnName: '急诊科',     abbr: 'EM',  aliases: ['emergency_medicine'] },
  { id: 'psychiatry',          cnName: '精神科',     abbr: 'PS',  aliases: [] },
  { id: 'general_practice',    cnName: '全科',       abbr: 'GP',  aliases: ['general'] },
  { id: 'dermatology',         cnName: '皮肤科',     abbr: 'DERM',aliases: [] },
  { id: 'neurology',           cnName: '神经内科',   abbr: 'NE',  aliases: [] },
  { id: 'rehabilitation',      cnName: '康复医学科', abbr: 'REH', aliases: [] },
  { id: 'critical_care',       cnName: '重症医学科', abbr: 'ICU', aliases: ['icu', 'intensive_care'] },

  // ── 外科系（普通外科/胸心外科/泌尿外科/整形外科→均共享 groupKey:'外科'）──
  { id: 'surgery',             cnName: '外科',       abbr: 'SU',  aliases: ['general_surgery'], groupKey: '外科' },
  { id: 'general_surgery',     cnName: '普通外科',   abbr: 'SU',  aliases: [], groupKey: '外科' },
  { id: 'cardiothoracic_surgery', cnName: '胸心外科',abbr: 'CTS', aliases: [], groupKey: '外科' },
  { id: 'urology',             cnName: '泌尿外科',   abbr: 'URO', aliases: [], groupKey: '外科' },
  { id: 'plastic_surgery',     cnName: '整形外科',   abbr: 'PSUR',aliases: [], groupKey: '外科' },
  { id: 'orthopedics',         cnName: '骨科',       abbr: 'ORTH',aliases: [] },
  { id: 'pediatric_surgery',   cnName: '儿外科',     abbr: 'PDS', aliases: [] },
  { id: 'neurosurgery',        cnName: '神经外科',   abbr: 'NS',  aliases: [] },

  // ── 妇产/麻醉 ──
  { id: 'obstetrics_gynecology',cnName: '妇产科',    abbr: 'OB',  aliases: ['obgyn', 'obstetrics', 'gynecology'] },
  { id: 'anesthesiology',      cnName: '麻醉科',     abbr: 'ANES',aliases: [] },

  // ── 五官科 ──
  { id: 'ophthalmology',       cnName: '眼科',       abbr: 'OPH', aliases: [] },
  { id: 'otorhinolaryngology', cnName: '耳鼻咽喉科', abbr: 'ENT', aliases: ['ent', 'otolaryngology', '耳鼻喉科'] },

  // ── 口腔科 ──
  { id: 'stomatology',         cnName: '口腔全科',   abbr: 'STO', aliases: ['口腔科'] },
  { id: 'oral_medicine',       cnName: '口腔内科',   abbr: 'STO', aliases: [], groupKey: '口腔全科' },
  { id: 'oral_maxillofacial',  cnName: '口腔颌面外科',abbr:'STO',aliases: [], groupKey: '口腔全科' },
  { id: 'prosthodontics',      cnName: '口腔修复科', abbr: 'PROS',aliases: [], groupKey: '口腔全科' },
  { id: 'orthodontics',        cnName: '口腔正畸科', abbr: 'STO', aliases: [], groupKey: '口腔全科' },
  { id: 'oral_pathology',      cnName: '口腔病理科', abbr: 'STO', aliases: [], groupKey: '口腔全科' },
  { id: 'oral_radiology',      cnName: '口腔颌面影像科',abbr:'STO',aliases:[], groupKey: '口腔全科' },

  // ── 诊断/技术科室 ──
  { id: 'radiology',           cnName: '放射科',     abbr: 'RAD', aliases: [] },
  { id: 'ultrasound',          cnName: '超声科',     abbr: 'US',  aliases: ['超声医学科'] },
  { id: 'nuclear_medicine',    cnName: '核医学科',   abbr: 'NM',  aliases: [] },
  { id: 'pathology',           cnName: '临床病理科', abbr: 'PATH',aliases: ['clinical_pathology', 'pathology'] },
  { id: 'laboratory_medicine', cnName: '检验医学科', abbr: 'LAB', aliases: [] },

  // ── 其他 ──
  { id: 'radiation_oncology',  cnName: '放射肿瘤科', abbr: 'RO',  aliases: ['oncology', '肿瘤科'] },
  { id: 'medical_genetics',    cnName: '医学遗传科', abbr: 'MG',  aliases: [] },
  { id: 'preventive_medicine', cnName: '预防医学科', abbr: 'PM',  aliases: [] },
]

// ===== 索引表（构建时一次性生成）=====

/** 以 id 为键的快速查找表 */
const SPECIALTY_BY_ID = {}
/** 以 cnName 为键的快速查找表 */
const SPECIALTY_BY_CN = {}
/** 以别名（英文/中文简称/缩写）为键的查找表 */
const SPECIALTY_BY_ALIAS = {}

for (const sp of SPECIALTIES) {
  SPECIALTY_BY_ID[sp.id] = sp
  SPECIALTY_BY_CN[sp.cnName] = sp
  SPECIALTY_BY_ALIAS[sp.abbr] = sp
  for (const alias of sp.aliases) {
    SPECIALTY_BY_ALIAS[alias] = sp
    SPECIALTY_BY_ALIAS[alias.toLowerCase()] = sp
  }
}

// ===== 查询函数 =====

/**
 * 通过任意标识符解析专业
 * @param {string|null|undefined} raw - 中文名/英文ID/英文别名/缩写
 * @returns {{ id, cnName, abbr, aliases, groupKey } | null}
 */
function getSpecialty(raw) {
  if (!raw) return null
  // 1. 直接命中 ID
  if (SPECIALTY_BY_ID[raw]) return SPECIALTY_BY_ID[raw]
  // 2. 直接命中中文名
  if (SPECIALTY_BY_CN[raw]) return SPECIALTY_BY_CN[raw]
  // 3. 别名/缩写精确匹配
  if (SPECIALTY_BY_ALIAS[raw]) return SPECIALTY_BY_ALIAS[raw]
  // 4. 大小写不敏感匹配
  const lower = raw.toLowerCase()
  if (SPECIALTY_BY_ID[lower]) return SPECIALTY_BY_ID[lower]
  if (SPECIALTY_BY_ALIAS[lower]) return SPECIALTY_BY_ALIAS[lower]
  // 5. 子串模糊匹配（别名包含 raw 或 raw 包含别名）
  for (const sp of SPECIALTIES) {
    for (const alias of sp.aliases) {
      if (alias.toLowerCase().includes(lower) || lower.includes(alias.toLowerCase())) {
        return sp
      }
    }
    // 也检查 ID 子串
    if (sp.id.includes(lower) || lower.includes(sp.id)) {
      return sp
    }
  }
  return null
}

/**
 * 解析专业并返回考站方案对应的 key（考虑 groupKey）
 * @param {string|null|undefined} raw
 * @returns {string} 中文名（用于 station-schemes 键查找）
 */
function resolveStationKey(raw) {
  const sp = getSpecialty(raw)
  if (!sp) return '内科'
  return sp.groupKey || sp.cnName
}

/**
 * 获取中文名（用于 UI 展示）
 * @param {string|null|undefined} raw
 * @returns {string}
 */
function resolveSpecialty(raw) {
  const sp = getSpecialty(raw)
  return sp ? sp.cnName : '内科'
}

/** 获取所有中文名列表（用于下拉选择等） */
const ALL_CN_NAMES = SPECIALTIES.map(s => s.cnName)

export {
  SPECIALTIES,
  SPECIALTY_BY_ID,
  getSpecialty,
  resolveSpecialty,
  resolveStationKey,
  ALL_CN_NAMES,
}
