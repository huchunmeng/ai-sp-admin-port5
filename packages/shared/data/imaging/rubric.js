// 评分要点集（rubric）—— LLM 逐条判分的**判据**
//
// 为什么必须有要点集：金标准报告是一份**范文**。直接拿范文让模型判分，会退化成"像不像范文"——
// 写对了但表述不同的学生会被误伤，学生学到的也是"背范文"。要点集把"这条要评什么、哪些说法都算对"
// 显式写出来，模型按**要点命中**判分，而不是按文本相似度。
//
// 结构：
//   RUBRIC[caseId] = { version, updatedAt, updatedBy, items: { [code]: { points:[], rules:'' } } }
//   · 不存 `full`（条目满分）——从 R1_TABLE 取，避免两处漂移
//   · point.accept 是**可接受表述域**：命中其中任一即算写对
//   · 通用条目（一般信息 / 检查技术 / 文字描述）由样单元数据**自动生成**，不手写
//   · 内容条目（影像描述 / 影像诊断）按病例手写，也可在管理端用「AI 抽取」生成后再改
//
// ⚠️ **子项级可评**（本轮口径收紧，回正 PRD「先救后兜」原意）：
//   PRD 附录 E 写的兜底原则是"只归一**子项**"（如 FIND-06 密度/信号可评、只剔"强化程度"），
//   但原型演示数据取了"最坏情形"按**整条** −4 计，导致学生写对"实性"也白丢分。
//   本实现改为**逐要点判定**：条目可评满分 = 条目满分 × 可评要点数 / 要点总数，
//   真正评不了的要点才移出分母（见 POINT_RULES）。这对学生更公平，也让"不可评"更诚实。

import { R1_TABLE, R1_ITEMS, SEGMENTS } from './r1-table.js'
import { CAPABILITIES } from './capabilities.js'
import { IMAGING_SAMPLES } from './samples.js'
import { SEU_RUBRIC } from './samples-seu.js'
import { PUB_RUBRIC } from './samples-pub.js'

/** 样单元数据表（本文件内自建，避免与 index.js 形成循环依赖） */
const SAMPLE_BY_ID = Object.fromEntries(IMAGING_SAMPLES.map(s => [s.id, s]))

export const RUBRIC_VERSION = 'rubric-2026.09'

/** 条目的判定档（LLM 逐要点返回 0 / 0.5 / 1） */
export const POINT_SCORE = { miss: 0, partial: 0.5, hit: 1 }

/**
 * 能力位 → 要点可评性的规则表。
 * `match` 命中要点 id 或 text；`whole: true` 表示整条不可评；
 * `source`：`capability` = 系统给不了输入（结果页标注折算）；`na` = 本类病例不适用（结果页不标注）
 */
export const POINT_RULES = [
  {
    code: 'FIND-04', match: /测量|大小|实测/i, source: 'capability',
    when: c => !c.hasMeasurement,
    why: '影像控件不提供测量工具，只能目测，不要求实测值'
  },
  {
    code: 'FIND-06', match: /强化/i, source: 'capability',
    when: c => !c.hasEnhancedPhase,
    why: '本样本无增强期相序列，"强化程度"无从判读'
  },
  {
    code: 'IMP-08', whole: true, source: 'capability',
    when: c => !c.hasPriorExam,
    why: '本病例为单次检查，没有既往片子可供比较'
  },
  {
    code: 'IMP-05', whole: true, source: 'na',
    when: c => !c.isTumor,
    why: '非肿瘤病例，分期不适用（N/A）'
  },
  {
    code: 'IMP-05', whole: true, source: 'capability',
    when: c => c.isTumor && !c.hasStagingInfo,
    why: '肿瘤病例但临床主要信息未给足分期依据'
  },
  {
    code: 'GEN-02', whole: true, source: 'na',
    when: () => true,
    why: '全掩字段（住院/门诊号、就诊卡号）本期不纳入评分'
  }
]

/* ══════════════════════════════════════════════════════════════
   通用条目：由样单元数据自动生成（一般信息 / 检查技术 / 文字描述）
   ══════════════════════════════════════════════════════════════ */

