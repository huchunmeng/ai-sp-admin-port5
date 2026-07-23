# -*- coding: utf-8 -*-
"""生成住培考核大纲完整MD文件（按专业拆分，含评分表详情+样题）

目录结构:
  考核大纲/{编号}_{专业}/
  ├── 00_综述.md
  ├── S01_{考站名}_说明.md
  ├── S01_{考站名}_表1_{评分表名}.md
  ├── S01_{考站名}_表2_{评分表名}.md  (如有)
  ├── S01_{考站名}_样题.md
  ├── S02_...
"""
import os, sys, json

# Target
OUT_DIR = r"D:\klord的个人文件夹\02_work - 副本\00_我的工作区\02_资料\01_政策资料\02_住培结业实践技能考核\02_标准规范\【卫健委人才交流服务中心】住培结业实践技能考核_考核大纲"

MAJOR_CODES = {
    '内科': '0100','儿科': '0200','急诊科': '0300','皮肤科': '0400','精神科': '0500',
    '神经内科': '0600','全科': '0700','康复医学科': '0800','外科': '0900-1300',
    '骨科': '1400','儿外科': '1500','妇产科': '1600','眼科': '1700','耳鼻咽喉科': '1800',
    '麻醉科': '1900','临床病理科': '2000','检验医学科': '2100','放射科': '2200',
    '超声科': '2300','核医学科': '2400','放射肿瘤科': '2500','医学遗传科': '2600',
    '预防医学科': '2700','口腔全科': '2800','口腔内科': '2900','口腔颌面外科': '3000',
    '口腔修复科': '3100','口腔正畸科': '3200','口腔病理科': '3300','口腔颌面影像科': '3400',
    '重症医学科': '3700',
}

# ===== 评分表模板详细内容 =====
# 每个模板包含: name, code, description, items (评分条目列表，每项含name, maxScore, criteria[])

SCORING_TEMPLATES = {}

def _reg_template(code, name, description, items):
    SCORING_TEMPLATES[code] = {'name': name, 'code': code, 'description': description, 'items': items}

_reg_template('TPL-STD', '病史采集评分表（标准模板）',
    '适用于各专业接诊病人站的病史采集考核，评估考生采集病史的完整性、条理性和沟通技巧。',
    [
        ('现病史采集', 30, ['发病时间与诱因 (8分)', '主要症状特点：部位/性质/程度/持续时间 (8分)',
                           '伴随症状 (6分)', '诊疗经过 (4分)', '一般情况 (4分)']),
        ('既往史采集', 20, ['既往疾病史 (8分)', '手术外伤史 (4分)',
                           '过敏史 (4分)', '用药史 (4分)']),
        ('个人史与家族史', 15, ['个人生活习惯 (5分)', '职业与环境暴露 (5分)',
                             '家族遗传病史 (5分)']),
        ('系统回顾', 15, ['各系统症状回顾 (10分)', '与主诉相关系统重点回顾 (5分)']),
        ('问诊技巧与沟通', 20, ['开场与自我介绍 (4分)', '开放性问题运用 (4分)',
                             '倾听与回应 (4分)', '条理清晰、逻辑连贯 (4分)',
                             '恰当使用过渡与总结 (4分)']),
    ])

_reg_template('TPL-STD-2', '体格检查评分表',
    '适用于各专业接诊病人站的体格检查考核，评估考生的查体手法、完整性和人文关怀。',
    [
        ('检查前准备', 15, ['洗手/手消毒 (5分)', '自我介绍与解释检查目的 (5分)',
                          '物品准备齐全 (5分)']),
        ('检查手法与规范', 40, ['视诊：充分暴露、光线充足、观察仔细 (10分)',
                             '触诊：手法正确、力度适中、顺序合理 (10分)',
                             '叩诊：手法规范、对比叩诊 (10分)',
                             '听诊：听诊器使用正确、听诊部位准确 (10分)']),
        ('检查内容完整性', 25, ['按系统顺序检查 (10分)', '重点部位详细检查 (10分)',
                             '阳性体征准确识别与描述 (5分)']),
        ('人文关怀', 20, ['保护患者隐私 (5分)', '注意保暖 (5分)',
                        '检查过程中与患者沟通 (5分)', '检查后帮助患者恢复体位 (5分)']),
    ])

_reg_template('TPL-STD-3', '病历书写评分表',
    '适用于病历书写站的考核，评估考生书写病历的规范性、完整性和临床逻辑。',
    [
        ('主诉与现病史', 30, ['主诉精炼准确（症状+时间） (8分)',
                           '现病史完整（起病、演变、诊疗经过） (12分)',
                           '鉴别诊断相关阴性症状记录 (5分)',
                           '语言规范、逻辑清晰 (5分)']),
        ('既往史与个人史', 15, ['既往史完整 (5分)', '个人史/婚育史/家族史 (5分)',
                             '过敏史明确标注 (5分)']),
        ('体格检查记录', 15, ['生命体征记录 (5分)', '各系统查体记录完整 (5分)',
                           '阳性体征详细描述、阴性体征恰当记录 (5分)']),
        ('诊断与鉴别诊断', 25, ['初步诊断明确、依据充分 (10分)',
                            '鉴别诊断合理 (10分)', '诊断排序合理 (5分)']),
        ('诊疗计划', 15, ['辅助检查选择合理 (5分)', '治疗方案具体可行 (5分)',
                        '健康教育与随访计划 (5分)']),
    ])

