# Changelog

## 2026-07-10

### 精神检查模块 — 非精神病性障碍支持

- **根因**：`0602-sp-atypical.txt` 提示词模板为精分专设，强制注入"你有妄想、幻觉、思维散漫"，惊恐障碍等非精神病性病例被 LLM 自由发挥出编造的精分症状
- **数据层**：补齐 `PS-20260416-7D9E-meta.json`（含完整 `atypical_dialogue`），`sp-api` 增加 `mentalExam.json` fallback 加载路径（meta.json 缺失时自动降级）
- **提示词层**：重写 `0602-sp-atypical.txt`，按疾病类型分叉——非精神病性障碍禁止妄想/幻觉内容，注入 MSE 8 维度字段（`{{ms_appearance}}` 等）按临床描述表演
- **引擎层** (`mental-engine.js`)：新增 `isNonPsychotic()` 判定（疾病类型 + 幻觉参数综合），非精神病性走 `anxious → irritable → explosive` 状态路径；`stateToEmotion` 修复 `flat`/`anxious` 全零问题；`trustLevel` 硬编码 0→5
- **提示词构建器** (`prompt-builder.js`)：新增 `{{disease_type}}` 和 8 个 `{{ms_*}}` 维度占位符；新增 `anxious` 状态行为指令

### 反思脑 — stuck/concern 自然衰减 + 病史采集误判修复

- **根因**：`concern_ignored` 事件判定过于激进（正常问诊被判为回避情绪），stuck 只涨不降（`question_answered` 在病史采集场景几乎不触发），导致 stuck 单向递增最终触发愤怒
- **衰减规则** (`event-mapping.js` V3)：连续 4 轮无 stuck 增长事件 → stuck -1/轮；连续 4 轮无 concern 增长事件 → concern -1/轮（底限 3）；遇冲突事件立即重置计数器
- **提示词修复** (`reflection-brain-prompt.txt`)：`concern_ignored` 定义新增否定示例（系统病史采集 ≠ 回避情绪）；规则 A 新增"系统问诊 ≠ 回避情绪"独立段落

### 文件变更

| 文件 | 变更 |
|------|------|
| `apps/admin/public/data/cases/PS-20260416-7D9E-meta.json` | 新建 — 补齐缺失的元数据（personality + atypical_dialogue） |
| `services/ai-generator/prompts/06-aisp/0602-sp-atypical.txt` | 重写 — 疾病类型分叉 + MSE 8 维度注入 |
| `services/sp-api/src/index.js` | `atypicalConfig` fallback 加载 + `trustLevel` 0→5 |
| `services/sp-api/src/mental-engine.js` | `isNonPsychotic()` + `anxious` 状态路径 + `stateToEmotion` 修复 |
| `services/sp-api/src/prompt-builder.js` | 新增 MSE 占位符 + `anxious` 状态指令 |
| `services/sp-api/src/poc/event-mapping.js` | V3 stuck/concern 自然衰减规则 |
| `services/sp-api/src/poc/reflection-brain-prompt.txt` | `concern_ignored` 边界澄清 + 系统问诊规则 |

## 2026-07-09

### 病例编辑器 — 覆盖 Bug 修复

- **根因**：`acceptGenerated()` 中 `persistMeta()` 在加载新病例数据之前执行，导致 `formData.case_id` 仍指向旧病例，将新参数写入旧病例的 `basic.json`
- **修复**：调换执行顺序 — 先 `loadCaseDataFromFiles(caseId)` 更新 `formData`（含新 case_id），再 `persistMeta()` 写入正确的新病例文件
- **`simulateGenStep` caseId 逻辑修复**：basic 步骤使用 `formData.value.case_id || null`（替代硬编码 `null`），确保"重新生成"复用原 case_id，"新增病例"传 null 由服务端生成新 ID
- **`autoSaveMeta` 守卫强化**：新增 `isLoadingData` 和 `loading` 状态检查，防止数据加载期间误触发自动保存

### 训练端 — 操作记录与成绩报告修复

- **`loadRecordsFromServer` 合并策略**：从覆盖改为合并（`{ ...server, ...local }`），防止页面刷新后 localStorage 中尚未同步的最新记录丢失
- **`TrainingRecords.vue` caseId 修正**：使用 `props.caseId` 替代 `store.currentCase.id`，修复从其他页面传入 caseId 时记录列表展示为空的问题
- **精神检查成绩报告**：`tryRealScoring()` records 合并条件新增 `mentalExam`，修复精神检查站报告一直无法生成的问题
- **成绩报告数据校验**：新增 `hasAnyData` 检查，如所有考站均无训练数据则提前终止并提示用户，避免空数据请求评分接口
- **训练结束流程优化**：`ScoreReport.vue` 训练完成后调用 `clearActiveFlow()` 清除活跃训练标记，修复"检测到未完成的训练"弹窗反复出现
- **结束训练按钮行为变更**：`CaseList.vue` `handleSettle()` 改为立即关闭弹窗、清除活跃流程、后台异步结算，不再阻塞前端操作

## 2026-07-08

### 三版本架构实现

- **版本分支逻辑**：`appVersion` (1.0/2.0) 切换实际驱动训练流程和记录隔离，不再只是切换显示文字
- **1.0 模式**：仅病史采集，直接进入（跳过考站选择弹窗），训练记录独立标注"1.0版"
- **2.0 模式**：考站配置驱动 + "全流程训练"入口（6模块固定流程：病史采集→体格检查→辅助检查→诊断→治疗计划→病历书写）
- **`BUILTIN_STATIONS` 内置考站常量** (`packages/shared/src/station-constants.js`)：1.0 和全流程作为系统内置特殊考站，全局统一，机构不可配置
- **`trainingVersion` 字段**：store 新增，记录自动附带版本标记；`resetForNewSession` 重置为 null
- **训练记录版本筛选**：1.0 模式只显示 1.0 记录，2.0 模式显示 2.0 + 全流程记录
- **管理端训练记录**：考站列显示版本 badge（1.0版/全流程版），筛选器加版本选项
- **人力资源管理**：1.0 模式下不显示入口

### 全流程模式模块切换 — 状态保持修复

- **根因**：`useAISP.initLocalState()` 每次 `aisp.configure()` 执行 `messages.value = []` 清空消息；PhysicalExam 的 `onMounted` 缺少恢复逻辑
- **PhysicalExam 消息恢复**：`onMounted` 中 `aisp.configure()` 之后从 `trainingSession.physicalExam.messages` 恢复历史消息
- **导航前显式同步**：HistoryTaking / PhysicalExam / AncillaryTests 的 `onFlowStepClick` 增加 `sync*ToSession()` 调用，确保离开前数据已写入 trainingSession
- **TrainingLayout 过渡优化**：移除 `:key="$route.fullPath"`（消除不必要的组件强制销毁）+ 移除 `mode="out-in"`（消除过渡期间空白间隙，视觉上不再像"刷新页面"）

### 全流程模式模块切换 — 性能优化（缓存）

- **病例数据 sessionStorage 持久化** (`useCaseLoader.js`)：模块初始化从 sessionStorage 恢复缓存，每次加载后自动持久化，切换站时 0 网络请求
- **SP 会话按 mode 独立缓存** (`useAISP.js`)：`persistSessionInfo` 改为 map 结构（`caseId:mode` → sessionInfo），支持多考站各自保留会话
- **会话恢复加速** (`configure` 步骤 2.5)：创建新会话前先尝试 `POST /session/restore` 恢复已缓存会话（1 次 API 调用替代原来的 destroy + configure 共 2 次）
- **HistoryTaking 精确会话匹配**：`getCachedSessionInfo()` → `getCachedSessionByMode(caseId, mode)`，避免从错误的 mode 恢复会话

### 文件变更

| 文件 | 变更 |
|------|------|
| `apps/training/src/stores/training.js` | 新增 `trainingVersion` 字段；`addTrainingRecord` 自动附带版本；`getTrainingRecords` 无版本过滤（UI 层做） |
| `apps/training/src/views/CaseDetail.vue` | 版本分支逻辑：1.0 直进病史采集 / 2.0 考站选择 / 全流程 6 模块；`resetForNewSession` 后设 trainingVersion |
| `apps/training/src/views/TrainingRecords.vue` | 新增 `versionFilter` prop；版本标签显示 |
| `apps/training/src/views/history-taking/HistoryTaking.vue` | 1.0 模式适配（无流程导航、标题"1.0版 · 接诊病人站"、endStage 直跳评分）；`onFlowStepClick` 加 `syncMessagesToSession()`；`getCachedSessionByMode` 精确匹配 |
| `apps/training/src/views/physical-exam/PhysicalExam.vue` | `onFlowStepClick` 加 `syncExamToSession()`；`onMounted` 加 messages 恢复（根因修复） |
| `apps/training/src/views/ancillary-tests/AncillaryTests.vue` | `onFlowStepClick` 加 `syncAncillaryToSession()` |
| `apps/training/src/views/diagnosis/Diagnosis.vue` | `onFlowStepClick` 同步诊断数据到 trainingSession |
| `apps/training/src/views/treatment-plan/TreatmentPlan.vue` | `onFlowStepClick` 同步治疗计划到 trainingSession；`existingPlanContent` 兼容 `t.content` |
| `apps/training/src/views/medical-record/MedicalRecord.vue` | `onFlowStepClick` 同步病历文本到 trainingSession；`onMounted` 恢复 `recordText` |
| `apps/training/src/layouts/TrainingLayout.vue` | 移除 `:key="$route.fullPath"` + `mode="out-in"`（消除过渡空白间隙） |
| `apps/training/src/composables/useAISP.js` | `persistSessionInfo` 改为 map 结构；新增 `getCachedSessionByMode`；`configure` 新增步骤 2.5 会话恢复；导出 `getCachedSessionByMode` |
| `apps/training/src/composables/useCaseLoader.js` | 新增 sessionStorage 持久化：模块初始化恢复缓存 + `persistCache()` |
| `apps/admin/src/views/TrainingRecords.vue` | 考站列版本 badge；筛选器加版本选项 |
| `packages/shared/src/station-constants.js` | 新增 `BUILTIN_STATIONS`（1.0 / full-flow 内置考站定义） |

## 2026-07-07

### 操作记录与成绩报告分离架构

- **架构分离**：操作记录从报告中移除，独立存储为 `data/training-sessions/{caseId}/{sessionEpoch}.json`，报告仅引用 `sessionEpoch`
- **后端新增两个端点**：`POST /api/training/session-save` 实时持久化训练会话；`GET /api/training/session-data` 按 sessionEpoch 精确读取
- **实时会话落盘**：`saveTrainingSession()` 每次写入 localStorage 后同步 fetch `/api/training/session-save` 推送到服务端
- **报告文件命名变更**：`reports/{caseId}/{sessionEpoch}_{stationName}.json`（`sessionEpoch` 替代 `recordEpoch`，训练会话级聚合）
- **报告结构简化**：移除 `inputData` 字段，新增 `sessionEpoch` 引用，报告体积缩减 40-50%
- **`sessionEpoch` 机制**：`resetForNewSession()` 中生成 13 位毫秒时间戳，贯穿 session-save / settle / regenerate / session-data 全链路
- **训练记录合并**：`addTrainingRecord` 和 `getTrainingRecords` 按 `sessionEpoch` 合并同一训练会话的多个考站记录为一条
- **跨会话数据隔离**：`syncRecordsToLocal` 和 `loadSessionDataFromServer` 新增 `sessionEpoch` 过滤，防止分数和操作记录跨会话污染
- **`ScoreReport.vue` 重构**：删除 `applyReportInputDataToSession()` 和 `getRecordEpoch()`，改用 `sessionEpoch` 查找报告和加载操作记录
- **报告 API 精确匹配**：`/api/training/report` 删除 afterTs/timestamp 模糊匹配，严格按 sessionEpoch 查找，无匹配返回 404
- **regenerate 三阶段数据恢复**：会话文件（优先）→ 旧报告 inputData（兼容）→ 训练日志（兜底），从会话文件恢复 QA/自由文本/诊断/治疗/病历
- **分数回写 localStorage**：settle/regenerate/loadExistingReport 完成后自动更新训练记录的 score，确保 TrainingRecords 弹窗展示最新分数

### 1.0/2.0 版本分支 + 全流程训练模式

- **版本分支**：`CaseDetail.vue` 按 `store.appVersion` 切换训练模式 — 1.0 仅病史采集、2.0 自选单站、全流程多站串联
- **全流程训练按钮**：新增绿色"全流程训练"按钮，使用 `BUILTIN_STATIONS['full-flow']` 一键启动多考站串联训练
- **1.0 兼容**：病史采集结束直接跳转评分报告（无跨站导航），路由离开不弹确认框
- **单站流程**：`selectStation` 改为 `startStationFlow` 单站数组，非直接操作 flowIndex

