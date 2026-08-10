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

// 类型展示顺序（与 admin mdt-case-manage/shared.js 一致）
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

// HIS 住院病历 10 类结构（中大医院分类规范）。营养/重症/临床路径无对应 FTYPE，预留空类。
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

// 按 MDTKBForm「病历内容」结构构建左侧分组导航 + 右侧记录卡片
// 返回 [{ key:'grp-{gkey}', label, type:'records', records:[...], children?:[{key:'rec-{gkey}-{i}', label, time, records:[单条]}] }]
// 无结构化记录时追加全文回退项；始终保留全部大类（无数据显示 0）
export function buildKBGroups(data) {
  const recItems = []
  const byFtype = {}
  const recs = (data && data.records) || {}
  for (const [ftype, items] of Object.entries(recs)) {
    if (Array.isArray(items) && items.length) byFtype[ftype] = items
  }
  let hasData = false
  for (const g of FTYPE_GROUPS) {
    const merged = []
    for (const ft of g.ftypes) {
      const items = byFtype[ft]
      if (items) {
        for (const it of items) merged.push({ ...it, ftypeLabel: FTYPE_LABELS[ft] || ft })
      }
    }
    merged.sort((a, b) => (a.createDate || '').localeCompare(b.createDate || ''))
    const item = { key: 'grp-' + g.key, label: g.label, type: 'records', records: merged }
    // 二级 = 目录：照搬每条记录的原始名称 + 时间，点一条定位到该条记录
    if (merged.length > 1) {
      item.children = merged.map((rec, i) => ({
        key: 'rec-' + g.key + '-' + i,
        label: rec.ftypeLabel,
        time: rec.createDate || '',
        type: 'records',
        records: [rec]
      }))
    }
    if (merged.length) hasData = true
    recItems.push(item)
  }
  if (!hasData && data?.content) {
    recItems.push({ key: 'raw', label: '原始病历全文', type: 'text', content: data.content, meta: data.title || data.id || '原始病历' })
  }
  return {
    groups: [{ label: '病历内容', items: recItems }],
    hasData,
    fallback: (data && data.content) || '',
    title: (data && data.title) || '',
  }
}

// 拉取原始病历并构建知识库分组（原始病历单页用）
export async function loadRawKB(sourceRecordId) {
  if (!sourceRecordId) return null
  try {
    const res = await fetch(`/data/raw-records/${sourceRecordId}.json`)
    const ct = (res.headers.get('content-type') || '').toLowerCase()
    if (!res.ok || !ct.includes('json')) return null
    const data = await res.json()
    return buildKBGroups(data)
  } catch (e) {
    return null
  }
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