_reg_template('TPL-STD-4', '技能操作评分表',
    '适用于各专业技能操作站的考核，评估考生临床操作的规范性、熟练度和无菌观念。',
    [
        ('操作前准备', 15, ['核对患者信息与知情同意 (5分)',
                          '物品准备齐全、检查有效期 (5分)',
                          '洗手、戴口罩帽子、戴手套 (5分)']),
        ('操作过程规范', 45, ['体位摆放正确 (5分)', '无菌操作规范 (10分)',
                           '操作步骤正确、顺序合理 (15分)',
                           '操作熟练、动作流畅 (10分)',
                           '并发症预防措施 (5分)']),
        ('操作后处理', 20, ['标本处理与送检 (5分)', '伤口/穿刺点处理 (5分)',
                          '告知患者注意事项 (5分)', '操作记录书写 (5分)']),
        ('无菌观念与安全', 20, ['全程无菌操作意识 (10分)', '锐器处理与职业防护 (5分)',
                             '废物分类处理 (5分)']),
    ])

_reg_template('TPL-STD-5', '辅助检查判读评分表',
    '适用于辅助检查及影像学判读站的考核，评估考生对各种辅助检查结果的判读能力。',
    [
        ('检查信息识别', 15, ['患者基本信息核对 (5分)', '检查类型与技术参数识别 (5分)',
                           '检查质量评估（图像质量/标本合格） (5分)']),
        ('图像/结果分析', 40, ['正常解剖/生理结构识别 (10分)',
                            '异常发现准确定位 (10分)',
                            '异常特征准确描述 (10分)',
                            '与临床表现关联分析 (10分)']),
        ('诊断意见', 30, ['主要诊断明确 (10分)', '鉴别诊断列举 (10分)',
                        '建议进一步检查 (5分)', '临床相关性说明 (5分)']),
        ('报告规范', 15, ['报告格式规范 (5分)', '术语使用准确 (5分)',
                        '结论明确、建议合理 (5分)']),
    ])

_reg_template('TPL-STD-6', '人文沟通评分表',
    '适用于接诊病人站和交流沟通站的沟通考核，评估考生的医患沟通能力和人文素养。',
    [
        ('沟通准备与开场', 15, ['环境准备（安静、私密） (5分)',
                            '自我介绍与角色说明 (5分)',
                            '建立信任关系 (5分)']),
        ('信息采集与传达', 35, ['使用开放性问题引导 (8分)',
                             '信息传达清晰准确 (8分)',
                             '使用通俗易懂的语言 (7分)',
                             '确认对方理解（teach-back） (7分)',
                             '适时总结关键信息 (5分)']),
        ('共情与情绪回应', 25, ['识别对方情绪状态 (8分)',
                             '表达共情与理解 (8分)',
                             '恰当回应疑问与担忧 (9分)']),
        ('共同决策与计划', 15, ['提供选择方案 (5分)',
                             '尊重患者/家属意愿 (5分)',
                             '明确后续计划与安排 (5分)']),
        ('职业素养', 10, ['仪表端庄、态度和蔼 (3分)',
                        '尊重隐私与保密 (3分)',
                        '全程保持专业风范 (4分)']),
    ])

_reg_template('TPL-STD-7', '病例分析评分表',
    '适用于临床思维站的考核，评估考生对临床病例的综合分析能力和临床决策水平。',
    [
        ('病例摘要提炼', 15, ['关键信息准确提取 (5分)',
                           '主次分明、条理清晰 (5分)',
                           '时间线索梳理清楚 (5分)']),
        ('诊断与鉴别诊断', 35, ['主要诊断依据充分 (12分)',
                            '鉴别诊断全面（不少于3个） (12分)',
                            '诊断与鉴别的逻辑推理 (6分)',
                            '危重症排除 (5分)']),
        ('辅助检查选择', 20, ['首选检查合理 (8分)',
                           '备选检查考虑 (5分)',
                           '检查结果解读正确 (7分)']),
        ('治疗方案', 20, ['治疗原则正确 (8分)',
                        '具体方案可行 (7分)',
                        '个体化考虑因素 (5分)']),
        ('预后与预防', 10, ['预后判断合理 (5分)',
                          '健康教育内容恰当 (5分)']),
    ])


# ===== 样题模板 =====
# 每个样题包含: scenario (场景描述), task (任务要求), tips (注意事项)

SAMPLE_QUESTIONS = {}

def _reg_question(station_type, specialty, scenario, task, tips=''):
    key = f'{specialty}|{station_type}'
    SAMPLE_QUESTIONS[key] = {'scenario': scenario, 'task': task, 'tips': tips}

