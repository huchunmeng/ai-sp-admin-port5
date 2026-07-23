import { diseaseData, TRAINING_LEVELS, LEVEL_TO_PHASE, MASTERY_MIN_LEVEL, isDiseaseAvailable } from './disease-data.js'
import { symptomList, specialtySymptomMap } from './symptom-data.js'
import { UNDERGRAD_SPECIALTIES, undergradSymptomMap, undergradSymptomList, getUndergradSymptoms, getUndergradDiseases } from './undergrad-data.js'

export const dict = {
  training_levels: TRAINING_LEVELS,
  teaching_phases: ['本科教学', '住院医师', '专科培训'],
  symptom_list: symptomList,
  specialty_symptom_map: specialtySymptomMap,
  level_labels: Object.fromEntries(TRAINING_LEVELS.map(l => [l.value, l.label])),
  level_badge_class: {
    'U1': 'badge-info', 'U2': 'badge-info',
    'R1': 'badge-success', 'R2': 'badge-warning', 'R3': 'badge-error',
    'F1': 'badge-error', 'F2': 'badge-error'
  },
  specialties: diseaseData.specialties,
  undergrad_specialties: UNDERGRAD_SPECIALTIES,
  categoriesMap: diseaseData.categoriesMap,
  diseasesMap: diseaseData.diseasesMap,
  MASTERY_MIN_LEVEL,
  LEVEL_TO_PHASE,
  isDiseaseAvailable
}

export { UNDERGRAD_SPECIALTIES, undergradSymptomMap, undergradSymptomList, getUndergradSymptoms, getUndergradDiseases }

export function getDiseaseNames(category, level) {
  const items = diseaseData.diseasesMap[category] || []
  if (!level) return items.map(d => d.name)
  return items.filter(d => isDiseaseAvailable(d.mastery, level)).map(d => d.name)
}

export function getAllDiseaseNames(level) {
  const seen = new Set()
  const result = []
  for (const cat of Object.keys(diseaseData.diseasesMap)) {
    for (const d of diseaseData.diseasesMap[cat]) {
      if (!level || isDiseaseAvailable(d.mastery, level)) {
        if (!seen.has(d.name)) { seen.add(d.name); result.push(d.name) }
      }
    }
  }
  return result
}

export function getSpecialtySymptomList(specialty) {
  const entry = specialtySymptomMap[specialty]
  return entry ? entry.symptoms : []
}

export function getSymptomDiseaseNames(specialty, symptom, level) {
  const entry = specialtySymptomMap[specialty]
  if (!entry) return []
  const items = (entry.symptomMap || {})[symptom] || []
  if (!level) return items.map(d => d.name)
  return items.filter(d => isDiseaseAvailable(d.mastery, level)).map(d => d.name)
}

const SIMPLE_LEVELS = ['U1', 'U2']

export function createEmptyFormData() {
  return {
    case_id: '', teaching_phase: '', specialty: '', category: '', disease: '', symptom: '', score_sheet_template: '',
    communication_target: 'patient',
    version: '', title: '', patient_name: '', patient_gender: '男',
    patient_age: '', patient_occupation: '', patient_education: '', patient_marital: '', patient_address: '',
    patient_pregnancy: '未怀孕',
    admission_date: '', admission_dept: '', admission_diagnosis: '', record_date: '',
    symptoms: [], chief_complaint: '', present_illness: '', general_condition: '',
    review_of_systems: '', past_history: '', personal_history: '', family_history: '',
    physical_exam: '', lab_tests: '', imaging: '', special_exams: '',
    primary_diagnosis: [], differential_diagnosis: [], diagnosis_basis: '',
    treatment_plan: '', teaching_points: '', specialty_focus: '', meta: null,
    reception: {
      communication_target: 'patient', personality: null,
      sp_materials: { role_info: { name: '', gender: '男', age: '', relation: '', emotion: '', active_question: '' }, self_narration: '', qa_script: [], role: 'patient' },
      examiner_materials: { summary: '', history_score_items: [], physical_score_items: [], diagnosis_answer: { primary: '', primary_score: 0, differential: [], differential_score: 0, basis_points: [] } },
      candidate_materials: { task_card: '', physical_exam_card: '' }
    },
    analysis: {
      examiner_version: { summary: '', teaching_points: [], steps: [{ title: '', presented_info: '', supplementary_info: '', questions: [{ text: '', reference_answer: '', scoring_guide: '' }] }] },
      candidate_version: { title: '', steps: [{ presented_info: '', questions: [{ text: '' }] }] }
    },
    humanity: { scenarios: [] },
    atypical_dialogue: null,
    score_sheet: [],
    station_scores: null,
    examination_materials: []
  }
}

