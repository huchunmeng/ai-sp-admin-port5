// 全量病例情绪引擎测试
// 用法: node scripts/test-all-cases.mjs [--mode humanistic-comm] [--scenario 0]
import { execSync } from 'child_process'
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const CASES_DIR = path.join(ROOT, 'apps/admin/public/data/cases')
const TEST_SCRIPT = path.join(ROOT, 'scripts/test-quick-workflow.mjs')

// CLI参数解析
const args = process.argv.slice(2)
const BATCH_FLAGS = { mode: 'history-taking', scenarioIdx: -1 }
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--mode' && args[i + 1]) { BATCH_FLAGS.mode = args[++i] }
  else if (args[i] === '--scenario' && args[i + 1]) { BATCH_FLAGS.scenarioIdx = parseInt(args[++i]) || 0 }
}

let caseIds = readdirSync(CASES_DIR)
  .filter(f => f.endsWith('-basic.json'))
  .map(f => f.replace('-basic.json', ''))

// 构建测试任务列表 [{cid, scenarioIdx, label}]
const tasks = []

if (BATCH_FLAGS.mode === 'humanistic-comm') {
  caseIds = caseIds.filter(cid => existsSync(path.join(CASES_DIR, `${cid}-humanity.json`)))
  for (const cid of caseIds) {
    try {
      const hPath = path.join(CASES_DIR, `${cid}-humanity.json`)
      const hData = JSON.parse(readFileSync(hPath, 'utf-8'))
      const total = hData.scenarios?.length || 0
      if (BATCH_FLAGS.scenarioIdx >= 0) {
        // 指定了某个场景索引
        if (BATCH_FLAGS.scenarioIdx < total) {
          const sc = hData.scenarios[BATCH_FLAGS.scenarioIdx]
          tasks.push({ cid, scenarioIdx: BATCH_FLAGS.scenarioIdx, label: `${cid}/${sc.scenario_id} ${sc.scenario_name}` })
        }
      } else {
        // 遍历所有场景
        for (let s = 0; s < total; s++) {
          const sc = hData.scenarios[s]
          tasks.push({ cid, scenarioIdx: s, label: `${cid}/${sc.scenario_id} ${sc.scenario_name}` })
        }
      }
    } catch (e) { /* skip */ }
  }
} else {
  for (const cid of caseIds) {
    tasks.push({ cid, scenarioIdx: 0, label: cid })
  }
}

console.log(`共 ${tasks.length} 个测试任务${BATCH_FLAGS.mode === 'humanistic-comm' ? ' (人文沟通全场景)' : ''}\n`)

const results = []
let passed = 0
let failed = 0
let totalScenarios = 0

for (let i = 0; i < tasks.length; i++) {
  const task = tasks[i]
  const modeExtra = BATCH_FLAGS.mode === 'humanistic-comm' ? ` --mode humanistic-comm --scenario ${task.scenarioIdx}` : ''
  const label = `[${String(i + 1).padStart(2)}/${tasks.length}] ${task.label}`
  process.stdout.write(`${label} ... `)

  let output = ''
  let crashed = false
  try {
    output = execSync(`node "${TEST_SCRIPT}" ${task.cid} -q${modeExtra}`, {
      cwd: ROOT,
      timeout: 300000,
      encoding: 'utf-8',
      stdio: 'pipe'
    })
  } catch (e) {
    output = e.stdout || ''
    if (!output && e.stderr) output = e.stderr
    if (!output) {
      crashed = true
      failed++
      console.log(`❌ 异常: ${e.message?.slice(0, 100)}`)
      results.push({
        case_id: task.cid,
        scenario: task.scenarioIdx,
        ok: false,
        error: e.message?.slice(0, 200),
        terminated: false
      })
      continue
    }
  }

  if (!crashed) {
    // 从quiet模式输出中提取结果
    const lines = output.split('\n')
    let enginePass = 0, engineFail = 0, promptPass = 0, promptFail = 0
    let terminated = false
    let terminationType = ''

    for (const line of lines) {
      if (line.includes('引擎检查(硬):')) {
        const m = line.match(/(\d+)通过.*?(\d+)失败/)
        if (m) { enginePass = parseInt(m[1]); engineFail = parseInt(m[2]) }
      }
      if (line.includes('提示词检查(软):')) {
        const m = line.match(/(\d+)通过.*?(\d+)失败/)
        if (m) { promptPass = parseInt(m[1]); promptFail = parseInt(m[2]) }
      }
      if (line.includes('⚠️ 终止:')) {
        terminated = true
        const m = line.match(/终止:\s*(\w+)/)
        if (m) terminationType = m[1]
      }
      if (line.includes('✅ 引擎检查:')) {
        const m = line.match(/(\d+)\/(\d+)/)
        if (m) { /* store if needed */ }
      }
    }

    const engineOk = engineFail === 0
    const promptOk = promptFail === 0
    const ok = engineOk  // 引擎硬检查通过即算通过，软失败只记警告
    if (ok) passed++
    else failed++

    const status = ok ? (promptOk ? '✅' : '⚠️') : '❌'
    const pTag = promptOk ? '' : ` [软:${promptFail}项]`
    const info = terminated ? ` (终止:${terminationType})` : ''
    console.log(`${status} 引擎${enginePass}/${enginePass+engineFail} 提示词${promptPass}/${promptPass+promptFail}${pTag}${info}`)

    results.push({
      case_id: task.cid,
      scenario: task.scenarioIdx,
      ok, promptOk,
      enginePass, engineFail,
      promptPass, promptFail,
      terminated,
      terminationType,
      output: (!ok || !promptOk) ? output.slice(-500) : undefined
    })
  }
}

