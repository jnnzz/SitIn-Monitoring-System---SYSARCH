const express = require('express');
const router = express.Router();
const pool = require('../db');
const jwt = require('jsonwebtoken');

// Auth middleware
function authenticateToken(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token required' });
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  next();
}

async function safeQuery(text, params, fallbackRows) {
  try {
    return await pool.query(text, params);
  } catch (err) {
    if (err.code === '42P01') {
      return { rows: fallbackRows || [] };
    }
    throw err;
  }
}

function buildDateWhere(column, from, to) {
  const clauses = [];
  const params = [];

  if (from) {
    params.push(from);
    clauses.push(`${column}::date >= $${params.length}`);
  }

  if (to) {
    params.push(to);
    clauses.push(`${column}::date <= $${params.length}`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  return { where, params };
}

function defaultRange(query) {
  const from = query.from || null;
  const to = query.to || null;

  if (!from && !to) {
    const start = new Date();
    start.setDate(start.getDate() - 30);
    return { from: start.toISOString().slice(0, 10), to: null };
  }

  return { from, to };
}

// GET /api/analytics/summary
router.get('/summary', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const usersRes = await pool.query("SELECT COUNT(*)::int AS count FROM users WHERE role != 'admin'");
    const sessionsRes = await safeQuery(
      'SELECT COUNT(*)::int AS count, COALESCE(AVG(duration_minutes), 0)::int AS avg_duration FROM sit_in_records',
      [],
      [{ count: 0, avg_duration: 0 }]
    );
    const activeRes = await safeQuery(
      'SELECT COUNT(*)::int AS count FROM active_sessions',
      [],
      [{ count: 0 }]
    );
    const reservationRes = await safeQuery(
      'SELECT status, COUNT(*)::int AS count FROM reservations GROUP BY status',
      [],
      []
    );

    const reservationByStatus = {};
    let reservationTotal = 0;
    for (const row of reservationRes.rows) {
      reservationByStatus[row.status] = row.count;
      reservationTotal += row.count;
    }

    res.json({
      total_users: usersRes.rows[0]?.count || 0,
      total_sessions: sessionsRes.rows[0]?.count || 0,
      average_duration_minutes: sessionsRes.rows[0]?.avg_duration || 0,
      active_sessions: activeRes.rows[0]?.count || 0,
      reservations: {
        total: reservationTotal,
        by_status: reservationByStatus
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load summary analytics' });
  }
});

// GET /api/analytics/sessions
router.get('/sessions', authenticateToken, requireAdmin, async (req, res) => {
  const range = defaultRange(req.query);
  const { where, params } = buildDateWhere('ended_at', range.from, range.to);

  try {
    const result = await safeQuery(
      `SELECT DATE(ended_at) AS date,
              COUNT(*)::int AS count,
              COALESCE(AVG(duration_minutes), 0)::int AS avg_duration
       FROM sit_in_records
       ${where}
       GROUP BY DATE(ended_at)
       ORDER BY DATE(ended_at)`,
      params,
      []
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch session analytics' });
  }
});

// GET /api/analytics/labs
router.get('/labs', authenticateToken, requireAdmin, async (req, res) => {
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
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch lab analytics' });
  }
});

// GET /api/analytics/reservations
router.get('/reservations', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await safeQuery(
      'SELECT status, COUNT(*)::int AS count FROM reservations GROUP BY status',
      [],
      []
    );

    let total = 0;
    const byStatus = {};
    for (const row of result.rows) {
      byStatus[row.status] = row.count;
      total += row.count;
    }

    res.json({ total, by_status: byStatus, rows: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch reservation analytics' });
  }
});

// GET /api/analytics/peak-hours
router.get('/peak-hours', authenticateToken, requireAdmin, async (req, res) => {
  const range = defaultRange(req.query);
  const hourRange = buildDateWhere('started_at', range.from, range.to);
  const dayRange = buildDateWhere('started_at', range.from, range.to);

  try {
    const hoursRes = await safeQuery(
      `SELECT EXTRACT(HOUR FROM started_at)::int AS hour,
              COUNT(*)::int AS count
       FROM sit_in_records
       ${hourRange.where}
       GROUP BY hour
       ORDER BY hour`,
      hourRange.params,
      []
    );

    const daysRes = await safeQuery(
      `SELECT EXTRACT(DOW FROM started_at)::int AS day,
              COUNT(*)::int AS count
       FROM sit_in_records
       ${dayRange.where}
       GROUP BY day
       ORDER BY day`,
      dayRange.params,
      []
    );

    res.json({ hours: hoursRes.rows, days: daysRes.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch peak-hours analytics' });
  }
});

module.exports = router;
