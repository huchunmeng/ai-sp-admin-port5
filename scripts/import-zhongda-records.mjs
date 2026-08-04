/**
 * 导入中大医院原始病历 → 生成 raw-record 素材 + 关联 MDT 病例
 *
 * 数据源：00_我的工作区/10_虚拟病人产品/55_客户相关/20_东南大学中大医院/信息中心项目/病例/
 *  - 二次导入/*.md（结构化 markdown 表格：| 字段 | 值 |）
 *  - 导出/ZY010101602948.txt（字段冒号换行：字段：\n值）
 *  - 二次导入/ZY020101577826.txt（自由文本入院记录）
 *
 * 用法：node scripts/import-zhongda-records.mjs [--clear]
 *  --clear  先删除本脚本生成的 raw-records 与 mdt-cases 文件（按已知 id），再重新生成
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, '..')

const SRC_ROOT = 'D:/klord的个人文件夹/02_work - 副本/00_我的工作区/10_虚拟病人产品/55_客户相关/20_东南大学中大医院/信息中心项目/病例'
const RAW_RECORDS_DIR = path.join(REPO_ROOT, 'apps/admin/public/data/raw-records')
const MDT_CASES_DIR = path.join(REPO_ROOT, 'apps/admin/public/data/mdt-cases')

const CLEAR = process.argv.includes('--clear')

// 8 份病历：src 相对 SRC_ROOT 的路径；format: md(表格) / colon(冒号换行) / free(自由文本)
const RECORDS = [
  { src: '二次导入/ZY010101453782.md', format: 'md', disease: '社区获得性肺炎（鹦鹉热）', specialty: '内科', disciplines: ['呼吸科', '感染科'] },
  { src: '二次导入/ZY010101478088.md', format: 'md', disease: '血尿', specialty: '泌尿外科', disciplines: ['泌尿外科', '肾内科'] },
  { src: '二次导入/ZY010101620094.md', format: 'md', disease: '胆汁淤积症', specialty: '儿科', disciplines: ['消化科', '儿科'] },
  { src: '导出/ZY010101602948.txt', format: 'colon', disease: '有机磷中毒', specialty: '重症医学科', disciplines: ['重症医学科', '急诊科'] },
  { src: '二次导入/ZY020101577826.txt', format: 'free', disease: 'Castleman病', specialty: '肾内科', disciplines: ['血液科', '肾内科', '风湿免疫科'] },
  { src: '二次导入/ZY020101721441.md', format: 'md', disease: '面神经炎', specialty: '神经内科', disciplines: ['神经内科'] },
  { src: '二次导入/ZY030101718668.md', format: 'md', disease: '纵隔肿物', specialty: '胸外科', disciplines: ['胸外科', '肿瘤科', '影像科'] },
  { src: '二次导入/ZY040101362766.md', format: 'md', disease: '腹主动脉瘤', specialty: '放射科', disciplines: ['介入与血管外科', '心外科', '影像科'] },
]

function ensureDir(dir) { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }) }

function readText(p) { return fs.readFileSync(p, 'utf-8').replace(/\r\n/g, '\n').trim() }

/** 解析 markdown 表格：| 字段 | 值 | */
function parseMdTable(text) {
  const fields = {}
  for (const line of text.split('\n')) {
    const cells = line.split('|').map(s => s.trim())
    if (cells.length >= 3) {
      const key = cells[1]
      if (key && key !== '---' && !fields[key]) fields[key] = cells[2] ?? ''
    }
  }
  return fields
}

/** 解析「字段：\n值」换行格式 */
function parseColonNewline(text) {
  const fields = {}
  const lines = text.split('\n')
  let curKey = null
  for (const line of lines) {
    const km = line.match(/^(.+?)：\s*$/)
    if (km) { curKey = km[1].trim(); fields[curKey] = ''; continue }
    if (curKey && fields[curKey] === '' && line.trim()) {
      fields[curKey] = line.trim()
    } else if (line.trim()) {
      curKey = null
    }
  }
  return fields
}

