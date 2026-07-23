import config from '../config.js'

export function mountLlmProxy(app) {
  app.post('/api/llm', async (req, res) => {
    if (!config.LLM_API_KEY || config.LLM_API_KEY === 'your-api-key-here') {
      res.status(503).json({ ok: false, error: 'LLM API key not configured' })
      return
    }

    const { messages, temperature = 0.7, max_tokens = 4000, system, model: reqModel } = req.body
    if (!messages || !Array.isArray(messages)) {
      res.status(400).json({ ok: false, error: 'Missing messages array' })
      return
    }

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 180000)

      const llmMessages = system
        ? [{ role: 'system', content: system }, ...messages]
        : messages

      const usedModel = reqModel || config.LLM_MODEL

      const reqBody = {
        model: usedModel,
        messages: llmMessages,
        temperature,
        max_tokens
      }
      if (usedModel.startsWith('deepseek')) {
        reqBody.thinking = { type: 'disabled' }
      } else if (usedModel.startsWith('qwen')) {
        reqBody.enable_thinking = false
      }

      const response = await fetch(config.LLM_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.LLM_API_KEY}`
        },
        body: JSON.stringify(reqBody),
        signal: controller.signal
      })
      clearTimeout(timeout)

      if (!response.ok) {
        const errText = await response.text()
        res.status(response.status).json({ ok: false, error: `LLM API error ${response.status}: ${errText}` })
        return
      }

      const result = await response.json()
      const content = result.choices?.[0]?.message?.content || ''
      res.json({ ok: true, content, model: usedModel })
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message })
    }
  })
}
