# AI-SP 情绪系统完整设计文档 (v5 旧版)

> ⚠️ **此文档描述 v5 系统，已于 2026-06-13 迁移至 v7。** 详见 `aisp-emotion-system-v7-design.md`
> 当前代码实现为 v7（4 数值 + 12 状态 + 5 意图），本文档中的 9 维向量 / 21 状态 / preUpdate+applyLLMScore 流程已不再使用。
>
> 文档版本：基于代码实际状态 | 日期：2026-06-12 | 覆盖：情绪引擎 v4.0 + 状态机 v5.0 + sp-api 后端

---

## 一、架构总览

```
┌──────────────────────────────────────────────────────────────┐
│                   状态机 (State Machine) v5.0                  │
│                 调度中心 · 唯一决策者                           │
│   持有行为状态 · 管理迁移 · 下发指令 · 终止决策                 │
├──────────────────────────────────────────────────────────────┤
│   情绪引擎 (Emotion Engine) v4.0    │   LLM (qwen-turbo)      │
│   物理层 · 纯数值计算               │   表达层                 │
│   惯性·衰减·冷却·保底·封顶          │   意图·文本·动作·语气    │
│   只在状态机授权的模式下工作         │                         │
└──────────────────────────────────────────────────────────────┘
```

### 调用链（每轮）

```
学生输入到达 sp-api
  → ① 状态机.getContext(studentText) → 返回 { state, mode, instruction, warning }
  → ② 引擎.preUpdate() → 纯时间驱动的衰减/冷却
  → ③ buildSystemPrompt(engine, smContext) → 构建 LLM 系统提示词
  → ④ LLM 调用 → 返回 { text, emotion_score, intent, deep_reassure, action }
  → ⑤ validateLLMOutput(parsed) → 自洽性校验
  → ⑥ 近重复检测 → 最多2次重试 → 仍重复则硬替换为后备词
  → ⑦ 引擎.applyLLMScore(emotion, intent, deepReassure, ...) (仅 full/post_peak 模式)
  → ⑧ 状态机.processResult(intent, studentText, deepReassure) → 状态迁移 + 终止检查
  → ⑨ 返回 { text, emotion, intent, terminated } 给前端
```

---

## 二、状态机 (State Machine) v5.0

**文件**: `packages/shared/src/emotion-state-machine.js` (611行)

### 2.1 状态枚举 (21个状态)

#### 可沟通状态 (10个) — 引擎全权管理数值

| 状态 | 触发条件 | 行为特征 |
|------|---------|---------|
| `normal` | 无显著负面情绪 | 正常对话，配合回答问题 |
| `uneasy` | fearful ≥ 2 或 anxious ≥ 2.5 | 语气带犹豫，但能正常表达 |
| `irritated` | angry ≥ 1.5 | 藏了一丝不痛快，回答变短 |
| `annoyed` | angry ≥ 3.5 | 不耐烦，可能反问 |
| `angry` | angry ≥ 6.0 | 高声质问，语句尖锐 |
| `anxious` | anxious ≥ 5.0 | 语句急促，反复确认 |
| `very_anxious` | anxious ≥ 7.5 | 坐立不安，难以聚焦 |
| `fearful` | fearful ≥ 4.0 | 声音发抖，反复问"严不严重" |
| `very_fearful` | fearful ≥ 6.5 | 语无伦次，强烈恐惧 |
| `sad` | sad ≥ 4.5 | 声音低沉，说到一半停住 |
| `down` | sad ≥ 2.0 | 话少，语气平淡 |

#### 峰值状态 (4个) — 引擎锁定，状态机管理行为

| 状态 | 触发 | 持续 | 输入敏感性 |
|------|------|------|-----------|
| `furious_peak` | angry ≥ 9.0 + (攻击意图 或 已连攻≥1) | 3轮 | **区分**攻击/道歉/其他 |
| `hysterical_peak` | fearful ≥ 9.5 且 anxious < 8 | 2轮 | **不区分**，全部无视 |
| `broken_peak` | sad ≥ 9.5 | 3轮 | **不区分**，全部无视 |
| `shut_down` | fearful ≥ 9.0 且 anxious ≥ 8 | 2轮 | **不区分**，全部无视 |

#### 峰值后状态 (3个) — 引擎采纳LLM分值但有额外约束

| 状态 | 来自 | 退出条件 | 行为特征 |
|------|------|---------|---------|
| `post_furious_wait` | furious_peak 冷却结束 | **连续2轮友善** → 恢复正常 | 冷漠、短句、不配合、不主动提供信息 |
| `post_hysterical_wait` | hysterical_peak 冷却结束 | **连续2轮deep_reassure安抚** → 正常 | 反复追问、无法聚焦、"真的不会死吗" |
| `post_broken_wait` | broken_peak 冷却结束 | **连续2轮deep_reassure共情** → 正常 | 沉默、偶尔抽泣 |

#### 终止状态 (4个)

| 状态 | 进入路径 | 触发条件 |
|------|---------|---------|
| `complaint` | angry 路线 | strikeCount ≥ 阈值 (正常3次/峰值2次，patienceExhausted每次-1) |
| `fear_collapse` | fearful 路线 | fearful ≥ 9.5 持续3轮且无有效安抚 |
| `sad_collapse` | sad 路线 | sad ≥ 9.5 持续3轮且无有效共情 |
| `trust_broken` | trust 路线 | trust ≤ 1.5 |

