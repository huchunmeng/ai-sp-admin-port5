// 审计病人形象素材：逐病例检查年龄/性别 → 映射 → 素材文件是否存在
import { readdirSync, readFileSync } from 'fs'
import { join, basename } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

// ── patientAssetMapping 逻辑副本（ESM 兼容）──
const RANGES = {
  male: [
    { id:'男01', ageMin:0, ageMax:0.17, deployAge:0 },
    { id:'男02', ageMin:0.17, ageMax:0.42, deployAge:0.3 },
    { id:'男03', ageMin:0.42, ageMax:0.83, deployAge:0.6 },
    { id:'男04', ageMin:0.83, ageMax:2, deployAge:1 },
    { id:'男05', ageMin:2, ageMax:6, deployAge:4 },
    { id:'男06', ageMin:6, ageMax:11, deployAge:8 },
    { id:'男07', ageMin:11, ageMax:15, deployAge:13 },
    { id:'男08', ageMin:15, ageMax:19, deployAge:17 },
    { id:'男09', ageMin:19, ageMax:29, deployAge:24 },
    { id:'男10', ageMin:29, ageMax:40, deployAge:34 },
    { id:'男11', ageMin:40, ageMax:50, deployAge:45 },
    { id:'男12', ageMin:50, ageMax:60, deployAge:55 },
    { id:'男13', ageMin:60, ageMax:70, deployAge:65 },
    { id:'男14', ageMin:70, ageMax:86, deployAge:78 },
    { id:'男15', ageMin:86, ageMax:100, deployAge:93 },
    { id:'男16', ageMin:100, ageMax:999, deployAge:100 },
  ],
  female: [
    { id:'女01', ageMin:0, ageMax:0.17, deployAge:0 },
    { id:'女02', ageMin:0.17, ageMax:0.42, deployAge:0.3 },
    { id:'女03', ageMin:0.42, ageMax:0.83, deployAge:0.6 },
    { id:'女04', ageMin:0.83, ageMax:2, deployAge:1 },
    { id:'女05', ageMin:2, ageMax:6, deployAge:4 },
    { id:'女06', ageMin:6, ageMax:11, deployAge:8 },
    { id:'女07', ageMin:11, ageMax:15, deployAge:13 },
    { id:'女08', ageMin:15, ageMax:19, deployAge:17 },
    { id:'女09', ageMin:19, ageMax:29, deployAge:24 },
    { id:'女10', ageMin:29, ageMax:40, deployAge:34 },
    { id:'女11', ageMin:40, ageMax:50, deployAge:45 },
    { id:'女12', ageMin:50, ageMax:60, deployAge:55 },
    { id:'女13', ageMin:60, ageMax:70, deployAge:65 },
    { id:'女14', ageMin:70, ageMax:86, deployAge:78 },
    { id:'女15', ageMin:86, ageMax:100, deployAge:93 },
    { id:'女16', ageMin:100, ageMax:999, deployAge:100 },
  ],
  pregnant: {
    '20-29岁': [
      { id:'孕妇01', trimester:'孕早期', ageMin:20, ageMax:30, deployAge:23 },
      { id:'孕妇02', trimester:'孕中期', ageMin:20, ageMax:30, deployAge:25 },
      { id:'孕妇03', trimester:'孕晚期', ageMin:20, ageMax:30, deployAge:27 },
    ],
    '30-39岁': [
      { id:'孕妇04', trimester:'孕早期', ageMin:30, ageMax:40, deployAge:33 },
      { id:'孕妇05', trimester:'孕中期', ageMin:30, ageMax:40, deployAge:35 },
      { id:'孕妇06', trimester:'孕晚期', ageMin:30, ageMax:40, deployAge:37 },
    ],
    '40-49岁': [
      { id:'孕妇07', trimester:'孕早期', ageMin:40, ageMax:50, deployAge:43 },
      { id:'孕妇08', trimester:'孕中期', ageMin:40, ageMax:50, deployAge:45 },
      { id:'孕妇09', trimester:'孕晚期', ageMin:40, ageMax:50, deployAge:47 },
    ],
  },
}

const AVAILABLE_AGES = {
  male: [0,0.3,0.6,1,4,8,13,17,24,34,45,55,65,78,93,100],
  female: [0,0.3,0.6,1,4,8,13,17,24,34,45,55,65,78,93,100],
  pregnant: [23,25,27,33,35,37,43,45,47],
}

