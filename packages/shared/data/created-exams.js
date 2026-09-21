// 已创建考核（派发任务）持久化 — 独立模块
//
// 为什么独立：管理端（5002）创建考核，学员端（5001）读取派发任务，**两个 origin 的 localStorage 不互通**，
// 所以走 dev server 中间件写共享 JSON 文件（`scripts/created-exams-persist.mjs`）。
// 降级链：非 localhost 或接口不可用 → 回落 localStorage。
//
// ⚠️ 生产环境应换成后端 API（考核创建、派发、成绩入库本来就该在服务端）。

function isStaticProduction() {
  const host = window.location.hostname
  return host !== 'localhost' && host !== '127.0.0.1'
}

const EXAMS_API = '/api/created-exams'
const EXAMS_STORAGE_KEY = 'ai-sp-created-exams'

async function fetchExams() {
  if (!isStaticProduction()) {
    try {
      const res = await fetch(EXAMS_API)
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) return data
      }
    } catch { /* 接口不可用时降级到 localStorage */ }
  }
  try {
    const raw = localStorage.getItem(EXAMS_STORAGE_KEY)
    const data = raw ? JSON.parse(raw) : []
    return Array.isArray(data) ? data : []
  } catch { return [] }
}

async function persistExams(exams) {
  const list = Array.isArray(exams) ? exams : []
  if (!isStaticProduction()) {
    try {
      const res = await fetch(EXAMS_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(list)
      })
      // 接口返回非 2xx 时抛错，交由调用方提示，不静默失败
      if (!res.ok) throw new Error(`保存接口返回 ${res.status}`)
      return
    } catch (e) {
      // 只有"接口根本没通"才降级；接口明确报错要抛出去
      if (e && /保存接口返回/.test(e.message)) throw e
    }
  }
  localStorage.setItem(EXAMS_STORAGE_KEY, JSON.stringify(list))
}

export const createdExamsStore = {
  load: fetchExams,
  save: persistExams
}