/** 解析自由文本入院记录（ZY020101577826 类） */
function parseFreeText(text) {
  const get = (re) => { const m = text.match(re); return m ? m[1].trim() : '' }
  const id = get(/病历号[：:\s]*([A-Z0-9]+)/)
  const name = get(/^姓名\s+(.+)$/m)
  const gender = get(/^性别\s+(.+)$/m)
  const age = get(/^年龄\s+(\d+)\s*岁/m)
  const chief = get(/^主诉\s+(.+)$/m)
  const present = get(/^现病史\s+(.+)$/m)
  const past = get(/^既往史\s+(.+)$/m)
  const family = get(/^家族史\s+(.+)$/m)

  let physical = ''
  const peStart = text.indexOf('体 格 检 查')
  if (peStart >= 0) {
    const peEndRel = text.indexOf('实验室及器械检查结果')
    const peEnd = peEndRel > peStart ? peEndRel : text.length
    physical = text.slice(peStart + '体 格 检 查'.length, peEnd).trim().slice(0, 1200)
  }

  let lab = ''
  const labStart = text.indexOf('实验室及器械检查结果')
  if (labStart >= 0) {
    const labEndRel = text.indexOf('修正诊断')
    const labEnd = labEndRel > labStart ? labEndRel : text.length
    lab = text.slice(labStart + '实验室及器械检查结果'.length, labEnd).trim().slice(0, 800)
  }

  let diagnosis = ''
  const diagStart = text.indexOf('初步诊断')
  if (diagStart >= 0) {
    const diagEndRel = text.indexOf('住院医师签名')
    const diagEnd = diagEndRel > diagStart ? diagEndRel : text.length
    diagnosis = text.slice(diagStart + '初步诊断'.length, diagEnd).trim().replace(/^[\s\d\.\n]+/, '').replace(/\s+日期.*$/s, '').trim()
  }

  return {
    id, name, gender, age, chief, present, past, family,
    physical, lab, diagnosis,
    vitals: '', imagingText: ''
  }
}

/** 归一化性别 */
function normGender(g) {
  const v = String(g || '').trim()
  if (v.includes('男')) return '男'
  if (v.includes('女')) return '女'
  return v
}

/** 从病历字段表提取 patientInfo（MDT 结构化） */
function fieldsToPatientInfo(f) {
  const gender = normGender(f['性别'])
  const ageRaw = String(f['年龄'] || '').replace(/岁/g, '').trim()
  return {
    name: (f['姓名'] || '').replace(/\s+/g, ''),
    gender,
    age: ageRaw && !/[*月天]/.test(ageRaw) ? Number(ageRaw) : ageRaw,
    chiefComplaint: f['主诉'] || '',
    presentIllness: f['现病史'] || '',
    physicalExam: (f['各系统检查'] || f['体格检查'] || '').slice(0, 1200),
    vitals: f['生命体征'] || '',
    labTests: f['实验室检查'] || '',
    imagingText: f['影像学检查'] || '',
    pastHistory: f['既往史'] || '',
    familyHistory: f['家族史'] || ''
  }
}

