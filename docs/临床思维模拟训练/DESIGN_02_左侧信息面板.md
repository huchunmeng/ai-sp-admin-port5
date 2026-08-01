# AI-SP 左侧信息面板 — 患者信息与操作记录设计文档

> 版本：v1.0 | 日期：2026-08-01
>
> 本文档完整描述临床思维模拟训练中左侧信息面板系统的设计。包括：患者信息展示、浮动面板、操作记录面板、数据提取器、面板集成模式、CSS规范。
> 文档目标是：交给AI coding助手后，可直接根据本文档构建和复现全部左侧面板功能。
>
> 相关文档：
> - `DESIGN_01_架构与导航.md` — 整体架构与导航
> - `DESIGN_03_AI智能体.md` — AI伴学 + 专家点评智能体

---

## 目录

1. [系统概览](#1-系统概览)
2. [PatientInfoPanel — 患者信息共享组件](#2-patientinfopanel--患者信息共享组件)
3. [FloatInfoPanel — 浮动信息面板](#3-floatinfopanel--浮动信息面板)
4. [StationRecordPanel — 操作记录渲染组件](#4-stationrecordpanel--操作记录渲染组件)
5. [useOperationLog — 操作记录提取器](#5-useoperationlog--操作记录提取器)
6. [固定面板集成模式](#6-固定面板集成模式)
7. [病例数据归一化（c computed）](#7-病例数据归一化c-computed)
8. [工具函数](#8-工具函数)
9. [CSS规范](#9-css规范)
10. [字段不一致说明](#10-字段不一致说明)
11. [设计决策记录](#11-设计决策记录)

---

## 1. 系统概览

### 1.1 两种面板集成方式

```
┌──────────────────────────────────────────────────────────┐
│              左侧面板系统有两种集成方式                       │
│                                                          │
│  固定面板型 (35%宽度)           浮动面板型 (绝对定位)         │
│  ┌─────────────────┐          ┌──────────────┐           │
│  │ panel-tabs      │          │ 圆形触发按钮   │           │
│  │ ┌──┬──┬──┬──┬──┐│          │  top:60px     │           │
│  │ │信息│笔记│记录│..│││          │  left:16px    │           │
│  │ └──┴──┴──┴──┴──┘││          │              │           │
│  │ panel-content   ││          │ 浮层面板      │           │
│  │ ┌─────────────┐ ││          │ width:390px   │           │
│  │ │PatientInfo  │ ││          │ ┌──────────┐ │           │
│  │ │Panel        │ ││          │ │Tab: 信息  │ │           │
│  │ └─────────────┘ ││          │ │ 笔记 接诊 │ │           │
│  └─────────────────┘│          │ │ 辅检诊断… │ │           │
│                      │          │ └──────────┘ │           │
│  用于: Diagnosis,    │          └──────────────┘           │
│  AncillaryTests,     │                                     │
│  TreatmentPlan,      │          用于: HistoryTaking,       │
│  MedicalRecord,      │          PhysicalExam,              │
│  PreliminaryDiag     │          MentalExam,                │
│                      │          HumanisticComm              │
└──────────────────────────────────────────────────────────┘
```

### 1.2 组件关系

```
PatientInfoPanel.vue          ← 基础原子组件（所有面板共用）
    │
    ├── 固定面板型视图直接引用
    │   Diagnosis.vue / AncillaryTests.vue / ...
    │
    └── FloatInfoPanel.vue 引用
            └── HistoryTaking.vue / PhysicalExam.vue / ...

StationRecordPanel.vue        ← 操作记录渲染组件
    │
    ├── 固定面板型视图引用
    └── FloatInfoPanel.vue 内联引用（重复了渲染逻辑，注意同步维护）

useOperationLog.js            ← 数据提取器（两个面板方案共用）
```

---

## 2. PatientInfoPanel — 患者信息共享组件

### 2.1 文件

**`apps/training/src/components/PatientInfoPanel.vue`**

### 2.2 Props

```typescript
interface PatientInfoPanelProps {
  patient: {
    name?: string
    sex?: string               // 部分视图使用 sex
    gender?: string            // 部分视图使用 gender（组件内用 `sex || gender` 兼容）
    age?: string | number
    avatar?: string            // 头像URL或emoji字符
    occupation?: string        // 可选，仅部分视图传入
  }
  vitals: Record<string, string> | null  // { temp, pulse, rr, bp, spo2 }
  chiefComplaint: string
  lang: 'zh' | 'en'
  hideName: boolean            // 考试模式下隐藏患者姓名
}
```

### 2.3 模板结构

```html
<div class="patient-info-panel">
  <!-- 1. 患者基本信息行 -->
  <div class="patient-info-mini">
    <div class="mini-name">
      <!-- 头像：URL图片 或 emoji字符 或 无 -->
      <span class="patient-thumb">
        <img v-if="isImageUrl(patient.avatar)" :src="patient.avatar" />
        <span v-else-if="patient.avatar">{{ patient.avatar }}</span>
      </span>
      <!-- 姓名（考试模式可隐藏） -->
      <span v-if="!hideName">{{ patient.name }}</span>
    </div>
    <div class="mini-row">
      <span>{{ patient.sex || patient.gender }}</span>
      <span>{{ patient.age }}{{ lang === 'zh' ? '岁' : 'y' }}</span>
      <span v-if="patient.occupation">{{ patient.occupation }}</span>
    </div>
  </div>

  <!-- 2. 主诉 -->
  <div class="chief-complaint" v-if="chiefComplaint">
    <strong>{{ lang === 'zh' ? '主诉：' : 'CC: ' }}</strong>{{ chiefComplaint }}
  </div>

  <!-- 3. 生命体征网格 -->
  <div class="vital-mini" v-if="vitals">
    <div class="vm-item" v-for="(val, key) in vitals" :key="key">
      <div class="vm-val">{{ val }}</div>
      <div class="vm-label">{{ vitalLabels[key] || key }}</div>
    </div>
  </div>

  <!-- 4. 扩展内容插槽 -->
  <slot></slot>
</div>
```

### 2.4 逻辑

```typescript
import { computed } from 'vue'

const props = defineProps({ /* ... 见上 */ })

const vitalLabels = computed(() => ({
  temp: props.lang === 'zh' ? '体温' : 'Temp',
  pulse: props.lang === 'zh' ? '脉搏' : 'Pulse',
  rr: props.lang === 'zh' ? '呼吸' : 'RR',
  bp: props.lang === 'zh' ? '血压' : 'BP',
  spo2: 'SpO₂',
}))
```

### 2.5 头像判断逻辑

```typescript
// 内联在模板中：
// img 显示条件：avatar 以 /images/、images/ 或 http 开头
// 否则作为纯文本 emoji 渲染
patient.avatar
  && (patient.avatar.startsWith('/images/')
    || patient.avatar.startsWith('images/')
    || patient.avatar.startsWith('http'))
```

### 2.6 CSS

```css
.patient-info-panel { font-size: 13px; }

.patient-info-mini { margin-bottom: 12px; }
.mini-name { font-weight: 600; font-size: 14px; display: flex; align-items: center; gap: 8px; }
.mini-row { font-size: 12px; color: #909399; margin-top: 4px; display: flex; gap: 8px; }

.patient-thumb img { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; }
.patient-thumb span {
  width: 32px; height: 32px; border-radius: 50%;
  background: #dce3ea;
  display: flex; align-items: center; justify-content: center;
  font-size: 16px;
}

.vital-mini { display: flex; flex-wrap: nowrap; gap: 4px; margin: 12px 0; }
.vm-item { text-align: center; background: #f5f7fa; border-radius: 6px; padding: 4px 6px; flex: 1; min-width: 0; }
.vm-val { font-weight: 700; font-size: 11px; color: #303133; word-break: break-all; }
.vm-label { font-size: 8px; color: #909399; }

.chief-complaint { font-size: 13px; color: #909399; line-height: 1.6; }
```

---

## 3. FloatInfoPanel — 浮动信息面板

### 3.1 文件

**`apps/training/src/components/FloatInfoPanel.vue`**

### 3.2 用途

对话类考站（病史采集/体格检查/精神检查/人文沟通）使用，作为全屏对话界面的补充信息层。

### 3.3 Props

```typescript
interface FloatInfoPanelProps {
  patient: object              // 传递给 PatientInfoPanel
  vitals: object               // 传递给 PatientInfoPanel
  chiefComplaint: string       // 传递给 PatientInfoPanel
  lang: string                 // 传递给 PatientInfoPanel
  hideName: boolean            // 传递给 PatientInfoPanel
}
```

### 3.4 Slots

| Slot | 说明 |
|------|------|
| `info-extra` | 插入到患者信息 Tab 的 PatientInfoPanel 内部（`<slot>` 位置），用于 PreliminaryDiag 等页面的额外查体结果 |
| `notes-content` | 笔记 Tab 的内容 |

### 3.5 模板结构

```html
<!-- 1. 触发按钮：圆形，绝对定位 -->
<div class="float-info-trigger" :class="{ active: show }" @click="show = !show"
     title="患者信息 / 笔记">
  <i class="fa-solid fa-circle-info"></i>
</div>

<!-- 2. 展开面板：显示时渲染 -->
<div class="float-info-overlay" v-if="show">
  <!-- Tab 切换头 -->
  <div class="float-info-header" :class="{ flow: isFlowMode }">
    <span class="float-tab" :class="{ active: activeTab === 'info' }"
          @click="activeTab = 'info'">{{ isZh ? '患者信息' : 'Info' }}</span>
    <span class="float-tab" :class="{ active: activeTab === 'notes' }"
          @click="activeTab = 'notes'">{{ isZh ? '笔记' : 'Notes' }}</span>
    <!-- flow-only tabs -->
    <span v-if="isFlowMode" class="float-tab" ... @click="activeTab = 'consultation'">接诊 / Hx</span>
    <span v-if="isFlowMode" class="float-tab" ... @click="activeTab = 'ancillaryTests'">辅检 / Tests</span>
    <span v-if="isFlowMode" class="float-tab" ... @click="activeTab = 'diagnosis'">诊断 / Dx</span>
    <span v-if="isFlowMode" class="float-tab" ... @click="activeTab = 'treatmentPlan'">治疗 / Tx</span>
    <span v-if="isFlowMode" class="float-tab" ... @click="activeTab = 'medicalRecord'">病历 / MR</span>
    <span class="float-close" @click="show = false"><i class="fa-solid fa-xmark"></i></span>
  </div>

  <!-- 患者信息 -->
  <div class="float-info-body" v-show="activeTab === 'info'">
    <PatientInfoPanel :patient="patient" :vitals="vitals" :chiefComplaint="chiefComplaint"
                       :lang="lang" :hideName="hideName">
      <slot name="info-extra"></slot>
    </PatientInfoPanel>
  </div>

  <!-- 笔记 -->
  <div class="float-info-body" v-show="activeTab === 'notes'">
    <slot name="notes-content"></slot>
  </div>

  <!-- 接诊记录（flow-only） -->
  <div v-if="isFlowMode" class="float-info-body" v-show="activeTab === 'consultation'">
    <!-- 合并 historyTaking + physicalExam 的对话消息，最近50条 -->
    <div v-if="consultationMessages.length" class="chat-history">
      <div v-for="(m, i) in consultationMessages" :key="'cm'+i"
           class="chat-row" :class="m.role === 'user' ? 'user' : 'sp'">
        <span class="chat-role">{{ m.role === 'user' ? '学员/Me' : 'SP' }}</span>
        <span class="chat-text">{{ m.content }}</span>
      </div>
    </div>
    <div v-else class="empty-hint">暂无接诊记录 / No consultation records</div>
  </div>

  <!-- 辅检/诊断/治疗/病历（flow-only，各一个 v-show block） -->
  <!-- 渲染逻辑与 StationRecordPanel 重复，见第4节注意事项 -->
</div>
```

### 3.6 逻辑

```typescript
import { ref, computed } from 'vue'
import { useTrainingStore } from '@/stores/training'
import PatientInfoPanel from '@/components/PatientInfoPanel.vue'
import { buildOperationLog } from '@/composables/useOperationLog'

const store = useTrainingStore()
const show = ref(false)
const activeTab = ref('info')

const isZh = computed(() => (store.lang || 'zh') === 'zh')
const isFlowMode = computed(() => (store.stationFlow?.stations?.length || 0) > 1)

const logEntries = computed(() => buildOperationLog(store.trainingSession))
function getEntry(key) { return logEntries.value.find(e => e.key === key) }

const ancillaryEntry = computed(() => getEntry('ancillaryTests'))
const diagEntry = computed(() => getEntry('diagnosis'))
const txEntry = computed(() => getEntry('treatmentPlan'))
const mrEntry = computed(() => getEntry('medicalRecord'))

// 接诊记录：合并病史采集 + 体格检查的对话
const consultationMessages = computed(() => {
  const sess = store.trainingSession || {}
  const htMsgs = (sess.historyTaking?.messages || []).map(m => ({ ...m, stage: 'history' }))
  const peMsgs = (sess.physicalExam?.messages || []).map(m => ({ ...m, stage: 'exam' }))
  return [...htMsgs, ...peMsgs]
    .filter(m => m.content && (m.role === 'user' || m.role === 'sp'))
    .slice(-50)
})
```

### 3.7 CSS

```css
.float-info-trigger {
  position: absolute; top: 60px; left: 16px;
  width: 40px; height: 40px;
  background: rgba(255,255,255,0.94); border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; z-index: 10;
  box-shadow: 0 2px 12px rgba(0,0,0,0.15);
  font-size: 20px; color: #409EFF;
  transition: all .2s;
  border: 1px solid rgba(0,0,0,0.06);
}
.float-info-trigger:hover { transform: scale(1.08); box-shadow: 0 4px 16px rgba(0,0,0,0.18); }
.float-info-trigger.active { background: #409EFF; color: #fff; border-color: #409EFF; }

.float-info-overlay {
  position: absolute; top: 60px; left: 64px;
  width: 390px; max-height: calc(100vh - 8px);
  background: rgba(255,255,255,0.96); border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
  overflow: hidden; z-index: 10;
  display: flex; flex-direction: column;
  backdrop-filter: blur(8px);
}

.float-info-header {
  display: flex; align-items: center;
  border-bottom: 1px solid #EBEEF5;
  flex-shrink: 0; overflow-x: auto;
}
.float-info-header.flow .float-tab { padding: 10px 5px; font-size: 11px; }

.float-tab {
  flex: 1; text-align: center; padding: 12px 6px; font-size: 13px;
  cursor: pointer; color: #909399; transition: all .15s; white-space: nowrap;
}
.float-tab.active { color: #409EFF; border-bottom: 2px solid #409EFF; }

.float-close { padding: 8px 12px; cursor: pointer; color: #909399; font-size: 14px; flex-shrink: 0; }
.float-close:hover { color: #F56C6C; }

.float-info-body { padding: 12px; overflow-y: auto; flex: 1; }
```

### 3.8 注意事项

> **警告**：FloatInfoPanel 中的操作记录渲染逻辑（辅检/诊断/治疗/病历）与 `StationRecordPanel.vue` 是**重复的**。修改一处时需要同步修改另一处。这是已知的技术债务。

---

## 4. StationRecordPanel — 操作记录渲染组件

### 4.1 文件

**`apps/training/src/components/StationRecordPanel.vue`**

### 4.2 Props

```typescript
interface StationRecordPanelProps {
  entry: LogEntry | null | undefined   // 来自 buildOperationLog 的条目
  isZh: boolean                        // 中英文标识
}
```

### 4.3 LogEntry 类型

```typescript
interface LogEntry {
  key: string            // 'historyTaking' | 'physicalExam' | 'ancillaryTests' | 'diagnosis' | 'treatmentPlan' | 'medicalRecord'
  label: string          // 中文标签：'问诊记录'
  labelEn: string        // 英文标签：'Consultation'
  icon: string           // Font Awesome 类名：'fa-comments'
  hasData: boolean       // 是否有数据
  summary: string        // 一行摘要
  detail: object | null  // 详细数据，结构随 key 不同而变化
}
```

### 4.4 各类型 detail 结构

```typescript
// key === 'ancillaryTests'
interface AncillaryDetail {
  selected: string[]                    // 所有检查项目名称
  results: Array<{ name: string; result: string }>  // 已查看结果
  totalSelected: number
  totalViewed: number
}

// key === 'diagnosis'
interface DiagnosisDetail {
  preliminary: string                   // 初步诊断
  differential: string                  // 鉴别诊断
  basis: string                         // 诊断依据
  differentialDetails: Array<{ name: string; evidence: string }>  // 鉴别诊断详情列表
}

// key === 'treatmentPlan'
interface TreatmentPlanDetail {
  content: string                       // 治疗计划内容（截断500字）
  fullLength: number                    // 总字数
}

// key === 'medicalRecord'
interface MedicalRecordDetail {
  content: string                       // 病历内容（截断500字）
  fullLength: number                    // 总字数
}
```

### 4.5 模板结构

```html
<div class="station-record-panel">
  <template v-if="entry?.hasData">

    <!-- 辅检记录 -->
    <template v-if="entry.key === 'ancillaryTests'">
      <div class="detail-section">
        <div class="detail-label">{{ isZh ? '已选检查' : 'Selected Tests' }}（{{ entry.detail.totalSelected }}）</div>
        <div class="detail-item" v-for="(s, i) in entry.detail.selected" :key="'s'+i">{{ s }}</div>
      </div>
      <div class="detail-section" v-if="entry.detail.results.length">
        <div class="detail-label">{{ isZh ? '检查结果' : 'Results' }}</div>
        <div v-for="(r, i) in entry.detail.results" :key="'r'+i" class="result-item">
          <div class="detail-value" style="font-weight:600;">{{ r.name }}</div>
          <div class="detail-text">{{ r.result }}</div>
        </div>
      </div>
    </template>

    <!-- 诊断记录 -->
    <template v-if="entry.key === 'diagnosis'">
      <div class="detail-section" v-if="entry.detail.preliminary">
        <div class="detail-label">{{ isZh ? '初步诊断' : 'Preliminary Dx' }}</div>
        <div class="detail-value">{{ entry.detail.preliminary }}</div>
      </div>
      <div class="detail-section" v-if="entry.detail.basis">
        <div class="detail-label">{{ isZh ? '诊断依据' : 'Basis' }}</div>
        <div class="detail-text">{{ entry.detail.basis }}</div>
      </div>
      <div class="detail-section" v-if="entry.detail.differential">
        <div class="detail-label">{{ isZh ? '鉴别诊断' : 'Differential Dx' }}</div>
        <div class="detail-value">{{ entry.detail.differential }}</div>
        <div v-if="entry.detail.differentialDetails.length" style="margin-top:8px;">
          <div v-for="(d, i) in entry.detail.differentialDetails" :key="'dd'+i" class="result-item">
            <div class="detail-value" style="font-weight:600;">{{ d.name }}</div>
            <div class="detail-text" v-if="d.evidence">{{ d.evidence }}</div>
          </div>
        </div>
      </div>
    </template>

    <!-- 治疗记录 -->
    <template v-if="entry.key === 'treatmentPlan'">
      <div class="detail-section">
        <div class="detail-label">{{ isZh ? '治疗计划内容' : 'Plan Content' }}</div>
        <div class="detail-text pre-wrap">{{ entry.detail.content }}</div>
        <div v-if="entry.detail.fullLength > 500" class="detail-hint">
          {{ isZh ? '（共' + entry.detail.fullLength + '字）' : '(' + entry.detail.fullLength + ' chars total)' }}
        </div>
      </div>
    </template>

    <!-- 病历记录 -->
    <template v-if="entry.key === 'medicalRecord'">
      <div class="detail-section">
        <div class="detail-label">{{ isZh ? '病历内容' : 'Record Content' }}</div>
        <div class="detail-text pre-wrap">{{ entry.detail.content }}</div>
        <div v-if="entry.detail.fullLength > 500" class="detail-hint">
          {{ isZh ? '（共' + entry.detail.fullLength + '字）' : '(' + entry.detail.fullLength + ' chars total)' }}
        </div>
      </div>
    </template>

  </template>

  <!-- 无数据 -->
  <div v-else class="empty-hint">{{ emptyText }}</div>
</div>
```

### 4.6 空状态文案映射

```typescript
const emptyText = computed(() => {
  if (!props.entry) return ''
  const map: Record<string, string> = {
    ancillaryTests: props.isZh ? '暂无辅检记录' : 'No test records',
    diagnosis: props.isZh ? '暂无诊断记录' : 'No diagnosis records',
    treatmentPlan: props.isZh ? '暂无治疗记录' : 'No treatment records',
    medicalRecord: props.isZh ? '暂无病历记录' : 'No medical records',
  }
  return map[props.entry.key] || ''
})
```

### 4.7 CSS

```css
.detail-section { margin-bottom: 10px; }
.detail-label {
  font-size: 11px; font-weight: 600; color: #909399;
  margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.3px;
}
.detail-value { font-size: 13px; color: #303133; line-height: 1.6; }
.detail-text {
  font-size: 12px; color: #606266; line-height: 1.6;
  white-space: pre-wrap; word-break: break-word;
}
.detail-text.pre-wrap { white-space: pre-wrap; }
.detail-item {
  font-size: 12px; color: #606266;
  padding: 3px 0 3px 8px;
  border-left: 2px solid #EBEEF5;
  margin-bottom: 2px;
}
.result-item {
  padding: 6px 8px; background: #fafafa;
  border-radius: 6px; margin-bottom: 4px;
}
.detail-hint { font-size: 11px; color: #909399; margin-top: 4px; font-style: italic; }
.empty-hint { text-align: center; color: #C0C4CC; padding: 20px 0; font-size: 13px; }
```

---

## 5. useOperationLog — 操作记录提取器

### 5.1 文件

**`apps/training/src/composables/useOperationLog.js`**

### 5.2 导出

```typescript
export function buildOperationLog(trainingSession: TrainingSession): LogEntry[]

// 内部导出（供调试）
export const EXTRACTORS: Record<string, ExtractorFn>
```

### 5.3 考站顺序常量

```typescript
const STATION_ORDER = [
  { key: 'historyTaking',   label: '问诊记录',  labelEn: 'Consultation',    icon: 'fa-comments' },
  { key: 'physicalExam',    label: '查体记录',  labelEn: 'Physical Exam',   icon: 'fa-stethoscope' },
  { key: 'ancillaryTests',  label: '辅检记录',  labelEn: 'Ancillary Tests', icon: 'fa-flask' },
  { key: 'diagnosis',       label: '诊断记录',  labelEn: 'Diagnosis',       icon: 'fa-clipboard-check' },
  { key: 'treatmentPlan',   label: '治疗记录',  labelEn: 'Treatment Plan',  icon: 'fa-prescription' },
  { key: 'medicalRecord',   label: '病历记录',  labelEn: 'Medical Record',  icon: 'fa-file-medical' },
]
```

### 5.4 主入口

```typescript
export function buildOperationLog(trainingSession) {
  if (!trainingSession) return []

  return STATION_ORDER.map(station => {
    const extractor = EXTRACTORS[station.key]
    const result = extractor ? extractor(trainingSession) : null

    return {
      key: station.key,
      label: station.label,
      labelEn: station.labelEn,
      icon: station.icon,
      hasData: !!result,
      summary: result?.summary || '',
      detail: result?.detail || null,
    }
  })
}
```

### 5.5 Extractor 1: extractHistoryTaking

```typescript
function extractHistoryTaking(session: TrainingSession) {
  const data = session.historyTaking
  if (!data?.messages?.length) return null

  const userMsgs = data.messages.filter(m => m.role === 'user')
  const spMsgs = data.messages.filter(m => m.role === 'sp')
  const lastUser = userMsgs.slice(-10).map(m => m.content?.slice(0, 80)).filter(Boolean)
  const lastSp = spMsgs.slice(-10).map(m => m.content?.slice(0, 80)).filter(Boolean)

  return {
    summary: `共${data.messages.length}轮对话（学员提问${userMsgs.length}条，SP回答${spMsgs.length}条）`,
    detail: {
      questions: lastUser,
      answers: lastSp,
      totalRounds: Math.ceil(data.messages.length / 2),
      notes: data.notes || '',
    }
  }
}
```

### 5.6 Extractor 2: extractPhysicalExam

```typescript
function extractPhysicalExam(session: TrainingSession) {
  const data = session.physicalExam
  if (!data) return null
  const examHistory = data.examHistory || []
  const messages = data.messages || []
  if (!examHistory.length && !messages.length) return null

  const operations = examHistory.slice(-20)
    .map(e => e.original || e.lower || e.name).filter(Boolean)
  const systemMsgs = messages.filter(m => m.role === 'system' || m.role === 'sp').slice(-10)

  return {
    summary: `共${examHistory.length}项体检操作`,
    detail: {
      operations,
      feedback: systemMsgs.map(m => m.content?.slice(0, 120)).filter(Boolean),
      totalOps: examHistory.length,
    }
  }
}
```

### 5.7 Extractor 3: extractAncillaryTests

```typescript
function extractAncillaryTests(session: TrainingSession) {
  const data = session.ancillaryTests
  if (!data) return null
  const results = data.results || []
  if (!results.length) return null

  const allNames = results.map(r => r.name).filter(Boolean)
  const viewedResults = results.filter(r => r.viewed)
  const resultItems = viewedResults.map(r => ({
    name: r.name || '',
    result: r.result || r.content || '',
  }))

  return {
    summary: `共${allNames.length}项检查，已查看${viewedResults.length}项结果`,
    detail: {
      selected: allNames,
      results: resultItems,
      totalSelected: allNames.length,
      totalViewed: viewedResults.length,
    }
  }
}
```

### 5.8 Extractor 4: extractDiagnosis

```typescript
function extractDiagnosis(session: TrainingSession) {
  const data = session.diagnosis || session.preliminaryDiag
  if (!data) return null
  const preliminary = data.preliminary || ''
  const differential = data.differential || ''
  const basis = data.basis || ''
  if (!preliminary && !differential && !basis) return null

  const differentialDetails = data.differentialDetails || []

  return {
    summary: [preliminary && `初步诊断：${preliminary}`, differential && `鉴别诊断：${differential}`]
      .filter(Boolean).slice(0, 2).join('；'),
    detail: {
      preliminary,
      differential,
      basis,
      differentialDetails: differentialDetails.map(d => ({
        name: d.name || '',
        evidence: (d.evidence || '').slice(0, 200),
      })),
    }
  }
}
```

### 5.9 Extractor 5: extractTreatmentPlan

```typescript
function extractTreatmentPlan(session: TrainingSession) {
  const data = session.treatmentPlan
  if (!data) return null
  const content = data.content || ''
  if (!content.trim()) return null

  return {
    summary: `治疗计划共${content.length}字`,
    detail: {
      content: content.slice(0, 500),
      fullLength: content.length,
    }
  }
}
```

### 5.10 Extractor 6: extractMedicalRecord

```typescript
function extractMedicalRecord(session: TrainingSession) {
  const data = session.medicalRecord
  if (!data) return null
  const text = typeof data === 'string' ? data : (data.content || '')
  if (!text.trim()) return null

  return {
    summary: `病历共${text.length}字`,
    detail: {
      content: text.slice(0, 500),
      fullLength: text.length,
    }
  }
}
```

---

## 6. 固定面板集成模式

### 6.1 标准模板

每个固定面板型视图（Diagnosis / AncillaryTests / TreatmentPlan / MedicalRecord / PreliminaryDiag）遵循相同模式：

```html
<div class="body-area">
  <!-- 左侧面板：35% 宽度 -->
  <div class="left-panel">
    <!-- Tab 栏 -->
    <div class="panel-tabs" :class="{ 'has-flow': flowSteps }">
      <div class="panel-tab" :class="{ active: leftTab === 'info' }" @click="leftTab = 'info'">
        {{ lang === 'zh' ? '患者信息' : 'Info' }}
      </div>
      <div class="panel-tab" :class="{ active: leftTab === 'notes' }" @click="leftTab = 'notes'">
        {{ lang === 'zh' ? '笔记' : 'Notes' }}
      </div>
      <div class="panel-tab" :class="{ active: leftTab === 'history' }" @click="leftTab = 'history'">
        {{ lang === 'zh' ? '接诊记录' : 'History' }}
      </div>
      <!-- flow-only tabs: 仅 flow mode 显示 -->
      <div v-if="flowSteps" class="panel-tab" :class="{ active: leftTab === 'ancillaryTests' }"
           @click="leftTab = 'ancillaryTests'">{{ lang === 'zh' ? '辅检' : 'Tests' }}</div>
      <div v-if="flowSteps" class="panel-tab" :class="{ active: leftTab === 'diagnosis' }"
           @click="leftTab = 'diagnosis'">{{ lang === 'zh' ? '诊断' : 'Dx' }}</div>
      <div v-if="flowSteps" class="panel-tab" :class="{ active: leftTab === 'treatmentPlan' }"
           @click="leftTab = 'treatmentPlan'">{{ lang === 'zh' ? '治疗' : 'Tx' }}</div>
      <div v-if="flowSteps" class="panel-tab" :class="{ active: leftTab === 'medicalRecord' }"
           @click="leftTab = 'medicalRecord'">{{ lang === 'zh' ? '病历' : 'MR' }}</div>
    </div>

    <!-- Tab 内容 -->
    <div class="panel-content">
      <!-- 患者信息 -->
      <div v-show="leftTab === 'info'">
        <PatientInfoPanel :patient="c.patient" :vitals="c.vitals"
                           :chiefComplaint="c.chiefComplaint" :lang="lang" />
      </div>

      <!-- 笔记 -->
      <div v-show="leftTab === 'notes'">
        <!-- 各视图自己实现的笔记内容 -->
      </div>

      <!-- 接诊记录 -->
      <div v-show="leftTab === 'history'">
        <!-- 各视图自己实现的对话记录/消息列表 -->
      </div>

      <!-- flow-only 操作记录 -->
      <div v-if="flowSteps" v-show="leftTab === 'ancillaryTests'">
        <StationRecordPanel :entry="getEntry('ancillaryTests')" :is-zh="lang === 'zh'" />
      </div>
      <div v-if="flowSteps" v-show="leftTab === 'diagnosis'">
        <StationRecordPanel :entry="getEntry('diagnosis')" :is-zh="lang === 'zh'" />
      </div>
      <div v-if="flowSteps" v-show="leftTab === 'treatmentPlan'">
        <StationRecordPanel :entry="getEntry('treatmentPlan')" :is-zh="lang === 'zh'" />
      </div>
      <div v-if="flowSteps" v-show="leftTab === 'medicalRecord'">
        <StationRecordPanel :entry="getEntry('medicalRecord')" :is-zh="lang === 'zh'" />
      </div>
    </div>
  </div>

  <!-- 右侧主内容区：65% 宽度 -->
  <div class="main-content">...</div>
</div>
```

### 6.2 各视图差异点

| 视图 | 接诊Tab Key | 接诊Tab渲染方式 | 笔记实现 | 备注 |
|------|------------|---------------|---------|------|
| Diagnosis | `'history'` | 简单 chat-bubble 列表 | 对话标记选择器 | — |
| AncillaryTests | `'history'` | 简单 chat-bubble 列表 | 文本输入+标记 | — |
| TreatmentPlan | `'pe'` (体检记录) | 带头像 icon 的消息列表 | 文本输入 | `fa-user-injured` / `fa-laptop-medical` |
| MedicalRecord | `'history'` | 带头像 icon 的消息列表 | 无 | `allMessages` computed |
| PreliminaryDiag | `'info'` (合并) | 在 info tab 底部追加查体结果 | 诊断标记 | info tab 扩展了额外内容 |

### 6.3 `getEntry` helper

每个视图都需要：

```typescript
import { buildOperationLog } from '@/composables/useOperationLog'

const logEntries = computed(() => buildOperationLog(store.trainingSession))
function getEntry(key) {
  return logEntries.value.find(e => e.key === key)
}
```

---

## 7. 病例数据归一化（c computed）

### 7.1 数据来源优先级

```
1. caseData.value.basic (从 useCaseLoader 加载的 JSON)
2. store.currentCase (本地缓存的病例对象，作为 fallback)
```

### 7.2 归一化逻辑（完整版，适用于 patient.gender 输出）

```typescript
const c = computed(() => {
  const basic = caseData.value.basic

  // ── Fallback: basic 未加载时使用 store.currentCase ──
  if (!basic) {
    const mc = store.currentCase || {}
    const g = mc.patient?.sex || mc.patient_gender || ''
    const a = mc.patient?.age || mc.patient_age || ''
    const preg = mc.patient?.pregnancy || mc.patient_pregnancy || ''
    return {
      id: mc.id || route.query.caseId || '',
      difficulty: mc.difficulty || '',
      patient: {
        name: mc.patient?.name || mc.patient_name || '',
        gender: g,
        age: a,
        avatar: matchPatientImage({ gender: g, age: a, isPregnant: preg }, 'patient'),
        fullBodyImage: matchPatientImage({ gender: g, age: a, isPregnant: preg }, 'full'),
        idleVideo: mc.patient?.idleVideo || '',
      },
      chiefComplaint: mc.chiefComplaint || '',
      symptoms: mc.symptoms || [],
      vitals: {}
    }
  }

  // ── 正常路径: 从 basic JSON 解析 ──
  const pi = basic.patient_info || {}

  // sex 编码: '1'=男 '0'=女（中国医疗标准）
  const gender = pi.sex === '1' || pi.sex === '男' ? '男'
    : (pi.sex === '0' || pi.sex === '女' ? '女' : '')

  const ageStr = String(pi.age || '').replace('岁', '')
  const ageNum = parseInt(ageStr) || 30
  const preg = pi.pregnancy || basic.pregnancy || ''

  return {
    id: basic.case_id || caseData.value.caseId || '',
    difficulty: basic.teaching_phase || '',
    specialty: basic.specialty || '',
    patient: {
      name: pi.name || '',
      gender,
      age: ageStr,
      avatar: matchPatientImage({ gender, age: ageNum, isPregnant: preg }, 'patient'),
      fullBodyImage: matchPatientImage({ gender, age: ageNum, isPregnant: preg }, 'full'),
      idleVideo: pi.idleVideo || basic.idleVideo || '',
    },
    chiefComplaint: basic.chief_complaint || '',
    symptoms: basic.symptoms || [],
    vitals: parseVitals(basic.physical_exam?.vital_signs),
  }
})
```

### 7.3 特殊情况：TreatmentPlan / MedicalRecord 使用 sex 而非 gender

这两个视图的 `c.patient` 使用 `sex` 字段名而非 `gender`：

```typescript
// TreatmentPlan.vue / MedicalRecord.vue 的差异
patient: {
  name: pi.name || '',
  sex: gender,                  // ★ 使用 sex 而非 gender
  age: ageStr,
  fullBodyImage: matchPatientImage({ gender, age: ageNum, isPregnant: preg }, 'full'),
  // ★ 缺少 avatar 和 idleVideo
}
```

`PatientInfoPanel` 内部通过 `patient.sex || patient.gender` 兼容两种字段名。

---

## 8. 工具函数

### 8.1 parseVitals — 解析生命体征字符串

**文件：`apps/training/src/composables/useUtils.js`**

```typescript
/**
 * 解析 vital_signs 字符串为结构化对象
 * 输入：'T 39.2℃，P 112次/分，R 22次/分，BP 90/60 mmHg，SpO2 98%'
 * 输出：{ temp: '39.2℃', pulse: '112次/分', rr: '22次/分', bp: '90/60 mmHg', spo2: '98%' }
 * 解析失败返回 null
 */
function parseVitals(vitalSigns: string): Record<string, string> | null {
  if (!vitalSigns) return null

  const result: Record<string, string> = {}
  const patterns = {
    temp: /T\s*(\d+\.?\d*\s*℃?)/i,
    pulse: /P\s*(\d+\s*次?\s*\/?\s*分?)/i,
    rr: /R\s*(\d+\s*次?\s*\/?\s*分?)/i,
    bp: /BP\s*(\d+\s*\/?\s*\d*\s*mmHg)/i,
    spo2: /SpO2\s*(\d+\.?\d*\s*%?)/i,
  }

  for (const [key, regex] of Object.entries(patterns)) {
    const match = vitalSigns.match(regex)
    if (match) result[key] = match[1].trim()
  }

  return Object.keys(result).length > 0 ? result : null
}
```

### 8.2 matchPatientImage — 患者头像匹配

**文件：`apps/training/src/composables/patientAssetMapping.js`**

```typescript
/**
 * 根据患者属性匹配对应的头像/全身像资源路径
 * @param patientInfo { gender, age, isPregnant }
 * @param type 'patient' | 'full'
 * @returns URL 字符串
 */
function matchPatientImage(
  patientInfo: { gender: string; age: string | number; isPregnant?: string },
  type: 'patient' | 'full'
): string {
  // 1. 将性别 + 年龄映射到 41 个预设模型之一
  //    (男/女 × 年龄桶 0-100 + 9个孕妇条目)
  // 2. 返回 /images/patients/{type}-{gender}-{deployAge}.jpg
  //    孕妇: -female-pregnant-{age}.jpg
}

// 辅助函数
function parsePatientAge(ageStr: string): number {
  // 处理 "7岁", "3个月", "1岁半", "18天" 等格式
}
```

---

## 9. CSS规范

### 9.1 固定面板 — 左侧面板

```css
.left-panel {
  flex: 0 0 35%;
  background: rgba(255,255,255,0.96);
  backdrop-filter: blur(8px);
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 20px rgba(0,0,0,0.08);
}
```

### 9.2 Tab 栏

```css
.panel-tabs {
  display: flex;
  border-bottom: 1px solid #EBEEF5;
  flex-shrink: 0;
}

.panel-tab {
  flex: 1;
  text-align: center;
  padding: 12px 8px;
  cursor: pointer;
  color: #909399;
  font-size: 13px;
  transition: all .15s;
}
.panel-tab:hover { color: #409EFF; }
.panel-tab.active {
  color: #409EFF;
  border-bottom: 2px solid #409EFF;
  font-weight: 600;
}

/* flow 模式下 Tab 更紧凑 */
.panel-tabs.has-flow .panel-tab {
  font-size: 12px;
  padding: 10px 6px;
}
```

### 9.3 内容区

```css
.panel-content {
  padding: 12px;
  overflow-y: auto;
  flex: 1;
}
```

### 9.4 body-area 布局

```css
.body-area {
  display: flex;
  gap: 16px;
  padding: 16px;
  height: calc(100vh - 60px);  /* 减去 TrainingTopBar 高度 */
}
```

---

## 10. 字段不一致说明

### 10.1 patient.gender vs patient.sex

| 视图组 | patient 字段 | PatientInfoPanel 处理 |
|--------|-------------|---------------------|
| Diagnosis, AncillaryTests, HistoryTaking, PhysicalExam, MentalExam, HumanisticComm, CaseAnalysis, CaseDetail, PreliminaryDiag | `patient.gender` | `patient.sex \|\| patient.gender` |
| TreatmentPlan, MedicalRecord | `patient.sex` | `patient.sex \|\| patient.gender` |

### 10.2 avatar 和 idleVideo 缺失

TreatmentPlan 和 MedicalRecord 的 `c.patient` 对象不包含 `avatar` 和 `idleVideo` 字段。因此这两个视图中 PatientInfoPanel 不会显示头像（`patient.avatar` 为 `undefined`，两个条件分支都不满足）。

如需统一，应将这两个视图的 `c` computed 改为与 Diagnosis 一致的结构。

### 10.3 操作记录渲染重复

FloatInfoPanel 的 辅检/诊断/治疗/病历 渲染与 StationRecordPanel.vue 重复。修改时需要同步更新两处。重构方案：让 FloatInfoPanel 也直接使用 `<StationRecordPanel>` 组件。

---

## 11. 设计决策记录

### 决策1：为什么 PatientInfoPanel 是独立的原子组件？

患者信息展示逻辑在7+个视图中完全相同（头像、姓名、性别、年龄、主诉、生命体征）。提取为独立组件避免8份重复的模板和CSS，且 props 接口清晰。

### 决策2：为什么使用 `patient.sex || patient.gender` 而非统一字段名？

历史原因。大部分视图使用 `gender`，但 TreatmentPlan/MedicalRecord 使用了 `sex`。组件内部兼容两种写法避免了 breaking change。

### 决策3：为什么生命体征用 grid 布局而非列表？

生命体征是5个等宽的短数据项（体温/脉搏/呼吸/血压/SpO2），grid 布局紧凑且一眼可扫读全部数据。每个 `.vm-item` 使用 `flex: 1` 均分空间。

### 决策4：为什么接诊记录仅保留最近50条？

对话考站的完整消息列表可能有数百条，全部展示会撑满面板且无阅读价值。最近50条提供了足够的上下文。

### 决策5：为什么操作记录截断500字？

面板宽度仅 35%（约 400px），过长内容在面板内无法完整展示。500字足以提供摘要信息，需要完整内容时学员可到对应考站页面查看。

### 决策6：为什么使用 `has-flow` CSS class 而非独立组件？

Flow 模式下 Tab 数量从3个增加到7个，原有的 `font-size: 13px; padding: 12px 8px` 会溢出。通过父级 `.panel-tabs.has-flow` 统一缩小所有 Tab（包括非 flow-only 的），保持视觉一致性。比给每个新增 Tab 单独加 class 更简洁。