function genericItems(sample) {
  const d = sample.deidentify || {}
  const modalityText = sample.modality === 'CT' ? 'CT'
    : sample.modality === 'MR' ? 'MR' : sample.modality
  const techniqueText = sample.capabilities && sample.capabilities.hasEnhancedPhase
    ? `${modalityText} 增强扫描（含平扫 + 各期相）`
    : `${modalityText} 平扫`

  return {
    'GEN-01': {
      rules: '脱敏形态即评分基准——照实复述脱敏后的值即得分',
      points: [
        { id: 'p1', text: `按脱敏形态写出患者姓名（${d.name}）`, accept: [d.name] },
        { id: 'p2', text: `年龄写成年龄段（${d.ageRange}）`, accept: [d.ageRange] },
        { id: 'p3', text: `写出性别（${d.sex}）与科别（${d.dept}）`, accept: [d.sex, d.dept] }
      ]
    },
    'GEN-02': {
      rules: '本条要评的是各类号码（住院/门诊号、检查号、就诊卡号、影像号）。' 
        + '2026-09-20 起这四类号码字段整体从样本里去掉（对"写报告"没有可练内容），本条对本模块全部样本不适用',
      points: [{ id: 'p1', text: '各类号码按脱敏形态书写（本模块不评）', accept: [] }]
    },
    'GEN-03': {
      points: [{ id: 'p1', text: `写明检查时间（${d.examTime}）`, accept: [d.examTime] }]
    },
    'TECH-01': {
      points: [{ id: 'p1', text: `写明检查部位为${sample.bodyPart}`, accept: [sample.bodyPart] }]
    },
    'TECH-02': {
      points: [{ id: 'p1', text: `写明检查类型（${modalityText} 及平扫/增强）`, accept: [modalityText] }]
    },
    'TECH-03': {
      points: [{ id: 'p1', text: '检查技术描述规范（扫描方式、是否增强等）', accept: [] }]
    },
    'LANG-01': {
      points: [
        { id: 'p1', text: '全文无错别字', accept: [] },
        { id: 'p2', text: '计量单位（mm / cm / 岁 等）使用正确', accept: [] },
        { id: 'p3', text: '标点符号使用规范（无中英夹杂、无连续顿号等）', accept: [] }
      ]
    },
    'GEN-04': {
      rules: '整段照抄临床申请信息不得满分，须规范转述并回应临床所问',
      points: [
        { id: 'p1', text: `规范转述临床主要信息（${d.clinicalBrief || sample.clinicalBrief}）`, accept: [] },
        { id: 'p2', text: '写出检查目的（申请单想知道什么）', accept: [] }
      ]
    }
  }
}

/* ══════════════════════════════════════════════════════════════
   内容条目：按病例手写（影像描述 FIND-* / 影像诊断 IMP-*）
   ══════════════════════════════════════════════════════════════ */

