// ═══════════════════════════════════════════════════════════════
// 愤怒阻尼器 — ABS防翻车系统
// 升（delta>0）：LLM 判定直接驱动，阻尼器不干预（开门无阻）
// 降（delta≤0）：阻尼器机械减速，不信任 LLM 的"我原谅你了"（关门有阻）
// 恐惧和悲伤走 CM/反思脑慢通路
// 阻尼器不受性格影响 —— ABS是物理规则，不是心理特征
// ═══════════════════════════════════════════════════════════════

import { getDamperGear } from './gear-system.js'

const MAX_ANGER = 10
const MIN_ANGER = 0
const NORMAL_DECAY = 0.3
const FAST_DECAY = 1.0  // 真诚道歉/共情

export function createAngerDamper(initialLevel = 0) {
  let angerLevel = Math.max(MIN_ANGER, Math.min(MAX_ANGER, initialLevel))

  return {
    /** LLM 判定上升 → 直接加，不阻拦 */
    rise(delta) {
      angerLevel = Math.min(MAX_ANGER, angerLevel + delta)
      return angerLevel
    },

    /** 机械衰减 → 阻尼器控制下降速度，忽略 LLM 的负 delta */
    decay(fast = false) {
      angerLevel = Math.max(MIN_ANGER, angerLevel - (fast ? FAST_DECAY : NORMAL_DECAY))
      return angerLevel
    },

    /** 当前愤怒数值（调试用） */
    getLevel() {
      return angerLevel
    },

    /** 当前档位 —— 这是给知觉脑的命令，不是建议 */
    getGear() {
      return getDamperGear(angerLevel)
    },

    setLevel(level) {
      angerLevel = Math.max(MIN_ANGER, Math.min(MAX_ANGER, level))
    },

    reset() {
      angerLevel = 0
    },
  }
}
