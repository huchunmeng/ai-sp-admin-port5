# AI-SP 情绪系统 v6.0 设计

> ⚠️ **此设计未实施，已被 v7 极简设计替代。** 详见 `aisp-emotion-system-v7-design.md`
> v6 的 6 情绪 + 2 调制 + 2 关系架构在实施前被简化为 v7 的 4 数值方案。
>
> 状态: 设计完成（未实施）| 日期: 2026-06-12

---

## 一、架构总览

### 1.1 四层模型

```
┌────────────────────────────────────────────────────────────┐
│              LLM + 策略知识库                                │
│              前线演员 · 自主决策                              │
│  输入: 对话历史 + 上一轮状态 + 当前学生输入 + 策略条目         │
│  输出: 回复文本 + 定性判断 + TTS/视频指令                     │
├────────────────────────────────────────────────────────────┤
│  状态机 (State Machine)         │  情绪引擎 (Emotion Engine)  │
│  导演 · 行为阶段管理             │  物理引擎 · 数值计算        │
│  决定状态迁移条件               │  惯性 · 衰减 · 冷却 · 保底   │
│  不干预 LLM 表演                │  不干预 LLM 表演            │
└────────────────────────────────────────────────────────────┘
```

### 1.2 核心原则

| 原则 | 说明 |
|------|------|
| **LLM 是主力** | LLM + 策略库即时做出反应，引擎和状态机提供持续的、连贯的变化机制 |
| **用户感知的是状态变化** | 不是情绪数值波动，而是回应策略的变化 |
| **LLM 出定性，引擎做定量** | LLM 不输出数值，输出分类标签，引擎查表计算 |
| **状态滞后是真实的** | 第一反应基于上一轮状态，本轮结束才迁移 |
| **状态机退位为裁判** | LLM 自己决定怎么演，状态机只管"该不该换状态" |
| **不判断医疗对错** | LLM 只判断输入与病情是否相关，不判断医疗建议是否合理 |
| **假设所有输入都是认真的** | 不区分学生是否在玩闹，按当前状态策略认真回应 |

### 1.3 每轮调用链

```
学生输入
  → 空输入拦截 (前端 + API 双重)
  → LLM (对话历史 + 上一轮状态 + 当前输入 + 策略条目)
     输出: { text, intent, impact_level, affected_emotions, tts, video }
  → 情绪引擎: 定性判断 → 定量变化（加惯性/衰减/封顶）
  → 状态机: 新向量 + intent → 判定状态是否迁移
  → 下一轮 LLM 拿到新状态 + 新策略条目
```

### 1.4 输入来源与保护

#### 打字
```
空/纯空格 → 发送按钮 disabled → 不触发
API 层 text?.trim() 为空 → 400 → 不发给 LLM
```

#### ASR (语音转文字)
```
ASR 只负责出文本+置信度，不做分类判断:
  { text: "识别文本", confidence: 0.0-1.0 }

VAD: 没语音 → ASR 不触发 → 不进对话流程
     有语音 → 必出文本 → 进对话流程

LLM 判断:
  confidence ≥ 0.5, text 通顺 → 正常处理
  confidence < 0.5, text 乱码 → noise，结合上下文判断
```

---

## 二、情绪层 (Emotion)

### 2.1 六种基本情绪 (引擎计算, 0-10)

| 情绪 | 触发源 | 消退特点 |
|------|--------|---------|
| **anger** (怒) | 被攻击、被否定、被阻碍、被轻视 | 需道歉或长时间冷静，不自然消失 |
| **fear** (惧) | 威胁、未知、失控、疾病联想 | 需安抚，可被relief驱散 |
| **sadness** (哀) | 丧失感、无力感、不被理解、坏消息 | 需共情和陪伴 |
| **joy** (喜) | 被尊重、被理解、好消息、有效治疗 | 维持，不自然衰减 |
| **surprise** (惊) | 意外信息、突发事件 | 快速衰减，确认事件性质后分流 |
| **disgust** (恶) | 被严重冒犯、性骚扰、行为令人反感 | 消退最慢，对rapport永久伤害 |

### 2.2 surprise 的特殊作用

**惊是情绪的入口放大器：**

