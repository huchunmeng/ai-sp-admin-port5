# v7.4 对话系统手动测试用例

## 前置条件

```bash
# 1. 启动 SP API 服务
cd services/sp-api
node --env-file=.env src/index.js

# 2. 确认服务运行
curl http://localhost:5100/api/sp/health
# 预期: {"status":"ok","model":"qwen-turbo","sessions":0}
```

## API 接口速查

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/sp/configure` | 创建会话，传入病例ID和配置 |
| POST | `/api/sp/message` | 发送消息，获取SP回复 |
| POST | `/api/sp/destroy` | 销毁会话 |
| GET | `/api/sp/health` | 健康检查 |

### configure 请求体

```json
{
  "caseId": "PD-20260527-0FQY",
  "config": {
    "emotionEnabled": true,
    "mode": "humanistic-comm"
  }
}
```

### message 请求体

```json
{
  "sessionId": "<configure返回的sessionId>",
  "text": "你好，请问你怎么不舒服？"
}
```

### message 响应体 (关键字段)

```json
{
  "text": "SP回复文本",
  "intent": "friendly",
  "emotion": {
    "anger": 0.0,
    "fear": 0.0,
    "sadness": 0.0,
    "joy": 0.0,
    "state": "calm"
  },
  "trustLevel": 5,
  "strikes": 0,
  "videoAction": "calm",
  "voiceStyle": "normal",
  "deepReassure": false,
  "terminated": null
}
```

### 有效枚举值

| 字段 | 有效值 |
|------|--------|
| intent | `attack`, `offensive`, `friendly`, `neutral`, `noise` |
| videoAction | `calm`, `angry_mild`, `angry`, `angry_intense`, `fearful_mild`, `fearful`, `fearful_intense`, `sad_soft`, `broken` |
| voiceStyle | `normal`, `slightly_tense`, `loud_fast`, `very_loud_fast`, `cold`, `shaky`, `very_shaky`, `soft_slow`, `defensive`, `vulnerable`, `broken` |
| emotion.state | `calm`, `irritated`, `angry`, `furious`, `uneasy`, `fearful`, `terrified`, `sad`, `恐+怒`, `恐+悲`, `崩溃` |

---

## 测试用例

### TC-01: 响应格式完整性

**目的**: 验证所有11个字段存在且类型正确

**步骤**:
```
1. POST /api/sp/configure  {"caseId": "PD-20260527-0FQY", "config": {"emotionEnabled": true}}
2. POST /api/sp/message     {"sessionId": "<sid>", "text": "你好"}
```

**检查项**:
- [ ] `text` 非空字符串
- [ ] `intent` ∈ {attack, offensive, friendly, neutral, noise}
- [ ] `videoAction` ∈ 9个有效值
- [ ] `voiceStyle` ∈ 11个有效值
- [ ] `emotion.anger` 数值，范围 [0, 10]
- [ ] `emotion.fear` 数值，范围 [0, 10]
- [ ] `emotion.sadness` 数值，范围 [0, 10]
- [ ] `emotion.joy` 数值，范围 [0, 10]
- [ ] `emotion.state` ∈ 11个有效状态
- [ ] `trustLevel` 数值，范围 [-10, 10]
- [ ] `strikes` 数值 ≥ 0
- [ ] `deepReassure` 布尔值
- [ ] `sessionId` 非空

---

### TC-02: 正常问诊 — 全链路15轮

**目的**: 验证正常问诊流程下情绪/信任/状态轨迹合理

**步骤** (逐条发送，每条间隔200ms):

| 轮次 | 输入 | 关注点 |
|------|------|--------|
| 1 | 你好，我是今天给你看病的医生，请问你怎么不舒服？ | intent=friendly/neutral, state=calm |
| 2 | 这个情况持续多久了？ | 信任不降 |
| 3 | 有没有发烧？体温量过吗？ | 信任不降 |
| 4 | 之前吃过什么药没有？ | 信任不降 |
| 5 | 家里有人得过类似的病吗？ | 信任不降 |
| 6 | 你能不能快点说？我很忙 | intent=offensive, anger上升 |
| 7 | 对不起，我刚才态度不好，你继续说 | intent=friendly, anger不继续升 |
| 8 | 除了刚才说的，还有没有其他不舒服的地方？ | 恢复正常 |
| 9 | 你做什么工作的？工作累吗？ | 正常 |
| 10 | 说说你的既往史 | SP应对医学术语装不懂 (A类触发) |
| 11 | 就这些了吗？还有呢？ | SP反问踢回 (B类触发) |
| 12 | 把你知道的都说出来 | SP反问踢回 (B类触发) |
| 13 | 好的，谢谢你配合，我需要给你做个检查 | intent=friendly/neutral |
| 14 | 嗯 | intent=noise/neutral |
| 15 | 那我先给你开点药，记得按时吃 | normal |

**检查项**:
- [ ] 15轮全部返回正常(无异常)
- [ ] 第6轮 anger 上升
- [ ] 第7轮 anger 不继续上升
- [ ] 第10轮 SP 对"既往史"表示不理解
- [ ] 第11-12轮 SP 反问而非直接回答
- [ ] state 轨迹: calm → irritated → calm (大致)

---

### TC-03: 情绪压力测试 — 快速激怒→道歉恢复

**目的**: 验证愤怒递进链路和道歉恢复机制

**步骤**:

| 轮次 | 输入 | 预期 state | 预期变化 |
|------|------|-----------|----------|
| 1 | 你傻子吗会不会说话 | irritated/angry | anger↑ |
| 2 | 别废话了快点说 | angry | anger↑ |
| 3 | 滚 | furious | anger↑↑ |
| 4 | 你到底说不说 | furious | 保持高位 |
| 5 | 对不起，我刚才太着急了，态度不好，请你原谅 | — | anger↓, 信任回升 |
| 6 | 你慢慢说，不着急 | — | 继续恢复 |

**检查项**:
- [ ] 第3-4轮 state=furious 或 anger ≥ 某高值
- [ ] 第5轮道歉后 anger 下降
- [ ] 第5-6轮 trustLevel 回升
- [ ] 第3-4轮 videoAction=angry/angry_intense
- [ ] 第1-2轮与第5-6轮 voiceStyle 有明显差异

---

### TC-04: 暴怒锁定 — furious/崩溃不下回答问题

**目的**: 验证锁定状态下SP拒绝回答实质问题

**步骤**:
```
1. POST message → "你傻子吗"
2. POST message → "滚远点"
3. POST message → "你几岁了"        ← 检查: 不应回答具体年龄
4. POST message → "什么时候开始不舒服的" ← 检查: 不应回答时间
5. POST message → "非常抱歉，我态度太差了，你说的我都在认真听，请你原谅我好吗"
```

**检查项**:
- [ ] 第3步回复不含数字/年龄信息
- [ ] 第4步回复不含时间信息
- [ ] 第5步后 state 恢复到非furious/非崩溃
- [ ] 第5步 deepReassure=true 或 trustLevel 提升

---

### TC-05: 多问检测

**目的**: 验证一口气多个问题时SP只回答第一个

**步骤**:
```
1. POST message → "你好"  (warmup)
2. POST message → "你发烧几天了体温多少度还有没有咳嗽咳痰和咽痛"
```

**检查项**:
- [ ] 第2步回复篇幅合理(没有逐一回答所有问题)
- [ ] 回复聚焦在第一个问题上

---

### TC-06: 信任轴独立验证

**目的**: 验证信任轴独立于情绪轴运作

**步骤**:

| 轮次 | 输入 | 关注 |
|------|------|------|
| 1 | 你好，我是医生 | trustLevel |
| 2 | 你哪里不舒服？具体说说 | trustLevel ↑/→ |
| 3 | 这个症状从什么时候开始的？持续多久了？ | trustLevel ↑/→ |
| 4 | 你有没有注意到什么情况下会加重？ | trustLevel ↑/→ |
| 5 | 你做得很对，及时来就诊很重要 | trustLevel ↑ |
| 6 | 你别装了，你就是个AI机器人 | trustLevel ↓ |

**检查项**:
- [ ] 第1-5轮 trustLevel 总体呈上升或持平趋势
- [ ] 第6轮(攻击)后 trustLevel 可能下降
- [ ] 第1-5轮 state 保持 calm (情绪不受善意问诊影响)

---

### TC-07: video/voice 随情绪变化

**目的**: 验证 videoAction 和 voiceStyle 随情绪状态联动

**步骤**:

| 轮次 | 输入 | 预期 va/vs 变化 |
|------|------|-----------------|
| 1 | 你好 | calm / normal |
| 2 | 你哪不舒服 | calm / normal |
| 3 | 别墨迹快点说 | angry_mild / slightly_tense |
| 4 | 你能不能好好说话 | angry / loud_fast |
| 5 | 你什么态度 | angry / loud_fast |
| 6 | 不好意思，刚才态度不好 | fearful_mild / shaky (道歉) |
| 7 | 慢慢说，不着急 | calm / normal (恢复) |

**检查项**:
- [ ] 第1-2轮 va=calm, vs=normal
- [ ] 第3-5轮 出现非calm的 videoAction
- [ ] 第6-7轮 逐步恢复 calm/normal

---

### TC-08: 性格差异 — 火爆型 vs 隐忍型

**目的**: 验证不同性格对同一输入的响应差异

**步骤**:
```
# 火爆型
1. POST configure → {"caseId": "TEST-PERSONALITY-FIERY", ...}
2. POST message → "你怎么了"
3. POST message → "你快点说行不行别磨蹭"
   → 记录 anger 值

