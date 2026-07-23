# 反思脑架构设计

**状态**: 设计中 | **日期**: 2026-06-16

---

## 双脑架构总览

整个 AI-SP 系统只有两个 LLM 调用，其余全部是确定性代码。

| | 知觉脑 | 反思脑 |
|------|--------|--------|
| **职责** | 第一时间生成 SP 回复 | 事后分析医生行为 |
| **LLM 次数** | 1 次，正常温度 (~0.7) | 1 次，temperature=0.3 |
| **时序** | 同步，阻塞回复 | 异步，不阻塞回复 |
| **输入** | 全量对话 + CM_{N-1} + 病例数据 + va/vs 候选 | 本轮对话 + 结构化事实 |
| **输出** | SP 文本 + video_action + voice_style | 事件标签 → 更新 CM_N |
| **代码位置** | `prompt-builder.js` | `reflection-worker-poc.js` |
| **学生感知延迟** | 1 次 LLM | 0 (异步) |

---

## 完整数据流

```
Round N, 学生发消息
    │
    ├── 反思脑 (异步, LLM #2, temperature=0.3)
    │      │
    │      │  本轮对话 + 结构化事实
    │      ▼
    │   事件提取 → 事件标签
    │      │
    │      ▼
    │   event-mapping.js (Layer 2, 规则引擎)
    │      CM_{N-1} → CM_N
    │      │
    │      ▼
    │   derived-state.js (Layer 3, 规则引擎)
    │      CM_N → { attitude, disclosure, emotion_constraint }
    │      │
    │      (CM_N 留给 Round N+1 用)
    │
    └── 知觉脑 (同步, LLM #1, 正常温度)
           │
           │  ┌─────────────────────────────────────────┐
           │  │ tts-video-mapping.js (确定性, ~30行)      │
           │  │                                          │
           │  │ 输入: derived_state_{N-1} + intent        │
           │  │       (intent 由 intent-classifier 判定)  │
           │  │                                          │
           │  │ 输出: va/vs 候选集合 (2~3 个)             │
           │  │   例: { attitude:defensive,              │
           │  │          dominant:anger,                 │
           │  │          intent:attack }                 │
           │  │       → va: [angry, angry_intense]       │
           │  │       → vs: [loud_fast, very_loud_fast]  │
           │  └────────────┬────────────────────────────┘ │
           │               │                              │
           │               ▼                              │
           │  prompt-builder.js                            │
           │    注入: 全量对话 + 病例 + 派生状态_{N-1}      │
           │          + va/vs 候选 + 文本语气指引            │
           │               │                              │
           │               ▼                              │
           │  LLM 输出: { text, video_action, voice_style }
           │    在候选范围内选 va/vs，文本与 va/vs 自洽       │
           │               │                              │
           │               ▼                              │
           │  前端: TTS 参数 + 视频素材 + SP 文本            │
           │  → 立即返回给学生                             │
```

---

## 时间线

```
t=0   学生发消息
t=0   知觉脑 LLM + 反思脑 LLM 并行发出
t=1s  知觉脑: SP 回复到达 → 返回给学生 ✓
t=1s  反思脑: 事件标签到达 → CM_N (静默，下一轮用)
```

---

## 核心设计动机：状态滞后

### 为什么知觉脑拿到的永远是旧状态

```
Round N:
  学生发消息 → 知觉脑立即响应
  但 CM_N 还没算出来（反思脑异步跑在后台）
  知觉脑只能用 CM_{N-1}（上一轮的状态）
```

### 为什么不能让规则直接定 va/vs

```
CM_{N-1} = { trust:2, stuck:4, attitude:defensive, dominant:anger }
→ SP 上轮很愤怒

如果规则直接定: va=angry_intense, vs=very_loud_fast
→ 但本轮学生道歉了
→ SP 对着道歉咆哮 ← 行为失真
```

### 旧系统的解法：策略表提供弹性

```
状态机输出: 当前状态 = angry
  → 抽取候选策略 (3~5 条):
     attack:    angry_intense / very_loud_fast   (继续吵)
     offensive: angry / loud_fast                (冷怼)
     neutral:   angry_mild / slightly_tense      (憋着)
     friendly:  angry_mild / cold                (收住)

LLM 看到本轮对话: "对不起……我刚才态度确实太差了"
  → 选 friendly: va=angry_mild, vs=cold
  → 文本配合: "……算了，我也理解你们不容易"
```

状态滞后是必然的，策略表把这个滞后变成"可选项范围"而不是"错误指令"。

