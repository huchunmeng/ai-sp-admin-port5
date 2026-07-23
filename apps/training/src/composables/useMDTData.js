/**
 * MDT多学科讨论病例数据
 * 每个MDT病例映射到一个真实SP病例（realCaseId），用于加载患者图片和基础信息
 */

// ── 5个基础病例模板 ──
const CASE_TEMPLATES = [
  {
    id: 'MDT-20260701-C4K7',
    realCaseId: 'EM-20260526-X8K2',
    patientName: '陈建国',
    gender: '男', age: 62,
    disciplines: ['心内科', '心外科', '肾内科'],
    chiefComplaint: '持续性胸骨后压榨样疼痛3小时，含服硝酸甘油未缓解。合并肾功能不全（Cr 280μmol/L），冠脉造影示三支病变。',
    objective: '制定冠脉血运重建策略，平衡造影剂肾损伤风险',
    teachingPhase: 'R2', levelLabel: '高阶', levelBadge: 'badge-warning',
    avatarBg: '#dbeafe', filterKey: 'cardio',
    clinicalSummary: '患者为62岁男性，因"持续性胸骨后压榨样疼痛3小时"就诊。既往高血压病史10年，2型糖尿病史8年，慢性肾脏病（CKD 3期）。入院心电图示V1-V4导联ST段抬高，肌钙蛋白I显著升高。冠脉造影提示前降支近段95%狭窄、回旋支中段80%狭窄、右冠远段75%狭窄。SYNTAX评分32分。',
    keyQuestions: [
      'CKD 3期患者行CABG vs PCI的获益/风险如何权衡？',
      '造影剂肾病预防策略：水化方案、N-乙酰半胱氨酸证据级别？',
      '抗血小板方案：阿司匹林+P2Y12抑制剂在CKD患者中的剂量调整？',
      '术后肾功能监测频率及替代终点指标选择？'
    ],
    disciplinePerspectives: [
      { dept: '心内科', view: '建议PCI治疗，优先处理LAD罪犯病变，分次处理多支血管以减少造影剂用量。推荐等渗造影剂碘克沙醇，术前术后充分水化。' },
      { dept: '心外科', view: '三支病变+糖尿病+CKD，SYNTAX评分32分，CABG远期预后优于PCI。但需评估手术耐受性及体外循环对肾功能的影响。' },
      { dept: '肾内科', view: 'Cr 280μmol/L，eGFR约22ml/min。建议造影前48h停用二甲双胍，水化方案：0.9%NaCl 1ml/kg/h术前12h至术后24h。术后监测Cr q12h×3d。' }
    ],
    discussionAgenda: [
      { phase: '病例汇报', duration: '5分钟', desc: '主诊医师汇报病史、体格检查、辅助检查结果' },
      { phase: '影像解读', duration: '5分钟', desc: '影像科解读冠脉造影、心电图、胸部X线关键发现' },
      { phase: '学科意见', duration: '10分钟', desc: '各学科从本专业角度提出诊疗建议和依据' },
      { phase: '综合讨论', duration: '7分钟', desc: '就分歧点展开讨论，权衡各方案利弊' },
      { phase: '总结决策', duration: '3分钟', desc: '形成最终诊疗方案，明确各学科分工' }
    ],
    references: [
      '2024 ESC/EACTS心肌血运重建指南',
      '2023 AHA/ACC慢性冠心病管理指南',
      'KDIGO 2024慢性肾脏病评估与管理临床实践指南',
      'ACR造影剂肾病防治共识(2023版)'
    ]
  },
  {
    id: 'MDT-20260705-B8Y1',
    realCaseId: 'EM-20260416-7A2K',
    patientName: '李美华',
    gender: '女', age: 58,
    disciplines: ['呼吸科', '风湿免疫科', '影像科'],
    chiefComplaint: '进行性呼吸困难伴干咳6月，HRCT示双肺网格状改变伴蜂窝影，ANA 1:640阳性，抗Jo-1抗体阳性。',
    objective: '明确间质性肺炎分型及是否启动免疫抑制治疗',
    teachingPhase: 'R3', levelLabel: '疑难', levelBadge: 'badge-error',
    avatarBg: '#fce7f3', filterKey: 'respiratory',
    clinicalSummary: '患者为58岁女性，因"进行性呼吸困难伴干咳6月"入院。肺功能示限制性通气功能障碍（FVC 62%预计值），DLCO 45%预计值。HRCT示双下肺外周分布网格状阴影伴牵引性支气管扩张，部分区域蜂窝样改变。实验室检查：ANA 1:640（斑点型），抗Jo-1抗体强阳性，CK 380U/L，CRP 28mg/L。6分钟步行试验320m，SpO2最低降至88%。',
    keyQuestions: [
      'UIP vs NSIP vs OP的影像学鉴别要点？该患者符合何种类型？',
      '抗Jo-1抗体阳性→抗合成酶综合征：ILD严重程度与肌炎活动度的关系？',
      '免疫抑制方案选择：糖皮质激素单药 vs 联合MMF/CTX/AZA？',
      '抗纤维化治疗时机：尼达尼布/吡非尼酮是否适用？'
    ],
    disciplinePerspectives: [
      { dept: '呼吸科', view: 'HRCT表现为NSIP合并OP样改变，符合抗合成酶综合征相关ILD。建议支气管肺泡灌洗排除感染后启动免疫抑制治疗。肺功能基线已受损，需积极干预。' },
      { dept: '风湿免疫科', view: '抗Jo-1抗体阳性+ILD+肌炎表现，诊断抗合成酶综合征明确。推荐甲泼尼龙冲击(500mg/d×3d)后序贯口服泼尼松1mg/kg/d，联合MMF 1.5g/d。' },
      { dept: '影像科', view: 'HRCT显示双下肺外周分布为主，网格影+GGO混杂，符合NSIP pattern，合并OP样实变灶。蜂窝样改变局限（<5%肺容积），提示尚处于可逆阶段。' }
    ],
    discussionAgenda: [
      { phase: '病例汇报', duration: '5分钟', desc: '呼吸科汇报病史、肺功能、HRCT及实验室检查' },
      { phase: '影像读片', duration: '5分钟', desc: '影像科解读HRCT特征，分析UIP/NSIP/OP pattern' },
      { phase: '学科意见', duration: '10分钟', desc: '各学科提出诊断分型及治疗建议' },
      { phase: '综合讨论', duration: '7分钟', desc: '讨论免疫抑制方案选择及抗纤维化治疗时机' },
      { phase: '总结决策', duration: '3分钟', desc: '制定治疗方案及随访计划' }
    ],
    references: [
      '2022 ATS/ERS/JRS/ALAT IPF诊断指南',
      '2023 ACR/EULAR抗合成酶综合征分类标准',
      '2024 中国结缔组织病相关间质性肺病诊治专家共识',
      'INBUILD研究：尼达尼布治疗进展性纤维化ILD'
    ]
  },
  {
    id: 'MDT-20260708-M3P8',
    realCaseId: 'NE-20260416-7C9E',
    patientName: '王德发',
    gender: '男', age: 71,
    disciplines: ['神经内科', '心内科', '康复科'],
    chiefComplaint: '突发右侧肢体无力伴言语不清3小时，NIHSS 12分。既往房颤病史，未规范抗凝。头颅CT排除出血。',
    objective: '急性缺血性卒中溶栓决策及二级预防方案',
    teachingPhase: 'R2', levelLabel: '高阶', levelBadge: 'badge-warning',
    avatarBg: '#d1fae5', filterKey: 'neuro',
    clinicalSummary: '患者为71岁男性，晨起后突发右侧肢体无力，右上肢不能抬举、右下肢不能站立，伴言语含糊。发病至到院时间2.5小时。既往史：阵发性房颤3年（CHA₂DS₂-VASc 4分），未规范抗凝（自行停用达比加群2月）；高血压病史15年。查体：BP 168/95mmHg，HR 102bpm（房颤律），NIHSS 12分（面瘫2+右上肢3+右下肢3+语言2+构音2）。头颅CT平扫未见出血及早期梗死征象，ASPECTS 10分。CTA示左侧MCA M1段闭塞。',
    keyQuestions: [
      '发病3小时，NIHSS 12分，是否符合静脉溶栓适应证？年龄>70岁是否影响决策？',
      '房颤相关心源性栓塞：溶栓后桥接抗凝的时机（1-3-6-12天原则）？',
      '大面积半球梗死：是否需要血管内治疗（机械取栓）？',
      '二级预防：NOAC选择（达比加群vs利伐沙班）及剂量考虑？'
    ],
    disciplinePerspectives: [
      { dept: '神经内科', view: '发病3h内，NIHSS≥6分，ASPECTS≥7分，符合静脉溶栓+桥接机械取栓适应证。建议立即启动阿替普酶0.9mg/kg溶栓，同步准备血管内治疗。年龄>70岁非绝对禁忌。' },
      { dept: '心内科', view: '房颤相关卒中，需控制心室率（目标<110bpm）。CHA₂DS₂-VASc 4分+HAS-BLED 2分，长期抗凝获益大于风险。溶栓后24h复查CT排除出血转化后启动NOAC。' },
      { dept: '康复科', view: '急性期即应启动早期康复评估。NIHSS 12分提示中度卒中，预计需综合康复干预。建议溶栓后24h病情稳定即开始床旁康复（良肢位摆放、被动关节活动度训练）。' }
    ],
    discussionAgenda: [
      { phase: '病例汇报', duration: '5分钟', desc: '神经内科汇报发病经过、NIHSS评分、影像结果' },
      { phase: '影像解读', duration: '5分钟', desc: '解读头颅CT/CTA关键影像，ASPECTS评分' },
      { phase: '学科意见', duration: '10分钟', desc: '各学科从专业角度提出急性期及二级预防方案' },
      { phase: '综合讨论', duration: '7分钟', desc: '讨论溶栓决策、桥接抗凝时机、康复介入时间点' },
      { phase: '总结决策', duration: '3分钟', desc: '形成急性期治疗方案及二级预防计划' }
    ],
    references: [
      '2023 AHA/ASA急性缺血性卒中早期管理指南',
      '2024 ESO静脉溶栓指南更新',
      '2023 ACC/AHA/ACCP/HRS房颤诊断与管理指南',
      '中国急性缺血性卒中诊治指南(2023版)'
    ]
  },
  {
    id: 'MDT-20260712-G5N3',
    realCaseId: 'SU-20260416-9C2D',
    patientName: '赵小明',
    gender: '男', age: 45,
    disciplines: ['消化科', '肿瘤科', '普外科'],
    chiefComplaint: '上腹隐痛伴消瘦3月，体重下降8kg。胃镜示胃窦部3cm溃疡型病变，病理示低分化腺癌，CT示胃周淋巴结肿大。',
    objective: '胃癌分期评估及新辅助化疗 vs 直接手术决策',
    teachingPhase: 'R1', levelLabel: '基础', levelBadge: 'badge-success',
    avatarBg: '#fef3c7', filterKey: 'oncology',
    clinicalSummary: '患者为45岁男性，因"上腹隐痛伴消瘦3月"就诊，近3月体重下降8kg（原体重72kg）。胃镜检查示胃窦部3.0×2.5cm溃疡型病变（Borrmann III型），病理活检示低分化腺癌（Lauren弥漫型），免疫组化：HER2(-)，PD-L1 CPS=5，MSI-H。腹部增强CT示胃周淋巴结肿大（最大者1.5cm），未见远处转移征象。肿瘤标志物：CEA 18ng/ml，CA19-9 85U/ml。临床分期cT3N1M0（IIB期）。',
    keyQuestions: [
      'cT3N1M0胃癌：是否需行诊断性腹腔镜探查排除腹膜转移？',
      'MSI-H胃癌的预后意义及对治疗决策的影响？',
      '新辅助化疗（FLOT方案）vs 直接手术（D2根治术）的循证依据？',
      '术后辅助治疗方案：是否需要免疫治疗（PD-1抑制剂）？'
    ],
    disciplinePerspectives: [
      { dept: '消化科', view: '胃镜+EUS评估浸润深度准确率约85%。建议完善EUS进一步明确T分期，并行诊断性腹腔镜探查排除隐匿性腹膜转移。MSI-H提示预后较好但可能对化疗不敏感。' },
      { dept: '肿瘤科', view: 'cT3N1M0（IIB期），NCCN指南推荐围手术期化疗（FLOT方案4周期术前+4周期术后）。但MSI-H肿瘤对5-FU/铂类敏感性低，CheckMate 649等研究提示免疫治疗可能获益。建议MDT讨论是否直接手术。' },
      { dept: '普外科', view: 'D2根治术（远端胃大部切除+D2淋巴结清扫）是标准术式。若选择新辅助化疗，化疗后4-6周再评估手术。MSI-H患者若直接手术，术后pStage可能升级，需根据病理决定辅助方案。' }
    ],
    discussionAgenda: [
      { phase: '病例汇报', duration: '5分钟', desc: '消化科汇报胃镜、病理、影像学检查结果' },
      { phase: '影像解读', duration: '5分钟', desc: '解读腹部CT、EUS分期影像' },
      { phase: '学科意见', duration: '10分钟', desc: '各学科从专业角度提出分期及治疗策略建议' },
      { phase: '综合讨论', duration: '7分钟', desc: '讨论新辅助化疗 vs 直接手术的决策依据' },
      { phase: '总结决策', duration: '3分钟', desc: '形成治疗方案及后续随访计划' }
    ],
    references: [
      '2024 NCCN胃癌临床实践指南(v2.2024)',
      '2023 CSCO胃癌诊疗指南',
      'FLOT4-AIO研究：围手术期FLOT vs ECF/ECX',
      'CheckMate 649/KEYNOTE-859研究：免疫治疗在胃癌中的应用'
    ]
  },
  {
    id: 'MDT-20260715-K2E6',
    realCaseId: 'IM-20260527-A9GW',
    patientName: '刘丽华',
    gender: '女', age: 68,
    disciplines: ['内分泌科', '眼科', '肾内科'],
    chiefComplaint: '2型糖尿病20年，近期HbA1c 9.8%。合并增殖性糖尿病视网膜病变、微量白蛋白尿（UACR 85mg/g）、高血压。',
    objective: '综合管理血糖/血压/血脂，延缓微血管并发症进展',
    teachingPhase: 'R1', levelLabel: '基础', levelBadge: 'badge-success',
    avatarBg: '#ede9fe', filterKey: 'endocrine',
    clinicalSummary: '患者为68岁女性，2型糖尿病史20年。近期自测空腹血糖9-12mmol/L，餐后2h血糖14-18mmol/L，HbA1c 9.8%。目前用药：二甲双胍0.5g tid+格列美脲4mg qd。合并症：高血压（目前服氨氯地平5mg qd，BP 148/82mmHg），血脂异常（LDL-C 3.6mmol/L）。眼底检查示双眼增殖性糖尿病视网膜病变（PDR），眼科建议全视网膜光凝。UACR 85mg/g（微量白蛋白尿期），eGFR 68ml/min/1.73m²。',
    keyQuestions: [
      'HbA1c 9.8%如何优化降糖方案：SGLT2i/GLP-1RA的肾脏保护循证依据？',
      'PDR合并DKD：全视网膜光凝是否影响肾功能？抗VEGF vs 激光的优先选择？',
      '血压目标：合并DKD患者是否应更严格控制（<130/80mmHg）？',
      '他汀+ACEI/ARB联合治疗在DKD一级预防中的作用？'
    ],
    disciplinePerspectives: [
      { dept: '内分泌科', view: 'HbA1c 9.8%提示血糖控制差。建议加用SGLT2i（达格列净10mg qd）联合GLP-1RA（司美格鲁肽0.5mg qw起始），二者均有肾脏保护证据。注意告知SGLT2i的泌尿系感染风险。格列美脲可减量至2mg qd。' },
      { dept: '眼科', view: '双眼PDR伴临床显著性黄斑水肿，建议先行抗VEGF（雷珠单抗）玻璃体腔注射控制黄斑水肿并抑制新生血管，2周后再行全视网膜光凝。PRP对肾功能无直接影响，但需注意造影剂荧光素钠经肾排泄。' },
      { dept: '肾内科', view: 'UACR 85mg/g+eGFR 68，诊断DKD G2A2期。建议加用ACEI（培哚普利4mg qd），目标血压<130/80mmHg。SGLT2i可延缓eGFR下降速率。联合用药注意监测血钾和肾功能，2周后复查。' }
    ],
    discussionAgenda: [
      { phase: '病例汇报', duration: '5分钟', desc: '内分泌科汇报血糖控制情况、并发症筛查结果' },
      { phase: '眼科评估', duration: '5分钟', desc: '眼科解读眼底照相及OCT，评估PDR严重程度' },
      { phase: '学科意见', duration: '10分钟', desc: '各学科提出血糖/血压/眼科/肾脏综合管理方案' },
      { phase: '综合讨论', duration: '7分钟', desc: '讨论降糖方案调整、眼科治疗时机、血压靶目标' },
      { phase: '总结决策', duration: '3分钟', desc: '形成综合管理方案，明确各学科随访间隔' }
    ],
    references: [
      '2024 ADA糖尿病医学诊疗标准',
      'KDIGO 2024慢性肾脏病合并糖尿病管理指南',
      '2023 AAO糖尿病视网膜病变临床指南',
      'EMPA-REG/DAPA-CKD/CREDENCE研究：SGLT2i肾脏保护证据'
    ]
  }
]

