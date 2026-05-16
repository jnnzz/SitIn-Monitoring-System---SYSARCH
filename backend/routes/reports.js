const express = require('express');
const router = express.Router();
const pool = require('../db');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');

// Auth middleware
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

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// Migrations
async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS report_exports (
      id SERIAL PRIMARY KEY,
      report_type VARCHAR(50) NOT NULL,
      format VARCHAR(10) NOT NULL,
      filters TEXT,
      file_path TEXT,
      requested_by INTEGER REFERENCES users(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `).catch(() => {});
}

migrate();

const exportsDir = path.join(__dirname, '..', 'exports');

function ensureExportsDir() {
  if (!fs.existsSync(exportsDir)) {
    fs.mkdirSync(exportsDir, { recursive: true });
  }
}

function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  const escaped = str.replace(/"/g, '""');
  if (/[",\n]/.test(str)) {
    return `"${escaped}"`;
  }
  return escaped;
}

function toCsv(rows, columns) {
  const headers = columns && columns.length ? columns : (rows[0] ? Object.keys(rows[0]) : []);
  if (!headers.length) return '';
  const lines = [headers.join(',')];
  for (const row of rows) {
    const line = headers.map((key) => csvEscape(row[key])).join(',');
    lines.push(line);
  }
  return lines.join('\n');
}

function parseFilters(filters) {
  if (!filters || typeof filters !== 'object') return {};
  return filters;
}

function addDateFilters(column, filters, params, clauses) {
  if (filters.from) {
    params.push(filters.from);
    clauses.push(`${column}::date >= $${params.length}`);
  }
  if (filters.to) {
    params.push(filters.to);
    clauses.push(`${column}::date <= $${params.length}`);
  }
}

function addEqualFilter(column, value, params, clauses) {
  if (value === undefined || value === null || value === '') return;
  params.push(value);
  clauses.push(`${column} = $${params.length}`);
}

function addLikeFilter(column, value, params, clauses) {
  if (!value) return;
  params.push(`%${value}%`);
  clauses.push(`${column} ILIKE $${params.length}`);
}

function parseLimit(value, defaultValue, maxValue) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) return defaultValue;
  return Math.min(parsed, maxValue);
}

// GET /api/reports/templates
router.get('/templates', authenticateToken, requireAdmin, (req, res) => {
  res.json({
    formats: ['csv', 'pdf'],
    reports: [
      { type: 'sitin', label: 'Sit-In Sessions', filters: ['from', 'to', 'lab_name', 'limit'] },
      { type: 'reservations', label: 'Reservations', filters: ['from', 'to', 'status', 'lab_id', 'lab_name', 'limit'] },
      { type: 'testimonials', label: 'Testimonials', filters: ['from', 'to', 'status', 'limit'] },
      { type: 'users', label: 'Users', filters: ['from', 'to', 'status', 'role', 'limit'] },
      { type: 'labs', label: 'Labs', filters: ['lab_name', 'limit'] }
    ]
  });
});

// POST /api/reports/generate
router.post('/generate', authenticateToken, requireAdmin, async (req, res) => {
  const payload = req.body || {};
  const reportType = payload.type;
  const format = (payload.format || 'csv').toLowerCase();
  const filters = parseFilters(payload.filters);
  const shouldStore = Boolean(payload.store);

  if (!reportType) {
    return res.status(400).json({ error: 'Report type is required' });
  }

  if (format !== 'csv' && format !== 'pdf') {
    return res.status(400).json({ error: 'Invalid format. Use csv or pdf.' });
  }

  if (format === 'pdf') {
    return res.status(501).json({ error: 'PDF export is not supported yet.' });
  }

  let sql = '';
  let params = [];
  let clauses = [];
  let columns = [];

  switch (reportType) {
    case 'sitin': {
      columns = [
        'id', 'student_id', 'full_name', 'lab_name', 'purpose',
        'started_at', 'ended_at', 'duration_minutes', 'feedback', 'rating'
      ];
      addDateFilters('ended_at', filters, params, clauses);
      addLikeFilter('lab_name', filters.lab_name, params, clauses);
      sql = `SELECT ${columns.join(', ')} FROM sit_in_records`;
      break;
    }
    case 'reservations': {
      columns = [
        'id', 'student_id', 'full_name', 'lab_name', 'computer_number',
        'date', 'time_slot', 'purpose', 'status', 'admin_notes',
        'reviewed_by', 'reviewed_at', 'created_at'
      ];
      addDateFilters('r.date', filters, params, clauses);
      addEqualFilter('r.status', filters.status, params, clauses);
      addEqualFilter('r.lab_id', filters.lab_id, params, clauses);
      addLikeFilter('l.lab_name', filters.lab_name, params, clauses);
      sql = `
        SELECT r.id, u.student_id, u.full_name, l.lab_name, c.computer_number,
               r.date, r.time_slot, r.purpose, r.status, r.admin_notes,
               r.reviewed_by, r.reviewed_at, r.created_at
        FROM reservations r
        LEFT JOIN users u ON u.id = r.user_id
        LEFT JOIN labs l ON l.id = r.lab_id
        LEFT JOIN lab_computers c ON c.id = r.computer_id
      `;
      break;
    }
    case 'testimonials': {
      columns = [
        'id', 'student_id', 'full_name', 'content', 'rating',
        'status', 'reviewed_by', 'created_at', 'updated_at'
      ];
      addDateFilters('t.created_at', filters, params, clauses);
      addEqualFilter('t.status', filters.status, params, clauses);
      sql = `
        SELECT t.id, u.student_id, u.full_name, t.content, t.rating,
               t.status, t.reviewed_by, t.created_at, t.updated_at
        FROM testimonials t
        LEFT JOIN users u ON u.id = t.user_id
      `;
      break;
    }
    case 'users': {
      columns = [
        'id', 'student_id', 'full_name', 'email', 'role',
        'course', 'year_level', 'address', 'status', 'created_at'
      ];
      addDateFilters('created_at', filters, params, clauses);
      addEqualFilter('status', filters.status, params, clauses);
      addEqualFilter('role', filters.role, params, clauses);
      sql = `SELECT ${columns.join(', ')} FROM users`;
      break;
    }
    case 'labs': {
      columns = ['id', 'lab_name', 'total_computers', 'computers'];
      addLikeFilter('l.lab_name', filters.lab_name, params, clauses);
      sql = `
        SELECT l.id, l.lab_name, l.total_computers,
               COUNT(c.id)::int AS computers
        FROM labs l
        LEFT JOIN lab_computers c ON c.lab_id = l.id
      `;
      break;
    }
    default:
      return res.status(400).json({ error: 'Unknown report type' });
  }

  if (clauses.length) {
    sql += ` WHERE ${clauses.join(' AND ')}`;
  }

  if (reportType === 'labs') {
    sql += ' GROUP BY l.id, l.lab_name, l.total_computers';
    sql += ' ORDER BY l.lab_name';
  } else if (reportType === 'users') {
    sql += ' ORDER BY created_at DESC';
  } else if (reportType === 'sitin') {
    sql += ' ORDER BY ended_at DESC';
  } else if (reportType === 'reservations') {
    sql += ' ORDER BY r.date DESC';
  } else if (reportType === 'testimonials') {
    sql += ' ORDER BY t.created_at DESC';
  }

  const limitValue = parseLimit(filters.limit, null, 5000);
  if (limitValue) {
    params.push(limitValue);
    sql += ` LIMIT $${params.length}`;
  }

  try {
    const result = await pool.query(sql, params);
    const csv = toCsv(result.rows, columns);
    const fileName = `${reportType}-${Date.now()}.csv`;

    if (shouldStore) {
      ensureExportsDir();
      const filePath = path.join(exportsDir, fileName);
      fs.writeFileSync(filePath, csv, 'utf8');
      await pool.query(
        `INSERT INTO report_exports (report_type, format, filters, file_path, requested_by)
         VALUES ($1, $2, $3, $4, $5)`,
        [reportType, format, JSON.stringify(filters), filePath, req.user.userId]
      );
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.send(csv);
  } catch (err) {
    if (err.code === '42P01') {
      return res.status(400).json({ error: 'Report type not available yet.' });
    }
    console.error(err);
    return res.status(500).json({ error: 'Failed to generate report' });
  }
});

// GET /api/reports/history
router.get('/history', authenticateToken, requireAdmin, async (req, res) => {
  const limit = parseLimit(req.query.limit, 50, 200);
  try {
    const result = await pool.query(
      `SELECT id, report_type, format, filters, file_path, requested_by, created_at
       FROM report_exports
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit]
    );

    const history = result.rows.map((row) => {
      let parsedFilters = row.filters;
      try {
        parsedFilters = row.filters ? JSON.parse(row.filters) : null;
      } catch (_) {
        parsedFilters = row.filters;
      }
      return { ...row, filters: parsedFilters };
    });

    res.json(history);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch report history' });
  }
});

// GET /api/reports/:id/download
router.get('/:id/download', authenticateToken, requireAdmin, async (req, res) => {
  const reportId = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(reportId)) {
    return res.status(404).json({ error: 'Report not found' });
  }

  try {
    const result = await pool.query(
      'SELECT id, report_type, format, file_path FROM report_exports WHERE id = $1',
      [reportId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const report = result.rows[0];
    if (!report.file_path || !fs.existsSync(report.file_path)) {
      return res.status(404).json({ error: 'Report file missing' });
    }

    const fileName = path.basename(report.file_path);
    const contentType = report.format === 'pdf' ? 'application/pdf' : 'text/csv';
    res.setHeader('Content-Type', contentType);
    return res.download(report.file_path, fileName);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to download report' });
  }
});

module.exports = router;
