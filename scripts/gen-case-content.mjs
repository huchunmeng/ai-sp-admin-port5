// 基于病历知识库为单个病例生成全部模块内容
// 生成模块：reception / analysis / humanity / scoreSheet / meta / expert
// （materials 依赖真实影像图片文件，不在脚本范围内）
//
// 用法：
//   node scripts/gen-case-content.mjs --case IM-20260801-PCH
//   node scripts/gen-case-content.mjs --case IM-20260801-PCH --only reception,humanity
//   node scripts/gen-case-content.mjs --case IM-20260801-PCH --force     # 强制重写已有文件
//   node scripts/gen-case-content.mjs --case IM-20260801-PCH --key/--url/--model # 覆盖 LLM 配置
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { fillReceptionPrompt, fillAnalysisPrompt, fillHumanityPrompt, callLLM } from '@ai-sp/ai-generator'
import { generateV1ScoreSheet, buildMetaInfo } from '../apps/admin/src/views/case-editor/score-sheet-generator.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const CASES_DIR = path.join(ROOT, 'apps/admin/public/data/cases')
const ENV_FILE = path.join(ROOT, 'apps/admin/.env.local')

// ── CLI 解析 ──
const args = process.argv.slice(2)
const getFlag = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null }
const CASE_ID = getFlag('--case')
const ONLY = getFlag('--only') ? getFlag('--only').split(',').map(s => s.trim()).filter(Boolean) : null
const FORCE = args.includes('--force')
const LLM_STEPS = ['reception', 'analysis', 'humanity', 'expert']
const DERIVED_STEPS = ['scoreSheet', 'meta']

if (!CASE_ID) { console.error('用法：node scripts/gen-case-content.mjs --case <caseId> [--only a,b] [--force]'); process.exit(1) }

// ── .env.local 解析（KEY=VALUE，跳过注释）──
function loadEnv(file) {
  const out = {}
  if (!fs.existsSync(file)) return out
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    if (line.trim().startsWith('#') || !line.includes('=')) continue
    const i = line.indexOf('=')
    const k = line.slice(0, i).trim()
    const v = line.slice(i + 1).trim().replace(/^"|"$/g, '')
    if (k) out[k] = v
  }
  return out
}
const env = loadEnv(ENV_FILE)
const API_URL = getFlag('--url') || env.AI_GENERATE_API_URL
const API_KEY = getFlag('--key') || env.AI_GENERATE_API_KEY
const MODEL = getFlag('--model') || env.AI_GENERATE_MODEL || 'qwen-plus'

if (!API_KEY || !API_URL) { console.error('缺少 LLM 配置（apps/admin/.env.local 的 AI_GENERATE_API_KEY/URL）'); process.exit(1) }

// ── 数据加载 ──
function loadJSON(p) { return JSON.parse(fs.readFileSync(p, 'utf8')) }
const basicPath = path.join(CASES_DIR, `${CASE_ID}-basic.json`)
const medRecPath = path.join(CASES_DIR, `${CASE_ID}-medicalRecords.json`)
if (!fs.existsSync(basicPath)) { console.error(`缺少 ${CASE_ID}-basic.json`); process.exit(1) }
const basic = loadJSON(basicPath)
const medicalRecords = fs.existsSync(medRecPath) ? (loadJSON(medRecPath).records || null) : null

const config = {
  specialty: basic.specialty || '内科',
  category: basic.category || '',
  disease: basic.disease || '',
  teaching_phase: basic.difficulty || basic.teaching_phase || 'R2'
}

