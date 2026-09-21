// 报告评分调用层 —— 把 shared 里的纯逻辑接到各端的 /api/llm 上
//
// 分工：`packages/shared/data/imaging/scoring.js` 负责 prompt 组装、结果解析、成绩合成与出站红线；
// 本文件只负责 HTTP 与时序。这样评分逻辑可以脱离浏览器单测。
//
// 模型选择：评分要求**严格 JSON** + 逐要点判定，比对话提示更吃模型能力，故默认用 `qwen-plus`。
// 若部署环境没有该模型，改这里的常量或置空走 vite 代理的环境默认（LLM_MODEL）。
//
// **两端共用**：训练端（在线考试 / 学员自己设备）与考核端（现场考站机）用同一份实现；
// scope 决定点评口径 —— 训练侧放宽（不跑红线校验），考核侧取严（COMMENT_SCOPE.EXAM）。

import { ref } from 'vue'
import { prepareScoring, COMMENT_SCOPE } from '@ai-sp/shared/imaging'
import { sendLlm } from './llm.js'

const SCORING_MODEL = 'qwen-plus'

/**
 * 给评分结果补上**考务口径**的分数与达标判定（两侧展示统一读这几个字段）。
 *
 * 量纲由 `scoreScale` 定死：
 *   · `normalize` → 百分制：finalMax = 100，finalScore = rawTotal / scoreableMax × 100
 *   · `raw`       → 本卷可评满分量纲：finalMax = scoreableMax，finalScore = rawTotal
 * `scoreableMax` 为 0（不可评）时不做除法，直接回落 raw，避免除零。
 *
 * 达标线：有考务设定（`passLine` 传了数字）就用它，并把难度标定原值留在 `rubricPassLine`；
 * 没传（练习考）保持难度标定值 —— 两种情况都写 `passLineSource`，便于界面区分文案。
 */
function withExamScale(result, passLine, scoreScale) {
  if (!result || typeof result !== 'object') return result
  const rawTotal = Number(result.rawTotal) || 0
  const scoreableMax = Number(result.scoreableMax) || 0
  let finalScore = rawTotal
  let finalMax = scoreableMax
  if (scoreScale === 'normalize' && scoreableMax > 0) {
    finalMax = 100
    finalScore = Math.round(rawTotal / scoreableMax * 1000) / 10
  }
  const hasExamLine = passLine !== null && passLine !== undefined && passLine !== '' && !isNaN(Number(passLine))
  const rubricPassLine = typeof result.passLine === 'number' ? result.passLine : null
  const line = hasExamLine ? Number(passLine) : rubricPassLine
  return {
    ...result,
    finalScore,
    finalMax,
    rubricPassLine,
    passLine: line,
    passLineSource: hasExamLine ? 'exam' : 'rubric',
    passed: typeof line === 'number' ? finalScore >= line : null
  }
}

export function useReportScoring() {
  const running = ref(false)
  const error = ref('')

  /**
   * 给一份报告打分。
   * @param {{sample:object, reportText:{technique,findings,impression}, scope?:string,
   *          passLine?:number|null, scoreScale?:'normalize'|'raw'}} payload
   *        `passLine` / `scoreScale` 是**考务设定**（来自派发任务）；练习考不传，走难度标定口径。
   * @returns {Promise<{ok:boolean, result?:object, rubric?:object, reason?:string}>}
   */
  async function score({ sample, reportText, scope = COMMENT_SCOPE.TRAINING, passLine = null, scoreScale = 'normalize' }) {
    running.value = true
    error.value = ''
    try {
      // 训练侧默认放宽点评口径（考核侧不传 scope，取严）
      const prepared = prepareScoring({ sample, reportText, scope })
      const res = await sendLlm(prepared.prompt.messages, prepared.prompt.system, {
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
      return { ok: true, result: withExamScale(settled.result, passLine, scoreScale), rubric: prepared.rubric }
    } catch (e) {
      error.value = e.message
      return { ok: false, reason: e.message }
    } finally {
      running.value = false
    }
  }

  return { running, error, score }
}
