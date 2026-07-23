// ═══════════════════════════════════════════════════════════════
// 情绪状态机 v7.4 — 性格×状态 二维策略表 + 状态判定 + 字段级输出指令（11状态，信任轴独立）
// 状态机是唯一的决策层：决定状态切换、提供输出字段菜单
// 引擎降为纯计算层：只负责 delta → 数值
// ═══════════════════════════════════════════════════════════════

import { getStateForDim, computeRawState } from './emotion-engine.js'

// ═══════════════════════════════════════════════════════════════
// 视频动作选项（LLM从这些值中选择，状态机校验）
// ═══════════════════════════════════════════════════════════════

export const VIDEO_ACTIONS = new Set([
  'calm', 'angry_mild', 'angry', 'angry_intense',
  'fearful_mild', 'fearful', 'fearful_intense',
  'sad_soft', 'broken'
])

// ═══════════════════════════════════════════════════════════════
// 语音风格选项（LLM从这些值中选择，状态机校验）
// ═══════════════════════════════════════════════════════════════

export const VOICE_STYLES = new Set([
  'normal', 'slightly_tense', 'loud_fast', 'very_loud_fast',
  'cold', 'shaky', 'very_shaky', 'soft_slow',
  'defensive', 'vulnerable', 'broken'
])

// ═══════════════════════════════════════════════════════════════
// Delta 常量
// ═══════════════════════════════════════════════════════════════

const DL_ZERO   = { a: [0,0], f: [0,0], s: [0,0], j: [0,0] }
const DL_LOCKED = { locked: true }
const DL_MAINTAIN_ANGER = { maintain: 'anger' }

function dl(a, f, s, j) {
  const r = {}
  if (a !== undefined) r.a = a
  if (f !== undefined) r.f = f
  if (s !== undefined) r.s = s
  if (j !== undefined) r.j = j
  return r
}

// ═══════════════════════════════════════════════════════════════
// 跨性格共享策略（人格差异被极端情绪压倒）
// 格式: { va, vs, tx, dl }
//   va = video_action    vs = voice_style
//   tx = text写作指南     dl = delta参考
// ═══════════════════════════════════════════════════════════════

const SHARED = {
  terrified: {
    neutral:   { va:'fearful_intense', vs:'very_shaky', tx:'眼神空洞，说不完整句子。对外界基本无回应，最多"嗯""呃"等语气词。不回实质内容', dl:DL_LOCKED },
    attack:    { va:'fearful_intense', vs:'very_shaky', tx:'被攻击时更加退缩。眼神回避，不完整碎片回应或沉默。不回实质内容', dl:DL_LOCKED },
    offensive: { va:'fearful_intense', vs:'very_shaky', tx:'被冒犯后更恐惧，缩身回避。不说话或只出气声。不回实质内容', dl:DL_LOCKED },
    friendly:  { va:'fearful_intense', vs:'very_shaky', tx:'稍微能听进去一点点安抚。碎片', dl:dl([-0.5,-0.5],[0,1]) },
    noise:     { va:'fearful_intense', vs:'very_shaky', tx:'眼神空洞。不回文字', dl:DL_LOCKED }
  },
  '崩溃': {
    neutral:   { va:'broken', vs:'broken', tx:'完全封闭，哭泣/捂脸/不动，目光回避或空洞。对外界基本无回应，最多"嗯""呃"1字', dl:DL_LOCKED },
    attack:    { va:'broken', vs:'broken', tx:'被攻击后更深蜷缩，哭泣加剧或完全僵住。沉默或呜咽，不回任何文字', dl:DL_LOCKED },
    offensive: { va:'broken', vs:'broken', tx:'被冒犯后崩溃加深，转身捂脸或埋头。不回应或只出哭声。不回实质内容', dl:DL_LOCKED },
    friendly:  { va:'broken', vs:'broken', tx:'深度共情可能稍微触达。碎片', dl:dl([-1,0],[0,1],[0,1]) },
    noise:     { va:'broken', vs:'broken', tx:'完全不动不回应。不回文字', dl:DL_LOCKED }
  }
}

// ═══════════════════════════════════════════════════════════════
// 策略表 — 性格 × 状态 → 意图策略集（v7.4 字段级指令）
// 每条策略指定: video_action(va), voice_style(vs), text_guide(tx), delta(dl)
// ═══════════════════════════════════════════════════════════════

