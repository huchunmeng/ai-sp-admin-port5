# 数据规格说明（Data Specs）

> **交付物** · 影像报告书写训练（E2）· 版本：随 `04_交付物/PRD_影像报告书写训练.md` 同版
> **代码来源**：`prototype/js/seed.js`（种子数据，挂 `window.SEED`）+ `prototype/js/util.js` / `prototype/js/app.js`（原型壳状态）+ `prototype/js/pages/p1…p13*.js`（页面读取侧）
> **字段表列口径**：`字段 | 类型 | 必填 | 取值/枚举 | 说明 | 来源 §`
> **生成日期**：2026-09-19

---

## 一、本文件的作用与边界

本文件把原型里的**数据结构**翻译成契约级描述，供两类读者使用：实现期工程师（知道要落哪些表、哪些字段、哪些是派生不落库），以及评审（核对原型与 PRD 的字段口径是否一致）。

三条边界先讲清楚：

1. **种子数据不是契约。** `seed.js` 里的取值（如 8 个样本、18 个考核任务、具体分值）是**演示用**的，契约是**字段与枚举**本身。实现期数据由服务端产出。
2. **派生字段不落库。** 凡标注「派生」的字段（`scoreableMax`、`rawTotal`、`total`、`totalScore`、`deviation`、`caseCount`、`gateOk`）一律由计算得出，不得写成静态值——PRD §5.5.1 明确要求 `scoreableMax` **随样本入库声明现算**，原因见第十五节。
3. **原型已覆盖管理端**（第五轮补入）。§5.12–§5.14 的题库维护 / 组卷派发 / 成绩汇总由**现有管理端 `apps/admin` 承接**（不新建教师端），原型对应 P9–P13 五页，数据实体见第十二节。`SELECTION_DEMO` 是第四轮的过渡演示表，**已由 P12 的真实组卷草稿 `ADM_DRAFT` 取代**，保留仅为回溯。

---

## 二、实体总览

`seed.js` 导出 **28 个键**（24 个数据实体 + 4 个派生函数），映射关系如下。**「侧」列**：学生侧 = 训练端（P1–P7），管理端 = 承接侧（P9–P13）。

| 实体 | 侧 | 类型 | 粒度 | 是否服务端持久化 | PRD 依据 § |
|---|---|---|---|---|---|
| `R1_TABLE` | 共用 | 常量表 | 全局唯一 | 是（评分标准配置） | 附录 E |
| `CAPABILITIES` | 共用 | 映射表 | 每样本一行 | 是（随样本入库） | §5.2.2 · §5.10.2 |
| `CAPABILITY_ITEMS` | 共用 | 常量表 | 全局唯一（4 条） | 是（评分规则配置） | §5.2.2 · 附录 E |
| `DEIDENTIFY_ITEMS` | 共用 | 常量表 | 全局唯一（1 条） | 是（评分规则配置） | §5.2.2 · 附录 E |
| `CASES` | 学生侧 | 列表 | 每样本一行 | 是 | §5.3 |
| `CASE_BY_ID` | 学生侧 | 索引 | 由 `CASES` 派生 | 否（运行时索引） | — |
| `WORKBENCH` | 学生侧 | 单对象 | 每 attempt 一实例 | 是（草稿随 attempt） | §5.2.1 · §5.2.2 · §5.2.3 · §6.2 |
| `SEGMENTS` | 共用 | 常量表 | 全局唯一（3 段） | 是（字段规则配置） | §5.4.1 |
| `EXAM_TASKS` | 学生侧 | 列表 | 每任务一行 | 是 | §5.5 · §5.5.1 |
| `EXAM_WORKBENCH` | 学生侧 | 单对象 | 每 attempt 一实例 | 是 | §5.6 · §6.3 |
| `RESULT` | 学生侧 | 单对象 | 每次评分一实例 | 是 | §5.5.1 ③ · §6.4 |
| `SELF_REVIEW` | 学生侧 | 单对象 | 每回合一实例 | 是（学情信号，不参与计算） | §5.2.4 |
| `SELECTION_DEMO` | 管理端 | 列表 | 组卷侧演示（过渡物） | 否 | §5.5.1 |
| `ADM_SAMPLES` | 管理端 | 列表 | 每样本一行（**含 `version` / `status`**） | 是（= §5.12.7 `imagingSample`） | **§5.12.2 · §5.12.7** |
| `SAMPLE_VER_IMPACT` | 管理端 | 单对象 | 每次改版一实例 | 是（审计留痕） | **§5.12.8** |
| `ADM_TASKS` | 管理端 | 列表 | 每任务一行（**含 `caseRefs[]` / `overrideGate` / `progress`**） | 是 | **§5.13 · §5.14.1** |
| `ADM_TASK_BY_ID` | 管理端 | 索引 | 由 `ADM_TASKS` 派生 | 否（运行时索引） | — |
| `ADM_CLASSES` | 管理端 | 列表 | 每班级一行 | 是（`listClasses()` 预留接口） | **§5.13.4 · Q11** |
| `ADM_DRAFT` | 管理端 | 单对象 | 每份组卷草稿一实例 | **否（只存本机 localStorage）** | **§5.13.1** |
| `ADM_PRESETS` | 管理端 | 常量表 | 全局唯一（2 个） | 否（原型演示用） | §5.13.3 · §5.13.5 |
| `ADM_STUDENTS` | 管理端 | 列表 | 每学生一 attempt 实例 | 是（成绩汇总读模型） | **§5.14.3** |
| `ADM_TASK_STATS` | 管理端 | 映射表 | 每任务一行 | 是（聚合，可实时算） | **§5.14.2** |
| `ADM_ITEM_STATS` | 管理端 | 列表 | 每 R1 条目一行 | 是（聚合，可实时算） | **§5.14.5** |
| `scoreableOf` | 共用 | 函数 | — | — | §5.2.2 · §5.5.1 |
| `weightedScoreable` | 管理端 | 函数 | — | — | §5.9.2 · §5.13.3 |
| `draftRefs` | 管理端 | 函数 | — | — | §5.13.3 |
| `draftScoreable` | 管理端 | 函数 | — | — | §5.13.3 · §5.13.5 |
| `USER` | 原型壳 | 单对象 | 原型壳 | 是（真实用户态） | — |

---

## 三、`R1_TABLE` — 评分标准表

《放射科-诊断报告书写质量评价表》**100 分 / 5 维度 / 23 条目**。所有分数只在此处定义一次，结果页与自评页均由此归并。

| 字段 | 类型 | 必填 | 取值/枚举 | 说明 | 来源 § |
|---|---|---|---|---|---|
| `dim` | string | 是 | 见下表 5 值 | 维度名（含中文序号前缀） | 附录 E |
| `full` | number | 是 | 14 / 9 / 34 / 38 / 5 | 该维度满分 | 附录 E |
| `items` | array | 是 | — | 该维度下条目 | 附录 E |
| `items[].code` | string | 是 | `GEN-01`…`LANG-01` | 条目编号（全局唯一键） | 附录 E |
| `items[].name` | string | 是 | — | 条目名称（原文照抄评价表） | 附录 E |
| `items[].score` | number | 是 | 1 / 2 / 3 / 4 / 5 / 10 | 该条满分 | 附录 E |

**维度与分值分布**（合计 100，与 PRD 附录 E 逐条核对一致）：

| 维度 | 满分 | 条目 |
|---|---|---|
| 一、一般信息及报告及时性 | 14 | `GEN-01`(2) `GEN-02`(1) `GEN-03`(1) `GEN-04`(10) |
| 二、检查技术 | 9 | `TECH-01`(3) `TECH-02`(3) `TECH-03`(3) |
| 三、影像描述 | 34 | `FIND-01`(10) `FIND-02`(4) `FIND-03`(4) `FIND-04`(4) `FIND-05`(4) `FIND-06`(4) `FIND-07`(4) |
| 四、影像诊断 | 38 | `IMP-01`(10) `IMP-02`(4) `IMP-03`(4) `IMP-04`(4) `IMP-05`(4) `IMP-06`(4) `IMP-07`(4) `IMP-08`(4) |
| 五、文字描述 | 5 | `LANG-01`(5) |

---

## 四、`CAPABILITIES` / `CAPABILITY_ITEMS` — 能力位与乙类不可评

### 4.1 `CAPABILITIES`（随样本入库声明）

键 = `caseId`，值 = 该样本具备的影像与临床能力位。

