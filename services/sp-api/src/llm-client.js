// ═══════════════════════════════════════════════════════════════
// LLM 客户端 — API 调用 + 重试逻辑
// ═══════════════════════════════════════════════════════════════

import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

// 手动加载 .env（PM2 不会自动加载）
const __llmDir = dirname(fileURLToPath(import.meta.url))
const __envPath = join(__llmDir, '..', '.env')
try {
  const __envContent = readFileSync(__envPath, 'utf-8')
  for (const line of __envContent.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx > 0 && !process.env[trimmed.slice(0, eqIdx).trim()]) {
      process.env[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim()
    }
  }
} catch (_) { /* .env not found */ }

export const LLM_API_KEY = process.env.LLM_API_KEY || ''
const LLM_API_URL = process.env.LLM_API_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'
export const LLM_MODEL = process.env.LLM_MODEL || 'qwen-plus'

/**
 * LLM API 直接调用（不经过 Vite 代理）
 * @param {Array} messages - [{role, content}]
 * @param {string} system - 系统提示词
 * @param {number} retries - 重试次数
 * @param {string} model - 模型名
 * @returns {Promise<{content: string, model: string}>}
 */
export async function callLLMDirect(messages, system = '', retries = 2, model = LLM_MODEL) {
  let lastError
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const llmMessages = system
        ? [{ role: 'system', content: system }, ...messages]
        : messages

      const reqBody = {
        model,
        messages: llmMessages,
        temperature: 0.7,
        max_tokens: 2000
      }
      if (model.startsWith('qwen')) {
        reqBody.enable_thinking = false
      } else if (model.startsWith('deepseek')) {
        reqBody.thinking = { type: 'disabled' }
      }

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 180000)

      const resp = await fetch(LLM_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${LLM_API_KEY}`
        },
        body: JSON.stringify(reqBody),
        signal: controller.signal
      })
      clearTimeout(timeout)

      if (!resp.ok) throw new Error(`LLM API error ${resp.status}`)
      const result = await resp.json()
      return {
        content: result.choices?.[0]?.message?.content || '',
        model
      }
    } catch (e) {
      lastError = e
      if (attempt < retries) {
        const lastMsg = messages[messages.length - 1]
        if (lastMsg?.role === 'user') {
          lastMsg.content = `你上一次的输出有误。错误：${e.message}\n\n请严格按照格式重新输出。\n\n原始请求：\n${lastMsg.content}`
        }
      }
    }
  }
  throw lastError
}
