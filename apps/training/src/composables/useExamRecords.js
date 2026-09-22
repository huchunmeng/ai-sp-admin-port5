// 考试记录（**考试侧**，与训练记录彻底隔离）
//
// 为什么不复用训练记录：训练记录（`report_writing_records_v1`）是训练工作台的产物，
// 里面**可以看「报告对照」**；练习考属于考核侧，红线 R1 不给参考报告。
// 两者混在一个列表里既要额外打标、又有泄题风险，所以分两处存：
//
//   · 训练记录 → `report_writing_records_v1`（训练工作台写，可对照）
//   · 考试记录 → `report_writing_exam_records_v1`（练习考写，**不给对照**）
//
// 正式考核的成绩**不在这里**：它由考核服务（services/exam-api）落库，
// 学员端在「我的考核任务」看自己的状态与分数，教师端在「成绩管理」看明细。

const RECORDS_KEY = 'report_writing_exam_records_v1'

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch (e) { return fallback }
}
function writeJson(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)) } catch (e) { /* 隐私模式忽略 */ }
}
function nowStamp() {
  const d = new Date()
  const p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

export function readExamRecords() {
  const list = readJson(RECORDS_KEY, [])
  return Array.isArray(list) ? list : []
}

export function readExamRecord(id) {
  return readExamRecords().find(r => r.id === id) || null
}

export function clearExamRecords() {
  writeJson(RECORDS_KEY, [])
}

/**
 * 练习考交卷后落一条**考试记录**。
 *
 * 记录字段与训练记录保持同构（成绩报告弹窗两端共用同一套 props），但**独立存储、独立列表**：
 * 练习考记录只在「考试记录」里出现，训练记录里不会混入。
 */
export function addPracticeExamRecord({ sample, draft, result, error = '' }) {
  const s = sample || {}
  const caseId = s.id || ''
  if (!caseId) return null

  const rec = {
    id: `exam-${caseId}-${Date.now()}`,
    caseId,
    title: s.title || caseId,
    bodyPart: s.bodyPart || '',
    modality: s.modality || '',
    level: s.level || '',
    submittedAt: nowStamp(),
    status: result ? 'done' : 'failed',
    score: result ? result.rawTotal : null,
    scoreableMax: result ? result.scoreableMax : null,
    result: result || null,
    error: result ? '' : error,
    draft: { ...(draft || {}) },
    /* 记录来源：练习考。将来若要接正式考核的本机记录，用这个字段区分 */
    kind: 'practice'
  }

  const list = readExamRecords()
  list.unshift(rec)
  writeJson(RECORDS_KEY, list)
  return rec
}
