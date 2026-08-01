# 辅助检查模块设计文档

> **目标读者**：开发工程师 + AI 助手（开发者将使用 AI 助手解读本文档并在真实项目中复现功能）
> **版本**：v2.0
> **更新日期**：2026-08-01

---

## 1. 功能概述

辅助检查模块是临床思维模拟训练流程中的一个考站（Station）。学员在该站可自由输入检查项目（自然语言），系统通过 LLM 自动识别、校验并生成对应的检查报告。

### 1.1 核心能力

| 能力 | 描述 |
|------|------|
| 自由输入 | 不预设检查项目库，学员以自然语言输入，LLM 负责理解意图 |
| 输入校验 | LLM 拦截非医疗/无关/恶意输入，返回拒绝原因 |
| 三级报告生成 | 素材直接引用 → 病例上下文整合 → 正常范围生成 |
| 报告双模展示 | 优先匹配资源库图片，无图片则显示格式化医学文本 |
| 会话持久化 | 检查结果存入 Pinia Store + localStorage，断点续训可恢复 |

### 1.2 用户交互流程

```
学员输入检查申请 → 点击"提交申请" → LLM 处理（loading） →
  ├─ 校验失败 → Toast 提示原因
  ├─ 校验通过 → 解析检查项目列表 → 结果显示到上栏（图标卡片）
  └─ 点击图标卡片 → 弹窗查看完整报告（图片/文字）
全部检查完成后 → 点击"结束/下一步" → 确认提交 → 进入下一考站
```

---

## 2. 架构总览

### 2.1 技术栈

```
Vue 3 SFC (<script setup> + Composition API)
Pinia Store (training.js)        ← 会话状态持久化
useAIChat.js (composable)        ← LLM 通信封装
useCaseLoader.js (composable)    ← 病例 JSON 加载
Vite proxy middleware             ← /api/llm → DashScope API
```

### 2.2 文件清单

| 文件 | 职责 |
|------|------|
| `apps/training/src/views/ancillary-tests/AncillaryTests.vue` | 主页面组件（~850行） |
| `apps/training/src/composables/useAIChat.js` | LLM 通信（sendMessage 封装） |
| `apps/training/src/composables/useCaseLoader.js` | 病例数据加载与缓存 |
| `apps/training/src/stores/training.js` | Pinia 全局状态 + localStorage 持久化 |
| `apps/training/vite.config.js` | LLM 代理中间件（/api/llm） |

### 2.3 依赖关系图

```
AncillaryTests.vue
  ├─ useAIChat.sendMessage()      → POST /api/llm → DashScope API
  ├─ useCaseLoader.loadCase()     → GET /data/cases/{caseId}-basic.json
  ├─ useTrainingStore             → Pinia + localStorage
  ├─ useStationFlow               → 多站流程控制
  ├─ useTimer                     → 训练计时
  ├─ TrainingTopBar               → 顶栏组件
  ├─ PatientInfoPanel             → 患者信息面板
  └─ StationModals                → 结束确认弹窗
```

---

## 3. UI 布局规范

### 3.1 整体布局

```
┌─────────────────────────────────────────────────────────┐
│  TrainingTopBar（顶栏：考站名称、步骤、计时、语言切换）    │
├──────────────────────┬──────────────────────────────────┤
│  左侧面板 (35%)       │  右侧面板 (65%)                   │
│  ┌─────────────────┐ │  ┌────────────────────────────┐  │
│  │ Tab: 患者信息    │ │  │  上栏 (50%)：检查结果       │  │
│  │ Tab: 笔记       │ │  │  ┌───┐ ┌───┐ ┌───┐       │  │
│  │ Tab: 接诊记录    │ │  │  │图标│ │图标│ │图标│ ...   │  │
│  │                 │ │  │  │血常│ │肝功│ │CT  │       │  │
│  │                 │ │  │  └───┘ └───┘ └───┘       │  │
│  │                 │ │  ├────────────────────────────┤  │
│  │                 │ │  │  下栏 (50%)：开具检查申请    │  │
│  │                 │ │  │  ┌──────────────────────┐  │  │
│  │                 │ │  │  │  textarea（自由输入）  │  │  │
│  │                 │ │  │  └──────────────────────┘  │  │
│  │                 │ │  │  [提交申请]                 │  │
│  └─────────────────┘ │  └────────────────────────────┘  │
├──────────────────────┴──────────────────────────────────┤
│  背景层：患者图片/视频/占位符（半透明）                     │
└─────────────────────────────────────────────────────────┘
```

