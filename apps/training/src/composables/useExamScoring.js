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
import { getImagingSample, COMMENT_SCOPE } from '@ai-sp/shared/imaging'
import { useReportScoring } from '@ai-sp/shared/imaging-ui'
import { readExamRecords, updateExamRecord, addPracticeExamRecord } from './useExamRecords'

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
      const res = await scoring.score({
        sample,
        reportText: { ...(rec.draft || {}) },
        scope: COMMENT_SCOPE.TRAINING
      })
      if (res.ok && res.result) {
        updateExamRecord(rec.id, {
          status: 'done',
          score: res.result.rawTotal,
          scoreableMax: res.result.scoreableMax,
          result: res.result,
          error: ''
        })
      } else {
        updateExamRecord(rec.id, { status: 'failed', error: res.reason || '评分失败' })
      }
      emit()
    }
    toast.show('练习考成绩已生成，可在「已考」查看', 'success', 3000)
  } finally {
    running = false
    emit()
  }
}
