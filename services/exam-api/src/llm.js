// 服务端 LLM 调用 —— 零依赖（fetch 是 Node 18+ 内置）
//
// ⚠️ 为什么不直接用 `services/ai-generator/src/llm-client.js` 的 `callLLM`：
// 那个函数自带一句「你是一名资深临床医学教育专家…请严格按照要求输出JSON」的 system prompt，
// 并且**直接把模型输出 JSON.parse 成对象返回**；而影像评分链路 `prepareScoring()` 返回的是
// `{ prompt: { messages, system }, settle(rawModelText) }` —— `settle` 要的是**模型原始文本字符串**，
// 且评分有自己的 system prompt 与 temperature=0 要求。用 `callLLM` 会丢掉评分自己的 system、
// 并在解析失败时用"重写 JSON"的第二轮提示污染评分口径。
// 所以这里按 `services/prod-server/src/routes/llm-proxy.js` 的写法自建一个**返回原始文本**的调用。

import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * 从 `apps/training/.env.local` 读 LLM 配置（vite 用 loadEnv 读同一份，服务端复用，不重复维护密钥）。
 * 不硬编码密钥；文件不存在时可以退回进程环境变量。
 */
function loadEnvFile() {
  const envPath = path.resolve(__dirname, '../../../apps/training/.env.local')
  const out = {}
  if (existsSync(envPath)) {
    const raw = readFileSync(envPath, 'utf-8')
    for (const line of raw.split(/\r?\n/)) {
      const t = line.trim()
      if (!t || t.startsWith('#')) continue
      const i = t.indexOf('=')
      if (i <= 0) continue
      out[t.slice(0, i).trim()] = t.slice(i + 1).trim()
    }
  }
  return out
}

const fileEnv = loadEnvFile()

export const LLM = {
  apiKey: process.env.LLM_API_KEY || fileEnv.LLM_API_KEY || '',
  apiUrl: process.env.LLM_API_URL || fileEnv.LLM_API_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
  /** 评阅默认模型：评分要严格 JSON + 逐要点判定，比对话更吃模型能力，故与前端评分层保持一致 */
  model: process.env.EXAM_SCORING_MODEL || 'qwen-plus',
  configured: !!(process.env.LLM_API_KEY || fileEnv.LLM_API_KEY)
}

/**
 * 调一次模型，**返回原始文本**。
 * @param {{messages:Array, system?:string, temperature?:number, maxTokens?:number, timeoutMs?:number}} req
 * @returns {Promise<string>}
 */
export async function callLlmRaw({ messages, system, temperature = 0, maxTokens = 4000, timeoutMs = 180000 }) {
  if (!LLM.configured) throw new Error('LLM_API_KEY 未配置（apps/training/.env.local）')
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const body = {
      model: LLM.model,
      messages: system ? [{ role: 'system', content: system }, ...messages] : messages,
      temperature,
      max_tokens: maxTokens
    }
    // 与各端 vite 代理同一处理：对话/评分场景显式关闭深度思考，保证低延迟与稳定
    if (String(LLM.model).startsWith('deepseek')) body.thinking = { type: 'disabled' }
    else if (String(LLM.model).startsWith('qwen')) body.enable_thinking = false

    const resp = await fetch(LLM.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${LLM.apiKey}` },
      body: JSON.stringify(body),
      signal: controller.signal
    })
    if (!resp.ok) {
      const errText = await resp.text().catch(() => '')
      throw new Error(`LLM API error ${resp.status}: ${errText.slice(0, 300)}`)
    }
    const json = await resp.json()
    const content = json.choices?.[0]?.message?.content
    if (!content) throw new Error('LLM 返回内容为空')
    return content
  } finally {
    clearTimeout(timeout)
  }
}
