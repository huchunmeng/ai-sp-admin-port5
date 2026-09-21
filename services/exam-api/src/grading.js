// 异步评阅 worker —— 本轮要解决的问题：**交卷后关掉页面，成绩也不能丢**
//
// 时序：submit（锁卷落库）→ 入队 → 本 worker 逐题评阅 → 写回 results。
//   · 评阅在**服务端**做，考生关页/断网都不影响；
//   · 单题失败重试 3 次（退避 1s/3s/9s），仍失败则记 error；
//   · 进程重启后扫一遍：`grading` 中卡住的续评；
//   · 定时扫过期会话：到点未交卷 → 用**最后一次已上报的答卷**自动结算（"到点自动交卷"的服务端兜底）。
//
// 评分口径**复用 shared 的纯逻辑**（prepareScoring / settle / applyExamScale），
// 服务端不另写一套评分，否则与前端展示口径会漂移。

import {
  prepareScoring, COMMENT_SCOPE, applyExamScale, getImagingSample
} from '../../../packages/shared/data/imaging/index.js'
import { callLlmRaw } from './llm.js'
import { getSession, putSession, listSessions } from './store.js'
import { getTask } from './tasks.js'

const MAX_ATTEMPTS = 3
const BACKOFF_MS = [1000, 3000, 9000]
const SWEEP_INTERVAL_MS = 15000

const queue = []
let running = false

const sleep = ms => new Promise(r => setTimeout(r, ms))

/** 入队（去重） */
export function enqueue(sessionId) {
  if (!queue.includes(sessionId)) queue.push(sessionId)
  if (!running) processQueue()
}

/** 串行处理，避免打爆模型 */
async function processQueue() {
  running = true
  try {
    while (queue.length) {
      const id = queue.shift()
      try {
        await gradeSession(id)
      } catch (e) {
        console.error(`[exam-api] 评阅异常 ${id}:`, e.message)
      }
    }
  } finally {
    running = false
  }
}

/** 单题评阅：prepareScoring → LLM 原始文本 → settle → 考务口径 */
async function gradeOneCase({ sample, reportText, task }) {
  const prepared = prepareScoring({ sample, reportText, scope: COMMENT_SCOPE.EXAM })
  let lastErr = ''
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const raw = await callLlmRaw({
        messages: prepared.prompt.messages,
        system: prepared.prompt.system,
        temperature: 0,        // 评分要稳
        maxTokens: 4000,
        timeoutMs: 180000
      })
      const settled = prepared.settle(raw)
      if (!settled.ok) {
        lastErr = settled.reason || '模型输出无法解析'
      } else {
        // 考务口径：达标线 / 满分口径统一由 applyExamScale 收口
        return { ok: true, result: applyExamScale(settled.result, task.passLine, task.scoreScale) }
      }
    } catch (e) {
      lastErr = e.message
    }
    if (attempt < MAX_ATTEMPTS - 1) await sleep(BACKOFF_MS[attempt] || 3000)
  }
  return { ok: false, error: lastErr || '评阅失败' }
}

/** 评阅一份会话（幂等：已 done 的直接返回） */
export async function gradeSession(sessionId) {
  const session = getSession(sessionId)
  if (!session) return null
  if (session.status === 'done' && session.results) return session
  const task = getTask(session.taskId)
  if (!task) {
    session.status = 'failed'
    session.error = `任务不存在：${session.taskId}`
    return putSession(session)
  }

  session.status = 'grading'
  session.error = ''
  putSession(session)

  // 只评"该卷应做的题"：任务题目与已上报答卷的交集（缺答卷的题也评，按空报告处理）
  const caseIds = (task.caseIds || []).slice(0, Number(task.questionCount) || (task.caseIds || []).length)
  const results = {}
  const errors = []

  for (const caseId of caseIds) {
    const sample = getImagingSample(caseId)
    if (!sample) { errors.push(`${caseId}: 样本不存在`); continue }
    const reportText = session.answers?.[caseId] || { purpose: '', findings: '', impression: '' }
    const r = await gradeOneCase({ sample, reportText, task })
    if (r.ok) results[caseId] = r.result
    else errors.push(`${caseId}: ${r.error}`)
  }

  session.results = results
  session.error = errors.join('；')
  session.status = Object.keys(results).length ? 'done' : 'failed'
  session.gradedAt = new Date().toISOString()
  console.log(`[exam-api] 评阅完成 ${sessionId} → ${session.status}（${Object.keys(results).length}/${caseIds.length} 题）`)
  return putSession(session)
}

/** 到点未交卷 → 用最后一次已上报的答卷自动结算并入队（服务端兜底） */
export function sweepExpired(now = Date.now()) {
  let n = 0
  for (const s of listSessions()) {
    if (s.submitted || !s.deadline || s.deadline > now) continue
    s.submitted = true
    s.submittedAt = new Date(s.deadline).toISOString()   // 以**到点时刻**为交卷时间，不是扫描时刻
    s.autoSubmitted = true
    s.status = 'grading'
    putSession(s)
    enqueue(s.sessionId)
    n++
    console.log(`[exam-api] 到点自动交卷：${s.sessionId}`)
  }
  return n
}

/** 进程启动时扫一遍：续评卡住的 + 结算已过期的 */
export function resumeOnBoot() {
  const stuck = listSessions().filter(s => s.submitted && s.status !== 'done')
  for (const s of stuck) enqueue(s.sessionId)
  const expired = sweepExpired()
  console.log(`[exam-api] 启动自检：续评 ${stuck.length} 份，结算过期 ${expired} 份`)
}

export function startSweeper() {
  setInterval(() => { try { sweepExpired() } catch (e) { console.error('[exam-api] 扫描失败:', e.message) } }, SWEEP_INTERVAL_MS)
}
