// ═══════════════════════════════════════════════════════════════
// 情绪引擎 + SP回复逻辑 深度测试 — 周若璇 (OB-20250615-9C2K)
// 输出: Emotion Debug Report 格式 + 内部链路dump
// ═══════════════════════════════════════════════════════════════
import http from 'node:http'
import { writeFileSync, appendFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

const API = 'http://localhost:5100'
const __dirname = dirname(new URL(import.meta.url).pathname.replace(/^\/[A-Z]:/, ''))
const OUT_DIR = new URL('../test-output/', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')
mkdirSync(OUT_DIR, { recursive: true })
const OUT = OUT_DIR + 'last-debug-report.txt'

function req(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API)
    const payload = body ? JSON.stringify(body) : null
    const opts = {
      hostname: url.hostname, port: url.port,
      path: url.pathname, method,
      headers: { 'Content-Type': 'application/json' }
    }
    const r = http.request(opts, res => {
      let data = ''
      res.on('data', c => data += c)
      res.on('end', () => {
        try { resolve({ status: res.statusCode, ...JSON.parse(data) }) }
        catch { resolve({ status: res.statusCode, raw: data }) }
      })
    })
    r.on('error', reject)
    if (payload) r.write(payload)
    r.end()
  })
}

const SCENARIOS = {
  good: [
    `周女士您好，我是您的主治医生。您先别急，深呼吸，我们立刻给您做胎心监护。出血量目前看起来不算大，孩子很可能还好好的。我理解您现在一定很害怕，我会陪您把每一步都弄清楚。`,
    `您说得对，32周时确实只提示低置。现在胎盘位置会随着孕周变化，34周完全覆盖了宫颈口——这不代表上次做错了，而是孕晚期子宫下段拉长后显现出来的。我们现在做B超的医生经验很丰富，您放心。为了更准确评估有无植入，我建议马上加做MRI。`,
    `我明白您担心孩子和子宫。我们计划24小时内手术，术前介入科会先放球囊堵住大血管减少出血——这个技术在保护子宫方面效果很好。孩子34周，新生儿科医生会在手术室台前等候，宝宝一出生就由他们接手。我们一定会尽全力保住您的子宫，万一万不得已要切除，也一定先跟您先生说明。`,
    `好，您问的这几个问题都很关键。主刀是我+王主任，他做这类手术300多台了。麻醉是硬膜外+腰麻联合，您是清醒的，术后有镇痛泵。现在请您配合：禁食水，换上手术服，您先生可以到病房门口，手术前可以见一面。还有什么想确认的随时问我。`,
  ],
  bad: [
    `周若璇是吧？出血什么时候开始的？量多不多？什么颜色的？`,
    `B超我看过了。上次月经什么时候？怀孕几次？生过几个？有没有流产史？`,
    `做个MRI看看吧。哦对了，你有没有高血压、糖尿病？家族里有遗传病吗？手术过吗？`,
    `准备手术。通知你家属来签字。还有别的问题吗？`,
  ],
  mid: [
    `别紧张，出血在产科很常见。我们看看B超结果。`,
    `前置胎盘是这样的，位置会变。之前不算误诊，现在情况变了而已。具体我也不是影像科医生，不太好说。`,
    `手术嘛，总是有风险的。切子宫的概率不大，孩子34周也还好。你放宽心。`,
    `OK，反正麻醉什么的手术室会跟你谈。有风险我们会处理。你先签字吧。`,
  ],
}

const DIM_LABELS = { anger: '怒', fear: '惧', sadness: '悲', joy: '悦' }
const EMOTION_DIMS = ['anger', 'fear', 'sadness', 'joy']

function formatReport(logs, scenarioName, model) {
  const first = logs[0], last = logs[logs.length - 1]
  let r = `══════ Emotion Debug Report ══════\n`
  r += `会话: OB-20250615-9C2K (周若璇) | 共 ${logs.length} 轮 | ${new Date().toLocaleString()}\n`
  r += `模型: ${model} | 场景: ${scenarioName}\n\n`

  // 情绪终值
  r += `情绪终值: `
  const vs = []
  for (const dim of EMOTION_DIMS) {
    const endVal = last.vector[dim].toFixed(1)
    const startVal = first.vector[dim].toFixed(1)
    const diff = last.vector[dim] - first.vector[dim]
    if (Math.abs(diff) > 0.03) {
      vs.push(`${DIM_LABELS[dim]}:${startVal}→${endVal}(${diff > 0 ? '↑' : '↓'}${Math.abs(diff).toFixed(1)})`)
    } else {
      vs.push(`${DIM_LABELS[dim]}:${endVal}`)
    }
  }
  r += vs.join('  ') + `\n\n`

  // 意图分布
  const tally = {}
  for (const l of logs) { tally[l.intent] = (tally[l.intent] || 0) + 1 }
  r += `意图分布: ` + Object.entries(tally).map(([k, v]) => `${k}×${v}`).join('  ') + `\n\n`

  r += `──── 对话详情 ────\n\n`
  for (let i = 0; i < logs.length; i++) {
    const cur = logs[i]
    const prev = i > 0 ? logs[i - 1].vector : null
    const changes = []
    for (const dim of EMOTION_DIMS) {
      const cv = cur.vector[dim].toFixed(1)
      if (prev) {
        const d = cur.vector[dim] - prev[dim]
        if (Math.abs(d) > 0.03) {
          changes.push(`${DIM_LABELS[dim]}:${prev[dim].toFixed(1)}→${cv}(${d > 0 ? '↑' : '↓'}${Math.abs(d).toFixed(1)})`)
        }
      } else {
        changes.push(`${DIM_LABELS[dim]}:${cv}`)
      }
    }
    r += `#${cur.round} | ${cur.time} | intent:${cur.intent} | state:${cur.state}\n`
    if (changes.length > 0) r += `  ${changes.join('  ')}\n`
    r += `  👤 ${cur.student}\n`
    r += `  🤖 ${cur.sp}\n\n`
  }
  return r
}

