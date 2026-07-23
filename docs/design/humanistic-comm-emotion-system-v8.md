# 人文沟通站 情绪系统 v8 设计文档

> 2026-06-15 | 基于 v7.4 重构，实现接诊站/人文站完全分离

---

## 1. 概述

人文沟通站的 SP 与接诊站有本质不同：

| 维度 | 接诊站 | 人文沟通站 |
|------|--------|-----------|
| SP身份 | 初次就诊病人 | 已有信任基础的患者/家属 |
| 对话驱动 | 医生问→病人答 | 疑问清单驱动，SP按顺序提问 |
| 情绪来源 | 医生态度 + 病情回忆 | 疑问是否被解答 + 冲击性消息 |
| 愤怒上限 | 开放（可到furiuos） | 克制（有信任基础，maxRise=1.0/轮） |
| 恐惧/悲伤 | 引擎刹车约束 | LLM完全自主（constrainDrop不含） |
| 情绪地板 | 全0 | fear≥3, sadness≥3 |
| va/vs来源 | LLM自主选择 | 状态机策略表硬覆盖 |

---

## 2. 架构总览

```
学生输入
  │
  ├─→ triggers.js        ← 检测 B/B+/A 触发词、多问、家属预后
  ├─→ intent-classifier  ← 规则库兜底修正 LLM 意图
  │
  ▼
index.js (processMessage)
  │
  ├─ stateMachine.getContext()  ← 构建策略指令（状态机是唯一决策层）
  ├─ buildSystemPrompt()        ← 拼接 base prompt + humanity prompt
  ├─ callLLMDirect()            ← LLM 调用（qwen-plus）
  │
  ├─ engine.validateLLMOutput() ← 校验LLM JSON
  ├─ engine.setAbsolute()       ← v8：LLM输出绝对值，引擎刹车
  ├─ stateMachine.determineState()
  │
  ├─ va/vs 硬覆盖（仅人文站）   ← 策略表值覆盖 LLM 的 video_action/voice_style
  └─ 返回前端
```

---

## 3. 模块详解

### 3.1 session-store.js — 场景参数差异化

文件：`services/sp-api/src/session-store.js`

`detectScene()` 根据 `config.mode` 返回不同参数：

```js
// 人文沟通站 (mode === 'humanistic-comm')
constrainDrop = ['anger']            // 仅anger由引擎约束
maxRise.anger = 1.0                  // anger每轮最多+1.0
emotionFloor.fear = 3                // 家属永远有基础担忧
emotionFloor.sadness = 3             // 悲伤底色不会消失
multiplier.anger = 0.6               // anger乘数偏低
multiplier.fear = 0.7                // fear乘数偏低
```

传给引擎的参数：

| 参数 | 接诊站 | 人文站 | 作用 |
|------|--------|--------|------|
| `constrainDrop` | `['anger','fear','sadness']` | `['anger']` | 引擎控制哪些维度的升降 |
| `maxRise` | 无限制 | `{anger:1.0}` | 每轮最大上升幅度 |
| `emotionFloor` | 全0 | `{fear:3, sadness:3}` | 各维度最低值 |

### 3.2 emotion-engine.js — 引擎刹车机制

文件：`packages/shared/src/emotion-engine.js`

核心方法 `setAbsolute(values, opts)` 的处理流程：

```
LLM 输出绝对值 {anger, fear, sadness, joy}
  │
  ├─ peakLock 检查（已有锁 → 冻结所有维度）
  │
  ├─ 逐维度处理：
  │   │
  │   ├─ 在 constrainDropSet 内（人文站仅anger）：
  │   │   ├─ attack轮：anger强制至少+2（minRise），drop=0
  │   │   ├─ 非attack上升：受maxRise限制
  │   │   └─ 非attack下降：最多降0.5/轮（deepReassure时2.0）
  │   │
  │   └─ 不在 constrainDropSet 内（人文站fear/sadness）：
  │       → LLM值直接透传，引擎不干预
  │
  ├─ emotionFloor 钳位（人文站 fear≥3, sadness≥3）
  │
  └─ anger触顶检查（≥9+exprOffset → 启动3轮peakLock）
```

