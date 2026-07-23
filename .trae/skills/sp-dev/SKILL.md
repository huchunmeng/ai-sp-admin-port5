---
name: "sp-dev"
description: "AI-SP 项目标准开发流程。修改或新增功能时自动执行：读 CLAUDE.md → 列计划 → 改代码 → 写日志。修改 sp-core、管理端、训练端、考核端任一模块时触发。"

# AI-SP 标准开发流程

## 触发条件
当用户要求修改本项目代码时（修改评审、需求、页面、样式、数据等），遵循此流程。

## 执行步骤

### 1. 了解上下文
- 读 `CLAUDE.md` 确认项目的当前架构和约束
- 确认用户要改的是 **Vite SFC 新架构**（`apps/` 下）还是 **CDN 旧架构**（根目录 `js/` 下）
- 查"文件映射规则"表，定位要改的文件

### 2. 列计划
- 用 TodoWrite 列出修改步骤
- 向用户确认方案后再动手

### 3. 执行修改
- **优先改 Vite SFC 文件**（`apps/admin/src/` 或 `apps/training/src/`），旧 CDN 文件仅修复 Bug
- 优先用 SearchReplace 编辑已有文件
- SFC 样式用 `<style scoped>`，不新增全局选择器
- 用户输入必须 escapeHtml()（从 `@ai-sp/shared` 导入）
- 不新增 console.log
- 遵循该文件已有的变量声明风格 (var/const/let)
- 新增 Vue 页面时在路由文件（`apps/[name]/src/router/index.js`）中注册

### 4. 更新索引
- 修改完成后，更新 CLAUDE.md 的"最近变更"部分
- 在 CHANGELOG.md 顶部追加一条变更记录，格式：
  ```
  ## YYYY-MM-DD
  ### [类型] 变更描述
  ```
- 类型：新增 / 修复 / 重构 / 清理 / 优化

### 5. 使用 TodoWrite 标记所有步骤完成

## 文件映射规则

### Vite SFC 新架构（主开发目标）

| 用户说 | 对应文件 |
|--------|---------|
| 评审/批注 | `packages/shared/src/index.js` ReviewEngine (L73-L358) |
| 需求/需求说明 | `packages/shared/src/index.js` RequirementEngine (L364-L488) |
| Toast/提示/弹窗 | `packages/shared/src/index.js` ToastEngine/confirm (L494-L562) |
| 底部按钮栏 | `packages/shared/src/index.js` BottomActionBar (L570-731) |
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
| 考试端页面 | `exam-terminal-prototype/pages/XX.html` |
| 考试端逻辑 | `exam-terminal-prototype/js/exam-terminal-core.js` |
| 全局样式 | 各 app 内 `src/styles/global.css` (scoped) |

### CDN 旧架构（兼容维护）

| 用户说 | 对应文件 |
|--------|---------|
| 管理端-旧版 | `js/app.js` + `js/pages/XX.js` |
| 训练端-旧版 | `js/training/index.js` + `js/training/pages/XX.js` |
| 旧版全局样式 | `css/styles.css`（仅修复，不新增功能） |
| 病例数据 | `data/cases/`（新旧共用） |
| 需求数据 | `data/requirements.json`（新旧共用） |
