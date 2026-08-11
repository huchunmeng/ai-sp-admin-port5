// ═══════════════════════════════════════════════════════════════
// 生成脚本①：真实 SP API 跑病史采集对话（IM-20260801-PCH）
// 用 15 个覆盖 history_score_items 的学生问题，逐轮调用 /api/sp/message
// 输出：data/gen/historyTaking.json
// ═══════════════════════════════════════════════════════════════
import fs from 'node:fs'
import path from 'node:path'

const API = 'http://localhost:5100/api/sp'
const CASE_ID = 'IM-20260801-PCH'
const OUT = path.resolve('data/gen/historyTaking.json')
const sleep = ms => new Promise(r => setTimeout(r, ms))

// 15 个学生问题，顺序覆盖 15 个 history_score_items
const QUESTIONS = [
  '您好！我是今天接诊的医生。请问您是蒲志辉先生吗？今年54岁对吗？',
  '您今天来医院，最主要是哪里不舒服？能跟我详细说说吗？',
  '咳嗽是从什么时候开始的？是受凉以后出现的吗？是干咳还是带痰？有没有咳血、胸痛、憋气？',
  '除了咳嗽，您最近还有没有乏力、胸闷、腹胀这些感觉？分别是什么时候开始的，持续多久了？',
  '这段时间有没有发烧、腹痛、恶心呕吐、皮肤发黄、呕血或者解黑便这些情况？',
  '您乙肝小三阳是什么时候发现的？一直吃的什么药？每天都坚持吃吗？',
  '之前有没有做过肝脏硬度检查？医生诊断肝硬化了吗？平时大概多久复查一次？',
  '您血压平时高吗？量出来大概多少？有没有吃降压药控制？',
  '您以前做过手术吗？比如说阑尾手术这类？',
  '有没有输过血、受过外伤？对什么药物或者食物过敏吗？',
  '您平时喝酒吗？喝得多不多？戒酒有多久了？',
  '家里父母兄弟姐妹有没有得肝炎、肝硬化的？有没有人得过肝癌？',
  '我再帮您整体过一遍：平时活动后有没有胸闷心慌？胃口怎么样？大小便正常吗？晚上睡眠如何？',
  '您打过乙肝疫苗吗？其他的预防接种都按时做了吗？',
  '您先别太担心，我们一步一步来。您自己最担心的是哪方面？有什么顾虑都可以告诉我。',
]

const labels = [
  '确认姓名年龄', '开放式主诉', '咳嗽细节', '现病史核心症状', '阴性症状',
  '乙肝病史', '肝硬化随访', '高血压', '手术史', '输血外伤过敏',
  '饮酒史', '家族史', '系统回顾', '预防接种', '人文沟通',
]

async function post(url, body) {
  const resp = await fetch(API + url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!resp.ok) {
    const txt = await resp.text().catch(() => '')
    throw new Error(`${url} ${resp.status}: ${txt.slice(0, 300)}`)
  }
  return resp.json()
}

async function main() {
  fs.mkdirSync(path.dirname(OUT), { recursive: true })
  const basic = JSON.parse(fs.readFileSync('apps/admin/public/data/cases/IM-20260801-PCH-basic.json', 'utf8'))
  const reception = JSON.parse(fs.readFileSync('apps/admin/public/data/cases/IM-20260801-PCH-reception.json', 'utf8'))

  console.log('▶ configure history-taking ...')
  const cfg = await post('/configure', {
    caseId: CASE_ID,
    config: { mode: 'history-taking' },
  })
  const sessionId = cfg.sessionId
  console.log('  sessionId:', sessionId)

  const messages = []
  const t0 = Date.now()
  let roleEcho = 0

  for (let i = 0; i < QUESTIONS.length; i++) {
    const q = QUESTIONS[i]
    const qTime = Date.now()
    messages.push({ role: 'user', content: q, time: qTime })
    let reply
    try {
      reply = await post('/message', { sessionId, text: q })
    } catch (e) {
      console.error(`✗ [${i + 1}/${QUESTIONS.length}] ${labels[i]} 失败:`, e.message)
      throw e
    }
    const text = (reply.text || '').trim()
    if (!text) {
      console.warn(`  ⚠ [${i + 1}/${QUESTIONS.length}] ${labels[i]} 空回复`)
    }
    // 检测 SP 回避回复（短回应/复读）
    if (text && text.length < 8) roleEcho++
    messages.push({ role: 'sp', content: text, time: Date.now(), emotion: reply.emotion?.state || 'calm' })
    console.log(`✓ [${i + 1}/${QUESTIONS.length}] ${labels[i]}  (${Math.round((Date.now() - qTime) / 100) / 10}s): ${text.slice(0, 50)}`)
  }

  const sessionData = {
    caseId: CASE_ID,
    stationId: 'historyTaking',
    stage: 'history-taking',
    messages,
    notes: '',
    summary: `病史采集对话完成，共 ${QUESTIONS.length} 轮。`,
  }
  fs.writeFileSync(OUT, JSON.stringify(sessionData, null, 2), 'utf8')

  console.log('\n════ 完成 ════')
  console.log('消息数:', messages.length, '| SP 短回复数:', roleEcho, '| 总耗时:', Math.round((Date.now() - t0) / 100) / 10 + 's')
  console.log('输出:', OUT)
}

main().catch(e => {
  console.error('\n[FATAL]', e)
  process.exit(1)
})
