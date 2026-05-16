import path from 'node:path'
import fs from 'node:fs'
import { NextResponse } from 'next/server'
import { authenticateRequest, requireAdmin } from '@/lib/server/auth'
import { pool } from '@/lib/server/db'
import { ensureMigrations } from '@/lib/server/migrations'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const exportsDir = path.join(process.cwd(), 'backend', 'exports')

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

function ensureExportsDir() {
  if (!fs.existsSync(exportsDir)) {
    fs.mkdirSync(exportsDir, { recursive: true })
  }
}

function csvEscape(value) {
  if (value === null || value === undefined) return ''
  const str = String(value)
  const escaped = str.replace(/"/g, '""')
  if (/[",\n]/.test(str)) return `"${escaped}"`
  return escaped
}

function toCsv(rows, columns) {
  const headers = columns && columns.length ? columns : rows[0] ? Object.keys(rows[0]) : []
  if (!headers.length) return ''
  const lines = [headers.join(',')]
  for (const row of rows) {
    lines.push(headers.map((key) => csvEscape(row[key])).join(','))
  }
  return lines.join('\n')
}

function pdfEscape(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}

function buildSimplePdf(title, rows, columns) {
  const headers = columns && columns.length ? columns : rows[0] ? Object.keys(rows[0]) : []
  const printableRows = rows.slice(0, 50).map((row) =>
    headers.map((key) => `${key}: ${row[key] ?? ''}`).join(' | ')
  )

  const contentLines = [
    title,
    `Generated: ${new Date().toISOString()}`,
    '',
    ...printableRows,
    printableRows.length < rows.length ? '' : '',
    printableRows.length < rows.length ? `... ${rows.length - printableRows.length} more rows omitted ...` : '',
  ].filter(Boolean)

  let y = 780
  const ops = ['BT', '/F1 10 Tf']
  for (const line of contentLines) {
    ops.push(`1 0 0 1 40 ${y} Tm (${pdfEscape(line).slice(0, 140)}) Tj`)
    y -= 14
    if (y < 40) break
  }
  ops.push('ET')
  const stream = ops.join('\n')

  const objects = []
  objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n')
  objects.push('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n')
  objects.push(
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n'
  )
  objects.push('4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n')
  objects.push(`5 0 obj\n<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}\nendstream\nendobj\n`)

  let pdf = '%PDF-1.4\n'
  const offsets = [0]
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'))
    pdf += obj
  }
  const xrefStart = Buffer.byteLength(pdf, 'utf8')
  pdf += `xref\n0 ${objects.length + 1}\n`
  pdf += '0000000000 65535 f \n'
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`

  return Buffer.from(pdf, 'utf8')
}

function parseFilters(filters) {
  if (!filters || typeof filters !== 'object') return {}
  return filters
}

function addDateFilters(column, filters, params, clauses) {
  if (filters.from) {
    params.push(filters.from)
    clauses.push(`${column}::date >= $${params.length}`)
  }
  if (filters.to) {
    params.push(filters.to)
    clauses.push(`${column}::date <= $${params.length}`)
  }
}

function addEqualFilter(column, value, params, clauses) {
  if (value === undefined || value === null || value === '') return
  params.push(value)
  clauses.push(`${column} = $${params.length}`)
}

function addLikeFilter(column, value, params, clauses) {
  if (!value) return
  params.push(`%${value}%`)
  clauses.push(`${column} ILIKE $${params.length}`)
}

function parseLimit(value, defaultValue, maxValue = 5000) {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isInteger(parsed) || parsed <= 0) return defaultValue
  return Math.min(parsed, maxValue)
}

function buildReportQuery(reportType, filters) {
  let sql = ''
  let params = []
  let clauses = []
  let columns = []

  switch (reportType) {
    case 'sitin': {
      columns = ['id', 'student_id', 'full_name', 'lab_name', 'purpose', 'started_at', 'ended_at', 'duration_minutes', 'feedback', 'rating']
      addDateFilters('ended_at', filters, params, clauses)
      addLikeFilter('lab_name', filters.lab_name, params, clauses)
      sql = `SELECT ${columns.join(', ')} FROM sit_in_records`
      break
    }
    case 'reservations': {
      columns = ['id', 'student_id', 'full_name', 'lab_name', 'computer_number', 'date', 'time_slot', 'purpose', 'status', 'admin_notes', 'reviewed_by', 'reviewed_at', 'created_at']
      addDateFilters('r.date', filters, params, clauses)
      addEqualFilter('r.status', filters.status, params, clauses)
      addEqualFilter('r.lab_id', filters.lab_id, params, clauses)
      addLikeFilter('l.lab_name', filters.lab_name, params, clauses)
      sql = `
        SELECT r.id, u.student_id, u.full_name, l.lab_name, c.computer_number,
               r.date, r.time_slot, r.purpose, r.status, r.admin_notes, r.reviewed_by, r.reviewed_at, r.created_at
        FROM reservations r
        LEFT JOIN users u ON u.id = r.user_id
        LEFT JOIN labs l ON l.id = r.lab_id
        LEFT JOIN lab_computers c ON c.id = r.computer_id
      `
      break
    }
    case 'testimonials': {
      columns = ['id', 'student_id', 'full_name', 'content', 'rating', 'status', 'reviewed_by', 'created_at', 'updated_at']
      addDateFilters('t.created_at', filters, params, clauses)
      addEqualFilter('t.status', filters.status, params, clauses)
      sql = `
        SELECT t.id, u.student_id, u.full_name, t.content, t.rating, t.status, t.reviewed_by, t.created_at, t.updated_at
        FROM testimonials t
        LEFT JOIN users u ON u.id = t.user_id
      `
      break
    }
    case 'users': {
      columns = ['id', 'student_id', 'full_name', 'email', 'role', 'course', 'year_level', 'address', 'status', 'created_at']
      addDateFilters('created_at', filters, params, clauses)
      addEqualFilter('status', filters.status, params, clauses)
      addEqualFilter('role', filters.role, params, clauses)
      sql = `SELECT ${columns.join(', ')} FROM users`
      break
    }
    case 'labs': {
      columns = ['id', 'lab_name', 'total_computers', 'computers']
      addLikeFilter('l.lab_name', filters.lab_name, params, clauses)
      sql = `
        SELECT l.id, l.lab_name, l.total_computers, COUNT(c.id)::int AS computers
        FROM labs l
        LEFT JOIN lab_computers c ON c.lab_id = l.id
      `
      break
    }
    default:
      return null
  }

  if (clauses.length) {
    sql += ` WHERE ${clauses.join(' AND ')}`
  }

  if (reportType === 'labs') {
    sql += ' GROUP BY l.id, l.lab_name, l.total_computers ORDER BY l.lab_name'
  } else if (reportType === 'users') {
    sql += ' ORDER BY created_at DESC'
  } else if (reportType === 'sitin') {
    sql += ' ORDER BY ended_at DESC'
  } else if (reportType === 'reservations') {
    sql += ' ORDER BY r.date DESC'
  } else if (reportType === 'testimonials') {
    sql += ' ORDER BY t.created_at DESC'
  }

  const limitValue = parseLimit(filters.limit, null)
  if (limitValue) {
    params.push(limitValue)
    sql += ` LIMIT $${params.length}`
  }

  return { sql, params, columns }
}

export async function GET(request, { params }) {
  await ensureMigrations()

  const parts = await routeParts(params)
  const auth = authenticateRequest(request)
  if (auth.response) return auth.response

  const adminError = requireAdmin(auth.user)
  if (adminError) return adminError

  if (parts.length === 1 && parts[0] === 'templates') {
    return NextResponse.json({
      formats: ['csv', 'pdf'],
      reports: [
        { type: 'sitin', label: 'Sit-In Sessions', filters: ['from', 'to', 'lab_name', 'limit'] },
        { type: 'reservations', label: 'Reservations', filters: ['from', 'to', 'status', 'lab_id', 'lab_name', 'limit'] },
        { type: 'testimonials', label: 'Testimonials', filters: ['from', 'to', 'status', 'limit'] },
        { type: 'users', label: 'Users', filters: ['from', 'to', 'status', 'role', 'limit'] },
        { type: 'labs', label: 'Labs', filters: ['lab_name', 'limit'] },
      ],
    })
  }

  if (parts.length === 1 && parts[0] === 'history') {
    const limit = parseLimit(request.nextUrl.searchParams.get('limit'), 50, 200)
    try {
      const result = await pool.query(
        `SELECT id, report_type, format, filters, file_path, requested_by, created_at
         FROM report_exports
         ORDER BY created_at DESC
         LIMIT $1`,
        [limit]
      )
      const history = result.rows.map((row) => {
        let parsedFilters = row.filters
        try {
          parsedFilters = row.filters ? JSON.parse(row.filters) : null
        } catch (_) {
          parsedFilters = row.filters
        }
        return { ...row, filters: parsedFilters }
      })
      return NextResponse.json(history)
    } catch (error) {
      console.error(error)
      return NextResponse.json({ error: 'Failed to fetch report history' }, { status: 500 })
    }
  }

  if (parts.length === 2 && parts[1] === 'download') {
    const reportId = Number.parseInt(parts[0], 10)
    if (!Number.isInteger(reportId)) return NextResponse.json({ error: 'Report not found' }, { status: 404 })

    try {
      const result = await pool.query(
        'SELECT id, report_type, format, file_path FROM report_exports WHERE id = $1',
        [reportId]
      )
      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Report not found' }, { status: 404 })
      }

      const report = result.rows[0]
      if (!report.file_path || !fs.existsSync(report.file_path)) {
        return NextResponse.json({ error: 'Report file missing' }, { status: 404 })
      }

      const bytes = fs.readFileSync(report.file_path)
      const fileName = path.basename(report.file_path)
      const contentType = report.format === 'pdf' ? 'application/pdf' : 'text/csv; charset=utf-8'
      return new NextResponse(bytes, {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${fileName}"`,
        },
      })
    } catch (error) {
      console.error(error)
      return NextResponse.json({ error: 'Failed to download report' }, { status: 500 })
    }
  }

  return notFound()
}

