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

// Migrations
async function migrate() {
  await pool.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS reward_points INTEGER DEFAULT 0
  `).catch(() => {});

  await pool.query(`
    CREATE TABLE IF NOT EXISTS reward_transactions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      delta INTEGER NOT NULL,
      reason VARCHAR(255),
      source VARCHAR(50) DEFAULT 'admin',
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `).catch(() => {});
}

migrate();

// GET /api/rewards/me
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const pointsRes = await pool.query(
      'SELECT COALESCE(reward_points, 0) AS reward_points FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (pointsRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const txRes = await pool.query(
      `SELECT id, delta, reason, source, created_by, created_at
       FROM reward_transactions
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 20`,
      [req.user.userId]
    );

    res.json({
      points: pointsRes.rows[0].reward_points,
      transactions: txRes.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch rewards' });
  }
});

// GET /api/rewards/leaderboard
router.get('/leaderboard', authenticateToken, async (req, res) => {
  const limitParam = Number.parseInt(req.query.limit, 10);
  const limit = Number.isInteger(limitParam) && limitParam > 0 ? Math.min(limitParam, 50) : 10;

  try {
    const result = await pool.query(
      `SELECT id, student_id, full_name, COALESCE(reward_points, 0) AS reward_points
       FROM users
       WHERE role != 'admin'
       ORDER BY reward_points DESC, full_name ASC
       LIMIT $1`,
      [limit]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// POST /api/rewards/adjust
router.post('/adjust', authenticateToken, requireAdmin, async (req, res) => {
  const userId = Number.parseInt(req.body?.user_id, 10);
  const delta = Number.parseInt(req.body?.delta, 10);
  const reason = req.body?.reason || null;

  if (!Number.isInteger(userId)) {
    return res.status(400).json({ error: 'user_id is required' });
  }

  if (!Number.isInteger(delta) || delta === 0) {
    return res.status(400).json({ error: 'delta must be a non-zero integer' });
  }

  try {
    await pool.query('BEGIN');

    const updateRes = await pool.query(
      `UPDATE users
       SET reward_points = GREATEST(COALESCE(reward_points, 0) + $1, 0)
       WHERE id = $2
       RETURNING id, reward_points`,
      [delta, userId]
    );

    if (updateRes.rows.length === 0) {
      await pool.query('ROLLBACK');
      return res.status(404).json({ error: 'User not found' });
    }

    await pool.query(
      `INSERT INTO reward_transactions (user_id, delta, reason, source, created_by)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, delta, reason, 'admin', req.user.userId]
    );

    await pool.query('COMMIT');

    res.json({
      message: 'Points updated',
      user_id: userId,
      reward_points: updateRes.rows[0].reward_points
    });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to adjust points' });
  }
});

// GET /api/rewards/history
router.get('/history', authenticateToken, requireAdmin, async (req, res) => {
  const clauses = [];
  const params = [];

  if (req.query.user_id) {
    const userId = Number.parseInt(req.query.user_id, 10);
    if (!Number.isInteger(userId)) {
      return res.status(400).json({ error: 'user_id must be a number' });
    }
    params.push(userId);
    clauses.push(`user_id = $${params.length}`);
  }

  if (req.query.from) {
    params.push(req.query.from);
    clauses.push(`created_at::date >= $${params.length}`);
  }

  if (req.query.to) {
    params.push(req.query.to);
    clauses.push(`created_at::date <= $${params.length}`);
  }

  const limitParam = Number.parseInt(req.query.limit, 10);
  const limit = Number.isInteger(limitParam) && limitParam > 0 ? Math.min(limitParam, 200) : 100;

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  try {
    params.push(limit);
    const result = await pool.query(
      `SELECT id, user_id, delta, reason, source, created_by, created_at
       FROM reward_transactions
       ${where}
       ORDER BY created_at DESC
       LIMIT $${params.length}`,
      params
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch reward history' });
  }
});

module.exports = router;
