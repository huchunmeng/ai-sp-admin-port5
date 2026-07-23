# AI-SP 情绪系统 v8 技术文档

> 版本: v8.0  
> 更新日期: 2026-06-15  
> 模型: qwen-plus (主) / qwen-turbo (备)

---

## 1. 架构总览

```
学生输入 → API层(sp-api) → 意图分类(LLM+规则兜底) → 状态机(判定状态+构建上下文)
                              ↓                            ↓
                         intent-classifier.js        emotion-state-machine.js
                              ↓                            ↓
                         情绪引擎(数值计算+约束) ←── LLM输出(emotion绝对值)
                              ↓
                         emotion-engine.js
                              ↓
                         输出 → SP回复(text/video/voice)
```

**三层分离**：

| 层 | 文件 | 职责 |
|----|------|------|
| 计算层 | `emotion-engine.js` | 数值加减、峰值锁定、噪声怒气累积、下行刹车 |
| 状态层 | `emotion-state-machine.js` | 状态判定、策略表、LLM上下文构建、极端状态指令 |
| 规则层 | `intent-classifier.js` | 服务端正则兜底、LLM意图修正 |

---

## 2. 情绪引擎 (emotion-engine.js)

### 2.1 核心结构

```js
createEmotionEngine(config) → engine
```

**输入 config**:
- `baseline`: 初始情绪向量 `{ anger, fear, sadness, joy }` (0-10)
- `personality`: 性格参数 (见 §6)
- `scene`: 场景乘数 `{ multiplier: { anger, fear, sadness, joy } }`

**内部向量**:
```js
vector = { anger: 0-10, fear: 0-10, sadness: 0-10, joy: 0-10 }
```

### 2.2 核心方法

| 方法 | 签名 | 职责 |
|------|------|------|
| `processTurn(delta)` | `delta → vector` | 增量模式：delta × 敏感度乘数/恢复力乘数，叠加到 vector |
| `setAbsolute(values, opts)` | `(values, {deepReassure, intent}) → {vector, deepReassure}` | 绝对值模式：LLM输出目标值，引擎施加约束 |
| `getVector()` | `→ vector` | 返回当前情绪向量副本 |
| `getLastVector()` | `→ vector|null` | 返回上轮情绪向量 |
| `getVideoCommand(state)` | `→ {group, playbackRate, shakeIntensity}` | 根据状态返回视频参数 |
| `reset(newBaseline)` | `→ void` | 重置引擎到初始状态 |

### 2.3 setAbsolute 内部逻辑 (v8)

LLM 输出绝对值，引擎负责约束。处理顺序：

```
1. 峰值锁定中? → 冻结所有维度，attack延长锁定时长，非attack倒数
   └─ 锁到期 → anger强制降至 peakThreshold-0.5 (防立即重触发)

2. 无锁 → 正常处理:
   ├─ 上升: 直接采纳LLM目标值
   ├─ 下降: 受刹车限制(maxAllowedDrop)
   │   ├─ attack意图: maxDrop=0 (不允许下降)
   │   ├─ deepReassure=true: maxDrop=2
   │   └─ 默认: maxDrop=1
   └─ attack意图: anger至少上升2

3. 处理后anger触顶(≥peakThreshold)?
   ├─ YES → 启动峰值锁定(3轮)
   │   ├─ 非anger维度回退到上轮值
   │   └─ deepReassure强制false
   └─ NO → 继续

4. 连续无关话题怒气累积 (见 §2.5)
```

### 2.4 峰值锁定 (Peak Lock)

| 参数 | 值 | 说明 |
|------|-----|------|
| `peakThreshold` | `min(10, 9 + exprOffset)` | 触发阈值 |
| `peakLockRemaining` | 3 → 0 | 锁定剩余轮次 (含触发轮) |
| 锁定期间行为 | 所有维度冻结 | attack延长锁定至3轮 |
| 到期降温 | `anger = peakThreshold - 0.5` | 防止LLM高值立即重触发 |
| `peakType` | `'angry'` 或 `'broken'` | broken: 三维同时≥8 |

**关键约束**：锁定期间不重新触发锁定（无锁中锁）。

### 2.5 连续无关话题怒气累积 (Noise Anger)

| 参数 | 值 | 说明 |
|------|-----|------|
| 宽限期 | 2轮 | `consecutiveNoiseCount ≤ 2` 不触发 |
| 触发后每轮 | `anger += 0.5` | `Math.max(vector.anger, lastVector.anger + 0.5)` |
| 非noise意图 | 计数器归零 | `consecutiveNoiseCount = 0` |

**计算公式**: `vector.anger = clamp(max(vector.anger, lastVector.anger + 0.5), 0, 10)`

### 2.6 投诉机制