### 考站视图全流程导航

- **跨站步骤条**：全流程模式下 TrainingTopBar 显示考站步骤导航 (`flow-steps`/`flow-step-index`)，标题统一为"临床思维模拟训练"
- **`onFlowStepClick`**：点击步骤条跳转考站，自动 `syncMessagesToSession` 保存当前站数据到 trainingSession
- **实时消息同步**：HistoryTaking/HumanisticComm 每轮 AI 回复后调用 `syncMessagesToSession()`，PhysicalExam 每次操作后调用 `syncExamToSession()`
- **全流程无阻断**：多站模式下路由离开不弹退出确认框，仅单站模式弹框
- **会话恢复增强**：PhysicalExam 全流程模式从 trainingSession 恢复历史检查操作；HistoryTaking 检测已有会话数据时跳过开场白

### 多考站评分表解析修复

- **根因**：跨站导航（`advanceToNextStation`）直接跳转视图，跳过 `StationLoading`，导致仅第一个考站的评分表被解析
- **`parseScoreSheetForSession` 全站遍历**：改为遍历 flow 中所有考站（而非仅当前站），收集合并全部模板绑定，一次性解析全部评分表并按 target 分发到 sessionStorage
- **记录映射 ID 兼容**：`tryRealScoring` 中 `def.id` 条件匹配新增 `caseAnalysis` / `humanisticComm`，`preliminaryDiag` 结构化对象支持
- **`primaryStationId` 旧 ID 兼容**：新增 `LEGACY_STATION_ID_MAP`（`analysis→caseAnalysis`, `humanity→humanisticComm`），兼容旧训练记录中的 stationId

### ScoreReport UI 增强

- **综合分析未生成提示**：单考站训练完成后显示蓝色提示卡片，说明需要至少 2 个不同类型考站才能生成跨站综合分析
- **分数实时回写**：`syncRecordsToLocal` 批量回写多考站分数到 localStorage，`syncRecordScoreToLocal` 单站分数回写

### score-analyzer 格式化兼容性增强

- **speaker/role 双字段兼容**：`formatDialogRecords`/`formatAllRecords` 新增 `user`/`sp`/`assistant` → 学员/患者/AI 标签映射，兼容训练会话消息使用 role 字段的场景
- **序列号自动填充**：`sequence` 缺失时使用 `index+1` 兜底，`formatAllRecords` 使用独立 `seqIdx` 计数器

### 文件变更

| 文件 | 变更 |
|------|------|
| `apps/training/src/stores/training.js` | `sessionEpoch` ref + `saveTrainingSession` 实时推送 + `loadSessionDataFromServer` + 记录合并/隔离 + `resetForNewSession`/`clearSession` epoch 管理 |
| `apps/training/src/views/ScoreReport.vue` | 删除 `applyReportInputDataToSession`/`getRecordEpoch`；sessionEpoch 查找报告；旧 ID 兼容；综合分析未生成提示；分数回写 localStorage |
| `apps/training/src/views/StationLoading.vue` | `parseScoreSheetForSession` 全站遍历合并绑定；删除死代码 |
| `apps/training/src/views/CaseDetail.vue` | 1.0/2.0 版本分支 + 全流程训练按钮 + 单站流程 + sessionEpoch 传递 |
| `apps/training/src/views/history-taking/HistoryTaking.vue` | 全流程步骤导航 + `syncMessagesToSession` + 1.0 直接跳报告 + 会话恢复增强 |
| `apps/training/src/views/physical-exam/PhysicalExam.vue` | 全流程步骤导航 + `syncExamToSession` + 全流程恢复历史检查 |
| `apps/training/src/views/humanistic-comm/HumanisticComm.vue` | `syncMessagesToSession` 实时落盘 |
| `services/sp-api/src/index.js` | session-save/session-data 端点 + settle/regenerate sessionEpoch + regenerate 三阶段恢复 + report sessionEpoch 精确匹配 + preliminaryDiag 结构化 |
| `services/score-analyzer/src/index.js` | speaker/role 双字段兼容 + 序列号自动填充 |

## 2026-07-05

### 报告精确匹配修复 — epoch 一致性

- **关键 Bug**：训练记录 key 用 `Date.now()` 生成 epoch，但 settle/regenerate/report 各环节用 `recordedAt`(ISO) 反向 `new Date(ISO).getTime()` 算出 epoch。两次 `Date` 调用相差 1-2ms，导致精确文件名匹配失败 → 所有记录都找不到对应报告
- **`addTrainingRecord` 存储 `ts` 字段**：记录对象新增 `ts`(epoch) 字段，与 key 中的 epoch 完全一致
- **`ScoreReport.vue` 新增 `getRecordEpoch()` 辅助函数**：提取 epoch 的优先级链 — `ts` 字段 → key 末段解析 → recordedAt 转换 → Date.now()
- **`tryRealScoring` settleKey**：从 `new Date(recordedAt).getTime()` 改为 `getRecordEpoch()`
- **`loadExistingReport` afterTs**：从 `recordedAt`(ISO) 改为 epoch 字符串
- **`regenerateReport` settleKey**：新增 `settleKey`(epoch) 参数
- **后端 `afterTs` 双格式兼容**：`/api/training/report` 同时接受 13 位 epoch 和 ISO 字符串
- **后端 regenerate `settleKey` 优先级**：`body.settleKey`(epoch) > `recordedAt`(ISO转换) > `Date.now()`
- **旧报告全部清除重新生成**：`reports/` 目录清空，sp-api 重启

### P0 安全修复 — 路径遍历防护

- **`sanitizeId()`**：剥离 `[^a-zA-Z0-9_\-\.@]` 并拦截 `..` 路径遍历，应用于 sp-api 所有接受用户输入 ID 的路由（caseId, stationId, module 等）
- **`safeJoin()`**：安全路径拼接，resolve 后校验未脱离 baseDir
- **case-loader `loadCaseData` 双重防护**：sanitizeId 即使被绕过，safeJoin 作为第二层防御
- 受影响端点：`/api/training/settle`, `/api/training/regenerate`, `/api/training/configure`, `/api/training/report`, `/api/training/materials`

### P0 数据完整性修复 — profile 覆盖

- **`stationProfileMap`**：settle 中新增按 stationId 索引的 profile 映射，修复多考站并行评分时后站 profile 覆盖前站的问题（原 `profileReports` 仅按 profileType 索引，同名类型覆盖）

### P1 性能优化 — 并行评分

- **`Promise.allSettled` 并行评分**：settle 中串行 `for` 循环改为 `Promise.allSettled`，多考站 AI 评分请求并发执行
- **score-analyzer 静态 import**：24 处 `const { callLLM } = await import('./llm-client.js')` 替换为单次顶层 `import { callLLM } from './llm-client.js'`

### P2 代码去重 — 共享常量抽取

- **`STATION_TO_SESSION_KEY`**：training store + ScoreReport 中重复定义的 8 条目映射统一引用 `@ai-sp/shared`
- **`STATION_ID_TO_LABEL` / `getStationLabel()`**：training store 中的 10 条目映射迁移到共享层
- **`PROJECT_TAB_CONFIG`**：ScoreReport 内联的 7 条目项目标签配置迁移到共享层
- **`getReportLookupPrefixes()`**：报告查找的前缀匹配逻辑统一到共享常量
- **`safeStringify()` 循环引用防御**：training store 的 `addTrainingRecord` 使用 WeakSet 安全序列化，防御训练数据中的循环引用

### P3 健壮性 — `parseTs()` epoch 格式修复

- **sp-api `parseTs()`**：新增 13 位 epoch 毫秒格式检测 (`/^\d{13}$/.test(tsStr)`)，匹配 `Date.now()` 生成的 key 格式

### 文件变更

| 文件 | 变更 |
|------|------|
| `services/sp-api/src/index.js` | +40/-15: sanitizeId/safeJoin + 并行评分 + profile 覆盖修复 + afterTs 双格式 + settleKey 优先级 |
| `services/sp-api/src/case-loader.js` | +9: sanitizeId 双重防护 |
| `apps/training/src/views/ScoreReport.vue` | +15/-10: getRecordEpoch + epoch 一致性修复 |
| `apps/training/src/stores/training.js` | +10/-8: safeStringify + ts 字段 + 共享常量引用 |
| `packages/shared/src/station-constants.js` | 新增: 统一考站常量 |
| `services/score-analyzer/src/index.js` | +3/-24: 静态 import |

## 2026-07-02

### 成绩报告关键 Bug 修复 — 缓存/重新生成/操作记录

- **删除 sessionStorage 缓存**（根因修复）：`ScoreReport.vue` 删除 `aisp_report_cache_*` 读写逻辑，该缓存以 `caseId+stationId` 为 key，导致同一病例同一考站的多次训练都返回同一份旧报告，settle API 从未被调用，报告文件从未落盘
- **"重新生成"按钮修复**：训练端按钮从调用 `tryRealScoring()`（走 `/api/training/settle`，需要 trainingSession 中的原始数据）改为调用 `regenerateReport()`（走 `/api/training/regenerate`，从已有报告 inputData 或训练日志恢复数据重新评分）
- **View mode 操作记录显示修复**：新增 `applyReportInputDataToSession()` 函数，将报告文件中的 `inputData.allRecords` 还原为 `trainingSession` 格式（dialog→historyTaking/humanisticComm, exam→physicalExam, qa→caseAnalysis, freeText→preliminaryDiag/treatmentPlan/medicalRecord），确保从训练记录查看已有报告时操作记录 tab 有数据
- **`rebuildSessionFromRecords` 合并策略**：从硬拦截（已有 trainingSession 则直接返回）改为增量合并（已有 key 保留，缺失 key 从记录 rawData 补齐），解决跨病例/跨考站查看时 trainingSession 残留错误数据问题
- **`loadExistingReport` 自动降级重新生成**：当报告文件不存在（404）或网络异常时，自动调用 `regenerateReport()`，用户无需手动点"重新生成"。同时修复报告不存在时 `reportAssessmentData` 为 null 导致 body 空白的 bug

### 训练记录与成绩报告分离 — 不可变原始数据 + 独立派生报告

- **训练记录不可变**：`CaseDetail.vue` 和 `ScoreReport.vue` 删除 settle 后写回训练记录的 `addTrainingRecord()` 调用，训练记录 score 保持 0（原始数据标记），成绩报告作为独立派生数据存储
- **只读报告模式**：`ScoreReport.vue` 新增 `isViewMode`（`route.query.source === 'records'`），view 模式下调用 `GET /api/training/report` 读取已保存报告，不触发 AI 评分
- **显式重新生成**：view 模式新增"重新生成"按钮，仅用户主动点击时调用 `POST /api/training/regenerate`，新报告覆盖旧文件，训练记录不变
- **7 个考站视图**：导航到 scoreReport 时 query 统一加 `source: 'training'`，区分训练完成 vs 记录查看
- **训练端 + App训练端 localStorage 隔离**：`app-training` store key 从 `'training_records'` 改为 `'app_training_records'`，避免互相污染

### 前后端硬数据门槛移除

- **sp-api settle**：删除后端 `dialogUserTurns >= 3 || examOps >= 2 || qaWithContent >= 1 || freeTextChars >= 50` 预检查（原 1004-1014 行），不再跳过数据少的考站
- **ScoreReport.vue**：删除前端 3 轮对话阈值快速预检（原 1150-1162 行），不再以 `scoringState = 'insufficient'` 阻塞报告展示
- **数据不足策略修正**：从"拒绝评分"改为"报告内声明" — 评分完成后将 `data_limitations`（可评估维度/有限维度/说明）注入 `comprehensive_evaluation.integration`

### 评分表解析修复 — items 嵌套结构

- **formatParsedScoreSheet**：存储格式为 `[{ templateCode, templateName, items: [...] }]`，原函数期望扁平 entry，导致所有条目 `category`/`item`/`score` 均为 `undefined`。重写为 `entry.items` 扁平化，字段名修正为 `max_score ?? score`
- LLM 评分首次收到完整的评分表条目名称和分值

### 操作记录标签页动态化

- **op-sub-bar 动态渲染**：从硬编码 5 个按钮（病史采集/体格检查/初步诊断/治疗计划/病历书写）改为 `v-for` 遍历 `opTabs` computed，基于考站配置 `stationProjects` 动态生成
- **7 种项目类型全支持**：`PROJECT_TAB_CONFIG` 映射病史采集→dialog / 体格检查→exam / 初步诊断→diagnosis / 治疗计划→treatment / 病历书写→record / 病例分析→analysis / 人文沟通→humanity
- **内容区类型驱动**：按 `activeOpTab.type` 分发渲染（dialog 对话表 / exam 检查表 / diagnosis 诊断卡 / treatment 治疗卡 / record 文书卡 / analysis QA卡 / humanity 角色分列表）
- **自动回退**：未知考站结构时显示全部 5 个按钮（向后兼容）

