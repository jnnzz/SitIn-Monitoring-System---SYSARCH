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
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
}

// ── REGISTRATION ────────────────────────────────────────────────────────────
pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255)`).catch(()=>{});

router.post('/register', async (req, res) => {
  try {
    const { student_id, full_name, email, password, role } = req.body;
    if (!student_id || !full_name || !password) return res.status(400).json({ error: 'All fields are required' });
    
    const userExists = await pool.query('SELECT * FROM users WHERE student_id = $1', [student_id]);
    if (userExists.rows.length > 0) return res.status(400).json({ error: 'Student ID already exists' });
    
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const userRole = role === 'admin' ? 'admin' : 'student';
    
    const result = await pool.query(
      'INSERT INTO users (student_id, full_name, email, password_hash, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, student_id, full_name, email, role',
      [student_id, full_name, email || null, passwordHash, userRole]
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
      'SELECT id, student_id, full_name, email, password_hash, role, course, year_level, address, remaining_sessions FROM users WHERE student_id = $1',
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
        remaining_sessions: user.remaining_sessions || 0
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
      'SELECT id, student_id, full_name, email, role, course, year_level, address, remaining_sessions, created_at FROM users WHERE id = $1',
      [req.user.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (error) { res.status(500).json({ error: 'Failed to fetch profile' }); }
});

router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { course, year_level, address } = req.body;
    const result = await pool.query(
      'UPDATE users SET course = $1, year_level = $2, address = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING id, student_id, full_name, role, course, year_level, address',
      [course || null, year_level || null, address || null, req.user.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'Profile updated successfully', user: result.rows[0] });
  } catch (error) { res.status(500).json({ error: 'Failed to update profile' }); }
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

let announcements = [
  { id: 1, title: 'Lab Maintenance Notice', content: 'All laboratories will be closed on March 25-26 for scheduled maintenance.', date: 'March 20, 2026', type: 'important' },
  { id: 2, title: 'New Software Available', content: 'Visual Studio Code and GitHub Desktop have been installed on all lab computers.', date: 'March 18, 2026', type: 'info' },
  { id: 3, title: 'Session Tracking System Live', content: 'The SitIn Monitoring System is now active. Please log in for accurate session tracking.', date: 'March 15, 2026', type: 'success' },
];
let nextAnnouncementId = 4;

router.get('/admin/announcements', authenticateToken, requireAdmin, (req, res) => res.json(announcements));
router.get('/announcements', authenticateToken, (req, res) => res.json(announcements));

router.post('/admin/announcements', authenticateToken, requireAdmin, (req, res) => {
  const { title, content, type } = req.body;
  if (!title || !content) return res.status(400).json({ error: 'Title required' });
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const now = new Date();
  const dateStr = `${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
  const newAnn = { id: nextAnnouncementId++, title, content, date: dateStr, type: type || 'info' };
  announcements.unshift(newAnn);
  res.status(201).json(newAnn);
});

router.delete('/admin/announcements/:id', authenticateToken, requireAdmin, (req, res) => {
  announcements = announcements.filter(a => a.id !== parseInt(req.params.id));
  res.json({ message: 'Deleted' });
});

router.get('/admin/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query("SELECT id, student_id, full_name, role, course, year_level, remaining_sessions, created_at FROM users WHERE role != 'admin' ORDER BY created_at DESC");
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
