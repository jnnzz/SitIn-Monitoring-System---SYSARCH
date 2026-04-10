import jwt from 'jsonwebtoken'
import { NextResponse } from 'next/server'
import { loadServerEnv } from './env'

loadServerEnv()

export function authenticateRequest(request, options = {}) {
  const { includeDetails = false } = options
  const authHeader = request.headers.get('authorization') || ''
  const token = authHeader.split(' ')[1]

  if (!token) {
    return { response: NextResponse.json({ error: 'Access token required' }, { status: 401 }) }
  }

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET)
    return { user }
  } catch (error) {
    const payload = includeDetails
      ? { error: 'Invalid or expired token', details: error.message }
      : { error: 'Invalid or expired token' }

    return { response: NextResponse.json(payload, { status: 403 }) }
  }
}

export function requireAdmin(user) {
  if (user?.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  return null
}