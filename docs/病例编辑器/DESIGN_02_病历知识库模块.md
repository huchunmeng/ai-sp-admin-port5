# 病历知识库模块设计文档

> **目标读者**：开发工程师 + AI 助手（开发者将使用 AI 助手解读本文档并在真实项目中复现功能）
> **版本**：v2.0
> **更新日期**：2026-08-01

---

## 1. 功能概述

病历知识库（MedicalRecordKB）是病例编辑器中的**只读浏览组件**，用于查看病例关联的真实医院病历文档。它是 CaseEditor 的**默认首Tab**，为病例编辑者提供原始病历参照。

### 1.1 核心能力

| 能力 | 描述 |
|------|------|
| 文档分类浏览 | 19种病历文档类型（入院记录、病程记录、手术记录等），按临床逻辑排序 |
| 搜索过滤 | 左侧栏支持按类型名称或 ftype 代码搜索 |
| 卡片展开/收起 | 每条记录可展开查看全文（预格式化文本），默认折叠状态 |
| 自动首选项 | 数据加载后自动选中第一个有记录的类型 |
| 纯展示 | 不涉及编辑、AI生成、用户输入——仅展示原始病历文本 |

### 1.2 用户交互流程

```
进入病例编辑器 → 默认显示病历知识库Tab →
  ├─ 左侧栏：浏览/搜索病历类型
  ├─ 点击类型 → 右侧显示该类型下的病历卡片列表
  └─ 点击卡片"展开"→ 查看完整病历内容
```

---

## 2. 架构总览

### 2.1 技术栈

```
Vue 3 SFC (<script setup> + Composition API)
Props-drive 纯展示组件（无 store 依赖，无 API 调用）
父组件 CaseEditor.vue 负责数据加载和持久化
shared.js 负责病例文件加载逻辑
```

### 2.2 文件清单

| 文件 | 职责 |
|------|------|
| `apps/admin/src/views/case-editor/MedicalRecordKB.vue` | 病历知识库浏览组件（~349行） |
| `apps/admin/src/views/case-editor/CaseEditor.vue` | 父组件——加载数据、传递 props、保存 |
| `apps/admin/src/views/case-editor/shared.js` | 病例数据加载层——从 JSON 文件加载 medicalRecords |

### 2.3 依赖关系图

```
CaseEditor.vue
  ├─ shared.js::loadCaseDataFromFiles(caseId)
  │     └─ fetch /data/cases/{caseId}-medicalRecords.json
  │           → formData.medicalRecords = { [ftype]: Record[] }
  │
  └─ MedicalRecordKB.vue
        └─ props: { records: formData.medicalRecords || {} }
              → 内部状态: searchText, selectedType, expanded
              → 无外部依赖, 无 emit
```

---

## 3. UI 布局规范

### 3.1 整体布局

```
┌──────────────────────────────────────────────────────────┐
│  CaseEditor 顶栏（Tab切换、保存、生成按钮等）               │
├────────────┬─────────────────────────────────────────────┤
│  左侧栏     │  主内容区                                    │
│  220px      │  flex: 1                                    │
│             │                                             │
│ ┌─────────┐│ ┌─────────────────────────────────────────┐ │
│ │搜索框    ││ │  入院记录                         共3条  │ │
│ ├─────────┤│ ├─────────────────────────────────────────┤ │
│ │入院记录 3││ │ ┌─────────────────────────────────────┐ │ │
│ │首次病程 1││ │ │ 📅 2026-05-13  👨‍⚕️ 杜瑞杰  📋 ZY01..│ │ │
│ │病程记录 6││ │ │                         [展开/收起]   │ │ │
│ │主治查房 7││ │ │ ┌─────────────────────────────────┐ │ │ │
│ │主任查房 4││ │ │ │ 主诉：头痛、意识模糊2小时...     │ │ │ │
│ │会诊记录 3││ │ │ │ （完整病历文本）                 │ │ │ │
│ │...       ││ │ │ └─────────────────────────────────┘ │ │ │
│ │          ││ │ └─────────────────────────────────────┘ │ │
│ └─────────┘│ │ ┌─────────────────────────────────────┐ │ │
│             │ │ │ 第二条病历卡片...                   │ │ │
│             │ │ └─────────────────────────────────────┘ │ │
│             │ └─────────────────────────────────────────┘ │
└─────────────┴─────────────────────────────────────────────┘
```