### 2.2 引擎模式 (Engine Mode)

状态机通过 `ENGINE_MODE` 映射控制引擎的工作模式：

| 模式 | 适用状态 | 行为 |
|------|---------|------|
| `full` | 所有可沟通状态 | 引擎正常工作，采纳LLM分值，执行全部物理规则 |
| `locked` | 4个峰值状态 | 引擎仅做冷却倒计时 (preUpdate)，**不采纳LLM分值**。向量被锁定保护 |
| `post_peak` | 3个峰值后状态 | 引擎采纳LLM分值但受额外约束（postPeakGoodTurns计数等） |

### 2.3 状态机内部变量

```javascript
currentState          // 当前行为状态 (STATE枚举值)
peakEnteredAt         // 峰值进入时的 turnCount
peakCooldownRemaining // 峰值剩余冷却轮次
strikeCount           // 投诉三振计数
patienceExhausted     // "攻击→道歉"循环次数，每次道歉后+1，降低后续容忍度
peakDim               // 当前峰值维度: 'angry' | 'fearful' | 'sad'
terminatedState       // 终止状态标记 (非null即已终止)
postPeakGoodTurns     // 峰值后连续友善轮次 (需≥2才恢复正常)
```

### 2.4 processResult 完整流程

```
processResult(llmIntent, studentText, deepReassure)
│
├─ 1. 若已终止 → 直接返回终止状态
│
├─ 2. 检测学生输入中的道歉关键词
│     APOLOGY = ['对不起','抱歉','我错了','我的错','不好意思','态度不好','是我不对','我不该']
│
├─ 3. 根据 ENGINE_MODE 处理
│     full:      不做额外处理 (applyLLMScore已在外部调用)
│     locked:    peakCooldownRemaining--
│     post_peak: applyLLMScore已在外部调用
│
├─ 4. ★ 峰值进入预检查 (优先于投诉，防止投诉阻断峰值体验)
│     if (mode === 'full') {
│       peak = shouldEnterPeak(state, v, llmIntent)
│       if (peak) {
│         → 设置峰值状态、冷却轮次、preEnteredPeak = true
│         → strikeCount = 0 (峰值本身已是惩罚，旧账不追)
│       }
│     }
│
├─ 5. 投诉检查 (所有状态)
│     checkComplaint(llmIntent, isPeak)
│     阈值 = isPeak ? max(1, 2-patienceExhausted) : max(1, 3-patienceExhausted)
│     → 达标则返回 COMPLAINT 终止
│
├─ 6. 崩溃检查 (仅当 !preEnteredPeak — 防止峰值进入瞬间trust≤1.5立即触发TRUST_BROKEN)
│     checkCollapse(state, v) → trust ≤ 1.5 → TRUST_BROKEN
│     引擎终止检查 → angry_collapse/fear_collapse/sad_collapse/trust_broken
│
├─ 7. 状态迁移
│     ├─ FURIOUS_PEAK:    冷却完毕 → POST_FURIOUS
│     ├─ HYSTERICAL_PEAK: 冷却完毕 → POST_HYSTERICAL
│     ├─ BROKEN_PEAK:     冷却完毕 → POST_BROKEN
│     ├─ SHUT_DOWN:       冷却完毕 → deriveCommunicableState(v)
│     ├─ POST_FURIOUS:
│     │   ├─ 道歉/reassuring → postPeakGoodTurns++
│     │   │   └─ ≥2 → 恢复正常 (deriveCommunicableState)
│     │   ├─ aggressive/dismissive → 重返 FURIOUS_PEAK
│     │   └─ neutral/cold → 重置postPeakGoodTurns, 保持警惕
│     ├─ POST_HYSTERICAL:
│     │   ├─ reassuring+deepReassure → postPeakGoodTurns++
│     │   │   └─ ≥2 → 恢复正常
│     │   ├─ aggressive/dismissive/cold → FEAR_COLLAPSE
│     │   └─ 其他 → 重置计数
│     ├─ POST_BROKEN:
│     │   ├─ reassuring+deepReassure → postPeakGoodTurns++
│     │   │   └─ ≥2 → 恢复正常
│     │   ├─ aggressive/dismissive/cold → SAD_COLLAPSE
│     │   └─ 其他 → 重置计数
│     └─ 可沟通状态:
│         ├─ 若preEnteredPeak → 保持峰值状态
│         └─ 否则 → shouldEnterPeak 或 deriveCommunicableState
│
└─ 8. 若 nextState 是终止状态 → 设置 terminatedState，返回终止
```

### 2.5 shouldEnterPeak — 峰值进入条件

