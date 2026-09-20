/**
 * 演示用的训练记录（**mock**）
 * ============================
 * 为什么要有：本期无服务端，训练记录只落在浏览器 localStorage；换台机器 / 清缓存后
 * 记录页就是空的，没法演示「成绩报告」。
 *
 * 这条记录不是手编的：用**真实评分引擎**跑出来的 ——
 *   resolveRubric('SEU-001') -> composeScore(模拟逐要点判定) -> result
 * 所以总分、维度分、缺失清单、逐要点点评与真实评分完全同构。
 *
 * 学员报告是**故意写得不太完整**的（演示要能看到"缺什么"）。
 * 生成脚本见提交说明；改了评分表想重新生成，重跑同一个脚本即可。
 */

export const MOCK_PRACTICE_RECORDS = [
  {
    "id": "MOCK-DEMO-1",
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
              "comment": "这一类漏了，属于常规描述里应该有的内容。",
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
              "comment": "这一类写得比较笼统，建议把部位、范围、密度分开说清楚。",
              "text": "写明检查部位为胸部",
              "scoreWeight": 3,
              "commentBlocked": false
            }
          ],
          "missing": [
            {
              "text": "写明检查部位为胸部",
              "comment": "这一类写得比较笼统，建议把部位、范围、密度分开说清楚。"
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
              "comment": "表述不规范，建议用报告里约定俗成的说法。",
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
              "comment": "这一类写得比较笼统，建议把部位、范围、密度分开说清楚。",
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
              "comment": "这一类漏了，属于常规描述里应该有的内容。",
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
              "comment": "表述不规范，建议用报告里约定俗成的说法。",
              "text": "指出绝大多数血供来自主动脉",
              "scoreWeight": 4,
              "commentBlocked": false
            }
          ],
          "missing": [
            {
              "text": "指出绝大多数血供来自主动脉",
              "comment": "表述不规范，建议用报告里约定俗成的说法。"
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
              "comment": "这一类写得比较笼统，建议把部位、范围、密度分开说清楚。"
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
              "comment": "表述不规范，建议用报告里约定俗成的说法。"
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
  }
]
