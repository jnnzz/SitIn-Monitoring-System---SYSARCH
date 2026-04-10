import path from 'node:path'
import { promises as fs } from 'node:fs'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { NextResponse } from 'next/server'
import { authenticateRequest, requireAdmin } from '@/lib/server/auth'
import { pool } from '@/lib/server/db'
import { ensureMigrations } from '@/lib/server/migrations'
import {
  deleteUploadFile,
  ensureRootUploadDir,
  extractUploadFileName,
  isAllowedImageFileName,
  resolveRootUploadFile,
} from '@/lib/server/uploads'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

let announcements = [
  {
    id: 1,
    title: 'Lab Maintenance Notice',
    content: 'All laboratories will be closed on March 25-26 for scheduled maintenance.',
    date: 'March 20, 2026',
    type: 'important',
  },
  {
    id: 2,
    title: 'New Software Available',
    content: 'Visual Studio Code and GitHub Desktop have been installed on all lab computers.',
    date: 'March 18, 2026',
    type: 'info',
  },
  {
    id: 3,
    title: 'Session Tracking System Live',
    content: 'The SitIn Monitoring System is now active. Please log in for accurate session tracking.',
    date: 'March 15, 2026',
    type: 'success',
  },
]

let nextAnnouncementId = 4

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

function todayLabel() {
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ]

  const now = new Date()
  return `${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`
}

function normalizeAvatarUrl(avatarUrl, request) {
  if (!avatarUrl) return null
  if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) return avatarUrl
  return `${request.nextUrl.origin}${avatarUrl}`
}

export async function GET(request, { params }) {
  await ensureMigrations()

  const parts = await routeParts(params)

  if (parts.length === 1 && parts[0] === 'profile') {
    const auth = authenticateRequest(request, { includeDetails: true })
    if (auth.response) return auth.response

    try {
      const result = await pool.query(
        'SELECT id, student_id, full_name, email, role, course, year_level, address, remaining_sessions, status, avatar_url, created_at FROM users WHERE id = $1',
        [auth.user.userId]
      )

      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }

      const profile = result.rows[0]
      return NextResponse.json({
        ...profile,
        avatar_url: normalizeAvatarUrl(profile.avatar_url, request),
      })
    } catch (error) {
      console.error(error)
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
    }
  }

  if (parts.length === 1 && parts[0] === 'announcements') {
    const auth = authenticateRequest(request, { includeDetails: true })
    if (auth.response) return auth.response
    return NextResponse.json(announcements)
  }

  if (parts.length === 2 && parts[0] === 'admin' && parts[1] === 'announcements') {
    const auth = authenticateRequest(request, { includeDetails: true })
    if (auth.response) return auth.response

    const adminError = requireAdmin(auth.user)
    if (adminError) return adminError

    return NextResponse.json(announcements)
  }

  if (parts.length === 2 && parts[0] === 'admin' && parts[1] === 'users') {
    const auth = authenticateRequest(request, { includeDetails: true })
    if (auth.response) return auth.response

    const adminError = requireAdmin(auth.user)
    if (adminError) return adminError

    try {
      const result = await pool.query(
        "SELECT id, student_id, full_name, role, course, year_level, remaining_sessions, status, created_at FROM users WHERE role != 'admin' ORDER BY created_at DESC"
      )
      return NextResponse.json(result.rows)
    } catch (error) {
      console.error(error)
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }
  }

  if (parts.length === 2 && parts[0] === 'admin' && parts[1] === 'stats') {
    const auth = authenticateRequest(request, { includeDetails: true })
    if (auth.response) return auth.response

    const adminError = requireAdmin(auth.user)
    if (adminError) return adminError

    try {
      const totalRes = await pool.query("SELECT COUNT(*) FROM users WHERE role != 'admin'")
      const newRes = await pool.query(
        "SELECT COUNT(*) FROM users WHERE role != 'admin' AND DATE(created_at) = CURRENT_DATE"
      )

      return NextResponse.json({
        total_users: Number.parseInt(totalRes.rows[0].count, 10),
        new_today: Number.parseInt(newRes.rows[0].count, 10),
      })
    } catch (error) {
      console.error(error)
      return NextResponse.json({ error: 'Failed config' }, { status: 500 })
    }
  }

  return notFound()
}

