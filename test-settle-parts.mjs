// 隔离测试 settle 各环节耗时，定位卡点
import fs from 'node:fs'
import { scoreSession, analyzeHistoryTakingProfile } from './services/score-analyzer/src/index.js'
import { parseScoreSheet } from './packages/shared/src/score-sheet-parser.js'

const flow = JSON.parse(fs.readFileSync('packages/shared/data/flow-score-tables.json', 'utf8'))
const basic = JSON.parse(fs.readFileSync('apps/admin/public/data/cases/IM-20260801-PCH-basic.json', 'utf8'))
const ht = JSON.parse(fs.readFileSync('data/gen/historyTaking.json', 'utf8'))
const llmConfig = {
  apiUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
  apiKey: process.env.LLM_API_KEY,
  model: process.env.LLM_MODEL || 'qwen-plus',
}
if (!llmConfig.apiKey) { console.error('缺少 LLM_API_KEY'); process.exit(1) }

const caseInfo = {
  case_id: 'IM-20260801-PCH', id: 'IM-20260801-PCH', specialty: basic.specialty,
  training_phase: basic.training_phase, difficulty: basic.difficulty,
  chief_complaint: basic.chief_complaint, title: basic.title,
  present_illness: basic.present_illness, past_history: basic.past_history,
  diagnosis: basic.diagnosis,
}
const htItems = flow.tables['FLOW-HISTORY'].items
const htTemplate = flow.tables['FLOW-HISTORY']

async function timed(name, fn) {
  const t0 = Date.now()
  try {
    const r = await fn()
    console.log(`✓ ${name}: ${Math.round((Date.now() - t0) / 100) / 10}s`)
    return r
  } catch (e) {
    console.log(`✗ ${name}: ${Math.round((Date.now() - t0) / 100) / 10}s  ERROR: ${e.message.slice(0, 200)}`)
    throw e
  }
}

async function main() {
  console.log('model:', llmConfig.model)
  // 1. parseScoreSheet
  const sheet = await timed('parseScoreSheet(FLOW-HISTORY)', () =>
    parseScoreSheet({ basicData: caseInfo, templateItems: htItems, specialty: basic.specialty, llmConfig }))
  console.log('  → sheet len:', sheet.length, '| item[0]:', JSON.stringify(sheet[0]).slice(0, 200))

  // 2. scoreSession
  await timed('scoreSession(historyTaking)', () =>
    scoreSession({
      parsedSheet: sheet, allRecords: { dialog: ht.messages, exam: [], qa: [], freeText: [] },
      records: { dialog: ht.messages, exam: [], qa: [], freeText: [] },
      caseInfo, stationType: 'historyTaking',
    }, llmConfig))

  // 3. analyzeHistoryTakingProfile
  await timed('analyzeHistoryTakingProfile', () =>
    analyzeHistoryTakingProfile({ caseInfo, dialogRecords: ht.messages }, llmConfig))
}

main().catch(e => { console.error('[FATAL]', e.message); process.exit(1) })
