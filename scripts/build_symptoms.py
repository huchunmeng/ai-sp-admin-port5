import sys, re, collections
sys.stdout.reconfigure(encoding='utf-8')

path = r"D:\klord的个人文件夹\02_work - 副本\01_AI工作区\2.0版文档\ai-sp-admin\apps\admin\src\views\case-editor\disease-data.js"
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Parse categoriesMap (specialty → categories)
cm_start = content.find('categoriesMap:')
dm_start = content.find('diseasesMap:')
cm_section = content[cm_start:dm_start]
spec_cat_map = {}
for m in re.finditer(r'"([^"]+)":\s*\[([^\]]*)\]', cm_section):
    key = m.group(1)
    vals = re.findall(r'"([^"]+)"', m.group(2))
    if key not in ['specialties', 'categoriesMap', 'diseasesMap']:
        spec_cat_map[key] = vals

# Parse diseasesMap (category → [{name, mastery}])
dm_section = content[dm_start:]
diseases_map = {}
for m in re.finditer(r'"([^"]+)":\s*\[([^\]]+)\]', dm_section):
    key = m.group(1)
    items_str = m.group(2)
    items = []
    for item_m in re.finditer(r'\{\s*"name":\s*"([^"]+)",\s*"mastery":\s*"([^"]+)"\s*\}', items_str):
        items.append({'name': item_m.group(1), 'mastery': item_m.group(2)})
    if key not in ['specialties', 'categoriesMap', 'diseasesMap']:
        diseases_map[key] = items

print(f"Specialties: {len(spec_cat_map)}, Categories: {len(diseases_map)}")