export function isModuleEmpty(module, formData) {
  if (!formData) return true
  if (module === 'basic') return !formData.title && (!formData.symptoms || !formData.symptoms.length) && !formData.chief_complaint && !formData.physical_exam
  if (module === 'reception') {
    const r = formData.reception
    return !r.sp_materials?.self_narration && (!r.sp_materials?.qa_script || r.sp_materials.qa_script.length === 0)
  }
  if (module === 'analysis') {
    const evSteps = formData.analysis.examiner_version.steps
    const cvSteps = formData.analysis.candidate_version.steps
    const hasContent = (steps) => steps.some(s => (s.questions || []).some(q => q.text || q.reference_answer || q.scoring_guide))
    return !hasContent(evSteps) && !hasContent(cvSteps)
  }
  if (module === 'humanity') return formData.humanity.scenarios.length === 0
  if (module === 'mentalExam') return !formData.atypical_dialogue
  if (module === 'materials') return !formData.examination_materials || formData.examination_materials.length === 0
  return true
}

function inferCategory(specialty, disease) {
  if (!specialty || !disease) return ''
  // Look up in disease data
  const categories = diseaseData.categoriesMap[specialty]
  if (!categories) return ''
  const diseasesMap = diseaseData.diseasesMap
  for (const cat of categories) {
    const diseases = diseasesMap[cat]
    if (!diseases) continue
    if (diseases.some(d => d.name === disease)) return cat
  }
  return ''
}

export function formatScoringGuide(guide) {
  if (typeof guide === 'string') return guide
  if (!guide || typeof guide !== 'object') return ''
  const parts = []
  if (guide.total_score) parts.push(`总分：${guide.total_score}`)
  if (Array.isArray(guide.criteria) && guide.criteria.length) {
    parts.push('评分标准：')
    guide.criteria.forEach((c, i) => parts.push(`  ${i + 1}. ${c.item} (${c.score}分)`))
  }
  return parts.join('\n')
}