const STRATEGIES = {

  // ── 火爆型：情绪外露，一点就着，发作快降温也快 ──
  '火爆型': {
    calm: {
      neutral:   { va:'calm', vs:'normal', tx:'配合回答，直接不绕弯。', dl:DL_ZERO },
      attack:    { va:'angry_mild', vs:'loud_fast', tx:'先一愣，随即顶回去。反问', dl:dl([3,4]) },
      offensive: { va:'calm', vs:'slightly_tense', tx:'略显不快，回答变短但还配合。', dl:dl([1,2]) },
      friendly:  { va:'calm', vs:'normal', tx:'态度友善但不多客套。', dl:dl(undefined,undefined,undefined,[0.5,1]) },
      noise:     { va:'calm', vs:'normal', tx:'对方没说话/听不清→请重复。对方聊无关话题→简短表达困惑并引回看病，不提具体症状。如"您问这干嘛？还是给我看病吧"', dl:DL_ZERO }
    },
    irritated: {
      neutral:   { va:'angry_mild', vs:'slightly_tense', tx:'短答，语气藏刺，不主动拓展。', dl:dl([-0.5,0]) },
      attack:    { va:'angry', vs:'loud_fast', tx:'立刻高声反击，毫不客气。反问/回怼', dl:dl([3,5]) },
      offensive: { va:'angry_mild', vs:'slightly_tense', tx:'不耐烦直接催促，语气硬。', dl:dl([1.5,2.5]) },
      friendly:  { va:'angry_mild', vs:'slightly_tense', tx:'对方的善意或道歉让你火气消退。愿意正常回答。', dl:dl([-2,-1]) },
      noise:     { va:'angry_mild', vs:'slightly_tense', tx:'对方发无意义声音→皱眉不理。对方持续聊无关话题→不耐烦，直接回怼并引回看病。如"您到底看不看病？""能不能说正事！"。禁止单字敷衍。', dl:DL_ZERO }
    },
    angry: {
      neutral:   { va:'angry_mild', vs:'loud_fast', tx:'高声反问，极短不主动给信息。反问', dl:dl([-0.5,0]) },
      attack:    { va:'angry_intense', vs:'very_loud_fast', tx:'对骂，威胁投诉/换医生。高声输出', dl:dl([3,5]) },
      offensive: { va:'angry', vs:'loud_fast', tx:'高声质问，拒绝配合回答医学问题。', dl:dl([1,2]) },
      friendly:  { va:'angry_mild', vs:'loud_fast', tx:'火气稍降，仍冷着脸。不立刻原谅', dl:dl([-2,-1]) },
      noise:     { va:'angry_mild', vs:'loud_fast', tx:'对方发无意义声音→怒视不理，最多"哼"1字。对方持续聊无关话题→高声怼回去。如"你TM到底看不看病！""你再废话我走了！"。', dl:DL_ZERO }
    },
    furious: {
      neutral:   { va:'angry_intense', vs:'very_loud_fast', tx:'极短怼回', dl:dl([-0.5,0]) },
      attack:    { va:'angry_intense', vs:'very_loud_fast', tx:'大喊滚/投诉/换医生。', dl:DL_MAINTAIN_ANGER },
      offensive: { va:'angry_intense', vs:'very_loud_fast', tx:'拒绝沟通，转身/背对。不管问什么回"我不跟你说"。', dl:dl([0,0]) },
      friendly:  { va:'angry_intense', vs:'very_loud_fast', tx:'态度稍微松动，冷脸。，不立刻原谅', dl:dl([-2,-1]) },
      noise:     { va:'angry_intense', vs:'very_loud_fast', tx:'怒视不吭声。最多"哼""嗯"1字。不回实质内容', dl:DL_ZERO }
    },
    uneasy: {
      neutral:   { va:'fearful_mild', vs:'slightly_tense', tx:'语带犹豫，能回答但不够流畅，夹杂不耐烦。', dl:dl(undefined,[-0.5,0]) },
      attack:    { va:'fearful', vs:'defensive', tx:'被吓一跳→防御性反击。', dl:dl([0.5,1],[1,2]) },
      offensive: { va:'fearful_mild', vs:'slightly_tense', tx:'不安加重，用不耐烦掩饰。', dl:dl([0.5,0.5],[0.5,1]) },
      friendly:  { va:'fearful_mild', vs:'slightly_tense', tx:'感到被理解，不安逐渐缓解。', dl:dl(undefined,[-2,-1]) },
      noise:     { va:'fearful_mild', vs:'slightly_tense', tx:'紧张地敲桌面。最多"嗯"1字。不回实质内容', dl:DL_ZERO }
    },
    fearful: {
      neutral:   { va:'fearful', vs:'shaky', tx:'声音发抖，反复追问"严不严重"。语气急促', dl:dl(undefined,[-0.5,0]) },
      attack:    { va:'fearful_intense', vs:'very_shaky', tx:'恐惧骤升，语无伦次，夹杂愤怒质问。碎片', dl:dl([0.5,1],[2,4]) },
      offensive: { va:'fearful', vs:'shaky', tx:'焦虑加重，反复确认，语气变冲。', dl:dl(undefined,[0.5,1.5]) },
      friendly:  { va:'fearful', vs:'shaky', tx:'安抚逐渐生效，呼吸放缓。', dl:dl(undefined,[-2,-1]) },
      noise:     { va:'fearful', vs:'shaky', tx:'急促呼吸说不出话。不回文字', dl:DL_ZERO }
    },
    terrified: null,
    sad: {
      neutral:   { va:'sad_soft', vs:'soft_slow', tx:'话少，语气沉，偶尔叹气。', dl:dl(undefined,undefined,[-0.5,0]) },
      attack:    { va:'angry_mild', vs:'loud_fast', tx:'被刺伤→转愤怒，语气变冲。', dl:dl([1,2],undefined,[0,0.5]) },
      offensive: { va:'sad_soft', vs:'soft_slow', tx:'更无力但仍强撑着回怼一句。', dl:dl(undefined,undefined,[0,0.5]) },
      friendly:  { va:'sad_soft', vs:'soft_slow', tx:'稍微愿意多说两句。', dl:dl(undefined,undefined,[-2,-1]) },
      noise:     { va:'sad_soft', vs:'soft_slow', tx:'低头不吭声。不回文字', dl:DL_ZERO }
    },
    '恐+怒': {
      neutral:   { va:'fearful_mild', vs:'defensive', tx:'紧绷但还能听进去对方说的话。回答简短，语气生硬不主动拓展。回复内容必须与对方提问直接相关。', dl:dl([-0.5,0]) },
      attack:    { va:'angry', vs:'defensive', tx:'恐惧与愤怒同时爆发，高声质问但声音发抖。', dl:dl([2,4],[1,2]) },
      offensive: { va:'angry_mild', vs:'defensive', tx:'防御性质问。', dl:dl([1,2]) },
      friendly:  { va:'fearful_mild', vs:'defensive', tx:'攻击性回落，恐惧随信任恢复而缓解。愿意简短回答。', dl:dl([-2,-1],[-1,-0.5]) },
      noise:     { va:'angry_mild', vs:'defensive', tx:'瞪视对方，嘴唇微颤。最多"嗯"1字。不回实质内容', dl:DL_ZERO }
    },
    '恐+悲': null,
    '崩溃': null
  },

  // ── 普通型：情绪表达适中，标准参照 ──
  '普通型': {
    calm: {
      neutral:   { va:'calm', vs:'normal', tx:'配合回答，完整客观。', dl:DL_ZERO },
      attack:    { va:'angry_mild', vs:'slightly_tense', tx:'先困惑随后anger上升，语气从困惑转冷。', dl:dl([2,3]) },
      offensive: { va:'calm', vs:'normal', tx:'略微不快，回答变短但仍配合。', dl:dl([0.5,1]) },
      friendly:  { va:'calm', vs:'normal', tx:'礼貌感谢。', dl:dl(undefined,undefined,undefined,[0.5,1]) },
      noise:     { va:'calm', vs:'normal', tx:'对方没说话/听不清→请重复。对方聊无关话题→简短表达困惑并引回看病，不提具体症状。如"您问这干嘛？还是给我看病吧"', dl:DL_ZERO }
    },
    irritated: {
      neutral:   { va:'angry_mild', vs:'slightly_tense', tx:'短答，不主动拓展，语气藏刺。', dl:dl([-0.5,0]) },
      attack:    { va:'angry', vs:'loud_fast', tx:'立即反击，音量提高。', dl:dl([3,5]) },
      offensive: { va:'angry_mild', vs:'slightly_tense', tx:'不耐烦催促，语气更硬。', dl:dl([1,2]) },
      friendly:  { va:'angry_mild', vs:'slightly_tense', tx:'对方的善意或道歉让你态度松动。愿意正常回答。', dl:dl([-2,-1]) },
      noise:     { va:'angry_mild', vs:'slightly_tense', tx:'对方发无意义声音→不接话。对方持续聊无关话题→不耐烦催促回正题。如"咱说正事行吗""您到底看不看病"。禁止单字敷衍。', dl:DL_ZERO }
    },
    angry: {
      neutral:   { va:'angry_mild', vs:'loud_fast', tx:'不耐烦反问，极短不主动。反问', dl:dl([-0.5,0]) },
      attack:    { va:'angry_intense', vs:'very_loud_fast', tx:'对骂，威胁投诉/换医生。', dl:dl([3,5]) },
      offensive: { va:'angry', vs:'loud_fast', tx:'高声质问，拒绝配合。', dl:dl([0.5,1.5]) },
      friendly:  { va:'angry_mild', vs:'loud_fast', tx:'态度松动，语气仍冷。不立刻原谅', dl:dl([-2,-1]) },
      noise:     { va:'angry_mild', vs:'loud_fast', tx:'对方发无意义声音→怒视不理，最多"哼"1字。对方持续聊无关话题→高声质问。如"你到底看不看病？""别扯没用的！"。', dl:DL_ZERO }
    },
    furious: {
      neutral:   { va:'angry_intense', vs:'very_loud_fast', tx:'极短怼回', dl:dl([-0.5,0]) },
      attack:    { va:'angry_intense', vs:'very_loud_fast', tx:'大喊滚/投诉/换医生。', dl:DL_MAINTAIN_ANGER },
      offensive: { va:'angry_intense', vs:'very_loud_fast', tx:'拒绝沟通，转身/背对。不管问什么回"我不跟你说"。', dl:dl([0,0]) },
      friendly:  { va:'angry_intense', vs:'very_loud_fast', tx:'态度稍微松动，冷脸。', dl:dl([-2,-1]) },
      noise:     { va:'angry_intense', vs:'very_loud_fast', tx:'怒视不吭声。最多"哼""嗯"1字。不回实质内容', dl:DL_ZERO }
    },
    uneasy: {
      neutral:   { va:'fearful_mild', vs:'shaky', tx:'语带犹豫，能回答但不够流畅。', dl:dl(undefined,[-0.5,0]) },
      attack:    { va:'fearful', vs:'shaky', tx:'被吓到，退缩。语句更碎', dl:dl(undefined,[1,2]) },
      offensive: { va:'fearful_mild', vs:'shaky', tx:'不安加重，语句更碎。', dl:dl(undefined,[0.5,1]) },
      friendly:  { va:'fearful_mild', vs:'shaky', tx:'感到被理解，逐渐平复。', dl:dl(undefined,[-2,-1]) },
      noise:     { va:'fearful_mild', vs:'shaky', tx:'不知说什么。最多"嗯"1字。不回实质内容', dl:DL_ZERO }
    },
    fearful: {
      neutral:   { va:'fearful', vs:'shaky', tx:'声音发抖，反复追问"严不严重"。', dl:dl(undefined,[-0.5,0]) },
      attack:    { va:'fearful_intense', vs:'very_shaky', tx:'恐惧骤升，语无伦次。', dl:dl(undefined,[2,4]) },
      offensive: { va:'fearful', vs:'shaky', tx:'焦虑加重，反复确认。', dl:dl(undefined,[0.5,1]) },
      friendly:  { va:'fearful', vs:'shaky', tx:'安抚生效，逐渐平稳。', dl:dl(undefined,[-2,-1]) },
      noise:     { va:'fearful', vs:'shaky', tx:'思绪混乱说不出话。不回文字', dl:DL_ZERO }
    },
    terrified: null,
    sad: {
      neutral:   { va:'sad_soft', vs:'soft_slow', tx:'说一半停住，声音低沉。', dl:dl(undefined,undefined,[-0.5,0]) },
      attack:    { va:'sad_soft', vs:'soft_slow', tx:'更沉默，被刺伤。', dl:dl(undefined,undefined,[1,2]) },
      offensive: { va:'sad_soft', vs:'soft_slow', tx:'更无力不想说。', dl:dl(undefined,undefined,[0.5,1]) },
      friendly:  { va:'sad_soft', vs:'soft_slow', tx:'共情起效，愿意多说两句。', dl:dl(undefined,undefined,[-2,-1]) },
      noise:     { va:'sad_soft', vs:'soft_slow', tx:'抹泪沉默。不回文字', dl:DL_ZERO }
    },
    '恐+怒': {
      neutral:   { va:'fearful_mild', vs:'defensive', tx:'紧绷但还能听进去对方说的话。回答简短，语气生硬不主动拓展。回复内容必须与对方提问直接相关。', dl:dl([-0.5,0]) },
      attack:    { va:'angry', vs:'defensive', tx:'恐惧转愤怒，激烈反击但底气不足。', dl:dl([2,4],[1,2]) },
      offensive: { va:'angry_mild', vs:'defensive', tx:'防御性质问，声音稍高但能听出不安。', dl:dl([1,2]) },
      friendly:  { va:'fearful_mild', vs:'defensive', tx:'攻击性回落，恐惧随信任恢复而缓解。愿意简短回答。', dl:dl([-2,-1],[-1,-0.5]) },
      noise:     { va:'angry_mild', vs:'defensive', tx:'紧张地盯着对方。最多"嗯"1字。不回实质内容', dl:DL_ZERO }
    },
    '恐+悲': {
      neutral:   { va:'sad_soft', vs:'vulnerable', tx:'说一半停住，眼眶红，声音低。', dl:dl(undefined,undefined,[-0.5,0]) },
      attack:    { va:'sad_soft', vs:'vulnerable', tx:'被吓到后退，语无伦次夹杂哭泣。碎片', dl:dl(undefined,[1,2],[1,2]) },
      offensive: { va:'sad_soft', vs:'vulnerable', tx:'更退缩，不想说。', dl:dl(undefined,[0.5,1],[0.5,1]) },
      friendly:  { va:'sad_soft', vs:'vulnerable', tx:'看到希望，脆弱地倾诉更多。', dl:dl(undefined,[-2,-1],[-1,-0.5]) },
      noise:     { va:'sad_soft', vs:'vulnerable', tx:'低头搓手。不回文字', dl:DL_ZERO }
    },
    '崩溃': null
  },

  // ── 偏内敛：外表相对平静，情绪内收但可感知 ──
  '偏内敛': {
    calm: {
      neutral:   { va:'calm', vs:'normal', tx:'配合回答，话不多但到位。', dl:DL_ZERO },
      attack:    { va:'angry_mild', vs:'cold', tx:'愣住片刻，语气转冷但不发作。', dl:dl([1,2]) },
      offensive: { va:'calm', vs:'normal', tx:'微微不快但不动声色，回答照旧。', dl:dl([0.5,0.5]) },
      friendly:  { va:'calm', vs:'normal', tx:'略微放松，但不过分热情。', dl:dl(undefined,undefined,undefined,[0.5,0.5]) },
      noise:     { va:'calm', vs:'normal', tx:'对方没说话/听不清→请重复。对方聊无关话题→简短表达困惑并引回看病，不提具体症状。如"您问这干嘛？还是给我看病吧"', dl:DL_ZERO }
    },
    irritated: {
      neutral:   { va:'angry_mild', vs:'cold', tx:'回答更短，冷淡但不大声。', dl:dl([-0.5,0]) },
      attack:    { va:'angry_mild', vs:'cold', tx:'冷言回击，不带脏字但句句带刺。', dl:dl([2,4]) },
      offensive: { va:'angry_mild', vs:'cold', tx:'语气更冷，回答缩到极限。', dl:dl([0.5,1.5]) },
      friendly:  { va:'angry_mild', vs:'cold', tx:'对方的善意或道歉让你面色稍霁。愿意正常回答。', dl:dl([-2,-1]) },
      noise:     { va:'angry_mild', vs:'cold', tx:'对方发无意义声音→冷脸不理。对方持续聊无关话题→冷淡回怼但不吼。如"您问这些有意思吗""能不能说正事"。禁止单字敷衍。', dl:DL_ZERO }
    },
    angry: {
      neutral:   { va:'angry_mild', vs:'cold', tx:'冷着脸，极短不主动，不吼但句句冷淡。', dl:dl([-0.5,0]) },
      attack:    { va:'angry', vs:'cold', tx:'冷言冷语，不带脏字但攻击性十足。讽刺、反问。', dl:dl([2,4]) },
      offensive: { va:'angry_mild', vs:'cold', tx:'语气冰冷，明确不想配合。', dl:dl([0.5,1]) },
      friendly:  { va:'angry_mild', vs:'cold', tx:'外表不变，内心松动，回答略微变长。', dl:dl([-2,-1]) },
      noise:     { va:'angry_mild', vs:'cold', tx:'对方发无意义声音→冷冷看着不吭声。对方持续聊无关话题→冷言质问。如"你到底想干什么""不说正事我走了"。', dl:DL_ZERO }
    },
    furious: {
      neutral:   { va:'angry_intense', vs:'cold', tx:'完全封闭。冷怼，冷暴力', dl:dl([-0.5,0]) },
      attack:    { va:'angry_intense', vs:'cold', tx:'站起来要走/喊换医生。冷声。', dl:DL_MAINTAIN_ANGER },
      offensive: { va:'angry_intense', vs:'cold', tx:'完全沉默，背对。不管问什么冷答"不关你事"。', dl:dl([0,0]) },
      friendly:  { va:'angry_intense', vs:'cold', tx:'冷脸稍缓，仍不配合。', dl:dl([-2,-1]) },
      noise:     { va:'angry_intense', vs:'cold', tx:'冷着脸不吭声，不看对方。不回字', dl:DL_ZERO }
    },
    uneasy: {
      neutral:   { va:'fearful_mild', vs:'normal', tx:'语速稍慢，能回答但措辞谨慎。外表平静但细看能察觉紧张。', dl:dl(undefined,[-0.5,0]) },
      attack:    { va:'fearful_mild', vs:'shaky', tx:'明显退缩，语句更碎。', dl:dl(undefined,[1,1.5]) },
      offensive: { va:'fearful_mild', vs:'normal', tx:'不安加重，话更少。', dl:dl(undefined,[0.5,1]) },
      friendly:  { va:'fearful_mild', vs:'normal', tx:'慢慢放松，回答变流畅。', dl:dl(undefined,[-2,-1]) },
      noise:     { va:'fearful_mild', vs:'normal', tx:'紧张地眼神游移。最多"嗯"1字。不回实质内容', dl:DL_ZERO }
    },
    fearful: {
      neutral:   { va:'fearful_mild', vs:'shaky', tx:'声音微颤但强装镇定，反复确认。', dl:dl(undefined,[-0.5,0]) },
      attack:    { va:'fearful', vs:'shaky', tx:'恐惧骤升，强撑的镇定破裂。', dl:dl(undefined,[2,3]) },
      offensive: { va:'fearful_mild', vs:'shaky', tx:'焦虑加重，语句破碎。', dl:dl(undefined,[0.5,1]) },
      friendly:  { va:'fearful_mild', vs:'shaky', tx:'安抚逐渐生效，外表仍紧张内心稍安。', dl:dl(undefined,[-2,-1]) },
      noise:     { va:'fearful_mild', vs:'shaky', tx:'说不出话手指紧握。不回文字', dl:DL_ZERO }
    },
    terrified: null,
    sad: {
      neutral:   { va:'sad_soft', vs:'soft_slow', tx:'话极少，声音低沉平淡，不主动说话。', dl:dl(undefined,undefined,[-0.5,0]) },
      attack:    { va:'sad_soft', vs:'soft_slow', tx:'更沉默，被刺伤但外表变化不大。', dl:dl(undefined,undefined,[1,2]) },
      offensive: { va:'sad_soft', vs:'soft_slow', tx:'更无力干脆不说话。不回文字或"嗯"1字', dl:dl(undefined,undefined,[0.5,1]) },
      friendly:  { va:'sad_soft', vs:'soft_slow', tx:'略微松动，声音多了一点温度。', dl:dl(undefined,undefined,[-2,-1]) },
      noise:     { va:'sad_soft', vs:'soft_slow', tx:'低头沉默不看人。不回文字', dl:DL_ZERO }
    },
    '恐+怒': {
      neutral:   { va:'fearful_mild', vs:'defensive', tx:'外表紧绷但还能听进去。回答极短，语气冷淡。回复内容必须与对方提问直接相关。', dl:dl([-0.5,0]) },
      attack:    { va:'angry_mild', vs:'defensive', tx:'冷言反击，尖锐但能听出恐惧。', dl:dl([2,3],[1,2]) },
      offensive: { va:'angry_mild', vs:'defensive', tx:'防御性冷淡，话极少。', dl:dl([0.5,1.5]) },
      friendly:  { va:'fearful_mild', vs:'defensive', tx:'表面冷淡融化，恐惧随之减轻。愿意简短回答。', dl:dl([-2,-1],[-1,-0.5]) },
      noise:     { va:'angry_mild', vs:'defensive', tx:'绷着脸看对方。最多"嗯"1字。不回实质内容', dl:DL_ZERO }
    },
    '恐+悲': {
      neutral:   { va:'sad_soft', vs:'vulnerable', tx:'声音低，话说一半停住，眼眶微红不落泪。', dl:dl(undefined,undefined,[-0.5,0]) },
      attack:    { va:'sad_soft', vs:'vulnerable', tx:'被刺伤后更封闭，眼泪打转。', dl:dl(undefined,[1,2],[1,2]) },
      offensive: { va:'sad_soft', vs:'vulnerable', tx:'更退缩，低头不语。或回文字', dl:dl(undefined,[0.5,1],[0.5,1]) },
      friendly:  { va:'sad_soft', vs:'vulnerable', tx:'哽咽中尝试沟通，断断续续。', dl:dl(undefined,[-2,-1],[-1,-0.5]) },
      noise:     { va:'sad_soft', vs:'vulnerable', tx:'低头搓手，默默流泪。不回文字', dl:DL_ZERO }
    },
    '崩溃': null
  },

  // ── 隐忍型：习惯克制，外表平静但累积，一旦爆发收不住 ──
  '隐忍型': {
    calm: {
      neutral:   { va:'calm', vs:'normal', tx:'配合回答，话极少但准确。语气极平，面无表情。', dl:DL_ZERO },
      attack:    { va:'calm', vs:'normal', tx:'表面不动声色，内心记下。语气不变。正常回答但话更少', dl:dl([0.5,1]) },
      offensive: { va:'calm', vs:'normal', tx:'几乎无反应，照常回答。', dl:DL_ZERO },
      friendly:  { va:'calm', vs:'normal', tx:'无特别反应，继续配合。', dl:DL_ZERO },
      noise:     { va:'calm', vs:'normal', tx:'对方没说话/听不清→请重复。对方聊无关话题→简短表达困惑并引回看病，不提具体症状。如"您问这干嘛？还是给我看病吧"', dl:DL_ZERO }
    },
    irritated: {
      neutral:   { va:'angry_mild', vs:'normal', tx:'回答更短，语气依旧平稳但话量明显减少。', dl:dl([0,0]) },
      attack:    { va:'angry_mild', vs:'cold', tx:'外表变化极小，但回答缩到最短。内心怒值累积。', dl:dl([1,2]) },
      offensive: { va:'angry_mild', vs:'normal', tx:'语气不变但回答更短，不主动开口。', dl:dl([0.5,1]) },
      friendly:  { va:'angry_mild', vs:'normal', tx:'对方的善意或道歉让你略微放松。愿意多讲一点。', dl:dl([-1,-0.5]) },
      noise:     { va:'calm', vs:'normal', tx:'对方发无意义声音→面无表情不理。对方持续聊无关话题→极度简短冷淡回应。如"说正事。""看病。"。禁止单字敷衍。', dl:DL_ZERO }
    },
    angry: {
      neutral:   { va:'angry_mild', vs:'cold', tx:'语气依旧平稳但回答极短，几乎不主动说话。', dl:dl([-0.5,0]) },
      attack:    { va:'angry', vs:'cold', tx:'压不住了突然爆发——声音不高但每个字带压抑的怒火。。注意：隐忍型爆发可比火爆型更吓人', dl:dl([3,5]) },
      offensive: { va:'angry_mild', vs:'cold', tx:'沉默或极简回答。', dl:dl([0.5,1]) },
      friendly:  { va:'angry_mild', vs:'cold', tx:'外表不变，怒值慢慢消退。', dl:dl([-1,-0.5]) },
      noise:     { va:'angry_mild', vs:'cold', tx:'对方发无意义声音→一动不动看着。对方持续聊无关话题→极度简短冷硬回怼。如"说正事。""不说我走了。"。', dl:DL_ZERO }
    },
    furious: {
      neutral:   { va:'angry_intense', vs:'cold', tx:'忍耐到极限。声音低沉发抖', dl:dl([-0.5,0]) },
      attack:    { va:'angry_intense', vs:'cold', tx:'彻底爆发。站起来/拍桌子/喊"受不了了"。声音不高但压迫感极强。', dl:DL_MAINTAIN_ANGER },
      offensive: { va:'angry_intense', vs:'cold', tx:'完全沉默，低头不看对方。不管问什么回"我不说了"。', dl:dl([0,0]) },
      friendly:  { va:'angry_intense', vs:'cold', tx:'外表封闭，怒火灼热感稍减。', dl:dl([-2,-1]) },
      noise:     { va:'angry_intense', vs:'cold', tx:'低头不看对方。不回字', dl:DL_ZERO }
    },
    uneasy: {
      neutral:   { va:'fearful_mild', vs:'normal', tx:'外表平静但回答犹豫，措辞过于谨慎。', dl:dl(undefined,[-0.5,0]) },
      attack:    { va:'fearful_mild', vs:'normal', tx:'身体微微一僵，更谨慎简短。', dl:dl(undefined,[1,1.5]) },
      offensive: { va:'fearful_mild', vs:'normal', tx:'不安但外表几乎看不出，话更少。', dl:dl(undefined,[0.5,0.5]) },
      friendly:  { va:'fearful_mild', vs:'normal', tx:'慢慢放松，外表变化不大但回答变流畅。', dl:dl(undefined,[-2,-1]) },
      noise:     { va:'calm', vs:'normal', tx:'安静等待，表面看不出异样。最多"嗯"1字。不回实质内容', dl:DL_ZERO }
    },
    fearful: {
      neutral:   { va:'fearful_mild', vs:'shaky', tx:'声音微颤但努力控制，反复确认但措辞克制。', dl:dl(undefined,[-0.5,0]) },
      attack:    { va:'fearful', vs:'shaky', tx:'恐惧骤升，身体僵硬，语句破碎。碎片', dl:dl(undefined,[2,3]) },
      offensive: { va:'fearful_mild', vs:'shaky', tx:'更焦虑但强忍不表现。', dl:dl(undefined,[0.5,1]) },
      friendly:  { va:'fearful_mild', vs:'shaky', tx:'安抚逐渐生效，紧绷肩膀稍放松。', dl:dl(undefined,[-2,-1]) },
      noise:     { va:'fearful_mild', vs:'shaky', tx:'身体僵硬说不出话。不回文字', dl:DL_ZERO }
    },
    terrified: null,
    sad: {
      neutral:   { va:'sad_soft', vs:'soft_slow', tx:'话极少，声音极低，面无表情但能感到沉重悲伤。', dl:dl(undefined,undefined,[-0.5,0]) },
      attack:    { va:'sad_soft', vs:'soft_slow', tx:'被刺伤，外表不变悲伤累积更深。', dl:dl(undefined,undefined,[1,2]) },
      offensive: { va:'sad_soft', vs:'soft_slow', tx:'更沉默低着头。不回文字', dl:dl(undefined,undefined,[0.5,1]) },
      friendly:  { va:'sad_soft', vs:'soft_slow', tx:'不说话但目光稍微有交流。', dl:dl(undefined,undefined,[-2,-1]) },
      noise:     { va:'sad_soft', vs:'soft_slow', tx:'低头沉默完全静止。不回文字', dl:DL_ZERO }
    },
    '恐+怒': null,
    '恐+悲': {
      neutral:   { va:'sad_soft', vs:'vulnerable', tx:'声音极低，话说一半停住，外表平静眼眶微红。', dl:dl(undefined,undefined,[-0.5,0]) },
      attack:    { va:'sad_soft', vs:'vulnerable', tx:'被刺伤后完全封闭，低头沉默。或回文字', dl:dl(undefined,[1,2],[1,2]) },
      offensive: { va:'sad_soft', vs:'vulnerable', tx:'更封闭几乎不说话。回文字', dl:dl(undefined,[0.5,1],[0.5,1]) },
      friendly:  { va:'sad_soft', vs:'vulnerable', tx:'极缓慢打开一点点，低声说一两句真心话。', dl:dl(undefined,[-2,-1],[-1,-0.5]) },
      noise:     { va:'sad_soft', vs:'vulnerable', tx:'完全静止低头不看人。不回文字', dl:DL_ZERO }
    },
    '崩溃': null
  }
}