export async function POST(request, { params }) {
  await ensureMigrations()

  const parts = await routeParts(params)
  const auth = authenticateRequest(request)
  if (auth.response) return auth.response

  const adminError = requireAdmin(auth.user)
  if (adminError) return adminError

  if (!(parts.length === 1 && parts[0] === 'generate')) return notFound()

  const payload = await readJson(request)
  const reportType = payload.type
  const format = (payload.format || 'csv').toLowerCase()
  const filters = parseFilters(payload.filters)
  const shouldStore = Boolean(payload.store)

  if (!reportType) {
    return NextResponse.json({ error: 'Report type is required' }, { status: 400 })
  }
  if (!['csv', 'pdf'].includes(format)) {
    return NextResponse.json({ error: 'Invalid format. Use csv or pdf.' }, { status: 400 })
  }

  const queryData = buildReportQuery(reportType, filters)
  if (!queryData) {
    return NextResponse.json({ error: 'Unknown report type' }, { status: 400 })
  }

  try {
    const result = await pool.query(queryData.sql, queryData.params)
    const now = Date.now()
    const extension = format === 'pdf' ? 'pdf' : 'csv'
    const fileName = `${reportType}-${now}.${extension}`
    let bytes
    let contentType

    if (format === 'pdf') {
      bytes = buildSimplePdf(`${reportType.toUpperCase()} REPORT`, result.rows, queryData.columns)
      contentType = 'application/pdf'
    } else {
      bytes = Buffer.from(toCsv(result.rows, queryData.columns), 'utf8')
      contentType = 'text/csv; charset=utf-8'
    }

    if (shouldStore) {
      ensureExportsDir()
      const filePath = path.join(exportsDir, fileName)
      fs.writeFileSync(filePath, bytes)
      await pool.query(
        `INSERT INTO report_exports (report_type, format, filters, file_path, requested_by)
         VALUES ($1, $2, $3, $4, $5)`,
        [reportType, format, JSON.stringify(filters), filePath, auth.user.userId]
      )
    }

    return new NextResponse(bytes, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    })
  } catch (error) {
    if (error?.code === '42P01') {
      return NextResponse.json({ error: 'Report type not available yet.' }, { status: 400 })
    }
    console.error(error)
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
  }
}
