// 考核会话与成绩的本地存储（零依赖）
//
// 形状：
// {
//   version: 1,
//   sessions: {
//     "<taskId>::<candidateId|anon>": {
//       sessionId, taskId, candidateId, clientId,
//       startedAt, deadline,                       // ← 服务端签发，唯一可信时间
//       answers, leaveCount, superseded,
//       submitted, submittedAt,                    // ← 交卷即锁定（先落库再评阅）
//       status: 'open'|'grading'|'done'|'failed',
//       results: { caseId: result } | null,
//       error, gradedAt, createdAt, updatedAt
//     }
//   }
// }
//
// 为什么用文件：本轮是单机原型，生产应换成真正的数据库/并发控制（见文件顶部注释与设计文档）。
// 写入用「临时文件 + rename」保证不写坏；每次写盘做整体序列化，量级足够小。

import { readFileSync, writeFileSync, mkdirSync, existsSync, renameSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.resolve(__dirname, '../data')
const DATA_FILE = path.join(DATA_DIR, 'exam-store.json')

const EMPTY = { version: 1, sessions: {} }

let store = null

function ensureDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
}

export function loadStore() {
  if (store) return store
  ensureDir()
  try {
    const raw = readFileSync(DATA_FILE, 'utf-8')
    const parsed = JSON.parse(raw)
    store = parsed && typeof parsed === 'object' && parsed.sessions ? parsed : { ...EMPTY }
  } catch {
    store = { ...EMPTY }
    saveStore()
  }
  return store
}

export function saveStore() {
  ensureDir()
  const tmp = DATA_FILE + '.tmp'
  writeFileSync(tmp, JSON.stringify(store, null, 2), 'utf-8')
  renameSync(tmp, DATA_FILE)
}

/** 一个考次对一名考生只有一份会话 → 用它作为稳定 id，续答天然成立 */
export function sessionIdOf(taskId, candidateId) {
  return `${taskId}::${candidateId || 'anon'}`
}

export function getSession(sessionId) {
  return loadStore().sessions[sessionId] || null
}

export function listSessions(filter = {}) {
  const all = Object.values(loadStore().sessions)
  return filter.taskId ? all.filter(s => s.taskId === filter.taskId) : all
}

export function putSession(session) {
  const s = loadStore()
  session.updatedAt = new Date().toISOString()
  s.sessions[session.sessionId] = session
  saveStore()
  return session
}

/** 测试/清理用：把存储恢复成空 */
export function resetStore() {
  store = { ...EMPTY, sessions: {} }
  saveStore()
  return store
}

export { DATA_FILE }
