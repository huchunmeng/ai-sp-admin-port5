/**
 * 评分表模板的本地持久化（管理端）
 *
 * 本期无服务端：模板改动只能落在**管理端本地**，训练端读不到（训练端用内置默认）。
 * 这一点在页面上有明确提示，别当成已同步。
 */
import {
  setScoreTemplate, setLevelCalibration, defaultScoreTemplate,
  defaultLevelCalibration, TEMPLATE_VERSION
} from '@ai-sp/shared/imaging'

const TPL_KEY = 'imaging_score_template_v1'
const CAL_KEY = 'imaging_level_calibration_v1'

function read(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch (e) { return null }
}

function write(key, val) {
  try { localStorage.setItem(key, val ? JSON.stringify(val) : '') } catch (e) { /* 隐私模式忽略 */ }
}

/** 把本地存的模板与标定装载进来（应在管理端启动时调用一次） */
export function hydrateTemplate() {
  const tpl = read(TPL_KEY)
  const cal = read(CAL_KEY)
  if (tpl) setScoreTemplate(tpl)
  if (cal) setLevelCalibration(cal)
  return { template: !!tpl, calibration: !!cal }
}

export function saveTemplate(tpl, cal) {
  write(TPL_KEY, tpl)
  write(CAL_KEY, cal)
  setScoreTemplate(tpl)
  setLevelCalibration(cal)
}

export function resetTemplate() {
  write(TPL_KEY, null)
  write(CAL_KEY, null)
  setScoreTemplate(null)
  setLevelCalibration(null)
}

export function hasLocalTemplate() {
  return !!(read(TPL_KEY) || read(CAL_KEY))
}

export { defaultScoreTemplate, defaultLevelCalibration, TEMPLATE_VERSION }
