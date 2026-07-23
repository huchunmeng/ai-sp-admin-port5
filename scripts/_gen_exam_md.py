# -*- coding: utf-8 -*-
"""生成住培结业考核大纲 MD 文件（按专业拆分）

数据来源: apps/admin/src/data/station-schemes/residency.js
目标目录: 考核大纲/{专业编号}_{专业名}/
"""

import os

# ===== 专业编号对照（对应PDF文件名前缀）=====
MAJOR_CODES = {
    '内科': '0100',
    '儿科': '0200',
    '急诊科': '0300',
    '皮肤科': '0400',
    '精神科': '0500',
    '神经内科': '0600',
    '全科': '0700',
    '康复医学科': '0800',
    '外科': '0900-1300',
    '骨科': '1400',
    '儿外科': '1500',
    '妇产科': '1600',
    '眼科': '1700',
    '耳鼻咽喉科': '1800',
    '麻醉科': '1900',
    '临床病理科': '2000',
    '检验医学科': '2100',
    '放射科': '2200',
    '超声科': '2300',
    '核医学科': '2400',
    '放射肿瘤科': '2500',
    '医学遗传科': '2600',
    '预防医学科': '2700',
    '口腔全科': '2800',
    '口腔内科': '2900',
    '口腔颌面外科': '3000',
    '口腔修复科': '3100',
    '口腔正畸科': '3200',
    '口腔病理科': '3300',
    '口腔颌面影像科': '3400',
    '普通外科': '0900-1300',
    '胸心外科': '0900-1300',
    '泌尿外科': '0900-1300',
    '整形外科': '0900-1300',
    '重症医学科': '3700',
}

# ===== 各专业考站数据（来源于 residency.js）=====

def make_reception(specialty, duration=15, exam_name='体格检查'):
    """接诊病人站"""
    return {
        'name': '接诊病人站',
        'duration': duration,
        'description': f'{specialty}专业接诊病人站：SP病史采集+{exam_name}+人文沟通+初步诊断',
        'projects': [
            {'name': '病史采集', 'score': 30, 'description': '采集患者主诉、现病史、既往史、家族史等信息'},
            {'name': exam_name, 'score': 30, 'description': f'对SP进行重点{exam_name}'},
            {'name': '人文沟通', 'score': 20, 'description': '医患沟通、人文关怀、职业素养'},
            {'name': '初步诊断', 'score': 20, 'description': '根据病史和体征给出初步诊断及鉴别诊断'},
        ],
        'score_tables': [
            {'name': '病史采集评分表（标准模板）', 'code': 'TPL-STD', 'items': ['病史采集']},
            {'name': exam_name+'评分表', 'code': 'TPL-STD-2', 'items': [exam_name]},
            {'name': '人文沟通评分表', 'code': 'TPL-STD-6', 'items': ['人文沟通', '初步诊断']},
        ],
        'exam_type': '口试+SP',
    }

def make_clinic_think(duration=20):
    """临床思维站"""
    return {
        'name': '临床思维站',
        'duration': duration,
        'description': '病例分析：根据临床病例进行诊断分析、鉴别诊断和治疗方案制定',
        'projects': [
            {'name': '病例分析', 'score': 100, 'description': '阅读病例资料，进行诊断、鉴别诊断、辅助检查选择和诊疗计划制定'},
        ],
        'score_tables': [
            {'name': '病例分析评分表', 'code': 'TPL-STD-7', 'items': ['病例分析']},
        ],
        'exam_type': '笔试',
    }

def make_communication(duration=15):
    """交流沟通站"""
    return {
        'name': '交流沟通站',
        'duration': duration,
        'description': '医患沟通：告知坏消息/知情同意/健康咨询等场景',
        'projects': [
            {'name': '人文沟通', 'score': 60, 'description': '与SP或考官进行人文沟通场景考核'},
            {'name': '初步诊断', 'score': 40, 'description': '基于场景信息进行诊断判断'},
        ],
        'score_tables': [
            {'name': '人文沟通评分表', 'code': 'TPL-STD-6', 'items': ['人文沟通', '初步诊断']},
        ],
        'exam_type': '口试+SP',
    }

def make_record(duration=30):
    """病历书写站"""
    return {
        'name': '病历书写站',
        'duration': duration,
        'description': '根据病例资料完成入院记录或首次病程记录书写',
        'projects': [
            {'name': '病历书写', 'score': 100, 'description': '完成病历书写（入院记录/首次病程记录等）'},
        ],
        'score_tables': [
            {'name': '病历书写评分表', 'code': 'TPL-STD-3', 'items': ['病历书写']},
        ],
        'exam_type': '笔试',
    }

# ===== 扩展工厂函数（完整考站类型）=====

def make_skill_op_station(specialty, duration, procedures, exam_type='操作'):
    """通用技能操作站"""
    n = len(procedures)
    each_score = 100 // n
    projects = [{'name': p, 'score': each_score, 'description': f'{specialty}{p}'} for p in procedures]
    # 调整最后一个使总分为100
    remainder = 100 - each_score * n
    if remainder:
        projects[-1]['score'] += remainder
    return {
        'name': '技能操作站',
        'duration': duration,
        'description': f'{specialty}专业技能操作：{"、".join(procedures)}',
        'projects': projects,
        'score_tables': [
            {'name': '技能操作评分表', 'code': 'TPL-STD-4', 'items': [p['name'] for p in projects]},
        ],
        'exam_type': exam_type,
    }

def make_image_reading(duration=20):
    """辅助检查及影像学判读站（通用）"""
    return {
        'name': '辅助检查及影像学判读站',
        'duration': duration,
        'description': '辅助检查判读：X线/CT/MRI/心电图/实验室检查等结果判读',
        'projects': [
            {'name': '影像判读', 'score': 50, 'description': 'X线、CT、MRI等影像学判读'},
            {'name': '辅助检查判读', 'score': 50, 'description': '心电图、实验室检查等结果判读'},
        ],
        'score_tables': [
            {'name': '辅助检查判读评分表', 'code': 'TPL-STD-5', 'items': ['影像判读', '辅助检查判读']},
        ],
        'exam_type': '笔试',
    }

def make_interview_communication(duration=15):
    """病例分析口试站 / 面试沟通站"""
    return {
        'name': '面试沟通站',
        'duration': duration,
        'description': '面试沟通：病例分析口试+人文沟通+职业素养',
        'projects': [
            {'name': '病例分析', 'score': 60, 'description': '口述病例分析、诊断与治疗方案'},
            {'name': '人文沟通', 'score': 40, 'description': '医患沟通、职业素养、综合问答'},
        ],
        'score_tables': [
            {'name': '病例分析评分表', 'code': 'TPL-STD-7', 'items': ['病例分析']},
            {'name': '人文沟通评分表', 'code': 'TPL-STD-6', 'items': ['人文沟通']},
        ],
        'exam_type': '口试',
    }

# ===== 各专业完整考站列表 =====

# 口腔各科通用接诊病人站
_mouth_reception = {
    'name': '接诊病人站', 'duration': 20,
    'description': '口腔接诊病人：病史采集+口腔检查+医患沟通+病历书写',
    'projects': [
        {'name': '病史采集', 'score': 30, 'description': '口腔病史采集'},
        {'name': '体格检查', 'score': 20, 'description': '口腔专科检查'},
        {'name': '人文沟通', 'score': 25, 'description': '口腔科医患沟通'},
        {'name': '病历书写', 'score': 25, 'description': '口腔科病历书写'},
    ],
    'score_tables': [
        {'name': '病史采集评分表（标准模板）', 'code': 'TPL-STD', 'items': ['病史采集']},
        {'name': '人文沟通评分表', 'code': 'TPL-STD-6', 'items': ['人文沟通', '体格检查']},
        {'name': '病历书写评分表', 'code': 'TPL-STD-3', 'items': ['病历书写']},
    ],
    'exam_type': '口试+操作',
}

