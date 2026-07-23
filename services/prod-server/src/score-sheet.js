import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)

const templateJson = require(path.resolve(__dirname, '../../../apps/admin/src/data/templates/score-sheet-v1.json'))

const HISTORY_SHEET_TEMPLATE = templateJson.items

function buildFillContext(basicData) {
  const pi = basicData.patient_info || {}
  const gender = pi.patient_gender || pi.sex || basicData.patient_gender || ''
  const genderStr = gender === '女' || String(gender) === '0' ? '女' : '男'
  const symptoms = basicData.symptoms || []
  const cc = basicData.chief_complaint || ''
  const pi_str = typeof basicData.present_illness === 'string' ? basicData.present_illness : ''

  return {
    name: pi.patient_name || basicData.patient_name || '',
    gender: genderStr,
    age: pi.patient_age || basicData.patient_age || '',
    occupation: pi.occupation || basicData.occupation || '',
    chiefComplaint: cc,
    presentIllness: pi_str,
    symptoms: symptoms.length ? symptoms : [],
    mainSymptom: symptoms[0] || cc || '',
  }
}

function fillTemplate(str, ctx) {
  return str.replace(/\{symptom\}/g, ctx.mainSymptom || '主要症状')
}

function buildRulesFallback(tpl) {
  const { score } = tpl
  if (score >= 12) return `全面覆盖得满分，遗漏关键信息按比例扣分（满分${score}分）`
  if (score >= 8) return `完整询问得满分，部分遗漏按比例扣分（满分${score}分）`
  return `询问到即得分，未询问不得分（满分${score}分）`
}