async function test(scenarioName, label, turns, writeRaw) {
  console.log(`\n${'═'.repeat(60)}`)
  console.log(`  ${label}`)
  console.log(`${'═'.repeat(60)}`)

  const cfg = await req('POST', '/api/sp/configure', { caseId: 'OB-20250615-9C2K' })
  if (!cfg.ok) { console.error('配置失败:', cfg); return null }
  const { sessionId } = cfg
  console.log(`  会话: ${sessionId.slice(0,8)}...`)

  const logs = []

  for (let i = 0; i < turns.length; i++) {
    const result = await req('POST', '/api/sp/message', { sessionId, text: turns[i] })
    if (!result.ok) { console.error(`  第${i+1}轮出错:`, result); break }

    const e = result.emotion
    const dbg = result._debug
    const now = new Date().toLocaleTimeString()

    // 控制台简要输出
    console.log(`\n  ── 第 ${i+1} 轮 | ${now} | intent:${result.intent} | state:${e.state} ──`)
    console.log(`  情绪: 怒${e.anger} 惧${e.fear} 悲${e.sadness} 悦${e.joy}`)
    console.log(`  [医] ${turns[i].slice(0,60)}...`)
    console.log(`  [SP] ${result.text}`)

    // 内部链路详情 (每轮输出到控制台)
    if (dbg) {
      console.log(`  ┌─ LLM:${dbg.model} prompt_len:${dbg.promptLength}`)
      console.log(`  ├─ PRE : ${JSON.stringify(dbg.pre)}`)
      console.log(`  ├─ DELTA: LLM输出=${JSON.stringify(dbg.delta)} 校验后=${JSON.stringify(dbg.validated)}`)
      console.log(`  └─ POST: ${JSON.stringify(dbg.post)}`)
      console.log(`  ┌─ RAW LLM (前200字): ${(dbg.llm.rawOutput||'').slice(0,200)}`)
      console.log(`  └─ TRIGGERS: ${JSON.stringify(dbg.triggers)}`)
    }

    // 累积报告数据
    logs.push({
      round: i + 1,
      time: now,
      student: turns[i],
      sp: result.text,
      intent: result.intent,
      state: e.state,
      vector: { anger: e.anger, fear: e.fear, sadness: e.sadness, joy: e.joy },
      _debug: dbg || null
    })
  }

  await req('POST', '/api/sp/destroy', { sessionId })

  // 写入文件
  if (logs.length > 0) {
    const model = logs[0]._debug?.model || 'unknown'
    const report = formatReport(logs, label, model)
    const header = `${'═'.repeat(60)}\n${label}\n${'═'.repeat(60)}\n\n`
    if (writeRaw) {
      writeFileSync(OUT, header + report, 'utf-8')
    } else {
      appendFileSync(OUT, header + report, 'utf-8')
    }
    console.log(`\n  📄 报告已写入: ${OUT}`)
  }

  return logs
}

async function main() {
  const health = await req('GET', '/api/sp/health')
  if (!health.ok) {
    console.error('SP API 未运行！')
    process.exit(1)
  }
  console.log(`SP API: ${health.model} | 活跃会话: ${health.sessions}\n`)

  // 第一个场景覆盖写入，后续追加
  await test('OB-20250615-9C2K', '【好医生】共情+清晰解释', SCENARIOS.good, true)
  await test('OB-20250615-9C2K', '【差医生】回避情绪+只问病史', SCENARIOS.bad, false)
  await test('OB-20250615-9C2K', '【中等医生】敷衍安抚+信息模糊', SCENARIOS.mid, false)

  console.log(`\n${'═'.repeat(60)}`)
  console.log(`全部测试完成 → ${OUT}`)
  console.log('═'.repeat(60))
}

main().catch(e => { console.error(e); process.exit(1) })