SPECIALTIES = {
    '内科': {
        'phase': '住院医师',
        'total_duration': '约120分钟（含临床操作站）',
        'source_doc': '0100内科住院医师规范化培训结业临床实践能力考核标准方案',
        'stations': [
            {
                'name': '接诊病人站', 'duration': 15,
                'description': '内科专业接诊病人站：SP病史采集+体格检查+人文沟通+初步诊断',
                'projects': [
                    {'name': '病史采集', 'score': 30, 'description': '采集患者主诉、现病史、既往史、家族史等信息'},
                    {'name': '体格检查', 'score': 30, 'description': '对SP进行重点体格检查'},
                    {'name': '人文沟通', 'score': 20, 'description': '医患沟通、人文关怀、职业素养'},
                    {'name': '初步诊断', 'score': 20, 'description': '根据病史和体征给出初步诊断及鉴别诊断'},
                ],
                'score_tables': [
                    {'name': '病史采集评分表（标准模板）', 'code': 'TPL-STD', 'items': ['病史采集']},
                    {'name': '体格检查评分表', 'code': 'TPL-STD-2', 'items': ['体格检查']},
                    {'name': '人文沟通评分表', 'code': 'TPL-STD-6', 'items': ['人文沟通', '初步诊断']},
                ],
                'exam_type': '口试+SP',
            },
            {
                'name': '临床思维站', 'duration': 15,
                'description': '病例分析：根据临床病例进行诊断分析、鉴别诊断和治疗方案制定',
                'projects': [
                    {'name': '病例分析', 'score': 100, 'description': '阅读病例资料，进行诊断、鉴别诊断、辅助检查选择和诊疗计划制定'},
                ],
                'score_tables': [
                    {'name': '病例分析评分表', 'code': 'TPL-STD-7', 'items': ['病例分析']},
                ],
                'exam_type': '笔试',
            },
            {
                'name': '交流沟通站', 'duration': 15,
                'description': '医患沟通：告知坏消息/知情同意/健康咨询等场景',
                'projects': [
                    {'name': '人文沟通', 'score': 60, 'description': '与SP或考官进行人文沟通场景考核'},
                    {'name': '初步诊断', 'score': 40, 'description': '基于场景信息进行诊断判断'},
                ],
                'score_tables': [
                    {'name': '人文沟通评分表', 'code': 'TPL-STD-6', 'items': ['人文沟通', '初步诊断']},
                ],
                'exam_type': '口试+SP',
            },
            {
                'name': '临床操作站', 'duration': 60,
                'description': '内科临床操作：四大穿刺（胸穿、腹穿、腰穿、骨穿）',
                'projects': [
                    {'name': '胸腔穿刺术', 'score': 25, 'description': '胸腔穿刺术操作'},
                    {'name': '腹腔穿刺术', 'score': 25, 'description': '腹腔穿刺术操作'},
                    {'name': '腰椎穿刺术', 'score': 25, 'description': '腰椎穿刺术操作'},
                    {'name': '骨髓穿刺术', 'score': 25, 'description': '骨髓穿刺术操作'}
                ],
                'score_tables': [
                    {'name': '技能操作评分表', 'code': 'TPL-STD-4', 'items': ['胸腔穿刺术', '腹腔穿刺术', '腰椎穿刺术', '骨髓穿刺术']}
                ],
                'exam_type': '操作',
            },
        ],
    },
    '儿科': {
        'phase': '住院医师',
        'total_duration': '约135分钟（含技能操作站和人文沟通站）',
        'source_doc': '0200儿科住院医师规范化培训结业临床实践能力考核标准方案',
        'stations': [
            {
                'name': '病史采集站', 'duration': 15,
                'description': '儿科病史采集：向家长采集患儿病史，含人文沟通',
                'projects': [
                    {'name': '病史采集', 'score': 50, 'description': '向患儿家长采集病史信息'},
                    {'name': '人文沟通', 'score': 50, 'description': '与患儿及家长的沟通技巧和人文关怀'},
                ],
                'score_tables': [
                    {'name': '病史采集评分表（标准模板）', 'code': 'TPL-STD', 'items': ['病史采集']},
                    {'name': '人文沟通评分表', 'code': 'TPL-STD-6', 'items': ['人文沟通']},
                ],
                'exam_type': '口试+SP',
            },
            {
                'name': '体格检查站', 'duration': 30,
                'description': '儿科体格检查：患儿全面查体及初步诊断',
                'projects': [
                    {'name': '体格检查', 'score': 60, 'description': '对患儿进行规范化体格检查'},
                    {'name': '初步诊断', 'score': 40, 'description': '根据查体结果做出初步诊断'},
                ],
                'score_tables': [
                    {'name': '体格检查评分表', 'code': 'TPL-STD-2', 'items': ['体格检查']},
                    {'name': '病例分析评分表', 'code': 'TPL-STD-7', 'items': ['初步诊断']},
                ],
                'exam_type': '操作+口试',
            },
            {
                'name': '病历书写站', 'duration': 40,
                'description': '根据病例资料完成入院记录或首次病程记录书写',
                'projects': [
                    {'name': '病历书写', 'score': 100, 'description': '完成病历书写（入院记录/首次病程记录等）'},
                ],
                'score_tables': [
                    {'name': '病历书写评分表', 'code': 'TPL-STD-3', 'items': ['病历书写']},
                ],
                'exam_type': '笔试',
            },
            {
                'name': '临床思维站', 'duration': 15,
                'description': '病例分析：儿科常见病、多发病的临床思维考核',
                'projects': [
                    {'name': '病例分析', 'score': 100, 'description': '儿科病例分析，含诊断、鉴别诊断、治疗计划'},
                ],
                'score_tables': [
                    {'name': '病例分析评分表', 'code': 'TPL-STD-7', 'items': ['病例分析']},
                ],
                'exam_type': '笔试',
            },
            {
                'name': '技能操作站', 'duration': 20,
                'description': '儿科基本技能操作：儿童生长发育评估+儿童基本操作',
                'projects': [
                    {'name': '生长发育评估', 'score': 50, 'description': '儿童生长发育测量与评估'},
                    {'name': '基本操作', 'score': 50, 'description': '儿科基本操作技能'}
                ],
                'score_tables': [
                    {'name': '技能操作评分表', 'code': 'TPL-STD-4', 'items': ['生长发育评估', '基本操作']}
                ],
                'exam_type': '操作',
            },
            {
                'name': '人文沟通站', 'duration': 15,
                'description': '向家长交代病情：告知坏消息+知情同意+人文关怀',
                'projects': [
                    {'name': '病情告知', 'score': 60, 'description': '向患儿家长告知病情及预后'},
                    {'name': '人文关怀', 'score': 40, 'description': '对患儿及家长的人文关怀与沟通'}
                ],
                'score_tables': [
                    {'name': '人文沟通评分表', 'code': 'TPL-STD-6', 'items': ['病情告知', '人文关怀']}
                ],
                'exam_type': '口试+SP',
            },
        ],
    },
    '急诊科': {
        'phase': '住院医师',
        'total_duration': '约100分钟（含全部技能站）',
        'source_doc': '0300急诊科专业住院医师规范化培训临床实践能力结业考核方案',
        'stations': [
            {
                'name': '接诊病人站', 'duration': 20,
                'description': '急诊病人接诊：急诊病史采集+重点查体+初步诊断+医患沟通',
                'projects': [
                    {'name': '病史采集', 'score': 30, 'description': '急诊患者病史采集（快速、重点突出）'},
                    {'name': '体格检查', 'score': 30, 'description': '急诊重点体格检查'},
                    {'name': '人文沟通', 'score': 20, 'description': '急诊场景下的医患沟通'},
                    {'name': '初步诊断', 'score': 20, 'description': '急诊初步诊断及危重度评估'},
                ],
                'score_tables': [
                    {'name': '病史采集评分表（标准模板）', 'code': 'TPL-STD', 'items': ['病史采集']},
                    {'name': '体格检查评分表', 'code': 'TPL-STD-2', 'items': ['体格检查']},
                    {'name': '人文沟通评分表', 'code': 'TPL-STD-6', 'items': ['人文沟通', '初步诊断']},
                ],
                'exam_type': '口试+SP',
            },
            {
                'name': '临床思维站', 'duration': 20,
                'description': '病例分析：根据临床病例进行诊断分析、鉴别诊断和治疗方案制定',
                'projects': [
                    {'name': '病例分析', 'score': 100, 'description': '阅读病例资料，进行诊断、鉴别诊断、辅助检查选择和诊疗计划制定'},
                ],
                'score_tables': [
                    {'name': '病例分析评分表', 'code': 'TPL-STD-7', 'items': ['病例分析']},
                ],
                'exam_type': '笔试',
            },
            {
                'name': '交流沟通站', 'duration': 10,
                'description': '医患沟通：告知坏消息/知情同意/健康咨询等场景',
                'projects': [
                    {'name': '人文沟通', 'score': 60, 'description': '与SP或考官进行人文沟通场景考核'},
                    {'name': '初步诊断', 'score': 40, 'description': '基于场景信息进行诊断判断'},
                ],
                'score_tables': [
                    {'name': '人文沟通评分表', 'code': 'TPL-STD-6', 'items': ['人文沟通', '初步诊断']},
                ],
                'exam_type': '口试+SP',
            },
            {
                'name': '心肺复苏站', 'duration': 10,
                'description': '单人成人心肺复苏：胸外按压+人工呼吸+电除颤',
                'projects': [
                    {'name': '心肺复苏', 'score': 100, 'description': '成人单人心肺复苏操作（含AED使用）'}
                ],
                'score_tables': [
                    {'name': '技能操作评分表', 'code': 'TPL-STD-4', 'items': ['心肺复苏']}
                ],
                'exam_type': '操作',
            },
            {
                'name': '气管插管站', 'duration': 10,
                'description': '气管插管术：经口气管插管操作',
                'projects': [
                    {'name': '气管插管', 'score': 100, 'description': '经口气管插管术操作'}
                ],
                'score_tables': [
                    {'name': '技能操作评分表', 'code': 'TPL-STD-4', 'items': ['气管插管']}
                ],
                'exam_type': '操作',
            },
            {
                'name': '高级生命支持站', 'duration': 15,
                'description': '高级生命支持：团队复苏+心律失常处理+复苏后管理',
                'projects': [
                    {'name': '高级生命支持', 'score': 100, 'description': '团队协作高级生命支持（含心律失常识别与处理）'}
                ],
                'score_tables': [
                    {'name': '技能操作评分表', 'code': 'TPL-STD-4', 'items': ['高级生命支持']}
                ],
                'exam_type': '操作',
            },
            {
                'name': '急诊外科操作站', 'duration': 15,
                'description': '急诊外科操作：清创缝合+止血包扎+骨折固定',
                'projects': [
                    {'name': '清创缝合', 'score': 40, 'description': '清创缝合术'},
                    {'name': '止血包扎', 'score': 30, 'description': '止血包扎术'},
                    {'name': '骨折固定', 'score': 30, 'description': '骨折临时固定术'}
                ],
                'score_tables': [
                    {'name': '技能操作评分表', 'code': 'TPL-STD-4', 'items': ['清创缝合', '止血包扎', '骨折固定']}
                ],
                'exam_type': '操作',
            },
        ],
    },
    '皮肤科': {
        'phase': '住院医师',
        'total_duration': '约115分钟（含病理阅片和活检站）',
        'source_doc': '0400皮肤科住院医师规范化培训结业实践技能考核指导标准（试行）',
        'stations': [
            {
                'name': '接诊病人站', 'duration': 30,
                'description': '接诊病人+病历书写：病史采集+体格检查+人文沟通+初步诊断',
                'projects': [
                    {'name': '病史采集', 'score': 25, 'description': '皮肤病病史采集'},
                    {'name': '体格检查', 'score': 25, 'description': '皮肤专科体格检查'},
                    {'name': '人文沟通', 'score': 20, 'description': '医患沟通与人文关怀'},
                    {'name': '初步诊断', 'score': 30, 'description': '皮肤病初步诊断及鉴别'},
                ],
                'score_tables': [
                    {'name': '病史采集评分表（标准模板）', 'code': 'TPL-STD', 'items': ['病史采集']},
                    {'name': '体格检查评分表', 'code': 'TPL-STD-2', 'items': ['体格检查']},
                    {'name': '人文沟通评分表', 'code': 'TPL-STD-6', 'items': ['人文沟通', '初步诊断']},
                ],
                'exam_type': '口试+SP',
            },
            {
                'name': '病历书写站', 'duration': 20,
                'description': '根据病例资料完成入院记录或首次病程记录书写',
                'projects': [
                    {'name': '病历书写', 'score': 100, 'description': '完成病历书写（入院记录/首次病程记录等）'},
                ],
                'score_tables': [
                    {'name': '病历书写评分表', 'code': 'TPL-STD-3', 'items': ['病历书写']},
                ],
                'exam_type': '笔试',
            },
            {
                'name': '临床思维站', 'duration': 30,
                'description': '病例分析：根据临床病例进行诊断分析、鉴别诊断和治疗方案制定',
                'projects': [
                    {'name': '病例分析', 'score': 100, 'description': '阅读病例资料，进行诊断、鉴别诊断、辅助检查选择和诊疗计划制定'},
                ],
                'score_tables': [
                    {'name': '病例分析评分表', 'code': 'TPL-STD-7', 'items': ['病例分析']},
                ],
                'exam_type': '笔试',
            },
            {
                'name': '皮肤组织病理阅片站', 'duration': 20,
                'description': '皮肤组织病理阅片：常见皮肤病的病理切片判读',
                'projects': [
                    {'name': '病理阅片', 'score': 100, 'description': '皮肤病病理切片阅片与诊断'}
                ],
                'score_tables': [
                    {'name': '辅助检查判读评分表', 'code': 'TPL-STD-5', 'items': ['病理阅片']}
                ],
                'exam_type': '笔试',
            },
            {
                'name': '皮肤组织钻取活检站', 'duration': 15,
                'description': '皮肤组织钻取活检术：皮肤活检操作',
                'projects': [
                    {'name': '皮肤活检', 'score': 100, 'description': '皮肤组织钻取活检术操作'}
                ],
                'score_tables': [
                    {'name': '技能操作评分表', 'code': 'TPL-STD-4', 'items': ['皮肤活检']}
                ],
                'exam_type': '操作',
            },
        ],
    },
    '精神科': {
        'phase': '住院医师',
        'total_duration': '约110分钟（含神经系统检查站）',
        'source_doc': '0500精神科住院医师规范化培训结业临床实践能力考核标准方案',
        'stations': [
            {
                'name': '接诊病人站', 'duration': 45,
                'description': '精神科临床技能：病史采集+精神检查+人文沟通+初步诊断',
                'projects': [
                    {'name': '病史采集', 'score': 30, 'description': '精神科病史采集'},
                    {'name': '体格检查', 'score': 20, 'description': '精神状况检查'},
                    {'name': '人文沟通', 'score': 25, 'description': '精神科医患沟通技巧'},
                    {'name': '初步诊断', 'score': 25, 'description': '精神科初步诊断'},
                ],
                'score_tables': [
                    {'name': '病史采集评分表（标准模板）', 'code': 'TPL-STD', 'items': ['病史采集']},
                    {'name': '体格检查评分表', 'code': 'TPL-STD-2', 'items': ['体格检查']},
                    {'name': '人文沟通评分表', 'code': 'TPL-STD-6', 'items': ['人文沟通', '初步诊断']},
                ],
                'exam_type': '口试+SP',
            },
            {
                'name': '临床思维站', 'duration': 30,
                'description': '精神科临床思维：病例分析+病历书写',
                'projects': [
                    {'name': '病例分析', 'score': 70, 'description': '精神科病例分析、诊断与鉴别'},
                    {'name': '病历书写', 'score': 30, 'description': '精神科病历书写'},
                ],
                'score_tables': [
                    {'name': '病例分析评分表', 'code': 'TPL-STD-7', 'items': ['病例分析']},
                    {'name': '病历书写评分表', 'code': 'TPL-STD-3', 'items': ['病历书写']},
                ],
                'exam_type': '笔试',
            },
            {
                'name': '交流沟通站', 'duration': 15,
                'description': '医患沟通：告知坏消息/知情同意/健康咨询等场景',
                'projects': [
                    {'name': '人文沟通', 'score': 60, 'description': '与SP或考官进行人文沟通场景考核'},
                    {'name': '初步诊断', 'score': 40, 'description': '基于场景信息进行诊断判断'},
                ],
                'score_tables': [
                    {'name': '人文沟通评分表', 'code': 'TPL-STD-6', 'items': ['人文沟通', '初步诊断']},
                ],
                'exam_type': '口试+SP',
            },
            {
                'name': '神经系统检查站', 'duration': 20,
                'description': '精神科神经系统检查：全面的神经系统体格检查',
                'projects': [
                    {'name': '神经系统检查', 'score': 100, 'description': '完整神经系统体格检查'}
                ],
                'score_tables': [
                    {'name': '体格检查评分表', 'code': 'TPL-STD-2', 'items': ['神经系统检查']}
                ],
                'exam_type': '操作+口试',
            },
        ],
    },
    '神经内科': {
        'phase': '住院医师',
        'total_duration': '约95分钟（含辅助检查站和腰穿站）',
        'source_doc': '0600神经内科住院医师规范化培训结业实践技能考核指导标准（试行）',
        'stations': [
            {
                'name': '接诊病人站', 'duration': 20,
                'description': '神经内科专业接诊病人站：SP病史采集+神经系统检查+人文沟通+初步诊断',
                'projects': [
                    {'name': '病史采集', 'score': 30, 'description': '采集患者主诉、现病史、既往史、家族史等信息'},
                    {'name': '神经系统检查', 'score': 30, 'description': '对SP进行重点神经系统检查'},
                    {'name': '人文沟通', 'score': 20, 'description': '医患沟通、人文关怀、职业素养'},
                    {'name': '初步诊断', 'score': 20, 'description': '根据病史和体征给出初步诊断及鉴别诊断'},
                ],
                'score_tables': [
                    {'name': '病史采集评分表（标准模板）', 'code': 'TPL-STD', 'items': ['病史采集']},
                    {'name': '神经系统检查评分表', 'code': 'TPL-STD-2', 'items': ['神经系统检查']},
                    {'name': '人文沟通评分表', 'code': 'TPL-STD-6', 'items': ['人文沟通', '初步诊断']},
                ],
                'exam_type': '口试+SP',
            },
            {
                'name': '临床思维站', 'duration': 30,
                'description': '神经内科临床思维：病例分析+病历书写',
                'projects': [
                    {'name': '病例分析', 'score': 70, 'description': '神经系统疾病病例分析'},
                    {'name': '病历书写', 'score': 30, 'description': '神经内科病历书写'},
                ],
                'score_tables': [
                    {'name': '病例分析评分表', 'code': 'TPL-STD-7', 'items': ['病例分析']},
                    {'name': '病历书写评分表', 'code': 'TPL-STD-3', 'items': ['病历书写']},
                ],
                'exam_type': '笔试',
            },
            {
                'name': '交流沟通站', 'duration': 10,
                'description': '医患沟通：告知坏消息/知情同意/健康咨询等场景',
                'projects': [
                    {'name': '人文沟通', 'score': 60, 'description': '与SP或考官进行人文沟通场景考核'},
                    {'name': '初步诊断', 'score': 40, 'description': '基于场景信息进行诊断判断'},
                ],
                'score_tables': [
                    {'name': '人文沟通评分表', 'code': 'TPL-STD-6', 'items': ['人文沟通', '初步诊断']},
                ],
                'exam_type': '口试+SP',
            },
            {
                'name': '辅助检查及影像学判读站', 'duration': 20,
                'description': '神经内科辅助检查判读：头颅CT/MRI+脑电图+肌电图等判读',
                'projects': [
                    {'name': '影像判读', 'score': 60, 'description': '头颅CT/MRI等神经影像判读'},
                    {'name': '辅助检查判读', 'score': 40, 'description': '脑电图、肌电图等神经电生理判读'}
                ],
                'score_tables': [
                    {'name': '辅助检查判读评分表', 'code': 'TPL-STD-5', 'items': ['影像判读', '辅助检查判读']}
                ],
                'exam_type': '笔试',
            },
            {
                'name': '腰椎穿刺术站', 'duration': 15,
                'description': '腰椎穿刺术：脑脊液采集操作',
                'projects': [
                    {'name': '腰椎穿刺术', 'score': 100, 'description': '腰椎穿刺术操作（含无菌操作规范）'}
                ],
                'score_tables': [
                    {'name': '技能操作评分表', 'code': 'TPL-STD-4', 'items': ['腰椎穿刺术']}
                ],
                'exam_type': '操作',
            },
        ],
    },
    '全科': {
        'phase': '住院医师',
        'total_duration': '约110分钟（含技能操作站）',
        'source_doc': '0700全科住院医师规范化培训结业临床实践能力考核标准方案',
        'stations': [
            {
                'name': '接诊病人站', 'duration': 40,
                'description': '全科接诊：病史采集+体格检查+病例分析+SOAP书写+初步诊断+人文沟通',
                'projects': [
                    {'name': '病史采集', 'score': 25, 'description': '全科病史采集'},
                    {'name': '体格检查', 'score': 25, 'description': '全科体格检查'},
                    {'name': '病例分析', 'score': 20, 'description': '病例分析与SOAP记录'},
                    {'name': '初步诊断', 'score': 15, 'description': '初步诊断与鉴别'},
                    {'name': '人文沟通', 'score': 15, 'description': '全科医患沟通'},
                ],
                'score_tables': [
                    {'name': '病史采集评分表（标准模板）', 'code': 'TPL-STD', 'items': ['病史采集']},
                    {'name': '体格检查评分表', 'code': 'TPL-STD-2', 'items': ['体格检查']},
                    {'name': '病例分析评分表', 'code': 'TPL-STD-7', 'items': ['病例分析', '初步诊断']},
                    {'name': '人文沟通评分表', 'code': 'TPL-STD-6', 'items': ['人文沟通']},
                ],
                'exam_type': '口试+SP+笔试',
            },
            {
                'name': '病历书写站', 'duration': 30,
                'description': '根据病例资料完成入院记录或首次病程记录书写',
                'projects': [
                    {'name': '病历书写', 'score': 100, 'description': '完成病历书写（入院记录/首次病程记录等）'},
                ],
                'score_tables': [
                    {'name': '病历书写评分表', 'code': 'TPL-STD-3', 'items': ['病历书写']},
                ],
                'exam_type': '笔试',
            },
            {
                'name': '交流沟通站', 'duration': 20,
                'description': '医患沟通：告知坏消息/知情同意/健康咨询等场景',
                'projects': [
                    {'name': '人文沟通', 'score': 60, 'description': '与SP或考官进行人文沟通场景考核'},
                    {'name': '初步诊断', 'score': 40, 'description': '基于场景信息进行诊断判断'},
                ],
                'score_tables': [
                    {'name': '人文沟通评分表', 'code': 'TPL-STD-6', 'items': ['人文沟通', '初步诊断']},
                ],
                'exam_type': '口试+SP',
            },
            {
                'name': '基本技能操作站', 'duration': 20,
                'description': '全科基本技能操作：常见临床操作技能',
                'projects': [
                    {'name': '基本操作1', 'score': 50, 'description': '全科常见基本操作技能一'},
                    {'name': '基本操作2', 'score': 50, 'description': '全科常见基本操作技能二'}
                ],
                'score_tables': [
                    {'name': '技能操作评分表', 'code': 'TPL-STD-4', 'items': ['基本操作1', '基本操作2']}
                ],
                'exam_type': '操作',
            },
        ],
    },
    '康复医学科': {
        'phase': '住院医师',
        'total_duration': '约90分钟（含辅助检查站和技能站）',
        'source_doc': '0800康复医学科住院医师规范化培训结业实践技能考核指导标准（试行）',
        'stations': [
            {
                'name': '接诊病人站', 'duration': 20,
                'description': '康复医学科专业接诊病人站：SP病史采集+体格检查+人文沟通+初步诊断',
                'projects': [
                    {'name': '病史采集', 'score': 30, 'description': '采集患者主诉、现病史、既往史、家族史等信息'},
                    {'name': '体格检查', 'score': 30, 'description': '对SP进行重点体格检查'},
                    {'name': '人文沟通', 'score': 20, 'description': '医患沟通、人文关怀、职业素养'},
                    {'name': '初步诊断', 'score': 20, 'description': '根据病史和体征给出初步诊断及鉴别诊断'},
                ],
                'score_tables': [
                    {'name': '病史采集评分表（标准模板）', 'code': 'TPL-STD', 'items': ['病史采集']},
                    {'name': '体格检查评分表', 'code': 'TPL-STD-2', 'items': ['体格检查']},
                    {'name': '人文沟通评分表', 'code': 'TPL-STD-6', 'items': ['人文沟通', '初步诊断']},
                ],
                'exam_type': '口试+SP',
            },
            {
                'name': '临床思维站', 'duration': 20,
                'description': '康复医学科临床思维：病历书写+病例分析',
                'projects': [
                    {'name': '病例分析', 'score': 65, 'description': '康复医学科病例分析'},
                    {'name': '病历书写', 'score': 35, 'description': '康复医学科病历书写'},
                ],
                'score_tables': [
                    {'name': '病例分析评分表', 'code': 'TPL-STD-7', 'items': ['病例分析']},
                    {'name': '病历书写评分表', 'code': 'TPL-STD-3', 'items': ['病历书写']},
                ],
                'exam_type': '笔试',
            },
            {
                'name': '交流沟通站', 'duration': 10,
                'description': '医患沟通：告知坏消息/知情同意/健康咨询等场景',
                'projects': [
                    {'name': '人文沟通', 'score': 60, 'description': '与SP或考官进行人文沟通场景考核'},
                    {'name': '初步诊断', 'score': 40, 'description': '基于场景信息进行诊断判断'},
                ],
                'score_tables': [
                    {'name': '人文沟通评分表', 'code': 'TPL-STD-6', 'items': ['人文沟通', '初步诊断']},
                ],
                'exam_type': '口试+SP',
            },
            {
                'name': '辅助检查及影像学判读站', 'duration': 20,
                'description': '康复医学科辅助检查判读：影像学+神经电生理+康复评定',
                'projects': [
                    {'name': '影像判读', 'score': 50, 'description': '脊柱/关节影像判读'},
                    {'name': '康复评定', 'score': 50, 'description': '康复功能评定及辅助检查判读'}
                ],
                'score_tables': [
                    {'name': '辅助检查判读评分表', 'code': 'TPL-STD-5', 'items': ['影像判读', '康复评定']}
                ],
                'exam_type': '笔试',
            },
            {
                'name': '基本技能操作站', 'duration': 20,
                'description': '康复基本技能操作：康复治疗技术操作',
                'projects': [
                    {'name': '康复治疗操作', 'score': 100, 'description': '康复治疗基本技能操作'}
                ],
                'score_tables': [
                    {'name': '技能操作评分表', 'code': 'TPL-STD-4', 'items': ['康复治疗操作']}
                ],
                'exam_type': '操作',
            },
        ],
    },
    '外科': {
        'phase': '住院医师',
        'total_duration': '约80分钟（含临床操作站）',
        'source_doc': '0900-1300外科及外科各方向住院医师规范化培训结业临床实践能力考核方案',
        'stations': [
            {
                'name': '接诊病人站', 'duration': 15,
                'description': '外科专业接诊病人站：SP病史采集+体格检查+人文沟通+初步诊断',
                'projects': [
                    {'name': '病史采集', 'score': 30, 'description': '采集患者主诉、现病史、既往史、家族史等信息'},
                    {'name': '体格检查', 'score': 30, 'description': '对SP进行重点体格检查'},
                    {'name': '人文沟通', 'score': 20, 'description': '医患沟通、人文关怀、职业素养'},
                    {'name': '初步诊断', 'score': 20, 'description': '根据病史和体征给出初步诊断及鉴别诊断'},
                ],
                'score_tables': [
                    {'name': '病史采集评分表（标准模板）', 'code': 'TPL-STD', 'items': ['病史采集']},
                    {'name': '体格检查评分表', 'code': 'TPL-STD-2', 'items': ['体格检查']},
                    {'name': '人文沟通评分表', 'code': 'TPL-STD-6', 'items': ['人文沟通', '初步诊断']},
                ],
                'exam_type': '口试+SP',
            },
            {
                'name': '临床思维站', 'duration': 15,
                'description': '病例分析：根据临床病例进行诊断分析、鉴别诊断和治疗方案制定',
                'projects': [
                    {'name': '病例分析', 'score': 100, 'description': '阅读病例资料，进行诊断、鉴别诊断、辅助检查选择和诊疗计划制定'},
                ],
                'score_tables': [
                    {'name': '病例分析评分表', 'code': 'TPL-STD-7', 'items': ['病例分析']},
                ],
                'exam_type': '笔试',
            },
            {
                'name': '交流沟通站', 'duration': 15,
                'description': '医患沟通：告知坏消息/知情同意/健康咨询等场景',
                'projects': [
                    {'name': '人文沟通', 'score': 60, 'description': '与SP或考官进行人文沟通场景考核'},
                    {'name': '初步诊断', 'score': 40, 'description': '基于场景信息进行诊断判断'},
                ],
                'score_tables': [
                    {'name': '人文沟通评分表', 'code': 'TPL-STD-6', 'items': ['人文沟通', '初步诊断']},
                ],
                'exam_type': '口试+SP',
            },
            {
                'name': '临床操作能力站', 'duration': 30,
                'description': '外科基本技能：洗手穿衣戴手套+切开缝合+打结+拆线换药',
                'projects': [
                    {'name': '无菌术', 'score': 25, 'description': '洗手穿衣戴手套'},
                    {'name': '切开缝合', 'score': 25, 'description': '皮肤切开与缝合'},
                    {'name': '打结', 'score': 25, 'description': '外科结打结'},
                    {'name': '换药拆线', 'score': 25, 'description': '换药与拆线'}
                ],
                'score_tables': [
                    {'name': '技能操作评分表', 'code': 'TPL-STD-4', 'items': ['无菌术', '切开缝合', '打结', '换药拆线']}
                ],
                'exam_type': '操作',
            },
        ],
        'sub_majors': ['普通外科', '胸心外科', '泌尿外科', '整形外科'],
    },
    '骨科': {
        'phase': '住院医师',
        'total_duration': '约80分钟（含辅助检查站和技能站）',
        'source_doc': '1400骨科住院医师规范化培训结业实践技能考核指导标准（试行）',
        'stations': [
            {
                'name': '接诊病人站', 'duration': 20,
                'description': '骨科专业接诊病人站：SP病史采集+体格检查+人文沟通+初步诊断',
                'projects': [
                    {'name': '病史采集', 'score': 30, 'description': '采集患者主诉、现病史、既往史、家族史等信息'},
                    {'name': '体格检查', 'score': 30, 'description': '对SP进行重点体格检查'},
                    {'name': '人文沟通', 'score': 20, 'description': '医患沟通、人文关怀、职业素养'},
                    {'name': '初步诊断', 'score': 20, 'description': '根据病史和体征给出初步诊断及鉴别诊断'},
                ],
                'score_tables': [
                    {'name': '病史采集评分表（标准模板）', 'code': 'TPL-STD', 'items': ['病史采集']},
                    {'name': '体格检查评分表', 'code': 'TPL-STD-2', 'items': ['体格检查']},
                    {'name': '人文沟通评分表', 'code': 'TPL-STD-6', 'items': ['人文沟通', '初步诊断']},
                ],
                'exam_type': '口试+SP',
            },
            {
                'name': '临床思维站', 'duration': 20,
                'description': '骨科临床思维：病历书写+病例分析',
                'projects': [
                    {'name': '病例分析', 'score': 70, 'description': '骨科病例分析'},
                    {'name': '病历书写', 'score': 30, 'description': '骨科病历书写'},
                ],
                'score_tables': [
                    {'name': '病例分析评分表', 'code': 'TPL-STD-7', 'items': ['病例分析']},
                    {'name': '病历书写评分表', 'code': 'TPL-STD-3', 'items': ['病历书写']},
                ],
                'exam_type': '笔试',
            },
            {
                'name': '辅助检查及影像学判读站', 'duration': 20,
                'description': '骨科影像判读：X线/CT/MRI等骨科影像判读',
                'projects': [
                    {'name': '骨科影像判读', 'score': 100, 'description': '骨科X线、CT、MRI等影像学判读'}
                ],
                'score_tables': [
                    {'name': '辅助检查判读评分表', 'code': 'TPL-STD-5', 'items': ['骨科影像判读']}
                ],
                'exam_type': '笔试',
            },
            {
                'name': '基本技能操作站', 'duration': 20,
                'description': '骨科基本技能操作：骨折复位固定+关节穿刺等',
                'projects': [
                    {'name': '骨折复位固定', 'score': 50, 'description': '骨折手法复位与外固定'},
                    {'name': '关节穿刺', 'score': 50, 'description': '关节腔穿刺术'}
                ],
                'score_tables': [
                    {'name': '技能操作评分表', 'code': 'TPL-STD-4', 'items': ['骨折复位固定', '关节穿刺']}
                ],
                'exam_type': '操作',
            },
        ],
    },
    '儿外科': {
        'phase': '住院医师',
        'total_duration': '约122分钟（含技能操作站和人文沟通站）',
        'source_doc': '1500儿外科住院医师规范化培训结业临床实践能力考核标准方案',
        'stations': [
            {
                'name': '病史采集站', 'duration': 12,
                'description': '儿外科病史采集：向家长采集患儿病史，含人文沟通',
                'projects': [
                    {'name': '病史采集', 'score': 60, 'description': '儿外科病史采集'},
                    {'name': '人文沟通', 'score': 40, 'description': '与患儿及家长沟通'},
                ],
                'score_tables': [
                    {'name': '病史采集评分表（标准模板）', 'code': 'TPL-STD', 'items': ['病史采集']},
                    {'name': '人文沟通评分表', 'code': 'TPL-STD-6', 'items': ['人文沟通']},
                ],
                'exam_type': '口试+SP',
            },
            {
                'name': '体格检查站', 'duration': 25,
                'description': '儿外科体格检查：腹部查体+初步诊断',
                'projects': [
                    {'name': '体格检查', 'score': 60, 'description': '儿外科体格检查'},
                    {'name': '初步诊断', 'score': 40, 'description': '根据查体结果做出初步诊断'},
                ],
                'score_tables': [
                    {'name': '体格检查评分表', 'code': 'TPL-STD-2', 'items': ['体格检查']},
                    {'name': '病例分析评分表', 'code': 'TPL-STD-7', 'items': ['初步诊断']},
                ],
                'exam_type': '操作+口试',
            },
            {
                'name': '病历书写站', 'duration': 25,
                'description': '根据病例资料完成入院记录或首次病程记录书写',
                'projects': [
                    {'name': '病历书写', 'score': 100, 'description': '完成病历书写（入院记录/首次病程记录等）'},
                ],
                'score_tables': [
                    {'name': '病历书写评分表', 'code': 'TPL-STD-3', 'items': ['病历书写']},
                ],
                'exam_type': '笔试',
            },
            {
                'name': '临床思维站', 'duration': 25,
                'description': '病例分析：根据临床病例进行诊断分析、鉴别诊断和治疗方案制定',
                'projects': [
                    {'name': '病例分析', 'score': 100, 'description': '阅读病例资料，进行诊断、鉴别诊断、辅助检查选择和诊疗计划制定'},
                ],
                'score_tables': [
                    {'name': '病例分析评分表', 'code': 'TPL-STD-7', 'items': ['病例分析']},
                ],
                'exam_type': '笔试',
            },
            {
                'name': '人文沟通站', 'duration': 15,
                'description': '儿外科人文沟通：向患儿家长交代病情+知情同意',
                'projects': [
                    {'name': '病情告知', 'score': 60, 'description': '向家长告知患儿病情及手术方案'},
                    {'name': '人文关怀', 'score': 40, 'description': '对患儿及家属的人文关怀'}
                ],
                'score_tables': [
                    {'name': '人文沟通评分表', 'code': 'TPL-STD-6', 'items': ['病情告知', '人文关怀']}
                ],
                'exam_type': '口试+SP',
            },
            {
                'name': '技能操作站', 'duration': 20,
                'description': '儿外科基本技能操作：儿外科常见操作',
                'projects': [
                    {'name': '儿外科操作', 'score': 100, 'description': '儿外科基本技能操作'}
                ],
                'score_tables': [
                    {'name': '技能操作评分表', 'code': 'TPL-STD-4', 'items': ['儿外科操作']}
                ],
                'exam_type': '操作',
            },
        ],
    },
    '妇产科': {
        'phase': '住院医师',
        'total_duration': '约90分钟（含技能操作站）',
        'source_doc': '1600妇产科住院医师规范化培训结业临床实践能力考核标准方案',
        'stations': [
            {
                'name': '接诊和沟通站', 'duration': 30,
                'description': '妇产科接诊和沟通：病史采集+体格检查+诊断及鉴别诊断+医患沟通',
                'projects': [
                    {'name': '病史采集', 'score': 25, 'description': '妇产科病史采集'},
                    {'name': '体格检查', 'score': 25, 'description': '妇产科体格检查'},
                    {'name': '初步诊断', 'score': 25, 'description': '诊断及鉴别诊断'},
                    {'name': '人文沟通', 'score': 25, 'description': '医患沟通'},
                ],
                'score_tables': [
                    {'name': '病史采集评分表（标准模板）', 'code': 'TPL-STD', 'items': ['病史采集']},
                    {'name': '体格检查评分表', 'code': 'TPL-STD-2', 'items': ['体格检查']},
                    {'name': '人文沟通评分表', 'code': 'TPL-STD-6', 'items': ['人文沟通', '初步诊断']},
                ],
                'exam_type': '口试+SP',
            },
            {
                'name': '临床思维站', 'duration': 30,
                'description': '妇产科临床思维：病历汇报+诊断及鉴别诊断+诊疗计划',
                'projects': [
                    {'name': '病例分析', 'score': 70, 'description': '妇产科病例分析及诊疗计划'},
                    {'name': '病历书写', 'score': 30, 'description': '妇产科病历书写'},
                ],
                'score_tables': [
                    {'name': '病例分析评分表', 'code': 'TPL-STD-7', 'items': ['病例分析']},
                    {'name': '病历书写评分表', 'code': 'TPL-STD-3', 'items': ['病历书写']},
                ],
                'exam_type': '笔试+口试',
            },
            {
                'name': '基本技能操作站', 'duration': 30,
                'description': '妇产科基本技能操作：妇科检查+产科检查（妇1项+产1项）',
                'projects': [
                    {'name': '妇科操作', 'score': 50, 'description': '妇科基本操作（妇科检查等）'},
                    {'name': '产科操作', 'score': 50, 'description': '产科基本操作（四步触诊、骨盆测量等）'}
                ],
                'score_tables': [
                    {'name': '技能操作评分表', 'code': 'TPL-STD-4', 'items': ['妇科操作', '产科操作']}
                ],
                'exam_type': '操作',
            },
        ],
    },
    '眼科': {
        'phase': '住院医师',
        'total_duration': '约110分钟（含辅助检查站和显微手术站）',
        'source_doc': '1700眼科住院医师规范化培训结业实践技能考核指导标准（试行）',
        'stations': [
            {
                'name': '接诊病人站', 'duration': 20,
                'description': '眼科专业接诊病人站：SP病史采集+眼部检查+人文沟通+初步诊断',
                'projects': [
                    {'name': '病史采集', 'score': 30, 'description': '采集患者主诉、现病史、既往史、家族史等信息'},
                    {'name': '眼部检查', 'score': 30, 'description': '对SP进行重点眼部检查'},
                    {'name': '人文沟通', 'score': 20, 'description': '医患沟通、人文关怀、职业素养'},
                    {'name': '初步诊断', 'score': 20, 'description': '根据病史和体征给出初步诊断及鉴别诊断'},
                ],
                'score_tables': [
                    {'name': '病史采集评分表（标准模板）', 'code': 'TPL-STD', 'items': ['病史采集']},
                    {'name': '眼部检查评分表', 'code': 'TPL-STD-2', 'items': ['眼部检查']},
                    {'name': '人文沟通评分表', 'code': 'TPL-STD-6', 'items': ['人文沟通', '初步诊断']},
                ],
                'exam_type': '口试+SP',
            },
            {
                'name': '临床思维站', 'duration': 40,
                'description': '眼科临床思维：病历书写+病例分析',
                'projects': [
                    {'name': '病例分析', 'score': 65, 'description': '眼科病例分析'},
                    {'name': '病历书写', 'score': 35, 'description': '眼科病历书写'},
                ],
                'score_tables': [
                    {'name': '病例分析评分表', 'code': 'TPL-STD-7', 'items': ['病例分析']},
                    {'name': '病历书写评分表', 'code': 'TPL-STD-3', 'items': ['病历书写']},
                ],
                'exam_type': '笔试',
            },
            {
                'name': '辅助检查及影像学判读站', 'duration': 20,
                'description': '眼科辅助检查判读：眼底照相/OCT/视野等判读',
                'projects': [
                    {'name': '眼科影像判读', 'score': 100, 'description': '眼底照相、OCT、视野、FFA等判读'}
                ],
                'score_tables': [
                    {'name': '辅助检查判读评分表', 'code': 'TPL-STD-5', 'items': ['眼科影像判读']}
                ],
                'exam_type': '笔试',
            },
            {
                'name': '动物眼显微手术站', 'duration': 30,
                'description': '动物眼显微手术：显微缝合+白内障/青光眼手术模拟',
                'projects': [
                    {'name': '显微手术操作', 'score': 100, 'description': '动物眼显微手术操作（角膜缝合/囊外摘除等）'}
                ],
                'score_tables': [
                    {'name': '技能操作评分表', 'code': 'TPL-STD-4', 'items': ['显微手术操作']}
                ],
                'exam_type': '操作',
            },
        ],
    },
    '耳鼻咽喉科': {
        'phase': '住院医师',
        'total_duration': '约80分钟（含辅助检查站和技能站）',
        'source_doc': '1800耳鼻咽喉科住院医师规范化培训结业实践技能考核指导标准（试行）',
        'stations': [
            {
                'name': '接诊病人站', 'duration': 20,
                'description': '耳鼻咽喉科专业接诊病人站：SP病史采集+专科检查+人文沟通+初步诊断',
                'projects': [
                    {'name': '病史采集', 'score': 30, 'description': '采集患者主诉、现病史、既往史、家族史等信息'},
                    {'name': '专科检查', 'score': 30, 'description': '对SP进行重点专科检查'},
                    {'name': '人文沟通', 'score': 20, 'description': '医患沟通、人文关怀、职业素养'},
                    {'name': '初步诊断', 'score': 20, 'description': '根据病史和体征给出初步诊断及鉴别诊断'},
                ],
                'score_tables': [
                    {'name': '病史采集评分表（标准模板）', 'code': 'TPL-STD', 'items': ['病史采集']},
                    {'name': '专科检查评分表', 'code': 'TPL-STD-2', 'items': ['专科检查']},
                    {'name': '人文沟通评分表', 'code': 'TPL-STD-6', 'items': ['人文沟通', '初步诊断']},
                ],
                'exam_type': '口试+SP',
            },
            {
                'name': '临床思维站', 'duration': 20,
                'description': '耳鼻咽喉科临床思维：病历书写+病例分析',
                'projects': [
                    {'name': '病例分析', 'score': 65, 'description': '耳鼻咽喉科病例分析'},
                    {'name': '病历书写', 'score': 35, 'description': '耳鼻咽喉科病历书写'},
                ],
                'score_tables': [
                    {'name': '病例分析评分表', 'code': 'TPL-STD-7', 'items': ['病例分析']},
                    {'name': '病历书写评分表', 'code': 'TPL-STD-3', 'items': ['病历书写']},
                ],
                'exam_type': '笔试',
            },
            {
                'name': '辅助检查及影像学判读站', 'duration': 20,
                'description': '耳鼻咽喉科辅助检查判读：听力图/CT/MRI/内镜图像判读',
                'projects': [
                    {'name': '辅助检查判读', 'score': 100, 'description': '听力图、颞骨CT、鼻窦CT/MRI等判读'}
                ],
                'score_tables': [
                    {'name': '辅助检查判读评分表', 'code': 'TPL-STD-5', 'items': ['辅助检查判读']}
                ],
                'exam_type': '笔试',
            },
            {
                'name': '基本技能操作站', 'duration': 20,
                'description': '耳鼻咽喉科基本技能操作：鼻内镜+耳镜+喉镜等操作',
                'projects': [
                    {'name': '内镜操作', 'score': 100, 'description': '耳鼻咽喉科内镜基本操作'}
                ],
                'score_tables': [
                    {'name': '技能操作评分表', 'code': 'TPL-STD-4', 'items': ['内镜操作']}
                ],
                'exam_type': '操作',
            },
        ],
    },
    '麻醉科': {
        'phase': '住院医师',
        'total_duration': '约150分钟（含面试沟通站和技能站）',
        'source_doc': '1900麻醉科住院医师规范化培训结业临床实践能力考核标准方案',
        'stations': [
            {
                'name': '接诊和沟通站', 'duration': 30,
                'description': '麻醉科面试沟通及必备技能：人文关怀及沟通协作+术前访视',
                'projects': [
                    {'name': '病史采集', 'score': 30, 'description': '术前访视与病史采集'},
                    {'name': '人文沟通', 'score': 40, 'description': '人文关怀及沟通协作'},
                    {'name': '初步诊断', 'score': 30, 'description': '麻醉前评估及初步诊断'},
                ],
                'score_tables': [
                    {'name': '病史采集评分表（标准模板）', 'code': 'TPL-STD', 'items': ['病史采集']},
                    {'name': '人文沟通评分表', 'code': 'TPL-STD-6', 'items': ['人文沟通', '初步诊断']},
                ],
                'exam_type': '口试+SP',
            },
            {
                'name': '面试沟通站', 'duration': 30,
                'description': '麻醉科面试沟通及病例分析口试：病例分析+麻醉方案+沟通协作',
                'projects': [
                    {'name': '病例分析', 'score': 60, 'description': '麻醉病例分析、麻醉方案制定'},
                    {'name': '人文沟通', 'score': 40, 'description': '术前访视沟通、团队协作沟通'}
                ],
                'score_tables': [
                    {'name': '病例分析评分表', 'code': 'TPL-STD-7', 'items': ['病例分析']},
                    {'name': '人文沟通评分表', 'code': 'TPL-STD-6', 'items': ['人文沟通']}
                ],
                'exam_type': '口试',
            },
            {
                'name': '技能操作站', 'duration': 30,
                'description': '麻醉技能操作：气管插管+椎管内麻醉+动静脉穿刺+麻醉机使用',
                'projects': [
                    {'name': '气管插管', 'score': 30, 'description': '全身麻醉气管插管'},
                    {'name': '椎管内麻醉', 'score': 25, 'description': '椎管内麻醉操作'},
                    {'name': '血管穿刺', 'score': 25, 'description': '深静脉/动脉穿刺置管'},
                    {'name': '麻醉机使用', 'score': 20, 'description': '麻醉机参数设置与使用'}
                ],
                'score_tables': [
                    {'name': '技能操作评分表', 'code': 'TPL-STD-4', 'items': ['气管插管', '椎管内麻醉', '血管穿刺', '麻醉机使用']}
                ],
                'exam_type': '操作',
            },
        ],
    },
    '临床病理科': {
        'phase': '住院医师',
        'total_duration': '约150分钟（含切片诊断和标本取材站）',
        'source_doc': '2000临床病理科住院医师规范化培训结业实践技能考核指导标准（试行）',
        'stations': [
            {
                'name': '切片诊断站', 'duration': 30,
                'description': '病理切片诊断：常见疾病病理切片阅片与诊断',
                'projects': [
                    {'name': '病理切片诊断', 'score': 100, 'description': '病理切片阅片、诊断及鉴别诊断'}
                ],
                'score_tables': [
                    {'name': '辅助检查判读评分表', 'code': 'TPL-STD-5', 'items': ['病理切片诊断']}
                ],
                'exam_type': '笔试+口试',
            },
            {
                'name': '标本取材站', 'duration': 30,
                'description': '病理标本取材：大体标本检查+取材+描述',
                'projects': [
                    {'name': '标本取材', 'score': 100, 'description': '病理大体标本检查、取材及描述'}
                ],
                'score_tables': [
                    {'name': '技能操作评分表', 'code': 'TPL-STD-4', 'items': ['标本取材']}
                ],
                'exam_type': '操作+口试',
            },
            {
                'name': '临床思维站', 'duration': 90,
                'description': '临床病理思维：切片诊断+标本取材+病例分析',
                'projects': [
                    {'name': '病例分析', 'score': 100, 'description': '病理病例分析及诊断'},
                ],
                'score_tables': [
                    {'name': '病例分析评分表', 'code': 'TPL-STD-7', 'items': ['病例分析']},
                ],
                'exam_type': '笔试+操作',
            },
        ],
    },
    '检验医学科': {
        'phase': '住院医师',
        'total_duration': '约85分钟（含全部技能站）',
        'source_doc': '2100检验医学科住院医师规范化培训结业实践技能考核指导标准（试行）',
        'stations': [
            {
                'name': '交流沟通站', 'duration': 10,
                'description': '检验医学科沟通与人文：人文沟通+病例分析',
                'projects': [
                    {'name': '人文沟通', 'score': 50, 'description': '检验科医患/临床沟通'},
                    {'name': '病例分析', 'score': 50, 'description': '检验结果解读与病例分析'},
                ],
                'score_tables': [
                    {'name': '人文沟通评分表', 'code': 'TPL-STD-6', 'items': ['人文沟通', '病例分析']},
                ],
                'exam_type': '口试',
            },
            {
                'name': '临床思维站', 'duration': 20,
                'description': '病例分析：根据临床病例进行诊断分析、鉴别诊断和治疗方案制定',
                'projects': [
                    {'name': '病例分析', 'score': 100, 'description': '阅读病例资料，进行诊断、鉴别诊断、辅助检查选择和诊疗计划制定'},
                ],
                'score_tables': [
                    {'name': '病例分析评分表', 'code': 'TPL-STD-7', 'items': ['病例分析']},
                ],
                'exam_type': '笔试',
            },
            {
                'name': '细胞形态辨认站', 'duration': 20,
                'description': '细胞形态学辨认：外周血/骨髓细胞形态学辨认',
                'projects': [
                    {'name': '细胞形态辨认', 'score': 100, 'description': '外周血细胞、骨髓细胞等形态学辨认与分类'}
                ],
                'score_tables': [
                    {'name': '辅助检查判读评分表', 'code': 'TPL-STD-5', 'items': ['细胞形态辨认']}
                ],
                'exam_type': '笔试',
            },
            {
                'name': '检验技能操作站', 'duration': 20,
                'description': '检验技能操作：常用检验技术操作',
                'projects': [
                    {'name': '检验操作', 'score': 100, 'description': '临床检验基本技能操作'}
                ],
                'score_tables': [
                    {'name': '技能操作评分表', 'code': 'TPL-STD-4', 'items': ['检验操作']}
                ],
                'exam_type': '操作',
            },
            {
                'name': '结果判读站', 'duration': 15,
                'description': '检验结果判读：检验报告审核与结果判读',
                'projects': [
                    {'name': '结果判读', 'score': 100, 'description': '检验结果审核、判读与临床意义分析'}
                ],
                'score_tables': [
                    {'name': '辅助检查判读评分表', 'code': 'TPL-STD-5', 'items': ['结果判读']}
                ],
                'exam_type': '笔试',
            },
        ],
    },
    '放射科': {
        'phase': '住院医师',
        'total_duration': '约100分钟（含全部影像站）',
        'source_doc': '2200放射科住院医师规范化培训结业临床实践能力考核标准方案',
        'stations': [
            {
                'name': '交流沟通站', 'duration': 10,
                'description': '放射科临床医患沟通：人文沟通+病例分析',
                'projects': [
                    {'name': '人文沟通', 'score': 60, 'description': '放射科医患沟通'},
                    {'name': '病例分析', 'score': 40, 'description': '影像相关病例分析'},
                ],
                'score_tables': [
                    {'name': '人文沟通评分表', 'code': 'TPL-STD-6', 'items': ['人文沟通', '病例分析']},
                ],
                'exam_type': '口试',
            },
            {
                'name': '放射诊断基本功站', 'duration': 30,
                'description': '放射诊断基本功：各系统影像解剖及基本病变识别',
                'projects': [
                    {'name': '放射诊断', 'score': 100, 'description': '各系统正常影像解剖及基本病变的放射诊断'}
                ],
                'score_tables': [
                    {'name': '辅助检查判读评分表', 'code': 'TPL-STD-5', 'items': ['放射诊断']}
                ],
                'exam_type': '笔试',
            },
            {
                'name': '报告书写站', 'duration': 20,
                'description': '放射报告书写：规范化影像报告书写',
                'projects': [
                    {'name': '报告书写', 'score': 100, 'description': '规范化放射诊断报告书写'}
                ],
                'score_tables': [
                    {'name': '病历书写评分表', 'code': 'TPL-STD-3', 'items': ['报告书写']}
                ],
                'exam_type': '笔试',
            },
            {
                'name': '临床思维与决策站', 'duration': 20,
                'description': '放射科临床思维与决策：结合影像的临床决策',
                'projects': [
                    {'name': '病例分析', 'score': 100, 'description': '基于影像学表现的临床思维与诊疗决策'}
                ],
                'score_tables': [
                    {'name': '病例分析评分表', 'code': 'TPL-STD-7', 'items': ['病例分析']}
                ],
                'exam_type': '口试',
            },
            {
                'name': '实践技能操作站', 'duration': 20,
                'description': '放射实践技能操作：胃肠造影等基本操作',
                'projects': [
                    {'name': '放射操作', 'score': 100, 'description': '消化道造影等放射科基本操作'}
                ],
                'score_tables': [
                    {'name': '技能操作评分表', 'code': 'TPL-STD-4', 'items': ['放射操作']}
                ],
                'exam_type': '操作',
            },
        ],
    },
    '超声科': {
        'phase': '住院医师',
        'total_duration': '约55分钟（含超声操作站和临床思维站）',
        'source_doc': '2300超声科住院医师规范化培训结业临床实践能力考核标准方案',
        'stations': [
            {
                'name': '交流沟通站', 'duration': 5,
                'description': '超声科临床人文沟通：人文沟通+病例分析',
                'projects': [
                    {'name': '人文沟通', 'score': 60, 'description': '超声科医患沟通'},
                    {'name': '病例分析', 'score': 40, 'description': '超声相关病例分析'},
                ],
                'score_tables': [
                    {'name': '人文沟通评分表', 'code': 'TPL-STD-6', 'items': ['人文沟通', '病例分析']},
                ],
                'exam_type': '口试',
            },
            {
                'name': '超声临床思维站', 'duration': 20,
                'description': '超声临床思维：超声图像分析与临床决策',
                'projects': [
                    {'name': '病例分析', 'score': 100, 'description': '基于超声图像的病例分析与临床思维'}
                ],
                'score_tables': [
                    {'name': '病例分析评分表', 'code': 'TPL-STD-7', 'items': ['病例分析']}
                ],
                'exam_type': '口试',
            },
            {
                'name': '超声操作技能站', 'duration': 30,
                'description': '超声操作技能：腹部/心脏/血管等超声扫查操作',
                'projects': [
                    {'name': '超声扫查', 'score': 100, 'description': '腹部、心脏、血管等超声标准切面扫查操作'}
                ],
                'score_tables': [
                    {'name': '技能操作评分表', 'code': 'TPL-STD-4', 'items': ['超声扫查']}
                ],
                'exam_type': '操作',
            },
        ],
    },
    '核医学科': {
        'phase': '住院医师',
        'total_duration': '约95分钟（含技能站和读片站）',
        'source_doc': '2400核医学科住院医师规范化培训结业实践技能考核指导标准（试行）',
        'stations': [
            {
                'name': '接诊病人站', 'duration': 25,
                'description': '核医学科专业接诊病人站：SP病史采集+体格检查+人文沟通+初步诊断',
                'projects': [
                    {'name': '病史采集', 'score': 30, 'description': '采集患者主诉、现病史、既往史、家族史等信息'},
                    {'name': '体格检查', 'score': 30, 'description': '对SP进行重点体格检查'},
                    {'name': '人文沟通', 'score': 20, 'description': '医患沟通、人文关怀、职业素养'},
                    {'name': '初步诊断', 'score': 20, 'description': '根据病史和体征给出初步诊断及鉴别诊断'},
                ],
                'score_tables': [
                    {'name': '病史采集评分表（标准模板）', 'code': 'TPL-STD', 'items': ['病史采集']},
                    {'name': '体格检查评分表', 'code': 'TPL-STD-2', 'items': ['体格检查']},
                    {'name': '人文沟通评分表', 'code': 'TPL-STD-6', 'items': ['人文沟通', '初步诊断']},
                ],
                'exam_type': '口试+SP',
            },
            {
                'name': '临床思维站', 'duration': 30,
                'description': '核医学科检查报告：病例分析+病历书写',
                'projects': [
                    {'name': '病例分析', 'score': 50, 'description': '核医学相关病例分析'},
                    {'name': '病历书写', 'score': 50, 'description': '检查报告书写'},
                ],
                'score_tables': [
                    {'name': '病例分析评分表', 'code': 'TPL-STD-7', 'items': ['病例分析']},
                    {'name': '病历书写评分表', 'code': 'TPL-STD-3', 'items': ['病历书写']},
                ],
                'exam_type': '笔试',
            },
            {
                'name': '基本技能操作站', 'duration': 20,
                'description': '核医学基本技能操作：放射性药物操作+防护等',
                'projects': [
                    {'name': '核医学操作', 'score': 100, 'description': '核医学基本技能操作（放射性药物、防护等）'}
                ],
                'score_tables': [
                    {'name': '技能操作评分表', 'code': 'TPL-STD-4', 'items': ['核医学操作']}
                ],
                'exam_type': '操作',
            },
            {
                'name': '临床思维读片站', 'duration': 20,
                'description': '核医学读片：SPECT/PET图像判读与临床思维',
                'projects': [
                    {'name': '核医学读片', 'score': 100, 'description': 'SPECT、PET/CT等核医学图像判读与临床分析'}
                ],
                'score_tables': [
                    {'name': '辅助检查判读评分表', 'code': 'TPL-STD-5', 'items': ['核医学读片']}
                ],
                'exam_type': '笔试+口试',
            },
        ],
    },
    '放射肿瘤科': {
        'phase': '住院医师',
        'total_duration': '约200分钟（含放疗技能站4站）',
        'source_doc': '2500放射肿瘤科住院医师规范化培训结业实践技能考核指导标准（试行）',
        'stations': [
            {
                'name': '接诊病人站', 'duration': 20,
                'description': '放射肿瘤科专业接诊病人站：SP病史采集+体格检查+人文沟通+初步诊断',
                'projects': [
                    {'name': '病史采集', 'score': 30, 'description': '采集患者主诉、现病史、既往史、家族史等信息'},
                    {'name': '体格检查', 'score': 30, 'description': '对SP进行重点体格检查'},
                    {'name': '人文沟通', 'score': 20, 'description': '医患沟通、人文关怀、职业素养'},
                    {'name': '初步诊断', 'score': 20, 'description': '根据病史和体征给出初步诊断及鉴别诊断'},
                ],
                'score_tables': [
                    {'name': '病史采集评分表（标准模板）', 'code': 'TPL-STD', 'items': ['病史采集']},
                    {'name': '体格检查评分表', 'code': 'TPL-STD-2', 'items': ['体格检查']},
                    {'name': '人文沟通评分表', 'code': 'TPL-STD-6', 'items': ['人文沟通', '初步诊断']},
                ],
                'exam_type': '口试+SP',
            },
            {
                'name': '临床思维站', 'duration': 30,
                'description': '病例分析：根据临床病例进行诊断分析、鉴别诊断和治疗方案制定',
                'projects': [
                    {'name': '病例分析', 'score': 100, 'description': '阅读病例资料，进行诊断、鉴别诊断、辅助检查选择和诊疗计划制定'},
                ],
                'score_tables': [
                    {'name': '病例分析评分表', 'code': 'TPL-STD-7', 'items': ['病例分析']},
                ],
                'exam_type': '笔试',
            },
            {
                'name': '放疗技能操作站(第三站)', 'duration': 15,
                'description': '放疗定位与固定技术：体模制作+定位操作',
                'projects': [
                    {'name': '放疗定位', 'score': 100, 'description': '放射治疗定位与固定技术操作'}
                ],
                'score_tables': [
                    {'name': '技能操作评分表', 'code': 'TPL-STD-4', 'items': ['放疗定位']}
                ],
                'exam_type': '操作',
            },
            {
                'name': '放疗技能操作站(第四站)', 'duration': 15,
                'description': '放疗计划设计：靶区勾画+计划评估',
                'projects': [
                    {'name': '计划设计', 'score': 100, 'description': '放射治疗计划设计与靶区勾画'}
                ],
                'score_tables': [
                    {'name': '技能操作评分表', 'code': 'TPL-STD-4', 'items': ['计划设计']}
                ],
                'exam_type': '笔试+操作',
            },
            {
                'name': '放疗技能操作站(第五站)', 'duration': 15,
                'description': '放疗实施与验证：照射野验证+剂量验证',
                'projects': [
                    {'name': '放疗验证', 'score': 100, 'description': '放射治疗实施与验证'}
                ],
                'score_tables': [
                    {'name': '技能操作评分表', 'code': 'TPL-STD-4', 'items': ['放疗验证']}
                ],
                'exam_type': '操作',
            },
            {
                'name': '放疗技能操作站(第六站)', 'duration': 15,
                'description': '放疗反应处理：急慢性放疗反应识别与处理',
                'projects': [
                    {'name': '放疗反应处理', 'score': 100, 'description': '放疗不良反应识别与处理'}
                ],
                'score_tables': [
                    {'name': '病例分析评分表', 'code': 'TPL-STD-7', 'items': ['放疗反应处理']}
                ],
                'exam_type': '口试',
            },
        ],
    },
    '医学遗传科': {
        'phase': '住院医师',
        'total_duration': '约110分钟（含遗传检测站和技能站）',
        'source_doc': '2600医学遗传科住院医师规范化培训结业实践技能考核指导标准（试行）',
        'stations': [
            {
                'name': '接诊病人站', 'duration': 35,
                'description': '医学遗传科专业接诊病人站：SP病史采集+体格检查+人文沟通+初步诊断',
                'projects': [
                    {'name': '病史采集', 'score': 30, 'description': '采集患者主诉、现病史、既往史、家族史等信息'},
                    {'name': '体格检查', 'score': 30, 'description': '对SP进行重点体格检查'},
                    {'name': '人文沟通', 'score': 20, 'description': '医患沟通、人文关怀、职业素养'},
                    {'name': '初步诊断', 'score': 20, 'description': '根据病史和体征给出初步诊断及鉴别诊断'},
                ],
                'score_tables': [
                    {'name': '病史采集评分表（标准模板）', 'code': 'TPL-STD', 'items': ['病史采集']},
                    {'name': '体格检查评分表', 'code': 'TPL-STD-2', 'items': ['体格检查']},
                    {'name': '人文沟通评分表', 'code': 'TPL-STD-6', 'items': ['人文沟通', '初步诊断']},
                ],
                'exam_type': '口试+SP',
            },
            {
                'name': '临床思维站', 'duration': 25,
                'description': '医学遗传科临床思维：病历书写+病例分析',
                'projects': [
                    {'name': '病例分析', 'score': 65, 'description': '遗传病病例分析'},
                    {'name': '病历书写', 'score': 35, 'description': '遗传科病历书写'},
                ],
                'score_tables': [
                    {'name': '病例分析评分表', 'code': 'TPL-STD-7', 'items': ['病例分析']},
                    {'name': '病历书写评分表', 'code': 'TPL-STD-3', 'items': ['病历书写']},
                ],
                'exam_type': '笔试',
            },
            {
                'name': '遗传学检测结果判读站(第一站)', 'duration': 10,
                'description': '细胞遗传学检测判读：染色体核型分析结果判读',
                'projects': [
                    {'name': '染色体核型判读', 'score': 100, 'description': '染色体核型分析结果的判读与报告'}
                ],
                'score_tables': [
                    {'name': '辅助检查判读评分表', 'code': 'TPL-STD-5', 'items': ['染色体核型判读']}
                ],
                'exam_type': '笔试',
            },
            {
                'name': '遗传学检测结果判读站(第二站)', 'duration': 10,
                'description': '分子遗传学检测判读：基因测序结果判读',
                'projects': [
                    {'name': '基因检测判读', 'score': 100, 'description': '基因测序结果的判读与临床解读'}
                ],
                'score_tables': [
                    {'name': '辅助检查判读评分表', 'code': 'TPL-STD-5', 'items': ['基因检测判读']}
                ],
                'exam_type': '笔试',
            },
            {
                'name': '遗传学检测结果判读站(第三站)', 'duration': 10,
                'description': '生化遗传学检测判读：代谢病筛查结果判读',
                'projects': [
                    {'name': '代谢筛查判读', 'score': 100, 'description': '遗传代谢病筛查结果的判读'}
                ],
                'score_tables': [
                    {'name': '辅助检查判读评分表', 'code': 'TPL-STD-5', 'items': ['代谢筛查判读']}
                ],
                'exam_type': '笔试',
            },
            {
                'name': '基本技能操作站', 'duration': 20,
                'description': '医学遗传基本技能操作：遗传咨询+家系分析+标本采集',
                'projects': [
                    {'name': '遗传咨询', 'score': 50, 'description': '遗传咨询与家系分析'},
                    {'name': '标本采集', 'score': 50, 'description': '遗传学检测标本采集与处理'}
                ],
                'score_tables': [
                    {'name': '技能操作评分表', 'code': 'TPL-STD-4', 'items': ['遗传咨询', '标本采集']}
                ],
                'exam_type': '口试+操作',
            },
        ],
    },
    '预防医学科': {
        'phase': '住院医师',
        'total_duration': '约70分钟（含技能站和公共卫生思维站）',
        'source_doc': '2700预防医学科住院医师规范化培训结业实践技能考核指导标准（试行）',
        'stations': [
            {
                'name': '接诊病人站', 'duration': 15,
                'description': '预防医学科专业接诊病人站：SP病史采集+体格检查+人文沟通+初步诊断',
                'projects': [
                    {'name': '病史采集', 'score': 30, 'description': '采集患者主诉、现病史、既往史、家族史等信息'},
                    {'name': '体格检查', 'score': 30, 'description': '对SP进行重点体格检查'},
                    {'name': '人文沟通', 'score': 20, 'description': '医患沟通、人文关怀、职业素养'},
                    {'name': '初步诊断', 'score': 20, 'description': '根据病史和体征给出初步诊断及鉴别诊断'},
                ],
                'score_tables': [
                    {'name': '病史采集评分表（标准模板）', 'code': 'TPL-STD', 'items': ['病史采集']},
                    {'name': '体格检查评分表', 'code': 'TPL-STD-2', 'items': ['体格检查']},
                    {'name': '人文沟通评分表', 'code': 'TPL-STD-6', 'items': ['人文沟通', '初步诊断']},
                ],
                'exam_type': '口试+SP',
            },
            {
                'name': '临床思维站', 'duration': 15,
                'description': '病例分析：根据临床病例进行诊断分析、鉴别诊断和治疗方案制定',
                'projects': [
                    {'name': '病例分析', 'score': 100, 'description': '阅读病例资料，进行诊断、鉴别诊断、辅助检查选择和诊疗计划制定'},
                ],
                'score_tables': [
                    {'name': '病例分析评分表', 'code': 'TPL-STD-7', 'items': ['病例分析']},
                ],
                'exam_type': '笔试',
            },
            {
                'name': '临床基本操作站', 'duration': 20,
                'description': '预防医学科临床基本操作：体格检查+基本急救技能',
                'projects': [
                    {'name': '临床基本操作', 'score': 100, 'description': '预防医学科临床基本操作技能'}
                ],
                'score_tables': [
                    {'name': '技能操作评分表', 'code': 'TPL-STD-4', 'items': ['临床基本操作']}
                ],
                'exam_type': '操作',
            },
            {
                'name': '公共卫生思维站', 'duration': 20,
                'description': '公共卫生思维：流行病学调查+疫情处置+健康教育',
                'projects': [
                    {'name': '公共卫生思维', 'score': 100, 'description': '公共卫生事件处置思维（流行病学调查、疫情处置、健康教育等）'}
                ],
                'score_tables': [
                    {'name': '病例分析评分表', 'code': 'TPL-STD-7', 'items': ['公共卫生思维']}
                ],
                'exam_type': '口试',
            },
        ],
    },
    '口腔全科': {
        'phase': '住院医师',
        'total_duration': '约90分钟（含技能操作站）',
        'source_doc': '2800口腔全科住院医师规范化培训结业临床实践能力考核标准方案',
        'stations': [
            {
                'name': '接诊病人站', 'duration': 20,
                'description': '口腔全科接诊病人：病史采集+口腔检查+医患沟通+病历书写',
                'projects': [
                    {'name': '病史采集', 'score': 30, 'description': '口腔病史采集'},
                    {'name': '体格检查', 'score': 20, 'description': '口腔专科检查'},
                    {'name': '人文沟通', 'score': 25, 'description': '口腔科医患沟通'},
                    {'name': '病历书写', 'score': 25, 'description': '口腔科病历书写'},
                ],
                'score_tables': [
                    {'name': '病史采集评分表（标准模板）', 'code': 'TPL-STD', 'items': ['病史采集']},
                    {'name': '人文沟通评分表', 'code': 'TPL-STD-6', 'items': ['人文沟通', '体格检查']},
                    {'name': '病历书写评分表', 'code': 'TPL-STD-3', 'items': ['病历书写']},
                ],
                'exam_type': '口试+操作',
            },
            {
                'name': '技能操作站', 'duration': 70,
                'description': '口腔全科技能操作（4项）：开髓+拔牙+洁治+口腔局部麻醉',
                'projects': [
                    {'name': '开髓术', 'score': 25, 'description': '开髓术操作'},
                    {'name': '拔牙术', 'score': 25, 'description': '牙拔除术操作'},
                    {'name': '洁治术', 'score': 25, 'description': '龈上洁治术操作'},
                    {'name': '局部麻醉', 'score': 25, 'description': '口腔局部麻醉操作'}
                ],
                'score_tables': [
                    {'name': '技能操作评分表', 'code': 'TPL-STD-4', 'items': ['开髓术', '拔牙术', '洁治术', '局部麻醉']}
                ],
                'exam_type': '操作',
            },
        ],
    },
    '口腔内科': {
        'phase': '住院医师',
        'total_duration': '约50分钟（含技能操作站）',
        'source_doc': '2900口腔内科住院医师规范化培训结业临床实践能力考核标准方案',
        'stations': [
            {
                'name': '接诊病人站', 'duration': 20,
                'description': '口腔接诊病人：病史采集+口腔检查+医患沟通+病历书写',
                'projects': [
                    {'name': '病史采集', 'score': 30, 'description': '口腔病史采集'},
                    {'name': '体格检查', 'score': 20, 'description': '口腔专科检查'},
                    {'name': '人文沟通', 'score': 25, 'description': '口腔科医患沟通'},
                    {'name': '病历书写', 'score': 25, 'description': '口腔科病历书写'},
                ],
                'score_tables': [
                    {'name': '病史采集评分表（标准模板）', 'code': 'TPL-STD', 'items': ['病史采集']},
                    {'name': '人文沟通评分表', 'code': 'TPL-STD-6', 'items': ['人文沟通', '体格检查']},
                    {'name': '病历书写评分表', 'code': 'TPL-STD-3', 'items': ['病历书写']},
                ],
                'exam_type': '口试+操作',
            },
            {
                'name': '技能操作站', 'duration': 30,
                'description': '口腔内科技能操作',
                'projects': [
                    {'name': '口腔内科操作', 'score': 100, 'description': '口腔内科基本技能操作（根管治疗、充填术等）'}
                ],
                'score_tables': [
                    {'name': '技能操作评分表', 'code': 'TPL-STD-4', 'items': ['口腔内科操作']}
                ],
                'exam_type': '操作',
            },
        ],
    },
    '口腔颌面外科': {
        'phase': '住院医师',
        'total_duration': '约50分钟（含技能操作站）',
        'source_doc': '3000口腔颌面外科住院医师规范化培训结业临床实践能力考核标准方案',
        'stations': [
            {
                'name': '接诊病人站', 'duration': 20,
                'description': '口腔接诊病人：病史采集+口腔检查+医患沟通+病历书写',
                'projects': [
                    {'name': '病史采集', 'score': 30, 'description': '口腔病史采集'},
                    {'name': '体格检查', 'score': 20, 'description': '口腔专科检查'},
                    {'name': '人文沟通', 'score': 25, 'description': '口腔科医患沟通'},
                    {'name': '病历书写', 'score': 25, 'description': '口腔科病历书写'},
                ],
                'score_tables': [
                    {'name': '病史采集评分表（标准模板）', 'code': 'TPL-STD', 'items': ['病史采集']},
                    {'name': '人文沟通评分表', 'code': 'TPL-STD-6', 'items': ['人文沟通', '体格检查']},
                    {'name': '病历书写评分表', 'code': 'TPL-STD-3', 'items': ['病历书写']},
                ],
                'exam_type': '口试+操作',
            },
            {
                'name': '技能操作站', 'duration': 30,
                'description': '口腔颌面外科技能操作',
                'projects': [
                    {'name': '口腔颌面外科操作', 'score': 100, 'description': '口腔颌面外科基本技能操作（拔牙术、切开缝合等）'}
                ],
                'score_tables': [
                    {'name': '技能操作评分表', 'code': 'TPL-STD-4', 'items': ['口腔颌面外科操作']}
                ],
                'exam_type': '操作',
            },
        ],
    },
    '口腔修复科': {
        'phase': '住院医师',
        'total_duration': '约50分钟（含技能操作站）',
        'source_doc': '3100口腔修复科住院医师规范化培训结业临床实践能力考核标准方案',
        'stations': [
            {
                'name': '接诊病人站', 'duration': 20,
                'description': '口腔接诊病人：病史采集+口腔检查+医患沟通+病历书写',
                'projects': [
                    {'name': '病史采集', 'score': 30, 'description': '口腔病史采集'},
                    {'name': '体格检查', 'score': 20, 'description': '口腔专科检查'},
                    {'name': '人文沟通', 'score': 25, 'description': '口腔科医患沟通'},
                    {'name': '病历书写', 'score': 25, 'description': '口腔科病历书写'},
                ],
                'score_tables': [
                    {'name': '病史采集评分表（标准模板）', 'code': 'TPL-STD', 'items': ['病史采集']},
                    {'name': '人文沟通评分表', 'code': 'TPL-STD-6', 'items': ['人文沟通', '体格检查']},
                    {'name': '病历书写评分表', 'code': 'TPL-STD-3', 'items': ['病历书写']},
                ],
                'exam_type': '口试+操作',
            },
            {
                'name': '技能操作站', 'duration': 30,
                'description': '口腔修复科技能操作',
                'projects': [
                    {'name': '口腔修复科操作', 'score': 100, 'description': '口腔修复基本技能操作（牙体预备、印模制取等）'}
                ],
                'score_tables': [
                    {'name': '技能操作评分表', 'code': 'TPL-STD-4', 'items': ['口腔修复科操作']}
                ],
                'exam_type': '操作',
            },
        ],
    },
    '口腔正畸科': {
        'phase': '住院医师',
        'total_duration': '约50分钟（含技能操作站）',
        'source_doc': '3200口腔正畸科住院医师规范化培训结业临床实践能力考核标准方案',
        'stations': [
            {
                'name': '接诊病人站', 'duration': 20,
                'description': '口腔接诊病人：病史采集+口腔检查+医患沟通+病历书写',
                'projects': [
                    {'name': '病史采集', 'score': 30, 'description': '口腔病史采集'},
                    {'name': '体格检查', 'score': 20, 'description': '口腔专科检查'},
                    {'name': '人文沟通', 'score': 25, 'description': '口腔科医患沟通'},
                    {'name': '病历书写', 'score': 25, 'description': '口腔科病历书写'},
                ],
                'score_tables': [
                    {'name': '病史采集评分表（标准模板）', 'code': 'TPL-STD', 'items': ['病史采集']},
                    {'name': '人文沟通评分表', 'code': 'TPL-STD-6', 'items': ['人文沟通', '体格检查']},
                    {'name': '病历书写评分表', 'code': 'TPL-STD-3', 'items': ['病历书写']},
                ],
                'exam_type': '口试+操作',
            },
            {
                'name': '技能操作站', 'duration': 30,
                'description': '口腔正畸科技能操作',
                'projects': [
                    {'name': '口腔正畸科操作', 'score': 100, 'description': '口腔正畸基本技能操作（正畸检查、弓丝弯制等）'}
                ],
                'score_tables': [
                    {'name': '技能操作评分表', 'code': 'TPL-STD-4', 'items': ['口腔正畸科操作']}
                ],
                'exam_type': '操作',
            },
        ],
    },
    '口腔病理科': {
        'phase': '住院医师',
        'total_duration': '约50分钟（含技能操作站）',
        'source_doc': '3300口腔病理科住院医师规范化培训结业临床实践能力考核标准方案',
        'stations': [
            {
                'name': '接诊病人站', 'duration': 20,
                'description': '口腔接诊病人：病史采集+口腔检查+医患沟通+病历书写',
                'projects': [
                    {'name': '病史采集', 'score': 30, 'description': '口腔病史采集'},
                    {'name': '体格检查', 'score': 20, 'description': '口腔专科检查'},
                    {'name': '人文沟通', 'score': 25, 'description': '口腔科医患沟通'},
                    {'name': '病历书写', 'score': 25, 'description': '口腔科病历书写'},
                ],
                'score_tables': [
                    {'name': '病史采集评分表（标准模板）', 'code': 'TPL-STD', 'items': ['病史采集']},
                    {'name': '人文沟通评分表', 'code': 'TPL-STD-6', 'items': ['人文沟通', '体格检查']},
                    {'name': '病历书写评分表', 'code': 'TPL-STD-3', 'items': ['病历书写']},
                ],
                'exam_type': '口试+操作',
            },
            {
                'name': '技能操作站', 'duration': 30,
                'description': '口腔病理科技能操作',
                'projects': [
                    {'name': '口腔病理科操作', 'score': 100, 'description': '口腔病理基本技能操作（切片制作、阅片等）'}
                ],
                'score_tables': [
                    {'name': '技能操作评分表', 'code': 'TPL-STD-4', 'items': ['口腔病理科操作']}
                ],
                'exam_type': '操作',
            },
        ],
    },
    '口腔颌面影像科': {
        'phase': '住院医师',
        'total_duration': '约50分钟（含技能操作站）',
        'source_doc': '3400口腔颌面影像科住院医师规范化培训结业临床实践能力考核标准方案',
        'stations': [
            {
                'name': '接诊病人站', 'duration': 20,
                'description': '口腔接诊病人：病史采集+口腔检查+医患沟通+病历书写',
                'projects': [
                    {'name': '病史采集', 'score': 30, 'description': '口腔病史采集'},
                    {'name': '体格检查', 'score': 20, 'description': '口腔专科检查'},
                    {'name': '人文沟通', 'score': 25, 'description': '口腔科医患沟通'},
                    {'name': '病历书写', 'score': 25, 'description': '口腔科病历书写'},
                ],
                'score_tables': [
                    {'name': '病史采集评分表（标准模板）', 'code': 'TPL-STD', 'items': ['病史采集']},
                    {'name': '人文沟通评分表', 'code': 'TPL-STD-6', 'items': ['人文沟通', '体格检查']},
                    {'name': '病历书写评分表', 'code': 'TPL-STD-3', 'items': ['病历书写']},
                ],
                'exam_type': '口试+操作',
            },
            {
                'name': '技能操作站', 'duration': 30,
                'description': '口腔颌面影像科技能操作',
                'projects': [
                    {'name': '口腔颌面影像科操作', 'score': 100, 'description': '口腔颌面影像基本技能操作（牙片、全景片拍摄等）'}
                ],
                'score_tables': [
                    {'name': '技能操作评分表', 'code': 'TPL-STD-4', 'items': ['口腔颌面影像科操作']}
                ],
                'exam_type': '操作',
            },
        ],
    },
    '重症医学科': {
        'phase': '住院医师',
        'total_duration': '约85分钟（含技能站和影像站）',
        'source_doc': '3700重症医学住院医师规范化培训结业考核实践技能考核标准（试行）',
        'stations': [
            {
                'name': '接诊病人站', 'duration': 15,
                'description': '重症患者急诊处理：病史采集+体格检查+初步诊断+人文沟通',
                'projects': [
                    {'name': '病史采集', 'score': 30, 'description': '重症患者病史采集'},
                    {'name': '体格检查', 'score': 25, 'description': '重症患者重点查体'},
                    {'name': '初步诊断', 'score': 25, 'description': '危重症初步诊断'},
                    {'name': '人文沟通', 'score': 20, 'description': '重症医患/家属沟通'},
                ],
                'score_tables': [
                    {'name': '病史采集评分表（标准模板）', 'code': 'TPL-STD', 'items': ['病史采集']},
                    {'name': '体格检查评分表', 'code': 'TPL-STD-2', 'items': ['体格检查']},
                    {'name': '人文沟通评分表', 'code': 'TPL-STD-6', 'items': ['人文沟通', '初步诊断']},
                ],
                'exam_type': '口试+SP',
            },
            {
                'name': '临床思维站', 'duration': 15,
                'description': '病例分析：根据临床病例进行诊断分析、鉴别诊断和治疗方案制定',
                'projects': [
                    {'name': '病例分析', 'score': 100, 'description': '阅读病例资料，进行诊断、鉴别诊断、辅助检查选择和诊疗计划制定'},
                ],
                'score_tables': [
                    {'name': '病例分析评分表', 'code': 'TPL-STD-7', 'items': ['病例分析']},
                ],
                'exam_type': '笔试',
            },
            {
                'name': '临床技能站', 'duration': 30,
                'description': '重症临床技能：深静脉穿刺+呼吸机使用+CRRT等',
                'projects': [
                    {'name': '深静脉穿刺', 'score': 30, 'description': '深静脉穿刺置管术'},
                    {'name': '呼吸机使用', 'score': 30, 'description': '呼吸机参数设置与操作'},
                    {'name': 'CRRT', 'score': 20, 'description': '连续性肾脏替代治疗操作'},
                    {'name': '血流动力学监测', 'score': 20, 'description': '有创血流动力学监测'}
                ],
                'score_tables': [
                    {'name': '技能操作评分表', 'code': 'TPL-STD-4', 'items': ['深静脉穿刺', '呼吸机使用', 'CRRT', '血流动力学监测']}
                ],
                'exam_type': '操作',
            },
            {
                'name': '影像学判读站', 'duration': 15,
                'description': '重症影像学判读：床旁胸片+CT+超声等判读',
                'projects': [
                    {'name': '影像学判读', 'score': 100, 'description': '重症患者床旁影像学判读（胸片、CT、超声等）'}
                ],
                'score_tables': [
                    {'name': '辅助检查判读评分表', 'code': 'TPL-STD-5', 'items': ['影像学判读']}
                ],
                'exam_type': '笔试',
            },
        ],
    },
}
# ===== 生成 MD 文件 =====