### 3.2 关键尺寸

- 左侧栏：`width: 220px; min-width: 220px`
- 整体最小高度：`min-height: calc(100vh - 340px)`
- 卡片内容区：展开 `max-height: 600px`，折叠 `max-height: 120px`
- 卡片折叠渐变遮罩：`height: 48px`，`linear-gradient(transparent, #fff)`

### 3.3 左侧导航项样式

```css
/* 默认：无背景，hover 浅蓝 */
.mrkb-nav-item { background: none; }
.mrkb-nav-item:hover { background: #eef2ff; }

/* 选中：主题色背景 + 右侧边框指示器 */
.mrkb-nav-item.active {
  background: var(--primary-light);
  color: var(--primary);
  font-weight: 600;
  border-right: 3px solid var(--primary);
}

/* 数量徽章：灰色圆角 */
.mrkb-nav-count { background: #e5e7eb; border-radius: 10px; }

/* 选中时徽章变蓝 */
.mrkb-nav-item.active .mrkb-nav-count { background: #c7d2fe; color: var(--primary); }
```

---

## 4. 数据模型

### 4.1 Props 接口

```typescript
interface MedicalRecordKBProps {
  records: Record<string, MedicalRecord[]>  // key = ftype 代码
}

interface MedicalRecord {
  id: number
  visitNo: string          // 就诊号
  doctorCode: string       // 医师代码
  ftype: string            // 文档类型代码
  content: string          // 病历全文（纯文本，含 \r\n 换行）
  createDate: string       // 创建日期 "2026-05-13 09:40:50"
  lastTime: string         // 最后修改时间
}
```

### 4.2 数据来源

病历数据存储为独立 JSON 文件：`/data/cases/{caseId}-medicalRecords.json`

```json
{
  "caseId": "IM-20260801-PCH",
  "records": {
    "In_Record": [
      {
        "id": 45032901,
        "visitNo": "ZY010101731900",
        "doctorCode": "杜瑞杰",
        "ftype": "In_Record",
        "content": "入院记录全文内容...",
        "createDate": "2026-05-13 09:40:50",
        "lastTime": "2026-05-13 09:40:50"
      }
    ],
    "FirstRecord": [ ... ],
    "NormalRecord": [ ... ]
  }
}
```

### 4.3 加载链路

```
CaseEditor.vue onMounted
  → shared.js loadCaseDataFromFiles(caseId)
    → fetch('/data/cases/{caseId}-medicalRecords.json')
      → 存入 formData.medicalRecords = json.records
        → 传递给 MedicalRecordKB :records="formData.medicalRecords || {}"
```

---

## 5. 病历文档类型定义

### 5.1 完整类型列表（按临床顺序）

```javascript
const FTYPE_LABELS = {
  'In_Record':              '入院记录',
  'FirstRecord':            '首次病程记录',
  'NormalRecord':           '病程记录',
  'AttendingInvestigate':   '主治医师查房',
  'DirectorInvestigate':    '主任医师查房',
  'Consultation_Record':    '会诊记录',
  'ShiftToRecord':          '转入记录',
  'TurnOutRecord':          '转出记录',
  'Preoperative_summary':   '术前小结',
  'Preoperative_discussion':'术前讨论',
  'Ops_Agree_Record':       '手术同意记录',
  'OpsSafeCheck':           '手术安全核查',
  'Operation_Record':       '手术记录',
  'OperRecord':             '操作记录',
  'OpsFirstRecord':         '术后首次病程',
  'Special_Check_Record':   '特殊检查记录',
  'LeaveHospitalRecord':    '出院前病程',
  'Out_Record':             '出院记录',
  'others':                 '其他记录'
}

const FTYPE_ORDER = [
  'In_Record', 'FirstRecord', 'NormalRecord',
  'AttendingInvestigate', 'DirectorInvestigate', 'Consultation_Record',
  'ShiftToRecord', 'TurnOutRecord',
  'Preoperative_summary', 'Preoperative_discussion', 'Ops_Agree_Record',
  'OpsSafeCheck', 'Operation_Record', 'OperRecord', 'OpsFirstRecord',
  'Special_Check_Record', 'LeaveHospitalRecord', 'Out_Record',
  'others'
]
```

