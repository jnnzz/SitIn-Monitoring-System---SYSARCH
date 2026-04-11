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
    console.log('❌ No token provided');
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      console.log('❌ Token verification failed:', err.message);
      console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);
      return res.status(403).json({ error: 'Invalid or expired token', details: err.message });
    }
    req.user = user;
    next();
  });
}

// ── REGISTRATION ────────────────────────────────────────────────────────────
pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255)`).catch(()=>{});

router.post('/register', async (req, res) => {
  try {
    const { student_id, full_name, email, password, role, course, year_level, address } = req.body;
    if (!student_id || !full_name || !password) return res.status(400).json({ error: 'All fields are required' });
    
    const userExists = await pool.query('SELECT * FROM users WHERE student_id = $1', [student_id]);
    if (userExists.rows.length > 0) return res.status(400).json({ error: 'Student ID already exists' });
    
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const userRole = role === 'admin' ? 'admin' : 'student';
    
    const result = await pool.query(
      'INSERT INTO users (student_id, full_name, email, password_hash, role, course, year_level, address, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id, student_id, full_name, email, role, course, year_level, address, status',
      [student_id, full_name, email || null, passwordHash, userRole, course || null, year_level || null, address || null, 'active']
    );
    res.status(201).json({ message: 'User registered successfully', user: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

// ── LOGIN ───────────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { student_id, password } = req.body;
    if (!student_id || !password) return res.status(400).json({ error: 'Student ID and password required' });
    
    const result = await pool.query(
      'SELECT id, student_id, full_name, email, password_hash, role, course, year_level, address, remaining_sessions, status FROM users WHERE student_id = $1',
      [student_id]
    );
    if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid student ID or password' });
    
    const user = result.rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) return res.status(401).json({ error: 'Invalid student ID or password' });
    
    const token = jwt.sign(
      { userId: user.id, student_id: user.student_id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({
      message: 'Login successful',
      user: {
        id: user.id, student_id: user.student_id, full_name: user.full_name, email: user.email,
        role: user.role, course: user.course, year_level: user.year_level, address: user.address,
        remaining_sessions: user.remaining_sessions || 0, status: user.status || 'active'
      },
      token
    });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// ── PROFILE ─────────────────────────────────────────────────────────────────
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, student_id, full_name, email, role, course, year_level, address, remaining_sessions, status, created_at FROM users WHERE id = $1',
      [req.user.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (error) { res.status(500).json({ error: 'Failed to fetch profile' }); }
});

router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { course, year_level, address, status } = req.body;
    const result = await pool.query(
      'UPDATE users SET course = $1, year_level = $2, address = $3, status = COALESCE($4, status), updated_at = CURRENT_TIMESTAMP WHERE id = $5 RETURNING id, student_id, full_name, role, course, year_level, address, status',
      [course || null, year_level || null, address || null, status || null, req.user.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'Profile updated successfully', user: result.rows[0] });
  } catch (error) { res.status(500).json({ error: 'Failed to update profile' }); }
});

// ── STATUS UPDATE ───────────────────────────────────────────────────────────
router.put('/status', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'Status is required' });
    
    // Validate status values (you can customize allowed values)
    const allowedStatuses = ['active', 'away', 'busy', 'offline', 'do not disturb'];
    if (!allowedStatuses.includes(status.toLowerCase())) {
      return res.status(400).json({ error: 'Invalid status value', allowed: allowedStatuses });
    }
    
    const result = await pool.query(
      'UPDATE users SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, student_id, full_name, status',
      [status, req.user.userId]
    );
    
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'Status updated successfully', user: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// ── LOGOUT / AUTO-END SESSION ───────────────────────────────────────────────
router.post('/logout', authenticateToken, async (req, res) => {
  // Session deduction is now handled manually by admin. 
  // This endpoint remains returning 200 OK for frontend compatibility.
  res.json({ message: 'Logged out successfully' });
});

// ── ADMIN MIDDLEWARE & ROUTES ───────────────────────────────────────────────
function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  next();
}

// ── DB migration: announcements table ───────────────────────────────────────
pool.query(`
  CREATE TABLE IF NOT EXISTS announcements (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info',
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`).catch(() => {});

pool.query(`
  CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    type VARCHAR(50) DEFAULT 'announcement',
    is_read BOOLEAN DEFAULT FALSE,
    reference_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`).catch(() => {});

// Helper: format date string
function formatDate(date) {
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

// GET /api/auth/admin/announcements — admin sees all
router.get('/admin/announcements', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, title, content, type,
             TO_CHAR(created_at, 'Month DD, YYYY') AS date,
             created_at
      FROM announcements
      ORDER BY created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

// GET /api/auth/announcements — students see all
router.get('/announcements', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, title, content, type,
             TO_CHAR(created_at, 'Month DD, YYYY') AS date,
             created_at
      FROM announcements
      ORDER BY created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

// POST /api/auth/admin/announcements — create + fan-out notifications
router.post('/admin/announcements', authenticateToken, requireAdmin, async (req, res) => {
  const { title, content, type } = req.body;
  if (!title || !content) return res.status(400).json({ error: 'Title and content required' });

  try {
    // Insert announcement
    const annResult = await pool.query(
      `INSERT INTO announcements (title, content, type, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING id, title, content, type,
                 TO_CHAR(created_at, 'Month DD, YYYY') AS date, created_at`,
      [title, content, type || 'info', req.user.userId]
    );
    const newAnn = annResult.rows[0];

    // Fan-out: create a notification for every student
    const students = await pool.query(`SELECT id FROM users WHERE role != 'admin'`);
    if (students.rows.length > 0) {
      const values = students.rows.map((_, i) => `($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4})`).join(', ');
      const params = students.rows.flatMap(s => [s.id, title, content, newAnn.id]);
      await pool.query(
        `INSERT INTO notifications (user_id, title, message, reference_id) VALUES ${values}`,
        params
      ).catch(e => console.error('Notification fan-out error:', e));
    }

    res.status(201).json(newAnn);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create announcement' });
  }
});

// DELETE /api/auth/admin/announcements/:id
router.delete('/admin/announcements/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM announcements WHERE id = $1', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete announcement' });
  }
});

router.get('/admin/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query("SELECT id, student_id, full_name, role, course, year_level, remaining_sessions, status, created_at FROM users WHERE role != 'admin' ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: 'Failed to fetch users' }); }
});

router.delete('/admin/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const target = await pool.query('SELECT role FROM users WHERE id = $1', [req.params.id]);
    if (target.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    if (target.rows[0].role === 'admin') return res.status(403).json({ error: 'Cannot delete admin' });
    
    await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ message: 'User deleted' });
  } catch (err) { res.status(500).json({ error: 'Failed to delete' }); }
});

router.get('/admin/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const totalRes = await pool.query("SELECT COUNT(*) FROM users WHERE role != 'admin'");
    const newRes = await pool.query("SELECT COUNT(*) FROM users WHERE role != 'admin' AND DATE(created_at) = CURRENT_DATE");
    res.json({ total_users: parseInt(totalRes.rows[0].count), new_today: parseInt(newRes.rows[0].count) });
  } catch (err) { res.status(500).json({ error: 'Failed config' }); }
});

// ── AVATAR UPLOAD ───────────────────────────────────────────────────────────
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `avatar_${req.user.userId}_${Date.now()}${ext}`);
  }
});
const upload = multer({
  storage, limits: { fileSize: 5*1024*1024 },
  fileFilter: (req, file, cb) => {
    if (/jpeg|jpg|png|webp|gif/.test(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error('Images only'));
  }
});

pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500)`).catch(()=>{});

router.post('/avatar', authenticateToken, upload.single('avatar'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  const userId = req.user.userId;
  const avatarUrl = `/uploads/${req.file.filename}`;

  try {
    const old = await pool.query('SELECT avatar_url FROM users WHERE id = $1', [userId]);
    if (old.rows[0]?.avatar_url) {
      const oldPath = path.join(__dirname, '..', old.rows[0].avatar_url);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
  } catch (_) {}

  const result = await pool.query('UPDATE users SET avatar_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING avatar_url', [avatarUrl, userId]);
  res.json({ avatar_url: `http://localhost:5000${result.rows[0].avatar_url}` });
});

module.exports = router;
