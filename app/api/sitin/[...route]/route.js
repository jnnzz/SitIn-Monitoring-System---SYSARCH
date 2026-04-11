import { NextResponse } from 'next/server'
import { authenticateRequest, requireAdmin } from '@/lib/server/auth'
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

async function readJson(request) {
  try {
    return await request.json()
  } catch (_) {
    return {}
  }
}

export async function GET(request, { params }) {
  await ensureMigrations()

  const parts = await routeParts(params)
  const auth = authenticateRequest(request)
  if (auth.response) return auth.response

  // ── Student: own sit-in history ───────────────────────────────────────────
  if (parts.length === 2 && parts[0] === 'my' && parts[1] === 'history') {
    try {
      const result = await pool.query(
        `SELECT id, student_id, full_name, lab_name, purpose,
                started_at, ended_at, duration_minutes,
                feedback, rating
         FROM sit_in_records
         WHERE user_id = $1
         ORDER BY ended_at DESC`,
        [auth.user.userId]
      )
      return NextResponse.json(result.rows)
    } catch (error) {
      console.error('[sitin/my/history] Query failed:', error.message)
      return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 })
    }
  }

  // ── Admin-only routes below ───────────────────────────────────────────────
  const adminError = requireAdmin(auth.user)
  if (adminError) return adminError

  if (parts.length === 2 && parts[0] === 'students' && parts[1] === 'search') {
    const query = request.nextUrl.searchParams.get('q')
    if (!query || query.trim().length < 1) {
      return NextResponse.json([])
    }

    try {
      const result = await pool.query(
        `SELECT id, student_id, full_name, email, course, year_level, remaining_sessions, avatar_url
         FROM users
         WHERE role != 'admin' AND (
           LOWER(full_name) LIKE LOWER($1) OR
           LOWER(student_id) LIKE LOWER($1)
         )
         LIMIT 10`,
        [`%${query.trim()}%`]
      )

      return NextResponse.json(result.rows)
    } catch (error) {
      console.error(error)
      return NextResponse.json({ error: 'Search failed' }, { status: 500 })
    }
  }

  if (parts.length === 2 && parts[0] === 'sessions' && parts[1] === 'active') {
    try {
      const result = await pool.query(`
        SELECT
          a.id, a.lab_name, a.purpose, a.started_at,
          u.student_id, u.full_name, u.course, u.year_level, u.remaining_sessions, u.avatar_url
        FROM active_sessions a
        JOIN users u ON u.id = a.user_id
        ORDER BY a.started_at DESC
      `)

      return NextResponse.json(result.rows)
    } catch (error) {
      console.error(error)
      return NextResponse.json({ error: 'Failed to fetch active sessions' }, { status: 500 })
    }
  }

  if (parts.length === 2 && parts[0] === 'sessions' && parts[1] === 'records') {
    try {
      const result = await pool.query(`
        SELECT r.*, u.avatar_url 
        FROM sit_in_records r 
        LEFT JOIN users u ON u.id = r.user_id 
        ORDER BY r.ended_at DESC LIMIT 200
      `)
      return NextResponse.json(result.rows)
    } catch (error) {
      console.error(error)
      return NextResponse.json({ error: 'Failed to fetch records' }, { status: 500 })
    }
  }

  return notFound()
}


