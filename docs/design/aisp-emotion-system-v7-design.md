# AI-SP 情绪系统 v7.0 设计（极简版）

> 日期: 2026-06-13 | 基于 v6 框架，大幅简化

---

## 一、核心原则

| 原则 | 说明 |
|------|------|
| **LLM 是主力** | 复杂性交给 LLM（全量对话历史、重复检测、语境判断），引擎只做加减和封顶 |
| **4 数值驱动** | anger / fear / sadness / joy，统一 0-10 刻度 |
| **状态由数值决定** | 过阈值自动切状态，不需要状态机手动管理迁移 |
| **策略条目是 LLM 的行为指南** | 每个状态 × 意图一条，含行为方向 + delta 参考范围 |
| **投诉是策略行为** | LLM 在极端状态下从策略中选择投诉，不是引擎自动触发 |

---

## 二、架构

```
学生输入
  → LLM (对话历史 + 当前状态 + 策略条目 + 场景参数 + 性格描述)
     输出: { text, delta: {anger, fear, sadness, joy}, tts_emotion, action_group }
  → 引擎: rawDelta × sensitivity × resilience → clamp + 场景保底
  → 过阈值 → 状态切换（下一轮生效）
  → 新状态 → 新策略条目 → 下一轮 LLM
```

**状态滞后是真实的**：本轮回应基于上一轮状态，本轮结束后数值更新才可能改变状态。

---

## 三、情绪数值

### 3.1 四个数值

| 数值 | 范围 | 驱动方式 | 消退方式 |
|------|------|---------|---------|
| **anger** | 0-10 | 双路径：冲击（瞬跳）+ 累积（offensive 慢慢攒）| 道歉/友善降 |
| **fear** | 0-10 | 场景预设初始 + 坏消息冲击 | 安抚/专业表达降 |
| **sadness** | 0-10 | 场景预设初始 + 坏消息冲击 | 共情/专业表达降 |
| **joy** | 0-10 | 被尊重/好消息触发 | 快速自消 |

### 3.2 状态阈值（统一 2/5/8，joy 例外）

```
anger:
  calm ─≥2→ irritated ─≥5→ angry ─≥8→ furious

fear:
  calm ─≥2→ uneasy ─≥5→ fearful ─≥8→ terrified

sadness:
  calm ─≥2→ down ─≥5→ sad ─≥8→ broken

joy:
  calm ─≥3→ pleased（低于3回落calm）
```

### 3.3 LLM delta 参考表

| impact_level | anger | fear | sadness | joy |
|-------------|-------|------|---------|-----|
| extreme | 3~8 | 3~8 | 3~8 | — |
| high | 1.5~4 | 1.5~4 | 1.5~4 | 3~6 |
| medium | 0.5~2 | 0.5~2 | 0.5~2 | 1~3 |
| low | 0~1 | 0~1 | 0~1 | 0~1 |

LLM 根据对话上下文在该范围内取具体值——重复安抚给低值、中断不给惩罚、连续攻击给高值。

### 3.4 引擎规则

```javascript
// 步骤1: 场景乘数（疼痛病人 anger delta ×1.3~1.5，与性格 sensitivity 取最大不叠加）
const sceneMul = getSceneMultiplier(scene)  // { anger: 1.0~1.5, fear: 1.0, sadness: 1.0, joy: 1.0 }

// 步骤2: 性格修正 LLM 原始 delta
for (const dim of ['anger', 'fear', 'sadness', 'joy']) {
  let d = delta[dim]

  // sensitivity + 场景乘数取最大（不叠加）
  d *= Math.max(sensitivityMultiplier, sceneMul[dim])  // 1.5 / 1.3 / 1.0 / 0.7

  // resilience: 仅恢复方向（d<0）额外加速
  if (d < 0) d *= resilienceMultiplier  // 1.5 / 1.0 / 0.6

  // 步骤3: 状态锁定兜底
  //   terrified/broken + non-friendly → 该情绪 delta 强制 ≤0（不允许涨也不允许非法降）
  //   wariness + anger → 非 friendly 卡值不消退（friendly 允许降）
  if (state === 'terrified' && intent !== 'friendly' && dim === 'fear' && d < 0) d = 0
  if (state === 'broken' && intent !== 'friendly' && dim === 'sadness' && d < 0) d = 0
  if (state === 'wariness' && dim === 'anger' && d < 0 && intent !== 'friendly') d = 0

  // 步骤4: 应用到向量
  vector[dim] = clamp(vector[dim] + d, 0, 10)

  // 步骤5: 场景保底（如疼痛病人 anger≥2）
  if (sceneFloor[dim] !== undefined) {
    vector[dim] = Math.max(vector[dim], sceneFloor[dim])
  }
}

// 步骤6: 过阈值 → 状态切换（wariness 例外，见 4.1）
// 性格阈值偏移参与判定: actualThreshold = baseThreshold + exprOffset
```

