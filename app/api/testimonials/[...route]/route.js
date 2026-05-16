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

function parseId(value) {
  const id = Number.parseInt(value, 10)
  return Number.isInteger(id) ? id : null
}

function parseLimit(value, fallback, max = 200) {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback
  return Math.min(parsed, max)
}

function validateRating(rating) {
  return Number.isInteger(rating) && rating >= 1 && rating <= 5
}

export async function GET(request, { params }) {
  await ensureMigrations()

  const parts = await routeParts(params)
  const auth = authenticateRequest(request)
  if (auth.response) return auth.response

  if (parts.length === 1 && parts[0] === 'my') {
    try {
      const result = await pool.query(
        `SELECT t.id, t.content, t.rating, t.status, t.reviewed_by, t.created_at, t.updated_at
         FROM testimonials t
         WHERE t.user_id = $1
         ORDER BY t.created_at DESC`,
        [auth.user.userId]
      )
      return NextResponse.json(result.rows)
    } catch (error) {
      console.error(error)
      return NextResponse.json({ error: 'Failed to fetch testimonials' }, { status: 500 })
    }
  }

  const adminError = requireAdmin(auth.user)
  if (adminError) return adminError

  if (parts.length === 1 && parts[0] === 'all') {
    const query = request.nextUrl.searchParams
    const clauses = []
    const params = []

    if (query.get('status')) {
      params.push(query.get('status'))
      clauses.push(`t.status = $${params.length}`)
    }
    if (query.get('from')) {
      params.push(query.get('from'))
      clauses.push(`t.created_at::date >= $${params.length}`)
    }
    if (query.get('to')) {
      params.push(query.get('to'))
      clauses.push(`t.created_at::date <= $${params.length}`)
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
    const limit = parseLimit(query.get('limit'), 200)
    params.push(limit)

    try {
      const result = await pool.query(
        `SELECT t.id, t.user_id, u.student_id, u.full_name, t.content, t.rating, t.status, t.reviewed_by, t.created_at, t.updated_at
         FROM testimonials t
         LEFT JOIN users u ON u.id = t.user_id
         ${where}
         ORDER BY t.created_at DESC
         LIMIT $${params.length}`,
        params
      )
      return NextResponse.json(result.rows)
    } catch (error) {
      console.error(error)
      return NextResponse.json({ error: 'Failed to fetch testimonials' }, { status: 500 })
    }
  }

  return notFound()
}

export async function POST(request, { params }) {
  await ensureMigrations()

  const parts = await routeParts(params)
  const auth = authenticateRequest(request)
  if (auth.response) return auth.response

  if (parts.length > 0) return notFound()

  const body = await readJson(request)
  const content = String(body?.content || '').trim()
  const rating = Number.parseInt(body?.rating, 10)

  if (!content) return NextResponse.json({ error: 'content is required' }, { status: 400 })
  if (!validateRating(rating)) return NextResponse.json({ error: 'rating must be from 1 to 5' }, { status: 400 })

  try {
    const result = await pool.query(
      `INSERT INTO testimonials (user_id, content, rating, status)
       VALUES ($1, $2, $3, 'pending')
       RETURNING *`,
      [auth.user.userId, content, rating]
    )
    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to submit testimonial' }, { status: 500 })
  }
}

export async function PUT(request, { params }) {
  await ensureMigrations()

  const parts = await routeParts(params)
  const auth = authenticateRequest(request)
  if (auth.response) return auth.response
  const body = await readJson(request)

  if (parts.length === 1) {
    const testimonialId = parseId(parts[0])
    if (!testimonialId) return notFound()

    const content = String(body?.content || '').trim()
    const rating = Number.parseInt(body?.rating, 10)
    if (!content) return NextResponse.json({ error: 'content is required' }, { status: 400 })
    if (!validateRating(rating)) return NextResponse.json({ error: 'rating must be from 1 to 5' }, { status: 400 })

    try {
      const result = await pool.query(
        `UPDATE testimonials
         SET content = $1, rating = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $3 AND user_id = $4 AND status = 'pending'
         RETURNING *`,
        [content, rating, testimonialId, auth.user.userId]
      )
      if (!result.rows.length) {
        return NextResponse.json({ error: 'Pending testimonial not found' }, { status: 404 })
      }
      return NextResponse.json(result.rows[0])
    } catch (error) {
      console.error(error)
      return NextResponse.json({ error: 'Failed to update testimonial' }, { status: 500 })
    }
  }

  const adminError = requireAdmin(auth.user)
  if (adminError) return adminError

  if (parts.length === 2 && parts[1] === 'approve') {
    const testimonialId = parseId(parts[0])
    if (!testimonialId) return notFound()
    try {
      const result = await pool.query(
        `UPDATE testimonials
         SET status = 'approved', reviewed_by = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING *`,
        [auth.user.userId, testimonialId]
      )
      if (!result.rows.length) return NextResponse.json({ error: 'Testimonial not found' }, { status: 404 })
      return NextResponse.json(result.rows[0])
    } catch (error) {
      console.error(error)
      return NextResponse.json({ error: 'Failed to approve testimonial' }, { status: 500 })
    }
  }

  if (parts.length === 2 && parts[1] === 'reject') {
    const testimonialId = parseId(parts[0])
    if (!testimonialId) return notFound()
    try {
      const result = await pool.query(
        `UPDATE testimonials
         SET status = 'rejected', reviewed_by = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING *`,
        [auth.user.userId, testimonialId]
      )
      if (!result.rows.length) return NextResponse.json({ error: 'Testimonial not found' }, { status: 404 })
      return NextResponse.json(result.rows[0])
    } catch (error) {
      console.error(error)
      return NextResponse.json({ error: 'Failed to reject testimonial' }, { status: 500 })
    }
  }

  return notFound()
}

export async function DELETE(request, { params }) {
  await ensureMigrations()

  const parts = await routeParts(params)
  const auth = authenticateRequest(request)
  if (auth.response) return auth.response

  if (parts.length !== 1) return notFound()
  const testimonialId = parseId(parts[0])
  if (!testimonialId) return notFound()

  try {
    if (auth.user.role === 'admin') {
      await pool.query('DELETE FROM testimonials WHERE id = $1', [testimonialId])
      return NextResponse.json({ message: 'Deleted' })
    }

    const result = await pool.query(
      `DELETE FROM testimonials
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [testimonialId, auth.user.userId]
    )
    if (!result.rows.length) return NextResponse.json({ error: 'Testimonial not found' }, { status: 404 })
    return NextResponse.json({ message: 'Deleted' })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to delete testimonial' }, { status: 500 })
  }
}
