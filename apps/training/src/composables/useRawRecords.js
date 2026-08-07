/**
 * 原始病历加载层（训练端 MDT 病例详情抽屉用）
 * 数据源：apps/admin/public/data/raw-records/{id}.json（dev 由 serve-admin-data 中间件提供，
 * 构建期由 vite copy-cases-build 复制）。records 结构 { FTYPE: [{createDate, doctorCode, visitNo, content}] }，
 * 摊平后按事件线（createDate 升序）展示。
 */

// 原始病历类型中文名（全量 32 种，与 admin mdt-case-manage/shared.js 一致）
const FTYPE_LABELS = {
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
  'others': '其他记录',
}

export function ftypeLabel(ft) {
  return FTYPE_LABELS[ft] || ft || '其他记录'
}

// 摊平 records{FTYPE:[...]} → 按 createDate 升序时间线；无结构化记录回退 content 全文
export function flattenRecords(data) {
  const items = []
  const recs = (data && data.records) || {}
  for (const [ftype, list] of Object.entries(recs)) {
    if (!Array.isArray(list)) continue
    for (const it of list) {
      items.push({
        ftype,
        ftypeLabel: ftypeLabel(ftype),
        createDate: it.createDate || '',
        doctorCode: it.doctorCode || '',
        visitNo: it.visitNo || '',
        content: it.content || '',
      })
    }
  }
  items.sort((a, b) => (a.createDate || '').localeCompare(b.createDate || ''))
  return {
    items,
    hasData: items.length > 0,
    fallback: (data && data.content) || '',
    title: (data && data.title) || '',
  }
}

// 拉取原始病历
export async function loadRawRecords(sourceRecordId) {
  if (!sourceRecordId) return null
  try {
    const res = await fetch(`/data/raw-records/${sourceRecordId}.json`)
    const ct = (res.headers.get('content-type') || '').toLowerCase()
    if (!res.ok || !ct.includes('json')) return null
    const data = await res.json()
    return flattenRecords(data)
  } catch (e) {
    return null
  }
}
