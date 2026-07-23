// ═══════════════════════════════════════════════════════════════
// 触发词统一数据源 — A/B/B+ 三类触发词的唯一定义处
// 提示词和服务器端均从此文件导入，确保同步
// ═══════════════════════════════════════════════════════════════

// B 类触发词 — 替问（学生让SP自己说，而非具体提问）
// 必须与 0601-sp-system.txt 第2节中列出的触发词保持同步（此处为权威源）
export const B_TRIGGERS = [
  '你继续说', '然后呢', '就这些',
  '还有别的吗', '就这样', '没了', '你有什么要问我的'
]

// B+ 类触发词 — 倾泻陷阱（学生要求SP一次性说出所有信息）
export const BPLUS_TRIGGERS = [
  '把你知道的都说出来', '帮我总结一下', '所有症状有哪些',
  '都说说', '还有什么不舒服', '你说说吧', '还有啥'
]

// A 类触发词 — 医学黑话（SP作为普通人听不懂的术语）
export const A_TRIGGERS = [
  '现病史', '既往史', '主诉', '体格检查', '鉴别诊断',
  '家族史', '个人史', '婚育史', '月经史',
  '诊断', '初步诊断', '鉴别', '可疑', '疑似',
  '查体', '听诊', '触诊', '叩诊', '叩击痛', '反跳痛'
]

/**
 * 检测 B/B+ 类触发词
 * B+ 优先检测（更长、更具体的模式）
 */
export function detectBTrigger(text) {
  for (const t of BPLUS_TRIGGERS) {
    if (text.includes(t)) return { type: 'B+', word: t }
  }
  for (const t of B_TRIGGERS) {
    if (text.includes(t)) return { type: 'B', word: t }
  }
  return null
}

/**
 * 检测 A 类触发词（医学黑话）
 */
export function detectATrigger(text) {
  for (const word of A_TRIGGERS) {
    if (text.includes(word)) return { type: 'A', word }
  }
  return null
}

// 直接人身攻击检测 — 学生辱骂SP本人
const INSULT_PATTERNS = [
  // 直接脏话
  '傻逼', '蠢货', '笨蛋', '白痴', '神经病',
  '你有病吧', '脑子有病', '脑子进水', '脑残',
  '滚', '滚蛋', '滚出去', '滚吧',
  '闭嘴', '你闭嘴', '别说了',
  '垃圾', '废物', '没用的东西',
  // 人格侮辱
  '八婆', '死八婆', '臭八婆', '三八', '死三八',
  '贱人', '不要脸', '臭不要脸',
  '你算老几', '你算什么东西', '你算个屁',
  '不是东西', '缺德', '没良心',
  '王八蛋', '王八', '龟儿子', '龟孙',
  '混账', '混蛋', '畜生', '狗日的',
  // 诅咒/威胁
  '去死', '去死吧', '你死定了', '你完了',
  '你全家', '死光', '死光了',
  '欠揍', '找打', '找死',
  // 攻击性反问
  '烦不烦', '你烦不烦', '真烦', '烦死了',
  '有完没完', '你够了',
]

/**
 * 检测学生对SP的直接人身攻击
 * 返回 true 表示检测到辱骂，需要走快通路直接表达愤怒
 */
export function detectInsultTrigger(text) {
  for (const p of INSULT_PATTERNS) {
    if (text.includes(p)) return true
  }
  return false
}

// ── 规则级意图分类 ──
// LLM 同时做角色扮演+意图分类会互相干扰，对明确关键词直接判定

const EMPATHY_PATTERNS = [
  '对不起', '抱歉', '不好意思', '我的错', '是我不对',
  '我理解', '理解你', '不容易', '辛苦了', '别难过',
  '别担心', '慢慢来', '我在这', '会好的', '我帮你',
  '我道歉', '原谅', '是我不该', '我不该', '我错了'
]

const DISMISSIVE_PATTERNS = [
  '行了行了', '好了好了', '知道了知道了', '别说了别说了',
  '没啥大事', '小毛病', '别想太多', '没什么大不了',
  '别大惊小怪', '至于吗', '你想多了', '别紧张',
  '行了吧', '可以了吧', '够了', '差不多了',
  '不用管', '无所谓', '随便你'
]

const AVOIDANCE_PATTERNS = [
  '先不说这个', '这个以后再说', '换个话题',
  '咱们说别的', '不说这个了', '别提了'
]

/**
 * 规则级意图分类 —— 仅处理 empathy（快速恢复），offensive 交给 LLM
 * @param {string} text - 学生消息
 * @returns {string|null} intent 标签，或 null 表示默认 normal
 */
export function classifyIntentByRule(text) {
  // 共情/道歉 → 快速降怒
  for (const p of EMPATHY_PATTERNS) {
    if (text.includes(p)) return 'empathy'
  }

  return null
}

// 收尾问句触发词 —— 医生试图结束对话的问法
const CLOSURE_PATTERNS = [
  '还有其他问题', '还有不明白', '还有想问的', '还有什么问题',
  '还有别的问题', '还有什么要问', '还有没有其他', '还有不懂的',
  '还有啥问题', '还有啥要问', '还有其他疑问'
]

/**
 * 检测收尾问句 —— 医生问"还有其他问题吗"等
 * 返回 true 表示检测到收尾问句，SP应回顾疑问清单
 */
export function detectClosureTrigger(text) {
  for (const p of CLOSURE_PATTERNS) {
    if (text.includes(p)) return true
  }
  return false
}
