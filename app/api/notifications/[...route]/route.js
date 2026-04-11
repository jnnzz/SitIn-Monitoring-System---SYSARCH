import { NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/server/auth'
import { pool } from '@/lib/server/db'
import { ensureMigrations } from '@/lib/server/migrations'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function routeParts(paramsPromise) {
  const resolvedParams = await paramsPromise
  return Array.isArray(resolvedParams?.route) ? resolvedParams.route : []
}

function notFound() {
  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}

// Ensure notifications table exists
async function ensureNotifTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      title VARCHAR(255) NOT NULL,
      message TEXT,
      type VARCHAR(50) DEFAULT 'announcement',
      is_read BOOLEAN DEFAULT FALSE,
      reference_id INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `).catch(() => {})
}

// GET /api/notifications          → list all for user
// GET /api/notifications/unread-count → count unread
export async function GET(request, { params }) {
  await ensureMigrations()
  await ensureNotifTable()

  const parts = await routeParts(params)
  const auth = authenticateRequest(request)
  if (auth.response) return auth.response

  // GET /api/notifications/unread-count
  if (parts.length === 1 && parts[0] === 'unread-count') {
    try {
      const result = await pool.query(
        'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = FALSE',
        [auth.user.userId]
      )
      return NextResponse.json({ count: parseInt(result.rows[0].count) })
    } catch (error) {
      console.error(error)
      return NextResponse.json({ error: 'Failed to fetch count' }, { status: 500 })
    }
  }

  // GET /api/notifications/list (all notifications)
  if (parts.length === 1 && parts[0] === 'list') {
    try {
      const result = await pool.query(
        `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
        [auth.user.userId]
      )
      return NextResponse.json(result.rows)
    } catch (error) {
      console.error(error)
      return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
    }
  }

  return notFound()
}

// PUT /api/notifications/read-all      → mark all read
// PUT /api/notifications/:id/read      → mark one read
export async function PUT(request, { params }) {
  await ensureMigrations()
  await ensureNotifTable()

  const parts = await routeParts(params)
  const auth = authenticateRequest(request)
  if (auth.response) return auth.response

  // PUT /api/notifications/read-all
  if (parts.length === 1 && parts[0] === 'read-all') {
    try {
      await pool.query(
        'UPDATE notifications SET is_read = TRUE WHERE user_id = $1',
        [auth.user.userId]
      )
      return NextResponse.json({ message: 'All marked as read' })
    } catch (error) {
      console.error(error)
      return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
    }
  }

  // PUT /api/notifications/:id/read
  if (parts.length === 2 && parts[1] === 'read') {
    const id = parseInt(parts[0], 10)
    if (isNaN(id)) return notFound()
    try {
      await pool.query(
        'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2',
        [id, auth.user.userId]
      )
      return NextResponse.json({ message: 'Marked as read' })
    } catch (error) {
      console.error(error)
      return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
    }
  }

  return notFound()
}
