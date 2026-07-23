// 考核记录演示数据 — 基于考站方案配置生成
// 当前考站方案: 接诊病人站 / 临床思维站 / 交流沟通站 / 病历书写站 / 病史采集站 / 体格检查站 / 接诊和沟通站

const stationPool = {
  '内科':       ['接诊病人站', '临床思维站', '交流沟通站'],
  '外科':       ['接诊病人站', '临床思维站', '交流沟通站'],
  '儿科':       ['病史采集站', '体格检查站', '病历书写站', '临床思维站'],
  '急诊科':     ['接诊病人站', '临床思维站', '交流沟通站'],
  '妇产科':     ['接诊和沟通站', '临床思维站'],
  '全科':       ['接诊病人站', '病历书写站', '交流沟通站'],
  '精神科':     ['接诊病人站', '临床思维站', '交流沟通站'],
  '神经内科':   ['接诊病人站', '临床思维站', '交流沟通站'],
  '骨科':       ['接诊病人站', '临床思维站'],
}

/** 生成考试口令 */
function genCode() {
  return Math.random().toString(36).substring(2, 10).toUpperCase()
}

/** 根据考站配置生成场次列表 */
function buildSessions(majors) {
  const sessions = []
  for (const major of majors) {
    const stations = stationPool[major] || []
    for (const st of stations) {
      sessions.push({ name: `${major}-${st}`, major, station: st })
    }
  }
  return sessions
}

const statusLabels = {
  draft: '草稿', active: '进行中', paused: '已暂停', ended: '已结束', archived: '已归档'
}

const statuses = ['draft', 'active', 'paused', 'ended', 'archived']

const EXAM_RECORD_TEMPLATES = [
  {
    namePrefix: '内科住培年度考核',
    majorSet: ['内科'],
    subtype: '住培内科',
    statusCycle: ['active', 'ended', 'draft', 'active', 'ended'],
    candidateBase: 24,
    institution: '仁爱医院',
  },
  {
    namePrefix: '外科住培阶段考核',
    majorSet: ['外科'],
    subtype: '住培外科',
    statusCycle: ['ended', 'active', 'active', 'paused', 'ended'],
    candidateBase: 18,
    institution: '华西医院',
  },
  {
    namePrefix: '全科院校出科考核',
    majorSet: ['全科'],
    subtype: '院校全科',
    statusCycle: ['draft', 'active', 'ended', 'archived', 'active'],
    candidateBase: 30,
    institution: '中山医院',
  },
  {
    namePrefix: '儿科综合考核',
    majorSet: ['儿科'],
    subtype: '院校儿科',
    statusCycle: ['active', 'active', 'paused', 'ended', 'draft'],
    candidateBase: 12,
    institution: '协和医院',
  },
  {
    namePrefix: '急诊住培联合考核',
    majorSet: ['急诊科', '妇产科'],
    subtype: '住培急诊',
    statusCycle: ['paused', 'draft', 'active', 'ended', 'active'],
    candidateBase: 20,
    institution: '同济医院',
  },
]

/**
 * 从模板生成考核记录列表
 * @param {number} count 记录数量（循环使用5条模板）
 * @returns {Array} 考核记录数组
 */
export function generateExamRecords(count = 5) {
  const records = []
  for (let i = 0; i < count; i++) {
    const tpl = EXAM_RECORD_TEMPLATES[i % EXAM_RECORD_TEMPLATES.length]
    const majors = tpl.majorSet
    const sessions = buildSessions(majors)
    const status = tpl.statusCycle[i % tpl.statusCycle.length]
    const daysAgo = i * 3 + (i % 5)
    const d = new Date()
    d.setDate(d.getDate() - daysAgo)
    const startTime = new Date(d.getTime() + 8 * 3600000)
    const endTime = new Date(startTime.getTime() + 3 * 3600000)

    const fmt = (dt) => {
      const y = dt.getFullYear()
      const mo = String(dt.getMonth() + 1).padStart(2, '0')
      const day = String(dt.getDate()).padStart(2, '0')
      const h = String(dt.getHours()).padStart(2, '0')
      const mi = String(dt.getMinutes()).padStart(2, '0')
      return `${y}-${mo}-${day} ${h}:${mi}`
    }

    const createdAt = new Date(d.getTime() - 86400000 * 7)
    const n = i + 1
    const name = tpl.namePrefix + (n > 1 ? ` 第${n}期` : '')

    records.push({
      id: `exam_demo_${i + 1}`,
      name,
      majors,
      subtype_label: tpl.subtype,
      typeCategory: tpl.subtype.startsWith('住培') ? 'residency' : 'college',
      access_code: genCode(),
      start_time: fmt(startTime),
      end_time: fmt(endTime),
      candidate_count: tpl.candidateBase + Math.floor(Math.random() * 15),
      status,
      status_label: statusLabels[status],
      institution: tpl.institution,
      created_at: fmt(createdAt),
      creator: '管理员',
      last_edit: fmt(new Date(createdAt.getTime() + 86400000)),
      operator: '管理员',
      sessions,
      session_count: sessions.length,
    })
  }
  return records
}
