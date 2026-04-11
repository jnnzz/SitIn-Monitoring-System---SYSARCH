"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, Users, Bell, Settings, Trash2, Plus, X, BarChart3, TrendingUp, Shield, RefreshCw, MonitorPlay, Search, Clock, CheckCircle2, Star, MessageSquare } from 'lucide-react'
import Image from 'next/image'
import ccs from '../assets/ccslogo.png'
import { ToastStack } from '@/components/ui/toast-stack'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { useToasts } from '@/lib/use-toasts'

const API = '/api/auth'

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
  }, [router, fetchUsers, fetchStats, fetchAnnouncements, fetchActiveSessions, fetchRecords])

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

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/')
  }

  const filteredUsers = users.filter(u =>
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.student_id?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  )

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
                      {['Student', 'Student ID', 'Email', 'Course', 'Year', 'Joined', 'Action'].map(h => (
                        <th key={h} className="text-left text-xs font-bold text-gray-500 uppercase tracking-wider px-6 py-4">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.length === 0 ? (
                      <tr><td colSpan={7} className="text-center text-gray-600 py-12 text-sm">No users found</td></tr>
                    ) : filteredUsers.map(u => (
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
            </div>
          </div>
        )}

        {/* ── SIT-IN TAB ── */}
        {activeTab === 'sitin' && (
          <div className="flex flex-col gap-6">
            {/* Header + sub-nav */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold">Sit-In Session Management</h2>
                <p className="text-sm text-gray-400">{activeSessions.length} active session{activeSessions.length !== 1 ? 's' : ''}</p>
              </div>
              <div className="flex gap-2 bg-black/20 p-1 rounded-xl border border-[rgba(255,255,255,0.05)]">
                {[
                  { key: 'search', label: 'Search Student', icon: <Search size={14} /> },
                  { key: 'active', label: `Active (${activeSessions.length})`, icon: <Clock size={14} /> },
                  { key: 'records', label: 'Records', icon: <CheckCircle2 size={14} /> },
                ].map(v => (
                  <button key={v.key} onClick={() => setSitinView(v.key)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition ${
                      sitinView === v.key 
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 ring-1 ring-blue-500/50' 
                        : 'text-gray-400 hover:bg-white/5 hover:text-white'
                    }`}>
                    {v.icon} {v.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── SEARCH VIEW ── */}
            {sitinView === 'search' && (
              <div className="flex flex-col gap-4">
                <div className="bento-card">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-3">Search Student by Name or ID</label>
                  <div className="relative">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="text" placeholder="e.g. Juan Dela Cruz or 2023-00001"
                      value={sitinSearch} onChange={e => handleSitinSearch(e.target.value)}
                      className="w-full bg-black/30 border border-[rgba(255,255,255,0.05)] rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-500/50 transition"
                    />
                  </div>
                </div>

                {/* Results */}
                {sitinResults.length > 0 && (
                  <div className="bento-card p-0 overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-[rgba(255,255,255,0.05)]">
                          {['Student', 'ID', 'Course', 'Year', 'Sessions Left', 'Action'].map(h => (
                            <th key={h} className="text-left text-xs font-bold text-gray-500 uppercase tracking-wider px-6 py-4">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sitinResults.map(s => (
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
                  </div>
                )}
                {sitinSearch && sitinResults.length === 0 && (
                  <div className="bento-card text-center py-10 text-gray-600">
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
                  <button onClick={fetchActiveSessions} className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.05)] transition text-gray-300">
                    <RefreshCw size={13} /> Refresh
                  </button>
                </div>
                <div className="bento-card p-0 overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[rgba(255,255,255,0.05)]">
                        {['Student', 'ID', 'Lab', 'Purpose', 'Started', 'Sessions Left', 'Action'].map(h => (
                          <th key={h} className="text-left text-xs font-bold text-gray-500 uppercase tracking-wider px-6 py-4">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {activeSessions.length === 0 ? (
                        <tr><td colSpan={7} className="text-center text-gray-600 py-12 text-sm">No active sessions at the moment</td></tr>
                      ) : activeSessions.map(s => (
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
            {sitinView === 'records' && (() => {
              const totalSessions = sitinRecords.length;
              const totalMins = sitinRecords.reduce((sum, r) => sum + (r.duration_minutes || 0), 0);
              const totalHoursText = totalMins >= 60 ? `${Math.floor(totalMins / 60)}h ${totalMins % 60}m` : `${totalMins}m`;
              const uniqueStudents = new Set(sitinRecords.map(r => r.student_id)).size;
              const ratedSessions = sitinRecords.filter(r => r.rating > 0);
              const avgRating = ratedSessions.length > 0 
                ? (ratedSessions.reduce((sum, r) => sum + r.rating, 0) / ratedSessions.length).toFixed(1)
                : '—';

              return (
              <div className="flex flex-col gap-4">
                
                {/* Analytics Snapshot Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bento-card py-4 flex flex-col items-center justify-center bg-gradient-to-b from-emerald-500/10 to-transparent border-t-emerald-500/30">
                    <div className="flex items-center gap-2 text-emerald-400 mb-1">
                      <CheckCircle2 size={16} />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Total Sessions</span>
                    </div>
                    <div className="text-2xl font-black text-white">{totalSessions}</div>
                  </div>
                  
                  <div className="bento-card py-4 flex flex-col items-center justify-center bg-gradient-to-b from-blue-500/10 to-transparent border-t-blue-500/30">
                    <div className="flex items-center gap-2 text-blue-400 mb-1">
                      <Clock size={16} />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Time Logged</span>
                    </div>
                    <div className="text-xl font-black text-white">{totalHoursText}</div>
                  </div>

                  <div className="bento-card py-4 flex flex-col items-center justify-center bg-gradient-to-b from-purple-500/10 to-transparent border-t-purple-500/30">
                    <div className="flex items-center gap-2 text-purple-400 mb-1">
                      <Users size={16} />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Unique Students</span>
                    </div>
                    <div className="text-2xl font-black text-white">{uniqueStudents}</div>
                  </div>

                  <div className="bento-card py-4 flex flex-col items-center justify-center bg-gradient-to-b from-amber-500/10 to-transparent border-t-amber-500/30">
                    <div className="flex items-center gap-2 text-amber-400 mb-1">
                      <Star size={16} />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Avg Rating</span>
                    </div>
                    <div className="text-2xl font-black text-white flex items-baseline gap-1">
                      {avgRating} <span className="text-sm text-gray-500 font-medium">/ 5</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-2">
                  <h3 className="font-bold text-lg">Detailed Records List</h3>
                  <button onClick={fetchRecords} className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.05)] transition text-gray-300">
                    <RefreshCw size={13} /> Refresh
                  </button>
                </div>
                <div className="bento-card p-0 overflow-hidden">

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
                        {sitinRecords.length === 0 ? (
                          <tr><td colSpan={9} className="text-center text-gray-600 py-12 text-sm">No sit-in records yet</td></tr>
                        ) : sitinRecords.map(r => (
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
                </div>
              </div>
              )
            })()}
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
    </div>
  )
}