| 字段 | 类型 | 必填 | 取值/枚举 | 说明 | 来源 § |
|---|---|---|---|---|---|
| `hasMeasurement` | boolean | 是 | true / false | 病灶大小能否**准确测量**（依赖影像控件的测量工具） | §5.2.2 · §5.10.2 |
| `hasPriorExam` | boolean | 是 | true / false | 是否有**既往检查影像**（决定能否"与以前检查比较"） | §5.2.2 · §5.10.2 |
| `hasEnhancedPhase` | boolean | 是 | true / false | 是否有**增强期相序列**（决定能否判"强化程度"） | §5.2.2 · §5.10.2 |
| `isTumor` | boolean | 是 | true / false | 是否**肿瘤病例**（非肿瘤时 `IMP-05` = 不适用 N/A） | §5.2.2 · §5.10.2 |
| `hasStagingInfo` | boolean | 是 | true / false | 临床主要信息是否**给足分期依据**（仅肿瘤病例有意义） | ⚠️ **PRD 待回写**（见 4.3） |

### 4.2 `CAPABILITY_ITEMS`（乙类不可评规则，全局 4 条）

| 字段 | 类型 | 必填 | 取值/枚举 | 说明 | 来源 § |
|---|---|---|---|---|---|
| `code` | string | 是 | `FIND-04` / `IMP-08` / `FIND-06` / `IMP-05` | 被判定不可评的条目编号 | 附录 E |
| `score` | number | 是 | 4 | 该条满分（移出分母的量） | 附录 E |
| `label` | string | 是 | — | 条目简称 | 附录 E |
| `why` | string | 是 | — | 落空原因（写进结果页条目级点评） | 附录 E |
| `hit` | function | 是 | `(cap) => boolean` | 判定该条是否**转入兜底**（分值移出分母） | §5.2.2 |
| `nA` | function | 否 | `(cap) => boolean` | 判定该条是否**不适用（N/A）**；仅 `IMP-05` 有 | 附录 E 末注 |

**四条规则的实际判据**（对应 PRD 附录 E 的四条落空）：

| 条目 | 落空判据 | 落空原因 |
|---|---|---|
| `FIND-04` | `!hasMeasurement` | 影像控件不提供测量工具（归影像教学底座，口径 Q9） |
| `IMP-08` | `!hasPriorExam` | 样本为静态单次检查，无既往片子 |
| `FIND-06` | `!hasEnhancedPhase` | 样本无增强期相序列（口径 Q2） |
| `IMP-05` | `isTumor && !hasStagingInfo`（`hit`）；`!isTumor`（`nA`） | 肿瘤样本且临床主要信息未给足分期依据（口径 Q2） |

**两档语义必须区分**（附录 E「先救后兜」）：

- **先救**——可评的子项留在分母内（如 `FIND-04` 的"数目"可目测可评、`FIND-06` 的"密度/信号"可从预调窗读）。原型演示取**最坏情形**（四类全部走到兜底），故按条级 −4 计，与 §5.5.1 及 BDD 场景 30 的 84 分对齐。
- **兜底**——子项所需输入确实不具备时，该子项分值从可评分母中**剔除**，**不得按 0 分计**。

另注：非肿瘤样本的 `IMP-05` 为 **不适用（N/A）**，**数学同构但结果页不标注折算**（附录 E 末注）。

### 4.3 ✅ `hasStagingInfo` 已回写 PRD（第五轮闭合）

- **原状**：PRD §5.2.2 / §5.10.2 只声明 **4 位** `{hasMeasurement, hasPriorExam, hasEnhancedPhase, isTumor}`，原型多出第 5 位 `hasStagingInfo`，登记为待回写项（`差异对比清单_20260919.md` 序号 8 / A9）。
- **补第 5 位的理由**：附录 E 给 `IMP-05` 的处置③是「肿瘤样本**且临床信息不足** → 归一」——这个附加条件 `isTumor` 一位表达不了；且 BDD 场景 30 写的 `isTumor:true` 在 4 位口径下会把 `IMP-05` 判成可评（只剔 3 条 = 88 分），与**同场景给出的 84 分**自相矛盾。
- **处置（已执行）**：**PRD 采纳补第 5 位**，改动落在 PRD §5.2.2 能力位定义、§5.10.2 数据模型、§5.12.5 入库声明表、附录 E `IMP-05` 处置、附录 C V2。原型侧 `seed.js` 与 P8/P9/P10 页面同步。**原型与 PRD 现已 5 位口径一致**。

### 4.4 `hasMeasurement` 的归属澄清（易误读）

`hasMeasurement` **列在能力位里，但取值不由样本声明**——它由**影像控件是否具备测量工具**决定（PRD §9.4 本期 `measurement: ❌`，故恒为 `false`）。

| 位置 | 行为 |
|---|---|
| 入库侧（P10 第 ③ 区块） | **只读展示**，带 🔒 标记，**不给勾选开关**（`data-act` 都不挂） |
| 组卷侧（P12 第 2 步） | 同样只读，点它弹提示"测量能力位由影像控件能力决定（§9.4 本期 ❌），入库侧只读、不可勾选" |

> 若把这一位做成可勾开关，评审会误以为"给样本声明有测量能力"就能解锁 `FIND-04`——**恰恰相反**：控件没有测量工具，样本声明什么都不能让它可评。

---

## 五、`DEIDENTIFY_ITEMS` — 甲类不可评（去标识）

对所有样本一致，不随能力位变，可作**全局常量**。

| 字段 | 类型 | 必填 | 取值/枚举 | 说明 | 来源 § |
|---|---|---|---|---|---|
| `code` | string | 是 | `GEN-02` | 受去标识影响的条目 | §5.2.2 · 附录 E |
| `score` | number | 是 | 1 | 该条满分 | 附录 E |
| `assessableRatio` | number | 是 | 0 ~ 1（演示取 `0.5`） | **可评比例** | ⚠️ PRD 未给数值口径 |
| `label` | string | 是 | — | 全掩字段名 | 附录 E |
| `why` | string | 是 | — | 落空原因 | 附录 E |

**关键语义**：`GEN-02` 是**部分不可评**——检查号 / 影像号保留后 4 位仍可评，故**该条整体仍计入分母**，条内按可评部分判分。这正是 PRD §5.5.1「四条同时落空 = 84 分」算式**不含甲类**的原因。

> ⚠️ `assessableRatio` 取 `0.5` 是**演示占位**，PRD 未给数值口径。真实值由评分引擎按**实际可评字段比例**产出；此处仅用于让结果页出现一个"部分不可评"的可视样本，**勿当契约**。

---

## 六、`CASES` — 训练样本

| 字段 | 类型 | 必填 | 取值/枚举 | 说明 | 来源 § |
|---|---|---|---|---|---|
| `id` | string | 是 | `RC-001` … `RC-008` | 样本主键 | §5.3 |
| `title` | string | 是 | — | 卡片标题（模态 · 部位 · 病症） | §5.3 |
| `modality` | string | 是 | `CT` / `MR` / `DR` / `超声` | 检查模态 | §5.3 |
| `bodyPart` | string | 是 | `颅脑` / `头颈` / `胸部` / `腹部` / `骨肌` / `其他` | 检查部位（分组依据） | §5.3 |
| `level` | string | 是 | `U1` `U2` `R1` `R2` `R3` `F1` `F2` | 三阶段七级难度码 | 难度双标签体系 |
| `levelName` | string | 是 | `基础` / `进阶` / `疑难` | 双标签的可读名（与 `level` 并行显示） | 难度双标签体系 |
| `ico` | string | 是 | `film` / `target` / `grid` / `user` | 内联 SVG 图标名（缩略图） | 原型自定 |
| `clinical` | string | 是 | — | 临床简要（已脱敏） | §5.3 |
| `trainedRounds` | number | 是 | ≥ 0 | 已练回合数（`0` = 未练习） | §5.3 |
| `lastSelfReview` | number \| null | 是 | 0 ~ 100 \| null | 最近一次 T4 自评得分（未练过为 `null`） | §5.3 |
| `lastAt` | string \| null | 是 | `YYYY-MM-DD HH:mm` \| null | 最近一次练习时间 | §5.3 |

**样本能力位分布**（`CAPABILITIES` 与 `CASES` 按 `id` 一一对应，8 行齐全）：

