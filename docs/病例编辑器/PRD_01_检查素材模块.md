# 检查素材模块 PRD

## 1. 背景与目标

精品病例需要补充多媒体素材（图片/视频/音频/表单），让SP在问诊和查体过程中能够出示真实的检查结果，增强训练的真实感和沉浸度。

- 这是一个**可选模块**，仅精品病例配置，普通病例不受影响
- 独立于元数据，作为与 basic/reception/analysis 平级的病例数据模块
- 素材需绑定**触发条件**（关键词），让AI-SP知道何时出示
- 出示模式固定为 `on_ask`（考生说中关键词才出示），不设 mode 选择

## 2. 数据模型

### 2.1 文件组织

```
apps/admin/public/data/cases/{caseId}/
├── {caseId}-basic.json
├── {caseId}-reception.json
├── {caseId}-analysis.json
├── {caseId}-humanity.json
├── {caseId}-meta.json
├── {caseId}-scoreSheet.json
├── {caseId}-materials.json        ← 素材元数据
└── materials/                      ← 实际文件存放
    ├── chest_ct.jpg
    ├── femoral_test.mp4
    └── ...
```

### 2.2 `{caseId}-materials.json` 结构

```json
{
  "case_id": "IM-20240520-A1B2",
  "items": [
    {
      "id": "mat_3f7a",
      "type": "image",
      "filename": "chest_ct.jpg",
      "itemName": "胸部CT平扫",
      "filePath": "/data/cases/IM-20240520-A1B2/materials/chest_ct.jpg",
      "category": "previous",
      "subcategory": "imaging",
      "sourceHospital": "XX市人民医院",
      "examDate": "2024-05-15",
      "description": "胸部CT平扫：左上肺见约8mm结节影",
      "phase": "history_taking",
      "mode": "on_ask",
      "keywords": ["CT", "拍片子", "之前检查", "做过什么检查"],
      "semantic_hints": ["之前有带检查结果来吗？"],
      "spVerbal": "这是上个月在人民医院做的胸部CT，您看看。"
    }
  ]
}
```

### 2.3 字段说明

**文件字段：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 唯一标识，生成规则 `mat_` + 时间戳36进制 + 随机4位 |
| `type` | enum | `image` / `video` / `audio` / `pdf` / `form`，由文件扩展名自动推断 |
| `filename` | string | 原始文件名 |
| `itemName` | string | 检查项目名称（如"胸部CT平扫"），卡片主标题 |
| `filePath` | string | 上传后的持久化访问路径（`/data/cases/{caseId}/materials/{filename}`） |
| `category` | enum | `previous`=既往外院检查 / `current`=本次本院检查 |
| `subcategory` | enum | `physical` / `lab` / `imaging` / `special` / `other` |
| `sourceHospital` | string | 来源医院（选填，previous 时推荐填写） |
| `examDate` | string | 检查日期（选填） |
| `description` | string | 检查结果描述文本 |

**触发字段：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `phase` | enum | 素材所属阶段：`history_taking` / `physical_exam` / `auxiliary_exam` |
| `keywords` | string[] | 候选人口语关键词，命中即触发（标签输入，回车添加） |
| `semantic_hints` | string[] | SP可主动抛出的话术引导（标签输入） |
| `mode` | enum | 固定 `on_ask`，不提供选择 |
| `spVerbal` | string | SP出示素材时的口头描述 |

**临时字段（不持久化）：**

| 字段 | 说明 |
|------|------|
| `_preview` | 文件选择后在当前会话内的 base64 dataURL 预览，仅 image 类型 |
| `_file` | 新选择的 File 对象引用，仅上传前存在 |

## 3. 编辑器设计

### 3.1 位置

`CaseEditor.vue` 标签栏第6个标签页（basic → scoreSheet → reception → analysis → humanity → **materials** → meta）。

组件：`apps/admin/src/views/case-editor/MaterialsEditor.vue`。

### 3.2 整体布局

- 无素材 → 空状态提示 + 两个"添加素材"按钮（既往/本次各一）
- 有素材 → 按 category 分两组卡片网格展示

```
┌─ 检查素材（选填，精品病例适用）───────────────────┐
│                                                    │
│  ┌ 既往检查（外院） — 问诊时考生追问后出示 ──────┐ │
│  │ ┌──────┐ ┌──────┐ ┌──────┐ ┌────────────┐   │ │
│  │ │ 🖼️   │ │ 📄   │ │ 🎬   │ │ ➕ 添加素材  │   │ │
│  │ │CT片  │ │化验单│ │B超视频│ │            │   │ │
│  │ │5/15  │ │5/10  │ │4/28   │ │            │   │ │
│  │ └──────┘ └──────┘ └──────┘ └────────────┘   │ │
│  └──────────────────────────────────────────────┘ │
│                                                    │
│  ┌ 本次检查（体格+辅助） — 查体/开检查时出示 ────┐ │
│  │ ┌──────┐ ┌──────┐ ┌────────────┐             │ │
│  │ │ 🎬   │ │ 📊   │ │ ➕ 添加素材  │             │ │
│  │ │查体  │ │心电图│ │            │             │ │
│  │ └──────┘ └──────┘ └────────────┘             │ │
│  └──────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────┘
```

### 3.3 素材卡片