### 3.2 关键尺寸

- 左侧面板：`flex: 0 0 35%`
- 右侧面板：`flex: 1`，内部上下栏各 `flex: 1 1 50%`
- 结果图标卡片：`width: 82px`，flex-wrap 排列，间距 `gap: 8px`
- 报告弹窗：`width: min(640px, 92vw)`，`max-height: 85vh`

### 3.3 图标卡片状态

```css
/* 默认：白色背景，蓝色边框 */
.result-icon-card { background: #fff; border-color: #EBEEF5; }

/* 已查看：绿色背景 */
.result-icon-card.viewed { background: #f0f9eb; border-color: #c6e6c0; }

/* NEW 角标：红色 + 脉冲动画（未查看时显示） */
.result-icon-badge.new { background: #F56C6C; animation: badge-pulse 1.5s ease infinite; }
```

### 3.4 检查类别图标映射

| 类别 | Font Awesome 图标 |
|------|-------------------|
| 实验室检查 | `fa-solid fa-vial-circle-check` |
| 影像学检查 | `fa-solid fa-x-ray` |
| 特殊检查 | `fa-solid fa-stethoscope` |
| 默认 | `fa-solid fa-file-lines` |

---

## 4. LLM 集成设计

### 4.1 API 通信路径

```
AncillaryTests.vue
  → useAIChat.sendMessage(messages, systemPrompt, opts)
    → fetch('POST /api/llm', { messages, system, temperature, max_tokens })
      → Vite middleware (llm-proxy)
        → fetch(LLM_API_URL, { Authorization: Bearer LLM_API_KEY })
          → DashScope API (qwen-turbo / deepseek-v4-pro)
```

### 4.2 useAIChat 接口

```javascript
// composable: useAIChat.js
function useAIChat() {
  // 返回 { sendMessage, loading, error }

  async function sendMessage(messages, systemPrompt, opts = {}) {
    // messages: [{ role: 'user', content: '...' }]
    // systemPrompt: string (system message)
    // opts: { temperature, maxTokens, timeout, model }
    // 返回: { ok: boolean, content: string }
  }
}
```

**关键参数**（辅助检查场景）：
- `temperature`: `0.3`（低温度确保输出稳定一致）
- `maxTokens`: `4000`（报告内容较长需要较大输出）
- `timeout`: `45000`（LLM 响应可能较慢）

### 4.3 System Prompt 设计

```
你是一名临床辅助检查智能调度员。用户（医学生）会输入需要开具的检查项目，你的任务是：
1. 判断输入是否为合理的医疗检查申请——拦截完全无关、恶意或非医疗的输入
2. 将用户输入解析为具体的检查项目列表
3. 为每个检查项目生成完整的检查报告

报告生成规则（优先级递减）：
- 病例原始素材中已有该检查的明确结果 → 直接引用，保持原始格式
- 病例中有相关临床发现但无该检查的完整结果 → 基于病例中的临床信息（症状、体征、既往史等）整合出合理报告
- 病例中完全没有相关信息 → 生成正常范围的检查结果（需考虑患者既往史中的基础疾病可能带来的影响）

报告格式要求：
- 实验室检查：包含检查项目、标本类型、各项指标及结果值（带单位）、参考区间、异常标记
- 影像学检查：包含检查技术、影像所见（详细描述）、诊断意见
- 特殊检查：包含检查方法、检查所见、结论

请严格按以下JSON格式输出，不要包含其他内容：
{
  "valid": true/false,
  "reason": "如valid为false，说明原因",
  "tests": [
    {
      "name": "检查项目名称",
      "category": "实验室检查/影像学检查/特殊检查",
      "result": "完整的检查报告内容（纯文本，用换行分隔各部分）",
      "source": "case_material/case_context/generated"
    }
  ]
}
```

### 4.4 User Message 构建（上下文注入）

每次调用 LLM 时，需要将病例完整上下文注入 user message：

```javascript
function buildTestOrderUserMessage(inputText) {
  // 从 caseData.value.basic 提取以下字段：
  // - patient_info: name, sex, age
  // - chief_complaint: 主诉
  // - present_illness: 现病史
  // - past_history: 既往史
  // - personal_history: 个人史
  // - family_history: 家族史
  // - physical_exam: vital_signs + general + systemic
  // - lab_tests: 已有实验室检查结果（分号分隔的文本）
  // - imaging: 已有影像学检查结果
  // - special_exams: 已有特殊检查结果

  // 拼接格式：
  // 患者：{name}，{sex}，{age}
  // 主诉：{chief_complaint}
  // 现病史：{present_illness}
  // ...
  // 【病例已有检查素材】
  // 实验室检查结果：{lab_tests}
  // 影像学检查结果：{imaging}
  // 特殊检查结果：{special_exams}
  // 学员输入的检查申请：{inputText}
}
```

