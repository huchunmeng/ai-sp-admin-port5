/**
 * 患者角色素材映射规则
 *
 * 数据来源：
 * - 《【AI-SP】角色素材使用说明.xlsx》（官方年龄-角色对照表）
 * -  02_病人图片/角色正式素材-0814/ （实际素材文件）
 *
 * 素材目录结构（源文件）：
 *   角色正式素材-0814/{编号}，{年龄段}/
 *     ├── {编号}-半身像.jpg   → 部署为 full-{gender}-{age}.jpg
 *     ├── {编号}-头像.jpg     → 部署为 patient-{gender}-{age}.jpg
 *     ├── {编号}-待机.mp4     → 部署为 {gender}-{age}-idle.mp4
 *     └── {编号}-说话.mp4     → 部署为 {gender}-{age}-speaking.mp4
 *
 * 部署目录：
 *   apps/training/public/images/patients/  (82 文件)
 *   apps/exam/public/images/patients/      (82 文件)
 *   apps/admin/public/images/patients/     (82 文件)
 *   apps/app-training/public/images/patients/ (82 文件)
 *
 * 注意：各端素材已同步，统一 41 人群 × 2 尺寸 = 82 文件。
 */

/**
 * 年龄范围 → 角色模型映射
 * Excel 定义：每个角色模型有明确的年龄上下界（起始月龄/年龄 → 结束月龄/年龄）
 *
 * 代表年龄：部署文件名中使用的单一年龄值，取年龄范围中位值
 * 回答模式："家长代答" 表示婴幼儿由家长代为应答，"本人回答" 表示患者本人应答
 */
