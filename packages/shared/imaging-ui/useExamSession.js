// 考试会话 —— 断线续答 / 服务端计时契约 / 单点作答
//
// 这一个 composable 同时服务两种考试方式（现场考站机、在线自有设备），
// 差别只在"谁来保证时间可信"：现场由考场环境兜底，在线只能靠服务端（见《考核功能设计》§5.0.1 O1–O3）。
//
// ══ ★ 服务端契约（接后端时只替换 EXAM_SERVER，页面代码不用动）══
//   POST  /api/exam/sessions              { taskId }                     → { sessionId, startedAt, deadline }
//   PATCH /api/exam/sessions/:sessionId   { answers, leaveCount }        → 200
//   POST  /api/exam/sessions/:sessionId/submit { answers, leaveCount }   → { submittedAt }
//   GET   /api/exam/sessions?taskId=...                                  → 会话（用于续答）
// 原型阶段用 localStorage 顶替。**关键点**：deadline 在开考时一次写入并持久化成常量，
// 刷新页面不会重置时钟 —— 这是"断线续答"的下限；真正的可信计时仍需服务端签发。

import { ref } from 'vue'

const STORE_KEY = 'report_writing_exam_sessions_v1'
const CLIENT_KEY = 'report_writing_exam_client'

/** 本标签页 clientId：同标签页刷新不变，新开标签页/换设备会变 → 用于单点作答检测（O3） */
export function currentClientId() {
  try {
    let id = sessionStorage.getItem(CLIENT_KEY)
    if (!id) {
      id = 'c-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
      sessionStorage.setItem(CLIENT_KEY, id)
    }
    return id
  } catch (e) {
    return 'c-anon'
  }
}

/** 服务端契约适配层（原型为本地实现） */
export const EXAM_SERVER = {
  isMock: true,
  /** 开考：服务端签发 startedAt / deadline */
  async start(taskId, durationMin) {
    const startedAt = Date.now()
    return { sessionId: taskId, startedAt, deadline: startedAt + durationMin * 60 * 1000 }
  },
  /** 草稿上报（自动保存） */
  async save() { return { ok: true } },
  /** 交卷（服务端在此刻锁定答卷） */
  async submit() { return { ok: true, submittedAt: new Date().toISOString() } }
}

function readAll() {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (!raw) return {}
    const obj = JSON.parse(raw)
    return obj && typeof obj === 'object' ? obj : {}
  } catch (e) {
    return {}
  }
}

function writeAll(map) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(map)) } catch (e) { /* 隐私模式忽略 */ }
}

export function loadSession(taskId) {
  return readAll()[taskId] || null
}

export function saveSession(taskId, patch) {
  const all = readAll()
  all[taskId] = { ...(all[taskId] || {}), ...patch, savedAt: Date.now() }
  writeAll(all)
  return all[taskId]
}

/**
 * 开考或续答。
 * 已有未交卷会话 → 原样返回（**续答，不重置时钟**）；`mine:false` 表示这份会话属于另一个设备/标签页。
 */
export async function startOrResume(taskId, durationMin, answersOfPaper) {
  const clientId = currentClientId()
  const existing = loadSession(taskId)
  if (existing && !existing.submitted && existing.deadline > Date.now()) {
    const mine = existing.clientId === clientId
    const next = saveSession(taskId, {
      clientId,
      superseded: (existing.superseded || 0) + (mine ? 0 : 1)   // 单点作答：顶掉旧会话并留痕
    })
    return { session: next, resumed: true, mine, adopted: !mine }
  }
  const issued = await EXAM_SERVER.start(taskId, durationMin)
  const session = saveSession(taskId, {
    taskId,
    clientId,
    startedAt: issued.startedAt,
    deadline: issued.deadline,
    answers: answersOfPaper || {},
    leaveCount: 0,
    superseded: existing?.superseded || 0,
    submitted: false,
    submittedAt: ''
  })
  return { session, resumed: false, mine: true, adopted: false }
}

export function submitSession(taskId, patch) {
  return saveSession(taskId, { ...patch, submitted: true, submittedAt: new Date().toISOString() })
}

export function clearSession(taskId) {
  const all = readAll()
  delete all[taskId]
  writeAll(all)
}

export function remainingSec(session, now = Date.now()) {
  if (!session || !session.deadline) return 0
  return Math.max(0, Math.round((session.deadline - now) / 1000))
}

/** 页面用：把会话状态翻成任务状态 */
export function sessionStateOf(task, session, at = Date.now()) {
  if (session && session.submitted) return 'submitted'
  if (session && session.deadline > at) return 'inProgress'
  return ''
}

export function useExamSession() {
  const sessions = ref(readAll())
  function refresh() { sessions.value = readAll() }
  return { sessions, refresh, loadSession, saveSession, submitSession, clearSession, remainingSec }
}
