export const examInfoData = {
  examId: null,
  examName: '2026年住培结业考核',
  examPassword: '717871',
  topic: '内科',
  station: '接诊病人站',
  candidateName: '朱波',
  candidatePhone: '186****8777',
  candidateRoom: '内科',
  deviceName: '科教平板01',
  deviceBind: '王考官的平板, 科教平板-P1（王考官、李考官）',
  selectedProjects: ['病史采集', '体格检查', '人文沟通']
}

export const patientInfoData = {
  scene: '神经内科',
  name: '张明远',
  age: 42,
  gender: '男',
  occupation: '中学语文教师',
  chiefComplaint: '发热、头痛伴意识模糊2天。',
  avatar: 'images/patients/patient-male-45.jpg',
  fullBodyImage: 'images/patients/full-male-45.jpg',
  idleVideo: 'videos/male-45-idle.mp4',
  speakingVideo: 'videos/male-45-speaking.mp4',
  vitals: [
    { label: '体温', value: '38.9℃' },
    { label: '脉搏', value: '96次/分' },
    { label: '呼吸', value: '20次/分' },
    { label: '血压', value: '128/76mmHg' },
    { label: 'SpO₂', value: '98%（未吸氧）' }
  ]
}

export const chatMessagesData = [
  { from: 'candidate', text: '您好，我是您的接诊医生。请问您今天怎么不舒服？', time: '14:01' },
  { from: 'patient', text: '我胸口闷得厉害，一动就喘不上气…已经两天了。', time: '14:02' },
  { from: 'candidate', text: '具体是哪个位置闷？是一直闷还是阵发性的？', time: '14:02' },
  { from: 'patient', text: '胸口正中间，一直闷着，躺下加重。还有点发烧，38度。', time: '14:03', hasAsset: false },
  { from: 'candidate', text: '好的，那您以前有心脏病或高血压吗？最近有没有感冒过？', time: '14:03' },
  { from: 'patient', text: '没有心脏病，血压平时正常。上周感冒了，吃了点感冒药。', time: '14:04', hasAsset: true, assetLabel: '查看：胸部CT平扫' }
]

export const analysisPhasedInfo = [
  '患者王建国，男，45岁，公司职员。因"双下肢水肿2周，加重伴眼睑浮肿3天"入院。',
  '患者2周前无明显诱因出现双下肢水肿，晨轻暮重，近3天水肿加重，并出现眼睑浮肿。伴尿中泡沫增多，乏力明显。无发热、咳嗽、胸闷气促。饮食睡眠尚可，大便正常。既往体健，否认高血压、糖尿病、肝炎、结核等病史。无手术外伤史，无药物过敏史。吸烟15年，每日约10支，偶饮酒。',
  '查体：T 36.8℃, P 78次/分, R 18次/分, BP 145/95mmHg。神清，眼睑轻度浮肿。双肺呼吸音清，未闻及干湿啰音。心率78次/分，律齐，各瓣膜听诊区未闻及病理性杂音。腹平软，无压痛及反跳痛。双下肢凹陷性水肿（++），双侧对称。',
  '辅助检查：尿蛋白(+++)，24h尿蛋白定量5.2g，血白蛋白28g/L，总胆固醇7.8mmol/L，甘油三酯2.6mmol/L。血清肌酐78μmol/L，尿素氮5.6mmol/L。补体C3 0.85g/L（偏低），抗核抗体阴性。肾脏B超：双肾大小形态正常，皮质回声略增强。'
]

export const analysisQuestionsData = [
  { id: 1, text: '根据现有信息，该患者最可能的初步诊断是什么？请说明理由。', phase: 0, answer: '', done: false },
  { id: 2, text: '请进一步询问还需要了解哪些病史信息？列出至少4项。', phase: 0, answer: '', done: false },
  { id: 3, text: '该患者的水肿最可能的病理生理机制是什么？请结合临床表现进行分析。', phase: 0, answer: '', done: false },
  { id: 4, text: '请列出该患者的完整诊断，并说明诊断依据。', phase: 1, answer: '', done: false },
  { id: 5, text: '根据上述查体结果，哪些体征对诊断有重要提示意义？', phase: 1, answer: '', done: false },
  { id: 6, text: '请列出需要鉴别的疾病（至少3个），并说明鉴别要点。', phase: 2, answer: '', done: false },
  { id: 7, text: '请解读该患者的辅助检查结果，指出关键异常指标及其临床意义。', phase: 3, answer: '', done: false },
  { id: 8, text: '请制定该患者的治疗方案，包括药物治疗和非药物治疗。', phase: 3, answer: '', done: false },
  { id: 9, text: '请根据辅助检查结果，分析该患者的病情严重程度及预后。', phase: 3, answer: '', done: false },
  { id: 10, text: '如果需要对该患者进行长期管理，请提出具体的随访计划和健康教育内容。', phase: 3, answer: '', done: false }
]

