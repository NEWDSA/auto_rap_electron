const { chromium } = require('playwright')
const http = require('http')
const { spawn } = require('child_process')

function writeJsonRpc(id, result) {
  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, result }) + '\n')
}

function writeJsonRpcError(id, code, message, data) {
  const error = { code, message }
  if (data !== undefined) error.data = data
  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, error }) + '\n')
}

function ping(url) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, { method: 'GET' }, (res) => {
      res.resume()
      resolve(res.statusCode || 0)
    })
    req.on('error', reject)
    req.setTimeout(2000, () => req.destroy(new Error('timeout')))
    req.end()
  })
}

function startDevServer({ host, port }) {
  const cmd = `npm run dev -- --host ${host} --port ${port}`
  const child = spawn(cmd, {
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
    shell: true,
  })

  const baseUrl = `http://${host}:${port}`

  const waitReady = async () => {
    const deadline = Date.now() + 120000
    while (Date.now() < deadline) {
      try {
        const status = await ping(baseUrl)
        if (status > 0) return baseUrl
      } catch {}
      await new Promise((r) => setTimeout(r, 600))
    }
    throw new Error('启动开发服务器超时')
  }

  const stop = async () => {
    if (!child.pid) return
    if (process.platform === 'win32') {
      await new Promise((resolve) => {
        const killer = spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
          stdio: 'ignore',
          windowsHide: true,
        })
        killer.on('close', () => resolve())
      })
      return
    }
    try {
      child.kill('SIGTERM')
    } catch {}
  }

  return { child, baseUrl, waitReady, stop }
}

async function assertSelectors(page, selectors) {
  for (const selector of selectors) {
    await page.waitForSelector(selector, { timeout: 15000 })
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

async function runUiCheck(args) {
  const baseUrl = args?.baseUrl || ''
  const autoStart = args?.autoStart !== false
  const host = args?.host || '127.0.0.1'
  const port = Number(args?.port || 3000)

  const cssVars = args?.cssVars || ['--background-color', '--surface-color', '--text-color', '--border-radius']

  const server = !baseUrl && autoStart ? startDevServer({ host, port }) : null
  const targetBaseUrl = baseUrl || (server ? await server.waitReady() : `http://${host}:${port}`)

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()

  const results = []
  try {
    for (const c of buildChecks(targetBaseUrl)) {
      await page.goto(c.url, { waitUntil: 'domcontentloaded', timeout: 45000 })
      await page.waitForTimeout(400)
      await assertSelectors(page, c.selectors)
      await assertCssVars(page, cssVars)
      results.push({ name: c.name, ok: true })
    }
    return { ok: true, baseUrl: targetBaseUrl, results }
  } finally {
    try { await browser.close() } catch {}
    try { if (server) await server.stop() } catch {}
  }
}

const tools = [
  {
    name: 'ui_check',
    description: '检查 UI 改动是否生效（关键选择器 + CSS 变量）',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        baseUrl: { type: 'string', description: '已启动的站点地址，例如 http://127.0.0.1:3000' },
        autoStart: { type: 'boolean', description: '未提供 baseUrl 时是否自动启动 dev server', default: true },
        host: { type: 'string', default: '127.0.0.1' },
        port: { type: 'number', default: 3000 },
        cssVars: { type: 'array', items: { type: 'string' } },
      },
    },
  },
]

function toolResultText(payload) {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(payload, null, 2),
      },
    ],
    isError: false,
  }
}

async function handleRequest(msg) {
  const { id, method, params } = msg

  if (method === 'initialize') {
    return writeJsonRpc(id, {
      protocolVersion: params?.protocolVersion || '2024-11-05',
      serverInfo: { name: 'auto_rap_electron-ui-check', version: '1.0.0' },
      capabilities: { tools: {} },
    })
  }

  if (method === 'tools/list') {
    return writeJsonRpc(id, { tools })
  }

  if (method === 'tools/call') {
    const name = params?.name
    const args = params?.arguments

    if (name === 'ui_check') {
      try {
        const res = await runUiCheck(args)
        return writeJsonRpc(id, toolResultText(res))
      } catch (e) {
        return writeJsonRpc(id, {
          content: [{ type: 'text', text: e?.message || String(e) }],
          isError: true,
        })
      }
    }

    return writeJsonRpcError(id, -32601, `Unknown tool: ${name}`)
  }

  if (id !== undefined) {
    return writeJsonRpcError(id, -32601, `Unknown method: ${method}`)
  }
}

let buffer = ''
process.stdin.setEncoding('utf8')
process.stdin.on('data', (chunk) => {
  buffer += chunk
  while (true) {
    const idx = buffer.indexOf('\n')
    if (idx === -1) break
    const line = buffer.slice(0, idx).trim()
    buffer = buffer.slice(idx + 1)
    if (!line) continue
    let msg
    try {
      msg = JSON.parse(line)
    } catch {
      continue
    }
    Promise.resolve(handleRequest(msg)).catch(() => {})
  }
})

process.stdin.on('end', () => {
  process.exit(0)
})
