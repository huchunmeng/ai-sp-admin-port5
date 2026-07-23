// ═══════════════════════════════════════════════════════════════
// 人文站完整对话测试 — 验证口语化 + 翻旧账
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
  if (!r.ok) throw new Error(`Failed: ${r.error}`)
  return r.sessionId
}

async function send(sessionId, text) {
  const r = await request('POST', '/api/sp/message', { sessionId, text })
  if (!r.ok) throw new Error(`Failed: ${r.error}`)
  const dbg = r._debug || {}
  return {
    text: r.text || '',
    va: r.video_action,
    vs: r.voice_style,
    triggers: dbg.triggers || {},
    reflectionMode: dbg.reflectionMode,
    emotion: dbg.emotion
  }
}

// 医生对话脚本（模拟完整治疗谈话）
const DOCTOR_SCRIPT = [
  '林老师您好，我是您的主治医生。今天想和您聊聊这个病的情况和后面怎么治。',
  '林老师，您的类天疱疮简单说就是身体自己的防卫系统搞错了，攻击了自己的皮肤，所以才会一直起水疱。之前社区医院给您吃的那个激素药片，量可能不够大。我们打算换成打针的，药直接进血里，效果快一些。',
  '打针的药一天40毫克，确实比吃的量大。但是我们每天给您测血糖血压，有问题随时调。这个药只是短期用，等水疱控制住了就慢慢减下来。',
  '如果打针效果还不够理想，我们还有一个后备的药可以用。但那是以后的事儿了，咱们先看打针的效果。',
  '对，我们会严密监控的。到时候如果要加药，我一定提前跟您商量。',
  '您还有其他问题想问我吗？'
]

async function main() {
  console.log('════ 人文站完整对话测试 ════\n')

  const sid = await createSession()
  console.log(`会话ID: ${sid}\n`)

  for (let i = 0; i < DOCTOR_SCRIPT.length; i++) {
    const drText = DOCTOR_SCRIPT[i]
    console.log(`── 第${i + 1}轮 ──`)
    console.log(`医生: ${drText.slice(0, 100)}${drText.length > 100 ? '...' : ''}`)

    const sp = await send(sid, drText)
    console.log(`SP: ${sp.text}`)
    console.log(`  [${sp.va || '?'}] [${sp.vs || '?'}]`)
    console.log(`  closureTrigger: ${sp.triggers.closureTrigger}`)
    if (sp.triggers.aTrigger) console.log(`  ⚠️ A触发: 医学黑话`)
    if (sp.triggers.bTrigger) console.log(`  ⚠️ B触发: 替问`)
    if (sp.emotion) {
      const e = sp.emotion
      console.log(`  情绪: 怒${e.anger?.toFixed(1)} 惧${e.fear?.toFixed(1)} 悲${e.sadness?.toFixed(1)} 悦${e.joy?.toFixed(1)}`)
    }
    console.log()
  }

  console.log('════ 测试完成 ════')
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1) })
