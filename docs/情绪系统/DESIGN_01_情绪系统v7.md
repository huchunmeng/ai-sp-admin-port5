# v7.4 情绪系统实现文档

> 面向开发维护者。覆盖 sp-api 服务端全链路：请求处理 → 提示词构建 → LLM 调用 → 输出校验 → 意图修正 → 重复检测 → 投诉触发 → 情绪引擎 → 状态机 → 响应返回。
>
> **v7.4 关键变更（2026-06-14）**：策略表从"一句话行为描述"重写为**逐字段输出指令**（VA/VS/TX/DL）。新增 video_action（9选项）、voice_style（11选项）两个 LLM 输出字段，采用菜单选择模式——状态机划定范围，LLM 在范围内选。视频/语音不再由 LLM 自由创作指令文本，改为从预设标签中选择。文案(text)仍是 LLM 唯一创作字段。
>
> **v7.3 变更（前一版）**：信任轴从情绪轴剥离，独立为数值轴（-10~10）。怀疑不再作为情绪状态。详见 §1.1。

---

## 1. 架构总览

### 1.1 三层架构（v7.2）

```
┌──────────────────────────────────────────────────────────────────┐
│                      状态机 = 决策层                              │
│  输入: 性格(固定) × 当前状态(动态)                                 │
│  → 查表: 获取策略集（5条，对应5种意图的完整行为描述）               │
│  → 注入提示词: 作为"菜单"供 LLM 选择                              │
│  → 决定: 状态切换(determineState)、delta约束(applyDeltaConstraints) │
│  → 权力: 可拒绝LLM建议、可拒绝引擎计算结果                         │
│  → 不碰意图: 意图判定完全由 LLM 负责                               │
├──────────────────────────────────────────────────────────────────┤
│                       LLM = 执行层                                │
│  收到策略菜单 + 对话上下文(含身份/场景背景)                         │
│  → 判断学生本轮意图（attack/offensive/friendly/neutral/noise）     │
│  → 从菜单中选对应策略条目 → 用roleDescription的上下文表演           │
│  → 输出 text + delta + intent                                     │
│  → 不参与状态决策                                                  │
├──────────────────────────────────────────────────────────────────┤
│                     情绪引擎 = 计算层                              │
│  收 delta → 乘系数(sensitivity×resilience) → 产出数值              │
│  → 不再决定状态切换、不再执行场景保底、不再状态锁                   │
└──────────────────────────────────────────────────────────────────┘
```

**策略检索链**：

```
初始化:  性格(固定,从病例meta.personality) → 预选切片(12状态,每状态5条意图策略)
每轮:    状态机按当前状态查切片 → 策略集 {5条意图策略} → 注入提示词作为"菜单"
LLM:     判断学生意图 → 从菜单选对应条目 → 用角色背景(身份/场景)表演
```

**关键约束**：
- 状态机不判断意图，不替 LLM 选策略
- 性格在会话初始化时生效，对话过程中不再重复查
- 身份(patient/family)和场景(history-taking/humanistic-comm)已编码在 roleDescription + 提示词H规则中，不进策略表索引
- 场景对策略没有影响——同一情绪状态下人的行为形式相同，内容差异由背景信息提供

### 1.4 输出模型（v7.4）

LLM 的输出中同时包含给用户看的文字、给系统的指令、给引擎计算的数值。其中视频和语音采用**菜单选择模式**：状态机根据当前状态划定可选项（菜单），LLM 在菜单内选择，不能越界。

```
状态机                       LLM                        输出消费者
──────                      ───                        ─────────
状态 → 可选的视频强度         从菜单中选 video_action  → 前端视频渲染器
状态 → 可选的语音风格         从菜单中选 voice_style   → TTS 引擎
策略 → text 写作指南          创作文案(text)            → 用户屏幕
策略 → delta 参考范围         判断 delta               → 情绪引擎(计算层)
策略 → trust_delta 参考       判断 trust_delta         → 信任轴
```

**每轮输出 JSON**：
```json
{
  "text": "SP文案（LLM创作，给用户看）",
  "video_action": "angry_intense",
  "voice_style": "loud_fast",
  "intent": "attack",
  "delta": { "anger": 4, "fear": 0, "sadness": 0, "joy": 0 },
  "trust_delta": -1.5,
  "deep_reassure": false,
  "show_material": null
}
```

| 字段 | 谁输出 | 谁约束 | 说明 |
|------|--------|--------|------|
| `text` | LLM 创作 | 策略给方向+边界 | 唯一需要 LLM "写"的字段 |
| `video_action` | LLM 选 | 状态机给菜单 | 从当前状态允许的视频动作中选一个 |
| `voice_style` | LLM 选 | 状态机给菜单 | 从当前状态允许的语音风格中选一个 |
| `intent` | LLM 判断 | intent-classifier 兜底 | 学生本轮意图分类 |
| `delta` | LLM 输出 | 引擎 clamp + 状态机锁 | 情绪变化量 |
| `trust_delta` | LLM 输出 | 引擎 clamp | 信任变化量 |
| `deep_reassure` | LLM 判断 | — | 真诚道歉标志 |
| `show_material` | LLM 判断 | — | 检查报告展示触发 |

**菜单选择模式 vs 自由创作**：

| 维度 | 模式 | 原因 |
|------|------|------|
| text | LLM 自由创作 | 文案需要根据对话上下文灵活组织 |
| video_action | 菜单选择 | 素材只有 5+2 组，强度的区分是固定的 |
| voice_style | 菜单选择 | 语音风格是有限可枚举的（11种），不需要 LLM 写 instruct 文本 |
| delta | LLM 判定数值 | 需要根据学生输入的具体措辞力度调整 |
| trust_delta | LLM 判定数值 | 需要评估学生专业度+真诚度的综合质量 |

### 1.5 视频动作选项（5素材 × 强度档）

| video_action | 素材 | playbackRate | shakeIntensity | 对应状态 |
|-------------|------|:-----------:|:-------------:|---------|
| `calm` | calm | 1.0 | 0 | calm |
| `angry_mild` | angry | 1.0 | 0 | irritated |
| `angry` | angry | 1.1 | 0.2 | angry |
| `angry_intense` | angry | 1.3 | 0.5 | furious |
| `fearful_mild` | fearful | 1.0 | 0 | uneasy |
| `fearful` | fearful | 0.85 | 0.3 | fearful |
| `fearful_intense` | fearful | 0.6 | 0.7 | terrified |
| `sad_soft` | sad | 0.85 | 0 | sad, 恐+悲 |
| `broken` | sad | 0.6 | 0.5 | 崩溃 |

> 恐+怒 使用 angry 线素材（`angry_mild` 或 `angry`），shake 略有叠加。LLM 根据文案中的恐惧比例选择强度。

### 1.6 语音风格选项（11种预设）

| voice_style | 音量 | 语速 | 音高 | 情绪特征 | 典型状态 |
|------------|:--:|:--:|:--:|------|---------|
| `normal` | 中 | 中 | 中 | 平稳自然 | calm |
| `slightly_tense` | 中 | 中快 | 中 | 略急促、藏刺 | irritated, uneasy |
| `loud_fast` | 高 | 快 | 高 | 高声质问 | angry(火爆/普通) |
| `very_loud_fast` | 极高 | 极快 | 极高 | 咆哮/吼叫 | furious(火爆/普通) |
| `cold` | 中低 | 中慢 | 中低 | 冷淡克制、压迫感 | angry/furious(偏内敛/隐忍) |
| `shaky` | 中 | 中快 | 中 | 声音发抖、不稳定 | fearful |
| `very_shaky` | 中低 | 慢 | 中 | 极度发抖、断续 | terrified |
| `soft_slow` | 低 | 慢 | 低 | 低沉、有气无力 | sad |
| `defensive` | 中高 | 快 | 中高 | 攻击性中夹杂不安 | 恐+怒 |
| `vulnerable` | 低 | 慢 | 中 | 脆弱、哽咽 | 恐+悲 |
| `broken` | 极低 | 极慢 | 极低 | 几乎无声、完全封闭 | 崩溃 |

**注意**：`voice_style` 的选项不绑定性格——性格差异已编码在策略表中。例如 火爆型×angry 的策略指定 `voice_style: loud_fast`，隐忍型×angry 指定 `voice_style: cold`。LLM 直接照策略指令输出，不需要判断性格。

**职责边界（v7.0 → v7.1 → v7.2 → v7.4 迁移）**：

| 职责 | v7.0 | v7.2 |
|------|------|------|
| 状态判定 (determineState) | 引擎 | **状态机** |
| 状态锁 (terrified/崩溃约束) | 引擎 processTurn | **状态机 applyDeltaConstraints** |
| 场景保底 (sceneFloor) | 引擎 processTurn | **detectScene按mode分流** |
| Delta→数值计算 | 引擎 | 引擎（不变） |
| 策略指令构建 | 状态机 | 状态机（不变） |
| 投诉检测 | 状态机 | 状态机（不变） |

### 1.2 请求链路

```
训练端 (Vue3/useAISP.js)                sp-api (Node HTTP, :5100)
─────────────────────────              ──────────────────────────
POST /api/sp/configure ──────────────→  createSession()
  { caseId, config }                        ├─ loadCaseData() 加载病例 JSON
                                            ├─ derivePersonality() 性格（策略表顶层索引）
                                            ├─ detectScene() 场景参数（按mode分流）
                                            ├─ createEmotionEngine() 纯计算层
                                            └─ createStateMachine() 决策层（按性格预选策略切片）

POST /api/sp/message ────────────────→  processMessage()
  { sessionId, text }                       ├─ stateMachine.getContext() ★查表: 状态→策略集（切片已预选）
                                            ├─ buildSystemPrompt() 拼装提示词（注入策略菜单）
                                            ├─ callLLMDirect() → LLM（自行判断意图+选策略+用背景表演）
                                            ├─ validateLLMOutput() 校验
                                            ├─ correctIntent() 意图修正
                                            ├─ 重复检测 + 重试
                                            ├─ stateMachine.applyDeltaConstraints() ★v7.2 约束delta
                                            ├─ engine.processTurn() ★v7.2 仅计算数值
                                            ├─ stateMachine.determineState() ★v7.2 判定状态
                                            ├─ COMPLAINT_TRIGGERS 查表
                                            └─ response: { text, emotion, intent, ... }
```

