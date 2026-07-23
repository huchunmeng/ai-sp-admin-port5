import { matchPatientImage as findImage, matchPatientVideo as findVideo } from './patientAssetMapping.js'

/**
 * 根据患者信息匹配图片路径
 * （适配旧 API — 直接返回路径字符串）
 */
export function matchPatientImage(patient, type = 'full') {
  return findImage(patient, type)
}

/**
 * 根据患者信息匹配视频路径
 * （适配旧 API — 直接返回路径字符串）
 */
export function matchPatientVideo(patient, videoType = 'idle') {
  return findVideo(patient, videoType)
}
