import fs from 'fs'
import path from 'path'
import config from '../config.js'

const FILE = path.join(config.ROOT, 'packages/shared/data/station-schemes-edits.json')

export function mountStationSchemes(app) {
  app.get('/api/station-schemes-edits', (_req, res) => {
    try {
      if (fs.existsSync(FILE)) {
        res.json(JSON.parse(fs.readFileSync(FILE, 'utf-8')))
      } else {
        res.json({})
      }
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message })
    }
  })

  app.post('/api/station-schemes-edits', (req, res) => {
    try {
      const dir = path.dirname(FILE)
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(FILE, JSON.stringify(req.body, null, 2), 'utf-8')
      res.json({ ok: true })
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message })
    }
  })
}