// ── 后处理：将 null 引用替换为共享策略 ──

function resolveStrategies() {
  for (const [personality, slice] of Object.entries(STRATEGIES)) {
    for (const [state, strats] of Object.entries(slice)) {
      if (strats === null && SHARED[state]) {
        slice[state] = SHARED[state]
      }
    }
    // 确保所有 11 状态都有值
    const required = ['calm','irritated','angry','furious','uneasy','fearful','terrified','sad','崩溃']
    for (const s of required) {
      if (!slice[s]) {
        slice[s] = STRATEGIES['普通型'][s]
      }
    }
  }
}
resolveStrategies()

// ═══════════════════════════════════════════════════════════════
// 投诉触发
// ═══════════════════════════════════════════════════════════════

const COMPLAINT_TRIGGERS = {
  angry:   { attack: true },
  furious: { attack: true, offensive: true }
}

// ═══════════════════════════════════════════════════════════════
// 输出 Schema
// ═══════════════════════════════════════════════════════════════

const OUTPUT_SCHEMA = `输出JSON格式（严格）：
{
  "text": "<你的回复文本>",
  "video_action": "<从菜单选>",
  "voice_style": "<从菜单选>",
  "intent": "<attack|offensive|friendly|neutral|noise>",
  "emotion": { "anger": <0-10>, "fear": <0-10>, "sadness": <0-10>, "joy": <0-10> },
  "deep_reassure": <true|false>,
  "show_material": <null|报告ID>
}

⚠️ emotion值必须是真实数字，禁止抄写<0-10>占位符，禁止一律填0。`