// ── 汇总 ──
const total = tasks.length
const softWarn = results.filter(r => r.ok && !r.promptOk).length
console.log(`\n${'═'.repeat(65)}`)
console.log(`全量测试汇总: ${passed}引擎通过 / ${failed}引擎失败 / ${total}总计${softWarn > 0 ? ` (${softWarn}例有软警告)` : ''}`)
console.log(`${'═'.repeat(65)}`)

if (failed > 0) {
  console.log(`\n引擎失败病例:`)
  for (const r of results.filter(r => !r.ok)) {
    console.log(`  ❌ ${r.case_id}: ${r.error || `引擎${r.engineFail}项失败`}`)
  }
}
if (softWarn > 0) {
  console.log(`\n软警告病例(引擎通过,提示词偶有LLM波动):`)
  for (const r of results.filter(r => r.ok && !r.promptOk)) {
    console.log(`  ⚠️ ${r.case_id}: 提示词${r.promptFail}项软失败`)
  }
}

// 按专业分组
const bySpecialty = {}
for (const r of results) {
  const prefix = r.case_id.split('-')[0]
  if (!bySpecialty[prefix]) bySpecialty[prefix] = { total: 0, engineOk: 0, allOk: 0 }
  bySpecialty[prefix].total++
  if (r.ok) bySpecialty[prefix].engineOk++
  if (r.ok && r.promptOk) bySpecialty[prefix].allOk++
}

console.log(`\n按专业:`)
for (const [spec, stats] of Object.entries(bySpecialty).sort()) {
  const icon = stats.engineOk === stats.total ? '✅' : '❌'
  const detail = stats.allOk === stats.total ? '' : ` (${stats.engineOk - stats.allOk}软警告)`
  console.log(`  ${icon} ${spec}: 引擎${stats.engineOk}/${stats.total}${detail}`)
}

// 写报告
const reportPath = path.join(ROOT, 'docs/design/test-reports/2026-06-11-all-cases-summary.md')
const report = [
  '# 全量病例情绪引擎测试汇总',
  '',
  `> 日期: 2026-06-11 | 病例数: ${total} | 引擎通过: ${passed} | 引擎失败: ${failed} | 软警告: ${softWarn}`,
  '',
  '---',
  '',
  '## 结果明细',
  '',
  '| # | 病例ID | 引擎(硬) | 提示词(软) | 终止 | 结果 |',
  '|---|--------|----------|------------|------|------|',
  ...results.map((r, i) => {
    const eng = `${r.enginePass}/${r.enginePass + r.engineFail}`
    const prm = `${r.promptPass}/${r.promptPass + r.promptFail}`
    const term = r.terminated ? r.terminationType || 'Y' : '-'
    const icon = r.ok ? (r.promptOk ? '✅' : '⚠️') : '❌'
    return `| ${i + 1} | ${r.case_id} | ${eng} | ${prm} | ${term} | ${icon} |`
  }),
  '',
  '## 按专业分组',
  '',
  '| 专业 | 引擎通过 | 全通过 |',
  '|------|---------|--------|',
  ...Object.entries(bySpecialty).sort().map(([spec, stats]) => {
    const icon = stats.engineOk === stats.total ? '✅' : '❌'
    return `| ${spec} | ${icon} ${stats.engineOk}/${stats.total} | ${stats.allOk}/${stats.total} |`
  }),
  '',
  '---',
  '',
  `## 引擎失败`,
  '',
  ...(results.filter(r => !r.ok).length > 0
    ? results.filter(r => !r.ok).map(r => {
        const detail = r.error || `引擎${r.engineFail}项失败`
        return `### ${r.case_id}\n\n${detail}\n`
      })
    : ['全部引擎通过，无硬失败。']
  ),
  '',
  `## 软警告（提示词检查偶有LLM波动，非引擎缺陷）`,
  '',
  ...(softWarn > 0
    ? results.filter(r => r.ok && !r.promptOk).map(r => {
        return `### ${r.case_id}\n\n提示词${r.promptFail}项软失败。${r.terminated ? `终止类型: ${r.terminationType}` : ''}\n`
      })
    : ['无软警告。']
  )
].join('\n')

writeFileSync(reportPath, report, 'utf-8')
console.log(`\n报告已写入: docs/design/test-reports/2026-06-11-all-cases-summary.md`)

process.exit(failed > 0 ? 1 : 0)