# -- 接诊病人站 样题 --
_reg_question('接诊病人站', '内科',
    '''【场景设置】
患者，男性，55岁，因"反复上腹疼痛1月，加重3天"来院就诊。
患者1月前无明显诱因出现上腹部隐痛，饭后加重，伴反酸、嗳气。近3天疼痛加重，呈持续性，
伴恶心，无呕吐。自行服用"胃药"（具体不详）效果不佳。
既往史：高血压病史5年，口服降压药（氨氯地平5mg qd），血压控制可。吸烟30年，约1包/天。
家族史：父亲有胃癌病史。

【SP（标准化病人）设定】
- 模拟上腹痛患者，表情痛苦
- 生命体征：T 36.8°C，P 88次/分，R 18次/分，BP 145/90mmHg
- 腹部查体：上腹部轻压痛，无反跳痛，Murphy征阴性''',
    '''【考核任务】
1. 对SP进行系统的病史采集（10分钟）
2. 进行重点体格检查（腹部查体为主）（5分钟）
3. 完成接诊记录书写
4. 给出初步诊断及鉴别诊断
5. 提出下一步辅助检查建议''',
    '''【考核要点提示】
- 注意消化系统疾病的病史采集要点（疼痛性质、部位、放射、诱因/缓解因素）
- 腹部查体手法规范，注意腹膜刺激征
- 鉴别诊断需考虑：消化性溃疡、胃炎、胆囊疾病、胰腺疾病、胃癌
- 问诊中注意人文关怀，询问患者担忧''')

_reg_question('接诊病人站', '急诊科',
    '''【场景设置】
患者，男性，62岁，因"突发胸痛2小时"由家属陪同来急诊。
患者2小时前在活动时突发胸骨后压榨性疼痛，向左肩放射，伴大汗、恶心。舌下含服
硝酸甘油1片后疼痛稍缓解但未完全消失。既往有冠心病史3年，规律服药。
生命体征：T 36.5°C，P 102次/分，R 22次/分，BP 160/95mmHg，SpO2 95%。

【SP设定】
- 模拟急性胸痛患者，表情痛苦、焦虑
- 需模拟大汗、呼吸急促
- 对疼痛描述：压榨样，评分7/10''',
    '''【考核任务】
1. 快速进行急诊病史采集（5分钟）
2. 急诊重点体格检查（心脏、肺部为主）（5分钟）
3. 进行危重度评估
4. 给出初步诊断及鉴别诊断
5. 急诊处理方案
6. 与患者及家属沟通病情''',
    '''【考核要点提示】
- 胸痛急诊处理流程：10分钟内完成首次评估+心电图
- 鉴别诊断：AMI、主动脉夹层、肺栓塞、气胸
- 注意询问溶栓/抗凝禁忌
- 危重度评估和分级处置''')

_reg_question('接诊病人站', '儿科',
    '''【场景设置】
患儿，男，3岁，由母亲陪同就诊。母亲诉患儿"发热咳嗽3天，今天开始喘"。
患儿3天前开始发热，体温最高39.2°C，伴咳嗽，阵发性，有痰不易咳出。
今天出现呼吸急促，喉部有"呼噜"声。食欲减退，精神尚可。

【SP设定】
- 母亲扮演者：焦虑，反复询问"严重吗？需要住院吗？"
- 需要模拟对患儿病情的担忧情绪
- 生命体征：T 38.8°C，P 130次/分，R 40次/分''',
    '''【考核任务】
1. 向患儿家长系统采集病史（8分钟）
2. 与患儿互动并安抚（2分钟）
3. 判断病情严重程度
4. 给出初步诊断及鉴别诊断
5. 向家长解释病情并沟通下一步诊疗计划''',
    '''【考核要点提示】
- 儿科病史采集特点：向家长采集+观察患儿
- 注意婴幼儿呼吸困难评估（三凹征、鼻翼煽动）
- 与患儿互动技巧：微笑、玩具吸引、语言安抚
- 与焦虑家长沟通：共情、通俗解释、明确指导''')

_reg_question('接诊病人站', '神经内科',
    '''【场景设置】
患者，女性，68岁，因"突发右侧肢体无力伴言语不清3小时"来院。
患者3小时前在家中突然出现右侧肢体无力，右上肢不能抬起，右下肢行走拖拽，
同时出现言语含糊不清，无头痛、无意识障碍。
既往史：高血压10年，糖尿病5年，均口服药物控制。房颤病史2年，未规律抗凝。

【SP设定】
- 模拟右侧肢体偏瘫（右上肢0级，右下肢3级）
- 言语含糊，找词困难
- 表情焦虑，情绪低落
- 生命体征：T 36.7°C，P 96次/分（不规则），R 18次/分，BP 180/100mmHg''',
    '''【考核任务】
1. 快速进行神经系统相关病史采集（包括发病时间精确到分钟）（8分钟）
2. 进行神经系统重点体格检查（7分钟）
3. NIHSS评分
4. 判断是否为溶栓时间窗内
5. 给出定位、定性诊断
6. 提出急诊处理方案''',
    '''【考核要点提示】
- 脑卒中"时间就是大脑"：精确记录发病时间
- 快速NIHSS评估
- 溶栓时间窗：4.5小时内
- 定位诊断：左侧大脑中动脉供血区
- 注意房颤相关心源性栓塞可能''')