| 样本 | 测量 | 既往片 | 增强 | 肿瘤 | 分期依据 | `scoreableMax` |
|---|---|---|---|---|---|---|
| `RC-001` 胸部CT · 右肺上叶结节 | ✗ | ✗ | ✗ | ✓ | ✗ | 84 |
| `RC-002` 颅脑MR · 急性脑梗死 | ✗ | ✗ | ✗ | ✗ | ✗ | 84 |
| `RC-003` 腹部CT · 肝细胞癌（TACE术后） | ✗ | ✓ | ✓ | ✓ | ✓ | 96 |
| `RC-004` 胸部CT · 纵隔淋巴结肿大 | ✓ | ✗ | ✗ | ✓ | ✗ | 88 |
| `RC-005` 腹部MR · 肝血管瘤 | ✗ | ✗ | ✓ | ✗ | ✗ | 84 |
| `RC-006` 颅脑CT · 高血压性脑出血 | ✗ | ✗ | ✗ | ✗ | ✗ | 84 |
| `RC-007` 头颈CT · 鼻咽癌 | ✗ | ✗ | ✗ | ✓ | ✗ | 84 |
| `RC-008` 骨肌DR · 胫骨平台骨折 | ✓ | ✗ | ✗ | ✗ | ✗ | 84 |

---

## 七、`WORKBENCH` / `SEGMENTS` — 训练工作台与报告字段规则

### 7.1 `SEGMENTS`（报告三段字段规则，全局唯一）

| 字段 | 类型 | 必填 | 取值/枚举 | 说明 | 来源 § |
|---|---|---|---|---|---|
| `key` | string | 是 | `technique` / `findings` / `impression` | 段落键 | §5.4.1 |
| `name` | string | 是 | 检查技术 / 影像所见 / 诊断意见 | 段落中文名 | §5.4.1 |
| `limit` | number | 是 | `500` / `3000` / `3000` | 字数上限 | §5.4.1 |
| `trainingRequired` | boolean | 是 | true | 训练侧是否必填 | §5.4.1 |
| `examRequired` | boolean | 是 | false | 考核侧是否必填（三段均可空，空段按 0 分计） | §5.4.1 |

### 7.2 `WORKBENCH`（训练工作台当前状态）

| 字段 | 类型 | 必填 | 取值/枚举 | 说明 | 来源 § |
|---|---|---|---|---|---|
| `caseId` | string | 是 | `RC-00x` | 当前样本 | §5.2.1 |
| `roundIndex` | number | 是 | ≥ 1 | 当前回合序号（同一样本可反复重写，回合递增） | §5.2.1 |
| `stage` | string | 是 | `T0`…`T4` | 当前阶段 | §5.2.2 |
| `stageHint` | string | 是 | — | 阶段提示文案 | §6.2 |
| `draft` | object | 是 | `{technique, findings, impression}` | 报告三段草稿（键同 `SEGMENTS[].key`） | §5.4.1 |
| `viewNotes` | string | 是 | — | **T0 阅片笔记**。不进入报告、不参与评分，T4 可回看（随回合存 `round{n}.viewNotes`） | §5.2.2 |
| `info` | array | 是 | — | 一般信息条（脱敏形态即评分基准） | §5.2.2 · §5.4.2 |
| `info[].k` | string | 是 | — | 字段名 | §5.2.2 |
| `info[].v` | string | 是 | — | 脱敏后的值（`张*` / `50–59 岁` / `****1234`） | §5.2.2 |
| `info[].copy` | boolean | 否 | true | 是否提供「复制到报告」 | §5.4.2 |
| `info[].masked` | boolean | 否 | true | **全掩字段**：不可复制、本期不纳入评分 | §5.4.2 |
| `info[].note` | string | 否 | — | 脱敏说明（如"保留后 4 位"） | §5.2.2 |
| `clinicalText` | string | 是 | — | 临床主要信息全文（`GEN-04` 的评分依据，10 分） | §5.2.2 |
| `coverage` | array | 是 | — | 要素覆盖清单（**仅训练侧下发**，考核期不下发，§5.8） | §6.2 |
| `coverage[].mark` | string | 是 | `ok` / `doubt` / `miss` | ●已覆盖 / ?存疑 / ○缺失 | §6.2 |
| `coverage[].name` | string | 是 | — | 要素名 | §6.2 |
| `coverage[].text` | string | 是 | — | 该要素的系统判读 | §6.2 |
| `hints` | array | 是 | — | 本回合已发出的提示（三级阶梯流水） | §5.2.3 |
| `hints[].level` | string | 是 | `L1` / `L2` / `L3` | 提示层级 | §5.2.3 |
| `hints[].segment` | string | 是 | 同 `SEGMENTS[].key` | 提示针对的段落 | §5.2.3 |
| `hints[].stage` | string | 是 | `T1` / `T2` / `T3` | 请求时所在阶段 | §5.2.3 |
| `hints[].time` | string | 是 | `HH:mm:ss` | 请求时刻 | §5.2.3 |
| `hints[].title` | string | 是 | — | 提示标题 | §5.2.3 |
| `hints[].body` | string | 是 | — | 提示正文（L3 只给要点词，不给金标准原句） | §5.2.3 |
| `quota` | object | 是 | `{l2Remaining, l3Remaining}` | **当前剩余配额** | §5.2.3 |
| `resetQuota` | object | 是 | `{l2: 3, l3: 1}` | 回合重置后的配额（演示用） | §5.2.3 |
| `exhaustedQuota` | object | 是 | `{l2: 0, l3: 0}` | 用尽态的配额（演示用） | §5.2.3 |

**配额口径**：L1 不限次；L2 = 3 / 回合；L3 = 1 / 回合。配额按「**段 × 回合**」发放，**用完不补**。原型初始态演示「已用 3 次（L1×2 + L2×1）」，故剩余 L2 = 2、L3 = 1。

---

## 八、`EXAM_TASKS` — 我的考核任务

PRD §5.5 状态全集 **8 态**，其中 `已交卷` 是**独立态**（不等于 `评分中`）。

| 字段 | 类型 | 必填 | 取值/枚举 | 说明 | 来源 § |
|---|---|---|---|---|---|
| `id` | string | 是 | `ET-YYYY-NNNN` | 任务主键 | §5.5 |
| `title` | string | 是 | — | 任务名 | §5.5 |
| `state` | string | 是 | 见第十四节 8 态枚举 | 任务状态 | §5.5 |
| `desc` | string | 是 | — | 任务描述 | §5.5 |
| `caseCount` | number | 是 | ≥ 1 | 整卷例数 | §5.5.1 ① |
| `durationMinutes` | number | 是 | ≥ 1 | 限时（分钟） | §5.5.1 ① |
| `durationMode` | string | 是 | `whole` / `perCase` | 计时模式 | §5.6.1 |
| `openFrom` | string | 是 | `YYYY-MM-DD HH:mm` | 开放起始 | §5.5 |
| `openTo` | string | 是 | `YYYY-MM-DD HH:mm` | 开放终止（到点触发 `autoDeadline` 分流） | §5.5 · §5.6.2 |
| `attemptsUsed` | number | 是 | ≥ 0 | 已用作答次数（重考判断） | §5.5.1 ② |
| `maxAttempts` | number | 是 | ≥ 1 | 作答次数上限 | §5.5.1 ② |
| `scorePolicy` | string | 是 | `first` / `highest` / `latest` | 多次作答取分策略 | §5.5.1 ② |
| `score` | number \| null | 是 | 0 ~ 100 \| null | 成绩（未评分前为 `null`） | §5.5 |
| `scoreDetail` | string | 否 | — | 取分说明（如"第 2 次作答 · `scorePolicy = highest`"） | §5.5.1 ② |
| `actionable` | boolean | 是 | true / false | 当前是否可操作（决定主按钮可用性） | §5.5 |
| `actionLabel` | string | 否 | — | 主按钮文案（`继续作答` / `领取并作答` / `查看成绩` / `重试评分`） | §5.5 |
| `remainSeconds` | number | 否 | ≥ 0 | 剩余秒数（`作答中` 才有） | §5.6.1 |
| `lastSavedAt` | string | 否 | `HH:mm:ss` | 最近草稿保存时刻 | §5.11 |
| `lockedCount` | number | 否 | ≥ 0 | `perCase` 模式下已锁定例数 | §5.6.2 |
| `submitType` | string | 否 | 见第十四节 | 交卷来源（`已交卷` 态才有） | §5.6.2 |
| `reason` | string | 否 | — | **不可操作时的原因说明**（必填于 `actionable = false` 的态） | §5.5 |
| `retryUsed` | number | 否 | ≥ 0 | 评分重试已用次数（`评分失败` 态才有） | §5.5 |
| `retryMax` | number | 否 | ≥ 1 | 评分重试上限（原型取 3） | §5.5 |