// 子要点定义（与源文件 score-sheet-generator.js 保持一致）
const SUB_POINT_DEFS = {
  '现病史采集|起病情况与诱因': {
    desc: [
      '询问{symptom}的起病具体时间（年/月/日或大致时间段）',
      '询问起病方式（突发/缓慢/间歇性/持续性）',
      '询问有无明显诱因（劳累、感染、情绪激动、饮食不当、外伤等）',
      '询问{symptom}起病时的主要表现及病情演变过程'
    ],
    rule: ['起病时间明确', '起病方式描述清晰', '诱因问询完整', '起病表现及演变清楚']
  },
  '现病史采集|主要症状特点': {
    desc: [
      '询问{symptom}的具体性质（如疼痛性质：刺痛/钝痛/绞痛等）',
      '询问{symptom}的准确部位及有无放射',
      '询问{symptom}的严重程度及对日常生活的影响',
      '询问{symptom}的持续时间、发作频率及变化趋势'
    ],
    rule: ['症状性质描述准确', '部位定位清楚', '程度评估恰当', '持续时间及频率明确']
  },
  '现病史采集|伴随症状与鉴别': {
    desc: [
      '主动询问有无其他伴随症状',
      '询问伴随症状与{symptom}的时间关系和先后顺序',
      '询问有鉴别意义的阴性症状（如发热、寒战、恶心呕吐等）'
    ],
    rule: ['伴随症状问询完整', '伴随与主症状关系清晰', '阴性症状有鉴别']
  },
  '现病史采集|诊疗经过': {
    desc: [
      '询问发病后就诊的医院及科室',
      '询问已做的检查项目及结果（实验室、影像学等）',
      '询问用药情况（药物名称、剂量、用药途径、疗程、效果）'
    ],
    rule: ['就诊医院科室明确', '检查项目及结果清楚', '用药情况详细']
  },
  '现病史采集|发病以来一般状况': {
    desc: [
      '询问发病以来的精神状态及睡眠情况',
      '询问发病以来食欲、饮食及体重变化',
      '询问发病以来二便情况'
    ],
    rule: ['精神睡眠问及', '饮食体重问及', '二便情况问及']
  },
  '既往史采集|既往疾病史': {
    desc: [
      '询问有无高血压、糖尿病、冠心病等慢性病史',
      '询问有无肝炎、结核等传染病史',
      '询问有无其他重要疾病史'
    ],
    rule: ['慢性病史清楚', '传染病史清楚', '其他疾病史问及']
  },
  '既往史采集|手术外伤史': {
    desc: [
      '询问有无手术史（名称、时间）',
      '询问有无外伤史及输血史'
    ],
    rule: ['手术史明确', '外伤输血史清楚']
  },
  '既往史采集|过敏史': {
    desc: [
      '询问有无药物过敏史（具体药物、表现）',
      '询问有无食物或其他过敏史'
    ],
    rule: ['药物过敏史明确', '其他过敏史问及']
  },
  '个人史与家族史|个人生活习惯': {
    desc: [
      '询问吸烟史（有无、年限、量）',
      '询问饮酒史（有无、种类、量、年限）',
      '询问职业暴露史及特殊嗜好',
      '婚育史（已婚/未婚，子女情况）'
    ],
    rule: ['吸烟史清楚', '饮酒史清楚', '职业暴露问及', '婚育史清楚']
  },
  '个人史与家族史|家族遗传病史': {
    desc: [
      '询问直系亲属中有无类似疾病',
      '询问家族中有无遗传病史',
      '询问直系亲属健康状况'
    ],
    rule: ['类似疾病问及', '遗传病史问及' ,'亲属健康状况问及']
  },
  '系统回顾|各系统回顾完整性': {
    desc: [
      '有无发热寒战等全身症状',
      '有无头晕头痛心悸等心血管症状',
      '有无呼吸困难咳嗽咳痰等呼吸系统症状',
      '有无腹痛腹泻恶心呕吐等消化系统症状',
      '有无尿频尿急尿痛等泌尿系统症状',
      '有无关节肿痛皮疹等风湿免疫相关表现'
    ],
    rule: ['全身症状问及', '心血管系统问及', '呼吸系统问及', '消化系统问及', '泌尿系统问及', '风湿免疫问及']
  },
  '问诊技巧与沟通|问诊条理与组织': {
    desc: [
      '问诊顺序合理，从主诉展开到系统回顾',
      '问题聚焦，避免重复或不必要的发散',
      '适时归纳总结，确认信息准确性'
    ],
    rule: ['问诊顺序合理', '问题聚焦不重复', '归纳总结到位']
  },
  '问诊技巧与沟通|沟通技巧与人文关怀': {
    desc: [
      '自我介绍并说明问诊目的',
      '使用通俗易懂的语言，避免专业术语',
      '认真倾听，给予适当回应，不过多打断',
      '适当使用开放式提问',
      '对患者痛苦表达共情与关怀',
      '结束时归纳总结确认理解无误'
    ],
    rule: ['自我介绍与说明目的', '语言通俗易懂', '倾听与回应', '开放式提问', '共情与关怀', '归纳总结确认']
  }
}

export function generateV1ScoreSheet(basicData) {
  if (!basicData) return []

  const ctx = buildFillContext(basicData)
  const rows = []

  for (const t of HISTORY_SHEET_TEMPLATE) {
    const key = `${t.category}|${t.item}`
    const def = SUB_POINT_DEFS[key]

    if (def && def.desc.length > 0) {
      const n = def.desc.length
      const perScore = Math.round(t.score / n * 2) / 2
      let allocated = 0
      for (let i = 0; i < n; i++) {
        const isLast = i === n - 1
        const sp = isLast ? Math.max(0.5, Math.round((t.score - allocated) * 2) / 2) : perScore
        allocated += sp
        rows.push({
          id: `${t.id}-${i + 1}`,
          category: t.category,
          item: t.item,
          key_point: `${i + 1}. ${fillTemplate(def.desc[i], ctx)}`,
          score: sp,
          rules: `${fillTemplate(def.rule[i], ctx)}(${sp}分)`
        })
      }
    } else {
      rows.push({
        id: t.id,
        category: t.category,
        item: t.item,
        key_point: fillTemplate(t.item, ctx),
        score: t.score,
        rules: buildRulesFallback(t)
      })
    }
  }

  return rows
}
