/**
 * 影像报告书写考核 · 服务端 API（零依赖 node:http，端口 5110）
 *
 * ══════════════════════════════════════════════════════════════════
 *  契约（三个前端：apps/training 在线考试 / apps/exam 现场考站机 / apps/admin 成绩查询）
 *
 *  GET  /api/exam/health                       → { ok, llmConfigured, sessions, model }
 *  GET  /api/exam/tasks                        → 任务数组（白名单字段 + state: notStarted|open|expired；无金标准）
 *  GET  /api/exam/tasks/:id                    → 单个任务
 *
 *  POST /api/exam/sessions  { taskId, candidateId?, clientId? }
 *       → { sessionId, startedAt, deadline, resumed, superseded, submitted, status, answers, leaveCount }
 *       · deadline 只在**首次开考**签发；已有未交卷且未到点 → 返回原 deadline（续答不重置时钟）
 *       · 同一考次换 clientId 接管 → superseded +1
 *       · **名单校验**：任务 candidates 非空时，只有名单内的考生能开考（学号或 id 任一匹配）
 *       · 404 TASK_NOT_FOUND / 409 OUT_OF_WINDOW / 409 RETAKE_NOT_ALLOWED
 *           / 403 NOT_IN_ROSTER（未派发给该考生）/ 400 BAD_REQUEST
 *  GET   /api/exam/sessions/:id                → 会话（含 answers/leaveCount/status）
 *  GET   /api/exam/sessions?taskId=&candidateId= → { session|null, score }
 *       · 任务列表页用：换设备/清了本地存储后，仍能从服务端拿回"这场我考过没有、出分没有"
 *  PATCH /api/exam/sessions/:id  { answers, leaveCount, clientId }
 *       → { ok, savedAt }
 *       · 409 SESSION_LOCKED（已交卷）/ 409 SESSION_EXPIRED（已到点，服务端同时自动结算）
 *  POST  /api/exam/sessions/:id/submit  { answers, leaveCount }
 *       → { submittedAt, status: 'grading', alreadySubmitted? }
 *       · **立即锁定答卷**（先落库），随后**异步入队评阅**；重复提交幂等
 *  GET   /api/exam/sessions/:id/score
 *       → { status: 'pending'|'grading'|'done'|'failed', results?, error?, gradedAt? }
 *       · results 是 `caseId → 评分结果`（字段口径与前端 applyExamScale 一致：
 *         finalScore / finalMax / passLine / rubricPassLine / passLineSource / passed）
 *  GET   /api/exam/scores?taskId=              → 成绩扁平行（管理端「成绩管理」用）
 *       · 一行 = 一份会话（**含未交卷**）；带 taskName / candidateName（从任务名单反查）/
 *         status(inProgress|expired|grading|done|failed) / finalScore / finalMax / passLine / passed
 *       · 「名单里但还没有会话的考生」由管理端页面 join 任务名单补成"未开始"，服务端不造行
 *  POST  /api/exam/sessions/expire             → 手动触发过期结算 { expired }
 *  POST  /api/exam/dev/reset                   → **仅开发用**：清空会话与成绩（生产删除）
 * ══════════════════════════════════════════════════════════════════
 *
 * 三条红线（与设计文档一致）：
 *   R1 不给答案 —— `/tasks` 走白名单字段，不下发金标准/评分要点；
 *   R2 时间可信 —— startedAt/deadline 由服务端签发，PATCH/submit 按 deadline 判定；
 *   R3 留痕可复核 —— 答卷、leaveCount、superseded、autoSubmitted 全部入库。
 */

import http from 'node:http'
import { loadTasks, getTask, windowStateOf } from './tasks.js'
import {
  loadStore, getSession, listSessions, putSession, sessionIdOf, resetStore, DATA_FILE
} from './store.js'
import { enqueue, sweepExpired, resumeOnBoot, startSweeper } from './grading.js'
import { LLM } from './llm.js'

const PORT = Number(process.env.EXAM_API_PORT || 5110)
const MAX_BODY = 4 * 1024 * 1024   // 答卷可能较长，给 4MB

/* ── 工具 ── */
function send(res, code, payload) {
  const body = JSON.stringify(payload)
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS'
  })
  res.end(body)
}
const ok = (res, payload = {}) => send(res, 200, { ok: true, ...payload })
const fail = (res, code, errorCode, message) => send(res, code, { ok: false, code: errorCode, message })

function readJson(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', c => {
      size += c.length
      if (size > MAX_BODY) { reject(new Error('body too large')); req.destroy(); return }
      chunks.push(c)
    })
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf-8')
      if (!raw) return resolve({})
      try { resolve(JSON.parse(raw)) } catch (e) { reject(new Error('invalid JSON')) }
    })
    req.on('error', reject)
  })
}

