# SP API 提示词调用说明

## 架构概览

```
apps/training/src/composables/useAISP.js   ← 前端入口（无提示词内容）
        │  POST /api/sp/chat
        ▼
services/sp-api/src/index.js               ← 路由 + 编排层（提示词组装入口）
        │
        ├── prompt-builder.js               ← ★ 核心构建器
        │   ├── loadPromptFile() → 加载模板文件
        │   └── buildSystemPrompt() → 组装最终提示词
        │
        ├── poc/personality-prompts.js      ← 性格片段（知觉脑 + 反思脑）
        ├── poc/gear-system.js              ← 11档位 → 行为策略 + 视听通道映射
        ├── poc/reflection-brain-prompt.txt ← 反思脑事件提取器提示词
        ├── poc/reflection-worker-poc.js    ← 反思脑 LLM 调用封装
        ├── triggers.js                     ← A/B/B+ 触发词检测
        └── ...
```

---

## 两大脑说明

| 脑 | 模型 | 调用时机 | 提示词来源 |
|----|------|----------|-----------|
| **知觉脑** | qwen-turbo（建议） | 每轮对话同步调用 | `prompt-builder.js` 组装 |
| **反思脑** | qwen-plus | 每轮对话**后**异步分析 | `reflection-brain-prompt.txt` + 性格片段 |

---

## 调用链路

### 1. 接诊站对话（history-taking）

```
index.js:155 buildSystemPrompt()
  → prompt-builder.js:150 loadPromptFile('0601-sp-system.txt')
  → 模板变量替换:
      {{role_description}}       ← config.roleDescription
      {{behavior_instruction}}   ← buildBehaviorInstruction() 动态生成
      {{knowledge_boundary}}     ← config.spPlayRules 或默认值
      {{symptom_pool}}           ← config.symptomPool
  → 末尾追加（存在时）:
      - 病例检查报告素材 (loadCaseMaterials)
      - 触发词硬提醒 (B/B+/A/closure/multiQuestion)
```

### 2. 人文站对话（humanistic-comm）

```
index.js:155 buildSystemPrompt()
  → prompt-builder.js:150 loadPromptFile('0604-sp-system-humanity.txt')
  → 模板变量替换（同接诊站）:
      {{role_description}}
      {{behavior_instruction}}
      {{knowledge_boundary}}
      {{symptom_pool}}
  → 人文站专属模板变量:
      {{psychological_stages_text}}  ← config.psychologicalStages
      {{humanity_scenario_text}}     ← config.humanityScenario
      {{script_questions}}           ← config.humanityScenario.sp_materials.script
  → 末尾追加（同接诊站）
```

### 3. 体格检查（physical-exam）

```
index.js:1030 loadPromptFile('0603-physical-exam.txt')
  → {{exam_templates}} ← 检查模板 JSON
  → {{exam_history}}   ← 检查历史 JSON
  → 直接调用 LLM，不走 buildSystemPrompt
```

---

## 行为指令生成（buildBehaviorInstruction）

`prompt-builder.js:44` — 每轮对话动态生成，注入当前档位状态：

| 参数 | 来源 | 说明 |
|------|------|------|
| `effectiveGear` | `gear-system.js:decideGear()` | 反思脑统一档位（暴怒/愤怒/不满/…/配合/中立） |
| `candidates` | `gear-system.js:getGearAV()` | 档位 → video_action/voice_style 候选菜单 |
| `mode` | session config | history-taking / humanistic-comm |
| `personality` | `personality-prompts.js:getPerceptionPersona()` | 性格提示词片段 |
| `triggers` | `triggers.js` | A/B/B+/closure/multiQuestion/familyPrognosisConcern |

生成内容包括：
- `OUTPUT_SCHEMA` — JSON 输出格式（text / video_action / voice_style / anger_delta / show_material）
- `当前状态` — 档位 / 性格 / 情绪基调 / 态度描述 / 策略文本
- `表达通道` — video_action 候选 + voice_style 候选 + 选择规则

---

## 11档位体系

`gear-system.js:decideGear()` 综合以下维度输出单一档位：

