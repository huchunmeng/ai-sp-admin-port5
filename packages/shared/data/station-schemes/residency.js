// 住院医师规范化培训 — 考站方案配置
// 数据来源：卫健委人才交流服务中心《住培结业实践技能考核考核大纲》+ 各专业指导标准
// 考核项目范围（用户限定）：病史采集 / 体格检查 / 初步诊断 / 人文沟通 / 病例分析 / 病历书写
// 评分表模板：见 ../score-tables/index.js

import { scoreTemplates, getSpecialtyTableName } from '../score-tables/index.js'
import { getSpecialty } from '../specialty-registry.js'

// 为方案中的 major 添加 specialtyId
function majorWithId(name, stations) {
  const sp = getSpecialty(name)
  return { name, specialtyId: sp ? sp.id : 'internal_medicine', stations }
}

// ===== 工具函数 =====

/** 根据模板编码创建评分表引用 */
function tbl(code, bindProjects) {
  const tpl = scoreTemplates[code]
  return { name: tpl ? tpl.name : code, templateCode: code, bindProjects }
}

/** 根据模板编码 + 专业名创建带专业命名的评分表引用（体格检查类） */
function tblExam(code, specialty, examName, bindProjects) {
  const name = getSpecialtyTableName(specialty, code)
  // 如果专业有特有命名则用，否则用 examName + 评分表
  const displayName = name !== scoreTemplates[code]?.name ? name : (examName + '评分表')
  return { name: displayName, templateCode: code, bindProjects }
}

// ===== 工厂函数 =====

/** 接诊病人站：病史采集 + 体格检查 + 人文沟通 + 初步诊断 */
function makeReception(specialty, duration = 15, opts = {}) {
  const examName = opts.examName || '体格检查'
  const projects = [
    { name: '病史采集' },
    { name: examName },
    { name: '人文沟通' },
    { name: '初步诊断' }
  ]
  const scoreTables = [
    tbl('TPL-STD', ['病史采集']),
    tblExam('TPL-STD-2', specialty, examName, [examName]),
    tbl('TPL-STD-6', ['人文沟通']),
    tbl('TPL-STD-7', ['初步诊断'])
  ]
  return { name: '接诊病人站', duration, collapsed: false, projects, scoreTables }
}

/** 临床思维站：病例分析（可选含病历书写） */
function makeAnalysis(duration = 20) {
  return {
    name: '临床思维站', duration, collapsed: false,
    projects: [
      { name: '病例分析' }
    ],
    scoreTables: [
      tbl('TPL-STD-7', ['病例分析'])
    ]
  }
}

/** 病历书写站 */
function makeRecord(duration = 30) {
  return {
    name: '病历书写站', duration, collapsed: false,
    projects: [
      { name: '病历书写' }
    ],
    scoreTables: [
      tbl('TPL-STD-3', ['病历书写'])
    ]
  }
}

/** 交流沟通站（独立的人文沟通考核，部分专业有） */
function makeCommunication(duration = 15) {
  return {
    name: '交流沟通站', duration, collapsed: false,
    projects: [
      { name: '人文沟通' }
    ],
    scoreTables: [
      tbl('TPL-STD-6', ['人文沟通'])
    ]
  }
}

// ===== 各专业考站定义（按卫健委大纲逐专业配置）=====