OUT_DIR = r"D:\klord的个人文件夹\02_work - 副本\00_我的工作区\02_资料\01_政策资料\02_住培结业实践技能考核\02_标准规范\【卫健委人才交流服务中心】住培结业实践技能考核_考核大纲"


def write_md(folder, filename, content):
    os.makedirs(folder, exist_ok=True)
    path = os.path.join(folder, filename)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)


def gen_overview(major, code, data):
    """生成综述 MD"""
    lines = []
    lines.append(f'# {major} — 住培结业临床实践能力考核标准方案')
    lines.append('')
    lines.append(f'> **培训阶段**: {data["phase"]}')
    lines.append(f'> **考核形式**: OSCE（客观结构化临床考核）')
    lines.append(f'> **总时长**: {data["total_duration"]}')
    lines.append(f'> **来源文件**: {data["source_doc"]}.pdf')
    lines.append('')

    lines.append('## 考站总览')
    lines.append('')
    lines.append('| 站次 | 考站名称 | 考核内容 | 考核方式 | 时长(分钟) | 分值占比 |')
    lines.append('|------|---------|---------|---------|-----------|---------|')
    total_dur = sum(s['duration'] for s in data['stations'])
    for i, st in enumerate(data['stations'], 1):
        proj_names = ' + '.join(p['name'] for p in st['projects'])
        lines.append(f'| 第{i}站 | {st["name"]} | {proj_names} | {st["exam_type"]} | {st["duration"]} | {100//len(data["stations"])}% |')
    lines.append('')

    lines.append('## 分值分布')
    lines.append('')
    lines.append('| 考核项目 | 满分 |')
    lines.append('|---------|------|')
    project_scores = {}
    for st in data['stations']:
        for p in st['projects']:
            if p['name'] not in project_scores:
                project_scores[p['name']] = 0
            project_scores[p['name']] += p['score']
    for name, score in sorted(project_scores.items(), key=lambda x: -x[1]):
        lines.append(f'| {name} | {score}分 |')
    lines.append('')

    if data.get('excluded'):
        lines.append('## 未纳入考核的考站')
        for exc in data['excluded']:
            lines.append(f'- {exc}')
        lines.append('')

    if data.get('sub_majors'):
        lines.append('## 适用专业方向')
        for sm in data['sub_majors']:
            lines.append(f'- {sm}')
        lines.append('')

    return '\n'.join(lines)


