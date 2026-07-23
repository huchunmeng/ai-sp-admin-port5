// 成绩报告 Part B 端到端测试
// 用法: node scripts/test-score-report.mjs [CASE_ID] [--http]
//       CASE_ID: 默认 IM-20260527-A9GW
//       --http:  通过 HTTP 调用（默认直接加载 analyzer）
//       --verbose: 显示 LLM 原始输出

import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

// ── 参数解析 ──
const args = process.argv.slice(2)
let CASE_ID = 'IM-20260527-A9GW'
let modeHttp = false
let verbose = false
for (const arg of args) {
  if (arg === '--http') modeHttp = true
  else if (arg === '--verbose' || arg === '-v') verbose = true
  else CASE_ID = arg
}

// ── 加载环境变量 ──
function loadEnv() {
  const envFile = resolve(ROOT, 'apps/training/.env.local')
  if (existsSync(envFile)) {
    const content = readFileSync(envFile, 'utf-8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue
      const idx = trimmed.indexOf('=')
      const key = trimmed.substring(0, idx).trim()
      const val = trimmed.substring(idx + 1).trim()
      if (!process.env[key]) process.env[key] = val
    }
  }
}

// ── 加载病例数据 ──
function loadCaseData(caseId) {
  const casesDir = resolve(ROOT, 'apps/admin/public/data/cases')
  const basicFile = resolve(casesDir, `${caseId}-basic.json`)
  if (!existsSync(basicFile)) throw new Error(`病例 ${caseId} 不存在: ${basicFile}`)
  const basic = JSON.parse(readFileSync(basicFile, 'utf-8'))
  return { basic }
}

// ── 构造模拟对话记录 ──
function buildMockRecords(caseData) {
  const basic = caseData.basic
  const pi = basic.patient_info || {}
  const name = pi.name || '患者'
  const age = pi.age || '?'
  const cc = basic.chief_complaint || '不适'

  return [
    { sequence: 1, speaker: 'doctor', content: `你好，请问怎么不舒服？` },
    { sequence: 2, speaker: 'patient', content: `${cc}，已经好几天了。`, type: 'subjective' },
    { sequence: 3, speaker: 'doctor', content: `具体是哪里不舒服？能指一下位置吗？` },
    { sequence: 4, speaker: 'patient', content: `就是这里（指着上腹部），闷闷的，有时候会疼。`, type: 'subjective' },
    { sequence: 5, speaker: 'doctor', content: `什么时候开始的？是突然开始的还是慢慢加重的？` },
    { sequence: 6, speaker: 'patient', content: `大概三天前开始的，慢慢加重的。一开始只是不太舒服，这两天越来越明显了。`, type: 'subjective' },
    { sequence: 7, speaker: 'doctor', content: `有没有恶心、呕吐、反酸？吃东西怎么样？` },
    { sequence: 8, speaker: 'patient', content: `吃饭没以前好了，有点反酸，吐过一次。`, type: 'subjective' },
    { sequence: 9, speaker: 'doctor', content: `大小便正常吗？` },
    { sequence: 10, speaker: 'patient', content: `有点便秘，两天没上厕所了。`, type: 'subjective' },
    { sequence: 11, speaker: 'doctor', content: `以前有过类似的情况吗？胃病、胃炎什么的？` },
    { sequence: 12, speaker: 'patient', content: `以前偶尔胃不舒服，吃点药就好了，从来没这么严重过。`, type: 'subjective' },
    { sequence: 13, speaker: 'doctor', content: `最近有没有吃过什么药？止痛药、感冒药之类的？` },
    { sequence: 14, speaker: 'patient', content: `吃过两次布洛芬，以为能止痛，但没什么用。`, type: 'subjective' },
    { sequence: 15, speaker: 'doctor', content: `有高血压、糖尿病或者其他慢性病吗？` },
    { sequence: 16, speaker: 'patient', content: `没有，身体一直挺好的。`, type: 'subjective' },
    { sequence: 17, speaker: 'doctor', content: `好的，还有什么不舒服想补充的吗？或者有什么问题想问？` },
    { sequence: 18, speaker: 'patient', content: `医生，我这个严重吗？会不会是胃癌啊？最近新闻上看到很多年轻人得胃癌的。`, type: 'emotional' },
    { sequence: 19, speaker: 'doctor', content: `不用太担心，初步看起来像是胃炎或者胃酸反流的问题。我们先做一些检查，不用往最坏处想。` },
    { sequence: 20, speaker: 'patient', content: `那好吧。`, type: 'subjective' },
  ]
}