```
正向惊(惊喜):
  mild_surprise → joy 跟上
  delighted     → joy 大幅上升, 驱散 fear

负向惊(惊吓):
  startled → fear/anger 跟上, 后续情绪 delta×1.3
  shocked  → fear/anger 跟上, 后续情绪 delta×1.5

意外坏消息 → 惊(瞬间) → fear + sadness (主导)
性骚扰     → 惊(瞬间) → disgust + anger (主导)

确认事件性质后惊快速消退，不会"困在惊状态里"
```

### 2.3 LLM 输出定性判断

```json
{
  "text": "SP回复内容",
  "intent": "attack | offensive | friendly | neutral | noise",
  "impact_level": "low | medium | high | extreme",
  "affected_emotions": ["anger", "fear"],
  "tts": { "emotion_state": "angry", "note": "语气尖锐，短句，音量升高" },
  "video": { "action_group": "angry", "note": "怒视对方、手势变大" }
}
```

### 2.4 引擎查表计算

| impact_level | anger | fear | sadness | joy | surprise | disgust |
|-------------|-------|------|---------|-----|----------|---------|
| low | +0.3~0.8 | +0.2~0.5 | +0.2~0.5 | +0.2~0.5 | +0.3~0.8 | +0.2~0.5 |
| medium | +0.8~1.5 | +0.5~1.0 | +0.5~1.0 | +0.5~1.0 | +0.5~1.0 | +0.5~1.0 |
| high | +1.5~3.0 | +1.0~2.0 | +1.0~2.0 | +1.0~2.0 | +1.0~1.5 | +1.0~2.0 |
| extreme | +3.0~5.0 | +2.0~3.5 | +2.0~3.5 | +2.0~3.0 | +1.5~2.5 | +2.0~3.0 |

**实际变化 = base_delta × state_modulator × personality_modulator**

- state_modulator: anxiety放大 / pain降容忍 / surprise放大后续情绪
- personality_modulator: 高敏感×1.3 / 钝感×0.7

### 2.5 物理约束

```
峰值衰减限速 — 不会瞬变
情绪封顶冷却 — 触及 10.0 后 3 轮内 maxDown ≤ 1.0
保底余温 — 冷却期内情绪 ≥ 2.0，不能一道歉就清零
情绪消退速率 — 各情绪不同:
  anger: 不快消, 需道歉
  fear: 需安抚或relief驱散
  sadness: 需共情
  disgust: 消退最慢, 对rapport伤害不可全恢复
```

---

## 三、关系层 (Relation)

### 3.1 trust / rapport (引擎计算, 0-5)

| 变量 | 含义 | 建立方式 | 破坏方式 |
|------|------|---------|---------|
| **trust** | 对医生专业能力的信任 | 持续专业提问(neutral累积)、friendly | attack 破坏最严重 |
| **rapport** | 情感连接/亲近感 | friendly | attack 破坏最严重，disgust 伤害不可全恢复 |

### 3.2 两者分离的价值

```
高trust + 低rapport: "水平可以，但态度很冷" → 回答准确但简短
低trust + 高rapport: "人挺好，但不太信你的诊断" → 话多但反复质疑
```

### 3.3 trust 的行为影响

```
trust ≥ 4: 配合度高，即使不满也委婉表达
trust 2-4: 正常
trust ≤ 2: wariness 自动激活
trust ≤ 1.5: trust_broken 终止
```

---

## 四、意图类型 (Intent)

### 4.1 LLM 两步判断法

```
步骤1: 跟治病有关系吗？
  是 → neutral（不管建议是否合理，不判断医疗对错）
  否 → 步骤2

步骤2: 什么性质？
  攻击/辱骂/性骚扰 → attack
  敷衍/催促/冤枉/闲扯/无关话题 → offensive
  道歉/安抚/示好 → friendly
  乱码/无意义字符 → noise
```

**attack 看的是态度，不是内容。** 一句话里既有骂人又有正经提问 → attack。SP 听到的是情绪，情绪反应先于内容理解。

### 4.2 五种意图

