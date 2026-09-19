# 落地记录 · 影像报告书写训练移植进 port5

> 执行日期：2026-09-19（承接 `交接_移植到port5.md`）
> 仓库：`01_AI工作区/2.0版文档/ai-sp-admin-port5`（只改 port5，未同步 `ai-sp-admin`）
> 范围：管理端题库管理 + 训练端训练。**考核管理一行代码未落**。

---

## 一、开工前拍的 6 个板（老胡已确认）

| # | 决策项 | 结论 |
|---|---|---|
| 1 | 范围 | 只做「管理端题库管理 + 训练端训练」；考核管理（任务管理/组卷发布/成绩汇总，P11–P13）**零代码新增** |
| 2 | 训练端路由 | **按 PRD §6.1 拆独立路由**（不再沿用单页 `/report-writing/:mode?`） |
| 3 | T4 自评页 | **内嵌工作台，作为 T4 阶段**（遵现行 PRD §6.1 / §5.2.4，不单开路由） |
| 4 | 管理端入库 | **照 PRD §5.12.3 加 JSZip 真解包** + 前端本地状态（刷新丢，本期无后端） |
| 5 | 考核侧入口 | **保留可达的占位骨架**，保证首页与在线考试页的入口不 404 |
| 6 | 仓库同步 | **只做 port5**，暂不同步 `ai-sp-admin`（两仓已明显分叉） |

---

## 二、交接文档「四项待查证」的实证结论

| # | 待查证 | 结论 |
|---|---|---|
| 1 | 现有病例数据模型能否挂靠 | **不能**。admin 病例是 25 字段扁平索引 + 32 键编辑器表单（`case-editor/shared.js:61-94` 的 `createEmptyFormData`）；`imaging` 只是**自由文本框**（`shared.js:72`），`examination_materials[]` 里有 6 份 `subcategory:'imaging'` 附件。**没有影像序列 / 三段式金标准 / 能力位**，也没有 case_id 关联。→ 按 PRD §5.12.7 **新建独立实体** `imagingSample`，不挂靠旧病例。 |
| 2 | 是否已有可复用影像阅片组件 | **完全没有**。全仓零命中 `dicom / cornerstone / ohif / windowLevel / MPR / series / slice`（仅 `Array.slice`），无影像依赖，`public/images/` 全是患者照片与头像。`ReportWriting.vue` 的三视图是斑马纹占位。→ 本期沿用占位，界面明写「影像待接入」。附带发现：`training/views/ancillary-tests/AncillaryTests.vue` 的 `<img src="/data/cases/{id}-tests/{name}.png">` **恒 404**（该目录全仓不存在），一直靠文本兜底——属既有缺陷，非本模块引入。 |
| 3 | 评分表管理能否复用 | **不能直接用**。真实文件是 `apps/admin/src/views/ScoreSettings.vue`（602 行，**扁平 views 下，没有 `score-settings/` 子目录**）。模型为 `{id, category, item, score}` **单层扁平数组**，`category` 靠 `computeRowSpans()` 伪分组。**缺 R1 表必需的 4 项能力**：无判定档位（0/半/满分）、无「不可评/归一」概念、无维度满分、无条目编码（`GEN-01`）；编辑器 `createTemplate` 只弹 toast。→ R1 表在 shared 层自带，不改动既有评分表。 |
| 4 | 影像控件实证 | 同 #2。 |

**可复用的东西**：原型 `03_原型交付/js/seed.js` 的 R1 表本体、8 例样本、能力位表、`scoreableOf()` 形状完整，已按 `data-specs.md` 的字段口径搬进 `packages/shared/data/imaging/`。

---

## 三、落地的文件

### 新增

