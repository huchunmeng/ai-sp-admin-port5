// ═══════════════════════════════════════════════════════════════
// intent / emotion_score 审查脚本（使用真实的 production 模块）
// 用法: node scripts/audit-intent.mjs [CASE_ID]
// ═══════════════════════════════════════════════════════════════

import { callLLM, setLLMBase, loadPrompt } from '../packages/shared/src/llm-client.js'
import { repairJSON } from '../packages/shared/src/emotion-engine.js'

const BASE = 'http://localhost:5001'
setLLMBase(BASE)

// ── 测试矩阵：7种intent × 多个变体 ──

const TEST_MATRIX = [
  // ── friendly 打招呼/安抚/道歉 ──
  { intent: 'friendly', phrase: '你好', note: '标准打招呼' },
  { intent: 'friendly', phrase: '您好医生', note: '尊称打招呼' },
  { intent: 'friendly', phrase: '大夫好', note: '简称打招呼' },
  { intent: 'friendly', phrase: '对不起', note: '简洁道歉' },
  { intent: 'friendly', phrase: '抱歉，我态度不好', note: '认错' },
  { intent: 'friendly', phrase: '别担心，慢慢说', note: '安抚' },
  { intent: 'friendly', phrase: '我理解，你辛苦了', note: '共情' },

  // ── neutral 中性专业提问 ──
  { intent: 'neutral', phrase: '你哪儿不舒服', note: '开放问诊' },
  { intent: 'neutral', phrase: '发烧几天了', note: '具体追问' },
  { intent: 'neutral', phrase: '最近有没有吃什么药', note: '用药询问' },
  { intent: 'neutral', phrase: '家里人有类似的病吗', note: '家族史' },

  // ── noise 敷衍/沉默 ──
  { intent: 'noise', phrase: '嗯', note: '单字敷衍' },
  { intent: 'noise', phrase: '哦', note: '单字冷漠' },

  // ── offensive 催促/轻视/冷漠命令 ──
  { intent: 'offensive', phrase: '说下去', note: '指令式漠然' },
  { intent: 'offensive', phrase: '快点说', note: '直接催促' },
  { intent: 'offensive', phrase: '直接讲重点', note: '跳过铺垫' },
  { intent: 'offensive', phrase: '别绕弯子', note: '不耐烦' },
  { intent: 'offensive', phrase: '长话短说', note: '要求精简' },
  { intent: 'offensive', phrase: '装的吧', note: '质疑装病' },
  { intent: 'offensive', phrase: '这点事至于吗', note: '轻视病情' },
  { intent: 'offensive', phrase: '想多了吧', note: '否定感受' },
  { intent: 'offensive', phrase: '哪有那么严重', note: '弱化症状' },

  // ── attack 辱骂/人身攻击 ──
  { intent: 'attack', phrase: '你傻子吗', note: '直接辱骂' },
  { intent: 'attack', phrase: '滚', note: '驱赶' },
  { intent: 'attack', phrase: '闭嘴', note: '喝止' },
  { intent: 'attack', phrase: '你会不会说话', note: '质疑能力' },
]

// ── 主流程 ──