const stations = {

  // ---- 内科 ----
  '内科': [
    makeReception('内科', 15),                    // 第1站 接诊病人: SP病史采集+重点查体+初步诊断
    makeAnalysis(15),                            // 第2站 临床思维
    makeCommunication(15),                       // 第5站 交流沟通: 告知坏消息/知情同意/健康咨询
    // 第4站 临床操作(四大穿刺等) — 不在6项范围内，不纳入
  ],

  // ---- 儿科 ----
  '儿科': [
    { // 第3站 病史采集
      name: '病史采集站', duration: 15, collapsed: false,
      projects: [
        { name: '病史采集' },
        { name: '人文沟通' }
      ],
      scoreTables: [
        tbl('TPL-STD', ['病史采集']),
        tbl('TPL-STD-6', ['人文沟通'])
      ]
    },
    { // 第4站 体格检查
      name: '体格检查站', duration: 30, collapsed: false,
      projects: [
        { name: '体格检查' },
        { name: '初步诊断' }
      ],
      scoreTables: [
        tbl('TPL-STD-2', ['体格检查']),
        tbl('TPL-STD-7', ['初步诊断'])
      ]
    },
    { // 第5站 病历书写
      name: '病历书写站', duration: 40, collapsed: false,
      projects: [{ name: '病历书写' }],
      scoreTables: [
        tbl('TPL-STD-3', ['病历书写'])
      ]
    },
    { // 第6站 病例分析
      name: '临床思维站', duration: 15, collapsed: false,
      projects: [
        { name: '病例分析' }
      ],
      scoreTables: [
        tbl('TPL-STD-7', ['病例分析'])
      ]
    },
    { // 第2站 人文沟通站(向家长交代病情+知情同意+人文关怀)
      name: '交流沟通站', duration: 15, collapsed: false,
      projects: [
        { name: '人文沟通' }
      ],
      scoreTables: [
        tbl('TPL-STD-6', ['人文沟通'])
      ]
    },
    // 第1站 技能操作 — 不在6项范围内
  ],

  // ---- 急诊科 ----
  '急诊科': [
    { // 第1站 急诊病人接诊
      name: '接诊病人站', duration: 20, collapsed: false,
      projects: [
        { name: '病史采集' },
        { name: '体格检查' },
        { name: '人文沟通' },
        { name: '初步诊断' }
      ],
      scoreTables: [
        tbl('TPL-STD', ['病史采集']),
        tbl('TPL-STD-2', ['体格检查']),
        tbl('TPL-STD-6', ['人文沟通', '初步诊断'])
      ]
    },
    makeAnalysis(20),                            // 第2站 急诊临床思维
    makeCommunication(10),                       // 第7站 急诊医患沟通
    // 第3-6站: 心肺复苏/气管插管/高级生命支持/急诊外科操作 — 不在6项范围内
  ],

  // ---- 精神科 ----
  '精神科': [
    { // 第1站 临床技能
      name: '接诊病人站', duration: 45, collapsed: false,
      projects: [
        { name: '病史采集' },
        { name: '体格检查' },
        { name: '人文沟通' },
        { name: '精神检查' },
        { name: '初步诊断' }
      ],
      scoreTables: [
        tbl('TPL-STD', ['病史采集']),
        tbl('TPL-STD-2', ['体格检查']),
        tbl('TPL-STD-6', ['人文沟通', '初步诊断'])
      ]
    },
    { // 第2站 临床思维
      name: '临床思维站', duration: 30, collapsed: false,
      projects: [
        { name: '病例分析' },
        { name: '病历书写' }
      ],
      scoreTables: [
        tbl('TPL-STD-7', ['病例分析']),
        tbl('TPL-STD-3', ['病历书写'])
      ]
    },
    makeCommunication(15),                       // 第3站 临床沟通
    // 第4站 神经系统检查(15min) — 不在6项范围内
  ],

  // ---- 全科 ----
  '全科': [
    { // 第三站 全科接诊: 病史采集+体格检查+病例分析+SOAP书写
      name: '接诊病人站', duration: 40, collapsed: false,
      projects: [
        { name: '病史采集' },
        { name: '体格检查' },
        { name: '病例分析' },
        { name: '初步诊断' },
        { name: '人文沟通' }
      ],
      scoreTables: [
        tbl('TPL-STD', ['病史采集']),
        tbl('TPL-STD-2', ['体格检查']),
        tbl('TPL-STD-7', ['病例分析', '初步诊断']),
        tbl('TPL-STD-6', ['人文沟通'])
      ]
    },
    { // SOAP病历书写
      name: '病历书写站', duration: 30, collapsed: false,
      projects: [{ name: '病历书写' }],
      scoreTables: [
        tbl('TPL-STD-3', ['病历书写'])
      ]
    },
    makeCommunication(20),                       // 第二站 医患沟通
    // 第一站 基本技能操作(20min) — 不在6项范围内
  ],

  // ---- 外科及外科各方向（普通外科/胸心外科/泌尿外科/整形外科/骨科）----
  '外科': [
    makeReception('外科', 15),                   // 第1站 接诊病人
    makeAnalysis(15),                            // 第2站 临床思维
    makeCommunication(15),                       // 第5站 沟通能力
    // 第4站 临床操作能力(外科基本技能) — 不在6项范围内
  ],

  // ---- 儿外科 ----
  '儿外科': [
    { // 第1站 病史采集
      name: '病史采集站', duration: 12, collapsed: false,
      projects: [
        { name: '病史采集' },
        { name: '人文沟通' }
      ],
      scoreTables: [
        tbl('TPL-STD', ['病史采集']),
        tbl('TPL-STD-6', ['人文沟通'])
      ]
    },
    { // 第2站 体格检查
      name: '体格检查站', duration: 25, collapsed: false,
      projects: [
        { name: '体格检查' },
        { name: '初步诊断' }
      ],
      scoreTables: [
        tbl('TPL-STD-2', ['体格检查']),
        tbl('TPL-STD-7', ['初步诊断'])
      ]
    },
    { // 第3站 病历书写
      name: '病历书写站', duration: 25, collapsed: false,
      projects: [{ name: '病历书写' }],
      scoreTables: [
        tbl('TPL-STD-3', ['病历书写'])
      ]
    },
    makeAnalysis(25),                            // 第4站 病例分析
    { // 第5站 人文沟通站(病情告知+人文关怀)
      name: '交流沟通站', duration: 15, collapsed: false,
      projects: [
        { name: '人文沟通' }
      ],
      scoreTables: [
        tbl('TPL-STD-6', ['人文沟通'])
      ]
    },
    // 第6站 技能操作 — 不在6项范围内
  ],

  // ---- 妇产科 ----
  '妇产科': [
    { // 第1站 接诊和沟通: 病史采集+体格检查+诊断及鉴别诊断+医患沟通
      name: '接诊和沟通站', duration: 30, collapsed: false,
      projects: [
        { name: '病史采集' },
        { name: '体格检查' },
        { name: '初步诊断' },
        { name: '人文沟通' }
      ],
      scoreTables: [
        tbl('TPL-STD', ['病史采集']),
        tbl('TPL-STD-2', ['体格检查']),
        tbl('TPL-STD-6', ['人文沟通', '初步诊断'])
      ]
    },
    { // 第2站 临床思维: 病历汇报+诊断及鉴别诊断+诊疗计划
      name: '临床思维站', duration: 30, collapsed: false,
      projects: [
        { name: '病例分析' },
        { name: '病历书写' }
      ],
      scoreTables: [
        tbl('TPL-STD-7', ['病例分析']),
        tbl('TPL-STD-3', ['病历书写'])
      ]
    },
    // 第3站 基本技能操作(30min, 妇1项+产1项) — 不在6项范围内
  ],

  // ---- 麻醉科 ----
  '麻醉科': [
    { // 第1站 接诊和沟通站: 术前访视+人文关怀及沟通协作
      name: '接诊和沟通站', duration: 30, collapsed: false,
      projects: [
        { name: '病史采集' },
        { name: '人文沟通' },
        { name: '初步诊断' }
      ],
      scoreTables: [
        tbl('TPL-STD', ['病史采集']),
        tbl('TPL-STD-6', ['人文沟通', '初步诊断'])
      ]
    },
    { // 第2站 面试沟通站: 麻醉病例分析+麻醉方案制定+沟通协作
      name: '临床思维站', duration: 30, collapsed: false,
      projects: [
        { name: '病例分析' },
        { name: '人文沟通' }
      ],
      scoreTables: [
        tbl('TPL-STD-7', ['病例分析']),
        tbl('TPL-STD-6', ['人文沟通'])
      ]
    },
    // 第3站 技能操作(气管插管/椎管内麻醉/血管穿刺/麻醉机使用) — 不在6项范围内
  ],

  // ---- 皮肤科 ----
  '皮肤科': [
    { // 第二站 接诊病人+病历书写
      name: '接诊病人站', duration: 30, collapsed: false,
      projects: [
        { name: '病史采集' },
        { name: '体格检查' },
        { name: '人文沟通' },
        { name: '初步诊断' }
      ],
      scoreTables: [
        tbl('TPL-STD', ['病史采集']),
        tbl('TPL-STD-2', ['体格检查']),
        tbl('TPL-STD-6', ['人文沟通', '初步诊断'])
      ]
    },
    { // 病历书写（并入接诊病人站中的笔试部分）
      name: '病历书写站', duration: 20, collapsed: false,
      projects: [{ name: '病历书写' }],
      scoreTables: [tbl('TPL-STD-3', ['病历书写'])]
    },
    makeAnalysis(30),                            // 第三站 临床思维
    // 第一站 皮肤组织病理(60min), 第四站 皮肤组织钻取活检(20min) — 不在6项范围内
  ],

  // ---- 神经内科 ----
  '神经内科': [
    makeReception('神经内科', 20, { examName: '神经系统检查' }),  // 第二站 接诊病人
    { // 第三站 临床思维: 病例分析+病历书写
      name: '临床思维站', duration: 30, collapsed: false,
      projects: [
        { name: '病例分析' },
        { name: '病历书写' }
      ],
      scoreTables: [
        tbl('TPL-STD-7', ['病例分析']),
        tbl('TPL-STD-3', ['病历书写'])
      ]
    },
    makeCommunication(10),                       // 第五站 人文沟通能力
    // 第一站 辅助检查及影像学判读(30min), 第四站 腰椎穿刺术(20min) — 不在6项范围内
  ],

  // ---- 康复医学科 ----
  '康复医学科': [
    makeReception('康复医学科', 20),              // 第二部分第一站 接诊病人
    { // 第二部分第二站 临床思维: 病历书写+病例分析
      name: '临床思维站', duration: 20, collapsed: false,
      projects: [
        { name: '病例分析' },
        { name: '病历书写' }
      ],
      scoreTables: [
        tbl('TPL-STD-7', ['病例分析']),
        tbl('TPL-STD-3', ['病历书写'])
      ]
    },
    makeCommunication(10),                       // 第二部分第三站 人文沟通
    // 第一部分 辅助检查及影像学判读(30min), 第三部分 基本技能操作(30min) — 不在6项范围内
  ],

  // ---- 骨科（指导标准，与外科分开）----
  '骨科': [
    makeReception('骨科', 20),                   // 第二站 接诊病人
    { // 第三站 临床思维: 病历书写+病例分析
      name: '临床思维站', duration: 20, collapsed: false,
      projects: [
        { name: '病例分析' },
        { name: '病历书写' }
      ],
      scoreTables: [
        tbl('TPL-STD-7', ['病例分析']),
        tbl('TPL-STD-3', ['病历书写'])
      ]
    },
    // 第一站 辅助检查及影像学判读(30min), 第四站 基本技能操作(10min) — 不在6项范围内
  ],

  // ---- 眼科 ----
  '眼科': [
    makeReception('眼科', 20, { examName: '眼部检查' }),  // 第二站 接诊病人
    { // 第三站 临床思维: 病历书写+病例分析
      name: '临床思维站', duration: 40, collapsed: false,
      projects: [
        { name: '病例分析' },
        { name: '病历书写' }
      ],
      scoreTables: [
        tbl('TPL-STD-7', ['病例分析']),
        tbl('TPL-STD-3', ['病历书写'])
      ]
    },
    // 第一站 辅助检查及影像学判读(30min), 第四站 动物眼显微手术(30min) — 不在6项范围内
  ],

  // ---- 耳鼻咽喉科 ----
  '耳鼻咽喉科': [
    makeReception('耳鼻咽喉科', 20, { examName: '专科检查' }),  // 第二站 接诊病人
    { // 第三站 临床思维: 病历书写+病例分析
      name: '临床思维站', duration: 20, collapsed: false,
      projects: [
        { name: '病例分析' },
        { name: '病历书写' }
      ],
      scoreTables: [
        tbl('TPL-STD-7', ['病例分析']),
        tbl('TPL-STD-3', ['病历书写'])
      ]
    },
    // 第一站 辅助检查及影像学判读(30min), 第四站 基本技能操作(10min) — 不在6项范围内
  ],

  // ---- 重症医学科 ----
  '重症医学科': [
    { // 第一站 重症患者急诊处理
      name: '接诊病人站', duration: 15, collapsed: false,
      projects: [
        { name: '病史采集' },
        { name: '体格检查' },
        { name: '初步诊断' },
        { name: '人文沟通' }
      ],
      scoreTables: [
        tbl('TPL-STD', ['病史采集']),
        tbl('TPL-STD-2', ['体格检查']),
        tbl('TPL-STD-6', ['人文沟通', '初步诊断'])
      ]
    },
    makeAnalysis(15),                            // 第二站 临床思维
    // 第四站 临床技能(15min), 第五站 影像学判读(15min) — 不在6项范围内
  ],

  // ---- 放射肿瘤科 ----
  '放射肿瘤科': [
    makeReception('放射肿瘤科', 20),              // 第一站 接诊病人
    { // 第二站 病例分析
      name: '临床思维站', duration: 30, collapsed: false,
      projects: [
        { name: '病例分析' }
      ],
      scoreTables: [
        tbl('TPL-STD-7', ['病例分析'])
      ]
    },
    // 第三~六站 放疗技能操作 — 不在6项范围内
  ],

  // ---- 医学遗传科 ----
  '医学遗传科': [
    makeReception('医学遗传科', 35),              // 第四站 接诊病人
    { // 第五站 临床思维: 病历书写+病例分析
      name: '临床思维站', duration: 25, collapsed: false,
      projects: [
        { name: '病例分析' },
        { name: '病历书写' }
      ],
      scoreTables: [
        tbl('TPL-STD-7', ['病例分析']),
        tbl('TPL-STD-3', ['病历书写'])
      ]
    },
    // 第一~三站 遗传学检测结果判读(10+10+10min), 第六站 基本技能操作(10min) — 不在6项范围内
  ],

  // ---- 预防医学科 ----
  '预防医学科': [
    makeReception('预防医学科', 15),              // 第一站 门诊接诊病人
    { // 第二站 临床思维与患者个体预防思维
      name: '临床思维站', duration: 15, collapsed: false,
      projects: [
        { name: '病例分析' }
      ],
      scoreTables: [
        tbl('TPL-STD-7', ['病例分析'])
      ]
    },
    // 第三站 临床基本操作(15min), 第四站 公共卫生思维(30min) — 不在6项范围内
  ],

  // ===== 口腔系列专业 =====
  // 口腔各专业第一站结构相同: 病史采集+医患沟通+病历书写，第二站为专业技能操作
  '口腔全科': [
    { // 第一站 接诊病人: 病史采集+医患沟通+病历书写
      name: '接诊病人站', duration: 20, collapsed: false,
      projects: [
        { name: '病史采集' },
        { name: '体格检查' },
        { name: '人文沟通' },
        { name: '病历书写' }
      ],
      scoreTables: [
        tbl('TPL-STD', ['病史采集']),
        tbl('TPL-STD-6', ['人文沟通', '体格检查']),
        tbl('TPL-STD-3', ['病历书写'])
      ]
    },
    // 第二站 技能操作(4项共70min) — 不在6项范围内
  ],
  '口腔内科': [
    { // 第一站 接诊病人
      name: '接诊病人站', duration: 20, collapsed: false,
      projects: [
        { name: '病史采集' },
        { name: '体格检查' },
        { name: '人文沟通' },
        { name: '病历书写' }
      ],
      scoreTables: [
        tbl('TPL-STD', ['病史采集']),
        tbl('TPL-STD-6', ['人文沟通', '体格检查']),
        tbl('TPL-STD-3', ['病历书写'])
      ]
    },
  ],
  '口腔颌面外科': [
    { // 第一站 接诊病人
      name: '接诊病人站', duration: 20, collapsed: false,
      projects: [
        { name: '病史采集' },
        { name: '体格检查' },
        { name: '人文沟通' },
        { name: '病历书写' }
      ],
      scoreTables: [
        tbl('TPL-STD', ['病史采集']),
        tbl('TPL-STD-6', ['人文沟通', '体格检查']),
        tbl('TPL-STD-3', ['病历书写'])
      ]
    },
  ],
  '口腔修复科': [
    { // 第一站 接诊病人
      name: '接诊病人站', duration: 20, collapsed: false,
      projects: [
        { name: '病史采集' },
        { name: '体格检查' },
        { name: '人文沟通' },
        { name: '病历书写' }
      ],
      scoreTables: [
        tbl('TPL-STD', ['病史采集']),
        tbl('TPL-STD-6', ['人文沟通', '体格检查']),
        tbl('TPL-STD-3', ['病历书写'])
      ]
    },
  ],
  '口腔正畸科': [
    { // 第一站 接诊病人
      name: '接诊病人站', duration: 20, collapsed: false,
      projects: [
        { name: '病史采集' },
        { name: '体格检查' },
        { name: '人文沟通' },
        { name: '病历书写' }
      ],
      scoreTables: [
        tbl('TPL-STD', ['病史采集']),
        tbl('TPL-STD-6', ['人文沟通', '体格检查']),
        tbl('TPL-STD-3', ['病历书写'])
      ]
    },
  ],
  '口腔病理科': [
    { // 第一站 接诊病人
      name: '接诊病人站', duration: 20, collapsed: false,
      projects: [
        { name: '病史采集' },
        { name: '体格检查' },
        { name: '人文沟通' },
        { name: '病历书写' }
      ],
      scoreTables: [
        tbl('TPL-STD', ['病史采集']),
        tbl('TPL-STD-6', ['人文沟通', '体格检查']),
        tbl('TPL-STD-3', ['病历书写'])
      ]
    },
  ],
  '口腔颌面影像科': [
    { // 第一站 接诊病人
      name: '接诊病人站', duration: 20, collapsed: false,
      projects: [
        { name: '病史采集' },
        { name: '体格检查' },
        { name: '人文沟通' },
        { name: '病历书写' }
      ],
      scoreTables: [
        tbl('TPL-STD', ['病史采集']),
        tbl('TPL-STD-6', ['人文沟通', '体格检查']),
        tbl('TPL-STD-3', ['病历书写'])
      ]
    },
  ],

  // ===== 诊断/技术类科室（不设接诊站，仅病例分析+病历书写）=====

  // ---- 放射科 ----
  '放射科': [
    { // 第1站 临床医患沟通
      name: '交流沟通站', duration: 10, collapsed: false,
      projects: [
        { name: '人文沟通' },
        { name: '病例分析' }
      ],
      scoreTables: [
        tbl('TPL-STD-6', ['人文沟通', '病例分析'])
      ]
    },
    { // 第4站 临床思维与决策站
      name: '临床思维站', duration: 20, collapsed: false,
      projects: [
        { name: '病例分析' }
      ],
      scoreTables: [
        tbl('TPL-STD-7', ['病例分析'])
      ]
    },
    // 第2站 放射诊断基本功, 第3站 报告书写, 第5站 实践技能操作 — 核心是影像判读/操作，不在6项范围内
  ],

  // ---- 超声科 ----
  '超声科': [
    { // 第1站 临床人文沟通站
      name: '交流沟通站', duration: 5, collapsed: false,
      projects: [
        { name: '人文沟通' },
        { name: '病例分析' }
      ],
      scoreTables: [
        tbl('TPL-STD-6', ['人文沟通', '病例分析'])
      ]
    },
    { // 第2站 超声临床思维站(4亚站各5min)
      name: '临床思维站', duration: 20, collapsed: false,
      projects: [
        { name: '病例分析' }
      ],
      scoreTables: [
        tbl('TPL-STD-7', ['病例分析'])
      ]
    },
    // 第3站 超声操作技能(3亚站各5min) — 不在6项范围内
  ],

  // ---- 核医学科 ----
  '核医学科': [
    makeReception('核医学科', 25),               // 第一站 接诊病人
    { // 第四站 检查报告
      name: '临床思维站', duration: 30, collapsed: false,
      projects: [
        { name: '病例分析' },
        { name: '病历书写' }
      ],
      scoreTables: [
        tbl('TPL-STD-7', ['病例分析']),
        tbl('TPL-STD-3', ['病历书写'])
      ]
    },
    // 第二站 基本技能操作(35min), 第三站 临床思维读片(30min) — 不在6项范围内
  ],

  // ---- 临床病理科 ----
  '临床病理科': [
    // 该专业以切片诊断和标本取材为主，无接诊病人站
    {
      name: '临床思维站', duration: 90, collapsed: false,
      projects: [
        { name: '病例分析' }
      ],
      scoreTables: [
        tbl('TPL-STD-7', ['病例分析'])
      ]
    },
  ],

  // ---- 检验医学科 ----
  '检验医学科': [
    { // 第四站 沟通与人文内容
      name: '交流沟通站', duration: 10, collapsed: false,
      projects: [
        { name: '人文沟通' },
        { name: '病例分析' }
      ],
      scoreTables: [
        tbl('TPL-STD-6', ['人文沟通', '病例分析'])
      ]
    },
    { // 第五站 临床思维
      name: '临床思维站', duration: 20, collapsed: false,
      projects: [
        { name: '病例分析' }
      ],
      scoreTables: [
        tbl('TPL-STD-7', ['病例分析'])
      ]
    },
    // 第一~三站 细胞形态辨认/检验技能操作/结果判读(50min) — 不在6项范围内
  ],
}