**8 态覆盖**：原型 10 条任务覆盖全部 8 态，另含 `openTo` 未到点（`ET-2026-0950`）、两种计时模式各一例（`ET-2026-0930` = `whole`；`ET-2026-0928` = `perCase`）。

---

## 九、`EXAM_WORKBENCH` — 考核工作台

| 字段 | 类型 | 必填 | 取值/枚举 | 说明 | 来源 § |
|---|---|---|---|---|---|
| `taskId` | string | 是 | 关联 `EXAM_TASKS[].id` | 所属任务 | §6.3 |
| `title` | string | 是 | — | 任务名 | §6.3 |
| `caseIndex` | number | 是 | 0 起 | 当前例索引（默认打开哪一例） | §5.6.1 |
| `caseTotal` | number | 是 | ≥ 1 | 整卷例数 | §5.6 |
| `remainSeconds` | number | 是 | ≥ 0 | 剩余秒数（`whole` 为整卷、`perCase` 为本例） | §5.6.1 |
| `durationMode` | string | 是 | `whole` / `perCase` | 计时模式 | §5.6.1 |
| `caseIds` | array | 是 | `RC-00x` | 整卷例次顺序（决定卷头"第 i / N 例"） | §5.6 |
| `caseWeights` | array | 是 | `[1,1,1]` | 逐例权重（原型为**等权**） | §5.5.1 ③ |
| `drafts` | object | 是 | 键 = `caseId` | 逐例草稿 | §5.6 |
| `lockDemo` | object | 是 | — | `perCase` 单例锁定的**只读示例**（`whole` 工作台下无锁定，故单列演示） | §5.6.2 |
| `scoreableMax` | number | 是 | **派生** | 整卷加权可评分（原型 = `(84+88+96)/3 = 89.3`） | §5.5.1 |
| ⚠️ `submitType` | string | 否 | `manual` / `autoTimeout` | **运行时写入**（原型整卷提交时计算，见 `app.js` 的 `ex-submit`） | §5.6.2 |

### 9.1 `drafts[caseId]` — 逐例作答

| 字段 | 类型 | 必填 | 取值/枚举 | 说明 | 来源 § |
|---|---|---|---|---|---|
| `technique` | string | 是 | ≤ 500 字 | 检查技术 | §5.4.1 |
| `findings` | string | 是 | ≤ 3000 字 | 影像所见 | §5.4.1 |
| `impression` | string | 是 | ≤ 3000 字 | 诊断意见 | §5.4.1 |
| `locked` | boolean | 是 | true / false | 该例是否已锁定（锁定后**不可再改**） | §5.6.2 |
| `lockReason` | string \| null | 是 | `manual` / `timeout` / null | 锁定原因，**只取两值** | §5.6.2 |
| `lockedAt` | string \| null | 是 | `HH:mm:ss` \| null | 锁定时刻 | §5.6.2 |

> **命名映射（必读）**：原型内部字段名 `drafts[x].lockReason` ≡ PRD 契约字段名 **`caseLockReason`**（§5.6.2 的 `caseAnswers[i] = {caseId, content, lastSavedAt, lockedAt, caseLockReason}`）。两者**语义完全相同**，实现期以 PRD 的 `caseLockReason` 为准。

### 9.2 锁定的三种触发（**单向**，不可取消）

| 触发 | 模式 | `lockReason` | 依据 |
|---|---|---|---|
| 学生点「锁定本例」 | 仅 `perCase` | `manual` | §5.6.2 |
| 学生点「下一例」带走上一例 | 仅 `perCase` | `manual` | §5.6.2 |
| 单例倒计时到点 | 仅 `perCase` | `timeout` | §5.6.2 |
| **整卷提交** | 两种模式 | 未锁定的例统一写 `manual`；**已锁定的例保留原值** | §5.6.2 |
| 到点自动交卷 | 两种模式 | `timeout` | §5.6.2 |

**整卷 `submitType` 与逐例 `caseLockReason` 的关系**（§5.6.2，`req-panel.js:716` 同契约）：

- 任一例 `caseLockReason = 'timeout'` → 整卷 `submitType = 'autoTimeout'`
- 全部为 `manual` → 整卷 `submitType = 'manual'`
- **不得把已是 `manual` 的例改写成 `timeout`**——那会污染申诉凭证。

---

## 十、`RESULT` — 评分结果

| 字段 | 类型 | 必填 | 取值/枚举 | 说明 | 来源 § |
|---|---|---|---|---|---|
| `taskId` | string | 是 | 关联 `EXAM_TASKS[].id` | 所属任务 | §6.4 |
| `title` | string | 是 | — | 任务名 | §6.4 |
| `attemptIndex` | number | 是 | ≥ 1 | 本次是第几次作答 | §5.5.1 ② |
| `attemptTotal` | number | 是 | ≥ 1 | 作答总次数（= `maxAttempts`） | §5.5.1 ② |
| `submitType` | string | 是 | `manual` / `autoTimeout` / `autoDeadline` | 交卷来源 | §5.6.2 |
| `lastSavedAt` | string | 是 | `HH:mm:ss` | 最后保存时刻 | §5.11 |
| `savedNotice` | boolean | 是 | true | 是否显示"草稿已落库" | §5.11 |
| `goldStandardRevealed` | boolean | 是 | true / false | **本任务是否开放金标准原文**（由任务配置 `revealGoldStandardAfterSubmit` 决定，**默认 `false`**） | §5.8 · §7.4 · D9 |
| `maxAttempts` | number | 是 | ≥ 1 | 重考上限 | §5.5.1 ② |
| `attemptsUsed` | number | 是 | ≥ 0 | 已用次数 | §5.5.1 ② |
| `cases` | array | 是 | 每例一项 | 分例结果 | §5.5.1 ③ |
| `appealFiled` | boolean | 是 | true / false | 是否已申请复核 | §5.4.1 |
| `makeupFiled` | boolean | 是 | true / false | 是否已登记系统原因补考 | §5.6.2 |
| `goldStandardText` | string | 是 | — | 金标准报告全文（**仅在 `goldStandardRevealed = true` 时下发**） | §5.8 |
| `scoreableMax` | number | 是 | **派生** | 整卷加权可评分（= 逐例均值） | §5.5.1 |
| `rawTotal` | number | 是 | **派生** | 整卷原始分（= 逐例 `rawTotal` 均值） | §5.5.1 ③ |
| `totalScore` | number | 是 | **派生** | 整卷得分（= 逐例 `total` 均值，取整） | §5.5.1 ③ |

### 10.1 `cases[i]` — 分例结果

| 字段 | 类型 | 必填 | 取值/枚举 | 说明 | 来源 § |
|---|---|---|---|---|---|
| `id` | string | 是 | `RC-00x` | 样本 | §5.5.1 ③ |
| `name` | string | 是 | — | 样本名 | §5.5.1 ③ |
| `short` | string | 是 | `例1` / `例2` / `例3` | 卷内简称 | §6.4 |
| `weight` | string | 是 | `各 1/3` | 权重（原型为等权） | §5.5.1 ③ |
| `scoreableMax` | number | 是 | 84 / 88 / 96 | **该例**可评分（归一分母） | §5.5.1 ③ |
| `items` | array | 是 | 23 条 | 逐条得分 | §5.5.1 ③ |
| `dims` | array | 是 | **派生** | 按 `R1_TABLE` 归并的 5 维度得分 | §6.4 |
| `rawTotal` | number | 是 | **派生** | 原始分 = Σ`items[].got` | §5.5.1 ③ |
| `total` | number | 是 | **派生** | 归一分 = `rawTotal ÷ scoreableMax × 100`（取整） | §5.5.1 ③ |

### 10.2 `cases[i].items[j]` — 逐条得分

| 字段 | 类型 | 必填 | 取值/枚举 | 说明 | 来源 § |
|---|---|---|---|---|---|
| `code` | string | 是 | 关联 `R1_TABLE[].items[].code` | 条目编号 | 附录 E |
| `mark` | string | 是 | `ok` / `mid` / `bad` / `na` / `unassessable` | 判定档（见第十四节） | §5.5.1 ③ |
| `got` | number | 是 | ≥ 0 | 实得分 | §5.5.1 ③ |
| `full` | number | 是 | 同 `R1_TABLE` | 该条满分 | 附录 E |
| `comment` | string | 是 | — | 逐条点评（**空串 = 无话可说**，不是缺数据） | §5.9 |
| `source` | string | 否 | `deidentify` / `capability` / `na` | 不可评来源（仅不可评条目有） | §5.2.2 |