### 4.5 响应解析策略（三级回退）

```javascript
function parseLLMResponse(content) {
  // 策略1：直接 JSON.parse
  try { return JSON.parse(content) } catch {}

  // 策略2：从 markdown 代码块提取
  // 匹配 ```json ... ``` 或 ``` ... ```
  const match = content.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (match) try { return JSON.parse(match[1].trim()) } catch {}

  // 策略3：正则提取第一个含 "valid" 字段的 JSON 对象
  const braceMatch = content.match(/\{[\s\S]*"valid"[\s\S]*\}/)
  if (braceMatch) try { return JSON.parse(braceMatch[0]) } catch {}

  throw new Error('Unable to parse LLM response')
}
```

### 4.6 响应结构

```typescript
interface LLMResponse {
  valid: boolean
  reason?: string              // valid=false 时的拒绝原因
  tests?: Array<{
    name: string               // 检查项目名称
    category: '实验室检查' | '影像学检查' | '特殊检查'
    result: string             // 完整报告文本（含换行）
    source: 'case_material' | 'case_context' | 'generated'
  }>
}
```

---

## 5. 核心状态管理

### 5.1 组件内状态

| 状态 | 类型 | 说明 |
|------|------|------|
| `submittedTests` | `ref([])` | 已提交的检查结果列表 |
| `viewedSet` | `reactive(Set)` | 已查看过的结果索引集合 |
| `orderText` | `ref('')` | textarea 输入内容 |
| `processingOrder` | `ref(false)` | LLM 处理中标志 |
| `justSubmitted` | `ref(false)` | 刚提交的闪烁动画触发（1.2秒后复位） |
| `showReport` | `ref(false)` | 报告弹窗显示标志 |
| `reportTest` | `ref(null)` | 当前查看的检查项 |
| `reportImageSrc` | `ref('')` | 报告图片路径 |
| `reportImageLoaded` | `ref(false)` | 图片加载成功标志 |
| `showToast` | `ref(false)` | Toast 提示显示 |
| `toastMessage` | `ref('')` | Toast 消息内容 |
| `showEndConfirm` | `ref(false)` | 结束确认弹窗显示 |

### 5.2 submittedTests 元素结构

```typescript
interface SubmittedTest {
  category: string        // 原始类别（中文）："实验室检查" / "影像学检查" / "特殊检查"
  categoryLabel: string   // 显示类别（中/英）："实验室检查" / "Lab"
  name: string            // 检查名称
  result: string          // 报告内容
  source: string          // 数据来源：case_material / case_context / generated
  submittedAt: string     // 提交时间（中文本地化格式）
}
```

### 5.3 会话持久化

```javascript
// 写入 store（每次提交后调用）
function syncAncillaryToSession() {
  store.trainingSession.ancillaryTests = {
    results: submittedTests.value.map((t, i) => ({
      ...t,
      viewed: viewedSet.has(i)
    })),
    submittedAt: new Date().toISOString(),
    duration: elapsedSeconds.value
  }
  store.saveTrainingSession()  // → localStorage + 服务端推送
}

// 恢复（onMounted 时调用）
const ts = store.trainingSession || {}
if (ts.ancillaryTests?.results?.length) {
  submittedTests.value = ts.ancillaryTests.results
  ts.ancillaryTests.results.forEach((r, i) => {
    if (r.viewed) viewedSet.add(i)
  })
}
```

---

## 6. 报告展示规范

### 6.1 弹窗结构

```
┌─────────────────────────────────────┐
│ [图标] 检查项目名称    [类别标签]  [X]│  ← 头部
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────────┐    │
│  │   图片模式（优先）           │    │
│  │   /data/cases/{caseId}      │    │
│  │   -tests/{name}.png         │    │
│  └─────────────────────────────┘    │
│          或                          │
│  ┌─────────────────────────────┐    │
│  │   文字模式（回退）           │    │
│  │   东南大学附属中大医院        │    │
│  │   {name}检查报告             │    │
│  │   ─────────────────────     │    │
│  │   姓名/性别/年龄/ID          │    │
│  │   ─────────────────────     │    │
│  │   {formatted result}        │    │
│  └─────────────────────────────┘    │
│                                     │
└─────────────────────────────────────┘
```