```js
addStrike()    // 投诉计数+1
resetStrikes() // 投诉计数归零
getStrikeCount() // → 0-3
// strikeCount ≥ 3 → 对话终止
```

### 2.7 Video Command

根据状态输出视频控制参数：

```
state → { group, playbackRate(0.5-1.5), shakeIntensity(0-1), swayAmplitude }
```

---

## 3. 状态机 (emotion-state-machine.js)

### 3.1 状态列表 (computeRawState 判定阈值)

| 状态 | 条件 | 标签 | 优先级 |
|------|------|------|--------|
| calm | 默认 | 平静配合 | — |
| irritated | anger ∈ [2, 5) + offset | 带刺不耐烦 | 怒(低) |
| angry | anger ∈ [5, 9) + offset | 愤怒质问 | 怒(高) |
| furious | anger ≥ 9 + offset | 暴怒攻击 | 怒(极端) |
| uneasy | fear ∈ [2, 5) + offset | 不安 | 恐(低) |
| fearful | fear ∈ [5, 9) + offset | 恐惧 | 恐(高) |
| terrified | fear ≥ 9 + offset | 极度恐惧 | 恐(极端) |
| sad | sadness ≥ 5 + offset | 悲伤 | 悲 |
| 崩溃 | anger≥8+offset 且 fear≥8+offset 且 sadness≥8+offset | 彻底崩溃 | 最高 |

> **注意**: `BASE_THRESHOLDS = [2,5,8]` 仅用于 `getStateForDim()`（旧版辅助函数）。实际状态判定走 `computeRawState()`，愤怒/恐惧极端档阈值不同（9 vs 8）。峰值锁定触发阈值 `peakThreshold = min(10, 9 + exprOffset)` 与 computeRawState 保持一致。

### 3.2 状态判定 (determineState)

```
1. 三维同时≥8+offset → 崩溃
2. 上一状态=terrified?
   ├─ fear<8+offset → 正常判定
   └─ 否则保持terrified
3. 上一状态=崩溃?
   ├─ 三维均<8+offset → 正常判定
   └─ 否则保持崩溃
4. 默认 → computeRawState(vector, exprOffset)
```

**computeRawState 判定顺序** (命中即停):
```
1. 崩溃: a≥8+o AND f≥8+o AND s≥8+o
2. 怒极端: a≥9+o → furious
3. 恐极端: f≥9+o → terrified
4. 怒高: a≥5+o → angry
5. 悲: s≥5+o → sad
6. 恐高: f≥5+o → fearful
7. 怒低: a≥2+o → irritated
8. 恐低: f≥2+o → uneasy
9. 默认 → calm
```

### 3.3 极端状态

| 状态 | 模式 | video_action | voice_style | 核心指令 |
|------|------|-------------|-------------|----------|
| furious | 吵架模式 | angry_intense | very_loud_fast | 不管对方说什么都怼，不输出任何信息 |
| terrified | 恐惧封闭 | fearful_intense | very_shaky | 说不出完整句子，不回答医学问题 |
| 崩溃 | 彻底封闭 | broken | broken | 完全封闭，哭泣/沉默 |

**极端状态铁律**：
- 不输出策略表，直接给绝对指令
- LLM 自主决定 emotion 值（指令中不指定情绪数值）
- 状态转换时注入降级提示："⚠️ 状态转换：你的情绪已从上轮'X'降级为当前'Y'..."

### 3.4 策略表 (非极端状态)

4 种性格 × 9 个非极端状态，每个状态 × 5 种意图 (neutral/attack/offensive/friendly/noise) 的策略矩阵。

每条策略包含：
- `va` (video_action)
- `vs` (voice_style)  
- `tx` (text写作指导)
- `dl` (delta约束范围)

**delta 常量**:
```js
DL_ZERO = { a:[0,0], f:[0,0], s:[0,0], j:[0,0] }  // 不允许变化
DL_LOCKED = { locked: true }                         // 完全锁定
DL_MAINTAIN_ANGER = { maintain: 'anger' }            // anger维持高位
dl(a, f, s, j) → { a: [min,max], ... }              // 工厂函数，undefined=不约束
```

**noise 策略 v8 规则**：区分两种子场景
- 对方发无意义声音 → 简短/不理
- 对方聊无关话题 → 回怼/引回看病，禁止单字敷衍

### 3.5 投诉机制

```js
COMPLAINT_TRIGGERS = {
  angry:   { attack: true },
  furious: { attack: true, offensive: true }
}
```
- `strikeCount ≥ 3` → `isTerminal() = true` → 对话终止
- `deep_reassure = true` 时重置投诉计数

### 3.6 上下文构建 (getContext)

