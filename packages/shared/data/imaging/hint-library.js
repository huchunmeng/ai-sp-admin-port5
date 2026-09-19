// 三级提示阶梯（PRD §5.2.3 / §5.7）—— 训练模式专用，考核模式锁定不下发
//
// 三级语义（学生主动请求，点一次深一级，也可直接要 L3）：
//   L1 体裁提示 —— 这段**规范上**应包含哪些要素，完全不涉及本病例
//   L2 指向提示 —— 指出本病例**还缺哪一类**
//   L3 要点提示 —— 给该类**要点词**，仍不给金标准原句
//
// 配额：L1 不限；L2 每段每回合 3 次；L3 每段每回合 1 次；同级冷却 10 秒；重写不重置（新回合才重置）。
//
// ⚠️ 红线（PRD §9.5）：所有文案与金标准的**最长公共子串必须 ≤ 8 字**，且不得命中结论词表 /
// 病例特有事实词表。故本库只写"要素名 / 要点词"，**绝不出现病灶名、部位、大小、密度等事实词**。
// 服务端实现时这里改成模型输出 + 出站校验；本库是本期无服务端时的等价静态实现。

import { COVERAGE_ELEMENTS } from './r1-table.js'

const TEXT = {
  technique: {
    L1: '检查技术段建议覆盖：检查部位 / 检查类型 / 检查技术（扫描方式、层厚、是否增强）。',
    elementName: { part: '检查部位', type: '检查类型', method: '检查技术规范' },
    L2: {
      part: '本病例的检查技术段中，检查部位尚未写明。',
      type: '本病例的检查技术段中，检查类型（平扫 / 增强）尚未交代。',
      method: '本病例的检查技术段中，扫描方式与层厚等规范性内容尚未涉及。'
    },
    L3: {
      part: '可关注：解剖部位与侧别、扫描范围上界下界。',
      type: '可关注：平扫还是增强、有几个期相、是否含特殊序列。',
      method: '可关注：扫描方式、层厚、重建方式、对比剂用法与用量。'
    }
  },
  findings: {
    L1: '影像所见建议覆盖：部位与范围、数目与大小、形态与边界、密度/信号/强化程度、重要阴性征象。',
    elementName: Object.fromEntries(COVERAGE_ELEMENTS.map(e => [e.key, e.name])),
    L2: {
      location: "本病例的影像所见中，'部位与范围'一类尚未涉及。",
      size: "本病例的影像所见中，'数目与大小'一类尚未涉及。",
      margin: "本病例的影像所见中，'形态与边界'一类尚未涉及。",
      density: "本病例的影像所见中，'密度/信号/强化程度'一类尚未涉及。",
      negative: "本病例的影像所见中，'重要阴性征象'一类尚未涉及。"
    },
    L3: {
      location: '可关注：所在器官与叶段、单发还是多发、累及范围与邻近结构关系。',
      size: '可关注：长径与短径、测量层面、数目表述方式。',
      margin: '可关注：边缘是否光整、有无分叶、毛刺、棘状突起、周围牵拉。',
      density: '可关注：平扫密度或信号特点、有无强化、强化方式与程度、内部有无坏死或钙化。',
      negative: '可关注：病变周围有无肿大淋巴结、有无积液、有无骨质破坏、其余脏器有无异常。'
    }
  },
  impression: {
    L1: '诊断意见段建议覆盖：是否回答临床问题 / 定位与定性诊断 / 诊断依据或鉴别 / 对临床的下一步建议。',
    elementName: { answer: '回答临床问题', diagnosis: '定位与定性诊断', basis: '诊断依据与鉴别', advice: '给临床的建议' },
    L2: {
      answer: '本病例的诊断意见中，临床所问的问题尚未正面回应。',
      diagnosis: '本病例的诊断意见中，定位与定性倾向尚未给出。',
      basis: '本病例的诊断意见中，诊断依据或需要鉴别的方向尚未交代。',
      advice: '本病例的诊断意见中，对临床的下一步建议尚未给出。'
    },
    L3: {
      answer: '可关注：临床申请单上问了什么、逐条对应作答。',
      diagnosis: '可关注：先定位后定性、确定诊断与可能诊断分开表述。',
      basis: '可关注：支持该诊断的征象组合、需要排除的其他可能。',
      advice: '可关注：是否建议进一步检查、建议哪种检查、随访间隔。'
    }
  }
}

/** 各段的要素清单（L2/L3 的指向对象） */
export const HINT_ELEMENTS = {
  technique: [
    { key: 'part', name: '检查部位' },
    { key: 'type', name: '检查类型' },
    { key: 'method', name: '检查技术规范' }
  ],
  findings: COVERAGE_ELEMENTS,
  impression: [
    { key: 'answer', name: '回答临床问题' },
    { key: 'diagnosis', name: '定位与定性诊断' },
    { key: 'basis', name: '诊断依据与鉴别' },
    { key: 'advice', name: '给临床的建议' }
  ]
}

const LEVEL_NAME = { L1: '体裁提示', L2: '指向提示', L3: '要点提示' }
const SEGMENT_NAME = { technique: '检查技术', findings: '影像所见', impression: '诊断意见' }

/**
 * 生成一条提示，形状对齐 PRD §5.7.1 响应体（items 只用 clientVisible 字段）。
 *
 * @param {'technique'|'findings'|'impression'} segment
 * @param {'L1'|'L2'|'L3'} level
 * @param {string} [elementKey] L2/L3 指向的要素；缺省时取该段第一个要素
 * @returns {{ level, segment, title, items: Array<{kind:'missing', text:string}> }}
 */
export function hintFor(segment, level, elementKey) {
  const lib = TEXT[segment] || TEXT.findings
  const segName = SEGMENT_NAME[segment] || '影像所见'
  const title = `${level} ${LEVEL_NAME[level]} · ${segName}`
  if (level === 'L1') {
    return { level, segment, title, items: [{ kind: 'missing', text: lib.L1 }] }
  }
  const key = elementKey || (HINT_ELEMENTS[segment] || HINT_ELEMENTS.findings)[0].key
  const text = (lib[level] && lib[level][key]) || lib.L1
  return { level, segment, title, items: [{ kind: 'missing', text }] }
}

/** 独立成文的提示正文（UI 直接展示用；等价于把 items 逐个取 text 拼起来） */
export function hintBody(segment, level, elementKey) {
  return hintFor(segment, level, elementKey).items.map(i => i.text).join('\n')
}

/** 配额默认值（PRD §5.2.3）—— 按「段 × 回合」发放，用完不补 */
export const DEFAULT_QUOTA = { l2: 3, l3: 1 }
export const HINT_COOLDOWN_MS = 10 * 1000

export const HINT_LEVELS = [
  { value: 'L1', label: 'L1 体裁提示', desc: '这段规范上应包含哪些要素（不涉及本病例）' },
  { value: 'L2', label: 'L2 指向提示', desc: '指出本病例还缺哪一类' },
  { value: 'L3', label: 'L3 要点提示', desc: '给该类要点词，不给金标准原句' }
]