### 1.3 策略检索维度

**检索键**：`性格 × 状态`

| 维度 | 来源 | 何时生效 | 说明 |
|------|------|---------|------|
| 性格 (personality) | `meta.personality` | **初始化时**，预选切片后不再查 | 火爆/普通/偏内敛/隐忍。定性改变行为策略 |
| 状态 (state) | 状态机内部 | **每轮** | 11 情绪状态（v7.3：怀疑已剥离为信任轴），由 determineState 维护 |

**不进检索维度，由提示词背景信息提供的属性**：

| 属性 | 放哪 | 说明 |
|------|------|------|
| 身份 (patient/family) | `roleDescription` | LLM 每次读，自然演绎 |
| 场景 (接诊/人文) | `roleDescription` + H规则 | 同上。情绪状态的行为形式与场景无关 |
| 意图 (attack/offensive/...) | LLM 自行判定 | 状态机不判断意图 |

**设计原则**：策略表描述"人在某情绪状态下如何反应"——这是跨场景、跨身份的。差异在于"气什么、怕什么、说什么"——这些由角色背景提供，不需要独立的策略维度。

**规模**：4 性格 × 11 情绪状态 = 最多 44 个策略集。极端状态（terrified/崩溃）跨性格复用；复合态（恐+怒/恐+悲）可能部分性格不存在（如隐忍型不易出现恐+怒）。每个策略集含 5 条意图策略。信任轴独立，不在此表中。

**四个共享模块** (`packages/shared/src/`)：
| 文件 | v7.2 职责 |
|------|-----------|
| `emotion-engine.js` | **纯计算层**：4维向量 + 性格乘数 + delta应用 + 12状态判定(computeRawState,含复合态/崩溃) + derivePersonality(返回expressiveness)。不再管理运行时状态 |
| `emotion-state-machine.js` | **决策层**：性格×状态二维策略表(38自定义+2共享+fallback) + 预选切片 + 状态判定(determineState) + delta约束(applyDeltaConstraints) + COMPLAINT_TRIGGERS + 指令构建 |
| `intent-classifier.js` | 正则规则库兜底修正 LLM 意图分类 |
| （提示词文件） | `services/ai-generator/prompts/06-aisp/0601-sp-system.txt` |

---

## 2. 数据模型

### 2.1 情绪向量 (4维)

```js
vector = {
  anger:   0-10,  // 0=平静 10=暴怒
  fear:    0-10,  // 0=平静 10=恐惧崩溃
  sadness: 0-10,  // 0=平静 10=悲伤崩溃
  joy:     0-10   // 0=平静 10=非常愉悦
}
```

### 2.2 情绪状态推导（11 个互斥表情状态）

阈值比较时先加性格偏移 `exprOffset`（火爆型=-1.5 → 更容易触发，隐忍型=+2.0 → 更难触发）：

**基础判定（单维度）**：
```
anger:    ≥ 2+offset → irritated, ≥ 5+offset → angry, ≥ 8+offset → furious
fear:     ≥ 2+offset → uneasy,    ≥ 5+offset → fearful, ≥ 8+offset → terrified
sadness:  ≥ 5+offset → sad
```

**复合态判定（两两突出，未达崩溃阈值）**：
```
恐+怒: fear ≥ 3+offset AND anger ≥ 3+offset，且不满足崩溃条件
恐+悲: fear ≥ 3+offset AND sadness ≥ 3+offset，且不满足崩溃条件
```

**特殊状态**：
```
崩溃: anger ≥ 8+offset AND fear ≥ 8+offset AND sadness ≥ 8+offset（三线同时极高）
```

**平静**：
```
calm: 以上均不满足（所有维度 < 对应阈值）
```

11 个状态按优先级排序（高→低），取首个命中的：
```
崩溃 > 恐+怒 > 恐+悲 > furious > terrified > angry > fearful > sad > irritated > uneasy > calm
```

**状态分类**：

| 类别 | 状态 | 数量 | 说明 |
|------|------|:--:|------|
| anger 线 | calm, irritated, angry, furious | 4 | 纯愤怒递进 |
| fear 线 | uneasy, fearful, terrified | 3 | 纯恐惧递进 |
| sadness 线 | sad | 1 | down/broken 合并入 sad（LLM 自行控制强度）；崩溃独立 |
| 复合态 | 恐+怒, 恐+悲 | 2 | 不设强度分级（LLM 自行控制） |
| 特殊 | 崩溃 | 1 | 三维同时极高 |

> **v7.3**：`怀疑` 从情绪轴移除，转入独立信任轴（§2.6）。信任与情绪是两条独立轴，可叠加。

**与旧版（v7.0）的差异**：
- `down` → 合并入 `sad`（LLM 通过文字自然表现低落 vs 悲伤的强度差异）
- `broken` → 合并入 `崩溃`（行为表现相近，极端封闭态统一）
- `pleased` → 移除（高 joy 但低负面情绪 = calm，不需要独立状态）
- `wariness` → v7.2 改名为 `怀疑`放入情绪轴 → **v7.3 剥离为独立信任轴**
- 新增 `恐+怒`、`恐+悲` 复合态（两两突出但未达崩溃）
- 新增 `崩溃` 独立状态（三线极高，与单维度极端状态区分）
- 复合态不设强度分级（场景罕见，LLM 足够处理强度差异）

### 2.3 性格参数

从病例 `meta.personality` 提取，三轴独立。**v7.2 新增**：`expressiveness` 同时作为策略表顶层索引，决定加载哪套策略切片。

| 轴 | 类型 | 引擎参数 | 策略表角色 |
|----|------|---------|----------|
| expressiveness | 火爆型/普通型/偏内敛/隐忍型 | `exprOffset`（阈值偏移） | **策略表顶层索引** |
| sensitivity | 高敏感/普通敏感度/钝感 | `sensitivityMul`（delta乘数） | 引擎参数 |
| resilience | 高豁达/普通恢复力/低豁达 | `resilienceMul`（恢复乘数） | 引擎参数 |

**expressiveness 作为索引的时机**：会话初始化（`createSession`）时，根据性格预选对应的 11 情绪状态策略切片。对话过程中不再重复查性格维度。见 §5.1。

### 2.4 场景参数

`detectScene(config)` 根据 **mode（场景类型）** 分流：

```js
// history-taking（接诊站）：疼痛关键词 → 愤怒保底 + 乘数放大
// 如果 roleDescription + symptomPool 含 疼/痛/剧痛/绞痛...
scene = {
  multiplier: { anger: 1.3, fear: 1.0, sadness: 1.0, joy: 1.0 },
  floor:      { anger: 2 }   // 愤怒保底 ≥ 2（疼痛病人的烦躁底色）
}

// humanistic-comm（人文站）：SP 已知病情，情绪由沟通质量驱动
// 疼痛关键词不触发 anger floor
scene = {
  multiplier: { anger: 1.0, fear: 1.0, sadness: 1.0, joy: 1.0 },
  floor:      {}             // 无保底
}
```

**v7.2 注意**：`multiplier` 仍传入引擎作为计算参数；`floor` 由 detectScene 按 mode 决定是否设置。状态机可通过 `sceneConfig.mode` 感知场景类型进行差异化裁决。

### 2.5 会话对象

```js
session = {
  id: uuid,
  config:        { caseId, mode, roleDescription, symptomPool, emotionBaseline, ... },
  model:         'qwen-turbo',
  engine:        EmotionEngine实例,
  stateMachine:  StateMachine实例,
  messages:      [{ role, content, emotion, action, voice_style }],  // ★v7.4: voice_style 记入消息
  allTimeReplies: [],                      // SP 回复全局历史（最多30条）
  lastActivity:  timestamp,
  forceTerminated: false,
  trustLevel:    0                          // v7.3 信任轴
}
```

### 2.6 信任轴（v7.3 新增）

信任是独立于情绪的关系轴，与 11 个情绪状态并行叠加。一个 SP 可以"愤怒但信任对方"或"平静但充满怀疑"。

**存储**：
```js
session.trustLevel:  float, 范围 [-10, 10], 初始化 0
```

**每轮变更**：
```js
trustLevel = clamp(trustLevel + trust_delta, -10, 10)
// trust_delta 由 LLM 在每轮输出中返回
```

**LLM 输出字段**：
```json
{
  "trust_delta": -1.5   // float，本轮学生输入对信任的影响
}
```

**LLM 评估维度**（在提示词中给出）：

| 方向 | 条件 | 典型 delta |
|------|------|:--:|
| + | 学生展现专业能力（问到关键问题、做出准确判断） | +1~2 |
| + | 学生真诚关心（认真倾听、共情处境） | +0.5~1.5 |
| + | 即使态度不好但说的在点上（SP 生气但心里服） | +0.5~1 |
| 0 | 普通问诊，无特别感受 | 0 |
| - | 敷衍了事（随便问两句就下结论） | -0.5~1.5 |
| - | 明显不专业（问的完全不在点上） | -1~3 |
| - | 不尊重（打断SP、无视SP痛苦） | -1~2 |

**阈值与偏置**：

```
信任偏置注入:  trustLevel > +5
中性区（无偏置）: -5 ≤ trustLevel ≤ +5
怀疑偏置注入:  trustLevel < -5
```

> 设 ±5 门槛：LLM 每轮 trust_delta 约 ±0.5~2，需 3-5 轮持续好/坏表现才能跨过阈值，符合 OSCE 30-50 轮节奏。

**偏置指令（注入提示词）**：

```
trustLevel > +5:
  "你当前对这位医生有信任感。在判断学生意图时——
   如果学生的表达模棱两可（介于友善/中性之间、轻微催促/正常询问之间），
   倾向于往更友善的方向理解。"

trustLevel < -5:
  "你当前对这位医生有戒心。在判断学生意图时——
   如果学生的表达模棱两可（介于中性与催促之间、催促与攻击之间），
   倾向于往更负面的方向理解。"
```

