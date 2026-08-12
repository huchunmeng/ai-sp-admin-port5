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

---

## 2026-07-24 — 精品病例板块 + 源标签体系

### 已完成

**精品病例入口 (训练端首页)**：
- 首页新增"精品病例"板块 (zone-elite)，三个入口卡片：
  - 院士精讲病例 / 金牌导师病例 / 国家级质控中心病例
- 带渐变色图标、病例数量徽章、点击跳转病例列表（携带filter参数）

**病例来源标签体系**：
- 所有病例卡片统一展示来源标签：`ELITE_SOURCES = ['院士精讲', '金牌导师', '国家级质控中心']`
- 后端返回 `source: '平台'` 的病例按索引轮转分配来源 (`idx % 3`)
- 标签样式：左上角角标 (`position: absolute; top:0; left:0`)，渐变色背景 + 显示完整文案（"院士精讲病例"）
- 覆盖页面：训练端 CaseList / CaseDetail / MDTCaseList / HomeView / ScoreReport，App训练端 CaseList / CaseDetail

**难度标签优化**：
- `packages/shared/src/index.js` — TRAINING_LEVELS label 从长文案改为短码（R1-住培一年级 → R1）
- 各页面 case-level 标签添加 `white-space: nowrap` 防止折行

**文案统一**：
- 全仓"案例" → "病例"统一替换

**构建验证**：训练端 + App训练端 build 均通过。

---

## 2026-07-28 — 专家点评PRD + AI伴学整合方案

### 已完成

**专家点评模块PRD (`doc/专家点评模块PRD.md`)**：
- 10章完整PRD：产品概述 / 用户故事(9条) / 功能需求(ExpertPanel + 6类触发事件 + 4项设置) / 交互设计 / 技术方案 / AI提示词设计 / 验收标准(10+3) / 4阶段实施计划 / 风险分析

**AI伴学 + 专家点评整合方案 (`doc/AI伴学与专家点评整合方案.md`)**：
- 确立"AI伴学+专家点评是一个功能的两个模块"的定位
- AI伴学显示范围：仅病例详情 / 考站训练 / 成绩报告（三个有实际AI需求的页面）
- 行为数据策略：不埋点，直接从现有业务数据流聚合（训练记录 + 考试记录 + 伴学API日志）
- 考试端纳入画像体系：AI伴学在考试端禁用（公平性），但考试评分数据高权重(2x)汇入画像
- 训练-考试Gap分析：检测"高分低能"（训练分高考试分低 = 过度依赖AI辅助）
- 4阶段实施：P1核心通路 → P2智能点评 → P3画像系统 → P4体验增强

### 待推进

1. **P1 核心通路** — AICompanionDrawer重写（QA+点评双Tab）+ 扩展到详情/报告页 + 后端companion API
2. **考试数据持久化** — 考试完成时评分+对话同步到服务端（当前仅在Pinia内存中）
3. **画像数据需求** — 存什么、怎么用，后续按实际需求确定

---

## 2026-07-29 — 交付准备 + 底部按钮精简 + 管理端URL更新

### 已完成

**交付包整理 (`docs/交付包_20260729/`)**：
- `PRD_AI伴学与专家点评.md` — 整合版PRD，覆盖登录/AI伴学/专家点评/精品病例/VR/UI调整
- `DELIVERY_20260729.md` — 交付说明，含完整文件清单、关键函数索引、LLM调用路径
- `TEST_20260729.md` — 60条测试用例 (T1-T60)

**管理端URL统一更新**：
- 5个 `.env.production` + `packages/shared/src/index.js` 中 PROD_URLS
- `VITE_ADMIN_URL` 从 `aisp-78y8v019a.maozi.io` → `p5admin-q5h4z019a.maozi.io`

**底部按钮栏精简** (5个Layout)：
- 移除 考试端/运营平台/电子书包 按钮，仅保留 管理端 ↔ 训练端 双端互跳

**训练端退出登录**：
- `TrainingLayout.vue` 新增用户下拉菜单 (学习画像 + 退出登录)
- 点击外部自动关闭下拉

**文档重组**：
- 合并 `doc/` 到 `docs/`，统一 `PREFIX_中文名[_日期].ext` 命名规范
- 新增 `REF_文档命名规范.md` 和 `REF_交付规范.md`

---

## 2026-07-30 — 待办：AI伴学 + 专家点评提示词调试

### 调试目标

1. **AI伴学 QA 提示词** — `AICompanionDrawer.vue` 中 `buildSystemPrompt()`:
   - 当前：组装考站标签 + 病例基本信息 + 最近对话上下文
   - 需验证：回答是否与病例相关、是否在角色范围内、上下文窗口是否合理
   - 提示词位置：`apps/training/src/components/AICompanionDrawer.vue` (~L200-240)

2. **专家点评生成提示词** — `AICompanionDrawer.vue` 中 `generateExpertReview()`:
   - 当前："top clinical expert writing teaching review" + 专家知识库 + 病例信息
   - 需验证：点评质量、是否基于KB而非编造、格式是否适合教学
   - 提示词位置：`apps/training/src/components/AICompanionDrawer.vue` (~L280-320)

3. **LLM调用链路**：
   - `useAIChat.sendMessage()` → `POST /api/llm` → vite.config.js middleware (dev) / prod-server route (prod)
   - 参数：`{ messages, system, temperature: 0.7, max_tokens: 2000 }`
   - 30s超时，中文降级回复

### 待调试项