关键代码（emotion-engine.js:306-338）：

```js
// constrainDrop: 引擎截断升降; 不在集合内 → LLM 完全自主
for (const dim of ['anger', 'fear', 'sadness', 'joy']) {
  if (typeof values[dim] !== 'number') continue
  const target = clamp(values[dim], 0, 10)
  const current = vector[dim]

  if (constrainDropSet.has(dim)) {
    // 引擎约束维度
    // ...
  } else {
    // LLM 完全自主：值直接透传
    vector[dim] = target
  }
}

// floor钳位
for (const dim of ['anger', 'fear', 'sadness', 'joy']) {
  if (vector[dim] < floor[dim]) vector[dim] = floor[dim]
}
```

### 3.3 emotion-state-machine.js — 策略表

文件：`packages/shared/src/emotion-state-machine.js`

#### 状态判定 `computeRawState()`

优先级：崩溃 > furiuos(≥9) > terrified(≥9) > angry(≥5) > sad(≥5) > fearful(≥5) > irritated(≥2) > uneasy(≥2) > calm

人文站去掉了复合态（恐+怒、恐+悲、崩溃仅限三维同时≥8）。

#### 策略表结构

4种性格 × 9个状态 × 5种意图 = 180条策略。每条指定：
- `va` — video_action
- `vs` — voice_style  
- `tx` — text写作指南
- `dl` — delta参考（v8中仅作参考，LLM输出绝对值后引擎刹车）

#### 极端状态特殊处理

`furious`、`terrified`、`崩溃` 三个极端状态不走策略表，直接输出绝对指令（getContext方法中硬编码），强制LLM按指定行为写作。

#### OUTPUT_SCHEMA

```json
{"text":"<你的回复文本>","video_action":"<从菜单选>","voice_style":"<从菜单选>","intent":"<attack|offensive|friendly|neutral|noise>","emotion":{"anger":<0-10>,"fear":<0-10>,"sadness":<0-10>,"joy":<0-10>},"deep_reassure":<true|false>,"show_material":<null|报告ID>}
```

⚠️ 所有emotion占位符已改为 `<0-10>` 避免LLM照抄0值。

### 3.4 提示词系统

#### Base Prompt: `0601-sp-system.txt`

文件：`services/ai-generator/prompts/06-aisp/0601-sp-system.txt`

- 通用SP角色手册（接诊站+人文站共用）
- emotion字段说明简化为"根据当前状态自主决定"
- 意图分类决策树（5级：attack > offensive > friendly > noise > neutral）

#### 人文站专属：`0604-humanity-chat.txt`

文件：`services/ai-generator/prompts/06-aisp/0604-humanity-chat.txt`

关键规则（优先级高于base prompt）：

| 规则 | 内容 |
|------|------|
| **H0** | 场景前提：已有信任基础，非初次就诊 |
| **H1** | 意图重定义：offensive=回避疑问/敷衍/拉回问诊模式 |
| **H2** | 疑问驱动对话：按编号顺序提出，逐一推进 |
| **H3** | 冲击性消息的震惊反应：否认≠平静，禁止0情绪 |
| **H3子节** | 情绪累积规则：text与emotion值必须一致 |
| **H4** | 情绪基线：容忍度更高，好沟通有正面反馈 |
| **H5** | 病史回答方式：延续性语境，非初次就诊 |
| **H6** | 情绪危机处理：需2轮真诚共情才能平复 |

#### 提示词组装：`prompt-builder.js`

文件：`services/sp-api/src/prompt-builder.js`

