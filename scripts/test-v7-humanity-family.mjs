// ═══════════════════════════════════════════════════════════════
// v7 人文沟通 Family 角色专项测试
// 验证：人文沟通模式中 family 角色的转述行为、情绪反应、trigger注入
// 用法: node scripts/test-v7-humanity-family.mjs
// 前提: sp-api 服务已启动在 5100 端口
// 病例: PD-20260527-0FQY（儿童糖尿病/母亲角色/诊断告知场景）
// ═══════════════════════════════════════════════════════════════

const API = 'http://localhost:5100/api/sp'
const CASE_ID = 'PD-20260527-0FQY'

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

// 人文沟通模式：不传 mode，让后端从 humanity.json 自动检测
async function newHumanitySession() {
  const cfg = await apiPost('/configure', {
    caseId: CASE_ID,
    config: { emotionEnabled: true }
  })
  if (!cfg.ok) throw new Error(`Configure failed: ${cfg.error}`)
  return cfg.sessionId
}

async function send(sid, text) {
  return apiPost('/message', { sessionId: sid, text })
}

// 第三人称标记
const THIRD_PERSON = /他|她|孩子|我家|宝宝|小家伙|儿子|女儿/
// 第一人称症状描述（family不应使用）
const FIRST_PERSON_SYMPTOM = /我.*疼|我.*痛|我.*渴|我.*晕|我.*吐|我.*烧|我.*闷|我的.*不舒服|我感觉.*症状/
// 延续性语境标记（H4规则要求）
const CONTINUITY_MARKERS = /之前|上次|您不是|不是.*查过|前面.*说过|刚.*说过|跟您.*说/

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗')
  console.log('║   v7 人文沟通 Family 角色专项                               ║')
  console.log('║   病例: PD-20260527-0FQY（儿童糖尿病/母亲角色）              ║')
  console.log('║   模式: humanistic-comm（诊断告知场景）                      ║')
  console.log('╚══════════════════════════════════════════════════════════════╝')

  try {
    const hr = await fetch(`${API}/health`)
    const health = await hr.json()
    console.log(`  服务: ✅ | 模型: ${health.model}\n`)
  } catch {
    console.error('  ❌ sp-api 服务未启动！')
    process.exit(1)
  }

  // ═══════════════════════════════════════════════════════════
  // H1: 场景开场 — SP应直接进入话题，不是初诊寒暄
  // ═══════════════════════════════════════════════════════════
  section('H1 场景开场 — 延续性语境，非初诊模式')

  sub('开场: 学生打招呼 → SP不应从头汇报病史')
  {
    const sid = await newHumanitySession()
    const r = await send(sid, '您好，我是主治医生。')
    console.log(`    "您好" → "${r.text?.slice(0, 120)}"`)
    check('H1.1: 非空', r.text && r.text.length > 0)
    // 人文沟通开场不应是初诊风格（"我是来看病的""我叫×××"）
    const isFirstVisit = /我是来看病的|我.*不舒服|我叫/.test(r.text)
    check('H1.2: 非初诊开场（无"我是来看病的"等）', !isFirstVisit,
      isFirstVisit ? `初诊风格: "${r.text.slice(0, 60)}"` : '')
    // 应围绕场景目标（诊断告知），不应从头说病史
    const fullHistory = /两个星期|最近.*喝水|从小/.test(r.text)
    check('H1.3: 未从头汇报病史', !fullHistory || r.text.length < 30,
      fullHistory ? `汇报病史: "${r.text.slice(0, 80)}"` : '')
    await apiPost('/destroy', { sessionId: sid })
  }

  // ═══════════════════════════════════════════════════════════
  // D1.2a: Family 角色视角 — 人文沟通模式下仍用第三人称
  // ═══════════════════════════════════════════════════════════
  section('H-D1.2a 角色视角 — 人文沟通中 family 仍用第三人称转述')

  sub('视角: 问孩子情况 → 用"他/孩子"转述，不用"我"')
  {
    const sid = await newHumanitySession()
    await send(sid, '您好，我是主治医生。')
    const r = await send(sid, '孩子最近具体是什么表现？')
    console.log(`    "孩子表现？" → "${r.text?.slice(0, 120)}"`)
    check('视角.1: 非空', r.text && r.text.length > 0)
    check('视角.2: 未用第一人称描述症状', !FIRST_PERSON_SYMPTOM.test(r.text),
      FIRST_PERSON_SYMPTOM.test(r.text) ? `用了第一人称: "${r.text.slice(0, 60)}"` : '')
    // 人文沟通中 family 描述时应保持第三人称
    console.log(`    第三人称: ${THIRD_PERSON.test(r.text) ? 'YES' : 'NO (可能是省略主语)'}`)
    await apiPost('/destroy', { sessionId: sid })
  }

  // ═══════════════════════════════════════════════════════════
  // D1.2c: 家属情绪 — 预后担忧在人文沟通中也应触发情绪
  // ═══════════════════════════════════════════════════════════
  section('H-D1.2c 家属情绪 — 人文沟通中预后担忧仍触发情绪波动')

  sub('情绪: 问预后 → fear/sadness≥1')
  {
    const sid = await newHumanitySession()
    await send(sid, '您好，我是主治医生。')
    await send(sid, '检查结果出来了，孩子的血糖很高。')
    const r = await send(sid, '这病会不会影响孩子一辈子？')
    console.log(`    "会不会影响一辈子？" → "${r.text?.slice(0, 120)}"`)
    check('情绪.1: 非空', r.text && r.text.length > 0)
    console.log(`    情绪: state=${r.emotion?.state} fear=${r.emotion?.fear?.toFixed(1)} sadness=${r.emotion?.sadness?.toFixed(1)}`)
    const hasEmotion = (r.emotion?.fear || 0) >= 1 || (r.emotion?.sadness || 0) >= 1
    check('情绪.2: 预后担忧→有情绪波动(fear或sadness≥1)', hasEmotion,
      `fear=${r.emotion?.fear?.toFixed(1)} sadness=${r.emotion?.sadness?.toFixed(1)}`)
    await apiPost('/destroy', { sessionId: sid })
  }

  // ═══════════════════════════════════════════════════════════
  // H4: 延续性语境 — 病史问题应以延续性方式回答
  // ═══════════════════════════════════════════════════════════
  section('H4 延续性语境 — 病史问题不以初诊方式回答')

  sub('延续: 问病史细节 → 应有延续性措辞')
  {
    const sid = await newHumanitySession()
    await send(sid, '您好，我是主治医生。')
    await send(sid, '孩子的检查结果出来了，血糖确实很高。')
    const r = await send(sid, '他喝水多的情况是什么时候开始的？')
    console.log(`    "什么时候开始的？" → "${r.text?.slice(0, 120)}"`)
    check('延续.1: 非空', r.text && r.text.length > 0)
    // 人文沟通中回答病史问题应更自然（不要求必须说"之前说过"，但至少不应像初诊）
    // 这是一个观察项，通过即可
    check('延续.2: 回复不过长 (<100字)', r.text.length < 100, `${r.text.length}字`)
    console.log(`    延续性措辞: ${CONTINUITY_MARKERS.test(r.text) ? 'YES' : 'NO (观察项)'}`)
    await apiPost('/destroy', { sessionId: sid })
  }

  // ═══════════════════════════════════════════════════════════
  // Trigger 注入验证 — B-trigger 在人文沟通中仍踢回
  // ═══════════════════════════════════════════════════════════
  section('Trigger注入 — B类踢回在人文沟通中仍生效')

  sub('B-trigger: "然后呢" → 应反问踢回')
  {
    const sid = await newHumanitySession()
    await send(sid, '您好，我是主治医生。')
    await send(sid, '孩子的检查结果出来了。')
    const r = await send(sid, '然后呢？')
    console.log(`    "然后呢？" → "${r.text?.slice(0, 80)}"`)
    check('B-trigger.1: 非空', r.text && r.text.length > 0)
    const kickedBack = /医生|您问|具体|哪方面/.test(r.text)
    check('B-trigger.2: B类触发后反问踢回', kickedBack || r.text.length < 8,
      `未反问: "${r.text.slice(0, 50)}"`)
    await apiPost('/destroy', { sessionId: sid })
  }

  sub('多问检测: "加重了吗？吃药了吗？" → 只答第一问')
  {
    const sid = await newHumanitySession()
    await send(sid, '您好，我是主治医生。')
    await send(sid, '检查结果显示孩子血糖很高。')
    const r = await send(sid, '最近有加重吗？吃过药吗？')
    console.log(`    二连问 → "${r.text?.slice(0, 80)}"`)
    check('多问.1: 非空', r.text && r.text.length > 0)
    const infoCount = (r.text.includes('加重') ? 1 : 0) + (r.text.includes('更') ? 1 : 0) + (r.text.includes('药') ? 1 : 0)
    check('多问.2: 未答两个维度的问题', infoCount <= 1,
      `infoCount=${infoCount} "${r.text.slice(0, 60)}"`)
    await apiPost('/destroy', { sessionId: sid })
  }

  // ═══════════════════════════════════════════════════════════
  // 综合: 多轮人文沟通 — 持续保持family视角+情绪
  // ═══════════════════════════════════════════════════════════
  section('综合 — 多轮人文沟通持续保持角色')

  sub('多轮: 诊断告知完整流程')
  {
    const sid = await newHumanitySession()
    await send(sid, '您好，我是主治医生。')
    const r1 = await send(sid, '根据检查结果，孩子确诊是1型糖尿病。')
    console.log(`    告知诊断 → "${r1.text?.slice(0, 100)}"`)
    check('综合.1: 告知诊断→非空', r1.text && r1.text.length > 0)
    console.log(`      情绪: state=${r1.emotion?.state} fear=${r1.emotion?.fear?.toFixed(1)} sadness=${r1.emotion?.sadness?.toFixed(1)}`)
    // 诊断告知时应有情绪反应（fear/sadness 非0 或 state 非 calm）
    const hasShock = (r1.emotion?.fear || 0) + (r1.emotion?.sadness || 0) >= 0.5
    check('综合.2: 诊断告知→有情绪波动', hasShock,
      `fear=${r1.emotion?.fear?.toFixed(1)} sadness=${r1.emotion?.sadness?.toFixed(1)}`)

    const r2 = await send(sid, '这不是您的错，1型糖尿病是自身免疫导致的，跟喝饮料没有关系。')
    console.log(`    解释病因 → "${r2.text?.slice(0, 100)}"`)
    check('综合.3: 解释病因→非空', r2.text && r2.text.length > 0)
    // 安抚后情绪应有所缓和
    console.log(`      情绪: state=${r2.emotion?.state} fear=${r2.emotion?.fear?.toFixed(1)}`)

    // 家属追问预后
    const r3 = await send(sid, '那以后要一直打胰岛素吗？会不会影响他上学？')
    console.log(`    追问预后 → "${r3.text?.slice(0, 100)}"`)
    check('综合.4: 追问预后→非空', r3.text && r3.text.length > 0)
    // 预后问题应触发情绪
    const hasPrognosisEmotion = (r3.emotion?.fear || 0) >= 1 || (r3.emotion?.sadness || 0) >= 1
    check('综合.5: 预后追问→有情绪(fear或sadness≥1)', hasPrognosisEmotion,
      `fear=${r3.emotion?.fear?.toFixed(1)} sadness=${r3.emotion?.sadness?.toFixed(1)}`)
    await apiPost('/destroy', { sessionId: sid })
  }

  // ═══════════════════════════════════════════════════════════
  console.log(`\n${'═'.repeat(60)}`)
  console.log(`  人文沟通 Family 角色: ${passed}/${total} 通过${failed > 0 ? `, ${failed} 失败` : ''}`)
  console.log(`${'═'.repeat(60)}\n`)
  process.exit(failed > 0 ? 1 : 0)
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1) })
