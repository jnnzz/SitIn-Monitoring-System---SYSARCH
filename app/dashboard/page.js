"use client"
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import StudentDashboard from '../landing/StudentDashboard'
import AdminDashboard from '../landing/Dashboard'

export default function DashboardPage() {
  const router = useRouter()
  const [role, setRole] = useState(null)
  
  useEffect(() => {
    const userStr = localStorage.getItem('user')
    if (userStr) {
      try {
        const user = JSON.parse(userStr)
        setRole(user.role)
      } catch (e) {
        console.error("Failed to parse user")
      }
    } else {
      router.push('/')
    }
  }, [router])

  if (!role) {
    return (
      <div className="app-theme-shell w-full min-h-screen flex items-center justify-center">
        <div
          className="animate-pulse w-12 h-12 rounded-full"
          style={{ backgroundColor: 'var(--app-accent)', boxShadow: '0 0 20px var(--app-accent-soft)' }}
        ></div>
      </div>
    )
  }

  if (role === 'admin') {
    return <AdminDashboard />
  }

  return <StudentDashboard />
}
