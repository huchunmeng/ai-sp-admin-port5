# AI-SP 测试用例汇总

> 版本: v7 情绪系统 | 日期: 2026-06-14 | 总脚本数: 15

---

## 一、测试脚本清单

### 核心功能测试

| 脚本 | 覆盖范围 | 项目数 | 说明 |
|------|----------|:------:|------|
| `test-v7-full.mjs` | 全场景集成 (15病例+10意图+10轮长对话) | 77 | 最全面的回归测试 |
| `test-v7-targeted.mjs` | Wariness/Intent/Complaint 专项 | 23 | 关键路径验证 |
| `test-v7-boundary.mjs` | 阈值/状态转换/LLM输出/性格偏移/并发 | 44 | 边界条件 |
| `test-v7-output-validation.mjs` | LLM 输出7字段 + 后处理全校验 | 148 | 输出质量保障 |
| `test-sp-api.mjs` | API 端到端（意图+行为+症状池+体格检查） | 39 | API 契约测试 |
| `test-sp-text-quality.mjs` | SP 文本质量（8条扮演规则逐条验证） | 60 | 文本合规性 |
| `test-sp.mjs` | 综合回归（原始完整测试套件） | ~60 | 历史回归 |
| `test-emotion-unit.mjs` | 情绪引擎单元测试 | ~50 | 引擎内部逻辑 |

### 专项测试

| 脚本 | 覆盖场景 |
|------|----------|
| `test-calm-relevance.mjs` | calm 状态下 SP 回复相关性 |
| `test-repeat-escalation.mjs` | 重复追问自然升级机制 |
| `test-termination-flow.mjs` | 投诉累计 + 强制终止流程 |
| `test-v7-family-role.mjs` | family 角色扮演行为 |
| `test-v7-humanity-family.mjs` | 人文沟通站 family 场景 |
| `test-v7-info-control.mjs` | 信息边界控制（不问不供） |
| `test-all-cases.mjs` | 全部已录入病例的加载+配置测试 |

---

## 二、测试覆盖矩阵

### 情绪维度覆盖

| 维度 | 覆盖项 | 测试方法 |
|------|--------|----------|
| 阈值判定 | anger(2/5/8), fear(2/5/8), sadness(2/5/8), joy(3) | test-v7-boundary §1 |
| 状态转换 | 12状态×5意图 = 60组合 | test-v7-full + test-v7-targeted |
| 性格偏移 | 火爆型(-1.5)/普通型(0)/偏内敛(+0.5)/隐忍型(+2.0) | test-v7-boundary §4 |
| 场景乘数 | 疼痛×1.3 + anger保底2 | test-v7-boundary §1a |
| 状态锁定 | terrified/broken/wariness 锁定/解锁 | test-v7-boundary §3 |
| 投诉机制 | COMPLAINT_TRIGGERS + 累计3次终止 | test-v7-targeted §3 |
| Delta上限 | 非attack/offensive意图 anger≤2.0, fear≤2.0 | test-v7-output-validation |

### 意图分类覆盖

| 意图 | 触发条件 | 测试脚本 |
|------|----------|----------|
| attack | 脏话、威胁、侮辱、拆分攻击 | test-v7-full, test-v7-targeted |
| offensive | 催促、轻视、挑衅、冷漠 | test-v7-full |
| friendly | 打招呼、道歉、安抚 | test-v7-full, test-v7-targeted |
| neutral | 正常医学问诊 | test-v7-full |
| noise | 单字、纯标点、无意义输入 | test-v7-full, test-v7-boundary §5 |

### 行为规则覆盖 (8条铁律)

| 规则 | 验证方法 | 对应脚本 |
|------|----------|----------|
| 1. 不主动 | SP 不主动开口/不给线索 | test-sp-text-quality |
| 2. 不扩展 | 问A只答A，不附带B/C/D | test-sp-text-quality |
| 3. 不推断 | 不匹配问题→"不清楚/没注意" | test-sp-text-quality |
| 4. 不筛选 | 多问→只答第一个 | test-v7-info-control |
| 5. B类替问踢回 | "还有呢"→反问 | test-v7-info-control |
| 6. B+类倾泻拒绝 | "把你知道的都说出来"→轻驳 | test-v7-info-control |
| 7. A类黑话装不懂 | 医学术语→"说大白话" | test-v7-info-control |
| 8. 考核标准优先 | 不帮助/不提示/不引导 | test-sp-text-quality |

