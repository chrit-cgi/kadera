/**
 * api/graph.ts — Knowledge graph data
 *
 * GET /api/graph
 *
 * Returns master knowledge graph nodes and the athlete's personal user nodes.
 * Used by the Galaxy screen for 3D visualisation.
 */
import type { IncomingMessage, ServerResponse } from 'http'
import { verifyAuth } from './_lib/auth.js'
import { getDb } from './_lib/firestore.js'

type Req = IncomingMessage & { body?: Record<string, unknown> }

function send(res: ServerResponse, status: number, data: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(data))
}

export default async function handler(req: Req, res: ServerResponse) {
  if (req.method !== 'GET') return send(res, 405, { error: 'Method not allowed' })

  let user: Awaited<ReturnType<typeof verifyAuth>>
  try {
    user = await verifyAuth(req)
  } catch (e) {
    const err = e as { statusCode?: number; message?: string }
    return send(res, err.statusCode ?? 401, { error: err.message ?? 'Unauthorized' })
  }

  try {
    const db = getDb()
    const [masterSnap, userSnap] = await Promise.all([
      db.collection('masterGraph').limit(200).get(),
      db.collection('users').doc(user.uid).collection('userGraph').limit(200).get(),
    ])

    const masterNodes = masterSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
    const userNodes = userSnap.docs.map((d) => ({ id: d.id, ...d.data() }))

    return send(res, 200, { masterNodes, userNodes })
  } catch (err) {
    const e = err as { message?: string }
    return send(res, 500, { error: e.message ?? 'Internal error' })
  }
}