组装流程：
1. 加载base prompt → 替换 `{{role_description}}`
2. 替换 `{{behavior_instruction}}`（状态机策略上下文）
3. 替换 `{{symptom_pool}}`
4. 人文站模式：追加 humanity prompt + 心理阶段 + 场景信息 + script疑问清单
5. 追加触发词硬提醒（B/B+/A/多问/家属预后）
6. 追加检查报告素材信息

### 3.5 index.js — API编排层

文件：`services/sp-api/src/index.js`

核心流程 `processMessage()`：

```
1. 触发词检测 (detectBTrigger, detectATrigger)
2. 多问检测 (问号≥2)
3. 家属预后关键词检测
4. 构建 smContext (stateMachine.getContext)
5. 构建 systemPrompt (buildSystemPrompt)
6. LLM 调用 (callLLMDirect)
7. 解析 + 校验 (validateLLMOutput)
8. engine.setAbsolute() — LLM绝对值 → 引擎刹车
9. stateMachine.determineState()
10. 投诉检测 (COMPLAINT_TRIGGERS)
11. 重复检测 → 重试（最多2次）→ 后备词兜底
12. va/vs 硬覆盖（仅人文站，非calm状态）:
    const strategies = stateMachine.getStrategiesForState(outputState)
    const strat = strategies[finalIntent] || strategies['neutral']
    validated.video_action = strat.va
    validated.voice_style = strat.vs
```

### 3.6 intent-classifier.js — 意图规则库兜底

文件：`packages/shared/src/intent-classifier.js`

当LLM意图分类明显错误时，规则库修正：
- LLM判noise/neutral但命中了attack → 修正为attack
- LLM判attack但命中offensive → 降级为offensive
- LLM判friendly被误判 → 修正为friendly

### 3.7 TTS 语音指令

文件：`apps/training/src/composables/useTTS.js`

voice_style → 中文指令映射（作为TTS session instructions发送）：

| voice_style | 指令 | 适用场景 |
|-------------|------|---------|
| `normal` | 声音带关切 | calm |
| `slightly_tense` | 声音带些许不耐烦 | irritated |
| `loud_fast` | 语气激动 | angry |
| `very_loud_fast` | 极度愤怒 | furious |
| `cold` | 冷淡疏离 | 隐忍型angry+ |
| `shaky` | 不安害怕 | fearful |
| `very_shaky` | 极度恐惧 | terrified |
| `soft_slow` | 声音低沉缓慢，悲伤压抑 | sad |
| `defensive` | 戒备抗拒 | 恐+怒复合态 |
| `vulnerable` | 声音虚弱颤抖，带着哭腔 | 恐+悲复合态 |
| `broken` | 崩溃抽泣，声音发抖，断断续续 | 崩溃 |

### 3.8 前端 — HumanisticComm.vue

文件：`apps/training/src/views/humanistic-comm/HumanisticComm.vue`

#### 素材调用规则（母亲+幼儿场景）

```js
// 家属+女+患者<11岁 → 使用患儿素材（母子同框照片）
const patientAgeNum = typeof spInfo.age === 'string' ? (parseInt(spInfo.age) || 999) : (spInfo.age || 999)
const usePatientAssets = ttsGender === '女' && patientAgeNum < 11
const imgGender = usePatientAssets ? spInfo.gender : ttsGender
const imgAge = usePatientAssets ? spInfo.age : String(ttsAge)
```

#### 心理阶段指示器

根据消息轮次自动推进（每4轮推进1个阶段），显示在右上角。

#### TTS打断

连续发言时自动打断上一段TTS播放（stop上一段→start新段），解决音频重叠问题。

---

## 4. 数据流：一轮对话的完整链路

