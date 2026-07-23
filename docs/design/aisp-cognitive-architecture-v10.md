# AI-SP 双系统认知架构设计规范 V1.0

> 2026-06-16 | 从情绪引擎 v4→v7→v8 演进中提炼的核心架构

---

## 文档定位

本文档回答的不是"有哪些模块"，而是：

- 病人的心理是如何运转的？
- 每个模块为什么存在？
- 信息如何流动？
- 情绪、认知、信任、关系之间是什么关系？

本文档是 V10 实现的**唯一架构权威来源**。任何模块设计必须首先与本文档对齐。

---

## 一、设计哲学

### 1.1 AI-SP 到底在模拟什么？

不是模拟"用户输入 → 规则 → 回答"，也不是"用户输入 → LLM → 回答"。

真实病人的心理过程是：

```
医生说了什么
    ↓
我如何理解
    ↓
我怎么看待这件事
    ↓
它是否影响我的担忧
    ↓
它是否改变我对医生的看法
    ↓
我产生什么情绪
    ↓
我如何回应
```

**情绪不是第一层，是认知推理的结果。**

### 1.2 核心闭环

```
认知决定情绪
情绪影响行为
行为产生反馈
反馈更新认知
```

### 1.3 工程目标（五条硬约束）

| # | 目标 | 检验标准 |
|---|------|---------|
| 1 | 连续心理演化 | fear 不会上一轮 8 下一轮 1，除非有关键事件 |
| 2 | 可解释 | 任何情绪变化都能追溯到 concern/trust/stuck_count 的具体变化 |
| 3 | 可追溯 | 任何认知变化都能追溯到学生的具体言行 |
| 4 | 不增加实时延迟 | P95 < 3s（反思脑不进实时链路） |
| 5 | 不增加知觉脑认知负担 | 知觉脑 prompt ≤ 当前 token 数（~2200），新增结构替代旧内容，不追加 |

---

## 二、双系统架构总览

### 2.1 双系统定义

```
┌─────────────────────────────────────┐
│           知觉脑 (Perception)        │
│   实时链路 · 快 · 直觉 · 自动化      │
│   职责: 即时理解 + 即时情绪 + 即时行为  │
│   约束: P95 < 2s, 不进离线链路       │
└─────────────────────────────────────┘
              ↑ 读取
    ┌─────────────────────┐
    │   Cognitive Model   │
    │   心理状态结构化存储  │
    └─────────────────────┘
              ↑ 更新 (异步)
┌─────────────────────────────────────┐
│           反思脑 (Reflective)         │
│   离线链路 · 慢 · 理性 · 长期         │
│   职责: 意义分析 + 关系评估 + 担忧更新  │
│   约束: 不进实时链路, 不碰情绪值       │
└─────────────────────────────────────┘
```

### 2.2 信息流

```
学生输入
    ↓
Trigger 检测 (事件触发: 解释/共情/冲突, 时间触发: 5轮无事件)
    ↓
知觉脑 (实时 LLM, qwen-plus/turbo)
    ├── 读取: Cognitive Model 摘要 (concern + trust + unresolved_goals + stuck_count)
    ├── 读取: Derived State (attitude + disclosure + emotion_constraint 档位)
    ├── 输出: text, intent, emotion 值, video_action, voice_style
    ├── 约束: emotion 值受 emotion_constraint 档位约束 (±1.5 自由幅度)
    └── 状态机: 根据 emotion 值判定 state, 做 va/vs 硬覆盖和边界控制
    ↓
返回学生

──────────────────── 异步边界 ────────────────────

最近 N 轮对话 → 反思任务队列
    ↓ (Hybrid Trigger: 事件触发 / 时间触发 / 静默漂移检测)
反思脑 (离线 LLM, deepseek-v4-pro)
    ├── 读取: 最近 N 轮对话 + 当前 Cognitive Model
    ├── 输出: events[] (仅枚举分类, 不输出数值, 不输出状态 delta)
    └── 禁止: 不输出 text, 不输出 strategy, 不输出 emotion, 不修改 state, 不输出数值
    ↓
事件 → 状态更新规则引擎 (100% 确定性, 无 LLM, 无方差)
    ├── 输入: events[] + 当前 Cognitive Model
    ├── 输出: concern/trust/unresolved_goals/stuck_count 的 delta
    └── 更新 Cognitive Model (4 字段)
    ↓
规则计算 Derived State (attitude + disclosure + emotion_constraint)
    ↓
下一轮知觉脑读取新状态
```