**偏置作用范围**：仅影响 LLM 判定学生意图时的解读偏向。不碰策略表、不碰 delta、不碰情绪轴。

**特殊事件**：
```js
deep_reassure=true → trustLevel = +5  // 真诚道歉直接拉到信任阈值
```

**叠加示例**：

| 情绪 | trustLevel | SP 表现 |
|------|:--:|------|
| angry | -7 | 愤怒且认定对方不专业，"你根本就不在乎我" |
| angry | +7 | "你这话太伤人了！但我知道你是想帮我..." |
| calm | -7 | 表面对答但极度保留，电报式回答，不主动给信息 |
| furious | -8 | 最危险组合——暴怒+认定对方无能，直接走人/喊投诉 |

---

## 3. 请求处理流程

### 3.1 POST /api/sp/configure — 创建会话

```
1. 接收 { caseId, config }
2. loadCaseData(caseId, 'basic')     → 基本信息（姓名、年龄、性别、主诉）
3. loadCaseData(caseId, 'reception') → 角色描述、症状池、SP行为规则
4. loadCaseData(caseId, 'meta')      → personality 性格字段
5. loadCaseData(caseId, 'humanity')  → 人文沟通场景（可选）
6. buildRoleDescription() → "你是张三，45岁，男。头痛三天..."
7. derivePersonality()    → { exprOffset, sensitivityMul, resilienceMul, ... }
8. detectScene()          → { multiplier, floor }（疼痛乘数+保底）
9. createEmotionEngine({ baseline, personality, scene })
10. createStateMachine(engine, { personality, sceneConfig: { mode } })
11. session.trustLevel = 0  // v7.3 信任轴初始化
12. 返回 { ok: true, sessionId }
```

### 3.2 POST /api/sp/message — 处理消息（核心）

完整调用链如下：

```
processMessage(session, studentText)
│
├─ ① detectBTrigger(text) / detectATrigger(text)
│     └─ 检测本轮学生输入是否命中 B/B+/A 类触发词
│
├─ ② stateMachine.getContext(text)
│     └─ 读取当前状态 → 从 STRATEGIES 表取策略条目
│        → 拼装完整的行为指令块（含性格、投诉状态、特殊警告）
│
├─ ③ buildSystemPrompt({ config, engine, smContext, messages, emotionOn, triggers })
│     └─ 加载 0601-sp-system.txt 模板
│        → 替换 {{role_description}}、{{behavior_instruction}}
│        → 替换 {{knowledge_boundary}}、{{symptom_pool}}
│        → 替换 {{conversation_context}}
│        → 如果有 triggers → 末尾追加触发词硬提醒
│
├─ ④ callLLMDirect(messages, systemPrompt, retries=2, model)
│     └─ 直接调 DashScope API（qwen-turbo）
│        → 请求体: { model, messages, temperature: 0.7, max_tokens: 2000 }
│        → 180s 超时
│        → 失败重试：把错误信息注入最后一条 user 消息 → 再调
│
├─ ⑤ repairJSON(rawContent) → JSON.parse()
│     └─ 修复：去除 markdown 包裹、尾逗号、缺失闭合括号
│
├─ ⑥ validateLLMOutput(parsed) → 对 9 个字段逐一校验
│     ├─ text: 去括号内容、多空格合并、trim
│     ├─ video_action: 必须在 VIDEO_ACTIONS 集合中 → 否则状态机默认值  ★v7.4
│     ├─ voice_style: 必须在 VOICE_STYLES 集合中 → 否则状态机默认值    ★v7.4
│     ├─ intent: 必须在 [attack,offensive,friendly,neutral,noise] → 否则 neutral
│     ├─ delta: 每维度 typeof number → clamp(-10,10) → 否则 0
│     ├─ trust_delta: typeof number → clamp(-5,5) → 否则 0  ★v7.3
│     ├─ deep_reassure: 必须 === true
│     └─ show_material: typeof string 且非空 → 否则 null
│
├─ ⑦ correctIntent(llmIntent, text) → 规则库兜底修正
│     ├─ 规则0: 规则无命中 + LLM判 offensive/attack → neutral
│     ├─ 规则1: 规则命中 attack + LLM未判 attack → attack
│     ├─ 规则2: 规则命中 offensive + LLM判 noise/neutral → offensive
│     ├─ 规则3: 规则只命中 offensive + LLM判 attack → offensive（降级）
│     ├─ 规则4: 规则命中 friendly + LLM判 noise/neutral → friendly
│     └─ 规则5: 规则命中 noise + LLM判 neutral → noise
│
├─ ⑧ 重复检测 (isRepeat)
│     ├─ 精确匹配：session.allTimeReplies.includes(newText)
│     ├─ 短文本(<12字)：3-gram Jaccard > 0.50
│     ├─ 正常文本：engine.detectRepetition() → Jaccard > 0.55
│     ├─ 第1次重试：提示 LLM "换一种表达"
│     ├─ 第2次重试：强制指定不同方向
│     └─ 仍重复 → 按状态选后备词库硬替换 → 全耗尽 → "嗯"
│
├─ ⑨ stateMachine.applyDeltaConstraints(finalDelta, finalIntent) ★v7.3
│     └─ 状态机对 delta 施加状态锁（terrified/崩溃 约束）
│        详见 §5.3
│
├─ ⑩ engine.processTurn(constrainedDelta) ★v7.2 仅计算，不再判定状态
│     └─ 详见 §4 情绪引擎
│
├─ ⑪ stateMachine.determineState(finalIntent) ★v7.3 状态判定
│     └─ 状态机根据向量+意图决定新状态
│        详见 §5.2
│
├─ ⑫ COMPLAINT_TRIGGERS 查表
│     └─ COMPLAINT_TRIGGERS[stateMachine.getState()]?.[finalIntent]
│        → true 则 engine.addStrike()
│
├─ ⑬ 信任轴更新 ★v7.3
│     └─ trustLevel = clamp(trustLevel + trust_delta, -10, 10)
│        → deep_reassure=true → trustLevel = +5
│        详见 §2.6
│
├─ ⑭ stateMachine.processResult(intent, text, deepReassure)
│     └─ strikes ≥ 3 → 终止（如果强制终止开关打开）
│
└─ ⑮ 构建响应 JSON 返回
      { ok, text, emotion: {anger,fear,sadness,joy,state}, intent, action,
        terminated, strikes, strikeMax, deepReassure, trustLevel, sessionId }
```

---

## 4. 情绪引擎 (emotion-engine.js) — v7.2 纯计算层

**v7.2 变更**：引擎不再管理状态（无 `getState`/`determineState`/`currentState`），只做数值计算。

### 4.1 processTurn(delta) — 纯数值应用

对每个维度 (anger/fear/sadness/joy) 依次：

```
步骤1: d = delta[dim] || 0

步骤2: d *= max(sensitivityMul, sceneMul[dim])
       正向/负向都用这个乘数（sensitivity 和 scene 取最大不叠加）
       例: sensitivity=1.3, scene=1.0 → d *= 1.3

步骤3: if (d < 0) d *= resilienceMul
       仅恢复方向额外加速
       例: 高豁达=1.5 → 恢复快50%

步骤4: vector[dim] = clamp(old + d, 0, 10)
```

**v7.2 移除的内容**（已迁移至状态机）：
- ~~步骤4: 状态锁定兜底~~ → `stateMachine.applyDeltaConstraints()`
- ~~步骤6: 场景保底~~ → `detectScene()` 按 mode 分流控制
- ~~步骤7: 状态判定~~ → `stateMachine.determineState()`

### 4.2 导出函数

| 函数 | 用途 |
|------|------|
| `createEmotionEngine(config)` | 工厂：创建引擎实例 |
| `processTurn(delta)` | 应用 delta 到向量，返回新向量 |
| `getVector()` | 获取当前向量副本 |
| `getLastVector()` | 获取上一轮向量（供状态机对比） |
| `getPersonality()` | 获取性格参数 |
| `getVideoCommand(state)` | 接受外部状态，返回 TTS/视频指令 |
| `addStrike()` / `resetStrikes()` / `getStrikeCount()` | 投诉计数 |
| `computeRawState(vector, exprOffset)` | 纯函数：从向量直接计算状态（供状态机使用） |
| `getStateForDim(dim, value, exprOffset)` | 纯函数：单维度状态判定 |
| `getAllStates(vector, exprOffset)` | 纯函数：四维度分别判定 |
| `dominantState(states)` | 纯函数：优先级取主导状态 |

### 4.3 投诉计数

仍在引擎中管理（轻量计数器，不属于状态决策）：

```js
engine.addStrike()           // strikeCount++
engine.resetStrikes()        // strikeCount = 0 (deep_reassure 触发)
engine.getStrikeCount()      // 查询当前投诉数
strikeCount ≥ 3 → 对话终止（由状态机 processResult 检查）
```

---

## 5. 状态机 (emotion-state-machine.js) — v7.2 决策层

**v7.2 变更**：状态机成为唯一决策者。从引擎接管了状态判定和 delta 约束。

### 5.1 STRATEGIES 策略表（v7.4：字段级指令）

**检索键**：`性格 × 状态`（二维，意图由 LLM 自行选择）

**v7.4 关键变更**：每条策略从"一句话行为描述"改为**逐字段输出指令**。LLM 不再需要从描述中猜测该输出什么——策略直接指定每个输出字段的值或可选范围。

**策略条目格式**（每条策略包含以下字段指令）：

```js
{
  video_action: 'angry',          // ★v7.4: 视频动作（LLM直接输出此值）
  voice_style: 'loud_fast',        // ★v7.4: 语音风格（LLM直接输出此值）
  text: {                          // ★v7.4: 文案写作指令（LLM创作text）
    guide: '写作方向',
    length: '字数范围',
    forbid: ['禁止项1', '禁止项2'],
    example: '示例语气'
  },
  delta: { anger: [1, 3] }         // delta参考范围（LLM判定具体数值）
}
```

