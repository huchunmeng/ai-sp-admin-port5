// 院方样例数据（东南大学医学院《影像图片题》）—— 自动生成，勿手改结构
//
// 来源：`00_我的工作区/10_虚拟病人产品/55_客户相关/19_东南大学医学院/医路慧影/影像试题/影像图片题.docx`
// 拆包得到 13 个病例 / 14 张真实影像（2 张 GIF 已转 JPEG），图片落在
// `apps/admin/public/data/imaging-samples/<id>/`，训练端构建时同步复制。
//
// ⚠️ 三条已知事项（正式使用前需处理，勿当已完成的正式题库）：
//   1. **金标准报告由 AI 起草**：依据题干 + 选择题标准答案写就，**未经医师复核**。作为样例可用，作为考核依据不可
//   2. **一般信息为脱敏占位**：院方素材只给性别与年龄，姓名/检查号/检查时间/科别均为占位值
//   3. **像素级脱敏未做**：超声图（SEU-006 等）带机器叠加信息（CINE / 帧号 / 日期），
//      当前分辨率下不可辨识患者身份，但正式使用前建议逐张核验或裁切角标
//
// 一张拼图含多个视图的病例（SEU-002/003/009）：**收敛为一个视图**，视图名合并说明含哪几格；
// 未做切图。若要拆成真正的多视图，需按格切分后替换 series[].images。

