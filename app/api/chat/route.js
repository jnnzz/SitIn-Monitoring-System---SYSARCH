import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { authenticateRequest } from '@/lib/server/auth'
import { pool } from '@/lib/server/db'
import { ensureMigrations } from '@/lib/server/migrations'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SYSTEM_PROMPT = `You are CCSBot, a friendly and helpful AI assistant for the University of Cebu - College of Computer Studies (CCS) Sit-In Monitoring System.

Your role is to help students and admins understand and navigate the sit-in monitoring system. You should:
- Answer questions about lab rules, regulations, and policies
- Explain how the reservation system works
- Help with understanding sit-in session procedures
- Provide information about available labs and their software
- Explain reward points and how they work
- Be concise, friendly, and professional
- Use emoji occasionally to be approachable 😊
- If you don't know something specific to the system, say so honestly

Key system information:
- Students get 30 sit-in sessions per semester
- Labs: Lab 524, Lab 526, Lab 530, Lab 542, Lab 544 (40 PCs each)
- Time slots: 08:00-10:00, 10:00-12:00, 13:00-15:00, 15:00-17:00
- Reservations require admin approval
- Students can submit testimonials about their experience
- Students earn reward points for completed sit-in sessions

Lab Rules:
1. Maintain silence, proper decorum, and discipline inside the laboratory
2. Mobile phones and personal equipment must be switched off
3. Games are not allowed inside the lab
4. Surfing the internet is allowed only with instructor permission
5. Downloading and installing software are strictly prohibited
6. Students must present a valid ID to use the lab
7. Food and drinks are not allowed inside the laboratory
8. Report any hardware or software issues to the lab administrator
9. Log out and clean your workstation before leaving

You have access to live system data that will be provided in the context. Use it to give accurate, real-time answers.`

function truncateHistory(history, maxTurns = 8) {
  if (history.length <= maxTurns * 2) return history
  return history.slice(-(maxTurns * 2))
}

async function getSystemContext(userId, userRole) {
  const context = []

  try {
    // Get lab info
    const labsRes = await pool.query(
      `SELECT l.id, l.lab_name, l.total_computers, l.reservation_enabled,
              COALESCE(sw.softwares, '[]'::json) AS softwares
       FROM labs l
       LEFT JOIN LATERAL (
         SELECT COALESCE(
           JSON_AGG(JSON_BUILD_OBJECT('name', s.software_name) ORDER BY s.software_name),
           '[]'::json
         ) AS softwares
         FROM lab_software s WHERE s.lab_id = l.id
       ) sw ON TRUE
       ORDER BY l.lab_name`
    )
    if (labsRes.rows.length > 0) {
      context.push(`Available Labs:\n${labsRes.rows.map(l =>
        `- ${l.lab_name}: ${l.total_computers} PCs, Reservations ${l.reservation_enabled ? 'enabled' : 'disabled'}${
          Array.isArray(l.softwares) && l.softwares.length > 0
            ? `, Software: ${l.softwares.map(s => s.name).join(', ')}`
            : ''
        }`
      ).join('\n')}`)
    }

    // Get active sessions count per lab
    const activeRes = await pool.query(
      `SELECT lab_name, COUNT(*)::int AS active_count
       FROM active_sessions
       GROUP BY lab_name`
    )
    if (activeRes.rows.length > 0) {
      context.push(`Current Active Sit-In Sessions:\n${activeRes.rows.map(r =>
        `- ${r.lab_name}: ${r.active_count} student${r.active_count > 1 ? 's' : ''} currently using`
      ).join('\n')}`)
    } else {
      context.push('Current Active Sit-In Sessions: None at the moment')
    }

    // Get user-specific info
    if (userId && userRole !== 'admin') {
      const userRes = await pool.query(
        `SELECT full_name, remaining_sessions, reward_points FROM users WHERE id = $1`,
        [userId]
      )
      if (userRes.rows.length > 0) {
        const u = userRes.rows[0]
        context.push(`Your Info: ${u.full_name}, ${u.remaining_sessions} sessions remaining, ${u.reward_points || 0} reward points`)
      }

      // Student's recent reservations
      const resvRes = await pool.query(
        `SELECT l.lab_name, r.date, r.time_slot, r.status
         FROM reservations r
         LEFT JOIN labs l ON l.id = r.lab_id
         WHERE r.user_id = $1
         ORDER BY r.created_at DESC LIMIT 5`,
        [userId]
      )
      if (resvRes.rows.length > 0) {
        context.push(`Your Recent Reservations:\n${resvRes.rows.map(r =>
          `- ${r.lab_name} on ${r.date} (${r.time_slot}) — ${r.status}`
        ).join('\n')}`)
      }
    }

    // Admin-specific: summary stats
    if (userRole === 'admin') {
      const statsRes = await pool.query(
        `SELECT
           (SELECT COUNT(*) FROM users WHERE role = 'student')::int AS total_students,
           (SELECT COUNT(*) FROM active_sessions)::int AS active_sessions,
           (SELECT COUNT(*) FROM reservations WHERE status = 'pending')::int AS pending_reservations,
           (SELECT COUNT(*) FROM testimonials WHERE status = 'pending')::int AS pending_testimonials`
      )
      if (statsRes.rows.length > 0) {
        const s = statsRes.rows[0]
        context.push(`Admin Stats: ${s.total_students} students, ${s.active_sessions} active sessions, ${s.pending_reservations} pending reservations, ${s.pending_testimonials} pending testimonials`)
      }
    }
  } catch (e) {
    console.error('Failed to fetch system context:', e)
  }

  return context.length > 0 ? `\n\nLive System Data:\n${context.join('\n\n')}` : ''
}

