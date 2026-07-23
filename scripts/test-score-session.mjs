// 评分闭环验证测试
// 用法: node scripts/test-score-session.mjs [CASE_ID] [--verbose]
//
// 模拟完整流程：
//   1. 加载病例 → 2. 获取模板条目 → 3. 解析评分表 → 4. 使用模拟对话调用评分API

import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

const args = process.argv.slice(2)
let CASE_ID = 'IM-20260527-A9GW'
let verbose = false
for (const arg of args) {
  if (arg === '--verbose' || arg === '-v') verbose = true
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

// ── 获取模板条目 ──
async function getTemplateItems(code) {
  const scoreTablesUrl = pathToFileURL(resolve(ROOT, 'packages/shared/data/score-tables/index.js')).href
  const { getTemplateFlatItems } = await import(scoreTablesUrl)
  return { items: getTemplateFlatItems(code), source: code }
}

// ── 模拟对话记录（模拟学员的病史采集对话） ──
function buildMockRecords(basic) {
  const chiefComplaint = basic.chief_complaint || ''
  const disease = basic.title || basic.disease || ''
  const pi = basic.patient_info || {}
  const name = pi.name || '患者'

  return [
    { sequence: 1, speaker: 'doctor', content: `您好，我是今天接诊的李医生。请问您今天来主要是哪里不舒服？` },
    { sequence: 2, speaker: 'patient', content: `医生您好，我最近总觉得心慌，手也抖得厉害，还特别怕热，出汗多。大概有两个月了。` },
    { sequence: 3, speaker: 'doctor', content: `心慌是什么时候开始的？有没有什么诱因？比如活动后加重？` },
    { sequence: 4, speaker: 'patient', content: `两个月前开始，具体诱因记不太清。不过最近一周加班比较多，感觉心慌更厉害了，有时候心跳得特别快。` },
    { sequence: 5, speaker: 'doctor', content: `手抖是什么样子的？两侧都抖吗？有没有影响日常生活？` },
    { sequence: 6, speaker: 'patient', content: `两只手都抖，拿东西的时候尤其明显，端杯子的时候能看到水在晃。` },
    { sequence: 7, speaker: 'doctor', content: `除了心慌和手抖，还有没有其他不舒服？比如体重有变化吗？` },
    { sequence: 8, speaker: 'patient', content: `体重掉了有十来斤，但我也没刻意减肥。另外大便次数也比以前多了，一天两三次，稀的。` },
    { sequence: 9, speaker: 'doctor', content: `睡眠怎么样？情绪上有没有变化？` },
    { sequence: 10, speaker: 'patient', content: `睡眠不太好，容易醒。脾气也比以前暴躁了，一点小事就发火。` },
    { sequence: 11, speaker: 'doctor', content: `以前有过类似情况吗？有没有因为这个问题看过医生？` },
    { sequence: 12, speaker: 'patient', content: `以前没有过。社区医院查过一次，说可能是甲亢，让我去大医院看，我还没来得及去。` },
    { sequence: 13, speaker: 'doctor', content: `有没有高血压、糖尿病这些慢性病？` },
    { sequence: 14, speaker: 'patient', content: `没有，平时身体还行。` },
    { sequence: 15, speaker: 'doctor', content: `家里人有没有甲状腺方面的问题？` },
    { sequence: 16, speaker: 'patient', content: `我妈也有甲亢，很多年了。` },
    { sequence: 17, speaker: 'doctor', content: `对什么药过敏吗？` },
    { sequence: 18, speaker: 'patient', content: `没有药物过敏。` },
    { sequence: 19, speaker: 'doctor', content: `好的，我大概了解您的情况了。根据您的症状——心慌、手抖、怕热多汗、体重下降，加上有甲亢家族史，很可能是甲状腺功能亢进。我接下来给您做一下体格检查。` },
    { sequence: 20, speaker: 'patient', content: `好的医生，谢谢您。` }
  ]
}

// ── 打印评分结果 ──
function printScoreResult(data) {
  const items = data.scored_items || []
  console.log(`\n${'═'.repeat(60)}`)
  console.log(`  评分结果`)
  console.log(`${'═'.repeat(60)}`)

  let totalAwarded = 0, totalMax = 0
  for (const entry of items) {
    console.log(`\n▸ [${entry.category}] ${entry.item}（满分${entry.item_score}分）`)
    for (const sub of (entry.sub_items || [])) {
      const awarded = sub.awarded_score || 0
      const max = sub.max_score || 0
      totalAwarded += awarded
      totalMax += max
      const icon = awarded === max ? '✓' : awarded > 0 ? '◐' : '✗'
      console.log(`  ${icon} ${sub.point}`)
      console.log(`    ${awarded}/${max}分 — ${(sub.evidence || '').substring(0, 80)}`)
      if (sub.related_turns?.length) {
        console.log(`    对话轮次: [${sub.related_turns.join(', ')}]`)
      }
    }
  }

  console.log(`\n${'─'.repeat(60)}`)
  console.log(`总分: ${totalAwarded}/${totalMax} (${(totalAwarded/totalMax*100).toFixed(1)}%)`)
  if (data.pass_fail) console.log(`判定: ${data.pass_fail}`)
  if (data.scoring_narrative) console.log(`评语: ${data.scoring_narrative}`)
}

// ── 主流程 ──
async function main() {
  loadEnv()

  const LLM_API_KEY = process.env.LLM_API_KEY || ''
  const LLM_API_URL = process.env.LLM_API_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'
  const LLM_MODEL = process.env.LLM_MODEL || 'qwen-turbo'

  if (!LLM_API_KEY || LLM_API_KEY === 'your-api-key-here') {
    console.error('❌ 未配置 LLM_API_KEY，请在 apps/training/.env.local 中设置')
    process.exit(1)
  }

  console.log(`评分闭环测试 | 病例: ${CASE_ID} | 模型: ${LLM_MODEL}\n`)

  // 1. 加载数据
  console.log('1. 加载病例数据...')
  const basic = loadCase(CASE_ID)
  const pi = basic.patient_info || {}
  console.log(`   标题: ${basic.title || basic.disease || '?'}`)
  console.log(`   主诉: ${basic.chief_complaint || '未记录'}`)

  const templateCode = basic.score_sheet_template || 'TPL-STD'
  console.log(`   评分表模板: ${templateCode}`)

  // 2. 获取模板条目
  console.log(`\n2. 加载模板条目...`)
  const tpl = await getTemplateItems(templateCode)
  console.log(`   模板条目数: ${tpl.items.length}`)

  // 3. 解析评分表
  console.log('\n3. 解析评分表...')
  const parserUrl = pathToFileURL(resolve(ROOT, 'packages/shared/src/score-sheet-parser.js')).href
  const { parseScoreSheet } = await import(parserUrl)

  const llmConfig = { apiUrl: LLM_API_URL, apiKey: LLM_API_KEY, model: LLM_MODEL }
  const parsedSheet = await parseScoreSheet({
    basicData: basic,
    templateItems: tpl.items,
    llmConfig
  })
  console.log(`   解析后条目: ${parsedSheet.length}, 子项总数: ${parsedSheet.reduce((s, it) => s + (it.sub_items?.length || 0), 0)}`)

  // 4. 评分
  console.log('\n4. 执行 AI 评分...')
  const records = buildMockRecords(basic)
  console.log(`   对话轮次: ${records.length}`)

  const caseInfo = {
    title: basic.title || basic.disease || '',
    disease: basic.disease || '',
    specialty: basic.specialty || '',
    chief_complaint: basic.chief_complaint || '',
    patient_info: { name: pi.name || '', age: pi.age || '', sex: pi.sex || '' }
  }

  const analyzerUrl = pathToFileURL(resolve(ROOT, 'services/score-analyzer/src/index.js')).href
  const { scoreSession } = await import(analyzerUrl)

  const startTime = Date.now()
  const result = await scoreSession({ parsedSheet, records, caseInfo }, llmConfig)
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
  console.log(`   耗时: ${elapsed}s`)

  // 5. 输出结果
  printScoreResult(result)

  console.log('\n✅ 评分闭环测试完成')
}

main().catch(e => {
  console.error('\n❌ 测试失败:', e.message)
  console.error(e.stack)
  process.exit(1)
})