export const scoreSheetsData = [
  {
    name: '病史采集',
    categories: [
      { category: '一般项目', items: [
        { name: '自我介绍', points: '清晰说明姓名、身份及本次问诊目的', max: 3, score: 3 },
        { name: '语速仪态', points: '语速适中、语气沉稳，建立初步信任感', max: 3, score: 3 },
        { name: '询问基本信息', points: '准确获取并复述患者姓名、性别、年龄、职业', max: 2, score: 2 },
        { name: '主诉', points: '精准提炼主诉，确认起病时间及具体时间节点', max: 3, score: 2.5 }
      ]},
      { category: '现病史', items: [
        { name: '起病情况与时间', points: '主动询问常见诱因：感染接触史、过度劳累等', max: 2, score: 2 },
        { name: '主要症状特点', points: '详细询问发热程度、头痛性质、意识状态变化', max: 3, score: 2 }
      ]}
    ]
  },
  {
    name: '体格检查',
    categories: [
      { category: '一般检查', items: [
        { name: '体温测量', points: '正确使用体温计，读数准确', max: 3, score: 0 },
        { name: '脉搏检查', points: '正确触诊桡动脉，计数准确', max: 2, score: 0 },
        { name: '血压测量', points: '正确使用血压计，操作规范', max: 3, score: 0 }
      ]},
      { category: '专项检查', items: [
        { name: '肺部听诊', points: '听诊位置正确，辨别呼吸音', max: 3, score: 0 },
        { name: '心脏听诊', points: '听诊位置正确，辨别心音', max: 3, score: 0 }
      ]}
    ]
  },
  {
    name: '人文沟通',
    categories: [
      { category: '沟通技巧', items: [
        { name: '共情表达', points: '对患者情绪做出恰当回应', max: 3, score: 0 },
        { name: '信息告知', points: '用通俗语言解释病情，避免过度医学术语', max: 3, score: 0 },
        { name: '知情同意', points: '治疗方案征得患者同意', max: 2, score: 0 }
      ]}
    ]
  }
]

export const candidateQueueData = [
  { name: '朱波', phone: '186****8777', room: '内科', status: 'waiting', device: '-' },
  { name: '韩旭', phone: '158****0002', room: '内科', status: 'waiting', device: '-' },
  { name: '唐勇', phone: '131****9126', room: '内科', status: 'done', device: 'SP平板-03' },
  { name: '王芳', phone: '139****3333', room: '内科', status: 'examining', device: 'SP平板-05' },
  { name: '赵强', phone: '137****4444', room: '内科', status: 'waiting', device: '-' },
  { name: '刘洋', phone: '135****5555', room: '内科', status: 'examining', device: 'SP平板-07' }
]

export const scoringRecordsData = [
  { id: 1, name: '朱波', phone: '13800001111', examStatus: 'examining', scoreStatus: null, result: '-', time: '-', scoredCount: 0, minHumanExaminers: 3, scoredByMe: false },
  { id: 2, name: '丁迪', phone: '13800002222', examStatus: 'done', scoreStatus: 'unscored', result: '-', time: '-', scoredCount: 0, minHumanExaminers: 3, scoredByMe: false },
  { id: 3, name: '刘洋', phone: '13800003333', examStatus: 'done', scoreStatus: 'scored', result: '14.5/16', time: '14:32', scoredCount: 2, minHumanExaminers: 3, scoredByMe: true },
  { id: 4, name: '唐勇', phone: '13800004444', examStatus: 'done', scoreStatus: 'scored', result: '15.0/16', time: '14:25', scoredCount: 3, minHumanExaminers: 3, scoredByMe: true },
  { id: 5, name: '陈明', phone: '13800005555', examStatus: 'done', scoreStatus: 'scored', result: '13.0/16', time: '14:50', scoredCount: 1, minHumanExaminers: 3, scoredByMe: false },
  { id: 6, name: '李华', phone: '13800006666', examStatus: 'done', scoreStatus: 'unscored', result: '-', time: '-', scoredCount: 0, minHumanExaminers: 3, scoredByMe: false },
  { id: 7, name: '王磊', phone: '13800007777', examStatus: 'done', scoreStatus: 'scored', result: '14.0/16', time: '14:18', scoredCount: 3, minHumanExaminers: 3, scoredByMe: true },
  { id: 8, name: '赵晓', phone: '13800008888', examStatus: 'done', scoreStatus: 'scored', result: '12.5/16', time: '14:10', scoredCount: 2, minHumanExaminers: 3, scoredByMe: true },
  { id: 9, name: '孙鹏', phone: '13800009999', examStatus: 'done', scoreStatus: 'unscored', result: '-', time: '-', scoredCount: 0, minHumanExaminers: 3, scoredByMe: false },
  { id: 10, name: '周涛', phone: '13800001000', examStatus: 'done', scoreStatus: 'scored', result: '15.5/16', time: '13:45', scoredCount: 3, minHumanExaminers: 3, scoredByMe: true },
  { id: 11, name: '吴敏', phone: '13800001110', examStatus: 'done', scoreStatus: 'scored', result: '14.0/16', time: '14:18', scoredCount: 1, minHumanExaminers: 3, scoredByMe: false },
  { id: 12, name: '郑源', phone: '13800001230', examStatus: 'done', scoreStatus: 'scored', result: '15.0/16', time: '14:25', scoredCount: 2, minHumanExaminers: 3, scoredByMe: true }
]