### score-unified.txt 提示词对齐设计文档

- **角色升级**：从"OSCE评分考官"改为"临床医学教育考官"，从有限行为推断思维方式和能力水平
- **移除阻塞路径**：删除"步骤一：数据充分性校验"及 `data_sufficient: false` 输出路径，始终执行评分
- **新增 data_limitations 输出**：当记录确实极少时，声明 `assessable_dimensions`/`limited_dimensions`/`narrative`，不阻止报告生成
- **评分哲学提升**：从"判断做了没有"改为"评估做得怎么样"（如 5 个同向症状 vs 3 个跨维度症状的策略分析）

### 报告 1:1 匹配修复

- **afterTs 精确匹配**：`/api/training/report` 接受 `afterTs` 参数，筛选报告文件时间戳 >= afterTs，无匹配时返回 404（不降级到最新）
- **记录 ID 保留**：`getTrainingRecords` 改为 `Object.entries().map(([key, val]) => ({ ...val, id: key }))`，记录 key 作为 `id` 字段传递
- **viewReport 传递 recordedAt**：`CaseDetail.vue` / `TrainingRecords.vue` 导航到 ScoreReport 时携带 `recordedAt` 参数

### 修复

- **所有训练记录显示同一报告**：afterTs 匹配 + 记录 ID 保留 + profileAnalysis 补充，三个 bug 联合导致
- **profileAnalysis 在 view 模式缺失**：`loadExistingReport()` 补充 `profileAnalysis.value = detail.profile || null`
- **STATION_ID_TO_TARGET TDZ 错误**：`const` 声明在 computed 之后，`watch(opTabs, { immediate: true })` 触发提前访问。移至 computed 之前
- **旧 analysis/humanity 模板残留**：删除动态化后重复的 `record.stationId === 'analysis'/'humanity'` 分支

### 文件变更

| 文件 | 变更 |
|------|------|
| `apps/training/src/views/ScoreReport.vue` | +120/-150 行：动态 opTabs + 数据不足策略 + view mode + 报告 1:1 匹配 + TDZ 修复 |
| `apps/training/src/views/CaseDetail.vue` | -7 行：删除 addTrainingRecord 写回 + query 加 source/recordedAt |
| `apps/training/src/stores/training.js` | +5/-3 行：getTrainingRecords 保留 key 为 id + 嵌入 rawData |
| `apps/training/src/views/TrainingRecords.vue` | +2 行：viewReport emit 加 source/recordedAt |
| `services/sp-api/src/index.js` | +10/-15 行：删除硬阈值 + dataLimitations 替代 dataInsufficient + 合并写替代覆盖写 |
| `services/score-analyzer/src/prompts/score-unified.txt` | 重写 ~70 行：角色升级 + 移除阻塞 + data_limitations + 评分哲学 |
| `services/score-analyzer/src/index.js` | +10 行：formatParsedScoreSheet 修复 items 嵌套 |
| `apps/app-training/src/stores/appTraining.js` | +1/-1 行：localStorage key 隔离 |
| 7 个考站视图 | 各 +1 行：导航 query 加 `source: 'training'` |

## 2026-07-01

### 成绩报告统一落盘 — 单一路径生成

- **唯一生成入口**：`POST /api/training/settle` 作为报告生成的唯一路径，废弃 5 个独立 API 端点（`score-session` / `analyze-profile` / `analyze-integration` / `analyze-stage` / `analyze-navigation`），score-analyzer 函数改为 settle/regenerate 内部直接调用
- **生成即落盘**：settle 同时写入两类文件 — 单站报告 `reports/{caseId}/{考站名}_{ts}.json` + 汇总报告 `reports/{caseId}/settle_{ts}.json`，不依赖浏览器缓存
- **训练端改造**：`ScoreReport.vue` `tryRealScoring()` 从串行 5 个 API 调用简化为单次 `POST /api/training/settle`，删除 sessionStorage/localStorage 缓存读写、`callScoringAPI`、`fetchProfileAnalysis`、`fetchIntegrationIfAvailable` 等废弃函数
- **多端一致**：训练端和训练端读写同一份磁盘文件，profile/integration/stage/navigation 数据完全相同

### 考站级报告 — 按考站（非考核项目）分组

- **考站合并**：`tryRealScoring` 按考站（如"接诊病人站"）合并多个考核项目（病史采集+体格检查）的评分表和操作记录，构建统一的 station-level 数据
- **Settle 多项目剖面**：剖面分析循环遍历 `st.projects[]` 而非单个 `st.stationId`，每个项目调用对应的剖面分析器，结果汇总到 `profileReports`
- **StationDetails 增强**：新增 `profiles` 字段收集考站内所有项目的剖面，供双端展示
- **Enriched-records 考站合并**：同一 `caseId + 考站名` 的多条项目记录合并为一条，分数和时长累加
- **报告文件名**：从英文项目 ID（如 `historyTaking_ts.json`）改为中文考站名（如 `接诊病人站_ts.json`）

### 中文考站名兼容

- **正则修复**：enriched-records 文件名正则从 `([a-zA-Z]+)` 改为 `(.+?)`，支持中文考站名匹配
- **双向别名**：reportMap 同时注册中文考站名和英文项目 ID 两种 key，新老记录都能匹配到报告
- **双前缀查找**：`/api/training/report` 和 `/api/training/regenerate` 的文件查找同时尝试考站名和项目 ID 前缀
- **report/regenrate 端点**：接受任意格式的 stationType（项目ID 或考站名），自动翻译后查找

### 显示逻辑完全对齐

- **buildComprehensiveEvaluation 统一**：训练端和管理端使用完全相同的 Part B/C/D/A 合并逻辑，包括 profile→雷达图四维映射（coverage→组织效率/safety→临床推理/relationship→沟通技能/strategy→医学知识）
- **管理端补充雷达图更新**：`buildComprehensiveEvaluationForAdmin` 补齐了 profile→雷达图更新逻辑（此前缺少此映射，导致雷达图基线值差异）
- **pass/fail 判定统一**：两端都使用 `totalScore >= totalMax * 0.6` 比例判定
- **aiPraise 阈值统一**：0.9/0.85/0.8/0.7/0.6 五档评价

### 修复

- **hasReport 始终为空**：移除 enriched-records 中 1 小时时间窗口限制，改为纯文件存在检测
- **管理端 profile 来源**：`displayReport` 优先使用 `report.profile`（考站专属剖面），而非 `profileReports[0]`（可能为其他考站剖面）
- **雷达图标签**：补全 `dimLabelMap`（安全/推理/技能/沟通/专业），两端注释格式一致
- **sp-api 启动**：使用 `node --env-file=.env` 加载 API key，修复 regenerate 503 错误

### 文件变更

| 文件 | 变更 |
|------|------|
| `services/sp-api/src/index.js` | +470/-200 行：settle 强化 + enriched-records 考站合并 + 中文名兼容 + 废弃 5 端点 |
| `apps/training/src/views/ScoreReport.vue` | +350/-800 行：5 API → settle 单次调用 + 考站合并 + 删除废弃函数 |
| `apps/admin/src/views/TrainingRecords.vue` | +120/-60 行：buildComprehensiveEvaluation 对齐 + 雷达图 profile 映射 + pass/fail 比例判定 |
| `apps/training/src/composables/useStationFlow.js` | +10 行：PROJECT_TO_STATION_TARGET 导出 |

## 2026-06-27

### 管理端训练记录 — 真实数据接入 + 成绩报告重新生成

- **真实数据替换模拟数据**：`TrainingRecords.vue` 从 100% 模拟数据切换为读取 `data/training-records.json`（17条真实记录）+ `reports/` 目录（19个报告文件）
- **训练记录列表**：统计卡片（总记录/平均分/达标率/平均用时）、筛选栏（病例关键词/考站类型/日期范围）、分页表格
- **成绩报告抽屉**：与训练端 `ScoreReport.vue` 结构和样式完全一致（3栏头部 + 4选项卡 + 雷达图 + rowspan评分表 + 操作记录 + L1-L5剖面分析）
- **重新生成功能**：`POST /api/training/regenerate` 调用最新 LLM 配置 + 评分表模板 + 评分引擎 + 剖面分析器，完整走通四站五层评分管线
- **报告分数修正**：enriched-records 端点从报告文件读取真实 `total_score`，修复 training-records.json 中分数为0的问题

### SP-API 新增端点

- `GET /api/training/enriched-records` — 读取训练记录 + 病例元数据 + 报告匹配 + 统计聚合
- `GET /api/training/report?caseId=&stationType=&timestamp=` — 读取指定成绩报告 JSON
- `POST /api/training/regenerate` — 重新生成报告（训练日志恢复 → 病例加载 → 模板解析 → 评分 → 剖面分析 → 落盘）
- `POST /api/score-report/score-session` — 保存报告时增加 `inputData` 字段，支持未来无日志重新生成

### 文件变更

| 文件 | 变更 |
|------|------|
| `apps/admin/src/views/TrainingRecords.vue` | 重写 ~977 行：真实数据接入 + 报告抽屉匹配 ScoreReport.vue |
| `services/sp-api/src/index.js` | +340 行：3个新端点 + 报告分数读取 + inputData 保存 |
| `apps/admin/vite.config.js` | +2 行：`/api/training` + `/api/score-report` 代理到 SP-API |

## 2026-06-26

### Part B 病史采集剖面分析 — L1/L2/L3 三层认知评估

- **L1 信息覆盖分析**：LLM 逐项对照病例原文与学员对话，计算覆盖率，标注遗漏的高/中/低临床重要性信息点
- **L2 行为策略分析**：识别问诊策略类型（假设驱动/模板覆盖/随机跳跃），分析开放性问题占比、追问深度、序列逻辑性
- **L3 认知过程还原**：反推学员假设形成→演化→收窄的认知轨迹，检测确认偏误/锚定效应/过早关闭等5种认知偏误
- **三层流水线**：L1 先跑提供上下文摘要 → L2/L3 并行执行 → L3 可选 L2 结果增强（L2 置信度低时跳过增强）
- **剖面分析 API**：`POST /api/score-report/analyze-profile` 接收病例信息+对话记录，返回完整三层分析 JSON 并自动落盘
- **ScoreReport 剖面分析面板**：新增「剖面分析」选项卡，三个折叠面板（L1 覆盖热力图+遗漏清单 / L2 策略徽章+特征网格 / L3 假设时间线+偏误警告）
- **Fire-and-forget 调用**：评分完成后异步请求剖面分析，不阻塞评分结果展示

### Part B 体格检查剖面分析 — L1/L2/L3 检查策略与认知关联

- **L1 检查覆盖分析**：从病例体征发现反推应检查项目，逐条对照学员操作记录（覆盖/部分/遗漏），按生命体征/一般状态/头颈/心肺/腹部/四肢脊柱/神经系统七系统分类
- **L2 检查策略分析**：识别检查组织策略类型（系统驱动/假设驱动/区域导向/随机），分析视触叩听覆盖度、检查深度、序列逻辑性
- **L3 认知关联分析**：检查选择是否由病史假设驱动，检查发现如何反作用于诊断假设（证实/排除/新假设），检测满足性停止（satisfaction_of_search）等体格检查特有认知偏误
- **API 路由扩展**：`/api/score-report/analyze-profile` 新增 `physical_exam` 类型，接收 examRecords（操作指令+系统反馈）

### Part B 人文沟通剖面分析 — L1/L2/L3 沟通策略与认知适应

- **L1 沟通覆盖分析**：评估学员对SP显性疑问/隐性情绪需求/信息需求的覆盖情况，区分"回应了"和"有效回应了"
- **L2 沟通策略分析**：识别沟通策略类型（共情驱动/信息倾倒/回避/框架切换），分析共情回应率、通俗语言使用、主动倾听信号、收尾质量
- **L3 沟通认知过程**：追踪沟通策略形成与适应（初始取向→情绪信号识别→策略切换），分析冲突处理（触发→降级策略→效果），检测共情盲视/术语壁垒/虚假安抚等5种沟通特有偏误
- **场景数据支持**：可选传入SP疑问清单+心理阶段作为分析参照（`scenarioData` 字段）
- **API 路由扩展**：新增 `communication` 类型，ScoreReport 自动从 trainingSession 提取场景数据

### 端到端验证

