# 专家知识库编辑器模块设计文档

> **目标读者**：开发工程师 + AI 助手（开发者将使用 AI 助手解读本文档并在真实项目中复现功能）
> **版本**：v2.0
> **更新日期**：2026-08-01
>
> **关联文档**：本模块的训练端消费逻辑见 [`DESIGN_专家AI智能体设计文档.md`](./DESIGN_专家AI智能体设计文档.md)（五层流水线 + 专家点评智能体）。

---

## 1. 功能概述

专家知识库编辑器（ExpertKBEditor）是病例编辑器中的**手动创作 Tab**，用于为病例绑定一位真实临床专家的人设信息和专属教学知识库。这些数据在训练端被加载，驱动"专家点评"智能体对学员操作进行个性化的权威点评。

### 1.1 核心能力

| 能力 | 描述 |
|------|------|
| 专家人设配置 | 姓名、职称、头像上传、点评标题 |
| 专家标签 | 自由添加/删除标签（回车或逗号确认） |
| 知识库内容编辑 | 自由文本 textarea（建议 500-2000 字），带字数统计 |
| 实时预览 | 右侧预览卡片模拟训练端专家展示效果 |
| 启用/禁用开关 | 一键开关，禁用时隐藏所有编辑区域 |
| 图片上传 | 头像支持点击/拖拽上传（JPG/PNG/GIF/WebP，≤2MB） |

### 1.2 数据流向全景

```
┌──────────────────────────────────────────────────────────────────┐
│  管理端（创作侧）—— 本模块                                        │
│  ExpertKBEditor.vue                                              │
│    → 编辑 expertReview 对象                                       │
│    → CaseEditor.saveDraft() 保存为 {caseId}-expert.json          │
│    → POST /api/case/save-file                                    │
├──────────────────────────────────────────────────────────────────┤
│  训练端（消费侧）—— 见 DESIGN_专家AI智能体设计文档.md               │
│  AICompanionDrawer.vue "专家点评" Tab                             │
│    → GET /data/cases/{caseId}-expert.json                        │
│    → useExpertAgent.js (五层流水线)                               │
│    → POST /api/llm → 专家点评回复                                 │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. 架构总览

### 2.1 技术栈

```
Vue 3 SFC (<script setup> + Composition API)
v-model 双向绑定模式（props.model + emit('update:model')）
FileReader API（头像 Data URL 预览）
POST /api/case/upload-material（头像持久化到服务器）
POST /api/case/save-file（知识库内容持久化）
```

### 2.2 文件清单

| 文件 | 职责 |
|------|------|
| `apps/admin/src/views/case-editor/ExpertKBEditor.vue` | 专家知识库编辑器组件（~791行） |
| `apps/admin/src/views/case-editor/CaseEditor.vue` | 父组件——Tab 集成、保存调度 |
| `apps/admin/src/views/case-editor/shared.js` | 数据加载层——初始化默认值、加载 expert.json |
| `apps/training/src/composables/useExpertAgent.js` | 训练端专家点评智能体（消费 expertKB） |
| `apps/training/src/components/AICompanionDrawer.vue` | 训练端专家点评 UI（消费 expert 数据） |

### 2.3 依赖关系图

```
CaseEditor.vue
  ├─ shared.js::loadCaseDataFromFiles(caseId)
  │     └─ fetch /data/cases/{caseId}-expert.json
  │           → formData.expertReview = { enabled, expertName, ... }
  │
  ├─ ExpertKBEditor.vue
  │     ├─ props: { model: formData.expertReview, caseId }
  │     ├─ emit: update:model (完整新对象)
  │     └─ POST /api/case/upload-material (头像上传)
  │
  └─ saveDraft()
        └─ saveFile('{caseId}-expert.json', expertData)
