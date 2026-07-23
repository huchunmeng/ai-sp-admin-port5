// 考站方案配置 — 统一入口
// 数据来源：各培训阶段配置文件
// 编辑持久化：通过 Vite 插件写入共享 JSON 文件（降级到 localStorage）

import residencySchemes from './residency.js'
import collegeSchemes from './college.js'
import specialtySchemes from './specialty.js'
import { stationSchemesEdits } from '../station-schemes-edits.js'

/** 全部方案（配置 + 编辑合并） */
export async function loadAllSchemes() {
  const base = [
    ...residencySchemes.map(clone),
    ...collegeSchemes.map(clone),
    ...specialtySchemes.map(clone)
  ]
  const edits = await stationSchemesEdits.load()
  return mergeEdits(base, edits)
}

/** 按阶段获取方案 */
export async function loadSchemesByPhase(phase) {
  let base
  switch (phase) {
    case '住院医师': base = residencySchemes; break
    case '院校教育': base = collegeSchemes; break
    case '专科培训': base = specialtySchemes; break
    default: base = []
  }
  const edits = await stationSchemesEdits.load()
  return mergeEdits(base.map(clone), edits)
}

/** 保存单个方案的编辑 */
export async function saveSchemeEdit(scheme) {
  const edits = await stationSchemesEdits.load()
  edits[scheme.id] = clone(scheme)
  await stationSchemesEdits.save(edits)
}

/** 删除本地编辑 */
export async function removeSchemeEdit(schemeId) {
  const edits = await stationSchemesEdits.load()
  delete edits[schemeId]
  await stationSchemesEdits.save(edits)
}

/** 重置所有编辑 */
export async function resetAllEdits() {
  await stationSchemesEdits.save({})
}

// ===== 内部工具 =====

function clone(obj) {
  return JSON.parse(JSON.stringify(obj))
}

function mergeEdits(baseSchemes, edits) {
  const merged = baseSchemes.map(scheme => {
    if (edits[scheme.id]) {
      if (scheme.type !== 'institution') {
        // 平台/省级方案：只合并status，专业数据始终从配置文件读取
        const merged = clone(scheme)
        merged.status = edits[scheme.id].status ?? edits[scheme.id].enabled ?? scheme.status
        return merged
      }
      return clone(edits[scheme.id])
    }
    return scheme
  })
  // 添加仅存在于 edits 中的机构方案（用户新建的）
  for (const [id, scheme] of Object.entries(edits)) {
    if (!baseSchemes.find(s => s.id === id) && scheme.type === 'institution') {
      merged.push(clone(scheme))
    }
  }
  return merged
}

export { residencySchemes, collegeSchemes, specialtySchemes }
export { SPECIALTIES, getSpecialty, resolveSpecialty, resolveStationKey, ALL_CN_NAMES } from '../specialty-registry.js'