- 病史采集 16 轮测试：L1 80%覆盖率，L2 模板覆盖型，L3 3个偏误（确认/锚定/过早关闭）
- 体格检查 5 轮测试：L1 25%覆盖率（少量检查），L2 区域导向型策略，L3 2个偏误
- 人文沟通 6 轮测试：L1 60%覆盖率，L2 info_dumping 策略，L3 rigid 适应质量，4个偏误

### 文件变更

| 文件 | 变更 |
|------|------|
| `services/score-analyzer/src/prompts/partb-l1-coverage.txt` | 新增 ~80 行：病史采集 L1 覆盖分析 |
| `services/score-analyzer/src/prompts/partb-l2-strategy.txt` | 新增 ~60 行：病史采集 L2 策略分析 |
| `services/score-analyzer/src/prompts/partb-l3-cognition.txt` | 新增 ~100 行：病史采集 L3 认知过程 |
| `services/score-analyzer/src/prompts/partb-pe-l1-coverage.txt` | 新增 ~70 行：体格检查 L1 检查覆盖 |
| `services/score-analyzer/src/prompts/partb-pe-l2-strategy.txt` | 新增 ~55 行：体格检查 L2 检查策略 |
| `services/score-analyzer/src/prompts/partb-pe-l3-cognition.txt` | 新增 ~75 行：体格检查 L3 认知关联 |
| `services/score-analyzer/src/prompts/partb-hc-l1-coverage.txt` | 新增 ~75 行：人文沟通 L1 沟通覆盖 |
| `services/score-analyzer/src/prompts/partb-hc-l2-strategy.txt` | 新增 ~65 行：人文沟通 L2 沟通策略 |
| `services/score-analyzer/src/prompts/partb-hc-l3-cognition.txt` | 新增 ~80 行：人文沟通 L3 认知适应 |
| `services/score-analyzer/src/index.js` | +220 行：6个分析函数 + analyzePhysicalExamProfile + analyzeHumanisticCommProfile + formatScenarioData |
| `services/sp-api/src/index.js` | +60 行：physical_exam + communication 路由 + scenarioData 传入 |
| `apps/training/src/views/ScoreReport.vue` | +30 行：fetchProfileAnalysis 多类型支持 + scenarioData 提取 |

### Part B 病例分析剖面分析 — L1/L2/L3 临床推理评估

- **L1 分析覆盖**：从病例信息提取关键分析点（核心诊断/鉴别诊断/诊断依据/进一步检查/治疗原则），逐条对照学员问答判断覆盖和准确性
- **L2 分析策略**：识别推理策略类型（系统鉴别/模式识别/直觉跳跃/模板填充），分析鉴别广度、证据使用质量、推理链完整性
- **L3 临床推理**：反推诊断锚定过程、推理路径（正向/反向/混合）、鉴别诊断质量，检测确认偏误/锚定效应/基础率忽视等5种偏误
- **记录格式**：QA 对 `{question, answer}`，通过 `formatQARecords` 格式化

### Part B 病历书写剖面分析 — L1/L2 结构化评估

- **L1 病历完整性**：对照病例信息检查病历九大模块（一般项目/主诉/现病史/既往史/体格检查/辅助检查/诊断/治疗计划等）的覆盖和准确性
- **L2 书写策略**：识别结构策略类型（SOAP结构/时序叙述/问题导向/松散型），分析格式规范性、信息层次、语言专业性、简洁度
- **设计深度 L2**：按设计文档，病历书写最大深度为 L2（信息整合与结构化），L3 返回 null
- **记录格式**：纯文本病历，通过 `formatMedicalRecord` 透传

### Part B 精神检查剖面分析 — L1/L2/L3 MSE评估

- **L1 MSE覆盖**：从8大MSE维度（一般表现/言语/思维形式/思维内容/情感/感知觉/认知/自知力）逐条对照对话记录，评估学员的精神状态检查系统性
- **L2 互动策略**：识别治疗性互动策略类型（治疗性参与/模板访谈/共谋/对抗），分析治疗关系建立、病理体验处理、安全性评估
- **L3 认知过程**：精神状态评估假设→MSE维度推进追踪→病理体验处理策略，检测诊断惯性/精神科锚定/安全忽视/正常化偏误/情感传染5种偏误
- **无前端UI站**：精神检查是分析时区分而非独立考站，通过 `specialty === '精神科'` 或 `profileType` 标签触发
- **记录格式**：对话记录（同病史采集），使用 `formatDialogRecords`

### 端到端验证（新增）

- 病例分析：覆盖率 20%，模板填充型策略，3个偏误
- 病历书写：覆盖率 11%，松散型结构，L3=null（符合设计）
- 精神检查：覆盖率 25%，模板访谈型策略，3个偏误

### 文件变更（新增）

| 文件 | 变更 |
|------|------|
| `services/score-analyzer/src/prompts/partb-ca-l1-coverage.txt` | 新增 ~70 行：病例分析 L1 覆盖分析 |
| `services/score-analyzer/src/prompts/partb-ca-l2-strategy.txt` | 新增 ~55 行：病例分析 L2 策略分析 |
| `services/score-analyzer/src/prompts/partb-ca-l3-cognition.txt` | 新增 ~65 行：病例分析 L3 认知过程 |
| `services/score-analyzer/src/prompts/partb-mr-l1-coverage.txt` | 新增 ~70 行：病历书写 L1 完整性 |
| `services/score-analyzer/src/prompts/partb-mr-l2-strategy.txt` | 新增 ~60 行：病历书写 L2 结构策略 |
| `services/score-analyzer/src/prompts/partb-me-l1-coverage.txt` | 新增 ~75 行：精神检查 L1 MSE覆盖 |
| `services/score-analyzer/src/prompts/partb-me-l2-strategy.txt` | 新增 ~65 行：精神检查 L2 互动策略 |
| `services/score-analyzer/src/prompts/partb-me-l3-cognition.txt` | 新增 ~70 行：精神检查 L3 认知过程 |
| `services/score-analyzer/src/index.js` | +200 行：9个分析函数 + formatQARecords + 3个统一入口 |
| `services/sp-api/src/index.js` | +70 行：case_analysis + medical_record + mental_exam 路由 |
| `apps/training/src/views/ScoreReport.vue` | +20 行：caseAnalysis + medicalRecord 目标支持 |

### Part B L4/L5 安全行为与关系质量分析

- **L4 安全行为分析**：通用提示词 `partb-l4-safety.txt`，按剖面类型参数化分析焦点——病史采集(红旗征象筛查)、体格检查(安全相关检查遗漏)、人文沟通(安全话题回避)、精神检查(自杀/暴力风险评估)、病例分析(高风险鉴别诊断遗漏)
- **L5 关系质量分析**：通用提示词 `partb-l5-relationship.txt`，仅对话类剖面(病史采集/人文沟通/精神检查)——评估情感线索识别、共情回应质量(substantive/superficial/missed)、关系弧线(building/maintained/distancing)
- **流水线扩展**：L3增强后 → L4||L5 并行执行，不阻塞评分展示
- **剖面适用性**：对话类剖面(病史采集/人文沟通/精神检查)=L4+L5；非对话剖面(体格检查/病例分析)=L4 only(relationship:null)；病历书写=无L4/L5
- **ScoreReport L4面板**：红旗征象筛查率进度条 + 安全模式徽章(主动筛查/被动反应/安全忽视) + 逐项红旗征象清单
- **ScoreReport L5面板**：情感线索回应率进度条 + 共情质量徽章(实质性/表面/无) + 关系弧线标签 + 逐条情感线索清单
- **综合评价消费**：mergeProfileEvaluation 将 L4 screening_rate → 雷达图 clinical_reasoning，L5 response_rate → communication_skills；安全/共情缺陷自动进入弱点和改进计划
- **端到端验证**：病史采集 9轮(L4 0/5安全筛查+L5 0/2情感回应)、体格检查 4轮(L4 安全数据返回+L5 null)、病例分析 2QA(L4 安全数据返回+L5 null)、病历书写(L4/L5 无字段)

### 文件变更（L4/L5）

| 文件 | 变更 |
|------|------|
| `services/score-analyzer/src/prompts/partb-l4-safety.txt` | 新增 ~80 行：通用 L4 安全行为分析 |
| `services/score-analyzer/src/prompts/partb-l5-relationship.txt` | 新增 ~80 行：通用 L5 关系质量分析 |
| `services/score-analyzer/src/index.js` | +70 行：analyzeSafety + analyzeRelationship + buildL3Summary + 5个入口扩展 |
| `apps/training/src/views/ScoreReport.vue` | +80 行模板 + 15 行 CSS：L4/L5 展示面板

### 评分表模板系统统一 — 多端共享同一数据源

- **问题**：管理端扩展模板(TPL-IM-01~TPL-IM-17)只存在于 `apps/admin/src/data/templates/`，训练端通过 `@ai-sp/shared/score-tables` 读取时找不到，静默回退到 `stationScoreTableBindings` 导致使用了错误的评分表。例如内科接诊病人站配置 TPL-IM-17(接诊病人站综合评分表)，实际却使用了 TPL-STD-7(病例分析评分表)
- **根因**：两套独立的模板注册表 — 管理端维护 25 个 JSON 模板，共享层只有 7 个 JS 构建的旧模板
- **统一方案**：
  - 25 个 JSON 模板文件移入 `packages/shared/data/score-tables/` 作为规范数据源(与病例数据同模式)
  - 共享层 `index.js` 导入所有 JSON 模板并注册，JSON 优先覆盖同名 JS 构建版本
  - `getTemplateFlatItems` 兼容 flat(items 数组)和 nested(categories 结构)两种格式，保留 id 字段
  - 新增管理员兼容导出：`SCORE_SHEET_TEMPLATES`/`TEMPLATES_BY_TYPE`/`TEMPLATES_BY_CODE`/`getTemplateItems`
  - 管理端 `apps/admin/src/data/templates/index.js` 改为从共享层重导出
  - 病历生成器 `score-sheet-generator.js` 从共享层导入 `templateV1` 替代直接 JSON 引用
  - 管理端 vite.config.js `@ai-sp/shared` alias 指向目录(与训练端对齐)，确保子路径解析正确
  - 所有 JSON 导入添加 `with { type: 'json' }` 属性以兼容 Node.js ESM 原生加载
- **结果**：`getTemplateFlatItems('TPL-IM-17')` 从返回空数组变为正确返回 20 条评分项

| 文件 | 变更 |
|------|------|
| `packages/shared/data/score-tables/*.json` | 新增 25 个 JSON 模板文件(从管理端复制) |
| `packages/shared/data/score-tables/index.js` | 重写：导入 25 JSON + 合并注册 + 兼容 flat/nested 格式 + 管理员导出 |
| `apps/admin/src/data/templates/index.js` | 重写：从共享层重导出 |
| `apps/admin/vite.config.js` | 新增 `@ai-sp/shared/score-tables` alias + 修正 `@ai-sp/shared` 指向目录 |
| `apps/admin/src/views/case-editor/score-sheet-generator.js` | 更新导入：`templateV1` from `@ai-sp/shared/score-tables`

## 2026-06-25

### 训练记录持久化修复 — 历史成绩不再丢失

- **训练记录追加模式**：`addTrainingRecord` key 从 `caseId_stationId` 改为 `caseId_stationId_timestamp`，每次训练追加新记录不再覆盖历史
- **删除旧记录清空逻辑**：`resetForNewSession` 不再删除该病例所有旧训练记录，只清除评分缓存和 trainingSession
- **训练记录按时间排序**：`getTrainingRecords` 按 `recordedAt` 倒序排列，最新记录在前
- **断点续训记录查找兼容**：`hasUnfinishedSession` 适配新 key 格式，通过 caseId+stationId 搜索而非精确 key 匹配

### 评分表解析可靠性提升 — 确保导航前完成

- **评分表解析改为 await**：`parseScoreSheetForSession` 不再 fire-and-forget，在 StationLoading 导航前等待解析完成（15s 超时保护），与 target 初始化工作并行执行
- **方案优先绑定**：`parseScoreSheetForSession` 优先从 `store.stationScheme` 中查找考站的 `scoreTables` 配置，方案未配置时回退到 `stationScoreTableBindings`
- **按 bindProjects 分发**：解析结果按考核项目分发到各 target 专属 sessionStorage key，每个考站片段只拿自己绑定的评分表
- **新增 `findStationInFlow`**：从 flow/scheme 中按站名查找站点获取 scoreTables 配置

### ScoreReport 错误提示增强

- fallback 横幅优先显示具体错误原因（评分表缺失 / 训练记录为空 / 缓存过期 / API 不可用 / 异常信息）
- `tryRealScoring` 在评分表缺失、训练记录为空时设置明确的中文错误提示
- `onMounted` 捕获异常时在 scoringError 中保留异常信息