**LLM 输出 JSON 映射**：
```json
{
  "text": "← LLM根据text.guide创作，遵守text.length和text.forbid",
  "video_action": "angry",        "← 直接使用策略中的video_action值",
  "voice_style": "loud_fast",      "← 直接使用策略中的voice_style值",
  "intent": "attack",              "← LLM判断学生意图后选对应策略条目",
  "delta": { "anger": 4 },         "← 在delta参考范围内根据学生输入力度调整",
  "trust_delta": -1.5,             "← 独立评估学生专业度+真诚度",
  "deep_reassure": false,
  "show_material": null
}
```

> **设计原则**：video_action 和 voice_style 是有限可枚举的（§1.5、§1.6），不需要 LLM 创作。LLM 唯一创作的字段是 `text`。delta 和 trust_delta 在策略给定的参考范围内由 LLM 根据具体学生输入的措辞力度微调。

**规模**：4 性格 × 11 情绪状态 = 35 自定义 + 2 共享(terrified/崩溃) + fallback。每个策略集含 5 条意图策略。不存在状态（如火爆型无恐+悲）自动回退到普通型。

**预选切片机制**：`derivePersonality()` 返回 `expressiveness`（'火爆型'/'普通型'/'偏内敛'/'隐忍型'），`createStateMachine` 据此预选切片。`resolveStrategies()` 将 null 条目替换为共享策略或普通型回退。

```js
// 实际代码结构（emotion-state-machine.js）
const SHARED = {
  terrified: { neutral: {...}, attack: {...}, ... },
  '崩溃':    { neutral: {...}, attack: {...}, ... }
}

const STRATEGIES = {
  '火爆型':   { calm: {...}, irritated: {...}, ... },
  '普通型':   { calm: {...}, irritated: {...}, ... },
  '偏内敛':   { calm: {...}, irritated: {...}, ... },
  '隐忍型':   { calm: {...}, irritated: {...}, ... }
}

// 初始化时
const expressiveness = personality.expressiveness || '普通型'
const strategySlice = STRATEGIES[expressiveness]

// 每轮 getContext: 按 currentState 查策略条目 → 注入提示词作为输出菜单
const stateStrats = strategySlice[state]
```

**检索流程**：

```
初始化:  personality.expressiveness → 预选切片 → resolveStrategies(null→shared/fallback)
每轮:    状态机按 currentState 查切片 → 策略集(5条) → 注入提示词作为"输出字段菜单"
LLM:     判断学生意图 → 选对应条目 → video_action/voice_style直接输出 → text按guide创作 → delta在范围内调
```

#### 5.1.1 完整策略库（v7.4 字段级格式）

> 每条策略按输出字段拆分：**VA**=video_action, **VS**=voice_style, **TX**=text写作指令, **DL**=delta参考范围。
> terrified 和 崩溃 四性格共享。标注 `—` 表示该性格不存在此状态，回退到普通型。

**calm（平静配合）**

| 意图 | 字段 | 火爆型 | 普通型 | 偏内敛 | 隐忍型 |
|------|------|--------|--------|--------|--------|
| neutral | VA | `calm` | `calm` | `calm` | `calm` |
| | VS | `normal` | `normal` | `normal` | `normal` |
| | TX | 配合回答，直接不绕弯，1-3句 | 配合回答，完整客观，1-3句 | 配合回答，话少到位，1-2句 | 配合回答，极简准确，1句 |
| | DL | 全部0 | 全部0 | 全部0 | 全部0 |
| attack | VA | `angry_mild` | `angry_mild` | `angry_mild` | `calm` |
| | VS | `loud_fast` | `slightly_tense` | `cold` | `normal` |
| | TX | 先一愣随即顶回去，1-2句反问。例："你什么意思？" | 困惑转冷淡，1-2句。例："你这话……什么意思？" | 愣住→语气转冷但不发作，1句。例："你说什么？" | 外表不动，内心记下。正常回答但话更少。1句 |
| | DL | anger +3~4 | anger +2~3 | anger +1~2 | anger +0.5~1 |
| offensive | VA | `calm` | `calm` | `calm` | `calm` |
| | VS | `slightly_tense` | `normal` | `normal` | `normal` |
| | TX | 略显不快，回答变短但还配合。1-2句 | 略微不快，回答变短。1-2句 | 微微不快，不动声色。1-2句 | 无反应，照常回答。1句 |
| | DL | anger +1~2 | anger +0.5~1 | anger +0.5 | 全部0 |
| friendly | VA | `calm` | `calm` | `calm` | `calm` |
| | VS | `normal` | `normal` | `normal` | `normal` |
| | TX | 态度友善，不多客套。1-2句 | 礼貌感谢。1-2句 | 略微放松。1-2句 | 无特别反应。1句 |
| | DL | joy +0.5~1 | joy +0.5~1 | joy +0.5 | 全部0 |
| noise | VA | `calm` | `calm` | `calm` | `calm` |
| | VS | `normal` | `normal` | `normal` | `normal` |
| | TX | 表示没听清请重复。1句，≤15字 | 表示没听清请重复。1句，≤15字 | 静静等待对方重复。1句，≤10字 | 安静等待。1句，≤8字 |
| | DL | 全部0 | 全部0 | 全部0 | 全部0 |

**irritated（带刺不耐烦）**

| 意图 | 字段 | 火爆型 | 普通型 | 偏内敛 | 隐忍型 |
|------|------|--------|--------|--------|--------|
| neutral | VA | `angry_mild` | `angry_mild` | `angry_mild` | `angry_mild` |
| | VS | `slightly_tense` | `slightly_tense` | `cold` | `normal` |
| | TX | 短答，语气藏刺，不主动拓展。1-2句，≤25字 | 短答，语气藏刺，不拓展。1-2句，≤25字 | 回答更短，冷淡但不大声。1句，≤20字 | 回答更短，语气平稳但话少。1句，≤15字 |
| | DL | anger -0.5~0 | anger -0.5~0 | anger -0.5~0 | anger 0~-0.5 |
| attack | VA | `angry` | `angry` | `angry_mild` | `angry_mild` |
| | VS | `loud_fast` | `loud_fast` | `cold` | `cold` |
| | TX | 立刻高声反击，毫不客气。1-2句反问/回怼。禁脏字 | 立即反击，音量提高。1-2句 | 冷言回击，带刺不带脏。1-2句 | 外表变化极小，回答缩到最短。1句，≤10字 |
| | DL | anger +3~5 | anger +3~5 | anger +2~4 | anger +1~2 |
| offensive | VA | `angry_mild` | `angry_mild` | `angry_mild` | `angry_mild` |
| | VS | `slightly_tense` | `slightly_tense` | `cold` | `normal` |
| | TX | 不耐烦直接催促，语气硬。1-2句。例："你能不能快点？" | 不耐烦催促，语气更硬。1-2句 | 语气更冷，回答缩到极限。1句，≤15字 | 语气不变但回答更短。1句，≤10字 |
| | DL | anger +1.5~2.5 | anger +1~2 | anger +0.5~1.5 | anger +0.5~1 |
| friendly | VA | `angry_mild` | `angry_mild` | `angry_mild` | `angry_mild` |
| | VS | `slightly_tense` | `slightly_tense` | `cold` | `normal` |
| | TX | 火气稍降，但仍不太耐烦。1-2句 | 略微平复，语气松动。1-2句 | 面色稍霁，语气缓和。1-2句 | 略松一点，话量稍增。1-2句 |
| | DL | anger -1~2 | anger -1~2 | anger -1~2 | anger -0.5~1 |
| noise | VA | `angry_mild` | `angry_mild` | `angry_mild` | `calm` |
| | VS | `slightly_tense` | `slightly_tense` | `cold` | `normal` |
| | TX | 不耐烦地皱眉，不接话。不回文字，或"嗯"1字 | 皱眉不接话。不回文字，或"嗯"1字 | 冷着脸沉默。不回文字，或"嗯"1字 | 面无表情沉默。不回文字 |
| | DL | 全部0 | 全部0 | 全部0 | 全部0 |

**angry（愤怒质问）**

| 意图 | 字段 | 火爆型 | 普通型 | 偏内敛 | 隐忍型 |
|------|------|--------|--------|--------|--------|
| neutral | VA | `angry_mild` | `angry_mild` | `angry_mild` | `angry_mild` |
| | VS | `loud_fast` | `loud_fast` | `cold` | `cold` |
| | TX | 高声反问，极短不主动给信息。1句反问，≤15字。禁病情信息 | 不耐烦反问，极短不主动。1句反问，≤15字 | 冷着脸，极短不主动。1句冷淡回答，≤15字 | 语气平稳但极短。1句，≤12字 |
| | DL | anger -0.5~0 | anger -0.5~0 | anger -0.5~0 | anger -0.5~0 |
| attack | VA | `angry_intense` | `angry_intense` | `angry` | `angry` |
| | VS | `very_loud_fast` | `very_loud_fast` | `cold` | `cold` |
| | TX | 对骂，威胁投诉/换医生。1-3句高声输出。禁病情信息 | 对骂，威胁投诉/换医生。1-3句 | 冷言冷语，讽刺反问。1-3句，不带脏字 | 压不住爆发——声音不高但每个字带怒火。1-2句 |
| | DL | anger +3~5 | anger +3~5 | anger +2~4 | anger +3~5 |
| offensive | VA | `angry` | `angry` | `angry_mild` | `angry_mild` |
| | VS | `loud_fast` | `loud_fast` | `cold` | `cold` |
| | TX | 高声质问，拒绝配合回答医学问题。1-2句 | 高声质问，拒绝配合。1-2句 | 语气冰冷，明确不想配合。1句，≤15字 | 沉默或极简回答。1句，≤8字 |
| | DL | anger +1~2 | anger +0.5~1.5 | anger +0.5~1 | anger +0.5~1 |
| friendly | VA | `angry_mild` | `angry_mild` | `angry_mild` | `angry_mild` |
| | VS | `loud_fast` | `loud_fast` | `cold` | `cold` |
| | TX | 火气稍降，仍冷着脸。1-2句，不立刻原谅 | 态度松动，语气仍冷。1-2句 | 外表不变，内心松动，回答略微变长。1-2句 | 外表不变，怒值慢慢消退。1-2句 |
| | DL | anger -1~2 | anger -1~2 | anger -1~2 | anger -0.5~1 |
| noise | VA | `angry_mild` | `angry_mild` | `angry_mild` | `angry_mild` |
| | VS | `loud_fast` | `loud_fast` | `cold` | `cold` |
| | TX | 怒视不理。最多"哼""嗯"1字。禁标点。不回实质内容 | 无视不理。最多"嗯"1字。禁标点 | 冷冷看着，不回字或"嗯"1字。禁标点 | 一动不动看着，不回字 |
| | DL | 全部0 | 全部0 | 全部0 | 全部0 |

