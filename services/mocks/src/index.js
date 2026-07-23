const delay = (ms) => {
  return new Promise((r) => { setTimeout(r, ms || 300) })
}

let cases = []

let exams = []

export const handlers = {
  caseList(params) {
    return delay().then(() => {
      return { code: 0, data: { list: cases.slice(), total: cases.length } }
    })
  },

  caseDetail(id) {
    return delay().then(() => {
      const found = cases.find((c) => c.id === id)
      return found ? { code: 0, data: found } : { code: 404, message: '病例不存在' }
    })
  },

  examList(params) {
    return delay().then(() => {
      return { code: 0, data: { list: exams.slice(), total: exams.length } }
    })
  },

  examDetail(id) {
    return delay().then(() => {
      const found = exams.find((e) => e.id === id)
      return found ? { code: 0, data: found } : { code: 404, message: '考核不存在' }
    })
  }
}

export function setMockData(data) {
  if (data.cases) cases = data.cases
  if (data.exams) exams = data.exams
}