const RANGES = {
  male: [
    { id: '男01', ageMin: 0,     ageMax: 0.17,  ageLabel: '0-1个月',   deployAge: 0,   respond: '家长代答' },
    { id: '男02', ageMin: 0.17,  ageMax: 0.42,  ageLabel: '2-4个月',   deployAge: 0.3, respond: '家长代答' },
    { id: '男03', ageMin: 0.42,  ageMax: 0.83,  ageLabel: '5-9个月',   deployAge: 0.6, respond: '家长代答' },
    { id: '男04', ageMin: 0.83,  ageMax: 2,     ageLabel: '10-23个月', deployAge: 1,   respond: '家长代答' },
    { id: '男05', ageMin: 2,     ageMax: 6,     ageLabel: '2-5岁',     deployAge: 4,   respond: '家长代答' },
    { id: '男06', ageMin: 6,     ageMax: 11,    ageLabel: '6-10岁',    deployAge: 8,   respond: '家长代答' },
    { id: '男07', ageMin: 11,    ageMax: 15,    ageLabel: '11-14岁',   deployAge: 13,  respond: '本人回答' },
    { id: '男08', ageMin: 15,    ageMax: 19,    ageLabel: '15-18岁',   deployAge: 17,  respond: '本人回答' },
    { id: '男09', ageMin: 19,    ageMax: 29,    ageLabel: '19-28岁',   deployAge: 24,  respond: '本人回答' },
    { id: '男10', ageMin: 29,    ageMax: 40,    ageLabel: '29-39岁',   deployAge: 34,  respond: '本人回答' },
    { id: '男11', ageMin: 40,    ageMax: 50,    ageLabel: '40-49岁',   deployAge: 45,  respond: '本人回答' },
    { id: '男12', ageMin: 50,    ageMax: 60,    ageLabel: '50-59岁',   deployAge: 55,  respond: '本人回答' },
    { id: '男13', ageMin: 60,    ageMax: 70,    ageLabel: '60-69岁',   deployAge: 65,  respond: '本人回答' },
    { id: '男14', ageMin: 70,    ageMax: 86,    ageLabel: '70-85岁',   deployAge: 78,  respond: '本人回答' },
    { id: '男15', ageMin: 86,    ageMax: 100,   ageLabel: '86-99岁',   deployAge: 93,  respond: '本人回答' },
    { id: '男16', ageMin: 100,   ageMax: 999,   ageLabel: '100岁以上', deployAge: 100, respond: '本人回答' },
  ],

  female: [
    { id: '女01', ageMin: 0,     ageMax: 0.17,  ageLabel: '0-1个月',   deployAge: 0,   respond: '家长代答' },
    { id: '女02', ageMin: 0.17,  ageMax: 0.42,  ageLabel: '2-4个月',   deployAge: 0.3, respond: '家长代答' },
    { id: '女03', ageMin: 0.42,  ageMax: 0.83,  ageLabel: '5-9个月',   deployAge: 0.6, respond: '家长代答' },
    { id: '女04', ageMin: 0.83,  ageMax: 2,     ageLabel: '10-23个月', deployAge: 1,   respond: '家长代答' },
    { id: '女05', ageMin: 2,     ageMax: 6,     ageLabel: '2-5岁',     deployAge: 4,   respond: '家长代答' },
    { id: '女06', ageMin: 6,     ageMax: 11,    ageLabel: '6-10岁',    deployAge: 8,   respond: '家长代答' },
    { id: '女07', ageMin: 11,    ageMax: 15,    ageLabel: '11-14岁',   deployAge: 13,  respond: '本人回答' },
    { id: '女08', ageMin: 15,    ageMax: 19,    ageLabel: '15-18岁',   deployAge: 17,  respond: '本人回答' },
    { id: '女09', ageMin: 19,    ageMax: 29,    ageLabel: '19-28岁',   deployAge: 24,  respond: '本人回答' },
    { id: '女10', ageMin: 29,    ageMax: 40,    ageLabel: '29-39岁',   deployAge: 34,  respond: '本人回答' },
    { id: '女11', ageMin: 40,    ageMax: 50,    ageLabel: '40-49岁',   deployAge: 45,  respond: '本人回答' },
    { id: '女12', ageMin: 50,    ageMax: 60,    ageLabel: '50-59岁',   deployAge: 55,  respond: '本人回答' },
    { id: '女13', ageMin: 60,    ageMax: 70,    ageLabel: '60-69岁',   deployAge: 65,  respond: '本人回答' },
    { id: '女14', ageMin: 70,    ageMax: 86,    ageLabel: '70-85岁',   deployAge: 78,  respond: '本人回答' },
    { id: '女15', ageMin: 86,    ageMax: 100,   ageLabel: '86-99岁',   deployAge: 93,  respond: '本人回答' },
    { id: '女16', ageMin: 100,   ageMax: 999,   ageLabel: '100岁以上', deployAge: 100, respond: '本人回答' },
  ],

  // 孕妇：按年龄组 × 孕期 分类。年龄范围对齐 Excel《角色素材使用说明》
  pregnant: {
    '20-29岁': [
      { id: '孕妇01', trimester: '孕早期', ageMin: 20, ageMax: 30, deployAge: 23 },
      { id: '孕妇02', trimester: '孕中期', ageMin: 20, ageMax: 30, deployAge: 25 },
      { id: '孕妇03', trimester: '孕晚期', ageMin: 20, ageMax: 30, deployAge: 27 },
    ],
    '30-39岁': [
      { id: '孕妇04', trimester: '孕早期', ageMin: 30, ageMax: 40, deployAge: 33 },
      { id: '孕妇05', trimester: '孕中期', ageMin: 30, ageMax: 40, deployAge: 35 },
      { id: '孕妇06', trimester: '孕晚期', ageMin: 30, ageMax: 40, deployAge: 37 },
    ],
    '40-49岁': [
      { id: '孕妇07', trimester: '孕早期', ageMin: 40, ageMax: 50, deployAge: 43 },
      { id: '孕妇08', trimester: '孕中期', ageMin: 40, ageMax: 50, deployAge: 45 },
      { id: '孕妇09', trimester: '孕晚期', ageMin: 40, ageMax: 50, deployAge: 47 },
    ],
  },
}

const IMAGE_BASE = '/images/patients/'
const VIDEO_BASE = '/videos/'

/**
 * 所有 deployAge 列表（与 RANGES 完全对齐）
 * 素材同步后，每个 deployAge 都有对应的文件，findClosest 将精确命中
 */
