// 考试会话 —— 服务端计时 / 断线续答 / 单点作答（**无服务时自动回落到本地实现**）
//
// 这一个 composable 同时服务两种考试方式（现场考站机、在线自有设备），
// 差别只在"谁来保证时间可信"：现场由考场环境兜底，在线只能靠服务端（见《考核功能设计》§5.0.1 O1–O3）。
//
// ══ ★ 服务端契约（`services/exam-api`，端口 5110，各端 vite 代理 /api/exam）══
//   GET   /api/exam/tasks                     → { tasks: [{...task, state}] }（不含金标准）
//   GET   /api/exam/sessions?taskId=&candidateId= → { session|null, score }
//   POST  /api/exam/sessions  { taskId, candidateId, clientId }
//         → { sessionId, startedAt, deadline, resumed, superseded, submitted, status, answers, leaveCount }
//   GET   /api/exam/sessions/:sessionId       → { session }
//   PATCH /api/exam/sessions/:sessionId  { answers, leaveCount, clientId } → { ok, savedAt }
//   POST  /api/exam/sessions/:sessionId/submit { answers, leaveCount }     → { submittedAt, status }
//   GET   /api/exam/sessions/:sessionId/score → { status, results?, error? }
//   GET   /api/exam/scores?taskId=            → { scores: [...] }
//
// **回落策略**：服务端不可达（fetch 抛错 / 5xx / 404 端点不存在）时，
// 会话与计时退回本地 localStorage 实现 —— 行为与本轮之前完全一致，保证"没起服务也能练、也能考"。
// 服务端返回 **4xx 业务错误**（不在窗口 / 不允许重考）时同样走本地逻辑，但把错误挂在 `serverError` 上，
// 页面可以据此提示；这样既不让 UI 崩，也不至于把"服务端说不行"当成"服务端坏了"。

import { ref } from 'vue'

const STORE_KEY = 'report_writing_exam_sessions_v1'
const CLIENT_KEY = 'report_writing_exam_client'
const API = '/api/exam'
const PROBE_TIMEOUT_MS = 2500

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

/* ── 服务端调用（带超时；失败不抛，交给调用方回落）── */
async function api(path, { method = 'GET', body, timeout = 8000 } = {}) {
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), timeout)
  try {
    const resp = await fetch(API + path, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal
    })
    let json = null
    try { json = await resp.json() } catch (e) { /* 非 JSON */ }
    return { reachable: true, status: resp.status, ok: resp.ok, json }
  } catch (e) {
    return { reachable: false, status: 0, ok: false, json: null, error: e.message }
  } finally {
    clearTimeout(t)
  }
}

let serverProbe = null   // null = 未探测；true/false = 结果
/** 探测服务端是否可用（结果缓存，避免每次开考都多一个来回） */
export async function probeExamServer() {
  if (serverProbe !== null) return serverProbe
  const r = await api('/health', { timeout: PROBE_TIMEOUT_MS })
  serverProbe = !!(r.reachable && r.ok)
  return serverProbe
}
/** 测到服务端不可用时清掉缓存，下次操作会重新探测（比如用户之后又起了服务） */
export function invalidateExamServerProbe() { serverProbe = null }

/** 对外暴露的 API 客户端（任务列表 / 成绩查询用） */
export const examApi = {
  probe: probeExamServer,
  invalidate: invalidateExamServerProbe,
  async tasks() {
    const r = await api('/tasks')
    return r.ok && r.json && Array.isArray(r.json.tasks) ? { server: true, tasks: r.json.tasks } : { server: false, tasks: [] }
  },
  async sessionOf(taskId, candidateId = '') {
    const q = `?taskId=${encodeURIComponent(taskId)}&candidateId=${encodeURIComponent(candidateId)}`
    const r = await api('/sessions' + q)
    return r.ok && r.json ? r.json : null
  },
  async score(sessionId) {
    const r = await api(`/sessions/${encodeURIComponent(sessionId)}/score`)
    return r.ok && r.json ? r.json : null
  },
  async scores(taskId = '') {
    const r = await api('/scores' + (taskId ? `?taskId=${encodeURIComponent(taskId)}` : ''))
    return r.ok && r.json && Array.isArray(r.json.scores) ? r.json.scores : null
  }
}

/* ── 本地存储（回落实现，也是服务端会话 id 的本地索引）── */
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
  const next = { ...(all[taskId] || {}), ...patch, savedAt: Date.now() }
  all[taskId] = next
  writeAll(all)
  // 服务端会话 → 后台把草稿上报（不阻塞作答；失败静默，下一次上报会带上最新答卷）
  if (next.server && next.serverSessionId) {
    api(`/sessions/${encodeURIComponent(next.serverSessionId)}`, {
      method: 'PATCH',
      body: { answers: next.answers, leaveCount: next.leaveCount, clientId: next.clientId },
      timeout: 8000
    }).catch(() => {})
  }
  return next
}