function normalizeOldMeta(old) {
  // 检测旧格式：顶层有 meta_info 而非 pre_generation
  if (!old || !old.meta_info) return old
  const mi = old.meta_info || {}
  const gr = old.generation_record || {}
  const sp = old.sp_play_rules || {}
  const scoring = old.ai_scoring_rules || {}
  const diag = old.diagnosis_scoring_rules || null

  // 修复旧 emotion 格式 {stage, emotion, trigger} → {trigger, change}
  const emotionProgression = (sp.emotion_progression || []).map(e => ({
    trigger: e.trigger || '',
    change: e.emotion || e.change || ''
  }))

  // 修复旧 PE 模板格式 {_exam_focus, _exam_card} → {item, intent, keywords, semantic_hints, result}
  const peTemplates = (old.physical_exam_result_templates || []).map(t => ({
    item: t.item || t._exam_focus || '',
    intent: t.intent || t._exam_card || '',
    keywords: t.keywords || [],
    semantic_hints: t.semantic_hints || [],
    result: t.result || ''
  }))

  return {
    case_id: mi.case_id || '',
    version: mi.version || 'v1.0',
    pre_generation: {
      specialty: mi.specialty || '',
      disease: mi.disease || '',
      difficulty: mi.teaching_phase || '',
      training_phase: mi.training_phase || '',
      input_mode: mi.input_mode || '参数生成模式',
      source_document: mi.source_document_ref || null
    },
    generation_trace: {
      basic_info: gr.basic_info || { model: '', prompt_version: '', generated_at: '' },
      ...(gr.encounter ? { encounter: gr.encounter } : {}),
      ...(gr.case_analysis ? { case_analysis: gr.case_analysis } : {}),
      ...(gr.communication ? { communication: gr.communication } : {})
    },
    ai_services: {
      ai_sp: {
        sp_play_rules: {
          knowledge_boundary: sp.knowledge_boundary || { knows: [], does_not_know: [] },
          emotion_progression: emotionProgression,
          vague_response_templates: sp.vague_response_templates || [],
          refuse_to_answer: sp.refuse_to_answer || []
        },
        physical_exam_result_templates: peTemplates
      },
      ai_scoring: {
        ai_scoring_rules: {
          history_rules: scoring.history_rules || [],
          physical_rules: scoring.physical_rules || [],
          communication_rules: scoring.communication_rules || [],
          deduction_rules: scoring.deduction_rules || null
        },
        diagnosis_scoring_rules: diag
      }
    },
    review: old.review || { status: 'pending', reviewed_by: null, reviewed_at: null, comments: null },
    deployment: old.deployment || { is_published: false, published_at: null },
    key_timeline: old.key_timeline || [{ event: 'AI 生成完成', timestamp: mi.generation_timestamp || '' }]
  }
}

function buildFallbackMeta(basicData, receptionData, analysisData, humanityData, caseId, personality) {
  if (!basicData) return null
  const pre = {
    case_id: basicData.case_id || caseId || '',
    specialty: basicData.specialty || '',
    disease: basicData.disease || '',
    difficulty: basicData.difficulty || '',
    training_phase: basicData.training_phase || '',
    input_mode: '参数生成',
    source_document: '无'
  }
  const trace = {}
  if (basicData) trace.basic_info = { model: 'auto', prompt_version: 'v2.0', generated_at: new Date().toISOString() }
  if (receptionData) trace.encounter = { model: 'auto', prompt_version: 'v2.0', generated_at: new Date().toISOString() }
  if (analysisData) trace.case_analysis = { model: 'auto', prompt_version: 'v2.0', generated_at: new Date().toISOString() }
  if (humanityData) trace.communication = { model: 'auto', prompt_version: 'v2.0', generated_at: new Date().toISOString() }
  return {
    case_id: pre.case_id,
    version: 'v2.0',
    personality: personality || { expressiveness: '普通型', sensitivity: '普通敏感度', resilience: '普通恢复力' },
    pre_generation: pre,
    generation_trace: trace,
    key_timeline: []
  }
}

async function tryFetchJson(basePaths, filename) {
  for (const basePath of basePaths) {
    try {
      const ctrl = new AbortController()
      const result = await Promise.race([
        (async () => {
          const res = await fetch(`${basePath}${filename}`, { signal: ctrl.signal })
          if (res.ok) return await res.json()
          throw new Error(`HTTP ${res.status}`)
        })(),
        new Promise((_, reject) => setTimeout(() => { ctrl.abort(); reject(new Error('timeout')) }, 8000))
      ])
      return result
    } catch (e) { /* next */ }
  }
  return null
}