```

---

## 3. UI 布局规范

### 3.1 整体布局（启用状态）

```
┌─────────────────────────────────────────────────────────────┐
│  专家知识库绑定                                    [启用开关] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────┐  ┌──────────────────────────┐  │
│  │  专家基本信息             │  │  预览效果                 │  │
│  │  ┌─────────────────────┐│  │  ┌────────────────────┐  │  │
│  │  │ 专家姓名：[______]  ││  │  │  👤 滕皋军 院士     │  │  │
│  │  │ 专家职称：[______]  ││  │  │  东南大学附属中大    │  │  │
│  │  │                     ││  │  │  医院·介入与血管    │  │  │
│  │  │  [头像圆形区域]      ││  │  │  外科              │  │  │
│  │  │  点击或拖拽上传      ││  │  │                    │  │  │
│  │  │                     ││  │  │  [中科院院士]       │  │  │
│  │  │ 点评标题：[______]  ││  │  │  [介入放射学]       │  │  │
│  │  └─────────────────────┘│  │  │  ...               │  │  │
│  │                         │  │  └────────────────────┘  │  │
│  │  专家标签                │  │                          │  │
│  │  [中科院院士] [介入放射] ×│  │                          │  │
│  │  [+ 添加标签________]   │  │                          │  │
│  │                         │  │                          │  │
│  │  知识库内容              │  │                          │  │
│  │  ┌─────────────────────┐│  │                          │  │
│  │  │ （textarea）         ││  │                          │  │
│  │  │ 建议 500-2000 字    ││  │                          │  │
│  │  │ ...                 ││  │                          │  │
│  │  └─────────────────────┘│  │                          │  │
│  │  字数：████████░░  856   │  │                          │  │
│  └─────────────────────────┘  └──────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 禁用状态

- 所有编辑区域隐藏
- 显示空状态面板：图标 + "专家知识库未启用，点击右上角开关启用"
- 开关 UI 保留在顶部

---

## 4. 数据模型

### 4.1 Props 接口

```typescript
interface ExpertKBEditorProps {
  model: ExpertReviewConfig
  caseId: string
}

interface ExpertReviewConfig {
  enabled: boolean
  expertName: string         // 专家姓名（如 "滕皋军 院士"）
  expertTitle: string        // 专家职称/机构（如 "东南大学附属中大医院 · 介入与血管外科"）
  expertAvatar: string       // 头像 Data URL 或服务器路径
  expertTags: string[]       // 专家标签列表
  expertKB: string           // 知识库文本内容（500-2000字建议）
  reviewTitle: string        // 点评标题
}
```

### 4.2 Emit 接口

```typescript
interface ExpertKBEditorEmits {
  'update:model': (value: ExpertReviewConfig) => void  // 每次修改都 emit 完整新对象
}
```

### 4.3 默认值（禁用状态）

```javascript
const DEFAULT_MODEL = {
  enabled: false,
  expertName: '',
  expertTitle: '',
  expertAvatar: '',
  expertTags: [],
  expertKB: '',
  reviewTitle: ''
}
```

### 4.4 持久化格式

保存到 `/data/cases/{caseId}-expert.json`：

```json
{
  "caseId": "IM-20260721-YQWH",
  "expertEnabled": true,
  "expertName": "滕皋军 院士",
  "expertTitle": "东南大学附属中大医院 · 介入与血管外科",
  "expertAvatar": "/images/expert-photo.webp",
  "expertTags": ["中国科学院院士", "介入放射学", "肝癌介入治疗"],
  "reviewTitle": "院士点评：肝癌病例综合分析",
  "expertKB": "<2000+ 字的中文教学知识库文本>"
}
```

注意：存储时 `enabled` 字段映射为 `expertEnabled`，加载时兼容两种字段名：

```javascript
// shared.js 加载逻辑
formData.expertReview = {
  enabled: expertData.expertEnabled || expertData.enabled || false,
  expertName: expertData.expertName || '',
  // ...
}
```

---

## 5. 核心交互逻辑

### 5.1 字段更新模式

采用"全量替换"的 v-model 模式：

```javascript
function updateField(key, value) {
  emit('update:model', {
    ...props.model,
    [key]: value
  })
}
```

每次修改任一字段，都 emit 一个完整的新 `ExpertReviewConfig` 对象。这样做的好处：
- 父组件 CaseEditor 始终持有最新完整数据
- 保存时无需合并，直接取 `formData.expertReview` 即可
- 调试时状态可追溯

### 5.2 头像上传

