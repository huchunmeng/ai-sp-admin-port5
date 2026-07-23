// 考站方案编辑持久化 — 独立模块（避免 src/index.js ↔ data/station-schemes/index.js 循环引用）

function isStaticProduction() {
  const host = window.location.hostname
  return host !== 'localhost' && host !== '127.0.0.1'
}

const EDITS_API = '/api/station-schemes-edits'
const EDITS_STORAGE_KEY = 'ai-sp-station-schemes-edits'

async function fetchEdits() {
  if (!isStaticProduction()) {
    try {
      const res = await fetch(EDITS_API)
      if (res.ok) return await res.json()
    } catch { /* 接口不可用时降级到 localStorage */ }
  }
  try {
    const raw = localStorage.getItem(EDITS_STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

async function persistEdits(edits) {
  if (!isStaticProduction()) {
    try {
      const res = await fetch(EDITS_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(edits)
      })
      if (res.ok) return
    } catch { /* 降级 */ }
  }
  localStorage.setItem(EDITS_STORAGE_KEY, JSON.stringify(edits))
}

export const stationSchemesEdits = {
  load: fetchEdits,
  save: persistEdits
}
