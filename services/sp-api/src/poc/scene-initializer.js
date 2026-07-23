// ═══════════════════════════════════════════════════════════════
// 场景初始化器
// 会话创建时运行一次分类LLM，根据病例内容确定初始CM和阻尼器值
// 不修改病例schema —— LLM从现有文本字段推断场景类型
// ═══════════════════════════════════════════════════════════════

import { LLM_API_KEY, LLM_MODEL } from '../llm-client.js'

const LLM_API_URL = process.env.LLM_API_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'
const SCENE_INIT_MODEL = process.env.SCENE_INIT_MODEL || 'qwen-plus'

/** 场景初始化失败时的默认值 */
const DEFAULT_INIT = {
  sceneType: '普通接诊',
  initialTrust: 5,
  initialConcernIntensity: 5,
  initialAnger: 0,
}

/**
 * 构建场景分类提示词
 */
function buildSceneInitPrompt(config) {
  const parts = ['## 病例角色信息']
  if (config.roleDescription) {
    parts.push(config.roleDescription)
  }
  if (config.symptomPool) {
    parts.push('\n症状描述：' + config.symptomPool)
  }
  if (config.humanityScenario) {
    const sc = config.humanityScenario
    if (sc.scenario_name) parts.push('\n场景名称：' + sc.scenario_name)
    if (sc.sp_materials?.role_description) parts.push('场景背景：' + sc.sp_materials.role_description)
  }
  if (config.mode) {
    parts.push('\n考核模式：' + (config.mode === 'humanistic-comm' ? '人文沟通站' : '病史采集站'))
  }

  parts.push('')
  parts.push('## 任务')
  parts.push('根据以上角色信息，判断这个标准化病人(SP)案例属于什么场景类型，并确定SP的初始心理状态。')
  parts.push('')
  parts.push('场景类型从以下选择：普通接诊、人文沟通、坏消息告知、知情同意、临终关怀、恶意对抗')
  parts.push('- 普通接诊：病人来看门诊，描述症状寻求诊断')
  parts.push('- 人文沟通：病人/家属带着特定疑问来与医生沟通（非问诊）')
  parts.push('- 坏消息告知：医生需要告知病人/家属严重病情的场景')
  parts.push('- 知情同意：病人需要了解和签署治疗方案同意书')
  parts.push('- 临终关怀：面对终末期疾病的心理和情感支持')
  parts.push('- 恶意对抗：医患关系紧张，病人/家属对医生怀有敌意或不信任')
  parts.push('')
  parts.push('信任度(initialTrust)：SP对医生的初始信任程度，0=完全不信任，10=完全信任')
  parts.push('- 有对抗情绪、投诉倾向 → 1-3')
  parts.push('- 有疑虑但愿意沟通 → 4-6')
  parts.push('- 正常就诊、信任医生 → 5-7')
  parts.push('')
  parts.push('担忧强度(initialConcernIntensity)：SP对自身健康状况的担忧程度，0=毫不担心，10=极度担忧')
  parts.push('- 常规复查、轻微症状 → 3-5')
  parts.push('- 不明症状需要诊断 → 5-7')
  parts.push('- 面对严重病情/临终 → 7-9')
  parts.push('')
  parts.push('初始愤怒(initialAnger)：SP对话开始前的愤怒值，0=平静，10=暴怒')
  parts.push('- 普通就诊 → 0')
  parts.push('- 对医疗系统有怨气 → 1-3')
  parts.push('- 明显对抗/投诉/恶意 → 5-7')
  parts.push('')
  parts.push('输出纯JSON（不要markdown代码块）：')
  parts.push('{"sceneType":"...","initialTrust":5,"initialConcernIntensity":5,"initialAnger":0}')
  parts.push('')
  parts.push('只输出JSON，别的不输出。')

  return parts.join('\n')
}

/**
 * 调用分类LLM进行场景初始化
 * @param {object} config — 病例配置
 * @returns {Promise<{sceneType: string, initialTrust: number, initialConcernIntensity: number, initialAnger: number}>}
 */
export async function classifyScene(config) {
  const systemPrompt = buildSceneInitPrompt(config)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30000) // 30s timeout

  try {
    const resp = await fetch(LLM_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LLM_API_KEY}`
      },
      body: JSON.stringify({
        model: SCENE_INIT_MODEL,
        messages: [{ role: 'system', content: systemPrompt }],
        temperature: 0.3,
        max_tokens: 500,
        enable_thinking: false,
      }),
      signal: controller.signal
    })
    clearTimeout(timeout)

    if (!resp.ok) {
      console.warn(`[scene-init] LLM API error ${resp.status}, using defaults`)
      return { ...DEFAULT_INIT }
    }

    const result = await resp.json()
    const rawContent = result.choices?.[0]?.message?.content || ''

    // 清理可能的markdown代码块
    let jsonStr = rawContent.trim()
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
    }

    const parsed = JSON.parse(jsonStr)

    return {
      sceneType: parsed.sceneType || DEFAULT_INIT.sceneType,
      initialTrust: Number.isFinite(parsed.initialTrust)
        ? Math.round(Math.max(0, Math.min(10, parsed.initialTrust)))
        : DEFAULT_INIT.initialTrust,
      initialConcernIntensity: Number.isFinite(parsed.initialConcernIntensity)
        ? Math.round(Math.max(0, Math.min(10, parsed.initialConcernIntensity)))
        : DEFAULT_INIT.initialConcernIntensity,
      initialAnger: Number.isFinite(parsed.initialAnger)
        ? Math.round(Math.max(0, Math.min(10, parsed.initialAnger)))
        : DEFAULT_INIT.initialAnger,
    }
  } catch (e) {
    console.warn(`[scene-init] Failed: ${e.message}, using defaults`)
    return { ...DEFAULT_INIT }
  }
}
