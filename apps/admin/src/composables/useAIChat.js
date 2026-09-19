// 管理端的通用 LLM 调用封装
//
// 对应 vite 插件 `llmProxyPlugin`（apps/admin/vite.config.js）暴露的 `POST /api/llm`，
// 复用管理端已有的 `AI_GENERATE_API_KEY` 配置。与训练端 `apps/training/src/composables/useAIChat.js` 同形，
// 便于两端互相参照。

import { ref } from 'vue'

export function useAIChat() {
  const loading = ref(false)
  const error = ref(null)

  /**
   * @param {Array} messages
   * @param {string} [systemPrompt]
   * @param {{timeout?:number, temperature?:number, maxTokens?:number, model?:string}} [opts]
   * @returns {Promise<{ok:boolean, content:string}>}
   */
  async function sendMessage(messages, systemPrompt, opts = {}) {
    loading.value = true
    error.value = null
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), opts.timeout || 180000)
      const resp = await fetch('/api/llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages,
          system: systemPrompt,
          temperature: opts.temperature ?? 0.2,
          max_tokens: opts.maxTokens ?? 3000,
          model: opts.model || undefined
        }),
        signal: controller.signal
      })
      clearTimeout(timeout)
      const json = await resp.json().catch(() => ({}))
      if (!resp.ok || !json.ok) {
        error.value = json.error || `LLM 请求失败（${resp.status}）`
        return { ok: false, content: '' }
      }
      return { ok: true, content: json.content || '' }
    } catch (e) {
      error.value = e.name === 'AbortError' ? '请求超时' : e.message
      return { ok: false, content: '' }
    } finally {
      loading.value = false
    }
  }

  return { loading, error, sendMessage }
}