export const pendingCandidatesData = [
  { id: 1, name: '王芳', phone: '138****0001', status: 'pending' },
  { id: 2, name: '赵敏', phone: '138****0002', status: 'pending' },
  { id: 3, name: '钱刚', phone: '138****0003', status: 'pending' },
  { id: 4, name: '孙丽', phone: '138****0004', status: 'pending' },
  { id: 5, name: '李阳', phone: '138****0005', status: 'pending' },
  { id: 6, name: '周婷', phone: '138****0006', status: 'pending' },
  { id: 7, name: '吴凯', phone: '138****0007', status: 'pending' },
  { id: 8, name: '郑雪', phone: '138****0008', status: 'pending' },
  { id: 9, name: '冯达', phone: '138****0009', status: 'pending' },
  { id: 10, name: '褚霞', phone: '138****0010', status: 'pending' },
  { id: 11, name: '卫东', phone: '138****0011', status: 'pending' },
  { id: 12, name: '蒋瑶', phone: '138****0012', status: 'pending' },
  { id: 13, name: '沈浩', phone: '138****0013', status: 'pending' },
  { id: 14, name: '韩冰', phone: '138****0014', status: 'pending' },
  { id: 15, name: '杨帆', phone: '138****0015', status: 'pending' },
  { id: 16, name: '朱丹', phone: '138****0016', status: 'pending' },
  { id: 17, name: '秦亮', phone: '138****0017', status: 'pending' },
  { id: 18, name: '尤静', phone: '138****0018', status: 'pending' },
  { id: 19, name: '许峰', phone: '138****0019', status: 'pending' },
  { id: 20, name: '何露', phone: '138****0020', status: 'pending' }
]

export const deviceDataConfig = {
  candidateStations: [
    { specialty: '内科', rowSpan: 4, stations: [
      { name: '接诊病人站', rowSpan: 3, projects: [
        { name: '病史采集', duration: "14'", deviceCount: 3, checked: true },
        { name: '体格检查', duration: "10'", deviceCount: 2, checked: true },
        { name: '人文沟通', duration: "8'", deviceCount: 2, checked: true }
      ]},
      { name: '病历书写站', rowSpan: 1, projects: [
        { name: '书写病历', duration: "20'", deviceCount: 0, checked: false }
      ]}
    ]},
    { specialty: '全科', rowSpan: 1, stations: [
      { name: '接诊病人站', rowSpan: 1, projects: [
        { name: '人文沟通', duration: "8'", deviceCount: 0, checked: false }
      ]}
    ]},
    { specialty: '妇产科', rowSpan: 2, stations: [
      { name: '接诊病人站', rowSpan: 1, projects: [
        { name: '病史采集', duration: "14'", deviceCount: 0, checked: false }
      ]},
      { name: '体格检查站', rowSpan: 1, projects: [
        { name: '体格检查', duration: "10'", deviceCount: 1, checked: false }
      ]}
    ]},
    { specialty: '口腔科', rowSpan: 3, stations: [
      { name: '接诊病人站', rowSpan: 3, projects: [
        { name: '病史采集', duration: "14'", deviceCount: 1, checked: false },
        { name: '口腔检查', duration: "10'", deviceCount: 0, checked: false },
        { name: '病历书写', duration: "20'", deviceCount: 0, checked: false }
      ]}
    ]}
  ],
  examinerStations: [
    { specialty: '内科', station: '接诊病人站', scoreSheet: '内科-病史采集评分表', bindings: [{ name: '王考官的平板', ok: true }, { name: '科教平板-P1', ok: true }, { name: '李考官的平板', ok: false }, { name: '赵考官的平板', ok: true }, { name: '陈考官的平板', ok: true }], checked: true },
    { specialty: '内科', station: '病历书写站', scoreSheet: '病历书写评分表', bindings: [{ name: '孙考官的平板', ok: true }], checked: false },
    { specialty: '全科', station: '接诊病人站', scoreSheet: '全科-接诊评分表', bindings: [{ name: '马考官的平板', ok: false }], checked: false },
    { specialty: '妇产科', station: '接诊病人站', scoreSheet: '妇产-接诊评分表', bindings: [{ name: '周考官的平板', ok: false }], checked: false },
    { specialty: '妇产科', station: '体格检查站', scoreSheet: '体格检查评分表', bindings: [{ name: '科教平板-P2', ok: false }], checked: false },
    { specialty: '口腔科', station: '接诊病人站', scoreSheet: '口腔-接诊评分表', bindings: [{ name: '吴考官的平板', ok: true }], checked: false }
  ]
}