| intent | 引擎行为 | 状态机行为 | 典型输入 |
|--------|---------|-----------|---------|
| **attack** | 连攻+1, trust-0.3, rapport-0.5 | strikeCount++ | "你有病吧""庸医""你长得好漂亮" |
| **offensive** | trust-0.1, rapport-0.2 | 无(累积到烦躁) | "哦""嗯""快点说""你装的吧" |
| **friendly** | 连攻归零, trust+0.2, rapport+0.3 | strikeCount归零 | "对不起""我理解你""别紧张" |
| **neutral** | trust+0.03 | 无 | 正常医学提问 |
| **noise** | stagnation+1 | 无 | "asdf""。。。。" ASR低置信度乱码 |

### 4.3 边界处理

```
不确定是否存在恶意 → offensive（宁放过，不错杀）
性骚扰/严重冒犯    → attack
闲扯/无关话题      → offensive
ASR低置信度       → noise
攻击为主的混输     → attack（态度优先于内容）
```

### 4.4 不存在的意图

```
neglect (漠视/沉默) — 文本对话不存在，不打字不触发
greeting — 并入 neutral
```

---

## 五、调制状态 (Modulation State)

### 5.1 两个持续性 debuff（不分进入/退出）

**它们是底色，不是事件触发。**

### anxiety (焦虑)，三级

| 等级 | 阈值 | 情绪上升速率 | 情绪消退速率 | anger/fear阈值偏移 | 输出特征 |
|------|------|------------|------------|------------------|---------|
| L1 | ≥ 2 | ×1.2 | ×0.9 | 0 | 语气稍紧张，表达完整 |
| L2 | ≥ 5 | ×1.5 | ×0.7 | -1.0 | 语句急促、反复确认 |
| L3 | ≥ 7.5 | ×2.0 | ×0.5 | -2.0 | 坐立不安、难以聚焦 |

### pain (疼痛)，三级

| 等级 | 阈值 | anger阈值偏移 | calm上限 | 输出特征 |
|------|------|------------|---------|---------|
| L1 | ≥ 3 | 0 | -1.0 | 偶尔提及不适，大体配合 |
| L2 | ≥ 5 | -2.0 | -2.0 | 声音虚弱、不耐烦 |
| L3 | ≥ 7.5 | -3.0 | -3.0 | 说不出完整句、呻吟、relief失效 |

### 5.3 调制状态互作用

```
叠加:
anxiety + pain → 激惹度翻倍，冷静被双重压制
anxiety + fear → fear 阈值-1/每anxiety等级

驱散:
calm_L2+ → anxiety 衰减加速 (×2)
relief → fear 强制降级

压制:
pain_L2+ → calm 上限降低
pain_L3 → relief 效果失效
anxiety_L3 → 冷静衰减加速
```

---

## 六、行为状态 (Behavioral State)

状态机管理。LLM 的决策依据，决定选取哪组策略。

### 6.1 愤怒线 (5个)

| 状态 | 进入条件 | 退出条件 |
|------|---------|---------|
| **irritated** | anger ≥ 1.5 + expr_offset | anger < 1.5 或 道歉→wariness |
| **annoyed** | anger ≥ 3.5 + expr_offset | anger < 3.5 |
| **angry** | anger ≥ 6.0 + expr_offset | anger < 6.0 或 道歉→wariness |
| **furious** | 路径A: LLM冲击(attack+high↑) 路径B: anger≥9.0+已连攻 | 冷却3轮→post_furious |
| **post_furious** | furious冷却结束 | 连续2轮友善→wariness/calm; attack→回furious |

### 6.2 恐惧线 (4个)

| 状态 | 进入条件 | 退出条件 |
|------|---------|---------|
| **uneasy** | fear ≥ 2.0 + expr_offset | fear < 2.0 |
| **fearful** | fear ≥ 4.0 + expr_offset | fear < 4.0 或 relief驱散 |
| **very_fearful** | fear ≥ 6.5 + expr_offset | fear < 6.5 |
| **shut_down** | fear ≥ 9.0 + expr_offset 且 anxiety ≥ 8.0 | 冷却2轮→very_fearful |

### 6.3 悲伤线 (3个)

| 状态 | 进入条件 | 退出条件 |
|------|---------|---------|
| **down** | sadness ≥ 2.0 + expr_offset | sadness < 2.0 |
| **sad** | sadness ≥ 4.5 + expr_offset | sadness < 4.5 |
| **broken** | sadness ≥ 7.0 + expr_offset | 冷却3轮→sad 或 共情→down |