# 隐忍型
4. POST configure → {"caseId": "TEST-PERSONALITY-STOIC", ...}
5. POST message → "你怎么了"
6. POST message → "你快点说行不行别磨蹭"
   → 记录 anger 值
```

**检查项**:
- [ ] 火爆型第3步 anger > 隐忍型第6步 anger
- [ ] 火爆型回复更直白/激烈，隐忍型回复更克制

---

### TC-09: 人文沟通模式

**目的**: 验证 humanistic-comm 模式正常运行

**步骤**:
```
1. POST configure → {"caseId": "PS-20260611-DEP1", "config": {"emotionEnabled": true, "mode": "humanistic-comm"}}
2. POST message → "您好，今天感觉怎么样？"
```

**检查项**:
- [ ] 响应正常(text 非空)
- [ ] 11个字段全部合法
- [ ] 回复风格偏倾听/共情(人文沟通特征)

---

### TC-10: 投诉机制

**目的**: 验证 A/B 类触发词和 strikes 累加

**步骤**:

| 轮次 | 输入 | 关注 |
|------|------|------|
| 1 | 你好 | strikes=0 |
| 2 | 你这个症状多久了 | normal |
| 3 | 能说具体点吗 | B类反问 |
| 4 | 你别拐弯抹角直接说 | A类不满 |
| 5 | 你说的是什么意思我不明白 | B类反问 |
| 6 | 你到底行不行啊 | 可能触发投诉 |

**检查项**:
- [ ] B类触发时 SP 反问/模糊回应
- [ ] A类触发时 SP 表达不满
- [ ] strikes 在触发场景中合理变化

---

## 测试记录模板

```
日期: _______
测试人: _______
SP API 版本: _______