### ScoreReport 显示数据修复 — 患者信息 + 操作按钮

- **患者信息 card 字段映射修复**：新增 `patientInfo` 计算属性兼容 `patient_info`（basic.json）和 `patient` 两种字段名，修复姓名/年龄/性别/职业全空的问题
- **病例ID兼容**：`c.case_id || c.id` 双字段回退，`c.chief_complaint || c.chiefComplaint` 兼容命名差异
- **操作按钮按考站方案过滤**：新增 `stationProjects` 计算属性，从 `store.stationScheme` 读取当前考站的 `projects` 列表，"治疗计划""病历书写"按钮仅在考站方案包含对应项目时显示（`stationProjects` 为 null 时向后兼容显示全部）

### AI 评分对话记录格式化修复 — speaker/role 字段统一

- **`formatAllRecords` 兼容 role 字段**：training session 消息使用 `role`（user/sp/system），原格式化函数只认 `speaker`（doctor/patient/system），导致 LLM 提示词中所有标签显示 `undefined`，严重拉低评分质量
- **新增 role→中文标签映射**：`user→学员`、`sp→患者`、`assistant→AI`
- **`formatExamRecords` 同步修复**：检查操作同样兼容 `speaker || role`
- **影响范围**：修复后 LLM 评分准确度应显著提升（此前 3 分极低分大概率由标签 `undefined` 污染导致）

### 文件变更

| 文件 | 变更 |
|------|------|
| `apps/training/src/stores/training.js` | addTrainingRecord key 加时间戳 + resetForNewSession 删旧记录逻辑移除 + getTrainingRecords 排序 + hasUnfinishedSession 适配新 key |
| `apps/training/src/views/StationLoading.vue` | parseScoreSheetForSession await + 15s 超时 + findStationInFlow + 方案优先绑定 + 按 bindProjects 分发 |
| `apps/training/src/views/ScoreReport.vue` | fallback 横幅显示 scoringError + patientInfo 计算属性 + stationProjects 过滤按钮 + 字段兼容 + 错误提示 |
| `services/score-analyzer/src/index.js` | formatAllRecords + formatExamRecords 兼容 speaker/role 双字段 |

### 评分表分发修复 — 按考核项目精确绑定

- **评分表按 bindProjects 分发**：`parseScoreSheetForSession` 解析完成后，根据 `stationScoreTableBindings` 的 `bindProjects` 将每个模板分发到对应 target 的 sessionStorage key（如 `_historyTaking` / `_physicalExam` / `_preliminaryDiag`），每个考站片段只拿自己绑定的评分表
- **删除回退过滤逻辑**：移除 `ScoreReport.vue` 中的 `TARGET_TEMPLATE_CODES` 硬编码常量 + 通用 key 回退逻辑，评分表读取改为严格按 target 专属 key
- **替换综合评分表**：内科活跃方案 `res-inst-1781375654191` 的接诊病人站 `TPL-IM-17`（三项目共用）→ `TPL-STD` / `TPL-STD-2` / `TPL-STD-7`（各自绑定 病史采集 / 体格检查 / 初步诊断）
- **考站名称动态化**：6 个考站 `endStage` 中 `stationName` 从硬编码改为 `flowCtx.stationName` 动态获取，不再出现与实际考站不一致的记录
- **异步方案刷新保护**：`loadStations()` 异步刷新时检查 `store.trainingSession`，训练进行中跳过刷新避免流程跳转错乱
- **清理无用字段**：删除所有 `project.score` 字段（edits.json 243 处 + residency.js 工厂函数 + StationSettings.vue UI + score-sheet-generator.js 死代码 `mapPointsToStations`/`normalizeScores`/`PROJECT_TO_DOMAIN`）
- **清理训练记录**：`data/training-records.json` 置空，清除旧跨站污染记录

### 文件变更

| 文件 | 变更 |
|------|------|
| `apps/training/src/views/StationLoading.vue` | 重写分发逻辑：按 bindProjects → PROJECT_TO_STATION_TARGET → 各 target 专属 key |
| `apps/training/src/views/ScoreReport.vue` | 删除 TARGET_TEMPLATE_CODES + 通用 key 回退，只读 target 专属 key |
| `apps/training/src/composables/useStationFlow.js` | 新增 PROJECT_TO_STATION_TARGET + 训练中跳过异步刷新 + 保留 scoreTables |
| `apps/training/src/views/history-taking/HistoryTaking.vue` | stationName → flowCtx.stationName |
| `apps/training/src/views/physical-exam/PhysicalExam.vue` | 同上 |
| `apps/training/src/views/humanistic-comm/HumanisticComm.vue` | 同上 |
| `apps/training/src/views/preliminary-diag/PreliminaryDiag.vue` | 同上 |
| `apps/training/src/views/treatment-plan/TreatmentPlan.vue` | 同上 |
| `apps/training/src/views/medical-record/MedicalRecord.vue` | 同上 |
| `packages/shared/data/station-schemes-edits.json` | TPL-IM-17 → TPL-STD/TPL-STD-2/TPL-STD-7 + 删除所有 score 字段 |
| `packages/shared/data/station-schemes/residency.js` | 删除所有 score: 字段 |
| `apps/admin/src/views/StationSettings.vue` | projectCandidates 对象→字符串，删除 score 字段 |
| `apps/admin/src/views/case-editor/score-sheet-generator.js` | 删除死代码 mapPointsToStations/normalizeScores/PROJECT_TO_DOMAIN |
| `data/training-records.json` | 清空旧记录 |

## 2026-06-24

### 全考站 AI 评分系统 + 成绩报告落盘

- **全考站评分架构** (`services/score-analyzer`)：Part B 逐项评分引擎，支持对话记录/体格检查/病例分析/自由文本统一格式输入
- **多表分表评分**：`stationScoreTableBindings` 自由组合模板，接诊病人站支持多张评分表并行独立评分（`Promise.allSettled`）
- **评分 API 合并到 sp-api (5100)**：3 条 Vite 中间件路由（~150行）迁移为 sp-api 原生路由 + 训练端 proxy 3 行配置
- **成绩报告自动落盘**：每次评分成功后自动保存完整 JSON 到 `reports/{caseId}/{stationType}_{timestamp}.json`（含评分结果/病例信息/评分模板）
- **缓存双写**：评分结果同时写入 sessionStorage + localStorage，训练记录关闭重开不再重复评分
- **训练记录回写**：评分成功后自动更新 localStorage 中训练记录的真实分数（不再一直显示 0 分）

### 训练端成绩报告修复（审计 19 个 bug 全部修复）

- **CRITICAL × 3**：
  - ScoreReport `sheetGroups: merged` 引用未定义变量 → 页面崩溃
  - `onMounted` 缺 try-catch → 任一异常白屏
  - 6 个考站 `endStage` 未设 `store.currentRecord` → 成绩报告拿不到站信息
- **HIGH × 6**：CaseAnalysis/CaseDetail 导航缺 caseId + 缺 ensureStationIndex + fallback 缺 id + TARGET_TO_STATION_NAME 缺站 + 旧格式扁平数组兼容
- **MEDIUM × 3**：aiPraise 双语化 + `sequence ||` → `??`（6 处）+ sp-api 路由 query string 处理
- **LOW × 4**：formatExamRecords 死变量 + store 持久化 currentCase/currentRecord + formatAllRecords 保留 type 字段

### 训练流程修复

- 训练结束正确跳转 `scoreReport`（6 个站全改，此前错跳 `caseDetail`）
- `store.currentCase` / `store.currentRecord` 在 6 站 endStage 中完整赋值
- 站间导航强制单向 + 浏览器后退触发退出确认
- StationLoading 分步加载进度条：数据/推理/就绪三阶段

### 文件变更

| 文件 | 变更 |
|------|------|
| `services/score-analyzer/` | 新增：Part B 评分引擎 + LLM 客户端 + 提示词模板 |
| `services/sp-api/src/index.js` | +120行：3 条评分路由 + 报告落盘 + query string 兼容 |
| `apps/training/vite.config.js` | -154行：3 个 Vite 插件 → 6 行 proxy |
| `apps/training/src/views/ScoreReport.vue` | ~200行修改：多表评分 + 缓存双写 + try-catch + aiPraise 双语 + nullish coalescing |
| `apps/training/src/views/StationLoading.vue` | 重写 `parseScoreSheetForSession`：单表合并 → 分表解析 |
| `apps/training/src/views/history-taking/HistoryTaking.vue` | endStage 补全 currentRecord + 跳转 scoreReport |
| `apps/training/src/views/physical-exam/PhysicalExam.vue` | 同上 |
| `apps/training/src/views/preliminary-diag/PreliminaryDiag.vue` | 同上 |
| `apps/training/src/views/treatment-plan/TreatmentPlan.vue` | 同上 |
| `apps/training/src/views/medical-record/MedicalRecord.vue` | 同上 |
| `apps/training/src/views/humanistic-comm/HumanisticComm.vue` | 同上 |
| `apps/training/src/views/case-analysis/CaseAnalysis.vue` | ensureStationIndex + 导航 caseId + fallback id |
| `apps/training/src/views/CaseDetail.vue` | 查看报告导航缺 caseId |
| `apps/training/src/stores/training.js` | 持久化 currentCase/currentRecord + watch 自动保存 |
| `services/score-analyzer/src/index.js` | formatExamRecords 清理 + formatAllRecords 保留 type |
| `packages/shared/src/score-sheet-parser.js` | 纯函数解析器（病例锚定子项展开） |
| `packages/shared/data/score-tables/index.js` | stationScoreTableBindings 自由组合表 |
| `.gitignore` | +reports/ |

## 2026-06-22

### 体格检查 LLM 主路径 + 专业注册表 + 离线浏览

- **体格检查 LLM 驱动**：识别/反馈全面由 LLM 负责，替代硬编码规则匹配
- **专业 ID 统一注册表**：14 专业标准化 ID 映射
- **sendSPMessage 排队机制**：防止并发消息导致的竞态条件
- **离线浏览模式**：网络断开时优雅降级，不阻塞页面
- **跨端链接智能降级**：目标端不可用时显示说明而非白屏
- **五端 base 路径统一为 `/`**：训练端生产构建不再使用 `/training/` 前缀
- **三端 stationSchemesPersist 插件统一**：`/api/station-schemes-edits` 接口标准化
- **新增 NE-20260416-7C9E 病例**：六模块完整 JSON

### 文件变更

| 文件 | 变更 |
|------|------|
| `services/sp-api/src/index.js` | sendSPMessage 排队机制 |
| `apps/training/vite.config.js` | base 路径修正 + stationSchemesPersist 插件 |
| `apps/exam/vite.config.js` | stationSchemesPersist 插件 |
| `apps/admin/vite.config.js` | stationSchemesPersist 插件 |
| `apps/training/src/composables/useStationFlow.js` | 站间导航强制单向 + 退出确认 |
| `apps/admin/public/data/cases/NE-20260416-7C9E-*/` | 新增病例 JSON × 6 |

## 2026-06-18

### 训练端人文沟通站 — 面板重构 + 阶段情绪标签 + TTS开场优化

- **FloatInfoPanel 场景信息重构**：移除沟通场景/场景描述（SP材料），改为显示考生材料（`candidate_materials`）：临床情境、沟通任务、备注（有则显示）
- **心理阶段指示器修复**：`s.emotion` 内部键名（`anxiety_fear`、`minimization_denial` 等7个snake_case值）映射为中文标签，中文原文则透传
- **开场白 TTS 延迟优化**：`tts.configureVoice()` 改为与 LLM 调用（`buildSymptomPool` + `configure`）并行执行，原串行等待 4-10 秒 → 语音就绪即播
- **病例编辑器防御**：管理端/运营端 `Humanity.vue` 评分标准 `criteria` 缺失时不再崩溃（可选链兜底）

## 2026-06-17

### 情绪系统 v8.1 — 三速架构 + 辱骂防御体系

- **三速架构确立**：
  - **知觉脑（LLM，同步）**：输出 `anger_delta`（变化量，-3~+5），LLM扮演SP自然知道"这轮让我更生气了还是消气了"
  - **阻尼器（机械，即时）**："开门无阻，关门有阻"——上升自由（`rise(delta)` 直接加），下降有阻（`decay()` 机械减速，道歉-1.0 / 普通-0.3）
  - **反思脑（LLM，异步）**：仅处理 CM（concern/trust/stuck）→ fear/sadness，与愤怒线完全解耦