### 2.3 Single Authority Principle

**每个状态字段只有一个 Owner。查表即知冲突。**

| 字段 | Owner | 可写 | 只读 | 禁止访问 |
|------|-------|------|------|---------|
| concern (primary, intensity) | 反思脑 | primary, intensity | 知觉脑, Derived | — |
| trust | 反思脑 | trust | 知觉脑, Derived | — |
| unresolved_goals | 反思脑 | 增/删 | 知觉脑, Derived | — |
| stuck_count | 反思脑 | stuck_count | 知觉脑, Derived | — |
| attitude | Derived State | — | 知觉脑, 状态机 | 反思脑 |
| disclosure | Derived State | — | 知觉脑, 状态机 | 反思脑 |
| emotion_constraint | Derived State | — | 知觉脑, 引擎 | 反思脑 |
| Emotion (4 维) | 知觉脑 | anger, fear, sadness, joy | — | 反思脑 |
| State | 状态机 | state 判定 | — | 反思脑, Derived |
| text / intent | 知觉脑 | text, intent | — | 反思脑 |

---

## 三、Cognitive Model Schema（核心）

Cognitive Model 是反思脑唯一可写的结构化心理状态存储。4 个字段，极致精简。

### 3.1 设计原则：状态最小化

> **能用行为解释的变量，不建心理变量。**

医生的每句话、每个态度，直接驱动 SP 的行为变化。我们不需要在 Cognitive Model 中建模"医生能力评分"和"合作意愿"——这些是医生行为的结果，不是病人的心理状态。

### 3.2 完整 Schema（V1 收敛版）

```yaml
cognitive_model:                 # 反思脑写入，知觉脑只读
  concern:
    primary: string              # 当前最主要担忧的自然语言标签 (如"担心是癌症")
    intensity: 0-10              # 担忧强度
  trust: 0-10                    # 对医生的信任度 (初始: 接诊站=5, 人文站=6)
  unresolved_goals: [string]     # 尚未被医生解答的疑问/目标列表
  stuck_count: 0-5               # 当前疑问连续被回避的次数 (人文站专用, 接诊站=0)
```

**为什么是这 4 个字段？**

| 字段 | 回答什么问题 | 为什么需要建模 |
|------|-------------|-------------|
| concern | 病人在乎什么？ | 决定情绪基调。担心癌症 vs 担心排队太久，情绪完全不同 |
| trust | 病人信不信医生？ | 决定病人如何解读医生的言行。同样的话，信任时理解为关心，不信任时理解为敷衍 |
| unresolved_goals | 病人还有什么没解决？ | 决定对话是否结束。所有 goals 解决 → 自然收尾 |
| stuck_count | 病人被卡了多久？ | 连续被回避 → frustration 累积 → attitude 从 cooperative 转 defensive |

### 3.3 字段不包含的内容（刻意排除）

| 不包含 | 原因 |
|--------|------|
| doctor_model (competence/empathy/reliability) | 是"医生做了什么"的评分，不是"病人心理状态"。trust 已经聚合了病人对医生的整体感受 |
| relationship (cooperation/openness) | 是医生行为 + trust 的结果，由 Derived State 的 attitude/disclosure 表达 |
| disease_beliefs | 隐含在 concern.intensity 中 |
| future_expectation | 隐含在 concern.primary 中（"担心以后..."） |
| emotion 值 | 知觉脑的输出，不是认知状态 |
| personality | 静态属性，引擎初始化时确定 |
| question_state (current_index/resolved/unresolved) | `unresolved_goals` 已表达"哪些疑问没被解答"，不需要 index 指针追踪顺序 |

### 3.4 Derived State（规则计算，非存储）

从 Cognitive Model 派生出 3 个行为/情绪约束变量。**规则计算，不存储，不占用 token 去写入。**

```yaml
derived_state:                   # 纯规则计算，0 延迟
  attitude: defensive | neutral | cooperative
  disclosure: low | medium | high
  emotion_constraint:
    intensity: none | low | medium | high | extreme
    dominant: fear | anger | sadness | calm
    secondary: fear | anger | sadness | none
```

**Attitude 规则**（影响知觉脑行为倾向）：

