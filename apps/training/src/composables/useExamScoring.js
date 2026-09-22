// 练习考评分队列（**模块级**，不挂在组件上）
//
// 为什么要独立成一个队列：练习考交卷后要**直接回列表页**，考生不再停在成绩页。
// 如果评分还留在考试室组件里，组件一卸载评分就断了 —— 那条记录会永远停在"评阅中"。
// 所以：
//   · 交卷 → 立刻落一条 `pending` 记录（答卷先入库）→ 回列表 → toast 提示"成绩生成需要时间"
//   · 本模块在后台把 pending 记录逐条评掉，评完回填 `done`/`failed`，并 toast 通知
//   · 关页/切走也不丢：下次进入任何会 import 本模块的页面时 `resumeExamScoring()` 会补评
//
// 口径：练习考走**训练口径**（COMMENT_SCOPE.TRAINING，不跑考核红线校验），与页面里"不计成绩、
// 用于熟悉考试形态"的说明一致；正式考核仍由考核服务评阅，不走这里。

import { toast } from '@ai-sp/shared'
import { getImagingSample, COMMENT_SCOPE, resolveRubric, composeScore, applyExamScale, GOLD_SEGMENTS } from '@ai-sp/shared/imaging'
import { useReportScoring } from '@ai-sp/shared/imaging-ui'
import { readExamRecords, updateExamRecord, addPracticeExamRecord } from './useExamRecords'

/**
 * 练习考成绩是否用 **mock 填充**（演示用）。
 *
 * `true`  → 交卷后不调大模型，直接用**真实评分引擎 + 模拟逐要点判定**造一份结构完全同构的成绩，
 *           交卷即出分（演示/走查时不用等 30–60 秒，也不受模型可用性影响）
 * `false` → 回到"交卷 → 后台真评"的路径（调 LLM，口径不变）
 *
 * 注意：mock 只作用于**练习考**；正式考核始终由考核服务真评。
 */
export const MOCK_PRACTICE_SCORE = true

/** 交卷到出分的模拟耗时（保留一点"评阅中"的过程感，可设 0） */
const MOCK_DELAY_MS = 800

/* ── mock 判定：**完全由学员写的内容推出来** ─────────────────────────────
   两步，都只看学员答卷：
   ① 总分目标：金标准报告的 2-gram 有多少出现在学员报告里（覆盖率）→ 标定成满分占比。
      实测分离度：认真写 0.12–0.25，只写一句/写跑题 ≤0.05，空答卷 0。
   ② 逐要点分配：按"该要点文本在答卷里的局部命中"排序，**贪心**把要点记满分/半分，
      直到累计达到目标分。所以分数落在哪些要点上，也是由答卷内容决定的（缺失项即剩下的）。
   —— 不调模型，但结构与真评完全同构（composeScore 出总分/维度分/缺失项/逐要点）。 */

const clean = s => String(s || '').replace(/[\s，。；、,.;:：()（）\/\-—]/g, '')
const grams2 = s => { const g = []; for (let i = 0; i + 1 < s.length; i++) g.push(s.slice(i, i + 2)); return g }

/** 金标准全文（与 scoring.js 内部 goldFullText 同规则：三段金标准 + 题面检查目的） */
function goldTextOf(sample) {
  const g = (sample && sample.goldStandard) || {}
  return [GOLD_SEGMENTS.map(x => g[x.goldKey]), sample && sample.purpose].flat().filter(Boolean).join('\n')
}

/** 金标准的 2-gram 被学员报告覆盖的比例（0–1） */
function goldCoverage(sample, draftText) {
  const uniq = [...new Set(grams2(clean(goldTextOf(sample))))]
  if (!uniq.length) return 0
  const d = clean(draftText)
  return uniq.filter(x => d.includes(x)).length / uniq.length
}

/** 某要点文本被学员报告覆盖的比例（用于排序，不直接当分） */
function pointCoverage(pointText, draftText) {
  const p = clean(pointText)
  if (p.length < 2) return 0
  const g = [...new Set(grams2(p))]
  const d = clean(draftText)
  return g.filter(x => d.includes(x)).length / g.length
}

/** 覆盖率 → 满分占比（分段线性；标定到"认真写≈0.6–0.95、跑题≈0"） */
const CALIB = [[0.05, 0.25], [0.12, 0.60], [0.25, 0.88], [0.40, 0.97]]
function calibOf(c) {
  if (c <= 0.02) return 0
  if (c >= CALIB[CALIB.length - 1][0]) return CALIB[CALIB.length - 1][1]
  for (let i = 1; i < CALIB.length; i++) {
    const [x0, y0] = CALIB[i - 1], [x1, y1] = CALIB[i]
    if (c <= x1) return y0 + (y1 - y0) * (c - x0) / (x1 - x0)
  }
  return 0
}