export const pageTitles = {
  'login': '考务登录', 'password': '考试口令', 'device-select': '设备用途选择',
  'confirm': '考生确认', 'candidate-queue': '考生队列', 'task': '任务说明',
  'dialogue': '对话考核', 'analysis': '病例分析', 'writing': '病历书写',
  'complete': '项目完成', 'ex-login': '考官登录', 'scoring': '考官评分+签名',
  'ex-select': '评分记录', 'ex-pending': '待考考生', 'load-fail': '加载失败'
}

export const diagnosisLibrary = [
  { name: '急性病毒性心肌炎', category: '心血管', code: 'I40.9' },
  { name: '扩张型心肌病', category: '心血管', code: 'I42.0' },
  { name: '急性心包炎', category: '心血管', code: 'I30.9' },
  { name: '不稳定型心绞痛', category: '心血管', code: 'I20.0' },
  { name: '急性心肌梗死', category: '心血管', code: 'I21.9' },
  { name: '感染性心内膜炎', category: '心血管', code: 'I33.0' },
  { name: '社区获得性肺炎', category: '呼吸', code: 'J15.9' },
  { name: '慢性阻塞性肺疾病急性加重', category: '呼吸', code: 'J44.1' },
  { name: '支气管哮喘急性发作', category: '呼吸', code: 'J45.9' },
  { name: '肺栓塞', category: '呼吸', code: 'I26.9' },
  { name: '结核性胸膜炎', category: '呼吸', code: 'A16.5' },
  { name: '急性肾盂肾炎', category: '泌尿', code: 'N10' },
  { name: '急性肾小球肾炎', category: '泌尿', code: 'N00.9' },
  { name: '上消化道出血', category: '消化', code: 'K92.2' },
  { name: '急性胰腺炎', category: '消化', code: 'K85.9' },
  { name: '急性胆囊炎', category: '消化', code: 'K81.0' },
  { name: '糖尿病酮症酸中毒', category: '内分泌', code: 'E10.1' },
  { name: '甲状腺功能亢进危象', category: '内分泌', code: 'E05.5' },
  { name: '脑膜炎', category: '神经', code: 'G03.9' },
  { name: '蛛网膜下腔出血', category: '神经', code: 'I60.9' },
]

export const humanityScenario = {
  title: '告知坏消息',
  titleEn: 'Breaking Bad News',
  desc: '患者张明远，42岁，中学语文教师。经检查确诊为急性病毒性心肌炎，心功能II级。患者一直以为自己只是普通感冒，对突然的严重诊断毫无心理准备。患者妻子陪同在旁，情绪焦虑。',
  descEn: 'Patient Zhang Mingyuan, 42, middle school teacher. Diagnosed with acute viral myocarditis. Patient thought it was just a common cold and is unprepared for the serious diagnosis. His wife is accompanying him, visibly anxious.',
  patientRole: '患者角色：情绪敏感，对自己的健康状况非常担忧，需要医生耐心解释。可能会反复询问"会不会有生命危险"、"会不会影响以后工作"。',
  patientRoleEn: 'Patient Role: Emotionally sensitive, very worried about health condition. May repeatedly ask about prognosis and work impact.',
}