// ── 验证响应结构 ──
function validateResult(result, label) {
  const checks = []
  const check = (ok, msg) => checks.push({ ok, msg })

  check(!!result, '结果非空')
  check(result.profile_type === 'history_taking', `profile_type正确: ${result.profile_type}`)

  // L1 coverage
  const cov = result.coverage
  check(!!cov, 'L1 coverage存在')
  if (cov) {
    check(typeof cov.total_key_points === 'number', `L1 total_key_points是数字: ${cov.total_key_points}`)
    check(typeof cov.covered === 'number', `L1 covered是数字: ${cov.covered}`)
    check(typeof cov.coverage_rate === 'number', `L1 coverage_rate: ${(cov.coverage_rate * 100).toFixed(0)}%`)
    check(Array.isArray(cov.key_points), 'L1 key_points是数组')
    check(Array.isArray(cov.missed_high_importance), 'L1 missed_high_importance是数组')
    check(typeof cov.narrative === 'string', 'L1 narrative存在')
  }

  // L2 strategy
  const strat = result.strategy
  check(!!strat, 'L2 strategy存在')
  if (strat) {
    const validTypes = ['hypothesis_driven', 'template_driven', 'random_jumping']
    check(validTypes.includes(strat.type), `L2 type合法: ${strat.type}`)
    check(typeof strat.narrative === 'string', 'L2 narrative存在')
  }

  // L3 hypothesis_activity
  const ha = result.hypothesis_activity
  check(!!ha, 'L3 hypothesis_activity存在')
  if (ha) {
    check(Array.isArray(ha.initial_hypotheses), 'L3 initial_hypotheses是数组')
    check(Array.isArray(ha.hypothesis_evolution), 'L3 hypothesis_evolution是数组')
    check(Array.isArray(ha.cognitive_biases), 'L3 cognitive_biases是数组')
    check(typeof ha.reasoning_mode === 'string', `L3 reasoning_mode: ${ha.reasoning_mode}`)
    check(typeof ha.narrative === 'string', 'L3 narrative存在')
  }

  // L4 safety
  const sf = result.safety
  check(!!sf, 'L4 safety存在')
  if (sf) {
    check(typeof sf.red_flags_total === 'number', `L4 red_flags_total: ${sf.red_flags_total}`)
    check(typeof sf.screening_rate === 'number', `L4 screening_rate: ${(sf.screening_rate * 100).toFixed(0)}%`)
    check(typeof sf.narrative === 'string', 'L4 narrative存在')
  }

  // L5 relationship
  const rel = result.relationship
  check(!!rel, 'L5 relationship存在')
  if (rel) {
    check(typeof rel.emotional_cues_total === 'number', `L5 emotional_cues_total: ${rel.emotional_cues_total}`)
    check(typeof rel.response_rate === 'number', `L5 response_rate: ${(rel.response_rate * 100).toFixed(0)}%`)
    if (Array.isArray(rel.emotional_cues)) {
      const responded = rel.emotional_cues.filter(c => c.response_quality !== 'missed').length
      check(true, `L5 情感线索: ${rel.emotional_cues_total}个, 回应了${responded}个`)
    }
    check(typeof rel.narrative === 'string', 'L5 narrative存在')
  }

  // 跨层
  check(Array.isArray(result.intra_profile_patterns), 'intra_profile_patterns是数组')
  check(Array.isArray(result.cross_profile_leads), 'cross_profile_leads是数组')
  check(typeof result.limitations === 'string', 'limitations存在')

  const passed = checks.filter(c => c.ok).length
  const total = checks.length
  console.log(`\n${label ? `[${label}] ` : ''}结构校验: ${passed}/${total} 通过`)
  const failed = checks.filter(c => !c.ok)
  for (const f of failed) {
    console.log(`  ✗ ${f.msg}`)
  }
  return { passed, total, failed }
}