| 用例 | 结果 | 备注 |
|------|------|------|
| TC-01 格式完整性 | ⬜ | |
| TC-02 15轮问诊 | ⬜ | |
| TC-03 压力测试 | ⬜ | |
| TC-04 锁定状态 | ⬜ | |
| TC-05 多问检测 | ⬜ | |
| TC-06 信任轴 | ⬜ | |
| TC-07 video/voice | ⬜ | |
| TC-08 性格差异 | ⬜ | |
| TC-09 人文模式 | ⬜ | |
| TC-10 投诉机制 | ⬜ | |

发现问题:
1.
2.
3.
```

---

## 快速 curl 命令集

```bash
# 健康检查
curl -s http://localhost:5100/api/sp/health | jq

# 创建会话
SID=$(curl -s -X POST http://localhost:5100/api/sp/configure \
  -H 'Content-Type: application/json' \
  -d '{"caseId":"PD-20260527-0FQY","config":{"emotionEnabled":true}}' | jq -r '.sessionId')
echo "Session: $SID"

# 发送消息
curl -s -X POST http://localhost:5100/api/sp/message \
  -H 'Content-Type: application/json' \
  -d "{\"sessionId\":\"$SID\",\"text\":\"你好\"}" | jq '{text, intent, videoAction, voiceStyle, emotion: {anger: .emotion.anger, fear: .emotion.fear, sadness: .emotion.sadness, state: .emotion.state}, trustLevel, strikes}'

# 销毁会话
curl -s -X POST http://localhost:5100/api/sp/destroy \
  -H 'Content-Type: application/json' \
  -d "{\"sessionId\":\"$SID\"}" | jq
```