const AVAILABLE_AGES = {
  male:   [0, 0.3, 0.6, 1, 4, 8, 13, 17, 24, 34, 45, 55, 65, 78, 93, 100],
  female: [0, 0.3, 0.6, 1, 4, 8, 13, 17, 24, 34, 45, 55, 65, 78, 93, 100],
  pregnant: [23, 25, 27, 33, 35, 37, 43, 45, 47],
}

function findClosest(target, candidates) {
  if (!candidates || candidates.length === 0) return target
  let best = candidates[0]
  let bestDist = Math.abs(target - best)
  for (const c of candidates) {
    const dist = Math.abs(target - c)
    if (dist < bestDist) { bestDist = dist; best = c }
  }
  return best
}

/**
 * 将患者年龄字符串解析为岁数（浮点数）
 * "7岁" → 7, "3个月" → 0.25, "18天" → 0.05
 * "1岁半" → 1.5, "2周" → 0.038, "2岁3个月" → 2.25
 */
export function parsePatientAge(ageStr) {
  if (ageStr === undefined || ageStr === null || ageStr === '') return NaN
  const s = String(ageStr).trim()

  // 纯数字（无单位）默认按"岁"
  if (/^\d+(\.\d+)?$/.test(s)) {
    const n = parseFloat(s)
    return n > 0 ? n : NaN
  }

  // "新生儿" / "婴儿" 等
  if (/新生儿|婴儿|刚出生/.test(s)) return 0

  let totalYears = 0

  // 提取 "X岁"
  const yearMatch = s.match(/(\d+)\s*岁/)
  if (yearMatch) {
    totalYears += parseInt(yearMatch[1], 10)
  }

  // 提取 "半"（跟在岁后面：1岁半、2岁半）
  if (/半/.test(s)) totalYears += 0.5

  // 提取 "X个月" / "X月" / "X个多月"
  const monthMatch = s.match(/(\d+)\s*个?\s*多?\s*个?\s*月/)
  if (monthMatch) {
    totalYears += parseInt(monthMatch[1], 10) / 12
  }

  // 提取 "X周"
  const weekMatch = s.match(/(\d+)\s*周/)
  if (weekMatch) {
    totalYears += parseInt(weekMatch[1], 10) / 52
  }

  // 提取 "X天"（无岁/月时才用天）
  const dayMatch = s.match(/(\d+)\s*天/)
  if (dayMatch && totalYears === 0) {
    totalYears += parseInt(dayMatch[1], 10) / 365
  }

  // 无单位但纯数字：不处理（已在上方处理）
  if (totalYears === 0) {
    const digits = parseInt(s.replace(/[^0-9]/g, ''), 10)
    if (!isNaN(digits) && digits > 0) return digits
    return NaN
  }

  return totalYears
}

/**
 * 在年龄范围数组中二分查找匹配的角色模型
 * @param {number} ageYears - 患者年龄（岁）
 * @param {Array} ranges - RANGES.male 或 RANGES.female
 * @returns {Object} 匹配的角色条目
 */
function findRangeEntry(ageYears, ranges) {
  for (const entry of ranges) {
    if (ageYears >= entry.ageMin && ageYears < entry.ageMax) return entry
  }
  // fallback: 超出范围时返回最后一个
  return ranges[ranges.length - 1]
}

/**
 * 在孕妇角色列表中查找匹配条目
 * @param {number} ageYears - 患者年龄
 * @param {string} trimester - 孕期阶段（孕早期/孕中期/孕晚期）
 * @returns {Object|null}
 */
function findPregnantEntry(ageYears, trimester) {
  const groups = RANGES.pregnant
  for (const [, entries] of Object.entries(groups)) {
    for (const entry of entries) {
      if (entry.trimester === trimester && ageYears >= entry.ageMin && ageYears < entry.ageMax) {
        return entry
      }
    }
  }
  // fallback: 返回第一个匹配孕期的
  for (const [, entries] of Object.entries(groups)) {
    for (const entry of entries) {
      if (entry.trimester === trimester) return entry
    }
  }
  return null
}

/**
 * 判断患者是否为孕期状态
 */
const PREGNANT_VALUES = new Set(['孕早期', '孕中期', '孕晚期'])

export function isPatientPregnant(patient) {
  if (!patient) return false
  const val = patient.isPregnant || patient.pregnancy
  if (val === true || val === 'true') return true
  return PREGNANT_VALUES.has(val)
}