1. **阻尼器怒值**（即时生效，无滞后）：angerLevel ≥7→暴怒, ≥4→愤怒, ≥1→不满
2. **跨轮累积**（无滞后）：stuck≥6→愤怒, stuck≥4/avoid≥2→不满
3. **悲伤退缩**（bad_news + 低信任 + 高担忧）
4. **焦虑/不安**（fear主导 + 未解决目标）
5. **信任破裂**（trust≤2→防御，无滞后）
6. **消沉/失望/配合**（sadness主导 / trust破裂 / 高配合度）

档位 → 行为策略文本（`HISTORY_STRATEGIES` / `HUMANITY_STRATEGIES`）→ 注入知觉脑提示词

---

## 反思脑

`reflection-worker-poc.js` — 每轮对话后异步运行：

```
对话历史 → callClassificationLLM(messages, reflectionPrompt)
  → 解析 11 类事件 JSON
  → applyEventRound() 更新 Cognitive Model
  → 下一轮知觉脑调用使用更新后的 CM
```

提示词 = `reflection-brain-prompt.txt` + 性格注入（`getReflectionPersona()`）

输入：对话全文（student/sp 角色标注）
输出：`{ rounds: [{ round: N, events: [...] }] }`（12种事件类型）

---

## 性格系统

`personality-prompts.js` — 4 种性格，仅通过提示词注入，不设代码参数：

| 类型 | 代码标识 | 知觉脑特征 | 反思脑特征 |
|------|----------|-----------|-----------|
| 火爆型 | `hot-tempered` | 对怠慢敏感、直接表达不满、遇攻击回击 | 从严解读医生态度 |
| 隐忍型 | `stoic` | 不轻易发火、多次冒犯才爆发、冷回应 | 宽松解读、看重实质 |
| 焦虑型 | `anxious` | 往坏处想、模糊回应加剧担忧、急切 | 中性信息→风险解读 |
| 多疑型 | `suspicious` | 不信赖承诺、怀疑动机、不容易被打动 | 正面回应也找漏洞 |

---

## 模板文件清单

| 文件 | 状态 | 用途 |
|------|------|------|
| `services/ai-generator/prompts/06-aisp/0601-sp-system.txt` | ✅ 在用 | 接诊站 SP 系统提示词主模板 |
| `services/ai-generator/prompts/06-aisp/0604-sp-system-humanity.txt` | ✅ 在用 | 人文站 SP 系统提示词主模板 |
| `services/ai-generator/prompts/06-aisp/0603-physical-exam.txt` | ✅ 在用 | 体格检查 LLM 检查识别 |
| `services/sp-api/src/poc/reflection-brain-prompt.txt` | ✅ 在用 | 反思脑事件提取器 |
| `services/ai-generator/prompts/06-aisp/0601-sp-system-v2.2-ds-qwen-plus.txt` | ❌ 未使用 | deepseek 旧版本，无代码引用 |
| `services/ai-generator/prompts/06-aisp/0604-humanity-chat.txt` | ❌ 未使用 | 无代码引用，疑似早期版本 |

---

## 关键入口速查

| 要找什么 | 看哪个文件 |
|----------|-----------|
| 知觉脑最终 prompt 如何拼出来 | `services/sp-api/src/prompt-builder.js` `buildSystemPrompt()` |
| 每轮的 OUTPUT_SCHEMA / 表达通道 | `prompt-builder.js` `buildBehaviorInstruction()` |
| 11档位决策逻辑 | `services/sp-api/src/poc/gear-system.js` `decideGear()` |
| 档位→策略文本 | `gear-system.js` `HISTORY_STRATEGIES` / `HUMANITY_STRATEGIES` |
| 反思脑提示词 | `services/sp-api/src/poc/reflection-brain-prompt.txt` |
| 性格提示词片段 | `services/sp-api/src/poc/personality-prompts.js` |
| A/B/B+ 触发词列表 | `services/sp-api/src/triggers.js` |
| 实际 LLM 调用 | `services/sp-api/src/index.js:155-180` (知觉脑) + `index.js:21` (反思脑) |
| 前端如何发起请求 | `apps/training/src/composables/useAISP.js` |
