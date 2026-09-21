// 影像报告书写 · 作答页共享模块（**两端共用一套实现**）
//
// 为什么共用：同一份作答界面要在两个端上跑 ——
//   · 现场考站机 = `apps/exam`（登录/排队/设备绑定/监考）
//   · 在线考试（学员自有设备）= `apps/training` 的「在线考试」入口
// 各写一份必然漂移，因此阅片器、四段式表单、成绩报告都放这里。
//
// 只放"作答与评分呈现"相关的东西；训练侧独有的伴学面板/笔记/练习记录不进这里。

export { default as ImageViewer } from './ImageViewer.vue'
export { default as ImagePanel } from './ImagePanel.vue'
export { default as SegmentForm } from './SegmentForm.vue'
export { default as ComparePanel } from './ComparePanel.vue'
export { default as ScoreResultPanel } from './ScoreResultPanel.vue'
export { default as ScoreReportModal } from './ScoreReportModal.vue'

export { useReportScoring } from './useReportScoring.js'
export { sendLlm } from './llm.js'

export {
  EXAM_SERVER, currentClientId, loadSession, saveSession, startOrResume, submitSession,
  clearSession, remainingSec, sessionStateOf, useExamSession
} from './useExamSession.js'