// ── 病历知识库格式化（裁剪表单噪音，按临床顺序）──
const KB_FTYPE_LABELS = {
  'In_Record': '入院记录', 'FirstRecord': '首次病程记录', 'NormalRecord': '病程记录',
  'AttendingInvestigate': '主治医师查房', 'DirectorInvestigate': '主任医师查房',
  'Consultation_Record': '会诊记录', 'ShiftToRecord': '转入记录', 'TurnOutRecord': '转出记录',
  'Preoperative_summary': '术前小结', 'Preoperative_discussion': '术前讨论',
  'Ops_Agree_Record': '手术同意记录', 'OpsSafeCheck': '手术安全核查',
  'Operation_Record': '手术记录', 'OperRecord': '操作记录', 'OpsFirstRecord': '术后首次病程',
  'Special_Check_Record': '特殊检查记录', 'LeaveHospitalRecord': '出院前病程',
  'Out_Record': '出院记录', 'others': '其他记录'
}
const KB_FTYPE_ORDER = [
  'In_Record', 'FirstRecord', 'NormalRecord', 'AttendingInvestigate', 'DirectorInvestigate',
  'Consultation_Record', 'ShiftToRecord', 'TurnOutRecord', 'Preoperative_summary',
  'Preoperative_discussion', 'Ops_Agree_Record', 'Operation_Record', 'OperRecord',
  'OpsFirstRecord', 'Special_Check_Record', 'LeaveHospitalRecord', 'Out_Record'
]
// 单条记录内容上限（裁掉同意书等超长样板文字）
const KB_MAX_LEN = 2000
function formatKB(records) {
  if (!records || typeof records !== 'object') return ''
  const lines = []
  for (const ftype of KB_FTYPE_ORDER) {
    const list = records[ftype]
    if (!Array.isArray(list) || list.length === 0) continue
    const label = KB_FTYPE_LABELS[ftype] || ftype
    for (const rec of list) {
      if (!rec || !rec.content) continue
      const meta = [`【${label}】`]
      if (rec.createDate) meta.push(`时间：${rec.createDate}`)
      if (rec.doctorCode) meta.push(`医师：${rec.doctorCode}`)
      const content = rec.content.length > KB_MAX_LEN ? rec.content.slice(0, KB_MAX_LEN) + '…（后略）' : rec.content
      lines.push(meta.join(' '))
      lines.push(content)
      lines.push('')
    }
  }
  return lines.join('\n').trim()
}
const kbText = formatKB(medicalRecords)
console.log(`[gen-case-content] ${CASE_ID} 病历知识库文本 ${kbText.length} 字符`)

// ── LLM 提示词（追加病历知识库作为参考语境）──
function withKB(prompt) {
  if (!kbText) return prompt
  return `${prompt}\n\n## 病历知识库原始资料（必须参考，保证与真实病历一致；其中包含部分非临床文书，请忽略冗余信息）\n${kbText}`
}

async function genLLM(step, prompt) {
  console.log(`[gen-case-content] 生成 ${step} ...`)
  const data = await callLLM(withKB(prompt), API_URL, API_KEY, MODEL)
  if (data && typeof data === 'object' && data.case_id === undefined && step !== 'expert') {
    data.case_id = CASE_ID
  }
  const file = path.join(CASES_DIR, `${CASE_ID}-${step}.json`)
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8')
  console.log(`[gen-case-content] ✓ 已保存 ${file}`)
  return data
}

function need(step) { return !ONLY || ONLY.includes(step) }
function skipExisting(step) {
  if (FORCE) return false
  const p = path.join(CASES_DIR, `${CASE_ID}-${step}.json`)
  return fs.existsSync(p)
}

// ── 各模块生成 ──
const results = {}

