import { getSpecialty } from '@ai-sp/shared/data/specialty-registry'
// 病种配置数据 — 来源：病种整理 校对版_线上0526.xlsx
// 掌握度字段来自住培考核大纲：掌握 / 熟悉 / 了解
// 自动生成于 2026-05-26

export const diseaseData = {
  specialties: [
    "内科",
    "儿科",
    "急诊科",
    "皮肤科",
    "神经内科",
    "精神科",
    "普通外科",
    "胸心外科",
    "泌尿外科",
    "整形外科",
    "骨科",
    "儿外科",
    "妇产科",
    "眼科",
    "耳鼻喉科"
  ],
  getSpecialtyId(name) {
    const sp = getSpecialty(name)
    return sp ? sp.id : 'internal_medicine'
  },
  categoriesMap: {
    "内科": [
        "内分泌系统",
        "呼吸系统",
        "心血管系统",
        "感染性疾病",
        "泌尿系统",
        "消化系统",
        "理化因素所致疾病及中毒",
        "血液系统",
        "重症医学",
        "风湿免疫病"
    ],
    "儿科": [
        "免疫性疾病",
        "内分泌遗传代谢性疾病",
        "呼吸系统",
        "心血管系统",
        "急危重症",
        "感染性疾病",
        "新生儿与新生儿疾病",
        "泌尿系统",
        "消化系统",
        "神经肌肉系统疾病",
        "营养与营养障碍疾病",
        "血液系统"
    ],
    "急诊科": [
        "中毒",
        "传染病急症",
        "儿科急症",
        "内分泌代谢急症",
        "创伤急症",
        "呼吸系统急症",
        "妇产科急症",
        "循环系统急症",
        "普通外科急症",
        "泌尿系统急症",
        "消化系统急症",
        "环境急诊",
        "电解质和酸碱平衡失常",
        "皮肤科急症",
        "神经系统急症",
        "血液系统急症",
        "风湿免疫急症"
    ],
    "皮肤科": [
        "其他",
        "大疱及疱疹性皮肤病",
        "寄生虫及动物性皮肤病",
        "性传播疾病",
        "感染性皮肤病",
        "物理性皮肤病",
        "皮肤肿瘤",
        "皮肤附属器疾病",
        "神经功能障碍性皮肤病",
        "粘膜疾病",
        "红斑丘疹鳞屑性皮肤病",
        "结缔组织病",
        "色素异常性皮肤病",
        "营养与代谢障碍性皮肤病",
        "血管性皮肤病",
        "血管炎",
        "角化及萎缩性皮肤病",
        "过敏性或变态反应性皮肤病",
        "遗传性皮肤病",
        "非感染性肉芽肿及脂膜炎症"
    ],
    "神经内科": [
        "中枢神经系统感染性疾病",
        "其他",
        "内科系统疾病的神经系统表现",
        "周围神经病",
        "头痛",
        "癫痫",
        "眩晕",
        "睡眠障碍",
        "神经-肌肉接头和肌肉疾病",
        "神经系统变性疾病",
        "神经重症",
        "脊髓疾病",
        "脑血管疾病",
        "脱髓鞘病",
        "运动障碍性疾病"
    ],
    "普通外科": [
        "乳房疾病",
        "动脉性疾病",
        "十二指肠疾病",
        "周围静脉疾病",
        "小肠和结肠疾病",
        "急腹症",
        "消化道出血",
        "甲状腺和甲状旁腺疾病",
        "直肠疾病",
        "肝脏疾病",
        "胆系疾病",
        "胰腺疾病",
        "腹外疝",
        "腹膜和腹膜腔感染",
        "腹部损伤",
        "门脉高压症",
        "阑尾疾病"
    ],
    "胸心外科": [
        "先天性心脏病",
        "其他",
        "外伤",
        "大血管病变",
        "心脏瓣膜病",
        "感染性疾病",
        "纵隔膈肌疾病",
        "肺部肿瘤",
        "食管恶性疾病",
        "食管良性疾病"
    ],
    "泌尿外科": [
        "前列腺增生及泌尿系梗阻",
        "泌尿系感染",
        "泌尿系损伤",
        "结石",
        "肾上腺外科",
        "肿瘤"
    ],
    "整形外科": [
        "临床常见病种"
    ],
    "骨科": [
        "关节损伤",
        "关节脱位",
        "周围神经损伤",
        "手外伤",
        "脊柱及骨盆骨折",
        "腰腿痛及肩颈痛",
        "运动医学",
        "骨关节病",
        "骨软组织肿瘤"
    ],
    "儿外科": [
        "小儿心胸外科",
        "小儿普通外科",
        "小儿泌尿外科",
        "小儿烧伤整形外科",
        "小儿神经外科",
        "小儿肿瘤外科",
        "小儿骨科",
        "新生儿外科"
    ],
    "妇产科": [
        "产前出血",
        "产前检查与孕期保健",
        "分娩期并发症",
        "多胎妊娠",
        "妇科内分泌疾病",
        "妇科复杂疾病",
        "妇科常见危重急症",
        "妇科常见病",
        "妇科恶性肿瘤",
        "妇科良性肿瘤",
        "妊娠合并内外科疾病",
        "妊娠合并感染性疾病",
        "异常产褥",
        "异常分娩",
        "正常分娩与产褥",
        "病理妊娠",
        "胎儿异常",
        "辅助生育技术"
    ],
    "眼科": [
        "巩膜炎",
        "斜视与弱视",
        "晶状体病",
        "泪器疾病",
        "玻璃体视网膜疾病",
        "眼外伤",
        "眼眶病",
        "眼睑疾病",
        "结膜疾病",
        "葡萄膜病",
        "视光学疾病",
        "视路疾病",
        "角膜病",
        "青光眼"
    ],
    "耳鼻喉科": [
        "中耳疾病及耳源性颅内并发症",
        "侧颅底肿瘤",
        "咽异物",
        "咽部炎症",
        "咽部肿瘤",
        "咽部脓肿",
        "喉外伤",
        "喉梗阻",
        "喉神经性疾病",
        "喉部炎症",
        "喉部肿瘤",
        "外耳疾病",
        "气管、食管疾病",
        "眩晕",
        "耳聋",
        "阻塞性睡眠呼吸暂停低通气综合征",
        "颈部肿块",
        "鼻部常见疾病"
    ],
    "精神科": [
        "精神分裂症谱系及其他精神病性障碍",
        "心境障碍",
        "神经症性及应激相关障碍",
        "器质性精神障碍",
        "人格障碍与行为障碍"
    ]
},
  diseasesMap: {
    "心血管系统": [
        {
            "name": "外周动脉血管病",
            "mastery": "了解"
        },
        {
            "name": "成人先天性心脏病",
            "mastery": "了解"
        },
        {
            "name": "主动脉夹层",
            "mastery": "掌握"
        },
        {
            "name": "冠心病",
            "mastery": "掌握"
        },
        {
            "name": "动脉导管未闭",
            "mastery": "掌握"
        },
        {
            "name": "原发性高血压",
            "mastery": "掌握"
        },
        {
            "name": "室间隔缺损",
            "mastery": "掌握"
        },
        {
            "name": "常见心律失常",
            "mastery": "掌握"
        },
        {
            "name": "心力衰竭",
            "mastery": "掌握"
        },
        {
            "name": "心包疾病",
            "mastery": "掌握"
        },
        {
            "name": "心肌炎与心肌病",
            "mastery": "掌握"
        },
        {
            "name": "心脏瓣膜病",
            "mastery": "掌握"
        },
        {
            "name": "急性心力衰竭",
            "mastery": "掌握"
        },
        {
            "name": "感染性心内膜炎",
            "mastery": "掌握"
        },
        {
            "name": "慢性心力衰竭",
            "mastery": "掌握"
        },
        {
            "name": "房间隔缺损",
            "mastery": "掌握"
        },
        {
            "name": "法洛四联症",
            "mastery": "掌握"
        },
        {
            "name": "病毒性心肌炎",
            "mastery": "掌握"
        },
        {
            "name": "肺动脉瓣狭窄",
            "mastery": "掌握"
        },
        {
            "name": "肺动脉高压",
            "mastery": "掌握"
        },
        {
            "name": "肺血管病",
            "mastery": "掌握"
        }
    ],
    "呼吸系统": [
        {
            "name": "弥漫性肺间质疾病（结节病）",
            "mastery": "了解"
        },
        {
            "name": "睡眠呼吸暂停低通气综合征",
            "mastery": "了解"
        },
        {
            "name": "肺真菌病",
            "mastery": "了解"
        },
        {
            "name": "上呼吸道感染",
            "mastery": "掌握"
        },
        {
            "name": "医院获得性肺炎",
            "mastery": "掌握"
        },
        {
            "name": "急性呼吸窘迫综合征（ARDS）",
            "mastery": "掌握"
        },
        {
            "name": "急性呼吸衰竭",
            "mastery": "掌握"
        },
        {
            "name": "急性喉炎",
            "mastery": "掌握"
        },
        {
            "name": "急性支气管炎",
            "mastery": "掌握"
        },
        {
            "name": "急性气管-支气管炎",
            "mastery": "掌握"
        },
        {
            "name": "慢性呼吸衰竭",
            "mastery": "掌握"
        },
        {
            "name": "慢性肺源性心脏病",
            "mastery": "掌握"
        },
        {
            "name": "慢性阻塞性肺疾病",
            "mastery": "掌握"
        },
        {
            "name": "支原体肺炎",
            "mastery": "掌握"
        },
        {
            "name": "支气管哮喘",
            "mastery": "掌握"
        },
        {
            "name": "支气管扩张",
            "mastery": "掌握"
        },
        {
            "name": "支气管肺炎",
            "mastery": "掌握"
        },
        {
            "name": "支气管肺癌",
            "mastery": "掌握"
        },
        {
            "name": "毛细支气管炎",
            "mastery": "掌握"
        },
        {
            "name": "病毒性肺炎",
            "mastery": "掌握"
        },
        {
            "name": "社区获得性肺炎",
            "mastery": "掌握"
        },
        {
            "name": "肺结核",
            "mastery": "掌握"
        },
        {
            "name": "肺脓肿",
            "mastery": "掌握"
        },
        {
            "name": "肺血栓栓塞",
            "mastery": "掌握"
        },
        {
            "name": "胸腔积液",
            "mastery": "掌握"
        },
        {
            "name": "自发性气胸",
            "mastery": "掌握"
        },
        {
            "name": "金黄色葡萄球菌肺炎",
            "mastery": "掌握"
        }
    ],
    "消化系统": [
        {
            "name": "下消化道出血",
            "mastery": "掌握"
        },
        {
            "name": "克罗恩病",
            "mastery": "掌握"
        },
        {
            "name": "口腔炎",
            "mastery": "掌握"
        },
        {
            "name": "小儿腹泻病",
            "mastery": "掌握"
        },
        {
            "name": "急性胃黏膜病变",
            "mastery": "掌握"
        },
        {
            "name": "急性胰腺炎",
            "mastery": "掌握"
        },
        {
            "name": "急慢性肝炎",
            "mastery": "掌握"
        },
        {
            "name": "慢性胃炎",
            "mastery": "掌握"
        },
        {
            "name": "慢性胰腺炎",
            "mastery": "掌握"
        },
        {
            "name": "慢性腹泻",
            "mastery": "掌握"
        },
        {
            "name": "消化性溃疡",
            "mastery": "掌握"
        },
        {
            "name": "消化性溃疡所致上消化道出血",
            "mastery": "掌握"
        },
        {
            "name": "溃疡性结肠炎",
            "mastery": "掌握"
        },
        {
            "name": "结肠癌",
            "mastery": "掌握"
        },
        {
            "name": "缺血性肠病",
            "mastery": "掌握"
        },
        {
            "name": "肝癌",
            "mastery": "掌握"
        },
        {
            "name": "肝硬化",
            "mastery": "掌握"
        },
        {
            "name": "肠易激综合征",
            "mastery": "掌握"
        },
        {
            "name": "肠结核",
            "mastery": "掌握"
        },
        {
            "name": "胃炎",
            "mastery": "掌握"
        },
        {
            "name": "胃癌",
            "mastery": "掌握"
        },
        {
            "name": "胃癌所致上消化道出血",
            "mastery": "掌握"
        },
        {
            "name": "胃肠道息肉病",
            "mastery": "掌握"
        },
        {
            "name": "胃食管反流",
            "mastery": "掌握"
        },
        {
            "name": "胃食管反流病",
            "mastery": "掌握"
        },
        {
            "name": "胆囊炎",
            "mastery": "掌握"
        },
        {
            "name": "胆石病",
            "mastery": "掌握"
        },
        {
            "name": "胰腺癌",
            "mastery": "掌握"
        },
        {
            "name": "腹腔积液",
            "mastery": "掌握"
        },
        {
            "name": "酒精性脂肪性肝病",
            "mastery": "掌握"
        },
        {
            "name": "非酒精性脂肪性肝病",
            "mastery": "掌握"
        },
        {
            "name": "食管癌",
            "mastery": "掌握"
        },
        {
            "name": "食管胃底静脉曲张破裂",
            "mastery": "掌握"
        }
    ],
    "血液系统": [
        {
            "name": "凝血功能障碍性疾病",
            "mastery": "了解"
        },
        {
            "name": "原发性血小板增多症",
            "mastery": "了解"
        },
        {
            "name": "原发性骨髓纤维化",
            "mastery": "了解"
        },
        {
            "name": "真性红细胞增多症",
            "mastery": "了解"
        },
        {
            "name": "脾功能亢进",
            "mastery": "了解"
        },
        {
            "name": "过敏性紫癜",
            "mastery": "了解"
        },
        {
            "name": "骨髓增生异常综合征（MDS）",
            "mastery": "了解"
        },
        {
            "name": "免疫性血小板减少症",
            "mastery": "掌握"
        },
        {
            "name": "再生障碍性贫血",
            "mastery": "掌握"
        },
        {
            "name": "多发性骨髓瘤",
            "mastery": "掌握"
        },
        {
            "name": "巨幼细胞贫血",
            "mastery": "掌握"
        },
        {
            "name": "弥散性血管内凝血（DIC）",
            "mastery": "掌握"
        },
        {
            "name": "急慢性白血病",
            "mastery": "掌握"
        },
        {
            "name": "淋巴瘤",
            "mastery": "掌握"
        },
        {
            "name": "特发性血小板减少性紫癜",
            "mastery": "掌握"
        },
        {
            "name": "白细胞减少症",
            "mastery": "掌握"
        },
        {
            "name": "白血病",
            "mastery": "掌握"
        },
        {
            "name": "粒细胞缺乏症",
            "mastery": "掌握"
        },
        {
            "name": "缺铁性贫血",
            "mastery": "掌握"
        },
        {
            "name": "自身免疫性溶血性贫血",
            "mastery": "掌握"
        },
        {
            "name": "营养性巨细胞性贫血",
            "mastery": "掌握"
        },
        {
            "name": "营养性缺铁性贫血",
            "mastery": "掌握"
        }
    ],
    "泌尿系统": [
        {
            "name": "原发性肾脏病",
            "mastery": "了解"
        },
        {
            "name": "反流性肾病",
            "mastery": "了解"
        },
        {
            "name": "继发性肾脏病",
            "mastery": "了解"
        },
        {
            "name": "肾小管疾病",
            "mastery": "了解"
        },
        {
            "name": "腹膜透析并发症",
            "mastery": "了解"
        },
        {
            "name": "血液透析并发症",
            "mastery": "了解"
        },
        {
            "name": "遗传性肾脏疾病",
            "mastery": "了解"
        },
        {
            "name": "IgA肾病",
            "mastery": "掌握"
        },
        {
            "name": "孤立性血尿",
            "mastery": "掌握"
        },
        {
            "name": "尿路感染",
            "mastery": "掌握"
        },
        {
            "name": "急性肾炎",
            "mastery": "掌握"
        },
        {
            "name": "急性肾衰竭",
            "mastery": "掌握"
        },
        {
            "name": "急进性肾炎",
            "mastery": "掌握"
        },
        {
            "name": "慢性肾炎",
            "mastery": "掌握"
        },
        {
            "name": "慢性肾脏病",
            "mastery": "掌握"
        },
        {
            "name": "泌尿系统感染",
            "mastery": "掌握"
        },
        {
            "name": "终末期肾衰竭",
            "mastery": "掌握"
        },
        {
            "name": "继发性肾小球疾病",
            "mastery": "掌握"
        },
        {
            "name": "肾小球肾炎",
            "mastery": "掌握"
        },
        {
            "name": "肾病综合征",
            "mastery": "掌握"
        },
        {
            "name": "间质性肾炎",
            "mastery": "掌握"
        }
    ],
    "内分泌系统": [
        {
            "name": "低血糖症",
            "mastery": "了解"
        },
        {
            "name": "垂体疾病",
            "mastery": "了解"
        },
        {
            "name": "抗利尿激素分泌不当综合征（SIADH）",
            "mastery": "了解"
        },
        {
            "name": "甲状旁腺功能亢进症",
            "mastery": "了解"
        },
        {
            "name": "甲状旁腺功能减退症",
            "mastery": "了解"
        },
        {
            "name": "甲状腺结节",
            "mastery": "了解"
        },
        {
            "name": "甲状腺肿大",
            "mastery": "了解"
        },
        {
            "name": "骨质疏松",
            "mastery": "了解"
        },
        {
            "name": "Graves病",
            "mastery": "掌握"
        },
        {
            "name": "原发性醛固酮增多症",
            "mastery": "掌握"
        },
        {
            "name": "甲状腺功能亢进症",
            "mastery": "掌握"
        },
        {
            "name": "甲状腺功能减退症",
            "mastery": "掌握"
        },
        {
            "name": "皮质醇增多症",
            "mastery": "掌握"
        },
        {
            "name": "糖尿病",
            "mastery": "掌握"
        },
        {
            "name": "糖尿病低血糖",
            "mastery": "掌握"
        },
        {
            "name": "糖尿病酮症酸中毒",
            "mastery": "掌握"
        },
        {
            "name": "肾上腺皮质功能减退症",
            "mastery": "掌握"
        },
        {
            "name": "脂代谢紊乱",
            "mastery": "掌握"
        },
        {
            "name": "高血糖高渗综合征",
            "mastery": "掌握"
        }
    ],
    "风湿免疫病": [
        {
            "name": "ANCA相关性血管炎",
            "mastery": "了解"
        },
        {
            "name": "反应性关节炎",
            "mastery": "了解"
        },
        {
            "name": "多肌炎",
            "mastery": "了解"
        },
        {
            "name": "大动脉炎",
            "mastery": "了解"
        },
        {
            "name": "抗磷脂综合征",
            "mastery": "了解"
        },
        {
            "name": "白塞病",
            "mastery": "了解"
        },
        {
            "name": "皮肌炎",
            "mastery": "了解"
        },
        {
            "name": "系统性硬化症",
            "mastery": "了解"
        },
        {
            "name": "骨关节炎",
            "mastery": "了解"
        },
        {
            "name": "干燥综合征",
            "mastery": "掌握"
        },
        {
            "name": "强直性脊柱炎",
            "mastery": "掌握"
        },
        {
            "name": "痛风",
            "mastery": "掌握"
        },
        {
            "name": "类风湿关节炎",
            "mastery": "掌握"
        },
        {
            "name": "系统性红斑狼疮",
            "mastery": "掌握"
        }
    ],
    "感染性疾病": [
        {
            "name": "乙型病毒性脑炎",
            "mastery": "了解"
        },
        {
            "name": "传染性单核细胞增多症",
            "mastery": "了解"
        },
        {
            "name": "伤寒",
            "mastery": "了解"
        },
        {
            "name": "包虫病",
            "mastery": "了解"
        },
        {
            "name": "囊虫病",
            "mastery": "了解"
        },
        {
            "name": "弓形虫病",
            "mastery": "了解"
        },
        {
            "name": "流行性腮腺炎",
            "mastery": "了解"
        },
        {
            "name": "淋病",
            "mastery": "了解"
        },
        {
            "name": "狂犬病",
            "mastery": "了解"
        },
        {
            "name": "疟疾",
            "mastery": "了解"
        },
        {
            "name": "绦虫病",
            "mastery": "了解"
        },
        {
            "name": "肝吸虫病",
            "mastery": "了解"
        },
        {
            "name": "肾综合征出血热",
            "mastery": "了解"
        },
        {
            "name": "艾滋病",
            "mastery": "了解"
        },
        {
            "name": "蛔虫病",
            "mastery": "了解"
        },
        {
            "name": "蛲虫病",
            "mastery": "了解"
        },
        {
            "name": "血吸虫病",
            "mastery": "了解"
        },
        {
            "name": "钩端螺旋体病",
            "mastery": "了解"
        },
        {
            "name": "阿米巴病",
            "mastery": "了解"
        },
        {
            "name": "霍乱",
            "mastery": "了解"
        },
        {
            "name": "麻疹",
            "mastery": "了解"
        },
        {
            "name": "黑热病",
            "mastery": "了解"
        },
        {
            "name": "丙型病毒性肝炎",
            "mastery": "掌握"
        },
        {
            "name": "丙型肝炎",
            "mastery": "掌握"
        },
        {
            "name": "中毒型细菌性痢疾",
            "mastery": "掌握"
        },
        {
            "name": "乙型病毒性肝炎",
            "mastery": "掌握"
        },
        {
            "name": "乙型肝炎",
            "mastery": "掌握"
        },
        {
            "name": "布鲁菌病",
            "mastery": "掌握"
        },
        {
            "name": "幼儿急疹",
            "mastery": "掌握"
        },
        {
            "name": "急性脓胸",
            "mastery": "掌握"
        },
        {
            "name": "慢性脓胸",
            "mastery": "掌握"
        },
        {
            "name": "手足口病",
            "mastery": "掌握"
        },
        {
            "name": "支气管扩张",
            "mastery": "掌握"
        },
        {
            "name": "水痘",
            "mastery": "掌握"
        },
        {
            "name": "沙门氏菌感染",
            "mastery": "掌握"
        },
        {
            "name": "流感",
            "mastery": "掌握"
        },
        {
            "name": "流行性乙型脑炎",
            "mastery": "掌握"
        },
        {
            "name": "流行性脑脊髓膜炎",
            "mastery": "掌握"
        },
        {
            "name": "流行性腮腺炎",
            "mastery": "掌握"
        },
        {
            "name": "甲型肝炎",
            "mastery": "掌握"
        },
        {
            "name": "百日咳",
            "mastery": "掌握"
        },
        {
            "name": "细菌性痢疾",
            "mastery": "掌握"
        },
        {
            "name": "细菌性食物中毒",
            "mastery": "掌握"
        },
        {
            "name": "结核病",
            "mastery": "掌握"
        },
        {
            "name": "肺结核",
            "mastery": "掌握"
        },
        {
            "name": "胸壁结核",
            "mastery": "掌握"
        },
        {
            "name": "艾滋病",
            "mastery": "掌握"
        },
        {
            "name": "霍乱",
            "mastery": "掌握"
        },
        {
            "name": "风疹",
            "mastery": "掌握"
        },
        {
            "name": "麻疹",
            "mastery": "掌握"
        }
    ],
    "重症医学": [
        {
            "name": "多器官功能障碍综合征（MODS）",
            "mastery": "了解"
        },
        {
            "name": "感染性休克",
            "mastery": "掌握"
        },
        {
            "name": "脓毒症",
            "mastery": "掌握"
        }
    ],
    "理化因素所致疾病及中毒": [
        {
            "name": "中暑",
            "mastery": "了解"
        },
        {
            "name": "毒品中毒",
            "mastery": "了解"
        },
        {
            "name": "溺水",
            "mastery": "了解"
        },
        {
            "name": "CO中毒",
            "mastery": "掌握"
        },
        {
            "name": "有机磷农药中毒",
            "mastery": "掌握"
        },
        {
            "name": "镇静剂中毒",
            "mastery": "掌握"
        }
    ],
    "营养与营养障碍疾病": [
        {
            "name": "厌食症",
            "mastery": "了解"
        },
        {
            "name": "发育迟缓",
            "mastery": "了解"
        },
        {
            "name": "注意力缺陷多动综合征",
            "mastery": "了解"
        },
        {
            "name": "身材矮小",
            "mastery": "了解"
        },
        {
            "name": "遗尿症",
            "mastery": "了解"
        },
        {
            "name": "儿童维生素D缺乏性佝偻病",
            "mastery": "掌握"
        },
        {
            "name": "儿童肥胖症",
            "mastery": "掌握"
        },
        {
            "name": "儿童营养不良",
            "mastery": "掌握"
        },
        {
            "name": "儿童锌缺乏症",
            "mastery": "掌握"
        }
    ],
    "新生儿与新生儿疾病": [
        {
            "name": "新生儿TORCH感染",
            "mastery": "了解"
        },
        {
            "name": "新生儿低血糖症和高血糖症",
            "mastery": "了解"
        },
        {
            "name": "新生儿先天性梅毒",
            "mastery": "了解"
        },
        {
            "name": "新生儿呼吸窘迫综合征",
            "mastery": "了解"
        },
        {
            "name": "新生儿坏死性小肠结肠炎",
            "mastery": "了解"
        },
        {
            "name": "新生儿寒冷损伤综合征",
            "mastery": "了解"
        },
        {
            "name": "新生儿红细胞增多症",
            "mastery": "了解"
        },
        {
            "name": "新生儿化脓性脑膜炎",
            "mastery": "掌握"
        },
        {
            "name": "新生儿溶血病",
            "mastery": "掌握"
        },
        {
            "name": "新生儿窒息",
            "mastery": "掌握"
        },
        {
            "name": "新生儿缺氧缺血性脑病",
            "mastery": "掌握"
        },
        {
            "name": "新生儿肺炎",
            "mastery": "掌握"
        },
        {
            "name": "新生儿胎粪吸入综合征",
            "mastery": "掌握"
        },
        {
            "name": "新生儿败血症",
            "mastery": "掌握"
        },
        {
            "name": "新生儿颅内出血",
            "mastery": "掌握"
        },
        {
            "name": "新生儿高胆红素血症",
            "mastery": "掌握"
        }
    ],
    "神经肌肉系统疾病": [
        {
            "name": "癫痫",
            "mastery": "了解"
        },
        {
            "name": "肌病",
            "mastery": "了解"
        },
        {
            "name": "脊髓炎",
            "mastery": "了解"
        },
        {
            "name": "脑性瘫痪",
            "mastery": "了解"
        },
        {
            "name": "化脓性脑膜炎",
            "mastery": "掌握"
        },
        {
            "name": "多发性神经根炎",
            "mastery": "掌握"
        },
        {
            "name": "病毒性脑炎",
            "mastery": "掌握"
        }
    ],
    "免疫性疾病": [
        {
            "name": "幼年特发性关节炎",
            "mastery": "了解"
        },
        {
            "name": "系统性红斑狼疮",
            "mastery": "了解"
        },
        {
            "name": "皮肤黏膜淋巴结综合征（川崎病）",
            "mastery": "掌握"
        },
        {
            "name": "过敏性紫癜",
            "mastery": "掌握"
        },
        {
            "name": "风湿热",
            "mastery": "掌握"
        }
    ],
    "内分泌遗传代谢性疾病": [
        {
            "name": "先天性甲状腺功能低下",
            "mastery": "了解"
        },
        {
            "name": "先天愚型（21-三体综合征、唐氏综合征）",
            "mastery": "了解"
        },
        {
            "name": "儿童糖尿病",
            "mastery": "掌握"
        },
        {
            "name": "糖尿病昏迷",
            "mastery": "掌握"
        }
    ],
    "急危重症": [
        {
            "name": "中毒",
            "mastery": "了解"
        },
        {
            "name": "多器官功能不全综合征（MODS）",
            "mastery": "了解"
        },
        {
            "name": "弥散性血管内凝血（DIC）",
            "mastery": "了解"
        },
        {
            "name": "重症心律失常",
            "mastery": "了解"
        },
        {
            "name": "休克",
            "mastery": "掌握"
        },
        {
            "name": "急性呼吸窘迫综合征（ARDS）",
            "mastery": "掌握"
        },
        {
            "name": "急性呼吸衰竭",
            "mastery": "掌握"
        },
        {
            "name": "急性肾衰竭",
            "mastery": "掌握"
        },
        {
            "name": "急性颅内高压",
            "mastery": "掌握"
        },
        {
            "name": "惊厥",
            "mastery": "掌握"
        },
        {
            "name": "脓毒症（SEPSIS）",
            "mastery": "掌握"
        },
        {
            "name": "重症哮喘",
            "mastery": "掌握"
        }
    ],
    "呼吸系统急症": [
        {
            "name": "卡氏肺孢子菌肺炎",
            "mastery": "了解"
        },
        {
            "name": "气道异物",
            "mastery": "了解"
        },
        {
            "name": "睡眠呼吸暂停综合征",
            "mastery": "了解"
        },
        {
            "name": "肺脓肿",
            "mastery": "了解"
        },
        {
            "name": "肺部肿瘤",
            "mastery": "了解"
        },
        {
            "name": "间质性肺疾病",
            "mastery": "了解"
        },
        {
            "name": "呼吸衰竭",
            "mastery": "掌握"
        },
        {
            "name": "呼吸骤停",
            "mastery": "掌握"
        },
        {
            "name": "急性呼吸窘迫综合征",
            "mastery": "掌握"
        },
        {
            "name": "慢性阻塞性肺病",
            "mastery": "掌握"
        },
        {
            "name": "支气管哮喘",
            "mastery": "掌握"
        },
        {
            "name": "支气管扩张",
            "mastery": "掌握"
        },
        {
            "name": "气胸",
            "mastery": "掌握"
        },
        {
            "name": "肺栓塞",
            "mastery": "掌握"
        },
        {
            "name": "肺源性心脏病",
            "mastery": "掌握"
        },
        {
            "name": "肺炎",
            "mastery": "掌握"
        },
        {
            "name": "胸腔积液",
            "mastery": "掌握"
        }
    ],
    "循环系统急症": [
        {
            "name": "先天性心脏病",
            "mastery": "了解"
        },
        {
            "name": "心肌病",
            "mastery": "了解"
        },
        {
            "name": "心脏瓣膜病",
            "mastery": "了解"
        },
        {
            "name": "感染性心内膜炎",
            "mastery": "了解"
        },
        {
            "name": "继发性高血压",
            "mastery": "了解"
        },
        {
            "name": "缩窄性心包炎",
            "mastery": "了解"
        },
        {
            "name": "主动脉夹层",
            "mastery": "掌握"
        },
        {
            "name": "休克",
            "mastery": "掌握"
        },
        {
            "name": "心力衰竭",
            "mastery": "掌握"
        },
        {
            "name": "心律失常",
            "mastery": "掌握"
        },
        {
            "name": "心脏骤停",
            "mastery": "掌握"
        },
        {
            "name": "急性冠脉综合征",
            "mastery": "掌握"
        },
        {
            "name": "急性心包炎",
            "mastery": "掌握"
        },
        {
            "name": "急性心肌炎",
            "mastery": "掌握"
        },
        {
            "name": "高血压急症",
            "mastery": "掌握"
        }
    ],
    "神经系统急症": [
        {
            "name": "多发性神经根炎",
            "mastery": "了解"
        },
        {
            "name": "脑部肿瘤",
            "mastery": "了解"
        },
        {
            "name": "脱髓鞘疾病",
            "mastery": "了解"
        },
        {
            "name": "颅神经异常",
            "mastery": "了解"
        },
        {
            "name": "中枢神经系统感染",
            "mastery": "掌握"
        },
        {
            "name": "急性脑出血",
            "mastery": "掌握"
        },
        {
            "name": "急性脑梗死",
            "mastery": "掌握"
        },
        {
            "name": "癫痫",
            "mastery": "掌握"
        },
        {
            "name": "重症肌无力",
            "mastery": "掌握"
        },
        {
            "name": "颅内高压症",
            "mastery": "掌握"
        }
    ],
    "消化系统急症": [
        {
            "name": "食管异物",
            "mastery": "了解"
        },
        {
            "name": "急性胰腺炎",
            "mastery": "掌握"
        },
        {
            "name": "感染性腹泻",
            "mastery": "掌握"
        },
        {
            "name": "消化道出血",
            "mastery": "掌握"
        },
        {
            "name": "肝性脑病",
            "mastery": "掌握"
        },
        {
            "name": "肝硬化",
            "mastery": "掌握"
        },
        {
            "name": "肝脓肿",
            "mastery": "掌握"
        }
    ],
    "血液系统急症": [
        {
            "name": "再生障碍性贫血",
            "mastery": "了解"
        },
        {
            "name": "白血病",
            "mastery": "了解"
        },
        {
            "name": "脾功能亢进",
            "mastery": "了解"
        },
        {
            "name": "血友病",
            "mastery": "了解"
        },
        {
            "name": "弥散性血管内凝血",
            "mastery": "掌握"
        },
        {
            "name": "血小板减少性紫癜",
            "mastery": "掌握"
        },
        {
            "name": "贫血",
            "mastery": "掌握"
        },
        {
            "name": "过敏性紫癜",
            "mastery": "掌握"
        }
    ],
    "内分泌代谢急症": [
        {
            "name": "内分泌腺瘤",
            "mastery": "了解"
        },
        {
            "name": "低血糖症",
            "mastery": "掌握"
        },
        {
            "name": "垂体功能减退危象",
            "mastery": "掌握"
        },
        {
            "name": "甲亢危象",
            "mastery": "掌握"
        },
        {
            "name": "甲旁亢危象",
            "mastery": "掌握"
        },
        {
            "name": "糖尿病急症酮症酸中毒",
            "mastery": "掌握"
        },
        {
            "name": "肾上腺功能减退危象",
            "mastery": "掌握"
        },
        {
            "name": "高血糖高渗性状态",
            "mastery": "掌握"
        }
    ],
    "泌尿系统急症": [
        {
            "name": "睾丸扭转",
            "mastery": "了解"
        },
        {
            "name": "肾小球肾炎",
            "mastery": "了解"
        },
        {
            "name": "尿石症",
            "mastery": "掌握"
        },
        {
            "name": "尿路感染",
            "mastery": "掌握"
        },
        {
            "name": "肾功能衰竭",
            "mastery": "掌握"
        }
    ],
    "风湿免疫急症": [
        {
            "name": "痛风",
            "mastery": "掌握"
        },
        {
            "name": "系统性红斑狼疮",
            "mastery": "掌握"
        }
    ],
    "传染病急症": [
        {
            "name": "流行性乙型脑炎",
            "mastery": "了解"
        },
        {
            "name": "流行性脑脊髓膜炎",
            "mastery": "了解"
        },
        {
            "name": "疟疾",
            "mastery": "了解"
        },
        {
            "name": "病毒性脑炎",
            "mastery": "了解"
        },
        {
            "name": "艾滋病",
            "mastery": "了解"
        },
        {
            "name": "伤寒",
            "mastery": "掌握"
        },
        {
            "name": "病毒性肝炎",
            "mastery": "掌握"
        },
        {
            "name": "肾病综合征出血热",
            "mastery": "掌握"
        },
        {
            "name": "菌痢",
            "mastery": "掌握"
        },
        {
            "name": "麻疹",
            "mastery": "掌握"
        }
    ],
    "中毒": [
        {
            "name": "一氧化碳中毒",
            "mastery": "掌握"
        },
        {
            "name": "二氧化硫中毒",
            "mastery": "掌握"
        },
        {
            "name": "亚硝酸盐中毒",
            "mastery": "掌握"
        },
        {
            "name": "光气中毒",
            "mastery": "掌握"
        },
        {
            "name": "发芽马铃薯中毒",
            "mastery": "掌握"
        },
        {
            "name": "巴比妥类药物中毒",
            "mastery": "掌握"
        },
        {
            "name": "强碱中毒",
            "mastery": "掌握"
        },
        {
            "name": "强酸中毒",
            "mastery": "掌握"
        },
        {
            "name": "抗抑郁类药物中毒",
            "mastery": "掌握"
        },
        {
            "name": "抗精神病药物中毒",
            "mastery": "掌握"
        },
        {
            "name": "有机磷农药中毒",
            "mastery": "掌握"
        },
        {
            "name": "木薯中毒",
            "mastery": "掌握"
        },
        {
            "name": "杀草剂中毒",
            "mastery": "掌握"
        },
        {
            "name": "杀鼠剂中毒",
            "mastery": "掌握"
        },
        {
            "name": "毒蕈中毒",
            "mastery": "掌握"
        },
        {
            "name": "毒虫咬伤",
            "mastery": "掌握"
        },
        {
            "name": "毒蛇咬伤",
            "mastery": "掌握"
        },
        {
            "name": "氨气中毒",
            "mastery": "掌握"
        },
        {
            "name": "氯气中毒",
            "mastery": "掌握"
        },
        {
            "name": "氰化物中毒",
            "mastery": "掌握"
        },
        {
            "name": "河豚毒素中毒",
            "mastery": "掌握"
        },
        {
            "name": "甲烷中毒",
            "mastery": "掌握"
        },
        {
            "name": "甲醇中毒",
            "mastery": "掌握"
        },
        {
            "name": "白果中毒",
            "mastery": "掌握"
        },
        {
            "name": "硫化氢中毒",
            "mastery": "掌握"
        },
        {
            "name": "苯中毒",
            "mastery": "掌握"
        },
        {
            "name": "苯二氮卓类药物中毒",
            "mastery": "掌握"
        },
        {
            "name": "解热镇痛药物中毒",
            "mastery": "掌握"
        },
        {
            "name": "酒精中毒",
            "mastery": "掌握"
        },
        {
            "name": "金属中毒",
            "mastery": "掌握"
        },
        {
            "name": "阿片类药物中毒",
            "mastery": "掌握"
        },
        {
            "name": "鱼胆中毒",
            "mastery": "掌握"
        }
    ],
    "环境急诊": [
        {
            "name": "冻伤",
            "mastery": "了解"
        },
        {
            "name": "电击伤",
            "mastery": "了解"
        },
        {
            "name": "中暑",
            "mastery": "掌握"
        },
        {
            "name": "溺水",
            "mastery": "掌握"
        }
    ],
    "电解质和酸碱平衡失常": [
        {
            "name": "混合型酸碱平衡紊乱",
            "mastery": "了解"
        },
        {
            "name": "代谢性碱中毒",
            "mastery": "掌握"
        },
        {
            "name": "代谢性酸中毒",
            "mastery": "掌握"
        },
        {
            "name": "低渗性失水",
            "mastery": "掌握"
        },
        {
            "name": "低钙血症",
            "mastery": "掌握"
        },
        {
            "name": "低钠血症",
            "mastery": "掌握"
        },
        {
            "name": "低钾血症",
            "mastery": "掌握"
        },
        {
            "name": "呼吸性碱中毒",
            "mastery": "掌握"
        },
        {
            "name": "呼吸性酸中毒",
            "mastery": "掌握"
        },
        {
            "name": "水过多",
            "mastery": "掌握"
        },
        {
            "name": "等渗性失水",
            "mastery": "掌握"
        },
        {
            "name": "高渗性失水",
            "mastery": "掌握"
        },
        {
            "name": "高钙血症",
            "mastery": "掌握"
        },
        {
            "name": "高钠血症",
            "mastery": "掌握"
        },
        {
            "name": "高钾血症",
            "mastery": "掌握"
        }
    ],
    "普通外科急症": [
        {
            "name": "缺血性肠病",
            "mastery": "了解"
        },
        {
            "name": "腹部肿瘤",
            "mastery": "了解"
        },
        {
            "name": "嵌顿疝",
            "mastery": "掌握"
        },
        {
            "name": "急性梗阻型化脓性胆管炎",
            "mastery": "掌握"
        },
        {
            "name": "急性胆囊炎",
            "mastery": "掌握"
        },
        {
            "name": "急性阑尾炎",
            "mastery": "掌握"
        },
        {
            "name": "烧伤",
            "mastery": "掌握"
        },
        {
            "name": "肠梗阻",
            "mastery": "掌握"
        },
        {
            "name": "胃肠穿孔",
            "mastery": "掌握"
        },
        {
            "name": "腹腔出血",
            "mastery": "掌握"
        },
        {
            "name": "腹膜炎",
            "mastery": "掌握"
        }
    ],
    "创伤急症": [
        {
            "name": "复合伤",
            "mastery": "了解"
        },
        {
            "name": "多发伤",
            "mastery": "了解"
        },
        {
            "name": "脂肪栓塞综合征",
            "mastery": "了解"
        },
        {
            "name": "关节脱位",
            "mastery": "掌握"
        },
        {
            "name": "四肢骨折",
            "mastery": "掌握"
        },
        {
            "name": "泌尿系统损伤",
            "mastery": "掌握"
        },
        {
            "name": "胸部损伤",
            "mastery": "掌握"
        },
        {
            "name": "脊柱损伤",
            "mastery": "掌握"
        },
        {
            "name": "腹部损伤",
            "mastery": "掌握"
        },
        {
            "name": "颅脑损伤",
            "mastery": "掌握"
        },
        {
            "name": "颌面部损伤",
            "mastery": "掌握"
        },
        {
            "name": "骨盆骨折",
            "mastery": "掌握"
        }
    ],
    "妇产科急症": [
        {
            "name": "外阴炎",
            "mastery": "了解"
        },
        {
            "name": "妇科肿瘤",
            "mastery": "了解"
        },
        {
            "name": "宫颈炎",
            "mastery": "了解"
        },
        {
            "name": "早产",
            "mastery": "了解"
        },
        {
            "name": "盆腔炎",
            "mastery": "了解"
        },
        {
            "name": "自然流产",
            "mastery": "了解"
        },
        {
            "name": "阴道出血",
            "mastery": "了解"
        },
        {
            "name": "产前产后大出血",
            "mastery": "掌握"
        },
        {
            "name": "卵巢肿瘤蒂扭转",
            "mastery": "掌握"
        },
        {
            "name": "妊娠高血压综合征",
            "mastery": "掌握"
        },
        {
            "name": "异位妊娠",
            "mastery": "掌握"
        },
        {
            "name": "正常分娩",
            "mastery": "掌握"
        },
        {
            "name": "羊水栓塞",
            "mastery": "掌握"
        }
    ],
    "儿科急症": [
        {
            "name": "中毒性细菌性痢疾",
            "mastery": "了解"
        },
        {
            "name": "寄生虫病",
            "mastery": "了解"
        },
        {
            "name": "小儿腹泻",
            "mastery": "了解"
        },
        {
            "name": "急性心力衰竭",
            "mastery": "了解"
        },
        {
            "name": "急性支气管炎",
            "mastery": "了解"
        },
        {
            "name": "急性肾小球肾炎",
            "mastery": "了解"
        },
        {
            "name": "惊厥",
            "mastery": "了解"
        },
        {
            "name": "新生儿低钙血症",
            "mastery": "了解"
        },
        {
            "name": "新生儿呼吸窘迫综合征",
            "mastery": "了解"
        },
        {
            "name": "新生儿黄疸",
            "mastery": "了解"
        },
        {
            "name": "气管炎",
            "mastery": "了解"
        },
        {
            "name": "流行性腮腺炎",
            "mastery": "了解"
        },
        {
            "name": "肠套叠",
            "mastery": "了解"
        },
        {
            "name": "肺炎",
            "mastery": "了解"
        },
        {
            "name": "肾病综合征",
            "mastery": "了解"
        },
        {
            "name": "脑膜炎",
            "mastery": "了解"
        }
    ],
    "皮肤科急症": [
        {
            "name": "丹毒",
            "mastery": "了解"
        },
        {
            "name": "冻疮",
            "mastery": "了解"
        },
        {
            "name": "剥脱性皮炎",
            "mastery": "了解"
        },
        {
            "name": "单纯疱疹",
            "mastery": "了解"
        },
        {
            "name": "多形性红斑",
            "mastery": "了解"
        },
        {
            "name": "带状疱疹",
            "mastery": "了解"
        },
        {
            "name": "接触性皮炎",
            "mastery": "了解"
        },
        {
            "name": "日光性皮炎",
            "mastery": "了解"
        },
        {
            "name": "淋病",
            "mastery": "了解"
        },
        {
            "name": "湿疹",
            "mastery": "了解"
        },
        {
            "name": "癣",
            "mastery": "了解"
        },
        {
            "name": "皮肤肿瘤",
            "mastery": "了解"
        },
        {
            "name": "脓疱疮",
            "mastery": "了解"
        },
        {
            "name": "荨麻疹",
            "mastery": "了解"
        },
        {
            "name": "鸡眼",
            "mastery": "了解"
        }
    ],
    "感染性皮肤病": [
        {
            "name": "丹毒",
            "mastery": "掌握"
        },
        {
            "name": "传染性软疣",
            "mastery": "掌握"
        },
        {
            "name": "体癣",
            "mastery": "掌握"
        },
        {
            "name": "单纯疱疹",
            "mastery": "掌握"
        },
        {
            "name": "头癣",
            "mastery": "掌握"
        },
        {
            "name": "孢子丝菌病",
            "mastery": "掌握"
        },
        {
            "name": "寻常狼疮",
            "mastery": "掌握"
        },
        {
            "name": "带状疱疹",
            "mastery": "掌握"
        },
        {
            "name": "念珠菌病",
            "mastery": "掌握"
        },
        {
            "name": "手癣",
            "mastery": "掌握"
        },
        {
            "name": "手足口病",
            "mastery": "掌握"
        },
        {
            "name": "毛囊炎",
            "mastery": "掌握"
        },
        {
            "name": "水痘",
            "mastery": "掌握"
        },
        {
            "name": "猩红热",
            "mastery": "掌握"
        },
        {
            "name": "甲沟炎",
            "mastery": "掌握"
        },
        {
            "name": "甲癣",
            "mastery": "掌握"
        },
        {
            "name": "疖",
            "mastery": "掌握"
        },
        {
            "name": "疣",
            "mastery": "掌握"
        },
        {
            "name": "疣状皮肤结核",
            "mastery": "掌握"
        },
        {
            "name": "痈",
            "mastery": "掌握"
        },
        {
            "name": "癣菌疹",
            "mastery": "掌握"
        },
        {
            "name": "皮肤着色芽生菌病",
            "mastery": "掌握"
        },
        {
            "name": "股癣",
            "mastery": "掌握"
        },
        {
            "name": "脓疱疮",
            "mastery": "掌握"
        },
        {
            "name": "脓肿性穿凿性头部毛囊周围炎",
            "mastery": "掌握"
        },
        {
            "name": "花斑糠疹",
            "mastery": "掌握"
        },
        {
            "name": "蜂窝织炎",
            "mastery": "掌握"
        },
        {
            "name": "足癣",
            "mastery": "掌握"
        },
        {
            "name": "隐球菌病",
            "mastery": "掌握"
        },
        {
            "name": "非结核分枝杆菌感染",
            "mastery": "掌握"
        },
        {
            "name": "须疮",
            "mastery": "掌握"
        },
        {
            "name": "风疹",
            "mastery": "掌握"
        },
        {
            "name": "马拉色菌性毛囊炎",
            "mastery": "掌握"
        },
        {
            "name": "麻疹",
            "mastery": "掌握"
        },
        {
            "name": "麻风",
            "mastery": "掌握"
        }
    ],
    "寄生虫及动物性皮肤病": [
        {
            "name": "毛虫皮炎",
            "mastery": "掌握"
        },
        {
            "name": "疥疮",
            "mastery": "掌握"
        },
        {
            "name": "虱病",
            "mastery": "掌握"
        },
        {
            "name": "螨皮炎",
            "mastery": "掌握"
        },
        {
            "name": "隐翅虫皮炎",
            "mastery": "掌握"
        }
    ],
    "性传播疾病": [
        {
            "name": "尖锐湿疣",
            "mastery": "掌握"
        },
        {
            "name": "梅毒",
            "mastery": "掌握"
        },
        {
            "name": "淋病",
            "mastery": "掌握"
        },
        {
            "name": "生殖器疱疹",
            "mastery": "掌握"
        },
        {
            "name": "非淋菌性尿道炎",
            "mastery": "掌握"
        }
    ],
    "过敏性或变态反应性皮肤病": [
        {
            "name": "丘疹样荨麻疹",
            "mastery": "掌握"
        },
        {
            "name": "传染性湿疹样皮炎",
            "mastery": "掌握"
        },
        {
            "name": "嗜酸细胞增多综合征",
            "mastery": "掌握"
        },
        {
            "name": "妊娠皮炎",
            "mastery": "掌握"
        },
        {
            "name": "尿布皮炎",
            "mastery": "掌握"
        },
        {
            "name": "接触性皮炎",
            "mastery": "掌握"
        },
        {
            "name": "汗疱疹",
            "mastery": "掌握"
        },
        {
            "name": "淤积性皮炎",
            "mastery": "掌握"
        },
        {
            "name": "特应性皮炎",
            "mastery": "掌握"
        },
        {
            "name": "痒疹",
            "mastery": "掌握"
        },
        {
            "name": "脂溢性皮炎",
            "mastery": "掌握"
        },
        {
            "name": "自身敏感性皮炎",
            "mastery": "掌握"
        },
        {
            "name": "荨麻疹",
            "mastery": "掌握"
        },
        {
            "name": "药疹",
            "mastery": "掌握"
        },
        {
            "name": "血管性水肿",
            "mastery": "掌握"
        }
    ],
    "物理性皮肤病": [
        {
            "name": "冻疮与冻伤",
            "mastery": "掌握"
        },
        {
            "name": "夏季皮炎",
            "mastery": "掌握"
        },
        {
            "name": "多形性日光疹",
            "mastery": "掌握"
        },
        {
            "name": "手足皲裂",
            "mastery": "掌握"
        },
        {
            "name": "日晒伤",
            "mastery": "掌握"
        },
        {
            "name": "植物-日光性皮炎",
            "mastery": "掌握"
        },
        {
            "name": "火激红斑",
            "mastery": "掌握"
        },
        {
            "name": "痱子",
            "mastery": "掌握"
        },
        {
            "name": "褶烂（间擦疹）",
            "mastery": "掌握"
        },
        {
            "name": "鸡眼与胼胝",
            "mastery": "掌握"
        }
    ],
    "神经功能障碍性皮肤病": [
        {
            "name": "人工皮炎",
            "mastery": "掌握"
        },
        {
            "name": "寄生虫病妄想",
            "mastery": "掌握"
        },
        {
            "name": "慢性单纯性苔藓",
            "mastery": "掌握"
        },
        {
            "name": "瘙痒症",
            "mastery": "掌握"
        },
        {
            "name": "结节性痒疹",
            "mastery": "掌握"
        }
    ],
    "红斑丘疹鳞屑性皮肤病": [
        {
            "name": "光泽苔藓",
            "mastery": "掌握"
        },
        {
            "name": "副银屑病",
            "mastery": "掌握"
        },
        {
            "name": "单纯糠疹",
            "mastery": "掌握"
        },
        {
            "name": "多形红斑",
            "mastery": "掌握"
        },
        {
            "name": "小棘苔藓",
            "mastery": "掌握"
        },
        {
            "name": "慢性游走性红斑",
            "mastery": "掌握"
        },
        {
            "name": "扁平苔藓",
            "mastery": "掌握"
        },
        {
            "name": "玫瑰糠疹",
            "mastery": "掌握"
        },
        {
            "name": "硬化萎缩性苔藓",
            "mastery": "掌握"
        },
        {
            "name": "离心性环状红斑",
            "mastery": "掌握"
        },
        {
            "name": "红皮病",
            "mastery": "掌握"
        },
        {
            "name": "线状苔藓",
            "mastery": "掌握"
        },
        {
            "name": "银屑病",
            "mastery": "掌握"
        }
    ],
    "角化及萎缩性皮肤病": [
        {
            "name": "剥脱性角质松解症",
            "mastery": "掌握"
        },
        {
            "name": "斑状萎缩",
            "mastery": "掌握"
        },
        {
            "name": "毛周角化病",
            "mastery": "掌握"
        },
        {
            "name": "砷角化症",
            "mastery": "掌握"
        },
        {
            "name": "萎缩纹",
            "mastery": "掌握"
        },
        {
            "name": "黑棘皮病",
            "mastery": "掌握"
        }
    ],
    "结缔组织病": [
        {
            "name": "混合结缔组织病",
            "mastery": "掌握"
        },
        {
            "name": "皮肌炎",
            "mastery": "掌握"
        },
        {
            "name": "硬皮病",
            "mastery": "掌握"
        },
        {
            "name": "红斑狼疮",
            "mastery": "掌握"
        },
        {
            "name": "重叠结缔组织病",
            "mastery": "掌握"
        }
    ],
    "大疱及疱疹性皮肤病": [
        {
            "name": "大疱性类天疱疮",
            "mastery": "掌握"
        },
        {
            "name": "天疱疮",
            "mastery": "掌握"
        },
        {
            "name": "疱疹样皮炎",
            "mastery": "掌握"
        },
        {
            "name": "线状IgA大疱性皮病",
            "mastery": "掌握"
        },
        {
            "name": "获得性大疱性表皮松解症",
            "mastery": "掌握"
        },
        {
            "name": "角层下脓疱病",
            "mastery": "掌握"
        }
    ],
    "血管性皮肤病": [
        {
            "name": "Raynaud现象和Raynaud病",
            "mastery": "掌握"
        },
        {
            "name": "化脓性肉芽肿",
            "mastery": "掌握"
        },
        {
            "name": "毛细血管扩张症",
            "mastery": "掌握"
        },
        {
            "name": "淋巴水肿",
            "mastery": "掌握"
        },
        {
            "name": "网状青斑",
            "mastery": "掌握"
        }
    ],
    "血管炎": [
        {
            "name": "变应性血管炎",
            "mastery": "掌握"
        },
        {
            "name": "坏疽性脓皮病",
            "mastery": "掌握"
        },
        {
            "name": "急性发热性嗜中性皮病",
            "mastery": "掌握"
        },
        {
            "name": "持久性隆起性红斑",
            "mastery": "掌握"
        },
        {
            "name": "硬红斑",
            "mastery": "掌握"
        },
        {
            "name": "色素性紫癜性皮病",
            "mastery": "掌握"
        },
        {
            "name": "荨麻疹性血管炎",
            "mastery": "掌握"
        },
        {
            "name": "过敏性紫癜",
            "mastery": "掌握"
        }
    ],
    "营养与代谢障碍性皮肤病": [
        {
            "name": "原发性皮肤淀粉样变",
            "mastery": "掌握"
        },
        {
            "name": "硬肿病",
            "mastery": "掌握"
        },
        {
            "name": "粘液性水肿",
            "mastery": "掌握"
        },
        {
            "name": "糖尿病相关性皮病",
            "mastery": "掌握"
        },
        {
            "name": "维生素A缺乏症",
            "mastery": "掌握"
        },
        {
            "name": "黄瘤病",
            "mastery": "掌握"
        }
    ],
    "遗传性皮肤病": [
        {
            "name": "大疱性表皮松解症",
            "mastery": "掌握"
        },
        {
            "name": "掌跖角化病",
            "mastery": "掌握"
        },
        {
            "name": "着色性干皮症",
            "mastery": "掌握"
        },
        {
            "name": "色素失禁症",
            "mastery": "掌握"
        },
        {
            "name": "色素性荨麻疹",
            "mastery": "掌握"
        },
        {
            "name": "进行性对称性红斑角化病",
            "mastery": "掌握"
        },
        {
            "name": "鱼鳞病",
            "mastery": "掌握"
        }
    ],
    "色素异常性皮肤病": [
        {
            "name": "太田痣",
            "mastery": "掌握"
        },
        {
            "name": "无色素痣",
            "mastery": "掌握"
        },
        {
            "name": "白癜风",
            "mastery": "掌握"
        },
        {
            "name": "皮肤黑变病",
            "mastery": "掌握"
        },
        {
            "name": "老年性白斑",
            "mastery": "掌握"
        },
        {
            "name": "蒙古斑",
            "mastery": "掌握"
        },
        {
            "name": "贫血痣",
            "mastery": "掌握"
        },
        {
            "name": "雀斑",
            "mastery": "掌握"
        },
        {
            "name": "黄褐斑",
            "mastery": "掌握"
        }
    ],
    "皮肤附属器疾病": [
        {
            "name": "Fox-Fordyce病",
            "mastery": "掌握"
        },
        {
            "name": "假性斑秃",
            "mastery": "掌握"
        },
        {
            "name": "口周皮炎",
            "mastery": "掌握"
        },
        {
            "name": "多汗症",
            "mastery": "掌握"
        },
        {
            "name": "斑秃",
            "mastery": "掌握"
        },
        {
            "name": "甲病",
            "mastery": "掌握"
        },
        {
            "name": "男性型秃发症",
            "mastery": "掌握"
        },
        {
            "name": "痤疮",
            "mastery": "掌握"
        },
        {
            "name": "酒渣鼻",
            "mastery": "掌握"
        },
        {
            "name": "颜面播散性粟粒性狼疮",
            "mastery": "掌握"
        }
    ],
    "粘膜疾病": [
        {
            "name": "唇炎",
            "mastery": "掌握"
        },
        {
            "name": "女阴假性湿疣",
            "mastery": "掌握"
        },
        {
            "name": "女阴干枯",
            "mastery": "掌握"
        },
        {
            "name": "干燥性闭塞性龟头炎",
            "mastery": "掌握"
        },
        {
            "name": "珍珠状阴茎丘疹",
            "mastery": "掌握"
        },
        {
            "name": "粘膜白斑",
            "mastery": "掌握"
        },
        {
            "name": "鲍温样丘疹病",
            "mastery": "掌握"
        },
        {
            "name": "龟头包皮炎",
            "mastery": "掌握"
        }
    ],
    "皮肤肿瘤": [
        {
            "name": "乳房湿疹样癌",
            "mastery": "掌握"
        },
        {
            "name": "光化性角化病",
            "mastery": "掌握"
        },
        {
            "name": "基底细胞癌",
            "mastery": "掌握"
        },
        {
            "name": "多发性脂囊瘤",
            "mastery": "掌握"
        },
        {
            "name": "恶性黑素瘤",
            "mastery": "掌握"
        },
        {
            "name": "汗管瘤",
            "mastery": "掌握"
        },
        {
            "name": "海绵状血管瘤",
            "mastery": "掌握"
        },
        {
            "name": "痣细胞痣",
            "mastery": "掌握"
        },
        {
            "name": "瘢痕疙瘩",
            "mastery": "掌握"
        },
        {
            "name": "皮肤纤维瘤",
            "mastery": "掌握"
        },
        {
            "name": "皮肤血管畸形",
            "mastery": "掌握"
        },
        {
            "name": "皮肤血管瘤",
            "mastery": "掌握"
        },
        {
            "name": "皮脂腺痣",
            "mastery": "掌握"
        },
        {
            "name": "皮角",
            "mastery": "掌握"
        },
        {
            "name": "神经纤维瘤",
            "mastery": "掌握"
        },
        {
            "name": "粟丘疹",
            "mastery": "掌握"
        },
        {
            "name": "结缔组织痣",
            "mastery": "掌握"
        },
        {
            "name": "老年性血管瘤",
            "mastery": "掌握"
        },
        {
            "name": "脂溢性角化",
            "mastery": "掌握"
        },
        {
            "name": "脂肪瘤",
            "mastery": "掌握"
        },
        {
            "name": "草莓状痣",
            "mastery": "掌握"
        },
        {
            "name": "蕈样肉芽肿",
            "mastery": "掌握"
        },
        {
            "name": "血管角皮瘤",
            "mastery": "掌握"
        },
        {
            "name": "表皮痣",
            "mastery": "掌握"
        },
        {
            "name": "软纤维瘤",
            "mastery": "掌握"
        },
        {
            "name": "鲍温病",
            "mastery": "掌握"
        },
        {
            "name": "鲜红斑痣",
            "mastery": "掌握"
        },
        {
            "name": "鳞状细胞癌",
            "mastery": "掌握"
        }
    ],
    "非感染性肉芽肿及脂膜炎症": [
        {
            "name": "环状肉芽肿",
            "mastery": "掌握"
        },
        {
            "name": "结节病",
            "mastery": "掌握"
        },
        {
            "name": "脂膜炎",
            "mastery": "掌握"
        }
    ],
    "其他": [
        {
            "name": "EB病毒感染相关性疾病",
            "mastery": "了解"
        },
        {
            "name": "Reiter病",
            "mastery": "了解"
        },
        {
            "name": "传染性单核细胞增多症",
            "mastery": "了解"
        },
        {
            "name": "偏侧萎缩",
            "mastery": "了解"
        },
        {
            "name": "全层脂肪萎缩",
            "mastery": "了解"
        },
        {
            "name": "冠心病",
            "mastery": "了解"
        },
        {
            "name": "嗜酸性筋膜炎",
            "mastery": "了解"
        },
        {
            "name": "小脑扁桃体下疝",
            "mastery": "了解"
        },
        {
            "name": "干燥综合征",
            "mastery": "了解"
        },
        {
            "name": "慢性家族性良性天疱疮",
            "mastery": "了解"
        },
        {
            "name": "慢性缩窄性心包炎",
            "mastery": "了解"
        },
        {
            "name": "成人Still病",
            "mastery": "了解"
        },
        {
            "name": "痛风",
            "mastery": "了解"
        },
        {
            "name": "白塞病",
            "mastery": "了解"
        },
        {
            "name": "神经系统主要遗传性疾病",
            "mastery": "了解"
        },
        {
            "name": "终末期心脏病",
            "mastery": "了解"
        },
        {
            "name": "肢端青紫症",
            "mastery": "了解"
        },
        {
            "name": "艾滋病",
            "mastery": "了解"
        },
        {
            "name": "表皮样囊肿",
            "mastery": "了解"
        },
        {
            "name": "心房黏液瘤",
            "mastery": "掌握"
        }
    ],
    "脑血管疾病": [
        {
            "name": "血管性痴呆",
            "mastery": "了解"
        },
        {
            "name": "短暂性脑缺血发作",
            "mastery": "掌握"
        },
        {
            "name": "脑出血",
            "mastery": "掌握"
        },
        {
            "name": "脑梗死",
            "mastery": "掌握"
        },
        {
            "name": "脑梗死超急性期",
            "mastery": "掌握"
        },
        {
            "name": "脑血管Moyamoya病",
            "mastery": "掌握"
        },
        {
            "name": "脑血管动脉夹层",
            "mastery": "掌握"
        },
        {
            "name": "脑血管小血管病",
            "mastery": "掌握"
        },
        {
            "name": "脑血管炎",
            "mastery": "掌握"
        },
        {
            "name": "蛛网膜下腔出血",
            "mastery": "掌握"
        },
        {
            "name": "颅内静脉系统血栓形成",
            "mastery": "掌握"
        }
    ],
    "中枢神经系统感染性疾病": [
        {
            "name": "朊蛋白病",
            "mastery": "了解"
        },
        {
            "name": "神经梅毒",
            "mastery": "了解"
        },
        {
            "name": "艾滋病",
            "mastery": "了解"
        },
        {
            "name": "化脓性脑膜炎",
            "mastery": "掌握"
        },
        {
            "name": "单纯疱疹病毒性脑炎",
            "mastery": "掌握"
        },
        {
            "name": "病毒性脑膜炎",
            "mastery": "掌握"
        },
        {
            "name": "结核性脑膜炎",
            "mastery": "掌握"
        },
        {
            "name": "脑囊虫病",
            "mastery": "掌握"
        },
        {
            "name": "隐球菌性脑膜炎",
            "mastery": "掌握"
        }
    ],
    "脱髓鞘病": [
        {
            "name": "渗透性脱髓鞘综合征",
            "mastery": "了解"
        },
        {
            "name": "脑白质营养不良",
            "mastery": "了解"
        },
        {
            "name": "多发性硬化",
            "mastery": "掌握"
        },
        {
            "name": "视神经脊髓炎",
            "mastery": "掌握"
        }
    ],
    "神经系统变性疾病": [
        {
            "name": "痴呆",
            "mastery": "掌握"
        },
        {
            "name": "运动神经元病",
            "mastery": "掌握"
        },
        {
            "name": "阿尔茨海默病",
            "mastery": "掌握"
        }
    ],
    "周围神经病": [
        {
            "name": "Bell麻痹",
            "mastery": "掌握"
        },
        {
            "name": "三叉神经痛",
            "mastery": "掌握"
        },
        {
            "name": "卡压性周围神经病",
            "mastery": "掌握"
        },
        {
            "name": "吉兰-巴雷综合征",
            "mastery": "掌握"
        },
        {
            "name": "多发性神经病",
            "mastery": "掌握"
        },
        {
            "name": "慢性炎性脱髓鞘性周围神经病",
            "mastery": "掌握"
        },
        {
            "name": "自身免疫性疾病继发周围神经损伤",
            "mastery": "掌握"
        }
    ],
    "脊髓疾病": [
        {
            "name": "压迫性脊髓病",
            "mastery": "了解"
        },
        {
            "name": "脊髓空洞症",
            "mastery": "了解"
        },
        {
            "name": "脊髓血管病",
            "mastery": "了解"
        },
        {
            "name": "急性脊髓炎",
            "mastery": "掌握"
        },
        {
            "name": "脊髓亚急性联合变性",
            "mastery": "掌握"
        }
    ],
    "癫痫": [
        {
            "name": "全身强直阵挛发作",
            "mastery": "掌握"
        },
        {
            "name": "失神发作",
            "mastery": "掌握"
        },
        {
            "name": "特发性癫痫",
            "mastery": "掌握"
        },
        {
            "name": "癫痫持续状态",
            "mastery": "掌握"
        },
        {
            "name": "继发性癫痫",
            "mastery": "掌握"
        },
        {
            "name": "脑电图",
            "mastery": "掌握"
        }
    ],
    "神经-肌肉接头和肌肉疾病": [
        {
            "name": "Lambert-Eaton综合征",
            "mastery": "掌握"
        },
        {
            "name": "周期性麻痹",
            "mastery": "掌握"
        },
        {
            "name": "多发性肌炎",
            "mastery": "掌握"
        },
        {
            "name": "线粒体脑肌病",
            "mastery": "掌握"
        },
        {
            "name": "肌强直",
            "mastery": "掌握"
        },
        {
            "name": "进行性肌营养不良",
            "mastery": "掌握"
        },
        {
            "name": "重症肌无力（重症肌无力危象）",
            "mastery": "掌握"
        }
    ],
    "运动障碍性疾病": [
        {
            "name": "亨廷顿病",
            "mastery": "了解"
        },
        {
            "name": "原发性震颤",
            "mastery": "了解"
        },
        {
            "name": "小舞蹈病",
            "mastery": "了解"
        },
        {
            "name": "肌张力障碍",
            "mastery": "了解"
        },
        {
            "name": "肝豆状核变性",
            "mastery": "了解"
        },
        {
            "name": "帕金森病",
            "mastery": "掌握"
        }
    ],
    "头痛": [
        {
            "name": "丛集性头痛",
            "mastery": "掌握"
        },
        {
            "name": "低颅压头痛",
            "mastery": "掌握"
        },
        {
            "name": "偏头痛",
            "mastery": "掌握"
        },
        {
            "name": "头痛",
            "mastery": "掌握"
        },
        {
            "name": "紧张性头痛",
            "mastery": "掌握"
        }
    ],
    "眩晕": [
        {
            "name": "中枢性眩晕",
            "mastery": "掌握"
        },
        {
            "name": "位置性眩晕",
            "mastery": "掌握"
        },
        {
            "name": "前庭神经元炎",
            "mastery": "掌握"
        },
        {
            "name": "周围性眩晕",
            "mastery": "掌握"
        },
        {
            "name": "梅尼埃病",
            "mastery": "掌握"
        },
        {
            "name": "耳源性眩晕",
            "mastery": "掌握"
        }
    ],
    "睡眠障碍": [
        {
            "name": "失眠",
            "mastery": "掌握"
        }
    ],
    "神经重症": [
        {
            "name": "呼吸衰竭",
            "mastery": "掌握"
        },
        {
            "name": "多脏器功能障碍综合征",
            "mastery": "掌握"
        },
        {
            "name": "意识状态",
            "mastery": "掌握"
        },
        {
            "name": "癫痫持续状态",
            "mastery": "掌握"
        },
        {
            "name": "重症感染",
            "mastery": "掌握"
        },
        {
            "name": "重症肌无力危象",
            "mastery": "掌握"
        },
        {
            "name": "颅内高压及脑疝",
            "mastery": "掌握"
        }
    ],
    "内科系统疾病的神经系统表现": [
        {
            "name": "可逆性大脑后部白质脑病",
            "mastery": "掌握"
        },
        {
            "name": "干燥综合征",
            "mastery": "掌握"
        },
        {
            "name": "系统性红斑狼疮",
            "mastery": "掌握"
        },
        {
            "name": "系统性血管炎等",
            "mastery": "掌握"
        },
        {
            "name": "肝性脑病",
            "mastery": "掌握"
        },
        {
            "name": "肺性脑病",
            "mastery": "掌握"
        },
        {
            "name": "肾性脑病",
            "mastery": "掌握"
        }
    ],
    "甲状腺和甲状旁腺疾病": [
        {
            "name": "单纯性甲状腺肿",
            "mastery": "掌握"
        },
        {
            "name": "甲状腺功能亢进",
            "mastery": "掌握"
        },
        {
            "name": "甲状腺癌",
            "mastery": "掌握"
        },
        {
            "name": "甲状腺腺瘤",
            "mastery": "掌握"
        },
        {
            "name": "继发性甲旁亢",
            "mastery": "掌握"
        }
    ],
    "乳房疾病": [
        {
            "name": "乳房纤维腺瘤",
            "mastery": "掌握"
        },
        {
            "name": "乳腺癌",
            "mastery": "掌握"
        },
        {
            "name": "急性乳腺炎",
            "mastery": "掌握"
        },
        {
            "name": "纤维囊性乳腺病",
            "mastery": "掌握"
        }
    ],
    "动脉性疾病": [
        {
            "name": "动脉栓塞",
            "mastery": "掌握"
        },
        {
            "name": "血栓闭塞性脉管炎",
            "mastery": "掌握"
        }
    ],
    "周围静脉疾病": [
        {
            "name": "下肢深静脉血栓形成",
            "mastery": "掌握"
        },
        {
            "name": "单纯性下肢静脉曲张",
            "mastery": "掌握"
        },
        {
            "name": "原发性下肢深静脉瓣膜功能不全",
            "mastery": "掌握"
        }
    ],
    "腹外疝": [
        {
            "name": "嵌顿性疝",
            "mastery": "掌握"
        },
        {
            "name": "绞窄性疝",
            "mastery": "掌握"
        },
        {
            "name": "股疝切口疝",
            "mastery": "掌握"
        },
        {
            "name": "脐疝",
            "mastery": "掌握"
        },
        {
            "name": "腹股沟斜疝",
            "mastery": "掌握"
        },
        {
            "name": "腹股沟直疝",
            "mastery": "掌握"
        }
    ],
    "腹部损伤": [
        {
            "name": "小肠外伤",
            "mastery": "掌握"
        },
        {
            "name": "结肠外伤",
            "mastery": "掌握"
        },
        {
            "name": "肝脏损伤",
            "mastery": "掌握"
        },
        {
            "name": "胰腺损伤",
            "mastery": "掌握"
        },
        {
            "name": "脾脏损伤",
            "mastery": "掌握"
        },
        {
            "name": "腹膜后血肿",
            "mastery": "掌握"
        }
    ],
    "急腹症": [
        {
            "name": "急腹症",
            "mastery": "掌握"
        }
    ],
    "十二指肠疾病": [
        {
            "name": "十二指肠溃疡",
            "mastery": "掌握"
        },
        {
            "name": "胃溃疡",
            "mastery": "掌握"
        },
        {
            "name": "胃癌",
            "mastery": "掌握"
        }
    ],
    "小肠和结肠疾病": [
        {
            "name": "克罗恩病",
            "mastery": "掌握"
        },
        {
            "name": "断肠综合征",
            "mastery": "掌握"
        },
        {
            "name": "溃疡性结肠炎",
            "mastery": "掌握"
        },
        {
            "name": "结肠息肉病",
            "mastery": "掌握"
        },
        {
            "name": "结肠癌",
            "mastery": "掌握"
        },
        {
            "name": "肠梗阻",
            "mastery": "掌握"
        },
        {
            "name": "肠瘘",
            "mastery": "掌握"
        },
        {
            "name": "肠系膜血管病",
            "mastery": "掌握"
        }
    ],
    "阑尾疾病": [
        {
            "name": "急性阑尾炎",
            "mastery": "掌握"
        },
        {
            "name": "慢性阑尾炎",
            "mastery": "掌握"
        }
    ],
    "直肠疾病": [
        {
            "name": "痔",
            "mastery": "掌握"
        },
        {
            "name": "直肠息肉病",
            "mastery": "掌握"
        },
        {
            "name": "直肠癌",
            "mastery": "掌握"
        },
        {
            "name": "直肠肛管周围脓肿",
            "mastery": "掌握"
        },
        {
            "name": "肛瘘",
            "mastery": "掌握"
        },
        {
            "name": "肛裂",
            "mastery": "掌握"
        }
    ],
    "腹膜和腹膜腔感染": [
        {
            "name": "急性腹膜炎",
            "mastery": "掌握"
        },
        {
            "name": "结核性腹膜炎",
            "mastery": "掌握"
        },
        {
            "name": "腹腔脓肿",
            "mastery": "掌握"
        }
    ],
    "肝脏疾病": [
        {
            "name": "原发性肝癌",
            "mastery": "掌握"
        },
        {
            "name": "肝包虫病",
            "mastery": "掌握"
        },
        {
            "name": "肝脓肿",
            "mastery": "掌握"
        },
        {
            "name": "肝血管瘤",
            "mastery": "掌握"
        }
    ],
    "门脉高压症": [
        {
            "name": "门脉高压症",
            "mastery": "掌握"
        }
    ],
    "胆系疾病": [
        {
            "name": "急性梗阻性化脓性胆管炎",
            "mastery": "掌握"
        },
        {
            "name": "急性胆囊炎",
            "mastery": "掌握"
        },
        {
            "name": "胆囊癌",
            "mastery": "掌握"
        },
        {
            "name": "胆囊结石",
            "mastery": "掌握"
        },
        {
            "name": "胆管癌",
            "mastery": "掌握"
        },
        {
            "name": "胆管结石",
            "mastery": "掌握"
        }
    ],
    "胰腺疾病": [
        {
            "name": "壶腹周围癌",
            "mastery": "掌握"
        },
        {
            "name": "急性胰腺炎",
            "mastery": "掌握"
        },
        {
            "name": "慢性胰腺炎",
            "mastery": "掌握"
        },
        {
            "name": "胰腺假性囊肿",
            "mastery": "掌握"
        },
        {
            "name": "胰腺癌",
            "mastery": "掌握"
        }
    ],
    "消化道出血": [
        {
            "name": "上消化道出血",
            "mastery": "掌握"
        },
        {
            "name": "下消化道出血",
            "mastery": "掌握"
        }
    ],
    "外伤": [
        {
            "name": "创伤性窒息",
            "mastery": "掌握"
        },
        {
            "name": "心脏损伤",
            "mastery": "掌握"
        },
        {
            "name": "气管损伤",
            "mastery": "掌握"
        },
        {
            "name": "气胸",
            "mastery": "掌握"
        },
        {
            "name": "肋骨骨折",
            "mastery": "掌握"
        },
        {
            "name": "肺爆震伤",
            "mastery": "掌握"
        },
        {
            "name": "胸腹联合伤",
            "mastery": "掌握"
        },
        {
            "name": "血胸",
            "mastery": "掌握"
        }
    ],
    "肺部肿瘤": [
        {
            "name": "肺癌",
            "mastery": "掌握"
        }
    ],
    "食管良性疾病": [
        {
            "name": "贲门失弛缓症",
            "mastery": "掌握"
        },
        {
            "name": "食管化学灼伤",
            "mastery": "掌握"
        },
        {
            "name": "食管憩室",
            "mastery": "掌握"
        }
    ],
    "食管恶性疾病": [
        {
            "name": "食管癌",
            "mastery": "掌握"
        }
    ],
    "纵隔膈肌疾病": [
        {
            "name": "原发性纵隔肿瘤",
            "mastery": "掌握"
        },
        {
            "name": "膈疝",
            "mastery": "掌握"
        },
        {
            "name": "重症肌无力",
            "mastery": "掌握"
        }
    ],
    "先天性心脏病": [
        {
            "name": "主动脉缩窄",
            "mastery": "掌握"
        },
        {
            "name": "动脉导管未闭",
            "mastery": "掌握"
        },
        {
            "name": "室间隔缺损",
            "mastery": "掌握"
        },
        {
            "name": "房间隔缺损",
            "mastery": "掌握"
        },
        {
            "name": "法洛四联症",
            "mastery": "掌握"
        }
    ],
    "心脏瓣膜病": [
        {
            "name": "肺动脉瓣狭窄",
            "mastery": "了解"
        },
        {
            "name": "主动脉瓣关闭不全",
            "mastery": "掌握"
        },
        {
            "name": "主动脉瓣狭窄",
            "mastery": "掌握"
        },
        {
            "name": "二尖瓣关闭不全",
            "mastery": "掌握"
        },
        {
            "name": "二尖瓣狭窄",
            "mastery": "掌握"
        }
    ],
    "大血管病变": [
        {
            "name": "主动脉窦动脉瘤破裂",
            "mastery": "了解"
        },
        {
            "name": "胸主动脉瘤",
            "mastery": "了解"
        },
        {
            "name": "主动脉夹层及夹层动脉瘤",
            "mastery": "掌握"
        }
    ],
    "肿瘤": [
        {
            "name": "前列腺癌",
            "mastery": "掌握"
        },
        {
            "name": "睾丸肿瘤",
            "mastery": "掌握"
        },
        {
            "name": "肾癌",
            "mastery": "掌握"
        },
        {
            "name": "膀胱癌",
            "mastery": "掌握"
        },
        {
            "name": "阴茎癌",
            "mastery": "掌握"
        }
    ],
    "结石": [
        {
            "name": "肾结石",
            "mastery": "掌握"
        },
        {
            "name": "膀胱结石",
            "mastery": "掌握"
        },
        {
            "name": "输尿管结石",
            "mastery": "掌握"
        }
    ],
    "前列腺增生及泌尿系梗阻": [
        {
            "name": "泌尿系梗阻",
            "mastery": "掌握"
        },
        {
            "name": "良性前列腺增生",
            "mastery": "掌握"
        }
    ],
    "泌尿系感染": [
        {
            "name": "一般尿路感染",
            "mastery": "掌握"
        },
        {
            "name": "前列腺炎",
            "mastery": "掌握"
        },
        {
            "name": "泌尿生殖系统结核",
            "mastery": "掌握"
        }
    ],
    "泌尿系损伤": [
        {
            "name": "尿道损伤",
            "mastery": "掌握"
        },
        {
            "name": "肾损伤",
            "mastery": "掌握"
        },
        {
            "name": "膀胱破裂",
            "mastery": "掌握"
        }
    ],
    "肾上腺外科": [
        {
            "name": "嗜铬细胞瘤",
            "mastery": "了解"
        },
        {
            "name": "皮质腺瘤",
            "mastery": "了解"
        }
    ],
    "临床常见病种": [
        {
            "name": "性别畸形",
            "mastery": "了解"
        },
        {
            "name": "肢体淋巴水肿",
            "mastery": "了解"
        },
        {
            "name": "颌面外伤",
            "mastery": "掌握"
        },
        {
            "name": "上肢瘢痕挛缩畸形",
            "mastery": "熟悉"
        },
        {
            "name": "乳房畸形和缺损",
            "mastery": "熟悉"
        },
        {
            "name": "会阴畸形和缺损",
            "mastery": "熟悉"
        },
        {
            "name": "先天性唇腭裂",
            "mastery": "熟悉"
        },
        {
            "name": "唇颊部畸形缺损",
            "mastery": "熟悉"
        },
        {
            "name": "外生殖器畸形和缺损",
            "mastery": "熟悉"
        },
        {
            "name": "头皮损伤",
            "mastery": "熟悉"
        },
        {
            "name": "眼部畸形和缺损",
            "mastery": "熟悉"
        },
        {
            "name": "耳廓畸形和缺损",
            "mastery": "熟悉"
        },
        {
            "name": "肛周畸形和缺损",
            "mastery": "熟悉"
        },
        {
            "name": "面部烧伤晚期整形",
            "mastery": "熟悉"
        },
        {
            "name": "颅面外科",
            "mastery": "熟悉"
        },
        {
            "name": "鼻部畸形和缺损",
            "mastery": "熟悉"
        }
    ],
    "关节损伤": [
        {
            "name": "桡骨小头半脱位",
            "mastery": "了解"
        },
        {
            "name": "桡骨小头骨折",
            "mastery": "了解"
        },
        {
            "name": "前臂双骨折",
            "mastery": "掌握"
        },
        {
            "name": "桡骨远端骨折",
            "mastery": "掌握"
        },
        {
            "name": "股骨干骨折",
            "mastery": "掌握"
        },
        {
            "name": "股骨粗隆间骨折",
            "mastery": "掌握"
        },
        {
            "name": "股骨颈骨折",
            "mastery": "掌握"
        },
        {
            "name": "股骨髁间髁上骨折",
            "mastery": "掌握"
        },
        {
            "name": "肱骨干骨折",
            "mastery": "掌握"
        },
        {
            "name": "肱骨近端骨折",
            "mastery": "掌握"
        },
        {
            "name": "肱骨髁上髁间骨折",
            "mastery": "掌握"
        },
        {
            "name": "胫腓骨干骨折",
            "mastery": "掌握"
        },
        {
            "name": "胫骨平台骨折",
            "mastery": "掌握"
        },
        {
            "name": "膝关节半月板损伤",
            "mastery": "掌握"
        },
        {
            "name": "膝关节韧带损伤",
            "mastery": "掌握"
        },
        {
            "name": "趾骨骨折",
            "mastery": "掌握"
        },
        {
            "name": "跖骨骨折",
            "mastery": "掌握"
        },
        {
            "name": "距骨骨折",
            "mastery": "掌握"
        },
        {
            "name": "跟腱断裂",
            "mastery": "掌握"
        },
        {
            "name": "跟骨骨折",
            "mastery": "掌握"
        },
        {
            "name": "踝部扭伤",
            "mastery": "掌握"
        },
        {
            "name": "踝部骨折",
            "mastery": "掌握"
        },
        {
            "name": "锁骨骨折",
            "mastery": "掌握"
        },
        {
            "name": "髋关节脱位",
            "mastery": "掌握"
        },
        {
            "name": "髌骨脱位",
            "mastery": "掌握"
        },
        {
            "name": "髌骨骨折",
            "mastery": "掌握"
        }
    ],
    "手外伤": [
        {
            "name": "手部先天性畸形",
            "mastery": "了解"
        },
        {
            "name": "手部肿瘤",
            "mastery": "了解"
        },
        {
            "name": "切割伤",
            "mastery": "掌握"
        },
        {
            "name": "手刺伤",
            "mastery": "掌握"
        },
        {
            "name": "手外伤",
            "mastery": "掌握"
        },
        {
            "name": "手部骨折与脱位",
            "mastery": "掌握"
        },
        {
            "name": "挤压伤",
            "mastery": "掌握"
        },
        {
            "name": "撕脱伤",
            "mastery": "掌握"
        },
        {
            "name": "断肢再植",
            "mastery": "掌握"
        },
        {
            "name": "神经损伤",
            "mastery": "掌握"
        },
        {
            "name": "肌腱损伤",
            "mastery": "掌握"
        },
        {
            "name": "血管损伤",
            "mastery": "掌握"
        }
    ],
    "脊柱及骨盆骨折": [
        {
            "name": "脊柱骨折",
            "mastery": "了解"
        },
        {
            "name": "脊髓损伤",
            "mastery": "了解"
        },
        {
            "name": "骨盆骨折",
            "mastery": "了解"
        }
    ],
    "腰腿痛及肩颈痛": [
        {
            "name": "创伤后严重脊柱后凸畸形",
            "mastery": "了解"
        },
        {
            "name": "结核严重脊柱后凸畸形",
            "mastery": "了解"
        },
        {
            "name": "脊柱侧弯畸形",
            "mastery": "了解"
        },
        {
            "name": "高位颈椎畸形",
            "mastery": "了解"
        },
        {
            "name": "急性腰扭伤",
            "mastery": "掌握"
        },
        {
            "name": "腰椎滑脱症",
            "mastery": "掌握"
        },
        {
            "name": "腰椎管狭窄",
            "mastery": "掌握"
        },
        {
            "name": "腰椎间盘突出症",
            "mastery": "掌握"
        },
        {
            "name": "颈椎病",
            "mastery": "掌握"
        },
        {
            "name": "颈肩部软组织损伤",
            "mastery": "掌握"
        }
    ],
    "骨关节病": [
        {
            "name": "化脓性关节炎",
            "mastery": "掌握"
        },
        {
            "name": "化脓性骨髓炎",
            "mastery": "掌握"
        },
        {
            "name": "强直性脊柱炎",
            "mastery": "掌握"
        },
        {
            "name": "拇外翻",
            "mastery": "掌握"
        },
        {
            "name": "类风湿关节炎",
            "mastery": "掌握"
        },
        {
            "name": "股骨头坏死",
            "mastery": "掌握"
        },
        {
            "name": "足踝无菌性炎性病变",
            "mastery": "掌握"
        },
        {
            "name": "足踝部位常见慢性损伤",
            "mastery": "掌握"
        },
        {
            "name": "骨与关节结核",
            "mastery": "掌握"
        },
        {
            "name": "骨关节炎",
            "mastery": "掌握"
        }
    ],
    "运动医学": [
        {
            "name": "肘关节运动损伤",
            "mastery": "掌握"
        },
        {
            "name": "肩袖损伤",
            "mastery": "掌握"
        },
        {
            "name": "腕关节运动损伤",
            "mastery": "掌握"
        },
        {
            "name": "膝关节运动损伤",
            "mastery": "掌握"
        },
        {
            "name": "足踝关节运动损伤",
            "mastery": "掌握"
        },
        {
            "name": "髋关节运动损伤",
            "mastery": "掌握"
        }
    ],
    "关节脱位": [
        {
            "name": "肘关节脱位",
            "mastery": "掌握"
        },
        {
            "name": "肩关节脱位",
            "mastery": "掌握"
        },
        {
            "name": "膝关节脱位",
            "mastery": "掌握"
        },
        {
            "name": "髋关节脱位",
            "mastery": "掌握"
        }
    ],
    "周围神经损伤": [
        {
            "name": "坐骨神经损伤",
            "mastery": "掌握"
        },
        {
            "name": "尺神经损伤",
            "mastery": "掌握"
        },
        {
            "name": "桡神经损伤",
            "mastery": "掌握"
        },
        {
            "name": "正中神经损伤",
            "mastery": "掌握"
        },
        {
            "name": "胫神经损伤",
            "mastery": "掌握"
        },
        {
            "name": "腓总神经损伤",
            "mastery": "掌握"
        },
        {
            "name": "臂丛神经损伤",
            "mastery": "掌握"
        }
    ],
    "骨软组织肿瘤": [
        {
            "name": "纤维异样增殖症",
            "mastery": "了解"
        },
        {
            "name": "骨囊肿",
            "mastery": "了解"
        },
        {
            "name": "尤因肉瘤",
            "mastery": "掌握"
        },
        {
            "name": "软骨瘤",
            "mastery": "掌握"
        },
        {
            "name": "软骨肉瘤",
            "mastery": "掌握"
        },
        {
            "name": "骨巨细胞瘤",
            "mastery": "掌握"
        },
        {
            "name": "骨样骨瘤",
            "mastery": "掌握"
        },
        {
            "name": "骨瘤",
            "mastery": "掌握"
        },
        {
            "name": "骨肉瘤",
            "mastery": "掌握"
        },
        {
            "name": "骨软骨瘤",
            "mastery": "掌握"
        }
    ],
    "小儿普通外科": [
        {
            "name": "便失禁",
            "mastery": "掌握"
        },
        {
            "name": "便秘",
            "mastery": "掌握"
        },
        {
            "name": "先天性巨结肠",
            "mastery": "掌握"
        },
        {
            "name": "先天性胆总管囊肿",
            "mastery": "掌握"
        },
        {
            "name": "创伤肝破裂",
            "mastery": "掌握"
        },
        {
            "name": "创伤脾破裂",
            "mastery": "掌握"
        },
        {
            "name": "卵黄管发育异常",
            "mastery": "掌握"
        },
        {
            "name": "大网膜囊肿",
            "mastery": "掌握"
        },
        {
            "name": "急性阑尾炎",
            "mastery": "掌握"
        },
        {
            "name": "慢性阑尾炎",
            "mastery": "掌握"
        },
        {
            "name": "消化道穿孔",
            "mastery": "掌握"
        },
        {
            "name": "消化道重复畸形",
            "mastery": "掌握"
        },
        {
            "name": "直肠息肉",
            "mastery": "掌握"
        },
        {
            "name": "结肠息肉",
            "mastery": "掌握"
        },
        {
            "name": "肠套叠",
            "mastery": "掌握"
        },
        {
            "name": "肠梗阻",
            "mastery": "掌握"
        },
        {
            "name": "肠系膜囊肿",
            "mastery": "掌握"
        },
        {
            "name": "胰腺炎",
            "mastery": "掌握"
        },
        {
            "name": "腹股沟斜疝",
            "mastery": "掌握"
        },
        {
            "name": "软组织感染",
            "mastery": "掌握"
        }
    ],
    "小儿骨科": [
        {
            "name": "先天性肌性斜颈",
            "mastery": "掌握"
        },
        {
            "name": "先天性胫骨假关节",
            "mastery": "掌握"
        },
        {
            "name": "前臂双骨折",
            "mastery": "掌握"
        },
        {
            "name": "发育性髋脱位",
            "mastery": "掌握"
        },
        {
            "name": "并指畸形",
            "mastery": "掌握"
        },
        {
            "name": "桡骨小头半脱位",
            "mastery": "掌握"
        },
        {
            "name": "桡骨远端骨折",
            "mastery": "掌握"
        },
        {
            "name": "狭窄性腱鞘炎",
            "mastery": "掌握"
        },
        {
            "name": "病理性骨折",
            "mastery": "掌握"
        },
        {
            "name": "股骨头骨折",
            "mastery": "掌握"
        },
        {
            "name": "股骨干骨折",
            "mastery": "掌握"
        },
        {
            "name": "股骨粗隆间骨折",
            "mastery": "掌握"
        },
        {
            "name": "股骨颈骨折",
            "mastery": "掌握"
        },
        {
            "name": "肢体不等长",
            "mastery": "掌握"
        },
        {
            "name": "肱骨干骨折",
            "mastery": "掌握"
        },
        {
            "name": "肱骨髁上骨折",
            "mastery": "掌握"
        },
        {
            "name": "脊柱侧弯",
            "mastery": "掌握"
        },
        {
            "name": "脑瘫后遗症",
            "mastery": "掌握"
        },
        {
            "name": "腘窝囊肿",
            "mastery": "掌握"
        },
        {
            "name": "膝内翻",
            "mastery": "掌握"
        },
        {
            "name": "膝外翻",
            "mastery": "掌握"
        },
        {
            "name": "赘生指",
            "mastery": "掌握"
        },
        {
            "name": "踝部骨折",
            "mastery": "掌握"
        },
        {
            "name": "锁骨骨折",
            "mastery": "掌握"
        },
        {
            "name": "面部骨折",
            "mastery": "掌握"
        },
        {
            "name": "颅骨骨折",
            "mastery": "掌握"
        },
        {
            "name": "马蹄内翻足",
            "mastery": "掌握"
        },
        {
            "name": "骨关节感染",
            "mastery": "掌握"
        },
        {
            "name": "骨盆骨折",
            "mastery": "掌握"
        },
        {
            "name": "骨肿瘤",
            "mastery": "掌握"
        }
    ],
    "小儿泌尿外科": [
        {
            "name": "先天性肾积水",
            "mastery": "掌握"
        },
        {
            "name": "包茎",
            "mastery": "掌握"
        },
        {
            "name": "尿道下裂",
            "mastery": "掌握"
        },
        {
            "name": "性别畸形",
            "mastery": "掌握"
        },
        {
            "name": "泌尿生殖系创伤",
            "mastery": "掌握"
        },
        {
            "name": "泌尿生殖系横纹肌肉瘤",
            "mastery": "掌握"
        },
        {
            "name": "睾丸肿瘤",
            "mastery": "掌握"
        },
        {
            "name": "精索静脉曲张",
            "mastery": "掌握"
        },
        {
            "name": "肾母细胞瘤",
            "mastery": "掌握"
        },
        {
            "name": "肾输尿管重复畸形",
            "mastery": "掌握"
        },
        {
            "name": "膀胱输尿管反流",
            "mastery": "掌握"
        },
        {
            "name": "输尿管口异位",
            "mastery": "掌握"
        },
        {
            "name": "隐匿阴茎",
            "mastery": "掌握"
        },
        {
            "name": "隐睾",
            "mastery": "掌握"
        },
        {
            "name": "鞘膜积液",
            "mastery": "掌握"
        }
    ],
    "新生儿外科": [
        {
            "name": "产伤",
            "mastery": "掌握"
        },
        {
            "name": "先天性巨结肠",
            "mastery": "掌握"
        },
        {
            "name": "先天性直肠肛门畸形",
            "mastery": "掌握"
        },
        {
            "name": "先天性肠旋转不良",
            "mastery": "掌握"
        },
        {
            "name": "先天性肠闭锁及狭窄",
            "mastery": "掌握"
        },
        {
            "name": "先天性肥厚性幽门狭窄",
            "mastery": "掌握"
        },
        {
            "name": "先天性胆道闭锁",
            "mastery": "掌握"
        },
        {
            "name": "先天性食管闭锁及气管食管瘘",
            "mastery": "掌握"
        },
        {
            "name": "新生儿坏死性小肠结肠炎",
            "mastery": "掌握"
        },
        {
            "name": "新生儿皮下坏疽",
            "mastery": "掌握"
        },
        {
            "name": "新生儿脐炎",
            "mastery": "掌握"
        },
        {
            "name": "新生儿膈疝",
            "mastery": "掌握"
        },
        {
            "name": "消化道穿孔",
            "mastery": "掌握"
        },
        {
            "name": "环形胰腺",
            "mastery": "掌握"
        },
        {
            "name": "脐膨出与腹裂",
            "mastery": "掌握"
        }
    ],
    "小儿肿瘤外科": [
        {
            "name": "卵巢肿瘤",
            "mastery": "掌握"
        },
        {
            "name": "淋巴管瘤",
            "mastery": "掌握"
        },
        {
            "name": "甲状腺肿瘤",
            "mastery": "掌握"
        },
        {
            "name": "畸胎瘤",
            "mastery": "掌握"
        },
        {
            "name": "神经母细胞瘤",
            "mastery": "掌握"
        },
        {
            "name": "肝肿瘤",
            "mastery": "掌握"
        },
        {
            "name": "肾上腺肿瘤",
            "mastery": "掌握"
        },
        {
            "name": "胰腺肿瘤",
            "mastery": "掌握"
        },
        {
            "name": "血管瘤",
            "mastery": "掌握"
        },
        {
            "name": "软组织肉瘤",
            "mastery": "掌握"
        }
    ],
    "小儿心胸外科": [
        {
            "name": "先天性肺囊性变",
            "mastery": "了解"
        },
        {
            "name": "先天性膈疝",
            "mastery": "了解"
        },
        {
            "name": "先天性膈膨升",
            "mastery": "了解"
        },
        {
            "name": "动脉导管未闭",
            "mastery": "了解"
        },
        {
            "name": "化脓性心包炎",
            "mastery": "了解"
        },
        {
            "name": "室间隔缺损",
            "mastery": "了解"
        },
        {
            "name": "房间隔缺损",
            "mastery": "了解"
        },
        {
            "name": "法洛四联症",
            "mastery": "了解"
        },
        {
            "name": "漏斗胸",
            "mastery": "了解"
        },
        {
            "name": "纵隔肿瘤",
            "mastery": "了解"
        },
        {
            "name": "脓胸",
            "mastery": "了解"
        },
        {
            "name": "鸡胸",
            "mastery": "了解"
        }
    ],
    "小儿神经外科": [
        {
            "name": "脊髓创伤",
            "mastery": "了解"
        },
        {
            "name": "脊髓栓系综合征",
            "mastery": "了解"
        },
        {
            "name": "脊髓肿瘤",
            "mastery": "了解"
        },
        {
            "name": "脑积水",
            "mastery": "了解"
        },
        {
            "name": "脑脊膜膨出",
            "mastery": "了解"
        },
        {
            "name": "颅内出血",
            "mastery": "了解"
        },
        {
            "name": "颅内肿瘤",
            "mastery": "了解"
        },
        {
            "name": "颅脑创伤",
            "mastery": "了解"
        }
    ],
    "小儿烧伤整形外科": [
        {
            "name": "体表肿物",
            "mastery": "了解"
        },
        {
            "name": "各种烧/烫伤",
            "mastery": "了解"
        },
        {
            "name": "多指畸形",
            "mastery": "了解"
        },
        {
            "name": "并指畸形",
            "mastery": "了解"
        },
        {
            "name": "淋巴管瘤",
            "mastery": "了解"
        },
        {
            "name": "电击伤",
            "mastery": "了解"
        },
        {
            "name": "瘢痕",
            "mastery": "了解"
        },
        {
            "name": "血管瘤",
            "mastery": "了解"
        }
    ],
    "妇科常见病": [
        {
            "name": "外阴及阴道炎症",
            "mastery": "掌握"
        },
        {
            "name": "子宫内膜异位症",
            "mastery": "掌握"
        },
        {
            "name": "子宫腺肌症",
            "mastery": "掌握"
        },
        {
            "name": "子宫颈炎",
            "mastery": "掌握"
        },
        {
            "name": "盆腔炎性疾病",
            "mastery": "掌握"
        }
    ],
    "妇科复杂疾病": [
        {
            "name": "外阴上皮非瘤样病变",
            "mastery": "了解"
        },
        {
            "name": "女性生殖系统发育异常",
            "mastery": "了解"
        },
        {
            "name": "女性生殖系统损伤疾病",
            "mastery": "了解"
        },
        {
            "name": "盆底功能障碍性疾病",
            "mastery": "了解"
        },
        {
            "name": "性传播疾病",
            "mastery": "掌握"
        },
        {
            "name": "生殖器结核",
            "mastery": "掌握"
        }
    ],
    "妇科常见危重急症": [
        {
            "name": "异位妊娠",
            "mastery": "掌握"
        },
        {
            "name": "异常子宫出血",
            "mastery": "掌握"
        },
        {
            "name": "急性盆腔炎",
            "mastery": "掌握"
        },
        {
            "name": "流产",
            "mastery": "掌握"
        },
        {
            "name": "附件肿物扭转",
            "mastery": "掌握"
        },
        {
            "name": "附件肿物破裂",
            "mastery": "掌握"
        },
        {
            "name": "黄体破裂",
            "mastery": "掌握"
        }
    ],
    "妇科良性肿瘤": [
        {
            "name": "外阴上皮内瘤变",
            "mastery": "了解"
        },
        {
            "name": "外阴良性肿瘤",
            "mastery": "了解"
        },
        {
            "name": "卵巢良性肿瘤",
            "mastery": "掌握"
        },
        {
            "name": "子宫内膜增生",
            "mastery": "掌握"
        },
        {
            "name": "子宫肌瘤",
            "mastery": "掌握"
        },
        {
            "name": "子宫颈上皮内瘤变",
            "mastery": "掌握"
        },
        {
            "name": "葡萄胎",
            "mastery": "掌握"
        }
    ],
    "妇科恶性肿瘤": [
        {
            "name": "外阴恶性肿瘤",
            "mastery": "了解"
        },
        {
            "name": "子宫肉瘤",
            "mastery": "了解"
        },
        {
            "name": "输卵管恶性肿瘤",
            "mastery": "了解"
        },
        {
            "name": "卵巢恶性肿瘤",
            "mastery": "掌握"
        },
        {
            "name": "妊娠滋养细胞肿瘤",
            "mastery": "掌握"
        },
        {
            "name": "子宫内膜癌",
            "mastery": "掌握"
        },
        {
            "name": "子宫颈癌",
            "mastery": "掌握"
        }
    ],
    "妇科内分泌疾病": [
        {
            "name": "多囊卵巢综合征",
            "mastery": "了解"
        },
        {
            "name": "痛经",
            "mastery": "了解"
        },
        {
            "name": "经前期综合征",
            "mastery": "了解"
        },
        {
            "name": "绝经综合征",
            "mastery": "了解"
        },
        {
            "name": "高泌乳素血症",
            "mastery": "了解"
        },
        {
            "name": "异常子宫出血",
            "mastery": "掌握"
        },
        {
            "name": "闭经",
            "mastery": "掌握"
        }
    ],
    "辅助生育技术": [
        {
            "name": "不孕症",
            "mastery": "了解"
        },
        {
            "name": "辅助生育技术",
            "mastery": "了解"
        }
    ],
    "正常分娩与产褥": [
        {
            "name": "正常产褥",
            "mastery": "掌握"
        },
        {
            "name": "正常分娩",
            "mastery": "掌握"
        }
    ],
    "病理妊娠": [
        {
            "name": "妊娠剧吐",
            "mastery": "掌握"
        },
        {
            "name": "妊娠期糖尿病",
            "mastery": "掌握"
        },
        {
            "name": "妊娠期肝内胆汁淤积症",
            "mastery": "掌握"
        },
        {
            "name": "妊娠期高血压疾病",
            "mastery": "掌握"
        },
        {
            "name": "早产",
            "mastery": "掌握"
        },
        {
            "name": "羊水过多",
            "mastery": "掌握"
        },
        {
            "name": "羊水过少",
            "mastery": "掌握"
        },
        {
            "name": "胎膜早破",
            "mastery": "掌握"
        },
        {
            "name": "过期妊娠",
            "mastery": "掌握"
        }
    ],
    "异常分娩": [
        {
            "name": "产力异常",
            "mastery": "掌握"
        },
        {
            "name": "产道异常",
            "mastery": "掌握"
        },
        {
            "name": "异常产程",
            "mastery": "掌握"
        },
        {
            "name": "胎位异常",
            "mastery": "掌握"
        }
    ],
    "异常产褥": [
        {
            "name": "产褥抑郁症",
            "mastery": "了解"
        },
        {
            "name": "产褥感染",
            "mastery": "掌握"
        },
        {
            "name": "晚期产后出血",
            "mastery": "掌握"
        }
    ],
    "分娩期并发症": [
        {
            "name": "产后出血",
            "mastery": "掌握"
        },
        {
            "name": "子宫破裂",
            "mastery": "掌握"
        },
        {
            "name": "羊水栓塞",
            "mastery": "掌握"
        },
        {
            "name": "脐带异常",
            "mastery": "掌握"
        }
    ],
    "产前检查与孕期保健": [
        {
            "name": "孕妇管理",
            "mastery": "了解"
        },
        {
            "name": "孕期营养",
            "mastery": "了解"
        },
        {
            "name": "产前检查",
            "mastery": "掌握"
        },
        {
            "name": "孕期常见症状",
            "mastery": "掌握"
        }
    ],
    "妊娠合并内外科疾病": [
        {
            "name": "妊娠合并ITP",
            "mastery": "了解"
        },
        {
            "name": "妊娠合并心脏病",
            "mastery": "了解"
        },
        {
            "name": "妊娠合并急性脂肪肝",
            "mastery": "了解"
        },
        {
            "name": "妊娠合并肝炎",
            "mastery": "了解"
        },
        {
            "name": "妊娠合并胰腺炎",
            "mastery": "了解"
        },
        {
            "name": "妊娠合并贫血",
            "mastery": "了解"
        },
        {
            "name": "妊娠合并阑尾炎",
            "mastery": "了解"
        }
    ],
    "妊娠合并感染性疾病": [
        {
            "name": "妊娠合并TORCH综合征",
            "mastery": "了解"
        },
        {
            "name": "妊娠合并尖锐湿疣",
            "mastery": "了解"
        },
        {
            "name": "妊娠合并支原体感染",
            "mastery": "了解"
        },
        {
            "name": "妊娠合并梅毒",
            "mastery": "了解"
        },
        {
            "name": "妊娠合并沙眼衣原体感染",
            "mastery": "了解"
        },
        {
            "name": "妊娠合并淋病",
            "mastery": "了解"
        },
        {
            "name": "妊娠合并生殖器疱疹",
            "mastery": "了解"
        },
        {
            "name": "妊娠合并获得性免疫缺陷综合征",
            "mastery": "了解"
        }
    ],
    "胎儿异常": [
        {
            "name": "巨大胎儿",
            "mastery": "了解"
        },
        {
            "name": "死胎",
            "mastery": "了解"
        },
        {
            "name": "胎儿先天畸形",
            "mastery": "了解"
        },
        {
            "name": "胎儿生长受限",
            "mastery": "了解"
        },
        {
            "name": "胎儿窘迫",
            "mastery": "掌握"
        }
    ],
    "产前出血": [
        {
            "name": "前置胎盘",
            "mastery": "掌握"
        },
        {
            "name": "胎盘早剥",
            "mastery": "掌握"
        }
    ],
    "多胎妊娠": [
        {
            "name": "多胎妊娠",
            "mastery": "掌握"
        }
    ],
    "眼睑疾病": [
        {
            "name": "眼睑基底细胞癌",
            "mastery": "了解"
        },
        {
            "name": "眼睑血管瘤",
            "mastery": "了解"
        },
        {
            "name": "睑皮脂腺癌",
            "mastery": "了解"
        },
        {
            "name": "鳞状上皮癌",
            "mastery": "了解"
        },
        {
            "name": "上睑下垂",
            "mastery": "掌握"
        },
        {
            "name": "内眦赘皮",
            "mastery": "掌握"
        },
        {
            "name": "带状疱疹性眼睑炎",
            "mastery": "掌握"
        },
        {
            "name": "眼睑外翻",
            "mastery": "掌握"
        },
        {
            "name": "睑内翻",
            "mastery": "掌握"
        },
        {
            "name": "睑板腺囊肿",
            "mastery": "掌握"
        },
        {
            "name": "睑缘炎",
            "mastery": "掌握"
        },
        {
            "name": "睑腺炎",
            "mastery": "掌握"
        }
    ],
    "泪器疾病": [
        {
            "name": "慢性泪囊炎",
            "mastery": "掌握"
        },
        {
            "name": "泪腺混合瘤",
            "mastery": "掌握"
        },
        {
            "name": "泪腺炎",
            "mastery": "掌握"
        },
        {
            "name": "泪道阻塞性疾病",
            "mastery": "掌握"
        }
    ],
    "结膜疾病": [
        {
            "name": "干眼",
            "mastery": "掌握"
        },
        {
            "name": "睑裂斑",
            "mastery": "掌握"
        },
        {
            "name": "结膜免疫性炎症",
            "mastery": "掌握"
        },
        {
            "name": "结膜病毒性炎症",
            "mastery": "掌握"
        },
        {
            "name": "结膜皮样脂肪瘤",
            "mastery": "掌握"
        },
        {
            "name": "结膜细菌性炎症",
            "mastery": "掌握"
        },
        {
            "name": "结膜色素痣",
            "mastery": "掌握"
        },
        {
            "name": "结膜衣原体性炎症",
            "mastery": "掌握"
        },
        {
            "name": "结膜过敏性炎症",
            "mastery": "掌握"
        },
        {
            "name": "翼状胬肉",
            "mastery": "掌握"
        }
    ],
    "角膜病": [
        {
            "name": "圆锥角膜",
            "mastery": "掌握"
        },
        {
            "name": "大泡性角膜病变",
            "mastery": "掌握"
        },
        {
            "name": "暴露性角膜病",
            "mastery": "掌握"
        },
        {
            "name": "神经麻痹性角膜病",
            "mastery": "掌握"
        },
        {
            "name": "药源性角结膜病变",
            "mastery": "掌握"
        },
        {
            "name": "角膜免疫性炎症",
            "mastery": "掌握"
        },
        {
            "name": "角膜病毒性炎症",
            "mastery": "掌握"
        },
        {
            "name": "角膜皮样瘤",
            "mastery": "掌握"
        },
        {
            "name": "角膜真菌性炎症",
            "mastery": "掌握"
        },
        {
            "name": "角膜细菌性炎症",
            "mastery": "掌握"
        },
        {
            "name": "角膜营养不良",
            "mastery": "掌握"
        },
        {
            "name": "边缘性角膜变性",
            "mastery": "掌握"
        }
    ],
    "巩膜炎": [
        {
            "name": "巩膜炎",
            "mastery": "掌握"
        },
        {
            "name": "表层巩膜炎",
            "mastery": "掌握"
        }
    ],
    "葡萄膜病": [
        {
            "name": "Behcet病",
            "mastery": "了解"
        },
        {
            "name": "Fuchs综合征",
            "mastery": "了解"
        },
        {
            "name": "Vogt-小柳-原田综合征",
            "mastery": "了解"
        },
        {
            "name": "中间葡萄膜炎",
            "mastery": "了解"
        },
        {
            "name": "交感性眼炎",
            "mastery": "了解"
        },
        {
            "name": "后葡萄膜炎",
            "mastery": "了解"
        },
        {
            "name": "急性视网膜坏死综合征",
            "mastery": "了解"
        },
        {
            "name": "脉络膜血管瘤",
            "mastery": "了解"
        },
        {
            "name": "脉络膜黑色素瘤",
            "mastery": "了解"
        },
        {
            "name": "虹膜囊肿",
            "mastery": "了解"
        },
        {
            "name": "前葡萄膜炎",
            "mastery": "掌握"
        }
    ],
    "晶状体病": [
        {
            "name": "代谢性白内障",
            "mastery": "掌握"
        },
        {
            "name": "先天性白内障",
            "mastery": "掌握"
        },
        {
            "name": "后发性白内障",
            "mastery": "掌握"
        },
        {
            "name": "外伤性白内障",
            "mastery": "掌握"
        },
        {
            "name": "并发性白内障",
            "mastery": "掌握"
        },
        {
            "name": "晶状体形态异常",
            "mastery": "掌握"
        },
        {
            "name": "晶状体脱位",
            "mastery": "掌握"
        },
        {
            "name": "老年性白内障",
            "mastery": "掌握"
        }
    ],
    "青光眼": [
        {
            "name": "剥脱性青光眼",
            "mastery": "了解"
        },
        {
            "name": "原发性婴幼儿型青光眼",
            "mastery": "了解"
        },
        {
            "name": "恶性青光眼",
            "mastery": "了解"
        },
        {
            "name": "新生血管性青光眼",
            "mastery": "了解"
        },
        {
            "name": "糖皮质激素性青光眼",
            "mastery": "了解"
        },
        {
            "name": "色素性青光眼",
            "mastery": "了解"
        },
        {
            "name": "虹膜角膜内皮综合征",
            "mastery": "了解"
        },
        {
            "name": "青光眼睫状体炎综合征",
            "mastery": "了解"
        },
        {
            "name": "原发性开角型青光眼",
            "mastery": "掌握"
        },
        {
            "name": "急性闭角型青光眼",
            "mastery": "掌握"
        },
        {
            "name": "慢性闭角型青光眼",
            "mastery": "掌握"
        }
    ],
    "玻璃体视网膜疾病": [
        {
            "name": "BEST病",
            "mastery": "了解"
        },
        {
            "name": "Stargardt病",
            "mastery": "了解"
        },
        {
            "name": "中心性浆液性脉络膜视网膜病变",
            "mastery": "了解"
        },
        {
            "name": "渗出性视网膜脱离",
            "mastery": "了解"
        },
        {
            "name": "特发性脉络膜新生血管",
            "mastery": "了解"
        },
        {
            "name": "病理性近视改变",
            "mastery": "了解"
        },
        {
            "name": "老年性黄斑变性",
            "mastery": "了解"
        },
        {
            "name": "视网膜劈裂症",
            "mastery": "了解"
        },
        {
            "name": "视网膜母细胞瘤",
            "mastery": "了解"
        },
        {
            "name": "视网膜血管瘤vonHippel病",
            "mastery": "了解"
        },
        {
            "name": "黄斑前膜",
            "mastery": "了解"
        },
        {
            "name": "黄斑囊性水肿",
            "mastery": "了解"
        },
        {
            "name": "黄斑裂孔",
            "mastery": "了解"
        },
        {
            "name": "Coats病",
            "mastery": "掌握"
        },
        {
            "name": "增生性玻璃体视网膜病变",
            "mastery": "掌握"
        },
        {
            "name": "孔源性视网膜脱离",
            "mastery": "掌握"
        },
        {
            "name": "牵引性视网膜脱离",
            "mastery": "掌握"
        },
        {
            "name": "玻璃体后脱离",
            "mastery": "掌握"
        },
        {
            "name": "玻璃体液化",
            "mastery": "掌握"
        },
        {
            "name": "玻璃体混浊",
            "mastery": "掌握"
        },
        {
            "name": "玻璃体炎症",
            "mastery": "掌握"
        },
        {
            "name": "玻璃体积血",
            "mastery": "掌握"
        },
        {
            "name": "糖尿病性视网膜病变",
            "mastery": "掌握"
        },
        {
            "name": "视网膜动脉阻塞",
            "mastery": "掌握"
        },
        {
            "name": "视网膜色素变性",
            "mastery": "掌握"
        },
        {
            "name": "视网膜静脉周围炎",
            "mastery": "掌握"
        },
        {
            "name": "视网膜静脉阻塞",
            "mastery": "掌握"
        }
    ],
    "视路疾病": [
        {
            "name": "Leber遗传性视神经炎",
            "mastery": "了解"
        },
        {
            "name": "视乳头水肿",
            "mastery": "了解"
        },
        {
            "name": "Adie瞳孔",
            "mastery": "掌握"
        },
        {
            "name": "Horner瞳孔",
            "mastery": "掌握"
        },
        {
            "name": "前部缺血性视神经病变",
            "mastery": "掌握"
        },
        {
            "name": "球后视神经炎",
            "mastery": "掌握"
        },
        {
            "name": "视乳头先天异常",
            "mastery": "掌握"
        },
        {
            "name": "视乳头炎",
            "mastery": "掌握"
        },
        {
            "name": "视乳头血管炎",
            "mastery": "掌握"
        }
    ],
    "视光学疾病": [
        {
            "name": "散光",
            "mastery": "掌握"
        },
        {
            "name": "老视",
            "mastery": "掌握"
        },
        {
            "name": "近视",
            "mastery": "掌握"
        },
        {
            "name": "远视",
            "mastery": "掌握"
        }
    ],
    "斜视与弱视": [
        {
            "name": "特殊类型斜视",
            "mastery": "了解"
        },
        {
            "name": "眼球震颤",
            "mastery": "了解"
        },
        {
            "name": "麻痹性斜视",
            "mastery": "了解"
        },
        {
            "name": "共同性斜视",
            "mastery": "掌握"
        },
        {
            "name": "弱视",
            "mastery": "掌握"
        }
    ],
    "眼眶病": [
        {
            "name": "海绵状血管瘤",
            "mastery": "了解"
        },
        {
            "name": "甲状腺相关眼病",
            "mastery": "了解"
        },
        {
            "name": "皮样囊肿",
            "mastery": "了解"
        },
        {
            "name": "眶筋膜炎",
            "mastery": "了解"
        },
        {
            "name": "眼眶炎性假瘤",
            "mastery": "了解"
        },
        {
            "name": "眼眶蜂窝织炎",
            "mastery": "了解"
        },
        {
            "name": "视神经脑膜瘤",
            "mastery": "了解"
        },
        {
            "name": "颈动脉海绵窦瘘",
            "mastery": "了解"
        }
    ],
    "眼外伤": [
        {
            "name": "化学伤",
            "mastery": "掌握"
        },
        {
            "name": "开放性眼球伤",
            "mastery": "掌握"
        },
        {
            "name": "异物伤",
            "mastery": "掌握"
        },
        {
            "name": "物理性眼外伤",
            "mastery": "掌握"
        },
        {
            "name": "眼附属器外伤",
            "mastery": "掌握"
        },
        {
            "name": "贯通伤",
            "mastery": "掌握"
        },
        {
            "name": "闭合伤",
            "mastery": "掌握"
        }
    ],
    "外耳疾病": [
        {
            "name": "先天性耳畸形",
            "mastery": "了解"
        },
        {
            "name": "耳道外伤",
            "mastery": "掌握"
        },
        {
            "name": "耳道异物",
            "mastery": "掌握"
        },
        {
            "name": "耳道炎症",
            "mastery": "掌握"
        }
    ],
    "中耳疾病及耳源性颅内并发症": [
        {
            "name": "耳硬化症",
            "mastery": "了解"
        },
        {
            "name": "面瘫",
            "mastery": "了解"
        },
        {
            "name": "分泌性中耳炎",
            "mastery": "掌握"
        },
        {
            "name": "化脓性中耳炎",
            "mastery": "掌握"
        },
        {
            "name": "急性中耳炎",
            "mastery": "掌握"
        },
        {
            "name": "慢性中耳炎",
            "mastery": "掌握"
        }
    ],
    "耳聋": [
        {
            "name": "人工听觉",
            "mastery": "了解"
        },
        {
            "name": "突发性耳聋",
            "mastery": "掌握"
        }
    ],
    "侧颅底肿瘤": [
        {
            "name": "中耳癌",
            "mastery": "了解"
        },
        {
            "name": "听神经瘤",
            "mastery": "了解"
        },
        {
            "name": "颈静脉体瘤",
            "mastery": "了解"
        }
    ],
    "鼻部常见疾病": [
        {
            "name": "鼻出血",
            "mastery": "掌握"
        },
        {
            "name": "鼻外伤",
            "mastery": "掌握"
        },
        {
            "name": "鼻腔鼻窦炎症",
            "mastery": "掌握"
        },
        {
            "name": "鼻腔鼻窦肿瘤",
            "mastery": "掌握"
        }
    ],
    "咽部炎症": [
        {
            "name": "急性咽炎",
            "mastery": "了解"
        },
        {
            "name": "慢性咽炎",
            "mastery": "了解"
        },
        {
            "name": "急性扁桃体炎",
            "mastery": "掌握"
        },
        {
            "name": "慢性扁桃体炎",
            "mastery": "掌握"
        },
        {
            "name": "腺样体肥大",
            "mastery": "掌握"
        }
    ],
    "咽部脓肿": [
        {
            "name": "咽后脓肿",
            "mastery": "了解"
        },
        {
            "name": "咽旁脓肿",
            "mastery": "了解"
        },
        {
            "name": "扁桃体周围脓肿",
            "mastery": "掌握"
        }
    ],
    "咽异物": [
        {
            "name": "咽异物",
            "mastery": "掌握"
        }
    ],
    "咽部肿瘤": [
        {
            "name": "颞下窝肿瘤",
            "mastery": "了解"
        },
        {
            "name": "鼻咽纤维血管瘤",
            "mastery": "了解"
        },
        {
            "name": "下咽癌",
            "mastery": "掌握"
        },
        {
            "name": "鼻咽癌",
            "mastery": "掌握"
        }
    ],
    "阻塞性睡眠呼吸暂停低通气综合征": [
        {
            "name": "阻塞性睡眠呼吸暂停低通气综合征",
            "mastery": "掌握"
        }
    ],
    "喉部炎症": [
        {
            "name": "声带小结",
            "mastery": "掌握"
        },
        {
            "name": "声带息肉",
            "mastery": "掌握"
        },
        {
            "name": "小儿急性喉炎",
            "mastery": "掌握"
        },
        {
            "name": "急性会厌炎",
            "mastery": "掌握"
        },
        {
            "name": "急性喉炎",
            "mastery": "掌握"
        },
        {
            "name": "慢性喉炎",
            "mastery": "掌握"
        }
    ],
    "喉外伤": [
        {
            "name": "喉狭窄",
            "mastery": "了解"
        },
        {
            "name": "喉部外伤",
            "mastery": "掌握"
        }
    ],
    "喉梗阻": [
        {
            "name": "喉梗阻",
            "mastery": "掌握"
        }
    ],
    "喉神经性疾病": [
        {
            "name": "喉神经性疾病",
            "mastery": "了解"
        }
    ],
    "喉部肿瘤": [
        {
            "name": "喉乳头状瘤",
            "mastery": "了解"
        },
        {
            "name": "喉癌",
            "mastery": "掌握"
        }
    ],
    "颈部肿块": [
        {
            "name": "其他颈部肿块",
            "mastery": "了解"
        },
        {
            "name": "甲状舌管囊肿",
            "mastery": "了解"
        },
        {
            "name": "腮裂囊肿及瘘管",
            "mastery": "了解"
        },
        {
            "name": "甲状腺癌",
            "mastery": "掌握"
        },
        {
            "name": "颈部淋巴结转移癌",
            "mastery": "掌握"
        }
    ],
    "气管、食管疾病": [
        {
            "name": "食管炎",
            "mastery": "了解"
        },
        {
            "name": "食管肿瘤",
            "mastery": "了解"
        },
        {
            "name": "食管腐蚀伤",
            "mastery": "了解"
        },
        {
            "name": "气管异物",
            "mastery": "掌握"
        },
        {
            "name": "食管异物",
            "mastery": "掌握"
        }
    ],
    "精神分裂症谱系及其他精神病性障碍": [
        {
            "name": "精神分裂症（偏执型）",
            "mastery": "掌握"
        },
        {
            "name": "精神分裂症（青春型）",
            "mastery": "掌握"
        },
        {
            "name": "精神分裂症（紧张型）",
            "mastery": "掌握"
        },
        {
            "name": "分裂情感性障碍",
            "mastery": "熟悉"
        },
        {
            "name": "急性短暂性精神病性障碍",
            "mastery": "熟悉"
        },
        {
            "name": "妄想性障碍",
            "mastery": "熟悉"
        },
        {
            "name": "精神分裂症后抑郁",
            "mastery": "了解"
        }
    ],
    "心境障碍": [
        {
            "name": "抑郁发作（单次）",
            "mastery": "掌握"
        },
        {
            "name": "复发性抑郁障碍",
            "mastery": "掌握"
        },
        {
            "name": "双相障碍（躁狂发作）",
            "mastery": "掌握"
        },
        {
            "name": "双相障碍（抑郁发作）",
            "mastery": "掌握"
        },
        {
            "name": "双相障碍（混合发作）",
            "mastery": "掌握"
        },
        {
            "name": "持续性心境障碍（环性心境）",
            "mastery": "熟悉"
        },
        {
            "name": "难治性抑郁症",
            "mastery": "熟悉"
        },
        {
            "name": "产后抑郁症",
            "mastery": "熟悉"
        },
        {
            "name": "恶劣心境",
            "mastery": "了解"
        }
    ],
    "神经症性及应激相关障碍": [
        {
            "name": "惊恐障碍",
            "mastery": "掌握"
        },
        {
            "name": "广泛性焦虑障碍",
            "mastery": "掌握"
        },
        {
            "name": "强迫障碍",
            "mastery": "掌握"
        },
        {
            "name": "创伤后应激障碍",
            "mastery": "掌握"
        },
        {
            "name": "急性应激障碍",
            "mastery": "熟悉"
        },
        {
            "name": "社交焦虑障碍",
            "mastery": "熟悉"
        },
        {
            "name": "分离性障碍（转换障碍）",
            "mastery": "熟悉"
        },
        {
            "name": "躯体形式障碍",
            "mastery": "了解"
        },
        {
            "name": "躯体化障碍",
            "mastery": "了解"
        },
        {
            "name": "适应性障碍",
            "mastery": "了解"
        }
    ],
    "器质性精神障碍": [
        {
            "name": "谵妄",
            "mastery": "掌握"
        },
        {
            "name": "阿尔茨海默病",
            "mastery": "掌握"
        },
        {
            "name": "血管性痴呆",
            "mastery": "掌握"
        },
        {
            "name": "癫痫伴发精神障碍",
            "mastery": "熟悉"
        },
        {
            "name": "脑外伤后精神障碍",
            "mastery": "熟悉"
        },
        {
            "name": "物质依赖所致精神障碍（酒精）",
            "mastery": "熟悉"
        }
    ],
    "人格障碍与行为障碍": [
        {
            "name": "边缘型人格障碍",
            "mastery": "熟悉"
        },
        {
            "name": "反社会型人格障碍",
            "mastery": "了解"
        },
        {
            "name": "偏执型人格障碍",
            "mastery": "了解"
        },
        {
            "name": "强迫型人格障碍",
            "mastery": "了解"
        },
        {
            "name": "注意缺陷多动障碍（成人）",
            "mastery": "了解"
        },
        {
            "name": "进食障碍（神经性厌食）",
            "mastery": "了解"
        }
    ]
}
}