/** 生成通用剧本模板（占位，供编辑页完善） */
function buildMdtScript({ id, patientName, disease, disciplines, objective, decision }) {
  const stages = ['病例汇报', '综合讨论', '方案决策', '总结']
  const agenda = [
    {
      phase: 0, speaker: 'host',
      text: `各位专家，今天讨论「${disease}」病例（病历号 ${id}）。核心议题：${objective}。请学员先给出初步诊断印象。`,
      nextTask: 'diag01'
    },
    { phase: 1, speaker: 'host', text: '进入综合讨论，请各学科结合专科视角充分发表意见。' },
    ...disciplines.map((d) => ({ phase: 1, speaker: d, text: `结合本学科视角，请补充针对「${disease}」的专科意见。` })),
    { phase: 2, speaker: 'host', text: '请学员先独立制定诊疗方案。', nextTask: 'plan01' },
    { phase: 3, speaker: 'host', text: '本次讨论已近尾声，请写下你的反思总结。', nextTask: 'reflect01' }
  ]
  const tasks = [
    {
      key: 'diag01', type: 'text', label: '初步诊断印象', assess: 'diagnosis',
      prompt: '写出初步诊断及依据、鉴别诊断，以及希望进一步了解的信息', rows: 5,
      placeholder: '1. 诊断及依据\n2. 鉴别诊断\n3. 想进一步了解的信息',
      feedback: { hits: [], misses: [] }
    },
    {
      key: 'plan01', type: 'text', label: '诊疗方案制定', assess: 'plan',
      prompt: '独立制定完整的诊疗方案（治疗/监测/随访）', rows: 5,
      placeholder: '1. 治疗方案\n2. 监测与复查\n3. 随访计划',
      feedback: { hits: [], misses: [] }
    },
    {
      key: 'reflect01', type: 'text', label: '反思总结', assess: '',
      prompt: '写下本次讨论的收获、认知改变与遗留困惑', rows: 4,
      placeholder: '1. 学到了什么\n2. 哪些认知被改变\n3. 遗留困惑',
      feedback: { hits: [], misses: [] }
    }
  ]
  return {
    stages, agenda, tasks,
    decision: decision || `${disease}：请结合学科意见确定最终诊疗策略。`,
    followUp: '建议 1 周后复查相关指标，必要时专科门诊随访。'
  }
}

/** 系统自动生成病例编号（与 shared.js genMDTId 一致） */
function genMdtId() {
  const d = new Date()
  const ymd = d.toISOString().slice(0, 10).replace(/-/g, '')
  return `MDT-${ymd}-${Date.now().toString(36).slice(-4).toUpperCase()}`
}

/** 生成一个 MDT 病例 JSON */
function buildMdtCase(rec, fields) {
  const zyId = fields.id
  const patientName = fields.name || rec.disease
  const patientInfo = fields.patientInfo
  const objective = `围绕「${rec.disease}」开展多学科讨论，明确诊断与治疗策略`
  const script = buildMdtScript({
    id: zyId, patientName, disease: rec.disease, disciplines: rec.disciplines, objective,
    decision: fields.diagnosis
  })
  return {
    id: genMdtId(),
    caseId: '',
    name: rec.disease,
    sourceType: 'raw',
    sourceRecordId: zyId,
    stages: script.stages,
    patientInfo,
    disciplines: rec.disciplines,
    objective,
    teachingPhase: 'R1',
    levelLabel: '基础病例',
    filterKey: '',
    source: '中大医院真实病历',
    keyQuestions: [
      `该患者的初步诊断及鉴别诊断是什么？依据有哪些？`,
      `各学科对「${rec.disease}」的诊疗要点有何不同侧重？`,
      `综合多学科意见，制定个体化的诊疗方案。`
    ],
    knowledgeBase: {
      disciplinePerspectives: rec.disciplines.map((d) => ({
        dept: d,
        view: `结合「${rec.disease}」病例，请补充本学科的专业意见（待完善）。`,
        expertName: '', expertTitle: '', persona: '', expertKB: ''
      })),
      clinicalKeyPoints: '',
      references: []
    },
    agenda: script.agenda,
    tasks: script.tasks,
    decision: script.decision,
    followUp: script.followUp,
    referencesList: [],
    roleScripts: {
      observer: { opening: '各位专家，今天讨论「' + rec.disease + '」病例。请学员旁听全程讨论，可随时提问。', interruptHint: '输入你的疑问...' },
      resident: { opening: '请住院医师先说说你对这个病例的初步印象和诊疗思路。', callOut: ['请住院医师说说你的看法', '住院医师，你的初步诊断是什么？依据是什么？'] },
      attending: { opening: '您作为主诊医师，请先汇报病例要点并组织本次讨论。', promptTemplates: ['你如何权衡各学科意见？', '请你梳理一下目前的共识与分歧'] }
    }
  }
}