### 特殊场景覆盖

| 场景 | 测试脚本 |
|------|----------|
| 人文沟通 family 角色（形象/音色/情绪） | test-v7-humanity-family |
| family 预后情绪（担忧流露） | test-v7-family-role |
| 重复追问自然升级（3次→冷淡） | test-repeat-escalation |
| 终止流程（投诉→警告→强制终止） | test-termination-flow |
| calm 状态对话相关性 | test-calm-relevance |

---

## 三、运行方式

### 前置条件

```bash
# 1. 启动 sp-api 服务
cd services/sp-api
node src/index.js
# 确认: http://localhost:5100/api/sp/health 返回 ok

# 2. 确保环境变量配置正确（LLM_API_KEY 等）
```

### 执行全部测试

```bash
# 核心套件（按推荐顺序）
node scripts/test-v7-full.mjs              # 全场景集成 (77项)
node scripts/test-v7-targeted.mjs          # 专项验证 (23项)
node scripts/test-v7-boundary.mjs          # 边界条件 (44项)
node scripts/test-v7-output-validation.mjs # 输出校验 (148项)
node scripts/test-sp-text-quality.mjs      # 文本质量 (60项)

# 专项套件
node scripts/test-sp-api.mjs               # API端到端 (39项)
node scripts/test-calm-relevance.mjs       # calm相关性
node scripts/test-repeat-escalation.mjs    # 重复追问
node scripts/test-termination-flow.mjs     # 终止流程
node scripts/test-v7-family-role.mjs       # family角色
node scripts/test-v7-humanity-family.mjs   # 人文family
node scripts/test-v7-info-control.mjs      # 信息控制
node scripts/test-sp.mjs                   # 综合回归
node scripts/test-all-cases.mjs            # 全病例加载
node scripts/test-emotion-unit.mjs         # 引擎单元
```

### 预期通过标准

- **核心套件** (test-v7-*) : 100% 通过
- **API 测试** (test-sp-api) : 100% 通过
- **文本质量** (test-sp-text-quality) : ≥95% 通过
- **专项测试** : 全部通过
- **综合回归** (test-sp.mjs) : ≥90% 通过

---

## 四、已知问题与待修复

| 问题 | 状态 | 说明 |
|------|------|------|
| 三维负面情绪全满时文本退化为冷收 | 待修复 | fury+sadness+fear 全满时 LLM 输出变得极短极冷，TTS 无法表现暴怒 |
| 重复追问自然升级未前端实测 | 待验证 | 代码已完成，但未在训练端实测 |
| TTS 极限情绪表现一致性 | 观察中 | qwen3-tts 对中文指令的极端情绪表现一致性待长期观察 |

---

## 五、测试数据

测试覆盖的病例（15例）：

| 病例ID | 科室 | 说明 |
|--------|------|------|
| DERM-20260416-K4G7 | 皮肤科 | |
| DERM-20260416-K7M2 | 皮肤科 | |
| DERM-20260416-X9K2 | 皮肤科 | |
| EM-20260416-7A2K | 急诊科 | |
| EM-20260516-7F2A | 急诊科 | |
| EM-20260526-X8K2 | 急诊科 | |
| IM-20260527-A9GW | 内科 | 含人文沟通场景 |
| OB-20250615-9C2K | 妇产科 | |
| OB-20260416-K9T2 | 妇产科 | |
| ORT-20260417-LDH03 | 骨科 | |
| PD-20260527-0FQY | 儿科 | |
| PS-20260611-DEP1 | 精神科 | 抑郁症 |
| PS-20260611-PAN1 | 精神科 | 惊恐障碍 |
| SU-20260416-9C2D | 外科 | 疼痛病例 (anger乘数+保底) |
| TEST-CHECK-MODE | 测试 | 体格检查模式 |
