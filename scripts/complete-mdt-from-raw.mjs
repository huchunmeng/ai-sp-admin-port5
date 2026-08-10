// MDT 病例补齐 — 基于原始病历素材库，批量补齐 42 个 raw 病例缺失字段
// 补全：disciplines(≥3) / knowledgeBase.disciplinePerspectives[].view /
//       clinicalKeyPoints / keyQuestions / decision / followUp /
//       会诊前配置(trigger/inviteCandidates/auxiliaryDisciplines/disagreementPairs/admissionContext)
// 并重建 v3 stages/agenda/tasks。
// 用法：
//   node scripts/complete-mdt-from-raw.mjs                 # 补齐（幂等，已有 view 跳过）
//   node scripts/complete-mdt-from-raw.mjs --force         # 强制重写
//   node scripts/complete-mdt-from-raw.mjs --only <caseId> # 只处理单个病例
//   node scripts/complete-mdt-from-raw.mjs --parallel 2    # 并发池大小（默认 2）
//   node scripts/complete-mdt-from-raw.mjs --check         # dry-run：校验补齐字段
//   node scripts/complete-mdt-from-raw.mjs --key/--url/--model # 覆盖 LLM 配置
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { repairJSON } from '../services/ai-generator/src/llm-client.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const CASES_DIR = path.join(ROOT, 'apps/admin/public/data/mdt-cases')
const RAW_DIR = path.join(ROOT, 'apps/admin/public/data/raw-records')
const ENV_FILE = path.join(ROOT, 'apps/training/.env.local')

// ── CLI 解析 ──
const args = process.argv.slice(2)
const getFlag = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null }
const FORCE = args.includes('--force')
const CHECK = args.includes('--check')
const ONLY = getFlag('--only')
const PARALLEL = Math.max(1, parseInt(getFlag('--parallel') || '2', 10))

// ── .env.local 解析 ──
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
const API_URL = getFlag('--url') || process.env.LLM_API_URL || env.LLM_API_URL
const API_KEY = getFlag('--key') || process.env.LLM_API_KEY || env.LLM_API_KEY
const MODEL = getFlag('--model') || process.env.LLM_MODEL || env.LLM_MODEL || 'qwen-turbo'

// ── LLM 调用（OpenAI 兼容，带 repairJSON + 重试）──
async function callLLMOnce(prompt) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 120000)
  try {
    const resp = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: '你是一名资深临床医学教育专家与病历分析专家。请严格按照要求输出JSON，不要包含任何解释性文字或Markdown标记。' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 6000,
      }),
      signal: controller.signal,
    })
    clearTimeout(timeout)
    if (!resp.ok) throw new Error(`LLM API error ${resp.status}: ${(await resp.text()).slice(0, 200)}`)
    const json = await resp.json()
    return json.choices?.[0]?.message?.content || ''
  } catch (e) {
    clearTimeout(timeout)
    throw e
  }
}

async function generateJSON(prompt) {
  let lastError
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const content = await callLLMOnce(prompt)
      return JSON.parse(repairJSON(content))
    } catch (e) {
      lastError = e
      if (attempt < 2) prompt = `你上一次的输出无法被JSON解析。错误：${e.message}\n\n请严格按JSON格式重新输出完整结果，不要解释性文字。\n\n原始任务：\n${prompt}`
    }
  }
  throw lastError
}

// ── 从原始病历构建 LLM 上下文 ──
function buildRawContext(raw) {
  if (!raw) return ''
  const parts = []
  const pi = raw.patientInfo || {}
  if (pi.name || pi.gender || pi.age) {
    parts.push(`患者：${pi.name || '佚名'}${pi.gender ? '，' + pi.gender : ''}${pi.age ? '，' + pi.age + '岁' : ''}`)
  }
  if (raw.disease) parts.push(`病种/诊断：${raw.disease}`)
  if (raw.specialty) parts.push(`收治科室：${raw.specialty}`)

  const records = raw.records || {}
  // 优先：入院记录全文（主诉/现病史/查体/辅检/既往史）
  const inRec = records.In_Record?.[0]?.content
  if (inRec) parts.push(`【入院记录】\n${inRec.slice(0, 2600)}`)
  // 补充：手术记录/出院记录/会诊记录关键信息
  const extra = []
  if (records.Operation_Record?.[0]?.content) extra.push(`【手术记录】\n${records.Operation_Record[0].content.slice(0, 900)}`)
  if (records.Out_Record?.[0]?.content) extra.push(`【出院记录】\n${records.Out_Record[0].content.slice(0, 900)}`)
  if (records.Consultation_Record?.[0]?.content) extra.push(`【会诊记录】\n${records.Consultation_Record[0].content.slice(0, 600)}`)
  if (extra.length) parts.push(extra.join('\n\n'))

  // 无结构化 records → 用原始全文（截断）
  if (!Object.keys(records).length && raw.content) {
    parts.push(`【原始病历全文】\n${raw.content.slice(0, 3200)}`)
  }
  return parts.join('\n\n')
}

