import { getDb } from './firestore.js'
import type { AuditEvent } from '../../src/types/index.js'

/**
 * Write a structured audit log entry to the `auditLog` collection.
 *
 * NEVER include: message content, feel scores, meal content, session notes.
 * Schema per research D-09: four event types, fixed field set.
 */
export async function writeAuditLog(event: AuditEvent): Promise<void> {
  const db = getDb()
  await db.collection('auditLog').add({
    ...event,
    timestamp: new Date().toISOString(),
  })
}
