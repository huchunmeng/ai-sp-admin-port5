// AI伴学 —— 向大模型要一条提示，并做**出站红线校验**
//
// 评审批注：「改为AI伴学，这里其实是大模型根据题目答案（真实判读结果）给出少量提示信息」。
// 因此数据源 = 模型读**金标准报告（题目答案）** + 学员该段已写内容，产出少量提示。
//
// 流程（PRD §5.7.2 的「受理即原子预扣 + 失败回滚」由调用方 useReportSession 负责配额部分）：
//   组装 prompt（L1 走静态库，不调模型）→ 调 /api/llm → **红线校验** → 通过则返回，不通过则返回降级文案
//
// ⚠️ 本期把红线校验放在**前端**兜底（正式版在服务端出站层，PRD §9.5）。已实现：
//   · 红线 A：与金标准全文的最长公共子串 ≤ 8
//   · 红线 B2：不得命中金标准中的测量值与具体征象词
//   未实现：B1 结论短语自动抽取（靠红线 A 兜底，复述结论必然触发 ≥8 字连续片段）；
//   已知缺口：改写措辞复述结论可绕过，需按 PRD §12 场景 16 构造对抗样本回归。

import { useAIChat } from './useAIChat'
import {
  buildCompanionPrompt, checkRedline, extractFactWords,
  L1_HINTS, DEGRADED_HINT
} from '@ai-sp/shared/imaging'

export function useReportCompanion() {
  const { sendMessage } = useAIChat()

  /**
   * 取一条提示。
   * @returns {Promise<{ok:boolean, text:string, l1?:boolean, degraded?:boolean, reason?:string, redline?:object}>}
   */
  async function fetchHint({ caseTitle, sample, segment, level, draftText }) {
    // L1 是纯体裁知识（不涉及本病例）——走静态库：确定性、零成本、零泄漏风险
    if (level === 'L1') {
      return { ok: true, l1: true, text: L1_HINTS[segment] || L1_HINTS.findings }
    }

    const gold = sample && sample.goldStandard
    if (!gold) {
      return { ok: false, degraded: true, text: DEGRADED_HINT, reason: '该病例没有金标准报告，无法生成提示' }
    }

    const prompt = buildCompanionPrompt({
      caseTitle, goldStandard: gold, segment, level, draftText
    })
    const res = await sendMessage(prompt.messages, prompt.system, { temperature: 0.3, maxTokens: 260 })

    if (!res.ok) {
      return { ok: false, degraded: true, text: DEGRADED_HINT, reason: '模型调用失败' }
    }

    const text = String(res.content || '').trim()
    if (!text) {
      return { ok: false, degraded: true, text: DEGRADED_HINT, reason: '模型返回空内容' }
    }

    // 出站红线校验
    const goldText = [gold.technique, gold.findings, gold.impression].filter(Boolean).join('\n')
    const facts = extractFactWords(gold)
    const redline = checkRedline(text, goldText, facts)
    if (!redline.passed) {
      return {
        ok: false, degraded: true, text: DEGRADED_HINT, redline,
        reason: redline.factHit
          ? `命中金标准事实词（${redline.hits.slice(0, 3).join('、')}）`
          : `与金标准最长公共子串 ${redline.maxCommonSubstring} 字 > ${8}`
      }
    }

    return { ok: true, text, redline }
  }

  return { fetchHint }
}
