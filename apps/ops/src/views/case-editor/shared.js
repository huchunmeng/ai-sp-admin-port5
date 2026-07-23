export const dict = {
  teaching_phases: ['本科教学', '住院医师', '专科培训'],
  specialties: ['内科', '外科', '儿科', '妇产科', '急诊科', '全科', '骨科/康复科'],
  categoriesMap: {
    '内科': ['呼吸内科', '心内科', '消化内科'],
    '外科': ['普外科', '骨科', '神经外科'],
    '儿科': ['小儿内科', '新生儿科'],
    '妇产科': ['妇科', '产科'],
    '急诊科': ['急诊内科', '急诊外科'],
    '全科': ['常见病', '慢性病'],
    '骨科/康复科': ['脊柱外科', '关节外科', '创伤骨科']
  },
  diseasesMap: {
    '脊柱外科': ['腰椎间盘突出症', '颈椎病', '腰椎管狭窄症'],
    '呼吸内科': ['肺炎', '哮喘', 'COPD'],
    '心内科': ['高血压', '冠心病', '心衰'],
    '消化内科': ['胃炎', '胃溃疡', '肝硬化']
  }
}

export function createEmptyFormData() {
  return {
    case_id: '', teaching_phase: '', specialty: '', category: '', disease: '',
    difficulty: 'L1', title: '', patient_name: '', patient_gender: '男',
    patient_age: '', patient_occupation: '', patient_marital: '', patient_address: '',
    admission_date: '', admission_dept: '', admission_diagnosis: '', record_date: '',
    symptoms: [], chief_complaint: '', present_illness: '', general_condition: '',
    review_of_systems: '', past_history: '', personal_history: '', family_history: '',
    physical_exam: '', lab_tests: '', imaging: '', special_exams: '',
    primary_diagnosis: [], differential_diagnosis: [], diagnosis_basis: '',
    treatment_plan: '', teaching_points: '', meta: null,
    institution: '',
    reception: {
      communication_target: 'patient', personality: null,
      sp_materials: { role_info: { name: '', gender: '男', age: '', relation: '', emotion: '', active_question: '' }, self_narration: '', qa_script: [], role: 'patient' },
      examiner_materials: { summary: '', history_score_items: [], physical_score_items: [], diagnosis_answer: { primary: '', primary_score: 0, differential: [], differential_score: 0, basis_points: [] } },
      candidate_materials: { task_card: '', physical_exam_card: '' }
    },
    analysis: {
      examiner_version: { summary: '', teaching_points: [], steps: [] },
      candidate_version: { title: '', steps: [] }
    },
    humanity: { scenarios: [] }
  }
}

export function isModuleEmpty(module, formData) {
  if (!formData) return true
  if (module === 'basic') return !formData.title && (!formData.symptoms || !formData.symptoms.length) && !formData.chief_complaint && !formData.physical_exam
  if (module === 'reception') {
    const r = formData.reception
    return !r.sp_materials?.self_narration && (!r.sp_materials?.qa_script || r.sp_materials.qa_script.length === 0)
  }
  if (module === 'analysis') return formData.analysis.examiner_version.steps.length === 0 && formData.analysis.candidate_version.steps.length === 0
  if (module === 'humanity') return formData.humanity.scenarios.length === 0
  return true
}

function mapTeachingPhase(phase) {
  const m = { '住培': '专科培训', '本科': '本科教学', '住院': '住院医师' }
  return m[phase] || phase
}

function inferCategory(specialty, disease) {
  if (specialty === '骨科/康复科' && ['腰椎间盘突出症', '颈椎病', '腰椎管狭窄症'].includes(disease)) return '脊柱外科'
  return ''
}