```javascript
// 前置条件：当前不在峰值或峰值后状态
// 愤怒峰值：angry >= 9.0 且 (攻击意图 或 已连攻≥1轮)
if (v.angry >= 9.0) {
  if (['aggressive','dismissive','pressuring'].includes(intent) || consec.negative >= 1)
    → FURIOUS_PEAK
}

// 恐惧峰值：fearful >= 9.5 且 anxious < 8
if (v.fearful >= 9.5 && v.anxious < 8)
  → HYSTERICAL_PEAK

// 恐惧+焦虑双高：fearful >= 9.0 且 anxious >= 8
if (v.fearful >= 9.0 && v.anxious >= 8)
  → SHUT_DOWN

// 悲伤峰值：sad >= 9.5
if (v.sad >= 9.5)
  → BROKEN_PEAK
```

### 2.6 POST_FURIOUS 恢复机制 (关键设计)

**问题**: 之前道歉一次就立刻恢复，不真实。
**解决**: 需要连续2轮友善才能恢复正常。

```
POST_FURIOUS 状态:
  ├─ 学生道歉/reassuring → postPeakGoodTurns++
  │   ├─ ≥2 → 恢复正常沟通 (deriveCommunicableState)
  │   └─ =1 → 态度松动但语气仍冷，继续警惕
  ├─ 学生攻击(aggressive/dismissive) → 重置计数，重返FURIOUS_PEAK
  └─ 学生中性/冷(cold/neutral/pressuring) → 重置计数，维持警惕
```

LLM行为指令明确要求: **"道歉不会立刻换原谅，需要持续友善。攻击重新点燃暴怒。"**

### 2.7 终止机制

#### 四条终止路径

| 路径 | 触发 | 机制 | 强制中止开关影响 |
|------|------|------|----------------|
| 投诉(complaint) | strikeCount ≥ 阈值 | 攻击累计三振 | ✅ 受开关控制 |
| 愤怒崩溃(angry_collapse) | angry≥9.0 持续4轮 | angryCollapseTimer | ✅ 受开关控制 |
| 恐惧崩溃(fear_collapse) | fearful≥9.5 持续3轮 | fearfulCollapseTimer | ✅ 受开关控制 |
| 悲伤崩溃(sad_collapse) | sad≥9.5 持续3轮 | sadCollapseTimer | ✅ 受开关控制 |
| 信任破裂(trust_broken) | trust≤1.5 | 即时触发 | ✅ 受开关控制 |

#### 投诉阈值动态计算

```
正常模式: threshold = max(1, 3 - patienceExhausted)
峰值模式: threshold = max(1, 2 - patienceExhausted)

patienceExhausted: 每次"攻击→道歉"循环后+1
  patienceExhausted=0 → 阈值3 (正常) / 2 (峰值)
  patienceExhausted=1 → 阈值2 (正常) / 1 (峰值)
  patienceExhausted=2 → 阈值1 (正常) / 1 (峰值)
```

#### 强制中止开关

- **默认关闭** (`forceTerminationEnabled = false`)
- 关闭时：引擎/状态机仍计算终止条件，但 `processResult` 返回的 `terminated` 为 null
- 关闭时：`clearTerminalState()` 清除终止标记，峰值/峰值后状态继续运行
- 开关位置：管理端 → 系统设置 → 强制中止 (调用 `POST /api/sp/admin/status`)

#### clearTerminalState 行为

```javascript
function clearTerminalState() {
  if (!terminatedState) return
  terminatedState = null
  strikeCount = 0
  patienceExhausted = 0
  postPeakGoodTurns = 0
  // 不重置 currentState — 峰值/峰值后状态继续运行
}
```

### 2.8 投诉警告 (LLM提示词用)

```
strikeCount=0: 无警告
strikeCount=1 且 patienceExhausted=0 且 threshold>1:
  → L1: "表达不满" — "你态度能不能好一点"
strikeCount≥threshold-1 且 <threshold:
  → L2: "最后通牒" — 必须包含"投诉"或"换医生"
```

---

## 三、情绪引擎 (Emotion Engine) v4.0

**文件**: `packages/shared/src/emotion-engine.js` (971行)

### 3.1 九维向量

```javascript
{
  calm:     0-10,  // 平静度（正向）
  relieved: 0-10,  // 释然度（正向，事件驱动）
  anxious:  0-10,  // 焦虑度
  fearful:  0-10,  // 恐惧度
  sad:      0-10,  // 悲伤度
  angry:    0-10,  // 愤怒度
  in_pain:  0-10,  // 躯体疼痛度
  trust:    0-5,   // 对医生专业能力的信任（纯JS计算）
  rapport:  0-5,   // 情感连接质量（纯JS计算）
}
```

基线默认: `{ calm:3, relieved:0, anxious:3, fearful:1, sad:0, angry:0, in_pain:0, trust:3, rapport:3 }`

### 3.2 情绪梯度表 (EMOTION_TIERS)

| 维度 | 梯度 | 阈值 (含性格偏移) |
|------|------|------------------|
| angry | slightly_irritated | ≥ 1.5 + personality.thresholdOffset |
| angry | annoyed | ≥ 3.5 + thresholdOffset |
| angry | angry | ≥ 6.0 + thresholdOffset |
| angry | furious | ≥ 8.0 + thresholdOffset |
| fearful | uneasy | ≥ 2.0 + thresholdOffset |
| fearful | fearful | ≥ 4.0 + thresholdOffset |
| fearful | very_fearful | ≥ 6.5 + thresholdOffset |
| fearful | shut_down | ≥ 9.0 + thresholdOffset (且 anxious ≥ 8) |
| sad | down | ≥ 2.0 + thresholdOffset |
| sad | sad | ≥ 4.5 + thresholdOffset |
| sad | broken | ≥ 7.0 + thresholdOffset |
| anxious | worried | ≥ 2.5 + thresholdOffset |
| anxious | anxious | ≥ 5.0 + thresholdOffset |
| anxious | very_anxious | ≥ 7.5 + thresholdOffset |

