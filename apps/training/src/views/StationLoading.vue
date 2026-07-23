<template>
  <div class="station-loading-page">
    <div class="loading-card">
      <div class="loading-station-icon">
        <div class="icon-ring"></div>
        <i :class="'fa-solid ' + targetIcon"></i>
      </div>

      <div class="loading-station-name">{{ targetName }}</div>

      <div class="loading-case-info">
        <div class="loading-case-avatar">
          <div class="avatar-pulse"></div>
          <img v-if="patientAvatar" :src="patientAvatar" />
          <i v-else class="fa-solid fa-user"></i>
        </div>
        <div class="loading-case-meta">
          <div class="loading-case-name">{{ patientName || '...' }}</div>
          <div class="loading-case-detail">{{ caseId }}</div>
        </div>
      </div>

      <div class="loading-progress-track">
        <div class="loading-progress-fill"
          :class="{ done: finished }"
          :style="{ width: barWidth + '%' }">
          <div class="progress-glow"></div>
        </div>
      </div>

      <div class="loading-step-label">{{ stepLabel }}</div>

      <div class="loading-phases">
        <div class="phase-dot" :class="{ active: phase >= 1 }">
          <i class="fa-solid fa-database"></i>
        </div>
        <div class="phase-line" :class="{ active: phase >= 2 }"></div>
        <div class="phase-dot" :class="{ active: phase >= 2 }">
          <i class="fa-solid fa-brain"></i>
        </div>
        <div class="phase-line" :class="{ active: phase >= 3 }"></div>
        <div class="phase-dot" :class="{ active: phase >= 3 }">
          <i class="fa-solid fa-bolt"></i>
        </div>
      </div>

      <div v-if="errorMsg" class="loading-error">
        <p>{{ errorMsg }}</p>
        <button class="btn btn-primary" @click="retry">{{ lang === 'zh' ? '重试' : 'Retry' }}</button>
        <button class="btn" @click="goBack">{{ lang === 'zh' ? '返回' : 'Go Back' }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTrainingStore } from '@/stores/training'
import { useCaseLoader } from '@/composables/useCaseLoader'
import { matchPatientImage } from '@/composables/usePatientImage'
import { preconfigureSession, preconfigureInBackground } from '@/composables/useAISP'
import { PROJECT_TO_STATION_TARGET, PROJECT_ROUTE_MAP, STATION_ROUTE_MAP } from '@/composables/useStationFlow'
import { getTemplateFlatItems, getScoreTable, stationScoreTableBindings } from '@ai-sp/shared/score-tables'
import { parseScoreSheet } from '@ai-sp/shared/score-sheet-parser'

const route = useRoute()
const router = useRouter()
const store = useTrainingStore()
const { loadCase } = useCaseLoader()

const lang = ref(store.lang || 'zh')
const stepLabel = ref('')
const errorMsg = ref('')
const phase = ref(0)
const patientName = ref('')
const patientAvatar = ref('')
const finished = ref(false)
const barWidth = ref(0)

const caseId = ref(route.query.caseId || '')
const target = ref(route.query.target || 'historyTaking')
const scenarioId = ref(route.query.scenarioId || '')

const targetIcon = computed(() => {
  const map = {
    historyTaking: 'fa-user-doctor', physicalExam: 'fa-stethoscope',
    humanisticComm: 'fa-comments', caseAnalysis: 'fa-magnifying-glass-chart',
    preliminaryDiag: 'fa-clipboard-list', treatmentPlan: 'fa-prescription',
    medicalRecord: 'fa-file-medical', mentalExam: 'fa-brain',
  }
  return map[target.value] || 'fa-play'
})

