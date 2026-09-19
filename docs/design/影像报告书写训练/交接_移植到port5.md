# 交接 · 把「影像报告书写训练」移植进 port5

> 写于 2026-09-19。原型与交付物已封版（git `c8251eb`），下一条线是**把它落进 port5 真实代码**。
> 本文只记「明天怎么开工」，不复述 PRD——行情细节一律回查 `04_交付物/PRD_影像报告书写训练.md`。
>
> ✅ **本文所列工作已于 2026-09-19 完成**，执行结果与实测证据见
> `05_实现落地/落地记录_port5.md`（含开工前拍的 6 个板、"四项待查证"的实证结论、
> 实际落地文件清单，以及**本文两处失准之处**：§三 3.1 的评分表管理页路径、
> §五 1 对 PRD §6.1 路由数量的描述）。下文保留为开工前的原始判断，**不要再照着做**。

---

## 一、这一轮做什么、不做什么

| | 范围 | 落点 |
|---|---|---|
| ✅ **本期做** | **题库管理**：题库列表 + 病例编辑器 | `apps/admin/` |
| ✅ **本期做** | **训练**：模块首页（双入口）· 训练病例列表 · 训练工作台 T0–T4 · 对照自评页 | `apps/training/` |
| ❌ **本期不做** | **考核管理**：任务管理 · 组卷与发布 · 成绩汇总 | 原型里的 P11–P13，代码里**一行都不落** |

**边界一句话**：只做「管理端维护题库 → 训练端挑病例练」，**不做**「管理端组卷发布 → 考核端作答评分」。后者依赖 `apps/admin` 与考试端的排期，本期不碰。

---

## 二、最重要的原则：对齐 port5，不硬塞

老胡原话：**「根据 port5 的系统情况做优化调整，尤其是文案和样式要对齐 port5 原有的，而不是硬塞进去」**。

具体落法——原型是**独立单壳**（自带 `css/admin.css` + `--adm-*` 令牌 + `.adm-*` 类名），**这些一律不带进 port5**。进 port5 后改用该端既有的令牌与全局类：

| 维度 | 原型里的做法（**不要带过来**） | port5 里改用（**对照源码**） |
|---|---|---|
| 管理端主色 | `--adm-primary #1890FF`（原型自建） | `apps/admin/src/styles/variables.css` 的 `--primary #1890FF` |
| 训练端主色 | `--primary #2563eb` | `apps/training/src/styles/variables.css` 的 `--primary #2563eb` |
| 卡片 | `.adm-*` 自建卡 | `.card`（`apps/admin/src/styles/global.css`） |
| 表格 | 原型 `<table class="adm-table">` | `.card style="padding:0" > .table-wrapper > table.table`，含 `.sticky-left` / `.sticky-right` |
| 筛选条 | 原型自建 | `.filter-row > .filter-item` + `.input` / `.select` / `SearchSelect.vue` |
| 状态标签 | 原型自绘 badge | `.badge-success / .badge-warning / .badge-error / .badge-info`、`.tag-*` |
| 空态 | 原型自绘 | `.empty-state`，文案用 port5 口径 **`暂无数据` / `暂无匹配的 XXX`** |
| 分页 | 原型自绘 | `.pagination`，文案 `共 N 条记录` / `上一页` / `下一页` / `10条/页` |
| 按钮 | 原型自绘 | `.btn / .btn-primary / .btn-sm / .btn-danger / .btn-outline / .btn-icon` |

**判断标准**：写页面前先翻一遍 `global.css`（管理端 3757 行、训练端 3753 行，通用类很全），**能复用就不新写**。参照物是 `apps/admin/src/views/case-list/PlatformCaseList.vue`——它是「只用全局类、不写 `<style scoped>`」的正例。反例是 `views/new-features/CaseLevelList.vue:247-278`，scoped 里重复定义 `.filter-row/.table/.sticky-*`，属旧冗余，别照抄。

**文案对齐**（管理端已核对的既有措辞，直接沿用）：

