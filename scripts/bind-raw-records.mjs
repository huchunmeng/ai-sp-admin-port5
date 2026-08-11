#!/usr/bin/env node
/**
 * 给所有 SP 病例绑定原始病历素材（sourceRecordId）
 * - 素材源：apps/admin/public/data/raw-records/*.json（42 份）
 * - 病例源：apps/admin/public/data/cases/*-basic.json（27 份）
 * - 匹配策略：专业映射 → 病名子串优先（含 disease/title）→ 同专业首个兜底
 * - 写入：apps/admin/public/data/cases/{caseId}-medicalRecords.json
 *         结构 { caseId, sourceRecordId, records }，已存在则仅改 sourceRecordId、保留 records
 * - 跳过：无对应素材的专业（皮肤科、精神科）
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const CASES_DIR = path.join(root, 'apps/admin/public/data/cases')
const RAW_DIR = path.join(root, 'apps/admin/public/data/raw-records')

// 病例专业 → 素材专业别名（素材 specialty 为中文）
const SPEC_MAP = {
  儿科: ['儿科'],
  妇产科: ['产科'],
  骨科: ['骨科'],
  急诊科: ['急诊科'],
  普通外科: ['普外科', '胃肠外科', '肝胆外科'],
  内科: ['内科', '内分泌科', '消化内科', '心内科', '肾内科', '风湿免疫科', '肿瘤内科', '肝胆外科', '介入科'],
  神经内科: ['神经内科', '神经外科'],
  皮肤科: [],
  精神科: [],
}

const norm = (s) => String(s || '').replace(/[\s　，。、；：（）()《》【】,.;:]+/g, '')

const materials = fs.readdirSync(RAW_DIR)
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(fs.readFileSync(path.join(RAW_DIR, f), 'utf8')))
  .filter((m) => m && m.id)

const cases = fs.readdirSync(CASES_DIR)
  .filter((f) => f.endsWith('-basic.json'))
  .map((f) => JSON.parse(fs.readFileSync(path.join(CASES_DIR, f), 'utf8')))
  .filter((c) => c && c.case_id)

// 返回 { material, kind: 'exact' | 'disease' | 'title' | 'fallback' } 或 null
function matchMaterial(c) {
  const specs = SPEC_MAP[c.specialty] || []
  // 候选按专业别名优先级排序（SPEC_MAP 越靠前越贴近病例专业）
  const cands = materials
    .filter((m) => specs.includes(m.specialty))
    .sort((a, b) => specs.indexOf(a.specialty) - specs.indexOf(b.specialty))
  if (!cands.length) return null
  const cNorm = norm(c.disease)
  // 1. 病名完全一致（最高优先，不被子串覆盖）
  if (cNorm) {
    const exact = cands.find((m) => norm(m.disease) === cNorm)
    if (exact) return { material: exact, kind: 'exact' }
  }
  // 2. 病名子串互相包含（取命中病名最长者）
  let best = null
  let bestLen = -1
  for (const m of cands) {
    const d = norm(m.disease)
    if (cNorm && d && (d.includes(cNorm) || cNorm.includes(d)) && d.length > bestLen) {
      best = m
      bestLen = d.length
    }
  }
  if (best) return { material: best, kind: 'disease' }
  // 3. title 包含病名
  if (cNorm) {
    for (const m of cands) {
      if (norm(m.title).includes(cNorm)) return { material: m, kind: 'title' }
    }
  }
  // 4. 兜底：同专业优先级首个
  return { material: cands[0], kind: 'fallback' }
}

const bound = []
const skipped = []

for (const c of cases) {
  const hit = matchMaterial(c)
  const file = path.join(CASES_DIR, `${c.case_id}-medicalRecords.json`)
  if (!hit) {
    skipped.push({ id: c.case_id, specialty: c.specialty })
    continue
  }
  let data = { caseId: c.case_id, records: {} }
  if (fs.existsSync(file)) {
    try {
      data = JSON.parse(fs.readFileSync(file, 'utf8'))
    } catch (e) {
      data = { caseId: c.case_id, records: {} }
    }
  }
  data.caseId = c.case_id
  data.sourceRecordId = hit.material.id
  if (!data.records || typeof data.records !== 'object') data.records = {}
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8')
  bound.push({
    id: c.case_id,
    specialty: c.specialty,
    disease: c.disease,
    material: `${hit.material.id} ${hit.material.title || ''}`.trim(),
    kind: hit.kind,
  })
}

// ── 校验：sourceRecordId 必须指向真实素材 ──
const ids = new Set(materials.map((m) => m.id))
let invalid = 0
for (const b of bound) {
  const data = JSON.parse(fs.readFileSync(path.join(CASES_DIR, `${b.id}-medicalRecords.json`), 'utf8'))
  if (!ids.has(data.sourceRecordId)) { invalid++; console.error(`  ✗ ${b.id} → ${data.sourceRecordId} 不存在`) }
}

console.log('\n=== 绑定结果 ===')
for (const b of bound) console.log(`  [${b.kind}] ${b.id} (${b.specialty}/${b.disease}) → ${b.material}`)
console.log(`\n已绑定 ${bound.length} 例（exact/disease/title/fallback 分布：` +
  `${bound.filter(b => b.kind === 'exact').length}/${bound.filter(b => b.kind === 'disease').length}/${bound.filter(b => b.kind === 'title').length}/${bound.filter(b => b.kind === 'fallback').length}）`)
console.log(`跳过 ${skipped.length} 例（无对应素材）：`)
for (const s of skipped) console.log(`  ${s.id} (${s.specialty})`)
console.log(invalid ? `\n⚠ ${invalid} 例指向不存在的素材！` : '\n✓ 全部 sourceRecordId 均指向真实素材')
