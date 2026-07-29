# 人文沟通站提示词全面审查报告

> 2026-06-16 | 审查范围：全部6层提示词系统

---

## 一、架构总览

```
层1: 0601-sp-system.txt       ← Base Prompt（接诊站+人文站共用）
层2: 0604-humanity-chat.txt   ← 人文站覆盖规则 H0-H6
层3: emotion-state-machine.js ← 运行时策略指令（状态机 getContext()）
层4: prompt-builder.js        ← 触发词硬提醒注入（B/B+/A/多问/家属预后）
层5: emotion-engine.js        ← 引擎刹车（constrainDrop/emotionFloor）
层6: index.js                 ← API编排 + va/vs硬覆盖
```

---

## 二、发现的问题

### 🔴 严重问题

#### 1. Base Prompt 规则1（"问什么答什么"）与 H2（"疑问驱动对话"）根本冲突

**涉及文件**：`0601-sp-system.txt:22` vs `0604-humanity-chat.txt:44`

```
Base: "学生问什么就答什么，没问的不说" ← SP 是被动回答者
 H2: "从第1个疑问开始，逐一推进"     ← SP 是主动提问者
```

Base Prompt 规则1标注为**"最高优先级"**，H 规则也声称"优先级高于 base prompt"。LLM 同时看到两条互相矛盾的最高优先级指令时会困惑：到底是等学生问还是自己主动提疑问？

**建议**：在人文站模式下，`prompt-builder.js` 应将 base prompt 中规则1的"最高优先级"标记替换或删除，明确 SP 在人文站是主动提问方。

---

#### 2. H3 情绪值指导与引擎 floor 钳位的信息冲突

**涉及文件**：`0604-humanity-chat.txt:69` vs `emotion-engine.js:336`

H3 告诉 LLM：
> "系统不会替你累加——你说多少就是多少"

但实际上引擎的 floor 钳位强制 `fear≥3, sadness≥3`。如果 LLM 想表达"现在很平静"输出 `fear=0`，引擎会强制设为3。

这种矛盾会导致：
- LLM 看到前一轮 fear 被设为3 而不是它输出的0，误认为"系统在替我累加"
- LLM 可能进一步压低输出值以"对冲"它以为的系统累加
- LLM 失去对情绪值的控制感

**建议**：在 H3 中明确告知 LLM：人文站的 fear/sadness 有基础底线（3分），这是场景固有的担忧底色，不要输出低于3的值。

---

#### 3. intent-classifier.js 未适配人文站 H1 意图重定义

**涉及文件**：`intent-classifier.js` vs `0604-humanity-chat.txt H1`

H1 将人文站的 `offensive` 重新定义为：
- "学生回避你的疑问、态度敷衍、轻视你的担忧"
- **"转而大量反问医学问题（把沟通拉回问诊模式）"**

但 `intent-classifier.js` 的规则库仍使用接诊站定义（催促/轻视/挑衅/冷漠）。学生大量追问病史的行为（如"你之前查过什么""症状什么时候开始的"）在接诊站是 `neutral`，**在人文站应判 `offensive`**，但规则库完全无法识别。

**建议**：为 `correctIntent()` 增加 `mode` 参数，人文站模式下增加病史回拉检测规则（连续≥2轮纯医学提问 → offensive）。

---

### 🟡 中等问题

#### 4. 状态机策略表未区分接诊站/人文站

**涉及文件**：`emotion-state-machine.js`（180条策略）

策略表（4性格 × 9状态 × 5意图）在两种站中完全共用。但 H4 明确说人文站：
- "容忍度更高——不会因为一句不耐烦就暴怒"
- "好的沟通有正面反馈"
- "信任是渐进的"

当前策略表中 `irritated` 状态的 `offensive` 响应示例：

| 性格 | tx 指令 | dl |
|------|---------|-----|
| 火爆型 | "不耐烦直接催促，语气硬" | `[1.5, 2.5]` |
| 普通型 | "不耐烦催促，语气更硬" | `[1, 2]` |
| 偏内敛 | "语气更冷，回答缩到极限" | `[0.5, 1.5]` |
| 隐忍型 | "语气不变但回答更短" | `[0.5, 1]` |

