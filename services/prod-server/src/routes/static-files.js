import fs from 'fs'
import path from 'path'
import config from '../config.js'

const MIME = {
  '.json': 'application/json', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp',
  '.mp4': 'video/mp4', '.webm': 'video/webm',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav',
  '.pdf': 'application/pdf',
}

function serveDir(prefix, dir) {
  return (req, res) => {
    const urlPath = req.path.replace(prefix, '')
    const filePath = path.join(dir, urlPath)
    try {
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath).toLowerCase()
        res.type(MIME[ext] || 'application/octet-stream')
        fs.createReadStream(filePath).pipe(res)
        return
      }
    } catch { /* fall through */ }
    res.status(404).end()
  }
}

export function mountStaticFiles(app) {
  const publicDir = config.DATA_DIR
  app.use('/data/cases', serveDir('/data/cases', path.join(publicDir, 'data/cases')))
  app.use('/data', (req, res, next) => {
    if (req.path.startsWith('/cases')) return next('route')
    serveDir('/data', path.join(publicDir, 'data'))(req, res)
  })
  app.use('/images', serveDir('/images', path.join(publicDir, 'images')))
  app.use('/videos', serveDir('/videos', path.join(publicDir, 'videos')))
}
