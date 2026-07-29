# AI伴学 + 专家点评 整合技术方案

> 版本: v1.1 | 日期: 2026-07-28 | 作者: AI-SP 技术组 | 状态: 规划中

---

## 一、现状分析

### 1.1 已有资产

| 文件 | 当前状态 | 问题 |
|------|---------|------|
| `AICompanionDrawer.vue` | 浮动面板，含"智能问答"+"专家点评"两个Tab | 数据全静态硬编码；只在考站页面出现 |
| `AICompanion.vue` | 独立全屏页面（病例+伴学双栏） | 未挂载到路由，无法访问 |
| `AICompanionDetail.vue` (admin) | 管理端预览页 | 同上静态数据 |
| `AdaptiveLearning.vue` | 学习画像页面 | 全部硬编码数据 |
| `training.js store` | 训练记录存储 | 只记录训练结果，无行为过程数据 |
| `exam.js store` | 考试端状态管理 | 对话/评分/诊断数据仅在Pinia内存中 |
| `exam/Scoring.vue` | 考官评分界面 | 评分表数据完整但未持久化联动画像 |

### 1.2 核心差距

| 维度 | 现状 | 目标 |
|------|------|------|
| 专家点评 | 静态文章展示 | AI实时感知学员操作 → 主动点评 |
| 智能问答 | 预置8条问答 | AI理解上下文 → 自由问答 |
| 覆盖范围 | 仅考站页面 | 训练端全页面（首页/列表/详情/考站/报告） |
| 用户画像 | 硬编码假数据 | 基于训练+考试真实数据的动态画像 |
| 考试数据 | 孤立在考试端内存中 | 考试完成时同步到服务端，汇入画像 |
| 考试数据 | 孤立在考试端内存中 | 统一汇入画像系统作为高权重数据源 |

---

## 二、总体架构

```
┌───────────────────────────────────┐   ┌──────────────────────────────┐
│       训练端 (apps/training)       │   │      考试端 (apps/exam)        │
│                                   │   │                              │
│  ┌─────────────────────────────┐  │   │  AI伴学 ❌ 不启用             │
│  │     AICompanionDrawer        │  │   │  (考试公平性约束)             │
│  │  显示: 详情/考站/报告         │  │   │                              │
│  │  ┌───────┐  ┌────────────┐  │  │   │  考试数据 ✅ 汇入画像         │
│  │  │ QA    │  │ 点评       │  │  │   │  (评分表/诊断/对话)          │
│  │  └───┬───┘  └─────┬──────┘  │  │   │                              │
│  │      └──────┬──────┘         │  │   │                              │
│  │             ▼                │  │   │                              │
│  │      ┌────────────┐          │  │   │                              │
│  │      │ AI Service │          │  │   │                              │
│  │      └────────────┘          │  │   │                              │
│  └─────────────────────────────┘  │   │                              │
│                                   │   │                              │
└───────────────────┬───────────────┘   └──────────────┬───────────────┘
                    │                                  │
        ┌───────────┼──────────┐            ┌──────────┼──────────┐
        │ 训练记录   │ AI日志   │            │ 考试记录  │ 评分数据  │
        │ (已有)    │ (新增)   │            │ (新增)   │ (新增)   │
        └───────────┼──────────┘            └──────────┼──────────┘
                    │                                  │
                    ▼                                  ▼
         ┌─────────────────────────────────────────────────────┐
         │              后端服务 (sp-api)                       │
         │  /api/companion/*     ← AI伴学 (QA + 点评)           │
         │  /api/exam/records    ← 考试数据同步                 │
         │  /api/profile/*       ← 画像查询 (后续P3)            │
         └─────────────────────────────────────────────────────┘
```

### 2.1 核心原则

1. **统一上下文**: 智能问答和专家点评共享同一份上下文（病例+用户画像+操作历史）
2. **按需出现**: AI伴学仅在学员有实际需求的页面显示（详情/考站/报告），不铺张
3. **训考分离**: AI伴学**仅在训练端**提供服务（考试端禁用，保证公平）；但考试数据汇入画像
4. **数据已有，直接聚合**: 不从UI层埋点，画像所需数据全部来自现有业务数据流
5. **渐进增强**: 画像能力随数据积累逐步丰富，初始用规则兜底
6. **考试数据高权重**: 考试是"裸考"环境，其评分在画像中权重高于训练评分

