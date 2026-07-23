// ═══════════════════════════════════════════════════════════════
// 反思脑 POC 离线回放
// 逐轮展示: 学生说了什么 → 检测到什么事件 → 状态如何变化
// --debug: 显示 LLM 原始输出
// --md:    生成完整 Markdown 报告（含 System Prompt + User Message + 回放）
// ═══════════════════════════════════════════════════════════════

import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __scriptDir = dirname(fileURLToPath(import.meta.url))

// 加载 .env
const envPath = join(__scriptDir, '..', 'services', 'sp-api', '.env')
try {
  const envContent = readFileSync(envPath, 'utf-8')
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim()
      const val = trimmed.slice(eqIdx + 1).trim()
      if (!process.env[key]) process.env[key] = val
    }
  }
} catch (e) { /* ignore */ }

const { applyEvents } = await import('../services/sp-api/src/poc/event-mapping.js')
const { extractEvents } = await import('../services/sp-api/src/poc/reflection-worker-poc.js')
const { computeDerivedState } = await import('../services/sp-api/src/poc/derived-state.js')

const PROMPT_PATH = join(__scriptDir, '..', 'services', 'sp-api', 'src', 'poc', 'reflection-brain-prompt.txt')

// ═══════════════════════════════════════════════════════════════
// 测试对话场景
// ═══════════════════════════════════════════════════════════════

