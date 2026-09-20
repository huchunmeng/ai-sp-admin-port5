// 报告评分调用层 —— 把 shared 里的纯逻辑接到 /api/llm 上
//
// 分工：`packages/shared/data/imaging/scoring.js` 负责 prompt 组装、结果解析、成绩合成与出站红线；
// 本文件只负责 HTTP 与时序。这样评分逻辑可以脱离浏览器单测。
//
// 模型选择：评分要求**严格 JSON** + 逐要点判定，比对话提示更吃模型能力，故默认用 `qwen-plus`。
// 若部署环境没有该模型，改这里的常量或置空走 vite 代理的环境默认（LLM_MODEL）。

import { ref } from 'vue'
import { useAIChat } from './useAIChat'
import { prepareScoring, COMMENT_SCOPE } from '@ai-sp/shared/imaging'

const SCORING_MODEL = 'qwen-plus'

export function useReportScoring() {
  const { sendMessage } = useAIChat()
  const running = ref(false)
  const error = ref('')

  /**
   * 给一份报告打分。
   * @param {{sample:object, reportText:{technique,findings,impression}}} payload
   * @returns {Promise<{ok:boolean, result?:object, reason?:string}>}
   */
  async function score({ sample, reportText, scope = COMMENT_SCOPE.TRAINING }) {
    running.value = true
    error.value = ''
    try {
      // 训练侧默认放宽点评口径（考核侧不传 scope，取严）
      const prepared = prepareScoring({ sample, reportText, scope })
      const res = await sendMessage(prepared.prompt.messages, prepared.prompt.system, {
        temperature: 0,          // 评分要稳，关掉随机性
        maxTokens: 4000,
        timeout: 180000,
        model: SCORING_MODEL || undefined
      })
      if (!res.ok) {
        error.value = res.content || '模型不可用'
        return { ok: false, reason: '模型调用失败' }
      }
      const settled = prepared.settle(res.content)
      if (!settled.ok) {
        error.value = settled.reason
        return { ok: false, reason: settled.reason }
      }
      return { ok: true, result: settled.result, rubric: prepared.rubric }
    } catch (e) {
      error.value = e.message
      return { ok: false, reason: e.message }
    } finally {
      running.value = false
    }
  }

  return { running, error, score }
}
