/* 检验报告解读训练 · 题库
   每个病例包含：患者信息、多时间点检验报告、金标准判读要点。
   rows 的 lo/hi 用于自动判高低，criticalLow 用于危急值标识。 */

export const LAB_CASES = [
  {
    id: 'LAB-20261118-0417',
    title: '发热伴低血压、皮肤瘀点',
    status: 'published',
    level: 'R2',
    reportTypes: ['血常规', '生化', '凝血', '血气'],
    specimen: '静脉血 / 动脉血',
    department: '急诊内科',
    times: ['首次 11-18 08:00', '复查 11-18 14:00'],
    patient: {
      name: '张建国',
      sex: '男',
      age: '58 岁',
      chiefComplaint: '发热 3 天',
      clinical: '发热 3 天，最高 39.8℃，伴寒战、大汗；近 2 天精神差、嗜睡但可唤醒，食欲明显下降，近 1 天尿量约 400 mL。皮肤散在针尖样瘀点，牙龈轻触易出血，无咯血、黑便（未注意大便颜色）。' +
        '既往史：10 余年间断上腹隐痛史，从未规律复查胃镜；近半年面色渐苍白、活动后心慌，未诊治。无糖尿病、肝病、肾病及长期激素或免疫抑制剂用药史。' +
        '用药史：院外自服"头孢类"抗菌药物 2 天（剂量、具体药名不详），体温无下降。' +
        '处置：到院后先予 0.9% 氯化钠注射液 1000 mL 快速输注、物理降温及口服退热药。' +
        '查体：T 39.2℃，血压 92/56 mmHg，心率 118 次/分，呼吸 26 次/分，SpO₂ 93%（未吸氧），神志淡漠。口唇干燥，四肢皮温偏低、膝部可见花斑，甲床苍白；双肺底可闻及少量湿啰音，腹软、上腹轻压痛，无反跳痛及肌紧张，肝脾肋下未触及，双下肢无水肿。'
    },
    highlights: [
      { name: '血红蛋白 HGB', value: '44', unit: 'g/L', ref: '130–175', abn: true, critical: true },
      { name: '白细胞 WBC', value: '21.4', unit: '×10⁹/L', ref: '3.5–9.5', abn: true },
      { name: '血小板 PLT', value: '32', unit: '×10⁹/L', ref: '125–350', abn: true },
      { name: '降钙素原 PCT', value: '11.2', unit: 'ng/mL', ref: '< 0.5', abn: true }
    ],
    panels: [
      {
        id: 'cbc', name: '血常规 + 炎症', rows: [
          { name: '白细胞 WBC', unit: '×10⁹/L', ref: '3.5–9.5', first: '18.6', second: '21.4', lo: 3.5, hi: 9.5 },
          { name: '中性粒细胞% NEUT%', unit: '%', ref: '40–75', first: '88.2', second: '90.1', lo: 40, hi: 75 },
          { name: '中性粒细胞# NEUT#', unit: '×10⁹/L', ref: '1.8–6.3', first: '16.4', second: '19.3', lo: 1.8, hi: 6.3 },
          { name: '红细胞 RBC', unit: '×10¹²/L', ref: '4.3–5.8', first: '2.10', second: '1.79', lo: 4.3, hi: 5.8 },
          { name: '血红蛋白 HGB', unit: 'g/L', ref: '130–175', first: '52', second: '44', lo: 130, hi: 175, criticalLow: 60 },
          { name: '红细胞压积 HCT', unit: '%', ref: '40–50', first: '16.2', second: '13.8', lo: 40, hi: 50 },
          { name: '平均红细胞体积 MCV', unit: 'fL', ref: '80–100', first: '77.1', second: '77.0', lo: 80, hi: 100 },
          { name: '血小板 PLT', unit: '×10⁹/L', ref: '125–350', first: '45', second: '32', lo: 125, hi: 350 },
          { name: 'C 反应蛋白 CRP', unit: 'mg/L', ref: '< 10', first: '112', second: '138', hi: 10 },
          { name: '降钙素原 PCT', unit: 'ng/mL', ref: '< 0.5', first: '8.6', second: '11.2', hi: 0.5 }
        ]
      },
      {
        id: 'bio', name: '生化', rows: [
          { name: '丙氨酸氨基转移酶 ALT', unit: 'U/L', ref: '9–50', first: '186', second: '214', lo: 9, hi: 50 },
          { name: '天门冬氨酸氨基转移酶 AST', unit: 'U/L', ref: '15–40', first: '240', second: '286', lo: 15, hi: 40 },
          { name: '总胆红素 TBIL', unit: 'μmol/L', ref: '3.4–20.5', first: '38.2', second: '45.6', lo: 3.4, hi: 20.5 },
          { name: '白蛋白 ALB', unit: 'g/L', ref: '40–55', first: '28', second: '25', lo: 40, hi: 55 },
          { name: '乳酸脱氢酶 LDH', unit: 'U/L', ref: '120–250', first: '620', second: '702', lo: 120, hi: 250 },
          { name: '尿素 BUN', unit: 'mmol/L', ref: '3.1–8.0', first: '14.2', second: '18.6', lo: 3.1, hi: 8.0 },
          { name: '肌酐 Cr', unit: 'μmol/L', ref: '57–111', first: '168', second: '201', lo: 57, hi: 111 },
          { name: '血钾 K', unit: 'mmol/L', ref: '3.5–5.3', first: '3.1', second: '2.9', lo: 3.5, hi: 5.3 },
          { name: '血钠 Na', unit: 'mmol/L', ref: '137–147', first: '132', second: '130', lo: 137, hi: 147 },
          { name: '血糖 GLU', unit: 'mmol/L', ref: '3.9–6.1', first: '9.8', second: '7.6', lo: 3.9, hi: 6.1 }
        ]
      },
      {
        id: 'coag', name: '凝血', rows: [
          { name: '凝血酶原时间 PT', unit: 's', ref: '11.0–14.5', first: '18.5', second: '20.1', lo: 11, hi: 14.5 },
          { name: '活化部分凝血活酶时间 APTT', unit: 's', ref: '28.0–42.0', first: '42.3', second: '46.8', lo: 28, hi: 42 },
          { name: '纤维蛋白原 FIB', unit: 'g/L', ref: '2.0–4.0', first: '1.2', second: '0.9', lo: 2, hi: 4 },
          { name: 'D-二聚体 D-Dimer', unit: 'mg/L FEU', ref: '< 0.55', first: '6.8', second: '9.4', hi: 0.55 },
          { name: '国际标准化比值 INR', unit: '', ref: '0.8–1.2', first: '1.62', second: '1.78', lo: 0.8, hi: 1.2 }
        ]
      },
      {
        id: 'gas', name: '血气 + 乳酸', rows: [
          { name: '酸碱度 pH', unit: '', ref: '7.35–7.45', first: '7.31', second: '7.26', lo: 7.35, hi: 7.45 },
          { name: '二氧化碳分压 PaCO₂', unit: 'mmHg', ref: '35–45', first: '28', second: '25', lo: 35, hi: 45 },
          { name: '氧分压 PaO₂', unit: 'mmHg', ref: '80–100', first: '78', second: '69', lo: 80, hi: 100 },
          { name: '碳酸氢根 HCO₃⁻', unit: 'mmol/L', ref: '22–27', first: '14.2', second: '11.8', lo: 22, hi: 27 },
          { name: '剩余碱 BE', unit: 'mmol/L', ref: '-3–+3', first: '-10.5', second: '-13.2', lo: -3, hi: 3 },
          { name: '乳酸 Lac', unit: 'mmol/L', ref: '0.5–1.6', first: '4.2', second: '5.1', hi: 1.6 }
        ]
      }
    ],
    tips: [
      '本次报告里哪些指标达到危急值？异常到什么程度？',
      '炎症指标、贫血、血小板减少与凝血异常彼此是否相关？',
      '代谢性酸中毒与乳酸升高的可能原因是什么？',
      '结合血压和心率，目前是否存在组织低灌注？'
    ],
    gold: {
      points: [
        { id: 'a1', dim: 'abnormal', w: 3, time: 'trend', text: '血红蛋白 52→44 g/L，重度贫血且达危急值', kw: ['血红蛋白', 'hgb', 'hb ', '贫血', '52', '44 g'] },
        { id: 'a2', dim: 'abnormal', w: 2, time: 'trend', text: '血小板 45→32，进行性下降', kw: ['血小板', 'plt', '32'] },
        { id: 'a3', dim: 'abnormal', w: 2, text: '白细胞、中性粒细胞、CRP、PCT 显著升高', kw: ['白细胞', 'wbc', '中性粒', 'crp', 'c反应蛋白', 'pct', '降钙素原', '炎症指标'] },
        { id: 'a4', dim: 'abnormal', w: 3, text: '凝血异常：PT/APTT 延长、FIB 降低、D-二聚体升高', kw: ['凝血', 'pt', 'aptt', '纤维蛋白原', 'fib', 'd-二聚体', 'd二聚体', 'ddimer'] },
        { id: 'a5', dim: 'abnormal', w: 1.5, text: '肝酶升高（本次 ALT 214、AST 286、LDH 702）', kw: ['转氨酶', 'alt', 'ast', '肝酶', '乳酸脱氢酶', 'ldh', '肝功能'] },
        { id: 'a6', dim: 'abnormal', w: 2, time: 'trend', text: '代谢性酸中毒：pH 7.31→7.26、HCO₃⁻ 14.2→11.8、BE -10.5→-13.2，乳酸升高', kw: ['酸中毒', 'ph', '碳酸氢根', 'hco3', '剩余碱', '乳酸', 'lac', '代谢性酸'] },
        { id: 'a7', dim: 'abnormal', w: 1.5, time: 'trend', text: '肾功能受损：Cr 168→201、BUN 升高', kw: ['肌酐', 'cr ', '肾功能', '尿素', 'bun', '氮质血症'] },
        { id: 'a8', dim: 'abnormal', w: 2, time: 'trend', text: '与既往记录相比呈进行性恶化（Hb、PLT、乳酸、Cr 均变差）', kw: ['既往', '复查', '较前', '进行性', '恶化', '下降', '加重', '动态', '进展'] },

        { id: 'm1', dim: 'meaning', w: 3, text: '严重细菌感染/脓毒症：PCT 与 WBC 显著升高，伴低血压、发热', kw: ['感染', '脓毒', '细菌', '败血', 'sepsis', '全身炎症'] },
        { id: 'm2', dim: 'meaning', w: 2.5, text: '进行性重度贫血：小细胞低色素，需鉴别慢性失血基础上的急性失血或溶血', kw: ['失血', '出血', '溶血', '小细胞', '低色素', 'mcv'] },
        { id: 'm3', dim: 'meaning', w: 3, text: '血小板进行性减少 + 凝血异常 + 高 D-二聚体，提示脓毒症相关凝血病/DIC 倾向', kw: ['dic', '弥散性血管内凝血', '凝血病', '消耗性', '凝血功能障碍'] },
        { id: 'm4', dim: 'meaning', w: 2, text: '肝损伤：感染/缺血缺氧/药物等所致', kw: ['肝损伤', '肝细胞', '缺血', '缺氧', '药物性', '休克肝'] },
        { id: 'm5', dim: 'meaning', w: 2.5, text: '高乳酸 + 代酸提示组织低灌注/休克，代偿性呼吸性碱中毒', kw: ['低灌注', '休克', '组织灌注', '代偿', '呼吸性碱中毒', '微循环'] },
        { id: 'm6', dim: 'meaning', w: 1.5, text: '急性肾损伤（肾前性可能大），BUN/Cr 同步升高', kw: ['急性肾损伤', 'aki', '肾前性', '肾衰', '少尿'] },

        { id: 'r1', dim: 'reasoning', w: 3, text: '首要考虑脓毒症，需评估感染性休克', kw: ['脓毒', '感染性休克', '败血', 'sepsis', '休克'] },
        { id: 'r2', dim: 'reasoning', w: 3, text: '需评估 DIC（结合血小板、FIB、D-二聚体、PT 动态变化）', kw: ['dic', '凝血病', '凝血功能'] },
        { id: 'r3', dim: 'reasoning', w: 2, text: '贫血进展迅速，需警惕活动性出血（如消化道）或溶血', kw: ['活动性出血', '消化道出血', '出血源', '溶血', '失血'] },
        { id: 'r4', dim: 'reasoning', w: 1.5, text: '合并急性肾损伤与肝损伤，多器官受累', kw: ['多器官', 'mods', '器官功能', '肾功能不全', '肝损伤'] },

        { id: 'p1', dim: 'plan', w: 3, text: '立即复查血常规、凝血及 DIC 全套，动态监测', kw: ['复查', '动态监测', '监测', 'dic全套', '凝血全套'] },
        { id: 'p2', dim: 'plan', w: 3, text: '抗菌药物前留取血培养，寻找感染灶（腹部超声/CT、胸片）', kw: ['血培养', '培养', '感染灶', '感染源', '超声', 'ct', '胸片', '影像'] },
        { id: 'p3', dim: 'plan', w: 2.5, text: '备血/输注红细胞（Hb 44 g/L 且有低灌注表现）', kw: ['输血', '输注红细胞', '备血', '红细胞悬液', '纠正贫血'] },
        { id: 'p4', dim: 'plan', w: 2.5, text: '液体复苏、抗感染，监测乳酸与尿量', kw: ['液体复苏', '补液', '抗感染', '抗生素', '乳酸清除', '尿量'] },
        { id: 'p5', dim: 'plan', w: 2, text: '监测电解质（低钾、低钠）并纠正', kw: ['电解质', '补钾', '低钾', '低钠', '纠正'] }
      ],
      penalties: [
        { dim: 'abnormal', re: /血小板[^。；\n]{0,6}(正常|无异常|在正常范围)/, text: '称血小板正常（实际 32 且进行性下降）' },
        { dim: 'abnormal', re: /凝血[^。；\n]{0,6}(正常|无异常|未见异常)/, text: '称凝血功能正常（PT/APTT 延长、FIB 降低）' },
        { dim: 'abnormal', re: /(血红蛋白|贫血)[^。；\n]{0,6}(正常|无异常|轻度)/, text: '低估贫血程度（Hb 44 g/L，重度）' },
        { dim: 'reasoning', re: /(无需|不需要|不必)[^。；\n]{0,8}(复查|处理|进一步|检查)/, text: '建议无需进一步检查/复查' },
        { dim: 'meaning', re: /(代谢性酸中毒|酸中毒)[^。；\n]{0,6}(不存在|可排除|不符合)/, text: '否认代谢性酸中毒（pH 7.26、HCO₃⁻ 11.8）' }
      ],
      refAnswer: '患者发热 3 天伴低血压、心率增快，两次检验均示白细胞、中性粒细胞、CRP 与 PCT 显著升高，提示严重细菌感染，临床应考虑脓毒症并评估感染性休克。血红蛋白 52→44 g/L 达危急值，呈重度小细胞低色素性贫血且进行性下降，需警惕慢性贫血基础上的急性失血或溶血；血小板 45→32 进行性下降，伴 PT/APTT 延长、纤维蛋白原降低、D-二聚体显著升高，符合脓毒症相关凝血病/DIC 倾向。ALT、AST、LDH 明显升高提示肝细胞损伤（感染、缺血缺氧或药物因素）；pH 7.31、HCO₃⁻ 14.2、BE -10.5、乳酸 4.2→5.1 提示代谢性酸中毒伴呼吸性碱中毒代偿，存在组织低灌注；肌酐 168→201、尿素升高提示急性肾损伤（肾前性可能大）。建议立即复查血常规、凝血及 DIC 全套动态监测；抗菌药物使用前留取血培养并积极寻找感染灶（腹部超声/CT、胸片）；Hb 44 g/L 且有低灌注表现，应备血并考虑输注红细胞；给予液体复苏与抗感染，监测乳酸清除率及尿量；同时纠正低钾、低钠，保护肾功能。'
    }
  },
  {
    id: 'LAB-20261119-0233',
    title: '饮酒后上腹痛 12 小时',
    status: 'published',
    level: 'R1',
    reportTypes: ['血常规', '生化', '血气'],
    specimen: '静脉血 / 动脉血',
    department: '消化内科',
    times: ['入院 11-19 21:00', '复查 11-20 06:00'],
    patient: {
      name: '李秀兰',
      sex: '女',
      age: '46 岁',
      chiefComplaint: '上腹痛 12 小时',
      clinical: '前一晚聚餐时饮白酒约 250 mL 并进食大量油腻食物，4 小时后出现持续性上腹痛，阵发性加剧，向腰背部放射，坐位前倾稍减轻；伴恶心、反复呕吐胃内容物共 6 次，呕吐后腹痛不缓解，近 8 小时未进食、尿量较平日减少。无发热寒战、无腹泻、无胸痛及呼吸困难，皮肤巩膜无黄染、小便颜色未变深。既往胆囊结石 3 年（B 超证实，从未发作胆绞痛），无高脂血症、长期饮酒及糖尿病史；未服用噻嗪类利尿剂、激素或免疫抑制剂，无腹部手术史。到院后予禁食、乳酸钠林格液 1500 mL 补液、解痉镇痛及抑酸治疗。' +
        '查体：T 37.8℃，血压 118/72 mmHg，心率 102 次/分，呼吸 20 次/分。痛苦表情，辗转不安；上腹中部偏左压痛明显，伴轻度肌紧张及反跳痛，Murphy 征可疑阳性，肠鸣音减弱（2-3 次/分），未触及包块，移动性浊音阴性，无腰胁部瘀斑。'
    },
    highlights: [
      { name: '淀粉酶 AMY', value: '620', unit: 'U/L', ref: '30–110', abn: true },
      { name: '脂肪酶 LIP', value: '480', unit: 'U/L', ref: '23–300', abn: true },
      { name: '血钙 Ca', value: '1.84', unit: 'mmol/L', ref: '2.10–2.60', abn: true },
      { name: 'C 反应蛋白 CRP', value: '142', unit: 'mg/L', ref: '< 10', abn: true }
    ],
    panels: [
      {
        id: 'cbc', name: '血常规 + 炎症', rows: [
          { name: '白细胞 WBC', unit: '×10⁹/L', ref: '3.5–9.5', first: '14.8', second: '16.2', lo: 3.5, hi: 9.5 },
          { name: '中性粒细胞% NEUT%', unit: '%', ref: '40–75', first: '86.0', second: '88.4', lo: 40, hi: 75 },
          { name: '血红蛋白 HGB', unit: 'g/L', ref: '115–150', first: '128', second: '124', lo: 115, hi: 150 },
          { name: '血小板 PLT', unit: '×10⁹/L', ref: '125–350', first: '210', second: '196', lo: 125, hi: 350 },
          { name: 'C 反应蛋白 CRP', unit: 'mg/L', ref: '< 10', first: '86', second: '142', hi: 10 }
        ]
      },
      {
        id: 'bio', name: '生化（含胰酶）', rows: [
          { name: '淀粉酶 AMY', unit: 'U/L', ref: '30–110', first: '890', second: '620', lo: 30, hi: 110 },
          { name: '脂肪酶 LIP', unit: 'U/L', ref: '23–300', first: '620', second: '480', lo: 23, hi: 300 },
          { name: '丙氨酸氨基转移酶 ALT', unit: 'U/L', ref: '7–40', first: '68', second: '74', lo: 7, hi: 40 },
          { name: '天门冬氨酸氨基转移酶 AST', unit: 'U/L', ref: '13–35', first: '52', second: '60', lo: 13, hi: 35 },
          { name: '总胆红素 TBIL', unit: 'μmol/L', ref: '3.4–20.5', first: '22.6', second: '26.1', lo: 3.4, hi: 20.5 },
          { name: '血钙 Ca', unit: 'mmol/L', ref: '2.10–2.60', first: '1.92', second: '1.84', lo: 2.1, hi: 2.6 },
          { name: '血糖 GLU', unit: 'mmol/L', ref: '3.9–6.1', first: '9.2', second: '8.4', lo: 3.9, hi: 6.1 },
          { name: '甘油三酯 TG', unit: 'mmol/L', ref: '< 1.7', first: '3.6', second: '', hi: 1.7 },
          { name: '肌酐 Cr', unit: 'μmol/L', ref: '41–81', first: '78', second: '86', lo: 41, hi: 81 },
          { name: '尿素 BUN', unit: 'mmol/L', ref: '2.6–7.5', first: '5.8', second: '7.1', lo: 2.6, hi: 7.5 }
        ]
      },
      {
        id: 'gas', name: '血气 + 乳酸', rows: [
          { name: '酸碱度 pH', unit: '', ref: '7.35–7.45', first: '7.34', second: '7.32', lo: 7.35, hi: 7.45 },
          { name: '碳酸氢根 HCO₃⁻', unit: 'mmol/L', ref: '22–27', first: '19.8', second: '18.4', lo: 22, hi: 27 },
          { name: '剩余碱 BE', unit: 'mmol/L', ref: '-3–+3', first: '-4.5', second: '-6.1', lo: -3, hi: 3 },
          { name: '乳酸 Lac', unit: 'mmol/L', ref: '0.5–1.6', first: '1.9', second: '2.4', hi: 1.6 }
        ]
      },
      {
        id: 'coag', name: '凝血', rows: [
          { name: '凝血酶原时间 PT', unit: 's', ref: '11.0–14.5', first: '12.8', second: '13.1', lo: 11, hi: 14.5 },
          { name: '纤维蛋白原 FIB', unit: 'g/L', ref: '2.0–4.0', first: '4.2', second: '4.6', lo: 2, hi: 4 },
          { name: 'D-二聚体 D-Dimer', unit: 'mg/L FEU', ref: '< 0.55', first: '1.2', second: '1.8', hi: 0.55 }
        ]
      }
    ],
    tips: [
      '胰酶升高到正常上限几倍？是否达到急性胰腺炎的诊断阈值？',
      '血钙降低提示什么？与病情严重度有什么关系？',
      '本次报告里哪几项最能反映病情严重度？为什么？',
      '结合饮酒史与胆囊结石，病因可能往哪几个方向找？'
    ],
    gold: {
      points: [
        { id: 'a1', dim: 'abnormal', w: 3, text: '淀粉酶 620、脂肪酶 480 仍显著升高（>3 倍正常上限）', kw: ['淀粉酶', 'amy', '脂肪酶', 'lip', '胰酶'] },
        { id: 'a2', dim: 'abnormal', w: 2, text: '白细胞、中性粒细胞及 CRP 升高', kw: ['白细胞', 'wbc', '中性粒', 'crp', 'c反应蛋白', '炎症'] },
        { id: 'a3', dim: 'abnormal', w: 2.5, time: 'trend', text: '血钙 1.92→1.84 降低', kw: ['血钙', '低钙', '钙'] },
        { id: 'a4', dim: 'abnormal', w: 1.5, text: '血糖升高（本次 8.4）与甘油三酯升高（既往 3.6，本次未复查）', kw: ['血糖', '甘油三酯', 'tg', '高血糖', '高脂'] },
        { id: 'a5', dim: 'abnormal', w: 1.5, text: '肝酶轻度升高、总胆红素轻度升高', kw: ['转氨酶', 'alt', 'ast', '胆红素', '肝酶', '肝功能'] },
        { id: 'a6', dim: 'abnormal', w: 2, text: '轻度代谢性酸中毒伴乳酸升高（HCO₃⁻ 18.4、Lac 2.4）', kw: ['酸中毒', '碳酸氢根', 'hco3', '乳酸', 'lac', '剩余碱', 'be'] },
        { id: 'a7', dim: 'abnormal', w: 2, time: 'trend', text: '淀粉酶/脂肪酶较前下降、CRP 升高，呈动态演变', kw: ['复查', '较前', '下降', '动态', '演变'] },
        { id: 'a8', dim: 'abnormal', w: 1.5, text: 'D-二聚体轻度升高、纤维蛋白原偏高', kw: ['d-二聚体', 'd二聚体', '纤维蛋白原', 'fib', '凝血'] },

        { id: 'm1', dim: 'meaning', w: 3.5, text: '急性胰腺炎：胰酶显著升高，结合上腹痛与饮酒史', kw: ['胰腺炎', '胰酶', '淀粉酶升高', '脂肪酶升高'] },
        { id: 'm2', dim: 'meaning', w: 2.5, text: '血钙降低提示脂肪皂化/重症倾向，需关注病情严重度', kw: ['低钙', '皂化', '重症', '严重度', '坏死'] },
        { id: 'm3', dim: 'meaning', w: 2, text: '炎症反应明显（WBC/CRP 升高），CRP 升高提示病情进展', kw: ['炎症反应', 'crp', '进展', '炎症指标'] },
        { id: 'm4', dim: 'meaning', w: 2, text: '病因需考虑酒精、高甘油三酯及胆源性因素', kw: ['酒精', '高甘油三酯', '胆源性', '胆囊', '病因'] },
        { id: 'm5', dim: 'meaning', w: 1.5, text: '肝酶与胆红素轻度升高可能与胆道因素或炎症波及有关', kw: ['胆道', '胆红素', '肝细胞', '梗阻'] },
        { id: 'm6', dim: 'meaning', w: 1.5, text: '轻度代酸与乳酸升高提示有效循环血量不足/炎症所致', kw: ['有效循环', '灌注', '脱水', '呕吐', '乳酸升高'] },

        { id: 'r1', dim: 'reasoning', w: 3.5, text: '诊断急性胰腺炎（需结合影像与临床）', kw: ['急性胰腺炎', '胰腺炎'] },
        { id: 'r2', dim: 'reasoning', w: 2.5, text: '需评估重症倾向（低钙、CRP 升高、器官功能）', kw: ['重症', '严重度', '器官功能', '坏死性'] },
        { id: 'r3', dim: 'reasoning', w: 2, text: '需鉴别胆源性（胆囊结石）与酒精/高甘油三酯性', kw: ['胆源性', '胆囊结石', '结石', '酒精性', '高甘油三酯'] },

        { id: 'p1', dim: 'plan', w: 3, text: '腹部 CT/超声明确胰腺及胆道情况', kw: ['腹部ct', '胰腺ct', 'ct', '超声', '影像', 'b超'] },
        { id: 'p2', dim: 'plan', w: 2.5, text: '禁食、胃肠减压、液体复苏与镇痛', kw: ['禁食', '胃肠减压', '液体复苏', '补液', '镇痛', '止痛'] },
        { id: 'p3', dim: 'plan', w: 2, text: '复查血钙、CRP 及胰酶，动态评估严重度', kw: ['复查', '监测', '血钙', 'crp', '动态评估'] },
        { id: 'p4', dim: 'plan', w: 2, text: '查血脂、肝功能及胆道评估，明确病因', kw: ['血脂', '甘油三酯', '肝功能', '胆道', '病因'] },
        { id: 'p5', dim: 'plan', w: 2, text: '监测血糖并必要时应用胰岛素', kw: ['血糖', '胰岛素', '监测血糖'] }
      ],
      penalties: [
        { dim: 'abnormal', re: /(淀粉酶|脂肪酶)[^。；\n]{0,6}(正常|无异常|正常范围)/, text: '称胰酶正常（淀粉酶 890、脂肪酶 620）' },
        { dim: 'meaning', re: /(血钙|钙)[^。；\n]{0,6}(正常|无异常)/, text: '称血钙正常（1.84 mmol/L，偏低）' },
        { dim: 'reasoning', re: /(无需|不需要|不必)[^。；\n]{0,8}(住院|复查|影像|ct)/, text: '建议无需影像/复查（需评估胰腺与胆道）' }
      ],
      refAnswer: '患者饮酒后出现持续性上腹痛并向腰背部放射，伴恶心呕吐，上腹压痛，本次淀粉酶 620 U/L、脂肪酶 480 U/L 仍显著升高（均超过正常上限 3 倍以上，入院时分别为 890 与 620），首先考虑急性胰腺炎。白细胞、中性粒细胞及 CRP 升高提示明显炎症反应，CRP 由入院时 86 升至本次 142 mg/L，需警惕病情进展；血钙 1.92→1.84 mmol/L 降低，提示脂肪皂化及重症倾向，应进行严重度评估。血糖 8.4 mmol/L（入院 9.2）、甘油三酯入院 3.6 mmol/L 升高（本次未复查），结合饮酒史与胆囊结石，病因需鉴别酒精性、高甘油三酯性及胆源性。肝酶及胆红素轻度升高可能与胆道因素或炎症波及有关；HCO₃⁻ 18.4 mmol/L、乳酸 2.4 mmol/L 提示轻度代谢性酸中毒，与呕吐、脱水及有效循环血量不足有关。凝血方面 PT 13.1 秒仍在参考区间内，纤维蛋白原 4.6 g/L 偏高、D-二聚体由 1.2 升至 1.8 mg/L FEU，提示炎症相关的凝血激活，需结合肝功能与胆道情况评估。建议完善腹部 CT 及超声明确胰腺与胆道情况，禁食、胃肠减压、积极液体复苏并镇痛；复查血钙、CRP 及胰酶动态评估严重度；查血脂及肝功能明确病因，必要时针对胆源性因素处理；监测血糖，必要时应用胰岛素。'
    }
  },
  {
    id: 'LAB-20261120-0508',
    title: '乏力、面色苍白 3 月',
    status: 'published',
    level: 'U2',
    reportTypes: ['血常规', '铁代谢', '生化'],
    specimen: '静脉血',
    department: '血液内科',
    times: ['门诊 11-20 09:30', '补铁 4 周复查 12-18 09:10'],
    /* 本例要解读的是门诊首诊那份（Hb 78、铁蛋白 4）；12-18 是补铁 4 周后的疗效复查，
       属于「下一步怎么办」的答案，摆出来就泄题，所以不进训练（focusTime = 本次取第几次） */
    focusTime: 0,
    patient: {
      name: '王淑芬',
      sex: '女',
      age: '42 岁',
      chiefComplaint: '乏力 3 月，加重 2 周',
      clinical: '近 3 月乏力、面色苍白，活动后心悸气短，爬两层楼即需停歇，伴头晕、注意力下降、耳鸣，无黑蒙及晕厥；近 2 周上述症状加重，夜间偶有心前区不适。食欲一般，偏素食、肉食很少，无挑食异食。月经量增多 2 年余，每次持续 7-9 天、需 15 片以上卫生巾，末次月经 10 天前；无呕血、黑便，大便每日 1 次、颜色正常，无体重下降。既往 5 年前曾诊断十二指肠球部溃疡（此后未复查、未再服药），未服用抗凝或抗血小板药物；无慢性病、无输血史，无家族血液病史。本次为门诊首次采血，尚未使用铁剂。' +
        '查体：T 36.5℃，血压 105/68 mmHg，心率 96 次/分，呼吸 18 次/分。神志清楚，精神欠佳；睑结膜、甲床及口唇苍白，指甲变薄上翘呈反甲，舌乳头萎缩、口角轻度糜烂；颈部及腋下未触及肿大淋巴结，心律齐、心尖区可闻及 2/6 级收缩期柔和杂音，双肺呼吸音清，腹软，肝脾肋下未触及，双下肢无水肿。'
    },
    tips: [
      '贫血按形态学怎么分类？MCV、MCH、MCHC 各自说明什么？',
      '铁代谢这几项指标互相印证还是互相矛盾？哪个最敏感？',
      '网织红细胞不高说明骨髓的反应如何？',
      '缺铁的病因该往哪些方向找？本例最可能的失铁途径是什么？'
    ],
    highlights: [
      { name: '血红蛋白 HGB', value: '78', unit: 'g/L', ref: '115–150', abn: true },
      { name: '平均红细胞体积 MCV', value: '71.2', unit: 'fL', ref: '82–100', abn: true },
      { name: '血清铁蛋白 SF', value: '4', unit: 'μg/L', ref: '13–150', abn: true },
      { name: '网织红细胞% RET%', value: '0.8', unit: '%', ref: '0.5–1.5', abn: false }
    ],
    panels: [
      {
        id: 'cbc', name: '血常规 + 网织红', rows: [
          { name: '白细胞 WBC', unit: '×10⁹/L', ref: '3.5–9.5', first: '5.6', second: '6.1', lo: 3.5, hi: 9.5 },
          { name: '中性粒细胞% NEUT%', unit: '%', ref: '40–75', first: '58.2', second: '60.4', lo: 40, hi: 75 },
          { name: '红细胞 RBC', unit: '×10¹²/L', ref: '3.80–5.10', first: '3.42', second: '3.96', lo: 3.8, hi: 5.1 },
          { name: '血红蛋白 HGB', unit: 'g/L', ref: '115–150', first: '78', second: '96', lo: 115, hi: 150 },
          { name: '红细胞压积 HCT', unit: '%', ref: '35–45', first: '26.5', second: '32.1', lo: 35, hi: 45 },
          { name: '平均红细胞体积 MCV', unit: 'fL', ref: '82–100', first: '71.2', second: '75.8', lo: 82, hi: 100 },
          { name: '平均血红蛋白量 MCH', unit: 'pg', ref: '27–34', first: '22.8', second: '24.2', lo: 27, hi: 34 },
          { name: '平均血红蛋白浓度 MCHC', unit: 'g/L', ref: '316–354', first: '294', second: '299', lo: 316, hi: 354 },
          { name: '红细胞分布宽度 RDW-CV', unit: '%', ref: '11.5–14.5', first: '16.8', second: '17.2', lo: 11.5, hi: 14.5 },
          { name: '血小板 PLT', unit: '×10⁹/L', ref: '125–350', first: '268', second: '255', lo: 125, hi: 350 },
          { name: '网织红细胞% RET%', unit: '%', ref: '0.5–1.5', first: '0.8', second: '2.6', lo: 0.5, hi: 1.5 }
        ]
      },
      {
        id: 'iron', name: '铁代谢', rows: [
          { name: '血清铁 SI', unit: 'μmol/L', ref: '9.0–27.0', first: '4.2', second: '12.8', lo: 9, hi: 27 },
          { name: '血清铁蛋白 SF', unit: 'μg/L', ref: '13–150', first: '4', second: '26', lo: 13, hi: 150 },
          { name: '总铁结合力 TIBC', unit: 'μmol/L', ref: '45–66', first: '78', second: '62', lo: 45, hi: 66 },
          { name: '转铁蛋白饱和度 TSAT', unit: '%', ref: '20–50', first: '5', second: '21', lo: 20, hi: 50 },
          { name: '可溶性转铁蛋白受体 sTfR', unit: 'mg/L', ref: '1.8–4.6', first: '7.2', second: '4.1', lo: 1.8, hi: 4.6 }
        ]
      },
      {
        id: 'bio', name: '生化 + 造血原料', rows: [
          { name: '丙氨酸氨基转移酶 ALT', unit: 'U/L', ref: '7–40', first: '18', second: '21', lo: 7, hi: 40 },
          { name: '肌酐 Cr', unit: 'μmol/L', ref: '41–81', first: '52', second: '54', lo: 41, hi: 81 },
          { name: '尿素 BUN', unit: 'mmol/L', ref: '2.6–7.5', first: '4.2', second: '4.6', lo: 2.6, hi: 7.5 },
          { name: 'C 反应蛋白 CRP', unit: 'mg/L', ref: '< 10', first: '2.1', second: '1.8', hi: 10 },
          { name: '维生素 B12', unit: 'pmol/L', ref: '133–675', first: '420', second: '—', lo: 133, hi: 675 },
          { name: '叶酸 FA', unit: 'nmol/L', ref: '10.4–42.4', first: '12.6', second: '—', lo: 10.4, hi: 42.4 },
          { name: '促甲状腺激素 TSH', unit: 'mIU/L', ref: '0.27–4.20', first: '2.10', second: '—', lo: 0.27, hi: 4.2 }
        ]
      }
    ],
    gold: {
      points: [
        { id: 'a1', dim: 'abnormal', w: 3, text: '血红蛋白 78 g/L，中度贫血', kw: ['血红蛋白', 'hgb', 'hb ', '贫血', '78'] },
        { id: 'a2', dim: 'abnormal', w: 2.5, text: '小细胞低色素：MCV 71.2、MCH 22.8、MCHC 294', kw: ['mcv', '小细胞', '低色素', 'mch', 'mchc'] },
        { id: 'a3', dim: 'abnormal', w: 2.5, text: '铁蛋白 4 μg/L 显著降低，血清铁降低、总铁结合力升高、转铁蛋白饱和度 5%', kw: ['铁蛋白', '血清铁', '总铁结合力', 'tibc', '转铁蛋白饱和'] },
        { id: 'a4', dim: 'abnormal', w: 1.5, text: '网织红细胞 0.8% 不高，提示骨髓代偿不足', kw: ['网织红', 'ret'] },
        { id: 'a5', dim: 'abnormal', w: 2, time: 'later', text: '补铁 4 周后 Hb 78→96、网织红细胞升至 2.6%，呈治疗反应', kw: ['复查', '较前', '上升', '回升', '好转', '治疗反应'] },
        { id: 'a6', dim: 'abnormal', w: 1, text: '维生素 B12、叶酸正常，排除巨幼细胞性贫血', kw: ['b12', '叶酸', '巨幼'] },

        { id: 'm1', dim: 'meaning', w: 3, text: '符合缺铁性贫血：小细胞低色素 + 铁蛋白降低', kw: ['缺铁性贫血', '缺铁', 'ida'] },
        { id: 'm2', dim: 'meaning', w: 2.5, text: '铁蛋白是储存铁最敏感指标，<15 μg/L 诊断价值高；sTfR 升高提示铁缺乏', kw: ['铁蛋白', '敏感', '储存铁', 'sTFR', '15'] },
        { id: 'm3', dim: 'meaning', w: 2, text: '需寻找失铁原因：月经过多或消化道慢性失血', kw: ['月经', '失血', '消化道', '病因', '慢性失血'] },
        { id: 'm4', dim: 'meaning', w: 1.5, text: '需与地中海贫血（HbA2 升高、铁蛋白正常）及慢性病贫血鉴别', kw: ['地中海', '地贫', '慢性病贫血', '鉴别', 'hba2'] },
        { id: 'm5', dim: 'meaning', w: 1, text: '反甲、舌乳头萎缩为缺铁的组织改变表现', kw: ['反甲', '舌乳头', '组织改变', '体征'] },

        { id: 'r1', dim: 'reasoning', w: 3, text: '诊断缺铁性贫血，结合形态学与铁代谢', kw: ['缺铁性贫血', '缺铁'] },
        { id: 'r2', dim: 'reasoning', w: 2, text: '病因诊断：以妇科月经过多为主，需排除消化道失血', kw: ['病因', '月经', '妇科', '消化道', '失血', '隐血'] },
        { id: 'r3', dim: 'reasoning', w: 1.5, text: '非造血系统疾病与营养因素（如素食、吸收不良）也需一并评估', kw: ['营养', '吸收不良', '素食', '饮食'] },

        { id: 'p1', dim: 'plan', w: 2.5, text: '口服铁剂（琥珀酸亚铁/多糖铁）+ 维生素 C，餐后服用', kw: ['铁剂', '补铁', '口服铁', '硫酸亚铁', '琥珀酸亚铁', '多糖铁', '维生素c'] },
        { id: 'p2', dim: 'plan', w: 2, text: '补铁后 2–4 周复查血常规与网织红细胞评估疗效', kw: ['复查', '网织红', '2-4周', '疗效', '评估反应'] },
        { id: 'p3', dim: 'plan', w: 2, text: '查大便隐血、必要时胃肠镜；妇科评估月经量并处理原因', kw: ['大便隐血', '便隐血', '胃肠镜', '妇科', '月经', '止血'] },
        { id: 'p4', dim: 'plan', w: 1.5, text: 'Hb 正常后继续补铁 3–6 个月补足储存铁，避免复发', kw: ['继续', '3-6个月', '储存铁', '维持', '补足'] }
      ],
      penalties: [
        { dim: 'abnormal', re: /(血红蛋白|贫血)[^。；\n]{0,6}(正常|无异常|轻度)/, text: '低估贫血程度（Hb 78 g/L，中度贫血）' },
        { dim: 'meaning', re: /(铁蛋白|血清铁)[^。；\n]{0,6}(升高|正常|偏高)/, text: '把铁蛋白/血清铁判为升高或正常（实际明显降低）' },
        { dim: 'reasoning', re: /(不需要|无需)[^。；\n]{0,8}(找病因|查病因|妇科|胃肠镜|隐血)/, text: '认为无需追查缺铁病因' }
      ],
      refAnswer: '患者以乏力、活动后心悸气短为主要表现，体征见睑结膜苍白、反甲与舌乳头萎缩，提示慢性贫血。血常规示血红蛋白 78 g/L（中度贫血），MCV 71.2 fL、MCH 22.8 pg、MCHC 294 g/L、RDW-CV 16.8%，呈典型小细胞低色素性贫血；网织红细胞 0.8% 不高，说明骨髓红系代偿不足。铁代谢示血清铁 4.2 μmol/L、铁蛋白 4 μg/L 显著降低，总铁结合力 78 μmol/L 升高，转铁蛋白饱和度仅 5%，可溶性转铁蛋白受体升高，符合绝对性铁缺乏；维生素 B12、叶酸正常，不支持巨幼细胞性贫血。结合月经量多 2 年余，首先考虑慢性失血所致缺铁性贫血，但仍需排除消化道慢性失血。建议口服铁剂联合维生素 C，餐后服用；补铁后 2–4 周复查血常规与网织红细胞评估疗效；查大便隐血、必要时行胃肠镜，并由妇科评估月经量、处理月经过多；血红蛋白恢复后继续补铁 3–6 个月以补足储存铁。'
    }
  },
  {
    id: 'LAB-20261121-0116',
    title: '多饮多尿伴恶心呕吐 2 天',
    status: 'published',
    level: 'R2',
    reportTypes: ['血常规', '生化', '血气', '尿常规'],
    specimen: '静脉血 / 动脉血 / 中段尿',
    department: '内分泌科',
    times: ['急诊 11-21 01:16', '补液后复查 11-21 07:00'],
    /* 要解读的是急诊 01:16 那份（血糖 28.6、pH 7.16、AG 27 的完整 DKA 图景）；
       07:00 是补液降糖后的复查，属于治疗结局，摆出来就把「下一步」的答案泄给客户 */
    focusTime: 0,
    patient: {
      name: '陈志强',
      sex: '男',
      age: '24 岁',
      chiefComplaint: '多饮多尿 2 周，恶心呕吐 2 天',
      clinical: '近 2 周多饮、多尿（夜间起床排尿 3-4 次），体重下降 4 kg，未就诊；2 天来恶心、呕吐胃内容物每日 5-6 次，伴上腹隐痛，进食即吐，继而出现呼吸深快、呼气有烂苹果味，嗜睡但可唤醒。发病前 1 周有大量含糖饮料及甜食摄入史；无发热、咳嗽、腹泻、尿痛等感染表现，无外伤及服药史。既往体健，未诊断糖尿病，否认长期用药；家族中无糖尿病记录。到院后即予 0.9% 氯化钠注射液 2000 mL 快速补液、小剂量胰岛素持续静脉输注及补钾，两次标本分别在补液前与治疗后 6 小时采集。' +
        '查体：T 37.2℃，血压 98/60 mmHg，心率 122 次/分，呼吸 28 次/分（深大呼吸），BMI 21.3。神志清楚、精神萎靡，呼气有酮味；皮肤弹性减退、眼球下陷、口唇干燥，四肢末梢温、无花斑；双肺呼吸音清，心律齐无杂音，腹软、上腹轻压痛无反跳痛，肠鸣音存在，肝脾未触及，双下肢无水肿，病理反射未引出。'
    },
    tips: [
      '血糖、血酮/尿酮、血气三者放在一起说明什么问题？',
      '阴离子间隙怎么算？升高提示哪一类酸中毒？',
      '血钾偏高时最容易被忽略的风险是什么？补液降糖后会怎样变化？',
      '恶心、呕吐、腹痛能否用一元论解释，还需要排除什么？'
    ],
    highlights: [
      { name: '血糖 GLU', value: '28.6', unit: 'mmol/L', ref: '3.9–6.1', abn: true },
      { name: 'β-羟丁酸', value: '5.8', unit: 'mmol/L', ref: '0.03–0.30', abn: true },
      { name: '酸碱度 pH', value: '7.16', unit: '', ref: '7.35–7.45', abn: true, critical: true },
      { name: '碳酸氢根 HCO₃⁻', value: '7.6', unit: 'mmol/L', ref: '22–27', abn: true }
    ],
    panels: [
      {
        id: 'cbc', name: '血常规 + 炎症', rows: [
          { name: '白细胞 WBC', unit: '×10⁹/L', ref: '3.5–9.5', first: '16.8', second: '12.4', lo: 3.5, hi: 9.5 },
          { name: '中性粒细胞% NEUT%', unit: '%', ref: '40–75', first: '82.0', second: '76.5', lo: 40, hi: 75 },
          { name: '血红蛋白 HGB', unit: 'g/L', ref: '130–175', first: '152', second: '146', lo: 130, hi: 175 },
          { name: '红细胞压积 HCT', unit: '%', ref: '40–50', first: '46.8', second: '42.1', lo: 40, hi: 50 },
          { name: '血小板 PLT', unit: '×10⁹/L', ref: '125–350', first: '268', second: '241', lo: 125, hi: 350 },
          { name: 'C 反应蛋白 CRP', unit: 'mg/L', ref: '< 10', first: '6.2', second: '8.4', hi: 10 },
          { name: '降钙素原 PCT', unit: 'ng/mL', ref: '< 0.5', first: '0.3', second: '0.4', hi: 0.5 }
        ]
      },
      {
        id: 'bio', name: '生化 + 血酮', rows: [
          { name: '血糖 GLU', unit: 'mmol/L', ref: '3.9–6.1', first: '28.6', second: '16.8', lo: 3.9, hi: 6.1 },
          { name: 'β-羟丁酸 β-HB', unit: 'mmol/L', ref: '0.03–0.30', first: '5.8', second: '1.2', hi: 0.3 },
          { name: '碳酸氢根 HCO₃⁻', unit: 'mmol/L', ref: '22–29', first: '8.2', second: '14.2', lo: 22, hi: 29 },
          { name: '阴离子间隙 AG', unit: 'mmol/L', ref: '8–16', first: '27', second: '19', lo: 8, hi: 16 },
          { name: '血钾 K', unit: 'mmol/L', ref: '3.5–5.3', first: '5.4', second: '4.1', lo: 3.5, hi: 5.3 },
          { name: '血钠 Na', unit: 'mmol/L', ref: '137–147', first: '130', second: '136', lo: 137, hi: 147 },
          { name: '血氯 Cl', unit: 'mmol/L', ref: '99–110', first: '98', second: '104', lo: 99, hi: 110 },
          { name: '肌酐 Cr', unit: 'μmol/L', ref: '57–111', first: '118', second: '96', lo: 57, hi: 111 },
          { name: '尿素 BUN', unit: 'mmol/L', ref: '3.1–8.0', first: '9.8', second: '6.2', lo: 3.1, hi: 8 },
          { name: '淀粉酶 AMY', unit: 'U/L', ref: '30–110', first: '96', second: '72', lo: 30, hi: 110 },
          { name: '渗透压（计算）', unit: 'mOsm/L', ref: '280–300', first: '305', second: '296', lo: 280, hi: 300 }
        ]
      },
      {
        id: 'gas', name: '血气 + 乳酸', rows: [
          { name: '酸碱度 pH', unit: '', ref: '7.35–7.45', first: '7.16', second: '7.28', lo: 7.35, hi: 7.45 },
          { name: '二氧化碳分压 PaCO₂', unit: 'mmHg', ref: '35–45', first: '22', second: '30', lo: 35, hi: 45 },
          { name: '氧分压 PaO₂', unit: 'mmHg', ref: '80–100', first: '96', second: '92', lo: 80, hi: 100 },
          { name: '碳酸氢根 HCO₃⁻', unit: 'mmol/L', ref: '22–27', first: '7.6', second: '13.8', lo: 22, hi: 27 },
          { name: '剩余碱 BE', unit: 'mmol/L', ref: '-3–+3', first: '-19.5', second: '-10.2', lo: -3, hi: 3 },
          { name: '乳酸 Lac', unit: 'mmol/L', ref: '0.5–1.6', first: '2.6', second: '1.4', hi: 1.6 }
        ]
      },
      {
        id: 'urine', name: '尿常规', rows: [
          { name: '尿糖 GLU', unit: '', ref: '阴性', first: '4+', second: '2+', abn: true },
          { name: '尿酮体 KET', unit: '', ref: '阴性', first: '3+', second: '1+', abn: true },
          { name: '尿蛋白 PRO', unit: '', ref: '阴性', first: '±', second: '阴性', abn: true },
          { name: '尿白细胞 WBC', unit: '/HP', ref: '0–5', first: '3', second: '2', lo: 0, hi: 5 },
          { name: '尿亚硝酸盐 NIT', unit: '', ref: '阴性', first: '阴性', second: '阴性' },
          { name: '尿比重 SG', unit: '', ref: '1.003–1.030', first: '1.032', second: '1.018', lo: 1.003, hi: 1.03 }
        ]
      }
    ],
    gold: {
      points: [
        { id: 'a1', dim: 'abnormal', w: 3, text: '血糖 28.6 mmol/L 显著升高', kw: ['血糖', 'glu', '28.6', '高血糖'] },
        { id: 'a2', dim: 'abnormal', w: 3, text: '血酮 5.8 mmol/L、尿酮体 3+、尿糖 4+', kw: ['酮体', '血酮', 'β-羟丁酸', '羟丁酸', '尿酮', '尿糖'] },
        { id: 'a3', dim: 'abnormal', w: 2.5, text: '高阴离子间隙代谢性酸中毒：pH 7.16、HCO₃⁻ 7.6、BE -19.5、AG 27', kw: ['酸中毒', 'ph', '碳酸氢根', 'hco3', '剩余碱', '阴离子间隙', 'ag ', '阴离子'] },
        { id: 'a4', dim: 'abnormal', w: 2, text: '白细胞 16.8、中性粒细胞 82% 升高，需排查感染诱因', kw: ['白细胞', 'wbc', '中性粒'] },
        { id: 'a5', dim: 'abnormal', w: 1.5, text: '血钾 5.4 偏高、血钠 130 偏低', kw: ['血钾', '高钾', '血钠', '低钠'] },
        { id: 'a6', dim: 'abnormal', w: 1.5, text: '肾前性氮质血症：Cr 118、BUN 9.8、尿比重 1.032', kw: ['肌酐', '尿素', '氮质', '尿比重', '脱水'] },
        { id: 'a7', dim: 'abnormal', w: 1.5, time: 'later', text: '复查后 pH 7.28、HCO₃⁻ 13.8、血糖 16.8、血钾 4.1，酸中毒与高血糖改善', kw: ['复查', '较前', '改善', '好转', '下降'] },

        { id: 'm1', dim: 'meaning', w: 3, text: '符合糖尿病酮症酸中毒（DKA）：高血糖 + 酮体阳性 + 高 AG 代酸', kw: ['酮症酸中毒', 'dka'] },
        { id: 'm2', dim: 'meaning', w: 2.5, text: '深大呼吸（Kussmaul 呼吸）是对代谢性酸中毒的代偿性呼吸性碱中毒', kw: ['kussmaul', '库斯莫尔', '深大呼吸', '呼吸性碱中毒', '代偿'] },
        { id: 'm3', dim: 'meaning', w: 2, text: '血钾升高为酸中毒与脱水所致，补液降糖后迅速下降，需及时补钾', kw: ['血钾', '转移', '补钾', '下降', '细胞内'] },
        { id: 'm4', dim: 'meaning', w: 1.5, text: '呕吐、腹痛与 DKA 有关，淀粉酶正常有助于排除合并胰腺炎', kw: ['呕吐', '腹痛', '淀粉酶', '胰腺炎'] },
        { id: 'm5', dim: 'meaning', w: 1.5, text: '白细胞升高既可为应激反应，也需警惕感染作为诱因', kw: ['应激', '感染', '诱因'] },

        { id: 'r1', dim: 'reasoning', w: 3, text: '诊断糖尿病酮症酸中毒（DKA）', kw: ['dka', '酮症酸中毒'] },
        { id: 'r2', dim: 'reasoning', w: 2.5, text: '需明确分型：查胰岛功能（C 肽）、糖尿病自身抗体', kw: ['分型', '胰岛功能', 'c肽', 'c-肽', '自身抗体', '1型', '2型'] },
        { id: 'r3', dim: 'reasoning', w: 2, text: '评估诱因：感染、胰岛素中断、初发糖尿病', kw: ['诱因', '感染', '初发', '停药', '中断'] },
        { id: 'r4', dim: 'reasoning', w: 1.5, text: '需与高渗高血糖综合征、乳酸酸中毒、饥饿性酮症鉴别', kw: ['高渗', 'hhs', '乳酸酸中毒', '饥饿性酮症', '鉴别'] },

        { id: 'p1', dim: 'plan', w: 3, text: '补液为首要措施，先快后慢（生理盐水）', kw: ['补液', '生理盐水', '液体复苏', '0.9%', '盐水'] },
        { id: 'p2', dim: 'plan', w: 3, text: '小剂量胰岛素持续静滴，血糖降至 13.9 mmol/L 时加用葡萄糖', kw: ['胰岛素', '小剂量', '静滴', '13.9', '葡萄糖'] },
        { id: 'p3', dim: 'plan', w: 2.5, text: '监测血钾并及时补钾（尿量恢复后）', kw: ['补钾', '血钾', '监测', '尿量'] },
        { id: 'p4', dim: 'plan', w: 2, text: '每小时监测血糖、每 2–4 小时复查血气电解质并计算阴离子间隙', kw: ['每小时', '复查', '血气', '电解质', '阴离子间隙'] },
        { id: 'p5', dim: 'plan', w: 1.5, text: '寻找诱因（血/尿培养、胸片）；碳酸氢钠不作为常规使用', kw: ['培养', '感染灶', '胸片', '碳酸氢钠', '诱因'] }
      ],
      penalties: [
        { dim: 'abnormal', re: /(血糖)[^。；\n]{0,6}(正常|无异常)/, text: '称血糖正常（28.6 mmol/L，显著升高）' },
        { dim: 'meaning', re: /(酮体)[^。；\n]{0,6}(阴性|正常)/, text: '称酮体阴性（血酮 5.8、尿酮体 3+）' },
        { dim: 'plan', re: /(碳酸氢钠|碱剂|纠酸)[^。；\n]{0,8}(常规|首选|立即使用)/, text: '把碳酸氢钠作为常规纠酸手段（DKA 一般不需常规补碱）' }
      ],
      refAnswer: '患者青年男性，多饮多尿 2 周伴体重下降，2 天来恶心呕吐、腹痛，查体见深大呼吸与呼气烂苹果味，既往未诊断糖尿病。检验示血糖 28.6 mmol/L、β-羟丁酸 5.8 mmol/L、尿糖 4+、尿酮体 3+；血气 pH 7.16、HCO₃⁻ 7.6 mmol/L、BE -19.5 mmol/L，生化阴离子间隙 27 mmol/L，为典型高阴离子间隙代谢性酸中毒；计算渗透压 305 mOsm/L，无明显高渗；白细胞 16.8×10⁹/L、中性粒细胞 82%，可能与应激有关，也需排查感染诱因；血钾 5.4 mmol/L（酸中毒与脱水所致，补液降糖后将下降）、血钠 130 mmol/L，肌酐 118 μmol/L、尿素 9.8 mmol/L、尿比重 1.032 提示脱水与肾前性氮质血症；淀粉酶正常，腹痛更可能为 DKA 本身所致。综合符合糖尿病酮症酸中毒（DKA）。建议以补液（生理盐水）为首要措施，先快后慢；小剂量胰岛素持续静滴，血糖降至 13.9 mmol/L 时加用葡萄糖；监测血钾并在尿量恢复后及时补钾；每小时监测血糖、每 2–4 小时复查血气与电解质并计算阴离子间隙；同时寻找诱因（血/尿培养、胸片），碳酸氢钠不作常规使用；病情稳定后查 C 肽与糖尿病自身抗体明确分型，并转入糖尿病教育。'
    }
  },
  {
    id: 'LAB-20261121-0722',
    title: '胸痛 2 小时伴大汗',
    status: 'published',
    level: 'R3',
    reportTypes: ['心肌标志物', '血常规', '生化', '凝血'],
    specimen: '静脉血',
    department: '心血管内科',
    times: ['急诊 11-21 07:22', '6 小时后复查 11-21 13:20'],
    patient: {
      name: '赵国强',
      sex: '男',
      age: '62 岁',
      chiefComplaint: '持续性胸骨后疼痛 2 小时',
      clinical: '静息状态下突发胸骨后压榨样疼痛 2 小时，持续不缓解，向左肩、左臂内侧及下颌放射，伴大汗、恶心、濒死感；含服硝酸甘油 1 片无减轻。无撕裂样痛及疼痛向背部迁移，无咯血、黑蒙及晕厥，无发热。既往高血压 10 年（最高 170/100 mmHg，未规律服药、很少监测），吸烟 30 年（约 20 支/日，未戒）；否认糖尿病、脑血管病、慢性肾病及消化道出血史，近期无手术、外伤、长期卧床及制动史，未使用抗凝或抗血小板药物。到院后已予阿司匹林 300 mg 嚼服、替格瑞洛 180 mg 负荷、普通肝素抗凝及吗啡 3 mg 镇痛，两次标本分别在到院时与给药后 6 小时采集。' +
        '查体：T 36.6℃，血压 138/86 mmHg，心率 96 次/分，呼吸 20 次/分。痛苦表情、皮肤湿冷；颈静脉无充盈，心界不大、各瓣膜区未闻及病理性杂音，双肺底少量湿啰音，腹软无压痛，四肢动脉搏动对称、双下肢无水肿。心电图示 V2-V5 导联 ST 段弓背向上抬高 0.3-0.5 mV。'
    },
    tips: [
      '本次肌钙蛋白升高到什么程度？为什么临床上仍要强调动态变化？',
      'CK-MB 尚在参考区间内能否排除心肌损伤？与肌钙蛋白的时间窗有何不同？',
      'D-二聚体正常在本例的鉴别诊断中有什么价值？',
      '哪些检验与临床信息决定是否需要立即再灌注治疗？'
    ],
    highlights: [
      { name: '高敏肌钙蛋白 hs-cTnI', value: '0.06→3.85', unit: 'ng/mL', ref: '0–0.04', abn: true },
      { name: 'CK-MB', value: '4.2→68', unit: 'ng/mL', ref: '0–5', abn: true },
      { name: '白细胞 WBC', value: '11.8', unit: '×10⁹/L', ref: '3.5–9.5', abn: true },
      { name: 'LDL-C', value: '3.8', unit: 'mmol/L', ref: '< 3.4', abn: true }
    ],
    panels: [
      {
        id: 'cardiac', name: '心肌标志物', rows: [
          { name: '高敏肌钙蛋白 hs-cTnI', unit: 'ng/mL', ref: '0–0.04', first: '0.06', second: '3.85', hi: 0.04 },
          { name: '肌酸激酶同工酶 CK-MB', unit: 'ng/mL', ref: '0–5', first: '4.2', second: '68', hi: 5 },
          { name: '肌红蛋白 MYO', unit: 'ng/mL', ref: '0–70', first: '78', second: '186', hi: 70 },
          { name: 'N 端脑钠肽前体 NT-proBNP', unit: 'pg/mL', ref: '0–125', first: '320', second: '486', hi: 125 },
          { name: '肌钙蛋白 T', unit: 'ng/mL', ref: '0–0.014', first: '0.021', second: '1.86', hi: 0.014 }
        ]
      },
      {
        id: 'cbc', name: '血常规', rows: [
          { name: '白细胞 WBC', unit: '×10⁹/L', ref: '3.5–9.5', first: '11.8', second: '13.2', lo: 3.5, hi: 9.5 },
          { name: '中性粒细胞% NEUT%', unit: '%', ref: '40–75', first: '78.4', second: '80.1', lo: 40, hi: 75 },
          { name: '血红蛋白 HGB', unit: 'g/L', ref: '130–175', first: '156', second: '152', lo: 130, hi: 175 },
          { name: '血小板 PLT', unit: '×10⁹/L', ref: '125–350', first: '232', second: '218', lo: 125, hi: 350 }
        ]
      },
      {
        id: 'bio', name: '生化 + 血脂', rows: [
          { name: '血糖 GLU', unit: 'mmol/L', ref: '3.9–6.1', first: '8.6', second: '7.9', lo: 3.9, hi: 6.1 },
          { name: '肌酐 Cr', unit: 'μmol/L', ref: '57–111', first: '92', second: '96', lo: 57, hi: 111 },
          { name: '尿素 BUN', unit: 'mmol/L', ref: '3.1–8.0', first: '5.6', second: '6.1', lo: 3.1, hi: 8 },
          { name: '血钾 K', unit: 'mmol/L', ref: '3.5–5.3', first: '4.0', second: '3.8', lo: 3.5, hi: 5.3 },
          { name: '丙氨酸氨基转移酶 ALT', unit: 'U/L', ref: '9–50', first: '32', second: '38', lo: 9, hi: 50 },
          { name: '总胆固醇 TC', unit: 'mmol/L', ref: '< 5.2', first: '6.2', second: '—', hi: 5.2 },
          { name: '低密度脂蛋白 LDL-C', unit: 'mmol/L', ref: '< 3.4', first: '3.8', second: '—', hi: 3.4 }
        ]
      },
      {
        id: 'coag', name: '凝血', rows: [
          { name: '凝血酶原时间 PT', unit: 's', ref: '11.0–14.5', first: '12.1', second: '12.4', lo: 11, hi: 14.5 },
          { name: '活化部分凝血活酶时间 APTT', unit: 's', ref: '28.0–42.0', first: '32.0', second: '33.6', lo: 28, hi: 42 },
          { name: '纤维蛋白原 FIB', unit: 'g/L', ref: '2.0–4.0', first: '3.6', second: '4.1', lo: 2, hi: 4 },
          { name: 'D-二聚体 D-Dimer', unit: 'mg/L FEU', ref: '< 0.55', first: '0.32', second: '0.48', hi: 0.55 }
        ]
      }
    ],
    gold: {
      points: [
        { id: 'a1', dim: 'abnormal', w: 3, text: 'hs-cTnI 0.06→3.85 ng/mL 动态显著升高，肌钙蛋白 T 亦升高', kw: ['肌钙蛋白', 'ctni', 'tni', 'ctnt', 'tnt', '0.06', '3.85', '升高'] },
        { id: 'a2', dim: 'abnormal', w: 2.5, text: 'CK-MB 由 4.2 升至 68、肌红蛋白升高，符合心肌损伤标志物的时间曲线', kw: ['ck-mb', 'ckmb', '肌红蛋白', 'myo', '时间曲线', '68'] },
        { id: 'a3', dim: 'abnormal', w: 2, text: '白细胞 13.2、中性粒细胞 80.1% 升高，血糖 7.9 升高（应激反应）', kw: ['白细胞', 'wbc', '中性粒', '血糖', '应激'] },
        { id: 'a4', dim: 'abnormal', w: 2, time: 'trend', text: 'NT-proBNP 320→486 pg/mL 升高，提示心功能受累', kw: ['bnp', '脑钠肽', '心功能', '心衰'] },
        { id: 'a5', dim: 'abnormal', w: 1.5, text: 'LDL-C 3.8 mmol/L、总胆固醇 6.2 mmol/L 升高（既往血脂，本次未复查）', kw: ['ldl', '胆固醇', '血脂', 'tc', '危险因素'] },
        { id: 'a6', dim: 'abnormal', w: 1.5, text: '凝血基本正常、D-二聚体 0.48 未升高', kw: ['d-二聚体', 'd二聚体', '凝血', '正常'] },

        { id: 'm1', dim: 'meaning', w: 3, text: '心肌标志物动态升高提示急性心肌损伤/梗死', kw: ['心肌损伤', '心肌梗死', '心梗', 'ami'] },
        { id: 'm2', dim: 'meaning', w: 2.5, text: '高敏肌钙蛋白在症状早期即可升高，诊断依赖 0/1h 或 0/3h 动态变化', kw: ['动态', '高敏', '0/1h', '0/3h', '早期', '随访检测'] },
        { id: 'm3', dim: 'meaning', w: 2, text: '需结合心电图 ST 段抬高与导联定位判断梗死部位与范围', kw: ['心电图', 'st段', 'st 段', '定位', '导联'] },
        { id: 'm4', dim: 'meaning', w: 1.5, text: '血糖、白细胞升高多为应激反应，同时提示预后风险较高', kw: ['应激', '预后', '风险'] },

        { id: 'r1', dim: 'reasoning', w: 3, text: '诊断急性心肌梗死（本例心电图 ST 抬高，考虑 STEMI）', kw: ['心肌梗死', '心梗', 'stemi', 'st段抬高'] },
        { id: 'r2', dim: 'reasoning', w: 2.5, text: '按胸痛中心流程评估再灌注时间窗（急诊 PCI 优先）', kw: ['再灌注', '时间窗', '胸痛中心', '溶栓', 'pci', '介入'] },
        { id: 'r3', dim: 'reasoning', w: 2, text: '需鉴别主动脉夹层、肺栓塞、心包炎；D-二聚体正常有助于降低其可能', kw: ['夹层', '肺栓塞', '心包炎', '鉴别', 'd-二聚体'] },

        { id: 'p1', dim: 'plan', w: 3, text: '10 分钟内完成心电图并启动胸痛中心，评估急诊 PCI 或溶栓', kw: ['心电图', '胸痛中心', 'pci', '溶栓', '再灌注', '介入'] },
        { id: 'p2', dim: 'plan', w: 2.5, text: '双联抗血小板（阿司匹林 + 替格瑞洛/氯吡格雷）联合抗凝', kw: ['阿司匹林', '替格瑞洛', '氯吡格雷', '抗血小板', '抗凝', '肝素'] },
        { id: 'p3', dim: 'plan', w: 2, text: '3–6 小时复查 hs-cTn 动态观察', kw: ['复查', '3小时', '3-6小时', '6小时', '动态'] },
        { id: 'p4', dim: 'plan', w: 1.5, text: '心电监护、吸氧、镇痛（吗啡）与强化他汀治疗', kw: ['监护', '吸氧', '吗啡', '他汀', '镇痛'] },
        { id: 'p5', dim: 'plan', w: 1.5, text: '管理危险因素：控制血压、血脂，戒烟', kw: ['血压', '血脂', '戒烟', '危险因素'] }
      ],
      penalties: [
        { dim: 'abnormal', re: /(肌钙蛋白|ctni|ctnt)[^。；\n]{0,6}(正常|阴性)/, text: '称肌钙蛋白正常/阴性（0.06→3.85 ng/mL 明显升高）' },
        { dim: 'reasoning', re: /(不需要|无需)[^。；\n]{0,8}(心电图|再灌注|pci|介入)/, text: '认为无需心电图或再灌注评估' },
        { dim: 'plan', re: /(等|待)[^。；\n]{0,8}(肌钙蛋白|化验|结果)[^。；\n]{0,8}(再|才)/, text: '等待化验结果再处理（胸痛需先按流程处置）' }
      ],
      refAnswer: '患者老年男性，持续性胸骨后压榨样疼痛 2 小时并向左肩、下颌放射，伴大汗，有高血压与吸烟史，心电图 V2–V5 ST 段抬高，首先考虑急性 ST 段抬高型心肌梗死。检验示高敏肌钙蛋白 I 由 0.06 升至 3.85 ng/mL，肌钙蛋白 T 由 0.021 升至 1.86 ng/mL，CK-MB 由 4.2 升至 68 ng/mL、肌红蛋白升高，呈典型心肌损伤标志物时间曲线；NT-proBNP 320→486 pg/mL 升高提示心功能受累；白细胞 11.8×10⁹/L、血糖 8.6 mmol/L 升高多为应激反应，也提示预后风险；LDL-C 3.8 mmol/L、总胆固醇 6.2 mmol/L 升高为重要危险因素；凝血基本正常、D-二聚体 0.32 mg/L 未升高，有助于降低主动脉夹层与肺栓塞的可能，但仍需结合影像判断。处置上应立即（10 分钟内）完成心电图并启动胸痛中心，评估急诊 PCI，若无法及时 PCI 则评估溶栓；给予双联抗血小板（阿司匹林 + 替格瑞洛/氯吡格雷）联合抗凝；3–6 小时复查肌钙蛋白动态观察；同时心电监护、吸氧、镇痛（吗啡）并强化他汀治疗；后续管理血压、血脂与戒烟。'
    }
  }
]

export function getLabCase(id) {
  return LAB_CASES.find(c => c.id === id) || null
}

export function labCardOf(c, stat) {
  return {
    id: c.id,
    title: c.title,
    level: c.level,
    reportTypes: c.reportTypes,
    specimen: c.specimen,
    department: c.department,
    clinical: c.patient.clinical,
    patient: c.patient,
    trainedRounds: stat ? stat.attempts || 0 : 0,
    lastScore: stat ? (stat.score != null ? stat.score : null) : null,
    lastAt: stat ? stat.lastAt || '' : ''
  }
}