// ── 打印结果摘要 ──
function printSummary(result) {
  console.log('\n══════ Part B 病史采集剖面分析 ══════')
  if (result.coverage) {
    console.log(`\n▸ L1 信息覆盖: ${(result.coverage.coverage_rate * 100).toFixed(0)}%`)
    console.log(`  已覆盖 ${result.coverage.covered}/${result.coverage.total_key_points} 个关键信息点`)
    if (result.coverage.missed_high_importance?.length) {
      console.log(`  遗漏高重要性: ${result.coverage.missed_high_importance.join('、')}`)
    }
    console.log(`  ${result.coverage.narrative}`)
  }

  if (result.strategy) {
    const typeMap = { hypothesis_driven: '假设驱动型', template_driven: '模板覆盖型', random_jumping: '随机跳跃型' }
    console.log(`\n▸ L2 行为策略: ${typeMap[result.strategy.type] || result.strategy.type}`)
    console.log(`  ${result.strategy.narrative}`)
  }

  if (result.hypothesis_activity) {
    const modeMap = { intuitive: '直觉型', analytical: '分析型', mixed: '混合型' }
    console.log(`\n▸ L3 认知过程: ${modeMap[result.hypothesis_activity.reasoning_mode] || result.hypothesis_activity.reasoning_mode}`)
    if (result.hypothesis_activity.premature_closure) {
      console.log('  ⚠ 检测到过早关闭')
    }
    for (const bias of (result.hypothesis_activity.cognitive_biases || [])) {
      console.log(`  ⚠ 偏误: ${bias.type} (严重度: ${bias.severity})`)
    }
    console.log(`  ${result.hypothesis_activity.narrative}`)
  }

  if (result.safety) {
    const patternMap = { active_screening: '主动筛查型', triggered_reactive: '触发反应型', safety_neglect: '安全忽视型' }
    console.log(`\n▸ L4 安全行为: ${patternMap[result.safety.safety_pattern] || result.safety.safety_pattern}`)
    console.log(`  红旗筛查: ${result.safety.red_flags_screened}/${result.safety.red_flags_total}`)
    console.log(`  ${result.safety.narrative}`)
  }

  if (result.relationship) {
    const qualityMap = { substantive: '实质性', superficial: '表面性', absent: '缺失' }
    console.log(`\n▸ L5 关系质量: 共情${qualityMap[result.relationship.empathy_quality] || result.relationship.empathy_quality}`)
    console.log(`  情感线索回应: ${result.relationship.emotional_cues_responded}/${result.relationship.emotional_cues_total}`)
    console.log(`  ${result.relationship.narrative}`)
  }

  if (result.cross_profile_leads?.length) {
    console.log(`\n▸ 跨剖面线索:`)
    for (const lead of result.cross_profile_leads) {
      console.log(`  → ${lead.to}: ${lead.question}`)
    }
  }

  if (result.intra_profile_patterns?.length) {
    console.log(`\n▸ 剖面内关联发现:`)
    for (const p of result.intra_profile_patterns) {
      console.log(`  • ${p}`)
    }
  }

  if (result.limitations) {
    console.log(`\n▸ 局限性声明: ${result.limitations}`)
  }
}

// ═══ 主流程 ═══
async function main() {
  console.log(`成绩报告 Part B 测试 | 病例: ${CASE_ID} | 模式: ${modeHttp ? 'HTTP' : '直接调用'}\n`)

  // 1. 加载病例
  console.log('1. 加载病例数据...')
  const caseData = loadCaseData(CASE_ID)
  const basic = caseData.basic
  console.log(`   病例: ${basic.title || basic.disease || CASE_ID}`)
  console.log(`   患者: ${basic.patient_info?.name || '?'} ${basic.patient_info?.age || '?'} ${basic.patient_info?.sex || '?'}`)
  console.log(`   主诉: ${basic.chief_complaint || '未记录'}`)

  // 2. 构造模拟对话
  console.log('\n2. 构造模拟对话...')
  const records = buildMockRecords(caseData)
  console.log(`   对话轮数: ${records.length}`)

  // 3. 执行分析
  console.log('\n3. 执行 Part B 分析 (可能需要 30-120 秒)...')

  if (modeHttp) {
    // HTTP 模式：需要 vite dev server 运行中
    const port = process.env.HTTP_PORT || '5001'
    const url = `http://localhost:${port}/api/score-report/analyze-profile`
    console.log(`   POST ${url}`)
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profileType: 'history_taking',
        records,
        caseInfo: {
          title: basic.title || basic.disease,
          chief_complaint: basic.chief_complaint,
          patient: basic.patient_info,
          specialty: basic.specialty,
          full_text: basic.full_text || basic.present_illness || ''
        }
      })
    })
    const json = await resp.json()
    if (!json.ok) throw new Error(json.error)
    const result = json.data
    validateResult(result, 'HTTP')
    printSummary(result)
  } else {
    // 直接模式
    loadEnv()
    const LLM_API_KEY = process.env.LLM_API_KEY
    const LLM_API_URL = process.env.LLM_API_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'
    const LLM_MODEL = process.env.LLM_MODEL || 'qwen-turbo'

    if (!LLM_API_KEY || LLM_API_KEY === 'your-api-key-here') {
      console.error('\n❌ 未配置 LLM_API_KEY。请在 apps/training/.env.local 中设置，或使用 --http 模式。')
      process.exit(1)
    }

    const analyzerUrl = pathToFileURL(resolve(ROOT, 'services/score-analyzer/src/index.js')).href
    const { analyzeHistoryTaking } = await import(analyzerUrl)

    const startTime = Date.now()
    const result = await analyzeHistoryTaking(
      { records, caseInfo: {
        title: basic.title || basic.disease,
        chief_complaint: basic.chief_complaint,
        patient: basic.patient_info,
        specialty: basic.specialty,
        full_text: basic.full_text || basic.present_illness || ''
      }},
      { apiUrl: LLM_API_URL, apiKey: LLM_API_KEY, model: LLM_MODEL }
    )
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
    console.log(`   LLM调用耗时: ${elapsed}s (模型: ${LLM_MODEL})`)

    if (verbose) {
      console.log('\n── LLM 原始输出 ──')
      console.log(JSON.stringify(result, null, 2))
    }

    validateResult(result, 'direct')
    printSummary(result)
  }

  console.log('\n✅ 测试完成')
}

main().catch(e => {
  console.error('\n❌ 测试失败:', e.message)
  process.exit(1)
})