```
trust ≤ 3 OR stuck_count ≥ 3  →  defensive
trust ≥ 7 AND concern.intensity ≤ 4  →  cooperative
else  →  neutral

人格修正: 火爆型 defensive 阈值 +1 (trust≤4), 隐忍型 cooperative 阈值 -1 (trust≥6)
```

**Disclosure 规则**（影响知觉脑的信息透露程度）：

```
trust ≥ 7              →  high (愿意主动说)
trust ≥ 4              →  medium (问什么答什么)
trust ≤ 3 OR attitude=defensive  →  low (回避问题)
```

**Emotion Constraint 规则**（约束知觉脑情绪输出方差，见第四节）：

6 条确定性规则，从 concern + trust + stuck_count 推导 emotion 基调。

### 3.5 知觉脑看到的摘要（注入 prompt）

知觉脑不读 Cognitive Model 原始值。它收到规则计算后的摘要：

```
当前状态：
  你在担心：担心是癌症（强度 8/10）
  你对医生的信任：中等偏低（4/10）
  还没解决的问题：这个病能治好吗、会不会影响工作
  被卡住次数：2次
  情绪基调：恐惧为主，愤怒为辅，强度高
  态度倾向：开始防御
```

约 **100 token**。替代当前 ~800 token 的情绪规则文本（H3 情绪映射表 + H4 情绪基线 + H6 情绪危机 + emotion 持续性规则）。

---

## 四、Emotion Constraint Layer（规则计算，非 LLM）

### 4.1 职责

解决一个核心问题：**轻量 LLM (qwen-plus/turbo) 情绪输出方差大**。同样的输入，qwen-plus 可能 fear=8 也可能 fear=3。Emotion Constraint Layer 给出确定性的情绪基调约束，LLM 在允许范围内自由发挥。

- **输入**: concern.intensity, trust, stuck_count (3 个 Cognitive Model 字段)
- **输出**: emotion_constraint {intensity, dominant, secondary}
- **延迟**: 0ms（纯规则计算，6 条）
- **Owner**: Derived State（规则计算），反思脑禁止写入

### 4.2 6 条确定性规则

```
Rule 1: concern.intensity ≥ 7 AND trust ≤ 3 → high,    fear,  anger
Rule 2: concern.intensity ≥ 7 AND trust ≥ 6 → medium,  fear,  none
Rule 3: concern.intensity ≥ 4                 → medium,  fear,  none
Rule 4: stuck_count ≥ 4                       → high,    anger, fear
Rule 5: concern.intensity ≤ 3 AND trust ≥ 7   → low,     calm,  none
Rule 6: else                                   → low,     calm,  none
```

规则按顺序匹配，命中即停。

### 4.3 人格修正

人格特征微调规则计算，但不改规则结构：

| 人格 | 修正方式 |
|------|---------|
| 火爆型 | Rule 4 stuck_count 阈值从 4 → 3，dominant=anger 不变 |
| 隐忍型 | Rule 1 intensity 阈值从 7 → 8，外部表现更克制 |
| 焦虑型 | Rule 3 intensity 阈值从 4 → 3，更容易进入 medium |

### 4.4 知觉脑如何使用 Constraint

知觉脑收到 emotion_constraint 后，在对应 intensity 允许范围内自由输出 emotion 值：

```
intensity 档位 → 允许范围:
  none     → 0-2
  low      → 0-4
  medium   → 2-7
  high     → 5-9
  extreme  → 7-10
```

dominant 维度的值必须 ≥ secondary。引擎做最终边界钳位——如果 LLM 输出超出允许范围，钳到最近边界。

### 4.5 为什么是规则而非 LLM？

| 维度 | 规则计算 | LLM 输出 |
|------|---------|---------|
| 确定性 | 100% 可复现 | 方差大 |
| 延迟 | 0ms | ~500ms |
| 可调试 | 直接改规则 | 改 prompt 副作用多 |
| 成本 | 0 | 每次调用开销 |
| 与反思脑关系 | 无冲突 (Derived) | 与反思脑抢写 emotion_constraint |

规则计算不排斥未来升级——如果边缘 case 累积到不能用 6 条规则覆盖，可升级为轻量 LLM 输出 emotion_constraint（小 prompt，低延迟），但 V1 从规则开始。

---

## 五、知觉脑设计

### 5.1 职责

> 知觉脑本质上是**演员**，不是心理学家。

