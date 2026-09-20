/**
 * 演示用的训练记录（**mock**，4 条）
 * ================================
 * 为什么要有：本期无服务端，训练记录只落在浏览器 localStorage；换台机器 / 清缓存后
 * 记录页就是空的，没法演示「成绩报告」「筛选」「统计」。
 *
 * 这些记录**不是手编的**：前三条用**真实评分引擎**跑出来 ——
 *   resolveRubric(caseId) -> composeScore(模拟逐要点判定) -> result
 * 所以总分、维度分、缺失清单、逐要点点评与真实评分完全同构。
 * 第四条是 status: 'failed'（只有 error、没有 result），用来演示失败态。
 *
 * 四条覆盖：高分 / 中等 / 低分 / 评分失败；三个不同病例（胸部CT、颅脑MR、膝关节MR）；
 * 一个提交过两次的病例（round 2）；四个不同日期。
 * 学员报告有意写得参差不齐（高分那条接近完整，低分那条只有一句话）。
 *
 * 生成脚本见提交说明；改了评分表想重新生成，重跑同一个脚本即可。
 */

export const MOCK_PRACTICE_RECORDS = [
  {
    "id": "MOCK-DEMO-1",
    "mock": true,
    "caseId": "PUB-001",
    "title": "胸部CT 病例 23",
    "bodyPart": "胸部",
    "modality": "CT",
    "level": "U2",
    "round": 2,
    "submittedAt": "2026-09-20 10:18",
    "status": "done",
    "score": 75.5,
    "scoreableMax": 84,
    "draft": {
      "purpose": "胸部CT平扫+增强。临床发现右肺结节，请评估结节性质并回答有无纵隔淋巴结肿大。",
      "findings": "右肺上叶尖段见一磨玻璃及部分实性结节，最大横断面约 1.5cm×1.2cm，边界尚清，边缘见分叶，其内见实性成分。双肺另见散在微小结节。纵隔及肺门未见肿大淋巴结。双侧胸腔未见积液。",
      "impression": "1. 右肺上叶尖段部分实性结节，考虑早期肺腺癌可能，建议结合临床及随访。2. 双肺散在微小结节，建议随访。3. 纵隔及肺门未见肿大淋巴结，双侧胸腔未见积液。"
    },
    "result": {
      "items": [
        {
          "code": "GEN-01",
          "name": "患者信息（姓名、年龄、性别、科别）",
          "dim": "一、一般信息及报告及时性",
          "full": 2,
          "scoreableFull": 0,
          "got": 0,
          "points": [],
          "missing": [],
          "nAPoints": [
            {
              "text": "按脱敏形态写出患者姓名（患*）",
              "why": "患者临床信息由系统直接给出，学员不书写，本条不评",
              "source": "na"
            },
            {
              "text": "年龄写成年龄段（60–69 岁）",
              "why": "患者临床信息由系统直接给出，学员不书写，本条不评",
              "source": "na"
            },
            {
              "text": "写出性别（女）与科别（呼吸内科）",
              "why": "患者临床信息由系统直接给出，学员不书写，本条不评",
              "source": "na"
            }
          ]
        },
        {
          "code": "GEN-02",
          "name": "住院/门诊号、检查号、就诊卡号、影像号正确",
          "dim": "一、一般信息及报告及时性",
          "full": 1,
          "scoreableFull": 0,
          "got": 0,
          "points": [],
          "missing": [],
          "nAPoints": [
            {
              "text": "各类号码按脱敏形态书写（本模块不评）",
              "why": "各类号码字段已从样本中去除，本模块不适用",
              "source": "na"
            }
          ]
        },
        {
          "code": "GEN-03",
          "name": "检查时间正确，按规定时间完成报告",
          "dim": "一、一般信息及报告及时性",
          "full": 1,
          "scoreableFull": 0,
          "got": 0,
          "points": [],
          "missing": [],
          "nAPoints": [
            {
              "text": "写明检查时间（2026-08-12 09:20）",
              "why": "患者临床信息由系统直接给出，学员不书写，本条不评",
              "source": "na"
            }
          ]
        },
        {
          "code": "GEN-04",
          "name": "临床主要信息及检查目的",
          "dim": "一、一般信息及报告及时性",
          "full": 10,
          "scoreableFull": 10,
          "got": 10,
          "points": [
            {
              "id": "p1",
              "score": 1,
              "comment": "",
              "text": "规范转述临床目的与检查方法（胸部CT平扫）",
              "scoreWeight": 5,
              "commentBlocked": false
            },
            {
              "id": "p2",
              "score": 1,
              "comment": "",
              "text": "写出检查目的（申请单想知道什么）",
              "scoreWeight": 5,
              "commentBlocked": false
            }
          ],
          "missing": [],
          "nAPoints": []
        },
        {
          "code": "TECH-01",
          "name": "检查部位准确",
          "dim": "二、检查技术",
          "full": 3,
          "scoreableFull": 3,
          "got": 3,
          "points": [
            {
              "id": "p1",
              "score": 1,
              "comment": "",
              "text": "写明检查部位为胸部",
              "scoreWeight": 3,
              "commentBlocked": false
            }
          ],
          "missing": [],
          "nAPoints": []
        },
        {
          "code": "TECH-02",
          "name": "检查类型准确",
          "dim": "二、检查技术",
          "full": 3,
          "scoreableFull": 3,
          "got": 3,
          "points": [
            {
              "id": "p1",
              "score": 1,
              "comment": "",
              "text": "写明检查类型（CT 及平扫/增强）",
              "scoreWeight": 3,
              "commentBlocked": false
            }
          ],
          "missing": [],
          "nAPoints": []
        },
        {
          "code": "TECH-03",
          "name": "检查技术填写规范",
          "dim": "二、检查技术",
          "full": 3,
          "scoreableFull": 3,
          "got": 1.5,
          "points": [
            {
              "id": "p1",
              "score": 0.5,
              "comment": "提到了但不够完整，常规描述里应该再补一层。",
              "text": "检查技术描述规范（扫描方式、是否增强等）",
              "scoreWeight": 3,
              "commentBlocked": false
            }
          ],
          "missing": [],
          "nAPoints": []
        },
        {
          "code": "FIND-01",
          "name": "描述全面，条理清楚",
          "dim": "三、影像描述",
          "full": 10,
          "scoreableFull": 10,
          "got": 10,
          "points": [
            {
              "id": "p1",
              "score": 1,
              "comment": "",
              "text": "按‘检查技术→影像所见→诊断意见’三级结构组织报告",
              "scoreWeight": 3,
              "commentBlocked": false
            },
            {
              "id": "p2",
              "score": 1,
              "comment": "",
              "text": "影像所见部分采用总—分结构：先总述病灶存在，再分述部位、大小、形态、密度、邻近结构及重要阴性征象",
              "scoreWeight": 3,
              "commentBlocked": false
            },
            {
              "id": "p3",
              "score": 1,
              "comment": "",
              "text": "无冗余描述（如未提及支气管充气征、血管集束等本例不存在且未要求评估的征象）",
              "scoreWeight": 4,
              "commentBlocked": false
            }
          ],
          "missing": [],
          "nAPoints": []
        },
        {
          "code": "FIND-02",
          "name": "描述疾病或器官顺序适当",
          "dim": "三、影像描述",
          "full": 4,
          "scoreableFull": 4,
          "got": 3,
          "points": [
            {
              "id": "p1",
              "score": 1,
              "comment": "",
              "text": "先描述病灶本身（部位→大小→形态→密度→边界→特殊征象），再描述相关解剖结构（肺门、纵隔、胸腔、余肺野）",
              "scoreWeight": 2,
              "commentBlocked": false
            },
            {
              "id": "p2",
              "score": 0.5,
              "comment": "这一类写得比较笼统，建议把部位、范围、密度分开说清楚。",
              "text": "病灶描述顺序符合‘由主到次、由内到外、由实到虚’临床阅片逻辑：先结节，后淋巴结，再胸腔积液，最后余肺野",
              "scoreWeight": 2,
              "commentBlocked": false
            }
          ],
          "missing": [],
          "nAPoints": []
        },
        {
          "code": "FIND-03",
          "name": "病灶部位及累及范围描述准确",
          "dim": "三、影像描述",
          "full": 4,
          "scoreableFull": 4,
          "got": 4,
          "points": [
            {
              "id": "p1",
              "score": 1,
              "comment": "",
              "text": "明确写出病灶位于右肺上叶外周部",
              "scoreWeight": 2,
              "commentBlocked": false
            },
            {
              "id": "p2",
              "score": 1,
              "comment": "",
              "text": "明确指出病灶邻近胸膜",
              "scoreWeight": 2,
              "commentBlocked": false
            }
          ],
          "missing": [],
          "nAPoints": []
        },
        {
          "code": "FIND-04",
          "name": "病灶数目、大小准确测量并规范描述",
          "dim": "三、影像描述",
          "full": 4,
          "scoreableFull": 0,
          "got": 0,
          "points": [],
          "missing": [],
          "nAPoints": [
            {
              "text": "给出最大横断面二维尺寸（15 mm × 13 mm）",
              "why": "影像控件不提供测量工具，只能目测，不要求实测值",
              "source": "capability"
            },
            {
              "text": "给出上下径（12 mm）或注明‘约4个层面，层厚3 mm’以支持上下径推算合理性",
              "why": "影像控件不提供测量工具，只能目测，不要求实测值",
              "source": "capability"
            }
          ]
        },
        {
          "code": "FIND-05",
          "name": "病灶形态、边界及特殊征象描述准确",
          "dim": "三、影像描述",
          "full": 4,
          "scoreableFull": 4,
          "got": 4,
          "points": [
            {
              "id": "p1",
              "score": 1,
              "comment": "",
              "text": "描述为‘类圆形’",
              "scoreWeight": 2,
              "commentBlocked": false
            },
            {
              "id": "p2",
              "score": 1,
              "comment": "",
              "text": "描述边缘‘较光整’，且明确否定‘毛刺’和‘胸膜牵拉’",
              "scoreWeight": 2,
              "commentBlocked": false
            }
          ],
          "missing": [],
          "nAPoints": []
        },
        {
          "code": "FIND-06",
          "name": "病灶密度/信号/强化程度准确分度",
          "dim": "三、影像描述",
          "full": 4,
          "scoreableFull": 4,
          "got": 3,
          "points": [
            {
              "id": "p1",
              "score": 0.5,
              "comment": "提到了但不够完整，常规描述里应该再补一层。",
              "text": "描述为‘软组织密度’",
              "scoreWeight": 2,
              "commentBlocked": false
            },
            {
              "id": "p2",
              "score": 1,
              "comment": "",
              "text": "明确否定钙化与空洞",
              "scoreWeight": 2,
              "commentBlocked": false
            }
          ],
          "missing": [],
          "nAPoints": []
        },
        {
          "code": "FIND-07",
          "name": "重要阴性征象描述",
          "dim": "三、影像描述",
          "full": 4,
          "scoreableFull": 4,
          "got": 4,
          "points": [
            {
              "id": "p1",
              "score": 1,
              "comment": "",
              "text": "明确描述‘双肺门及纵隔未见明确肿大淋巴结’",
              "scoreWeight": 2,
              "commentBlocked": false
            },
            {
              "id": "p2",
              "score": 1,
              "comment": "",
              "text": "明确描述‘双侧胸腔未见积液’",
              "scoreWeight": 2,
              "commentBlocked": false
            }
          ],
          "missing": [],
          "nAPoints": []
        },
        {
          "code": "IMP-01",
          "name": "回答临床问题",
          "dim": "四、影像诊断",
          "full": 10,
          "scoreableFull": 10,
          "got": 10,
          "points": [
            {
              "id": "p1",
              "score": 1,
              "comment": "",
              "text": "回应临床问题‘体检发现右肺结节’，在诊断意见中直接点明‘右肺上叶外周实性结节’",
              "scoreWeight": 10,
              "commentBlocked": false
            }
          ],
          "missing": [],
          "nAPoints": []
        },
        {
          "code": "IMP-02",
          "name": "定位诊断准确",
          "dim": "四、影像诊断",
          "full": 4,
          "scoreableFull": 4,
          "got": 2,
          "points": [
            {
              "id": "p1",
              "score": 0.5,
              "comment": "这一类写得比较笼统，建议把部位、范围、密度分开说清楚。",
              "text": "定位表述包含‘右肺上叶’+‘外周部’+‘邻近胸膜’三层信息",
              "scoreWeight": 4,
              "commentBlocked": false
            }
          ],
          "missing": [],
          "nAPoints": []
        },
        {
          "code": "IMP-03",
          "name": "典型病变明确诊断",
          "dim": "四、影像诊断",
          "full": 4,
          "scoreableFull": 4,
          "got": 4,
          "points": [
            {
              "id": "p1",
              "score": 1,
              "comment": "",
              "text": "未将结节直接诊断为恶性肿瘤（如未写‘肺癌’‘腺癌’‘恶性结节’）",
              "scoreWeight": 2,
              "commentBlocked": false
            },
            {
              "id": "p2",
              "score": 1,
              "comment": "",
              "text": "未将结节直接诊断为特定良性病（如未写‘结核球’‘错构瘤’‘炎性假瘤’）",
              "scoreWeight": 2,
              "commentBlocked": false
            }
          ],
          "missing": [],
          "nAPoints": []
        },
        {
          "code": "IMP-04",
          "name": "不典型病变给出的可能诊断符合规范",
          "dim": "四、影像诊断",
          "full": 4,
          "scoreableFull": 4,
          "got": 4,
          "points": [
            {
              "id": "p1",
              "score": 1,
              "comment": "",
              "text": "明确写出‘良性结节与早期肺恶性病变均有可能’",
              "scoreWeight": 2,
              "commentBlocked": false
            },
            {
              "id": "p2",
              "score": 1,
              "comment": "",
              "text": "给出定性依据：‘结节边界较光整、密度均匀、无毛刺及胸膜牵拉’",
              "scoreWeight": 2,
              "commentBlocked": false
            }
          ],
          "missing": [],
          "nAPoints": []
        },
        {
          "code": "IMP-05",
          "name": "肿瘤分期正确",
          "dim": "四、影像诊断",
          "full": 4,
          "scoreableFull": 0,
          "got": 0,
          "points": [],
          "missing": [],
          "nAPoints": [
            {
              "text": "未进行TNM分期或临床分期（如未出现‘T1a’‘IA期’‘cT1aN0M0’等表述）"
            }
          ]
        },
        {
          "code": "IMP-06",
          "name": "疾病诊断遵循规范或指南",
          "dim": "四、影像诊断",
          "full": 4,
          "scoreableFull": 4,
          "got": 2,
          "points": [
            {
              "id": "p1",
              "score": 0.5,
              "comment": "提到了但不够完整，常规描述里应该再补一层。",
              "text": "建议‘3个月后复查胸部CT薄层重建’",
              "scoreWeight": 4,
              "commentBlocked": false
            }
          ],
          "missing": [],
          "nAPoints": []
        },
        {
          "code": "IMP-07",
          "name": "给临床的建议明确",
          "dim": "四、影像诊断",
          "full": 4,
          "scoreableFull": 4,
          "got": 4,
          "points": [
            {
              "id": "p1",
              "score": 1,
              "comment": "",
              "text": "建议‘调阅既往影像对比’",
              "scoreWeight": 2,
              "commentBlocked": false
            },
            {
              "id": "p2",
              "score": 1,
              "comment": "",
              "text": "建议‘若增大或出现恶性征象，行PET-CT或穿刺活检’",
              "scoreWeight": 2,
              "commentBlocked": false
            }
          ],
          "missing": [],
          "nAPoints": []
        },
        {
          "code": "IMP-08",
          "name": "与以前检查比较符合规范、准确",
          "dim": "四、影像诊断",
          "full": 4,
          "scoreableFull": 0,
          "got": 0,
          "points": [],
          "missing": [],
          "nAPoints": [
            {
              "text": "未对病灶变化趋势做出任何判断（如未出现‘较前增大’‘大小稳定’‘已缩小’等表述）",
              "why": "本样本未提供既往检查影像，无法与以前检查比较",
              "source": "capability"
            },
            {
              "text": "仅建议‘调阅既往影像对比’，未越界给出结论",
              "why": "本样本未提供既往检查影像，无法与以前检查比较",
              "source": "capability"
            }
          ]
        },
        {
          "code": "LANG-01",
          "name": "无错别字，数据单位及标点符号使用正确",
          "dim": "五、文字描述",
          "full": 5,
          "scoreableFull": 5,
          "got": 4,
          "points": [
            {
              "id": "p1",
              "score": 1,
              "comment": "",
              "text": "全文无错别字",
              "scoreWeight": 1.5,
              "commentBlocked": false
            },
            {
              "id": "p2",
              "score": 1,
              "comment": "",
              "text": "计量单位（mm / cm / 岁 等）使用正确",
              "scoreWeight": 1.5,
              "commentBlocked": false
            },
            {
              "id": "p3",
              "score": 0.5,
              "comment": "这一类写得比较笼统，建议把部位、范围、密度分开说清楚。",
              "text": "标点符号使用规范（无中英夹杂、无连续顿号等）",
              "scoreWeight": 2,
              "commentBlocked": false
            }
          ],
          "missing": [],
          "nAPoints": []
        }
      ],
      "dims": [
        {
          "dim": "一、一般信息及报告及时性",
          "got": 10,
          "full": 10
        },
        {
          "dim": "二、检查技术",
          "got": 7.5,
          "full": 9
        },
        {
          "dim": "三、影像描述",
          "got": 28,
          "full": 30
        },
        {
          "dim": "四、影像诊断",
          "got": 26,
          "full": 30
        },
        {
          "dim": "五、文字描述",
          "got": 4,
          "full": 5
        }
      ],
      "rawTotal": 75.5,
      "scoreableMax": 84,
      "missingItems": [],
      "unassessableItems": [
        {
          "code": "GEN-01",
          "name": "患者信息（姓名、年龄、性别、科别）",
          "full": 2,
          "scoreableFull": 0,
          "lost": 2,
          "source": "na",
          "why": "患者临床信息由系统直接给出，学员不书写，本条不评",
          "points": [
            {
              "text": "按脱敏形态写出患者姓名（患*）",
              "why": "患者临床信息由系统直接给出，学员不书写，本条不评",
              "source": "na"
            },
            {
              "text": "年龄写成年龄段（60–69 岁）",
              "why": "患者临床信息由系统直接给出，学员不书写，本条不评",
              "source": "na"
            },
            {
              "text": "写出性别（女）与科别（呼吸内科）",
              "why": "患者临床信息由系统直接给出，学员不书写，本条不评",
              "source": "na"
            }
          ]
        },
        {
          "code": "GEN-02",
          "name": "住院/门诊号、检查号、就诊卡号、影像号正确",
          "full": 1,
          "scoreableFull": 0,
          "lost": 1,
          "source": "na",
          "why": "各类号码字段已从样本中去除，本模块不适用",
          "points": [
            {
              "text": "各类号码按脱敏形态书写（本模块不评）",
              "why": "各类号码字段已从样本中去除，本模块不适用",
              "source": "na"
            }
          ]
        },
        {
          "code": "GEN-03",
          "name": "检查时间正确，按规定时间完成报告",
          "full": 1,
          "scoreableFull": 0,
          "lost": 1,
          "source": "na",
          "why": "患者临床信息由系统直接给出，学员不书写，本条不评",
          "points": [
            {
              "text": "写明检查时间（2026-08-12 09:20）",
              "why": "患者临床信息由系统直接给出，学员不书写，本条不评",
              "source": "na"
            }
          ]
        },
        {
          "code": "FIND-04",
          "name": "病灶数目、大小准确测量并规范描述",
          "full": 4,
          "scoreableFull": 0,
          "lost": 4,
          "source": "capability",
          "why": "影像控件不提供测量工具，只能目测，不要求实测值",
          "points": [
            {
              "text": "给出最大横断面二维尺寸（15 mm × 13 mm）",
              "why": "影像控件不提供测量工具，只能目测，不要求实测值",
              "source": "capability"
            },
            {
              "text": "给出上下径（12 mm）或注明‘约4个层面，层厚3 mm’以支持上下径推算合理性",
              "why": "影像控件不提供测量工具，只能目测，不要求实测值",
              "source": "capability"
            }
          ]
        },
        {
          "code": "IMP-05",
          "name": "肿瘤分期正确",
          "full": 4,
          "scoreableFull": 0,
          "lost": 4,
          "source": "na",
          "points": [
            {
              "text": "未进行TNM分期或临床分期（如未出现‘T1a’‘IA期’‘cT1aN0M0’等表述）"
            }
          ]
        },
        {
          "code": "IMP-08",
          "name": "与以前检查比较符合规范、准确",
          "full": 4,
          "scoreableFull": 0,
          "lost": 4,
          "source": "capability",
          "why": "本样本未提供既往检查影像，无法与以前检查比较",
          "points": [
            {
              "text": "未对病灶变化趋势做出任何判断（如未出现‘较前增大’‘大小稳定’‘已缩小’等表述）",
              "why": "本样本未提供既往检查影像，无法与以前检查比较",
              "source": "capability"
            },
            {
              "text": "仅建议‘调阅既往影像对比’，未越界给出结论",
              "why": "本样本未提供既往检查影像，无法与以前检查比较",
              "source": "capability"
            }
          ]
        }
      ]
    }
  },
  {
    "id": "MOCK-DEMO-2",
    "mock": true,
    "caseId": "SEU-001",
    "title": "胸部CT 病例 10",
    "bodyPart": "胸部",
    "modality": "CT",
    "level": "U2",
    "round": 1,
    "submittedAt": "2026-09-19 16:42",
    "status": "done",
    "score": 65,
    "scoreableMax": 88,
    "draft": {
      "purpose": "胸部CT平扫。临床考虑右肺病变，请协助明确性质。",
      "findings": "右肺下叶后基底段见团块状软组织密度影，边界尚清，大小约 4.0cm×3.2cm，其内密度不均。双肺纹理增多。纵隔居中。",
      "impression": "右肺下叶占位，考虑肺隔离症可能，建议增强扫描进一步明确。"
    },
    "result": {
      "items": [
        {
          "code": "GEN-01",
          "name": "患者信息（姓名、年龄、性别、科别）",
          "dim": "一、一般信息及报告及时性",
          "full": 2,
          "scoreableFull": 0,
          "got": 0,
          "points": [],
          "missing": [],
          "nAPoints": [
            {
              "text": "按脱敏形态写出患者姓名（患*）",
              "why": "患者临床信息由系统直接给出，学员不书写，本条不评",
              "source": "na"
            },
            {
              "text": "年龄写成年龄段（30–39 岁）",
              "why": "患者临床信息由系统直接给出，学员不书写，本条不评",
              "source": "na"
            },
            {
              "text": "写出性别（女）与科别（呼吸内科）",
              "why": "患者临床信息由系统直接给出，学员不书写，本条不评",
              "source": "na"
            }
          ]
        },
        {
          "code": "GEN-02",
          "name": "住院/门诊号、检查号、就诊卡号、影像号正确",
          "dim": "一、一般信息及报告及时性",
          "full": 1,
          "scoreableFull": 0,
          "got": 0,
          "points": [],
          "missing": [],
          "nAPoints": [
            {
              "text": "各类号码按脱敏形态书写（本模块不评）",
              "why": "各类号码字段已从样本中去除，本模块不适用",
              "source": "na"
            }
          ]
        },
        {
          "code": "GEN-03",
          "name": "检查时间正确，按规定时间完成报告",
          "dim": "一、一般信息及报告及时性",
          "full": 1,
          "scoreableFull": 0,
          "got": 0,
          "points": [],
          "missing": [],
          "nAPoints": [
            {
              "text": "写明检查时间（2026-03-15 09:30）",
              "why": "患者临床信息由系统直接给出，学员不书写，本条不评",
              "source": "na"
            }
          ]
        },
        {
          "code": "GEN-04",
          "name": "临床主要信息及检查目的",
          "dim": "一、一般信息及报告及时性",
          "full": 10,
          "scoreableFull": 10,
          "got": 7.5,
          "points": [
            {
              "id": "p1",
              "score": 0.5,
              "comment": "提到了但不够完整，常规描述里应该再补一层。",
              "text": "规范转述临床目的与检查方法（胸部CT平扫+增强）",
              "scoreWeight": 5,
              "commentBlocked": false
            },
            {
              "id": "p2",
              "score": 1,
              "comment": "",
              "text": "写出检查目的（申请单想知道什么）",
              "scoreWeight": 5,
              "commentBlocked": false
            }
          ],
          "missing": [],
          "nAPoints": []
        },
        {
          "code": "TECH-01",
          "name": "检查部位准确",
          "dim": "二、检查技术",
          "full": 3,
          "scoreableFull": 3,
          "got": 0,
          "points": [
            {
              "id": "p1",
              "score": 0,
              "comment": "这一类没写到，建议对照报告模板逐项自查。",
              "text": "写明检查部位为胸部",
              "scoreWeight": 3,
              "commentBlocked": false
            }
          ],
          "missing": [
            {
              "text": "写明检查部位为胸部",
              "comment": "这一类没写到，建议对照报告模板逐项自查。"
            }
          ],
          "nAPoints": []
        },
        {
          "code": "TECH-02",
          "name": "检查类型准确",
          "dim": "二、检查技术",
          "full": 3,
          "scoreableFull": 3,
          "got": 3,
          "points": [
            {
              "id": "p1",
              "score": 1,
              "comment": "",
              "text": "写明检查类型（CT 及平扫/增强）",
              "scoreWeight": 3,
              "commentBlocked": false
            }
          ],
          "missing": [],
          "nAPoints": []
        },
        {
          "code": "TECH-03",
          "name": "检查技术填写规范",
          "dim": "二、检查技术",
          "full": 3,
          "scoreableFull": 3,
          "got": 1.5,
          "points": [
            {
              "id": "p1",
              "score": 0.5,
              "comment": "提到了但不够完整，常规描述里应该再补一层。",
              "text": "检查技术描述规范（扫描方式、是否增强等）",
              "scoreWeight": 3,
              "commentBlocked": false
            }
          ],
          "missing": [],
          "nAPoints": []
        },
        {
          "code": "FIND-01",
          "name": "描述全面，条理清楚",
          "dim": "三、影像描述",
          "full": 10,
          "scoreableFull": 10,
          "got": 10,
          "points": [
            {
              "id": "p1",
              "score": 1,
              "comment": "",
              "text": "明确指出病变位于右肺下叶后底段",
              "scoreWeight": 10,
              "commentBlocked": false
            }
          ],
          "missing": [],
          "nAPoints": []
        },
        {
          "code": "FIND-02",
          "name": "描述疾病或器官顺序适当",
          "dim": "三、影像描述",
          "full": 4,
          "scoreableFull": 4,
          "got": 4,
          "points": [
            {
              "id": "p1",
              "score": 1,
              "comment": "",
              "text": "描述病变为团块状阴影",
              "scoreWeight": 4,
              "commentBlocked": false
            }
          ],
          "missing": [],
          "nAPoints": []
        },
        {
          "code": "FIND-03",
          "name": "病灶部位及累及范围描述准确",
          "dim": "三、影像描述",
          "full": 4,
          "scoreableFull": 4,
          "got": 4,
          "points": [
            {
              "id": "p1",
              "score": 1,
              "comment": "",
              "text": "指出病灶边界较清晰",
              "scoreWeight": 4,
              "commentBlocked": false
            }
          ],
          "missing": [],
          "nAPoints": []
        },
        {
          "code": "FIND-04",
          "name": "病灶数目、大小准确测量并规范描述",
          "dim": "三、影像描述",
          "full": 4,
          "scoreableFull": 4,
          "got": 2,
          "points": [
            {
              "id": "p1",
              "score": 0.5,
              "comment": "提到了但不够完整，常规描述里应该再补一层。",
              "text": "描述病灶长轴指向内后方",
              "scoreWeight": 4,
              "commentBlocked": false
            }
          ],
          "missing": [],
          "nAPoints": []
        },
        {
          "code": "FIND-05",
          "name": "病灶形态、边界及特殊征象描述准确",
          "dim": "三、影像描述",
          "full": 4,
          "scoreableFull": 4,
          "got": 0,
          "points": [
            {
              "id": "p1",
              "score": 0,
              "comment": "这一类漏了，属于常规描述里应该有的内容。",
              "text": "提及CT增强可见体循环供血动脉",
              "scoreWeight": 4,
              "commentBlocked": false
            }
          ],
          "missing": [
            {
              "text": "提及CT增强可见体循环供血动脉",
              "comment": "这一类漏了，属于常规描述里应该有的内容。"
            }
          ],
          "nAPoints": []
        },
        {
          "code": "FIND-06",
          "name": "病灶密度/信号/强化程度准确分度",
          "dim": "三、影像描述",
          "full": 4,
          "scoreableFull": 4,
          "got": 4,
          "points": [
            {
              "id": "p1",
              "score": 1,
              "comment": "",
              "text": "提及病灶紧贴膈面",
              "scoreWeight": 4,
              "commentBlocked": false
            }
          ],
          "missing": [],
          "nAPoints": []
        },
        {
          "code": "FIND-07",
          "name": "重要阴性征象描述",
          "dim": "三、影像描述",
          "full": 4,
          "scoreableFull": 4,
          "got": 4,
          "points": [
            {
              "id": "p1",
              "score": 1,
              "comment": "",
              "text": "报告中包含重要阴性征象（如无坏死、空洞、钙化、支气管充气征、淋巴结肿大等）",
              "scoreWeight": 4,
              "commentBlocked": false
            }
          ],
          "missing": [],
          "nAPoints": []
        },
        {
          "code": "IMP-01",
          "name": "回答临床问题",
          "dim": "四、影像诊断",
          "full": 10,
          "scoreableFull": 10,
          "got": 5,
          "points": [
            {
              "id": "p1",
              "score": 0.5,
              "comment": "提到了但不够完整，常规描述里应该再补一层。",
              "text": "诊断意见中明确定位：右肺下叶后底段",
              "scoreWeight": 10,
              "commentBlocked": false
            }
          ],
          "missing": [],
          "nAPoints": []
        },
        {
          "code": "IMP-02",
          "name": "定位诊断准确",
          "dim": "四、影像诊断",
          "full": 4,
          "scoreableFull": 4,
          "got": 4,
          "points": [
            {
              "id": "p1",
              "score": 1,
              "comment": "",
              "text": "诊断意见中明确写出‘肺隔离症’诊断",
              "scoreWeight": 4,
              "commentBlocked": false
            }
          ],
          "missing": [],
          "nAPoints": []
        },
        {
          "code": "IMP-03",
          "name": "典型病变明确诊断",
          "dim": "四、影像诊断",
          "full": 4,
          "scoreableFull": 4,
          "got": 4,
          "points": [
            {
              "id": "p1",
              "score": 1,
              "comment": "",
              "text": "指出其为先天性肺发育异常（或类似本质表述）",
              "scoreWeight": 4,
              "commentBlocked": false
            }
          ],
          "missing": [],
          "nAPoints": []
        },
        {
          "code": "IMP-04",
          "name": "不典型病变给出的可能诊断符合规范",
          "dim": "四、影像诊断",
          "full": 4,
          "scoreableFull": 4,
          "got": 4,
          "points": [
            {
              "id": "p1",
              "score": 1,
              "comment": "",
              "text": "列出至少1项支持诊断的关键影像依据（部位/形态/供血动脉）",
              "scoreWeight": 4,
              "commentBlocked": false
            }
          ],
          "missing": [],
          "nAPoints": []
        },
        {
          "code": "IMP-05",
          "name": "肿瘤分期正确",
          "dim": "四、影像诊断",
          "full": 4,
          "scoreableFull": 0,
          "got": 0,
          "points": [],
          "missing": [],
          "nAPoints": [
            {
              "text": "提及分型信息（如叶内型/叶外型）或说明‘分两型’"
            }
          ]
        },
        {
          "code": "IMP-06",
          "name": "疾病诊断遵循规范或指南",
          "dim": "四、影像诊断",
          "full": 4,
          "scoreableFull": 4,
          "got": 0,
          "points": [
            {
              "id": "p1",
              "score": 0,
              "comment": "这一类没写到，建议对照报告模板逐项自查。",
              "text": "指出绝大多数血供来自主动脉",
              "scoreWeight": 4,
              "commentBlocked": false
            }
          ],
          "missing": [
            {
              "text": "指出绝大多数血供来自主动脉",
              "comment": "这一类没写到，建议对照报告模板逐项自查。"
            }
          ],
          "nAPoints": []
        },
        {
          "code": "IMP-07",
          "name": "给临床的建议明确",
          "dim": "四、影像诊断",
          "full": 4,
          "scoreableFull": 4,
          "got": 4,
          "points": [
            {
              "id": "p1",
              "score": 1,
              "comment": "",
              "text": "提出进一步检查建议：主动脉造影",
              "scoreWeight": 4,
              "commentBlocked": false
            }
          ],
          "missing": [],
          "nAPoints": []
        },
        {
          "code": "IMP-08",
          "name": "与以前检查比较符合规范、准确",
          "dim": "四、影像诊断",
          "full": 4,
          "scoreableFull": 0,
          "got": 0,
          "points": [],
          "missing": [],
          "nAPoints": [
            {
              "text": "建议内容与题目附带要点一致（即针对确诊目的）",
              "why": "本样本未提供既往检查影像，无法与以前检查比较",
              "source": "capability"
            }
          ]
        },
        {
          "code": "LANG-01",
          "name": "无错别字，数据单位及标点符号使用正确",
          "dim": "五、文字描述",
          "full": 5,
          "scoreableFull": 5,
          "got": 4,
          "points": [
            {
              "id": "p1",
              "score": 1,
              "comment": "",
              "text": "全文无错别字",
              "scoreWeight": 1.5,
              "commentBlocked": false
            },
            {
              "id": "p2",
              "score": 1,
              "comment": "",
              "text": "计量单位（mm / cm / 岁 等）使用正确",
              "scoreWeight": 1.5,
              "commentBlocked": false
            },
            {
              "id": "p3",
              "score": 0.5,
              "comment": "提到了但不够完整，常规描述里应该再补一层。",
              "text": "标点符号使用规范（无中英夹杂、无连续顿号等）",
              "scoreWeight": 2,
              "commentBlocked": false
            }
          ],
          "missing": [],
          "nAPoints": []
        }
      ],
      "dims": [
        {
          "dim": "一、一般信息及报告及时性",
          "got": 7.5,
          "full": 10
        },
        {
          "dim": "二、检查技术",
          "got": 4.5,
          "full": 9
        },
        {
          "dim": "三、影像描述",
          "got": 28,
          "full": 34
        },
        {
          "dim": "四、影像诊断",
          "got": 21,
          "full": 30
        },
        {
          "dim": "五、文字描述",
          "got": 4,
          "full": 5
        }
      ],
      "rawTotal": 65,
      "scoreableMax": 88,
      "missingItems": [
        {
          "code": "TECH-01",
          "name": "检查部位准确",
          "dim": "二、检查技术",
          "full": 3,
          "missing": [
            {
              "text": "写明检查部位为胸部",
              "comment": "这一类没写到，建议对照报告模板逐项自查。"
            }
          ]
        },
        {
          "code": "FIND-05",
          "name": "病灶形态、边界及特殊征象描述准确",
          "dim": "三、影像描述",
          "full": 4,
          "missing": [
            {
              "text": "提及CT增强可见体循环供血动脉",
              "comment": "这一类漏了，属于常规描述里应该有的内容。"
            }
          ]
        },
        {
          "code": "IMP-06",
          "name": "疾病诊断遵循规范或指南",
          "dim": "四、影像诊断",
          "full": 4,
          "missing": [
            {
              "text": "指出绝大多数血供来自主动脉",
              "comment": "这一类没写到，建议对照报告模板逐项自查。"
            }
          ]
        }
      ],
      "unassessableItems": [
        {
          "code": "GEN-01",
          "name": "患者信息（姓名、年龄、性别、科别）",
          "full": 2,
          "scoreableFull": 0,
          "lost": 2,
          "source": "na",
          "why": "患者临床信息由系统直接给出，学员不书写，本条不评",
          "points": [
            {
              "text": "按脱敏形态写出患者姓名（患*）",
              "why": "患者临床信息由系统直接给出，学员不书写，本条不评",
              "source": "na"
            },
            {
              "text": "年龄写成年龄段（30–39 岁）",
              "why": "患者临床信息由系统直接给出，学员不书写，本条不评",
              "source": "na"
            },
            {
              "text": "写出性别（女）与科别（呼吸内科）",
              "why": "患者临床信息由系统直接给出，学员不书写，本条不评",
              "source": "na"
            }
          ]
        },
        {
          "code": "GEN-02",
          "name": "住院/门诊号、检查号、就诊卡号、影像号正确",
          "full": 1,
          "scoreableFull": 0,
          "lost": 1,
          "source": "na",
          "why": "各类号码字段已从样本中去除，本模块不适用",
          "points": [
            {
              "text": "各类号码按脱敏形态书写（本模块不评）",
              "why": "各类号码字段已从样本中去除，本模块不适用",
              "source": "na"
            }
          ]
        },
        {
          "code": "GEN-03",
          "name": "检查时间正确，按规定时间完成报告",
          "full": 1,
          "scoreableFull": 0,
          "lost": 1,
          "source": "na",
          "why": "患者临床信息由系统直接给出，学员不书写，本条不评",
          "points": [
            {
              "text": "写明检查时间（2026-03-15 09:30）",
              "why": "患者临床信息由系统直接给出，学员不书写，本条不评",
              "source": "na"
            }
          ]
        },
        {
          "code": "IMP-05",
          "name": "肿瘤分期正确",
          "full": 4,
          "scoreableFull": 0,
          "lost": 4,
          "source": "na",
          "points": [
            {
              "text": "提及分型信息（如叶内型/叶外型）或说明‘分两型’"
            }
          ]
        },
        {
          "code": "IMP-08",
          "name": "与以前检查比较符合规范、准确",
          "full": 4,
          "scoreableFull": 0,
          "lost": 4,
          "source": "capability",
          "why": "本样本未提供既往检查影像，无法与以前检查比较",
          "points": [
            {
              "text": "建议内容与题目附带要点一致（即针对确诊目的）",
              "why": "本样本未提供既往检查影像，无法与以前检查比较",
              "source": "capability"
            }
          ]
        }
      ]
    }
  },
  {
    "id": "MOCK-DEMO-3",
    "mock": true,
    "caseId": "SEU-007",
    "title": "颅脑MR 病例 16",
    "bodyPart": "颅脑",
    "modality": "MR",
    "level": "R2",
    "round": 1,
    "submittedAt": "2026-09-18 20:05",
    "status": "done",
    "score": 41.3,
    "scoreableMax": 88,
    "draft": {
      "purpose": "颅脑MRI。",
      "findings": "小脑见异常信号影。",
      "impression": "小脑占位。"
    },
    "result": {
      "items": [
        {
          "code": "GEN-01",
          "name": "患者信息（姓名、年龄、性别、科别）",
          "dim": "一、一般信息及报告及时性",
          "full": 2,
          "scoreableFull": 0,
          "got": 0,
          "points": [],
          "missing": [],
          "nAPoints": [
            {
              "text": "按脱敏形态写出患者姓名（患*）",
              "why": "患者临床信息由系统直接给出，学员不书写，本条不评",
              "source": "na"
            },
            {
              "text": "年龄写成年龄段（50–59 岁）",
              "why": "患者临床信息由系统直接给出，学员不书写，本条不评",
              "source": "na"
            },
            {
              "text": "写出性别（女）与科别（神经外科）",
              "why": "患者临床信息由系统直接给出，学员不书写，本条不评",
              "source": "na"
            }
          ]
        },
        {
          "code": "GEN-02",
          "name": "住院/门诊号、检查号、就诊卡号、影像号正确",
          "dim": "一、一般信息及报告及时性",
          "full": 1,
          "scoreableFull": 0,
          "got": 0,
          "points": [],
          "missing": [],
          "nAPoints": [
            {
              "text": "各类号码按脱敏形态书写（本模块不评）",
              "why": "各类号码字段已从样本中去除，本模块不适用",
              "source": "na"
            }
          ]
        },
        {
          "code": "GEN-03",
          "name": "检查时间正确，按规定时间完成报告",
          "dim": "一、一般信息及报告及时性",
          "full": 1,
          "scoreableFull": 0,
          "got": 0,
          "points": [],
          "missing": [],
          "nAPoints": [
            {
              "text": "写明检查时间（2026-03-15 09:30）",
              "why": "患者临床信息由系统直接给出，学员不书写，本条不评",
              "source": "na"
            }
          ]
        },
        {
          "code": "GEN-04",
          "name": "临床主要信息及检查目的",
          "dim": "一、一般信息及报告及时性",
          "full": 10,
          "scoreableFull": 10,
          "got": 7.5,
          "points": [
            {
              "id": "p1",
              "score": 0.5,
              "comment": "提到了但不够完整，常规描述里应该再补一层。",
              "text": "规范转述临床目的与检查方法（MRI平扫及增强扫描）",
              "scoreWeight": 5,
              "commentBlocked": false
            },
            {
              "id": "p2",
              "score": 1,
              "comment": "",
              "text": "写出检查目的（申请单想知道什么）",
              "scoreWeight": 5,
              "commentBlocked": false
            }
          ],
          "missing": [],
          "nAPoints": []
        },
        {
          "code": "TECH-01",
          "name": "检查部位准确",
          "dim": "二、检查技术",
          "full": 3,
          "scoreableFull": 3,
          "got": 0,
          "points": [
            {
              "id": "p1",
              "score": 0,
              "comment": "这一类没写到，建议对照报告模板逐项自查。",
              "text": "写明检查部位为颅脑",
              "scoreWeight": 3,
              "commentBlocked": false
            }
          ],
          "missing": [
            {
              "text": "写明检查部位为颅脑",
              "comment": "这一类没写到，建议对照报告模板逐项自查。"
            }
          ],
          "nAPoints": []
        },
        {
          "code": "TECH-02",
          "name": "检查类型准确",
          "dim": "二、检查技术",
          "full": 3,
          "scoreableFull": 3,
          "got": 1.5,
          "points": [
            {
              "id": "p1",
              "score": 0.5,
              "comment": "这一类写得比较笼统，建议把部位、范围、密度分开说清楚。",
              "text": "写明检查类型（MR 及平扫/增强）",
              "scoreWeight": 3,
              "commentBlocked": false
            }
          ],
          "missing": [],
          "nAPoints": []
        },
        {
          "code": "TECH-03",
          "name": "检查技术填写规范",
          "dim": "二、检查技术",
          "full": 3,
          "scoreableFull": 3,
          "got": 3,
          "points": [
            {
              "id": "p1",
              "score": 1,
              "comment": "",
              "text": "检查技术描述规范（扫描方式、是否增强等）",
              "scoreWeight": 3,
              "commentBlocked": false
            }
          ],
          "missing": [],
          "nAPoints": []
        },
        {
          "code": "FIND-01",
          "name": "描述全面，条理清楚",
          "dim": "三、影像描述",
          "full": 10,
          "scoreableFull": 10,
          "got": 0,
          "points": [
            {
              "id": "p1",
              "score": 0,
              "comment": "这一类漏了，属于常规描述里应该有的内容。",
              "text": "明确指出病灶位于小脑半球",
              "scoreWeight": 10,
              "commentBlocked": false
            }
          ],
          "missing": [
            {
              "text": "明确指出病灶位于小脑半球",
              "comment": "这一类漏了，属于常规描述里应该有的内容。"
            }
          ],
          "nAPoints": []
        },
        {
          "code": "FIND-02",
          "name": "描述疾病或器官顺序适当",
          "dim": "三、影像描述",
          "full": 4,
          "scoreableFull": 4,
          "got": 2,
          "points": [
            {
              "id": "p1",
              "score": 0.5,
              "comment": "提到了但不够完整，常规描述里应该再补一层。",
              "text": "描述为囊实性肿块/病变/占位",
              "scoreWeight": 4,
              "commentBlocked": false
            }
          ],
          "missing": [],
          "nAPoints": []
        },
        {
          "code": "FIND-03",
          "name": "病灶部位及累及范围描述准确",
          "dim": "三、影像描述",
          "full": 4,
          "scoreableFull": 4,
          "got": 4,
          "points": [
            {
              "id": "p1",
              "score": 1,
              "comment": "",
              "text": "指出囊性部分T1WI呈低信号或长T1信号",
              "scoreWeight": 4,
              "commentBlocked": false
            }
          ],
          "missing": [],
          "nAPoints": []
        },
        {
          "code": "FIND-04",
          "name": "病灶数目、大小准确测量并规范描述",
          "dim": "三、影像描述",
          "full": 4,
          "scoreableFull": 4,
          "got": 0,
          "points": [
            {
              "id": "p1",
              "score": 0,
              "comment": "这一类没写到，建议对照报告模板逐项自查。",
              "text": "指出囊性部分T2WI呈高信号或长T2信号",
              "scoreWeight": 4,
              "commentBlocked": false
            }
          ],
          "missing": [
            {
              "text": "指出囊性部分T2WI呈高信号或长T2信号",
              "comment": "这一类没写到，建议对照报告模板逐项自查。"
            }
          ],
          "nAPoints": []
        },
        {
          "code": "FIND-05",
          "name": "病灶形态、边界及特殊征象描述准确",
          "dim": "三、影像描述",
          "full": 4,
          "scoreableFull": 4,
          "got": 2,
          "points": [
            {
              "id": "p1",
              "score": 0.5,
              "comment": "这一类写得比较笼统，建议把部位、范围、密度分开说清楚。",
              "text": "指出实性成分（壁结节）在T1WI呈等或稍低信号",
              "scoreWeight": 4,
              "commentBlocked": false
            }
          ],
          "missing": [],
          "nAPoints": []
        },
        {
          "code": "FIND-06",
          "name": "病灶密度/信号/强化程度准确分度",
          "dim": "三、影像描述",
          "full": 4,
          "scoreableFull": 4,
          "got": 4,
          "points": [
            {
              "id": "p1",
              "score": 1,
              "comment": "",
              "text": "指出实性成分（壁结节）在T2WI呈稍高信号",
              "scoreWeight": 4,
              "commentBlocked": false
            }
          ],
          "missing": [],
          "nAPoints": []
        },
        {
          "code": "FIND-07",
          "name": "重要阴性征象描述",
          "dim": "三、影像描述",
          "full": 4,
          "scoreableFull": 4,
          "got": 0,
          "points": [
            {
              "id": "p1",
              "score": 0,
              "comment": "这一类漏了，属于常规描述里应该有的内容。",
              "text": "指出增强后囊壁无强化，壁结节明显均匀强化",
              "scoreWeight": 4,
              "commentBlocked": false
            }
          ],
          "missing": [
            {
              "text": "指出增强后囊壁无强化，壁结节明显均匀强化",
              "comment": "这一类漏了，属于常规描述里应该有的内容。"
            }
          ],
          "nAPoints": []
        },
        {
          "code": "IMP-01",
          "name": "回答临床问题",
          "dim": "四、影像诊断",
          "full": 10,
          "scoreableFull": 10,
          "got": 5,
          "points": [
            {
              "id": "p1",
              "score": 0.5,
              "comment": "提到了但不够完整，常规描述里应该再补一层。",
              "text": "定位准确：小脑半球",
              "scoreWeight": 10,
              "commentBlocked": false
            }
          ],
          "missing": [],
          "nAPoints": []
        },
        {
          "code": "IMP-02",
          "name": "定位诊断准确",
          "dim": "四、影像诊断",
          "full": 4,
          "scoreableFull": 4,
          "got": 4,
          "points": [
            {
              "id": "p1",
              "score": 1,
              "comment": "",
              "text": "定性倾向明确：血管母细胞瘤",
              "scoreWeight": 4,
              "commentBlocked": false
            }
          ],
          "missing": [],
          "nAPoints": []
        },
        {
          "code": "IMP-03",
          "name": "典型病变明确诊断",
          "dim": "四、影像诊断",
          "full": 4,
          "scoreableFull": 4,
          "got": 0,
          "points": [
            {
              "id": "p1",
              "score": 0,
              "comment": "这一类没写到，建议对照报告模板逐项自查。",
              "text": "诊断依据包含‘囊实性+壁结节明显强化’核心征象",
              "scoreWeight": 4,
              "commentBlocked": false
            }
          ],
          "missing": [
            {
              "text": "诊断依据包含‘囊实性+壁结节明显强化’核心征象",
              "comment": "这一类没写到，建议对照报告模板逐项自查。"
            }
          ],
          "nAPoints": []
        },
        {
          "code": "IMP-04",
          "name": "不典型病变给出的可能诊断符合规范",
          "dim": "四、影像诊断",
          "full": 4,
          "scoreableFull": 4,
          "got": 2,
          "points": [
            {
              "id": "p1",
              "score": 0.5,
              "comment": "这一类写得比较笼统，建议把部位、范围、密度分开说清楚。",
              "text": "提及无周围水肿或水肿轻微",
              "scoreWeight": 4,
              "commentBlocked": false
            }
          ],
          "missing": [],
          "nAPoints": []
        },
        {
          "code": "IMP-05",
          "name": "肿瘤分期正确",
          "dim": "四、影像诊断",
          "full": 4,
          "scoreableFull": 0,
          "got": 0,
          "points": [],
          "missing": [],
          "nAPoints": [
            {
              "text": "提及第四脑室受压变形"
            }
          ]
        },
        {
          "code": "IMP-06",
          "name": "疾病诊断遵循规范或指南",
          "dim": "四、影像诊断",
          "full": 4,
          "scoreableFull": 4,
          "got": 4,
          "points": [
            {
              "id": "p1",
              "score": 1,
              "comment": "",
              "text": "建议结合临床（如头晕症状相关性分析）",
              "scoreWeight": 4,
              "commentBlocked": false
            }
          ],
          "missing": [],
          "nAPoints": []
        },
        {
          "code": "IMP-07",
          "name": "给临床的建议明确",
          "dim": "四、影像诊断",
          "full": 4,
          "scoreableFull": 4,
          "got": 0,
          "points": [
            {
              "id": "p1",
              "score": 0,
              "comment": "这一类漏了，属于常规描述里应该有的内容。",
              "text": "建议进一步检查：基因检测（如VHL综合征筛查）",
              "scoreWeight": 4,
              "commentBlocked": false
            }
          ],
          "missing": [
            {
              "text": "建议进一步检查：基因检测（如VHL综合征筛查）",
              "comment": "这一类漏了，属于常规描述里应该有的内容。"
            }
          ],
          "nAPoints": []
        },
        {
          "code": "IMP-08",
          "name": "与以前检查比较符合规范、准确",
          "dim": "四、影像诊断",
          "full": 4,
          "scoreableFull": 0,
          "got": 0,
          "points": [],
          "missing": [],
          "nAPoints": [
            {
              "text": "建议随访复查",
              "why": "本样本未提供既往检查影像，无法与以前检查比较",
              "source": "capability"
            }
          ]
        },
        {
          "code": "LANG-01",
          "name": "无错别字，数据单位及标点符号使用正确",
          "dim": "五、文字描述",
          "full": 5,
          "scoreableFull": 5,
          "got": 2.3,
          "points": [
            {
              "id": "p1",
              "score": 0.5,
              "comment": "提到了但不够完整，常规描述里应该再补一层。",
              "text": "全文无错别字",
              "scoreWeight": 1.5,
              "commentBlocked": false
            },
            {
              "id": "p2",
              "score": 1,
              "comment": "",
              "text": "计量单位（mm / cm / 岁 等）使用正确",
              "scoreWeight": 1.5,
              "commentBlocked": false
            },
            {
              "id": "p3",
              "score": 0,
              "comment": "这一类没写到，建议对照报告模板逐项自查。",
              "text": "标点符号使用规范（无中英夹杂、无连续顿号等）",
              "scoreWeight": 2,
              "commentBlocked": false
            }
          ],
          "missing": [
            {
              "text": "标点符号使用规范（无中英夹杂、无连续顿号等）",
              "comment": "这一类没写到，建议对照报告模板逐项自查。"
            }
          ],
          "nAPoints": []
        }
      ],
      "dims": [
        {
          "dim": "一、一般信息及报告及时性",
          "got": 7.5,
          "full": 10
        },
        {
          "dim": "二、检查技术",
          "got": 4.5,
          "full": 9
        },
        {
          "dim": "三、影像描述",
          "got": 12,
          "full": 34
        },
        {
          "dim": "四、影像诊断",
          "got": 15,
          "full": 30
        },
        {
          "dim": "五、文字描述",
          "got": 2.3,
          "full": 5
        }
      ],
      "rawTotal": 41.3,
      "scoreableMax": 88,
      "missingItems": [
        {
          "code": "TECH-01",
          "name": "检查部位准确",
          "dim": "二、检查技术",
          "full": 3,
          "missing": [
            {
              "text": "写明检查部位为颅脑",
              "comment": "这一类没写到，建议对照报告模板逐项自查。"
            }
          ]
        },
        {
          "code": "FIND-01",
          "name": "描述全面，条理清楚",
          "dim": "三、影像描述",
          "full": 10,
          "missing": [
            {
              "text": "明确指出病灶位于小脑半球",
              "comment": "这一类漏了，属于常规描述里应该有的内容。"
            }
          ]
        },
        {
          "code": "FIND-04",
          "name": "病灶数目、大小准确测量并规范描述",
          "dim": "三、影像描述",
          "full": 4,
          "missing": [
            {
              "text": "指出囊性部分T2WI呈高信号或长T2信号",
              "comment": "这一类没写到，建议对照报告模板逐项自查。"
            }
          ]
        },
        {
          "code": "FIND-07",
          "name": "重要阴性征象描述",
          "dim": "三、影像描述",
          "full": 4,
          "missing": [
            {
              "text": "指出增强后囊壁无强化，壁结节明显均匀强化",
              "comment": "这一类漏了，属于常规描述里应该有的内容。"
            }
          ]
        },
        {
          "code": "IMP-03",
          "name": "典型病变明确诊断",
          "dim": "四、影像诊断",
          "full": 4,
          "missing": [
            {
              "text": "诊断依据包含‘囊实性+壁结节明显强化’核心征象",
              "comment": "这一类没写到，建议对照报告模板逐项自查。"
            }
          ]
        },
        {
          "code": "IMP-07",
          "name": "给临床的建议明确",
          "dim": "四、影像诊断",
          "full": 4,
          "missing": [
            {
              "text": "建议进一步检查：基因检测（如VHL综合征筛查）",
              "comment": "这一类漏了，属于常规描述里应该有的内容。"
            }
          ]
        },
        {
          "code": "LANG-01",
          "name": "无错别字，数据单位及标点符号使用正确",
          "dim": "五、文字描述",
          "full": 5,
          "missing": [
            {
              "text": "标点符号使用规范（无中英夹杂、无连续顿号等）",
              "comment": "这一类没写到，建议对照报告模板逐项自查。"
            }
          ]
        }
      ],
      "unassessableItems": [
        {
          "code": "GEN-01",
          "name": "患者信息（姓名、年龄、性别、科别）",
          "full": 2,
          "scoreableFull": 0,
          "lost": 2,
          "source": "na",
          "why": "患者临床信息由系统直接给出，学员不书写，本条不评",
          "points": [
            {
              "text": "按脱敏形态写出患者姓名（患*）",
              "why": "患者临床信息由系统直接给出，学员不书写，本条不评",
              "source": "na"
            },
            {
              "text": "年龄写成年龄段（50–59 岁）",
              "why": "患者临床信息由系统直接给出，学员不书写，本条不评",
              "source": "na"
            },
            {
              "text": "写出性别（女）与科别（神经外科）",
              "why": "患者临床信息由系统直接给出，学员不书写，本条不评",
              "source": "na"
            }
          ]
        },
        {
          "code": "GEN-02",
          "name": "住院/门诊号、检查号、就诊卡号、影像号正确",
          "full": 1,
          "scoreableFull": 0,
          "lost": 1,
          "source": "na",
          "why": "各类号码字段已从样本中去除，本模块不适用",
          "points": [
            {
              "text": "各类号码按脱敏形态书写（本模块不评）",
              "why": "各类号码字段已从样本中去除，本模块不适用",
              "source": "na"
            }
          ]
        },
        {
          "code": "GEN-03",
          "name": "检查时间正确，按规定时间完成报告",
          "full": 1,
          "scoreableFull": 0,
          "lost": 1,
          "source": "na",
          "why": "患者临床信息由系统直接给出，学员不书写，本条不评",
          "points": [
            {
              "text": "写明检查时间（2026-03-15 09:30）",
              "why": "患者临床信息由系统直接给出，学员不书写，本条不评",
              "source": "na"
            }
          ]
        },
        {
          "code": "IMP-05",
          "name": "肿瘤分期正确",
          "full": 4,
          "scoreableFull": 0,
          "lost": 4,
          "source": "na",
          "points": [
            {
              "text": "提及第四脑室受压变形"
            }
          ]
        },
        {
          "code": "IMP-08",
          "name": "与以前检查比较符合规范、准确",
          "full": 4,
          "scoreableFull": 0,
          "lost": 4,
          "source": "capability",
          "why": "本样本未提供既往检查影像，无法与以前检查比较",
          "points": [
            {
              "text": "建议随访复查",
              "why": "本样本未提供既往检查影像，无法与以前检查比较",
              "source": "capability"
            }
          ]
        }
      ]
    }
  },
  {
    "id": "MOCK-DEMO-4",
    "mock": true,
    "caseId": "KNEE-001",
    "title": "膝关节MR 病例 1",
    "bodyPart": "膝关节",
    "modality": "MR",
    "level": "R1",
    "round": 1,
    "submittedAt": "2026-09-18 15:30",
    "status": "failed",
    "error": "评分服务暂时不可用，请稍后重试",
    "draft": {
      "purpose": "颅脑MRI。",
      "findings": "小脑见异常信号影。",
      "impression": "小脑占位。"
    },
    "result": null
  }
]
