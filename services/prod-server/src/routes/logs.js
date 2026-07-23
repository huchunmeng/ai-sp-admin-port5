import fs from 'fs'
import path from 'path'
import config from '../config.js'

const LOGS_DIR = path.join(config.DATA_DIR, '..', 'training/public/logs')

export function mountLogs(app) {
  app.post('/api/logs', (req, res) => {
    try {
      if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true })
      const ts = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19)
      const caseId = (req.body.caseId || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '')
      const filename = `${ts}_${caseId}.json`
      const payload = {
        savedAt: new Date().toISOString(),
        caseId: req.body.caseId || 'unknown',
        rounds: req.body.rounds || [],
        totalRounds: (req.body.rounds || []).length
      }
      fs.writeFileSync(path.join(LOGS_DIR, filename), JSON.stringify(payload, null, 2), 'utf-8')

      // 保留最近 50 个文件
      const files = fs.readdirSync(LOGS_DIR).filter(f => f.endsWith('.json')).sort()
      while (files.length > 50) {
        fs.unlinkSync(path.join(LOGS_DIR, files.shift()))
      }
      res.json({ ok: true, filename })
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message })
    }
  })
}
