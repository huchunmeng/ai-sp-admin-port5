// 影像报告书写 · 共用 LLM 调用层
//
// 训练端与考核端各自在 vite 里挂 `/api/llm` 代理（admin 端用 llmProxyPlugin，training 端用 llm-proxy），
// 这里只负责 HTTP 与时序，不含任何评分逻辑 —— 评分逻辑在 `packages/shared/data/imaging/scoring.js`。
//
// 抽出来的原因：作答页与成绩报告要在**两个端**上跑（现场考站 = apps/exam，在线考试 = 学员端），
// 不允许两端各写一份调用层，否则口径会漂移。

export async function sendLlm(messages, systemPrompt, opts = {}) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), opts.timeout || 30000)
  try {
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
    const json = await resp.json()
    if (!json.ok) return { ok: false, content: json.error || 'LLM request failed' }
    return { ok: true, content: json.content }
  } catch (e) {
    if (e.name === 'AbortError') return { ok: false, content: '请求超时，请重试' }
    return { ok: false, content: e.message }
  } finally {
    clearTimeout(timeout)
  }
}