# Category → Symptom mapping
CAT_TO_SYMPTOM = {
    '感染性疾病': '发热', '传染病急症': '发热', '感染性皮肤病': '发热',
    '妊娠合并感染性疾病': '发热', '中枢神经系统感染性疾病': '发热',
    '泌尿系感染': '发热', '腹膜和腹膜腔感染': '发热',
    '耳鼻喉感染性疾病': '发热', '中枢神经系统感染': '发热',
    '感染性疾病(胸心外科)': '发热', '儿科急症': '发热',

    '呼吸系统': '咳嗽/呼吸困难', '呼吸系统急症': '咳嗽/呼吸困难',
    '肺部肿瘤': '咳嗽/呼吸困难', '纵隔膈肌疾病': '咳嗽/呼吸困难',
    '阻塞性睡眠呼吸暂停低通气综合征': '咳嗽/呼吸困难',
    '阻塞性睡眠呼吸暂停通气综合征': '咳嗽/呼吸困难',

    '心血管系统': '胸痛/胸闷/心悸', '循环系统急症': '胸痛/胸闷/心悸',
    '先天性心脏病': '胸痛/胸闷/心悸', '心脏瓣膜病': '胸痛/胸闷/心悸',
    '大血管病变': '胸痛/胸闷/心悸', '小儿心胸外科': '胸痛/胸闷/心悸',

    '消化系统': '腹痛/腹部不适', '消化系统急症': '腹痛/腹部不适',
    '急腹症': '腹痛/腹部不适', '阑尾疾病': '腹痛/腹部不适',
    '小肠和结肠疾病': '腹痛/腹部不适', '胆系疾病': '腹痛/腹部不适',
    '胰腺疾病': '腹痛/腹部不适', '十二指肠疾病': '腹痛/腹部不适',
    '直肠疾病': '腹痛/腹部不适', '腹外疝': '腹痛/腹部不适',
    '门脉高压症': '腹痛/腹部不适', '肝脏疾病': '腹痛/腹部不适',
    '普通外科急症': '腹痛/腹部不适', '中毒': '腹痛/腹部不适',
    '理化因素所致疾病及中毒': '腹痛/腹部不适',
    '妇产科急症': '腹痛/腹部不适', '小儿普通外科': '腹痛/腹部不适',

    '头痛': '头痛/头晕', '眩晕': '头痛/头晕',
    '脑血管疾病': '头痛/头晕', '神经系统急症': '头痛/头晕',
    '睡眠障碍': '头痛/头晕', '神经重症': '头痛/头晕',
    '运动障碍性疾病': '头痛/头晕', '神经系统变性疾病': '头痛/头晕',
    '脱髓鞘病': '头痛/头晕', '脊髓疾病': '头痛/头晕',
    '神经肌肉系统疾病': '头痛/头晕', '周围神经病': '头痛/头晕',
    '癫痫': '头痛/头晕', '神经-肌肉接头和肌肉疾病': '头痛/头晕',

    '腰腿痛及肩颈痛': '关节/腰背痛', '关节损伤': '关节/腰背痛',
    '关节脱位': '关节/腰背痛', '骨关节病': '关节/腰背痛',
    '运动医学': '关节/腰背痛', '风湿免疫病': '关节/腰背痛',
    '风湿免疫急症': '关节/腰背痛', '脊柱及骨盆骨折': '关节/腰背痛',
    '结缔组织病': '关节/腰背痛', '小儿骨科': '关节/腰背痛',
    '免疫性疾病': '关节/腰背痛',

    '大疱及疱疹性皮肤病': '皮疹/皮肤病变', '寄生虫及动物性皮肤病': '皮疹/皮肤病变',
    '性传播疾病': '皮疹/皮肤病变', '物理性皮肤病': '皮疹/皮肤病变',
    '皮肤肿瘤': '皮疹/皮肤病变', '皮肤附属器疾病': '皮疹/皮肤病变',
    '神经功能障碍性皮肤病': '皮疹/皮肤病变', '粘膜疾病': '皮疹/皮肤病变',
    '红斑丘疹鳞屑性皮肤病': '皮疹/皮肤病变', '色素异常性皮肤病': '皮疹/皮肤病变',
    '营养与代谢障碍性皮肤病': '皮疹/皮肤病变', '血管性皮肤病': '皮疹/皮肤病变',
    '血管炎': '皮疹/皮肤病变', '角化及萎缩性皮肤病': '皮疹/皮肤病变',
    '过敏性或变态反应性皮肤病': '皮疹/皮肤病变', '遗传性皮肤病': '皮疹/皮肤病变',
    '非感染性肉芽肿及脂膜炎症': '皮疹/皮肤病变',
    '皮肤科急症': '皮疹/皮肤病变', '皮肤科其他': '皮疹/皮肤病变',

    '泌尿系统': '排尿异常', '泌尿系统急症': '排尿异常',
    '泌尿系损伤': '排尿异常', '前列腺增生及泌尿系梗阻': '排尿异常',
    '结石': '排尿异常', '小儿泌尿外科': '排尿异常',
    '肾上腺外科': '排尿异常', '泌尿外科肿瘤': '排尿异常',

    '血液系统': '出血/贫血', '血液系统急症': '出血/贫血',
    '消化道出血': '出血/贫血', '产前出血': '出血/贫血',
    '异常产褥': '出血/贫血', '分娩期并发症': '出血/贫血',
    '异常分娩': '出血/贫血',

    '内分泌系统': '消瘦/乏力/肿块', '内分泌代谢急症': '消瘦/乏力/肿块',
    '内分泌遗传代谢性疾病': '消瘦/乏力/肿块',
    '营养与营养障碍疾病': '消瘦/乏力/肿块',
    '电解质和酸碱平衡失常': '消瘦/乏力/肿块',
    '肿瘤': '消瘦/乏力/肿块', '骨软组织肿瘤': '消瘦/乏力/肿块',
    '小儿肿瘤外科': '消瘦/乏力/肿块',
    '妇科恶性肿瘤': '消瘦/乏力/肿块', '妇科良性肿瘤': '消瘦/乏力/肿块',
    '食管恶性疾病': '消瘦/乏力/肿块', '食管良性疾病': '消瘦/乏力/肿块',
    '肿瘤(泌尿外科)': '消瘦/乏力/肿块',
    '乳房疾病': '消瘦/乏力/肿块', '甲状腺和甲状旁腺疾病': '消瘦/乏力/肿块',
    '颈部肿块': '消瘦/乏力/肿块',

    '创伤急症': '外伤', '腹部损伤': '外伤', '眼外伤': '外伤',
    '环境急诊': '外伤', '手外伤': '外伤', '外伤(胸心外科)': '外伤',
    '外伤': '外伤', '小儿烧伤整形外科': '外伤',
    '小儿神经外科': '外伤', '周围神经损伤': '外伤',

    '急危重症': '意识障碍', '重症医学': '意识障碍',

    '巩膜炎': '眼/视力问题', '斜视与弱视': '眼/视力问题',
    '晶状体病': '眼/视力问题', '泪器疾病': '眼/视力问题',
    '玻璃体视网膜疾病': '眼/视力问题', '眼眶病': '眼/视力问题',
    '眼睑疾病': '眼/视力问题', '结膜疾病': '眼/视力问题',
    '葡萄膜病': '眼/视力问题', '视光学疾病': '眼/视力问题',
    '视路疾病': '眼/视力问题', '角膜病': '眼/视力问题',
    '青光眼': '眼/视力问题',

    '侧颅底肿瘤': '耳鼻喉症状', '咽部炎症': '耳鼻喉症状',
    '喉部炎症': '耳鼻喉症状', '鼻及鼻窦炎性疾病': '耳鼻喉症状',
    '中耳疾病及耳源性颅内并发症': '耳鼻喉症状', '鼻部肿瘤': '耳鼻喉症状',
    '气管、食管疾病': '耳鼻喉症状', '耳聋': '耳鼻喉症状',
    '咽部疾病': '耳鼻喉症状', '喉部疾病': '耳鼻喉症状',
    '咽部肿瘤': '耳鼻喉症状', '咽部脓肿': '耳鼻喉症状',
    '喉外伤': '耳鼻喉症状', '喉梗阻': '耳鼻喉症状',
    '喉神经性疾病': '耳鼻喉症状', '喉部肿瘤': '耳鼻喉症状',
    '外耳疾病': '耳鼻喉症状', '咽异物': '耳鼻喉症状',
    '鼻部常见疾病': '耳鼻喉症状',

    '产前检查与孕期保健': '妇产科', '多胎妊娠': '妇产科',
    '妇科内分泌疾病': '妇产科', '妇科复杂疾病': '妇产科',
    '妇科常见病': '妇产科', '妇科常见危重急症': '妇产科',
    '妊娠合并内外科疾病': '妇产科', '正常分娩与产褥': '妇产科',
    '病理妊娠': '妇产科', '胎儿异常': '妇产科',
    '辅助生育技术': '妇产科',

    '新生儿与新生儿疾病': '新生儿/儿科',
    '新生儿外科': '新生儿/儿科',

    '周围静脉疾病': '其他', '动脉性疾病': '其他',
    '整形外科临床常见病种': '其他', '临床常见病种': '其他',
    '其他(皮肤科)': '其他', '其他(神经内科)': '其他',
    '其他(胸心外科)': '其他', '内科系统疾病的神经系统表现': '其他',
    '其他': '其他',
}

