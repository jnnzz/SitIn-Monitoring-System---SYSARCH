"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, Users, Bell, Settings, Trash2, Plus, X, BarChart3, TrendingUp, Shield, RefreshCw, RotateCcw, MonitorPlay, Search, Clock, CheckCircle2, Star, MessageSquare, CalendarDays, Trophy, FileSpreadsheet, FileText, LineChart, Monitor, Lock, Wrench } from 'lucide-react'
import Image from 'next/image'
import ccs from '../assets/ccslogo.png'
import { ToastStack } from '@/components/ui/toast-stack'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { TablePagination, paginateItems } from '@/components/ui/table-pagination'
import { useToasts } from '@/lib/use-toasts'
import { AIChatbot } from '@/components/ui/ai-chatbot'

const API = '/api/auth'
const TABLE_PAGE_SIZE = 10

// ── Tiny SVG bar chart (no deps) ────────────────────────────────────────────
function BarChart({ data, color = '#3b82f6' }) {
  const max = Math.max(...data.map(d => d.value), 1)
  const chartWidth = Math.max(300, data.length * 50 + 20) // Ensure a min width so bars don't stretch
  return (
    <svg viewBox={`0 0 ${chartWidth} 100`} className="w-full h-full" preserveAspectRatio="xMinYMax meet">
      {data.map((d, i) => {
        const barH = (d.value / max) * 75
        const x = i * 50 + 10
        const y = 85 - barH
        return (
          <g key={i}>
            <rect x={x} y={y} width={28} height={barH} rx={4} fill={color} fillOpacity="0.85" />
            <text x={x + 14} y={98} textAnchor="middle" fontSize="10" fill="var(--app-muted)">{d.label}</text>
            <text x={x + 14} y={y - 5} textAnchor="middle" fontSize="10" fontWeight="bold" fill="var(--app-fg)">{d.value}</text>
          </g>
        )
      })}
    </svg>
  )
}

// ── Tiny SVG donut chart ─────────────────────────────────────────────────────
function DonutChart({ segments }) {
  let cumulative = 0
  const total = segments.reduce((s, seg) => s + seg.value, 0)
  const R = 35, cx = 50, cy = 50, stroke = 12
  const circumference = 2 * Math.PI * R

  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      {segments.map((seg, i) => {
        const ratio = seg.value / total
        const dash = circumference * ratio
        const gap = circumference - dash
        const offset = circumference * (1 - cumulative)
        cumulative += ratio
        return (
          <circle key={i} cx={cx} cy={cy} r={R} fill="none"
            stroke={seg.color} strokeWidth={stroke}
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={offset}
            style={{ transition: 'all 0.6s ease', transformOrigin: 'center', transform: 'rotate(-90deg) scaleX(-1)', transformBox: 'fill-box' }}
          />
        )
      })}
      <circle cx={cx} cy={cy} r={R - stroke / 2 - 2} fill="rgba(0,0,0,0.3)" />
    </svg>
  )
}

function formatMinutesCompact(minutes) {
  const safe = Number.isFinite(minutes) ? Math.max(0, Math.round(minutes)) : 0
  if (safe >= 60) return `${Math.floor(safe / 60)}h ${safe % 60}m`
  return `${safe}m`
}