这些在接诊站合理（初次就诊被冒犯），但在人文站中——医生只是回避了一个疑问就用这种级别对抗，与 H4 矛盾。

**建议**：策略表增加 `scene` 维度，人文站场景下降低 `offensive` 响应的攻击性，或增加 `getContext()` 的 mode 参数以输出不同的策略指令。

---

#### 5. 多问触发词指令在人文站下语义错误

**涉及文件**：`prompt-builder.js:176-180`

当前多问检测告诉 SP：
> "你只听清了第一个问题，只回答第一个问题"

这在接诊站正确（SP 是被问方）。但在人文站，**SP 是提问方**，学生才是回答方。学生一口气问多个问题，SP 不应该"回答"，而应该表达困惑并继续推进自己的疑问。

**建议**：人文站模式下替换为：
> "学生一口气问了多个问题。你作为提问方，告诉对方一个一个来，然后继续你的疑问。"

---

#### 6. 心理阶段信息只有展示没有行为指令

**涉及文件**：`prompt-builder.js:103-111`

注入的心理阶段文本：
```
## 当前心理阶段
- 阶段1(困惑)：对病情不了解，想知道真相
- 阶段2(恐惧)：被病情严重性吓到
```

但**没有任何指令**告诉 LLM：
- 当前处于哪个阶段？
- 什么时候应该切换阶段？
- 不同阶段的行为差异是什么？

**建议**：增加心理阶段使用指令，例如：
> "你当前处于阶段X（[情绪]），你的疑问和情绪应符合该阶段的认知状态。当你的核心疑问得到充分解答后，自然过渡到下一阶段。你可以主动标记阶段推进。"

---

#### 7. H6 "2轮平复"与引擎 angerMaxDrop 数值不一致

**涉及文件**：`0604-humanity-chat.txt:113` vs `emotion-engine.js:308`

H6 说：
> "至少需要2轮真诚共情/安抚/道歉才能平复"

但引擎中 anger 每轮最多降 **0.5**（非 deepReassure），2轮最多降 1.0。即使触发 deepReassure，每轮最多降 2.0。

实际效果：
- anger=5（angry）→ 非 deepReassure 需要 **10轮** 才能降到 irritated
- anger=5（angry）→ deepReassure × 2轮 = 降 4.0，到 anger=1，可接受
- anger=9（furious）→ 即使 deepReassure × 2轮 = 降 4.0，到 anger=5（仍 angry）

H6 说的"2轮"在非 deepReassure 路径下完全不成立。

**建议**：H6 改写为"需要学生持续的真诚共情/安抚/道歉才能逐步平复"，去掉"2轮"的硬承诺。

---

### 🟢 轻微问题

#### 8. H1 意图优先级缺少"病史回拉"的显式量化标准

H1 定义 offensive 包含"转而大量反问医学问题"，但 H5 又说"学生偶尔问你病史……这是合理的"。

LLM 需自行判断"合理背景了解" vs "拉回问诊模式"的边界，当前无量化标准。

**建议**：增加阈值描述——"连续2轮以上纯病史追问且不回应你的疑问 → offensive"。

---

#### 9. H0 角色预期与 base prompt 的 `{{role_description}}` 可能不一致

H0 声明"已接受过基础治疗，对医生有信任基础"，但 `{{role_description}}` 来自病例 JSON，可能仍描写"初次就诊"场景。两者不一致时 LLM 会困惑。

**建议**：确保病例数据中人文沟通的 `role_description` 明确体现"已有医患关系基础"的语境。

---

#### 10. 缺少"对话结束"指令

所有疑问被解答后，SP 应如何结束对话？当前只有一句：
> "所有疑问解答完毕后：对整体沟通做出自然反应"

太模糊，LLM 可能在所有疑问解答后仍继续循环。

**建议**：增加明确的结束行为描述，如"所有疑问得到充分解答后，做一次总结性评价，然后自然收尾（感谢/表达满意或失望），下一条回复可留空或表示对话可以结束。"