**无自然衰减**：LLM 的 delta 是全量的，引擎不做额外时间衰减。

### 3.5 状态判定逻辑

```
determineState(prevState, newVector, intent):
  
  1. wariness 进入:
     if prevState ∈ {angry, furious} and intent = friendly:
       → enter 'wariness'

  2. wariness 保持/退出:
     if prevState = 'wariness':
       if intent = attack:
         → exit to getAngerState(anger)  // 回 angry，值从卡住处继续涨
       → stay 'wariness'                 // friendly 可降 anger，neutral/offensive 卡住

  3. terrified 锁定/解锁:
     if prevState = 'terrified':
       if fear < 8: → getFearState(fear)  // 解锁
       → stay 'terrified'

  4. broken 锁定/解锁:
     if prevState = 'broken':
       if sadness < 8: → getSadState(sadness)
       → stay 'broken'

  5. 正常判定（取最高优先级主导）:
     states = [getAngerState(anger), getFearState(fear), getSadState(sadness), getJoyState(joy)]
     → priorityPick(states)  // furious > terrified > broken > angry > fearful > sad > ...
```

---

## 四、行为状态（12 个）

| 状态 | 所属线 | 进入条件 | 核心特征 |
|------|--------|---------|---------|
| **calm** | 基线 | 默认 | 正常配合 |
| **irritated** | anger | anger ≥ 2 | 藏刺，回答变短 |
| **angry** | anger | anger ≥ 5 | 高声质问，尖锐 |
| **furious** | anger | anger ≥ 8 | 暴怒，攻击性强，保有对外感知 |
| **uneasy** | fear | fear ≥ 2 | 语带犹豫 |
| **fearful** | fear | fear ≥ 5 | 声音发抖，反复确认 |
| **terrified** | fear | fear ≥ 8 | 对外界基本无回应，仅 friendly 可触达 |
| **down** | sadness | sadness ≥ 2 | 话少，平淡 |
| **sad** | sadness | sadness ≥ 5 | 说到一半停住，低沉 |
| **broken** | sadness | sadness ≥ 8 | 完全封闭，仅 friendly 可触达 |
| **pleased** | joy | joy ≥ 3 | 态度积极，配合 |
| **wariness** | 特殊 | angry状态下收到friendly → 直接进入 | 配合但警惕，防御解读 |

**wariness 特殊规则**：
- 进入: angry/furious 状态下 friendly → 状态直接切 wariness
- 愤怒值：**卡在当前值不消退**（engine 层 anger delta 只取 ≥0）
- 退出: wariness-friendly 多轮后 anger 逐步降，降至 <2 → calm
- attack: 退出 wariness → 回 angry，anger 从卡住的值继续涨（+4~6）

**terrified / broken 锁定**：
- 所有意图统一回应（沉默/断句/空洞）
- 仅 friendly 可降低数值
- 引擎兜底: non-friendly 时 delta 强制截断为 ≤0（不允许涨也不允许非法降）
- 数值降至 <8 后解锁 → 恢复正常状态判定

### 4.1 多情绪并存：主导状态

同一时刻可能存在多个非 calm 状态（如 anger=6 且 fear=6）。TTS/视频/策略条目选**优先级最高**的：

```
优先级 (高→低):
  furious > terrified > broken > angry > fearful > sad > irritated > uneasy > down > wariness > pleased > calm
```

- 策略条目：只加载主导状态的 5 条
- TTS/视频：跟主导状态走
- 数值更新：四个情绪独立计算，互不影响

---

## 五、策略条目

### 5.1 格式

```
[状态-意图] 行为方向 | 语气特征 | delta参考
```

每条一行，LLM 仅加载当前状态的 5 条（~200 字）。

### 5.2 全量条目

#### calm

```
[calm-neutral]    正常配合，完整回答。语气平稳。delta: 全部 0
[calm-attack]     先困惑没反应过来，随后anger上升。语气从困惑转冷。delta: anger +2~3
[calm-offensive]  略微不快，回答变短但仍配合。语气稍冷。delta: anger +0.5~1
[calm-friendly]   礼貌感谢。语气温和。delta: joy +0.5~1
[calm-noise]      表示没听清请重复。语气正常。delta: 全部 0
```

