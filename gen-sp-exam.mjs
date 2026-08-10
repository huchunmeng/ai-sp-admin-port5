// ═══════════════════════════════════════════════════════════════
// 生成脚本②：真实 /api/sp/exam 跑体格检查（IM-20260801-PCH）
// 用 buildExamTemplatesFromCase 生成模板 + 11 个查体命令
// 输出：data/gen/physicalExam.json
// ═══════════════════════════════════════════════════════════════
import fs from 'node:fs'
import path from 'node:path'
import { buildExamTemplatesFromCase } from './apps/training/src/composables/useExamTemplates.js'

const API = 'http://localhost:5100/api/sp'
const CASE_ID = 'IM-20260801-PCH'
const OUT = path.resolve('data/gen/physicalExam.json')
const sleep = ms => new Promise(r => setTimeout(r, ms))

// 14 个查体命令，覆盖 FLOW-PHYSICAL 全部评分维度（准备/告知/视触叩听/系统/重点/隐私/沟通/整理）
const COMMANDS = [
  { cmd: '检查前准备：洗手、戴口罩，准备听诊器、血压计、叩诊锤、手电筒', label: '物品与器械准备' },
  { cmd: '向患者解释即将进行的体格检查项目与目的，取得患者配合', label: '患者准备与告知' },
  { cmd: '测量生命体征：体温、脉搏、呼吸、血压', label: '生命体征' },
  { cmd: '视诊：观察患者面容、体态、发育、营养、意识状态', label: '视诊' },
  { cmd: '检查巩膜有无黄染', label: '巩膜黄染' },
  { cmd: '检查有无肝掌、蜘蛛痣', label: '肝掌蜘蛛痣' },
  { cmd: '腹部视诊：观察腹壁静脉、胃肠型、腹部外形', label: '腹部视诊' },
  { cmd: '腹部触诊：检查全腹压痛、反跳痛、肝脾肋下触及情况', label: '腹部触诊' },
  { cmd: '腹部叩诊：检查移动性浊音、肝肾区叩击痛', label: '腹部叩诊' },
  { cmd: '听诊双肺呼吸音，重点排除湿啰音', label: '听诊双肺' },
  { cmd: '心脏听诊：评估心率、心律、各瓣膜区杂音', label: '心脏听诊' },
  { cmd: '检查下肢有无水肿', label: '下肢水肿' },
  { cmd: '拉好床帘保护患者隐私，检查过程中与患者沟通、安抚其情绪', label: '隐私与沟通' },
  { cmd: '检查结束，帮助患者整理衣物，告知检查结果与下一步安排', label: '检查后整理告知' },
]

async function post(url, body) {
  const resp = await fetch(API + url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!resp.ok) {
    const txt = await resp.text().catch(() => '')
    throw new Error(`${url} ${resp.status}: ${txt.slice(0, 300)}`)
  }
  return resp.json()
}

function parseResult(raw) {
  // /api/sp/exam 返回 { ok, result }，result 是 JSON 字符串
  let obj
  if (typeof raw === 'string') {
    try { obj = JSON.parse(raw) } catch {
      return { results: [], unmatched: [raw], note: '' }
    }
  } else if (raw && typeof raw === 'object') {
    if (raw.result && typeof raw.result === 'string') {
      try { obj = JSON.parse(raw.result) } catch { obj = raw }
    } else {
      obj = raw
    }
  } else {
    return { results: [], unmatched: [], note: '' }
  }
  return obj || { results: [], unmatched: [], note: '' }
}

async function main() {
  fs.mkdirSync(path.dirname(OUT), { recursive: true })
  const basic = JSON.parse(fs.readFileSync('apps/admin/public/data/cases/IM-20260801-PCH-basic.json', 'utf8'))
  const reception = JSON.parse(fs.readFileSync('apps/admin/public/data/cases/IM-20260801-PCH-reception.json', 'utf8'))
  const meta = JSON.parse(fs.readFileSync('apps/admin/public/data/cases/IM-20260801-PCH-meta.json', 'utf8'))

  const templates = buildExamTemplatesFromCase({ basic, reception, meta })
  console.log('模板分类数:', templates.length, '| 总项目数:', templates.reduce((s, g) => s + (g.items?.length || 0), 0))

  const messages = []
  const t0 = Date.now()
  let unmatchedCount = 0

  for (let i = 0; i < COMMANDS.length; i++) {
    const { cmd, label } = COMMANDS[i]
    const qTime = Date.now()
    let reply
    try {
      reply = await post('/exam', { command: cmd, templates })
    } catch (e) {
      console.error(`✗ [${i + 1}/${COMMANDS.length}] ${label} 失败:`, e.message)
      throw e
    }
    const parsed = parseResult(reply.result)
    const results = parsed.results || []
    if (!results.length) unmatchedCount++
    // 组装 system 消息：命令 + 所有结果文本
    const resultText = results
      .map(r => `${r.exam}：${r.finding || ''}`.trim())
      .filter(Boolean)
      .join('\n')
    const content = resultText || `检查数据暂无记录。`
    messages.push({ role: 'user', content: cmd, time: qTime })
    messages.push({ role: 'system', content, time: Date.now(), parsed: { results }, marked: false })
    console.log(`✓ [${i + 1}/${COMMANDS.length}] ${label}  → ${results.length} 条结果`)
    if (results[0]?.finding) console.log(`    ↳ ${String(results[0].finding).slice(0, 70)}`)
    await sleep(50)
  }

  const sessionData = {
    caseId: CASE_ID,
    stationId: 'physicalExam',
    stage: 'physical-exam',
    messages,
    notes: '',
    summary: `体格检查完成，共 ${COMMANDS.length} 项。`,
  }
  fs.writeFileSync(OUT, JSON.stringify(sessionData, null, 2), 'utf8')

  console.log('\n════ 完成 ════')
  console.log('消息数:', messages.length, '| 未匹配命令:', unmatchedCount, '| 总耗时:', Math.round((Date.now() - t0) / 100) / 10 + 's')
  console.log('输出:', OUT)
}

main().catch(e => {
  console.error('\n[FATAL]', e)
  process.exit(1)
})