/**
 * 获取孕期阶段：孕早期 / 孕中期 / 孕晚期
 * 若未指定则默认"孕中期"
 */
export function getTrimester(patient) {
  const val = patient?.pregnancyStage || patient?.trimester || '孕中期'
  const map = { '1': '孕早期', '2': '孕中期', '3': '孕晚期' }
  return map[val] || val
}

/**
 * 规范化性别
 * 遵从中国医疗标准：0=女，1=男
 */
export function normalizeGender(patient) {
  const raw = String(patient?.gender || patient?.sex || '')
  if (raw === '男' || raw === 'male' || raw === '1') return 'male'
  if (raw === '女' || raw === 'female' || raw === '0') return 'female'
  return null
}

/**
 * 【核心】匹配患者对应的角色模型条目
 * @param {{ sex?: string, gender?: string, age?: number|string, isPregnant?: boolean, trimester?: string }} patient
 * @returns {{ id: string, gender: string, deployAge: number, ageLabel: string, respond: string, isPregnant: boolean, trimester?: string }}
 */
export function matchPatientModel(patient) {
  const gender = normalizeGender(patient)
  if (!gender) return null

  const ageYears = parsePatientAge(patient.age)
  const preg = isPatientPregnant(patient)

  // 孕期女性使用独立素材池
  if (gender === 'female' && preg) {
    const trimester = getTrimester(patient)
    const entry = findPregnantEntry(isNaN(ageYears) ? 30 : ageYears, trimester)
    if (entry) {
      return {
        id: entry.id,
        gender: 'female',
        deployAge: entry.deployAge,
        ageLabel: `${entry.ageMin}-${entry.ageMax}岁`,
        respond: '本人回答',
        isPregnant: true,
        trimester: entry.trimester,
      }
    }
  }

  const ranges = RANGES[gender]
  if (!ranges) return null

  const a = isNaN(ageYears) ? 35 : ageYears
  const entry = findRangeEntry(a, ranges)

  return {
    id: entry.id,
    gender,
    deployAge: entry.deployAge,
    ageLabel: entry.ageLabel,
    respond: entry.respond,
    isPregnant: false,
    trimester: undefined,
  }
}

/**
 * 获取部署用图片路径（优先规范年龄，回退到最近可用文件）
 * @param {Object} model - matchPatientModel() 的返回值
 * @param {'full'|'patient'} type - full=半身像, patient=头像
 * @returns {string}
 */
export function getPatientImagePath(model, type = 'full') {
  if (!model) return null
  const prefix = type === 'full' ? 'full' : 'patient'
  const idealAge = model.deployAge

  if (model.isPregnant) {
    const closest = findClosest(idealAge, AVAILABLE_AGES.pregnant)
    return `${IMAGE_BASE}${prefix}-female-pregnant-${closest}.jpg`
  }

  const available = AVAILABLE_AGES[model.gender] || []
  const closest = findClosest(idealAge, available)
  return `${IMAGE_BASE}${prefix}-${model.gender}-${closest}.jpg`
}

/**
 * 获取部署用视频路径
 * @param {'idle'|'speaking'} videoType
 */
export function getPatientVideoPath(model, videoType = 'idle') {
  if (!model) return null
  const idealAge = model.deployAge

  if (model.isPregnant) {
    const closest = findClosest(idealAge, AVAILABLE_AGES.pregnant)
    return `${VIDEO_BASE}female-pregnant-${closest}-${videoType}.mp4`
  }

  const available = AVAILABLE_AGES[model.gender] || []
  const closest = findClosest(idealAge, available)
  return `${VIDEO_BASE}${model.gender}-${closest}-${videoType}.mp4`
}

/**
 * 旧 API 兼容：直接返回图片路径字符串
 */
export function matchPatientImage(patient, type = 'full') {
  const model = matchPatientModel(patient)
  return getPatientImagePath(model, type)
}

/**
 * 旧 API 兼容：直接返回视频路径字符串
 */
export function matchPatientVideo(patient, videoType = 'idle') {
  const model = matchPatientModel(patient)
  return getPatientVideoPath(model, videoType)
}