- [ ] QA提示词：病例信息注入是否充分
- [ ] QA提示词：角色边界约束是否有效
- [ ] 专家点评：KB内容是否被正确引用
- [ ] 专家点评：点评深度和教学价值
- [ ] 专家追问：历史点评作为上下文的连贯性
- [ ] 超时/错误降级是否友好
- [ ] suggestedQuestions 是否随考站类型合理变化
## 2026-08-12 — 名医名课研习内页 + 导师素材规范化

### 已完成

**训练端 (apps/training)** — 首页「名医名课研习」三分类新增内页：

| 内容 | 文件 | 说明 |
|------|------|------|
| 导师/病例数据 | `src/data/mentorCategories.js` | 静态数据：院士精讲(滕皋军,5例)/金牌导师(5位,10例)/国家级质控中心(2占位) |
| 内页组件 | `src/views/MentorCaseView.vue` | Hero + 导师区 + SP 风格病例卡；卡片脱敏 +「建设中·即将开放」标记 |
| 路由 | `src/router/index.js` | `mentor/:category` 参数化路由 |
| 首页跳转/角标 | `src/views/HomeView.vue` | 三卡跳内页，角标从 MENTOR_CATEGORIES 计算 |
| 面包屑 | `src/layouts/TrainingLayout.vue` | mentorCases 分支：首页 → 分类标题 |

**导师素材全部规范化为 jpg**（`public/images/mentors/`）：滕皋军/李玲 webp 换新 jpg，杨毅 webp、刘必成/陆玲 png 用 sharp 转 jpg，删除全部 webp。新补三位金牌导师（刘必成/杨毅/陆玲）照片+简介，占位状态解除，导师区现完整展示 5 位。

**院士精讲新增央视科普板块** — 滕皋军 `media` 字段挂载 CCTV科教频道《健康之路》专题访谈《对付肝癌 有计可施》链接（`mentorCategories.js`）；`MentorCaseView.vue` 在导师卡下方渲染独立科普板块（栏目名+节目标题+描述+「前往观看」按钮），点击新窗口打开微信文章，仅滕皋军有该素材。

**病例卡角标去「脱敏」改分类名** — 内页病例卡右上角标签由「脱敏」改为分类名（院士精讲病例/金牌导师病例/国家级质控中心病例），分类渐变底色白字；national 平铺占位卡同步补齐该标签。

**质控中心样例展示** — `mentorCategories.js` `national.cases` 置入 2 个假样例（急性STEMI / 急性缺血性脑卒中），内页恢复 SP 病例卡展示，hero 与首页角标显示「2 例」。

**名医名课内页面包屑返回改外部站点** — `TrainingLayout.vue` 面包屑：`mentorCases`（院士精讲/金牌导师/质控中心三个内页）的「首页」与「名医名课研习」返回链接统一跳 `https://ydxt.njzdyy.com:20881/training-web/index`（与 MDT 路径一致，`useExternalHome` 条件扩展）。

**病例名脱敏规范化** — `mentorCategories.js` 17 个病例名从「患者一~十五/示例一·二」改为「姓**」形式（李/王/张/刘/陈 / 钱/冯/蒋/沈/韩 / 赵/孙/周/吴/郑 / 杨/朱），消除「示例」字样。

**国家级质控中心病例扩至 40 例 + 配头像** — `national.cases` 由 2 例扩至 40 例，覆盖质控重点病种（心梗/脑卒中/心衰/重症肺炎/肺栓塞/脓毒症/上消化道出血/主动脉夹层/产后大出血等），姓名「姓**」全部唯一；`MentorCaseView.vue` 病例卡照片区由占位图标改为真实患者头像（`matchPatientImage` 按性别+年龄匹配素材，55 例全覆盖）。

**质控中心病例按中心拆分** — national 40 例拆分为「国家综合介入技术质控中心 20 例（冠脉/脑血管/肿瘤/外周血管介入、出血栓塞等）/ 国家重症医学质控中心 20 例（心衰/呼衰/休克/DIC/产科重症/中毒等）」，病种与中心匹配；内页按中心分组展示（中心卡+名下病例，原「挂靠」文案移除）；national 描述文案改为医院表述「依据国家医疗质控指标，汇集急危重症与重点病种典型案例，推动诊疗规范化」，首页卡片文案同步更新。

**质控中心来源标签全端拆分** — 管理端病例编辑器「精品来源」下拉框由「国家级质控中心」拆为「国家综合介入技术质控中心 / 国家重症医学质控中心」两个选项；训练端/App训练端来源筛选与标签映射同步支持两个新值（`sourceClass` 三值兼容映射 national），CaseDetail 无来源病例轮转池 ELITE_SOURCES 扩为 4 项（`% ELITE_SOURCES.length`）；HomeView 质控中心角标改为从 centers 结构计算；旧值「国家级质控中心」保留用于兼容旧数据。训练端 + App训练端 + 管理端构建均通过。

**质控中心内页展示优化** — `MentorCaseView.vue` 质控中心区默认每中心展示一行 3 例（`slice(0,3)`），「查看全部 N 例 / 收起」按钮位于分中心介绍卡片右上，点击展开该中心全部病例（`expandedCenters` 状态）；「40 例」总数仅显示在 Hero 右上角（两个中心合计），各中心卡上不显示数量；两个中心名称字号 15px → 17px；病例卡尺寸与其他页面保持一致（108px 头像标准卡）。

### 待推进

1. **金牌导师病例扩容** — 刘必成(肾内)/杨毅(重症)/陆玲(耳鼻喉)暂无对应病例，待补充 HIS 病例后按每位 5 例填充
2. **质控中心病例** — 当前 2 个样例为假数据，待接入真实质控病例
3. **SP 完整内容** — 现有 15 例仅基础卡片，完整 SP 训练内容走 `scripts/gen-case-content.mjs` LLM 管线生成