// ── Prompt 构建 ──
function buildPrompt(caseData, raw) {
  const pi = caseData.patientInfo || {}
  const kb = caseData.knowledgeBase || {}
  const existingDisciplines = (caseData.disciplines || []).join('、') || '（无）'
  const rawCtx = buildRawContext(raw)
  const clinicalKeyPointsHint = kb.clinicalKeyPoints && kb.clinicalKeyPoints.length > 60
    ? `（已有临床要点可参考，请结合病历进行充实完善：\n${kb.clinicalKeyPoints.slice(0, 500)}）`
    : ''
  return `你是医学教育专家，请基于以下原始病历信息，为一个 MDT 多学科讨论病例补齐专业配置。

【病例基础信息】
病例名称：${caseData.name || '未命名'}
教学阶段：${caseData.teachingPhase || 'R1'}，难度：${caseData.levelLabel || '基础病例'}
核心议题：${caseData.objective || ''}
现有参与学科：${existingDisciplines}

【患者信息】（已从病历提取）
姓名：${pi.name || '佚名'}，${pi.gender || ''}，${pi.age ? pi.age + '岁' : ''}
主诉：${pi.chiefComplaint || ''}
现病史：${(pi.presentIllness || '').slice(0, 500)}
查体：${(pi.physicalExam || '').slice(0, 300)}
辅检：${((pi.labTests || '') + ' ' + (pi.imagingText || '')).trim().slice(0, 500)}
既往史：${pi.pastHistory || ''}

【原始病历上下文】
${rawCtx}

${clinicalKeyPointsHint}

请输出一个 JSON 对象，包含以下字段：
1. "disciplines"：参与 MDT 讨论的学科数组，**至少 3 个学科**（必须包含现有学科，并按疾病需要补充相关学科，如影像科/病理科/临床药学等辅助学科）。
2. "perspectives"：学科观点数组，与 "disciplines" 一一对应，每个元素形如 {"dept": "学科名", "view": "该学科针对本病例的专业意见（80-200字，需结合病历具体内容，不要套话）"}。
3. "clinicalKeyPoints"：本病例临床关键要点（200-400字，含诊断要点/治疗原则/多学科协作重点）。
4. "keyQuestions"：3-4 个关键讨论问题（针对本病例具体病情，不要泛泛）。
5. "decision"：MDT 最终决策（含最终诊断 + 治疗方案/策略，60-150字）。
6. "followUp"：随访计划（30-80字）。
7. "trigger"：会诊触发原因，形如 {"type": "跨科矛盾", "reason": "（描述本病例中存在的学科分歧或处理困难，30-80字）"}。
8. "inviteCandidates"：拟邀请参与会诊的科室数组（3-5 个，包含 disciplines 全部）。
9. "auxiliaryDisciplines"：辅助支持学科数组（如影像科/病理科/临床药学/麻醉科等，2-4 个，不要与 disciplines 重复）。
10. "disagreementPairs"：跨科分歧对数组，1-2 组，每组形如 {"pair": ["科A","科B"], "issue": "分歧焦点问题", "stances": {"科A": "科A立场及理由", "科B": "科B立场及理由"}}。必须基于本病例真实存在的临床矛盾（如术式选择/用药方案/手术时机/适应证权衡等）。
11. "admissionContext"：会诊前住院背景，形如 {"daysHospitalized": 数字, "priorCourse": "入院后诊疗经过（60-150字，依据病历改写）", "priorTherapy": ["前期治疗1", "治疗2"]}。

要求：全部内容必须基于提供的病历信息，专业、具体、有临床细节，不得编造病历中不存在的关键事实。只输出 JSON 对象，不要输出其他任何内容。`
}

