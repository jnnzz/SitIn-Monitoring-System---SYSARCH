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

function parseLimit(value, fallback, max = 200) {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback
  return Math.min(parsed, max)
}

function formatDuration(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) return `${minutes}m`
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
}

export async function GET(request, { params }) {
  await ensureMigrations()

  const parts = await routeParts(params)
  const auth = authenticateRequest(request)
  if (auth.response) return auth.response

  // GET /api/rewards/me — current student's session stats
  if (parts.length === 1 && parts[0] === 'me') {
    try {
      const statsRes = await pool.query(
        `SELECT 
           COUNT(*)::int AS total_sessions,
           COALESCE(SUM(duration_minutes), 0)::int AS total_minutes
         FROM sit_in_records
         WHERE user_id = $1`,
        [auth.user.userId]
      )

      const recentRes = await pool.query(
        `SELECT id, lab_name, purpose, started_at, ended_at, duration_minutes
         FROM sit_in_records
         WHERE user_id = $1
         ORDER BY ended_at DESC
         LIMIT 10`,
        [auth.user.userId]
      )

      const row = statsRes.rows[0] || { total_sessions: 0, total_minutes: 0 }

      return NextResponse.json({
        total_sessions: row.total_sessions,
        total_minutes: row.total_minutes,
        total_hours: Number((row.total_minutes / 60).toFixed(1)),
        formatted_duration: formatDuration(row.total_minutes),
        recent_sessions: recentRes.rows,
      })
    } catch (error) {
      console.error(error)
      return NextResponse.json({ error: 'Failed to fetch session stats' }, { status: 500 })
    }
  }

  // GET /api/rewards/leaderboard — ranked by total session hours
  if (parts.length === 1 && parts[0] === 'leaderboard') {
    const limit = parseLimit(request.nextUrl.searchParams.get('limit'), 10, 50)
    try {
      const result = await pool.query(
        `SELECT 
           u.id,
           u.student_id,
           u.full_name,
           u.course,
           COUNT(s.id)::int AS total_sessions,
           COALESCE(SUM(s.duration_minutes), 0)::int AS total_minutes
         FROM users u
         LEFT JOIN sit_in_records s ON s.user_id = u.id
         WHERE u.role != 'admin'
         GROUP BY u.id, u.student_id, u.full_name, u.course
         HAVING COALESCE(SUM(s.duration_minutes), 0) > 0
         ORDER BY total_minutes DESC, total_sessions DESC, u.full_name ASC
         LIMIT $1`,
        [limit]
      )

      const leaderboard = result.rows.map((row) => ({
        ...row,
        total_hours: Number((row.total_minutes / 60).toFixed(1)),
        formatted_duration: formatDuration(row.total_minutes),
      }))

      return NextResponse.json(leaderboard)
    } catch (error) {
      console.error(error)
      return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 })
    }
  }

  return notFound()
}
