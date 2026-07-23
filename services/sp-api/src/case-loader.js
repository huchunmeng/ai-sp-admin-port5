// ═══════════════════════════════════════════════════════════════
// 病例数据加载器
// ═══════════════════════════════════════════════════════════════

import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, '..', '..', '..', 'apps', 'admin', 'public', 'data', 'cases')

function sanitizeId(id) {
  if (!id || typeof id !== 'string') return ''
  return id.replace(/[^a-zA-Z0-9_\-.@]/g, '').replace(/\.{2,}/g, '')
}

export function loadCaseData(caseId, module) {
  const safeId = sanitizeId(caseId)
  const safeModule = sanitizeId(module)
  const filePath = join(DATA_DIR, `${safeId}-${safeModule}.json`)
  if (!existsSync(filePath)) return null
  try { return JSON.parse(readFileSync(filePath, 'utf-8')) } catch { return null }
}

/**
 * 从病例 basic + reception 数据构建角色描述
 *
 * 教训（2026-06-13）：
 * self_narration 必须以 inline 方式紧接身份信息——不能换行/加分隔符/放独立区段。
 * 一旦与身份行分离（无论用 background/symptomPool 哪种方式），
 * LLM 会将其视为"该讲的故事"而非"我是谁"，导致打招呼时夹带症状。
 * inline 拼接时 LLM 将其内化为身份描述，配合提示词的招呼规则才能抑制。
 * 副作用：主诉回答可能偏长（LLM会倾向于复述更多自身信息），但内容准确度远好于分离方案。
 */
export function buildRoleDescription(basic, reception) {
  const roleInfo = reception?.sp_materials?.role_info
  const role = reception?.sp_materials?.role
  const pi = basic.patientInfo || basic.patient_info || {}
  const sn = reception?.sp_materials?.self_narration || ''

  const sexMap = { 0: '女', 1: '男', '0': '女', '1': '男', '女': '女', '男': '男' }

  // family 角色：SP 扮演家属（父母/配偶等），不是患者本人
  if (role === 'family' && roleInfo) {
    const parts = []
    const sex = sexMap[roleInfo.gender] || '女'
    parts.push(`你是${roleInfo.name}`)
    parts.push(`${roleInfo.age}岁`)
    parts.push(sex)
    if (pi.name) parts.push(`，你是${pi.name}的${roleInfo.relation || '家属'}`)
    const cc = basic.chiefComplaint || basic.chief_complaint || ''
    if (cc && pi.name) parts.push(`。${pi.name}${cc}`)
    else if (cc) parts.push(`。${cc}`)
    if (sn) parts.push(` ${sn}`)
    return parts.join('，')
  }

  // patient 角色（默认）：SP 扮演患者本人
  const parts = []
  if (pi.name) parts.push(`你是${pi.name}`)
  if (pi.age) parts.push(`${pi.age}岁`)
  if (pi.sex) parts.push(sexMap[pi.sex] || pi.sex)
  const cc = basic.chiefComplaint || basic.chief_complaint || ''
  if (cc) parts.push(`。${cc}`)
  if (sn) parts.push(` ${sn}`)
  return parts.join('，')
}

/**
 * 正则兜底：症状池结构化（LLM 不可用时）
 */
export function buildSymptomPoolRegex(selfNarration) {
  const identityPatterns = [
    /^我(叫|是)/, /^我今年/, /^我[^\s]{1,3}岁/,
    /^(这|那)?孩子(叫|是|今年)/, /^他(叫|是|今年)/, /^她(叫|是|今年)/,
    /^患者(叫|是)/, /^我是.*妈妈/, /^我是.*爸爸/, /^我是.*家属/,
    /^我家孩子/, /^我们家孩子/,
  ]
  const isIdentity = (s) => identityPatterns.some(p => p.test(s))
  const raw = selfNarration
    .split(/[。！？；\n]+/)
    .map(s => s.replace(/[，,、]/g, '，').trim())
    .filter(s => s.length >= 4)
  if (raw.length === 0) return ''
  const symptoms = raw.filter(s => !isIdentity(s))
  if (symptoms.length === 0) symptoms.push(...raw)
  return symptoms.map((s, i) => `${i + 1}. 「${s}」`).join('\n')
}

/**
 * 加载病例检查报告素材（非必需，不存在返回null）
 * 返回格式化后的提示词段落 + 原始数据映射
 */
export function loadCaseMaterials(caseId) {
  const data = loadCaseData(caseId, 'materials')
  if (!data?.items?.length) return null

  const items = data.items.filter(item => item.mode === 'on_ask' && item.phase === 'history_taking')
  if (items.length === 0) return null

  // 原始映射：id → item（供 index.js 查询用）
  const itemMap = {}
  for (const item of items) {
    itemMap[item.id] = item
  }

  // 构建提示词段落
  const lines = ['## 检查报告素材', '']
  lines.push('你有以下检查报告可以出示。每个回答只答被问的维度，不问不说。', '')

  const itemNames = []
  for (const item of items) {
    lines.push(`- ID:${item.id} | ${item.itemName} | ${item.sourceHospital}(${item.examDate}) | 结论:${item.description} | 出示时说:"${item.spVerbal}"`)
    itemNames.push(item.itemName)
  }

  lines.push('')
  lines.push('### 报告出示规则（检查报告相关问答的精确流程，必须严格遵守时序）')
  lines.push('')
  lines.push('**时序流程（两步，不可跳步）：**')
  lines.push('第1步 — 学生只问"有报告吗/化验单带了吗/报告带了吗" → text必须只说"带了"两个字。show_material填null。禁止说spVerbal，禁止出示。你只是确认身上有报告，不是拿给对方看。')
  lines.push('第2步 — 学生明确要求出示（说"给我看看/拿出来/看看报告/片子呢/报告给我/化验单给我/我看一下"）→ text必须是spVerbal引号里的原话，show_material填对应报告的ID。')
  lines.push('')
  lines.push('**⚠️ 常见错误：学生刚问"有报告吗"，你就把spVerbal说出来了 —— 这是错的。必须等学生明确说"给我看看"之后，才能说spVerbal + 填show_material。**')
  lines.push('')
  lines.push('**正确的两步示例：**')
  lines.push('学生："有报告吗？" → SP："带了"（两字，不展示报告，show_material:null）')
  lines.push('学生："给我看看" → SP：说spVerbal原话（出示报告，show_material:报告ID）')
  lines.push('')
  lines.push('**其他检查问答规则：**')
  lines.push(`- 学生问"在哪儿看过/去过哪里看"→ 口述医院名称。用"看"不用"查"，不说检查名称`)
  lines.push(`- 学生问"做过什么检查/查过什么"→ 口述检查名（${itemNames.join('、')})`)
  lines.push('- 学生精准问某项检查结果(如"肝功能怎么样/抽血结果呢")→ 只答该项结论')
  lines.push('- 学生泛问"结果怎么样/查出来有什么"→ 简短总结异常项')
  lines.push('- 不出示报告时 → show_material填null')
  lines.push('- 学生只提了其中一项 → 只出示那一项，其他报告不提')

  return {
    promptBlock: lines.join('\n'),
    itemMap
  }
}