function parsePatientAge(ageStr) {
  if (ageStr === undefined || ageStr === null || ageStr === '') return NaN
  const s = String(ageStr).trim()
  if (/^\d+(\.\d+)?$/.test(s)) { const n = parseFloat(s); return n > 0 ? n : NaN }
  if (/新生儿|婴儿|刚出生/.test(s)) return 0
  let totalYears = 0
  const yearMatch = s.match(/(\d+)\s*岁/)
  if (yearMatch) totalYears += parseInt(yearMatch[1], 10)
  if (/半/.test(s)) totalYears += 0.5
  const monthMatch = s.match(/(\d+)\s*个?\s*多?\s*个?\s*月/)
  if (monthMatch) totalYears += parseInt(monthMatch[1], 10) / 12
  const weekMatch = s.match(/(\d+)\s*周/)
  if (weekMatch) totalYears += parseInt(weekMatch[1], 10) / 52
  const dayMatch = s.match(/(\d+)\s*天/)
  if (dayMatch && totalYears === 0) totalYears += parseInt(dayMatch[1], 10) / 365
  if (totalYears === 0) return NaN
  return totalYears
}

function findClosest(target, candidates) {
  if (!candidates || candidates.length === 0) return target
  let best = candidates[0], bestDist = Math.abs(target - best)
  for (const c of candidates) { const dist = Math.abs(target - c); if (dist < bestDist) { bestDist = dist; best = c; } }
  return best
}

function getGender(pi) {
  const raw = String(pi.sex || '')
  if (raw === '男' || raw === 'male' || raw === '1') return 'male'
  if (raw === '女' || raw === 'female' || raw === '0') return 'female'
  return null
}

function matchModel(pi) {
  const gender = getGender(pi)
  if (!gender) return { error: 'UNKNOWN_GENDER', raw: pi.sex }

  const ageYears = parsePatientAge(pi.age)
  const pregStr = String(pi.pregnancy || '')
  const isPreg = gender === 'female' && /孕/.test(pregStr) && !/未/.test(pregStr)

  if (isPreg) {
    const trimester = pi.trimester || (pregStr.includes('早') ? '孕早期' : pregStr.includes('晚') ? '孕晚期' : '孕中期')
    for (const [, entries] of Object.entries(RANGES.pregnant)) {
      for (const entry of entries) {
        if (entry.trimester === trimester && ageYears >= entry.ageMin && ageYears < entry.ageMax) {
          return { modelId: entry.id, gender:'female', deployAge: entry.deployAge, isPregnant: true, trimester: entry.trimester, ageYears }
        }
      }
    }
    // fallback: 年龄不匹配但孕期
    return { modelId:'孕妇05', gender:'female', deployAge:35, isPregnant:true, trimester:'孕中期', ageYears, fallbackModel: true }
  }

  const ranges = RANGES[gender]
  if (!ranges) return { error: 'NO_RANGES', gender }

  const a = isNaN(ageYears) ? 35 : ageYears
  if (isNaN(ageYears)) {
    // 年龄解析失败
    for (const entry of ranges) {
      if (a >= entry.ageMin && a < entry.ageMax) return { modelId: entry.id, gender, deployAge: entry.deployAge, isPregnant: false, ageYears: a, ageParseFailed: true }
    }
  }

  for (const entry of ranges) {
    if (a >= entry.ageMin && a < entry.ageMax) return { modelId: entry.id, gender, deployAge: entry.deployAge, isPregnant: false, ageYears: a }
  }
  return { modelId: ranges[ranges.length-1].id, gender, deployAge: ranges[ranges.length-1].deployAge, isPregnant: false, ageYears: a, fallbackModel: true }
}

// ── 主流程 ──
const imgDir = join(ROOT, 'apps/admin/public/images/patients/')
const videoDir = join(ROOT, 'apps/admin/public/videos/')
const existingImages = new Set(readdirSync(imgDir))
const existingVideos = new Set(readdirSync(videoDir))

const caseDir = join(ROOT, 'apps/admin/public/data/cases/')
const basicFiles = readdirSync(caseDir).filter(f => f.endsWith('-basic.json'))

let ok = []
let issues = []

