/**
 * Local Express dev server that mirrors Vercel function routing.
 * Proxies /api/<name>[/...] to api/<name>.ts handler default export.
 *
 * Usage: tsx scripts/dev-server.ts
 * Port:  DEV_SERVER_PORT env var (default 3001)
 */
import express, { type Request, type Response } from 'express'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const port = Number(process.env.DEV_SERVER_PORT) || 3001

const app = express()

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// ── Health check ────────────────────────────────────────────────────────────

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), killSwitch: false })
})

// ── Vercel function proxy ───────────────────────────────────────────────────
//
// /api/<handler>/<sub-path> → api/<handler>.ts default export(req, res)
// The handler receives the full req/res, just like a Vercel function would.

app.all('/api/*', async (req: Request, res: Response) => {
  // Extract the first path segment after /api/ as the handler name
  const segments = req.path.replace(/^\/api\//, '').split('/')
  const handlerName = segments[0]

  if (!handlerName) {
    res.status(404).json({ error: 'No handler specified' })
    return
  }

  const handlerPath = path.resolve(__dirname, `../api/${handlerName}.ts`)

  try {
    // Dynamic import via tsx — re-imports on each request in dev for hot refresh
    const mod = await import(`${handlerPath}?t=${Date.now()}`)
    const handler = mod.default

    if (typeof handler !== 'function') {
      res.status(500).json({ error: `api/${handlerName}.ts has no default export function` })
      return
    }

    await handler(req, res)
  } catch (error) {
    const err = error as NodeJS.ErrnoException
    if (err.code === 'ERR_MODULE_NOT_FOUND' || err.code === 'MODULE_NOT_FOUND') {
      res.status(404).json({ error: `API handler not found: api/${handlerName}.ts` })
    } else {
      console.error(`[dev-server] Error in api/${handlerName}:`, err)
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal server error', detail: err.message })
      }
    }
  }
})

app.listen(port, () => {
  console.log(`[dev-server] Running on http://localhost:${port}`)
  console.log(`[dev-server] Proxying /api/* → api/*.ts`)
})