#### irritated (anger ≥ 2)

```
[irritated-neutral]   短答，不主动拓展。语气藏刺。delta: anger 缓慢 -0.5~0
[irritated-attack]    立即反击，音量提高。语气激烈。delta: anger +3~5
[irritated-offensive] 不耐烦催促。语气更硬。delta: anger +1~2
[irritated-friendly]  略微平复。语气松动。delta: anger -1~2
[irritated-noise]     皱眉不接话。delta: 全部 0
```

#### angry (anger ≥ 5)

```
[angry-neutral]    不耐烦反问，回答极短。语气尖锐。delta: anger -0.5~0
[angry-attack]     以牙还牙对骂，威胁投诉。语气凶狠。delta: anger +3~5
[angry-offensive]  高声质问。语气激烈。delta: anger +0.5~1.5
[angry-friendly]   态度松动但语气仍冷，不立刻原谅。delta: anger -1~2（降后≥2则→wariness）
[angry-noise]      无视，不理人。delta: 全部 0
```

#### furious (anger ≥ 8)

```
[furious-neutral]    极短怼回，拒绝给信息。语气凶狠。delta: anger 0~-0.5
[furious-attack]     直接喊滚/喊投诉。语气暴怒。delta: anger 维持高位
[furious-offensive]  拒绝沟通，转身/不看你。delta: anger 0
[furious-friendly]   稍微降低敌意但远未原谅。语气冷。delta: anger -1~2（→wariness）
[furious-noise]      怒视不吭声。delta: 全部 0
```

#### wariness

```
[wariness-neutral]   配合但有距离，回答简短不主动。语气保留。delta: anger 缓慢 -0.5~0
[wariness-attack]    信任崩塌，重返暴怒。语气更烈。delta: anger +4~6
[wariness-offensive] 更警惕，解读为敷衍。语气冷。delta: anger +0.5~1
[wariness-friendly]  逐渐软化。语气缓。delta: anger -0.5~1（累计多轮友善→calm）
[wariness-noise]     沉默等待，不催促。delta: 全部 0
```

#### uneasy (fear ≥ 2)

```
[uneasy-neutral]   语带犹豫，能回答问题但不够流畅。delta: fear -0.5~0
[uneasy-attack]    被吓到，退缩。delta: fear +1~2
[uneasy-offensive] 不安加重，语句更碎。delta: fear +0.5~1
[uneasy-friendly]  感到被理解，逐渐平复。delta: fear -1~2
[uneasy-noise]     不知说什么，沉默。delta: 全部 0
```

#### fearful (fear ≥ 5)

```
[fearful-neutral]   声音发抖，反复追问"严不严重"。delta: fear -0.5~0
[fearful-attack]    恐惧骤升，语无伦次。delta: fear +2~4
[fearful-offensive] 焦虑加重，反复确认。delta: fear +0.5~1
[fearful-friendly]  安抚生效，逐渐平稳。delta: fear -1~2
[fearful-noise]     思绪混乱，说不出话。delta: 全部 0
```

#### terrified (fear ≥ 8)

```
[terrified-*]  所有意图统一: 眼神空洞/抓东西/说断句。对外界基本无回应。
               delta: 全部 0（锁定）
[terrified-friendly]  例外: 稍微能听进去。delta: fear -0.5~1。多轮累积至<8 → fearful
```

#### down (sadness ≥ 2)

```
[down-neutral]   话少，语气平淡。delta: sadness -0.5~0
[down-attack]    更沉默，被刺伤。delta: sadness +1~2
[down-offensive] 更无力，不想说了。delta: sadness +0.5~1
[down-friendly]  感到被关心，愿意多说。delta: sadness -1~2
[down-noise]     低头不语。delta: 全部 0
```

#### sad (sadness ≥ 5)

```
[sad-neutral]   说一半停住，声音低沉。delta: sadness -0.5~0
[sad-attack]    哭泣，更封闭。delta: sadness +2~4
[sad-offensive] 更封闭不理人。delta: sadness +0.5~1
[sad-friendly]  共情起效，逐步恢复沟通。delta: sadness -1~2
[sad-noise]     抹泪沉默。delta: 全部 0
```

#### broken (sadness ≥ 8)

```
[broken-*]  所有意图统一: 完全封闭、哭泣/捂脸/无力。对外界基本无回应。
            delta: 全部 0（锁定）
[broken-friendly]  例外: 深度共情可能触达。delta: sadness -0.5~1。多轮累积至<8 → sad
```

#### pleased (joy ≥ 3)