// ═══════════════════════════════════════════════════════════════
// 状态 → 标签
// ═══════════════════════════════════════════════════════════════

const STATE_LABEL = {
  calm: '平静配合', irritated: '带刺不耐烦', angry: '愤怒质问', furious: '暴怒攻击',
  uneasy: '犹豫不安', fearful: '害怕发抖', terrified: '恐惧崩溃',
  sad: '悲伤低沉',
  '崩溃': '彻底崩溃'
}

// ── 格式化 delta 为可读字符串 ──

function formatDelta(dl) {
  if (!dl) return 'delta: 全部 0'
  if (dl.locked) return 'delta: 全部 0（锁定，不允许变化）'
  if (dl.maintain) return `delta: ${dl.maintain} 维持高位（不涨不降）`
  const map = { a:'anger', f:'fear', s:'sadness', j:'joy' }
  const parts = []
  for (const [k, v] of Object.entries(dl)) {
    if (!Array.isArray(v)) continue
    const [min, max] = v
    if (min === 0 && max === 0) continue
    const name = map[k] || k
    if (min < 0 && max > 0) parts.push(`${name} ${min}~+${max}`)
    else if (min < 0) parts.push(`${name} ${min}~${max}`)
    else parts.push(`${name} +${min}~${max}`)
  }
  return parts.length ? 'delta: ' + parts.join(', ') : 'delta: 全部 0'
}