### 2.2 训练 vs 考试：数据角色

| | 训练端 | 考试端 |
|------|------|------|
| **AI伴学** | ✅ 可用 (仅详情/考站/报告) | ❌ 不可用 (防作弊) |
| **数据特点** | 有AI辅助，成绩可能"虚高" | 无辅助，真实水平 (裸考) |
| **画像权重** | 基准权重 1.0 | 高权重 1.5~2.0 |
| **关键数据** | 对话轮次、操作路径、提问内容 | 评分表、诊断准确性、时间控制 |

---

## 三、AI伴学系统设计

### 3.1 双模式定义

| | 智能问答 (QA) | 专家点评 (Commentary) |
|------|------|------|
| **触发方** | 学员主动 | AI主动 |
| **交互模式** | 对话式（一问一答） | 推送式（点评气泡弹出） |
| **时效性** | 即时响应 | 事件驱动+频率控制 |
| **上下文** | 当前页面+病例+对话历史 | 学员操作事件+病例+画像 |
| **UI形态** | 聊天窗口 | 数字人面板+气泡 |

### 3.2 显示范围与模式

AI伴学只在**学员有实际AI需求**的页面显示，不是到处都有：

| 页面 | 是否需要 | 理由 | 默认状态 |
|------|---------|------|---------|
| **病例详情** | ✅ | 训前预习，阅读病例时有疑问可以问 | 迷你按钮，点击展开侧边面板 |
| **考站训练** | ✅ | 核心场景，AI主动点评+学员主动提问 | 侧边面板，默认专家点评Tab |
| **成绩报告** | ✅ | 训后复盘，对评分结果有疑问可以问 | 迷你按钮，点击展开侧边面板 |
| 首页 | ❌ | 概览浏览，没有AI需求 | 不显示 |
| 病例列表 | ❌ | 搜索筛选，没有AI需求 | 不显示 |
| MDT讨论 | ❌ | 团队讨论有其他人在场，不适合AI交互 | 不显示 |
| 学习画像 | ❌ | 纯数据展示页面 | 不显示 |

### 3.3 修改 TrainingLayout

```vue
<!-- 当前: 仅考站页面显示 -->
<AICompanionDrawer v-if="isStationRoute" />

<!-- 改为: 详情/考站/报告三个页面显示 -->
<AICompanionDrawer
  v-if="isStationRoute || route.name === 'caseDetail' || route.name === 'scoreReport'"
/>
```

### 3.4 不同页面的默认行为

```javascript
// AICompanionDrawer.vue 内部
const route = useRoute()

// 考站训练 → 默认专家点评Tab，侧边面板展开
// 病例详情 → 默认智能问答Tab，初始迷你模式
// 成绩报告 → 默认智能问答Tab，初始迷你模式
const defaultTab = computed(() =>
  stationRoutes.includes(route.name) ? 'commentary' : 'qa'
)
const initiallyExpanded = computed(() =>
  stationRoutes.includes(route.name)  // 考站默认展开，其他页面迷你
)
```

---

## 四、用户行为数据策略

### 4.1 核心原则：数据已有，只需聚合

所有对画像有价值的数据**已经在现有流程中产生**，不需要在UI层额外埋点：

| 数据 | 当前去处 | 当前问题 |
|------|---------|---------|
| 训练对话消息 | `trainingSession` → `POST /api/training/session-save` | ✅ 已持久化 |
| 训练评分结果 | `addTrainingRecord()` → `POST /api/training-records` | ✅ 已持久化 |
| 考试对话消息 | `examStore.dialogueMessages` (Pinia内存) | ❌ 未持久化，关闭即丢失 |
| 考试评分表 | `examStore.scoreSheets` + `Scoring.vue` | ❌ 未持久化 |
| 考试诊断/书写 | `examStore.preliminaryDiag` / `writingContent` | ❌ 未持久化 |
| AI伴学问答 | 前端内存 (qaMessages) | ❌ 未持久化 |
| AI专家点评 | 前端内存 (commentaries) | ❌ 未持久化 |
| 学习时长 | `trainingSession` 中的时间戳 | ✅ 可从已有数据推算 |

### 4.2 改进策略：补缺口，不加埋点

只需做三件事：

#### (1) 考试数据持久化 — 考试完成时一次性同步