/** 造一份 mock 成绩：结构与真评一致（逐条目逐要点 + 缺失项 + 达标判定 + 归一化字段） */
function buildMockResult({ sample, draft }) {
  const rubric = resolveRubric(sample.id, sample.capabilities)
  const draftText = Object.values(draft || {}).join('\n')
  const target = rubric.scoreableMax * calibOf(goldCoverage(sample, draftText))

  // 可评要点按"答卷里的局部命中"排序，贪心分配到目标分
  const all = []
  for (const item of rubric.items) {
    for (const p of item.points) {
      if (!p.assessable) continue
      all.push({ code: item.code, id: p.id, weight: Number(p.score), cov: pointCoverage(p.text, draftText) })
    }
  }
  const ranked = [...all].sort((a, b) => b.cov - a.cov)
  const hitOf = {}
  let acc = 0
  for (const p of ranked) {
    if (acc + p.weight <= target) { hitOf[`${p.code}::${p.id}`] = 1; acc += p.weight }
  }
  for (const p of ranked) {
    const k = `${p.code}::${p.id}`
    if (hitOf[k] !== undefined) continue
    if (acc + p.weight * 0.5 <= target) { hitOf[k] = 0.5; acc += p.weight * 0.5 }
  }

  const byItem = {}
  for (const item of rubric.items) {
    byItem[item.code] = item.points
      .filter(p => p.assessable)
      .map(p => {
        const score = hitOf[`${item.code}::${p.id}`] || 0
        return {
          id: p.id,
          text: p.text,
          score,
          comment: score === 1 ? '已写到，表述基本规范' : score === 0.5 ? '提及但不够具体' : '未提及'
        }
      })
  }
  const composed = composeScore({ byItem }, rubric, sample, COMMENT_SCOPE.TRAINING)
  // 练习考没有考务设定的达标线 → 走难度标定，并把分数归一化（与真评路径一致）
  return applyExamScale(composed, null, 'normalize')
}

/** 模块级评分器：不依赖组件实例，页面卸载也不会中断 */
const scoring = useReportScoring()
let running = false
const listeners = new Set()

/** 订阅"某条记录评完了"，返回取消订阅函数（列表页用它刷新） */
export function onExamRecordScored(cb) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}
function emit() {
  listeners.forEach(cb => { try { cb() } catch (e) { /* 单个订阅者出错不影响其它 */ } })
}

/** 练习考交卷：先落 pending 记录，再让队列去评（调用方随后可以立刻离开页面） */
export function enqueuePracticeExam({ sample, draft }) {
  const rec = addPracticeExamRecord({ sample, draft, status: 'pending' })
  resumeExamScoring()
  return rec
}

/** 把当前所有 pending 记录评掉（幂等；正在评时直接返回） */
export async function resumeExamScoring() {
  if (running) return
  const pending = readExamRecords().filter(r => r.status === 'pending')
  if (!pending.length) return
  running = true
  try {
    for (const rec of pending) {
      const sample = getImagingSample(rec.caseId) || {}
      let result = null
      let failReason = ''
      if (MOCK_PRACTICE_SCORE) {
        // mock 填充：由学员答卷内容直接推分（不调模型）；留一点点延时保留"评阅中"的过程感
        if (MOCK_DELAY_MS) await new Promise(r => setTimeout(r, MOCK_DELAY_MS))
        try {
          result = buildMockResult({ sample, draft: rec.draft || {} })
        } catch (e) {
          failReason = e.message
        }
      } else {
        const res = await scoring.score({
          sample,
          reportText: { ...(rec.draft || {}) },
          scope: COMMENT_SCOPE.TRAINING
        })
        result = res.ok ? res.result : null
        failReason = res.ok ? '' : (res.reason || '评分失败')
      }
      if (result) {
        updateExamRecord(rec.id, {
          status: 'done',
          score: result.rawTotal,
          scoreableMax: result.scoreableMax,
          result,
          error: ''
        })
      } else {
        updateExamRecord(rec.id, { status: 'failed', error: failReason || '评分失败' })
      }
      emit()
    }
    toast.show('练习考成绩已生成，可在「已考」查看', 'success', 3000)
  } finally {
    running = false
    emit()
  }
}
