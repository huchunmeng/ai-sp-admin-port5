// Quick debug: dump the built system prompt for EM-20260416-7A2K
import { writeFileSync } from 'fs'
import { fileURLToPath, pathToFileURL } from 'url'

const SHARED_SRC = fileURLToPath(new URL('../packages/shared/src', import.meta.url))
const { clamp, repairJSON, derivePersonality, createEmotionEngine } = await import(
  pathToFileURL(SHARED_SRC + '/emotion-engine.js').href
)
const { createStateMachine, COMPLAINT_TRIGGERS } = await import(
  pathToFileURL(SHARED_SRC + '/emotion-state-machine.js').href
)

// We need to replicate what the configure endpoint does
import { loadCaseData, buildRoleDescription, buildSymptomPoolRegex, loadCaseMaterials } from '../services/sp-api/src/case-loader.js'
import { buildSystemPrompt } from '../services/sp-api/src/prompt-builder.js'

const caseId = 'EM-20260416-7A2K'
const basic = loadCaseData(caseId, 'basic')
const reception = loadCaseData(caseId, 'reception')
const meta = loadCaseData(caseId, 'meta')

const config = {
  caseId,
  mode: 'history-taking',
  role: reception?.sp_materials?.role || 'patient',
  roleDescription: buildRoleDescription(basic, reception),
  symptomPool: reception?.sp_materials?.self_narration || '',
  emotionBaseline: reception?.sp_materials?.emotion_baseline || {},
  spPlayRules: reception?.sp_materials?.sp_play_rules || null,
  personality: meta?.personality || null,
  emotionEnabled: true
}

const personality = derivePersonality('', config.roleDescription || '', config.personality)
const engine = createEmotionEngine({
  baseline: config.emotionBaseline || {},
  personality,
  scene: {}
})
const stateMachine = createStateMachine(engine)
const smContext = stateMachine.getContext('你怎么了')

const { prompt } = buildSystemPrompt({
  config,
  engine,
  smContext,
  messages: [{ role: 'user', content: '你怎么了' }],
  emotionOn: true,
  triggers: {}
})

import { dirname, join } from 'path'
const outPath = join(dirname(fileURLToPath(import.meta.url)), 'sp-debug-prompt.txt')
writeFileSync(outPath, prompt, 'utf-8')
console.log('Prompt written to', outPath)
console.log('Prompt length:', prompt.length, 'chars')
console.log('Materials section present:', prompt.includes('检查报告素材'))

// Also check materials loading
const mats = loadCaseMaterials(caseId)
console.log('Materials loaded:', !!mats)
if (mats) {
  console.log('Items:', Object.keys(mats.itemMap))
  console.log('spVerbal:', mats.itemMap[Object.keys(mats.itemMap)[0]]?.spVerbal)
}
