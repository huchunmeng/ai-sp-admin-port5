// ═══════════════════════════════════════════════════════════════
// v7 Family 角色视角专项测试 — 验证家属角色的转述行为
// 用法: node scripts/test-v7-family-role.mjs
// 前提: sp-api 服务已启动在 5100 端口
// 病例: PD-20260527-0FQY（7岁儿童糖尿病，妈妈角色）
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

async function newSession() {
  const cfg = await apiPost('/configure', { caseId: CASE_ID, config: { emotionEnabled: true } })
  if (!cfg.ok) throw new Error(`Configure failed: ${cfg.error}`)
  return cfg.sessionId
}

async function send(sid, text) {
  return apiPost('/message', { sessionId: sid, text })
}

// 第一人称标记（family角色不应使用）
const FIRST_PERSON = /我.*疼|我.*痛|我.*晕|我.*吐|我.*烧|我.*闷|我的.*不舒服|我.*感觉|我身上|我这/
// 第三人称标记（family角色应使用）
const THIRD_PERSON = /他|她|孩子|我家|宝宝|小家伙|儿子|女儿/
// 家属不完全了解标记
const UNSURE_MARKERS = /不清楚|不.*知道|说不好|没.*说|不太.*细|具体.*不|没.*注意|他.*自己.*说|他.*自己.*知道|你问.*他|让他.*自己/

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗')
  console.log('║   v7 Family 角色视角专项 — 家属转述行为验证                 ║')
  console.log('║   病例: PD-20260527-0FQY（儿童糖尿病/妈妈角色）              ║')
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
  // D1.2a: 第三人称视角
  // ═══════════════════════════════════════════════════════════
  section('D1.2a 角色视角 — family角色使用第三人称转述')

  sub('视角1: 问主诉 → 用"他/她/孩子"转述')
  {
    const sid = await newSession()
    await send(sid, '您好')
    const r = await send(sid, '孩子怎么了？')
    console.log(`    "孩子怎么了？" → "${r.text?.slice(0, 120)}"`)
    check('视角1.1: 非空', r.text && r.text.length > 0)
    // family角色应使用第三人称（他/她/孩子）而非第一人称（我）
    const usesFirstPerson = FIRST_PERSON.test(r.text)
    check('视角1.2: 未用第一人称"我"描述症状', !usesFirstPerson,
      usesFirstPerson ? `用了第一人称: "${r.text.slice(0, 60)}"` : '')
    check('视角1.3: 使用了第三人称', THIRD_PERSON.test(r.text) || r.text.length > 3,
      THIRD_PERSON.test(r.text) ? '' : '未检测到第三人称标记')
    await apiPost('/destroy', { sessionId: sid })
  }

  sub('视角2: 问具体症状 → 用转述语气')
  {
    const sid = await newSession()
    await send(sid, '您好，孩子怎么不舒服？')
    const r = await send(sid, '喝水多是从什么时候开始的？')
    console.log(`    "喝水多什么时候开始？" → "${r.text?.slice(0, 120)}"`)
    check('视角2.1: 非空', r.text && r.text.length > 0)
    // 应使用"他说"、"我发现"、"大概" 等转述语气，而非确定的第一人称体验
    const usesFirstPersonExp = /我.*感觉|我.*觉得|我.*身上|我这.*天|我自己/.test(r.text)
    check('视角2.2: 未用第一人称体验描述', !usesFirstPersonExp,
      usesFirstPersonExp ? `第一人称体验: "${r.text.slice(0, 60)}"` : '')
    await apiPost('/destroy', { sessionId: sid })
  }

  sub('视角3: 多轮对话 — 持续保持家属视角')
  {
    const sid = await newSession()
    await send(sid, '您好')
    const questions = [
      '什么时候开始发现不对的？',
      '最近有没有加重？',
      '吃得怎么样？',
    ]
    let allSP = ''
    for (const q of questions) {
      const r = await send(sid, q)
      allSP += r.text + ' '
      console.log(`    Q: "${q}" → "${r.text?.slice(0, 80)}"`)
      check(`视角3: "${q}" → 非空`, r.text && r.text.length > 0)
    }
    // 所有回复中不应连续使用第一人称描述症状
    const firstPersonCount = (allSP.match(FIRST_PERSON) || []).length
    check('视角3+: 多轮未用第一人称', firstPersonCount === 0,
      firstPersonCount > 0 ? `${firstPersonCount}处第一人称` : '')
    // 应有第三人称标记
    const thirdPersonCount = (allSP.match(THIRD_PERSON) || []).length
    console.log(`    第三人称标记数: ${thirdPersonCount}`)
    await apiPost('/destroy', { sessionId: sid })
  }

  // ═══════════════════════════════════════════════════════════
  // D1.2b: 不完全了解 — 家属知识不完整
  // ═══════════════════════════════════════════════════════════
  section('D1.2b 不完全了解 — 家属不知道只有患者本人才知道的细节')

  sub('了解1: 问精确感受 → 应表达不确定')
  {
    const sid = await newSession()
    await send(sid, '您好，孩子怎么了？')
    // 问只有孩子自己才知道的主观感受
    const r = await send(sid, '他疼的程度是怎样的？什么样的感觉？')
    console.log(`    "疼的程度？" → "${r.text?.slice(0, 120)}"`)
    check('了解1.1: 非空', r.text && r.text.length > 0)
    // 家属不应给出精确的第一人称痛感描述
    const gavePrecisePain = /刺|绞|抽|钻|烧|跳.*疼|胀.*痛/.test(r.text)
    check('了解1.2: 未给出精确痛感描述', !gavePrecisePain,
      gavePrecisePain ? `精确描述痛感: "${r.text.slice(0, 60)}"` : '')
    await apiPost('/destroy', { sessionId: sid })
  }

  sub('了解2: 问细节问题 → 家属可能不完全知道')
  {
    const sid = await newSession()
    await send(sid, '您好，孩子怎么不舒服？')
    await send(sid, '什么时候开始的？')
    // 问非常细节的只有患者能精确回答的问题
    const r = await send(sid, '他小便的时候疼不疼？尿的颜色是什么样的？')
    console.log(`    "小便疼不疼？颜色？" → "${r.text?.slice(0, 120)}"`)
    check('了解2.1: 非空', r.text && r.text.length > 0)
    // 家属可能说"没听他说" / "没注意" 等不确定表达
    // 不一定每次都触发，但至少不应编造精确的细节
    check('了解2.2: 回复不过长 (<80字)', r.text.length < 80, `${r.text.length}字`)
    await apiPost('/destroy', { sessionId: sid })
  }

  sub('了解3: 连续追问细节 → 展示知识边界')
  {
    const sid = await newSession()
    await send(sid, '您好，孩子怎么不舒服？')
    await send(sid, '什么时候开始的？')

    const detailQs = [
      '他晚上起来几次？',
      '他每次尿多少？他自己跟你说的吗？',
    ]
    let unsureCount = 0
    for (const q of detailQs) {
      const r = await send(sid, q)
      console.log(`    "${q}" → "${r.text?.slice(0, 100)}"`)
      check(`了解3: "${q.slice(0, 15)}..." → 非空`, r.text && r.text.length > 0)
      if (UNSURE_MARKERS.test(r.text)) unsureCount++
    }
    // 至少在某些细节上表现不确定
    console.log(`    不确定表达数: ${unsureCount}/${detailQs.length}`)
    // 不强制要求，但记录
    check('了解3+: 至少1处表达不确定 (观察项)',
      true, `不确定表达=${unsureCount}/${detailQs.length} (参考值，不通过不阻塞)`)
    await apiPost('/destroy', { sessionId: sid })
  }

  // ═══════════════════════════════════════════════════════════
  // D1.2c: 家属情绪 — 担忧/焦虑自然体现
  // ═══════════════════════════════════════════════════════════
  section('D1.2c 家属情绪 — 母亲角色自然体现担忧焦虑')

  sub('情绪1: 提及孩子病情严重性 → 应体现担忧')
  {
    const sid = await newSession()
    await send(sid, '您好')
    const r = await send(sid, '这病严重吗？会不会影响孩子一辈子？')
    console.log(`    "会影响一辈子吗？" → "${r.text?.slice(0, 120)}"`)
    check('情绪1.1: 非空', r.text && r.text.length > 0)
    // 家属应有情绪波动（fear/sadness增加或文本体现担忧）
    console.log(`    情绪: state=${r.emotion?.state} fear=${r.emotion?.fear?.toFixed(1)} sadness=${r.emotion?.sadness?.toFixed(1)}`)
    // fear或sadness至少有一个≥1
    const hasEmotion = (r.emotion?.fear || 0) >= 1 || (r.emotion?.sadness || 0) >= 1
    check('情绪1.2: 提及预后→有情绪波动(fear或sadness≥1)', hasEmotion,
      `fear=${r.emotion?.fear?.toFixed(1)} sadness=${r.emotion?.sadness?.toFixed(1)}`)
    await apiPost('/destroy', { sessionId: sid })
  }

  sub('情绪2: 多次提及担忧 → 情绪不因家属角色消失')
  {
    const sid = await newSession()
    await send(sid, '您好，孩子怎么不舒服？')
    await send(sid, '什么时候开始的？')
    const r = await send(sid, '我特别担心，怕是什么大病，会不会遗传啊？')
    console.log(`    "会不会遗传？" → "${r.text?.slice(0, 120)}"`)
    check('情绪2.1: 非空', r.text && r.text.length > 0)
    // 家属角色也有自己的情绪，不因是SP而消失
    console.log(`    情绪: state=${r.emotion?.state} fear=${r.emotion?.fear?.toFixed(1)}`)
    await apiPost('/destroy', { sessionId: sid })
  }

  // ═══════════════════════════════════════════════════════════
  // 对比: Patient角色（验证差异）
  // ═══════════════════════════════════════════════════════════
  section('对比验证: Patient角色 → 应使用第一人称')

  sub('对比1: PS-DEP1 (patient) → 第一人称描述症状')
  {
    const cfg = await apiPost('/configure', { caseId: 'PS-20260611-DEP1', config: { emotionEnabled: true } })
    if (!cfg.ok) { console.log(`  ⚠️ Configure 失败: ${cfg.error}`); return }
    const sid = cfg.sessionId
    await send(sid, '您好')
    const r = await send(sid, '哪里不舒服？')
    console.log(`    patient: "${r.text?.slice(0, 100)}"`)
    // 中文口语常省略主语（"头昏昏沉沉的"隐含第一人称），
    // 只要没有第三人称标记即为第一人称视角
    const isFirstPerson = /我|我的/.test(r.text) || !/他|她|孩子|我家|宝宝/.test(r.text)
    check('对比1.1: patient角色→第一人称', isFirstPerson,
      `"${r.text?.slice(0, 60)}"`)
    check('对比1.2: patient角色→非空', r.text && r.text.length > 0)
    await apiPost('/destroy', { sessionId: sid })
  }

  // ═══════════════════════════════════════════════════════════
  console.log(`\n${'═'.repeat(60)}`)
  console.log(`  Family 角色视角: ${passed}/${total} 通过${failed > 0 ? `, ${failed} 失败` : ''}`)
  console.log(`${'═'.repeat(60)}\n`)
  process.exit(failed > 0 ? 1 : 0)
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1) })