function formatScoringGuide(guide) {
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

async function tryFetchJson(basePaths, filename) {
  for (const basePath of basePaths) {
    try {
      const res = await fetch(`${basePath}${filename}`)
      if (res.ok) return await res.json()
    } catch (e) { /* next */ }
  }
  throw new Error(`文件 ${filename} 在所有路径下均未找到`)
}

export async function loadCaseDataFromFiles(caseId) {
  if (!caseId) return createEmptyFormData()
  const basePaths = ['./data/cases/', 'data/cases/', './']
  const suffix = caseId

  try {
    const [basicData, receptionData, analysisData, humanityData, metaData] = await Promise.all([
      tryFetchJson(basePaths, `${suffix}-basic.json`).catch(() => null),
      tryFetchJson(basePaths, `${suffix}-reception.json`).catch(() => null),
      tryFetchJson(basePaths, `${suffix}-analysis.json`).catch(() => null),
      tryFetchJson(basePaths, `${suffix}-humanity.json`).catch(() => null),
      tryFetchJson(basePaths, `${suffix}-meta.json`).catch(() => null)
    ])
    if (!basicData) return createEmptyFormData()

    let teachingPhase = basicData.teaching_phase || mapTeachingPhase(basicData.training_phase || '')
    const specialty = (basicData.specialty || '').trim()
    const rawDisease = basicData.disease || ''
    let title = basicData.title || ''
    let disease = rawDisease
    if (!title && rawDisease) {
      const m = rawDisease.match(/^(.+?)（(.+?)）$/)
      if (m) { disease = m[1].trim(); title = rawDisease }
      else title = rawDisease
    } else if (title && rawDisease.includes('（')) {
      const m = rawDisease.match(/^(.+?)（/)
      if (m) disease = m[1].trim()
    }
    let category = basicData.category || inferCategory(specialty, disease) || ''
    let difficulty = ['L1', 'L2', 'L3'].includes(basicData.difficulty) ? basicData.difficulty : 'L3'

    const pi = basicData.patient_info || {}
    const patientName = pi.name || ''
    let patientAge = pi.age || ''
    if (typeof patientAge === 'string') patientAge = patientAge.replace('岁', '')
    const patientGender = { '男': '男', '1': '男', 1: '男', '女': '女', '0': '女', 0: '女' }[pi.sex] || ''
    const patientOccupation = pi.occupation || ''
    const patientMarital = pi.marital || ''
    const patientAddress = pi.address || ''

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
      specialty, category, disease, difficulty, title,
      patient_name: patientName, patient_gender: patientGender, patient_age: patientAge,
      patient_occupation: patientOccupation, patient_marital: patientMarital, patient_address: patientAddress,
      admission_date: admissionDate, admission_dept: admissionDept,
      admission_diagnosis: admissionDiagnosis, record_date: recordDate,
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
      teaching_points: teachingPointsText
    })

    if (receptionData?.sp_materials) {
      formData.reception.personality = receptionData.personality || null
      formData.reception.communication_target = receptionData.communication_target || 'patient'
      formData.reception.sp_materials = {
        role_info: receptionData.sp_materials.role_info || { name: '', gender: '男', age: '', relation: '', emotion: '', active_question: '' },
        self_narration: receptionData.sp_materials.self_narration || '',
        qa_script: receptionData.sp_materials.qa_script || [],
        role: receptionData.sp_materials.role || 'patient'
      }
      if (receptionData.examiner_materials) formData.reception.examiner_materials = receptionData.examiner_materials
      if (receptionData.candidate_materials) formData.reception.candidate_materials = receptionData.candidate_materials
    }
    if (analysisData) {
      formData.analysis.examiner_version = {
        summary: analysisData.examiner_version?.case_summary_for_examiner || '',
        teaching_points: analysisData.examiner_version?.key_teaching_points || [],
        steps: (analysisData.examiner_version?.steps || []).map((step, idx) => ({
          title: step.title || `步骤 ${step.step || idx + 1}`,
          presented_info: step.presented_info || '',
          supplementary_info: step.supplementary_info_for_examiner || '',
          question: typeof step.question === 'string' ? step.question : (step.question?.text || ''),
          reference_answer: typeof step.reference_answer === 'string' ? step.reference_answer : (step.reference_answer?.detailed_answer || ''),
          scoring_guide: step.scoring_guide || { total_score: 0, criteria: [] }
        }))
      }
      formData.analysis.candidate_version = {
        title: analysisData.candidate_version?.case_title || '',
        steps: (analysisData.candidate_version?.steps || []).map(step => ({
          presented_info: step.presented_info || '',
          question: typeof step.question === 'string' ? step.question : (step.question?.text || '')
        }))
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
    formData.meta = metaData || null
    return formData
  } catch (e) {
    return createEmptyFormData()
  }
}