| 路径 | 作用 |
|---|---|
| `packages/shared/data/imaging/r1-table.js` | R1 表（5 维 23 条 100 分）+ 报告三段规则 + 覆盖要素 + 脱敏行定义 |
| `packages/shared/data/imaging/capabilities.js` | 甲/乙类不可评规则 + 5 位能力位 + `scoreableOf()` / `weightedScoreable()` + 发布下限 85 |
| `packages/shared/data/imaging/samples.js` | 题库 8 例（含三视图帧数、脱敏值、能力位、三段式金标准） |
| `packages/shared/data/imaging/hint-library.js` | 三级提示库（L1 体裁 / L2 指向 / L3 要点）+ 配额与冷却常量 |
| `packages/shared/data/imaging/index.js` | 出口与派生（`TRAINING_CASES` / `IMAGING_SAMPLE_ROWS` / `trainingCardOf` 等） |
| `apps/admin/src/views/imaging-samples/ImagingSampleList.vue` | 管理端「影像报告题库」列表页 |
| `apps/admin/src/views/imaging-samples/ImagingSampleEditor.vue` | 病例编辑器主壳（四区块 + sticky 页脚读出） |
| `apps/admin/src/views/imaging-samples/store.js` | 题库会话内数据源（列表↔编辑器同一份） |
| `apps/admin/src/views/imaging-samples/components/SeriesUploader.vue` | 区块① 影像序列入库（JSZip 前端解包 / 自然序 / 拖拽微调 / 内置样例兜底） |
| `apps/admin/src/views/imaging-samples/components/DeidentifyForm.vue` | 区块② 脱敏信息（格式硬校验，GEN-02 强制全掩无开关） |
| `apps/admin/src/views/imaging-samples/components/CapabilityPanel.vue` | 区块③ 能力位声明（`hasMeasurement` 只读）+ 落空清单 + 实时可评分 |
| `apps/admin/src/views/imaging-samples/components/GoldStandardForm.vue` | 区块④ 金标准报告（三段式，皆非空才可发布） |
| `apps/training/src/views/report-writing/ReportWritingHome.vue` | 模块首页（训练 / 考核双入口） |
| `apps/training/src/views/report-writing/ReportWritingTrainList.vue` | 训练病例列表（按部位分组 + 筛选 + 继续上次） |
| `apps/training/src/views/report-writing/ReportWritingWorkbench.vue` | 训练工作台 T0–T4 |
| `apps/training/src/views/report-writing/ReportWritingExam.vue` | 考核侧占位骨架（不接数据，只保证入口可达 + 口径可见） |
| `apps/training/src/views/report-writing/coverage.js` | 要素覆盖启发式判读（接服务端后换实现） |
| `apps/training/src/views/report-writing/components/*.vue` | StepBar / ImageViewer / InfoBar / SegmentForm / HintAside / SelfReviewPanel / ComparePanel |
| `apps/training/src/composables/useReportSession.js` | 阶段机 + 三段草稿 + 三级提示配额与冷却 + 回合 + 自评幂等 + 练习统计 |

### 修改

| 路径 | 改动 |
|---|---|
| `packages/shared/package.json` | 新增导出 `"./imaging"` |
| `apps/admin/vite.config.js` · `apps/training/vite.config.js` | 补 `@ai-sp/shared/imaging` 别名（既有 `@ai-sp/shared` 别名会吞掉子路径） |
| `apps/admin/package.json` | 新增依赖 `jszip ^3.10.2`（PRD §5.12.3 要求前端解包） |
| `apps/admin/src/router/index.js` | 新增 `imaging-samples` / `imaging-samples/:id`（`props: true`） |
| `apps/admin/src/layouts/AdminLayout.vue` | `MENU_CONFIG` 病例管理组末尾追加「影像报告题库」；`ICON_PATHS` 补 `imaging` 胶片图标 |
| `apps/training/src/router/index.js` | `report-writing/:mode?` 拆为 `report-writing` / `report-writing/train` / `report-writing/train/:caseId` / `report-writing/exam` |
| `apps/training/src/layouts/TrainingLayout.vue` | `crumbs` 的 `reportWriting` 分支拆为 4 个路由名分支（否则面包屑错） |
| `apps/training/src/views/HomeView.vue` | `goReportWriting()` 去掉 `params.mode` |
| `apps/training/src/views/ExamCenter.vue` | 「影像报告书写考核」改跳 `reportWritingExam` |
| `apps/training/src/data/reportCases.js` | 由「自带 3 例 mock」改为 shared 数据源的再导出（旧 `REPORT_CASES` 无调用方，已移除） |
| `apps/training/src/views/ReportWriting.vue` | **删除**（单页骨架被四个独立页面取代） |

