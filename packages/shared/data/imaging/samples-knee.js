/**
 * 院方自有素材：右膝关节 MR（东南大学医学院 / 医路慧影 提供）
 *
 * ⚠️⚠️ 本样本的报告与临床信息**全部是占位内容**（2026-09-20 老胡：「报告和临床信息你先随便写点占位吧，我再去要」）。
 *   · `goldStandard`（检查技术 / 影像所见 / 诊断意见）由 PM 照影像描述起草，**未经放射科医师复核**，不得用于正式考核
 *   · `deidentify` / `history` / `purpose` / 病例标题均为占位
 *   · 因此 `status: 'draft'` —— 真报告到手后替换上述字段并置为 `published`
 *
 * 影像本体：`apps/admin/public/data/imaging-samples/KNEE-001/*.bin.gz`
 *   · 原始 DICOM 的 16-bit 像素（body bbox 裁剪后）gzip 压缩，前端 canvas 实时算窗宽窗位
 *   · 传输语法 JPEG Lossless（无损），已匿名化（PatientName=Anonymized / PatientID=0 / 无生日性别 / 无烧录文字）
 *   · 6 个序列：定位像 + 矢状位 PD 脂肪抑制 / T2、冠状位 PD / T1、轴位 PD
 *   · 导出脚本：`scripts/ingest-knee-dicom.py`
 */

