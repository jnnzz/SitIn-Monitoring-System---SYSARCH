"use client"

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, User, Bell, BookOpen, History, Star, ChevronRight, X, MessageSquare, CheckCheck, Clock, Monitor, BookMarked, Zap, TrendingDown } from 'lucide-react'
import Image from 'next/image'
import ccs from '../assets/ccslogo.png'
import { ToastStack } from '@/components/ui/toast-stack'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { useToasts } from '@/lib/use-toasts'

const rules = [
  {
    icon: "🔇",
    title: "Maintain Discipline",
    description: "Maintain silence, proper decorum, and discipline inside the laboratory. Mobile phones and personal equipment must be switched off."
  },
  {
    icon: "🎮",
    title: "No Games",
    description: "Games are not allowed inside the lab — including computer-related, card games, or any games that may disturb lab operations."
  },
  {
    icon: "🌐",
    title: "Internet Usage",
    description: "Surfing the internet is allowed only with instructor permission. Downloading and installing software are strictly prohibited."
  }
]

// ── Star Rating Component ────────────────────────────────────────────────────
function StarRating({ value, onChange, readonly = false }) {
  const [hovered, setHovered] = useState(0)
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          disabled={readonly}
          onClick={() => onChange && onChange(n)}
          onMouseEnter={() => !readonly && setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          className="transition-transform hover:scale-110 disabled:cursor-default"
        >
          <Star
            size={18}
            className={`transition-colors ${(hovered || value) >= n ? 'text-amber-400 fill-amber-400' : 'text-gray-600'}`}
          />
        </button>
      ))}
    </div>
  )
}

