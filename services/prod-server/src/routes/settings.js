import fs from 'fs'
import path from 'path'
import config from '../config.js'

const SETTINGS_FILE = path.join(config.DATA_DIR, 'config/settings.json')

export function mountSettings(app) {
  app.get('/api/settings', (_req, res) => {
    try {
      if (fs.existsSync(SETTINGS_FILE)) {
        res.json(JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8')))
      } else {
        res.json({})
      }
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message })
    }
  })

  app.post('/api/settings', (req, res) => {
    try {
      const dir = path.dirname(SETTINGS_FILE)
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
      let existing = {}
      if (fs.existsSync(SETTINGS_FILE)) {
        existing = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'))
      }
      Object.assign(existing, req.body)
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(existing, null, 2), 'utf-8')
      res.json({ ok: true, data: existing })
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message })
    }
  })
}