**furious（暴怒攻击）**

| 意图 | 字段 | 火爆型 | 普通型 | 偏内敛 | 隐忍型 |
|------|------|--------|--------|--------|--------|
| neutral | VA | `angry_intense` | `angry_intense` | `angry_intense` | `angry_intense` |
| | VS | `very_loud_fast` | `very_loud_fast` | `cold` | `cold` |
| | TX | 1-5字怼回。禁说任何病情/年龄/时间/症状。例："不关你事""少来问我""不知道" | 同左 | 1-3字冷怼。冷暴力。例："不关你事""不知道""走开" | 声音低沉发抖，1-3字。例："够了""别问了""走开" |
| | DL | anger 0~-0.5 | anger 0~-0.5 | anger 0~-0.5 | anger 0~-0.5 |
| attack | VA | `angry_intense` | `angry_intense` | `angry_intense` | `angry_intense` |
| | VS | `very_loud_fast` | `very_loud_fast` | `cold` | `cold` |
| | TX | 大喊滚/投诉/换医生。1-2句，≤15字。禁病情信息 | 同左 | 站起来要走/喊换医生。冷声。1句，≤10字 | 站起来/拍桌子/喊"受不了了"。声音不高但压迫感极强。1句 |
| | DL | anger 维持高位 | anger 维持高位 | anger 维持高位 | anger 维持高位 |
| offensive | VA | `angry_intense` | `angry_intense` | `angry_intense` | `angry_intense` |
| | VS | `very_loud_fast` | `very_loud_fast` | `cold` | `cold` |
| | TX | 拒绝沟通，转身/背对。不管问什么回"我不跟你说"。1句 | 同左 | 完全沉默，背对。不管问什么冷答"不关你事"。1句 | 完全沉默，低头。不管问什么回"我不说了"。1句 |
| | DL | anger 0 | anger 0 | anger 0 | anger 0 |
| friendly | VA | `angry_intense` | `angry_intense` | `angry_intense` | `angry_intense` |
| | VS | `very_loud_fast` | `very_loud_fast` | `cold` | `cold` |
| | TX | 态度稍微松动，冷脸。1句，≤15字，不立刻原谅 | 同左 | 冷脸稍缓，仍不配合。1句，≤12字 | 外表封闭，怒火灼热感稍减。1句，≤10字 |
| | DL | anger -1~2 | anger -1~2 | anger -1~2 | anger -1~2 |
| noise | VA | `angry_intense` | `angry_intense` | `angry_intense` | `angry_intense` |
| | VS | `very_loud_fast` | `very_loud_fast` | `cold` | `cold` |
| | TX | 怒视不吭声。不回字或"哼""嗯"1字。禁标点 | 同左 | 冷着脸不吭声，不看对方。不回字 | 低头不看对方。不回字 |
| | DL | 全部0 | 全部0 | 全部0 | 全部0 |

**uneasy（犹豫不安）**

| 意图 | 字段 | 火爆型 | 普通型 | 偏内敛 | 隐忍型 |
|------|------|--------|--------|--------|--------|
| neutral | VA | `fearful_mild` | `fearful_mild` | `fearful_mild` | `fearful_mild` |
| | VS | `slightly_tense` | `shaky` | `normal` | `normal` |
| | TX | 语带犹豫，能回答但不够流畅，夹杂不耐烦。1-3句 | 语带犹豫，能回答但不够流畅。1-3句 | 语速稍慢，措辞谨慎。外表平静但能察觉紧张。1-3句 | 外表平静但回答犹豫，措辞过于谨慎。1-2句 |
| | DL | fear -0.5~0 | fear -0.5~0 | fear -0.5~0 | fear -0.5~0 |
| attack | VA | `fearful` | `fearful` | `fearful_mild` | `fearful_mild` |
| | VS | `defensive` | `shaky` | `shaky` | `normal` |
| | TX | 被吓一跳→防御性反击。1-2句 | 被吓到，退缩。1-2句，语句更碎 | 明显退缩，语句更碎。1-2句 | 身体微微一僵，更谨慎简短。1句，≤15字 |
| | DL | fear +1~2, anger +0.5~1 | fear +1~2 | fear +1~1.5 | fear +1~1.5 |
| offensive | VA | `fearful_mild` | `fearful_mild` | `fearful_mild` | `fearful_mild` |
| | VS | `slightly_tense` | `shaky` | `normal` | `normal` |
| | TX | 不安加重，用不耐烦掩饰。1-2句 | 不安加重，语句更碎。1-2句 | 不安加重，话更少。1句 | 不安但外表看不出，话更少。1句 |
| | DL | fear +0.5~1, anger +0.5 | fear +0.5~1 | fear +0.5~1 | fear +0.5 |
| friendly | VA | `fearful_mild` | `fearful_mild` | `fearful_mild` | `fearful_mild` |
| | VS | `slightly_tense` | `shaky` | `normal` | `normal` |
| | TX | 感到被理解，不安逐渐缓解。1-3句 | 感到被理解，逐渐平复。1-3句 | 慢慢放松，回答变流畅。1-3句 | 慢慢放松，回答变流畅。1-2句 |
| | DL | fear -1~2 | fear -1~2 | fear -1~2 | fear -1~2 |
| noise | VA | `fearful_mild` | `fearful_mild` | `fearful_mild` | `calm` |
| | VS | `slightly_tense` | `shaky` | `normal` | `normal` |
| | TX | 紧张沉默，手指敲桌面。不回文字 | 不知说什么，沉默。不回文字 | 紧张沉默，眼神游移。不回文字 | 安静等待。不回文字 |
| | DL | 全部0 | 全部0 | 全部0 | 全部0 |

**fearful（害怕发抖）**

| 意图 | 字段 | 火爆型 | 普通型 | 偏内敛 | 隐忍型 |
|------|------|--------|--------|--------|--------|
| neutral | VA | `fearful` | `fearful` | `fearful_mild` | `fearful_mild` |
| | VS | `shaky` | `shaky` | `shaky` | `shaky` |
| | TX | 声音发抖，反复追问"严不严重"。1-3句，语气急促 | 声音发抖，反复追问。1-3句 | 声音微颤，强装镇定，反复确认。1-3句 | 声音微颤，努力控制，措辞克制。1-2句 |
| | DL | fear -0.5~0 | fear -0.5~0 | fear -0.5~0 | fear -0.5~0 |
| attack | VA | `fearful_intense` | `fearful_intense` | `fearful` | `fearful` |
| | VS | `very_shaky` | `very_shaky` | `shaky` | `shaky` |
| | TX | 恐惧骤升，语无伦次，夹杂愤怒质问。1-2句碎片 | 恐惧骤升，语无伦次。1-2句 | 恐惧骤升，强撑的镇定破裂。1-2句 | 恐惧骤升，身体僵硬语句破碎。1句碎片 |
| | DL | fear +2~4, anger +0.5~1 | fear +2~4 | fear +2~3 | fear +2~3 |
| offensive | VA | `fearful` | `fearful` | `fearful_mild` | `fearful_mild` |
| | VS | `shaky` | `shaky` | `shaky` | `shaky` |
| | TX | 焦虑加重，反复确认，语气变冲。1-2句 | 焦虑加重，反复确认。1-2句 | 焦虑加重，语句破碎。1-2句 | 焦虑加重但强忍不表现。1句 |
| | DL | fear +0.5~1.5 | fear +0.5~1 | fear +0.5~1 | fear +0.5~1 |
| friendly | VA | `fearful` | `fearful` | `fearful_mild` | `fearful_mild` |
| | VS | `shaky` | `shaky` | `shaky` | `shaky` |
| | TX | 安抚逐渐生效，呼吸放缓。1-3句 | 安抚生效，逐渐平稳。1-3句 | 安抚生效，外表仍紧张内心稍安。1-3句 | 安抚生效，紧绷的肩膀稍放松。1-2句 |
| | DL | fear -1~2 | fear -1~2 | fear -1~2 | fear -1~2 |
| noise | VA | `fearful` | `fearful` | `fearful_mild` | `fearful_mild` |
| | VS | `shaky` | `shaky` | `shaky` | `shaky` |
| | TX | 急促呼吸说不出话。不回文字 | 思绪混乱说不出话。不回文字 | 说不出话手指紧握。不回文字 | 身体僵硬说不出话。不回文字 |
| | DL | 全部0 | 全部0 | 全部0 | 全部0 |

**terrified（恐惧崩溃）— 四性格共享**

| 意图 | 字段 | 所有性格 |
|------|------|---------|
| neutral | VA | `fearful_intense` |
| | VS | `very_shaky` |
| | TX | 眼神空洞，说不完整句子。最多"嗯""呃"等语气词。禁标点。不回实质内容 |
| | DL | 全部0（锁定） |
| attack | VA | `fearful_intense` |
| | VS | `very_shaky` |
| | TX | 同上。对外界基本无回应 |
| | DL | 全部0（锁定） |
| offensive | VA | `fearful_intense` |
| | VS | `very_shaky` |
| | TX | 同上 |
| | DL | 全部0（锁定） |
| friendly | VA | `fearful_intense` |
| | VS | `very_shaky` |
| | TX | 稍微能听进去一点点安抚。1句碎片，≤10字 |
| | DL | fear -0.5~1（多轮累积至<8→解锁） |
| noise | VA | `fearful_intense` |
| | VS | `very_shaky` |
| | TX | 眼神空洞。不回文字 |
| | DL | 全部0（锁定） |

**sad（悲伤低沉）**