// ── v3 流程模板重建 ──
function rebuildV3Flow(caseData) {
  const perspectives = caseData.knowledgeBase?.disciplinePerspectives || []
  const disciplines = caseData.disciplines && caseData.disciplines.length
    ? caseData.disciplines
    : perspectives.map(p => p.dept).filter(Boolean)
  const stages = ['病例汇报', '专科意见', '主诊医师意见', '自由讨论', '拍板决策', '反思']
  const name = caseData.name || '本病例'
  const srcId = caseData.sourceRecordId || ''

  const agenda = [
    {
      phase: 0, speaker: 'host',
      text: `各位专家，今天讨论「${name}」病例${srcId ? `（病历号 ${srcId}）` : ''}。核心议题：${caseData.objective || ''}。请先由主诊医师进行病例汇报。`,
    },
    {
      phase: 1, speaker: 'host',
      text: '病例汇报完毕。下面请各专科依次就本病例发表意见。',
    },
    ...disciplines.map(d => ({
      phase: 1, speaker: d,
      text: (perspectives.find(p => p.dept === d)?.view) || `${d}专家：基于本科室角度，就本病例的诊治发表意见。`,
    })),
    {
      phase: 2, speaker: 'host',
      text: '各专科意见已发表完毕。请主诊医师结合各专科意见，发表你作为主诊医师的综合看法。',
      nextTask: 'attendingView01',
    },
    {
      phase: 3, speaker: 'host',
      text: '现在进入自由讨论环节，各科室可围绕分歧点互相交换意见，你也可以随时提问、补充或质疑。',
    },
    {
      phase: 4, speaker: 'host',
      text: '综合各位意见，我们进入决策环节。请以主诊医师身份，独立给出本次 MDT 的最终诊断与治疗方案。',
      nextTask: 'plan01',
    },
    {
      phase: 5, speaker: 'host',
      text: '本次讨论已接近尾声，请写下你的反思总结。',
      nextTask: 'reflect01',
    },
  ]

  const tasks = [
    {
      key: 'plan01', type: 'text', label: '诊疗方案制定', assess: 'plan',
      prompt: '独立制定完整的诊疗方案（治疗/监测/随访）', rows: 5,
      placeholder: '1. 治疗方案\n2. 监测与复查\n3. 随访计划',
      feedback: { hits: [], misses: [] },
    },
    {
      key: 'reflect01', type: 'text', label: '反思总结', assess: '',
      prompt: '写下本次讨论的收获、认知改变与遗留困惑', rows: 4,
      placeholder: '1. 学到了什么\n2. 哪些认知被改变\n3. 遗留困惑',
      feedback: { hits: [], misses: [] },
    },
  ]

  return { stages, agenda, tasks }
}

// ── merge 写回 ──
function applyGenerated(caseData, gen) {
  const kb = caseData.knowledgeBase || {}
  // disciplines 与 perspectives 对齐
  const disciplines = (gen.disciplines || []).filter(Boolean)
  const perspectives = (gen.perspectives || []).filter(p => p && p.dept)
  // 现有学科观点（可能已有 expertName 等）保留，按 dept 合并 view
  const existing = {}
  for (const p of kb.disciplinePerspectives || []) {
    if (p?.dept) existing[p.dept] = p
  }
  const mergedPerspectives = perspectives.map(p => ({
    ...(existing[p.dept] || { dept: p.dept, view: '', expertName: '', expertTitle: '', persona: '', expertKB: '' }),
    dept: p.dept,
    view: p.view || existing[p.dept]?.view || '',
  }))
  // 若某些 disciplines 无 perspectives，补空
  for (const d of disciplines) {
    if (!mergedPerspectives.some(p => p.dept === d)) {
      mergedPerspectives.push({
        dept: d, view: `${d}专家：结合本科室专业视角，就该病例的诊疗策略发表意见。`,
        expertName: '', expertTitle: '', persona: '', expertKB: '',
      })
    }
  }
  caseData.disciplines = disciplines
  caseData.keyQuestions = (gen.keyQuestions || []).filter(Boolean)
  caseData.decision = gen.decision || caseData.decision
  caseData.followUp = gen.followUp || caseData.followUp
  caseData.trigger = { type: '跨科矛盾', reason: gen.trigger?.reason || '' }
  caseData.inviteCandidates = (gen.inviteCandidates || []).filter(Boolean)
  caseData.auxiliaryDisciplines = (gen.auxiliaryDisciplines || []).filter(Boolean)
  caseData.disagreementPairs = (gen.disagreementPairs || []).filter(p => p && p.pair?.length >= 2)
  caseData.admissionContext = {
    daysHospitalized: Number(gen.admissionContext?.daysHospitalized) || 1,
    priorCourse: gen.admissionContext?.priorCourse || '',
    priorTherapy: (gen.admissionContext?.priorTherapy || []).filter(Boolean),
  }
  kb.disciplinePerspectives = mergedPerspectives
  kb.clinicalKeyPoints = gen.clinicalKeyPoints || kb.clinicalKeyPoints
  if (!Array.isArray(kb.references)) kb.references = []
  caseData.knowledgeBase = kb

  const flow = rebuildV3Flow(caseData)
  caseData.stages = flow.stages
  caseData.agenda = flow.agenda
  caseData.tasks = flow.tasks
  return caseData
}