### 6.4 喜悦线 (2个)

| 状态 | 进入条件 | 退出条件 |
|------|---------|---------|
| **pleased** | joy ≥ 3.0 | joy < 3.0 |
| **grateful** | joy ≥ 6.0 | joy < 6.0 |

### 6.5 惊线 (2个, 瞬时)

| 状态 | 进入条件 | 退出条件 |
|------|---------|---------|
| **surprised** | LLM判断+surprise≥4.0 | 事件确认后快速消退,1-2轮 |
| **shocked** | LLM判断+surprise≥7.0 | 事件确认后消退,2-3轮 |

### 6.6 恶线 (2个, 消退最慢)

| 状态 | 进入条件 | 退出条件 |
|------|---------|---------|
| **disgusted** | disgust ≥ 4.0 | 非常缓慢, 需多轮友善+boundary建立 |
| **contempt** | disgust ≥ 7.0 | 极慢, rapport恢复有上限 |

### 6.7 非情绪行为状态

| 状态 | 进入 | 行为 | 退出 |
|------|------|------|------|
| **wariness** | angry状态+friendly输入 | 配合但有距离感, 防御解读中性语句 | 连续N轮无attack→calm(anger归零); attack→回angry |

### 6.8 状态迁移图

```
愤怒线:
calm → irritated → annoyed → angry → furious → post_furious
                                              ↑        │
                                    attack←───┘   friendly×2→ wariness → calm

恐惧线:
calm → uneasy → fearful → very_fearful → shut_down
                         ↑
                    relief驱散 ↓
                         calm

悲伤线:
calm → down → sad → broken → (共情)→ down

恶线:
calm → disgusted → contempt
        ↑            ↑
        └── 消退极慢 ──┘

喜悦线:
calm → pleased → grateful

惊线 (瞬时):
calm → surprised/shocked → (分流到anger/fear/joy/sadness)
```

---

## 七、策略知识库 (Strategy KB)

### 7.1 设计原则

- 按**当前状态**组织，每个状态下来按意图类型展开
- 只将当前状态的策略条目放入 system prompt（不是全文）
- LLM 根据意图类型选取对应策略，自己决定回应风格
- 每条简洁，2-3 句
- 同一行为在不同状态下的容忍度不同，策略自然体现

### 7.2 策略条目格式

```
[状态-意图] 回应方向 | 语气 | 情绪走向 | 状态变化
```

### 7.3 状态容忍度差异示例

同一行为(被问头晕，但病是肚子疼)，不同状态回应完全不同：

```
[calm-neutral]       "我是肚子疼，不过偶尔会有点晕" — 配合
[irritated-neutral]  "我肚子疼，你问头晕干啥…你先帮我看看肚子行不"
[angry-neutral]      "你到底有没有在听！我肚子疼你老问头晕！"
[wariness-neutral]   "……你先看肚子的事行吗" — 有戒心
```

### 7.4 策略条目示例

#### [calm]

```
[calm-neutral]    正常配合，完整回答。情绪无变化。
[calm-attack]     先困惑，"你说什么？"，anger↑→irritated。
[calm-offensive]  轻微不快先忍。anger微升。
[calm-friendly]   礼貌回应。无显著变化。
[calm-noise]      困惑，"你说什么？我没听清"。
```

#### [angry]

```
[angry-attack]    对等反击，以牙还牙。anger↑→furious(若连续)。
[angry-offensive] 质问，"你到底有没有在听"。anger维持。
[angry-friendly]  态度松动但不立刻原谅，"…现在知道道歉了"。→wariness。
[angry-neutral]   不耐烦，"这跟我的病有关系吗？"。缓慢衰减。
[angry-noise]     无视。stagnation+1。
```

#### [post_furious]

```
[post_furious-friendly] 态度松动但语气仍冷。需持续友善。→wariness(第2轮)。
[post_furious-attack]   重返暴怒，比之前更激烈。→furious。
[post_furious-offensive] 冷漠，"你到底想说什么"。keep。
[post_furious-neutral]  冷漠，简短，不主动给信息。keep。
```

#### [wariness]