- 缩略图：图片类型显示实际图片（`filePath` 或 `_preview`），其他类型显示类型图标（Font Awesome）
- 类型徽章（图片/视频/音频/PDF/表单）+ 检查日期
- 卡片底部：`itemName`（主标题）
- 点击 → 编辑弹窗

### 3.4 素材编辑弹窗

三区布局：

1. **文件区**：拖拽/点击上传，支持 jpg/png/mp4/mp3/pdf/dcm，图片自动预览
2. **基本信息区**：分类(既往/本次)、子类别(体格/检验/影像/特殊/其他)、检查项目名称、来源医院(选填)、检查日期(选填)、结果描述
3. **触发条件区**：所属阶段(问诊/体格检查/辅助检查)、触发关键词(标签输入+回车)、引导话术(标签输入+回车)、SP口头描述

弹窗 z-index: 500（低于批注工具）。编辑时已有文件不重新上传，仅新选文件触发上传。

### 3.5 数据加载与保存

**加载**（`shared.js` → `loadCaseDataFromFiles()`）：
- 7 个文件并行 fetch：basic / reception / analysis / humanity / meta / scoreSheet / materials
- materials.json 不存在 → `examinationMaterials` 设为 `[]`

**保存**（`CaseEditor.vue` → `saveDraft()`）：
- 有素材 → `POST /api/case/save-file`，fileName=`{caseId}-materials.json`
- 保存前自动剥离 `_preview` / `_file` 临时字段，仅保留持久化字段
- 无素材 → 跳过

**文件上传**（弹窗保存时）：
- 新选文件 → `POST /api/case/upload-material`，body: `{ caseId, filename, data: "<base64>" }`
- 写入 `public/data/cases/{caseId}/materials/{filename}`
- 返回 `{ path, filename }`，前端存入 `filePath`

## 4. 文件服务

### 4.1 上传

```
POST /api/case/upload-material
Content-Type: application/json

{ "caseId": "IM-20240520-A1B2", "filename": "chest_ct.jpg", "data": "data:image/jpeg;base64,..." }
```

- 存储路径：`apps/admin/public/data/cases/{caseId}/materials/{filename}`
- 返回：`{ ok: true, path: "/data/cases/{caseId}/materials/{filename}", filename }`

### 4.2 元数据保存（复用已有端点）

```
POST /api/case/save-file
Content-Type: application/json

{ "caseId": "...", "fileName": "IM-20240520-A1B2-materials.json", "data": { "case_id": "...", "items": [...] } }
```

### 4.3 静态访问

文件在 `public/data/cases/` 下，admin 端直接通过 `/data/cases/{caseId}/materials/{filename}` 访问。

app-training (port 5004) 和 training (port 5001) 通过 vite.config.js 的中间件，将 admin 的 `public/data/cases/` 挂载到自身的 `/data/cases` 路径，实现跨端共享。

## 5. 训练端集成

### 5.1 实现范围

- **app-training 端**（已完成）：HistoryTaking.vue + PhysicalExam.vue
- **training 端**：依赖 AI-SP 后端，素材匹配逻辑应在 AI 端处理（PRD 第5.2节描述）

### 5.2 app-training 端已实现

```
考生输入
  → HistoryTaking.generateResponse() 生成文本回复
  → matchMaterials(input) 关键词匹配：
     筛选 phase === 'history_taking' 的素材
     命中任一 keyword → 附加到消息
  → SP 气泡中渲染素材卡片（缩略图 + 名称 + 描述）
  → 点击卡片 → window.open 打开原文件
```

PhysicalExam 同理，筛选 `phase === 'physical_exam'` / `'auxiliary_exam'`。

### 5.3 素材气泡渲染

- **图片**：聊天气泡内嵌 40×40 缩略图，点击全屏预览
- **视频/音频/PDF/表单**：气泡内嵌类型图标 + 文件名 + 描述
- 所有类型点击新窗口打开原始文件

### 5.4 素材加载

页面 `onMounted` 时异步 fetch `data/cases/{caseId}/{caseId}-materials.json`，失败静默（无素材的病例不受影响）。

## 6. AI 生成集成

> ⬜ 阶段 E — 待实现

在病例生成流水线中，素材模块作为可选步骤。AI 产出素材元数据（JSON），素材文件本身由人工后续补充。

## 7. 与现有模块的关系

| 模块 | 关系 |
|------|------|
| basic.json | 独立，不嵌入。basic 中的文本字段不变 |
| reception.json | 素材的 `intent` 可被 qa_script 引用 |
| meta.json | 独立，素材不属于元信息 |
| physical_exam_result_templates | `intent` 对齐，素材作为文本结果的增强版 |

## 8. 实现阶段

| 阶段 | 内容 | 状态 |
|------|------|------|
| A | 数据模型定义 + `loadCaseDataFromFiles` 扩展（`shared.js`） | ✅ 完成 |
| B | MaterialsEditor.vue 编辑器组件 + CaseEditor.vue 加标签 | ✅ 完成 |
| C | 文件上传 API（ai-gen-plugin.js + mock-gen.js）+ 文件存储 | ✅ 完成（JSON+base64方式） |
| D | 训练端素材气泡渲染（app-training HistoryTaking + PhysicalExam） | ✅ 完成 |
| E | AI 生成提示词（素材元数据产出） | ⬜ 待实现 |