export async function POST(request, { params }) {
  await ensureMigrations()

  const parts = await routeParts(params)

  if (parts.length === 1 && parts[0] === 'register') {
    try {
      const { student_id, full_name, email, password, role, course, year_level, address } = await readJson(request)

      if (!student_id || !full_name || !password) {
        return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
      }

      const userExists = await pool.query('SELECT * FROM users WHERE student_id = $1', [student_id])
      if (userExists.rows.length > 0) {
        return NextResponse.json({ error: 'Student ID already exists' }, { status: 400 })
      }

      const salt = await bcrypt.genSalt(10)
      const passwordHash = await bcrypt.hash(password, salt)
      const userRole = role === 'admin' ? 'admin' : 'student'

      const result = await pool.query(
        'INSERT INTO users (student_id, full_name, email, password_hash, role, course, year_level, address, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id, student_id, full_name, email, role, course, year_level, address, status',
        [
          student_id,
          full_name,
          email || null,
          passwordHash,
          userRole,
          course || null,
          year_level || null,
          address || null,
          'active',
        ]
      )

      return NextResponse.json(
        { message: 'User registered successfully', user: result.rows[0] },
        { status: 201 }
      )
    } catch (error) {
      console.error(error)
      return NextResponse.json({ error: 'Registration failed' }, { status: 500 })
    }
  }

  if (parts.length === 1 && parts[0] === 'login') {
    try {
      const { student_id, password } = await readJson(request)

      if (!student_id || !password) {
        return NextResponse.json({ error: 'Student ID and password required' }, { status: 400 })
      }

      const result = await pool.query(
        'SELECT id, student_id, full_name, email, password_hash, role, course, year_level, address, remaining_sessions, status, avatar_url FROM users WHERE student_id = $1',
        [student_id]
      )

      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Invalid student ID or password' }, { status: 401 })
      }

      const user = result.rows[0]
      const isPasswordValid = await bcrypt.compare(password, user.password_hash)
      if (!isPasswordValid) {
        return NextResponse.json({ error: 'Invalid student ID or password' }, { status: 401 })
      }

      const token = jwt.sign(
        { userId: user.id, student_id: user.student_id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      )

      return NextResponse.json({
        message: 'Login successful',
        user: {
          id: user.id,
          student_id: user.student_id,
          full_name: user.full_name,
          email: user.email,
          role: user.role,
          course: user.course,
          year_level: user.year_level,
          address: user.address,
          remaining_sessions: user.remaining_sessions || 0,
          status: user.status || 'active',
          avatar_url: normalizeAvatarUrl(user.avatar_url, request),
        },
        token,
      })
    } catch (error) {
      console.error(error)
      return NextResponse.json({ error: 'Login failed' }, { status: 500 })
    }
  }

  if (parts.length === 1 && parts[0] === 'logout') {
    const auth = authenticateRequest(request, { includeDetails: true })
    if (auth.response) return auth.response

    return NextResponse.json({ message: 'Logged out successfully' })
  }

  if (parts.length === 3 && parts[0] === 'admin' && parts[1] === 'announcements') {
    return notFound()
  }

  if (parts.length === 2 && parts[0] === 'admin' && parts[1] === 'announcements') {
    const auth = authenticateRequest(request, { includeDetails: true })
    if (auth.response) return auth.response

    const adminError = requireAdmin(auth.user)
    if (adminError) return adminError

    const { title, content, type } = await readJson(request)
    if (!title || !content) {
      return NextResponse.json({ error: 'Title required' }, { status: 400 })
    }

    const newAnnouncement = {
      id: nextAnnouncementId++,
      title,
      content,
      date: todayLabel(),
      type: type || 'info',
    }

    announcements.unshift(newAnnouncement)
    return NextResponse.json(newAnnouncement, { status: 201 })
  }

  if (parts.length === 1 && parts[0] === 'avatar') {
    const auth = authenticateRequest(request, { includeDetails: true })
    if (auth.response) return auth.response

    try {
      const formData = await request.formData()
      const avatar = formData.get('avatar')

      if (!avatar || typeof avatar === 'string') {
        return NextResponse.json({ error: 'No file' }, { status: 400 })
      }

      if (!isAllowedImageFileName(avatar.name)) {
        return NextResponse.json({ error: 'Images only' }, { status: 400 })
      }

      if (avatar.size > 5 * 1024 * 1024) {
        return NextResponse.json({ error: 'File too large' }, { status: 400 })
      }

      await ensureRootUploadDir()

      const extension = path.extname(avatar.name).toLowerCase()
      const fileName = `avatar_${auth.user.userId}_${Date.now()}${extension}`
      const filePath = resolveRootUploadFile(fileName)
      const avatarPath = `/uploads/${fileName}`
      const avatarBuffer = Buffer.from(await avatar.arrayBuffer())

      await fs.writeFile(filePath, avatarBuffer)

      try {
        const old = await pool.query('SELECT avatar_url FROM users WHERE id = $1', [auth.user.userId])
        const oldFileName = extractUploadFileName(old.rows[0]?.avatar_url)
        if (oldFileName) {
          await deleteUploadFile(oldFileName)
        }
      } catch (_) {
        // Ignore old-avatar cleanup failures.
      }

      const result = await pool.query(
        'UPDATE users SET avatar_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING avatar_url',
        [avatarPath, auth.user.userId]
      )

      const savedAvatarPath = result.rows[0]?.avatar_url || avatarPath
      return NextResponse.json({ avatar_url: `${request.nextUrl.origin}${savedAvatarPath}` })
    } catch (error) {
      console.error(error)
      return NextResponse.json({ error: 'Failed to upload avatar' }, { status: 500 })
    }
  }

  return notFound()
}