- 按钮：`搜索` / `重置` / `刷新列表` / `+ 新建病例` / `导出列表` / `批量启用`·`批量禁用`·`批量删除`
- 行内操作：`查看` / `编辑` / `复制` / `删除`
- 状态：`已发布` / `草稿` / `已停用`；`金标准已录` / `缺金标准`；难度 `基础病例` / `高阶病例` / `疑难病例`
- 删除确认：`确定删除病例「${title}」吗？此操作不可恢复。`
- toast：`病例已复制` / `病例已删除` / `列表已刷新` / `启用状态下无法删除`

> 原型里那套「界面用语 ↔ PRD 术语对照表」（P8 §四）**继续有效**：界面说「病例」，PRD 说「样本」——写代码时以**界面用语**为准。

---

## 三、已探明的 port5 现状（开工前必读，带路径）

### 3.1 管理端 `apps/admin/`

**菜单体系** `src/layouts/AdminLayout.vue:168-195`——两层：顶级 `module` → `groups[]` → `pages[]`。

叶子字段是 **`id / label / route / icon`**（注意不是 `path`）。「临床思维管理」下现有四组：

- `病例管理`（170-178）：`platform-cases` 平台病例库 · `institution-cases` 机构病例库 · `expert-cases` 专家病例库 · `score-settings` 评分表管理 · `case-level-list` AI伴学病例库 · `raw-records` 原始病历素材库 · `mdt-cases` MDT病例管理
- `培训管理`（179-181）：`training-records` 训练记录
- `考核管理`（182-184）：`exam-records` 考核记录
- `系统管理`（185-189）：考站设置 / 全流程评分配置 / 系统设置

**本模块要落的位置**：`病例管理` 组末尾追加 `imaging-samples`（影像报告题库）。**不新增顶级模块、不新增分组**。

**路由联动**（`src/router/index.js` + `AdminLayout.vue:223-238`）：

```js
isTabActive(page) { return route.path === page.route }          // 223-225
watch(() => route.path, (path) => {                              // 232-238
  if (path === '/') { store.activeTabId = 'home' }
  else { store.activeTabId = path.split('/')[1] || path.substring(1) }
})
```

⚠️ **路由首段必须等于菜单项 `id`**，否则菜单不高亮。即：菜单项 `id: 'imaging-samples'` ⇄ 路由 `/imaging-samples`。

**新增一个菜单页要同时改三处**：① `src/router/index.js` 加 child（子 path **不带前导斜杠**，详情页用 `props: true` 传参，见 `:caseId?` 的既有写法）；② `AdminLayout.vue` 的 `MENU_CONFIG` 对应组的 `pages[]` 追加；③ 若要新图标，补 `ICON_PATHS`（`AdminLayout.vue:141-162`，现有 `cases/training/exam/platform/institution/expert/score/ai/file/users/trend/fileCheck/layout/flow/gear/clinical`）。

**列表页范式**（`views/case-list/PlatformCaseList.vue:2-93`）：

```
.content-container
  └ .card.mb-4 > .filter-row > .filter-item（label + input.select / SearchSelect）
  └ .flex.items-center.justify-between.mb-4      ← 操作按钮条
  └ .card[style="padding:0"] > .table-wrapper > table.table（th/td 可 sticky）
  └ 空行「暂无数据」（:78）
  └ .flex.items-center.justify-between.mt-4      ← 分页
```
筛选是**前端 `computed`**，无服务端分页。

**数据来源**：`apps/admin` **没有 `composables/`、没有 `services/`、没有 api 封装层**。mock 一律写在页面 `<script setup>` 内联。三种既有做法：
- `PlatformCaseList.loadCases`（152-170）：`Promise.allSettled` 并行打 `/data/cases/cases-index.json` 与 `/api/ai-generate/cases`，失败回退内联 `mockData()`（140-147）
- `CaseLevelList`（152-165）：纯内联数组
- `MDTCaseList`：走 API

**Store**（`src/stores/admin.js`）：setup 风格 Pinia，**只存 UI 态**（`tabs / activeTabId / currentInstitution` + `openTab/closeTab/setActiveTab`），不存业务数据。