### 5.2 排序逻辑

`FTYPE_ORDER` 数组定义固定的显示顺序。组件只显示 `props.records` 中实际存在且有数据的类型，缺失的类型自动跳过。

---

## 6. 组件内部逻辑

### 6.1 状态管理

| 状态 | 类型 | 说明 |
|------|------|------|
| `searchText` | `ref('')` | 搜索输入框绑定值 |
| `selectedType` | `ref('')` | 当前选中的 ftype |
| `expanded` | `ref(new Set())` | 已展开的卡片索引集合 |

### 6.2 计算属性

```javascript
// ftypeEntries: 从 FTYPE_ORDER 按序提取 records 中实际存在的类型
const ftypeEntries = computed(() => {
  const entries = []
  for (const ftype of FTYPE_ORDER) {
    const recs = props.records[ftype]
    if (recs && recs.length > 0) {
      entries.push({ ftype, label: FTYPE_LABELS[ftype] || ftype, count: recs.length })
    }
  }
  // 自动选中第一项
  if (entries.length > 0 && !selectedType.value) {
    selectedType.value = entries[0].ftype
  }
  return entries
})

// filteredTypes: 搜索过滤（按 label 或 ftype 代码匹配）
const filteredTypes = computed(() => {
  const q = searchText.value.trim().toLowerCase()
  if (!q) return ftypeEntries.value
  return ftypeEntries.value.filter(e =>
    e.label.toLowerCase().includes(q) || e.ftype.toLowerCase().includes(q)
  )
})

// currentLabel: 当前选中类型的中文名
const currentLabel = computed(() =>
  selectedType.value ? (FTYPE_LABELS[selectedType.value] || selectedType.value) : ''
)

// currentRecords: 当前选中类型的记录列表
const currentRecords = computed(() =>
  selectedType.value ? (props.records[selectedType.value] || []) : []
)
```

### 6.3 核心方法

```javascript
// 切换卡片展开/收起
function toggleExpand(idx) {
  const next = new Set(expanded.value)
  if (next.has(idx)) next.delete(idx)
  else next.add(idx)
  expanded.value = next
}
```

---

## 7. 卡片展示规范

### 7.1 卡片头部

显示三条元信息（有值才显示）：
- **日期**：`fa-calendar-alt` 图标 + `createDate` 字段
- **医师**：`fa-user-md` 图标 + `doctorCode` 字段
- **就诊号**：`fa-file-medical-alt` 图标 + `visitNo` 字段

### 7.2 卡片正文

```html
<pre class="mrkb-content-text">{{ rec.content }}</pre>
```

文本样式：
```css
.mrkb-content-text {
  white-space: pre-wrap;    /* 保留换行，自动换行 */
  word-break: break-all;    /* 长文本强制断行 */
  font-size: 13px;
  line-height: 1.8;
  font-family: inherit;     /* 继承系统字体 */
}
```

### 7.3 折叠/展开交互

- **折叠状态**：`max-height: 120px`，底部有48px渐变遮罩（`linear-gradient(transparent, #fff)`）提示有更多内容
- **展开状态**：`max-height: 600px`，可滚动查看全文
- 过渡动画：`transition: max-height 0.3s ease`

---

## 8. 在 CaseEditor 中的集成

### 8.1 模板集成

```vue
<div v-show="activeTab === 'medicalKB'" class="tab-panel" key="medicalKB">
  <MedicalRecordKB :records="formData.medicalRecords || {}" />
</div>
```

