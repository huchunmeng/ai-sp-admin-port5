// MDT 阶段3 — 批量生成专家知识库
// 为 apps/admin/public/data/mdt-cases/*-mdt.json 的每个学科专家生成
// expertName/expertTitle/persona/expertKB（独立知识库），写回 JSON（保留 dept/view）。
// 用法：
//   node scripts/gen-mdt-experts.mjs                 # 生成（幂等，已有 expertKB 跳过）
//   node scripts/gen-mdt-experts.mjs --force         # 强制重写
//   node scripts/gen-mdt-experts.mjs --only <caseId> # 只处理单个病例
//   node scripts/gen-mdt-experts.mjs --parallel 2    # 并发池大小（默认 2）
//   node scripts/gen-mdt-experts.mjs --check         # dry-run：校验 18 专家字段齐备
//   node scripts/gen-mdt-experts.mjs --key/--url/--model # 覆盖 LLM 配置
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { repairJSON } from '../services/ai-generator/src/llm-client.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const CASES_DIR = path.join(ROOT, 'apps/admin/public/data/mdt-cases')
const ENV_FILE = path.join(ROOT, 'apps/training/.env.local')

// ── CLI 解析 ──
const args = process.argv.slice(2)
const getFlag = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null }
const FORCE = args.includes('--force')
const CHECK = args.includes('--check')
const ONLY = getFlag('--only')
const PARALLEL = Math.max(1, parseInt(getFlag('--parallel') || '2', 10))

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
const API_URL = getFlag('--url') || process.env.LLM_API_URL || env.LLM_API_URL
const API_KEY = getFlag('--key') || process.env.LLM_API_KEY || env.LLM_API_KEY
const MODEL = getFlag('--model') || process.env.LLM_MODEL || env.LLM_MODEL || 'qwen-turbo'

