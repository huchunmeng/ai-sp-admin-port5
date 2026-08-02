/**
 * MDT多学科讨论数据加载层
 * MDT 病例由管理端独立管理，存储于 admin/public/data/mdt-cases/{id}-mdt.json
 * 训练端通过索引接口加载列表、按 id 拉取完整数据
 */

let mdtCache = null
const mdtDetailCache = new Map()

export async function loadMDTCases() {
  try {
    const res = await fetch('/api/mdt-cases')
    const list = res.ok ? await res.json() : []
    mdtCache = list
    return list
  } catch (e) {
    mdtCache = []
    return []
  }
}

export function getCachedMDTCases() {
  return mdtCache || []
}

export async function loadMDTCase(mdtId) {
  if (mdtDetailCache.has(mdtId)) return mdtDetailCache.get(mdtId)
  try {
    const res = await fetch(`/data/mdt-cases/${mdtId}-mdt.json`)
    if (!res.ok) return null
    const data = await res.json()
    mdtDetailCache.set(mdtId, data)
    return data
  } catch (e) {
    return null
  }
}

// 兼容旧调用：从已加载的详情缓存读取（未加载返回 null）
export function getMDTCase(mdtId) {
  return mdtDetailCache.get(mdtId) || null
}

export function disciplineIcon(name) {
  const map = {
    '心内科': 'fa-solid fa-heart-pulse',
    '心外科': 'fa-solid fa-heart',
    '肾内科': 'fa-solid fa-droplet',
    '呼吸科': 'fa-solid fa-lungs',
    '风湿免疫科': 'fa-solid fa-shield',
    '影像科': 'fa-solid fa-film',
    '神经内科': 'fa-solid fa-brain',
    '康复科': 'fa-solid fa-person-walking',
    '消化科': 'fa-solid fa-flask',
    '肿瘤科': 'fa-solid fa-ribbon',
    '普外科': 'fa-solid fa-suitcase-medical',
    '内分泌科': 'fa-solid fa-vial',
    '眼科': 'fa-solid fa-eye',
  }
  return map[name] || 'fa-solid fa-stethoscope'
}