_reg_question('接诊病人站', '精神科',
    '''【场景设置】
患者，女性，25岁，由父母陪同就诊。父母诉患者近2月来"行为异常"。
患者2月前开始出现情绪低落，不愿与人交流，经常独自待在房间里，
说"有人要害我"，"我的手机被监听了"。近1周来饮食减少，睡眠差，
不愿出门，工作已请假1月。否认有自伤、自杀行为。
既往体健，否认精神病史。家族史：母亲有"神经衰弱"史。

【SP设定】
- 模拟被害妄想：眼神警惕，言语谨慎，偶有自语
- 对医生表现出不信任
- 情绪低落，语量减少
- 需模拟一定的现实检验能力受损''',
    '''【考核任务】
1. 系统的精神科病史采集（包括客观信息+主观体验）（15分钟）
2. 精神状况检查（MSE）
3. 评估自伤/自杀/伤人风险
4. 给出初步诊断及鉴别诊断
5. 与家属沟通病情和治疗方案''',
    '''【考核要点提示】
- 精神科问诊技巧：建立信任、开放提问、非评判态度
- 精神状况检查五大维度：外观行为/言语/情绪/思维/认知
- 风险评估：自伤、自杀、暴力行为风险
- 鉴别诊断：精神分裂症谱系 vs 情感障碍伴精神病性症状
- 注意保护患者隐私，与家属沟通时注意分寸''')

# -- 临床思维站 样题 --
_reg_question('临床思维站', '内科',
    '''【病例资料】
患者，男性，62岁，农民。因"咳嗽、咳痰伴发热5天，胸痛1天"就诊。
5天前受凉后出现咳嗽，咳黄白色粘痰，量中等，伴发热（体温未测），自服"感冒药"
（具体不详）无好转。1天前出现右侧胸痛，咳嗽及深呼吸时加重。
既往史：吸烟40年，20支/天。糖尿病史3年。

体格检查：T 38.9°C，P 96次/分，R 24次/分，BP 130/80mmHg。
右侧胸廓呼吸运动减弱，右下肺叩诊浊音，听诊右下肺呼吸音减弱，
可闻及少量湿啰音。

辅助检查：
血常规：WBC 14.2×10⁹/L，N 88%，Hb 130g/L，PLT 220×10⁹/L
CRP：86mg/L
胸部X线：右肺下叶大片状高密度影''',
    '''【考核任务】
1. 提炼病例关键信息，形成摘要（5分钟）
2. 给出完整诊断（包括主要诊断、并发症、合并症）（10分钟）
3. 列出鉴别诊断（不少于3个）并说明理由（10分钟）
4. 提出需要补充的辅助检查（5分钟）
5. 制定治疗方案（药物+非药物）（5分钟）
6. 评估预后并制定随访计划（5分钟）''',
    '''【考核要点提示】
- 诊断：社区获得性肺炎（右肺下叶），I型呼吸衰竭？，2型糖尿病
- 鉴别：肺结核、肺部肿瘤、肺栓塞
- 病原学检查及药敏试验的重要性
- 初始经验性抗生素选择依据（CURB-65评分）
- 糖尿病患者血糖管理''')

_reg_question('临床思维站', '外科',
    '''【病例资料】
患者，男性，45岁，因"转移性右下腹痛12小时"来院。
12小时前无明显诱因出现上腹部隐痛，后逐渐转移至右下腹，呈持续性胀痛，
伴恶心，呕吐1次（为胃内容物）。无发热，食欲减退，大小便正常。
既往体健，无手术史。

体格检查：T 37.8°C，P 88次/分，R 20次/分，BP 120/75mmHg。
腹部平坦，右下腹麦氏点压痛明显，反跳痛（+），轻度肌紧张，腰大肌试验（+）。
Rovsing征（+）。

辅助检查：
血常规：WBC 13.8×10⁹/L，N 85%
腹部B超：右下腹可见一管状低回声结构，直径约8mm，周围少量积液''',
    '''【考核任务】
1. 提炼病例关键信息（5分钟）
2. 给出诊断、分型及诊断依据（10分钟）
3. 列出鉴别诊断（不少于3个）（10分钟）
4. 评估是否需要急诊手术及其依据（5分钟）
5. 制定围手术期处理方案（10分钟）''',
    '''【考核要点提示】
- 典型转移性右下腹痛的病理生理基础
- 急性阑尾炎的分型（单纯性/化脓性/坏疽性/穿孔性）
- 手术时机选择：化脓性/坏疽性应尽早手术
- 鉴别：溃疡穿孔、输尿管结石、Meckel憩室炎
- 抗生素选择：覆盖革兰阴性菌和厌氧菌''')