export const SEU_SAMPLES = [
  {
    "id": "SEU-001",
    "title": "CT · 肺隔离症",
    "modality": "CT",
    "bodyPart": "胸部",
    "level": "U2",
    "icon": "fa-lungs",
    "clinicalBrief": "患者女，35岁，咳嗽、咳痰1年余，行胸部CT平扫+增强检查",
    "series": [
      {
        "key": "ct",
        "name": "胸部CT平扫+增强",
        "en": "CT",
        "frames": 1,
        "images": [
          "/data/imaging-samples/SEU-001/SEU-001-1.jpeg"
        ]
      }
    ],
    "deidentify": {
      "name": "患*",
      "ageRange": "30–39 岁",
      "sex": "女",
      "dept": "呼吸内科",
      "examNo": "****1001",
      "imageNo": "****2001",
      "inpatientNo": "****",
      "cardNo": "****",
      "examTime": "2026-03-15 09:30"
    },
    "capabilities": {
      "hasMeasurement": false,
      "hasPriorExam": false,
      "hasEnhancedPhase": true,
      "isTumor": false,
      "hasStagingInfo": false
    },
    "goldStandard": {
      "technique": "胸部CT平扫+增强检查。",
      "findings": "右肺下叶后底段紧贴膈面见一团块状阴影；边界较清晰；病灶长轴指向内后方；CT增强可见体循环供血动脉（源自胸主动脉）；未见明确坏死、空洞、钙化及周围支气管充气征；未见纵隔及肺门淋巴结明显增大；余肺实质、气道、纵隔结构未见明确异常。",
      "impression": "右肺下叶后底段团块，符合肺隔离症表现：定位为右肺下叶后底段，定性倾向为先天性肺发育异常（肺隔离症），依据包括典型部位（紧贴膈面）、形态特征（边界清、长轴内后向提示与胸主动脉关联）、增强可见体循环供血动脉；建议行主动脉造影以明确供血动脉起源与走行。"
    },
    "version": 1,
    "status": "published",
    "isSample": true,
    "sampleNote": "样例：源自院方素材《影像图片题》（东南大学医学院）· 金标准报告由 AI 依据题干与标准答案起草，待教研复核",
    "createdBy": "院方素材导入",
    "updatedBy": "院方素材导入",
    "createdAt": "2026-09-19 23:00",
    "updatedAt": "2026-09-19 23:00",
    "publishedAt": "2026-09-19 23:00"
  },
  {
    "id": "SEU-002",
    "title": "DR · 右上肺中央型肺癌",
    "modality": "DR",
    "bodyPart": "胸部",
    "level": "R2",
    "icon": "fa-lungs",
    "clinicalBrief": "患者，男，70岁，因有咳嗽、痰中带血3个月就诊。听诊无异常发现，痰查癌细胞阴性。胸部正侧位片",
    "series": [
      {
        "key": "main",
        "name": "胸部正位 + 胸部侧位",
        "en": "DR",
        "frames": 1,
        "images": [
          "/data/imaging-samples/SEU-002/SEU-002-1.jpg"
        ]
      }
    ],
    "deidentify": {
      "name": "患*",
      "ageRange": "70–79 岁",
      "sex": "男",
      "dept": "呼吸内科",
      "examNo": "****1002",
      "imageNo": "****2002",
      "inpatientNo": "****",
      "cardNo": "****",
      "examTime": "2026-03-15 09:30"
    },
    "capabilities": {
      "hasMeasurement": false,
      "hasPriorExam": false,
      "hasEnhancedPhase": false,
      "isTumor": true,
      "hasStagingInfo": false
    },
    "goldStandard": {
      "technique": "胸部正位及侧位DR检查。",
      "findings": "右上肺门区见一不规则软组织密度肿块影，边界欠清，形态不规则，密度不均；右上叶支气管截断征象可见；右上叶肺纹理聚拢、减少；余肺野透亮度正常，未见明确结节、空洞、实变或胸腔积液；纵隔居中，心影大小形态未见明显异常；肋骨及胸椎骨质未见明确破坏征象。",
      "impression": "右上肺中央型肺癌。依据：老年男性，咳嗽、痰中带血3个月，影像显示右上肺门区不规则肿块伴支气管截断及肺纹理聚拢，符合中央型肺癌典型表现。建议进一步行胸部CT扫描以评估肿块范围、纵隔淋巴结及有无远处转移；确诊需行纤维支气管镜检查并活检。"
    },
    "version": 1,
    "status": "published",
    "isSample": true,
    "sampleNote": "样例：源自院方素材《影像图片题》（东南大学医学院）· 金标准报告由 AI 依据题干与标准答案起草，待教研复核",
    "createdBy": "院方素材导入",
    "updatedBy": "院方素材导入",
    "createdAt": "2026-09-19 23:00",
    "updatedAt": "2026-09-19 23:00",
    "publishedAt": "2026-09-19 23:00"
  },
  {
    "id": "SEU-003",
    "title": "CT · 左颞骨胆脂瘤（继发颅内感染：左侧小脑半球脑脓肿、左侧脑膜炎）",
    "modality": "CT",
    "bodyPart": "头颈",
    "level": "F2",
    "icon": "fa-head-side-cough",
    "clinicalBrief": "患者，男，20岁。左耳流脓3年伴听力下降，头痛、发热2周。行颞骨CT及颅脑MRI检查，图像分别为轴位、冠状位CT和增强轴位、冠状位、矢状位MRI",
    "series": [
      {
        "key": "main",
        "name": "颞骨CT 轴位 + 颞骨CT 冠状位 + 颅脑MRI 增强轴位 + 颅脑MRI 增强冠状位 + 颅脑MRI 增强矢状位",
        "en": "CT",
        "frames": 1,
        "images": [
          "/data/imaging-samples/SEU-003/SEU-003-1.jpeg"
        ]
      }
    ],
    "deidentify": {
      "name": "患*",
      "ageRange": "20–29 岁",
      "sex": "男",
      "dept": "耳鼻咽喉科",
      "examNo": "****1003",
      "imageNo": "****2003",
      "inpatientNo": "****",
      "cardNo": "****",
      "examTime": "2026-03-15 09:30"
    },
    "capabilities": {
      "hasMeasurement": false,
      "hasPriorExam": false,
      "hasEnhancedPhase": true,
      "isTumor": false,
      "hasStagingInfo": false
    },
    "goldStandard": {
      "technique": "颞骨CT（轴位、冠状位）联合颅脑MRI增强扫描（轴位、冠状位、矢状位）。",
      "findings": "左侧鼓室及乳突区见软组织密度影，累及范围包括鼓室、乳突气房；骨质破坏征象明确：左侧乙状窦沟骨板、骨迷路、面神经管、中颅窝底及骨性外耳道骨质均受累破坏；未见明确钙化或脂肪密度。颅脑MRI增强示左侧小脑半球类圆形病灶，呈环形强化，中心坏死区呈T2高信号、DWI高信号、ADC低信号，周围见片状水肿；左侧大脑镰及小脑幕可见线状/条状强化，符合脑膜炎表现；余脑实质、脑室系统、中线结构未见明确异常。",
      "impression": "定位：左侧颞骨胆脂瘤；定性倾向：良性上皮性肿瘤，具侵袭性骨质破坏特征；继发左侧小脑半球脑脓肿及左侧脑膜炎。诊断依据：CT显示鼓室-乳突软组织影伴多部位骨质破坏（乙状窦沟、骨迷路、面神经管、中颅窝底、骨性外耳道），MRI增强证实小脑脓肿典型环形强化+弥散受限，以及脑膜线状强化。建议急诊神经外科会诊，完善血培养、脑脊液检查（腰穿需谨慎评估颅内压），并尽快行手术清除病灶（乳突根治+脓肿引流）以控制感染源。"
    },
    "version": 1,
    "status": "published",
    "isSample": true,
    "sampleNote": "样例：源自院方素材《影像图片题》（东南大学医学院）· 金标准报告由 AI 依据题干与标准答案起草，待教研复核",
    "createdBy": "院方素材导入",
    "updatedBy": "院方素材导入",
    "createdAt": "2026-09-19 23:00",
    "updatedAt": "2026-09-19 23:00",
    "publishedAt": "2026-09-19 23:00"
  },
  {
    "id": "SEU-004",
    "title": "MR · 肝门区胆管癌",
    "modality": "MR",
    "bodyPart": "腹部",
    "level": "R3",
    "icon": "fa-x-ray",
    "clinicalBrief": "患者，男，74岁。肝区偶感不适，腹胀、消瘦乏力伴皮肤瘙痒，查体皮肤巩膜黄染，行MRI检查",
    "series": [
      {
        "key": "mri",
        "name": "上腹部MRI",
        "en": "MRI",
        "frames": 1,
        "images": [
          "/data/imaging-samples/SEU-004/SEU-004-1.jpeg"
        ]
      }
    ],
    "deidentify": {
      "name": "患*",
      "ageRange": "70–79 岁",
      "sex": "男",
      "dept": "肝胆外科",
      "examNo": "****1004",
      "imageNo": "****2004",
      "inpatientNo": "****",
      "cardNo": "****",
      "examTime": "2026-03-15 09:30"
    },
    "capabilities": {
      "hasMeasurement": false,
      "hasPriorExam": false,
      "hasEnhancedPhase": true,
      "isTumor": true,
      "hasStagingInfo": false
    },
    "goldStandard": {
      "technique": "上腹部MRI平扫+增强扫描及MRCP检查。",
      "findings": "肝门区见结节状或肿块状异常信号灶；肝内胆管明显扩张，左右肝管扩张但未汇合；胆囊大小正常，未见增大；胆总管未见扩张；增强扫描示病灶静脉期强化程度高于动脉期；肝实质信号均匀，未见明确肝内转移灶；胰腺、脾脏及双肾形态与信号未见明确异常。",
      "impression": "肝门区占位性病变，符合胆管癌影像表现：定位在肝门部，定性倾向恶性（胆管来源），依据为肝门区肿块、肝内胆管扩张伴左右肝管不汇合、胆囊不增大、胆总管无扩张、静脉期强化高于动脉期；建议行血清CA19-9检测、ERCP或PTC以获取组织病理学确诊。"
    },
    "version": 1,
    "status": "published",
    "isSample": true,
    "sampleNote": "样例：源自院方素材《影像图片题》（东南大学医学院）· 金标准报告由 AI 依据题干与标准答案起草，待教研复核",
    "createdBy": "院方素材导入",
    "updatedBy": "院方素材导入",
    "createdAt": "2026-09-19 23:00",
    "updatedAt": "2026-09-19 23:00",
    "publishedAt": "2026-09-19 23:00"
  },
  {
    "id": "SEU-005",
    "title": "CT · 肺曲菌病",
    "modality": "CT",
    "bodyPart": "胸部",
    "level": "R2",
    "icon": "fa-lungs",
    "clinicalBrief": "患者，男，78岁，糖尿病17年，低热、右侧胸痛伴咳嗽2个月余，常规抗炎治疗症状改善不明显，痰培养结核菌（-），胸部CT平扫",
    "series": [
      {
        "key": "axial",
        "name": "胸部CT平扫",
        "en": "AXIAL",
        "frames": 1,
        "images": [
          "/data/imaging-samples/SEU-005/SEU-005-1.jpeg"
        ]
      }
    ],
    "deidentify": {
      "name": "患*",
      "ageRange": "70–79 岁",
      "sex": "男",
      "dept": "呼吸内科",
      "examNo": "****1005",
      "imageNo": "****2005",
      "inpatientNo": "****",
      "cardNo": "****",
      "examTime": "2026-03-15 09:30"
    },
    "capabilities": {
      "hasMeasurement": false,
      "hasPriorExam": false,
      "hasEnhancedPhase": false,
      "isTumor": false,
      "hasStagingInfo": false
    },
    "goldStandard": {
      "technique": "胸部CT平扫",
      "findings": "右肺上叶见一圆形软组织密度结节，直径约2.5 cm，边缘模糊，周围可见磨玻璃样淡薄渗出影（晕征）；病灶内未见明确钙化、空洞或液平；余肺实质未见明确实变、纤维条索、树芽征或支气管充气征；纵隔居中，气管支气管通畅，纵隔及肺门淋巴结未见肿大；胸膜未见增厚或积液。",
      "impression": "右肺上叶结节伴晕征，符合侵袭性肺曲菌病影像学表现，结合老年、长期糖尿病及抗炎治疗无效病史，高度提示肺曲菌病；建议进一步行痰真菌涂片+培养（含曲霉菌）、血清半乳甘露聚糖（GM）试验及必要时支气管肺泡灌洗液检测以确诊。"
    },
    "version": 1,
    "status": "published",
    "isSample": true,
    "sampleNote": "样例：源自院方素材《影像图片题》（东南大学医学院）· 金标准报告由 AI 依据题干与标准答案起草，待教研复核",
    "createdBy": "院方素材导入",
    "updatedBy": "院方素材导入",
    "createdAt": "2026-09-19 23:00",
    "updatedAt": "2026-09-19 23:00",
    "publishedAt": "2026-09-19 23:00"
  },
  {
    "id": "SEU-006",
    "title": "超声 · 特发性腹膜后纤维化",
    "modality": "超声",
    "bodyPart": "腹部",
    "level": "R3",
    "icon": "fa-wave-square",
    "clinicalBrief": "患者男，55岁，上腹胀满不适、隐痛，向腰背部放射，伴不规则低热4个月余。超声：腹主动脉左侧及前方自肾动脉水平至腹主动脉分叉上方可见14.2cm×10.0cm×5.8cm的低回声区，前缘边界清，后缘边界不清，肿物与左肾分界不清，左侧肾盂、肾盏扩张，左侧肾盂宽1.3cm",
    "series": [
      {
        "key": "us",
        "name": "腹部超声",
        "en": "US",
        "frames": 1,
        "images": [
          "/data/imaging-samples/SEU-006/SEU-006-1.jpg"
        ]
      }
    ],
    "deidentify": {
      "name": "患*",
      "ageRange": "50–59 岁",
      "sex": "男",
      "dept": "风湿免疫科",
      "examNo": "****1006",
      "imageNo": "****2006",
      "inpatientNo": "****",
      "cardNo": "****",
      "examTime": "2026-03-15 09:30"
    },
    "capabilities": {
      "hasMeasurement": false,
      "hasPriorExam": false,
      "hasEnhancedPhase": false,
      "isTumor": false,
      "hasStagingInfo": false
    },
    "goldStandard": {
      "technique": "腹部超声检查。",
      "findings": "腹主动脉左侧及前方自肾动脉水平至腹主动脉分叉上方可见一大小约14.2cm×10.0cm×5.8cm的低回声区；前缘边界清晰，后缘边界不清；肿物与左肾分界不清；左侧肾盂、肾盏扩张，左侧肾盂宽1.3cm；未见明确钙化、囊性变或内部血流信号描述；未见腹主动脉受压变形或管腔狭窄征象（题干未提供）；未见肝脏、胰腺、脾脏等邻近脏器形态结构异常（题干未提供）。",
      "impression": "腹膜后低回声占位，累及腹主动脉左侧及前方，范围自肾动脉水平至腹主动脉分叉上方，伴左侧肾盂肾盏扩张，符合特发性腹膜后纤维化影像表现；结合临床病史（中年男性、慢性腹痛腰背放射、低热）、实验室检查（ESR↑、多克隆γ球蛋白升高、自身免疫抗体阴性、排除感染及肿瘤），支持特发性腹膜后纤维化诊断；建议行增强CT或MRI进一步评估病变范围及包绕血管情况，并监测治疗反应。"
    },
    "version": 1,
    "status": "published",
    "isSample": true,
    "sampleNote": "样例：源自院方素材《影像图片题》（东南大学医学院）· 金标准报告由 AI 依据题干与标准答案起草，待教研复核",
    "createdBy": "院方素材导入",
    "updatedBy": "院方素材导入",
    "createdAt": "2026-09-19 23:00",
    "updatedAt": "2026-09-19 23:00",
    "publishedAt": "2026-09-19 23:00"
  },
  {
    "id": "SEU-007",
    "title": "MR · 血管母细胞瘤",
    "modality": "MR",
    "bodyPart": "颅脑",
    "level": "R2",
    "icon": "fa-brain",
    "clinicalBrief": "患者，女，56岁，头晕1个月，MRI平扫及增强扫描",
    "series": [
      {
        "key": "mri",
        "name": "颅脑MRI平扫+增强",
        "en": "MRI",
        "frames": 1,
        "images": [
          "/data/imaging-samples/SEU-007/SEU-007-1.jpeg"
        ]
      }
    ],
    "deidentify": {
      "name": "患*",
      "ageRange": "50–59 岁",
      "sex": "女",
      "dept": "神经外科",
      "examNo": "****1007",
      "imageNo": "****2007",
      "inpatientNo": "****",
      "cardNo": "****",
      "examTime": "2026-03-15 09:30"
    },
    "capabilities": {
      "hasMeasurement": false,
      "hasPriorExam": false,
      "hasEnhancedPhase": true,
      "isTumor": true,
      "hasStagingInfo": false
    },
    "goldStandard": {
      "technique": "颅脑MRI平扫及增强扫描。",
      "findings": "小脑半球见一囊实性肿块，囊性部分呈长T1长T2信号，壁结节位于囊壁一侧；实性部分在T1WI呈等或稍低信号，T2WI呈稍高信号；增强扫描囊壁无强化，壁结节明显均匀强化。病灶周围未见明显水肿，邻近脑组织受压移位。第四脑室受压变形。未见明确出血、钙化及坏死征象。",
      "impression": "小脑半球囊实性占位，壁结节明显强化，符合血管母细胞瘤影像学特征；建议结合临床及必要时行基因检测（如疑VHL综合征）或随访复查。"
    },
    "version": 1,
    "status": "published",
    "isSample": true,
    "sampleNote": "样例：源自院方素材《影像图片题》（东南大学医学院）· 金标准报告由 AI 依据题干与标准答案起草，待教研复核",
    "createdBy": "院方素材导入",
    "updatedBy": "院方素材导入",
    "createdAt": "2026-09-19 23:00",
    "updatedAt": "2026-09-19 23:00",
    "publishedAt": "2026-09-19 23:00"
  },
  {
    "id": "SEU-008",
    "title": "MR · 脑梗死",
    "modality": "MR",
    "bodyPart": "颅脑",
    "level": "U1",
    "icon": "fa-brain",
    "clinicalBrief": "女性，53岁，右侧肢体活动不灵1天余。查体：伸舌右偏，右上下肢肌力3～4级，右侧病理征（+）。MRI检查",
    "series": [
      {
        "key": "mri",
        "name": "颅脑MRI",
        "en": "MRI",
        "frames": 1,
        "images": [
          "/data/imaging-samples/SEU-008/SEU-008-1.jpeg"
        ]
      }
    ],
    "deidentify": {
      "name": "患*",
      "ageRange": "50–59 岁",
      "sex": "女",
      "dept": "神经内科",
      "examNo": "****1008",
      "imageNo": "****2008",
      "inpatientNo": "****",
      "cardNo": "****",
      "examTime": "2026-03-15 09:30"
    },
    "capabilities": {
      "hasMeasurement": false,
      "hasPriorExam": false,
      "hasEnhancedPhase": false,
      "isTumor": false,
      "hasStagingInfo": false
    },
    "goldStandard": {
      "technique": "颅脑MRI平扫（T1WI、T2WI、FLAIR序列）及DWI序列。",
      "findings": "左侧额顶叶皮质及皮质下区见片状异常信号影，T1WI呈稍低信号，T2WI及FLAIR呈高信号，DWI呈明显高信号，ADC图呈低信号；病灶范围约3.2 cm × 2.5 cm，形态不规则，边界欠清；未见明确出血、占位效应或强化征象；余脑实质、脑室系统、脑池、脑沟及中线结构未见明确异常；基底节区、丘脑、脑干及小脑未见新发梗死灶。",
      "impression": "左侧额顶叶急性期脑梗死。依据：典型临床表现（右侧肢体活动不灵、伸舌右偏、右侧病理征阳性）与影像学DWI高信号+ADC低信号高度吻合；病灶位于左侧大脑中动脉供血区皮质及皮质下区；无出血、肿瘤或炎症征象。建议完善头颈CTA或MRA评估血管情况，监测血压、血糖及血脂，启动二级预防。"
    },
    "version": 1,
    "status": "published",
    "isSample": true,
    "sampleNote": "样例：源自院方素材《影像图片题》（东南大学医学院）· 金标准报告由 AI 依据题干与标准答案起草，待教研复核",
    "createdBy": "院方素材导入",
    "updatedBy": "院方素材导入",
    "createdAt": "2026-09-19 23:00",
    "updatedAt": "2026-09-19 23:00",
    "publishedAt": "2026-09-19 23:00"
  },
  {
    "id": "SEU-009",
    "title": "DR · 骨化性肌炎",
    "modality": "DR",
    "bodyPart": "骨肌",
    "level": "U1",
    "icon": "fa-bone",
    "clinicalBrief": "男，17岁，左胫骨平台骨折术后半年余，左膝关节活动受限。左膝关节正侧位X线片",
    "series": [
      {
        "key": "main",
        "name": "左膝正位 + 左膝侧位",
        "en": "DR",
        "frames": 1,
        "images": [
          "/data/imaging-samples/SEU-009/SEU-009-1.jpeg"
        ]
      }
    ],
    "deidentify": {
      "name": "患*",
      "ageRange": "10–19 岁",
      "sex": "男",
      "dept": "骨科",
      "examNo": "****1009",
      "imageNo": "****2009",
      "inpatientNo": "****",
      "cardNo": "****",
      "examTime": "2026-03-15 09:30"
    },
    "capabilities": {
      "hasMeasurement": false,
      "hasPriorExam": false,
      "hasEnhancedPhase": false,
      "isTumor": false,
      "hasStagingInfo": false
    },
    "goldStandard": {
      "technique": "左膝关节正位及侧位X线平片。",
      "findings": "左膝关节周围软组织内见不规则、团块状、边界较清晰的骨化影，主要位于胫骨近端前外侧及股骨远端内侧软组织区，未累及关节间隙；骨化影密度不均，可见成熟骨小梁结构与未成熟骨基质混杂，部分区域呈磨玻璃样改变；关节面光整，关节间隙宽度正常；胫骨平台骨折术后改变，内固定物存留，局部骨质愈合良好；未见明确关节内游离体、骨质破坏或病理性骨折。",
      "impression": "左膝关节周围软组织内骨化影，符合骨化性肌炎影像学表现。结合17岁男性、左胫骨平台骨折术后半年余病史，考虑创伤后骨化性肌炎。建议临床结合症状（活动受限）及病程演变，必要时行MRI评估软组织活性成分；暂不推荐活检，避免诱发进展。"
    },
    "version": 1,
    "status": "published",
    "isSample": true,
    "sampleNote": "样例：源自院方素材《影像图片题》（东南大学医学院）· 金标准报告由 AI 依据题干与标准答案起草，待教研复核",
    "createdBy": "院方素材导入",
    "updatedBy": "院方素材导入",
    "createdAt": "2026-09-19 23:00",
    "updatedAt": "2026-09-19 23:00",
    "publishedAt": "2026-09-19 23:00"
  },
  {
    "id": "SEU-010",
    "title": "DR · Charcot 关节（神经性关节病）",
    "modality": "DR",
    "bodyPart": "骨肌",
    "level": "R2",
    "icon": "fa-bone",
    "clinicalBrief": "患者，女性，61岁，3年前腰椎手术史，术后开始左下肢感觉减退、麻木、无力，左足隐痛，无外伤史，左足拇趾曾不明原因窦道形成后自愈，现左足持续疼痛、肿胀加重半个月，左下肢跛行。左足X线及CT",
    "series": [
      {
        "key": "xr",
        "name": "左足X线+CT",
        "en": "XR",
        "frames": 1,
        "images": [
          "/data/imaging-samples/SEU-010/SEU-010-1.jpeg"
        ]
      }
    ],
    "deidentify": {
      "name": "患*",
      "ageRange": "60–69 岁",
      "sex": "女",
      "dept": "骨科",
      "examNo": "****1010",
      "imageNo": "****2010",
      "inpatientNo": "****",
      "cardNo": "****",
      "examTime": "2026-03-15 09:30"
    },
    "capabilities": {
      "hasMeasurement": false,
      "hasPriorExam": false,
      "hasEnhancedPhase": false,
      "isTumor": false,
      "hasStagingInfo": false
    },
    "goldStandard": {
      "technique": "左足正侧位X线平片及CT扫描。",
      "findings": "左足诸骨广泛骨质破坏、碎裂及畸形，累及距骨、跟骨、舟骨及多枚跗骨与跖骨基底部；可见多发游离骨碎片、关节间隙显著增宽、关节面不规则塌陷及半脱位；未见明确骨膜反应或软组织钙化；邻近软组织肿胀明显；骨皮质变薄，骨小梁稀疏，未见明确溶骨性或成骨性肿瘤样改变。",
      "impression": "左足Charcot关节（神经性关节病），符合神经源性关节破坏典型表现：无外伤史、感觉障碍病史明确（腰椎术后左下肢感觉减退、麻木）、隐痛与窦道史提示长期无痛性负重损伤；影像呈‘碎骨+宽隙+畸形’三联征；建议完善腰椎MRI评估神经压迫情况，并行血糖及糖化血红蛋白检测以排除糖尿病相关神经病变。"
    },
    "version": 1,
    "status": "published",
    "isSample": true,
    "sampleNote": "样例：源自院方素材《影像图片题》（东南大学医学院）· 金标准报告由 AI 依据题干与标准答案起草，待教研复核",
    "createdBy": "院方素材导入",
    "updatedBy": "院方素材导入",
    "createdAt": "2026-09-19 23:00",
    "updatedAt": "2026-09-19 23:00",
    "publishedAt": "2026-09-19 23:00"
  },
  {
    "id": "SEU-011",
    "title": "DR · 类风湿关节炎",
    "modality": "DR",
    "bodyPart": "骨肌",
    "level": "U2",
    "icon": "fa-hand",
    "clinicalBrief": "患者，女，45岁，手足小关节红肿热痛，白细胞升高，红细胞沉降率加快。双手X线",
    "series": [
      {
        "key": "hands",
        "name": "双手X线",
        "en": "HANDS",
        "frames": 1,
        "images": [
          "/data/imaging-samples/SEU-011/SEU-011-1.jpeg"
        ]
      }
    ],
    "deidentify": {
      "name": "患*",
      "ageRange": "40–49 岁",
      "sex": "女",
      "dept": "风湿免疫科",
      "examNo": "****1011",
      "imageNo": "****2011",
      "inpatientNo": "****",
      "cardNo": "****",
      "examTime": "2026-03-15 09:30"
    },
    "capabilities": {
      "hasMeasurement": false,
      "hasPriorExam": false,
      "hasEnhancedPhase": false,
      "isTumor": false,
      "hasStagingInfo": false
    },
    "goldStandard": {
      "technique": "双手正位X线平片。",
      "findings": "双手诸骨骨质密度未见明显减低；双侧第2～3掌指关节、近端指间关节间隙对称性狭窄，部分关节面模糊、毛糙；未见明确骨质侵蚀、骨赘形成或关节脱位；腕关节及远端指间关节形态与间隙未见明确异常；软组织未见钙化或肿胀征象。",
      "impression": "符合类风湿关节炎早期X线表现（以对称性小关节间隙狭窄、关节面模糊为主要征象），建议结合临床症状、血清类风湿因子及抗CCP抗体检测进一步确诊。"
    },
    "version": 1,
    "status": "published",
    "isSample": true,
    "sampleNote": "样例：源自院方素材《影像图片题》（东南大学医学院）· 金标准报告由 AI 依据题干与标准答案起草，待教研复核",
    "createdBy": "院方素材导入",
    "updatedBy": "院方素材导入",
    "createdAt": "2026-09-19 23:00",
    "updatedAt": "2026-09-19 23:00",
    "publishedAt": "2026-09-19 23:00"
  },
  {
    "id": "SEU-012",
    "title": "超声 · 先天性心脏病 · 房间隔缺损",
    "modality": "超声",
    "bodyPart": "其他",
    "level": "U1",
    "icon": "fa-heart-pulse",
    "clinicalBrief": "患儿男性，7岁，活动后心悸、乏力，发育情况好，胸骨左缘第2～3肋间可闻及收缩期杂音，肺动脉第二音亢进。超声心动图",
    "series": [
      {
        "key": "echo1",
        "name": "超声心动图（一）",
        "en": "ECHO1",
        "frames": 1,
        "images": [
          "/data/imaging-samples/SEU-012/SEU-012-1.jpeg"
        ]
      },
      {
        "key": "echo2",
        "name": "超声心动图（二）",
        "en": "ECHO2",
        "frames": 1,
        "images": [
          "/data/imaging-samples/SEU-012/SEU-012-2.jpeg"
        ]
      }
    ],
    "deidentify": {
      "name": "患*",
      "ageRange": "0–9 岁",
      "sex": "男",
      "dept": "心血管内科",
      "examNo": "****1012",
      "imageNo": "****2012",
      "inpatientNo": "****",
      "cardNo": "****",
      "examTime": "2026-03-15 09:30"
    },
    "capabilities": {
      "hasMeasurement": false,
      "hasPriorExam": false,
      "hasEnhancedPhase": false,
      "isTumor": false,
      "hasStagingInfo": false
    },
    "goldStandard": {
      "technique": "经胸超声心动图（TTE），包括胸骨旁长轴切面、心尖四腔心切面、剑下四腔心切面及大动脉短轴切面，应用二维、M型及彩色多普勒血流显像（CDFI）及频谱多普勒技术。",
      "findings": "房间隔中部（卵圆窝区域）可见一连续性中断，大小约8 mm，边缘清晰，断端回声增强；彩色多普勒显示左向右分流束自左心房经缺损口射入右心房，呈收缩期为主、舒张期持续的过隔血流信号；右心房、右心室腔内径轻度增大；肺动脉主干及分支内径正常；三尖瓣及肺动脉瓣未见反流；室间隔与左室后壁运动协调，左室收缩功能正常；未见明确肺静脉异位引流、房室瓣畸形或冠状动脉起源异常征象。",
      "impression": "先天性心脏病：继发孔型房间隔缺损（ASD），中等大小，左向右分流，伴右心系统轻度容量负荷增加；建议行心电图及胸部X线检查评估肺血增多及右心扩大程度，必要时行经食管超声心动图（TEE）进一步明确缺损边缘条件以评估介入封堵可行性。"
    },
    "version": 1,
    "status": "published",
    "isSample": true,
    "sampleNote": "样例：源自院方素材《影像图片题》（东南大学医学院）· 金标准报告由 AI 依据题干与标准答案起草，待教研复核",
    "createdBy": "院方素材导入",
    "updatedBy": "院方素材导入",
    "createdAt": "2026-09-19 23:00",
    "updatedAt": "2026-09-19 23:00",
    "publishedAt": "2026-09-19 23:00"
  },
  {
    "id": "SEU-013",
    "title": "超声 · 超声声像图表现（后方回声衰减）",
    "modality": "超声",
    "bodyPart": "腹部",
    "level": "U1",
    "icon": "fa-wave-square",
    "clinicalBrief": "患者男，56岁，近日感上腹不适来院就诊，行超声检查",
    "series": [
      {
        "key": "us",
        "name": "上腹部超声",
        "en": "US",
        "frames": 1,
        "images": [
          "/data/imaging-samples/SEU-013/SEU-013-1.png"
        ]
      }
    ],
    "deidentify": {
      "name": "患*",
      "ageRange": "50–59 岁",
      "sex": "男",
      "dept": "消化内科",
      "examNo": "****1013",
      "imageNo": "****2013",
      "inpatientNo": "****",
      "cardNo": "****",
      "examTime": "2026-03-15 09:30"
    },
    "capabilities": {
      "hasMeasurement": false,
      "hasPriorExam": false,
      "hasEnhancedPhase": false,
      "isTumor": false,
      "hasStagingInfo": false
    },
    "goldStandard": null,
    "version": 1,
    "status": "draft",
    "isSample": true,
    "sampleNote": "样例：源自院方素材《影像图片题》（东南大学医学院）· 金标准报告由 AI 依据题干与标准答案起草，待教研复核",
    "createdBy": "院方素材导入",
    "updatedBy": "院方素材导入",
    "createdAt": "2026-09-19 23:00",
    "updatedAt": "2026-09-19 23:00",
    "publishedAt": null
  }
]