def gen_station(major, st, station_index, data):
    """生成单个考站 MD"""
    lines = []
    lines.append(f'# {major} — 第{station_index}站：{st["name"]}')
    lines.append('')
    lines.append(f'> **时长**: {st["duration"]}分钟')
    lines.append(f'> **考核方式**: {st["exam_type"]}')
    lines.append('')
    if st.get('description'):
        lines.append(f'## 考站概述')
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

    lines.append('## 评分表')
    lines.append('')
    for i, stb in enumerate(st['score_tables'], 1):
        lines.append(f'### {i}. {stb["name"]}')
        lines.append(f'- 编号：`{stb["code"]}`')
        lines.append(f'- 关联考核项目：{"、".join(stb["items"])}')
        lines.append('')

    lines.append('## 样题说明')
    lines.append('')
    major_name = data['source_doc'].split(major)[-1] if major in data['source_doc'] else ''
    lines.append(f'参见《{data["source_doc"]}》中本考站的样题示例。')
    lines.append('')
    lines.append('> 注：样题内容包含场景信息、考题要求和评分细则，详见原始PDF文件。')

    return '\n'.join(lines)


def main():
    count = 0
    for major, data in SPECIALTIES.items():
        code = MAJOR_CODES.get(major, '0000')
        folder_name = f'{code}_{major}'
        folder = os.path.join(OUT_DIR, folder_name)

        # 00_综述
        overview = gen_overview(major, code, data)
        write_md(folder, '00_综述.md', overview)
        count += 1

        # 各考站
        for i, st in enumerate(data['stations'], 1):
            fname = f'{i:02d}_{st["name"]}.md'
            content = gen_station(major, st, i, data)
            write_md(folder, fname, content)
            count += 1

    print(f'Generated {count} MD files in {len(SPECIALTIES)} folders')
    print(f'Output: {OUT_DIR}')


if __name__ == '__main__':
    main()