**公共组件**：`src/components/` 下**只有 `SearchSelect.vue`**（props `modelValue/options/placeholder/disabled`，emit `update:modelValue` / `change`）。

### 3.2 训练端 `apps/training/`

**路由** `src/router/index.js`：单层 `TrainingLayout` + `children`（无二级嵌套），hash 模式。

**关键发现：`/report-writing/:mode?` 已经存在**（:34，`name: reportWriting`，`mode` 可选）→ `views/ReportWriting.vue`，且 `HomeView.goReportWriting()` 已以 `params: {mode:'train'}` 进入。`HomeView.vue:88-100` 已有 `entry-report` 入口卡，**位置正确**（夹在 `entry-sp` AI问诊 与 `entry-mdt` MDT 之间）。

即**脚手架已在**——现在要做的是把 `ReportWriting.vue` 这个单页骨架按 PRD §6.1 拆开（PRD `:1356` 原话：「现有 ReportWriting.vue 为单页骨架，实现时按上表拆分」）。

**布局** `layouts/TrainingLayout.vue`：**没有侧栏菜单**。结构 = `app-header`（左：系统名「医路慧影（WiseImag）影像智思体」；右：机构、用户菜单）+ `breadcrumb-bar`（`crumbs` computed 按 `route.name` 逐条 if/else 手写，`reportWriting` 分支在 176-183）+ `router-view` 渐隐过渡。`stationRoutes` 里的站内页隐藏 header/breadcrumb。

⚠️ **拆路由后必须同步改 `crumbs` 的 `reportWriting` 分支**，否则面包屑错。

**列表页模板**：`views/MDTCaseList.vue` 是最佳参照——`mdt-hero` 渐变横幅 + `filter-bar`（filter-btn / 搜索 / 计数）+ `case-grid`（`auto-fill minmax(340px)`）+ `.empty-state`。

**工作台模板**：`views/history-taking/HistoryTaking.vue` = `TrainingTopBar` + 主体区 + 底部 `input-bar` + 弹窗组件。`components/TrainingTopBar.vue` 最贴近 T0–T4 需要——props `steps[] / stepIndex / flowSteps / hideStepNumber`，圆点+连线步骤条（`done` 绿 `#67c23a`、`active` 蓝 `#409eff`）。更轻量的替代是 `components/WorkflowStepBar.vue`。

⚠️ `BottomActionBar`（`@ai-sp/shared` 的 `bottomBar`）**训练端页面级基本不用**——全仓只有 `TrainingLayout.vue` 通过 `bottomBar.render(createDefaultActions(...))` 渲染全局浮条；页面自己的底部条都是手写（如 `HistoryTaking` 的 `input-bar`、`ReportWriting` 的 `rw-report-foot`）。新页面照既有做法手写即可。

**数据**：`src/data/` 存在，含：
- `reportCases.js` → `REPORT_CASES`，3 条 `{id, title, modality, bodyPart, icon, goldStandard, hints[5]}`（`goldStandard` 为三段式长文本，`hints` 为 L 阶梯提示）。**这个文件是本模块已有的数据源，直接用。**
- 另有 `mentorCategories.js` / `moocModules.js`

`stores/training.js`（setup 风格）：`addTrainingRecord / getTrainingRecords`（localStorage `training_records`，按 `sessionEpoch` 合并）、`startStationFlow / advanceStation`、`saveActiveFlow / hasUnfinishedSession`（断点续训）、`showHiddenControls`。记录 key = `caseId_stationId_ts`。

`composables/` 23 个（`useCaseLoader` / `useTimer` / `useStationFlow` / `useUtils`）。注意 `useCaseLoader` 走 `/api/cases` + `/data/cases/*.json`，而 **`reportCases.js` 是前端内置、不走该 loader**。

**样式**：`styles/variables.css` → `--primary #2563eb` / `--success #10b981` / `--warning #f59e0b` / `--error #ef4444` / `--card-radius 12px` 等。页面 `<style scoped>` 典型写法：`max-width + margin:0 auto + padding:20~24px`，白卡 `border:1px solid #f0f2f5; border-radius:12~14px; box-shadow:0 1px 3px rgba(0,0,0,.04)`，标题用 `'SimHei'` 黑体（见 `HomeView.vue:760-763`），末段带 `@media`。