### 3.3 preUpdate — 纯时间驱动的预更新

每轮开始时执行，三步骤：

```
步骤1: 峰值持续检查 (PEAK_THRESHOLD)
  if (current >= peakThreshold && peakCounters[dim] < peakDuration) {
    peakCounters[dim]++  // 还在峰值持续期内，不衰减
    → handled
  }
  if (峰值冷却中 peakCooldown[dim] > 0) {
    peakCounters[dim] = 0  // 仅重置计数器，不衰减 (由applyLLMScore限速)
    → handled
  }
  // 峰值结束：以 high 速率自然回落
  vector[dim] = clamp(current - PEAK_DECAY[dim].high, platform, 10)

步骤2: 高段自然回落 (HIGH_THRESHOLD)
  if (current >= highThreshold && current < peakThreshold) {
    速率 = PEAK_DECAY[dim].mid (峰值冷却中限速为 max(mid, 0.5))
    vector[dim] = clamp(current - rate, platform, 10)
    → handled
  }

步骤3: 被动自然消退
  anxious < 5.0: -0.3/轮
  relieved > 0:  -0.2/轮
  calm < (baseline+2): +0.1/轮
```

**关键参数**:

| 参数 | angry | fearful | sad | anxious |
|------|-------|---------|-----|---------|
| PEAK_THRESHOLD | 8.0 | 9.0 | 7.0 | — |
| PEAK_DECAY.high | 1.5 | 1.0 | 1.0 | 0.5 |
| PEAK_DECAY.mid | 0.5 | 0.5 | 0.5 | 0.3 |
| PLATFORM (平台止步) | 6.0 | 4.0 | 4.5 | 2.5 |
| HIGH_THRESHOLD | 6.0 | 6.5 | 4.5 | 5.0 |

### 3.4 applyLLMScore — 采纳LLM情绪绝对值

#### 意图分类 (7种)

```
greeting, reassuring, neutral, cold, pressuring, dismissive, aggressive
```

#### 连攻/连抚计数

```
aggressive/dismissive → consecutiveNegative++, consecutiveReassuring=0
其他意图 → consecutiveNegative=0
reassuring → consecutiveReassuring++
其他非攻击意图 → consecutiveReassuring=0
```

#### 向上采纳 (target ≥ current)

```
angry + neutral + 无连攻: clamp(current+0.5, 0, target)  // 有限增长
其他: target  // 全量采纳
```

#### 向下衰减 (target < current) — 多重约束

```
基础最大降幅: MAX_DOWN_PER_TURN[dim]
  angry: 1.5, fearful: 1.0, sad: 1.0, anxious: 2.0, relieved: 2.0, calm: 2.0, in_pain: 1.0

rapport修正:
  angry+reassuring+rapport≥5: maxDown = 3.0
  angry+reassuring+rapport≤2: maxDown = 0.5

意图修正:
  fearful+reassuring: maxDown = 2.0
  sad+reassuring:     maxDown = 2.0

短输入防护 (≤3字+neutral):
  maxDown = min(maxDown, 0.3)  // "嗯""哦""好"等不能有效降情绪

deepReassure (LLM判定为深度道歉):
  angry:   maxDown = 5.0, 重置 peakCounters
  fearful: maxDown = 3.0, 重置 peakCounters
  sad:     maxDown = 3.0, 重置 peakCounters
  同时: strikeCount=0, fearfulCollapseTimer=0, sadCollapseTimer=0
  缩短峰值冷却: peakCooldown[dim] = max(1, peakCooldown[dim]-2)

峰值冷却限制:
  peakCooldown[dim] > 0: maxDown = min(maxDown, 1.0)

冰破机制 (首次触发，one-shot):
  fearful≥9.5 且 首次reassuring: maxDown = max(maxDown, 4.0)
  sad≥9.5     且 首次reassuring: maxDown = max(maxDown, 3.0)

峰值期保护:
  当前≥peakThreshold 且 peakCounters[dim] < peakDuration:
    reassuring → peakCounters = peakDuration (提前结束峰值)
    否则 → peakCounters++ (延长峰值)
```

#### trust/rapport 计算 (纯JS)

```
aggressive/dismissive:
  trust: -0.3, rapport: -0.5
pressuring/cold:
  trust: -0.1, rapport: -0.2
reassuring:
  trust: +0.2, rapport: +0.3
neutral:
  trust: +0.03 (微小修复)

连续攻击加成:
  连攻≥1: trust额外 -0.3*N
  连攻≥2: angry额外 +0.6
  连攻≥3: angry额外 +0.9, trust额外 -0.7
  连攻≥4: angry额外 +1.2, trust额外 -1.0

连续安抚加成 (峰值冷却期间效果减半):
  连抚≥2: angry -0.8*N (冷却中 -0.4*N), trust/rapport +0.3*N

angryEverPeaked:
  angry曾≥8.0后，再次被攻击: angry *= 1.3 (快速回到高位)
```