```
[学生输入] "孩子这个病以后会不会影响一辈子？"

    │ triggers.js
    ├─ PROGNOSIS_KEYWORDS 命中 "会不会影响" → familyPrognosisConcern = true
    │
    ▼
[stateMachine.getContext("孩子这个病...")]
    │ 返回当前状态 + 策略指令 + OUTPUT_SCHEMA
    │
    ▼
[buildSystemPrompt]
    │ base prompt + humanity prompt (H0-H6)
    │ + 心理阶段信息 + 场景背景 + script疑问清单
    │ + 本轮硬提醒："家属视角规则：学生询问了预后..."
    │
    ▼
[LLM 调用]
    │ 输出: {"text":"我也想知道啊...","emotion":{"anger":0,"fear":7,"sadness":6,"joy":0},...}
    │
    ▼
[validateLLMOutput] → parsed, validated
    │
    ▼
[engine.setAbsolute({anger:0, fear:7, sadness:6, joy:0}, {intent:'neutral'})]
    │ anger在constrainDrop内 → 0→0 OK
    │ fear不在constrainDrop内 → LLM值7直接透传
    │ sadness不在constrainDrop内 → LLM值6直接透传
    │ floor钳位: fear≥3✓ sadness≥3✓
    │
    ▼
[stateMachine.determineState('neutral')]
    │ fear=7≥5 → state = 'fearful'
    │
    ▼
[va/vs 硬覆盖] (state !== 'calm')
    │ strategySlice['fearful']['neutral'] → { va:'fearful', vs:'shaky' }
    │ validated.video_action = 'fearful'
    │ validated.voice_style = 'shaky'
    │
    ▼
[返回前端]
    │ emotion: {anger:0, fear:7, sadness:6, joy:0, state:'fearful'}
    │ action: 'fearful'
    │ voiceStyle: 'shaky'
    │
    ▼
[前端 TTS]
    │ VOICE_INSTRUCTIONS['shaky'] = '不安害怕。'
    │ → qwen3-tts-instruct-flash-realtime
```

---

## 5. 关键设计决策

### 5.1 为什么 fear/sadness 不由引擎控制？

人文站的 fear/sadness 由疑问解答质量和冲击性消息驱动，变化模式不可预测——一次"病危通知"应让fear从3跳到8，引擎的maxRise会阻止这种跳跃。所以fear/sadness从constrainDrop中移除，LLM完全自主。

### 5.2 为什么 anger 仍由引擎控制？

人文站有信任基础，anger不应剧烈波动。即使学生态度不好，SP也不会像接诊站那样暴怒。maxRise.anger=1.0确保anger缓慢累积。

### 5.3 为什么需要 emotionFloor？

LLM（qwen-plus）偶尔会输出全0情绪值（即使text写了"腿都软了""不可能"）。emotionFloor是代码级安全网——人文站fear/sadness最低3，确保"永远有基础担忧"的底线。

### 5.4 为什么 va/vs 由策略表硬覆盖？

LLM偶尔会输出不匹配的video_action/voice_style（如text悲伤但voice=normal）。策略表是经过人工设计的权威映射，人文站非calm状态下直接覆盖LLM选择。

---

## 6. 文件索引

| 文件 | 职责 |
|------|------|
| `packages/shared/src/emotion-engine.js` | 引擎核心：setAbsolute刹车、constrainDrop、emotionFloor |
| `packages/shared/src/emotion-state-machine.js` | 状态判定 + 策略表 + OUTPUT_SCHEMA |
| `packages/shared/src/intent-classifier.js` | 规则库兜底修正LLM意图 |
| `services/sp-api/src/session-store.js` | 场景参数差异化 (detectScene) |
| `services/sp-api/src/index.js` | API编排：va/vs硬覆盖、触发词检测、重复检测 |
| `services/sp-api/src/prompt-builder.js` | 提示词组装 |
| `services/sp-api/src/triggers.js` | B/B+/A触发词定义 |
| `services/ai-generator/prompts/06-aisp/0601-sp-system.txt` | Base prompt（通用） |
| `services/ai-generator/prompts/06-aisp/0604-humanity-chat.txt` | 人文站专属提示词 |
| `apps/training/src/composables/useTTS.js` | TTS语音指令映射 |
| `apps/training/src/views/humanistic-comm/HumanisticComm.vue` | 人文站前端：素材规则、心理阶段 |
