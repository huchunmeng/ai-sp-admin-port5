import fs from 'fs'
import path from 'path'
import config from '../config.js'

export function mountPrompts(app) {
  app.get('/api/prompts/:name', (req, res) => {
    const name = req.params.name
    if (!/^[a-zA-Z0-9_-]+\.txt$/.test(name)) {
      res.status(400).json({ ok: false, error: 'Invalid prompt file name' })
      return
    }
    const filePath = path.join(config.PROMPTS_DIR, name)
    try {
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const content = fs.readFileSync(filePath, 'utf-8')
        res.type('text/plain; charset=utf-8').send(content)
        return
      }
    } catch { /* fall through */ }
    res.status(404).json({ ok: false, error: 'Prompt file not found' })
  })
}