- **anger_delta 替代绝对 anger 值**：LLM 输出变化量比绝对值稳定得多，避免"我是5分生气还是7分"的认知负担
- **辱骂多层防御体系** (`triggers.js` + `prompt-builder.js` + `index.js`)：
  - 第1层：关键词查表 `INSULT_PATTERNS`（~45词，含八婆/死八婆/王八蛋/傻逼/滚/去死/等）
  - 第2层：LLM `anger_delta >= 2` → `lastIntent='insult'`
  - 第3层：`justInsulted` 提示词硬覆盖策略（本轮关键词命中 → 禁止提问/描述症状/讨论病情，回复≤15字）
  - 第4层：阻尼器安全网（关键词命中但LLM delta=0时，至少+3）
- **愤怒惯性分级** (`prompt-builder.js`)：
  - `justInsulted`（本轮命中）→ 硬覆盖愤怒策略
  - `angerInertia`（上轮被骂本轮无关键词）→ 软惯性，允许LLM自行判断本轮意图（道歉/继续攻击）
- **`repairJSON()` 修复** (`emotion-engine.js`)：LLM输出 `"anger_delta": +3` 带加号导致JSON解析失败，新增正则去除 `+` 号
- **`classifyIntentByRule()` 简化** (`triggers.js`)：仅检测 empathy（对不起/抱歉等→快速降怒），offensive/insult 交给 LLM + 关键词
- **CM 高恐惧保护** (`index.js`)：bad news 场景 fear=high 时，中等愤怒(4-6)不覆盖 fear 状态标签
- **`lastIntent` 阈值修复**：`anger_delta >= 2` → insult（原为 `>= 5`，从未触发）

### 文件变更

| 文件 | 变更 |
|------|------|
| `services/sp-api/src/triggers.js` | +90行：INSULT_PATTERNS 47词 + EMPATHY_PATTERNS + detectInsultTrigger + classifyIntentByRule 简化 |
| `services/sp-api/src/poc/emotion-damper.js` | 重写：移除 applyIntent/setLevel，仅保留 rise()/decay()/getLevel() |
| `services/sp-api/src/prompt-builder.js` | +257行：justInsulted硬覆盖 + angerInertia + anger_delta OUTPUT_SCHEMA + angerLevel定性提示 |
| `services/sp-api/src/index.js` | +318行：anger_delta验证 + 阻尼器安全网 + CM高恐惧保护 + lastIntent阈值修复 |
| `packages/shared/src/emotion-engine.js` | repairJSON: 修复 LLM 输出 `+3` 加号 |

### 情绪系统 v8.2 — 11档体系 + 双脑调试面板V2

- **11档位系统** (`services/sp-api/src/poc/gear-system.js`)：
  - 完整档位：暴怒/愤怒/不满/焦虑/不安/退缩/消沉/防御/失望/配合/中立
  - **退出滞后** (hysteresis)：升档即时，降档需满足退出条件才允许（避免档位抖振）
  - `getGearAV(gear)`：每个档位 → 视听候选菜单 (video_action / voice_style / text_guide)
  - `gearToIntent(gear)`：档位 → 意图映射
  - 确定性验证：192/192 单元测试全部通过 (test-11gear.mjs + test-scenarios.mjs)
- **三速混动架构确立**：
  - **阻尼器 (ABS，快升慢降 0.3/轮)**：愤怒数值驱动，升门自由/降门有阻，无滞后
  - **反思脑 (车长，统一档位裁决)**：综合 CM 全貌 → 单一档位，有退出滞后
  - **知觉脑 (驾驶员，LLM)**：执行档位对应的视听策略
  - 优先级：阻尼器 > 反思脑 > 知觉脑（anger ≥ 1 立刻覆盖反思脑档位）
- **新增三个档位** (`prompt-builder.js`)：
  - 不安：说话犹豫、试探性提问
  - 消沉：情绪低落、提不起精神
  - 失望：曾信任医生，现在觉得被辜负了
- **场景初始化器** (`scene-initializer.js`)：按病例/场景自动设定 CM 初始值 + 情绪基线
- **性格提示词** (`personality-prompts.js`)：三种表达风格 (隐忍型/外放型/混合型) × 三种敏感度 × 三种豁达度
- **反思脑事件映射** (`event-mapping.js` 完善)：
  - `applyEventRound()`：连续回避递增、冲突修复、bad_news 振幅收窄
  - `initCM()` 含 trust_peak 追踪

### 情绪调试面板 V2 (`useEmotionDebugger.js`)

- **双脑面板**（实时刷新）：
  - 阻尼器面板：怒值决策前/后对比 + 蓄积进度条 + 阻尼档位
  - 反思脑面板：CM 网格 (trust/peak/concern/stuck/avoid/loss/badNews/unresolved) + 综合档位大字高亮
- **会话信息区**（可折叠）：病例/模式/场景/性格/开场白 + 一键复制纯文本
- **每轮对话日志增强**：
  - 档位过渡箭头（`中立→焦虑`，带 11 色标签）
  - 怒值 `pre→post↑/↓` + CM 数据 `t/c/s/a`
- **复制报告增强**：含档位过渡 + anger 前/后 + CM 快照
- **历史记录兼容**：旧日志无 gear/cm/damper 字段时优雅降级
- 雷达图压缩至 240×160 + 信任轴同行布局

### 后端 _debug 扩展 (`index.js`)

- `_debug.damper`：`{ preDecision, postDecision }`（决策前/后怒值）
- `_debug.cm`：`{ trust, trust_peak, concern, stuck_count, consecutive_avoidance, conflict_trust_loss, bad_news_triggered, unresolved_count }`
- 响应顶层新增 `trustLevel` 字段

### TTS 韵律配置

- `useTTS.js`：新增 `warm` (温和关切)、`flat` (平淡不带情绪) 两种 voice_style
- `patient-voice-config.json`：13 种 voice_style 的 emotionParams (rate/pitch/volume) 全部填充

### 修复

- 性格显示 `[object Object]`：personality 对象序列化补充 `expressiveness` 键名
- trustLevel 始终为 0：后端 API response 新增字段
- 档位与怒值延迟错位：`decideGear` 使用决策前怒值，debug 显示 pre→post
- `_debug.cm` 数据缺失：后端已完善，需重启服务生效

### 文件变更

| 文件 | 变更 |
|------|------|
| `services/sp-api/src/poc/gear-system.js` | 新增 ~250 行：11 档 decideGear + 退出滞后 + getGearAV + gearToIntent |
| `services/sp-api/src/poc/test-11gear.mjs` | 新增 ~400 行：131 个单元测试 |
| `services/sp-api/src/poc/test-scenarios.mjs` | 新增 ~500 行：61 个场景模拟测试 |
| `services/sp-api/src/poc/event-mapping.js` | 修改：initCM 含 trust_peak + 连续回避/冲突修复逻辑 |
| `services/sp-api/src/poc/derived-state.js` | 修改：衍生状态计算接入 CM 全貌 |
| `services/sp-api/src/poc/reflection-worker-poc.js` | 修改：反思脑输出对接统一档位 |
| `services/sp-api/src/poc/personality-prompts.js` | 新增 ~120 行：性格提示词生成 |
| `services/sp-api/src/poc/scene-initializer.js` | 新增 ~150 行：场景感知初始化 |
| `services/sp-api/src/index.js` | 修改 ~115 行：_debug 扩展 + trustLevel + damperPre/post |
| `services/sp-api/src/prompt-builder.js` | 修改 ~209 行：attitudeDesc 补全不安/消沉/失望 |
| `services/sp-api/src/session-store.js` | 修改 ~45 行：场景初始化器集成 |
| `apps/training/src/composables/useEmotionDebugger.js` | 重写 ~664 行：V2 双脑面板全文 |
| `apps/training/src/composables/useAISP.js` | 修改 ~48 行：caseMeta + debug 管道扩展 |
| `apps/training/src/composables/useTTS.js` | 修改：warm/flat voice_style |
| `apps/training/public/data/patient-voice-config.json` | 修改：13 种 emotionParams 填充 |
| `docs/design/aisp-core-design-philosophy.md` | 新增：三速混动架构设计文档 |

## 2026-06-15

### 成绩报告·综合评价 — 考官系统设计

- **设计文档** `docs/design/score-report-comprehensive-evaluation.md`：
  - 重新定位：从"报告生成器"升级为**临床综合技能考官系统**
  - 核心方法：逆向设计——先定义输出，再定义所需分析，最后定义所需输入
  - 五维通用能力模型：安全素养/临床推理/临床技能执行/沟通与关系/专业素养
  - 六种考核项目剖面：病史采集/体格检查/人文沟通/精神检查/病例分析/病历书写
  - 五阶段发展模型：知识驱动→规则驱动→模式驱动→情境适应→专家型
  - 三阶段分析流水线：剖面独立分析(可并行)→跨剖面整合→报告生成
  - 精神科/儿科独立维度解释框架
  - 精神检查作为独立剖面类型（内核与病史采集根本不同）
  - 关键约束：评分表为P2优先级（系统可在无评分表时运行）；LLM情绪/意图元数据为不可依赖
  - 输入物信任层级：对话记录 > 病例原文 > 评分表 > 类型标签 > 专业标签 > 情绪元数据
  - 分数信度评估 + 评分表匹配度评估两个独立模块

### 情绪系统 v8 — 接诊站/人文站完全分离 + LLM绝对值驱动

- **引擎重构 `emotion-engine.js`**：LLM输出绝对值，引擎退为刹车层
  - `constrainDrop` 配置项：指定哪些维度由引擎约束升降（人文站仅anger，接诊站三维全约束）
  - `emotionFloor` 配置项：场景决定的情绪最低值，LLM无法降到floor以下（人文站fear≥3, sadness≥3）
  - 不在constrainDrop内的维度：LLM值直接透传，引擎不干预
  - peakLock峰值锁定：anger≥9时冻结所有维度3轮
  - 连续noise≥3轮自动累积anger
- **场景差异化 `session-store.js`**：`detectScene()` 按mode返回不同参数
  - 人文站：constrainDrop=['anger'], maxRise.anger=1.0, emotionFloor={fear:3,sadness:3}
  - 接诊站：constrainDrop=['anger','fear','sadness'], emotionFloor全0
- **va/vs硬覆盖 `index.js`**：人文站非calm状态下，策略表video_action/voice_style覆盖LLM选择
- **OUTPUT_SCHEMA修复**：全部3处schema的emotion值从字面`0`改为`<0-10>`占位符，防止LLM照抄零值

### 人文沟通站专属提示词 `0604-humanity-chat.txt`

- H0: 场景前提（信任基础、延续性对话）
- H1: 意图重定义（offensive=回避疑问/拉回问诊模式）
- H2: 疑问驱动对话（按编号逐一推进）
- H3: 冲击性消息震惊反应（否认≠平静，text与emotion值必须一致）
- H4: 情绪基线（容忍度更高，好沟通有正面反馈）
- H5: 病史回答方式（延续性语境，非初次就诊）
- H6: 情绪危机处理（需2轮真诚共情才能平复）

### 前端增强

- **TTS语音指令 `useTTS.js`**：简化为1-2个核心声乐特征词
- **素材规则 `HumanisticComm.vue`**：母亲+幼儿场景使用患儿素材（母子同框）
- **调试面板 `useEmotionDebugger.js`**：信任轴指示器、voiceStyle/videoAction彩色标签、复制报告增强
- **`useAISP.js`**：返回voiceStyle到前端，debug日志记录videoAction/trustLevel

### 设计文档

- 新增 `docs/design/humanistic-comm-emotion-system-v8.md`：完整技术设计文档（架构总览、模块详解、数据流追踪、设计决策说明）

### 工程

- `launcher.mjs`：Node 20.6+ `--env-file=.env` 自动加载环境变量
- 病例数据更新 (OB-20250615-9C2K)

## 2026-06-12

### TTS 情绪语音合成 + 开场白重构

- **开场白模板化**：移除 LLM 生成开场白（`generateOpeningGreeting`），改为固定模板 `"医生，您赶紧给{自称}看看，{代词}这是怎么了？"`
  - 变量由 SP 角色（本人/家属）+ 患者性别推导，不调 LLM，零姓名泄露风险
  - 设计文档 `docs/sp-opening-greeting.md`
- **TTS 集成 Qwen3-TTS-Instruct-Flash-Realtime**：`useTTS.js` — 17 情绪状态→自然语言指令映射
  - WebSocket 代理：`services/sp-api/src/index.js` — 浏览器 → sp-api → DashScope，注入 API Key
  - PCM 16-bit 24000Hz → Web Audio API 播放
  - 对话页 TTS 开关按钮（输入栏音量图标）
- **提示词修复**：`0601-sp-system.txt` Rule #4 从"打招呼只打招呼"改为"首次对话开场白"，覆盖学生仅问候/直接问诊两种场景

