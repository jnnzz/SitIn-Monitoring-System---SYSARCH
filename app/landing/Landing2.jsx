"use client"

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Particles } from '@/components/ui/particles'
import { BlurFade } from '@/components/ui/blur-fade'
import { NumberTicker } from '@/components/ui/number-ticker'
import { ToastStack } from '@/components/ui/toast-stack'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { useToasts } from '@/lib/use-toasts'
import ccs from './../assets/ccslogo.png';
import { MonitorCheck, BarChart3, BellRing, ShieldCheck } from 'lucide-react'

const API_URL = '/api'

export default function Landing() {
  const router = useRouter()
  const [tab, setTab] = useState('login')
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [showRegPass, setShowRegPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const { toasts, pushToast, removeToast } = useToasts()

  // Login state
  const [loginData, setLoginData] = useState({
    student_id: '',
    password: ''
  })

  // Register state
  const [registerData, setRegisterData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    student_id: '',
    email: '',
    password: '',
    confirmPassword: '',
    course: '',
    yearLevel: '',
    address: '',
    agreeTerms: false
  })

  // Handle login input change
  const handleLoginChange = (e) => {
    const { name, value } = e.target
    setLoginData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // Handle register input change
  const handleRegisterChange = (e) => {
    const { name, value, type, checked } = e.target
    setRegisterData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  // Handle login submit
  const handleLoginSubmit = async (e) => {
    e.preventDefault()

    if (!loginData.student_id || !loginData.password) {
      pushToast({
        type: 'error',
        title: 'Student ID and password are required',
      })
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: loginData.student_id,
          password: loginData.password
        })
      })

      const data = await response.json()

      if (response.ok) {
        pushToast({
          type: 'success',
          title: 'Login successful',
          description: 'Redirecting to dashboard...',
        })
        localStorage.setItem('token', data.token)
        localStorage.setItem('user', JSON.stringify(data.user))
        setTimeout(() => {
          router.push('/dashboard')
        }, 1500)
      } else {
        pushToast({
          type: 'error',
          title: data.error || 'Login failed',
        })
      }
    } catch (err) {
      pushToast({
        type: 'error',
        title: 'Connection error',
        description: 'Please try again.',
      })
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Handle register submit
  const handleRegisterSubmit = async (e) => {
    e.preventDefault()

    // Validation
    if (!registerData.firstName || !registerData.lastName || !registerData.student_id || !registerData.password) {
      pushToast({
        type: 'error',
        title: 'Please fill all required fields',
      })
      return
    }

    if (registerData.password.length < 6) {
      pushToast({
        type: 'error',
        title: 'Password must be at least 6 characters',
      })
      return
    }

    if (registerData.password !== registerData.confirmPassword) {
      pushToast({
        type: 'error',
        title: 'Passwords do not match',
      })
      return
    }

    if (!registerData.agreeTerms) {
      pushToast({
        type: 'warning',
        title: 'Please agree to Terms and Privacy Policy',
      })
      return
    }

    setLoading(true)

    try {
      const full_name = `${registerData.firstName} ${registerData.middleName} ${registerData.lastName}`.trim()

      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: registerData.student_id,
          password: registerData.password,
          full_name: full_name,
          email: registerData.email,
          course: registerData.course,
          year_level: registerData.yearLevel,
          address: registerData.address
        })
      })

      const data = await response.json()

      if (response.ok) {
        pushToast({
          type: 'success',
          title: 'Registration successful',
          description: 'Redirecting to dashboard...',
        })
        localStorage.setItem('token', data.token)
        localStorage.setItem('user', JSON.stringify(data.user))
        setTimeout(() => {
          router.push('/dashboard')
        }, 1500)
      } else {
        pushToast({
          type: 'error',
          title: data.error || 'Registration failed',
        })
      }
    } catch (err) {
      pushToast({
        type: 'error',
        title: 'Connection error',
        description: 'Please try again.',
      })
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="app-theme-shell app-auth-shell relative w-screen min-h-screen flex overflow-hidden"
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; }

        .inp { font-family: 'Poppins', sans-serif; transition: border-color 0.2s; }
        .inp:focus { outline: none; border-color: var(--app-accent) !important; }
        .inp::placeholder { color: var(--app-muted); }
        .inp option { background-color: var(--app-surface); }

        .tab-btn { transition: all 0.2s; font-family: 'Poppins', sans-serif; }
        .btn-sso { transition: border-color 0.2s; font-family: 'Poppins', sans-serif; }
        .btn-sso:hover { border-color: var(--app-accent) !important; }
        .stat-card { transition: border-color 0.2s; }
        .stat-card:hover { border-color: var(--app-accent) !important; }

        .dot-blink { animation: blink 1.2s ease-in-out infinite; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.15} }

        .scroll-panel::-webkit-scrollbar { width: 0; display: none; }
        .scroll-panel::-webkit-scrollbar-track { background: transparent; }
        .scroll-panel::-webkit-scrollbar-thumb { background: var(--app-border); border-radius: 10px; }
        
        .scroll-panel {
          scrollbar-width: none; /* Firefox */
          -ms-overflow-style: none; /* IE and Edge */
        }

        /* Mobile scroll improvements */
        @media (max-width: 640px) {
          .scroll-panel {
            -webkit-overflow-scrolling: touch;
            scroll-behavior: smooth;
          }
        }

        .divider-v {
          width: 1px;
          background: var(--app-border);
          align-self: stretch;
          margin: 0 12px;
        }
      `}</style>

      <div className="absolute right-4 top-4 z-30">
        <ThemeToggle />
      </div>

      {/* Particles */}
      <Particles className="absolute inset-0 z-0" quantity={90} color="#3b82f6" ease={80} size={0.5} />

      {/* ══════════ LEFT SIDE ══════════ */}
      <div
        className="relative z-10 hidden lg:flex lg:flex-col justify-between w-full lg:w-1/2 min-h-screen px-6 sm:px-10 lg:px-14 py-6 sm:py-8 lg:py-10"
        // style={{ borderRight: '1px solid #1a1e40' }}
      >

        {/* Top — Logos */}
        <BlurFade delay={0.1} inView>
          <div className="flex items-center gap-4">
            {/* <Image
              src={uc}
              alt="University of Cebu"
              width={56}
              height={56}
              className="object-contain"
            />
            <div className="divider-v" style={{ height: 40 }} /> */}
            <Image
              src={ccs}
              alt="College of Computer Studies"
              width={52}
              height={52}
              className="object-contain"
            />
            <div className="flex flex-col ml-1">
              <span className="text-white font-bold text-sm leading-tight">University of Cebu</span>
              <span className="text-xs font-medium leading-tight" style={{ color: 'rgba(255,255,255,0.4)' }}>College of Computer Studies</span>
            </div>
          </div>
        </BlurFade>

        {/* Middle — Hero content */}
        <div className="flex flex-col gap-7 my-auto py-10">

          {/* Live pill */}
          {/* <BlurFade delay={0.2} inView>
            <div
              className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium w-fit"
              style={{ backgroundColor: '#0f1127', border: '1px solid #F375C2', color: 'rgba(255,255,255,0.6)' }}
            >
              <span className="dot-blink w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: '#F375C2', display: 'inline-block' }} />
              Live monitoring active
            </div>
          </BlurFade> */}

          {/* Headline */}
          <BlurFade delay={0.3} inView>
            <h1
              className="font-black text-white leading-tight"
              style={{ fontSize: 'clamp(2rem, 3.2vw, 3.4rem)', letterSpacing: '-0.025em' }}
            >
              Sit-In Monitoring 
              <span style={{ color: '#B153D7' }}> System</span>
            </h1>
          </BlurFade>

          {/* Description */}
          <BlurFade delay={0.4} inView>
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)', maxWidth: 420 }}>
              A real-time sit-in monitoring platform for the University of Cebu — CCS. Track student sessions, manage lab occupancy, and gain full visibility over every sit-in activity in one clean dashboard.
            </p>
          </BlurFade>

          {/* Stats */}
          <BlurFade delay={0.5} inView>
            <div className="flex gap-3 text-white flex-wrap">
              {[
                { label: 'Active Sessions', value: 247, suffix: '' },
                { label: 'Registered Users', value: 1200, suffix: '+' },
                { label: 'Uptime', value: 99, suffix: '.9%' },
              ].map((s, i) => (
                <div
                  key={i}
                  className="stat-card flex-1 rounded-2xl p-4"
                  style={{ minWidth: 100, backgroundColor: '#0f1127', border: '1px solid #1a1e40' }}
                >
                  <div className="text-xl font-black text-white mb-0.5" style={{ color: '#ffffff' }}>
                    <NumberTicker value={s.value}  className="text-white"/>{s.suffix}
                  </div>
                  <div className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.35)' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </BlurFade>

          {/* Feature list */}
          <BlurFade delay={0.6} inView>
            <div className="flex flex-col gap-2.5">
              {[
                { icon: <MonitorCheck size={16} color="var(--app-accent)" />, text: 'Real-time occupancy tracking across all labs' },
                { icon: <BarChart3 size={16} color="var(--app-accent)" />, text: 'Smart analytics with peak hour insights' },
                { icon: <BellRing size={16} color="var(--app-accent)" />, text: 'Instant alerts on capacity thresholds' },
                { icon: <ShieldCheck size={16} color="var(--app-accent)" />, text: 'Role-based secure access for students & faculty' },
              ].map((f, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                    style={{ backgroundColor: '#0f1127', border: '1px solid #1a1e40' }}
                  >{f.icon}</div>
                  <span className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>{f.text}</span>
                </div>
              ))}
            </div>
          </BlurFade>
        </div>

        {/* Bottom — Footer */}
        <BlurFade delay={0.7} inView>
          <div className="flex items-center gap-2">
            {/* <div className="w-5 h-5 rounded-md flex items-center justify-center text-xs font-black text-white" style={{ backgroundColor: '#0E21A0' }}>S</div> */}
            <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.3)' }}>SitIn Monitoring System · UC CCS · 2026</span>
          </div>
        </BlurFade>
      </div>

      {/* ══════════ RIGHT SIDE ══════════ */}
      <div className="relative z-10 flex items-center justify-center w-full lg:w-1/2 px-4 sm:px-8 lg:px-12 py-6 sm:py-8 lg:py-10">
        <BlurFade delay={0.3} inView className="w-full max-w-xl">
          {/* Mobile Logo Header (Visible only on mobile) */}
          <div className="flex items-center justify-center gap-3 mb-6 lg:hidden">
            <Image
              src={ccs}
              alt="College of Computer Studies"
              width={40}
              height={40}
              className="object-contain"
            />
            <div className="flex flex-col">
              <span className="text-white font-bold text-sm leading-tight">University of Cebu</span>
              <span className="text-xs font-medium leading-tight" style={{ color: 'rgba(255,255,255,0.4)' }}>College of Computer Studies</span>
            </div>
          </div>

           {/* Outer container (non-scrolling) */}
          <div className="relative max-w-2xl rounded-2xl sm:rounded-3xl overflow-hidden"
               style={{ backgroundColor: '#0f1127', border: '1px solid #1a1e40' }}>

            {/* Inner scrollable content */}
            <div className="overflow-y-auto scroll-panel p-5 sm:p-6 lg:p-8" style={{ maxHeight: '80vh' }}>

            {/* Tab switcher */}
            <div
              className="flex rounded-lg sm:rounded-xl p-1 mb-5 sm:mb-7"
              style={{ backgroundColor: '#080a18', border: '1px solid #1a1e40' }}
            >
              {[['login', 'Sign In'], ['register', 'Register']].map(([t, label]) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className="tab-btn flex-1 py-2 rounded-lg text-sm font-semibold"
                  style={{
                    backgroundColor: tab === t ? 'var(--app-accent)' : 'transparent',
                    color: tab === t ? 'var(--app-on-accent)' : 'var(--app-muted)',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >{label}</button>
              ))}
            </div>

            {/* ── LOGIN ── */}
            {tab === 'login' && (
              <div className=''>
                <h2 className="text-white text-lg sm:text-xl font-black mb-1">Welcome back</h2>
                <p className="text-xs sm:text-sm mb-4 sm:mb-6" style={{ color: 'rgba(255,255,255,0.4)' }}>Sign in to your dashboard</p>

                <form className="flex flex-col gap-3 sm:gap-4" onSubmit={handleLoginSubmit}>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>Student ID</label>
                    <input 
                      type="text" 
                      name="student_id"
                      placeholder="e.g. 23781234" 
                      value={loginData.student_id}
                      onChange={handleLoginChange}
                      disabled={loading}
                      className="inp w-full rounded-lg sm:rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm text-white" 
                      style={{ backgroundColor: '#080a18', border: '1px solid #1a1e40' }} 
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>Password</label>
                      <a href="#" className="text-xs font-semibold hidden sm:inline" style={{ color: '#B153D7', textDecoration: 'none' }}>Forgot Password?</a>
                    </div>
                    <div className="relative">
                      <input 
                        type={showPass ? 'text' : 'password'} 
                        name="password"
                        placeholder="••••••••" 
                        value={loginData.password}
                        onChange={handleLoginChange}
                        disabled={loading}
                        className="inp w-full rounded-lg sm:rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm text-white pr-14 sm:pr-16" 
                        style={{ backgroundColor: '#080a18', border: '1px solid #1a1e40' }} 
                        required
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowPass(s => !s)} 
                        className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-xs font-semibold"
                        style={{ color: '#4D2FB2', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Poppins, sans-serif' }}>
                        {showPass ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="remember" className="w-4 h-4 cursor-pointer" style={{ accentColor: '#4D2FB2' }} />
                    <label htmlFor="remember" className="text-xs font-medium cursor-pointer" style={{ color: 'rgba(255,255,255,0.4)' }}>Remember me for 30 days</label>
                  </div>

                  <button
                    type="submit"
                    className="theme-auth-button w-full py-2.5 sm:py-3 rounded-lg sm:rounded-xl text-sm font-bold mt-1 disabled:opacity-60"
                    disabled={loading}
                  >
                    {loading ? 'Signing In...' : 'Sign In'}
                  </button>
                </form>

                <p className="text-center text-xs sm:text-sm mt-4 sm:mt-5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  No account?{' '}
                  <button onClick={() => setTab('register')} className="font-bold" style={{ color: '#B153D7', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Poppins, sans-serif', fontSize: 12 }}>
                    Register here
                  </button>
                </p>
              </div>
            )}

            {/* ── REGISTER ── */}
            {tab === 'register' && (
              <div className=''>
                <h2 className="text-white text-lg sm:text-xl font-black mb-1">Create account</h2>
                <p className="text-xs sm:text-sm mb-4 sm:mb-6" style={{ color: 'rgba(255,255,255,0.4)' }}>Register to access the system</p>

                <form className="flex flex-col gap-3 sm:gap-4" onSubmit={handleRegisterSubmit}>

                  {/* First / Middle / Last Name */}
                  <div className="flex flex-col gap-3 sm:flex-row sm:gap-2">
                    <div className="flex flex-col gap-1.5 flex-1">
                      <label className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>First Name</label>
                      <input 
                        type="text" 
                        name="firstName"
                        placeholder="Juan" 
                        value={registerData.firstName}
                        onChange={handleRegisterChange}
                        disabled={loading}
                        className="inp w-full rounded-lg sm:rounded-xl px-3 py-2.5 sm:py-3 text-sm text-white" 
                        style={{ backgroundColor: '#080a18', border: '1px solid #1a1e40' }} 
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-1.5 flex-1">
                      <label className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>Middle Name</label>
                      <input 
                        type="text" 
                        name="middleName"
                        placeholder="Lim" 
                        value={registerData.middleName}
                        onChange={handleRegisterChange}
                        disabled={loading}
                        className="inp w-full rounded-lg sm:rounded-xl px-3 py-2.5 sm:py-3 text-sm text-white" 
                        style={{ backgroundColor: '#080a18', border: '1px solid #1a1e40' }} 
                      />
                    </div>
                    <div className="flex flex-col gap-1.5 flex-1">
                      <label className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>Last Name</label>
                      <input 
                        type="text" 
                        name="lastName"
                        placeholder="Dela Cruz" 
                        value={registerData.lastName}
                        onChange={handleRegisterChange}
                        disabled={loading}
                        className="inp w-full rounded-lg sm:rounded-xl px-3 py-2.5 sm:py-3 text-sm text-white" 
                        style={{ backgroundColor: '#080a18', border: '1px solid #1a1e40' }} 
                        required
                      />
                    </div>
                  </div>

                  {/* Course + Year Level */}
                  <div className="flex flex-col gap-3 sm:flex-row sm:gap-2">
                    <div className="flex flex-col gap-1.5 flex-1">
                      <label className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>Course</label>
                      <select 
                        name="course"
                        value={registerData.course}
                        onChange={handleRegisterChange}
                        disabled={loading}
                        className="inp w-full rounded-lg sm:rounded-xl px-3 py-2.5 sm:py-3 text-sm text-white appearance-none" 
                        style={{ backgroundColor: '#080a18', border: '1px solid #1a1e40' }}>
                        <option value="">Select course</option>
                        <option value="BSIT">BSIT</option>
                        <option value="BSCS">BSCS</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1.5 flex-1">
                      <label className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>Year Level</label>
                      <select 
                        name="yearLevel"
                        value={registerData.yearLevel}
                        onChange={handleRegisterChange}
                        disabled={loading}
                        className="inp w-full rounded-lg sm:rounded-xl px-3 py-2.5 sm:py-3 text-sm text-white appearance-none" 
                        style={{ backgroundColor: '#080a18', border: '1px solid #1a1e40' }}>
                        <option value="">Select year</option>
                        <option value="first">1st Year</option>
                        <option value="second">2nd Year</option>
                        <option value="third">3rd Year</option>
                        <option value="fourth">4th Year</option>
                      </select>
                    </div>
                  </div>

                  {/* Student ID */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>Student ID <span style={{ color: '#ff6b6b' }}>*</span></label>
                    <input 
                      type="text" 
                      name="student_id"
                      placeholder="e.g. 23781234" 
                      value={registerData.student_id}
                      onChange={handleRegisterChange}
                      disabled={loading}
                      className="inp w-full rounded-lg sm:rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm text-white" 
                      style={{ backgroundColor: '#080a18', border: '1px solid #1a1e40' }} 
                      required
                    />
                  </div>

                  {/* Email */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>Email Address</label>
                    <input 
                      type="email" 
                      name="email"
                      placeholder="e.g. student@example.com" 
                      value={registerData.email}
                      onChange={handleRegisterChange}
                      disabled={loading}
                      className="inp w-full rounded-lg sm:rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm text-white" 
                      style={{ backgroundColor: '#080a18', border: '1px solid #1a1e40' }} 
                    />
                  </div>

                  {/* Address */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>Address</label>
                    <input 
                      type="text" 
                      name="address"
                      placeholder="Your address" 
                      value={registerData.address}
                      onChange={handleRegisterChange}
                      disabled={loading}
                      className="inp w-full rounded-lg sm:rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm text-white" 
                      style={{ backgroundColor: '#080a18', border: '1px solid #1a1e40' }} 
                    />
                  </div>

                  {/* Password */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>Password</label>
                    <div className="relative">
                      <input 
                        type={showRegPass ? 'text' : 'password'} 
                        name="password"
                        placeholder="Min. 6 characters" 
                        value={registerData.password}
                        onChange={handleRegisterChange}
                        disabled={loading}
                        className="inp w-full rounded-lg sm:rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm text-white pr-14 sm:pr-16" 
                        style={{ backgroundColor: '#080a18', border: '1px solid #1a1e40' }} 
                        required
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowRegPass(s => !s)} 
                        className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-xs font-semibold" 
                        style={{ color: '#4D2FB2', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Poppins, sans-serif' }}>
                        {showRegPass ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>Confirm Password</label>
                    <div className="relative">
                      <input 
                        type={showConfirm ? 'text' : 'password'} 
                        name="confirmPassword"
                        placeholder="Re-enter password" 
                        value={registerData.confirmPassword}
                        onChange={handleRegisterChange}
                        disabled={loading}
                        className="inp w-full rounded-lg sm:rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm text-white pr-14 sm:pr-16" 
                        style={{ backgroundColor: '#080a18', border: '1px solid #1a1e40' }} 
                        required
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowConfirm(s => !s)} 
                        className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-xs font-semibold" 
                        style={{ color: '#4D2FB2', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Poppins, sans-serif' }}>
                        {showConfirm ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </div>

                  {/* Terms */}
                  <div className="flex items-start gap-2">
                    <input 
                      type="checkbox" 
                      id="terms" 
                      name="agreeTerms"
                      checked={registerData.agreeTerms}
                      onChange={handleRegisterChange}
                      disabled={loading}
                      className="w-4 h-4 mt-0.5 cursor-pointer flex-shrink-0" 
                      style={{ accentColor: '#4D2FB2' }} 
                    />
                    <label htmlFor="terms" className="text-xs font-medium cursor-pointer leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      I agree to the{' '}
                      <a href="#" className="font-semibold" style={{ color: '#B153D7', textDecoration: 'none' }}>Terms of Service</a>
                      {' '}and{' '}
                      <a href="#" className="font-semibold" style={{ color: '#B153D7', textDecoration: 'none' }}>Privacy Policy</a>
                    </label>
                  </div>

                  <button
                    type="submit"
                    className="theme-auth-button w-full py-2.5 sm:py-3 rounded-lg sm:rounded-xl text-sm font-bold mt-1 disabled:opacity-60"
                    disabled={loading}
                  >
                    {loading ? 'Creating Account...' : 'Create Account'}
                  </button>
                </form>

                <p className="text-center text-xs sm:text-sm mt-4 sm:mt-5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  Already have an account?{' '}
                  <button onClick={() => setTab('login')} className="font-bold" style={{ color: '#B153D7', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Poppins, sans-serif', fontSize: 12 }}>
                    Sign In
                  </button>
                </p>
              </div>
            )}

            </div> {/* Close inner scrollable div */}
          </div> {/* Close outer BorderBeam container */}
        </BlurFade>
      </div>

      <ToastStack toasts={toasts} onDismiss={removeToast} />
    </div>
  )
}