### 6.2 图片匹配规则

```javascript
function toggleReport(idx) {
  const test = submittedTests.value[idx]

  // 生成图片文件名：移除中文括号内容，去除空格
  const cleanName = test.name.replace(/[（(].*?[)）]/g, '').replace(/\s+/g, '')
  const imgPath = `/data/cases/${caseId}-tests/${cleanName}.png`

  // 先尝试加载图片，失败时 @error 回调自动回退为文字模式
  reportImageSrc.value = imgPath
  reportImageLoaded.value = true  // 乐观设置，失败时 @error 置 false
}
```

### 6.3 文字报告格式化

当 LLM 返回的结果文本较简短（<30字符且不含中文冒号）时，按类别补充格式化模板：

**实验室检查模板**：
```
【检查项目】{name}
【标本类型】静脉血
【检查结果】
{result}
【参考区间】详见各分项参考范围
【报告日期】{date}
【检验医师】检验科
```

**影像学检查模板**：
```
【检查项目】{name}
【检查技术】详见扫描参数
【影像所见】
  {result}
【诊断意见】
  结合临床病史及其他检查综合判断。
【报告日期】{date}
【报告医师】影像科
```

**特殊检查模板**：
```
【检查项目】{name}
【检查所见】
  {result}
【结论】
  详见上述检查所见。
【报告日期】{date}
【报告医师】检查科室
```

---

## 7. 错误处理与边界情况

### 7.1 错误场景矩阵

| 场景 | 处理方式 |
|------|---------|
| LLM API Key 未配置 | Vite 中间件返回 503，前端显示"AI服务异常，请重试" |
| LLM 请求超时 (>45s) | AbortController 中止，返回 "请求超时" |
| LLM 返回 `valid: false` | 显示 `reason` 字段内容作为 Toast 提示 |
| LLM 返回空 `tests` 数组 | 提示 "未识别到检查项目，请重新输入" |
| JSON 解析失败（三种策略均失败） | catch 块捕获，显示 "处理失败，请重试" |
| 网络异常 | useAIChat 捕获 fetch 异常，返回 `{ ok: false }` |
| 图片加载失败 | `<img @error>` 设置 `reportImageLoaded = false`，自动切换到文字模式 |
| 未提交检查就点结束 | 阻止并提示 "请先申请检查并获取结果" |
| 已查看的检查项 | 图标卡片显示绿色背景 + viewed 状态，NEW 角标消失 |

### 7.2 非医疗输入拦截

LLM 应对以下输入返回 `valid: false`：
- 完全无关输入（如 "你好"、"今天天气怎么样"）
- 恶意输入（如试图注入指令）
- 非检查类医疗操作（如 "开药"、"做手术"）

`reason` 字段应给出具体的、学员可理解的拒绝原因。

---

## 8. 组件生命周期

### 8.1 onMounted 流程

```
1. ensureStationIndex(store, route.name)     ← 确认当前站在流程中的位置
2. 设置 document.title
3. loadCase(caseId)                          ← 从 /data/cases/{id}-basic.json 加载病例
4. 恢复 session 数据：
   - submittedTests ← ts.ancillaryTests.results
   - viewedSet ← 根据 viewed 字段重建
5. 合并前序考站的笔记 (historyTaking.notes + physicalExam.notes)
6. startTimer()                              ← 开始计时
```

### 8.2 路由离开守卫

```javascript
onBeforeRouteLeave((to, from, next) => {
  if (forwardNav.value) { next(); return }           // 正常前进放行
  if (多站流程) { next(); return }                    // 多站间跳转放行
  if (无已提交检查) { next(); return }                // 无数据放行
  showConfirmDialog.value = true; next(false)         // 否则阻止并提示
})
```

---

## 9. 动画与交互细节

| 元素 | 动画 | 实现 |
|------|------|------|
| 新提交结果卡片区域 | 蓝色闪烁 | `animation: results-flash-anim .4s ease`（背景色从蓝到透明） |
| NEW 角标 | 脉冲呼吸 | `animation: badge-pulse 1.5s ease infinite`（opacity 交替） |
| Toast 提示 | 下滑淡入 | `transition: toast-fade`（opacity + translateY） |
| 报告弹窗 | 缩放淡入 | `transition: modal-fade`（opacity + scale(0.95→1)） |
| 图标卡片 hover | 上浮 + 阴影 | `transform: translateY(-1px) + box-shadow` |