export async function loadCaseDataFromFiles(caseId) {
  if (!caseId) return { formData: createEmptyFormData(), raw: null }
  const basePaths = ['data/cases/', './data/cases/']
  const suffix = caseId

  try {
    const [basicData, receptionData, analysisData, humanityData, mentalExamData, metaData, scoreSheetData, materialsData] = await Promise.all([
      tryFetchJson(basePaths, `${suffix}-basic.json`).catch(() => null),
      tryFetchJson(basePaths, `${suffix}-reception.json`).catch(() => null),
      tryFetchJson(basePaths, `${suffix}-analysis.json`).catch(() => null),
      tryFetchJson(basePaths, `${suffix}-humanity.json`).catch(() => null),
      tryFetchJson(basePaths, `${suffix}-mentalExam.json`).catch(() => null),
      tryFetchJson(basePaths, `${suffix}-meta.json`).catch(() => null),
      tryFetchJson(basePaths, `${suffix}-scoreSheet.json`).catch(() => null),
      tryFetchJson(basePaths, `${suffix}-materials.json`).catch(() => null)
    ])
    if (!basicData) return { formData: createEmptyFormData(), raw: null }

    const sevenLevels = ['U1', 'U2', 'R1', 'R2', 'R3', 'F1', 'F2']
    let teachingPhase = basicData.teaching_phase || ''
    if (!sevenLevels.includes(teachingPhase)) {
      // 旧数据兼容：difficulty 字段存的是七级值
      teachingPhase = sevenLevels.includes(basicData.difficulty) ? basicData.difficulty : 'R1'
    }
    let specialty = (basicData.specialty || '').trim()
    // 自动推断：如果 specialty 为空，尝试从 admission_department 推断
    if (!specialty) {
      const dept = basicData.admission_info?.admission_department || ''
      if (dept && diseaseData.specialties.includes(dept)) specialty = dept
    }
    const rawDisease = basicData.disease || ''
    let title = basicData.title || ''
    let disease = rawDisease
    // 自动推断：如果 disease 为空，尝试从 title 中提取（如 "大疱性类天疱疮（伴糖尿病激素两难）"）
    if (!disease && title) {
      const m = title.match(/^(.+?)（/)
      if (m) disease = m[1].trim()
    }
    if (!title && rawDisease) {
      const m = rawDisease.match(/^(.+?)（(.+?)）$/)
      if (m) { disease = m[1].trim(); title = rawDisease }
      else title = rawDisease
    } else if (title && rawDisease.includes('（')) {
      const m = rawDisease.match(/^(.+?)（/)
      if (m) disease = m[1].trim()
    }
    let category = basicData.category || ''
    // 校验 category 是否为当前 specialty 下的合法值，非法则降级推断
    if (category && specialty) {
      const validCategories = diseaseData.categoriesMap[specialty]
      if (validCategories && !validCategories.includes(category)) {
        category = inferCategory(specialty, disease) || category
      }
    }
    if (!category) category = inferCategory(specialty, disease) || ''

    const pi = basicData.patient_info || {}
    const patientName = pi.name || ''
    let patientAge = pi.age != null ? pi.age : ''
    if (typeof patientAge === 'string') patientAge = patientAge.replace('岁', '')
    const patientGender = { '男': '男', '1': '男', 1: '男', '女': '女', '0': '女', 0: '女' }[pi.sex] || ''
    const patientOccupation = pi.occupation || ''
    const patientEducation = pi.education || ''
    const patientMarital = pi.marital || ''
    const patientAddress = sanitizeAddress(pi.address || '')
    const patientPregnancy = pi.pregnancy || basicData.pregnancy || '未怀孕'
    // personality 优先从 reception 取（SP角色描述推导），fallback 到 basic（存量兼容），再 fallback 默认
    const patientPersonality = receptionData?.personality || basicData.personality || { expressiveness: '普通型', sensitivity: '普通敏感度', resilience: '普通恢复力' }

    const version = basicData.version || ''

    const ai = basicData.admission_info || {}
    const admissionDate = (ai.admission_time || '').split(' ')[0]
    const admissionDept = ai.admission_department || ''
    const admissionDiagnosis = ai.admission_diagnosis || ''
    const recordDate = basicData.record_date || new Date().toISOString().slice(0, 10)

    const pe = basicData.physical_exam || {}
    const physicalExamText = [pe.vital_signs, pe.general, pe.systemic].filter(Boolean).join('\n')

    const symptoms = (() => {
      const raw = basicData.symptoms
      if (Array.isArray(raw)) return raw.filter(s => s)
      if (typeof raw === 'string' && raw.trim()) return raw.split(/[,，、;；\n]+/).map(s => s.trim()).filter(s => s)
      const cc = basicData.chief_complaint || ''
      if (cc) {
        const kw = cc.replace(/[，。；;、\n]/g, ',').split(',').map(s => s.replace(/[：:反复加重伴无明显诱因出现\d]+周?月?天?[左右]/g, '').trim()).filter(s => s.length >= 2 && s.length <= 20)
        if (kw.length) return kw
      }
      return []
    })()

    const diagnosis = basicData.diagnosis || {}
    const primaryDiagnosis = (() => {
      const raw = diagnosis.preliminary || ''
      return Array.isArray(raw) ? raw.filter(s => s) : (raw ? [raw.trim()].filter(s => s) : [])
    })()
    const differentialDiagnosis = (() => {
      const raw = diagnosis.differential
      if (Array.isArray(raw)) return raw.filter(s => s)
      if (typeof raw === 'string' && raw.trim()) return raw.split(/[,，、;；\n]+/).map(s => s.trim()).filter(s => s)
      return []
    })()
    const diagnosisBasis = (() => {
      const b = diagnosis.basis
      return Array.isArray(b) ? b.join('\n') : (typeof b === 'string' ? b : '')
    })()

    let teachingPointsText = ''
    if (Array.isArray(basicData.teaching_points)) teachingPointsText = basicData.teaching_points.join('\n')
    else if (typeof basicData.teaching_points === 'string') teachingPointsText = basicData.teaching_points

    const formData = createEmptyFormData()
    Object.assign(formData, {
      case_id: basicData.case_id || caseId, teaching_phase: teachingPhase,
      specialty, category, disease, title,
      patient_name: patientName, patient_gender: patientGender, patient_age: patientAge,
      patient_occupation: patientOccupation, patient_education: patientEducation, patient_marital: patientMarital, patient_address: patientAddress,
      patient_pregnancy: patientPregnancy,
      admission_date: admissionDate, admission_dept: admissionDept,
      admission_diagnosis: admissionDiagnosis, record_date: recordDate,
      version,
      symptoms, chief_complaint: basicData.chief_complaint || '',
      present_illness: basicData.present_illness || '',
      general_condition: basicData.general_condition || '',
      review_of_systems: basicData.review_of_systems || '',
      past_history: basicData.past_history || '',
      personal_history: basicData.personal_history || '',
      family_history: basicData.family_history || '',
      physical_exam: physicalExamText, lab_tests: basicData.lab_tests || '',
      imaging: basicData.imaging || '', special_exams: basicData.special_exams || '',
      primary_diagnosis: primaryDiagnosis, differential_diagnosis: differentialDiagnosis,
      diagnosis_basis: diagnosisBasis, treatment_plan: basicData.treatment_plan || '',
      teaching_points: teachingPointsText, specialty_focus: basicData.specialty_focus || '',
      score_sheet_template: basicData.score_sheet_template || '',
      communication_target: basicData.communication_target || (specialty === '儿科' || specialty === '精神科' ? 'family' : 'patient'),
    })

    if (basicData.score_sheet) {
      formData.score_sheet = basicData.score_sheet
    } else if (scoreSheetData && Array.isArray(scoreSheetData)) {
      formData.score_sheet = scoreSheetData
    } else if (scoreSheetData?.score_sheet && Array.isArray(scoreSheetData.score_sheet)) {
      formData.score_sheet = scoreSheetData.score_sheet
    }

    if (receptionData?.sp_materials) {
      formData.reception.personality = receptionData.personality || null
      formData.reception.sp_materials = {
        role_info: receptionData.sp_materials.role_info || { name: '', gender: '男', age: '', relation: '', emotion: '', active_question: '' },
        self_narration: receptionData.sp_materials.self_narration || '',
        qa_script: receptionData.sp_materials.qa_script || [],
        role: receptionData.sp_materials.role || 'patient'
      }
      if (receptionData.communication_target) formData.reception.communication_target = receptionData.communication_target
      if (receptionData.examiner_materials) formData.reception.examiner_materials = receptionData.examiner_materials
      if (receptionData.candidate_materials) formData.reception.candidate_materials = receptionData.candidate_materials
    }
    if (analysisData) {
      formData.analysis.examiner_version = {
        summary: analysisData.examiner_version?.case_summary_for_examiner || '',
        teaching_points: analysisData.examiner_version?.key_teaching_points || [],
        steps: (analysisData.examiner_version?.steps || []).map((step, idx) => {
          // 新版 questions[] 数组格式
          const hasQuestionsArr = Array.isArray(step.questions) && step.questions.length > 0
          const questions = hasQuestionsArr
            ? step.questions.map(q => ({
                text: q.text || '',
                reference_answer: q.reference_answer?.detailed_answer || (q.reference_answer?.main_points || []).join('\n') || (typeof q.reference_answer === 'string' ? q.reference_answer : ''),
                scoring_guide: q.scoring_guide || { total_score: 0, criteria: [] }
              }))
            : []
          // 旧版单题目格式兼容
          if (!hasQuestionsArr) {
            const qText = typeof step.question === 'string' ? step.question : (step.question?.text || '')
            const aText = typeof step.reference_answer === 'string' ? step.reference_answer : (step.reference_answer?.detailed_answer || '')
            const sGuide = typeof step.scoring_guide === 'object' && step.scoring_guide !== null
              ? step.scoring_guide
              : (step.scoring_guide || { total_score: 0, criteria: [] })
            if (qText || aText || (typeof sGuide === 'string' ? sGuide : sGuide.total_score || sGuide.criteria?.length)) {
              questions.push({ text: qText, reference_answer: aText, scoring_guide: sGuide })
            }
          }
          if (!questions.length) {
            questions.push({ text: '', reference_answer: '', scoring_guide: { total_score: 0, criteria: [] } })
          }
          // 拆分合并的问题文本（如 "诊断？鉴别？" → 两个独立问题）
          const expanded = []
          for (const q of questions) {
            const parts = splitMergedText(q.text)
            if (parts.length > 1) {
              const refParts = splitMergedText(q.reference_answer || '')
              const sGuideIsObj = typeof q.scoring_guide === 'object' && q.scoring_guide !== null
              parts.forEach((t, i) => expanded.push({
                text: t,
                reference_answer: refParts[i] || '',
                scoring_guide: i === 0 ? (q.scoring_guide || { total_score: 0, criteria: [] }) : (sGuideIsObj ? { total_score: 0, criteria: [] } : '')
              }))
            } else {
              expanded.push(q)
            }
          }
          return {
            title: step.title || `步骤 ${step.step || idx + 1}`,
            presented_info: step.presented_info || '',
            supplementary_info: step.supplementary_info_for_examiner || '',
            questions: expanded
          }
        })
      }
      formData.analysis.candidate_version = {
        title: analysisData.candidate_version?.case_title || '',
        steps: (analysisData.candidate_version?.steps || []).map(step => {
          const hasQuestionsArr = Array.isArray(step.questions) && step.questions.length > 0
          const questions = hasQuestionsArr
            ? step.questions.map(q => ({ text: q.text || '' }))
            : []
          if (!hasQuestionsArr) {
            const qText = typeof step.question === 'string' ? step.question : (step.question?.text || '')
            if (qText) questions.push({ text: qText })
          }
          if (!questions.length) questions.push({ text: '' })
          // 拆分合并的问题文本
          const expanded = []
          for (const q of questions) {
            const parts = splitMergedText(q.text)
            if (parts.length > 1) {
              parts.forEach(t => expanded.push({ text: t }))
            } else {
              expanded.push(q)
            }
          }
          return {
            presented_info: step.presented_info || '',
            questions: expanded
          }
        })
      }
    }
    if (humanityData) {
      formData.humanity.scenarios = (humanityData.scenarios || []).map(scene => ({
        scenario_id: scene.scenario_id || '', scenario_name: scene.scenario_name || '',
        layer: scene.layer || '', communication_target: scene.communication_target || 'patient',
        sp_materials: scene.sp_materials || { role_description: '', opening_line: '', script: [] },
        examiner_materials: scene.examiner_materials || { clinical_context: '', full_dialogue: [], reference_answer: { key_communication_points: [] }, scoring_guide: { total_score: 0, criteria: [] } },
        candidate_materials: scene.candidate_materials || { clinical_context: '', task: '', time_limit: 0, note: '' }
      }))
    }
    formData.meta = metaData ? normalizeOldMeta(metaData) : buildFallbackMeta(basicData, receptionData, analysisData, humanityData, caseId, patientPersonality)
    formData.atypical_dialogue = metaData?.atypical_dialogue || mentalExamData || null
    formData.examination_materials = (materialsData && materialsData.items) ? materialsData.items : []
    return { formData, raw: { basicData, scoreSheetData, receptionData, analysisData, humanityData, mentalExamData, metaData, materialsData } }
  } catch (e) {
    return { formData: createEmptyFormData(), raw: null }
  }
}

