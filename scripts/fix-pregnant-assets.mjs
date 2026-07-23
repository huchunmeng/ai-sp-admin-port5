// 修复孕妇素材: 从普通女性年龄池中移除，独立命名
import { readdirSync, copyFileSync, existsSync, unlinkSync } from 'fs'
import { join } from 'path'

const SRC_BASE = 'D:/klord的个人文件夹/02_work - 副本/00_我的工作区/10_虚拟病人产品/05_素材/02_病人图片'
const SRC_PRIMARY = join(SRC_BASE, '角色正式素材-0814')
const SRC_UPDATE = join(SRC_BASE, '更新0901')
const DEST_IMG = 'apps/training/public/images/patients'
const DEST_VID = 'apps/training/public/videos'

// 新孕妇年龄 (非碰撞)
const NEW_PREG_AGES = {
  '孕妇01': 21, '孕妇02': 28, '孕妇03': 31,
  '孕妇04': 33, '孕妇05': 36, '孕妇06': 39,
  '孕妇07': 43, '孕妇08': 47, '孕妇09': 50,
}

// 旧碰撞年龄 (全部删除)
const OLD = [20, 23, 26, 32, 35, 38, 42, 45, 48]

console.log('1. 删除旧孕妇文件...')
for (const age of OLD) {
  for (const p of ['full-female', 'patient-female']) {
    const f = join(DEST_IMG, `${p}-${age}.jpg`)
    if (existsSync(f)) { unlinkSync(f); console.log(`  删 ${p}-${age}.jpg`) }
  }
  for (const t of ['idle', 'speaking']) {
    const f = join(DEST_VID, `female-${age}-${t}.mp4`)
    if (existsSync(f)) { unlinkSync(f); console.log(`  删 female-${age}-${t}.mp4`) }
  }
}

// 2. 恢复被覆盖的非孕妇 女11 (45岁)
console.log('\n2. 恢复女11(45岁非孕妇)...')
const nu11 = readdirSync(join(SRC_PRIMARY, '女11，40-49岁'))
for (const file of nu11) {
  let dest = null
  if (file.includes('半身')) dest = join(DEST_IMG, 'full-female-45.jpg')
  else if (file.includes('头像')) dest = join(DEST_IMG, 'patient-female-45.jpg')
  else if (file.includes('待机')) dest = join(DEST_VID, 'female-45-idle.mp4')
  else if (file.includes('说话') && !file.includes('说话2')) dest = join(DEST_VID, 'female-45-speaking.mp4')
  if (dest) { copyFileSync(join(SRC_PRIMARY, '女11，40-49岁', file), dest); console.log(`  ✓ 女11/${file}`) }
}

// 3. 用新年龄复制孕妇
console.log('\n3. 复制孕妇素材 (pregnant- 前缀)...')
function copyPreg(srcDir, round) {
  if (!existsSync(srcDir)) return
  const folders = readdirSync(srcDir, { withFileTypes: true })
    .filter(d => d.isDirectory() && d.name.startsWith('孕妇'))
  for (const folder of folders) {
    const rid = (folder.name.match(/^(孕妇\d+)/) || [])[1]
    if (!rid || !NEW_PREG_AGES[rid]) continue
    const age = NEW_PREG_AGES[rid]
    const files = readdirSync(join(srcDir, folder.name))
    for (const file of files) {
      const src = join(srcDir, folder.name, file)
      let dest = null
      if (file.includes('半身')) dest = join(DEST_IMG, `full-female-pregnant-${age}.jpg`)
      else if (file.includes('头像')) dest = join(DEST_IMG, `patient-female-pregnant-${age}.jpg`)
      else if (file.includes('待机')) dest = join(DEST_VID, `female-pregnant-${age}-idle.mp4`)
      else if (file.includes('说话') && !file.includes('说话2')) dest = join(DEST_VID, `female-pregnant-${age}-speaking.mp4`)
      if (dest) { copyFileSync(src, dest); console.log(`  ✓ ${rid}/${file}`) }
    }
  }
}
copyPreg(SRC_PRIMARY, 1)
copyPreg(SRC_UPDATE, 2)

console.log('\n完成!')