- **输入**: 学生本轮消息 + Cognitive Model 摘要 (concern + trust + unresolved_goals + stuck_count) + Derived State (attitude + disclosure + emotion_constraint)
- **输出**: text, intent, emotion 值, video_action, voice_style
- **约束**: emotion 值在 emotion_constraint 允许范围内，intent 按决策树判定
- **模型**: 轻量级 (qwen-plus/turbo)，确保 P95 < 2s

### 5.2 Prompt 结构

```
[角色定义] — 你是谁（患者/家属），什么场景       (~200 token)
[疑问清单] — 你的疑问及推进规则 (仅人文站)         (~150 token)
[当前状态摘要] — concern + trust + goals +        (~100 token)
                 attitude + disclosure + emotion_constraint
[行为规范] — 口语化、不透露诊断、听不懂黑话等     (~300 token)
[状态机策略] — 当前状态的 video/voice/text 指南   (~500 token)
[输出格式] — JSON schema                          (~100 token)
[触发词硬提醒] — B/B+/A/多问 (本轮有则注入)        (~100 token)
────────────────────────────────────────────────
合计: ~1400-1500 token (净减 ~500-700 token vs 当前)
```

### 5.3 删除的内容（vs 当前 prompt）

| 删除内容 | 原因 |
|---------|------|
| H3 情绪映射表 (否认→fear 7+, 震惊→fear 8+...) | Emotion Constraint 范围约束替代 |
| H4 情绪基线 (容忍度更高...) | trust 初始值 + attitude 变量替代 |
| H6 情绪危机处理 (2轮平复...) | 引擎 droplimit + emotion_constraint 替代 |
| emotion 值持续性规则 (~200 token) | emotion_constraint 范围约束替代 |
| 规则1 "问什么答什么（最高优先级）" | 人文站已独立 base prompt |
| intent 决策树(接诊站版) | 人文站已有独立决策树 |

---

## 六、状态机（边界控制层）

### 6.1 职责

状态机是**最后的 safety net**，不参与认知推理。

- 根据知觉脑输出的 emotion 值判定 state (calm/irritated/angry/... 等 11 状态)
- 在非 calm 状态对知觉脑的 video_action/voice_style 做硬覆盖（策略表为准）
- 极端状态 (furious/terrified/崩溃) 输出绝对指令给知觉脑

### 6.2 与 V8 的变化

| 维度 | V8 当前 | V10 |
|------|---------|-----|
| 策略表条目 | 180 条 (4性格×9状态×5意图) | 保持，但 tx 文本简化 (情绪已由 emotion_constraint 引导) |
| 极端状态指令 | furious="吵架模式" | 人文站 furious="极度失望" (已实现) |
| 铁律 | 通用 | 人文站有独立铁律 (已实现) |
| 新增 | — | 接收 emotion 值超出 constraint 范围时的钳位 |

---

## 七、反思脑设计

### 7.1 核心洞察：分类 vs 推理

原始的"反思脑直接输出数值"方案把两件事混在一次 LLM 调用中：

```
1. 理解"这几轮发生了什么"
2. 把理解映射成 4 个数值的变化
```

任务 1 是**分类**（这是解释还是回避？），任务 2 是**推理+数值估计**。分类的 LLM 方差远低于数值输出——选"explained_diagnosis"比选"trust 应该从 4 变成 7"稳定得多。

**因此反思脑拆成两层：**

```
Layer 1: 事件提取 (LLM, deepseek-v4-pro)
         输入: 最近 N 轮对话
         输出: events[] — 预定义枚举中选择
         任务: 分类，非推理

Layer 2: 状态更新 (规则引擎, 100% 确定性)
         输入: events[] + 当前 Cognitive Model
         输出: CM 字段 delta
         任务: 纯规则，零方差
```

### 7.2 四条红线

| # | 红线 | 原因 |
|---|------|------|
| 1 | 不生成回复 (text) | 知觉脑的职责 |
| 2 | 不输出策略 (strategy) | 状态机的职责 |
| 3 | 不输出情绪值 (emotion) | 知觉脑的职责，Single Authority |
| 4 | 不修改状态机状态 (state) | 状态机的职责 |
| 5 | 不输出数值 (delta) | 规则引擎的职责，LLM 只做分类 |

### 7.3 Layer 1: 事件提取（LLM 分类，非推理）

