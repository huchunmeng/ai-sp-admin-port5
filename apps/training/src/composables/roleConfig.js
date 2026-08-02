/**
 * MDT 学员角色配置（DESIGN_01 5.3）
 * 三种角色共享 Learner-paced 原则，差异在发言义务与决策权
 */

export const ROLE_CONFIG = {
  observer: {
    key: 'observer', label: '观察者',
    duty: '无发言义务', decision: false, feedbackMode: 'gentle',
    desc: '适合初次接触 MDT 或低年资学员，旁听专家讨论，随时可提问',
  },
  resident: {
    key: 'resident', label: '住院医师',
    duty: '被点名发言', decision: false, feedbackMode: 'gentle',
    desc: '模拟真实 MDT 中轮转住院医师，被主持人点名谈观点，专家引导反馈',
  },
  attending: {
    key: 'attending', label: '主诊医师',
    duty: '主导讨论并拍板', decision: true, feedbackMode: 'expert',
    desc: '模拟发起 MDT 的主诊医师，负责组织讨论并做出最终决策',
  },
}

export const ROLE_OPTIONS = Object.values(ROLE_CONFIG)

export function getRoleConfig(role) {
  return ROLE_CONFIG[role] || ROLE_CONFIG.observer
}