#### 情绪封顶冷却 (Peak Cooldown)

```
触发: 任何负面情绪 (angry/fearful/sad) 触及 10.0 → peakCooldown[dim] = 3轮

效果:
  1. preUpdate中暂停峰值后自然衰减
  2. applyLLMScore中 maxDown = min(maxDown, 1.0)
  3. 保底余温: vector[dim] = max(vector[dim], 2.0) (不能一道歉就清零)
  4. 连续安抚效果减半
```

#### 关系余痕 (Patience Exhausted)

```
patienceExhausted ≥ 1: angry ≥ 2.0, trust ≤ 4.0
patienceExhausted ≥ 2: angry ≥ 4.0, trust ≤ 3.0, rapport ≤ 3.0
```

#### 引擎层道歉兜底

```javascript
// LLM未将"对不起"识别为reassuring时，至少:
//   trust += 0.1
//   angryCollapseTimer -= 2
//   strikeCount归零 (若<3)
// 不强制衰减angry，尊重峰值保护
APOLOGY_PATTERNS = ['对不起','抱歉','我错了','我的错','不好意思','态度不好','是我不对','我不该']
```

### 3.5 checkTermination — 终止条件

```javascript
// 投诉: angry≥9.0 + 攻击意图 → strikeCount++
// 阈值: max(1, 3-patienceExhausted)
// 道歉时: strikeCount>0 → patienceExhausted++, strikeCount=0

// 愤怒崩溃: angry≥9.0持续计时
angryCollapseTimer ≥ 4 → angry_collapse

// 恐惧崩溃: fearful≥9.5持续计时
fearfulCollapseTimer ≥ 3 → fear_collapse

// 悲伤崩溃: sad≥9.5持续计时
sadCollapseTimer ≥ 3 → sad_collapse

// 信任破裂: trust ≤ 1.5 → trust_broken
```

### 3.6 getTerminationWarning — 分级预警

四个维度各有两级警告：

| 维度 | L1 条件 | L1 消息 | L2 条件 | L2 消息 |
|------|--------|---------|--------|---------|
| angry_complaint | strikeCount=1 且 patienceExhausted=0 | "病人开始不满" | strikeCount=1且patienceExhausted≥1, 或 strikeCount=2且patienceExhausted<2 | "病人威胁投诉" |
| angry_collapse | angryCollapseTimer=2 | "怒火持续未消" | angryCollapseTimer=3 | "怒火即将爆发" |
| fearful | fearfulCollapseTimer=1 | "恐惧加剧" | fearfulCollapseTimer=2 | "接近崩溃" |
| sad | sadCollapseTimer=1 | "情绪低落" | sadCollapseTimer=2 | "接近崩溃" |
| trust | trust≤2.5 | "信任开始动摇" | trust≤1.5 | "信任濒临破裂" |

### 3.7 近重复检测 (detectRepetition)

```
算法: 3-gram Jaccard相似度
阈值: 0.55 (短文本<12字符 → 0.50)
比较范围: 最近10条SP回复
```

### 3.8 LLM输出校验 (validateLLMOutput)

```
1. text: 去除括号动作描述、多余空格
2. emotion_score: 仅保留7个合法维度 (calm/relieved/anxious/fearful/sad/angry/in_pain)，值域0-10
3. intent: 仅保留7种合法意图
4. deep_reassure: 仅当 intent=reassuring 时可为 true
5. 自洽性:
   - aggressive/dismissive 但 angry<1 → intent强制降为neutral
   - reassuring 但 angry≥8 → intent强制降为neutral
```

---

## 四、性格系统 (Personality)

**文件**: `emotion-engine.js` 中 `PERSONALITY_MAP` + `derivePersonality()`

### 4.1 三个维度

| 维度 | 可选值 | 引擎影响 |
|------|--------|---------|
| **expressiveness** (表达性) | 火爆型/普通型/偏内敛/隐忍型 | thresholdOffset + peakDuration |
| **sensitivity** (敏感度) | 高敏感/普通敏感度/钝感 | LLM提示词中体现 |
| **resilience** (恢复力) | 高豁达/普通恢复力/低豁达 | LLM提示词中体现 |

### 4.2 expressiveness 参数映射

| 性格 | thresholdOffset | peakDuration | 效果 |
|------|----------------|--------------|------|
| 火爆型 | -1.5 | 1 | 阈值更低(更易触发), 峰值更短(消得快) |
| 普通型 | 0 | 2 | 标准 |
| 偏内敛 | +0.5 | 2 | 阈值略高(不易外露) |
| 隐忍型 | +2.0 | 4 | 阈值高(压抑)，但一旦爆发峰值更长 |

thresholdOffset 影响所有梯度判定: `actualThreshold = baseThreshold + thresholdOffset`

### 4.3 双路径推导