反思脑的唯一输出是事件列表。从预定义的 11 种事件枚举中选择：

| # | 事件 | 触发条件示例 | 分类维度 |
|---|------|-------------|---------|
| 1 | `concern_addressed` | 医生正面回应了 SP 的担忧 | concern ↓ |
| 2 | `concern_ignored` | 医生回避/转移 SP 的担忧 | concern ↑, stuck ↑ |
| 3 | `question_answered` | 医生完整解答了 SP 的疑问 | goals ↓, stuck=0 |
| 4 | `question_avoided` | 医生跳过问题或敷衍回答 | stuck ↑ |
| 5 | `empathy_shown` | 医生表达真诚共情/安抚 | trust ↑ |
| 6 | `dismissive` | 医生轻视/否定 SP 的感受 | trust ↓, stuck ↑ |
| 7 | `bad_news` | 医生告知冲击性坏消息 | concern ↑↑ |
| 8 | `good_news` | 医生告知正面结果/排除风险 | concern ↓↓ |
| 9 | `conflict` | 发生争吵/投诉/对抗 | trust ↓↓, stuck ↑↑ |
| 10 | `apology` | 医生做出真诚的完整道歉 | trust ↑↑, stuck=0 |
| 11 | `no_event` | 本轮无任何可识别事件 | 无变化 |

**反思脑 prompt 核心指令**：

```
你是事件分类器，不是数值估计器。

输入: 最近3-5轮对话
输出: 每轮触发了哪些事件 (从11种枚举中选择)

规则:
- 只做分类，不输出任何数值
- 一轮对话可触发多个事件
- 不确定时选 no_event，不要猜测
- 事件判定只看学生说了什么，不看 SP 当前情绪
```

**事件提取输出格式**：

```json
{
  "rounds": [
    {"round": 5, "events": ["question_avoided", "dismissive"]},
    {"round": 6, "events": ["apology", "concern_addressed"]},
    {"round": 7, "events": ["good_news"]}
  ]
}
```

### 7.4 Layer 2: 状态更新规则（100% 确定性，零 LLM）

事件到状态变化全部用确定性规则。信任和担忧的连续性由规则保证，不由 LLM 负责。

```
事件 → delta 规则表:

concern_addressed      → concern.intensity -= 2 (min 0)
concern_ignored        → concern.intensity += 1 (max 10), stuck_count += 1
question_answered      → 移入 unresolved_goals 的 resolved, stuck_count = 0
question_avoided       → stuck_count += 1
empathy_shown          → trust += 1 (max 10)
dismissive             → trust -= 1 (min 0), stuck_count += 1
bad_news               → concern.intensity += 2 (max 10)
good_news              → concern.intensity -= 3 (min 0)
conflict               → trust -= 2 (min 0), stuck_count += 2
apology                → trust += 2 (max 10), stuck_count = 0
no_event               → 无变化

人格修正 (同第四节):
  火爆型: stuck_count 累积速度 ×1.5 (每 2 次 stuck 事件 → stuck_count +2)
  隐忍型: concern_addressed 额外 -1 (更容易被安抚)
  焦虑型: bad_news 额外 +1 (更难承受坏消息)
```

**concern.primary 迁移规则**（担忧主题变化）：

```
concern.intensity = 0  → primary 自动切换为 unresolved_goals[0] (下一个最关心的事)
                           如无剩余 unresolved_goals → concern 保持但 natural decay
good_news + concern.intensity ≤ 3 → 反思脑可建议 primary 切换到下一个已浮现的担忧
```

**幅度校验（硬约束）**：

所有 delta 受 amplitude check 约束，防止单轮剧烈跳变：

```
单轮最大变化:
  trust:                 ±2
  concern.intensity:     ±3
  stuck_count:           +2 (只增不减，重置除外)
```

### 7.5 为什么这解决了稳定性问题

| 维度 | 原方案 (LLM 输出数值) | 新方案 (事件提取 + 规则) |
|------|----------------------|------------------------|
| 方差来源 | LLM 输出连续值，天然高方差 | LLM 输出枚举，分类任务方差低 |
| 可解释 | "trust 从 4 变到 7" | "empathy_shown + apology → trust +3" |
| 可调试 | 改 prompt，副作用不可控 | 改规则表，精确可控 |
| 验证成本 | 需统计 delta 方差 | 只需检查事件提取准确率 |
| 新增事件 | 需重新验证全 prompt | 只加枚举值，不改 prompt 核心 |

