#!/usr/bin/env node
/**
 * 把"仅有全文 content、无结构化 records"的原始病历素材转换成结构化 records
 * - 目标：apps/admin/public/data/raw-records/*.json（content 为病例汇总全文的 8 份）
 * - 三种源格式统一解析：
 *   A. markdown 表格  | 字段 | 值 |
 *   B. 纯文本字段行   字段：\n值
 *   C. 已成型文档     「入院记录」全文（含 主诉/现病史 …）
 * - 输出 records：In_Record（入院记录）+ Special_Check_Record（特殊检查记录）
 * - 保留原 content 与 patientInfo 等字段，仅补 records
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const RAW_DIR = path.resolve(__dirname, '../apps/admin/public/data/raw-records')

// 入院记录包含字段（身份 + 临床），按自然顺序
const IN_RECORD_FIELDS = ['姓名', '年龄', '性别', '职业', '婚姻', '孕周', '入院日期', '记录日期', '入院科别', '症状', '主诉', '现病史', '既往史', '个人史', '家族史', '婚育史', '一般状况', '系统回顾', '生命体征', '一般情况', '各系统检查', '诊断', '鉴别诊断', '诊断依据', '诊疗计划']
// 特殊检查记录包含字段
const CHECK_FIELDS = ['实验室检查', '影像学检查', '特殊检查']

// 提取字段表 { 字段: 值 }；无法识别返回 null（视为成型文档）
function extractFields(content) {
  const lines = content.split('\n')

  // A. markdown 表格：| 字段 | 值 |
  const table = []
  for (const ln of lines) {
    const m = ln.match(/^\|\s*([^|]+?)\s*\|\s*([^|]*?)\s*\|$/)
    if (m) {
      const k = m[1].trim()
      if (!k || /^-+$/.test(k) || k === '字段') continue
      table.push([k, m[2].trim()])
    }
  }
  if (table.length > 5) return Object.fromEntries(table)

  // B. 纯文本：字段：\n值（字段行以全角冒号结尾）
  const plain = {}
  let cur = null
  for (const ln of lines) {
    const fm = ln.match(/^([一-龥A-Za-z0-9（）()]+)：\s*$/)
    if (fm) { cur = fm[1].trim(); plain[cur] = []; continue }
    if (cur) { const t = ln.trim(); if (t) plain[cur].push(t) }
  }
  if (Object.keys(plain).length > 3) {
    return Object.fromEntries(Object.entries(plain).map(([k, v]) => [k, v.join('\n')]))
  }
  return null
}

function pickDate(fields) {
  const v = fields['记录日期'] || fields['入院日期'] || ''
  const m = String(v).match(/\d{4}-\d{2}-\d{2}/)
  return m ? m[0] : ''
}

// 文档格式（C）：直接作为入院记录；日期从「入院日期 / 记录日期」行提取
function docDate(content) {
  const m = content.match(/(?:入院日期|记录日期)[\s：:](\d{4}-\d{2}-\d{2})/)
  return m ? m[1] : ''
}

function buildRecords(fields, fallbackContent) {
  if (!fields) {
    // 成型文档全文 → 单条入院记录
    return {
      In_Record: [{ createDate: docDate(fallbackContent), doctorCode: '', visitNo: '', content: fallbackContent.trim() }],
    }
  }
  const inLines = ['入  院  记  录']
  for (const f of IN_RECORD_FIELDS) {
    const v = (fields[f] || '').trim()
    if (v) inLines.push(`${f} ${v}`)
  }
  const records = {
    In_Record: [{ createDate: pickDate(fields), doctorCode: '', visitNo: '', content: inLines.join('\n') }],
  }
  const checkLines = ['特殊检查记录']
  for (const f of CHECK_FIELDS) {
    const v = (fields[f] || '').trim()
    if (v) checkLines.push(`${f} ${v}`)
  }
  if (checkLines.length > 1) {
    records.Special_Check_Record = [{ createDate: pickDate(fields), doctorCode: '', visitNo: '', content: checkLines.join('\n') }]
  }
  return records
}

const files = fs.readdirSync(RAW_DIR).filter((f) => f.endsWith('.json'))
let converted = 0
for (const f of files) {
  const p = path.join(RAW_DIR, f)
  const d = JSON.parse(fs.readFileSync(p, 'utf8'))
  const hasRecords = Object.entries(d.records || {}).some(([, l]) => Array.isArray(l) && l.length)
  if (hasRecords) continue
  if (!d.content || !String(d.content).trim()) continue

  const fields = extractFields(d.content)
  const records = buildRecords(fields, d.content)
  d.records = { ...(d.records || {}), ...records }
  fs.writeFileSync(p, JSON.stringify(d, null, 2) + '\n', 'utf8')
  converted++
  const src = fields ? Object.keys(fields).length + ' 字段' : '成型文档全文'
  console.log(`  ✓ ${d.id} | ${d.title} | ${src} → In_Record(${records.In_Record.length}) + Special_Check_Record(${records.Special_Check_Record ? records.Special_Check_Record.length : 0})`)
}
console.log(`\n已转换 ${converted} 份素材`)
