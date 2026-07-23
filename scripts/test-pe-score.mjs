// 体格检查评分子测试 — 验证体检操作记录的格式化和评分
// 用法: node scripts/test-pe-score.mjs

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

// 模拟体格检查操作记录
const mockExamRecords = [
  { sequence: 1, speaker: 'doctor', content: '测量生命体征' },
  { sequence: 2, speaker: 'system', content: 'T: 36.5°C, P: 76次/分, R: 18次/分, BP: 128/82mmHg' },
  { sequence: 3, speaker: 'doctor', content: '一般情况观察' },
  { sequence: 4, speaker: 'system', content: '神志清楚，查体合作，发育正常，营养良好' },
  { sequence: 5, speaker: 'doctor', content: '头颈部检查' },
  { sequence: 6, speaker: 'system', content: '头颅无畸形，双侧瞳孔等大正圆，对光反射灵敏，颈部软，无抵抗，甲状腺无肿大' },
  { sequence: 7, speaker: 'doctor', content: '心脏视诊' },
  { sequence: 8, speaker: 'system', content: '心前区无隆起，心尖搏动位于左锁骨中线第5肋间，范围约2cm' },
  { sequence: 9, speaker: 'doctor', content: '心脏听诊' },
  { sequence: 10, speaker: 'system', content: '心率76次/分，心律齐，各瓣膜听诊区未闻及病理性杂音' },
  { sequence: 11, speaker: 'doctor', content: '肺部听诊' },
  { sequence: 12, speaker: 'system', content: '双肺呼吸音清，未闻及干湿性啰音' },
  { sequence: 13, speaker: 'doctor', content: '腹部视诊' },
  { sequence: 14, speaker: 'system', content: '腹部平坦，未见胃肠蠕动波及腹壁静脉曲张' },
  { sequence: 15, speaker: 'doctor', content: '腹部触诊' },
  { sequence: 16, speaker: 'system', content: '腹部平软，无压痛、无反跳痛，肝脾肋下未触及' },
  { sequence: 17, speaker: 'doctor', content: '神经系统检查' },
  { sequence: 18, speaker: 'system', content: '四肢肌力Ⅴ级，肌张力正常，腱反射(++)对称引出，Babinski征阴性' },
  { sequence: 19, speaker: 'doctor', content: '眼底检查' },
  { sequence: 20, speaker: 'system', content: '双侧视盘边界清晰，无水肿、无出血，动静脉比例正常' }
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

  // 加载病例和评分表
  const basic = JSON.parse(readFileSync(resolve(ROOT, 'apps/admin/public/data/cases/IM-20260527-A9GW-basic.json'), 'utf-8'))
  const pi = basic.patient_info || {}
  console.log(`病例: ${basic.title || basic.disease} | 评分表: ${basic.score_sheet_template || 'TPL-STD'}\n`)

  // 获取模板 + 解析
  const { getTemplateFlatItems } = await import(pathToFileURL(resolve(ROOT, 'packages/shared/data/score-tables/index.js')).href)
  // 体格检查站绑定 TPL-STD-2，强制使用 PE 专用模板
  const peTemplateCode = 'TPL-STD-2'
  const templateItems = getTemplateFlatItems(peTemplateCode)
  console.log(`模板: ${peTemplateCode} (${templateItems.length}条目)`)

  const { parseScoreSheet } = await import(pathToFileURL(resolve(ROOT, 'packages/shared/src/score-sheet-parser.js')).href)
  const llmConfig = { apiUrl: LLM_API_URL, apiKey: LLM_API_KEY, model: LLM_MODEL }
  const parsedSheet = await parseScoreSheet({ basicData: basic, templateItems, llmConfig })
  console.log(`解析评分表: ${parsedSheet.length}条目, ${parsedSheet.reduce((s,it)=>s+(it.sub_items?.length||0),0)}子项`)

  // 评分
  const { scoreSession } = await import(pathToFileURL(resolve(ROOT, 'services/score-analyzer/src/index.js')).href)

  console.log('\n── 体检记录（共' + mockExamRecords.length + '条） ──')
  for (const r of mockExamRecords) {
    console.log(`  [${r.sequence}] ${r.speaker === 'doctor' ? '学员指令' : '检查结果'}: ${r.content}`)
  }
  console.log()

  const caseInfo = {
    title: basic.title || basic.disease || '',
    disease: basic.disease || '',
    chief_complaint: basic.chief_complaint || '',
    patient_info: { name: pi.name || '', age: pi.age || '', sex: pi.sex || '' }
  }

  console.log('执行 AI 评分 (体格检查站)...')
  const start = Date.now()
  const result = await scoreSession({ parsedSheet, records: mockExamRecords, caseInfo, stationType: 'physicalExam' }, llmConfig)
  console.log(`耗时: ${((Date.now()-start)/1000).toFixed(1)}s\n`)

  // 输出全部结果（含0分项）
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

  console.log('\n✅ 体检站评分测试完成')
}

main().catch(e => { console.error('❌', e.message); console.error(e.stack); process.exit(1) })
