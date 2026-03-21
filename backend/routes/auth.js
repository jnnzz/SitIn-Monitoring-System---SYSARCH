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

// ── ADMIN MIDDLEWARE ────────────────────────────────────────────────────────
function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// ── ANNOUNCEMENTS (simple in-memory store) ──────────────────────────────────
let announcements = [
  { id: 1, title: 'Lab Maintenance Notice', content: 'All laboratories will be closed on March 25-26 for scheduled maintenance.', date: 'March 20, 2026', type: 'important' },
  { id: 2, title: 'New Software Available', content: 'Visual Studio Code and GitHub Desktop have been installed on all lab computers.', date: 'March 18, 2026', type: 'info' },
  { id: 3, title: 'Session Tracking System Live', content: 'The SitIn Monitoring System is now active. Please log in for accurate session tracking.', date: 'March 15, 2026', type: 'success' },
];
let nextAnnouncementId = 4;

router.get('/admin/announcements', authenticateToken, requireAdmin, (req, res) => {
  res.json(announcements);
});

// Public read: any authenticated user can read announcements
router.get('/announcements', authenticateToken, (req, res) => {
  res.json(announcements);
});

router.post('/admin/announcements', authenticateToken, requireAdmin, (req, res) => {
  const { title, content, type } = req.body;
  if (!title || !content) return res.status(400).json({ error: 'Title and content required' });
  const now = new Date();
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const dateStr = `${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
  const newAnn = { id: nextAnnouncementId++, title, content, date: dateStr, type: type || 'info' };
  announcements.unshift(newAnn);
  res.status(201).json(newAnn);
});

router.delete('/admin/announcements/:id', authenticateToken, requireAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  announcements = announcements.filter(a => a.id !== id);
  res.json({ message: 'Deleted' });
});

// ── ADMIN: GET ALL USERS ────────────────────────────────────────────────────
router.get('/admin/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, student_id, full_name, email, role, course, year_level, address, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Admin users error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// ── ADMIN: DELETE USER ──────────────────────────────────────────────────────
router.delete('/admin/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM users WHERE id = $1 AND role != $2', [id, 'admin']);
    res.json({ message: 'User deleted' });
  } catch (err) {
    console.error('Admin delete user error:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// ── ADMIN: STATS ────────────────────────────────────────────────────────────
router.get('/admin/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const totalUsers = await pool.query("SELECT COUNT(*) FROM users WHERE role != 'admin'");
    const today = await pool.query("SELECT COUNT(*) FROM users WHERE created_at >= CURRENT_DATE");
    res.json({
      total_users: parseInt(totalUsers.rows[0].count),
      new_today: parseInt(today.rows[0].count),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

module.exports = router;