const CONTENT_ITEMS = {
  'RC-001': {
    'FIND-01': {
      points: [
        { id: 'p1', text: '描述主病灶的形态学征象（边缘、密度、周围改变）', accept: [] },
        { id: 'p2', text: '描述重要阴性征象（其余肺野、纵隔及肺门、胸膜腔）', accept: [] },
        { id: 'p3', text: '段落按类组织、条理清晰，不混杂跳序', accept: [] }
      ]
    },
    'FIND-02': {
      points: [
        { id: 'p1', text: '先描述主病灶，再描述阴性表现', accept: [] },
        { id: 'p2', text: '按解剖顺序组织（肺 → 纵隔/肺门 → 胸膜腔 → 心影大血管）', accept: [] }
      ]
    },
    'FIND-03': {
      points: [{ id: 'p1', text: '定位到右肺上叶尖段', accept: ['右肺上叶尖段', '右上叶尖段', '右肺上叶前段尖段'] }]
    },
    'FIND-04': {
      rules: '本样本无测量工具，「测量」子项不可评；「数目」可目测仍可评',
      points: [
        { id: 'p1', text: '写明病灶数目为单发（一枚）', accept: ['单发', '一枚', '1 枚', '孤立'] },
        { id: 'p2', text: '给出病灶大小的实测值约 12mm×10mm', accept: ['12mm×10mm', '12×10mm', '约12mm'] }
      ]
    },
    'FIND-05': {
      points: [
        { id: 'p1', text: '描述边缘分叶', accept: ['分叶'] },
        { id: 'p2', text: '描述短毛刺', accept: ['毛刺'] },
        { id: 'p3', text: '描述周围局限性胸膜牵拉', accept: ['胸膜牵拉', '胸膜凹陷'] }
      ]
    },
    'FIND-06': {
      rules: '本样本无增强期相，「强化程度」子项不可评；密度可评',
      points: [
        { id: 'p1', text: '描述密度为实性（或等价的密度判断）', accept: ['实性', '实性密度'] },
        { id: 'p2', text: '描述强化程度', accept: [] }
      ]
    },
    'FIND-07': {
      points: [
        { id: 'p1', text: '写明双肺其余肺野未见明确结节及实变', accept: ['其余肺野', '余肺'] },
        { id: 'p2', text: '写明纵隔及肺门未见明显肿大淋巴结', accept: ['纵隔', '肺门'] },
        { id: 'p3', text: '写明双侧胸腔未见积液', accept: ['胸腔未见积液', '无胸腔积液', '未见积液'] }
      ]
    },
    'IMP-01': {
      rules: '必须正面回应临床问题，只写"结节待排"之类不得满分',
      points: [
        { id: 'p1', text: '正面回应"右肺上叶结节的性质"（给出倾向性判断）', accept: [] },
        { id: 'p2', text: '回应"有无纵隔淋巴结肿大及胸腔积液"这一问题', accept: [] },
        { id: 'p3', text: '给出下一步建议（进一步检查或随访）', accept: [] }
      ]
    },
    'IMP-02': {
      points: [{ id: 'p1', text: '诊断定位与影像描述一致（右肺上叶尖段）', accept: [] }]
    },
    'IMP-03': {
      points: [{ id: 'p1', text: '对典型征象组合给出明确倾向：周围型肺癌可能性大', accept: ['周围型肺癌', '肺癌', '恶性'] }]
    },
    'IMP-04': {
      points: [
        { id: 'p1', text: '用"考虑…可能性大"等符合规范的倾向性表述，而非武断下结论', accept: [] }
      ]
    },
    'IMP-05': {
      points: [{ id: 'p1', text: '给出肿瘤分期', accept: [] }]
    },
    'IMP-06': {
      points: [{ id: 'p1', text: '诊断术语符合规范/指南（非自造词、非口语化）', accept: [] }]
    },
    'IMP-07': {
      points: [
        { id: 'p1', text: '建议增强 CT（进一步检查明确）', accept: ['增强CT', '增强 CT', '增强扫描'] },
        { id: 'p2', text: '建议多学科评估（MDT）', accept: ['多学科', 'MDT'] }
      ]
    },
    'IMP-08': {
      points: [{ id: 'p1', text: '与既往检查比较', accept: [] }]
    }
  },

  'RC-002': {
    'FIND-01': {
      points: [
        { id: 'p1', text: '按序列组织描述（DWI / ADC / T2WI / FLAIR 的所见）', accept: [] },
        { id: 'p2', text: '描述重要阴性征象（脑室系统、中线、脑沟脑裂）', accept: [] },
        { id: 'p3', text: '段落按类组织、条理清晰', accept: [] }
      ]
    },
    'FIND-02': {
      points: [
        { id: 'p1', text: '先描述主病灶，再描述其余结构', accept: [] },
        { id: 'p2', text: '按序列或解剖顺序组织（不跳序）', accept: [] }
      ]
    },
    'FIND-03': {
      points: [
        { id: 'p1', text: '定位到左侧基底节区', accept: ['左侧基底节区', '左基底节区', '左侧基底节'] },
        { id: 'p2', text: '写明累及放射冠区', accept: ['放射冠'] }
      ]
    },
    'FIND-04': {
      rules: '本样本无测量工具，「测量」子项不可评；范围描述仍可评',
      points: [
        { id: 'p1', text: '写明病灶为片状（单发、非多发）', accept: ['片状', '单发', '一处'] },
        { id: 'p2', text: '给出范围实测值约 28mm×19mm', accept: ['28mm×19mm', '28×19mm'] }
      ]
    },
    'FIND-05': {
      points: [
        { id: 'p1', text: '描述边界欠清', accept: ['边界欠清', '边界不清', '边界模糊'] }
      ]
    },
    'FIND-06': {
      rules: '本病例为 MR 平扫，无增强期相；「信号特点」可评，「强化程度」不适用（N/A）',
      points: [
        { id: 'p1', text: '描述 DWI 呈高信号、ADC 图呈低信号（弥散受限）', accept: ['DWI', 'ADC', '弥散受限'] },
        { id: 'p2', text: '描述 T2WI / FLAIR 呈稍高信号', accept: ['T2WI', 'FLAIR'] },
        { id: 'p3', text: '描述强化程度', accept: [] }
      ]
    },
    'FIND-07': {
      points: [
        { id: 'p1', text: '写明脑室系统大小形态正常、中线结构居中', accept: ['脑室', '中线'] },
        { id: 'p2', text: '写明脑沟脑裂未见增宽', accept: ['脑沟', '脑裂'] },
        { id: 'p3', text: '写明颅内未见异常流空影', accept: ['流空影'] }
      ]
    },
    'IMP-01': {
      points: [
        { id: 'p1', text: '给出明确定性诊断（而非"异常信号待查"）', accept: [] },
        { id: 'p2', text: '写明分期（急性期），提示临床可启动再灌注评估', accept: ['急性期', '急性'] }
      ]
    },
    'IMP-02': { points: [{ id: 'p1', text: '诊断定位与影像描述一致（左侧基底节区及放射冠区）', accept: [] }] },
    'IMP-03': { points: [{ id: 'p1', text: '明确诊断急性期脑梗死', accept: ['脑梗死', '脑梗塞', '梗死'] }] },
    'IMP-04': {
      points: [
        { id: 'p1', text: '若表述为"考虑"，须同时给依据或鉴别方向', accept: [] }
      ]
    },
    'IMP-05': { points: [{ id: 'p1', text: '给出肿瘤分期', accept: [] }] },
    'IMP-06': { points: [{ id: 'p1', text: '诊断术语符合规范（如"急性期脑梗死"而非"中风"）', accept: [] }] },
    'IMP-07': {
      points: [{ id: 'p1', text: '给出明确的下一步建议（结合临床、必要时复查）', accept: [] }]
    },
    'IMP-08': { points: [{ id: 'p1', text: '与既往检查比较', accept: [] }] }
  },

  'RC-003': {
    'FIND-01': {
      points: [
        { id: 'p1', text: '描述主病灶的形态与增强表现（含快进快出）', accept: [] },
        { id: 'p2', text: '描述重要阴性征象（门静脉、胆管、脾脏、腹腔、腹膜后）', accept: [] },
        { id: 'p3', text: '段落按类组织、条理清晰', accept: [] }
      ]
    },
    'FIND-02': {
      points: [
        { id: 'p1', text: '先描述主病灶（含碘油沉积与存活灶判断），再描述周围结构', accept: [] },
        { id: 'p2', text: '按解剖顺序组织（肝 → 门静脉/胆管 → 脾/腹腔/腹膜后）', accept: [] }
      ]
    },
    'FIND-03': {
      points: [{ id: 'p1', text: '定位到肝右叶', accept: ['肝右叶', '右肝'] }]
    },
    'FIND-04': {
      rules: '本样本无测量工具，「测量」子项不可评；数目可评',
      points: [
        { id: 'p1', text: '写明病灶为单发肿块（一处）', accept: ['单发', '一处', '一枚'] },
        { id: 'p2', text: '给出大小实测值约 56mm×48mm', accept: ['56mm×48mm', '56×48mm'] }
      ]
    },
    'FIND-05': {
      points: [{ id: 'p1', text: '描述肿块形态不规则', accept: ['不规则', '形态欠规则'] }]
    },
    'FIND-06': {
      points: [
        { id: 'p1', text: '描述动脉期明显强化', accept: ['动脉期', '明显强化'] },
        { id: 'p2', text: '描述门脉期及延迟期强化减退，呈"快进快出"', accept: ['快进快出', '门脉期', '延迟期'] },
        { id: 'p3', text: '描述病灶内碘油沉积情况', accept: ['碘油沉积', '碘油'] }
      ]
    },
    'FIND-07': {
      points: [
        { id: 'p1', text: '写明门静脉主干及左右支通畅、未见充盈缺损', accept: ['门静脉', '充盈缺损'] },
        { id: 'p2', text: '写明肝内外胆管未见扩张、胆囊壁不厚', accept: ['胆管', '胆囊'] },
        { id: 'p3', text: '写明脾脏不大、腹腔未见积液、腹膜后未见肿大淋巴结', accept: ['脾脏', '腹腔', '腹膜后'] }
      ]
    },
    'IMP-01': {
      points: [
        { id: 'p1', text: '回应本次复查目的：疗效评估（碘油沉积是否致密、有无存活灶）', accept: ['疗效', '存活灶', '活性灶'] },
        { id: 'p2', text: '给出随访建议（结合 AFP 及 MR 复查）', accept: ['AFP', '随访', '复查'] }
      ]
    },
    'IMP-02': { points: [{ id: 'p1', text: '诊断定位与描述一致（肝右叶）', accept: [] }] },
    'IMP-03': { points: [{ id: 'p1', text: '明确诊断为肝细胞癌（TACE 术后）', accept: ['肝细胞癌', '肝癌', 'HCC'] }] },
    'IMP-04': {
      points: [{ id: 'p1', text: '对"未见明确存活灶"给出符合规范的表述（不武断判"完全坏死"）', accept: [] }]
    },
    'IMP-05': {
      points: [{ id: 'p1', text: '给出肿瘤分期（临床信息已提供分期依据）', accept: [] }]
    },
    'IMP-06': { points: [{ id: 'p1', text: '诊断术语符合规范（如"肝细胞癌 TACE 术后"）', accept: [] }] },
    'IMP-07': {
      points: [
        { id: 'p1', text: '建议结合 AFP 复查', accept: ['AFP', '甲胎蛋白'] },
        { id: 'p2', text: '建议 MR 复查随访', accept: ['MR', '磁共振'] }
      ]
    },
    'IMP-08': {
      points: [{ id: 'p1', text: '与既往检查（术前/前次 TACE）比较', accept: [] }]
    }
  }
}