async function run() {
  // 1. reception
  if (need('reception')) {
    if (skipExisting('reception')) console.log('[gen-case-content] 跳过 reception（已存在，--force 强制）')
    else results.reception = await genLLM('reception', fillReceptionPrompt(config, basic))
  }

  // 2. analysis
  if (need('analysis')) {
    if (skipExisting('analysis')) console.log('[gen-case-content] 跳过 analysis（已存在，--force 强制）')
    else results.analysis = await genLLM('analysis', fillAnalysisPrompt(config, basic))
  }

  // 3. humanity
  if (need('humanity')) {
    if (skipExisting('humanity')) console.log('[gen-case-content] 跳过 humanity（已存在，--force 强制）')
    else results.humanity = await genLLM('humanity', fillHumanityPrompt(config, basic))
  }

  // 4. scoreSheet — 从 basic 派生（不耗 LLM）
  if (need('scoreSheet')) {
    if (skipExisting('scoreSheet')) console.log('[gen-case-content] 跳过 scoreSheet（已存在）')
    else {
      const sheet = generateV1ScoreSheet(basic)
      fs.writeFileSync(path.join(CASES_DIR, `${CASE_ID}-scoreSheet.json`), JSON.stringify(sheet, null, 2), 'utf-8')
      console.log(`[gen-case-content] ✓ 已生成 scoreSheet（${sheet.length} 行）`)
    }
  }

  // 5. meta — 组装（不耗 LLM）
  if (need('meta')) {
    if (skipExisting('meta')) console.log('[gen-case-content] 跳过 meta（已存在）')
    else {
      const prev = {
        reception: results.reception || (fs.existsSync(path.join(CASES_DIR, `${CASE_ID}-reception.json`)) ? loadJSON(path.join(CASES_DIR, `${CASE_ID}-reception.json`)) : {}),
        analysis: results.analysis || (fs.existsSync(path.join(CASES_DIR, `${CASE_ID}-analysis.json`)) ? loadJSON(path.join(CASES_DIR, `${CASE_ID}-analysis.json`)) : {}),
        humanity: results.humanity || (fs.existsSync(path.join(CASES_DIR, `${CASE_ID}-humanity.json`)) ? loadJSON(path.join(CASES_DIR, `${CASE_ID}-humanity.json`)) : {})
      }
      const meta = buildMetaInfo(basic, prev)
      fs.writeFileSync(path.join(CASES_DIR, `${CASE_ID}-meta.json`), JSON.stringify(meta, null, 2), 'utf-8')
      console.log('[gen-case-content] ✓ 已生成 meta')
    }
  }

  // 6. expert — 专家知识库（LLM 生成专家KB文本）
  if (need('expert')) {
    if (skipExisting('expert')) console.log('[gen-case-content] 跳过 expert（已存在）')
    else {
      const expPrompt = buildExpertPrompt(basic)
      const data = await genLLM('expert', expPrompt)
      // 组装 expert.json
      const expert = {
        caseId: CASE_ID,
        expertEnabled: true,
        expertName: '滕皋军 院士',
        expertTitle: '东南大学附属中大医院 · 介入与血管外科',
        expertAvatar: '/images/expert-photo.webp',
        expertTags: ['中国科学院院士', '介入放射学', '肝癌MDT'],
        reviewTitle: data.reviewTitle || '乙肝相关肝癌伴门静脉癌栓的综合评估与个体化介入+系统治疗决策',
        expertKB: data.expertKB || ''
      }
      fs.writeFileSync(path.join(CASES_DIR, `${CASE_ID}-expert.json`), JSON.stringify(expert, null, 2), 'utf-8')
      console.log(`[gen-case-content] ✓ 已保存 expert（expertKB ${(expert.expertKB || '').length} 字符）`)
    }
  }

  console.log('[gen-case-content] 全部完成')
}

function buildExpertPrompt(basicData) {
  return `你是一名肝癌介入治疗领域资深专家。请为以下住院病例撰写一份「专家知识库」（供AI考官点评与考生学习参考），产出 JSON：
{
  "reviewTitle": "一句话评审标题",
  "expertKB": "长文专业知识（约3000-5000字，用\\n\\n分段）"
}

专家KB内容要求：
1. 围绕本病例的核心病种（肝细胞癌伴门静脉癌栓、乙肝肝硬化背景）展开，覆盖：流行病学与发病机制、诊断体系（影像学"快进快出"、AFP/PIVKA-II等标志物）、CNLC/BCLC分期与门静脉癌栓（VP分型）的预后意义、综合治疗策略（本例实际采用的信迪利单抗+贝伐珠单抗免疫治疗、门静脉支架+放射性粒子植入、肝动脉灌注化疗/栓塞、恩替卡韦抗病毒、食管胃底静脉曲张消化道出血风险管理）、乙肝抗病毒在肝癌全程管理中的地位。
2. 结合本病例具体数据：异常凝血酶原（PIVKA-II）20087.51mAu/ml显著升高、门静脉主干及右支癌栓、脾大脾亢、血小板减少、介入术后转氨酶升高与消化道出血风险等。
3. 教学点评要聚焦：肿瘤负荷与肝功能储备的平衡、门静脉癌栓的处理策略、免疫治疗（消化道出血高危患者）的风险管理、MDT协作思维。

## 病例摘要
${JSON.stringify(basicData, null, 2)}`
}

run().catch(e => { console.error('[gen-case-content] 失败:', e.message); process.exit(1) })