### 7.6 触发机制：Hybrid Trigger

```
事件触发 (Cognitive Delta Trigger):
  - 医生解释检查/诊断结果 (→ good_news / bad_news)
  - 医生表达共情/道歉 (→ empathy_shown / apology)
  - 发生冲突 (→ conflict)
  - 医生回避或敷衍 (→ question_avoided / dismissive)
  - SP 担忧被正面回应 (→ concern_addressed)

时间触发 (Silent Drift Detection):
  - 连续 5 轮未触发任何事件 → 强制运行反思脑检测
  - 静默漂移检测 prompt (~80 token):
    "最近5轮没有明显事件。检查是否存在以下细微变化:
     trust 是否缓慢下降? stuck_count 是否累积?
     是否产生了未被记录的疑问?"

防抖:
  - 两次反思间隔 ≥ 2 轮
  - 队列中有待处理任务 → 跳过本次触发
```

### 7.7 模型选择

反思脑使用 deepseek-v4-pro。任务从"数值推理"降级为"事件分类"，prompt 更短、方差更低。延迟不敏感——异步执行，允许 5-8s。

### 7.8 风险：事件提取准确率（待验证，严重度降级）

| 维度 | 原风险 | 新风险 |
|------|--------|--------|
| 风险点 | LLM 输出数值方差大 | 事件分类可能漏检/误检 |
| 严重度 | **高** | **中** |
| 缓解 | 3-5组对话×10次, delta方差<阈值 | 3-5组对话×10次, 事件提取一致率 > 90% |
| 修复难度 | 改 prompt → 重新验证方差 | 补充枚举值 → 不影响已有规则 |

**验证计划**（实现前）：
1. 准备 3-5 组真实对话（含回避/共情/冲突/解释等典型场景）
2. 人工标注每组每轮的正确事件
3. 反思脑跑 10 次，统计事件提取一致率
4. 评估标准：同组对话事件提取一致率 > 90%
5. 误检模式分析：哪些事件最容易被混淆 → 优化 prompt 或合并枚举值

---

## 八、工程约束

### 8.1 延迟预算

| 组件 | 预算 | 说明 |
|------|------|------|
| 触发词检测 | < 1ms | 纯字符串匹配 |
| 状态机 getContext | < 1ms | 查表 + 字符串拼接 |
| Derived State 计算 | < 1ms | 6 条规则 + attitude/disclosure 派生 |
| buildSystemPrompt | < 5ms | 模板替换 |
| 知觉脑 LLM | P95 < 2.5s | qwen-plus/turbo |
| 解析 + 引擎钳位 | < 5ms | JSON.parse + constraint 范围钳位 |
| **总实时延迟** | **P95 < 3s** | |
| 反思脑 LLM (事件提取) | < 8s (异步) | deepseek-v4-pro, 分类任务 |
| 事件 → 状态更新规则 | < 1ms (异步) | 11 条规则，确定性 |

### 8.2 Prompt 复杂度预算

| 组件 | Token 预算 |
|------|-----------|
| 角色定义 | ~200 |
| 疑问清单 (人文站) | ~150 |
| 当前状态摘要 (concern + trust + goals + derived) | ~100 |
| 行为规范 | ~300 |
| 状态机策略指南 | ~500 |
| 输出格式 | ~100 |
| 触发词硬提醒 (按需) | ~100 |
| **知觉脑 prompt 合计** | **~1400-1500** |
| (vs 当前 ~2200-3000) | **净减 ~500-1500** |

### 8.3 成本

| 项目 | 频率 | 模型 | 说明 |
|------|------|------|------|
| 知觉脑 | 每轮 | qwen-plus/turbo | 当前成本不变 |
| 反思脑 (事件提取) | ~0.2次/轮 | deepseek-v4-pro | 新增，分类任务，异步，prompt 更短 |
| 事件 → 状态更新 | ~0.2次/轮 | 无 (规则) | 零成本 |
| Derived State 计算 | 每轮 | 无 (规则) | 零成本 |

---

## 九、数据流示例

### 9.1 一轮完整对话（人文站，癌症担忧场景）