// 从考站方案数据中动态查找站名（不再硬编码）
function resolveStationName(targetRoute) {
  const stations = store.stationScheme || store.stationFlow?.stations || []
  // 按 routeName 匹配
  const byRoute = stations.find(s => {
    const mapped = STATION_ROUTE_MAP[s.name]
    return (mapped?.route || 'historyTaking') === targetRoute
  })
  if (byRoute) return byRoute.name
  // 按站内项目匹配
  const byProject = stations.find(s =>
    (s.projects || []).some(p => PROJECT_ROUTE_MAP[p]?.route === targetRoute)
  )
  if (byProject) return byProject.name
  return targetRoute
}

const targetName = computed(() => {
  // 全流程版：loading 页面显示"临床思维模拟训练"
  if (store.trainingVersion === 'full-flow') return '临床思维模拟训练'
  return resolveStationName(target.value)
})

// ═══ 进度条：JS 持续微增，越接近 90% 越慢，但永不停 ═══
let barTimer = null

function startBarAnimation() {
  if (barTimer) return
  barTimer = setInterval(() => {
    if (finished.value) return
    const remaining = 90 - barWidth.value
    const step = Math.max(remaining * 0.012, 0.06)
    barWidth.value = Math.min(barWidth.value + step, 89.7)
  }, 50)
}

function stopBarAnimation() {
  if (barTimer) { clearInterval(barTimer); barTimer = null }
}

function finishBar() {
  finished.value = true
  barWidth.value = 100
}