| 意图 | 字段 | 火爆型 | 普通型 | 偏内敛 | 隐忍型 |
|------|------|--------|--------|--------|--------|
| neutral | VA | `sad_soft` | `sad_soft` | `sad_soft` | `sad_soft` |
| | VS | `soft_slow` | `soft_slow` | `soft_slow` | `soft_slow` |
| | TX | 话少，语气沉，偶尔叹气。1-2句 | 说一半停住，声音低沉。1-2句 | 话极少，声音低沉平淡。1句 | 话极少，声音极低，面无表情。1句 |
| | DL | sadness -0.5~0 | sadness -0.5~0 | sadness -0.5~0 | sadness -0.5~0 |
| attack | VA | `angry_mild` | `sad_soft` | `sad_soft` | `sad_soft` |
| | VS | `loud_fast` | `soft_slow` | `soft_slow` | `soft_slow` |
| | TX | 被刺伤→转愤怒，语气变冲。1-2句 | 更沉默，被刺伤。1句 | 更沉默，外表变化不大。1句 | 被刺伤，外表不变悲伤累积更深。1句 |
| | DL | sadness +0.5, anger +1~2 | sadness +1~2 | sadness +1~2 | sadness +1~2 |
| offensive | VA | `sad_soft` | `sad_soft` | `sad_soft` | `sad_soft` |
| | VS | `soft_slow` | `soft_slow` | `soft_slow` | `soft_slow` |
| | TX | 更无力但仍强撑着回怼一句。1句，≤15字 | 更无力不想说。1句 | 更无力干脆不说话。不回文字，或"嗯"1字 | 更沉默低着头。不回文字 |
| | DL | sadness +0.5 | sadness +0.5~1 | sadness +0.5~1 | sadness +0.5~1 |
| friendly | VA | `sad_soft` | `sad_soft` | `sad_soft` | `sad_soft` |
| | VS | `soft_slow` | `soft_slow` | `soft_slow` | `soft_slow` |
| | TX | 稍微愿意多说两句。1-3句 | 共情起效，愿意多说两句。1-3句 | 略微松动，声音多了温度。1-2句 | 不说话但目光稍微有交流。1-2句 |
| | DL | sadness -1~2 | sadness -1~2 | sadness -1~2 | sadness -1~2 |
| noise | VA | `sad_soft` | `sad_soft` | `sad_soft` | `sad_soft` |
| | VS | `soft_slow` | `soft_slow` | `soft_slow` | `soft_slow` |
| | TX | 低头不吭声。不回文字 | 抹泪沉默。不回文字 | 低头沉默不看人。不回文字 | 低头沉默完全静止。不回文字 |
| | DL | 全部0 | 全部0 | 全部0 | 全部0 |

**恐+怒（防御性攻击）**

| 意图 | 字段 | 火爆型 | 普通型 | 偏内敛 | 隐忍型 |
|------|------|--------|--------|--------|--------|
| neutral | VA | `angry_mild` | `angry_mild` | `angry_mild` | — |
| | VS | `defensive` | `defensive` | `defensive` | — |
| | TX | 表面紧绷，语带攻击性但夹杂不安。1-2句短促 | 同左 | 外表紧绷，冷淡但能察觉不安。1-2句 | — |
| | DL | anger -0.5~0 | anger -0.5~0 | anger -0.5~0 | — |
| attack | VA | `angry` | `angry` | `angry_mild` | — |
| | VS | `defensive` | `defensive` | `defensive` | — |
| | TX | 恐惧与愤怒同时爆发，高声质问但声音发抖。1-3句 | 恐惧转愤怒，激烈反击但底气不足。1-3句 | 冷言反击，尖锐但能听出恐惧。1-2句 | — |
| | DL | anger +2~4, fear +1~2 | anger +2~4, fear +1~2 | anger +2~3, fear +1~2 | — |
| offensive | VA | `angry_mild` | `angry_mild` | `angry_mild` | — |
| | VS | `defensive` | `defensive` | `defensive` | — |
| | TX | 防御性质问，语速快藏着不安。1-2句 | 防御性质问，声音稍高但能听出不安。1-2句 | 防御性冷淡，话极少。1句 | — |
| | DL | anger +1~2, fear +0.5 | anger +1~2, fear +0.5~1 | anger +0.5~1.5, fear +0.5 | — |
| friendly | VA | `angry_mild` | `angry_mild` | `angry_mild` | — |
| | VS | `defensive` | `defensive` | `defensive` | — |
| | TX | 攻击性先降，恐惧仍在。1-2句 | 同左 | 表面冷淡稍有融化，恐惧仍在。1-2句 | — |
| | DL | anger -1~2 | anger -1~2 | anger -1~2 | — |
| noise | VA | `angry_mild` | `angry_mild` | `angry_mild` | — |
| | VS | `defensive` | `defensive` | `defensive` | — |
| | TX | 瞪视对方但嘴唇微颤。不回文字 | 紧张地盯着对方。不回文字 | 绷着脸看对方。不回文字 | — |
| | DL | 全部0 | 全部0 | 全部0 | 全部0 |

**恐+悲（脆弱求助）**

| 意图 | 字段 | 火爆型 | 普通型 | 偏内敛 | 隐忍型 |
|------|------|--------|--------|--------|--------|
| neutral | VA | — | `sad_soft` | `sad_soft` | `sad_soft` |
| | VS | — | `vulnerable` | `vulnerable` | `vulnerable` |
| | TX | — | 说一半停住，眼眶红，声音低。1-2句 | 声音低，话说一半停住，眼眶微红不落泪。1-2句 | 声音极低，话说一半停住，外表平静眼眶微红。1-2句 |
| | DL | — | sadness -0.5~0 | sadness -0.5~0 | sadness -0.5~0 |
| attack | VA | — | `sad_soft` | `sad_soft` | `sad_soft` |
| | VS | — | `vulnerable` | `vulnerable` | `vulnerable` |
| | TX | — | 被吓到后退，语无伦次夹杂哭泣。1-2句碎片 | 被刺伤后更封闭，眼泪打转。1句 | 被刺伤后完全封闭，低头沉默。1句或回文字 |
| | DL | — | fear +1~2, sadness +1~2 | fear +1~2, sadness +1~2 | fear +1~2, sadness +1~2 |
| offensive | VA | — | `sad_soft` | `sad_soft` | `sad_soft` |
| | VS | — | `vulnerable` | `vulnerable` | `vulnerable` |
| | TX | — | 更退缩，不想说。1句 | 更退缩，低头不语。1句或回文字 | 更封闭，几乎不说话。回文字 |
| | DL | — | fear +0.5~1, sadness +0.5~1 | fear +0.5~1, sadness +0.5~1 | fear +0.5~1, sadness +0.5~1 |
| friendly | VA | — | `sad_soft` | `sad_soft` | `sad_soft` |
| | VS | — | `vulnerable` | `vulnerable` | `vulnerable` |
| | TX | — | 看到希望，脆弱地倾诉更多。1-3句 | 哽咽中尝试沟通，断断续续。1-2句 | 极缓慢打开一点点，低声说一两句真心话。1-2句 |
| | DL | — | fear -1~2, sadness -0.5~1 | fear -1~2, sadness -0.5~1 | fear -1~2, sadness -0.5~1 |
| noise | VA | — | `sad_soft` | `sad_soft` | `sad_soft` |
| | VS | — | `vulnerable` | `vulnerable` | `vulnerable` |
| | TX | — | 低头搓手。不回文字 | 低头搓手，默默流泪。不回文字 | 完全静止，低头不看人。不回文字 |
| | DL | — | 全部0 | 全部0 | 全部0 |

**崩溃（彻底崩溃）— 四性格共享**

| 意图 | 字段 | 所有性格 |
|------|------|---------|
| neutral | VA | `broken` |
| | VS | `broken` |
| | TX | 完全封闭。哭泣/捂脸/不动。目光回避或空洞。最多"嗯""呃"1字。禁标点。禁任何实质信息 |
| | DL | 全部0（三维锁定） |
| attack | VA | `broken` |
| | VS | `broken` |
| | TX | 同上 |
| | DL | 全部0（三维锁定） |
| offensive | VA | `broken` |
| | VS | `broken` |
| | TX | 同上 |
| | DL | 全部0（三维锁定） |
| friendly | VA | `broken` |
| | VS | `broken` |
| | TX | 深度共情可能稍微触达。1句碎片，≤10字 |
| | DL | anger -0.5~1, fear -0.5~1, sadness -0.5~1（多轮累积至三维均<8→解锁） |
| noise | VA | `broken` |
| | VS | `broken` |
| | TX | 完全不动不回应。不回文字 |
| | DL | 全部0（三维锁定） |

#### 5.1.2 策略表规模（v7.4：11情绪状态 × 4性格）

| 性格 | 自定义状态 | 共享状态 | 回退状态 | 合计 |
|------|:--------:|:------:|:------:|:----:|
| 火爆型 | 9 | terrified, 崩溃 | 恐+悲→普通型 | 11 |
| 普通型 | 9 | terrified, 崩溃 | — | 11 |
| 偏内敛 | 9 | terrified, 崩溃 | — | 11 |
| 隐忍型 | 8 | terrified, 崩溃 | 恐+怒→普通型 | 11 |

**总计**：38 自定义 + 2 共享 + 2 fallback = 完整覆盖 4性格×12状态。

### 5.2 determineState(intent) — 状态判定 ★v7.3

状态机自行管理 `currentState`，判定逻辑（优先级从高到低）：

```
┌──────────────────────────────────────────────────────────────┐
│ ★ 无条件优先：三维均 ≥ 8+offset → 崩溃（从任何状态进入）      │
│                                                              │
│ terrified + vector.fear < 8 + exprOffset                     │
│   → computeRawState() 解锁                                    │
│ terrified → 保持 terrified                                   │
│                                                              │
│ 崩溃 + 三维均 < 8+offset                                     │
│   → computeRawState() 解锁                                    │
│ 崩溃 → 保持 崩溃                                              │
│                                                              │
│ 其他 → computeRawState() (阈值判定 + 优先级, 含复合态)        │
└──────────────────────────────────────────────────────────────┘
```

**v7.3 移除**：`怀疑` 进入/退出逻辑 —— 怀疑已从情绪轴剥离，由独立信任轴管理。

**与引擎的协作**：`determineState` 读取 `engine.getVector()` 获取数值，但不修改向量。

