// ═══════════════════════════════════════════════════════════════
// 测试：SP 在愤怒/防御状态下是否曲解医生的话
// 场景：SP 担忧病情，医生抱怨 "你没回答我的问题"
// 期望：SP 理解这是抱怨，不是确认病情猜测
// ═══════════════════════════════════════════════════════════════
import http from 'http'

const BASE = { hostname: 'localhost', port: 5100 }

function request(method, path, data) {
  return new Promise((resolve, reject) => {
    const body = data ? JSON.stringify(data) : ''
    const opts = { ...BASE, method, path, headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } }
    const req = http.request(opts, res => {
      let raw = ''
      res.on('data', c => raw += c)
      res.on('end', () => {
        try { resolve(JSON.parse(raw)) } catch (e) { reject(new Error(`${e.message}: ${raw.slice(0, 200)}`)) }
      })
    })
    req.on('error', reject)
    if (body) req.write(body)
    req.end()
  })
}

async function createSession() {
  const r = await request('POST', '/api/sp/configure', { caseId: 'DERM-20260416-K4G7', config: { mode: 'humanistic-comm' } })
  if (!r.ok) throw new Error('Config failed: ' + r.error)
  return r.sessionId
}

async function send(sessionId, text) {
  const r = await request('POST', '/api/sp/message', { sessionId, text })
  if (!r.ok) throw new Error('Send failed: ' + r.error)
  const dbg = r._debug || {}
  return {
    text: r.text || '',
    va: r.video_action,
    vs: r.voice_style,
    triggers: dbg.triggers || {},
    reflectionMode: dbg.reflectionMode,
    emotion: dbg.emotion,
    derivedState: dbg.derivedState || dbg.reflectionState?.derivedState || {}
  }
}

// 4轮反复敷衍 → SP进入defensive → 第5轮医生说"你没回答我的问题"
const DOCTOR_SCRIPT = [
  '林老师您好，我是您的主治医生。今天想和您聊聊这个病的情况。',
  '您这个病啊，就是个小毛病，不用太担心。',
  '就是小毛病，回去按时吃药就行了。',
  '我都说了是小毛病，您别想太多。',
  '你没回答我的问题。',
]

async function main() {
  console.log('════ SP 上下文接地测试 ════')
  console.log('')

  const sid = await createSession()
  console.log('sessionId: ' + sid)
  console.log('')

  for (let i = 0; i < DOCTOR_SCRIPT.length; i++) {
    const drText = DOCTOR_SCRIPT[i]
    const n = i + 1
    console.log('── 第' + n + '轮 ──')
    console.log('医生: ' + drText)

    const sp = await send(sid, drText)
    console.log('SP: ' + sp.text)
    console.log('  [' + (sp.va || '?') + '] [' + (sp.vs || '?') + ']')
    if (sp.derivedState && sp.derivedState.attitude) {
      const ds = sp.derivedState
      console.log('  派生状态: attitude=' + ds.attitude + ' intensity=' + (ds.emotion_constraint?.intensity || '?') + ' dominant=' + (ds.emotion_constraint?.dominant || '?'))
    }
    if (sp.emotion) {
      const e = sp.emotion
      console.log('  情绪: 怒' + (e.anger?.toFixed(1) || '?') + ' 惧' + (e.fear?.toFixed(1) || '?') + ' 悲' + (e.sadness?.toFixed(1) || '?') + ' 悦' + (e.joy?.toFixed(1) || '?'))
    }
    console.log()
  }

  console.log('════ 测试完成 ════')
  console.log('')
  console.log('关键观察: 第5轮医生说"你没回答我的问题"时，')
  console.log('SP应理解为"医生在抱怨我没回答问题"，')
  console.log('不应曲解为"医生在确认/讨论我的病情猜测"。')
}

main().catch(e => { console.error('ERROR: ' + e.message); process.exit(1) })