/* ══════════════════════════════════════════════════════════════
   手写要点集数据（3 例有金标准的病例）
   ══════════════════════════════════════════════════════════════ */

export const RUBRIC = {
  ...Object.fromEntries(
    Object.entries(CONTENT_ITEMS).map(([caseId, items]) => [
      caseId,
      { version: 1, updatedAt: '2026-09-19', updatedBy: '教研', items }
    ])
  ),
  // 院方素材样例：要点集由 AI 从金标准抽取，待教研校正（见 samples-seu.js 头部说明）
  ...Object.fromEntries(
    Object.entries(SEU_RUBRIC).map(([caseId, items]) => [
      caseId,
      { version: 1, updatedAt: '2026-09-19', updatedBy: '院方素材导入 · AI 抽取', items }
    ])
  ),
  // 公开数据集样例（NSCLC-Radiomics）：要点集由 AI 从标准报告抽取，待教研校正（见 samples-pub.js 头部说明）
  ...Object.fromEntries(
    Object.entries(PUB_RUBRIC).map(([caseId, r]) => [
      caseId,
      { version: 1, updatedAt: '2026-09-20', updatedBy: '公开数据集导入 · AI 抽取', items: r.items }
    ])
  )
}

/* ══════════════════════════════════════════════════════════════
   解析：把要点集 + 能力位解析成"每条要点是否可评"
   ══════════════════════════════════════════════════════════════ */