---

## 四、实现时踩到 / 定下的几件事

1. **`@ai-sp/shared` 的别名会吞子路径。** 两端 vite 都把 `@ai-sp/shared` 指向 `packages/shared` 目录，于是 `@ai-sp/shared/imaging` 被解析成 `packages/shared/imaging`（不存在）。必须像 `score-tables` 那样**在通用别名之前**补一条精确别名。
2. **管理端编辑器的动作按钮放顶部固定头，不放右下角。** 全局评审批注浮条（`packages/shared/src/index.js:1345` 的 `.sp-floating-bar`，`z-index:9999`）常驻右下角，sticky 底部按钮条会被它挡住点不到（Playwright 实测 `intercepts pointer events`）。照 `RawRecordEditor.vue` 的既有做法把动作放 `.editor-header`，底部只留**实时可评分读出**。
3. **`scoreableMax` 一律现算，不写死。** 管理端列表、编辑器页脚、训练端卡片、对照页分母全部走 `scoreableOf()` / `trainingCardOf()`。
4. **`hasMeasurement` 只读无开关。** 它由影像控件能力决定（§9.4 本期 `measurement ❌`），做成可勾会让老师误以为"给样本声明测量能力就能解锁 FIND-04"——恰恰相反。
5. **`trainingCardOf` 的字段名要映射。** 契约侧 `practiceStats` 用 `completedRounds / lastSelfReviewScore / lastPracticedAt`，卡片展示用 `trainedRounds / lastSelfReview / lastAt`——**首版漏了映射，导致练完回列表仍显示"未练过"**，已修。
6. **自评幂等按 §5.2.4 实现**：同回合重复提交直接返回既有结果、不重复计数 `completedRounds`。

---

## 五、发现的两份「已封版交付物」里的偏差（未擅自改交付物，登记在此）

| # | 位置 | 偏差 | 处置 |
|---|---|---|---|
| 1 | `04_交付物/data-specs.md` §六「样本能力位分布」表 | `RC-005` 与 `RC-008` 的 `scoreableMax` 写作 **84**，但按同文件的 `CAPABILITIES` + `CAPABILITY_ITEMS` 口径现算应为 **88**（`RC-005`：`hasEnhancedPhase:true` 故 `FIND-06` 不落空；`RC-008`：`hasMeasurement:true` 故 `FIND-04` 不落空）。其余 6 例与算式一致。 | 代码按**现算结果**实现（88）。建议回写该表后两格。 |
| 2 | `04_交付物/PRD_影像报告书写训练.md` §6.1 学生侧页面清单 vs 原型 P4 | PRD §6.1 **没有**自评页路由（自评是工作台内的 T4 阶段，§5.2.4），但原型 P4 是独立页（flag `/:id/self-review`）；`交接_移植到port5.md` §五 又写"PRD §6.1 定的是四条独立路由（含自评页）"——该描述对应的是第五轮修订**之前**的 §6.1。 | 老胡拍板：**内嵌工作台作 T4**，遵现行 PRD。原型 P4 的信息结构已并入工作台 T4 区块。 |
| 3 | `交接_移植到port5.md` §三 3.1 | 称管理端评分表管理页在 `score-settings`（疑似目录） | 实为扁平文件 `views/ScoreSettings.vue`，路由 `/score-settings`。已在本文修正。 |

---

## 六、验收实测（Playwright，dev server 手动过）

**管理端 `apps/admin`（5002）**