### 8.2 Tab 定义

```javascript
const tabs = computed(() => {
  const base = [
    { key: 'medicalKB', label: '病历知识库' },  // 默认第一个
    { key: 'basic', label: '基础信息' },
    { key: 'scoreSheet', label: 'v1.0 评分' },
    { key: 'reception', label: '接诊病人' },
    { key: 'analysis', label: '病例分析' },
    { key: 'humanity', label: '人文沟通' },
  ]
  if (isPsych.value) base.push({ key: 'mentalExam', label: '精神检查' })
  base.push(
    { key: 'materials', label: '检查素材' },
    { key: 'meta', label: '元信息' },
    { key: 'expertKB', label: '专家知识库' }
  )
  return base
})
const activeTab = ref('medicalKB')  // 默认展示病历知识库
```

### 8.3 持久化

```javascript
// CaseEditor.saveDraft() 中：
const medicalRecords = formData.value.medicalRecords
if (medicalRecords && Object.keys(medicalRecords).length > 0) {
  saveFile(caseId + '-medicalRecords.json', { caseId, records: medicalRecords })
}
```

---

## 9. 空状态处理

| 场景 | 显示内容 |
|------|---------|
| `records` 为空对象 `{}` | 左侧栏无任何类型项，右侧显示 "请从左侧菜单选择病历字段查看" + 文件夹图标 |
| 搜索无匹配 | 左侧栏显示 "无匹配字段" |
| 选中类型但该类型下无记录 | 右侧显示 "暂无记录" |

---

## 10. 实现检查清单

- [ ] **Step 1**: 定义 `FTYPE_LABELS` 和 `FTYPE_ORDER` 常量（19种病历文档类型）
- [ ] **Step 2**: 实现 `ftypeEntries` 计算属性——从 props.records 提取存在的类型并按 FTYPE_ORDER 排序
- [ ] **Step 3**: 实现自动首选项逻辑：有数据时自动选中第一个类型
- [ ] **Step 4**: 搭建左右分栏布局（220px 侧栏 + flex 主内容区）
- [ ] **Step 5**: 实现左侧栏：搜索框 + 类型导航列表（含数量徽章）
- [ ] **Step 6**: 实现 `filteredTypes` 搜索过滤逻辑（匹配 label 和 ftype）
- [ ] **Step 7**: 实现右侧内容区：标题 + 卡片列表
- [ ] **Step 8**: 实现卡片头部：日期/医师/就诊号元信息
- [ ] **Step 9**: 实现卡片正文：`<pre>` 标签展示 `content` 字段
- [ ] **Step 10**: 实现 `toggleExpand` 折叠/展开 + 渐变遮罩
- [ ] **Step 11**: 处理三种空状态（无数据、搜索无匹配、类型无记录）
- [ ] **Step 12**: 在 CaseEditor 中集成：Tab 定义、模板渲染、Props 传递
- [ ] **Step 13**: 在 `shared.js` 的 `loadCaseDataFromFiles` 中添加 `medicalRecords.json` 加载逻辑
- [ ] **Step 14**: 在 `createEmptyFormData()` 中初始化 `medicalRecords: {}`
- [ ] **Step 15**: 在 `saveDraft()` 中添加 medicalRecords 持久化逻辑

---

## 11. 关键设计决策

### 为什么是只读组件？

病历知识库的定位是**原始参照资料**，不是编辑对象。病例编辑者需要参照真实病历文档来编辑病例的各个模块（接诊、分析、人文沟通等），但不应修改原始病历内容。数据导入由独立的病历导入流程处理。

### 为什么使用 ftype 英文代码而非中文作为 key？

1. 与医院 HIS 系统的数据格式保持一致
2. 避免中文编码问题
3. 可通过 `FTYPE_LABELS` 映射灵活切换显示语言

### 为什么卡片默认折叠？

部分病历文档（如入院记录、手术记录）可能长达数千字。默认折叠（120px + 渐变遮罩）避免页面过长，用户按需展开。
