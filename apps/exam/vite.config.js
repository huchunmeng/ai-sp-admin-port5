import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import fs from 'node:fs'
import path from 'node:path'
import annoPlugin from '../../scripts/anno-plugin.mjs'
import stationSchemesPersist from '../../scripts/station-schemes-persist.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ADMIN_PUBLIC_DIR = path.resolve(__dirname, '../admin/public')
const ADMIN_DATA_DIR = path.resolve(__dirname, '../admin/public/data')

/** 读请求体（llm 代理用） */
function parseRequestBody(req) {
  return new Promise((resolve, reject) => {
    let raw = ''
    req.on('data', c => { raw += c })
    req.on('end', () => { try { resolve(JSON.parse(raw || '{}')) } catch (e) { reject(e) } })
    req.on('error', reject)
  })
}

/**
 * /api/llm 代理 —— 考核端也要能跑评分（现场考站机同样走 AI 评阅）。
 * 密钥**复用训练端的 .env**，不在考试端重复维护一份。
 */
function llmProxyPlugin(env) {
  const KEY = env.LLM_API_KEY || ''
  const API_URL = env.LLM_API_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'
  const MODEL = env.LLM_MODEL || 'qwen-turbo'
  if (KEY && KEY !== 'your-api-key-here') console.log('[vite] ✓ LLM 代理（考核端）：已配置 (' + MODEL + ')')
  return {
    name: 'llm-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!(req.method === 'POST' && req.url.split('?')[0] === '/api/llm')) return next()
        if (!KEY || KEY === 'your-api-key-here') {
          res.writeHead(503, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ ok: false, error: 'LLM API key not configured' }))
          return
        }
        let body
        try { body = await parseRequestBody(req) } catch (e) {
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
          const usedModel = reqModel || MODEL
          const reqBody = {
            model: usedModel,
            messages: system ? [{ role: 'system', content: system }, ...messages] : messages,
            temperature,
            max_tokens
          }
          if (usedModel.startsWith('deepseek')) reqBody.thinking = { type: 'disabled' }
          else if (usedModel.startsWith('qwen')) reqBody.enable_thinking = false
          const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${KEY}` },
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
          const result = await response.json()
          const content = result.choices?.[0]?.message?.content || ''
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ ok: true, content, model: usedModel }))
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ ok: false, error: e.message }))
        }
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
      // 影像报告书写考核：阅片器素材（16-bit .bin.gz / JPEG / _series.json）同样来自 admin/public
      server.middlewares.use('/data/imaging-samples', (req, res, next) => {
        const filePath = path.join(ADMIN_DATA_DIR, 'imaging-samples', req.url.split('?')[0])
        try {
          if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            const ext = path.extname(filePath).toLowerCase()
            const mimeMap = {
              '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
              '.json': 'application/json', '.gz': 'application/gzip', '.bin': 'application/octet-stream'
            }
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

export default defineConfig(({ mode }) => ({
  base: '/',
  plugins: [annoPlugin(), stationSchemesPersist(), serveAdminPublicPlugin(), llmProxyPlugin(loadEnv(mode, path.resolve(__dirname, '../training'), '')), vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // 作答页共享模块（阅片器 + 四段式 + 成绩报告），与学员端同一套实现
      '@ai-sp/shared/imaging-ui': fileURLToPath(new URL('../../packages/shared/imaging-ui/index.js', import.meta.url)),
      '@ai-sp/shared/imaging': fileURLToPath(new URL('../../packages/shared/data/imaging/index.js', import.meta.url)),
      '@ai-sp/shared': fileURLToPath(new URL('../../packages/shared/src/index.js', import.meta.url))
    }
  },
  define: {
    'import.meta.env.VITE_ADMIN_URL': JSON.stringify(process.env.VITE_ADMIN_URL || ''),
    'import.meta.env.VITE_TRAINING_URL': JSON.stringify(process.env.VITE_TRAINING_URL || ''),
    'import.meta.env.VITE_EXAM_URL': JSON.stringify(''),
    'import.meta.env.VITE_OPS_URL': JSON.stringify(process.env.VITE_OPS_URL || ''),
    'import.meta.env.VITE_APP_TRAINING_URL': JSON.stringify(process.env.VITE_APP_TRAINING_URL || ''),
  },
  server: {
    port: 5003
  }
}))