// ── Notification Dropdown ──────────────────────────────────────────────────
function NotificationPanel({ notifications, unreadCount, onMarkRead, onMarkAll, onClose }) {
  const typeColors = {
    announcement: 'bg-purple-500',
    session: 'bg-emerald-500',
    reward: 'bg-amber-500',
  }

  return (
    <div
      className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-2xl overflow-hidden z-[200]"
      style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--app-border)' }}>
        <div className="flex items-center gap-2">
          <Bell size={16} className="text-purple-400" />
          <span className="font-bold text-sm">Notifications</span>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500 text-white">{unreadCount}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={onMarkAll}
              className="text-xs text-purple-400 hover:text-purple-300 transition flex items-center gap-1"
            >
              <CheckCheck size={13} /> Mark all read
            </button>
          )}
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/5 text-gray-500 transition">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="overflow-y-auto max-h-[380px]" style={{ scrollbarWidth: 'none' }}>
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <Bell size={36} className="mb-3 opacity-20" />
            <p className="text-sm">No notifications yet</p>
          </div>
        ) : notifications.map(n => (
          <button
            key={n.id}
            onClick={() => !n.is_read && onMarkRead(n.id)}
            className="w-full text-left px-5 py-4 flex items-start gap-3 hover:bg-white/5 transition border-b"
            style={{ borderColor: 'var(--app-border)' }}
          >
            <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${(typeColors[n.type] || typeColors.announcement)}`}
              style={{ opacity: n.is_read ? 0.3 : 1 }} />
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold leading-snug mb-1 ${n.is_read ? 'text-gray-500' : 'text-white'}`}>
                {n.title}
              </p>
              {n.message && (
                <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{n.message}</p>
              )}
              <p className="text-[10px] text-gray-600 mt-1">
                {new Date(n.created_at).toLocaleString()}
              </p>
            </div>
            {!n.is_read && (
              <div className="w-2 h-2 rounded-full bg-purple-500 shrink-0 mt-2" />
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function StudentDashboard() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('dashboard')

  // Announcements
  const [announcements, setAnnouncements] = useState([])
  const [annLoading, setAnnLoading] = useState(false)

  // Sit-in history
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)

  // Feedback modal
  const [feedbackModal, setFeedbackModal] = useState(null) // { record }
  const [feedbackText, setFeedbackText] = useState('')
  const [feedbackRating, setFeedbackRating] = useState(0)
  const [submittingFeedback, setSubmittingFeedback] = useState(false)

  // Notifications
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showNotifications, setShowNotifications] = useState(false)
  const notifRef = useRef(null)

  // Profile edit
  const [editMode, setEditMode] = useState(false)
  const [editData, setEditData] = useState({ course: '', year_level: '', address: '' })
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const { toasts, pushToast, removeToast } = useToasts()
  const fileInputRef = useRef(null)

  const getToken = () => localStorage.getItem('token')

  // ── Fetch helpers ────────────────────────────────────────────────────────────
  const fetchAnnouncements = useCallback(async () => {
    setAnnLoading(true)
    try {
      const res = await fetch('/api/auth/announcements', {
        headers: { Authorization: `Bearer ${getToken()}` }
      })
      if (res.ok) setAnnouncements(await res.json())
    } catch (e) { console.error(e) }
    setAnnLoading(false)
  }, [])

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true)
    try {
      const res = await fetch('/api/sitin/my/history', {
        headers: { Authorization: `Bearer ${getToken()}` }
      })
      if (res.ok) setHistory(await res.json())
    } catch (e) { console.error(e) }
    setHistoryLoading(false)
  }, [])

  const fetchNotifications = useCallback(async () => {
    try {
      const [notifRes, countRes] = await Promise.all([
        fetch('/api/notifications/list', { headers: { Authorization: `Bearer ${getToken()}` } }),
        fetch('/api/notifications/unread-count', { headers: { Authorization: `Bearer ${getToken()}` } })
      ])
      if (notifRes.ok) setNotifications(await notifRes.json())
      if (countRes.ok) {
        const { count } = await countRes.json()
        setUnreadCount(count)
      }
    } catch (e) { console.error(e) }
  }, [])

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/profile', {
        headers: { Authorization: `Bearer ${getToken()}` }
      })
      if (!res.ok) return
      const profile = await res.json()
      setUser(profile)
      localStorage.setItem('user', JSON.stringify(profile))
      setEditData({
        course: profile?.course || '',
        year_level: profile?.year_level || '',
        address: profile?.address || ''
      })
    } catch (e) { console.error(e) }
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')
    if (!token || !userData) { router.push('/'); return }

    const parsedUser = JSON.parse(userData)
    setUser(parsedUser)
    setEditData({
      course: parsedUser?.course || '',
      year_level: parsedUser?.year_level || '',
      address: parsedUser?.address || ''
    })
    setLoading(false)

    fetchAnnouncements()
    fetchNotifications()
    fetchProfile()

    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [router, fetchAnnouncements, fetchNotifications, fetchProfile])

  // Fetch history when switching to that tab
  useEffect(() => {
    if (activeTab === 'history') fetchHistory()
  }, [activeTab, fetchHistory])

  // Close notification panel when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // ── Notification actions ─────────────────────────────────────────────────────
  const handleMarkRead = async (id) => {
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${getToken()}` }
      })
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (e) { console.error(e) }
  }

  const handleMarkAll = async () => {
    try {
      await fetch('/api/notifications/read-all', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${getToken()}` }
      })
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch (e) { console.error(e) }
  }

  // ── Feedback submission ──────────────────────────────────────────────────────
  const handleSubmitFeedback = async () => {
    if (!feedbackModal) return
    if (feedbackRating === 0) {
      pushToast({ type: 'warning', title: 'Please select a star rating' })
      return
    }
    setSubmittingFeedback(true)
    try {
      const res = await fetch(`/api/sitin/my/feedback/${feedbackModal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ feedback: feedbackText, rating: feedbackRating })
      })
      if (res.ok) {
        setHistory(prev => prev.map(h =>
          h.id === feedbackModal.id
            ? { ...h, feedback: feedbackText, rating: feedbackRating }
            : h
        ))
        pushToast({ type: 'success', title: 'Feedback submitted!' })
        setFeedbackModal(null)
        setFeedbackText('')
        setFeedbackRating(0)
      } else {
        const data = await res.json().catch(() => null)
        pushToast({ type: 'error', title: data?.error || 'Failed to submit' })
      }
    } catch (e) {
      pushToast({ type: 'error', title: 'Connection error' })
    }
    setSubmittingFeedback(false)
  }

  // ── Profile handlers ─────────────────────────────────────────────────────────
  const handleEditChange = (e) => {
    const { name, value } = e.target
    setEditData(prev => ({ ...prev, [name]: value }))
  }

  const handleSaveProfile = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(editData)
      })
      const data = await res.json().catch(() => null)
      if (res.ok) {
        const updatedUser = { ...user, ...(data?.user || editData) }
        setUser(updatedUser)
        localStorage.setItem('user', JSON.stringify(updatedUser))
        setEditMode(false)
        pushToast({ type: 'success', title: 'Profile updated successfully' })
      } else {
        pushToast({ type: 'error', title: data?.error || 'Failed to update profile' })
      }
    } catch (e) {
      pushToast({ type: 'error', title: 'Error updating profile' })
    }
    setSaving(false)
  }

  const handleAvatarClick = () => fileInputRef.current?.click()

  const handleAvatarChange = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    setUploadingAvatar(true)
    const formData = new FormData()
    formData.append('avatar', file)
    try {
      const res = await fetch('/api/auth/avatar', {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData
      })
      const data = await res.json().catch(() => null)
      if (res.ok) {
        const updatedUser = { ...user, avatar_url: data.avatar_url }
        setUser(updatedUser)
        localStorage.setItem('user', JSON.stringify(updatedUser))
        pushToast({ type: 'success', title: 'Profile picture updated' })
      } else {
        pushToast({ type: 'error', title: data?.error || 'Failed to upload picture' })
      }
    } catch (e) {
      pushToast({ type: 'error', title: 'Error uploading picture' })
    }
    setUploadingAvatar(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/')
  }

  if (loading) {
    return (
      <div className="app-theme-shell w-full min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse w-16 h-16 rounded-full mx-auto mb-6" style={{ backgroundColor: 'var(--app-accent)', boxShadow: '0 0 30px var(--app-accent-soft)' }} />
          <div className="text-2xl font-bold mb-2" style={{ color: 'var(--app-accent)' }}>Loading Dashboard...</div>
        </div>
      </div>
    )
  }

  const remainingSessions = user?.remaining_sessions ?? 30
  const sessionPercent = Math.min(100, (remainingSessions / 30) * 100)
  const sessionColor = remainingSessions > 15 ? '#22c55e' : remainingSessions > 5 ? '#f59e0b' : '#ef4444'

  const tabs = [
    { key: 'dashboard', label: 'Overview', icon: <User size={15} /> },
    { key: 'history', label: 'Sit-In History', icon: <History size={15} /> },
    { key: 'settings', label: 'Settings', icon: <User size={15} /> },
  ]

  return (
    <div className="app-theme-shell w-full min-h-screen text-white" style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

        body, html { background-color: var(--app-bg); margin: 0; padding: 0; overflow-x: hidden; }

        .bento-card {
          background: var(--app-surface);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid var(--app-border);
          border-radius: 20px;
          padding: 24px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: var(--app-shadow);
        }
        .bento-card:hover {
          border: 1px solid var(--app-accent);
          transform: translateY(-2px);
          box-shadow: 0 10px 34px var(--app-accent-soft);
        }

        .glass-nav {
          background: var(--app-nav-bg);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
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

        .session-ring {
          background: conic-gradient(
            var(--ring-color) var(--ring-pct),
            rgba(255,255,255,0.05) var(--ring-pct)
          );
        }

        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }

        .notif-badge {
          animation: pulse-badge 2s ease-in-out infinite;
        }
        @keyframes pulse-badge {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }

        .history-row { transition: background 0.15s; }
        .history-row:hover { background: rgba(255,255,255,0.03); }
      `}</style>

      {/* ── NAV ── */}
      <nav className="glass-nav sticky top-0 z-50 flex items-center justify-between px-8 py-4 lg:px-12">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center bg-transparent">
            <Image src={ccs} alt="CCS Logo" width={40} height={40} className="object-contain" />
          </div>
          <div>
            <div className="font-bold text-lg tracking-tight">SitIn Monitor</div>
            <div className="text-xs text-gray-400 font-medium">Student Portal</div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <ThemeToggle label={false} className="inline-flex" />

          {/* Notification Bell */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => { setShowNotifications(p => !p); if (!showNotifications) fetchNotifications() }}
              className="relative p-2.5 rounded-xl transition"
              style={{ background: showNotifications ? 'rgba(167,139,250,0.15)' : 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <Bell size={18} className={unreadCount > 0 ? 'text-purple-400' : 'text-gray-400'} />
              {unreadCount > 0 && (
                <span className="notif-badge absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center rounded-full bg-purple-500 text-[10px] font-bold text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            {showNotifications && (
              <NotificationPanel
                notifications={notifications}
                unreadCount={unreadCount}
                onMarkRead={handleMarkRead}
                onMarkAll={handleMarkAll}
                onClose={() => setShowNotifications(false)}
              />
            )}
          </div>

          {/* User pill */}
          <div className="hidden sm:flex items-center gap-3 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)] py-1.5 px-3 rounded-full overflow-hidden">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="Profile" className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 flex shrink-0 items-center justify-center text-sm font-bold">
                {user?.full_name?.charAt(0).toUpperCase() || 'S'}
              </div>
            )}
            <div className="pr-2">
              <div className="text-sm font-semibold leading-tight">{user?.full_name || 'Student'}</div>
              <div className="text-[10px] text-gray-400">{user?.student_id || 'ID Unknown'}</div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.05)] transition-all"
          >
            <LogOut size={16} className="text-gray-300" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </nav>

      {/* ── MAIN CONTENT ── */}
      <div className="px-6 lg:px-12 py-8 max-w-[1600px] mx-auto">

        {/* Tabs */}
        <div className="flex gap-6 mb-8 border-b border-[rgba(255,255,255,0.05)] overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`tab-btn text-sm font-semibold pb-4 flex items-center gap-2 whitespace-nowrap ${activeTab === t.key ? 'active' : 'text-gray-500'}`}
            >
              {t.icon} {t.label}
              {t.key === 'announcements' && announcements.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-purple-500/20 text-purple-400">
                  {announcements.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ══════ DASHBOARD TAB ══════ */}
        {activeTab === 'dashboard' && (
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">
            
            {/* ── LEFT COLUMN: ALL ANNOUNCEMENTS ── */}
            <div className="w-full lg:w-[35%] flex flex-col gap-6 shrink-0 lg:sticky lg:top-[90px]">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Announcements</h2>
                  <p className="text-sm text-gray-400 mt-1">Latest updates</p>
                </div>
                <button onClick={fetchAnnouncements} className="px-4 py-2 rounded-xl text-xs font-bold bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.05)] transition text-gray-300">
                  Refresh
                </button>
              </div>

              {annLoading ? (
                <div className="bento-card flex items-center justify-center py-16">
                  <div className="w-10 h-10 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
                </div>
              ) : announcements.length === 0 ? (
                <div className="bento-card flex flex-col items-center justify-center py-16 text-gray-500">
                  <Bell size={48} className="mb-4 opacity-20" />
                  <p className="font-semibold">No announcements yet</p>
                  <p className="text-sm text-gray-600 mt-1">Check back later for updates</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4 max-h-[80vh] overflow-y-auto pr-2 custom-scrollbar">
                  {announcements.map((ann, i) => {
                    const typeConfig = {
                      important: { color: 'border-red-500', badge: 'bg-red-500/15 text-red-400', label: 'Important' },
                      success: { color: 'border-emerald-500', badge: 'bg-emerald-500/15 text-emerald-400', label: 'Update' },
                      info: { color: 'border-blue-500', badge: 'bg-blue-500/15 text-blue-400', label: 'Info' },
                    }
                    const cfg = typeConfig[ann.type] || typeConfig.info
                    return (
                      <div key={ann.id} className={`bento-card border-l-4 ${cfg.color}`}>
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="flex items-center gap-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${cfg.badge}`}>
                              {cfg.label}
                            </span>
                            <h3 className="font-bold text-base line-clamp-1" title={ann.title}>{ann.title}</h3>
                          </div>
                        </div>
                        <p className="text-sm text-gray-300 leading-relaxed mb-3">{ann.content}</p>
                        <div className="text-xs text-gray-500">{ann.date}</div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* ── RIGHT COLUMN: STUDENT INFO, STATS, RULES ── */}
            <div className="w-full lg:w-[65%] flex flex-col gap-6 lg:gap-8">
              
              {/* Top Section Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
                
                {/* 1. Student Info */}
                <div className="bento-card flex flex-col justify-center gap-6 relative overflow-hidden">
                  <div className="absolute -top-24 -right-24 w-64 h-64 bg-purple-600 rounded-full mix-blend-multiply filter blur-[80px] opacity-20" />
                  <div className="relative z-10 flex items-center gap-4">
                    {user?.avatar_url ? (
                      <img src={user.avatar_url} alt="Profile" className="w-16 h-16 rounded-xl object-cover shadow-[0_4px_20px_rgba(77,47,178,0.3)]" />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#4D2FB2] to-[#B153D7] flex shrink-0 items-center justify-center text-2xl font-black shadow-[0_4px_20px_rgba(77,47,178,0.3)]">
                        {user?.full_name?.charAt(0).toUpperCase() || 'S'}
                      </div>
                    )}
                    <div>
                      <h1 className="text-lg lg:text-xl font-bold mb-1 tracking-tight">
                        Welcome back, {user?.full_name?.split(' ')[0] || 'Student'}!
                      </h1>
                      <div className="text-xs font-medium text-purple-300">{user?.email || 'No email on record'}</div>
                    </div>
                  </div>
                  
                  <div className="relative z-10 grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-1">Student ID</div>
                      <div className="font-medium text-sm">{user?.student_id || 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-1">Course</div>
                      <div className="font-medium text-sm text-purple-300">{user?.course || 'Not Set'}</div>
                    </div>
                    <div className="col-span-2">
                       <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-1">Year Level</div>
                       <div className="font-medium text-sm">{user?.year_level || 'Not Set'}</div>
                    </div>
                  </div>
                </div>

                {/* 2. Sessions and Stats */}
                <div className="flex flex-col gap-4 lg:gap-6">
                  {/* Remaining Sessions */}
                  <div className="bento-card flex-1 flex flex-col items-center justify-center py-6 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-900/10 to-indigo-900/5 cursor-pointer" />
                    <div className="relative z-10 flex items-center justify-center gap-6 sm:gap-8 w-full">
                      {/* Circular progress ring */}
                      <div className="relative w-28 h-28 shrink-0">
                        <div
                          className="session-ring w-full h-full rounded-full"
                          style={{
                            '--ring-color': sessionColor,
                            '--ring-pct': `${sessionPercent}%`,
                            padding: '6px'
                          }}
                        >
                          <div className="w-full h-full rounded-full flex flex-col items-center justify-center"
                            style={{ background: 'var(--app-bg)' }}>
                            <span className="text-3xl font-black leading-none" style={{ color: sessionColor }}>{remainingSessions}</span>
                            <span className="text-[10px] text-gray-500 font-semibold mt-1">of 30</span>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Remaining</p>
                        <p className="text-sm font-semibold" style={{ color: sessionColor }}>
                          {remainingSessions > 15 ? '✓ Available' : remainingSessions > 5 ? '⚠ Running Low' : remainingSessions === 0 ? '✗ No Sessions' : '⚠ Very Low'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {remainingSessions === 0
                            ? 'Contact admin'
                            : `${30 - remainingSessions} sessions used`}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Quick Cards */}
                  <div className="grid grid-cols-2 gap-4 lg:gap-6">
                    <div className="bento-card flex flex-col justify-center py-4 text-center items-center">
                      <div className="flex items-center gap-2 opacity-80 mb-2">
                        <Monitor size={14} className="text-emerald-400" />
                        <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Total Sit-Ins</div>
                      </div>
                      <div className="text-2xl font-black">{30 - remainingSessions}</div>
                    </div>
                    <div className="bento-card flex flex-col justify-center py-4 text-center items-center">
                      <div className="flex items-center gap-2 opacity-80 mb-2">
                        <Bell size={14} className="text-amber-400" />
                        <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Updates</div>
                      </div>
                      <div className="text-2xl font-black">{announcements.length}</div>
                    </div>
                  </div>
                </div>

              </div>
              
              {/* Rules & Regulations */}
              <div className="bento-card relative overflow-hidden flex-1">
                <div className="absolute bottom-0 right-0 w-64 h-64 bg-emerald-600 rounded-full mix-blend-multiply filter blur-[100px] opacity-[0.05]" />
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[rgba(255,255,255,0.05)] relative z-10">
                  <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400"><BookOpen size={20} /></div>
                  <h2 className="text-lg font-bold">Lab Regulations</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
                  {rules.map((rule, i) => (
                    <div key={i} className="flex flex-col gap-3">
                      <div className="w-10 h-10 rounded-xl bg-black/30 flex items-center justify-center text-xl shrink-0 border border-[rgba(255,255,255,0.02)]">
                        {rule.icon}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold mb-1 text-gray-200">{rule.title}</h3>
                        <p className="text-xs text-gray-400 leading-relaxed">{rule.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ══════ SIT-IN HISTORY TAB ══════ */}
        {activeTab === 'history' && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Sit-In History</h2>
                <p className="text-sm text-gray-400 mt-1">
                  {history.length} session{history.length !== 1 ? 's' : ''} recorded
                </p>
              </div>
              <button
                onClick={fetchHistory}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.05)] transition text-gray-300"
              >
                Refresh
              </button>
            </div>

            {historyLoading ? (
              <div className="bento-card flex items-center justify-center py-16">
                <div className="text-center text-gray-500">
                  <div className="w-10 h-10 rounded-full border-2 border-purple-500 border-t-transparent animate-spin mx-auto mb-4" />
                  <p className="text-sm">Loading history...</p>
                </div>
              </div>
            ) : history.length === 0 ? (
              <div className="bento-card flex flex-col items-center justify-center py-16 text-gray-500">
                <History size={48} className="mb-4 opacity-20" />
                <p className="font-semibold">No sit-in history yet</p>
                <p className="text-sm text-gray-600 mt-1">Your completed sessions will appear here</p>
              </div>
            ) : (
              <div className="bento-card p-0 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[rgba(255,255,255,0.06)] bg-[rgba(0,0,0,0.2)]">
                        <th className="text-left text-xs font-bold text-gray-500 uppercase tracking-wider px-6 py-4 w-10">#</th>
                        <th className="text-left text-xs font-bold text-gray-500 uppercase tracking-wider px-6 py-4">Laboratory</th>
                        <th className="text-left text-xs font-bold text-gray-500 uppercase tracking-wider px-6 py-4">Purpose</th>
                        <th className="text-left text-xs font-bold text-gray-500 uppercase tracking-wider px-6 py-4">Date</th>
                        <th className="text-left text-xs font-bold text-gray-500 uppercase tracking-wider px-6 py-4">Time In</th>
                        <th className="text-left text-xs font-bold text-gray-500 uppercase tracking-wider px-6 py-4">Time Out</th>
                        <th className="text-left text-xs font-bold text-gray-500 uppercase tracking-wider px-6 py-4">Duration</th>
                        <th className="text-left text-xs font-bold text-gray-500 uppercase tracking-wider px-6 py-4">Rating</th>
                        <th className="text-left text-xs font-bold text-gray-500 uppercase tracking-wider px-6 py-4">Feedback</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((record, idx) => {
                        const startDate = record.started_at ? new Date(record.started_at) : null
                        const endDate = record.ended_at ? new Date(record.ended_at) : null
                        const dateLabel = endDate
                          ? endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                          : '—'
                        const timeIn = startDate
                          ? startDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                          : '—'
                        const timeOut = endDate
                          ? endDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                          : '—'
                        const durationMin = record.duration_minutes
                        const durationLabel = durationMin != null
                          ? durationMin >= 60
                            ? `${Math.floor(durationMin / 60)}h ${durationMin % 60}m`
                            : `${durationMin} min`
                          : '—'

                        return (
                          <tr
                            key={record.id}
                            className="history-row border-b border-[rgba(255,255,255,0.03)]"
                          >
                            {/* # */}
                            <td className="px-6 py-4 text-xs font-bold text-gray-600">
                              {history.length - idx}
                            </td>

                            {/* Lab */}
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 shrink-0">
                                  <Monitor size={13} />
                                </div>
                                <span className="text-sm font-semibold whitespace-nowrap">{record.lab_name ?? '—'}</span>
                              </div>
                            </td>

                            {/* Purpose */}
                            <td className="px-6 py-4">
                              <span className="text-xs px-2.5 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-lg font-semibold whitespace-nowrap">
                                {record.purpose ?? '—'}
                              </span>
                            </td>

                            {/* Date */}
                            <td className="px-6 py-4 text-sm text-gray-300 whitespace-nowrap">
                              {dateLabel}
                            </td>

                            {/* Time In */}
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-1.5 text-sm text-emerald-400 font-semibold whitespace-nowrap">
                                <Clock size={12} className="shrink-0" />
                                {timeIn}
                              </div>
                            </td>

                            {/* Time Out */}
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-1.5 text-sm text-red-400 font-semibold whitespace-nowrap">
                                <Clock size={12} className="shrink-0" />
                                {timeOut}
                              </div>
                            </td>

                            {/* Duration */}
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
                                {durationLabel}
                              </span>
                            </td>

                            {/* Rating */}
                            <td className="px-6 py-4">
                              {record.rating ? (
                                <StarRating value={record.rating} readonly />
                              ) : (
                                <span className="text-gray-600 text-xs italic">—</span>
                              )}
                            </td>

                            {/* Feedback */}
                            <td className="px-6 py-4">
                              {record.feedback ? (
                                <span
                                  className="text-xs text-gray-400 max-w-[180px] truncate block"
                                  title={record.feedback}
                                >
                                  "{record.feedback}"
                                </span>
                              ) : (
                                <button
                                  onClick={() => {
                                    setFeedbackModal(record)
                                    setFeedbackRating(record.rating || 0)
                                    setFeedbackText('')
                                  }}
                                  className="flex items-center gap-1.5 text-xs font-semibold text-purple-400 hover:text-purple-300 transition px-3 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 whitespace-nowrap"
                                >
                                  <MessageSquare size={12} /> Leave Feedback
                                </button>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Summary footer */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-[rgba(255,255,255,0.05)] bg-[rgba(0,0,0,0.15)]">
                  <p className="text-xs text-gray-500">
                    Showing <span className="font-bold text-gray-300">{history.length}</span> session{history.length !== 1 ? 's' : ''}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>
                      Total duration: <span className="font-bold text-emerald-400">
                        {(() => {
                          const total = history.reduce((sum, r) => sum + (r.duration_minutes || 0), 0)
                          return total >= 60 ? `${Math.floor(total / 60)}h ${total % 60}m` : `${total} min`
                        })()}
                      </span>
                    </span>
                    <span>
                      Avg duration: <span className="font-bold text-purple-400">
                        {(() => {
                          const withDuration = history.filter(r => r.duration_minutes != null)
                          if (withDuration.length === 0) return '—'
                          const avg = Math.round(withDuration.reduce((s, r) => s + r.duration_minutes, 0) / withDuration.length)
                          return avg >= 60 ? `${Math.floor(avg / 60)}h ${avg % 60}m` : `${avg} min`
                        })()}
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}




        {/* ══════ SETTINGS TAB ══════ */}
        {activeTab === 'settings' && (
          <div className="max-w-3xl mx-auto">
            <div className="bento-card mt-4">
              <div className="flex items-center justify-between mb-8 pb-6 border-b border-[rgba(255,255,255,0.05)]">
                <div>
                  <h2 className="text-2xl font-bold mb-1">Account Configuration</h2>
                  <p className="text-sm text-gray-400">Manage your profile details and preferences.</p>
                </div>
              </div>

              <div className="space-y-6">
                {/* Read-only info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-5 rounded-xl bg-black/20 border border-[rgba(255,255,255,0.03)]">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">Legal Name</label>
                    <div className="text-sm font-medium text-gray-300">{user?.full_name || 'N/A'}</div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">Student ID</label>
                    <div className="text-sm font-medium text-purple-400">{user?.student_id || 'N/A'}</div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">Email</label>
                    <div className="text-sm font-medium text-gray-300">{user?.email || <span className="text-gray-600 italic">Not registered</span>}</div>
                  </div>
                </div>

                {/* Avatar */}
                <div className="p-5 rounded-xl bg-black/20 border border-[rgba(255,255,255,0.03)] flex flex-col sm:flex-row items-center gap-6">
                  {user?.avatar_url ? (
                    <img src={user.avatar_url} alt="Current profile" className="w-20 h-20 rounded-2xl object-cover shadow-lg" />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-2xl font-bold shadow-lg">
                      {user?.full_name?.charAt(0).toUpperCase() || 'S'}
                    </div>
                  )}
                  <div className="flex-1 text-center sm:text-left">
                    <h3 className="font-bold mb-1">Profile Picture</h3>
                    <p className="text-xs text-gray-400 mb-4 max-w-sm">Upload a new square image. Max size: 5MB.</p>
                    <input type="file" ref={fileInputRef} onChange={handleAvatarChange} accept="image/*" className="hidden" />
                    <button
                      onClick={handleAvatarClick}
                      disabled={uploadingAvatar}
                      className="px-5 py-2 rounded-xl text-xs font-bold bg-[#4D2FB2]/20 hover:bg-[#4D2FB2]/30 border border-[#4D2FB2]/50 text-[#b096fa] transition disabled:opacity-50"
                    >
                      {uploadingAvatar ? 'Uploading...' : 'Upload New Photo'}
                    </button>
                  </div>
                </div>

                {/* Editable fields */}
                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">Course</label>
                      {!editMode ? (
                        <div className="p-3.5 bg-[rgba(0,0,0,0.3)] rounded-xl text-sm border border-[rgba(255,255,255,0.02)] min-h-[46px] flex items-center">{user?.course || 'Not Set'}</div>
                      ) : (
                        <input type="text" name="course" value={editData.course} onChange={handleEditChange} placeholder="e.g. BSIT"
                          className="w-full p-3.5 bg-[rgba(255,255,255,0.03)] rounded-xl text-sm border border-[#4D2FB2] text-white focus:outline-none transition" />
                      )}
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">Year Level</label>
                      {!editMode ? (
                        <div className="p-3.5 bg-[rgba(0,0,0,0.3)] rounded-xl text-sm border border-[rgba(255,255,255,0.02)] min-h-[46px] flex items-center">{user?.year_level || 'Not Set'}</div>
                      ) : (
                        <select name="year_level" value={editData.year_level} onChange={handleEditChange}
                          className="w-full p-3.5 bg-[rgba(255,255,255,0.03)] rounded-xl text-sm border border-[#4D2FB2] text-white focus:outline-none appearance-none transition">
                          <option value="" className="bg-[#0f1127]">Select Year</option>
                          <option value="1st Year" className="bg-[#0f1127]">1st Year</option>
                          <option value="2nd Year" className="bg-[#0f1127]">2nd Year</option>
                          <option value="3rd Year" className="bg-[#0f1127]">3rd Year</option>
                          <option value="4th Year" className="bg-[#0f1127]">4th Year</option>
                        </select>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">Current Address</label>
                    {!editMode ? (
                      <div className="p-3.5 bg-[rgba(0,0,0,0.3)] rounded-xl text-sm border border-[rgba(255,255,255,0.02)] min-h-[80px]">{user?.address || 'Not Set'}</div>
                    ) : (
                      <textarea name="address" value={editData.address} onChange={handleEditChange} placeholder="Enter your full address" rows="3"
                        className="w-full p-3.5 bg-[rgba(255,255,255,0.03)] rounded-xl text-sm border border-[#4D2FB2] text-white focus:outline-none resize-none transition" />
                    )}
                  </div>
                </div>

                <div className="pt-6 border-t border-[rgba(255,255,255,0.05)] flex gap-4">
                  {!editMode ? (
                    <button onClick={() => setEditMode(true)} className="px-6 py-3 rounded-xl text-sm font-bold bg-[#4D2FB2] hover:bg-[#5c3bd8] transition text-white shadow-lg">
                      Enable Editing
                    </button>
                  ) : (
                    <>
                      <button onClick={handleSaveProfile} disabled={saving} className="theme-solid-button px-6 py-3 rounded-xl flex-1 sm:flex-none text-sm font-bold hover:opacity-90 transition shadow-lg disabled:opacity-50">
                        {saving ? 'Saving...' : 'Save Profile'}
                      </button>
                      <button onClick={() => { setEditMode(false); setEditData({ course: user?.course || '', year_level: user?.year_level || '', address: user?.address || '' }) }} disabled={saving}
                        className="px-6 py-3 rounded-xl flex-1 sm:flex-none text-sm font-bold bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.1)] transition text-white">
                        Discard
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      <ToastStack toasts={toasts} onDismiss={removeToast} />

      {/* ── FEEDBACK MODAL ── */}
      {feedbackModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#0d0d1f] border border-[rgba(255,255,255,0.08)] rounded-2xl w-full max-w-md shadow-2xl p-7">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold">Leave Feedback</h3>
              <button onClick={() => setFeedbackModal(null)} className="p-1.5 rounded-lg hover:bg-white/5 text-gray-500">
                <X size={18} />
              </button>
            </div>

            {/* Session info */}
            <div className="flex items-center gap-3 p-4 rounded-xl bg-black/30 border border-[rgba(255,255,255,0.04)] mb-6">
              <Monitor size={20} className="text-purple-400 shrink-0" />
              <div>
                <div className="font-bold text-sm">{feedbackModal.lab_name}</div>
                <div className="text-xs text-gray-400">
                  {feedbackModal.purpose} · {feedbackModal.duration_minutes} min ·{' '}
                  {feedbackModal.ended_at ? new Date(feedbackModal.ended_at).toLocaleDateString() : ''}
                </div>
              </div>
            </div>

            <div className="space-y-5 mb-6">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-3">Your Rating *</label>
                <StarRating value={feedbackRating} onChange={setFeedbackRating} />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Comments (optional)</label>
                <textarea
                  value={feedbackText}
                  onChange={e => setFeedbackText(e.target.value)}
                  placeholder="How was your session? Any issues with the equipment?"
                  rows={3}
                  className="w-full bg-black/30 border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 resize-none transition"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSubmitFeedback}
                disabled={submittingFeedback || feedbackRating === 0}
                className="flex-1 py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-purple-500 to-indigo-500 text-white hover:opacity-90 disabled:opacity-40 transition"
              >
                {submittingFeedback ? 'Submitting...' : '✓ Submit Feedback'}
              </button>
              <button
                onClick={() => setFeedbackModal(null)}
                className="px-5 py-3 rounded-xl text-sm font-bold bg-white/5 hover:bg-white/10 border border-white/10 text-white transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
