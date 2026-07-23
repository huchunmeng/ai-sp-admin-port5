import fs from 'fs'
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import config from '../config.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const AI_GEN_SRC = path.resolve(__dirname, '../../../ai-generator/src')

let _promptLoader = null
let _llmClient = null

async function loadAIGenerator() {
  if (!_promptLoader) {
    _promptLoader = await import(pathToFileURL(path.join(AI_GEN_SRC, 'index.js')).href)
  }
  if (!_llmClient) {
    _llmClient = await import(pathToFileURL(path.join(AI_GEN_SRC, 'llm-client.js')).href)
  }
  return { ..._promptLoader, ..._llmClient }
}

async function loadScoreSheet() {
  return import('../score-sheet.js')
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

let activeGeneration = null

export function mountAiGenerate(app) {
  // GET /api/ai-generate/cases
  app.get('/api/ai-generate/cases', (_req, res) => {
    try {
      if (!fs.existsSync(config.CASES_DIR)) { res.json([]); return }
      const files = fs.readdirSync(config.CASES_DIR)
      const basicFiles = files.filter(f => f.endsWith('-basic.json'))
      const cases = []
      for (const f of basicFiles) {
        try {
          const data = JSON.parse(fs.readFileSync(path.join(config.CASES_DIR, f), 'utf-8'))
          const prefix = f.replace('-basic.json', '')
          const pi = data.patient_info || {}
          cases.push({
            id: prefix,
            case_id: data.case_id || prefix,
            title: data.title || data.disease || prefix,
            teaching_phase: data.training_phase || '',
            specialty: data.specialty || '',
            category: data.category || '',
            disease: data.disease || '',
            difficulty: data.difficulty || '',
            version: data.version || 'v1.0',
            ai_quality_status: '待质检',
            editor_review_status: '待审核',
            expert_review_status: '待审核',
            base_review_status: '待审核',
            source: data.source || '平台',
            creator_name: data.creator_name || '',
            created_at: data.record_date || new Date().toISOString().slice(0, 10),
            enabled: true,
            patient_name: pi.name || '',
            patient_gender: pi.sex === '1' || pi.sex === '男' ? '男' : (pi.sex === '0' || pi.sex === '女' ? '女' : ''),
            patient_age: String(pi.age || '').replace('岁', '')
          })
        } catch { /* skip corrupt files */ }
      }
      res.json(cases)
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message })
    }
  })

  // GET /api/ai-generate/status
  app.get('/api/ai-generate/status', (_req, res) => {
    const ag = activeGeneration
    res.json({
      active: !!ag,
      caseId: ag ? ag.caseId : null,
      steps: ag ? ag.steps : []
    })
  })

  // POST /api/ai-generate
  app.post('/api/ai-generate', async (req, res) => {
    if (!config.AI_GEN_ENABLED) {
      res.status(403).json({ ok: false, error: 'AI generation is disabled. Set VITE_ENABLE_AI_GENERATE=true' })
      return
    }
    if (!config.AI_GENERATE_API_KEY || config.AI_GENERATE_API_KEY === 'your-api-key-here') {
      res.status(400).json({ ok: false, error: 'Please configure AI_GENERATE_API_KEY' })
      return
    }

    const { step, config: stepConfig, previousResults, caseId: bodyCaseId } = req.body
    if (!step || !stepConfig) {
      res.status(400).json({ ok: false, error: 'Missing step or config in request body' })
      return
    }

    const prev = previousResults || {}
    const trackingCaseId = bodyCaseId || prev.basic?.case_id || null

    try {
      // scoreSheet is computed locally, no LLM needed
      if (step === 'scoreSheet') {
        if (!prev.basic || !Object.keys(prev.basic).length)
          throw new Error('scoreSheet step requires basic result first')

        const { generateV1ScoreSheet } = await loadScoreSheet()
        const ssData = generateV1ScoreSheet(prev.basic)
        const caseId = bodyCaseId || prev.basic?.case_id

        const sheetFile = path.join(config.CASES_DIR, `${caseId}-scoreSheet.json`)
        ensureDir(config.CASES_DIR)
        fs.writeFileSync(sheetFile, JSON.stringify(ssData, null, 2), 'utf-8')
        console.log(`[aiGen] Generated scoreSheet & saved: ${sheetFile}`)
        res.json({ ok: true, data: { score_sheet: ssData, case_id: caseId } })
        return
      }

      const ai = await loadAIGenerator()
      const { fillBasicPrompt, fillReceptionPrompt, fillAnalysisPrompt, fillHumanityPrompt, fillMentalExamPrompt, callLLM } = ai

      let prompt

      switch (step) {
        case 'basic':
          prompt = fillBasicPrompt(stepConfig)
          break
        case 'reception':
          if (!prev.basic || !Object.keys(prev.basic).length)
            throw new Error('reception step requires basic result first')
          prompt = fillReceptionPrompt(stepConfig, prev.basic)
          break
        case 'analysis':
          if (!prev.basic || !Object.keys(prev.basic).length)
            throw new Error('analysis step requires basic result first')
          prompt = fillAnalysisPrompt(stepConfig, prev.basic)
          break
        case 'humanity':
          if (!prev.basic || !Object.keys(prev.basic).length)
            throw new Error('humanity step requires basic result first')
          prompt = fillHumanityPrompt(stepConfig, prev.basic)
          break
        case 'mentalExam':
          if (!prev.basic || !Object.keys(prev.basic).length)
            throw new Error('mentalExam step requires basic result first')
          prompt = fillMentalExamPrompt(stepConfig, prev.basic, prev)
          break
        default:
          throw new Error(`Unknown step: ${step}`)
      }

      console.log(`[aiGen] Generating step: ${step}...`)
      if (!activeGeneration || activeGeneration.caseId !== trackingCaseId) {
        activeGeneration = { caseId: trackingCaseId, steps: [step] }
      } else if (!activeGeneration.steps.includes(step)) {
        activeGeneration.steps.push(step)
      }
      const data = await callLLM(prompt, config.AI_GENERATE_API_URL, config.AI_GENERATE_API_KEY, config.AI_GENERATE_MODEL)
      activeGeneration.steps = activeGeneration.steps.filter(s => s !== step)
      if (activeGeneration.steps.length === 0) activeGeneration = null

      // case_id 策略：后端强制生成，不信任 LLM（LLM 随机性不可靠，可能重复 case_id 导致覆盖已有文件）
      if (bodyCaseId) {
        data.case_id = bodyCaseId
      } else if (step === 'basic') {
        const { generateCaseId } = await ai
        data.case_id = generateCaseId(stepConfig.specialty || '内科')
      }

      ensureDir(config.CASES_DIR)
      const caseId = (data.case_id || prev.basic?.case_id || 'CASE-UNKNOWN').replace(/[\\/:*?"<>|]/g, '-')
      const fileMap = {
        basic: `${caseId}-basic.json`,
        reception: `${caseId}-reception.json`,
        analysis: `${caseId}-analysis.json`,
        humanity: `${caseId}-humanity.json`,
        mentalExam: `${caseId}-mentalExam.json`
      }
      const filePath = path.join(config.CASES_DIR, fileMap[step])
      if (fs.existsSync(filePath)) {
        console.warn(`[aiGen] WARNING: Overwriting existing file: ${filePath}`)
      }
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
      console.log(`[aiGen] Saved: ${filePath}`)

      res.json({ ok: true, data })
    } catch (e) {
      if (activeGeneration) {
        activeGeneration.steps = activeGeneration.steps.filter(s => s !== step)
        if (activeGeneration.steps.length === 0) activeGeneration = null
      }
      console.error(`[aiGen] Error generating ${step}:`, e.message)
      res.status(500).json({ ok: false, error: e.message })
    }
  })

  // POST /api/ai-generate/optimize
  app.post('/api/ai-generate/optimize', async (req, res) => {
    if (!config.AI_GEN_ENABLED) {
      res.status(403).json({ ok: false, error: 'AI generation is disabled.' })
      return
    }
    if (!config.AI_GENERATE_API_KEY || config.AI_GENERATE_API_KEY === 'your-api-key-here') {
      res.status(400).json({ ok: false, error: 'Please configure AI_GENERATE_API_KEY' })
      return
    }

    const { moduleType, currentData, config: stepConfig, caseId: bodyCaseId } = req.body
    if (!moduleType || !currentData || !stepConfig) {
      res.status(400).json({ ok: false, error: 'Missing moduleType, currentData, or config' })
      return
    }
    if (!['basic', 'scoreSheet', 'reception', 'humanity', 'analysis', 'mentalExam'].includes(moduleType)) {
      res.status(400).json({ ok: false, error: 'Invalid moduleType.' })
      return
    }

    const caseId = bodyCaseId || currentData.case_id || null
    const trackingStep = `optimize:${moduleType}`

    try {
      let data

      if (moduleType === 'scoreSheet') {
        const { generateV1ScoreSheet } = await loadScoreSheet()
        data = { score_sheet: generateV1ScoreSheet(currentData), case_id: caseId }
      } else if (moduleType === 'basic') {
        const ai = await loadAIGenerator()
        const prompt = ai.fillBasicPrompt(stepConfig)
        console.log(`[aiGen] Optimizing basic...`)
        if (!activeGeneration || activeGeneration.caseId !== caseId) {
          activeGeneration = { caseId, steps: [trackingStep] }
        } else if (!activeGeneration.steps.includes(trackingStep)) {
          activeGeneration.steps.push(trackingStep)
        }
        data = await ai.callLLM(prompt, config.AI_GENERATE_API_URL, config.AI_GENERATE_API_KEY, config.AI_GENERATE_MODEL)
        activeGeneration.steps = activeGeneration.steps.filter(s => s !== trackingStep)
        if (activeGeneration.steps.length === 0) activeGeneration = null
        if (bodyCaseId) data.case_id = bodyCaseId
      } else {
        const ai = await loadAIGenerator()
        const prompt = ai.fillOptimizePrompt(moduleType, currentData, stepConfig)
        console.log(`[aiGen] Optimizing module: ${moduleType}...`)
        if (!activeGeneration || activeGeneration.caseId !== caseId) {
          activeGeneration = { caseId, steps: [trackingStep] }
        } else if (!activeGeneration.steps.includes(trackingStep)) {
          activeGeneration.steps.push(trackingStep)
        }
        data = await ai.callLLM(prompt, config.AI_GENERATE_API_URL, config.AI_GENERATE_API_KEY, config.AI_GENERATE_MODEL)
        activeGeneration.steps = activeGeneration.steps.filter(s => s !== trackingStep)
        if (activeGeneration.steps.length === 0) activeGeneration = null
        if (bodyCaseId) data.case_id = bodyCaseId
      }

      const saveId = (caseId || data.case_id || currentData.case_id || 'CASE-UNKNOWN').replace(/[\\/:*?"<>|]/g, '-')
      const fileMap = {
        basic: `${saveId}-basic.json`,
        scoreSheet: `${saveId}-scoreSheet.json`,
        reception: `${saveId}-reception.json`,
        humanity: `${saveId}-humanity.json`,
        analysis: `${saveId}-analysis.json`,
        mentalExam: `${saveId}-mentalExam.json`
      }
      const filePath = path.join(config.CASES_DIR, fileMap[moduleType])
      ensureDir(config.CASES_DIR)
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
      console.log(`[aiGen] Optimized & saved: ${filePath}`)
      res.json({ ok: true, data })
    } catch (e) {
      if (activeGeneration) {
        activeGeneration.steps = activeGeneration.steps.filter(s => s !== trackingStep)
        if (activeGeneration.steps.length === 0) activeGeneration = null
      }
      console.error(`[aiGen] Error optimizing ${moduleType}:`, e.message)
      res.status(500).json({ ok: false, error: e.message })
    }
  })
}