# Build specialty → symptom → diseases mapping
from collections import defaultdict

spec_symptom_map = {}
unmapped = []

for spec, categories in spec_cat_map.items():
    symptom_diseases = defaultdict(set)
    for cat in categories:
        symptom = CAT_TO_SYMPTOM.get(cat)
        if not symptom:
            unmapped.append(f"{spec}/{cat}")
            continue
        diseases = diseases_map.get(cat, [])
        for d in diseases:
            symptom_diseases[symptom].add((d['name'], d['mastery']))

    spec_symptom_map[spec] = {}
    for symptom, diseases in sorted(symptom_diseases.items()):
        spec_symptom_map[spec][symptom] = sorted(diseases, key=lambda x: x[0])

# Report
total_diseases = 0
for spec in sorted(spec_symptom_map.keys()):
    sd = spec_symptom_map[spec]
    count = sum(len(v) for v in sd.values())
    total_diseases += count
    print(f"  {spec}: {len(sd)} symptoms, {count} diseases")

print(f"\nTotal: {len(spec_symptom_map)} specialties, {total_diseases} disease references")
if unmapped:
    print(f"Unmapped: {len(unmapped)}")
    for u in unmapped[:10]:
        print(f"  - {u}")

# Output JS
output_path = r"D:\klord的个人文件夹\02_work - 副本\01_AI工作区\2.0版文档\ai-sp-admin\apps\admin\src\views\case-editor\symptom-data.js"
with open(output_path, 'w', encoding='utf-8') as f:
    f.write('// 科室→症状→病种映射 — 用于院校阶段(U1/U2)病例编辑器\n')
    f.write('// 基于 categoriesMap + 住培大纲数据生成于 2026-05-27\n\n')

    # Export flat symptom list (union across all specialties)
    all_symptoms = set()
    for sd in spec_symptom_map.values():
        all_symptoms.update(sd.keys())
    f.write('export const symptomList = [\n')
    for s in sorted(all_symptoms):
        f.write(f'  "{s}",\n')
    f.write(']\n\n')

    # Export specialty → symptom map
    f.write('export const specialtySymptomMap = {\n')
    for spec in sorted(spec_symptom_map.keys()):
        sd = spec_symptom_map[spec]
        f.write(f'  "{spec}": {{\n')
        f.write(f'    symptoms: [\n')
        for s in sorted(sd.keys()):
            f.write(f'      "{s}",\n')
        f.write(f'    ],\n')
        f.write(f'    symptomMap: {{\n')
        for s in sorted(sd.keys()):
            diseases = sd[s]
            f.write(f'      "{s}": [\n')
            for d_name, mastery in diseases:
                f.write(f'        {{ name: "{d_name}", mastery: "{mastery}" }},\n')
            f.write(f'      ],\n')
        f.write(f'    }}\n')
        f.write(f'  }},\n')
    f.write('}\n')

print(f"\nWritten: {output_path}")
