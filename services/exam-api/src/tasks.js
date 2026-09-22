// 任务读取（只读管理端产物）+ 出站红线清洗
//
// 任务来源：`packages/shared/data/created-exams.json`（管理端「新建考核」提交时写入）。
// 每次请求都重新读文件，这样老师在管理端新建/改了考核，学员端不用重启服务就能看到。
//
// ★ 红线 R1（不给答案）：任务对象本身不含金标准，但仍**按白名单字段输出**，
//   杜绝以后有人往任务里塞 `goldStandard` / `rubric` / `sampleSnapshot` 之类的字段直接漏出去。

import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TASKS_FILE = path.resolve(__dirname, '../../../packages/shared/data/created-exams.json')

/** 允许出站的字段（白名单；不改这里就别想让新字段漏给前端） */
const TASK_FIELDS = [
  'id', 'name', 'scheme', 'examMode', 'caseIds', 'durationMin', 'passLine',
  'questionCount', 'scoreVisible', 'retake', 'scoreScale',
  'windowStart', 'windowEnd', 'dispatchedBy', 'dispatchedAt',
  'candidates'
]

function parseTime(s) {
  // 'YYYY-MM-DD HH:mm' 在部分引擎里 Date.parse 不稳，统一把 - 换成 /
  return Date.parse(String(s || '').replace(/-/g, '/'))
}

/** 考试窗口状态：notStarted / open / expired */
export function windowStateOf(task, at = Date.now()) {
  const s = parseTime(task.windowStart)
  const e = parseTime(task.windowEnd)
  if (Number.isNaN(s) || Number.isNaN(e)) return 'open'   // 时间缺失时不拦，按开放处理
  if (at < s) return 'notStarted'
  if (at > e) return 'expired'
  return 'open'
}

function sanitize(task) {
  const out = {}
  for (const k of TASK_FIELDS) if (task[k] !== undefined) out[k] = task[k]
  out.caseIds = Array.isArray(out.caseIds) ? out.caseIds.slice() : []
  /* 派发名单：老师在第 4 步选的考生。名单为空 = 对所有人开放（老数据兼容） */
  out.candidates = Array.isArray(out.candidates)
    ? out.candidates
        .map(c => ({
          id: String((c && c.id) || ''),
          name: String((c && c.name) || ''),
          examNumber: String((c && (c.examNumber || c.exam_number)) || '')
        }))
        .filter(c => c.id || c.examNumber)
    : []
  out.durationMin = Number(out.durationMin) || 0
  out.questionCount = Number(out.questionCount) || out.caseIds.length || 1
  out.state = windowStateOf(out)
  return out
}

export function loadTasks() {
  try {
    if (!existsSync(TASKS_FILE)) return []
    const raw = readFileSync(TASKS_FILE, 'utf-8')
    const arr = JSON.parse(raw || '[]')
    return Array.isArray(arr) ? arr.filter(t => t && t.id).map(sanitize) : []
  } catch (e) {
    console.error('[exam-api] 读任务失败:', e.message)
    return []
  }
}

export function getTask(id) {
  return loadTasks().find(t => t.id === id) || null
}

export { TASKS_FILE }
