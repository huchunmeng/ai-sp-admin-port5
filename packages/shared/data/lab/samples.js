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
      clinical: '发热 3 天，T 39.2℃，血压 92/56 mmHg，心率 118 次/分；乏力、纳差，皮肤散在瘀点。'
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
    gold: {
      points: [
        { id: 'a1', dim: 'abnormal', w: 3, text: '血红蛋白 52→44 g/L，重度贫血且达危急值', kw: ['血红蛋白', 'hgb', 'hb ', '贫血', '52', '44 g'] },
        { id: 'a2', dim: 'abnormal', w: 2, text: '血小板 45→32，进行性下降', kw: ['血小板', 'plt', '32'] },
        { id: 'a3', dim: 'abnormal', w: 2, text: '白细胞、中性粒细胞、CRP、PCT 显著升高', kw: ['白细胞', 'wbc', '中性粒', 'crp', 'c反应蛋白', 'pct', '降钙素原', '炎症指标'] },
        { id: 'a4', dim: 'abnormal', w: 3, text: '凝血异常：PT/APTT 延长、FIB 降低、D-二聚体升高', kw: ['凝血', 'pt', 'aptt', '纤维蛋白原', 'fib', 'd-二聚体', 'd二聚体', 'ddimer'] },
        { id: 'a5', dim: 'abnormal', w: 1.5, text: '肝酶升高（ALT 186、AST 240、LDH 620）', kw: ['转氨酶', 'alt', 'ast', '肝酶', '乳酸脱氢酶', 'ldh', '肝功能'] },
        { id: 'a6', dim: 'abnormal', w: 2, text: '代谢性酸中毒：pH 7.31、HCO₃⁻ 14.2、BE -10.5、乳酸升高', kw: ['酸中毒', 'ph', '碳酸氢根', 'hco3', '剩余碱', '乳酸', 'lac', '代谢性酸'] },
        { id: 'a7', dim: 'abnormal', w: 1.5, text: '肾功能受损：Cr 168→201、BUN 升高', kw: ['肌酐', 'cr ', '肾功能', '尿素', 'bun', '氮质血症'] },
        { id: 'a8', dim: 'abnormal', w: 2, text: '复查指标进行性恶化（Hb、PLT、乳酸、Cr 均变差）', kw: ['复查', '较前', '进行性', '恶化', '下降', '加重', '动态', '进展'] },

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
      clinical: '饮酒后出现持续性上腹痛并向腰背部放射，伴恶心、呕吐；T 37.8℃，血压 118/72 mmHg，上腹压痛明显。既往有胆囊结石。'
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
    gold: {
      points: [
        { id: 'a1', dim: 'abnormal', w: 3, text: '淀粉酶 890、脂肪酶 620 显著升高（>3 倍正常上限）', kw: ['淀粉酶', 'amy', '脂肪酶', 'lip', '胰酶'] },
        { id: 'a2', dim: 'abnormal', w: 2, text: '白细胞、中性粒细胞及 CRP 升高', kw: ['白细胞', 'wbc', '中性粒', 'crp', 'c反应蛋白', '炎症'] },
        { id: 'a3', dim: 'abnormal', w: 2.5, text: '血钙 1.92→1.84 降低', kw: ['血钙', '低钙', '钙'] },
        { id: 'a4', dim: 'abnormal', w: 1.5, text: '血糖升高（9.2）与甘油三酯升高（3.6）', kw: ['血糖', '甘油三酯', 'tg', '高血糖', '高脂'] },
        { id: 'a5', dim: 'abnormal', w: 1.5, text: '肝酶轻度升高、总胆红素轻度升高', kw: ['转氨酶', 'alt', 'ast', '胆红素', '肝酶', '肝功能'] },
        { id: 'a6', dim: 'abnormal', w: 2, text: '轻度代谢性酸中毒伴乳酸升高（HCO₃⁻ 18.4、Lac 2.4）', kw: ['酸中毒', '碳酸氢根', 'hco3', '乳酸', 'lac', '剩余碱', 'be'] },
        { id: 'a7', dim: 'abnormal', w: 2, text: '淀粉酶/脂肪酶较前下降、CRP 升高，呈动态演变', kw: ['复查', '较前', '下降', '动态', '演变'] },
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
      refAnswer: '患者饮酒后出现持续性上腹痛并向腰背部放射，伴恶心呕吐，上腹压痛，结合淀粉酶 890 U/L、脂肪酶 620 U/L 显著升高（均超过正常上限 3 倍以上），首先考虑急性胰腺炎。白细胞、中性粒细胞及 CRP 升高提示明显炎症反应，复查 CRP 由 86 升至 142 mg/L，需警惕病情进展；血钙 1.92→1.84 mmol/L 降低，提示脂肪皂化及重症倾向，应进行严重度评估。血糖 9.2 mmol/L、甘油三酯 3.6 mmol/L 升高，结合饮酒史与胆囊结石，病因需鉴别酒精性、高甘油三酯性及胆源性。肝酶及胆红素轻度升高可能与胆道因素或炎症波及有关；HCO₃⁻ 18.4 mmol/L、乳酸 2.4 mmol/L 提示轻度代谢性酸中毒，与呕吐、脱水及有效循环血量不足有关。建议完善腹部 CT 及超声明确胰腺与胆道情况，禁食、胃肠减压、积极液体复苏并镇痛；复查血钙、CRP 及胰酶动态评估严重度；查血脂及肝功能明确病因，必要时针对胆源性因素处理；监测血糖，必要时应用胰岛素。'
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
