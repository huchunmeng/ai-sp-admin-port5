# AI-SP 标准化病人平台

## 项目概览

| 维度 | 说明 |
|------|------|
| 项目名称 | AI-SP 标准化病人教学与考核系统 |
| 当前阶段 | Monorepo（Vite + Vue 3 SFC + Pinia） |
| 技术栈 | Vue 3 + Vite + Pinia + Vue Router + Font Awesome 6.4 |
| 共享核心 | `packages/shared/` — 评审批注引擎 + 需求引擎 + Toast + Confirm |

## 五端体系

| 端 | 入口 | 状态 | 端口 |
|----|------|------|------|
| 训练端 | `apps/training/` | ✅ Vite SFC | 5001 |
| 管理端 | `apps/admin/` | ✅ Vite SFC | 5002 |
| 考试端 | `apps/exam/` | ✅ Vite SFC | 5003 |
| App训练端 | `apps/app-training/` | ✅ Vite SFC | 5004 |
| 运营平台 | `apps/ops/` | ✅ Vite SFC | 5005 |

## 目录结构

```
ai-sp-admin/
├── package.json                  ← Monorepo 根配置（workspaces + 统一脚本）
├── scripts/
│   └── launcher.mjs              ← 五端并行启动器
├── packages/
│   └── shared/                   ← @ai-sp/shared（评审/需求/Toast/Confirm/BottomActionBar）
│       ├── package.json
│       └── src/index.js          ← ★ 855 行核心引擎（ES module）
├── apps/
│   ├── admin/                    ← 管理端（Vite + Vue 3 SFC）
│   │   ├── package.json
│   │   ├── vite.config.js
│   │   ├── index.html
│   │   └── src/
│   │       ├── main.js / App.vue
│   │       ├── router/index.js
│   │       ├── stores/admin.js
│   │       ├── components/       ← SearchSelect.vue 等
│   │       ├── layouts/           ← AdminLayout.vue
│   │       ├── styles/            ← variables.css, global.css
│   │       └── views/             ← 11 个页面 + 病例编辑器(5 子组件)
│   ├── training/                  ← 训练端（Vite + Vue 3 SFC）
│   │   ├── package.json
│   │   ├── vite.config.js
│   │   ├── index.html
│   │   └── src/
│   │       ├── main.js / App.vue
│   │       ├── router/index.js
│   │       ├── stores/training.js
│   │       ├── composables/       ← useMockData.js, useUtils.js
│   │       ├── layouts/           ← TrainingLayout.vue
│   │       ├── styles/            ← variables.css, global.css
│   │       └── views/             ← 12 个页面
│   ├── exam/                      ← 考试端（Vite + Vue 3 SFC）
│   │   ├── package.json
│   │   ├── vite.config.js
│   │   ├── index.html
│   │   └── src/
│   │       ├── main.js / App.vue
│   │       ├── router/index.js
│   │       ├── stores/exam.js
│   │       ├── composables/
│   │       ├── layouts/           ← ExamLayout.vue
│   │       └── styles/
│   ├── app-training/              ← App训练端（Vite + Vue 3 SFC）
│   │   ├── package.json
│   │   ├── vite.config.js
│   │   ├── index.html
│   │   └── src/                   ← 4页+底部导航+Pinia store
│   └── ops/                       ← 运营平台（Vite + Vue 3 SFC）
│       ├── package.json
│       ├── vite.config.js
│       ├── index.html
│       └── src/                   ← 2页+侧栏布局+Pinia store
├── services/
│   └── mocks/                     ← API Mock 服务
│       ├── package.json
│       └── src/index.js
├── CLAUDE.md
└── CHANGELOG.md
```

## 共享层与各端边界

| 层级 | 放在 `packages/shared` | 放在 `apps/[name]/` |
|------|----------------------|---------------------|
| **UI 组件** | ReviewPanel, RequirementDrawer, BottomActionBar, AppToast | 页面级组件 |
| **业务逻辑** | 评审批注引擎、需求加载引擎 | 各端 store、路由配置 |
| **布局** | 无 | Header, Sidebar, 底部导航（各端不同） |
| **数据模型** | Annotation 接口、RequirementData 接口 | 各端 mock 数据 |
| **样式** | CSS 变量、通用组件样式 | 各端主题色、页面级样式 |

## 文件修改速查

| 要改什么 | 看什么文件 |
|----------|-----------|
| 评审引擎 | `packages/shared/src/index.js` ReviewEngine |
| 需求引擎 | `packages/shared/src/index.js` RequirementEngine |
| Toast / Confirm | `packages/shared/src/index.js` |
| 底部按钮栏 | `packages/shared/src/index.js` BottomActionBar |
| 管理端页面 | `apps/admin/src/views/[Name].vue` |
| 管理端布局 | `apps/admin/src/layouts/AdminLayout.vue` |
| 管理端路由 | `apps/admin/src/router/index.js` |
| 管理端 Store | `apps/admin/src/stores/admin.js` |
| 管理端 Mock | `apps/admin/src/composables/useMockData.js` |
| 训练端页面 | `apps/training/src/views/[Name].vue` |
| 训练端布局 | `apps/training/src/layouts/TrainingLayout.vue` |
| 训练端路由 | `apps/training/src/router/index.js` |
| 训练端 Store | `apps/training/src/stores/training.js` |
| 训练端 Mock | `apps/training/src/composables/useMockData.js` |
| 考试端页面 | `apps/exam/src/views/[Name].vue` |
| 考试端布局 | `apps/exam/src/layouts/ExamLayout.vue` |
| 考试端路由 | `apps/exam/src/router/index.js` |