## 2026-06-10

### 情绪引擎 v4.0 代码实现

- **`useAISP.js` 全新重写（1392行）**：对齐设计文档 v4.0 全部规范
  - `preUpdate()`：三步优先级循环（峰值保持→高位衰减→被动衰减），每维度独立处理
  - `applyLLMScore()`：deep_reassure 机制（大幅放宽衰减上限+强制释放峰值+重置终止计数器）、破冰机制（首次极端情绪+安抚意图一次性大降）、rapport 加速愤怒衰减、angryEverPeaked 愤怒乘数
  - `checkTermination()`：四路径终止判定（愤怒投诉/恐惧崩溃/悲伤崩溃/信任破裂）
  - `validateLLMOutput()`：LLM 输出校验（维度范围/意图合法性/deep_reassure 条件/一致性检查）
  - `getTTSParams()`：17 状态→自然语言指令映射 + 次要情绪叠加 + 性格修正 + break 时长表
  - `getVideoCommand()`：17→6 动作组映射 + 强度调制（playbackRate/shakeIntensity/swayAmplitude）
  - `buildSystemPrompt()`：健康信号灯/情绪趋势/angryEverPeaked 警告/stagnationCounter/极端状态/沉默检测
- **移除所有回退路径**：INTENT_PATTERNS / FALLBACK_EMOTION_DELTA / correctIntent / applyDecay / fallbackKeywordMatch / llmAvailable / tryReconnect
- **trust/rapport 量程改为 0-5**，新增 per-intent 更新表
- **视图层清理**：HistoryTaking / HumanisticComm / PhysicalExam 移除离线横幅和 llmAvailable 引用

## 2026-06-09

### 工程维护

- `patient_and_family` 清理：从 admin 端提示词/设计文档/存量病例数据中移除第三种沟通对象模式，统一为 `patient` / `family` 两种
  - `0201-prompt.txt`：删除 `patient_and_family` 选项和对应规则段（3处）
  - `0401-prompt.txt`：删除"多角色场景设计规则"章节，推断表修正为 `family`，章节重编号（5处）
  - `病例生成系统设计文档.md`：更新枚举描述和 sp_role 说明（2处）
  - 存量病例 JSON：`EM-*/ORT-*/SU-*` 三个文件的 `communication_target` 值修正为 `family`

## 2026-06-08

### 训练端 AISP 提示词系统设计（v2.2，16章）

- 设计文档 `docs/design/aisp-prompt-system-design.md`：16章完整设计方案，涵盖 SP 对话提示词体系
- **病史采集（接诊站）**：System Prompt A-F（SP身份/SP与真实病人差异/回答规则/信息释放/情绪引擎/内容表现分离）+ User Message G（病例个性化数据）+ H-I（每轮上下文），18项变量来源对照表
- **体格检查**：独立系统提示词（0603），不加载 SP 人设，客观报告式输出；关键词预处理直通（精确命中零LLM调用）；模糊指令归类匹配；问诊/体检模式切换机制
- **人文沟通站**：共用 0601 通用规则 + 人文站特有规则 H1-H6（场景目标优先/主动施压/心理阶段递进/不配合不降级/情绪即内容）；场景个性化数据 J 段 + 每轮上下文 K 段；28项变量来源对照表；场景数据模型（psychological_stages / emotion_progression_curve）
- **情绪引擎**：7维情绪向量→11种输出状态映射规则（含精确阈值）；学生意图分类→向量变化量表（6类意图每维±值）；敏感词触发叠加规则（5类场景）；自然衰减规则（3轮/5轮）；不配合态进出条件
- **情绪计算职责边界**：SP LLM 仅输出 `{"text":"..."}`，情绪向量完全由服务端状态机独立计算并附加到最终推送
- **对话生命周期**：会话初始化（SP首条消息规则/情绪基线映射）；上下文窗口管理（滑动窗口+摘要策略）；跨站状态传递规则（接诊→人文/接诊→临床思维）；LLM异常/状态机崩溃/前端交互异常/敏感内容postcheck全链路处理
- **多媒体素材系统**：`[ASSET:asset_id]` 标记协议；素材清单注入提示词；on_ask vs auto_show 两种出示模式；SP口语描述→系统自动推送素材卡片
- **数据兜底**：四级完整度光谱（A/B/C/D）；字段级/模块级逐项兜底策略；self_narration 实时 LLM 生成回退
- **评估层**：评分系统+病例分析评估另案设计，本文档聚焦 SP 对话
- **代码库一致性审计**：对比设计文档与工程实际，识别三层差距：数据模型不一致（humanity scenarios/scenes 字段名、meta 新旧格式、场景数据缺失字段）、核心文件缺失（06-aisp目录/情绪状态机/useAISP composable/postcheck过滤器）、架构定位偏差（ai-gen-plugin 是admin端而非训练端）

### 工程维护

- 停止跟踪 `.annotations.json`（已在 `.gitignore` 中但历史遗留），`git rm --cached` 移除
- `docs/WORKLOG.md`：记录 admin 端 `patient_and_family` 清理待办事项及残留位置

## 2026-06-04

### 检查素材模块（A+B阶段）
- 新增 `MaterialsEditor.vue` 素材编辑器组件，作为病例编辑器第7个标签页
- 支持图片/视频/音频/PDF/表单五种类型，按"既往检查(外院)"和"本次检查(本院)"分组展示
- 卡片网格 + 编辑弹窗：拖拽/点击上传、自动类型检测、图片预览
- 触发条件配置：关键词(tag输入)、阶段选择、引导话术、SP口头描述，固定 `mode: on_ask`
- 数据模型独立：`{caseId}-materials.json` 与 basic/reception/analysis 平级，不耦合元数据
- **文件上传 API**：`POST /api/case/upload-material`，base64 → 写入 `public/data/cases/{caseId}/materials/`
- `saveDraft()` 自动清理 `_preview`/`_file` 临时字段，不污染 JSON
- `loadCaseDataFromFiles()` 扩展：并行 fetch 7 个文件（含 materials.json）

### 训练端素材气泡渲染（D阶段 — app-training）
- HistoryTaking.vue、PhysicalExam.vue：页面挂载时异步加载 `{caseId}-materials.json`
- 考生输入命中素材 `keywords` 时，SP/系统回复中内嵌素材卡片（缩略图/类型图标+名称+描述）
- 点击卡片新窗口打开原文件，支持所有素材类型
- app-training、training 两端的 vite.config.js 新增中间件，将 admin `public/data/cases/` 挂载到 `/data/cases`

### 需求文档与开发交接
- `requirements.json` 新增 `caseEditor` 条目：病例编辑器 7 标签页 + AI 生成集成 + 检查素材模块 + 评分表引擎完整需求说明
- 新增第七节「开发接入指南」：AI 生成提示词交付物清单、环境变量配置模板、数据流链路、启动步骤、Mock 模式说明
- `services/ai-generator/prompts/` 补全 4 个模块示例文件（02-reception / 03-analysis / 04-humanity / 05-meta），开发可参考输出格式

### 批注修复
- CaseList：专业名称筛选器扩展为17个全量专业 + 8个可见 + 展开/收起
- HumanisticComm：从"沟通目标+SPIKES"重构为"沟通场景+场景描述+患者角色"三栏结构
- ScoreReport：配色优化(topbar渐变/阴影/徽章)、演示数据随机化

### 病例选择弹窗增强（ExamCreate 管理端 + 运营端）
- 批注角标修复：`packages/shared/src/index.js` badge z-index 999→1001，高于弹窗 overlay (1000)
- 数据映射修复：4个索引生成文件（mock-gen.js / ai-gen-plugin.js / admin:vite.config.js / ops:vite.config.js）中 source 从固定"AI生成"改为读取实际来源，creator_name 从"AI生成"改为创建者用户名
- 新增快捷配置：选择病例后弹出确认框，可将同一病例批量应用到同类型其他未分配考站（admin+ops 两端）
- 考试时间默认值：`generateSessions()` 中 session 的 `start_datetime`/`end_datetime` 默认填入 form.startDate/endDate
- 筛选栏新增搜索和重置按钮，`resetCaseFilters()` 一键清空全部筛选条件
- 弹窗标题添加 `data-reviewable` 属性，评审模式下可正常显示批注数量角标

### 病例列表来源筛选（training + app-training 端）
- training 端 `CaseList.vue` 新增来源筛选 `<select>`（全部/平台病例库/机构病例库/专家病例库）
- app-training 端 `CaseList.vue` 筛选面板新增来源 chips（全部/平台/机构/专家）
- 两端 mock 数据（`useMockData.js` / `data.js`）23+5 个病例均补充 `source` 字段，分布平台/机构/专家三类
- 机构来源为具体医院名（华西/协和/瑞金等），筛选时自动归类为"机构病例库"
- 来源筛选联动分页（筛选变化时自动回到第1页）和 active-filters badge 显示

## 2026-06-03

### App训练端布局统一（评审批注驱动）
- HistoryTaking/PhysicalExam/HumanisticComm：视频区域重构为绝对定位填充聊天背景（`chat-bg-wrap`），底部紧贴输入栏
- "查看病人信息"按钮统一改名为"病人信息"
- `step-progress` 统一为半透明浮动胶囊样式（`inline-flex` + `backdrop-filter: blur` + 绝对定位），跨页面一致
- 移除 HistoryTaking/PhysicalExam 未使用的 back-btn 和 goBack 函数

### App训练端表单页布局重构
- PreliminaryDiag/TreatmentPlan/MedicalRecord/CaseAnalysis：上下分栏布局，上半信息展示（`flex:1`）、下半表单输入（`flex:1`）
- 提交按钮固定在屏幕底部（`flex-shrink: 0`），表单内容在 `.form-body` 内滚动
- 消除页面级滚动条（`overflow: hidden`），内部区域按需滚动（`overflow-y: auto`）
- CaseAnalysis 修复 `questions[0]` undefined 渲染错误（`v-if="questions.length > 0"` 守卫）

### 人文沟通页面对齐病史采集
- HumanisticComm 模板结构完全对齐 HistoryTaking：移除 `scenario-bar`，新增 `step-progress` 浮动步骤条
- next-btn 统一为箭头图标 + 内联 `@click="showEndConfirm = true"`，移除 `submitAll()`
- 确认弹窗增加"已标记信息"统计行（与 HistoryTaking 结构一致）
- 保留人文沟通特有业务逻辑（`analyzeEmotion`/`generateResponse`/`openGreeting`/`endStage`）

### 评审批注修复
- CaseAnalysis：`.btn` 与 `.btn-primary` CSS 顺序交换 — `.btn` 的 `background:#fff` 原先覆盖了 `.btn-primary` 的蓝色背景，导致"下一题"按钮白字白底不可见
- MedicalRecord/TreatmentPlan/PreliminaryDiag：`.body-area` 加 `padding-top: 34px`，防止 tab 栏被悬浮 `step-progress` 遮挡

## 2026-06-02

### 评分表生成引擎优化
- `buildKeyPoint()` 重写：评分要点从单行描述改为多子项拆解列表，按分值分档（高≥12/中6-11/低≤5），每个子项对应可观察的考生行为
- `buildRules()` 重写：评分规则从笼统描述改为带具体分值分配的扣分标准（如"起病时间明确(2分)，诱因问询完整(2分)…"）
- `generateV1ScoreSheet()` 拆分子项：每个评分项展开为独立行（如8分解为4行×2分），每行独立要点和分值，category/item通过rowspan自动合并
- 新增 `SUB_POINT_DEFS` 数据结构：13个模板评分项各自定义子要点描述和规则标签（`desc` + `rule` 数组）

### 评分表持久化修复
- `loadCaseDataFromFiles` 增加加载 `{caseId}-scoreSheet.json`，修复刷新后评分表消失的问题
- `acceptGenerated` 增加评分表数据持久化：通过 `POST /api/case/save-file` 保存到磁盘

### 评分表模板选择持久化
- `ai-gen-plugin.js` 新增 `POST /api/case/save-fields` 接口，支持前端更新 basic.json 字段
- 新增 `POST /api/case/save-file` 接口，支持前端保存额外数据文件
- `loadCaseDataFromFiles` 恢复 `score_sheet_template` 字段到 formData
- `saveTemplateChoice()` 函数：模板选择变更时自动持久化到 basic.json
- 修复模板选择后刷新页面不回显的问题

### 人文编辑器优化
- 标签全部中文化：SP→标准化病人、英文分隔符→中文括号
- 场景名称：添加6字以内建议、maxlength=20、placeholder引导精炼命名
- `field-mini-label` 改为 block 布局，增加 margin-bottom 改善排版
- 脚本卡片标签统一格式、去英文干扰

