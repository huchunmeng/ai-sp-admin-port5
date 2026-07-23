// 人文沟通站评分测试 — 验证对话格式+人文沟通评分表评分
// 用法: node scripts/test-humanity-score.mjs

import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

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

const mockDialog = [
  { sequence: 1, speaker: 'doctor', content: '您好，我是王医生，今天来和您聊聊您的情况。' },
  { sequence: 2, speaker: 'patient', content: '医生你好。' },
  { sequence: 3, speaker: 'doctor', content: '我看您最近检查发现甲状腺有点问题，您自己有什么不舒服的感觉吗？' },
  { sequence: 4, speaker: 'patient', content: '就是感觉心慌，手有点抖，容易出汗，最近瘦了不少。' },
  { sequence: 5, speaker: 'doctor', content: '听您这么说，这些症状确实让人挺担心的。心慌和手抖会影响您日常工作和生活吗？' },
  { sequence: 6, speaker: 'patient', content: '有影响啊，我都不敢见人了，手抖得厉害的时候连杯子都拿不稳。' },
  { sequence: 7, speaker: 'doctor', content: '我理解您的感受，这些症状确实会给生活带来很大困扰。不过您别太担心，甲状腺的问题大多数是可以通过治疗很好控制的。' },
  { sequence: 8, speaker: 'patient', content: '真的吗？那需要手术吗？我挺害怕的。' },
  { sequence: 9, speaker: 'doctor', content: '不是所有甲状腺问题都需要手术的。我们先做进一步检查，明确诊断后，再和您一起讨论最适合您的治疗方案。您觉得这样可以吗？' },
  { sequence: 10, speaker: 'patient', content: '好，那就听医生的。' },
  { sequence: 11, speaker: 'doctor', content: '好的，我先帮您总结一下：您目前主要有心慌、手抖、多汗、消瘦这些症状，我们需要进一步做甲状腺功能、甲状腺超声等检查。您还有什么想问的吗？' },
  { sequence: 12, speaker: 'patient', content: '没有了，谢谢你医生。' },
  { sequence: 13, speaker: 'doctor', content: '不客气，检查结果出来后我会详细跟您说明。如果您之后有什么疑问，随时可以来找我。' }
]

async function main() {
  loadEnv()
  const LLM_API_KEY = process.env.LLM_API_KEY || ''
  if (!LLM_API_KEY || LLM_API_KEY === 'your-api-key-here') {
    console.error('❌ 未配置 LLM_API_KEY')
    process.exit(1)
  }

  const LLM_API_URL = process.env.LLM_API_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'
  const LLM_MODEL = process.env.LLM_MODEL || 'qwen-turbo'

  const basic = JSON.parse(readFileSync(resolve(ROOT, 'apps/admin/public/data/cases/IM-20260527-A9GW-basic.json'), 'utf-8'))
  const pi = basic.patient_info || {}
  console.log(`病例: ${basic.title || basic.disease}`)

  const { getTemplateFlatItems } = await import(pathToFileURL(resolve(ROOT, 'packages/shared/data/score-tables/index.js')).href)
  const humanityTemplate = 'TPL-STD-6'
  const templateItems = getTemplateFlatItems(humanityTemplate)
  console.log(`模板: ${humanityTemplate} (${templateItems.length}条目)`)

  const { parseScoreSheet } = await import(pathToFileURL(resolve(ROOT, 'packages/shared/src/score-sheet-parser.js')).href)
  const llmConfig = { apiUrl: LLM_API_URL, apiKey: LLM_API_KEY, model: LLM_MODEL }
  const parsedSheet = await parseScoreSheet({ basicData: basic, templateItems, llmConfig })
  console.log(`解析评分表: ${parsedSheet.length}条目, ${parsedSheet.reduce((s,it)=>s+(it.sub_items?.length||0),0)}子项`)

  const { scoreSession } = await import(pathToFileURL(resolve(ROOT, 'services/score-analyzer/src/index.js')).href)

  console.log(`\n── 人文沟通对话（共${mockDialog.length}轮） ──`)
  for (const r of mockDialog) {
    const role = r.speaker === 'doctor' ? '学员' : '患者'
    console.log(`  [${r.sequence}] ${role}: ${r.content.substring(0, 60)}...`)
  }
  console.log()

  const caseInfo = {
    title: basic.title || basic.disease || '',
    disease: basic.disease || '',
    chief_complaint: basic.chief_complaint || '',
    patient_info: { name: pi.name || '', age: pi.age || '', sex: pi.sex || '' }
  }

  console.log('执行 AI 评分 (人文沟通站)...')
  const start = Date.now()
  const result = await scoreSession({ parsedSheet, records: mockDialog, caseInfo, stationType: '' }, llmConfig)
  console.log(`耗时: ${((Date.now()-start)/1000).toFixed(1)}s\n`)

  let totalAwarded = 0, totalMax = 0
  for (const entry of (result.scored_items || [])) {
    console.log(`▸ [${entry.category}] ${entry.item}（${entry.item_score}分）`)
    for (const sub of (entry.sub_items || [])) {
      const a = sub.awarded_score || 0, m = sub.max_score || 0
      totalAwarded += a; totalMax += m
      const icon = a === m ? '✓' : a > 0 ? '◐' : '✗'
      console.log(`  ${icon} ${sub.point}: ${a}/${m}分`)
      if (a > 0 && sub.evidence) console.log(`    证据: ${sub.evidence.substring(0, 80)}`)
    }
  }
  console.log(`\n总分: ${totalAwarded}/${totalMax} (${(totalAwarded/totalMax*100).toFixed(1)}%)`)
  if (result.pass_fail) console.log(`判定: ${result.pass_fail}`)
  if (result.scoring_narrative) console.log(`评语: ${result.scoring_narrative}`)

  console.log('\n✅ 人文沟通站评分测试完成')
}

main().catch(e => { console.error('❌', e.message); console.error(e.stack); process.exit(1) })