for (const bf of basicFiles) {
  const caseId = bf.replace('-basic.json', '')
  const d = JSON.parse(readFileSync(join(caseDir, bf), 'utf8'))
  const pi = d.patient_info || {}

  if (!pi.sex && !pi.age && !pi.name) {
    issues.push({ caseId, issue: 'NO_PATIENT_INFO' })
    continue
  }

  const model = matchModel(pi)
  if (model.error) {
    issues.push({ caseId, issue: model.error, detail: { sex: pi.sex, age: pi.age } })
    continue
  }

  const g = model.gender
  const da = model.isPregnant
    ? findClosest(model.deployAge, AVAILABLE_AGES.pregnant)
    : findClosest(model.deployAge, AVAILABLE_AGES[g])

  const fullPath = model.isPregnant
    ? `full-female-pregnant-${da}.jpg`
    : `full-${g}-${da}.jpg`
  const avatarPath = model.isPregnant
    ? `patient-female-pregnant-${da}.jpg`
    : `patient-${g}-${da}.jpg`
  const idleVid = model.isPregnant
    ? `female-pregnant-${da}-idle.mp4`
    : `${g}-${da}-idle.mp4`
  const speakVid = model.isPregnant
    ? `female-pregnant-${da}-speaking.mp4`
    : `${g}-${da}-speaking.mp4`

  const fullOk = existingImages.has(fullPath)
  const avatarOk = existingImages.has(avatarPath)
  const idleOk = existingVideos.has(idleVid)
  const speakOk = existingVideos.has(speakVid)

  const missing = []
  if (!fullOk) missing.push('半身: ' + fullPath)
  if (!avatarOk) missing.push('头像: ' + avatarPath)
  if (!idleOk) missing.push('待机: ' + idleVid)
  if (!speakOk) missing.push('说话: ' + speakVid)

  const entry = {
    caseId, name: pi.name, gender: model.gender,
    rawAge: pi.age, ageYears: model.ageYears,
    modelId: model.modelId, deployAge: model.deployAge,
    isPregnant: model.isPregnant, trimester: model.trimester,
    fullPath, avatarPath,
  }

  if (missing.length > 0) {
    issues.push({ ...entry, issue: 'MISSING_FILES', missing, fallbackModel: model.fallbackModel, ageParseFailed: model.ageParseFailed })
  } else if (model.ageParseFailed || model.fallbackModel) {
    issues.push({ ...entry, issue: 'AGE_PARSE_OR_FALLBACK', ageParseFailed: model.ageParseFailed, fallbackModel: model.fallbackModel })
  } else {
    ok.push(entry)
  }
}

// ── 输出 ──
console.log('══════ 病人形象素材审计 ══════\n')
console.log(`可用图片: ${existingImages.size} 个`)
console.log(`可用视频: ${existingVideos.size} 个`)
console.log(`病例总数: ${basicFiles.length}\n`)

console.log(`✅ 正常: ${ok.length} 个病例`)
for (const o of ok) {
  const pregTag = o.isPregnant ? ` [${o.trimester}]` : ''
  console.log(`  ${o.caseId} | ${o.name} | ${o.gender} | 原始年龄:${o.rawAge} → ${o.ageYears}岁 | model=${o.modelId} deployAge=${o.deployAge}${pregTag}`)
}

console.log(`\n❌ 问题: ${issues.length} 个病例`)
for (const i of issues) {
  console.log(`\n  ▸ ${i.caseId} (${i.name || '?'})`)
  console.log(`    问题: ${i.issue}`)
  if (i.rawAge) console.log(`    原始年龄: ${i.rawAge} → ${i.ageYears}岁`)
  if (i.modelId) console.log(`    模型: ${i.modelId} deployAge=${i.deployAge} gender=${i.gender}`)
  if (i.missing) console.log(`    缺失文件: ${i.missing.join(', ')}`)
  if (i.ageParseFailed) console.log(`    ⚠ 年龄解析失败，回退到默认35岁`)
  if (i.fallbackModel) console.log(`    ⚠ 回退模型`)
  if (i.detail) console.log(`    详情: ${JSON.stringify(i.detail)}`)
}

// 交叉检查：磁盘上的素材是否都被使用
console.log(`\n──── 磁盘文件使用检查 ────`)
const usedImages = new Set()
for (const o of ok) { usedImages.add(o.fullPath); usedImages.add(o.avatarPath) }
for (const i of issues) {
  if (i.fullPath) { usedImages.add(i.fullPath); usedImages.add(i.avatarPath) }
}

const unusedImages = [...existingImages].filter(f => !usedImages.has(f))
const unusedVideos = [...existingVideos].filter(f => {
  // 检查是否有任何已部署年龄引用此视频
  const allDeployAges = [...AVAILABLE_AGES.male, ...AVAILABLE_AGES.female, ...AVAILABLE_AGES.pregnant]
  // 简单判断：是否被引用
  for (const used of usedImages) {
    // 不对，这比较麻烦。直接列出未使用的文件
  }
  return false // skip for now
})

// 检查是否有文件只在一端存在
console.log('  (各端素材同步需单独检查，此处仅检查 admin 端)')
console.log(`  已使用图片: ${usedImages.size} 个`)
console.log(`  磁盘图片: ${existingImages.size} 个`)

const trulyUnused = [...existingImages].filter(f => !usedImages.has(f))
if (trulyUnused.length > 0) {
  console.log(`  ⚠ 未使用图片 (${trulyUnused.length} 个):`)
  for (const f of trulyUnused) console.log(`    - ${f}`)
}