```javascript
// exam/Complete.vue 或 exam/Scoring.vue 中:
async function syncExamResult() {
  await fetch('/api/exam/records', {
    method: 'POST',
    body: JSON.stringify({
      userId: examStore.examInfo.candidateName,
      examId: examStore.examId,
      stationId: examStore.examInfo.station,
      scoreData: examStore.scoreSheets,
      dialogues: examStore.dialogueMessages,
      diagnosis: examStore.preliminaryDiag,
      writingContent: examStore.writingContent,
      duration: Date.now() - examStartTime,
    })
  })
}
```

#### (2) AI伴学数据持久化 — 在后端API层自动记录

```
POST /api/companion/qa
  → 后端生成回答后，自动写入 companion_history 表
  → 无需前端额外处理

POST /api/companion/commentary/generate
  → 后端生成点评后，自动写入 commentary_history 表
  → 无需前端额外处理
```

#### (3) 画像聚合 — 服务端定时/触发式从已有数据计算

```
训练记录 (training_records)  ──┐
考试记录 (exam_records)      ──┼──→ ProfileEngine ──→ 画像数据
伴学记录 (companion_history) ──┘
```

### 4.3 数据流总结

```
训练端                              考试端
  │                                   │
  │ SP对话 → session-save ──┐        │ 对话消息
  │ 评分 → training-records ─┤       │ 评分表
  │ AI问答 → companion/qa ───┤       │ 诊断
  │ AI点评 → commentary ─────┤       │ 书写
  │                          │       │
  │                    already persists  │ 当前: Pinia内存(丢失)
  │                          │       │ 改为: Complete时 POST /api/exam/records
  │                          │       │
  └──────────────────────────┼───────┘
                             │
                     ┌───────▼────────┐
                     │   数据存储层     │
                     │  training_*     │
                     │  exam_*         │
                     │  companion_*    │
                     └───────┬────────┘
                             │
                     ┌───────▼────────┐
                     │  ProfileEngine  │  ← 新增：聚合计算
                     └───────┬────────┘
                             │
                     ┌───────▼────────┐
                     │  GET /api/     │
                     │  profile/:uid  │
                     └────────────────┘
```

### 4.4 这样做的优势

- **零侵入**: 不需要在十几个Vue组件中加埋点代码
- **数据不重复**: 不额外存储一份"事件日志"，直接从业务数据聚合
- **天然准确**: 业务数据已经是结构化、验证过的，比埋点数据更可靠
- **维护成本低**: 新增考站或功能不需要同步更新埋点逻辑

---

## 五、用户画像引擎

### 5.1 画像数据模型

```javascript
const userProfile = {
  userId: 'zhangzimo',

  // 基础统计 (训练+考试合并)
  overview: {
    totalTrainCases: 18,        // 累计训练病例数
    totalExamSessions: 3,       // 累计考试次数
    totalTrainHours: 12.5,      // 累计训练时长(小时)
    totalExamHours: 2.0,        // 累计考试时长(小时)
    streakDays: 5,              // 连续学习天数
    lastActiveAt: '2026-07-28T09:30:00Z',
    lastExamAt: '2026-07-20T14:00:00Z',
  },

  // 五维能力 (训练+考试合并，考试权重高)
  dimensions: {
    historyTaking: { trainScore: 75, examScore: 68, composite: 72, trend: '+3', sampleSize: 18 },
    diagnosis:      { trainScore: 62, examScore: 55, composite: 59, trend: '-2', sampleSize: 15 },
    physicalExam:   { trainScore: 68, examScore: 70, composite: 69, trend: '+5', sampleSize: 12 },
    treatment:      { trainScore: 80, examScore: 75, composite: 78, trend: '+1', sampleSize: 10 },
    communication:  { trainScore: 72, examScore: 65, composite: 69, trend: '+4', sampleSize: 8 },
  },

  // 训练考试的差异分析 (高分低能检测)
  gapAnalysis: {
    diagnosis: { trainExamGap: 7, flag: 'warning', note: '训练得分显著高于考试，AI辅助依赖偏高' },
    communication: { trainExamGap: 7, flag: 'warning' },
  },

  // 薄弱点 (从评分细则+考试失分+AI互动中提取)
  weaknesses: [
    { area: '心血管鉴别诊断', trainRate: 0.60, examRate: 0.75, severity: 'high', evidence: 5 },
    { area: '肺部听诊发现', trainRate: 0.55, examRate: 0.60, severity: 'high', evidence: 4 },
  ],

  // 专科分布
  specialties: [
    { name: '心内科', trainCount: 5, examCount: 1, trainAvgScore: 76, examAvgScore: 70 },
    // ...
  ],

  // ... 其余字段同上
}
```