function rulesFor(code) {
  return POINT_RULES.filter(r => r.code === code)
}

/**
 * 解析某病例的完整评分表：R1 表结构 + 要点集 + 逐要点可评性 + 可评分。
 * @returns {{caseId, version, items: Array, itemByCode: Object, scoreableMax: number, unassessable: Array}}
 */
export function resolveRubric(caseId, capabilities) {
  const sample = SAMPLE_BY_ID[caseId]
  const caps = capabilities || CAPABILITIES[caseId] || {}
  const hand = (RUBRIC[caseId] && RUBRIC[caseId].items) || {}
  const gen = sample ? genericItems(sample) : {}

  const items = R1_ITEMS.map(base => {
    const src = hand[base.code] || gen[base.code] || { points: [{ id: 'p1', text: base.name, accept: [] }] }
    const rules = rulesFor(base.code)

    const points = (src.points || []).map(p => {
      // 注意：同一 code 可能有多条规则（如 IMP-05 有「非肿瘤→N/A」与「肿瘤但信息不足→不可评」两条），
      // 必须**先筛出选择器命中的规则、再取第一条真正生效的**，不能用 find 一把梭——
      // find 会在第一条"选择器命中但条件不成立"的规则上停下，后面的规则永远不会被评估。
      const matched = rules.filter(r => (r.whole ? true : (r.match ? r.match.test(`${p.id} ${p.text}`) : false)))
      const applied = matched.find(r => r.when(caps)) || null
      return {
        id: p.id,
        text: p.text,
        accept: p.accept || [],
        assessable: !applied,
        nAReason: applied ? applied.why : '',
        nASource: applied ? applied.source : ''
      }
    })

    const assessablePoints = points.filter(p => p.assessable)
    // 条目可评满分 = 条目满分 × 可评要点数 / 要点总数
    const scoreableFull = points.length
      ? Math.round(base.score * (assessablePoints.length / points.length) * 100) / 100
      : base.score

    return {
      code: base.code,
      name: base.name,
      dim: base.dim,
      dimFull: base.dimFull,
      full: base.score,
      scoreableFull,
      points,
      rules: src.rules || '',
      wholeNA: assessablePoints.length === 0,
      drops: points
        .filter(p => !p.assessable && p.nASource === 'capability')
        .map(p => ({ pointId: p.id, text: p.text, why: p.nAReason })),
      naPoints: points.filter(p => !p.assessable && p.nASource === 'na').map(p => ({ pointId: p.id, text: p.text, why: p.nAReason }))
    }
  })

  const scoreableMax = Math.round(items.reduce((a, i) => a + i.scoreableFull, 0) * 10) / 10

  const unassessable = items
    .filter(i => i.scoreableFull < i.full)
    .map(i => ({
      code: i.code, name: i.name, full: i.full, scoreableFull: i.scoreableFull,
      lost: Math.round((i.full - i.scoreableFull) * 10) / 10,
      source: i.drops.length ? 'capability' : 'na',
      why: (i.drops[0] || i.naPoints[0] || {}).why || ''
    }))

  return {
    caseId,
    version: (RUBRIC[caseId] && RUBRIC[caseId].version) || 0,
    items,
    itemByCode: Object.fromEntries(items.map(i => [i.code, i])),
    scoreableMax,
    unassessable
  }
}