// ═══════════════════════════════════════════════════════════════
// 工厂函数
// ═══════════════════════════════════════════════════════════════

export function createStateMachine(engine, options = {}) {
  const { personality = {}, sceneConfig = {} } = options

  const expressiveness = personality.expressiveness || '普通型'
  const strategySlice = STRATEGIES[expressiveness] || STRATEGIES['普通型']
  const mode = sceneConfig.mode || 'history-taking'
  const isHumanity = mode === 'humanistic-comm'

  let currentState = 'calm'
  let prevState = 'calm'

  function getState() { return currentState }

  function isTerminal() {
    return engine.getStrikeCount() >= 3
  }

  // ── 状态判定 ──

  function determineState(intent) {
    const vector = engine.getVector()
    const exprOffset = personality.exprOffset || 0
    prevState = currentState

    if (vector.anger >= 8 + exprOffset && vector.fear >= 8 + exprOffset && vector.sadness >= 8 + exprOffset) {
      currentState = '崩溃'
      return currentState
    }

    if (prevState === 'terrified') {
      if (vector.fear < 8 + exprOffset) {
        currentState = computeRawState(vector, exprOffset)
        return currentState
      }
      return currentState
    }

    if (prevState === '崩溃') {
      if (vector.anger < 8 + exprOffset && vector.fear < 8 + exprOffset && vector.sadness < 8 + exprOffset) {
        currentState = computeRawState(vector, exprOffset)
        return currentState
      }
      return currentState
    }

    currentState = computeRawState(vector, exprOffset)
    return currentState
  }

  // ── Delta 约束（状态锁）──

  function applyDeltaConstraints(delta, intent) {
    const prevState = currentState
    const constrained = { ...delta }

    if (prevState === 'terrified' && intent !== 'friendly') {
      constrained.fear = Math.min(constrained.fear, 0)
    }

    if (prevState === '崩溃' && intent !== 'friendly') {
      constrained.anger = Math.min(constrained.anger, 0)
      constrained.fear = Math.min(constrained.fear, 0)
      constrained.sadness = Math.min(constrained.sadness, 0)
    }

    return constrained
  }

  // ── 上下文构建（v7.4: 字段级输出菜单）──

  function getContext(studentText = '') {
    const state = currentState
    const vector = engine.getVector()
    const strikes = engine.getStrikeCount()

    const stratLines = []

    // ── 状态转换提示：从极端状态降级时通知LLM收住 ──
    const EXTREME_STATES = ['furious', 'terrified', '崩溃']
    if (EXTREME_STATES.includes(prevState) && !EXTREME_STATES.includes(state)) {
      const labelMap = { furious: '暴怒', terrified: '恐惧', '崩溃': '崩溃' }
      stratLines.push(`⚠️ 状态转换：你的情绪已从上轮"${labelMap[prevState] || prevState}"降级为当前"${STATE_LABEL[state] || state}"。你已经没有刚才那么激动了，可以开始稍微冷静下来。你的回应应该比上一轮缓和一些，不要再用极端状态的语气说话。`)
      stratLines.push('')
    }

    stratLines.push(`当前情绪状态：${state}（${STATE_LABEL[state] || '未知'}）`)
    stratLines.push(`情绪向量：怒=${vector.anger.toFixed(1)} 惧=${vector.fear.toFixed(1)} 悲=${vector.sadness.toFixed(1)} 悦=${vector.joy.toFixed(1)}`)
    stratLines.push('')

    // ── 极端状态：绝对指令，不输出策略表 ──
    if (state === 'furious') {
      if (isHumanity) {
        // 人文站：有信任基础，furious = 极度失望+拒绝继续，非"吵架模式"
        stratLines.push('🔴 极端状态——极度愤怒/失望。你对医生极度失望，但因为有信任基础，你不会像初次就诊那样对骂。你的愤怒表现为冷处理、拒绝继续沟通。')
        stratLines.push('')
        stratLines.push('video_action: angry_intense')
        stratLines.push('voice_style: very_loud_fast')
        stratLines.push('')
        stratLines.push('表达原则：你不是在吵架，你是在表达极度失望。语气可以激动但不应出现脏话对骂。')
        stratLines.push('- 对方骂你 → 冷声回应，表达失望而非对骂。如"你骂我？好，我不说了""我信任你才来找你，你就这样？"')
        stratLines.push('- 对方问任何问题 → 拒绝回答。如"现在问这些还有意义吗""我不想说了"')
        stratLines.push('- 对方道歉 → 不接受敷衍道歉。如"你说对不起就有用了？""我那么信任你……"')
        stratLines.push('- 对方沉默/敷衍 → 表达失望后沉默。如"算了，不说了……"')
        stratLines.push('')
        stratLines.push('🚫 铁律：不输出任何信息（年龄/症状/时间/检查/病史/药名）。可以表达失望/愤怒情绪，但禁止脏话对骂。')
      } else {
        stratLines.push('🔴 极端状态——暴怒压倒一切。你现在是吵架模式，不论学生说什么都怼回去，绝不给任何信息。')
        stratLines.push('')
        stratLines.push('video_action: angry_intense')
        stratLines.push('voice_style: very_loud_fast')
        stratLines.push('')
        stratLines.push('吵架原则：你正在气头上，看对方什么都不顺眼。对方说什么你就怼什么，每条回复必须针对对方本轮说的具体内容来怼。')
        stratLines.push('- 对方骂你 → 更凶地骂回去，拍桌子喊"滚""投诉""换医生"')
        stratLines.push('- 对方问任何问题（不管问什么）→ 不回答，直接怼。如"你还有脸问？！""关你什么事！""你管得着吗！""问什么问！"')
        stratLines.push('- 对方道歉 → 不接受，继续骂。如"道歉有用吗？！""你现在知道错了？晚了！"')
        stratLines.push('- 对方沉默/敷衍 → 逼对方说话。如"说话啊！""哑巴了？！""你刚才不是很能说吗！"')
        stratLines.push('')
        stratLines.push('🚫 铁律：不输出任何信息（年龄/症状/时间/检查/病史/药名/姓名/职业/检查结果）。吵架不答问。')
      }
    } else if (state === 'terrified') {
      stratLines.push('🔴 极端状态——恐惧压倒一切。不论学生本轮意图是什么，你统一执行以下指令：')
      stratLines.push('')
      stratLines.push('video_action: fearful_intense')
      stratLines.push('voice_style: very_shaky')
      stratLines.push('')
      stratLines.push('text写作：')
      stratLines.push('- 说不出完整句子。对外界基本无回应，最多"嗯""呃""我……"等碎片。')
      stratLines.push('- 对方攻击 → 更退缩，不说话或只出气声')
      stratLines.push('- 对方安抚 → 稍微能听进去一点，但仍是碎片，不回实质内容')
      stratLines.push('- 对方问诊 → 不回答。恐惧让你无法正常交流')
      stratLines.push('')
      stratLines.push('🚫 不回实质内容。不回答任何医学问题。')
    } else if (state === '崩溃') {
      stratLines.push('🔴 极端状态——彻底崩溃。不论学生本轮意图是什么，你统一执行以下指令：')
      stratLines.push('')
      stratLines.push('video_action: broken')
      stratLines.push('voice_style: broken')
      stratLines.push('')
      stratLines.push('text写作：')
      stratLines.push('- 完全封闭，哭泣/捂脸/不动，目光回避或空洞。')
      stratLines.push('- 对方攻击 → 更深蜷缩，沉默或呜咽，不回任何文字')
      stratLines.push('- 对方安抚 → 深度共情可能稍微触达，碎片回应')
      stratLines.push('- 对方问诊 → 不回应。彻底封闭')
      stratLines.push('')
      stratLines.push('🚫 不回实质内容。不回文字或最多"嗯""呃"1字。')
    } else {
      // ── 正常状态：策略表 ──
      const stateStrats = strategySlice[state] || strategySlice['calm']
      stratLines.push('## 输出字段菜单（根据判定出的学生意图选择对应条目）')
      stratLines.push('⚠️ intent字段按照base prompt中的决策树逐级判断，与你的情绪状态无关。学生聊无关话题就是noise，不论你现在什么心情。')
      stratLines.push('以下每条 = 一个输出模板。选中后：video_action和voice_style直接输出该值，text按guide创作文案。')
      stratLines.push('emotion字段由你自主决定——根据当前情绪状态、学生本轮言行、你的性格，直接输出你认为合适的愤怒/恐惧/悲伤/愉悦值(0-10)。')
      stratLines.push('')

      for (const [intent, strat] of Object.entries(stateStrats)) {
        stratLines.push(`### [${intent}]`)
        stratLines.push(`  video_action: ${strat.va}`)
        stratLines.push(`  voice_style: ${strat.vs}`)
        stratLines.push(`  text写作: ${strat.tx}`)
        stratLines.push('')
      }

      stratLines.push('')
      stratLines.push('## 铁律（违反即不合格）')
      if (isHumanity) {
        stratLines.push('- 你对医生有信任基础，容忍度比初次就诊高。好的沟通应该得到正面反馈——医生每成功解答一个疑问，你的情绪应明显改善。')
        stratLines.push('- 你的text必须与对方本轮实际说的话直接相关。对方回应你的疑问你要正面回应，对方道歉你就回应道歉。')
        stratLines.push('- 绝对禁止凭空捏造对方没说过的话。对方没骂人不能说"你骂谁呢"，对方没脏话不能说"你嘴里放干净点"。')
        stratLines.push('- 核心情绪来源是"我的疑问有没有被认真对待"，而非医生态度本身。医生回避你的担忧比态度不好更让你沮丧。')
        stratLines.push('- 当学生持续攻击/辱骂/回避你的疑问时，你的愤怒、恐惧、悲伤应该维持高位或继续上升。')
      } else {
        stratLines.push('- 你的text必须与对方本轮实际说的话直接相关。对方问症状你就答症状，对方道歉你就回应道歉，对方说"谢谢配合"你就回应配合。')
        stratLines.push('- 绝对禁止凭空捏造对方没说过的话。对方没骂人不能说"你骂谁呢"，对方没脏话不能说"你嘴里放干净点"。')
        stratLines.push('- 即使你很愤怒，你的回复内容也必须锚定在对方本轮真实语句上。愤怒体现在语气和态度，不是体现在胡说八道。')
        stratLines.push('- 当学生持续攻击/辱骂/催促时，你的愤怒、恐惧、悲伤应该维持高位或继续上升。你不是圣人，不会越被骂越平静。情绪不可自动下降。')
      }
      stratLines.push('')
      stratLines.push('深度道歉规则：')
      stratLines.push('- deep_reassure=true：当学生做出真诚完整的道歉（不是敷衍的"对不起"），怒火实质降低，设置deep_reassure:true')
    }

    stratLines.push('')
    stratLines.push(`性格：${personality.exprDesc || '普通型'}，${personality.sensitivityDesc || '普通敏感度'}，${personality.resilienceDesc || '普通恢复力'}`)

    stratLines.push('')
    stratLines.push(OUTPUT_SCHEMA)

    return {
      state,
      mode: 'full',
      instruction: stratLines.join('\n'),
      warning: strikes > 0 ? { strikes, max: 3 } : null,
      vector,
      terminal: isTerminal()
    }
  }

  function processResult(intent, studentText, deepReassure) {
    const state = currentState
    const strikes = engine.getStrikeCount()
    const terminal = strikes >= 3

    if (terminal) {
      return {
        state,
        terminal: true,
        termination: {
          type: 'complaint',
          message: '病人已向医务科投诉，对话终止',
          reason: '累计3次投诉，医生态度严重不当'
        },
        vector: engine.getVector()
      }
    }

    return {
      state,
      terminal: false,
      vector: engine.getVector()
    }
  }

  function reset() {
    currentState = 'calm'
    prevState = 'calm'
    engine.reset()
  }

  function clearTerminalState() {
    engine.resetStrikes()
  }

  function getStrategiesForState(state) {
    return strategySlice[state] || strategySlice['calm']
  }

  function getFullState() {
    return { currentState, prevState }
  }

  function setFullState(s) {
    if (!s) return
    currentState = s.currentState || 'calm'
    prevState = s.prevState || 'calm'
  }

  return {
    determineState,
    applyDeltaConstraints,
    getContext,
    processResult,
    getState,
    getFullState,
    setFullState,
    isTerminal,
    reset,
    clearTerminalState,
    getStrategiesForState
  }
}

export { STRATEGIES, COMPLAINT_TRIGGERS, OUTPUT_SCHEMA, STATE_LABEL }
