import { initializeApp, getApps, cert, type App } from 'firebase-admin/app'
import { getFirestore, type Firestore } from 'firebase-admin/firestore'

let app: App
let _db: Firestore | null = null

function initFirebase(): App {
  if (getApps().length > 0) return getApps()[0]!

  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  })
}

// Allow test/dev environments to inject a mock db instance
let _mockDb: Firestore | null = null

export function setMockDb(mock: Firestore | null): void {
  _mockDb = mock
}

export function getDb(): Firestore {
  if (_mockDb) return _mockDb
  if (_db) return _db

  app = initFirebase()
  _db = getFirestore(app)
  return _db
}

// Convenience singleton export — use `db` in all api handlers
export const db = new Proxy({} as Firestore, {
  get(_target, prop) {
    return getDb()[prop as keyof Firestore]
  },
})
