# 数据层统一迁移方案

## 目标

将所有分散在 5 个前端 + 1 个后端的持久化数据，统一收敛到 `services/sp-api/src/data-access/` 层，以 JSON 文件存储代替数据库，接口设计预留数据库替换能力。

## 原则

1. **调用方只 import 数据访问模块，不直接读文件**
2. **模块只暴露 `getXxx()` / `setXxx()`，不暴露存储实现**
3. **换数据库 = 只改 data-access 内部，路由和调用方零改动**
4. **前端通过 REST API 获取所有配置，消除多副本和 localStorage 依赖**

---

## Phase 1: 配置类数据（优先级最高）

### 1.1 TTS 音色配置

| 现状 | 目标 |
|------|------|
| 5 份副本 `public/data/patient-voice-config.json` | `data/voice-config.json` 单文件 |
| ops vite 中间件读写 admin 副本 + 同步 | `voice-config.js` 模块暴露 CRUD |
| 训练端 fetch 本地 `/data/...` | 训练端调 sp-api `GET /api/sp/voice-config` |

**接口设计:**
```js
// data-access/voice-config.js
export async function getVoiceConfig(model?)      // model 可选，不传返回全部
export async function updateVoiceConfig(model, section)  // 更新单个模型区段
export async function resetVoiceConfig(model)     // 恢复默认
```

**REST API:**
```
GET  /api/sp/voice-config?model=cosyvoice-v3-flash
PUT  /api/sp/voice-config/cosyvoice-v3-flash
POST /api/sp/voice-config/cosyvoice-v3-flash/reset
```

**影响范围:**
- 删除 `apps/ops/vite.config.js` voice-config 中间件及同步逻辑
- 删除 5 份 `public/data/patient-voice-config.json` 副本
- `apps/training/src/composables/useTTS.js` 改为从 sp-api 拉取
- `apps/ops/src/views/AssetManager.vue` 改为调 sp-api

---

### 1.2 LLM 模型配置

| 现状 | 目标 |
|------|------|
| ops 端 `localStorage` (`ai-sp-ops-llm-config`) | `data/llm-config.json` |
| 训练端 `public/config/settings.json` | 同上，统一入口 |
| 管理端 `public/config/settings.json` | 同上 |

**接口设计:**
```js
// data-access/llm-config.js
export async function getLlmConfig()
export async function updateLlmConfig(partial)
// 内部结构: { caseGen, caseGenThinking, dialogue, tts, scoring, scoringThinking }
```

**REST API:**
```
GET  /api/sp/llm-config
PUT  /api/sp/llm-config
```

**影响范围:**
- 删除 `apps/ops/src/views/SysConfig.vue` 中 localStorage 读写
- 删除 `apps/training/vite.config.js` settings-api 中间件
- 删除 `apps/admin/vite.config.js` settings-api 中间件
- 删除 `apps/training/public/config/settings.json`
- 删除 `apps/admin/public/config/settings.json`

---

### 1.3 运行时服务开关

| 现状 | 目标 |
|------|------|
| sp-api 内存变量 `serviceEnabled`, `forceTerminationEnabled`, `ttsModel` | 持久化到 `data/settings.json`，启动时加载 |

**接口设计:**
```js
// data-access/settings.js
export async function getSettings()
export async function updateSettings(partial)
// 内部结构: { serviceEnabled, forceTerminationEnabled, ttsModel }
```

已有 API `/api/sp/admin/status` 和 `/api/sp/admin/settings` 保持不变，底层改为读写文件。

**影响范围:**
- sp-api 启动时从文件恢复状态
- `ttsModel` 变更持久化，重启不丢失

---

### 1.4 考站方案配置

| 现状 | 目标 |
|------|------|
| `packages/shared/data/station-schemes/*.js` 静态模块 | `data/station-schemes.json` |
| `scripts/station-schemes-persist.mjs` 中间件写文件 | `station-schemes.js` 模块 |
| localStorage 回退 (`ai-sp-station-schemes-edits`) | sp-api REST API |

**接口设计:**
```js
// data-access/station-schemes.js
export async function getStationSchemes(stage?)
export async function getStationSchemeEdits()
export async function saveStationSchemeEdits(edits)
```

**REST API:**
```
GET  /api/sp/station-schemes?stage=residency
GET  /api/sp/station-schemes/edits
PUT  /api/sp/station-schemes/edits
```

**影响范围:**
- `packages/shared/data/station-schemes/` 数据迁移到 sp-api data 目录
- `scripts/station-schemes-persist.mjs` 删除（逻辑合并到 data-access）
- 各端通过 API 获取而非静态 import

---

## Phase 2: 病例内容类数据

### 2.1 病例 JSON 文件

| 现状 | 目标 |
|------|------|
| `apps/admin/public/data/cases/` ~100 个 JSON | 迁移到 `services/sp-api/data/cases/` |
| 各端 vite 中间件代理读取 | sp-api REST API 统一服务 |
| prod-server 直读文件 | 通过 data-access 模块 |

