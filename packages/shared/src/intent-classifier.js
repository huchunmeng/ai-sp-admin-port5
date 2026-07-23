// ═══════════════════════════════════════════════════════════════
// 意图分类规则库 v1.0
// 优先级：attack > noise > offensive > friendly > neutral
// 用途：服务端兜底，当 LLM 意图分类明显错误时修正
// ═══════════════════════════════════════════════════════════════

// ── 规则定义 ──
// 每条规则：{ intent, patterns, description }
// patterns 匹配一个即命中，按数组顺序检查（优先级从高到低）

const RULES = [
  // ═══ Level 1: attack（辱骂/驱赶/人身攻击）═══
  {
    intent: 'attack',
    description: '脏话辱骂',
    patterns: [
      /傻[逼屄比子]/, /煞笔/, /沙雕/, /智障/, /脑残/, /废物/, /垃圾/,
      /他妈/, /你[他她]妈/, /操[你尼]/, /[日草艹]你/, /大爷的/, /龟孙/,
      /狗[日东西]/, /贱[人货]/, /婊/, /畜[生牲]/,
      /八婆/, /扑街/, /[Cc][Nn][Mm]/, /[Ff][Uu][Cc][Kk]/, /[Ss][Hh][Ii][Tt]/,
    ]
  },
  {
    intent: 'attack',
    description: '驱赶/威胁',
    patterns: [
      /^滚$/, /^滚蛋$/, /^滚出去$/, /^滚开$/,
      /你算老几/, /你什么东西/, /你配吗/,
      /闭嘴/, /欠揍/, /找死/, /会不会说话/,
      /投诉你/, /换医生/, /叫主任/, /喊人来/,
    ]
  },
  {
    intent: 'attack',
    description: '人格侮辱',
    patterns: [
      /死[老太婆八婆胖子肥婆瘸子哑巴瞎子聋子]/,
      /你有病/, /神经病/, /变态/,
      /不是人/, /没人性/, /没良心/,
      /狗屁/, /放屁/, /扯淡/,
    ]
  },
  // ═══ Level 2: noise（单字/无意义敷衍，需在offensive之前，否则"哦"被误判为offensive）═══
  {
    intent: 'noise',
    description: '纯单字或无意义',
    patterns: [
      /^嗯[。！，…]*$/,
      /^哦[。！，…]*$/,
      /^啊[。！，…]*$/,
      /^呃[。！，…]*$/,
      /^呵[呵哦]?[。！，…]*$/, /^哈[哈]?[。！，…]*$/,
      /^嘿[嘿]?[。！，…]*$/, /^唉[。！，…]*$/, /^哎[。！，…]*$/,
      /^\?+$/, /^！+$/, /^。+$/,
    ]
  },
  {
    intent: 'noise',
    description: '非医学无关话题',
    patterns: [
      // 政治人物/事件
      /特朗普/, /拜登/, /习近平/, /普京/, /泽连斯基/, /选举/, /总统/, /主席/,
      /政治局/, /国务院/, /人大/, /政协/, /共产党/, /国民党/,
      /俄乌/, /巴以/, /战争/, /打仗/, /军事/, /核武器/, /原子弹/,
      /台湾独立/, /台独/, /藏独/, /疆独/, /香港独立/,
      // 天气
      /天气/, /下雨/, /下雪/, /刮风/, /台风/, /雾霾/,
      // 娱乐/体育
      /明星/, /八卦/, /娱乐圈/, /综艺/, /追剧/,
      /足球/, /篮球/, /NBA/, /世界杯/, /欧冠/, /英超/, /中超/,
      /王者荣耀/, /原神/, /吃鸡/, /LOL/, /电竞/,
      // 金融/房产
      /股票/, /基金/, /房价/, /比特币/, /区块链/,
      // 其他非医学闲聊
      /外星人/, /UFO/, /穿越/, /修仙/,
    ]
  },

  // ═══ Level 3: offensive（催促/轻视/否定/挑衅/冷漠命令）═══
  {
    intent: 'offensive',
    description: '催促命令',
    patterns: [
      /^快点/, /^快说/, /说快点/, /别磨蹭/, /赶紧/,
      /别废话/, /少废话/, /长话短说/, /直接[说讲]/,
      /说重点/, /讲重点/, /说下去/, /别绕弯/, /绕弯子/,
    ]
  },
  {
    intent: 'offensive',
    description: '轻视否定',
    patterns: [
      /装的吧/, /装的呀/, /假装的/, /演的吧/,
      /想多了/, /至于吗/, /这也叫病/, /这算什么/,
      /小题大做/, /大惊小怪/, /矫情/,
      /这不就是.*吗/, /才.*就/, /哪有那么/, /哪有这么/,
    ]
  },
  {
    intent: 'offensive',
    description: '冷漠敷衍',
    patterns: [
      /随便/, /无所谓/, /爱[怎咋]/, /管[你我他她]呢/,
      /不关我事/, /跟我没关系/,
    ]
  },
  {
    intent: 'offensive',
    description: '挑衅对抗',
    patterns: [
      /投诉吧/, /去投诉/, /你投诉/, /等着你/, /我等[着看]/,
      /快去呀/, /怎么不去/, /你试试/, /来呀/, /你来/,
      /有种/, /你敢/, /我怕你/,
      /然后呢\s*$/, /就这/, /继续[呀啊]?$/,
      /再说[呀啊]?$/, /就这[样]?[。！]?$/,
    ]
  },
  // ═══ Level 4: friendly（打招呼/道歉/安抚/共情）═══
  {
    intent: 'friendly',
    description: '打招呼',
    patterns: [
      /^你好/, /^您好/, /^嗨/, /^hello/i, /^hi\b/i,
      /早上好/, /下午好/, /晚上好/, /大夫好/, /医生好/,
    ]
  },
  {
    intent: 'friendly',
    description: '道歉认错',
    patterns: [
      /对不起/, /抱歉/, /不好意思/, /我的错/, /我错了/,
      /我不该/, /我态度不好/, /我太冲动了/, /请原谅/,
      /是我不好/, /怪我/, /我不对/,
    ]
  },
  {
    intent: 'friendly',
    description: '安抚共情',
    patterns: [
      /别担心/, /别怕/, /没事的/, /会好的/, /慢慢说/, /不着急/,
      /辛苦了/, /不容易/,
      /我理解/, /我明白/, /我知道你/,
      /放松/, /没关系/, /不要紧/,
    ]
  },

]

