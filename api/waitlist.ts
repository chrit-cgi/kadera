/**
 * api/waitlist.ts — Public waitlist endpoint (no auth required)
 *
 * POST /api/waitlist — add email to waitlist, send confirmation email
 */
import type { IncomingMessage, ServerResponse } from 'http'
import { getDb } from './_lib/firestore.js'

function send(res: ServerResponse, status: number, data: unknown) {
  const body = JSON.stringify(data)
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(body)
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254
}

type Req = IncomingMessage & { body?: Record<string, unknown> }

export default async function handler(req: Req, res: ServerResponse) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' })

  const email = ((req.body?.email as string) ?? '').toLowerCase().trim()

  if (!isValidEmail(email)) {
    return send(res, 400, { error: 'invalid_email' })
  }

  try {
    const db = getDb()
    const docRef = db.collection('waitlist').doc(email)
    const snap = await docRef.get()

    if (snap.exists) {
      return send(res, 200, { status: 'already_registered' })
    }

    await docRef.set({
      email,
      createdAt: new Date().toISOString(),
      source: 'web_form',
    })

    // Send confirmation email via Resend (graceful skip if key absent)
    if (process.env.RESEND_API_KEY) {
      try {
        const { Resend } = await import('resend')
        const resend = new Resend(process.env.RESEND_API_KEY)
        await resend.emails.send({
          from: 'Kadera <noreply@kaderarunning.ai>',
          to: [email],
          subject: "You're on the Kadera waitlist",
          text: "Thanks for your interest in Kadera! We'll be in touch when a spot opens up.",
        })
      } catch {
        // Resend failure is non-fatal — signup still succeeds
      }
    }

    return send(res, 200, { status: 'added' })
  } catch (err) {
    console.error('[waitlist] error:', err)
    return send(res, 500, { error: 'Internal server error' })
  }
}
