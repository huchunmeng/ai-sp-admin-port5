# Port5 工作日志

> ai-sp-admin-port5 独立项目，端口5xxx系列，用于临床思维全流程2.0版升级开发。

## 2026-07-19 — 三个新功能页面集成（第一轮）

### 已完成

**训练端 (apps/training)** — 学员侧三个新页面：

| 页面 | 文件 | 状态 |
|------|------|------|
| AI伴学 | `views/AICompanion.vue` | 静态页面完成，mock数据 |
| MDT多学科讨论 | `views/MDTDiscussion.vue` | 静态页面完成，5阶段流程mock |
| 学习画像 | `views/AdaptiveLearning.vue` | 静态页面完成，mock数据 |

入口对接：
- `CaseDetail.vue` — 新增"AI伴学"和"MDT多学科讨论"按钮（MDT按钮仅2.0版+R字头病例显示）
- `TrainingLayout.vue` — header新增"学习画像"徽章按钮
- 面包屑支持三种新路由

**管理端 (apps/admin)** — 教师侧：

| 页面 | 文件 | 状态 |
|------|------|------|
| AI伴学病例库 | `views/new-features/CaseLevelList.vue` | 重写完成，按PlatformCaseList模式 |
| AI伴学详情 | `views/new-features/AICompanionDetail.vue` | 保留，教师预览用 |

菜单集成：CaseLevelList 放入"病例管理"模块，移除了旧的"新功能（演示）"模块。

**构建验证**：训练端和管理端 build 均通过，零错误。

### 待推进

1. **后端API** — 三个页面目前全是静态mock数据，需要对接真实API：
   - AI伴学：病例问答接口、专家点评生成
   - MDT讨论：多智能体对话编排、各阶段学生任务提交/评判
   - 学习画像：学生训练数据聚合、能力雷达计算、推荐算法

2. **数据流** — 确定API端点设计，与现有 sp-api (5100) 的关系

3. **训练端路由守卫** — AI伴学/MDT讨论从CaseDetail进入时携带caseId，需要校验病例存在且2.0版

4. **管理端CaseLevelList** — 目前按PlatformCaseList模式展示mock数据，需要：
   - 后端病例分级标签CRUD
   - AI伴学开关控制
   - 真实数据接入

5. **自适应学习画像** — 数据来源设计：
   - 学生的训练记录聚合
   - 各维度得分计算逻辑
   - 薄弱项/推荐算法

### 架构备注

- 训练端无侧栏，扁平路由，面包屑导航
- 管理端有侧栏+标签页系统
- 共享层 `packages/shared/` 提供评审/需求/Toast/Confirm引擎
- 端口：训练5001 / 管理5002 / 考试5003 / App训练5004 / 运营5005 / sp-api 5100