async function doPreload() {
  startBarAnimation()
  phase.value = 1
  stepLabel.value = lang.value === 'zh' ? '正在加载病例数据...' : 'Loading case data...'

  const data = await loadCase(caseId.value)
  if (!data || !data.basic) {
    throw new Error(lang.value === 'zh' ? '病例数据加载失败' : 'Failed to load case data')
  }

  const basic = data.basic
  const pi = basic.patient_info || {}
  const gender = pi.sex === '0' || pi.sex === '女' ? '女' : '男'
  const age = String(pi.age || '').replace('岁', '')
  patientName.value = pi.name || caseId.value
  patientAvatar.value = matchPatientImage({ gender, age: parseInt(age) || 30 }, 'patient')

  phase.value = 2
  stepLabel.value = lang.value === 'zh' ? '正在初始化 AI 会话...' : 'Initializing AI session...'

  // 启动评分表解析（与后续 target 工作并行），超时 15s
  const scoreSheetPromise = parseScoreSheetForSession(data).catch(e => {
    console.warn('[StationLoading] scoreSheet parse failed:', e.message)
    return null
  })
  const scoreSheetTimeout = new Promise(r => setTimeout(() => r(null), 15000))

  // ═══ 分步加载：必须资源 await，预配置 fire-and-forget ═══
  if (target.value === 'historyTaking') {
    const reception = data.reception
    const spMaterials = reception?.sp_materials || {}
    const roleInfo = spMaterials.role_info || {}
    const patientInfo = basic?.patient_info || {}
    const occupation = patientInfo.occupation || ''
    const education = patientInfo.education || ''
    const identLine = [occupation, education ? education + '学历' : ''].filter(Boolean).join('，')
    const commTarget = spMaterials.role || reception.communication_target || 'patient'

    // 必须资源：症状池解析（用户进站第一时间就要用）
    stepLabel.value = lang.value === 'zh' ? '正在解析患者自述...' : 'Parsing patient narrative...'
    let symptomPool = ''
    if (spMaterials.self_narration) {
      try {
        const resp = await fetch('/api/sp/symptom-pool', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ selfNarration: spMaterials.self_narration })
        })
        const res = await resp.json()
        if (res.ok) symptomPool = res.content
      } catch (e) { /* ignore */ }
    }

    // 后台：AI 会话预配置（用户不一定上来就发消息，后台无感完成）
    preconfigureSession({
      caseId: caseId.value,
      mode: 'history-taking',
      spPlayRules: data.meta?.sp_play_rules || null,
      roleDescription: commTarget === 'family'
        ? `你扮演的角色：患者的${roleInfo.relation || '家属'}，${roleInfo.name}，${roleInfo.age}岁，${roleInfo.gender}。\n` +
          `患者信息：${patientInfo.name || ''}，${gender}，${patientInfo.age || ''}岁。\n` +
          `当前情绪：${roleInfo.emotion || ''}`
        : `患者姓名：${roleInfo.name || patientInfo.name || ''}，性别：${roleInfo.gender || gender}，年龄：${roleInfo.age || patientInfo.age || ''}岁。` +
          (identLine ? `\n职业与学历：${identLine}。` : '') +
          `\n当前情绪：${roleInfo.emotion || ''}`,
      symptomPool,
      personality: data.meta?.personality || data.basic?.personality || null,
      emotionBaseline: roleInfo.emotion || '',
    }).catch(e => console.warn('[StationLoading] preconfigure failed:', e.message))

    preconfigureInBackground({
      caseId: caseId.value,
      mode: 'physical-exam',
      spPlayRules: data.meta?.sp_play_rules || null,
    })
    try {
      const templates = buildExamTemplatesStatic(data)
      sessionStorage.setItem(`aisp_exam_templates_${caseId.value}`, JSON.stringify(templates))
    } catch (e) { /* ignore */ }

  } else if (target.value === 'physicalExam') {
    try {
      const templates = buildExamTemplatesStatic(data)
      sessionStorage.setItem(`aisp_exam_templates_${caseId.value}`, JSON.stringify(templates))
    } catch (e) { /* ignore */ }
    preconfigureSession({
      caseId: caseId.value,
      mode: 'physical-exam',
      spPlayRules: data.meta?.sp_play_rules || null,
    }).catch(e => console.warn('[StationLoading] preconfigure failed:', e.message))

  } else if (target.value === 'humanisticComm' && scenarioId.value) {
    const sc = (data.humanity?.scenarios || []).find(s => s.scenario_id === scenarioId.value)
    if (!sc) throw new Error('Scenario not found')
    const spMaterials = sc.sp_materials || {}
    preconfigureSession({
      caseId: caseId.value,
      mode: 'humanistic-comm',
      roleDescription: spMaterials.role_description || '',
      humanityScenario: sc,
      psychologicalStages: spMaterials.psychological_stages || null,
      personality: data.meta?.personality || data.basic?.personality || null,
      emotionBaseline: spMaterials.role_info?.emotion || '',
      spPlayRules: data.meta?.sp_play_rules || null,
    }).catch(e => console.warn('[StationLoading] preconfigure failed:', e.message))
  } else if (target.value === 'mentalExam') {
    const patientInfo = basic?.patient_info || {}
    const patientGender = patientInfo.sex === '0' || patientInfo.sex === '女' ? '女' : '男'
    const patientAge = patientInfo.age || 30
    const occupation = patientInfo.occupation || ''
    const education = patientInfo.education || ''
    const identLine = [occupation, education ? education + '学历' : ''].filter(Boolean).join('，')

    const atypicalConfig = data.meta?.atypical_dialogue || null

    let symptomPool = ''
    if (atypicalConfig?.mental_status) {
      const statusText = Object.entries(atypicalConfig.mental_status)
        .map(([dim, desc]) => `${dim}: ${desc}`).join('；')
      try {
        const resp = await fetch('/api/sp/symptom-pool', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ selfNarration: statusText })
        })
        const res = await resp.json()
        if (res.ok) symptomPool = res.content
      } catch (e) { /* ignore */ }
    }

    preconfigureSession({
      caseId: caseId.value,
      mode: 'mental-exam',
      roleDescription: `患者姓名：${patientInfo.name || ''}，性别：${patientGender}，年龄：${patientAge}岁。` +
        (identLine ? `\n职业与学历：${identLine}。` : ''),
      symptomPool,
      personality: data.meta?.personality || data.basic?.personality || null,
      spPlayRules: data.meta?.sp_play_rules || null,
      atypicalConfig,
    }).catch(e => console.warn('[StationLoading] preconfigure failed:', e.message))
  }

  // 等待评分表解析完成（与上述 target 工作已并行执行），超时保护
  await Promise.race([scoreSheetPromise, scoreSheetTimeout])

  // 必须资源加载完成，立即导航
  phase.value = 3
  stepLabel.value = lang.value === 'zh' ? '准备就绪' : 'Ready'
  finishBar()

  await new Promise(r => setTimeout(r, 300))
  stopBarAnimation()

  const query = { caseId: caseId.value }
  if (scenarioId.value) query.scenarioId = scenarioId.value
  router.replace({ name: target.value, query })
}

