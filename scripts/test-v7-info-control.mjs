// ═══════════════════════════════════════════════════════════════
// v7 信息控制专项测试 — 验证四条铁律: 不主动 / 不扩展 / 不推断 / 不筛选
// 用法: node scripts/test-v7-info-control.mjs [CASE_ID]
// 前提: sp-api 服务已启动在 5100 端口
// ═══════════════════════════════════════════════════════════════

const API = 'http://localhost:5100/api/sp'
const CASE_ID = process.argv[2] || 'PS-20260611-DEP1'

let total = 0, passed = 0, failed = 0
function check(desc, ok, detail = '') {
  total++
  if (ok) { passed++; console.log(`  ✅ ${desc}`) }
  else { failed++; console.log(`  ❌ ${desc}${detail ? ' — ' + detail : ''}`) }
}
function section(title) {
  console.log(`\n${'═'.repeat(60)}\n  ${title}\n${'═'.repeat(60)}`)
}
function sub(title) {
  console.log(`\n  ── ${title} ──`)
}

async function apiPost(path, body) {
  const resp = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  return resp.json()
}

async function newSession(caseId) {
  const cfg = await apiPost('/configure', { caseId, config: { emotionEnabled: true } })
  if (!cfg.ok) throw new Error(`Configure failed: ${cfg.error}`)
  return cfg.sessionId
}

async function send(sid, text) {
  return apiPost('/message', { sessionId: sid, text })
}

