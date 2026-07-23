import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import fs from 'node:fs'
import path from 'node:path'
import annoPlugin from '../../scripts/anno-plugin.mjs'
import stationSchemesPersist from '../../scripts/station-schemes-persist.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const ADMIN_CASES_DIR = path.resolve(__dirname, '../admin/public/data/cases')
const ADMIN_DATA_DIR = path.resolve(__dirname, '../admin/public/data')
const PROMPTS_DIR = path.resolve(__dirname, '../../services/ai-generator/prompts/06-aisp')

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

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '')

  const LLM_API_KEY = env.LLM_API_KEY || ''
  const LLM_API_URL = env.LLM_API_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'
  const LLM_MODEL = env.LLM_MODEL || 'qwen-turbo'

  if (LLM_API_KEY && LLM_API_KEY !== 'your-api-key-here') {
    console.log('[vite] ✓ LLM 代理：已配置 (' + LLM_MODEL + ')')
  } else {
    console.log('[vite] ╔══════════════════════════════════════════════╗')
    console.log('[vite] ║  ⚠ LLM API Key 未配置，对话将使用降级模式  ║')
    console.log('[vite] ║                                              ║')
    console.log('[vite] ║  在 apps/training/.env.local 中配置：          ║')
    console.log('[vite] ║    LLM_API_KEY=你的密钥                       ║')
    console.log('[vite] ╚══════════════════════════════════════════════╝')
  }

  return {
    base: '/',
    plugins: [
      annoPlugin(),
      stationSchemesPersist(),
      vue(),
      {
        name: 'serve-admin-cases',
        configureServer(server) {
          server.middlewares.use('/data/cases', (req, res, next) => {
            const urlPath = req.url.split('?')[0]
            const filePath = path.join(ADMIN_CASES_DIR, urlPath)
            try {
              if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
                const ext = path.extname(filePath).toLowerCase()
                const mimeMap = {
                  '.json': 'application/json', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
                  '.png': 'image/png', '.mp4': 'video/mp4', '.mp3': 'audio/mpeg',
                  '.pdf': 'application/pdf', '.webm': 'video/webm'
                }
                res.writeHead(200, { 'Content-Type': mimeMap[ext] || 'application/octet-stream' })
                fs.createReadStream(filePath).pipe(res)
                return
              }
            } catch (e) { /* fall through */ }
            next()
          })
        }
      },
      {
        name: 'serve-admin-data',
        configureServer(server) {
          server.middlewares.use('/data', (req, res, next) => {
            const urlPath = req.url.split('?')[0]
            // /data/cases/* 由 serve-admin-cases 处理，这里只处理 /data/* (非cases)
            if (urlPath.startsWith('/cases')) { next(); return }
            const filePath = path.join(ADMIN_DATA_DIR, urlPath)
            try {
              if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
                const ext = path.extname(filePath).toLowerCase()
                const mimeMap = { '.json': 'application/json' }
                res.writeHead(200, { 'Content-Type': mimeMap[ext] || 'application/octet-stream' })
                fs.createReadStream(filePath).pipe(res)
                return
              }
            } catch {}
            next()
          })
        }
      },
      {
        name: 'case-index',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.method === 'GET' && req.url.split('?')[0] === '/api/cases') {
              try {
                if (!fs.existsSync(ADMIN_CASES_DIR)) {
                  res.writeHead(200, { 'Content-Type': 'application/json' })
                  res.end('[]')
                  return
                }
                const files = fs.readdirSync(ADMIN_CASES_DIR)
                const basicFiles = files.filter(f => f.endsWith('-basic.json'))
                const cases = []
                for (const f of basicFiles) {
                  try {
                    const data = JSON.parse(fs.readFileSync(path.join(ADMIN_CASES_DIR, f), 'utf-8'))
                    const caseId = f.replace('-basic.json', '')
                    const pi = data.patient_info || {}
                    cases.push({
                      id: caseId,
                      case_id: data.case_id || caseId,
                      title: data.title || data.disease || caseId,
                      specialty: data.specialty || '',
                      disease: data.disease || '',
                      difficulty: data.difficulty || data.teaching_phase || '',
                      training_phase: data.training_phase || '',
                      category: data.category || '',
                      chief_complaint: data.chief_complaint || '',
                      symptoms: data.symptoms || [],
                      source: '平台',
                      patient_name: pi.name || '',
                      patient_gender: pi.sex === '1' || pi.sex === '男' ? '男' : (pi.sex === '0' || pi.sex === '女' ? '女' : ''),
                      patient_age: String(pi.age || '').replace('岁', ''),
                      patient_pregnancy: pi.pregnancy || ''
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
            next()
          })
        }
      },
      {
        name: 'prompt-server',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.method === 'GET' && req.url.split('?')[0].startsWith('/api/prompts/')) {
              const name = req.url.split('?')[0].replace('/api/prompts/', '')
              // 路径穿越防护：仅允许字母数字连字符下划线的 .txt 文件名
              if (!/^[a-zA-Z0-9_-]+\.txt$/.test(name)) {
                res.writeHead(400, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({ ok: false, error: 'Invalid prompt file name' }))
                return
              }
              const filePath = path.join(PROMPTS_DIR, name)
              try {
                if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
                  const content = fs.readFileSync(filePath, 'utf-8')
                  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' })
                  res.end(content)
                  return
                }
              } catch (e) { /* fall through */ }
              res.writeHead(404, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ ok: false, error: 'Prompt file not found' }))
              return
            }
            next()
          })
        }
      },
      {
        name: 'settings-api',
        configureServer(server) {
          const SETTINGS_FILE = path.resolve(__dirname, 'public/config/settings.json')
          server.middlewares.use(async (req, res, next) => {
            if (req.url.split('?')[0] === '/api/settings') {
              // CORS
              res.setHeader('Access-Control-Allow-Origin', '*')
              res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
              res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
              if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return }

              if (req.method === 'GET') {
                try {
                  const data = fs.readFileSync(SETTINGS_FILE, 'utf-8')
                  res.writeHead(200, { 'Content-Type': 'application/json' })
                  res.end(data)
                } catch (e) {
                  res.writeHead(500, { 'Content-Type': 'application/json' })
                  res.end(JSON.stringify({ ok: false, error: e.message }))
                }
                return
              }

              if (req.method === 'POST') {
                try {
                  const body = await parseRequestBody(req)
                  const existing = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'))
                  Object.assign(existing, body)
                  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(existing, null, 2), 'utf-8')
                  res.writeHead(200, { 'Content-Type': 'application/json' })
                  res.end(JSON.stringify({ ok: true, data: existing }))
                } catch (e) {
                  res.writeHead(500, { 'Content-Type': 'application/json' })
                  res.end(JSON.stringify({ ok: false, error: e.message }))
                }
                return
              }

              next()
              return
            }
            next()
          })
        }
      },
      {
        name: 'logs-api',
        configureServer(server) {
          const LOGS_DIR = path.resolve(__dirname, 'public/logs')
          if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true })
          server.middlewares.use(async (req, res, next) => {
            if (req.url.split('?')[0] === '/api/logs' && req.method === 'POST') {
              res.setHeader('Access-Control-Allow-Origin', '*')
              res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
              res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
              if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return }
              try {
                const body = await parseRequestBody(req)
                const ts = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19)
                const caseId = (body.caseId || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '')
                const filename = `${ts}_${caseId}.json`
                const payload = {
                  savedAt: new Date().toISOString(),
                  caseId: body.caseId || 'unknown',
                  rounds: body.rounds || [],
                  totalRounds: (body.rounds || []).length
                }
                fs.writeFileSync(path.join(LOGS_DIR, filename), JSON.stringify(payload, null, 2), 'utf-8')
                const files = fs.readdirSync(LOGS_DIR).filter(f => f.endsWith('.json')).sort()
                while (files.length > 50) {
                  fs.unlinkSync(path.join(LOGS_DIR, files.shift()))
                }
                res.writeHead(200, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({ ok: true, filename }))
              } catch (e) {
                res.writeHead(500, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({ ok: false, error: e.message }))
              }
              return
            }
            next()
          })
        }
      },
      {
        name: 'llm-proxy',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.method === 'POST' && req.url.split('?')[0] === '/api/llm') {
              if (!LLM_API_KEY || LLM_API_KEY === 'your-api-key-here') {
                res.writeHead(503, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({ ok: false, error: 'LLM API key not configured' }))
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

              const { messages, temperature = 0.7, max_tokens = 4000, system, model: reqModel } = body
              if (!messages || !Array.isArray(messages)) {
                res.writeHead(400, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({ ok: false, error: 'Missing messages array' }))
                return
              }

              try {
                const controller = new AbortController()
                const timeout = setTimeout(() => controller.abort(), 180000)

                const llmMessages = system
                  ? [{ role: 'system', content: system }, ...messages]
                  : messages

                const usedModel = reqModel || LLM_MODEL

                // 对话场景：显式关闭深度思考，确保低延迟
                const reqBody = {
                  model: usedModel,
                  messages: llmMessages,
                  temperature,
                  max_tokens
                }
                if (usedModel.startsWith('deepseek')) {
                  reqBody.thinking = { type: 'disabled' }
                } else if (usedModel.startsWith('qwen')) {
                  reqBody.enable_thinking = false
                }

                const response = await fetch(LLM_API_URL, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${LLM_API_KEY}`
                  },
                  body: JSON.stringify(reqBody),
                  signal: controller.signal
                })
                clearTimeout(timeout)

                if (!response.ok) {
                  const errText = await response.text()
                  res.writeHead(response.status, { 'Content-Type': 'application/json' })
                  res.end(JSON.stringify({ ok: false, error: `LLM API error ${response.status}: ${errText}` }))
                  return
                }

                if (reqModel) console.log(`[llm] 请求指定模型: ${reqModel} → 实际使用: ${usedModel}`)
                const result = await response.json()
                const content = result.choices?.[0]?.message?.content || ''
                res.writeHead(200, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({ ok: true, content, model: usedModel }))
              } catch (e) {
                res.writeHead(500, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({ ok: false, error: e.message }))
              }
              return
            }
            next()
          })
        }
      },
      (() => {
        let outDir
        return {
          name: 'copy-cases-build',
          apply: 'build',
          configResolved(config) { outDir = config.build.outDir },
          closeBundle() {
            if (!outDir) return
            const destDir = path.join(outDir, 'data', 'cases')
            fs.mkdirSync(destDir, { recursive: true })

            if (fs.existsSync(ADMIN_CASES_DIR)) {
              const files = fs.readdirSync(ADMIN_CASES_DIR).filter(f => f.endsWith('.json'))
              for (const f of files) {
                fs.copyFileSync(path.join(ADMIN_CASES_DIR, f), path.join(destDir, f))
              }

              const basicFiles = files.filter(f => f.endsWith('-basic.json'))
              const index = []
              for (const f of basicFiles) {
                try {
                  const data = JSON.parse(fs.readFileSync(path.join(ADMIN_CASES_DIR, f), 'utf-8'))
                  const caseId = f.replace('-basic.json', '')
                  const pi = data.patient_info || {}
                  index.push({
                    id: caseId,
                    case_id: data.case_id || caseId,
                    title: data.title || data.disease || caseId,
                    specialty: data.specialty || '',
                    disease: data.disease || '',
                    difficulty: data.difficulty || data.teaching_phase || '',
                    training_phase: data.training_phase || '',
                    category: data.category || '',
                    chief_complaint: data.chief_complaint || '',
                    symptoms: data.symptoms || [],
                    source: '平台',
                    patient_name: pi.name || '',
                    patient_gender: pi.sex === '1' || pi.sex === '男' ? '男' : (pi.sex === '0' || pi.sex === '女' ? '女' : ''),
                    patient_age: String(pi.age || '').replace('岁', ''),
                    patient_pregnancy: pi.pregnancy || ''
                  })
                } catch (e) { /* skip corrupt */ }
              }
              fs.writeFileSync(path.join(outDir, 'data', 'case-index.json'), JSON.stringify(index), 'utf-8')
              console.log(`[copy-cases-build] 已复制 ${files.length} 个病例文件，索引 ${index.length} 条`)
            }
          }
        }
      })(),
      (() => {
        let outDir
        return {
          name: 'generate-api-cases',
          apply: 'build',
          configResolved(config) { outDir = config.build.outDir },
          closeBundle() {
            if (!outDir) return
            const apiDir = path.join(outDir, 'api')
            fs.mkdirSync(apiDir, { recursive: true })
            const indexPath = path.join(outDir, 'data', 'case-index.json')
            if (fs.existsSync(indexPath)) {
              fs.copyFileSync(indexPath, path.join(apiDir, 'cases.json'))
            }
          }
        }
      })()
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '@ai-sp/shared/score-sheet-parser': fileURLToPath(new URL('../../packages/shared/src/score-sheet-parser.js', import.meta.url)),
        '@ai-sp/shared/score-tables': fileURLToPath(new URL('../../packages/shared/data/score-tables/index.js', import.meta.url)),
        '@ai-sp/shared/physical-exam-engine': fileURLToPath(new URL('../../packages/shared/src/physical-exam-engine.js', import.meta.url)),
        '@ai-sp/shared/test-selection-engine': fileURLToPath(new URL('../../packages/shared/src/test-selection-engine.js', import.meta.url)),
        '@ai-sp/shared/diagnosis-engine': fileURLToPath(new URL('../../packages/shared/src/diagnosis-engine.js', import.meta.url)),
        '@ai-sp/shared': fileURLToPath(new URL('../../packages/shared', import.meta.url))
      }
    },
    define: {
      'import.meta.env.VITE_ADMIN_URL': JSON.stringify(env.VITE_ADMIN_URL || ''),
      'import.meta.env.VITE_TRAINING_URL': JSON.stringify(''),
      'import.meta.env.VITE_EXAM_URL': JSON.stringify(env.VITE_EXAM_URL || ''),
      'import.meta.env.VITE_OPS_URL': JSON.stringify(env.VITE_OPS_URL || ''),
      'import.meta.env.VITE_APP_TRAINING_URL': JSON.stringify(env.VITE_APP_TRAINING_URL || ''),
    },
    server: {
      port: 5001,
      proxy: {
        '/api/sp': {
          target: 'http://localhost:5100',
          changeOrigin: true
        },
        '/api/score-report': {
          target: 'http://localhost:5100',
          changeOrigin: true
        },
        '/api/score-sheet': {
          target: 'http://localhost:5100',
          changeOrigin: true
        },
        '/api/training': {
          target: 'http://localhost:5100',
          changeOrigin: true
        }
      }
    }
  }
})