function stripQuestionNumber(text) {
  return text.replace(/^\d+[.、)）]\s*/, '').replace(/^[（(]\d+[)）]\s*/, '')
}

export function splitMergedText(text) {
  if (!text || typeof text !== 'string') return []
  const lines = text.split(/\n/).map(s => s.trim()).filter(Boolean)
  const result = []
  let buf = []
  for (const line of lines) {
    if (/^\d+[.、)）]/.test(line) || /^[（(]\d+[)）]/.test(line)) {
      if (buf.length) { result.push(buf.join('\n')); buf = [] }
      buf.push(stripQuestionNumber(line))
    } else {
      buf.push(line)
    }
  }
  if (buf.length) result.push(buf.join('\n'))
  if (result.length > 1) return result
  const single = result.length === 1 ? result[0] : text.trim()
  if (!single) return []
  const qmarks = (single.match(/？/g) || []).length
  if (qmarks >= 2) {
    const parts = single.split(/？\s*/).filter(Boolean).map(s => s.trim() + '？')
    if (parts.length >= 2) return parts
  }
  const periods = (single.match(/。/g) || []).length
  if (qmarks === 0 && periods >= 2) {
    const parts = single.split(/。\s*/).filter(Boolean).map(s => s.trim() + '。')
    if (parts.length >= 2) return parts
  }
  return [single]
}

