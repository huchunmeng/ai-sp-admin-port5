import { spawn, exec } from 'node:child_process'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import os from 'node:os'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const nodeExe = process.execPath
const viteBin = resolve(root, 'node_modules', 'vite', 'bin', 'vite.js')
const isWindows = os.platform() === 'win32'

const args = process.argv.slice(2)
const fullMode = args.includes('--full') || args.includes('-f')

const services = [
  { name: 'SP API', icon: '🤖', dir: 'services/sp-api', url: 'http://localhost:5100', cmd: 'src/index.js' },
]

const apps = [
  { name: '训练端', icon: '🎯', dir: 'apps/training', url: 'http://localhost:5001' },
  { name: '管理端', icon: '⚙️', dir: 'apps/admin', url: 'http://localhost:5002' },
]
if (fullMode) {
  apps.push(
    { name: '考试端', icon: '📋', dir: 'apps/exam', url: 'http://localhost:5003' },
    { name: '电子书包', icon: '📱', dir: 'apps/app-training', url: 'http://localhost:5004' },
    { name: '运营平台', icon: '📊', dir: 'apps/ops', url: 'http://localhost:5005' }
  )
}

const allTargets = [...services, ...apps]

console.log('\n  🧹 清理旧进程与端口...')

async function main() {
  const pids = await getPortPids(allTargets.map(a => parseInt(a.url.split(':').pop())))
  if (pids.length > 0) {
    console.log(`  发现 ${pids.length} 个占用进程，正在关闭...`)
    await killPids(pids)
    console.log('  已关闭。等待端口释放...')
    await sleep(2000)
  }
  doLaunch()
}

function getPortPids(ports) {
  return new Promise(resolvePids => {
    if (isWindows) {
      exec('netstat -ano | findstr LISTENING', (err, stdout) => {
        if (err) { resolvePids([]); return }
        const portSet = new Set(ports)
        const pids = []
        ;(stdout || '').split('\n').forEach(l => {
          const m = l.match(/:(\d+)\s+\S+\s+\S+\s+(\d+)/)
          if (m && portSet.has(parseInt(m[1]))) {
            const pid = parseInt(m[2])
            if (pid && pid !== process.pid && !pids.includes(pid)) {
              pids.push(pid)
            }
          }
        })
        resolvePids(pids)
      })
    } else {
      // macOS / Linux: lsof
      exec(`lsof -ti:${ports.join(',')} 2>/dev/null`, (err, stdout) => {
        if (err) { resolvePids([]); return }
        const pids = (stdout || '').split('\n').map(s => parseInt(s.trim())).filter(p => p && p !== process.pid)
        resolvePids([...new Set(pids)])
      })
    }
  })
}

function killPids(pids) {
  return new Promise(resolveKill => {
    if (isWindows) {
      const killCmd = pids.map(p => `Stop-Process -Id ${p} -Force`).join('; ')
      exec(`powershell -NoProfile -Command "${killCmd}"`, () => resolveKill())
    } else {
      const killCmd = pids.map(p => `kill ${p}`).join('; ')
      exec(killCmd, () => resolveKill())
    }
  })
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

function openBrowser(urls) {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  if (isWindows) {
    const firstUrl = urls[0]
    const otherUrls = urls.slice(1)
    let cmd = `"${chromePath}" --new-window "${firstUrl}"`
    for (const url of otherUrls) {
      cmd += ` --new-tab "${url}"`
    }
    exec(cmd)
  } else if (os.platform() === 'darwin') {
    exec(`open -a "Google Chrome" "${urls[0]}"`)
    for (let i = 1; i < urls.length; i++) {
      exec(`open -a "Google Chrome" "${urls[i]}"`)
    }
  } else {
    exec(`xdg-open "${urls[0]}"`)
    for (let i = 1; i < urls.length; i++) {
      exec(`xdg-open "${urls[i]}"`)
    }
  }
}

function doLaunch() {
  console.log(fullMode ? '🚀 AI-SP 五端启动中...' : '🚀 AI-SP 双端启动中...')

  const seen = new Set()
  const children = []

  process.on('SIGINT', () => {
    console.log('\n  正在停止...')
    children.forEach(c => { try { c.kill() } catch (e) {} })
    process.exit()
  })

  // 启动后端服务 (--env-file 加载 .env，Node 20.6+)
  for (const svc of services) {
    const child = spawn(nodeExe, ['--env-file=.env', svc.cmd], {
      cwd: resolve(root, svc.dir),
      stdio: 'pipe',
      env: { ...process.env, FORCE_COLOR: '0' }
    })

    child.stdout.on('data', d => {
      const t = d.toString()
      if (!seen.has(svc.name) && t.includes('启动成功')) {
        seen.add(svc.name)
        console.log(`  ${svc.icon} ${svc.name} → ${svc.url}`)
      }
    })
    child.stderr.on('data', () => {})
    children.push(child)
  }

  // 启动前端应用
  for (const app of apps) {
    const child = spawn(nodeExe, [viteBin, '--host'], {
      cwd: resolve(root, app.dir),
      stdio: 'pipe',
      env: { ...process.env, FORCE_COLOR: '0' }
    })

    child.stdout.on('data', d => {
      const t = d.toString()
      if (!seen.has(app.name) && (t.includes('Local:') || t.includes('localhost'))) {
        seen.add(app.name)
        console.log(`  ${app.icon} ${app.name} → ${app.url}`)
      }
    })
    child.stderr.on('data', () => {})
    children.push(child)
  }

  setTimeout(() => {
    console.log('\n  🌐 打开浏览器...')
    openBrowser(apps.map(a => a.url))
    console.log('  按 Ctrl+C 停止所有服务\n')
  }, 5000)
}

main()