## 2026-05-29

### 病例编辑器稳定性修复
- loadCaseDataFromFiles 返回 `{formData, raw}` 结构，彻底消除模块变量和响应式污染
- raw 数据改用模块变量传递，避免 Vue 深度响应式包装导致病例编辑器卡死
- positiveSignEntries 双重 watcher 添加 internalUpdate 守卫，防止递归循环
- loadData 添加 15 秒兜底超时 + 全局错误保护，确保 loading 状态一定会结束
- tryFetchJson 全链路超时保护（fetch + json 解析），失败返回 null 不抛异常
- 病例编辑器加载转圈修复 — 状态检查非阻塞 + fetch 超时
- Reception.vue qaTurns 深度监听恢复 + 防抖优化，避免递归同步丢失编辑

### 性能优化
- 病例列表并行请求静态索引和 API，取最快响应，消除串行 404 等待
- 精简病例文件，仅保留最新 5 个病例（27→5），减少静态资源体积
- 病例编辑器重复 fetch 优化 — _raw 数据复用，省去 detectExistingModules 的第二轮请求
- 病例编辑器性能优化 — v-show 替代 v-if + 减少无效 fetch + 移除 deep watcher

### 部署优化
- 生产环境病例列表从静态索引加载，解决部署后不显示新病例的问题
- 病例 JSON 文件纳入版本管理（30个病例）

### AI 生成
- AI 生成服务搭建 + 病例编辑器重构 + Meta 模块修复 + 难度体系升级
- AI 生成模型切换：deepseek-chat → deepseek-v4-pro
- 病例编辑器继续生成功能：支持部分模块完成后跳过已成功步骤继续生成
- 动画进度条：生成过程中进度条滚动动画 + 百分比数字显示

## 2026-05-27

### 评分系统
- 评分系统重构 — v1.0 模板标准化 + v2.0 架构准备 + 前端组装优化
- AI 生成插件隔离 + Mock 离线演示 + 难度体系三档移除 + 病种数据结构化

### 难度体系
- 难度体系升级：从 L1/L2/L3 扩展为三阶段七级体系（U1-U2 院校 / R1-R3 住培 / F1-F2 专培）
- sex 编码统一：提示词/schema/vite 插件调整为 0=女 1=男，与 shared.js 保持一致（中国医疗标准）
- 病种配置结构化：从 Excel 提取 14 专业 / 175 分类 / 1219 病种 → disease-data.js

## 2026-05-26

### 部署与构建
- resolveAppUrls 生产环境 URL 硬编码，不再依赖构建时 env 注入
- 批注同步 API 在非本地环境静默处理，避免生产环境 404 报错
- 跨端跳转按钮环境自适应 + 修复电子书包/运营平台按钮禁用
- 更新 ops/电子书包 部署域名到所有端 env 配置
- 根 package.json 添加 vite 依赖，修复 Docker 构建找不到 vite 包
- app-training build script 使用 npx 调用 vite，修复 Docker 部署时 vite: not found

### 功能更新
- 新增评分表模块 + 字段补全 + 人文沟通演示数据完善
- 训练记录改为弹窗 + 新增 1.0/2.0 版切换
- 考试端评分 UI 优化 + 病例编辑器样式调整

## 2026-05-24

### 代码质量
- exam store 拆分（307行→140行），mock 数据独立到 `apps/exam/src/mock/data.js`
- `packages/shared/src/index.js` 全部 var → const/let（864行，0残留var）
- Dialogue.vue 内联样式提取为 scoped CSS
- 新增 ESLint / Prettier / EditorConfig 配置文件

### 修复与优化
- 修复筛选条件变化后分页不重置/搜索需手动触发的问题
- 优化菜单栏加载/搜索/筛选逻辑
- 移除生产环境评审/需求按钮隐蔽模式，所有环境直接显示
- Launcher 跨平台兼容：macOS/Linux 端口检测（lsof）和浏览器打开
- Admin Store closeTab 边界情况修复（idx === -1 检查）

## 2026-05-22

### 全屏悬浮布局重构
- 页面改为 `100vw x 100vh` 全屏，患者图片绝对定位为底层（`z-index:0`），其他元素悬浮之上
- 顶栏/浮动信息窗/气泡区域/输入栏 全部 `position:absolute` 叠在图片上层，带毛玻璃效果
- `.training-body`、`.training-center-panel`、`.patient-scene` 等非悬浮布局容器移除
- 气泡区域改为 `bottom:64px`（从底到输入栏上方），`pointer-events:none` 避免遮挡，内部 `> *` 恢复交互
- 浮动信息窗高度增大至 `calc(100vh - 80px)`（近全屏），笔记区改为只读 `.notes-display`（非 textarea）
- 步骤条：动态 `v-for` 渲染，当前/已完成/可点击状态分离；点击下一步带确认弹窗，跳步骤提示"请按顺序"
- PhysicalExam.vue 同步全部改动

### 病史采集+体格检查布局调整（评审批注第2轮）
- 批注1：悬浮信息窗移到左侧（`left:12px`），宽度从280→360px（+30%），高度从`calc(100%-24px)`→`min(600px, …)`（翻倍）
- 批注2+3：文字/语音切换按钮移入输入栏同一行左侧，保持水平排列；按钮与输入框/发送按钮高度统一为36px
- 批注4：气泡区域下移（`top:25%`），露出病人头部
- 批注5：已处理（顶栏左-中-右布局不变，确认无问题）
- 批注6：标记→笔记联动，点击标记自动将内容追加到笔记文本框，取消标记时自动移除
- PhysicalExam.vue 同步调整：浮动窗位置、输入布局、气泡下移、标记联动

### 病史采集+体格检查布局调整（评审批注第3轮）
- 批注1：初始问候气泡和所有SP气泡均增加标记按钮，点击将对话记入笔记，再次点击取消标记；笔记中也可直接删除
- 批注2：气泡与头像改为上对齐（`align-items: flex-start`）
- 批注3：悬浮信息窗高度自适应屏幕（`max-height: calc(100% - 24px)`），不设固定上限
- 批注4：文字/语音切换改为单个按钮，默认语音模式，点击切换，蓝色=语音模式，灰色=文字模式
- 批注5：结束按钮和计时器靠屏幕最右侧（`margin-left: auto`）
- 批注6：进度步骤整体居中（已有样式确认无问题）
- PhysicalExam.vue 同步调整：全部6项一致

### 评审批注面板功能增强
- 批注列表每条增加「编辑」按钮，点击弹出编辑窗口可修改批注内容
- 导出栏新增「复制」按钮，一键复制全部批注文本到剪贴板（不含删除按钮）
- 新增 `_showEditModal`、`_copyAnnotations` 方法
- 编辑按钮样式（蓝色）/ 删除按钮样式（红色）

### 病史采集与体格检查布局统一（按评审批注修改）
- HistoryTaking.vue 顶栏重构：站名称放最左边，进度条整体居中，计时器/结束按钮靠右
- PhysicalExam.vue 同步调整顶栏布局
- 左侧患者信息/笔记面板取消，改为患者图片上层的悬浮窗口（浮动按钮触发）
- 输入栏重构：文字/语音模式切换（不共存），文字模式用单行 `<input>`，语音模式按住说话松开发送
- 对话内容保持各端特色（病史SP回复 / 体格检查系统回复不变）

### 五端图标区分
- admin: ⚙️ + title「AI-SP 管理端」
- training: 🎯 + title「AI-SP 训练端」
- exam: 📋 + title「AI-SP 考试端」
- app-training: 📱 + title「AI-SP 电子书包」
- ops: 📊 + title「AI-SP 运营平台」
- launcher.mjs: 输出从统一 `✅` 改为各端专属图标

### 修复（五端跳转闭环）
- AdminLayout/TrainingLayout：考试端按钮改用绝对路径 `http://localhost:5175`，运营平台→5177，电子书包→5176
- ExamLayout：新增 ⚙️管理端 / 🎓训练端 按钮，五端跳转形成闭环
- AdminLayout：`openTraining()` 端口从 5201 → 5174

### Phase C 迁移完成
- apps/exam/ 考试端 15 页面完整迁移为 Vue SFC + Pinia：Login/Password/DeviceSelect/Confirm/CandidateQueue/Task/Dialogue/Analysis/Writing/Complete/ExLogin/Scoring/ExSelect/ExPending/LoadFail（72模块，1.14s构建）
- apps/exam/ 核心 Store（308行）：考试状态、设备配置、对话消息、评分表、考生队列、病例分析、双模式设备选择
- apps/exam/ 3 个 composables：useCountdown（倒计时+状态管理）、useSignature（Canvas手写签名）、useClock（时钟）
- apps/exam/ ExamLayout：侧栏导航 + 平板模拟框(1024×700) + 竖屏模式 + 4个模态弹窗 + 评审/需求浮动按钮
- apps/app-training/ 移动训练端：4页（首页统计/病例列表/训练进度/个人中心）+ 底部导航 + Pinia store + 移动端布局（46模块，0.62s构建）
- apps/ops/ 运营平台：2页（数据总览/机构管理）+ 侧栏布局 + Pinia store + 统计面板（42模块，0.64s构建）
- 创建 `packages/core/`：Vue composables（useReview/useRequirement/useToast）+ API 客户端（createApiClient）
- 创建 `services/mocks/`：API Mock 服务层
- 创建 `scripts/sync-public.mjs`：根目录静态资源 → 各 app public/ 同步脚本
- `packages/shared/` 规范 exports 字段，正式作为 `@ai-sp/shared` npm 包
- 根 `package.json` 新增统一脚本：`dev:admin`/`dev:training`/`dev:exam`、`build:all`、`sync:public`

### 文档更新
- `.trae/skills/sp-dev/SKILL.md`：文件映射表更新为 Vite SFC 新架构 + CDN 旧架构双表，新增 SFC 开发约束
- `.trae/rules/project_rules.md`：新增架构优先级规则（新功能 → Vite 项目，旧 CDN → 仅 Bug 修复）
- `CLAUDE.md`：全面更新目录结构、五端体系状态、文件修改速查表、迁移路径状态
- `CHANGELOG.md`：此处记录

### 重构（统一按钮栏）
- sp-core.js 新增 BottomActionBar 引擎 (L565-660)，支持 admin/exam 双模式
- 管理端 app.js：底部 Vue 模板按钮 → BottomActionBar 配置驱动（删除 ~20 行）
- 训练端 training/index.js：同上
- 考试端 exam-terminal-core.js：浮动按钮接入 BottomActionBar，删除元素引用

### 重构（核心引擎）
- 创建 `js/sp-core.js` 统一评审引擎 (ReviewEngine) + 需求引擎 (RequirementEngine) + Toast + Confirm
- shared-review.js 精简为 sp-core 适配器 (223行 → 28行)
- 管理端 app.js 评审/需求面板改为 sp-core 驱动，删除旧 Vue 模板面板 (~70行)
- 训练端 training/index.js 同步接入 sp-core，删除旧面板 (~25行)
- 考核端 exam-terminal-core.js 接入 sp-core，删除重复逻辑 (~100行)
- 考核端 index.html 删除旧静态评审/需求面板 HTML
- sp-core 内置样式注入，统一三端评审/需求 UI 风格为考核端标准

### 安全修复
- shared-review.js: innerHTML 拼接批注内容增加 escapeHtml() 转义 (XSS)
- exam-terminal-core.js: renderReqContent + refreshAnnotationList 增加 escapeHtml()
- training/index.js: trainingShowToast + trainingConfirmDialog 增加 escapeHtml()

### CSS 修复
- `.step-item` 类名冲突 → 重命名为 `.editor-step-item`
- `.filter-row` / `.filter-item` 重复定义合并，删除冗余定义

### 数据修复
- specialty 字段中英文统一: "internal_medicine" → "内科", "orthopedics" → "骨科/康复科"
- JSON 换行符修复: 字面量 n → \n (4个文件, 23处)
- IM-basic.json: education 从数字 5 → 字符串 "高中"
- ORT-reception.json: 删除约 180 行 ai_extension 冗余数据
- ORT-analysis.json: disease 补充"节段"二字

### 运行时修复
- exam-monitor.js: 姓名搜索大小写 → c.name.toLowerCase().includes(kw)
- AnalysisEditor.js: 删除 teachingPointsStr computed 死代码 setter
- shared.js: isModuleEmpty() 增加 formData 空值检查
- training-records.js: 删除 2 处 console.log 残留

### 工程文件
- 创建 CLAUDE.md 项目上下文文件
- 创建 .trae/rules/project_rules.md 开发规则
- 创建 CHANGELOG.md 变更日志
