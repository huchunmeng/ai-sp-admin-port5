// ═══════════════════════════════════════════════════════════════
// LLM 调用客户端 — 生产代码和测试脚本共用
// 浏览器端: base 默认为 ''（Vite 代理 /api/llm）
// Node 端:   setLLMBase('http://localhost:5001') 后使用
// ═══════════════════════════════════════════════════════════════

let _base = ''
let _promptCache = new Map()

export function setLLMBase(base) {
  _base = (base || '').replace(/\/$/, '')
}

export function getLLMBase() {
  return _base
}

export function clearPromptCache() {
  _promptCache = new Map()
}

// ── LLM API 调用 ──

export async function callLLM(messages, system = '', retries = 2, model = '') {
  let lastError
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const resp = await fetch(`${_base}/api/llm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages,
          system: system || undefined,
          temperature: 0.7,
          max_tokens: 2000,
          model: model || undefined
        })
      })
      const data = await resp.json()
      if (!data.ok) throw new Error(data.error || 'LLM API error')
      if (data.model) _lastModel = data.model
      return data.content
    } catch (e) {
      lastError = e
      if (attempt < retries) {
        const lastMsg = messages[messages.length - 1]
        if (lastMsg && lastMsg.role === 'user') {
          lastMsg.content = `你上一次的输出有误。错误：${e.message}\n\n请严格按照格式重新输出。\n\n原始请求：\n${lastMsg.content}`
        }
      }
    }
  }
  throw lastError
}

let _lastModel = ''
export function getLastModel() { return _lastModel }

// ── 提示词加载 ──

export async function loadPrompt(name) {
  if (_promptCache.has(name)) return _promptCache.get(name)
  const resp = await fetch(`${_base}/api/prompts/${name}`)
  if (!resp.ok) throw new Error(`Failed to load prompt: ${name}`)
  const text = await resp.text()
  _promptCache.set(name, text)
  return text
}

