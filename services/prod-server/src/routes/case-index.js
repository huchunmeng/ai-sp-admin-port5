import fs from 'fs'
import path from 'path'
import config from '../config.js'

export function mountCaseIndex(app) {
  app.get('/api/cases', (_req, res) => {
    try {
      if (!fs.existsSync(config.CASES_DIR)) {
        res.json([])
        return
      }
      const files = fs.readdirSync(config.CASES_DIR)
      const basicFiles = files.filter(f => f.endsWith('-basic.json'))
      const cases = []
      for (const f of basicFiles) {
        try {
          const data = JSON.parse(fs.readFileSync(path.join(config.CASES_DIR, f), 'utf-8'))
          const caseId = f.replace('-basic.json', '')
          const pi = data.patient_info || {}
          cases.push({
            id: caseId,
            case_id: data.case_id || caseId,
            title: data.title || data.disease || caseId,
            specialty: data.specialty || '',
            disease: data.disease || '',
            difficulty: data.difficulty || data.teaching_phase || '',
            training_phase: data.training_phase || '',
            category: data.category || '',
            chief_complaint: data.chief_complaint || '',
            symptoms: data.symptoms || [],
            source: '平台',
            patient_name: pi.name || '',
            patient_gender: pi.sex === '1' || pi.sex === '男' ? '男' : (pi.sex === '0' || pi.sex === '女' ? '女' : ''),
            patient_age: String(pi.age || '').replace('岁', ''),
            patient_pregnancy: pi.pregnancy || ''
          })
        } catch { /* skip corrupt files */ }
      }
      res.json(cases)
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message })
    }
  })
}
