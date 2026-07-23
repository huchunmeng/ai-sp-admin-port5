import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import config from '../config.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ANALYZER_SRC = path.resolve(__dirname, '../../../score-analyzer/src')

let _analyzer = null

async function loadAnalyzer() {
  if (!_analyzer) {
    _analyzer = await import(pathToFileURL(path.join(ANALYZER_SRC, 'index.js')).href)
  }
  return _analyzer
}

export function mountScoreReport(app) {
  // POST /api/score-report/analyze-profile
  // 分析单个考核项目的认知剖面（Part B）
  app.post('/api/score-report/analyze-profile', async (req, res) => {
    if (!config.LLM_API_KEY || config.LLM_API_KEY === 'your-api-key-here') {
      res.status(503).json({ ok: false, error: 'LLM API key not configured' })
      return
    }

    const { profileType, records, caseInfo, scoring } = req.body

    if (!profileType) {
      res.status(400).json({ ok: false, error: 'Missing profileType' })
      return
    }
    if (!records || !Array.isArray(records) || records.length === 0) {
      res.status(400).json({ ok: false, error: 'Missing or empty records array' })
      return
    }
    if (!caseInfo) {
      res.status(400).json({ ok: false, error: 'Missing caseInfo' })
      return
    }

    try {
      const { analyzeProfile } = await loadAnalyzer()
      const llmConfig = {
        apiUrl: config.LLM_API_URL,
        apiKey: config.LLM_API_KEY,
        model: config.LLM_MODEL
      }
      const result = await analyzeProfile({ profileType, records, caseInfo, scoring }, llmConfig)
      res.json({ ok: true, data: result })
    } catch (e) {
      console.error(`[scoreReport] Error analyzing profile:`, e.message)
      res.status(500).json({ ok: false, error: e.message })
    }
  })
}