> **⚠️ 字段名偏差（N15）**：PRD §5.5.1 ③ 的 `caseScores[]` 契约字段名为 `dimensions[]` / `missingItems[]` / `unassessableItems[]`，原型种子用 `items` / `dims` 简写。**实现期以 PRD 契约名为准**，已登记入差异清单序号 23。
>
> **⚠️ 展示面约束**：`scoreableMax` 与 `rawTotal` **不得出现在学生可见区**（§5.5.1）。原型**不呈现**这两个量，界面只出归一后 `total` 与条目级分色清单（`unassessableItems[]`）——要核对某例折算是否合理，看分色清单即可（§5.14.4 已删折算说明区块）。

---

## 十一、`SELF_REVIEW` — T4 对照自评

| 字段 | 类型 | 必填 | 取值/枚举 | 说明 | 来源 § |
|---|---|---|---|---|---|
| `caseId` | string | 是 | `RC-00x` | 自评对象 | §5.2.4 |
| `roundIndex` | number | 是 | ≥ 1 | 回合序号 | §5.2.4 |
| `submitted` | boolean | 是 | true / false | 是否已提交（**提交才解锁对照区**） | §5.2.4 |
| `marks` | object | 是 | 键 = 条目编号，值见第十四节 | 23 条逐条自评 | §5.2.4 |
| `yourReport` | string | 是 | — | 学生报告全文（对照左栏） | §5.8 |
| `goldReport` | string | 是 | — | 金标准报告全文（对照右栏） | §5.8 |
| `selfPool` | number | 是 | 84 | 自评分母 = 该样本可评分 | §5.2.4 |
| `yourSelfTotal` | number | 是 | ≥ 0 | 自评合计（按"写了"的条目分值合计） | §5.2.4 |
| `yourSelfNormalized` | number | 是 | 0 ~ 100 | 自评归一 | §5.2.4 |
| `selfCounts` | object | 是 | `{wrote, unsure, missed, na}` | 四档计数 | §5.2.4 |
| `systemRaw` | number | 是 | ≥ 0 | 系统原始分 | §5.2.4 |
| `systemNormalized` | number | 是 | 0 ~ 100 | 系统归一 | §5.2.4 |
| `deviation` | number | 是 | **派生** | 偏差 = 自评归一 − 系统归一（**负 = 学生低估自己**） | §5.2.4 |

**口径要点**：

- 自评合计按「写了」的条目分值合计，**不可评条目整体不纳入**；分母 = 该样本 `scoreableMax`。
- **自评不参与任何计算**，只作**学情信号**（§5.2.4）。
- 金标准在训练侧 **T4 提交后必定下发**，不受 `revealGoldStandardAfterSubmit` 影响（该开关只管考核侧）。

---

## 十二、管理端实体（题库 / 组卷 / 成绩）· §5.12–§5.14

### 12.1 `scoreableOf(caseId)` — 派生函数（两端共用）

```
scoreableMax = 100 − Σ(乙类落空条满分)
```

| 入参 | 出参 | 说明 |
|---|---|---|
| `caseId` | `{max: number, lost: array}` | `lost[]` 每项 = `{code, source, score, why}` |

**要点**：甲类 `GEN-02` **部分不可评、不整体剔除**，故不进这个减法。这是「四条同时落空 = 84 分」算式不含甲类的原因。

### 12.2 `SELECTION_DEMO` — 组卷侧过渡演示表

| 字段 | 类型 | 必填 | 取值/枚举 | 说明 | 来源 § |
|---|---|---|---|---|---|
| `id` | string | 是 | `RC-00x` | 样本 | §5.5.1 |
| `title` | string | 是 | — | 样本名 | §5.5.1 |
| `cap` | object | 是 | 同 `CAPABILITIES[caseId]` | 该样本能力位 | §5.10.2 |
| `scoreableMax` | number | 是 | **派生** | 该样本可评分 | §5.5.1 |
| `lost` | array | 是 | **派生** | 被移出分母的条目 | §5.5.1 |

> 第四轮的过渡演示表。**第五轮已由 P12 的真实组卷草稿 `ADM_DRAFT` + `draftRefs()` 取代**，保留仅为回溯，实现期不落库。

### 12.3 `ADM_SAMPLES` — 题库样本（§5.12.7 `imagingSample`）

| 字段 | 类型 | 必填 | 取值/枚举 | 说明 | 来源 § |
|---|---|---|---|---|---|
| `id` | string | 是 | `RC-001` … `RC-008` | 样本主键（与 `CASES.id` 同键，不另造） | §5.12.7 |
| `title` / `modality` / `bodyPart` / `level` / `levelName` / `ico` | — | 是 | 同 `CASES` | 从 `CASES` 取，**不重复造** | §5.3 |
| `version` | number | 是 | 1 起递增 | **样本版本号**；改版走新建版本，旧任务锁旧版 | **§5.12.8** |
| `status` | string | 是 | `draft` · `published` · `disabled`（**3 态**） | 只有 `published` 且 `goldStandard` 已录的样本可被组卷勾选 | **§5.12.2** |
| `goldStandard` | boolean | 是 | — | 金标准报告是否已录入 | §5.12.6 |
| `series` | object | 是 | `{axial, coronal, sagittal}` 帧数 | 图片序列（JPG/PNG）帧数；`draft` 样本冠状/矢状为 `0` | **§5.12.3** |
| `capabilities` | object | 是 | 同 `CAPABILITIES[id]` | 5 位能力位（同源引用） | §5.12.5 |
| `scoreableMax` | number | 是 | **派生** | 该样本可评分，由 `scoreableOf()` 现算 | §5.12.5 |
| `lost` | array | 是 | **派生** | 被移出分母的条目 | §5.2.2 |
| `updatedAt` / `updatedBy` | string | 是 | — | 最后改动时间与操作人（审计） | §5.12.7 |

**脱敏字段口径（§5.12.4）**：样本编辑器第 ② 区块的展示规则——姓名**整体抹除**；检查号 / 影像号**保留后 4 位**（`****7612`）；检查日期**保留年月**。`GEN-02`（一般信息完整性）**强制全掩、不给开关**，属全局常量。

### 12.4 `SAMPLE_VER_IMPACT` — 样本改版影响面（§5.12.8）

| 字段 | 类型 | 必填 | 取值/枚举 | 说明 | 来源 § |
|---|---|---|---|---|---|
| `id` | string | 是 | `RC-00x` | 被改版的样本 | §5.12.8 |
| `from` / `to` | number | 是 | — | 版本跃迁（`from` → `to`） | §5.12.8 |
| `openTasks` | number | 是 | — | **受影响的任务数**——这些任务经 `caseRefs[].version` **锁在旧版**，不会被新版本影响 | §5.12.8 |

### 12.5 `ADM_DRAFT` + 派生函数 — 组卷草稿（§5.13）

| 字段 | 类型 | 必填 | 取值/枚举 | 说明 | 来源 § |
|---|---|---|---|---|---|
| `step` | number | 是 | 1–4 | 当前步骤（四步同页） | §5.13.2 |
| `step1` | object | 是 | `{title, desc, durationMode, durationMinutes, evaluationTableVersion}` | 基本信息 | §5.13.2 |
| `picked` | object | 是 | 键 = `caseId`，值 = **星级 1–5** | 勾选样本 + 权重星级；**勾选范围 1–20 例** | **§5.13.3** |
| `step3` | object | 是 | `{assigneeType, classIds[], studentIds[], openFrom, openTo, maxAttempts, scorePolicy, excludeTrainedSamples, revealGoldStandardAfterSubmit, showScoreToStudent, showRankToStudent}` | 发布设置 + 4 个开关 | §5.13.4 |
| `gateReason` | string | 否 | ≤ 200 字 | **门禁覆盖发布原因**（走 `< 85` 路径时必填） | **§5.13.5** |

**派生函数（必须现算，不得写死）**：

