import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  fillBasicPrompt, fillReceptionPrompt, fillAnalysisPrompt,
  fillHumanityPrompt, fillMentalExamPrompt, fillOptimizePrompt, callLLM, generateCaseId
} from '../../services/ai-generator/src/index.js'
import { generateV1ScoreSheet } from './src/views/case-editor/score-sheet-generator.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CASES_DIR = path.resolve(__dirname, 'public/data/cases')

// ── 请求体解析 ────────────────────────────────────────────

function parseRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
      try { resolve(JSON.parse(body)) }
      catch (e) { reject(e) }
    })
    req.on('error', reject)
  })
}

// ── 主插件导出 ────────────────────────────────────────────

export function aiGenPlugin(env) {
  const AI_GEN_ENABLED = env.VITE_ENABLE_AI_GENERATE === 'true'
  const AI_API_KEY = env.AI_GENERATE_API_KEY || ''
  const AI_API_URL = env.AI_GENERATE_API_URL || 'https://api.openai.com/v1/chat/completions'
  const AI_MODEL = env.AI_GENERATE_MODEL || 'gpt-4o'
  let activeGeneration = null  // { caseId: string, steps: string[] }

  return {
    name: 'ai-gen',
    configureServer(server) {
      server.middlewares.use(async function(req, res, next) {
        const url = req.url.split('?')[0]

        // GET /api/ai-generate/cases
        if (req.method === 'GET' && url === '/api/ai-generate/cases') {
          try {
            if (!fs.existsSync(CASES_DIR)) {
              res.writeHead(200, { 'Content-Type': 'application/json' })
              res.end('[]')
              return
            }
            const files = fs.readdirSync(CASES_DIR)
            const basicFiles = files.filter(f => f.endsWith('-basic.json'))
            const cases = []
            for (const f of basicFiles) {
              try {
                const data = JSON.parse(fs.readFileSync(path.join(CASES_DIR, f), 'utf-8'))
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
              } catch (e) { /* skip corrupt files */ }
            }
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify(cases))
          } catch (e) {
            res.writeHead(500, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: false, error: e.message }))
          }
          return
        }

        // GET /api/ai-generate/status
        if (req.method === 'GET' && url === '/api/ai-generate/status') {
          const ag = activeGeneration
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({
            active: !!ag,
            caseId: ag ? ag.caseId : null,
            steps: ag ? ag.steps : []
          }))
          return
        }

        // POST /api/ai-generate
        if (req.method === 'POST' && url === '/api/ai-generate') {
          if (!AI_GEN_ENABLED) {
            res.writeHead(403, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: false, error: 'AI generation is disabled. Set VITE_ENABLE_AI_GENERATE=true in .env.local' }))
            return
          }
          if (!AI_API_KEY || AI_API_KEY === 'your-api-key-here') {
            res.writeHead(400, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: false, error: 'Please configure AI_GENERATE_API_KEY in .env.local' }))
            return
          }

          let body
          try {
            body = await parseRequestBody(req)
          } catch (e) {
            res.writeHead(400, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: false, error: 'Invalid JSON body' }))
            return
          }

          const { step, config, previousResults } = body
          if (!step || !config) {
            res.writeHead(400, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: false, error: 'Missing step or config in request body' }))
            return
          }

          const prev = previousResults || {}
          const trackingCaseId = body.caseId || prev.basic?.case_id || null

          try {
            let prompt

            switch (step) {
              case 'basic':
                prompt = fillBasicPrompt(config)
                break
              case 'scoreSheet':
                if (!prev.basic || !Object.keys(prev.basic).length)
                  throw new Error('scoreSheet step requires basic result first')
                // 评分表从基础数据派生，客户端生成，不耗 LLM
                {
                  const ssData = generateV1ScoreSheet(prev.basic)
                  const caseId = body.caseId || prev.basic?.case_id || generateCaseId(config.specialty || '内科')
                  const sheetFile = path.join(CASES_DIR, `${caseId}-scoreSheet.json`)
                  if (!fs.existsSync(CASES_DIR)) fs.mkdirSync(CASES_DIR, { recursive: true })
                  fs.writeFileSync(sheetFile, JSON.stringify(ssData, null, 2), 'utf-8')
                  console.log(`[aiGen] Generated scoreSheet & saved: ${sheetFile}`)
                  res.writeHead(200, { 'Content-Type': 'application/json' })
                  res.end(JSON.stringify({ ok: true, data: { score_sheet: ssData, case_id: caseId } }))
                }
                return
              case 'reception':
                if (!prev.basic || !Object.keys(prev.basic).length)
                  throw new Error('reception step requires basic result first')
                prompt = fillReceptionPrompt(config, prev.basic)
                break
              case 'analysis':
                if (!prev.basic || !Object.keys(prev.basic).length)
                  throw new Error('analysis step requires basic result first')
                prompt = fillAnalysisPrompt(config, prev.basic)
                break
              case 'humanity':
                if (!prev.basic || !Object.keys(prev.basic).length)
                  throw new Error('humanity step requires basic result first')
                prompt = fillHumanityPrompt(config, prev.basic)
                break
              case 'mentalExam':
                if (!prev.basic || !Object.keys(prev.basic).length)
                  throw new Error('mentalExam step requires basic result first')
                prompt = fillMentalExamPrompt(config, prev.basic, prev)
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
            const data = await callLLM(prompt, AI_API_URL, AI_API_KEY, AI_MODEL)
            activeGeneration.steps = activeGeneration.steps.filter(s => s !== step)
            if (activeGeneration.steps.length === 0) activeGeneration = null

            // case_id 策略：后端强制生成，不信任 LLM（LLM 随机性不可靠，可能重复 case_id 导致覆盖已有文件）
            if (body.caseId) {
              data.case_id = body.caseId
            } else if (step === 'basic') {
              data.case_id = generateCaseId(config.specialty || '内科')
            }

            if (!fs.existsSync(CASES_DIR)) {
              fs.mkdirSync(CASES_DIR, { recursive: true })
            }

            const caseId = (data.case_id || prev.basic?.case_id || 'CASE-UNKNOWN').replace(/[\\/:*?"<>|]/g, '-')
            const fileMap = {
              basic: `${caseId}-basic.json`,
              reception: `${caseId}-reception.json`,
              analysis: `${caseId}-analysis.json`,
              humanity: `${caseId}-humanity.json`,
              mentalExam: `${caseId}-mentalExam.json`
            }
            const filePath = path.join(CASES_DIR, fileMap[step])
            if (fs.existsSync(filePath)) {
              console.warn(`[aiGen] WARNING: Overwriting existing file: ${filePath}`)
            }
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
            console.log(`[aiGen] Saved: ${filePath}`)

            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: true, data }))
          } catch (e) {
            if (activeGeneration) {
              activeGeneration.steps = activeGeneration.steps.filter(s => s !== step)
              if (activeGeneration.steps.length === 0) activeGeneration = null
            }
            console.error(`[aiGen] Error generating ${step}:`, e.message)
            res.writeHead(500, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: false, error: e.message }))
          }
          return
        }

        // POST /api/ai-generate/optimize — 单页优化
        if (req.method === 'POST' && url === '/api/ai-generate/optimize') {
          if (!AI_GEN_ENABLED) {
            res.writeHead(403, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: false, error: 'AI generation is disabled.' }))
            return
          }
          if (!AI_API_KEY || AI_API_KEY === 'your-api-key-here') {
            res.writeHead(400, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: false, error: 'Please configure AI_GENERATE_API_KEY in .env.local' }))
            return
          }

          let body
          try { body = await parseRequestBody(req) } catch (e) {
            res.writeHead(400, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: false, error: 'Invalid JSON body' }))
            return
          }

          const { moduleType, currentData, config } = body
          if (!moduleType || !currentData || !config) {
            res.writeHead(400, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: false, error: 'Missing moduleType, currentData, or config' }))
            return
          }

          if (!['basic', 'scoreSheet', 'reception', 'humanity', 'analysis', 'mentalExam'].includes(moduleType)) {
            res.writeHead(400, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: false, error: 'Invalid moduleType.' }))
            return
          }

          const caseId = body.caseId || currentData.case_id || null
          const trackingStep = `optimize:${moduleType}`

          try {
            let data

            if (moduleType === 'scoreSheet') {
              // 评分表从基础数据派生，客户端生成
              data = { score_sheet: generateV1ScoreSheet(currentData), case_id: caseId }
            } else if (moduleType === 'basic') {
              // 基础信息通过 LLM 重新生成
              const prompt = fillBasicPrompt(config)
              console.log(`[aiGen] Optimizing basic...`)
              if (!activeGeneration || activeGeneration.caseId !== caseId) {
                activeGeneration = { caseId, steps: [trackingStep] }
              } else if (!activeGeneration.steps.includes(trackingStep)) {
                activeGeneration.steps.push(trackingStep)
              }
              data = await callLLM(prompt, AI_API_URL, AI_API_KEY, AI_MODEL)
              activeGeneration.steps = activeGeneration.steps.filter(s => s !== trackingStep)
              if (activeGeneration.steps.length === 0) activeGeneration = null
              if (body.caseId) data.case_id = body.caseId
            } else {
              const prompt = fillOptimizePrompt(moduleType, currentData, config)
              console.log(`[aiGen] Optimizing module: ${moduleType}...`)
              if (!activeGeneration || activeGeneration.caseId !== caseId) {
                activeGeneration = { caseId, steps: [trackingStep] }
              } else if (!activeGeneration.steps.includes(trackingStep)) {
                activeGeneration.steps.push(trackingStep)
              }
              data = await callLLM(prompt, AI_API_URL, AI_API_KEY, AI_MODEL)
              activeGeneration.steps = activeGeneration.steps.filter(s => s !== trackingStep)
              if (activeGeneration.steps.length === 0) activeGeneration = null
              if (body.caseId) data.case_id = body.caseId
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
            const filePath = path.join(CASES_DIR, fileMap[moduleType])
            if (!fs.existsSync(CASES_DIR)) fs.mkdirSync(CASES_DIR, { recursive: true })
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
            console.log(`[aiGen] Optimized & saved: ${filePath}`)

            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: true, data }))
          } catch (e) {
            if (activeGeneration) {
              activeGeneration.steps = activeGeneration.steps.filter(s => s !== trackingStep)
              if (activeGeneration.steps.length === 0) activeGeneration = null
            }
            console.error(`[aiGen] Error optimizing ${moduleType}:`, e.message)
            res.writeHead(500, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: false, error: e.message }))
          }
          return
        }

        // POST /api/case/save-fields — 前端持久化字段到 basic.json
        if (req.method === 'POST' && url === '/api/case/save-fields') {
          try {
            const body = await parseRequestBody(req)
            const { caseId, fields } = body
            if (!caseId || !fields) {
              res.writeHead(400, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ ok: false, error: 'Missing caseId or fields' }))
              return
            }
            const basicPath = path.join(CASES_DIR, `${caseId}-basic.json`)
            if (!fs.existsSync(basicPath)) {
              res.writeHead(404, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ ok: false, error: 'Case basic.json not found' }))
              return
            }
            const basicData = JSON.parse(fs.readFileSync(basicPath, 'utf-8'))
            Object.assign(basicData, fields)
            fs.writeFileSync(basicPath, JSON.stringify(basicData, null, 2), 'utf-8')
            console.log(`[aiGen] Updated basic.json fields for ${caseId}:`, Object.keys(fields).join(', '))
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: true }))
          } catch (e) {
            console.error('[aiGen] Error saving fields:', e.message)
            res.writeHead(500, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: false, error: e.message }))
          }
          return
        }

        // POST /api/case/save-file — 前端保存额外文件（如评分表）
        if (req.method === 'POST' && url === '/api/case/save-file') {
          try {
            const body = await parseRequestBody(req)
            const { caseId, fileName, data } = body
            if (!caseId || !fileName || !data) {
              res.writeHead(400, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ ok: false, error: 'Missing caseId, fileName, or data' }))
              return
            }
            if (!fs.existsSync(CASES_DIR)) fs.mkdirSync(CASES_DIR, { recursive: true })
            const filePath = path.join(CASES_DIR, fileName)
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
            console.log(`[aiGen] Saved file: ${filePath}`)
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: true }))
          } catch (e) {
            console.error('[aiGen] Error saving file:', e.message)
            res.writeHead(500, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: false, error: e.message }))
          }
          return
        }

        // POST /api/case/upload-material — 上传素材二进制文件
        if (req.method === 'POST' && url === '/api/case/upload-material') {
          try {
            const body = await parseRequestBody(req)
            const { caseId, filename, data } = body
            if (!caseId || !filename || !data) {
              res.writeHead(400, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ ok: false, error: 'Missing caseId, filename, or data' }))
              return
            }
            const materialsDir = path.join(CASES_DIR, caseId, 'materials')
            if (!fs.existsSync(materialsDir)) fs.mkdirSync(materialsDir, { recursive: true })
            const base64 = data.replace(/^data:[^;]+;base64,/, '')
            const buffer = Buffer.from(base64, 'base64')
            const filePath = path.join(materialsDir, filename)
            fs.writeFileSync(filePath, buffer)
            const url = `/data/cases/${caseId}/materials/${filename}`
            console.log(`[aiGen] Uploaded material: ${filePath}`)
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: true, path: url, filename }))
          } catch (e) {
            console.error('[aiGen] Error uploading material:', e.message)
            res.writeHead(500, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: false, error: e.message }))
          }
          return
        }

        next()
      })
    }
  }
}
