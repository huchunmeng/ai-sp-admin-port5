// 老师派发的考核任务 —— 学员端「我的考核任务」
//
// 平台口径（需求 Q10 / 老胡补充 3）：**考试由老师创建后派发，学生不自选病例**；
// 派发界面归教师端，本模块只**消费**任务数据契约，不做派发。
//
// 落到平台上的结构：任务 = 一次考核里「影像报告书写站」这个考站的实例
//   · 组卷/派发复用已有考试流程（`StationSettings` 考站类型 + `ExamCreate` 四步向导）
//   · `examMode` 就是考站类型上的配置项 0：onsite 现场考站机 / online 学员自有设备
//   · `scoreVisible` / `retake` / `durationMin` / `passLine` 对应《考核功能设计》§5.0 配置表

export const EXAM_MODE = { ONSITE: 'onsite', ONLINE: 'online' }

export const EXAM_MODE_LABEL = {
  onsite: '现场考站机',
  online: '在线考试（自有设备）'
}

export const EXAM_TASKS = [
  {
    id: 'TASK-20260921-01',
    name: '2026年住培结业实践技能考核 · 影像报告书写',
    scheme: '住培结业实践技能考核 · 放射科（OSCE 第 3 站）',
    examMode: 'online',
    caseIds: ['KNEE-001'],
    durationMin: 20,                 // S03 官方口径：20 分钟 · 笔试 · 100 分
    passLine: 67.2,
    scoreVisible: { when: 'afterWindow', content: 'total' },   // §5.0 项 1a / 1b
    retake: 'single',
    windowStart: '2026-09-18 00:00',
    windowEnd: '2026-12-31 23:59',
    dispatchedBy: '李老师',
    dispatchedAt: '2026-09-18 09:20'
  },
  {
    id: 'TASK-20260922-02',
    name: '影像报告书写 · 随堂测验（放射科）',
    scheme: '随堂测验',
    examMode: 'online',
    caseIds: ['PUB-001'],
    durationMin: 20,
    passLine: 67.2,
    scoreVisible: { when: 'afterSubmit', content: 'detail' },
    retake: 'latest',
    windowStart: '2026-09-18 00:00',
    windowEnd: '2026-12-31 18:00',
    dispatchedBy: '王老师',
    dispatchedAt: '2026-09-21 16:40'
  },
  {
    id: 'TASK-20261008-03',
    name: '影像报告书写 · 10月月考',
    scheme: '正式考核（现场考站）',
    examMode: 'onsite',
    caseIds: ['SEU-001'],
    durationMin: 20,
    passLine: 70.4,
    scoreVisible: { when: 'afterWindow', content: 'total' },
    retake: 'single',
    windowStart: '2026-10-08 09:00',
    windowEnd: '2026-10-08 11:00',
    dispatchedBy: '李老师',
    dispatchedAt: '2026-09-28 10:05'
  },
  {
    // 现场考站机场次：考试端 apps/exam 用这条演示「考站机 → 学号校验 → 须知 → 作答 → 交卷」
    id: 'TASK-20260921-04',
    name: '影像报告书写 · 现场考站（今日场次）',
    scheme: '住培结业实践技能考核 · 放射科（OSCE 第 3 站）',
    examMode: 'onsite',
    caseIds: ['KNEE-001'],
    durationMin: 20,
    passLine: 67.2,
    scoreVisible: { when: 'afterSubmit', content: 'detail' },   // 现场考站：交卷后当场出分
    retake: 'single',
    windowStart: '2026-09-18 00:00',
    windowEnd: '2026-12-31 23:59',
    dispatchedBy: '李老师',
    dispatchedAt: '2026-09-21 08:00'
  }
]

export function taskById(id) {
  return EXAM_TASKS.find(t => t.id === id) || null
}

/** 现场考站机用：取当前可开考的现场任务（窗口开放中的第一个） */
export function onsiteTaskAt(at = Date.now()) {
  return EXAM_TASKS.find(t => t.examMode === EXAM_MODE.ONSITE && windowStateOf(t, at) === 'open') || null
}

/** 考试窗口状态：未开始 / 开放中 / 已结束 */
export function windowStateOf(task, at = Date.now()) {
  const s = Date.parse(String(task.windowStart).replace(/-/g, '/'))
  const e = Date.parse(String(task.windowEnd).replace(/-/g, '/'))
  if (at < s) return 'notStarted'
  if (at > e) return 'expired'
  return 'open'
}

export const WINDOW_LABEL = { notStarted: '未开始', open: '开放中', expired: '已结束' }