---

## 10. 与现有系统的集成点

### 10.1 依赖的 Pinia Store 字段

```
store.lang                    ← 语言 (zh/en)
store.currentCase             ← 当前病例摘要
store.trainingSession         ← 训练会话数据（读写）
store.stationFlow             ← 多站流程配置
store.currentFlowIndex        ← 当前站索引
store.stationScheme           ← 考站方案（1.0版兼容）
```

### 10.2 依赖的 Composable

```
useCaseLoader().loadCase(id)     → 返回 { basic, reception, analysis, ... }
useStationFlow()                 → { stations, resolveNextInFlow, advanceToNextStation, ensureStationIndex }
useTimer()                       → { formattedTime, elapsedSeconds, startTimer, stopTimer }
useAIChat().sendMessage(...)     → { ok, content }
```

### 10.3 依赖的共享组件

```
TrainingTopBar      ← props: stationName, steps, stepIndex, formattedTime, flowSteps, ...
PatientInfoPanel    ← props: patient, vitals, chiefComplaint, lang
StationModals       ← props: showEndConfirm, endTitle, cancelLabel, confirmLabel, ...
```

### 10.4 Vite 中间件依赖

```
/api/llm            ← LLM 代理（POST），需要在 .env.local 配置 LLM_API_KEY
/data/cases/        ← 病例静态文件服务（从 admin/public/data/cases 映射）
/api/cases          ← 病例索引 API
```

---

## 11. 实现检查清单

开发者在复现时，按以下顺序实施：

- [ ] **Step 1**：确保 `useAIChat` composable 可用，`/api/llm` 端点正常工作
- [ ] **Step 2**：确保病例数据结构包含 `lab_tests`、`imaging`、`special_exams` 字段（分号分隔的文本）
- [ ] **Step 3**：搭建页面骨架：背景层 + TrainingTopBar + 左右分栏布局
- [ ] **Step 4**：实现左侧面板：患者信息 Tab（使用 PatientInfoPanel）+ 笔记 Tab + 接诊记录 Tab
- [ ] **Step 5**：实现右上栏：检查结果图标卡片网格（空状态、有数据状态）
- [ ] **Step 6**：实现右下栏：textarea + 提交按钮 + loading 状态
- [ ] **Step 7**：实现 `buildTestOrderSystemPrompt()` 和 `buildTestOrderUserMessage()`
- [ ] **Step 8**：实现 `submitOrder()` → 调用 LLM → 解析响应 → 更新 submittedTests
- [ ] **Step 9**：实现 `parseLLMResponse()` 三级回退解析
- [ ] **Step 10**：实现报告弹窗（图片模式 + 文字模式 + 格式化模板）
- [ ] **Step 11**：实现 `syncAncillaryToSession()` 会话持久化
- [ ] **Step 12**：实现 `onMounted` 恢复逻辑
- [ ] **Step 13**：实现错误处理：Toast 提示 + 各错误场景
- [ ] **Step 14**：实现动画：闪烁、脉冲、弹窗过渡
- [ ] **Step 15**：实现 StationModals 结束确认 + forceEnd 逻辑
- [ ] **Step 16**：添加中/英双语支持（lang 切换）
- [ ] **Step 17**：测试：正常输入、简写、非医疗输入、LLM 超时、图片回退、断点续训

---

## 12. 关键设计决策说明

### 为什么使用 LLM 而非预设检查项目库？

1. **灵活性**：学员的表达方式不可预测（"血常规"、"查个血"、"CBC" 指同一项），预设库匹配覆盖率有限
2. **校验能力**：LLM 能区分医疗输入和非医疗输入，比关键词过滤更智能
3. **报告生成**：LLM 能基于病例上下文生成合理报告，无需为每种检查预写结果

### 为什么三级报告生成？

| 优先级 | 来源 | 说明 |
|--------|------|------|
| 1 (最高) | `case_material` | 病例 JSON 中 `lab_tests`/`imaging`/`special_exams` 字段已有明确结果，直接引用 |
| 2 | `case_context` | 病例中有相关临床线索（如症状指向某异常），LLM 整合生成合理报告 |
| 3 (最低) | `generated` | 病例中无相关信息，生成正常范围结果（考虑既往史基础病影响） |

### 为什么 temperature=0.3？

辅助检查是**确定性任务**，需要稳定、可复现的输出。低温度确保：
- 同一输入产生一致的检查匹配
- 报告格式规范统一
- 正常值范围合理（不会因随机性产生异常值）