// ── 人文沟通站专用规则 ──
// 在人文站中，学生回避SP疑问、将对话拉回病史采集模式 → offensive

const HUMANITY_OFFENSIVE_PATTERNS = [
  // 明确回避SP的沟通议题，要求先说病史
  /你先说[说下]你.*情况/,
  /先别管那[个些].*先.*说/,
  /这些.*先.*不说.*先.*告[诉诉]/,
  /先不说这个.*你.*怎么/,
  /咱们.*先.*聊.*病[情史]/,
  /我先.*了解.*病[情史况]/,
  // 拒绝回应SP疑问，转向问诊
  /你先.*回答.*我的.*问题/,
  /我问你.*你.*答.*就/,
  /别.*扯.*别的.*说.*病/,
]

function classifyHumanityOffensive(text) {
  const trimmed = text.trim()
  for (const pattern of HUMANITY_OFFENSIVE_PATTERNS) {
    if (pattern.test(trimmed)) return true
  }
  return false
}

/**
 * 对输入文本进行意图分类
 * @param {string} text - 学生输入
 * @returns {{ intent: string, rule: string|null }} 分类结果
 */
export function classifyIntent(text) {
  const trimmed = text.trim()
  if (!trimmed) return { intent: 'noise', rule: 'empty' }

  for (const rule of RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(trimmed)) {
        return { intent: rule.intent, rule: rule.description }
      }
    }
  }

  return { intent: 'neutral', rule: null }
}

/**
 * 修正 LLM 输出的意图（仅当明显错误时修正）
 * 策略：只在规则库明确命中且与 LLM 判断冲突时才修正
 *   - LLM 判 noise/neutral，但规则命中了 attack/offensive → 修正
 *   - LLM 判 noise，但规则命中了 friendly → 修正
 *   其他情况保留 LLM 判断
 */
export function correctIntent(llmIntent, text, mode = 'history-taking') {
  const ruleResult = classifyIntent(text)

  // ── 人文站专用：检测病史回拉 → offensive ──
  if (mode === 'humanistic-comm' && classifyHumanityOffensive(text)) {
    if (llmIntent === 'neutral' || llmIntent === 'friendly') {
      return 'offensive'
    }
  }

  // 规则命中 neutral（无 offensive/attack 模式），LLM 判 offensive/attack → 降级
  // 必须放在 !ruleResult.rule 检查之前，因为 neutral 的 rule=null
  if (ruleResult.intent === 'neutral' && (llmIntent === 'offensive' || llmIntent === 'attack')) {
    return 'neutral'
  }

  // 规则未命中 → 信任 LLM
  if (!ruleResult.rule) return llmIntent

  // 规则命中 attack → 一定修正（脏话漏判是严重问题）
  if (ruleResult.intent === 'attack' && llmIntent !== 'attack') {
    return 'attack'
  }

  // 规则命中 offensive，LLM 判 noise/neutral → 修正
  if (ruleResult.intent === 'offensive' && (llmIntent === 'noise' || llmIntent === 'neutral')) {
    return 'offensive'
  }

  // 规则命中 offensive（但未命中 attack），LLM 判 attack → 降级
  // （"快点说别磨蹭"不应被判为辱骂）
  if (ruleResult.intent === 'offensive' && llmIntent === 'attack') {
    return 'offensive'
  }

  // 规则命中 friendly，LLM 判 noise/neutral/offensive/attack → 全部修正
  // （furiuos等状态下LLM容易把道歉/安抚误判）
  if (ruleResult.intent === 'friendly' && llmIntent !== 'friendly') {
    return 'friendly'
  }

  // 规则命中 noise，LLM 判 neutral → 修正（纯"嗯"不应被判 neutral）
  if (ruleResult.intent === 'noise' && llmIntent === 'neutral') {
    return 'noise'
  }
  // 规则命中 noise，LLM 判 offensive → 修正（单字"哦/嗯"是敷衍不是冒犯）
  if (ruleResult.intent === 'noise' && llmIntent === 'offensive') {
    return 'noise'
  }
  // 其余情况保留 LLM 判断
  return llmIntent
}

export { RULES }