// ── 从模板生成大量病例 ──
const SURNAMES = ['陈', '李', '王', '张', '刘', '赵', '黄', '周', '吴', '徐', '孙', '马', '朱', '胡', '林', '郭', '何', '高', '罗', '郑']
const GIVEN_NAMES_MALE = ['建国', '国强', '伟民', '志强', '文博', '德明', '永强', '海峰', '志远', '晓明', '志明', '大伟', '建华', '国栋', '志刚']
const GIVEN_NAMES_FEMALE = ['美华', '丽华', '秀英', '玉兰', '桂英', '秀珍', '雪梅', '海燕', '晓红', '秀芳', '春梅', '晓燕', '丽萍', '慧敏', '淑芬']
const PHASES = ['R1', 'R2', 'R3']
const PHASE_LABELS = { R1: '基础病例', R2: '高阶病例', R3: '疑难病例' }

function generateCases() {
  const cases = []
  let seq = 1

  CASE_TEMPLATES.forEach((tmpl, ti) => {
    const count = ti < 2 ? 16 : 14  // 前两个模板各16个，后三个各14个 = 74 total
    for (let i = 0; i < count; i++) {
      // 性别交错：同一模板内男女交替，避免一屏内全是同性别头像
      const isMale = i % 2 === 0
      const gender = isMale ? '男' : '女'
      const surname = SURNAMES[(ti * 3 + i) % SURNAMES.length]
      const given = isMale
        ? GIVEN_NAMES_MALE[(ti * 2 + i) % GIVEN_NAMES_MALE.length]
        : GIVEN_NAMES_FEMALE[(ti * 2 + i) % GIVEN_NAMES_FEMALE.length]
      // 年龄分散到 25-85 全范围，让不同 deployAge 的图片都被用到
      const age = 25 + Math.floor((i / (count - 1)) * 60)
      const phase = PHASES[(ti + i) % 3]
      const mdtNum = String(seq).padStart(3, '0')

      cases.push({
        ...tmpl,
        id: `MDT-202607${String(Math.floor(seq / 10) + 1).padStart(2, '0')}-${String.fromCharCode(65 + (seq % 26))}${seq % 10}${String.fromCharCode(65 + (ti * 3 + i) % 26)}`,
        realCaseId: `SP-202607${String(seq).padStart(4, '0')}`,
        patientName: surname + given,
        gender,
        age,
        teachingPhase: phase,
        levelLabel: PHASE_LABELS[phase],
        avatarBg: '',
        filterKey: tmpl.filterKey,
      })
      seq++
    }
  })
  return cases
}

export const MDT_CASES = [...CASE_TEMPLATES, ...generateCases()]

export function getMDTCase(mdtId) {
  return MDT_CASES.find(c => c.id === mdtId) || null
}

export function disciplineIcon(name) {
  const map = {
    '心内科': 'fa-solid fa-heart-pulse',
    '心外科': 'fa-solid fa-heart',
    '肾内科': 'fa-solid fa-droplet',
    '呼吸科': 'fa-solid fa-lungs',
    '风湿免疫科': 'fa-solid fa-shield',
    '影像科': 'fa-solid fa-film',
    '神经内科': 'fa-solid fa-brain',
    '康复科': 'fa-solid fa-person-walking',
    '消化科': 'fa-solid fa-flask',
    '肿瘤科': 'fa-solid fa-ribbon',
    '普外科': 'fa-solid fa-suitcase-medical',
    '内分泌科': 'fa-solid fa-vial',
    '眼科': 'fa-solid fa-eye',
  }
  return map[name] || 'fa-solid fa-stethoscope'
}
