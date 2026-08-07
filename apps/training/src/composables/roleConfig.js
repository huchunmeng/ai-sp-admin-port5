/**
 * MDT 学员角色配置（DESIGN_02：真实 MDT 角色）
 * 训练端流程重构后只保留主诊·管床·主任一个身份：进入讨论即扮演主诊医师，
 * 会诊前发起申请、会诊中主导汇报、组织专家意见并拍板最终方案。观察者不再提供选择。
 */

export const ROLE_CONFIG = {
  attending: {
    key: 'attending', label: '主诊·管床·主任',
    duty: '发起+汇报+组织+拍板', decision: true, feedbackMode: 'expert',
    desc: '模拟发起 MDT 的主诊·管床·主任：会诊前发起申请，会诊中主导汇报、组织专家意见并拍板最终方案',
    preMeeting: true,
  },
}

export const ROLE_OPTIONS = Object.values(ROLE_CONFIG)

export function getRoleConfig(role) {
  return ROLE_CONFIG[role] || ROLE_CONFIG.attending
}
