// 影像描述「要素覆盖」判定（PRD §6.2 提示栏的 ●已覆盖 / ?存疑 / ○缺失）
//
// ⚠️ 本期是**前端关键词启发式**，不是模型判读。服务端就绪后本文件的 `evaluateCoverage`
// 换成接口调用（入参：金标准 + 学生文本；出参同形），页面不动。
//
// 三档语义：
//   ok    已覆盖 —— 该类要素有实质性描述
//   doubt 存疑   —— 提到了但过于笼统（如只写"密度尚可"却无具体分度）
//   miss  缺失   —— 通篇未涉及

import { COVERAGE_ELEMENTS } from '@ai-sp/shared/imaging'

/** 各类要素的关键词/句式线索 */
const CLUES = {
  location: {
    strong: /(左|右|双|双侧)?(肺|叶|段|基底节|放射冠|脑室|肝|脾|肾|胰|纵隔|胸膜|脑沟|中线|门静脉|胆管|胫骨|平台|鼻咽|淋巴结)/,
    weak: /(部位|范围|累及|邻近|位于)/
  },
  size: {
    strong: /\d+(\.\d+)?\s*(mm|cm|毫米|厘米)/i,
    weak: /(大小|直径|长径|短径|范围约|数目|单发|多发|一枚|结节数)/
  },
  margin: {
    strong: /(分叶|毛刺|光整|欠清|清晰|边界|棘状|胸膜牵拉|钙化|坏死|囊变)/,
    weak: /(形态|边缘|轮廓|规则|不规则)/
  },
  density: {
    strong: /(密度|信号|强化|低信号|高信号|等信号|实性|磨玻璃|T1|T2|DWI|ADC|FLAIR|碘油|平扫|动脉期|门脉期|延迟期|快进快出)/i,
    weak: /(均匀|不均匀|稍高|稍低)/
  },
  negative: {
    strong: /(未见|未显示|无明确|未见明确|阴性|不厚|不大|通畅|正常|居中|未见充盈缺损)/,
    weak: /(其余|其他|余肺|对侧)/s
  }
}

/** 各要素"写得不够"时的补充提示（对照右侧栏用） */
export const ELEMENT_TIP = {
  location: '建议写明所在器官与叶段、单发或多发、累及范围及与邻近结构的关系。',
  size: '建议给出长径与短径（有测量工具时写实测值），并说明测量层面。',
  margin: '建议描述边缘是否光整、有无分叶、毛刺、棘状突起或周围牵拉。',
  density: '建议写明平扫密度/信号特点，以及有无强化、强化方式与程度。',
  negative: '建议补写重要阴性征象：周围有无肿大淋巴结、有无积液、有无骨质破坏、其余脏器有无异常。'
}

/**
 * @param {string} findingsText 影像所见段正文
 * @param {object} [sample] 样本（保留入参：服务端判读时要用金标准与能力位）
 * @returns {Array<{key,name,mark,text}>}
 */
export function evaluateCoverage(findingsText, sample) {
  const text = String(findingsText || '')
  const empty = !text.trim()
  return COVERAGE_ELEMENTS.map(el => {
    const clue = CLUES[el.key]
    let mark = 'miss'
    let detail = '尚未涉及'
    if (!empty) {
      if (clue.strong.test(text)) {
        mark = 'ok'
        detail = '已描述'
      } else if (clue.weak.test(text)) {
        mark = 'doubt'
        detail = '提到但不够具体'
      }
    }
    // 能力位导致的"描述不了"要如实说明，别让学生以为是自己漏了（PRD §5.2.2 先救后兜）
    if (el.key === 'size' && sample && !sample.capabilities?.hasMeasurement && mark !== 'miss') {
      detail = '已描述（本期影像控件无测量工具，只能目测，不要求实测值）'
    }
    if (el.key === 'density' && sample && !sample.capabilities?.hasEnhancedPhase && mark === 'doubt') {
      detail = '提到但不够具体（本病例无增强期相，"强化程度"不作为得分点）'
    }
    return { key: el.key, name: el.name, mark, text: detail }
  })
}
