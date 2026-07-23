import fs from 'fs'
import config from '../config.js'

const VOICE_CONFIG_FILE = `${config.DATA_DIR}/data/patient-voice-config.json`

export function mountVoiceConfig(app) {
  app.get('/api/voice-config', (_req, res) => {
    try {
      if (fs.existsSync(VOICE_CONFIG_FILE)) {
        res.json(JSON.parse(fs.readFileSync(VOICE_CONFIG_FILE, 'utf-8')))
      } else {
        res.status(404).json({ error: 'voice config not found' })
      }
    } catch (e) {
      res.status(500).json({ error: e.message })
    }
  })

  app.post('/api/voice-config', (req, res) => {
    try {
      fs.writeFileSync(VOICE_CONFIG_FILE, JSON.stringify(req.body, null, 2), 'utf-8')
      res.json({ ok: true })
    } catch (e) {
      res.status(400).json({ error: e.message })
    }
  })
}
