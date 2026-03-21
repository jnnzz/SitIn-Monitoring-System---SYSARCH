const express = require('express');
const router = express.Router();
const pool = require('../db');
const jwt = require('jsonwebtoken');

// ── Auth Middleware ──────────────────────────────────────────────────────────
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

// ── Run DB migrations on startup ─────────────────────────────────────────────
async function migrate() {
  await pool.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS remaining_sessions INT DEFAULT 30
  `).catch(() => {});

  await pool.query(`
    CREATE TABLE IF NOT EXISTS active_sessions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      lab_name VARCHAR(100) DEFAULT 'Computer Lab',
      purpose VARCHAR(255),
      started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `).catch(() => {});

  await pool.query(`
    CREATE TABLE IF NOT EXISTS sit_in_records (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      student_id VARCHAR(50),
      full_name VARCHAR(255),
      lab_name VARCHAR(100),
      purpose VARCHAR(255),
      started_at TIMESTAMP,
      ended_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      duration_minutes INTEGER
    )
  `).catch(() => {});
}
migrate();

// ── SEARCH STUDENT ────────────────────────────────────────────────────────────
router.get('/students/search', authenticateToken, requireAdmin, async (req, res) => {
  const { q } = req.query;
  if (!q || q.trim().length < 1) return res.json([]);
  try {
    const result = await pool.query(
      `SELECT id, student_id, full_name, email, course, year_level, remaining_sessions
       FROM users
       WHERE role != 'admin' AND (
         LOWER(full_name) LIKE LOWER($1) OR
         LOWER(student_id) LIKE LOWER($1)
       )
       LIMIT 10`,
      [`%${q.trim()}%`]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Search failed' });
  }
});

// ── START SESSION ─────────────────────────────────────────────────────────────
router.post('/sessions/start', authenticateToken, requireAdmin, async (req, res) => {
  const { user_id, lab_name, purpose } = req.body;
  if (!user_id) return res.status(400).json({ error: 'user_id required' });

  try {
    // Check student has sessions left
    const studentRes = await pool.query(
      'SELECT id, full_name, remaining_sessions FROM users WHERE id = $1 AND role != $2',
      [user_id, 'admin']
    );
    if (studentRes.rows.length === 0) return res.status(404).json({ error: 'Student not found' });
    const student = studentRes.rows[0];
    if (student.remaining_sessions <= 0) {
      return res.status(400).json({ error: 'Student has no remaining sessions' });
    }

    // Check not already in active session
    const existing = await pool.query(
      'SELECT id FROM active_sessions WHERE user_id = $1', [user_id]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Student already has an active session' });
    }

    const session = await pool.query(
      'INSERT INTO active_sessions (user_id, lab_name, purpose) VALUES ($1, $2, $3) RETURNING *',
      [user_id, lab_name || 'Computer Lab', purpose || 'General Use']
    );
    res.status(201).json(session.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to start session' });
  }
});

// ── GET ACTIVE SESSIONS ───────────────────────────────────────────────────────
router.get('/sessions/active', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        a.id, a.lab_name, a.purpose, a.started_at,
        u.student_id, u.full_name, u.course, u.year_level, u.remaining_sessions
      FROM active_sessions a
      JOIN users u ON u.id = a.user_id
      ORDER BY a.started_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch active sessions' });
  }
});

// ── END SESSION ───────────────────────────────────────────────────────────────
router.post('/sessions/end/:id', authenticateToken, requireAdmin, async (req, res) => {
  const sessionId = parseInt(req.params.id);
  try {
    // Get session info
    const sessionRes = await pool.query(
      `SELECT a.*, u.student_id, u.full_name, u.remaining_sessions
       FROM active_sessions a JOIN users u ON u.id = a.user_id
       WHERE a.id = $1`,
      [sessionId]
    );
    if (sessionRes.rows.length === 0) return res.status(404).json({ error: 'Session not found' });
    const session = sessionRes.rows[0];

    const durationMinutes = Math.floor(
      (Date.now() - new Date(session.started_at).getTime()) / 60000
    );

    // Write to permanent records
    await pool.query(
      `INSERT INTO sit_in_records
        (user_id, student_id, full_name, lab_name, purpose, started_at, ended_at, duration_minutes)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7)`,
      [
        session.user_id, session.student_id, session.full_name,
        session.lab_name, session.purpose, session.started_at, durationMinutes
      ]
    );

    // Deduct 1 session
    await pool.query(
      'UPDATE users SET remaining_sessions = GREATEST(remaining_sessions - 1, 0) WHERE id = $1',
      [session.user_id]
    );

    // Remove from active sessions
    await pool.query('DELETE FROM active_sessions WHERE id = $1', [sessionId]);

    res.json({ message: 'Session ended', duration_minutes: durationMinutes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to end session' });
  }
});

// ── GET SIT-IN RECORDS ────────────────────────────────────────────────────────
router.get('/sessions/records', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM sit_in_records ORDER BY ended_at DESC LIMIT 200
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch records' });
  }
});

module.exports = router;
