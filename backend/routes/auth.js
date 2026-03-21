const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');

// Middleware: Verify JWT token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

// ── MIGRATION: ensure email column exists ──────────────────────────────────
pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255)`)
  .catch(() => {/* column may already exist, ignore */});

// Register endpoint
router.post('/register', async (req, res) => {
  try {
    const { student_id, password, full_name, email, course, year_level, address } = req.body;

    // Validation
    if (!student_id || !password || !full_name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if user already exists
    const userExists = await pool.query('SELECT id FROM users WHERE student_id = $1', [student_id]);
    if (userExists.rows.length > 0) {
      return res.status(409).json({ error: 'Student ID already registered' });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Insert user
    const result = await pool.query(
      'INSERT INTO users (student_id, password_hash, full_name, email, role, course, year_level, address) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, student_id, full_name, email, role, course, year_level, address',
      [student_id, password_hash, full_name, email || null, 'user', course || null, year_level || null, address || null]
    );

    const user = result.rows[0];

    // Create JWT token
    const token = jwt.sign(
      { userId: user.id, student_id: user.student_id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        student_id: user.student_id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        course: user.course,
        year_level: user.year_level,
        address: user.address
      },
      token
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { student_id, password } = req.body;

    if (!student_id || !password) {
      return res.status(400).json({ error: 'Student ID and password required' });
    }

    // Find user
    const result = await pool.query(
      'SELECT id, student_id, full_name, email, password_hash, role, course, year_level, address FROM users WHERE student_id = $1',
      [student_id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid student ID or password' });
    }

    const user = result.rows[0];

    // Compare password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid student ID or password' });
    }

    // Create JWT token
    const token = jwt.sign(
      { userId: user.id, student_id: user.student_id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        student_id: user.student_id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        course: user.course,
        year_level: user.year_level,
        address: user.address
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get user profile (requires authentication)
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const result = await pool.query(
      'SELECT id, student_id, full_name, email, role, course, year_level, address, created_at FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update user profile (requires authentication)
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { course, year_level, address } = req.body;

    const result = await pool.query(
      'UPDATE users SET course = $1, year_level = $2, address = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING id, student_id, full_name, role, course, year_level, address',
      [course || null, year_level || null, address || null, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'Profile updated successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

module.exports = router;