⚠️ **已有的颜色漂移，别扩散**：`ReportWriting.vue` 用了 `#4f46e5`（紫）、MDT 用 `#409EFF`，都与主 `--primary #2563eb` 不一致。新页面**统一用 `var(--primary)`**。

**文案**（训练端既有措辞）：`提交报告` / `重写` / `下一例`；`需要提示` / `本病例提示已全部给出`；`影像待接入` / `本期为界面骨架：影像本体待院方提供真实样本后接入`；`训练模式 · 边写边提示` / `考核模式 · 不提供提示，请独立完成`；`暂无匹配的 MDT 病例` / `还没有训练记录`；`加载中...` / `回到首页`。

### 3.3 共享层 `packages/shared/src/index.js`

**实际导出名**（⚠️ 与 CLAUDE.md 里写的「ReviewPanel / RequirementDrawer / AppToast」**不符**，以源码为准）：

`review` · `requirement` · `toast`（**不是 `AppToast`**）· `confirm(message, opts) → Promise` · `createDefaultActions(route, extra)` · `resolveAppUrls()` · `bottomBar` · `isStaticProduction` · `TRAINING_LEVELS` / `CASE_LEVEL_MAP` / `getDifficultyLabel` / `getCaseLevelLabel` 等 · `STATION_*` 常量。

**没有** `ReviewPanel` / `RequirementDrawer` 的具名导出——评审/需求是**单例对象**，DOM 面板由 `review._setupDrawer` 内部生成。

引用写法：`import { toast, confirm } from '@ai-sp/shared'`（`MDTDiscussion.vue:425`）；`import { review, requirement, bottomBar, createDefaultActions, resolveAppUrls } from '@ai-sp/shared'`（`TrainingLayout.vue:66`）。训练端别名 `@` → `apps/training/src`。

---

## 四、待查证（**明天第一步**，动手前先补上）

原型数据规格（`04_交付物/data-specs.md`）与 port5 现有实体**不是一回事**，移植前必须先对齐。以下三项**尚未核实**：

1. **现有病例数据模型**——`apps/admin` 的病例（`/data/cases/cases-index.json` 与 `CaseEditor` 的 `createEmptyFormData`）有哪些字段？是否已有「影像」「报告」「评分表」相关字段可以挂靠？`apps/training/src/data/reportCases.js` 的 `{id,title,modality,bodyPart,icon,goldStandard,hints}` 需不需要扩成原型 `data-specs.md` 里的完整形状（能力位 / 脱敏 / 版本 / 状态）？
2. **影像阅片能力**——仓库里**是否已有**可复用的影像展示组件（序列切换 / 三视图 / 层面浏览）？搜索关键词：`viewer` / `dicom` / `series` / `slice` / `image`。原型里是「斑马纹 + 十字线」占位；若 port5 也没有，训练端工作台的影像区就**沿用占位**并在界面上明写 `影像待接入`（训练端已有这个措辞习惯）。
3. **评分表管理**——菜单里有 `score-settings`（评分表管理），它的数据结构与本模块的 R1 表（100 分 / 5 维度 / 23 条目）**是不是同一套**？能不能复用而不是新建一套评价表？

---

## 五、待老胡拍板（明天开工前问一句）

1. **训练端路由拆不拆**——PRD §6.1 定的是四条独立路由（`report-writing` 首页 / `report-writing/train` 列表 / `report-writing/train/:caseId` 工作台 / 自评页），但 port5 实机现在是一条 `/report-writing/:mode?` 单页。
   - **方案 A（按 PRD 拆）**：四条路由 + 四个页面文件，面包屑同步改。层次清晰，但改动面大。
   - **方案 B（沿用单页 + 内部切换）**：保持 `/report-writing/:mode`，页面内用步骤切换。
   - 建议 **A**——PRD 已明写「实现时按上表拆分」，且工作台这种重页面塞进单页会很难维护。