/** 是否已有手写要点集（管理端用来区分"待抽取"与"已维护"） */
export function hasHandRubric(caseId) {
  const it = RUBRIC[caseId]
  return !!(it && it.items && Object.keys(it.items).length)
}

/** 可评分（替代原条目级 scoreableOf）：按要点级现算 */
export function scoreableOf(caseId, capabilities) {
  const r = resolveRubric(caseId, capabilities)
  return {
    max: r.scoreableMax,
    lost: r.unassessable.map(u => ({ code: u.code, source: u.source, score: u.lost, label: u.name, why: u.why }))
  }
}

/** 整卷加权可评分（组卷侧；训练侧不用） */
export function weightedScoreable(refs) {
  if (!refs || !refs.length) return { max: 0, lost: [] }
  const totalWeight = refs.reduce((a, r) => a + (r.weight || 0), 0)
  if (!totalWeight) return { max: 0, lost: [] }
  let sum = 0
  const lost = []
  refs.forEach(r => {
    const s = scoreableOf(r.caseId)
    sum += s.max * (r.weight || 0)
    s.lost.forEach(l => lost.push({ ...l, caseId: r.caseId }))
  })
  return { max: Math.round((sum / totalWeight) * 10) / 10, lost }
}

/** 三段名称（管理端要点集区块展示用） */
export const RUBRIC_SEGMENTS = SEGMENTS

/** R1 表结构（管理端要点集区块按维度分组展示用） */
export const RUBRIC_TABLE = R1_TABLE