```
主路径: explicitPersonality 对象直接定义
  { expressiveness: "火爆型", sensitivity: "高敏感", resilience: "低豁达" }
  → 直接查表，精确映射

回退路径: 关键词推导 (兼容存量病例)
  从 emotionText + roleDescription 中匹配关键词:
    火爆: /暴躁|冲动|外露|直接|发作|易怒/
    隐忍: /隐忍|克制|内向|沉默|不说|压抑/
    内敛: /合作|平静|配合/
    敏感: /敏感|脆弱|容易受伤|在意|多心|小心眼|多愁善感/
    钝感: /钝感|麻木|大大咧咧|无所谓|不在乎|不在意|粗线条/
    豁达: /豁达|想得开|乐观|容易恢复|不记仇|开朗|宽容|大度/
    低豁达: /执拗|记仇|放不下|固执|倔强|记恨|偏执|难缠/
```

---

## 五、TTS 语音合成集成

**文件**: `apps/training/src/composables/useTTS.js`

### 5.1 架构

```
前端 useTTS → WebSocket ws://localhost:5100/api/sp/tts
  → sp-api TTS代理 → wss://dashscope.aliyuncs.com/api-ws/v1/realtime?model=qwen3-tts-instruct-flash-realtime
```

### 5.2 声乐技术指令映射 (INSTRUCTION_MAP)

前端使用英文技术指令描述配音要求（Qwen3-TTS对具体声乐技术描述的响应远好于情绪形容词）：

- 22个状态的英文指令（calm → post_broken）
- 3个峰值状态 (furious_peak/hysterical_peak/broken_peak) 有专门的极限指令
- 3个峰值后状态 (post_furious_wait/post_hysterical/post_broken) 有专门的回落指令
- 4个终止/崩溃状态的指令

### 5.3 音色选择 (selectVoice)

根据性别+年龄段自动匹配：
- 男: 沙小弥(<12) → 晨煦(<30) → 凯(<55) → 田叔(<70) → 徐大爷
- 女: 萌宝(<12) → 少女阿月(<30) → 芊悦(<55) → 四月(<70) → 燕铮莺

### 5.4 不可朗读过滤 (isSpeakable)

```javascript
// 以下文本不进行语音合成:
- 纯省略号: '……', '...', '…'
- 纯括号动作: /^[（(][^)）]*[）)]$/ 如"（狠狠瞪着你，一言不发）"
```

### 5.5 播放流程

```
speak(text, emotionState)
  → ensureConnection(instructions)  // 每次新建WebSocket连接(情绪不同指令不同)
    → session.update (voice + instructions)
  → input_text_buffer.append + commit
  → 收集 response.audio.delta (base64 PCM)
  → response.audio.done → playPCM (Web Audio API, 24000Hz mono 16-bit)
```

---

## 六、sp-api 后端服务

**文件**: `services/sp-api/src/index.js` (849行)
**端口**: 5100
**LLM**: qwen-turbo (通过 DashScope兼容API)

### 6.1 会话管理

```javascript
sessions: Map<sessionId, session>
TTL: 30分钟
清理: 每5分钟检查一次

session结构:
{
  id, config, model,
  engine: EmotionEngine实例,
  stateMachine: StateMachine实例,
  messages: [{role, content, emotion, action}],
  lastActivity: timestamp,
  forceTerminated: boolean,
  allTimeReplies: string[]  // 全局回复历史(最多30条)
}
```

### 6.2 processMessage — 消息处理主流程

```
1. 强制中止检查 → forceTerminated则返回终止消息
2. session.messages.push({role:'user', content})
3. detectBTrigger(text) → 检测B/B+类触发词
4. 状态机.getContext(text) → 获取当前状态上下文
5. 引擎.preUpdate() → 时间驱动更新
6. buildSystemPrompt({config, engine, smContext, messages, emotionOn}) → 构建提示词
7. callLLMDirect(llmMessages, systemPrompt) → LLM调用 (最多2次重试)
8. repairJSON + JSON.parse → 解析LLM输出
9. validateLLMOutput(parsed) → 自洽性校验
10. 近重复检测 → 最多2次LLM重试 → 仍重复则硬替换为后备词
11. 引擎.applyLLMScore() (仅full/post_peak模式)
12. 状态机.processResult() → 状态迁移 + 终止检查
13. 状态机.getState() → 获取迁移后的状态
14. session.messages.push({role:'assistant', ...})
15. 返回 {text, emotion, intent, action, terminated}
```

### 6.3 近重复处理 + 后备词库

```
第1次重试: 告诉LLM"换一句完全不同的话"，附带当前情绪上下文
第2次重试: 更强硬的"你必须输出跟之前完全不同的内容"
两次重试后仍重复 → 从后备词库硬替换

后备词库分级 (ANGRY_FALLBACKS, 22项):
  第1梯队: 口头反击 (5项)
  第2梯队: 质疑+威胁 (5项)
  第3梯队: 拒绝沟通 (5项)
  第4梯队: 去人格化/动作 (4项)
  第5梯队: 终极沉默 (2项)

COLD_FALLBACKS (12项), SAD_FALLBACKS (8项)

全部词库耗尽 → 退化为 '……' (不再说话)
不追加"(第N次)"计数器后缀
```

### 6.4 强制中止机制