_reg_question('临床思维站', '妇产科',
    '''【病例资料】
患者，女性，28岁，因"停经42天，下腹痛伴阴道流血3小时"来院急诊。
LMP：42天前。平素月经规律，5/28天，量中等。3小时前无明显诱因出现下腹部
持续性胀痛，伴少量阴道流血，暗红色，无血块。无晕厥，无肛门坠胀感。
G₂P₁，2年前顺产1次。无避孕措施。

体格检查：T 37.0°C，P 96次/分，R 20次/分，BP 105/70mmHg。
妇科检查：外阴正常，阴道少量暗红色血液，宫颈举痛（+），
子宫稍大、软，右附件区轻压痛，未触及明显包块。

辅助检查：
尿HCG：阳性
血β-HCG：2850 mIU/mL
B超：宫腔内未见孕囊，右附件区可见约2.0×1.8cm混合回声团，
盆腔少量积液，深约1.5cm''',
    '''【考核任务】
1. 提炼病例关键信息（5分钟）
2. 给出最可能的诊断及诊断依据（10分钟）
3. 列出鉴别诊断（10分钟）
4. 制定诊疗方案（10分钟）
5. 与患者沟通病情及治疗方案（口述）（5分钟）''',
    '''【考核要点提示】
- 异位妊娠的危险分层：破裂型 vs 未破裂型
- 血β-HCG水平与B超结果的关系（阈值1500-2000mIU/mL见宫内孕囊）
- 治疗方案选择：MTX药物保守 vs 手术（保守性/根治性）
- 随访监测：血β-HCG下降至正常
- 与患者沟通：生育功能保护、复发风险''')

# -- 交流沟通站 样题 --
_reg_question('交流沟通站', '通用',
    '''【场景设置】
患者，女性，52岁，因"体检发现肺结节2周"来院进一步诊治。
胸部CT：右肺上叶可见一约2.5×2.0cm结节，边缘毛糙，有分叶征。
经支气管镜活检病理：肺腺癌。EGFR基因检测：19外显子缺失突变。
患者既往体健，无吸烟史。目前对诊断不知情，由家属陪同。
家属在诊室外单独找你，要求"先别告诉她是癌症，怕她受不了"。

【SP设定（患者）】
- 情绪：紧张、担忧，反复问"医生，到底是什么问题？"
- 对检查过程和等待结果表现出焦虑
- 需要模拟由"不知情→逐渐感知→情绪波动→需要安抚"的过程

【考官设定（家属）】
- 情绪：焦虑、哭泣
- 主要诉求：保护患者，要求隐瞒病情
- 需考核如何处理家属要求与患者知情权的矛盾''',
    '''【考核任务】
1. 与家属单独沟通（5分钟）：
   - 回应家属的担忧和诉求
   - 解释患者知情权的重要性和法律规定
   - 协商告知策略

2. 与患者沟通（10分钟）：
   - 分步告知诊断（SPIKES协议）
   - 回应患者的情绪反应
   - 提供治疗希望（靶向治疗选择）
   - 共同制定下一步诊疗计划

3. 考官提问（5分钟）：
   - "如果患者追问生存期，你如何回答？"
   - "如果患者拒绝治疗，你怎么办？"''',
    '''【考核要点提示】
- SPIKES六步法：Setting-Perception-Invitation-Knowledge-Empathy-Strategy
- 家属诉求与患者知情权的平衡：不能对患者隐瞒，但需尊重告知方式
- 告知坏消息的关键原则：选择合适时机和环境，逐步告知，留出情感空间
- 靶向治疗（EGFR-TKI）可作为"希望"信息传递
- 避免使用"没办法了"、"晚期"等绝望性语言''')

# -- 技能操作站 样题 --
_reg_question('技能操作站', '通用',
    '''【场景设置】
模拟操作室，配备标准操作台、模拟人/模型、操作器械包。
考生按考站安排进入，独立完成指定操作。

【操作准备要求】
1. 核对患者信息（模拟人手腕带）
2. 确认知情同意书已签署
3. 检查操作用物有效期及包装完整性
4. 规范洗手、戴帽子口罩、戴无菌手套''',
    '''【考核任务】
按照标准操作规程（SOP）完成指定技能操作，考核内容包括：
1. 操作前准备（患者核对、物品准备、无菌准备）
2. 操作过程（步骤正确性、无菌技术、操作熟练度）
3. 操作后处理（标本处理、伤口处理、医疗废物处置）
4. 操作记录书写

具体操作项目见各专业考站说明。''',
    '''【考核要点提示】
- 无菌操作是所有技能操作的核心要求
- 操作过程需口述关键步骤及注意事项
- 操作中遇到困难时需展示应急处理能力
- 注意职业安全防护（锐器处理、体液暴露防护）''')

