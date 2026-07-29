import { ref } from 'vue'

export function useAIChat() {
  const loading = ref(false)
  const error = ref(null)

  async function sendMessage(messages, systemPrompt, opts = {}) {
    loading.value = true
    error.value = null

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), opts.timeout || 30000)

      const resp = await fetch('/api/llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages,
          system: systemPrompt,
          temperature: opts.temperature ?? 0.7,
          max_tokens: opts.maxTokens ?? 2000,
          model: opts.model || undefined
        }),
        signal: controller.signal
      })
      clearTimeout(timeout)

      const json = await resp.json()
      if (!json.ok) {
        error.value = json.error || 'LLM request failed'
        return { ok: false, content: '抱歉，AI服务暂时不可用，请稍后再试。' }
      }
      return { ok: true, content: json.content }
    } catch (e) {
      if (e.name === 'AbortError') {
        error.value = '请求超时，请重试'
        return { ok: false, content: '抱歉，请求超时，请稍后再试。' }
      }
      error.value = e.message
      return { ok: false, content: '抱歉，网络异常，请稍后再试。' }
    } finally {
      loading.value = false
    }
  }

  return { sendMessage, loading, error }
}