const SCENARIOS = {
  good_news: {
    name: '好消息+共情 — 担忧逐步解除',
    initialCM: {
      concern: { primary: '担心是癌症', intensity: 8 },
      trust: 5,
      unresolved_goals: ['是不是癌症', '能不能治好'],
      stuck_count: 0,
    },
    dialogue: [
      { round: 1, role: 'student', content: '您好，今天感觉怎么样？' },
      { round: 1, role: 'sp', content: '还行吧……就是心里还是不踏实，上次检查结果出来了吗？' },
      { round: 2, role: 'student', content: '出来了。我直接告诉您——不是癌症，是良性的结节，不用太担心。' },
      { round: 2, role: 'sp', content: '真的吗？！不是癌症？那我这个……会不会以后变坏？' },
      { round: 3, role: 'student', content: '良性的结节恶变概率很低，定期复查就可以了。您能放宽心。' },
      { round: 3, role: 'sp', content: '那就好……这段时间真把我吓坏了。' },
      { round: 4, role: 'student', content: '我理解，等待结果确实很难熬。您这段时间辛苦了。' },
      { round: 4, role: 'sp', content: '谢谢医生，您这么说我心里舒服多了。' },
    ],
  },

  avoidant: {
    name: '医生持续回避 — 不满升级',
    initialCM: {
      concern: { primary: '担心治不好', intensity: 7 },
      trust: 5,
      unresolved_goals: ['这个病能治好吗', '会不会影响工作'],
      stuck_count: 0,
    },
    dialogue: [
      { round: 1, role: 'student', content: '你好，说说你的情况吧。' },
      { round: 1, role: 'sp', content: '医生，我这个病到底能不能治好？我心里一直悬着。' },
      { round: 2, role: 'student', content: '你先别着急，我先了解下基本情况。什么时候开始的？' },
      { round: 2, role: 'sp', content: '上个月……医生，我就想知道严重不严重。' },
      { round: 3, role: 'student', content: '有没有做过什么检查？把结果给我看看。' },
      { round: 3, role: 'sp', content: '做了CT和血检……您能不能先告诉我到底怎么回事？我都问了好几次了。' },
      { round: 4, role: 'student', content: '先别说这些，你先把症状详细说一遍。' },
      { round: 4, role: 'sp', content: '医生，我问了三次了……您到底有没有在听我说话？' },
      { round: 5, role: 'student', content: '我没时间跟你绕弯子，快点说症状。' },
      { round: 5, role: 'sp', content: '行，我说。就是胸口闷，有时候喘不上气，上个月开始的。现在能回答我的问题了吗？' },
    ],
  },

  conflict_apology: {
    name: '冲突后道歉 — 关系修复',
    initialCM: {
      concern: { primary: '担心误诊', intensity: 6 },
      trust: 3,
      unresolved_goals: ['上次开的药为什么没效果'],
      stuck_count: 3,
    },
    dialogue: [
      { round: 1, role: 'student', content: '又来了？上次不是给你开药了吗，还来干什么？' },
      { round: 1, role: 'sp', content: '吃了没用啊，我越来越难受了，你到底有没有认真看？' },
      { round: 2, role: 'student', content: '你个病人懂什么？我说有用就有用，别在这跟我抬杠。' },
      { round: 2, role: 'sp', content: '你这是什么态度！我要投诉你！' },
      { round: 3, role: 'student', content: '对不起……我刚才态度确实太差了。最近压力大，我不该冲您发火。请原谅我。' },
      { round: 3, role: 'sp', content: '……算了，我也理解你们不容易。那您能重新帮我看一下吗？' },
      { round: 4, role: 'student', content: '当然，您把最近的感受详细跟我说说，我好好帮您分析。' },
      { round: 4, role: 'sp', content: '嗯，谢谢医生。我之前那个药吃了两周了，胸口的闷感一点没减轻……' },
    ],
  },

  cold_dismissive: {
    name: '冷漠敷衍 — 信任持续下降',
    initialCM: {
      concern: { primary: '孩子会不会有后遗症', intensity: 7 },
      trust: 6,
      unresolved_goals: ['治疗方案是什么', '会不会有后遗症'],
      stuck_count: 0,
    },
    dialogue: [
      { round: 1, role: 'student', content: '您好，我是今天负责的医生。' },
      { round: 1, role: 'sp', content: '医生您好，我是孩子妈妈……孩子发烧好几天了，我很担心。' },
      { round: 2, role: 'student', content: '发烧几天了？多少度？' },
      { round: 2, role: 'sp', content: '三天了，最高39度。医生，我就是怕烧出什么毛病来……' },
      { round: 3, role: 'student', content: '哦，那没事。常规病毒感染，吃退烧药就行了。' },
      { round: 3, role: 'sp', content: '真的没事吗？我听说发烧太久会烧坏脑子……您能再查查吗？' },
      { round: 4, role: 'student', content: '想多了，哪有那么容易烧坏。回去吃药就行了，下一个。' },
      { round: 4, role: 'sp', content: '医生……您能不能认真一点？我孩子烧了三天了，我真的很害怕。' },
      { round: 5, role: 'student', content: '随便你，爱查不查。' },
      { round: 5, role: 'sp', content: '……算了，我找别的医生看吧。' },
    ],
  },

  bad_news: {
    name: '坏消息告知 — 冲击性反应',
    initialCM: {
      concern: { primary: '检查结果怎么样', intensity: 6 },
      trust: 6,
      unresolved_goals: ['是什么病', '严不严重', '能不能治'],
      stuck_count: 0,
    },
    dialogue: [
      { round: 1, role: 'student', content: '请坐。今天叫您来，是想当面跟您说一下检查结果。' },
      { round: 1, role: 'sp', content: '结果怎么样？我心里一直不踏实……' },
      { round: 2, role: 'student', content: '检查结果出来了。坦率地说，情况比我们预想的要复杂一些。病理报告显示是恶性的。' },
      { round: 2, role: 'sp', content: '什么……恶性的？就是……癌症？！' },
      { round: 3, role: 'student', content: '是的。但我要跟您说清楚，发现得比较早，治愈的机会还是很大的。我们已经有完整的治疗方案了。' },
      { round: 3, role: 'sp', content: '我……我不知道说什么……我手都在抖……' },
      { round: 4, role: 'student', content: '我完全理解您现在的感受。这确实是个沉重的消息。您不用急，慢慢消化。有任何问题随时问，我会陪您一起面对。' },
      { round: 4, role: 'sp', content: '那……那能治好吗？我还有孩子……' },
      { round: 5, role: 'student', content: '能。早期发现的治愈率很高，我们有信心。治疗方案我都准备好了，等您调整好情绪我们可以详细聊。' },
      { round: 5, role: 'sp', content: '好……谢谢医生，我就怕来不及……' },
    ],
  },
}

// ═══════════════════════════════════════════════════════════════
// 辅助函数
// ═══════════════════════════════════════════════════════════════