# -- 辅助检查判读站 样题 --
_reg_question('辅助检查及影像学判读站', '通用',
    '''【场景设置】
考站内放置影像观片灯或计算机显示器，依次显示多组辅助检查结果。
每组有标准答题纸，考生需在规定时间内完成判读并书写报告。

【判读材料（示例）】
1. 胸部正位X线片
2. 头颅CT平扫
3. 心电图（12导联）
4. 血气分析报告
5. 常规实验室检查报告单''',
    '''【考核任务】
对每组辅助检查结果进行判读：
1. 识别检查类型、技术参数及质量评估（2分钟/组）
2. 描述正常结构与异常发现（3分钟/组）
3. 给出诊断意见及鉴别诊断（3分钟/组）
4. 书写规范化报告（2分钟/组）

共5组，每组10分钟，总计50分钟。''',
    '''【考核要点提示】
- 影像阅片系统方法：先整体后局部，先正常后异常
- 心电图判读步骤：心率→节律→电轴→P波→PR间期→QRS→ST-T→QT间期
- 血气分析：pH→PaCO₂→PaO₂→HCO₃⁻→BE→电解质
- 报告书写需规范，结论明确
- 注意结合临床表现进行判读，不要孤立看检查结果''')

# 补充各专业特有的接诊病人站样题（使每个专业都有对应样题）
# 骨科
_reg_question('接诊病人站', '骨科',
    '''【场景设置】
患者，男性，35岁，建筑工人，因"高处坠落致腰部疼痛伴双下肢活动受限2小时"来院急诊。
患者2小时前在工地上从约3米高处坠落，臀部着地，当即感腰部剧烈疼痛，
双下肢麻木、无法活动。无意识丧失。由工友抬送就诊。
既往体健。
生命体征：T 36.6°C，P 90次/分，R 20次/分，BP 130/85mmHg。

【SP设定】
- 模拟胸腰段脊柱压痛
- 双下肢感觉运动障碍（具体平面由考官指定）
- 表情痛苦、焦虑，反复询问"我还能走路吗？"''',
    '''【考核任务】
1. 快速进行创伤相关病史采集（含受伤机制）（5分钟）
2. 脊柱及神经系统重点体格检查（10分钟）
3. 确定感觉/运动障碍平面
4. 判断是否为脊柱损伤急症
5. 给出初步诊断及急诊处理方案
6. 与患者沟通病情及预后''',
    '''【考核要点提示】
- 脊柱损伤搬运原则：保持脊柱轴线稳定
- 神经损伤平面定位（ASIA分级）
- 急诊检查首选：全脊柱CT+三维重建
- 注意是否合并其他脏器损伤（多发伤评估）''')

# 儿科特有考站
_reg_question('体格检查站', '儿科',
    '''【场景设置】
患儿，男，1岁6个月，由母亲陪同进行健康体检。
患儿足月顺产，出生体重3.2kg。母乳喂养至1岁，目前混合饮食。
生长发育：6月会坐，8月会爬，1岁2月会独走，目前可说简单单词（爸爸、妈妈、抱抱）。
预防接种按计划完成。
生命体征：T 36.5°C，P 110次/分，R 28次/分，体重11kg，身长82cm。

【SP设定（患儿）】
- 需由真实儿童或高仿真儿童模拟人扮演
- 对医生表现出好奇或恐惧（依年龄特点）''',
    '''【考核任务】
1. 全面儿科体格检查（按系统进行）（20分钟）
2. 生长发育评估（绘制生长曲线）
3. 神经系统发育评估
4. 给出喂养及保健指导
5. 与家长沟通检查发现及建议''',
    '''【考核要点提示】
- 儿童查体顺序：先无创后有创，先愉快后不适
- 利用游戏化方式减少患儿恐惧
- 生长曲线绘制与解读（WHO标准）
- 各系统发育里程碑评估
- 注意发现隐匿性异常（先心病、发育性髋关节发育不良等）''')


# ===== 生成函数 =====

