// AI伴学调用层 —— 对话式，带出站红线
//
// 分工：`packages/shared/data/imaging/companion.js` 负责 prompt 组装与红线校验；本文件只管 HTTP。
// 学员自由提问 → 模型依据金标准与训练要求作答 → **红线校验**：不过关就丢弃回复、改回固定引导话术。

import { useAIChat } from './useAIChat'
import {
  buildCompanionPrompt, checkRedline, extractFactWords, goldFullTextOf, GUIDE_FALLBACK
} from '@ai-sp/shared/imaging'

export function useReportCompanion() {
  const { sendMessage } = useAIChat()

  /**
   * 问一句。
   * @returns {Promise<{ok:boolean, text:string, blocked?:boolean, reason?:string}>}
   */
  async function ask({ sample, reportText, segment, question, history }) {
    const gold = sample && sample.goldStandard
    if (!goldFullTextOf(gold)) {
      return { ok: false, text: '本病例还没有参考报告，暂时问不了。', reason: 'no-gold' }
    }

    const prompt = buildCompanionPrompt({ sample, reportText, segment, question, history })
    const res = await sendMessage(prompt.messages, prompt.system, { temperature: 0.4, maxTokens: 400 })
    if (!res.ok) return { ok: false, text: '没连上模型，稍后再问一次。', reason: 'llm' }

    const text = String(res.content || '').trim()
    if (!text) return { ok: false, text: '这次没生成好，换个问法再试试。', reason: 'empty' }

    // 出站红线：命中则丢弃，改回引导话术（宁可少答一句，不可泄一句答案）
    const redline = checkRedline(text, goldFullTextOf(gold), extractFactWords(gold))
    if (!redline.passed) {
      return { ok: true, text: GUIDE_FALLBACK, blocked: true, redline }
    }
    return { ok: true, text, redline }
  }

  return { ask }
}