```javascript
function processFile(file) {
  // 1. 校验类型（JPG/PNG/GIF/WebP）
  if (!['image/jpeg','image/png','image/gif','image/webp'].includes(file.type)) {
    showError('仅支持 JPG/PNG/GIF/WebP 格式') // 通过 toast/alert
    return
  }
  // 2. 校验大小（≤2MB）
  if (file.size > 2 * 1024 * 1024) {
    showError('图片大小不能超过 2MB')
    return
  }
  // 3. FileReader 读取为 Data URL → 即时预览
  const reader = new FileReader()
  reader.onload = (e) => {
    const dataUrl = e.target.result
    updateField('expertAvatar', dataUrl)
  }
  reader.readAsDataURL(file)

  // 4. 上传到服务器（替换为持久路径）
  if (caseId) {
    fetch('/api/case/upload-material', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        caseId,
        filename: `expert-avatar-${Date.now()}.${file.name.split('.').pop()}`,
        data: dataUrl
      })
    }).then(r => r.json()).then(r => {
      if (r.ok && r.path) updateField('expertAvatar', r.path)
    })
  }
}
```

### 5.3 标签管理

```javascript
function addTag() {
  const text = newTagText.value.trim()
  if (!text) return
  // 支持逗号分隔批量添加
  const tags = text.split(',').map(t => t.trim()).filter(Boolean)
  const newTags = [...new Set([...props.model.expertTags, ...tags])]  // 去重
  updateField('expertTags', newTags)
  newTagText.value = ''
}

function removeTag(index) {
  const newTags = [...props.model.expertTags]
  newTags.splice(index, 1)
  updateField('expertTags', newTags)
}
```

### 5.4 字数统计

```javascript
const charLevel = computed(() => {
  const len = (props.model.expertKB || '').length
  if (len < 500) return 'low'      // 红色进度条
  if (len <= 2000) return 'good'   // 绿色进度条
  return 'full'                    // 蓝色进度条（超额）
})

const charPercent = computed(() => {
  return Math.min(100, Math.round((props.model.expertKB || '').length / 2000 * 100))
})
```

---

## 6. 在 CaseEditor 中的集成

### 6.1 Tab 定义

```javascript
// CaseEditor.vue tabs 数组中
{ key: 'expertKB', label: '专家知识库' }  // 在 materials 和 meta 之后
```

### 6.2 模板

```vue
<div v-show="activeTab === 'expertKB'" class="tab-panel" key="expertKB">
  <ExpertKBEditor
    :model="formData.expertReview"
    @update:model="v => formData.expertReview = v"
    :caseId="formData.case_id"
  />
</div>
```

### 6.3 保存逻辑

```javascript
// CaseEditor.saveDraft() 中：
const er = formData.value.expertReview
if (er && (er.enabled || er.expertKB)) {
  saveFile(caseId + '-expert.json', {
    caseId,
    expertEnabled: er.enabled,
    expertName: er.expertName,
    expertTitle: er.expertTitle,
    expertAvatar: er.expertAvatar,
    expertTags: er.expertTags,
    expertKB: er.expertKB,
    reviewTitle: er.reviewTitle
  })
}
```

### 6.4 重要约束

**专家知识库不在 AI 生成流水线中**。CaseEditor 的 AI 生成步骤（`genSteps`）仅覆盖：basic、scoreSheet、reception、analysis、humanity（以及精神科 mentalExam）。`expertKB` 是纯手动编辑 Tab，`optimizeCurrentTab()` 也明确排除了它。

---

## 7. 训练端对接

### 7.1 加载链路

```
AICompanionDrawer.vue "专家点评" Tab
  → loadExpertData()
    → 先查 caseData?.expert（内存缓存）
    → 否则 fetch('/data/cases/{caseId}-expert.json')
      → 提取 { enabled, expertName, expertTitle, expertAvatar, expertTags, expertKB, reviewTitle }
```

### 7.2 LLM 注入点

`useExpertAgent.js` 的 `buildExpertSystemPrompt()` 将 `expertKB` 注入 LLM system prompt：

```javascript
if (expertData?.expertKB) {
  prompt += `以下是你的领域知识库，请基于此内容进行点评和回答：\n${expertData.expertKB}`
}
```

同时，`expertName`/`expertTitle` 用于设定 LLM 的第一人称角色身份。