const nowIso = () => new Date().toISOString()

/** 会话对外形状（不泄露任何评分要点；results 只在 /score 里给） */
function publicSession(s) {
  return {
    sessionId: s.sessionId,
    taskId: s.taskId,
    candidateId: s.candidateId || '',
    startedAt: s.startedAt,
    deadline: s.deadline,
    answers: s.answers || {},
    leaveCount: s.leaveCount || 0,
    superseded: s.superseded || 0,
    submitted: !!s.submitted,
    submittedAt: s.submittedAt || '',
    autoSubmitted: !!s.autoSubmitted,
    status: s.submitted ? s.status : 'open'
  }
}

/** 成绩汇总：多题时按"各题 finalScore 之和 vs 各题达标线之和"判定（口径写死在这里） */
function summarize(results) {
  const items = Object.entries(results || {}).map(([caseId, r]) => ({
    caseId,
    finalScore: r.finalScore,
    finalMax: r.finalMax,
    passLine: r.passLine,
    passed: r.passed
  }))
  const sum = f => items.reduce((a, i) => a + (Number(f(i)) || 0), 0)
  const total = items.length
    ? { finalScore: sum(i => i.finalScore), finalMax: sum(i => i.finalMax), passLine: sum(i => i.passLine), passed: sum(i => i.finalScore) >= sum(i => i.passLine) }
    : null
  return { items, total }
}

