# AI-SP 项目开发规则

## 修改流程
1. **先读 CLAUDE.md**，确认要修改的模块属于 Vite SFC 新架构（`apps/`）还是 CDN 旧架构（根目录 `js/`）
2. **列 TodoWrite 计划**再动手，不要直接改
3. **改完后更新 CLAUDE.md** 的"最近变更"部分
4. **改完后在 CHANGELOG.md 顶部追加**变更记录
5. **用 TodoWrite 标记完成**，汇报改了什么

## 代码约束

### 架构优先级
- **新功能只加到 Vite SFC 项目**：`apps/admin/src/` 或 `apps/training/src/`
- 旧 CDN 文件（根 `js/` 目录）**仅接受 Bug 修复**，不做功能扩展
- sp-core 引擎统一在 `packages/shared/src/index.js` 维护

### 安全
- 用户输入拼接 HTML **必须用** `escapeHtml()` 转义（从 `@ai-sp/shared` 导入）
- 不拼接不受信任的内容到 `innerHTML`

### 样式
- Vite 项目必须用 `<style scoped>`
- **不新增全局 CSS 选择器**到 `css/styles.css`（4000+ 行，易冲突）
- 共享评审/需求面板的样式在 `packages/shared/src/index.js` 的 `injectSpCoreStyles()` 中维护

### 代码风格
- 不新增 `console.log` 到生产代码
- SFC 使用 `<script setup>` 风格（Composition API）
- 修改旧 JS 时跟随该文件已有的 `var`/`const`/`let` 风格

### 文件管理
- **优先编辑已有文件**，非必要不创建新文件
- 如需新建 Vue 页面，必须在路由文件 `apps/[name]/src/router/index.js` 中注册
- 补充新文件到 CLAUDE.md 的目录结构中

## 文件修改速查

### Vite SFC 新架构（主开发目标）

| 目标 | 文件 |
|------|------|
| 评审引擎 | `packages/shared/src/index.js` ReviewEngine |
| 需求引擎 | `packages/shared/src/index.js` RequirementEngine |
| Toast | `packages/shared/src/index.js` ToastEngine |
| 底部按钮栏 | `packages/shared/src/index.js` BottomActionBar |
| 管理端页面 | `apps/admin/src/views/[Name].vue` |
| 管理端布局 | `apps/admin/src/layouts/AdminLayout.vue` |
| 管理端路由 | `apps/admin/src/router/index.js` |
| 管理端Store | `apps/admin/src/stores/admin.js` |
| 管理端组件 | `apps/admin/src/components/[Name].vue` |
| 训练端页面 | `apps/training/src/views/[Name].vue` |
| 训练端布局 | `apps/training/src/layouts/TrainingLayout.vue` |
| 训练端路由 | `apps/training/src/router/index.js` |
| 训练端Store | `apps/training/src/stores/training.js` |
| 训练端Mock | `apps/training/src/composables/useMockData.js` |

### CDN 旧架构（仅 Bug 修复）

| 目标 | 文件 |
|------|------|
| 管理端旧版入口 | `js/app.js` |
| 管理端旧版页面 | `js/pages/[name].js` |
| 训练端旧版入口 | `js/training/index.js` |
| 训练端旧版页面 | `js/training/pages/[name].js` |
| 考试端页面 | `exam-terminal-prototype/pages/[name].html` |
| 考试端逻辑 | `exam-terminal-prototype/js/exam-terminal-core.js` |
| 旧版全局样式 | `css/styles.css`（仅修复） |

### 共用数据

| 目标 | 文件 |
|------|------|
| 需求数据 | `data/requirements.json` |
| 病例数据 | `data/cases/[case]-[module].json` |

## 不要做的事
- ❌ 不要提交代码（除非用户明确说"提交"）
- ❌ 不要在 `css/styles.css` 中新增全局选择器
- ❌ 不要同时维护多套评审/需求代码（统一用 `packages/shared/`）
- ❌ 不要新增 MD 文档（除非用户要求）
- ❌ 不要在旧 CDN 架构中开发新功能