```
[pleased-neutral]   态度积极，配合。delta: joy 维持
[pleased-attack]    喜悦瞬间消失。delta: joy -3~5
[pleased-offensive] 面色冷下来。delta: joy -1~2
[pleased-friendly]  更配合，话多。delta: joy 维持高位
[pleased-noise]     微笑等待。delta: joy 缓慢自降
```

---

## 六、LLM 输出 Schema

```json
{
  "text": "SP回复文本",
  "intent": "offensive",
  "delta": {
    "anger": -1.5,
    "fear": 0,
    "sadness": 0,
    "joy": 0.5
  },
  "tts_emotion": "irritated",
  "action_group": "irritated",
  "complaint": false,
  "deep_reassure": false
}
```

| 字段 | 说明 |
|------|------|
| `text` | SP 回复文本，不含动作描述。沉默用"……"、"嗯"、"我……"等极简回应 |
| `intent` | 学生本轮意图分类：attack / offensive / friendly / neutral / noise。引擎需要用于状态锁定兜底 |
| `delta` | 四个情绪的变化量，正=升负=降。参考策略条目的范围 |
| `tts_emotion` | TTS 声学指令（当前不校验，由 LLM 根据主导状态自选） |
| `action_group` | 视频动作组（当前不校验） |
| `complaint` | LLM 根据当前状态策略判断本轮是否触发投诉行为 |
| `deep_reassure` | LLM 判断学生本轮是否做出真诚的深度道歉 |

**沉默表现规则**：
- terrified/broken：极简断句 "我……"、"……"、"（摇头）"等
- 其他状态：省略号仅偶尔用，避免连续两轮纯"……"
- LLM 根据状态选择具体形式

---

## 七、场景预设

### 7.1 预设值

| 场景类型 | fear 初始 | sadness 初始 | anger 初始 | 说明 |
|---------|----------|-------------|-----------|------|
| 普通接诊 | 0~1 | 0 | 0 | 无明显预设情绪 |
| 坏消息告知 | 3~5 | 3~5 | 0~1 | 病人已觉察不好，但等医生确认 |
| 知情同意 | 2~4 | 0~1 | 0 | 担心手术/治疗风险 |
| 冲突化解 | 0~1 | 0~1 | 2~4 | 已经不高兴了来复诊 |
| 疼痛病人 | 0~1 | 0 | ≥ 2 | 疼着的人一直有底色 |

### 7.2 疼痛病人特殊规则

```
anger 初始 ≥ 2 → 直接 irritated 起步
anger 保底 ≥ 2 → 永不回 calm（最多回 irritated）
anger delta ×1.3~1.5 → 被冒犯时涨更快
```

> 疼痛 delta 乘数与性格 sensitivity 乘数**取最大**，不叠加（如高敏感 ×1.3 + 疼痛 ×1.5 → 取 1.5）

---

## 八、投诉机制

### 8.1 规则

```
三条命：3 strikes → 强制终止
投诉触发：LLM 在策略条目中选择投诉行为 → 输出 complaint: true 标记
引擎动作：收到 complaint=true → strikeCount++，不干预文本
投诉重置：深度道歉（LLM 输出 deep_reassure: true）→ strikeCount = 0
```

### 8.2 LLM 输出补充

```json
{
  "text": "...",
  "delta": {...},
  "tts_emotion": "...",
  "action_group": "...",
  "complaint": false,
  "deep_reassure": false
}
```

- `complaint`: LLM 根据当前状态策略判断本轮是否触发投诉
- `deep_reassure`: LLM 判断学生本轮是否做出了真诚的深度道歉

### 8.3 流程

```
LLM 输出 complaint=true → 引擎 strikeCount++
LLM 输出 deep_reassure=true → 引擎 strikeCount = 0
strikeCount ≥ 3 → 强制终止
```

### 8.4 强制中止开关

- 默认关闭（`forceTerminationEnabled = false`）
- 管理端可切换
- 关闭时：引擎仍计 strikeCount 但返回 `terminated: false`

---

## 九、Joy 的定位

Joy 不参与情绪调节，不冲淡其他数值。

**唯一用途**：表现 SP 的良好状态——比如接诊结束时的愉悦、放松，用于与负面情绪状态形成对比。让学生感知到 SP 的情绪在好转。

---

## 十、性格系统

> 全部在引擎层计算，LLM 只感知行为方向（"这个人比较火爆"），不出数字。

### 10.1 三维度