export async function POST(request) {
  await ensureMigrations()

  const auth = authenticateRequest(request)
  if (auth.response) return auth.response

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    return NextResponse.json(
      { error: 'Gemini API key not configured. Please set GEMINI_API_KEY in .env.local' },
      { status: 503 }
    )
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { message, history = [] } = body
  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 })
  }
  if (message.length > 2000) {
    return NextResponse.json({ error: 'Message too long (max 2000 characters)' }, { status: 400 })
  }

  try {
    const systemContext = await getSystemContext(auth.user.userId, auth.user.role)

    const genAI = new GoogleGenerativeAI(apiKey)

    // Try multiple models in order of preference (fallback if rate-limited)
    const MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash']
    let lastError = null

    for (const modelName of MODELS) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          systemInstruction: SYSTEM_PROMPT + systemContext,
        })

        const chatHistory = truncateHistory(history).map((msg) => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }],
        }))

        const chat = model.startChat({ history: chatHistory })
        const result = await chat.sendMessage(message.trim())
        const reply = result.response.text()

        return NextResponse.json({
          reply,
          model: modelName,
          timestamp: new Date().toISOString(),
        })
      } catch (modelError) {
        const msg = modelError?.message || ''
        const status = modelError?.status || modelError?.httpStatusCode
        console.error(`Model ${modelName} failed (${status}):`, msg.substring(0, 150))
        lastError = modelError

        // Retry on rate limit or model not found errors
        if (status === 429 || status === 404 || msg.includes('quota') || msg.includes('Resource has been exhausted') || msg.includes('not found')) {
          await new Promise(resolve => setTimeout(resolve, 500))
          continue
        }
        // Non-retryable error — stop
        break
      }
    }

    // All models failed — return the last error
    const error = lastError
    const errMsg = error?.message || String(error)
    const errStatus = error?.status || error?.httpStatusCode
    console.error('All Gemini models failed:', errMsg.substring(0, 300))

    if (errMsg.includes('API_KEY_INVALID') || errMsg.includes('API key not valid')) {
      return NextResponse.json({ error: 'Invalid Gemini API key. Check your .env.local file.' }, { status: 503 })
    }
    if (errStatus === 429 || errMsg.includes('quota') || errMsg.includes('Resource has been exhausted')) {
      return NextResponse.json({
        error: 'AI rate limit reached on all models. The free tier resets every minute — please wait 60 seconds and try again.',
      }, { status: 429 })
    }
    if (errMsg.includes('SAFETY') || errMsg.includes('blocked') || errMsg.includes('RECITATION')) {
      return NextResponse.json({ error: 'The AI could not respond to that message. Please try rephrasing.' }, { status: 400 })
    }

    return NextResponse.json({ error: `AI error: ${errMsg.substring(0, 200)}` }, { status: 500 })
  } catch (error) {
    console.error('Unexpected chat error:', error)
    return NextResponse.json({ error: 'An unexpected error occurred. Please try again.' }, { status: 500 })
  }
}
