// 慕课区四个模块 —— 首页模块卡 + 模块内页的课程清单
//
// 数据来源：东南大学医学院《东南大学影像相关课程资源》。原始文档共 13 条链接，
// 其中「局部解剖学」重复列了两次（course/SEU-1471728161 与 spoc/course/SEU-1471222164，
// 经核验为同一门课），故去重后为 12 门课程。
//
// lead 为主讲人（含头像）/ teamCount 为该课授课教师总数，
// intro 整理自各课程在平台上的公开页面（2026-09-19 抓取），以「主讲人团队 + 课程基本情况」为主。
// 头像已下载到 public/images/teachers/，不依赖外部 CDN 热链。
//
// 三处缺数据，待院方补充：
//   1. 病理学（张爱凤）—— 平台页面无教师头像，lead.avatar 留空走占位图；
//   2. 放射诊断学（英文）、放射诊断学实习、影像技术学 —— SPOC / 指定学期地址需登录访问，
//      拿不到教师团队，lead 留空，intro 用平台公开的课程概述代述。
//
// 学期状态以 2026-09-18 核验为准：
//   ok    —— 当前可学（进行中 / 可访问）
//   soon  —— 报名中，近期开课
//   ended —— 最近学期已结束，学生点进去无法加入
// pinned 为 true 表示该链接是 SPOC 或带 tid 的指定学期地址，换学期即永久失效，需向院方索要当期链接。
//
// 链接已清理 outVendor / from=searchPage 等追踪参数。