async function main() {
  const caseId = process.argv[2] || 'PD-20260527-0FQY'

  console.log('════════════════════════════════════════════════════════════')
  console.log(`  intent/emotion 审查 — ${caseId}`)
  console.log('════════════════════════════════════════════════════════════')

  // 加载系统提示词
  const basePrompt = await loadPrompt('0601-sp-system.txt')
  console.log(`系统提示词: ${basePrompt.length} 字符`)

  // 加载病例数据
  const basicResp = await fetch(`${BASE}/data/cases/${caseId}-basic.json`)
  if (!basicResp.ok) { console.error('病例加载失败'); process.exit(1) }
  const caseData = await basicResp.json()

  // 构建角色描述
  const patient = caseData.patientInfo || {}
  const roleDesc = [
    `你是${patient.name || '患者'}，${patient.age || ''}岁${patient.sex || ''}。`,
    caseData.chiefComplaint || '',
    caseData.selfNarration || '',
  ].filter(Boolean).join(' ')

  console.log(`病例: ${caseId} | ${caseData.specialty || ''}`)
  console.log(`角色: ${patient.name || ''} | ${roleDesc.slice(0, 80)}...`)
  console.log('')

  // 逐条测试
  const results = []
  let passCount = 0
  let failCount = 0

  for (let i = 0; i < TEST_MATRIX.length; i++) {
    const test = TEST_MATRIX[i]
    const idx = i + 1

    // 构建系统提示词（简化版，不包含完整情绪引擎）
    const system = basePrompt
      .replace('{{role_description}}', roleDesc)
      .replace('{{behavior_instruction}}', '状态：calm。保持平静、合作。')
      .replace('{{symptom_pool}}', '')
      .replace('{{knowledge_boundary}}', '')
      .replace('{{psychological_stages_text}}', '')
      .replace('{{humanity_scenario_text}}', '')
      .replace('{{conversation_context}}', `考生：${test.phrase}`)

    const messages = [
      { role: 'user', content: test.phrase }
    ]

    let result
    try {
      const raw = await callLLM(messages, system)
      const jsonStr = repairJSON(raw)
      const parsed = JSON.parse(jsonStr)

      result = {
        id: idx,
        expectedIntent: test.intent,
        actualIntent: parsed.intent || '?',
        emotion: parsed.emotion_score || {},
        text: (parsed.text || '').slice(0, 60),
        phrase: test.phrase,
        note: test.note,
      }
    } catch (e) {
      result = {
        id: idx,
        expectedIntent: test.intent,
        actualIntent: 'PARSE_ERROR',
        emotion: {},
        text: e.message.slice(0, 60),
        phrase: test.phrase,
        note: test.note,
      }
    }

    // 判断
    result.match = result.actualIntent === test.intent
    if (result.match) passCount++
    else failCount++

    results.push(result)

    // 逐行输出
    const mark = result.match ? '✅' : '❌'
    const emoStr = JSON.stringify(result.emotion)
    console.log(`[${String(idx).padStart(2)}] ${mark} ${result.expectedIntent.padEnd(12)} → ${String(result.actualIntent).padEnd(12)} | ${result.phrase.padEnd(18)} | ${emoStr}`)

    // 情绪异常检测
    const angry = result.emotion.anger
    if (test.intent === 'friendly' && angry > 1) {
      console.log(`     ⚠️ 打招呼不应产生愤怒 (angry=${angry})`)
    }
    if (test.intent === 'neutral' && angry > 2) {
      console.log(`     ⚠️ 中性提问angry偏高 (angry=${angry})`)
    }
    if (test.intent === 'attack' && (angry === undefined || angry < 3)) {
      console.log(`     ⚠️ 攻击意图angry偏低 (angry=${angry})`)
    }
    if (test.intent === 'friendly' && angry > 8) {
      console.log(`     ⚠️ 被安抚后angry仍极高 (angry=${angry})`)
    }

    // 避免请求太快
    await new Promise(r => setTimeout(r, 200))
  }

  // ── 汇总 ──
  console.log('')
  console.log('════════════════════════════════════════════════════════════')
  console.log(`  汇总: ${passCount}通过 / ${failCount}失败 / ${results.length}总计`)
  console.log('════════════════════════════════════════════════════════════')

  // 按intent分组统计
  const byIntent = {}
  for (const r of results) {
    if (!byIntent[r.expectedIntent]) byIntent[r.expectedIntent] = { total: 0, pass: 0, failures: [] }
    byIntent[r.expectedIntent].total++
    if (r.match) byIntent[r.expectedIntent].pass++
    else byIntent[r.expectedIntent].failures.push(r)
  }

  console.log('')
  console.log('按意图分组:')
  for (const [intent, stat] of Object.entries(byIntent)) {
    const rate = ((stat.pass / stat.total) * 100).toFixed(0)
    const bar = stat.pass === stat.total ? '✅' : stat.pass === 0 ? '❌' : '⚠️'
    console.log(`  ${bar} ${intent.padEnd(12)} ${stat.pass}/${stat.total} (${rate}%)`)
    for (const f of stat.failures) {
      console.log(`     → "${f.phrase}" 被判为 "${f.actualIntent}"`)
    }
  }

  // 情绪异常汇总
  console.log('')
  console.log('情绪异常:')
  for (const r of results) {
    const a = r.emotion.anger
    const alerts = []
    if (r.expectedIntent === 'friendly' && a > 1) alerts.push(`打招呼anger=${a}`)
    if (r.expectedIntent === 'neutral' && a > 2) alerts.push(`中性anger偏高=${a}`)
    if (r.expectedIntent === 'attack' && (a === undefined || a < 3)) alerts.push(`攻击anger偏低=${a}`)
    if (r.expectedIntent === 'friendly' && a > 8) alerts.push(`安抚后anger极高=${a}`)
    for (const alert of alerts) {
      console.log(`  ⚠️ [${r.id}] ${r.phrase} → ${alert}`)
    }
  }

  console.log('')
  console.log('════════════════════════════════════════════════════════════')
}

main().catch(e => { console.error(e); process.exit(1) })
