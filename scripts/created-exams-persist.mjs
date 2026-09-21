// Vite 插件：为 created-exams.json 提供读写 API
// 解决多端（admin/training 等）localStorage 不互通的问题 —— 管理端创建考核、学员端读派发任务
// 生产环境应替换为后端 API

import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_FILE = resolve(__dirname, '../packages/shared/data/created-exams.json')

async function readExams() {
  try {
    const raw = await readFile(DATA_FILE, 'utf-8')
    const data = JSON.parse(raw)
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

async function writeExams(data) {
  await writeFile(DATA_FILE, JSON.stringify(Array.isArray(data) ? data : [], null, 2), 'utf-8')
}

export default function createdExamsPersist() {
  return {
    name: 'created-exams-persist',
    configureServer(server) {
      // GET  — 读取已创建的考核（派发任务数组）
      server.middlewares.use('/api/created-exams', async (req, res, next) => {
        if (req.method === 'GET') {
          const data = await readExams()
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
              await writeExams(body)
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