---

#### 11. 震惊反应情绪值可能被 floor 钳位掩盖

H3 指导 LLM 在震惊时输出 `fear 8+, sadness 7+`。如果 LLM 输出 fear=8 但 sadness=2，floor 只钳位 sadness 到 3，仍远低于 H3 要求的 7+。LLM 的 text/sadness 不一致不会被修正。

**建议**：在 H3 中强调"text 中写了崩溃/震惊，四个 emotion 维度都必须相应高涨，缺一不可"。

---

#### 12. Base prompt intent 决策树与 H1 重复定义

Base prompt（第 111-173 行）有详细的 5 级意图决策树含具体 trigger word，H1 又给出简化重定义。两个版本并存——虽然 H1 声称"以本节为准"，但 LLM 更可能遵循有具体词汇列表的 base prompt 版本。

**建议**：在 H1 开头明确声明"以下定义完全覆盖 base prompt 中的意图决策树，人文站不使用 base prompt 的意图定义"。

---

## 三、逐文件点评

| 文件 | 状态 | 主要问题 |
|------|------|---------|
| `0601-sp-system.txt` | ⚠️ 需调整 | 规则1与人文站冲突（#1）；intent树与H1重复（#12） |
| `0604-humanity-chat.txt` | ✅ 总体良好 | H3与floor冲突（#2）；H6数值不准确（#7）；缺少结束指令（#10） |
| `emotion-state-machine.js` | ⚠️ 需适配 | 策略表未区分场景（#4） |
| `emotion-engine.js` | ✅ 设计合理 | constrainDrop分离设计正确 |
| `prompt-builder.js` | ⚠️ 需修正 | 多问触发指令语义错误（#5）；心理阶段缺行为指令（#6） |
| `session-store.js` | ✅ 设计合理 | constrainDrop=['anger']正确 |
| `triggers.js` | ✅ 正确 | 无场景差异问题 |
| `intent-classifier.js` | ⚠️ 需适配 | 未根据mode区分人文站意图（#3） |
| `index.js` | ✅ 编排正确 | va/vs硬覆盖逻辑正确 |

---

## 四、优先修复建议

| 优先级 | # | 问题 | 需改文件 |
|--------|---|------|---------|
| **P0** | 1 | Base Prompt 规则1与 H2 角色冲突 | `prompt-builder.js`（替换规则1） |
| **P0** | 5 | 多问触发词在人文站语义错误 | `prompt-builder.js`（区分mode） |
| **P1** | 2 | H3 与 emotionFloor 信息冲突 | `0604-humanity-chat.txt`（告知floor） |
| **P1** | 3 | intent-classifier 未适配 | `intent-classifier.js`（增加mode参数） |
| **P2** | 6 | 心理阶段缺行为指令 | `prompt-builder.js`（增加使用说明） |
| **P2** | 7 | H6 "2轮平复"数值不准确 | `0604-humanity-chat.txt`（修正措辞） |
| **P3** | 4 | 策略表未区分场景 | `emotion-state-machine.js`（增加mode维度） |
| **P3** | 10 | 缺少对话结束指令 | `0604-humanity-chat.txt` |
| **P3** | 11 | 震惊情绪值缺完整性约束 | `0604-humanity-chat.txt` |
| **P3** | 12 | H1 覆盖声明不够强 | `0604-humanity-chat.txt` |
| **P4** | 8 | 病史回拉缺量化标准 | `0604-humanity-chat.txt` |
| **P4** | 9 | role_description 一致性 | 病例数据 / `prompt-builder.js` |

---

## 五、涉及文件路径汇总

```
services/ai-generator/prompts/06-aisp/0601-sp-system.txt
services/ai-generator/prompts/06-aisp/0604-humanity-chat.txt
services/sp-api/src/prompt-builder.js
services/sp-api/src/index.js
services/sp-api/src/session-store.js
services/sp-api/src/triggers.js
packages/shared/src/emotion-engine.js
packages/shared/src/emotion-state-machine.js
packages/shared/src/intent-classifier.js
```