- 菜单「临床思维管理 › 病例管理 › **影像报告题库**」出现，点进去 `#/imaging-samples` **菜单项高亮正常**（`path.split('/')[1]` 与 `id` 一致）
- 列表 8 行；可评分列 `88 / 84 / 84 / 84 / 96 / 84 / 84 / 84`（现算）；金标准列 3 已录 / 5 缺；状态列 3 已发布 / 5 草稿
- 筛选 6 组（部位 / 模态 / 难度 / 可评分区间 / 金标准 / 状态）；「缺金标准」筛出 5 行；重置回 8 行
- 点表头「可评分」→ 升序 `84×6, 88, 96`
- 「查看派生」弹窗列出落空条目（编号 / 名称 / 分值 / 来源甲类乙类 / 原因）
- 编辑器六区块齐全；**勾「既往检查影像」页脚实时 84 → 88、落空 4 条 → 3 条**；`hasMeasurement` 勾选框 `disabled=true`
- 清空「影像所见」金标准后点发布 → 被拦、不跳转
- JSZip 真解包：4 文件（3 jpg + 1 txt）的 zip → 解出 3 帧，**自然序 `1.jpg < 2.jpg < 10.jpg`**，txt 被过滤；内置样例兜底 16 帧
- 保存草稿成功；**console 零错误**

**训练端 `apps/training`（5001）**

- 首页「影像报告书写训练」卡 → `#/report-writing`，面包屑「首页 / 影像报告书写训练」；双入口 + 统计「3 可练病例 / 5 训练阶段 / 23 评分条目」
- 列表 `#/report-writing/train`，面包屑正确；3 张卡按部位分组（颅脑 / 胸部 / 腹部）；按模态筛 MR → 1 张
- 工作台 `#/report-writing/train/RC-002`：阶段条 T0→T4、一般信息 10 项、三视图 3 个 + 层面滑块 3 个、要素覆盖 5 项、T0 阅片笔记
- **点 T3 无法跳阶段**（停在 T0）；T0→T1 后**空段拦截**且文案给出原因；填写后放行
- 提示按钮初始 `L1 不限 / L2 剩 3 / L3 剩 1`；请求 L2 后 → `剩 2` 且按钮显示 `冷却 10s` 并置灰；**冷却中 L1 仍可点**
- T3 主按钮「提交报告，进入自评」→ 确认弹窗 → T4；自评表 **23 条**；**未提交时对照区为门禁态**（"提交自评后才能查看对照"）
- 提交后对照双栏「你的报告 / 参考报告（金标准）」渲染，能力边界说明 4 条
- 返回列表：练习统计「已练 1 次 · 最近自评 0」，已练过计数 1
- 考核占位 `#/report-writing/exam`，面包屑「首页 / 在线考试 / 影像报告书写考核」；从在线考试页点卡也落此页
- **console 零错误**

**构建**：`npm run build:all` 五端全绿。

---

## 七、本期已知边界（非缺陷）

| 项 | 说明 |
|---|---|
| 无服务端 | 管理端改动只在内存、训练端草稿与练习统计在 localStorage；刷新即回初始态。接 API 只换 `store.js` / `useReportSession.js` 的实现 |
| 影像本体 | 占位（斑马纹 + "影像待接入"）。三视图**支持层面浏览**（§9.4 基线），但无真实像素 |
| 内容规模 | 训练端**可练 3 例**（RC-001/002/003 的金标准取自仓库既有原文），其余 5 例为草稿态等教研录入——即 Q2 未答复的真相 |
| 提示与评分 | 提示为静态库、要素覆盖为前端启发式、对照页"系统参考分"是**估算值**（已标「估算」）；真实实现由服务端模型 + 出站红线校验（§5.7 / §9.5） |
| 考核侧 | 占位页，界面与交互未做（本期边界） |
| `disabled` 样本 | schema / 筛选 / 文案 / 启用停用动作都支持，但**演示数据里没有 disabled 行**——停用语义需要一例"曾发布且金标准已录"的真实样本才能演示，等院方样本 |