// ===== 各专业按分类整理的完整列表 =====

// 内科系：有完整接诊+病例分析+病历书写+交流沟通
const MEDICAL_MAJORS = ['内科', '儿科', '急诊科', '精神科', '全科', '皮肤科', '神经内科', '康复医学科', '重症医学科']

// 外科系：有完整接诊+病例分析+交流沟通
const SURGICAL_MAJORS = ['普通外科', '胸心外科', '泌尿外科', '整形外科', '骨科', '儿外科']

// 妇产科+麻醉科：有完整接诊+病例分析
const OBGAS_MAJORS = ['妇产科', '麻醉科']

// 五官科：有完整接诊+病例分析
const ENT_MAJORS = ['眼科', '耳鼻咽喉科']

// 口腔科：仅有接诊站（含病历书写），无独立病例分析站
const DENTAL_MAJORS = ['口腔全科', '口腔内科', '口腔颌面外科', '口腔修复科', '口腔正畸科', '口腔病理科', '口腔颌面影像科']

// 诊断/技术科室：不设接诊站
const DIAGNOSTIC_MAJORS = ['放射科', '超声科', '核医学科', '临床病理科', '检验医学科']

// 其他科室
const OTHER_MAJORS = ['放射肿瘤科', '医学遗传科', '预防医学科']

