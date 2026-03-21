"use client"

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, User, Bell, BookOpen } from 'lucide-react'
import Image from 'next/image'
import ccs from '../assets/ccslogo.png'

const announcements = [
  {
    id: 1,
    title: "Lab Maintenance Notice",
    date: "March 20, 2026",
    content: "All laboratories will be closed on March 25-26 for scheduled maintenance.",
    type: "important"
  },
  {
    id: 2,
    title: "New Software Available",
    date: "March 18, 2026",
    content: "Visual Studio Code and GitHub Desktop have been installed on all lab computers.",
    type: "info"
  },
  {
    id: 3,
    title: "Session Tracking System Live",
    date: "March 15, 2026",
    content: "The SitIn Monitoring System is now active. Please log in for accurate session tracking.",
    type: "success"
  }
]

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

export default function StudentDashboard() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [editMode, setEditMode] = useState(false)
  const [editData, setEditData] = useState({
    course: '',
    year_level: '',
    address: ''
  })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')

    if (!token || !userData) {
      router.push('/')
      return
    }

    const parsedUser = JSON.parse(userData)
    setUser(parsedUser)
    setEditData({
      course: parsedUser?.course || '',
      year_level: parsedUser?.year_level || '',
      address: parsedUser?.address || ''
    })
    setLoading(false)
  }, [router])

  const handleEditChange = (e) => {
    const { name, value } = e.target
    setEditData(prev => ({ ...prev, [name]: value }))
  }

  const handleSaveProfile = async () => {
    setSaving(true)
    setMessage({ type: '', text: '' })

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('http://localhost:5000/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editData)
      })

      if (response.ok) {
        const updatedUser = { ...user, ...editData }
        setUser(updatedUser)
        localStorage.setItem('user', JSON.stringify(updatedUser))
        setEditMode(false)
        setMessage({ type: 'success', text: '✅ Profile updated successfully!' })
        setTimeout(() => setMessage({ type: '', text: '' }), 3000)
      } else {
        setMessage({ type: 'error', text: '❌ Failed to update profile' })
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      setMessage({ type: 'error', text: '❌ Error updating profile' })
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/')
  }

  if (loading) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center bg-[#05050D]">
        <div className="text-center">
          <div className="animate-pulse w-16 h-16 rounded-full bg-[#4D2FB2] mx-auto mb-6 shadow-[0_0_40px_rgba(77,47,178,0.6)]"></div>
          <div className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600 mb-2">Analyzing Session Data...</div>
          <div className="text-gray-500">Preparing your dashboard experience</div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full min-h-screen text-white bg-[#05050D]" style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        
        body, html {
          background-color: #05050D;
          margin: 0;
          padding: 0;
          overflow-x: hidden;
        }

        .bento-card {
          background: rgba(18, 18, 38, 0.4);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 20px;
          padding: 24px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 30px rgba(0, 0, 0, 0.2);
        }

        .bento-card:hover {
          border: 1px solid rgba(77, 47, 178, 0.3);
          transform: translateY(-2px);
          box-shadow: 0 10px 40px rgba(77, 47, 178, 0.15);
        }

        .glass-nav {
          background: rgba(5, 5, 13, 0.8);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .tab-btn {
          transition: all 0.2s;
          position: relative;
        }
        
        .tab-btn.active {
          color: #fff;
        }
        
        .tab-btn.active::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          height: 2px;
          background: linear-gradient(90deg, #4D2FB2, #B153D7);
          border-radius: 2px 2px 0 0;
        }
        
        .tab-btn:hover:not(.active) {
          color: rgba(255,255,255,0.8);
        }

        /* Custom Scrollbar for overflow areas */
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}</style>

      {/* Navigation Bar */}
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

        <div className="flex items-center gap-6">
          <div className="hidden sm:flex items-center gap-3 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)] py-1.5 px-3 rounded-full">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 flex items-center justify-center text-sm font-bold shadow-sm">
              {user?.full_name?.charAt(0).toUpperCase() || 'S'}
            </div>
            <div className="pr-2">
              <div className="text-sm font-semibold leading-tight">{user?.full_name || 'Student'}</div>
              <div className="text-[10px] text-gray-400">{user?.student_id || 'ID Unknown'}</div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.05)] transition-all duration-200"
          >
            <LogOut size={16} className="text-gray-300" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </nav>

      {/* Main Content Container */}
      <div className="px-6 lg:px-12 py-8 max-w-[1600px] mx-auto">

        {/* Navigation Tabs */}
        <div className="flex gap-8 mb-8 border-b border-[rgba(255,255,255,0.05)]">
          {['dashboard', 'settings'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`tab-btn text-sm font-semibold pb-4 flex items-center gap-2 ${activeTab === tab ? 'active' : 'text-gray-500'}`}
            >
              {tab === 'dashboard' ? <><User size={16} /> Overview</> : <><User size={16} /> Account Settings</>}
            </button>
          ))}
        </div>

        {/* DASHBOARD VIEW (Single Screen Bento Layout) */}
        {activeTab === 'dashboard' && (
          <div className="flex flex-col gap-6 lg:gap-8">
            {/* TOP SECTION: Welcome */}
            <div className="grid grid-cols-1 gap-6 lg:gap-8">

              {/* Profile Overview Banner */}
              <div className="bento-card relative overflow-hidden flex flex-col justify-center min-h-[220px]">
                {/* Decorative background blur */}
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-purple-600 rounded-full mix-blend-multiply filter blur-[80px] opacity-30 animate-pulse"></div>

                <div className="relative z-10 flex flex-col md:flex-row gap-6 md:items-center">
                  <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl bg-gradient-to-br from-[#4D2FB2] to-[#B153D7] flex shrink-0 items-center justify-center text-4xl md:text-5xl font-black shadow-[0_8px_30px_rgba(77,47,178,0.4)]">
                    {user?.full_name?.charAt(0).toUpperCase() || 'S'}
                  </div>
                  <div className="flex-1">
                    <h1 className="text-2xl md:text-4xl font-bold mb-1 tracking-tight">Welcome back, {user?.full_name?.split(' ')[0] || 'Student'}!</h1>
                    <div className="text-sm font-medium text-purple-300 mb-4">{user?.email || <span className="text-gray-500 italic">No email on record</span>}</div>
                    <p className="text-gray-400 mb-6 max-w-lg">
                      Ready for today's lab sessions? Ensure you follow the rules and check the latest announcements below.
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div>
                        <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Student ID</div>
                        <div className="font-medium text-white">{user?.student_id || 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Course</div>
                        <div className="font-medium text-purple-300">{user?.course || 'Not Set'}</div>
                      </div>
                      <div className="hidden sm:block">
                        <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Year</div>
                        <div className="font-medium text-white">{user?.year_level || 'Not Set'}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* MIDDLE SECTION: Announcements & Rules */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 min-h-[400px]">

              {/* Announcements Box */}
              <div className="bento-card flex flex-col">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[rgba(255,255,255,0.05)]">
                  <div className="p-2 bg-[#4D2FB2]/20 rounded-lg text-[#b096fa]">
                    <Bell size={20} />
                  </div>
                  <h2 className="text-lg font-bold">Latest Announcements</h2>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 space-y-4 max-h-[360px]">
                  {announcements.length > 0 ? (
                    announcements.map((ann, i) => (
                      <div key={ann.id} className="p-4 rounded-xl bg-[rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.02)] transition-colors group cursor-default">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-bold text-gray-100 group-hover:text-purple-300 transition-colors">{ann.title}</h3>
                          <span className="text-[10px] font-semibold tracking-wider text-gray-500 bg-black/40 px-2 py-1 rounded">{ann.date}</span>
                        </div>
                        <p className="text-sm text-gray-400 leading-relaxed">{ann.content}</p>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                      <Bell size={48} className="mb-4 opacity-20" />
                      <p>No new announcements</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Rules & Regulations Box */}
              <div className="bento-card flex flex-col relative overflow-hidden">
                <div className="absolute bottom-0 right-0 w-64 h-64 bg-pink-600 rounded-full mix-blend-multiply filter blur-[100px] opacity-10"></div>

                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[rgba(255,255,255,0.05)] relative z-10">
                  <div className="p-2 bg-pink-500/20 rounded-lg text-pink-400">
                    <BookOpen size={20} />
                  </div>
                  <h2 className="text-lg font-bold">Lab Regulations</h2>
                </div>

                <div className="flex-1 space-y-5 relative z-10">
                  {rules.map((rule, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="w-12 h-12 rounded-xl bg-black/30 flex items-center justify-center text-2xl shrink-0 border border-[rgba(255,255,255,0.02)]">
                        {rule.icon}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold mb-1 text-gray-200">{rule.title}</h3>
                        <p className="text-xs text-gray-400 leading-relaxed font-medium">
                          {rule.description}
                        </p>
                      </div>
                    </div>
                  ))}

                  <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-pink-500/10 to-transparent border-l-2 border-pink-500">
                    <h4 className="text-xs font-bold text-pink-400 mb-1">IMPORTANT</h4>
                    <p className="text-xs text-gray-400 leading-relaxed">Violations may result in suspension of lab access. Please adhere to these guidelines for a conducive environment.</p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === 'settings' && (
          <div className="max-w-3xl mx-auto">
            <div className="bento-card mt-4">
              <div className="flex items-center justify-between mb-8 pb-6 border-b border-[rgba(255,255,255,0.05)]">
                <div>
                  <h2 className="text-2xl font-bold mb-1">Account Configuration</h2>
                  <p className="text-sm text-gray-400">Manage your profile details and preferences.</p>
                </div>
              </div>

              {message.text && (
                <div className={`p-4 mb-6 rounded-xl text-sm font-semibold border ${message.type === 'success' ? 'bg-emerald-900/20 text-emerald-400 border-emerald-500/30' : 'bg-red-900/20 text-red-400 border-red-500/30'}`}>
                  {message.text}
                </div>
              )}

              <div className="space-y-6">
                {/* Read only block */}
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

                {/* Edits */}
                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">Course Target</label>
                      {!editMode ? (
                        <div className="p-3.5 bg-[rgba(0,0,0,0.3)] rounded-xl text-sm border border-[rgba(255,255,255,0.02)] min-h-[46px] flex items-center">{user?.course || 'Not Set'}</div>
                      ) : (
                        <input
                          type="text" name="course" value={editData.course} onChange={handleEditChange} placeholder="e.g. BSIT"
                          className="w-full p-3.5 bg-[rgba(255,255,255,0.03)] rounded-xl text-sm border border-[#4D2FB2] text-white focus:outline-none focus:ring-2 focus:ring-[#4D2FB2] transition"
                        />
                      )}
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">Year Level</label>
                      {!editMode ? (
                        <div className="p-3.5 bg-[rgba(0,0,0,0.3)] rounded-xl text-sm border border-[rgba(255,255,255,0.02)] min-h-[46px] flex items-center">{user?.year_level || 'Not Set'}</div>
                      ) : (
                        <select
                          name="year_level" value={editData.year_level} onChange={handleEditChange}
                          className="w-full p-3.5 bg-[rgba(255,255,255,0.03)] rounded-xl text-sm border border-[#4D2FB2] text-white focus:outline-none focus:ring-2 focus:ring-[#4D2FB2] appearance-none transition"
                        >
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
                      <textarea
                        name="address" value={editData.address} onChange={handleEditChange} placeholder="Enter your full address" rows="3"
                        className="w-full p-3.5 bg-[rgba(255,255,255,0.03)] rounded-xl text-sm border border-[#4D2FB2] text-white focus:outline-none focus:ring-2 focus:ring-[#4D2FB2] resize-none transition"
                      />
                    )}
                  </div>
                </div>

                <div className="pt-6 border-t border-[rgba(255,255,255,0.05)] flex gap-4">
                  {!editMode ? (
                    <button onClick={() => setEditMode(true)} className="px-6 py-3 rounded-xl block w-full sm:w-auto text-sm font-bold bg-[#4D2FB2] hover:bg-[#5c3bd8] transition text-white shadow-lg">
                      Enable Editing
                    </button>
                  ) : (
                    <>
                      <button onClick={handleSaveProfile} disabled={saving} className="px-6 py-3 rounded-xl flex-1 sm:flex-none text-sm font-bold bg-gradient-to-r from-emerald-500 to-emerald-400 text-emerald-950 hover:opacity-90 transition shadow-lg disabled:opacity-50">
                        {saving ? 'Saving Profile...' : 'Save Profile'}
                      </button>
                      <button onClick={() => { setEditMode(false); setEditData({ course: user?.course || '', year_level: user?.year_level || '', address: user?.address || '' }) }} disabled={saving} className="px-6 py-3 rounded-xl flex-1 sm:flex-none text-sm font-bold bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.1)] transition text-white">
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
    </div>
  )
}