/**
 * 开考或续答。优先服务端（时间可信），不可用则回落本地。
 * @param {string} sessionKey 本地索引键（= taskId，或 `${taskId}::${candidateId}`）
 * @param {number} durationMin 时长
 * @param {object} answersOfPaper 初始答卷
 * @param {{taskId?:string, candidateId?:string}} opts
 * @returns {Promise<{session:object, resumed:boolean, mine:boolean, adopted:boolean, server:boolean, serverError?:object}>}
 */
export async function startOrResume(sessionKey, durationMin, answersOfPaper, opts = {}) {
  const clientId = currentClientId()
  const candidateId = opts.candidateId || ''
  const taskId = opts.taskId || sessionKey

  if (await probeExamServer()) {
    const r = await api('/sessions', { method: 'POST', body: { taskId, candidateId, clientId } })
    if (r.ok && r.json) {
      // 服务端返回的 answers 是权威的（跨设备续答）
      const s = r.json
      const session = saveSession(sessionKey, {
        taskId,
        candidateId,
        clientId,
        server: true,
        serverSessionId: s.sessionId,
        startedAt: s.startedAt,
        deadline: s.deadline,
        answers: (s.answers && Object.keys(s.answers).length) ? s.answers : (answersOfPaper || {}),
        leaveCount: s.leaveCount || 0,
        superseded: s.superseded || 0,
        submitted: !!s.submitted,
        submittedAt: s.submittedAt || '',
        status: s.status || 'open'
      })
      return { session, resumed: !!s.resumed, mine: s.mine !== false, adopted: !!s.adopted, server: true }
    }
    if (r.reachable && r.status >= 400 && r.status < 500) {
      // 业务拒绝（窗口/重考）—— 回落本地，但把原因交给页面提示
      const local = await localStartOrResume(sessionKey, durationMin, answersOfPaper, clientId, taskId, candidateId)
      return { ...local, server: false, serverError: r.json || { code: 'REJECTED', message: `服务端拒绝（${r.status}）` } }
    }
    invalidateExamServerProbe()   // 5xx / 网络问题 → 后面按无服务处理
  }

  const local = await localStartOrResume(sessionKey, durationMin, answersOfPaper, clientId, taskId, candidateId)
  return { ...local, server: false }
}

/** 本地实现（原逻辑，行为未变）：已有未交卷且未到点 → 续答，不重置时钟 */
async function localStartOrResume(sessionKey, durationMin, answersOfPaper, clientId, taskId, candidateId) {
  const existing = loadSession(sessionKey)
  if (existing && !existing.submitted && existing.deadline > Date.now()) {
    const mine = !existing.clientId || existing.clientId === clientId
    const next = saveSession(sessionKey, {
      clientId,
      server: false,
      superseded: (existing.superseded || 0) + (mine ? 0 : 1)   // 单点作答：顶掉旧会话并留痕
    })
    return { session: next, resumed: true, mine, adopted: !mine }
  }
  const startedAt = Date.now()
  const session = saveSession(sessionKey, {
    taskId,
    candidateId,
    clientId,
    server: false,
    startedAt,
    deadline: startedAt + durationMin * 60 * 1000,
    answers: answersOfPaper || {},
    leaveCount: 0,
    superseded: existing?.superseded || 0,
    submitted: false,
    submittedAt: '',
    status: 'open'
  })
  return { session, resumed: false, mine: true, adopted: false }
}

/**
 * 交卷：**先本地锁定，再上报服务端**。
 * @returns {Promise<{ok:boolean, server:boolean, serverSessionId?:string, status?:string,
 *                    submittedAt:string, alreadySubmitted?:boolean, serverError?:object}>}
 */
export async function submitSession(sessionKey, patch = {}) {
  const local = saveSession(sessionKey, { ...patch, submitted: true, submittedAt: new Date().toISOString() })
  if (local.server && local.serverSessionId) {
    const r = await api(`/sessions/${encodeURIComponent(local.serverSessionId)}/submit`, {
      method: 'POST',
      body: { answers: local.answers, leaveCount: local.leaveCount },
      timeout: 15000
    })
    if (r.ok && r.json) {
      saveSession(sessionKey, { status: r.json.status || 'grading', submittedAt: r.json.submittedAt || local.submittedAt })
      return { ok: true, server: true, serverSessionId: local.serverSessionId, status: r.json.status || 'grading', submittedAt: r.json.submittedAt || local.submittedAt, alreadySubmitted: !!r.json.alreadySubmitted }
    }
    // 服务端提交失败 → 交给页面回落到前端评分（答卷至少已锁在本地）
    return { ok: false, server: false, submittedAt: local.submittedAt, serverError: r.json || { message: r.error || '服务端不可达' } }
  }
  return { ok: true, server: false, submittedAt: local.submittedAt }
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

/** 兼容旧引用：原来导出过一个"服务端适配层"常量，现已并入上面的函数 */
export const EXAM_SERVER = { isMock: false, api }
