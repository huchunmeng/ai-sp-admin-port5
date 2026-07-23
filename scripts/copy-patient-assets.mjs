// 从素材源目录复制病人图片/视频到工程 public 目录
// 用法: node scripts/copy-patient-assets.mjs

import { readdirSync, copyFileSync, existsSync, mkdirSync } from 'fs'
import { join, basename } from 'path'

const SRC_BASE = 'D:/klord的个人文件夹/02_work - 副本/00_我的工作区/10_虚拟病人产品/05_素材/02_病人图片'
const SRC_PRIMARY = join(SRC_BASE, '角色正式素材-0814')
const SRC_UPDATE = join(SRC_BASE, '更新0901')
const DEST_IMG = 'apps/training/public/images/patients'
const DEST_VID = 'apps/training/public/videos'

// 年龄映射: 文件夹前缀 → { gender: 'male'|'female', age: number, pregnant: bool }
function buildAgeMap() {
  const map = {}

  // 女性 (16个)
  const femaleAges = [
    ['女01', 1], ['女02', 3], ['女03', 7], ['女04', 18],
    ['女05', 4], ['女06', 8], ['女07', 13], ['女08', 17],
    ['女09', 24], ['女10', 34], ['女11', 45], ['女12', 55],
    ['女13', 65], ['女14', 78], ['女15', 93], ['女16', 100],
  ]
  for (const [id, age] of femaleAges) {
    map[id] = { gender: 'female', age }
  }

  // 男性 (16个)
  const maleAges = [
    ['男01', 1], ['男02', 3], ['男03', 7], ['男04', 18],
    ['男05', 4], ['男06', 8], ['男07', 13], ['男08', 17],
    ['男09', 24], ['男10', 34], ['男11', 45], ['男12', 55],
    ['男13', 65], ['男14', 78], ['男15', 93], ['男16', 100],
  ]
  for (const [id, age] of maleAges) {
    map[id] = { gender: 'male', age }
  }

  // 孕妇 (9个) — 分配到不同年龄以支持孕早/中/晚期
  const pregnantAges = [
    ['孕妇01', 20], ['孕妇02', 23], ['孕妇03', 26],
    ['孕妇04', 32], ['孕妇05', 35], ['孕妇06', 38],
    ['孕妇07', 42], ['孕妇08', 45], ['孕妇09', 48],
  ]
  for (const [id, age] of pregnantAges) {
    map[id] = { gender: 'female', age, pregnant: true }
  }

  return map
}

function parseFolderName(folderName) {
  // 提取角色编号, 如 "女01，0-1个月" → "女01", "孕妇01,16-30岁，孕早期" → "孕妇01"
  const m = folderName.match(/^(女\d+|男\d+|孕妇\d+)/)
  return m ? m[1] : null
}

function copyAssets(srcDir, ageMap, stats) {
  if (!existsSync(srcDir)) return

  const folders = readdirSync(srcDir, { withFileTypes: true })
    .filter(d => d.isDirectory())

  for (const folder of folders) {
    const roleId = parseFolderName(folder.name)
    if (!roleId || !ageMap[roleId]) {
      console.log(`  ⚠ 跳过未知角色: ${folder.name}`)
      continue
    }

    const info = ageMap[roleId]
    const g = info.gender === 'male' ? 'male' : 'female'
    const age = info.age
    const folderPath = join(srcDir, folder.name)

    const files = readdirSync(folderPath)

    for (const file of files) {
      const lower = file.toLowerCase()
      const srcPath = join(folderPath, file)
      let destPath = null

      // 半身像 → full-{gender}-{age}.jpg
      if (file.includes('半身像') || file.includes('半身')) {
        const ext = lower.endsWith('.png') ? '.png' : '.jpg'
        destPath = join(DEST_IMG, `full-${g}-${age}${ext}`)
      }
      // 头像 → patient-{gender}-{age}.jpg
      else if (file.includes('头像')) {
        const ext = lower.endsWith('.png') ? '.png' : '.jpg'
        destPath = join(DEST_IMG, `patient-${g}-${age}${ext}`)
      }
      // 待机视频 → {gender}-{age}-idle.mp4
      else if (file.includes('待机')) {
        destPath = join(DEST_VID, `${g}-${age}-idle.mp4`)
      }
      // 说话视频 → {gender}-{age}-speaking.mp4
      else if (file.includes('说话')) {
        // 跳过 "说话2" 变体，只用第一个
        if (file.includes('说话2')) continue
        destPath = join(DEST_VID, `${g}-${age}-speaking.mp4`)
      }

      if (destPath) {
        copyFileSync(srcPath, destPath)
        const type = basename(destPath)
        if (!stats[type]) stats[type] = 0
        stats[type]++
        console.log(`  ✓ ${folder.name}/${file} → ${basename(destPath)}`)
      }
    }
  }
}

// 主流程
console.log('══════ 复制病人素材 ══════\n')

const ageMap = buildAgeMap()

// 确保目标目录存在
if (!existsSync(DEST_IMG)) mkdirSync(DEST_IMG, { recursive: true })
if (!existsSync(DEST_VID)) mkdirSync(DEST_VID, { recursive: true })

const stats = {}

// 第一轮: 正式素材 (基础)
console.log('📁 第1轮: 角色正式素材-0814')
copyAssets(SRC_PRIMARY, ageMap, stats)

// 第二轮: 更新素材 (覆盖)
console.log('\n📁 第2轮: 更新0901 (覆盖更新)')
copyAssets(SRC_UPDATE, ageMap, stats)

// 汇总
console.log('\n══════ 复制完成 ══════')
console.log(`图片: ${Object.entries(stats).filter(([k]) => k.startsWith('full-') || k.startsWith('patient-')).reduce((s, [,c]) => s + c, 0)} 个`)
console.log(`视频: ${Object.entries(stats).filter(([k]) => k.endsWith('.mp4')).reduce((s, [,c]) => s + c, 0)} 个`)
console.log(`总计: ${Object.values(stats).reduce((s, c) => s + c, 0)} 个文件`)