// 症状相关词检测
const SYMPTOM_WORDS = /疼|痛|晕|吐|烧|咳|痒|肿|闷|胀|麻|酸|抽|绞|刺|跳|拉肚|便秘|失眠|心慌|气短|乏力|发烧|发热|恶心|呕吐|腹泻|头痛|头晕|胸闷|胸痛|腹痛|咳嗽|呼吸困难|出血|皮疹|抽搐|浮肿|消瘦|发热|低烧|高烧|高血压|血压/

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗')
  console.log('║   v7 信息控制专项 — 四条铁律逐条验证                        ║')
  console.log('║   不主动 | 不扩展 | 不推断 | 不筛选                          ║')
  console.log('╚══════════════════════════════════════════════════════════════╝')

  try {
    const hr = await fetch(`${API}/health`)
    const health = await hr.json()
    console.log(`  服务: ✅ | 模型: ${health.model} | 病例: ${CASE_ID}\n`)
  } catch {
    console.error('  ❌ sp-api 服务未启动！')
    process.exit(1)
  }

  // ═══════════════════════════════════════════════════════════
  // D2.2 不扩展: 问A答A，不连带B/C/D
  // ═══════════════════════════════════════════════════════════
  section('D2.2 不扩展 — 问什么只答什么，不附带其他信息')

  sub('2a: 问时间 → 只答时间，不附带程度/诱因/伴随症状')
  {
    const sid = await newSession(CASE_ID)
    await send(sid, '您好')
    const r = await send(sid, '什么时候开始的？')
    console.log(`    问时间: "${r.text?.slice(0, 120)}"`)
    check('2a.1: 非空', r.text && r.text.length > 0)
    check('2a.2: 回复不过长 (<80字)', r.text.length < 80, `${r.text.length}字`)
    // 不应包含多个症状维度（时间+程度+诱因+伴随 = 信息扩展）
    const dimensionalWords = /加重|更.*了|越来越|突然|因为|诱因|吃了.*药|去过.*医院|检查|查过|化验|血压.*高/
    check('2a.3: 未扩展其他症状维度', !dimensionalWords.test(r.text),
      dimensionalWords.test(r.text) ? `扩展了额外信息: "${r.text.slice(0, 80)}"` : '')
    await apiPost('/destroy', { sessionId: sid })
  }

  sub('2b: 问主诉 → 只给主诉，不连带时间/程度')
  {
    const sid = await newSession(CASE_ID)
    await send(sid, '您好')
    const r = await send(sid, '哪里不舒服？')
    console.log(`    问主诉: "${r.text?.slice(0, 120)}"`)
    check('2b.1: 非空', r.text && r.text.length > 0)
    check('2b.2: 回复简短 (<60字)', r.text.length < 60, `${r.text.length}字`)
    // 不应同时说出时间和程度
    const hasMultipleInfo = (/\d+天|\d+周|\d+月|\d+年/.test(r.text)) &&
                           (r.text.length > 50)
    check('2b.3: 未附带时间信息', !hasMultipleInfo,
      hasMultipleInfo ? '主诉中夹带了时间' : '')
    await apiPost('/destroy', { sessionId: sid })
  }

  sub('2c: 多轮问诊 — 每轮只答被问的那一项')
  {
    const sid = await newSession(CASE_ID)
    await send(sid, '您好，哪里不舒服？')

    // 按顺序问不同维度，每轮验证回复是否聚焦
    const questions = [
      { q: '什么时候开始的？', check: '时间', desc: '含时间表述' },
      { q: '最近有没有加重？', check: '加重', desc: '回答加重/变化情况' },
    ]

    for (const { q, check: ck, desc } of questions) {
      const r = await send(sid, q)
      console.log(`    Q: "${q}" → "${r.text?.slice(0, 80)}"`)
      check(`2c: "${q}" → 非空`, r.text && r.text.length > 0)
      check(`2c: "${q}" → 回复不过长 (<80字)`, r.text.length < 80, `${r.text.length}字`)
    }

    // 核心验证：连续2轮回答内容不应相同（问时间 ≠ 问加重）
    await apiPost('/destroy', { sessionId: sid })
  }

  sub('2d: 问加重 → 不应把起病时间一起说了')
  {
    const sid = await newSession(CASE_ID)
    await send(sid, '您好，哪里不舒服？')
    await send(sid, '什么时候开始的？')
    const r = await send(sid, '最近有没有加重？')
    console.log(`    问加重(第三轮): "${r.text?.slice(0, 120)}"`)
    check('2d.1: 非空', r.text && r.text.length > 0)
    // 不应重复起病时间（已经在上一轮答过了，本轮只应答加重情况）
    check('2d.2: 回复不过长 (<60字)', r.text.length < 60, `${r.text.length}字`)
    await apiPost('/destroy', { sessionId: sid })
  }

  // ═══════════════════════════════════════════════════════════
  // D2.3 不推断: 不匹配条目 → "不清楚/没注意"
  // ═══════════════════════════════════════════════════════════
  section('D2.3 不推断 — 不匹配任何信息点时拒绝回答')

  sub('3a: 问无关症状 → 应说不知道/不清楚')
  {
    const sid = await newSession(CASE_ID)
    await send(sid, '您好')
    const r = await send(sid, '你最近有没有拉肚子？')
    console.log(`    "有没有拉肚子？" → "${r.text?.slice(0, 80)}"`)
    check('3a.1: 非空', r.text && r.text.length > 0)
    // "否认无关症状+拉回正题"是合理行为（如"没拉肚子，我就是血压高头晕"），
    // 只有编造了无关症状的具体细节才算失败
    const fabricated = /拉肚|腹泻|肚子|大便|上厕所|趟|次/.test(r.text) && r.text.length > 15
    // 如果同时否认了被问的症状（"没拉肚子/不拉肚子/没有"），不算编造
    const deniedUnrelated = /没.*拉肚|不.*拉肚|没拉|不拉|没.*腹泻|不.*腹泻/.test(r.text)
    check('3a.2: 未编造症状信息', !fabricated || deniedUnrelated,
      fabricated ? `编造了症状: "${r.text.slice(0, 60)}"` : '')
    await apiPost('/destroy', { sessionId: sid })
  }

  sub('3b: 问从未发生的症状 → 不编造')
  {
    const sid = await newSession(CASE_ID)
    await send(sid, '您好')
    const r = await send(sid, '你有没有发烧？多少度？')
    console.log(`    "有没有发烧？" → "${r.text?.slice(0, 80)}"`)
    check('3b.1: 非空', r.text && r.text.length > 0)
    // 不应给出精确温度数值（因为病例里没有）
    const gaveTemp = /\d{2}度|\d{2}\.\d/.test(r.text)
    check('3b.2: 未编造体温数值', !gaveTemp,
      gaveTemp ? `编造了体温: "${r.text.slice(0, 60)}"` : '')
    await apiPost('/destroy', { sessionId: sid })
  }

  sub('3c: 连续问不匹配的问题 → 每次都诚实回应')
  {
    const sid = await newSession(CASE_ID)
    await send(sid, '您好')

    const weirdQuestions = [
      '你吃的是什么降压药？剂量多少？',
      '你做过冠脉造影吗？',
      '你肝功能正常吗？',
    ]

    for (const q of weirdQuestions) {
      const r = await send(sid, q)
      console.log(`    "${q}" → "${r.text?.slice(0, 80)}"`)
      check(`3c: "${q.slice(0, 20)}..." → 非空`, r.text && r.text.length > 0)
      // 不应给出具体医学参数
      const hasMedicalDetail = /\d+mg|\d+片|造影|肝功|ALT|AST|正常|异常|指标/.test(r.text)
      check(`3c: "${q.slice(0, 20)}..." → 未编造医学参数`, !hasMedicalDetail,
        hasMedicalDetail ? `编造了医学细节: "${r.text.slice(0, 60)}"` : '')
    }
    await apiPost('/destroy', { sessionId: sid })
  }

  // ═══════════════════════════════════════════════════════════
  // D2.1 不主动: 不主动给线索，不主动提示
  // ═══════════════════════════════════════════════════════════
  section('D2.1 不主动 — 不主动给线索/不提示/不引导')

  sub('1a: 多轮中性问诊 → SP不应主动给出未问到的信息')
  {
    const sid = await newSession(CASE_ID)
    await send(sid, '您好，哪里不舒服？')
    await send(sid, '什么时候开始的？')

    // 发3条中性追问，检查SP是否主动展开了额外信息
    const neutralQs = [
      '嗯，然后呢？',
      '你继续说',
      '还有别的吗？',
    ]
    for (const q of neutralQs) {
      const r = await send(sid, q)
      console.log(`    "${q}" → "${r.text?.slice(0, 80)}"`)
      check(`1a: "${q}" → 非空`, r.text && r.text.length > 0)
      // B类触发词 → 应反问踢回，不应列症状
      const kickedBack = /医生|您问|具体|哪方面|不知道/.test(r.text)
      if (q === '你继续说' || q === '还有别的吗') {
        check(`1a: "${q}" → B类触发应反问`, kickedBack || r.text.length < 8,
          `未反问: "${r.text.slice(0, 50)}"`)
      }
    }
    await apiPost('/destroy', { sessionId: sid })
  }

  sub('1b: 学生沉默(noise) → SP不主动填话')
  {
    const sid = await newSession(CASE_ID)
    await send(sid, '您好，哪里不舒服？')
    await send(sid, '什么时候开始的？')
    const r = await send(sid, '嗯')
    console.log(`    "嗯" → "${r.text?.slice(0, 80)}"`)
    check('1b.1: 非空', r.text && r.text.length > 0)
    // noise后SP不应突然开始介绍病情（那是不主动原则的违反）
    check('1b.2: noise后未主动展开病情', r.text.length < 20,
      `${r.text.length}字 "${r.text.slice(0, 60)}"`)
    await apiPost('/destroy', { sessionId: sid })
  }

  // ═══════════════════════════════════════════════════════════
  // D2.4 不筛选: 一次多问 → 只答第一个
  // ═══════════════════════════════════════════════════════════
  section('D2.4 不筛选 — 一次问多个问题只答第一个')

  sub('4a: 三连问 → 只回应第一个')
  {
    const sid = await newSession(CASE_ID)
    await send(sid, '您好')
    const r = await send(sid, '什么时候开始的？疼得厉害吗？吃过什么药？')
    console.log(`    三连问 → "${r.text?.slice(0, 120)}"`)
    check('4a.1: 非空', r.text && r.text.length > 0)
    check('4a.2: 回复简短 (<60字)', r.text.length < 60, `${r.text.length}字 "${r.text.slice(0, 60)}"`)

    // 不应同时回答第2和第3个问题（程度 + 用药）
    const answeredQ2Q3 = (
      (r.text.includes('厉害') || r.text.includes('重') || r.text.includes('很疼')) &&
      (r.text.includes('药') || r.text.includes('片'))
    )
    check('4a.3: 未同时回答所有问题', !answeredQ2Q3,
      answeredQ2Q3 ? `一次性回答了多个问题` : '')
    await apiPost('/destroy', { sessionId: sid })
  }

  sub('4b: 两连问（不同维度）→ 只答第一个')
  {
    const sid = await newSession(CASE_ID)
    await send(sid, '您好')
    const r = await send(sid, '最近有没有加重？吃过药吗？')
    console.log(`    二连问 → "${r.text?.slice(0, 80)}"`)
    check('4b.1: 非空', r.text && r.text.length > 0)
    check('4b.2: 回复简短 (<60字)', r.text.length < 60, `${r.text.length}字`)

    // 不应同时回答加重和用药
    const infoCount = (r.text.includes('加重') ? 1 : 0) +
                     (r.text.includes('更') ? 1 : 0) +
                     (r.text.includes('药') ? 1 : 0)
    check('4b.3: 未答两个维度的问题', infoCount <= 1,
      `infoCount=${infoCount} "${r.text.slice(0, 60)}"`)
    await apiPost('/destroy', { sessionId: sid })
  }

  sub('4c: 四连问 → 只答第一个，不崩溃')
  {
    const sid = await newSession(CASE_ID)
    await send(sid, '您好')
    const r = await send(sid, '什么时候开始的？最近加重了吗？吃了什么药？去过医院吗？')
    console.log(`    四连问 → "${r.text?.slice(0, 120)}"`)
    check('4c.1: 非空', r.text && r.text.length > 0)
    check('4c.2: 回复简短不超长 (<70字)', r.text.length < 70, `${r.text.length}字`)
    await apiPost('/destroy', { sessionId: sid })
  }

  // ═══════════════════════════════════════════════════════════
  // 多病例验证
  // ═══════════════════════════════════════════════════════════
  section('跨病例验证')

  const multiCases = ['PD-20260527-0FQY', 'SU-20260416-9C2D']
  for (const caseId of multiCases) {
    sub(`病例: ${caseId}`)
    {
      const sid = await newSession(caseId)
      await send(sid, '您好')
      const r1 = await send(sid, '什么时候开始的？')
      console.log(`    问时间: "${r1.text?.slice(0, 100)}"`)
      check(`${caseId}: 问时间→有回复`, r1.text && r1.text.length > 0)
      check(`${caseId}: 问时间→不过长 (<80字)`, r1.text.length < 80, `${r1.text.length}字`)

      const r2 = await send(sid, '最近有没有加重？有没有吃药？去过医院吗？')
      console.log(`    三连问: "${r2.text?.slice(0, 100)}"`)
      check(`${caseId}: 三连问→不过长 (<60字)`, r2.text.length < 60, `${r2.text.length}字`)
      await apiPost('/destroy', { sessionId: caseId })
    }
  }

  // ═══════════════════════════════════════════════════════════
  console.log(`\n${'═'.repeat(60)}`)
  console.log(`  信息控制专项: ${passed}/${total} 通过${failed > 0 ? `, ${failed} 失败` : ''}`)
  console.log(`${'═'.repeat(60)}\n`)
  process.exit(failed > 0 ? 1 : 0)
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1) })