| 维度 | 可选值 | 引擎作用 |
|------|--------|---------|
| **expressiveness** (表达性) | 火爆型/普通型/偏内敛/隐忍型 | 阈值偏移 |
| **sensitivity** (敏感度) | 高敏感/普通敏感度/钝感 | 全 delta ×系数 |
| **resilience** (恢复力) | 高豁达/普通恢复力/低豁达 | 恢复方向 delta 额外 ×系数 |

### 10.2 参数表

| 性格 | exprOffset | sensitivityMul | resilienceMul |
|------|-----------|---------------|---------------|
| 火爆型 | **-1.5** | 1.0 | 1.0 |
| 普通型 | **0** | 1.0 | 1.0 |
| 偏内敛 | **+0.5** | 1.0 | 1.0 |
| 隐忍型 | **+2.0** | 1.0 | 1.0 |
| 高敏感 | 0 | **×1.3** | 1.0 |
| 钝感 | 0 | **×0.7** | 1.0 |
| 高豁达 | 0 | 1.0 | **×1.5** |
| 低豁达 | 0 | 1.0 | **×0.6** |

> 三维度可叠加。如"火爆+高敏感+低豁达" = 阈值 -1.5 + delta ×1.3 + 恢复 ×0.6

### 10.3 效果推演

同一输入（attack, medium），anger=0，不同性格：

| | 火爆+高敏感 | 普通 | 隐忍+钝感 |
|------|----------|------|----------|
| 阈值（irritated） | anger≥0.5 | anger≥2.0 | anger≥4.0 |
| LLM raw delta | +1.5 | +1.5 | +1.5 |
| 引擎修正 | ×1.3 = +1.95 | ×1.0 = +1.5 | ×0.7 = +1.05 |
| 结果 | 2.0 → **irritated** | 1.5 → calm | 1.1 → calm |

同一道歉，anger=6.0（angry），不同性格：

| | 高豁达 | 普通 | 低豁达 |
|------|-------|------|------|
| LLM raw delta | -1.0 | -1.0 | -1.0 |
| 引擎修正 | ×1.0 ×1.5 = -1.5 | ×1.0 = -1.0 | ×1.0 ×0.6 = -0.6 |
| 结果 | 4.5 → **wariness** | 5.0 → angry | 5.4 → angry |

### 10.4 LLM 侧

LLM 只被告知性格描述（文字），用于决定行为方向。不感知具体数字：

```
"你是一位{expressiveness_desc}的病人。
 火爆型: 情绪外露、发作快、不藏着
 隐忍型: 遇事先忍，但一旦爆发很难哄好"

"{sensitivity_desc}
 高敏感: 很在意对方态度，容易被刺伤
 钝感: 不太在意态度，比较粗线条"
```

---

## 十一、与 v5 关键差异

| 维度 | v5（现行） | v7（本设计） |
|------|-----------|------------|
| 情绪维度 | 9 维向量 | 4 数值 |
| 行为状态 | 21 个（含峰值/峰值后/终止） | 12 个 |
| LLM 输出 | 直接出 9 维绝对值 | 出 4 维 delta |
| 引擎复杂度 | preUpdate + applyLLMScore + 10+ 计数器 | clamp + 性格乘数 + 状态兜底 |
| 状态入口 | 单路径（阈值） | 双路径（冲击 + 累积） |
| 投诉触发 | 引擎自动计算 | LLM 策略选择 |
| 自然衰减 | 引擎每轮计算 | LLM delta 体现 |
| 策略条目 | 大段硬编码指令 | 状态×意图 简洁条目 ~60 条 |
| 终止状态 | 5 个独立状态 | 3 strike 机制 |

---

## 十二、实施清单

| # | 内容 | 状态 |
|---|------|------|
| 1 | 引擎层：4 数值 + clamp + 性格乘数 + 场景保底 | ⬜ |
| 2 | 状态判定：阈值函数（含性格偏移） | ⬜ |
| 3 | 策略条目：12 状态 × 5 意图 → prompt-builder | ⬜ |
| 4 | LLM 输出 schema：delta 格式 | ⬜ |
| 5 | 场景预设：fear/sadness/anger 初始值 + 疼痛规则 | ⬜ |
| 6 | 投诉机制：3 strikes | ⬜ |
| 7 | Wariness 状态：特殊迁移规则 | ⬜ |
| 8 | 性格系统：引擎层 3 维乘数 | ⬜ |
| 9 | LLM system prompt 重写 | ⬜ |
| 10 | TTS/视频指令映射 | 沿用 v5 |
| 11 | 重复检测 | 沿用 v5 |
| 12 | 空输入拦截 | 沿用 v6 |
| 13 | 管理端开关 | 沿用 v5 |
