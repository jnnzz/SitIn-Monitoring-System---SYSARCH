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

async function safeQuery(text, params = [], fallbackRows = []) {
  try {
    return await pool.query(text, params)
  } catch (error) {
    if (error?.code === '42P01') {
      return { rows: fallbackRows }
    }
    throw error
  }
}

function buildDateWhere(column, from, to) {
  const clauses = []
  const params = []

  if (from) {
    params.push(from)
    clauses.push(`${column}::date >= $${params.length}`)
  }

  if (to) {
    params.push(to)
    clauses.push(`${column}::date <= $${params.length}`)
  }

  return {
    where: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '',
    params,
  }
}

function defaultRange(query) {
  const from = query.get('from')
  const to = query.get('to')
  if (!from && !to) {
    const start = new Date()
    start.setDate(start.getDate() - 30)
    return { from: start.toISOString().slice(0, 10), to: null }
  }
  return { from, to }
}

export async function GET(request, { params }) {
  await ensureMigrations()

  const parts = await routeParts(params)
  const auth = authenticateRequest(request)
  if (auth.response) return auth.response

  const adminError = requireAdmin(auth.user)
  if (adminError) return adminError

  if (parts.length === 1 && parts[0] === 'summary') {
    try {
      const usersRes = await pool.query("SELECT COUNT(*)::int AS count FROM users WHERE role != 'admin'")
      const sessionsRes = await safeQuery(
        'SELECT COUNT(*)::int AS count, COALESCE(AVG(duration_minutes), 0)::int AS avg_duration FROM sit_in_records',
        [],
        [{ count: 0, avg_duration: 0 }]
      )
      const activeRes = await safeQuery(
        'SELECT COUNT(*)::int AS count FROM active_sessions',
        [],
        [{ count: 0 }]
      )
      const reservationRes = await safeQuery(
        'SELECT status, COUNT(*)::int AS count FROM reservations GROUP BY status',
        [],
        []
      )

      const reservationByStatus = {}
      let reservationTotal = 0
      for (const row of reservationRes.rows) {
        reservationByStatus[row.status] = row.count
        reservationTotal += row.count
      }

      return NextResponse.json({
        total_users: usersRes.rows[0]?.count || 0,
        total_sessions: sessionsRes.rows[0]?.count || 0,
        average_duration_minutes: sessionsRes.rows[0]?.avg_duration || 0,
        active_sessions: activeRes.rows[0]?.count || 0,
        reservations: {
          total: reservationTotal,
          by_status: reservationByStatus,
        },
      })
    } catch (error) {
      console.error(error)
      return NextResponse.json({ error: 'Failed to load summary analytics' }, { status: 500 })
    }
  }

  if (parts.length === 1 && parts[0] === 'sessions') {
    const range = defaultRange(request.nextUrl.searchParams)
    const { where, params: whereParams } = buildDateWhere('ended_at', range.from, range.to)
    try {
      const result = await safeQuery(
        `SELECT DATE(ended_at) AS date,
                COUNT(*)::int AS count,
                COALESCE(AVG(duration_minutes), 0)::int AS avg_duration
         FROM sit_in_records
         ${where}
         GROUP BY DATE(ended_at)
         ORDER BY DATE(ended_at)`,
        whereParams,
        []
      )
      return NextResponse.json(result.rows)
    } catch (error) {
      console.error(error)
      return NextResponse.json({ error: 'Failed to fetch session analytics' }, { status: 500 })
    }
  }

  if (parts.length === 1 && parts[0] === 'labs') {
    try {
      const result = await safeQuery(
        `SELECT lab_name,
                COUNT(*)::int AS sessions,
                COALESCE(AVG(duration_minutes), 0)::int AS avg_duration
         FROM sit_in_records
         WHERE lab_name IS NOT NULL
         GROUP BY lab_name
         ORDER BY sessions DESC`,
        [],
        []
      )
      return NextResponse.json(result.rows)
    } catch (error) {
      console.error(error)
      return NextResponse.json({ error: 'Failed to fetch lab analytics' }, { status: 500 })
    }
  }

  if (parts.length === 1 && parts[0] === 'reservations') {
    try {
      const result = await safeQuery(
        'SELECT status, COUNT(*)::int AS count FROM reservations GROUP BY status',
        [],
        []
      )
      let total = 0
      const byStatus = {}
      for (const row of result.rows) {
        byStatus[row.status] = row.count
        total += row.count
      }
      return NextResponse.json({ total, by_status: byStatus, rows: result.rows })
    } catch (error) {
      console.error(error)
      return NextResponse.json({ error: 'Failed to fetch reservation analytics' }, { status: 500 })
    }
  }

  if (parts.length === 1 && parts[0] === 'peak-hours') {
    const range = defaultRange(request.nextUrl.searchParams)
    const hourRange = buildDateWhere('started_at', range.from, range.to)
    const dayRange = buildDateWhere('started_at', range.from, range.to)
    try {
      const hoursRes = await safeQuery(
        `SELECT EXTRACT(HOUR FROM started_at)::int AS hour, COUNT(*)::int AS count
         FROM sit_in_records
         ${hourRange.where}
         GROUP BY hour
         ORDER BY hour`,
        hourRange.params,
        []
      )
      const daysRes = await safeQuery(
        `SELECT EXTRACT(DOW FROM started_at)::int AS day, COUNT(*)::int AS count
         FROM sit_in_records
         ${dayRange.where}
         GROUP BY day
         ORDER BY day`,
        dayRange.params,
        []
      )
      return NextResponse.json({ hours: hoursRes.rows, days: daysRes.rows })
    } catch (error) {
      console.error(error)
      return NextResponse.json({ error: 'Failed to fetch peak-hours analytics' }, { status: 500 })
    }
  }

  return notFound()
}