async function retry() {
  errorMsg.value = ''
  phase.value = 0
  barWidth.value = 0
  finished.value = false
  try {
    await doPreload()
  } catch (e) {
    stopBarAnimation()
    errorMsg.value = e.message || (lang.value === 'zh' ? '加载失败，请重试' : 'Loading failed, please retry')
  }
}

function goBack() {
  router.replace({ name: 'caseDetail', params: { caseId: caseId.value } })
}

/**
 * 后台解析评分表：遍历 flow 中所有考站（非仅当前站），收集全部模板绑定，
 * 一次性解析并分发到各 target 专属 sessionStorage key。
 * 解决跨站导航跳过 StationLoading 导致后续考站评分表缺失的问题。
 * 优先使用考站方案的 scoreTables（含 bindProjects），回退到 stationScoreTableBindings。
 */
async function parseScoreSheetForSession(data) {
  if (!data || !data.basic) return
  const basic = data.basic
  const specialty = store.specialty || basic.specialty || ''

  const allStations = store.stationScheme || store.stationFlow?.stations || []

  // 1. 遍历所有考站，收集全部模板绑定（去重合并）
  let templateBindings = {} // { TPL-STD: ['病史采集'], TPL-STD-2: ['体格检查'], ... }
  for (const station of allStations) {
    if (station?.scoreTables?.length) {
      for (const st of station.scoreTables) {
        if (st.templateCode && st.bindProjects?.length) {
          if (!templateBindings[st.templateCode]) {
            templateBindings[st.templateCode] = [...st.bindProjects]
          } else {
            for (const p of st.bindProjects) {
              if (!templateBindings[st.templateCode].includes(p)) {
                templateBindings[st.templateCode].push(p)
              }
            }
          }
        }
      }
    } else {
      // 回退：静态绑定（按站名取 stationScoreTableBindings）
      const bindings = station.name ? stationScoreTableBindings[station.name] : null
      if (bindings) {
        for (const [code, info] of Object.entries(bindings)) {
          if (!templateBindings[code]) {
            templateBindings[code] = [...(info.bindProjects || [])]
          } else {
            for (const p of (info.bindProjects || [])) {
              if (!templateBindings[code].includes(p)) {
                templateBindings[code].push(p)
              }
            }
          }
        }
      }
    }
  }

  if (!Object.keys(templateBindings).length) {
    const templateCode = basic.score_sheet_template
    if (!templateCode) return
    templateBindings = { [templateCode]: [] }
  }

  const boundCodes = Object.keys(templateBindings)
  const legacyKey = `aisp_parsed_scoresheet_${caseId.value}`
  const stationKey = `aisp_parsed_scoresheet_${caseId.value}_${target.value}`

  // 2. 逐模板解析
  const parsedSheets = []
  for (const code of boundCodes) {
    const items = getTemplateFlatItems(code)
    if (!items?.length) continue

    let parsed = null
    try {
      const resp = await fetch('/api/score-sheet/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ basicData: basic, templateItems: items, specialty, templateCode: code })
      })
      const json = await resp.json()
      if (json.ok && json.data) parsed = json.data
    } catch (e) { /* fall through */ }

    if (!parsed) {
      try {
        parsed = parseScoreSheet({ basicData: basic, templateItems: items, specialty })
      } catch (e) { continue }
    }

    const tpl = getScoreTable(code)
    parsedSheets.push({
      templateCode: code,
      templateName: tpl?.name || code,
      items: parsed
    })
  }

  if (!parsedSheets.length) return

  // 3. 按 bindProjects 分发到各 target 专属 key（每个 target 只存自己相关的模板）
  const targetSheets = {} // { historyTaking: [...], physicalExam: [...], ... }
  for (const sheet of parsedSheets) {
    const projects = templateBindings[sheet.templateCode] || []
    for (const proj of projects) {
      const projTarget = PROJECT_TO_STATION_TARGET[proj]
      if (projTarget) {
        if (!targetSheets[projTarget]) targetSheets[projTarget] = []
        targetSheets[projTarget].push(sheet)
      }
    }
  }

  // 4. 存入 sessionStorage
  const genericPayload = JSON.stringify(parsedSheets)
  sessionStorage.setItem(legacyKey, genericPayload)
  sessionStorage.setItem(stationKey, genericPayload)

  for (const [tgt, sheets] of Object.entries(targetSheets)) {
    sessionStorage.setItem(`aisp_parsed_scoresheet_${caseId.value}_${tgt}`, JSON.stringify(sheets))
  }
}