### 5.2 画像更新时机

| 触发条件 | 更新内容 |
|---------|---------|
| 训练完成(评分生成) | dimensions (trainScore)、weaknesses、specialties |
| 考试评分提交 | dimensions (examScore)、gapAnalysis、weaknesses |
| 每日凌晨 | streakDays、overview |
| AI互动后 | preferences |
| 手动刷新 | 全量重算 |

### 5.3 画像数据来源映射

```
数据来源                           →  画像字段           权重
─────────────────────────────────────────────────────────
training.*.score                  →  dimensions.trainScore    1.0
training.message.send (轮次)      →  dimensions.historyTaking 1.0
exam.score.receive                →  dimensions.examScore     2.0 ★
exam.dialogue.send (轮次)         →  dimensions.historyTaking 1.5
exam.diagnosis.submit (准确性)    →  dimensions.diagnosis     2.0 ★
companion.qa.ask (问题类型)       →  weaknesses (困惑领域)     1.0
training.station.timeout          →  preferences.avgDuration  1.0
exam.complete (总时长)            →  preferences.avgDuration  1.5
page.enter (时段统计)              →  preferences.preferredTime 1.0
exam.score vs training.score 差异  →  gapAnalysis             —
```

### 5.4 考试数据的关键价值

- **训练-考试分数差异 (Gap Analysis)**：如果训练分显著高于考试分，说明学员**过度依赖AI辅助**，画像可标记"需减少AI依赖，加强独立诊断训练"
- **裸考薄弱点**：考试中暴露的问题比训练中更真实，画像中考试失分项标记 severity=critical
- **压力环境表现**：考试有时间压力，可以对比训练和考试中同一学员的操作效率差异

---

## 六、文件变更清单

### 6.1 新增文件

```
apps/training/src/
├── composables/
│   ├── useAICompanion.js           ← AI伴学核心逻辑 (状态/上下文/API)
│   └── useExpertCommentary.js      ← 专家点评引擎 (事件→点评触发)
├── components/
│   ├── AICompanionDrawer.vue       ← [重写] 统一伴学面板 (双Tab: 问答+点评)
│   ├── ExpertPanel.vue             ← 数字人点评面板 (头像+气泡+语音)
│   ├── ExpertAvatar.vue            ← 数字人动画组件
│   ├── QAChat.vue                  ← 问答聊天组件 (从Drawer拆出)
│   └── CommentaryBubble.vue        ← 点评气泡组件
├── stores/
│   └── userProfile.js              ← 用户画像 Store (后续P3)

services/sp-api/src/
└── companion/
    ├── index.js                    ← AI伴学API路由
    ├── qa-engine.js                ← 智能问答引擎
    └── commentary-engine.js        ← 专家点评引擎
```

### 6.2 修改文件

```
训练端 (apps/training):
├── layouts/TrainingLayout.vue     ← 扩展AI伴学显示范围: caseDetail + scoreReport
├── router/index.js                ← 添加 AICompanion 独立页面路由 (可选)
├── views/
│   ├── ScoreReport.vue            ← 专家点评摘要板块
│   ├── AdaptiveLearning.vue       ← 后续接入真实画像数据 (P3)
│   ├── history-taking/HistoryTaking.vue  ← 接入点评事件
│   ├── physical-exam/PhysicalExam.vue    ← 接入点评事件
│   └── diagnosis/Diagnosis.vue           ← 接入点评事件

考试端 (apps/exam):
└── views/
    └── Complete.vue / Scoring.vue ← 考试完成后同步数据到服务端

服务端:
└── services/sp-api/src/index.js   ← 添加 /api/companion/*、/api/exam/records 路由
```

---

## 七、API 设计

### 7.1 AI伴学 API

```
POST /api/companion/qa
  → 智能问答
  → { question, context: { caseId, stationId, page, history } }
  ← { answer, refs?, suggestions? }

POST /api/companion/commentary/check
  → 检查是否需要触发点评 (轻量级, 高频调用)
  → { event, context: { caseId, stationId, actions, profile } }
  ← { shouldComment: boolean, priority: 'high'|'medium'|'low' }

POST /api/companion/commentary/generate
  → 生成点评内容 (shouldComment=true时调用)
  → { event, context }
  ← { text, expression, ttsUrl?, triggerEvent }

POST /api/companion/session/init
  → 初始化伴学会话
  → { caseId, userId }
  ← { sessionId, expertPersona, suggestedQuestions }
```

