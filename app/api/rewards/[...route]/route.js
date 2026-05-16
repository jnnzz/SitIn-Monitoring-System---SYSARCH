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

function parseLimit(value, fallback, max = 200) {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback
  return Math.min(parsed, max)
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

  if (parts.length === 1 && parts[0] === 'me') {
    try {
      const pointsRes = await pool.query(
        'SELECT COALESCE(reward_points, 0) AS reward_points FROM users WHERE id = $1',
        [auth.user.userId]
      )

      if (pointsRes.rows.length === 0) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }

      const txRes = await pool.query(
        `SELECT id, delta, reason, source, created_by, created_at
         FROM reward_transactions
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 30`,
        [auth.user.userId]
      )

      return NextResponse.json({
        points: pointsRes.rows[0].reward_points,
        transactions: txRes.rows,
      })
    } catch (error) {
      console.error(error)
      return NextResponse.json({ error: 'Failed to fetch rewards' }, { status: 500 })
    }
  }

  if (parts.length === 1 && parts[0] === 'leaderboard') {
    const limit = parseLimit(request.nextUrl.searchParams.get('limit'), 10, 50)
    try {
      const result = await pool.query(
        `SELECT id, student_id, full_name, COALESCE(reward_points, 0) AS reward_points
         FROM users
         WHERE role != 'admin'
         ORDER BY reward_points DESC, full_name ASC
         LIMIT $1`,
        [limit]
      )
      return NextResponse.json(result.rows)
    } catch (error) {
      console.error(error)
      return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 })
    }
  }

  if (parts.length === 1 && parts[0] === 'history') {
    const adminError = requireAdmin(auth.user)
    if (adminError) return adminError

    const clauses = []
    const paramsList = []
    const query = request.nextUrl.searchParams

    if (query.get('user_id')) {
      const userId = Number.parseInt(query.get('user_id'), 10)
      if (!Number.isInteger(userId)) {
        return NextResponse.json({ error: 'user_id must be a number' }, { status: 400 })
      }
      paramsList.push(userId)
      clauses.push(`rt.user_id = $${paramsList.length}`)
    }

    if (query.get('from')) {
      paramsList.push(query.get('from'))
      clauses.push(`rt.created_at::date >= $${paramsList.length}`)
    }

    if (query.get('to')) {
      paramsList.push(query.get('to'))
      clauses.push(`rt.created_at::date <= $${paramsList.length}`)
    }

    const limit = parseLimit(query.get('limit'), 100)
    paramsList.push(limit)

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''

    try {
      const result = await pool.query(
        `SELECT rt.id, rt.user_id, u.student_id, u.full_name, rt.delta, rt.reason, rt.source, rt.created_by, rt.created_at
         FROM reward_transactions rt
         LEFT JOIN users u ON u.id = rt.user_id
         ${where}
         ORDER BY rt.created_at DESC
         LIMIT $${paramsList.length}`,
        paramsList
      )
      return NextResponse.json(result.rows)
    } catch (error) {
      console.error(error)
      return NextResponse.json({ error: 'Failed to fetch reward history' }, { status: 500 })
    }
  }

  return notFound()
}

export async function POST(request, { params }) {
  await ensureMigrations()

  const parts = await routeParts(params)
  const auth = authenticateRequest(request)
  if (auth.response) return auth.response

  if (parts.length === 1 && parts[0] === 'adjust') {
    const adminError = requireAdmin(auth.user)
    if (adminError) return adminError

    const body = await readJson(request)
    const userId = Number.parseInt(body?.user_id, 10)
    const delta = Number.parseInt(body?.delta, 10)
    const reason = body?.reason || null

    if (!Number.isInteger(userId)) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
    }

    if (!Number.isInteger(delta) || delta === 0) {
      return NextResponse.json({ error: 'delta must be a non-zero integer' }, { status: 400 })
    }

    try {
      await pool.query('BEGIN')

      const updateRes = await pool.query(
        `UPDATE users
         SET reward_points = GREATEST(COALESCE(reward_points, 0) + $1, 0)
         WHERE id = $2
         RETURNING id, reward_points`,
        [delta, userId]
      )

      if (updateRes.rows.length === 0) {
        await pool.query('ROLLBACK')
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }

      await pool.query(
        `INSERT INTO reward_transactions (user_id, delta, reason, source, created_by)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, delta, reason, 'admin', auth.user.userId]
      )

      await pool.query('COMMIT')

      return NextResponse.json({
        message: 'Points updated',
        user_id: userId,
        reward_points: updateRes.rows[0].reward_points,
      })
    } catch (error) {
      await pool.query('ROLLBACK')
      console.error(error)
      return NextResponse.json({ error: 'Failed to adjust points' }, { status: 500 })
    }
  }

  return notFound()
}
