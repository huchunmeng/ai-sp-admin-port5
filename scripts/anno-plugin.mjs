import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ANNO_FILE = path.resolve(__dirname, '..', '.annotations.json')

export default function annoPlugin() {
  return {
    name: 'anno-persistence',
    configureServer(server) {
      server.middlewares.use(function(req, res, next) {
        const url = req.url.split('?')[0]
        if (req.method === 'GET' && url === '/api/save-annotations') {
          try {
            if (fs.existsSync(ANNO_FILE)) {
              res.writeHead(200, { 'Content-Type': 'application/json' })
              res.end(fs.readFileSync(ANNO_FILE, 'utf-8'))
            } else {
              res.writeHead(200, { 'Content-Type': 'application/json' })
              res.end('[]')
            }
          } catch (e) {
            res.writeHead(500, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: false, error: e.message }))
          }
          return
        }
        if (req.method === 'POST' && url === '/api/save-annotations') {
          let body = ''
          req.on('data', chunk => { body += chunk })
          req.on('end', () => {
            try {
              fs.writeFileSync(ANNO_FILE, body, 'utf-8')
              res.writeHead(200, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ ok: true }))
            } catch (e) {
              res.writeHead(500, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ ok: false, error: e.message }))
            }
          })
          return
        }
        if (req.method === 'DELETE' && url === '/api/save-annotations') {
          try { fs.unlinkSync(ANNO_FILE) } catch (e) {}
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ ok: true }))
          return
        }
        next()
      })
    }
  }
}