export async function POST(request, { params }) {
  await ensureMigrations()

  const parts = await routeParts(params)
  const auth = authenticateRequest(request)
  if (auth.response) return auth.response

  const adminError = requireAdmin(auth.user)
  if (adminError) return adminError

  if (parts.length === 2 && parts[0] === 'sessions' && parts[1] === 'start') {
    const { user_id, lab_name, purpose } = await readJson(request)
    if (!user_id) {
      return NextResponse.json({ error: 'user_id required' }, { status: 400 })
    }

    try {
      const studentRes = await pool.query(
        'SELECT id, full_name, remaining_sessions FROM users WHERE id = $1 AND role != $2',
        [user_id, 'admin']
      )

      if (studentRes.rows.length === 0) {
        return NextResponse.json({ error: 'Student not found' }, { status: 404 })
      }

      const student = studentRes.rows[0]
      if (student.remaining_sessions <= 0) {
        return NextResponse.json({ error: 'Student has no remaining sessions' }, { status: 400 })
      }

      const existing = await pool.query('SELECT id FROM active_sessions WHERE user_id = $1', [user_id])
      if (existing.rows.length > 0) {
        return NextResponse.json({ error: 'Student already has an active session' }, { status: 400 })
      }

      const session = await pool.query(
        'INSERT INTO active_sessions (user_id, lab_name, purpose) VALUES ($1, $2, $3) RETURNING *',
        [user_id, lab_name || 'Computer Lab', purpose || 'General Use']
      )

      return NextResponse.json(session.rows[0], { status: 201 })
    } catch (error) {
      console.error(error)
      return NextResponse.json({ error: 'Failed to start session' }, { status: 500 })
    }
  }

  if (parts.length === 3 && parts[0] === 'sessions' && parts[1] === 'end') {
    const sessionId = Number.parseInt(parts[2], 10)
    if (Number.isNaN(sessionId)) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    try {
      let adminFeedback = null;
      try {
        const body = await request.json();
        if (body.feedback) adminFeedback = body.feedback;
      } catch (e) {
        // Body reading failed, treat as no feedback
      }

      const sessionRes = await pool.query(
        `SELECT a.*, u.student_id, u.full_name, u.remaining_sessions
         FROM active_sessions a JOIN users u ON u.id = a.user_id
         WHERE a.id = $1`,
        [sessionId]
      )

      if (sessionRes.rows.length === 0) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 })
      }

      const session = sessionRes.rows[0]
      const durationMinutes = Math.floor((Date.now() - new Date(session.started_at).getTime()) / 60000)

      await pool.query(
        `INSERT INTO sit_in_records
          (user_id, student_id, full_name, lab_name, purpose, started_at, ended_at, duration_minutes, admin_feedback)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, $8)`,
        [
          session.user_id,
          session.student_id,
          session.full_name,
          session.lab_name,
          session.purpose,
          session.started_at,
          durationMinutes,
          adminFeedback
        ]
      )

      await pool.query(
        'UPDATE users SET remaining_sessions = GREATEST(remaining_sessions - 1, 0) WHERE id = $1',
        [session.user_id]
      )

      await pool.query('DELETE FROM active_sessions WHERE id = $1', [sessionId])

      return NextResponse.json({ message: 'Session ended', duration_minutes: durationMinutes })
    } catch (error) {
      console.error(error)
      return NextResponse.json({ error: 'Failed to end session' }, { status: 500 })
    }
  }

  return notFound()
}

// Student: submit feedback for a past session
export async function PUT(request, { params }) {
  await ensureMigrations()

  const parts = await routeParts(params)
  const auth = authenticateRequest(request)
  if (auth.response) return auth.response

  // PUT /api/sitin/my/feedback/:recordId
  if (parts.length === 3 && parts[0] === 'my' && parts[1] === 'feedback') {
    const recordId = parseInt(parts[2], 10)
    if (isNaN(recordId)) return notFound()

    const body = await readJson(request)
    const { feedback, rating } = body

    if (rating !== undefined && (rating < 1 || rating > 5)) {
      return NextResponse.json({ error: 'Rating must be 1-5' }, { status: 400 })
    }

    try {
      // Add columns if missing (idempotent)
      await pool.query(`ALTER TABLE sit_in_records ADD COLUMN IF NOT EXISTS feedback TEXT`).catch(() => {})
      await pool.query(`ALTER TABLE sit_in_records ADD COLUMN IF NOT EXISTS rating INTEGER`).catch(() => {})

      const result = await pool.query(
        `UPDATE sit_in_records
         SET feedback = COALESCE($1, feedback),
             rating = COALESCE($2, rating)
         WHERE id = $3 AND user_id = $4
         RETURNING id, feedback, rating`,
        [feedback || null, rating || null, recordId, auth.user.userId]
      )
      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Record not found or not yours' }, { status: 404 })
      }
      return NextResponse.json({ message: 'Feedback submitted', record: result.rows[0] })
    } catch (error) {
      console.error(error)
      return NextResponse.json({ error: 'Failed to submit feedback' }, { status: 500 })
    }
  }

  return notFound()
}