### 那反思脑改善了什么

| | 旧 | 新 |
|---|---|---|
| 状态来源 | 情绪引擎 (LLM 参与, 方差大) | derived_state (规则引擎, 100% 确定性) |
| 候选池 | 180 条策略表 → 过滤到 3~5 | ~18 种组合 → 过滤到 2~3 |
| LLM 选择权 | 保留 | 保留 |
| 为什么保留 | 解决状态滞后问题 | **同样原因, 没变** |
| 维护成本 | 高 (表格持续扩张) | 低 (18 种组合固定) |

**反思脑改善的是候选池的稳定性和规模，不是消灭 LLM 在末端的选择权。** 策略表不需要了（180 条 → ~18 种派生状态组合），但 va/vs 的最终选择始终留在知觉脑的 LLM 里——因为只有本轮 LLM 看到了本轮对话内容，能补偿 CM_{N-1} 的滞后。

---

## 反思脑三层结构

```
┌─────────────────────────────────────────┐
│ Layer 1: 事件提取 (LLM, temperature=0.3)  │
│ 职责: 看本轮对话 → 判断发生了哪些事件      │
│ 输入: 本轮对话 + 结构化事实                │
│       ✅ 可以给: unresolved_goals,         │
│                 concern.primary,           │
│                 discussed_topics           │
│       ❌ 不能给: trust, anxiety, stuck,     │
│                  attitude                  │
│ 输出: { round: N, events: [...] }         │
│ 原则: 只观察，不解释，不推理               │
├─────────────────────────────────────────┤
│ Layer 2: CM 更新 (规则引擎, 100% 确定性)   │
│ 职责: 事件 → 状态变化                      │
│ 输入: CM_{N-1} + 本轮事件                  │
│ 处理:                                     │
│   - 查 EVENT_DELTA 表 (12 事件)           │
│   - V2 规则:                               │
│     · 连续回避递增 (1x→1.5x→2x)           │
│     · 冲突比例修复 (ceil(loss×0.6))        │
│     · bad_news 振幅收窄 + concern 地板     │
│   - 振幅上限钳位                           │
│ 输出: CM_N                                │
│ 代码: event-mapping.js                    │
├─────────────────────────────────────────┤
│ Layer 3: 派生状态 (规则引擎, 100% 确定性)  │
│ 职责: CM → SP 行为姿态                     │
│ 输入: CM + personality                    │
│ 处理: 6 条优先级规则 + 人格修正            │
│ 输出:                                     │
│   - attitude: cooperative|neutral|defensive│
│   - disclosure: high|medium|low           │
│   - emotion_constraint: { intensity,       │
│       dominant, secondary }               │
│ 代码: derived-state.js                    │
└─────────────────────────────────────────┘
```

---

## TTS/视频 管线

### 固定预设

前端有且仅有：

| 类型 | 数量 | 全部取值 |
|------|------|----------|
| video_action | 9 | calm, angry_mild, angry, angry_intense, fearful_mild, fearful, fearful_intense, sad_soft, broken |
| voice_style | 11 | normal, slightly_tense, loud_fast, very_loud_fast, cold, shaky, very_shaky, soft_slow, defensive, vulnerable, broken |

前端映射表不变（useTTS.js 的 VOICE_INSTRUCTIONS / getEmotionParams）。

### 决策链路

```
tts-video-mapping.js (确定性，~30行):
  输入: derived_state_{N-1} + intent
  输出: va/vs 候选 (2~3 个)

  映射示例:
    attitude=cooperative, dominant=calm → va:[calm], vs:[normal]
    attitude=defensive, dominant=anger, intent=attack → va:[angry, angry_intense], vs:[loud_fast, very_loud_fast]
    attitude=defensive, dominant=fear, secondary=anger → va:[fearful_mild, fearful], vs:[shaky, defensive]
    attitude=cooperative, dominant=fear → va:[fearful_mild, calm], vs:[slightly_tense, normal]

    (共 ~18 种组合, 每个对应 1~3 个 va 和 1~3 个 vs)

prompt-builder.js 注入:
  "你的语气候选:
     A: 高声质问，语速快，带着愤怒 (→ angry/loud_fast)
     B: 咆哮怒吼，极度不满 (→ angry_intense/very_loud_fast)
   请根据本轮学生的发言，选择最匹配的语气。"

LLM 选出 va/vs + 写文本 → 前端直接使用，不再映射
```

### 为什么 LLM 选，不是规则定

