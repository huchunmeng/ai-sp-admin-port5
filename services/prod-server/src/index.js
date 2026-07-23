import express from 'express'
import cors from 'cors'
import { createProxyMiddleware } from 'http-proxy-middleware'
import { createServer } from 'http'
import { WebSocket, WebSocketServer } from 'ws'
import path from 'path'
import { fileURLToPath } from 'url'
import config from './config.js'
import { mountAnnotations } from './routes/annotations.js'
import { mountStationSchemes } from './routes/station-schemes.js'
import { mountSettings } from './routes/settings.js'
import { mountAiGenerate } from './routes/ai-generate.js'
import { mountCaseCrud } from './routes/case-crud.js'
import { mountCaseIndex } from './routes/case-index.js'
import { mountPrompts } from './routes/prompts.js'
import { mountLogs } from './routes/logs.js'
import { mountLlmProxy } from './routes/llm-proxy.js'
import { mountVoiceConfig } from './routes/voice-config.js'
import { mountScoreReport } from './routes/score-report.js'
import { mountStaticFiles } from './routes/static-files.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()

// ── CORS ──
app.use(cors())
app.use(express.json({ limit: '50mb' }))

// ── API 路由 ──
mountAnnotations(app)
mountStationSchemes(app)
mountSettings(app)
mountAiGenerate(app)
mountCaseCrud(app)
mountCaseIndex(app)
mountPrompts(app)
mountLogs(app)
mountLlmProxy(app)
mountVoiceConfig(app)
mountScoreReport(app)

// ── SP API 代理 (HTTP) ──
app.use('/api/sp', createProxyMiddleware({
  target: `http://localhost:${config.SP_API_PORT}`,
  changeOrigin: true
}))

// ── 静态数据文件（cases, images, videos 等） ──
mountStaticFiles(app)

// ── 五端 SPA 静态服务 ──
const APPS_DIR = path.resolve(__dirname, '..', '..', '..', 'apps')

const SPA_APPS = [
  { name: 'admin', prefix: '/admin' },
  { name: 'training', prefix: '/training' },
  { name: 'exam', prefix: '/exam' },
  { name: 'app-training', prefix: '/app-training' },
  { name: 'ops', prefix: '/ops' },
]

for (const spa of SPA_APPS) {
  const distDir = path.join(APPS_DIR, spa.name, 'dist')
  app.use(spa.prefix, express.static(distDir))
  // SPA fallback
  app.get(`${spa.prefix}/*`, (req, res) => {
    res.sendFile(path.join(distDir, 'index.html'))
  })
}

// 根路径重定向
app.get('/', (_req, res) => res.redirect('/admin/'))

// ── 创建 HTTP 服务器（含 WebSocket 升级处理） ──
const server = createServer(app)

// ── WebSocket 代理（/api/sp/tts → sp-api） ──
const wss = new WebSocketServer({ noServer: true })

server.on('upgrade', (req, socket, head) => {
  const url = req.url || ''
  if (url.startsWith('/api/sp/tts')) {
    wss.handleUpgrade(req, socket, head, (clientWs) => {
      const targetWs = new WebSocket(`ws://localhost:${config.SP_API_PORT}${url}`)
      targetWs.on('open', () => {
        clientWs.on('message', (data, isBinary) => {
          targetWs.send(data, { binary: isBinary })
        })
        targetWs.on('message', (data, isBinary) => {
          clientWs.send(data, { binary: isBinary })
        })
      })
      clientWs.on('close', () => { try { targetWs.close() } catch {} })
      targetWs.on('close', () => { try { clientWs.close() } catch {} })
      clientWs.on('error', () => { try { targetWs.close() } catch {} })
      targetWs.on('error', () => { try { clientWs.close() } catch {} })
    })
  } else {
    socket.destroy()
  }
})

// ── 启动 ──
server.listen(config.PORT, () => {
  console.log(`[prod-server] Listening on http://localhost:${config.PORT}`)
  console.log(`[prod-server] Apps:`)
  for (const spa of SPA_APPS) {
    console.log(`  ${spa.prefix}/ → apps/${spa.name}/dist/`)
  }
  console.log(`[prod-server] DATA_DIR: ${config.DATA_DIR}`)
  console.log(`[prod-server] SP API proxy: /api/sp → localhost:${config.SP_API_PORT}`)
})