const KNEE = {
  id: 'KNEE-001',
  title: '膝关节MR · 右膝疼痛 3 个月',
  bodyPart: '膝关节',
  modality: 'MR',
  level: 'R1',
  icon: 'fa-bone',
  status: 'published',   // 占位报告：仅为让 PACS 阅片器可预览；真报告到手后替换并复核
  version: 1,
  publishedAt: '2026-09-20',
  sampleNote: '院方自有素材（右膝 MR）。报告与临床信息为占位，待院方正式报告替换',
  sourceDataset: '东南大学医学院 / 医路慧影（院方自有）',
  sourceLicense: '院方自有素材，无需外部署名',
  capabilities: {
    hasEnhancedPhase: false,
    hasPriorExam: false,
    hasStagingInfo: false
  },
  deidentify: {
    name: '患*',
    ageRange: '50–59 岁',
    sex: '男',
    dept: '骨科',
    examTime: '2026-06-18 15:20'
  },
  /** 占位：待院方给真实病史 */
  history: '右膝疼痛、活动受限 3 个月，上下楼及下蹲时加重，无明显外伤史。',
  /** 占位：待院方给真实检查目的 */
  purpose: '右膝关节 MRI 平扫，评估半月板、软骨及韧带情况。',
  series: [
    {
      key: 'scout', name: '定位像', en: 'Scout',
      frames: 27, images: [],
      window: { WW: 2226, WL: 1113 },
      raw: {
        pattern: '/data/imaging-samples/KNEE-001/scout-%03d.bin.gz',
        width: 226, height: 256, pixelSpacing: [0.8594, 0.8594]
      }
    },
    {
      key: 'pd_sag_fs', name: '矢状位 PD 脂肪抑制', en: 'Sag PD FS',
      frames: 22, images: [],
      window: { WW: 4005, WL: 2002 },
      raw: {
        pattern: '/data/imaging-samples/KNEE-001/pd_sag_fs-%03d.bin.gz',
        width: 512, height: 512, pixelSpacing: [0.293, 0.293]
      }
    },
    {
      key: 't2_sag', name: '矢状位 T2', en: 'Sag T2',
      frames: 22, images: [],
      window: { WW: 5013, WL: 2506 },
      raw: {
        pattern: '/data/imaging-samples/KNEE-001/t2_sag-%03d.bin.gz',
        width: 512, height: 512, pixelSpacing: [0.293, 0.293]
      }
    },
    {
      key: 'pd_cor', name: '冠状位 PD', en: 'Cor PD',
      frames: 20, images: [],
      window: { WW: 3873, WL: 1936 },
      raw: {
        pattern: '/data/imaging-samples/KNEE-001/pd_cor-%03d.bin.gz',
        width: 512, height: 512, pixelSpacing: [0.293, 0.293]
      }
    },
    {
      key: 't1_cor', name: '冠状位 T1', en: 'Cor T1',
      frames: 20, images: [],
      window: { WW: 7604, WL: 3802 },
      raw: {
        pattern: '/data/imaging-samples/KNEE-001/t1_cor-%03d.bin.gz',
        width: 512, height: 512, pixelSpacing: [0.293, 0.293]
      }
    },
    {
      key: 'pd_ax', name: '轴位 PD', en: 'Ax PD',
      frames: 24, images: [],
      window: { WW: 5145, WL: 2572 },
      raw: {
        pattern: '/data/imaging-samples/KNEE-001/pd_ax-%03d.bin.gz',
        width: 505, height: 492, pixelSpacing: [0.332, 0.332]
      }
    }
  ],
  /** ⚠️ 占位金标准：照影像描述的初稿，未经医师复核 */
  goldStandard: {
    technique: '右膝关节 MRI 平扫。矢状位 PD 脂肪抑制与 T2WI、冠状位 PD 与 T1WI、轴位 PD，层厚 4mm。',
    findings: '右膝关节对位可，关节间隙未见明显狭窄。髌上囊及关节腔内见条片状长 T1 长 T2 信号影。'
      + '内侧半月板后角内见条状高信号影，达关节面缘；外侧半月板形态与信号未见明显异常。'
      + '前后交叉韧带及内、外侧副韧带走行连续，信号未见明确异常。'
      + '股骨内侧髁及胫骨平台内侧份见片状脂肪抑制序列高信号影。髌骨软骨面欠光整。'
      + '股四头肌腱、髌腱及髌下脂肪垫未见异常。',
    impression: '1. 右膝关节腔及髌上囊积液。'
      + '2. 内侧半月板后角损伤（撕裂）可能。'
      + '3. 股骨内侧髁及胫骨平台内侧份骨髓水肿，提示骨软骨损伤。'
      + '建议结合临床及体格检查，必要时关节镜进一步评估。'
  },
  rubric: {
    version: 1,
    updatedAt: '2026-09-20 11:00',
    updatedBy: '素材接入（占位）',
    items: {
      'FIND-01': {
        rules: '部位与范围要写到"右膝关节"，方位序列要交代（矢状位/冠状位/轴位）',
        points: [
          { id: 'p1', text: '写明检查部位为右膝关节，并交代所看序列方位', rule: '须出现"右膝"与至少一个方位（矢状位/冠状位/轴位）；只写"膝关节"或漏方位算 0.5', accept: ['右膝关节', '右膝'] },
          { id: 'p2', text: '描述关节对位与关节间隙', rule: '须写明对位可、关节间隙无明显狭窄；未提及算 0', accept: ['对位可', '关节间隙未见明显狭窄'] }
        ]
      },
      'FIND-02': {
        rules: '积液与骨髓水肿是本文主要阳性征象，必须写到位',
        points: [
          { id: 'p1', text: '描述髌上囊 / 关节腔积液及其信号特点', rule: '须写出积液部位（髌上囊或关节腔）与长 T1 长 T2 信号；只写"有积液"算 0.5', accept: ['髌上囊积液', '关节腔积液'] },
          { id: 'p2', text: '描述股骨内侧髁及胫骨平台内侧份骨髓水肿', rule: '须写到骨髓水肿的部位与压脂高信号；部位写错算 0', accept: ['骨髓水肿', '压脂高信号'] }
        ]
      },
      'FIND-03': {
        rules: '半月板要分内、外侧，并写到信号是否达关节面',
        points: [
          { id: 'p1', text: '描述内侧半月板后角信号异常及是否达关节面缘', rule: '须写"内侧半月板后角"与"达关节面缘"；只写"半月板异常"算 0.5', accept: ['内侧半月板后角', '达关节面缘'] },
          { id: 'p2', text: '写明外侧半月板未见明显异常', rule: '须明确写出外侧半月板形态信号未见异常（阴性征象也要写）；漏写算 0', accept: ['外侧半月板未见明显异常'] }
        ]
      },
      'FIND-05': {
        points: [
          { id: 'p1', text: '描述前后交叉韧带与内外侧副韧带', rule: '四条韧带（前交叉/后交叉/内侧副/外侧副）至少写到走行连续、信号未见异常；漏两条以上算 0', accept: ['交叉韧带', '侧副韧带'] },
          { id: 'p2', text: '描述髌骨软骨面与肌腱', rule: '须写到髌骨软骨面欠光整、股四头肌腱与髌腱未见异常；只写其一算 0.5', accept: ['髌骨软骨面', '股四头肌腱'] }
        ]
      },
      'IMP-01': {
        points: [{ id: 'p1', text: '给出"关节腔及髌上囊积液"的诊断', rule: '须把积液写成独立诊断结论；只描述征象不给结论算 0.5', accept: ['关节腔积液', '髌上囊积液'] }]
      },
      'IMP-02': {
        points: [{ id: 'p1', text: '给出半月板损伤（撕裂）的诊断倾向', rule: '须给出内侧半月板损伤/撕裂的结论并体现"可能/考虑"的把握程度', accept: ['内侧半月板损伤', '半月板撕裂'] }]
      },
      'IMP-03': {
        points: [{ id: 'p1', text: '给出骨髓水肿 / 骨软骨损伤的诊断', rule: '须把骨髓水肿与骨软骨损伤联系起来给出结论', accept: ['骨髓水肿', '骨软骨损伤'] }]
      },
      'IMP-04': {
        points: [{ id: 'p1', text: '给出进一步检查或处理建议', rule: '须有明确建议（结合临床/关节镜/复查等）；只写"建议随诊"算 0.5', accept: ['关节镜', '结合临床'] }]
      }
    }
  }
}

export const KNEE_SAMPLES = [KNEE]
export const KNEE_RUBRIC = { 'KNEE-001': KNEE.rubric }