// 全专业列表（按卫健委大纲顺序）
const ALL_MAJORS = [
  ...MEDICAL_MAJORS,
  ...SURGICAL_MAJORS,
  ...OBGAS_MAJORS,
  ...ENT_MAJORS,
  ...DENTAL_MAJORS,
  ...DIAGNOSTIC_MAJORS,
  ...OTHER_MAJORS
]

// 外科及外科各方向在方案中合并展示为一个"外科"条目，但内部各专业复用同一套考站
// 省级方案中使用简称映射
const PROVINCE_MAP = {
  '内科': '内科',
  '外科': '外科',     // 省级方案中"外科"→使用stations['外科']
  '妇产科': '妇产科',
  '儿科': '儿科',
  '急诊科': '急诊科',
}

// ===== 方案列表 =====
const residencySchemes = [
  {
    id: 'res-platform-1',
    name: '2026年全国住培结业考核标准方案',
    type: 'platform',
    source: '国家卫健委',
    phase: '住院医师',
    status: true,
    majors: ALL_MAJORS.map(name => {
      const key = name === '普通外科' || name === '胸心外科' || name === '泌尿外科' || name === '整形外科'
        ? '外科' : name
      return majorWithId(name, stations[key] || [])
    })
  },
  {
    id: 'res-province-1',
    name: '北京市2026住培结业考核方案',
    type: 'province',
    source: '北京',
    phase: '住院医师',
    status: true,
    majors: ALL_MAJORS.map(name => {
      const key = name === '普通外科' || name === '胸心外科' || name === '泌尿外科' || name === '整形外科'
        ? '外科' : name
      return majorWithId(name, stations[key] || [])
    })
  },
  {
    id: 'res-province-2',
    name: '浙江省2026住培结业考核方案',
    type: 'province',
    source: '浙江',
    phase: '住院医师',
    status: false,
    majors: ['内科', '普通外科', '妇产科', '儿科', '急诊科'].map(name => {
      const key = name === '普通外科' ? '外科' : name
      return majorWithId(name, stations[key] || [])
    })
  },
  {
    id: 'res-inst-1',
    name: '本院内科考核方案',
    type: 'institution',
    source: '仁爱医院 (总部)',
    phase: '住院医师',
    status: false,
    majors: [majorWithId('内科', stations['内科'])]
  },
  {
    id: 'res-inst-2',
    name: '本院外科考核方案',
    type: 'institution',
    source: '仁爱医院 (总部)',
    phase: '住院医师',
    status: false,
    majors: [majorWithId('普通外科', stations['外科'])]
  },
  {
    id: 'res-inst-3',
    name: '仁爱医院住院医师考核方案',
    type: 'institution',
    source: '仁爱医院 (总部)',
    phase: '住院医师',
    status: false,
    majors: ['内科', '外科', '妇产科', '儿科', '急诊科', '精神科', '口腔全科'].map(name =>
      majorWithId(name, stations[name] || [])
    )
  }
]

export default residencySchemes