const VIRTUAL_CITIES = [
  { real: /北京市|上海|广州|深圳|杭州|南京|武汉|成都|重庆|西安|郑州|长沙|沈阳|合肥|福州|济南|昆明|天津|苏州|东莞|青岛|大连|厦门|宁波/g, virtual: '东海省滨海市' },
  { real: /黑龙江省|吉林省|辽宁省/g, virtual: '北朔省' },
  { real: /河北省|山西省/g, virtual: '平阳省' },
  { real: /山东省/g, virtual: '东莱省' },
  { real: /江苏省|浙江省/g, virtual: '江南省' },
  { real: /广东省|广西/g, virtual: '岭南省' },
  { real: /四川省|贵州省|云南省/g, virtual: '云岭省' },
  { real: /湖北省|湖南省/g, virtual: '楚江省' },
  { real: /河南省/g, virtual: '中原省' },
  { real: /陕西省|甘肃省/g, virtual: '陇西省' },
]

export function sanitizeAddress(addr) {
  if (!addr) return addr
  VIRTUAL_CITIES.forEach(c => { c.real.lastIndex = 0 })
  const isReal = VIRTUAL_CITIES.some(c => c.real.test(addr))
  if (!isReal) return addr
  let sanitized = addr
  VIRTUAL_CITIES.forEach(c => { sanitized = sanitized.replace(c.real, c.virtual) })
  sanitized = sanitized.replace(/[区县市]?[一-龥]{0,4}(街道|路|号|弄|巷|村|镇|乡|花园|小区|大厦|单元|栋|楼|座).*/g, '')
  if (!sanitized.includes('省') && !sanitized.includes('市')) {
    sanitized = '东海省滨海市'
  }
  return sanitized
}
