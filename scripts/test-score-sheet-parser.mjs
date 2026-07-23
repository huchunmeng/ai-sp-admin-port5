// 评分表解析器验证测试
// 用法: node scripts/test-score-sheet-parser.mjs [CASE_ID] [--llm] [--verbose]

import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

const args = process.argv.slice(2)
let CASE_ID = 'IM-20260527-A9GW'
let useLLM = false
let verbose = false
for (const arg of args) {
  if (arg === '--llm') useLLM = true
  else if (arg === '--verbose' || arg === '-v') verbose = true
  else CASE_ID = arg
}

// ── 加载环境变量 ──
function loadEnv() {
  const envFile = resolve(ROOT, 'apps/training/.env.local')
  if (existsSync(envFile)) {
    const content = readFileSync(envFile, 'utf-8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue
      const idx = trimmed.indexOf('=')
      const key = trimmed.substring(0, idx).trim()
      const val = trimmed.substring(idx + 1).trim()
      if (!process.env[key]) process.env[key] = val
    }
  }
}

// ── 加载病例 ──
function loadCase(caseId) {
  const casesDir = resolve(ROOT, 'apps/admin/public/data/cases')
  const basicFile = resolve(casesDir, `${caseId}-basic.json`)
  if (!existsSync(basicFile)) throw new Error(`病例 ${caseId} 不存在`)
  return JSON.parse(readFileSync(basicFile, 'utf-8'))
}

// ── 获取模板扁平条目 ──
async function getTemplateItems(code) {
  const scoreTablesUrl = pathToFileURL(resolve(ROOT, 'packages/shared/data/score-tables/index.js')).href
  const { getTemplateFlatItems } = await import(scoreTablesUrl)
  return { items: getTemplateFlatItems(code), source: code }
}

// ── 打印结果 ──
function printResult(items, label) {
  console.log(`\n${'═'.repeat(60)}`)
  console.log(`  ${label}`)
  console.log(`${'═'.repeat(60)}`)

  let anchoredCount = 0, fixedCount = 0
  for (const item of items) {
    const subCount = item.sub_items?.length || 0
    if (subCount <= 1 && item.sub_items?.[0]?.point === item.item) {
      // 未展开
    } else if (subCount > 0) {
      anchoredCount++
    }

    console.log(`\n▸ [${item.category}] ${item.item} (${item.score}分)`)
    if (item.sub_items && item.sub_items.length > 0) {
      for (const sub of item.sub_items) {
        const pad = ' '.repeat(2)
        console.log(`${pad}├ ${sub.point}`)
        console.log(`${pad}│ ${sub.score}分 — ${sub.rules || ''}`)
      }
    } else {
      console.log(`  (无子项)`)
    }
  }

  // 统计
  const totalSubItems = items.reduce((s, it) => s + (it.sub_items?.length || 0), 0)
  const totalScore = items.reduce((s, it) => s + (it.score || 0), 0)
  const subTotalScore = items.reduce((s, it) =>
    s + (it.sub_items || []).reduce((ss, si) => ss + (si.score || 0), 0), 0
  )

  console.log(`\n${'─'.repeat(60)}`)
  console.log(`条目总数: ${items.length} | 子项总数: ${totalSubItems} | 总分: ${totalScore} | 子项分和: ${subTotalScore.toFixed(1)}`)
}

// ── 主流程 ──
async function main() {
  console.log(`评分表解析器测试 | 病例: ${CASE_ID} | 模式: ${useLLM ? 'LLM增强' : '纯函数'}\n`)

  // 1. 加载数据
  console.log('1. 加载病例数据...')
  const basic = loadCase(CASE_ID)
  const pi = basic.patient_info || {}
  console.log(`   标题: ${basic.title || basic.disease || '?'}`)
  console.log(`   主诉: ${basic.chief_complaint || '未记录'}`)
  console.log(`   患者: ${pi.name || '?'} ${pi.age || '?'} ${pi.sex === '0' || pi.sex === '女' ? '女' : '男'}`)

  const templateCode = basic.score_sheet_template || 'TPL-STD'
  console.log(`   评分表模板: ${templateCode}`)

  // 2. 获取模板条目
  console.log(`\n2. 加载模板条目 (${templateCode})...`)
  const tpl = await getTemplateItems(templateCode)
  console.log(`   模板条目数: ${tpl.items.length}`)

  // 3. 解析
  console.log('\n3. 执行解析...')
  const parserUrl = pathToFileURL(resolve(ROOT, 'packages/shared/src/score-sheet-parser.js')).href
  const { parseScoreSheet } = await import(parserUrl)

  let result
  if (useLLM) {
    loadEnv()
    const llmConfig = {
      apiUrl: process.env.LLM_API_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
      apiKey: process.env.LLM_API_KEY,
      model: process.env.LLM_MODEL || 'qwen-turbo'
    }
    if (!llmConfig.apiKey || llmConfig.apiKey === 'your-api-key-here') {
      console.error('\n❌ 未配置 LLM_API_KEY，回退到纯函数模式')
      result = parseScoreSheet({ basicData: basic, templateItems: tpl.items })
    } else {
      console.log(`   LLM model: ${llmConfig.model}`)
      const startTime = Date.now()
      result = await parseScoreSheet({ basicData: basic, templateItems: tpl.items, llmConfig })
      console.log(`   耗时: ${((Date.now() - startTime) / 1000).toFixed(1)}s`)
    }
  } else {
    result = parseScoreSheet({ basicData: basic, templateItems: tpl.items })
  }

  // 4. 输出
  printResult(result, `${templateCode} → 解析结果`)

  // 5. 简要对比
  const anchoredItems = result.filter(it =>
    it.sub_items?.length > 0 &&
    !(it.sub_items.length === 1 && it.sub_items[0].point === it.item)
  )
  console.log(`\n病例锚定项: ${anchoredItems.length}/${result.length}`)
  if (anchoredItems.length > 0) {
    console.log('锚定的条目:')
    for (const it of anchoredItems) {
      console.log(`  - [${it.category}] ${it.item} → ${it.sub_items.length}子项`)
    }
  }

  console.log('\n✅ 测试完成')
}

main().catch(e => {
  console.error('\n❌ 测试失败:', e.message)
  console.error(e.stack)
  process.exit(1)
})