function buildExamTemplatesStatic(data) {
  const templates = []
  const basic = data.basic
  if (basic?.physical_examination) {
    for (const [cat, items] of Object.entries(basic.physical_examination)) {
      if (items && items.length) {
        templates.push({ category: cat, items: items.map(i => typeof i === 'string' ? { name: i, result: '' } : i) })
      }
    }
  }
  if (data.reception?.sp_materials?.physical_exam_items?.length) {
    templates.push({ category: '检查项目', items: data.reception.sp_materials.physical_exam_items.map(i => typeof i === 'string' ? { name: i, result: '' } : i) })
  }
  if (data.meta?.physical_exam_templates) {
    for (const [cat, items] of Object.entries(data.meta.physical_exam_templates)) {
      if (items && items.length) {
        templates.push({ category: cat, items: items.map(i => typeof i === 'string' ? { name: i, result: '' } : i) })
      }
    }
  }
  if (templates.length === 0) {
    return [
      { category: '一般检查', items: [{ name: '生命体征', result: '体温 36.5°C，脉搏 72次/分，呼吸 18次/分，血压 120/80mmHg' }] },
      { category: '头颈部', items: [{ name: '头颈部视诊', result: '未见异常' }] },
      { category: '胸部', items: [{ name: '胸部视诊', result: '胸廓对称，无畸形' }] },
      { category: '腹部', items: [{ name: '腹部视诊', result: '腹部平坦，未见异常' }] },
      { category: '神经系统', items: [{ name: '神经系统检查', result: '生理反射存在，病理征未引出' }] },
    ]
  }
  return templates
}

onMounted(async () => {
  if (!caseId.value || !target.value) {
    router.replace({ name: 'caseList' })
    return
  }
  try {
    await doPreload()
  } catch (e) {
    stopBarAnimation()
    errorMsg.value = e.message || (lang.value === 'zh' ? '加载失败，请重试' : 'Loading failed, please retry')
  }
})

onUnmounted(() => {
  stopBarAnimation()
})
</script>

<style scoped>
.station-loading-page {
  position: fixed; inset: 0; z-index: 100;
  display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, #0f0c29 0%, #1a1a3e 30%, #16213e 60%, #0f3460 100%);
}

.loading-card {
  width: 460px; max-width: 94vw;
  padding: 44px 36px 36px;
  border-radius: 20px;
  background: rgba(255,255,255,0.05);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255,255,255,0.08);
  text-align: center;
  position: relative;
  overflow: hidden;
}
.loading-card::before {
  content: '';
  position: absolute; top: -1px; left: 20%; right: 20%; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(64,158,255,0.35), transparent);
}

