// Vite 插件：为 station-schemes-edits.json 提供读写 API
// 解决多端（admin/ops 等）localStorage 不互通的问题
// 生产环境应替换为后端 API

import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_FILE = resolve(__dirname, '../packages/shared/data/station-schemes-edits.json')

async function readEdits() {
  try {
    const raw = await readFile(DATA_FILE, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

async function writeEdits(data) {
  await writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8')
}

export default function stationSchemesPersist() {
  return {
    name: 'station-schemes-persist',
    configureServer(server) {
      // GET  — 读取当前编辑数据
      server.middlewares.use('/api/station-schemes-edits', async (req, res, next) => {
        if (req.method === 'GET') {
          const data = await readEdits()
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify(data))
          return
        }
        if (req.method === 'POST') {
          const chunks = []
          req.on('data', c => chunks.push(c))
          req.on('end', async () => {
            try {
              const body = JSON.parse(Buffer.concat(chunks).toString())
              await writeEdits(body)
              res.writeHead(200, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ ok: true }))
            } catch (e) {
              res.writeHead(400, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ ok: false, error: e.message }))
            }
          })
          return
        }
        next()
      })
    }
  }
}
