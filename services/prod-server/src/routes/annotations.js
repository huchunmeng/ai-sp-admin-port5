import fs from 'fs'
import path from 'path'
import config from '../config.js'

const ANNO_FILE = path.join(config.DATA_DIR, '..', '.annotations.json')

export function mountAnnotations(app) {
  app.get('/api/save-annotations', (_req, res) => {
    try {
      if (fs.existsSync(ANNO_FILE)) {
        res.json(JSON.parse(fs.readFileSync(ANNO_FILE, 'utf-8')))
      } else {
        res.json([])
      }
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message })
    }
  })

  app.post('/api/save-annotations', (req, res) => {
    try {
      fs.writeFileSync(ANNO_FILE, JSON.stringify(req.body, null, 2), 'utf-8')
      res.json({ ok: true })
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message })
    }
  })

  app.delete('/api/save-annotations', (_req, res) => {
    try {
      if (fs.existsSync(ANNO_FILE)) fs.unlinkSync(ANNO_FILE)
      res.json({ ok: true })
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message })
    }
  })
}