## AI 维护视角的模块隔离原则

| 原则 | 做法 | 示例 |
|------|------|------|
| 单文件 < 300 行 | 大文件拆分，一个文件一个职责 | 病例编辑器分拆为 5 个子组件 |
| 目录即模块 | 同一功能的文件放在同一目录 | `views/case-editor/` |
| 样式 scoped | `<style scoped>` 替代全局 CSS | 修一个端不影响其他端 |
| composable 无副作用 | 逻辑与 UI 分离 | `useReview()` 不依赖组件实例 |

## 当前架构状态

| 维度 | 状态 |
|------|------|
| 构建工具 | ✅ Vite 6 (所有 5 端) |
| UI 框架 | ✅ Vue 3 SFC + Pinia + Router |
| 共享层 | ✅ `packages/shared` ES module |
| CSS | ✅ scoped style（无全局冲突） |
| 旧 CDN 架构 | ✅ 已全部下线清理 |
| TypeScript | ⬜ Phase D |
| 单元/E2E 测试 | ⬜ Phase D |
| CI/CD | ⬜ Phase D |

## 跳转关系

```
管理端 ←→ 训练端 (真实路由跳转)
管理端 → 考试端 (虚拟按钮，window.open)
训练端 → 考试端 (虚拟按钮，window.open)
管理端 → 运营平台 (虚拟按钮)
App训练端 → 考试端 (深层链接)
```

## 最近变更 (2026-05-26)

- [重构] 难度体系升级：从 L1/L2/L3 扩展为三阶段七级体系（U1-U2 院校 / R1-R3 住培 / F1-F2 专培）
- [修复] sex 编码统一：提示词/schema/vite 插件中 0=男→0=女，与 shared.js 保持一致（中国医疗标准）
- [修复] Meta 模块 AI 服务规则为空：fillMetaPrompt 从硬编码空值改为从 previousResults 提取合成提示
- [新增] 病例编辑器继续生成功能：支持部分模块完成后跳过已成功步骤继续生成
- [新增] 动画进度条：生成过程中进度条滚动动画 + 百分比数字显示
- [配置] AI 生成模型切换：deepseek-chat → deepseek-v4-pro
- [数据] 病种配置结构化：从 Excel 提取 14 专业/175 分类/1219 病种 → disease-data.js

## 最近变更 (2026-05-24)

- [重构] 拆分 exam store（307行→140行），mock 数据独立到 `apps/exam/src/mock/data.js`
- [现代化] `packages/shared/src/index.js` 全部 `var` → `const`/`let`（864行，0残留var）
- [重构] Dialogue.vue 内联样式提取为 scoped CSS（删除 10+ 处内联 style）
- [新增] ESLint 配置文件 `.eslintrc.cjs`（vue3-recommended + 定制规则）
- [新增] Prettier 配置文件 `.prettierrc`（统一代码风格）
- [新增] EditorConfig 配置文件 `.editorconfig`
- [修复] Launcher 跨平台兼容：macOS/Linux 端口检测（lsof）和浏览器打开
- [修复] Admin Store closeTab 边界情况（idx === -1 检查）

## 最近变更 (2026-05-22)

- [新增] apps/training/ Vite 项目 (13个视图 + mock-data composable + TrainingLayout)
- [迁移] 病例编辑器 7 文件全部迁移为 .vue SFC（shared + 5 子组件 + CaseEditor 主入口，811 行）
- [迁移] SearchSelect → apps/admin/src/components/SearchSelect.vue
- [重构] 管理端 app.js 底部按钮改为 BottomActionBar 驱动（删除 20 行 Vue 模板）
- [重构] 训练端 training/index.js 底部按钮改为 BottomActionBar 驱动（删除 20 行 Vue 模板）
- [重构] 考试端浮动按钮接入 BottomActionBar（删除 4 行 HTML + 按钮元素引用）
- [重构] 创建 `packages/shared/src/index.js` 统一评审/需求/Toast/Confirm 引擎
- [修复] XSS 漏洞：shared-review.js, exam-terminal-core.js, training/index.js
- [修复] CSS .step-item 类名冲突 → .editor-step-item
- [修复] CSS .filter-row/.filter-item 重复定义合并
- [修复] JSON 数据：specialty 中英文统一、换行符修复、冗余数据删除
- [修复] 运行时错误：exam-monitor 搜索大小写、AnalysisEditor 死代码、shared 空值检查
- [清理] 删除三端中重复的评审/需求实现代码
- [清理] 删除 console.log 残留（training-records.js）
- [清理] 删除 exam-terminal 残留文件（req-data.json、records.html）
