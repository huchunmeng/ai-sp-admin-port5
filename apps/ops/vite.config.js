import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import fs from 'node:fs'
import path from 'node:path'
import annoPlugin from '../../scripts/anno-plugin.mjs'
import stationSchemesPersist from '../../scripts/station-schemes-persist.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ADMIN_CASES_DIR = path.resolve(__dirname, '../admin/public/data/cases')
const ADMIN_PUBLIC_DIR = path.resolve(__dirname, '../admin/public')
const VOICE_CONFIG_PATH = path.resolve(__dirname, '../admin/public/data/patient-voice-config.json')
const VOICE_CONFIG_SYNC_PATHS = [
  path.resolve(__dirname, '../training/public/data/patient-voice-config.json'),
  path.resolve(__dirname, '../exam/public/data/patient-voice-config.json'),
  path.resolve(__dirname, '../app-training/public/data/patient-voice-config.json'),
  path.resolve(__dirname, '../ops/public/data/patient-voice-config.json'),
]

function serveAdminCasesPlugin() {
  return {
    name: 'serve-admin-cases',
    configureServer(server) {
      server.middlewares.use('/data/cases', (req, res, next) => {
        const urlPath = req.url.split('?')[0]

        if (urlPath === '/cases-index.json') {
          try {
            if (!fs.existsSync(ADMIN_CASES_DIR)) { res.end('[]'); return }
            const files = fs.readdirSync(ADMIN_CASES_DIR)
            const basicFiles = files.filter(f => f.endsWith('-basic.json'))
            const cases = []
            for (const f of basicFiles) {
              try {
                const data = JSON.parse(fs.readFileSync(path.join(ADMIN_CASES_DIR, f), 'utf-8'))
                const prefix = f.replace('-basic.json', '')
                const pi = data.patient_info || {}
                cases.push({
                  id: prefix,
                  case_id: data.case_id || prefix,
                  title: data.title || data.disease || prefix,
                  specialty: data.specialty || '',
                  disease: data.disease || '',
                  difficulty: data.difficulty || '',
                  patient_name: pi.name || '',
                  patient_gender: pi.sex || '',
                  patient_age: String(pi.age || '').replace('岁', ''),
                  patient_pregnancy: pi.pregnancy || '',
                  source: data.source || '平台',
                  creator_name: data.creator_name || ''
                })
              } catch { /* skip broken files */ }
            }
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify(cases))
          } catch {
            res.writeHead(500, { 'Content-Type': 'application/json' })
            res.end('[]')
          }
          return
        }

        try {
          const filePath = path.join(ADMIN_CASES_DIR, urlPath)
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
        } catch { /* fall through */ }
        next()
      })
    }
  }
}

function serveAdminPublicPlugin() {
  return {
    name: 'serve-admin-public',
    configureServer(server) {
      server.middlewares.use('/images', (req, res, next) => {
        const filePath = path.join(ADMIN_PUBLIC_DIR, 'images', req.url.split('?')[0])
        try {
          if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            const ext = path.extname(filePath).toLowerCase()
            const mimeMap = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp' }
            res.writeHead(200, { 'Content-Type': mimeMap[ext] || 'application/octet-stream' })
            fs.createReadStream(filePath).pipe(res)
            return
          }
        } catch {}
        next()
      })
      server.middlewares.use('/videos', (req, res, next) => {
        const filePath = path.join(ADMIN_PUBLIC_DIR, 'videos', req.url.split('?')[0])
        try {
          if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            const ext = path.extname(filePath).toLowerCase()
            const mimeMap = { '.mp4': 'video/mp4', '.webm': 'video/webm' }
            res.writeHead(200, { 'Content-Type': mimeMap[ext] || 'application/octet-stream' })
            fs.createReadStream(filePath).pipe(res)
            return
          }
        } catch {}
        next()
      })
    }
  }
}

// TTS音色配置读取/保存 API
function voiceConfigPlugin() {
  return {
    name: 'voice-config-api',
    configureServer(server) {
      server.middlewares.use('/api/voice-config', (req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

        if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return }

        // GET — 返回当前配置
        if (req.method === 'GET') {
          try {
            if (fs.existsSync(VOICE_CONFIG_PATH)) {
              const data = fs.readFileSync(VOICE_CONFIG_PATH, 'utf-8')
              res.writeHead(200, { 'Content-Type': 'application/json' })
              res.end(data)
            } else {
              res.writeHead(404, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: 'voice config not found' }))
            }
          } catch (e) {
            res.writeHead(500, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: e.message }))
          }
          return
        }

        // POST — 保存配置（主文件 + 同步到所有副本）
        if (req.method === 'POST') {
          let body = ''
          req.on('data', chunk => { body += chunk })
          req.on('end', () => {
            try {
              const parsed = JSON.parse(body)
              const content = JSON.stringify(parsed, null, 2)
              fs.writeFileSync(VOICE_CONFIG_PATH, content, 'utf-8')
              for (const syncPath of VOICE_CONFIG_SYNC_PATHS) {
                try { fs.writeFileSync(syncPath, content, 'utf-8') } catch {}
              }
              res.writeHead(200, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ ok: true }))
            } catch (e) {
              res.writeHead(400, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: e.message }))
            }
          })
          return
        }

        res.writeHead(405); res.end()
      })
    }
  }
}

export default defineConfig(({ mode }) => ({
  base: '/',
  plugins: [annoPlugin(), stationSchemesPersist(), serveAdminCasesPlugin(), serveAdminPublicPlugin(), voiceConfigPlugin(), vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@ai-sp/shared': fileURLToPath(new URL('../../packages/shared/src/index.js', import.meta.url))
    }
  },
  define: {
    'import.meta.env.VITE_ADMIN_URL': JSON.stringify(process.env.VITE_ADMIN_URL || ''),
    'import.meta.env.VITE_TRAINING_URL': JSON.stringify(process.env.VITE_TRAINING_URL || ''),
    'import.meta.env.VITE_EXAM_URL': JSON.stringify(process.env.VITE_EXAM_URL || ''),
    'import.meta.env.VITE_APP_TRAINING_URL': JSON.stringify(process.env.VITE_APP_TRAINING_URL || ''),
    'import.meta.env.VITE_OPS_URL': JSON.stringify(process.env.VITE_OPS_URL || ''),
  },
  server: { port: 5005 }
}))