```js
getContext(studentText) → {
  state,           // 当前状态
  mode: 'full',
  instruction,     // 完整LLM上下文文本
  warning,         // { strikes, max: 3 } | null
  vector,          // 当前情绪向量
  terminal         // 是否终止
}
```

构建顺序：
1. 状态转换提示（如有）
2. 当前状态 + 情绪向量
3. 极端状态 → 绝对指令 / 正常状态 → 策略表
4. 铁律 + 深度道歉规则
5. 性格参数
6. OUTPUT_SCHEMA

### 3.6 关键函数导出

```js
createStateMachine(engine, options) → {
  getState, determineState, applyDeltaConstraints,
  processTurn, getContext, processResult,
  reset, clearTerminalState, getStrategiesForState,
  getPersonalityStrategies
}
```

---

## 4. 意图系统

### 4.1 两层架构

```
第1层: LLM分类 (base prompt决策树)
        ↓
第2层: 服务端修正 (intent-classifier.js / correctIntent)
```

### 4.2 LLM 决策树 (base prompt)

**优先级**: LLM: `attack > offensive > friendly > noise > neutral` | 分类器: `attack > noise > offensive > friendly > neutral`

> ⚠️ 两套优先级不一致是有意设计：base prompt 按严重程度排（offensive > noise 符合直觉），分类器把 noise 提到 offensive 前是为了拦截"哦"等单字被误判为 offensive（冷漠敷衍规则和单字规则存在重叠）。分类器通过 `correctIntent` 修正 LLM 的误判。

| 级别 | 意图 | 核心规则 |
|------|------|----------|
| 1 | attack | 脏话/驱赶/人身攻击/威胁/对抗挑衅 |
| 2 | offensive | 催促命令/轻视否定/挑衅对抗(无脏话)/冷漠敷衍 |
| 3 | friendly | 打招呼/道歉认错/安抚共情 |
| 4 | noise | 单字无意义/纯标点/无意义笑叹/孤零零"对不起"/医学无关话题 |
| 5 | neutral | 医学提问/中性追问/中性陈述/患者身份确认 |

**关键原则**：
- 意图分类独立于情绪状态（同一个输入，calm时判什么，furious时也判什么）
- 医学无关话题（政治/天气/娱乐/体育/金融）→ noise，不是 neutral
- "对不起"孤零零三个字 → noise（敷衍）；"对不起"后有道歉内容 → friendly

### 4.3 服务端规则库 (intent-classifier.js)

**正确性修正策略**：

| 场景 | LLM判 | 规则命中 | 修正为 |
|------|-------|----------|--------|
| 脏话漏判 | neutral/noise | attack | attack |
| 冒犯漏判 | neutral/noise | offensive | offensive |
| 冒犯误判 | attack | offensive(未命中attack) | offensive |
| LLM过度判attack | attack/offensive | neutral(未命中规则) | neutral |
| 敷衍漏判 | neutral/offensive | noise | noise |
| 道歉漏判 | 任意非friendly | friendly | friendly |

**非医学话题关键词** (noise规则):
```
政治: 特朗普/拜登/习近平/普京/俄乌/战争/选举/总统/台独/...
天气: 天气/下雨/下雪/台风/...
娱乐: 明星/八卦/足球/NBA/王者荣耀/原神/...
金融: 股票/基金/房价/比特币/...
```

### 4.4 API层调用链路

```
1. LLM输出 → validateLLMOutput() → 基础校验
2. correctIntent(llmIntent, text) → 规则修正
3. engine.setAbsolute(emotion, { intent, deepReassure }) → 情绪约束
4. stateMachine.determineState(intent) → 状态判定
5. stateMachine.getContext(text) → 构建下轮上下文
```

---

## 5. SP 行为规则 (base prompt)

### 5.1 8条核心规则

| # | 规则 | 要点 |
|---|------|------|
| 1 | 问什么答什么 | 不主动不提示不引导，一次多问只答第一个 |
| 1a | 同一问题反复追问 | 逐轮升级：第1次正常→第2次提醒→第3次不耐烦 |
| 2 | 笼统提问只给1句 | 替问踢回：B类/B+类触发词→反问 |
| 3 | 听不懂医学黑话 | A类触发词检测：现病史/主诉/鉴别诊断等→装不懂 |
| 4 | 首次对话开场白 | 打招呼只回招呼，直接问诊回1句主诉 |
| 5 | 口语化 | 禁止"X伴Y"格式，说大白话 |
| 6 | 你是人不是AI | 否认AI身份，绕回病情 |
| 7 | 不透露诊断 | 不说疾病名称，不评价学生 |
| 8 | 当前状态行为策略 | 由状态机动态注入 |

### 5.2 输出格式 (JSON)

