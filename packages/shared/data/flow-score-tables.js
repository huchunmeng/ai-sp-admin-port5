// 临床思维全流程评分方案持久化 — 独立模块（与 flow-score-tables.json 配套）
// dev：vite 插件 scripts/flow-score-tables-persist.mjs 提供 /api/flow-score-tables
// prod：services/prod-server/src/routes/flow-score-tables.js 提供同路径 API

function isStaticProduction() {
  const host = window.location.hostname
  return host !== 'localhost' && host !== '127.0.0.1'
}

const API = '/api/flow-score-tables'
const STORAGE_KEY = 'ai-sp-flow-score-tables'

async function fetchData() {
  if (!isStaticProduction()) {
    try {
      const res = await fetch(API)
      if (res.ok) return await res.json()
    } catch { /* 接口不可用时降级到 localStorage */ }
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

async function persistData(data) {
  if (!isStaticProduction()) {
    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      if (res.ok) return
    } catch { /* 降级 */ }
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export const flowScoreTables = {
  load: fetchData,
  save: persistData
}