**目录迁移:**
```
apps/admin/public/data/cases/   →   services/sp-api/data/cases/
apps/admin/public/data/materials/  →  services/sp-api/data/materials/
```

**接口设计:**
```js
// data-access/cases.js
export async function listCases(filter?)
export async function getCase(caseId)
export async function getCaseModule(caseId, module)  // basic/reception/analysis/...
export async function createCase(caseData)
export async function updateCase(caseId, module, data)
export async function deleteCase(caseId)
export async function getCaseMaterial(caseId, filename)
```

**REST API:**
```
GET    /api/sp/cases
GET    /api/sp/cases/:caseId
GET    /api/sp/cases/:caseId/:module
POST   /api/sp/cases
PUT    /api/sp/cases/:caseId/:module
DELETE /api/sp/cases/:caseId
GET    /api/sp/cases/:caseId/materials/:filename
```

**影响范围:**
- 删除 5 个 vite.config.js 中的 `serve-admin-cases` / `serve-admin-public` 中间件
- `services/sp-api/src/case-loader.js` 改为通过 data-access 读取
- `services/prod-server/src/routes/case-*.js` 改为通过 data-access

---

### 2.2 病种分类数据

| 现状 | 目标 |
|------|------|
| `apps/admin/src/data/disease-data.js` 硬编码 1219 条目 | `data/disease-data.json` |
| 管理端静态 import | sp-api REST API |

**接口设计:**
```js
// data-access/diseases.js
export async function getDiseaseTree()          // 完整树
export async function getDiseasesBySpecialty(specialty)
export async function searchDiseases(keyword)
```

**REST API:**
```
GET /api/sp/diseases
GET /api/sp/diseases?specialty=Internal+Medicine
GET /api/sp/diseases/search?q=糖尿病
```

---

### 2.3 评分表模板

| 现状 | 目标 |
|------|------|
| `apps/admin/src/data/templates/` 30+ 个 JSON | `data/score-templates/` |
| `apps/ops/src/data/templates/` 6 个 JSON（与 admin 部分重复） | 统一为一套 |

**接口设计:**
```js
// data-access/score-templates.js
export async function listScoreTemplates()
export async function getScoreTemplate(id)
export async function saveScoreTemplate(id, data)
```

---

### 2.4 需求文档 (requirements.json)

| 现状 | 目标 |
|------|------|
| `apps/admin/public/data/requirements.json` | `data/requirements.json` |
| `apps/ops/public/data/requirements.json` | 合并为一份，按端过滤 |

---

## Phase 3: 病人资产类数据

### 3.1 模型定义（年龄段/孕期/陈述人）

| 现状 | 目标 |
|------|------|
| 硬编码在 `AssetManager.vue` 的 `RANGES` 常量（85行） | `data/patient-model-defs.json` |
| 硬编码在 `useTTS.js` 的 `_MALE_BASE` / `_FEMALE_BASE`（重复） | 统一来源 |

**接口设计:**
```js
// data-access/patient-models.js
export async function getPatientModelDefs()
export async function deriveModelId(gender, ageYears)
```

---

### 3.2 素材路径映射

| 现状 | 目标 |
|------|------|
| 硬编码 `IMG_BASE = '/images/patients/'` 等 | `data/asset-paths.json` |
| 文件名模式硬编码（`patient-{gender}-{age}.jpg`） | 配置化 |

---

## Phase 4: 会话运行时数据

### 4.1 会话存储

| 现状 | 目标 |
|------|------|
| sp-api 内存 `Map`，重启即丢 | `data/sessions/` 按 sessionId 分文件 |
| 无持久化，调试困难 | 可选持久化（dev 模式默认开启） |

不建议全量持久化（高频写入），但关键节点（会话创建/终止/异常）应落盘便于排查。

---

### 4.2 训练记录

| 现状 | 目标 |
|------|------|
| localStorage `training_records` | sp-api REST API 持久化 |
| 换浏览器即丢 | `data/training-records.json` |

**REST API:**
```
GET  /api/sp/training-records?caseId=xxx
POST /api/sp/training-records
```

---

## Phase 5: 清理项

### 需要删除的 vite 中间件（统一由 sp-api 替代）

| 文件 | 中间件 | 替代 |
|------|--------|------|
| `apps/ops/vite.config.js` | voice-config-api | `GET/PUT /api/sp/voice-config` |
| `apps/ops/vite.config.js` | serve-admin-cases | `GET /api/sp/cases` |
| `apps/ops/vite.config.js` | serve-admin-public | `GET /api/sp/cases/:id/materials/` |
| `apps/training/vite.config.js` | settings-api | `GET/PUT /api/sp/llm-config` |
| `apps/training/vite.config.js` | serve-admin-cases | `GET /api/sp/cases` |
| `apps/training/vite.config.js` | serve-admin-data | `GET /api/sp/cases` + `/api/sp/voice-config` |
| `apps/training/vite.config.js` | case-index | `GET /api/sp/cases` |
| `apps/training/vite.config.js` | prompt-server | `GET /api/sp/prompts` |
| `apps/training/vite.config.js` | logs-api | `POST /api/sp/logs` |
| `apps/admin/vite.config.js` | settings-api | `GET/PUT /api/sp/llm-config` |
| `apps/app-training/vite.config.js` | serve-admin-cases | `GET /api/sp/cases` |
| `apps/exam/vite.config.js` | serve-admin-public | `GET /api/sp/cases/:id/materials/` |

