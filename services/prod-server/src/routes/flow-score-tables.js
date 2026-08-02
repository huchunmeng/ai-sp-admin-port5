import fs from 'fs'
import path from 'path'
import config from '../config.js'

const FILE = path.join(config.ROOT, 'packages/shared/data/flow-score-tables.json')

export function mountFlowScoreTables(app) {
  app.get('/api/flow-score-tables', (_req, res) => {
    try {
      if (fs.existsSync(FILE)) {
        res.json(JSON.parse(fs.readFileSync(FILE, 'utf-8')))
      } else {
        res.status(404).json({ ok: false, error: 'flow-score-tables.json not found' })
      }
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message })
    }
  })

  app.post('/api/flow-score-tables', (req, res) => {
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