```json
{
  "text": "纯口语文本",
  "intent": "attack|offensive|friendly|noise|neutral",
  "emotion": { "anger": 0-10, "fear": 0-10, "sadness": 0-10, "joy": 0-10 },
  "deep_reassure": true|false,
  "show_material": "report_id"|null,
  "video_action": "calm|angry_mild|angry|...",
  "voice_style": "normal|slightly_tense|loud_fast|..."
}
```

---

## 6. 性格系统

### 6.1 三维参数

| 维度 | 类型 | 选项及数值 |
|------|------|-----------|
| expressiveness | offset | 火爆型(-1.0) / 普通型(0) / 偏内敛(0.3) / 隐忍型(1.5) |
| sensitivity | mul | 高敏感(1.1) / 普通敏感度(1.0) / 钝感(0.7) |
| resilience | mul | 高豁达(1.3) / 普通恢复力(1.0) / 低豁达(0.7) |

### 6.2 来源优先级

1. 病例JSON中显式定义的 `personality` 字段（推荐）
2. 从 `emotionText + roleDescription` 关键词推导（回退）

### 6.3 对引擎的影响

- `exprOffset`: 影响所有阈值判定（阈值 = BASE_THRESHOLD + exprOffset）
- `sensitivityMul`: 放大情绪上升幅度
- `resilienceMul`: 放大情绪下降幅度（恢复越快，下降乘数越大）

---

## 7. 调试

### 7.1 Debug Report 字段说明

```
会话: {caseId} | 共 {n} 轮 | 模型: {model} | 投诉: {strikes}/3
情绪终值: 怒:{start}→{end}(↑/↓)  惧:...  悲:...  悦:...
意图分布: attack×n  offensive×n  friendly×n  noise×n  neutral×n
```

每轮详情：
```
#N | 时间 | intent:{intent} | state:{state} | vs:{voiceStyle} | va:{videoAction}
  怒:x.x  惧:x.x  悲:x.x  悦:x.x
  👤 学生输入
  🤖 SP回复
```

### 7.2 调试脚本

- `scripts/_test-noise.mjs` — 连续无关话题怒气累积测试
- `scripts/_test-brake.mjs` — 峰值锁定+降温测试

### 7.3 API调试数据

响应中包含 `_debug` 字段：
```json
{
  "_debug": {
    "pre": { "vector": {...}, "state": "..." },
    "post": {
      "vector": {...},
      "state": "...",
      "peakLock": { "remaining": 2, "type": "angry" },
      "noiseCount": 3
    }
  }
}
```

---

## 8. 关键阈值速查

| 参数 | 值 | 位置 |
|------|-----|------|
| anger状态阈值 (computeRawState) | [2, 5, 9] + exprOffset | emotion-state-machine.js |
| fear状态阈值 (computeRawState) | [2, 5, 9] + exprOffset | 同上 |
| sadness状态阈值 (computeRawState) | [5] + exprOffset | 同上 |
| 崩溃阈值 | 三维同时 ≥ 8 + exprOffset | 同上 |
| anger旧阈值 (getStateForDim) | [2, 5, 8] + exprOffset | emotion-engine.js `BASE_THRESHOLDS` |
| 峰值锁定阈值 | min(10, 9 + exprOffset) | engine `peakThreshold` |
| 锁定轮数 | 3 | engine `peakLockRemaining` |
| 锁到期降温 | peakThreshold - 0.5 | engine `setAbsolute` |
| 下行刹车(默认) | maxDrop = 1 | engine `setAbsolute` |
| 下行刹车(deepReassure) | maxDrop = 2 | 同上 |
| 下行刹车(attack) | maxDrop = 0 | 同上 |
| attack上升保底 | anger + 2 | 同上 |
| 噪声怒气宽限期 | 2轮 | engine `consecutiveNoiseCount > 2` |
| 噪声怒气增量 | 0.5/轮 | engine |
| 投诉触发 | angry:attack, furious:attack+offensive | state-machine `COMPLAINT_TRIGGERS` |
| 投诉上限 | 3次→终止 | engine `strikeCount` |
| 情绪值域 | [0, 10] | clamp |

---

## 9. 文件清单

| 文件 | 行数 | 职责 |
|------|------|------|
| `packages/shared/src/emotion-engine.js` | ~406 | 纯计算引擎 |
| `packages/shared/src/emotion-state-machine.js` | ~640 | 状态机+策略表+上下文 |
| `packages/shared/src/intent-classifier.js` | ~217 | 意图规则库+修正 |
| `services/ai-generator/prompts/06-aisp/0601-sp-system.txt` | ~170 | SP角色手册(base prompt) |
| `services/sp-api/src/index.js` | ~300 | API层，串联各模块 |
| `scripts/_test-noise.mjs` | ~56 | 噪声怒气测试 |
| `scripts/_test-brake.mjs` | ~80 | 峰值锁定测试 |
