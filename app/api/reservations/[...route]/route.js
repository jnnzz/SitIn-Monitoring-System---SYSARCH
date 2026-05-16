import { NextResponse } from 'next/server'
import { authenticateRequest, requireAdmin } from '@/lib/server/auth'
import { pool } from '@/lib/server/db'
import { ensureMigrations } from '@/lib/server/migrations'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TIME_SLOTS = ['08:00-10:00', '10:00-12:00', '13:00-15:00', '15:00-17:00']
const COMPUTER_STATUSES = ['available', 'reserved', 'in-use', 'maintenance']

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

function parseLimit(value, fallback, max = 300) {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback
  return Math.min(parsed, max)
}

async function addReservationLog(reservationId, action, performedBy, details = null) {
  await pool.query(
    `INSERT INTO reservation_logs (reservation_id, action, performed_by, details)
     VALUES ($1, $2, $3, $4)`,
    [reservationId, action, performedBy, details]
  )
}

async function notifyUser(userId, title, message, type = 'reservation') {
  await pool.query(
    `INSERT INTO notifications (user_id, title, message, type)
     VALUES ($1, $2, $3, $4)`,
    [userId, title, message, type]
  ).catch(() => {})
}

export async function GET(request, { params }) {
  await ensureMigrations()

  const parts = await routeParts(params)
  const auth = authenticateRequest(request)
  if (auth.response) return auth.response

  if (parts.length === 1 && parts[0] === 'labs') {
    try {
      const labs = await pool.query(
        `SELECT l.id, l.lab_name, l.total_computers,
                COUNT(c.id)::int AS computers,
                COUNT(CASE WHEN c.status = 'maintenance' OR c.is_available = FALSE THEN 1 END)::int AS unavailable
         FROM labs l
         LEFT JOIN lab_computers c ON c.lab_id = l.id
         GROUP BY l.id, l.lab_name, l.total_computers
         ORDER BY l.lab_name`
      )
      return NextResponse.json(labs.rows)
    } catch (error) {
      console.error(error)
      return NextResponse.json({ error: 'Failed to fetch labs' }, { status: 500 })
    }
  }

  if (parts.length === 3 && parts[0] === 'lab' && parts[2] === 'computers') {
    const labId = parseId(parts[1])
    if (!labId) return notFound()

    const date = request.nextUrl.searchParams.get('date')
    const timeSlot = request.nextUrl.searchParams.get('time_slot')
    if (!date || !timeSlot) {
      return NextResponse.json({ error: 'date and time_slot are required' }, { status: 400 })
    }
    if (!TIME_SLOTS.includes(timeSlot)) {
      return NextResponse.json({ error: 'Invalid time slot' }, { status: 400 })
    }

    try {
      const result = await pool.query(
        `SELECT c.id, c.computer_number, c.is_available, c.status,
                r.id AS reservation_id, r.user_id AS reserved_by, r.status AS reservation_status
         FROM lab_computers c
         LEFT JOIN reservations r
           ON r.computer_id = c.id
          AND r.date = $2
          AND r.time_slot = $3
          AND r.status IN ('pending', 'approved')
         WHERE c.lab_id = $1
         ORDER BY c.computer_number`,
        [labId, date, timeSlot]
      )

      const rows = result.rows.map((row) => {
        let displayStatus = row.status
        if (row.reservation_id) {
          displayStatus = row.reserved_by === auth.user.userId ? 'mine' : 'reserved'
          if (row.reservation_status === 'approved' && row.reserved_by === auth.user.userId) {
            displayStatus = 'approved'
          }
        } else if (!row.is_available || row.status === 'maintenance') {
          displayStatus = 'maintenance'
        } else {
          displayStatus = 'available'
        }
        return { ...row, display_status: displayStatus }
      })

      return NextResponse.json(rows)
    } catch (error) {
      console.error(error)
      return NextResponse.json({ error: 'Failed to fetch lab computers' }, { status: 500 })
    }
  }

  if (parts.length === 1 && parts[0] === 'my') {
    try {
      const result = await pool.query(
        `SELECT r.id, r.lab_id, l.lab_name, r.computer_id, c.computer_number, r.date, r.time_slot,
                r.purpose, r.status, r.admin_notes, r.reviewed_by, r.reviewed_at, r.created_at
         FROM reservations r
         LEFT JOIN labs l ON l.id = r.lab_id
         LEFT JOIN lab_computers c ON c.id = r.computer_id
         WHERE r.user_id = $1
         ORDER BY r.created_at DESC`,
        [auth.user.userId]
      )
      return NextResponse.json(result.rows)
    } catch (error) {
      console.error(error)
      return NextResponse.json({ error: 'Failed to fetch reservations' }, { status: 500 })
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
      clauses.push(`r.status = $${params.length}`)
    }
    if (query.get('date')) {
      params.push(query.get('date'))
      clauses.push(`r.date = $${params.length}`)
    }
    if (query.get('lab_id')) {
      const labId = parseId(query.get('lab_id'))
      if (!labId) return NextResponse.json({ error: 'Invalid lab_id' }, { status: 400 })
      params.push(labId)
      clauses.push(`r.lab_id = $${params.length}`)
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
    const limit = parseLimit(query.get('limit'), 200)
    params.push(limit)

    try {
      const result = await pool.query(
        `SELECT r.id, r.user_id, u.student_id, u.full_name, r.lab_id, l.lab_name, c.computer_number,
                r.date, r.time_slot, r.purpose, r.status, r.admin_notes, r.reviewed_by, r.reviewed_at, r.created_at
         FROM reservations r
         LEFT JOIN users u ON u.id = r.user_id
         LEFT JOIN labs l ON l.id = r.lab_id
         LEFT JOIN lab_computers c ON c.id = r.computer_id
         ${where}
         ORDER BY r.created_at DESC
         LIMIT $${params.length}`,
        params
      )
      return NextResponse.json(result.rows)
    } catch (error) {
      console.error(error)
      return NextResponse.json({ error: 'Failed to fetch all reservations' }, { status: 500 })
    }
  }

  if (parts.length === 1 && parts[0] === 'logs') {
    const limit = parseLimit(request.nextUrl.searchParams.get('limit'), 200)
    try {
      const result = await pool.query(
        `SELECT rl.id, rl.reservation_id, rl.action, rl.performed_by, rl.details, rl.created_at,
                u.full_name AS performed_by_name,
                r.user_id, su.full_name AS student_name, su.student_id,
                l.lab_name, c.computer_number, r.date, r.time_slot
         FROM reservation_logs rl
         LEFT JOIN users u ON u.id = rl.performed_by
         LEFT JOIN reservations r ON r.id = rl.reservation_id
         LEFT JOIN users su ON su.id = r.user_id
         LEFT JOIN labs l ON l.id = r.lab_id
         LEFT JOIN lab_computers c ON c.id = r.computer_id
         ORDER BY rl.created_at DESC
         LIMIT $1`,
        [limit]
      )
      return NextResponse.json(result.rows)
    } catch (error) {
      console.error(error)
      return NextResponse.json({ error: 'Failed to fetch reservation logs' }, { status: 500 })
    }
  }

  if (parts.length === 3 && parts[0] === 'lab' && parts[2] === 'manage') {
    const labId = parseId(parts[1])
    if (!labId) return notFound()

    try {
      const labRes = await pool.query('SELECT id, lab_name, total_computers FROM labs WHERE id = $1', [labId])
      if (labRes.rows.length === 0) return NextResponse.json({ error: 'Lab not found' }, { status: 404 })

      const computersRes = await pool.query(
        `SELECT c.id, c.computer_number, c.is_available, c.status, c.updated_at,
                rr.reservation_id, rr.user_id AS reserved_by, rr.reservation_status,
                rr.full_name AS reserved_by_name, rr.date AS reservation_date, rr.time_slot AS reservation_time_slot
         FROM lab_computers c
         LEFT JOIN LATERAL (
           SELECT r.id AS reservation_id, r.user_id, r.status AS reservation_status, r.date, r.time_slot, u.full_name
           FROM reservations r
           JOIN users u ON u.id = r.user_id
           WHERE r.computer_id = c.id
             AND r.status IN ('pending', 'approved')
             AND r.date >= CURRENT_DATE
           ORDER BY r.date ASC, r.time_slot ASC, r.created_at ASC
           LIMIT 1
         ) rr ON TRUE
         WHERE c.lab_id = $1
         ORDER BY c.computer_number`,
        [labId]
      )

      const computers = computersRes.rows.map((row) => {
        const isMaintenance = !row.is_available || row.status === 'maintenance'
        const displayStatus = isMaintenance
          ? 'maintenance'
          : row.reservation_id
            ? 'reserved'
            : 'available'

        return { ...row, display_status: displayStatus }
      })

      return NextResponse.json({ lab: labRes.rows[0], computers })
    } catch (error) {
      console.error(error)
      return NextResponse.json({ error: 'Failed to fetch lab manage view' }, { status: 500 })
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
  const labId = parseId(body?.lab_id)
  const computerId = parseId(body?.computer_id)
  const date = body?.date
  const timeSlot = body?.time_slot
  const purpose = body?.purpose || null

  if (!labId || !computerId || !date || !timeSlot) {
    return NextResponse.json({ error: 'lab_id, computer_id, date and time_slot are required' }, { status: 400 })
  }
  if (!TIME_SLOTS.includes(timeSlot)) {
    return NextResponse.json({ error: 'Invalid time slot' }, { status: 400 })
  }

  try {
    const userRes = await pool.query('SELECT reservation_enabled FROM users WHERE id = $1', [auth.user.userId])
    if (!userRes.rows.length) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    
    // Auto-enable reservations on first use (better UX - no manual enable required)
    if (!userRes.rows[0].reservation_enabled) {
      await pool.query('UPDATE users SET reservation_enabled = TRUE WHERE id = $1', [auth.user.userId])
    }

    const computerRes = await pool.query(
      'SELECT id, lab_id, is_available, status FROM lab_computers WHERE id = $1 AND lab_id = $2',
      [computerId, labId]
    )
    if (!computerRes.rows.length) return NextResponse.json({ error: 'Computer not found in this lab' }, { status: 404 })
    if (!computerRes.rows[0].is_available || computerRes.rows[0].status === 'maintenance') {
      return NextResponse.json({ error: 'Computer is currently unavailable' }, { status: 400 })
    }

    const sameSlotRes = await pool.query(
      `SELECT id FROM reservations
       WHERE user_id = $1 AND date = $2 AND time_slot = $3 AND status IN ('pending', 'approved')`,
      [auth.user.userId, date, timeSlot]
    )
    if (sameSlotRes.rows.length > 0) {
      return NextResponse.json({ error: 'You already have an active reservation for this slot' }, { status: 400 })
    }

    await pool.query('BEGIN')
    const created = await pool.query(
      `INSERT INTO reservations (user_id, lab_id, computer_id, date, time_slot, purpose, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending')
       RETURNING *`,
      [auth.user.userId, labId, computerId, date, timeSlot, purpose]
    )
    await addReservationLog(created.rows[0].id, 'created', auth.user.userId, 'Student created reservation')
    await pool.query('COMMIT')
    return NextResponse.json(created.rows[0], { status: 201 })
  } catch (error) {
    try {
      await pool.query('ROLLBACK')
    } catch (_) {
      // Ignore rollback errors
    }
    if (error?.code === '23505') {
      return NextResponse.json({ error: 'This computer is already booked for the selected slot' }, { status: 409 })
    }
    console.error('Reservation creation error:', error)
    return NextResponse.json({ error: 'Failed to create reservation' }, { status: 500 })
  }
}

export async function PUT(request, { params }) {
  await ensureMigrations()

  const parts = await routeParts(params)
  const auth = authenticateRequest(request)
  if (auth.response) return auth.response
  const body = await readJson(request)

  if (parts.length === 1 && parts[0] === 'toggle') {
    const enabled = Boolean(body?.enabled)
    try {
      const result = await pool.query(
        'UPDATE users SET reservation_enabled = $1 WHERE id = $2 RETURNING reservation_enabled',
        [enabled, auth.user.userId]
      )
      return NextResponse.json({ reservation_enabled: result.rows[0]?.reservation_enabled || false })
    } catch (error) {
      console.error(error)
      return NextResponse.json({ error: 'Failed to update reservation toggle' }, { status: 500 })
    }
  }

  const adminError = requireAdmin(auth.user)
  if (adminError) return adminError

  if (parts.length === 2 && parts[1] === 'approve') {
    const reservationId = parseId(parts[0])
    if (!reservationId) return notFound()

    try {
      const result = await pool.query(
        `UPDATE reservations
         SET status = 'approved', reviewed_by = $1, reviewed_at = CURRENT_TIMESTAMP, admin_notes = COALESCE($3, admin_notes)
         WHERE id = $2 AND status = 'pending'
         RETURNING *`,
        [auth.user.userId, reservationId, body?.admin_notes || null]
      )
      if (!result.rows.length) {
        return NextResponse.json({ error: 'Pending reservation not found' }, { status: 404 })
      }
      await addReservationLog(reservationId, 'approved', auth.user.userId, body?.admin_notes || null)
      await notifyUser(result.rows[0].user_id, 'Reservation approved', 'Your reservation request has been approved.')
      return NextResponse.json(result.rows[0])
    } catch (error) {
      console.error(error)
      return NextResponse.json({ error: 'Failed to approve reservation' }, { status: 500 })
    }
  }

  if (parts.length === 2 && parts[1] === 'decline') {
    const reservationId = parseId(parts[0])
    if (!reservationId) return notFound()

    try {
      const result = await pool.query(
        `UPDATE reservations
         SET status = 'declined', reviewed_by = $1, reviewed_at = CURRENT_TIMESTAMP, admin_notes = $3
         WHERE id = $2 AND status = 'pending'
         RETURNING *`,
        [auth.user.userId, reservationId, body?.admin_notes || null]
      )
      if (!result.rows.length) {
        return NextResponse.json({ error: 'Pending reservation not found' }, { status: 404 })
      }
      await addReservationLog(reservationId, 'declined', auth.user.userId, body?.admin_notes || null)
      await notifyUser(result.rows[0].user_id, 'Reservation declined', body?.admin_notes || 'Your reservation request was declined.')
      return NextResponse.json(result.rows[0])
    } catch (error) {
      console.error(error)
      return NextResponse.json({ error: 'Failed to decline reservation' }, { status: 500 })
    }
  }

  if (parts.length === 3 && parts[0] === 'computer' && parts[2] === 'toggle') {
    const computerId = parseId(parts[1])
    if (!computerId) return notFound()
    try {
      const result = await pool.query(
        `UPDATE lab_computers
         SET is_available = NOT is_available, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING *`,
        [computerId]
      )
      if (!result.rows.length) return NextResponse.json({ error: 'Computer not found' }, { status: 404 })
      return NextResponse.json(result.rows[0])
    } catch (error) {
      console.error(error)
      return NextResponse.json({ error: 'Failed to toggle computer availability' }, { status: 500 })
    }
  }

  if (parts.length === 3 && parts[0] === 'computer' && parts[2] === 'status') {
    const computerId = parseId(parts[1])
    if (!computerId) return notFound()
    const status = body?.status
    if (!COMPUTER_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    try {
      if (status === 'maintenance') {
        const activeReservation = await pool.query(
          `SELECT id
           FROM reservations
           WHERE computer_id = $1
             AND status IN ('pending', 'approved')
             AND date >= CURRENT_DATE
           LIMIT 1`,
          [computerId]
        )
        if (activeReservation.rows.length > 0) {
          return NextResponse.json(
            { error: 'Cannot set maintenance while this PC has an active reservation' },
            { status: 409 }
          )
        }
      }

      const result = await pool.query(
        `UPDATE lab_computers
         SET status = $2,
             is_available = CASE
               WHEN $2 = 'maintenance' THEN FALSE
               WHEN $2 = 'available' THEN TRUE
               ELSE is_available
             END,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING *`,
        [computerId, status]
      )
      if (!result.rows.length) return NextResponse.json({ error: 'Computer not found' }, { status: 404 })
      return NextResponse.json(result.rows[0])
    } catch (error) {
      console.error(error)
      return NextResponse.json({ error: 'Failed to update computer status' }, { status: 500 })
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
  const reservationId = parseId(parts[0])
  if (!reservationId) return notFound()

  try {
    const result = await pool.query(
      `UPDATE reservations
       SET status = 'cancelled', reviewed_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2 AND status IN ('pending', 'approved')
       RETURNING *`,
      [reservationId, auth.user.userId]
    )
    if (!result.rows.length) {
      return NextResponse.json({ error: 'Reservation not found or cannot be cancelled' }, { status: 404 })
    }
    await addReservationLog(reservationId, 'cancelled', auth.user.userId, 'Student cancelled reservation')
    return NextResponse.json({ message: 'Reservation cancelled' })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to cancel reservation' }, { status: 500 })
  }
}