// 掌握度 → 最低训练层级映射（来自住培大纲）
// 掌握 = 住培第一年必须独立诊治 → R1
// 熟悉 = 住培第二年应掌握 → R2
// 了解 = 住培第三年接触即可 → R3
export const MASTERY_MIN_LEVEL = {
  '掌握': 'U1',
  '熟悉': 'R2',
  '了解': 'R3'
}

// 所有训练层级（含阶段标签）
export const TRAINING_LEVELS = [
  { value: 'U1', label: 'U1 - 见习', phase: '本科教学' },
  { value: 'U2', label: 'U2 - 实习', phase: '本科教学' },
  { value: 'R1', label: 'R1 - 住培一年级', phase: '住院医师' },
  { value: 'R2', label: 'R2 - 住培二年级', phase: '住院医师' },
  { value: 'R3', label: 'R3 - 住培三年级', phase: '住院医师' },
  { value: 'F1', label: 'F1 - 专科进阶', phase: '专科培训' },
  { value: 'F2', label: 'F2 - 独立专家', phase: '专科培训' }
]

// level → phase 映射
export const LEVEL_TO_PHASE = {
  'U1': '本科教学', 'U2': '本科教学',
  'R1': '住院医师', 'R2': '住院医师', 'R3': '住院医师',
  'F1': '专科培训', 'F2': '专科培训'
}

// level 排序权重（用于比较大小）
const LEVEL_ORDER = { 'U1': 0, 'U2': 1, 'R1': 2, 'R2': 3, 'R3': 4, 'F1': 5, 'F2': 6 }

// 判断病种是否在指定层级可用（累积可见）
export function isDiseaseAvailable(mastery, targetLevel) {
  const minLevel = MASTERY_MIN_LEVEL[mastery] || 'R1'
  return LEVEL_ORDER[targetLevel] >= LEVEL_ORDER[minLevel]
}

// 根据层级过滤病种列表
export function filterDiseasesByLevel(diseases, targetLevel) {
  return diseases.filter(d => isDiseaseAvailable(d.mastery, targetLevel))
}
