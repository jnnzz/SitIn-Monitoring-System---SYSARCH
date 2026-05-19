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

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value))
}

function normalizeSoftwareName(value) {
  if (typeof value !== 'string') return ''
  return value.trim().replace(/\s+/g, ' ')
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
        `SELECT l.id, l.lab_name, l.total_computers, l.reservation_enabled,
                COALESCE(pc.computers, 0)::int AS computers,
                COALESCE(pc.unavailable, 0)::int AS unavailable,
                COALESCE(sw.softwares, '[]'::json) AS softwares
         FROM labs l
         LEFT JOIN LATERAL (
           SELECT
             COUNT(*)::int AS computers,
             COUNT(*) FILTER (WHERE c.status = 'maintenance' OR c.is_available = FALSE)::int AS unavailable
           FROM lab_computers c
           WHERE c.lab_id = l.id
         ) pc ON TRUE
         LEFT JOIN LATERAL (
           SELECT COALESCE(
             JSON_AGG(
               JSON_BUILD_OBJECT('id', s.id, 'software_name', s.software_name)
               ORDER BY s.software_name
             ),
             '[]'::json
           ) AS softwares
           FROM lab_software s
           WHERE s.lab_id = l.id
         ) sw ON TRUE
         ORDER BY l.lab_name`
      )
      return NextResponse.json(labs.rows)
    } catch (error) {
      console.error(error)
      return NextResponse.json({ error: 'Failed to fetch labs' }, { status: 500 })
    }
  }

  if (parts.length === 3 && parts[0] === 'lab' && parts[2] === 'software') {
    const labId = parseId(parts[1])
    if (!labId) return notFound()

    try {
      const softwareRes = await pool.query(
        `SELECT id, software_name, created_at
         FROM lab_software
         WHERE lab_id = $1
         ORDER BY software_name ASC`,
        [labId]
      )
      return NextResponse.json(softwareRes.rows)
    } catch (error) {
      console.error(error)
      return NextResponse.json({ error: 'Failed to fetch lab software' }, { status: 500 })
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

  if (parts.length === 1 && parts[0] === 'recommend') {
    const date = request.nextUrl.searchParams.get('date')
    const timeSlot = request.nextUrl.searchParams.get('time_slot')
    const limit = parseLimit(request.nextUrl.searchParams.get('limit'), 10, 10)

    if (!date || !timeSlot) {
      return NextResponse.json({ error: 'date and time_slot are required' }, { status: 400 })
    }
    if (!TIME_SLOTS.includes(timeSlot)) {
      return NextResponse.json({ error: 'Invalid time slot' }, { status: 400 })
    }

    try {
      // 1. Get current capacity + live reservations per lab
      const capacityRes = await pool.query(
        `SELECT l.id AS lab_id, l.lab_name, l.total_computers, l.reservation_enabled,
                COALESCE(cap.usable_computers, 0)::int AS usable_computers,
                COALESCE(cur.current_reserved, 0)::int AS current_reserved
         FROM labs l
         LEFT JOIN LATERAL (
           SELECT
             COUNT(*) FILTER (WHERE c.is_available = TRUE AND c.status <> 'maintenance')::int AS usable_computers
           FROM lab_computers c
           WHERE c.lab_id = l.id
         ) cap ON TRUE
         LEFT JOIN LATERAL (
           SELECT COUNT(*)::int AS current_reserved
           FROM reservations r
           WHERE r.lab_id = l.id
             AND r.date = $1
             AND r.time_slot = $2
             AND r.status IN ('pending', 'approved')
         ) cur ON TRUE
         WHERE l.reservation_enabled = TRUE
         ORDER BY l.lab_name ASC`,
        [date, timeSlot]
      )

      // 2. Reservation history for same weekday + time slot (past 90 days)
      const historyRes = await pool.query(
        `SELECT l.id AS lab_id,
                COALESCE(COUNT(r.id), 0)::int AS same_slot_history
         FROM labs l
         LEFT JOIN reservations r
           ON r.lab_id = l.id
          AND r.status IN ('pending', 'approved')
          AND r.date >= ($1::date - INTERVAL '90 days')
          AND r.date < $1::date
          AND r.time_slot = $2
          AND EXTRACT(DOW FROM r.date) = EXTRACT(DOW FROM $1::date)
         GROUP BY l.id`,
        [date, timeSlot]
      )

      // 3. Sit-in session history — measures actual lab popularity from completed sessions
      const sitinRes = await pool.query(
        `SELECT lab_name,
                COUNT(*)::int AS session_count,
                COALESCE(AVG(duration_minutes), 0)::int AS avg_duration
         FROM sit_in_records
         WHERE ended_at >= (CURRENT_DATE - INTERVAL '90 days')
         GROUP BY lab_name`
      )
      const sitinByLabName = new Map(sitinRes.rows.map((row) => [
        row.lab_name,
        { sessions: Number(row.session_count) || 0, avgDuration: Number(row.avg_duration) || 0 }
      ]))
      const maxSitinSessions = sitinRes.rows.reduce(
        (max, row) => Math.max(max, Number(row.session_count) || 0), 1
      )

      // 4. Count active sit-in sessions per lab right now
      const activeSitinRes = await pool.query(
        `SELECT lab_name, COUNT(*)::int AS active_count
         FROM active_sessions
         GROUP BY lab_name`
      )
      const activeSitinByName = new Map(activeSitinRes.rows.map((row) => [
        row.lab_name, Number(row.active_count) || 0
      ]))

      const historyByLab = new Map(historyRes.rows.map((row) => [Number(row.lab_id), Number(row.same_slot_history) || 0]))
      const maxHistory = historyRes.rows.reduce(
        (max, row) => Math.max(max, Number(row.same_slot_history) || 0),
        1
      )

      // Determine time-of-day factor (some slots are naturally busier)
      const slotPopularity = { '08:00-10:00': 0.6, '10:00-12:00': 0.85, '13:00-15:00': 1.0, '15:00-17:00': 0.75 }
      const timeOfDayFactor = slotPopularity[timeSlot] || 0.8

      const hasReservationHistory = maxHistory > 1
      const hasSitinHistory = maxSitinSessions > 1
      const hasAnyHistory = hasReservationHistory || hasSitinHistory

      const recommendations = capacityRes.rows
        .map((row) => {
          const usable = Number(row.usable_computers) || 0
          const currentReserved = Number(row.current_reserved) || 0
          const availableNow = Math.max(0, usable - currentReserved)
          const availabilityRatio = usable > 0 ? availableNow / usable : 0
          const currentPressure = usable > 0 ? currentReserved / usable : 0

          // Reservation history pressure
          const sameSlotHistory = historyByLab.get(Number(row.lab_id)) || 0
          const historicalPressure = maxHistory > 0 ? sameSlotHistory / maxHistory : 0

          // Sit-in popularity pressure (labs with more sit-ins are busier)
          const sitinData = sitinByLabName.get(row.lab_name) || { sessions: 0, avgDuration: 0 }
          const sitinPopularity = sitinData.sessions / maxSitinSessions

          // Active sit-in sessions right now
          const activeSitins = activeSitinByName.get(row.lab_name) || 0
          const activeOccupancy = usable > 0 ? activeSitins / usable : 0

          // Combined score with multiple signals
          // Weight availability highest, then historical, then sit-in patterns
          let score
          if (hasAnyHistory) {
            score = clamp(
              availabilityRatio * 0.45 +
              (1 - currentPressure) * 0.15 +
              (1 - historicalPressure) * 0.15 +
              (1 - sitinPopularity * timeOfDayFactor) * 0.15 +
              (1 - activeOccupancy) * 0.10
            )
          } else {
            // No history at all — use capacity-based heuristics with slight randomization
            const capacityBonus = usable >= 35 ? 0.1 : usable >= 25 ? 0.05 : 0
            score = clamp(
              availabilityRatio * 0.60 +
              (1 - currentPressure) * 0.20 +
              capacityBonus +
              (1 - activeOccupancy) * 0.10
            )
          }

          const crowdedRisk = clamp(
            (historicalPressure * 0.3) +
            (currentPressure * 0.25) +
            (sitinPopularity * timeOfDayFactor * 0.25) +
            (activeOccupancy * 0.20)
          )

          // Confidence: how much data backs this recommendation
          const reservationDataPoints = sameSlotHistory
          const sitinDataPoints = Math.min(sitinData.sessions / 5, 8)
          const confidenceRaw = clamp((reservationDataPoints + sitinDataPoints) / 12)
          const confidence = Number((confidenceRaw * 100).toFixed(1))

          // Capacity utilization (how full the lab currently is)
          const utilizationPct = usable > 0 ? Number((((currentReserved + activeSitins) / usable) * 100).toFixed(0)) : 0

          // Demand level label
          let demandLevel = 'Low'
          if (crowdedRisk >= 0.7) demandLevel = 'Very High'
          else if (crowdedRisk >= 0.5) demandLevel = 'High'
          else if (crowdedRisk >= 0.3) demandLevel = 'Moderate'

          // Smart reason generation
          let reason
          if (availableNow === 0) {
            reason = '⚠️ No available PCs for this time slot.'
          } else if (availabilityRatio >= 0.8 && crowdedRisk <= 0.2) {
            reason = '🟢 Excellent choice — high availability with minimal demand.'
          } else if (availabilityRatio >= 0.6 && crowdedRisk <= 0.35) {
            reason = '🟢 Good availability and low predicted crowding.'
          } else if (crowdedRisk >= 0.7) {
            reason = '🔴 High demand expected — consider alternative labs.'
          } else if (crowdedRisk >= 0.5) {
            reason = '🟡 Moderate demand — book early to secure a spot.'
          } else if (activeSitins > 0 && activeOccupancy > 0.4) {
            reason = `🟡 ${activeSitins} active sit-in session${activeSitins > 1 ? 's' : ''} — partially occupied.`
          } else if (!hasAnyHistory) {
            reason = 'ℹ️ Score based on live capacity — more data improves accuracy.'
          } else {
            reason = '🔵 Balanced recommendation based on availability and trends.'
          }

          return {
            lab_id: row.lab_id,
            lab_name: row.lab_name,
            time_slot: timeSlot,
            recommendation_score: Number((score * 100).toFixed(1)),
            crowded_risk: Number((crowdedRisk * 100).toFixed(1)),
            available_now: availableNow,
            usable_computers: usable,
            active_sitins: activeSitins,
            utilization_pct: Number(utilizationPct),
            same_slot_history: sameSlotHistory,
            sitin_sessions_90d: sitinData.sessions,
            avg_session_duration: sitinData.avgDuration,
            confidence,
            demand_level: demandLevel,
            reason,
          }
        })
        .filter((row) => row.usable_computers > 0)
        .sort((a, b) => {
          if (b.recommendation_score !== a.recommendation_score) {
            return b.recommendation_score - a.recommendation_score
          }
          return b.available_now - a.available_now
        })

      // Mark the best pick
      if (recommendations.length > 0) {
        recommendations[0].is_best_pick = true
      }

      return NextResponse.json({
        date,
        time_slot: timeSlot,
        generated_at: new Date().toISOString(),
        has_history: hasAnyHistory,
        data_sources: [
          hasReservationHistory ? 'reservation_history' : null,
          hasSitinHistory ? 'sitin_history' : null,
          'live_capacity',
          activeSitinRes.rows.length > 0 ? 'active_sessions' : null,
        ].filter(Boolean),
        recommendations: recommendations.slice(0, limit),
      })
    } catch (error) {
      console.error(error)
      return NextResponse.json({ error: 'Failed to generate reservation recommendations' }, { status: 500 })
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

    // Optional date filter — if provided, show reservations for that specific date only
    const dateFilter = request.nextUrl.searchParams.get('date') || null

    try {
      const labRes = await pool.query(
        'SELECT id, lab_name, total_computers, reservation_enabled FROM labs WHERE id = $1',
        [labId]
      )
      if (labRes.rows.length === 0) return NextResponse.json({ error: 'Lab not found' }, { status: 404 })

      let computersRes
      if (dateFilter) {
        // When a specific date is selected: show only reservations for that date
        computersRes = await pool.query(
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
               AND r.date = $2::date
             ORDER BY r.time_slot ASC, r.created_at ASC
             LIMIT 1
           ) rr ON TRUE
           WHERE c.lab_id = $1
           ORDER BY c.computer_number`,
          [labId, dateFilter]
        )
      } else {
        // No date filter: show next upcoming reservation per PC
        computersRes = await pool.query(
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
      }

      const computers = computersRes.rows.map((row) => {
        const isMaintenance = !row.is_available || row.status === 'maintenance'
        const displayStatus = isMaintenance
          ? 'maintenance'
          : row.reservation_id
            ? 'reserved'
            : 'available'

        return { ...row, display_status: displayStatus }
      })

      const softwareRes = await pool.query(
        `SELECT id, software_name, created_at
         FROM lab_software
         WHERE lab_id = $1
         ORDER BY software_name ASC`,
        [labId]
      )

      return NextResponse.json({ lab: labRes.rows[0], computers, softwares: softwareRes.rows })
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

  if (parts.length === 3 && parts[0] === 'lab' && parts[2] === 'software') {
    const adminError = requireAdmin(auth.user)
    if (adminError) return adminError

    const labId = parseId(parts[1])
    if (!labId) return notFound()

    const body = await readJson(request)
    const softwareName = normalizeSoftwareName(body?.software_name)

    if (!softwareName) {
      return NextResponse.json({ error: 'software_name is required' }, { status: 400 })
    }
    if (softwareName.length > 120) {
      return NextResponse.json({ error: 'software_name must be 120 characters or fewer' }, { status: 400 })
    }

    try {
      const labRes = await pool.query('SELECT id FROM labs WHERE id = $1', [labId])
      if (!labRes.rows.length) return NextResponse.json({ error: 'Lab not found' }, { status: 404 })

      const existing = await pool.query(
        'SELECT id FROM lab_software WHERE lab_id = $1 AND LOWER(software_name) = LOWER($2) LIMIT 1',
        [labId, softwareName]
      )
      if (existing.rows.length) {
        return NextResponse.json({ error: 'Software already exists for this lab' }, { status: 409 })
      }

      const inserted = await pool.query(
        `INSERT INTO lab_software (lab_id, software_name, updated_at)
         VALUES ($1, $2, CURRENT_TIMESTAMP)
         RETURNING id, lab_id, software_name, created_at`,
        [labId, softwareName]
      )

      return NextResponse.json(inserted.rows[0], { status: 201 })
    } catch (error) {
      console.error(error)
      return NextResponse.json({ error: 'Failed to add software to lab' }, { status: 500 })
    }
  }

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
    const labRes = await pool.query('SELECT id, reservation_enabled FROM labs WHERE id = $1', [labId])
    if (!labRes.rows.length) {
      return NextResponse.json({ error: 'Lab not found' }, { status: 404 })
    }
    if (!labRes.rows[0].reservation_enabled) {
      return NextResponse.json(
        { error: 'Reservations are currently disabled for this laboratory' },
        { status: 403 }
      )
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

  const adminError = requireAdmin(auth.user)
  if (adminError) return adminError

  if (parts.length === 3 && parts[0] === 'lab' && parts[2] === 'reservation-toggle') {
    const labId = parseId(parts[1])
    if (!labId) return notFound()

    if (typeof body?.enabled !== 'boolean') {
      return NextResponse.json({ error: 'enabled must be a boolean' }, { status: 400 })
    }
    const enabled = body.enabled
    try {
      const result = await pool.query(
        `UPDATE labs
         SET reservation_enabled = $2
         WHERE id = $1
         RETURNING id, lab_name, reservation_enabled`,
        [labId, enabled]
      )
      if (!result.rows.length) {
        return NextResponse.json({ error: 'Lab not found' }, { status: 404 })
      }
      return NextResponse.json(result.rows[0])
    } catch (error) {
      console.error(error)
      return NextResponse.json({ error: 'Failed to update lab reservation setting' }, { status: 500 })
    }
  }

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
         SET is_available = NOT is_available
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
         SET status = $2::varchar(20),
             is_available = CASE
               WHEN $2::varchar(20) = 'maintenance'::varchar(20) THEN FALSE
               WHEN $2::varchar(20) = 'available'::varchar(20) THEN TRUE
               ELSE is_available
             END
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

  if (parts.length === 4 && parts[0] === 'lab' && parts[2] === 'software') {
    const adminError = requireAdmin(auth.user)
    if (adminError) return adminError

    const labId = parseId(parts[1])
    const softwareId = parseId(parts[3])
    if (!labId || !softwareId) return notFound()

    try {
      const result = await pool.query(
        `DELETE FROM lab_software
         WHERE id = $1 AND lab_id = $2
         RETURNING id, software_name`,
        [softwareId, labId]
      )

      if (!result.rows.length) {
        return NextResponse.json({ error: 'Software not found for this lab' }, { status: 404 })
      }

      return NextResponse.json({ message: 'Software removed from lab', software: result.rows[0] })
    } catch (error) {
      console.error(error)
      return NextResponse.json({ error: 'Failed to remove software from lab' }, { status: 500 })
    }
  }

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