.loading-station-icon {
  position: relative;
  width: 72px; height: 72px;
  margin: 0 auto 18px;
  display: flex; align-items: center; justify-content: center;
  font-size: 30px; color: #409EFF;
}
.icon-ring {
  position: absolute; inset: 0;
  border-radius: 50%;
  border: 2px solid rgba(64,158,255,0.18);
  animation: iconPulse 2s ease-in-out infinite;
}
@keyframes iconPulse {
  0%, 100% { transform: scale(1); opacity: 0.25; }
  50% { transform: scale(1.14); opacity: 0.55; }
}

.loading-station-name {
  font-size: 18px; font-weight: 700; color: #fff;
  margin-bottom: 24px; letter-spacing: 0.5px;
}

.loading-case-info {
  display: flex; align-items: center; gap: 14px;
  margin-bottom: 26px;
  padding: 14px 18px;
  background: rgba(255,255,255,0.04);
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.05);
}
.loading-case-avatar {
  width: 48px; height: 48px; border-radius: 50%;
  background: rgba(255,255,255,0.08);
  display: flex; align-items: center; justify-content: center;
  color: rgba(255,255,255,0.45); font-size: 20px; flex-shrink: 0;
  position: relative; overflow: visible;
}
.loading-case-avatar img {
  width: 100%; height: 100%; object-fit: cover; border-radius: 50%;
}
.avatar-pulse {
  position: absolute; inset: -4px; border-radius: 50%;
  border: 2px solid rgba(64,158,255,0.2);
  animation: iconPulse 2.2s ease-in-out infinite .3s;
}
.loading-case-meta { text-align: left; }
.loading-case-name { font-size: 15px; font-weight: 600; color: #e8eaed; }
.loading-case-detail { font-size: 11px; color: rgba(255,255,255,0.28); margin-top: 4px; font-family: monospace; }

/* 进度条 */
.loading-progress-track {
  height: 4px; border-radius: 2px;
  background: rgba(255,255,255,0.07);
  overflow: hidden;
  margin-bottom: 12px;
}
.loading-progress-fill {
  height: 100%; border-radius: 2px;
  width: 0%;
  background: linear-gradient(90deg, #409EFF, #5FB8FF, #67C23A);
  background-size: 200% 100%;
  animation: shimmer 2s linear infinite;
}
.loading-progress-fill.done {
  transition: width 0.45s cubic-bezier(0.2, 0.8, 0.3, 1);
  animation: shimmer 2s linear infinite;
}
.progress-glow {
  position: absolute; right: 0; top: 0; bottom: 0;
  width: 20px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3));
  border-radius: 0 2px 2px 0;
}

@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: 0 0; }
}

.loading-step-label {
  font-size: 13px; color: rgba(255,255,255,0.4);
  margin-bottom: 24px; min-height: 18px;
}

.loading-phases {
  display: flex; align-items: center; justify-content: center; gap: 0;
}
.phase-dot {
  width: 34px; height: 34px; border-radius: 50%;
  background: rgba(255,255,255,0.04);
  border: 2px solid rgba(255,255,255,0.08);
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; color: rgba(255,255,255,0.15);
  transition: all .5s;
}
.phase-dot.active {
  border-color: rgba(64,158,255,0.45);
  color: #409EFF;
  background: rgba(64,158,255,0.1);
  box-shadow: 0 0 12px rgba(64,158,255,0.12);
}
.phase-line {
  width: 44px; height: 1px;
  background: rgba(255,255,255,0.06);
  transition: background .5s;
}
.phase-line.active {
  background: rgba(64,158,255,0.25);
}

.loading-error { margin-top: 24px; }
.loading-error p { color: #F56C6C; font-size: 13px; margin-bottom: 12px; }
.loading-error .btn { margin: 0 6px; }
.btn {
  padding: 8px 20px; border-radius: 8px; cursor: pointer; font-size: 13px;
  border: 1px solid rgba(255,255,255,0.15); background: transparent; color: rgba(255,255,255,0.7);
}
.btn:hover { border-color: rgba(255,255,255,0.35); color: #fff; }
.btn-primary { background: #409EFF; border-color: #409EFF; color: #fff; }
.btn-primary:hover { background: #337ecc; }
</style>