### 7.2 考试记录 API

```
POST /api/exam/records
  → 同步考试记录 (考试完成后触发)
  → { userId, examId, examName, stationId, scoreData, dialogueSummary, diagnosis, duration }
  ← { recordId, profileUpdated }
```

### 7.3 画像 API

```
GET /api/profile/:userId
  → 获取用户画像
  ← { profile: {...} }

GET /api/profile/:userId/recommendations
  → 获取个性化推荐
  ← { cases: [...], focusAreas: [...] }

POST /api/profile/:userId/refresh
  → 手动触发画像重算
  ← { profile: {...} }
```

---

## 八、实施计划

| 阶段 | 内容 | 关键交付 | 工期 |
|------|------|---------|------|
| **P1 核心通路** | AICompanionDrawer重写 (QA+点评双Tab) + 扩展到详情/报告页 + 后端companion API | 三页面可用，AI驱动问答，考试数据入库 | 3-4天 |
| **P2 智能点评** | 专家点评事件驱动 + 频率控制 + TTS语音 | 训练中AI主动点评 | 2-3天 |
| **P3 画像系统** | 训练+考试数据聚合 + 画像计算 + Gap分析 + AdaptiveLearning接入 | 真实数据画像 | 2-3天 |
| **P4 体验增强** | 数字人动画 + 个性化推荐 + 考后AI复盘 | 完整体验 | 2-3天 |

### 关键里程碑

```
P1 完成:  AI伴学面板在详情/考站/报告三个页面可用
          智能问答接入LLM，替换静态预置回答
          考试完成时评分+对话数据同步到服务端

P2 完成:  专家点评根据训练操作事件自动触发
          TTS语音播报点评内容
          频率控制保证不干扰训练节奏

P3 完成:  学习画像用真实数据渲染
          训练-考试Gap分析上线
          "高分低能"预警

P4 完成:  数字人动画（说话/思考/表情）
          考后AI复盘：基于表现生成改进建议
```

---

## 九、风险与注意事项

| 风险 | 缓解 |
|------|------|
| 行为数据量过大 | 客户端预聚合 + 采样 + 服务端定时归档 |
| LLM延迟影响体验 | 问答用流式响应；点评用异步生成+缓存 |
| 画像冷启动 | 新用户使用规则兜底 + 群体平均数据 |
| 跨页面状态同步 | 全局 Pinia Store + Composable 单例 |

---

## 十、附录: 新旧对比

### 专家点评

| | 当前 | 目标 |
|------|------|------|
| 内容来源 | 静态HTML(专家文章) | AI实时生成 |
| 触发方式 | 手动切换Tab查看 | 事件自动触发+手动请教 |
| 呈现形式 | 文章卡片 | 数字人+气泡+语音 |
| 个性化 | 无 | 基于学员画像+操作历史 |

### 智能问答

| | 当前 | 目标 |
|------|------|------|
| 回答来源 | 8条预置hardcode | LLM实时生成 |
| 上下文 | 无 | 病例+考站+对话历史 |
| 建议问题 | 写死的8条 | AI根据当前场景动态生成 |
| 覆盖页面 | 仅考站 | 所有页面 |

### 学习画像

| | 当前 | 目标 |
|------|------|------|
| 数据来源 | 全硬编码 | 训练记录 + 考试记录 + 行为事件 |
| 训练/考试差异 | 无 | Gap Analysis 检测"高分低能" |
| 更新频率 | 永不 | 训练完成实时 + 考试评分后 + 每日离线 |
| 个性化推荐 | 写死的3条 | 基于薄弱点 + AI伴学提问热点的动态推荐 |
| 考试数据权重 | N/A | 2x 权重（裸考真实水平） |

### 考试端

| | 当前 | 目标 |
|------|------|------|
| 操作追踪 | 零 | 全量埋点 (ActionTracker) |
| 评分数据 | Pinia内存，关闭即丢失 | 考试完成后同步到服务端持久化 |
| 与画像关系 | 完全隔离 | 高权重数据源，驱动画像更新 |
| AI伴学 | N/A | 明确禁用（考试公平性约束） |