```
[wariness-neutral]   配合但有距离感。计数+1。
[wariness-friendly]  渐渐软化，不完全信任。计数+1。
[wariness-attack]    信任彻底破裂。→angry，比之前更激烈。
[wariness-offensive] 解读为冷淡，更警惕。计数归零。
```

#### [disgusted]

```
[disgusted-neutral]  冷淡配合，"你问你的"。保持距离。
[disgusted-friendly] "嗯我知道了"——表面接受但内心排斥不变。
[disgusted-attack]   厌恶+愤怒叠加，极烈反击。
```

### 7.5 规模估算

```
17个行为状态 × ~5条策略/状态 ≈ 85条
+ 质变组合 ≈ 10条
总计 ≈ 95条

当前状态放入prompt ≈ 5条 × 50字 = 250字 ≈ 80 tokens
```

---

## 八、状态机 (State Machine)

### 8.1 职责

| 职责 | 说明 |
|------|------|
| **状态入口 — 路径A** | 冲击事件：LLM 直接判定（attack + high/extreme → 直接进 furious） |
| **状态入口 — 路径B** | 累积侵蚀：引擎数值跨过阈值 → 状态机判定迁移 |
| **状态出口** | 全部由状态机管理（冷却/计数/条件自动解除） |
| **终止判定** | 投诉/崩溃/信任破裂 |

### 8.2 wariness 退出示例

```
wariness 第1轮: intent=friendly → 计数器=1, 软化
wariness 第2轮: intent=neutral  → 计数器=2, 配合但有距离
wariness 第3轮: intent=neutral  → 计数器=3 ≥ 阈值
                                → 状态机解除 wariness → calm
如果: intent=attack → 退出 wariness → angry（比之前更激烈）
如果: intent=offensive → 解读为冷淡，计数器归零
```

---

## 九、性格系统 (Personality)

### 9.1 三维度

| 维度 | 可选值 | 影响 |
|------|--------|------|
| **expressiveness** | 火爆型/普通型/偏内敛/隐忍型 | 情绪阈值偏移 + 峰值持续时长 |
| **sensitivity** | 高敏感/普通敏感度/钝感 | 定性→定量转换系数(×1.3/×1.0/×0.7) |
| **resilience** | 高豁达/普通恢复力/低豁达 | 状态消退速度(×1.5/×1.0/×0.6) |

### 9.2 推导

```
主路径: 病例元数据直接定义
回退路径: 关键词推导（存量兼容）
```

---

## 十、终止机制

### 10.1 五条路径

| 路径 | 触发 | 判定 |
|------|------|------|
| complaint | strikeCount ≥ max(1, 3-patienceExhausted) | 状态机 |
| angry_collapse | angry≥阈值持续N轮 | 引擎计时+状态机 |
| fear_collapse | fear≥阈值持续N轮 | 引擎计时+状态机 |
| sadness_collapse | sadness≥阈值持续N轮 | 引擎计时+状态机 |
| trust_broken | trust ≤ 1.5 | 引擎实时+状态机 |

### 10.2 强制中止开关

- 默认关闭
- 管理端可切换
- 关闭时：状态机仍计算但不实际终止

---

## 十一、TTS / 视频指令

LLM 在输出中直接标注，引擎不反推：

```json
{
  "tts": { "emotion_state": "angry", "note": "语气尖锐，短句，音量升高" },
  "video": { "action_group": "angry", "note": "怒视对方、手势变大" }
}
```

---

## 十二、计数器总表

| 计数器 | 作用 | 递增 | 归零 |
|--------|------|------|------|
| strikeCount | 投诉三振 | attack | friendly归零, patienceExhausted+1 |
| patienceExhausted | 降低后续容忍度 | friendly归零时若strikeCount>0 | reset |
| consecutiveNegative | 连攻加成 | attack | friendly |
| consecutiveReassuring | 连抚加成 | friendly | 非friendly |
| peakCooldown[dim] | 封顶冷却 | 情绪达10.0 | 每轮-1至0 |
| postPeakGoodTurns | 峰值后友善计数 | friendly/善意neutral | attack |
| stagnationCounter | 无意义输入追踪 | noise | 正常输入-1 |

---

## 十三、阈值总表