规则看不到本轮对话。CM_{N-1} 说愤怒 → 但本轮学生道歉了 → 规则如果硬定 `very_loud_fast` 就失真。LLM 看到"对不起"，在候选里选 `cold` 而非 `very_loud_fast`——滞后被补偿。

### 和旧系统的差异

| | 旧 | 新 |
|---|---|---|
| 候选池来源 | 180 条策略表 | ~18 种派生状态组合 |
| 状态稳定性 | 情绪引擎 (方差大) | 规则引擎 (确定性) |
| LLM 输出 | text + intent + va + vs | text + va + vs |
| intent | LLM 判 | intent-classifier 判 |
| va/vs 候选数 | 3~5 | 2~3 |
| prompt 注入 | 完整策略表 (va+vs+tx+dl) | 语气候选 + 简要文本指引 |

---

## 增量模式 vs 全量模式

| | POC 全量模式 | 生产增量模式 |
|---|---|---|
| 反思脑输入 | 全量 N 轮对话 | 本轮对话 + 结构化事实 |
| LLM Token | O(N²) | O(1) ~200/轮 |
| 历史事件 | 每次重分类 (不一致风险) | 锁定不可变 |
| 跨轮追踪 | LLM 隐式理解 | 规则引擎显式追踪 |

**增量模式原则**:

- 历史事件一旦分类即锁定，永远不改
- LLM 只判本轮新发生的事
- 跨轮模式 (persistent_avoidance, trust_repair 等) 由规则引擎从 CM 字段推导

---

## CM 四字段

| 字段 | 类型 | 范围 | 含义 |
|------|------|------|------|
| concern.primary | string | — | SP 当前最核心的担忧 |
| concern.intensity | number | 0-10 | 担忧强度 |
| trust | number | 0-10 | 对医生的信任度 |
| stuck_count | number | 0-5 | 卡住轮数 (对话无效推进) |
| unresolved_goals | string[] | — | SP 提出但未被解答的疑问 |

---

## 事件体系 (12 种)

### 语义事件 (LLM 负责)

| 事件 | concern | trust | stuck |
|------|---------|-------|-------|
| concern_addressed | -2 | — | — |
| concern_ignored | +1 | — | +1 |
| question_answered | — | — | reset |
| question_avoided | — | — | +1 |
| empathy_shown | — | +1 | — |
| dismissive | — | -1 | +1 |
| bad_news | +2 | — | — |
| good_news | -3 | — | — |
| conflict | — | -2 | +2 |
| apology | — | +2 | reset |
| new_concern_expressed | +1 | — | — |
| no_event | — | — | — |

> 振幅上限: concern ±3/轮, trust ±2/轮, stuck +2/轮

### 会话事件 (规则负责, 未来扩展)

跨轮模式由规则引擎从 CM 和事件历史推导，不交给 LLM:
- `persistent_avoidance`: concern_ignored 或 question_avoided 连续 ≥ 3 轮
- `concern_persisting`: bad_news 触发后 concern 维持在地板以上
- `trust_repair`: conflict 后连续出现 apology + empathy + concern_addressed
- `question_repeated`: asked_topics 集合中已存在

---

## 情绪引擎和状态机的命运

**旧 v7/v8 情绪系统被反思脑替换:**

```
旧:                                  新:
emotion-engine.js                    event-mapping.js
emotion-state-machine.js             derived-state.js + tts-video-mapping.js
```

| 旧模块 | 为什么替换 |
|--------|-----------|
| emotion-engine.js | LLM 参与情绪数值计算，方差大 |
| emotion-state-machine.js | 180 条策略表维护成本高，根源是状态源不稳定 |

**保留不变:**
- `prompt-builder.js`: 不再注入完整策略表，改为注入 va/vs 候选 + 派生状态
- `triggers.js`: 纯文本匹配，无场景差异
- `session-store.js`: 会话管理
- `intent-classifier.js`: 意图分类

---

## 已实现 & 待实现

| 模块 | 状态 | 位置 |
|------|------|------|
| 事件提取 LLM | POC 全量模式, 98%+ 一致率 | `poc/reflection-worker-poc.js` |
| 事件提取 增量模式 | 待实现 | 同上 |
| CM 规则引擎 V2 | 已实现并验证 | `poc/event-mapping.js` |
| 派生状态引擎 V1 | 已实现并验证 | `poc/derived-state.js` |
| tts-video-mapping.js | 待实现 | 新文件 |
| SP 回复生成接入派生状态 | 待实现 | `prompt-builder.js` |
| POC 接入真实管线 | 待实现 | `index.js` |