| 函数 | 算式 | 为何现算 |
|---|---|---|
| `draftRefs()` | `picked` 星级 → `[{caseId, version, weight}]`，`weight = star / Σstar × 100`（1 位小数） | 星级是输入方式，权重是派生量；星级一变权重全变 |
| `weightedScoreable(refs)` | `Σ(该例 scoreableMax × weight) ÷ Σweight`（1 位小数） | **整卷加权口径**（§5.9.2）；逐例 `scoreableMax` 不等于整卷 |
| `draftScoreable()` | `weightedScoreable(draftRefs())` | 发布门禁判据；点一下能力位徽章数字立即变 |

`gateReason` 的落库时机有个实现坑：`util.js` 的 `closeModal()` 会**先清空弹层 DOM、再回调 `onClose`**，故原因必须在 `validate()`（DOM 尚在）时取走并缓存，不能在 `onClose` 里读 `getElementById`——否则审计原因恒为空串。

### 12.6 `ADM_PRESETS` — 选样预设（原型演示用）

| 字段 | 类型 | 必填 | 取值/枚举 | 说明 | 来源 § |
|---|---|---|---|---|---|
| 键 | string | 是 | `pass` · `fail` | `pass` = 可发布卷（可评分 90.7）；`fail` = 触发门禁卷（可评分 84） | §5.13.3 · §5.13.5 |
| `label` / `picked` | — | 是 | — | 按钮文案 + 预设 `picked` 星级表 | 同上 |

> **原型演示专用**，产品无此实体——存在只是为了让评审一键看到「≥85 正常发布」与「<85 走门禁」两条路径的对比。

### 12.7 `ADM_TASKS` — 考核任务（管理端视角，§5.13 / §5.14.1）

| 字段 | 类型 | 必填 | 取值/枚举 | 说明 | 来源 § |
|---|---|---|---|---|---|
| `id` | string | 是 | `AT-2026-0996` … `AT-2026-1001` | 任务主键 | §5.13 |
| `title` | string | 是 | — | 任务名称 | §5.13.2 |
| `state` | string | 是 | 同学生侧 8 态 | 任务状态（**管理端视角与服务端同源**） | §5.5 |
| `caseRefs` | array | 是 | `[{caseId, version, weight}]` | **卷内样本 + 锁版本 + 权重**——任务发布后不可改（§5.13.6） | **§5.12.8 · §5.13.3** |
| `caseCount` | number | 是 | **派生** = `caseRefs.length` | 例数 | §5.13.3 |
| `scoreableMax` | number | 是 | **派生** = `weightedScoreable(caseRefs)` | 整卷可评分（加权口径） | §5.9.2 |
| `gateOk` | boolean | 是 | **派生** = `scoreableMax >= 85` | 是否走正常发布路径 | §5.13.5 |
| `assignee` | object | 是 | `{type: 'class'\|'student', label, count}` | 派发对象 | §5.13.4 |
| `durationMode` / `durationMinutes` / `maxAttempts` / `scorePolicy` | — | 是 | 同学生侧枚举 | 时限与策略 | §5.6.1 · §5.5.1 ② |
| `openFrom` / `openTo` | string | 是 | — | 开放窗口 | §5.13.4 |
| `revealGoldStandardAfterSubmit` / `showScoreToStudent` / `showRankToStudent` | boolean | 是 | 默认 `false` / `true` / `false` | 三个事后开关 | §5.8 · §5.14.3 |
| `overrideGate` | object \| null | 否 | `{used, scoreableMax, reason}` | **门禁覆盖留痕**；`null` = 走正常发布路径 | **§5.13.5** |
| `publishedAt` / `revokedAt` / `createdBy` / `revokeNote` | string | 否 | — | 审计字段 | §5.13.6 |
| `progress` | object | 是 | `{assigned, claimed, submitted, scoreFailed?}` | 派发进度（列表进度条） | §5.14.1 |

> **`overrideGate` 是审计锚点**：`used: true` 的任务（本演示 `AT-2026-0998`，可评分 84）在 P11 列表有折叠详情、在 P13 顶部有告警 banner，且成绩单须标注"本卷含不可评条目、跨卷不可比"。

### 12.8 `ADM_CLASSES` — 班级 / 名单（§5.13.4 预留接口）

| 字段 | 类型 | 必填 | 取值/枚举 | 说明 | 来源 § |
|---|---|---|---|---|---|
| `id` | string | 是 | `CLS-2201` … | 班级主键 | §5.13.4 |
| `name` | string | 是 | — | 班级名 | §5.13.4 |
| `studentCount` | number | 是 | — | 班级人数 | §5.13.4 |

**接口形状即契约**（原型不接名单源）：`listClasses()` → `[{classId, name, studentCount}]`；`listStudents(classId)` → `[{studentId, name}]`。班级隶属的**权威数据源待院方确认**（PRD Q11 / §9.3）。

### 12.9 `ADM_STUDENTS` — 成绩汇总读模型（§5.14.3）

| 字段 | 类型 | 必填 | 取值/枚举 | 说明 | 来源 § |
|---|---|---|---|---|---|
| `id` / `name` / `className` | string | 是 | — | 学生标识 | §5.14.3 |
| `state` | string | 是 | `已交卷` · `作答中` · `未交卷` · `未领取` | 该生在**本任务**的作答状态 | §5.14.3 |
| `score` | number \| null | 是 | — | 按 `scorePolicy` **计入成绩的那一次**；未交卷为 `null`（**不按 0 分**） | **§5.14.3** |
| `attemptIndex` / `attemptTotal` / `policy` | number / string | 是 | `first` · `highest` · `latest` | 多次作答时标注"第 i/N 次 · 取最高分" | §5.14.3 |
| `submitType` / `submitTypeLabel` / `submittedAt` | string | 是 | 同学生侧 `submitType` | 交卷来源与时间 | §5.6.2 |
| `attempts` | array | 是 | `[{attemptIndex, submittedAt, submitType, submitTypeLabel, score, counted}]` | 全部 attempt 留痕；`counted: true` 的那次计入成绩 | §5.14.3 |
| `appeal` | object \| null | 是 | `{filedAt, reason}` | 申诉登记（**只读**，本期不设复核/改分） | **§5.14.6** |
| `cases` | array | 是 | `caseScores[]` | 病例级明细，**直接复用 `RESULT.cases`**（不造第二套） | **§5.14.4** |
| `note` | string | 否 | — | 状态备注（如"已领取，剩余 06:12"） | 原型自定 |

**`caseScores[]` 逐条字段**（`cases[i]`）：

| 字段 | 类型 | 必填 | 取值/枚举 | 说明 | 来源 § |
|---|---|---|---|---|---|
| `id` / `name` / `short` / `weight` | — | 是 | 同 `RESULT.cases` | 例标识与权重 | §5.14.4 |
| `items[]` | array | 是 | `{code, mark, got, full, comment, source}` | 逐条得分；`source` 区分甲类/乙类不可评 | §5.14.4 |
| `dims[]` | array | 是 | `{dim, got, full}` | 5 维度得分条 | §5.14.4 |
| `scoreableMax` / `rawTotal` / `total` | number | 是 | **派生** | 派生字段，**仅服务端持有**；界面只呈现归一后 `total`（§5.14.4） | **§5.14.4 · §5.10.2** |

### 12.10 `ADM_TASK_STATS` — 任务级汇总（§5.14.2）

| 字段 | 类型 | 必填 | 取值/枚举 | 说明 | 来源 § |
|---|---|---|---|---|---|
| `assigned` / `claimed` / `submitted` | number | 是 | — | 派发 / 领取 / 交卷人数 | §5.14.2 |
| `avg` | number | 是 | — | **均分只统计已交卷 attempt**；未参加**不按 0 分计入** | **§5.14.2** |
| `dist` | array | 是 | `[{label, n}]` | 分数分布（`< 60` / `60–69` / `70–79` / `80–89` / `90–100`） | §5.14.2 |
| `appeals` | number | 是 | — | 申诉件数 | §5.14.6 |

### 12.11 `ADM_ITEM_STATS` — 学情 · 条目级失分率（§5.14.5）

| 字段 | 类型 | 必填 | 取值/枚举 | 说明 | 来源 § |
|---|---|---|---|---|---|
| `code` / `name` / `dim` | string | 是 | 同 `R1_TABLE` | 条目标识 | §5.14.5 |
| `assessCount` | number | 是 | — | **该条实际可评次数**（不可评已踢出） | §5.14.5 |
| `lossRate` | number \| null | 是 | 0–100（1 位小数） | 失分率 = `1 − Σ该条实际得分 / Σ该条可评满分` | §5.14.5 |
| `enough` | boolean | 是 | 是 = `assessCount >= 5` | **样本量不足的条目不参与排序** | §5.14.5 |

