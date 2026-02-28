"use client"

import React, { useState } from 'react'
import Image from 'next/image'
import { Particles } from '@/components/ui/particles'
import { BorderBeam } from '@/components/ui/border-beam'
import { BlurFade } from '@/components/ui/blur-fade'
import { ShimmerButton } from '@/components/ui/shimmer-button'
import { NumberTicker } from '@/components/ui/number-ticker'
import { RetroGrid } from '@/components/ui/retro-grid'
import uc from './../assets/uclogo.png';
import ccs from './../assets/ccslogo.png';
import { MonitorCheck, BarChart3, BellRing, ShieldCheck } from 'lucide-react'
export default function Landing() {
  const [tab, setTab] = useState('login')
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [showRegPass, setShowRegPass] = useState(false)

  return (
    <div
      className="relative w-screen min-h-screen flex overflow-hidden"
      style={{ fontFamily: "'Poppins', sans-serif", backgroundColor: '#080a18' }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; }

        .inp { font-family: 'Poppins', sans-serif; transition: border-color 0.2s; }
        .inp:focus { outline: none; border-color: #4D2FB2 !important; }
        .inp::placeholder { color: rgba(255,255,255,0.22); }
        .inp option { background-color: '#0f1127'; }

        .tab-btn { transition: all 0.2s; font-family: 'Poppins', sans-serif; }
        .btn-sso { transition: border-color 0.2s; font-family: 'Poppins', sans-serif; }
        .btn-sso:hover { border-color: #4D2FB2 !important; }
        .stat-card { transition: border-color 0.2s; }
        .stat-card:hover { border-color: #4D2FB2 !important; }

        .dot-blink { animation: blink 1.2s ease-in-out infinite; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.15} }

        .scroll-panel::-webkit-scrollbar { width: 4px; }
        .scroll-panel::-webkit-scrollbar-track { background: transparent; }
        .scroll-panel::-webkit-scrollbar-thumb { background: #1a1e40; border-radius: 10px; }

        .divider-v {
          width: 1px;
          background: #1a1e40;
          align-self: stretch;
          margin: 0 12px;
        }
      `}</style>

      {/* Particles */}
      <Particles className="absolute inset-0 z-0" quantity={100} color="#4D2FB2" ease={80} size={0.5} />
      <RetroGrid className="absolute inset-0 z-0 opacity-20" />

      {/* ══════════ LEFT SIDE ══════════ */}
      <div
        className="relative z-10 flex flex-col justify-between w-1/2 min-h-screen px-14 py-10"
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
                { icon: <MonitorCheck size={16} color="#B153D7" />, text: 'Real-time occupancy tracking across all labs' },
                { icon: <BarChart3 size={16} color="#4D2FB2" />, text: 'Smart analytics with peak hour insights' },
                { icon: <BellRing size={16} color="#F375C2" />, text: 'Instant alerts on capacity thresholds' },
                { icon: <ShieldCheck size={16} color="#0E21A0" />, text: 'Role-based secure access for students & faculty' },
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
      <div className="relative z-10 flex items-center justify-center w-1/2  px-12 py-10">
        <BlurFade delay={0.3} inView className="w-full max-w-xl">
          <div
            className="relative max-w-2xl rounded-2xl p-8 overflow-hidden "
            style={{ backgroundColor: '#0f1127', border: '1px solid #1a1e40', maxHeight: '92vh', overflowY: 'hidden' }}
          >
            <BorderBeam size={280} duration={10} colorFrom="#0E21A0" colorTo="#F375C2" />

            {/* Tab switcher */}
            <div
              className="flex rounded-xl p-1 mb-7"
              style={{ backgroundColor: '#080a18', border: '1px solid #1a1e40' }}
            >
              {[['login', 'Sign In'], ['register', 'Register']].map(([t, label]) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className="tab-btn flex-1 py-2 rounded-lg text-sm font-semibold"
                  style={{
                    backgroundColor: tab === t ? '#0E21A0' : 'transparent',
                    color: tab === t ? '#fff' : 'rgba(255,255,255,0.4)',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >{label}</button>
              ))}
            </div>

            {/* ── LOGIN ── */}
            {tab === 'login' && (
              <div className=''>
                <h2 className="text-white text-xl font-black mb-1">Welcome back</h2>
                <p className="text-xs mb-6" style={{ color: 'rgba(255,255,255,0.4)' }}>Sign in to your dashboard</p>

                <form className="flex flex-col gap-4" onSubmit={e => e.preventDefault()}>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>Student ID </label>
                    <input type="" placeholder="Enter your student ID" className="inp w-full rounded-xl px-4 py-3 text-sm text-white" style={{ backgroundColor: '#080a18', border: '1px solid #1a1e40' }} />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>Password</label>
                      <a href="#" className="text-xs font-semibold" style={{ color: '#B153D7', textDecoration: 'none' }}>Forgot Password?</a>
                    </div>
                    <div className="relative">
                      <input type={showPass ? 'text' : 'password'} placeholder="••••••••" className="inp w-full rounded-xl px-4 py-3 text-sm text-white pr-16" style={{ backgroundColor: '#080a18', border: '1px solid #1a1e40' }} />
                      <button type="button" onClick={() => setShowPass(s => !s)} className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold" style={{ color: '#4D2FB2', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Poppins, sans-serif' }}>
                        {showPass ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="remember" className="w-4 h-4 cursor-pointer" style={{ accentColor: '#4D2FB2' }} />
                    <label htmlFor="remember" className="text-xs font-medium cursor-pointer" style={{ color: 'rgba(255,255,255,0.4)' }}>Remember me for 30 days</label>
                  </div>

                  <ShimmerButton className="w-full py-3 rounded-xl text-sm font-bold mt-1" background="#0E21A0" shimmerColor="#4D2FB2" shimmerSize="0.1em">
                    Sign In
                  </ShimmerButton>
                </form>

                <p className="text-center text-xs mt-5" style={{ color: 'rgba(255,255,255,0.35)' }}>
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
                <h2 className="text-white text-xl font-black mb-1">Create account</h2>
                <p className="text-xs mb-6" style={{ color: 'rgba(255,255,255,0.4)' }}>Register to access the system</p>

                <form className="flex flex-col gap-4" onSubmit={e => e.preventDefault()}>

                  {/* First / Middle / Last Name */}
                  <div className="flex gap-2">
                    <div className="flex flex-col gap-1.5 flex-1">
                      <label className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>First Name</label>
                      <input type="text" placeholder="Juan" className="inp w-full rounded-xl px-3 py-3 text-sm text-white" style={{ backgroundColor: '#080a18', border: '1px solid #1a1e40' }} />
                    </div>
                    <div className="flex flex-col gap-1.5 flex-1">
                      <label className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>Middle Name</label>
                      <input type="text" placeholder="Lim" className="inp w-full rounded-xl px-3 py-3 text-sm text-white" style={{ backgroundColor: '#080a18', border: '1px solid #1a1e40' }} />
                    </div>
                    <div className="flex flex-col gap-1.5 flex-1">
                      <label className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>Last Name</label>
                      <input type="text" placeholder="Dela Cruz" className="inp w-full rounded-xl px-3 py-3 text-sm text-white" style={{ backgroundColor: '#080a18', border: '1px solid #1a1e40' }} />
                    </div>
                  </div>

                  {/* Course + Year Level */}
                  <div className="flex gap-2">
                    <div className="flex flex-col gap-1.5 flex-1">
                      <label className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>Course</label>
                      <select className="inp w-full rounded-xl px-3 py-3 text-sm text-white appearance-none" style={{ backgroundColor: '#080a18', border: '1px solid #1a1e40' }}>
                        <option value="">Select course</option>
                        <option value="BSIT">BSIT</option>
                        <option value="BSCS">BSCS</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1.5 flex-1">
                      <label className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>Year Level</label>
                      <select className="inp w-full rounded-xl px-3 py-3 text-sm text-white appearance-none" style={{ backgroundColor: '#080a18', border: '1px solid #1a1e40' }}>
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
                    <label className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>Student ID</label>
                    <input type="text" placeholder="e.g. 23781234" className="inp w-full rounded-xl px-4 py-3 text-sm text-white" style={{ backgroundColor: '#080a18', border: '1px solid #1a1e40' }} />
                  </div>

                  {/* Email */}
                  <div className="flex flex-row gap-1.5">
                    <div>
                      <label className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>Email Address</label>
                      <input type="email" placeholder="you@uc.edu.ph" className="inp w-full rounded-xl px-4 py-3 text-sm text-white" style={{ backgroundColor: '#080a18', border: '1px solid #1a1e40' }} />
                    </div>
                    <div>
                      <label className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>Address</label>
                      <input type="address" placeholder="Your address" className="inp w-full rounded-xl px-4 py-3 text-sm text-white" style={{ backgroundColor: '#080a18', border: '1px solid #1a1e40' }} />
                    </div>
                 
                  </div>
                  

                  {/* Password */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>Password</label>
                    <div className="relative">
                      <input type={showRegPass ? 'text' : 'password'} placeholder="Min. 8 characters" className="inp w-full rounded-xl px-4 py-3 text-sm text-white pr-16" style={{ backgroundColor: '#080a18', border: '1px solid #1a1e40' }} />
                      <button type="button" onClick={() => setShowRegPass(s => !s)} className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold" style={{ color: '#4D2FB2', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Poppins, sans-serif' }}>
                        {showRegPass ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>Confirm Password</label>
                    <div className="relative">
                      <input type={showConfirm ? 'text' : 'password'} placeholder="Re-enter password" className="inp w-full rounded-xl px-4 py-3 text-sm text-white pr-16" style={{ backgroundColor: '#080a18', border: '1px solid #1a1e40' }} />
                      <button type="button" onClick={() => setShowConfirm(s => !s)} className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold" style={{ color: '#4D2FB2', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Poppins, sans-serif' }}>
                        {showConfirm ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </div>

                  {/* Terms */}
                  <div className="flex items-start gap-2">
                    <input type="checkbox" id="terms" className="w-4 h-4 mt-0.5 cursor-pointer flex-shrink-0" style={{ accentColor: '#4D2FB2' }} />
                    <label htmlFor="terms" className="text-xs font-medium cursor-pointer leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      I agree to the{' '}
                      <a href="#" className="font-semibold" style={{ color: '#B153D7', textDecoration: 'none' }}>Terms of Service</a>
                      {' '}and{' '}
                      <a href="#" className="font-semibold" style={{ color: '#B153D7', textDecoration: 'none' }}>Privacy Policy</a>
                    </label>
                  </div>

                  <ShimmerButton className="w-full py-3 rounded-xl text-sm font-bold mt-1" background="#0E21A0" shimmerColor="#4D2FB2" shimmerSize="0.1em">
                    Create Account
                  </ShimmerButton>
                </form>

                <p className="text-center text-xs mt-5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  Already have an account?{' '}
                  <button onClick={() => setTab('login')} className="font-bold" style={{ color: '#B153D7', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Poppins, sans-serif', fontSize: 12 }}>
                    Sign In
                  </button>
                </p>
              </div>
            )}

          </div>
        </BlurFade>
      </div>
    </div>
  )
}