def make_score_md(table_code, specialty, station_name):
    """生成单个评分表的MD内容"""
    tpl = SCORING_TEMPLATES.get(table_code)
    if not tpl:
        return None
    lines = []
    lines.append(f'# {tpl["name"]}')
    lines.append('')
    lines.append(f'> **模板编号**: `{table_code}`')
    lines.append(f'> **适用专业**: {specialty}')
    lines.append(f'> **所属考站**: {station_name}')
    lines.append('')
    lines.append(f'## 评分表说明')
    lines.append('')
    lines.append(tpl['description'])
    lines.append('')
    lines.append(f'## 评分细则')
    lines.append('')
    lines.append('| 评分项目 | 分值 | 评分标准 |')
    lines.append('|---------|------|---------|')
    total = 0
    for item_name, item_score, criteria in tpl['items']:
        total += item_score
        first_criterion = criteria[0] if criteria else ''
        lines.append(f'| **{item_name}** | **{item_score}分** | {first_criterion} |')
        if len(criteria) > 1:
            for c in criteria[1:]:
                lines.append(f'| | | {c} |')
    lines.append(f'| **合计** | **{total}分** | |')
    lines.append('')

    # 详细评分标准
    lines.append('## 逐项详细评分标准')
    lines.append('')
    for idx, (item_name, item_score, criteria) in enumerate(tpl['items'], 1):
        lines.append(f'### {idx}. {item_name}（{item_score}分）')
        lines.append('')
        lines.append('| 等级 | 标准 | 得分 |')
        lines.append('|------|------|------|')
        if item_score >= 25:
            lines.append(f'| 优秀 | 完全符合评分标准，操作/回答全面准确 | {item_score}分 |')
            lines.append(f'| 良好 | 大部分符合，存在1-2处小缺陷 | {int(item_score*0.8)}分 |')
            lines.append(f'| 合格 | 基本符合，存在3-4处缺陷 | {int(item_score*0.6)}分 |')
            lines.append(f'| 不合格 | 重大遗漏或原则性错误 | {int(item_score*0.3)}分 |')
        else:
            lines.append(f'| 优秀 | 完全符合评分标准 | {item_score}分 |')
            lines.append(f'| 良好 | 大部分符合，存在小缺陷 | {int(item_score*0.8)}分 |')
            lines.append(f'| 合格 | 基本符合，存在明显缺陷 | {int(item_score*0.6)}分 |')
            lines.append(f'| 不合格 | 不符合或未完成 | {int(item_score*0.3)}分 |')
        lines.append('')
        lines.append('**评分标准明细：**')
        for c in criteria:
            lines.append(f'- {c}')
        lines.append('')
    return '\n'.join(lines)


def make_sample_q_md(specialty, station_name):
    """生成样题MD内容"""
    # 先精确匹配
    key = f'{specialty}|{station_name}'
    # 再尝试通用匹配
    gen_key = f'通用|{station_name}'

    q = SAMPLE_QUESTIONS.get(key) or SAMPLE_QUESTIONS.get(gen_key)
    if not q:
        # 检查是否有部分匹配（接诊病人站 匹配 通用接诊病人站）
        for k, v in SAMPLE_QUESTIONS.items():
            k_spec, k_station = k.split('|', 1)
            if k_station == station_name:
                q = v
                break

    if not q:
        return None

    lines = []
    lines.append(f'# {station_name} — 样题')
    lines.append('')
    lines.append(f'> **适用专业**: {specialty}')
    lines.append('')
    lines.append('## 场景设置')
    lines.append('')
    lines.append(q['scenario'])
    lines.append('')
    lines.append('## 考核任务')
    lines.append('')
    lines.append(q['task'])
    lines.append('')
    if q.get('tips'):
        lines.append('## 考核要点提示')
        lines.append('')
        lines.append(q['tips'])
        lines.append('')
    return '\n'.join(lines)


def make_station_md(major, st, station_index, data):
    """生成考站说明MD（原station文件精简版）"""
    lines = []
    lines.append(f'# {major} — 第{station_index}站：{st["name"]}')
    lines.append('')
    lines.append(f'> **时长**: {st["duration"]}分钟')
    lines.append(f'> **考核方式**: {st["exam_type"]}')
    lines.append('')
    if st.get('description'):
        lines.append('## 考站概述')
        lines.append('')
        lines.append(st['description'])
        lines.append('')

    lines.append('## 考核项目')
    lines.append('')
    lines.append('| 项目名称 | 分值 | 考核内容说明 |')
    lines.append('|---------|------|-------------|')
    st_total = sum(p['score'] for p in st['projects'])
    for p in st['projects']:
        score_pct = round(p['score'] / st_total * 100) if st_total > 0 else 0
        lines.append(f'| {p["name"]} | {p["score"]}分 ({score_pct}%) | {p.get("description", "")} |')
    lines.append(f'| **合计** | **{st_total}分** | |')
    lines.append('')

    lines.append('## 评分表索引')
    lines.append('')
    for i, stb in enumerate(st['score_tables'], 1):
        lines.append(f'| 评分表{i} | {stb["name"]} | `{stb["code"]}` |')
    lines.append('')
    lines.append('> 各评分表详细内容见独立文件。')
    lines.append('')

    if SAMPLE_QUESTIONS.get(f'{major}|{st["name"]}') or SAMPLE_QUESTIONS.get(f'通用|{st["name"]}'):
        lines.append('## 样题索引')
        lines.append('')
        lines.append(f'> 本考站样题详见独立样题文件。')
        lines.append('')

    return '\n'.join(lines)