export const MOOC_MODULES = [
  {
    key: 'basic',
    title: '影像基础类',
    desc: '解剖学与病理学等医学基础课程，建立形态学与病变识别的基础，是进入影像专业学习的前置支撑。',
    icon: 'fa-book-medical',
    color: '#2563eb',
    tint: '#eff6ff',
    gradient: 'linear-gradient(135deg,#1e3a8a,#2563eb)',
    courses: [
      {
        name: '系统解剖学',
        lead: { name: '雷志年', title: '副教授 · 东南大学', avatar: '/images/teachers/lei-zhinian.jpg' },
        teamCount: 1,
        intro: '按运动、消化、呼吸、泌尿、脉管、神经等系统逐章讲解人体器官的形态、结构与位置关系。课程配精细解剖图片与实体标本素材，帮助学生在影像切面上还原正常人体结构，是影像解剖与临床定位的形态学基础。',
        platform: '中国大学MOOC',
        url: 'https://www.icourse163.org/course/SEU-1472544175',
        status: 'ok',
        term: '第 3 次开课 2026-07-20 ~ 2026-12-31 · 共 24 周 · 3-5 小时/周'
      },
      {
        name: '局部解剖学',
        lead: { name: '吕海芹', title: '副教授 · 东南大学', avatar: '/images/teachers/lv-haiqin.jpg' },
        teamCount: 1,
        intro: '按背、上肢、下肢、头、颈、胸、腹、盆会阴八大分区，逐层讲解器官的位置、形态、毗邻关系与临床意义。内容直接对应断层影像中解剖结构的辨识，是阅片与病灶定位的必修基本功。',
        platform: '中国大学MOOC',
        url: 'https://www.icourse163.org/course/20240911-1471728161',
        status: 'ok',
        term: '进行中 2026-08-24 ~ 2027-01-22'
      },
      {
        name: '病理学',
        lead: { name: '张爱凤', title: '东南大学', avatar: '' },
        teamCount: 1,
        intro: '第 2 期正在开课，共 56 学时。课程采用 AI + SPOC 线上线下混合式教学：线上提供高清病理切片图像与案例视频，并配知识图谱 AI 助教按学习进度推送个性化资料；线下结合实体标本讲解病变器官，直观感受疾病的病理变化。',
        platform: '学银在线',
        url: 'https://www.xueyinonline.com/detail/259143252',
        status: 'ok',
        term: '第 2 期进行中 2026-01-01 ~ 2026-12-31 · 56 学时'
      },
      {
        name: '普通病理学',
        lead: { name: '李懿萍', title: '副教授 · 东南大学', avatar: '/images/teachers/li-yiping.jpg' },
        teamCount: 8,
        intro: '系统讲解疾病发生发展中的形态与功能改变，结合典型图片、视频、动画与临床病例讲透炎症、肿瘤等基本病变。适合医学相关专业复习病理理论、为系统病理学打底。',
        platform: '中国大学MOOC',
        url: 'https://www.icourse163.org/course/SEU-1463109174',
        status: 'soon',
        term: '2026-09-21 起开课'
      },
      {
        name: '影像解剖学',
        lead: { name: '彭新桂', title: '副主任医师、副教授 · 东南大学', avatar: '/images/teachers/peng-xingui.jpg' },
        teamCount: 1,
        intro: '医学影像专业必修的专业基础课。课程用 X 线、CT、MRI 等成像技术研究正常人体器官结构的图像表现，训练学生在不同图像上识别解剖结构、熟悉脏器形态密度与信号，并掌握各部位解剖结构的正常值。',
        platform: '中国大学MOOC',
        url: 'https://www.icourse163.org/course/SEU-1461296162',
        status: 'ended',
        term: '最近学期 2026-03-06 ~ 2026-07-08'
      }
    ]
  },
  {
    key: 'professional',
    title: '影像专业课',
    desc: '放射诊断与介入放射学等影像专业核心课程，覆盖各系统病变的影像表现、诊断思路与报告书写。',
    icon: 'fa-x-ray',
    color: '#4f46e5',
    tint: '#eef2ff',
    gradient: 'linear-gradient(135deg,#312e81,#4f46e5)',
    courses: [
      {
        name: '放射诊断学（中文）',
        lead: { name: '居胜红', title: '教授 · 东南大学', avatar: '/images/teachers/ju-shenghong.jpg' },
        teamCount: 1,
        intro: '医学影像学专业必修的专业核心课程，授课教师均为临床一线放射科医生，影像工作经验丰富，教学以常见病、多发病的诊断要点与鉴别诊断思维为核心，力求把重点难点讲透彻、学以致用。全课共七个章节，并配专人负责在线答疑、考核与讨论。',
        platform: '中国大学MOOC',
        url: 'https://www.icourse163.org/course/SEU-1461291162',
        status: 'soon',
        term: '2026-09-21 起开课'
      },
      {
        name: '放射诊断学（英文）',
        lead: null,
        teamCount: 0,
        intro: '与《放射诊断学》同源的英文授课版本（Diagnostic Radiology）。面向临床医学专业留学生、医学影像专业住院医师与本科生，以英文讲授各系统常见病的影像诊断与鉴别诊断，培养专业英语术语表达与文献阅读能力。',
        platform: '中国大学MOOC · SPOC',
        url: 'https://www.icourse163.org/spoc/course/SEU-1466148161',
        status: 'ended',
        term: '第 1 次开课 · 绑定 2022 学期',
        pinned: true
      },
      {
        name: '放射诊断学实习',
        lead: null,
        teamCount: 0,
        intro: '《Radiographic Professional Practice》——放射诊断学的实践教学课程，以真实病例为线索开展英文专业教学，采用影像案例教学、理论与实践结合的方式，训练阅片流程、征象描述与影像报告书写。考核含随堂练习、课后习题与阶段技能考核。',
        platform: '中国大学MOOC',
        url: 'https://www.icourse163.org/learn/SEU-1471790168?tid=1475694449',
        status: 'ended',
        term: '第 3 次开课 2025-09-16 ~ 2026-01-26 · 3 小时/周 · 43 人参加',
        pinned: true
      },
      {
        name: '介入放射学',
        lead: { name: '滕皋军', title: '中国科学院院士 · 东南大学附属中大医院院长', avatar: '/images/teachers/teng-gaojun.jpg' },
        teamCount: 2,
        intro: '课程覆盖消化、呼吸、骨骼、神经、心血管等系统的介入诊断与治疗，讲授经皮穿刺活检等各类介入操作技能，带学生系统走进这门日新月异的新兴学科。',
        platform: '中国大学MOOC',
        url: 'https://www.icourse163.org/course/SEU-1001754353',
        status: 'ended',
        term: '最近学期 2026-03-30 ~ 2026-06-20'
      }
    ]
  },
  {
    key: 'interdisciplinary',
    title: '影像交叉类',
    desc: '医学成像原理与影像技术等医工交叉课程，理解图像从物理采集到临床呈现的全过程。',
    icon: 'fa-diagram-project',
    color: '#0d9488',
    tint: '#f0fdfa',
    gradient: 'linear-gradient(135deg,#0f766e,#0d9488)',
    courses: [
      {
        name: '医学成像原理',
        lead: { name: '万遂人', title: '教授 · 东南大学', avatar: '/images/teachers/wan-suiren.jpg' },
        teamCount: 1,
        intro: '共 8 章、15 学时。课程从线性系统基础讲到 X 线投影成像、数字 X 线、X 线 CT、核医学成像、超声成像与磁共振成像，兼顾对成像机制的分析能力与编写基本成像算法的实践能力，是理解图像"从物理采集到临床呈现"的关键一课。',
        platform: '中国大学MOOC',
        url: 'https://www.icourse163.org/course/SEU-1001752363',
        status: 'ended',
        term: '8 章 · 15 学时 · 最近学期 2020-02-24 ~ 2020-06-30，长期未开课'
      },
      {
        name: '影像技术学',
        lead: null,
        teamCount: 0,
        intro: 'X 线摄影技术能透过现象看到物体的内部本质，其成像原理与可见光成像既有相似之处，又有很大不同。课程讲授各模态检查的扫描参数、体位设计与后处理技术，帮助学生理解影像图像是如何采集与生成的。',
        platform: '中国大学MOOC · SPOC',
        url: 'https://www.icourse163.org/spoc/course/SEU-1449642170',
        status: 'ended',
        term: '第 2 次开课 2019-12-19 ~ 2020-02-17 · 绑定 2019 学期，长期未开课',
        pinned: true
      }
    ]
  },
  {
    key: 'vr',
    title: '影像虚拟仿真一流课程',
    desc: '国家级一流课程，以虚拟仿真实验还原从影像诊断到介入治疗的操作流程。',
    icon: 'fa-vr-cardboard',
    color: '#0891b2',
    tint: '#ecfeff',
    gradient: 'linear-gradient(135deg,#164e63,#0891b2)',
    courses: [
      {
        name: '基于影像技术的肝癌诊断与介入治疗虚拟仿真',
        lead: { name: '居胜红', title: '教授、主任医师 · 东南大学', avatar: '/images/teachers/ju-shenghong.jpg' },
        teamCount: 6,
        intro: '实验按《患者接诊》《肝癌影像学诊断》《介入治疗》《术前和术后》四个环节展开，在虚拟环境中还原肝癌影像学诊断、术后评估与肝动脉化疗栓塞术的情景模拟，累计访问量已超 18 万。教学团队含滕皋军院士、彭新桂副教授等。',
        platform: '东南大学虚拟仿真平台',
        url: 'https://xnfz.seu.edu.cn/course/details-expe/262.html',
        status: 'ok',
        term: '第四期 · 2024-10-11 开课 · 1 学分 / 3 学时'
      }
    ]
  }
]

export const MOOC_STATUS_LABEL = {
  ok: '进行中',
  soon: '报名中',
  ended: '已结束'
}
