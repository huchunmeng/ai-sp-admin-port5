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

**MDT 讨论室插话引导强化** — 专科意见阶段每位专家发言后代码本已 `awaitTurn` 暂停等待（Learner-paced，v3 起），但暂停引导不醒目，演示时易被「继续讨论」连续跳过，插话窗口错过（训练记录显示脚本②插话内容被误输入到主诊意见阶段、当作主诊意见提交，主持人反馈「未充分结合 MDT 意见」印证错位）。强化 `MDTDiscussion.vue`：暂停时显示醒目插话引导条 `turn-guide`（蓝色渐变横幅，标题「可向当前专家提问（AI 实时回应）」+ 描述「XX 发言完毕，在下方输入框提问或点继续讨论跳过、播放下一位」+ 继续按钮），输入框 placeholder 在暂停时同步提示「可向「XX」专家提问」；暂停仍须点「继续讨论」或插话后推进。训练端构建通过。

**MDT 开场介绍去重 + 病例汇报内容规整** — ①开场引入 `buildMdtIntro` 去掉患者姓名/性别/年龄/主诉（患者信息由随后的病例汇报统一介绍），消除与 `buildCaseReport` 首句的重复，并修复 join 造成的双句号；②`buildCaseReport` 初步诊断考虑防双句号（trigger.reason 去尾句号）；③修正 MDT-20260806-ICNH（陈志超）病例 JSON：查体由 HIS 键值拼贴精炼为关键体征摘要、影像描述从【实验室检查】错位移至【影像学】、实验室检查改为检验表述、住院经过介入术语统一为 TACE（原「经导管肝动脉灌注化疗」与现病史矛盾）、trigger.reason 去尾句号。训练端构建通过。

### 待推进

1. **金牌导师病例扩容** — 刘必成(肾内)/杨毅(重症)/陆玲(耳鼻喉)暂无对应病例，待补充 HIS 病例后按每位 5 例填充
2. **质控中心病例** — 当前 2 个样例为假数据，待接入真实质控病例
3. **SP 完整内容** — 现有 15 例仅基础卡片，完整 SP 训练内容走 `scripts/gen-case-content.mjs` LLM 管线生成

---

## 2026-08-12 — MDT 角色改造：学员主诊医师先汇报病例

### 已完成

**训练端 (apps/training)** — MDT 讨论室角色真实化，对齐真实 MDT 场景（病例汇报由主管医师完成，专家在其后发言）：

- **学员（主诊医师）先汇报病例** — 替代 AI 主持人自动播报完整病例。`MDTDiscussion.vue`：
  - 开场 host 引入后播引导语「下面请主诊医师汇报病例要点并组织本次讨论。」（复用 `roleScripts.attending.opening`，42 例数据一致）
  - 推送「病例资料卡」`case-brief`（新消息类型，完整病例文本供参考）+ 保留原始病历入口
  - 学员在输入框直接提交汇报（`attendReport01` 任务，无任务卡弹窗，`INPUT_TASK_KEYS` 统一判断与 attendingView01 一致）
  - 提交后跳过 agenda phase0（主持人「请先由主诊医师进行病例汇报」）由学员汇报替代，host 确认后进入专科意见
- **专家发言结合学员汇报** — `mdt/expertPorts.js` `buildExpertSystemPrompt` 注入「主诊医师的病例汇报」段（`ctx.studentReport`；recent 仅过滤 expert 消息，需单独注入）；`useMDTDirector.js` 画像评估纳入汇报质量
- **会话兼容** — `MDT_FLOW_VERSION` 3→4 触发旧存档自动重播；`studentReport` 随 saveState/restoreSession 持久化，重开/升级清空
- **结束训练中途退出选择** — 讨论未结束（phase≠ended）时点「结束训练」弹自定义弹窗：主按钮「保留进度并退出」（进度已随 saveState 自动保存、下次恢复）/ 红色按钮「不保存并离开」（`store.saveSessionStage('mdt', null)` 清除进度、跳过中断归档、下次全新开始）/ 右上角 X 或点空白关闭 = 继续训练；已结束直接退出
- **演示脚本更新**（客户目录）— 新增「② 病例汇报阶段」+ 可直接复制的汇报文本（陈志超）
- **主持人/专家措辞真实化** — ①42 个病例 `roleScripts.attending.opening` 与代码兜底语「您作为主诊医师，请先汇报病例要点并组织本次讨论。」统一改为正式引入式「下面请主诊医师汇报病例要点并组织本次讨论。」；②「你作为主诊医师…」「发表你作为主诊医师的综合看法」等第二人称渲染语全部去掉「作为」措辞，主持人对学员发言一律点名角色/学科；③专家提示词去「代表XX科发言」表述，改为「以第一人称"我"直接从专业视角发言」，并在专科发言/评判指令中明确禁止「作为XX科」句式开头（真人 MDT 中专家直接表述观点，不会说「作为影像科…」）；④host 插话 prompt 补充点名式调度指导（如「请介入科谈谈」「影像科，你们的意见呢？」）；⑤演示脚本同步改「点名」表述；⑥专科意见阶段与评判环节主持人逐一点名各专科（`CALL_DISCIPLINES` 四句式轮换：「请XX科发表意见。」「XX科有什么看法？」「下面有请XX科。」「XX科，请谈谈你们的看法。」），拍板决策语改直接点名「主诊医师」
- 训练端构建通过

### 待推进

1. **41 例 MDT 病例数据清理**（查体键值拼接/影像学错位/术语冲突等）——已推迟另排任务