function emojiFor(event) {
  const map = {
    good_news: '🟢', bad_news: '🔴', conflict: '💥', apology: '🙏',
    empathy_shown: '💚', dismissive: '👎', question_answered: '✅',
    question_avoided: '🚫', concern_addressed: '✔️', concern_ignored: '⛔',
    new_concern_expressed: '🆕', no_event: '➖',
  }
  return map[event] || '❓'
}

function describeCM(prev, curr) {
  const parts = []
  if (curr.concern.intensity !== prev.concern.intensity) {
    const delta = curr.concern.intensity - prev.concern.intensity
    const arrow = delta > 0 ? '↑' : '↓'
    parts.push(`担忧${arrow}${curr.concern.intensity}`)
  } else {
    parts.push(`担忧=${curr.concern.intensity}`)
  }
  if (curr.trust !== prev.trust) {
    const delta = curr.trust - prev.trust
    const arrow = delta > 0 ? '↑' : '↓'
    parts.push(`信任${arrow}${curr.trust}`)
  } else {
    parts.push(`信任=${curr.trust}`)
  }
  if (curr.stuck_count !== prev.stuck_count) {
    const delta = curr.stuck_count - prev.stuck_count
    const arrow = delta > 0 ? '↑' : '↓'
    parts.push(`卡住${arrow}${curr.stuck_count}`)
  } else if (curr.stuck_count > 0) {
    parts.push(`卡住=${curr.stuck_count}`)
  }
  return parts.join(' | ')
}

function describeDS(ds) {
  const intensityMap = { none: '无', low: '低', medium: '中', high: '高', extreme: '极' }
  const dominantMap = { fear: '恐惧', anger: '愤怒', sadness: '悲伤', calm: '平静' }
  const attitudeMap = { defensive: '防御', neutral: '中立', cooperative: '配合' }
  return `态度=${attitudeMap[ds.attitude]}  透露=${ds.disclosure}  情绪=${intensityMap[ds.emotion_constraint.intensity]}/${dominantMap[ds.emotion_constraint.dominant]}主导`
}

function formatDialogue(dialogue) {
  return dialogue
    .map(r => `[Round ${r.round}] ${r.role === 'student' ? '学生' : 'SP'}: ${r.content}`)
    .join('\n')
}

function pad(s, n) { return String(s).padEnd(n) }

// ═══════════════════════════════════════════════════════════════
// 回放主函数
// ═══════════════════════════════════════════════════════════════

