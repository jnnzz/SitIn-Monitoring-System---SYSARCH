"use client"

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, User, Settings, Activity } from 'lucide-react'

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('settings')
  const [editMode, setEditMode] = useState(false)
  const [editData, setEditData] = useState({
    course: '',
    year_level: '',
    address: ''
  })

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')

    if (!token || !userData) {
      router.push('/')
      return
    }

    const fetchUserProfile = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/auth/profile', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        if (response.ok) {
          const profileData = await response.json()
          setUser(profileData)
          localStorage.setItem('user', JSON.stringify(profileData))
          setEditData({
            course: profileData?.course || '',
            year_level: profileData?.year_level || '',
            address: profileData?.address || ''
          })
        } else {
          // Fallback to localStorage if profile fetch fails
          const parsedUser = JSON.parse(userData)
          setUser(parsedUser)
          setEditData({
            course: parsedUser?.course || '',
            year_level: parsedUser?.year_level || '',
            address: parsedUser?.address || ''
          })
        }
      } catch (error) {
        console.error('Error fetching profile:', error)
        // Fallback to localStorage
        const parsedUser = JSON.parse(userData)
        setUser(parsedUser)
        setEditData({
          course: parsedUser?.course || '',
          year_level: parsedUser?.year_level || '',
          address: parsedUser?.address || ''
        })
      } finally {
        setLoading(false)
      }
    }

    fetchUserProfile()
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/')
  }

  const handleEditChange = (e) => {
    const { name, value } = e.target
    setEditData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSaveProfile = async () => {
    const token = localStorage.getItem('token')
    
    try {
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
        const updatedUser = { ...user, ...data.user }
        setUser(updatedUser)
        localStorage.setItem('user', JSON.stringify(updatedUser))
        setEditMode(false)
        alert('Profile updated successfully!')
      } else {
        alert('Failed to update profile')
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      alert('Error updating profile')
    }
  }

  if (loading) {
    return (
      <div className="w-screen min-h-screen flex items-center justify-center" style={{ backgroundColor: '#080a18' }}>
        <div className="text-white text-xl font-bold">Loading...</div>
      </div>
    )
  }

  return (
    <div className="w-screen min-h-screen" style={{ backgroundColor: '#080a18', fontFamily: "'Poppins', sans-serif", color: '#fff' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        
        .tab-btn {
          transition: all 0.2s;
          border: none;
          background: none;
          cursor: pointer;
          font-family: 'Poppins', sans-serif;
        }
        
        .tab-btn.active {
          border-bottom: 2px solid #4D2FB2;
          color: #fff;
        }
        
        .tab-btn:hover {
          color: #4D2FB2;
        }

        .card {
          background-color: #0f1127;
          border: 1px solid #1a1e40;
          border-radius: 12px;
          padding: 24px;
          transition: border-color 0.2s;
        }

        .card:hover {
          border-color: #4D2FB2;
        }
      `}</style>

      {/* Navigation Bar */}
      <nav className="flex items-center justify-between px-12 py-6" style={{ borderBottom: '1px solid #1a1e40' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-black" style={{ backgroundColor: '#0E21A0' }}>
            S
          </div>
          <div>
            <div className="font-bold text-lg">SitIn Monitor</div>
            <div className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Dashboard</div>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: user?.role === 'admin' ? '#FF6B6B' : '#4D2FB2' }}>
              <User size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <div className="text-sm font-semibold">{user?.full_name || 'User'}</div>
                {user?.role === 'admin' && (
                  <span className="px-2 py-1 rounded text-xs font-bold" style={{ backgroundColor: '#FF6B6B', color: '#fff' }}>
                    ADMIN
                  </span>
                )}
              </div>
              <div className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{user?.email}</div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition hover:opacity-80"
            style={{ backgroundColor: '#B153D7', border: 'none', cursor: 'pointer', color: '#fff' }}
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <div className="px-12 py-8">
        {/* Tabs */}
        <div className="flex gap-8 mb-8">
            {/* 'overview', 'activity',  */}
          {['settings'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`tab-btn text-sm font-semibold ${activeTab === tab ? 'active' : ''}`}
              style={{ color: activeTab === tab ? '#fff' : 'rgba(255,255,255,0.5)' }}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: 'Active Sessions', value: '247', icon: '⚡' },
              { label: 'Total Duration', value: '42.3h', icon: '⏱️' },
              { label: 'Zones Visited', value: '5', icon: '📍' },
              { label: 'Attendance Rate', value: '94%', icon: '✅' },
            ].map((stat, i) => (
              <div key={i} className="card">
                <div className="text-3xl mb-3">{stat.icon}</div>
                <div className="text-2xl font-black mb-1">{stat.value}</div>
                <div className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{stat.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && (
          <div className="card max-w-3xl">
            <div className="flex items-center gap-3 mb-6">
              <Activity size={24} style={{ color: '#4D2FB2' }} />
              <h3 className="text-lg font-bold">Recent Activity</h3>
            </div>

            <div className="space-y-4">
              {[
                { time: '2 hours ago', action: 'Checked in', zone: 'Lab A', duration: '2.5 hrs' },
                { time: '1 day ago', action: 'Checked in', zone: 'Library', duration: '3.2 hrs' },
                { time: '3 days ago', action: 'Checked in', zone: 'Cafeteria', duration: '1.5 hrs' },
              ].map((activity, i) => (
                <div key={i} className="flex items-center justify-between p-4" style={{ backgroundColor: '#080a18', borderRadius: 8 }}>
                  <div>
                    <div className="font-semibold text-sm">{activity.action} - {activity.zone}</div>
                    <div className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{activity.time}</div>
                  </div>
                  <div className="text-sm font-semibold" style={{ color: '#4D2FB2' }}>{activity.duration}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="card max-w-3xl">
            <div className="flex items-center gap-3 mb-8">
              <Settings size={24} style={{ color: '#4D2FB2' }} />
              <h3 className="text-lg font-bold">Account Settings</h3>
            </div>

            {/* Profile Picture Section */}
            <div className="mb-8 pb-8 border-b border-[#1a1e40]">
              {/* <label className="text-sm font-semibold mb-4 block">Profile Picture</label> */}
              <div className="flex items-center gap-6">
                <div
                  className="w-24 h-24 rounded-full flex items-center justify-center text-4xl font-bold"
                  style={{ backgroundColor: user?.role === 'admin' ? '#FF6B6B' : '#4D2FB2', color: '#fff' }}
                >
                  {user?.full_name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div>
                  <p className="text-sm mb-2">{user?.email}</p>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    {user?.full_name}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-sm font-semibold mb-2 block">Full Name</label>
                <input
                  type="text"
                  value={user?.full_name || ''}
                  readOnly
                  className="w-full px-4 py-3 rounded-lg text-sm"
                  style={{ backgroundColor: '#080a18', border: '1px solid #1a1e40', color: '#fff' }}
                />
              </div>

              <div>
                <label className="text-sm font-semibold mb-2 block">Email Address</label>
                <input
                  type="email"
                  value={user?.email || ''}
                  readOnly
                  className="w-full px-4 py-3 rounded-lg text-sm"
                  style={{ backgroundColor: '#080a18', border: '1px solid #1a1e40', color: '#fff' }}
                />
              </div>

              <div>
                <label className="text-sm font-semibold mb-2 block">Account Role</label>
                <input
                  type="text"
                  value={user?.role || 'user'}
                  readOnly
                  className="w-full px-4 py-3 rounded-lg text-sm"
                  style={{ backgroundColor: '#080a18', border: '1px solid #1a1e40', color: '#4D2FB2' }}
                />
              </div>

              {!editMode ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-semibold mb-2 block">Course</label>
                      <input
                        type="text"
                        value={user?.course || 'Not set'}
                        readOnly
                        className="w-full px-4 py-3 rounded-lg text-sm"
                        style={{ backgroundColor: '#080a18', border: '1px solid #1a1e40', color: '#fff' }}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-semibold mb-2 block">Year Level</label>
                      <input
                        type="text"
                        value={user?.year_level || 'Not set'}
                        readOnly
                        className="w-full px-4 py-3 rounded-lg text-sm"
                        style={{ backgroundColor: '#080a18', border: '1px solid #1a1e40', color: '#fff' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-semibold mb-2 block">Address</label>
                    <textarea
                      value={user?.address || 'Not set'}
                      readOnly
                      className="w-full px-4 py-3 rounded-lg text-sm resize-none"
                      rows="3"
                      style={{ backgroundColor: '#080a18', border: '1px solid #1a1e40', color: '#fff' }}
                    />
                  </div>

                  <button
                    onClick={() => setEditMode(true)}
                    className="w-full py-3 rounded-lg text-sm font-bold transition hover:opacity-90"
                    style={{ backgroundColor: '#4D2FB2', border: 'none', cursor: 'pointer', color: '#fff' }}
                  >
                    Edit Profile
                  </button>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-semibold mb-2 block">Course</label>
                      <input
                        type="text"
                        name="course"
                        value={editData.course}
                        onChange={handleEditChange}
                        className="w-full px-4 py-3 rounded-lg text-sm"
                        style={{ backgroundColor: '#1a1e40', border: '1px solid #4D2FB2', color: '#fff' }}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-semibold mb-2 block">Year Level</label>
                      <select
                        name="year_level"
                        value={editData.year_level}
                        onChange={handleEditChange}
                        className="w-full px-4 py-3 rounded-lg text-sm"
                        style={{ backgroundColor: '#1a1e40', border: '1px solid #4D2FB2', color: '#fff' }}
                      >
                        <option value="">Select Year Level</option>
                        <option value="1st Year">1st Year</option>
                        <option value="2nd Year">2nd Year</option>
                        <option value="3rd Year">3rd Year</option>
                        <option value="4th Year">4th Year</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-semibold mb-2 block">Address</label>
                    <textarea
                      name="address"
                      value={editData.address}
                      onChange={handleEditChange}
                      className="w-full px-4 py-3 rounded-lg text-sm resize-none"
                      rows="3"
                      style={{ backgroundColor: '#1a1e40', border: '1px solid #4D2FB2', color: '#fff' }}
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleSaveProfile}
                      className="flex-1 py-3 rounded-lg text-sm font-bold transition hover:opacity-90"
                      style={{ backgroundColor: '#4D2FB2', border: 'none', cursor: 'pointer', color: '#fff' }}
                    >
                      Save Changes
                    </button>
                    <button
                      onClick={() => setEditMode(false)}
                      className="flex-1 py-3 rounded-lg text-sm font-bold transition hover:opacity-90"
                      style={{ backgroundColor: '#1a1e40', border: '1px solid #4D2FB2', cursor: 'pointer', color: '#fff' }}
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}

              <button
                onClick={handleLogout}
                className="w-full py-3 rounded-lg text-sm font-bold text-white transition hover:opacity-90"
                style={{ backgroundColor: '#B153D7', border: 'none', cursor: 'pointer' }}
              >
                Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
