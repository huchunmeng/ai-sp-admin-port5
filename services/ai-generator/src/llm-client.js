function repairJSON(text) {
  let s = text.trim()
  if (s.startsWith('```')) {
    s = s.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '')
  }
  s = s.replace(/,(\s*[}\]])/g, '$1')
  const openCurly = (s.match(/\{/g) || []).length
  const closeCurly = (s.match(/\}/g) || []).length
  const openSquare = (s.match(/\[/g) || []).length
  const closeSquare = (s.match(/\]/g) || []).length
  if (closeCurly < openCurly) s += '}'.repeat(openCurly - closeCurly)
  if (closeSquare < openSquare) s += ']'.repeat(openSquare - closeSquare)
  return s
}

async function callLLMOnce(prompt, apiUrl, apiKey, model) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 180000)

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: '你是一名资深临床医学教育专家。请严格按照要求输出JSON，不要包含任何解释性文字或Markdown标记。' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 32768
      }),
      signal: controller.signal
    })
    clearTimeout(timeout)

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`LLM API error ${response.status}: ${errText}`)
    }

    const result = await response.json()
    return result.choices?.[0]?.message?.content || ''
  } catch (e) {
    clearTimeout(timeout)
    throw e
  }
}

export async function callLLM(prompt, apiUrl, apiKey, model, retries = 2) {
  let lastError
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const content = await callLLMOnce(prompt, apiUrl, apiKey, model)
      const repaired = repairJSON(content)
      return JSON.parse(repaired)
    } catch (e) {
      lastError = e
      if (attempt < retries) {
        console.log(`[aiGen] JSON parse failed (attempt ${attempt + 1}), retrying...`)
        prompt = `你上一次的输出无法被JSON解析器解析。错误信息：${e.message}\n\n请严格按照JSON格式重新输出完整结果，不要包含任何解释性文字。确保所有花括号和方括号正确闭合，字符串内的引号正确转义，数组和对象末尾不要有多余逗号。\n\n原始任务：\n${prompt}`
      }
    }
  }
  throw lastError
}

export { repairJSON }
