"use client"

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, User, Activity, Settings, Zap, Clock, Map, CheckCircle } from 'lucide-react'
import Image from 'next/image'
import ccs from '../assets/ccslogo.png'

export default function Dashboard() {
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
        const data = await response.json()
        const updatedUser = { ...user, ...editData, ...data.user }
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
          <div className="animate-pulse w-16 h-16 rounded-full bg-[#FF6B6B] mx-auto mb-6 shadow-[0_0_40px_rgba(255,107,107,0.6)]"></div>
          <div className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-red-400 to-orange-500 mb-2">Connecting to System...</div>
          <div className="text-gray-500">Authenticating administrator access</div>
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
          border: 1px solid rgba(255, 107, 107, 0.3);
          transform: translateY(-2px);
          box-shadow: 0 10px 40px rgba(255, 107, 107, 0.15);
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
          background: linear-gradient(90deg, #FF6B6B, #FF8E53);
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
            <div className="text-xs text-gray-400 font-medium">Administrator Console</div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden sm:flex items-center gap-3 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)] py-1.5 px-3 rounded-full">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-red-500 to-orange-500 flex items-center justify-center text-sm font-bold shadow-sm">
              <User size={14} />
            </div>
            <div className="pr-2">
              <div className="text-sm font-semibold leading-tight flex items-center gap-2">
                {user?.full_name || 'Admin'}
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#FF6B6B]/20 text-[#FF6B6B] border border-[#FF6B6B]/30 uppercase tracking-widest">
                  ADMIN
                </span>
              </div>
              <div className="text-[10px] text-gray-400">{user?.email || 'admin@system.local'}</div>
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
              {tab === 'dashboard' ? <><Activity size={16} /> Overview Monitor</> : <><Settings size={16} /> System Settings</>}
            </button>
          ))}
        </div>

        {/* DASHBOARD VIEW */}
        {activeTab === 'dashboard' && (
          <div className="flex flex-col gap-6 lg:gap-8">
            
            {/* TOP ROW: Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
              {[
                { label: 'Active Sessions', value: '247', icon: <Zap className="text-yellow-400" size={24} />, bg: "from-yellow-900/40 to-yellow-800/20" },
                { label: 'Total Duration', value: '42.3h', icon: <Clock className="text-blue-400" size={24} />, bg: "from-blue-900/40 to-blue-800/20" },
                { label: 'Zones Visited', value: '5', icon: <Map className="text-purple-400" size={24} />, bg: "from-purple-900/40 to-purple-800/20" },
                { label: 'Attendance Rate', value: '94%', icon: <CheckCircle className="text-emerald-400" size={24} />, bg: "from-emerald-900/40 to-emerald-800/20" },
              ].map((stat, i) => (
                <div key={i} className={`bento-card p-6 flex flex-col justify-between bg-gradient-to-br ${stat.bg} border border-[rgba(255,255,255,0.03)] relative overflow-hidden`}>
                  <div className="absolute -right-4 -top-4 opacity-10">{React.cloneElement(stat.icon, { size: 100 })}</div>
                  <div className="flex justify-between items-start mb-6 relative z-10">
                    <div className="p-2.5 bg-black/20 rounded-xl backdrop-blur-sm border border-[rgba(255,255,255,0.05)]">{stat.icon}</div>
                  </div>
                  <div className="relative z-10">
                    <div className="text-3xl font-black mb-1.5 tracking-tight">{stat.value}</div>
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-widest">{stat.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* MIDDLE ROW: Activity Feed & Extra Panels */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 min-h-[400px]">
              
              {/* Recent Activity Feed (Spans 2 columns) */}
              <div className="bento-card lg:col-span-2 flex flex-col pt-6 px-0 pb-0 overflow-hidden">
                <div className="flex items-center justify-between px-6 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#FF6B6B]/20 rounded-lg text-[#FF6B6B]">
                      <Activity size={20} />
                    </div>
                    <h2 className="text-lg font-bold">Live Lab Activity</h2>
                  </div>
                  <span className="flex h-3 w-3 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                  </span>
                </div>
                
                <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-3 max-h-[400px]">
                  {[
                    { time: 'Just now', action: 'Student Checked in', zone: 'Lab A', duration: 'Started', status: 'active' },
                    { time: '15 mins ago', action: 'Session Ended', zone: 'Library', duration: '3.2 hrs', status: 'completed' },
                    { time: '1 hour ago', action: 'Student Checked in', zone: 'Lab B', duration: 'Started', status: 'active' },
                    { time: '2 hours ago', action: 'Session Ended', zone: 'Cafeteria', duration: '1.5 hrs', status: 'completed' },
                    { time: '2.5 hours ago', action: 'System Alert', zone: 'Lab C', duration: 'N/A', status: 'alert' },
                  ].map((activity, i) => (
                    <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-[rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.02)] transition-colors group cursor-default gap-3 sm:gap-0">
                      <div className="flex items-center gap-4">
                         <div className={`w-2 h-10 rounded-full ${
                           activity.status === 'active' ? 'bg-emerald-500' :
                           activity.status === 'alert' ? 'bg-amber-500' : 'bg-gray-600'
                         }`}></div>
                         <div>
                           <div className="font-bold text-sm text-gray-100 group-hover:text-[#FF6B6B] transition-colors">{activity.action}</div>
                           <div className="text-xs text-gray-500 font-medium">Zone: <span className="text-gray-300">{activity.zone}</span></div>
                         </div>
                      </div>
                      <div className="flex items-center sm:flex-col sm:items-end gap-3 sm:gap-1 pl-6 sm:pl-0 border-l sm:border-0 border-[rgba(255,255,255,0.05)]">
                        <div className="text-xs font-bold text-[#FF8E53] px-2 py-1 bg-[#FF8E53]/10 rounded-md">{activity.duration}</div>
                        <div className="text-[10px] uppercase tracking-wider text-gray-500">{activity.time}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Administrator Profile Card */}
              <div className="bento-card relative flex flex-col justify-center overflow-hidden min-h-[250px] lg:min-h-0">
                <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-red-600 rounded-full mix-blend-multiply filter blur-[80px] opacity-20"></div>
                
                <div className="relative z-10 flex flex-col items-center text-center">
                  <div className="w-24 h-24 mb-4 rounded-full bg-gradient-to-br from-[#FF6B6B] to-[#FF8E53] flex items-center justify-center text-4xl font-black shadow-[0_8px_30px_rgba(255,107,107,0.4)] border-4 border-[#0f1127]">
                    {user?.full_name?.charAt(0).toUpperCase() || 'A'}
                  </div>
                  <h3 className="text-xl font-bold mb-1">{user?.full_name || 'System Admin'}</h3>
                  <div className="px-3 py-1 bg-[#FF6B6B]/10 text-[#FF6B6B] border border-[#FF6B6B]/20 rounded-full text-xs font-bold uppercase tracking-widest mb-6">
                    {user?.role || 'Administrator'}
                  </div>
                  
                  <div className="w-full space-y-3 text-left">
                    <div className="p-3 bg-[rgba(0,0,0,0.3)] rounded-lg text-sm border border-[rgba(255,255,255,0.02)]">
                      <span className="text-xs text-gray-500 block mb-1">Email ID</span>
                      <span className="text-gray-300">{user?.email || 'admin@admin.com'}</span>
                    </div>
                    <div className="p-3 bg-[rgba(0,0,0,0.3)] rounded-lg text-sm border border-[rgba(255,255,255,0.02)] flex justify-between items-center">
                      <span>System Status</span>
                      <span className="flex items-center gap-2 text-xs font-bold text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        Stable
                      </span>
                    </div>
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
                  <h2 className="text-2xl font-bold mb-1">Administrator Settings</h2>
                  <p className="text-sm text-gray-400">Configure your system profile details.</p>
                </div>
                <div className="p-3 bg-[#FF6B6B]/10 text-[#FF6B6B] rounded-xl self-start">
                  <Settings size={24} />
                </div>
              </div>

              {message.text && (
                <div className={`p-4 mb-6 rounded-xl text-sm font-semibold border ${message.type === 'success' ? 'bg-emerald-900/20 text-emerald-400 border-emerald-500/30' : 'bg-red-900/20 text-red-400 border-red-500/30'}`}>
                  {message.text}
                </div>
              )}

              <div className="space-y-6">
                {/* Read only block */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 rounded-xl bg-black/20 border border-[rgba(255,255,255,0.03)]">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">Legal Name</label>
                    <div className="text-sm font-medium text-gray-300">{user?.full_name || 'N/A'}</div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">Email Address</label>
                    <div className="text-sm font-medium text-[#FF8E53]">{user?.email || 'N/A'}</div>
                  </div>
                </div>

                {/* Edits */}
                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">Role/Course Title</label>
                      {!editMode ? (
                        <div className="p-3.5 bg-[rgba(0,0,0,0.3)] rounded-xl text-sm border border-[rgba(255,255,255,0.02)] min-h-[46px] flex items-center">{user?.course || 'Not Set'}</div>
                      ) : (
                        <input
                          type="text" name="course" value={editData.course} onChange={handleEditChange} placeholder="e.g. IT Administrator"
                          className="w-full p-3.5 bg-[rgba(255,255,255,0.03)] rounded-xl text-sm border border-[#FF6B6B] text-white focus:outline-none focus:ring-2 focus:ring-[#FF6B6B] transition"
                        />
                      )}
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">Department Level</label>
                      {!editMode ? (
                        <div className="p-3.5 bg-[rgba(0,0,0,0.3)] rounded-xl text-sm border border-[rgba(255,255,255,0.02)] min-h-[46px] flex items-center">{user?.year_level || 'Not Set'}</div>
                      ) : (
                        <select
                          name="year_level" value={editData.year_level} onChange={handleEditChange}
                          className="w-full p-3.5 bg-[rgba(255,255,255,0.03)] rounded-xl text-sm border border-[#FF6B6B] text-white focus:outline-none focus:ring-2 focus:ring-[#FF6B6B] appearance-none transition"
                        >
                          <option value="" className="bg-[#0f1127]">Select Level</option>
                          <option value="Staff" className="bg-[#0f1127]">Staff</option>
                          <option value="Supervisor" className="bg-[#0f1127]">Supervisor</option>
                          <option value="Admin" className="bg-[#0f1127]">Admin</option>
                          <option value="Root" className="bg-[#0f1127]">Root</option>
                        </select>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">Office Address</label>
                    {!editMode ? (
                      <div className="p-3.5 bg-[rgba(0,0,0,0.3)] rounded-xl text-sm border border-[rgba(255,255,255,0.02)] min-h-[80px]">{user?.address || 'Not Set'}</div>
                    ) : (
                      <textarea
                        name="address" value={editData.address} onChange={handleEditChange} placeholder="Enter your office address" rows="3"
                        className="w-full p-3.5 bg-[rgba(255,255,255,0.03)] rounded-xl text-sm border border-[#FF6B6B] text-white focus:outline-none focus:ring-2 focus:ring-[#FF6B6B] resize-none transition"
                      />
                    )}
                  </div>
                </div>

                <div className="pt-6 border-t border-[rgba(255,255,255,0.05)] flex gap-4">
                  {!editMode ? (
                    <button onClick={() => setEditMode(true)} className="px-6 py-3 rounded-xl block w-full sm:w-auto text-sm font-bold bg-[#FF6B6B] hover:bg-[#ff5252] transition text-white shadow-lg">
                      Enable Editing
                    </button>
                  ) : (
                    <>
                      <button onClick={handleSaveProfile} disabled={saving} className="px-6 py-3 rounded-xl flex-1 sm:flex-none text-sm font-bold bg-gradient-to-r from-emerald-500 to-emerald-400 text-emerald-950 hover:opacity-90 transition shadow-lg disabled:opacity-50">
                        {saving ? 'Saving...' : 'Save Changes'}
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