2. **管理端编辑器是否复用 `CaseEditor`**——`views/case-editor/CaseEditor.vue` 有 10 个子组件（BasicInfo / Reception / Analysis / Humanity / ScoreSheet / MetaInfo / MaterialsEditor / MentalExamEditor / ExpertKBEditor / MedicalRecordKB），但那是**虚拟病人病例**的结构；本模块要的是「影像序列 + 脱敏 + 能力位声明 + 金标准报告」四区块，**形态不同**。建议**新建 `views/imaging-case-editor/`**，只复用其分区块外壳与 `shared.js` 的字典/工具，不复用子组件本身。
3. **题库 mock 用哪种写法**——`PlatformCaseList` 那套（`Promise.allSettled` + 失败回退内联 mock）还是 `CaseLevelList` 那套（纯内联数组）？本模块没有后端接口，建议**纯内联 mock 起步**，留出 `loadCases()` 这个函数名以便后续接 API。

---

## 六、分步实施建议

**先管理端、后训练端**——管理端是数据生产侧，先把「题库里有什么形状的病例」定下来，训练端照着消费。

| 步 | 内容 | 主要文件 |
|---|---|---|
| **S1** | 补齐「四、待查证」，产出 mock 数据形状（对齐 `04_交付物/data-specs.md`） | 只读 + 定 schema |
| **S2** | 管理端「影像报告题库」列表页 | 新建 `apps/admin/src/views/imaging-samples/ImagingSampleList.vue`；改 `router/index.js` + `AdminLayout.vue`（MENU_CONFIG + 可能补 ICON_PATHS） |
| **S3** | 管理端「病例编辑器」 | 新建 `apps/admin/src/views/imaging-case-editor/`（四区块 + sticky 页脚）；路由 `/imaging-samples/:id`（`props: true`） |
| **S4** | 训练端路由拆分 + 模块首页 | 改 `apps/training/src/router/index.js`；改 `TrainingLayout.vue` 的 `crumbs`；新建模块首页 view |
| **S5** | 训练端病例列表 | 照 `MDTCaseList.vue` 的 `hero + filter-bar + case-grid` 范式 |
| **S6** | 训练端工作台 T0–T4 | 照 `HistoryTaking.vue` 范式，步骤条用 `TrainingTopBar` |
| **S7** | 训练端对照自评页 | 自评表 + 对照双栏（`global.css` 已有 `.diff-U/.diff-R/.diff-F` 可直接用） |

每一步做完**当场起 dev server 手动过一遍**，不攒到最后一起验。

**参考原型**（位置感最快，但**只借信息结构，不借样式**）：
`docs/design/影像报告书写训练/03_原型交付/js/pages/p9-adm-samples.js`（列表）、`p10-adm-sample-editor.js`（编辑器）、`p1-home.js` / `p2-train-list.js` / `p3-train-workbench.js` / `p4-self-review.js`（训练端四页）。

---

## 七、验收

- `apps/admin` 菜单「临床思维管理 › 病例管理」末尾出现「影像报告题库」，点进去路由 `/imaging-samples`，**菜单项高亮正常**（验证 `path.split('/')[1]` 与 `id` 一致）
- 列表页的筛选/表格/分页/空态/按钮**全部走 `global.css` 既有类**，页面无自建令牌、无 `<style scoped>` 里重复定义 `.table/.filter-row`
- 训练端首页入口卡位置不变（AI问诊 → **影像报告书写训练** → MDT），点进去能走到列表 → 工作台 → 自评
- **考核管理相关代码零新增**（`apps/admin` 不出现 `imaging-exams` 路由/菜单）
- 两端 `npm run dev`（管理端 5002 / 训练端 5001）无控制台报错

---

## 附：本次探索未做的事

- `apps/admin` 的 `CaseEditor` 十个子组件**未逐个读**（只看了目录与命名）
- 现有病例 JSON 的真实内容**未读**（`/data/cases/cases-index.json`）
- 影像组件是否存在**只做了关键字假设，未实证**
- 评分表管理页的数据结构**未读**

这四项正是「四、待查证」，明天第一件事就是补它们。