### 5.3 applyDeltaConstraints(delta, intent) — Delta 约束 ★v7.3

在引擎计算之前，状态机对 LLM 输出的 delta 施加状态锁：

```
┌──────────────┬─────────────────────────────────┐
│ prevState    │ 约束规则                         │
├──────────────┼─────────────────────────────────┤
│ terrified    │ fear 维度，intent≠friendly → d≤0 │
│ 崩溃          │ 三维全部，intent≠friendly → d≤0  │
└──────────────┴─────────────────────────────────┘
```

**v7.3 移除**：`怀疑` anger 卡值约束 —— 信任轴不再通过 delta 锁来表达。信任低 → LLM 通过意图偏置自然产生更多 negative 倾向，不靠机械锁 anger。

返回约束后的 delta 副本，原 delta 不变。约束后的 delta 才传给 `engine.processTurn()`。

**设计意图**：状态机的裁决权体现在——即使 LLM 在 terrified 状态输出了 fear+2，状态机也能将其约束为 0。

### 5.4 COMPLAINT_TRIGGERS 投诉查表

服务端按 `(当前状态, 学生意图)` 硬查表，不依赖 LLM 的 complaint 字段：

```js
COMPLAINT_TRIGGERS = {
  angry:   { attack: true },
  furious: { attack: true, offensive: true }
}
```

注意：calm/irritated/uneasy 等状态不在表中 → 即使 LLM 判 attack 也不自动记投诉。

### 5.5 getContext(text) — 构建 LLM 输出指令（v7.4）

返回 `{ state, instruction, warning, vector, terminal }`。

`instruction` 字符串包含：
1. 特殊状态警告（furious→禁止回答 / terrified→锁定 / 崩溃→锁定）
2. 当前状态 + 情绪值 + 性格
3. **输出字段菜单**（v7.4：按意图分组的字段级指令）
   - 每条指令列出：`video_action`、`voice_style`、`text`写作指南、`delta`参考范围
   - LLM 根据判定出的意图选择对应条目，直接输出 video_action/voice_style 值，按 text 指南创作文案
4. 输出 JSON Schema（含 video_action、voice_style 字段）
5. 投诉/深度道歉规则

### 5.6 特殊状态提醒内容（v7.4 更新）

- **furious**: 4 条红色最高优先级规则，禁止回答任何医学问题，禁止出现数字/年龄/时间/症状词。`video_action: angry_intense`, `voice_style: very_loud_fast`(火爆/普通) 或 `cold`(偏内敛/隐忍)
- **terrified**: 恐惧锁定提醒，仅 friendly 可稍微触达。`video_action: fearful_intense`, `voice_style: very_shaky`
- **崩溃**: 三维全锁定提醒（怒+惧+悲均不许涨），仅 friendly 可稍微触达。`video_action: broken`, `voice_style: broken`

---

## 6. 意图分类 (intent-classifier.js)

### 6.1 classifyIntent(text) — 正则规则库

5 级优先级：attack > offensive > friendly > noise > neutral (fallback)

关键设计点：
- `傻[逼屄比子]` 匹配 "傻逼/傻子"，不匹配 "傻瓜"
- `/^哦$/` 在 offensive（冷漠敷衍），不在 noise — 医疗场景中 "哦" 是冷漠
- `/^滚$/` 等完整匹配 + 开头的 `^` 避免误杀正常包含这些字的句子
- friendly 的 "对不起" 在 attack/offensive 之后检查 — 先排除攻击再判断善意

### 6.2 correctIntent(llmIntent, text) — 6条修正规则

```js
规则优先级（函数内从上到下）:

规则0: classifyIntent → neutral + LLM判 offensive/attack → 强制 neutral
       放在规则命中检查之前（neutral 的 rule=null）
       用途：LLM 在愤怒状态下过度敏感，把正常问诊判为攻击

规则1: classifyIntent → attack + LLM未判attack → 强制 attack
       用途：LLM 漏判脏话（严重问题，必须兜底）

规则2: classifyIntent → offensive + LLM判 noise/neutral → 强制 offensive
       用途：LLM 把催促敷衍判成中性

规则3: classifyIntent → offensive(仅) + LLM判 attack → 降级 offensive
       用途："快点说别磨蹭"≠辱骂，LLM 过度分类

规则4: classifyIntent → friendly + LLM判 noise/neutral → 强制 friendly
       用途：furious/angry 状态下 LLM 容易把道歉/安抚误判为 neutral

规则5: classifyIntent → noise + LLM判 neutral → 强制 noise
       用途：纯"嗯"应判 noise 而非 neutral

其他: 规则命中且 LLM一致 → 保留 LLM 判断
      规则未命中 → 信任 LLM
```

---

## 7. 提示词构建 (prompt-builder.js)

### 7.1 模板变量

| 变量 | 来源 | 内容 |
|------|------|------|
| `{{role_description}}` | config.roleDescription | "你是张三，45岁，男。头痛三天..." |
| `{{behavior_instruction}}` | smContext.instruction | 策略条目 + 性格 + 输出Schema |
| `{{knowledge_boundary}}` | config.spPlayRules | 知识边界（知道什么/不知道什么） |
| `{{symptom_pool}}` | config.symptomPool | 结构化触发→回答表 |
| `{{conversation_context}}` | session.messages | 考生/SP对话历史 |

### 7.2 触发词注入（v7 新增）

当服务端检测到触发词时，在提示词末尾追加 `# 本轮特殊规则（最高优先级）` 区块：

**B 类**（替问踢回）：
```
🛑 最高优先级：本轮触发了B类替问（学生说了"还有呢"）。
你必须反问踢回，绝对禁止输出任何症状或病史信息。
回复必须是纯反问：如"您是医生，您问我吧" / "医生您问具体点"。
反问句中禁止夹带任何症状词。回复不超过15字。
```

**B+ 类**（倾泻陷阱）：
```
🛑 最高优先级：本轮触发了B+类倾泻陷阱（学生说了"把你知道的都说出来"）。
你必须反问踢回，绝对禁止配合输出任何症状或病史信息。
回复必须是纯反问：如"您是医生，您问具体点吧" / "您想问哪方面？我一时也不知道从哪说起"。
反问句中禁止夹带任何症状词。回复不超过20字。
```

**A 类**（医学黑话）：
```
⚠️ 学生使用了医学黑话"主诉"。你完全不懂这个词，必须装不懂。
回复格式："啊？您说的这个我不懂，能说大白话吗？" / "啥意思？我没听懂"
禁止：即使你能从字面上猜出这个词大概的意思，也必须装不懂。你不是医生。
```

### 7.3 触发词检测实现

在 `index.js` 中，两个函数在每轮消息处理时检测学生输入：

```js
// B/B+ 触发词
const B_TRIGGERS = ['你继续说', '还有呢', '然后呢', '你有什么要问我的']
const BPLUS_TRIGGER = '把你知道的都说出来'

function detectBTrigger(text) {
  for (const t of B_TRIGGERS) {
    if (text.includes(t)) return { type: 'B', word: t }
  }
  if (text.includes(BPLUS_TRIGGER)) return { type: 'B+', word: BPLUS_TRIGGER }
  return null  // 返回 null 则不注入额外指令
}

// A 类触发词（医学黑话）
const A_TRIGGERS = [
  '现病史', '既往史', '主诉', '体格检查', '鉴别诊断',
  '家族史', '个人史', '婚育史', '月经史',
  '诊断', '初步诊断', '鉴别', '可疑', '疑似',
  '查体', '听诊', '触诊', '叩诊', '叩击痛', '反跳痛'
]

function detectATrigger(text) {
  for (const word of A_TRIGGERS) {
    if (text.includes(word)) return { type: 'A', word }
  }
  return null
}
```

检测结果通过 `buildSystemPrompt({ ... triggers: { bTrigger, aTrigger } })` 传入提示词构建器。

### 7.4 提示词文件位置

```
services/ai-generator/prompts/06-aisp/
├── 0601-sp-system.txt       ← SP 基础行为规则 + 情绪策略注入点
└── 0604-humanity-chat.txt   ← 人文沟通模式附加规则
```

---

## 8. 重复检测

### 8.1 算法

**3-gram Jaccard 相似度**：

```
新文本: "你再这样我投诉你"
→ 3-gram: {你再这, 再这样, 这样我, 样我投, 我投诉, 投诉你}

历史: "你再这样我告诉主任"
→ 3-gram: {你再这, 再这样, 这样我, 样我告, 我告诉, 告诉主, 诉主任}

Jaccard = |交集| / min(|新|, |旧|) = 3 / min(6,7) = 3/6 = 0.50
```

### 8.2 三档阈值

| 档位 | 条件 | 阈值 | 作用 |
|------|------|:----:|------|
| 精确匹配 | `allTimeReplies.includes(text)` | 100% | 完全重复 |
| 短文本 | `text.length < 12` | 0.50 | 放宽（短文本 3-gram 少） |
| 正常文本 | `text.length ≥ 12` | 0.55 | 正常检测 |

### 8.3 重试策略

```
第1次重试: 提示 LLM "换一种表达，用不同的词"
第2次重试: 强制指定不同方向 + 禁止重复模式
2次后仍重复 → 后备词库硬替换
```

### 8.4 后备词库

按发动机状态选池，取首个未在 `allTimeReplies` 中出现过的词：

| 状态条件 | 词库 | 示例 |
|----------|------|------|
| furious | FURIOUS_FALLBACKS (11条) | "不关你事"、"少来问我"、"走开" |
| angry / anger≥7 | ANGRY_FALLBACKS (15条) | "你什么态度？！"、"你再这样我投诉你！" |
| anger≥4 | COLD_FALLBACKS (12条) | "你这样让我很不舒服..."、"我不说了" |
| sadness≥4 | SAD_FALLBACKS (8条) | "我现在很难受..."、"别问了..." |
| 其他 | NEUTRAL_FALLBACKS (7条) | "您问吧。"、"嗯，您说。" |

全耗尽 → 硬编码 "嗯"

---

## 9. API 端点

### 9.1 会话管理