export async function PUT(request, { params }) {
  await ensureMigrations()

  const parts = await routeParts(params)

  if (parts.length === 1 && parts[0] === 'profile') {
    const auth = authenticateRequest(request, { includeDetails: true })
    if (auth.response) return auth.response

    try {
      const { course, year_level, address, status } = await readJson(request)

      const result = await pool.query(
        'UPDATE users SET course = $1, year_level = $2, address = $3, status = COALESCE($4, status), updated_at = CURRENT_TIMESTAMP WHERE id = $5 RETURNING id, student_id, full_name, role, course, year_level, address, status, avatar_url',
        [course || null, year_level || null, address || null, status || null, auth.user.userId]
      )

      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }

      const updatedUser = result.rows[0]
      return NextResponse.json({
        message: 'Profile updated successfully',
        user: {
          ...updatedUser,
          avatar_url: normalizeAvatarUrl(updatedUser.avatar_url, request),
        },
      })
    } catch (error) {
      console.error(error)
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
    }
  }

  if (parts.length === 1 && parts[0] === 'status') {
    const auth = authenticateRequest(request, { includeDetails: true })
    if (auth.response) return auth.response

    try {
      const { status } = await readJson(request)
      if (!status) {
        return NextResponse.json({ error: 'Status is required' }, { status: 400 })
      }

      const allowedStatuses = ['active', 'away', 'busy', 'offline', 'do not disturb']
      if (!allowedStatuses.includes(String(status).toLowerCase())) {
        return NextResponse.json(
          { error: 'Invalid status value', allowed: allowedStatuses },
          { status: 400 }
        )
      }

      const result = await pool.query(
        'UPDATE users SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, student_id, full_name, status',
        [status, auth.user.userId]
      )

      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }

      return NextResponse.json({ message: 'Status updated successfully', user: result.rows[0] })
    } catch (error) {
      console.error(error)
      return NextResponse.json({ error: 'Failed to update status' }, { status: 500 })
    }
  }

  return notFound()
}

export async function DELETE(request, { params }) {
  await ensureMigrations()

  const parts = await routeParts(params)

  if (parts.length === 3 && parts[0] === 'admin' && parts[1] === 'announcements') {
    const auth = authenticateRequest(request, { includeDetails: true })
    if (auth.response) return auth.response

    const adminError = requireAdmin(auth.user)
    if (adminError) return adminError

    const announcementId = Number.parseInt(parts[2], 10)
    announcements = announcements.filter((announcement) => announcement.id !== announcementId)
    return NextResponse.json({ message: 'Deleted' })
  }

  if (parts.length === 3 && parts[0] === 'admin' && parts[1] === 'users') {
    const auth = authenticateRequest(request, { includeDetails: true })
    if (auth.response) return auth.response

    const adminError = requireAdmin(auth.user)
    if (adminError) return adminError

    try {
      const target = await pool.query('SELECT role FROM users WHERE id = $1', [parts[2]])
      if (target.rows.length === 0) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }

      if (target.rows[0].role === 'admin') {
        return NextResponse.json({ error: 'Cannot delete admin' }, { status: 403 })
      }

      await pool.query('DELETE FROM users WHERE id = $1', [parts[2]])
      return NextResponse.json({ message: 'User deleted' })
    } catch (error) {
      console.error(error)
      return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
    }
  }

  return notFound()
}