```
默认: forceTerminationEnabled = false (关闭)

API:
  GET  /api/sp/admin/status → 查询状态
  POST /api/sp/admin/status → 修改开关 {forceTerminationEnabled: bool}
  POST /api/sp/admin/terminate → 强制中止会话 (需开关开启)
  GET  /api/sp/admin/sessions → 查看活跃会话

关闭时行为:
  processResult仍返回终止信息 → 但terminated设为null
  clearTerminalState()清除终止标记
  峰值/峰值后状态继续运行
```

### 6.5 prompt-builder 系统提示词构建

**文件**: `services/sp-api/src/prompt-builder.js`

```
模板文件: services/ai-generator/prompts/06-aisp/0601-sp-system.txt
人文沟通附加: 0604-humanity-chat.txt

替换占位符:
  {{role_description}}     → config.roleDescription
  {{behavior_instruction}}  → 状态机指令 (含性格+状态+情绪数值)
  {{knowledge_boundary}}    → spPlayRules 知识边界
  {{symptom_pool}}          → 结构化症状池
  {{conversation_context}}  → 对话历史 (考生/SP格式)
  {{psychological_stages_text}} → 人文沟通心理阶段
  {{humanity_scenario_text}}    → 人文沟通场景
```

behavior_instruction 内容:
```
性格: {description}, {sensitivityDesc}, {resilienceDesc}
状态: {currentState}
指令: {smContext.instruction 或 engine.getEmotionGuidance()}
情绪: 怒={angry} 虑={anxious} 惧={fearful} 悲={sad}
⚠️ 信任很低 (当trust≤2时)
```

---

## 七、前端集成 (useAISP)

**文件**: `apps/training/src/composables/useAISP.js`

### 7.1 通信模式

```
前端 → sp-api HTTP API:
  POST /api/sp/configure   → 创建会话
  POST /api/sp/message     → 发送消息
  POST /api/sp/destroy     → 销毁会话
  POST /api/sp/symptom-pool → 症状池结构化
  POST /api/sp/exam        → 体格检查

所有LLM/情绪/状态机逻辑在服务端运行
前端仅: 发送文本 + 接收{text, emotion, intent, action, terminated}
```

### 7.2 调试日志

```
debugLog: 每轮记录完整向量(9维到2位小数) + state + intent + deepReassure + action
存储: localStorage (最多30个会话) + 定期POST /api/logs
最多保留80轮/会话
```

### 7.3 重试机制

```
LLM调用失败 → 自动重试1次
仍失败 → fallback: "嗯……（请继续问诊）"
```

---

## 八、全部数值常量速查

### 8.1 情绪梯度阈值

| 维度 | 梯度1 | 梯度2 | 梯度3 | 梯度4 |
|------|-------|-------|-------|-------|
| angry | 1.5 (irritated) | 3.5 (annoyed) | 6.0 (angry) | 8.0 (furious) |
| fearful | 2.0 (uneasy) | 4.0 (fearful) | 6.5 (very_fearful) | 9.0 (shut_down) |
| sad | 2.0 (down) | 4.5 (sad) | 7.0 (broken) | — |
| anxious | 2.5 (worried) | 5.0 (anxious) | 7.5 (very_anxious) | — |

### 8.2 峰值参数

| 参数 | angry | fearful | sad | anxious |
|------|-------|---------|-----|---------|
| PEAK_THRESHOLD | 8.0 | 9.0 | 7.0 | — |
| PEAK_DECAY.high | 1.5 | 1.0 | 1.0 | 0.5 |
| PEAK_DECAY.mid | 0.5 | 0.5 | 0.5 | 0.3 |
| PLATFORM | 6.0 | 4.0 | 4.5 | 2.5 |
| HIGH_THRESHOLD | 6.0 | 6.5 | 4.5 | 5.0 |
| MAX_DOWN_PER_TURN | 1.5 | 1.0 | 1.0 | 2.0 |

### 8.3 峰值持续轮次

| 状态 | 默认轮次 |
|------|---------|
| furious_peak | 3 |
| hysterical_peak | 2 |
| broken_peak | 3 |
| shut_down | 2 |

### 8.4 ICE_BREAK (冰破)

| 维度 | 触发阈值 | 一次降幅 |
|------|---------|---------|
| fearful | ≥ 9.5 | 4.0 |
| sad | ≥ 9.5 | 3.0 |

### 8.5 deepReassure 降幅

| 维度 | maxDown |
|------|---------|
| angry | 5.0 |
| fearful | 3.0 |
| sad | 3.0 |

### 8.6 信任/亲密度修正

| 意图 | trust | rapport |
|------|-------|---------|
| aggressive/dismissive | -0.3 | -0.5 |
| pressuring/cold | -0.1 | -0.2 |
| reassuring | +0.2 | +0.3 |
| neutral | +0.03 | — |

### 8.7 连续攻击加成

| 连攻轮次 | angry | trust |
|---------|-------|-------|
| ≥1 | — | 额外-0.3*N |
| ≥2 | +0.6 | — |
| ≥3 | +0.9 | 额外-0.7 |
| ≥4 | +1.2 | 额外-1.0 |

### 8.8 情绪封顶冷却

| 触发 | 冷却轮次 | 限速 maxDown | 保底 |
|------|---------|-------------|------|
| angry/fearful/sad ≥ 10.0 | 3 | ≤ 1.0 | ≥ 2.0 |

