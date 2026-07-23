import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import fs from 'node:fs'
import path from 'node:path'
import annoPlugin from '../../scripts/anno-plugin.mjs'
import stationSchemesPersist from '../../scripts/station-schemes-persist.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ADMIN_PUBLIC_DIR = path.resolve(__dirname, '../admin/public')

function serveAdminPublicPlugin() {
  return {
    name: 'serve-admin-public',
    configureServer(server) {
      server.middlewares.use('/images', (req, res, next) => {
        const filePath = path.join(ADMIN_PUBLIC_DIR, 'images', req.url.split('?')[0])
        try {
          if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            const ext = path.extname(filePath).toLowerCase()
            const mimeMap = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp' }
            res.writeHead(200, { 'Content-Type': mimeMap[ext] || 'application/octet-stream' })
            fs.createReadStream(filePath).pipe(res)
            return
          }
        } catch {}
        next()
      })
      server.middlewares.use('/videos', (req, res, next) => {
        const filePath = path.join(ADMIN_PUBLIC_DIR, 'videos', req.url.split('?')[0])
        try {
          if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            const ext = path.extname(filePath).toLowerCase()
            const mimeMap = { '.mp4': 'video/mp4', '.webm': 'video/webm' }
            res.writeHead(200, { 'Content-Type': mimeMap[ext] || 'application/octet-stream' })
            fs.createReadStream(filePath).pipe(res)
            return
          }
        } catch {}
        next()
      })
    }
  }
}

export default defineConfig(({ mode }) => ({
  base: '/',
  plugins: [annoPlugin(), stationSchemesPersist(), serveAdminPublicPlugin(), vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@ai-sp/shared': fileURLToPath(new URL('../../packages/shared/src/index.js', import.meta.url))
    }
  },
  define: {
    'import.meta.env.VITE_ADMIN_URL': JSON.stringify(process.env.VITE_ADMIN_URL || ''),
    'import.meta.env.VITE_TRAINING_URL': JSON.stringify(process.env.VITE_TRAINING_URL || ''),
    'import.meta.env.VITE_EXAM_URL': JSON.stringify(''),
    'import.meta.env.VITE_OPS_URL': JSON.stringify(process.env.VITE_OPS_URL || ''),
    'import.meta.env.VITE_APP_TRAINING_URL': JSON.stringify(process.env.VITE_APP_TRAINING_URL || ''),
  },
  server: {
    port: 5003
  }
}))