| 阈值 | 值 | 用途 |
|------|-----|------|
| anger → irritated | 1.5 + expr_offset | 行为状态 |
| anger → annoyed | 3.5 + expr_offset | 行为状态 |
| anger → angry | 6.0 + expr_offset | 行为状态 |
| anger → furious | 9.0 + expr_offset | 行为状态 |
| fear → uneasy | 2.0 + expr_offset | 行为状态 |
| fear → fearful | 4.0 + expr_offset | 行为状态 |
| fear → very_fearful | 6.5 + expr_offset | 行为状态 |
| fear → shut_down | 9.0 + expr_offset 且 anxiety≥8.0 | 行为状态 |
| sadness → down | 2.0 + expr_offset | 行为状态 |
| sadness → sad | 4.5 + expr_offset | 行为状态 |
| sadness → broken | 7.0 + expr_offset | 行为状态 |
| joy → pleased | 3.0 | 行为状态 |
| joy → grateful | 6.0 | 行为状态 |
| surprise → surprised | 4.0 | 行为状态 |
| surprise → shocked | 7.0 | 行为状态 |
| disgust → disgusted | 4.0 | 行为状态 |
| disgust → contempt | 7.0 | 行为状态 |
| anxiety L2 | 5.0 | 调制 |
| anxiety L3 | 7.5 | 调制 |
| pain L2 | 5.0 | 调制 |
| pain L3 | 7.5 | 调制 |
| trust → wariness | ≤ 2.0 | 关系 |
| trust → trust_broken | ≤ 1.5 | 终止 |
| intent → 封顶冷却触发 | 对应情绪≥10.0 | peakCooldown=3 |
| peakCooldown限速 | > 0 | maxDown≤1.0, 保底≥2.0 |

---

## 十四、intent → 数值变化映射

| intent | anger | fear | sadness | disgust | trust | rapport | strike | 连攻 |
|--------|-------|------|---------|---------|-------|---------|--------|------|
| attack | ↑↑ | ↑(性骚扰/威胁) | — | ↑(性骚扰/冒犯) | -0.3 | -0.5 | +1 | +1 |
| offensive | ↑(累积) | — | — | — | -0.1 | -0.2 | — | — |
| friendly | ↓ | ↓ | ↓ | ↓(慢) | +0.2 | +0.3 | 归零 | 归零 |
| neutral | — | — | — | — | +0.03 | — | — | — |
| noise | — | — | — | — | — | — | — | —(+stagnation) |

---

## 十五、与 v5.0 关键差异

| 维度 | v5.0 | v6.0 |
|------|------|------|
| 情绪维度 | 9维混搭 | 6情绪 + 2调制 + 2关系，概念独立 |
| 行为状态 | 10个 | 17个(6线全覆盖) |
| LLM输出 | 直接出数值 | 出定性标签(5 intent + impact_level) |
| 策略来源 | 引擎硬编码指令 | LLM从策略库按状态选取 |
| 策略入prompt | 每状态大段指令 | 仅当前状态(~250字) |
| 状态机角色 | 导演 | 裁判 |
| 状态入口 | 引擎阈值单一 | 双路径(LLM冲击 + 状态机累积) |
| 意图分类 | intent(7种)含非文本行为 | intent(5种)，两步法，只含文本行为 |
| 惊/恶/喜 | 无独立状态 | 各有独立行为状态 |
| TTS/视频 | 引擎反推 | LLM直接输出 |
| 输入来源 | 仅打字 | 打字 + ASR |
| 空输入 | 无保护 | 前端 + API 双重拦截 |

---

## 十六、实施优先级

| 优先级 | 内容 |
|--------|------|
| **P0** | LLM定性输出(5 intent) → 引擎定量转换 |
| **P0** | 两步意图判断法(相关性 + 态度) |
| **P0** | 6情绪 + 2调制 + 2关系分拆 |
| **P1** | 策略知识库建设 (~95条) |
| **P1** | 行为状态从10个扩展到17个 |
| **P1** | 空输入双重拦截 |
| **P2** | 状态双路径入口 |
| **P2** | wariness + 观察退出 |
| **P2** | surprise 的放大器机制 |
| **P2** | disgust 消退最慢机制 |
| **P3** | joy/surprise/disgust 策略条目完善 |
| **P3** | TTS/视频由LLM直接输出 |
