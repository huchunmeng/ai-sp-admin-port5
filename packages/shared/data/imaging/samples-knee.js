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
      /* ── 一般信息 ── */
      'GEN-04': {
        rules: '临床目的要落到"评估半月板、软骨及韧带"上，并回应疼痛原因',
        points: [
          { id: 'p1', text: '规范转述临床目的与检查方法（右膝关节 MRI 平扫，评估半月板、软骨及韧带情况）',
            rule: '须写出检查方法（MRI 平扫）与评估对象（半月板/软骨/韧带）三者中的至少两项；只写"右膝MRI"算 0.5',
            accept: ['MRI 平扫', '半月板', '软骨', '韧带'] },
          { id: 'p2', text: '体现临床所问：右膝疼痛、活动受限的原因',
            rule: '须把检查目的与"疼痛/活动受限"的临床情境联系起来；只罗列检查方法算 0.5',
            accept: ['右膝疼痛', '活动受限'] }
        ]
      },

      /* ── 检查技术 ── */
      'TECH-01': {
        rules: '部位要写到"右膝关节"，不能只写"膝关节"',
        points: [
          { id: 'p1', text: '写明检查部位为右膝关节', rule: '须同时有"右"与"膝关节"；只写"膝关节"算 0.5', accept: ['右膝关节', '右膝'] }
        ]
      },
      'TECH-02': {
        points: [
          { id: 'p1', text: '写明检查类型为 MRI 平扫（本卷为非增强）',
            rule: '须写明 MRI/MR 与平扫；把本卷写成"增强扫描"算 0（本例无增强序列）', accept: ['MRI 平扫', 'MR 平扫'] }
        ]
      },
      'TECH-03': {
        rules: 'MRI 的技术描述重点是方位与序列，别照抄 CT 的"肺窗/纵隔窗"',
        points: [
          { id: 'p1', text: '交代扫描方位与序列（矢状位 PD 脂肪抑制 / T2、冠状位 PD / T1、轴位 PD）',
            rule: '须至少写出两个方位（矢状位/冠状位/轴位）与相应权重或抑脂；只写"多序列"算 0.5',
            accept: ['矢状位', '冠状位', '轴位', '脂肪抑制'] },
          { id: 'p2', text: '交代层厚（4mm）', rule: '须写出层厚 4mm；未写算 0', accept: ['4mm', '层厚 4mm'] }
        ]
      },

      /* ── 影像描述 ── */
      'FIND-01': {
        rules: '本卷要按"关节积液 → 骨髓水肿 → 半月板 → 韧带 → 软骨/肌腱"逐类描述才算全面',
        points: [
          { id: 'p1', text: '逐类描述：关节积液、骨髓水肿、半月板、韧带、软骨/肌腱',
            rule: '五类中写到四类及以上算满分；写到两三类算 0.5；只写一类算 0',
            accept: ['关节积液', '骨髓水肿', '半月板', '韧带', '软骨'] },
          { id: 'p2', text: '描述关节对位与关节间隙', rule: '须写明对位可、关节间隙无明显狭窄；未提及算 0',
            accept: ['对位可', '关节间隙未见明显狭窄'] }
        ]
      },
      'FIND-02': {
        rules: '顺序按"主要阳性征象 → 次要 → 阴性"或"骨 → 软组织"皆可，但全文要有稳定次第',
        points: [
          { id: 'p1', text: '描述顺序适当（主要病变在前、阴性征象在后，同类归并）',
            rule: '顺序混乱、阳性与阴性征象交错出现算 0.5；把最重要征象放在末尾算 0',
            accept: ['条理', '顺序'] }
        ]
      },
      'FIND-03': {
        rules: '部位要具体到"内侧半月板后角""股骨内侧髁""胫骨平台内侧份"这一级',
        points: [
          { id: 'p1', text: '描述内侧半月板后角的信号异常', rule: '须写"内侧半月板后角"；只写"半月板"算 0.5', accept: ['内侧半月板后角'] },
          { id: 'p2', text: '描述股骨内侧髁及胫骨平台内侧份的骨髓水肿范围',
            rule: '须写到两个骨端（股骨内侧髁 / 胫骨平台内侧份）；只写一个算 0.5', accept: ['股骨内侧髁', '胫骨平台内侧'] }
        ]
      },
      'FIND-05': {
        rules: '半月板损伤的关键征象是"信号是否达关节面缘"，必须写到',
        points: [
          { id: 'p1', text: '描述内侧半月板后角信号是否达关节面缘（撕裂的关键征象）',
            rule: '须写出"达关节面缘/累及关节面"；只写"信号增高"算 0.5', accept: ['达关节面缘', '累及关节面'] },
          { id: 'p2', text: '描述关节积液的分布范围与形态（髌上囊、关节腔）',
            rule: '须写明积液的分布部位与形态（条片状）；只写"有积液"算 0.5', accept: ['髌上囊', '关节腔'] }
        ]
      },
      'FIND-06': {
        rules: '本卷是 MRI：写"信号特点"（长 T1 长 T2 / 压脂高信号），不要写 CT 的密度或增强',
        points: [
          { id: 'p1', text: '描述积液的信号特点（长 T1 长 T2 / 压脂序列高信号）',
            rule: '须写出信号特点；只写"有积液"不写信号算 0', accept: ['长 T1 长 T2', '压脂高信号'] },
          { id: 'p2', text: '描述骨髓水肿在脂肪抑制序列上的高信号表现',
            rule: '须把骨髓水肿与其信号表现对应起来；未写信号算 0', accept: ['压脂高信号', '骨髓水肿'] }
        ]
      },
      'FIND-07': {
        rules: '阴性征象也要写：韧带、外侧半月板都该交代',
        points: [
          { id: 'p1', text: '写明前后交叉韧带及内外侧副韧带走行连续、信号未见异常',
            rule: '四条韧带至少写到走行连续、信号未见异常；漏两条以上算 0', accept: ['交叉韧带', '侧副韧带'] },
          { id: 'p2', text: '写明外侧半月板未见明显异常',
            rule: '须明确写出外侧半月板形态与信号未见异常（阴性征象也要写）；漏写算 0', accept: ['外侧半月板未见明显异常'] }
        ]
      },

      /* ── 影像诊断 ── */
      'IMP-01': {
        rules: '要正面回答申请单所问（半月板/软骨/韧带），不能只描述征象',
        points: [
          { id: 'p1', text: '回答临床所问：半月板、软骨、韧带情况分别给出结论',
            rule: '三项中至少两项给出明确结论；只给一项算 0.5', accept: ['半月板', '软骨', '韧带'] },
          { id: 'p2', text: '给出主要诊断结论（关节腔及髌上囊积液）',
            rule: '须把积液写成独立诊断结论；只描述征象不给结论算 0.5', accept: ['关节腔积液', '髌上囊积液'] }
        ]
      },
      'IMP-02': {
        points: [{ id: 'p1', text: '定位到内侧半月板后角、股骨内侧髁、胫骨平台内侧份',
          rule: '诊断里的定位须与所见一致；定位笼统（只写"膝关节"）算 0.5', accept: ['内侧半月板后角', '股骨内侧髁'] }]
      },
      'IMP-03': {
        points: [{ id: 'p1', text: '典型病变给出明确诊断（关节积液 / 骨髓水肿）',
          rule: '积液与骨髓水肿须各给出明确结论；只给其一算 0.5', accept: ['关节积液', '骨髓水肿'] }]
      },
      'IMP-04': {
        rules: '把握程度要写出来（"考虑…可能"），不能像确诊一样断言',
        points: [
          { id: 'p1', text: '不典型病变给出符合规范的"可能"诊断（内侧半月板后角损伤可能）',
            rule: '须给出内侧半月板损伤/撕裂的结论并体现"可能/考虑"的把握程度；写成确诊算 0.5',
            accept: ['内侧半月板损伤', '半月板撕裂', '可能'] },
          { id: 'p2', text: '把骨髓水肿与骨软骨损伤联系起来',
            rule: '须把骨髓水肿指向骨软骨损伤；只写"骨髓水肿"算 0.5', accept: ['骨软骨损伤'] }
        ]
      },
      'IMP-06': {
        rules: '诊断表述要符合膝关节 MRI 报告的规范用语',
        points: [
          { id: 'p1', text: '诊断用语符合规范（用"达关节面缘""骨软骨损伤"等规范表述）',
            rule: '出现自造术语或口语化表述算 0.5；表述规范算满分', accept: ['达关节面缘', '骨软骨损伤'] }
        ]
      },
      'IMP-07': {
        points: [
          { id: 'p1', text: '给出明确的进一步建议（结合临床与体格检查 / 必要时关节镜 / 复查）',
            rule: '须有具体建议；只写"建议随诊"算 0.5', accept: ['关节镜', '结合临床', '复查'] }
        ]
      }
    }
  }
}

export const KNEE_SAMPLES = [KNEE]
export const KNEE_RUBRIC = { 'KNEE-001': KNEE.rubric }