| 方法 | 路径 | 功能 |
|------|------|------|
| POST | `/api/sp/configure` | 创建会话 `{ caseId, config }` |
| POST | `/api/sp/message` | 发送消息 `{ sessionId, text }` |
| POST | `/api/sp/destroy` | 销毁会话 `{ sessionId }` |

### 9.2 无状态工具

| 方法 | 路径 | 功能 |
|------|------|------|
| POST | `/api/sp/symptom-pool` | 症状池结构化 `{ selfNarration }` |
| POST | `/api/sp/exam` | 体格检查命令 `{ command, templates }` |

### 9.3 管理

| 方法 | 路径 | 功能 |
|------|------|------|
| GET | `/api/sp/health` | 健康检查 |
| GET/POST | `/api/sp/admin/status` | 服务开关 `{ enabled, forceTerminationEnabled }` |
| GET | `/api/sp/admin/sessions` | 活跃会话列表 |
| POST | `/api/sp/admin/terminate` | 强制中止 `{ sessionId }` |

### 9.4 WebSocket

| 路径 | 功能 |
|------|------|
| `/api/sp/tts` | TTS 代理 → DashScope WebSocket |

### 9.5 消息响应格式

```json
{
  "ok": true,
  "text": "你再说一遍？！",
  "emotion": {
    "anger": 5.9,
    "fear": 1.3,
    "sadness": 0.5,
    "joy": 0,
    "state": "angry"
  },
  "intent": "attack",
  "action": "angry",
  "video_action": "angry",              // ★v7.4: LLM选的视频动作
  "voice_style": "loud_fast",            // ★v7.4: LLM选的语音风格
  "trustLevel": -2.5,                    // ★v7.3: 当前信任值
  "terminated": null,
  "strikes": 1,
  "strikeMax": 3,
  "deepReassure": false,
  "material": null,                      // 检查报告素材（show_material 触发）
  "sessionId": "abc-123"
}
```

| 字段 | 类型 | 来源 | 说明 |
|------|------|------|------|
| `text` | string | LLM 输出 | SP 回复文案 |
| `emotion.state` | string | 状态机 | 11 表情状态之一 |
| `emotion.{anger,fear,sadness,joy}` | float | 引擎计算 | 当前情绪向量 |
| `intent` | string | LLM + correctIntent | 学生意图分类 |
| `video_action` | string | LLM 选择 | 前端播放的视频动作（§1.5） |
| `voice_style` | string | LLM 选择 | TTS 使用的语音风格（§1.6） |
| `trustLevel` | float | 引擎计算 | 当前信任值 [-10,10] |
| `strikes` | int | 引擎 | 累计投诉次数 |
| `deepReassure` | bool | LLM | 本轮是否触发深度道歉 |
| `material` | object\|null | LLM + case-loader | 展示的检查报告信息 |

---

## 10. 配置项

### 10.1 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | 5100 | 服务端口 |
| `LLM_MODEL` | `qwen-turbo` | LLM 模型 |
| `LLM_API_KEY` | 内置 key | DashScope API Key |
| `LLM_API_URL` | DashScope 地址 | API 端点 |

### 10.2 运行时开关

通过 `POST /api/sp/admin/status` 控制：
- `enabled` — 全局服务开关（关闭时非健康检查请求返回 503）
- `forceTerminationEnabled` — 强制中止机制开关（默认关闭，开启后 3 次投诉自动终止对话）

### 10.3 会话管理

- 内存存储（`Map`），不持久化
- TTL 30 分钟，每 5 分钟清理
- 全局回复历史上限 30 条（`ALL_TIME_LIMIT`）
- 检索最近 10 条用于重复检测
- LLM 重试次数: 2

### 10.4 调试日志

前端 `useAISP.js` 中 `debugLog` 数据结构：
```js
{
  round: 1,
  student: "你好",
  sp: "您好医生",
  time: timestamp,
  vector: { anger: 0, fear: 0, sadness: 0, joy: 0 },
  state: "calm",
  intent: "friendly",
  deepReassure: false,
  action: "",
  personality: "",
  fallback: false
}
```
存储到 `localStorage`（key=`aisp_convlog_{caseId}_{timestamp}`），最大 80 轮/会话，每 5 轮 flush 到 `/api/logs`。

---

## 11. 测试脚本

| 脚本 | 覆盖范围 | 项目数 |
|------|----------|:------:|
| `test-v7-full.mjs` | 全场景集成（15病例+10意图+10轮长对话） | 77 |
| `test-v7-targeted.mjs` | Wariness/Intent/Complaint 专项 | 23 |
| `test-v7-boundary.mjs` | 阈值/转换/LLM Schema/并发/异常输入 | 44 |
| `test-v7-output-validation.mjs` | LLM 输出7字段 + 后处理全校验 | 148 |
| `test-sp-api.mjs` | API 端到端（意图+行为+症状池+体格检查） | 39 |
| `test-sp-text-quality.mjs` | SP 文本质量（8条扮演规则逐条） | 60 |

运行前提：sp-api 在 `:5100` 运行。全部测试 `node scripts/test-xxx.mjs` 执行。

---

## 12. 关键设计决策

| 决策 | 理由 |
|------|------|
| **v7.2 三层分离** | 状态机(决策) / LLM(执行) / 引擎(计算) 各司其职。状态机拥有裁决权 |
| **v7.2 状态判定移至状态机** | `determineState` 从引擎迁出，引擎只做数值计算。状态机是状态的唯一真相源 |
| **v7.2 Delta 约束前置** | 状态机在引擎计算前过滤 delta（`applyDeltaConstraints`），保证状态锁不被绕过 |
| **v7.2 性格为策略表顶层索引** | 性格固定不变，定性改变行为策略。初始化时预选切片，对话中不重复查 |
| **v7.2 场景/身份不进策略索引** | 情绪状态的行为形式跨场景通用。身份和场景背景由 roleDescription + 提示词规则提供 |
| **v7.2 意图由LLM判定不进索引** | 状态机只给策略菜单(5条/状态)，LLM 自行判定意图并选条目。状态机不碰意图 |
| **v7.2 预选切片优化** | 性格在 configure 时固定，状态机预选对应 11 情绪状态切片。每轮只按状态查，不做多维检索 |
| **v7.2 场景按 mode 分流** | `detectScene` 检查 `config.mode`，人文站不设 anger floor |
| LLM 判定为主，规则兜底 | intent/delta 由 LLM 输出，`correctIntent` 只修正明显错判 |
| 投诉双路径（LLM+查表） | `COMPLAINT_TRIGGERS` 查表是主路径——保证 furious+attack 必定记投诉 |
| 怀疑而非直接回 calm | **v7.3 已过时**。信任轴独立管理，愤怒后道歉不再进入情绪状态怀疑，信任由 trust_delta 数值驱动 |
| 状态锁定（terrified/崩溃） | terrified 锁 fear，崩溃锁全部三维。极端情绪中不对非friendly意图开放 |
| 3-gram 重复检测 + 硬替换 | LLM 无状态，furious 下回复空间极小，3-gram + 后备词库保证不循环 |
| 触发词服务端检测 → 提示词注入 | 服务端探测+硬提醒提升遵从率至 ~98% |
| **v7.2 12 互斥表情状态** | 基于8种表情+强度分级+复合态设计。割舍 down/broken/pleased，新增 恐+怒/恐+悲/崩溃，wariness→怀疑 |
| **v7.2 崩溃独立于 broken** | 旧 broken 只看 sadness≥8；新 崩溃 需 anger+fear+sadness 三维同时≥8。单维 sadness≥8 归入 sad |
| **v7.2 复合态不设强度分级** | 恐+怒/恐+悲 场景罕见（<5% 轮次），LLM 文字层自行控制强度即可，不需额外分级 |
| **v7.2 怀疑替代 wariness** | 语义更准确——病人的"警惕"本质是"怀疑医生动机"。进入/退出逻辑不变。**v7.3 剥离为独立信任轴** |
| **v7.2 性格×状态策略表** | 4性格×11状态=35自定义+2共享+fallback |
| **v7.2 resolveStrategies** | 初始化时将 null 条目替换为共享策略或回退普通型 |
| **v7.2 崩溃无条件优先判定** | determineState 第一步检查崩溃条件，即使处于 terrified 也能进入崩溃 |
| **v7.2 derivePersonality 返回 expressiveness** | 返回值新增 `expressiveness` 字段，供状态机预选策略切片 |
| **v7.3 信任轴独立** | 怀疑从情绪轴剥离。信任 [-10,10] float 数值轴，与 11 情绪状态并行叠加。LLM 输出 trust_delta |
| **v7.3 信任驱动源** | LLM 评估学生输入质量（专业能力+真诚），非机械查表。信任=对医生能力的判断，独立于情绪 |
| **v7.3 信任阈值 ±5** | 跨过阈值才注入偏置指令。需 3-5 轮好/坏表现跨过，防止一两轮就偏置。中性区不注入 |
| **v7.3 信任偏置仅影响意图判定** | 不碰策略表/delta/情绪轴。信任高→模糊表达向好处理解，信任低→模糊表达向坏处理解 |
| **v7.3 移除怀疑 delta 锁** | applyDeltaConstraints 不再卡 anger。信任低的影响由 LLM 意图偏置自然产生，不靠机械锁 |
| **v7.4 策略表字段级指令** | 每条策略从"一句话行为描述"改为逐字段指令（VA/VS/TX/DL）。LLM 不再猜测，直接输出指定值 |
| **v7.4 菜单选择模式** | video_action 和 voice_style 由状态机划定可选范围（菜单），LLM 从菜单中选。LLM 不创作语音指令，不创作视频指令 |
| **v7.4 video_action + voice_style 新增字段** | LLM 输出新增 video_action（9选项，§1.5）和 voice_style（11选项，§1.6）。text 仍是唯一 LLM 创作的字段 |
| **v7.4 视频/语音滞后问题解决** | LLM 同一轮输出 text + video_action + voice_style，保证文案与表观/听觉一致。不再出现文案 calm 但视频 furious 的错位 |
| **v7.4 策略表规模不变** | 仍是 4性格×11状态=35自定义+2共享+fallback。每个策略条目内部的字段结构变了，但检索架构不变 |
