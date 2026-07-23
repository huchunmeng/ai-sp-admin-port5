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
    reception: {
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
