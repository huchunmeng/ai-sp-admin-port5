export const MDT_DISCIPLINES = [
  '心内科', '心外科', '肾内科', '呼吸科', '风湿免疫科', '影像科', '神经内科',
  '康复科', '消化科', '肿瘤科', '普外科', '内分泌科', '眼科', '神经外科',
  '泌尿外科', '骨科', '血液科', '感染科', '儿科', '妇产科'
]

export const MDT_FILTER_KEYS = [
  { value: 'cardio', label: '心血管' },
  { value: 'respiratory', label: '呼吸' },
  { value: 'neuro', label: '神经' },
  { value: 'oncology', label: '肿瘤' },
  { value: 'endocrine', label: '内分泌' }
]

export const MDT_TASK_TYPES = [
  { value: 'text', label: '文字作答' },
  { value: 'choice', label: '选择作答' },
  { value: 'exhibit', label: '影像标注' }
]

export const MDT_TASK_ASSESS = [
  { value: 'diagnosis', label: '诊断判断力' },
  { value: 'imaging', label: '影像识读能力' },
  { value: 'plan', label: '方案一致性' }
]

export const TEACHING_PHASES = [
  { value: 'U1', label: 'U1' }, { value: 'U2', label: 'U2' },
  { value: 'R1', label: 'R1' }, { value: 'R2', label: 'R2' }, { value: 'R3', label: 'R3' },
  { value: 'F1', label: 'F1' }, { value: 'F2', label: 'F2' }
]

export const LEVEL_LABELS = ['基础病例', '高阶病例', '疑难病例']

export function createEmptyMDTCase() {
  return {
    id: '',
    caseId: '',
    sourceType: 'manual',
    sourceRecordId: '',
    stages: ['病例汇报', '影像解读', '综合讨论', '方案决策', '总结'],
    patientInfo: {
      name: '', gender: '男', age: '', chiefComplaint: '', presentIllness: '',
      physicalExam: '', vitals: '', labTests: '', imagingText: '', pastHistory: '', familyHistory: ''
    },
    disciplines: [],
    objective: '',
    teachingPhase: 'R1',
    levelLabel: '基础病例',
    filterKey: '',
    source: '',
    keyQuestions: [],
    knowledgeBase: { disciplinePerspectives: [], clinicalKeyPoints: '', references: [] },
    agenda: [],
    tasks: [],
    decision: '',
    followUp: '',
    referencesList: [],
    roleScripts: {
      observer: { opening: '', interruptHint: '输入你的疑问...' },
      resident: { opening: '', callOut: [] },
      attending: { opening: '', promptTemplates: [] }
    }
  }
}

export function genMDTId() {
  const d = new Date()
  const ymd = d.toISOString().slice(0, 10).replace(/-/g, '')
  return `MDT-${ymd}-${Date.now().toString(36).slice(-4).toUpperCase()}`
}
