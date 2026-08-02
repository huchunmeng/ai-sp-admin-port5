import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import fs from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import path from 'node:path'
import annoPlugin from '../../scripts/anno-plugin.mjs'
import stationSchemesPersist from '../../scripts/station-schemes-persist.mjs'
import flowScoreTablesPersist from '../../scripts/flow-score-tables-persist.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ── 动态加载 AI 生成插件（gitignored）或 Mock 降级 ──────────

let realAiGenPlugin = null
try {
  realAiGenPlugin = (await import('./ai-gen-plugin.js')).aiGenPlugin
} catch {
  // ai-gen-plugin.js 不存在（git clone 后正常状态）
}
const { mockGenPlugin } = await import('./mock-gen.js')

function resolveGenPlugin(env) {
  const hasKey = env.VITE_ENABLE_AI_GENERATE === 'true'
    && env.AI_GENERATE_API_KEY
    && env.AI_GENERATE_API_KEY !== 'your-api-key-here'

  if (realAiGenPlugin && hasKey) {
    console.log('[vite] ✓ AI 生成：真实 API 模式')
    return realAiGenPlugin(env)
  }

  // 降级到 Mock 模式
  if (realAiGenPlugin) {
    console.log('[vite] ╔══════════════════════════════════════════════╗')
    console.log('[vite] ║  ⚠ 未配置 AI API Key，已自动切换 Mock 模式 ║')
    console.log('[vite] ║                                              ║')
    console.log('[vite] ║  在 apps/admin/.env.local 中配置：             ║')
    console.log('[vite] ║    VITE_ENABLE_AI_GENERATE=true              ║')
    console.log('[vite] ║    AI_GENERATE_API_KEY=你的密钥              ║')
    console.log('[vite] ╚══════════════════════════════════════════════╝')
  } else {
    console.log('[vite] ℹ AI 生成插件未安装，使用 Mock 演示模式')
  }

  return mockGenPlugin(env)
}

// ── 构建时扫描 cases/ 目录生成静态索引 ─────────────────

function buildCasesIndexPlugin() {
  let outDir
  return {
    name: 'build-cases-index',
    configResolved(config) {
      outDir = config.build.outDir
    },
    closeBundle() {
      const casesDir = path.resolve(__dirname, 'public/data/cases')
      if (!fs.existsSync(casesDir)) return
      const files = fs.readdirSync(casesDir)
      const basicFiles = files.filter(f => f.endsWith('-basic.json'))
      const cases = []
      for (const f of basicFiles) {
        try {
          const data = JSON.parse(fs.readFileSync(path.join(casesDir, f), 'utf-8'))
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
            source: data.source || '',
            caseLevel: data.caseLevel || '',
            creator_name: data.creator_name || '',
            created_at: data.record_date || '',
            enabled: true,
            patient_name: pi.name || '',
            patient_gender: pi.sex || '',
            patient_age: String(pi.age || '').replace('岁', ''),
            patient_pregnancy: pi.pregnancy || ''
          })
        } catch (e) { /* skip broken files */ }
      }
      const indexPath = path.resolve(outDir, 'data/cases/cases-index.json')
      const indexDir = path.dirname(indexPath)
      if (!fs.existsSync(indexDir)) fs.mkdirSync(indexDir, { recursive: true })
      fs.writeFileSync(indexPath, JSON.stringify(cases, null, 2))
      console.log(`[build-cases-index] 生成病例索引: ${cases.length} 条 → ${indexPath}`)
    }
  }
}