### 需要删除的副本文件

| 文件 | 原因 |
|------|------|
| `*/public/data/patient-voice-config.json` ×5 | 统一由 sp-api 管理 |
| `*/public/config/settings.json` ×2 | 统一为 llm-config |
| `apps/ops/src/data/templates/*.json` ×6 | 与 admin 合并 |

### 需要清理的 localStorage 键

| Key | 去向 |
|-----|------|
| `ai-sp-ops-llm-config` | sp-api llm-config |
| `training_records` | sp-api training-records |
| `ai-sp-station-schemes-edits` | sp-api station-schemes（仅保留 API 失败时的缓存） |
| `ai-sp-station-selection-*` | 保留（纯 UI 状态，不需持久化到服务端） |

---

## 目标目录结构

```
services/sp-api/
├── src/
│   ├── index.js                    ← HTTP + WS 入口（不变）
│   ├── llm-client.js               ← 不变
│   ├── case-loader.js              ← 改为通过 data-access 读取
│   ├── prompt-builder.js           ← 不变
│   ├── session-store.js            ← 可选持久化
│   ├── triggers.js                 ← 触发词表移到 data/
│   ├── fallbacks.js                ← 后备词库移到 data/
│   ├── repeat-detector.js          ← 不变
│   ├── intent-classifier.js        ← 不变
│   ├── data-access/
│   │   ├── index.js                ← 统一导出 + 初始化
│   │   ├── voice-config.js         ← 音色 CRUD
│   │   ├── llm-config.js           ← LLM模型配置
│   │   ├── settings.js             ← 运行时开关
│   │   ├── station-schemes.js      ← 考站方案
│   │   ├── cases.js                ← 病例 CRUD
│   │   ├── diseases.js             ← 病种分类
│   │   ├── score-templates.js      ← 评分表模板
│   │   ├── patient-models.js       ← 病人模型定义
│   │   ├── training-records.js     ← 训练记录
│   │   ├── requirements.js         ← 需求文档
│   │   └── prompts.js              ← 提示词模板
│   └── utils/
│       └── json-store.js           ← 通用 JSON 文件读写辅助
├── data/                           ← ★ 所有持久化数据
│   ├── voice-config.json
│   ├── llm-config.json
│   ├── settings.json
│   ├── station-schemes.json
│   ├── station-schemes-edits.json
│   ├── disease-data.json
│   ├── patient-model-defs.json
│   ├── asset-paths.json
│   ├── requirements.json
│   ├── training-records.json
│   ├── triggers.json               ← 当前硬编码的触发词表
│   ├── fallbacks.json              ← 当前硬编码的后备词库
│   ├── cases/                      ← 病例文件（从 admin/public 迁移）
│   │   ├── index.json
│   │   ├── IM-20260527-A9GW/
│   │   │   ├── basic.json
│   │   │   ├── reception.json
│   │   │   ├── analysis.json
│   │   │   ├── humanity.json
│   │   │   ├── meta.json
│   │   │   ├── scoreSheet.json
│   │   │   └── materials/
│   │   └── ...
│   ├── score-templates/
│   │   ├── score-sheet-history.json
│   │   └── ...
│   └── prompts/
│       ├── history-taking.txt
│       └── ...
├── .env
└── package.json
```

---

## 数据库替换路线图

当引入真实数据库（如 SQLite / PostgreSQL）时：

```
data-access/voice-config.js

// 当前（JSON 文件）
import { readJson, writeJson } from '../utils/json-store.js'
export async function getVoiceConfig(model) {
  const data = await readJson('voice-config.json')
  return model ? data[model] : data
}

// 未来（SQLite）
import { db } from '../utils/database.js'
export async function getVoiceConfig(model) {
  const row = await db.get('SELECT config FROM voice_config WHERE model = ?', model)
  return JSON.parse(row.config)
}
```

**调用方代码完全不变。** 14 个 data-access 模块是唯一的改动点。

---

## 实施顺序

| 批次 | 内容 | 风险 |
|------|------|------|
| **第1批** | `json-store.js` 工具 + `settings.js` + `voice-config.js` + `llm-config.js` | 低 — 当前已有 API，只改底层 |
| **第2批** | `cases.js` — 迁移病例目录 + 统一 API | 中 — 涉及文件移动，需同步所有读取方 |
| **第3批** | `station-schemes.js` + `diseases.js` + `score-templates.js` + `requirements.js` | 低 |
| **第4批** | `patient-models.js` + `triggers.js` + `fallbacks.js` — 硬编码→数据文件 | 中 — 需要改 sp-api 内部 import 方式 |
| **第5批** | 清理所有 vite 中间件 + 副本文件 | 中 — 大面积删除，需逐端验证 |
| **第6批** | `training-records.js` + 会话可选持久化 | 低 |