async function replay(scenarioKey, options = {}) {
  const { markdown } = options
  const sc = SCENARIOS[scenarioKey]
  if (!sc) {
    console.log(`未知场景: ${scenarioKey}`)
    console.log(`可用: ${Object.keys(SCENARIOS).join(', ')}`)
    return
  }

  const model = process.env.REFLECTION_MODEL || 'qwen-plus'
  const md = [] // markdown buffer

  function both(line) {
    console.log(line)
    if (markdown) md.push(line)
  }

  function bothNoNewline(line) {
    // for process.stdout.write style — we don't use it
    console.log(line)
    if (markdown) md.push(line)
  }

  function divider(char = '─', width = 60) {
    const line = char.repeat(width)
    console.log(`\n${line}`)
    if (markdown) md.push(`\n${line}`)
  }

  // ── 标题 ──
  const title = `反思脑 POC 离线回放 — ${sc.name}`
  if (markdown) {
    md.push(`# ${title}`)
    md.push('')
    md.push(`**模型**: ${model}`)
    md.push('')
  }

  console.log('═'.repeat(72))
  console.log(`  反思脑 POC 离线回放`)
  console.log(`  场景: ${sc.name}`)
  console.log('═'.repeat(72))
  console.log(`  使用模型: ${model}`)
  console.log()

  // ═══════════════════════════════════════════════════════════
  // Part 1: 发给 LLM 的完整内容
  // ═══════════════════════════════════════════════════════════

  const systemPrompt = readFileSync(PROMPT_PATH, 'utf-8')
  const dialogueText = formatDialogue(sc.dialogue)
  const userMessage = `分析以下对话，输出每轮触发的事件：

${dialogueText}

只输出 JSON，不要输出任何其他内容。`

  if (markdown) {
    md.push('---')
    md.push('')
    md.push('## 一、发给 LLM 的内容')
    md.push('')
    md.push('### 1.1 System Prompt')
    md.push('')
    md.push('```text')
    md.push(systemPrompt)
    md.push('```')
    md.push('')
    md.push('### 1.2 User Message')
    md.push('')
    md.push('```text')
    md.push(userMessage)
    md.push('```')
    md.push('')
  } else {
    // 非 md 模式也在控制台显示 LLM 输入（用户想看）
    console.log('─'.repeat(60))
    console.log('  发给 LLM 的 System Prompt (节选前 300 字)')
    console.log('─'.repeat(60))
    console.log(systemPrompt.slice(0, 300) + '...')
    console.log()
    console.log('─'.repeat(60))
    console.log('  发给 LLM 的 User Message')
    console.log('─'.repeat(60))
    console.log(userMessage)
    console.log()
  }

  // ═══════════════════════════════════════════════════════════
  // Part 2: 调用 LLM 提取事件
  // ═══════════════════════════════════════════════════════════

  console.log('正在提取事件...')
  const extraction = await extractEvents(sc.dialogue, { model })
  if (!extraction.success) {
    both(`✗ 事件提取失败: ${extraction.error}`)
    return md
  }

  const events = extraction.rounds
  console.log(`✓ 事件提取完成 (${events.length} 轮)`)

  if (markdown) {
    md.push('---')
    md.push('')
    md.push('## 二、LLM 返回的原始输出')
    md.push('')
    md.push('```json')
    md.push(extraction.rawOutput.trim())
    md.push('```')
    md.push('')
    md.push('### 事件提取明细')
    md.push('')
    md.push('| Round | 事件 |')
    md.push('|-------|------|')
    for (const r of events) {
      const evtStr = r.events.length > 0 ? r.events.join(', ') : '(无)'
      md.push(`| ${r.round} | ${evtStr} |`)
    }
    md.push('')
  } else {
    // 控制台显示
    if (process.argv.includes('--debug')) {
      console.log(`\n  LLM 原始输出:`)
      console.log(`  ${'-'.repeat(56)}`)
      console.log(extraction.rawOutput)
      console.log(`  ${'-'.repeat(56)}`)
    }
    console.log(`\n  事件提取明细:`)
    for (const r of events) {
      const evtStr = r.events.length > 0 ? r.events.join(', ') : '(无)'
      console.log(`    Round ${r.round}: ${evtStr}`)
    }
    console.log()
  }

  // ═══════════════════════════════════════════════════════════
  // Part 3: 应用事件到状态
  // ═══════════════════════════════════════════════════════════

  const result = applyEvents(sc.initialCM, events, { personality: 'default' })

  // 收集每轮的学生输入（按round分组）
  const rounds = new Map()
  for (const d of sc.dialogue) {
    if (!rounds.has(d.round)) rounds.set(d.round, { student: '', sp: '' })
    if (d.role === 'student') rounds.get(d.round).student = d.content
    if (d.role === 'sp') rounds.get(d.round).sp = d.content
  }

  if (markdown) {
    md.push('---')
    md.push('')
    md.push('## 三、逐轮回放')
    md.push('')
  }

  let prevCM = {
    concern: { primary: sc.initialCM.concern.primary, intensity: sc.initialCM.concern.intensity },
    trust: sc.initialCM.trust,
    stuck_count: sc.initialCM.stuck_count,
  }

  // Round 0
  if (markdown) {
    md.push('### Round 0 — 初始状态')
    md.push('')
    md.push('```')
    md.push(`CM: concern="${prevCM.concern.primary}"(${prevCM.concern.intensity}), trust=${prevCM.trust}, stuck=${prevCM.stuck_count}`)
    const initDS = computeDerivedState(prevCM)
    md.push(`DS: ${describeDS(initDS)}`)
    md.push('```')
    md.push('')
  } else {
    console.log()
    console.log('─'.repeat(60))
    console.log('  Round 0 — 初始状态')
    console.log('─'.repeat(60))
    console.log(`  CM: concern="${prevCM.concern.primary}"(${prevCM.concern.intensity}), trust=${prevCM.trust}, stuck=${prevCM.stuck_count}`)
    const initDS = computeDerivedState(prevCM)
    console.log(`  DS: ${describeDS(initDS)}`)
  }

  for (const delta of result.deltas) {
    const roundNum = delta.round
    const roundData = rounds.get(roundNum) || { student: '', sp: '' }

    if (markdown) {
      md.push(`### Round ${roundNum}`)
      md.push('')
      md.push(`| 角色 | 内容 |`)
      md.push(`|------|------|`)
      md.push(`| 👨‍⚕️ 学生 | ${roundData.student} |`)
      if (roundData.sp) md.push(`| 🏥 SP | ${roundData.sp} |`)
      md.push('')
      const eventStr = delta.events.length > 0
        ? delta.events.map(e => `${emojiFor(e)} ${e}`).join(', ')
        : '➖ 无事件'
      md.push(`**事件**: ${eventStr}`)
      md.push('')
      const currCM = delta.cm_after
      const cmDiff = describeCM(prevCM, { concern: { intensity: currCM.concern.intensity }, trust: currCM.trust, stuck_count: currCM.stuck_count })
      const ds = computeDerivedState({
        concern: { primary: prevCM.concern.primary, intensity: currCM.concern.intensity },
        trust: currCM.trust,
        stuck_count: currCM.stuck_count,
      })
      md.push('```')
      md.push(`CM: ${cmDiff}`)
      md.push(`DS: ${describeDS(ds)}`)
      md.push('```')
      md.push('')

      prevCM = {
        concern: { primary: prevCM.concern.primary, intensity: currCM.concern.intensity },
        trust: currCM.trust,
        stuck_count: currCM.stuck_count,
      }
    } else {
      console.log()
      console.log('─'.repeat(60))
      console.log(`  Round ${roundNum}`)
      console.log('─'.repeat(60))

      console.log(`  👨‍⚕️ 学生: ${roundData.student}`)
      if (roundData.sp) console.log(`  🏥 SP:   ${roundData.sp}`)

      const eventStr = delta.events.length > 0
        ? delta.events.map(e => `${emojiFor(e)} ${e}`).join(', ')
        : '➖ 无事件'
      console.log(`  📋 事件: ${eventStr}`)

      const currCM = delta.cm_after
      const cmDiff = describeCM(prevCM, { concern: { intensity: currCM.concern.intensity }, trust: currCM.trust, stuck_count: currCM.stuck_count })
      console.log(`  📊 CM: ${cmDiff}`)

      const ds = computeDerivedState({
        concern: { primary: prevCM.concern.primary, intensity: currCM.concern.intensity },
        trust: currCM.trust,
        stuck_count: currCM.stuck_count,
      })
      console.log(`  🎭 DS: ${describeDS(ds)}`)

      prevCM = {
        concern: { primary: prevCM.concern.primary, intensity: currCM.concern.intensity },
        trust: currCM.trust,
        stuck_count: currCM.stuck_count,
      }
    }
  }

  // ═══════════════════════════════════════════════════════════
  // Part 4: 最终状态 + 趋势
  // ═══════════════════════════════════════════════════════════

  const finalCM = result.finalCM
  const initCM = sc.initialCM
  const trustDelta = finalCM.trust - initCM.trust
  const concernDelta = finalCM.concern.intensity - initCM.concern.intensity
  const stuckDelta = finalCM.stuck_count - initCM.stuck_count
  const finalDS = computeDerivedState(finalCM)

  if (markdown) {
    md.push('---')
    md.push('')
    md.push('## 四、最终状态汇总')
    md.push('')
    md.push('| 字段 | 值 |')
    md.push('|------|----|')
    md.push(`| 担忧 | "${finalCM.concern.primary}" (强度 ${finalCM.concern.intensity}/10) |`)
    md.push(`| 信任 | ${finalCM.trust}/10 |`)
    md.push(`| 未解疑问 | ${finalCM.unresolved_goals.length > 0 ? finalCM.unresolved_goals.join(', ') : '无'} |`)
    md.push(`| 卡住次数 | ${finalCM.stuck_count}/5 |`)
    md.push(`| 最终态度 | ${finalDS.attitude} |`)
    md.push(`| 透露程度 | ${finalDS.disclosure} |`)
    md.push(`| 情绪基调 | ${finalDS.emotion_constraint.intensity}/${finalDS.emotion_constraint.dominant}/${finalDS.emotion_constraint.secondary} |`)
    md.push('')
    md.push('---')
    md.push('')
    md.push('## 五、变化趋势')
    md.push('')
    md.push('| 维度 | 初始 | 最终 | 变化 |')
    md.push('|------|------|------|------|')
    md.push(`| 信任 | ${initCM.trust} | ${finalCM.trust} | ${trustDelta >= 0 ? '+' : ''}${trustDelta} |`)
    md.push(`| 担忧 | ${initCM.concern.intensity} | ${finalCM.concern.intensity} | ${concernDelta >= 0 ? '+' : ''}${concernDelta} |`)
    md.push(`| 卡住 | ${initCM.stuck_count} | ${finalCM.stuck_count} | ${stuckDelta >= 0 ? '+' : ''}${stuckDelta} |`)
    md.push('')
    md.push('---')
    md.push('')
    md.push('## 六、事件→CM 规则参考')
    md.push('')
    md.push('| 事件 | concern | trust | stuck |')
    md.push('|------|---------|-------|-------|')
    md.push('| good_news | -3 | — | — |')
    md.push('| bad_news | +2 | — | — |')
    md.push('| concern_addressed | -2 | — | — |')
    md.push('| concern_ignored | +1 | — | +1 |')
    md.push('| question_answered | — | — | 重置为0 |')
    md.push('| question_avoided | — | — | +1 |')
    md.push('| empathy_shown | — | +1 | — |')
    md.push('| dismissive | — | -1 | +1 |')
    md.push('| conflict | — | -2 | +2 |')
    md.push('| apology | — | +2 | 重置为0 |')
    md.push('')
    md.push('> 振幅上限: concern ±3/轮, trust ±2/轮, stuck +2/轮')
    md.push('')
  } else {
    console.log()
    console.log('─'.repeat(60))
    console.log('  最终状态汇总')
    console.log('─'.repeat(60))
    console.log(`  担忧: "${finalCM.concern.primary}" (强度 ${finalCM.concern.intensity}/10)`)
    console.log(`  信任: ${finalCM.trust}/10`)
    console.log(`  未解疑问: ${finalCM.unresolved_goals.length > 0 ? finalCM.unresolved_goals.join(', ') : '无'}`)
    console.log(`  卡住次数: ${finalCM.stuck_count}/5`)
    console.log()
    console.log(`  最终态度: ${finalDS.attitude}`)
    console.log(`  透露程度: ${finalDS.disclosure}`)
    console.log(`  情绪基调: ${finalDS.emotion_constraint.intensity}/${finalDS.emotion_constraint.dominant}/${finalDS.emotion_constraint.secondary}`)

    console.log()
    console.log('─'.repeat(60))
    console.log('  变化趋势')
    console.log('─'.repeat(60))
    console.log(`  信任: ${initCM.trust} → ${finalCM.trust} (${trustDelta >= 0 ? '+' : ''}${trustDelta})`)
    console.log(`  担忧: ${initCM.concern.intensity} → ${finalCM.concern.intensity} (${concernDelta >= 0 ? '+' : ''}${concernDelta})`)
    console.log(`  卡住: ${initCM.stuck_count} → ${finalCM.stuck_count} (${stuckDelta >= 0 ? '+' : ''}${stuckDelta})`)
    console.log()
    console.log('═'.repeat(72))
  }

  return md
}

// ═══════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════

const scenario = process.argv[2] || 'good_news'
const useMarkdown = process.argv.includes('--md')

if (useMarkdown) {
  // 生成 markdown 报告
  const allMd = []
  const keys = scenario === 'all' ? Object.keys(SCENARIOS) : [scenario]

  for (const key of keys) {
    if (!SCENARIOS[key]) {
      console.log(`未知场景: ${key}`)
      continue
    }
    const md = await replay(key, { markdown: true })
    if (md) allMd.push(md.join('\n'))
  }

  const output = allMd.join('\n\n---\n\n')
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const outPath = join(__scriptDir, `replay-${scenario === 'all' ? 'all' : scenario}-${timestamp}.md`)
  writeFileSync(outPath, output, 'utf-8')
  console.log(`\n✅ Markdown 报告已保存: ${outPath}`)
} else {
  if (scenario === 'all') {
    for (const key of Object.keys(SCENARIOS)) {
      await replay(key)
      console.log('\n')
    }
  } else {
    await replay(scenario)
  }
}