// ── LLM 调用（OpenAI 兼容，带 repairJSON + 重试）──
async function callLLMOnce(prompt) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 90000)
  try {
    const resp = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: '你是一名资深临床医学教育专家。请严格按照要求输出JSON，不要包含任何解释性文字或Markdown标记。' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 4096,
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

async function generateExpert(prompt) {
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

// ── Prompt 构建 ──
function buildExpertPrompt(caseData, perspective, others, usedNames = []) {
  const pi = caseData.patientInfo || {}
  const kb = caseData.knowledgeBase || {}
  const summary = [
    `病例：${pi.name || '患者'}${pi.gender ? '，' + pi.gender : ''}${pi.age ? '，' + pi.age + '岁' : ''}`,
    `主诉：${pi.chiefComplaint || ''}`,
    `现病史：${(pi.presentIllness || '').substring(0, 200)}`,
    `查体：${(pi.physicalExam || '').substring(0, 150)}`,
    `辅检：${((pi.labTests || '') + ' ' + (pi.imagingText || '')).trim().substring(0, 250)}`,
    `核心议题：${caseData.objective || ''}`,
    `关键问题：${(caseData.keyQuestions || []).join('；')}`,
    `临床关键要点：${(kb.clinicalKeyPoints || '').substring(0, 300)}`,
    `本学科观点：${perspective.view || ''}`,
  ].filter(Boolean).join('\n')
  const othersText = others.length
    ? '其他学科观点（供你设计分歧与回应）：\n' + others.map(o => `【${o.dept}】${o.view}`).join('\n')
    : ''
  const nameHint = usedNames.length
    ? `\n同病例其他学科专家已使用的姓名：${usedNames.join('、')}。你的 expertName 请勿与以上姓名重复，也请尽量与它们风格不同。`
    : ''
  return `你是该病例 MDT 会议中【${perspective.dept}】学科的医学专家。请基于以下病例信息，为你的专家形象设计配置。

${summary}

${othersText}

请输出一个 JSON 对象，包含 4 个字段：
1. "expertName"：一位真实可信的该学科专家中文全名${nameHint}
2. "expertTitle"：专家头衔，格式「医院科室 · 职称」（虚构，如「心血管内科 · 主任医师」）
3. "persona"：人设与发言风格（10-30字，如「严谨务实，重视循证依据，发言简洁有力」）
4. "expertKB"：该学科针对本病例的独立知识库（600-1200字）。内容需包括：该疾病与该学科相关的循证依据/指南要点、诊断与治疗中的关键专业判断、与病例相关的风险权衡、以及你学科立场背后的理由。要求具体、专业、有临床细节，供你在 MDT 讨论中引用作为发言依据。

只输出 JSON 对象，不要输出其他任何内容。`
}

// ── CHECK 模式 ──
function runCheck() {
  const files = fs.readdirSync(CASES_DIR).filter(f => f.endsWith('-mdt.json'))
  let total = 0
  const missing = []
  for (const fn of files) {
    const data = JSON.parse(fs.readFileSync(path.join(CASES_DIR, fn), 'utf8'))
    for (const p of data.knowledgeBase?.disciplinePerspectives || []) {
      if (!p?.dept) continue
      total++
      if (!p.expertKB) missing.push(`${fn.replace('-mdt.json', '')} ${p.dept}`)
    }
  }
  console.log(`[check] 专家总数 ${total}，缺 expertKB ${missing.length}`)
  if (missing.length) {
    console.log('缺失：\n  ' + missing.join('\n  '))
    process.exit(1)
  }
  console.log('[check] 全部专家已生成 ✓')
}

// ── 主流程 ──
async function main() {
  if (CHECK) { runCheck(); return }
  if (!API_URL || !API_KEY) {
    console.error('[gen] 缺少 LLM_API_URL / LLM_API_KEY（读取 apps/training/.env.local 或用 --key/--url 传入）')
    process.exit(1)
  }

  const files = fs.readdirSync(CASES_DIR).filter(f => f.endsWith('-mdt.json'))
  const targets = []
  for (const fn of files) {
    const file = path.join(CASES_DIR, fn)
    const data = JSON.parse(fs.readFileSync(file, 'utf8'))
    if (ONLY && data.caseId !== ONLY && fn.replace('-mdt.json', '') !== ONLY) continue
    const pers = data.knowledgeBase?.disciplinePerspectives || []
    for (let i = 0; i < pers.length; i++) {
      const p = pers[i]
      if (!p?.dept) continue
      if (p.expertKB && !FORCE) continue
      targets.push({ file, data, i, dept: p.dept, label: fn.replace('-mdt.json', '') })
    }
  }
  if (!targets.length) { console.log('[gen] 无待生成项（已有 expertKB，--force 可重写）'); return }
  console.log(`[gen] 待生成 ${targets.length} 个专家（并发 ${Math.min(PARALLEL, targets.length)}）…`)

  // 按病例分组；组内学科串行（传递已用姓名避免重名），组间并行
  const byFile = new Map()
  for (const t of targets) {
    if (!byFile.has(t.file)) byFile.set(t.file, [])
    byFile.get(t.file).push(t)
  }
  const fileList = [...byFile.keys()]
  let fi = 0
  let ok = 0, fail = 0
  const worker = async () => {
    while (fi < fileList.length) {
      const file = fileList[fi++]
      const group = byFile.get(file)
      const usedNames = []
      for (const t of group) {
        const others = (t.data.knowledgeBase?.disciplinePerspectives || []).filter(o => o.dept !== t.dept)
        const prompt = buildExpertPrompt(t.data, t.data.knowledgeBase.disciplinePerspectives[t.i], others, usedNames)
        try {
          const gen = await generateExpert(prompt)
          const p = t.data.knowledgeBase.disciplinePerspectives[t.i]
          p.expertName = gen.expertName || p.expertName
          p.expertTitle = gen.expertTitle || p.expertTitle
          p.persona = gen.persona || p.persona
          p.expertKB = gen.expertKB || p.expertKB
          if (gen.expertName) usedNames.push(gen.expertName)
          ok++
          console.log(`[OK] ${t.label} ${t.dept}`)
        } catch (e) {
          fail++
          console.warn(`[FAIL] ${t.label} ${t.dept}: ${e.message}`)
        }
      }
      fs.writeFileSync(file, JSON.stringify(group[0].data, null, 2) + '\n')
    }
  }
  await Promise.all(Array.from({ length: Math.min(PARALLEL, fileList.length) }, worker))
  console.log(`[gen] 完成：成功 ${ok}，失败 ${fail}，共 ${targets.length}`)
  if (fail && ok === 0) process.exit(1)
}

main()