/**
 * 一次性计算患者所有素材路径
 */
export function resolvePatientAssets(patient) {
  const model = matchPatientModel(patient)
  return {
    model,
    fullBodyImage: getPatientImagePath(model, 'full'),
    avatar: getPatientImagePath(model, 'patient'),
    idleVideo: getPatientVideoPath(model, 'idle'),
    speakingVideo: getPatientVideoPath(model, 'speaking'),
  }
}

// ============================================================
// 以下为素材管理常量（供素材复制/同步脚本使用）
// ============================================================

/**
 * 所有部署文件所需的 deployAge 列表
 * 用于素材同步脚本：根据此列表从源目录复制/重命名文件到各端 public 目录
 */
export const DEPLOY_AGES = {
  male:   RANGES.male.map(e => e.deployAge),
  female: RANGES.female.map(e => e.deployAge),
  pregnant: Object.values(RANGES.pregnant).flat().map(e => e.deployAge),
}

/**
 * 源文件 → 部署文件 映射表
 * key: 源文件名（角色正式素材-0814 中的文件）
 * value: 部署文件名
 *
 * 使用方式：
 *   素材同步脚本读取此表，将角色正式素材-0814 下的文件复制到各端 public/ 并重命名
 */
// 源文件命名例外（角色正式素材-0814中部分文件命名不规范）
const SOURCE_NAME_FIXES = {
  '女06': { halfBody: '女06-半身.jpg' },
  '女14': { halfBody: '女14-半身.jpg' },
  '女10': { avatar: '女10头像.jpg' },
  '孕妇02': { halfBody: '20岁-孕中期-半身像.jpg', avatar: '20岁-孕中期-头像.jpg' },
  '男02': { speaking: '男02-说话2.mp4' },
}

export function generateAssetCopyMap() {
  const map = []

  for (const gender of ['male', 'female']) {
    for (const entry of RANGES[gender]) {
      const dAge = entry.deployAge
      const fixes = SOURCE_NAME_FIXES[entry.id] || {}
      map.push({
        source: fixes.halfBody || `${entry.id}-半身像.jpg`,
        dest: `full-${gender}-${dAge}.jpg`,
        folder: 'images/patients',
      })
      map.push({
        source: fixes.avatar || `${entry.id}-头像.jpg`,
        dest: `patient-${gender}-${dAge}.jpg`,
        folder: 'images/patients',
      })
      map.push({
        source: `${entry.id}-待机.mp4`,
        dest: `${gender}-${dAge}-idle.mp4`,
        folder: 'videos',
      })
      map.push({
        source: fixes.speaking || `${entry.id}-说话.mp4`,
        dest: `${gender}-${dAge}-speaking.mp4`,
        folder: 'videos',
      })
    }
  }

  // 孕妇素材（特别注意：孕妇文件夹名包含年龄+孕期，如 "孕妇01,16-30岁，孕早期"）
  for (const [, entries] of Object.entries(RANGES.pregnant)) {
    for (const entry of entries) {
      const dAge = entry.deployAge
      const fixes = SOURCE_NAME_FIXES[entry.id] || {}
      const folderHint = `${entry.id},${entry.ageMin}-${entry.ageMax}岁，${entry.trimester}`
      map.push({
        source: fixes.halfBody || `${entry.id}-半身像.jpg`,
        dest: `full-female-pregnant-${dAge}.jpg`,
        folder: 'images/patients',
        sourceFolder: folderHint,
      })
      map.push({
        source: fixes.avatar || `${entry.id}-头像.jpg`,
        dest: `patient-female-pregnant-${dAge}.jpg`,
        folder: 'images/patients',
        sourceFolder: folderHint,
      })
      map.push({
        source: `${entry.id}-待机.mp4`,
        dest: `female-pregnant-${dAge}-idle.mp4`,
        folder: 'videos',
        sourceFolder: folderHint,
      })
      map.push({
        source: fixes.speaking || `${entry.id}-说话.mp4`,
        dest: `female-pregnant-${dAge}-speaking.mp4`,
        folder: 'videos',
        sourceFolder: folderHint,
      })
    }
  }

  return map
}