> **越靠上越该补课**。口径要点：**不可评条目直接从分母剔除**，否则"样本不具备的能力"会被读成"学生不会"。

### 12.12 发布门禁口径（§5.13.5）——**本轮已定**

`scoreableMax < 85` **不是拒绝发布**，而是：

1. 点「确认发布」→ **强制**弹出覆盖门禁的二次确认；
2. **必填发布原因 ≤ 200 字**，按钮文案为「**仍要发布**」；
3. 写审计 `auditLog{action: 'exam.publish.overrideGate', targetType: 'examTask', targetId, detail: {scoreableMax, reason}}`；
4. 成绩单标注"本卷含不可评条目"，且**跨卷不可比**。

四条乙类同时落空时 `100 − 4 − 4 − 4 − 4 = 84 < 85`。

> **计量单位已明确为「整卷加权」**（§5.9.2 口径：`Σ(该例可评分 × 权重) ÷ Σ权重`），与 PRD「为何取 85」的整卷论证一致。原登记的口径分歧（差异清单 N9）**本轮闭合**。

---

## 十三、原型壳（非产品契约）

以下字段属**原型运行外壳**，不是产品数据模型，实现期不落库。

| 字段 | 类型 | 必填 | 取值/枚举 | 说明 | 来源 |
|---|---|---|---|---|---|
| `USER` | object | 是 | `{name, institution}` | 演示用户（`胡春蒙` / `东南大学医学院`） | 原型自定 |
| `CASE_BY_ID` | object | 是 | 键 = `caseId` | `CASES` 的运行时索引（**冗余，非新数据**） | 原型自定 |
| `appState` | object | 是 | — | 跨页临时状态 | 原型自定 |
| `appState.exCaseIdx` | number \| null | 是 | null 起 | P6 当前例索引（`null` = 用 `EXAM_WORKBENCH.caseIndex`） | 原型自定 |
| `appState.resCaseIdx` | number | 是 | 0 起 | P7 当前结果例索引 | 原型自定 |
| `appState.admSampleId` | string | 是 | `RC-001` 起 | P10 当前编辑的样本 id | 原型自定 |
| `appState.admTaskId` | string | 是 | `AT-2026-0999` 起 | P13 当前查看的任务 id | 原型自定 |
| `appState.admStuOpen` | string \| null | 是 | `'STU-2202001'` 起 | P13 展开的学生 id（`null` = 全部收起）；默认展开张三，让首屏即见病例级下钻与不可评分色 | 原型自定 |
| `appState.admCaseIdx` | number | 是 | 0 起 | P13 病例级下钻的当前例索引 | 原型自定 |
| `appState.current` | string | 是 | `p1`…`p13` | 当前页面 id | 原型自定 |
| `hi-fi-prototype:report-writing:draft` | localStorage 键 | 是 | — | **串讲编辑模式**的改动草稿（只保留最新草稿，带 `savedAt`）；超 30 天询问是否续用 | 原型自定 |

---

## 十四、枚举字典与派生规则

### 14.1 枚举字典（全部枚举集中于此，实现期按此建约束）

| 枚举 | 取值 | 来源 § |
|---|---|---|
| **任务状态** `state` | `待作答` · `作答中` · `已交卷` · `评分中` · `已评分` · `评分失败` · `已截止` · `已撤销`（**8 态**） | §5.5 |
| **锁定原因** `lockReason` / `caseLockReason` | `manual` · `timeout`（**仅两值**） | §5.6.2 |
| **计时模式** `durationMode` | `whole` · `perCase` | §5.6.1 |
| **交卷来源** `submitType` | `manual` · `autoTimeout` · `autoDeadline` | §5.6.2 |
| **取分策略** `scorePolicy` | `first` · `highest` · `latest` | §5.5.1 ② |
| **条目判定** `items[].mark` | `ok` · `mid` · `bad` · `na` · `unassessable` | §5.5.1 ③ |
| **不可评来源** `items[].source` | `deidentify`（甲类）· `capability`（乙类）· `na`（不适用） | §5.2.2 |
| **自评判定** `marks` 值 | `wrote` · `unsure` · `missed` | §5.2.4 |
| **覆盖标记** `coverage[].mark` | `ok` · `doubt` · `miss` | §6.2 |
| **提示层级** `hints[].level` | `L1` · `L2` · `L3` | §5.2.3 |
| **训练阶段** `stage` | `T0` · `T1` · `T2` · `T3` · `T4` | §5.2.2 |
| **模态** `modality` | `CT` · `MR` · `DR` · `超声` | §5.3 |
| **部位** `bodyPart` | `颅脑` · `头颈` · `胸部` · `腹部` · `骨肌` · `其他` | §5.3 |
| **难度** `level` / `levelName` | 三阶段七级 `U1 U2 R1 R2 R3 F1 F2` ＋ 双标签 `基础` / `进阶` / `疑难` | 难度双标签体系 |
| **样本状态** `sample.status`（管理端） | `draft`（草稿 · 不可选）· `published`（已发布 · 可选）· `disabled`（已停用 · 不可选，**历史任务仍锁旧版**） | **§5.12.2** |
| **组卷步骤** `ADM_DRAFT.step` | 1 基本信息 · 2 选样与权重 · 3 发布设置 · 4 确认发布 | **§5.13.2** |
| **派发对象类型** `assignee.type` | `class` · `student` | **§5.13.4** |
| **审计动作** `action`（管理端） | `exam.publish` · **`exam.publish.overrideGate`** · `exam.revoke` · `score.export` · `sample.publish` | **§5.13.5 · §5.14.7** |
| **学生作答状态**（管理端汇总读模型） | `已交卷` · `作答中` · `未交卷` · `未领取`（**4 态**，与任务 8 态不同维度） | **§5.14.3** |

> **状态优先级**（§5.5）：`已撤销` > `已截止` > `已评分`；`已截止` **不与** `评分中` / `评分失败` / `已评分` 并存。

> **样本不可选的两种情形文案不同**（§5.12.2）：`draft` 显示「草稿 · 不可选」（还没做完），`disabled` 显示「已停用 · 不可选」（做过但不给用）——两种状态的学生侧与组卷侧表现一致，均置灰。

### 14.2 派生规则（**不落库、不写死**）

| 派生字段 | 算式 | 为何必须现算 |
|---|---|---|
| `case.scoreableMax` | `100 − Σ(该例乙类落空条满分)` | 随样本能力位变；写死会与条目分漂移 |
| `case.rawTotal` | `Σ items[].got` | 同上 |
| `case.total` | `rawTotal ÷ scoreableMax × 100`（取整） | 归一后得分，**满分恒 100** |
| `case.dims` | 按 `R1_TABLE` 归并 `items[].got` | 避免"条目分 / 维度分 / 整卷分"三处对不上 |
| `RESULT.scoreableMax` | 逐例均值 | 整卷按例等权 |
| `RESULT.rawTotal` | 逐例 `rawTotal` 均值 | 同上 |
| `RESULT.totalScore` | 逐例 `total` 均值（取整） | 同上 |
| `SELF_REVIEW.deviation` | `yourSelfNormalized − systemNormalized` | 负 = 学生低估自己 |
| `EXAM_WORKBENCH.submitType` | `任一例 timeout ? 'autoTimeout' : 'manual'` | 运行时依逐例 `caseLockReason` 计算 |
| `ADM_SAMPLES[i].scoreableMax` | `scoreableOf(id).max` | 管理端入库侧同样**现算**——点一下能力位徽章，数字立即变 |
| `ADM_TASKS[i].caseCount` | `caseRefs.length` | 卷内例数，随卷面变 |
| `ADM_TASKS[i].scoreableMax` | `weightedScoreable(caseRefs)` | **整卷加权**口径；权重来自组卷星级 |
| `ADM_TASKS[i].gateOk` | `scoreableMax >= 85` | 门禁判据；决定发布走正常路径还是覆盖确认 |
| `draftRefs()[i].weight` | `star / Σstar × 100`（1 位小数） | 星级是输入，权重是派生；星级一变权重全变 |
| `draftScoreable().max` | `weightedScoreable(draftRefs())` | 组卷第 2/4 步随时显算，驱动门禁两态 |
| `ADM_ITEM_STATS[i].lossRate` | `1 − Σ该条实际得分 ÷ Σ该条可评满分` | **不可评条目已踢出分母**；分母变了失分率就变 |
| `ADM_ITEM_STATS[i].enough` | `assessCount >= 5` | 样本量阈值；不足者不参与排序 |