/* ── 路由 ── */
async function handle(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`)
  const p = url.pathname
  const method = req.method

  if (method === 'OPTIONS') return send(res, 204, {})

  /* 健康检查 */
  if (method === 'GET' && p === '/api/exam/health') {
    return ok(res, {
      llmConfigured: LLM.configured,
      model: LLM.model,
      sessions: listSessions().length,
      storeFile: DATA_FILE
    })
  }

  /* 任务 */
  if (method === 'GET' && p === '/api/exam/tasks') {
    return ok(res, { tasks: loadTasks() })
  }
  const mTask = p.match(/^\/api\/exam\/tasks\/([^/]+)$/)
  if (method === 'GET' && mTask) {
    const t = getTask(decodeURIComponent(mTask[1]))
    if (!t) return fail(res, 404, 'TASK_NOT_FOUND', '任务不存在')
    return ok(res, { task: t })
  }

  /* 开考 / 续答 */
  if (method === 'POST' && p === '/api/exam/sessions') {
    let body
    try { body = await readJson(req) } catch (e) { return fail(res, 400, 'BAD_REQUEST', e.message) }
    const { taskId, candidateId = '', clientId = '' } = body
    if (!taskId) return fail(res, 400, 'BAD_REQUEST', '缺少 taskId')

    const task = getTask(taskId)
    if (!task) return fail(res, 404, 'TASK_NOT_FOUND', '任务不存在')

    const state = windowStateOf(task)
    if (state === 'notStarted') return fail(res, 409, 'OUT_OF_WINDOW', '考试尚未开始')
    if (state === 'expired') return fail(res, 409, 'OUT_OF_WINDOW', '考试窗口已结束')

    /* 名单校验：名单非空时只有名单内的考生能开考（"老师派发"的语义）。
       学号或 id 任一匹配即可 —— 学员端传学号，考站机传登录学号。名单为空 = 全员开放。 */
    const roster = Array.isArray(task.candidates) ? task.candidates : []
    if (roster.length) {
      const hit = roster.some(c =>
        (c.examNumber && String(c.examNumber) === String(candidateId)) ||
        (c.id && String(c.id) === String(candidateId))
      )
      if (!hit) return fail(res, 403, 'NOT_IN_ROSTER', '本场考核未派发给该考生')
    }

    const sessionId = sessionIdOf(taskId, candidateId)
    const existing = getSession(sessionId)
    const now = Date.now()

    if (existing) {
      /* 已交卷 */
      if (existing.submitted) {
        if (task.retake === 'single') {
          return fail(res, 409, 'RETAKE_NOT_ALLOWED', '本场已交卷，不允许重考')
        }
        return ok(res, { ...publicSession(existing), resumed: false })
      }
      /* 未交卷且未到点 → 续答 */
      if (existing.deadline > now) {
        const mine = !clientId || !existing.clientId || existing.clientId === clientId
        if (!mine) existing.superseded = (existing.superseded || 0) + 1
        if (clientId) existing.clientId = clientId
        putSession(existing)
        return ok(res, { ...publicSession(existing), resumed: true, mine, adopted: !mine })
      }
      /* 已到点未交卷 → 结算（兜底），并把这次当作"已交卷"返回 */
      existing.submitted = true
      existing.submittedAt = new Date(existing.deadline).toISOString()
      existing.autoSubmitted = true
      existing.status = 'grading'
      putSession(existing)
      enqueue(existing.sessionId)
      return ok(res, { ...publicSession(existing), resumed: true })
    }

    const startedAt = now
    const durationMin = Number(task.durationMin) || 0
    const session = {
      sessionId,
      taskId,
      candidateId: candidateId || '',
      clientId: clientId || '',
      startedAt,
      deadline: startedAt + durationMin * 60 * 1000,   // ★ 服务端签发，客户端改不了
      answers: {},
      leaveCount: 0,
      superseded: 0,
      submitted: false,
      submittedAt: '',
      status: 'open',
      results: null,
      error: '',
      gradedAt: '',
      createdAt: nowIso(),
      updatedAt: nowIso()
    }
    putSession(session)
    console.log(`[exam-api] 开考 ${sessionId} deadline=${new Date(session.deadline).toISOString()}`)
    return send(res, 201, { ok: true, ...publicSession(session), resumed: false })
  }

  /* 过期结算（手动触发，测试用） */
  if (method === 'POST' && p === '/api/exam/sessions/expire') {
    return ok(res, { expired: sweepExpired() })
  }

  /* 成绩列表（管理端「成绩管理」用）
     出**扁平行**：一行 = 一份会话（含未交卷的），带上任务名与考生名（从任务名单反查）。
     管理端再把「名单里但还没有会话的考生」补成"未开始"行 —— 那是页面 join 的职责，
     服务端不替它造行（否则分不清"没人考"和"考了没交"）。
     多题汇总沿用 summarize 的求和口径（单站单题是常态）。 */
  if (method === 'GET' && p === '/api/exam/scores') {
    const taskId = url.searchParams.get('taskId') || ''
    const taskMap = new Map(loadTasks().map(t => [t.id, t]))
    const now = Date.now()
    const rows = listSessions({ taskId: taskId || undefined })
      .map(s => {
        const t = taskMap.get(s.taskId) || null
        const roster = (t && Array.isArray(t.candidates)) ? t.candidates : []
        const cand = roster.find(c =>
          (c.examNumber && String(c.examNumber) === String(s.candidateId)) ||
          (c.id && String(c.id) === String(s.candidateId))
        ) || null
        const { items, total } = summarize(s.results)
        return {
          sessionId: s.sessionId,
          taskId: s.taskId,
          taskName: t ? t.name : s.taskId,
          candidateId: s.candidateId || '',
          candidateName: cand ? cand.name : '',
          candidateExamNumber: cand ? (cand.examNumber || cand.id) : (s.candidateId || ''),
          startedAt: s.startedAt || 0,
          deadline: s.deadline || 0,
          /* 未交卷时给页面一个可用的状态：作答中 / 已过期（到点未交卷由服务端结算，这里只是投影） */
          status: s.submitted ? s.status : (Number(s.deadline) > now ? 'inProgress' : 'expired'),
          submitted: !!s.submitted,
          submittedAt: s.submittedAt || '',
          autoSubmitted: !!s.autoSubmitted,
          leaveCount: s.leaveCount || 0,
          superseded: s.superseded || 0,
          caseIds: (t && Array.isArray(t.caseIds)) ? t.caseIds : [],
          caseCount: items.length,
          answeredCount: Object.keys(s.answers || {}).length,
          finalScore: total ? total.finalScore : null,
          finalMax: total ? total.finalMax : null,
          passLine: total ? total.passLine : null,
          passed: total ? total.passed : null,
          items,
          total,
          error: s.error || ''
        }
      })
      .sort((a, b) => String(b.submittedAt || b.startedAt).localeCompare(String(a.submittedAt || a.startedAt)))
    return ok(res, { scores: rows })
  }

  /* 按 (taskId, candidateId) 查会话 —— 任务列表页用，换设备也能拿回自己的状态与成绩 */
  if (method === 'GET' && p === '/api/exam/sessions') {
    const taskId = url.searchParams.get('taskId') || ''
    const candidateId = url.searchParams.get('candidateId') || ''
    if (!taskId) return fail(res, 400, 'BAD_REQUEST', '缺少 taskId')
    const s = getSession(sessionIdOf(taskId, candidateId))
    if (!s) return ok(res, { session: null, score: null })
    return ok(res, {
      session: publicSession(s),
      score: s.submitted ? { status: s.status, results: s.results || undefined, error: s.error || undefined } : null
    })
  }

  /* 会话详情 */
  const mSession = p.match(/^\/api\/exam\/sessions\/([^/]+)$/)
  if (mSession && method === 'GET') {
    const s = getSession(decodeURIComponent(mSession[1]))
    if (!s) return fail(res, 404, 'SESSION_NOT_FOUND', '会话不存在')
    return ok(res, { session: publicSession(s) })
  }

  const mPatch = p.match(/^\/api\/exam\/sessions\/([^/]+)$/)
  if (mPatch && method === 'PATCH') {
    let body
    try { body = await readJson(req) } catch (e) { return fail(res, 400, 'BAD_REQUEST', e.message) }
    const s = getSession(decodeURIComponent(mPatch[1]))
    if (!s) return fail(res, 404, 'SESSION_NOT_FOUND', '会话不存在')
    if (s.submitted) return fail(res, 409, 'SESSION_LOCKED', '答卷已锁定，不能再修改')
    if (s.deadline <= Date.now()) {
      /* 到点：服务端兜底结算，并拒绝这次上报 */
      s.submitted = true
      s.submittedAt = new Date(s.deadline).toISOString()
      s.autoSubmitted = true
      s.status = 'grading'
      putSession(s)
      enqueue(s.sessionId)
      return fail(res, 409, 'SESSION_EXPIRED', '考试时间已到，已自动交卷')
    }
    /* 空对象视为"无更新"：客户端可能已用 PATCH 自动保存过草稿，
       不带全文的请求不能把已答内容清空（否则会按空报告评分 = 假 0 分） */
    if (body.answers && typeof body.answers === 'object' && Object.keys(body.answers).length) {
      s.answers = body.answers
    }
    if (typeof body.leaveCount === 'number') s.leaveCount = body.leaveCount
    if (body.clientId) s.clientId = body.clientId
    putSession(s)
    return ok(res, { savedAt: nowIso() })
  }

  /* 交卷 */
  const mSubmit = p.match(/^\/api\/exam\/sessions\/([^/]+)\/submit$/)
  if (mSubmit && method === 'POST') {
    let body
    try { body = await readJson(req) } catch (e) { return fail(res, 400, 'BAD_REQUEST', e.message) }
    const s = getSession(decodeURIComponent(mSubmit[1]))
    if (!s) return fail(res, 404, 'SESSION_NOT_FOUND', '会话不存在')
    if (s.submitted) {
      return ok(res, { submittedAt: s.submittedAt, status: s.status, alreadySubmitted: true })
    }
    /* ① 先锁定答卷入库（**先落库再评阅**，考生关页也不丢）。
       同样：空 answers 不清空 —— 交卷只做最后补写，已保存的草稿必须留住 */
    if (body.answers && typeof body.answers === 'object' && Object.keys(body.answers).length) {
      s.answers = body.answers
    }
    if (typeof body.leaveCount === 'number') s.leaveCount = body.leaveCount
    s.submitted = true
    s.submittedAt = nowIso()
    s.lateSubmit = s.deadline <= Date.now()
    s.status = 'grading'
    putSession(s)
    console.log(`[exam-api] 交卷 ${s.sessionId}${s.lateSubmit ? '（超时提交）' : ''}`)
    /* ② 异步入队评阅 */
    enqueue(s.sessionId)
    return ok(res, { submittedAt: s.submittedAt, status: 'grading' })
  }

  /* 评阅状态 / 成绩 */
  const mScore = p.match(/^\/api\/exam\/sessions\/([^/]+)\/score$/)
  if (mScore && method === 'GET') {
    const s = getSession(decodeURIComponent(mScore[1]))
    if (!s) return fail(res, 404, 'SESSION_NOT_FOUND', '会话不存在')
    return ok(res, {
      status: s.submitted ? s.status : 'pending',
      results: s.results || undefined,
      error: s.error || undefined,
      gradedAt: s.gradedAt || undefined
    })
  }

  /* 仅开发：清空（生产请删除） */
  if (method === 'POST' && p === '/api/exam/dev/reset') {
    resetStore()
    return ok(res, { reset: true })
  }

  return fail(res, 404, 'NOT_FOUND', `未知端点 ${method} ${p}`)
}

const server = http.createServer((req, res) => {
  handle(req, res).catch(e => {
    console.error('[exam-api] 未捕获异常:', e)
    if (!res.headersSent) fail(res, 500, 'INTERNAL', e.message)
  })
})

// 不指定 host → 双栈监听（:: 与 127.0.0.1 都通）。
// 起因：五端 dev server 与 vite 代理在本机走的是 `localhost`，Windows 上常先解析到 ::1，
// 若只监听 127.0.0.1 会出现"端口在听但代理连不上"的假象。
server.listen(PORT, () => {
  loadStore()
  console.log(`[exam-api] 影像报告书写考核服务已启动 http://localhost:${PORT}`)
  console.log(`[exam-api] LLM：${LLM.configured ? `已配置（${LLM.model}）` : '未配置 —— 评阅会失败，请在 apps/training/.env.local 配 LLM_API_KEY'}`)
  console.log(`[exam-api] 存储：${DATA_FILE}`)
  console.log(`[exam-api] 任务来源：${loadTasks().length} 条（packages/shared/data/created-exams.json）`)
  resumeOnBoot()
  startSweeper()
})