### 7.3 完整消费流程

参考 [`DESIGN_专家AI智能体设计文档.md`](./DESIGN_专家AI智能体设计文档.md)，包含：
- 五层流水线：活动感知 → 意图分类 → 上下文组装 → 响应策略 → 智能建议
- 六个意图类型：`review_request`, `knowledge_question`, `procedural_guidance`, `comparison_request`, `cross_station_review`, `casual_chat`
- 各站预设推荐问题

---

## 8. 错误处理与边界情况

| 场景 | 处理方式 |
|------|---------|
| 头像文件类型不合法 | 阻止上传，提示"仅支持 JPG/PNG/GIF/WebP 格式" |
| 头像文件超过 2MB | 阻止上传，提示"图片大小不能超过 2MB" |
| 头像上传网络失败 | Data URL 已用于即时预览，上传失败不影响编辑体验 |
| 空标签文本提交 | 静默忽略 |
| 知识库字数不足 500 | 进度条显示红色警告色（不影响保存） |
| expertKB 字段为空字符串 | 保存时如果 enabled=false 且 expertKB 为空，不写入文件 |
| 旧数据 expertEnabled 字段名 | shared.js 加载时兼容 `expertEnabled` 和 `enabled` 两种字段名 |

---

## 9. 实现检查清单

- [ ] **Step 1**: 定义 `ExpertReviewConfig` 数据模型（7个字段）
- [ ] **Step 2**: 实现启用/禁用开关 UI（toggle switch 样式）
- [ ] **Step 3**: 实现专家基本信息表单（姓名输入、职称输入、点评标题输入）
- [ ] **Step 4**: 实现头像上传组件（点击触发 file input + 拖拽区域 + FileReader 预览 + 格式/大小校验）
- [ ] **Step 5**: 实现头像持久化上传（调用 `/api/case/upload-material` 接口）
- [ ] **Step 6**: 实现专家标签管理（输入框 + 回车/逗号添加 + 点击 × 删除 + 去重）
- [ ] **Step 7**: 实现知识库内容 textarea（placeholder 引导文字 + 建议字数提示）
- [ ] **Step 8**: 实现字数统计进度条（<500 红 / 500-2000 绿 / >2000 蓝）
- [ ] **Step 9**: 实现实时预览卡片（头像 + 姓名 + 职称 + 标签列表）
- [ ] **Step 10**: 实现 `updateField` 全量替换 emit 模式
- [ ] **Step 11**: 实现禁用状态空态面板
- [ ] **Step 12**: 在 CaseEditor 中集成 Tab、模板、保存逻辑
- [ ] **Step 13**: 在 `shared.js` 的 `createEmptyFormData()` 中添加默认值
- [ ] **Step 14**: 在 `shared.js` 的 `loadCaseDataFromFiles()` 中添加 `expert.json` 加载 + 字段映射
- [ ] **Step 15**: 确保 AI 生成流水线（genSteps / optimizeCurrentTab）排除 expertKB
- [ ] **Step 16**: 在训练端对接：`AICompanionDrawer.loadExpertData()` + `useExpertAgent.buildExpertSystemPrompt()`
- [ ] **Step 17**: 测试：新建启用/禁用、头像上传、标签增删、保存加载、训练端专家点评效果

---

## 10. 关键设计决策

### 为什么 expertKB 不纳入 AI 生成流水线？

专家知识库的内容是**专家个人见解和教学经验**的体现，具有主观性和个性化特征。AI 生成的内容无法替代真实专家的经验判断和教学风格。这确保"专家点评"的可信度和教学价值。

### 为什么使用全量替换的 v-model 模式？

ExpertReviewConfig 是一个内聚的配置对象，字段之间无独立更新场景（编辑器始终一次性展示全部字段）。全量替换避免了增量 patch 的复杂性，且与 CaseEditor 的 `formData.expertReview` 直接对应，保存时无需合并。

### 为什么头像先显示 Data URL 再异步上传？

用户期望即时反馈。FileReader 的 Data URL 渲染是同步的（~50ms），而网络上传可能需要数秒。先预览再上传确保编辑体验流畅，即使上传失败也不阻塞编辑。