> **⚠️ 注释偏差（N14）**：`seed.js:380-381` 的注释写「向上取整」，实现为 `Math.round`（四舍五入）。仅注释偏差，不影响取值，已登记入差异清单序号 22。

> **raw / normalized 双存（§5.5.1 ③）**：`rawTotal` 与 `total` **必须同时持久化**——否则影像教学底座补齐测量工具后，**历史成绩无法重算**。

---

## 十五、三方对齐核查

核查目标：**种子声明字段集 `a` ⊇ 页面实际读取字段集 `b`**，且契约类字段在 `a` 中有对应。

### 15.1 核查方法与实测结果

受测文件：`js/seed.js`（声明侧，`window.SEED` 导出）· `js/pages/*.js` + `js/app.js`（读取侧）。

**① seed 顶层导出键 `a`（28 个）**

```
R1_TABLE  CAPABILITIES  CAPABILITY_ITEMS  DEIDENTIFY_ITEMS  scoreableOf  CASES
CASE_BY_ID  WORKBENCH  SEGMENTS  EXAM_TASKS  EXAM_WORKBENCH  RESULT
SELF_REVIEW  SELECTION_DEMO  ADM_SAMPLES  SAMPLE_VER_IMPACT  ADM_TASKS
ADM_TASK_BY_ID  ADM_CLASSES  ADM_DRAFT  ADM_PRESETS  draftRefs  draftScoreable
weightedScoreable  ADM_STUDENTS  ADM_TASK_STATS  ADM_ITEM_STATS  USER
```

**② 页面实际读取的顶层字段 `b`（24 个）**

```
ADM_CLASSES  ADM_DRAFT  ADM_ITEM_STATS  ADM_PRESETS  ADM_SAMPLES  ADM_STUDENTS
ADM_TASKS  ADM_TASK_BY_ID  ADM_TASK_STATS  CAPABILITIES  CASES  CASE_BY_ID
EXAM_TASKS  EXAM_WORKBENCH  R1_TABLE  RESULT  SAMPLE_VER_IMPACT  SEGMENTS
SELECTION_DEMO  SELF_REVIEW  WORKBENCH  draftRefs  draftScoreable  scoreableOf
```

**③ 断言结果**（复核脚本：正则抓 `js/seed.js` 的 `w.SEED = {…}` 键集 `a`，抓 `js/pages/*.js` + `js/app.js` 的 `S.xxx` 引用集 `b`）

| 断言 | 结果 |
|---|---|
| `b ⊆ a`（页面读的都在 seed 声明的里） | ✅ 通过（24 / 24，超读集为空） |
| 契约类字段 `a ∩ c ≠ ∅`（c = PRD 契约字段手工摘表，含 `caseLockReason`、`scoreableMax`、`submitType`、`durationMode`、`scorePolicy`、`caseRefs`、`overrideGate`） | ✅ 通过 |
| 顶层键拼写零歧义 | ✅ 通过（无 `samples` 类残留） |
| `js/app.js` 的 `PAGES[].render` 引用的页面工厂在 `w` 上均已定义 | ✅ 通过（13 / 13） |
| `data-act` 源码集合 ⊆ `app.js` 实现集合 | ✅ 通过（差集仅 `draft` / `ex-draft`，由 `onInput` 处理） |

**④ `drafts[x]` 读取字段（`p6-exam-workbench.js`）**

```
technique  findings  impression  locked  lockReason  lockedAt
```

与第九节 9.1 的表**逐字段一致**，无超读字段。

### 15.2 原型壳专有字段白名单

以下字段在 `seed.js` 中声明但**页面不直接读取**，或属运行外壳，**不计入产品契约**：

| 字段 | 归类 | 理由 |
|---|---|---|
| `USER` | 原型壳 | 演示用户，真实系统由登录态提供 |
| `CAPABILITY_ITEMS` | 规则配置 | 由 `scoreableOf()` 消费，无页面直接读 |
| `DEIDENTIFY_ITEMS` | 规则配置 | 甲类规则常量，结果页条目文本已内联 |
| `weightedScoreable` | 间接读取 | 由 `draftScoreable()` 与 `seed.js` 的 `ADM_TASKS` 初始化消费，无页面直接读 |
| `CAPABILITIES` | 间接读取 | 经 `ADM_SAMPLES[].capabilities`、`SELECTION_DEMO[].cap` 与 `scoreableOf()` 消费 |
| `CASE_BY_ID` | 运行时索引 | `CASES` 的冗余索引（管理端不重复造样本元数据，经此回取 `title` / `modality` 等） |
| `ADM_TASK_BY_ID` | 运行时索引 | `ADM_TASKS` 的冗余索引 |
| `appState` | 原型壳 | 跨页临时状态 |
| `hi-fi-prototype:report-writing:draft` | 原型壳 | 串讲编辑模式草稿 |
| `ADM_PRESETS` | 原型演示 | 产品无此实体，仅为一键切「可发布 / 触发门禁」两条路径 |
| `SELECTION_DEMO` | 过渡物 | 第四轮遗留；第五轮已由 `ADM_DRAFT` + `draftRefs()` 取代 |

### 15.3 已知的对齐缺口

| 缺口 | 内容 | 状态 |
|---|---|---|
| ~~能力位位数~~ | ~~`seed` 用 5 位，PRD 声明 4 位~~ | ✅ **已闭合**——PRD 采纳补第 5 位 `hasStagingInfo`（本文件 4.3） |
| ~~门禁计量单位~~ | ~~逐例 vs 整卷~~ | ✅ **已闭合**——明确为**整卷加权**口径（本文件 12.12） |
| `caseScores[]` 字段名 | 原型 `items` / `dims` vs 契约 `dimensions[]` / `missingItems[]` / `unassessableItems[]` | ⬜ 登记（差异清单序号 23 / N15），不在本轮修 |
| `assessableRatio` | PRD 未给数值口径，原型取演示值 `0.5` | ⬜ 登记（本文件第五节） |
| 管理端聚合是否落库 | `ADM_TASK_STATS` / `ADM_ITEM_STATS` 标「是（聚合，可实时算）」——实时算还是物化表，PRD 未定 | ⬜ 登记，实现期定 |

---

## 附：与 PRD 的章节映射速查

| 实体 | PRD 主依据 | 附带依据 |
|---|---|---|
| `R1_TABLE` | 附录 E | §5.10.2 |
| `CAPABILITIES` / `CAPABILITY_ITEMS` / `DEIDENTIFY_ITEMS` | §5.2.2 | §5.10.2 · §9.4 · 附录 E |
| `CASES` | §5.3 | §5.2.1 |
| `SEGMENTS` | §5.4.1 | §5.4.2 |
| `WORKBENCH` | §5.2.1 | §5.2.2 · §5.2.3 · §5.7 · §6.2 |
| `EXAM_TASKS` | §5.5 | §5.5.1 |
| `EXAM_WORKBENCH` | §5.6 | §5.6.1 · §5.6.2 · §6.3 |
| `RESULT` | §5.5.1 ③ | §5.8 · §5.9 · §5.9.1 · §6.4 |
| `SELF_REVIEW` | §5.2.4 | §5.8 · §7.4 |
| `SELECTION_DEMO` | §5.5.1 | §5.10.2 |
| `ADM_SAMPLES` | **§5.12.2 · §5.12.7** | §5.12.3 · §5.12.4 · §5.12.5 · §5.12.6 · §5.3 |
| `SAMPLE_VER_IMPACT` | **§5.12.8** | §5.13 |
| `ADM_DRAFT` / `ADM_PRESETS` | **§5.13** | §5.13.1 · §5.13.3 · §5.13.5 |
| `ADM_TASKS` | **§5.13 · §5.14.1** | §5.9.2 · §5.12.8 · §5.13.4 · §5.13.5 · §5.13.6 |
| `ADM_CLASSES` | **§5.13.4** | §9.3 · Q11 |
| `ADM_STUDENTS` | **§5.14.3** | §5.14.4 · §5.14.6 · §5.10.2 |
| `ADM_TASK_STATS` | **§5.14.2** | §5.14.6 |
| `ADM_ITEM_STATS` | **§5.14.5** | §5.2.2 |
| `weightedScoreable` / `draftRefs` / `draftScoreable` | **§5.13.3** | §5.9.2 · §5.13.5 |
