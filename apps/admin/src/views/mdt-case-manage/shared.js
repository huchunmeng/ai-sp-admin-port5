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

export function createEmptyDisciplinePerspective() {
  return {
    dept: '',
    view: '',
    expertName: '',
    expertTitle: '',
    persona: '',
    expertKB: '',
  }
}

export function createEmptyMDTCase() {
  return {
    id: '',
    caseId: '',
    name: '',
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
    admissionContext: { daysHospitalized: 0, priorCourse: '', priorTherapy: [] },
    trigger: { type: '跨科矛盾', reason: '' },
    preMeeting: true,
    inviteCandidates: [],
    auxiliaryDisciplines: [],
    disagreementPairs: [],
    roleScripts: {
      observer: { opening: '', interruptHint: '输入你的疑问...' },
      attending: { opening: '', promptTemplates: [] }
    }
  }
}

export function genMDTId() {
  const d = new Date()
  const ymd = d.toISOString().slice(0, 10).replace(/-/g, '')
  return `MDT-${ymd}-${Date.now().toString(36).slice(-4).toUpperCase()}`
}

// 原始病历类型中文名（全量 32 种，MDTKBForm / RawRecordEditor / MedicalRecordKB 共用）
export const FTYPE_LABELS = {
  'In_Record': '入院记录',
  'FirstRecord': '首次病程记录',
  'NormalRecord': '病程记录',
  'DirectorInvestigate': '主任/副主任医师查房记录',
  'AttendingInvestigate': '主治医师查房记录',
  'ShiftToRecord': '转入记录',
  'TurnOutRecord': '转出记录',
  'Consultation_Record': '会诊记录',
  'Multi_Dept_Consult': '多学科会诊记录',
  'CrisisRecord': '危急值病程记录',
  'SalvageRecord': '抢救记录',
  'Special_Check_Record': '特殊检查记录',
  'BloodRecord': '输血病程记录',
  'Blood_Transfusion_Record': '输血治疗同意书',
  'OperRecord': '操作记录',
  'Operation_Record': '手术记录',
  'Preoperative_discussion': '术前讨论记录',
  'Preoperative_summary': '术前小结',
  'OpsFirstRecord': '术后首次病程记录',
  'OpsSafeCheck': '手术安全核查表',
  'Ops_Agree_Record': '手术同意书',
  'OpsRiskEvaluate': '重大（特殊）手术报告审批表',
  'DifficultyDiscuss': '疑难病例讨论记录',
  'MoreDifficultyDiscuss': '疑难病例讨论记录',
  'CancerDifficultyDiscuss': '肿瘤疑难病例讨论记录',
  'DeadDiscuss': '死亡病例讨论记录',
  'Dead_Record': '死亡记录',
  'LeaveHospitalRecord': '出院前病程记录',
  'Out_Record': '出院记录',
  'Vte_ProcessRecord': 'VTE病程记录',
  'OpsDiscuss': '术前讨论记录',
  'others': '其他记录'
}

export const FTYPE_ORDER = [
  'In_Record', 'FirstRecord', 'NormalRecord',
  'DirectorInvestigate', 'AttendingInvestigate',
  'ShiftToRecord', 'TurnOutRecord',
  'Consultation_Record', 'Multi_Dept_Consult',
  'CrisisRecord', 'SalvageRecord', 'Special_Check_Record',
  'BloodRecord', 'Blood_Transfusion_Record',
  'OperRecord', 'Operation_Record',
  'Preoperative_discussion', 'Preoperative_summary',
  'OpsFirstRecord', 'OpsSafeCheck', 'Ops_Agree_Record', 'OpsRiskEvaluate',
  'DifficultyDiscuss', 'MoreDifficultyDiscuss', 'CancerDifficultyDiscuss', 'DeadDiscuss', 'Dead_Record',
  'LeaveHospitalRecord', 'Out_Record', 'Vte_ProcessRecord', 'OpsDiscuss', 'others'
]

export function orderOf(ft) { const i = FTYPE_ORDER.indexOf(ft); return i >= 0 ? i : 999 }

// HIS 住院病历 10 类结构（中大医院信息中心分类规范）。会诊记录从病程记录拆出独立大类；
// 营养病历/重症监护/临床路径当前数据源无对应 FTYPE，预留空类，未来导入对应编码时自动出现。
export const FTYPE_GROUPS = [
  { key: 'admission', label: '入院病历', ftypes: ['In_Record'] },
  { key: 'progress', label: '病程记录', ftypes: ['FirstRecord', 'NormalRecord', 'DirectorInvestigate', 'AttendingInvestigate', 'ShiftToRecord', 'TurnOutRecord', 'CrisisRecord', 'SalvageRecord', 'BloodRecord', 'OpsFirstRecord', 'LeaveHospitalRecord', 'Vte_ProcessRecord', 'DifficultyDiscuss', 'MoreDifficultyDiscuss', 'CancerDifficultyDiscuss', 'DeadDiscuss', 'Dead_Record'] },
  { key: 'consultation', label: '会诊记录', ftypes: ['Consultation_Record', 'Multi_Dept_Consult'] },
  { key: 'surgery', label: '手术信息', ftypes: ['Operation_Record', 'OperRecord', 'Preoperative_discussion', 'OpsDiscuss', 'Preoperative_summary', 'OpsSafeCheck', 'OpsRiskEvaluate'] },
  { key: 'consent', label: '知情同意', ftypes: ['Ops_Agree_Record', 'Blood_Transfusion_Record'] },
  { key: 'nutrition', label: '营养病历', ftypes: [] },
  { key: 'icu', label: '重症监护', ftypes: [] },
  { key: 'other', label: '其他相关', ftypes: ['Special_Check_Record', 'others'] },
  { key: 'discharge', label: '出院记录', ftypes: ['Out_Record'] },
  { key: 'clinical-pathway', label: '临床路径', ftypes: [] }
]
