# 验收截图 · 考核服务端（2026-09-21）

> 本轮把「限时可信 / 答卷入库 / 异步评阅 / 成绩入库」落到后端服务 `services/exam-api`（零依赖 `node:http`，端口 **5110**）。
> 这一轮修掉的是**上一轮明确留下的缺口**：成绩原先靠前端评分，考生在评阅中关页 → 成绩不入库。

## 1. 截图

| # | 截图 | 验的是什么 |
|---|---|---|
| 01 | 交卷关页后_全新浏览器仍看到服务端成绩 | 作答 → 交卷 → **关掉整个浏览器** → 服务端自己评完分 → **全新浏览器上下文（localStorage 为空）**打开任务列表，仍显示「已接入考核服务 · 已交卷 · 45.8 / 100 · 未达标（达标线 60 分）」 |

## 2. 独立复现（我自己跑的，不是子代理汇报）

脚本：注入一条任务 → 打开考试室 → 作答 → 交卷 → **`ctx.close()` 关掉整个浏览器上下文** → 全新上下文打开任务列表。

```
barText           剩余 19:58 1/1 · 膝关节 · MR 在线考试（自有设备） 已自动保存 交卷
afterSubmitText   已交卷  答卷已提交，正在评阅…   （不再前端评分）
freshContext      source = 已接入考核服务
                  state  = 已交卷
                  score  = 45.8 / 100  未达标（达标线 60 分）
pageerror         0
```

关键点：**localStorage 是空的**，这份成绩只可能来自服务端 → 「关页丢分」已闭环。

服务端返回的成绩对象（节选，证明考核口径与服务端红线确实在服务端执行）：

```json
{
  "finalScore": 45.8, "finalMax": 100,
  "passLine": 60, "rubricPassLine": 67.2,
  "passLineSource": "exam", "passed": false,
  "rawTotal": 38.5, "scoreableMax": 84, "level": "R1",
  "scoreTrace": { "commentScope": "exam", "commentsBlocked": 1, "maxCommentLcs": 7 }
}
```

`commentScope: "exam"` + `commentsBlocked: 1` + `maxCommentLcs: 7` → **考核侧出站红线（LCS ≤ 8）在服务端生效**，
不是前端假装跑的。

## 3. 端点契约（`services/exam-api/src/index.js` 顶部有同份注释）

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/exam/health` | `{ ok, llmConfigured, sessions, model }` |
| GET | `/api/exam/tasks` | 任务数组（**白名单出站，剔除金标准/评分要点** = 红线 R1）＋ 服务端算的 `state` |
| GET | `/api/exam/tasks/:id` | 单任务 |
| POST | `/api/exam/sessions` | `{taskId, candidateId?, clientId?}` → `{sessionId, startedAt, deadline, resumed, superseded}`；**deadline 只在首次开考签发**，续答不重置 |
| GET | `/api/exam/sessions/:id` | 会话（含 answers / leaveCount / status） |
| GET | `/api/exam/sessions?taskId=&candidateId=` | `{session, score}` |
| PATCH | `/api/exam/sessions/:id` | `{answers, leaveCount, clientId}`；已交卷或已过期**拒绝** |
| POST | `/api/exam/sessions/:id/submit` | **先锁答卷**再异步入队评阅 → `{submittedAt}` |
| GET | `/api/exam/sessions/:id/score` | `{status: pending\|grading\|done\|failed, results}`（客户端轮询） |
| GET | `/api/exam/scores?taskId=` | 成绩列表（管理端用：考生/提交时间/逐题分/总分达标） |
| POST | `/api/exam/sessions/expire` | 手动触发过期结算（测试用） |

错误码：`TASK_NOT_FOUND` · `OUT_OF_WINDOW` · `RETAKE_NOT_ALLOWED` · `SESSION_NOT_FOUND` · `SESSION_LOCKED` · `SESSION_EXPIRED` · `BAD_REQUEST`

## 4. 评阅兜底三条（缺一条就会丢分/超时无解）

1. **交卷即刻锁卷**：先落答卷再评阅，评阅失败不影响"已交卷"这件事本身；
2. **异步入队 + 重试**：提交后服务端自己评，考生关页不影响（本轮核心）；失败重试 3 次退避后标 `failed` 存 error；
3. **启动自检 + 定时扫描**：`grading` 中卡住的续评；**已过期未交卷的自动结算**（用最后一次已上报的答案）—— 这是"到点自动交卷"的服务端兜底。

## 5. 已知未做（照实记录）

1. 存储是**单机 JSON 文件**（`services/exam-api/data/exam-store.json`，已 gitignore），**无并发控制、无鉴权**，评阅**串行**排队 —— 生产必须换库 + 接身份体系。
2. **仍未按名单逐人派发**：一次考核产出 1 条任务/场次，考生维度靠 `candidateId`。
3. 管理端**成绩查询页面**本轮未做（`GET /api/exam/scores` 已可用，只差页面）。
4. `/api/exam/dev/reset` 是开发端点，生产要删。
5. 无服务时前端**回落本地实现**（这是刻意的，保证不起服务也能演示），因此"服务端计时不可伪造"这条只在服务在跑时成立。