def gen_overview(major, code, data):
    """生成综述MD"""
    lines = []
    lines.append(f'# {major} — 住培结业临床实践能力考核标准方案')
    lines.append('')
    lines.append(f'> **培训阶段**: {data["phase"]}')
    lines.append(f'> **考核形式**: OSCE（客观结构化临床考核）')
    lines.append(f'> **总时长**: {data["total_duration"]}')
    lines.append(f'> **来源文件**: {data["source_doc"]}.pdf')
    lines.append('')
    lines.append('## 目录结构说明')
    lines.append('')
    lines.append('```')
    lines.append(f'{MAJOR_CODES.get(major, "0000")}_{major}/')
    lines.append('├── 00_综述.md                     ← 当前文件')
    lines.append('├── S01_{站名}_说明.md              ← 考站说明（考核项目+评分表索引）')
    lines.append('├── S01_{站名}_表1_{评分表名}.md    ← 评分表详情（含逐项评分标准）')
    lines.append('├── S01_{站名}_表2_{评分表名}.md    ← (如有多个评分表)')
    lines.append('├── S01_{站名}_样题.md              ← 样题（临床场景+考核任务）')
    lines.append('├── S02_...')
    lines.append('```')
    lines.append('')

    lines.append('## 考站总览')
    lines.append('')
    lines.append('| 站号 | 考站名称 | 考核内容 | 考核方式 | 时长 | 评分表数 | 有样题 |')
    lines.append('|------|---------|---------|---------|------|---------|--------|')
    for i, st in enumerate(data['stations'], 1):
        proj_names = ' + '.join(p['name'] for p in st['projects'])
        n_tables = len(st['score_tables'])
        stname = st['name']
        has_q = '✓' if (SAMPLE_QUESTIONS.get(f'{major}|{stname}') or SAMPLE_QUESTIONS.get(f'通用|{stname}')) else '—'
        lines.append(f'| S{i:02d} | {stname} | {proj_names} | {st["exam_type"]} | {st["duration"]}min | {n_tables}个 | {has_q} |')
    lines.append('')

    lines.append('## 分值分布')
    lines.append('')
    lines.append('| 考核项目 | 满分 |')
    lines.append('|---------|------|')
    project_scores = {}
    for st in data['stations']:
        for p in st['projects']:
            project_scores[p['name']] = project_scores.get(p['name'], 0) + p['score']
    for name, score in sorted(project_scores.items(), key=lambda x: -x[1]):
        lines.append(f'| {name} | {score}分 |')
    lines.append('')

    if data.get('sub_majors'):
        lines.append('## 适用专业方向')
        for sm in data['sub_majors']:
            lines.append(f'- {sm}')
        lines.append('')

    return '\n'.join(lines)


def write_md(folder, filename, content):
    os.makedirs(folder, exist_ok=True)
    path = os.path.join(folder, filename)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)


def main():
    # Load SPECIALTIES from the generator script
    gen_script = os.path.join(os.path.dirname(__file__), '_gen_exam_md.py')
    ns = {}
    with open(gen_script, 'r', encoding='utf-8') as f:
        code = f.read()
    exec(compile(code, gen_script, 'exec'), ns)
    SPECIALTIES = ns.get('SPECIALTIES', {})

    total_files = 0
    total_specialties = 0

    for major, data in SPECIALTIES.items():
        code = MAJOR_CODES.get(major, '0000')
        folder_name = f'{code}_{major}'
        folder = os.path.join(OUT_DIR, folder_name)

        # 00_综述
        overview = gen_overview(major, code, data)
        write_md(folder, '00_综述.md', overview)
        total_files += 1

        # 各考站及其评分表、样题
        for si, st in enumerate(data['stations'], 1):
            prefix = f'S{si:02d}_{st["name"]}'

            # 考站说明
            station_content = make_station_md(major, st, si, data)
            write_md(folder, f'{prefix}_说明.md', station_content)
            total_files += 1

            # 评分表
            for ti, stb in enumerate(st['score_tables'], 1):
                table_content = make_score_md(stb['code'], major, st['name'])
                if table_content:
                    short_name = stb['name'].replace('（标准模板）', '').replace('评分表', '')
                    fname = f'{prefix}_表{ti}_{short_name}.md'
                    write_md(folder, fname, table_content)
                    total_files += 1

            # 样题
            q_content = make_sample_q_md(major, st['name'])
            if q_content:
                write_md(folder, f'{prefix}_样题.md', q_content)
                total_files += 1

        total_specialties += 1
        print(f'  [{total_specialties:02d}] {folder_name}')

    # 评分表模板总览
    _write_template_index()

    print(f'\nGenerated {total_files} files in {total_specialties} specialties')
    print(f'Output: {OUT_DIR}')


def _write_template_index():
    """生成评分表模板总览文件"""
    folder = OUT_DIR
    lines = []
    lines.append('# 评分表模板总览')
    lines.append('')
    lines.append('> 所有评分表模板的定义和编号说明，供各专业考站引用。')
    lines.append('')

    for code in sorted(SCORING_TEMPLATES.keys()):
        tpl = SCORING_TEMPLATES[code]
        lines.append(f'## `{code}` — {tpl["name"]}')
        lines.append('')
        lines.append(tpl['description'])
        lines.append('')
        lines.append('| 序号 | 评分项目 | 分值 |')
        lines.append('|------|---------|------|')
        for idx, (name, score, _) in enumerate(tpl['items'], 1):
            lines.append(f'| {idx} | {name} | {score}分 |')
        lines.append(f'| **合计** | | **{sum(it[1] for it in tpl["items"])}分** |')
        lines.append('')

    write_md(folder, '00_评分表模板总览.md', '\n'.join(lines))


if __name__ == '__main__':
    main()