### 8.9 重复检测

| 参数 | 值 |
|------|-----|
| 算法 | 3-gram Jaccard |
| 正常文本阈值 | 0.55 |
| 短文本(<12字符)阈值 | 0.50 |
| 比较范围 | 最近10条SP回复 |
| LLM重试次数 | 最多2次 |
| 全局去重 | allTimeReplies (最近30条) |

### 8.10 会话管理

| 参数 | 值 |
|------|-----|
| TTL | 30分钟 |
| 清理间隔 | 5分钟 |
| allTimeReplies上限 | 30条 |
| debugLog上限 | 80轮 |
| localStorage日志上限 | 30个会话 |

### 8.11 LLM配置

| 参数 | 值 |
|------|-----|
| 默认模型 | qwen-turbo |
| temperature | 0.7 |
| max_tokens | 2000 |
| 超时 | 180秒 |
| 最大重试 | 2次 |

---

## 九、状态迁移完整图示

```
                    ┌─────────────────────────────────────────┐
                    │           NORMAL (可沟通状态)              │
                    │  normal/uneasy/irritated/annoyed/angry   │
                    │  anxious/fearful/very_fearful/sad/down   │
                    └────┬──────────┬───────────┬──────────────┘
                         │          │           │
              angry≥9.0  │  f≥9.5   │  s≥9.5    │  f≥9.0+a≥8
              +攻击意图  │  a<8     │           │
                         ↓          ↓           ↓              ↓
                 ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
                 │ FURIOUS  │ │HYSTERICAL│ │ BROKEN   │ │  SHUT    │
                 │ _PEAK    │ │ _PEAK    │ │ _PEAK    │ │  DOWN    │
                 │  3轮锁定  │ │  2轮锁定  │ │  3轮锁定  │ │  2轮锁定  │
                 └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘
                      │            │            │            │
              冷却结束↓    冷却结束↓    冷却结束↓    冷却结束↓
                 ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
                 │  POST    │ │  POST    │ │  POST    │ │derive    │
                 │ FURIOUS  │ │HYSTERICAL│ │ BROKEN   │ │State(v)  │
                 │  等友善   │ │  等安抚   │ │  等共情   │ │(直接回落) │
                 └────┬─────┘ └────┬─────┘ └────┬─────┘ └──────────┘
                      │            │            │
         连续2轮友善→NORMAL  2轮deep→NORMAL  2轮deep→NORMAL
         攻击→重返PEAK      攻击→COLLAPSE   攻击→COLLAPSE
         中性→保持+重置      其他→保持+重置   其他→保持+重置
```

---

## 十、关键设计决策与教训

### 10.1 峰值进入的两个根因修复

1. **投诉检查先于峰值检查**: `shouldEnterPeak` 原本在 else 分支，投诉检查先触发可能拦截峰值进入 → 修复：将峰值预检查提到投诉之前，设 `preEnteredPeak` 标记
2. **崩溃检查在峰值进入瞬间触发**: 进入 furious_peak 后同一轮 trust≤1.5 → collapse 检查 → TRUST_BROKEN → clearTerminalState 覆盖状态 → 修复：`!preEnteredPeak` 守卫崩溃检查

### 10.2 终止不再覆盖 currentState

之前 `processResult` 在终止时会设置 `currentState = STATE.COMPLAINT` 等，导致恢复后状态丢失。修复后终止仅设置 `terminatedState` 标记，不覆盖 `currentState`。

### 10.3 clearTerminalState 不再重新派生状态

之前 `clearTerminalState` 会调用 `deriveCommunicableState(v)` 重新计算状态，导致峰值状态被覆盖为普通 angry。修复后仅清除计数器标记。

### 10.4 POST_FURIOUS 需要连续2轮友善

单次道歉后 `postPeakGoodTurns=1`，态度松动但语气仍冷。需要连续2轮友善（道歉或 reassuring）才恢复正常。中性/冷的输入会重置计数器。攻击会直接重返暴怒峰值。

---

## 十一、文件索引

| 文件 | 行数 | 职责 |
|------|------|------|
| `packages/shared/src/emotion-state-machine.js` | 611 | 状态机 v5.0 — 状态定义/迁移/终止 |
| `packages/shared/src/emotion-engine.js` | 971 | 情绪引擎 v4.0 — 向量/衰减/采纳/性格 |
| `services/sp-api/src/index.js` | 849 | 后端服务 — 会话/LLM/重复检测/TTS代理 |
| `services/sp-api/src/prompt-builder.js` | 117 | 系统提示词构建器 |
| `apps/training/src/composables/useAISP.js` | 393 | 前端SP客户端 |
| `apps/training/src/composables/useTTS.js` | 273 | TTS语音合成 + 声乐指令映射 |
| `apps/admin/src/views/SystemSettings.vue` | 195 | 管理端 — 情绪引擎/强制中止开关 |
| `services/ai-generator/prompts/06-aisp/0601-sp-system.txt` | — | LLM系统提示词模板 |
| `services/ai-generator/prompts/06-aisp/0604-humanity-chat.txt` | — | 人文沟通附加提示词 |
