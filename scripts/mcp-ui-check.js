const { chromium } = require('playwright')

const { spawn } = require('child_process')
const http = require('http')

const defaultBaseUrl = process.env.MCP_BASE_URL || ''

function buildChecks(baseUrl) {
  return [
  {
    name: 'Layout(Home)',
    url: `${baseUrl}/#/home`,
    selectors: ['.app-topbar', '.app-aside', '.app-main'],
  },
  {
    name: 'Designer',
    url: `${baseUrl}/#/designer`,
    selectors: ['.designer-shell', '.designer-topbar', '.designer-statusbar'],
  },
  ]
}

function startViteDevServer() {
  const child = spawn('npm run dev -- --host 127.0.0.1 --port 3000', {
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
    shell: true,
  })

  let resolved = false

  const baseUrl = 'http://127.0.0.1:3000'

  const ping = () =>
    new Promise((resolve, reject) => {
      const req = http.request(baseUrl, { method: 'GET' }, (res) => {
        res.resume()
        resolve(res.statusCode || 0)
      })
      req.on('error', reject)
      req.setTimeout(2000, () => {
        req.destroy(new Error('timeout'))
      })
      req.end()
    })

  return {
    child,
    waitReady: () =>
      new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          if (resolved) return
          reject(new Error('启动开发服务器超时'))
        }, 120000)

        const interval = setInterval(async () => {
          if (resolved) return
          try {
            const status = await ping()
            if (status > 0) {
              resolved = true
              clearTimeout(timeout)
              clearInterval(interval)
              resolve(baseUrl)
            }
          } catch {}
        }, 600)

        child.on('exit', (code) => {
          if (resolved) return
          clearTimeout(timeout)
          clearInterval(interval)
          reject(new Error(`开发服务器异常退出: ${code}`))
        })

        child.on('error', (err) => {
          if (resolved) return
          clearTimeout(timeout)
          clearInterval(interval)
          reject(new Error(`启动开发服务器失败: ${err?.message || String(err)}`))
        })
      }),
    stop: () =>
      new Promise((resolve) => {
        if (!child.pid) return resolve()
        if (process.platform === 'win32') {
          const killer = spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
            stdio: 'ignore',
            windowsHide: true,
          })
          killer.on('close', () => resolve())
          return
        }
        child.kill('SIGTERM')
        setTimeout(() => resolve(), 1500)
      }),
  }
}

async function assertSelectors(page, selectors) {
  for (const selector of selectors) {
    try {
      await page.waitForSelector(selector, { timeout: 15000 })
    } catch {
      throw new Error(`缺少元素: ${selector}`)
    }
  }
}

async function assertCssVars(page, vars) {
  const values = await page.evaluate((names) => {
    const style = getComputedStyle(document.documentElement)
    const out = {}
    for (const n of names) out[n] = style.getPropertyValue(n).trim()
    return out
  }, vars)

  for (const [k, v] of Object.entries(values)) {
    if (!v) throw new Error(`CSS 变量为空: ${k}`)
  }
}

async function run() {
  const server = defaultBaseUrl ? null : startViteDevServer()
  const results = []
  let browser = null

  try {
    const baseUrl = defaultBaseUrl || (await server.waitReady())
    browser = await chromium.launch({ headless: true })
    const page = await browser.newPage()

    const cssVars = ['--background-color', '--surface-color', '--text-color', '--border-radius']

    for (const c of buildChecks(baseUrl)) {
      await page.goto(c.url, { waitUntil: 'domcontentloaded', timeout: 45000 })
      await page.waitForTimeout(400)
      await assertSelectors(page, c.selectors)
      await assertCssVars(page, cssVars)
      results.push({ name: c.name, ok: true })
    }

    process.stdout.write(`MCP UI CHECK PASS\n${results.map(r => `- ${r.name}`).join('\n')}\n`)
    process.exitCode = 0
  } catch (e) {
    results.push({ name: 'FAILED', ok: false, error: e?.message || String(e) })
    process.stderr.write(`MCP UI CHECK FAIL\n${results.map(r => r.ok ? `- ${r.name}` : `- ${r.name}: ${r.error}`).join('\n')}\n`)
    process.exitCode = 1
  } finally {
    try {
      if (browser) await browser.close()
    } catch {}
    try {
      if (server) await server.stop()
    } catch {}
  }
}

run()
