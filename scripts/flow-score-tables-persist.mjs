// Vite 插件：为 flow-score-tables.json 提供读写 API
// 使管理端"临床思维全流程评分表"配置可跨端持久化
// 生产环境由 services/prod-server/src/routes/flow-score-tables.js 提供同路径 API

import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_FILE = resolve(__dirname, '../packages/shared/data/flow-score-tables.json')

async function readData() {
  try {
    const raw = await readFile(DATA_FILE, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return null
  }
}

async function writeData(data) {
  await writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8')
}

export default function flowScoreTablesPersist() {
  return {
    name: 'flow-score-tables-persist',
    configureServer(server) {
      server.middlewares.use('/api/flow-score-tables', async (req, res, next) => {
        if (req.method === 'GET') {
          const data = await readData()
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
              await writeData(body)
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