```
[学生] "检查结果出来了，不是癌症，是良性的"

  ┌─ 实时链路 ────────────────────────────────────────┐
  │                                                     │
  │ 1. 触发词检测: 无触发                               │
  │                                                     │
  │ 2. Cognitive Model (当前):                          │
  │    concern.intensity = 8 ("担心是癌症")              │
  │    trust = 4                                        │
  │    stuck_count = 1                                  │
  │                                                     │
  │ 3. Derived State 计算:                              │
  │    concern.intensity≥7 AND trust≤3? NO              │
  │    concern.intensity≥7 AND trust≥6? NO              │
  │    concern.intensity≥4? YES → medium, fear, none    │
  │    attitude: trust≥4 → neutral                      │
  │    disclosure: trust≥4 → medium                     │
  │                                                     │
  │ 4. 知觉脑 prompt 注入:                              │
  │    "你在担心：担心是癌症（强度 8/10）"              │
  │    "对医生的信任：中等偏低（4/10）"                 │
  │    "情绪基调：恐惧为主，强度中等"                   │
  │    "态度倾向：中立"                                 │
  │                                                     │
  │ 5. 知觉脑输出 (在 medium 范围 2-7 内):              │
  │    text: "真的？！不是癌症？那我……那我这……"         │
  │    emotion: {anger:0, fear:6, sadness:3, joy:5}     │
  │    intent: neutral                                   │
  │    (fear=6: 听到好消息但还没完全消化)               │
  │                                                     │
  │ 6. 引擎钳位: fear=6 在 medium 允许范围 (2-7) 内    │
  │    → 通过，无需钳位                                 │
  │                                                     │
  │ 7. 状态机: fear=6, sadness=3 → fearful state       │
  │    va/vs 硬覆盖: fearful_moderate / shaky           │
  │                                                     │
  │ 8. 返回学生                                         │
  └─────────────────────────────────────────────────────┘

  ┌─ 异步链路 (事件触发: "解释检查结果") ──────────────┐
  │                                                     │
  │ 9. 反思脑输入:                                      │
  │    最近3轮对话                                      │
  │                                                     │
  │ 10. 反思脑事件提取 (LLM 分类):                      │
  │    round N-2: ["dismissive", "question_avoided"]     │
  │    round N-1: ["apology"]                            │
  │    round N:   ["good_news"]                          │
  │    (只输出枚举, 不输出数值)                          │
  │                                                     │
  │ 11. 规则引擎应用事件 → delta:                       │
  │    dismissive           → trust -= 1, stuck += 1     │
  │    question_avoided     → stuck += 1                 │
  │    apology              → trust += 2, stuck = 0      │
  │    good_news            → concern.intensity -= 3     │
  │    concern.intensity: 8 → 5 (good_news -3)          │
  │    concern.primary: "担心是癌症" → "担心影响工作"   │
  │    trust: 4 → 5 (-1 +2)                             │
  │    unresolved_goals: 移除"是不是癌症"               │
  │    stuck_count: 1 → 0                               │
  │                                                     │
  │ 12. Derived State 重新计算:                         │
  │    concern.intensity=5, trust=5                      │
  │    → Rule 3: medium, fear, none                     │
  │    → attitude: neutral                              │
  │    → disclosure: medium                             │
  └─────────────────────────────────────────────────────┘

下一轮知觉脑看到的状态:
  "你在担心：担心影响工作（强度 5/10）"
  "对医生的信任：中等（5/10）"
  "情绪基调：恐惧为主，强度中等"
  "态度倾向：中立"
```

---

## 十、迁移路径

### 10.1 从当前系统到 V10

```
Phase 1: 基础设施 (不影响现有行为)
  ├── 新增 cognitive-model.js (4字段数据结构 + getter/setter + 幅度校验)
  ├── 新增 derived-state.js (attitude + disclosure + emotion_constraint 规则计算)
  ├── 新增 event-mapping.js (11种事件 → 状态 delta 规则表)
  ├── session-store.js: 初始化 cognitive model
  └── 验证: 现有测试全部通过 (cognitive model 存在但未被使用)

Phase 2: 知觉脑 prompt 改造
  ├── prompt-builder.js: 删除 H3/H4/H6/emotion持续性规则
  ├── prompt-builder.js: 增加 Cognitive Model 摘要 + Derived State 注入 (~100 token)
  ├── engine.setAbsolute(): 增加 emotion_constraint 范围钳位
  └── 验证: 知觉脑仍能正常输出, prompt token 数下降

Phase 3: 反思脑上线 (风险降级: 事件分类 vs 数值输出)
  ├── 反思脑 event-extraction prompt 设计 + 事件分类一致率测试 (3-5组对话 × 10次, 一致率 > 90%)
  ├── 新增 reflection-worker.js (异步队列 + 事件提取 LLM 调用)
  ├── index.js: 挂载 reflection worker (事件提取 → 规则更新) 流水线
  └── 验证: cognitive model 在多轮对话中持续正确更新

Phase 4: 全量回归
  ├── 接诊站全病例测试 (test-all-cases.mjs)
  ├── 人文站全场景测试 (test-all-cases.mjs --mode humanistic-comm)
  └── 延迟测试: P95 < 3s
```