/** 各例的评分要点集（AI 从金标准抽取，待教研校正） */
export const SEU_RUBRIC = {
  "SEU-001": {
    "FIND-01": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "明确指出病变位于右肺下叶后底段",
          "accept": [
            "右肺下叶后底段",
            "右肺下叶后基底段",
            "右肺下叶后部近膈面区域",
            "右肺下叶后底段紧贴膈面"
          ]
        }
      ]
    },
    "FIND-02": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "描述病变为团块状阴影",
          "accept": [
            "团块状阴影",
            "团块样病灶",
            "类圆形软组织密度影",
            "实性团块"
          ]
        }
      ]
    },
    "FIND-03": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "指出病灶边界较清晰",
          "accept": [
            "边界较清晰",
            "边界清楚",
            "边缘光整",
            "轮廓清晰"
          ]
        }
      ]
    },
    "FIND-04": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "描述病灶长轴指向内后方",
          "accept": [
            "长轴指向内后方",
            "纵轴呈内后走向",
            "走向朝向脊柱侧及后方",
            "长轴呈内后向"
          ]
        }
      ]
    },
    "FIND-05": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "提及CT增强可见体循环供血动脉",
          "accept": [
            "CT增强可见体循环供血动脉",
            "增强扫描显示体循环来源供血动脉",
            "可见来自主动脉的供血动脉",
            "增强可见源自胸主动脉的供血血管"
          ]
        }
      ]
    },
    "FIND-06": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "提及病灶紧贴膈面",
          "accept": [
            "紧贴膈面",
            "邻近膈肌",
            "与膈肌关系密切",
            "位于膈上紧邻膈面"
          ]
        }
      ]
    },
    "FIND-07": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "报告中包含重要阴性征象（如无坏死、空洞、钙化、支气管充气征、淋巴结肿大等）",
          "accept": [
            "未见坏死、空洞及钙化",
            "未见空洞、坏死、钙化及支气管充气征",
            "未见明确坏死、空洞、钙化；无纵隔及肺门淋巴结肿大",
            "余肺实质、气道、纵隔未见明确异常"
          ]
        }
      ]
    },
    "IMP-01": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "诊断意见中明确定位：右肺下叶后底段",
          "accept": [
            "右肺下叶后底段",
            "右肺下叶后基底段",
            "右肺下叶后部近膈面",
            "病变位于右肺下叶后底段"
          ]
        }
      ]
    },
    "IMP-02": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "诊断意见中明确写出‘肺隔离症’诊断",
          "accept": [
            "肺隔离症",
            "考虑肺隔离症",
            "符合肺隔离症",
            "诊断为肺隔离症"
          ]
        }
      ]
    },
    "IMP-03": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "指出其为先天性肺发育异常（或类似本质表述）",
          "accept": [
            "先天性肺发育异常",
            "先天性肺血管发育畸形",
            "胚胎期肺发育异常所致",
            "先天性肺血管畸形"
          ]
        }
      ]
    },
    "IMP-04": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "列出至少1项支持诊断的关键影像依据（部位/形态/供血动脉）",
          "accept": [
            "紧贴膈面且长轴内后向提示与胸主动脉关联",
            "典型部位+体循环供血动脉",
            "边界清+内后向长轴+增强见体循环供血",
            "右肺下叶后底段团块+增强见主动脉来源供血动脉"
          ]
        }
      ]
    },
    "IMP-05": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "提及分型信息（如叶内型/叶外型）或说明‘分两型’",
          "accept": [
            "分两型",
            "分为叶内型与叶外型",
            "存在叶内型和叶外型两种类型",
            "临床分为两型"
          ]
        }
      ]
    },
    "IMP-06": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "指出绝大多数血供来自主动脉",
          "accept": [
            "绝大多数血供来自主动脉",
            "主要血供源于胸主动脉",
            "供血动脉多起源于主动脉",
            "体循环供血，多源自主动脉"
          ]
        }
      ]
    },
    "IMP-07": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "提出进一步检查建议：主动脉造影",
          "accept": [
            "建议行主动脉造影",
            "推荐主动脉造影以明确供血动脉",
            "可行主动脉造影确诊",
            "主动脉造影有助确诊"
          ]
        }
      ]
    },
    "IMP-08": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "建议内容与题目附带要点一致（即针对确诊目的）",
          "accept": [
            "以明确供血动脉起源与走行",
            "以明确诊断",
            "以确诊肺隔离症",
            "以评估体循环供血情况"
          ]
        }
      ]
    }
  },
  "SEU-002": {
    "FIND-01": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "明确指出病变位于右上肺门区（或右肺门/右上肺中央）",
          "accept": [
            "右上肺门区",
            "右肺门",
            "右上肺中央",
            "右上肺中央区域"
          ]
        }
      ]
    },
    "FIND-02": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "描述为软组织密度肿块影（或实质性肿块/高密度团块）",
          "accept": [
            "软组织密度肿块影",
            "实质性肿块",
            "高密度团块影",
            "软组织密度影"
          ]
        }
      ]
    },
    "FIND-03": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "指出肿块边界不清（或欠清/模糊/不锐利）",
          "accept": [
            "边界不清",
            "边界欠清",
            "边界模糊",
            "边界不锐利"
          ]
        }
      ]
    },
    "FIND-04": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "指出肿块形态不规则（或分叶状/不规则轮廓）",
          "accept": [
            "形态不规则",
            "不规则轮廓",
            "分叶状",
            "轮廓不规则"
          ]
        }
      ]
    },
    "FIND-05": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "指出密度不均（或密度欠均/内见低密度区）",
          "accept": [
            "密度不均",
            "密度欠均",
            "密度不均匀",
            "内见低密度区"
          ]
        }
      ]
    },
    "FIND-06": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "提及支气管截断征（或支气管中断/充盈缺损/管腔闭塞）",
          "accept": [
            "支气管截断征",
            "支气管中断",
            "支气管充盈缺损",
            "支气管管腔闭塞"
          ]
        }
      ]
    },
    "FIND-07": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "提及肺纹理聚拢/减少（或肺门结构牵拉/肺纹理向肺门聚拢）",
          "accept": [
            "肺纹理聚拢",
            "肺纹理减少",
            "肺纹理向肺门聚拢",
            "肺门结构牵拉"
          ]
        }
      ]
    },
    "IMP-01": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "明确定位为右上肺（或右肺上叶/右上肺中央/右肺门）",
          "accept": [
            "右上肺",
            "右肺上叶",
            "右上肺中央",
            "右肺门"
          ]
        }
      ]
    },
    "IMP-02": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "定性倾向为肺癌（或恶性肿瘤/支气管源性癌/中央型恶性肿瘤）",
          "accept": [
            "肺癌",
            "恶性肿瘤",
            "支气管源性癌",
            "中央型恶性肿瘤"
          ]
        }
      ]
    },
    "IMP-03": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "诊断依据包含影像学表现（如肿块+截断+聚拢）",
          "accept": [
            "肿块伴支气管截断及肺纹理聚拢",
            "不规则肿块合并支气管截断征",
            "中央型肿块伴肺门结构异常",
            "肺门肿块合并支气管中断和肺纹理改变"
          ]
        }
      ]
    },
    "IMP-04": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "指出患者年龄与症状（70岁男性、咳嗽痰中带血3个月）",
          "accept": [
            "70岁男性伴咳嗽痰中带血3个月",
            "老年男性、痰中带血3个月",
            "70岁、咳嗽伴痰中带血3月",
            "老年、咯血样痰3个月"
          ]
        }
      ]
    },
    "IMP-05": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "建议进一步行胸部CT扫描",
          "accept": [
            "胸部CT扫描",
            "高分辨CT检查",
            "薄层CT扫描",
            "胸部增强CT"
          ]
        }
      ]
    },
    "IMP-06": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "建议行纤维支气管镜检查",
          "accept": [
            "纤维支气管镜检查",
            "纤支镜检查",
            "支气管镜检查",
            "气管镜活检"
          ]
        }
      ]
    },
    "IMP-07": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "强调纤支镜用于明确诊断（或病理确诊/获取组织学证据）",
          "accept": [
            "明确诊断",
            "病理确诊",
            "获取组织学证据",
            "确诊需活检"
          ]
        }
      ]
    },
    "IMP-08": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "指出CT用于评估范围、淋巴结及转移（或分期评估）",
          "accept": [
            "评估肿块范围及纵隔淋巴结",
            "评估分期",
            "评估有无远处转移",
            "用于临床分期"
          ]
        }
      ]
    }
  },
  "SEU-003": {
    "FIND-01": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "明确指出病变位于左侧鼓室及乳突区",
          "accept": [
            "左侧鼓室及乳突区",
            "左侧鼓室和乳突气房",
            "左侧中耳及乳突",
            "左侧中耳-乳突区域"
          ]
        }
      ]
    },
    "FIND-02": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "描述为软组织密度影（CT）",
          "accept": [
            "软组织密度影",
            "软组织密度病变",
            "软组织密度改变",
            "软组织密度占位"
          ]
        }
      ]
    },
    "FIND-03": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "指出骨质破坏部位至少包含乙状窦沟骨板",
          "accept": [
            "乙状窦沟骨板破坏",
            "左侧乙状窦沟骨质破坏",
            "乙状窦沟骨板受累",
            "乙状窦沟骨质缺损"
          ]
        }
      ]
    },
    "FIND-04": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "指出骨质破坏部位至少包含骨迷路",
          "accept": [
            "骨迷路破坏",
            "骨迷路骨质破坏",
            "内耳骨壁破坏",
            "骨性迷路受累"
          ]
        }
      ]
    },
    "FIND-05": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "指出骨质破坏部位至少包含面神经管",
          "accept": [
            "面神经管破坏",
            "面神经管骨质中断",
            "面神经管受累",
            "面神经管骨壁破坏"
          ]
        }
      ]
    },
    "FIND-06": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "指出骨质破坏部位至少包含中颅窝底",
          "accept": [
            "中颅窝底骨质破坏",
            "中颅窝底骨板破坏",
            "中颅窝底受累",
            "中颅窝底骨质缺损"
          ]
        }
      ]
    },
    "FIND-07": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "指出骨质破坏部位至少包含骨性外耳道骨质",
          "accept": [
            "骨性外耳道骨质破坏",
            "骨性外耳道壁破坏",
            "外耳道骨壁受累",
            "骨性外耳道骨板破坏"
          ]
        }
      ]
    },
    "IMP-01": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "明确诊断‘左颞骨胆脂瘤’",
          "accept": [
            "左颞骨胆脂瘤",
            "左侧颞骨胆脂瘤",
            "左侧中耳-乳突胆脂瘤",
            "左侧胆脂瘤（颞骨）"
          ]
        }
      ]
    },
    "IMP-02": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "明确提及‘继发颅内感染’",
          "accept": [
            "继发颅内感染",
            "合并颅内感染",
            "并发颅内感染",
            "继发性颅内感染"
          ]
        }
      ]
    },
    "IMP-03": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "明确诊断‘左侧小脑半球脑脓肿’",
          "accept": [
            "左侧小脑半球脑脓肿",
            "左侧小脑脓肿",
            "小脑左叶脓肿",
            "左侧小脑脓肿（脑实质内）"
          ]
        }
      ]
    },
    "IMP-04": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "明确诊断‘左侧脑膜炎’",
          "accept": [
            "左侧脑膜炎",
            "左侧硬脑膜炎",
            "左侧脑膜强化（提示脑膜炎）",
            "左侧脑膜炎（影像学表现）"
          ]
        }
      ]
    },
    "IMP-05": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "指出胆脂瘤具有侵袭性骨质破坏特征",
          "accept": [
            "具侵袭性骨质破坏",
            "侵袭性骨质破坏特征",
            "可导致多部位骨质破坏",
            "骨质破坏广泛"
          ]
        }
      ]
    },
    "IMP-06": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "指出脑脓肿MRI表现为环形强化+中心坏死+弥散受限",
          "accept": [
            "环形强化伴中心坏死及弥散受限",
            "环形强化、DWI高信号、ADC低信号",
            "典型脓肿三联征（环形强化、坏死、弥散受限）",
            "环形强化+中心低密度/信号+周围水肿"
          ]
        }
      ]
    },
    "IMP-07": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "指出脑膜炎MRI表现为线状/条状强化",
          "accept": [
            "脑膜线状强化",
            "线状或条状脑膜强化",
            "硬脑膜线样强化",
            "脑膜强化（线状）"
          ]
        }
      ]
    },
    "IMP-08": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "提出临床建议：神经外科会诊及手术干预（如乳突根治+脓肿引流）",
          "accept": [
            "神经外科会诊并手术治疗",
            "急诊神经外科评估及手术清除",
            "行乳突根治术联合脓肿引流",
            "手术干预清除病灶"
          ]
        }
      ]
    }
  },
  "SEU-004": {
    "FIND-01": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "明确指出检查技术为上腹部MRI（含平扫、增强及MRCP）",
          "accept": [
            "上腹部MRI平扫+增强+MRCP",
            "上腹部MRI包括平扫、动态增强及MRCP序列",
            "MRI上腹部检查含增强及MRCP",
            "上腹部MRI检查，包含增强扫描和MRCP"
          ]
        }
      ]
    },
    "FIND-02": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "准确描述病灶位于肝门区",
          "accept": [
            "肝门区",
            "肝门部",
            "肝门区域",
            "肝门胆管走行区"
          ]
        }
      ]
    },
    "FIND-03": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "描述病灶形态为结节状或肿块状",
          "accept": [
            "结节状",
            "肿块状",
            "结节或肿块",
            "局灶性软组织肿块"
          ]
        }
      ]
    },
    "FIND-04": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "描述肝内胆管扩张且左右肝管未汇合",
          "accept": [
            "左右肝管扩张但未汇合",
            "肝内胆管扩张，左右肝管呈分离征",
            "左右肝管各自扩张、不汇合",
            "MRCP示左右肝管扩张、分叉部截断"
          ]
        }
      ]
    },
    "FIND-05": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "描述胆囊未增大（即胆囊大小正常）",
          "accept": [
            "胆囊不增大",
            "胆囊大小正常",
            "胆囊未见代偿性增大",
            "胆囊体积未增加"
          ]
        }
      ]
    },
    "FIND-06": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "描述胆总管无扩张",
          "accept": [
            "胆总管无扩张",
            "胆总管未见增宽",
            "胆总管直径正常",
            "胆总管未见明显扩张"
          ]
        }
      ]
    },
    "FIND-07": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "描述增强扫描静脉期强化高于动脉期",
          "accept": [
            "静脉期强化高于动脉期",
            "延迟期/静脉期强化较动脉期更明显",
            "病灶呈静脉期强化为主",
            "增强后静脉期强化程度高于动脉期"
          ]
        }
      ]
    },
    "IMP-01": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "明确定位为肝门区（或肝门部）",
          "accept": [
            "肝门区",
            "肝门部",
            "肝门胆管区域",
            "肝门胆管走行区"
          ]
        }
      ]
    },
    "IMP-02": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "定性倾向为恶性肿瘤",
          "accept": [
            "恶性肿瘤",
            "恶性病变",
            "考虑恶性",
            "高度提示恶性"
          ]
        }
      ]
    },
    "IMP-03": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "明确指出病变为胆管来源（胆管癌）",
          "accept": [
            "胆管癌",
            "肝门部胆管癌",
            "胆管细胞癌",
            "起源于胆管的恶性肿瘤"
          ]
        }
      ]
    },
    "IMP-04": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "列出至少两项支持诊断的关键影像依据",
          "accept": [
            "肝门区肿块+左右肝管不汇合",
            "肝内胆管扩张+胆囊不增大+胆总管无扩张",
            "静脉期强化高于动脉期+左右肝管未汇合",
            "肝门区占位+MRCP示左右肝管分离"
          ]
        }
      ]
    },
    "IMP-05": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "提出进一步检查建议为获取病理（如ERCP/PTC）",
          "accept": [
            "建议ERCP或PTC获取组织病理",
            "推荐行ERCP或PTC活检",
            "可行ERCP或PTC以明确病理诊断",
            "建议内镜或经皮途径胆管造影及活检"
          ]
        }
      ]
    },
    "IMP-06": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "提出进一步检查建议为肿瘤标志物检测（如CA19-9）",
          "accept": [
            "建议检测CA19-9",
            "推荐血清CA19-9检查",
            "可行CA19-9等肿瘤标志物筛查",
            "建议完善胆道肿瘤相关血清学指标"
          ]
        }
      ]
    },
    "IMP-07": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "指出该病变导致肝内胆管梗阻",
          "accept": [
            "肝内胆管梗阻性扩张",
            "梗阻性黄疸相关胆管改变",
            "胆道梗阻位于肝门部",
            "肝内胆管因肝门部占位而继发扩张"
          ]
        }
      ]
    },
    "IMP-08": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "强调鉴别诊断中需排除其他肝门区病变（如淋巴结转移、肝癌侵犯）",
          "accept": [
            "需与转移性淋巴结、肝细胞癌肝门侵犯鉴别",
            "应与肝门部淋巴结肿大、HCC肝门浸润相鉴别",
            "需除外肝门淋巴结转移及原发性肝癌肝门蔓延",
            "鉴别包括肝门淋巴结肿大、胆囊癌浸润等"
          ]
        }
      ]
    }
  },
  "SEU-005": {
    "FIND-01": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "明确指出检查方法为胸部CT平扫",
          "accept": [
            "胸部CT平扫",
            "CT平扫（胸部）",
            "胸部平扫CT"
          ]
        }
      ]
    },
    "FIND-02": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "准确描述病变部位为右肺上叶",
          "accept": [
            "右肺上叶",
            "右侧肺上叶",
            "右上肺"
          ]
        }
      ]
    },
    "FIND-03": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "描述病变为单发结节",
          "accept": [
            "单发结节",
            "一个结节",
            "孤立性结节"
          ]
        }
      ]
    },
    "FIND-04": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "提及结节大小（含近似数值或范围）",
          "accept": [
            "直径约2.5 cm",
            "大小约2–3 cm",
            "约2 cm以上",
            "2 cm余"
          ]
        }
      ]
    },
    "FIND-05": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "描述结节边缘模糊或不清",
          "accept": [
            "边缘模糊",
            "边界不清",
            "轮廓欠清",
            "边缘不锐利"
          ]
        }
      ]
    },
    "FIND-06": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "描述晕征（结节周围磨玻璃样渗出影）",
          "accept": [
            "晕征",
            "结节周围磨玻璃影",
            "周围淡薄渗出影",
            "周围磨玻璃样改变"
          ]
        }
      ]
    },
    "FIND-07": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "提及重要阴性征象：无空洞、无钙化、无液平、无树芽征、无支气管充气征等",
          "accept": [
            "未见空洞",
            "未见钙化",
            "未见液平",
            "未见树芽征"
          ]
        }
      ]
    },
    "IMP-01": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "定位明确：右肺上叶病变",
          "accept": [
            "右肺上叶",
            "右侧肺上叶",
            "右上肺"
          ]
        }
      ]
    },
    "IMP-02": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "定性倾向为肺曲菌病（或侵袭性肺曲菌病）",
          "accept": [
            "肺曲菌病",
            "侵袭性肺曲菌病",
            "曲霉菌感染",
            "曲霉菌性肺炎"
          ]
        }
      ]
    },
    "IMP-03": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "诊断依据包含影像特征（晕征、单发结节、边缘模糊）",
          "accept": [
            "晕征",
            "结节伴晕征",
            "边缘模糊结节伴磨玻璃影",
            "典型晕征表现"
          ]
        }
      ]
    },
    "IMP-04": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "诊断依据包含高危背景（老年、糖尿病）",
          "accept": [
            "老年+糖尿病",
            "长期糖尿病史",
            "78岁+糖尿病17年",
            "免疫轻度受损基础"
          ]
        }
      ]
    },
    "IMP-05": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "诊断依据包含临床病程（低热、胸痛、咳嗽2月余，抗炎无效）",
          "accept": [
            "抗炎治疗无效",
            "常规抗炎效果不佳",
            "病程迁延伴症状持续",
            "2个月余症状不缓解"
          ]
        }
      ]
    },
    "IMP-06": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "建议进一步检查为痰检（真菌涂片/培养）",
          "accept": [
            "痰检",
            "痰真菌检查",
            "痰培养（含曲霉）",
            "痰涂片+培养"
          ]
        }
      ]
    },
    "IMP-07": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "建议补充血清GM试验",
          "accept": [
            "GM试验",
            "血清半乳甘露聚糖检测",
            "GM检测",
            "半乳甘露聚糖试验"
          ]
        }
      ]
    },
    "IMP-08": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "建议必要时行支气管肺泡灌洗液检测",
          "accept": [
            "BALF检测",
            "支气管肺泡灌洗液检查",
            "BALF真菌检测",
            "支气管肺泡灌洗液培养"
          ]
        }
      ]
    }
  },
  "SEU-006": {
    "FIND-01": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "明确指出检查方法为腹部超声。",
          "accept": [
            "腹部超声",
            "超声检查",
            "超声",
            "腹部B超"
          ]
        }
      ]
    },
    "FIND-02": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "准确描述病灶位于腹主动脉左侧及前方。",
          "accept": [
            "腹主动脉左侧及前方",
            "腹主动脉左前方",
            "腹主动脉左前侧",
            "腹主动脉左侧和前方"
          ]
        }
      ]
    },
    "FIND-03": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "准确给出病灶上下范围：自肾动脉水平至腹主动脉分叉上方。",
          "accept": [
            "肾动脉水平至腹主动脉分叉上方",
            "自肾动脉至腹主动脉分叉上",
            "肾动脉平面至腹主动脉分叉上缘",
            "从肾动脉水平到腹主动脉分叉上方"
          ]
        }
      ]
    },
    "FIND-04": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "准确记录病灶三维大小：14.2cm×10.0cm×5.8cm。",
          "accept": [
            "14.2cm×10.0cm×5.8cm",
            "14.2 × 10.0 × 5.8 cm",
            "长14.2cm、宽10.0cm、厚5.8cm",
            "最大径14.2cm，横截面约10.0cm×5.8cm"
          ]
        }
      ]
    },
    "FIND-05": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "描述回声特征为低回声。",
          "accept": [
            "低回声",
            "呈低回声",
            "回声减低",
            "回声低于周围脂肪组织"
          ]
        }
      ]
    },
    "FIND-06": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "描述前缘边界清晰，后缘边界不清。",
          "accept": [
            "前缘清、后缘不清",
            "前缘边界清晰，后缘边界模糊",
            "前缘清楚，后缘欠清",
            "前缘清晰，后缘显示不清"
          ]
        }
      ]
    },
    "FIND-07": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "指出肿物与左肾分界不清，并伴左侧肾盂肾盏扩张（肾盂宽1.3cm）。",
          "accept": [
            "与左肾分界不清，左侧肾盂肾盏扩张",
            "左肾界限不清，左侧肾盂增宽1.3cm",
            "左肾分界不清，左侧肾盂宽1.3cm",
            "左肾关系不清，左侧肾盂扩张（1.3cm）"
          ]
        }
      ]
    },
    "IMP-01": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "定位准确：腹膜后（具体为腹主动脉左侧及前方）。",
          "accept": [
            "腹膜后",
            "腹膜后间隙",
            "腹主动脉旁腹膜后区",
            "腹膜后腹主动脉左前方"
          ]
        }
      ]
    },
    "IMP-02": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "定性倾向为特发性腹膜后纤维化。",
          "accept": [
            "特发性腹膜后纤维化",
            "IPF",
            "腹膜后纤维化（特发性）",
            "idiopathic retroperitoneal fibrosis"
          ]
        }
      ]
    },
    "IMP-03": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "诊断依据包含影像特征（腹膜后低回声肿块、包绕腹主动脉、肾盂扩张）与临床/实验室支持（ESR↑、多克隆γ球蛋白升高、自身免疫抗体阴性）。",
          "accept": [
            "影像+ESR↑+γ球蛋白升高+自身抗体阴性",
            "低回声腹膜后肿块+肾盂扩张+炎症指标升高+非特异性免疫指标异常",
            "腹膜后肿块伴尿路梗阻+慢性炎症表现+排除其他病因",
            "影像表现符合IPF，结合实验室排除感染、肿瘤、自身免疫病"
          ]
        }
      ]
    },
    "IMP-04": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "指出该病可致输尿管受压引起肾盂肾盏扩张。",
          "accept": [
            "输尿管受压导致肾盂扩张",
            "腹膜后纤维化压迫输尿管",
            "继发性上尿路梗阻",
            "尿路梗阻性改变"
          ]
        }
      ]
    },
    "IMP-05": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "强调需排除恶性肿瘤、感染、其他系统性炎症疾病。",
          "accept": [
            "需排除肿瘤、感染、系统性炎症",
            "鉴别诊断包括淋巴瘤、转移瘤、结核、IgG4相关性疾病",
            "应除外恶性及感染性病变",
            "需与腹膜后肿瘤、感染性肉芽肿鉴别"
          ]
        }
      ]
    },
    "IMP-06": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "建议进一步行增强CT或MRI评估。",
          "accept": [
            "增强CT",
            "MRI",
            "增强CT/MRI",
            "腹部增强影像检查"
          ]
        }
      ]
    },
    "IMP-07": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "建议评估病变对腹主动脉、下腔静脉、输尿管等结构的包绕或压迫情况。",
          "accept": [
            "评估血管包绕",
            "观察腹主动脉/输尿管受累",
            "明确是否包绕大血管及输尿管",
            "评估解剖关系及压迫程度"
          ]
        }
      ]
    },
    "IMP-08": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "建议随访治疗反应（如泼尼松治疗后症状及ESR、γ球蛋白变化）。",
          "accept": [
            "监测治疗反应",
            "随访ESR及γ球蛋白",
            "评估激素疗效",
            "动态观察炎症指标及临床症状"
          ]
        }
      ]
    }
  },
  "SEU-007": {
    "FIND-01": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "明确指出病灶位于小脑半球",
          "accept": [
            "小脑半球",
            "小脑",
            "后颅窝小脑部位",
            "小脑实质内"
          ]
        }
      ]
    },
    "FIND-02": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "描述为囊实性肿块/病变/占位",
          "accept": [
            "囊实性肿块",
            "囊实性病变",
            "囊实性占位",
            "囊性为主伴壁结节"
          ]
        }
      ]
    },
    "FIND-03": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "指出囊性部分T1WI呈低信号或长T1信号",
          "accept": [
            "长T1信号",
            "T1低信号",
            "低信号囊性成分",
            "囊液呈T1低信号"
          ]
        }
      ]
    },
    "FIND-04": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "指出囊性部分T2WI呈高信号或长T2信号",
          "accept": [
            "长T2信号",
            "T2高信号",
            "高信号囊性成分",
            "囊液呈T2高信号"
          ]
        }
      ]
    },
    "FIND-05": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "指出实性成分（壁结节）在T1WI呈等或稍低信号",
          "accept": [
            "T1等或稍低信号",
            "等/稍低信号实性成分",
            "壁结节T1呈等信号",
            "实性部分T1信号与灰质相近"
          ]
        }
      ]
    },
    "FIND-06": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "指出实性成分（壁结节）在T2WI呈稍高信号",
          "accept": [
            "T2稍高信号",
            "稍高信号实性成分",
            "壁结节T2呈稍高信号",
            "实性部分T2信号略高于白质"
          ]
        }
      ]
    },
    "FIND-07": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "指出增强后囊壁无强化，壁结节明显均匀强化",
          "accept": [
            "囊壁无强化、壁结节明显强化",
            "囊壁不强化，实性结节显著均匀强化",
            "无囊壁强化，强化局限于壁结节",
            "强化仅见于壁结节，囊壁未见强化"
          ]
        }
      ]
    },
    "IMP-01": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "定位准确：小脑半球",
          "accept": [
            "小脑半球",
            "小脑",
            "后颅窝小脑",
            "小脑实质"
          ]
        }
      ]
    },
    "IMP-02": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "定性倾向明确：血管母细胞瘤",
          "accept": [
            "血管母细胞瘤",
            "考虑血管母细胞瘤",
            "符合血管母细胞瘤",
            "倾向于血管母细胞瘤"
          ]
        }
      ]
    },
    "IMP-03": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "诊断依据包含‘囊实性+壁结节明显强化’核心征象",
          "accept": [
            "囊实性伴壁结节明显强化",
            "囊性病变合并显著强化壁结节",
            "典型囊实性结构及强化壁结节",
            "囊壁无强化而壁结节显著强化"
          ]
        }
      ]
    },
    "IMP-04": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "提及无周围水肿或水肿轻微",
          "accept": [
            "未见明显水肿",
            "周围水肿不明显",
            "无显著周围水肿",
            "病灶周围未见水肿"
          ]
        }
      ]
    },
    "IMP-05": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "提及第四脑室受压变形",
          "accept": [
            "第四脑室受压变形",
            "四脑室受压",
            "第四脑室形态异常",
            "四脑室被推移变形"
          ]
        }
      ]
    },
    "IMP-06": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "建议结合临床（如头晕症状相关性分析）",
          "accept": [
            "结合临床",
            "结合患者头晕病史",
            "联系临床症状",
            "需结合临床表现"
          ]
        }
      ]
    },
    "IMP-07": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "建议进一步检查：基因检测（如VHL综合征筛查）",
          "accept": [
            "建议VHL基因检测",
            "可行VHL综合征相关筛查",
            "建议遗传学评估",
            "可考虑VHL综合征排查"
          ]
        }
      ]
    },
    "IMP-08": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "建议随访复查",
          "accept": [
            "建议随访复查",
            "建议定期MRI复查",
            "可行影像随访",
            "推荐随访观察"
          ]
        }
      ]
    }
  },
  "SEU-008": {
    "FIND-01": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "明确指出检查为颅脑MRI，包含T1WI、T2WI、FLAIR及DWI序列。",
          "accept": [
            "颅脑MRI平扫（T1WI、T2WI、FLAIR）及DWI",
            "头颅MRI（含T1、T2、FLAIR和弥散加权成像）",
            "MRI检查包括常规序列及DWI",
            "颅脑MRI含T1WI/T2WI/FLAIR/DWI"
          ]
        }
      ]
    },
    "FIND-02": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "准确描述病灶位于左侧额顶叶皮质及皮质下区。",
          "accept": [
            "左侧额顶叶皮质及皮质下区",
            "左侧额叶与顶叶交界区皮质及皮质下",
            "左侧大脑半球额顶叶交界部皮层及白质",
            "左侧额顶叶皮质下白质区"
          ]
        }
      ]
    },
    "FIND-03": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "描述病灶数目为单发。",
          "accept": [
            "单发病灶",
            "一处病灶",
            "单一异常信号区",
            "病灶为单发"
          ]
        }
      ]
    },
    "FIND-04": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "给出病灶大致大小（如‘约3.2 cm × 2.5 cm’或‘最大径约3 cm’等合理数值范围）。",
          "accept": [
            "约3.2 cm × 2.5 cm",
            "最大径约3 cm",
            "范围约3 cm × 2.5 cm",
            "大小约3 cm左右"
          ]
        }
      ]
    },
    "FIND-05": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "描述形态不规则，边界欠清。",
          "accept": [
            "形态不规则，边界欠清",
            "轮廓不整，边缘模糊",
            "形状不规则，界限不清",
            "形态欠规则，边界不清"
          ]
        }
      ]
    },
    "FIND-06": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "准确描述信号特征：T1WI稍低信号、T2WI及FLAIR高信号、DWI明显高信号、ADC低信号。",
          "accept": [
            "T1低、T2高、FLAIR高、DWI高、ADC低",
            "T1WI呈稍低信号，T2WI/FLAIR高信号，DWI高信号伴ADC图低信号",
            "DWI高信号且ADC图呈低信号，符合急性期缺血改变",
            "弥散受限表现：DWI高信号+ADC低信号"
          ]
        }
      ]
    },
    "FIND-07": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "提及重要阴性征象：未见出血、占位效应、强化；其余脑实质及结构未见明确异常。",
          "accept": [
            "未见出血、占位效应或强化",
            "无出血征象，无明显占位效应",
            "未见新发出血、肿瘤或炎性病变征象",
            "余脑实质、脑室、脑池未见明确异常"
          ]
        }
      ]
    },
    "IMP-01": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "明确定位：左侧额顶叶（或左侧大脑半球）。",
          "accept": [
            "左侧额顶叶",
            "左侧大脑半球额顶叶区",
            "左侧大脑中动脉供血区",
            "左侧皮质及皮质下区"
          ]
        }
      ]
    },
    "IMP-02": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "明确定性：急性期脑梗死。",
          "accept": [
            "急性期脑梗死",
            "急性脑梗死",
            "新发脑梗死",
            "符合急性缺血性卒中影像表现"
          ]
        }
      ]
    },
    "IMP-03": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "诊断依据包含典型临床表现（右侧肢体活动不灵、伸舌右偏、病理征阳性）与影像DWI/ADC特征。",
          "accept": [
            "临床表现与DWI高信号+ADC低信号相符",
            "右侧中枢性面舌瘫及偏瘫表现支持左侧急性梗死",
            "神经功能缺损定位与影像病灶侧别一致",
            "症状体征与影像病灶解剖位置及弥散受限表现一致"
          ]
        }
      ]
    },
    "IMP-04": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "排除其他主要鉴别诊断（如出血、肿瘤、炎症）。",
          "accept": [
            "未见出血、肿瘤或炎性征象",
            "可除外脑出血、原发肿瘤及感染性病变",
            "无出血、占位或强化，不支持肿瘤或炎性病变",
            "影像无强化、无出血、无水肿占位效应，倾向缺血性病变"
          ]
        }
      ]
    },
    "IMP-05": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "提出进一步血管评估建议（如头颈CTA/MRA）。",
          "accept": [
            "建议行头颈CTA或MRA",
            "完善脑血管成像评估血管狭窄或闭塞",
            "推荐MRA或CTA检查",
            "建议血管评估以明确病因"
          ]
        }
      ]
    },
    "IMP-06": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "提出基础管理建议（如血压、血糖、血脂监测）。",
          "accept": [
            "监测并控制血压、血糖及血脂",
            "启动危险因素管理",
            "调控卒中危险因素",
            "加强血压、血糖、血脂综合管理"
          ]
        }
      ]
    },
    "IMP-07": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "明确提出二级预防建议。",
          "accept": [
            "启动二级预防",
            "建议卒中二级预防措施",
            "应予二级预防治疗",
            "需采取二级预防策略"
          ]
        }
      ]
    },
    "IMP-08": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "诊断结论表述为‘脑梗死’或‘急性脑梗死’，未添加非题干支持的修饰词（如‘腔隙性’‘分水岭’‘栓塞性’等）。",
          "accept": [
            "脑梗死",
            "急性脑梗死",
            "急性期脑梗死",
            "左侧额顶叶脑梗死"
          ]
        }
      ]
    }
  },
  "SEU-009": {
    "FIND-01": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "明确指出骨化影位于膝关节周围软组织内（而非骨内、关节腔或骨膜下）。",
          "accept": [
            "膝关节周围软组织内",
            "关节旁软组织内",
            "胫骨近端/股骨远端软组织内",
            "非骨性结构内"
          ]
        }
      ]
    },
    "FIND-02": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "描述骨化影分布范围涉及胫骨近端和/或股骨远端软组织区。",
          "accept": [
            "胫骨近端软组织",
            "股骨远端软组织",
            "胫骨近端及股骨远端软组织",
            "膝关节前外侧及内侧软组织"
          ]
        }
      ]
    },
    "FIND-03": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "指出骨化影数目为单发或多发团块状（未强调确切数量者视为可接受）。",
          "accept": [
            "团块状",
            "多灶性团块",
            "不规则团块影",
            "局限性骨化灶"
          ]
        }
      ]
    },
    "FIND-04": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "描述骨化影边界较清晰（非浸润性、毛刺状或模糊不清）。",
          "accept": [
            "边界较清晰",
            "边界清楚",
            "轮廓较明确",
            "与周围软组织分界尚清"
          ]
        }
      ]
    },
    "FIND-05": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "指出骨化影密度不均，含成熟骨小梁与未成熟骨基质混合表现。",
          "accept": [
            "密度不均伴骨小梁结构",
            "成熟与未成熟骨成分混杂",
            "磨玻璃样与骨小梁并存",
            "骨化程度不一"
          ]
        }
      ]
    },
    "FIND-06": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "明确提及关节间隙未受累（即未见狭窄、消失或骨性融合）。",
          "accept": [
            "关节间隙宽度正常",
            "未累及关节间隙",
            "关节面光整、间隙存在",
            "无关节间隙破坏"
          ]
        }
      ]
    },
    "FIND-07": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "报告中包含至少一项重要阴性征象：无骨质破坏、无关节内游离体、无病理性骨折。",
          "accept": [
            "未见骨质破坏",
            "无关节内游离体",
            "无病理性骨折",
            "未见溶骨性病变"
          ]
        }
      ]
    },
    "IMP-01": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "诊断意见明确定位为‘膝关节周围软组织’。",
          "accept": [
            "膝关节周围软组织",
            "关节旁软组织",
            "股胫骨近端软组织",
            "软组织内"
          ]
        }
      ]
    },
    "IMP-02": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "定性倾向明确指向‘骨化性肌炎’（不得仅写‘异位骨化’‘软组织钙化’等非特异性术语）。",
          "accept": [
            "骨化性肌炎",
            "创伤后骨化性肌炎",
            "异位骨化符合骨化性肌炎",
            "考虑骨化性肌炎"
          ]
        }
      ]
    },
    "IMP-03": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "诊断依据包含关键临床信息：17岁男性、骨折术后半年、活动受限。",
          "accept": [
            "青少年、术后半年、活动受限",
            "17岁、创伤后、关节活动障碍",
            "年轻患者、骨折术后病史、功能受限",
            "病史含年龄、创伤史、症状"
          ]
        }
      ]
    },
    "IMP-04": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "诊断依据包含核心影像特征：软组织内不规则骨化、成熟与未成熟骨共存、边界清、无关节侵犯。",
          "accept": [
            "软组织内骨化伴成熟/未成熟骨混合",
            "边界清的异位骨化、无关节受累",
            "骨化影密度不均、未侵及关节",
            "不规则软组织骨化、关节间隙完整"
          ]
        }
      ]
    },
    "IMP-05": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "提出针对本病的合理进一步检查建议（如MRI评估活性）。",
          "accept": [
            "建议MRI评估软组织活性",
            "可行MRI明确病变活性成分",
            "MRI有助于鉴别活动期与静止期",
            "影像随访或MRI检查"
          ]
        }
      ]
    },
    "IMP-06": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "给出避免激惹的临床处置提示（如不推荐活检）。",
          "accept": [
            "暂不推荐活检",
            "避免有创操作以防进展",
            "不宜穿刺或活检",
            "避免手术刺激"
          ]
        }
      ]
    },
    "IMP-07": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "强调病程相关性（如符合创伤后时间窗：术后数月）。",
          "accept": [
            "术后半年余符合病程",
            "病程处于骨化进展后期",
            "时间上符合骨化性肌炎演变规律",
            "创伤后数月期典型表现"
          ]
        }
      ]
    },
    "IMP-08": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "对临床管理给出方向性建议（如功能评估、保守观察、随访）。",
          "accept": [
            "建议结合症状及病程综合评估",
            "宜临床随访观察",
            "指导康复治疗前明确病变活性",
            "需结合功能障碍程度制定干预策略"
          ]
        }
      ]
    }
  },
  "SEU-010": {
    "FIND-01": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "明确指出受累部位为左足诸骨，包括距骨、跟骨、舟骨、跗骨及跖骨基底部。",
          "accept": [
            "左足诸骨",
            "左足跗骨及跖骨基底部",
            "左足中后足骨骼",
            "左足距下关节及跗跖关节区域"
          ]
        }
      ]
    },
    "FIND-02": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "描述骨质破坏呈广泛、多灶、碎裂状，伴游离骨碎片。",
          "accept": [
            "多发碎骨片",
            "骨碎片散在",
            "骨质碎裂伴游离骨块",
            "骨结构崩解、骨片分离"
          ]
        }
      ]
    },
    "FIND-03": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "描述关节间隙显著增宽。",
          "accept": [
            "关节间隙增宽",
            "关节间隙异常增宽",
            "关节间隙明显增宽",
            "关节间隙扩大"
          ]
        }
      ]
    },
    "FIND-04": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "描述关节面不规则、塌陷、半脱位或畸形。",
          "accept": [
            "关节面塌陷",
            "关节面不规则",
            "骨性关节面中断/消失",
            "半脱位或畸形"
          ]
        }
      ]
    },
    "FIND-05": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "描述骨皮质变薄、骨小梁稀疏等普遍性骨量减少表现。",
          "accept": [
            "骨质疏松",
            "骨皮质变薄",
            "骨小梁稀疏",
            "普遍性骨量减少"
          ]
        }
      ]
    },
    "FIND-06": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "明确提及未见骨膜反应。",
          "accept": [
            "未见骨膜反应",
            "无骨膜新生骨",
            "骨膜未见增生",
            "未见骨膜炎征象"
          ]
        }
      ]
    },
    "FIND-07": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "描述邻近软组织肿胀。",
          "accept": [
            "软组织肿胀",
            "周围软组织密度增高/肿胀",
            "软组织影增厚",
            "软组织肿胀明显"
          ]
        }
      ]
    },
    "IMP-01": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "诊断结论明确为Charcot关节或神经性关节病。",
          "accept": [
            "Charcot关节",
            "神经性关节病",
            "神经源性关节病",
            "神经病性关节病"
          ]
        }
      ]
    },
    "IMP-02": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "定位准确：左足（中后足）。",
          "accept": [
            "左足",
            "左足中后足",
            "左足跗骨及跖骨区域",
            "左足负重关节"
          ]
        }
      ]
    },
    "IMP-03": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "定性倾向为神经源性破坏，非感染、肿瘤或外伤所致。",
          "accept": [
            "神经源性破坏",
            "神经性病因",
            "非感染性非肿瘤性破坏",
            "无痛性神经源性关节破坏"
          ]
        }
      ]
    },
    "IMP-04": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "诊断依据包含典型影像三联征（碎骨、宽隙、畸形）。",
          "accept": [
            "碎骨+宽隙+畸形",
            "骨碎片、关节间隙增宽、关节畸形",
            "三联征",
            "典型Charcot影像表现"
          ]
        }
      ]
    },
    "IMP-05": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "关联临床病史：腰椎术后感觉障碍、隐痛、窦道史、无外伤史。",
          "accept": [
            "腰椎术后感觉减退史",
            "无痛性损伤病史",
            "隐痛与窦道史",
            "感觉障碍基础上的慢性关节损伤"
          ]
        }
      ]
    },
    "IMP-06": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "建议进一步检查腰椎MRI。",
          "accept": [
            "腰椎MRI",
            "脊柱MRI评估神经压迫",
            "腰椎影像学复查",
            "评估腰椎神经根受累"
          ]
        }
      ]
    },
    "IMP-07": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "建议筛查代谢性病因，如血糖及糖化血红蛋白。",
          "accept": [
            "血糖检测",
            "糖化血红蛋白",
            "糖尿病筛查",
            "代谢性神经病变评估"
          ]
        }
      ]
    },
    "IMP-08": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "强调临床管理意义：避免负重、矫形保护、多学科随访。",
          "accept": [
            "避免负重",
            "保护性支具",
            "多学科管理",
            "预防进一步关节破坏"
          ]
        }
      ]
    }
  },
  "SEU-011": {
    "FIND-01": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "明确指出检查部位为双手。",
          "accept": [
            "双手",
            "双侧手部",
            "手部双侧",
            "双手正位"
          ]
        }
      ]
    },
    "FIND-02": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "明确指出检查方法为X线平片（或DR）。",
          "accept": [
            "X线平片",
            "DR",
            "X线检查",
            "放射摄影"
          ]
        }
      ]
    },
    "FIND-03": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "描述受累关节部位：掌指关节和/或近端指间关节。",
          "accept": [
            "掌指关节及近端指间关节",
            "第2～3掌指关节与近端指间关节",
            "手小关节（MCP/PIP）",
            "MCP和PIP关节"
          ]
        }
      ]
    },
    "FIND-04": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "描述关节间隙改变：对称性狭窄。",
          "accept": [
            "对称性关节间隙狭窄",
            "双侧对称性间隙变窄",
            "关节间隙对称性变窄",
            "对称性变窄"
          ]
        }
      ]
    },
    "FIND-05": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "描述关节面改变：模糊、毛糙或不规则。",
          "accept": [
            "关节面模糊",
            "关节面毛糙",
            "关节面不规则",
            "关节面轮廓不清"
          ]
        }
      ]
    },
    "FIND-06": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "提及骨质侵蚀缺如（或未见明确骨质侵蚀）。",
          "accept": [
            "未见明确骨质侵蚀",
            "无骨质侵蚀征象",
            "未见骨侵蚀",
            "骨质侵蚀阴性"
          ]
        }
      ]
    },
    "FIND-07": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "提及远端指间关节及腕关节无明确异常（或未见受累）。",
          "accept": [
            "远端指间关节未见异常",
            "DIP关节未受累",
            "腕关节形态与间隙未见明确异常",
            "腕及DIP关节无病变征象"
          ]
        }
      ]
    },
    "IMP-01": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "定位准确：手部小关节（掌指、近端指间关节）。",
          "accept": [
            "手小关节",
            "MCP及PIP关节",
            "掌指与近端指间关节",
            "双手小关节"
          ]
        }
      ]
    },
    "IMP-02": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "定性倾向明确：类风湿关节炎。",
          "accept": [
            "类风湿关节炎",
            "RA",
            "符合类风湿关节炎",
            "考虑类风湿关节炎"
          ]
        }
      ]
    },
    "IMP-03": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "诊断依据包含对称性、小关节、间隙狭窄、关节面模糊等典型X线特征。",
          "accept": [
            "对称性小关节间隙狭窄及关节面模糊",
            "对称性MCP/PIP关节间隙变窄伴关节面毛糙",
            "典型RA早期X线征象",
            "符合RA影像学早期表现"
          ]
        }
      ]
    },
    "IMP-04": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "指出当前影像表现属早期阶段（未见骨侵蚀或畸形）。",
          "accept": [
            "早期表现",
            "符合早期类风湿关节炎",
            "尚未出现骨侵蚀",
            "RA早期X线征象"
          ]
        }
      ]
    },
    "IMP-05": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "建议结合类风湿因子（RF）检测。",
          "accept": [
            "建议查类风湿因子",
            "结合RF检测",
            "行RF检查",
            "检测RF"
          ]
        }
      ]
    },
    "IMP-06": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "建议结合抗环瓜氨酸肽抗体（抗CCP抗体）检测。",
          "accept": [
            "建议查抗CCP抗体",
            "结合抗CCP检测",
            "检测抗CCP抗体",
            "行抗CCP抗体检查"
          ]
        }
      ]
    },
    "IMP-07": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "建议结合临床症状综合判断（题干已提供红肿热痛、ESR↑、WBC↑）。",
          "accept": [
            "结合临床症状",
            "结合红肿热痛及炎症指标",
            "综合临床及实验室检查",
            "联系病史与实验室结果"
          ]
        }
      ]
    },
    "IMP-08": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "未将本例误诊为骨关节炎、痛风、银屑病关节炎等其他关节病。",
          "accept": [
            "未诊断为骨关节炎",
            "未提及骨赘或DIP受累（OA特征）",
            "未描述穿凿样侵蚀（痛风特征）",
            "未提银屑病关节炎的笔帽样改变"
          ]
        }
      ]
    }
  },
  "SEU-012": {
    "FIND-01": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "明确指出缺损位于房间隔（而非室间隔、房室间隔或主动脉根部）",
          "accept": [
            "房间隔",
            "房间隔中部",
            "卵圆窝区房间隔",
            "继发孔区房间隔"
          ]
        }
      ]
    },
    "FIND-02": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "描述缺损为连续性中断（非增厚、回声增强、囊袋样膨出等非缺损性改变）",
          "accept": [
            "连续性中断",
            "回声失落",
            "回声缺失",
            "结构中断"
          ]
        }
      ]
    },
    "FIND-03": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "给出缺损大小数值（单位mm）或定性描述（如小/中/大）",
          "accept": [
            "8 mm",
            "约8 mm",
            "中等大小",
            "直径约8 mm"
          ]
        }
      ]
    },
    "FIND-04": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "描述缺损边界特征（如清晰、毛糙、回声增强、边缘菲薄等）",
          "accept": [
            "边缘清晰",
            "断端回声增强",
            "边界清楚",
            "边缘回声增强"
          ]
        }
      ]
    },
    "FIND-05": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "明确描述分流方向（左向右）及时相（收缩期为主或双期）",
          "accept": [
            "左向右分流",
            "左房→右房分流",
            "收缩期为主左向右分流",
            "双期左向右分流"
          ]
        }
      ]
    },
    "FIND-06": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "提及右心系统扩大（至少一项：右房或右室增大）",
          "accept": [
            "右心房增大",
            "右心室增大",
            "右房右室轻度增大",
            "右心系统轻度扩大"
          ]
        }
      ]
    },
    "FIND-07": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "报告重要阴性征象（如无肺静脉异位引流、无房室瓣畸形、无室间隔缺损等）",
          "accept": [
            "未见肺静脉异位引流",
            "未见房室瓣畸形",
            "未见室间隔缺损",
            "未见其他结构性心脏畸形"
          ]
        }
      ]
    },
    "IMP-01": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "诊断名称包含‘先天性心脏病’和‘房间隔缺损’两个核心词",
          "accept": [
            "先天性心脏病·房间隔缺损",
            "先天性心脏病，房间隔缺损",
            "ASD（先天性心脏病）",
            "房间隔缺损（先天性）"
          ]
        }
      ]
    },
    "IMP-02": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "注明缺损分型（继发孔型）或解剖位置（卵圆窝区）",
          "accept": [
            "继发孔型",
            "卵圆窝型",
            "继发孔区",
            "卵圆窝区域"
          ]
        }
      ]
    },
    "IMP-03": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "指出血流动力学影响（左向右分流、右心容量负荷增加）",
          "accept": [
            "左向右分流",
            "右心容量负荷增加",
            "肺循环血量增多",
            "右心系统容量负荷过重"
          ]
        }
      ]
    },
    "IMP-04": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "提出临床处理建议（如进一步检查或干预评估）",
          "accept": [
            "建议心电图及胸部X线检查",
            "建议经食管超声心动图评估封堵条件",
            "建议评估介入封堵可行性",
            "建议完善相关检查以指导治疗"
          ]
        }
      ]
    },
    "IMP-05": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "建议内容与题干临床表现（活动后心悸、乏力）及听诊发现（P2亢进）逻辑一致",
          "accept": [
            "评估肺血增多",
            "评估右心扩大程度",
            "评估肺动脉压力",
            "评估分流程度及心功能代偿状态"
          ]
        }
      ]
    },
    "IMP-06": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "诊断依据须源自影像所见（如缺损位置、大小、分流等）",
          "accept": [
            "依据房间隔连续性中断及左向右分流",
            "依据卵圆窝区8 mm缺损及右心扩大",
            "依据超声所见房间隔中断及过隔血流",
            "依据二维及多普勒证据"
          ]
        }
      ]
    },
    "IMP-07": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "未将非特异性表现（如P2亢进、杂音）直接作为影像诊断依据",
          "accept": [
            "未将听诊发现列为影像诊断依据",
            "诊断依据仅引自超声图像及多普勒",
            "未引用临床体征作为影像学结论支撑",
            "影像诊断依据限于超声所见"
          ]
        }
      ]
    },
    "IMP-08": {
      "rules": "",
      "points": [
        {
          "id": "p1",
          "text": "未出现过度诊断（如‘艾森曼格综合征’‘肺动脉高压’等题干及影像未支持的终末期表述）",
          "accept": [
            "未提及肺动脉高压",
            "未诊断艾森曼格综合征",
            "未使用‘重度肺动脉高压’等无依据术语",
            "未推断不可逆性病理改变"
          ]
        }
      ]
    }
  }
}
