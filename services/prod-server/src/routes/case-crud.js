import fs from 'fs'
import path from 'path'
import config from '../config.js'

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

export function mountCaseCrud(app) {
  app.post('/api/case/save-fields', (req, res) => {
    try {
      const { caseId, fields } = req.body
      if (!caseId || !fields) {
        res.status(400).json({ ok: false, error: 'Missing caseId or fields' })
        return
      }
      const basicPath = path.join(config.CASES_DIR, `${caseId}-basic.json`)
      if (!fs.existsSync(basicPath)) {
        res.status(404).json({ ok: false, error: 'Case basic.json not found' })
        return
      }
      const basicData = JSON.parse(fs.readFileSync(basicPath, 'utf-8'))
      Object.assign(basicData, fields)
      fs.writeFileSync(basicPath, JSON.stringify(basicData, null, 2), 'utf-8')
      console.log(`[case-crud] Updated basic.json fields for ${caseId}:`, Object.keys(fields).join(', '))
      res.json({ ok: true })
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message })
    }
  })

  app.post('/api/case/save-file', (req, res) => {
    try {
      const { caseId, fileName, data } = req.body
      if (!caseId || !fileName || !data) {
        res.status(400).json({ ok: false, error: 'Missing caseId, fileName, or data' })
        return
      }
      ensureDir(config.CASES_DIR)
      const filePath = path.join(config.CASES_DIR, fileName)
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
      console.log(`[case-crud] Saved file: ${filePath}`)
      res.json({ ok: true })
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message })
    }
  })

  app.post('/api/case/upload-material', (req, res) => {
    try {
      const { caseId, filename, data } = req.body
      if (!caseId || !filename || !data) {
        res.status(400).json({ ok: false, error: 'Missing caseId, filename, or data' })
        return
      }
      const materialsDir = path.join(config.CASES_DIR, caseId, 'materials')
      ensureDir(materialsDir)
      const base64 = data.replace(/^data:[^;]+;base64,/, '')
      const buffer = Buffer.from(base64, 'base64')
      const filePath = path.join(materialsDir, filename)
      fs.writeFileSync(filePath, buffer)
      const url = `/data/cases/${caseId}/materials/${filename}`
      console.log(`[case-crud] Uploaded material: ${filePath}`)
      res.json({ ok: true, path: url, filename })
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message })
    }
  })
}