### 10.2 组件对应关系

| V8 当前 | V10 | 变化 |
|---------|-----|------|
| `emotion-engine.js` | 保留钳位+刹车逻辑 | 简化, 接入 emotion_constraint 范围 |
| `emotion-state-machine.js` | 保持 | 策略表保留, 铁律已按 mode 区分 |
| `intent-classifier.js` | 保持 | 无变化 |
| `prompt-builder.js` | 重写知觉脑 prompt 组装 | 删除情绪规则, 增加 Cognitive Model + Derived State 摘要 |
| — | `cognitive-model.js` | **新增**: 4 字段心理状态存储 |
| — | `derived-state.js` | **新增**: 规则计算 attitude/disclosure/emotion_constraint |
| — | `event-mapping.js` | **新增**: 11种事件 → 状态 delta 规则表 |
| — | `reflection-worker.js` | **新增**: 事件提取 LLM 调用 + 规则更新流水线 |
| `session-store.js` | 增加 cognitive model 初始化 | +30 行 |
| `index.js` | 挂载 reflection worker | +20 行 |
| 病例 JSON | 增加 `concern` 初始化字段 | 数据层改动 (1 字段) |

---

## 十一、风险登记册

| # | 风险 | 严重度 | 缓解措施 |
|---|------|:------:|---------|
| R1 | 反思脑事件提取漏检/误检 | 中 | 分类任务方差天然低于数值输出; Phase 3 前独立验证: 3-5组对话×10次, 一致率>90% |
| R2 | Emotion Constraint 6 条规则过于刚性, 边缘 case 不覆盖 | 中 | 6 条规则先上线, 收集边缘 case 后迭代; 可升级为轻量 LLM 输出 emotion_constraint |
| R3 | 知觉脑在新 prompt 下行为退化 | 中 | Phase 2 用现有测试全量回归, A/B 对比新旧 prompt 输出 |
| R4 | 反思脑延迟过长 (>10s) | 低 | 异步执行不影响实时链路; 超时兜底: cognitive model 保持不变 |
| R5 | cognitive model 4 字段不够用, 需要新增 | 低 | Schema 精简是 V1 的设计目标; 新增字段需先证明"不能用 concern/trust/goals/stuck_count 解释" |
| R6 | 人文站和接诊站的 cognitive model 差异导致复杂度翻倍 | 低 | 通用 Schema + 初始值差异化 (trust 初值不同); 人文站专用字段 stuck_count, 接诊站固定为 0 |

---

## 十二、文件索引

```
packages/shared/src/
  cognitive-model.js         — Cognitive Model 数据结构, 4 字段 (新增)
  derived-state.js           — Derived State 规则计算 (新增)
  event-mapping.js           — 11种事件 → 状态 delta 规则表 (新增)
  emotion-engine.js          — 保留钳位+刹车逻辑 (重构)
  emotion-state-machine.js   — 状态机 (保持)
  intent-classifier.js       — 意图分类 (保持)

services/sp-api/src/
  prompt-builder.js          — 知觉脑 prompt 组装, 注入 CM + Derived State (重构)
  reflection-worker.js       — 反思脑 Worker: 事件提取 (LLM) + 规则更新 (新增)
  session-store.js           — 增加 cognitive model 初始化
  index.js                   — 挂载 reflection worker
  triggers.js                — 触发词检测 (保持, 接诊站用)

services/ai-generator/prompts/06-aisp/
  0601-sp-system.txt         — 接诊站 Base Prompt (保持)
  0604-sp-system-humanity.txt — 人文站 Base Prompt (保持)

病例数据:
  apps/admin/public/data/cases/*.json — 增加 concern 初始化字段
```