function settingsPlugin() {
  const SETTINGS_FILE = path.resolve(__dirname, 'public/config/settings.json')

  function parseBody(req) {
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

  return {
    name: 'admin-settings-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url.split('?')[0] === '/api/settings') {
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
              const body = await parseBody(req)
              const existing = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'))
              Object.assign(existing, body)
              fs.writeFileSync(SETTINGS_FILE, JSON.stringify(existing, null, 2), 'utf-8')
              console.log('[settings] 管理端配置已更新:', JSON.stringify(body))
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
  }
}

// ── 原始病历素材库 + MDT 病例 数据 API（单文件 JSON 集合）──

const RAW_RECORDS_DIR = path.resolve(__dirname, 'public/data/raw-records')
const MDT_CASES_DIR = path.resolve(__dirname, 'public/data/mdt-cases')

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

function parseJsonBody(req) {
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

function corsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

const SAFE_ID = /^[a-zA-Z0-9_-]+$/

// 单文件 JSON 集合通用 API：GET 索引 / POST 保存 / GET 详情 / DELETE
function jsonCollectionApi(name, dir, suffix, buildSummary) {
  const filePath = (id) => path.join(dir, `${id}${suffix}`)
  return {
    name,
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const urlPath = req.url.split('?')[0]
        const prefix = `/api/${name}/`
        const isCollection = urlPath === `/api/${name}`
        if (!isCollection && !urlPath.startsWith(prefix)) { next(); return }
        if (req.method === 'OPTIONS') { corsHeaders(res); res.writeHead(204); res.end(); return }

        if (isCollection) {
          if (req.method === 'GET') {
            corsHeaders(res)
            try {
              ensureDir(dir)
              const files = fs.readdirSync(dir).filter(f => f.endsWith(suffix))
              const list = []
              for (const f of files) {
                try {
                  const data = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8'))
                  list.push(buildSummary(data, f.replace(suffix, '')))
                } catch (e) { /* skip corrupt */ }
              }
              res.writeHead(200, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify(list))
            } catch (e) {
              res.writeHead(500, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ ok: false, error: e.message }))
            }
            return
          }
          if (req.method === 'POST') {
            corsHeaders(res)
            try {
              const body = await parseJsonBody(req)
              const id = String(body.id || '').trim()
              if (!id || !SAFE_ID.test(id)) {
                res.writeHead(400, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({ ok: false, error: 'Invalid or missing id' }))
                return
              }
              const data = body.data || {}
              ensureDir(dir)
              data.id = id
              data.updatedAt = new Date().toISOString()
              fs.writeFileSync(filePath(id), JSON.stringify(data, null, 2), 'utf-8')
              console.log(`[${name}] 保存: ${id}`)
              res.writeHead(200, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ ok: true, id }))
            } catch (e) {
              res.writeHead(500, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ ok: false, error: e.message }))
            }
            return
          }
          next(); return
        }

        const idMatch = urlPath.slice(prefix.length).replace(/\/$/, '')
        if (!idMatch || !SAFE_ID.test(idMatch)) { next(); return }
        if (req.method === 'GET') {
          corsHeaders(res)
          try {
            const fp = filePath(idMatch)
            if (!fs.existsSync(fp)) {
              res.writeHead(404, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ ok: false, error: 'Not found' }))
              return
            }
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(fs.readFileSync(fp, 'utf-8'))
          } catch (e) {
            res.writeHead(500, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: false, error: e.message }))
          }
          return
        }
        if (req.method === 'DELETE') {
          corsHeaders(res)
          try {
            const fp = filePath(idMatch)
            if (fs.existsSync(fp)) fs.unlinkSync(fp)
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: true, id: idMatch }))
          } catch (e) {
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

const rawRecordsApi = () => jsonCollectionApi('raw-records', RAW_RECORDS_DIR, '.json', (data, id) => {
  const pi = data.patientInfo || {}
  return {
    id,
    title: data.title || '',
    patientName: pi.name || '',
    gender: pi.gender || '',
    age: pi.age ?? '',
    specialty: data.specialty || '',
    disease: data.disease || '',
    recordType: data.recordType || '',
    source: data.source || '',
    importedAt: data.importedAt || data.updatedAt || ''
  }
})

const mdtCasesPersist = () => jsonCollectionApi('mdt-cases', MDT_CASES_DIR, '-mdt.json', (data, id) => {
  const pi = data.patientInfo || {}
  return {
    id,
    caseId: data.caseId || '',
    sourceType: data.sourceType || 'manual',
    patientName: pi.name || '',
    gender: pi.gender || '',
    age: pi.age ?? '',
    disciplines: data.disciplines || [],
    objective: data.objective || '',
    teachingPhase: data.teachingPhase || '',
    levelLabel: data.levelLabel || '',
    filterKey: data.filterKey || '',
    source: data.source || '',
    updatedAt: data.updatedAt || ''
  }
})

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '')

  return {
    base: '/',
    root: __dirname,
    plugins: [annoPlugin(), stationSchemesPersist(), flowScoreTablesPersist(), settingsPlugin(), rawRecordsApi(), mdtCasesPersist(), resolveGenPlugin(env), buildCasesIndexPlugin(), vue()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '@ai-sp/shared/score-tables': fileURLToPath(new URL('../../packages/shared/data/score-tables/index.js', import.meta.url)),
        '@ai-sp/shared': fileURLToPath(new URL('../../packages/shared', import.meta.url))
      }
    },
    define: {
      'import.meta.env.VITE_ADMIN_URL': JSON.stringify(''),
      'import.meta.env.VITE_TRAINING_URL': JSON.stringify(process.env.VITE_TRAINING_URL || ''),
      'import.meta.env.VITE_EXAM_URL': JSON.stringify(process.env.VITE_EXAM_URL || ''),
      'import.meta.env.VITE_OPS_URL': JSON.stringify(process.env.VITE_OPS_URL || ''),
      'import.meta.env.VITE_APP_TRAINING_URL': JSON.stringify(process.env.VITE_APP_TRAINING_URL || ''),
    },
    server: {
      port: 5002,
      proxy: {
        '/api/training': 'http://localhost:5100',
        '/api/score-report': 'http://localhost:5100'
      }
    }
  }
})