// Format a DATE string (YYYY-MM-DD or ISO) without timezone shift
function formatDateLocal(dateStr) {
  if (!dateStr) return '—'
  // Take only the first 10 chars (YYYY-MM-DD) to avoid UTC-to-local shift
  const iso = String(dateStr).slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return dateStr
  const [y, m, d] = iso.split('-')
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${months[parseInt(m, 10) - 1]} ${parseInt(d, 10)}, ${y}`
}

export default function AdminDashboard() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('dashboard')

  // Users
  const [users, setUsers] = useState([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [stats, setStats] = useState({ total_users: 0, new_today: 0 })

  // Announcements
  const [announcements, setAnnouncements] = useState([])
  const [newAnn, setNewAnn] = useState({ title: '', content: '', type: 'info' })
  const [postingAnn, setPostingAnn] = useState(false)
  const [showNewAnn, setShowNewAnn] = useState(false)

  // Settings
  const [editMode, setEditMode] = useState(false)
  const [editData, setEditData] = useState({ course: '', year_level: '', address: '' })
  const [saving, setSaving] = useState(false)
  const { toasts, pushToast, removeToast } = useToasts()

  // Sit-In Session Management
  const [sitinSearch, setSitinSearch] = useState('')
  const [sitinResults, setSitinResults] = useState([])
  const [activeSessions, setActiveSessions] = useState([])
  const [sitinRecords, setSitinRecords] = useState([])
  const [sitinView, setSitinView] = useState('records') // 'search' | 'active' | 'records'
  const [startingSession, setStartingSession] = useState(null)
  const [sessionForm, setSessionForm] = useState({ lab_name: 'Lab 524', purpose: 'Java' })
  const [endingSessionId, setEndingSessionId] = useState(null)
  const [endSessionPrompt, setEndSessionPrompt] = useState(null)
  const [endSessionFeedback, setEndSessionFeedback] = useState('')

  // Reservations
  const [reservations, setReservations] = useState([])
  const [reservationLogs, setReservationLogs] = useState([])
  const [labs, setLabs] = useState([])
  const [selectedLabId, setSelectedLabId] = useState('')
  const [manageLabComputers, setManageLabComputers] = useState([])
  const [labSoftwareInputs, setLabSoftwareInputs] = useState({})
  const [savingLabSoftware, setSavingLabSoftware] = useState(false)
  const [savingLabReservationToggle, setSavingLabReservationToggle] = useState(false)
  // Computer Availability date filter
  const getLocalDateString = (date = new Date()) => {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  const [adminAvailDate, setAdminAvailDate] = useState(getLocalDateString)
  // All Reservations date filter
  const [reservationDateFilter, setReservationDateFilter] = useState('')

  // Testimonials
  const [testimonials, setTestimonials] = useState([])

  // Analytics
  const [analyticsSummary, setAnalyticsSummary] = useState(null)
  const [analyticsSessions, setAnalyticsSessions] = useState([])
  const [analyticsLabs, setAnalyticsLabs] = useState([])
  const [analyticsReservations, setAnalyticsReservations] = useState(null)
  const [analyticsPeak, setAnalyticsPeak] = useState({ hours: [], days: [] })

  // Reports
  const [reportType, setReportType] = useState('sitin')
  const [reportFormat, setReportFormat] = useState('csv')
  const [reportFrom, setReportFrom] = useState('')
  const [reportTo, setReportTo] = useState('')
  const [reportStatus, setReportStatus] = useState('')
  const [reportHistory, setReportHistory] = useState([])
  const [reportLoading, setReportLoading] = useState(false)

  // Leaderboard
  const [rewardLeaderboard, setRewardLeaderboard] = useState([])
  const [tablePages, setTablePages] = useState({
    users: 1,
    sitinSearch: 1,
    sitinActive: 1,
    sitinRecords: 1,
    pendingReservations: 1,
    allReservations: 1,
    testimonials: 1,
    reports: 1,
  })

  const getToken = () => localStorage.getItem('token')

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true)
    try {
      const res = await fetch(`${API}/admin/users`, { headers: { Authorization: `Bearer ${getToken()}` } })
      if (res.ok) setUsers(await res.json())
    } catch (e) { console.error(e) }
    setUsersLoading(false)
  }, [])

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API}/admin/stats`, { headers: { Authorization: `Bearer ${getToken()}` } })
      if (res.ok) setStats(await res.json())
    } catch (e) { console.error(e) }
  }, [])

  const fetchAnnouncements = useCallback(async () => {
    try {
      const res = await fetch(`${API}/admin/announcements`, { headers: { Authorization: `Bearer ${getToken()}` } })
      if (res.ok) setAnnouncements(await res.json())
    } catch (e) { console.error(e) }
  }, [])

  const SITIN = '/api/sitin'

  const fetchActiveSessions = useCallback(async () => {
    try {
      const res = await fetch(`${SITIN}/sessions/active`, { headers: { Authorization: `Bearer ${getToken()}` } })
      if (res.ok) setActiveSessions(await res.json())
    } catch (e) { console.error(e) }
  }, [])

  const fetchRecords = useCallback(async () => {
    try {
      const res = await fetch(`${SITIN}/sessions/records`, { headers: { Authorization: `Bearer ${getToken()}` } })
      if (res.ok) setSitinRecords(await res.json())
    } catch (e) { console.error(e) }
  }, [])

  const fetchLabs = useCallback(async () => {
    try {
      const res = await fetch('/api/reservations/labs', { headers: { Authorization: `Bearer ${getToken()}` } })
      if (!res.ok) return
      const data = await res.json()
      setLabs(data)
      if (!selectedLabId && data.length > 0) {
        setSelectedLabId(String(data[0].id))
      }
    } catch (e) { console.error(e) }
  }, [selectedLabId])

  const fetchReservations = useCallback(async () => {
    try {
      const [allRes, logsRes] = await Promise.all([
        fetch('/api/reservations/all', { headers: { Authorization: `Bearer ${getToken()}` } }),
        fetch('/api/reservations/logs', { headers: { Authorization: `Bearer ${getToken()}` } }),
      ])
      if (allRes.ok) setReservations(await allRes.json())
      if (logsRes.ok) setReservationLogs(await logsRes.json())
    } catch (e) { console.error(e) }
  }, [])

  const fetchManageLab = useCallback(async (dateOverride) => {
    if (!selectedLabId) return
    try {
      const dateParam = dateOverride || adminAvailDate || getLocalDateString()
      const res = await fetch(`/api/reservations/lab/${selectedLabId}/manage?date=${encodeURIComponent(dateParam)}`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      })
      if (!res.ok) return
      const data = await res.json()
      setManageLabComputers(data.computers || [])
    } catch (e) { console.error(e) }
  }, [selectedLabId, adminAvailDate])

  const fetchTestimonials = useCallback(async () => {
    try {
      const res = await fetch('/api/testimonials/all', { headers: { Authorization: `Bearer ${getToken()}` } })
      if (res.ok) setTestimonials(await res.json())
    } catch (e) { console.error(e) }
  }, [])

  const fetchAnalytics = useCallback(async () => {
    try {
      const [summaryRes, sessionsRes, labsRes, reservationsRes, peakRes] = await Promise.all([
        fetch('/api/analytics/summary', { headers: { Authorization: `Bearer ${getToken()}` } }),
        fetch('/api/analytics/sessions', { headers: { Authorization: `Bearer ${getToken()}` } }),
        fetch('/api/analytics/labs', { headers: { Authorization: `Bearer ${getToken()}` } }),
        fetch('/api/analytics/reservations', { headers: { Authorization: `Bearer ${getToken()}` } }),
        fetch('/api/analytics/peak-hours', { headers: { Authorization: `Bearer ${getToken()}` } }),
      ])
      if (summaryRes.ok) setAnalyticsSummary(await summaryRes.json())
      if (sessionsRes.ok) setAnalyticsSessions(await sessionsRes.json())
      if (labsRes.ok) setAnalyticsLabs(await labsRes.json())
      if (reservationsRes.ok) setAnalyticsReservations(await reservationsRes.json())
      if (peakRes.ok) setAnalyticsPeak(await peakRes.json())
    } catch (e) { console.error(e) }
  }, [])

  const fetchReportsHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/reports/history', { headers: { Authorization: `Bearer ${getToken()}` } })
      if (res.ok) setReportHistory(await res.json())
    } catch (e) { console.error(e) }
  }, [])

  const fetchRewardsAdmin = useCallback(async () => {
    try {
      const res = await fetch('/api/rewards/leaderboard?limit=20', { headers: { Authorization: `Bearer ${getToken()}` } })
      if (res.ok) setRewardLeaderboard(await res.json())
    } catch (e) { console.error(e) }
  }, [])

  const handleSitinSearch = async (q) => {
    setSitinSearch(q)
    if (!q || q.trim().length < 1) { setSitinResults([]); return }
    try {
      const res = await fetch(`${SITIN}/students/search?q=${encodeURIComponent(q)}`, { headers: { Authorization: `Bearer ${getToken()}` } })
      if (res.ok) setSitinResults(await res.json())
    } catch (e) { console.error(e) }
  }

  const handleStartSession = async (student) => {
    setStartingSession(student)
  }

  const handleConfirmStart = async () => {
    if (!startingSession) return
    try {
      const res = await fetch(`${SITIN}/sessions/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ user_id: startingSession.id, ...sessionForm })
      })
      if (res.ok) {
        setStartingSession(null)
        setSitinSearch('')
        setSitinResults([])
        await fetchActiveSessions()
        setSitinView('active')
        pushToast({
          type: 'success',
          title: 'Sit-in session started',
          description: `${startingSession.full_name} is now active.`,
        })
      } else {
        const err = await res.json()
        pushToast({
          type: 'error',
          title: err.error || 'Failed to start session',
        })
      }
    } catch (e) {
      pushToast({
        type: 'error',
        title: 'Connection error',
      })
    }
  }

  const handleConfirmEndSession = async () => {
    if (!endSessionPrompt) return
    const sessionId = endSessionPrompt.id
    setEndingSessionId(sessionId)
    try {
      const res = await fetch(`${SITIN}/sessions/end/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ feedback: endSessionFeedback })
      })
      if (res.ok) {
        const data = await res.json().catch(() => null)
        await fetchActiveSessions()
        await fetchRecords()
        pushToast({
          type: 'success',
          title: 'Session ended successfully',
          description: data?.duration_minutes ? `Duration: ${data.duration_minutes} minutes.` : '',
        })
        setEndSessionPrompt(null)
        setEndSessionFeedback('')
      } else {
        const data = await res.json().catch(() => null)
        pushToast({
          type: 'error',
          title: data?.error || 'Failed to end session',
        })
      }
    } catch (e) {
      console.error(e)
      pushToast({
        type: 'error',
        title: 'Connection error',
      })
    }
    setEndingSessionId(null)
  }

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')
    if (!token || !userData) { router.push('/'); return }
    const parsedUser = JSON.parse(userData)
    if (parsedUser.role !== 'admin') { router.push('/dashboard'); return }
    setUser(parsedUser)
    setEditData({ course: parsedUser?.course || '', year_level: parsedUser?.year_level || '', address: parsedUser?.address || '' })
    setLoading(false)
    fetchUsers()
    fetchStats()
    fetchAnnouncements()
    fetchActiveSessions()
    fetchRecords()
    fetchLabs()
  }, [router, fetchUsers, fetchStats, fetchAnnouncements, fetchActiveSessions, fetchRecords, fetchLabs])

  useEffect(() => {
    if (activeTab === 'reservation') {
      fetchReservations()
      fetchLabs()
    }
    if (activeTab === 'software') {
      fetchLabs()
    }
    if (activeTab === 'testimonials') {
      fetchTestimonials()
    }
    if (activeTab === 'analytics') {
      fetchAnalytics()
    }
    if (activeTab === 'reports') {
      fetchReportsHistory()
    }
    if (activeTab === 'rewards') {
      fetchRewardsAdmin()
    }
  }, [activeTab, fetchReservations, fetchLabs, fetchTestimonials, fetchAnalytics, fetchReportsHistory, fetchRewardsAdmin])

  useEffect(() => {
    if (activeTab === 'reservation') {
      fetchManageLab()
    }
  }, [activeTab, selectedLabId, fetchManageLab])

  const handleDeleteUser = async (id) => {
    if (!confirm('Delete this user? This cannot be undone.')) return
    try {
      const res = await fetch(`${API}/admin/users/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${getToken()}` } })
      if (res.ok) {
        setUsers(prev => prev.filter(u => u.id !== id))
        fetchStats()
        pushToast({
          type: 'success',
          title: 'User deleted',
        })
      } else {
        const data = await res.json().catch(() => null)
        pushToast({
          type: 'error',
          title: data?.error || 'Failed to delete user',
        })
      }
    } catch (e) {
      console.error(e)
      pushToast({
        type: 'error',
        title: 'Connection error',
      })
    }
  }

  const handleResetSessions = async () => {
    if (!confirm('Reset ALL students back to 30 sessions? This will affect every student.')) return
    try {
      const res = await fetch(`${API}/admin/reset-sessions`, { method: 'PUT', headers: { Authorization: `Bearer ${getToken()}` } })
      const data = await res.json().catch(() => null)
      if (res.ok) {
        setUsers(prev => prev.map(u => ({ ...u, remaining_sessions: 30 })))
        pushToast({ type: 'success', title: data?.message || 'All sessions reset to 30' })
      } else {
        pushToast({ type: 'error', title: data?.error || 'Failed to reset sessions' })
      }
    } catch (e) {
      console.error(e)
      pushToast({ type: 'error', title: 'Connection error' })
    }
  }

  const handlePostAnnouncement = async () => {
    if (!newAnn.title || !newAnn.content) {
      pushToast({
        type: 'warning',
        title: 'Announcement title and content are required',
      })
      return
    }

    setPostingAnn(true)
    try {
      const res = await fetch(`${API}/admin/announcements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(newAnn)
      })
      if (res.ok) {
        const created = await res.json()
        setAnnouncements(prev => [created, ...prev])
        setNewAnn({ title: '', content: '', type: 'info' })
        setShowNewAnn(false)
        pushToast({
          type: 'success',
          title: 'Announcement posted',
        })
      } else {
        const data = await res.json().catch(() => null)
        pushToast({
          type: 'error',
          title: data?.error || 'Failed to post announcement',
        })
      }
    } catch (e) {
      console.error(e)
      pushToast({
        type: 'error',
        title: 'Connection error',
      })
    }
    setPostingAnn(false)
  }

  const handleDeleteAnn = async (id) => {
    try {
      const res = await fetch(`${API}/admin/announcements/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${getToken()}` } })
      if (res.ok) {
        setAnnouncements(prev => prev.filter(a => a.id !== id))
        pushToast({
          type: 'success',
          title: 'Announcement deleted',
        })
      } else {
        const data = await res.json().catch(() => null)
        pushToast({
          type: 'error',
          title: data?.error || 'Failed to delete announcement',
        })
      }
    } catch (e) {
      console.error(e)
      pushToast({
        type: 'error',
        title: 'Connection error',
      })
    }
  }

  const handleSaveProfile = async () => {
    setSaving(true)
    try {
      const res = await fetch(`${API}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(editData)
      })
      if (res.ok) {
        const data = await res.json().catch(() => null)
        const updatedUser = { ...user, ...(data?.user || editData) }
        setUser(updatedUser)
        localStorage.setItem('user', JSON.stringify(updatedUser))
        setEditMode(false)
        pushToast({
          type: 'success',
          title: 'Profile updated',
        })
      } else {
        const data = await res.json().catch(() => null)
        pushToast({
          type: 'error',
          title: data?.error || 'Failed to update profile',
        })
      }
    } catch (e) {
      console.error(e)
      pushToast({
        type: 'error',
        title: 'Connection error',
      })
    }
    setSaving(false)
  }

  const handleReservationDecision = async (reservationId, action) => {
    const notes = action === 'decline' ? prompt('Decline note (optional):', '') || '' : ''
    try {
      const res = await fetch(`/api/reservations/${reservationId}/${action}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ admin_notes: notes || null })
      })
      const data = await res.json().catch(() => null)
      if (res.ok) {
        pushToast({ type: 'success', title: `Reservation ${action}d` })
        fetchReservations()
        fetchManageLab()
      } else {
        pushToast({ type: 'error', title: data?.error || `Failed to ${action} reservation` })
      }
    } catch (e) {
      pushToast({ type: 'error', title: 'Connection error' })
    }
  }

  const handleComputerStatus = async (computerId, status) => {
    try {
      const res = await fetch(`/api/reservations/computer/${computerId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ status })
      })
      const data = await res.json().catch(() => null)
      if (res.ok) {
        fetchManageLab()
      } else {
        pushToast({ type: 'error', title: data?.error || 'Failed to update computer status' })
      }
    } catch (e) {
      pushToast({ type: 'error', title: 'Connection error' })
    }
  }

  const handleLabReservationToggle = async (enabled) => {
    if (!selectedLabId) {
      pushToast({ type: 'warning', title: 'Please select a lab first' })
      return
    }
    const labName = labs.find((lab) => String(lab.id) === String(selectedLabId))?.lab_name

    setSavingLabReservationToggle(true)
    try {
      const res = await fetch(`/api/reservations/lab/${selectedLabId}/reservation-toggle`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ enabled })
      })
      const data = await res.json().catch(() => null)
      if (res.ok) {
        await fetchLabs()
        pushToast({
          type: 'success',
          title: enabled ? 'Lab reservations enabled' : 'Lab reservations disabled',
          description: labName || undefined,
        })
      } else {
        pushToast({ type: 'error', title: data?.error || 'Failed to update reservation setting' })
      }
    } catch (e) {
      pushToast({ type: 'error', title: 'Connection error' })
    }
    setSavingLabReservationToggle(false)
  }

  const handleAddLabSoftware = async (labId, providedName) => {
    const targetLabId = String(labId || selectedLabId || '')
    const softwareName = String(providedName ?? labSoftwareInputs[targetLabId] ?? '').trim()

    if (!targetLabId) {
      pushToast({ type: 'warning', title: 'Missing laboratory reference' })
      return
    }
    if (!softwareName) {
      pushToast({ type: 'warning', title: 'Software name is required' })
      return
    }

    setSavingLabSoftware(true)
    try {
      const res = await fetch(`/api/reservations/lab/${targetLabId}/software`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ software_name: softwareName })
      })
      const data = await res.json().catch(() => null)
      if (res.ok) {
        setLabSoftwareInputs((prev) => ({ ...prev, [targetLabId]: '' }))
        await fetchLabs()
        pushToast({ type: 'success', title: 'Software added to lab' })
      } else {
        pushToast({ type: 'error', title: data?.error || 'Failed to add software' })
      }
    } catch (e) {
      pushToast({ type: 'error', title: 'Connection error' })
    }
    setSavingLabSoftware(false)
  }

  const handleRemoveLabSoftware = async (softwareId, labId) => {
    const targetLabId = String(labId || selectedLabId || '')
    if (!targetLabId) return
    setSavingLabSoftware(true)
    try {
      const res = await fetch(`/api/reservations/lab/${targetLabId}/software/${softwareId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` }
      })
      const data = await res.json().catch(() => null)
      if (res.ok) {
        await fetchLabs()
        pushToast({ type: 'success', title: 'Software removed from lab' })
      } else {
        pushToast({ type: 'error', title: data?.error || 'Failed to remove software' })
      }
    } catch (e) {
      pushToast({ type: 'error', title: 'Connection error' })
    }
    setSavingLabSoftware(false)
  }

  const handleDeleteTestimonial = async (id) => {
    try {
      const res = await fetch(`/api/testimonials/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` }
      })
      const data = await res.json().catch(() => null)
      if (res.ok) {
        fetchTestimonials()
      } else {
        pushToast({ type: 'error', title: data?.error || 'Failed to delete testimonial' })
      }
    } catch (e) {
      pushToast({ type: 'error', title: 'Connection error' })
    }
  }

  const handleGenerateReport = async () => {
    setReportLoading(true)
    const filters = {
      from: reportFrom || undefined,
      to: reportTo || undefined,
      status: reportStatus || undefined,
    }
    try {
      const res = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ type: reportType, format: reportFormat, filters, store: true })
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        pushToast({ type: 'error', title: data?.error || 'Failed to generate report' })
        setReportLoading(false)
        return
      }
      const blob = await res.blob()
      const fileName = `${reportType}-${new Date().getTime()}.${reportFormat === 'pdf' ? 'pdf' : 'csv'}`
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      fetchReportsHistory()
      pushToast({ type: 'success', title: 'Report generated' })
    } catch (e) {
      pushToast({ type: 'error', title: 'Connection error' })
    }
    setReportLoading(false)
  }

  const handleDownloadHistoryReport = async (id, format) => {
    try {
      const res = await fetch(`/api/reports/${id}/download`, { headers: { Authorization: `Bearer ${getToken()}` } })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        pushToast({ type: 'error', title: data?.error || 'Failed to download report' })
        return
      }
      const blob = await res.blob()
      const fileName = `report-${id}.${format === 'pdf' ? 'pdf' : 'csv'}`
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      pushToast({ type: 'error', title: 'Connection error' })
    }
  }

  // (reward adjust removed — leaderboard is now session-hours based)

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/')
  }

  const setTablePage = useCallback((tableKey, nextPage) => {
    setTablePages((prev) => ({ ...prev, [tableKey]: nextPage }))
  }, [])

  const filteredUsers = users.filter(u =>
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.student_id?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  )
  const pendingReservations = reservations.filter((r) => r.status === 'pending')
  const filteredReservations = reservationDateFilter
    ? reservations.filter((r) => String(r.date).slice(0, 10) === reservationDateFilter)
    : reservations
  const usersPage = paginateItems(filteredUsers, tablePages.users, TABLE_PAGE_SIZE)
  const sitinSearchPage = paginateItems(sitinResults, tablePages.sitinSearch, TABLE_PAGE_SIZE)
  const sitinActivePage = paginateItems(activeSessions, tablePages.sitinActive, TABLE_PAGE_SIZE)
  const sitinRecordsPage = paginateItems(sitinRecords, tablePages.sitinRecords, TABLE_PAGE_SIZE)
  const pendingReservationsPage = paginateItems(pendingReservations, tablePages.pendingReservations, TABLE_PAGE_SIZE)
  const allReservationsPage = paginateItems(filteredReservations, tablePages.allReservations, TABLE_PAGE_SIZE)
  const testimonialsPage = paginateItems(testimonials, tablePages.testimonials, TABLE_PAGE_SIZE)
  const reportsPage = paginateItems(reportHistory, tablePages.reports, TABLE_PAGE_SIZE)
  const selectedLab = labs.find((lab) => String(lab.id) === String(selectedLabId))
  const sitinTotalMinutes = sitinRecords.reduce((sum, row) => sum + (row.duration_minutes || 0), 0)
  const sitinUniqueStudents = new Set(sitinRecords.map((row) => row.student_id)).size
  const sitinRatedSessions = sitinRecords.filter((row) => Number(row.rating) > 0)
  const sitinAverageRating = sitinRatedSessions.length
    ? (sitinRatedSessions.reduce((sum, row) => sum + Number(row.rating || 0), 0) / sitinRatedSessions.length).toFixed(1)
    : '—'
  const reservationStatusCounts = reservations.reduce((acc, row) => {
    const key = String(row.status || 'unknown').toLowerCase()
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})
  const getReservationStatusBadgeClass = (status) => {
    const key = String(status || '').toLowerCase()
    if (key === 'pending') return 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
    if (key === 'approved') return 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
    if (key === 'reserved') return 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
    if (key === 'declined') return 'bg-red-500/20 text-red-300 border border-red-500/40'
    if (key === 'cancelled') return 'bg-gray-500/20 text-gray-300 border border-gray-500/40'
    if (key === 'completed') return 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
    return 'bg-zinc-500/20 text-zinc-300 border border-zinc-500/40'
  }
  const totalSoftwareEntries = labs.reduce((sum, lab) => {
    const items = Array.isArray(lab.softwares) ? lab.softwares.length : 0
    return sum + items
  }, 0)
  const labsWithSoftware = labs.filter((lab) => Array.isArray(lab.softwares) && lab.softwares.length > 0).length
  const largestSoftwareCount = labs.reduce((max, lab) => {
    const count = Array.isArray(lab.softwares) ? lab.softwares.length : 0
    return Math.max(max, count)
  }, 0)
  const labsNeedingSoftware = Math.max(0, labs.length - labsWithSoftware)
  const reportCsvCount = reportHistory.filter((item) => String(item.format).toLowerCase() === 'csv').length
  const reportPdfCount = reportHistory.filter((item) => String(item.format).toLowerCase() === 'pdf').length
  const latestReportDate = reportHistory.length > 0
    ? new Date(reportHistory[0].created_at).toLocaleString()
    : 'No reports yet'

  const courseBreakdown = users.reduce((acc, u) => {
    if (!u.course) return acc
    acc[u.course] = (acc[u.course] || 0) + 1
    return acc
  }, {})

  const chartData = Object.entries(courseBreakdown).map(([label, value]) => ({ label, value }))
  if (chartData.length === 0) chartData.push({ label: 'No Data', value: 1 })

  const bsitCount = courseBreakdown['BSIT'] || 0
  const bscsCount = courseBreakdown['BSCS'] || 0
  const otherCount = users.length - bsitCount - bscsCount

  if (loading) {
    return (
      <div className="app-theme-shell w-full min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse w-16 h-16 rounded-full mx-auto mb-6" style={{ backgroundColor: 'var(--app-accent)', boxShadow: '0 0 30px var(--app-accent-soft)' }}></div>
          <div className="text-2xl font-bold mb-2" style={{ color: 'var(--app-accent)' }}>Loading Admin Console...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="app-theme-shell w-full min-h-screen text-white" style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        body, html { background-color: var(--app-bg); margin: 0; padding: 0; overflow-x: hidden; }

        .bento-card {
          background: var(--app-surface);
          backdrop-filter: blur(12px);
          border: 1px solid var(--app-border);
          border-radius: 20px;
          padding: 24px;
          transition: all 0.3s cubic-bezier(0.4,0,0.2,1);
          box-shadow: var(--app-shadow);
        }
        .bento-card:hover { border-color: var(--app-accent); }

        .glass-nav {
          background: var(--app-nav-bg);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid var(--app-border);
        }

        .tab-btn { transition: all 0.2s; position: relative; }
        .tab-btn.active { color: var(--app-fg); }
        .tab-btn.active::after {
          content: '';
          position: absolute;
          bottom: 0; left: 0;
          width: 100%; height: 2px;
          background: var(--app-accent);
          border-radius: 2px 2px 0 0;
        }
        .tab-btn:hover:not(.active) { color: var(--app-muted); }

        .user-row { transition: background 0.15s; }
        .user-row:hover { background: rgba(255,255,255,0.03); }

        .admin-modern-shell { display: flex; flex-direction: column; gap: 1.25rem; }
        .admin-modern-hero {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
          flex-wrap: wrap;
        }
        .admin-modern-title {
          font-size: clamp(1.5rem, 2.2vw, 2rem);
          font-weight: 800;
          letter-spacing: -0.02em;
          color: var(--app-fg);
        }
        .admin-modern-subtitle {
          margin-top: 0.3rem;
          font-size: 0.83rem;
          color: var(--app-muted);
        }
        .admin-modern-refresh {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0.55rem 0.95rem;
          border-radius: 999px;
          font-size: 0.72rem;
          font-weight: 700;
          border: 1px solid var(--app-border);
          background: color-mix(in srgb, var(--app-surface) 84%, #0f2869 16%);
          color: var(--app-fg);
          transition: 0.2s ease;
        }
        .admin-modern-refresh:hover { border-color: var(--app-accent); box-shadow: 0 10px 20px var(--app-accent-soft); }
        .admin-modern-stat-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
          gap: 0.9rem;
        }
        .admin-modern-stat-card {
          position: relative;
          overflow: hidden;
          border-radius: 20px;
          border: 1px solid var(--app-border);
          background: linear-gradient(145deg, color-mix(in srgb, var(--app-surface) 82%, #0a1f5f 18%), var(--app-surface));
          padding: 1rem;
          box-shadow: var(--app-shadow);
        }
        .admin-modern-stat-card::after {
          content: '';
          position: absolute;
          right: -16px;
          top: -18px;
          width: 74px;
          height: 74px;
          border-radius: 999px;
          border: 1px solid color-mix(in srgb, var(--app-border) 40%, var(--app-accent) 60%);
          opacity: 0.45;
        }
        .admin-modern-stat-icon {
          width: 2.3rem;
          height: 2.3rem;
          border-radius: 0.85rem;
          border: 1px solid color-mix(in srgb, var(--app-accent) 45%, var(--app-border) 55%);
          background: color-mix(in srgb, var(--app-accent-soft) 55%, transparent 45%);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: var(--app-accent);
          margin-bottom: 0.75rem;
        }
        .admin-modern-stat-value { font-size: clamp(1.35rem, 1.8vw, 2rem); font-weight: 800; line-height: 1.1; color: var(--app-fg); }
        .admin-modern-stat-label {
          margin-top: 0.4rem;
          color: var(--app-muted);
          font-size: 0.68rem;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          font-weight: 700;
        }
        .admin-modern-subtabs {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
          border: 1px solid var(--app-border);
          background: color-mix(in srgb, var(--app-surface) 88%, #0f235f 12%);
          border-radius: 14px;
          padding: 0.35rem;
          width: fit-content;
        }
        .admin-modern-table {
          border-radius: 22px;
          border: 1px solid var(--app-border);
          background: color-mix(in srgb, var(--app-surface) 90%, #0f214e 10%);
          box-shadow: var(--app-shadow);
          overflow: hidden;
        }
        .admin-modern-table-head {
          padding: 1rem 1.3rem;
          border-bottom: 1px solid var(--app-border);
          font-weight: 700;
          color: var(--app-fg);
          background: color-mix(in srgb, var(--app-surface) 84%, #122d72 16%);
        }

        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
      `}</style>

      {/* NAV */}
      <nav className="glass-nav sticky top-0 z-50 flex items-center justify-between px-8 py-4 lg:px-12">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center bg-transparent">
            <Image src={ccs} alt="CCS Logo" width={40} height={40} className="object-contain" />
          </div>
          <div>
            <div className="font-bold text-lg tracking-tight">SitIn Monitor</div>
            <div className="text-xs text-red-400 font-semibold tracking-widest uppercase">Admin Console</div>
          </div>
        </div>

        <div className="flex items-center gap-5">
          <ThemeToggle label={false} className="inline-flex" />
          <div className="hidden sm:flex items-center gap-3 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)] py-1.5 px-3 rounded-full">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-red-500 to-orange-500 flex items-center justify-center text-sm font-bold">
              {user?.full_name?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div className="pr-2">
              <div className="text-sm font-semibold leading-tight flex items-center gap-2">
                {user?.full_name || 'Admin'}
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-500/20 text-red-400 border border-red-500/30 uppercase tracking-widest">ADMIN</span>
              </div>
              <div className="text-[10px] text-gray-400">{user?.email || user?.student_id}</div>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.05)] transition-all">
            <LogOut size={16} className="text-gray-300" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </nav>

      {/* CONTENT */}
      <div className="px-6 lg:px-12 py-8 max-w-[1800px] mx-auto">

        {/* TABS */}
        <div className="flex gap-8 mb-8 border-b border-[rgba(255,255,255,0.05)]">
          {[
                       { key: 'dashboard', label: 'Dashboard', icon: <BarChart3 size={16} /> },
            { key: 'users', label: 'Manage Users', icon: <Users size={16} /> },
            { key: 'sitin', label: 'Sit-In Sessions', icon: <MonitorPlay size={16} /> },
            { key: 'announcements', label: 'Announcements', icon: <Bell size={16} /> },
            { key: 'reservation', label: 'Reservations', icon: <CalendarDays size={16} /> },
            { key: 'software', label: 'Lab Software', icon: <FileText size={16} /> },
            { key: 'testimonials', label: 'Testimonials', icon: <MessageSquare size={16} /> },
            { key: 'analytics', label: 'Analytics', icon: <LineChart size={16} /> },
            { key: 'reports', label: 'Reports', icon: <FileSpreadsheet size={16} /> },
            { key: 'rewards', label: 'Leaderboard', icon: <Trophy size={16} /> },
            { key: 'settings', label: 'Settings', icon: <Settings size={16} /> },
          ].map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`tab-btn text-sm font-semibold pb-4 flex items-center gap-2 ${activeTab === t.key ? 'active' : 'text-gray-500'}`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ── DASHBOARD TAB ── */}
        {activeTab === 'dashboard' && (
          <div className="flex flex-col gap-6 lg:gap-8">

            {/* Stats Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
              {[
                { label: 'Total Students', value: stats.total_users, icon: <Users className="text-blue-400" size={22} />, color: 'from-blue-900/40 to-blue-800/10' },
                { label: 'Registered Today', value: stats.new_today, icon: <TrendingUp className="text-emerald-400" size={22} />, color: 'from-emerald-900/40 to-emerald-800/10' },
                { label: 'Announcements', value: announcements.length, icon: <Bell className="text-amber-400" size={22} />, color: 'from-amber-900/40 to-amber-800/10' },
                { label: 'Admin Accounts', value: 1, icon: <Shield className="text-red-400" size={22} />, color: 'from-red-900/40 to-red-800/10' },
              ].map((s, i) => (
                <div key={i} className={`bento-card bg-gradient-to-br ${s.color} border-[rgba(255,255,255,0.03)] relative overflow-hidden`}>
                  <div className="absolute -right-4 -top-4 opacity-5">{React.cloneElement(s.icon, { size: 80 })}</div>
                  <div className="p-2 bg-black/20 rounded-xl w-fit mb-4">{s.icon}</div>
                  <div className="text-3xl font-black mb-1 tracking-tight">{s.value}</div>
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-widest">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Chart Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">

              {/* Bar Chart */}
              <div className="bento-card lg:col-span-2 flex flex-col">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-[rgba(255,255,255,0.05)]">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400"><BarChart3 size={20} /></div>
                    <div>
                      <h2 className="text-lg font-bold">Course Distribution</h2>
                      <p className="text-xs text-gray-500">Registered students per course</p>
                    </div>
                  </div>
                  <button onClick={fetchUsers} className="p-2 rounded-lg hover:bg-[rgba(255,255,255,0.05)] text-gray-500 hover:text-white transition">
                    <RefreshCw size={16} />
                  </button>
                </div>
                <div className="flex-1 h-48 lg:h-56">
                  {chartData.length > 0 && <BarChart data={chartData} color="#818cf8" />}
                </div>
                <div className="flex gap-4 mt-4 pt-4 border-t border-[rgba(255,255,255,0.05)] flex-wrap">
                  {chartData.map((d, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-indigo-400"></div>
                      <span className="text-xs text-gray-400">{d.label}: <span className="text-white font-bold">{d.value}</span></span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Donut Chart */}
              <div className="bento-card flex flex-col">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[rgba(255,255,255,0.05)]">
                  <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400"><TrendingUp size={20} /></div>
                  <div>
                    <h2 className="text-lg font-bold">Student Split</h2>
                    <p className="text-xs text-gray-500">By course enrollment</p>
                  </div>
                </div>
                <div className="w-32 h-32 mx-auto my-4">
                  <DonutChart segments={[
                    { value: bsitCount || 1, color: '#818cf8' },
                    { value: bscsCount || 1, color: '#f472b6' },
                    { value: otherCount || 1, color: '#fb923c' },
                  ]} />
                </div>
                <div className="space-y-2 mt-auto">
                  {[
                    { label: 'BSIT', count: bsitCount, color: 'bg-indigo-400' },
                    { label: 'BSCS', count: bscsCount, color: 'bg-pink-400' },
                    { label: 'Other', count: otherCount, color: 'bg-orange-400' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${item.color}`}></div>
                        <span className="text-gray-400">{item.label}</span>
                      </div>
                      <span className="font-bold">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent Users & Announcements Preview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
              {/* Recent Registrations */}
              <div className="bento-card flex flex-col">
                <div className="flex items-center justify-between mb-5 pb-4 border-b border-[rgba(255,255,255,0.05)]">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400"><Users size={20} /></div>
                    <h2 className="text-lg font-bold">Recent Registrations</h2>
                  </div>
                  <button onClick={() => setActiveTab('users')} className="text-xs text-gray-500 hover:text-white transition">View All →</button>
                </div>
                <div className="space-y-3 overflow-y-auto max-h-[280px]">
                  {users.slice(0, 5).map(u => (
                    <div key={u.id} className="flex items-center gap-3 p-3 rounded-xl bg-black/20">
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt="Avatar" className="w-9 h-9 rounded-full object-cover shrink-0 border border-[rgba(255,255,255,0.1)]" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-sm font-bold shrink-0">
                          {u.full_name?.charAt(0).toUpperCase() || '?'}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm truncate">{u.full_name}</div>
                        <div className="text-xs text-gray-500 truncate">{u.student_id} · {u.course || 'No Course'}</div>
                      </div>
                      <div className="text-[10px] text-gray-600 shrink-0">{new Date(u.created_at).toLocaleDateString()}</div>
                    </div>
                  ))}
                  {users.length === 0 && <div className="text-center text-gray-600 py-6 text-sm">No students registered yet</div>}
                </div>
              </div>

              {/* Announcements Preview */}
              <div className="bento-card flex flex-col">
                <div className="flex items-center justify-between mb-5 pb-4 border-b border-[rgba(255,255,255,0.05)]">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400"><Bell size={20} /></div>
                    <h2 className="text-lg font-bold">Recent Announcements</h2>
                  </div>
                  <button onClick={() => setActiveTab('announcements')} className="text-xs text-gray-500 hover:text-white transition">Manage →</button>
                </div>
                <div className="space-y-3 overflow-y-auto max-h-[280px]">
                  {announcements.slice(0, 3).map(a => (
                    <div key={a.id} className="p-3 rounded-xl bg-black/20 border-l-2 border-amber-500/40">
                      <div className="font-semibold text-sm mb-1">{a.title}</div>
                      <div className="text-xs text-gray-500 line-clamp-2">{a.content}</div>
                      <div className="text-[10px] text-gray-600 mt-1">{a.date}</div>
                    </div>
                  ))}
                  {announcements.length === 0 && <div className="text-center text-gray-600 py-6 text-sm">No announcements</div>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── USERS TAB ── */}
        {activeTab === 'users' && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold">User Management</h2>
                <p className="text-sm text-gray-400">{users.length} registered students</p>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <input
                  type="text" placeholder="Search by name, ID, or email..."
                  value={search} onChange={e => setSearch(e.target.value)}
                  className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-500/50 transition w-full sm:w-72"
                />
                <button onClick={handleResetSessions} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 text-sm font-semibold transition shrink-0" title="Reset all students to 30 sessions">
                  <RotateCcw size={14} /> Reset Sessions
                </button>
                <button onClick={fetchUsers} className="p-2.5 rounded-xl bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.05)] transition shrink-0">
                  <RefreshCw size={16} className={usersLoading ? 'animate-spin text-red-400' : 'text-gray-400'} />
                </button>
              </div>
            </div>

            <div className="bento-card p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[rgba(255,255,255,0.05)]">
                      {['Student', 'Student ID', 'Email', 'Course', 'Year', 'Sessions', 'Joined', 'Action'].map(h => (
                        <th key={h} className="text-left text-xs font-bold text-gray-500 uppercase tracking-wider px-6 py-4">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {usersPage.totalItems === 0 ? (
                      <tr><td colSpan={8} className="text-center text-gray-600 py-12 text-sm">No users found</td></tr>
                    ) : usersPage.items.map(u => (
                      <tr key={u.id} className="user-row border-b border-[rgba(255,255,255,0.03)]">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {u.avatar_url ? (
                              <img src={u.avatar_url} alt="Avatar" className="w-9 h-9 rounded-full object-cover shrink-0 border border-[rgba(255,255,255,0.1)]" />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-sm font-bold shrink-0">
                                {u.full_name?.charAt(0).toUpperCase() || '?'}
                              </div>
                            )}
                            <div className="font-semibold text-sm">{u.full_name}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-purple-400 font-mono">{u.student_id}</td>
                        <td className="px-6 py-4 text-sm text-gray-400">{u.email || <span className="italic text-gray-600">—</span>}</td>
                        <td className="px-6 py-4"><span className="text-xs px-2 py-1 bg-indigo-500/10 text-indigo-400 rounded-lg font-semibold">{u.course || '—'}</span></td>
                        <td className="px-6 py-4 text-sm text-gray-400">{u.year_level || '—'}</td>
                        <td className="px-6 py-4">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${(u.remaining_sessions ?? 0) > 10 ? 'bg-emerald-500/10 text-emerald-400' : (u.remaining_sessions ?? 0) > 0 ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'}`}>
                            {u.remaining_sessions ?? 0}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-500">{new Date(u.created_at).toLocaleDateString()}</td>
                        <td className="px-6 py-4">
                          {u.role !== 'admin' && (
                            <button onClick={() => handleDeleteUser(u.id)} className="p-2 rounded-lg hover:bg-red-500/10 text-gray-600 hover:text-red-400 transition">
                              <Trash2 size={16} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <TablePagination
                page={usersPage.currentPage}
                totalPages={usersPage.totalPages}
                totalItems={usersPage.totalItems}
                pageSize={TABLE_PAGE_SIZE}
                onPageChange={(nextPage) => setTablePage('users', nextPage)}
              />
            </div>
          </div>
        )}

        {/* ── SIT-IN TAB ── */}
        {activeTab === 'sitin' && (
          <div className="admin-modern-shell">
            {/* Header + sub-nav */}
            <div className="admin-modern-hero">
              <div>
                <h2 className="admin-modern-title">Sit-In Sessions</h2>
                <p className="admin-modern-subtitle">{activeSessions.length} active session{activeSessions.length !== 1 ? 's' : ''} · operations and history</p>
              </div>
              <button
                onClick={() => { fetchActiveSessions(); fetchRecords() }}
                className="admin-modern-refresh"
              >
                <RefreshCw size={13} /> Refresh
              </button>
            </div>
              <div className="admin-modern-subtabs">
                {[
                  { key: 'search', label: 'Search Student', icon: <Search size={14} /> },
                  { key: 'active', label: `Active (${activeSessions.length})`, icon: <Clock size={14} /> },
                  { key: 'records', label: 'Records', icon: <CheckCircle2 size={14} /> },
                ].map(v => (
                  <button key={v.key} onClick={() => setSitinView(v.key)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition ${
                      sitinView === v.key 
                        ? 'bg-[color:var(--app-accent)] text-[color:var(--app-on-accent)] shadow-lg ring-1'
                        : 'text-gray-400 hover:bg-white/5 hover:text-white'
                    }`}>
                    {v.icon} {v.label}
                  </button>
                ))}
              </div>

            {/* ── SEARCH VIEW ── */}
            {sitinView === 'search' && (
              <div className="flex flex-col gap-4">
                <div className="admin-modern-table p-5">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-3">Search Student by Name or ID</label>
                  <div className="relative">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="text" placeholder="e.g. Juan Dela Cruz or 2023-00001"
                      value={sitinSearch} onChange={e => handleSitinSearch(e.target.value)}
                      className="w-full rounded-xl border pl-11 pr-4 py-3 text-sm transition focus:outline-none"
                      style={{
                        backgroundColor: 'var(--app-surface-2)',
                        borderColor: 'var(--app-border)',
                        color: 'var(--app-fg)',
                      }}
                    />
                  </div>
                </div>

                {/* Results */}
                {sitinResults.length > 0 && (
                  <div className="admin-modern-table p-0 overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-[rgba(255,255,255,0.05)]">
                          {['Student', 'ID', 'Course', 'Year', 'Sessions Left', 'Action'].map(h => (
                            <th key={h} className="text-left text-xs font-bold text-gray-500 uppercase tracking-wider px-6 py-4">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sitinSearchPage.items.map(s => (
                          <tr key={s.id} className="user-row border-b border-[rgba(255,255,255,0.03)]">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                {s.avatar_url ? (
                                  <img src={s.avatar_url} alt="Avatar" className="w-9 h-9 rounded-full object-cover shrink-0 border border-[rgba(255,255,255,0.1)]" />
                                ) : (
                                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-sm font-bold shrink-0">
                                    {s.full_name?.charAt(0).toUpperCase() || '?'}
                                  </div>
                                )}
                                <div className="font-semibold text-sm">{s.full_name}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-purple-400 font-mono">{s.student_id}</td>
                            <td className="px-6 py-4 text-sm text-gray-400">{s.course || '—'}</td>
                            <td className="px-6 py-4 text-sm text-gray-400">{s.year_level || '—'}</td>
                            <td className="px-6 py-4">
                              <span className={`text-sm font-bold ${(s.remaining_sessions || 0) > 5 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {s.remaining_sessions ?? 30}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <button onClick={() => handleStartSession(s)}
                                disabled={(s.remaining_sessions || 0) <= 0}
                                className="px-4 py-2 rounded-lg text-xs font-bold bg-gradient-to-r from-red-500 to-orange-500 text-white hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition">
                                Start Session
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <TablePagination
                      page={sitinSearchPage.currentPage}
                      totalPages={sitinSearchPage.totalPages}
                      totalItems={sitinSearchPage.totalItems}
                      pageSize={TABLE_PAGE_SIZE}
                      onPageChange={(nextPage) => setTablePage('sitinSearch', nextPage)}
                    />
                  </div>
                )}
                {sitinSearch && sitinResults.length === 0 && (
                  <div className="admin-modern-table text-center py-10 text-gray-600">
                    <Users size={40} className="mx-auto mb-3 opacity-20" />
                    <p>No students found for "{sitinSearch}"</p>
                  </div>
                )}
              </div>
            )}

            {/* ── ACTIVE SESSIONS VIEW ── */}
            {sitinView === 'active' && (
              <div className="flex flex-col gap-4">
                <div className="flex justify-end">
                  <button onClick={fetchActiveSessions} className="admin-modern-refresh">
                    <RefreshCw size={13} /> Refresh
                  </button>
                </div>
                <div className="admin-modern-table p-0 overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[rgba(255,255,255,0.05)]">
                        {['Student', 'ID', 'Lab', 'Purpose', 'Started', 'Sessions Left', 'Action'].map(h => (
                          <th key={h} className="text-left text-xs font-bold text-gray-500 uppercase tracking-wider px-6 py-4">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sitinActivePage.totalItems === 0 ? (
                        <tr><td colSpan={7} className="text-center text-gray-600 py-12 text-sm">No active sessions at the moment</td></tr>
                      ) : sitinActivePage.items.map(s => (
                        <tr key={s.id} className="user-row border-b border-[rgba(255,255,255,0.03)]">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              {s.avatar_url ? (
                                <img src={s.avatar_url} alt="Avatar" className="w-9 h-9 rounded-full object-cover shrink-0 border border-[rgba(255,255,255,0.1)]" />
                              ) : (
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-sm font-bold shrink-0">
                                  {s.full_name?.charAt(0).toUpperCase() || '?'}
                                </div>
                              )}
                              <div className="font-semibold text-sm">{s.full_name}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-purple-400 font-mono">{s.student_id}</td>
                          <td className="px-6 py-4 text-sm text-gray-300">{s.lab_name}</td>
                          <td className="px-6 py-4 text-sm text-gray-400">{s.purpose}</td>
                          <td className="px-6 py-4 text-xs text-gray-500">{new Date(s.started_at).toLocaleTimeString()}</td>
                          <td className="px-6 py-4">
                            <span className={`font-bold text-sm ${(s.remaining_sessions || 0) > 5 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {s.remaining_sessions ?? 0}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <button onClick={() => setEndSessionPrompt(s)} disabled={endingSessionId === s.id}
                              className="px-4 py-2 rounded-lg text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 disabled:opacity-50 transition">
                              {endingSessionId === s.id ? 'Ending...' : 'End Session'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <TablePagination
                    page={sitinActivePage.currentPage}
                    totalPages={sitinActivePage.totalPages}
                    totalItems={sitinActivePage.totalItems}
                    pageSize={TABLE_PAGE_SIZE}
                    onPageChange={(nextPage) => setTablePage('sitinActive', nextPage)}
                  />
                </div>
              </div>
            )}

            {/* End Session Prompt Modal */}
            {endSessionPrompt && (
              <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-[#0f1117] border border-[rgba(255,255,255,0.1)] rounded-2xl w-full max-w-sm p-6 shadow-2xl relative">
                  <h3 className="text-xl font-bold mb-1">End Sit-In Session</h3>
                  <p className="text-sm text-gray-400 mb-5">
                    Ending session for <span className="text-white font-semibold">{endSessionPrompt.full_name}</span>.
                  </p>

                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">
                    Admin Feedback / Remarks (Optional)
                  </label>
                  <textarea
                    className="w-full bg-black/30 border border-[rgba(255,255,255,0.05)] rounded-xl p-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-500/50 transition resize-none mb-6"
                    rows={3}
                    placeholder="e.g., Left workstation dirty, or proper behavior observed..."
                    value={endSessionFeedback}
                    onChange={e => setEndSessionFeedback(e.target.value)}
                  />

                  <div className="flex justify-end gap-3">
                    <button onClick={() => { setEndSessionPrompt(null); setEndSessionFeedback(''); }} className="px-5 py-2.5 rounded-xl font-bold text-sm bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] text-gray-300 transition">Cancel</button>
                    <button onClick={handleConfirmEndSession} disabled={endingSessionId === endSessionPrompt.id} className="px-5 py-2.5 rounded-xl font-bold text-sm bg-red-600 hover:bg-red-500 text-white transition disabled:opacity-50">
                      {endingSessionId === endSessionPrompt.id ? 'Ending...' : 'Confirm'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── RECORDS VIEW ── */}
            {sitinView === 'records' && (
              <div className="flex flex-col gap-4">
                
                {/* Analytics Snapshot Row */}
                <div className="admin-modern-stat-grid">
                  <div className="admin-modern-stat-card">
                    <div className="admin-modern-stat-icon"><CheckCircle2 size={16} /></div>
                    <div className="admin-modern-stat-value">{sitinRecords.length}</div>
                    <div className="admin-modern-stat-label">Number of Sessions</div>
                  </div>
                  <div className="admin-modern-stat-card">
                    <div className="admin-modern-stat-icon"><Clock size={16} /></div>
                    <div className="admin-modern-stat-value">{formatMinutesCompact(sitinTotalMinutes)}</div>
                    <div className="admin-modern-stat-label">Total Sit-In Hours</div>
                  </div>
                  <div className="admin-modern-stat-card">
                    <div className="admin-modern-stat-icon"><Users size={16} /></div>
                    <div className="admin-modern-stat-value">{sitinUniqueStudents}</div>
                    <div className="admin-modern-stat-label">Unique Students</div>
                  </div>
                  <div className="admin-modern-stat-card">
                    <div className="admin-modern-stat-icon"><Star size={16} /></div>
                    <div className="admin-modern-stat-value">{sitinAverageRating}<span className="text-sm font-semibold text-gray-500"> / 5</span></div>
                    <div className="admin-modern-stat-label">Average Rating</div>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-2">
                  <h3 className="font-bold text-lg">Detailed Records List</h3>
                  <button onClick={fetchRecords} className="admin-modern-refresh">
                    <RefreshCw size={13} /> Refresh
                  </button>
                </div>
                <div className="admin-modern-table p-0 overflow-hidden">

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-[rgba(255,255,255,0.06)] bg-[rgba(0,0,0,0.2)]">
                          {['Student', 'ID', 'Lab', 'Purpose', 'Started', 'Ended', 'Duration', 'Rating', 'Student Feedback', 'Admin Remarks'].map(h => (
                            <th key={h} className="text-left text-xs font-bold text-gray-500 uppercase tracking-wider px-6 py-4 whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sitinRecordsPage.totalItems === 0 ? (
                          <tr><td colSpan={9} className="text-center text-gray-600 py-12 text-sm">No sit-in records yet</td></tr>
                        ) : sitinRecordsPage.items.map(r => (
                          <tr key={r.id} className="user-row border-b border-[rgba(255,255,255,0.03)]">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                {r.avatar_url ? (
                                  <img src={r.avatar_url} alt="Avatar" className="w-8 h-8 rounded-full object-cover shrink-0 border border-[rgba(255,255,255,0.1)]" />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-xs font-bold shrink-0">
                                    {r.full_name?.charAt(0).toUpperCase() || '?'}
                                  </div>
                                )}
                                <span className="font-semibold text-sm whitespace-nowrap">{r.full_name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-purple-400 font-mono whitespace-nowrap">{r.student_id}</td>
                            <td className="px-6 py-4 text-sm text-gray-300 whitespace-nowrap">{r.lab_name}</td>
                            <td className="px-6 py-4">
                              <span className="text-xs px-2 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-lg font-semibold whitespace-nowrap">
                                {r.purpose}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-xs text-gray-500 whitespace-nowrap">{r.started_at ? new Date(r.started_at).toLocaleString() : '—'}</td>
                            <td className="px-6 py-4 text-xs text-gray-500 whitespace-nowrap">{r.ended_at ? new Date(r.ended_at).toLocaleString() : '—'}</td>
                            <td className="px-6 py-4">
                              <span className="text-xs font-bold text-emerald-400 whitespace-nowrap">
                                {r.duration_minutes != null
                                  ? r.duration_minutes >= 60
                                    ? `${Math.floor(r.duration_minutes / 60)}h ${r.duration_minutes % 60}m`
                                    : `${r.duration_minutes} min`
                                  : '—'}
                              </span>
                            </td>
                            {/* Rating */}
                            <td className="px-6 py-4">
                              {r.rating ? (
                                <div className="flex items-center gap-0.5">
                                  {[1,2,3,4,5].map(n => (
                                    <Star key={n} size={13}
                                      className={r.rating >= n ? 'text-amber-400 fill-amber-400' : 'text-gray-700'} />
                                  ))}
                                </div>
                              ) : (
                                <span className="text-gray-600 text-xs italic">—</span>
                              )}
                            </td>
                            {/* Feedback */}
                            {/* Student Feedback */}
                            <td className="px-6 py-4">
                              {r.feedback ? (
                                <span
                                  className="text-xs text-gray-300 max-w-[200px] truncate block"
                                  title={r.feedback}
                                >
                                  <MessageSquare size={11} className="inline mr-1 text-purple-400" />
                                  {r.feedback}
                                </span>
                              ) : (
                                <span className="text-gray-600 text-xs italic">No feedback</span>
                              )}
                            </td>
                            {/* Admin Remarks */}
                            <td className="px-6 py-4">
                              {r.admin_feedback ? (
                                <span
                                  className="text-xs border border-red-500/20 bg-red-500/10 text-red-300 px-2 py-1 rounded-md max-w-[200px] truncate block"
                                  title={r.admin_feedback}
                                >
                                  {r.admin_feedback}
                                </span>
                              ) : (
                                <span className="text-gray-600 text-xs italic">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <TablePagination
                    page={sitinRecordsPage.currentPage}
                    totalPages={sitinRecordsPage.totalPages}
                    totalItems={sitinRecordsPage.totalItems}
                    pageSize={TABLE_PAGE_SIZE}
                    onPageChange={(nextPage) => setTablePage('sitinRecords', nextPage)}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── ANNOUNCEMENTS TAB ── */}
        {activeTab === 'announcements' && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Announcements</h2>
                <p className="text-sm text-gray-400">Visible to all students on their dashboard</p>
              </div>
              <button onClick={() => setShowNewAnn(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-red-500 to-orange-500 text-white hover:opacity-90 transition shadow-lg">
                <Plus size={16} /> New Announcement
              </button>
            </div>

            {/* New Ann Form */}
            {showNewAnn && (
              <div className="bento-card border border-red-500/20">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-bold text-lg">Post Announcement</h3>
                  <button onClick={() => setShowNewAnn(false)} className="p-1.5 rounded-lg hover:bg-[rgba(255,255,255,0.05)] text-gray-500"><X size={18} /></button>
                </div>
                <div className="space-y-4">
                  <input type="text" placeholder="Announcement title..." value={newAnn.title} onChange={e => setNewAnn(p => ({ ...p, title: e.target.value }))}
                    className="w-full bg-black/30 border border-[rgba(255,255,255,0.05)] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-500/50" />
                  <textarea placeholder="Announcement content..." value={newAnn.content} onChange={e => setNewAnn(p => ({ ...p, content: e.target.value }))} rows={3}
                    className="w-full bg-black/30 border border-[rgba(255,255,255,0.05)] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-500/50 resize-none" />
                  <div className="flex gap-3">
                    {['info', 'important', 'success'].map(t => (
                      <button key={t} onClick={() => setNewAnn(p => ({ ...p, type: t }))}
                        className={`px-4 py-2 rounded-lg text-xs font-bold capitalize transition ${newAnn.type === t ? 'bg-white/10 text-white border border-white/20' : 'text-gray-500 hover:text-white'}`}>
                        {t}
                      </button>
                    ))}
                    <button onClick={handlePostAnnouncement} disabled={postingAnn || !newAnn.title || !newAnn.content}
                      className="ml-auto px-5 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-red-500 to-orange-500 text-white hover:opacity-90 disabled:opacity-40 transition">
                      {postingAnn ? 'Posting...' : 'Post'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Announcement List */}
            <div className="space-y-4">
              {announcements.length === 0 && (
                <div className="bento-card text-center py-12 text-gray-600">
                  <Bell size={48} className="mx-auto mb-4 opacity-20" />
                  <p>No announcements yet. Post one above!</p>
                </div>
              )}
              {announcements.map(a => (
                <div key={a.id} className="bento-card flex items-start justify-between gap-4 group">
                  <div className={`w-1.5 rounded-full self-stretch shrink-0 ${a.type === 'important' ? 'bg-red-400' : a.type === 'success' ? 'bg-emerald-400' : 'bg-blue-400'}`}></div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <h3 className="font-bold text-gray-100">{a.title}</h3>
                      <span className="text-xs text-gray-500 shrink-0">{a.date}</span>
                    </div>
                    <p className="text-sm text-gray-400 leading-relaxed">{a.content}</p>
                  </div>
                  <button onClick={() => handleDeleteAnn(a.id)} className="p-2 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-gray-600 hover:text-red-400 transition shrink-0">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── RESERVATIONS TAB ── */}
        {activeTab === 'reservation' && (
          <div className="admin-modern-shell">
            <div className="admin-modern-hero">
              <div>
                <h2 className="admin-modern-title">Reservations</h2>
                <p className="admin-modern-subtitle">Review pending requests, monitor lab PCs, and check reservation activity.</p>
              </div>
              <button
                onClick={() => { fetchReservations(); fetchManageLab(); fetchLabs() }}
                className="admin-modern-refresh"
              >
                <RefreshCw size={13} /> Refresh
              </button>
            </div>

            <div className="admin-modern-stat-grid">
              <div className="admin-modern-stat-card">
                <div className="admin-modern-stat-icon"><CalendarDays size={16} /></div>
                <div className="admin-modern-stat-value">{pendingReservations.length}</div>
                <div className="admin-modern-stat-label">Pending Requests</div>
              </div>
              <div className="admin-modern-stat-card">
                <div className="admin-modern-stat-icon"><CheckCircle2 size={16} /></div>
                <div className="admin-modern-stat-value">{reservationStatusCounts.approved || 0}</div>
                <div className="admin-modern-stat-label">Approved</div>
              </div>
              <div className="admin-modern-stat-card">
                <div className="admin-modern-stat-icon"><X size={16} /></div>
                <div className="admin-modern-stat-value">{reservationStatusCounts.declined || 0}</div>
                <div className="admin-modern-stat-label">Declined</div>
              </div>
              <div className="admin-modern-stat-card">
                <div className="admin-modern-stat-icon"><FileText size={16} /></div>
                <div className="admin-modern-stat-value">{reservationLogs.length}</div>
                <div className="admin-modern-stat-label">Log Entries</div>
              </div>
            </div>

            <div className="admin-modern-table p-0 overflow-hidden">
              <div className="admin-modern-table-head">
                <h3 className="font-bold">Pending Requests</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[rgba(255,255,255,0.05)]">
                      {['Student', 'Lab', 'PC', 'Date', 'Slot', 'Purpose', 'Action'].map((h) => (
                        <th key={h} className="text-left text-xs font-bold text-gray-500 uppercase tracking-wider px-6 py-4 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pendingReservationsPage.totalItems === 0 ? (
                      <tr><td colSpan={7} className="text-center text-gray-600 py-8 text-sm">No pending reservations</td></tr>
                    ) : pendingReservationsPage.items.map((r) => (
                      <tr key={r.id} className="border-b border-[rgba(255,255,255,0.03)]">
                        <td className="px-6 py-4 text-sm">{r.full_name} <span className="text-xs text-gray-500">({r.student_id})</span></td>
                        <td className="px-6 py-4 text-sm">{r.lab_name}</td>
                        <td className="px-6 py-4 text-sm">PC {r.computer_number}</td>
                        <td className="px-6 py-4 text-sm text-gray-400">{formatDateLocal(r.date)}</td>
                        <td className="px-6 py-4 text-sm text-gray-400">{r.time_slot}</td>
                        <td className="px-6 py-4 text-sm text-gray-300">{r.purpose || '—'}</td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <button onClick={() => handleReservationDecision(r.id, 'approve')} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/20 border border-emerald-500/40 text-emerald-300">Approve</button>
                            <button onClick={() => handleReservationDecision(r.id, 'decline')} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-500/20 border border-red-500/40 text-red-300">Decline</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <TablePagination
                page={pendingReservationsPage.currentPage}
                totalPages={pendingReservationsPage.totalPages}
                totalItems={pendingReservationsPage.totalItems}
                pageSize={TABLE_PAGE_SIZE}
                onPageChange={(nextPage) => setTablePage('pendingReservations', nextPage)}
              />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="admin-modern-table p-6">
                <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                  <div>
                    <h3 className="font-bold text-lg flex items-center gap-2">
                      <Monitor size={17} className="text-indigo-300" />
                      Computer Availability
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">Monitor PCs and toggle available/maintenance status.</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <select
                      value={selectedLabId}
                      onChange={(e) => setSelectedLabId(e.target.value)}
                      className="rounded-lg px-3 py-2 text-xs border"
                      style={{ backgroundColor: 'var(--app-surface-2)', borderColor: 'var(--app-border)' }}
                    >
                      {labs.map((lab) => (
                        <option key={lab.id} value={lab.id} className="bg-[#0d0d1f]">{lab.lab_name}</option>
                      ))}
                    </select>
                    <input
                      type="date"
                      value={adminAvailDate}
                      onChange={(e) => {
                        const newDate = e.target.value
                        setAdminAvailDate(newDate)
                        if (newDate) fetchManageLab(newDate)
                      }}
                      className="rounded-lg px-3 py-2 text-xs border"
                      style={{ backgroundColor: 'var(--app-surface-2)', borderColor: 'var(--app-border)', color: 'var(--app-fg)' }}
                      title="Filter by reservation date"
                    />
                    <button onClick={() => fetchManageLab(adminAvailDate)} className="admin-modern-refresh">
                      <RefreshCw size={12} /> Refresh
                    </button>
                  </div>
                </div>
                {/* Showing reservations for date badge */}
                <div className="mb-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold"
                  style={{ background: 'rgba(99,102,241,0.10)', borderColor: 'rgba(99,102,241,0.30)', color: '#a5b4fc' }}
                >
                  <CalendarDays size={11} />
                  Showing reservations for: <span className="ml-1">{formatDateLocal(adminAvailDate)}</span>
                </div>

                <div className="mb-4 rounded-xl border border-[rgba(255,255,255,0.06)] bg-black/20 p-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs text-gray-400">Lab reservation status</div>
                    <div className={`text-sm font-semibold ${selectedLab?.reservation_enabled ? 'text-emerald-300' : 'text-red-300'}`}>
                      {selectedLab?.reservation_enabled ? 'Enabled' : 'Disabled'}
                    </div>
                  </div>
                  <button
                    onClick={() => handleLabReservationToggle(!selectedLab?.reservation_enabled)}
                    disabled={savingLabReservationToggle || !selectedLab}
                    className={`px-3 py-2 rounded-lg text-xs font-bold border transition disabled:opacity-60 ${
                      selectedLab?.reservation_enabled
                        ? 'bg-red-500/15 border-red-500/40 text-red-300 hover:bg-red-500/25'
                        : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25'
                    }`}
                  >
                    {selectedLab?.reservation_enabled ? 'Disable Reservations' : 'Enable Reservations'}
                  </button>
                </div>

                {/* Summary Counters */}
                {(() => {
                  const availCount = manageLabComputers.filter(pc => pc.display_status === 'available').length;
                  const reservedCount = manageLabComputers.filter(pc => pc.display_status === 'reserved').length;
                  const maintCount = manageLabComputers.filter(pc => pc.display_status === 'maintenance').length;
                  return (
                    <div className="flex flex-wrap gap-2 mb-5">
                      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-500/8 border border-emerald-500/20">
                        <div className="p-1.5 rounded-md bg-emerald-500/15 border border-emerald-500/30">
                          <Monitor size={12} className="text-emerald-300" />
                        </div>
                        <div>
                          <div className="text-sm font-black text-emerald-400">{availCount}</div>
                          <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400/60">Available</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/8 border border-red-500/20">
                        <div className="p-1.5 rounded-md bg-red-500/15 border border-red-500/30">
                          <Lock size={12} className="text-red-300" />
                        </div>
                        <div>
                          <div className="text-sm font-black text-red-300">{reservedCount}</div>
                          <div className="text-[10px] font-bold uppercase tracking-wider text-red-300/70">Reserved</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/8 border border-red-500/20">
                        <div className="p-1.5 rounded-md bg-red-500/15 border border-red-500/30">
                          <Wrench size={12} className="text-red-300" />
                        </div>
                        <div>
                          <div className="text-sm font-black text-red-300">{maintCount}</div>
                          <div className="text-[10px] font-bold uppercase tracking-wider text-red-300/70">Maintenance</div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-8 gap-2.5">
                  {manageLabComputers.map((pc) => {
                    const canToggleMaintenance = pc.display_status !== 'reserved'
                    const isAvailable = pc.display_status === 'available';
                    const isReserved = pc.display_status === 'reserved';
                    const isMaintenance = pc.display_status === 'maintenance';
                    const tileStyle = isAvailable
                      ? {
                          background: 'linear-gradient(to bottom, rgba(16,185,129,0.16), rgba(6,95,70,0.18))',
                          borderColor: 'rgba(16,185,129,0.45)',
                          color: '#a7f3d0',
                          opacity: 1,
                        }
                      : {
                          background: 'linear-gradient(to bottom, rgba(239,68,68,0.14), rgba(127,29,29,0.16))',
                          borderColor: 'rgba(239,68,68,0.40)',
                          color: '#fecaca',
                          opacity: isReserved ? 0.9 : 0.86,
                        }
                    const iconFrameStyle = isAvailable
                      ? { background: 'rgba(16,185,129,0.16)', borderColor: 'rgba(16,185,129,0.45)' }
                      : { background: 'rgba(239,68,68,0.16)', borderColor: 'rgba(239,68,68,0.40)' }
                    const dotStyle = isAvailable
                      ? { background: '#34d399', boxShadow: '0 0 6px rgba(52,211,153,0.6)' }
                      : { background: '#f87171', boxShadow: '0 0 6px rgba(248,113,113,0.45)' }
                    return (
                      <button
                        key={pc.id}
                        onClick={() => canToggleMaintenance && handleComputerStatus(pc.id, isMaintenance ? 'available' : 'maintenance')}
                        disabled={!canToggleMaintenance}
                        className={`group relative rounded-xl text-xs border-2 transition-all duration-200 flex flex-col items-center justify-center gap-1.5 min-h-[78px] ${canToggleMaintenance ? 'hover:scale-[1.05] cursor-pointer' : 'cursor-not-allowed'}`}
                        style={tileStyle}
                        title={
                          isReserved
                            ? `Reserved by ${pc.reserved_by_name || 'someone'} • ${formatDateLocal(pc.reservation_date)} ${pc.reservation_time_slot || ''}`.trim()
                            : `Click to mark ${isMaintenance ? 'available' : 'maintenance'}`
                        }
                      >
                        {/* Status indicator dot */}
                        <div
                          className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${isAvailable ? 'animate-pulse' : ''}`}
                          style={dotStyle}
                        />

                        {/* Icon */}
                        <div className="p-1.5 rounded-md border" style={iconFrameStyle}>
                          <Monitor size={15} style={{ color: isAvailable ? '#a7f3d0' : '#fca5a5' }} />
                        </div>

                        <span className="font-bold text-[11px] leading-none">PC {pc.computer_number}</span>

                        {isReserved && (
                          <span className="text-[9px] leading-tight max-w-full truncate px-0.5 font-medium" style={{ color: '#fca5a5' }}>
                            {pc.reserved_by_name || 'Reserved'}
                          </span>
                        )}
                        {isMaintenance && (
                          <span className="text-[9px] leading-tight font-medium" style={{ color: '#fca5a5' }}>Offline</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="admin-modern-table p-0 overflow-hidden">
                <div className="admin-modern-table-head">
                  <h3 className="font-bold">Reservation Logs</h3>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {reservationLogs.slice(0, 100).map((log) => (
                    <div key={log.id} className="px-6 py-3 border-b border-[rgba(255,255,255,0.03)]">
                      <div className="text-xs uppercase text-purple-400 font-bold">{log.action}</div>
                      <div className="text-sm">{log.student_name || 'Student'} · {log.lab_name || 'Lab'} · PC {log.computer_number ?? '-'}</div>
                      <div className="text-xs text-gray-500">{new Date(log.created_at).toLocaleString()}</div>
                      {log.details && <div className="text-xs text-gray-400 mt-1">{log.details}</div>}
                    </div>
                  ))}
                  {reservationLogs.length === 0 && <div className="p-6 text-sm text-gray-600">No logs yet.</div>}
                </div>
              </div>
            </div>

            <div className="admin-modern-table p-0 overflow-hidden">
              <div className="admin-modern-table-head flex items-center justify-between gap-3">
                <h3 className="font-bold">All Reservations</h3>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={reservationDateFilter}
                    onChange={(e) => { setReservationDateFilter(e.target.value); setTablePage('allReservations', 1) }}
                    className="rounded-lg px-3 py-1.5 text-xs border"
                    style={{ backgroundColor: 'var(--app-surface-2)', borderColor: 'var(--app-border)', color: 'var(--app-fg)' }}
                    title="Filter by date"
                  />
                  {reservationDateFilter && (
                    <button
                      onClick={() => { setReservationDateFilter(''); setTablePage('allReservations', 1) }}
                      className="px-2 py-1.5 rounded-lg text-xs font-bold bg-white/5 border border-white/10 text-gray-400 hover:text-white transition"
                      title="Clear date filter"
                    >
                      ✕ Clear
                    </button>
                  )}
                </div>
              </div>
              {reservationDateFilter && (
                <div className="px-6 py-2 text-[11px] text-indigo-300 flex items-center gap-1.5 border-b border-[rgba(255,255,255,0.05)]" style={{ background: 'rgba(99,102,241,0.07)' }}>
                  <CalendarDays size={11} />
                  Showing reservations for: <span className="font-bold ml-1">{formatDateLocal(reservationDateFilter)}</span>
                  <span className="ml-2 text-gray-500">({filteredReservations.length} result{filteredReservations.length !== 1 ? 's' : ''})</span>
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[rgba(255,255,255,0.05)]">
                      {['Student', 'Lab', 'PC', 'Date', 'Slot', 'Status', 'Notes'].map((h) => (
                        <th key={h} className="text-left text-xs font-bold text-gray-500 uppercase tracking-wider px-6 py-4 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {allReservationsPage.items.map((r) => (
                      <tr key={r.id} className="border-b border-[rgba(255,255,255,0.03)]">
                        <td className="px-6 py-4 text-sm">{r.full_name}</td>
                        <td className="px-6 py-4 text-sm">{r.lab_name}</td>
                        <td className="px-6 py-4 text-sm">PC {r.computer_number}</td>
                        <td className="px-6 py-4 text-sm text-gray-400">{formatDateLocal(r.date)}</td>
                        <td className="px-6 py-4 text-sm text-gray-400">{r.time_slot}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${getReservationStatusBadgeClass(r.status)}`}>{r.status}</span>
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-400">{r.admin_notes || '—'}</td>
                      </tr>
                    ))}
                    {allReservationsPage.totalItems === 0 && <tr><td colSpan={7} className="text-center text-gray-600 py-8 text-sm">{reservationDateFilter ? `No reservations found for ${formatDateLocal(reservationDateFilter)}` : 'No reservations yet'}</td></tr>}
                  </tbody>
                </table>
              </div>
              <TablePagination
                page={allReservationsPage.currentPage}
                totalPages={allReservationsPage.totalPages}
                totalItems={allReservationsPage.totalItems}
                pageSize={TABLE_PAGE_SIZE}
                onPageChange={(nextPage) => setTablePage('allReservations', nextPage)}
              />
            </div>
          </div>
        )}

        {/* ── LAB SOFTWARE TAB ── */}
        {activeTab === 'software' && (
          <div className="admin-modern-shell">
            <div className="admin-modern-hero">
              <div>
                <h2 className="admin-modern-title">Lab Software</h2>
                <p className="admin-modern-subtitle">Each laboratory is shown as its own card with software apps inside.</p>
              </div>
              <button
                onClick={fetchLabs}
                className="admin-modern-refresh"
              >
                <RefreshCw size={13} /> Refresh
              </button>
            </div>

            <div className="admin-modern-stat-grid">
              <div className="admin-modern-stat-card">
                <div className="admin-modern-stat-icon"><MonitorPlay size={16} /></div>
                <div className="admin-modern-stat-value">{labs.length}</div>
                <div className="admin-modern-stat-label">Total Labs</div>
              </div>
              <div className="admin-modern-stat-card">
                <div className="admin-modern-stat-icon"><FileText size={16} /></div>
                <div className="admin-modern-stat-value">{totalSoftwareEntries}</div>
                <div className="admin-modern-stat-label">Software Entries</div>
              </div>
              <div className="admin-modern-stat-card">
                <div className="admin-modern-stat-icon"><CheckCircle2 size={16} /></div>
                <div className="admin-modern-stat-value">{labsWithSoftware}</div>
                <div className="admin-modern-stat-label">Labs with Software</div>
              </div>
              <div className="admin-modern-stat-card">
                <div className="admin-modern-stat-icon"><TrendingUp size={16} /></div>
                <div className="admin-modern-stat-value">{largestSoftwareCount}</div>
                <div className="admin-modern-stat-label">Most in a Lab</div>
              </div>
              <div className="admin-modern-stat-card">
                <div className="admin-modern-stat-icon"><X size={16} /></div>
                <div className="admin-modern-stat-value">{labsNeedingSoftware}</div>
                <div className="admin-modern-stat-label">Labs Needing Setup</div>
              </div>
            </div>

            {labs.length === 0 ? (
              <div className="admin-modern-table p-8 text-center text-sm text-gray-500">
                <MonitorPlay size={26} className="mx-auto mb-2 opacity-40" />
                No laboratories found.
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
                {labs.map((lab) => {
                  const labId = String(lab.id)
                  const softwareItems = Array.isArray(lab.softwares) ? lab.softwares : []
                  const currentInput = labSoftwareInputs[labId] ?? ''

                  return (
                    <div key={lab.id} className="admin-modern-table p-5">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <h3 className="font-bold text-base flex items-center gap-2">
                            <MonitorPlay size={15} className="text-indigo-300" />
                            {lab.lab_name}
                          </h3>
                          <p className="text-xs text-gray-500 mt-0.5">Installed software</p>
                        </div>
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border"
                          style={{ borderColor: 'var(--app-border)', backgroundColor: 'var(--app-surface-2)' }}>
                          <FileText size={11} />
                          {softwareItems.length} app{softwareItems.length !== 1 ? 's' : ''}
                        </span>
                      </div>

                      <div className="flex gap-2 mb-3">
                        <input
                          type="text"
                          value={currentInput}
                          onChange={(e) => setLabSoftwareInputs((prev) => ({ ...prev, [labId]: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleAddLabSoftware(lab.id, currentInput) }}
                          placeholder="e.g. Visual Studio Code"
                          className="flex-1 rounded-lg px-3 py-2 text-xs focus:outline-none border"
                          style={{
                            backgroundColor: 'var(--app-surface-2)',
                            borderColor: 'var(--app-border)',
                            color: 'var(--app-fg)',
                          }}
                        />
                        <button
                          onClick={() => handleAddLabSoftware(lab.id, currentInput)}
                          disabled={savingLabSoftware}
                          className="px-3 py-2 rounded-lg text-xs font-bold border disabled:opacity-60 inline-flex items-center gap-1.5"
                          style={{
                            backgroundColor: 'var(--app-accent-soft)',
                            borderColor: 'var(--app-accent)',
                            color: 'var(--app-accent)',
                          }}
                        >
                          <Plus size={12} />
                          Add
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {softwareItems.length === 0 ? (
                          <span className="text-xs text-gray-500 inline-flex items-center gap-1.5">
                            <FileText size={12} />
                            No software listed yet.
                          </span>
                        ) : (
                          softwareItems.map((item) => (
                            <span
                              key={item.id}
                              className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg text-xs bg-indigo-500/15 border border-indigo-500/35 text-indigo-200"
                            >
                              <FileText size={12} className="text-indigo-300" />
                              {item.software_name}
                              <button
                                onClick={() => handleRemoveLabSoftware(item.id, lab.id)}
                                disabled={savingLabSoftware}
                                className="text-indigo-200/70 hover:text-red-300 transition disabled:opacity-60"
                                title="Remove software"
                              >
                                <X size={12} />
                              </button>
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── TESTIMONIALS TAB ── */}
        {activeTab === 'testimonials' && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Testimonials</h2>
                <p className="text-sm text-gray-400">Testimonials are published directly by students. You can review and remove entries.</p>
              </div>
            </div>

            <div className="bento-card p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[rgba(255,255,255,0.05)]">
                      {['Student', 'Rating', 'Content', 'Status', 'Date', 'Action'].map((h) => (
                        <th key={h} className="text-left text-xs font-bold text-gray-500 uppercase tracking-wider px-6 py-4">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {testimonialsPage.items.map((t) => (
                      <tr key={t.id} className="border-b border-[rgba(255,255,255,0.03)]">
                        <td className="px-6 py-4 text-sm">{t.full_name} <span className="text-xs text-gray-500">({t.student_id})</span></td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((n) => <Star key={n} size={13} className={t.rating >= n ? 'text-amber-400 fill-amber-400' : 'text-gray-700'} />)}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-300">{t.content}</td>
                        <td className="px-6 py-4"><span className="px-2 py-1 rounded text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 uppercase">{t.status}</span></td>
                        <td className="px-6 py-4 text-xs text-gray-500">{new Date(t.created_at).toLocaleString()}</td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <button onClick={() => handleDeleteTestimonial(t.id)} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-500/20 border border-red-500/40 text-red-300">Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {testimonialsPage.totalItems === 0 && <tr><td colSpan={6} className="text-center text-gray-600 py-8 text-sm">No testimonials found</td></tr>}
                  </tbody>
                </table>
              </div>
              <TablePagination
                page={testimonialsPage.currentPage}
                totalPages={testimonialsPage.totalPages}
                totalItems={testimonialsPage.totalItems}
                pageSize={TABLE_PAGE_SIZE}
                onPageChange={(nextPage) => setTablePage('testimonials', nextPage)}
              />
            </div>
          </div>
        )}

        {/* ── ANALYTICS TAB ── */}
        {activeTab === 'analytics' && (
          <div className="admin-modern-shell">
            <div className="admin-modern-hero">
              <div>
                <h2 className="admin-modern-title">Analytics</h2>
                <p className="admin-modern-subtitle">Track usage trends, lab utilization, and reservation behavior in one view.</p>
              </div>
              <button onClick={fetchAnalytics} className="admin-modern-refresh"><RefreshCw size={13} /> Refresh</button>
            </div>

            <div className="admin-modern-stat-grid">
              <div className="admin-modern-stat-card"><div className="admin-modern-stat-icon"><Users size={16} /></div><div className="admin-modern-stat-value">{analyticsSummary?.total_users ?? 0}</div><div className="admin-modern-stat-label">Total Users</div></div>
              <div className="admin-modern-stat-card"><div className="admin-modern-stat-icon"><CheckCircle2 size={16} /></div><div className="admin-modern-stat-value">{analyticsSummary?.total_sessions ?? 0}</div><div className="admin-modern-stat-label">Total Sessions</div></div>
              <div className="admin-modern-stat-card"><div className="admin-modern-stat-icon"><Clock size={16} /></div><div className="admin-modern-stat-value">{analyticsSummary?.average_duration_minutes ?? 0}m</div><div className="admin-modern-stat-label">Average Duration</div></div>
              <div className="admin-modern-stat-card"><div className="admin-modern-stat-icon"><MonitorPlay size={16} /></div><div className="admin-modern-stat-value">{analyticsSummary?.active_sessions ?? 0}</div><div className="admin-modern-stat-label">Active Sessions</div></div>
              <div className="admin-modern-stat-card"><div className="admin-modern-stat-icon"><CalendarDays size={16} /></div><div className="admin-modern-stat-value">{analyticsSummary?.reservations?.total ?? 0}</div><div className="admin-modern-stat-label">Reservations</div></div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="admin-modern-table p-0 overflow-hidden">
                <div className="admin-modern-table-head">Sessions by Date</div>
                <div className="max-h-80 overflow-y-auto">
                  {analyticsSessions.map((row) => (
                    <div key={row.date} className="px-6 py-3 border-b border-[rgba(255,255,255,0.03)] flex items-center justify-between">
                      <div className="text-sm">{row.date}</div>
                      <div className="text-xs text-gray-400">{row.count} sessions · avg {row.avg_duration}m</div>
                    </div>
                  ))}
                  {analyticsSessions.length === 0 && <div className="p-6 text-sm text-gray-600">No session analytics yet.</div>}
                </div>
              </div>
              <div className="admin-modern-table p-0 overflow-hidden">
                <div className="admin-modern-table-head">Lab Utilization</div>
                <div className="max-h-80 overflow-y-auto">
                  {analyticsLabs.map((row) => (
                    <div key={row.lab_name} className="px-6 py-3 border-b border-[rgba(255,255,255,0.03)] flex items-center justify-between">
                      <div className="text-sm">{row.lab_name}</div>
                      <div className="text-xs text-gray-400">{row.sessions} sessions · avg {row.avg_duration}m</div>
                    </div>
                  ))}
                  {analyticsLabs.length === 0 && <div className="p-6 text-sm text-gray-600">No lab analytics yet.</div>}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="admin-modern-table p-6">
                <h3 className="font-bold mb-3">Reservation Status</h3>
                <div className="space-y-2">
                  {Object.entries(analyticsReservations?.by_status || {}).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between text-sm">
                      <span className="uppercase text-gray-400">{status}</span>
                      <span className="font-bold">{count}</span>
                    </div>
                  ))}
                  {Object.keys(analyticsReservations?.by_status || {}).length === 0 && <div className="text-sm text-gray-600">No reservation data.</div>}
                </div>
              </div>
              <div className="admin-modern-table p-6">
                <h3 className="font-bold mb-3">Peak Hours</h3>
                <div className="space-y-2">
                  {(analyticsPeak?.hours || []).map((h) => (
                    <div key={h.hour} className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">{String(h.hour).padStart(2, '0')}:00</span>
                      <span className="font-bold">{h.count}</span>
                    </div>
                  ))}
                  {(analyticsPeak?.hours || []).length === 0 && <div className="text-sm text-gray-600">No peak-hour data.</div>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── REPORTS TAB ── */}
        {activeTab === 'reports' && (
          <div className="admin-modern-shell">
            <div className="admin-modern-hero">
              <div>
                <h2 className="admin-modern-title">Reports</h2>
                <p className="admin-modern-subtitle">Generate CSV/PDF exports, then re-download from report history.</p>
              </div>
            </div>

            <div className="admin-modern-stat-grid">
              <div className="admin-modern-stat-card">
                <div className="admin-modern-stat-icon"><FileSpreadsheet size={16} /></div>
                <div className="admin-modern-stat-value">{reportHistory.length}</div>
                <div className="admin-modern-stat-label">Generated Reports</div>
              </div>
              <div className="admin-modern-stat-card">
                <div className="admin-modern-stat-icon"><FileText size={16} /></div>
                <div className="admin-modern-stat-value">{reportCsvCount}</div>
                <div className="admin-modern-stat-label">CSV Exports</div>
              </div>
              <div className="admin-modern-stat-card">
                <div className="admin-modern-stat-icon"><FileSpreadsheet size={16} /></div>
                <div className="admin-modern-stat-value">{reportPdfCount}</div>
                <div className="admin-modern-stat-label">PDF Exports</div>
              </div>
              <div className="admin-modern-stat-card">
                <div className="admin-modern-stat-icon"><Clock size={16} /></div>
                <div className="admin-modern-stat-value text-base leading-snug">{latestReportDate}</div>
                <div className="admin-modern-stat-label">Latest Generated</div>
              </div>
            </div>

            <div className="admin-modern-table p-6">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="rounded-xl px-4 py-3 text-sm border"
                  style={{ backgroundColor: 'var(--app-surface-2)', borderColor: 'var(--app-border)' }}
                >
                  {['sitin', 'reservations', 'testimonials', 'users', 'labs'].map((type) => <option key={type} value={type} className="bg-[#0d0d1f]">{type}</option>)}
                </select>
                <select
                  value={reportFormat}
                  onChange={(e) => setReportFormat(e.target.value)}
                  className="rounded-xl px-4 py-3 text-sm border"
                  style={{ backgroundColor: 'var(--app-surface-2)', borderColor: 'var(--app-border)' }}
                >
                  <option value="csv" className="bg-[#0d0d1f]">CSV</option>
                  <option value="pdf" className="bg-[#0d0d1f]">PDF</option>
                </select>
                <input
                  type="date"
                  value={reportFrom}
                  onChange={(e) => setReportFrom(e.target.value)}
                  className="rounded-xl px-4 py-3 text-sm border"
                  style={{ backgroundColor: 'var(--app-surface-2)', borderColor: 'var(--app-border)' }}
                />
                <input
                  type="date"
                  value={reportTo}
                  onChange={(e) => setReportTo(e.target.value)}
                  className="rounded-xl px-4 py-3 text-sm border"
                  style={{ backgroundColor: 'var(--app-surface-2)', borderColor: 'var(--app-border)' }}
                />
                <input
                  type="text"
                  value={reportStatus}
                  onChange={(e) => setReportStatus(e.target.value)}
                  placeholder="status (optional)"
                  className="rounded-xl px-4 py-3 text-sm border placeholder-gray-600"
                  style={{ backgroundColor: 'var(--app-surface-2)', borderColor: 'var(--app-border)', color: 'var(--app-fg)' }}
                />
              </div>
              <button onClick={handleGenerateReport} disabled={reportLoading} className="mt-4 px-5 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-red-500 to-orange-500 text-white hover:opacity-90 disabled:opacity-50">
                {reportLoading ? 'Generating...' : 'Generate Report'}
              </button>
            </div>

            <div className="admin-modern-table p-0 overflow-hidden">
              <div className="admin-modern-table-head">Report History</div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[rgba(255,255,255,0.05)]">
                      {['Type', 'Format', 'Created', 'Action'].map((h) => (
                        <th key={h} className="text-left text-xs font-bold text-gray-500 uppercase tracking-wider px-6 py-4">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reportsPage.items.map((item) => (
                      <tr key={item.id} className="border-b border-[rgba(255,255,255,0.03)]">
                        <td className="px-6 py-4 text-sm uppercase">{item.report_type}</td>
                        <td className="px-6 py-4 text-sm uppercase">{item.format}</td>
                        <td className="px-6 py-4 text-xs text-gray-500">{new Date(item.created_at).toLocaleString()}</td>
                        <td className="px-6 py-4">
                          <button onClick={() => handleDownloadHistoryReport(item.id, item.format)} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-500/20 border border-blue-500/40 text-blue-300">
                            Download
                          </button>
                        </td>
                      </tr>
                    ))}
                    {reportsPage.totalItems === 0 && <tr><td colSpan={4} className="text-center text-gray-600 py-8 text-sm">No generated reports yet</td></tr>}
                  </tbody>
                </table>
              </div>
              <TablePagination
                page={reportsPage.currentPage}
                totalPages={reportsPage.totalPages}
                totalItems={reportsPage.totalItems}
                pageSize={TABLE_PAGE_SIZE}
                onPageChange={(nextPage) => setTablePage('reports', nextPage)}
              />
            </div>
          </div>
        )}

        {/* ── LEADERBOARD TAB ── */}
        {activeTab === 'rewards' && (
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="text-2xl font-bold">Session Leaderboard</h2>
              <p className="text-sm text-gray-400">Students ranked by total sit-in session hours this semester.</p>
            </div>

            <div className="bento-card">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-1.5 rounded-lg bg-gradient-to-br from-amber-500/20 to-yellow-500/10 border border-amber-500/30">
                  <Trophy size={16} className="text-amber-400" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Top Students by Session Hours</h3>
                  <p className="text-xs text-gray-500">Based on completed sit-in session durations</p>
                </div>
              </div>
              <div className="space-y-2">
                {rewardLeaderboard.map((row, idx) => {
                  const maxMinutes = rewardLeaderboard[0]?.total_minutes || 1
                  const barWidth = Math.max(5, (row.total_minutes / maxMinutes) * 100)
                  const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null
                  return (
                    <div key={row.id} className={`flex items-center gap-3 p-3 rounded-xl border ${
                      idx < 3 ? 'bg-amber-500/5 border-amber-500/15' : 'bg-black/20 border-[rgba(255,255,255,0.04)]'
                    }`}>
                      <div className="w-8 text-center shrink-0">
                        {medal ? <span className="text-lg">{medal}</span> : <span className="text-xs text-gray-500 font-bold">#{idx + 1}</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <div>
                            <span className="text-sm font-semibold">{row.full_name}</span>
                            {row.student_id && <span className="text-xs text-gray-500 ml-2">{row.student_id}</span>}
                          </div>
                          <span className="text-sm font-black text-amber-300 shrink-0 ml-2">{row.formatted_duration}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-black/30 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              idx === 0 ? 'bg-gradient-to-r from-amber-400 to-yellow-400' :
                              idx === 1 ? 'bg-gradient-to-r from-gray-300 to-gray-400' :
                              idx === 2 ? 'bg-gradient-to-r from-orange-500 to-amber-600' :
                              'bg-indigo-500/60'
                            }`}
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[10px] text-gray-500">{row.total_sessions} session{row.total_sessions !== 1 ? 's' : ''}</span>
                          <span className="text-[10px] text-gray-600">•</span>
                          <span className="text-[10px] text-gray-500">{row.total_hours}h total</span>
                          {row.course && <><span className="text-[10px] text-gray-600">•</span><span className="text-[10px] text-gray-600">{row.course}</span></>}
                        </div>
                      </div>
                    </div>
                  )
                })}
                {rewardLeaderboard.length === 0 && (
                  <div className="text-center py-12">
                    <Trophy size={36} className="mx-auto mb-3 text-gray-700" />
                    <p className="text-sm text-gray-500">No completed sessions yet. Session data will appear here once students complete sit-ins.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── SETTINGS TAB ── */}
        {activeTab === 'settings' && (
          <div className="max-w-3xl mx-auto">
            <div className="bento-card mt-4">
              <div className="flex items-center justify-between mb-8 pb-6 border-b border-[rgba(255,255,255,0.05)]">
                <div>
                  <h2 className="text-2xl font-bold mb-1">Administrator Profile</h2>
                  <p className="text-sm text-gray-400">Configure your admin account details</p>
                </div>
                <div className="p-3 bg-red-500/10 text-red-400 rounded-xl"><Settings size={22} /></div>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 rounded-xl bg-black/20 border border-[rgba(255,255,255,0.03)]">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">Name</label>
                    <div className="text-sm font-medium text-gray-300">{user?.full_name || 'N/A'}</div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">Login ID</label>
                    <div className="text-sm font-medium text-red-400">{user?.student_id || 'N/A'}</div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">Role Title</label>
                    {!editMode ? (
                      <div className="p-3.5 bg-black/30 rounded-xl text-sm border border-[rgba(255,255,255,0.02)] min-h-[46px] flex items-center">{user?.course || 'Not Set'}</div>
                    ) : (
                      <input type="text" name="course" value={editData.course} onChange={e => setEditData(p => ({ ...p, course: e.target.value }))} placeholder="e.g. IT Administrator"
                        className="w-full p-3.5 bg-[rgba(255,255,255,0.03)] rounded-xl text-sm border border-red-500/40 text-white focus:outline-none transition" />
                    )}
                  </div>
                </div>

                <div className="pt-6 border-t border-[rgba(255,255,255,0.05)] flex gap-4">
                  {!editMode ? (
                    <button onClick={() => setEditMode(true)} className="px-6 py-3 rounded-xl text-sm font-bold bg-[#FF6B6B] hover:bg-[#ff5252] transition text-white">Enable Editing</button>
                  ) : (
                    <>
                      <button onClick={handleSaveProfile} disabled={saving} className="px-6 py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-emerald-500 to-emerald-400 text-emerald-950 hover:opacity-90 transition disabled:opacity-50">
                        {saving ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button onClick={() => setEditMode(false)} className="px-6 py-3 rounded-xl text-sm font-bold bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.1)] transition text-white">Discard</button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

  <ToastStack toasts={toasts} onDismiss={removeToast} />

      {/* ── START SESSION MODAL ── */}
      {startingSession && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#0d0d1f] border border-[rgba(255,255,255,0.08)] rounded-2xl w-full max-w-md shadow-2xl p-7">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold">Start Sit-In Session</h3>
              <button onClick={() => setStartingSession(null)} className="p-1.5 rounded-lg hover:bg-white/5 text-gray-500"><X size={18} /></button>
            </div>

            {/* Student info */}
            <div className="flex items-center gap-3 p-4 rounded-xl bg-black/30 border border-[rgba(255,255,255,0.04)] mb-5">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-lg font-bold">
                {startingSession.full_name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="font-bold">{startingSession.full_name}</div>
                <div className="text-xs text-gray-400">{startingSession.student_id} · {startingSession.course || 'No Course'}</div>
                <div className="text-xs text-emerald-400 mt-0.5 font-semibold">{startingSession.remaining_sessions ?? 30} sessions remaining</div>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Laboratory</label>
                <select value={sessionForm.lab_name} onChange={e => setSessionForm(p => ({ ...p, lab_name: e.target.value }))}
                  className="w-full bg-black/30 border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-red-500/50 transition">
                  {['Lab 524', 'Lab 530', 'Lab 544', 'Lab 542', 'Lab 526'].map(lab => (
                    <option key={lab} value={lab} className="bg-[#0d0d1f]">{lab}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Purpose</label>
                <select value={sessionForm.purpose} onChange={e => setSessionForm(p => ({ ...p, purpose: e.target.value }))}
                  className="w-full bg-black/30 border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-red-500/50 transition">
                  {['Java', 'C#', 'C', 'Javascript', 'Php', 'Html & CSS'].map(p => (
                    <option key={p} value={p} className="bg-[#0d0d1f]">{p}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={handleConfirmStart}
                className="flex-1 py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-red-500 to-orange-500 text-white hover:opacity-90 transition shadow-lg">
                ✓ Confirm & Start Session
              </button>
              <button onClick={() => setStartingSession(null)}
                className="px-5 py-3 rounded-xl text-sm font-bold bg-white/5 hover:bg-white/10 border border-white/10 text-white transition">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      <AIChatbot />
    </div>
  )
}