// ── CHECK 模式 ──
function runCheck() {
  const files = fs.readdirSync(CASES_DIR).filter(f => f.endsWith('-mdt.json'))
  let ok = 0
  const issues = []
  for (const fn of files) {
    const data = JSON.parse(fs.readFileSync(path.join(CASES_DIR, fn), 'utf8'))
    if (data.sourceType !== 'raw') continue
    const label = fn.replace('-mdt.json', '')
    const problems = []
    const pers = data.knowledgeBase?.disciplinePerspectives || []
    const realViews = pers.filter(p => p?.view && !p.view.includes('待完善') && p.view.length > 30)
    if (realViews.length !== pers.length) problems.push(`view 占位符 ${pers.length - realViews.length} 个`)
    if ((data.disciplines || []).length < 3) problems.push(`disciplines <3 (${data.disciplines?.length})`)
    if (!data.trigger?.reason) problems.push('trigger.reason 空')
    if (!(data.inviteCandidates || []).length) problems.push('inviteCandidates 空')
    if (!(data.disagreementPairs || []).length) problems.push('disagreementPairs 空')
    if (!data.admissionContext?.priorCourse) problems.push('admissionContext.priorCourse 空')
    if (!Array.isArray(data.stages) || !data.stages.includes('拍板决策')) problems.push('stages 非 v3')
    if (!(data.tasks || []).some(t => t.key === 'plan01')) problems.push('缺 plan01 任务')
    if (problems.length) issues.push(`${label}: ${problems.join('；')}`)
    else ok++
  }
  console.log(`[check] raw 病例 ${ok}/${files.filter(f => JSON.parse(fs.readFileSync(path.join(CASES_DIR, f), 'utf8')).sourceType === 'raw').length} 已补齐 ✓`)
  if (issues.length) {
    console.log('问题：\n  ' + issues.join('\n  '))
    process.exit(1)
  }
}

// ── 主流程 ──
async function main() {
  if (CHECK) { runCheck(); return }
  if (!API_URL || !API_KEY) {
    console.error('[complete] 缺少 LLM_API_URL / LLM_API_KEY（读取 apps/training/.env.local 或用 --key/--url 传入）')
    process.exit(1)
  }

  const files = fs.readdirSync(CASES_DIR).filter(f => f.endsWith('-mdt.json'))
  const targets = []
  for (const fn of files) {
    const file = path.join(CASES_DIR, fn)
    const data = JSON.parse(fs.readFileSync(file, 'utf8'))
    if (data.sourceType !== 'raw') continue
    const id = fn.replace('-mdt.json', '')
    if (ONLY && data.id !== ONLY && id !== ONLY) continue
    const pers = data.knowledgeBase?.disciplinePerspectives || []
    const alreadyComplete = pers.length && pers.every(p => p?.view && !p.view.includes('待完善') && p.view.length > 30)
    if (alreadyComplete && !FORCE) continue
    targets.push({ file, data, label: id })
  }
  if (!targets.length) { console.log('[complete] 无待补齐项（已有真实 view，--force 可重写）'); return }
  console.log(`[complete] 待补齐 ${targets.length} 个病例（并发 ${Math.min(PARALLEL, targets.length)}）…`)

  let fi = 0
  let ok = 0, fail = 0
  const worker = async () => {
    while (fi < targets.length) {
      const t = targets[fi++]
      const srcId = t.data.sourceRecordId
      let raw = null
      if (srcId) {
        const rawFile = path.join(RAW_DIR, `${srcId}.json`)
        if (fs.existsSync(rawFile)) raw = JSON.parse(fs.readFileSync(rawFile, 'utf8'))
      }
      const prompt = buildPrompt(t.data, raw)
      try {
        const gen = await generateJSON(prompt)
        applyGenerated(t.data, gen)
        fs.writeFileSync(t.file, JSON.stringify(t.data, null, 2) + '\n')
        ok++
        console.log(`[OK] ${t.label} (${t.data.disciplines?.join('/')})`)
      } catch (e) {
        fail++
        console.warn(`[FAIL] ${t.label}: ${e.message}`)
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(PARALLEL, targets.length) }, worker))
  console.log(`[complete] 完成：成功 ${ok}，失败 ${fail}，共 ${targets.length}`)
  if (fail && ok === 0) process.exit(1)
}

main()