/** 汇总病历字段：不同格式统一到「字段名→值」字典 */
function extractFields(rec) {
  const text = readText(path.join(SRC_ROOT, rec.src))
  const srcText = text
  let fields
  if (rec.format === 'md') {
    fields = parseMdTable(text)
  } else if (rec.format === 'colon') {
    fields = parseColonNewline(text)
  } else {
    fields = {}
  }

  const zyId = (fields['案例编号'] && /^ZY/.test(fields['案例编号']) ? fields['案例编号'] : '')
    || (text.match(/ZY\d{9,}/) || [])[0] || ''
  const title = fields['案例名称'] || rec.disease
  const patientInfo = fieldsToPatientInfo(fields)
  const diagnosis = fields['诊断'] || fields['诊断依据'] || ''
  const content = srcText

  return { zyId, title, patientInfo, diagnosis, content }
}

/** 自由文本病历单独提取 */
function extractFreeFields(rec) {
  const text = readText(path.join(SRC_ROOT, rec.src))
  const parsed = parseFreeText(text)
  const patientInfo = {
    name: parsed.name,
    gender: normGender(parsed.gender),
    age: parsed.age ? Number(parsed.age) : '',
    chiefComplaint: parsed.chief,
    presentIllness: parsed.present,
    physicalExam: parsed.physical,
    vitals: parsed.vitals || '',
    labTests: parsed.lab,
    imagingText: parsed.imagingText || '',
    pastHistory: parsed.past,
    familyHistory: parsed.family
  }
  return {
    zyId: parsed.id,
    title: rec.disease,
    patientInfo,
    diagnosis: parsed.diagnosis,
    content: text
  }
}

function main() {
  ensureDir(RAW_RECORDS_DIR)
  ensureDir(MDT_CASES_DIR)

  const generatedRawIds = []
  const generatedMdtIds = []
  const results = []

  for (const rec of RECORDS) {
    const ext = rec.format === 'free' ? extractFreeFields(rec) : extractFields(rec)
    if (!ext.zyId) { console.log('✗ 未识别病历编号:', rec.src); continue }

    generatedRawIds.push(ext.zyId)

    const rawRecord = {
      id: ext.zyId,
      title: ext.title,
      patientInfo: { name: ext.patientInfo.name, gender: ext.patientInfo.gender, age: String(ext.patientInfo.age ?? '').replace('岁', '') },
      specialty: rec.specialty,
      disease: rec.disease,
      recordType: '入院记录',
      source: '东南大学附属中大医院',
      content: ext.content,
      importedAt: new Date().toISOString()
    }
    fs.writeFileSync(path.join(RAW_RECORDS_DIR, `${ext.zyId}.json`), JSON.stringify(rawRecord, null, 2), 'utf-8')

    const mdtCase = buildMdtCase({ ...rec, id: ext.zyId }, {
      id: ext.zyId,
      name: ext.patientInfo.name,
      patientInfo: ext.patientInfo,
      diagnosis: ext.diagnosis,
      disease: rec.disease
    })
    generatedMdtIds.push(mdtCase.id)
    fs.writeFileSync(path.join(MDT_CASES_DIR, `${mdtCase.id}-mdt.json`), JSON.stringify(mdtCase, null, 2), 'utf-8')

    results.push({ zyId: ext.zyId, mdtId: mdtCase.id, disease: rec.disease, name: ext.patientInfo.name })
  }

  console.log(`\n生成 raw-records: ${generatedRawIds.length} 份`)
  console.log(`生成 mdt-cases: ${generatedMdtIds.length} 个`)
  for (const r of results) {
    console.log(`  ${r.zyId}  ${r.disease}（${r.name}）→ ${r.mdtId}`)
  }
  console.log('\n完成。')
}

main()
